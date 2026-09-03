# Índice dos artefatos visuais — qual é o canônico, e por que os outros existem

> Existem hoje **três protótipos Figma** e **dois boards** ligados a este artefato. Sem esta página,
> quem chega abre o errado. A regra é simples: **o protótipo completo é o canônico**; os outros dois
> existem por motivos que estão declarados abaixo.

## Protótipos

| # | Artefato | Onde | Estado | Para que serve |
|---|---|---|---|---|
| **1** | **Protótipo navegável completo** — 27 telas, 4 papéis, 402 × 874 pt | [`h6AnLVYLfpeVl2N4ie0Qzv`](https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv) · página *Protótipo completo · 4 papéis* | **canônico** | O produto inteiro, como cada papel o usa. É este que vai para a banca e para a pasta de entrega |
| 2 | Protótipo da sessão de validação — 12 telas, 6 tarefas | mesmo arquivo · página *Protótipo · sessão de validação* | vivo | Ensaiar e conduzir a sessão de [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md). Uma faixa por tarefa, com enunciado e limiar |
| 3 | Protótipo entregue na semana 5 — 9 telas, 375 × 812 pt | [`HBBd4GyVRjd7C3WgJ4jnpL`](https://www.figma.com/design/HBBd4GyVRjd7C3WgJ4jnpL) | **congelado — registro histórico** | O que foi entregue em 04/09/2026. **Não atualizar**: o valor dele é ser o que foi entregue |
| 4 | Protótipo HTML pré-visita | [`prototipo-figma/`](../prototipo-figma/) | congelado | A etapa em que o protótipo era HTML, antes de CFL-03 |

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
   Figma, elas cobrem **dois**: educadora (`#/entrar`, `#/hoje`, `#/chamada`, `#/ciclo`,
   `#/observacao`, `#/turma`) e coordenação (`#/consentimentos`, `#/painel`, `#/sintese`). A
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
