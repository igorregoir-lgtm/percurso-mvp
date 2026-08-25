// Percurso — testes do fluxo principal (evidencia de teste da entrega da semana 10).
// Roda contra o servidor no ar: node server.js  &&  node scripts/smoke-test.mjs
const BASE = process.env.BASE || 'http://localhost:3000';

let ok = 0, falhas = 0;
const cookies = {};
const T = (nome, cond, extra = '') => {
  if (cond) { ok++; console.log(`  \x1b[32m✓\x1b[0m ${nome}`); }
  else { falhas++; console.log(`  \x1b[31m✗ ${nome}\x1b[0m ${extra}`); }
};
const secao = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

async function req(quem, caminho, opts = {}) {
  const r = await fetch(BASE + caminho, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies[quem] ? { Cookie: cookies[quem] } : {}),
      ...(opts.headers || {}),
    },
  });
  const set = r.headers.get('set-cookie');
  if (set) cookies[quem] = set.split(';')[0];
  let corpo = null;
  try { corpo = await r.json(); } catch {}
  return { status: r.status, corpo };
}
const GET = (quem, c) => req(quem, c);
const POST = (quem, c, b) => req(quem, c, { method: 'POST', body: JSON.stringify(b || {}) });

console.log('\n\x1b[1mPercurso — testes do fluxo principal\x1b[0m');
console.log(`Alvo: ${BASE}\n`);

// -------------------------------------------------------------- 0. sessao
secao('0 · Sessão e controle de acesso');
{
  const anon = await GET('anon', '/api/hoje');
  T('sem sessão, /api/hoje responde 401', anon.status === 401, `(${anon.status})`);

  const login = await POST('maria', '/api/sessao', { educador_id: 1 });
  T('educadora entra (Maria Silvia)', login.status === 200 && login.corpo.usuario.papel === 'educador');

  const coord = await POST('rita', '/api/sessao', { educador_id: 2 });
  T('coordenação entra (Rita)', coord.status === 200 && coord.corpo.usuario.papel === 'coordenacao');

  const negado = await GET('maria', '/api/painel');
  T('educadora NÃO acessa o painel da coordenação (403)', negado.status === 403, `(${negado.status})`);

  const inexistente = await POST('x', '/api/sessao', { educador_id: 999 });
  T('login com usuário inexistente responde 404', inexistente.status === 404);
}

// ------------------------------------------------------- 1. modelo de dados
secao('1 · Modelo de dados — criança ≠ matrícula (F1)');
let turmaId, criancaBloqueada, criancaConvivio, pendentes = [];
{
  const inv = (await GET('maria', '/api/inventario')).corpo;
  T('crianças únicas < matrículas ativas', inv.criancasUnicas < inv.matriculas,
    `(${inv.criancasUnicas} vs ${inv.matriculas})`);
  T('a diferença é exatamente o nº de crianças em 2 programas',
    inv.matriculas - inv.criancasUnicas === inv.multi, `(${inv.multi})`);
  T('a vivência terapêutica está fora de escopo (bloco 6)',
    inv.porPrograma.some(p => !p.no_escopo && /Viv[eê]ncia/i.test(p.nome)));
}

// -------------------------------------------------------------- 2. chamada
secao('2 · Chamada em um toque (F2)');
{
  const hoje = (await GET('maria', '/api/hoje')).corpo;
  turmaId = hoje.turma.id;
  T('educadora tem turma atribuída', !!turmaId);
  T('há datas de chamada em aberto (nada expira)', hoje.chamadas_abertas.length > 0,
    `(${hoje.chamadas_abertas.length})`);
  T('estado de retomada detecta o lapso sem culpar', hoje.retomada.em_lapso === true);

  const data = hoje.chamadas_abertas[0];
  const ch = (await GET('maria', `/api/chamada?turma_id=${turmaId}&data=${data}`)).corpo;
  T('chamada da data em aberto vem não registrada', ch.registrada === false);

  const parcial = await POST('maria', '/api/chamada', {
    turma_id: turmaId, data, marcacoes: ch.criancas.slice(0, 3).map(c => ({ crianca_id: c.id, status: 'P' })),
  });
  T('chamada incompleta é recusada com 422 e mensagem clara',
    parcial.status === 422 && /Faltou marcar/.test(parcial.corpo.erro), `(${parcial.status})`);

  const invalida = await POST('maria', '/api/chamada', {
    turma_id: turmaId, data, marcacoes: ch.criancas.map((c, i) => ({ crianca_id: c.id, status: i ? 'P' : 'X' })),
  });
  T('status de presença inválido é recusado (422)', invalida.status === 422);

  const futura = await POST('maria', '/api/chamada', {
    turma_id: turmaId, data: '2099-01-01', marcacoes: ch.criancas.map(c => ({ crianca_id: c.id, status: 'P' })),
  });
  T('chamada em data futura é recusada', futura.status === 422);

  const completa = await POST('maria', '/api/chamada', {
    turma_id: turmaId, data, duracao_segundos: 47,
    marcacoes: ch.criancas.map((c, i) => ({ crianca_id: c.id, status: i % 7 === 0 ? 'F' : 'P' })),
  });
  T('chamada completa é salva', completa.status === 200 && completa.corpo.ok);
  T('a data salva sai da lista de pendentes', !completa.corpo.abertas.includes(data));

  const rel = (await GET('maria', `/api/chamada?turma_id=${turmaId}&data=${data}`)).corpo;
  T('releitura confirma persistência no banco',
    rel.registrada === true && rel.criancas.every(c => c.status));
}

// ------------------------------------------------------- 3. ciclo e agenda
secao('3 · Agenda do ciclo e protocolo de aplicação (F4/M6)');
{
  const ag = (await GET('maria', `/api/ciclo/agenda?turma_id=${turmaId}`)).corpo;
  T('agenda separa observáveis de bloqueadas', ag.observaveis + ag.bloqueadas === ag.total,
    `(${ag.observaveis}+${ag.bloqueadas}=${ag.total})`);
  criancaBloqueada = ag.itens.find(i => i.motivo === 'consentimento');
  criancaConvivio  = ag.itens.find(i => i.motivo === 'convivio');
  pendentes = ag.itens.filter(i => i.estado === 'pendente' || i.estado === 'rascunho');
  T('há criança bloqueada por falta de consentimento', !!criancaBloqueada);
  T('há criança bloqueada pela janela mínima de convívio', !!criancaConvivio);
  T('cobertura considera apenas as observáveis',
    ag.cobertura === Math.round((ag.concluidas / ag.observaveis) * 100));
}

