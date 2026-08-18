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

  const clinico = await POST('maria', '/api/observacao', {
    crianca_id: alvo.crianca_id, concluir: true,
    itens: o.dimensoes.map(d => ({ dimensao_id: d.id, nivel: 3 })),
    nota_livre: 'Participou bem da roda. A mãe contou que ele foi diagnosticado com depressão. Terminou a tarefa sozinho.',
  });
  T('o filtro de perímetro barra o trecho clínico (409)', clinico.status === 409, `(${clinico.status})`);
  T('o filtro devolve o trecho e a categoria para a tela explicar',
    clinico.corpo?.filtro?.trechos?.[0]?.categoria?.includes('saúde mental'));
  T('o filtro preserva as marcações já feitas', clinico.corpo?.marcacoes_preservadas?.length === o.dimensoes.length);

  const limpo = await POST('maria', '/api/observacao', {
    crianca_id: alvo.crianca_id, concluir: true, forcar_limpeza: true,
    itens: o.dimensoes.map(d => ({ dimensao_id: d.id, nivel: 3 })),
    nota_livre: 'Participou bem da roda. A mãe contou que ele foi diagnosticado com depressão. Terminou a tarefa sozinho.',
  });
  T('com limpeza confirmada, a observação é concluída', limpo.status === 200 && limpo.corpo.status === 'concluida');
  T('exatamente 1 trecho foi descartado', limpo.corpo.trechos_descartados === 1);

  const gravado = (await GET('maria', `/api/observacao?crianca_id=${alvo.crianca_id}`)).corpo;
  T('o conteúdo clínico NÃO chegou ao banco',
    !/depress/i.test(gravado.observacao.nota_livre || ''), gravado.observacao.nota_livre);
  T('o restante da anotação foi preservado', /roda/i.test(gravado.observacao.nota_livre || ''));
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
    !!f.trajetoria && f.consentimentos.length === 5);   // 5 campos com a aspiração
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

console.log(`\n\x1b[1m${ok} passaram · ${falhas} falharam\x1b[0m\n`);
process.exit(falhas ? 1 : 0);
