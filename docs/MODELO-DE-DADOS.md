# Modelo de dados

SQLite (arquivo único em `data/percurso.db`), chaves estrangeiras ativas, esquema criado
automaticamente em `src/db.js`.

## A decisão que organiza tudo

O dossiê aponta uma inconsistência no bloco 3: *"60, 40 e 20 somam exatamente 120 — mas o
Laboratório de Sonhos e o reforço escolar atendem a mesma faixa etária, o que sugere que há
crianças matriculadas nos dois programas."*

O modelo resolve isso separando as duas coisas:

- **`crianca`** — a pessoa. Entidade única. Uma criança, um registro, para sempre.
- **`matricula`** — a relação `criança × programa × turma × período`. Uma criança pode ter várias.

Nos dados sintéticos: **120 matrículas ativas, 106 crianças únicas, 14 crianças em dois programas.**
Nenhuma afirmação de impacto é verificável antes que essa unidade esteja resolvida.

## Diagrama

```
educador ──< turma ──< matricula >── programa
             │  │          │
             │  │          └──< crianca >──┬──< consentimento >── governanca_campo
             │  │                          │
             │  └──< encontro ──< presenca ┤
             │         │                   ├──< observacao ──< observacao_item >── dimensao ──< ancora
             │         │                   │        │
             │         │          ciclo ───┘        ├──< alerta
             │         │            │               │
             │         │            └──< sintese    └──< aspiracao ─┐
             │         │                                            │  (área declarada
             │         └──< folha ──< folha_marcador                 │   no Laboratório
             │                                                       │   de Sonhos)
             ├──< atividade_area ─────────────────────────────────────┘
             │        (o que foi oferecido × o que foi declarado = score de exposição)
             └──< pauta        (a sugestão da semana e a decisão da educadora)

educador ──< atividade          (lastro do anti-abandono: quando cada pessoa registrou)
educador ──< relatorio          (saída para o doador: gerada, revisada, publicada)
educador ──< importacao         (log da ingestão retroativa das planilhas antigas)
```

**A folha pendura no encontro, não na criança.** Isso não é detalhe de modelagem: é a linha *"o que
cada criança fez não entra aqui, esta folha é da turma"* virando esquema. Não existe coluna em
`folha` que aponte para `crianca`.

## Entidades

| Tabela | O que é | Campos-chave |
|---|---|---|
| `crianca` | A pessoa atendida. Entidade única. | `codigo` (EBZ-0001), `nome`, `nascimento`, `responsavel`, `ativo` (0 = no arquivo) |
| `matricula` | Relação criança × programa × turma × período | `crianca_id`, `programa_id`, `turma_id`, `entrada`, `saida`, `status` |
| `programa` | Os quatro programas do Instituto. `no_escopo` = entra na rubrica por ciclo; a Vivência terapêutica fica fora da rubrica e dentro do registro de turma (decisão 31) | `nome`, `faixa`, `cadencia`, `no_escopo`, `nota` |
| `turma` | Recorte operacional do programa, com educador responsável | `programa_id`, `nome`, `turno`, `educador_id` |
| `educador` | Quem opera o sistema | `nome`, `apelido`, `papel` (`educador` \| `profissional` \| `coordenacao` \| `diretoria`), `arquivado_em` (NULL = na ativa) |
| `encontro` | Um dia de aula de uma turma | `turma_id`, `data`, `registrado_por`, `registrado_em` |
| `presenca` | Uma criança em um encontro | `encontro_id`, `crianca_id`, `status` (`P` \| `F`) |
| `ciclo` | Janela de observação (2–3×/ano) | `nome`, `ano`, `ordem`, `inicio`, `fim`, `status` |
| `dimensao` | As 6 dimensões da rubrica — os indicadores da planilha do Instituto (decisão 34) | `codigo` (AUTOC, CONV, PART, EXPR, AUTOEST, RESIL), `nome`, `descricao`, `ordem` |
| `ancora` | Descrição comportamental de cada nível (1–4) de cada dimensão | `dimensao_id`, `nivel`, `texto` |
| `observacao` | Uma criança em um ciclo, por um educador | `ciclo_id`, `crianca_id`, `educador_id`, `status` (`rascunho` \| `concluida`), `nota_livre` |
| `observacao_item` | O nível marcado em cada dimensão | `observacao_id`, `dimensao_id`, `nivel` (1–4) |
| `governanca_campo` | **Regra 3 do bloco 6**: cada campo declara base legal, titular, acesso e retenção | `campo`, `base_legal`, `titular`, `acesso`, `retencao`, `exige_consentimento` |
| `consentimento` | Consentimento do responsável, **por campo** | `crianca_id`, `campo`, `status`, `responsavel`, `data_registro` |
| `alerta` | Ausências consecutivas e sua tratativa | `crianca_id`, `tipo`, `detalhe`, `status`, `tratativa` |
| `sintese` | O texto de fecho do ciclo e sua aprovação | `ciclo_id`, `programa_id`, `texto`, `numeros_json`, `revisor_status`, `status`, `aprovado_por` |
| `atividade` | Quando cada pessoa registrou algo (sustenta a retomada sem culpa) | `educador_id`, `data`, `tipo` |