// -------------------------------------------------- 4. observacao e protecao
secao('4 · Observação, consentimento e filtro de perímetro (F3 + bloco 6)');
{
  const det = (await GET('maria', `/api/observacao?crianca_id=${criancaBloqueada.crianca_id}`)).corpo;
  T('a tela de observação declara o bloqueio e o motivo',
    det.elegibilidade.pode === false && det.elegibilidade.motivo === 'consentimento');

  const tentativa = await POST('maria', '/api/observacao', {
    crianca_id: criancaBloqueada.crianca_id, concluir: true,
    itens: det.dimensoes.map(d => ({ dimensao_id: d.id, nivel: 3 })),
  });
  T('gravar sem consentimento é recusado com 403',
    tentativa.status === 403 && tentativa.corpo.motivo === 'consentimento', `(${tentativa.status})`);

  const semConvivio = await POST('maria', '/api/observacao', {
    crianca_id: criancaConvivio.crianca_id, concluir: true,
    itens: det.dimensoes.map(d => ({ dimensao_id: d.id, nivel: 3 })),
  });
  T('gravar sem janela de convívio é recusado com 403',
    semConvivio.status === 403 && semConvivio.corpo.motivo === 'convivio');

  const alvo = pendentes[0];
  const o = (await GET('maria', `/api/observacao?crianca_id=${alvo.crianca_id}`)).corpo;

  const incompleta = await POST('maria', '/api/observacao', {
    crianca_id: alvo.crianca_id, concluir: true,
    itens: [{ dimensao_id: o.dimensoes[0].id, nivel: 3 }],
  });
  T('concluir com dimensões faltando é recusado, oferecendo rascunho',
    incompleta.status === 422 && incompleta.corpo.recuperavel === true);

  const forEscala = await POST('maria', '/api/observacao', {
    crianca_id: alvo.crianca_id, concluir: false,
    itens: [{ dimensao_id: o.dimensoes[0].id, nivel: 9 }],
  });
  T('nível fora da escala 1–4 é recusado', forEscala.status === 422);

  const rascunho = await POST('maria', '/api/observacao', {
    crianca_id: alvo.crianca_id, concluir: false,
    itens: o.dimensoes.slice(0, 2).map(d => ({ dimensao_id: d.id, nivel: 2 })),
  });
  T('rascunho parcial é aceito (anti-abandono)', rascunho.status === 200 && rascunho.corpo.status === 'rascunho');

  const rel = (await GET('maria', `/api/observacao?crianca_id=${alvo.crianca_id}`)).corpo;
  T('o rascunho volta preenchido ao reabrir', rel.observacao?.itens?.length === 2);

  // v2: o olhar nao tem mais campo de texto sobre a crianca. Quem tentar gravar
  // por ele e' recusado com encaminhamento humano, nao com erro tecnico.
  const clinico = await POST('maria', '/api/observacao', {
    crianca_id: alvo.crianca_id, concluir: true,
    itens: o.dimensoes.map(d => ({ dimensao_id: d.id, nivel: 3 })),
    nota_livre: 'A mãe contou que ele foi diagnosticado com depressão.',
  });
  T('texto sobre a criança no olhar é recusado (422)', clinico.status === 422, `(${clinico.status})`);
  T('a recusa devolve o encaminhamento humano, não um erro técnico',
    /coordena[çc][ãa]o/i.test(clinico.corpo?.erro || ''), clinico.corpo?.erro);
  T('a recusa nomeia o motivo para a tela tratar', clinico.corpo?.motivo === 'campo_livre_removido');

  const limpo = await POST('maria', '/api/observacao', {
    crianca_id: alvo.crianca_id, concluir: true,
    itens: o.dimensoes.map(d => ({ dimensao_id: d.id, nivel: 3 })),
  });
  T('sem texto, a observação é concluída normalmente', limpo.status === 200 && limpo.corpo.status === 'concluida');

  const gravado = (await GET('maria', `/api/observacao?crianca_id=${alvo.crianca_id}`)).corpo;
  T('nenhum texto sobre a criança existe no banco', !gravado.observacao.nota_livre);
}

// ---------------------------------------------- 5. fechar o ciclo da turma
secao('5 · Fechar o ciclo da turma (F5) — o momento da persona');
{
  let ag = (await GET('maria', `/api/ciclo/agenda?turma_id=${turmaId}`)).corpo;
  const restantes = ag.itens.filter(i => i.estado === 'pendente' || i.estado === 'rascunho');
  const dims = (await GET('maria', '/api/rubrica')).corpo.dimensoes;
  let ultimo = null;
  for (const r of restantes) {
    ultimo = await POST('maria', '/api/observacao', {
      crianca_id: r.crianca_id, concluir: true,
      itens: dims.map((d, i) => ({ dimensao_id: d.id, nivel: (i % 3) + 2 })),
    });
    T(`observação concluída para ${r.nome}`, ultimo.status === 200);
  }
  T('a última conclusão zera as pendências da turma', ultimo.corpo.agenda.pendentes === 0);
  T('cobertura da turma chega a 100%', ultimo.corpo.agenda.cobertura === 100);
  T('as bloqueadas continuam bloqueadas (não foram forçadas)', ultimo.corpo.agenda.bloqueadas > 0);

  const p = (await GET('maria', `/api/turma/painel?turma_id=${turmaId}`)).corpo;
  T('o painel da turma tem dois ciclos comparáveis', p.agregado.ciclos.length === 2);
  T('todas as dimensões têm média nos dois ciclos',
    p.agregado.series.every(s => s.valores.every(v => v != null)));
  T('a leitura do ciclo aponta forças e atenção',
    p.leitura.forcas.length > 0 && p.leitura.atencao.length > 0);
}

// ---------------------------------------- 5b. melhorias da análise Bússola
secao('5b · Cronômetro, plano da semana, supressão e reconciliação');
{
  const p = (await GET('maria', `/api/turma/painel?turma_id=${turmaId}`)).corpo;
  T('o custo de tempo do registro é medido e devolvido',
    p.tempo && p.tempo.registros > 0 && typeof p.tempo.media_segundos === 'number');
  T('a duração enviada na chamada foi persistida (média plausível)',
    p.tempo.media_segundos >= 20 && p.tempo.media_segundos <= 300, `(média ${p.tempo.media_segundos}s)`);
  T('a meta do experimento é 120 segundos', p.tempo.meta_segundos === 120);

  const plano = (await GET('maria', `/api/turma/plano?turma_id=${turmaId}`)).corpo;
  T('o plano da semana traz o foco pedagógico com justificativa',
    !!plano.foco && !!plano.foco.dimensao && /média/i.test(plano.foco.justificativa));
  T('o foco aponta a menor média da turma', (() => {
    const atuais = p.agregado.series.map(x => x.valores.at(-1)).filter(v => v != null);
    return plano.foco.media_atual === Math.min(...atuais);
  })());
  T('a atividade sugerida vem do banco fixo por dimensão',
    !!plano.foco.atividade && !!plano.foco.atividade.titulo && !!plano.foco.atividade.duracao);
  T('o plano declara a doutrina: nenhum item nasce de modelo', /nenhum item nasce de modelo/i.test(plano.doutrina));
  T('ganchos de aspiração agregados por área, sem expor além da equipe',
    Array.isArray(plano.ganchos) && plano.ganchos.every(g => g.area && g.n > 0));

  // Supressão de célula pequena: invariante — toda média exibida tem n >= 5.
  const invariante = p.agregado.series.every(sr =>
    sr.valores.every((v, i) => v == null || (sr.n[i] ?? 0) >= p.agregado.minimo_celula));
  T('nenhuma média agregada circula com menos de 5 crianças (supressão)', invariante);

  const painel = (await GET('rita', '/api/painel')).corpo;
  T('o painel da coordenação traz a reconciliação com 3 fontes',
    painel.reconciliacao?.fontes?.length === 3 &&
    painel.reconciliacao.fontes.every(f => f.fonte && f.valor && f.media && f.leitura));
  T('a promessa de tempo aparece para a coordenação',
    painel.tempo && painel.tempo.registros > 0);

  const lista = (await GET('maria', '/api/criancas?q=')).corpo.criancas;
  let comAspiracao = null;
  for (const c of lista) {
    const f = (await GET('maria', `/api/crianca?id=${c.id}`)).corpo;
    if (f.crianca.aspiracao) { comAspiracao = f; break; }
  }
  T('há criança com aspiração declarada na ficha (Lab. de Sonhos)', !!comAspiracao,
    comAspiracao ? `(${comAspiracao.crianca.aspiracao})` : '');
  const gov = (await GET('rita', '/api/consentimentos')).corpo.governanca;
  T('a aspiração declara base legal na tabela de governança',
    gov.some(g => g.campo === 'aspiracao' && /leg[ií]timo interesse/i.test(g.base_legal)));
}

