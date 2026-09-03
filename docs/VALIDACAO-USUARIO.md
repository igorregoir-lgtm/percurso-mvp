# Validação com usuário real — protocolo

> **Estado: a validação NÃO aconteceu.** Este documento é o protocolo da sessão, escrito antes
> dela. A seção 6 (resultados) fica em branco até a sessão ocorrer e só pode ser preenchida com o
> formulário da seção 5, preenchido durante a sessão — nunca por memória ou inferência.
>
> **Método por trás deste protocolo:** [`METODOLOGIA-VALIDACAO-PERCURSO.md`](METODOLOGIA-VALIDACAO-PERCURSO.md)
> — hipóteses em teste, limiares com fonte, Protocolo do Lapso, ameaças à validade e o que a sessão
> não prova. **Execução em campo:** [`visita-ebenezer/ROTEIRO-IGOR.md`](visita-ebenezer/ROTEIRO-IGOR.md)
> (pessoal) e [`visita-ebenezer/ROTEIRO-GRUPO.md`](visita-ebenezer/ROTEIRO-GRUPO.md) (grupo, Trilhas A e B).

> **Passagem para a psicóloga (02/09/2026).** Este protocolo era da **pedagoga**: seis tarefas em
> volta da chamada, do ciclo de observação e da rubrica por criança. A visita de 29/08/2026 mostrou
> que quem tem a dor do registro, quem escreve o relatório e quem foi improvisada na demo ao vivo é
> a **psicóloga** — e que a turma dela, a Vivência terapêutica, está **fora da rubrica** por
> decisão de projeto ([decisão 31](DECISOES-TECNICAS.md)). Consequência dura: as antigas tarefas 4
> e 5 (agenda do ciclo, observação com âncoras) **não são executáveis por ela** — `#/ciclo` responde
> 422 para a turma dela, por construção (`src/api.js:299`). Não dava para trocar a persona e manter
> a lista. As seis tarefas foram refeitas do zero, a partir do task flow do
> [Exercício 03](task-flow/README.md) e dos três destinos do registro que a jornada v2 nomeia:
> o relatório do conselho, o recado aos pais e a prova para quem financia.
>
> A versão pedagoga não foi jogada fora: está na **§3.4**, como variante para turma dentro da
> rubrica.

---

## 1. Por que isto é o maior risco da avaliação

O achado **D-02** da revisão arquitetural ([`revisao/02-RELATORIO-REVISAO.md`](revisao/02-RELATORIO-REVISAO.md),
§6) classifica a ausência deste registro como **P1 acadêmico** e o nomeia como "o maior risco da
avaliação acadêmica". A exigência vem da semana 5, está admitida como pendente em
[`TESTES.md`](TESTES.md) ("a validação com usuário real é a etapa seguinte") e aparece como item
1.3 do Horizonte 1 em [`ARQUITETURA.md`](ARQUITETURA.md).

O motivo é simples. O MVP tem 381 asserções de fluxo e 166 testes unitários — mas teste
automatizado prova que o sistema faz o que o código diz, não que a profissional consegue usá-lo.
Desde a visita, o produto está ancorado em duas frases dela, literais:

> *"Eu acho que o maior desafio aqui é registrar o que você fez, né? Essa é a maior dificuldade, é
> o registro."* · *"Você depois tem que sair daqui, preencher o relatório… Não dá, não dá."*

E em promessas verificáveis só por observação: **40 segundos de fala que viram registro**, o
**relatório no padrão do conselho sem escrever à noite**, e o **custo total do gatilho ao relato
liberado dentro de ~3 minutos**. Enquanto nenhuma profissional real passou pelo fluxo com o
aparelho na própria mão, essas promessas são hipótese, não evidência. Este protocolo existe para
transformá-las em uma coisa ou outra.

---

## 2. Quem participa e o que precisa estar pronto

**Participante.** A **psicóloga** que conduz a Vivência no Instituto Ebenézer — quem escreve o
relatório no padrão do conselho profissional. Se ela não estiver disponível no prazo, uma proxy com
perfil equivalente (psicóloga ou assistente social que conduz grupo em organização social e é
responsável pelo registro) é admissível — e o registro deve declarar que foi proxy, sem disfarçar.
Uma pedagoga **não** é proxy dela: o fluxo testado aqui é o da turma fora da rubrica, e a §3.4 é o
protocolo de quem está dentro.

**Equipe.** Um facilitador conduz; um segundo integrante anota (opcional, mas recomendado — quem
conduz não consegue anotar citação literal).

**Ambiente.**

