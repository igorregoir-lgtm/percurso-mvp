# Capturas de tela — Percurso

Dez telas do MVP, em ordem: a tela inicial, o fluxo principal passo a passo, o dado salvo e
listado, e o que aparece quando algo dá errado. Todos os dados são sintéticos.

As imagens são geradas pelo próprio repositório (`video/capturas.mjs`), que pilota um Chrome
isolado sobre um banco recém-semeado. Estas são de 13/10/2026.

## No celular — quem atende

| # | Tela | O que mostra |
|---|---|---|
| 01 | [`01-entrar.png`](01-entrar.png) | **Tela inicial.** Entrar é escolher quem está usando; a psicóloga vem primeiro. Abaixo, os artefatos da entrega. |
| 02 | [`02-hoje-educadora.png`](02-hoje-educadora.png) | **Hoje, da educadora.** A retomada sem culpa: cinco datas de chamada em aberto e nenhuma expira. Abaixo, a folha do dia por fala, áudio ou texto. |
| 03 | [`03-chamada.png`](03-chamada.png) | **Fluxo principal, passo 1: a chamada.** "Todos presentes" e uma falta marcada, com o cronômetro contra a meta de 2 minutos. |
| 04 | [`04-chamada-salva.png`](04-chamada-salva.png) | **Dado salvo.** A data sai das pendentes e a próxima em aberto já é oferecida. |
| 05 | [`05-observacao.png`](05-observacao.png) | **Fluxo principal, passo 2: a observação.** Seis dimensões da planilha do Instituto, com âncoras de comportamento. |
| 06 | [`06-hoje-psicologa.png`](06-hoje-psicologa.png) | **Hoje, da psicóloga.** As duas turmas da Vivência, o registro do encontro por fala, áudio ou texto, o relato já liberado e o recado de cada turma. |

## No computador — quem gere e quem presta contas

| # | Tela | O que mostra |
|---|---|---|
| 07 | [`07-painel-coordenacao.png`](07-painel-coordenacao.png) | **Dado salvo e listado.** O painel da coordenação: crianças únicas e matrículas lado a lado, cobertura, presença e alertas. |
| 08 | [`08-consentimentos.png`](08-consentimentos.png) | **Consentimentos.** O campo nasce bloqueado: 102 ativos e 4 pendentes. Toda leitura de dado individual deixa rastro de quem, o quê e quando. |
| 09 | [`09-relatorio-do-ciclo.png`](09-relatorio-do-ciclo.png) | **Relatório do ciclo.** A diretoria escolhe o tipo e o período, vê a prévia e gera o documento que vai a quem financia, sem nome de criança. |
| 10 | [`10-acesso-negado.png`](10-acesso-negado.png) | **Quando algo dá errado.** A diretoria tenta abrir a ficha de uma criança: a API responde 403 e a tela diz por quê. |

## Como gerar de novo

Depois de qualquer mudança de tela. O banco é isolado e `data/percurso.db` não é tocado.

```bash
export PERCURSO_DB=/tmp/percurso-capturas.db PERCURSO_AURORA_DB=/tmp/percurso-capturas-aurora.db
node scripts/reset.mjs --limpar && node scripts/preparar-sessao.mjs
PORT=3921 HOST=127.0.0.1 node server.js &
BASE=http://localhost:3921 node video/capturas.mjs
```

O script sai com erro se alguma tela estiver em "Carregando…", com aviso de erro ou numa tela de
erro que não era esperada.