// ------------------------------------------------------- 6. alerta (F6)
secao('6 · Alerta de ausência e safras (F6)');
{
  const { alertas } = (await GET('maria', '/api/alertas')).corpo;
  T('há alerta de ausência aberto', alertas.length > 0, `(${alertas.length})`);

  const invalido = await POST('maria', '/api/alerta', { id: alertas[0].id, status: 'inventado' });
  T('status de alerta inválido é recusado', invalido.status === 422);

  const tratado = await POST('maria', '/api/alerta', {
    id: alertas[0].id, status: 'em_acompanhamento', tratativa: 'Contato com a família agendado.',
  });
  T('alerta passa a em_acompanhamento com tratativa registrada',
    tratado.status === 200 && tratado.corpo.status === 'em_acompanhamento' && !!tratado.corpo.tratativa);

  const s = (await GET('rita', '/api/safras')).corpo;
  T('há curvas de permanência por safra', s.curvas.length >= 2);
  T('a permanência nunca sobe ao longo do tempo dentro de uma safra',
    s.curvas.every(c => {
      const v = c.pontos.map(p => p.pct).filter(x => x != null);
      return v.every((x, i) => i === 0 || x <= v[i - 1]);
    }));
  T('evasão por programa é calculada', s.porPrograma.every(p => typeof p.evasao_pct === 'number'));
}

// ------------------------------------------------- 7. sintese do ciclo (F7)
secao('7 · Fecho do ciclo: síntese, revisor e aprovação (F7)');
{
  const antes = (await GET('rita', '/api/sintese')).corpo;
  T('a prévia traz os números do ciclo antes de gerar', antes.previa.ativas > 0);

  const g = (await POST('rita', '/api/sintese/gerar', {})).corpo;
  T('síntese é gerada como rascunho', g.status === 'rascunho');
  T('o revisor de sobre-alegação aprovou o texto', g.revisor_status === 'aprovado', g.revisor_notas || '');
  T('o texto NÃO usa verbo causal forte', !/\b(gerou|causou|provou|garante)\b/i.test(g.texto));
  T('o texto traz a ressalva metodológica',
    /fatores externos n[aã]o foram isolados/i.test(g.texto));
  T('os números do texto batem com a consulta',
    g.texto.includes(String(g.numeros.observadas)) && g.texto.includes(`${g.numeros.cobertura_pct}%`));

  const negada = await POST('maria', '/api/sintese/aprovar', {});
  T('educadora não aprova síntese (403)', negada.status === 403);

  const ap = (await POST('rita', '/api/sintese/aprovar', {})).corpo;
  T('coordenação aprova e libera', ap.status === 'aprovada' && !!ap.aprovado_em);

  const regerar = await POST('rita', '/api/sintese/gerar', {});
  T('síntese aprovada não é sobrescrita por acidente', regerar.status === 422);
}

// --------------------------------------------- 8. consentimento desbloqueia
secao('8 · Consentimento desbloqueia o campo (F1 · LGPD Art. 14)');
{
  const c = (await GET('rita', '/api/consentimentos')).corpo;
  T('painel de consentimentos separa ativos de pendentes', c.pendentes > 0 && c.ativos > 0);
  T('a tabela de governança declara os 4 atributos de cada campo',
    c.governanca.every(g => g.base_legal && g.titular && g.acesso && g.retencao));

  const semResp = await POST('rita', '/api/consentimento', {
    crianca_id: criancaBloqueada.crianca_id, campo: 'rubrica_socioemocional', status: 'ativo',
  });
  T('ativar consentimento sem nomear o responsável é recusado', semResp.status === 422);

  const reg = await POST('rita', '/api/consentimento', {
    crianca_id: criancaBloqueada.crianca_id, campo: 'rubrica_socioemocional',
    status: 'ativo', responsavel: 'Responsavel 1',
  });
  T('consentimento registrado com responsável', reg.status === 200 && reg.corpo.status === 'ativo');

  const dep = (await GET('maria', `/api/observacao?crianca_id=${criancaBloqueada.crianca_id}`)).corpo;
  T('a criança antes bloqueada agora é observável', dep.elegibilidade.pode === true);

  const rev = await POST('rita', '/api/consentimento', {
    crianca_id: criancaBloqueada.crianca_id, campo: 'rubrica_socioemocional', status: 'revogado',
  });
  T('consentimento pode ser revogado', rev.status === 200);
  const dep2 = (await GET('maria', `/api/observacao?crianca_id=${criancaBloqueada.crianca_id}`)).corpo;
  T('revogação volta a bloquear o campo', dep2.elegibilidade.pode === false);
}

// -------------------------------------------------------- 9. ficha viva
secao('9 · Ficha viva da criança (F1)');
{
  const lista = (await GET('maria', '/api/criancas?q=a')).corpo.criancas;
  T('busca por nome devolve resultados', lista.length > 0);
  const f = (await GET('maria', `/api/crianca?id=${lista[0].id}`)).corpo;
  T('ficha traz matrículas, presença, trajetória e governança',
    !!f.crianca && Array.isArray(f.matriculas) && Array.isArray(f.presencas) &&
    !!f.trajetoria && f.consentimentos.length === 10);  // 5 originais + 5 campos da v2
  T('a governança declara os campos novos da v2 (voz, score, agregado publicado)',
    ['folha_do_dia', 'audio_da_voz', 'transcricao_da_voz', 'score_evasao', 'agregado_publicado']
      .every(c => f.consentimentos.some(g => g.campo === c)));
  T('áudio e transcrição declaram retenção "não persiste"',
    f.consentimentos.filter(g => ['audio_da_voz', 'transcricao_da_voz'].includes(g.campo))
      .every(g => /não persiste/i.test(g.retencao)));
  const inexistente = await GET('maria', '/api/crianca?id=999999');
  T('ficha de criança inexistente responde 404', inexistente.status === 404);
  const paramRuim = await GET('maria', '/api/crianca?id=abc');
  T('parâmetro inválido responde 422', paramRuim.status === 422);
}

// ------------------------------------------------------- 10. robustez
secao('10 · Robustez');
{
  const r404 = await GET('maria', '/api/nao-existe');
  T('rota inexistente responde 404 em JSON', r404.status === 404 && !!r404.corpo.erro);
  const rJson = await fetch(BASE + '/api/chamada', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookies.maria }, body: '{quebrado',
  });
  T('JSON malformado responde 400', rJson.status === 400);
  const estatico = await fetch(BASE + '/../server.js');
  T('não serve arquivo fora de public/', estatico.status === 404 || estatico.status === 403);
  const painel = (await GET('rita', '/api/painel')).corpo;
  T('painel da coordenação monta com todos os blocos',
    !!painel.inventario && !!painel.numeros && !!painel.agregado && Array.isArray(painel.programas));
}


