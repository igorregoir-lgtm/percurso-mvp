// Percurso — os canais por onde o Instituto fala, e o disparo em fila (dec. 47).
//
// O PEDIDO, e o que dele é possível. Em 04/09/2026: *"crie uma integração com
// WhatsApp na qual é possível compartilhar conteúdo com diversos grupos ao mesmo
// tempo… que ao clicar um botão não precise ficar depois clicando em cada grupo,
// mas que os grupos já estejam pré-cadastrados no próprio artefato"*.
//
// A METADE QUE NÃO EXISTE, e é melhor dizer do que descobrir depois:
// **mandar para um grupo de WhatsApp já existente, sem toque humano, não é
// possível.** Não é limitação deste produto — é desenho da Meta, e está medido
// em `docs/PESQUISA-WHATSAPP.md`:
//   · a Groups API oficial só cria grupos NOVOS de até 8 pessoas, e exige o selo
//     Official Business Account, negado à maioria;
//   · a Cloud API é 1-para-1: chega ao responsável, nunca ao grupo;
//   · as bibliotecas não oficiais (Baileys, whatsapp-web.js) postam em grupo e
//     violam os Termos — o preço possível é o número, que é o único canal do
//     Instituto com as famílias.
// Prometer o botão único aqui seria escrever uma frase que o WhatsApp desmente
// na primeira tentativa.
//
// A METADE QUE EXISTE, e é onde estava o tempo dela. O que custa caro hoje não é
// o toque: é montar o texto, lembrar quais grupos existem, decidir o que pode ir
// para cada um, e perder a conta de quais já receberam. Isso o produto resolve
// inteiro:
//   1. os grupos ficam CADASTRADOS, com público declarado;
//   2. o texto é montado UMA vez e copiado UMA vez;
//   3. a fila lembra onde ela parou, e o que já saiu fica registrado.
// Sobra um toque por grupo — que é o toque que a Meta exige, e só ele.
import { randomBytes } from 'node:crypto';
import { all, get, run } from './db.js';
import { erro, hoje, textoObrigatorio } from './domain.js';

export const TIPOS = Object.freeze([
  { id: 'whatsapp', rotulo: 'Grupo de WhatsApp' },
  { id: 'instagram', rotulo: 'Perfil de Instagram' },
]);

// O público NÃO é etiqueta: é o que decide o que pode ser montado para ele.
// A tabela é a do §4 da pesquisa de WhatsApp, virada em código.
export const PUBLICOS = Object.freeze([
  { id: 'pais', rotulo: 'Responsáveis da turma',
    pode: ['recado'],
    nao: 'Presença nominal nunca — repassar o dado de cada criança aos outros pais é tratamento sem base legal (LGPD Art. 14 §3º).' },
  { id: 'apoiadores', rotulo: 'Apoiadores e doadores',
    pode: ['carta', 'card'],
    nao: 'Nada individual, nem por código: para fora da organização só o agregado, com supressão de célula pequena.' },
  { id: 'equipe', rotulo: 'Equipe do Instituto',
    pode: ['recado', 'carta', 'pauta'],
    nao: 'Conteúdo de atendimento continua fora — grupo de trabalho não é prontuário.' },
]);

export const CONTEUDOS = Object.freeze({
  recado: { rotulo: 'Recado da turma', escopo: 'turma' },
  carta:  { rotulo: 'Carta do período', escopo: 'periodo' },
  card:   { rotulo: 'Card do período (imagem)', escopo: 'periodo' },
  pauta:  { rotulo: 'Pauta da semana', escopo: 'turma' },
});

const LINK_GRUPO = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{6,}$/;
const PERFIL_IG = /^@?[A-Za-z0-9._]{1,30}$/;

/** Normaliza e RECUSA o que não é destino. Link errado só aparece como erro na
 *  mão de quem estava com pressa, no sábado, na frente do grupo. */
