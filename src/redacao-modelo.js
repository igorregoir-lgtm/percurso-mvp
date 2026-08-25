// Percurso — redação por modelo COM verificação de fidelidade numérica.
//
// POR QUE ISTO EXISTE. A doutrina do produto sempre foi "nenhum número que não
// venha do banco". Enquanto o texto era template, isso era garantido por
// construção: o número só chegava à tela por interpolação. No instante em que o
// modelo passa a REDIGIR a síntese e o relatório do doador, a garantia deixa de
// ser estrutural — e precisa virar VERIFICAÇÃO. Sem esta camada, um "13,6
// meses" que o modelo escreveu como "14 meses" sairia num documento que a
// diretoria assina e o financiador lê.
//
// A CADEIA, na ordem, e nenhuma etapa é opcional:
//   1. os números são calculados em SQL (fora daqui) e entram no prompt como
//      FATOS explícitos;
//   2. o modelo escreve a prosa;
//   3. `conferirNumeros` extrai TODO numeral do texto gerado e recusa o texto
//      inteiro se algum não estiver na lista de valores permitidos;
//   4. `revisarSobreAlegacao` barra verbo causal forte e exige a ressalva;
//   5. qualquer reprovação cai no TEMPLATE determinístico — o texto que o
//      produto já sabia escrever;
//   6. o resultado é rotulado como escrito por modelo e NÃO revisado por
//      humano, e continua atrás da mesma aprovação humana de sempre.
//
// O modelo aqui é redator, nunca fonte. Ele não pode inventar um número porque
// todo número que ele escrever é conferido contra o banco antes de existir na
// tela.
import { conversar, AI_ENABLED } from './ai-client.js';
import { comVaga } from './fila-modelo.js';
// O revisor de sobre-alegação chega por INJEÇÃO, não por import: domain.js
// passou a importar este módulo, e um ciclo de import entre os dois é frágil.
// Pelo mesmo motivo do orquestrador do Passo, este arquivo não alcança o
// domínio — ele recebe tudo o que precisa.

// DESLIGADO POR PADRÃO, e a razão é medida, não cautelosa.
//
// Com todos os portões deste módulo valendo — e cada um deles nasceu de um
// defeito real e reproduzível do Qwen3-4B —, a taxa de aceitação medida na
// síntese e no relatório do doador foi de **0 em 16 chamadas**:
//   · 6 reprovações por uso de número (reatribuiu uma contagem a outro
//     conceito, ou repetiu um número para dizer outra coisa);
//   · 10 por apagar ou inventar uma declaração obrigatória ao leitor.
//
// Ou seja: neste porte de modelo, prosa segura e prosa útil não coexistem
// nestes dois documentos. A infraestrutura fica pronta e testada, e ligar é uma
// variável de ambiente — mas ligar HOJE só adiciona latência para cair no mesmo
// template. Num modelo maior (o hardware comporta um Qwen 14B/30B) esta conta
// muda, e é aí que vale reavaliar: `AI_REDATOR=1`.
export const AI_REDATOR = AI_ENABLED &&
  ['1', 'true'].includes(String(process.env.AI_REDATOR ?? '').toLowerCase());

const conta = {
  chamadas: 0, aceitos: 0,
  veto_numero: 0, veto_conjunto: 0, veto_crianca: 0, veto_obrigatoria: 0, veto_revisor: 0, veto_vazio: 0, falhou: 0, desligado: 0,
  ultimo_numero_invalido: null,
};
export const estatisticasRedacao = () => ({ ...conta });

// --------------------------------------------------------------------------
// Fidelidade numérica.
// --------------------------------------------------------------------------
/**
 * Numeral escrito → número. Convenção pt-BR: ponto é MILHAR, vírgula é DECIMAL.
 * A primeira versão disto fazia `replace(/\./g,'')` cego e transformava "2.4"
 * (o valor vindo do banco) em "24" — a lista de permitidos enchia de lixo e o
 * verificador recusava números legítimos enquanto aceitava inventados.
 */
