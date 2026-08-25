# Roteiro do vídeo demonstrativo — v2

Entregável exigido na semana 10. Duração alvo: **até 7 minutos** (o orçamento de tempo abaixo soma
7m00). Cada cena traz **[tempo · tela]**, a ação na tela e a fala.

> **Estado deste roteiro.** O vídeo atual em `video/percurso-demonstracao.mp4` (**6m14s**) foi
> gravado sobre a **v1** e não mostra captura por voz, copilot, calibração, SROI nem relatório do
> doador. **Regravar seguindo este roteiro é pendência humana** — item §5 de
> [`PENDENCIAS-DE-ENTREGA.md`](PENDENCIAS-DE-ENTREGA.md).

**Antes de gravar:**

1. `node scripts/reset.mjs` — garante o estado inicial determinístico descrito abaixo.
2. Para as cenas 7 e 12 (copilot e explicação de premissas): subir o modelo com
   `ai/scripts/start-llama.sh` e iniciar o servidor com `AI_ENABLED=1 node server.js`
   (se o modelo não estiver baixado: `ai/scripts/setup-model.sh` antes). Todo o resto do vídeo
   funciona com `AI_ENABLED=false` — e vale dizer isso na cena 13.
3. Cenas da educadora (1–7): janela estreita (≈400px) ou celular — a persona usa o produto em pé,
   dentro da sala. Cenas de coordenação e diretoria (8–12): janela normal.

---

### 0 · Abertura — [0:15 · tela de entrada]

**Fala:** o desafio escolhido foi o **B — Monitoramento de Impacto**; o produto se chama
**Percurso**; **todos os dados são sintéticos** — nenhum dado real de criança foi usado.

### 1 · Entrar — [0:15 · `#/entrar` → `#/hoje`]

**Ação:** entrar como **Maria Silvia** (educadora). A tela **Hoje** aparece com o dia organizado.

**Fala:** ler a frase da persona — *"Não consigo transformar em dados os resultados do meu
trabalho."* O que vem a seguir é a resposta a essa frase.

### 2 · Chamada — [0:25 · `#/chamada`]

**Ação:** abrir a chamada, usar **"Todos presentes"**, marcar uma falta, salvar. Mostrar que ao
salvar o sistema **abre sozinho a próxima data pendente**.

**Fala:** presença em um toque; recuperação encadeada, sem cobrança. Em ONG, o registro não morre
por rejeição — morre por lapso seguido de desistência, e o produto é desenhado contra isso.

### 3 · Contar como foi — voz + filtro de perímetro — [1:10 · `#/voz` → confirmação]

**Ação:** da tela Hoje, tocar em **"Contar como foi"**. Mostrar o microfone, a onda e a contagem
de **40 segundos**. Falar (ou digitar no campo de baixo — a saída manual está sempre ali):

> *"Hoje a gente fez uma roda de conversa sobre saúde, a turma participou bastante e ficou alegre.
> Três crianças pediram ajuda. A mãe da Ana contou que ela começou terapia esta semana."*

Tocar em **Terminei**. Nomear as três coisas que acontecem:

1. **O filtro de perímetro.** O cartão *"Tem algo aqui que não entra no sistema"* isola a frase
   sobre a terapia da Ana e devolve **encaminhamento humano** — fale com a coordenação, esse
   caminho é fora daqui. **Fala:** um produto de voz sobre criança vai capturar revelação sensível
   alguma hora; em vez de fingir que não, o sistema reconhece, **não grava** — nem o trecho, nem a
   transcrição — e devolve o caminho certo.
2. **A tela "O que entendi".** As pills já vêm marcadas — *roda de conversa*, *saúde*,
   *participou*, *alegre*, o contador em três. **Fala:** o extrator escolhe **dentro de listas
   fixas** e nunca escreve texto livre — é isso que torna a saída comparável entre educadoras.
3. **Nada foi gravado ainda.** Trocar *saúde* por *educação* na frente da câmera e só então
   **Confirmar e guardar**. **Fala:** quem confirma é a pessoa, sempre.

### 4 · Agenda do ciclo — [0:20 · `#/ciclo`]

**Ação:** abrir **Ciclo**. Mostrar o progresso e as duas crianças bloqueadas; ler os motivos em
voz alta: **falta de consentimento do responsável (LGPD art. 14)** e **janela mínima de convívio
não cumprida**.

**Fala:** bloqueio explicado nunca é erro da usuária — é protocolo, dito com todas as letras.

### 5 · O olhar — âncoras + calibração — [0:35 · `#/observacao/…`]

**Ação:** abrir uma observação pendente. Mostrar as 5 dimensões com âncoras comportamentais e o
subtítulo *"Opcional. A folha do dia já registrou a turma."* Abrir o bloco
**"Como calibrar o olhar (1 minuto)"** e ler dois itens: marcar pelo comportamento
**predominante**, não pelo episódio; na dúvida entre dois níveis, o **menor**.

**Fala:** o treinamento do protocolo (M6) mora dentro da tela onde a rubrica é aplicada — não em
apostila. E o que **não** existe aqui: campo de opinião sobre a criança. Texto narrativo sobre
criança nomeada é registro clínico, e registro clínico tem outra titular.

### 6 · O fecho do ciclo — [0:25 · tela de revelação]

**Ação:** concluir a última observação pendente. Deixar a tela de revelação aparecer **sem falar
por cima**: 18 de 18, o tempo total investido no ciclo, as barras dos dois ciclos e a frase entre
aspas.

