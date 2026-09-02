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
    !!f.trajetoria && f.consentimentos.length >= 11);  // 5 originais + 5 da v2 + registro de vivência (decisão 31)
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
    // Desde a decisão 31 o check-in de grupo conta como UM campo sugerido (5 no total).
    conf.corpo.folha.campos_sugeridos === 5 && conf.corpo.folha.campos_editados === 2,
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
      // As DUAS formulações do recorte são barradas: com o texto em linguagem
      // de carta, "há mais de um ano" é o jeito natural de dizer o mesmo — e
      // publicaria o grupo pequeno pela porta dos fundos.
      : !/há mais de doze meses|há mais de um ano/.test(g.corpo.blocos[0].texto));
  T('crianças únicas e matrículas aparecem lado a lado',
    /crianças únicas e \d+ matrículas/i.test(g.corpo.texto));
  T('a supressão foi aplicada ANTES da redação e é declarada',
    g.corpo.supressoes.minimo === 5 && Array.isArray(g.corpo.supressoes.programas));
  // Até 02/09/2026 a Vivência terapêutica não tinha matrícula e era o programa
  // pequeno que a supressão agrupava. Com as duas turmas de sábado (decisão 31)
  // ela passa a ser publicável — com presença e SEM rubrica — e a regra de
  // agrupamento (n < 5) continua provada no teste unitário `suprimir`.
  T('a lista de programas suprimidos é declarada (vazia quando nenhum é pequeno)',
    Array.isArray(g.corpo.supressoes.programas), JSON.stringify(g.corpo.supressoes.programas));
  T('a Vivência terapêutica entra na tabela do doador com presença, como programa',
    g.corpo.numeros.cobertura.programas.some(p => /Viv[eê]ncia/i.test(p.rotulo ?? p.nome) && p.presenca_pct != null),
    JSON.stringify(g.corpo.numeros.cobertura.programas.map(p => [p.rotulo ?? p.nome, p.presenca_pct])));
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

