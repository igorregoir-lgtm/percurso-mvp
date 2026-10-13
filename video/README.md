# Vídeo demonstrativo

**`percurso-demonstracao.mp4`** — 7m19s · 1920×1080 · 30 fps · **legendado e narrado** · gravado em 05/10/2026, narrado em 13/10/2026.

Percorre o **roteiro v3** de [`../docs/ROTEIRO-DO-VIDEO.md`](../docs/ROTEIRO-DO-VIDEO.md) — as 18 cenas
em 5 blocos, em 40 legendas:

1. **A educadora** (celular): entrar como Maria Silvia → chamada com retomada após lapso → agenda do
   ciclo com os bloqueios explicados → o olhar (seis dimensões, âncoras, calibração) → fecho do ciclo.
2. **A psicóloga** (celular): Carolina Duarte → chamada do sábado em aberto → "Contar como foi" (aviso
   do que grava, três portas longas, microfone) → filtro de perímetro → "O que eu entendi" → relato no
   padrão do conselho → recado aos responsáveis com a régua de 75% → parecer a profissional parceiro.
3. **A coordenação** (desktop): painel (106 × 120, Vivência fora da rubrica, calibração entre
   educadoras) → três scores → síntese com revisor e aprovação humana.
4. **A diretoria** (desktop): relatório do doador → caixa de supressão → ficha de criança barrada (403)
   → perguntar à base → impacto (SROI exploratório).
5. **Camada opcional e fecho**: copilot local no celular da educadora, com fontes e recusa
   determinística → fecho técnico (desktop) com os totais das baterias.

A narração do roteiro está **como legenda na tela e como locução**. O texto falado de cada cena fica
em `narracao.json`: é a legenda reescrita para o ouvido (sem símbolos, com as frases inteiras). O
ritmo das cenas continua sendo o do tempo de leitura da legenda; a fala é que se ajusta a ele.

**A locução é voz sintética** (ElevenLabs, voz "Matheus", modelo `eleven_v4`), gerada a partir do
texto de `narracao.json`, que é público. Nenhum áudio do produto, nem de pessoa do Instituto, foi
enviado ou usado: o que vale para o Percurso (o áudio não sai do computador do Instituto) não foi
tocado pela narração do vídeo.

**Duas coisas que a gravação simula, e as legendas dizem:** o Chrome headless não tem microfone, então
a fala da cena 7 entra pelo mesmo caminho do reconhecimento do navegador (`SpeechRecognition.onresult`)
com o texto do roteiro; e o fecho técnico é uma moldura de terminal montada com os totais das baterias
(`BATERIAS`, no topo de `gravar.mjs` — **confira antes de gravar**). Adaptações em relação ao roteiro:
nota no fim de `docs/ROTEIRO-DO-VIDEO.md`.

## Como foi gerado

Nenhuma gravação de tela: um Chrome headless, com **perfil temporário** e isolado do navegador do
usuário, é pilotado via CDP; cada quadro sai da própria aba. Não há captura da área de trabalho.

```bash
# servidor próprio, banco próprio — nunca o data/percurso.db de uso
export PERCURSO_DB=/tmp/percurso-video.db PERCURSO_AURORA_DB=/tmp/percurso-video-aurora.db
node scripts/reset.mjs                 # estado de demonstração conhecido
node scripts/preparar-sessao.mjs       # o sábado da Vivência em aberto (cenas 6 e 7)
AI_ENABLED=1 PERCURSO_AUDIO=1 PORT=3920 HOST=127.0.0.1 node server.js &

BASE=http://localhost:3920 node video/gravar.mjs   # pilota o app e captura   → video/quadros/
node video/legendas.mjs                            # molduras com as legendas → video/molduras/
node video/montar.mjs                              # compõe e encoda          → percurso-demonstracao.mp4
```

Para narrar: gere a locução de `narracao.json` em cinco blocos (um por bloco do roteiro, com uma
pausa longa entre as falas), salve como `bloco0.mp3` … `bloco4.mp3` e rode
`node video/cortar-narracao.mjs <pasta dos blocos>`. Ele grava uma fala por cena em `video/narracao/`,
e o `montar.mjs` passa a encaixá-las sozinho. Sem essa pasta, o vídeo sai mudo, como antes.

- `AI_ENABLED=1` só para a cena 17 (copilot), com o `llama-server` local no ar (`127.0.0.1:8081`).
  O `gravar.mjs` espera o modelo ficar ocioso antes de perguntar e tenta duas vezes; se ainda assim
  não houver resposta, grava a tela de fallback e a legenda diz isso.
- `PERCURSO_AUDIO=1` só para as **três portas longas** aparecerem na cena 7 — nenhum áudio é enviado.
- O Chrome do vídeo usa a porta de depuração **9232** (`CDP_PORTA` para trocar) e aborta se ela já
  estiver ocupada: a 9222 pode ser a do Chrome do dia a dia, e o roteiro sairia clicando nele.
- O roteiro grava no banco (chamadas, folha, relato, síntese): para gravar de novo, re-semeie e rode o
  `preparar-sessao` outra vez.

Requer **ffmpeg** (`brew install ffmpeg`) — apenas para gerar o vídeo. **O MVP em si continua sem
nenhuma dependência.**

| Arquivo | Papel |
|---|---|
| `cdp.mjs` | Cliente CDP mínimo, sobre o WebSocket nativo do Node — sem dependência |
| `gravar.mjs` | O roteiro: ações no app, captura dos quadros e o vigia de tela de erro / toast de erro / "Carregando…" |
| `legendas.mjs` | Gera as molduras (fundo + legenda) renderizando HTML no Chrome |
| `montar.mjs` | Compõe moldura + quadro, encaixa a fala de cada cena e encoda com ffmpeg |
| `narracao.json` | O texto falado, uma entrada por cena (vazia = cena sem fala) |
| `cortar-narracao.mjs` | Corta a locução em uma fala por cena, pelas pausas longas |
| `quadros/`, `molduras/`, `narracao/` | Intermediários — podem ser apagados; o `.mp4` basta |

## Para editar o roteiro

As falas estão em `gravar.mjs`, cada uma na chamada `cena('…')` imediatamente antes das capturas.
O tempo no ar de cada cena é calculado pelo tamanho da legenda (`duracao()` em `montar.mjs`), então
mudar o texto ajusta o ritmo sozinho. Uma cena com quadro "antes/depois" declara `passo` (segundos de
cada quadro intermediário; o padrão, 0,42 s, só dá a impressão de movimento).
