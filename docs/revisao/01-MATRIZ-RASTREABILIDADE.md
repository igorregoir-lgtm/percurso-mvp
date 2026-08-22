# Matriz de rastreabilidade — arquitetura → implementação → teste (22/08/2026)

Cada linha liga um requisito do baseline (`00-BASELINE.md`) à sua evidência no código e ao
teste que o protege. Status: **✅ conforme** · **🟡 parcial** · **⛔ ausente** · **📋 deferido**
(fora do MVP por decisão registrada — não é defeito).

Referências de linha são da revisão de 22/08/2026 (commit `9b7d32b` + mudanças desta revisão).

---

## Módulos

| Req | Status | UI (`public/app.js`) | API (`src/api.js`) | Domínio (`src/domain.js`) | Banco (`src/db.js`) | Teste |
|---|---|---|---|---|---|---|
| M1 modelo criança≠matrícula | ✅ | `#/criancas`, `#/crianca/:id` (L564–634), painel L690–702 | `GET /api/inventario`, `/api/crianca`, `/api/criancas` | `inventario()` L52, `fichaCrianca()` L712, `reconciliacao()` L821 | `crianca` L59, `matricula` L73 (UNIQUE crianca×programa×entrada) | smoke bloco 1 (3), bloco 9 (4) |
| M1 painel "o que temos" | ✅ | painel coordenação: tabela por programa + cobertura + reconciliação (L690–712) | `GET /api/painel` | `painelCoordenacao()` L773 | — | smoke 5b (reconciliação 3 fontes), bloco 10 |
| M2 âncora acadêmica | 📋 | — | — | — | — | — (deferido; README declara o porquê) |
| M3 safras/permanência | ✅ | `#/safras` L736–778 (SVG + tabela evasão) | `GET /api/safras` | `safras()` L510 (marcos 3/6/9/12m), `presencaMedia()` L542 | `matricula.entrada/saida/status` | smoke bloco 6 (monotonia da curva, evasão) |
| M4 demanda clínica | 📋 | — | — | — | programa 4 com `no_escopo=0` e nota explicativa (`seed.js` L81) | smoke bloco 1 ("vivência fora de escopo") |
| M5 rubrica | ✅ | `#/observacao/:id` L353–429 (âncoras, `aria-pressed`) | `GET/POST /api/observacao` | `rubrica()` L359, `salvarObservacao()` L372 | `dimensao`, `ancora` (CHECK 1–4), `observacao(_item)` | smoke bloco 4 (14), unit (escala, ciclo fechado) |
| M6 protocolo | ✅ | motivos de bloqueio explícitos na agenda e na tela (L337–347, 362–375) | bloqueio verificado no POST, não só na tela | `PARAMS` L8 (convívio=4, alerta=3), `elegibilidade()` L282 | — | smoke bloco 3 e 4; unit (elegibilidade) |
| B4 consumo da síntese | 📋 | impressão da síntese aprovada (L822) | — | síntese aprovada é a saída p/ B4 | `sintese.status='aprovada'` | smoke bloco 7 |

## Funcionalidades

| Req | Status | Evidência principal | Teste |
|---|---|---|---|
| F1 ficha viva + consentimento | ✅ | `fichaCrianca()` traz governança dos 5 campos; `consentimentoDe()` L240; bloqueio nasce no servidor (`elegibilidade` consultada no POST) | smoke blocos 8–9; unit (registrar/revogar) |
| F2 presença um toque | ✅ | `salvarChamada()` L112 — exige turma completa, recusa data futura, upsert idempotente; cronômetro no cliente L243–252 | smoke bloco 2 (10) |
| F3 observação + filtro | ✅ | `filtrarPerimetro()` L341 roda ANTES do INSERT (L403); 409 devolve trecho+categoria; `forcarLimpeza` grava SEM o trecho | smoke bloco 4; unit (5 testes do filtro + clínico nunca persiste) |
| F4 agenda do ciclo | ✅ | `agendaDoCiclo()` L300 — estados pendente/rascunho/concluída/bloqueada com motivo; `#/ciclo` L312 | smoke bloco 3 (4) — **gap do protótipo resolvido no MVP** |
| F5 trajetórias | ✅ | `trajetoriaCrianca()` L436 (categórica, interna); `agregadoPorCiclo()` L460 (médias, supressão) | smoke bloco 5 (7); unit (supressão) |
| F6 safras + alertas | ✅ | `recalcularAlertas()` L189 (3 faltas consecutivas), resolução automática no retorno; `safras()` | smoke bloco 6 (6) |
| F7 síntese | ✅ | `redigirSintese()` L616 template fechado; `revisarSobreAlegacao()` L562; `aprovarSintese()` exige papel coordenação; aprovada é imutável (L647) | smoke bloco 7 (9); unit (4 testes do revisor/imutabilidade) |