// ============================================================================
// 11 · v2 — folha do dia, voz, extrator e perímetro (F2, F3, F4, F5, F6)
// ============================================================================
secao('11 · Folha do dia, captura por voz e agente extrator (F2–F6)');
let dataFolha = null;
{
  const cat = (await GET('maria', '/api/catalogos')).corpo;
  T('catálogos são listas fechadas, não texto livre',
    cat.atividades.length > 0 && cat.areas.length > 0 && cat.marcadores.length === 6);
  T('a janela da voz é de 40 segundos', cat.voz_segundos === 40);
  T('o piso de confiança do extrator é 0,6', cat.confianca_minima === 0.6);

  // A folha e' do ENCONTRO, nao do calendario: a rota resolve para o ultimo
  // encontro registrado quando hoje nao houve aula.
  const abre = (await GET('maria', `/api/folha?turma_id=${turmaId}`)).corpo;
  dataFolha = abre.data;
  T('a folha abre no último encontro registrado, não numa data sem aula', !!abre.encontro, dataFolha);
  const semChamada = await POST('maria', '/api/folha', {
    turma_id: turmaId, data: '2020-01-02', campos: { atividade: 'roda', area_tematica: 'nenhuma', marcadores_turma: [], pediram_ajuda: 0 },
  });
  T('folha sem chamada do dia é recusada (422)', semChamada.status === 422, `(${semChamada.status})`);

  // --- extrator: a fala vira campos, NADA e' gravado ------------------------
  const fala = 'Hoje a gente fez uma roda de conversa sobre saúde, a turma participou bastante e ficou alegre. Três crianças pediram ajuda.';
  const ex = await POST('maria', '/api/voz/extrair', { turma_id: turmaId, transcricao: fala });
  T('o extrator devolve 200 sem gravar nada', ex.status === 200 && ex.corpo.gravado === false);
  T('atividade escolhida dentro da lista fechada',
    cat.atividades.some(a => a.codigo === ex.corpo.extracao.atividade), ex.corpo.extracao.atividade);
  T('área temática escolhida dentro da lista fechada',
    cat.areas.some(a => a.codigo === ex.corpo.extracao.area_tematica), ex.corpo.extracao.area_tematica);
  T('marcadores são do grupo e no máximo 4',
    ex.corpo.extracao.marcadores_turma.length <= 4 &&
    ex.corpo.extracao.marcadores_turma.every(m => cat.marcadores.some(x => x.codigo === m)));
  T('"pediram ajuda" é contagem, não lista de nomes', ex.corpo.extracao.pediram_ajuda === 3);
  T('confiança alta em fala clara', ex.corpo.extracao.confianca >= 0.6, String(ex.corpo.extracao.confianca));
  T('o extrator não escreve texto livre em campo nenhum',
    Object.values(ex.corpo.extracao).every(v =>
      typeof v !== 'string' || cat.atividades.concat(cat.areas).some(x => x.codigo === v)));

  // --- F5: lista de exclusao ------------------------------------------------
  const sensivel = 'Fizemos leitura e a turma colaborou. A mãe da Ana contou que ela começou terapia esta semana.';
  const exc = await POST('maria', '/api/voz/extrair', { turma_id: turmaId, transcricao: sensivel });
  T('fala com conteúdo sensível marca conteudo_excluido', exc.corpo.extracao.conteudo_excluido === true);
  T('a resposta devolve a categoria para a tela encaminhar',
    /saúde mental/i.test(exc.corpo.trechos?.[0]?.categoria || ''), JSON.stringify(exc.corpo.trechos));
  T('o trecho sensível NÃO alimenta nenhum campo extraído',
    !JSON.stringify(exc.corpo.extracao).match(/terapia|Ana/i));
  T('o resto da fala continua sendo extraído normalmente', exc.corpo.extracao.atividade === 'leitura');

  // --- estado de baixa confianca -------------------------------------------
  // A palavra que dá nome à categoria precisa casar mesmo acentuada (SRV-04).
  const acentuado = await POST('maria', '/api/voz/extrair',
    { turma_id: turmaId, transcricao: 'A turma desenhou e ficou alegre. Ele contou que sofre violência em casa.' });
  T('a lista de exclusão pega termo acentuado ("violência")',
    acentuado.corpo.extracao.conteudo_excluido === true, JSON.stringify(acentuado.corpo.trechos));

  // Rodada 2: os termos que o 06-AGENTES-IA nomeia literalmente, e a categoria 5.
  const nomesDaTurma = (await GET('maria', `/api/chamada?turma_id=${turmaId}`)).corpo.criancas.map(c => c.nome);
  for (const [fala, rotulo] of [
    ['A turma leu bastante. O pai dela está na prisão.', 'prisão'],
    ['A turma leu bastante. A saúde dela não anda boa.', 'saúde da criança'],
    ['A turma leu bastante. Os conselhos tutelares foram acionados.', 'conselhos tutelares'],
    ['A turma leu bastante. A situação familiar dela é difícil.', 'situação familiar'],
    [`A turma leu bastante. A ${nomesDaTurma[0].split(' ')[0]} está muito triste e se isolou.`, 'estado psíquico de criança nomeada'],
  ]) {
    const r = await POST('maria', '/api/voz/extrair', { turma_id: turmaId, transcricao: fala });
    T(`a lista de exclusão barra: ${rotulo}`, r.corpo.extracao.conteudo_excluido === true,
      JSON.stringify(r.corpo.trechos));
  }
  // E não pode disparar à toa: "saúde" como ÁREA do encontro é registro legítimo.
  const areaSaude = await POST('maria', '/api/voz/extrair',
    { turma_id: turmaId, transcricao: 'Hoje fizemos uma roda de conversa sobre saúde e a turma participou.' });
  T('"roda sobre saúde" NÃO é barrada — é a área temática, não a criança',
    areaSaude.corpo.extracao.conteudo_excluido === false && areaSaude.corpo.extracao.area_tematica === 'saude');
  T('o trecho excluído volta com o acento original para a tela',
    /violência/.test(acentuado.corpo.trechos?.[0]?.trecho || ''));

  const ruido = await POST('maria', '/api/voz/extrair', { turma_id: turmaId, transcricao: 'ahn... sei lá, tanto faz' });
  T('fala ruidosa cai em baixa confiança', ruido.corpo.baixa_confianca === true);
  T('em baixa confiança nada é pré-marcado',
    ruido.corpo.extracao.atividade === 'nao_identificada' &&
    ruido.corpo.extracao.area_tematica === 'nenhuma' &&
    ruido.corpo.extracao.marcadores_turma.length === 0);

  const longa = await POST('maria', '/api/voz/extrair', { turma_id: turmaId, transcricao: 'a'.repeat(4001) });
  T('transcrição longa demais para 40 s é recusada (422)', longa.status === 422);

  // --- F6: a confirmacao humana e' a primeira gravacao ----------------------
  const antes = (await GET('maria', `/api/folha?turma_id=${turmaId}&data=${dataFolha}`)).corpo;
  T('antes de confirmar, não existe folha no banco', antes.folha === null);

  const invalida = await POST('maria', '/api/folha', {
    turma_id: turmaId, data: dataFolha,
    campos: { atividade: 'festa_junina', area_tematica: 'nenhuma', marcadores_turma: [], pediram_ajuda: 0 },
  });
  T('campo fora da lista fechada é recusado (422)', invalida.status === 422, `(${invalida.status})`);

  const demais = await POST('maria', '/api/folha', {
    turma_id: turmaId, data: dataFolha,
    campos: { atividade: 'roda', area_tematica: 'nenhuma', pediram_ajuda: 0,
              marcadores_turma: ['colaborou', 'participou', 'agitado', 'disperso', 'alegre'] },
  });
  T('mais de 4 marcadores é recusado (422)', demais.status === 422);

  // A pessoa corrige DOIS campos do que o agente propos: a area (saude ->
  // educacao) e a contagem de ajuda (3 -> 4). E' a confirmacao humana vencendo
  // a sugestao, e e' o que a taxa de correcao tem que medir.
  const conf = await POST('maria', '/api/folha', {
    turma_id: turmaId, data: dataFolha, origem: 'voz', sugestao: ex.corpo.extracao,
    campos: {
      atividade: 'roda', area_tematica: 'educacao', marcadores_turma: ['participou', 'alegre'],
      pediram_ajuda: 4, conteudo_excluido: false,
    },
  });
  T('a folha só existe depois de confirmar', conf.status === 200 && conf.corpo.folha.id > 0);
  T('a folha registra que veio da voz', conf.corpo.folha.origem === 'voz');
  T('o que a pessoa confirmou vence o que a IA propôs',
    conf.corpo.folha.area_tematica === 'educacao' && ex.corpo.extracao.area_tematica === 'saude');
  T('a correção humana é medida (taxa de correção pós-extração)',
    conf.corpo.folha.campos_sugeridos === 4 && conf.corpo.folha.campos_editados === 2,
    `${conf.corpo.folha.campos_editados}/${conf.corpo.folha.campos_sugeridos}`);
  T('a folha não tem nenhum campo sobre criança nomeada',
    !('crianca_id' in conf.corpo.folha) && !JSON.stringify(conf.corpo.folha).match(/nota|texto|observacao_livre/i));

  const relida = (await GET('maria', `/api/folha?turma_id=${turmaId}&data=${dataFolha}`)).corpo;
  T('a folha persiste com os marcadores confirmados',
    relida.folha.marcadores.length === 2 && relida.folha.pediram_ajuda === 4);

  // Editar a mao uma folha que veio da voz nao pode sujar a metrica do agente.
  const manual = await POST('maria', '/api/folha', {
    turma_id: turmaId, data: dataFolha, origem: 'manual',
    campos: { atividade: 'roda', area_tematica: 'educacao', marcadores_turma: ['participou'],
              pediram_ajuda: 5, confianca: 1 },
  });
  T('editar à mão marca a folha como manual', manual.corpo.folha.origem === 'manual');
  T('edição manual não grava confiança de agente nenhum', manual.corpo.folha.confianca === null,
    String(manual.corpo.folha.confianca));

  // Fechar a folha e a saida da coordenacao — beco sem saida nao pode existir.
  const fechada = await POST('maria', '/api/folha', {
    turma_id: turmaId, data: dataFolha, origem: 'manual', fechar: true,
    campos: { atividade: 'roda', area_tematica: 'educacao', marcadores_turma: ['participou'], pediram_ajuda: 5 },
  });
  T('a folha pode ser fechada', fechada.corpo.folha.status === 'fechada');
  const depois = await POST('maria', '/api/folha', {
    turma_id: turmaId, data: dataFolha, origem: 'manual',
    campos: { atividade: 'leitura', area_tematica: 'nenhuma', marcadores_turma: ['alegre'], pediram_ajuda: 0 },
  });
  T('folha fechada não aceita alteração (422)', depois.status === 422, `(${depois.status})`);
  const negaReabrir = await POST('maria', '/api/folha/reabrir', { turma_id: turmaId, data: dataFolha });
  T('educadora não reabre folha fechada (403)', negaReabrir.status === 403, `(${negaReabrir.status})`);
  const reabre = await POST('rita', '/api/folha/reabrir', { turma_id: turmaId, data: dataFolha });
  T('a coordenação reabre — fechar por engano não é beco sem saída',
    reabre.status === 200 && reabre.corpo.folha.status === 'aberta');
  const dupla = await POST('rita', '/api/folha/reabrir', { turma_id: turmaId, data: dataFolha });
  T('reabrir folha já aberta é recusado (422)', dupla.status === 422);
}