function paraNumero(s) {
  let t = String(s ?? '').trim();
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');       // 48.200,50
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');      // 48.200
  const n = Number(t);                                                   // 2.4 fica 2.4
  return Number.isFinite(n) ? n : null;
}
const chave = (n) => String(Math.round(n * 100) / 100);

/** Todos os VALORES que o texto pode conter, derivados dos fatos. */
export function numerosPermitidos(fatos) {
  const ok = new Set();
  const por = (v) => {
    const n = paraNumero(v);
    if (n == null) return;
    // SÓ o valor exato. A versão anterior também permitia o arredondado, com a
    // justificativa de acomodar inteiros — que é falsa: para inteiro o
    // arredondado é o próprio número. O que aquilo habilitava era só desvio em
    // decimal, deixando "13,6 meses" virar "14 meses" — exatamente o defeito
    // que este módulo existe para impedir.
    ok.add(chave(n));
  };
  const andar = (v) => {
    if (v == null || typeof v === 'boolean') return;
    if (Array.isArray(v)) { v.forEach(andar); return; }
    if (typeof v === 'object') { Object.values(v).forEach(andar); return; }
    if (typeof v === 'number') { por(v); return; }
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return;   // data: tratada à parte, ver abaixo
    por(s);
  };
  andar(fatos);
  // Numerais de ESTRUTURA do texto, não de dado: "os sete blocos", "de 1 a 4".
  for (const n of [0, 1, 2, 3, 4, 5, 6, 7]) ok.add(chave(n));
  return ok;
}

/** As datas dos fatos, nas formas que um texto em pt-BR usaria. */
export function datasPermitidas(fatos) {
  const ok = new Set();
  const andar = (v) => {
    if (v == null) return;
    if (Array.isArray(v)) { v.forEach(andar); return; }
    if (typeof v === 'object') { Object.values(v).forEach(andar); return; }
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) { ok.add(`${m[3]}/${m[2]}/${m[1]}`); ok.add(`${m[1]}-${m[2]}-${m[3]}`); }
  };
  andar(fatos);
  return ok;
}

/**
 * A trava FORTE: o texto reescrito tem que usar EXATAMENTE os mesmos números do
 * texto determinístico — mesmo conjunto, mesma quantidade de vezes.
 *
 * Fidelidade numérica não é fidelidade semântica, e isto foi medido: pedindo ao
 * 4B que compusesse a síntese a partir dos fatos em JSON, ele escreveu "67
 * crianças foram observadas em 106 atividades" — o 106 é o número de crianças
 * ATIVAS, não de atividades. Todo número era verdadeiro e a frase era falsa.
 *
 * Com esta trava, o pedido ao modelo deixa de ser "componha a partir destes
 * dados" e passa a ser "reescreva este texto correto com outro tom": as
 * ligações número↔significado já vêm certas do template, e o modelo não pode
 * acrescentar, remover nem repetir um número para reatribuí-lo.
 */
export function soUsaNumerosDe(gerado, determinado) {
  const extrair = (t) => (String(t ?? '').match(/\d[\d.,]*/g) ?? [])
    .map(x => paraNumero(x.replace(/[.,]+$/, '')))
    .filter(n => n != null).map(chave);
  const disponivel = new Map();
  for (const k of extrair(determinado)) disponivel.set(k, (disponivel.get(k) ?? 0) + 1);
  const usados = extrair(gerado);
  for (const k of usados) {
    const resta = disponivel.get(k) ?? 0;
    // Repetir um número que aparece uma vez só no original é o jeito mais fácil
    // de reatribuí-lo a outro conceito — por isso a contagem, não só o conjunto.
    if (resta <= 0) return { ok: false, motivo: `usou "${k}", que não está (ou não sobra) no texto conferido` };
    disponivel.set(k, resta - 1);
  }
  const omitidos = [...disponivel.values()].reduce((a, b) => a + b, 0);
  return { ok: true, omitidos };
}

