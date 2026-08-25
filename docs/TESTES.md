# Testes

## Como reproduzir

Em um terminal, com o banco recém-semeado (a bateria **grava** no banco):

```bash
node scripts/reset.mjs && node server.js
```

Em outro:

```bash
node scripts/smoke-test.mjs
```

Saída da última execução: [`EVIDENCIAS-DE-TESTE.txt`](EVIDENCIAS-DE-TESTE.txt) — **255 passaram,
0 falharam**.

Há também uma bateria de **109 testes unitários** das regras críticas de domínio (filtro de
perímetro, validação do schema do extrator, determinismo do agente, os três scores, supressão com
agrupamento, deduplicação da ingestão, revisor de sobre-alegação, consentimento, imutabilidade da
síntese, fecho de ciclo), que roda sem servidor, contra um banco temporário descartável:

```bash
node scripts/unit-test.mjs
```

As quatro baterias (unitária, RAG, IA com stub e smoke) rodam a cada push via [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml).

Os testes **alteram o banco** (concluem observações, aprovam a síntese, revogam consentimento).
Para voltar ao estado de demonstração — pode rodar com o servidor no ar, é só recarregar a página:

```bash
node scripts/reset.mjs
```

---

## O que a bateria cobre

| Bloco | Testes | O que verifica |
|---|---|---|
| 0 · Sessão | 5 | 401 sem sessão; entrada dos dois perfis; educadora barrada no painel da coordenação (403); usuário inexistente |
| 1 · Modelo de dados | 3 | crianças únicas < matrículas; a diferença é exatamente o nº de crianças em 2 programas; vivência terapêutica fora de escopo |
| 2 · Chamada (F2) | 10 | datas em aberto; chamada incompleta recusada (422); status inválido recusado; data futura recusada; salva; sai da lista de pendentes; persiste no banco |
| 3 · Agenda do ciclo (F4) | 4 | observáveis + bloqueadas = total; bloqueio por consentimento; bloqueio por janela de convívio; cobertura só sobre observáveis |
| 4 · Observação e proteção (F3) | 12 | 403 sem consentimento; 403 sem convívio; 422 com dimensão faltando; nível fora da escala recusado; rascunho aceito e recuperado; **texto sobre a criança recusado com encaminhamento humano (422)**; sem texto, conclui normalmente; **nenhum texto sobre criança existe no banco** |
| 5 · Fechar o ciclo (F5) | 7 | conclusão das pendentes; pendências zeram; cobertura 100%; bloqueadas continuam bloqueadas; dois ciclos comparáveis; leitura de forças e atenção |
| 5b · Melhorias da análise Bússola | 13 | custo de tempo medido e persistido; meta = 120s; plano da semana com foco na menor média; atividade do banco fixo; doutrina declarada; ganchos agregados; **invariante de supressão: nenhuma média com n < 5**; reconciliação com 3 fontes; aspiração na ficha e na governança |
| 6 · Alerta e safras (F6) | 6 | alerta aberto; status inválido recusado; tratativa registrada; curvas por safra; **permanência nunca sobe dentro de uma safra**; evasão por programa |
| 7 · Síntese (F7) | 9 | gerada como rascunho; revisor aprova; **texto sem verbo causal forte**; ressalva metodológica presente; números do texto batem com o SQL; educadora não aprova (403); coordenação aprova; síntese aprovada não é sobrescrita |
| 8 · Consentimento (F1) | 7 | painel separa ativos de pendentes; governança declara os 4 atributos; ativação sem responsável recusada; registro desbloqueia a criança; **revogação volta a bloquear** |
| 9 · Ficha viva (F1) | 6 | busca; ficha completa; **os campos novos da v2 na governança**; **áudio e transcrição declaram retenção "não persiste"**; 404 para criança inexistente; 422 para parâmetro inválido |
| 10 · Robustez | 4 | rota inexistente em JSON; JSON malformado (400); não serve arquivo fora de `public/`; painel monta inteiro |
| **11 · Folha, voz e extrator (F2–F6)** | 43 | catálogos fechados; janela de 40 s; piso de confiança 0,6; folha abre no último encontro; **folha sem chamada recusada**; **o extrator devolve 200 sem gravar nada**; toda escolha dentro de lista fechada; até 4 marcadores; "pediram ajuda" é contagem; **fala sensível marca `conteudo_excluido`, devolve a categoria e não alimenta campo nenhum**; o resto da fala continua sendo extraído; **baixa confiança não pré-marca nada**; transcrição longa recusada; **antes de confirmar, não existe folha no banco**; campo fora da lista recusado; **o que a pessoa confirmou vence o que a IA propôs**; a correção humana é medida; **a folha não tem campo sobre criança nomeada** |
| **12 · Os três scores (F8–F10)** | 19 | **educadora não vê a cobertura (403)**; doutrina de "nenhum score pontua a criança"; escopo de matrícula; duas faltas seguidas entram na lista; motivo em português; **compara com a própria linha de base**; cobertura mede o sistema; turma sem registro visível; exposição cruza aspiração × atividade; **lacuna nomeada e publicada**; taxa de correção e de descarte medidas |
| **13 · Pauta de segunda (F11)** | 16 | três cartões; nenhum item nasce de modelo; a semana é uma segunda; nomes só da própria turma; sugestão sai da lacuna; decisão inválida recusada; **descarte registrado e alimentando a métrica de qualidade**; limiar de 30% declarado |
| **14 · Rótulo do registro** | 3 | toda criança tem rótulo; **o rótulo fala do registro, não do comportamento**; nenhum rótulo classifica a criança |
| **15 · Ingestão retroativa (F7)** | 19 | educadora não importa (403); **ACEITE F7: três grafias do mesmo nome viram uma criança**; grafias unificadas no relatório; linha sem nome e data ilegível descartadas com motivo; simulação não grava; permanência reconstruída; reimportar reconhece em vez de duplicar; planilha sem coluna de nome recusada com mensagem útil |
| **16 · Relatório do doador (F13/F14)** | 41 | diretoria entra; **diretoria não abre ficha nem lista crianças (403)**; coordenação não publica (403); sete blocos na ordem do pack; revisor aprova; **nenhum verbo causal forte**; ressalva metodológica presente; crianças únicas e matrículas lado a lado; **supressão aplicada antes da redação e declarada**; programa pequeno agrupado; **nenhum nome de criança no relatório**; dois denominadores de custo juntos; âncora acadêmica declarada como ausente; publicação só pela diretoria; publicado não é sobrescrito; carta pelo mesmo pipeline; período invertido recusado |
| **17 · Consulta agregada (F15)** | 10 | educadora não usa (403); intenção reconhecida com fonte citada; **pergunta sobre criança individual não é reconhecida**; **quando não sabe, diz que não sabe**; oferece o que sabe responder; doutrina de perímetro declarada; pergunta vazia recusada |
| **18 · Fecho de ciclo (achado A-05)** | 5 | educadora não fecha (403); coordenação fecha; abre o próximo; **reporta quantas anotações legadas foram descartadas**; ciclo fechado não fecha de novo |
| **19 · Escopo de turma (decisão 22)** | 4 | lista escopada da outra educadora; existe criança exclusiva de outra turma; **ficha e observação de criança alheia recusadas (403)** |
| **20 · Passo — assistente (decisão 26)** | 9 | 401 sem sessão; 422 vazia; **pergunta reflexiva redireciona ao copilot sem modelo**; redirecionamento sem fala; fora do produto = limite declarado; **diretoria + nome = recusa (decisão 16)**; chips por tela e por papel; sessão apagada |

