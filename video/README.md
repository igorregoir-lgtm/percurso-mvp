# Vídeo demonstrativo

**`percurso-demonstracao.mp4`** — 6m14s · 1920×1080 · 30 fps · **sem áudio**.

Percorre o roteiro de [`../docs/ROTEIRO-DO-VIDEO.md`](../docs/ROTEIRO-DO-VIDEO.md) em 42 cenas: a
jornada da educadora no celular (retomada após lapso → chamada → agenda do ciclo → rubrica → filtro
de proteção → fecho da turma) e a da coordenação no desktop (painel → safras → síntese →
consentimentos), terminando no fecho técnico.

A narração do roteiro está **como legenda na tela**, não como locução. Se quiser voz, grave por cima
— o ritmo das cenas já foi calculado sobre o tempo de leitura de cada legenda.

## Como foi gerado

Nenhuma gravação de tela: um Chrome headless, com **perfil temporário** e isolado do navegador do
usuário, é pilotado via CDP; cada quadro sai da própria aba. Não há captura da área de trabalho.

```bash
node scripts/reset.mjs      # estado de demonstração conhecido
node video/gravar.mjs       # pilota o app e captura os quadros  → video/quadros/
node video/legendas.mjs     # renderiza as molduras com as legendas → video/molduras/
node video/montar.mjs       # compõe e encoda                     → percurso-demonstracao.mp4
```

Requer o servidor no ar (`node server.js`) e **ffmpeg** instalado (`brew install ffmpeg`) — apenas
para gerar o vídeo. **O MVP em si continua sem nenhuma dependência.**

| Arquivo | Papel |
|---|---|
| `cdp.mjs` | Cliente CDP mínimo, sobre o WebSocket nativo do Node — sem dependência |
| `gravar.mjs` | O roteiro: ações no app e captura dos quadros |
| `legendas.mjs` | Gera as molduras (fundo + legenda) renderizando HTML no Chrome |
| `montar.mjs` | Compõe moldura + quadro e encoda com ffmpeg |
| `quadros/`, `molduras/` | Intermediários — podem ser apagados; o `.mp4` basta |

## Para editar o roteiro

As falas estão em `gravar.mjs`, cada uma na chamada `cena('…')` imediatamente antes das capturas.
O tempo no ar de cada cena é calculado pelo tamanho da legenda (`duracao()` em `montar.mjs`), então
mudar o texto ajusta o ritmo sozinho.
