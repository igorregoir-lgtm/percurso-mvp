# Decisões técnicas

Para quem for dar manutenção depois. Cada decisão responde a uma restrição declarada do bloco 5 do
dossiê, não a uma preferência de stack.

---

### 1. Node.js puro + SQLite embutido, zero dependência externa

**Restrições:** *"A organização não tem profissional de tecnologia"* · *"Ausência de orçamento para
licença recorrente"* · *"A solução precisa sobreviver à semana 10"*.

**Decisão.** Servidor HTTP do próprio Node (`node:http`) e banco SQLite do próprio Node
(`node:sqlite`, estável a partir da v22.5). Nenhum `npm install`, nenhuma etapa de build e nenhum
framework são necessários para executar localmente.

O repositório mantém um `package-lock.json` mínimo apenas para registrar de forma reproduzível os
metadados de `package.json`; ele não instala pacote algum. `npm install` continua desnecessário
para executar, testar ou implantar o MVP.

**Consequências.** Rodar é `node server.js`. Com o servidor parado, backup é copiar um arquivo; com
o servidor ativo em WAL, é preciso copiar também `-wal` e `-shm` de forma consistente. Não há
dependência que quebre com atualização de terceiro. Em compensação, não há escala horizontal —
irrelevante para 106 crianças e uma dezena de operadores.

**Alternativas descartadas.** Next.js + Prisma (exige `npm install`, build e alguém que saiba
rodar). Airtable e afins (mensalidade recorrente — passivo sem receita garantida). HTML único com
IndexedDB (dados presos ao navegador de cada pessoa; quebraria o F7, que precisa agregar o que
todas as educadoras registraram).

---

### 2. Front-end sem framework, com roteamento por hash

Três arquivos em `public/`, servidos como estão. Não há transpilação, então **o código que está no
repositório é literalmente o código que roda no navegador** — quem for manter depois consegue abrir,
ler e editar. Roteamento por `#/rota` evita configuração de servidor para *deep links*.

---

### 3. Toda regra de negócio em `src/domain.js`

A camada HTTP (`src/api.js`) só traduz requisição em chamada de função. Elegibilidade, filtro de
perímetro, alertas, safras, trajetórias e síntese estão todos em um arquivo, em português, com o
nome do bloco do dossiê que originou cada regra em comentário. Trocar a interface não toca a regra;
auditar a regra não exige ler a interface.

---

### 4. O escore nunca nasce de modelo

**Decisão.** O nível de cada dimensão vem exclusivamente do que a educadora marcou na rubrica. As
médias vêm de `AVG()` em SQL. A síntese do ciclo é montada por **template fechado** (`redigirSintese`)
que interpola números vindos de consulta — não há geração livre de texto em lugar nenhum.

**Por quê.** Um indicador de impacto social precisa ser reproduzível e auditável por terceiro. Se o
número passar por um modelo de linguagem, ele deixa de ser verificável, e um financiador
corporativo que cobre prestação de contas tem razão em recusá-lo.

**O revisor de sobre-alegação** (`revisarSobreAlegacao`) é determinístico: barra verbo causal forte
("gerou", "causou", "provou", "garante", "resultou em") e exige a presença literal da ressalva de
não-isolamento de fatores externos. Sem os dois, o texto não pode ser aprovado. A linguagem é
tratada como artefato metodológico.

---

### 5. O filtro de perímetro roda antes de qualquer extração, e é determinístico

**Decisão.** `filtrarPerimetro` quebra o texto em frases e compara cada uma, **sem acento nos dois
lados**, com listas de termos de quatro categorias (saúde mental/diagnóstico, violência/proteção,
vida íntima e familiar, saúde física/corpo). A frase que casa é isolada: ela não alimenta campo
nenhum e não chega ao banco.

**A quinta categoria é diferente, e por isso é regra e não lista.** O bloco 6 barra *"qualquer
afirmação sobre o estado psíquico ou emocional interno de uma criança nomeada"*. Uma lista solta de
palavras não resolve: "a turma ficou triste" é observação de grupo e passaria a disparar o aviso à
toa — o jeito mais rápido de treinar a educadora a ignorar o aviso. A regra exige **as duas coisas
na mesma frase**: um nome da turma e uma afirmação de estado interno. Por isso `filtrarPerimetro`
recebe a lista de nomes da turma.

