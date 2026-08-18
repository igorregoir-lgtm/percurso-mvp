// Percurso — camada HTTP/JSON. Cada rota so traduz requisicao em chamada de dominio.
import { all, get } from './db.js';
import * as D from './domain.js';

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
      retomada: D.estadoDeRetomada(u.id),
      chamada: turma ? D.chamada(turma.id, D.hoje()) : null,
      chamadas_abertas: turma ? D.chamadasEmAberto(turma.id) : [],
      agenda: turma && ciclo ? D.agendaDoCiclo(turma.id, ciclo.id) : null,
      alertas: turma
        ? D.alertas().filter(a => get(
            `SELECT 1 x FROM matricula WHERE crianca_id = ? AND turma_id = ? AND status='ativa'`,
            a.crianca_id, turma.id))
        : [],
    };
  },

  'GET /api/chamada': (req, _b, q) => {
    exigeUsuario(req);
    return D.chamada(num(q.get('turma_id'), 'turma_id'), q.get('data') || D.hoje());
  },

  'POST /api/chamada': (req, body) => {
    const u = exigeUsuario(req);
    if (!Array.isArray(body.marcacoes)) throw D.erro(422, 'Envie a lista de marcações.');
    const turmaId = num(body.turma_id, 'turma_id');
    const data = body.data || D.hoje();
    const r = D.salvarChamada(turmaId, data, u.id, body.marcacoes, body.duracao_segundos);
    return { ok: true, ...r, chamada: D.chamada(turmaId, data), abertas: D.chamadasEmAberto(turmaId) };
  },

  'GET /api/chamadas-abertas': (req, _b, q) => {
    exigeUsuario(req);
    return { datas: D.chamadasEmAberto(num(q.get('turma_id'), 'turma_id')) };
  },

  'GET /api/rubrica': (req) => { exigeUsuario(req); return { dimensoes: D.rubrica(), params: D.PARAMS }; },

  'GET /api/ciclo/agenda': (req, _b, q) => {
    exigeUsuario(req);
    const ciclo = D.cicloAberto();
    if (!ciclo) throw D.erro(404, 'Não há ciclo de observação aberto.');
    return D.agendaDoCiclo(num(q.get('turma_id'), 'turma_id'), ciclo.id);
  },

  'GET /api/observacao': (req, _b, q) => {
    exigeUsuario(req);
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
    const u = exigeUsuario(req);
    const ciclo = D.cicloAberto();
    if (!ciclo) throw D.erro(404, 'Não há ciclo de observação aberto.');
    const criancaId = num(body.crianca_id, 'crianca_id');
    const r = D.salvarObservacao({
      cicloId: ciclo.id, criancaId, educadorId: u.id,
      itens: body.itens, notaLivre: body.nota_livre,
      concluir: !!body.concluir, forcarLimpeza: !!body.forcar_limpeza,
    });
    const turma = get(
      `SELECT turma_id FROM matricula WHERE crianca_id = ? AND status='ativa' AND turma_id IS NOT NULL LIMIT 1`,
      criancaId);
    return { ok: true, ...r, agenda: turma ? D.agendaDoCiclo(turma.turma_id, ciclo.id) : null };
  },

  'GET /api/turma/painel': (req, _b, q) => {
    exigeUsuario(req);
    const turmaId = num(q.get('turma_id'), 'turma_id');
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
    exigeUsuario(req);
    return D.planoDaTurma(num(q.get('turma_id'), 'turma_id'));
  },

  // ---- Criancas ----------------------------------------------------------
  'GET /api/criancas': (req, _b, q) => {
    exigeUsuario(req);
    return {
      criancas: D.listarCriancas({
        q: q.get('q') || '',
        turmaId: q.get('turma_id') ? Number(q.get('turma_id')) : null,
        programaId: q.get('programa_id') ? Number(q.get('programa_id')) : null,
      }),
    };
  },

  'GET /api/crianca': (req, _b, q) => { exigeUsuario(req); return D.fichaCrianca(num(q.get('id'), 'id')); },

  'GET /api/alertas': (req) => { exigeUsuario(req); return { alertas: D.alertas() }; },

  'POST /api/alerta': (req, body) => {
    exigeUsuario(req);
    return D.atualizarAlerta(num(body.id, 'id'), body.status, body.tratativa);
  },

  // ---- Coordenacao -------------------------------------------------------
  'GET /api/painel': (req) => {
    exigeCoordenacao(req);
    return { ...D.painelCoordenacao(), reconciliacao: D.reconciliacao(), tempo: D.tempoDeRegistro() };
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
};
