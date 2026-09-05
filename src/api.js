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
import * as PP from './aurora/painel.js';
// A Aurora responde pergunta agregada com número do banco; a ligação é feita
// aqui para evitar ciclo de import (relatorio.js → domain/scores/db).
A.ligarConsultaAgregada(R.consultar);
import { invalidarSinais, falhasDoEnvelope as envelopeFalhou } from './aurora/sinais.js';
import * as PF from './aurora/perfil.js';
import * as PO from './aurora/orquestrador.js';
import * as SROI from './sroi/calculator.js';
import * as PL from './planilha.js';
import * as AUD from './auditoria.js';
import * as AUTH from './auth.js';
import * as RL from './relato-livre.js';
import * as REL from './relato.js';
import * as REC from './recado.js';
import * as TRANSC from './transcricao.js';
import * as PAR from './parecer.js';
import * as EVI from './evidencia.js';
import * as BOL from './boletim.js';
import * as CAN from './canais.js';
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
  // O COOKIE DEIXOU DE SER O ID (decisão 39). Era `percurso_uid=5` — qualquer
  // pessoa trocava o número no navegador e virava a psicóloga. Agora é um token
  // opaco de 32 bytes que só o servidor sabe a quem pertence, e que a troca de
  // senha e o arquivamento derrubam.
  const token = m ? m.slice(COOKIE.length + 1) : null;
  const id = AUTH.educadorDoToken(token);
  if (!id) return null;
  // Quem foi para o ARQUIVO não tem sessão, mesmo com o token válido na mão:
  // arquivar alguém precisa valer AGORA. Este é o ponto único onde isso é
  // verdade para todas as rotas — pôr a checagem só no login deixaria a sessão
  // aberta em pé.
  const u = get(`SELECT * FROM educador WHERE id = ? AND arquivado_em IS NULL`, id) ?? null;
  // O HASH NUNCA SAI DAQUI. `SELECT *` o traz junto, e `GET /api/sessao`
  // devolve este objeto inteiro ao navegador — sem esta linha, a autenticação
  // publicaria o que ela existe para proteger.
  if (u) delete u.senha_hash;
  return u;
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
/**
 * Acesso a dado individual — e AGORA COM RASTRO (decisao 38).
 *
 * O log fica AQUI, no unico portao por onde todo acesso individual passa. Pôr
 * a chamada em cada rota seria garantir que a proxima rota esqueceria.
 *
 * `recurso` diz O QUE foi lido. Quem nao informa entra como 'ficha', que e' o
 * caso geral — nenhuma leitura individual sai sem registro.
 */
