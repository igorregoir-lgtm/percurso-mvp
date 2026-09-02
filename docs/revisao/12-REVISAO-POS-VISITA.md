# Revisão adversarial da implementação pós-visita — e o ciclo de correção

> Par do [`11-PLANO-POS-VISITA.md`](11-PLANO-POS-VISITA.md). O método é o de sempre: plano →
> revisão do plano → implementação → **revisão da implementação** → correção, em ciclo. Aqui está
> o que a revisão achou depois das etapas E1–E8, o que foi corrigido no mesmo ciclo, o que ficou
> declarado como limite e o que só gente resolve.

Data: 02/09/2026. Estado ao fim do ciclo: **157 unitários · 364 smoke · 6 rag · 24 ia-stub**, todos
verdes; oito commits (E1, E2+E8a, E3–E6, E7, E8b, revisão).

---

## 1. Como a revisão foi feita

1. **Leitura do que cada tela mostra à psicóloga**, no navegador, logada como ela — porque
   dado que nenhuma tela mostra não é dado verificado (lição do handoff de 25/08).
2. **Consulta ao grafo** (`graphify query`) para conferir que os módulos novos (`planilha`,
   `relato`, `recado`, `parecer`) estão ligados ao domínio e às rotas, e não órfãos.
3. **Leitura adversarial** das funções novas com a pergunta única do bloco 6: *por onde um dado
   individual poderia sair, ou um clínico entrar?*
4. **Os testes como oráculo**: cada achado corrigido ganhou teste que reproduz o defeito antes.

---

## 2. Achados corrigidos neste ciclo

| # | Achado | Gravidade | Correção | Prova |
|---|---|---|---|---|
| R-01 | **A régua de presença omitia criança.** O `LEFT JOIN` filtrava o encontro no `WHERE`: criança matriculada na turma, com presença só em outra turma e ainda nenhuma nesta, sumia da lista — exatamente quem a régua tem que mostrar como *sem base*. | alta | filtro de encontro movido para dentro do `JOIN` (`reguaDaTurma`) | unitário "criança sem presença nesta turma aparece como sem_base" |
| R-02 | **A agenda do ciclo vazava no painel da turma da Vivência.** `GET /api/hoje` e `GET /api/ciclo/agenda` já recusavam (decisão 31), mas `GET /api/turma/painel` devolvia `agenda` para qualquer turma — a tela `#/turma` da psicóloga mostraria "cobertura do ciclo" de um ciclo que não existe para ela. | média | `agenda` só com `turmaNaRubrica`; `na_rubrica` na resposta | smoke 24 (Hoje sem agenda) + leitura da tela |
| R-03 | **A tabela do doador desmentia o texto.** O bloco 1 dizia "120 matrículas ativas" e a tabela por programa, que agora inclui a Vivência, somava 144. | média | `cobertura.matriculas_adicionais` e a frase *"(mais 24 na Vivência terapêutica, programa adicional…)"* | smoke 16 continua verde; leitura do relatório |
| R-04 | **A pauta de segunda invadia o Hoje da psicóloga.** A lacuna de exposição ("Saúde sem atividade") e a sugestão de atividade apareciam para a Vivência — que não tem Pauta na navegação e não pediu atividade. O risco de sair, esse sim, é dela. | baixa | para turma fora da rubrica, `pauta` sai sem `exposicao` nem `sugestao` | leitura da tela |
| R-05 | **Sequência sintética deslocada** (achado durante a E7): o consentimento novo do parecer consumia `pick()` do gerador principal e mudava tudo o que vinha depois — o smoke da pauta quebrou por isso. | alta (para a reprodutibilidade) | o consentimento do parecer nasce pendente sem consumir o gerador; regra registrada na decisão 32 e no handoff | smoke 13 voltou a passar; invariantes 120/106/14 no unitário |
| R-06 | **`Response.text()` descarta o BOM.** O CSV saía certo e o teste dizia que não. | baixa | teste pelos bytes (`EF BB BF`) | smoke 25 |
| R-07 | **Regex literal com `\\s` escrito por script** virava barra literal em duas linhas do extrator: "sem conflito nenhum" e "todo mundo foi observado" não zeravam os campos. | média | corrigido; o teste unitário do extrator pega os dois casos | unitário "o extrator lê as contagens" |
| R-08 | **A taxa de correção do extrator mudou de denominador** (5 campos, com o check-in) e o smoke esperava 4. | baixa | asserção e comentário atualizados: o check-in conta como UM campo | smoke 11 |