export function normalizarDestino(tipo, bruto) {
  const t = String(bruto ?? '').trim();
  if (!t) throw erro(422, 'Falta o destino do canal.');
  if (tipo === 'whatsapp') {
    if (!LINK_GRUPO.test(t))
      throw erro(422, 'O destino de um grupo é o link de convite dele: no WhatsApp, abra o grupo → Dados do grupo → Convidar por link. Fica como https://chat.whatsapp.com/…');
    return t;
  }
  if (!PERFIL_IG.test(t))
    throw erro(422, 'O destino do Instagram é o @ do perfil — só letras, números, ponto e traço baixo.');
  return t.startsWith('@') ? t : `@${t}`;
}

/** O endereço que a tela abre. No Instagram não há "postar por link": o que dá
 *  para fazer é abrir o perfil e deixar a imagem pronta na mão da pessoa. */
export function enderecoDe(canal) {
  return canal.tipo === 'whatsapp'
    ? canal.destino
    : `https://instagram.com/${canal.destino.replace('@', '')}`;
}

export function criarCanal({ tipo, nome, publico, turmaId = null, destino, observacao = null }) {
  if (!TIPOS.some(t => t.id === tipo)) throw erro(422, 'Tipo de canal desconhecido.');
  const pub = PUBLICOS.find(p => p.id === publico);
  if (!pub) throw erro(422, 'Público do canal desconhecido.');
  const n = textoObrigatorio(nome, 'O nome do canal');
  const d = normalizarDestino(tipo, destino);
  if (turmaId != null && !get(`SELECT id FROM turma WHERE id = ?`, turmaId))
    throw erro(404, 'Turma não encontrada.');
  // Instagram é da organização, não de uma turma: amarrar um perfil público a
  // uma turma faria o produto oferecer o recado dela para o mundo.
  if (tipo === 'instagram' && turmaId != null)
    throw erro(422, 'Perfil de Instagram é da organização inteira — não se amarra a uma turma.');
  if (tipo === 'instagram' && publico === 'pais')
    throw erro(422, 'Instagram é público. O recado da turma vai para o grupo dos responsáveis, não para o perfil aberto.');
  const igual = get(`SELECT id, nome FROM canal WHERE tipo = ? AND destino = ?`, tipo, d);
  if (igual) throw erro(409, `Esse destino já está cadastrado como "${igual.nome}".`, { canal_id: igual.id });
  const id = Number(run(
    `INSERT INTO canal (tipo, nome, publico, turma_id, destino, observacao, ativo, criado_em)
     VALUES (?,?,?,?,?,?,1,?)`,
    tipo, n, publico, turmaId, d, (observacao || '').trim() || null, hoje()).lastInsertRowid);
  return porId(id);
}

export function editarCanal(id, { nome, publico, turmaId = null, destino, observacao = null }) {
  const c = get(`SELECT * FROM canal WHERE id = ?`, id);
  if (!c) throw erro(404, 'Canal não encontrado.');
  const pub = PUBLICOS.find(p => p.id === publico);
  if (!pub) throw erro(422, 'Público do canal desconhecido.');
  const n = textoObrigatorio(nome, 'O nome do canal');
  const d = normalizarDestino(c.tipo, destino);
  const igual = get(`SELECT id, nome FROM canal WHERE tipo = ? AND destino = ? AND id <> ?`, c.tipo, d, id);
  if (igual) throw erro(409, `Esse destino já está cadastrado como "${igual.nome}".`, { canal_id: igual.id });
  run(`UPDATE canal SET nome = ?, publico = ?, turma_id = ?, destino = ?, observacao = ? WHERE id = ?`,
    n, publico, c.tipo === 'instagram' ? null : turmaId, d, (observacao || '').trim() || null, id);
  return porId(id);
}

/** Arquivar, não apagar — decisão 30 vale aqui também: o histórico de disparo
 *  aponta para o canal, e apagar o canal apagaria a prova de que algo saiu. */