```bash
node scripts/reset.mjs && node scripts/preparar-sessao.mjs --lapso && node server.js
```

- `reset.mjs` recria os dados sintéticos. `preparar-sessao.mjs` apaga o **encontro mais recente**
  da turma da psicóloga — e com ele a chamada, a folha e o relato daquele sábado. Sem esse passo a
  semente entrega o último sábado **já registrado**, e as tarefas 2 a 4 começam com o trabalho
  feito. `--lapso` empurra a última atividade dela para 9 dias atrás, que é o que a tarefa 1 exige.
  O script imprime o estado resultante; conferir antes de começar.
- Abrir `http://localhost:3000`. Todos os dados são sintéticos — não há criança real em tela.
- **Preferir celular.** É o aparelho dela: *"se você pudesse fazer tudo isso no celular, seria muito
  mais fácil do que você parar aí pro notebook"* (gravação 82). Notebook como fallback declarado.
- Cronômetro. Este documento aberto em segunda tela; termo da §4 assinado **antes** da tarefa 1;
  formulário da §5 à mão.
- **Protótipo Figma** para ensaiar a sessão e alinhar o grupo antes dela:
  [`PROTOTIPO-FIGMA-VALIDACAO.md`](PROTOTIPO-FIGMA-VALIDACAO.md) — as 12 telas destas seis tarefas
  em iPhone 17, uma seção por tarefa. **A sessão em si roda no MVP**, não nele: tempo, taxa de
  correção e Protocolo do Lapso só existem no sistema rodando.
- **A sessão pode rodar em qualquer dia.** Num dia útil a tela Hoje diz "hoje não tem encontro" e
  oferece o sábado em aberto — que é justamente o caminho que a jornada v2 chama de *nunca é tarde
  para registrar*. **As seis tarefas funcionam assim**, inclusive a 6.

  > **Mudou em 03/09/2026.** Até esta data a tarefa 6 era a exceção: o botão do recado era o único
  > elemento do cartão preso à chamada **de hoje**, então sumia em dia não letivo e o recado só era
  > alcançável pela URL. O protocolo mandava registrar isso como "não — entrada ausente na tela
  > Hoje". Corrigido em `48ec1dd`: o botão passou a seguir o **encontro da folha**
  > (`public/app.js:509`), como o resto do cartão. **A ressalva não vale mais** — se a tarefa 6
  > falhar agora, é achado de verdade, não defeito conhecido.

**Regras do facilitador.**

1. Pedir que a participante **pense em voz alta**.
2. **Não ajudar.** Só intervir depois de 2 minutos de travamento ou pedido explícito — e, se
   intervir, a tarefa é marcada "com ajuda", sem exceção.
3. Não defender o produto, não explicar intenção de tela, não completar frase.
4. **Nenhum enunciado nomeia botão, tela ou recurso.** O enunciado é objetivo; a rota esperada é
   informação do facilitador, nunca dita a ela. Dizer "use o microfone" destrói a única medida que
   a tarefa 3 tem.
5. Anotar citações **literais**, entre aspas, na hora. Paráfrase de citação não vale.
6. **Nada de caso real.** Se ela começar a contar um caso clínico verdadeiro, interromper com
   cuidado e lembrar que o cenário é sintético. Isto não é formalidade: é o sigilo dela.
7. Quem está em teste é o sistema, não a participante — dizer isso a ela no início, com essas
   palavras.

---

## 3. Roteiro da sessão — 45 minutos

| Bloco | Tempo | O que acontece |
|---|---|---|
| Abertura | 0–5 min | Termo assinado; contexto em uma frase: "isto é um protótipo com dados inventados; quem está em teste é o sistema, não você"; pedir o pensar em voz alta |
| Tarefas 1–6 | 5–40 min | Abaixo. Cada tarefa é cronometrada do enunciado ao término |
| Perguntas finais | 40–45 min | As cinco perguntas fixas da §3.2 |

### 3.1. As seis tarefas

O enunciado é dado **literalmente como escrito**. A rota esperada serve ao facilitador para
reconhecer sucesso; não é dita a ela.