### Entidades da v2

| Tabela | O que é | Campos-chave |
|---|---|---|
| `folha` | **Folha do dia — registro da TURMA.** Não tem, por construção, nenhuma coluna que aponte para criança. Desde a decisão 31 é também o **registro de vivência**: procedimento e objetivo em lista fechada, o **check-in de grupo** (contagens, NULL = não informado) e a liberação do relato | `encontro_id` (único), `atividade`, `area_tematica`, `pediram_ajuda`, `origem` (`voz` \| `manual`), `confianca`, `campos_sugeridos`, `campos_editados`, `conteudo_excluido`, `procedimento`, `objetivo`, `ajudaram_sem_pedir`, `participaram_inteiro`, `conflitos`, `conflitos_resolvidos_conversando`, `nao_observados`, `relato_liberado_por`, `relato_liberado_em`, `confirmado_por`, `status` |
| `folha_marcador` | Marcadores de como foi o grupo, dentro de lista fechada | `folha_id`, `marcador` |
| `aspiracao` | Área que a criança nomeou no Laboratório de Sonhos | `crianca_id`, `area`, `declarada_em` |
| `atividade_area` | Atividade de uma área temática realizada por uma turma — o denominador do score de exposição | `turma_id`, `area`, `data`, `origem` |
| `pauta` | A sugestão da semana e a decisão da educadora. O **descarte** é o dado que mede o agente. | `turma_id`, `semana`, `sugestao_codigo`, `decisao` (`aceita` \| `descartada`), `decidido_por` |
| `relatorio` | O artefato do doador: blocos, texto, supressões aplicadas e publicação | `tipo` (`ciclo` \| `carta`), `periodo`, `blocos_json`, `texto`, `revisor_status`, `supressoes_json`, `status`, `publicado_por` |
| `importacao` | Log da ingestão retroativa: quantas crianças, quantas grafias unificadas, o que foi descartado e por quê | `origem`, `linhas`, `criancas_novas`, `reconhecidas`, `duplicatas`, `relatorio_json`, `executado_por` |

### Entidades pós-visita (02/09/2026)

| Tabela | O que é | Campos-chave |
|---|---|---|
| `parecer` | **O único dado individual que sai** (decisão 32): parecer a profissional parceiro, por código, gerado sob consentimento específico e válido só depois de liberado. O registro de que saiu — para quem, quando, por quem — é permanente | `crianca_id`, `destinatario`, `texto`, `numeros_json`, `revisor_status`, `status` (`rascunho` \| `liberado`), `gerado_por`, `liberado_por`, `liberado_em` |

**O que NÃO virou tabela, de propósito:** o recado da turma (decisão 33) e o relato do procedimento (decisão 31) são gerados sob demanda dos campos fechados — persistir texto seria persistir uma segunda cópia do mesmo dado. Da régua de presença nada é gravado: é leitura de `presenca`.