export function arquivarCanal(id) {
  if (!get(`SELECT id FROM canal WHERE id = ?`, id)) throw erro(404, 'Canal não encontrado.');
  run(`UPDATE canal SET ativo = 0 WHERE id = ?`, id);
  return porId(id);
}
export function reativarCanal(id) {
  if (!get(`SELECT id FROM canal WHERE id = ?`, id)) throw erro(404, 'Canal não encontrado.');
  run(`UPDATE canal SET ativo = 1 WHERE id = ?`, id);
  return porId(id);
}

const SELECAO = `c.*, t.nome AS turma,
  (SELECT em FROM disparo d WHERE d.canal_id = c.id ORDER BY d.em DESC, d.id DESC LIMIT 1) AS ultimo_envio`;

export function porId(id) {
  const c = get(`SELECT ${SELECAO} FROM canal c LEFT JOIN turma t ON t.id = c.turma_id WHERE c.id = ?`, id);
  if (!c) throw erro(404, 'Canal não encontrado.');
  return { ...c, endereco: enderecoDe(c) };
}

export function listarCanais({ incluirArquivados = false } = {}) {
  return all(
    `SELECT ${SELECAO} FROM canal c LEFT JOIN turma t ON t.id = c.turma_id
      ${incluirArquivados ? '' : 'WHERE c.ativo = 1'}
      ORDER BY c.tipo, c.publico, c.nome`).map(c => ({ ...c, endereco: enderecoDe(c) }));
}

/** O que PODE ser montado para um público. Fonte única da regra de embalagem. */
export function conteudosDoPublico(publico) {
  return (PUBLICOS.find(p => p.id === publico)?.pode ?? []);
}

/** A trava que importa: conteúdo que o público não pode receber é recusado no
 *  servidor, não escondido no botão. */
export function exigeCompatibilidade(canal, conteudo) {
  if (!CONTEUDOS[conteudo]) throw erro(422, 'Conteúdo desconhecido.');
  if (!conteudosDoPublico(canal.publico).includes(conteudo)) {
    const pub = PUBLICOS.find(p => p.id === canal.publico);
    throw erro(422, `"${CONTEUDOS[conteudo].rotulo}" não vai para ${pub.rotulo.toLowerCase()}. ${pub.nao}`);
  }
  return canal;
}

/** Registra que saiu. O Percurso não envia — quem envia é a pessoa —, mas o
 *  registro do que saiu, para onde e por quem é permanente. */
export function registrarDisparo({ canalId, conteudo, referencia = null, porUsuarioId }) {
  const c = porId(canalId);
  exigeCompatibilidade(c, conteudo);
  run(`INSERT INTO disparo (canal_id, conteudo, referencia, por, em) VALUES (?,?,?,?,?)`,
    canalId, conteudo, referencia, porUsuarioId, new Date().toISOString());
  return porId(canalId);
}

export function disparosRecentes(limite = 20) {
  return all(
    `SELECT d.*, c.nome AS canal, c.tipo, e.nome AS quem
       FROM disparo d JOIN canal c ON c.id = d.canal_id
       LEFT JOIN educador e ON e.id = d.por
      ORDER BY d.em DESC, d.id DESC LIMIT ?`, limite);
}

// ---------------------------------------------------------------------------
// O QUE JÁ SAIU HOJE (decisão 50). O erro mais comum de quem manda no sábado
// corrido não é mandar para o grupo errado — é mandar DUAS vezes para o certo.
// O servidor sabe, porque o disparo fica registrado; a tela desmarca esses
// canais por padrão e diz por quê. Não proíbe: repetir pode ser intencional.
// ---------------------------------------------------------------------------
export function jaRecebeuHoje(conteudo, referencia, { desde = null } = {}) {
  // `desde` vem do cliente: a meia-noite LOCAL de quem manda, em ISO. O
  // servidor guarda `em` em UTC e não sabe o fuso do celular; sem isso, um
  // envio às 21h de sábado em São Paulo seria "ontem" às 21h01.
  const ini = desde && !Number.isNaN(Date.parse(desde))
    ? new Date(desde).toISOString()
    : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  return all(
    `SELECT DISTINCT canal_id FROM disparo
      WHERE conteudo = ? AND COALESCE(referencia, '') = COALESCE(?, '') AND em >= ?`,
    conteudo, referencia ?? null, ini).map(l => l.canal_id);
}

