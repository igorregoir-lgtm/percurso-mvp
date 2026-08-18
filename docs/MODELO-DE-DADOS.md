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
                │          │
                │          └──< crianca >──┬──< consentimento >── governanca_campo
                │                          │
                └──< encontro ──< presenca ┤
                                           ├──< observacao ──< observacao_item >── dimensao ──< ancora
                                           │        │
                                  ciclo ───┘        │
                                    │               │
                                    └──< sintese    └──< alerta

educador ──< atividade          (lastro do anti-abandono: quando cada pessoa registrou)
```

## Entidades

| Tabela | O que é | Campos-chave |
|---|---|---|
| `crianca` | A pessoa atendida. Entidade única. | `codigo` (EBZ-0001), `nome`, `nascimento`, `responsavel`, `ativo` |
| `matricula` | Relação criança × programa × turma × período | `crianca_id`, `programa_id`, `turma_id`, `entrada`, `saida`, `status` |
| `programa` | Os quatro programas do Instituto | `nome`, `faixa`, `cadencia`, `no_escopo`, `nota` |
| `turma` | Recorte operacional do programa, com educador responsável | `programa_id`, `nome`, `turno`, `educador_id` |
| `educador` | Quem opera o sistema | `nome`, `apelido`, `papel` (`educador` \| `coordenacao`) |
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

## Restrições que carregam regra de negócio

| Restrição | O que impede |
|---|---|
| `UNIQUE (ciclo_id, crianca_id)` em `observacao` | Duas observações da mesma criança no mesmo ciclo |
| `UNIQUE (observacao_id, dimensao_id)` | Dois níveis marcados na mesma dimensão |
| `UNIQUE (encontro_id, crianca_id)` | Presença duplicada |
| `UNIQUE (turma_id, data)` em `encontro` | Duas chamadas no mesmo dia |
| `UNIQUE (crianca_id, campo)` em `consentimento` | Estado ambíguo de consentimento |
| `CHECK nivel BETWEEN 1 AND 4` | Nota fora da escala da rubrica |
| `consentimento.campo → governanca_campo` | Consentimento para um campo que não declarou base legal |

A última é a mais importante: **é impossível gravar consentimento para um campo que não tenha as
quatro respostas do bloco 6.** A regra virou chave estrangeira.

## A tabela de governança, como está semeada

| Campo | Base legal | Titular | Acesso | Retenção |
|---|---|---|---|---|
| Presença | Legítimo interesse (LGPD Art. 7º, IX) | Organização | Equipe do programa | 5 anos |
| Rubrica socioemocional | Consentimento específico do responsável (Art. 14) | Organização | Educador da criança + coordenação | Enquanto ativa + 2 anos |
| Campo livre da observação | Consentimento específico do responsável (Art. 14) | Organização | Educador que registrou | Descarte ao fim do ciclo |
| Conteúdo clínico | **Fora do sistema por construção** — sigilo profissional | Psicóloga | Ninguém, no Percurso | Não coletado |

## O que o modelo não guarda, por decisão

- Conteúdo de atendimento psicológico individual — sem tabela, sem campo, sem coluna.
- Diagnóstico, hipótese diagnóstica ou qualquer classificação clínica de criança.
- Texto livre que fale de vida íntima ou familiar: o filtro de perímetro (`src/domain.js`,
  `filtrarPerimetro`) descarta o trecho **antes** do `INSERT`. O conteúdo bloqueado nunca chega ao
  disco — não é apagado depois, não é gravado nunca.

## Dados sintéticos semeados

| Item | Volume |
|---|---|
| Crianças (ativas + egressas) | 132 |
| Crianças ativas únicas | 106 |
| Matrículas ativas | 120 (14 crianças em 2 programas) |
| Encontros registrados | 179 |
| Registros de presença | 3.691 |
| Observações (2 ciclos) | 162 |
| Consentimentos pendentes | 4 |

A geração é determinística (PRNG com semente fixa em `src/seed.js`): rodar `node scripts/reset.mjs`
duas vezes produz exatamente o mesmo banco, o que torna os testes reproduzíveis.
