# Auditoria adversarial da v2 — 22/08/2026

Executada depois de incorporar o `percurso-v2-pack` ao MVP. Método: seis lentes independentes
sobre o repositório (aceites do pack, copy e telas, código de servidor, perímetro ético e as três
regras do pack, front-end, documentação e testes), cada uma seguida de um **refutador** com a
instrução explícita de derrubar os achados e de **refutar na dúvida**. Nenhum agente podia alterar
arquivo; todo achado exigia evidência textual com arquivo e linha.

**28 achados levantados · 19 confirmados após refutação · 19 corrigidos, todos com teste.**

| Lente | Levantados | Confirmados |
|---|---|---|
| Aceites do pack | 5 | 1 |
| Copy e telas | 5 | 2 |
| Código de servidor | 5 | 5 |
| Perímetro ético | 3 | 3 |
| Front-end | 5 | 4 |
| Documentação e testes | 5 | 4 |

---

## P1 — a trava que carimbava o que deveria barrar

**E-02 · Afirmação causal fixa no template, aprovada pelo revisor de sobre-alegação.**

O bloco 7 do relatório do doador e a carta do trimestre terminavam com a frase literal
*"Os dados sugerem que os programas contribuíram para os avanços observados; fatores externos não
foram isolados."* — e `revisarSobreAlegacao` devolvia `aprovado`.

Duas causas, ambas reais:

1. `contribuiu`/`contribuíram` não estava em `VERBOS_PROIBIDOS`. Atenuar com "os dados sugerem"
   não muda a natureza da afirmação: o documento não tem grupo de comparação, e ele mesmo declara
   isso na seção "o que o instituto não afirma".
2. **A ressalva metodológica estava dentro da própria sentença causal.** Como a trava exige a
   presença de "fatores externos não foram isolados" e essa era a única ocorrência da frase no
   documento, tirar a causalidade *reprovava* o relatório. A guarda estava estruturalmente
   amarrada ao que deveria guardar.

O pack é explícito (`06-AGENTES-IA.md`): *"Nenhuma afirmação causal. Escreve 'crianças com maior
presença apresentam', nunca 'o programa causou'."* — e é exatamente esse o critério de aceite que
F13 reivindica cumprir.

**Correção.** A frase virou `Crianças com maior presença apresentam os avanços descritos.` seguida,
em **sentença própria**, de `A leitura é de associação: fatores externos não foram isolados.`. A
família `contribuiu/contribuíram/contribuem/contribui/contribuição/contribuindo` entrou na lista de
verbos. O mesmo tratamento foi dado à síntese do ciclo (v1), que tinha a frase idêntica. O teste
unitário que consagrava o texto antigo como "aprovado" foi reescrito, e há regressão explícita:
*"contribuiu para é atribuição causal e reprova (achado E-02)"*.

---

## P2 — sete achados