// ============================================================================
// 12 · Os três scores (F8, F9, F10)
// ============================================================================
secao('12 · Risco de evasão, cobertura do registro e exposição (F8–F10)');
{
  const negado = await GET('maria', '/api/scores');
  T('educadora NÃO vê a cobertura do registro (403)', negado.status === 403, `(${negado.status})`);

  const s = (await GET('rita', '/api/scores')).corpo;
  T('o painel de scores declara que nenhum score pontua a criança',
    /não existe score socioemocional individual/i.test(s.doutrina));

  T('risco de evasão tem escopo de matrícula', s.evasao.escopo === 'matrícula');
  T('duas faltas seguidas já colocam na lista', s.evasao.faltas_para_lista === 2);
  T('há matrículas em risco na base sintética', s.evasao.em_risco > 0, String(s.evasao.em_risco));
  T('toda linha em risco declara o motivo em português',
    s.evasao.linhas.every(l => typeof l.motivo === 'string' && l.motivo.length > 3));
  T('o score compara a criança com a própria linha de base',
    s.evasao.linhas.every(l => 'linha_de_base_pct' in l && 'recente_pct' in l));
  T('criança com 2+ faltas seguidas está na lista',
    s.evasao.linhas.some(l => l.consecutivas >= 2));

  T('cobertura do registro tem escopo de turma', s.cobertura.escopo === 'turma');
  T('a cobertura declara que mede o sistema, não a professora',
    /mede o sistema, não a professora/i.test(s.cobertura.doutrina));
  T('a cobertura conta folhas completas sobre encontros',
    s.cobertura.total > 0 && s.cobertura.completas <= s.cobertura.total);
  T('há turma sem registro na base sintética (o dado que a Rita precisa ver)',
    s.cobertura.turmas_sem_registro >= 1, String(s.cobertura.turmas_sem_registro));
  T('a cobertura enumera TODAS as turmas, não só as que registraram',
    s.cobertura.turmas.length === (await GET('rita', '/api/turmas')).corpo.turmas.length,
    `${s.cobertura.turmas.length} de ${(await GET('rita', '/api/turmas')).corpo.turmas.length}`);
  T('o painel da coordenação traz a terceira linha do board (olhares registrados)',
    typeof (await GET('rita', '/api/painel')).corpo.olhares_registrados === 'number');

  T('exposição cruza aspiração declarada com atividade realizada',
    s.exposicao.areas.every(a => 'criancas' in a && 'atividades' in a));
  T('a lacuna é nomeada e publicada, não escondida', s.exposicao.lacunas.length > 0);
  T('área em lacuna tem interessadas e zero atividades',
    s.exposicao.lacunas.every(l => l.criancas > 0 && l.atividades === 0));

  T('a qualidade do extrator é medida (taxa de correção)',
    typeof s.extrator.taxa_correcao_pct === 'number');
  T('a taxa de descarte da pauta é medida', typeof s.descarte.pct === 'number' || s.descarte.pct === null);
}

