# Percurso — MVP funcional

**Instituto Ebenézer · Desafio B (Monitoramento de Impacto) · Módulo 3 — MBA IA e Dados para Negócios**

Transforma a observação de minutos do educador em indicador de evolução por trajetória e por
programa — sem que dado individual de criança saia da organização.

**Versão 2** (22/08/2026): a professora fala 40 segundos e o sistema se alimenta; três scores que
não pontuam a criança; pauta de segunda como devolução; e o relatório do ciclo que a diretoria gera,
revisa e envia a quem financia. O que mudou, feature a feature, está em
[`docs/O-QUE-VEIO-DA-V2.md`](docs/O-QUE-VEIO-DA-V2.md).

**Pós-visita** (02/09/2026): a visita de campo ao Instituto (29/08) mudou a persona — quem tem a
dor do registro é a **psicóloga** — e o produto ganhou a tela do sábado: papel `profissional`,
Vivência terapêutica com turma e **registro de vivência** (procedimento em lista fechada +
check-in de grupo em contagens), **relato no padrão do conselho** liberado por ela, rubrica
alinhada aos **seis indicadores da planilha socioemocional** do Instituto com exportação por código,
**régua de presença de 75%**, **recado da turma** para o grupo dos responsáveis, devolução por
encontro e **parecer a profissional parceiro** por código, sob consentimento. Decisões 31–34 em
[`docs/DECISOES-TECNICAS.md`](docs/DECISOES-TECNICAS.md); plano e revisão em
[`docs/revisao/11-PLANO-POS-VISITA.md`](docs/revisao/11-PLANO-POS-VISITA.md).

**Versão 3** (25/08/2026): a camada de IA local do plano de arquitetura, inteira e desligável —
RAG com corpus governado por manifest (`#/copilot` cita a fonte), copilot reflexivo num Qwen3 4B
rodando **na própria máquina** (nada sai dela), SROI exploratório determinístico (`#/impacto`),
PWA, calibração entre educadoras no painel e a infraestrutura da Fase 4 (LoRA) com os gates
declarados. Com `AI_ENABLED` desligada — o padrão — o produto é exatamente a v2. Plano auditado e
execução: [`docs/revisao/04-PLANO-COMPLEMENTACAO-IA.md`](docs/revisao/04-PLANO-COMPLEMENTACAO-IA.md);
mapa da camada: [`ai/README.md`](ai/README.md).

> Todos os dados desta aplicação são **sintéticos**. Nenhum dado real de criança atendida foi
> usado em nenhuma etapa (regra 1 do bloco 6 do dossiê).

---

## Como rodar

