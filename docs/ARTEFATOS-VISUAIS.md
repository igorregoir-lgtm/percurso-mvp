# Índice dos artefatos visuais — qual é o canônico, e por que os outros existem

> Existem hoje **três protótipos Figma** e **dois boards** ligados a este artefato. Sem esta página,
> quem chega abre o errado. A regra é simples: **o protótipo completo é o canônico**; os outros dois
> existem por motivos que estão declarados abaixo.

## Protótipos

| # | Artefato | Onde | Estado | Para que serve |
|---|---|---|---|---|
| **1** | **Protótipo v3 — 12 rotas em 16 telas, 4 papéis, 402 × 874 pt** | [`JMejpNsHkckqeSP8KE1PTh`](https://www.figma.com/design/JMejpNsHkckqeSP8KE1PTh) · página *Protótipo v3 · 4 papéis* | **canônico** | O produto **como ele vai ficar**: 28 rotas fundidas em 12, captura por áudio em primeiro, botões de um toque, a Aurora como porta. Navegável: **84 elementos com ação**, nenhuma tela sem entrada e nenhuma sem saída. Desenhado 03/09/2026, **antes** do código que o implementa |
| 2 | Protótipo navegável de 02/09 — 27 telas, 4 papéis | [`h6AnLVYLfpeVl2N4ie0Qzv`](https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv) | **registro histórico** | O produto **como ele era** antes da rodada de simplificação. Serve de antes-e-depois; não é mais o alvo |
| 3 | Protótipo entregue na semana 5 — 9 telas, 375 × 812 pt | [`HBBd4GyVRjd7C3WgJ4jnpL`](https://www.figma.com/design/HBBd4GyVRjd7C3WgJ4jnpL) | **congelado — registro histórico** | O que foi entregue em 04/09/2026. **Não atualizar**: o valor dele é ser o que foi entregue |
| 4 | Protótipo HTML pré-visita | [`prototipo-figma/`](../prototipo-figma/) | congelado | A etapa em que o protótipo era HTML, antes de CFL-03 |

### Como percorrer o v3

1. Abrir [`JMejpNsHkckqeSP8KE1PTh`](https://www.figma.com/design/JMejpNsHkckqeSP8KE1PTh) → página
   **Protótipo v3 · 4 papéis** → modo de apresentação. O ponto de partida é **`#/entrar`**.
2. O perfil escolhido entra na faixa do papel: Carolina e Maria Silvia caem em `#/hoje`, Rita no
   `#/painel`, Solange no `#/relatorio`.
3. As barras inferiores navegam de verdade — 3 abas para quem está em sala, 4 para a coordenação.

> **As setas de protótipo não aparecem na aba Design.** Para vê-las, selecione a aba **Prototype**
> no painel da direita, ou dê play. Na Design elas existem e ficam invisíveis — foi o que aconteceu
> na primeira leitura deste arquivo.

### A Aurora continua, e cresce

O ❋ está em **todas as telas menos `#/entrar`** — exatamente como o produto faz hoje
(`pintarAuroraFab` esconde o FAB na entrada). Ele não some com a simplificação: **é ele que a torna
possível.** Com o menu caindo de 6 abas para 3, a Aurora é o caminho para o que saiu — a tela
`Aurora · painel aberto` mostra isso com o bloco **IR PARA** (a turma inteira, quem veio sábado,
pensar junto).

O painel mantém o que o produto já tem e que a rodada não deve estragar: no máximo **3 vagas**, teto
de **uma pendência** por painel, alívio quando não há nada pendente (*"Ninguém sumiu do radar esta
semana — isso é o seu registro funcionando, não é sorte"*), **ponto** em vez de contador (contador
lê como caixa de entrada em dívida), e o limite dito na própria tela: *"conta quantos, nunca quem"*.

As três entradas contextuais que também existem (`Chamada` no cartão de captura, `Ver a
turma inteira` no cartão do grupo, `Pensar junto` no painel) são **redundância deliberada**: a Aurora
é a porta geral, elas são a porta do contexto. Quem não descobrir o ❋ ainda chega.

**As 16 telas são as 12 rotas mais quatro estados** que só existem navegando: `#/registrar` aparece
duas vezes (capturando e conferindo), `#/hoje` aparece duas vezes (turma da manhã e **turma da
tarde**, que é a prova de que o seletor resolve a turma que o produto não acompanhava) e
`#/relatorio` aparece duas vezes (a pergunta e a resposta) — e há a tela do **painel da Aurora
aberto**, que é onde a fusão de superfícies da F6 se vê.

**Dois percursos valem cronometrar na sessão de validação:**

- **A dor dela** — `#/entrar` → Carolina → `#/hoje` → *Falar agora* → `#/registrar` capturando →
  *Terminei* → `#/registrar` conferindo → *Confirmar e guardar* → **`#/sai-daqui`**. Este último
  passo era o conserto do **passo 05** do task flow, feito em 04/09/2026: `public/app.js:5084` passou a abrir o relato e
  o relato não abre sozinho. No v3, confirmar a folha abre o relato.
- **A segunda turma** — `#/hoje` → chip *Sábado tarde* → `#/hoje` da tarde. Hoje esse caminho não
  existe: `GET /api/hoje` monta tudo a partir de `turmas[0]`.

**O que ficou sem ligação, e por quê.** Quatro elementos apontariam para a própria tela e o Figma
recusa auto-referência: o chip da turma já ativa, a aba *Recado aos pais* (o recado é a segunda aba
de `#/sai-daqui`, não uma tela), o botão *Aprovar* da síntese e a aba já ativa do relatório. São
estados internos, não navegação — e é assim que devem ficar.

### As medidas de toque, que o código tem de honrar

O v3 foi conferido por script, não por olho — e as três regras abaixo saíram dessa conferência.
Elas são **contrato**: quando a F2 e a F3 forem implementadas, é isto que o `public/app.js` e o
`public/styles.css` precisam entregar.

| Regra | Valor | De onde veio |
|---|---|---|
| Altura do item da barra | **50 px** | `public/styles.css:349` já define `min-height:50px` — o protótipo é que estava com 24 e foi corrigido para o produto |
| Altura da barra | **88 px** | 50 do item + respiro; encosta no rodapé da tela |
| Alvo mínimo de toque | **44 px** | mínimo de dedo; quatro alvos estavam em 39 e 36 e subiram |
| Folga do girassol até a barra | **12 px** | o FAB tem 65 px e nunca encosta na barra nem em botão |
| Último botão do cartão | **não passa sob o girassol** | largura reduzida a 289 px, deixando 7 px de folga lateral |

**Conferido por script sobre as 16 telas: 0 colisões entre elementos clicáveis e 0 alvos abaixo de
44 px.**

> **A conferência inversa — a que faltava — foi feita em 04/09/2026, e o código estava fora do
> contrato.** O girassol tinha 54 px onde o desenho pede 65; a barra, 63 onde pede 88; e não havia
> regra nenhuma impedindo um botão de descansar sob o girassol. As três foram corrigidas, e **o
> contrato virou gate** (`unit-test.mjs`): uma verificação que depende de alguém lembrar de fazer
> não é verificação. O que o código faz diferente do Figma, de propósito: no desenho o dono
> estreitou o último botão do cartão para 289 px; numa página que **rola**, estreitar um botão não
> resolve — qualquer botão passa sob o FAB durante a rolagem. O equivalente honesto é reservar a
> faixa no rodapé (`main{padding-bottom:181px}`), e aí nada fica coberto em repouso. Medido nas oito
> telas, com a página rolada até o fim: 0 botões cobertos.
>
> **Segunda passada, 04/09 à noite, e ela achou mais.** O girassol era o caractere `❋` num círculo
> escuro — no protótipo ele é **desenhado**: doze pétalas de 8×17 a cada 30° em `#e6a400`, miolo de
> 17 px em `#6b4410`, sobre fundo branco. Virou SVG, e virou gate. E a **chamada tinha ficado
> inalcançável**: o menu do v3 tem três itens, `#/chamada` saiu dele, e o cartão do Hoje só oferecia
> o botão quando havia data em aberto. Tirar do menu só é legítimo se alguma coisa levar. A checagem ignora, de propósito, duas coisas: as abas entre si, que são vizinhas dentro da
barra, e o que está sob a folha do painel da Aurora, onde sobreposição É o desenho (é modal).

Duas armadilhas que a conferência revelou e que valem para o código:

- **A tela de conferência do registro não tem barra.** Qualquer regra que posicione o FAB "acima da
  barra" precisa de um caminho para esse caso, senão ele cai em cima do botão de confirmar.
- **Mudar a altura da barra move o FAB em todas as telas.** As duas medidas são acopladas; alterar
  uma sem a outra reintroduz sobreposição.

### O protótipo passou a vir ANTES do código (03/09/2026)

Até aqui o protótipo **seguia** o código, e por isso envelhecia: o [`HANDOFF.md`](HANDOFF.md)
registra que ele *"mente assim que `public/app.js` muda"*, que a manutenção é manual e recorrente e
que **nenhum teste pega** a divergência. A rodada de simplificação inverteu a ordem — o v3 foi
desenhado primeiro, e é ele que o código implementa. A divergência passa a ser erro de execução,
visível, em vez de decadência silenciosa.

**O que o v3 muda em relação ao v2:** 28 rotas viram 12 — a tabela de fusão está na **decisão 36**
de [`DECISOES-TECNICAS.md`](DECISOES-TECNICAS.md), que é a fonte; repeti-la aqui seria mais uma
cópia para envelhecer. Em código, desde 04/09/2026. Além disso: a captura por áudio
abre a tela em vez de ser o terceiro cartão; a janela de 40 s deixa de ser teto; as três garantias
aparecem no instante do toque; o check-in vira entrada direta preservando `—`/`0`/`N`; a conferência
mostra a origem de cada campo; e existe seletor de turma.

> **Ressalva de leitura, registrada em 03/09/2026.** O conector do Figma expõe apenas **uma página
> por arquivo**, e no `h6AnLVYLfpeVl2N4ie0Qzv` a página exposta é o `Leia-me` — cujo texto manda
> abrir uma página chamada *"Protótipo · iPhone 17"*, enquanto esta tabela a chamava de *"Protótipo
> completo · 4 papéis"*. Não foi possível confirmar pelo conector que as 27 telas e as 153 ligações
> descritas aqui existem naquele arquivo. **Conferir no navegador antes de citar aqueles números em
> entrega.**

O arquivo **1 e 2 é o mesmo arquivo Figma**, com páginas diferentes e um único *Design system*
(variáveis de cor e escala tipográfica saídas de `public/styles.css`, mais os componentes de
Botão, Selo, Pill, Status bar, Top bar e as quatro Tab bars — uma por papel).

### Por que o entregue não serve mais como referência

Ele é **anterior à visita de campo de 29/08/2026**. Três coisas nele estão factualmente
desatualizadas, e não por descuido — o produto mudou depois:

1. **A rubrica.** Mostra as cinco dimensões antigas (*Interação com colegas, Cooperação e
   combinados, Expressão emocional, Autonomia na tarefa, Persistência*). A decisão 34 trocou pelas
   **seis da planilha do Instituto** (Autocontrole, Convivência, Participação, Expressão emocional,
   Autoestima, Resiliência). As **âncoras também mudaram** — a de nível 1 de Expressão emocional era
   *"Não nomeia o que sente, mesmo perguntada"* e hoje é *"Não nomeia o que sente; demonstra por
   reação física (chorar, sair, bater na mesa)"*.
2. **A psicóloga não existe nele.** Nem registro de vivência, nem relato do conselho, nem recado,
   nem parecer — as quatro telas que as decisões 31 a 33 criaram.
3. **A contagem de papéis está errada na documentação.** `ARTEFATO-SEMANA-5.md` e
   `PENDENCIAS-DE-ENTREGA.md` descreviam aquelas nove telas como *"três papéis"*. Lidas no próprio
   Figma, elas cobrem **dois**: educadora (`#/entrar`, `#/hoje`, `#/chamada`, `#/hoje?detalhe=ciclo`,
   `#/crianca?ver=observacao`, `#/turma`) e coordenação (`#/consentimentos`, `#/painel`, `#/painel?aba=sintese`). A
   diretoria aparecia como perfil na tela de entrada e em nenhuma tela própria. Corrigido em
   02/09/2026.

## Boards

| Artefato | Onde | Para que serve |
|---|---|---|
| Jornada de usuário v2 | board FigJam `QSzxKH22Hnevnhw7HluW6m` + PNG em [`jornada-usuario/`](jornada-usuario/) | A jornada atual da psicóloga, levantada em campo — seis fases, oito momentos da verdade |
| Task flow (Exercício 03) | PNG em [`task-flow/`](task-flow/) | O fluxo de tarefa da US-6 e as perguntas do teste de observação |

## O que é FigJam e o que é arquivo de design

**Ligação de protótipo — dar play e percorrer clicando — só existe em arquivo de design.** FigJam
tem conectores de desenho, que servem para *mapear* um fluxo, não para navegá-lo. Por isso a
jornada e o task flow vivem em FigJam (são mapas) e os protótipos vivem em arquivos de design (são
navegáveis).

## Como abrir o canônico

1. [`h6AnLVYLfpeVl2N4ie0Qzv`](https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv) → página
   **Protótipo completo · 4 papéis** → modo de apresentação.
2. O ponto de partida é a tela **01 · Entrar**. Escolher um perfil entra na faixa daquele papel.
3. As barras inferiores navegam de verdade: **153 ligações**, nenhuma tela sem entrada e nenhuma sem
   saída.

> Todos os dados são sintéticos, do seed do repositório. Nenhuma criança real é representada.
