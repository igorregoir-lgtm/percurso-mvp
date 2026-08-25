// Percurso — o Qwen3-4B orquestrando o painel do Passo.
//
// A CERCA: este é o módulo que fala com o modelo, e por isso ele NÃO alcança o
// banco — nem transitivamente. Ele importa `conversar` (ai-client, só rede) e
// `comVaga` (fila-modelo, contador puro). Tudo o mais chega por INJEÇÃO: os
// candidatos já renderizados, o roster para o fusível, a ordem determinística.
// Enquanto a fila morava no copilot, importar `comVaga` arrastava domain e db
// junto e a cerca era decoração; foi por isso que ela mudou de casa.
//
// O QUE O MODELO PODE: reordenar candidatos que o determinístico já autorizou,
// e encurtar/aquecer o RÓTULO de até três deles.
// O QUE O MODELO NÃO PODE, por construção e não por verificação: escrever um
// número (o `rotulo` é livre de dígito por construção — o `texto`, que carrega
// as contagens, nunca vai ao prompt e nunca volta dele), escolher uma ação,
// inventar uma sugestão, sumir com um candidato, ou furar o piso de núcleo e o
// teto de pendência — que rodam DEPOIS dele.
import { conversar } from '../ai-client.js';
import { comVaga } from '../fila-modelo.js';

// A revisão mediu contra o 4B real: a saída mínima deste schema com 8
// candidatos é 162–169 tokens. Com o teto em 160 que o plano trazia,
// `finish_reason=length` em 7/7 amostras e o JSON.parse falhava SEMPRE — o
// caminho do modelo nunca produziria um rótulo. 320 é 2× a saída medida e a
// latência não muda (1,11 s contra 1,09 s).
const MAX_TOKENS = 320;
const TIMEOUT_MS = 2500;

export const PASSO_PAINEL = !['0', 'false'].includes(
  String(process.env.PASSO_PAINEL ?? '').toLowerCase());

// Contadores de EFEITO, não só de erro. Sem eles não dá para defender que a
// orquestração faz diferença — nem para descobrir que ela parou de fazer.
const conta = {
  chamadas: 0, ordem_alterada: 0, rotulo_aceito: 0,
  veto_digito: 0, veto_numeral: 0, veto_imperativo: 0, veto_cobranca: 0, veto_nome: 0, veto_enum: 0,
  falhou: 0, ocupado: 0, desligado: 0,
};
export const estatisticas = () => ({ ...conta });

const NUMERAL = /(^|\s)(um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|dezenas?|centenas?|metade|maioria|quase tod[oa]s?|v[áa]rias?|v[áa]rios|muit[oa]s?|poucas?|poucos)(\s|$|[,.;!?])/i;

// O catálogo escreve rótulo em voz de OFERTA de propósito ("A pauta da semana
// espera sua decisão"). Medido ao vivo, o 4B devolvia "Decida a pauta da
// semana", "Conte seu encontro", "Feche o ciclo" — e nenhum desses casava o
// lint de cobrança, que só pega acusação explícita. O painel inteiro deixava
// de ser conjunto de ofertas e virava lista de comandos, que é exatamente o
// formato que o ranking existe para não produzir. Pedir no prompt não é
// portão; isto é.
const IMPERATIVO = /^(decida|decide|conte|conta|feche|fecha|registre|registra|fa[çc]a|veja|vê|abra|abre|confira|confere|resolva|resolve|publique|publica|revise|revisa|marque|marca|salve|salva|complete|completa|termine|termina|ligue|liga|avise|avisa|corrija|corrige|preencha|preenche|atualize|atualiza|verifique|verifica|olhe|olha|clique|clica|toque|toca|envie|envia|leia|lê)\b/i;

/** Teto de tamanho SEMPRE pós-geração: `maxLength` no schema degrada a
 *  gramática do llama.cpp de ~143 para 1,5 tok/s. */
