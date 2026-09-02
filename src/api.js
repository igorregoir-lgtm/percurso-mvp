// Percurso — camada HTTP/JSON. Cada rota so traduz requisicao em chamada de dominio.
import { all, get } from './db.js';
import * as D from './domain.js';
import * as V from './voz.js';
import * as S from './scores.js';
import * as R from './relatorio.js';
import * as G from './ingestao.js';
import { statusIA } from './ai-client.js';
import { buscar as buscarRag, infoCorpus } from './rag/search.js';
import { anonimizarTexto } from './rag/anonimizar.js';
import * as C from './copilot.js';
import * as A from './assistente.js';
import * as PP from './passo/painel.js';
// O Passo responde pergunta agregada com número do banco; a ligação é feita
// aqui para evitar ciclo de import (relatorio.js → domain/scores/db).
A.ligarConsultaAgregada(R.consultar);
import { invalidarSinais, falhasDoEnvelope as envelopeFalhou } from './passo/sinais.js';
import * as PF from './passo/perfil.js';
import * as PO from './passo/orquestrador.js';
import * as SROI from './sroi/calculator.js';
import * as PL from './planilha.js';
import * as REL from './relato.js';
import * as REC from './recado.js';
import { conversar, AI_ENABLED } from './ai-client.js';
const { nomesParaAnonimizar } = C;

const RESSALVA_LITERAL = 'A leitura é de associação: fatores externos não foram isolados.';

/** Explicação determinística das premissas — o fallback que sempre existe. */
function explicacaoDeterministica(r) {
  const linhas = [
    `Este é um cenário exploratório de valor social potencial: a faixa vai de R$ ${r.faixa_sroi.minimo.toFixed(2).replace('.', ',')} a R$ ${r.faixa_sroi.maximo.toFixed(2).replace('.', ',')} por R$ 1 investido, conforme o conjunto de premissas de cada cenário.`,
    ...r.proxies_usadas.map(p =>
      `Premissa "${p.nome}": R$ ${p.valor.toLocaleString('pt-BR')} (${p.unidade}, ano-base ${p.ano_base}, fonte ${p.fonte}). ${p.ressalva}`),
    'Os três cenários variam efeito incremental, deadweight, atribuição, deslocamento, drop-off e desconto — cada valor está exposto no relatório e pode ser revisto.',
    RESSALVA_LITERAL,
  ];
  return linhas.join('\n\n');
}

async function explicarSROI(resultado) {
  const fallback = () => ({
    texto: explicacaoDeterministica(resultado),
    origem: 'deterministico',
    rotulo: null,
  });
  if (!AI_ENABLED) return fallback();
  try {
    // Mesma fila do copilot: o llama-server tem 2 slots; pedido por fora
    // degradaria as reflexões em voo (revisão de 25/08, CORRECAO-10).
    const { texto } = await C.comVaga(() => conversar({
      papel: 'reflexivo',
      maxTokens: 700,
      temperatura: 0.4,
      mensagens: [
        {
          role: 'system',
          content: 'Você explica premissas de um cálculo exploratório de retorno social (SROI) para gestores de uma organização social, em português do Brasil. REGRAS: não invente número, fonte nem premissa — use SOMENTE o que vier no contexto; nunca afirme causalidade (proibido "causou", "gerou", "provou", "comprova", "garante", "contribuiu para"); trate tudo como associação e potencial; não escolha coeficiente nem recomende valor; termine com a frase literal: "A leitura é de associação: fatores externos não foram isolados."',
        },
        {
          role: 'user',
          content: `Explique em até 4 parágrafos as premissas e limitações deste cenário exploratório:\n${JSON.stringify({
            faixa_sroi: resultado.faixa_sroi,
            entradas: resultado.entradas,
            proxies: resultado.proxies_usadas.map(p => ({ nome: p.nome, valor: p.valor, unidade: p.unidade, ano_base: p.ano_base, fonte: p.fonte, ressalva: p.ressalva })),
            cenarios: resultado.cenarios.map(c => ({ cenario: c.cenario, parametros: c.parametros, sroi: c.sroi })),
            ressalvas: resultado.ressalvas,
          })}`,
        },
      ],
    }));
    let corpo = (texto || '').trim();
    if (!corpo) return fallback();
    if (!/fatores externos n[aã]o foram isolados/i.test(corpo)) corpo += `\n\n${RESSALVA_LITERAL}`;
    const revisor = D.revisarSobreAlegacao(corpo);
    if (revisor.status !== 'aprovado') return { ...fallback(), revisor_barrou: revisor.notas };
    return { texto: corpo, origem: 'modelo', rotulo: 'texto gerado por modelo local — não revisado por humano; fora do relatório exportado por padrão', revisor_status: 'aprovado' };
  } catch {
    return fallback();
  }
}

const COOKIE = 'percurso_uid';

export function usuarioDa(req) {
  const raw = req.headers.cookie || '';
  const m = raw.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  const id = m ? Number(m.split('=')[1]) : null;
  if (!id) return null;
  // Quem foi para o ARQUIVO não tem sessão, mesmo com o cookie na mão: o
  // cookie não é assinado (dívida nº 1) e vale 24 h, então arquivar alguém
  // precisa valer AGORA. Este é o ponto único onde isso é verdade para todas
  // as rotas — pôr a checagem só no login deixaria a sessão aberta em pé.
  return get(`SELECT * FROM educador WHERE id = ? AND arquivado_em IS NULL`, id) ?? null;
}

