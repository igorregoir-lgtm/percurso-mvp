// Percurso — a PROVA do consentimento (decisão 41).
//
// O pedido do campo foi direto: "como ele deixa registrado o consentimento?
// tem como ser por meio de um vídeo do responsável na hora de fazer a
// matrícula?". Tem — e é melhor do que o que havia.
//
// O QUE HAVIA: uma linha em `consentimento` com o nome de quem consentiu,
// digitado por quem estava do outro lado da mesa. Isso é a AFIRMAÇÃO de que
// houve consentimento, não a prova dele. A LGPD põe o ônus da prova no
// controlador (Art. 8º, §1º): numa fiscalização, "a coordenação digitou o nome"
// não sustenta nada. Um vídeo de trinta segundos sustenta.
//
// E resolve um problema de campo antes de resolver um jurídico: papel se perde,
// e nem todo responsável lê um termo com facilidade. Falar é mais fácil que
// assinar — para os dois lados.
//
// ONDE O ARQUIVO FICA: `data/consentimento/`, modo 0600, FORA de `public/`.
// Nada aqui é servido como estático; sai só pela rota autenticada, que registra
// o acesso. Ao contrário do áudio de transcrição (src/transcricao.js), este
// arquivo EXISTE PARA FICAR: apagá-lo é apagar a prova.
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, get, run } from './db.js';
import { erro, hoje } from './domain.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DIR = join(RAIZ, 'data', 'consentimento');

// 30 s de vídeo a 720p cabem folgados em 12 MB. O teto existe para o celular da
// educadora não subir um filme por engano numa rede que cai dentro da sala.
export const TETO_BYTES = Number(process.env.PERCURSO_EVIDENCIA_MAX_BYTES) || 24 * 1024 * 1024;

// Só o que um navegador de celular grava ou escolhe. `mp4` e `webm` cobrem
// iPhone e Android; áudio entra porque nem todo responsável quer aparecer.
const TIPOS = {
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav',
};

export function extensaoDe(mime) {
  return TIPOS[String(mime ?? '').split(';')[0].trim().toLowerCase()] ?? null;
}

/**
 * Guarda o vídeo e cria a linha. A linha e o arquivo nascem juntos: se o
 * INSERT falhar, o arquivo é apagado — meio-registro é pior que registro
 * nenhum, porque parece prova e não é.
 */
export function guardar(buffer, { criancaId, campo, mime, duracaoS = null, responsavel, registradoPor }) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw erro(422, 'O vídeo chegou vazio.');
  if (buffer.length > TETO_BYTES)
    throw erro(413, `O vídeo passou de ${Math.round(TETO_BYTES / 1024 / 1024)} MB. Grave um trecho mais curto — trinta segundos bastam.`);
  const ext = extensaoDe(mime);
  if (!ext) throw erro(422, 'Formato de vídeo não reconhecido. Grave pelo próprio aplicativo ou escolha um arquivo de vídeo comum.');
  const resp = String(responsavel ?? '').trim();
  if (!resp) throw erro(422, 'Diga quem é o responsável que aparece no vídeo.');
  if (!get(`SELECT id FROM crianca WHERE id = ?`, criancaId)) throw erro(404, 'Criança não encontrada.');
  if (!get(`SELECT campo FROM governanca_campo WHERE campo = ?`, campo)) throw erro(404, 'Campo de governança desconhecido.');

  mkdirSync(DIR, { recursive: true });
  const nome = `${randomUUID()}.${ext}`;
  const caminho = join(DIR, nome);
  writeFileSync(caminho, buffer, { mode: 0o600 });
  try {
    const id = Number(run(
      `INSERT INTO consentimento_evidencia
         (crianca_id, campo, arquivo, mime, bytes, duracao_s, responsavel, registrado_por, criado_em)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      criancaId, campo, nome, mime, buffer.length,
      duracaoS != null ? Math.round(duracaoS) : null, resp, registradoPor, hoje()).lastInsertRowid);
    return porId(id);
  } catch (e) {
    rmSync(caminho, { force: true });
    throw e;
  }
}

const SEM_ARQUIVO = `id, crianca_id, campo, mime, bytes, duracao_s, responsavel, registrado_por, criado_em`;

export function porId(id) {
  const l = get(`SELECT ${SEM_ARQUIVO} FROM consentimento_evidencia WHERE id = ?`, id);
  if (!l) throw erro(404, 'Essa gravação não está no sistema.');
  return l;
}

/** As gravações de uma criança, SEM o nome do arquivo — ele não vai à tela. */
export function daCrianca(criancaId) {
  return all(
    `SELECT e.${SEM_ARQUIVO.split(', ').join(', e.')}, g.rotulo, ed.nome AS registrado_por_nome
       FROM consentimento_evidencia e
       JOIN governanca_campo g ON g.campo = e.campo
       LEFT JOIN educador ed ON ed.id = e.registrado_por
      WHERE e.crianca_id = ? ORDER BY e.criado_em DESC, e.id DESC`, criancaId);
}

/** Quantas gravações cada criança tem, por campo — para a tela de consentimentos. */
export function contagemPorCrianca() {
  const m = new Map();
  for (const l of all(`SELECT crianca_id, campo, COUNT(*) AS n FROM consentimento_evidencia GROUP BY crianca_id, campo`))
    m.set(`${l.crianca_id}:${l.campo}`, l.n);
  return m;
}

/** Os bytes, para a rota que devolve o vídeo. Falha alto se o arquivo sumiu. */
export function bytesDe(id) {
  const l = get(`SELECT * FROM consentimento_evidencia WHERE id = ?`, id);
  if (!l) throw erro(404, 'Essa gravação não está no sistema.');
  const caminho = join(DIR, l.arquivo);
  if (!existsSync(caminho))
    throw erro(410, 'A linha existe, mas o arquivo do vídeo não está mais nesta máquina. Isso é perda de prova — registre de novo.');
  return { buffer: readFileSync(caminho), mime: l.mime, bytes: statSync(caminho).size, linha: porId(id) };
}

/**
 * Apagar existe por UM motivo: revogação a pedido do titular (Art. 18, VI).
 * Não é botão de arrumação de tela — por isso pede o motivo e devolve o que
 * apagou, para o log de acesso guardar o desfecho.
 */
export function apagar(id, { motivo }) {
  const l = get(`SELECT * FROM consentimento_evidencia WHERE id = ?`, id);
  if (!l) throw erro(404, 'Essa gravação não está no sistema.');
  if (!String(motivo ?? '').trim())
    throw erro(422, 'Apagar a prova do consentimento exige o motivo — normalmente, o pedido do responsável.');
  rmSync(join(DIR, l.arquivo), { force: true });
  run(`DELETE FROM consentimento_evidencia WHERE id = ?`, id);
  return { apagado: id, crianca_id: l.crianca_id, campo: l.campo, motivo: String(motivo).trim() };
}
