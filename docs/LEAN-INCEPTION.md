# A Lean Inception, lida — e o que ela determinou no MVP

Análise do template preenchido em aula (`1 - Arquitetura/Material Produzido em Aula/`) cruzada
com o dossiê de campo e o guia de entregas do módulo. Este documento não propõe nada novo: ele
registra o que a inception já decidiu, para que o escopo do MVP seja auditável.

> **Documento histórico, de antes da v2.** Ele descreve o escopo F1–F7 como decidido na inception.
> Em 22/08/2026 o `percurso-v2-pack` foi incorporado e duas coisas descritas aqui mudaram por
> decisão registrada: o **campo livre da observação saiu do produto** (o filtro de perímetro passou
> a guardar a transcrição de voz, onde a revelação sensível é muito mais provável) e o escopo ganhou
> as quinze features do pack. Ver [`O-QUE-VEIO-DA-V2.md`](O-QUE-VEIO-DA-V2.md) e a decisão técnica
> nº 15.

---

## 1. O problema que o produto resolve

O Instituto Ebenézer identifica o acompanhamento socioemocional como a dimensão **central** do seu
trabalho. É também a única que o relatório anual **não consegue descrever**.

O dossiê descreve três camadas de registro, em ordem decrescente de cobertura e crescente de valor:

| Registro | Cobertura | Conteúdo | Periodicidade |
|---|---|---|---|
| Presença (planilha) | completa | mínimo — quem veio | diária |
| Desempenho acadêmico (parceiro) | 1 dos 4 programas | estruturado | anual |
| Evolução socioemocional | **nenhuma** | **inexistente** | — |

O efeito prático: a organização consegue afirmar *quantas crianças atendeu e quantas vezes cada uma
compareceu*. **Não consegue afirmar o que mudou.** E como o relatório anual é o principal
instrumento com que ela se apresenta a quem financia, a lacuna de medição vira lacuna de captação —
com um agravante: financiador corporativo que entra por incentivo fiscal cobra prestação de contas,
e prestação de contas sem dado é passivo.

**O problema, em uma frase:** a evolução socioemocional acontece toda semana, é vista pelos
educadores, e não é registrada, acompanhada no tempo nem comprovável a quem financia.

---

## 2. O público-alvo

A inception separou dois anéis, e a distinção é o que permitiu dizer não a funcionalidades.

**Persona principal — Maria Silvia, 35, pedagoga do reforço escolar (7–11 anos).**
Roda de segunda a sexta. A frase que a define, tirada da dinâmica:

> *"Não consigo transformar em dados os resultados do meu trabalho."*

| Dores | Necessidades |
|---|---|
| Registrar sem tirar atenção das crianças | Atenção individual a cada criança |
| Ter mais tempo para planejar | Processo consistente de registro |
| Agir sempre sob demanda, sem controle | Não expor as crianças |

A terceira necessidade é a mais decisiva: **"não expor as crianças" é exigência da própria usuária**.
Proteção não é borda de conformidade — é requisito de produto declarado por quem usa.

**Usuária secundária — a coordenação.** Precisa do agregado, da cobertura, da evasão e da síntese
que alimenta o relatório ao financiador.

**Quem não é usuário — a psicóloga.** Decisão explícita: o registro clínico tem outro titular e
outro regime de sigilo. Um sistema que capturasse o que a psicóloga sabe é um sistema que não
deveria existir.

> **Corrigido pelo campo (29/08/2026, decisão 31).** A segunda frase continua verdadeira; a
> primeira caiu. A psicóloga é usuária **do indicador de programa** — presença, registro de
> vivência em lista fechada, check-in de grupo — e é quem nomeia o registro como a dor central.
> O que ela sabe do atendimento continua fora por construção. Ver `JORNADAS.md` §4 e
> `jornada-usuario/CAMPO-versus-REPOSITORIO.md`.

**Quem nunca é titular operacional — a criança.** Todo o público é menor de idade; nenhum fluxo
depende de ação da criança e todo consentimento é do responsável.

---

## 3. A proposta de valor

A visão de produto escrita na aula, no template de Paulo Caroli:

> **Para** a coordenação e os educadores do Instituto Ebenézer,
> **que** veem a evolução socioemocional das crianças acontecer toda semana, mas não têm como
> registrá-la, acompanhá-la no tempo nem comprová-la a quem financia o trabalho,
> **o** Percurso **é** um sistema que converte a observação de minutos do educador em indicadores
> de evolução por trajetória e por programa.
> **Diferentemente de** planilhas de presença e do relatório anual textual, que dizem quantas
> crianças vieram — não o que mudou,
> **o nosso produto** comprova a transformação que o Instituto provoca, sem que dado sensível de
> criança saia da organização, sem licença recorrente e operável pela própria equipe depois da
> semana 10.