function exigeAcessoCrianca(req, criancaId, recurso = 'ficha') {
  const u = semAcessoIndividual(exigeUsuario(req));
  // Criança que não existe é 404 para qualquer papel — o 403 de escopo só faz
  // sentido sobre uma criança real (e não vira oráculo de existência: a lista
  // da educadora já é restrita às turmas dela).
  if (!get(`SELECT 1 x FROM crianca WHERE id = ?`, criancaId))
    throw D.erro(404, 'Criança não encontrada.');
  if (u.papel === 'coordenacao') { AUD.registrarAcesso(u, recurso, criancaId); return u; }
  const vinculo = get(
    `SELECT 1 x FROM matricula m JOIN turma t ON t.id = m.turma_id
      WHERE m.crianca_id = ? AND m.status='ativa' AND t.educador_id = ?`, criancaId, u.id);
  if (!vinculo)
    throw D.erro(403, 'Esta criança é de outra turma. O acesso é do educador da criança e da coordenação.');
  AUD.registrarAcesso(u, recurso, criancaId);
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
    // `primeiro_acesso` diz à tela qual formulário mostrar. NÃO é vazamento:
    // saber que fulana ainda não definiu senha não ajuda quem não está na LAN, e
    // esconder isso obrigaria a pessoa a adivinhar em qual campo digitar.
    usuarios: all(
      `SELECT id, nome, apelido, papel, (senha_hash IS NULL) AS primeiro_acesso
         FROM educador WHERE arquivado_em IS NULL ORDER BY id`),
  }),

  // Autenticação (decisão 39). Antes, entrar era escolher um perfil numa lista.
  'POST /api/sessao': async (req, body) => {
    const u = get(`SELECT * FROM educador WHERE id = ?`, num(body.educador_id, 'educador_id'));
    if (!u) throw D.erro(404, 'Usuário não encontrado.');
    if (u.arquivado_em)
      throw D.erro(403, `${u.nome} está no arquivo desde ${D.dataBR(u.arquivado_em)} e não entra no Percurso. A coordenação pode trazer de volta.`);

    const espera = AUTH.bloqueioDe(u.id);
    if (espera) throw D.erro(429, `Muitas tentativas. Tente de novo em ${espera} segundo(s).`, { causa: 'bloqueado', espera });

    // PRIMEIRO ACESSO. Não há senha semeada: senha em seed é senha publicada.
    // Quem chega primeiro define a dela — e o limite disso está declarado na
    // decisão 39: com dado real, a coordenação define todas antes de entregar o
    // endereço.
    if (!u.senha_hash) {
      if (body.senha == null)
        throw D.erro(401, `${u.apelido} ainda não tem senha. Crie uma agora — ela vale só neste Instituto.`, { causa: 'primeiro_acesso' });
      await AUTH.definirSenha(u.id, body.senha);
    } else if (!(await AUTH.confere(body.senha ?? '', u.senha_hash))) {
      AUTH.contarErro(u.id);
      throw D.erro(401, 'Senha incorreta.', { causa: 'senha' });
    }

    AUTH.limparErros(u.id);
    const token = AUTH.abrirSessao(u.id);
    const seguro = req.socket?.encrypted ? ' Secure;' : '';
    delete u.senha_hash; delete u.senha_definida_em;
    return { usuario: u, _cookie: `${COOKIE}=${token}; Path=/; Max-Age=43200; HttpOnly;${seguro} SameSite=Lax` };
  },

  'POST /api/sair': (req) => {
    const raw = req.headers.cookie || '';
    const m = raw.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
    AUTH.encerrarSessao(m ? m.slice(COOKIE.length + 1) : null);
    return { ok: true, _cookie: `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax` };
  },

  // Trocar a própria senha. Exige a atual: sem isso, um navegador deixado
  // aberto na sala vira uma conta tomada.
  'POST /api/senha': async (req, body) => {
    const u = exigeUsuario(req);
    const atual = get(`SELECT senha_hash FROM educador WHERE id = ?`, u.id)?.senha_hash;
    if (!(await AUTH.confere(body.senha_atual ?? '', atual)))
      throw D.erro(401, 'A senha atual não confere.');
    await AUTH.definirSenha(u.id, body.senha_nova);
    return { ok: true, aviso: 'Senha trocada. Entre de novo — as sessões abertas caíram.' };
  },

  // A coordenação devolve alguém ao primeiro acesso. É o caminho de
  // recuperação: não existe "esqueci a senha" num produto que não manda e-mail.
  'POST /api/senha/redefinir': (req, body) => {
    exigeCoordenacao(req);
    const alvo = get(`SELECT id, nome FROM educador WHERE id = ?`, num(body.educador_id, 'educador_id'));
    if (!alvo) throw D.erro(404, 'Usuário não encontrado.');
    AUTH.redefinirParaPrimeiroAcesso(alvo.id);
    return { ok: true, aviso: `${alvo.nome} volta ao primeiro acesso e define uma senha nova ao entrar.` };
  },

  // ---- Educadora ---------------------------------------------------------
  'GET /api/hoje': (req, _b, q) => {
    const u = exigeUsuario(req);
    const turmas = all(
      `SELECT t.*, p.nome AS programa FROM turma t JOIN programa p ON p.id = t.programa_id
        WHERE t.educador_id = ? ORDER BY t.id`, u.id);
    // A TURMA ESCOLHIDA, nao `turmas[0]`. Este foi um achado de campo do dono do
    // produto (03/09/2026): a turma de sabado A' TARDE tem porta de entrada,
    // nome e chamada na operacao real — quem nao acompanhava era o produto. A
    // psicologa responde por duas turmas e o cartao, a chamada, a folha, a
    // pauta, os alertas e a agenda saiam todos da PRIMEIRA. So' `recados[]`
    // tinha virado por turma (achado A-1 da OPAR).
    //
    // A escolha vem por query e e' VALIDADA contra as turmas dela: turma_id de
    // outra pessoa nao seleciona nada, cai na primeira — o escopo continua
    // sendo o do vinculo, nunca o do parametro.
    const pedida = Number(q?.get('turma_id')) || null;
    const turma = (pedida && turmas.find(t => t.id === pedida)) || turmas[0] || null;
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
      // Turma fora da rubrica: a pauta de segunda nao e' dela (sem sugestao de
      // atividade nem lacuna de exposicao); o risco de sair continua valendo.
      pauta: turma ? (D.turmaNaRubrica(turma.id) ? S.pautaDaSemana(turma.id)
                      : { ...S.pautaDaSemana(turma.id), exposicao: null, sugestao: null }) : null,
      folha: turma ? V.folhaDaTurma(turma.id, D.dataDaFolha(turma.id)) : null,
      data_folha: turma ? D.dataDaFolha(turma.id) : null,
      // A chamada do encontro da folha — que nem sempre e' a de hoje. O recado
      // aos responsaveis (decisao 33) e' do ENCONTRO: numa terca, a psicologa
      // da Vivencia ainda tem o recado do sabado. Sem encontro nenhum na turma,
      // `dataDaFolha` devolve hoje e este campo e' falso — nao ha o que mandar.
      encontro_registrado: turma ? !!D.encontroDe(turma.id, D.dataDaFolha(turma.id)) : false,
      // F4 — o aviso chega ANTES do encontro, que e' o que o campo pediu: o
      // lembrete tem de chegar enquanto ainda da' para apertar "gravar". E' o
      // aviso IN-APP; notificacao agendada nao existe no padrao web (ver
      // decisao 37), e prometer o que o navegador nao faz seria pior que nada.
      proximos_encontros: turma ? D.proximosEncontros(turma.id, 2) : [],
      // "Registrado depois": o encontro guarda a DATA em que aconteceu e o
      // instante em que foi registrado. Quando os dois nao batem, a tela diz —
      // registro atrasado vale igual, e esconder isso e' que seria estranho.
      folha_registrada_depois: (() => {
        if (!turma) return null;
        const e = D.encontroDe(turma.id, D.dataDaFolha(turma.id));
        return e?.registrado_em && e.registrado_em.slice(0, 10) > e.data ? e.registrado_em.slice(0, 10) : null;
      })(),
      // O recado e' de TURMA, e quem responde por varias tinha porta so' para a
      // primeira (`turmas[0]`): a psicologa cobre a Vivencia de manha E de tarde,
      // e a Cleide, quatro turmas — os responsaveis das demais nao recebiam nada
      // pela interface. Achado A-1 da auditoria OPAR de 03/09/2026. Aqui vai uma
      // linha por turma que TEM encontro registrado; sem encontro nao ha recado.
      recados: turmas.map(t => {
        const data = D.dataDaFolha(t.id);
        return D.encontroDe(t.id, data) ? { turma_id: t.id, turma: t.nome, data } : null;
      }).filter(Boolean),
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

  // ---- Transcricao de audio (F1) ---------------------------------------
  // O corpo e' o WAV cru. Nao passa pela fila offline do cliente: audio nao e'
  // um POST idempotente de formulario, e reenviar dezenas de MB quando a rede
  // volta seria pior que pedir para a pessoa tentar de novo.
  'POST /api/transcrever': async (req, corpo) => {
    exigeUsuario(req);
    const { texto, audio_s, ms, fator } = await TRANSC.transcrever(corpo);
    // A transcricao NAO e' persistida aqui: volta ao cliente, que a leva para o
    // extrator na confirmacao. Mesma doutrina da captura ao vivo.
    //
    // O QUE FICA E' A MEDICAO, e so' ela: quantos segundos de audio, quantos
    // milissegundos de maquina. Sem texto, sem quem falou, sem encontro. E'
    // assim que a divida "velocidade do whisper nunca medida" deixa de esperar
    // um benchmark de bancada e passa a ser respondida pela propria operacao.
    TRANSC.registrarMedicao({ audio_s, ms });
    return { texto, caracteres: texto.length, audio_s, fator };
  },

  'GET /api/audio/status': (req) => { exigeUsuario(req); return TRANSC.estadoDoAudio(); },

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
    exigeAcessoCrianca(req, criancaId, 'observacao');
    // A turma diz se ha' rubrica individual. Na Vivencia nao ha' (decisao 31) —
    // e a ficha precisa saber disso para nao oferecer um registro que o POST
    // teria de recusar depois. Botao que leva a lugar nenhum e' pior que
    // ausencia de botao: parece defeito do produto, e e'.
    const turmaId = turmaDaCrianca(criancaId);
    return {
      ciclo, crianca: c,
      na_rubrica: turmaId ? D.turmaNaRubrica(turmaId) : false,
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
      // Turma fora da rubrica (Vivencia, decisao 31): sem agenda de ciclo aqui tambem.
      agenda: ciclo && D.turmaNaRubrica(turmaId) ? D.agendaDoCiclo(turmaId, ciclo.id) : null,
      na_rubrica: D.turmaNaRubrica(turmaId),
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
    const ficha = D.fichaCrianca(id);
    // F5 — A RUBRICA NA LÍNGUA DELA. O produto já calculava `evolucao012`
    // (piorou/manteve/evoluiu) e ela nunca via: o delta só chegava ao parecer.
    // A leitura dela é entre DUAS medições, na escala 0–2 da planilha do
    // Instituto; a do produto é em níveis 1–4. As duas vão juntas de propósito,
    // porque o mapeamento 2 e 3 → 1 é LOSSY e declarado provisório (decisão 34):
    // é vendo onde elas divergem que ela pode avalizar ou recusar o mapeamento.
    ficha.trajetoria.dimensoes = ficha.trajetoria.dimensoes.map(d => {
      const [ant, ult] = [d.niveis.at(-2), d.niveis.at(-1)];
      const e = (ant != null && ult != null)
        ? PL.evolucao012(PL.NIVEL_PARA_PLANILHA[ant], PL.NIVEL_PARA_PLANILHA[ult]) : null;
      return {
        ...d,
        evolucao: e,
        evolucao_rotulo: e == null ? null : PL.ROTULO_EVOLUCAO[e],
        // O caso que interessa à decisão 34: o nível mudou e a planilha não viu.
        divergente: e != null && ((d.mudanca === 'avancou' && e !== 2) || (d.mudanca === 'recuou' && e !== 0)),
      };
    });
    ficha.legenda_planilha = PL.LEGENDA_PLANILHA;
    // A coordenacao mexe em matricula DAQUI — e para isso precisa da lista de
    // turmas e programas. Vai so' para ela: quem nao pode mexer nao carrega o
    // catalogo do Instituto junto com a ficha.
    if (usuarioDa(req)?.papel === 'coordenacao') {
      ficha.turmas = D.turmasDetalhadas();
      ficha.programas = all(`SELECT id, nome, no_escopo FROM programa ORDER BY id`);
    }
    return ficha;
  },

  // ---- Rastro de acesso individual (decisao 38) ---------------------------
  // Quem leu a ficha de quem. E' o que a coordenacao precisa responder a um
  // responsavel que pergunte — e o que a LGPD chama de rastreabilidade.
  'GET /api/acessos': (req, _b, q) => {
    const criancaId = num(q.get('crianca_id'), 'crianca_id');
    // Ler o rastro E' ler dado individual: passa pelo mesmo portao, e fica
    // registrado tambem. Auditoria sem auditoria de si mesma nao e' auditoria.
    exigeAcessoCrianca(req, criancaId);
    return { acessos: AUD.acessosDaCrianca(criancaId) };
  },

  // O resumo, para a tela de governanca: volume por recurso e por papel, SEM
  // nome de crianca. A coordenacao ve o padrao de acesso, nao o caso a caso.
  'GET /api/acessos/resumo': (req, _b, q) => {
    exigeGestao(req);
    return AUD.resumoDeAcesso({ desde: q.get('desde') || null });
  },

  // ---- Campo livre de relato (decisao 40) ---------------------------------
  // Dois campos, duas naturezas. O do GRUPO mora na folha; o da CRIANCA tem
  // tabela propria, consentimento especifico e descarte no fim do ciclo.
  'POST /api/relato-grupo': (req, corpo) => {
    const turmaId = num(corpo.turma_id, 'turma_id');
    exigeAcessoTurma(req, turmaId);
    const data = corpo.data || D.dataDaFolha(turmaId);
    const enc = D.encontroDe(turmaId, data);
    const folha = enc ? V.folhaDe(enc.id) : null;
    if (!folha) throw D.erro(422, 'A folha deste encontro ainda não existe. Registre-a antes.');
    return RL.salvarRelatoGrupo({ folhaId: folha.id, turmaId, texto: corpo.texto });
  },

  'GET /api/relato-crianca': (req, _b, q) => {
    const criancaId = num(q.get('crianca_id'), 'crianca_id');
    exigeAcessoCrianca(req, criancaId, 'ficha');
    return {
      relatos: RL.relatosDaCrianca(criancaId),
      consentimento: D.consentimentoDe(criancaId, 'campo_livre').status,
    };
  },

  'POST /api/relato-crianca': (req, corpo) => {
    const criancaId = num(corpo.crianca_id, 'crianca_id');
    const u = exigeAcessoCrianca(req, criancaId, 'ficha');
    return RL.salvarRelatoCrianca({
      criancaId, educadorId: u.id, cicloId: D.cicloAberto()?.id ?? null, texto: corpo.texto,
    });
  },

  'DELETE /api/relato-crianca': (req, corpo) => {
    const id = num(corpo.id, 'id');
    const u = exigeUsuario(req);
    return RL.apagarRelatoCrianca(id, u.id);
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

  // DESCARTE DOS RELATOS VENCIDOS (OPAR 05/09/2026). O fecho de ciclo so'
  // detecta; apagar e' aqui, de coordenacao, com motivo, e passa pelo portao de
  // acesso individual — destruir texto sobre a crianca e' ato sobre a crianca.
  'POST /api/relato-crianca/descartar-vencidos': (req, body) => {
    const u = exigeCoordenacao(req);
    const id = num(body.crianca_id, 'crianca_id');
    exigeAcessoCrianca(req, id, 'ficha');
    return RL.descartarRelatosVencidos(id, { motivo: body.motivo, porUsuarioId: u.id });
  },

  // A CONFERENCIA DO TELEFONE (OPAR 05/09/2026). Passa pelo mesmo portao do
  // boletim, e por isso fica no log de acesso individual: confirmar de quem e'
  // o numero e' ato sobre a crianca, nao sobre um campo de cadastro.
  'POST /api/crianca/contato-conferido': (req, body) => {
    const u = exigeUsuario(req);
    const id = num(body.crianca_id, 'crianca_id');
    exigeAcessoCrianca(req, id, 'boletim');
    return D.marcarContatoConferido(id, { valor: body.valor, como: body.como, porUsuarioId: u.id });
  },

  // ---- Canais: onde o Instituto fala com quem (decisao 47) ---------------
  // Cadastro de coordenacao pelo mesmo motivo do resto: e' o publico do canal
  // que decide o que pode ser montado para ele.
  'GET /api/canais': (req, _b, q) => {
    exigeUsuario(req);
    const u = usuarioDa(req);
    const canais = CAN.listarCanais({ incluirArquivados: q.get('todos') === '1' && u.papel === 'coordenacao' });
    return {
      canais: u.papel === 'coordenacao' || u.papel === 'diretoria'
        ? canais
        // Quem esta' em sala ve' os canais das PROPRIAS turmas e os que nao sao
        // de turma nenhuma. Nao e' segredo — e' nao oferecer o grupo de outra
        // turma a quem nao responde por ela.
        : canais.filter(c => c.turma_id == null
            || all(`SELECT id FROM turma WHERE educador_id = ?`, u.id).some(t => t.id === c.turma_id)),
      tipos: CAN.TIPOS, publicos: CAN.PUBLICOS, conteudos: CAN.CONTEUDOS,
      turmas: D.turmasDetalhadas(),
      recentes: u.papel === 'coordenacao' || u.papel === 'diretoria' ? CAN.disparosRecentes() : [],
    };
  },

  // O que EXISTE para ser divulgado agora. Duas regras moram aqui:
  //
  //  1. so' sai o que ja' foi PUBLICADO. Carta e relatorio em rascunho nao
  //     aparecem — mandar para fora um texto que ainda nao passou pelo revisor
  //     de sobre-alegacao seria burlar o revisor por um caminho lateral.
  //  2. o recado nao persiste (decisao 33): ele e' montado do encontro na hora
  //     em que ela escolhe. Aqui vem so' a LISTA de encontros que tem recado.
  'GET /api/divulgar': (req) => {
    exigeGestao(req);
    const publicados = R.relatorios().filter(r => r.status === 'publicado').slice(0, 8).map(r => {
      const cheio = R.relatorioDe(r.tipo, r.periodo);
      return {
        tipo: r.tipo, periodo: r.periodo, publicado_em: r.publicado_em,
        rotulo: `${r.tipo === 'carta' ? 'Carta' : 'Relatório'} · ${r.periodo}`,
        destaque: cheio?.blocos?.[0]?.destaque ?? null,
        texto: cheio?.texto ?? '',
        primeiro_bloco: cheio?.blocos?.[0]?.texto ?? '',
      };
    });
    // Encontros com folha liberada, das ultimas semanas: sao os que tem recado.
    const recados = all(
      `SELECT e.turma_id, t.nome AS turma, e.data
         FROM encontro e JOIN turma t ON t.id = e.turma_id
         JOIN folha f ON f.encontro_id = e.id
        WHERE e.data >= date('now', '-28 days')
        ORDER BY e.data DESC, t.nome LIMIT 12`);
    return { canais: CAN.listarCanais(), tipos: CAN.TIPOS, publicos: CAN.PUBLICOS,
      conteudos: CAN.CONTEUDOS, turmas: D.turmasDetalhadas(),
      recados, publicados, recentes: CAN.disparosRecentes() };
  },

  // O CARD do período — a peça que vai para o Instagram (decisão 48).
  //
  // Nasce de `redigirCarta`, que é template fechado sobre números de SQL:
  // NENHUM modelo escreve aqui, e a supressão de célula pequena já aconteceu
  // antes, dentro de `numerosDoPeriodo`. Ainda assim passa pelo revisor de
  // sobre-alegação antes de sair — o Instagram é público, e público não tem
  // errata.
  'GET /api/divulgar/card': (req, _b, q) => {
    exigeGestao(req);
    const periodo = q.get('periodo') || '';
    const [inicio, fim] = periodo.split('..');
    if (!inicio || !fim) throw D.erro(422, 'Informe o período como inicio..fim.');
    const n = R.numerosDoPeriodo({ inicio, fim });
    const carta = R.redigirCarta(n)[0];
    const revisor = D.revisarSobreAlegacao(carta.texto);
    if (revisor.status !== 'aprovado')
      throw D.erro(422, `O revisor de sobre-alegação barrou este texto: ${revisor.achados?.join('; ') || 'sobre-alegação'}.`);
    return {
      periodo, rotulo: `${D.dataBR(inicio)} a ${D.dataBR(fim)}`,
      destaque: carta.destaque,
      // As três linhas do card. Só agregado — nenhuma delas pode apontar para
      // uma criança, e o mínimo de célula já foi aplicado lá atrás.
      linhas: [
        { valor: String(n.cobertura.criancas_unicas), rotulo: 'crianças no período' },
        { valor: n.permanencia.presenca_pct != null ? `${n.permanencia.presenca_pct}%` : '—', rotulo: 'de presença nos encontros' },
        { valor: String(n.exposicao.aspiracoes_declaradas), rotulo: 'disseram o que querem ser' },
      ],
      legenda: carta.texto,
      ressalva: 'Nenhuma criança aparece sozinha: grupos com menos de '
        + `${n.minimo_celula} são agrupados ou suprimidos antes de qualquer publicação.`,
      revisor: revisor.status,
    };
  },

  // Quem JÁ recebeu este conteúdo hoje — para a tela desmarcar por padrão e
  // dizer por quê. Não proíbe: repetir pode ser intencional.
  'GET /api/divulgar/ja-recebeu': (req, _b, q) => {
    // Quem manda o recado no sábado é a professora — a trava de duplicidade
    // tem de valer para ela também. Devolve só ids, nunca conteúdo.
    exigeUsuario(req);
    return { canal_ids: CAN.jaRecebeuHoje(String(q.get('conteudo') ?? ''), q.get('referencia'), { desde: q.get('desde') }) };
  },

  // O PASSE PARA O CELULAR (decisão 50): a fila montada no notebook vira um
  // id de dez minutos, de uso único, que o QR leva ao celular. Só gestão cria
  // e só gestão consome — o QR, sozinho, não abre nada para quem não tem sessão.
  'POST /api/divulgar/passe': (req, body) => {
    const u = exigeGestao(req);
    return CAN.criarPasse(body.fila, { porUsuarioId: u.id });
  },
  'GET /api/divulgar/passe': (req, _b, q) => {
    exigeGestao(req);
    return { fila: CAN.consumirPasse(q.get('id')) };
  },

  'POST /api/canais': (req, body) => {
    exigeCoordenacao(req);
    return CAN.criarCanal({
      tipo: String(body.tipo ?? ''), nome: body.nome, publico: String(body.publico ?? ''),
      turmaId: body.turma_id ? num(body.turma_id, 'turma_id') : null,
      destino: body.destino, observacao: body.observacao,
    });
  },

  'POST /api/canais/editar': (req, body) => {
    exigeCoordenacao(req);
    return CAN.editarCanal(num(body.id, 'id'), {
      nome: body.nome, publico: String(body.publico ?? ''),
      turmaId: body.turma_id ? num(body.turma_id, 'turma_id') : null,
      destino: body.destino, observacao: body.observacao,
    });
  },

  'POST /api/canais/arquivar': (req, body) => {
    exigeCoordenacao(req);
    return body.reativar ? CAN.reativarCanal(num(body.id, 'id')) : CAN.arquivarCanal(num(body.id, 'id'));
  },

  // O registro de que SAIU. O Percurso nao envia — quem envia e' a pessoa —,
  // mas "ja' mandei para os pais?" precisa de resposta que nao seja a memoria
  // de quem passou o sabado inteiro em pe' dentro da sala.
  'POST /api/disparo': (req, body) => {
    const u = exigeUsuario(req);
    // Quem está em sala registra envio só em canal da PRÓPRIA turma (ou sem
    // turma). Não é segredo — é não deixar o grupo do Reforço receber o recado
    // da Vivência por um clique errado, e não deixar o registro mentir.
    if (!['coordenacao', 'diretoria'].includes(u.papel)) {
      const canal = CAN.porId(num(body.canal_id, 'canal_id'));
      const minhas = all(`SELECT id FROM turma WHERE educador_id = ?`, u.id).map(t => t.id);
      if (canal.turma_id != null && !minhas.includes(canal.turma_id))
        throw D.erro(403, `${canal.nome} não é da sua turma.`);
    }
    return CAN.registrarDisparo({
      canalId: num(body.canal_id, 'canal_id'),
      conteudo: String(body.conteudo ?? ''),
      referencia: body.referencia ?? null,
      porUsuarioId: u.id,
    });
  },

  // ---- Boletim da crianca para o responsavel (decisao 42) ----------------
  // Contraparte do recado da turma, e o oposto dele no destinatario: aqui vai
  // UMA crianca para UMA pessoa — quem responde por ela. Nao persiste; e'
  // gerado do que ja' esta registrado, como o recado.
  'GET /api/boletim': (req, _b, q) => {
    const id = num(q.get('crianca_id'), 'crianca_id');
    exigeAcessoCrianca(req, id, 'boletim');
    return BOL.boletimDaCrianca(id);
  },

  // ---- Prova do consentimento em video (decisao 41) ----------------------
  // O corpo e' BINARIO (ver server.js): base64 em JSON inflaria 33% um arquivo
  // de dezenas de MB, e o teto de 1 MB do lerCorpo existe para recusar isso.
  'POST /api/consentimento/evidencia': (req, corpo, q) => {
    const u = exigeCoordenacao(req);
    const criancaId = num(q.get('crianca_id'), 'crianca_id');
    return EVI.guardar(corpo, {
      criancaId, campo: q.get('campo') || '',
      mime: q.get('mime') || req.headers['content-type'] || '',
      duracaoS: q.get('duracao') ? Number(q.get('duracao')) : null,
      responsavel: q.get('responsavel') || '',
      registradoPor: u.id,
    });
  },

  'GET /api/consentimento/evidencias': (req, _b, q) => {
    exigeCoordenacao(req);
    const id = num(q.get('crianca_id'), 'crianca_id');
    exigeAcessoCrianca(req, id, 'consentimento_video');
    return { evidencias: EVI.daCrianca(id) };
  },

  // Devolve os BYTES do video. Passa pelo mesmo portao de acesso individual —
  // e por isso fica registrado quem assistiu, e quando.
  'GET /api/consentimento/video': (req, _b, q) => {
    exigeCoordenacao(req);
    const linha = EVI.porId(num(q.get('id'), 'id'));
    exigeAcessoCrianca(req, linha.crianca_id, 'consentimento_video');
    const { buffer, mime } = EVI.bytesDe(linha.id);
    return { _arquivo: buffer, _mime: mime };
  },

  // DESTRUIR A PROVA PASSA PELO MESMO PORTAO QUE ASSISTIR A ELA (OPAR 05/09).
  // Antes, `GET /api/consentimento/video` registrava quem assistiu e este
  // DELETE nao registrava nada: **ver ficava no log, destruir nao.** Para uma
  // peca que existe por causa do onus da prova, era o rastro exatamente ao
  // contrario. Agora a leitura da linha vem antes, para saber de QUEM e' a
  // prova, e o acesso e' registrado antes de o arquivo sumir.
  'DELETE /api/consentimento/evidencia': (req, body) => {
    exigeCoordenacao(req);
    const id = num(body.id, 'id');
    const linha = EVI.porId(id);
    exigeAcessoCrianca(req, linha.crianca_id, 'consentimento_video');
    return EVI.apagar(id, { motivo: body.motivo });
  },

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
  // Aurora — assistente-parceiro de navegacao (todos os papeis; responde SO
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
  'GET /api/aurora/painel': (req, _b, q) => {
    const u = exigeUsuario(req);
    return PP.painelDoAurora(u, A.telaSegura(String(q.get('tela') || '')));
  },

  // O refinamento pelo Qwen — ASSÍNCRONO e opcional. O painel determinístico
  // já está pintado quando isto roda; falha, timeout, fila ocupada ou modelo
  // desligado devolvem `refinado:false` e NADA muda na tela. Nunca 5xx.
  'POST /api/aurora/refinar': async (req, body) => {
    const u = exigeUsuario(req);
    if (!A.AI_ASSISTENTE) return { refinado: false, motivo: 'desligado' };
    const tela = A.telaSegura(String(body.tela || ''));
    const painel = PP.painelDoAurora(u, tela);
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
        // identidade — enquanto o comentário e o corpo de /api/aurora/qualidade
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

  'GET /api/aurora/qualidade': (req) => {
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

  // Telemetria da Aurora — só o que a pessoa faz COM ELE. No-op silencioso
  // enquanto o aprendizado está desligado (que é o padrão).
  'POST /api/aurora/uso': (req, body) => {
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
  'GET /api/aurora/memoria': (req) => PF.memoriaDe(exigeUsuario(req).id),
  'POST /api/aurora/memoria': (req, body) => PF.salvarPreferencia(exigeUsuario(req).id, {
    aprender: body.aprender, resumo_do_dia: body.resumo_do_dia,
    prefere_tipo: body.prefere_tipo, convidado: body.convidado,
  }),
  'DELETE /api/aurora/memoria': (req) => PF.apagarMemoria(exigeUsuario(req).id),

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

  // ---- O calendario da casa (decisao 37) ---------------------------------
  // O turno da' a regra base; a casa marca a excecao. Quem responde pela turma
  // marca a dela; coordenacao e diretoria marcam qualquer uma — e' calendario
  // da casa, nao agenda pessoal.
  'GET /api/calendario': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return {
      turma: get(`SELECT id, nome, turno FROM turma WHERE id = ?`, turmaId),
      proximos: D.proximosEncontros(turmaId, 4),
      excecoes: D.excecoesDaTurma(turmaId, D.hoje()),
      abertas: D.chamadasEmAberto(turmaId),
    };
  },

  'POST /api/calendario': (req, corpo) => {
    const turmaId = num(corpo.turma_id, 'turma_id');
    const u = exigeAcessoTurma(req, turmaId);
    return D.marcarNoCalendario({
      turmaId, data: corpo.data, tipo: corpo.tipo, motivo: corpo.motivo, educadorId: u.id,
    });
  },

  'DELETE /api/calendario': (req, corpo) => {
    const turmaId = num(corpo.turma_id, 'turma_id');
    exigeAcessoTurma(req, turmaId);
    return D.desmarcarNoCalendario(turmaId, String(corpo.data ?? ''));
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
      // F3: o encontro anterior desta turma, para a tela oferecer "Igual ao
      // encontro de <data>" em UM toque. So' vai quando ainda nao ha folha —
      // oferecer copia de tres semanas atras por cima do que ela acabou de
      // registrar seria convidar ao erro.
      anterior: enc && !V.folhaDe(enc.id) ? V.folhaAnteriorDaTurma(turmaId, data) : null,
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
    // O teto era 4000 — cabia numa fala de 40 s e NAO cabe num encontro
    // inteiro: cinco minutos de narracao ja' passam disso. Com as portas longas
    // (F1) o limite antigo recusaria justamente a captura que elas existem para
    // permitir. O novo teto e' generoso e continua sendo um teto.
    if (texto.length > 60000) throw D.erro(422, 'Esse texto é maior do que o Percurso consegue ler de uma vez. Dá para guardar em duas partes.');
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
      // F6 — `faltas_mencionadas` era CODIGO MORTO: o extrator devolvia, a folha
      // gravava `[]` fixo (certo: a folha e' da turma, sem nome) e o front nunca
      // lia. O campo pediu literalmente "ou entao voce marque a presenca / pelo
      // nome, so falando" (Grav. 82).
      //
      // Volta como SUGESTAO POR CRIANCA, com id, para a tela oferecer e a pessoa
      // confirmar. NUNCA presume 'P' para quem a fala nao citou: presenca decide
      // renovacao de matricula (regua de 75%, decisao 33), e quem nao foi citada
      // simplesmente nao foi citada.
      faltas_sugeridas: (() => {
        const ditas = new Set(extracao.faltas_mencionadas ?? []);
        if (!ditas.size) return [];
        return D.criancasDaTurma(turmaId).filter(c => ditas.has(c.nome)).map(c => ({ id: c.id, nome: c.nome }));
      })(),
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
    const r = REC.recadoDaTurma(turmaId, q.get('data') || D.dataDaFolha(turmaId));
    // O mesmo texto, com a primeira linha em negrito e a assinatura em itálico:
    // o WhatsApp entende *asteriscos*, e e' assim que o recado chega legível
    // no celular de quem lê no ônibus. O `texto` cru continua, para quem cola
    // em outro lugar.
    const texto_whatsapp = CAN.formatarParaWhatsApp(r.texto);
    return { ...r, texto_whatsapp, whatsapp_url: 'https://wa.me/?text=' + encodeURIComponent(texto_whatsapp) };
  },

  // ---- Parecer profissional-a-profissional (decisao 32) --------------------
  // O unico dado individual que sai: por codigo, sob consentimento, liberado.
  // A diretoria nunca chega aqui (decisao 16).
  'GET /api/parecer': (req, _b, q) => {
    const criancaId = num(q.get('crianca_id'), 'crianca_id');
    exigeAcessoCrianca(req, criancaId, 'parecer');
    return {
      consentimento: D.consentimentoDe(criancaId, 'parecer_profissional').status,
      previa: PAR.numerosDoParecer(criancaId),
      pareceres: PAR.pareceresDe(criancaId),
    };
  },
  'GET /api/parecer/ver': (req, _b, q) => {
    const p = PAR.parecerDe(num(q.get('id'), 'id'));
    exigeAcessoCrianca(req, p.crianca_id, 'parecer');
    return p;
  },
  'POST /api/parecer/gerar': (req, body) => {
    const criancaId = num(body.crianca_id, 'crianca_id');
    const u = exigeAcessoCrianca(req, criancaId, 'parecer');
    return { ok: true, parecer: PAR.gerarParecer({ criancaId, destinatario: body.destinatario, usuarioId: u.id }) };
  },
  'POST /api/parecer/liberar': (req, body) => {
    const u = exigeUsuario(req);
    semAcessoIndividual(u);
    return { ok: true, parecer: PAR.liberarParecer(num(body.id, 'id'), u.id) };
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
  // A tela pede as sugestoes ANTES de a pessoa perguntar: quem chega nao deveria
  // ter de errar uma vez para descobrir o que a base sabe responder.
  'GET /api/consulta': (req) => {
    exigeGestao(req);
    return { sugestoes: R.SUGESTOES };
  },
  'POST /api/consulta': (req, body) => {
    exigeGestao(req);
    // PERIMETRO (auditoria OPAR de 03/09/2026). `src/assistente.js` aplica tres
    // guardas antes de chamar `R.consultar` e o comentario de la afirma ser "o
    // mesmo perimetro da rota /api/consulta". NAO era: esta rota chamava direto.
    // Medido: a mesma frase nominal — "a Quezia esta em risco de sair?" — era
    // RECUSADA pelo assistente e respondida com numero aqui. E "o que e
    // cobertura?" devolvia "esta em 82%" em vez da definicao.
    const pergunta = String(body.pergunta ?? '');
    // 1. decisao 16: nome de crianca nao abre aqui, em nenhuma formulacao — que
    //    e' exatamente o que a doutrina impressa nesta resposta ja prometia.
    if (anonimizarTexto(pergunta, C.nomesParaAnonimizar()).substituicoes > 0) {
      return {
        reconhecida: false,
        resposta: 'Não respondo sobre uma criança nomeada — esta consulta alcança só a camada agregada. Pergunte pelo grupo, pela turma ou pelo instituto.',
        sugestoes: R.SUGESTOES,
        doutrina: 'A consulta só alcança a camada agregada. Dado individual de criança não é respondido aqui, em nenhuma formulação.',
      };
    }
    // 2. pergunta sem forma quantitativa nao vira numero. "o que e cobertura?"
    //    pedia a definicao e recebia "esta em 82%", porque `consultar()` casa
    //    por substring em termo generico ('cobertura'). A recusa e' a MESMA de
    //    `consultar()` — quem pergunta merece a mesma frase nas duas portas.
    if (pergunta.trim() && !A.pareceQuantitativa(pergunta)) {
      return {
        reconhecida: false,
        resposta: 'Não sei responder isso a partir da camada agregada — e prefiro dizer que não sei a inventar um número. Se você quer um número, pergunte "quantas…" ou "como está…".',
        sugestoes: R.SUGESTOES,
        doutrina: 'A consulta só alcança a camada agregada. Dado individual de criança não é respondido aqui, em nenhuma formulação.',
      };
    }
    return R.consultar(pergunta);
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
      // A lista de TURMA e' outra, e de proposito: a Vivencia terapeutica esta'
      // fora do escopo de MEDICAO (nao entra na cobertura, nao tem rubrica
      // individual) — mas ela existe, tem turma, chamada e recado, e e' onde a
      // psicologa trabalha. Impedir de criar turma dela seria confundir "fora da
      // medicao" com "fora do Instituto".
      programas_de_turma: all(`SELECT id, nome, faixa, cadencia, no_escopo FROM programa ORDER BY id`),
      turmas: D.turmasDetalhadas(),
      turnos: D.TURNOS,
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
      contato: body.contato ?? null,
      programaId: num(body.programa_id, 'programa_id'),
      turmaId: body.turma_id ? num(body.turma_id, 'turma_id') : null,
      entrada: body.entrada || null,
    });
  },

  // ---- Turma — o cadastro que faltava (decisao 39) -----------------------
  // A pergunta do campo foi "quem cadastra as turmas?" e a resposta, ate' aqui,
  // era "ninguem: vem da seed". Coordenacao, pelo mesmo motivo do resto do
  // bloco — turma e' o que decide quem le a ficha de quem.
  'POST /api/turmas': (req, body) => {
    exigeCoordenacao(req);
    return D.criarTurma({
      nome: body.nome, turno: String(body.turno ?? ''),
      programaId: num(body.programa_id, 'programa_id'),
      educadorId: body.educador_id ? num(body.educador_id, 'educador_id') : null,
    });
  },

  'POST /api/turmas/editar': (req, body) => {
    exigeCoordenacao(req);
    return D.editarTurma(num(body.id, 'id'), {
      nome: body.nome, turno: String(body.turno ?? ''),
      programaId: num(body.programa_id, 'programa_id'),
      educadorId: body.educador_id ? num(body.educador_id, 'educador_id') : null,
    });
  },

  // Trocar a turma de uma matricula ativa, e matricular quem ja' esta' na ativa
  // num programa a mais. Sem estas duas, "matricular numa turma" so' existia no
  // instante do cadastro — depois disso a coordenacao nao tinha caminho nenhum.
  'POST /api/matricula/turma': (req, body) => {
    exigeCoordenacao(req);
    return D.transferirDeTurma(num(body.matricula_id, 'matricula_id'), {
      turmaId: body.turma_id ? num(body.turma_id, 'turma_id') : null,
    });
  },

  'POST /api/matricula': (req, body) => {
    exigeCoordenacao(req);
    const id = num(body.crianca_id, 'crianca_id');
    exigeAcessoCrianca(req, id, 'ficha');
    return D.matricularEmPrograma(id, {
      programaId: num(body.programa_id, 'programa_id'),
      turmaId: body.turma_id ? num(body.turma_id, 'turma_id') : null,
      entrada: body.entrada || null,
    });
  },

  // Quem responde pela crianca e por onde se fala com essa pessoa. E' o dado
  // que o boletim (decisao 42) precisa, e ele nao existia no cadastro.
  'POST /api/crianca/responsavel': (req, body) => {
    exigeCoordenacao(req);
    const id = num(body.crianca_id, 'crianca_id');
    exigeAcessoCrianca(req, id, 'ficha');
    return D.atualizarResponsavel(id, { responsavel: body.responsavel, contato: body.contato ?? null });
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

