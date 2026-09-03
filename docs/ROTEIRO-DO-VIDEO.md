# Roteiro do vídeo demonstrativo — v3 (pós-visita)

Entregável exigido na semana 10. Duração alvo: **até 7 minutos** (o orçamento abaixo soma **7m00**).
Cada cena traz **[tempo · tela]**, a ação na tela e a fala.

> **Estado deste roteiro.** O vídeo em `video/percurso-demonstracao.mp4` (**6m14s**) foi gravado
> sobre a **v1**. **Regravar seguindo este roteiro é pendência humana** — §5 de
> [`PENDENCIAS-DE-ENTREGA.md`](PENDENCIAS-DE-ENTREGA.md).

## O que mudou da v2 para a v3

A v2 tinha 13 cenas e **nenhuma da psicóloga** — foi escrita antes da visita de campo de
29/08/2026. Depois dela, quem tem a dor do registro e quem escreve o relatório é ela (decisão 31),
e o produto ganhou quatro telas que o vídeo não mostrava: registro de vivência, relato no padrão do
conselho, recado aos responsáveis e parecer a profissional parceiro. Faltava também a consulta em
linguagem natural (F15), que existe desde a v2 e nunca entrou no roteiro.

**Cinco cenas novas da psicóloga, uma da consulta — e o orçamento continua 7m00.** O que foi cortado
para caber, e por quê:

| Cena | v2 | v3 | Por quê |
|---|---|---|---|
| Captura por voz | 1:10, com a **educadora** | 1:00, com a **psicóloga** | A voz é a resposta à dor *dela*. Demonstrar com a educadora era mostrar a solução longe do problema — e duplicaria a cena se as duas capturassem |
| Refletir (copilot) | 0:55, no meio do fluxo | 0:30, **no fim** | É a camada opcional, desligada por padrão. Ficava no meio do vídeo ocupando o maior bloco individual e sugerindo centralidade que ela não tem |
| Impacto (SROI) | 0:35 | 0:20 | O cálculo depende de quatro números que o Instituto ainda deve (§3 de `PENDENCIAS-DE-ENTREGA.md`). A cena mostra as premissas e a regra da faixa; encenar um cálculo com números inventados seria pior que mostrar menos |
| Fecho do ciclo | 0:25 | 0:15 | A tela de revelação se explica sozinha; a fala em cima dela era redundante |

**Antes de gravar:**

1. `node scripts/reset.mjs` — estado inicial determinístico.
2. **Para as cenas da psicóloga (6 a 10):** `node scripts/preparar-sessao.mjs`, que apaga o encontro
   mais recente da Vivência. Sem isso o sábado já vem registrado no seed e a cena 7 mostra *"Contar
   de novo"* em vez do estado pendente, que é o que interessa. A cena 6 refaz a chamada na câmera.
3. **Para as cenas 17 (copilot) e a explicação de premissas na 16:** subir o modelo com
   `ai/scripts/start-llama.sh` e iniciar com `AI_ENABLED=1 node server.js` (se o modelo não estiver
   baixado, `ai/scripts/setup-model.sh` antes). **Todo o resto funciona com `AI_ENABLED=false`** — e
   vale dizer isso na cena 18.
4. **Cena 9 (recado):** abrir pelo botão **"Recado para os responsáveis"** no cartão da folha, na
   tela Hoje — o caminho que a psicóloga usaria. Funciona em qualquer dia desde `48ec1dd`
   (03/09/2026), que ligou o botão ao **encontro da folha** e não à chamada de hoje
   (`public/app.js:509`). Até ali ele sumia em dia não letivo e a cena tinha de abrir `#/recado`
   pela URL; **essa instrução caiu.**
5. Cenas dos papéis de campo (1–10): janela estreita (≈400 px) ou celular — as personas usam o
   produto em pé, dentro da sala. Cenas de gestão (11–16): janela normal.

---

## Bloco 1 · A educadora — 1:45

### 0 · Abertura — [0:15 · tela de entrada]

**Fala:** o desafio escolhido foi o **B — Monitoramento de Impacto**; o produto se chama
**Percurso**; **todos os dados são sintéticos** — nenhum dado real de criança foi usado.

### 1 · Entrar — [0:10 · `#/entrar` → `#/hoje`]

**Ação:** entrar como **Maria Silvia** (educadora). A tela **Hoje** aparece com o dia organizado.