function exigeUsuario(req) {
  const u = usuarioDa(req);
  if (!u) throw D.erro(401, 'Sessão expirada. Escolha de novo quem está usando o Percurso.');
  return u;
}
function exigeCoordenacao(req) {
  const u = exigeUsuario(req);
  if (u.papel !== 'coordenacao') throw D.erro(403, 'Esta tela é da coordenação.');
  return u;
}
function exigeDiretoria(req) {
  const u = exigeUsuario(req);
  if (u.papel !== 'diretoria') throw D.erro(403, 'Esta tela é da diretoria.');
  return u;
}
// Cobertura do registro e consulta agregada sao de coordenacao E diretoria.
function exigeGestao(req) {
  const u = exigeUsuario(req);
  if (!['coordenacao', 'diretoria'].includes(u.papel))
    throw D.erro(403, 'Esta tela é da coordenação e da diretoria.');
  return u;
}
// A diretoria gera relatorio agregado — nao abre ficha de crianca. E' a regra
// zero do 08-RELATORIO-DOADOR levada para dentro: quem presta contas nao
// precisa de acesso individual, entao nao tem.
function semAcessoIndividual(u) {
  if (u.papel === 'diretoria')
    throw D.erro(403, 'A diretoria trabalha sobre a camada agregada. Registro individual de criança não abre neste perfil.');
  return u;
}
function exigeEducadorOuCoordenacao(req) {
  return semAcessoIndividual(exigeUsuario(req));
}

/**
 * Escopo de turma. A governanca declara acesso "educador DA CRIANCA + coordenacao";
 * papel sozinho nao cumpre o "da crianca". Coordenacao passa sempre; a diretoria
 * nunca (ela nao abre nada individual); educadora so na propria turma.
 *
 * Desde 25/08/2026 (item 1.2 do horizonte 1, decisao 22) o escopo cobre TAMBEM
 * as rotas herdadas de leitura individual (ficha, lista, observacao, alertas) —
 * via exigeAcessoCrianca e filtros por educador. Limitacao declarada: a
 * educadora substituta nao tem representacao no modelo; o caminho dela e' a
 * coordenacao.
 */
/** A turma ativa da criança — usada para dar escopo a rota que recebe crianca_id. */
function turmaDaCrianca(criancaId) {
  return get(`SELECT turma_id FROM matricula
                WHERE crianca_id = ? AND status='ativa' AND turma_id IS NOT NULL LIMIT 1`, criancaId)?.turma_id;
}

function exigeAcessoTurma(req, turmaId) {
  const u = semAcessoIndividual(exigeUsuario(req));
  if (u.papel === 'coordenacao') return u;
  const t = get(`SELECT * FROM turma WHERE id = ?`, turmaId);
  if (!t) throw D.erro(404, 'Turma não encontrada.');
  if (t.educador_id !== u.id)
    throw D.erro(403, 'Esta turma é de outra educadora. O acesso é do educador da criança e da coordenação.');
  return u;
}

/** Escopo por criança (A4): coordenação passa; educadora só se a criança tem
 *  matrícula ativa em turma DELA. Usado nas rotas de leitura individual. */
function exigeAcessoCrianca(req, criancaId) {
  const u = semAcessoIndividual(exigeUsuario(req));
  // Criança que não existe é 404 para qualquer papel — o 403 de escopo só faz
  // sentido sobre uma criança real (e não vira oráculo de existência: a lista
  // da educadora já é restrita às turmas dela).
  if (!get(`SELECT 1 x FROM crianca WHERE id = ?`, criancaId))
    throw D.erro(404, 'Criança não encontrada.');
  if (u.papel === 'coordenacao') return u;
  const vinculo = get(
    `SELECT 1 x FROM matricula m JOIN turma t ON t.id = m.turma_id
      WHERE m.crianca_id = ? AND m.status='ativa' AND t.educador_id = ?`, criancaId, u.id);
  if (!vinculo)
    throw D.erro(403, 'Esta criança é de outra turma. O acesso é do educador da criança e da coordenação.');
  return u;
}
// Escopo de leitura individual: professora e profissional (psicóloga) só nas
// próprias turmas; coordenação sem filtro; diretoria nunca chega aqui.
const escopoDe = (u) => (u.papel === 'educador' || u.papel === 'profissional') ? u.id : null;
const num = (v, campo) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw D.erro(422, `Parâmetro inválido: ${campo}.`);
  return n;
};
const cicloCorrente = () =>
  D.cicloAberto() ?? all(`SELECT * FROM ciclo ORDER BY ano DESC, ordem DESC LIMIT 1`)[0];