## Requisitos não funcionais

| Req | Status | Evidência | Teste / observação |
|---|---|---|---|
| RNF-01 sintético | ✅ | `seed.js` PRNG `mulberry32(20261009)`; aviso na UI ("dados sintéticos") e no README | inspeção; seed determinístico |
| RNF-02/03 nada sai da organização | ✅ | zero chamadas de rede em runtime (grep: só `fetch` do cliente para a própria API); zero dependência npm | inspeção desta revisão |
| RNF-04 sem licença, equipe sem TI | ✅ | `node server.js` único requisito; backup = copiar arquivo | README; `.nvmrc` adicionado |
| RNF-05 escore nunca de modelo | ✅ | níveis da rubrica; médias por `AVG()` SQL; nenhum LLM no repositório do Percurso | unit ("template sempre passa no revisor") |
| RNF-06 verbos causais controlados | ✅ | `VERBOS_PROIBIDOS` L556 + exigência da ressalva literal | smoke bloco 7; unit (3) |
| RNF-07 registro rápido | ✅ | `duracao_segundos` medido, clampado 1–3600 s; `tempoDeRegistro()` compara com meta 120 s | smoke 5b (3) |
| RNF-08 agregado p/ fora | ✅ | rodapés declaram a regra; individual só em telas internas | smoke 5b (supressão); revisão de telas |
| RNF-09 clínico fora por construção | ✅ | programa 4 `no_escopo=0`; campo `conteudo_clinico` na governança com acesso "Ninguém, no Percurso" | smoke bloco 1; unit (filtro) |
| RNF-10 governança por campo | ✅ | tabela `governanca_campo` (PK=campo); `consentimento.campo` é FK — campo sem governança não recebe consentimento | smoke bloco 8 ("4 atributos") |
| RNF-11 supressão n<5 | ✅ | `agregadoPorCiclo()` L487 devolve `null` se n < `MINIMO_CELULA` | smoke 5b (invariante); unit (célula pequena real) |
| RNF-12 auth/HTTPS/auditoria/persistência | 📋 [OPERAÇÃO] | dívida registrada em `DECISOES-TECNICAS.md` §8 e tabela de dívidas | ver achados A-01..A-04 no relatório |
| RNF-13 retenção cumprida | 🟡 | retenção do campo livre declara "descarte ao fim do ciclo", mas **não há mecanismo de fecho de ciclo nem de descarte** | achado A-05 (relatório) |

## Entregáveis acadêmicos

| Req | Status | Evidência |
|---|---|---|
| EA-01 MVP + modelo de dados | ✅ | código + `docs/MODELO-DE-DADOS.md` |
| EA-02 repositório + handover | ✅ | git com remote GitHub; `docs/` (7 documentos); `video/percurso-demonstracao.mp4` presente (6m14s) |
| EA-03 protótipo navegável S5 | 🟡 | HTML interativo em `1 - Arquitetura/` — cumpre a função; formato diverge do Guia (Figma). Declarar, não retrabalhar (CFL-03) |
| EA-04 jornadas + validação real | ⛔ | persona e user stories existem nos slides; jornada formal e REGISTRO da validação com a educadora ausentes — `docs/TESTES.md` admite ("etapa seguinte") |
| EA-05 Lean/MVP Canvas | 🟡 | `docs/LEAN-INCEPTION.md` cobre escopo e priorização; canvas visual não existe |

---

## Leitura da matriz

- **Nenhum requisito [MVP] está ausente.** Os sete F's estão implementados com verificação no
  servidor e teste automatizado; F4, ausente no protótipo da semana 5, foi implementado no MVP.
- **Os 📋 deferidos (M2, M4, B4, RNF-12)** têm decisão registrada e não contam como defeito.
- **Pendências reais:** RNF-13 (retenção do campo livre sem mecanismo — achado A-05) e
  EA-04 (registro de validação com usuário real — achado D-02). Detalhe e priorização em
  `02-RELATORIO-REVISAO.md`.
