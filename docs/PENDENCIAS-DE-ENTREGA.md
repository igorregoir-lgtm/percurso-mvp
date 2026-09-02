# Pendências de entrega — o que depende de humano até 09/10/2026

Este documento separa duas coisas que costumam se misturar: o que **este repositório já sustenta**
(e está consolidado abaixo como insumo pronto) e o que **só uma pessoa pode fazer** — executar a
entrega, validar com gente real, trazer números que não existem aqui. O que depende de humano está
marcado como pendente e **fica em branco até acontecer**. Nada nesta lista se fabrica.

---

## 1. Checklist do processo de entrega (GAP-14)

Executar na semana da entrega. Nenhum item deste bloco é automatizável por este repositório.

- [ ] Criar a pasta no Google Drive com visibilidade **pública** ("qualquer pessoa com o link").
- [ ] Subir **todos os arquivos** da entrega: o repositório completo (código, `docs/`, protótipo
      navegável em `prototipo-figma/`), o vídeo regravado (ver §5) e o Pitch Deck (ver §3).
      Os GGUF em `models/` **não** sobem — são 4,3 GB baixáveis por `ai/scripts/setup-model.sh`
      com SHA-256 no [`ai/model-manifest.json`](../ai/model-manifest.json).
- [ ] Testar o link da pasta em janela anônima (sem estar logado) antes de submeter.
- [ ] **Cada integrante submete individualmente** o link na Adalove, na turma do **Módulo 3**,
      na semana correspondente à entrega.
- [ ] Conferir a submissão antes do prazo: **09/10/2026**.

---

## 2. Insumos de arquitetura para o business case (GAP-13)

Produzidos aqui, com o que o repositório sustenta. Estes números e argumentos podem entrar no
Pitch Deck sem depender de ninguém — o que falta para o deck está no §3.

### 2.1 Custo de operação da solução

**R$ 0 de licença e R$ 0 de API.** O servidor é `node:http`, o banco é `node:sqlite`, a extração
de voz é determinística e o modelo do copilot é local, com licença Apache-2.0 — nenhum custo por
chamada, nenhuma mensalidade ([`DECISOES-TECNICAS.md`](DECISOES-TECNICAS.md), decisões 1 e 13;
[`ai/model-manifest.json`](../ai/model-manifest.json)).

Comparativos que o repositório registra:

| Alternativa | Custo | Por que foi descartada |
|---|---|---|
| No-code pago (Airtable e afins) | mensalidade recorrente | "passivo sem receita garantida" para uma organização sem orçamento de licença — decisão 1 |
| Render Starter/Standard para o copilot 4B | — | **inviável**: 512 MB / 2 GB de RAM contra um GGUF de 2,5 GB — [`ANALISE-SLM-E-SROI.md`](ANALISE-SLM-E-SROI.md) §1.7 |
| Render Pro para o copilot 4B | US$ 85/mês | 4 GB ainda apertado após runtime e cache KV; "não é menor custo/manutenção" — §1.7 |
| Máquina local do Instituto | sem custo de API | **preferida** — melhor aderência ao princípio de não egressão de dados — §1.7 |

O deploy em nuvem do MVP (sem o copilot) existe como opção no plano Starter com disco de 1 GB
([`render.yaml`](../render.yaml), decisão 12). O preço mensal do Starter **não está registrado no
repositório** — confirmar em render.com/pricing (fonte listada na análise) antes de colocar número
no deck. O custo de energia da máquina local e as horas do operador também são dados externos (§3).

### 2.2 Requisitos de máquina

| Camada | O que exige |
|---|---|
| MVP completo (sem IA) | Node >= 22.13 (recomendado: 24 LTS, `.nvmrc`). Rodar é `node server.js` — sem `npm install`, sem build. Qualquer máquina modesta serve; o banco é um arquivo (`data/percurso.db`) |
| Copilot 4B (opcional, `AI_ENABLED=1`) | >= 8 GB de RAM **livre** (margem de engenharia da análise §1.7–1.8 — precisa de medição na máquina real do Instituto); GGUF Q4_K_M de 2,5 GB; `llama-server` local via `ai/scripts/start-llama.sh` |

Medição local registrada no plano de complementação
([`revisao/04-PLANO-COMPLEMENTACAO-IA.md`](revisao/04-PLANO-COMPLEMENTACAO-IA.md), gate B):
0,6 s / 80 tokens em um M5 Max. A máquina do Instituto precisa da própria medição — não se
extrapola benchmark de máquina de desenvolvimento para máquina de operação.

### 2.3 Papel do operador pós-semana 10

A restrição do bloco 5 — *"a organização não tem profissional de tecnologia"* — vira três papéis
concretos:

- **Quem liga o servidor:** uma pessoa da coordenação ou do administrativo. O gesto é um comando
  (`node server.js`). Não há dependência que quebre com atualização de terceiro (decisão 1).
- **Quem faz backup:** a mesma pessoa. Com o servidor parado, backup é **copiar um arquivo**
  (`data/percurso.db`); com o servidor ativo em WAL, copiar também `-wal` e `-shm` de forma
  consistente (decisão 1). No Render, o disco persistente **não é backup** — a operação mantém
  cópias externas e testa restauração (decisão 12).
- **Quem nunca mexe em código:** educadoras, coordenação e diretoria — toda a operação é pela
  tela. Os parâmetros de protocolo (janela de convívio, alerta de ausência, lapso) estão isolados
  em `PARAMS` (decisão 7) exatamente para que um ajuste pontual não exija procurar no meio do
  código. O copilot é desligável: se ninguém subir o modelo, nada quebra — `AI_ENABLED=false` é
  o padrão e o produto inteiro funciona sem ele.

