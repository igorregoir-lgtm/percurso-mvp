// Percurso — sessao (decisao 51 revoga a senha da decisao 39).
//
// O QUE MUDOU, E O QUE NAO MUDOU. A decisao 39 trouxe DUAS pecas juntas: senha
// com scrypt e token opaco de sessao. A 51 remove a PRIMEIRA e mantem a
// SEGUNDA. Entrar volta a ser escolher quem esta usando — identificacao, como
// na decisao 8 — mas o cookie NAO volta a ser o id.
//
// POR QUE O TOKEN FICA. O cookie era `percurso_uid=5`: qualquer pessoa trocava
// o numero no navegador e virava a psicologa. Isso e' forjadura, nao ausencia
// de senha, e nada no pedido de tirar a senha pede a volta disso. Sem senha e
// com token opaco, quem escolhe um perfil na tela recebe uma sessao que o
// servidor emitiu; quem edita o cookie na mao nao recebe nada.
//
// A revisão do PR #7 acrescenta PERCURSO_CHAVE_ACESSO, exigida antes de
// emitir qualquer sessão. É compartilhada pela equipe: restringe a entrada,
// mas não comprova identidade individual de quem escolheu o perfil.
// Sem configuração, o login fica bloqueado.
//
// SEM DEPENDENCIA NOVA. `randomBytes` vem do `node:crypto`; a decisao tecnica
// n. 1 (sem npm, sem build) continua de pe'.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

// --------------------------------------------------------------------------
// SESSOES COM TOKEN OPACO. O cookie nao e' o id.
//
// Em MEMORIA de proposito: reiniciar o servidor desconecta todo mundo, e isso
// e' MELHOR que um cookie persistente forjavel. Numa casa com duas pessoas e um
// servidor na sala, reentrar custa segundos; sessao que sobrevive ao processo
// sem poder ser revogada custa muito mais.
// --------------------------------------------------------------------------
const TTL_MS = Number(process.env.PERCURSO_SESSAO_MS) || 12 * 60 * 60 * 1000;
const sessoes = new Map();   // token -> { educadorId, expiraEm }

export function abrirSessao(educadorId) {
  limpar();
  const token = randomBytes(32).toString('base64url');
  sessoes.set(token, { educadorId, expiraEm: Date.now() + TTL_MS });
  return token;
}

export function educadorDoToken(token) {
  if (!token) return null;
  const s = sessoes.get(token);
  if (!s) return null;
  if (Date.now() > s.expiraEm) { sessoes.delete(token); return null; }
  return s.educadorId;
}

export function encerrarSessao(token) { if (token) sessoes.delete(token); }

/** Todas as sessoes de uma pessoa caem. E' o que arquivar alguem tem de fazer
 *  no instante em que acontece — a checagem por request e' a rede de baixo. */
export function encerrarSessoesDe(educadorId) {
  for (const [t, s] of sessoes) if (s.educadorId === educadorId) sessoes.delete(t);
}

function limpar() {
  const t0 = Date.now();
  for (const [t, s] of sessoes) if (t0 > s.expiraEm) sessoes.delete(t);
}

// A chave compartilhada restringe a entrada; não prova identidade individual.
export function chaveConfigurada() { return !!process.env.PERCURSO_CHAVE_ACESSO; }
export function validarChave(chave) {
  if (!chaveConfigurada() || typeof chave !== 'string') return false;
  const hash = valor => createHash('sha256').update(valor).digest();
  return timingSafeEqual(hash(chave), hash(process.env.PERCURSO_CHAVE_ACESSO));
}