O campo "diferentemente de" é o que sustenta o MVP: a alternativa existente está nomeada, e ela
mede presença, não mudança.

---

## 4. As funcionalidades priorizadas para o MVP

Sete funcionalidades, cada uma amarrada a uma dor da persona. **O MVP implementa exatamente estas
sete** — nenhuma a mais.

| # | Funcionalidade | Dor da persona que ela mata |
|---|---|---|
| **F1** | **Ficha viva da criança** — registro único (criança ≠ matrícula), consentimento Art. 14 embutido: campo sem consentimento nasce bloqueado | "não expor as crianças" |
| **F2** | **Presença em um toque** — chamada por turma em segundos | "registrar sem tirar atenção das crianças" |
| **F3** | **Ciclo de observação** — rubrica de botões com âncoras comportamentais, ~3 min por criança; campo livre com filtro que descarta conteúdo clínico antes de gravar | "processo consistente de registro" + "não expor" |
| **F4** | **Agenda do ciclo** — pendências, distribuição por educador, janela mínima de convívio | "agir sempre sob demanda, sem controle" |
| **F5** | **Trajetórias** — evolução por criança (interna, categórica) e por turma/programa (agregada) | "transformar em dados os resultados do meu trabalho" |
| **F6** | **Safras, permanência e alerta** — curvas por safra, evasão, tempo médio; alerta de ausências consecutivas | "agir antes da evasão", "ter controle" |
| **F7** | **Fecho do ciclo** — síntese agregada por programa em template contido, com revisor de sobre-alegação | a lacuna que o relatório anual não fecha |

### O que ficou deliberadamente fora

- **Âncora acadêmica (relatório do parceiro educacional).** Fora até o canal mediado responder
  quais dimensões e qual escala o relatório devolve (pergunta 2 do bloco 7). Desenhar sobre escala
  desconhecida seria retrabalho garantido.
- **Registro clínico e conteúdo de atendimento individual.** Fora por construção, não por
  priorização.
- **SROI vivo / modelagem financeira de impacto.** Fica a jusante, consumindo os indicadores que
  este MVP produz.
- **Autoatendimento do responsável.** O perfil de acesso digital das famílias não está
  caracterizado; nenhuma solução pode pressupor aparelho próprio ou conexão estável.

---

## 5. Os principais fluxos dos usuários

### Jornada atual (sem o produto)

Maria observa a criança durante a semana → guarda na cabeça → conta para uma colega no corredor →
a informação morre ali. A planilha de presença registra quem veio. No fim do ano, a coordenação
escreve o relatório com adjetivos, porque não tem substantivos.

### Jornada futura (com o produto)

```
   MARIA (educadora)                          RITA (coordenação)
   ────────────────────                       ──────────────────
   [Hoje]                                     [Painel]
     ├─ retomada, se houve lapso                ├─ crianças únicas × matrículas
     ├─ alerta de ausência                      ├─ cobertura do ciclo
     └─ o que falta hoje                        ├─ presença do mês
          │                                     └─ alertas abertos
          ▼                                          │
   [Chamada] ── um toque por criança ────────────────┤
          │      └─► gera alerta de ausência ────────┘
          ▼
   [Ciclo] ── quem falta, quem está bloqueado e por quê
          │
          ▼
   [Observação] ── 5 dimensões × 4 âncoras (~3 min)
          │         └─ filtro de perímetro no campo livre
          ▼
   [Turma] ── médias por dimensão, ciclo a ciclo
          │
          ▼                                     [Safras] evasão e permanência
   ═══ turma completa ═══►                      [Síntese] template + revisor + aprovação
                                                     │
                                                     ▼
                                            texto liberado para o relatório
```

### As user stories que o MVP demonstra

1. Como **pedagoga**, quero registrar minha observação de cada criança em minutos, com âncoras
   claras, para manter processo consistente sem tirar atenção das crianças. *(F3)*
2. Como **pedagoga**, quero ver a evolução entre ciclos, para planejar pelo dado e não só pela
   demanda do dia. *(F5)*
3. Como **pedagoga**, quero ser avisada de ausências acumuladas, para agir antes da evasão. *(F6)*
4. Como **coordenação**, quero painel agregado e síntese de ciclo, para demonstrar resultado sem
   expor nenhuma criança. *(F5, F7)*
