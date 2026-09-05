# 14 · Revisão do repositório — erros e lacunas (03/09/2026)

> Varredura adversarial do artefato inteiro: código, testes, documentação viva e
> ambiente. Método: gates medidos nesta sessão; citações `arquivo:linha` conferidas;
> comportamento da tela Hoje verificado contra a API em dia não letivo (quinta-feira,
> turma sabática).
>
> **Nota de merge (05/09/2026).** Enquanto esta branch existia, `main` recebeu a mesma
> correção do recado (`48ec1dd`) e a evoluiu para **um botão por turma** (`d.recados`).
> No merge, o código de `public/app.js` / smoke / validação ficou o de `main` (superset).
> O que esta revisão ainda acrescenta: este relatório, a coerência de docs (US-6, título
> das stories, §6 da inception em N de M) e a nota de ambiente Node/FTS5.

**Gates de referência em `main` no merge:** 167 unitários · **381** smoke · 6 rag · 24 ia-stub.

---

## 1. Achados corrigidos nesta sessão

| # | Achado | Gravidade | Correção |
|---|---|---|---|
| R-01 | **O botão do recado sumia em dia não letivo.** Em `public/app.js` a entrada dependia de `ch?.registrada` (chamada de *hoje*). Na Vivência (turno sábado), numa quinta `data_folha` aponta para o último encontro e a API `/api/recado?data=…` responde 200 — mas o botão não aparecia. Documentado como “achado” em `VALIDACAO-USUARIO.md` e no aviso de `preparar-sessao.mjs`; era bug de produto. | alta | Corrigido aqui e, em paralelo, em `main` (`48ec1dd`), que depois passou a expor `d.recados` (um botão por turma). Merge ficou com a versão de `main`. |
| R-02 | **`task-flow/README.md` (e o JSON) diziam que a US-6 *não* estava nas listas canônicas** — mas o plano 13 já a tinha promovido a `LEAN-INCEPTION.md` e `ARTEFATO-SEMANA-5.md`. | média | README e `task-flow.json` alinhados ao estado atual |
| R-03 | **Título “As cinco user stories” com seis itens** em `LEAN-INCEPTION.md` §5. | baixa | título virado “As seis user stories que o MVP demonstra”; §6 deixa de cravar “5 de 5” (o produto monta N de M) |
| R-04 | **Evidências e `TESTES.md` ainda diziam 364** smoke; números vivos em README/HANDOFF/ARQUITETURA/etc. estavam defasados. | média | números vivos acompanhando `main` no merge (**381 · 167**) |

---

## 2. Achados registrados, sem correção de código aqui

| # | Achado | Por quê não mexer agora |
|---|---|---|
| L-01 | **Node do ambiente Cloud sem FTS5.** O binário padrão (`/exec-daemon/node`, v22.14) compila `node:sqlite` **sem** `ENABLE_FTS5` → `npm run test:rag` e `test:ia` quebram com `no such module: fts5`. Node **24** (`.nvmrc`, o do CI) tem FTS5 e passa. | Ambiente; `.cursor/` desta branch (e o PR #1 em `main`) encaminham Node 24. |
| L-02 | Pendências humanas em `PENDENCIAS-DE-ENTREGA.md` (Drive, deck, dados da org, sessão com a psicóloga, regravação do vídeo, aval das rubricas, modelo do conselho). | Só gente resolve — não se fabrica. |
| L-03 | Dívidas técnicas já declaradas (auth, HTTPS, auditoria, PoC do copilot). | Bloqueantes só para dado real; decisão 8. |
| L-04 | Protótipo Figma e MVP podem divergir quando `public/app.js` muda uma tela espelhada — sem automação. | Registrado no HANDOFF; custo manual aceito. |
| L-05 | Hit@5 do RAG: 19/20 nesta máquina (gate ≥ 14). A consulta *“como a rubrica avalia persistência diante da dificuldade”* errou — o vocabulário da rubrica hoje é **Resiliência**, não “persistência”. | Gate passa; candidato a ajuste de consulta do `rag-test` numa sessão de corpus, não bloqueante. |

---

## 3. O que a varredura confirmou como saudável

- As **18** citações `arquivo:linha` em `docs/` apontam para o trecho certo (conferidas linha a linha).
- Unitários, smoke, RAG e IA-stub verdes com Node 24 (salvo falhas pré-existentes em `main` — ver §5).
- US-6, decisões 31–34, protótipo completo e hierarquia de artefatos visuais já estavam no lugar (plano 13 executado).
- `prototipo-figma/README.md` já se declara registro histórico.

---

## 4. Como reproduzir os gates

```bash
# Node 24 LTS (FTS5). Em ambiente com outro node no PATH:
#   export PATH="$HOME/.nvm/versions/node/v24.20.0/bin:$PATH"
node scripts/unit-test.mjs          # 167
node scripts/rag-test.mjs           # 6
node scripts/ai-stub-test.mjs       # 24
node scripts/reset.mjs && node server.js &
node scripts/smoke-test.mjs         # 381
```

---

## 5. Falhas pré-existentes em `main` (não introduzidas pelo merge)

Confirmadas rodando a suíte em `origin/main` puro, na mesma data (05/09/2026):

1. **Unitário** `passo/preferências: prefere_tipo reserva vaga…` — espera primeiro card `aprimoramento`, recebe `acao` (166/167).
2. **Smoke** `a régua tem criança abaixo e em atenção` — seed não produz faixa `atencao` neste calendário (`{"ok":6,"atencao":0,"abaixo":6}`) (380/381).

Ficam como dívida de `main`, fora do escopo desta resolução de conflito.