**Pelo mesmo motivo, "saúde" não entra solto.** *Saúde* é uma das áreas temáticas da folha do dia e
o eixo do score de exposição: bloquear a palavra quebraria a feature. O que o bloco 6 barra é a
saúde **de uma criança**, então os termos são contextualizados ("a saúde dela", "problema de saúde").

**Onde ele roda, desde a v2.** Sobre a **transcrição da captura por voz**, antes de o extrator
tocar no texto — o campo livre da observação saiu do produto (decisão 15) e o filtro mudou de posto
para onde a revelação sensível é muito mais provável. Quando ele encontra algo, a resposta de
`POST /api/voz/extrair` traz `conteudo_excluido: true` e a categoria, e a tela devolve
**encaminhamento humano** ("fale com a coordenação — esse caminho é fora daqui"), não erro técnico.
Nada é gravado: nem o trecho, nem a transcrição.

**Por quê determinístico e não um modelo.** Precisa ser explicável para a coordenação, auditável por
terceiro, e funcionar sem internet e sem custo por chamada. Uma lista de termos erra por excesso
(bloqueia o que era inofensivo) — e errar por excesso é o lado certo de errar quando o titular é
criança com histórico de violência.

**Limite conhecido, declarado.** Filtro por termo não pega paráfrase. Ele reduz o risco de captura
acidental; não substitui o treinamento breve da educadora, que o próprio protocolo (M6) prevê.

---

### 6. Bloqueio por consentimento é chave estrangeira, não validação de tela

`consentimento.campo` referencia `governanca_campo.campo`. Um campo sem base legal, titular, acesso
e retenção declarados **não pode** ter consentimento gravado. E `elegibilidade()` é consultada tanto
para desenhar a tela quanto no `POST` — desabilitar o botão no navegador não é o controle; o
controle está no servidor. Revogar consentimento volta a bloquear a criança mesmo que já exista
observação registrada.

---

### 7. Janela mínima de convívio como parâmetro de protocolo

`PARAMS.JANELA_MINIMA_CONVIVIO = 4` encontros. Responde à pergunta 6 do bloco 7: instrumento válido
impõe exigências sobre quem aplica. Uma criança recém-matriculada aparece **bloqueada com o motivo
explícito**, não escondida — a educadora entende que é protocolo, não falha dela.

Está isolado em `PARAMS`, junto com `AUSENCIAS_ALERTA` (2 — ver decisão 18) e `DIAS_LAPSO` (5), para que a
coordenação possa ajustá-los sem procurar no meio do código.

---

### 8. Sem senha, com papel

**Decisão.** Escolher o perfil na tela inicial; o papel (`educador` \| `coordenacao`) é verificado
**no servidor** em toda rota de coordenação.

**Por quê.** Autenticação real exige gestão de senha, recuperação e política — três coisas que uma
equipe sem TI não sustenta, e que a semana 10 não valida. O MVP demonstra a **separação de papéis**,
que é a decisão de produto; a autenticação é decisão de operação, a ser tomada pela coordenação
quando o sistema sair do piloto.

**Dívida técnica assumida e registrada.** Antes de operar com dado real é obrigatório: (a)
autenticação por senha ou SSO; (b) HTTPS; (c) registro de auditoria de acesso a dado individual.

---

### 9. Dados sintéticos determinísticos

PRNG com semente fixa (`mulberry32(20261009)`). O mesmo banco toda vez, o que torna as 242
asserções de fluxo e os 55 testes unitários reproduzíveis e permite que a demonstração seja idêntica em qualquer máquina. As datas são relativas
a *hoje*, então a demonstração nunca "envelhece".

---

### 10. `hoje()` usa data local, não UTC

Detalhe pequeno com efeito real: `new Date().toISOString()` devolve a data UTC e, à noite no
horário de Brasília, já virou o dia seguinte — a chamada de hoje apareceria com a data de amanhã.
`hoje()` compensa o *offset* local antes de cortar a string.

---

### 11. Melhorias derivadas da análise do app Bússola (18/08/2026)

Sete ideias adotadas de um protótipo concorrente do mesmo case, três rejeitadas — análise completa
em [`ANALISE-BUSSOLA.md`](ANALISE-BUSSOLA.md). As decisões estruturais:

- **Duração da chamada** (`encontro.duracao_segundos`): medida no cliente, clampada no servidor
  (1–3600s), tratada como telemetria do experimento de validação — nunca como métrica da educadora.