**O que NÃO existe como operação, e é o ponto: DELETE de pessoa.** Não há rota, função de domínio
nem gesto de interface que apague alguém deste banco — nem da equipe, nem criança. Quem sai do
pipeline vai para o **arquivo**: `educador.arquivado_em` ganha data, `crianca.ativo` vai a 0 e as
matrículas ativas são encerradas com `matricula.saida`. Os três campos são a mesma decisão
(nº 30), e ela não é estética: `observacao.educador_id` e `encontro.registrado_por` são chaves
estrangeiras — apagar a professora arrastaria ou orfanaria tudo que ela registrou, e o relatório
do doador é construído em cima desses registros. A criança que saiu **é** o dado: safra,
permanência e evasão medem exatamente a saída.

**O que NÃO existe como tabela, e é o ponto:** áudio, transcrição e score individual de
desenvolvimento. O áudio nunca sai do navegador; a transcrição vive em memória durante uma
requisição; o score de evasão é recalculado a cada consulta e nunca historiado.

## O calendário da casa (decisão 37)

```sql
CREATE TABLE calendario_excecao (
  id         INTEGER PRIMARY KEY,
  turma_id   INTEGER NOT NULL REFERENCES turma(id),
  data       TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('sem_encontro','extra')),
  motivo     TEXT,
  criado_por INTEGER REFERENCES educador(id),
  criado_em  TEXT,
  UNIQUE (turma_id, data)
);
```

**Guarda só a exceção, não o calendário.** O turno da turma já dá a regra base — Vivência aos
sábados, Reforço em dia útil. Uma tabela com uma linha por sábado do ano seria um calendário para
alguém manter à mão, e a casa cabe em duas pessoas. `temEncontro(turma, data)` é a pergunta única;
`chamadasEmAberto`, o lapso e os próximos encontros derivam dela.

**Registro retroativo não precisou de coluna nova:** `encontro.data` é quando o encontro aconteceu
e `encontro.registrado_em` é quando foi registrado. Quando os dois não batem, a tela diz — e o
registro vale igual.

## O rastro de acesso individual (decisão 38)

```sql
CREATE TABLE acesso_individual (
  id          INTEGER PRIMARY KEY,
  educador_id INTEGER NOT NULL REFERENCES educador(id),
  papel       TEXT NOT NULL,
  recurso     TEXT NOT NULL,      -- 'ficha' | 'observacao' | 'parecer' | 'trajetoria'
  crianca_id  INTEGER NOT NULL REFERENCES crianca(id),
  em          TEXT NOT NULL
);
```

**Guarda quem, o quê e quando — nunca o conteúdo lido.** O log responde *"quem viu a ficha da Yasmin
em agosto"*; virar uma segunda cópia do prontuário seria exatamente o risco que ele existe para
reduzir. A gravação mora em `exigeAcessoCrianca`, o portão único: espalhá-la por rota garantiria que
a próxima rota esqueceria.

## Sessão (decisão 51, que revogou a senha da 39)

**Nenhuma coluna.** A decisão 39 tinha posto `senha_hash` e `senha_definida_em` em `educador`; a 51
tirou as duas do esquema. O banco não guarda nada sobre entrar.

As sessões nunca moraram no banco, e continuam fora dele: **token opaco de 32 bytes em memória**,
revogável, que cai quando a pessoa é arquivada ou o servidor reinicia. É o que separa entrar de
forjar — o cookie não é o id.

**O que isto custa está na decisão 51:** sem senha, quem alcança o endereço entra como qualquer
perfil. O que ainda protege dado individual é o papel, o escopo de turma, o consentimento e o rastro
de acesso da decisão 38.

## O campo livre de relato (decisão 40)

```sql
-- na folha, para o GRUPO: mesma base legal, mesma retenção, mesmos leitores
ALTER TABLE folha ADD COLUMN relato_grupo TEXT;

-- tabela própria, para a CRIANÇA: base legal, retenção e leitores são OUTROS
CREATE TABLE relato_crianca (
  id          INTEGER PRIMARY KEY,
  crianca_id  INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
  educador_id INTEGER NOT NULL REFERENCES educador(id),
  ciclo_id    INTEGER REFERENCES ciclo(id),
  texto       TEXT NOT NULL,
  criado_em   TEXT NOT NULL
);
```

**Por que não é uma coluna em `observacao`.** Base legal (consentimento específico × legítimo
interesse), retenção (fim do ciclo × 5 anos) e leitores são diferentes. Misturá-los faria o descarte
de um levar o outro junto — e foi essa mistura que a decisão 15 desfez.