// LINT DE ATRIBUIÇÃO À CRIANÇA — a violação de doutrina que nenhum verificador
// numérico pega, porque nela todo número está certo.
//
// Medido: pedindo ao 4B que reescrevesse a síntese, ele produziu «"Expressão
// emocional" ficou com 2,13 de 4, o que mostra que muitas crianças ainda têm
// dificuldade em mostrar como se sentem». O número é verdadeiro; a frase é
// proibida. A rubrica mede COMPORTAMENTO OBSERVADO num período — ela não
// diagnostica capacidade, dificuldade nem traço de criança nenhuma. O produto
// inteiro é construído sobre "nenhum escore pontua a criança"; deixar o modelo
// escrever essa inferência num documento que a coordenação assina desfaz isso
// em uma frase.
const ATRIBUI_A_CRIANCA = /(crian[çc]as?|alunos?|elas?|eles)\s+(ainda\s+)?(t[êe]m|tem|possuem|apresentam|demonstram|revelam|sofrem|carecem|s[ãa]o)\s+(dificuldade|problema|defici|defas|limita|atraso|falta de|imatur)|(mostra|mostram|indica|indicam|revela|revelam|sugere|sugerem|comprova|evidencia)\s+que\s+([oa]s\s+)?(crian[çc]as?|alunos?|elas|eles)\s|n[íi]vel\s+(baixo|alto)\s+de\s+(matur|desenvolv|capacid)/i;
export const semAtribuicaoACrianca = (t) => !ATRIBUI_A_CRIANCA.test(String(t ?? ''));

// DIVULGAÇÕES OBRIGATÓRIAS — as frases que existem porque o documento tem que
// dizê-las, e que o modelo apaga sem querer ao parafrasear. Medido: o smoke
// reprovou três de uma vez (a âncora acadêmica declarada como não ingerida, a
// regra de supressão explicada ao leitor, e o recorte de vínculo da carta).
// Não são estilo: são o que torna o documento honesto com quem o lê.
//
// A regra é condicional e por isso não engessa a reescrita: se a frase está no
// texto conferido, ela TEM que sobreviver; se não está, ninguém a exige.
const OBRIGATORIAS = [
  /fatores externos n[ãa]o foram isolados/i,
  /n[ãa]o é ingerid|n[ãa]o entra aqui/i,
  /agrupad[oa]s ou suprimid[oa]s/i,
  /n[ãa]o é publicad[oa] neste período/i,
  /por criança única/i,
  /por matrícula/i,
  /crianças únicas e \d+ matrículas/i,
  /crianças estão no instituto há mais de um ano/i,
  /há mais de (um ano|doze meses)/i,
  /n[ãa]o efeito medido/i,
  /nenhuma expira|não expira/i,
];

/**
 * SIMÉTRICA, e é por isso que ela funciona: cada declaração protegida tem que
 * estar no texto reescrito se — e SOMENTE SE — estiver no texto conferido.
 *
 * A primeira versão só exigia preservação, e cada rodada quebrava uma frase
 * diferente: o modelo apagava a âncora acadêmica, depois a regra de supressão,
 * depois a manchete de vínculo. Mas o lado que faltava era o mais perigoso:
 * nada impedia o modelo de ACRESCENTAR "crianças estão no instituto há mais de
 * um ano" a uma capa em que esse recorte foi SUPRIMIDO por ter menos de cinco
 * crianças. Aí a paráfrase não apaga uma verdade — publica uma mentira, no
 * documento que o financiador lê.
 */
export function preservaObrigatorias(gerado, determinado) {
  for (const re of OBRIGATORIAS) {
    const tinha = re.test(determinado), tem = re.test(gerado);
    if (tinha && !tem) return { ok: false, faltando: String(re) };
    if (!tinha && tem) return { ok: false, inventada: String(re) };
  }
  return { ok: true };
}

