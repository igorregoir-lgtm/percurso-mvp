# Cartão de campo — Igor, hoje, no Ebenézer

**Leia agora: seções 1 a 3.** O resto é consulta durante a visita.
Documento longo, se sobrar tempo depois: [`ROTEIRO-IGOR.md`](ROTEIRO-IGOR.md).

---

## 1. Antes de sair de casa — 6 minutos de terminal

```bash
cd "/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional" && node scripts/reset.mjs
```

```bash
ipconfig getifaddr en0
```

```bash
cd "/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional" && HOST=0.0.0.0 PORT=3000 node server.js
```

Anote o IP aqui → `http://______________:3000`

**Sem `PORT`, o servidor sobe só em `127.0.0.1` e o celular não enxerga nada.** É o erro que só aparece na frente da educadora.

- [ ] **Ligue o hotspot do seu celular** e ponha Mac **e** o aparelho de teste nele. Não conte com a rede do Instituto.
- [ ] Abra `http://<IP>:3000` **no celular**, entre como **professora**, veja o `#/hoje` carregar. Se não abrir em 3 minutos, plano B.
- [ ] `AI_ENABLED` **desligada** (é o padrão — não mexa).
- [ ] Escolha **dois nomes do seed** para a tarefa da chamada e escreva num papel.
- [ ] Imprima ou escreva o **cartão de cenário** da folha do dia (§5, tarefa 3).
- [ ] Feche terminal, editor e qualquer aba com código.
- [ ] Bateria Mac e celular > 80%. Cabo na mochila.

**Planos:** A = celular na mão dela · B = seu Mac na mão dela, janela estreita · C = telas em papel. **Três minutos de tentativa técnica e você troca de plano** — grupo mexendo em rede por 20 minutos sinaliza exatamente o que o bloco 5 do dossiê teme.

### Uma decisão a tomar agora: a tarefa de voz

A captura usa `SpeechRecognition` do navegador. Em parte dos navegadores a transcrição **não é local** — e o termo de participação promete que é.

- **Se você não conseguir verificar isso no aparelho e navegador exatos, antes de entrar: não rode a tarefa 3 por voz.** Rode a folha do dia digitada e anote a razão.
- Custo: uma tarefa a menos. O outro caminho é uma funcionária de uma organização que atende criança vulnerável assinando um termo que o software não cumpre.

---

## 2. A única regra que importa

> ### Você não vai apresentar. Você vai calar a boca e cronometrar.
> **O celular sai da sua mão nos primeiros 3 minutos e não volta.**

Seus quatro modos de falha — você já sabe quais são:

| | Como soa | O que fazer |
|---|---|---|
| **F1** | "isso roda num Qwen local, o RAG cita a fonte…" | ela não quer saber. **Silêncio** |
| **F2** | ela trava e você diz "é o botão de cima" | conte 120 segundos |
| **F3** | ela hesita e você fecha a frase dela | a hesitação **é** o dado |
| **F4** | abrir Copilot, Impacto, SROI | nada disso está em teste hoje |

**Cartão de bolso:**

```
1. O aparelho é dela.
2. Travou? 120 segundos. Calado.
3. "Isso é o quê?" → "O que você acha que é?"
4. Elogiou? → "E o que aqui é trabalho a mais?"
5. Pediu algo? → "Anotei." Nunca "dá pra fazer".
6. Meu silêncio não é falha minha. É método.
```

Peça a quem for com você para **marcar um risco no papel toda vez que você falar** sem ser um enunciado de tarefa. O número no fim é seu.

---

## 3. O que NÃO levar

| Não | Por quê |
|---|---|
| A camada de IA ligada | com ela desligada o produto é a v2 — e é a v2 que está em teste |
| A tela `#/impacto` (SROI) | é exploratória por construção: faixa, nunca número único, com gate humano. Solta numa sala vira promessa |
| **Os R$ 45 mil** de economia com evasão | estimativa dita em voz alta dentro do Instituto vira compromisso |
| O Mac de 128 GB como argumento | o bloco 5 diz que não há profissional de TI. Cada menção reforça que aquilo depende de você |
| Comparação com o Bússola | é documento interno de escopo. Não põe a equipe deles no meio disso |

Se ela perguntar **espontaneamente** o que mais o sistema faz — aí sim, e **anote que ela perguntou**. Pergunta espontânea é o melhor dado de priorização que existe.

---

## 4. Abertura — leia quase assim