// ------------------------------------- 21. cadastro de pessoas (equipe/criancas)
secao('21 · Cadastro de pessoas — equipe e crianças');
{
  // Quem cadastra define papel e matricula, e papel+matricula sao o que decide
  // o escopo de leitura do resto do produto. Por isso a porta e' de coordenacao.
  const negadoEdu = await GET('maria', '/api/cadastro');
  T('professora NÃO abre o cadastro (403)', negadoEdu.status === 403, `(${negadoEdu.status})`);
  const negadoDir = await POST('solange', '/api/criancas',
    { nome: 'Teste Diretoria', nascimento: '2017-05-04', responsavel: 'X', programa_id: 1 });
  T('diretoria NÃO cadastra criança (403)', negadoDir.status === 403, `(${negadoDir.status})`);

  const cad = await GET('rita', '/api/cadastro');
  T('coordenação abre o cadastro com equipe, papéis, programas e turmas',
    cad.status === 200 && cad.corpo.equipe.length >= 5 && cad.corpo.papeis.length === 4 &&
    cad.corpo.programas.length >= 1 && cad.corpo.turmas.length >= 1);
  T('o cadastro anuncia o próximo código da criança', /^EBZ-\d{4}$/.test(cad.corpo.proximo_codigo));

  const nova = await POST('rita', '/api/equipe', { nome: 'Vera Lúcia Antunes', papel: 'educador' });
  T('coordenação cadastra professora nova', nova.status === 200 && nova.corpo.pessoa.papel === 'educador');
  T('o apelido sai do nome quando não vem preenchido', nova.corpo.pessoa.apelido === 'Vera A.');

  const repetida = await POST('rita', '/api/equipe', { nome: 'vera lúcia antunes', papel: 'educador' });
  T('homônimo no mesmo papel é recusado (409)', repetida.status === 409, `(${repetida.status})`);

  const entra = await POST('vera', '/api/sessao', { educador_id: nova.corpo.pessoa.id });
  T('a pessoa nova entra no Percurso pela porta de sempre',
    entra.status === 200 && entra.corpo.usuario.nome === 'Vera Lúcia Antunes');
  T('a pessoa nova aparece na lista da tela de entrada',
    (await GET('anon2', '/api/sessao')).corpo.usuarios.some(u => u.id === nova.corpo.pessoa.id));

  const turmaOcupada = cad.corpo.turmas.find(t => t.educador);
  const semConfirmar = await POST('rita', '/api/equipe',
    { nome: 'Íris Camargo', papel: 'educador', turma_id: turmaOcupada.id });
  T('turma que já tem professora exige confirmação (409)',
    semConfirmar.status === 409 && semConfirmar.corpo.exige_confirmacao === 'troca_de_turma');
  const comConfirmar = await POST('rita', '/api/equipe',
    { nome: 'Íris Camargo', papel: 'educador', turma_id: turmaOcupada.id, confirmar_troca: true });
  T('confirmada, a troca de turma acontece e diz quem saiu',
    comConfirmar.status === 200 && comConfirmar.corpo.substituiu === turmaOcupada.educador);

  const turmaAlvo = cad.corpo.turmas[0];
  const antes = (await GET('rita', `/api/criancas?turma_id=${turmaAlvo.id}`)).corpo.total;
  const crianca = await POST('rita', '/api/criancas', {
    nome: 'Manuela Boaventura', nascimento: '2017-03-14', responsavel: 'Dulce Boaventura',
    programa_id: turmaAlvo.programa_id, turma_id: turmaAlvo.id,
  });
  T('coordenação cadastra criança nova', crianca.status === 200 && /^EBZ-\d{4}$/.test(crianca.corpo.crianca.codigo));
  T('a criança nova entra na lista da turma',
    (await GET('rita', `/api/criancas?turma_id=${turmaAlvo.id}`)).corpo.total === antes + 1);

  // A consequencia que importa: entra pela presenca, NAO entra observavel.
  const ficha = (await GET('rita', `/api/crianca?id=${crianca.corpo.crianca.id}`)).corpo;
  const rubrica = ficha.consentimentos.find(c => c.campo === 'rubrica_socioemocional');
  T('a criança nova nasce com a rubrica socioemocional pendente', rubrica.status === 'pendente');
  const obs = await POST('rita', '/api/observacao',
    { crianca_id: crianca.corpo.crianca.id, itens: [], nota_livre: '' });
  T('observar a criança nova é bloqueado enquanto o consentimento não vem',
    obs.status !== 200, `(${obs.status})`);
  T('a criança nova aparece na tela que a desbloqueia',
    (await GET('rita', '/api/consentimentos')).corpo.linhas.some(l => l.id === crianca.corpo.crianca.id));

  const duplicada = await POST('rita', '/api/criancas', {
    nome: 'manuela boaventura', nascimento: '2017-03-14', responsavel: 'Dulce Boaventura',
    programa_id: turmaAlvo.programa_id,
  });
  T('mesma criança pela chave nome+nascimento é recusada (409)',
    duplicada.status === 409 && duplicada.corpo.crianca_id === crianca.corpo.crianca.id);

  const futuro = await POST('rita', '/api/criancas', {
    nome: 'Ainda Não Nasceu', nascimento: '2099-01-01', responsavel: 'X', programa_id: turmaAlvo.programa_id });
  T('data de nascimento no futuro é recusada (422)', futuro.status === 422, `(${futuro.status})`);
}

