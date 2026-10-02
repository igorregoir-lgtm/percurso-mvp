# Visita ao Instituto Ebenézer — roteiro pessoal (Igor)

> Este documento é para **uma pessoa**: você, com o **Percurso** na mão, dentro do Instituto.
> O método comum ao grupo e às duas trilhas está em [`ROTEIRO-GRUPO.md`](ROTEIRO-GRUPO.md);
> a instrumentação formal do estudo está em
> [`../METODOLOGIA-VALIDACAO-PERCURSO.md`](../METODOLOGIA-VALIDACAO-PERCURSO.md).
> Aqui está o que muda **porque é você quem vai**.

---

## 1. Sua situação, sem enfeite

Você não está na situação do resto da turma, e isso muda o roteiro inteiro.

| | Turma típica | Você |
|---|---|---|
| Artefato | protótipo navegável | **MVP funcional**: 71 rotas, banco SQLite, 294 asserções de fluxo, 136 testes unitários, camada de IA local desligável, motor de SROI determinístico |
| Risco na visita | não ter o que mostrar | **ter demais o que mostrar** |
| Pendência para a semana 5 | várias | **uma só**: o registro de validação com usuário real |

O achado **D-02** da revisão arquitetural classifica essa ausência como "o maior risco da avaliação
acadêmica". [`VALIDACAO-USUARIO.md`](../VALIDACAO-USUARIO.md) §6 está em branco, e a linha
"pendente" aparece seis vezes na coluna *valor medido hoje* do [`MVP-CANVAS.md`](../MVP-CANVAS.md) §6.

**Você não vai ao Instituto buscar validação do produto. Você vai buscar a linha que falta.** São
coisas diferentes, e a diferença aparece no seu comportamento na sala.

E há um segundo motivo, mais importante que a nota: um MVP com 136 testes que ninguém nunca usou é
um MVP que **não sabe se é verdadeiro**. Teste automatizado prova que o sistema faz o que o código
diz. Não prova que a educadora consegue.

---

## 2. A regra que vale mais que este roteiro inteiro

> ### Você não vai apresentar. Você vai calar a boca e cronometrar.
>
> **O aparelho sai da sua mão nos primeiros três minutos e não volta.**

Este roteiro tem 12 seções e todas servem a essa frase. Se você só ler uma coisa antes de entrar, é
esta.

### 2.1. Seus quatro modos de falha, nomeados

Estão nomeados porque nomeado é reconhecível na hora.

| # | O modo | Como ele soa | O que fazer |
|---|---|---|---|
| **F1** | **Explicar a arquitetura** | "isso aqui roda num Qwen 4B local, o áudio não sai do aparelho, o RAG cita a fonte…" | A educadora não quer saber. Ninguém em campo nunca adotou um produto por causa do modelo. **Silêncio.** |
| **F2** | **Defender** | ela trava, e você diz "é que ali o botão é o de cima" | Cada defesa apaga um achado. Você pagou uma visita ao Instituto para comprar esse achado |
| **F3** | **Completar a frase dela** | ela hesita, você fecha a frase | A hesitação **é** o dado. Conte até cinco antes de qualquer som |
| **F4** | **Mostrar a IA** | abrir o Copilot, a tela de Impacto, o SROI, "olha isso aqui" | Nada disso está em teste hoje. Ver §4 |

### 2.2. Cartão de bolso — leve impresso, sério

```
1. O aparelho é dela. Não pego de volta.
2. Ela travou? Conto 120 segundos. Em silêncio.
3. Ela perguntou "isso é o quê?" → "o que você acha que é?"
4. Ela elogiou → "e o que aqui é trabalho a mais?"
5. Ela pediu algo → "anotei." Nunca "dá pra fazer".
6. Silêncio meu não é falha minha. É método.
```

### 2.3. O compromisso de fala

Meta: **você fala menos de 20% do tempo do bloco de teste.** Peça a quem estiver com você para
marcar num papel cada vez que você falar sem ser um enunciado de tarefa. O número no fim da sessão
é seu, não do produto. Ele diz se você testou ou se você apresentou.

---

## 3. Setup técnico de campo — o que dá errado, e o plano para cada coisa

O Percurso é o MVP mais fácil de instalar da turma (`node server.js`, zero dependência) e o mais
fácil de **não abrir na hora**, porque ele depende de uma máquina sua, de uma rede que não é sua e
de um navegador que talvez não seja o seu.