> "Isto é um protótipo com **dados inventados** — nenhuma criança real está aqui dentro.
> Quem está em teste é o sistema, **não você**.
> Se você travar, o erro é nosso — e travar é o que a gente veio buscar.
> Pode ir pensando em voz alta?
> E se estiver ruim, fala ruim. Elogio não conserta produto."

Termo assinado **antes** da tarefa 1.

---

## 5. As seis tarefas — enunciado literal

Depois de cada uma: **"de 1 a 7, quão fácil foi fazer isso?"** Anota e segue.

### Tarefa 1 — e ela já é o teste do lapso

> **A semente já entrega a Maria Silvia com 7 dias sem registrar** (`seed.js:343`). O `#/hoje` abre com a retomada sem culpa: *"Você ficou 7 dias sem registrar. Nada se perdeu…"* Você não precisa preparar nada — e **não vai apontar a mensagem**.

Enunciado:

> "Faz uma semana que você não entra aqui. A semana foi corrida, aconteceu de tudo. **Entre e me diga o que você faria agora.**"

Anote, nesta ordem:

| Sinal | Registro |
|---|---|
| Segundos até a **primeira ação** (fora leitura) | ____ s · **< 30 s = passa** |
| Ela **verbalizou culpa antes de agir**? | ( ) sim ( ) não → *"____________"* · **sim = reprova** |
| Procurou o que perdeu, ou seguiu adiante? | ____________ |
| Perguntou se "ainda vale" registrar dia passado? | ( ) sim ( ) não |
| Leu a mensagem de retomada, ou passou direto? | ____________ |

> Isto testa de uma vez os **seis mecanismos anti-abandono** da inception §6b — a coisa mais original do Percurso e a única nunca medida com gente.

**Rota:** `#/entrar` → professora → `#/hoje`

### Tarefa 2 — chamada · cronômetro **< 2 min**

> "Registre a presença da turma de hoje. Duas crianças faltaram — **estas aqui**." *(mostre o papel)*

**Rota:** `#/chamada` · Tempo: ____

### Tarefa 3 — folha do dia · **conte as correções**

> "Conte como foi o dia de hoje **falando**, sem digitar. Use este cartão como se fosse a sua lembrança do dia."

*Cartão:* **"Hoje a atividade foi leitura em roda. A turma participou bem, mas o barulho da rua atrapalhou. Duas crianças faltaram. Amanhã vamos continuar a história."**

**Rota:** `#/folha` → `#/voz` → `#/confirmar`
Campos pré-preenchidos: ____ · **Corrigidos por ela: ____**
→ **acima de 40% o extrator está pior que o formulário** (decisão 13). Você não decide isso hoje; sai com o numerador e o denominador.

### Tarefa 4 — a mais importante do dia

> "Descubra quais crianças ainda faltam observar neste ciclo — e **por que alguma delas aparece bloqueada**."

**Rota:** `#/ciclo`

- Explicou como **protocolo** (*"falta a autorização"*) → **desenho certo**
- Explicou como **erro dela** (*"acho que fiz algo errado"*) → **o produto está gerando culpa**

Frase literal: *"________________________________"*

### Tarefa 5 — observação · cronômetro **~3 min** · **e a interrupção**

> "Faça a observação de uma dessas crianças pendentes."

**Rota:** `#/observacao/:id` · Tempo: ____ (**> 6 min = queda**)

**Com o registro pela metade, interrompa:**

> "Uma criança acabou de te chamar. **Sai daí agora.**"

60 segundos falando de outra coisa. Depois: *"Pronto, voltou. Continua."*

Rascunho sobreviveu? ( ) sim ( ) não · Sabe onde parou? ( ) sim ( ) não · Perdeu ____ s

### Tarefa 6 — fechar

> "Encerre o seu registro do dia: feche a folha e saia do sistema."

Reação à tela final, **literal**: *"________________________________"*

---

## 6. A escada — nunca "você usaria?"

1. "Você usaria isso de novo na semana que vem?"
2. "Posso deixar isso instalado aqui, funcionando?"
3. **"Qual dia da semana e em que horário você faria o registro do ciclo?"** ← **piso para escrever "há tração"**
4. "Posso te mandar uma mensagem na terça para saber como foi?"
5. "Quem, na equipe, você chamaria para usar junto com você?"

Parou no degrau: **[1] [2] [3] [4] [5]** · Primeiro "não", literal: *"____________"*

O degrau 4 é o único jeito de medir, **depois**, o critério de falha do próprio módulo: *"educadora volta à planilha por conta própria na segunda semana"*.

---

## 7. As quatro perguntas finais

