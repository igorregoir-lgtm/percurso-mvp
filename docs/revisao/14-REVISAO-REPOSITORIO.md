# 14 · Revisão do repositório — erros e lacunas (03/09/2026)

> Varredura adversarial do artefato inteiro: código, testes, documentação viva e
> ambiente. Método: gates medidos nesta sessão; citações `arquivo:linha` conferidas;
> comportamento da tela Hoje verificado contra a API em dia não letivo (quinta-feira,
> turma sabática).

**Gates ao fim desta revisão:** 164 unitários · **373** smoke · 6 rag · 24 ia-stub.

---

## 1. Achados corrigidos nesta sessão

| # | Achado | Gravidade | Correção |
|---|---|---|---|
| R-01 | **O botão do recado sumia em dia não letivo.** Em `public/app.js` a entrada dependia de `ch?.registrada` (chamada de *hoje*). Na Vivência (turno sábado), numa quinta `data_folha` aponta para o último encontro e a API `/api/recado?data=…` responde 200 — mas o botão não aparecia. Documentado como “achado” em `VALIDACAO-USUARIO.md` e no aviso de `preparar-sessao.mjs`; era bug de produto. | alta | `temRecado` segue o encontro de `data_folha`; href com `?data=` quando não é hoje; docs e preparo atualizados; +2 asserções no smoke §24 |
| R-02 | **`task-flow/README.md` (e o JSON) diziam que a US-6 *não* estava nas listas canônicas** — mas o plano 13 já a tinha promovido a `LEAN-INCEPTION.md` e `ARTEFATO-SEMANA-5.md`. | média | README e `task-flow.json` alinhados ao estado atual |
| R-03 | **Título “As cinco user stories” com seis itens** em `LEAN-INCEPTION.md` §5. | baixa | título virado “As user stories que o MVP demonstra”; §6 deixa de cravar “5 de 5” (o produto monta N de M) |
| R-04 | **Evidências e `TESTES.md` ainda diziam 364** smoke; números vivos em README/HANDOFF/ARQUITETURA/etc. ficaram em 371 até esta sessão. | média | evidência regenerada; documentos vivos em **373 · 164** |

---

## 2. Achados registrados, sem correção de código aqui

| # | Achado | Por quê não mexer agora |
|---|---|---|
| L-01 | **Node do ambiente Cloud sem FTS5.** O binário padrão (`/exec-daemon/node`, v22.14) compila `node:sqlite` **sem** `ENABLE_FTS5` → `npm run test:rag` e `test:ia` quebram com `no such module: fts5`. Node **24** (`.nvmrc`, o do CI) tem FTS5 e passa. | Ambiente pessoal/dashboard; há PR paralelo de setup (`cursor/setup-cloud-env-d8db`). Exigência: Node ≥ 22.13 **e** SQLite com FTS5 — na prática o 24 LTS do `.nvmrc`. |
| L-02 | Pendências humanas em `PENDENCIAS-DE-ENTREGA.md` (Drive, deck, dados da org, sessão com a psicóloga, regravação do vídeo, aval das rubricas, modelo do conselho). | Só gente resolve — não se fabrica. |
| L-03 | Dívidas técnicas já declaradas (auth, HTTPS, auditoria, PoC do copilot). | Bloqueantes só para dado real; decisão 8. |
| L-04 | Protótipo Figma e MVP podem divergir quando `public/app.js` muda uma tela espelhada — sem automação. | Registrado no HANDOFF; custo manual aceito. |
| L-05 | Hit@5 do RAG: 19/20 nesta máquina (gate ≥ 14). A consulta *“como a rubrica avalia persistência diante da dificuldade”* errou — o vocabulário da rubrica hoje é **Resiliência**, não “persistência”. | Gate passa; candidato a ajuste de consulta do `rag-test` numa sessão de corpus, não bloqueante. |

---

## 3. O que a varredura confirmou como saudável

- As **18** citações `arquivo:linha` em `docs/` apontam para o trecho certo (conferidas linha a linha).
- Unitários, smoke, RAG e IA-stub verdes com Node 24.
- US-6, decisões 31–34, protótipo completo e hierarquia de artefatos visuais já estavam no lugar (plano 13 executado).
- `prototipo-figma/README.md` já se declara registro histórico.

---

## 4. Como reproduzir os gates desta revisão

```bash
# Node 24 LTS (FTS5). Em ambiente com outro node no PATH:
#   export PATH="$HOME/.nvm/versions/node/v24.20.0/bin:$PATH"
node scripts/unit-test.mjs          # 164
node scripts/rag-test.mjs           # 6
node scripts/ai-stub-test.mjs       # 24
node scripts/reset.mjs && node server.js &
node scripts/smoke-test.mjs         # 373
```
