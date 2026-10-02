# Governança de fontes do RAG

> Política operacional de admissão de material ao corpus do copilot.
> Deriva de `docs/ANALISE-SLM-E-SROI.md` §4 ("público não significa autorizado")
> e é APLICADA por código: `src/rag/ingest.mjs` recusa indexar fonte com campo
> de admissão faltando, hash divergente ou `contains_child_data: true`.

## Princípio

**Sem licença verificável, não entra.** Ausência de licença significa não
copiar nem usar — repositório sem LICENSE, dataset "público" sem permissão e
scraping ficam fora. Caso real identificável de criança fica fora de RAG e
LoRA **sempre**, mesmo quando encontrado publicamente.

## O manifest é a porta

Toda fonte vive em `data/rag/manifest.json` com os campos de admissão:

| Campo | Pergunta que responde | Bloqueio |
|---|---|---|
| `source_url` · `author` | Quem publicou e onde está a evidência original? | origem não verificável |
| `license_spdx` · `license_evidence` | Qual licença cobre exatamente este conteúdo? | sem licença ou conflitante |
| `version_date` · `hash_original` · `hash_canonico` | Qual versão entrou e ela é reproduzível? | conteúdo mutável sem snapshot |
| `allowed_use` | RAG, treino, redistribuição são permitidos? | finalidade não autorizada |
| `attribution` | Que créditos são obrigatórios? | atribuição impossível de cumprir |
| `contains_child_data` | Há relato, voz, imagem ou identificador de criança? | **true bloqueia sempre** |
| `pii_review` · `reviewer` | Quem revisou PII e adequação? | sem revisão registrada |
| `destination` | `rag`, `revisar` ou `rejeitado` — com justificativa? | destino indefinido |
| `removal_contact` | Como remover e reconstruir o índice? | remoção inviável |
| `tema` · `faixa_etaria` | Metadados de recuperação (filtros da busca) | sem metadado, não indexa |

**Formato JSON, não YAML** — decisão do princípio 5 do plano (zero dependência
npm; o Node não tem parser YAML nativo).

## Três destinos

- **`rag`** — licença explícita compatível, versão verificada, sem dado
  infantil, revisão registrada. É indexada.
- **`revisar`** — utilidade clara mas licença incerta (ex.: relatórios IDIS
  PIR/VIM). **Não é indexada**; fica no manifest como referência bibliográfica
  citável (as premissas do SROI citam a fonte, nunca reproduzem o texto).
  Para promover a `rag`: obter permissão e registrar a evidência.
- **`rejeitado`** — sem licença, com dado infantil ou proveniência quebrada.
  Registrar o motivo para a decisão não se perder.

## Corpus atual (2026-08-25)

| source_id | Base da admissão |
|---|---|
| `lgpd`, `eca`, `marco-pi` | domínio público — art. 8º, I, Lei 9.610/98 (textos de leis) |
| `bncc-ei`, `bncc-ef` | documento normativo oficial do MEC, publicado para uso público |
| `rubrica`, `protocolo`, `doutrina` | material interno do próprio produto, já aprovado e versionado |
| `idis-pir`, `idis-vim` | **revisar** — sem licença de reuso do texto; só citação bibliográfica |

Revisor registrado: sessão de complementação de 25/08/2026 — **pendente de
revalidação pela coordenação** (fonte nova só entra com revisão humana).

## Pipeline reproduzível

```
originais (data/rag/fontes/, com hash no manifest)
  → node src/rag/preparar-fontes.mjs     # HTML/PDF → texto canônico (determinístico)
  → texto canônico commitado (data/rag/corpus/, hash no manifest)
  → node src/rag/ingest.mjs              # reconstrói data/rag/corpus.db DO ZERO
```

- O `.db` **não** entra no git; o CI reconstrói a cada execução — snapshot é
  o par (fontes canônicas + manifest), não o binário.
- PDF entra por conversão offline documentada (`pdftotext`, hash do TXT
  derivado registrado). DOCX: fora do corpus inicial — divergência declarada
  no plano (§9).
- Texto revogado (`<strike>`/`<del>`) é removido na conversão — norma morta
  não vira chunk citável.
- Chunking: 200–350 palavras por seção/artigo, metadados obrigatórios; sem
  metadado completo, o ingest aborta.

## Remoção

Remover a entrada do manifest (ou mudar `destination`) e rodar
`node src/rag/ingest.mjs` — o índice inteiro é reconstruído sem a fonte.
Não existe estado residual: o banco é derivado, nunca fonte.

## Privacidade na consulta

- A query de `GET /api/rag/search` passa pela **pseudonimização** (nomes do
  roster → "Criança A") ANTES da busca.
- **Política de log: nenhuma query é logada** — nem anonimizada. Privacidade
  por ausência, não por confiança.
- Papéis internos (educador/coordenação); a diretoria não consulta o corpus
  de casos (decisão 16 — o canal dela é o relatório agregado e o
  `/api/sroi/explicar`).

## Avaliação contínua

`scripts/rag-test.mjs` (roda no CI): hit@5 ≥ 14/20, 100% das citações apontam
para chunk existente, cobertura pt-BR ≥ 90%, pseudonimização da consulta.
Limitação declarada: as 20 consultas são de autoria interna e aguardam
validação por pedagogo (`docs/POC-COPILOT.md`).