### 2.4 O tempo clínico da psicóloga como insumo qualitativo

O bloco 5 do dossiê registra que a psicóloga é o recurso mais escasso da organização: **tempo de
psicóloga gasto em sistema é tempo retirado de atendimento a criança**. O Percurso foi desenhado
para não pedir nada a ela: a rubrica é preenchida pela educadora, o filtro de perímetro devolve
**encaminhamento humano** em vez de gravar conteúdo clínico (decisão 5), e a calibração do olhar
é material embutido na própria tela de observação (M6) — não uma capacitação que ela precise dar.

No deck, este é um argumento **qualitativo** de custo evitado. Monetizá-lo exigiria o valor-hora
e a agenda clínica real da psicóloga — dado externo (§3). Sem esse dado, a frase certa é: *a
alternativa que consome tempo clínico tem um custo que a organização não pode pagar; esta não
consome nenhum*.

---

## 3. Dados externos — precisam vir da organização

Nada abaixo existe neste repositório, que opera com **dados sintéticos determinísticos**
(decisão 9). Sem estes dados, ROI, VPL e Payback do Pitch Deck **não podem ser calculados** —
e não serão inventados.

| Dado | Para quê no deck | Status |
|---|---|---|
| Números reais de 2025 (crianças atendidas, presença, evasão por programa) | linha de base do impacto | **pendente — organização** |
| Orçamento 2026 | denominador do SROI e do ROI | **pendente — organização** |
| Custo mensal real de operação (equipe, espaço, alimentação) | estrutura de custos | **pendente — organização** |
| Base de doadores: quantidade, ticket médio, retenção | projeção de captação, Payback | **pendente — organização** |

Com esses dados em mãos, o Pitch Deck (10–12 slides, com ROI/VPL/Payback) é montado combinando-os
com os insumos do §2 e com o motor SROI exploratório já implementado
([`src/sroi/calculator.js`](../src/sroi/calculator.js), método em
[`SROI-METODOLOGIA.md`](SROI-METODOLOGIA.md)) — lembrando que a tela Impacto declara faixa e
premissas, nunca número único, e que uso externo do SROI exige revisão humana.

- [ ] Obter os quatro dados com a organização.
- [ ] Montar o deck. **Pendente — humano.**

---

## 4. Validação com usuário real (GAP-11)

A sessão de validação com uma educadora real **não aconteceu**. O protocolo (roteiro de sessão,
termo, formulário de registro) é entregável da Etapa H do plano
([`revisao/04-PLANO-COMPLEMENTACAO-IA.md`](revisao/04-PLANO-COMPLEMENTACAO-IA.md) §8); o campo de
resultados fica **em branco** até a sessão acontecer — validação não se fabrica.

- [ ] Agendar e executar a sessão com a educadora. **Pendente — humano.**
- [ ] Registrar os resultados no formulário do protocolo. **Pendente — humano.**

---

## 5. Regravação do vídeo (GAP-12)

O vídeo atual (`video/percurso-demonstracao.mp4`, 6m14s) foi gravado sobre a **v1** e não mostra
captura por voz, copilot, calibração, SROI nem relatório do doador. O roteiro v2 completo está em
[`ROTEIRO-DO-VIDEO.md`](ROTEIRO-DO-VIDEO.md), dimensionado para até 7 minutos.

- [ ] Regravar o vídeo seguindo o roteiro v2. **Pendente — humano.**

---

## 6. CFL-03 — resolvido: o protótipo existe em Figma

> **Estado: fechado em 26/08/2026.** O que estava aqui era a decisão de *declarar, não
> retrabalhar* — entregar o protótipo em HTML e pedir aceite do professor/mentor para a
> divergência de formato. A decisão foi revertida por escolha do grupo: o guia diz que a entrega
> **deve** ser feita em Figma, e negociar dispensa custava mais do que construir.

**O protótipo:** https://www.figma.com/design/HBBd4GyVRjd7C3WgJ4jnpL

Nove telas de 375×812 (`#/entrar`, `#/hoje`, `#/chamada`, `#/ciclo`, `#/observacao/:id`,
`#/turma`, `#/consentimentos`, `#/painel`, `#/sintese`), três papéis, 12 ligações de clique e
ponto de partida definido. As cores vêm de uma coleção de variáveis com os modos Claro e Escuro,
com os tokens verbatim de `public/styles.css` — o protótipo e o MVP não podem divergir de cor por
acidente. A legenda no próprio arquivo mapeia cada tela à User Story que ela demonstra e ao teste
automatizado que a prova.

O protótipo HTML em `prototipo-figma/` **continua no repositório**, como registro da etapa em que
ele foi o artefato. Documentação de suporte da entrega: [`ARTEFATO-SEMANA-5.md`](ARTEFATO-SEMANA-5.md).

- [x] Protótipo navegável em Figma, com fidelidade média/alta.
- [ ] Validação com pelo menos um usuário real — **continua pendente** (§4). É a última exigência
      em aberto do artefato de tecnologia da semana 5.

---

## Demo para o grupo no celular (25/08/2026)

Qualquer membro com Mac roda `ai/scripts/demo-celular.sh` (requisitos:
`brew install cloudflared qrencode`; modelos via `ai/scripts/setup-model.sh`) e aponta a câmera
do celular para o QR — iPhone e Android abrem o Percurso instalável com voz funcionando. A URL é
pública, efêmera e morre no Ctrl+C (decisão 25 — demonstração, nunca operação). Para instalar em
outro computador (inclusive o do Instituto): `docs/MANUAL-DE-INSTALACAO.md`.