**Nenhum módulo de saída agregada ou de modelo lê estes campos**, e isso tem gate: `unit-test.mjs`
varre `relatorio`, `sintese`, `planilha`, `scores`, `sroi`, `recado`, `copilot`, `ai-client`,
`assistente`, `redacao-modelo` e as pastas `rag/` e `aurora/`.

## A prova do consentimento (decisão 42)

```sql
CREATE TABLE consentimento_evidencia (
  id             INTEGER PRIMARY KEY,
  crianca_id     INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
  campo          TEXT NOT NULL REFERENCES governanca_campo(campo),
  arquivo        TEXT NOT NULL,   -- nome no disco; NUNCA sai para a tela
  mime           TEXT NOT NULL,
  bytes          INTEGER NOT NULL,
  duracao_s      INTEGER,
  responsavel    TEXT NOT NULL,
  registrado_por INTEGER NOT NULL REFERENCES educador(id),
  criado_em      TEXT NOT NULL
);
```

**O arquivo não está no banco nem em `public/`**: fica em `data/consentimento/`, modo `0600`, e sai
só por rota autenticada de coordenação — que registra o acesso como `consentimento_video`. A linha
guarda o que a auditoria precisa saber **sem abrir o vídeo**.

**O oposto do áudio de transcrição, de propósito.** Em `src/transcricao.js` o arquivo é apagado no
`finally`, sempre; aqui apagar é apagar a prova. Por isso os dois vivem em módulos separados, e por
isso `apagar` exige motivo — ele existe para revogação (Art. 18, VI), não para arrumar tela.

## O contato do responsável (decisão 43)

```sql
ALTER TABLE crianca ADD COLUMN responsavel_contato TEXT;   -- E.164 sem '+': 5511988887777
```

Existe por **um** motivo declarado: o boletim da criança precisa ter para onde ir. Guardado sem
máscara porque é ele que monta o link do WhatsApp; quem lê a ficha já passou pelo controle de acesso
e pelo log. **Não entra em lista, agregado nem modelo**, e o normalizador recusa o que não tem DDD —
número incompleto mandaria a ficha de uma criança para um desconhecido.

## Restrições que carregam regra de negócio

| Restrição | O que impede |
|---|---|
| `UNIQUE (ciclo_id, crianca_id)` em `observacao` | Duas observações da mesma criança no mesmo ciclo |
| `UNIQUE (observacao_id, dimensao_id)` | Dois níveis marcados na mesma dimensão |
| `UNIQUE (encontro_id, crianca_id)` | Presença duplicada |
| `UNIQUE (turma_id, data)` em `encontro` | Duas chamadas no mesmo dia |
| `UNIQUE (crianca_id, campo)` em `consentimento` | Estado ambíguo de consentimento |
| `UNIQUE (encontro_id)` em `folha` | Duas folhas para o mesmo encontro |
| `UNIQUE (turma_id, semana)` em `pauta` | Duas decisões de pauta na mesma semana |
| `UNIQUE (tipo, periodo)` em `relatorio` | Duas versões publicáveis do mesmo período |
| `CHECK pediram_ajuda BETWEEN 0 AND 30` | Contagem implausível vinda da voz |
| `CHECK origem IN ('voz','manual')` | Origem da folha fora do que o sistema sabe auditar |
| `UNIQUE` de nome em `turma` (na aplicação) | Duas turmas com o mesmo nome — a coordenação escolheria a errada no seletor |
| Turma da transferência tem de ser do **mesmo programa** | Mudar o programa de uma criança sem mudar entrada nem permanência |
| Programa de uma turma **com matrícula** não muda | Mudar, em silêncio, o programa de todas as crianças dela |
| **`folha` não tem `crianca_id`** | Registro individual disfarçado de folha de turma |
| `CHECK nivel BETWEEN 1 AND 4` | Nota fora da escala da rubrica |
| `CHECK conflitos_resolvidos_conversando <= conflitos` (e cada contagem 0–30 ou NULL) | Check-in de grupo impossível |
| `parecer.status IN ('rascunho','liberado')` + consentimento verificado na liberação | Parecer saindo sem o OK, ou depois de consentimento revogado |
| `consentimento.campo → governanca_campo` | Consentimento para um campo que não declarou base legal |

