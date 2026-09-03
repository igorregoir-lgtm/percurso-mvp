# 13 · Plano de atualização do repositório — 02/09/2026

> **O que este documento é.** O inventário do que mudou no artefato desde a visita de campo
> (29/08/2026), o que ficou **incoerente** por causa dessas mudanças, e o que fazer a respeito —
> incluindo o protótipo navegável completo, que é a última peça do artefato ainda declarada
> pendente.
>
> **Método.** Nada aqui é impressão. Cada achado tem arquivo, linha e o comando que o comprova.
> Os números de gate foram medidos nesta sessão, não copiados de documento anterior.

---

## 1. O que mudou desde a visita — o inventário

Base de comparação: `e2da4a4~1` (último commit antes de E1 pós-visita) até `HEAD` (`67bcda0`).

### 1.1 Código — 17 arquivos, +2 309 linhas

| Arquivo | O que entrou |
|---|---|
| `src/relato.js` **novo** | relato do procedimento no padrão do conselho, gerado de campos fechados, liberado pela profissional (decisão 31) |
| `src/parecer.js` **novo** | parecer profissional-a-profissional: por código, sob consentimento específico, com revisor (decisão 32) |
| `src/recado.js` **novo** | recado da turma para os responsáveis, agregado, com link de WhatsApp sem número (decisão 33) |
| `src/planilha.js` **novo** | a rubrica falando a língua da planilha socioemocional do Instituto, mapeamento 1–4 → 0–2 (decisão 34) |
| `scripts/preparar-sessao.mjs` **novo** | prepara o banco para a sessão de validação: apaga o encontro mais recente, recalcula alertas, força o lapso |
| `src/voz.js` +218 | catálogos de procedimento/objetivo, check-in de grupo, extração da vivência |
| `src/domain.js` +186 | `turmaNaRubrica`, régua de 75%, devolução por encontro, alertas |
| `src/seed.js` +172 | papel `profissional`, turma da Vivência, 24 crianças, gerador `randVivencia` |
| `src/api.js` +135 | rotas de relato, parecer, recado, planilha; escopo de leitura do papel `profissional` |
| `public/app.js` +393 | telas de vivência, relato, recado, parecer, devolução; `NAV_PROFISSIONAL` |

### 1.2 Documentação — 31 arquivos, +2 246 linhas

Novos: `PESQUISA-WHATSAPP.md`, `PROTOTIPO-FIGMA-VALIDACAO.md`, `revisao/11-PLANO-POS-VISITA.md`,
`revisao/12-REVISAO-POS-VISITA.md`, `task-flow/` (4 arquivos + PNG).
Reescritos: `VALIDACAO-USUARIO.md` (+266, passagem para a psicóloga),
`jornada-usuario/` (jornada v2 inteira), `METODOLOGIA-VALIDACAO-PERCURSO.md` (+88),
`DECISOES-TECNICAS.md` (+120, decisões 31–34), `JORNADAS.md` (+105).

### 1.3 Decisões novas

| # | Decisão |
|---|---|
| 31 | A psicóloga é usuária; a Vivência entra **fora** da rubrica e **dentro** do registro de turma |
| 32 | Parecer profissional-a-profissional: o único dado individual que sai — por código, sob consentimento |
| 33 | A régua de 75% e o recado da turma: o produto absorve a gestão que já existe |
| 34 | A rubrica fala a língua da planilha do Instituto, com o mapeamento declarado |

### 1.4 Gates — medidos nesta sessão

```bash
node scripts/reset.mjs && node server.js &   # depois:
npm test          # 365 passaram · 0 falharam
npm run test:unit # tests 159 · pass 159 · fail 0
```

**159 unitários · 365 asserções de fluxo.** Rag: 6. IA-stub: 24.

### 1.5 Artefatos visuais criados fora do repositório

| Artefato | Onde | Estado |
|---|---|---|
| Jornada de usuário v2 | PNG no repo + board FigJam `QSzxKH22Hnevnhw7HluW6m` | pronto |
| Task flow (Exercício 03) | PNG no repo + `docs/task-flow/` | pronto |
| Protótipo navegável **entregue** (semana 5) | Figma `HBBd4GyVRjd7C3WgJ4jnpL` | 9 telas · 375×812 · pré-visita |
| Protótipo da **sessão de validação** | Figma `h6AnLVYLfpeVl2N4ie0Qzv` | 12 telas · 402×874 · psicóloga |

---

## 2. O que ficou incoerente — achados

Cada um com o comando que comprova.

### A-01 · Os números de gate estão desatualizados em três lugares — ALTO

