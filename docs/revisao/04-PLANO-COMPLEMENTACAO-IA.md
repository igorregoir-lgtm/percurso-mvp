# Plano de complementação — IA local, RAG, SROI e fechamento de gaps (25/08/2026)

> Origem: auditoria cruzada entre `1 - Arquitetura/` (PLANO-IMPLEMENTACAO-RAG-COPILOT-SROI-LORA.md,
> ANALISE-SLM-E-SROI.md, materiais de aula) e este repositório. A auditoria confirmou **17 gaps e
> 9 erros** (verificação adversarial, 13 agentes). Baseline no momento do plano: 55 testes
> unitários + 242 asserções smoke passando; núcleo F1–F7 + pack v2 sólido.
>
> **Este plano está na revisão 2.** A revisão 1 passou por painel adversarial de 4 lentes
> (cobertura, ética/doutrina, viabilidade, completude) que produziu 29 achados procedentes —
> 2 bloqueantes, 16 importantes, 11 menores — todos incorporados abaixo. Registro em §10.

## 0. Princípios que o plano NÃO pode violar

Herdados das decisões técnicas já registradas e da análise de arquitetura — qualquer etapa que
conflite com eles está errada, não eles:

1. **O escore nunca nasce de modelo** (decisão 4). O SLM não pontua criança, não escolhe
   coeficiente do SROI e não gera o número final de nada.
2. **A IA nunca grava; quem confirma é a pessoa** (doutrina v2). Todo output de modelo é sugestão
   validada por schema + confirmação humana, com fallback determinístico em 100% das falhas.
3. **Nenhum dado identificável de criança chega a modelo** — o filtro de perímetro roda sobre o
   texto ORIGINAL (é ele que precisa dos nomes; decisão 5), frases barradas são removidas com
   encaminhamento humano, e só então a pseudonimização substitui nomes por tokens. O limite
   residual (apelidos, paráfrase, quase-identificadores) é **declarado**, não escondido.
4. **`AI_ENABLED=false` por padrão.** O produto continua funcionando exatamente como hoje sem
   modelo, sem rede e sem custo. A camada de IA é opt-in e desligável (kill switch). Ligar em
   operação real com educadoras é condicionado ao **go da PoC** (§6.3 da análise) — até lá, a
   flag só sobe em desenvolvimento/demonstração.
5. **Zero dependência npm em runtime.** Integração via `fetch` nativo contra `llama-server` local.
   Configs novas em **JSON** (nunca YAML — não há parser nativo). Treino LoRA (offline, Python)
   fora do runtime.
6. **Corpus só com fonte licenciada e admitida pelo manifest** — sem licença verificável, não
   entra. Nenhum caso real identificável de criança em RAG ou LoRA, nunca.
7. **SROI é exploratório**: sempre 3 cenários e faixas, nunca número único; texto padrão de
   "associação compatível, não causalidade comprovada"; premissa com fonte e URL visíveis.

## 1. Etapa A — Correções de erros (antes de código novo)

| # | Erro | Correção | Arquivos |
|---|------|----------|----------|
| A1 | ERR-01 (alta) — Node 22.5 declarado quebra `node:sqlite` (sem flag só ≥22.13) | `.nvmrc` → `24` (LTS atual); `engines` → `>=22.13.0`; corrigir README e decisão 1 | `.nvmrc`, `package.json`, `README.md`, `docs/DECISOES-TECNICAS.md` |
| A2 | ERR-03 (média) — 3,3 GB de GGUF sem gitignore/manifest | `.gitignore` += `models/`, `*.gguf`, `data/rag/private/`, `data/rag/*.db`, `data/*.jsonl`; manifest com SHA-256 na Etapa B | `.gitignore` |
| A3 | ERR-06 (média) — denominador de cobertura pode incluir programa fora de escopo | filtrar `no_escopo=1` no denominador de `numerosDoCiclo` (**`src/domain.js`** — superfícies afetadas: síntese do ciclo e painel da coordenação; o relatório do doador calcula números próprios); teste unitário do invariante | `src/domain.js`, `scripts/unit-test.mjs` |
| A4 | ERR-05 (média) — rotas herdadas de leitura individual sem escopo de turma | aplicar escopo (educadora só a própria turma; coordenação passa) em ficha/lista/observação-leitura via `turmaDaCrianca`; documentar o caso da substituta como limitação declarada | `src/api.js`, `docs/DECISOES-TECNICAS.md`, smoke |
| A5 | ERR-09 (baixa) — lista de crianças corta em 60 sem aviso | devolver `total` e exibir "mostrando X de N — use a busca" | `src/domain.js`, `src/api.js`, `public/app.js` |
| A6 | ERR-10 (baixa) — modais sem focus-trap | focus-trap genérico no helper de modal | `public/app.js` |
| A7 | ERR-11/12 (baixa) — decisões de política em aberto (dado pós-revogação; janela de convívio por instituição vs por dupla) | registrar **proposta default documentada** (congelar + bloquear novos agregados; janela por dupla educadora-criança) marcada como pendente de validação da coordenação — sem inventar decisão da organização | `docs/DECISOES-TECNICAS.md` |
| A8 | ERR-04 (média) — auth forjável em deploy público | **mantida como dívida declarada** (decisão 8; dados 100% sintéticos). Reforçar aviso no README de deploy. Implementar auth real está explicitamente fora do MVP por decisão registrada. | `README.md` |