/**
 * Recusa o texto INTEIRO se qualquer numeral nele não vier dos fatos. Recusa o
 * texto, não o numeral: um documento com um número inventado não é um documento
 * com um erro — é um documento em que não dá para confiar.
 *
 * As DATAS são conferidas primeiro e removidas do texto. Sem isso, o dia e o
 * mês de uma data válida (o "20" de 20/09/2026) viravam contagens permitidas, e
 * "cerca de 20 crianças" passava.
 */
export function conferirNumeros(texto, permitidos, datas = new Set()) {
  let t = String(texto ?? '');
  const nasDatas = t.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/g) ?? [];
  for (const d of nasDatas) {
    if (!datas.has(d)) return { ok: false, invalido: d, tipo: 'data' };
    t = t.split(d).join(' ');
  }
  const achados = t.match(/\d[\d.,]*/g) ?? [];
  for (const bruto of achados) {
    const limpo = bruto.replace(/[.,]+$/, '');
    const n = paraNumero(limpo);
    if (n == null || !permitidos.has(chave(n))) return { ok: false, invalido: limpo, tipo: 'numero' };
  }
  return { ok: true };
}

/**
 * Redige com o modelo, ou devolve o template. NUNCA lança.
 *
 * @param {object}   o
 * @param {string}   o.sistema     regras do redator (persona + proibições)
 * @param {string}   o.pedido      a instrução + os FATOS (números já calculados)
 * @param {object}   o.fatos       de onde sai a lista de números permitidos
 * @param {string}   o.determinado o texto do template — o fallback e o piso
 * @param {Function} [o.revisor]   revisarSobreAlegacao, injetado (ver acima)
 * @param {number}   [o.maxTokens]
 * @returns {Promise<{texto, origem: 'modelo'|'deterministico', rotulo, motivo?}>}
 */
export async function redigirComModelo({ sistema, pedido, fatos, determinado, revisor = null, maxTokens = 900 }) {
  const cair = (motivo) => ({
    texto: determinado, origem: 'deterministico', rotulo: null, motivo,
  });
  if (!AI_REDATOR) { conta.desligado++; return cair('desligado'); }

  try {
    conta.chamadas++;
    const { texto } = await comVaga(() => conversar({
      papel: 'reflexivo', maxTokens, temperatura: 0.3,
      mensagens: [{ role: 'system', content: sistema }, { role: 'user', content: pedido }],
    }));
    let corpo = String(texto ?? '').trim();
    let omitidos = 0;
    if (!corpo) { conta.veto_vazio++; return cair('vazio'); }

    // A ressalva é da doutrina, não do modelo: se ele esqueceu, ela é anexada
    // antes do revisor — mas o revisor ainda tem que aprovar o resto.
    if (!/fatores externos n[aã]o foram isolados/i.test(corpo))
      corpo += '\n\nA leitura é de associação: fatores externos não foram isolados.';

    // MODO REESCRITA (o único usado hoje): a trava é o conjunto de números ser
    // idêntico ao do texto determinístico. Se é idêntico, cada número já veio
    // do banco por definição — e o modelo não pôde acrescentar, remover nem
    // repetir um número para reatribuí-lo a outro conceito.
    if (determinado) {
      const mesmo = soUsaNumerosDe(corpo, determinado);
      if (!mesmo.ok) { conta.veto_conjunto++; return cair(`conjunto:${mesmo.motivo}`); }
      omitidos = mesmo.omitidos;
    } else {
      // MODO COMPOSIÇÃO (sem texto de referência): resta conferir cada numeral
      // contra os fatos. É mais fraco — permite número verdadeiro em frase
      // falsa — e por isso não é o caminho da síntese nem do relatório.
      const num = conferirNumeros(corpo, numerosPermitidos(fatos), datasPermitidas(fatos));
      if (!num.ok) {
        conta.veto_numero++;
        conta.ultimo_numero_invalido = num.invalido;
        return cair(`numero_invalido:${num.invalido}`);
      }
    }

    if (!semAtribuicaoACrianca(corpo)) { conta.veto_crianca++; return cair('atribuicao_a_crianca'); }

    if (determinado) {
      const obr = preservaObrigatorias(corpo, determinado);
      if (!obr.ok) { conta.veto_obrigatoria++; return cair(obr.faltando ? `divulgacao_apagada:${obr.faltando}` : `divulgacao_inventada:${obr.inventada}`); }
    }

    const rev = revisor ? revisor(corpo) : { status: 'aprovado', notas: [] };
    if (rev.status !== 'aprovado') { conta.veto_revisor++; return cair(`revisor:${rev.notas.join(' ')}`); }

    conta.aceitos++;
    return {
      texto: corpo, origem: 'modelo',
      omitidos,
      rotulo: 'Rascunho escrito por modelo local. Nenhum número foi inventado: todos vieram do '
        + 'banco e foram conferidos um a um contra a versão automática'
        + (omitidos ? `, que traz ${omitidos} número(s) a mais — o texto original está abaixo` : '')
        + '. A redação NÃO foi revisada por humano: confira antes de aprovar.',
    };
  } catch (e) {
    conta.falhou++;
    return cair(e?.causa ?? 'falhou');
  }
}

