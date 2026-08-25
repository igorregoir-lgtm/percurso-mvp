# Decisões técnicas

Para quem for dar manutenção depois. Cada decisão responde a uma restrição declarada do bloco 5 do
dossiê, não a uma preferência de stack.

---

### 1. Node.js puro + SQLite embutido, zero dependência externa

**Restrições:** *"A organização não tem profissional de tecnologia"* · *"Ausência de orçamento para
licença recorrente"* · *"A solução precisa sobreviver à semana 10"*.

**Decisão.** Servidor HTTP do próprio Node (`node:http`) e banco SQLite do próprio Node
(`node:sqlite` — **sem flag a partir da v22.13**; entre 22.5 e 22.12 exigia
`--experimental-sqlite`, e a declaração antiga de "22.5 ou superior" quebrava o boot — corrigido na
revisão de 25/08/2026: `.nvmrc` fixa o Node 24 LTS e `engines` exige `>=22.13`). Nenhum
`npm install`, nenhuma etapa de build e nenhum framework são necessários para executar localmente.

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

PRNG com semente fixa (`mulberry32(20261009)`). O mesmo banco toda vez, o que torna as 246
asserções de fluxo e os 63 testes unitários reproduzíveis e permite que a demonstração seja idêntica em qualquer máquina. As datas são relativas
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

**Atualização (25/08/2026).** A troca prevista foi implementada como OPÇÃO: `extrairComModelo`
(`src/copilot.js`) usa o Qwen local sob o MESMO schema fechado, com pseudonimização reversível antes
do modelo e fallback lexical em qualquer falha — atrás de `AI_EXTRATOR=1`, desligada por padrão.
O contrato desta decisão não mudou; ganhou uma segunda implementação plugável (ver decisão 19).

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

### 19. Camada de IA local: opt-in, desligável e com fallback determinístico em tudo

**Origem:** plano de arquitetura (PLANO-IMPLEMENTACAO-RAG-COPILOT-SROI-LORA.md) e análise
ANALISE-SLM-E-SROI.md, implementados na revisão de 25/08/2026 (plano auditado em
`revisao/04-PLANO-COMPLEMENTACAO-IA.md`).

Um SLM local (Qwen3 4B Instruct 2507, GGUF Q4_K_M, Apache-2.0) roda via `llama.cpp` em
`127.0.0.1:8081`, atrás de `AI_ENABLED` — **desligada por padrão**. Três usos, três coleiras:

- **Copilot reflexivo (Modo B, `#/copilot`)** — os 7 blocos do contrato saem por `json_schema`
  (gramática, não boa vontade); ordem obrigatória do pipeline: filtro de perímetro sobre o texto
  ORIGINAL → recusas determinísticas → pseudonimização → RAG → modelo → verificador de citações.
  Memória só de sessão (RAM, TTL), botão "Apagar sessão", fila de 2 com teto.
- **Modo A opcional (`AI_EXTRATOR=1`)** — mesma validação, mesmo fallback (decisão 13).
- **Explicação do SROI (`/api/sroi/explicar`)** — prompt fechado, saída sob o revisor de
  sobre-alegação; a diretoria continua sem acesso ao chat (decisão 16).

O que a camada NUNCA faz: pontuar criança, escolher coeficiente, gravar sem confirmação, receber
nome (pseudonimização com limite residual DECLARADO na UI), escutar na rede. Ligar em operação
real com educadoras é condicionado ao go da PoC (`docs/POC-COPILOT.md`). Detalhes: `ai/README.md`.

**Herança declarada:** os papéis da camada de IA vêm do mesmo cookie sem assinatura da decisão 8 —
sem autenticação real, o gate de papel é declarativo. Aceitável só com dado sintético; com dado
real, a dívida de autenticação bloqueia também esta camada.

---

### 20. RAG em banco separado; FTS5 proibido no banco principal

