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

## Pendências humanas (herdadas, inalteradas)

- Ligar `AI_ENABLED` em operação real continua atrás do gate da PoC (decisão 19).
- TTS em iOS exige um toque com som ligado antes da primeira fala (limitação do WebKit,
  tratada com o unlock por gesto) — verificar no aparelho físico.