export const SISTEMA_REDATOR = `Você redige documentos de prestação de contas de uma organização
socioeducativa brasileira (Instituto Ebenézer, Jardim Ângela, São Paulo), em português do Brasil.

REGRAS INEGOCIÁVEIS:
1. Use SOMENTE os números que aparecem nos FATOS que você recebeu. Nunca calcule, arredonde,
   estime, projete ou invente um número. Se um número não está nos FATOS, ele não existe.
2. Nunca afirme causalidade. São PROIBIDAS as palavras: causou, gerou, provou, comprova,
   garante, resultou em, graças a, por causa de, transformou, contribuiu (em qualquer forma).
   Escreva "crianças com maior presença apresentam", nunca "o programa causou".
3. Nunca escreva nome de criança, nem invente exemplo de caso individual.
3b. NUNCA diga o que uma criança sente, tem ou é capaz de fazer. As médias da rubrica descrevem
   COMPORTAMENTO OBSERVADO pela equipe num período — nunca dificuldade, capacidade, maturidade
   ou traço de criança. É proibido escrever "as crianças têm dificuldade em…", "mostra que as
   crianças…", "nível baixo de maturidade". Descreva o que a equipe REGISTROU, não o que a
   criança seria.
4. Termine com a frase literal: "A leitura é de associação: fatores externos não foram isolados."
5. Tom de carta ao leitor, não de relatório de sistema: frases curtas, palavras do dia a dia,
   e o que cada número significa para uma criança — nunca para o método.
6. Não use título, cabeçalho, marcador nem lista. Só parágrafos.
7. Você RECEBE um texto já correto e o REESCREVE com outro tom. Mantenha cada número ligado
   exatamente à mesma coisa a que ele está ligado no original: se o texto diz "106 crianças
   ativas", você não pode escrever "106 atividades". Você pode DEIXAR DE FORA um número se a frase ficar melhor, mas nunca acrescentar um que não esteja lá, nem repetir um para dizer outra coisa.
8. Copie as DATAS exatamente como estão, no formato dd/mm/aaaa. Não escreva o mês por extenso
   e não mude a ordem dos campos.
9. Se o texto original declara um LIMITE ao leitor — que algo não é publicado, que um dado não
   entra, que grupos pequenos são agrupados ou suprimidos, que o custo sai por criança única e
   por matrícula —, repita essa declaração. Ela não é enfeite: é o que torna o documento
   honesto com quem o lê. Encurtar o texto nunca pode ser apagar um limite.`;