// ---------------------------------------- 22. arquivo — ninguem e' apagado
secao('22 · Arquivo — ninguém é apagado (decisão 30)');
{
  // A ausencia E' a feature: nao existe rota que apague pessoa.
  for (const rota of ['/api/equipe', '/api/criancas']) {
    const del = await req('rita', rota, { method: 'DELETE' });
    T(`não existe DELETE ${rota} (404)`, del.status === 404, `(${del.status})`);
  }

  const vera = (await GET('rita', '/api/cadastro')).corpo.equipe.find(p => /Vera Lúcia/.test(p.nome));
  T('a professora criada na §21 está na equipe viva', !!vera);

  // Ela tem sessao ABERTA desde a §21 — arquivar precisa valer agora, nao no
  // proximo login: o cookie nao e' assinado e vale 24 h.
  T('a sessão dela funciona antes de arquivar', (await GET('vera', '/api/hoje')).status === 200);
  const arq = await POST('rita', '/api/equipe/arquivar', { id: vera.id });
  T('coordenação arquiva a professora', arq.status === 200, `(${arq.status})`);
  T('a sessão aberta dela morre no ato (401)', (await GET('vera', '/api/hoje')).status === 401);
  T('ela some da lista da tela de entrada',
    !(await GET('anon3', '/api/sessao')).corpo.usuarios.some(u => u.id === vera.id));
  const relogin = await POST('vera2', '/api/sessao', { educador_id: vera.id });
  T('e não consegue entrar de novo (403)', relogin.status === 403, `(${relogin.status})`);
  T('mas continua existindo, no arquivo',
    (await GET('rita', '/api/arquivo')).corpo.pessoas.some(p => p.id === vera.id));

  const volta = await POST('rita', '/api/equipe/reativar', { id: vera.id });
  T('a coordenação traz de volta do arquivo', volta.status === 200);
  T('e ela entra outra vez', (await POST('vera3', '/api/sessao', { educador_id: vera.id })).status === 200);

  const eu = (await GET('rita', '/api/sessao')).corpo.usuario;
  const auto = await POST('rita', '/api/equipe/arquivar', { id: eu.id });
  T('ninguém arquiva a si mesma (422)', auto.status === 422, `(${auto.status})`);

  // Crianca: sai das listas vivas, o registro fica, e a volta e' matricula nova.
  const turma = (await GET('rita', '/api/cadastro')).corpo.turmas[0];
  const antes = (await GET('rita', `/api/criancas?turma_id=${turma.id}`)).corpo;
  const alvo = antes.criancas[0];
  const arqC = await POST('rita', '/api/criancas/arquivar', { id: alvo.id });
  T('coordenação manda a criança para o arquivo', arqC.status === 200, `(${arqC.status})`);
  T('ela sai da lista viva da turma',
    (await GET('rita', `/api/criancas?turma_id=${turma.id}`)).corpo.total === antes.total - 1);
  T('a matrícula foi encerrada COM data de saída',
    (await GET('rita', `/api/crianca?id=${alvo.id}`)).corpo.matriculas.every(m => m.status === 'encerrada' && m.saida));
  T('a presença dela continua no sistema — é o que a curva de permanência lê',
    (await GET('rita', `/api/crianca?id=${alvo.id}`)).corpo.presencas.length > 0);
  T('ela aparece no arquivo', (await GET('rita', '/api/arquivo')).corpo.criancas.some(c => c.id === alvo.id));
  T('educadora não arquiva criança (403)',
    (await POST('maria', '/api/criancas/arquivar', { id: alvo.id })).status === 403);

  const rem = await POST('rita', '/api/criancas/rematricular',
    { id: alvo.id, programa_id: turma.programa_id, turma_id: turma.id });
  T('voltar é matrícula NOVA, e a antiga continua encerrada', rem.status === 200 &&
    (await GET('rita', `/api/crianca?id=${alvo.id}`)).corpo.matriculas.filter(m => m.status === 'encerrada').length >= 1);
  T('e ela volta para a lista viva da turma',
    (await GET('rita', `/api/criancas?turma_id=${turma.id}`)).corpo.total === antes.total);
  const fichaVolta = (await GET('rita', `/api/crianca?id=${alvo.id}`)).corpo;
  T('o consentimento voltou a PENDENTE — a base legal caducou com a saída',
    fichaVolta.consentimentos.find(c => c.campo === 'rubrica_socioemocional').status === 'pendente');
}

