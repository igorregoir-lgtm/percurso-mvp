// Percurso — autenticacao (decisao 39).
//
// POR QUE ISTO EXISTE: era a divida n. 1 do produto, e o ULTIMO bloqueio do
// campo livre de relato (F7). Ate' aqui "entrar" era escolher um perfil numa
// lista — identificacao, nao autenticacao — e o cookie era o PROPRIO ID
// (`percurso_uid=5`), forjavel editando o cookie no navegador. Uma senha por
// cima de um cookie assim seria teatro: as duas pecas andam juntas.
//
// SEM DEPENDENCIA NOVA. `scrypt` e `randomBytes` vem do `node:crypto`; a
// decisao tecnica n. 1 (sem npm, sem build) continua de pe'.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { get, run } from './db.js';
import { erro, agora } from './domain.js';

const scrypt = promisify(scryptCb);

// Parametros do OWASP para scrypt (N=2^15, r=8, p=1). Ficam GRAVADOS no hash,
// nao so' no codigo: subir o custo depois nao pode invalidar a senha de quem
// ja' entrou — o hash antigo continua conferivel pelos parametros dele.
const N = 32768, R = 8, P = 1, TAM = 32;
export const SENHA_MINIMA = 8;

export async function gerarHash(senha) {
  const sal = randomBytes(16);
  const chave = await scrypt(String(senha), sal, TAM, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${chave.toString('base64')}`;
}

export async function confere(senha, hashGravado) {
  if (!hashGravado) return false;
  const [alg, n, r, p, sal, chave] = String(hashGravado).split('$');
  if (alg !== 'scrypt') return false;
  try {
    const esperado = Buffer.from(chave, 'base64');
    const obtido = await scrypt(String(senha), Buffer.from(sal, 'base64'), esperado.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
    // Comparacao em tempo constante: comparar com === vaza o tamanho do prefixo
    // igual, e com isso a senha, um caractere por vez.
    return timingSafeEqual(esperado, obtido);
  } catch { return false; }
}

// --------------------------------------------------------------------------
// SESSOES COM TOKEN OPACO. O cookie deixa de ser o id.
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

/** Todas as sessoes de uma pessoa caem. E' o que "trocar a senha" tem de fazer,
 *  e o que "a coordenacao redefiniu a sua senha" tem de fazer tambem. */
export function encerrarSessoesDe(educadorId) {
  for (const [t, s] of sessoes) if (s.educadorId === educadorId) sessoes.delete(t);
}

function limpar() {
  const t0 = Date.now();
  for (const [t, s] of sessoes) if (t0 > s.expiraEm) sessoes.delete(t);
}

// --------------------------------------------------------------------------
// FREIO DE TENTATIVA. Sem ele, uma senha de oito caracteres numa rede local cai
// por forca bruta em minutos — e o scrypt protege o BANCO, nao o formulario.
// Por PESSOA, nao por IP: numa LAN todo mundo sai do mesmo roteador.
// --------------------------------------------------------------------------
const TETO_TENTATIVAS = 5;
const CASTIGO_MS = 60 * 1000;
const tentativas = new Map();   // educadorId -> { erros, ateQuando }

export function bloqueioDe(educadorId) {
  const t = tentativas.get(educadorId);
  if (!t || Date.now() > t.ateQuando) return 0;
  return Math.ceil((t.ateQuando - Date.now()) / 1000);
}

export function contarErro(educadorId) {
  const t = tentativas.get(educadorId) ?? { erros: 0, ateQuando: 0 };
  t.erros++;
  // Espera cresce com a insistencia: 1 min, 2, 4… com teto de meia hora.
  if (t.erros >= TETO_TENTATIVAS)
    t.ateQuando = Date.now() + Math.min(CASTIGO_MS * 2 ** (t.erros - TETO_TENTATIVAS), 30 * 60 * 1000);
  tentativas.set(educadorId, t);
}

export function limparErros(educadorId) { tentativas.delete(educadorId); }

// --------------------------------------------------------------------------
// O que o banco guarda
// --------------------------------------------------------------------------
export function temSenha(educadorId) {
  return !!get(`SELECT senha_hash FROM educador WHERE id = ?`, educadorId)?.senha_hash;
}

/** Regra de senha deliberadamente CURTA. Exigir maiuscula, numero e simbolo faz
 *  a pessoa escrever a senha num papel colado no monitor — e este produto vive
 *  numa sala compartilhada. Tamanho e' o que de fato pesa. */
export function validarSenha(senha) {
  const s = String(senha ?? '');
  if (s.length < SENHA_MINIMA)
    throw erro(422, `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres. Uma frase curta serve e é mais fácil de lembrar.`);
  if (s.length > 200) throw erro(422, 'Senha longa demais.');
  return s;
}

export async function definirSenha(educadorId, senha) {
  const hash = await gerarHash(validarSenha(senha));
  run(`UPDATE educador SET senha_hash = ?, senha_definida_em = ? WHERE id = ?`, hash, agora(), educadorId);
  // Trocar a senha derruba as sessoes: se a troca foi porque alguem entrou,
  // deixar a sessao dele em pe' anula o motivo da troca.
  encerrarSessoesDe(educadorId);
  return { ok: true };
}

/** A coordenacao devolve alguem ao primeiro acesso. E' o caminho de recuperacao
 *  — nao existe "esqueci a senha" por e-mail num produto que nao manda e-mail. */
export function redefinirParaPrimeiroAcesso(educadorId) {
  run(`UPDATE educador SET senha_hash = NULL, senha_definida_em = NULL WHERE id = ?`, educadorId);
  encerrarSessoesDe(educadorId);
  limparErros(educadorId);
  return { ok: true };
}