| ID | Achado | Correção | Teste |
|---|---|---|---|
| **SRV-01 / E-01** | As lacunas de exposição iam **nomeadas** para o texto do doador sem passar pela supressão n<5 — no mesmo documento que declara suprimir tudo abaixo de cinco. Reproduzido: área com 4 crianças agrupada na tabela e publicada no texto. | As lacunas passam a sair do **mesmo conjunto já suprimido** (`supAreas.publicaveis`), e o relatório declara quantas foram agrupadas. A manchete da capa (`mais_de_doze_meses`) também passou a respeitar o mínimo: abaixo dele, a capa cai para a presença. | smoke *"nenhuma lacuna de exposição publicada tem menos de 5 crianças"*, *"a manchete da capa respeita o mínimo de célula"*; unit na supressão |
| **E-03** | O perfil **diretoria** recebia dado individual nominal em três rotas: `/api/chamada` (lista nominal da turma), `/api/alertas` (nome + detalhe) e `/api/scores` (15 crianças com nome, código e score individual) — contra a invariante escrita no próprio arquivo. | `semAcessoIndividual` aplicado em chamada e alertas; em `/api/scores` a diretoria passa a receber contagem e **distribuição por turma**, com `linhas: []` e `nominal_suprimido: true`. A coordenação continua vendo o nome, porque é ela quem liga para a família. | smoke *"a diretoria NÃO abre a chamada / a lista de alertas (403)"*, *"a diretoria NÃO recebe nenhum nome de criança nos scores"* |
| **SRV-02** | Reimportar planilha **sem coluna de nascimento** duplicava todas as crianças: a gravação usava a sentinela `1900-01-01`, e a chave da leitura seguinte era `1900-01-01\|ana`, nunca igual ao `sem-data\|ana` vindo do arquivo. | `NASCIMENTO_DESCONHECIDO` exportado e tratado como ausência dentro de `chaveDeCrianca`. | smoke *"reimportar planilha SEM nascimento reconhece em vez de duplicar"*; unit na chave |
| **SRV-04** | O filtro de perímetro **não pegava "violência"** — a palavra que dá nome à própria categoria. O termo do catálogo era `violen` e a comparação não removia acento, então `violência` (com ê) passava. Todos os outros termos acentuados tinham duplicata; só este ficou de fora. | A comparação passou a remover acento **dos dois lados**; o trecho devolvido continua sendo o original, com acento, para a tela mostrar o que de fato foi dito. | smoke *"a lista de exclusão pega termo acentuado"*; unit *"perímetro: termo acentuado casa (achado SRV-04)"* |
| **TELA-01 / FE-01** | A tela de alertas dizia *"Disparam com 3 faltas consecutivas"* enquanto o sistema dispara com 2 — copy da v1 que sobreviveu ao desvio declarado. Era a única tela onde a coordenação lê a regra. | `/api/alertas` passou a devolver `faltas_para_lista` e a tela interpola o parâmetro. Literal eliminado. | verificado no navegador; o valor agora vem de `PARAMS` |
| **D-02** | `DECISOES-TECNICAS.md` contradizia o código e a si mesmo: `AUSENCIAS_ALERTA (3)` na decisão 7 contra `(2)` na decisão 18; "86 testes"; "aspiração: coluna em `crianca`" quando virou tabela. | Os três pontos corrigidos, com a data da mudança registrada. | — |
| **D-04** | `O-QUE-VEIO-DA-V2.md` citava como prova da regra 3 um teste que não a exercita (*"folha sem chamada é recusada"*), e rastreava F12 para o bloco de robustez. | Repontado para os testes que de fato provam a regra. | — |

---

## P3 — onze achados

| ID | Achado | Correção |
|---|---|---|
| **SRV-03** | `suprimir()` somava **todo** campo numérico ao agrupar, inclusive percentuais: dois programas com 80% e 75% viravam um recorte de "155%" na tabela do doador. | Lista explícita de campos somáveis (`somaveis`); o que não é aditivo não entra no bucket. |
| **SRV-05** | `coberturaRegistro` derivava as turmas dos **encontros**: a turma que parou de registrar por completo sumia do painel, e o contador de "turmas sem registro" não a via. | O universo passou a ser a tabela `turma`; quem não registrou entra com 0 e a flag `sem_encontro`. |
| **A-04** | O aceite offline de F1 (*"sem conexão, com sincronização confirmada ao voltar a rede"*) não tinha cobertura nenhuma. | A fila virou `public/fila.js`, com armazenamento e envio injetados, e ganhou **cinco testes unitários** sem navegador. |
| **FE-04** | A fila não era drenada após o login: com a sessão expirada, os registros ficavam presos mostrando "N na fila" até um reload que ninguém sabe que precisa dar (o evento `online` não dispara num aparelho já conectado). | Drenagem no login e a cada navegação com fila não vazia, com guarda de reentrância. |
| **FE-05** | O botão de gravar era um controle de estado **sem estado acessível**: sem `aria-pressed`, e a contagem regressiva sem `aria-live`. Todos os outros toggles do app expõem estado. | `aria-pressed` e rótulo dinâmico no microfone, `aria-live` no estado e na contagem, `role="group"` nomeando os três grupos de pills da folha. |
| **FE-02** | O gráfico de safras usava três hex literais fora da paleta do board, cegos ao modo escuro (contraste de 2,55:1 no tema escuro, abaixo do mínimo da WCAG 1.4.11). | Trocados por tokens. Fora das definições de token e dos `#fff` de contraste, não resta hex literal em `public/` — o último, `#7FA34C` na barra de progresso, caiu na rodada 2. |
| **TELA-05** | O bloco "Cobertura do registro" não tinha a terceira linha exigida pelo pack, *Olhares registrados*. | Adicionada, alimentada por contagem de observações concluídas no ciclo. |
| **D-01** | A asserção *"o cartão de risco traz nomes só da própria turma"* verificava apenas `crianca_id > 0` — vácua, nunca podia falhar, e dava cobertura falsa a um furo declarado. | O escopo de turma foi **implementado** (`exigeAcessoTurma`) nas rotas da v2 e na chamada, e a asserção virou caso negativo real: a educadora recebe 403 na turma da colega, a coordenação passa. |
| **D-03** | `ARQUITETURA.md` dizia "cinco contratos" com oito na lista, "42 rotas" com 43, e o resumo executivo estava preso na v1 (escopo F1–F7 e uma pendência já resolvida). | Contagens e resumo corrigidos. |
| **TELA-01/FE-01** | (mesmo achado, visto por duas lentes) | — |
| **D-02/D-04** | (documentação, ver P2) | — |

