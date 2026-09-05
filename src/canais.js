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
