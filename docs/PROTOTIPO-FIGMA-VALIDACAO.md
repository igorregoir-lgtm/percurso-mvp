# Protótipo Figma da sessão de validação — iPhone 17

**Arquivo:** [`h6AnLVYLfpeVl2N4ie0Qzv`](https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv) ·
página **Protótipo · sessão de validação** · time `Inteli.MBA.2026.1` · criado em 02/09/2026.

> O mesmo arquivo passou a abrigar também o **protótipo completo** (27 telas, quatro papéis), que é
> o canônico do artefato. Hierarquia dos três protótipos:
> [`ARTEFATOS-VISUAIS.md`](ARTEFATOS-VISUAIS.md).

> **Para que serve.** Rodar e ensaiar a sessão de [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md)
> com a psicóloga da Vivência. Não é exploração de design: são as telas que o MVP já tem, nos
> estados que as seis tarefas percorrem, no aparelho que o campo pediu — *"se você pudesse fazer
> tudo isso no celular, seria muito mais fácil do que você parar aí pro notebook"* (gravação 82).

## Estrutura do arquivo

| Página | O que tem |
|---|---|
| **Leia-me** | para que o arquivo existe, como usar na sessão, o que ele não substitui |
| **Protótipo completo · 4 papéis** | 27 telas — o produto inteiro, papel a papel (o canônico) |
| **Protótipo · sessão de validação** | 12 telas de 402 × 874 pt, em 6 seções — uma por tarefa do protocolo |
| **Design system** | variáveis de cor, escala tipográfica, e os componentes Botão, Selo, Pill, Top bar, Tab bar e Status bar |

As seções são as tarefas, na ordem da sessão. Cada uma traz, acima das telas, um cabeçalho com o
**enunciado literal** que o facilitador vai ler, **o que observar** e **o limiar que reprova**.

| Seção | Telas |
|---|---|
| Tarefa 01 · Voltar depois de um tempo fora | 01 Entrar → 02 Hoje (retomada de 9 dias) |
| Tarefa 02 · A chamada do sábado que ficou | 03 Chamada de 29/08 → 04 Hoje (registro pendente) |
| Tarefa 03 · Registrar o encontro | 05 Contar como foi → 06 O que entendi |
| Tarefa 04 · O relatório do conselho | 07 Hoje (registro feito) → 08 Relato rascunho → 09 Relato liberado |
| Tarefa 05 · A pergunta da assistente social | 10 Crianças → 11 Ficha com o parecer bloqueado |
| Tarefa 06 · O recado dos responsáveis | 12 Recado |

**43 ligações** de protótipo, ponto de partida na tela 01. A barra inferior navega de verdade
(hotspots por aba), porque encontrar "Crianças" sozinha é parte da tarefa 5.

## O que o protótipo carrega de propósito

- **A tela 06 abre com o Objetivo em branco.** É o campo que o extrator erra no cenário da tarefa 3
  (*"nomearem o que sentem"* não casa com o termo `nomear o que sente` da lista fechada). Uma
  correção em sete campos ≈ 14% — o que a sessão mede é o desvio disso.
- **A tela 07 não leva ao relato sozinha.** Depois de "Confirmar e guardar" a pessoa cai no Hoje e
  precisa achar "Revisar e liberar o relato" — a costura de [`app.js:4016`](../public/app.js:4016)
  que a tarefa 4 cronometra com limiar de 20 s.
- **A tela 11 termina num bloqueio.** O parecer não sai sem consentimento, e quem registra
  consentimento é a coordenação ([`api.js:421`](../src/api.js:421)). O sucesso da tarefa 5 é ela
  **entender por que não sai**, não conseguir emitir.
- **A tela 05 diz o que grava antes de gravar.** O campo chamou gravar criança de "perigoso"; sem
  essas três frases visíveis a porta da voz não existe.

## Fidelidade — e onde ela para

- Cores e escala tipográfica saem de [`public/styles.css`](../public/styles.css), ligadas a
  variáveis do Figma (`Percurso · cor`) e a estilos de texto (`Percurso/…`).
- Textos e estados são os do MVP rodando em 02/09/2026, com o banco do seed e o
  `scripts/preparar-sessao.mjs --lapso` aplicado.
- **Fonte:** o app usa a do sistema — SF Pro no iPhone. O protótipo está em **Inter**, a seguinte da
  mesma pilha no CSS, porque SF Pro aparece na lista de fontes desta conta do Figma mas renderiza
  com largura zero. É a única divergência deliberada.
- **Não estão desenhados:** estados intermediários (gravando, contando os 40 s, teclado aberto). O
  protótipo salta do toque no microfone para a tela de conferência.
- **Não substitui o MVP.** Tempo por tarefa, taxa de correção pós-extração e Protocolo do Lapso só
  saem do sistema rodando. A taxa de correção, em particular, o próprio banco registra
  (`campos_sugeridos` e `campos_editados`) — no Figma ela não existe.

## Dados

Sintéticos, do seed: perfil **Carolina Duarte** (papel `profissional`) e turma
**Vivência · Sábado manhã**. Nenhuma criança real é representada.