A última é a mais importante: **é impossível gravar consentimento para um campo que não tenha as
quatro respostas do bloco 6.** A regra virou chave estrangeira.

## A tabela de governança, como está semeada

> **Ela mora AQUI, não numa tela** (decisão 45, 04/09/2026). A governança é a **justificação** do
> sistema: ela decide o que nasce bloqueado e recusa campo sem base legal declarada. Isso é
> mecanismo, e mecanismo não precisa ser lido durante o trabalho — ninguém abre Consentimentos para
> ler cinco colunas de texto jurídico; abre para desbloquear a criança que está esperando. A tabela
> saiu da interface e ficou onde ela de fato serve: neste documento e em `src/seed.js`.


| Campo | Base legal | Titular | Acesso | Retenção |
|---|---|---|---|---|
| Presença | Legítimo interesse (LGPD Art. 7º, IX) | Organização | Equipe do programa | 5 anos |
| Rubrica socioemocional | Consentimento específico do responsável (Art. 14) | Organização | Educador da criança + coordenação | Enquanto ativa + 2 anos |
| Campo livre da observação | Consentimento específico do responsável (Art. 14) | Organização | Educador que registrou | Descarte ao fim do ciclo *(campo removido na v2; o fecho de ciclo apaga valores legados)* |
| Aspiração declarada (Lab. de Sonhos) | Legítimo interesse — atividade-fim (Art. 7º, IX) | Organização | Equipe do programa | Enquanto ativa |
| Folha do dia (registro da turma) | Legítimo interesse — execução do programa (Art. 7º, IX) | Organização | Equipe do programa | 5 anos |
| **Áudio da captura por voz** | **Não coletado** — descartado na transcrição, dentro do navegador | — | **Ninguém** | **Não persiste em nenhum momento** |
| **Transcrição da captura por voz** | **Não coletada** — usada em memória e descartada na confirmação | — | **Ninguém** | **Não persiste em nenhum momento** |
| Score de risco de evasão | Legítimo interesse — proteção do vínculo (Art. 7º, IX) | Organização | Coordenação e diretoria | Recalculado a cada consulta; não historiado |
| Agregado publicado no relatório | Legítimo interesse — prestação de contas (Art. 7º, IX) | Organização | Público, após revisão da diretoria | Permanente |
| Conteúdo clínico | **Fora do sistema por construção** — sigilo profissional | Psicóloga | Ninguém, no Percurso | Não coletado |
| Registro de vivência (procedimento e check-in de grupo) | Legítimo interesse — execução do programa (Art. 7º, IX) | Organização | Profissional da turma + coordenação | 5 anos |
| Parecer a profissional parceiro (por código) | Consentimento específico do responsável (Art. 14) | Organização | Profissional parceiro nomeado pela coordenação, após liberação | Registro da liberação permanente |
| Recado da turma aos responsáveis | Legítimo interesse — comunicação sobre a turma (Art. 7º, IX) | Organização | Responsáveis da turma, pelo grupo que já existe; quem envia é a pessoa | Não persiste — gerado sob demanda, só agregado |

## O que o modelo não guarda, por decisão

- Conteúdo de atendimento psicológico individual — sem tabela, sem campo, sem coluna.
- Diagnóstico, hipótese diagnóstica ou qualquer classificação clínica de criança.
- Texto livre sobre criança nomeada, em nenhum lugar. O olhar perdeu o campo na v2 (decisão 15) e
  a folha é da turma por construção de esquema.
- Áudio e transcrição da captura por voz. O filtro de perímetro (`src/domain.js`,
  `filtrarPerimetro`) descarta o trecho sensível **antes** de qualquer extração. O conteúdo
  bloqueado nunca chega ao disco — não é apagado depois, não é gravado nunca.
- Score de desenvolvimento individual. Os três scores da v2 medem vínculo em risco, cobertura do
  registro e exposição — nenhum pontua a criança.

## Dados sintéticos semeados