| Arquivo | Diz | É |
|---|---|---|
| `docs/HANDOFF.md:13` | 157 unitários · 364 smoke | **159 · 365** |
| `docs/TESTES.md:20` | 157 testes unitários | **159** |
| `docs/TESTES.md:129` | somam 157 | **159** |
| `README.md:301-302` | 294 asserções · 136 unitários | **365 · 159** |

`README.md:70` já está certo (365 · 159) — o bloco de inventário de arquivos nas linhas 301–302 é
que ficou para trás. **Um documento que erra o próprio gate perde a autoridade de citar qualquer
outro número.** É o achado mais barato de corrigir e o mais caro de deixar passar.

### A-02 · A US-6 existe no artefato mas não na lista canônica de user stories — ALTO

A história que o campo abriu — *"como psicóloga da Vivência, quero contar em 40 segundos como foi o
encontro, para que o relatório do conselho exista sem eu ter que escrever à noite"* — está
implementada (decisão 31), tem protocolo de validação próprio e task flow. Mas aparece **só** em
`docs/task-flow/` e `METODOLOGIA-VALIDACAO-PERCURSO.md`.

As duas listas canônicas seguem com cinco histórias, todas de pedagoga:
`LEAN-INCEPTION.md:162-172` e `ARTEFATO-SEMANA-5.md:107-111`.

Consequência: quem lê o artefato pela documentação oficial não encontra a história que a visita
produziu, e a matriz de rastreabilidade não cobre `#/relato`, `#/recado` nem `#/parecer`.

### A-03 · O protótipo navegável não tem as telas da psicóloga — ALTO

`PENDENCIAS-DE-ENTREGA.md:38` declara, com todas as letras:

> **Telas novas no protótipo Figma**: registro de vivência, relato, régua, recado, parecer —
> o protótipo entregue tem nove telas e três papéis; a psicóloga é o quarto.

É a última pendência de artefato que **não** depende de terceiros. As nove telas entregues cobrem
educadora e coordenação; a diretoria (`#/relatorio`, `#/impacto`, `#/consulta`) também não está.
**Este plano resolve A-03 construindo o protótipo completo** — §3.

### A-04 · `prototipo-figma/README.md` descreve um artefato de outra era — MÉDIO

Lista "Entrada (Maria, Rita, Cleide) · Hoje · Chamada · Folha do dia · Olhar · Turma · Painel" e se
apresenta como *"protótipo interativo mobile (390px) fiel ao design no Figma"*. É o protótipo HTML
pré-visita, mantido no repositório como registro histórico — mas o README não diz isso, e quem abrir
a pasta vai achar que é o protótipo atual.

### A-05 · Três protótipos Figma sem hierarquia declarada — MÉDIO

`HBBd4…` (entregue), `h6AnLV…` (validação) e o completo que este plano cria. Hoje só o segundo está
documentado (`PROTOTIPO-FIGMA-VALIDACAO.md`). Sem um lugar que diga **qual é o canônico e por que os
outros existem**, a banca abre o errado.

### A-06 · O roteiro do vídeo é do fluxo da pedagoga — MÉDIO, fora do escopo deste plano

`ROTEIRO-DO-VIDEO.md` percorre `#/ciclo` e `#/observacao`. O produto mudou de persona principal.
Regravar é decisão de gente (está no §5 de `PENDENCIAS-DE-ENTREGA.md`), não de repositório —
**fica registrado aqui e não é executado.**

---

## 3. O protótipo completo — o que será construído

Resolve A-03. **Onde:** página nova no arquivo `h6AnLVYLfpeVl2N4ie0Qzv`, que já tem o design system
(variáveis de cor de `public/styles.css`, escala tipográfica, componentes Botão/Selo/Pill/Top
bar/Tab bar/Status bar). Um arquivo, um sistema, sem duplicar tokens.

**Formato: arquivo de design do Figma, não FigJam.** FigJam não tem ligações de protótipo — só
conectores de desenho. "Navegável" (dar play e percorrer clicando) só existe em arquivo de design.
Se o grupo quiser além disso um **mapa** em FigJam para apresentar, é um segundo artefato, barato
de gerar a partir das mesmas telas.

**Escopo: os quatro papéis, todas as telas que a navegação de cada um expõe.**

| Papel | Telas |
|---|---|
| Comum | Entrar |
| **Educadora** (`NAV_EDUCADOR`) | Hoje · Chamada · Ciclo · Observação · Pauta · Turma · Crianças · Ficha da criança · Refletir (copilot) |
| **Psicóloga** (`NAV_PROFISSIONAL`) | Hoje · Chamada da vivência · Contar como foi (voz) · O que entendi · Folha à mão · Relato · Recado · Ficha com parecer bloqueado |
| **Coordenação** (`NAV_COORDENACAO`) | Painel · Scores · Safras · Síntese · Consentimentos · Pessoas |
| **Diretoria** (`NAV_DIRETORIA`) | Relatório · Impacto · Perguntar (consulta) |