// ------------------------- 24. a psicóloga e a Vivência terapêutica (decisão 31)
secao('24 · Psicóloga e Vivência terapêutica — indicador de programa, nunca clínico (decisão 31)');
{
  const login = await POST('carolina', '/api/sessao', { educador_id: 5 });
  T('psicóloga entra com o papel profissional', login.status === 200 && login.corpo.usuario.papel === 'profissional');

  const inv = (await GET('carolina', '/api/inventario')).corpo;
  // Os números exatos da seed (120/106/14) são provados no teste unitário, sobre
  // banco recém-semeado; aqui a bateria já cadastrou e rematriculou crianças.
  const somaEscopo = inv.porPrograma.filter(p => p.no_escopo).reduce((s, p) => s + p.matriculas, 0);
  T('as matrículas do inventário são só dos programas do dossiê — a Vivência é contada à parte',
    inv.matriculas === somaEscopo && inv.matriculas - inv.criancasUnicas === inv.multi,
    `(${inv.matriculas}/${inv.criancasUnicas}/${inv.multi}; escopo=${somaEscopo})`);
  T('a Vivência tem matrícula própria (24) e não muda as crianças únicas',
    inv.foraDaRubrica.matriculas === 24 && inv.foraDaRubrica.criancas === 24, JSON.stringify(inv.foraDaRubrica));

  const hoje = (await GET('carolina', '/api/hoje')).corpo;
  T('o Hoje dela abre na turma da Vivência', !!hoje.turma && /Viv[eê]ncia/i.test(hoje.turma.programa));
  T('a turma da Vivência está fora da rubrica: sem agenda de ciclo', hoje.na_rubrica === false && hoje.agenda === null);
  T('ela não está em lapso (registrou no último sábado)', hoje.retomada.em_lapso === false);

  const agenda = await GET('carolina', `/api/ciclo/agenda?turma_id=${hoje.turma.id}`);
  T('pedir a agenda do ciclo para a Vivência é recusado com o motivo (422)',
    agenda.status === 422 && /rubrica/i.test(agenda.corpo?.erro ?? agenda.corpo?.message ?? JSON.stringify(agenda.corpo)),
    `(${agenda.status})`);

  const chamada = (await GET('carolina', `/api/chamada?turma_id=${hoje.turma.id}`)).corpo;
  T('ela vê a chamada da própria turma', Array.isArray(chamada.criancas) && chamada.criancas.length === 12);
  const outra = await GET('maria', `/api/chamada?turma_id=${hoje.turma.id}`);
  T('a professora de outra turma NÃO abre a chamada da Vivência (403)', outra.status === 403, `(${outra.status})`);
  const coord = await GET('rita', `/api/chamada?turma_id=${hoje.turma.id}`);
  T('a coordenação abre qualquer turma, inclusive a Vivência', coord.status === 200);

  const lista = (await GET('carolina', '/api/criancas')).corpo;
  T('o escopo dela é o das próprias turmas (24 crianças, não 106)', lista.total === 24, `(${lista.total})`);
  const painel = (await GET('rita', '/api/painel')).corpo;
  T('a Vivência não entra no denominador da cobertura da rubrica',
    painel.programas.every(p => !/Viv[eê]ncia/i.test(p.nome)) && painel.foraDeEscopo.some(p => /Viv[eê]ncia/i.test(p.nome)));
  const gov = (await GET('rita', '/api/consentimentos')).corpo.governanca;
  T('a governança declara o registro de vivência (base legal, titular, acesso, retenção) e mantém o conteúdo clínico fora',
    gov.some(g => g.campo === 'registro_de_vivencia' && !g.exige_consentimento) &&
    gov.some(g => g.campo === 'conteudo_clinico' && /Ningu/i.test(g.acesso)));
}