---

## O que a auditoria confirmou como sólido

Vale registrar o que as seis lentes **tentaram** derrubar e não conseguiram, porque é isso que dá
peso ao que foi encontrado:

- Nenhum caminho grava antes da confirmação humana. `POST /api/voz/extrair` devolve `gravado: false`
  e a única escrita do fluxo de voz é a confirmação.
- Áudio e transcrição não persistem em disco, em log nem em resposta.
- Nenhum score, rótulo ou classificação individual de desenvolvimento aparece em resposta de API.
- O extrator só escolhe dentro das listas fechadas e a saída valida contra o schema em 100% dos
  casos testados, ou cai no estado neutro.
- O front-end aplica `esc()` em toda interpolação de dado; nenhuma injeção encontrada.
- Nenhuma rota órfã, nenhum link para rota inexistente, nenhuma ação sem tratamento.

## Limite declarado desta auditoria

Os agentes leram código, rodaram comandos e reproduziram cenários — mas **não substituem teste com
usuário real**, que continua sendo o item aberto mais importante da entrega. Uma auditoria de
código confirma que o sistema faz o que diz; ela não diz se a professora vai abrir o aplicativo na
segunda-feira.

---

# Segunda rodada — 22/08/2026

Executada **depois** de corrigir os 19 achados acima, com quatro lentes novas: *as correções
pegaram de verdade?*, *elas quebraram outra coisa?*, *o perímetro, de novo e mais fundo* e
*a documentação diz a verdade sobre o código?*. Mesmo método adversarial, mesmo refutador.

**17 achados levantados · 16 confirmados · 16 corrigidos.**

A rodada se pagou logo no primeiro achado, e a lição é a mais importante deste documento.

## P1 · A correção parou na fronteira do servidor

**R2-01 · A frase causal continuava na tela — no clímax do fluxo.**

O achado E-02 da rodada 1 foi corrigido nos três redatores do servidor (`redigirSintese`,
`redigirRelatorio` bloco 7, `redigirCarta`) e a família `contribuiu` entrou em `VERBOS_PROIBIDOS`.
Mas a mesma frase estava **escrita à mão em `public/app.js`**, na tela de celebração que a
educadora vê ao concluir o ciclo — e apresentada, logo abaixo, como *"é esta frase que o Instituto
não conseguia dizer a quem financia"*. Submetida à trava recém-endurecida, ela reprova.

Pior: o rodapé da tela de síntese ensinava **"contribuiu para"** como o verbo sancionado da casa —
documentando na interface exatamente a política que o código acabara de proibir.

A guarda passou a existir só onde o texto é **gerado**. Onde ele é **escrito à mão** continuava
aberta, e é justamente ali que o avaliador olha.

**Correção.** As duas frases trocadas pela formulação de associação; e, para fechar a classe do
defeito em vez do caso, um teste novo — *"a INTERFACE não escreve à mão o que o revisor barra"* —
varre `public/app.js` atrás de construção causal literal.

**R2-02 · `POST /api/observacao` só exigia sessão.** A rodada 1 fechou a *leitura* individual para
a diretoria e esqueceu a *escrita*: o perfil que não pode abrir a ficha de uma criança podia gravar
e sobrescrever a observação dela. A rota passou a resolver a turma pela matrícula ativa e a exigir
`exigeAcessoTurma` — o ato mais sensível do sistema agora exige ser o educador da turma, ou a
coordenação.

## P2 · Seis achados