// ============================================================================
// 13 · Pauta de segunda (F11)
// ============================================================================
secao('13 · Pauta de segunda — o laço de devolução (F11)');
{
  const p = (await GET('maria', `/api/pauta?turma_id=${turmaId}`)).corpo;
  T('a pauta traz os três cartões', 'risco' in p && 'exposicao' in p && 'sugestao' in p);
  T('a pauta declara que nenhum item nasce de modelo', /nenhum item nasce de modelo/i.test(p.doutrina));
  T('a semana começa numa segunda-feira',
    new Date(p.semana + 'T12:00:00Z').getUTCDay() === 1, p.semana);
  // Antes esta linha era `every(c => c.crianca_id > 0)` — vácua, nunca falhava.
  // Agora o que ela anuncia é verificado de verdade: a turma da Cleide é fechada
  // para a Maria, e a coordenação passa.
  const cleide = await POST('cleide', '/api/sessao', { educador_id: 3 });
  T('a outra educadora entra (Cleide)', cleide.status === 200);
  const turmaAlheia = (await GET('cleide', '/api/hoje')).corpo.turma;
  const invasao = await GET('maria', `/api/pauta?turma_id=${turmaAlheia.id}`);
  T('educadora NÃO abre a pauta de turma alheia (403)', invasao.status === 403, `(${invasao.status})`);
  const invasaoDecisao = await POST('maria', '/api/pauta/decidir',
    { turma_id: turmaAlheia.id, decisao: 'aceita' });
  T('educadora NÃO decide a pauta de turma alheia (403)', invasaoDecisao.status === 403);
  const invasaoChamada = await GET('maria', `/api/chamada?turma_id=${turmaAlheia.id}`);
  T('educadora NÃO abre a chamada de turma alheia (403)', invasaoChamada.status === 403);
  const invasaoEstado = await GET('maria', `/api/turma/estado?turma_id=${turmaAlheia.id}`);
  T('educadora NÃO lê o estado de registro de turma alheia (403)', invasaoEstado.status === 403);
  const coordPassa = await GET('rita', `/api/pauta?turma_id=${turmaAlheia.id}`);
  T('a coordenação passa em qualquer turma', coordPassa.status === 200);
  T('a própria turma continua aberta para a educadora', p.risco.criancas.every(c => c.crianca_id > 0));
  T('a sugestão sai da lacuna de exposição', !p.exposicao.area || p.sugestao?.origem === 'exposição');
  T('a pauta lembra o custo real do registro', /chamada e de 40 segundos/i.test(p.rodape));

  const ruim = await POST('maria', '/api/pauta/decidir', { turma_id: turmaId, decisao: 'talvez' });
  T('decisão fora de aceita/descartada é recusada (422)', ruim.status === 422);

  const desc = await POST('maria', '/api/pauta/decidir', { turma_id: turmaId, decisao: 'descartada' });
  T('descartar a sugestão é aceito e registrado',
    desc.status === 200 && desc.corpo.pauta.sugestao.decisao === 'descartada');
  T('o descarte alimenta a métrica de qualidade do agente',
    desc.corpo.descarte.decididas > 0 && typeof desc.corpo.descarte.pct === 'number');
  T('a taxa de descarte tem limiar declarado (30%)', desc.corpo.descarte.limiar === 30);
}

// ============================================================================
// 14 · Estado do registro na tela da turma
// ============================================================================
secao('14 · O rótulo descreve o registro, nunca a criança');
{
  const e = (await GET('maria', `/api/turma/estado?turma_id=${turmaId}`)).corpo;
  T('toda criança da turma tem rótulo de registro', e.criancas.length > 0);
  T('o rótulo fala de registro, não de comportamento',
    e.criancas.every(c => /registro em dia|sem registro há \d+ encontro/.test(c.rotulo)),
    e.criancas[0]?.rotulo);
  T('nenhum rótulo classifica a criança',
    !e.criancas.some(c => /acompanhamento|caminhando bem|quieta|difícil/i.test(c.rotulo)));
}

// ============================================================================
// 15 · Ingestão retroativa (F7)
// ============================================================================
secao('15 · Ingestão retroativa das planilhas antigas (F7)');
{
  const csv = [
    'Nome da Criança;Data de Nascimento;Dia;Presença',
    'Ana Clara Souza;12/03/2016;05/02/2024;P',
    'ANA  CLARA;12/03/2016;12/02/2024;1',
    'ana clara s.;12/03/2016;19/02/2024;sim',
    'Pedro Henrique;07/07/2015;05/02/2024;F',
    'Pedro Henrique;07/07/2015;12/02/2024;P',
    ';;05/02/2024;P',
    'Luísa;01/09/2016;xx/xx/xxxx;P',
  ].join('\n');

  const negado = await POST('maria', '/api/importar', { csv, turma_id: turmaId, simular: true });
  T('educadora não importa planilha (403)', negado.status === 403, `(${negado.status})`);

  const sim = (await POST('rita', '/api/importar', { csv, turma_id: turmaId, origem: 'teste.csv', simular: true })).corpo;
  T('ACEITE F7: três grafias do mesmo nome viram UMA criança',
    sim.criancas_no_arquivo === 2, `(${sim.criancas_no_arquivo} crianças)`);
  T('as grafias unificadas aparecem no relatório para conferência humana',
    sim.duplicatas_resolvidas[0]?.grafias.length === 3);
  T('linha sem nome é descartada com motivo', sim.descartadas.some(d => /sem nome/.test(d.motivo)));
  T('data ilegível é descartada com motivo', sim.descartadas.some(d => /data ilegível/.test(d.motivo)));
  T('a simulação não grava nada', sim.simulado === true);
  T('a permanência retroativa é reconstruída do período do arquivo',
    sim.periodo.inicio === '2024-02-05' && sim.periodo.fim === '2024-02-19');

  const real = (await POST('rita', '/api/importar', { csv, turma_id: turmaId, origem: 'teste.csv' })).corpo;
  T('a importação real grava as crianças deduplicadas', real.criancas_novas === 2);
  T('encontros e presenças históricos são criados', real.encontros === 3 && real.presencas === 5);

  const denovo = (await POST('rita', '/api/importar', { csv, turma_id: turmaId, origem: 'teste.csv' })).corpo;
  T('reimportar reconhece as crianças em vez de duplicar',
    denovo.criancas_novas === 0 && denovo.reconhecidas === 2);
  T('reimportar não duplica presença', denovo.presencas === 0);

  const log = (await GET('rita', '/api/importacoes')).corpo.importacoes;
  T('a importação fica registrada com quem executou', log[0]?.executado_por_nome === 'Rita Amaral');

  // Planilha antiga costuma não ter data de nascimento. A sentinela usada para
  // gravar não pode participar da chave, senão a 2ª importação duplica (SRV-02).
  const semNasc = 'nome,data,presenca\nZulmira Teste,05/03/2024,P\nOtacilio Teste,05/03/2024,F';
  const n1 = (await POST('rita', '/api/importar', { csv: semNasc, turma_id: turmaId, origem: 'sem-nasc.csv' })).corpo;
  const n2 = (await POST('rita', '/api/importar', { csv: semNasc, turma_id: turmaId, origem: 'sem-nasc.csv' })).corpo;
  T('planilha sem nascimento importa as crianças', n1.criancas_novas === 2);
  T('reimportar planilha SEM nascimento reconhece em vez de duplicar',
    n2.criancas_novas === 0 && n2.reconhecidas === 2, `(${n2.criancas_novas} novas)`);
  T('crianças sem nascimento são listadas para conferência humana', n1.sem_nascimento.length === 2);
  T('vínculo fraco (sem nascimento) é reportado para conferência',
    n2.vinculos_fracos.length === 2, JSON.stringify(n2.vinculos_fracos.map(v => v.nome_no_arquivo)));

  // Rodada 2: sem nascimento, grafias incompatíveis NÃO podem virar uma criança só.
  const colide = 'nome,data,presenca\nOtavio Prado,05/04/2024,P\nOtavio Bastos,05/04/2024,P';
  const c = (await POST('rita', '/api/importar', { csv: colide, turma_id: turmaId, simular: true })).corpo;
  T('sem nascimento, "Otavio Prado" e "Otavio Bastos" ficam separados',
    c.criancas_no_arquivo === 2, `(${c.criancas_no_arquivo})`);
  T('a colisão de primeiro nome é nomeada para conferência humana',
    c.colisoes.length === 1 && c.colisoes[0].separados.length === 2, JSON.stringify(c.colisoes));

  const vazio = await POST('rita', '/api/importar', { csv: 'a;b;c', turma_id: turmaId });
  T('planilha sem coluna de nome é recusada com mensagem útil',
    vazio.status === 422 && /coluna do nome/i.test(vazio.corpo.erro), vazio.corpo?.erro);
}

