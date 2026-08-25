# Validação com usuário real — protocolo

> **Estado: a validação NÃO aconteceu.** Este documento é o protocolo da sessão, escrito antes
> dela. A seção 6 (resultados) fica em branco até a sessão ocorrer e só pode ser preenchida com o
> formulário da seção 5, preenchido durante a sessão — nunca por memória ou inferência.

---

## 1. Por que isto é o maior risco da avaliação

O achado **D-02** da revisão arquitetural ([`revisao/02-RELATORIO-REVISAO.md`](revisao/02-RELATORIO-REVISAO.md),
§6) classifica a ausência deste registro como **P1 acadêmico** e o nomeia como "o maior risco da
avaliação acadêmica". A exigência vem da semana 5, está admitida como pendente em
[`TESTES.md`](TESTES.md) ("a validação com usuário real é a etapa seguinte") e aparece como item
1.3 do Horizonte 1 em [`ARQUITETURA.md`](ARQUITETURA.md).

O motivo é simples. O MVP tem 246 asserções de fluxo e 63 testes unitários — mas teste
automatizado prova que o sistema faz o que o código diz, não que a educadora consegue usá-lo. O
produto inteiro está ancorado em uma frase da persona (*"Não consigo transformar em dados os
resultados do meu trabalho"*, [`LEAN-INCEPTION.md`](LEAN-INCEPTION.md) §2) e em promessas
verificáveis por observação: registro sem tirar atenção das crianças, ~3 minutos por observação,
40 segundos de fala que viram folha do dia. Enquanto nenhuma educadora real passou pelo fluxo,
essas promessas são hipótese, não evidência. Este protocolo existe para transformá-las em uma
coisa ou outra.

---

## 2. Quem participa e o que precisa estar pronto

**Participante.** Uma educadora do Instituto Ebenézer, o mais próxima possível da persona Maria
Silvia (pedagoga do reforço, usa o celular em pé dentro da sala). Se nenhuma educadora do
Instituto estiver disponível no prazo, uma proxy com perfil equivalente (educadora de outra
organização social) é admissível — e o registro deve declarar que foi proxy, sem disfarçar.

**Equipe.** Um facilitador conduz; um segundo integrante anota (opcional, mas recomendado — quem
conduz não consegue anotar citação literal).

**Ambiente.**

- MVP no ar com banco recém-semeado: `node scripts/reset.mjs && node server.js`, abrir
  `http://localhost:3000`. Todos os dados são sintéticos — não há criança real em tela.
- Preferir **celular** (é o aparelho da persona); notebook como fallback.
- Cronômetro (o do próprio celular do facilitador serve).
- Este documento impresso ou aberto em segunda tela; termo da seção 4 assinado **antes** da
  primeira tarefa; formulário da seção 5 à mão.

**Regras do facilitador.**

1. Pedir que a participante **pense em voz alta**.
2. **Não ajudar.** Só intervir depois de 2 minutos de travamento ou pedido explícito — e, se
   intervir, a tarefa é marcada "com ajuda", sem exceção.
3. Não defender o produto, não explicar intenção de tela, não completar frase.
4. Anotar citações **literais**, entre aspas, na hora. Paráfrase de citação não vale.
5. Quem está em teste é o sistema, não a participante — dizer isso a ela no início, com essas
   palavras.

---

## 3. Roteiro da sessão — 45 minutos

| Bloco | Tempo | O que acontece |
|---|---|---|
| Abertura | 0–5 min | Termo assinado; contexto em uma frase: "isto é um protótipo com dados inventados; quem está em teste é o sistema, não você"; pedir o pensar em voz alta |
| Tarefas 1–6 | 5–40 min | Abaixo. Cada tarefa é cronometrada do enunciado ao término |
| Perguntas finais | 40–45 min | As quatro perguntas fixas da seção 3.2 |

### 3.1. As seis tarefas

O enunciado é dado **literalmente como escrito** — é objetivo, não passo a passo. A rota esperada
serve ao facilitador para reconhecer sucesso; não é dita à participante.

| # | Tarefa | Enunciado dado à participante | Rota esperada | Sucesso quando |
|---|---|---|---|---|
| 1 | Entrar | "Entre no sistema como você entraria num dia normal de trabalho." | `#/entrar` → perfil de professora → `#/hoje` | Chega à tela Hoje e diz o que faria primeiro |
| 2 | Chamada | "Registre a presença da turma de hoje. Duas crianças faltaram — estas aqui." *(o facilitador escolhe dois nomes do seed antes da sessão e os mostra num papel)* | `#/chamada` | Chamada salva com as duas faltas corretas |
| 3 | Folha do dia por voz | "Conte como foi o dia de hoje **falando**, sem digitar. Use este cartão como se fosse a sua lembrança do dia." *(cartão de cenário: "Hoje a atividade foi leitura em roda. A turma participou bem, mas o barulho da rua atrapalhou. Duas crianças faltaram. Amanhã vamos continuar a história.")* | `#/folha` → `#/voz` (≈40 s) → `#/confirmar` | Folha confirmada; **anotar quantos campos ela corrigiu** antes de confirmar — é a taxa de correção pós-extração da decisão 13 de [`DECISOES-TECNICAS.md`](DECISOES-TECNICAS.md) |
| 4 | Agenda do ciclo | "Descubra quais crianças ainda faltam observar neste ciclo — e por que alguma delas aparece bloqueada." | `#/ciclo` | Aponta uma pendente e explica um bloqueio com as próprias palavras |
| 5 | Observação com âncoras | "Faça a observação de uma dessas crianças pendentes." | `#/observacao/:id` | Cinco dimensões marcadas e salvas; cronometrar contra a promessa de ~3 minutos |
| 6 | Fechar | "Encerre o seu registro do dia: feche a folha e saia do sistema." | fecho da folha em `#/folha` → sair | Folha fechada. Se a tarefa 5 tiver concluído a última pendência da turma, a tela de fecho da turma aparece — anotar a reação dela à frase final, literalmente |

### 3.2. Perguntas finais (fazer exatamente estas, anotar respostas literais)

1. "O que você faria com isso na segunda-feira de manhã?"
2. "O que aqui parece trabalho a mais, e não ajuda?"
3. "Teve algum momento em que você não soube o que o sistema fez com o que você falou?"
4. "Você usaria isso sem ninguém do lado? O que precisaria mudar?"

---

## 4. Termo de participação

Texto a assinar antes da sessão. Uma via para a participante, uma para o registro.

> **Termo de participação — sessão de validação do Percurso (protótipo acadêmico)**
>
> 1. Minha participação é voluntária e posso interromper a sessão a qualquer momento, sem
>    justificativa.
> 2. **Todos os dados exibidos e registrados no sistema durante a sessão são sintéticos.**
>    Nenhuma criança real está representada e nenhum dado real de criança será digitado, falado ou
>    registrado em nenhuma etapa.
> 3. Na tarefa de captura por voz, minha fala é transcrita **no próprio aparelho**; o áudio não é
>    gravado nem enviado a servidor algum, e a transcrição é descartada após a confirmação.
> 4. **Não haverá gravação de áudio ou vídeo da sessão** sem meu consentimento por escrito — e, em
>    qualquer hipótese, nenhuma gravação envolvendo criança.
> 5. O registro da sessão se limita a anotações escritas: tempos, o que consegui fazer sozinha e
>    frases minhas sobre o uso do sistema, entre aspas.
> 6. No registro que ficará no repositório do projeto, posso escolher aparecer pelo meu nome ou
>    como "educadora participante".
>
> Nome: __________________________________  Vínculo: ______________________________
>
> ( ) autorizo o uso do meu nome no registro  ( ) prefiro constar como "educadora participante"
>
> Data: ____ / ____ / ______  Assinatura: __________________________________
>
> Facilitador — nome e assinatura: __________________________________

---

## 5. Formulário de registro estruturado

Preencher **durante** a sessão, uma linha por tarefa. "Conseguiu sozinha?" tem três valores:
**sim** · **com ajuda** (facilitador interveio) · **não** (tarefa abandonada). "Ajuste decidido"
é preenchido depois da sessão, na conversa do grupo: o que muda no produto por causa desta linha —
ou "nada", por escrito, se a decisão for não mudar.

**Cabeçalho da sessão**

| Campo | Valor |
|---|---|
| Data da sessão | |
| Participante (nome ou "educadora participante") | |
| Educadora do Instituto ou proxy? | |
| Facilitador / anotador | |
| Dispositivo usado | |

**Tarefas**

| # | Tarefa | Conseguiu sozinha? | Tempo | Citação literal | Ajuste decidido |
|---|---|---|---|---|---|
| 1 | Entrar | | | | |
| 2 | Chamada | | | | |
| 3 | Folha do dia por voz | | | | |
| 4 | Agenda do ciclo | | | | |
| 5 | Observação com âncoras | | | | |
| 6 | Fechar | | | | |

**Medida específica da tarefa 3**

| Campo | Valor |
|---|---|
| Campos pré-preenchidos pelo extrator | |
| Campos corrigidos pela participante antes de confirmar | |

**Perguntas finais**

| # | Pergunta | Resposta literal |
|---|---|---|
| 1 | O que você faria com isso na segunda de manhã? | |
| 2 | O que parece trabalho a mais? | |
| 3 | Algum momento sem saber o que o sistema fez com a fala? | |
| 4 | Usaria sem ninguém do lado? O que mudaria? | |

---

## 6. Resultados

**Em branco. A sessão não aconteceu.**

Quando acontecer, esta seção recebe: o cabeçalho e as tabelas da seção 5 preenchidos, a lista de
ajustes decididos com o achado que motivou cada um, e a data. Nada além disso — resultado de
validação é o que a participante fez e disse, não a interpretação do grupo sobre o que ela teria
achado.

| Campo | Valor |
|---|---|
| Sessão realizada em | — pendente |
| Formulário preenchido | — pendente |
| Ajustes decididos | — pendente |