O corpus do copilot vive em `data/rag/corpus.db` (SQLite + FTS5), **reconstruível do zero** por
`node src/rag/ingest.mjs` a partir do texto canônico versionado + `data/rag/manifest.json` — o
binário não entra no git; o CI reconstrói. Motivo duro: a migração por assinatura de DDL
(decisão 14) derruba e recria o banco principal, e um drop ingênuo não sobrevive às shadow tables
do FTS5 — portanto **nenhuma virtual table entra em `data/percurso.db`**. O manifest é JSON
(não YAML) porque o runtime não ganha parser novo (decisão 1). Política de admissão de fontes:
`docs/GOVERNANCA-FONTES-RAG.md` — sem licença verificável, não entra; dado infantil, nunca.

---

### 21. SROI exploratório: o número nasce de fórmula versionada, o modelo só explica

`src/sroi/calculator.js` implementa a equação da análise (§5.8) com 3 cenários e faixa
obrigatória; dupla contagem (envelope Insper XOR componentes) é 422; benchmark não vira
multiplicador; toda proxy sai com fonte, ano-base e ressalva (`data/sroi/premissas.json`). O
eixo narrativo é a prevenção de violência — decisão do Instituto, registrada como relevância
estratégica, não como prova causal. Método e limites: `docs/SROI-METODOLOGIA.md`.

---

### 22. Escopo de turma nas rotas herdadas de leitura individual

O item 1.2 do horizonte 1 foi fechado (25/08/2026): ficha, lista, observação-leitura e alertas
agora aplicam "educador DA criança + coordenação" (`exigeAcessoCrianca`/filtros por turma em
`src/api.js`). **Limitação declarada:** a educadora substituta não tem representação no modelo —
quando precisar cobrir uma turma, o caminho é a coordenação (que enxerga tudo), até a coordenação
decidir se substituição vira vínculo no modelo.

---

### 23. Políticas propostas — pendentes de validação da coordenação

Duas lacunas da revisão de 22/08 (A-06 e A-11) ganham **proposta default documentada**, marcada
como pendente — o MVP não inventa decisão da organização:

- **Dado histórico após revogação de consentimento (A-06):** congelar — o histórico categórico já
  gravado deixa de entrar em qualquer agregado novo e some das telas; descarte definitivo (apagar
  vs. anonimizar) é decisão da coordenação antes de dado real. Hoje a revogação já bloqueia novas
  observações; o congelamento dos agregados é a proposta a validar.
- **Janela mínima de convívio (A-11):** contar por dupla educadora-criança (mais conservador — o
  instrumento exige convívio de QUEM aplica), e não por instituição. O código atual conta
  presenças da criança na instituição; a mudança fica condicionada à validação da coordenação.

---

### 24. PWA network-first, com a limitação de contexto seguro declarada

`public/manifest.json` + `public/sw.js` com **network-first para tudo** (cache só como fallback
offline) — cache-first serviria app velho a cada atualização e foi descartado. Instalação e
offline funcionam onde há *secure context*: `localhost` e o deploy HTTPS (Render). Pelo IP da
rede local (`http://IP:3000`) o navegador não registra service worker: a página funciona normal,
sem offline/instalação — limitação técnica declarada no README, sem promessa falsa. Caminho
futuro (mkcert/túnel) registrado e não adotado.

---

### 25. Túnel HTTPS temporário é ferramenta de DEMONSTRAÇÃO, não de operação

**Origem:** demanda de mostrar o Percurso no celular (como o celular de uma professora) e
compartilhar com o grupo — voz e instalação de PWA exigem HTTPS, que a rede local não dá.

`ai/scripts/demo-celular.sh` sobe modelo + app + `cloudflared` *quick tunnel* e imprime QR/URL
`trycloudflare.com`. Três decisões deliberadas: (a) o **bind continua `127.0.0.1`** — só o túnel
alcança o processo, nada abre na rede local; (b) a URL é **efêmera** e morre com o script
(Ctrl+C); (c) o script imprime o aviso de que a URL é pública e sem senha — tolerável apenas com
dados 100% sintéticos (mesma lógica do deploy-vitrine, decisão 12). Operação real fora da rede
continua exigindo o caminho do Horizonte 2 (TLS gerenciado + autenticação). A v3 mobile também
trouxe o início automático no login (`ai/scripts/instalar-inicio-automatico.sh`, LaunchAgent com
KeepAlive) — autonomia de operação para uma organização sem TI — e o
`docs/MANUAL-DE-INSTALACAO.md` para instalar em qualquer máquina.