**Fala:** ler a frase que originou o produto na inception — *"Não consigo transformar em dados os
resultados do meu trabalho."*

### 2 · Chamada — [0:20 · `#/chamada`]

**Ação:** abrir a chamada, usar **"Todos presentes"**, marcar uma falta, salvar. Mostrar que ao
salvar o sistema **abre sozinho a próxima data pendente**.

**Fala:** presença em um toque; recuperação encadeada, sem cobrança. Em ONG o registro não morre
por rejeição — morre por lapso seguido de desistência, e o produto é desenhado contra isso.

### 3 · Agenda do ciclo — [0:20 · `#/ciclo`]

**Ação:** abrir **Ciclo**. Mostrar o progresso e as crianças bloqueadas; ler os motivos em voz
alta: **falta de consentimento do responsável (LGPD art. 14)** e **janela mínima de convívio não
cumprida**.

**Fala:** bloqueio explicado nunca é erro da usuária — é protocolo, dito com todas as letras.

### 4 · O olhar — âncoras + calibração — [0:25 · `#/observacao/…`]

**Ação:** abrir uma observação pendente. Mostrar as **seis dimensões — os indicadores da planilha
socioemocional que o Instituto já usa** (decisão 34) — com âncoras comportamentais. Abrir
**"Como calibrar o olhar (1 minuto)"** e ler dois itens: marcar pelo comportamento
**predominante**, não pelo episódio; na dúvida entre dois níveis, o **menor**.

**Fala:** a rubrica não foi inventada aqui — fala a língua da planilha que a casa já preenchia, e o
mapeamento de 1–4 para 0–2 está declarado num lugar só. E o que **não** existe nesta tela: campo de
opinião sobre a criança.

### 5 · O fecho do ciclo — [0:15 · tela de revelação]

**Ação:** concluir a última observação pendente. Deixar a tela de revelação aparecer **sem falar por
cima**: as barras dos dois ciclos e a frase entre aspas.

**Fala (só depois):** *é esta frase, e não o número de presenças, que o Instituto não conseguia
dizer a quem financia.*

---

## Bloco 2 · A psicóloga — 2:25 · **o bloco que a visita produziu**

### 6 · Quem realmente escreve o relatório — [0:15 · `#/entrar` → `#/hoje` → `#/chamada`]

**Ação:** sair e entrar como **Carolina Duarte** (psicóloga). A navegação **muda**: não há Ciclo
nem Pauta — há Vivência e Relato. Fazer a chamada do sábado em aberto.

**Fala:** ler a frase dela, literal, da visita de 29/08/2026 — *"o maior desafio aqui é registrar o
que você fez, né? Essa é a maior dificuldade, é o registro."* A turma dela fica **fora da rubrica**
por decisão: o olhar clínico não vira dado, e o sigilo profissional impede transferência. O que
entra é presença, procedimento e check-in de grupo.

### 7 · Contar como foi — voz + filtro de perímetro — [1:00 · `#/voz` → `#/confirmar`]

**Ação:** tocar em **"Contar como foi"**. Ler em voz alta o aviso da tela — *o que este botão grava
e o que não grava*. Mostrar o microfone, a onda e a contagem de **40 segundos**. Falar (ou digitar
no campo de baixo — a saída manual está sempre ali):

> *"Hoje a gente fez a roda das emoções, para eles nomearem o que sentem. Duas crianças ajudaram
> sem ninguém pedir, seis participaram do começo ao fim. Teve um conflito e resolveram conversando.
> A mãe da Ana contou que ela começou terapia esta semana."*

Tocar em **Terminei**. Nomear as três coisas que acontecem:

1. **O filtro de perímetro.** O cartão *"Tem algo aqui que não entra no sistema"* isola a frase
   sobre a terapia e devolve **encaminhamento humano**. **Fala:** um produto de voz sobre criança
   vai capturar revelação sensível alguma hora; em vez de fingir que não, o sistema reconhece,
   **não grava** — nem o trecho nem a transcrição — e devolve o caminho certo.
2. **A tela "O que entendi".** Procedimento, objetivo e o **check-in de grupo** já vêm marcados:
   *roda de emoções*, ajudaram sem pedir **2**, participaram do começo ao fim **6**, conflito **1**,
   resolvido conversando **1**. **Fala:** o extrator escolhe **dentro de listas fixas** e nunca
   escreve texto livre. As contagens são da turma, nunca de uma criança.
