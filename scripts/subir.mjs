// Percurso — sobe o servidor com HTTPS local, para o celular alcancar.
//
// EXISTE PORQUE `getUserMedia` EXIGE CONTEXTO SEGURO: pelo IP da rede local sem
// HTTPS a captura de audio simplesmente nao existe, e ela e' o centro desta
// rodada. `localhost` ja' e' contexto seguro; o celular, nao.
//
// Nao e' o caminho de producao — e' o atalho de UMA linha para quem quer abrir
// no proprio aparelho. `node server.js` continua valendo para o resto.
process.env.PERCURSO_HTTPS = '1';
process.env.HOST = '0.0.0.0';
await import('../server.js');