**27 telas**, 402 × 874 pt, uma faixa por papel, com as ligações que a barra de navegação de cada
papel realmente oferece — mais as duas travessias que contam a tese do produto e que o protótipo
entregue já trazia como navegação, não como legenda:

- `#/chamada → #/hoje` — a presença de um toque gera sozinha o alerta de ausência;
- `#/consentimentos → #/ciclo` — ativar na tela da coordenação desbloqueia a rubrica na tela da educadora.

E as duas que a visita acrescentou:

- `#/confirmar → #/hoje → #/relato` — a costura que a tarefa 4 da validação cronometra;
- `#/crianca → parecer bloqueado` — o único dado individual que sai, e por que ele não sai.

**Conteúdo das telas:** textos e números do MVP rodando com o banco do seed, como já foi feito no
protótipo de validação. Nada inventado.

---

## 4. Ordem de execução

| # | Passo | Resolve |
|---|---|---|
| 1 | Corrigir os quatro números de gate | A-01 |
| 2 | Promover a US-6 às duas listas canônicas e à matriz de rastreabilidade | A-02 |
| 3 | Construir o protótipo completo (§3) | A-03 |
| 4 | Reescrever `prototipo-figma/README.md` como registro histórico | A-04 |
| 5 | Criar um índice dos artefatos visuais com a hierarquia declarada | A-05 |
| 6 | Fechar o item de `PENDENCIAS-DE-ENTREGA.md:38` | A-03 |

## 5. O que este plano NÃO faz

- **Não regrava o vídeo** (A-06) — depende de gente.
- **Não mexe em `public/app.js`.** Há uma sessão paralela nesta máquina trabalhando na correção da
  entrada do recado na tela Hoje (branch `claude/focused-cerf-1530ff`). Tocar no mesmo arquivo aqui
  criaria conflito.
- **Não muda decisão de produto.** Nenhum achado acima é de arquitetura; são de coerência entre o
  que o repositório faz e o que ele diz que faz.

---

## 6. Revisão do plano — o que não sobreviveu à verificação

Feita contra os arquivos, não contra a memória de quem escreveu a §1–§5. Três correções e um
achado novo.

### R-01 · A conta das telas estava errada — corrigida

A §3 dizia **28 telas**. A soma da própria tabela é **27**: 1 comum + 9 educadora + 8 psicóloga +
6 coordenação + 3 diretoria. Vale como aviso sobre o resto do plano: número que ninguém somou é
número que ninguém conferiu.

### R-02 · O achado A-06 estava mal descrito — reescrito

A §2 dizia que `ROTEIRO-DO-VIDEO.md` *"é do fluxo da pedagoga"* e *"percorre `#/ciclo` e
`#/observacao`"*. Falso por omissão: o roteiro tem **12 blocos e cobre os quatro papéis** —
`#/copilot`, `#/painel`, `#/scores`, `#/sintese`, `#/relatorio`, `#/impacto` estão todos lá.

O problema real é outro, e é mais específico: **o roteiro é anterior às decisões 31–34**. Não há
bloco de registro de vivência, relato do conselho, recado ou parecer — exatamente as quatro coisas
que a visita produziu. A correção continua sendo humana (regravar), mas agora está nomeada pelo
motivo certo.

### R-03 · O plano ia mexer em documento que a sessão paralela pode tocar — restrição mantida, escopo ampliado

A §5 já protegia `public/app.js`. Falta dizer que a mesma sessão paralela pode editar
`docs/VALIDACAO-USUARIO.md` §2 (onde a ressalva sobre o botão do recado está escrita) e
`scripts/preparar-sessao.mjs` (onde o aviso de dia não letivo está). **Nenhum dos três entra neste
plano.** O que o passo 5 cria é um índice novo, que não colide.

### A-07 · O repositório atribui três papéis a um protótipo que tem telas de dois — NOVO, MÉDIO

`ARTEFATO-SEMANA-5.md:28` e `PENDENCIAS-DE-ENTREGA.md:174` descrevem o protótipo entregue como
*"nove telas … três papéis"*. As nove telas do arquivo `HBBd4…`, lidas pelo próprio Figma, são:
`#/entrar`, `#/hoje`, `#/chamada`, `#/ciclo`, `#/observacao`, `#/turma` (educadora) e
`#/consentimentos`, `#/painel`, `#/sintese` (coordenação). **Dois papéis com tela, não três** — a
diretoria aparece como perfil na tela de entrada e em nenhuma tela própria.

É o mesmo tipo de erro do A-01: um número que a documentação afirma e o artefato não sustenta.
Entra na ordem de execução como parte do passo 5.