---

## Teste manual da interface — o que foi verificado no navegador

Executado em viewport móvel (375×812) e desktop (1280×800). Na rodada da v2 (22/08/2026), o fluxo
completo de voz foi percorrido no navegador: gravação, extração, modal de encaminhamento humano,
tela de confirmação com as pills pré-marcadas e o aviso âmbar, e o descarte sem gravação. As telas
de pauta, scores e relatório do doador foram inspecionadas nos três perfis.

Três defeitos foram encontrados **por observação da tela**, não pelos testes, e corrigidos:
título e subtítulo colados nas linhas de "Para esta semana"; chip vazio ocupando espaço na barra
superior; e o cartão "Chamada de hoje" convidando a registrar um encontro em dia sem aula. Um
quarto veio da leitura da tela de scores: a fórmula original do pack saturava em 100 e todas as
crianças em risco apareciam com o mesmo número (decisão técnica nº 18).

| Fluxo | Resultado |
|---|---|
| Entrada como Maria Silvia | Tela **Hoje** com saudação, turma e data corretas |
| Banner de retomada após lapso | *"Que bom te ver de volta — Você ficou 7 dias sem registrar…"* com atalho para a data mais antiga em aberto |
| Alerta de ausência na tela inicial | 2 crianças da turma, com o número de faltas consecutivas |
| Chamada — "Todos presentes" | 20/20 marcadas; botão Salvar habilita só com todas marcadas |
| Chamada — alternar P/F | `aria-pressed` alterna corretamente; contador atualiza |
| Chamada — salvar | Toast de confirmação e **abertura automática da próxima data pendente** |
| Ciclo de observação | 16 de 18, 89%; duas bloqueadas com motivos distintos e explícitos |
| Observação — rubrica | 5 dimensões × 4 âncoras; contador "x de 5 dimensões marcadas" |
| Observação — rascunho | Reabre preenchido, com *"Você tinha começado — continue de onde parou"* |
| **Filtro de proteção** | Modal isola só a frase clínica, nomeia a categoria (*saúde mental / diagnóstico*) e oferece "Salvar sem esse trecho" |
| **Fecho da turma** | Ao concluir a última pendente, a tela de revelação abre com 18 de 18, o tempo investido, as barras dos dois ciclos e a frase para o financiador |
| Painel da coordenação | 106 crianças / 120 matrículas / 14 em 2 programas; cobertura, presença e alertas |
| Safras | Gráfico de permanência com 3 safras; tabela de evasão por programa |
| Síntese | Geração, revisor "aprovado", aprovação humana pela coordenação |
| Consentimentos | Modal com validação de campo vazio; registro desbloqueia a criança e sai da lista de pendentes |
| Responsividade | Layout íntegro em 375px e em 1280px; tabelas largas rolam dentro do próprio contêiner |
| Acessibilidade | Alvos de toque ≥48px; `aria-pressed` nos botões de estado; foco visível; `prefers-reduced-motion` respeitado; contraste dentro do padrão |