- **Supressão de célula pequena**: `agregadoPorCiclo` devolve `null` para média com n < 5
  (`PARAMS.MINIMO_CELULA`); o teste de invariante garante que nenhuma média circula abaixo do limiar.
- **Plano da semana determinístico**: banco fixo de atividades por dimensão em `domain.js`
  (`BANCO_ATIVIDADES`), foco = menor média do ciclo, alternância por semana do ano — variedade sem
  aleatoriedade, auditável linha a linha. Nenhum LLM.
- **Aspiração declarada**: tabela `aspiracao` (`crianca_id`, `area`, `declarada_em`) desde a v2 —
  era coluna em `crianca` até 22/08/2026 —, linha própria na governança (legítimo interesse,
  atividade-fim do Laboratório de Sonhos). Individual fica dentro; para fora, só agregado por área.

---

### 12. Render é o único deploy canônico em nuvem

O [`render.yaml`](../render.yaml) define um Web Service Node no plano Starter, com disco persistente
montado em `/var/data` e `PERCURSO_DB=/var/data/percurso.db`. O servidor recebe `PORT` do Render e,
nessa situação, faz bind em `0.0.0.0`; localmente continua restrito a `127.0.0.1:3000`.

O disco é obrigatório porque o filesystem normal do Render é efêmero. SQLite exige uma única
instância: escala horizontal só poderá ser habilitada depois de migrar para um banco compartilhado.
Persistência não é backup; a operação deve manter cópias externas e testar restauração.

---

### 13. A camada de IA da v2 é determinística, e o slot do modelo fica declarado

**Restrições:** *"Ausência de orçamento para licença recorrente"* · *"todo o público é menor de
idade"* · doutrina do slide de arquitetura (*"escore nunca nasce de modelo; nasce da rubrica e da
fórmula"*).

O pack `percurso-v2-pack` desenha a camada de voz sobre transcrição paga (n8n + API) e um agente
extrator LLM. O Percurso implementa **o mesmo contrato** sem nenhuma das duas coisas:

| O que o pack pede | Como o Percurso entrega | Onde |
|---|---|---|
| Transcrição do áudio | `SpeechRecognition` do próprio navegador; o áudio nunca sai do aparelho e nunca chega ao servidor | `public/app.js` (`voz-toggle`) |
| Agente extrator com schema fechado | Casamento lexical sobre listas fixas, saída validada contra o mesmo schema | `src/voz.js` (`extrairDaFala`, `validarExtracao`) |
| Lista de exclusão | Filtro de perímetro determinístico, por categoria, antes de qualquer extração | `src/domain.js` (`filtrarPerimetro`) |
| Estado de baixa confiança | Confiança calculada a partir de quanto do schema a fala preencheu; abaixo de 0,6 nada é pré-marcado | `src/voz.js` |
| Agente redator do relatório | Template fechado com números interpolados de SQL + revisor de sobre-alegação | `src/relatorio.js` |
| Consulta em linguagem natural | Casamento de intenção contra lista fechada; quando não reconhece, diz que não sabe | `src/relatorio.js` (`consultar`) |

**Por que assim.** Custo de licença fica em R$ 0 e nenhum byte de fala sobre criança sai da
organização — as duas restrições que o dossiê trata como não negociáveis. Uma dedução errada de um
LLM sobre uma criança nomeada é um erro que ninguém consegue rastrear depois; uma regra escrita é
auditável linha a linha.

**O que isso custa.** O extrator lexical entende menos variação linguística que um LLM. A taxa de
correção pós-extração está instrumentada exatamente para medir isso (`#/scores`): se ela subir
acima de 40%, o extrator está pior que o formulário e a decisão deve ser revista.

**Como trocar depois.** O contrato é `extrairDaFala(transcricao, nomesDaTurma) → { extracao }` com
saída obrigatoriamente válida contra `validarExtracao`. Um SLM local (ou uma API, se um dia houver
orçamento) entra nesse lugar **sem tocar em mais nada** — a validação de schema, a lista de exclusão
e a confirmação humana continuam sendo do sistema, não do modelo.

---

### 14. Migração de esquema pela assinatura do próprio DDL

Todo dado é sintético e a semeadura é determinística, então a migração mais segura é recriar. O
`PRAGMA user_version` guarda um hash do texto do esquema (`src/db.js`, `assinar`): mudou o DDL,
mudou a assinatura, o banco é derrubado e recriado na abertura seguinte.