| # | Tarefa | Enunciado dado à participante | Rota esperada | Sucesso quando |
|---|---|---|---|---|
| 1 | Voltar depois de um tempo fora | "Faz nove dias que você não entra aqui. A semana foi corrida, aconteceu de tudo. Entre e me diga o que você faria agora." | `#/entrar` → perfil da psicóloga → `#/hoje` com a retomada | Ela **age antes de se justificar**, em menos de 30 s. Esta tarefa é a Provocação Longa do Protocolo do Lapso — ver §3.3 |
| 2 | A chamada do sábado que ficou | "Sábado passado ficou sem chamada. Estas duas crianças faltaram." *(o facilitador escolhe dois nomes do seed antes da sessão e os mostra num papel)* | `#/hoje` → "Datas ainda sem chamada" → `#/chamada?data=…` | Chamada salva com as duas faltas **na data do sábado**, não na de hoje. Tempo contra o limiar de 2 min |
| 3 | Registrar o encontro | "O grupo acabou agora. Registre este encontro no sistema, do jeito que for mais rápido para você." *(entregar o cartão de cenário abaixo)* | `#/hoje` → `#/voz` (≈40 s) → `#/confirmar` | Folha confirmada. **Não contar campos à mão** — o sistema conta: ver §5, medida específica |
| 4 | O relatório do conselho | "Terminou o que você precisava fazer hoje, ou ficou faltando alguma coisa?" | `#/hoje` → `#/relato` → "Revisei — liberar o relato" | Relato liberado. **Cronometrar do "Confirmar e guardar" até ela achar o caminho** — acima de 20 s ou com ajuda é achado de navegação, não de compreensão |
| 5 | A pergunta da assistente social | "A assistente social do projeto parceiro te pergunta como está uma criança que ela acompanha. Responda pelo sistema." | `#/criancas` → `#/crianca/:id` → cartão "Parecer a profissional parceiro", **bloqueado** | Ela chega ao parecer **e explica o bloqueio com as próprias palavras**. Anotar a explicação literal: se ela ler como erro dela, o produto está gerando culpa |
| 6 | O recado dos responsáveis | "Antes de sair, resolva o recado que você mandaria hoje no grupo dos responsáveis." | `#/hoje` → o botão de recado **da turma da sessão** → `#/recado` → copiar / abrir no WhatsApp. Ela
responde por duas turmas, então o cartão traz **dois** botões, nomeados: "Recado · Vivência · Sábado
manhã" e "· Sábado tarde". **Escolher a turma certa faz parte da tarefa** — anotar se ela hesita | Recado copiado ou aberto. Anotar **se ela edita antes de mandar e o que edita** — é o que ela faz hoje à mão, grupo por turma |

**Cartão de cenário da tarefa 3** — entregar impresso, sem ler em voz alta:

> Hoje a gente fez a roda das emoções, para eles nomearem o que sentem. Duas crianças ajudaram sem
> ninguém pedir, seis participaram do começo ao fim. Teve um conflito e eles resolveram
> conversando. A turma estava alegre e colaborou bastante.

O cenário foi **rodado contra o extrator do MVP**, não estimado: ele pré-preenche **7 campos** —
procedimento *Roda de emoções*, os três marcadores e o check-in inteiro (2 · 6 · 1 · 1 · —) — e erra o objetivo
(*"nomearem o que sentem"* não casa com o termo `nomear o que sente` da lista fechada). Uma
correção esperada em sete campos ≈ **14%**, bem abaixo do limiar de 40% da decisão 13 — então
qualquer coisa acima disso na sessão é sinal, não ruído do cenário.

> **As seis tarefas foram percorridas no MVP antes de virarem protocolo** (02/09/2026, perfil
> Carolina Duarte, banco preparado pelo script): entrar em lapso → chamada de 29/08 → registro por
> voz → conferência → relato liberado → parecer bloqueado → recado. O que a caminhada encontrou
> está escrito acima como limiar (os 20 s da tarefa 4) e como aviso (a tarefa 6 em dia não letivo).

> **Por que a tarefa 5 termina num bloqueio.** Ela não é usabilidade: é o teste de **H3**. A
> psicóloga não pode registrar o consentimento — só a coordenação (`src/api.js:426`), e a tela diz
> isso a ela (`public/app.js:1014`). O sucesso da tarefa é ela entender **por que não sai**, não
> conseguir emitir. E o destino é literal do campo: *"que daí seria entre profissionais, que é mais
> rico ainda"*.

### 3.2. Perguntas finais (fazer exatamente estas, anotar respostas literais)

1. "O que você faria com isso no sábado que vem?"
2. "O que aqui parece trabalho a mais, e não ajuda?"
3. "Teve algum momento em que você não soube o que o sistema fez com o que você falou?"
4. "Se alguém que financia o Instituto pedisse hoje uma prova do trabalho de vocês, o que daqui
   você mandaria?"
5. "Você usaria isso sem ninguém do lado? O que precisaria mudar?"