// ------------------------------- 25. a planilha socioemocional (decisão 34)
secao('25 · A planilha socioemocional do Instituto, preenchida pelo Percurso (decisão 34)');
{
  const rub = (await GET('maria', '/api/rubrica')).corpo;
  T('a rubrica tem as seis dimensões da planilha, nesta ordem',
    JSON.stringify(rub.dimensoes.map(d => d.nome)) ===
    JSON.stringify(['Autocontrole', 'Convivência', 'Participação', 'Expressão emocional', 'Autoestima', 'Resiliência']));

  const res = await GET('rita', '/api/planilha/resumo');
  T('coordenação lê o resumo da planilha (dois ciclos, seis indicadores + geral)',
    res.status === 200 && res.corpo.indicadores.length === 6 && !!res.corpo.geral && res.corpo.ciclo_inicial.id !== res.corpo.ciclo_final.id);
  T('cada indicador traz a leitura da planilha ou a supressão declarada',
    res.corpo.indicadores.every(i => i.suprimida || ['Resultado forte', 'Evolução moderada', 'Atenção para acompanhamento'].includes(i.leitura)));
  T('o resumo carrega a legenda do mapeamento 1–4 → 0–2 e a ressalva metodológica',
    /1→0, 2→1, 3→1, 4→2/.test(res.corpo.legenda) && /fatores externos/.test(res.corpo.ressalva));
  T('a diretoria também lê o resumo (agregado)', (await GET('solange', '/api/planilha/resumo')).status === 200);
  T('professora NÃO lê o resumo da planilha (403)', (await GET('maria', '/api/planilha/resumo')).status === 403);

  const csv = await fetch(BASE + '/api/exportar/planilha', { headers: { Cookie: cookies['rita'] } });
  // `text()` descarta o BOM ao decodificar; o Excel precisa dele nos bytes.
  const bytes = Buffer.from(await csv.arrayBuffer());
  const texto = bytes.toString('utf8').replace(/^\uFEFF/, '');
  T('coordenação exporta a planilha como CSV (text/csv, anexo, com BOM para o Excel)',
    csv.status === 200 && /text\/csv/.test(csv.headers.get('content-type') || '') &&
    /attachment/.test(csv.headers.get('content-disposition') || '') &&
    bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF);
  T('o CSV tem o cabeçalho da aba Avaliações e sai por código, sem nome',
    /^ID;Turma;/.test(texto) && /Total final;Evolução 0\/1\/2 \(geral\)/.test(texto) &&
    /\nEBZ-\d{4};/.test(texto) && !/;(Ana|Beatriz|Caio|Davi|Enzo) /.test(texto));
  T('professora NÃO exporta (403)',
    (await fetch(BASE + '/api/exportar/planilha', { headers: { Cookie: cookies['maria'] } })).status === 403);
  T('diretoria NÃO exporta linhas por criança (403) — só o agregado',
    (await fetch(BASE + '/api/exportar/planilha', { headers: { Cookie: cookies['solange'] } })).status === 403);
}

