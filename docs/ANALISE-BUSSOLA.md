# Análise comparativa — Bússola × Percurso

Em 18/08/2026 foi analisado o app **"Bússola — Instituto Ebenézer"** (protótipo em Google AI
Studio, mesmo Desafio B do módulo), com leitura integral do código-fonte: 10 componentes React,
serviços, tipos e servidor Express com Gemini. Este documento registra o que foi **adotado** no
Percurso, o que foi **rejeitado**, e por quê — porque disciplina de escopo se demonstra por
escrito, não por omissão.

## O que o Bússola é

Aposta na **cadência diária**: marcadores de comportamento por encontro ('participou',
'colaborou', 'pediu ajuda', 'concluiu'), resumo falado transcrito por Gemini na nuvem, pauta de
segunda-feira gerada por IA, bússola mensal agregada, reconciliação de matrículas. Armazenamento
em localStorage; personas Maria/Coordenação por toggle.

## Adotado no Percurso (7 itens)

| # | Ideia do Bússola | Como entrou no Percurso | Por que cabe no escopo |
|---|---|---|---|
| 1 | **Cronômetro de registro com meta < 2 min** | Cronômetro visível na chamada; duração persistida em `encontro.duracao_segundos`; cartões "custo de tempo" na turma e "promessa de tempo" no painel | É a métrica do experimento de validação do próprio curso (aula de discovery: sucesso = "tempo médio abaixo de dois minutos"). Mede o MVP, não muda seu escopo |
| 2 | **Painel de reconciliação de dados divergentes** | Tabela fonte × valor × o que media × leitura adotada no painel da coordenação | É a entrega (d) da semana 5 ("reconciliação explícita dos dados divergentes") virando tela |
| 3 | **Devolução de pauta ("promessa de reciprocidade")** | "Plano da próxima semana" no painel da turma: radar de ausências + foco pedagógico (menor média) + atividade sugerida | Ataca a dor nº 2 da persona ("ter mais tempo para planejar"), que o Percurso subatendia. F5+F6 já produziam a leitura; faltava devolvê-la como pauta |
| 4 | **Supressão de célula pequena (n < 5)** | `agregadoPorCiclo` suprime média com menos de 5 crianças; a UI mostra "suprimido (n<5)" | Lógica populacional do EDI que o próprio material do módulo referencia; endurece o bloco 6 |
| 5 | **Aspiração declarada (Laboratório de Sonhos)** | Campo `crianca.aspiracao` + chip na ficha + ganchos agregados por área no plano | É A metodologia do Laboratório (bloco 3 do dossiê) — programa em escopo que o Percurso só cobria com presença. Base legal declarada na governança |
| 6 | **Registro por voz** | Dica de ditado pelo teclado do celular no campo livre | A visão de produto da aula diz "voz ou texto". O ditado do teclado entrega voz com zero nuvem própria — o filtro de perímetro continua valendo |
| 7 | **Exportação de relatório** | Botão "Imprimir para o relatório" na síntese aprovada + folha de estilo de impressão | A síntese aprovada é o artefato para o financiador; imprimir era o último passo que faltava |

## Rejeitado — com justificativa

| Ideia do Bússola | Por que NÃO entrou |
|---|---|
| **Marcadores de comportamento por encontro (diários)** | Contradiz a decisão metodológica documentada do Percurso: rubrica ancorada em ciclos 2–3×/ano — "a cadência da literatura, não a semanal". Registro diário de comportamento vira impressão a quente, sem âncora, e infla o custo de tempo que a restrição do bloco 5 proíbe |
| **Resumo falado transcrito por LLM na nuvem** | O áudio da educadora citando crianças sairia da organização (Gemini API). Fere a doutrina "dado sensível não sai" — o próprio Bússola precisa prometer "áudio descartado" porque abriu essa porta. O Percurso resolve voz com o ditado local do teclado |
| **Pauta gerada por LLM (`generate-agenda`)** | Doutrina do Percurso: escore e plano nascem de regra auditável, nunca de modelo. O plano da semana usa banco fixo de atividades por dimensão — o financiador pode auditar por que aquela atividade foi sugerida |
| **Armazenamento em localStorage** | Dados presos ao navegador de cada pessoa quebram o F7 (síntese agregada do que todas registraram) e o handover. O Percurso mantém SQLite compartilhado |
| **Fluxo aceitar/dispensar da pauta com histórico** | Valor real, custo real (tabela + endpoints + estados). O radar já tem tratativa via alertas; o resto do plano é sugestão de leitura. Fase 2 |
| **Offline-first com flag `synced`** | Service worker + sincronização = complexidade que a restrição "sobreviver à semana 10" não sustenta. A operação é local, na rede do Instituto. Fase 2 declarada |

## Síntese

O Bússola é forte em **loop de reciprocidade** (registro → pauta de volta) e em **medir o próprio
custo** (cronômetro) — as duas coisas entraram. É frágil onde terceiriza julgamento a um LLM na
nuvem e onde aposta em cadência diária sem âncora metodológica — nessas, o Percurso mantém a
posição documentada, agora com a rejeição registrada e justificada.

## Revisitado na v2 (22/08/2026)

A incorporação do `percurso-v2-pack` reabriu três linhas desta tabela. O registro fica aqui para
que a decisão anterior não pareça ter sido apagada — ela foi **revista, com fato novo**.

| Linha desta análise | O que mudou | Onde |
|---|---|---|
| *"Fluxo aceitar/dispensar da pauta com histórico"* — rejeitado como fase 2 | **Adotado.** O pack o coloca como F11 e mostra por quê: o **descarte** é a métrica que diz se a sugestão está genérica. Sem ele, não há como saber se a pauta está sendo lida. | tabela `pauta`, `#/pauta`, `taxaDeDescarte` |
| *"Offline-first com flag `synced`"* — rejeitado por custo de service worker | **Adotado em versão menor.** Não há service worker nem cache de aplicação: só uma fila em `localStorage` para `POST` que falhou **por rede**, drenada no evento `online`. Custo baixo, e a restrição real (a rede cai dentro da sala) continua de pé. | `postComFila`, decisão técnica nº 17 |
| *"Resumo falado transcrito por LLM na nuvem"* — rejeitado por sair da organização | **A rejeição continua de pé, e a alternativa cresceu.** A dica de ditado pelo teclado virou uma tela de captura de 40 segundos com `SpeechRecognition` do próprio navegador: o áudio continua não saindo do aparelho, e agora existe o agente extrator determinístico do lado do servidor. | `#/voz`, `src/voz.js`, decisão técnica nº 13 |

Também mudou o item 5 dos adotados: a aspiração deixou de ser a coluna `crianca.aspiracao` e virou
a tabela `aspiracao`, com data de declaração — como o `05-MODELO-DE-DADOS.md` do pack pede. Ela
agora alimenta o **score de exposição**, que não existia quando esta análise foi escrita.