A pergunta 4 é nova nesta versão. Ela existe porque a jornada v2 registra que prestar contas aqui
tem peso de sobrevivência, não de burocracia — o pagamento dela vale um ano e depende de captação.

### 3.3. As duas provocações do Protocolo do Lapso

Método completo em [`METODOLOGIA-VALIDACAO-PERCURSO.md`](METODOLOGIA-VALIDACAO-PERCURSO.md) §5.5.
Nesta versão do protocolo elas ficam **dentro** das tarefas:

- **Longa** — é a própria tarefa 1, com o banco preparado por `preparar-sessao.mjs --lapso`.
  Registrar: tempo até a primeira ação produtiva, se verbaliza culpa antes de agir, se procura o
  que perdeu ou segue de onde está, se pergunta "ainda vale registrar".
- **Curta** — no meio da tarefa 3, com a tela de conferência aberta e nada ainda confirmado:
  *"uma criança acabou de te chamar. Sai daí agora."* — 60 s de conversa sobre outra coisa —
  *"pronto, voltou. Continua."*
  > **Declarado antes de medir:** neste ponto o rascunho vive na **memória da página**
  > (`ctx.folha.sugestao`, `public/app.js`), não no banco. Sair da tela e voltar por `#/voz` perde a
  > extração; recarregar a página também. A medição aqui provavelmente confirma uma fragilidade
  > conhecida em vez de descobrir uma — e é por isso que ela está escrita aqui antes da sessão, e
  > não depois.

### 3.4. Variante pedagoga — turma dentro da rubrica

Para participante que conduz turma **na rubrica** (Reforço escolar, Laboratório de Sonhos,
Primeira infância), o fluxo do ciclo existe e as tarefas são estas. Rodar `preparar-sessao.mjs
--turma N` com a turma dela.

| # | Tarefa | Enunciado | Rota esperada | Sucesso quando |
|---|---|---|---|---|
| 1 | Entrar | "Entre no sistema como você entraria num dia normal de trabalho." | `#/entrar` → `#/hoje` | Chega à tela Hoje e diz o que faria primeiro |
| 2 | Chamada | "Registre a presença da turma de hoje. Duas crianças faltaram — estas aqui." | `#/chamada` | Chamada salva com as duas faltas corretas |
| 3 | Folha do dia por voz | "Conte como foi o dia de hoje **falando**, sem digitar." *(cartão: "Hoje a atividade foi leitura em roda. A turma participou bem, mas o barulho da rua atrapalhou. Duas crianças faltaram. Amanhã vamos continuar a história.")* | `#/folha` → `#/voz` → `#/confirmar` | Folha confirmada; taxa de correção pela §5 |
| 4 | Agenda do ciclo | "Descubra quais crianças ainda faltam observar neste ciclo — e por que alguma delas aparece bloqueada." | `#/ciclo` | Aponta uma pendente e explica um bloqueio com as próprias palavras |
| 5 | Observação com âncoras | "Faça a observação de uma dessas crianças pendentes." | `#/observacao/:id` | Cinco dimensões marcadas e salvas; cronometrar contra a promessa de ~3 min |
| 6 | Fechar | "Encerre o seu registro do dia: feche a folha e saia do sistema." | fecho da folha em `#/folha` → sair | Folha fechada; anotar a reação literal à tela de fecho da turma, se ela aparecer |

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
> 3. **Nenhum caso real e nenhum conteúdo clínico entra na sessão.** O cenário das tarefas é
>    fictício e me foi entregue por escrito. Se eu começar a relatar um caso verdadeiro, o
>    facilitador me interrompe — o sigilo profissional a que estou vinculada vale aqui como vale no
>    meu trabalho.
> 4. Na tarefa de captura por voz, minha fala é transcrita **no próprio aparelho**; o áudio não é
>    gravado nem enviado a servidor algum, e a transcrição é descartada após a confirmação.
> 5. **Não haverá gravação de áudio ou vídeo da sessão** sem meu consentimento por escrito — e, em
>    qualquer hipótese, nenhuma gravação envolvendo criança.
> 6. O registro da sessão se limita a anotações escritas: tempos, o que consegui fazer sozinha e
>    frases minhas sobre o uso do sistema, entre aspas.
> 7. No registro que ficará no repositório do projeto, posso escolher aparecer pelo meu nome ou
>    como "profissional participante".
>
> Nome: __________________________________  Vínculo: ______________________________
>
> ( ) autorizo o uso do meu nome no registro  ( ) prefiro constar como "profissional participante"
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
| Participante (nome ou "profissional participante") | |
| Psicóloga do Instituto ou proxy? | |
| Facilitador / anotador | |
| Dispositivo usado | |
| Saída do `preparar-sessao.mjs` conferida? | |