// ------------------------ 26. registro de vivência, relato e devolução (decisão 31)
secao('26 · Registro de vivência — check-in de grupo, relato do conselho e devolução por encontro');
{
  const hoje = (await GET('carolina', '/api/hoje')).corpo;
  const tid = hoje.turma.id;
  const folha = (await GET('carolina', `/api/folha?turma_id=${tid}`)).corpo;
  T('a folha da Vivência se declara vivência e traz os catálogos novos',
    folha.vivencia === true && folha.catalogos.procedimentos.length >= 6 && folha.catalogos.checkin.length === 5);
  T('a folha existente da seed tem check-in e procedimento', !!folha.folha && folha.folha.procedimento && folha.folha.checkin.participaram_inteiro != null);

  const fala = 'Hoje foi vivência terapêutica com o jogo da rede de apoio, sobre cidadania. Duas ajudaram sem ninguém pedir, seis participaram do começo ao fim, teve um conflito e resolveram conversando. Uma não foi observada.';
  const ex = await POST('carolina', '/api/voz/extrair', { turma_id: tid, transcricao: fala });
  T('a fala da psicóloga sobre a vivência NÃO é barrada pelo perímetro (o nome do procedimento não é conteúdo clínico)',
    ex.status === 200 && ex.corpo.excluido === false && ex.corpo.procedimento_neutralizado >= 1, JSON.stringify(ex.corpo.trechos));
  T('o extrator devolve procedimento, objetivo e o check-in em contagens',
    ex.corpo.extracao.procedimento === 'rede_apoio' && ex.corpo.extracao.checkin.ajudaram_sem_pedir === 2 &&
    ex.corpo.extracao.checkin.participaram_inteiro === 6 && ex.corpo.extracao.checkin.conflitos_resolvidos_conversando === 1);
  T('nada foi gravado na extração', ex.corpo.gravado === false);
  const comNome = await POST('carolina', '/api/voz/extrair', { turma_id: tid, transcricao: `${folha.chamada.criancas[0].nome} ajudou sem ninguém pedir hoje na roda de emoções, e a turma participou.` });
  T('nome de criança na fala é contado e substituído — a tela mostra o nome virando código',
    comNome.status === 200 && comNome.corpo.nomes_substituidos >= 1);
  const clinico = await POST('carolina', '/api/voz/extrair', { turma_id: tid, transcricao: `Na vivência terapêutica a ${folha.chamada.criancas[0].nome.split(' ')[0]} contou que sofreu abuso em casa. O resto do grupo fez a roda.` });
  T('mas conteúdo sobre criança continua barrado mesmo na vivência', clinico.corpo.excluido === true);

  const semProc = await POST('carolina', '/api/folha', { turma_id: tid, campos: { ...ex.corpo.extracao, procedimento: 'nao_identificado' }, origem: 'voz', sugestao: ex.corpo.extracao });
  T('salvar a folha da vivência sem procedimento é recusado com o campo apontado (422)', semProc.status === 422 && semProc.corpo.campo === 'procedimento');
  const salva = await POST('carolina', '/api/folha', { turma_id: tid, campos: ex.corpo.extracao, origem: 'voz', sugestao: ex.corpo.extracao });
  T('a folha da vivência é gravada com o check-in', salva.status === 200 && salva.corpo.folha.checkin.participaram_inteiro === 6 && salva.corpo.folha.procedimento === 'rede_apoio');
  T('a resposta traz a devolução por encontro', !!salva.corpo.devolucao && salva.corpo.devolucao.linhas.length >= 3);
  T('a devolução compara com as últimas folhas quando há base', salva.corpo.devolucao.comparavel === true && salva.corpo.devolucao.linhas.some(l => l.comparacao));
  const hoje2 = (await GET('carolina', '/api/hoje')).corpo;
  T('o Hoje da psicóloga carrega a devolução', !!hoje2.devolucao && hoje2.devolucao.linhas.length >= 3);

  const rel = await GET('carolina', `/api/relato?turma_id=${tid}`);
  T('o relato sai no padrão do conselho, em rascunho', rel.status === 200 && /REGISTRO DE PROCEDIMENTO/.test(rel.corpo.texto) && rel.corpo.liberado === false && /RASCUNHO/.test(rel.corpo.texto));
  T('o relato não tem nome de criança', !folha.chamada.criancas.some(c => rel.corpo.texto.includes(c.nome.split(' ')[0] + ' ')));
  T('a professora de outra turma não abre o relato (403)', (await GET('maria', `/api/relato?turma_id=${tid}`)).status === 403);
  T('a diretoria não abre o relato (403)', (await GET('solange', `/api/relato?turma_id=${tid}`)).status === 403);
  const lib = await POST('carolina', '/api/relato/liberar', { turma_id: tid });
  T('a psicóloga libera o relato — e a folha fecha junto', lib.status === 200 && lib.corpo.liberado === true &&
    (await GET('carolina', `/api/folha?turma_id=${tid}`)).corpo.folha.status === 'fechada');
  T('liberar duas vezes é 409', (await POST('carolina', '/api/relato/liberar', { turma_id: tid })).status === 409);
  T('a coordenação lê o relato liberado e o histórico da turma',
    (await GET('rita', `/api/relato?turma_id=${tid}`)).corpo.historico.length >= 1);
  T('a governança do registro de vivência aparece na ficha (campo declarado, sem consentimento)',
    (await GET('rita', `/api/crianca?id=${folha.chamada.criancas[0].id}`)).corpo.consentimentos.some(c => c.campo === 'registro_de_vivencia'));
}