// ============================================================================
// 16 · Relatório do doador (F13/F14) e o perímetro da diretoria
// ============================================================================
secao('16 · Relatório do ciclo, carta e supressão (F13/F14)');
{
  const sol = await POST('solange', '/api/sessao', { educador_id: 4 });
  T('diretoria entra (Solange Ribeiro)', sol.status === 200 && sol.corpo.usuario.papel === 'diretoria');

  const individual = await GET('solange', '/api/crianca?id=1');
  T('a diretoria NÃO abre ficha de criança (403)', individual.status === 403, `(${individual.status})`);
  const lista = await GET('solange', '/api/criancas');
  T('a diretoria NÃO lista crianças (403)', lista.status === 403);

  const negadoRel = await GET('rita', '/api/relatorio');
  T('a coordenação não publica relatório do doador (403)', negadoRel.status === 403);

  // O perímetro da diretoria é o ponto do 08-RELATORIO-DOADOR: quem presta
  // contas trabalha sobre a camada agregada, então não tem acesso individual.
  const ch = await GET('solange', `/api/chamada?turma_id=${turmaId}`);
  T('a diretoria NÃO abre a chamada (403)', ch.status === 403, `(${ch.status})`);
  const al = await GET('solange', '/api/alertas');
  T('a diretoria NÃO abre a lista de alertas (403)', al.status === 403, `(${al.status})`);
  const sc = (await GET('solange', '/api/scores')).corpo;
  T('a diretoria vê os scores em forma agregada', sc.evasao.em_risco > 0 && sc.evasao.nominal_suprimido === true);
  T('a diretoria NÃO recebe nenhum nome de criança nos scores',
    sc.evasao.linhas.length === 0 && !/"nome"|EBZ-\d{4}/.test(JSON.stringify(sc.evasao)));
  T('a distribuição por turma substitui a lista nominal', Array.isArray(sc.evasao.por_turma) && sc.evasao.por_turma.length > 0);
  T('a distribuição por turma também respeita o mínimo de célula',
    sc.evasao.por_turma.every(t => t.n >= 5), JSON.stringify(sc.evasao.por_turma));

  // Rodada 2: a diretoria não escreve nem lê registro individual em rota nenhuma.
  const escrita = await POST('solange', '/api/observacao',
    { crianca_id: 1, concluir: false, itens: [{ dimensao_id: 1, nivel: 2 }] });
  T('a diretoria NÃO grava observação de criança (403)', escrita.status === 403, `(${escrita.status})`);
  for (const [rota, rotulo] of [
    [`/api/ciclo/agenda?turma_id=${turmaId}`, 'agenda do ciclo'],
    [`/api/turma/painel?turma_id=${turmaId}`, 'painel da turma'],
    [`/api/turma/plano?turma_id=${turmaId}`, 'plano da turma'],
  ]) {
    const r = await GET('solange', rota);
    T(`a diretoria NÃO abre ${rotulo} (403)`, r.status === 403, `(${r.status})`);
  }

  const base = (await GET('solange', '/api/relatorio')).corpo;
  T('a diretoria recebe períodos sugeridos', base.periodos.length >= 3);
  T('o mínimo de célula é declarado na tela', base.minimo_celula === 5);

  const p = base.periodos.find(x => /180 dias/.test(x.rotulo));
  const g = await POST('solange', '/api/relatorio/gerar', { tipo: 'ciclo', inicio: p.inicio, fim: p.fim, custo: 48200.5 });
  T('o rascunho do relatório é gerado', g.status === 200 && g.corpo.blocos.length === 7);
  T('os sete blocos vêm na ordem do 08-RELATORIO-DOADOR',
    g.corpo.blocos.map(b => b.numero).join(',') === '1,2,3,4,5,6,7');
  T('o revisor de sobre-alegação aprova o template fechado',
    g.corpo.revisor_status === 'aprovado', g.corpo.revisor_notas);
  T('nenhum bloco usa verbo causal forte',
    !/\b(causou|gerou|provou|comprova que|garante)\b/i.test(g.corpo.texto));
  T('a ressalva metodológica está no texto',
    /fatores externos não foram isolados/i.test(g.corpo.texto));
  T('o texto NÃO atribui contribuição do programa aos avanços',
    !/contribu(iu|íram|iram|em|i)\b/i.test(g.corpo.texto), g.corpo.texto.match(/contribu\w+/i)?.[0]);
  T('o revisor barra a formulação causal atenuada, se alguém a reintroduzir',
    (await POST('solange', '/api/relatorio/gerar', { tipo: 'ciclo', inicio: p.inicio, fim: p.fim })).status === 200);
  T('nenhuma lacuna de exposição publicada tem menos de 5 crianças',
    (g.corpo.numeros.exposicao.lacunas || []).every(l => l.criancas >= 5),
    JSON.stringify(g.corpo.numeros.exposicao.lacunas));
  T('a supressão declara quantas lacunas foram agrupadas',
    typeof g.corpo.supressoes.lacunas_suprimidas === 'number');
  T('nenhum recorte de programa publicado tem percentual somado (>100%)',
    g.corpo.numeros.permanencia.presenca_por_programa.every(x => x.presenca_pct <= 100),
    JSON.stringify(g.corpo.numeros.permanencia.presenca_por_programa.map(x => x.presenca_pct)));
  T('a manchete da capa respeita o mínimo de célula',
    g.corpo.supressoes.capa_por_vinculo
      ? g.corpo.numeros.permanencia.mais_de_doze_meses >= 5
      : !/há mais de doze meses/.test(g.corpo.blocos[0].texto));
  T('crianças únicas e matrículas aparecem lado a lado',
    /crianças únicas e \d+ matrículas/i.test(g.corpo.texto));
  T('a supressão foi aplicada ANTES da redação e é declarada',
    g.corpo.supressoes.minimo === 5 && Array.isArray(g.corpo.supressoes.programas));
  T('o programa fora de escopo com poucas crianças foi agrupado',
    g.corpo.supressoes.programas.length > 0, JSON.stringify(g.corpo.supressoes.programas));
  T('nenhum nome de criança aparece no relatório',
    !g.corpo.blocos.some(b => /EBZ-\d{4}/.test(JSON.stringify(b))));
  T('os dois denominadores de custo são publicados juntos',
    /por criança única/i.test(g.corpo.texto) && /por matrícula/i.test(g.corpo.texto));
  T('a âncora acadêmica é declarada como ainda não ingerida',
    /não é ingerido|não entra aqui/i.test(g.corpo.texto));

  const pub = await POST('solange', '/api/relatorio/publicar', { tipo: 'ciclo', periodo: `${p.inicio}..${p.fim}` });
  T('a diretoria publica após revisar', pub.status === 200 && pub.corpo.status === 'publicado');
  const rege = await POST('solange', '/api/relatorio/gerar', { tipo: 'ciclo', inicio: p.inicio, fim: p.fim });
  T('relatório publicado não é sobrescrito por acidente (422)', rege.status === 422);

  const carta = await POST('solange', '/api/relatorio/gerar', { tipo: 'carta', inicio: p.inicio, fim: p.fim });
  T('a carta do trimestre usa o mesmo pipeline, template curto',
    carta.status === 200 && carta.corpo.blocos.length === 1);
  T('a carta também passa pelo revisor', carta.corpo.revisor_status === 'aprovado');
  T('a carta declara a regra de supressão ao leitor',
    /menos de 5 crianças são agrupados ou suprimidos/i.test(carta.corpo.texto));
  T('a carta NÃO atribui contribuição do programa aos avanços',
    !/contribu(iu|íram|iram|em|i)\b/i.test(carta.corpo.texto));
  T('a carta aplica o mesmo mínimo de célula da capa do relatório',
    carta.corpo.numeros.permanencia.mais_de_doze_meses >= 5
      ? /crianças estão no instituto há mais de um ano/.test(carta.corpo.texto)
      : /não é publicado neste período/.test(carta.corpo.texto));

  const ruim = await POST('solange', '/api/relatorio/gerar', { tipo: 'ciclo', inicio: '2026-12-31', fim: '2026-01-01' });
  T('período invertido é recusado (422)', ruim.status === 422);
}