5. Como **coordenação**, quero campos sem consentimento bloqueados por padrão, para que a proteção
   seja regra do sistema. *(F1)*
6. Como **psicóloga da Vivência**, quero contar em 40 segundos como foi o encontro, para que o
   relatório no padrão do conselho exista sem eu ter que escrever à noite. *(decisão 31)*

> **A sexta chegou depois, e pelo campo.** As cinco de cima saíram da inception, com a pedagoga como
> persona. A visita de 29/08/2026 mostrou que quem tem a dor do registro e quem escreve o relatório
> é a **psicóloga** — e que a turma dela fica fora da rubrica por decisão de projeto. A US-6 é a
> história que a inception não tinha como ter: ela nasce de uma pessoa dizendo *"o maior desafio
> aqui é registrar o que você fez, né?"*. O fluxo dela está desenhado em
> [`task-flow/README.md`](task-flow/README.md) e é o que a sessão de
> [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) mede.

---

## 6. O "what the hell effect" na persona

Pedido explicitamente para esta entrega, e implementado nos dois sentidos do termo.

### (a) O momento de espanto — quando o trabalho invisível vira evidência

Ao concluir a **última observação pendente da turma**, a tela inteira muda. Não é um *toast* de
sucesso: é uma parada. Maria vê, em sequência:

- **18 de 18** — a turma fechada;
- **~54 min** — o que aquilo custou a ela no ciclo inteiro, ao lado das **dimensões comparáveis**
  (hoje são seis — decisão 34; na inception eram cinco);
- as barras das dimensões, ciclo 1 contra ciclo 2, aparecendo na frente dela;
- e a frase, em serifada, entre aspas, montada pelo produto a partir das médias reais:

  > *"Entre o primeiro e o segundo ciclo de observação, as médias da turma subiram em N de M
  > dimensões socioemocionais. 'Expressão emocional' segue como a menor média e orienta o plano do
  > próximo período. As médias descrevem o que a equipe observou, não efeito medido; fatores externos não
  > foram isolados."*

  seguida de: **"É esta frase — e não o número de presenças — que o Instituto não conseguia dizer a
  quem financia."**

É o instante em que a persona vê a própria resposta à frase que a define. O efeito não vem de
animação: vem de a tela devolver a ela, em números, aquilo que ela já sabia e não conseguia provar.

### (b) O efeito no sentido de Ariely — impedir o abandono depois da primeira falha

O risco real de um sistema de registro em ONG não é a educadora não gostar. É ela perder uma
semana, sentir que "já era", e nunca mais voltar. O produto foi desenhado contra isso:

| Mecanismo | Onde aparece |
|---|---|
| Retomada sem culpa: *"Que bom te ver de volta… Nada se perdeu"* | `#/hoje`, após 5+ dias sem registro |
| Nenhuma data expira — chamadas atrasadas continuam registráveis | `#/chamada`, seletor com as datas em aberto |
| Encadeamento de recuperação: ao salvar, o sistema abre a próxima pendência | após salvar a chamada |
| Rascunho de observação: sai no meio, volta onde parou | `#/observacao/:id` |
| Barra de progresso que só sobe — sem *streak*, sem penalidade, sem vermelho de falha | `#/hoje`, `#/ciclo` |
| Bloqueio explicado, nunca como erro da usuária | crianças bloqueadas na agenda do ciclo |

---

## 7. Rastreabilidade — de onde cada decisão veio

| Decisão no MVP | Origem |
|---|---|
| Criança como entidade, matrícula como relação | Bloco 3 do dossiê: "60, 40 e 20 somam exatamente 120" |
| Rubrica de relato do educador, 1–4, com âncoras | Pergunta 5 do bloco 7; lógica populacional do EDI |
| Ciclos 2–3×/ano, não semanal | Restrição de disponibilidade da equipe (bloco 5) |
| Janela mínima de convívio antes de observar | Pergunta 6 do bloco 7 — exigências de aplicação |
| Consentimento específico por campo, bloqueio por padrão | Bloco 6, regra 3 + LGPD Art. 14 |
| Filtro de perímetro no campo livre | Bloco 6 — a fronteira entre registro clínico e indicador |
| Vivência terapêutica fora do sistema | Bloco 6 — sigilo profissional |
| Síntese em template fechado, número vindo de SQL | "Escore nunca nasce de modelo" |
| Revisor de sobre-alegação + aprovação humana | Perímetro de afirmação de impacto |
| Zero dependência, banco em arquivo, sem licença | Bloco 5: sem equipe de TI, sem orçamento recorrente, tem que sobreviver à semana 10 |