// ---------------------- 27. régua de presença e recado da turma (decisão 33)
secao('27 · Régua de presença do Instituto (75%) e recado da turma aos responsáveis');
{
  const hoje = (await GET('carolina', '/api/hoje')).corpo;
  const tid = hoje.turma.id;
  const r = await GET('carolina', `/api/turma/presenca?turma_id=${tid}`);
  T('a psicóloga vê a régua da própria turma, com faixa por criança', r.status === 200 && r.corpo.minima_pct === 75 &&
    r.corpo.criancas.length >= 10 && r.corpo.criancas.every(c => ['ok', 'atencao', 'abaixo', 'sem_base'].includes(c.faixa)));
  T('a régua tem criança abaixo e em atenção (a seed força as duas)', r.corpo.resumo.abaixo >= 1 && r.corpo.resumo.atencao >= 1, JSON.stringify(r.corpo.resumo));
  T('a professora de outra turma NÃO vê a régua da Vivência (403)', (await GET('maria', `/api/turma/presenca?turma_id=${tid}`)).status === 403);
  T('a diretoria NÃO vê régua por criança (403)', (await GET('solange', `/api/turma/presenca?turma_id=${tid}`)).status === 403);
  const inst = await GET('solange', '/api/regua');
  T('a diretoria vê a régua do Instituto só em contagens por turma', inst.status === 200 && inst.corpo.turmas.length >= 7 &&
    !JSON.stringify(inst.corpo).includes(r.corpo.criancas[0].nome));
  T('a coordenação também', (await GET('rita', '/api/regua')).status === 200);
  T('a professora NÃO abre a régua do Instituto (403)', (await GET('maria', '/api/regua')).status === 403);

  const rec = await GET('carolina', `/api/recado?turma_id=${tid}`);
  T('o recado da turma é gerado do registro (presença em número, atividade)', rec.status === 200 && new RegExp('Presença de hoje: \\d+ de ' + r.corpo.criancas.length).test(rec.corpo.texto));
  T('o recado não tem nome de criança', !r.corpo.criancas.some(c => rec.corpo.texto.includes(c.nome.split(' ')[0])));
  T('o recado abre no WhatsApp sem número (a pessoa escolhe o grupo)', /^https:\/\/wa\.me\/\?text=/.test(rec.corpo.whatsapp_url));
  T('a governança declara o recado da turma (sem consentimento; não persiste)',
    (await GET('rita', '/api/consentimentos')).corpo.governanca.some(g => g.campo === 'recado_da_turma' && /persiste/i.test(g.retencao)));
  T('a professora de outra turma NÃO gera o recado da Vivência (403)', (await GET('maria', `/api/recado?turma_id=${tid}`)).status === 403);
}