function cortarNaPalavra(s, max) {
  const t = String(s ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const esp = corte.lastIndexOf(' ');
  return (esp > max * 0.5 ? corte.slice(0, esp) : corte).trim();
}

/**
 * Os portões que um rótulo reescrito atravessa. Reprovado em qualquer um, o
 * rótulo do catálogo permanece — falhar aqui é gratuito e invisível.
 */
export function aceitarRotulo(novo, base, { roster = [], anonimizar = null } = {}) {
  if (typeof novo !== 'string') return base.rotulo;
  const t = cortarNaPalavra(novo, 44);
  if (!t) return base.rotulo;
  if (base.imune) return base.rotulo;                       // doutrina escrita à mão
  if (/\d/.test(t)) { conta.veto_digito++; return base.rotulo; }
  if (NUMERAL.test(t)) { conta.veto_numeral++; return base.rotulo; }
  if (IMPERATIVO.test(t)) { conta.veto_imperativo++; return base.rotulo; }
  if (base.semCobranca && !base.semCobranca(t)) { conta.veto_cobranca++; return base.rotulo; }
  if (/[Cc]rian[çc]as?\s+[A-Z]{1,2}\b/.test(t)) { conta.veto_nome++; return base.rotulo; }
  if (anonimizar && anonimizar(t, roster).substituicoes > 0) { conta.veto_nome++; return base.rotulo; }
  if ((base.nomesProibidos ?? []).some(n => t.includes(n))) { conta.veto_nome++; return base.rotulo; }
  conta.rotulo_aceito++;
  return t;
}

/**
 * Reordena e reescreve rótulos. NUNCA lança e NUNCA demora: falha, timeout,
 * fila ocupada, modelo desligado ou inexistente devolvem a ordem determinística
 * intacta — o painel já está pintado na tela quando isto roda.
 *
 * @param {Array} candidatos  já renderizados: {id, tipo, rotulo, base, nucleo, imune}
 * @param {Function} recompor (ids) => lista final, com piso e travas aplicados
 */
export async function refinarPainel(candidatos, { recompor, roster = [], anonimizar = null, semCobranca = null, ligado = true } = {}) {
  const determinada = candidatos.map(c => c.id);
  if (!ligado || !PASSO_PAINEL || candidatos.length < 2) { conta.desligado++; return { ordem: determinada, rotulos: {}, origem: 'guia' }; }

  const lista = candidatos.slice(0, 8);
  const enumIds = lista.map(c => c.id);
  const schema = {
    name: 'passo_painel',
    schema: {
      type: 'object', required: ['ordem'], additionalProperties: false,
      properties: {
        ordem: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', enum: enumIds } },
        rotulos: {
          type: 'array', maxItems: 3,
          items: {
            type: 'object', required: ['id', 'rotulo'], additionalProperties: false,
            properties: { id: { type: 'string', enum: enumIds }, rotulo: { type: 'string' } },
          },
        },
      },
    },
  };

  // FUSÍVEL DE ENTRADA, não só de saída: candidato cujo rótulo case o roster é
  // derrubado antes de montar o prompt. Nenhum nome tem por onde entrar.
  const seguros = anonimizar
    ? lista.filter(c => anonimizar(c.rotulo, roster).substituicoes === 0)
    : lista;
  if (seguros.length < 2) return { ordem: determinada, rotulos: {}, origem: 'guia' };

  const corpo = seguros.map(c => `  ${c.id} · ${c.tipo} · "${c.rotulo}"`).join('\n');
  try {
    conta.chamadas++;
    const { objeto } = await comVaga(() => conversar({
      papel: 'reflexivo', schema, maxTokens: MAX_TOKENS, timeoutMs: TIMEOUT_MS,
      mensagens: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: `CANDIDATOS (id · tipo · rótulo):\n${corpo}\n\nDevolva a ORDEM que melhor serve a pessoa agora e, se ajudar, um rótulo mais curto e mais quente para até três deles.` },
      ],
    }), { prioridade: 'fundo' });

    // Portões 1-3: id fora do conjunto cai; dedupe; e o que o modelo OMITIU
    // volta na ordem determinística — ele não pode sumir com candidato.
    let ordem = [...new Set((objeto?.ordem ?? []).filter(id => enumIds.includes(id)))];
    if (ordem.length !== (objeto?.ordem ?? []).length) conta.veto_enum++;
    ordem = [...ordem, ...determinada.filter(id => !ordem.includes(id))];
    if (ordem.join('|') !== determinada.join('|')) conta.ordem_alterada++;

    const porId = new Map(lista.map(c => [c.id, c]));
    const rotulos = {};
    for (const r of (objeto?.rotulos ?? [])) {
      const base = porId.get(r?.id);
      if (!base) continue;
      const aceito = aceitarRotulo(r.rotulo, { ...base, semCobranca, nomesProibidos: base.nomesProibidos }, { roster, anonimizar });
      if (aceito !== base.rotulo) rotulos[r.id] = aceito;
    }
    // Portão 4: o piso de núcleo e as travas de composição rodam DEPOIS do
    // modelo. A vaga 1 nunca é dele em dia com sinal núcleo aceso.
    return { ordem: recompor ? recompor(ordem) : ordem, rotulos, origem: 'modelo' };
  } catch (e) {
    if (e?.causa === 'ocupado') conta.ocupado++; else conta.falhou++;
    return { ordem: determinada, rotulos: {}, origem: 'guia' };
  }
}

const PROMPT = `Você organiza o painel de sugestões do Passo, o assistente do aplicativo Percurso,
usado por educadoras, coordenação e diretoria de um instituto socioeducativo.

Você recebe uma lista de sugestões que o sistema JÁ decidiu mostrar. Seu trabalho é só:
1. ORDENAR: coloque primeiro o que serve mais a esta pessoa agora.
2. Opcionalmente, reescrever até três RÓTULOS para ficarem mais curtos e mais humanos.

REGRAS INEGOCIÁVEIS:
- NUNCA escreva número, algarismo ou quantidade por extenso em rótulo nenhum.
- NUNCA invente uma sugestão que não está na lista, e nunca omita uma que está.
- NUNCA escreva no imperativo ("decida", "conte", "feche"): o rótulo é uma OFERTA, não uma ordem.
- NUNCA escreva nada que soe como cobrança ("você não fez", "está atrasada").
- Rótulo tem no máximo 44 caracteres, em português do Brasil, sentence case.
- Se não tiver certeza de que um rótulo ficou melhor, não o reescreva.`;
