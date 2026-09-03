# Metodologia de validação do Percurso com usuário real

> **O que este documento é.** O **método** por trás da sessão de validação: quais hipóteses estão
> em teste, com qual instrumento cada uma é medida, qual número aprova, qual número reprova, de
> onde vem cada limiar, como os dados são analisados e o que a sessão **não** prova.
>
> **O que ele não é.** O roteiro da sessão. Esse é o [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md)
> — tarefas, termo, formulário e o registro do resultado (§6, hoje em branco).
>
> | Documento | Papel |
> |---|---|
> | Este | por que estas medidas, com quais limiares, e o que conta como falseamento |
> | [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) | como conduzir a sessão e onde registrar o resultado |
> | [`visita-ebenezer/ROTEIRO-GRUPO.md`](visita-ebenezer/ROTEIRO-GRUPO.md) | método de campo comum ao grupo, Trilhas A e B |
> | [`visita-ebenezer/ROTEIRO-IGOR.md`](visita-ebenezer/ROTEIRO-IGOR.md) | execução pessoal, setup técnico, conversas paralelas |
>
> Atende à pendência "Definir metodologia: critérios e métricas quantitativas para os testes com
> usuários" (mentoria de tecnologia com Bryan Ferreira, 26/08/2026) e ao achado **D-02** da revisão
> arquitetural.

---

## 1. O objeto e a pergunta

**Objeto.** O Percurso na configuração **v2** — `AI_ENABLED` desligada, que é o padrão. A camada de
IA local (copilot, RAG, SROI explicado por modelo) **está fora deste estudo**: é passo opcional da
jornada, e testar o opcional antes do fluxo principal inverte a pergunta.

**Pergunta central.** Não é "ela gostou". É:

> **O custo de registrar cabe na rotina de quem atende criança — e o comportamento sobrevive à
> primeira falha?**

As duas metades importam separadamente. A primeira é medida por tempo e conclusão de tarefa. A
segunda é medida pelo **Protocolo do Lapso** (§5.5) e não é medida por nenhum outro instrumento
deste documento — nem por nenhum dos 165 testes unitários ou das 374 asserções de fluxo do
repositório.

