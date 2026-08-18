// Cliente CDP minimo — usa o WebSocket nativo do Node 22+, sem dependencia.
export async function conectar(porta = 9222) {
  const alvos = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
  let alvo = alvos.find(t => t.type === 'page');
  if (!alvo) {
    await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: 'PUT' });
    alvo = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()).find(t => t.type === 'page');
  }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((ok, erro) => { ws.onopen = ok; ws.onerror = erro; });

  let seq = 0;
  const pendentes = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) {
      const { ok, erro } = pendentes.get(m.id);
      pendentes.delete(m.id);
      m.error ? erro(new Error(m.error.message)) : ok(m.result);
    }
  };

  const enviar = (metodo, params = {}) => new Promise((ok, erro) => {
    const id = ++seq;
    pendentes.set(id, { ok, erro });
    ws.send(JSON.stringify({ id, method: metodo, params }));
    setTimeout(() => { if (pendentes.delete(id)) erro(new Error(`timeout em ${metodo}`)); }, 30000);
  });

  return {
    enviar,
    fechar: () => ws.close(),
    async avaliar(expressao) {
      const r = await enviar('Runtime.evaluate', {
        expression: `(async () => { ${expressao} })()`,
        awaitPromise: true, returnByValue: true,
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + expressao.slice(0, 120));
      return r.result?.value;
    },
    async foto() {
      const r = await enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      return Buffer.from(r.data, 'base64');
    },
    async viewport({ width, height, escala = 2, mobile = false }) {
      await enviar('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: escala, mobile,
        screenWidth: width, screenHeight: height,
      });
    },
  };
}

export const esperar = (ms) => new Promise(r => setTimeout(r, ms));