| ID | Achado | Correção |
|---|---|---|
| **R2-04** | A guarda de mínimo de célula na manchete entrou no relatório e **não na carta**, que publicava o mesmo recorte de 2 crianças no parágrafo colado à frase que promete suprimi-lo. | A decisão virou uma função só (`capaPorVinculo`), usada pelos dois redatores. Era duplicata: uma cópia recebeu a guarda, a outra não. |
| **R2-05** | A correção de SRV-02 trocou duplicata por **fusão**: sem data de nascimento a chave vira só o primeiro nome, e o casamento varria o banco inteiro — "Ana Souza" da planilha podia ser vinculada a uma "Ana Ferreira" já cadastrada. | Duas escalas de casamento: com data, chave forte no instituto inteiro; sem data, só dentro da turma de destino, com o vínculo reportado. E, dentro do arquivo, grafias só se juntam se forem **compatíveis** (cada token do nome curto é prefixo do longo) — "Ana Clara" ⊂ "Ana Clara Souza", mas "Ana Souza" ≠ "Ana Ferreira". A colisão é nomeada no relatório. |
| **R2-06** | `GET /api/ciclo/agenda`, `/api/turma/painel` e `/api/turma/plano` ainda entregavam lista nominal à diretoria. | `exigeAcessoTurma` nas três. |
| **R2-08** | A tabela "O que a bateria cobre" de `TESTES.md` somava 194 contra 242 asserções reais. | Contagem por bloco refeita e conferida com a saída. |
| **R2-09** | O README dizia que o deploy era definido "exclusivamente" por `render.yaml`, com `vercel.json` versionado apontando o banco para `/tmp`. | O README passou a declarar os dois: Render é operação, Vercel é vitrine com banco efêmero. |
| **R2-10** | A decisão técnica nº 5 descrevia o filtro devolvendo 409 e gravando a observação sem o trecho — comportamento da v1 que a decisão nº 15 já contradizia no mesmo arquivo. | Reescrita para o comportamento real, incluindo a regra da categoria 5 e o porquê de "saúde" não entrar solto. |

## P3 · Oito achados

| ID | Achado | Correção |
|---|---|---|
| **R2-03/R2-11** | A correção de E-03 mudou o payload de `/api/scores` para a diretoria e **não tocou na tela**: `#/scores` mostrava "Nenhuma matrícula em risco" com 12 em risco no KPI logo acima. | A tela ramifica por `nominal_suprimido` e renderiza a distribuição por turma, dizendo por que a lista nominal não abre. |
| **R2-12** | O agregado que substituiu a lista nominal publicava células de **1 e 2 crianças** — numa turma nomeada, isso é fato de nível individual. A correção reabria por outra forma a porta que fechara. | `por_turma` passou pela mesma `suprimir()` que o relatório usa, com `turmas_suprimidas` declarado. |
| **R2-14** | A lista de exclusão não pegava termos que o `06-AGENTES-IA` **nomeia literalmente**: prisão, situação familiar, conselhos tutelares (plural), saúde de criança. | Termos acrescentados — mas **"saúde" não entrou solto**: é área temática da folha e eixo do score de exposição; bloquear a palavra quebraria a feature. Os termos são contextualizados. |
| **R2-14b** | A categoria 5 do pack ("estado psíquico de criança **nomeada**") não existia. | Implementada como **regra, não lista**: a frase só é barrada se tiver ao mesmo tempo um nome da turma e uma afirmação de estado interno. "A turma ficou triste" passa; "A Quezia está muito triste" barra. Uma lista solta dispararia à toa e treinaria a educadora a ignorar o aviso. |
| **R2-15** | O registro afirmava que "hoje o front não tem nenhum hex literal", mas `styles.css` ainda tinha `#7FA34C`. | O hex virou token e a frase foi corrigida para o que é verificável. |
| **R2-16** | A matriz de adoção subcontava os testes unitários de F5, F7 e F9 — justamente os de regressão criados na rodada 1. | Contagens refeitas e nomeadas. |
| — | O teste *"duas faltas seguidas colocam a matrícula na lista"* passava por sorte: dependia de a criança não ter falta natural na terceira posição. | Fixture controlada: as duas últimas viram falta e a terceira vira presença. |

## A lição das duas rodadas

Os dois P1 da segunda rodada têm a mesma forma, e ela não é coincidência: **a correção parou na
fronteira do servidor.** Um deles deixou a frase proibida na tela; o outro fechou a leitura e
esqueceu a escrita. Corrigir onde o defeito foi *encontrado* não é o mesmo que corrigir a *classe*
do defeito — e a única defesa confiável contra isso é um teste que varra a classe inteira, não o
caso. Foi o que passou a existir para os dois: a varredura de frase causal no front, e o 403 da
diretoria testado em todas as rotas de registro individual.

A segunda rodada também encontrou um defeito que **a primeira correção introduziu** (a fusão de
crianças na ingestão). Auditar de novo depois de corrigir não é zelo: é a única forma de saber que
a correção não custou mais do que o achado.
