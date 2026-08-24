# Percurso — MVP funcional

**Instituto Ebenézer · Desafio B (Monitoramento de Impacto) · Módulo 3 — MBA IA e Dados para Negócios**

Transforma a observação de minutos do educador em indicador de evolução por trajetória e por
programa — sem que dado individual de criança saia da organização.

**Versão 2** (22/08/2026): a professora fala 40 segundos e o sistema se alimenta; três scores que
não pontuam a criança; pauta de segunda como devolução; e o relatório do ciclo que a diretoria gera,
revisa e envia a quem financia. O que mudou, feature a feature, está em
[`docs/O-QUE-VEIO-DA-V2.md`](docs/O-QUE-VEIO-DA-V2.md).

> Todos os dados desta aplicação são **sintéticos**. Nenhum dado real de criança atendida foi
> usado em nenhuma etapa (regra 1 do bloco 6 do dossiê).

---

## Como rodar

Requisito único: **Node.js 22.5 ou superior** ([nodejs.org](https://nodejs.org) — instalador padrão).
Não há `npm install`, não há build, não há conta em plataforma, não há mensalidade.

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

São **242 asserções de fluxo** e **55 testes unitários**. As duas baterias também rodam
automaticamente a cada push (`.github/workflows/ci.yml`).

Para usar outra porta:

```bash
PORT=8080 node server.js
```

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
| **Maria Silvia** | Professora (a persona) | Hoje, Chamada, Pauta, Turma, Crianças |
| **Rita Amaral** | Coordenação | Painel, Scores, Safras, Síntese, Consentimentos |
| **Cleide Nunes** | Professora | As demais turmas |
| **Solange Ribeiro** | Diretoria | Relatório do ciclo e consulta agregada — **e nada individual** |

A diretoria recebe **403** nas rotas de ficha e lista de crianças, por decisão de desenho: quem
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
conteúdo clínico: a Vivência terapêutica está fora do sistema por construção, porque o titular do
registro é a psicóloga e o sigilo profissional impede a transferência. Não emite diagnóstico. Não
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

---

## Estrutura do repositório

```
server.js                 servidor HTTP (Node puro, sem framework)
src/db.js                 esquema do banco (24 tabelas) e helpers de SQL
src/domain.js             regras de presença, ciclo, consentimento, safras e síntese
src/voz.js                catálogos fechados, agente extrator e folha do dia (v2)
src/scores.js             os três scores, a supressão e a pauta de segunda (v2)
src/relatorio.js          saída para o doador em sete blocos e consulta agregada (v2)
src/ingestao.js           ingestão retroativa das planilhas antigas (v2)
src/seed.js               geração dos dados sintéticos
src/api.js                rotas HTTP/JSON
public/                   interface (HTML + CSS + JS, sem build; fila offline em fila.js)
scripts/reset.mjs         recria o banco do zero
scripts/smoke-test.mjs    242 asserções do fluxo principal (contra o servidor no ar)
scripts/unit-test.mjs     55 testes unitários das regras críticas (banco temporário)
data/percurso.db          o banco (um arquivo — copie para fazer backup)
docs/                     modelo de dados, decisões técnicas, testes, matriz da v2
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
- [`docs/O-QUE-VEIO-DA-V2.md`](docs/O-QUE-VEIO-DA-V2.md) — **matriz de adoção do `percurso-v2-pack`**: as 15 features, as 11 telas, os tokens de design, o que foi adaptado com justificativa e o que foi recusado
- [`docs/ANALISE-BUSSOLA.md`](docs/ANALISE-BUSSOLA.md) — análise comparativa com o app Bússola: o que foi adotado (cronômetro de registro, reconciliação, plano da semana, supressão n<5, aspiração, impressão) e o que foi rejeitado, com justificativa
- [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md) — entidades, relações e atributos
- [`docs/DECISOES-TECNICAS.md`](docs/DECISOES-TECNICAS.md) — o que foi decidido e por quê
- [`docs/TESTES.md`](docs/TESTES.md) — o que foi testado, como reproduzir
- [`docs/EVIDENCIAS-DE-TESTE.txt`](docs/EVIDENCIAS-DE-TESTE.txt) — saída da última execução
- [`docs/ROTEIRO-DO-VIDEO.md`](docs/ROTEIRO-DO-VIDEO.md) — o roteiro do vídeo
- [`video/percurso-demonstracao.mp4`](video/percurso-demonstracao.mp4) — vídeo demonstrativo, 6m14s, 1080p, legendado e sem áudio ([como foi gerado](video/README.md)). **Atenção: grava a v1** — não mostra voz, pauta nem relatório do doador. Regravar é item aberto da entrega.
- [`docs/revisao/`](docs/revisao/) — revisão arquitetural completa (22/08/2026): baseline de requisitos, matriz de rastreabilidade arquitetura → implementação → teste, relatório de achados priorizados e a [auditoria adversarial da v2](docs/revisao/03-AUDITORIA-V2.md) (28 achados levantados, 19 confirmados após refutação, 19 corrigidos com teste)

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

Última sincronização deste repositório: **22 de agosto de 2026**.