> Snapshot medido em 22/08/2026; a Vivência terapêutica (decisão 31, 02/09/2026) entra à parte: 2 turmas de sábado, 24 matrículas de crianças que já estão no Laboratório, encontros e folhas com check-in gerados por um segundo gerador — os invariantes abaixo não se movem. As datas da seed são relativas a *hoje*, então os volumes que
> dependem de calendário (encontros, presenças, folhas, observações, consentimentos pendentes)
> variam alguns pontos conforme o dia da semana em que o banco é semeado. **Invariantes exatos**,
> que os testes protegem: 132 crianças, 106 ativas únicas, 120 matrículas, 14 em dois programas.

| Item | Volume |
|---|---|
| Crianças (ativas + egressas) | 132 |
| Crianças ativas únicas | 106 |
| Matrículas ativas (programas do dossiê) | 120 (14 crianças em 2 programas) |
| Matrículas na Vivência terapêutica (à parte) | 24 |
| Encontros registrados | 182 |
| Registros de presença | 3749 |
| Observações (2 ciclos, 6 dimensões) | 166 |
| Consentimentos pendentes (rubrica) | 4 |
| Consentimentos de parecer a parceiro | todos pendentes (é outro pedido ao responsável) |
| Folhas do dia | 143 (sendo 33 por voz) |
| Aspirações declaradas | 43 |
| Atividades por área temática | 121 |
| Pautas decididas (aceite/descarte) | 16 |

A geração é determinística (PRNG com semente fixa em `src/seed.js`): rodar `node scripts/reset.mjs`
duas vezes produz exatamente o mesmo banco, o que torna os testes reproduzíveis.

## Bancos derivados da camada de IA (v3)

O banco operacional (`data/percurso.db`) **não** ganhou tabela nenhuma na v3 — e não pode ganhar
FTS5 nunca: a migração por assinatura de DDL (decisão 14) derruba e recria o esquema, e o drop não
sobrevive às shadow tables de uma virtual table. A camada de IA vive em artefatos derivados:

| Arquivo | O que é | Fonte de verdade |
|---|---|---|
| `data/rag/corpus.db` | índice FTS5 do corpus do copilot (`chunk` + `chunk_fts`) | `data/rag/manifest.json` + `data/rag/corpus/*.txt` — reconstruível por `node src/rag/ingest.mjs`; não entra no git |
| `data/ai-doacoes.jsonl` | interações doadas explicitamente pelos pedagogos (anonimizadas) | ato da pessoa; revogável por id; não entra no git |
| `data/sroi/premissas.json` | proxies do SROI com fonte, ano-base e ressalva | versionado no git; é config, não banco |

## Costura da âncora acadêmica (M2, deferida)

O M2 (nota do parceiro educacional) segue deferido até o canal mediado responder à pergunta 2 do
bloco 7 — mas o esquema **já comporta** a série sem migração destrutiva. A extensão proposta é uma
tabela nova, sem tocar nas existentes:

```sql
CREATE TABLE serie_academica (
  id          INTEGER PRIMARY KEY,
  crianca_id  INTEGER NOT NULL REFERENCES crianca(id) ON DELETE CASCADE,
  fonte       TEXT NOT NULL,            -- 'parceiro-educacional'
  periodo     TEXT NOT NULL,            -- '2026-1' (semestre/ano do parceiro)
  disciplina  TEXT NOT NULL,            -- portugues | matematica | ingles
  medida      TEXT NOT NULL,            -- escala DECLARADA pelo parceiro (pergunta 2 em aberto)
  valor       TEXT NOT NULL,            -- valor na escala original, sem conversão
  importado_em TEXT NOT NULL,
  UNIQUE (crianca_id, fonte, periodo, disciplina)
);
```

Decisões embutidas na costura: o valor entra **na escala original do parceiro** (sem converter
para a rubrica — são instrumentos diferentes); a série é aditiva (`trajetoriaCrianca` ganha uma
série ao lado, nunca uma média combinada); e a governança exige linha própria em
`governanca_campo` (base legal + consentimento) **antes** do primeiro dado real — mesmo padrão da
rubrica. Como todo o dado atual é sintético, ativar a tabela é acrescentá-la ao `ESQUEMA_SQL`
(a assinatura muda e o banco recria — decisão 14); com dado real, vira `ALTER TABLE` incremental.