export const rotas = {
  'GET /api/sessao': (req) => ({
    usuario: usuarioDa(req),
    usuarios: all(
      `SELECT id, nome, apelido, papel FROM educador WHERE arquivado_em IS NULL ORDER BY id`),
  }),

  'POST /api/sessao': (req, body) => {
    const u = get(`SELECT * FROM educador WHERE id = ?`, num(body.educador_id, 'educador_id'));
    if (!u) throw D.erro(404, 'Usuário não encontrado.');
    if (u.arquivado_em)
      throw D.erro(403, `${u.nome} está no arquivo desde ${D.dataBR(u.arquivado_em)} e não entra no Percurso. A coordenação pode trazer de volta.`);
    return { usuario: u, _cookie: `${COOKIE}=${u.id}; Path=/; Max-Age=86400; SameSite=Lax` };
  },

  'POST /api/sair': () => ({ ok: true, _cookie: `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax` }),

  // ---- Educadora ---------------------------------------------------------
  'GET /api/hoje': (req) => {
    const u = exigeUsuario(req);
    const turmas = all(
      `SELECT t.*, p.nome AS programa FROM turma t JOIN programa p ON p.id = t.programa_id
        WHERE t.educador_id = ? ORDER BY t.id`, u.id);
    const turma = turmas[0] ?? null;
    const ciclo = D.cicloAberto();
    return {
      usuario: u, hoje: D.hoje(), turmas, turma,
      dia_letivo: turma ? D.diaLetivo(turma.turno, D.hoje()) : false,
      retomada: D.estadoDeRetomada(u.id),
      chamada: turma ? D.chamada(turma.id, D.hoje()) : null,
      chamadas_abertas: turma ? D.chamadasEmAberto(turma.id) : [],
      // Turma fora da rubrica (Vivência, decisão 31) não tem agenda de ciclo:
      // oferecer "faltam N observações" à psicóloga seria pedir o que o
      // produto decidiu não pedir.
      na_rubrica: turma ? D.turmaNaRubrica(turma.id) : false,
      agenda: turma && ciclo && D.turmaNaRubrica(turma.id) ? D.agendaDoCiclo(turma.id, ciclo.id) : null,
      alertas: turma
        ? D.alertas().filter(a => get(
            `SELECT 1 x FROM matricula WHERE crianca_id = ? AND turma_id = ? AND status='ativa'`,
            a.crianca_id, turma.id))
        : [],
      // "Para esta semana": o sistema deixa de cobrar e passa a devolver.
      pauta: turma ? S.pautaDaSemana(turma.id) : null,
      folha: turma ? V.folhaDaTurma(turma.id, D.dataDaFolha(turma.id)) : null,
      data_folha: turma ? D.dataDaFolha(turma.id) : null,
      // E6: a devolucao do ultimo encontro com folha, para a tela de abertura.
      devolucao: (() => {
        if (!turma) return null;
        const enc = D.encontroDe(turma.id, D.dataDaFolha(turma.id));
        return enc && V.folhaDe(enc.id) ? V.devolucaoDoEncontro(enc.id) : null;
      })(),
    };
  },

  'GET /api/chamada': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return D.chamada(turmaId, q.get('data') || D.hoje());
  },

  'POST /api/chamada': (req, body) => {
    if (!Array.isArray(body.marcacoes)) throw D.erro(422, 'Envie a lista de marcações.');
    const turmaId = num(body.turma_id, 'turma_id');
    const u = exigeAcessoTurma(req, turmaId);
    const data = body.data || D.hoje();
    const r = D.salvarChamada(turmaId, data, u.id, body.marcacoes, body.duracao_segundos);
    return { ok: true, ...r, chamada: D.chamada(turmaId, data), abertas: D.chamadasEmAberto(turmaId) };
  },

  'GET /api/chamadas-abertas': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return { datas: D.chamadasEmAberto(turmaId) };
  },

  'GET /api/rubrica': (req) => { exigeUsuario(req); return { dimensoes: D.rubrica(), params: D.PARAMS }; },

  // ---- A planilha socioemocional do Instituto (decisão 34) ----------------
  // Coordenação e diretoria leem o resumo (agregado, com supressão); só a
  // coordenação exporta as linhas por criança — e elas saem por CÓDIGO.
  'GET /api/planilha/resumo': (req, _b, q) => {
    exigeGestao(req);
    const opcoes = {
      cicloInicialId: q.get('inicial') ? num(q.get('inicial'), 'inicial') : null,
      cicloFinalId: q.get('final') ? num(q.get('final'), 'final') : null,
      programaId: q.get('programa_id') ? num(q.get('programa_id'), 'programa_id') : null,
    };
    return { ...PL.resumoPlanilha(opcoes), ciclos: PL.ciclosDisponiveis() };
  },
  'GET /api/exportar/planilha': (req, _b, q) => {
    exigeCoordenacao(req);
    const opcoes = {
      cicloInicialId: q.get('inicial') ? num(q.get('inicial'), 'inicial') : null,
      cicloFinalId: q.get('final') ? num(q.get('final'), 'final') : null,
      programaId: q.get('programa_id') ? num(q.get('programa_id'), 'programa_id') : null,
    };
    const csv = PL.csvPlanilha(opcoes);
    return { _csv: csv, _nome: `percurso-planilha-socioemocional-${D.hoje()}.csv` };
  },

  'GET /api/ciclo/agenda': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    if (!D.turmaNaRubrica(turmaId))
      throw D.erro(422, 'Esta turma não entra na rubrica por ciclo: na Vivência o registro é de turma (presença, procedimento e check-in de grupo), nunca observação individual — decisão 31.');
    const ciclo = D.cicloAberto();
    if (!ciclo) throw D.erro(404, 'Não há ciclo de observação aberto.');
    return D.agendaDoCiclo(turmaId, ciclo.id);
  },

  'GET /api/observacao': (req, _b, q) => {
    exigeEducadorOuCoordenacao(req);
    const ciclo = D.cicloAberto();
    if (!ciclo) throw D.erro(404, 'Não há ciclo de observação aberto.');
    const criancaId = num(q.get('crianca_id'), 'crianca_id');
    const c = get(`SELECT id, codigo, nome FROM crianca WHERE id = ?`, criancaId);
    if (!c) throw D.erro(404, 'Criança não encontrada.');
    exigeAcessoCrianca(req, criancaId);
    return {
      ciclo, crianca: c,
      elegibilidade: D.elegibilidade(criancaId, ciclo.id),
      observacao: D.observacaoDe(ciclo.id, criancaId),
      campo_livre: D.consentimentoDe(criancaId, 'campo_livre'),
      dimensoes: D.rubrica(),
      trajetoria: D.trajetoriaCrianca(criancaId),
    };
  },

  'POST /api/observacao': (req, body) => {
    const ciclo = D.cicloAberto();
    if (!ciclo) throw D.erro(404, 'Não há ciclo de observação aberto.');
    const criancaId = num(body.crianca_id, 'crianca_id');
    // Escrever o registro individual da criança é o ato mais sensível do sistema:
    // exige ser o educador DA turma dela, ou a coordenação. A diretoria não passa.
    const turmaId = turmaDaCrianca(criancaId);
    if (!turmaId) throw D.erro(404, 'Criança sem matrícula ativa em turma.');
    const u = exigeAcessoTurma(req, turmaId);
    const r = D.salvarObservacao({
      cicloId: ciclo.id, criancaId, educadorId: u.id,
      itens: body.itens, notaLivre: body.nota_livre, concluir: !!body.concluir,
    });
    return { ok: true, ...r, agenda: D.agendaDoCiclo(turmaId, ciclo.id) };
  },

  'GET /api/turma/painel': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    const turma = get(
      `SELECT t.*, p.nome AS programa FROM turma t JOIN programa p ON p.id=t.programa_id WHERE t.id = ?`, turmaId);
    if (!turma) throw D.erro(404, 'Turma não encontrada.');
    const agg = D.agregadoPorCiclo({ turmaId });
    const ciclo = D.cicloAberto();
    return {
      turma, agregado: agg, leitura: D.leituraDoCiclo(agg),
      agenda: ciclo ? D.agendaDoCiclo(turmaId, ciclo.id) : null,
      plano: D.planoDaTurma(turmaId),
      tempo: D.tempoDeRegistro({ turmaId }),
    };
  },

  'GET /api/turma/plano': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return D.planoDaTurma(turmaId);
  },

  // ---- Criancas ----------------------------------------------------------
  // Escopo de turma nas rotas de leitura individual (A4, fecho do item 1.2 do
  // horizonte 1): a governança declara acesso "educador DA CRIANÇA + coordenação".
  // A educadora substituta não tem representação no modelo — limitação declarada
  // em DECISOES-TECNICAS.md; o caminho dela é a coordenação.
  'GET /api/criancas': (req, _b, q) => {
    const u = exigeEducadorOuCoordenacao(req);
    return D.listarCriancas({
      q: q.get('q') || '',
      turmaId: q.get('turma_id') ? Number(q.get('turma_id')) : null,
      programaId: q.get('programa_id') ? Number(q.get('programa_id')) : null,
      educadorId: escopoDe(u),
    });
  },

  'GET /api/crianca': (req, _b, q) => {
    const id = num(q.get('id'), 'id');
    exigeAcessoCrianca(req, id);
    return D.fichaCrianca(id);
  },

  'GET /api/alertas': (req) => {
    const u = exigeEducadorOuCoordenacao(req);
    return {
      alertas: D.alertas(null, escopoDe(u)),
      faltas_para_lista: D.PARAMS.AUSENCIAS_ALERTA,
    };
  },

  'POST /api/alerta': (req, body) => {
    const id = num(body.id, 'id');
    const a = get(`SELECT crianca_id FROM alerta WHERE id = ?`, id);
    if (!a) throw D.erro(404, 'Alerta não encontrado.');
    exigeAcessoCrianca(req, a.crianca_id);
    return D.atualizarAlerta(id, body.status, body.tratativa);
  },

  // ---- Coordenacao -------------------------------------------------------
  'GET /api/painel': (req) => {
    exigeCoordenacao(req);
    return {
      ...D.painelCoordenacao(),
      reconciliacao: D.reconciliacao(),
      tempo: D.tempoDeRegistro(),
      // Bloco "Cobertura do registro": mostra a Rita onde o dado esta furado
      // antes do fechamento. Mede o sistema, nunca a professora.
      cobertura: S.coberturaRegistro({}),
      evasao: S.riscoEvasao({}),
      exposicao: S.exposicao({}),
      // Terceira linha do bloco "Cobertura do registro" no board v2: quantos
      // olhares (observações concluídas) existem no ciclo corrente.
      olhares_registrados: get(
        `SELECT COUNT(*) AS n FROM observacao WHERE status = 'concluida' AND ciclo_id = ?`,
        cicloCorrente().id).n,
      // Borda 2 da doutrina de IA, em versao deterministica: consistencia
      // entre observadores como leitura de calibracao — nunca ranking.
      calibracao: D.calibracaoEntreObservadores(cicloCorrente().id),
    };
  },
  'GET /api/safras': (req) => { exigeCoordenacao(req); return D.safras(); },
  'GET /api/consentimentos': (req) => { exigeCoordenacao(req); return D.painelConsentimentos(); },

  'POST /api/consentimento': (req, body) => {
    exigeCoordenacao(req);
    return D.registrarConsentimento(
      num(body.crianca_id, 'crianca_id'), body.campo, body.status, body.responsavel);
  },

  'GET /api/sintese': (req, _b, q) => {
    exigeCoordenacao(req);
    const ciclo = cicloCorrente();
    const programaId = q.get('programa_id') ? Number(q.get('programa_id')) : null;
    return {
      ciclo, programa_id: programaId,
      programas: all(`SELECT id, nome FROM programa WHERE no_escopo = 1 ORDER BY id`),
      sintese: D.sinteseDe(ciclo.id, programaId),
      previa: D.numerosDoCiclo(ciclo.id, programaId),
    };
  },

  'POST /api/sintese/gerar': (req, body) => {
    exigeCoordenacao(req);
    return D.gerarSintese(cicloCorrente().id, body.programa_id ? Number(body.programa_id) : null);
  },

  'POST /api/sintese/aprovar': (req, body) => {
    const u = exigeCoordenacao(req);
    return D.aprovarSintese(cicloCorrente().id, body.programa_id ? Number(body.programa_id) : null, u.id);
  },

  'GET /api/inventario': (req) => { exigeUsuario(req); return D.inventario(); },

  // ======================================================================
  // Camada de IA local (Fase 0+) — opt-in por AI_ENABLED; padrao DESLIGADA.
  // ======================================================================
  'GET /api/ia/status': async (req) => { exigeUsuario(req); return statusIA(); },

  // RAG (Fase 1) — busca lexical no corpus aprovado. Papeis internos
  // (educador/coordenacao). A query passa pela pseudonimizacao ANTES da busca;
  // nomes de crianca nunca alcancam o indice. Politica de log: NENHUMA query
  // e' logada (nem anonimizada) — privacidade por ausencia, nao por confianca.
  'GET /api/rag/search': (req, _b, q) => {
    const u = exigeEducadorOuCoordenacao(req);
    const nomes = nomesParaAnonimizar(u);
    const { texto: consulta, substituicoes } = anonimizarTexto(q.get('q') || '', nomes);
    const resultados = buscarRag({
      q: consulta,
      k: Number.isFinite(Number(q.get('k'))) && q.get('k') !== '' && q.get('k') !== null
        ? Math.trunc(Number(q.get('k'))) : 5,
      source_id: q.get('source_id') || null,
      tema: q.get('tema') || null,
      faixa_etaria: q.get('faixa_etaria') || null,
    }).map(({ conteudo, ...resto }) => resto);
    return {
      consulta_executada: consulta,
      nomes_substituidos: substituicoes,
      resultados,
      corpus: infoCorpus(),
    };
  },

  // Copilot (Fase 2, Modo B) — sala de reflexao pedagogica. Educador e
  // coordenacao; a DIRETORIA nao entra (decisao 16: quem presta contas nao
  // conversa sobre crianca — o canal dela e' o /api/sroi/explicar, fechado).
  'POST /api/copilot/chat': (req, body) =>
    C.chat(exigeEducadorOuCoordenacao(req), {
      mode: body.mode, message: body.message, session_id: body.session_id,
    }),

  'DELETE /api/copilot/sessao': (req, body) =>
    C.apagarSessao(exigeEducadorOuCoordenacao(req), String(body.session_id || '')),

  // Doacao explicita de interacao (funil licito do dataset LoRA): pre-via
  // exata, validacao de anonimizacao ANTES de gravar, revogavel pelo id.
  'POST /api/copilot/doacao/previa': (req, body) =>
    C.preverDoacao(exigeEducadorOuCoordenacao(req), String(body.session_id || ''), Number(body.indice ?? -1)),
  'POST /api/copilot/doar': (req, body) =>
    C.doarInteracao(exigeEducadorOuCoordenacao(req), String(body.session_id || ''), Number(body.indice ?? -1)),
  'DELETE /api/copilot/doacao': (req, body) => {
    const u = exigeEducadorOuCoordenacao(req);
    return C.revogarDoacao(u, String(body.id || ''));
  },

  // ======================================================================
  // Passo — assistente-parceiro de navegacao (todos os papeis; responde SO
  // sobre o produto — plano auditado em docs/revisao/07-PLANO-ASSISTENTE.md).
  // Sempre responde: com modelo (AI_ASSISTENTE) ou pelo guia deterministico.
  // ======================================================================
  'POST /api/assistente': (req, body) =>
    A.assistente(exigeUsuario(req), {
      message: body.message, session_id: body.session_id, tela: String(body.tela || ''),
    }),

  'GET /api/assistente/chips': (req, _b, q) =>
    A.chipsDe(exigeUsuario(req), String(q.get('tela') || '')),

  // O painel proativo: sugestões ancoradas no estado REAL da pessoa, por papel
  // e por tela. DETERMINÍSTICO PURO — nunca chama o modelo, nunca escreve em
  // banco nenhum. O refinamento por modelo é rota separada e opcional.
  'GET /api/passo/painel': (req, _b, q) => {
    const u = exigeUsuario(req);
    return PP.painelDoPasso(u, A.telaSegura(String(q.get('tela') || '')));
  },

  // O refinamento pelo Qwen — ASSÍNCRONO e opcional. O painel determinístico
  // já está pintado quando isto roda; falha, timeout, fila ocupada ou modelo
  // desligado devolvem `refinado:false` e NADA muda na tela. Nunca 5xx.
  'POST /api/passo/refinar': async (req, body) => {
    const u = exigeUsuario(req);
    if (!A.AI_ASSISTENTE) return { refinado: false, motivo: 'desligado' };
    const tela = A.telaSegura(String(body.tela || ''));
    const painel = PP.painelDoPasso(u, tela);
    const alvos = painel.sugestoes.filter(s => !s.id.startsWith('guia:'));
    if (alvos.length < 2) return { refinado: false, motivo: 'nada_a_fazer' };
    const porId = new Map(alvos.map(s => [s.id, s]));
    const nomesDeTurma = all(`SELECT nome FROM turma`).map(t => t.nome);
    const r = await PO.refinarPainel(
      alvos.map(s => ({
        id: s.id, tipo: s.tipo, rotulo: s.rotulo, nucleo: s.nucleo,
        // `imune` e `nomesProibidos` vinham vazios: a imunidade doutrinária
        // (edu.retomada) e o veto de nome de turma eram portões inertes.
        imune: !!s.imune, nomesProibidos: nomesDeTurma,
      })),
      {
        roster: nomesParaAnonimizar(u),
        anonimizar: anonimizarTexto,
        semCobranca: PP.semCobranca,
        // O PORTÃO 4, agora de verdade. Antes isto era `(ordem) => ordem` — a
        // identidade — enquanto o comentário e o corpo de /api/passo/qualidade
        // afirmavam que "o piso de núcleo roda DEPOIS do modelo". A doutrina
        // publicada era mais forte que o código; o modelo definia a vaga 1.
        // Sort ESTÁVEL por núcleo: o conjunto não muda, só garante que nenhum
        // sinal que o instituto precisa ver seja rebaixado pelo modelo.
        recompor: (ordem) => [
          ...ordem.filter(id => porId.get(id)?.nucleo),
          ...ordem.filter(id => !porId.get(id)?.nucleo),
        ],
      });
    if (r.origem !== 'modelo') return { refinado: false, motivo: PO.estatisticas().ultimoErro ?? 'falhou' };
    return {
      refinado: true, origem: 'modelo', hash: painel.hash,
      ordem: r.ordem,
      rotulos: Object.entries(r.rotulos).map(([id, rotulo]) => ({ id, rotulo })),
    };
  },

  'GET /api/passo/qualidade': (req) => {
    exigeCoordenacao(req);
    return {
      orquestrador: PO.estatisticas(),
      envelope_falhou: envelopeFalhou(),
      doutrina: 'O modelo ORDENA dentro de um conjunto que o determinístico já fechou, e pode encurtar rótulo. '
        + 'Ele nunca escreve número (o rótulo é livre de dígito por construção), nunca escolhe ação, nunca '
        + 'inventa nem some com sugestão. O teto de pendência e os três slots são fixados ANTES dele; o piso '
        + 'de núcleo é reaplicado DEPOIS — nenhum sinal que o instituto precisa ver é rebaixado pelo modelo.',
    };
  },

  // Telemetria do Passo — só o que a pessoa faz COM ELE. No-op silencioso
  // enquanto o aprendizado está desligado (que é o padrão).
  'POST /api/passo/uso': (req, body) => {
    const u = exigeUsuario(req);
    const id = String(body.id || '');
    const evento = String(body.evento || '');
    if (evento === 'dispensada') {
      const s = PP.CATALOGO.find(c => c.id === id);
      const r = PF.silenciar(u.id, id, { nucleo: !!s?.nucleo });
      PF.registrar(u.id, 'sugestao', id, 'dispensada');
      if (s) PF.registrar(u.id, 'tipo', s.tipo, 'dispensada');
      return { ok: true, silenciada_ate: r.ate, nucleo: !!s?.nucleo };
    }
    const s = PP.CATALOGO.find(c => c.id === id);
    const out = PF.registrar(u.id, 'sugestao', id, evento);
    if (s) PF.registrar(u.id, 'tipo', s.tipo, evento);
    if (body.tela) PF.registrar(u.id, 'tela', A.telaSegura(String(body.tela)), evento);
    return out;
  },

  // A pessoa só lê e apaga a PRÓPRIA memória. Não existe rota para ver a de
  // outra pessoa — e essa ausência é a decisão, não um esquecimento.
  'GET /api/passo/memoria': (req) => PF.memoriaDe(exigeUsuario(req).id),
  'POST /api/passo/memoria': (req, body) => PF.salvarPreferencia(exigeUsuario(req).id, {
    aprender: body.aprender, resumo_do_dia: body.resumo_do_dia,
    prefere_tipo: body.prefere_tipo, convidado: body.convidado,
  }),
  'DELETE /api/passo/memoria': (req) => PF.apagarMemoria(exigeUsuario(req).id),

  'DELETE /api/assistente/sessao': (req, body) =>
    A.apagarSessaoAssistente(exigeUsuario(req), String(body.session_id || '')),

  // ======================================================================
  // SROI exploratorio (Fase 3) — motor DETERMINISTICO, zero LLM no numero.
  // Coordenacao e diretoria (camada agregada; nada individual passa aqui).
  // ======================================================================
  'GET /api/sroi/premissas': (req) => { exigeGestao(req); return SROI.premissas(); },

  'POST /api/sroi/calcular': (req, body) => {
    exigeGestao(req);
    return SROI.calcular({
      criancas: body.criancas,
      investimento_anual: body.investimento_anual,
      proxy_ids: body.proxy_ids,
      horizonte_anos: body.horizonte_anos,
      cenarios: body.cenarios ?? null,
    });
  },

  // Papel do SLM no SROI (§3.5): EXPLICAR premissas e limites — nunca escolher
  // coeficiente nem gerar numero. Endpoint proprio, prompt fechado, SEM sessao
  // de chat e SEM RAG de casos — e' o canal da diretoria (que continua 403 no
  // copilot/chat, decisao 16). Toda saida passa pelo revisor de sobre-alegacao;
  // texto reprovado nao aparece — entra a explicacao deterministica.
  'POST /api/sroi/explicar': async (req, body) => {
    exigeGestao(req);
    const resultado = SROI.calcular({
      criancas: body.criancas,
      investimento_anual: body.investimento_anual,
      proxy_ids: body.proxy_ids,
      horizonte_anos: body.horizonte_anos,
    });
    return explicarSROI(resultado);
  },

  // ======================================================================
  // v2 — folha do dia, voz, pauta, scores, relatorio, consulta e ingestao.
  // ======================================================================

  'GET /api/catalogos': (req) => { exigeUsuario(req); return V.catalogos(); },

  'GET /api/turmas': (req) => {
    exigeUsuario(req);
    return { turmas: all(
      `SELECT t.id, t.nome, t.turno, p.nome AS programa, e.nome AS educador
         FROM turma t JOIN programa p ON p.id = t.programa_id
         LEFT JOIN educador e ON e.id = t.educador_id ORDER BY t.id`) };
  },

  'GET /api/folha': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    const data = q.get('data') || D.dataDaFolha(turmaId);
    const enc = D.encontroDe(turmaId, data);
    return {
      turma: get(`SELECT t.*, p.nome AS programa FROM turma t JOIN programa p ON p.id=t.programa_id WHERE t.id=?`, turmaId),
      data, encontro: enc ?? null,
      chamada: D.chamada(turmaId, data),
      folha: enc ? V.folhaDe(enc.id) : null,
      catalogos: V.catalogos(),
      // Decisao 31: na Vivencia a folha e' o registro de procedimento — a tela
      // mostra procedimento/objetivo e exige o check-in.
      vivencia: !D.turmaNaRubrica(turmaId),
      // E6: a devolucao por encontro, quando ja' ha' folha.
      devolucao: enc && V.folhaDe(enc.id) ? V.devolucaoDoEncontro(enc.id) : null,
    };
  },

  // F3+F4 — a fala vira campos. NADA E' GRAVADO AQUI.
  // O audio nunca chega ao servidor: a transcricao acontece no navegador e o
  // arquivo e' descartado la. A transcricao entra, e' usada em memoria e sai
  // desta funcao sem tocar disco nem log.
  'POST /api/voz/extrair': async (req, body) => {
    const turmaId = num(body.turma_id, 'turma_id');
    exigeAcessoTurma(req, turmaId);
    const texto = String(body.transcricao ?? '');
    if (texto.length > 4000) throw D.erro(422, 'Transcrição longa demais para uma fala de 40 segundos.');
    const nomes = D.criancasDaTurma(turmaId).map(c => c.nome);
    const vivencia = !D.turmaNaRubrica(turmaId);
    // Modo A com modelo e' OPT-IN (AI_EXTRATOR=1) e cai para o extrator lexical
    // em qualquer falha — o contrato da decisao 13 continua o mesmo: saida
    // valida contra o schema fechado, confirmacao humana, nada gravado aqui.
    const { extracao, perimetro, invalido, origem } = C.AI_EXTRATOR
      ? await C.extrairComModelo(texto, nomes, C.nomesParaAnonimizar(exigeUsuario(req)))
      : { ...V.extrairDaFala(texto, nomes, { vivencia }), origem: 'regras' };
    // E4 (campo): "voce fala o nome, ele apaga". A contagem de nomes que a
    // fala continha vai para a tela — o nome em si nao volta e nao e' gravado.
    const { substituicoes } = anonimizarTexto(texto, nomes);
    return {
      extracao,
      origem: origem ?? 'regras',
      vivencia,
      nomes_substituidos: substituicoes,
      procedimento_neutralizado: perimetro.neutralizados ?? 0,
      // Fato de ter havido exclusao + a categoria, para a tela devolver o
      // encaminhamento humano. O trecho volta so para a pessoa que falou ver o
      // que nao entra; nao e' persistido em lugar nenhum.
      excluido: perimetro.bloqueado,
      trechos: perimetro.trechos,
      baixa_confianca: extracao.confianca < D.PARAMS.CONFIANCA_MINIMA,
      schema_invalido: invalido ?? null,
      gravado: false,
      aviso: 'Nada foi gravado. A folha só existe depois de "Confirmar e guardar".',
    };
  },

  // F6 — confirmacao humana. A PRIMEIRA gravacao do fluxo de voz.
  'POST /api/folha': (req, body) => {
    const turmaId = num(body.turma_id, 'turma_id');
    const u = exigeAcessoTurma(req, turmaId);
    const data = body.data || D.dataDaFolha(turmaId);
    const enc = D.encontroDe(turmaId, data);
    if (!enc) throw D.erro(422, 'Faça a chamada deste dia antes de contar como foi.');
    const folha = V.salvarFolha({
      encontroId: enc.id, educadorId: u.id, campos: body.campos, origem: body.origem || 'manual',
      sugestao: body.sugestao ?? null, fechar: !!body.fechar,
    });
    return { ok: true, folha, pauta: S.pautaDaSemana(turmaId), devolucao: V.devolucaoDoEncontro(enc.id) };
  },

  // ---- Regua de presenca (decisao 33) -------------------------------------
  // Quem responde pela turma e a coordenacao veem a crianca com a faixa; a
  // diretoria so' o total por turma (contagens).
  'GET /api/turma/presenca': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return D.reguaDaTurma(turmaId, { desde: q.get('desde') || null });
  },
  'GET /api/regua': (req, _b, q) => {
    exigeGestao(req);
    return D.reguaDoInstituto({ desde: q.get('desde') || null });
  },

  // ---- Recado da turma para os responsaveis (decisao 33) ------------------
  'GET /api/recado': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return REC.recadoDaTurma(turmaId, q.get('data') || D.dataDaFolha(turmaId));
  },

  // ---- Relato do procedimento (decisao 31) --------------------------------
  'GET /api/relato': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    const data = q.get('data') || D.dataDaFolha(turmaId);
    return { ...REL.relatoDoProcedimento(turmaId, data), historico: REL.relatosDaTurma(turmaId) };
  },
  'POST /api/relato/liberar': (req, body) => {
    const turmaId = num(body.turma_id, 'turma_id');
    const u = exigeAcessoTurma(req, turmaId);
    const data = body.data || D.dataDaFolha(turmaId);
    return { ok: true, ...REL.liberarRelato(turmaId, data, u.id) };
  },

  'POST /api/folha/reabrir': (req, body) => {
    const u = exigeCoordenacao(req);
    const turmaId = num(body.turma_id, 'turma_id');
    const enc = D.encontroDe(turmaId, body.data || D.dataDaFolha(turmaId));
    if (!enc) throw D.erro(404, 'Encontro não encontrado.');
    return { ok: true, folha: V.reabrirFolha(enc.id, u.id) };
  },

  // F11 — pauta de segunda.
  'GET /api/pauta': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return S.pautaDaSemana(turmaId);
  },

  'POST /api/pauta/decidir': (req, body) => {
    const turmaId = num(body.turma_id, 'turma_id');
    const u = exigeAcessoTurma(req, turmaId);
    const p = S.decidirPauta(turmaId, u.id, body.decisao);
    return { ok: true, pauta: p, descarte: S.taxaDeDescarte({ turmaId }) };
  },

  // Tela `turma`: o rotulo descreve o REGISTRO, nunca a crianca.
  'GET /api/turma/estado': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return { criancas: S.estadoDoRegistro(turmaId) };
  },

  // F8/F9/F10 — os tres scores. Cobertura NUNCA vai para tela de educadora.
  'GET /api/scores': (req) => {
    const u = exigeGestao(req);
    const evasao = S.riscoEvasao({});
    // A coordenacao age sobre a crianca (liga para a familia) e por isso ve o
    // nome. A diretoria trabalha sobre a camada agregada: recebe a contagem e a
    // distribuicao por turma, nunca a lista nominal com score individual.
    const evasaoParaODevido = u.papel === 'diretoria'
      ? {
          escopo: evasao.escopo, limiar_acao: evasao.limiar_acao,
          faltas_para_lista: evasao.faltas_para_lista,
          avaliadas: evasao.avaliadas, em_risco: evasao.em_risco,
          // A distribuição também é um recorte: célula de 1 numa turma nomeada é
          // fato de nível individual sobre uma criança específica. Passa pela
          // mesma supressão que o relatório aplica em áreas e faixas.
          ...(() => {
            const bruto = Object.entries(evasao.linhas.reduce((acc, l) => {
              const k = l.turma ?? 'sem turma';
              acc[k] = (acc[k] ?? 0) + 1; return acc;
            }, {})).map(([turma, n]) => ({ turma, rotulo: turma, n }));
            const sup = S.suprimir(bruto, { chave: 'n', rotulo: 'Demais turmas', somaveis: ['n'] });
            return {
              por_turma: sup.publicaveis.map(t => ({ turma: t.rotulo, n: t.n })),
              turmas_suprimidas: sup.suprimidos.length,
            };
          })(),
          minimo_celula: D.PARAMS.MINIMO_CELULA,
          linhas: [],
          nominal_suprimido: true,
          doutrina: evasao.doutrina,
        }
      : evasao;
    return {
      evasao: evasaoParaODevido,
      cobertura: S.coberturaRegistro({}),
      exposicao: S.exposicao({}),
      extrator: V.qualidadeDoExtrator({}),
      descarte: S.taxaDeDescarte({}),
      doutrina: 'Nenhum destes scores pontua a criança. Não existe score socioemocional individual, por decisão de desenho.',
    };
  },

  // Risco de evasao da propria turma — a educadora ve as criancas dela.
  'GET /api/turma/risco': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return S.riscoEvasao({ turmaId });
  },

  // F13/F14 — saida para o doador.
  'GET /api/relatorio': (req, _b, q) => {
    exigeDiretoria(req);
    const tipo = q.get('tipo') || 'ciclo';
    const periodo = q.get('periodo');
    const janela = periodo ? periodo.split('..') : null;
    return {
      tipo,
      lista: R.relatorios(),
      periodos: R.periodosSugeridos(),
      relatorio: periodo ? R.relatorioDe(tipo, periodo) : null,
      previa: janela ? R.numerosDoPeriodo({ inicio: janela[0], fim: janela[1] }) : null,
      minimo_celula: D.PARAMS.MINIMO_CELULA,
    };
  },

  'POST /api/relatorio/gerar': async (req, body) => {
    exigeDiretoria(req);
    return await R.gerarRelatorio({
      tipo: body.tipo || 'ciclo', inicio: body.inicio, fim: body.fim,
      custoPeriodo: body.custo == null || body.custo === '' ? null : Number(body.custo),
    });
  },

  'POST /api/relatorio/publicar': (req, body) => {
    const u = exigeDiretoria(req);
    return R.publicarRelatorio(body.tipo || 'ciclo', body.periodo, u.id);
  },

  // F15 — consulta em linguagem natural sobre a camada agregada.
  'POST /api/consulta': (req, body) => {
    exigeGestao(req);
    return R.consultar(body.pergunta);
  },

  // F7 — ingestao retroativa.
  'POST /api/importar': (req, body) => {
    const u = exigeCoordenacao(req);
    return G.importarPlanilha({
      csv: String(body.csv ?? ''), origem: String(body.origem ?? 'planilha.csv'),
      turmaId: num(body.turma_id, 'turma_id'), executadoPor: u.id, simular: !!body.simular,
    });
  },

  'GET /api/importacoes': (req) => { exigeCoordenacao(req); return { importacoes: G.importacoes() }; },

  // ---- Cadastro de pessoas (equipe e criancas) ---------------------------
  // A porta manual do item 2.8 de ARQUITETURA.md: ate aqui toda pessoa vinha
  // da seed ou de planilha. TUDO aqui e' de coordenacao, pelo mesmo motivo que
  // /api/importar e': quem cadastra define papel e matricula, e papel+matricula
  // sao exatamente o que decide o escopo de leitura de todo o resto do produto.
  // Professora nao cadastra a propria turma; diretoria nao toca em individual.
  'GET /api/cadastro': (req) => {
    exigeCoordenacao(req);
    return {
      equipe: D.listarEquipe(),
      papeis: D.PAPEIS,
      programas: all(`SELECT id, nome, faixa, cadencia FROM programa WHERE no_escopo = 1 ORDER BY id`),
      turmas: all(
        `SELECT t.id, t.nome, t.turno, t.programa_id, p.nome AS programa, e.nome AS educador
           FROM turma t JOIN programa p ON p.id = t.programa_id
           LEFT JOIN educador e ON e.id = t.educador_id ORDER BY t.id`),
      proximo_codigo: D.proximoCodigoCrianca(),
    };
  },

  'POST /api/equipe': (req, body) => {
    exigeCoordenacao(req);
    return D.criarPessoa({
      nome: body.nome, apelido: body.apelido, papel: String(body.papel ?? ''),
      turmaId: body.turma_id ? num(body.turma_id, 'turma_id') : null,
      confirmarTroca: !!body.confirmar_troca,
    });
  },

  'POST /api/criancas': (req, body) => {
    exigeCoordenacao(req);
    return D.criarCrianca({
      nome: body.nome, nascimento: body.nascimento, responsavel: body.responsavel,
      programaId: num(body.programa_id, 'programa_id'),
      turmaId: body.turma_id ? num(body.turma_id, 'turma_id') : null,
      entrada: body.entrada || null,
    });
  },

  // ---- Arquivo — ninguem e' apagado (decisao 30) -------------------------
  // Nao existe DELETE de pessoa em rota nenhuma deste produto, e a ausencia e'
  // a decisao. Arquivar tira das listas vivas; o registro fica de pe'.
  'GET /api/arquivo': (req) => { exigeCoordenacao(req); return D.listarArquivo(); },

  'POST /api/equipe/arquivar': (req, body) => {
    const u = exigeCoordenacao(req);
    return D.arquivarPessoa(num(body.id, 'id'), {
      porUsuarioId: u.id,
      assumidaPor: body.assumida_por ? num(body.assumida_por, 'assumida_por') : null,
    });
  },

  'POST /api/equipe/reativar': (req, body) => {
    exigeCoordenacao(req);
    return D.reativarPessoa(num(body.id, 'id'));
  },

  'POST /api/criancas/arquivar': (req, body) => {
    exigeCoordenacao(req);
    return D.arquivarCrianca(num(body.id, 'id'), { saida: body.saida || null });
  },

  'POST /api/criancas/rematricular': (req, body) => {
    exigeCoordenacao(req);
    return D.rematricularCrianca(num(body.id, 'id'), {
      programaId: num(body.programa_id, 'programa_id'),
      turmaId: body.turma_id ? num(body.turma_id, 'turma_id') : null,
      entrada: body.entrada || null,
    });
  },

  // Fecho de ciclo — executa a retencao declarada na governanca.
  'POST /api/ciclo/fechar': (req, body) => {
    const u = exigeCoordenacao(req);
    return D.fecharCiclo(num(body.ciclo_id, 'ciclo_id'), u.id, { abrirProximo: !!body.abrir_proximo });
  },
};