3. **Nada foi gravado ainda.** Marcar o **Objetivo**, que o extrator deixou em branco, e só então
   **Confirmar e guardar**. **Fala:** quem confirma é a pessoa, sempre — e o campo que ele erra é
   o que ela corrige, que é como a taxa de correção é medida.

**Por que o gancho da gravação importa** (dizer em uma frase): na visita, gravar criança foi
chamado de *"perigoso"*. Por isso a tela diz, antes do toque, que nenhuma criança é gravada, que o
áudio não sai do aparelho e que nome falado vira código.

> **Conferido no app com este texto exato** (03/09/2026): o trecho da terapia é excluído com a
> categoria *"saúde mental / diagnóstico"*, o procedimento sai como *roda de emoções*, o check-in
> sai **2 · 6 · 1 · 1** e o **objetivo sai em branco** — é ele que ela marca na câmera. Não conte
> com a substituição de nome nesta cena: "Ana" não está no cadastro da turma, e o trecho é excluído
> inteiro antes disso. A pseudonimização por código vale para nomes **do cadastro**.

### 8 · O relato no padrão do conselho — [0:25 · `#/relato`]

**Ação:** da tela Hoje, **"Revisar e liberar o relato"**. Mostrar o texto gerado: procedimento,
objetivo, desenvolvimento com as contagens, encaminhamentos e a nota de sigilo. **Liberar.**

**Fala:** este é o documento que ela escreve à noite hoje, e que aqui sai dos campos fechados da
folha — **não existe onde escrever o nome de uma criança**. O texto é dela e só vale depois do OK
dela; editar a folha depois de liberar derruba a liberação.

### 9 · Recado aos responsáveis + a régua de 75% — [0:20 · `#/recado`]

**Ação:** abrir `#/recado`. Mostrar o texto pronto para colar e o botão do WhatsApp. Apontar a
linha da presença do mês **contra a régua de 75%** do Instituto.

**Fala:** o recado semanal por WhatsApp e a régua de 75% **já existem** na casa — são política e
prática dela, feitas à mão, grupo por turma. O produto não inventou processo: absorveu o que já
acontecia. E o recado é **da turma**, nunca de uma criança.

### 10 · Parecer a profissional parceiro — [0:25 · `#/criancas` → ficha]

**Ação:** abrir a ficha de uma criança e descer até **"Parecer a profissional parceiro"**. Mostrar
o cartão **bloqueado**: *sem consentimento específico, não sai*.

**Fala:** na visita ela nomeou o destino mais rico do registro — *"que daí seria entre
profissionais, que é mais rico ainda"*: a assistente social do projeto parceiro que pergunta como a
criança está, e recebe a resposta de memória, no WhatsApp. Aqui esse é **o único dado individual
que sai do sistema** — por código, nunca por nome, sem conteúdo clínico, sob consentimento
específico do responsável, e só depois de liberado. E quem registra o consentimento é a
coordenação, não ela: **a tela dela diz isso, em vez de só bloquear.**

---

## Bloco 3 · A coordenação — 1:00

### 11 · Painel + calibração entre educadoras — [0:25 · `#/painel`]

**Ação:** entrar como **Rita Amaral**.

- **106 crianças únicas para 120 matrículas**, 14 em dois programas. **Fala:** "120" era matrícula,
  não criança — nenhuma afirmação de impacto é verificável antes dessa separação.
- Descer até **"Calibração do olhar entre educadoras"**. **Fala:** onde duas educadoras enxergam a
  mesma dimensão de jeitos diferentes, o convite é calibrar juntas com as âncoras — pauta de
  reunião, **nunca avaliação de educadora**. Só entram células com 5+ observações, e não há ranking.
- Apontar a **Vivência marcada como fora da rubrica**. **Fala:** a exclusão é declarada na tela, com
  o motivo — não é ausência silenciosa.

### 12 · Scores — [0:15 · `#/scores`]

**Fala:** *nenhum destes scores pontua a criança.* O risco de evasão compara a criança **com a
linha de base dela mesma**; a cobertura do registro **mede o sistema, não a professora** — por isso
não aparece em tela de educadora; a exposição publica a lacuna em vez de escondê-la.

### 13 · Síntese com revisor — [0:20 · `#/sintese`]

**Ação:** gerar a síntese. Mostrar os selos **"revisor de sobre-alegação: aprovado"** e
**"aprovação humana: pendente"**. Aprovar.

