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
| `crianca` | A pessoa atendida. Entidade única. | `codigo` (EBZ-0001), `nome`, `nascimento`, `responsavel`, `ativo` |
| `matricula` | Relação criança × programa × turma × período | `crianca_id`, `programa_id`, `turma_id`, `entrada`, `saida`, `status` |
| `programa` | Os quatro programas do Instituto | `nome`, `faixa`, `cadencia`, `no_escopo`, `nota` |
| `turma` | Recorte operacional do programa, com educador responsável | `programa_id`, `nome`, `turno`, `educador_id` |
| `educador` | Quem opera o sistema | `nome`, `apelido`, `papel` (`educador` \| `coordenacao` \| `diretoria`) |
| `encontro` | Um dia de aula de uma turma | `turma_id`, `data`, `registrado_por`, `registrado_em` |
| `presenca` | Uma criança em um encontro | `encontro_id`, `crianca_id`, `status` (`P` \| `F`) |
| `ciclo` | Janela de observação (2–3×/ano) | `nome`, `ano`, `ordem`, `inicio`, `fim`, `status` |
| `dimensao` | As 5 dimensões da rubrica | `codigo`, `nome`, `descricao`, `ordem` |
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
| `folha` | **Folha do dia — registro da TURMA.** Não tem, por construção, nenhuma coluna que aponte para criança. | `encontro_id` (único), `atividade`, `area_tematica`, `pediram_ajuda`, `origem` (`voz` \| `manual`), `confianca`, `campos_sugeridos`, `campos_editados`, `conteudo_excluido`, `confirmado_por`, `status` |
| `folha_marcador` | Marcadores de como foi o grupo, dentro de lista fechada | `folha_id`, `marcador` |
| `aspiracao` | Área que a criança nomeou no Laboratório de Sonhos | `crianca_id`, `area`, `declarada_em` |
| `atividade_area` | Atividade de uma área temática realizada por uma turma — o denominador do score de exposição | `turma_id`, `area`, `data`, `origem` |
| `pauta` | A sugestão da semana e a decisão da educadora. O **descarte** é o dado que mede o agente. | `turma_id`, `semana`, `sugestao_codigo`, `decisao` (`aceita` \| `descartada`), `decidido_por` |
| `relatorio` | O artefato do doador: blocos, texto, supressões aplicadas e publicação | `tipo` (`ciclo` \| `carta`), `periodo`, `blocos_json`, `texto`, `revisor_status`, `supressoes_json`, `status`, `publicado_por` |
| `importacao` | Log da ingestão retroativa: quantas crianças, quantas grafias unificadas, o que foi descartado e por quê | `origem`, `linhas`, `criancas_novas`, `reconhecidas`, `duplicatas`, `relatorio_json`, `executado_por` |

**O que NÃO existe como tabela, e é o ponto:** áudio, transcrição e score individual de
desenvolvimento. O áudio nunca sai do navegador; a transcrição vive em memória durante uma
requisição; o score de evasão é recalculado a cada consulta e nunca historiado.

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
| **`folha` não tem `crianca_id`** | Registro individual disfarçado de folha de turma |
| `CHECK nivel BETWEEN 1 AND 4` | Nota fora da escala da rubrica |
| `consentimento.campo → governanca_campo` | Consentimento para um campo que não declarou base legal |

A última é a mais importante: **é impossível gravar consentimento para um campo que não tenha as
quatro respostas do bloco 6.** A regra virou chave estrangeira.

## A tabela de governança, como está semeada

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

| Item | Volume |
|---|---|
| Crianças (ativas + egressas) | 132 |
| Crianças ativas únicas | 106 |
| Matrículas ativas | 120 (14 crianças em 2 programas) |
| Encontros registrados | 182 |
| Registros de presença | 3749 |
| Observações (2 ciclos) | 166 |
| Consentimentos pendentes | 4 |
| Folhas do dia | 143 (sendo 33 por voz) |
| Aspirações declaradas | 43 |
| Atividades por área temática | 121 |
| Pautas decididas (aceite/descarte) | 16 |

A geração é determinística (PRNG com semente fixa em `src/seed.js`): rodar `node scripts/reset.mjs`
duas vezes produz exatamente o mesmo banco, o que torna os testes reproduzíveis.
