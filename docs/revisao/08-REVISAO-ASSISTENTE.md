# 08 — Revisão da implementação do Passo (assistente-parceiro)

**Data:** 25/08/2026 · **Escopo:** ciclo do plano `07-PLANO-ASSISTENTE.md` (rev 2)
**Método:** o mesmo dos ciclos anteriores — implementação → gates → inspeção visual mobile
pelo túnel → revisão adversarial multiagente (3 lentes × achado × cético) → correção de TUDO
que se confirmou → gates de novo.

## O que foi implementado

- **Servidor**: `src/assistente.js` (pipeline completo: perímetro → recusas → decisão 16 →
  gate de domínio com precedência reflexiva → guia determinístico → modelo com enum de ações),
  `src/sessoes.js` (factory de sessões RAM/TTL compartilhada com o copilot), rotas
  `POST /api/assistente`, `GET /api/assistente/chips`, `DELETE /api/assistente/sessao`,
  prompt versionado `ai/prompts/assistente-passo.md`, caso `assistente_*` no stub.
- **Cliente** (`public/app.js` + `public/styles.css`): FAB ❋ (oculto em `#/entrar`), painel
  bottom-sheet com focus-trap, fio de conversa, chips por tela, entrada por voz (mesmo
  `blocoDitado`), fala por `speechSynthesis` (opt-in, unlock por gesto no iOS, anti-eco),
  ação como botão-OFERTA "Ir para…", anti-travamento (75 s + Cancelar + rascunho devolvido),
  balão de apresentação única, limpeza integrada a router/Escape/sair.
- **Decisão 26** registrada em `docs/DECISOES-TECNICAS.md`.

## Revisão adversarial — 19 achados brutos, 16 confirmados, 3 refutados

Workflow com 22 agentes: 3 lentes (doutrina/privacidade, servidor, cliente) e um cético por
achado, instruído a REFUTAR lendo o código. Todos os 16 confirmados (14 únicos — o canal da
`tela` e o perímetro parcial foram achados por duas lentes) foram corrigidos no mesmo ciclo:

| # | Sev. | Achado | Correção |
|---|---|---|---|
| 1 | **bloqueante** | `tela` do cliente ia VERBATIM à mensagem de sistema do modelo — canal lateral para nome real e injeção de prompt | `telaSegura()`: lista fechada de rotas; fora dela vira `''` (aplicada no pipeline e nos chips) |
| 2 | importante | `fala: null` deliberada do modelo era substituída pela resposta de tela (`??`) | `'fala' in r` distingue guia (sem campo) de julgamento do modelo (null fica de pé) |
| 3 | importante | Perímetro PARCIAL descartava trechos em silêncio — sem caminho humano | `trechos_excluidos` + `aviso_perimetro` viajam em TODA resposta; fala calada; cliente mostra no fio |
| 4 | importante | `casarIntencao`: "como" no rótulo "Contar como foi (voz)" fazia "como chego na pauta?" oferecer a tela errada | `PALAVRAS_VAZIAS` fora do casamento de rótulos |
| 5 | importante | 5 rotas reais sem entrada no GUIA — o chip sugerido dava em "Não entendi" na Folha do dia | Entradas novas: folha, confirmar, alertas, observacao, crianca (com `naoEnxergo`) |
| 6 | importante | Anti-eco não cobria a gravação de 40 s da folha (F3); mic do Passo derrubava a gravação | `falar()` checa `ctx.voz.gravando`; ditado avisa e espera; `pararVoz()` no cleanup do router |
| 7 | importante | Boot sem hash: chips genéricos, "tela desconhecida" e botão morto "Ir para Hoje" dentro do Hoje | Hash normalizado no boot + fallback `#/hoje` em chips/envio/oferta |
| 8 | menor | Regex do pseudônimo com flag `i` derrubava fala legítima ("criança na hora") | `[Cc]rian[çc]as?\s+[A-Z]{1,2}` sem `i` |
| 9 | menor | `preverDoacao` criava sessão vazia e renovava TTL (regressão da extração) | `obter()` na factory: lookup puro |
| 10 | menor | Corpo JSON `null`/primitivo virava TypeError 500 | `lerCorpo` só devolve objeto (senão `{}`) |
| 11 | menor | Sessões sem teto de quantidade; criadas antes dos portões | Teto 400 com despejo da mais antiga; sessão nasce só quando há conversa; id ≤ 80 chars |
| 12 | menor | `dvh` sem fallback (sheet sem teto em navegador antigo) | `vh` declarado antes de `dvh` |
| 13 | menor | `aria-live` no fio inteiro reanunciava a conversa toda; Cancelar destruído levava o foco ao body | Região viva dedicada só com a última fala; foco devolvido ao campo |
| 14 | menor | `passo-ir` não revalidava papel no cliente (item do plano) | Mapa `PASSO_ROTAS_POR_PAPEL` valida o hash antes de navegar |