## 2. Etapa B — Fase 0: Fundação IA

Entregáveis (todos do PLANO §Fase 0):

- `ai/README.md` — mapa da camada de IA, como ligar/desligar, portas, requisitos, timeouts
  medidos, gates de máquina local vs CI, e a condição de ativação em operação real (go da PoC).
- `ai/model-manifest.json` — modelos com repo HF, arquivo, tamanho, **SHA-256 real conferido**,
  licença (Apache-2.0), papel (reflexivo 4B / estruturado-econômico 1.7B) e **nota de
  proveniência**: a Qwen não publica GGUF oficial do 4B *Instruct 2507*; o Q4_K_M usado vem de
  `unsloth/Qwen3-4B-Instruct-2507-GGUF` (quant comunitário do peso oficial) — divergência
  declarada em relação ao card citado na análise.
- `ai/scripts/setup-model.sh` — baixa GGUF e valida SHA-256 (idempotente; já baixados: valida).
- `ai/scripts/start-llama.sh` — sobe `llama-server` com **`--parallel 2`** e contexto dimensionado
  para 2 slots. **Portas por papel:** 8081 = reflexivo (4B), 8082 = estruturado (1.7B, opcional);
  o script sobe um ou ambos (`--mini`, `--ambos`). No MVP, um único 4B pode atender os dois
  papéis (o cliente roteia por papel com fallback de porta) — decisão registrada no README.
- `src/ai-client.js` — cliente HTTP do `/v1/chat/completions` com `AbortController` (timeout
  aborta a fetch e libera o slot em `finally`), health check por papel e suporte a
  `response_format: json_schema` (validado: extração estruturada funciona ponta a ponta).
- Flag `AI_ENABLED` (env) + `GET /api/ia/status` (desligada / ligada-sem-servidor / pronta,
  **por papel**: reflexivo e estruturado).
- **Stub de teste** `scripts/ai-stub.mjs` — mini `node:http` que imita `/v1/chat/completions`
  com respostas canônicas (válida, inválida, timeout) para testar em CI fila, timeout, validador
  de blocos e verificador de citações **sem modelo**.

**Gate B (máquina local, documentado):** `llama-server` responde em pt-BR (0,6 s / 80 tokens no
M5 Max; timeout do Modo B dimensionado por medição da resposta completa de 7 blocos); app intacto
com `AI_ENABLED=false`; suíte completa verde. **Gate B (CI):** testes com stub verdes.

## 3. Etapa C — Fase 1: RAG com FTS5

- `docs/GOVERNANCA-FONTES-RAG.md` — política de admissão operacional (os 13 campos do manifest,
  bloqueios, três destinos aceitar/revisar/rejeitar, processo de remoção e reconstrução,
  política de log: **query anonimizada, nunca PII**), e a decisão de formato: **JSON** (princípio 5).
- `data/rag/manifest.json` — manifest preenchido por fonte real admitida. Pipeline de conversão
  com proveniência: **PDF → `pdftotext` (passo offline documentado) → TXT com hash registrado no
  manifest**; HTML → strip determinístico de tags/entidades. **O texto normalizado commitado é a
  fonte canônica versionada** (o binário original fica em `data/rag/fontes/`, com hash). DOCX:
  fora do corpus inicial — divergência declarada em §9.