Requisito único: **Node.js 22.13 ou superior** — recomendado o **24 LTS**, fixado no `.nvmrc`
([nodejs.org](https://nodejs.org) — instalador padrão). Entre 22.5 e 22.12 o `node:sqlite` exigia
flag experimental e o servidor não subia; a exigência antiga de "22.5+" estava errada e foi
corrigida. Não há `npm install`, não há build, não há conta em plataforma, não há mensalidade.

```bash
node server.js
```

Depois abra **http://localhost:3000** no navegador.

Na primeira execução o banco é criado e populado sozinho. Para voltar aos dados de demonstração a
qualquer momento — **pode rodar com o servidor no ar**, basta recarregar a página depois:

```bash
node scripts/reset.mjs
```

Para rodar a bateria de testes do fluxo principal (com o servidor no ar, em outro terminal, e com
o banco recém-semeado — a bateria grava no banco):

```bash
node scripts/reset.mjs && node scripts/smoke-test.mjs
```

Para rodar os testes unitários das regras críticas (não precisa de servidor; usa um banco
temporário e nunca toca `data/percurso.db`):

```bash
node scripts/unit-test.mjs
```

São **368 asserções de fluxo** e **162 testes unitários** — mais a avaliação do RAG
(`npm run test:rag`: reconstrói o índice e mede hit@5, citações e pseudonimização) e a bateria da
camada de IA com stub (`npm run test:ia`: contrato de 7 blocos, recusas, fila e fallbacks, sem
modelo). As quatro baterias rodam a cada push (`.github/workflows/ci.yml`), sempre com
`AI_ENABLED=false` — os gates que exigem modelo real são locais (`ai/README.md`).

Para usar outra porta:

```bash
PORT=8080 node server.js
```

### Ligar a camada de IA local (opcional)

```bash
ai/scripts/setup-model.sh        # baixa e valida os modelos (~4,3 GB, uma vez)
ai/scripts/start-llama.sh        # terminal 1: Qwen3 4B em 127.0.0.1:8081
AI_ENABLED=1 node server.js      # terminal 2: Percurso com “Refletir” e explicação do SROI
```

Nada sai da máquina: o modelo escuta só em `127.0.0.1` e toda mensagem passa pelo filtro de
perímetro e pela pseudonimização ANTES de chegar a ele. Em operação real com educadoras, ligar
é condicionado ao go da PoC (`docs/POC-COPILOT.md`). Detalhes: [`ai/README.md`](ai/README.md).

### Demo no celular (QR code, voz e instalação — grupo inteiro)

```bash
ai/scripts/demo-celular.sh
```

Sobe modelo + Percurso + túnel HTTPS temporário e imprime a URL `trycloudflare.com` com QR code —
iPhone e Android abrem, instalam como app e **a voz funciona** (HTTPS ✓). `Ctrl+C` derruba tudo e
a URL deixa de existir. Ferramenta de demonstração (decisão 25): pública, efêmera, sem senha —
só com os dados sintéticos. Requisitos na máquina que apresenta: `brew install cloudflared qrencode`.

Para instalar o Percurso em OUTRO computador (o do Instituto), o passo a passo sem jargão está em
[`docs/MANUAL-DE-INSTALACAO.md`](docs/MANUAL-DE-INSTALACAO.md) — inclui o início automático no
login (`ai/scripts/instalar-inicio-automatico.sh`), para ligar o computador e o Percurso já estar
no ar.

### PWA e acesso pelo celular

Em `localhost` e no deploy HTTPS (Render), o Percurso instala como aplicativo (manifest + service
worker network-first, com fallback offline do shell). **Pelo IP da rede local**
(`HOST=0.0.0.0 node server.js` → `http://IP-DO-NOTEBOOK:3000`) a página funciona normal no
celular, mas **sem instalação nem offline** — service worker exige contexto seguro, e prometer o
contrário seria falso. Caminho futuro (mkcert/túnel) registrado na decisão técnica nº 24.

---

## Deploy canônico no Render

O deploy **de operação** em nuvem é definido por [`render.yaml`](render.yaml).
O Blueprint cria um Web Service Node no plano Starter e monta um disco persistente em `/var/data`;
`PERCURSO_DB=/var/data/percurso.db` mantém o SQLite no disco entre deploys, reinícios e períodos
sem tráfego. O plano gratuito, sem disco persistente, **não é adequado** para operação com SQLite:
o filesystem do serviço é efêmero e os dados seriam perdidos.

O Render fornece `PORT`; quando essa variável existe, o servidor escuta em `0.0.0.0:$PORT`, como a
plataforma exige. O funcionamento local permanece igual: sem `PORT`, o servidor usa
`127.0.0.1:3000` e grava em `data/percurso.db`.

O disco persistente protege contra a efemeridade do filesystem, mas não substitui backup. Para
operação real, mantenha cópia periódica do banco fora do serviço e teste a restauração. SQLite em
disco também pressupõe uma única instância do Web Service; não habilite escala horizontal sem
migrar o banco para um serviço compartilhado.

> **Aviso de segurança do deploy público:** o MVP não tem autenticação — qualquer visitante do
> link escolhe um perfil, inclusive coordenação e diretoria (dívida declarada, decisão 8). Isso é
> tolerável **apenas** porque todos os dados são sintéticos. Nunca aponte este deploy para dado
> real sem antes pagar as três dívidas bloqueantes (autenticação, HTTPS, auditoria de acesso).
> A camada de IA fica **fora** do Render de propósito: o plano Starter (512 MB) não comporta o
> modelo (o GGUF sozinho tem 2,5 GB) — análise em `docs/ANALISE-SLM-E-SROI.md` §1.7.

### E o `vercel.json`?

O repositório também versiona [`vercel.json`](vercel.json), usado para uma **demonstração
descartável**: ele aponta `PERCURSO_DB` para `/tmp`, que na Vercel é efêmero. Serve para abrir o
produto num link e clicar, e **os dados somem a cada cold start** — o que é irrelevante numa demo de
dados sintéticos e inaceitável em operação. Os dois arquivos coexistem de propósito e não são
equivalentes: **Render é o deploy de operação; Vercel é vitrine.**

---

## Quem entra e o que vê

O MVP não guarda senha — o controle de acesso real é uma decisão da coordenação, registrada em
`docs/DECISOES-TECNICAS.md`. Na tela inicial escolhe-se o perfil:

| Perfil | Papel | Vê |
|---|---|---|
| **Maria Silvia** | Professora (a persona) | Hoje, Chamada, Pauta, Turma, Crianças, Refletir* |
| **Rita Amaral** | Coordenação | Painel, Scores, Safras, Síntese, Consentimentos, Refletir* |
| **Cleide Nunes** | Professora | As demais turmas |
| **Solange Ribeiro** | Diretoria | Relatório do ciclo, Impacto (SROI exploratório) e consulta agregada — **e nada individual** |
| **Carolina Duarte** | Psicóloga (papel `profissional`) | Hoje, Chamada, Vivência (registro de procedimento + check-in), Relato, Turma (com a régua de 75%), Crianças — **sem agenda de ciclo**: a Vivência fica fora da rubrica (decisão 31) |

\* Refletir é a sala de reflexão do copilot local — só responde com `AI_ENABLED=1` (camada opcional).

A diretoria recebe **403** nas rotas de ficha, lista de crianças e no chat do copilot, por decisão de desenho: quem
presta contas trabalha sobre a camada agregada, então não precisa de acesso individual e não tem
(decisão técnica nº 16).

---

## O que o produto faz — e o que deliberadamente não faz

**Faz.** Registra presença em um toque. Converte 40 segundos de fala em campos de uma folha de
turma, dentro de listas fechadas, com confirmação humana antes de qualquer gravação. Reconstrói anos
de histórico a partir das planilhas antigas, deduplicando criança por nome mais nascimento. Calcula
três scores que medem vínculo, sistema e oferta — nunca a criança. Devolve, toda segunda, três
linhas acionáveis e uma sugestão que a professora aceita ou descarta. Registra observação
socioemocional por rubrica de âncoras comportamentais. Mostra trajetória por criança (interna) e
média por turma e programa (agregada). Acompanha safras, permanência e evasão. Redige a síntese do
ciclo e o relatório do doador em template fechado, com supressão aplicada antes da redação, revisor
de sobre-alegação e aprovação humana.

**Não faz.** Não guarda áudio nem transcrição — a fala é transcrita no próprio aparelho e o texto
morre na confirmação. Não guarda texto livre sobre criança nomeada, em lugar nenhum. Não guarda
conteúdo clínico: o que a Vivência terapêutica registra é **indicador de programa** — procedimento
em lista fechada e contagens de grupo — porque o titular do registro clínico é a psicóloga e o
sigilo profissional impede a transferência (decisão 31). Não expõe criança para fora: o único
dado individual que sai é o parecer a profissional parceiro, por código, sob consentimento
específico e liberado (decisão 32). Não emite diagnóstico. Não
cria score socioemocional individual, por decisão de desenho. Não expõe dado individual para fora
da organização. Não ingere o relatório do parceiro educacional (âncora acadêmica) — fica fora até o
canal mediado responder à pergunta 2 do bloco 7.

---

## Funcionalidades

### As sete da Lean Inception (v1)

| # | Funcionalidade | Onde está |
|---|---|---|
| F1 | Ficha viva da criança — criança ≠ matrícula, consentimento embutido | `#/criancas`, `#/crianca/:id`, `#/consentimentos` |
| F2 | Presença em um toque | `#/chamada` |
| F3 | Ciclo de observação — rubrica com âncoras comportamentais | `#/observacao/:id` |
| F4 | Agenda do ciclo — pendências, bloqueios e janela de convívio | `#/ciclo` |
| F5 | Trajetórias — individual categórica, turma/programa agregada | `#/turma`, ficha da criança, `#/painel` |
| F6 | Safras, permanência e alerta de ausência | `#/safras`, `#/alertas` |
| F7 | Fecho do ciclo — síntese em template contido + revisor | `#/sintese` |

### As quinze da v2 (`percurso-v2-pack`)

Todas implementadas, cada uma com o critério de aceite do pack demonstrado por teste
(matriz completa em [`docs/O-QUE-VEIO-DA-V2.md`](docs/O-QUE-VEIO-DA-V2.md)).

| # | Funcionalidade | Onde está |
|---|---|---|
| F2 | Folha do dia — registro **da turma**, sem campo sobre criança | `#/folha` |
| F3 | Captura por voz — 40 s, áudio descartado no próprio aparelho | `#/voz` |
| F4 | Agente extrator — schema fechado, listas fixas, confiança calculada | `src/voz.js` |
| F5 | Lista de exclusão — devolve encaminhamento humano, não erro | `filtrarPerimetro` + aviso âmbar |
| F6 | Confirmação humana — nada é gravado antes do toque em confirmar | `#/confirmar` |
| F7 | Ingestão retroativa — três grafias do mesmo nome viram uma criança | `#/importar` |
| F8 | Score de risco de evasão — compara a criança com ela mesma | `#/scores`, `#/pauta` |
| F9 | Score de cobertura do registro — mede o sistema, não a professora | `#/scores`, `#/painel` |
| F10 | Score de exposição — aspiração declarada × atividade realizada | `#/scores` |
| F11 | Pauta de segunda — três linhas e uma sugestão, com descarte medido | `#/pauta` |
| F12 | Painel da coordenação com bloco de cobertura | `#/painel` |
| F13 | Relatório do ciclo — sete blocos, supressão antes da redação | `#/relatorio` |
| F14 | Carta do trimestre — mesmo pipeline, template curto | `#/relatorio` |
| F15 | Consulta em linguagem natural sobre a camada agregada | `#/consulta` |

### O que a visita de campo acrescentou (02/09/2026)

| # | Funcionalidade | Onde está |
|---|---|---|
| V1 | Papel `profissional` (psicóloga) e a Vivência terapêutica com turma, presença e folha — fora da rubrica, dentro do registro de turma | `#/hoje` da psicóloga, `GET /api/inventario` (`foraDaRubrica`), decisão 31 |
| V2 | Registro de vivência: procedimento e objetivo em lista fechada + **check-in de grupo** (contagens, nunca quem); o extrator lê as contagens da fala | `#/folha`, `#/voz`, `POST /api/voz/extrair`, `src/voz.js` |
| V3 | Relato do procedimento no padrão do conselho, gerado dos campos fechados, sem nome, liberado pela profissional | `#/relato`, `GET /api/relato`, `POST /api/relato/liberar`, `src/relato.js` |
| V4 | Filtro de perímetro com contexto: o nome do procedimento não dispara; conteúdo sobre criança continua barrado | `filtrarPerimetro(…, { contexto: 'vivencia' })` |
| V5 | A tela de voz diz o que grava; nome falado vira código na tela e é contado (`nomes_substituidos`) | `#/voz`, `#/confirmar` |
| V6 | Rubrica com os seis indicadores da planilha do Instituto; resumo da aba Indicadores e exportação da aba Avaliações (CSV, por código) | `#/painel`, `GET /api/planilha/resumo`, `GET /api/exportar/planilha`, `src/planilha.js`, decisão 34 |
| V7 | Régua de presença do Instituto (75% · atenção até 80%): criança com faixa para quem responde pela turma; só contagens para a diretoria | `#/turma`, `#/painel`, `GET /api/turma/presenca`, `GET /api/regua`, decisão 33 |
| V8 | Recado da turma para o grupo dos responsáveis — gerado do registro, sem criança nomeada, link wa.me sem número | `#/recado`, `GET /api/recado`, `src/recado.js` |
| V9 | Devolução por encontro: o check-in de hoje contra as últimas folhas da turma (cala sem base) | `#/hoje`, `POST /api/folha` (`devolucao`) |
| V10 | Parecer a profissional parceiro — por código, sob consentimento específico, revisado e liberado; registro permanente de que saiu | ficha da criança → `#/parecer/:id`, `GET/POST /api/parecer/*`, `src/parecer.js`, decisão 32 |

### Cadastro de pessoas

| # | Funcionalidade | Onde está |
|---|---|---|
| C1 | Cadastro da equipe — professora, coordenação e diretoria, com apelido derivado do nome e turma opcional (troca de turma exige confirmação) | `#/pessoas`, `POST /api/equipe` |
| C2 | Cadastro de criança — matrícula ativa no mesmo ato, dedup por nome+nascimento, rubrica socioemocional nascendo **pendente** | `#/pessoas`, `POST /api/criancas` |
| C3 | **Arquivo — ninguém é apagado.** Quem sai do pipeline sai das listas vivas e continua no sistema; sessão aberta de pessoa arquivada morre no ato. A volta da criança é matrícula **nova**, com consentimento voltando a pendente | `#/arquivo`, `POST /api/equipe/arquivar`, `POST /api/criancas/arquivar`, `.../reativar`, `.../rematricular` |

### A camada de IA da v3 (opcional, `AI_ENABLED=1`)

| Peça | O que faz | Onde está |
|---|---|---|
| RAG governado | busca com citação num corpus aprovado por manifest (leis, BNCC, material interno) | `GET /api/rag/search`, `src/rag/`, `docs/GOVERNANCA-FONTES-RAG.md` |
| Copilot reflexivo (Modo B) | 7 blocos por gramática: perguntas socráticas, hipóteses rotuladas, ≥3 alternativas, contraponto, fontes verificadas, escalonamento | `#/copilot` (“Refletir”), `src/copilot.js` |
| Modo A por modelo (opt-in extra) | extração da fala sob os MESMOS catálogos fechados, fallback lexical em toda falha | `AI_EXTRATOR=1`, `extrairComModelo` |
| Passo, o assistente-parceiro | guia de navegação presente em todas as telas: tira dúvidas do produto, oferece "Ir para…", fala (opt-in) — responde SÓ sobre o Percurso, com fallback determinístico do guia | botão ❋, `src/assistente.js`, decisão 26 |
| SROI exploratório | 3 cenários e faixa, motor determinístico, dupla contagem bloqueada, premissas com fonte | `#/impacto` (diretoria), `src/sroi/`, `docs/SROI-METODOLOGIA.md` |
| Calibração entre educadoras | borda 2 da doutrina, determinística — pauta de reunião, nunca ranking | `#/painel` |
| LoRA (Fase 4) | infraestrutura, funil de doação explícita e gates — **treino não executado por gate** | `ai/training/` |

---

## Estrutura do repositório

```
server.js                 servidor HTTP (Node puro, sem framework)
src/db.js                 esquema do banco (24 tabelas) e helpers de SQL
src/domain.js             regras de presença, ciclo, consentimento, safras e síntese
src/voz.js                catálogos fechados, agente extrator e folha do dia (v2)
src/scores.js             os três scores, a supressão e a pauta de segunda (v2)
src/relatorio.js          saída para o doador em sete blocos e consulta agregada (v2)
src/planilha.js           a planilha socioemocional do Instituto, preenchida da rubrica (decisão 34)
src/relato.js             relato do procedimento no padrão do conselho, liberado pela profissional (decisão 31)
src/recado.js             recado da turma aos responsáveis, sem criança nomeada (decisão 33)
src/parecer.js            parecer a profissional parceiro, por código e sob consentimento (decisão 32)
src/ingestao.js           ingestão retroativa das planilhas antigas (v2)
src/seed.js               geração dos dados sintéticos
src/api.js                rotas HTTP/JSON
src/ai-client.js          cliente do modelo local (fetch nativo, json_schema, timeouts) (v3)
src/copilot.js            copilot reflexivo, recusas, pseudonimização, doação de interação (v3)
src/assistente.js         Passo, o assistente-parceiro de navegação (guia + modelo, decisão 26)
src/sessoes.js            sessões de conversa em memória com TTL (copilot e Passo)
src/rag/                  preparação de fontes, ingestão FTS5, busca e anonimizador (v3)
src/sroi/calculator.js    motor SROI determinístico versionado (v3)
ai/                       manifest de modelos, scripts do llama.cpp, prompts, treino (v3)
data/rag/                 manifest de fontes, corpus canônico versionado (o .db é derivado)
data/sroi/premissas.json  proxies brasileiras com fonte, ano-base e ressalva
models/                   GGUFs locais (fora do git; ai/scripts/setup-model.sh baixa)
public/                   interface (HTML + CSS + JS, sem build; fila offline; manifest + sw.js)
scripts/reset.mjs         recria o banco do zero
scripts/smoke-test.mjs    368 asserções do fluxo principal (contra o servidor no ar)
scripts/unit-test.mjs     162 testes unitários das regras críticas (banco temporário)
scripts/rag-test.mjs      avaliação do RAG: hit@5, citações, pt-BR, pseudonimização
scripts/ai-stub.mjs       stub do llama-server para testar sem modelo
scripts/ai-stub-test.mjs  bateria da camada de IA com stub (roda no CI)
data/percurso.db          o banco (um arquivo — copie para fazer backup)
docs/                     modelo de dados, decisões técnicas, testes, matriz da v2, IA e SROI
render.yaml               deploy canônico no Render com disco persistente
prototipo-figma/          protótipo mobile fiel ao Figma (standalone)
```

O domínio foi dividido por área na v2, seguindo a recomendação da revisão arquitetural: `domain.js`
guarda o núcleo herdado e as três camadas novas moram em arquivos próprios, cada um com a doutrina
que o governa escrita no topo.

**Backup:** com o servidor **parado**, copiar `data/percurso.db` é o backup completo — restaurar
é copiar de volta. Com o servidor **no ar**, o modo WAL mantém escrita recente em
`percurso.db-wal`; nesse caso copie os três arquivos (`percurso.db`, `-wal`, `-shm`) juntos.

---

## Protótipo Figma (mobile)

Dentro de `prototipo-figma/` há o protótipo interativo fiel ao design do Figma:

- `completo.html` ou `percurso-prototipo.html` — abre direto no navegador (standalone)
- `index.html` + `styles.css` + `app.js` — versão modular

Telas: Entrada · Hoje · Chamada · Folha do dia · Olhar · Turma · Painel da coordenação

```bash
# opcional: servir localmente
cd prototipo-figma && python3 -m http.server 8765
```

---

## Documentação de handover

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — **plano de arquitetura**: restrições do dossiê → respostas de desenho, arquitetura atual, invariantes e os três horizontes de evolução (entrega 09/10 → piloto real → módulos condicionados)
- [`docs/LEAN-INCEPTION.md`](docs/LEAN-INCEPTION.md) — a análise que originou o escopo
- [`docs/ARTEFATO-SEMANA-5.md`](docs/ARTEFATO-SEMANA-5.md) — **documentação de suporte do artefato de tecnologia da semana 5**: persona, jornadas atual e futura, as 5 User Stories com a tela e o teste que prova cada uma, fluxo de navegação por papel — e o registro da validação, que fica em branco até a sessão acontecer
- [`docs/JORNADAS.md`](docs/JORNADAS.md) — jornadas atual e futura das três personas, com ganhos **e custos**
- [`docs/O-QUE-VEIO-DA-V2.md`](docs/O-QUE-VEIO-DA-V2.md) — **matriz de adoção do `percurso-v2-pack`**: as 15 features, as 11 telas, os tokens de design, o que foi adaptado com justificativa e o que foi recusado
- [`docs/ANALISE-BUSSOLA.md`](docs/ANALISE-BUSSOLA.md) — análise comparativa com o app Bússola: o que foi adotado (cronômetro de registro, reconciliação, plano da semana, supressão n<5, aspiração, impressão) e o que foi rejeitado, com justificativa
- [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md) — entidades, relações e atributos
- [`docs/DECISOES-TECNICAS.md`](docs/DECISOES-TECNICAS.md) — o que foi decidido e por quê
- [`docs/TESTES.md`](docs/TESTES.md) — o que foi testado, como reproduzir
- [`ai/README.md`](ai/README.md) — a camada de IA local: modelos, gates, o que ela nunca faz
- [`docs/GOVERNANCA-FONTES-RAG.md`](docs/GOVERNANCA-FONTES-RAG.md) — admissão de fontes ao corpus
- [`docs/SROI-METODOLOGIA.md`](docs/SROI-METODOLOGIA.md) — o que a tela Impacto pode e não pode afirmar
- [`docs/POC-COPILOT.md`](docs/POC-COPILOT.md) — protocolo da PoC com pedagogos (condição para ligar a IA em operação)
- [`docs/VALIDACAO-USUARIO.md`](docs/VALIDACAO-USUARIO.md) — protocolo da validação com usuária real (pendência humana)
- [`docs/PENDENCIAS-DE-ENTREGA.md`](docs/PENDENCIAS-DE-ENTREGA.md) — o que depende de gente até 09/10
- [`docs/MANUAL-DE-INSTALACAO.md`](docs/MANUAL-DE-INSTALACAO.md) — instalar em qualquer computador, sem jargão, com início automático
- [`docs/EVIDENCIAS-DE-TESTE.txt`](docs/EVIDENCIAS-DE-TESTE.txt) — saída da última execução
- [`docs/ROTEIRO-DO-VIDEO.md`](docs/ROTEIRO-DO-VIDEO.md) — o roteiro do vídeo
- [`video/percurso-demonstracao.mp4`](video/percurso-demonstracao.mp4) — vídeo demonstrativo, 6m14s, 1080p, legendado e sem áudio ([como foi gerado](video/README.md)). **Atenção: grava a v1** — não mostra voz, pauta nem relatório do doador. Regravar é item aberto da entrega.
- [`docs/revisao/`](docs/revisao/) — revisão arquitetural completa (22/08/2026): baseline de requisitos, matriz de rastreabilidade arquitetura → implementação → teste, relatório de achados priorizados e a [auditoria adversarial da v2](docs/revisao/03-AUDITORIA-V2.md) (28 achados levantados, 19 confirmados após refutação, 19 corrigidos com teste); da v3 (25/08/2026): o [plano de complementação auditado](docs/revisao/04-PLANO-COMPLEMENTACAO-IA.md) (painel de 4 lentes, 29 achados incorporados antes da execução) e a [revisão adversarial da implementação](docs/revisao/05-REVISAO-IMPLEMENTACAO-IA.md) (35 achados confirmados, 35 tratados)

---

## Sobre a pasta `remix-bússola-—-instituto-ebenézer/`

É o **protótipo de referência Bússola** (Google AI Studio / React / Gemini), analisado em
[`docs/ANALISE-BUSSOLA.md`](docs/ANALISE-BUSSOLA.md). **Não é o produto entregue e não roda em
produção**: depende de LLM na nuvem e de `localStorage`, duas escolhas rejeitadas com
justificativa escrita. As sete ideias adotadas dele foram reimplementadas de forma
determinística no Percurso. A pasta permanece apenas como material comparativo e não é
rastreada no git.

---

## Atualização

Última sincronização deste repositório: **25 de agosto de 2026**.
