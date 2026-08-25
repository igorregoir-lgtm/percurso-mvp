# MVP Canvas — Percurso (EA-05)

Canvas do MVP no formato de Paulo Caroli, em tabelas. Cada célula é **derivada** da
[`LEAN-INCEPTION.md`](LEAN-INCEPTION.md) (que por sua vez lê o template preenchido em aula e o
dossiê de campo) — este documento não decide nada novo. Onde a inception não tem número, a célula
diz que não tem; inventar valor aqui destruiria a rastreabilidade que o resto do repositório
sustenta. Atende ao entregável EA-05 e ao achado D-05 da
[`revisao/02-RELATORIO-REVISAO.md`](revisao/02-RELATORIO-REVISAO.md).

---

## 1. Proposta do MVP

| Campo | Conteúdo |
|---|---|
| Para | a coordenação e os educadores do Instituto Ebenézer |
| Que | veem a evolução socioemocional das crianças acontecer toda semana, mas não têm como registrá-la, acompanhá-la no tempo nem comprová-la a quem financia o trabalho |
| O | Percurso |
| É | um sistema que converte a observação de minutos do educador em indicadores de evolução por trajetória e por programa |
| Diferentemente de | planilhas de presença e do relatório anual textual, que dizem quantas crianças vieram — não o que mudou |
| O nosso produto | comprova a transformação que o Instituto provoca, sem que dado sensível de criança saia da organização, sem licença recorrente e operável pela própria equipe depois da semana 10 |

O problema, em uma frase (inception, §1): a evolução socioemocional acontece toda semana, é vista
pelos educadores, e não é registrada, acompanhada no tempo nem comprovável a quem financia.

## 2. Personas segmentadas

| Persona | Papel | O que define o segmento |
|---|---|---|
| **Maria Silvia**, 35, pedagoga do reforço escolar (7–11) | Persona principal — quem registra | *"Não consigo transformar em dados os resultados do meu trabalho."* Dores: registrar sem tirar atenção das crianças; ter mais tempo para planejar; agir sob demanda. Necessidade decisiva: **não expor as crianças** — exigência da própria usuária |
| Coordenação | Usuária secundária — quem agrega e presta contas para dentro | Precisa do agregado, da cobertura, da evasão e da síntese que alimenta o relatório ao financiador |
| Diretoria | Quem presta contas para fora | Trabalha só sobre a camada agregada — sem acesso individual, por desenho (perfil formalizado na v2; ver [`O-QUE-VEIO-DA-V2.md`](O-QUE-VEIO-DA-V2.md)) |
| **Não é usuária: a psicóloga** | — | O registro clínico tem outro titular e outro regime de sigilo; capturá-lo é o que o produto se recusa a fazer |
| **Nunca é titular operacional: a criança** | — | Todo o público é menor de idade; nenhum fluxo depende de ação da criança; consentimento é do responsável |
| Fora do MVP: o responsável como usuário | — | O perfil de acesso digital das famílias não está caracterizado; nada pode pressupor aparelho ou conexão |

## 3. Jornadas

Resumo da inception (§5); as jornadas completas, atual × futura por persona, estão em
[`JORNADAS.md`](JORNADAS.md).

| Persona | Jornada atual (sem o produto) | Jornada no MVP |
|---|---|---|
| Educadora | Observa → guarda na cabeça → conta no corredor → **a informação morre ali**; a planilha registra só quem veio | Hoje → Chamada (um toque) → Folha do dia por voz com confirmação humana → Agenda do ciclo → Observação por rubrica (~3 min) → Turma (médias ciclo a ciclo) → Pauta de segunda |
| Coordenação | Consolida presença à mão; escreve o relatório anual **com adjetivos, porque não tem substantivos** | Painel (criança ≠ matrícula, cobertura, alertas) → Scores → Safras → Síntese em template + revisor → aprovação humana → fecho do ciclo |
| Diretoria | Prestação de contas com número de atendidos e texto qualitativo | Relatório do ciclo em sete blocos (supressão n<5 antes da redação) → Carta do trimestre → Consulta agregada — sem nenhum acesso individual |

## 4. Funcionalidades

As sete decididas na inception (§4), cada uma amarrada a uma dor da persona. O MVP implementa
exatamente estas sete — nenhuma a mais no escopo v1.

| # | Funcionalidade | Dor que mata |
|---|---|---|
| F1 | Ficha viva da criança — criança ≠ matrícula, consentimento Art. 14 embutido: campo sem consentimento nasce bloqueado | "não expor as crianças" |
| F2 | Presença em um toque | "registrar sem tirar atenção das crianças" |
| F3 | Ciclo de observação — rubrica com âncoras comportamentais, ~3 min por criança | "processo consistente de registro" + "não expor" |
| F4 | Agenda do ciclo — pendências, distribuição, janela mínima de convívio | "agir sempre sob demanda, sem controle" |
| F5 | Trajetórias — por criança (interna, categórica) e por turma/programa (agregada) | "transformar em dados os resultados do meu trabalho" |
| F6 | Safras, permanência e alerta de ausência | "agir antes da evasão" |
| F7 | Fecho do ciclo — síntese em template contido + revisor de sobre-alegação | a lacuna que o relatório anual não fecha |

Fora deliberadamente: âncora acadêmica do parceiro (aguarda a pergunta 2 do bloco 7), registro
clínico (fora por construção), SROI vivo (a jusante), autoatendimento do responsável.