**Fala:** os números vêm de consulta ao banco e o texto de template fechado — nunca de geração
livre. O revisor barra verbo causal forte e exige a ressalva de não-isolamento de fatores.

---

## Bloco 4 · A diretoria — 1:00

### 14 · Relatório do doador — [0:25 · `#/relatorio`]

**Ação:** entrar como **Solange Ribeiro**. Gerar o rascunho e percorrer os blocos na ordem em que um
financiador lê, parando em dois pontos: **crianças únicas e matrículas lado a lado** e a caixa de
supressão (recortes com menos de cinco crianças são agrupados ou suprimidos).

**Fala:** a regra zero — **o doador não entra no sistema**; ele recebe este artefato. E provar:
tentar abrir a ficha de uma criança neste perfil devolve **403**.

### 15 · Perguntar — consulta em linguagem natural — [0:15 · `#/consulta`]

**Ação:** fazer **duas** perguntas que começam igual:

> *"Quantas crianças o instituto atende hoje?"* → responde **contagem**
> *"Quantas crianças estão em risco de sair?"* → responde **evasão**, com o limiar

**Fala:** a resposta vem de **SQL**, com a fonte citada — nada é estimado nem inferido. E quando a
pergunta é sobre uma criança, o sistema diz que **não sabe**, em vez de arriscar.

### 16 · Impacto — SROI exploratório — [0:20 · `#/impacto`]

**Ação:** abrir **Impacto**. Ler o kicker: *cenário exploratório · associação compatível, não
causalidade comprovada*. Mostrar as **cinco regras do cálculo** e os três cenários.

**Fala:** o resultado é sempre **faixa** — conservador, base, superior —, nunca número único. E ser
honesto na câmera: **a faixa ainda não pode ser calculada**, porque depende de quatro números que
só o Instituto tem. A tela mostra as premissas e diz isso, em vez de inventar a conta.

---

## Bloco 5 · A camada opcional e o fecho — 0:50

### 17 · Refletir — o copilot local — [0:30 · `#/copilot`]

**Ação e fala, em três tempos rápidos:**

1. Ler o aviso permanente: descreva a **situação**, não a criança. **Fala:** o modelo roda **na
   máquina, local** — nada sai dela, e custa R$ 0 por conversa.
2. Enviar uma situação de prática. Mostrar as **fontes do corpus** com `[fonte:ID]`.
3. Perguntar algo que ele **recusa** (*"que diagnóstico o João tem?"*). **Fala:** diagnóstico é ato
   clínico e a recusa é **determinística** — não depende do humor do modelo.

> **Esta cena é a última de produto de propósito.** Tudo o que veio antes roda com a IA
> **desligada**, e é isso que a próxima cena diz.

### 18 · Fecho técnico — [0:20 · terminal]

**Ação:** mostrar `node server.js` — sem instalação, sem build, sem mensalidade. Mostrar
`data/percurso.db` — o backup é copiar um arquivo. Rodar as duas baterias e mostrar os totais:

```
node scripts/smoke-test.mjs   → 374 passaram · 0 falharam
node scripts/unit-test.mjs    → 165 passaram · 0 falharam
```

> **Conferir os números antes de gravar.** Eles mudam a cada bateria nova, e o roteiro anterior
> mandava ler **242 e 63** na câmera — números de duas versões atrás. Rode as duas e leia o que
> aparecer.

**Fala:** tudo o que apareceu antes do copilot roda com a IA **desligada** — `AI_ENABLED=false` é o
padrão, e o produto inteiro funciona sem modelo, sem rede e sem custo. Encerrar com a restrição do
bloco 5: *a solução precisa sobreviver à semana 10* — e é por isso que ela tem essa forma.

---

## Orçamento de tempo

| Bloco | Cenas | Tempo |
|---|---|---|
| Abertura + educadora | 0–5 | 1:45 |
| **A psicóloga** | 6–10 | **2:25** |
| Coordenação | 11–13 | 1:00 |
| Diretoria | 14–16 | 1:00 |
| Copilot + fecho | 17–18 | 0:50 |
| **Total** | | **7:00** |

O bloco da psicóloga é o maior do vídeo, e é deliberado: é o que a visita de campo mostrou ser o
centro do problema, e é a parte do produto que nenhuma versão anterior do vídeo mostrou.