**Fala (só depois):** *é esta frase, e não o número de presenças, que o Instituto não conseguia
dizer a quem financia.*

### 7 · Refletir — o copilot local — [0:55 · `#/copilot`]

**Ação e fala, em três tempos:**

1. Abrir **Refletir** e ler o aviso permanente: descreva a **situação**, não a criança; nomes do
   cadastro viram pseudônimos antes do modelo, apelidos não são cobertos; a decisão pedagógica é
   sua. **Fala:** o modelo roda **na máquina, local** — nada sai dela, e custa R$ 0 por conversa.
2. Enviar uma situação real de prática (ex.: *"metade da turma se dispersa na roda depois de dez
   minutos"*). Mostrar a resposta em blocos: **perguntas para pensar** (socráticas), **hipóteses —
   para debate, não diagnóstico**, alternativas com limites, contraponto e as **fontes do corpus
   aprovado** com `[fonte:ID]`. **Fala:** toda citação aponta para um trecho que existe no corpus;
   afirmação sem fonte vem rotulada como opinião do modelo.
3. Perguntar algo que o copilot **recusa** (ex.: *"que diagnóstico o João tem?"*). Mostrar o
   cartão de recusa. **Fala:** diagnóstico é ato clínico e a recusa é determinística — não depende
   do humor do modelo. E o botão **Apagar sessão**: nada desta conversa é persistido.

### 8 · A coordenação — painel + calibração entre educadoras — [0:35 · `#/painel`]

**Ação:** sair e entrar como **Rita Amaral**.

- Mostrar **106 crianças únicas para 120 matrículas**, 14 em dois programas. **Fala:** "120" era
  matrícula, não criança — nenhuma afirmação de impacto é verificável antes dessa separação.
- Descer até **"Calibração do olhar entre educadoras"**: a tabela de médias por educadora ×
  dimensão, com as células divergentes marcadas. **Fala:** onde duas educadoras enxergam a mesma
  dimensão de jeitos muito diferentes, o convite é calibrar juntas com as âncoras — pauta de
  reunião, **nunca avaliação de educadora**. Só entram células com 5+ observações, e não há
  ranking.

### 9 · Scores — [0:20 · `#/scores`]

**Ação:** abrir os três scores.

**Fala:** *nenhum destes scores pontua a criança.* O risco de evasão compara a criança **com a
linha de base dela mesma**; a cobertura do registro **mede o sistema, não a professora** — por
isso não aparece em tela de educadora; a exposição publica a lacuna em vez de escondê-la. E a
taxa de correção pós-extração mede se a voz está funcionando melhor que o formulário.

### 10 · Síntese com revisor — [0:20 · `#/sintese`]

**Ação:** gerar a síntese. Mostrar os selos **"revisor de sobre-alegação: aprovado"** e
**"aprovação humana: pendente"**. Aprovar.

**Fala:** os números vêm de consulta ao banco e o texto de template fechado — nunca de geração
livre. O revisor barra verbo causal forte e exige a ressalva de não-isolamento de fatores.

### 11 · A diretoria — relatório do doador — [0:30 · `#/relatorio`]

**Ação:** sair e entrar como **Solange Ribeiro**. Gerar o rascunho e percorrer rápido os blocos na
ordem em que um financiador lê, parando em dois pontos: **crianças únicas e matrículas lado a
lado** e a caixa de supressão (recortes com menos de cinco crianças são agrupados ou suprimidos).
**Revisar e publicar.**

**Fala:** a regra zero — **o doador não entra no sistema**; ele recebe este artefato. E provar:
tentar abrir a ficha de uma criança neste perfil devolve **403**. Quem presta contas não precisa
de acesso individual, então não tem.

### 12 · Impacto — SROI exploratório — [0:35 · `#/impacto`]

**Ação:** abrir **Impacto**. Ler o kicker: *"cenários exploratórios · associação compatível, não
causalidade comprovada"*. Montar um cenário (crianças únicas já vêm do inventário; preencher
investimento e horizonte) e **Calcular os 3 cenários**.

**Fala:** o resultado é sempre **faixa** — conservador, base, superior — nunca número único. Cada
premissa aparece com valor, fonte, URL e ressalva; a dupla contagem entre proxies é **bloqueada
pelo motor**; o eixo da narrativa é a **prevenção de violência**, decisão do Instituto. E o
rodapé: cálculo determinístico, **sem modelo de linguagem** — o modelo, quando ligado, apenas
explica premissas, e o texto gerado vem rotulado e fora do relatório exportado por padrão.

### 13 · Fecho técnico — [0:20 · terminal]

**Ação:** mostrar o terminal: `node server.js` — sem instalação, sem build, sem mensalidade.
Mostrar `data/percurso.db` — o backup é copiar um arquivo. Rodar as duas baterias e mostrar os
totais: `node scripts/smoke-test.mjs` com **242 passaram · 0 falharam** e
`node scripts/unit-test.mjs` com **63 passaram**.

**Fala:** tudo o que apareceu antes do copilot roda com a IA **desligada** — `AI_ENABLED=false` é
o padrão, e o produto inteiro funciona sem modelo, sem rede e sem custo. Encerrar com a restrição
do bloco 5: *a solução precisa sobreviver à semana 10* — e é por isso que ela tem essa forma.