### O que a revisão confirmou

| Achado | Verificação |
|---|---|
| A-01 | `HANDOFF.md:13`, `TESTES.md:20`, `TESTES.md:129`, `README.md:301-302` conferidos linha a linha; gates remedidos |
| A-02 | `LEAN-INCEPTION.md:162` = "As cinco user stories"; `ARTEFATO-SEMANA-5.md:107-111` = US-1 a US-5, todas de pedagoga ou coordenação |
| A-03 | `PENDENCIAS-DE-ENTREGA.md:38` citado literalmente |
| A-04 | `prototipo-figma/README.md` lido: "390px", telas pré-visita, sem marca de histórico |
| A-05 | os três arquivos existem; só um está documentado |

### Ordem de execução revisada

| # | Passo | Resolve |
|---|---|---|
| 1 | Corrigir os quatro números de gate | A-01 |
| 2 | Promover a US-6 às duas listas canônicas | A-02 |
| 3 | **Construir o protótipo completo — 27 telas, quatro papéis** | A-03 |
| 4 | Reescrever `prototipo-figma/README.md` como registro histórico | A-04 |
| 5 | Índice dos artefatos visuais, com a hierarquia declarada **e a contagem de papéis corrigida** | A-05 · A-07 |
| 6 | Fechar o item de `PENDENCIAS-DE-ENTREGA.md:38` | A-03 |
| — | Roteiro do vídeo: registrado como pendência humana, com o motivo correto | A-06 |

---

## 7. Execução — o que foi feito

Todos os passos da §6 foram executados nesta sessão, exceto o que depende de gente.

| # | Passo | Resultado |
|---|---|---|
| 1 | Números de gate | `README.md:301-302`, `TESTES.md:20`, `TESTES.md:129` e `HANDOFF.md:13` agora dizem **159 unitários · 365 smoke** |
| 2 | US-6 | promovida a `LEAN-INCEPTION.md` §5 e à matriz de `ARTEFATO-SEMANA-5.md` §3, com a procedência declarada e a prova automatizada apontada (smoke §24 e §26) |
| 3 | **Protótipo completo** | **27 telas · 4 papéis · 152 ligações**, na página *Protótipo completo · 4 papéis* de [`h6AnLVYLfpeVl2N4ie0Qzv`](https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv). Verificado: nenhuma tela sem entrada, nenhuma sem saída, nenhum texto colapsado |
| 4 | `prototipo-figma/README.md` | reescrito como registro histórico, com as três coisas que nele já não batem |
| 5 | Índice dos artefatos visuais | [`ARTEFATOS-VISUAIS.md`](../ARTEFATOS-VISUAIS.md), com a hierarquia declarada e a contagem de papéis corrigida (A-07) |
| 6 | Pendência de `PENDENCIAS-DE-ENTREGA.md:38` | fechada |
| — | A-06 (roteiro do vídeo) | **roteiro reescrito em 03/09/2026** (v3): bloco da psicóloga com cinco cenas, mais a consulta, dentro dos mesmos 7m00. **Regravar continua pendência humana** — o roteiro é o que dá para fazer aqui |

### Dois achados que só apareceram durante a construção

- **O protótipo entregue mostra a rubrica errada.** Não só as cinco dimensões antigas: as **âncoras
  também mudaram** com a decisão 34. A de nível 1 de Expressão emocional era *"Não nomeia o que
  sente, mesmo perguntada"* e hoje é *"Não nomeia o que sente; demonstra por reação física (chorar,
  sair, bater na mesa)"*. Está registrado em `ARTEFATOS-VISUAIS.md`.
- **A consulta em linguagem natural classifica mal uma pergunta plausível.** `POST /api/consulta`
  com *"quantas crianças estão em risco de sair?"* devolvia a intenção `contagem` e respondia com o
  total de crianças únicas e matrículas — resposta correta para outra pergunta. Não era erro de dado
  (o número vem de SQL), era de classificação de intenção.

  > **Corrigido em 03/09/2026**, em três commits (`82ae4fa`, `db2fb30`, `939e6d9`). A causa de fundo
  > era sempre a mesma: regra de desempate implícita. Primeiro a ordem da lista (`contagem` estava em
  > primeiro e engolia o assunto), depois o comprimento do termo (`'alerta'` e `'faltas'` têm seis
  > letras e empatavam). A regra agora é explícita e está declarada no código, em três passadas:
  > assunto por termo forte, assunto por termo fraco, fórmula de contagem. A tela 27 do protótipo
  > completo mostra o comportamento corrigido — duas perguntas que começam igual caindo em assuntos
  > diferentes. Gates: 163 unitários · 368 smoke.
