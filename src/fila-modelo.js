// Percurso — fila única de acesso ao modelo local.
//
// Estava dentro de src/copilot.js. Saiu para cá por um motivo de arquitetura, e
// não de organização: o orquestrador do Passo (src/passo/orquestrador.js) é o
// módulo que fala com o modelo e por isso NÃO PODE alcançar o banco — nem
// transitivamente. Enquanto a fila morava no copilot, importar `comVaga` de lá
// arrastava domain.js e db.js junto, e a cerca virava decoração.
//
// TODA chamada ao modelo passa por aqui — copilot, extrator, SROI, Passo. O
// llama-server sobe com --parallel 2; chamada por fora da fila degradaria todo
// mundo em timeouts encadeados.
//
// Este módulo é PURO: sem banco, sem domínio, sem rede. Só a contagem.
const MAX_CONCORRENTES = 2;
const MAX_ESPERA = 4;
let emVoo = 0;
const fila = [];

const ocupado = () => {
  const e = new Error('O copilot está ocupado agora. Tente de novo em instantes — o registro manual continua funcionando.');
  e.status = 503;
  e.causa = 'ocupado';
  return e;
};

/**
 * @param {Function} fn  o trabalho que fala com o modelo
 * @param {{prioridade?: 'interativo'|'fundo'}} opcoes
 *   'interativo' (padrão): entra na fila e espera até o teto — quem está
 *      olhando a tela merece a vaga.
 *   'fundo': DESISTE na hora se houver qualquer disputa. É o refinamento do
 *      painel do Passo, que só melhora rótulos de um painel JÁ pintado —
 *      esperar por ele seria roubar vaga de uma reflexão de verdade.
 */
export async function comVaga(fn, { prioridade = 'interativo' } = {}) {
  if (prioridade === 'fundo' && (emVoo > 0 || fila.length > 0)) throw ocupado();
  if (emVoo >= MAX_CONCORRENTES) {
    if (fila.length >= MAX_ESPERA) throw ocupado();
    await new Promise(res => fila.push(res));
  }
  emVoo++;
  try { return await fn(); }
  finally {
    emVoo--;
    const proximo = fila.shift();
    if (proximo) proximo();
  }
}

/** Só para teste e para a autocrítica — nunca para decidir comportamento. */
export const estadoDaFila = () => ({ emVoo, esperando: fila.length, max: MAX_CONCORRENTES, teto: MAX_ESPERA });