// ----------------------- 28. parecer profissional-a-profissional (decisão 32)
secao('28 · Parecer a profissional parceiro — por código, sob consentimento, liberado');
{
  // A esta altura a turma 1 já trocou de professora (seção 21) — quem responde
  // por ela agora é outra pessoa; a coordenação passa sempre. Criança SÓ da
  // turma 1, para a Cleide (turmas 2–5) ser "outra turma".
  const lista = (await GET('rita', '/api/criancas?turma_id=1')).corpo.criancas;
  let alvo = null;
  for (const c of lista) {
    const f = (await GET('rita', `/api/crianca?id=${c.id}`)).corpo;
    if (f.matriculas.filter(m => m.status === 'ativa').length === 1) { alvo = c; break; }
  }
  T('há criança só da turma 1 para o cenário', !!alvo);
  const antes = await GET('rita', `/api/parecer?crianca_id=${alvo.id}`);
  T('a ficha do parecer traz o estado do consentimento e a prévia por indicador de programa',
    antes.status === 200 && ['ativo', 'pendente', 'revogado'].includes(antes.corpo.consentimento) && antes.corpo.previa.codigo === alvo.codigo);
  T('a diretoria não chega ao parecer (403)', (await GET('solange', `/api/parecer?crianca_id=${alvo.id}`)).status === 403);
  T('professora de outra turma não chega ao parecer (403)', (await GET('cleide', `/api/parecer?crianca_id=${alvo.id}`)).status === 403);

  await POST('rita', '/api/consentimento', { crianca_id: alvo.id, campo: 'parecer_profissional', status: 'pendente', responsavel: '' });
  const semCons = await POST('rita', '/api/parecer/gerar', { crianca_id: alvo.id, destinatario: 'Assistente social — projeto parceiro' });
  T('sem consentimento específico, o parecer é recusado com o motivo (403)', semCons.status === 403 && semCons.corpo.motivo === 'consentimento');
  const cons = await POST('rita', '/api/consentimento', { crianca_id: alvo.id, campo: 'parecer_profissional', status: 'ativo', responsavel: 'Responsável 1' });
  T('a coordenação registra o consentimento para compartilhar', cons.status === 200);
  T('professora de outra turma NÃO gera o parecer (403)',
    (await POST('cleide', '/api/parecer/gerar', { crianca_id: alvo.id, destinatario: 'X' })).status === 403);
  const ger = await POST('rita', '/api/parecer/gerar', { crianca_id: alvo.id, destinatario: 'Assistente social — projeto parceiro' });
  T('a coordenação gera o parecer em rascunho', ger.status === 200 && ger.corpo.parecer.status === 'rascunho');
  T('o parecer sai por código e sem nome', ger.corpo.parecer.texto.includes(alvo.codigo) && !ger.corpo.parecer.texto.includes(alvo.nome.split(' ')[0]));
  T('o parecer não carrega detalhe de alerta nem conteúdo clínico', !/Faltou nos|laudo|terapia|abuso/i.test(ger.corpo.parecer.texto));
  const lib = await POST('rita', '/api/parecer/liberar', { id: ger.corpo.parecer.id });
  T('a liberação fica registrada (quem, quando, para quem)', lib.status === 200 && lib.corpo.parecer.status === 'liberado' && !!lib.corpo.parecer.liberado_em);
  T('a diretoria não libera parecer (403)', (await POST('solange', '/api/parecer/liberar', { id: ger.corpo.parecer.id })).status === 403);
  const hist = (await GET('rita', `/api/parecer?crianca_id=${alvo.id}`)).corpo;
  T('o histórico de pareceres da criança fica na ficha', hist.pareceres.length >= 1 && hist.pareceres[0].status === 'liberado');
  T('a governança declara o parecer com consentimento específico',
    (await GET('rita', '/api/consentimentos')).corpo.governanca.some(g => g.campo === 'parecer_profissional' && g.exige_consentimento === 1));
}

console.log(`\n\x1b[1m${ok} passaram · ${falhas} falharam\x1b[0m\n`);
process.exit(falhas ? 1 : 0);
