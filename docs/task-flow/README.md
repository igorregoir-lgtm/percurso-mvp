# Task flow — Exercício 03

Artefato do **Grupo 06** para o exercício de task flow. Sai da **jornada de usuário v2**
(`../jornada-usuario/`) e das telas que existem hoje em `public/app.js` — não é um fluxo desejado.

| Arquivo | O que é |
|---|---|
| `task-flow.json` | o conteúdo — **fonte de verdade** |
| `gerar-task-flow.py` | gera `task-flow.html` a partir do JSON |
| `Task-Flow-Percurso-Grupo06.png` | 5200×3980, para arrastar na página do grupo |

## 1. A história escolhida

> **US-6 — Como psicóloga da Vivência, quero contar em 40 segundos como foi o encontro, para que o
> relatório no padrão do conselho exista sem eu ter que escrever à noite.**

Ela **está** nas listas canônicas desde 02/09/2026: [`../LEAN-INCEPTION.md`](../LEAN-INCEPTION.md) §5
(item 6, com a procedência declarada) e [`../ARTEFATO-SEMANA-5.md`](../ARTEFATO-SEMANA-5.md) §3.
As cinco primeiras são de **pedagoga** ou coordenação; a sexta chegou pelo campo — a visita de
29/08/2026 mostrou que quem escreve o relatório é a psicóloga, e é ela quem nomeia o registro como
a dor (*"o maior desafio aqui é registrar o que você fez, né?"*). A história existe no código desde
a **decisão 31** de [`../DECISOES-TECNICAS.md`](../DECISOES-TECNICAS.md); este exercício desenha o
fluxo que a sessão de validação cronometra.

**Tarefa principal:** registrar o encontro de hoje falando, e sair com o relato do procedimento
liberado.

## 2. O fluxo, e por que é task flow

Um caminho, sem losango — o percurso de quem consegue fazer. Serve para cronometrar e para ver onde
a pessoa trava. As bifurcações reais (escrever em vez de falar, registrar três semanas depois) estão
na jornada v2 e ficam fora **de propósito**: user flow é outro desenho.

```
início → #/entrar → #/hoje → #/voz → #/confirmar → #/hoje → #/relato → fim
```

Os seis passos, com o tempo esperado, estão no PNG. **O passo 05 é o achado:** ao confirmar a folha,
`public/app.js:4016` faz `location.hash = '#/hoje'`. O relato **não abre sozinho** — ela precisa
achar o botão "Revisar e liberar o relato" no cartão do Hoje. O desenho supunha continuidade; o
código devolve para a tela inicial. Está marcado em âmbar no fluxo, com limiar próprio de
observação (20 s).

## 3. As três perguntas — e o que foi ajustado

O exercício pede que uma IA gere de 2 a 3 perguntas para conduzir a tarefa como etapa de um teste de
observação. As três geradas estão no PNG **riscadas**, com o problema de cada uma ao lado. Nenhuma
sobreviveu inteira, e o motivo é sempre o mesmo: **entregavam o caminho que a tarefa existe para
testar**.

| # | O que vai ser dito na sessão | Mede |
|---|---|---|
| 1 | "O grupo acabou agora. Registre este encontro no sistema, do jeito que for mais rápido para você." | se a porta da voz é encontrada sozinha |
| 2 | "Antes de guardar, me diga em voz alta o que você está vendo nesta tela — e faça o que você faria se estivesse sozinha." | compreensão de "nada foi gravado ainda" + taxa real de correção |
| 3 | "Terminou o que você precisava fazer hoje, ou ficou faltando alguma coisa?" | se o encontro registrado é lido como concluído — o teste do passo 05 |

Os cinco ajustes feitos no protocolo depois disso estão na faixa escura do PNG. Os dois que mudam
[`../VALIDACAO-USUARIO.md`](../VALIDACAO-USUARIO.md):

1. **O cartão de cenário da tarefa 3** era de professora (leitura em roda, barulho da rua). Vira um
   da Vivência: roda das emoções, duas crianças ajudaram sem ninguém pedir, seis participaram do
   começo ao fim, um conflito resolvido conversando.
2. **A tarefa termina no relato liberado**, não na folha confirmada — é o relatório, não a folha,
   que é a dor nomeada em campo.

E o que fica de fora: as portas **B** (gravar o encontro inteiro) e **C** (importar um áudio) da
jornada v2 não existem no MVP. Simular o que não existe contamina o dado.

## 4. O que este teste não prova

Que ela faria isso sozinha, no sábado seguinte, sem facilitador na sala. Isso é o **Protocolo do
Lapso** (H5 de [`../METODOLOGIA-VALIDACAO-PERCURSO.md`](../METODOLOGIA-VALIDACAO-PERCURSO.md)) e
precisa de uma segunda sessão, com intervalo.

## Como regerar a imagem

```bash
python3 gerar-task-flow.py
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --force-device-scale-factor=2 --window-size=2600,1990 \
  --virtual-time-budget=12000 --screenshot="Task-Flow-Percurso-Grupo06.png" \
  "file://$PWD/task-flow.html"
```

A altura do `--window-size` é a `document.body.scrollHeight` da página em 2600 px de largura. Se o
conteúdo crescer, meça de novo — senão o PNG sai cortado.

> Dados da sessão são sintéticos: perfil **Carolina Duarte** (`papel = profissional`) e turma
> **Vivência · Sábado manhã**, ambos do seed. Nenhuma criança real é representada.