- **Corpus inicial (5–8 documentos, todos com licença verificável):** textos legais em domínio
  público (art. 8º, I, Lei 9.610/98): LGPD 13.709/2018 (foco art. 14), ECA 8.069/1990, Marco
  Legal da Primeira Infância 13.257/2016; BNCC/MEC (documento público oficial — Educação Infantil
  e Fundamental I, faixas do Instituto); documentos internos já aprovados do próprio repositório
  (rubrica/âncoras, protocolo M6, doutrina do relatório). Fontes úteis mas de licença incerta
  (notas técnicas IDIS etc.) entram no manifest com destino **revisar** e **não são indexadas**.
- Banco separado `data/rag/corpus.db` (SQLite + FTS5, validado no `node:sqlite`) — isolado do
  banco operacional e da migração por assinatura de DDL. **Reconstruível deterministicamente**:
  o CI roda `node src/rag/ingest.mjs` a partir das fontes commitadas; o `.db` não entra no git
  (`.gitignore`: `data/rag/*.db`). Comentário-guarda em `db.js`: FTS5 proibido no banco principal
  (o drop da migração por assinatura não sobrevive a shadow tables).
- `src/rag/ingest.mjs` — pipeline offline **determinístico**: fontes e chunks ordenados por chave
  estável antes da inserção; chunks de **200–350 palavras** (≈300–500 tokens pt-BR) quebrados por
  seção/artigo; metadados obrigatórios por chunk: `source_id`, título, seção/artigo, licença,
  hash, versão e **`faixa_etaria`**. Sem metadado completo, não indexa. Tokenizer FTS5:
  `unicode61 remove_diacritics 2`.
- `src/rag/search.js` — BM25 com normalização de morfologia simples (prefix queries), filtros
  (`source_id`, `tema`, **`faixa_etaria`**), citação por `chunk_id`. Embeddings/híbrida/reranking
  ficam **fora** por gate explícito do plano ("adicionar só se FTS5 não bastar").
- `GET /api/rag/search?q=` (papéis internos) — a query passa pelo **mesmo anonimizador do
  copilot** (nomes da turma → "Criança A/B") **antes da busca e de qualquer log**.
- `scripts/rag-test.mjs` — 20 consultas pedagógicas (autoria interna, **a validar por pedagogo
  antes de congelar o gate** — limitação declarada), incluindo ≥2 exercitando o filtro de faixa
  etária e 1 caso de anonimização de query. **Métrica declarada: hit@5 — fração das 20 consultas
  com ≥1 documento esperado no top-5; gabarito por (source_id, seção), nunca por chunk_id.
  Gate: ≥ 14/20 (70%) + 100% das citações devolvidas apontam para chunk existente + trechos
  retornados em pt-BR.** Roda no CI (corpus reconstruído no job).

## 4. Etapa D — Fase 2: Copilot local (Modo B) + Modo A opcional

- `ai/prompts/copilot-reflexivo.md` e `copilot-estruturado.md` — prompts versionados com limites
  não negociáveis (§3.4 da análise) e contrato de resposta.
- `src/copilot.js` — orquestra, **nesta ordem obrigatória**: (1) `filtrarPerimetro` sobre o texto
  ORIGINAL com `nomesDaTurma` (a 5ª categoria exige nome + estado interno na mesma frase —
  decisão 5); frase barrada → removida com encaminhamento humano; (2) recusas determinísticas
  (diagnóstico, atributo sensível, pedido de score); (3) **pseudonimização** dos nomes
  remanescentes (nome → "Criança A/B"; mapa mantido fora do prompt); (4) RAG top-k (query já
  anonimizada); (5) modelo com **saída JSON por schema** nos 7 blocos obrigatórios (o que
  entendi, 2–3 perguntas socráticas, hipóteses rotuladas, ≥3 alternativas com limites/efeitos,
  contraponto, fontes `[fonte:ID]`, próximo passo seguro/escalonamento); (6) **verificador de
  citações** (ID citado deve existir nos trechos fornecidos; afirmação sem fonte → rotulada
  "sem fonte no corpus"). Teste unitário do invariante: "[nome real] está deprimida" **nunca**
  chega ao prompt, nem pseudonimizada.
