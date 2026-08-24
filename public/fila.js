// Percurso — fila de envio offline.
//
// A persona registra dentro da sala, onde a rede cai. Chamada e folha do dia não
// podem depender de conexão: quando o POST falha por REDE, o pedido fica guardado
// no aparelho e sobe sozinho quando a rede volta.
//
// Mora em arquivo próprio, com armazenamento e envio injetados, por um motivo
// prático: é a única parte do front-end que carrega regra de verdade, e regra
// tem que ser testável sem navegador (achado A-04 da auditoria de 22/08/2026).

export const CHAVE = 'percurso_fila';

/**
 * @param {object} p
 * @param {Storage} p.armazenamento     localStorage, ou um duplo nos testes
 * @param {(caminho:string, corpo:object)=>Promise} p.enviar
 * @param {(agora:()=>string)} [p.agora] relógio injetável
 */
export function criarFila({ armazenamento, enviar, agora = () => new Date().toISOString() }) {
  const ler = () => {
    try { return JSON.parse(armazenamento.getItem(CHAVE) || '[]'); } catch { return []; }
  };
  const gravar = (f) => {
    try { armazenamento.setItem(CHAVE, JSON.stringify(f)); } catch { /* cota cheia: o registro atual segue no ar */ }
  };

  return {
    ler,
    tamanho: () => ler().length,
    limpar: () => gravar([]),

    /**
     * Envia; se a rede falhar, enfileira e devolve `{ enviado: false }`.
     * Erro de REGRA (4xx) propaga: enfileirar uma requisição que o servidor
     * recusou por regra faria o sistema tentar para sempre uma gravação que
     * nunca pode acontecer — e esconderia da educadora que algo está errado.
     */
    async enfileirar(caminho, corpo, rotulo) {
      try { await enviar(caminho, corpo); return { enviado: true }; }
      catch (e) {
        if (!e.rede) throw e;
        gravar([...ler(), { caminho, corpo, rotulo, quando: agora() }]);
        return { enviado: false, naFila: ler().length };
      }
    },

    /**
     * Tenta subir tudo. O que falhar por rede continua na fila; o que falhar por
     * regra sai da fila e volta em `recusados`, para a tela poder avisar.
     */
    async drenar() {
      const fila = ler();
      if (!fila.length) return { enviados: 0, restantes: 0, recusados: [] };
      const sobrou = [], recusados = [];
      for (const item of fila) {
        try { await enviar(item.caminho, item.corpo); }
        catch (e) {
          if (e.rede) sobrou.push(item);
          else recusados.push({ ...item, motivo: e.message });
        }
      }
      gravar(sobrou);
      return { enviados: fila.length - sobrou.length - recusados.length, restantes: sobrou.length, recusados };
    },
  };
}