---

## Limites do que foi testado

- Não há teste de carga. A operação é de ~106 crianças e uma dezena de operadores.
- Não há teste de navegador antigo. Verificado em navegador baseado em Chromium atual.
- A validação com usuário real (a educadora) é a etapa seguinte — o registro dessa validação
  pertence à documentação da semana 5.

---

## Baterias da camada de IA (v3, 25/08/2026)

| Bateria | Comando | O que cobre | Onde roda |
|---|---|---|---|
| Avaliação do RAG | `npm run test:rag` | reconstrói o índice do zero e mede **hit@5 ≥ 14/20**, 100% das citações apontando para chunk real, cobertura pt-BR ≥ 90% e pseudonimização da consulta | CI e local |
| Camada de IA com stub | `npm run test:ia` | contrato dos 7 blocos por schema, verificador de citações (fonte inventada é descartada), perímetro/recusas SEM chamada de modelo, fallbacks (saída inválida, HTTP 500, timeout), fila de 2 com teto → 503, Modo A com pseudonimização reversível e fallback lexical, e o Passo (schema `assistente_*`, scrub da fala, `fala: null` preservada, ação validada por papel, timeout → guia) — 24 asserções, sem GGUF | CI e local |
| Modo A com modelo real | bateria manual (`ai/README.md`) | 100% de saída válida contra `validarExtracao` e zero regressão frente ao extrator lexical — executada em 25/08/2026: **6/6, 0 regressões** | só local |
| Modo B com modelo real | sessão manual | 7 blocos, citações reais do corpus, recusa de diagnóstico/score, encaminhamento de perímetro, pseudonimização (nome nunca aparece na resposta) — validada em 25/08/2026 | só local |

Os testes unitários somam **109** (os 55 originais + escopo de turma, aviso de corte da lista,
denominador da cobertura só com programas em escopo, o motor SROI — 3 cenários determinísticos,
dupla contagem bloqueada, benchmark recusado no cálculo, rastreabilidade das premissas, parâmetro
fora de 0..1 recusado — e o Passo: sub-tarefas da chamada, recusa da diretoria, redirecionamento
reflexivo, `telaSegura`, perímetro parcial com trechos, `limparFala`, catálogo por papel, sessões
com lookup puro e teto).

O CI (`.github/workflows/ci.yml`) roda tudo com `AI_ENABLED=false` explícito — o produto tem que
ser exatamente o mesmo sem modelo; os gates que exigem modelo real são gates de máquina local.