**Tarefas**

| # | Tarefa | Conseguiu sozinha? | Tempo | SEQ (1–7) | Citação literal | Ajuste decidido |
|---|---|---|---|---|---|---|
| 1 | Voltar depois de um tempo fora | | | | | |
| 2 | A chamada do sábado que ficou | | | | | |
| 3 | Registrar o encontro | | | | | |
| 4 | O relatório do conselho | | | | | |
| 5 | A pergunta da assistente social | | | | | |
| 6 | O recado dos responsáveis | | | | | |

**Medida específica da tarefa 3 — taxa de correção pós-extração**

Não contar à mão: o próprio sistema grava os dois números ao confirmar a folha. Depois da sessão,
com o servidor parado:

```bash
node -e "import('./src/db.js').then(m=>{m.getDb();console.log(m.all(\`SELECT e.data, f.origem, f.confianca, f.campos_sugeridos, f.campos_editados FROM folha f JOIN encontro e ON e.id=f.encontro_id ORDER BY f.id DESC LIMIT 3\`))})"
```

| Campo | Valor |
|---|---|
| `campos_sugeridos` | |
| `campos_editados` | |
| Taxa (editados ÷ sugeridos) — limiar ≤ 40% | |
| Quais campos ela corrigiu (observação) | |

**Provocações do Lapso (§3.3)**

| Sinal | Valor |
|---|---|
| Longa — tempo até a primeira ação produtiva (< 30 s aprova) | |
| Longa — verbalizou culpa antes de agir? (sim reprova) | |
| Longa — procurou o passivo ou seguiu de onde está? | |
| Longa — perguntou se "ainda vale" registrar dia passado? | |
| Curta — a extração sobreviveu à saída da tela? | |
| Curta — ela sabe onde parou, sem procurar? | |
| Curta — tempo perdido no retorno | |

**Fronteira (M6) — registrar só se acontecer espontaneamente**

| Campo | Valor |
|---|---|
| Em que tela ela procurou escrever sobre uma criança | |
| Categoria da informação (categoria, **nunca** conteúdo) | |
| O que o sistema fez: barrou? explicou? ofereceu o caminho humano? | |

**Perguntas finais**

| # | Pergunta | Resposta literal |
|---|---|---|
| 1 | O que você faria com isso no sábado que vem? | |
| 2 | O que parece trabalho a mais? | |
| 3 | Algum momento sem saber o que o sistema fez com a fala? | |
| 4 | O que mandaria a quem financia? | |
| 5 | Usaria sem ninguém do lado? O que mudaria? | |

---

## 6. Resultados

**A sessão com o protocolo desta página (seis tarefas cronometradas, termo, formulário) não
aconteceu.** O que aconteceu, em 29/08/2026, foi uma **demonstração guiada com usuária real**
— a psicóloga do Instituto — e a conversa com o líder, registradas em quatro gravações (97 min)
e consolidadas em [`ARTEFATO-SEMANA-5.md`](ARTEFATO-SEMANA-5.md) §5 e em
[`jornada-usuario/CAMPO-versus-REPOSITORIO.md`](jornada-usuario/CAMPO-versus-REPOSITORIO.md).
Isso **não** preenche as tabelas da seção 5: não houve tempo medido, não houve "sozinha/com
ajuda", não houve Protocolo do Lapso. Resultado de validação é o que a participante fez e disse
com o aparelho na mão — e o aparelho ficou na mão do autor.

| Campo | Valor |
|---|---|
| Sessão com o protocolo (§3–§5) realizada em | — pendente |
| Formulário (§5) preenchido | — pendente |
| Demonstração com usuária real | **29/08/2026** — psicóloga e líder do Instituto; check-in estruturado respondido ao vivo; reações literais nas transcrições |
| Ajustes decididos a partir da demonstração | as etapas E1–E7 de [`revisao/11-PLANO-POS-VISITA.md`](revisao/11-PLANO-POS-VISITA.md), cada uma ligada ao achado que a motivou |
| O que a demonstração mudou no protocolo | **a passagem inteira desta página para a psicóloga** (02/09/2026): participante, seis tarefas, cenário, termo e formulário; as duas provocações do Lapso passaram para dentro das tarefas; e nasceu o `scripts/preparar-sessao.mjs`, sem o qual a sessão começava com o trabalho já feito |