---

### 26. Passo — assistente-parceiro que responde SÓ sobre o produto e fala menos do que mostra

**Origem:** demanda de um assistente presente em toda a navegação, que tira dúvidas sobre o
artefato, ajuda na chamada e nas tarefas, e fala — usando o mesmo Qwen local open source.

O **Passo** (`src/assistente.js` + bloco do cliente em `public/app.js`) é um guia do produto,
não um chat aberto. As decisões que o mantêm dentro da doutrina:

- **Fonte única = GUIA versionado no código** (telas, tarefas, limites por papel). O modelo
  refina a linguagem por cima do guia; qualquer falha (fora do ar, timeout, fila cheia, saída
  ruim) cai na resposta determinística do guia — o Passo **nunca responde 503**.
- **Mesmo funil de proteção do copilot, na mesma ordem**: `filtrarPerimetro` no texto original →
  recusas → pseudonimização com roster completo. Diretoria + nome de criança = recusa
  (decisão 16). Pergunta pedagógico-reflexiva não é dele: redireciona ao Refletir (copilot);
  pergunta fora do produto ganha o limite declarado ("eu só sei do Percurso"), sem empurrar
  para o copilot.
- **A fala em voz alta é MAIS restrita que a tela** (`limparFala`): pseudônimo, nome real ou
  fala longa → o Passo simplesmente não fala aquela resposta. Encaminhamento, recusa e
  redirecionamento nunca têm fala. O som é **desligado por padrão** (toggle "voz" por pessoa,
  em `localStorage`) — um aparelho numa sala com crianças não fala sozinho.
- **Ação = OFERTA**: o modelo só escolhe um id do catálogo do papel (enum na gramática +
  `validarAcao` no servidor); o cliente mostra um botão "Ir para…" — o Passo nunca navega
  sozinho, coerente com "IA nunca grava, pessoa confirma".
- **Sessão só em memória com TTL** (`src/sessoes.js`, factory compartilhada com o copilot),
  apagada no sair; pergunta e resposta nunca tocam o banco.
- **Entrada por voz** reusa o `blocoDitado` (transcrição no aparelho, nada de áudio no
  servidor); a saída de voz usa `speechSynthesis` do navegador — zero dependência nova.
- **Kill switch independente**: `AI_ASSISTENTE=0` desliga só o modelo do Passo (o copilot
  continua); o Passo segue respondendo pelo guia. Herda o gate da PoC (decisão 19).

---

## Dívidas técnicas conhecidas

| Dívida | Impacto | Quando pagar |
|---|---|---|
| Sem autenticação | Bloqueante para dado real | Antes do primeiro dado real |
| Sem HTTPS | Bloqueante em rede não confiável | Junto com a autenticação |
| Sem log de auditoria de acesso individual | Exigível sob LGPD | Antes do primeiro dado real |
| Filtro de perímetro por termo, não por sentido | Deixa passar paráfrase | Depende de avaliação com a psicóloga |
| Sem exportação (CSV/PDF) da síntese | Copiar e colar resolve hoje | Quando o relatório anual for montado |
| Sem paginação na lista de crianças (limite 60, agora com aviso de corte) | Irrelevante em 106 crianças | Se a operação dobrar |
| PoC do copilot com pedagogos não realizada | Bloqueia `AI_ENABLED=1` em operação real | Antes de ligar a IA para educadoras (protocolo pronto em `POC-COPILOT.md`) |
| 20 consultas do rag-test de autoria interna | Gate C não congelado | Validação por pedagogo (registrada em `POC-COPILOT.md`) |
| Anonimização não cobre apelido/paráfrase | Risco residual declarado na UI | Reavaliar com a PoC; orientação de uso é a mitigação |
| Educadora substituta sem representação no modelo | Escopo de turma barra acesso legítimo temporário | Decisão da coordenação (decisão 22) |
| Políticas A-06/A-11 propostas, não validadas | Pendência de governança | Validação da coordenação (decisão 23) |
