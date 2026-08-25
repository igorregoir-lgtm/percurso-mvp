# Camada de IA local do Percurso

Opt-in, desligável e local: um SLM (Qwen3 4B Instruct 2507) rodando via
`llama.cpp` em `127.0.0.1`, atrás de flag. **Com `AI_ENABLED` desligada — o
padrão — o Percurso é exatamente o produto determinístico de sempre**: nada
desta pasta roda, nenhuma rota de IA responde, nenhum byte sai da máquina.

## Mapa

| Peça | Onde | O quê |
|---|---|---|
| Manifest de modelos | `ai/model-manifest.json` | repo, arquivo, SHA-256, licença, papel e portas — com a nota de proveniência do GGUF |
| Setup | `ai/scripts/setup-model.sh` | baixa os GGUF para `models/` e valida SHA-256 (idempotente) |
| Runtime | `ai/scripts/start-llama.sh` | sobe `llama-server` com `--parallel 2`; `--mini` (1.7B em 8082) e `--ambos` |
| Cliente | `src/ai-client.js` | fetch nativo em `/v1/chat/completions`, AbortController, health por papel, `json_schema` |
| Copilot (Modo B) | `src/copilot.js` + `ai/prompts/copilot-reflexivo.md` | sala de reflexão: 7 blocos por gramática, citações verificadas |
| Modo A opcional | `src/copilot.js` (`extrairComModelo`) + `ai/prompts/copilot-estruturado.md` | extração sob os catálogos fechados de `src/voz.js`, fallback lexical |
| RAG | `src/rag/` + `data/rag/` | FTS5 sobre corpus aprovado por manifest |
| Treino (Fase 4) | `ai/training/` | infraestrutura e gates — treino NÃO executado (leia o README de lá) |
| Stub de teste | `scripts/ai-stub.mjs` | imita o llama-server para CI (sem GGUF) |

## Como ligar (desenvolvimento/demonstração)

```
ai/scripts/setup-model.sh          # uma vez (~4,3 GB)
ai/scripts/start-llama.sh          # terminal 1 — modelo em 127.0.0.1:8081
AI_ENABLED=1 node server.js        # terminal 2 — Percurso com a camada ativa
```

`GET /api/ia/status` mostra o estado por papel. `AI_EXTRATOR=1` liga também o
Modo A por modelo (o extrator lexical continua sendo o fallback de toda falha).

**Em operação real com educadoras, ligar é condicionado ao GO da PoC**
(`docs/POC-COPILOT.md`, gates absolutos do §6.3 da análise). Até lá, a flag só
sobe em sessão de desenvolvimento ou demonstração.

## Papéis, portas e variáveis

| Papel | Porta padrão | Modelo | Timeout padrão |
|---|---|---|---|
| `reflexivo` (Modo B) | 8081 | Qwen3 4B Instruct 2507 Q4_K_M | 90 s (`AI_TIMEOUT_REFLEXIVO_MS`) |
| `estruturado` (Modo A) | 8082 → cai para 8081 | Qwen3 1.7B Q8 (opcional) | 20 s (`AI_TIMEOUT_ESTRUTURADO_MS`) |

Um único 4B pode atender os dois papéis (decisão no manifest). Overrides:
`AI_URL_REFLEXIVO`, `AI_URL_ESTRUTURADO`.

## Medições nesta máquina (M5 Max, 128 GB)

- 80 tokens em 0,62 s (~130–143 tok/s de geração).
- Resposta completa de 7 blocos (Modo B): 10–14 s.
- Extração Modo A: ~1–2 s.
- **Nota de engenharia**: `maxLength` de strings no `json_schema` degrada o
  sampling da gramática do llama.cpp (medido: 143 → 1,5 tok/s). A estrutura
  fica na gramática; o teto de tamanho é aplicado depois, em código
  (`podarResposta` em `src/copilot.js`).

Em máquina modesta do Instituto os tempos multiplicam — o timeout alto existe
para não derrubar resposta legítima; servidor fora do ar falha em ~1 s (health
check) e cai no fallback.

## Gates: o que roda onde

| Gate | Onde roda |
|---|---|
| Contrato de 7 blocos, recusas, fila, fallbacks, Modo A (stub) | CI (`scripts/ai-stub-test.mjs`) |
| RAG hit@5 ≥ 70%, citações 100%, pt-BR, pseudonimização | CI (`scripts/rag-test.mjs`) |
| Modo B com modelo real (qualidade pt-BR, latência) | máquina local — bateria manual documentada |
| Modo A com modelo real (100% JSON válido, zero regressão) | máquina local — validado em 25/08/2026: 6/6, 0 regressões |
| PoC com pedagogos (gates §6 da análise) | humano — protocolo em `docs/POC-COPILOT.md` |

## Herança da dívida de autenticação

Os papéis que a camada de IA respeita (diretoria 403 no chat; doação revogável só pelo doador)
vêm do mesmo cookie sem assinatura de todo o produto (decisão 8): **sem login real, o perfil é
declarativo e forjável** — tolerável apenas com dado 100% sintético. Antes de operar com dado
real, a autenticação é pré-requisito também desta camada (dívida bloqueante, tabela em
`docs/DECISOES-TECNICAS.md`).

## O que esta camada NUNCA faz

1. Pontuar criança ou escolher coeficiente do SROI (decisão 4: o escore nunca
   nasce de modelo).
2. Gravar sem confirmação humana (doutrina v2: a IA pré-preenche; quem
   confirma é a pessoa).
3. Receber nome de criança: `filtrarPerimetro` roda ANTES (com os nomes reais,
   que a 5ª categoria exige), e a pseudonimização substitui o que sobrou. O
   limite residual (apelidos, paráfrase) é declarado na UI.
4. Escutar na rede: o modelo vive em `127.0.0.1`; só o Node local o alcança.