### 3.1. Rede: o padrão do servidor bloqueia o celular

`server.js` faz bind em `127.0.0.1` quando `PORT` não está definida — **de propósito**, por
segurança no uso local. Consequência prática: nesse modo, **só a própria máquina abre o sistema**.
O celular na mesma rede não enxerga nada, e você vai descobrir isso na frente da educadora.

Para a visita:

```bash
cd "2 - MVP Funcional" && node scripts/reset.mjs && HOST=0.0.0.0 PORT=3000 node server.js
```

Depois, no celular, abra `http://<IP-do-Mac>:3000`. Descubra o IP antes de sair de casa:

```bash
ipconfig getifaddr en0
```

**Não dependa da rede do Instituto.** O dossiê nem caracteriza a infraestrutura digital do lugar.
Leve **hotspot próprio** e ponha as duas pontas nele — Mac e celular. Teste em casa, no hotspot,
com o celular que a educadora vai usar (ou um igual), **antes do dia**.

### 3.2. Voz: verifique de onde vem a transcrição, e conserte o termo se for o caso

A captura de voz usa `SpeechRecognition` / `webkitSpeechRecognition` do navegador
(`public/app.js`). Esse é um ponto que precisa de verificação antes da visita, e não de suposição:
**a implementação varia por navegador**, e em parte deles o áudio é enviado ao servidor do
fornecedor do navegador para ser transcrito — o que contradiz frontalmente o item 3 do termo de
participação de [`VALIDACAO-USUARIO.md`](../VALIDACAO-USUARIO.md) §4 ("minha fala é transcrita no
próprio aparelho; o áudio não é gravado nem enviado a servidor algum").

Três passos, nesta ordem:

1. **Teste no navegador e no aparelho exatos** que serão usados na sessão, offline e online.
2. Se a transcrição depender de rede, **ela sai do aparelho**. Ajuste o texto do termo para dizer a
   verdade, e ajuste também a promessa que aparece na tela.
3. Se não der para verificar a tempo: **não rode a tarefa de voz na visita**, rode a folha do dia
   digitada, e registre a razão. Uma tarefa a menos é um custo pequeno. Um termo que promete o que
   o software não cumpre, assinado por uma funcionária de uma organização que atende criança
   vulnerável, é um custo que não se paga.

Isso não é preciosismo acadêmico: o bloco 6 do dossiê é pré-requisito, e o item que mais interessa
ao Instituto no seu produto — *"a fala não sai daqui"* — é exatamente o que precisa ser verdadeiro.

### 3.3. A cadeia de planos

| Plano | O que é | Quando entra |
|---|---|---|
| **A** | Mac rodando o servidor no hotspot; **celular da educadora ou similar** na mão dela | padrão |
| **B** | O próprio Mac na mão dela, em janela estreita | se o celular não conectar em 3 minutos |
| **C** | **Telas impressas**, na ordem do fluxo, coladas em folhas | se nada subir |

O plano C não é humilhação: com papel você ainda mede linguagem, ordem das telas, o que ela entende
por "ciclo", "âncora", "bloqueado" — que é metade dos achados possíveis. O material do módulo diz
isso com todas as letras: *"baixa fidelidade resolve dúvida de fluxo e de linguagem"*.

**Três minutos de tentativa técnica, e você troca de plano.** Cronometre isso também. Grupo que
passa 20 minutos mexendo em rede na frente do usuário perdeu a sessão inteira — e sinalizou ao
Instituto exatamente o que o bloco 5 teme: solução que exige alguém de tecnologia.

### 3.4. Estado do sistema antes de entrar

- [ ] `node scripts/reset.mjs` rodado — banco limpo, **dados sintéticos**
- [ ] **`AI_ENABLED` desligada** (padrão). Ver §4
- [ ] Seed ajustada para o **Protocolo do Lapso**: último registro **9 dias atrás** (§5.3)
- [ ] Dois nomes sintéticos escolhidos e escritos num papel, para a tarefa da chamada
- [ ] Cartão de cenário do dia impresso
- [ ] Nenhuma aba aberta com código, terminal ou documento do projeto
- [ ] Bateria: Mac e celular acima de 80%; cabo na mochila

---

## 4. O que você **não** vai levar

Esta seção existe porque a sua tentação é o oposto da dela.

| Não leve | Por quê |
|---|---|
| **A camada de IA ligada** (`AI_ENABLED=1`) | Com ela desligada o produto é exatamente a v2 — e é a v2 que está em teste. Copilot, RAG e reflexão socrática são **passo opcional** da jornada, não o fluxo principal. Testar o opcional antes do principal é inverter a pergunta |
| **A tela `#/impacto` (SROI)** | Ela é da diretoria e é **exploratória por construção**: faixa, nunca número único, com gate de revisão humana antes de uso externo. Mostrada solta numa sala, vira promessa de "R$ X de retorno social" — a sobre-alegação que o seu próprio revisor determinístico existe para barrar |
| **O número de R$ 45 mil de economia com evasão** | Você apresentou isso ao Bryan como estimativa. Dentro do Instituto, estimativa dita em voz alta vira compromisso. Se a diretoria perguntar, a resposta é: *"é um cenário exploratório com premissas expostas, e precisa de revisão antes de virar material externo"* |
| **O Mac de 128 GB como argumento** | O bloco 5 diz que a organização **não tem profissional de tecnologia** e que solução que exige manutenção técnica é solução que para. Cada menção ao seu hardware reforça a suspeita correta de que aquilo depende de você |
| **A comparação com o Bússola** | [`ANALISE-BUSSOLA.md`](../ANALISE-BUSSOLA.md) é documento interno de disciplina de escopo. Dentro do Instituto, comparar-se a outro grupo é ruído — e o Instituto tem uma equipe pequena, com função assistencial, que não deve ser posta no meio disso |

**A regra geral:** leve a v2 e teste a v2. Se a educadora perguntar espontaneamente o que mais o
sistema faz, aí sim — e **anote que ela perguntou**, porque pergunta espontânea sobre uma
funcionalidade é o melhor dado de priorização que existe.

---

## 5. As seis tarefas — sua versão

Enunciados literais. Rota esperada é para você reconhecer sucesso, **não se diz a ela**. Os
critérios completos, com origem de cada número, estão em
[`../METODOLOGIA-VALIDACAO-PERCURSO.md`](../METODOLOGIA-VALIDACAO-PERCURSO.md).

| # | Enunciado (ler literal) | Rota | Sucesso | Cronômetro contra |
|---|---|---|---|---|
| 1 | "Entre no sistema como você entraria num dia normal de trabalho." | `#/entrar` → professora → `#/hoje` | chega em Hoje e diz o que faria primeiro | — |
| 2 | "Registre a presença da turma de hoje. Duas crianças faltaram — estas aqui." | `#/chamada` | chamada salva, faltas corretas | **2 min** |
| 3 | "Conte como foi o dia de hoje **falando**, sem digitar. Use este cartão como se fosse a sua lembrança do dia." | `#/folha` → `#/voz` → `#/confirmar` | folha confirmada — **contar campos corrigidos** | 40 s de fala |
| 4 | "Descubra quais crianças ainda faltam observar neste ciclo — e por que alguma delas aparece bloqueada." | `#/ciclo` | aponta uma pendente e **explica o bloqueio com as próprias palavras** | — |
| 5 | "Faça a observação de uma dessas crianças pendentes." | `#/observacao/:id` | 5 dimensões marcadas e salvas | **3 min** |
| 6 | "Encerre o seu registro do dia: feche a folha e saia do sistema." | fecho em `#/folha` | folha fechada — **anotar a reação à frase final, literal** | — |

Depois de cada tarefa, uma pergunta só: **"de 1 a 7, quão fácil foi fazer isso?"** Anota e segue.
Não discute o número. Não explica o número.

### 5.1. A tarefa 4 é a mais importante, e não é sobre usabilidade

Se ela explicar o bloqueio como **protocolo** — *"essa aqui ainda não pode porque falta a
autorização"* — a decisão de desenho está certa: bloqueio é protocolo, nunca erro da usuária.

Se ela explicar como **erro dela** — *"acho que eu fiz alguma coisa errada"* — o produto está
produzindo culpa. E culpa é o combustível exato do what-the-hell: quem se sente culpada por uma
tela hoje é quem não volta em fevereiro.

Esse é um achado que vale mais que qualquer tempo cronometrado, e ele custa uma pergunta.

### 5.2. A tarefa 3 tem um número já declarado

A taxa de correção pós-extração tem limite escrito na decisão técnica 13: **acima de 40%, o
extrator está pior que o formulário e a decisão deve ser revista.** Você não vai decidir isso na
sala — mas vai sair com o numerador e o denominador. Conte os campos pré-preenchidos e conte
quantos ela mexeu antes de confirmar.

### 5.3. O Protocolo do Lapso, na sua versão

**Lapso longo.** Semente com último registro **9 dias atrás** — acima do gatilho de 5+ dias da
retomada sem culpa em `#/hoje`. Enunciado:

> *"Faz nove dias que você não entra aqui. A semana foi corrida, aconteceu de tudo. Entre e me
> diga o que você faria agora."*

O `#/hoje` deveria devolver *"Que bom te ver de volta… Nada se perdeu"*, com atalho para a data em
aberto. Você não vai apontar isso. Você vai medir se **funcionou sem você apontar**:

- tempo até a primeira ação produtiva → segundos
- ela verbalizou culpa **antes** de agir? → citação literal
- ela perguntou se ainda dava para registrar dia passado? → sim/não
- ela leu a mensagem de retomada em voz alta, ou passou direto? → qual das duas

> Este bloco é o teste direto de uma decisão de desenho que hoje é **hipótese não medida**: os seis
> mecanismos anti-abandono da inception §6b — retomada sem culpa, nada expira, encadeamento de
> recuperação, rascunho persistente, barra que só sobe, bloqueio explicado. Seis mecanismos, zero
> evidência. É a coisa mais original do seu produto e a menos testada.

**Lapso curto.** No meio da tarefa 5, com a observação pela metade:

> *"Uma criança acabou de te chamar. Sai daí agora."*

Espere 60 segundos falando de outra coisa. Depois: *"pronto, voltou."* O rascunho sobreviveu? Ela
sabe onde parou? Refaz do zero? Quantos segundos perde no retorno?

---

## 6. As três conversas que só você pode ter

O bloco de teste é com a educadora. Estas três são separadas, curtas, e cada uma destrava algo que
nenhum documento resolve.

### 6.1. Com a fundação/direção — 10 minutos — **a tese da redução de criminalidade**

Este é o item mais valioso da sua visita para o **artefato de negócio**, e ele veio da mentoria com
o Egon (28/08): o objetivo declarado do patrocinador é reduzir os índices de criminalidade na
região do Jardim Ângela, e esse efeito de transbordamento sobre segurança pública **não está na
documentação** — Egon apontou a ausência e disse que precisa entrar para enriquecer a proposta de
valor.

Você já ligou frequência acima de 70% a redução de exposição infantil à criminalidade, com dados de
governo e da ONU, e já registrou isso como eixo narrativo do SROI. **Falta a validação da ponte na
boca de quem financia.** Três perguntas:

1. *"Quando o senhor conta o trabalho do Instituto para uma empresa, qual é a frase que faz a
   pessoa parar e ouvir?"* — a proposta de valor real, dita por quem capta, não deduzida por nós.
2. *"Reduzir criminalidade no Jardim Ângela é objetivo do Instituto ou é consequência do que o
   Instituto faz?"* — a diferença entre as duas respostas é a diferença entre poder e não poder
   escrever isso num material.
3. *"Se eu conseguisse te dar um número por trimestre sobre as crianças, qual número mudaria uma
   conversa com um financiador?"* — deixe a resposta vir sem sugerir nenhuma opção.

Regra do bloco 6: nada sobre criança específica, nada sobre caso. Estrutura, processo, agregado.

*(Nota de nome: o dossiê registra **Ueliton Moreira Rocha** como fundador; o material da aula grafa
"Uelinton" e a transcrição da mentoria trouxe "Wellington". Confirme a grafia correta no dia —
errar o nome de quem te recebe é o tipo de detalhe que custa mais do que parece.)*

### 6.2. Com a coordenação — 10 minutos — **quem opera depois da semana 10**

É a pergunta [organização] comum às duas trilhas do bloco 7 e a exigência mais ignorada do módulo.
Faça literalmente assim, e não aceite a primeira resposta:

1. *"Se isso ficar aqui funcionando, **quem abre na segunda-feira**?"* — nome, não cargo.
2. *"Quantas horas por semana essa pessoa tem, hoje, que não sejam de atendimento?"*
3. *"Quando essa pessoa sair de férias, quem abre?"* — a pergunta que revela se existe uma pessoa
   ou um processo.
4. *"O que precisaria acontecer para vocês pararem de usar isso?"* — a pergunta de mortalidade.
   Ninguém faz, e é a que mais ensina.

A resposta a essas quatro perguntas **é** o plano de sustentação cobrado na semana 10. Se a resposta
for "a gente vê depois", isso é o achado, e entra no business case como risco declarado — que é
exatamente o tratamento que o bloco 5 do dossiê manda dar ao custo de plataforma.

### 6.3. Com a psicóloga — 15 minutos — **auditoria de fronteira, não teste de usuária**

Ela **não é usuária** do Percurso, por decisão de desenho registrada
([`MVP-CANVAS.md`](../MVP-CANVAS.md) §2), e não deve ser testada como tal. Mas existe um pedido que
só ela pode atender, e que pode ser o item mais forte da sua entrega:

> *"Sem falar de nenhuma criança e sem entrar em nenhum caso: olhando estas telas, onde você diria
> que a gente atravessou a linha entre o que a organização pode registrar e o que é do
> atendimento?"*

Mostre a rubrica de 5 dimensões × 4 âncoras, o filtro de perímetro no campo livre, e a decisão de
**não ter campo de texto livre sobre criança** (decisão 15). Pergunte se a fronteira está no lugar
certo — não se ela gostou.

Se ela começar a descrever um caso, **interrompa**. A regra 2 do bloco 6 vale inclusive quando é a
própria profissional que oferece.

Registre a resposta em citação literal e em categoria, nunca em exemplo. Uma frase dela validando
ou corrigindo a fronteira vale, na avaliação, mais que os 136 testes unitários — porque testa a
única coisa que pode reprovar o artefato inteiro independentemente da qualidade de execução.

---

## 7. A escada de compromisso, na sua versão

Não pergunte "você usaria?". Suba os degraus e anote **onde ela para**:

1. "Você usaria isso de novo na semana que vem?"
2. "Posso deixar isso instalado aqui, funcionando?"
3. **"Qual dia da semana e em que horário você faria o registro do ciclo?"**
4. "Posso te mandar uma mensagem na terça para saber como foi?"
5. "Quem, na equipe, você chamaria para usar junto com você?"

Parar no 1 ou 2 é cortesia. **Degrau 3 é o mínimo** para você poder escrever "há tração" na
entrega. Degrau 5, com um nome dito em voz alta, é o melhor resultado possível de uma visita de
90 minutos.

E há a razão de método: o critério de falha do próprio módulo é *"educadora volta à planilha por
conta própria na segunda semana"*. Isso ninguém declara numa visita. O degrau 4 — o aceite de
cobrança na terça — é o único instrumento que você tem para medir isso **depois**, e é de graça.

---

## 8. As quatro perguntas finais — literais, e você anota calado

1. "O que você faria com isso na segunda-feira de manhã?"
2. "O que aqui parece trabalho a mais, e não ajuda?"
3. "Teve algum momento em que você não soube o que o sistema fez com o que você falou?"
4. "Você usaria isso sem ninguém do lado? O que precisaria mudar?"

A pergunta 3 é a sua pergunta de LGPD traduzida para a linguagem dela. Se ela responder "não sei o
que aconteceu com o que eu falei", o problema não é de interface — é de confiança, e confiança é o
que o Percurso inteiro está tentando comprar quando promete que a fala não sai do aparelho.

---

## 9. Critérios declarados — **preencha antes de sair de casa**

Assine e date. É a sua defesa contra a terceira camada do what-the-hell: a sua.

| Campo | Valor declarado antes |
|---|---|
| Hipótese principal | "uma educadora real conclui o ciclo de registro sozinha, dentro das promessas de tempo do produto" |
| Sucesso | ≥ 5 de 6 tarefas sem ajuda · observação ≤ 3 min · chamada ≤ 2 min · correção pós-voz ≤ 40% · SEQ médio ≥ 5,5 · lapso aprovado · degrau ≥ 3 |
| **Queda** | ≥ 2 tarefas abandonadas · **ou** observação > 6 min · **ou** correção pós-voz > 40% · **ou** culpa verbalizada antes de agir no lapso |
| Frase que derruba sozinha | qualquer variante de **"eu ia continuar na planilha"** |
| Se cair, o que muda | *(escrever à mão, antes)* |
| Quem declara que caiu | Igor |
| Data e assinatura | ___/___/______ |

---

## 10. Depois — e a regra contra o seu próprio what-the-hell

Você vai voltar do Instituto com alguma coisa quebrada. É o resultado normal e é o resultado bom.
A tentação, com três semanas para a semana 10 e um MVP de 23 rotas, é uma das duas:

- **abandonar o rigor** ("não dá tempo, entrega como está, o vídeo fica bom"), ou
- **abandonar a arquitetura** ("ela travou na tela de ciclo, vou refazer o modelo de observação").

Ambas são o mesmo colapso — o deslize virando abandono da meta inteira. A regra:

> **Uma sessão derruba uma tela. Não derruba uma arquitetura.**
>
> Para derrubar uma decisão registrada em `DECISOES-TECNICAS.md` é preciso um número que atravesse
> um limite **já declarado** — como o teto de 40% da decisão 13 — ou duas sessões independentes
> apontando a mesma coisa. Uma reação de uma pessoa, uma vez, é um achado de tela.

### Onde cada resultado entra, nome de arquivo por nome de arquivo

| Resultado | Destino |
|---|---|
| Cabeçalho, tabela de tarefas, citações, ajustes decididos | [`VALIDACAO-USUARIO.md`](../VALIDACAO-USUARIO.md) **§6** — a seção que hoje diz "em branco" |
| Tempos de observação, chamada e taxa de correção | [`MVP-CANVAS.md`](../MVP-CANVAS.md) §6 — trocar "pendente" por número medido |
| Achado que muda comportamento do sistema | [`DECISOES-TECNICAS.md`](../DECISOES-TECNICAS.md), decisão nova com a origem citada |
| Resposta sobre quem opera após a semana 10 | plano de sustentação do business case + [`HANDOFF.md`](../HANDOFF.md) |
| Auditoria de fronteira da psicóloga | evidência do bloco 6 no artefato de tecnologia |
| Fala do fundador sobre criminalidade | proposta de valor do Lean Canvas e eixo narrativo de [`SROI-METODOLOGIA.md`](../SROI-METODOLOGIA.md) |
| Contagem de quantas vezes você falou | seu, e só seu |

**Prazo:** citações passadas a limpo **no mesmo dia** — memória de citação literal dura horas.
Formulários fechados em 24 h. Decisões em 48 h. Devolutiva de uma página ao Instituto em 72 h, pelo
canal mediado.

---

## 11. O que você deixa no Instituto — não se corta

Cinco minutos, uma folha. Vale mais para a semana 10 do que parece agora: a próxima proposta sua
vai ser lida por gente que se lembra se a anterior devolveu alguma coisa.

Sugestão concreta, no seu caso — e que custa quase nada porque o produto já faz: **a reconciliação
criança × matrícula**. O dossiê aponta a inconsistência (60 + 40 + 20 = 120, mas o Laboratório de
Sonhos e o reforço atendem a mesma faixa etária) e diz que **nenhuma afirmação de impacto é
verificável antes que essa unidade de contagem esteja resolvida**. Você já resolveu isso como
modelo de dados e como tela.

Deixe em papel: a explicação da diferença entre criança e matrícula, o método de contagem, e a
frase que o Instituto pode usar para responder quando um financiador perguntar "quantas crianças?".
Sem depender do sistema, sem depender de você.

É pequeno, é útil no dia seguinte, e é exatamente o oposto de extrair.

---

## 12. Sua lista de pendências das mentorias — o que a visita fecha

| Origem | Pendência | O que a visita faz |
|---|---|---|
| Bryan, 26/08 | "Validar protótipo: realizar testes com usuários no Instituto Ebenézer" | **fecha** |
| Bryan, 26/08 | "Definir metodologia: critérios e métricas quantitativas para os testes" | **fecha** — [`../METODOLOGIA-VALIDACAO-PERCURSO.md`](../METODOLOGIA-VALIDACAO-PERCURSO.md) |
| Bryan, 26/08 | "Ajustar roteiro: perguntas específicas e focadas no contexto pedagógico" | **fecha** — §5 e §8 |
| Bryan, 26/08 | "Adicionar fluxo: setas entre as telas no Figma" | não — trabalho de Figma, anterior à visita |
| Egon, 28/08 | "Ajustar LGPD: remover/proteger cruzamento de dados sensíveis" | **testa** — §6.3, auditoria de fronteira |
| Egon, 28/08 | "Refinar proposta de valor no papel, antes da IA" | **alimenta** — §6.1, a frase dita por quem capta |
| Egon, 28/08 | "Perguntar sobre os blocos 1 e 3 do dossiê" | **fecha** — §6.2 e as perguntas [organização] |
| Egon, 28/08 | "Comparar as versões do Product Vision Board" | não — trabalho de mesa, depois da visita |

Duas ficam de fora, de propósito. Visita não é lugar de trabalho de mesa.
