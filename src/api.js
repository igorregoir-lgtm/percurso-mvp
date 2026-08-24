// Percurso — camada HTTP/JSON. Cada rota so traduz requisicao em chamada de dominio.
import { all, get } from './db.js';
import * as D from './domain.js';
import * as V from './voz.js';
import * as S from './scores.js';
import * as R from './relatorio.js';
import * as G from './ingestao.js';

const COOKIE = 'percurso_uid';

export function usuarioDa(req) {
  const raw = req.headers.cookie || '';
  const m = raw.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  const id = m ? Number(m.split('=')[1]) : null;
  if (!id) return null;
  return get(`SELECT * FROM educador WHERE id = ?`, id) ?? null;
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
 * Aplicado nas rotas que a v2 criou e na chamada. As rotas herdadas de leitura
 * individual (ficha, lista, observacao) seguem como item 1.2 do horizonte 1 —
 * fechar todas de uma vez exigiria decidir com a coordenacao o caso da educadora
 * substituta, que hoje nao tem representacao no modelo.
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
    usuarios: all(`SELECT id, nome, apelido, papel FROM educador ORDER BY id`),
  }),

  'POST /api/sessao': (req, body) => {
    const u = get(`SELECT * FROM educador WHERE id = ?`, num(body.educador_id, 'educador_id'));
    if (!u) throw D.erro(404, 'Usuário não encontrado.');
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
      agenda: turma && ciclo ? D.agendaDoCiclo(turma.id, ciclo.id) : null,
      alertas: turma
        ? D.alertas().filter(a => get(
            `SELECT 1 x FROM matricula WHERE crianca_id = ? AND turma_id = ? AND status='ativa'`,
            a.crianca_id, turma.id))
        : [],
      // "Para esta semana": o sistema deixa de cobrar e passa a devolver.
      pauta: turma ? S.pautaDaSemana(turma.id) : null,
      folha: turma ? V.folhaDaTurma(turma.id, D.dataDaFolha(turma.id)) : null,
      data_folha: turma ? D.dataDaFolha(turma.id) : null,
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

  'GET /api/ciclo/agenda': (req, _b, q) => {
    const turmaId = num(q.get('turma_id'), 'turma_id');
    exigeAcessoTurma(req, turmaId);
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
  'GET /api/criancas': (req, _b, q) => {
    exigeEducadorOuCoordenacao(req);
    return {
      criancas: D.listarCriancas({
        q: q.get('q') || '',
        turmaId: q.get('turma_id') ? Number(q.get('turma_id')) : null,
        programaId: q.get('programa_id') ? Number(q.get('programa_id')) : null,
      }),
    };
  },

  'GET /api/crianca': (req, _b, q) => { exigeEducadorOuCoordenacao(req); return D.fichaCrianca(num(q.get('id'), 'id')); },

  'GET /api/alertas': (req) => {
    exigeEducadorOuCoordenacao(req);
    return { alertas: D.alertas(), faltas_para_lista: D.PARAMS.AUSENCIAS_ALERTA };
  },

  'POST /api/alerta': (req, body) => {
    exigeEducadorOuCoordenacao(req);
    return D.atualizarAlerta(num(body.id, 'id'), body.status, body.tratativa);
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
    };
  },

  // F3+F4 — a fala vira campos. NADA E' GRAVADO AQUI.
  // O audio nunca chega ao servidor: a transcricao acontece no navegador e o
  // arquivo e' descartado la. A transcricao entra, e' usada em memoria e sai
  // desta funcao sem tocar disco nem log.
  'POST /api/voz/extrair': (req, body) => {
    const turmaId = num(body.turma_id, 'turma_id');
    exigeAcessoTurma(req, turmaId);
    const texto = String(body.transcricao ?? '');
    if (texto.length > 4000) throw D.erro(422, 'Transcrição longa demais para uma fala de 40 segundos.');
    const nomes = D.criancasDaTurma(turmaId).map(c => c.nome);
    const { extracao, perimetro, invalido } = V.extrairDaFala(texto, nomes);
    return {
      extracao,
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
    return { ok: true, folha, pauta: S.pautaDaSemana(turmaId) };
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
      periodos: periodosSugeridos(),
      relatorio: periodo ? R.relatorioDe(tipo, periodo) : null,
      previa: janela ? R.numerosDoPeriodo({ inicio: janela[0], fim: janela[1] }) : null,
      minimo_celula: D.PARAMS.MINIMO_CELULA,
    };
  },

  'POST /api/relatorio/gerar': (req, body) => {
    exigeDiretoria(req);
    return R.gerarRelatorio({
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

  // Fecho de ciclo — executa a retencao declarada na governanca.
  'POST /api/ciclo/fechar': (req, body) => {
    const u = exigeCoordenacao(req);
    return D.fecharCiclo(num(body.ciclo_id, 'ciclo_id'), u.id, { abrirProximo: !!body.abrir_proximo });
  },
};

// Periodos que a diretoria costuma pedir, calculados sobre o calendario.
function periodosSugeridos() {
  const h = D.hoje();
  const ano = Number(h.slice(0, 4));
  const mes = Number(h.slice(5, 7));
  const semestre = mes <= 6
    ? { rotulo: `1º semestre de ${ano}`, inicio: `${ano}-01-01`, fim: `${ano}-06-30` }
    : { rotulo: `2º semestre de ${ano}`, inicio: `${ano}-07-01`, fim: `${ano}-12-31` };
  const tri = Math.ceil(mes / 3);
  const iniTri = String((tri - 1) * 3 + 1).padStart(2, '0');
  const fimTri = String(tri * 3).padStart(2, '0');
  const ultimoDia = new Date(Date.UTC(ano, tri * 3, 0)).getUTCDate();
  return [
    semestre,
    { rotulo: `${tri}º trimestre de ${ano}`, inicio: `${ano}-${iniTri}-01`, fim: `${ano}-${fimTri}-${ultimoDia}` },
    { rotulo: `Ano de ${ano}`, inicio: `${ano}-01-01`, fim: `${ano}-12-31` },
    { rotulo: 'Últimos 180 dias', inicio: D.addDias(h, -180), fim: h },
  ];
}