**Por que não um número incrementado à mão.** Porque esquecer de incrementar produz o pior estado
possível — banco velho carimbado como novo. Isso aconteceu uma vez durante o desenvolvimento da v2
e é a razão desta decisão existir.

**Antes de operar com dado real isto muda.** Com dado real, recriar é perda de dado: a migração
passa a ser incremental (`ALTER TABLE` versionado) e a assinatura vira apenas verificação.

---

### 15. O olhar não tem campo de texto sobre a criança

**Origem:** decisão de desenho do `percurso-v2-pack` (`01-VISAO-E-MUDANCAS.md`), adotada.

A v1 tinha um campo livre opcional protegido pelo filtro de perímetro. A v2 **remove o campo**: texto
narrativo sobre criança nomeada é a coluna clínica do bloco 6, e um filtro é mitigação, não ausência
de risco. Quem tentar gravar por ele recebe 422 com encaminhamento humano, não erro técnico.

**Três consequências, todas boas.**
1. O filtro de perímetro não some — ele **muda de posto** e passa a guardar a transcrição de voz,
   onde revelação sensível é muito mais provável do que num campo que a educadora digita devagar.
2. O achado **A-05** da revisão de 22/08/2026 (retenção "descarte ao fim do ciclo" declarada e nunca
   executada) deixa de existir: não há mais o que reter. O mecanismo de fecho de ciclo foi
   implementado mesmo assim, para apagar qualquer valor legado (`fecharCiclo`).
3. A rubrica de âncoras comportamentais continua sendo o único registro individual — e ela é
   categórica, ancorada em referencial público e nunca sai em nível individual.

---

### 16. A diretoria não abre registro individual

O perfil da diretoria existe para gerar, revisar e publicar o relatório do doador. As rotas de
ficha, lista de crianças e observação respondem **403** para ele (`semAcessoIndividual` em
`src/api.js`).

É a regra zero do `08-RELATORIO-DOADOR` levada para dentro do sistema: quem presta contas trabalha
sobre a camada agregada, então não precisa de acesso individual — e por isso não tem. Prestar contas
não pode virar caminho de acesso a criança, do mesmo modo que doar não pode.

---

### 17. Fila offline no aparelho, só para falha de rede

Chamada e folha do dia são registradas dentro da sala, onde a rede cai. Quando o `POST` falha por
**rede**, o pedido vai para uma fila em `localStorage` e sobe sozinho no evento `online`
(`postComFila` em `public/app.js`). O topo mostra quantos itens estão na fila.

**O que NÃO entra na fila:** erro de regra (4xx). Enfileirar uma requisição que o servidor recusou
por regra de negócio faria o sistema tentar para sempre uma gravação que nunca pode acontecer — e
esconderia da educadora que algo estava errado.

---

### 18. Alerta de ausência em duas faltas, não três

A v1 disparava com três ausências consecutivas. O `02-FEATURES.md` do pack e a US4 exigem **duas**
("o alerta aparece no dia seguinte à segunda falta"). `PARAMS.AUSENCIAS_ALERTA` passou para 2.

O score de risco de evasão tem dois gatilhos independentes: o **valor** (acima de 60 entra na pauta)
e a **contagem** (duas faltas seguidas entram na lista de qualquer jeito). Os pesos do valor foram
recalibrados em relação ao `codigo/scores.js` do pack porque a fórmula original (`consecutivas * 30`)
satura em 100 com quatro faltas — e uma coluna em que todo mundo aparece com 100 não serve para
priorizar qual família ligar primeiro.

---

## Dívidas técnicas conhecidas

| Dívida | Impacto | Quando pagar |
|---|---|---|
| Sem autenticação | Bloqueante para dado real | Antes do primeiro dado real |
| Sem HTTPS | Bloqueante em rede não confiável | Junto com a autenticação |
| Sem log de auditoria de acesso individual | Exigível sob LGPD | Antes do primeiro dado real |
| Filtro de perímetro por termo, não por sentido | Deixa passar paráfrase | Depende de avaliação com a psicóloga |
| Sem exportação (CSV/PDF) da síntese | Copiar e colar resolve hoje | Quando o relatório anual for montado |
| Sem paginação na lista de crianças (limite 60) | Irrelevante em 106 crianças | Se a operação dobrar |