1. "O que você faria com isso na **segunda-feira de manhã**?"
2. "O que aqui parece **trabalho a mais**, e não ajuda?"
3. "Teve algum momento em que você **não soube o que o sistema fez com o que você falou**?"
4. "Você usaria isso **sem ninguém do lado**? O que precisaria mudar?"

A 3 é a sua pergunta de LGPD traduzida. Se a resposta for "não sei o que aconteceu com o que eu falei", o problema não é de interface — é de confiança, que é o que o Percurso inteiro promete comprar.

---

## 8. As três conversas que só você pode ter

### 8.1 · Fundador / direção — 10 min — a tese da criminalidade

Veio do Egon (28/08): o efeito sobre **segurança pública no Jardim Ângela** é o objetivo declarado de quem patrocina, **não está na documentação**, e precisa entrar na proposta de valor.

1. "Quando o senhor conta o trabalho do Instituto para uma empresa, **qual é a frase que faz a pessoa parar e ouvir**?"
2. "**Reduzir criminalidade no Jardim Ângela é objetivo do Instituto, ou é consequência** do que o Instituto faz?"
3. "Se eu conseguisse te dar **um número por trimestre** sobre as crianças, qual número mudaria uma conversa com um financiador?" *(não sugira opções)*

*(O dossiê grafa **Ueliton Moreira Rocha**; o material da aula, "Uelinton". Confirme a grafia no dia.)*

### 8.2 · Coordenação — 10 min — quem opera depois da semana 10

1. "Se isso ficar aqui funcionando, **quem abre na segunda-feira?**" → **nome, não cargo**
2. "Quantas horas por semana essa pessoa tem hoje que **não sejam de atendimento**?"
3. "Quando ela sair de férias, **quem abre**?"
4. "**O que precisaria acontecer para vocês pararem de usar isso?**"

As quatro respostas **são** o plano de sustentação da semana 10.

### 8.3 · Psicóloga — 15 min — ela NÃO é usuária

Uma pergunta só:

> "Sem falar de nenhuma criança e sem entrar em nenhum caso: olhando estas telas, **onde você diria que a gente atravessou a linha** entre o que a organização pode registrar e o que é do atendimento?"

Mostre a rubrica de 5 dimensões × 4 âncoras e a decisão de **não ter campo de texto livre sobre criança**. Pergunte se a fronteira está no lugar — não se ela gostou. Se começar a descrever um caso, **interrompa**.

> Uma frase dela validando ou corrigindo a fronteira vale, na avaliação, mais que os 136 testes unitários.

---

## 9. Os cinco números com que você tem que sair

Se sair só com isto, a visita valeu:

```
1. Tempo da chamada .......................... ______ s   (meta < 120)
2. Tempo da observação ....................... ______ s   (meta ~180, queda > 360)
3. Campos corrigidos / pré-preenchidos ....... ___ / ___  (teto 40%)
4. Segundos até a 1ª ação depois do lapso .... ______ s   (meta < 30)
5. Degrau da escada .......................... [1][2][3][4][5]  (piso 3)

+ Ela disse alguma variante de "eu ia continuar na planilha"?  ( ) sim ( ) não
```

---

## 10. Antes de sair — deixe uma folha

Sua devolução mais barata e mais útil: **a reconciliação criança × matrícula**. O dossiê aponta a inconsistência (60+40+20 = 120, com faixa etária sobreposta) e diz que **nenhuma afirmação de impacto é verificável antes disso**. Você já resolveu como modelo de dados.

Em papel: a diferença entre criança e matrícula, o método de contagem, e **a frase que o Instituto pode usar quando um financiador perguntar "quantas crianças?"** — sem depender do sistema e sem depender de você.

---

## 11. Ainda no carro, hoje

1. **Citações a limpo agora.** Memória de citação literal dura horas.
2. Os cinco números da §9 num lugar só.
3. Amanhã, não hoje: decidir o que muda.

> **Uma sessão derruba uma tela. Não derruba uma arquitetura.**
> Para mexer numa decisão de `DECISOES-TECNICAS.md` é preciso um limiar já declarado atravessado (como os 40% da decisão 13) **ou** duas sessões apontando o mesmo ponto.

**Depois, cada coisa no seu lugar:** [`VALIDACAO-USUARIO.md`](../VALIDACAO-USUARIO.md) §6 (hoje em branco) · [`MVP-CANVAS.md`](../MVP-CANVAS.md) §6 (trocar "pendente" por número) · plano de sustentação do business case · proposta de valor do Lean Canvas.