**Por que teste automatizado não responde.** Ele prova que o sistema faz o que o código diz. O
produto está ancorado em duas frases literais da psicóloga na visita de 29/08/2026 (*"o maior
desafio aqui é registrar o que você fez, né?"* e *"você depois tem que sair daqui, preencher o
relatório… não dá, não dá"*) e em promessas verificáveis só por observação: 40 segundos de fala
que viram registro, o relatório do conselho sem escrever à noite, ~3 minutos por observação na
rubrica. Enquanto ninguém real passar pelo fluxo, isso é hipótese.

> **Quem é "ninguém real" mudou (02/09/2026).** Até a visita, a participante prevista era a
> **pedagoga**. O campo mostrou que quem tem a dor do registro e escreve o relatório é a
> **psicóloga**, e que a turma dela está fora da rubrica por decisão de projeto (decisão 31) — o
> que torna a agenda do ciclo e a observação por criança inexecutáveis para ela (`src/api.js:293`).
> O protocolo em [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) foi refeito em cima disso; a
> variante pedagoga sobrevive lá na §3.4, para turma dentro da rubrica. Este documento acompanha:
> o que muda é **em quem** cada hipótese é medida e **com qual tarefa**, não os limiares.

---

## 2. As sete hipóteses em teste

Derivadas de [`MVP-CANVAS.md`](MVP-CANVAS.md) §6 e das User Stories de
[`ARTEFATO-SEMANA-5.md`](ARTEFATO-SEMANA-5.md) §3. A coluna de estado é a que este documento existe
para mudar.

| # | Hipótese | Origem | Estado hoje |
|---|---|---|---|
| **H1** | O registro cabe na rotina: **~3 min do gatilho ao relato liberado** para a psicóloga (US-6 · [task flow](task-flow/README.md)); **~3 min por observação** para a pedagoga (US-1 · F3) | US-6 · US-1 · F3 | não medida com usuário real |
| **H2** | A captura por voz é mais barata que o formulário | decisão técnica 13 | não medida |
| **H3** | Bloqueio de consentimento é lido como **protocolo**, não como erro da usuária | US-5 · F1 · decisão 32 | não medida |
| **H4** | O sistema devolve algo a ela — e ela reconhece a devolução como útil | F5, F11 · pauta | não medida |
| **H5** | **O registro sobrevive à primeira falha** — os seis mecanismos anti-abandono funcionam sem ninguém apontá-los | inception §6b | **não medida, e é a mais original** |
| **H6** | O produto **se recusa** a receber o que não deve — e a recusa é compreendida | bloco 6 do dossiê · decisão 15 | provada por teste automatizado; **não provada com humano** |
| **H7** | A organização opera sozinha depois da semana 10 | bloco 5 do dossiê | só verificável após a entrega — **fora do escopo desta sessão** |

H7 fica declaradamente fora: uma sessão de 90 minutos não mede sustentação. O que a visita coleta
sobre H7 são **respostas de entrevista** (quem opera, com quantas horas, quem substitui nas férias)
— insumo do plano de sustentação, não evidência de operação.

---

## 3. Desenho do estudo

| Dimensão | Escolha | Justificativa |
|---|---|---|
| Tipo | Teste de usabilidade moderado, baseado em tarefas, **com provocação de falha** | opinião não prevê comportamento; e o caminho feliz não prevê fevereiro |
| Unidade de análise | **a sessão** — não a pessoa, não a criança | n pequeno não sustenta taxa |
| n alvo | 1 a 3 profissionais | restrição real: equipe pequena com função assistencial (bloco 5) |
| Participante | **a psicóloga da Vivência** — quem escreve o relatório do conselho | persona principal desde a visita de 29/08/2026 |
| Proxy admissível | psicóloga ou assistente social que conduz grupo e registra em outra organização social | **declarar que foi proxy, sem disfarçar**. Pedagoga **não** é proxy dela: é a variante §3.4 do protocolo |
| Aparelho | **celular** (notebook como fallback) | contexto de uso da persona: em pé, na sala, entre atividades |
| Dados | **100% sintéticos**, banco resemeado **e preparado** antes (`scripts/preparar-sessao.mjs`) | regra 1 do bloco 6; sem o preparo a sessão começa com o trabalho feito |
| Duração | 45 min de teste + 10 min de lapso + 10 min de compromisso | o que uma equipe assistencial pode ceder |
| Ordem das tarefas | **fixa entre participantes** | comparabilidade; o aprendizado ao longo da sessão é confundidor conhecido |
| Facilitação | enunciados lidos **literalmente**; sem ajuda antes de 120 s | ver §9, viés do autor |

**Regra de intervenção.** O facilitador só intervém após 120 segundos de travamento **ou** pedido
explícito. Toda intervenção marca a tarefa como "com ajuda" — sem exceção, sem julgamento de
gravidade. A regra existe porque a exceção é sempre plausível na hora e sempre destrói o dado.

---

## 4. Métricas — o painel completo

Seis camadas: três quantitativas de desempenho e esforço, uma comportamental, uma de resiliência,
uma de conformidade.

| Camada | Métrica | Instrumento | Escala |
|---|---|---|---|
| **M1** Desempenho | conclusão sem ajuda; tempo por tarefa | observação + cronômetro | sim / com ajuda / não · segundos |
| **M2** Esforço | **SEQ** — "de 1 a 7, quão fácil foi fazer isso?" ao fim de **cada** tarefa | pergunta única | 1–7 |
| **M3** Sistema | **SUS** (10 itens) ou **UMUX-Lite** (2 itens) ao fim | questionário | 0–100 |
| **M4** Adoção | **escada de compromisso**, 5 degraus | entrevista escalonada | degrau alcançado 1–5 |
| **M5** Resiliência | **Protocolo do Lapso** — longo e curto | provocação controlada | ver §5.5 |
| **M6** Fronteira | tentativa espontânea de inserir conteúdo clínico; resposta do sistema | observação | contagem + citação |
| **Específica** | **taxa de correção pós-extração** | contagem de campos | corrigidos ÷ pré-preenchidos |

**Por que SEQ tarefa a tarefa e SUS só no fim.** SEQ isola *qual* tarefa custou caro; SUS dá uma
leitura do sistema comparável a um benchmark externo. Um sem o outro engana: SUS alto com uma
tarefa de SEQ 2 significa "o sistema é agradável e a coisa mais importante nele é insuportável".

---

## 5. Limiares — cada número, com a fonte

Nenhum limiar é inventado aqui. Quando a fonte é externa ao projeto, está rotulada como tal.

### 5.1. Limiares vindos do próprio projeto

| Métrica | Limiar | Origem |
|---|---|---|
| Tempo de chamada | **< 2 min** | *Dinâmicas de Discovery*, Aula 01: "sucesso: 80% das sessões registradas e tempo médio abaixo de dois minutos" |
| Tempo por observação | **~3 min** (promessa) · **> 6 min = queda** | promessa declarada em [`README.md`](../README.md) e [`JORNADAS.md`](JORNADAS.md); o dobro como teto |
| Fala da folha do dia | **~40 s** | promessa declarada da v2 |
| **Taxa de correção pós-extração** | **≤ 40%** | decisão técnica 13: "acima de 40%, o extrator está pior que o formulário e a decisão deve ser revista" |
| Cobertura de registro (piloto, não sessão) | **≥ 80% das sessões** | Aula 01, mesmo slide |
| **Falha declarada** | a profissional volta à planilha (ou ao papel) por conta própria | Aula 01, critério de falha do experimento de referência |

### 5.2. Limiares de benchmark externo — rotulados

| Métrica | Limiar | Natureza |
|---|---|---|
| **SUS** | **≥ 68** | média histórica do instrumento na literatura de usabilidade. **Não é critério do dossiê**; serve de referência, não de prova de impacto |
| **SEQ** | média **≥ 5,5** de 7 · qualquer tarefa **≤ 3** é achado obrigatório | média típica reportada para o instrumento |

O relatório do grupo deve rotular esses dois como benchmark de mercado. Um SUS de 71 não prova
impacto social; prova que o sistema não é o obstáculo — que é uma afirmação bem menor e
suficiente.

### 5.3. Limiares decididos pelo grupo — declarados como decisão

| Métrica | Limiar | Natureza |
|---|---|---|
| Conclusão sem ajuda | **≥ 5 de 6 tarefas** | decisão do grupo |
| Escada de compromisso | **degrau ≥ 3** (diz dia e horário) | decisão do grupo |
| Protocolo do Lapso | age antes de se justificar, **< 30 s**, sem pedir permissão | decisão do grupo |
| M6 — fronteira | zero tentativas bem-sucedidas de inserir conteúdo clínico | regra 3 do bloco 6, operacionalizada |

### 5.4. As seis tarefas e o que cada uma mede

Enunciados em [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) §3.1.

| # | Tarefa | Hipótese | Métrica principal |
|---|---|---|---|
| 1 | Voltar depois de um tempo fora | **H5** | Provocação Longa: age **< 30 s**, antes de se justificar |
| 2 | A chamada do sábado que ficou | H1 | tempo **< 2 min** · e a data salva é a do sábado, não a de hoje |
| 3 | Registrar o encontro | **H2** | **taxa de correção ≤ 40%**, lida do banco (`campos_editados ÷ campos_sugeridos`) |
| 4 | O relatório do conselho | H1 · H4 | segundos até achar o relato depois de guardar a folha — **limiar 20 s** |
| 5 | A pergunta da assistente social | **H3** | como ela **explica o bloqueio** — citação literal |
| 6 | O recado dos responsáveis | H4 | edita antes de mandar? o quê? — é o trabalho que ela já faz à mão |

**A tarefa 5 não é usabilidade.** É o teste de H3 e o único jeito de saber se o desenho "bloqueio é
protocolo, nunca erro dela" chegou até a cabeça de quem usa. Se ela explicar como erro próprio, o
produto está gerando culpa — e culpa é o combustível do abandono medido em M5.

**A tarefa 4 mede uma costura, não uma tela.** Confirmar a folha devolve a usuária a `#/hoje`
(`public/app.js:4016`); o relato não se abre sozinho. O limiar de 20 s existe para separar "ela não
entendeu o relatório" de "o produto soltou a mão dela no meio da tarefa" — são achados diferentes,
com correções diferentes.

**Correspondência com a variante pedagoga** (§3.4 do protocolo): tarefa 4 lá é a agenda do ciclo
(H3) e tarefa 5 é a observação com âncoras (H1, contra ~3 min). As hipóteses são as mesmas; os
instrumentos mudam porque a turma dela está dentro da rubrica.

### 5.5. Protocolo do Lapso — a medição de H5, em detalhe

O risco real de um sistema de registro em ONG não é ela não gostar. É ela perder uma
semana, sentir que "já era", e nunca mais voltar — o *what-the-hell effect* descrito por Polivy e
Herman: depois de um deslize percebido, a autorregulação não se degrada, ela **colapsa**.

A inception (§6b) desenhou seis mecanismos contra isso, e **nenhum foi medido com humano**:
retomada sem culpa após 5+ dias, nenhuma data que expira, encadeamento de recuperação ao salvar,
rascunho de observação persistente, barra de progresso que só sobe (sem *streak*, sem vermelho de
falha), e bloqueio explicado como protocolo. Este protocolo mede os seis de uma vez.

**Preparação.** `node scripts/preparar-sessao.mjs --lapso` empurra a última atividade da
profissional para **9 dias atrás** — acima do gatilho de 5 dias (`PARAMS.DIAS_LAPSO`) da retomada
sem culpa em `#/hoje`. A retomada lê a tabela `atividade` (`src/domain.js:937`), não os encontros:
mexer só nos encontros não dispara o lapso. O script imprime o estado; conferir antes de começar.

**Provocação longa**, enunciado literal:

> *"Faz nove dias que você não entra aqui. A semana foi corrida, aconteceu de tudo. Entre e me diga
> o que você faria agora."*

| Sinal | Registro | Interpretação |
|---|---|---|
| Tempo até a **primeira ação produtiva** (excluindo leitura) | segundos | < 30 s = aprovado |
| Verbaliza culpa **antes** de agir | sim/não + citação | sim = **reprovado**, mesmo com tempo bom |
| Procura o que perdeu × segue de onde está | qual das duas | procurar o passivo = o produto está exibindo dívida |
| Pergunta se "ainda vale" registrar dia passado | sim/não | sim = a promessa "nada expira" não está visível |
| Lê a mensagem de retomada em voz alta × passa direto | qual das duas | passar direto ≠ falha: o efeito pode ser não-verbal |

**Provocação curta**, no meio da tarefa 3, com a tela de conferência aberta e nada confirmado
(na variante pedagoga, no meio da tarefa 5, com a observação pela metade):

> *"Uma criança acabou de te chamar. Sai daí agora."* — 60 s de conversa sobre outra coisa —
> *"pronto, voltou. Continua."*

| Sinal | Registro |
|---|---|
| O rascunho sobreviveu? | sim/não |
| Ela sabe onde parou, sem procurar? | sim/não |
| Refaz do zero alguma parte? | quais campos |
| Tempo perdido no retorno | segundos |

**Critério de aprovação de H5 (os dois têm que passar):** no lapso longo, age antes de se
justificar em menos de 30 s e sem pedir permissão; no lapso curto, retoma sem refazer campo.

**Por que 60 segundos e não 5 minutos.** Porque a interrupção de um minuto é o evento mais
frequente e mais realista numa organização cuja função declarada é atender criança. Um artefato que
não sobrevive a ela não sobrevive à terça-feira.

### 5.6. M6 — a camada que não existe em teste de usabilidade comum

Em nenhum outro contexto se mede se um produto **se recusa** a receber dado. Aqui é obrigatório: o
bloco 6 do dossiê diz que a confusão entre **registro clínico** e **indicador de programa** é "o
erro mais provável e mais grave deste módulo", e que um protótipo que a desrespeite é inviável por
construção, independentemente da qualidade de execução.

**A tentativa não se induz.** Mas ela costuma aparecer sozinha: a profissional quer contar algo
sobre uma criança, e procura onde escrever. Com a psicóloga o risco é maior, não menor — a leitura
clínica já está pronta na cabeça dela, e o formato do conselho a proíbe de individualizar. Quando aparecer, registrar três coisas:

1. **Em que tela** ela procurou o campo.
2. **Que categoria** de informação ela queria registrar — *categoria*, nunca conteúdo.
3. **O que o sistema fez**: barrou? explicou? ofereceu o caminho humano?

E o complemento que só uma pessoa pode dar: a **auditoria de fronteira com a psicóloga** (15 min,
como quem diz onde está a linha — ver
[`visita-ebenezer/ROTEIRO-IGOR.md`](visita-ebenezer/ROTEIRO-IGOR.md) §6.3).

> **Correção de premissa (02/09/2026).** Este parágrafo dizia "ela **não** como usuária, mas como
> quem diz onde está a linha". A visita derrubou a primeira metade: ela é **as duas coisas**. Isso
> tem consequência de método — quando a mesma pessoa é usuária e autoridade de fronteira, M6 não
> pode ser medida na mesma conversa em que ela opina sobre a linha, senão a resposta contamina a
> observação. **Medir M6 durante as tarefas; discutir a linha só depois das perguntas finais.**

> **Regra de reprovação global:** um artefato que aceite conteúdo clínico reprova M6 **mesmo com
> M1 a M5 perfeitos**. Não é média ponderada; é gate.

---

## 6. Critérios de decisão — o que aprova, o que derruba

Escritos **antes** da sessão, por exigência de método (Aula 01, estrutura do experimento: "qual
número define sucesso · qual número define que a hipótese caiu").

| Veredito | Condição |
|---|---|
| **Aprovado** | ≥ 5/6 tarefas sem ajuda · chamada < 2 min · observação ≤ 3 min · correção ≤ 40% · SEQ ≥ 5,5 · SUS ≥ 68 · lapso aprovado nas duas provocações · degrau ≥ 3 · M6 sem violação |
| **Aprovado com ressalva** | tudo acima, com **uma** métrica fora do limiar e um ajuste de produto registrado para ela |
| **Hipótese caiu** | ≥ 2 tarefas abandonadas · **ou** observação > 6 min · **ou** correção > 40% · **ou** culpa verbalizada antes de agir no lapso |
| **Reprovação por gate** | qualquer violação de M6 — independentemente de todo o resto |
| **Falha declarada** | a participante diz qualquer variante de **"eu ia continuar na planilha"** |

### 6.1. A regra de proporcionalidade — contra o what-the-hell do próprio grupo

O efeito também opera sobre quem constrói: uma hipótese que cai perto da entrega tenta o grupo a
abandonar tudo — o rigor ("entrega como está") ou a arquitetura ("refaz o modelo").

> **Uma sessão derruba uma tela. Não derruba uma decisão de arquitetura.**
>
> Para derrubar uma decisão registrada em [`DECISOES-TECNICAS.md`](DECISOES-TECNICAS.md) é preciso
> **um limiar já declarado atravessado** — como o teto de 40% da decisão 13 — **ou** duas sessões
> independentes apontando o mesmo ponto. Uma reação de uma pessoa, uma vez, é achado de tela e
> entra como ajuste de tela.

Essa regra é a razão pela qual os limiares da §5 são escritos antes: um número declarado antes é a
única coisa que autoriza uma mudança grande sem que ela seja pânico.

---

## 7. Plano de análise

Simples, porque n é pequeno e sofisticação estatística sobre n=1 é encenação.

| Métrica | Como se reporta |
|---|---|
| M1 conclusão | **contagem bruta**: "5 de 6 sem ajuda". Nunca percentual — percentual sobre n=1 mente |
| M1 tempo | valor por tarefa, em segundos, e a comparação com o limiar. Sem média entre participantes se n < 3 |
| M2 SEQ | valor por tarefa + média da sessão |
| M3 SUS | escore único, com o benchmark 68 citado ao lado |
| M4 degrau | número do degrau em que parou + a frase literal do primeiro "não" |
| M5 lapso | os cinco sinais do lapso longo e os quatro do curto, individualmente. **Não se agrega** |
| Correção pós-extração | fração explícita: "3 de 11 campos" — nunca só o percentual |
| M6 | contagem de tentativas + o que o sistema fez, uma linha por evento |

**Citações.** Literais, entre aspas, anotadas no momento. Paráfrase não é dado e não entra no
registro. Passar a limpo **no mesmo dia** — memória de citação literal dura horas, não dias.

**Tabela de decisão.** Uma linha por achado, com a coluna "o que muda no produto". **"Nada muda" é
resposta legítima, desde que escrita.** Achado sem decisão registrada é achado esquecido até a
semana 10.

---

## 8. O que esta sessão **não** prova

Esta seção existe porque o revisor de sobre-alegação do próprio produto barraria o relatório se ele
afirmasse mais do que isto.

| Não prova | Por quê |
|---|---|
| Que crianças evoluíram | usabilidade não é impacto. Nenhum desfecho de criança é observado nem observável aqui |
| Que a rubrica é **válida** como instrumento de medida socioemocional | validade psicométrica exige estudo próprio, e o dossiê registra a pergunta "como se mede evolução socioemocional em população infantil" como **[pesquisa]**, em aberto |
| Que o registro acontece **ciclo após ciclo** | isso exige piloto de semanas — o experimento de referência da Aula 01 é de 4 semanas com 3 educadoras |
| Que a organização opera sem os autores (H7) | só verificável depois da entrega |
| Que o financiador aceita a evidência | depende de um financiador real ler o relatório. É a sessão A-2 da Trilha A, fora deste estudo |
| Qualquer taxa generalizável | n de 1 a 3. Achado, nunca taxa |

**O que ela prova, e é suficiente para o que se pede:** que o custo de uso cabe (ou não cabe) na
rotina de uma pessoa real, que o comportamento sobrevive (ou não sobrevive) a uma falha, e que a
fronteira ética se sustenta (ou não se sustenta) diante de quem trabalha com criança todo dia.

---

## 9. Ameaças à validade — declaradas

| Ameaça | Efeito | Mitigação adotada |
|---|---|---|
| **Viés do autor** | quem construiu conduz, defende sem perceber, e lê o silêncio como aprovação | enunciados lidos literalmente; contagem das próprias falas; idealmente facilitador ≠ autor |
| **Viés de cortesia** | ela elogia por educação | tarefa em vez de opinião; escada de compromisso troca elogio por custo |
| **Efeito Hawthorne** | ela se esforça mais porque está sendo observada | o resultado é **teto**, não média — declarar assim no relatório |
| **n pequeno** | nenhuma generalização | contagem bruta; nunca percentual |
| **Ordem fixa das tarefas** | as últimas se beneficiam do aprendizado | ordem idêntica entre participantes e declarada |
| **Proxy** | profissional de outra organização ≠ a psicóloga do Instituto; e **pedagoga ≠ psicóloga** — trocar de papel troca de fluxo, não só de pessoa | declarar que foi proxy, e qual dos dois protocolos foi rodado |
| **Cenário sintético limpo demais** | o cartão do dia é mais organizado que a realidade | usar cartão com ruído: uma informação faltando e uma ambígua |
| **Lapso simulado ≠ lapso real** | ela sabe que é encenação; a culpa real é maior | tratar M5 como **limite superior** de resiliência — o resultado real é pior, nunca melhor |

A última merece peso: o Protocolo do Lapso mede o melhor caso. Se o produto já reprova ali, reprova
com folga na vida real.

---

## 10. Ética e conformidade da própria sessão

| Regra | Aplicação |
|---|---|
| Regra 1 do bloco 6 | banco resemeado com **dados sintéticos**; se a participante começar a digitar dado real, o facilitador **interrompe** e registra o momento como achado |
| Regra 2 do bloco 6 | nenhuma pergunta sobre criança, caso ou família — inclusive quando a própria participante oferecer |
| Regra 3 do bloco 6 | pedido de campo novo feito durante a sessão é **anotado**, nunca prometido; o campo só nasce com base legal, titular, acesso e retenção declarados |
| Menor de idade | nenhuma foto ou filmagem com criança em quadro; nenhuma tela aberta onde criança possa ler |
| Termo | assinado **antes** da primeira tarefa, duas vias, com opção de anonimato — modelo em [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) §4 |
| **Exatidão do termo** | o item que promete transcrição no próprio aparelho precisa ser **verificado no navegador e no aparelho exatos** antes de ser impresso. Reconhecimento de voz de navegador nem sempre é local. Se a verificação não for possível a tempo: não rodar a tarefa de voz e registrar a razão |

O último item não é formalidade. É o único ponto deste documento em que o projeto pode fazer, por
descuido, exatamente aquilo que promete impedir.

---

## 11. Rastreabilidade — onde cada resultado aterrissa

| Resultado | Destino |
|---|---|
| Cabeçalho, tarefas, citações, ajustes decididos | [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) **§6** — a seção hoje em branco |
| Tempos, taxa de correção, cobertura | [`MVP-CANVAS.md`](MVP-CANVAS.md) §6 — trocar "pendente" por número medido |
| Achado que muda comportamento do sistema | [`DECISOES-TECNICAS.md`](DECISOES-TECNICAS.md) — decisão nova, com a origem citada |
| Resultado de H5 (lapso) | inception §6b deixa de ser desenho declarado e passa a ser desenho medido |
| Auditoria de fronteira | evidência do bloco 6 no artefato de tecnologia |
| Respostas sobre operação pós-semana 10 | plano de sustentação do business case + [`HANDOFF.md`](HANDOFF.md) |
| Fechamento do D-02 | [`PENDENCIAS-DE-ENTREGA.md`](PENDENCIAS-DE-ENTREGA.md) |

---

## 12. Evolução — o que vem depois de uma sessão

Uma sessão fecha a exigência da semana 5 ("testado e validado com pelo menos um usuário real"). Não
fecha a pergunta de negócio. A sequência, com o custo real de cada degrau:

| Etapa | Desenho | O que passa a ser afirmável |
|---|---|---|
| **Agora** | 1–3 sessões moderadas, 90 min | o custo de uso cabe; o comportamento resiste a uma falha simulada |
| **Piloto** | 3 educadoras × 4 semanas, cadência real, sem facilitador na sala | cobertura ≥ 80% e tempo médio < 2 min — o experimento de referência da Aula 01 |
| **Dois ciclos** | operação com dado real, sob as dívidas de operação resolvidas (autenticação, HTTPS, auditoria) | trajetória comparável ciclo a ciclo |
| **Depois disso** | e só depois | evoluir o SROI de cenário exploratório para análise com efeito local medido — a sequência já declarada em [`SROI-METODOLOGIA.md`](SROI-METODOLOGIA.md) |

Cada degrau só é honesto depois do anterior. Pular do primeiro para o último é a sobre-alegação que
o produto foi construído para não cometer.
