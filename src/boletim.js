// Percurso — o boletim de UMA criança, para quem responde por ela (decisão 42).
//
// O PEDIDO, literal: "essa parte de recado com um link para já mandar para o
// WhatsApp coloque também na parte de cada criança, para facilitar enviar para
// o responsável da criança todos os dados e ficha da criança, presença nas
// classes, evolução socioemocional, enfim toda a informação da criança que tem
// registro no Instituto Ebenézer".
//
// POR QUE ISTO NÃO CONTRADIZ "da turma, nunca de uma criança".
// A regra do recado (src/recado.js) existe por causa do DESTINATÁRIO: o grupo
// de pais. Mandar o nome e a falta de uma criança para trinta responsáveis é
// vazamento — `docs/PESQUISA-WHATSAPP.md:69` já diz que nem à mão deveria sair.
// Aqui o destinatário é UM: o responsável legal daquela criança, que é quem
// exerce o direito de acesso do titular (LGPD Art. 18, II). Negar o dado a ele
// não protegeria ninguém — negaria um direito.
//
// O QUE NÃO ENTRA, e é decisão, não esquecimento:
//   · o relato livre sobre a criança (F7) — é anotação clínica interna da
//     equipe, escrita para pensar o caso, não para ser lida pela família sem
//     conversa. A decisão 38 fez dele o dado mais restrito do produto; despejá-lo
//     num WhatsApp desfaria isso de uma vez.
//   · o texto do alerta e da tratativa — o mesmo motivo, e mais um: alerta é
//     assunto de conversa, não de mensagem.
//   · nível por âncora (1–4) da rubrica: é vocabulário técnico interno. Para
//     fora vai a leitura que a própria casa usa — piorou/manteve/evoluiu.
// Quem quiser dar o resto dá pessoalmente. O boletim não fecha essa porta; ele
// só não a abre sozinha, num aplicativo de mensagem.
import { get } from './db.js';
import { formatarParaWhatsApp } from './canais.js';
import * as D from './domain.js';
import { ROTULO_EVOLUCAO } from './planilha.js';

const DATA = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

/**
 * Monta o boletim. Não persiste — é lido do que já está registrado, na hora,
 * como o recado da turma. Nada de novo nasce aqui.
 */
export function boletimDaCrianca(criancaId) {
  const f = D.fichaCrianca(criancaId);
  const c = f.crianca;

  const matriculas = f.matriculas.filter(m => m.status === 'ativa');
  const presencasP = f.presencas.filter(p => p.status === 'P').length;

  // Evolução por indicador, na língua da casa — piorou/manteve/evoluiu, que são
  // as palavras que a própria equipe usa (decisão 34).
  //
  // A COMPARAÇÃO É FEITA SOBRE O NÍVEL DA RUBRICA (1–4), não sobre a nota 0–2 da
  // planilha, e a diferença importa. `NIVEL_PARA_PLANILHA` colapsa 2 e 3 na mesma
  // nota: uma criança que foi de 2 para 3 sairia daqui como "manteve", e a
  // família leria estagnação onde houve avanço. O mapeamento existe para falar
  // com a planilha da outra organização; para falar com a mãe, ele só perde
  // informação. Dentro da casa as duas leituras convivem — a ficha mostra as
  // duas, e diz quando divergem.
  const t = f.trajetoria;
  const doisCiclos = t.ciclos.length >= 2 ? t.ciclos.slice(-2) : [];
  const DELTA = { avancou: 2, estavel: 1, recuou: 0 };
  const evolucao = doisCiclos.length
    ? t.dimensoes.map((d) => {
        const e = DELTA[d.mudanca];
        return { dimensao: d.dimensao, leitura: e == null ? null : ROTULO_EVOLUCAO[e] };
      }).filter(l => l.leitura)
    : [];

  const aspiracao = c.aspiracao ?? null;

  const linhas = [];
  linhas.push(`Instituto Ebenézer — acompanhamento de ${c.nome}`);
  linhas.push('');
  if (matriculas.length) {
    linhas.push('Está matriculada em:');
    for (const m of matriculas)
      linhas.push(`· ${m.programa}${m.turma ? ` — ${m.turma}` : ''}, desde ${DATA(m.entrada)}`);
    linhas.push('');
  }

  if (f.presencas.length) {
    linhas.push(`Presença: ${f.presenca_pct}% no histórico (${presencasP} de ${f.presencas.length} nos últimos encontros).`);
    if (f.ausencias_consecutivas >= 2)
      linhas.push(`Faltou nos ${f.ausencias_consecutivas} últimos encontros — se estiver acontecendo alguma coisa, fale com a gente.`);
    linhas.push('');
  }

  if (evolucao.length) {
    linhas.push(`Como vemos ${c.nome.split(' ')[0]} entre ${doisCiclos[0].nome} e ${doisCiclos[1].nome}:`);
    for (const e of evolucao) linhas.push(`· ${e.dimensao}: ${e.leitura}`);
    linhas.push('');
  }

  if (aspiracao) {
    linhas.push(`No Laboratório de Sonhos, o que ${c.nome.split(' ')[0]} disse querer: ${aspiracao}.`);
    linhas.push('');
  }

  linhas.push('Qualquer dúvida sobre este acompanhamento, fale com a equipe do Instituto. '
    + 'Este resumo é do registro que temos até hoje e vai só para quem responde pela criança.');

  const texto = linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return {
    crianca: { id: c.id, nome: c.nome, codigo: c.codigo },
    responsavel: c.responsavel,
    contato: c.responsavel_contato ?? null,
    contato_legivel: c.responsavel_contato ? D.contatoLegivel(c.responsavel_contato) : null,
    texto,
    whatsapp_url: c.responsavel_contato
      ? `https://wa.me/${c.responsavel_contato}?text=${encodeURIComponent(formatarParaWhatsApp(texto))}`
      : null,
    // O que ficou de fora, dito na tela — para quem envia saber que ficou, e
    // por quê. Silêncio aqui viraria "o sistema não tinha o dado".
    fora: [
      ...(get(`SELECT COUNT(*) AS n FROM relato_crianca WHERE crianca_id = ?`, criancaId).n
        ? ['o relato livre da equipe sobre a criança (uso interno)'] : []),
      ...(f.alerta ? ['o alerta em aberto e a tratativa — isso é conversa, não mensagem'] : []),
      'o nível por âncora da rubrica (1 a 4), que é vocabulário interno',
    ],
    gerado_em: D.hoje(),
  };
}
