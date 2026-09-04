// Percurso — log de acesso a dado individual (decisao 38).
//
// POR QUE ISTO EXISTE: era divida declarada desde a v1 — "sem log de auditoria
// de acesso individual · exigivel sob LGPD · antes do primeiro dado real" — e
// e' PRE-REQUISITO ESCRITO do campo livre de relato (F7). Sem rastro, qualquer
// pessoa que abrisse a pagina leria a ficha de qualquer crianca e ninguem
// saberia. O plano poe a F7 depois desta, e nao antes.
//
// O QUE ELE NAO GUARDA: o conteudo lido. O log responde "quem viu a ficha da
// Yasmin em agosto" — nao vira uma segunda copia do prontuario, que seria
// exatamente o risco que ele existe para reduzir.
import { all, get, run } from './db.js';
import { agora, hoje } from './domain.js';

/** Recursos que carregam dado individual. Lista FECHADA: recurso novo entra
 *  aqui de proposito, nao por acidente de string. */
export const RECURSOS = Object.freeze(['ficha', 'observacao', 'parecer', 'trajetoria']);

export function registrarAcesso(usuario, recurso, criancaId) {
  if (!usuario?.id || !RECURSOS.includes(recurso) || !criancaId) return null;
  run(`INSERT INTO acesso_individual (educador_id, papel, recurso, crianca_id, em) VALUES (?,?,?,?,?)`,
      usuario.id, usuario.papel, recurso, criancaId, agora());
  return true;
}

/** Quem leu a ficha desta crianca. E' o que a coordenacao precisa responder a
 *  um responsavel que pergunte — e o que a LGPD chama de rastreabilidade. */
export function acessosDaCrianca(criancaId, limite = 50) {
  return all(
    `SELECT a.em, a.recurso, a.papel, e.nome AS quem
       FROM acesso_individual a JOIN educador e ON e.id = a.educador_id
      WHERE a.crianca_id = ? ORDER BY a.em DESC LIMIT ?`, criancaId, limite);
}

/** O resumo para a tela de governanca: volume por recurso e por papel, sem
 *  nome de crianca — a coordenacao ve o PADRAO de acesso, nao o caso a caso. */
export function resumoDeAcesso({ desde = null } = {}) {
  const corte = desde || `${hoje().slice(0, 8)}01`;
  const porRecurso = all(
    `SELECT recurso, COUNT(*) AS n, COUNT(DISTINCT crianca_id) AS criancas
       FROM acesso_individual WHERE em >= ? GROUP BY recurso ORDER BY n DESC`, corte);
  const porPapel = all(
    `SELECT papel, COUNT(*) AS n, COUNT(DISTINCT educador_id) AS pessoas
       FROM acesso_individual WHERE em >= ? GROUP BY papel ORDER BY n DESC`, corte);
  const total = get(`SELECT COUNT(*) AS n FROM acesso_individual WHERE em >= ?`, corte).n;
  return { desde: corte, total, por_recurso: porRecurso, por_papel: porPapel };
}