- Limite residual **declarado na UI e no ai/README.md**: a pseudonimização cobre nomes do
  roster; não cobre apelidos, paráfrase nem quase-identificadores — o aviso permanente orienta
  "descreva a situação, não a criança".
- Memória **só de sessão** (RAM, TTL), botão "Apagar sessão", nada persistido por padrão; fila
  de no máx. 2 concorrentes com espera limitada (teto 4 → 503 "copilot ocupado"); timeout
  dimensionado por medição real, com fallback claro ("o copilot está fora do ar — o registro
  manual continua").
- `POST /api/copilot/chat` (`mode`, `message`, `session_id`) + `DELETE /api/copilot/sessao` —
  papéis educador/coordenação; **diretoria 403** (decisão 16).
- UI: rota `#/copilot` no SPA (chat com blocos renderizados, aceitar/editar/rejeitar/pedir outra
  perspectiva/escalar) + avisos permanentes (anonimização, decisão humana, limite residual).
- **Modo A com modelo (opcional, `AI_EXTRATOR=1`, off por padrão):** wrapper `extrairComModelo`
  sobre o slot da decisão 13 — **pseudonimização reversível obrigatória antes do modelo**: nomes
  da turma → tokens no texto; o schema fechado (mesmos catálogos) só admite tokens em
  `faltas_mencionadas`; o de-mapeamento token→criança acontece FORA do modelo, após
  `validarExtracao`; token desconhecido na saída → fallback lexical. Qualquer falha (rede,
  timeout, schema, mapa) → **extrator lexical**. Contrato intocado.
- **Doação de interação (mecanismo lícito do dataset LoRA):** nada é persistido por padrão; o
  pedagogo pode **doar uma interação específica** por botão, com pré-visualização exata do que
  será gravado, validação de anonimização ANTES da persistência, registro de quem doou e
  possibilidade de revogar. Destino: `data/ai-doacoes.jsonl` (gitignorado).
- `docs/POC-COPILOT.md` — **protocolo** da PoC com pedagogos (casos, métricas, gates §6 da
  análise, condição de ativação) e seção de resultados em branco — a PoC real é com gente real;
  não se fabrica.

**Gate D (Modo B):** contrato de 7 blocos validado por schema + recusas testadas + invariante de
perímetro (com modelo real localmente; com stub no CI). **Gate D (Modo A):** bateria sobre os
casos existentes do extrator de voz — **100% de saída validada por `validarExtracao`** (fallback
contabilizado) e nenhuma regressão frente ao extrator lexical nos mesmos casos.

## 5. Etapa E — PWA e acesso mobile

- `public/manifest.json` (nome, ícones, standalone, pt-BR) + ícones gerados.
- `public/sw.js` — service worker **network-first para o shell** (cache só como fallback
  offline; cache-first para shell está **descartado** — serviria app velho durante o
  desenvolvimento) e network-first para `/api` com resposta offline explícita.
- **Limitação declarada de instalabilidade (não prometer o que não existe):** service worker e
  instalação PWA exigem *secure context* — funcionam em `localhost`/`127.0.0.1` e no deploy
  HTTPS (Render); **não** em `http://IP-DA-REDE:3000`. O acesso pela rede local continua como
  página web comum (funcional, sem offline/instalação). README documenta os dois modos e o
  caminho futuro (mkcert/túnel) sem adotá-lo agora.

## 6. Etapa F — Fase 3: SROI exploratório

- `data/sroi/premissas.json` — proxies da tabela §5.6 da análise, cada um com valor/faixa,
  ano-base, fonte, URL, confiança, status Ebenézer e ressalva de uso. Inclui a regra da dupla
  contagem (R$ 372 mil OU componentes, nunca ambos) e o **mapeamento determinístico
  indicadores do Instituto → categorias da literatura** (tabela fixa; o SLM apenas explica o
  mapeamento, nunca o cria).
- `src/sroi/calculator.js` — motor determinístico versionado: equação do §5.8
  (`benefício_t = N × Δresultado × coeficiente × proxy × (1−deadweight) × (1−atribuição) ×
  (1−deslocamento) × (1−drop-off)^t ÷ (1+desconto)^t`), 3 cenários (conservador/base/superior),
  validações (dupla contagem, faixas, unidades), **zero LLM no cálculo**.
- `GET /api/sroi/premissas` + `POST /api/sroi/calcular` (diretoria e coordenação).
- UI: rota `#/impacto` (perfil diretoria) — cenários lado a lado, premissas expostas com fonte,
  faixa e não número único, texto fixo de não-causalidade, **prevenção de violência/criminalidade
  como eixo central da narrativa (decisão registrada do Instituto)**, exportável (imprimir/HTML).
- **Explicação por modelo (diretoria):** endpoint próprio `POST /api/sroi/explicar` — prompt
  fechado sobre o contexto das premissas, sem sessão de chat, sem RAG de casos, sem memória do
  Modo B (o `copilot/chat` continua 403 para diretoria — sem contradição com a decisão 16).
  Toda saída passa por `revisarSobreAlegacao` **antes de exibir**; texto reprovado não aparece —
  entra a versão determinística fixa. O texto gerado é marcado "texto gerado — não revisado" e
  fica fora do relatório exportado por padrão.
- `docs/SROI-METODOLOGIA.md` — método, limites (§5.10), mapeamento indicadores→categorias,
  papel do SLM, gate de revisão humana antes de uso externo.
- Testes unitários do motor (cenários, dupla contagem barrada, faixa sempre presente).

## 7. Etapa G — Fase 4: LoRA (infraestrutura e gates, sem treino)

O treino **não roda nesta etapa, por gate da própria arquitetura**: exige ≥200 interações
aprovadas/anonimizadas de pedagogos reais — que ainda não existem e cujo mecanismo lícito de
coleta (doação explícita, Etapa D) acaba de ser criado — e QLoRA 4-bit (bitsandbytes) não roda
em Apple Silicon. Fingir o gate seria violá-lo. Entregáveis:

- `ai/training/README.md` — stack (Python/Transformers/PEFT/TRL), hardware, hiperparâmetros a
  validar, kill switch, processo de promoção/rollback, e o funil de dados: doação explícita →
  validação de anonimização → revisão de pedagogo → dataset.
- `ai/training/prepare-dataset.mjs` — lê `data/ai-doacoes.jsonl` (doações explícitas) → JSONL
  `messages` com splits 80/10/10 **por cenário** (sem vazamento), revalidando anonimização.
- `docs/LORA-AVALIACAO.md` — template do comparativo `base+RAG` vs `adapter+RAG` com os gates
  (≥2 métricas melhores, zero regressão de segurança/viés/português).

## 8. Etapa H — Pendências acadêmicas, calibração e handover

| Item | Ação nesta sessão | O que fica para humano |
|------|-------------------|------------------------|
| GAP-11 validação usuário real | `docs/VALIDACAO-USUARIO.md`: protocolo pronto (roteiro de sessão, termo, formulário de registro) | executar a sessão com a educadora e preencher — **não se fabrica validação** |
| GAP-11 jornadas + canvas (EA-04/EA-05) | `docs/JORNADAS.md` (jornada atual e futura por persona, derivada dos materiais de aula) + `docs/MVP-CANVAS.md` (canvas em tabela) | validar com o grupo |
| GAP-11 desvio Figma→HTML (CFL-03) | declaração explícita do desvio (protótipo navegável em HTML cumpre a função; decisão "declarar, não retrabalhar") junto à defesa do GAP-10 | validar com professor/mentor |
| GAP-10 defesa do desvio no-code | consolidar defesa explícita (README + doc): por que Node puro cumpre melhor as restrições do bloco 5 que plataforma no-code paga | validar com professor/mentor |
| GAP-09 borda 2 — consistência entre observadores | **versão determinística mínima**: leitura de calibração no painel da coordenação (distribuição de níveis por educadora × dimensão no ciclo, divergência vs média geral, sem modelo e sem ranking punitivo) | interpretar com a coordenação |
| GAP-17 treinamento embutido (M6) | bloco "como calibrar o olhar" na tela de observação (âncoras com exemplos, quando marcar 1 vs 4) | validação com a psicóloga |
| GAP-12 vídeo v1 | atualizar `docs/ROTEIRO-DO-VIDEO.md` com roteiro v2 completo (voz, copilot, SROI, PWA) | regravar narração |
| GAP-13 pitch deck | `docs/PENDENCIAS-DE-ENTREGA.md` com os **insumos de arquitetura produzidos** (custo total de operação da solução local vs licença, requisitos de máquina, papel do operador, troca do tempo clínico da psicóloga como insumo qualitativo) + lista dos dados externos faltantes (números 2025, orçamento 2026) | montar o deck com os dados reais |
| GAP-14 entrega Drive/Adalove | checklist em `docs/PENDENCIAS-DE-ENTREGA.md` | executar na semana da entrega |
| GAP-16 costura da âncora acadêmica (M2) | seção no `MODELO-DE-DADOS.md`: extensão proposta (`serie_academica`) mostrando que o esquema comporta a série sem migração destrutiva | ativar quando houver dado do parceiro |

## 9. Sequência, gates e escopo excluído

Ordem de execução: **A (erros) → B (fundação) → C (RAG) → D (copilot) → E (PWA) → F (SROI) →
G (LoRA infra) → H (docs/pendências)** — espelha a ordem do plano de arquitetura com correções
antes de tudo.

Gate de cada etapa: suíte completa verde (unit + smoke **com banco recém-semeado**) + gates
específicos declarados nas etapas (B, C, D com sub-gates de Modo A e B, F). CI: `AI_ENABLED=false`
explícito, testes com stub, rag-test com corpus reconstruído. Gates que exigem modelo real são
**gates de máquina local**, documentados em `ai/README.md`. Ao final: revisão adversarial da
implementação inteira + correções, e atualização de `ARQUITETURA.md`, `DECISOES-TECNICAS.md`,
`MODELO-DE-DADOS.md`, `TESTES.md`, `README.md`.

**Fora do escopo, com justificativa registrada:**
- Treino LoRA real (§7 — gate da própria arquitetura).
- Autenticação real (ERR-04/decisão 8 — dívida declarada, dados sintéticos).
- Embeddings/híbrida/reranking (gate de medição do próprio plano: só se FTS5 não bastar).
- Ingestão DOCX (nenhuma fonte DOCX no corpus inicial; PDF coberto por conversão offline com
  proveniência) — divergência declarada da arquitetura §1.2.
- Pitch Deck completo (números reais 2025/orçamento 2026 não existem no repo).
- Execução da validação com usuário real e regravação do vídeo (dependem de gente).
- GAP-15 (SDQ, B4/SROI vivo, M4, sugestão automática fase 2) — permanece deferido por decisão
  registrada com gatilho nomeado no Horizonte 3 da `ARQUITETURA.md`.
- Tailscale/acesso fora da rede (opcional na arquitetura §2.6) — deferido até demanda real de
  acesso remoto; caminho documentado no README da Etapa E.

## 10. Registro da revisão do plano (25/08/2026)

Painel adversarial (4 lentes × verificação cruzada): 30 achados, 29 procedentes, 1 descartado
(VIABILIDADE-07 — o procedimento de banco recém-semeado já estava declarado). Os 2 bloqueantes:

1. **ETICA-DOUTRINA-01** — Modo A enviava transcrição com nomes ao modelo → resolvido com
   pseudonimização reversível por token e de-mapeamento fora do modelo (§4).
2. **VIABILIDADE-01** — PWA "instalável pela rede local" era promessa tecnicamente falsa
   (secure context) → Etapa E reescopada com limitação declarada (§5).

Demais correções incorporadas: ordem filtro→pseudonimização fixada (§0.3, §4); limite residual
declarado (§4); mecanismo lícito do dataset LoRA por doação explícita (§4, §7); saída do
`/api/sroi/explicar` sob `revisarSobreAlegacao` e endpoint separado do chat (§6); SW
network-first (§5); manifest em JSON (§3); stub de CI (§2); determinismo e métrica do gate RAG
(§3); `-np 2`/AbortController/teto de fila (§2, §4); corpus.db reconstruído no CI e guarda de
FTS5 no banco principal (§3); duas portas por papel (§2); chunking por palavras e HTML→texto
determinístico (§3); filtro `faixa_etaria` (§3); anonimização da query do RAG (§3); pipeline
PDF com proveniência (§3); sub-gate do Modo A (§4); borda 2 determinística (§8); cobertura
pt-BR no rag-test (§3); mapeamento indicadores→categorias e eixo narrativo da violência (§6);
ativação condicionada à PoC (§0.4); A3 corrigido para `src/domain.js` (§1); CFL-03,
jornadas/canvas e insumos do business case (§8); GAP-15 e Tailscale registrados (§9).