Em 22/08/2026 o escopo ganhou as quinze features do `percurso-v2-pack` (voz, scores, pauta,
relatório do doador) por decisão registrada — a matriz completa está em
[`O-QUE-VEIO-DA-V2.md`](O-QUE-VEIO-DA-V2.md). Este canvas registra o MVP como a inception o
decidiu.

## 5. Resultado esperado

| Resultado | Como se reconhece |
|---|---|
| O Instituto passa a afirmar **o que mudou**, não só quem veio | A síntese do ciclo produz a frase que o relatório anual nunca conseguiu conter: médias por dimensão, ciclo contra ciclo, com ressalva metodológica obrigatória — *"é esta frase — e não o número de presenças — que o Instituto não conseguia dizer a quem financia"* |
| A educadora vê o próprio trabalho virar evidência | Ao fechar a última observação da turma: 18 de 18, o tempo investido, as barras dos dois ciclos (inception, §6a) |
| O registro sobrevive à primeira falha | Retomada sem culpa, chamada que nunca expira, rascunho persistente — o desenho anti-abandono da inception (§6b) |
| Nenhum dado sensível de criança sai da organização | Consentimento por campo bloqueado por padrão, filtro de perímetro, agregação com supressão — a proteção é regra do sistema, não boa vontade |

## 6. Métricas para validar as hipóteses de negócio

As hipóteses vêm das dores e das user stories da inception. A coluna de valor diz a verdade: o
que está instrumentado no produto ainda **não tem medição com usuário real** — a sessão de
validação não aconteceu ([`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md)).

| Hipótese de negócio | Métrica | Instrumento | Valor medido hoje |
|---|---|---|---|
| A educadora registra a observação em minutos, sem perder a atenção das crianças (US1) | Tempo por observação (promessa: ~3 min) e tempo de chamada | Cronômetro de registro (`encontro.duracao_segundos`, telemetria do experimento — decisão 11 de [`DECISOES-TECNICAS.md`](DECISOES-TECNICAS.md)); tarefa 5 do protocolo de validação | **pendente** — sem sessão com usuária real |
| A captura por voz é mais barata que o formulário | Taxa de correção pós-extração; limite declarado: acima de 40%, o extrator está pior que o formulário e a decisão deve ser revista | Instrumentada em `#/scores` (decisão 13); tarefa 3 do protocolo de validação | **pendente** — sem sessão com usuária real |
| O registro acontece de fato, ciclo após ciclo | Cobertura do registro por turma | Score de cobertura (`#/scores`, `#/painel`) — mede o sistema, não a professora | só dados sintéticos; sem operação real |
| A devolução (pauta de segunda) é útil, não enfeite | Taxa de aceite × descarte das sugestões | `#/pauta` — o descarte é medido por desenho | só dados sintéticos; sem operação real |
| A coordenação demonstra resultado sem expor criança (US4, US5) | Síntese aprovada pelo revisor + aprovação humana; zero dado individual em saída externa | Revisor de sobre-alegação e supressão n<5, ambos cobertos por teste | comportamento provado por teste ([`TESTES.md`](TESTES.md)); valor de negócio depende de um financiador real ler o relatório — **pendente** |
| A organização opera sozinha depois da semana 10 | A equipe roda `node server.js`, faz backup e fecha um ciclo sem o grupo presente | Handover em `docs/`; critério do bloco 5 do dossiê | **pendente** — só verificável após a entrega |

## 7. Custo e cronograma

A inception não registra orçamento em reais — e as restrições do bloco 5 (sem equipe de TI, sem
orçamento para licença recorrente) foram tratadas como **restrições de desenho**, não como linhas
de custo. O que se pode afirmar:

| Item | Valor | Origem |
|---|---|---|
| Licenças e dependências de software | **R$ 0** — Node puro, SQLite embutido, zero `npm install`, nenhuma API paga | Decisão 1 e decisão 13 de [`DECISOES-TECNICAS.md`](DECISOES-TECNICAS.md) |
| Operação local (máquina do Instituto) | Sem custo além de um computador com Node >= 22.13 (recomendado 24 LTS, fixado no `.nvmrc`) | [`README.md`](../README.md) |
| Deploy em nuvem (opcional) | Render, plano Starter com disco persistente — plano pago; **o valor da mensalidade não está registrado nos documentos e não é inventado aqui** | [`ARQUITETURA.md`](ARQUITETURA.md), decisão 12 |
| Equipe | O próprio grupo até a entrega; depois, a equipe do Instituto (a solução foi desenhada para não exigir profissional de tecnologia) | Bloco 5 do dossiê, via inception |

| Marco | Data | Estado |
|---|---|---|
| Semana 5 — protótipo + validação com usuário | 04/09/2026 | Protótipo superado pelo MVP funcional; a validação com usuário **permanece pendente** (achado D-02) |
| Semana 10 — MVP funcional + handover | 09/10/2026 | Em curso; pendências nomeadas no Horizonte 1 de [`ARQUITETURA.md`](ARQUITETURA.md) (validação com usuário real e vídeo da v2 — o escopo de turma no RBAC foi fechado em 25/08, decisão 22) |
| Piloto com dado real | sem data | Condicionado às dívidas de operação (autenticação, HTTPS, auditoria) — Horizonte 2 |
| Evoluções condicionadas (SLM local, âncora acadêmica, SROI) | sem data | Cada uma com dono e gatilho — Horizonte 3 |