Refutados (3): dois sobre fala pós-fechamento (a guarda `document.querySelector('.passo-veu')`
já existia) e um sobre o respiro do body vs. FAB (o rolável é o `main`, a conta não se aplicava).

## Validação de ponta (modelo real, Qwen3-4B local)

- Pergunta de produto → `origem: modelo`, resposta ancorada no GUIA, fala curta, ação do catálogo (~1,2 s).
- Perímetro parcial ("…o pai dela bebe e ela apanha em casa") → responde a pergunta válida,
  `fala: null`, aviso + trecho retido no fio (rotulado, sem destaque).
- `tela` hostil com nome de criança + instrução de injeção → sanitizada; nada de nome na resposta.
- Corpo `null` → 422 (nunca 500).
- Visual mobile 375×812 claro/escuro pelo túnel: FAB, painel, chips por tela, oferta,
  redirecionamento reflexivo com "Ir para Refletir".

## Gates finais

77 unit · 255 smoke (seed fresco) · 6 RAG (hit@5 20/20) · 24 ai-stub — todos verdes.

## Adendo — segunda revisão adversarial (25/08 à noite)

Rodada extra com 3 lentes NOVAS (regressão das próprias correções, integração com os recursos
pré-existentes, consistência código×docs×CI), 15 agentes: 12 achados brutos, **11 confirmados,
1 refutado** — todos os 11 corrigidos e retestados no mesmo ciclo:

| # | Sev. | Achado | Correção |
|---|---|---|---|
| 1 | **bloqueante** | Roster de pseudonimização com `ativo = 1`: nome de criança EVADIDA atravessava perímetro, decisão 16, pseudonimização e scrub da fala — e chegaria ao modelo (evasão é pauta da diretoria) | `nomesParaAnonimizar` e a revalidação da doação agora usam TODAS as crianças, sem filtro de ativo |
| 2 | importante | Intenção `'encontr'` capturava "o encontro" — o chip da própria tela Hoje respondia com a busca de Crianças | Radicais desambiguados (`'encontrar'`, `'encontro uma'`) + intenções novas na voz (`'conto como'`…) + `'encontro'` no vocabulário |
| 3 | importante | Token "hoje" (id da 1ª tela = palavra de toda frase) sombreava Chamada/Folha nos passos 3–4 | "hoje" só vence quando é o ÚNICO candidato |
| 4 | importante | Repintura sem troca de rota (fila drenada no `online`, resposta do copilot) fechava o Passo no meio do uso, cortando ditado e fala | `hashRenderizado`: repintura da mesma tela preserva o painel, o ditado DELE e a fala |
| 5 | importante | `docs/TESTES.md` com contagens velhas (17/63) e tabela sem os blocos novos | Tabela + contagens atualizadas (81 unit · 255 smoke · 24 stub) |
| 6 | menor | Desempate por quantidade fazia "como marco todos presentes?" cair na resposta genérica | Pontuação = comprimento da MAIOR intenção casada (especificidade vence) |
| 7 | menor | 401 no painel virava bolha de erro em loop | `e.status === 401` → fecha o painel e leva ao `#/entrar` (convenção do app) |
| 8 | menor | Troca de pessoa herdava a voz ligada (`percurso_passo_som`) | `limparEstadoLocal` zera `passo.som` e remove a chave — opt-in é por pessoa |
| 9 | menor | `AI_ASSISTENTE` sem documentação operacional | Documentado em `ai/README.md` e na decisão 26 |
| 10 | menor | §Cliente do plano 07 ainda descrevia auto-navegação | Corrigido para a oferta (com nota de retificação) |
| 11 | menor | Seções 12/13 duplicadas no smoke | Renumeradas para 19/20 |

Refutado: "doação sem gate automatizado" (o smoke cobre prévia/doar/revogar).

Validação ao vivo pós-correção: diretoria + nome de evadida → recusa determinística; os 8 casos
do matcher corretos; 81 unit · 255 smoke · 6 RAG · 24 stub verdes.

## Pendências humanas (herdadas, inalteradas)

- Ligar `AI_ENABLED` em operação real continua atrás do gate da PoC (decisão 19).
- TTS em iOS exige um toque com som ligado antes da primeira fala (limitação do WebKit,
  tratada com o unlock por gesto) — verificar no aparelho físico.