---

## 3. O que a revisão viu e decidiu NÃO mudar (limites declarados)

- **A psicóloga não tem "Refletir" na navegação.** O copilot continua acessível pela rota e pelo
  Passo, mas o campo foi claro: ela não sente falta de atividade nem de reflexão guiada — sente
  falta de registrar. Colocar a IA na frente dela seria o erro F1 do cartão de campo.
- **O consentimento do parecer se registra pela ficha da criança** (coordenação), não pela tela
  de Consentimentos, que continua listando só a rubrica. É deliberado: o pedido ao responsável é
  outro, feito quando a pergunta do parceiro aparece — não um checkbox a mais no cadastro.
- **O relato e o recado não persistem texto.** São gerados sob demanda dos campos fechados; o que
  fica é a liberação (relato) e nada (recado). Persistir texto seria uma segunda cópia do dado.
- **O extrator do check-in é lexical.** "Umas seis participaram" fica em branco. É o mesmo
  limite declarado do extrator da folha (decisão 13); a taxa de correção mede isso.
- **A neutralização do perímetro é uma lista fechada.** Um sintagma novo do procedimento volta a
  ser barrado — e é assim que tem que ser: a lista cresce com a psicóloga, nunca por inferência.
- **O parecer usa a presença de todas as turmas da criança** (histórico), não da régua de uma
  turma. Para um parceiro, "vem a 69% dos encontros" é a pergunta certa; a régua por turma é a
  ferramenta interna da casa.

---

## 4. O que só gente resolve (foi para `PENDENCIAS-DE-ENTREGA.md` §1b)

O modelo de relatório do conselho; o aval sobre as seis rubricas e o mapeamento 1–4 → 0–2; o
retorno da psicóloga sobre o protótipo e a sessão com o protocolo de tarefas; os notebooks
doados; as telas novas no Figma; o registro feito pelas famílias.

---

## 5. O grafo

`graphify --update` na raiz do produto exige chave de LLM para reextrair os 81 documentos
(inclusive as transcrições da visita); **sem chave, a atualização foi feita só do código**
(`--code-only`): 1.208 nós e 2.166 arestas, com os 33 símbolos dos quatro módulos novos ligados
ao domínio (`reguaDaTurma → chamada/criancasDaTurma`, `gerarParecer → consentimentoDe /
revisarSobreAlegacao / fichaCrianca`, `relatoDoProcedimento → folhaDe / turmaNaRubrica`). A
reextração dos documentos fica para uma sessão com chave — e `graphify-out/` passou a ser
ignorado pelo git, porque o corpus da visita tem nomes.

---

## 6. Segundo ciclo — o que a revisão deixa como plano

| # | Item | Etapa | Estado |
|---|---|---|---|
| C-01 | Reextrair os documentos no grafo (com chave) e rodar `graphify cluster-only` para nomear as comunidades novas | grafo | pendente — exige chave |
| C-02 | Sessão de teste com o protocolo (`VALIDACAO-USUARIO.md`), com a psicóloga como participante, e o registro do resultado no §6 | validação | pendente — humano |
| C-03 | Substituir o template do relato pelo modelo do conselho quando chegar; manter os campos fechados | relato | pendente — insumo externo |
| C-04 | Medir a taxa de correção do check-in na operação; se passar de 40%, o formulário vence a voz (mesmo critério da decisão 13) | extrator | pendente — operação |
| C-05 | Telas novas no protótipo Figma (registro de vivência, relato, régua, recado, parecer) e o quarto papel | entrega | pendente — humano |
| C-06 | Regravar o vídeo com o fluxo da psicóloga (roteiro v2 já prevê a voz; falta a vivência) | entrega | pendente — humano |

Nenhum item do segundo ciclo é bloqueante para o MVP funcionar: o que ficou é insumo externo,
sessão com gente ou trabalho de apresentação.