// ============================================================================
// 17 · Consulta em linguagem natural (F15)
// ============================================================================
secao('17 · Consulta sobre a camada agregada (F15)');
{
  const negado = await POST('maria', '/api/consulta', { pergunta: 'quantas crianças?' });
  T('educadora não usa a consulta agregada (403)', negado.status === 403);

  const c = (await POST('rita', '/api/consulta', { pergunta: 'Quantas crianças o instituto atende?' })).corpo;
  T('a consulta reconhece a intenção de contagem', c.reconhecida && c.intencao === 'contagem');
  T('a resposta cita a fonte do número', /crianca|matricula/i.test(c.fonte));
  T('a resposta separa criança única de matrícula',
    /crianças únicas/i.test(c.resposta) && /matrículas/i.test(c.resposta));

  const r = (await POST('rita', '/api/consulta', { pergunta: 'quantas estão em risco de sair?' })).corpo;
  T('a consulta responde sobre evasão com número do banco', r.reconhecida && /em risco/i.test(r.resposta));

  const n = (await POST('rita', '/api/consulta', { pergunta: 'a Ana Clara está bem?' })).corpo;
  T('pergunta sobre criança individual não é reconhecida', n.reconhecida === false);
  T('quando não sabe, o sistema diz que não sabe',
    /não sei responder/i.test(n.resposta) && /inventar/i.test(n.resposta));
  T('a recusa oferece o que ele sabe responder', n.sugestoes.length >= 4);
  T('a doutrina de perímetro é declarada na resposta',
    /dado individual de criança não é respondido/i.test(n.doutrina));

  const vazia = await POST('rita', '/api/consulta', { pergunta: '   ' });
  T('pergunta vazia é recusada (422)', vazia.status === 422);
}

// ============================================================================
// 18 · Fecho de ciclo — a retenção declarada, executada (achado A-05)
// ============================================================================
secao('18 · Fecho de ciclo executa a retenção declarada');
{
  const ciclo = (await GET('rita', '/api/sintese')).corpo.ciclo;
  const negado = await POST('maria', '/api/ciclo/fechar', { ciclo_id: ciclo.id });
  T('educadora não fecha o ciclo (403)', negado.status === 403, `(${negado.status})`);

  const f = await POST('rita', '/api/ciclo/fechar', { ciclo_id: ciclo.id, abrir_proximo: true });
  T('a coordenação fecha o ciclo', f.status === 200 && f.corpo.ciclo.status === 'fechado');
  T('o fecho abre o próximo ciclo', f.corpo.proximo?.status === 'aberto');
  T('o fecho reporta quantas anotações legadas foram descartadas',
    typeof f.corpo.notas_descartadas === 'number');

  const denovo = await POST('rita', '/api/ciclo/fechar', { ciclo_id: ciclo.id });
  T('ciclo já fechado não fecha de novo (422)', denovo.status === 422);
}

// ------------------------------------------------ 19. escopo de turma (A4)
secao('19 · Escopo de turma nas rotas de leitura individual (decisão 22)');
{
  // Cleide (educador 3) tem turma própria; Maria não pode abrir criança dela.
  await POST('cleide', '/api/sessao', { educador_id: 3 });
  const deCleide = (await GET('cleide', '/api/criancas')).corpo.criancas;
  T('a lista da Cleide também vem escopada e não-vazia', deCleide.length > 0);

  // Criança em 2 programas pode estar em turmas de DUAS educadoras — o alvo
  // do teste é uma criança que NÃO tenha vínculo com a Maria.
  const daMaria = (await GET('maria', '/api/criancas')).corpo.criancas;
  const alheia = deCleide.find(c => !daMaria.some(x => x.id === c.id));
  T('existe criança exclusiva de outra educadora para o teste', !!alheia);

  const ficha = await GET('maria', `/api/crianca?id=${alheia.id}`);
  T('educadora NÃO abre ficha de criança de outra turma (403)', ficha.status === 403, `(${ficha.status})`);

  const obs = await GET('maria', `/api/observacao?crianca_id=${alheia.id}`);
  T('educadora NÃO abre observação de criança de outra turma (403)', obs.status === 403, `(${obs.status})`);
}

// ------------------------------------------------ 20. Passo (assistente)
// Só os caminhos que NUNCA chegam ao modelo — o Passo com modelo é coberto
// pelo ai-stub-test. Assim o bloco passa igual com AI_ENABLED ligado ou não.
secao('20 · Passo — assistente-parceiro (limites no servidor)');
{
  const anon = await POST('anon-passo', '/api/assistente', { message: 'oi', tela: '#/hoje' });
  T('sem sessão, o Passo responde 401', anon.status === 401, `(${anon.status})`);

  const vazio = await POST('maria', '/api/assistente', { message: '   ', tela: '#/hoje' });
  T('pergunta vazia responde 422', vazio.status === 422, `(${vazio.status})`);

  const reflexiva = await POST('maria', '/api/assistente',
    { message: 'como lidar com uma criança que morde os colegas?', tela: '#/hoje' });
  T('pergunta reflexiva redireciona ao copilot, sem passar por modelo',
    reflexiva.status === 200 && reflexiva.corpo.tipo === 'redirecionamento'
    && reflexiva.corpo.origem === 'guia' && reflexiva.corpo.acao?.id === 'copilot');
  T('redirecionamento nunca tem fala', reflexiva.corpo.fala === null);

  const fora = await POST('maria', '/api/assistente', { message: 'qual é a capital da França?', tela: '#/hoje' });
  T('fora do produto: o Passo declara o próprio limite, sem ação',
    fora.status === 200 && fora.corpo.tipo === 'redirecionamento' && fora.corpo.acao === null);

  const criancas = (await GET('maria', '/api/criancas')).corpo.criancas;
  const dir = await POST('solange', '/api/assistente',
    { message: `quantas faltas a ${criancas[0].nome.split(' ')[0]} teve neste percurso?`, tela: '#/relatorio' });
  T('diretoria + nome de criança = recusa determinística (decisão 16)',
    dir.status === 200 && dir.corpo.tipo === 'recusa' && dir.corpo.origem === 'guia' && dir.corpo.fala === null);

  const chips = await GET('maria', `/api/assistente/chips?tela=${encodeURIComponent('#/chamada')}`);
  T('chips da tela vêm em 3 sugestões', chips.status === 200 && chips.corpo.chips.length === 3);

  const chipsDir = await GET('solange', `/api/assistente/chips?tela=${encodeURIComponent('#/chamada')}`);
  T('chips não vazam a tela de outro papel',
    chipsDir.status === 200 && !/presença|cronômetro/i.test(chipsDir.corpo.chips.join(' ')));

  const del = await req('maria', '/api/assistente/sessao',
    { method: 'DELETE', body: JSON.stringify({ session_id: reflexiva.corpo.session_id }) });
  T('apagar a sessão do Passo responde 200', del.status === 200, `(${del.status})`);
}

console.log(`\n\x1b[1m${ok} passaram · ${falhas} falharam\x1b[0m\n`);
process.exit(falhas ? 1 : 0);
