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
para onde a revelação sensível é muito mais provável. **Desde 04/09/2026 ele roda também nos dois
campos livres de relato** (decisão 40), e ali ele **bloqueia**, não avisa: o motivo está escrito na
própria decisão 40. Quando ele encontra algo, a resposta de
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

Está isolado em `PARAMS`, junto com `AUSENCIAS_ALERTA` (2 — ver decisão 18) e `ENCONTROS_LAPSO` (2 — ver decisão 37), para que a
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

PRNG com semente fixa (`mulberry32(20261009)`). O mesmo banco toda vez, o que torna as 443
asserções de fluxo e os 179 testes unitários reproduzíveis e permite que a demonstração seja idêntica em qualquer máquina. As datas são relativas
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
| Transcrição do áudio | `SpeechRecognition` do navegador, pedindo `processLocally` quando ele tem reconhecimento no aparelho. Onde não tem, o áudio vai ao serviço do fornecedor do navegador — **nunca ao servidor do Percurso** | `public/app.js` (`ondeTranscreve`, `voz-toggle`) |
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
correção pós-extração está instrumentada exatamente para medir isso (`#/painel?aba=scores`): se ela subir
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
ficha, lista de crianças e observação respondem **443** para ele (`semAcessoIndividual` em
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

- **Copilot reflexivo (Modo B, `#/pensar`)** — os 7 blocos do contrato saem por `json_schema`
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

### 36. HTTPS local, opt-in, com certificado desta máquina (03/09/2026)

**Por que existe.** `getUserMedia` — a captura de áudio — só roda em **contexto seguro**.
`localhost` conta; **o IP da LAN não**. E o IP da LAN é exatamente como o celular da educadora
alcança o servidor do Instituto. Sem HTTPS, as portas de áudio da F1 (narrar, importar, gravar)
simplesmente não existem no aparelho dela. Isto é **pré-requisito da F1**, não refinamento — e por
isso subiu na ordem do plano.

**Como.** `node scripts/gerar-certificado.mjs` usa o `openssl` **do sistema** (mesmo padrão do
`llama.cpp` em `ai/scripts/`: nada entra por npm, a decisão 1 continua de pé) e escreve
`certs/`, que é gitignorado. O SAN inclui `localhost`, o nome da máquina, `127.0.0.1` **e os IPs
de LAN detectados** — faltar o IP da LAN é o erro clássico, e leva à conclusão errada de que
"HTTPS não funciona".

**Opt-in de propósito.** Só sobe em HTTPS com `PERCURSO_HTTPS=1`. O CI e a bateria smoke batem em
`http://localhost:3000`, e um certificado esquecido no disco não pode mudar o comportamento padrão
do servidor sem alguém pedir. Pedir HTTPS implica bind em `0.0.0.0`: gerar certificado e continuar
preso a `127.0.0.1` seria gerar certificado para ninguém.

**O que isto NÃO resolve, e está declarado.** O certificado é autoassinado: na primeira visita o
aparelho avisa que a conexão "não é privada". Aceitar uma vez basta, mas **é um passo humano**, e no
iOS pode exigir instalar e confiar no perfil. Certificado de autoridade real depende de domínio, que
o Instituto não tem.

**O que foi verificado, e o que não foi.** Verificado: handshake TLS válido, resposta 200 em
`https://localhost:3000` e no IP da LAN, e o SAN cobrindo ambos. **Não verificado:** que um celular
real aceite o certificado e libere `getUserMedia` — isso exige o aparelho, e entra na mesma
pendência dos notebooks doados, que nunca foram avaliados.

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

### 26. Aurora — assistente-parceiro que responde SÓ sobre o produto e fala menos do que mostra

**Origem:** demanda de um assistente presente em toda a navegação, que tira dúvidas sobre o
artefato, ajuda na chamada e nas tarefas, e fala — usando o mesmo Qwen local open source.

O **Aurora** (`src/assistente.js` + bloco do cliente em `public/app.js`) é um guia do produto,
não um chat aberto. As decisões que o mantêm dentro da doutrina:

- **Fonte única = GUIA versionado no código** (telas, tarefas, limites por papel). O modelo
  refina a linguagem por cima do guia; qualquer falha (fora do ar, timeout, fila cheia, saída
  ruim) cai na resposta determinística do guia — a Aurora **nunca responde 503**.
- **Mesmo funil de proteção do copilot, na mesma ordem**: `filtrarPerimetro` no texto original →
  recusas → pseudonimização com roster completo. Diretoria + nome de criança = recusa
  (decisão 16). Pergunta pedagógico-reflexiva não é dele: redireciona ao Refletir (copilot);
  pergunta fora do produto ganha o limite declarado ("eu só sei do Percurso"), sem empurrar
  para o copilot.
- **A fala em voz alta é MAIS restrita que a tela** (`limparFala`): pseudônimo, nome real ou
  fala longa → a Aurora simplesmente não fala aquela resposta. Encaminhamento, recusa e
  redirecionamento nunca têm fala. O som é **desligado por padrão** (toggle "voz" por pessoa,
  em `localStorage`) — um aparelho numa sala com crianças não fala sozinho.
- **Ação = OFERTA**: o modelo só escolhe um id do catálogo do papel (enum na gramática +
  `validarAcao` no servidor); o cliente mostra um botão "Ir para…" — a Aurora nunca navega
  sozinho, coerente com "IA nunca grava, pessoa confirma".
- **Sessão só em memória com TTL** (`src/sessoes.js`, factory compartilhada com o copilot),
  apagada no sair; pergunta e resposta nunca tocam o banco.
- **Entrada por voz** reusa o `blocoDitado` (transcrição no aparelho, nada de áudio no
  servidor); a saída de voz usa `speechSynthesis` do navegador — zero dependência nova.
- **Kill switch independente**: `AI_ASSISTENTE=0` desliga só o modelo da Aurora (o copilot
  continua); a Aurora segue respondendo pelo guia. Herda o gate da PoC (decisão 19).

---

### 27. A Aurora proativo: dois canais, contadores em vez de fichas, e o modelo onde ele não pode mentir

**Origem:** a Aurora era reativo — três chips escritos à mão por tela, iguais para todo mundo,
independentemente do que estivesse acontecendo. A demanda: sugerir perguntas, ações, pontos de
aprimoramento e dúvidas a cada papel, melhorar com o uso, e ter o Qwen como orquestrador.

**A troca de doutrina, e por que ela foi feita em vez de contornada.** A doutrina 5 dizia *"o
Aurora NÃO enxerga dado nenhum"*, e a UI repetia isso à pessoa. Ancorar sugestão em estado real
tornaria essa frase falsa. Num produto cuja história inteira de privacidade repousa em **limites
declarados serem verdadeiros**, um limite que virou mentira é pior do que a mudança. Então a
frase mudou, nos nove lugares onde aparecia, para o que passou a ser verdade:

- **Canal CONVERSA** (`assistente()`) continua **cego**: nada do banco entra no prompt de uma
  resposta a pergunta.
- **Canal SUGESTÃO** (`src/aurora/`) enxerga um **envelope de contadores** do próprio dia da
  pessoa — quantos, quantas datas, quantos dias. **Conta quantos, nunca quem.** Nunca um nome,
  nunca uma ficha, nunca um nível, nunca um escore individual. `congelar()` roda em **produção**
  e recusa qualquer valor fora do contrato.
- Nunca o **nome da turma**: `turma.educador_id` é 1:1, então "a turma X está sem registro" É
  "a educadora Y não registrou", com outro rótulo.

**O que impede a sugestão de virar cobrança.** Não é o tom de cada frase — é a composição.
Teto de **UMA pendência por painel**: cada item pode ser gentil e o somatório ser uma lista de
dívida diária. Mais: a sugestão é suprimida na tela que já mostra o mesmo fato; nenhuma entrada
de educadora nasce de cobertura, tempo de registro ou taxa de correção (as métricas que o
próprio produto declara medirem o sistema, não a professora); e existe uma classe **alívio** nos
três papéis, para a Aurora poder dizer "está tudo em ordem".

**A memória nasce desligada.** É a única coisa do produto que grava algo sobre a **pessoa** —
não podia ser a exceção que nasce ligada num produto onde tudo é opt-in. Um convite de um toque
na primeira abertura, com "Agora não" ao lado. Vive em `data/aurora/uso.db`, banco **derivado**
(mesmo motivo do corpus do RAG, decisão 20: `src/db.js` derruba todas as tabelas quando a
assinatura do DDL muda). Vocabulário **fechado por código**: um nome de criança não tem por onde
virar chave. Desligar **apaga**. "Hoje não" em item núcleo cala só até o fim do dia — e a tela
diz isso, porque o produto não mente sobre o que o botão faz.

**O Qwen3-4B como orquestrador, com poder real e limite estrutural.** Ele faz dois trabalhos:
(a) responde, pelo portão agregado, a pergunta de coordenação/diretoria com número vindo de SQL
— antes, 2 das 6 perguntas eram recusadas e 4 devolviam texto de ajuda genérico; (b) reordena os
candidatos e reescreve rótulos. O que ele **não pode é estrutural, não verificado**: o `rotulo`
é livre de dígito por construção e é o único campo que ele reescreve, enquanto o `texto` — que
carrega as contagens — nunca vai ao prompt nem volta dele. Logo, **nenhum número exibido pode ter
vindo de modelo**. O piso institucional e o teto de pendência rodam **depois** dele.
`AI_ASSISTENTE=0` e `AURORA_PAINEL=0` desligam em cascata; sem modelo, o produto é idêntico.

**Trilha:** plano em `docs/revisao/09-PLANO-PASSO-PROATIVO.md` (painel de 4 propostas × 3 juízes),
revisão do plano com 20 achados confirmados, revisão da implementação em `10-REVISAO-PASSO-PROATIVO.md`.

---

### 28. O Qwen redigindo a síntese e o relatório: a infraestrutura ficou, o 4B não passou

**Origem:** pedido explícito de explorar o modelo redigindo a síntese do ciclo e o rascunho do
relatório do doador, ambos com human-in-the-loop (que já existiam: a coordenação aprova a
síntese, a diretoria publica o relatório).

**A cadeia construída** (`src/redacao-modelo.js`). Os números continuam vindo do SQL; o modelo
recebe o texto determinístico e o REESCREVE com outro tom. Cada reescrita atravessa, em ordem:

1. **`soUsaNumerosDe`** — pode omitir número, nunca acrescentar, trocar ou repetir. Repetir é
   como se reatribui um número a outro conceito, por isso a checagem é por contagem.
2. **`semAtribuicaoACrianca`** — barra "as crianças têm dificuldade em…", "mostra que as
   crianças…". A rubrica mede comportamento observado; ela não diagnostica criança.
3. **`preservaObrigatorias`**, e ela é **simétrica**: a declaração protegida tem que estar no
   texto reescrito se — e somente se — estiver no original. O lado "não inventa" é o mais
   importante: nada impedia o modelo de acrescentar "há mais de um ano" a uma capa em que esse
   recorte foi **suprimido** por ter menos de cinco crianças.
4. **`revisarSobreAlegacao`** — o revisor de sempre.
5. Qualquer reprovação cai no **template determinístico**, por bloco. O documento nunca fica
   pior do que era.
6. A tela mostra as **duas versões** lado a lado, e a publicação continua sendo ato humano.

**O resultado medido, e ele é negativo.** Com todos os portões valendo, o Qwen3-4B teve
**0 aceitações em 16 chamadas**: 6 reprovações por uso de número, 10 por apagar ou inventar
declaração obrigatória. Antes dos portões, o mesmo modelo produziu: *"67 crianças foram
observadas em 106 atividades"* (106 é o número de crianças ativas), *"78% delas vieram aos
encontros"* (78% é a taxa de presença, não a fração de crianças) e *"2,13 de 4, o que mostra
que muitas crianças ainda têm dificuldade em mostrar como se sentem"* — todos com números
verdadeiros e frases falsas.

**A conclusão honesta:** neste porte de modelo, prosa segura e prosa útil não coexistem nestes
dois documentos. `AI_REDATOR` fica **desligado por padrão** — ligar hoje só adiciona latência
para cair no mesmo template. A infraestrutura e os testes ficam prontos, e a reavaliação é uma
variável de ambiente.

**Adendo de 25/08/2026 — subir o porte do modelo está fora.** A conclusão original apontava um
Qwen 14B/30B como próximo passo, porque a máquina de desenvolvimento comporta. Está descartado
por decisão de produto: a arquitetura do Percurso exige rodar **no notebook comum de uma
organização social**, e um modelo dimensionado para a máquina de desenvolvimento não é o produto
— é uma demonstração que o Instituto não conseguiria operar. O porte é restrição de desenho, não
variável livre. O caminho de ganho aqui é **modelo melhor no mesmo porte**, ou portões e prompt
melhores; o template determinístico segue sendo a resposta correta, não um degrau provisório.

**O que isto ensinou, e vale além deste caso:** fidelidade numérica não é fidelidade semântica.
Um verificador que confere cada número contra o banco aprova, sem hesitar, um documento em que
todo número está certo e todas as frases estão erradas.

### 29. Cadastro de pessoas: quem cadastra é a coordenação, e a criança nasce bloqueada

**Origem:** até a sessão de 25/08/2026 toda pessoa do Percurso vinha da seed (a equipe e as 132
crianças) ou da ingestão de planilha (só crianças, e só em lote). Não havia como incluir uma
professora nova nem uma criança nova pela interface — o item 2.8 do horizonte 2 de
`ARQUITETURA.md` previa isso e ele foi aberto agora, na porta manual: `#/pessoas`.

**Três decisões, e nenhuma delas é o caminho mais curto.**

**1 · A porta é de coordenação, não da professora.** É o mesmo motivo de `/api/importar` ser de
coordenação: papel e matrícula são exatamente o que decide, no resto do produto, quem enxerga a
ficha de quem (escopo de turma, decisão 22; diretoria sem individual, decisão 16). Deixar o
cadastro na mão de quem registra a chamada seria pôr o controle de acesso na mão de quem ele
limita. A diretoria também não cadastra criança — 443, pela mesma regra de sempre.

**2 · O consentimento nasce PENDENTE, e a criança entra bloqueada para observação.** A criança
entra pela presença (legítimo interesse, LGPD Art. 7º IX) e não fica observável no mesmo gesto:
quem libera a rubrica socioemocional é o responsável, num segundo ato, em `#/consentimentos`.
O detalhe que quase passou: `painelConsentimentos` faz JOIN **interno** com `consentimento`, e
uma criança sem linha nenhuma ficaria bloqueada de fato e **invisível na única tela que a
desbloqueia**. Por isso as duas linhas `pendente` são gravadas na mesma transação da matrícula.
`conteudo_clinico` também exige consentimento e **não** ganha linha: ele está declarado fora do
sistema por construção, e abrir uma pendência sugeriria que um dia vai ser coletado.

**3 · Homônimo é recusado com 409, não gravado.** O erro caro deste banco não é faltar criança —
é a MESMA criança virar duas, porque aí a série de presença se parte e nenhum número do relatório
fecha. A chave é a mesma da ingestão (nome completo + nascimento, R2-05 de `03-AUDITORIA-V2`) e o
erro devolve o `id` do registro que já existe, para a tela poder oferecer a ficha em vez de um
beco. Trocar a professora de uma turma que já tem dona exige `confirmar_troca`: a troca **move o
escopo de leitura** das crianças daquela turma de uma pessoa para outra, e isso é decisão, não
efeito colateral de um `select` mal tocado.

**Um defeito latente pago de passagem.** `src/ingestao.js` gerava o código da criança com
`COUNT(*) + 1`. `crianca.codigo` é UNIQUE: bastava uma criança sair do banco para o contador
reemitir um código já usado e derrubar a importação inteira no INSERT. O gerador virou
`proximoCodigoCrianca()` (MAX do sufixo), único para os dois caminhos — se cada porta tivesse o
seu, elas colidiriam entre si.

**O que fica fora, e é declarado:** o cadastro só CRIA. Desligar pessoa e encerrar matrícula
continuam fora do MVP — o `UPDATE` existe no banco, o gesto não existe no produto.

---

### 30. Ninguém é apagado: quem sai do pipeline vai para o arquivo

**Origem:** decisão do usuário em 25/08/2026, sobre a lacuna declarada na decisão 29 (o cadastro
só criava). A formulação foi literal: *"nunca se exclui pessoa; se uma pessoa sai do pipeline ela
deve ir para o arquivo"*.

**Não existe `DELETE` de pessoa neste produto — e a ausência é a decisão**, não um esquecimento.
Um teste de fumaça verifica que `DELETE /api/equipe` e `DELETE /api/criancas` respondem 404, para
que a ausência não possa ser reintroduzida por engano.

**Três razões, e nenhuma é sentimental.**

1. **O registro fica em pé e assinado.** `observacao.educador_id` e `encontro.registrado_por` são
   chaves estrangeiras. Apagar a professora arrastaria (ou orfanaria) tudo que ela registrou — e o
   relatório do doador é construído em cima desses registros. Quem escreveu continua sendo quem
   escreveu; o arquivo mostra quantas chamadas e observações a pessoa deixou, e é justamente esse
   número o argumento contra o botão de apagar.
2. **A criança que sai É o dado.** Safra, permanência e evasão (F6) medem exatamente a saída. Uma
   criança apagada não evade: ela nunca existiu, e a curva de permanência mentiria **para cima**.
3. **A criança arquivada continua protegida.** `nomesParaAnonimizar` não filtra por `ativo`, de
   propósito (SEGURANCA-IA-02): evasão é justamente pauta de conversa, e o nome de quem saiu não
   pode chegar ao modelo. Arquivar não pode virar uma porta lateral para isso.

**A mecânica.** A criança já tinha metade dela desde a v1 (`crianca.ativo` mais `matricula.saida`,
que a seed usa nas 26 que saíram) — faltava o **gesto**. A equipe não tinha nem a coluna:
`educador.arquivado_em` é nova (data, não booleano: para pessoa da equipe *quando* saiu é a
pergunta que se faz depois). A mudança de DDL recria o banco pela assinatura, como a decisão 14
prevê.

**O ponto de aplicação é `usuarioDa`, não o login.** O cookie de sessão não é assinado e vale 24 h
(dívida nº 1). Se a checagem de arquivada estivesse só em `POST /api/sessao`, arquivar alguém não
faria efeito nenhum sobre quem já estava dentro — por um dia inteiro. A checagem está na resolução
da sessão, que toda rota atravessa: a sessão aberta morre no ato.

**Duas recusas para o sistema não se trancar por fora.** Ninguém arquiva a si mesma (a pessoa
perderia a sessão no mesmo ato, sem ninguém para desfazer), e a **última coordenação na ativa não
sai** — sem ela não há quem cadastre a substituta nem quem traga alguém de volta. E turma órfã não
é detalhe: `exigeAcessoTurma` lê `turma.educador_id`, então arquivar a professora ou passa as
turmas a uma sucessora escolhida na hora, ou as libera e **diz quais ficaram sem professora**.

**Voltar, para a criança, é matrícula NOVA.** Reabrir a matrícula antiga apagaria a saída, e a
saída é o dado. O modelo deste banco já dizia isso desde a v1: criança é entidade, matrícula é
relação. **O consentimento volta a `pendente`** — a base legal caducou com a saída, e retomar o
processamento de dado sensível em silêncio, depois de um intervalo, é o pior dos dois erros. O
preço está declarado: este banco não tem histórico de consentimento, então quem consentiu antes se
perde no ato.

**Dois defeitos que a tela de arquivo expôs** — ambos invisíveis enquanto nenhuma tela mostrava
data de saída:

- **A seed produzia matrícula ENCERRADA com saída no futuro.** `entrada + duração` passava de hoje
  para parte das 26 crianças que saíram. Na tela: *"saiu em 29/10/2026"* num 25/08/2026. A duração
  passou a ser limitada ao que já passou, e há teste unitário fixando a regra.
- **A curva de permanência podia SUBIR.** `safras()` recalculava os elegíveis a cada marco, então
  os quatro pontos vinham de **populações diferentes** — e a tela os liga com uma `polyline`, como
  se fossem uma curva só. Medido depois da correção da seed: 80% aos 9 meses e **82% aos 12**,
  porque os 28 que já tiveram tempo de chegar aos 12 meses eram uma turma melhor que os 49 que
  chegaram aos 9. O denominador passou a ser **fixo por safra** (quem já teve tempo de alcançar o
  marco mais profundo), e a monotonia vale por construção: quem ficou 12 meses ficou 9. O preço é
  declarado na tela — a safra recente perde os matriculados novos do ponto de 3 meses.

**O que isto ensinou:** dado que nenhuma tela mostra não é dado verificado. Os dois defeitos
estavam no banco e nos testes há semanas; o que os encontrou não foi leitura de código, foi
**pintar a data numa tela e olhar**.

---

### 31. A psicóloga é usuária do indicador de programa; a Vivência entra fora da rubrica e dentro do registro de turma

**Origem:** visita de campo de 29/08/2026 (`jornada-usuario/CAMPO-versus-REPOSITORIO.md`, achados
1 e 2; plano em `revisao/11-PLANO-POS-VISITA.md`). Cinco documentos diziam *"a psicóloga não é
usuária"*. O campo mostrou o contrário: é ela quem nomeia o registro como a dor central e quem
escreve o único registro escrito da operação — o relatório do conselho profissional, por
procedimento, não individualizado, sem nome. Na demonstração foi preciso improvisar um perfil
dela, porque o app assumia professora.

**Decisão.** Papel `profissional` (rótulo "Psicóloga"), com escopo de turma igual ao da
professora. A **Vivência terapêutica** ganha duas turmas de sábado, matrícula, encontro, presença
e folha. `programa.no_escopo` passa a significar exatamente *"entra na rubrica por ciclo"*: a
Vivência fica **fora da rubrica** (`GET /api/ciclo/agenda` responde 422; o `#/hoje` dela não tem
agenda) e **dentro do registro de turma** — procedimento e objetivo em lista fechada, o
**check-in de grupo** (ajudaram sem pedir, participaram do começo ao fim, conflitos e quantos
resolvidos conversando, não observados) e o **relato do procedimento** (`src/relato.js`), gerado
dos campos fechados no padrão do conselho e válido só depois do OK dela (`relato_liberado_por/em`;
editar a folha derruba a liberação).

**O que a distinção do bloco 6 permite.** Registro clínico (titular: psicóloga; individual,
narrativo) continua fora por construção — `conteudo_clinico` segue com acesso "ninguém". O que
entra é *indicador de programa*: contagens de turma e listas fechadas. Não há campo livre em
nenhuma tela nova, então não há onde escrever o nome de uma criança.

**O filtro de perímetro ganhou contexto, e este é o ponto mais perigoso da decisão.** Sem
contexto, a fala *"na vivência terapêutica de hoje o grupo fez a roda"* era barrada como "saúde
mental / diagnóstico" — o sistema recusaria seu usuário mais provável. Com `contexto: 'vivencia'`,
uma **lista fechada de sintagmas do procedimento** (`NEUTRALIZAVEIS_VIVENCIA`) é trocada por
"atividade" antes das listas; tudo o que é sobre criança (diagnóstico, laudo, abuso, estado
interno de criança nomeada) continua barrado. Os testes exercitam pares: a mesma palavra passa
como procedimento e é barrada como conteúdo sobre criança.

**Os invariantes não se movem.** `inventario()` conta os 120/106/14 sobre os programas do dossiê e
devolve a Vivência à parte (`foraDaRubrica`: 24 matrículas de crianças que já estão no
Laboratório). A seed usa um **segundo gerador** só para a Vivência: consumir o principal deslocava
a sequência de tudo o que vem depois (38% de descarte virava 19%; 10 alertas viravam 7).

**O custo, declarado (bloco 5).** O tempo dela em sistema é tempo de atendimento: ~40 s de fala
mais a confirmação por encontro, medidos como a folha (`duracao_segundos`, taxa de correção). O
modelo de relatório que ela usa foi prometido e ainda não chegou — o template é provisório
(`VERSAO_TEMPLATE`).

---

### 32. Parecer profissional-a-profissional: o único dado individual que sai — por código, sob consentimento, liberado

**Origem:** campo (achado 6): a assistente social do projeto parceiro pergunta *"como ele tá"* e é
respondida de memória; *"seria entre profissionais, que é mais rico ainda"*. A mentoria de
negócios de 28/08 pediu cautela ao cruzar dados da mesma criança — e o parecer cruza presença,
rubrica e alerta.

**Decisão.** Tabela `parecer` e campo de governança `parecer_profissional` (consentimento
específico do responsável, Art. 14, nascendo **pendente** para toda criança — como a rubrica; a
seed não consome o gerador para ele). `src/parecer.js` gera texto **determinístico** só com
indicador de programa: código (nunca nome), presença e faixa da régua, evolução por indicador em
piorou/manteve/evoluiu entre os dois últimos ciclos, e **o fato** de haver acompanhamento — nunca
o detalhe do alerta, nunca conteúdo clínico, nunca campo livre. Quatro portas, nesta ordem:
consentimento ativo, autoria (quem responde pela criança ou a coordenação), revisor de
sobre-alegação, **liberação registrada** (quem, quando, para quem) — e o consentimento é
verificado de novo na liberação, não só na geração. A diretoria não chega a nenhuma rota
(decisão 16). O envio continua humano, pelo canal que a equipe já usa; o Percurso guarda o
registro de que saiu.

---

### 33. A régua de 75% e o recado da turma: o produto absorve a gestão que já existe

> O que a automação do envio permitiria, e o que ela veda, está levantado com fontes primárias em
> [`PESQUISA-WHATSAPP.md`](PESQUISA-WHATSAPP.md) — por isso o recado é **gerado** aqui e **enviado**
> pela pessoa, no grupo que já existe.

**Origem:** campo (achados 6 e 7 do consolidado): planilha com % por criança, 75% para permanecer
e para o grupo de benefícios, faixa amarela de atenção, e a devolutiva semanal aos responsáveis
por WhatsApp, manual — *"se você tivesse um mecanismo de enviar isso automaticamente para o pai,
seria ótimo"*.

**Decisão.** `PARAMS.PRESENCA_MINIMA_PCT = 75`, `PRESENCA_ATENCAO_PCT = 80`,
`REGUA_MINIMO_ENCONTROS = 4`. `reguaDaTurma` devolve a criança com faixa (`abaixo`, `atencao`,
`ok`, `sem_base`) para quem responde pela turma e para a coordenação — é a prática da casa, a
conversa é com a família — e `reguaDoInstituto` devolve **só contagens** por turma para o painel
(a diretoria vê contagens, nunca criança). A linguagem é de protocolo ("abaixo da régua do
Instituto"), não de erro.

**O recado da turma** (`src/recado.js`) reabre a borda "responsável fora do MVP" **por evidência**:
o canal já existe e é manual. O Percurso gera o texto **da turma** (atividade ou procedimento,
presença em número, presença do mês, próximo encontro) e um link `wa.me` sem número — quem
envia é a pessoa, no grupo que já existe; o texto não persiste (governança `recado_da_turma`,
legítimo interesse). A régua individual **não** entra no recado: é para dentro.

**Devolução por encontro** (achado 9: *"não dá, não dá"*): `devolucaoDoEncontro` compara o
check-in de hoje com as últimas quatro folhas da turma e **cala quando não há três anteriores** —
falhar em branco. O clímax do fecho de ciclo continua existindo; deixou de ser a única devolução.

---

### 34. A rubrica fala a língua da planilha do Instituto — e o mapeamento é declarado

**Origem:** a planilha socioemocional que o Instituto tem em mãos (seis indicadores, escala 0–2,
inicial × final, evolução automática, leitura ≥70/≥50%) e o método 0/1/2 da outra organização
(*piorou, manteve, evoluiu*), que a psicóloga conhece e no qual confia.

**Decisão.** As seis dimensões passam a ser os seis indicadores: Autocontrole (ex-Cooperação e
combinados), Convivência (ex-Interação com colegas), Participação (ex-Autonomia na tarefa),
Expressão emocional, **Autoestima (nova)**, Resiliência (ex-Persistência). As âncoras continuam em
4 níveis observáveis — mais finas que uma escala de frequência — e foram reescritas para os nomes
novos; o corpus do RAG acompanha (hash novo no manifest). O mapeamento **1→0, 2→1, 3→1, 4→2**
vive num único lugar (`src/planilha.js`, `NIVEL_PARA_PLANILHA`), sai na legenda da exportação e é
declarado **provisório até o aval da psicóloga** — a escolha de colapsar 2 e 3 é a parte
arbitrária, e por isso está nomeada. `GET /api/planilha/resumo` replica a aba *Indicadores* com
supressão de célula pequena; `GET /api/exportar/planilha` devolve a aba *Avaliações* em CSV
(UTF-8 com BOM, `;`) **por código** — o cadastro que liga código a nome fica com a coordenação.
O agregado interno continua na escala 1–4.

**A leitura dela chegou à tela em 04/09/2026 (F5).** O produto calculava `evolucao012` desde sempre
— *piorou · manteve · evoluiu*, as palavras dela — e ela **nunca via**: o delta só chegava ao
parecer. Agora está na ficha de cada criança, indicador por indicador, **ao lado** da leitura do
Percurso (níveis 1–4). As duas juntas de propósito: é vendo **onde divergem** que ela pode avalizar
ou recusar o mapeamento. O caso aparece na primeira ficha aberta — Autoestima 2→3 mostra
*"manteve *"* enquanto o nível diz *avançou*, porque 2 e 3 mapeiam para 1.

**A colisão que travava a rubrica por voz está resolvida — e a favor do produto.** A rubrica é por
criança, então nomear é obrigatório, e `filtrarPerimetro` bloqueia nome **mais** termo de estado
interno: *"a Yasmin ficou triste"* é barrada, e o indicador mais atingido seria justamente
**Expressão emocional**. Medido: as **âncoras da própria dimensão já são comportamentais**
(*"nomeia o que sente"*, *"diz do que precisa"*, *"bate na mesa"*) e **todas passam** no perímetro.
É essa a linguagem que a extração por voz tem de usar. O atalho afetivo continua barrado, e ali o
bloqueio está **certo**: é conteúdo clínico, e a saída é a coordenação. Virou gate — se alguém
reescrever uma âncora em termos de estado interno, a rubrica por voz calaria naquele indicador e
ninguém ficaria sabendo.

**Onde o número mudou.** A seed passou a ter 6 dimensões e o viés deliberado ficou: cinco sobem,
Resiliência recua de leve, Expressão emocional segue a menor. Toda menção a "5 dimensões" nos
documentos vivos foi corrigida; os históricos (inception, roteiros da visita) ficaram como
registro da época.

---

### 35. Áudio longo transcreve no computador do Instituto — e a tela diz isso

**Origem:** a jornada v2 declarou quatro portas de entrada, e as portas **A′** (narrar sem pressa),
**B** (deixar gravando o encontro) e **C** (trazer um áudio que ela já tem) exigem transcrever fala
longa. O `SpeechRecognition` do navegador não serve para isso: é feito para ditado curto e, no
caminho mais comum, nem sequer transcreve no aparelho (decisão da F0).

**A escolha, e o que ela custa.** O transcritor é o `whisper.cpp` (binário do sistema, mesmo padrão
do `llama-server` — nada entra por npm, a decisão nº 1 continua de pé). Ele roda num **host**, não
no celular. Logo o áudio **sai do aparelho** e atravessa a rede local até o computador do
Instituto. Isto **falsifica a frase que a jornada v2 tinha declarado inegociável** — *"o áudio não
sai do aparelho"* — e a saída não foi esconder o custo: foi trocar a promessa por uma verdadeira.

| Caminho | Onde transcreve | O que a tela promete |
|---|---|---|
| Ao vivo, curto | no aparelho quando o navegador sabe (`processLocally`) | *"fica no aparelho"* |
| A′, B e C | `whisper.cpp` no computador do Instituto | *"vai só para o computador do Instituto, pela rede daqui, e é apagado assim que vira texto"* |

**O ciclo de vida do arquivo é MECANISMO, não promessa.** O whisper lê arquivo — logo existe
arquivo, logo existe janela em que ele sobrevive. Três defesas, porque uma só falha em silêncio:
apagar no `finally` (cobre sucesso, erro e timeout), varredura de órfãos no boot (cobre a queda do
processo no meio) e teto de idade na varredura (não apaga o arquivo de uma transcrição em curso).
O gate `npm run test:audio` **falha se o arquivo sobreviver a uma transcrição interrompida** —
verificado removendo o `finally`: quatro asserções caem.

**Conversão no cliente, para não trazer outro binário.** O navegador decodifica o áudio já em
16 kHz quando aceita a taxa no construtor, e só reamostra com `OfflineAudioContext` quando não
aceita. Isso evita o `ffmpeg` — mais um binário numa casa que não tem profissional de tecnologia
seria custo real, não detalhe.

**Gravação em blocos fechados de 5 minutos**, e isto é memória: decodificar uma hora de áudio de
uma vez custa mais de 1 GB de `Float32Array` e mata o celular. O gravador para e recomeça, cada
bloco é um arquivo completo que vira texto sozinho, e a memória volta ao chão entre eles.

**A rota de transcrição não usa a fila offline**, de propósito: a fila reenvia sozinha quando a
rede volta, e reenviar dezenas de MB de áudio sem a pessoa mandar seria pior que perguntar. Quando
a rede cai no meio, o pedaço fica guardado no aparelho e a tela diz isso, com "Tentar de novo".

**Desligado por padrão** (`PERCURSO_AUDIO=1`), e a porta B — a única em que a sala inteira é
gravada, com as crianças — nasce desligada **também dentro do recurso ligado**: ela só liga por
escolha explícita de quem responde pela turma, e por aparelho. A governança em `src/seed.js` ganhou
duas linhas (`audio_longo` e `audio_da_sala`) que a tela de Consentimentos renderiza.

**Pré-requisito duro:** `getUserMedia` exige contexto seguro. Pelo IP da rede local sem HTTPS a
captura simplesmente não existe — daí o `PERCURSO_HTTPS=1` ter vindo antes desta frente.

**O que ainda não foi medido, e por isso não está prometido:** a velocidade do whisper na máquina
do Instituto. Os notebooks doados nunca foram avaliados, e a estimativa de *"~6× tempo real"* que
circulava **não diz nem a direção**. Fica como dívida declarada, não como número.

---

### 36. Vinte e oito telas viram doze — fundindo, não escondendo

**Origem:** a semana que mais aprendeu sobre o campo foi a que mais engordou o produto, e o campo
pediu o contrário: *"esta forma tem que ser a mais simples e fácil possível"*. A primeira versão do
plano propunha reduzir o MENU e deixar as 28 rotas de pé — a revisão derrubou isso com o nome certo:
**ocultação não é simplificação**, e tela escondida continua custando código, teste e protótipo.

**Decisão.** Fundir. Uma tela absorve as que são o mesmo assunto, e a rota antiga **deixa de
existir** — não há mais `rota()` para ela. O conteúdo passa a viver dentro da tela que absorveu,
endereçado por query.

| Vira | Absorve | Por quê |
|---|---|---|
| `#/registrar` | `#/voz` · `#/folha` · `#/confirmar` | três estados de UMA tarefa; `#/confirmar` já renderizava os blocos idênticos aos da folha |
| `#/crianca` | `#/criancas` · `#/observacao/:id` · `#/parecer/:id` | a busca vira campo no topo; o olhar e o parecer acontecem NA ficha, que é onde a pessoa já está |
| `#/hoje` | `#/alertas` · `#/pauta` · `#/ciclo` | os três já eram cartão aqui; o cartão e a tela coexistiam, e a pendência de ciclo era cobrada em dois lugares |
| `#/sai-daqui` | `#/relato` · `#/recado` | as duas saídas do mesmo encontro, do mesmo registro |
| `#/painel` | `#/scores` · `#/safras` · `#/sintese` | a única porta para as três era uma linha de botões fantasma DENTRO do painel: um menu escondido numa tela |
| `#/pessoas` | `#/importar` · `#/arquivo` | quem entra, quem saiu e o que veio de antes são o mesmo assunto: o elenco |
| `#/relatorio` | `#/impacto` · `#/consulta` | o SROI é um bloco do relatório, não um destino; e perguntar é sobre aqueles números |

**18 rotas somem, 2 nascem: 28 → 12.** Educadora e psicóloga passam a alcançar 4 itens de menu em
vez de 13 e 11; coordenação, 4; diretoria, 1.

**O mapa de apelidos (`FUNDIDAS`, `public/app.js`) não é ocultação disfarçada.** A tela sumiu; o mapa
existe porque as citações de rota antiga são muitas — as sugestões da Aurora, o protótipo, os
documentos, links que a coordenação já mandou por WhatsApp. Link velho que dá tela em branco é pior
que link velho que chega no lugar certo. Ele **troca a barra de endereço**, para a pessoa ver onde
está e o Voltar não ficar preso no apelido.

**Teto de três cartões no `#/hoje`**, com a captura em primeiro. A tela empilhava oito cartões e até
dez botões largos — e o comentário do cartão de voz já dizia que ele *"fica acima de tudo o que é
tarefa"* enquanto ele era o terceiro. O excesso não some: vira "Também para você".

**Seletor de turma**, que é achado de campo: a turma de sábado à tarde tem porta de entrada, nome e
chamada na operação real — quem não a acompanhava era o produto (`GET /api/hoje` montava tudo a
partir de `turmas[0]`).

**O que a fusão revelou, e nenhum gate pegava:**

1. **`/^#\/relato/` casava em `#/relatorio`**, e o despacho pega o primeiro que casa. A tela
   principal da DIRETORIA estava **inalcançável por hash desde a v2** — quem tocava em "Relatório"
   caía em "Sem turma atribuída". Smoke é HTTP, o unitário não tem DOM, e o defeito morava só no
   despacho do cliente. Agora há gate: ele lê as rotas do próprio arquivo e falha se qualquer uma
   for engolida por outra.
2. **`guiaDe` da Aurora casava por `startsWith` puro**, segurado apenas pela ordem do array. Com
   telas fundidas no mesmo hash, ordem deixou de bastar — passou a exigir fronteira.
3. **Guias duplicados viram texto morto**: dois guias com o mesmo hash, e `guiaDe` responde sempre
   pelo primeiro, sem erro nenhum. Os pares foram fundidos.
4. **A checagem de destino da Aurora era por igualdade exata de string** — destino com query seria
   engolido com um `return` mudo, o mesmo defeito que já tinha acontecido com `#/consulta`.

**Risco assumido, e a mitigação:** `HANDOFF.md` avisa que quem simplifica sem entender reintroduz o
defeito, e fundir é mais arriscado que esconder. A fusão foi desenhada no Figma antes (F-1), feita em
quatro etapas verificadas no navegador, e **toda tela absorvida ganhou volta** — três delas ficaram
sem saída na primeira tentativa, e só apareceram porque foram clicadas.

---

### 37. O calendário é da casa — o produto deduz, a casa corrige

**Origem:** o produto deduzia o calendário do **dia da semana** e pronto. O turno da turma dizia
"sábado" ou "dia útil", e daí saía tudo: quais datas ficaram em aberto, quando há encontro, quando
a pessoa está em lapso. Feriado virava "chamada em aberto" cobrada para sempre; encontro extra
simplesmente não existia; e a jornada v2 pediu o oposto — *"o calendário é da casa. Ela, a
coordenação ou a direção marcam quando são os encontros"*.

**Decisão.** A regra do turno continua sendo o padrão, e a casa marca só a **exceção**
(`calendario_excecao`: `sem_encontro` ou `extra`, com motivo). Uma tabela com uma linha por sábado
do ano seria um calendário para alguém manter à mão — e a casa cabe em duas pessoas.

`temEncontro(turmaId, data)` passa a ser a pergunta única, e `chamadasEmAberto`, o lapso e os
próximos encontros derivam dela.

**O lapso passa a ser contado em ENCONTROS DA TURMA, não em dias de calendário.** `DIAS_LAPSO = 5`
acusava lapso **toda quinta-feira** para quem só atende sábado — cinco dias depois do sábado, sem
que um único encontro tivesse sido perdido. Estava registrado em `c1edcbe` e nunca foi corrigido; o
teste de fluxo tinha **derivado a asserção da régua errada** para parar de quebrar, que é o gate se
acomodando ao defeito em vez de acusá-lo. Agora é `ENCONTROS_LAPSO = 2`: um encontro perdido
acontece, dois viraram hábito.

**Registro retroativo já funcionava** — o encontro guarda a data em que aconteceu e o instante em
que foi registrado — mas o produto não dizia. Agora diz: *"Registrada em 04/09, depois do encontro
— vale igual"*. Esconder isso é que seria estranho num produto cujo princípio é *"nunca é tarde
para registrar"*.

**O aviso antes do encontro é IN-APP, e o limite fica declarado.** Notificação agendada local **não
existe no padrão web**: Notification Triggers nunca vingou, e o Safari só faz push com servidor.
Push real depende de serviço externo e está fora desta rodada. Prometer o que o navegador não faz
seria pior que não avisar.

**Guarda que importa:** marcar "sem encontro" num dia que já tem chamada registrada é **recusado**.
Apagaria da vista um encontro que aconteceu, e o registro dele continuaria no banco, invisível.

**Um defeito meu, e o gate que ele gerou.** A tabela nova referencia `turma` e eu a deixei fora da
lista de limpeza da semeadura: o esquema passou em todos os testes, e o `reset` só quebrou quando
existia **uma** linha na tabela nova. Isso se repete a cada tabela nova, então virou gate — ele lê
o DDL e a lista da seed e compara, inclusive a ORDEM (quem referencia sai antes de quem é
referenciada). Na primeira execução ele achou uma segunda tabela já faltando: `parecer`.

---

### 38. Toda leitura de dado individual deixa rastro

**Origem:** dívida declarada desde a v1 — *"sem log de auditoria de acesso individual · exigível sob
LGPD · antes do primeiro dado real"* — e **pré-requisito escrito do campo livre de relato** (F7). O
plano é explícito: sem autenticação, sem HTTPS e sem log, qualquer pessoa que abrisse a página leria
o relato de qualquer criança, sem rastro. F7 entra **depois** das três.

**Decisão.** `acesso_individual` guarda **quem** leu **o quê** e **quando**. Não guarda o conteúdo
lido: o log existe para responder *"quem viu a ficha da Yasmin em agosto"*, não para virar uma
segunda cópia do prontuário — que seria exatamente o risco que ele existe para reduzir.

**A chamada mora no portão, não nas rotas.** `exigeAcessoCrianca` é o único lugar por onde todo
acesso individual passa. Espalhar a chamada por rota seria garantir que a próxima rota esqueceria.

**Ler o rastro também é ler dado individual** — passa pelo mesmo portão e fica registrado. Auditoria
sem auditoria de si mesma não é auditoria.

**Duas superfícies, dois recortes.** Na **ficha**, o caso a caso — é ali que a pergunta nasce e onde
há motivo para abrir. Na **governança**, o resumo por recurso e por papel, **sem nome de criança**:
a coordenação vê o padrão de acesso, não quem olhou quem.

**O que isto NÃO destrava.** F7 continua fechada: falta **autenticação**. Hoje entrar é escolher um
perfil numa lista, sem senha — identificação, não autenticação. Um campo de texto livre sobre uma
criança, num produto em que qualquer pessoa que abra a página escolhe ser a psicóloga, não é uma
frente de produto: é um risco. Ligar autenticação muda o protocolo de validação e a demonstração, e
essa é decisão de quem responde pelo Instituto — não do código.

---

### 39. Cada pessoa entra com a própria senha — e o cookie deixa de ser o id

**Origem:** era a **dívida nº 1** do produto e o **último bloqueio** do campo livre de relato (F7).
Até 04/09/2026, "entrar" era escolher um perfil numa lista: identificação, não autenticação.

**E a senha sozinha teria sido teatro.** O cookie era `percurso_uid=5` — o **próprio id**. Qualquer
pessoa trocava o número no navegador e virava a psicóloga; o comentário no código já chamava isso de
dívida. Autenticar sem trocar o cookie teria posto uma porta numa parede sem fundo. As duas peças
andam juntas: senha com `scrypt` **e** token opaco de 32 bytes.

**Sem dependência nova.** `scrypt`, `randomBytes` e `timingSafeEqual` vêm do `node:crypto`. A
decisão nº 1 (sem npm, sem build) continua de pé. Os parâmetros do scrypt ficam **gravados no
hash**, não só no código: subir o custo depois não pode invalidar a senha de quem já entrou.

**Não há senha semeada, e isso é deliberado.** Senha em seed é senha publicada — e semear uma "só
para a demonstração" é exatamente como uma senha de demonstração chega em produção. A seed deixa
`senha_hash = NULL`, que significa **primeiro acesso**: quem chega cria a dela.

**O limite disso, declarado:** a janela de primeiro acesso significa que **quem chegar primeiro
reivindica a conta**. Numa LAN com dado sintético é o custo aceito; com dado real, a coordenação
define todas as senhas antes de entregar o endereço. É a mesma classe de risco de uma senha padrão,
com a diferença de estar escrita aqui em vez de num post-it.

**Recuperação sem e-mail.** A coordenação devolve alguém ao primeiro acesso em Pessoas. Não existe
"esqueci a senha" num produto que não manda e-mail, e inventar um seria inventar um servidor.

**Sessões em memória, de propósito.** Reiniciar o servidor desconecta todo mundo — e isso é melhor
que um cookie persistente que não se pode revogar. Trocar a senha, arquivar a pessoa e redefinir a
senha derrubam as sessões dela **agora**.

**Freio de tentativa por pessoa, não por IP:** numa LAN todo mundo sai do mesmo roteador. Cinco
erros travam a conta, e a espera dobra com a insistência até meia hora. O `scrypt` protege o
**banco**; o freio protege o **formulário**.

**Regra de senha curta, de propósito:** mínimo de 8 caracteres e nada mais. Exigir maiúscula, número
e símbolo faz a pessoa escrever a senha num papel colado no monitor — e este produto vive numa sala
compartilhada. Tamanho é o que de fato pesa.

**O que muda para quem valida:** o protocolo e a demonstração passam a ter um passo a mais na
entrada. `scripts/preparar-sessao.mjs` avisa disso, e o README explica o primeiro acesso.

---

### 40. O campo livre de relato volta — e o que isso custa fica declarado

**Origem:** pedido literal da visita (Grav. 84, 12:00): *"existem coisas muito específicas que
acontecem dentro do grupo que **aqui eu não conseguiria relatar** e lá eu conseguiria."*

**O que isto reverte, e a reversão precisa ser explícita:** a **decisão 15** (*"o campo livre da
observação saiu do produto"*), a **decisão 31** (*"não há campo livre em nenhuma tela nova"*) e a
jornada, que vendia a ausência como proteção. **O produto já tinha tentado e voltado atrás de
propósito**: a v1 tinha campo livre protegido pelo filtro de perímetro e a v2 o removeu porque *"um
filtro é mitigação, não ausência de risco"*.

**O que mudou não foi a análise de risco** — foi o pedido vir da própria usuária, em campo, com um
caso concreto; e os **três pré-requisitos ficarem pagos**: HTTPS (dec. 35), rastro de leitura
(dec. 38) e autenticação (dec. 39). O plano põe esta frente depois das três, e não antes.

**Dois campos, não um.** Base legal, retenção e leitores diferentes — misturá-los faria o descarte
de um levar o outro junto:

| | Relato do **grupo** | Relato da **criança** |
|---|---|---|
| Onde | coluna na `folha` | tabela própria `relato_crianca` |
| Base legal | legítimo interesse (execução do programa) | **consentimento específico** do responsável |
| Retenção | 5 anos, como a folha | **descarte no fim do ciclo** |
| Leitores | equipe do programa | quem convive com a criança |
| Nome de criança | **barrado** | é o assunto do registro |

**As duas garantias que sustentam a reversão, e as duas são por construção:** o texto **nunca chega
a um modelo** e **nunca sai em agregado** (síntese, relatório, planilha, recado, SROI). "Por
construção" só é verdade enquanto ninguém acrescenta a leitura — e uma leitura acrescentada não daria
erro em lugar nenhum. Daí o gate que varre os módulos de saída e de modelo.

**Onde divergi do plano, e por quê.** O plano dizia que o filtro *"continua bloqueando nome e passa
a avisar sem bloquear nas outras categorias"*. **Não adotei a segunda metade.** As categorias que o
perímetro barra são clínicas e protetivas (saúde mental, diagnóstico, violência), e deixá-las passar
transformaria a folha da turma num prontuário com retenção de cinco anos. O encaminhamento humano
não é um obstáculo a remover — é a decisão 5, validada em campo. Um aviso que a pessoa pode ignorar,
sobre conteúdo dessa natureza, é uma porta aberta com um bilhete pedindo para não entrar.

**A rubrica continua sem texto**, e isso também não mudou: enfiar o campo livre de volta dentro da
observação faria o texto herdar a base legal, a retenção e os leitores **dela** — que foi exatamente
a mistura que a decisão 15 desfez. A recusa agora **aponta o lugar certo** em vez de só dizer não.

**O custo, declarado.** A proteção deixa de ser *"por construção"* e passa a ser *"por controle de
acesso"*: existe texto livre sobre criança no banco, e o que impede o vazamento é a autenticação, o
escopo de turma, o consentimento e o rastro — não mais a ausência do campo. É uma troca consciente,
e é reversível: apagar a coluna e a tabela devolve o produto ao estado anterior.

---

### 41. Turma passa a ter cadastro, e matrícula passa a ter depois (04/09/2026)

**Origem:** pergunta literal do dono do produto, sobre a tela de ficha: *"quem faz a matrícula da
criança em cada turma? Quem cadastra as turmas? Tem que ter um campo para isso na direção /
coordenação, já tem?"*

**A resposta honesta era: metade.** A matrícula existia — `Pessoas → Quem entra → Nova criança`
escolhe programa e turma, e é da coordenação. **O cadastro de turma não existia em lugar nenhum:**
as sete turmas vinham da `seed`, e a coordenação não podia abrir a turma do ano seguinte, corrigir um
nome nem passar uma turma para outra professora sem alguém mexer no banco. Uma resposta dessas é
defeito, não desenho.

E faltava a metade seguinte, que só aparece depois do cadastro: **para quem já está na ativa não
havia como trocar de turma.** `rematricularCrianca` só serve a quem voltou do arquivo; mudar de
horário exigiria arquivar a criança e trazê-la de volta, sujando o histórico com uma saída que nunca
houve.

**O que entrou:** `criarTurma` / `editarTurma` / `turmasDetalhadas`, a aba **Turmas** em `#/pessoas`,
`transferirDeTurma` (turma de uma matrícula ativa) e `matricularEmPrograma` (um programa a mais para
quem já está na ativa) — os dois últimos com porta na própria ficha.

**Três recusas que valem mais que as funções:**

- **turma nova em programa que já tem matrícula é recusada na edição** — mudar o programa de uma
  turma mudaria, em silêncio, o programa de todas as crianças dela;
- **turma de outro programa é recusada na transferência** — mudar de programa é outra matrícula, com
  outra entrada e outra leitura de permanência;
- **coordenação e diretoria não assumem turma** — quem lê ficha por vínculo é quem atende.

**Quem cria a turma é a coordenação**, pelo mesmo motivo de todo o bloco de cadastro: turma é o que
decide quem lê a ficha de quem. E o **catálogo de programas da turma é maior que o da matrícula** de
propósito: a Vivência terapêutica está fora do escopo de **medição** (não entra na cobertura, não tem
rubrica individual — decisão 31), mas ela existe, tem turma, chamada e recado, e é onde a psicóloga
trabalha. Impedir de criar turma dela seria confundir "fora da medição" com "fora do Instituto".

---

### 42. O consentimento ganha prova, e a prova é o vídeo do responsável (04/09/2026)

**Origem:** *"Como ele deixa registrado o consentimento? Tem como ser por meio de um vídeo do
responsável na hora de fazer a matrícula?"*

**Tem — e é melhor do que o que havia.** O que havia era o nome do responsável **digitado** por quem
estava do outro lado da mesa. Isso é a *afirmação* de que houve consentimento, não a prova dele; e a
LGPD põe o **ônus da prova no controlador** (Art. 8º, §1º). Numa fiscalização, "a coordenação digitou
o nome" não sustenta nada. Trinta segundos de vídeo sustentam.

E resolve um problema de campo antes de um jurídico: papel se perde, e nem todo responsável lê um
termo com facilidade. **Falar é mais fácil que assinar** — para os dois lados.

| | Onde | Regra |
|---|---|---|
| Arquivo | `data/consentimento/`, modo `0600`, **fora de `public/`** | nunca é servido como estático |
| Linha | `consentimento_evidencia` | guarda ponteiro, duração, quem registrou; **o nome do arquivo não sai para a tela** |
| Leitura | rota autenticada de coordenação | passa pelo portão de acesso individual — **assistir deixa rastro** |
| Apagar | só com **motivo** | existe para revogação (Art. 18, VI), não para arrumar tela |

**O vídeo é opcional, e isso é decisão.** Nem todo responsável quer ser filmado; exigir a câmera
transformaria uma proteção em barreira. Sem vídeo o consentimento vale igual — a tela é que passa a
dizer, depois, quais têm prova e quais só têm a palavra de quem digitou.

**Ao contrário do áudio de transcrição, este arquivo existe para ficar** (decisão 35 apaga o áudio no
`finally`; aqui apagar é apagar a prova). São mecanismos opostos, de propósito, e por isso vivem em
módulos separados: `src/transcricao.js` e `src/evidencia.js`.

---

### 43. O recado vira boletim quando o destinatário é um só (04/09/2026)

**Origem:** *"essa parte de recado com um link para já mandar para o WhatsApp coloque também na parte
de cada criança […] para o responsável da criança todos os dados e ficha da criança, presença nas
classes, evolução socioemocional, enfim toda a informação da criança que tem registro no Instituto
Ebenézer."*

**Isto não contradiz "da turma, nunca de uma criança" — inverte o motivo dela.** A regra do recado
existe por causa do **destinatário**: o grupo de pais. Mandar o nome e a falta de uma criança para
trinta responsáveis é vazamento, e `PESQUISA-WHATSAPP.md:69` já dizia que nem à mão deveria sair.
Aqui o destinatário é **um**: o responsável legal daquela criança, que é quem exerce o **direito de
acesso do titular** (Art. 18, II). Negar o dado a ele não protegeria ninguém — negaria um direito.

**O que fica de fora, e é decisão declarada na própria tela:**

| Fora | Por quê |
|---|---|
| Relato livre sobre a criança | anotação clínica interna, escrita para pensar o caso. A decisão 40 fez dele o dado mais restrito do produto; despejá-lo num WhatsApp desfaria isso de uma vez |
| Detalhe do alerta e da tratativa | alerta é assunto de conversa, não de mensagem |
| Nível 1–4 da rubrica | vocabulário técnico interno; para fora vai a leitura da casa — piorou/manteve/evoluiu |

**Uma escolha técnica que muda o que a família lê:** a comparação do boletim é feita sobre o **nível
da rubrica (1–4)**, não sobre a nota 0–2 da planilha. `NIVEL_PARA_PLANILHA` colapsa 2 e 3 na mesma
nota — uma criança que foi de 2 para 3 sairia daqui como *"manteve"*, e a família leria estagnação
onde houve avanço. O mapeamento existe para falar com a planilha da outra organização; para falar com
a mãe, ele só perde informação. **Dentro da casa as duas leituras continuam convivendo**, e a ficha
mostra as duas lado a lado, marcando com `*` onde divergem (decisão 34).

**Dado novo, um só:** `crianca.responsavel_contato`. Ele existe por um motivo declarado — o boletim
tem de ter para onde ir — e não entra em lista, agregado nem modelo.

---

### 44. O aplicativo entra na lista de quem recebe áudio compartilhado (04/09/2026)

**Origem:** *"áudio pode ser importado de qualquer lugar do celular… Ainda coloque este web app na
lista dos artefatos que permite receber compartilhamento de áudio."*

**Duas coisas, e a primeira era um defeito silencioso.** O seletor de arquivo declarava
`accept="audio/*"`. Parece inofensivo e não é: no iPhone ele fecha o navegador de Arquivos em cima do
que o **sistema** classifica como áudio, e um áudio de WhatsApp (`.opus`), um do Drive ou um exportado
como vídeo simplesmente **somem da lista** — a pessoa não vê um erro, vê um arquivo que não existe.
Quem decide se o arquivo serve passa a ser o decodificador, no passo seguinte, **com mensagem**.

A segunda é o **share target**: o manifest declara `POST /compartilhar`, e quem recebe é o **service
worker** — não há página aberta quando o sistema operacional posta o arquivo. Ele guarda os bytes num
cache próprio, redireciona para `#/registrar?compartilhado=1`, e a tela lê o cache e **apaga em
seguida**: cache que fica seria exatamente a cópia que a tela promete não guardar.

**Limitação declarada:** share target exige service worker, que exige contexto seguro. Sem HTTPS o
`POST /compartilhar` cai no servidor, que responde `303` para a porta de importar — a pessoa escolhe
o arquivo à mão em vez de ver um 404. iOS ainda não implementa share target; ali o caminho é o
seletor de arquivo, que é justamente o que a primeira metade desta decisão consertou.

---

### 45. A governança dos campos deixa de ser tela (04/09/2026)

**Origem, em duas frases do dono do produto no mesmo dia.** Primeiro sobre a ficha: *"pode excluir
tudo isso… essa parte da governança não tem qualquer tipo de utilidade para o usuário."* Removi da
ficha e deixei em `#/consentimentos`, argumentando que ali era ferramenta de trabalho da coordenação.
Estava errado, e ele voltou: *"eu estou pedindo para excluir este texto da governança por campo. Não
faz sentido ele estar dentro do app. Este deve ser um app profissional."*

**A correção do meu erro de leitura.** Eu tinha entendido "no lugar errado"; o que ele disse foi **no
produto errado**. Base legal, titular, acesso e retenção são a **justificação** do sistema, não uma
leitura que alguém faça durante o trabalho: ninguém abre Consentimentos para ler cinco colunas de
texto jurídico — abre para desbloquear a criança que está esperando. Documentação dentro do produto
faz o produto parecer um relatório de conformidade, e essa foi a palavra dele: *profissional*.

**O que saiu foi a EXIBIÇÃO, não a regra**, e a distinção é o ponto:

| Continua | Saiu |
|---|---|
| `governanca_campo` como tabela do banco | a tabela renderizada em `#/consentimentos` |
| campo sem base legal declarada **não entra no sistema** (regra 3 do bloco 6) | a mesma tabela, que já tinha saído da ficha |
| `GET /api/consentimentos` devolve `governanca` — o smoke afirma sobre ela | — |
| a declaração por escrito, em `MODELO-DE-DADOS.md` e `seed.js` | — |

O gate do `unit-test` mudou junto e passou a varrer **o front inteiro**, não só a ficha: se a tabela
voltar a qualquer tela, ele falha; se alguém tirar a **regra**, quem falha são os testes de
consentimento, que são outros. Separar os dois no gate é o que impede a próxima pessoa de ler "saiu
a governança" como "acabou a governança".

**O que entrou no espaço que ela deixou, na ficha:** a porta para registrar o olhar do ciclo
(decisão 46) e o boletim do responsável (decisão 43).

---

### 46. A tabela do ciclo passa a ter porta para o registro (04/09/2026)

**Origem:** *"onde esses pontos são registrados? Não é a professora / psicóloga que tem que
registrar? Como se faz isso?"*

**Registrar sempre foi dela** — mas a única porta ficava em `Hoje → Ciclo de observação`, e a tabela
que **mostra** os pontos, na ficha, não levava a lugar nenhum. Quem olhava para os números não tinha
como mexer neles: parecia dado que vem de fora, e a pergunta que isso gera é exatamente a que foi
feita.

O cartão passa a dizer o **estado** (a fazer / começado / feito neste ciclo) e a abrir o registro.
Quando **não** dá para registrar, ele diz o motivo em vez de esconder o botão — bloqueio de
consentimento não é erro do sistema, é a regra dele, e esconder o botão faria o motivo sumir junto.

**Uma recusa nova, que a porta obrigou a existir:** `GET /api/observacao` passa a devolver
`na_rubrica`. Na Vivência terapêutica não há rubrica individual (decisão 31), e sem esse campo a
ficha ofereceria um registro que o `POST` teria de recusar depois. Botão que leva a lugar nenhum é
pior que ausência de botão: parece defeito do produto, e é.

---

### 47. Os grupos passam a ser cadastro — e o botão único continua não existindo (04/09/2026)

**Origem:** *"crie no campo do coordenador uma integração com WhatsApp na qual é possível compartilhar
conteúdo com diversos grupos ao mesmo tempo… que ao clicar um botão não precise ficar depois clicando
em cada grupo, mas que os grupos já estejam pré-cadastrados no próprio artefato."*

**A metade que não existe, e é melhor dizer agora.** Nenhum site posta num grupo de WhatsApp já
existente. Isso não é limitação deste produto — é desenho da Meta, e `PESQUISA-WHATSAPP.md` já tinha
medido:

| Caminho | Chega ao grupo existente? |
|---|---|
| Groups API oficial | **Não** — só cria grupos novos de até 8, e exige o selo *Official Business Account* |
| Cloud API (1-para-1) | **Não** — chega ao responsável, nunca ao grupo |
| Baileys / whatsapp-web.js e afins | Sim, **violando os Termos** — o preço possível é o número, que é o único canal do Instituto com as famílias |
| `wa.me` / link de convite / Web Share | Sim, **com um toque humano por grupo** |

Escrever o botão único aqui seria escrever uma frase que o WhatsApp desmente na primeira tentativa.
**A tela diz isso, em vez de esconder.**

**A metade que existe é onde estava o tempo dela.** O custo real nunca foi o toque — era montar o
texto, lembrar quais grupos existem, decidir o que pode ir para cada um e perder a conta de quais já
receberam. Os quatro são resolvidos:

1. **os grupos ficam cadastrados**, com público declarado (`canal`);
2. **o texto é montado e copiado UMA vez**, na hora em que ela escolhe o conteúdo;
3. **a fila lembra onde ela parou** — e sobrevive a sair do navegador, porque mora no `localStorage`;
4. **o que saiu fica registrado** (`disparo`), para *"já mandei para os pais?"* ter resposta que não
   seja a memória de quem passou o sábado em pé dentro da sala.

Sobra um toque por grupo: o que a Meta exige, e só ele.

**O público não é etiqueta — é trava.** A tabela do §4 da pesquisa virou código em `PUBLICOS`, e a
recusa acontece **no servidor**, não no botão: carta do período não vai para o grupo dos responsáveis
(seria repasse do dado de cada criança a terceiros, LGPD Art. 14 §3º) e recado da turma não vai para o
Instagram, que é público.

**O destino é o link de convite, nunca telefone.** Grupo não tem telefone; e guardar telefone de
responsável para "mandar no grupo" seria coletar dado que a função não usa.

**Arquivar, não apagar** (decisão 30 outra vez): o registro do que saiu aponta para o canal, e apagar
o canal apagaria a prova de que algo saiu.

---

### 48. O card do Instagram, desenhado no próprio navegador (04/09/2026)

**Origem:** *"o WhatsApp e o Instagram são os super-app brasileiros, portanto, na medida do possível
crie integrações entre o WhatsApp e o Instagram e este artefato."*

**"Na medida do possível" é a parte honesta do pedido, e ela tem uma medida exata.** Postar no
Instagram por API exige conta Business, Graph API, token de servidor e revisão de aplicativo na Meta —
infraestrutura que uma casa sem profissional de tecnologia não opera. O que **não** exige nada disso é
o trabalho que antecede o post: montar a peça e a legenda.

**O card é desenhado em `<canvas>`, no próprio navegador.** Sem biblioteca, sem servidor de imagem,
sem npm — a decisão 1 continua de pé, e há gate que varre o gerador atrás de `import(` e de CDN.

**O conteúdo é o mesmo agregado do relatório, e por construção:** vem de `redigirCarta` sobre
`numerosDoPeriodo`, que é template fechado sobre número de SQL — **nenhum modelo escreve aqui** — e a
supressão de célula pequena já aconteceu antes. Ainda assim passa pelo **revisor de sobre-alegação**
antes de sair, porque Instagram é público e público não tem errata.

**A ressalva metodológica vai NA IMAGEM, não só na legenda.** Legenda se corta; imagem é o que
circula quando alguém salva e reenvia.

**O que fecha o caminho até o aplicativo é o `navigator.share` com arquivo** — a folha do sistema, onde
WhatsApp e Instagram aparecem. Continua sendo um toque por destino, mas com o arquivo junto, que o
link de convite não leva. Era o item (a) do Degrau 0 da pesquisa, declarado como pendência desde então.

---

### 49. A câmera do consentimento escolhe o lado antes de gravar (04/09/2026)

**Origem:** *"na câmera quando abre para o registro permita também virar a câmera do celular."*

Óbvio em uso e não trivial em desenho: `MediaRecorder` fica preso ao stream em que começou. Virar a
câmera no meio da gravação obriga a parar e recomeçar, e **o que já foi dito se perde**; emendar dois
arquivos tampouco serve — são dois contêineres com cabeçalhos próprios, e a prova viraria dois
pedaços.

Por isso a escolha acontece **antes**, com a imagem na tela — que é quando ela importa: quem grava o
responsável sentado do outro lado da mesa precisa da câmera de trás; quem grava a si mesmo, da
frontal. O botão de virar some enquanto grava, e volta depois.

**Dois detalhes que só aparecem usando:** a prévia frontal é **espelhada na tela**, como todo
aplicativo de selfie faz — sem isso a pessoa se vê ao contrário e não consegue se enquadrar —, mas o
**arquivo não é espelhado**: prova invertida seria prova adulterada. E o botão de virar só aparece se
`enumerateDevices` acusar duas câmeras: num notebook há uma só, e oferecer "virar" onde não há para
onde virar é botão que não faz nada.

---

### 50. A segunda rodada de WhatsApp e Instagram — onde a primeira quebrava sem avisar (04/09/2026, noite)

**Origem:** *"veja se não há nada que não possa ser melhorado ou desenvolvido, principalmente na
integração com o Instagram e o WhatsApp. Seja criativo… explore alternativas ainda não usualmente
exploradas."*

**O diagnóstico veio antes da criatividade.** A fila da decisão 47 tinha cinco pontos em que
falhava em silêncio — cada um descoberto olhando para onde a coordenação de fato está, e não para
onde o código foi testado:

| Onde quebrava | Por quê | O que entrou |
|---|---|---|
| **O clipboard** | `navigator.clipboard` não existe fora de HTTPS — e a rede local do Instituto é http. A fila inteira dependia dele | O texto vai **dentro do link**: `wa.me/?text=…` abre o WhatsApp já com a mensagem escrita; só falta escolher o grupo. E o copiar ganhou o caminho antigo (`execCommand`) como reserva |
| **O notebook** | Sem WhatsApp e sem `navigator.share`, a coordenação montava a fila e não tinha para onde ir | O **passe**: a fila fica dez minutos no servidor sob um id aleatório, e um QR leva o celular direto a ela |
| **O responsável que digita link** | Para o Jardim Ângela, "entre no grupo pelo link" é barreira | A **folha da turma**: QR de cada grupo e do Instagram, para imprimir e colar na parede |
| **Mandar duas vezes** | Nada impedia o mesmo recado sair duas vezes no mesmo sábado | O servidor diz quem **já recebeu este conteúdo hoje**; a tela desmarca esses por padrão, com o motivo escrito. Não proíbe — repetir pode ser intencional |
| **Só quadrado** | Story (vertical) e carrossel têm mais alcance no Instagram, e ambos cabem no `navigator.share` | Três formas do mesmo card: feed, story e carrossel de três imagens; e o **texto alternativo** para quem não vê a imagem |

**A peça que destrava três desses é um codificador de QR escrito à mão** (`public/qr.js`), e ele
merece a decisão por si: a regra 1 (sem npm) continua de pé, e o algoritmo é aberto (ISO/IEC 18004)
— modo byte, correção M, versões 1 a 10, máscara por penalidade como a norma manda. **Foi
verificado com um leitor real, não com o próprio código:** o `BarcodeDetector` do navegador
(Apple Vision) decodificou 22 casos de v1 a v10, byte a byte, com acentos. E foi ele que pegou o
único defeito: a v7 falhava porque o sincronismo era desenhado antes do padrão de alinhamento que
fica *em cima* dele. Um teste que só conferisse a matriz contra o próprio codificador passaria
verde.

**O passe é trânsito, não registro** — por isso mora em memória, dura dez minutos, vale por uma
leitura e nunca leva a imagem (170 KB em base64 não é trânsito; o celular refaz o card em meio
segundo do mesmo agregado). Um QR fotografado por cima do ombro não abre nada para quem não tem
sessão de gestão. O que fica registrado é o **disparo**, quando acontece, como sempre.

**Um defeito da rodada anterior que só apareceu agora, e vale registrar:** a referência do
disparo era calculada em dois lugares com duas formas (`turma 6 · data` ao perguntar quem já
recebeu; `Vivência · Sábado manhã · data` ao registrar). A trava de duplicidade **nunca casava** —
passava verde e não protegia ninguém. Passou a ter uma fonte, e "hoje" passou a ser a meia-noite
**local** de quem manda, porque um envio às 21h de sábado em São Paulo já é domingo em UTC.

**O que a criatividade encontrou de legítimo para "um envio, todos os responsáveis":** não é
código — é o próprio WhatsApp. Uma **Comunidade** tem um grupo de avisos que alcança todos os
membros de todos os grupos de uma vez. A tela passou a dizer isso, e o produto aceita esse grupo
como canal de público "Responsáveis da turma", sem turma. É o único caminho dentro dos Termos, e
a pesquisa de WhatsApp já o listava sem que ninguém o tivesse ligado ao pedido.

**Onde o cadastro mora, e por que a primeira tentativa não servia.** Eu tinha posto o formulário
num `<details>` recolhido no fim de `#/divulgar`, depois da fila e da lista — e o dono do produto
não achou: *"não vi as telas e funcionalidades para cadastrar os grupos"*. Cadastro, neste produto,
mora em **Pessoas** (Quem entra · Turmas · Quem saiu), e é ali que se procura cadastro. Virou a aba
**Canais**, com criar, **editar**, arquivar e trazer de volta; `#/divulgar` ficou só com o envio e
um botão que aponta para lá. A lição não é de layout: **funcionalidade escondida atrás de um
`<details>` numa tela de outra tarefa é funcionalidade que não existe.**

**Quem cadastra, quem manda — e o buraco que a pergunta dele revelou.** Cadastrar, editar e
arquivar canal é da **coordenação**, e só dela: o público do canal decide o que pode ser enviado
para ele, então cadastrar é decidir. Coordenação e diretoria **enviam** de `#/divulgar`. Mas quem
manda o recado no sábado é **quem está em sala** — e a tela de recado dela não oferecia o grupo já
cadastrado: continuava com o botão genérico, sem registro de que saiu. Entrou: o grupo da **própria
turma** (o servidor filtra; grupo de outra turma responde 403 no registro), um toque que abre o
WhatsApp com o texto escrito, e a marca "já recebeu este recado hoje". A pergunta *"e quem
cadastra os canais e etc?"* foi o que fez o buraco aparecer — o `etc.` era a professora.

**A retenção da prova, e por que ela DETECTA em vez de executar (OPAR 05/09/2026).** A auditoria
achou três defeitos altos nesta peça, todos verificados à mão antes da correção:

1. **Ver o vídeo ficava no log; destruir o vídeo, não.** `GET /api/consentimento/video` passava pelo
   portão de acesso individual e o `DELETE` só exigia coordenação. Para uma peça que existe por causa
   do ônus da prova, o rastro estava exatamente ao contrário. Agora o DELETE lê a linha antes, para
   saber de quem é a prova, e registra o acesso antes de o arquivo sumir.
2. **A linha de governança que declara os 5 anos não governava nada.** O front catalogava toda
   evidência como `rubrica_socioemocional`, cuja retenção declarada é outra ("enquanto ativa + 2
   anos"). `consentimento_em_video` existia só como texto de tela.
3. **Revogar empurrava o relógio para frente.** `data_registro` era reescrita a cada mudança de
   status: revogar em 2026 um consentimento de 2021 movia o vencimento de 2026 para 2031 — quatro
   anos a mais, causados pelo gesto que deveria encurtar o prazo. A vigência passou a ser congelada
   e a revogação ganhou data própria.

**E o fecho de ciclo virou DETECTOR, não executor** — marca `expira_em`, devolve `provas_vencidas`
com nome e prazo, e não apaga nada. Três razões: o disco não participa da transação (um rollback
devolveria a linha e não os bytes, que é o desfecho que o próprio `evidencia.js` chama de "perda de
prova"); destruir prova tem de ter dono e motivo (Art. 18, VI); e **prova de consentimento ativo
nunca entra na lista, qualquer que seja a data** — é exatamente quando ela precisa existir.

**O que continua fora, e por quê:** postar no Instagram por API (conta Business, token, revisão da
Meta — infraestrutura que a casa não opera); e o *deep link* `instagram://story-camera`, que entrou
só no celular e só como atalho — no notebook não existe, e prometer o que não abre é o defeito que
esta rodada veio consertar.

---

---

## Dívidas técnicas conhecidas

| Dívida | Impacto | Quando pagar |
|---|---|---|
| ~~Sem autenticação~~ **— paga em 04/09/2026 (decisão 39)** | Era a dívida nº 1 e o último bloqueio da F7 | Feito: senha por pessoa (`scrypt`), token opaco no lugar do id, freio de tentativa, recuperação pela coordenação. Resta a janela de primeiro acesso, declarada na decisão 39 |
| HTTPS existe, mas com certificado autoassinado | O aparelho avisa "conexão não privada" na primeira visita, e alguém precisa aceitar | Certificado de autoridade real quando houver domínio; hoje o aviso é o custo declarado |
| ~~Sem log de auditoria de acesso individual~~ **— pago em 04/09/2026 (decisão 38)** | Era exigível sob LGPD e bloqueava a F7 | Feito: `acesso_individual`, no portão único de acesso |
| Filtro de perímetro por termo, não por sentido | Deixa passar paráfrase | Depende de avaliação com a psicóloga |
| Sem exportação (CSV/PDF) da síntese | Copiar e colar resolve hoje | Quando o relatório anual for montado |
| Sem paginação na lista de crianças (limite 60, agora com aviso de corte) | Irrelevante em 106 crianças | Se a operação dobrar |
| PoC do copilot com pedagogos não realizada | Bloqueia `AI_ENABLED=1` em operação real | Antes de ligar a IA para educadoras (protocolo pronto em `POC-COPILOT.md`) |
| 20 consultas do rag-test de autoria interna | Gate C não congelado | Validação por pedagogo (registrada em `POC-COPILOT.md`) |
| Anonimização não cobre apelido/paráfrase | Risco residual declarado na UI | Reavaliar com a PoC; orientação de uso é a mitigação |
| Share target não funciona no iOS nem sem HTTPS | Metade dos aparelhos do Instituto cai no seletor de arquivo | Nada a fazer no produto: depende do Safari e do certificado. O caminho manual está declarado na tela |
| Retenção da prova em vídeo é DETECTADA, não executada | O fecho de ciclo marca `expira_em` e nomeia as provas vencidas; apagar continua sendo gesto humano com motivo | Deliberado (OPAR 05/09): o disco não participa da transação — um rollback devolveria a linha e não os bytes —, e destruir prova do Art. 8º §1º tem de ter dono e rastro |
| Órfãos em `data/consentimento/` são reportados, não varridos | O boot conta arquivo sem linha e linha sem arquivo e avisa; não apaga | Deliberado: ao contrário do áudio temporário, aqui o órfão é prova desgarrada. Quem decide é a coordenação |
| A faixa "atenção" da régua pode ser aritmeticamente inalcançável | A faixa tem 5 pontos (75–79%) e o denominador é o nº de encontros na janela: com 10 encontros só existem múltiplos de 10, então ninguém pode estar "em atenção" numa turma de sábado no começo do semestre | Descoberto em 05/09/2026, quando a virada do dia derrubou o gate que dizia "a seed força as duas faixas". Não é erro de cálculo — é granularidade. Decidir com a coordenação se a faixa vira intervalo relativo (ex.: "1 falta da régua") em vez de percentual, que é o que resolve de verdade |
| O passe morre com o servidor | Reiniciar o processo apaga os passes em trânsito (memória) | Deliberado: é trânsito de dez minutos, e a pessoa monta de novo com um toque. Só vira banco se a operação mostrar reinícios frequentes |
| QR só até a versão 10 (213 bytes) | Um `wa.me/?text=` com o recado inteiro não cabe num QR; o passe resolve levando a fila, não o texto | Estender as tabelas até a v40 se algum dia houver conteúdo curto que precise ir por QR e passe de 213 bytes |
| Postar no Instagram continua manual | O card sai pronto, mas quem publica é a pessoa | Graph API exige conta Business, token de servidor e revisão de aplicativo na Meta — infraestrutura que a casa não opera (decisão 48) |
| Envio a grupo de WhatsApp continua com um toque por grupo | O que a Meta permite; o resto viola os Termos | Só muda se a Meta abrir a API de grupos existentes, ou se a diretoria aceitar o Degrau 2 da pesquisa, que não recomendo |
| O disparo marca "enviado" no CLIQUE, não na entrega | Quem abre o grupo e desiste fica marcado como enviado | Não há como saber: o navegador não avisa quando a pessoa volta do WhatsApp. O botão "Desfazer" é a mitigação, e está na tela |
| Telefone do responsável sem verificação | Um dígito errado manda o boletim para um desconhecido | Confirmação por mensagem antes do primeiro envio, quando houver operação real |
| Educadora substituta sem representação no modelo | Escopo de turma barra acesso legítimo temporário | Decisão da coordenação (decisão 22) |
| Políticas A-06/A-11 propostas, não validadas | Pendência de governança | Validação da coordenação (decisão 23) |
| Mapeamento 1–4 → 0–2 da planilha é provisório | A exportação pode divergir do que a psicóloga faria à mão | Aval da psicóloga sobre as 6 rubricas e o mapeamento (decisão 34) |
| Template do relato do procedimento é provisório | Pode não bater com o padrão que o conselho pede a ela | Quando o modelo prometido na visita chegar (decisão 31) |
| Extrator lê contagens por padrão lexical | ~~"umas seis" fica em branco~~ **A premissa estava errada (OPAR 05/09): "umas seis" sempre devolveu 6; o defeito era o extrator gravar 1 quando não entendia — corrigido.** O que resta é medir a taxa de correção na operação | Medição em campo; Modo A por modelo continua opt-in |
| Neutralização do perímetro por lista fechada | Sintagma novo do procedimento volta a ser barrado | Ampliar `NEUTRALIZAVEIS_VIVENCIA` com a psicóloga, nunca por inferência |
| Velocidade do whisper na máquina do Instituto nunca medida | A porta B (encontro inteiro) pode levar tempo que ninguém dimensionou; "~6× tempo real" não diz a direção | Medir com áudio de ~10 min no notebook mais fraco e escrever o número em `METODOLOGIA-VALIDACAO-PERCURSO.md` §5.3 (decisão 35) |
| Capturar ainda depende de um encontro já existir | `#/registrar` redireciona para `#/registrar?passo=mao` sem encontro e `src/voz.js` devolve 404 — a porta C (áudio de três semanas atrás) esbarra nisso | Frente do calendário (encontro agendado + data retroativa), que é pré-requisito declarado da porta C |