// ---------------------------------------------------------------------------
// O PASSE PARA O CELULAR (decisão 50). A fila é montada onde a coordenação
// está — muitas vezes no notebook, onde não há WhatsApp nem `navigator.share`.
// O passe guarda a fila no servidor por dez minutos, sob um id aleatório, e o
// QR leva o celular direto a ela: sem e-mail, sem cabo, sem digitar.
//
// POR QUE EM MEMÓRIA, E NÃO NO BANCO. É trânsito, não registro: some sozinho,
// é de uso único, e não deve sobreviver a um reinício — se o servidor caiu no
// meio, a pessoa monta de novo (custa um toque). O que fica registrado é o
// DISPARO, quando acontece, como sempre.
// ---------------------------------------------------------------------------
const PASSES = new Map();
const PASSE_TTL_MS = 10 * 60 * 1000;
const PASSE_TETO_BYTES = 64 * 1024;

function limparPasses() {
  const agora = Date.now();
  for (const [id, p] of PASSES) if (p.expira <= agora) PASSES.delete(id);
}

export function criarPasse(fila, { porUsuarioId }) {
  limparPasses();
  const corpo = JSON.stringify(fila ?? null);
  if (!fila || typeof fila !== 'object' || !Array.isArray(fila.canais) || !fila.canais.length)
    throw erro(422, 'Não há fila para passar — monte o envio primeiro.');
  if (Buffer.byteLength(corpo, 'utf8') > PASSE_TETO_BYTES)
    throw erro(413, 'A fila é grande demais para passar por QR. Tire a imagem e passe só o texto.');
  // Nunca a imagem do card: 170 KB em base64 não é trânsito, é peso — e o
  // celular refaz o card em meio segundo do mesmo agregado.
  const enxuta = { ...fila, imagem: null };
  const id = randomBytes(12).toString('base64url');
  PASSES.set(id, { fila: enxuta, por: porUsuarioId, expira: Date.now() + PASSE_TTL_MS });
  return { id, expira_em_s: PASSE_TTL_MS / 1000 };
}

/** Uso único: quem lê, consome. Um QR fotografado por cima do ombro vale por
 *  dez minutos e por uma leitura — e só para quem tem sessão de gestão. */
export function consumirPasse(id) {
  limparPasses();
  const p = PASSES.get(String(id ?? ''));
  if (!p) throw erro(404, 'Este passe não existe mais: passes duram dez minutos e valem por uma leitura. Monte o envio de novo.');
  PASSES.delete(id);
  return p.fila;
}

// ---------------------------------------------------------------------------
// FORMATAÇÃO PARA O WHATSAPP. O WhatsApp entende *negrito*, _itálico_ e
// ~riscado~. O texto do recado chega cru; a primeira linha vira negrito e a
// assinatura vira itálico. Só isso — formatação a mais vira ruído no celular
// de quem lê no ônibus.
// ---------------------------------------------------------------------------
export function formatarParaWhatsApp(texto) {
  const linhas = String(texto ?? '').split('\n');
  if (!linhas.length || !linhas[0].trim()) return String(texto ?? '');
  const primeira = linhas[0].trim();
  linhas[0] = /^\*.*\*$/.test(primeira) ? primeira : `*${primeira}*`;
  const ultima = linhas.length - 1;
  if (/^—\s*\S/.test(linhas[ultima].trim())) linhas[ultima] = `_${linhas[ultima].trim()}_`;
  return linhas.join('\n');
}
