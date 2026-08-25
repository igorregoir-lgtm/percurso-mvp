# Plano — o Passo proativo: parceiro por papel, que aprende sem vigiar

**Arquivo alvo:** `docs/revisao/09-PLANO-PASSO-PROATIVO.md` · **Data:** 25/08/2026 · **ADR alvo:** decisão 27 (a última registrada é a 26, `docs/DECISOES-TECNICAS.md:398`)
**Repositório:** `/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional`

> Escrito depois de ler, linha a linha: `src/assistente.js` (555 linhas), `src/api.js` (711), `src/domain.js` (1114), `src/scores.js` (429), `src/relatorio.js` (570), `src/voz.js` (328), `src/copilot.js` (432), `src/ai-client.js` (121), `src/db.js` (365), `src/seed.js` (367), `server.js`, `public/app.js` (3413), `public/styles.css`, `scripts/unit-test.mjs` (966), `scripts/ai-stub.mjs`, `scripts/ai-stub-test.mjs`, `scripts/reset.mjs`. Onde este plano cita linha ou coluna, foi conferido no fonte. Onde uma revisão anterior citou função inexistente, o plano diz e corrige.

---

## 0. As quatro decisões de princípio (tudo o mais decorre delas)

**D-A · O Passo passa a enxergar CONTADORES, e a doutrina 5 é substituída, não relaxada.**
Hoje `src/assistente.js:13-15` declara *"O Passo NÃO enxerga dado nenhum"* — e a UI repete isso à pessoa (`public/app.js:2704`, campos `naoEnxergo` do `GUIA`). Ancorar sugestão em estado real torna essa frase falsa. Num produto cuja história inteira de privacidade repousa em **limites declarados serem verdadeiros**, um limite que virou mentira é pior que a mudança. A frase é trocada nos quatro lugares onde aparece, no mesmo commit:

```
//   5. Dois canais, duas permissões.
//      CONVERSA (assistente()) continua CEGA: nenhum dado do banco entra no
//      prompt de uma resposta a pergunta.
//      SUGESTÃO (painelDoPasso()) enxerga um ENVELOPE de contadores do próprio
//      dia da pessoa — quantos, quantas datas, quantos dias, e nada mais.
//      Nunca um nome de criança, nunca um nome de TURMA, nunca uma ficha,
//      nunca um nível de rubrica, nunca um escore individual.
//   7. O modelo nunca escreve um NÚMERO e nunca escolhe uma AÇÃO. O texto com
//      número é template determinístico; o modelo só reescreve o RÓTULO (que
//      é livre de dígito por construção) e reordena candidatos.
```

**D-B · Nenhum número sai de modelo — nem pela porta da redação.** É o furo mais grave apontado em todas as quatro propostas. A trava é estrutural, não regex: cada sugestão tem **dois textos**, `rotulo` (sem dígito, é o único que vai ao modelo) e `texto` (com os números, template determinístico, o modelo nunca o vê nem o devolve). O resumo do dia é **template puro, nunca modelo**. `consulta_agregada` devolve o retorno de `R.consultar()` **verbatim**, sem passar pelo modelo.

**D-C · Sugestão não é cobrança — e a garantia é de composição, não de tom.** Lint de palavra pega "você não fez"; não pega o **somatório**. Regra dura: **no máximo UM item de pendência (trabalho não feito pela própria pessoa) por painel**, e as outras duas vagas são obrigatoriamente pergunta / aprimoramento / dúvida / alívio. E: a sugestão é **suprimida na tela que já mostra o mesmo fato** — `#/hoje` já pinta retomada, chamada, folha, ciclo, alertas e pauta (`public/app.js:407-545`); repetir isso dentro de um painel flutuante é ruído com um toque a mais.

**D-D · O aprendizado mora fora do banco principal e é apagável.** `getDb()` (`src/db.js:21-40`) derruba **todas** as tabelas quando a assinatura do DDL muda, e `scripts/reset.mjs` limpa. Precedente correto já existe: `data/rag/corpus.db`, conexão própria (decisão 20). O perfil de uso vive em `data/passo/uso.db`, com `PERCURSO_PASSO_DB` para os testes, vocabulário fechado, decaimento e apagamento pela própria pessoa.

---

## 1. O que muda para Maria, Rita e Solange

### 1.1 Maria Silvia (educadora) — o Passo para de repetir a tela e passa a dizer o que a tela não diz

Hoje o painel do Passo mostra três chips estáticos escritos à mão no `GUIA` (`chipsDe`, fim de `src/assistente.js`). Em `#/chamada` eles são sempre os mesmos: *"Como marco presença e falta?"*, *"Para que serve o cronômetro?"*, *"Como marco todos presentes?"* — independentemente de a chamada estar aberta, de haver oito datas em atraso ou de a turma não ter encontro hoje.

Depois:

| tipo | id | quando dispara | o que ela lê |
|---|---|---|---|
| **ação** | `edu.folha_atrasada` | existe encontro sem folha há mais de um encontro (SQL nova; `#/hoje` só mostra a folha do encontro MAIS RECENTE — `D.dataDaFolha`, `domain.js:112`) | *"O encontro de 18/08 ficou sem folha. Dá para contar como foi em 40 segundos — a data não expira."* → **Ir para Contar como foi** |
| **aprimoramento** | `edu.radar_do_registro` | `estadoDoRegistro(turma)` (`scores.js:406`) tem criança sem registro de presença há 3 encontros ou mais | *"3 crianças estão sem registro de presença há três encontros ou mais. Isso fala do REGISTRO, não delas — e é assim que alguém some do radar sem ninguém notar."* → **Ir para Chamada** |
| **pergunta** | `edu.voz_nunca_usada` | `folha.origem='voz'` = 0 e ≥3 folhas manuais | *"A voz preenche os mesmos campos da folha falando por 40 segundos. Quer que eu mostre como?"* (toque manda a pergunta ao Passo, que responde pelo `GUIA['voz']`) |
| **dúvida** | `edu.duvida.perimetro` | a última folha tem `conteudo_excluido = 1` (`db.js:270`) | *"Uma parte do que você contou ficou de fora do sistema. Isso é o filtro de proteção funcionando, não erro seu — e o caminho humano é a coordenação."* |

Na tela `#/hoje` — a de maior tráfego e a que já pinta seis cartões — ela **não** recebe "faça a chamada". Recebe a dúvida certa da tela, o alívio (`pauta.tranquila`, `scores.js:336`: *"Ninguém sumiu do radar esta semana — e isso é o seu registro, não sorte"*) e, quando cabe, o radar do registro. Em `#/observacao/:id`, no meio dos ~3 min por criança, ela recebe *"Na dúvida entre dois níveis, marque o menor"* e *"O que não deu para ver fica em branco — falta de dado é informação honesta"* — conteúdo que já existe no `GUIA` mas que hoje ela só encontra se souber perguntar.

**O que ela nunca recebe:** cobertura de registro, tempo de registro, taxa de correção do extrator, taxa de descarte — as métricas que `scores.js:224` declara literalmente que *"medem o sistema, não a professora"* e *"não aparecem em tela de educadora"*. Nem contagem de dias parada: a mensagem de retomada (`domain.js:855`) continua sendo a única a falar disso, e ela já é escrita para não cobrar.

### 1.2 Rita Amaral (coordenação) — o Passo vira a varredura que ninguém faz

O `#/painel` mostra alertas, cobertura e calibração; nenhuma tela mostra **o que está parado**.

| tipo | id | gatilho | o que ela lê |
|---|---|---|---|
| **ação** | `coo.alerta_parado` | alerta `status='aberto'` com `tratativa` vazia há >7 dias (SQL nova sobre `alerta.criado_em`) | *"2 alertas de ausência estão abertos há mais de uma semana sem tratativa. Cada um é uma família que ainda não recebeu ligação."* → **Ir para Alertas** |
| **ação** | `coo.ciclo_vencido` | `ciclo.status='aberto' AND fim < hoje` | *"O ciclo passou da data de fim e continua aberto. Enquanto ele não fecha, a síntese não sai e o relatório do doador não tem o período."* → **Ir para Síntese** |
| **aprimoramento** | `coo.descarte_alto` | `taxaDeDescarte({}).alerta` (`scores.js:383`) | *"41% das sugestões de pauta foram descartadas. Isso é o sistema se autocriticando: acima de 30% a sugestão costuma estar genérica demais para servir — vale rever o banco de atividades por dimensão com as educadoras."* → **Ir para Scores** |
| **dúvida** | `coo.duvida.supressao` | há recorte suprimido no último relatório ou na distribuição de evasão | *"Um número sumiu de uma tabela? Grupo com menos de 5 crianças é agrupado antes da redação — proteção contra reidentificação, declarada no próprio relatório."* |

**Proibido para sempre neste papel:** qualquer sugestão que recorte cobertura, tempo ou correção **por educadora**, e qualquer sugestão que **nomeie a turma**. `turma.educador_id` é 1:1 (`db.js:85`): "a turma Girassol está sem registro" **é** "a educadora X não registrou", com outro rótulo. O texto diz *"uma turma"*, e a ação leva Rita a `#/scores`, que **já renderiza a tabela por turma com nome, %, e última folha completa** (`public/app.js:1933-1938`) — ou seja, a oferta não morre no destino, e o recorte nominativo continua onde ele é legítimo: numa tela de gestão, lida por uma pessoa, fora de qualquer prompt.

### 1.3 Solange Ribeiro (diretoria) — o papel mais pobre vira o mais bem servido, e com número de verdade

Hoje ela tem 3 telas no `GUIA` e 5 chips. O ganho maior do plano está aqui, e vem de uma fonte que já é 100% SQL: as seis `INTENCOES` de `src/relatorio.js:500-546`, que `consultar()` responde com número vindo do banco.

| tipo | id | o que ela lê / o que acontece |
|---|---|---|
| **pergunta** | `dir.pergunta.evasao` (rotativa entre 6) | Chip: *"Quantas crianças estão em risco de sair?"* — e o Passo **responde ali mesmo**, com o retorno literal de `R.consultar()`: *"7 matrículas em risco de evasão de 118 avaliadas…"* + a oferta **Ir para Perguntar à base**. Hoje o chip a levaria para um campo de texto vazio (`public/app.js:2074`) para redigitar a pergunta que ela acabou de tocar. |
| **ação** | `dir.periodo_descoberto` | *"O 1º semestre de 2026 ainda não tem relatório publicado. O rascunho leva um toque."* → **Ir para Relatório** |
| **ação** | `dir.revisor_barrou` | *"O revisor de sobre-alegação barrou o rascunho. Ele barra verbo causal forte — é a linguagem protegendo o Instituto perante quem financia."* → **Ir para Relatório** |
| **aprimoramento** | `dir.custo_ausente` | *"Sem o custo do período, o bloco de eficiência publica só os denominadores. É o número que o doador pergunta primeiro."* → **Ir para Relatório** |
| **dúvida** | `dir.duvida.sroi_faixa` | *"O impacto sai como faixa e três cenários. Número único de SROI não é publicável — a faixa é o dado."* (texto derivado de `RESSALVAS_FIXAS`, `sroi/calculator.js:28`) |

Nada individual entra aqui. A recusa da decisão 16 continua valendo na conversa, intocada.

---

## 2. Arquitetura — arquivos, e o papel de cada um

### 2.1 Novos

| arquivo | responsabilidade | pode importar `db.js`? | fala com o modelo? |
|---|---|---|---|
| `src/passo/sinais.js` | **Único ponto que toca o domínio.** Lê banco/`domain`/`scores`/`relatorio` e devolve o `EnvelopeDoPasso` — objeto plano, congelado, só escalares. Memo 30 s por `(educador_id, tela, hoje())`. | **sim** | não |
| `src/passo/catalogo.js` | `CATALOGO` (~46 entradas) + `LINT_COBRANCA` + `semCobranca()` + `AVISO_SISTEMA`. Puro sobre o envelope. | **não** | não |
| `src/passo/ranking.js` | Puro: `pontuar`, `compor` (piso, teto de pendência, diversidade), `decair`. | **não** | não |
| `src/passo/orquestrador.js` | As **duas** chamadas ao Qwen, os dois schemas, os validadores de saída, os espelhos determinísticos. Recebe tudo por injeção: candidatos já renderizados, roster, `comVaga`. | **proibido — e testado por fecho transitivo de imports** | **sim** |
| `src/passo/perfil.js` | Banco derivado `data/passo/uso.db`: conexão própria, `PERCURSO_PASSO_DB`, vocabulário fechado, decaimento, retenção, apagamento, fingerprint do banco principal. | banco **próprio** | não |
| `src/passo/painel.js` | A cola: `painelDoPasso(u, tela, {refinar})` — sinais → catálogo → ranking → (opcional) orquestrador. É o que `api.js` chama. | via `sinais.js` | via orquestrador |
| `src/fila-modelo.js` | `comVaga(fn, {prioridade})` extraída de `copilot.js`. **Módulo puro, sem `db.js`** — é o que torna a cerca do orquestrador real e não decorativa. | não | não |
| `ai/prompts/passo-painel.md` | Prompt versionado de J2 (ordenar + reescrever rótulo). | — | — |
| `ai/prompts/passo-rota.md` | Prompt versionado de J1 (capacidade + entrada do guia). | — | — |

### 2.2 Alterados

| arquivo | mudança | tamanho |
|---|---|---|
| `src/assistente.js` | doutrinas 5 e 7 reescritas no cabeçalho e nos `naoEnxergo` afetados; `CATALOGO_ACOES` ganha `alertas` (**hoje não existe** — `validarAcao('alertas', …)` devolveria `null` e a oferta sumiria em silêncio); pipeline chama J1 só quando `casarIntencao()` falha; `chipsDe` **intocado** | ~60 linhas |
| `src/copilot.js` | passa a reexportar `comVaga` de `src/fila-modelo.js` (compatibilidade total: `api.js:31` e `assistente.js` continuam importando de lá) | 3 linhas |
| `src/ai-client.js` | `conversar({ …, timeoutMs })` sobrepondo `TIMEOUT_MS[papel]` (`ai-client.js:88`). Sem isso o cliente desiste em 2,5 s e o slot da fila fica preso por até 90 s | 2 linhas |
| `src/relatorio.js` | `periodosSugeridos()` **move de `src/api.js:694`** (onde é função privada) para cá, exportada; `diasDesdeUltimoPublicado()`; `INTENCOES` ganha `id` estável por item (os códigos já existem) | ~20 linhas |
| `src/api.js` | importa `periodosSugeridos` de `relatorio.js`; 5 rotas novas (§5.5); invalidação do memo de sinais em todo POST/DELETE do usuário | ~35 linhas |
| `public/app.js` | painel com sugestões tipadas, card de oferta, "Hoje não", ponto no FAB, resumo do dia, balão do momento, seção "o que eu lembro de você", invalidação de cache em POST de estado; `PASSO_ROTAS_POR_PAPEL` ganha `#/alertas` (**hoje ausente** — `app.js:2859`) | ~140 linhas |
| `public/styles.css` | `.passo-ponto`, `.passo-card`, `.passo-chip[data-tipo]`, `.passo-resumo`, `.passo-porque` — só variáveis existentes (`styles.css:13-20`, com par em `prefers-color-scheme: dark` em `:31-38`) | ~18 linhas |
| `scripts/ai-stub.mjs` | dois handlers de schema + injeção de marcador de teste | ~30 linhas |
| `scripts/reset.mjs` | flag `--esquecer`; **por padrão NÃO apaga `data/passo/`** | 4 linhas |
| `scripts/unit-test.mjs` · `smoke-test.mjs` · `ai-stub-test.mjs` | §7 | ~260 linhas |
| `.gitignore` | `data/passo/` | 1 linha |
| `docs/DECISOES-TECNICAS.md` · `ARQUITETURA.md` · `MODELO-DE-DADOS.md` · `TESTES.md` | decisão 27, doutrina 5′, DDL do perfil, bloco de testes | — |
| **`src/db.js`** | **INTOCADO.** A assinatura do DDL não muda; nada é derrubado. | **0** |
| **`server.js`** | **INTOCADO.** `lerCorpo` só roda para POST e DELETE (`server.js:55`) — por isso **nenhuma rota deste plano usa PUT**. Três das quatro propostas anteriores erraram nisso. | **0** |

---

## 3. Catálogo de sugestões — contrato, gatilhos, textos

### 3.1 O envelope — `src/passo/sinais.js`

Só escalares. Toda string é token de enum fechado. É a fronteira executável da doutrina 5′.

```js
// educador — soma das leituras que GET /api/hoje já paga (api.js:184), ~2,5 ms
{
  papel: 'educador', tela: '#/hoje',              // tela já passou por telaSegura(); '' é válido
  tem_turma: true, dia_letivo: true,
  chamada_pendente: true, datas_abertas: 3,
  em_lapso: false, registrou_hoje: false,          // lapso é BOOLEAN: o nº de dias parada não entra
  folha_pendente: true, folha_aberta: false, folhas_atrasadas: 1, perimetro_na_ultima_folha: false,
  ciclo_pendentes: 6, ciclo_dias_restantes: 4, ciclo_vencido: false, ciclo_rascunhos: 1,
  bloq_consentimento: 1, bloq_convivio: 2,
  alertas_turma: 2,                                // D.alertas(null, u.id) — SEMPRE com u.id
  sem_registro_3mais: 3,                           // estadoDoRegistro, só em #/chamada e #/turma
  exposicao_area: 'esporte', exposicao_criancas: 4,// 'esporte' ∈ AREAS (voz.js:32)
  pauta_indecisa: true, tranquila: false,
  folhas_por_voz: 0, folhas_total: 7,
}
```

```js
// coordenacao — a partir do que GET /api/painel já paga (api.js:335), ~6 ms na própria tela
{ papel:'coordenacao', tela,
  cobertura_pct: 64, cobertura_alerta: true, turmas_sem_registro: 1,   // NUNCA o nome da turma
  alertas_abertos: 5, alertas_parados: 2,
  consentimentos_bloqueando: 2, ciclo_vencido_dias: 3, ciclo_dias_restantes: 9,
  sintese_estado: 'rascunho_aprovado',   // enum: inexistente|rascunho_aprovado|rascunho_reprovado|aprovada
  descarte_pct: 41, descarte_alerta: true, extrator_correcao_pct: 33,
  folhas_abertas: 3, importacao_perdas: 12, suprimidas: 2, calibracao_divergencias: 1 }
```

```js
// diretoria — relatorios() + 2 MAX() + periodosSugeridos(); numerosDoPeriodo NÃO entra (3,8 ms)
{ papel:'diretoria', tela,
  relatorio_estado: 'rascunho', revisor_status: 'reprovado',
  dias_desde_publicacao: 132, periodos_sem_relatorio: 1,
  custo_informado: false, dose_publicavel: true, supressoes_n: 3, capa_por_vinculo: false }
```

**A guarda que faz isso valer — roda em produção, não só em teste:**

```js
const TOKENS_OK = new Set([
  ...AREAS.map(a => a.codigo), ...DIMENSOES_CODIGOS,
  'educador','coordenacao','diretoria', ...ROTAS_CONHECIDAS, '',
  'inexistente','rascunho','rascunho_aprovado','rascunho_reprovado','aprovada',
  'publicado','sem_relatorio','aprovado','reprovado',
]);
export function congelar(env) {
  for (const [k, v] of Object.entries(env)) {
    if (/crianca|nome|aluno|turma_nome|educador_id/i.test(k)) throw new Error(`envelope: chave proibida ${k}`);
    if (v === null || typeof v === 'number' || typeof v === 'boolean') continue;
    if (typeof v === 'string' && TOKENS_OK.has(v)) continue;
    throw new Error(`envelope: valor fora do contrato em ${k}`);
  }
  return Object.freeze(env);
}
```

**E a rota nunca 5xx por causa dela.** `sinaisDe()` embrulha a construção inteira em `try/catch`; falha devolve `ENVELOPE_VAZIO` (todos os gatilhos apagados → painel cai no fallback estático de hoje) e incrementa um contador em RAM exposto em `GET /api/passo/qualidade`. O `throw` de `congelar` é exercido **direto na função** pelo unit test — o invariante continua testado, a superfície continua sem 5xx.

**Custos declarados, com as guardas escritas em código:** `riscoEvasao({})` (3,4 ms) e `numerosDoPeriodo` (3,8 ms) **nunca** entram no envelope — as telas `#/scores`, `#/painel` e `#/relatorio` já os pagam uma vez. `estadoDoRegistro` (O(n×20) SELECTs, `scores.js:406-429`) só é lido em `#/chamada` e `#/turma`. `planoDaTurma` **não entra em nada**: ele devolve `ganchos.criancas = GROUP_CONCAT(c.nome)` e `radar[].nome` (`domain.js:1058-1114`) — carregar nome de criança em memória num caminho que termina em prompt é risco sem contrapartida.

### 3.2 O contrato de uma entrada — `src/passo/catalogo.js`

```js
{
  id: 'edu.folha_atrasada',        // estável: é a chave do perfil e o enum do modelo
  papeis: ['educador'],
  tipo: 'acao',                    // 'pergunta' | 'acao' | 'aprimoramento' | 'duvida'
  classe: 'pendencia',             // 'pendencia' | 'oferta' | 'melhoria' | 'alivio' | 'saber'
  sujeito: 'sistema',              // 'sistema' | 'turma' | 'instrumento' | 'instituto' — NUNCA 'pessoa'
  nucleo: true,                    // piso institucional: aparece mesmo sem afinidade
  telas: ['#/chamada','#/voz','#/folha'],
  suprimidoEm: ['#/hoje'],         // a tela já renderiza este fato — repetir é ruído
  base: 82,                        // urgência INSTITUCIONAL 0..100, escrita à mão, auditável
  gatilho: (e) => e.folhas_atrasadas > 0,
  rotulo: 'Contar como foi um encontro que ficou',   // ≤ 44 chars, SEM DÍGITO — é o único que vai ao modelo
  texto:  (e) => `${e.folhas_atrasadas === 1 ? 'Um encontro ficou' : `${e.folhas_atrasadas} encontros ficaram`}`
                 + ' sem folha. Dá para contar como foi em 40 segundos — a data não expira.',
  porque: (e) => 'há encontro registrado sem folha correspondente',   // aparece na tela, em texto miúdo
  acao: 'voz',                     // id de CATALOGO_ACOES, validado por validarAcao(id, papel) no boot
}
```

**Regras de escrita, todas verificadas por lint em teste (§7.1):**

1. `rotulo` **não contém dígito** — é a trava estrutural que impede número nascido de modelo. Nenhuma exceção.
2. `texto` nunca interpola nome de criança nem nome de turma. Interpola contagem — e, quando o destino é gestão/diretoria e a contagem é de crianças abaixo de `PARAMS.MINIMO_CELULA` (5), cai na variante qualitativa (*"algumas crianças"*).
3. Toda entrada com `'educador'` em `papeis` e `tipo: 'aprimoramento'` tem `sujeito ∈ {sistema, turma, instrumento, instituto}`. Nunca a pessoa, nunca o volume de trabalho dela, nunca a velocidade dela.
4. Toda entrada da família cobertura/registro/tempo carrega a moldura do sistema (`/mede o sistema|não é você|nada se perdeu|nenhuma expira|o problema é nosso/`).
5. Nenhum `texto` ou `rotulo` casa `LINT_COBRANCA`:

```js
const COBRANCA = /\b(voc[êe]\s+(n[ãa]o|ainda n[ãa]o|deixou|esqueceu|falhou|precisa|deveria|tem que|est[áa]\s+atrasad)|em atraso|pend[êe]ncia\s+sua|sua responsabilidade|falta\s+voc[êe]|est[áa]\s+devendo|n[ãa]o deixe acumular|vamos correr|para tr[áa]s)\b/i;
export const semCobranca = (t) => !COBRANCA.test(String(t ?? ''));
```
> `edu.retomada` passa: *"Você ficou N dias sem registrar. Nada se perdeu…"* (`domain.js:855`) — "você ficou" não acusa e a segunda oração desarma. Nenhuma exceção é necessária.

6. Nenhuma entrada de educadora tem `fonte` em `{coberturaRegistro, tempoDeRegistro, calibracaoEntreObservadores, qualidadeDoExtrator, taxaDeDescarte}`.
7. Nenhum `texto`, `rotulo` ou `porque` de qualquer papel contém nome de turma (testado contra `SELECT nome FROM turma`).

### 3.3 Os quatro tipos, definidos por função e não por rótulo

| tipo | o que é, operacionalmente | de onde nasce | teto por painel |
|---|---|---|---|
| **ação** | um portão ABERTO no estado real; tocar abre um card no fio com o `texto` e o botão **Ir para…** | sinal determinístico do envelope | 2 (e no máx. 1 de `classe:'pendencia'`) |
| **aprimoramento** | um ponto de melhoria da OPERAÇÃO (a oferta, o dado, o instrumento) — nunca da pessoa | sinal determinístico, `sujeito ≠ pessoa` | 1 |
| **pergunta** | algo que o Passo **sabe responder**, e que o estado sugere que interessa agora; tocar **envia como pergunta** | `GUIA[].tarefas[].intencoes` filtrado por estado + as 6 `INTENCOES` de `relatorio.js` para a diretoria | 1 |
| **dúvida** | o que costuma confundir naquela tela, no momento do atrito | `GUIA[].chips` e `GUIA[].naoEnxergo`, já escritos | 1 |

**Honestidade sobre `pergunta` e `dúvida`:** são o `GUIA` que já existe, entregue no momento certo em vez de listado por decreto. O que os torna diferentes de FAQ é o gatilho por estado — `edu.duvida.perimetro` só existe se houve perímetro; `edu.duvida.bloqueio` só se há criança bloqueada — e, para a diretoria, o fato de a `pergunta` ser **respondida com número de SQL ali mesmo**. Onde não há gatilho de estado, a entrada é declarada `gatilho: SEMPRE` e conta como piso de fallback; o teste U-03 exige que **no máximo 8 das ~46 entradas** sejam `SEMPRE`, para que o painel não vire índice de ajuda mais bem vestido.

### 3.4 O catálogo — 46 entradas

**Educadora (Maria) — 20.** Núcleo em negrito.

| id | tipo · classe | telas / suprimido em | gatilho | ação |
|---|---|---|---|---|
| **`edu.retomada`** | acao · pendencia | `*` / — | `em_lapso` | `hoje` |
| **`edu.chamada_hoje`** | acao · pendencia | `#/voz` `#/folha` `#/ciclo` `#/turma` / **`#/hoje` `#/chamada`** | `dia_letivo && chamada_pendente` | `chamada` |
| **`edu.folha_atrasada`** | acao · pendencia | `#/chamada` `#/voz` `#/folha` / `#/hoje` | `folhas_atrasadas > 0` | `voz` |
| **`edu.ciclo_janela`** | acao · pendencia | `#/chamada` `#/voz` `#/turma` / `#/hoje` `#/ciclo` | `ciclo_pendentes>0 && ciclo_dias_restantes<=7` | `ciclo` |
| `edu.ciclo_rascunhos` | acao · pendencia | `#/ciclo` `#/observacao` / — | `ciclo_rascunhos > 0` | `ciclo` |
| `edu.datas_abertas` | acao · pendencia | `#/turma` `#/ciclo` / `#/hoje` `#/chamada` | `datas_abertas > 0` | `chamada` |
| `edu.folha_aberta` | acao · oferta | `#/folha` `#/confirmar` / — | `folha_aberta` | `folha` |
| `edu.pauta_indecisa` | acao · oferta | `#/chamada` `#/turma` / `#/hoje` `#/pauta` | `pauta_indecisa` | `pauta` |
| **`edu.alerta_turma`** | acao · oferta | `#/chamada` `#/ciclo` `#/turma` / `#/hoje` `#/alertas` | `alertas_turma > 0` | `alertas` |
| **`edu.radar_do_registro`** | aprimoramento · melhoria | `#/chamada` `#/hoje` / `#/turma` | `sem_registro_3mais > 0` | `chamada` |
| `edu.exposicao_turma` | aprimoramento · melhoria | `#/turma` `#/ciclo` `#/chamada` / `#/hoje` `#/pauta` | `exposicao_criancas > 0` | `pauta` |
| `edu.tranquila` | aprimoramento · **alivio** | `#/hoje` `#/chamada` `#/turma` / — | `tranquila` | `turma` |
| `edu.voz_nunca_usada` | pergunta · saber | `#/folha` `#/chamada` `#/hoje` / `#/voz` | `folhas_por_voz===0 && folhas_total>=3` | `voz` |
| `edu.pergunta.bloqueio` | pergunta · saber | `#/ciclo` `#/observacao` / — | `bloq_consentimento+bloq_convivio > 0` | `ciclo` |
| `edu.duvida.perimetro` | duvida · saber | `#/voz` `#/confirmar` `#/folha` / — | `perimetro_na_ultima_folha` | — |
| `edu.duvida.nivel_menor` | duvida · saber | `#/observacao` / — | SEMPRE | — |
| `edu.duvida.branco_honesto` | duvida · saber | `#/observacao` `#/ciclo` / — | SEMPRE | — |
| `edu.duvida.cronometro` | duvida · saber | `#/chamada` / — | SEMPRE | — |
| `edu.duvida.audio` | duvida · saber | `#/voz` `#/confirmar` / — | SEMPRE | — |
| `edu.duvida.ficha_fechada` | duvida · saber | `#/crianca` `#/criancas` / — | SEMPRE | — |

Textos que carregam o peso, literais:

- `edu.retomada` — *"Que bom te ver. As datas em aberto continuam lá, sem pressa — nenhuma expira."* **`imune: true`** (§5.4): esta frase é doutrina escrita à mão, e um reescritor bem-intencionado é exatamente o que a transformaria em cobrança.
- `edu.alerta_turma` — *"Há alerta de ausência aberto na sua turma. Quem liga para a família é a coordenação — aqui você só registra que viu."* Sujeito da ação é a coordenação. O Passo mostra; não cobra. **Sem contagem, sem nome.**
- `edu.radar_do_registro` — *"3 crianças estão sem registro de presença há três encontros ou mais. Isso fala do REGISTRO, não delas: é assim que alguém some do radar sem ninguém notar. Se o sistema está pedindo demais, o problema é nosso."*
- `edu.duvida.cronometro` — reusa a frase literal do `GUIA['chamada']`: *"Ele mede o SISTEMA, nunca você: se passar da meta, o problema é nosso, não seu."*

**Coordenação (Rita) — 14.** `coo.alerta_parado` (núcleo, base 88), `coo.ciclo_vencido` (núcleo, 86), `coo.sintese_reprovada` (núcleo, 85), `coo.sintese_esperando` (núcleo, 84), `coo.consentimento_trava` (núcleo, 82), `coo.turmas_sem_registro` (78 → `#/scores`), `coo.folhas_abertas` (58), `coo.importacao_perdas` (52), `coo.descarte_alto` (aprim, 66), `coo.extrator_corrige` (aprim, 60), `coo.cobertura_do_sistema` (aprim, 70 — **suprimido em `#/painel` e `#/scores`**, aparece em `#/sintese` e `#/consentimentos`, onde é contexto antes de fechar), `coo.qualidade_do_passo` (aprim, 40 — o próprio agente se autocriticando), `coo.pergunta.calibracao`, `coo.duvida.supressao`.

**Diretoria (Solange) — 12.** `dir.revisor_barrou` (núcleo, 88), `dir.rascunho_pronto` (núcleo, 84), `dir.periodo_descoberto` (72), `dir.sem_publicacao` (60), `dir.custo_ausente` (aprim, 62), `dir.dose_nao_publicavel` (aprim, 55), `dir.capa_suprimida` (aprim, 52), `dir.pergunta.{contagem,presenca,evasao,cobertura,exposicao,ciclo}` — **seis entradas, uma por `INTENCOES` de `relatorio.js:500`**, rotativas por `diaDoAno % 6`, ocupando o único slot de `pergunta`; `dir.duvida.sroi_faixa`; `dir.duvida.supressao`.

### 3.5 As sete leituras SQL novas — zero DDL no banco principal

```sql
-- 1 folhas por fechar (coordenação)                                     ~0,007 ms
SELECT COUNT(*) AS n FROM folha WHERE status = 'aberta';

-- 2 ciclo aberto vencido                                               ~0,004 ms
SELECT id, nome, fim FROM ciclo WHERE status = 'aberto' AND fim < ?;

-- 3 alerta parado: aberto, sem tratativa, há mais de N dias            ~0,005 ms
--   `alerta.criado_em` vem de agora() (ISO com hora) — substr, não date().
SELECT COUNT(*) AS n FROM alerta
 WHERE status = 'aberto' AND (tratativa IS NULL OR tratativa = '')
   AND substr(criado_em, 1, 10) <= ?;      -- ? = addDias(hoje(), -7)

-- 4 dias desde o último relatório publicado                            ~0,003 ms
SELECT MAX(substr(publicado_em, 1, 10)) AS d FROM relatorio WHERE status = 'publicado';

-- 5 consentimento que TRAVA o ciclo. O campo é 'rubrica_socioemocional'
--   (src/seed.js:55; elegibilidade() usa exatamente esse — domain.js:315).
--   NÃO existe campo 'observacao' em governanca_campo: com ele o NOT EXISTS
--   devolveria TODA matrícula ativa, e um número falso entraria fixado no
--   painel da Rita todo dia. Três propostas anteriores erraram este ponto.
SELECT COUNT(DISTINCT m.crianca_id) AS n
  FROM matricula m JOIN programa p ON p.id = m.programa_id AND p.no_escopo = 1
 WHERE m.status = 'ativa'
   AND NOT EXISTS (SELECT 1 FROM consentimento k
                    WHERE k.crianca_id = m.crianca_id
                      AND k.campo = 'rubrica_socioemocional' AND k.status = 'ativo');

-- 6 encontros sem folha nos últimos 30 dias (educadora)                ~0,006 ms
SELECT COUNT(*) AS n FROM encontro e
 WHERE e.turma_id = ? AND e.data BETWEEN ? AND ?
   AND NOT EXISTS (SELECT 1 FROM folha f WHERE f.encontro_id = e.id);

-- 7 perímetro na última folha da turma                                 ~0,004 ms
SELECT f.conteudo_excluido AS x FROM folha f JOIN encontro e ON e.id = f.encontro_id
 WHERE e.turma_id = ? ORDER BY e.data DESC LIMIT 1;
```

---

## 4. Ranking determinístico e personalização

### 4.1 Onde o aprendizado mora — `data/passo/uso.db`

```sql
-- data/passo/uso.db — banco DERIVADO do Passo. Conexão própria em src/passo/perfil.js.
-- NUNCA é lido pelo domínio: não entra em escore, síntese, relatório ou SROI.
-- Some sem consequência funcional (mesma classe do corpus RAG, decisão 20).
-- SEM FTS5 (mesma guarda de db.js:15-18). Migração ADITIVA por user_version, nunca DROP.
PRAGMA journal_mode = WAL;
PRAGMA user_version = 1;

-- Identidade do banco principal. educador.id vem de INSERT literal (seed.js:78) e
-- é reatribuível: acrescente uma educadora e o perfil da pessoa 3 seria entregue a
-- outro ser humano. Divergência do fingerprint zera o arquivo — falha segura.
CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);

-- Contador com decaimento PREGUIÇOSO (sem cron). Chave em VOCABULÁRIO FECHADO.
CREATE TABLE IF NOT EXISTS uso (
  educador_id INTEGER NOT NULL,
  familia     TEXT NOT NULL CHECK (familia IN ('sugestao','tipo','tela')),
  chave       TEXT NOT NULL,
  evento      TEXT NOT NULL CHECK (evento IN ('mostrada','aceita','dispensada')),
  peso        REAL NOT NULL DEFAULT 0,     -- soma decaída (o ranking usa)
  n           INTEGER NOT NULL DEFAULT 0,  -- contagem bruta (a auditoria mostra)
  dia_ultimo  TEXT NOT NULL,               -- 'YYYY-MM-DD' — DIA, jamais hora
  PRIMARY KEY (educador_id, familia, chave, evento)
) WITHOUT ROWID;

-- 'Hoje não' — silêncio que SEMPRE expira.
CREATE TABLE IF NOT EXISTS silenciada (
  educador_id INTEGER NOT NULL, sugestao_id TEXT NOT NULL,
  ate TEXT NOT NULL, criado_em TEXT NOT NULL,
  PRIMARY KEY (educador_id, sugestao_id)
) WITHOUT ROWID;

-- Dedupe diário de 'mostrada': sem isto, quem abre o painel 8 vezes num dia
-- afunda a novidade de tudo que viu, sem ter lido nada.
CREATE TABLE IF NOT EXISTS mostrada_dia (
  educador_id INTEGER NOT NULL, sugestao_id TEXT NOT NULL, dia TEXT NOT NULL,
  PRIMARY KEY (educador_id, sugestao_id, dia)
) WITHOUT ROWID;

-- Preferência DECLARADA — personalização real com zero telemetria.
CREATE TABLE IF NOT EXISTS preferencia (
  educador_id   INTEGER PRIMARY KEY,
  aprender      INTEGER NOT NULL DEFAULT 1 CHECK (aprender IN (0,1)),
  som           INTEGER NOT NULL DEFAULT 0 CHECK (som IN (0,1)),
  resumo_do_dia INTEGER NOT NULL DEFAULT 1 CHECK (resumo_do_dia IN (0,1)),
  prefere_tipo  TEXT,   -- NULL | 'acao' | 'duvida' | 'aprimoramento' | 'pergunta'
  atualizado_em TEXT NOT NULL
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS ix_uso_purga ON uso(dia_ultimo);
```

**O que NUNCA entra:** texto de pergunta, texto de resposta, transcrição, id de criança, id de turma, hora do dia, navegação fora do Passo. O vocabulário é fechado por código, não por convenção:

```js
const FORMA = /^[a-z0-9_.#/\-]{1,64}$/;
const VALIDA = {
  sugestao: (v) => IDS_CATALOGO.has(v),
  tipo:     (v) => ['acao','pergunta','aprimoramento','duvida'].includes(v),
  tela:     (v) => ROTAS_CONHECIDAS.has(v),
};
export function registrar(id, familia, chave, evento) {
  if (!FORMA.test(chave) || !VALIDA[familia]?.(chave)) throw erro(422, 'Chave de uso fora do vocabulário.');
  /* upsert com decaimento */
}
```
Consequência testável: `registrar(1,'tela', nomeDeCrianca)` lança; `registrar(1,'sugestao','inventada')` lança. Um nome não tem por onde virar chave.

**Decaimento (meia-vida 21 dias), aplicado na leitura e na escrita da mesma linha:**
```js
const decair = (peso, dia, hoje) => peso * Math.pow(0.5, diasEntre(dia, hoje) / 21);
// escrita: peso = decair(peso, dia_ultimo, hoje) + 1;  n += 1;  dia_ultimo = hoje;
```

**Retenção — e a frase que a pessoa lê é verdadeira.** Purga na abertura (1×/dia/processo): `DELETE FROM uso WHERE dia_ultimo < date(hoje,'-90 day')`, idem `mostrada_dia`; `DELETE FROM silenciada WHERE ate < hoje`. A tela **não** promete "isso some em 23/11" (para quem usa o produto todo dia, nada some nunca — seria mentira). Ela diz, literalmente: *"cada coisa que eu aprendi some 90 dias depois da última vez que aconteceu."*

### 4.2 O algoritmo — pseudocódigo completo

```
SLOTS       = 3
TETO_PESSOAL = 0.15      // o quanto a preferência pode mover, no total
PISO_NUCLEO  = 0.85

função painel(u, envelope, tela, prefs):
  # 1 · CANDIDATOS. Gatilho frio não é rebaixado: não existe.
  C = CATALOGO.filtra(s =>
        u.papel ∈ s.papeis
        ∧ (s.telas = '*' ∨ tela ∈ s.telas)
        ∧ tela ∉ s.suprimidoEm                        # a tela já mostra este fato
        ∧ s.gatilho(envelope) = verdadeiro
        ∧ (s.acao = nulo ∨ validarAcao(s.acao, u.papel) ≠ nulo))
  se C = ∅: devolve FALLBACK(u, tela)                 # === chipsDe() de hoje, byte a byte

  # 2 · PONTUAÇÃO
  para cada c ∈ C:
     base = c.base / 100                              # 0..1

     se prefs.aprender = 0 ou c.nucleo:
        ajuste = 0                                    # núcleo é imune a preferência
     senão:
        m  = prefs['sugestao', c.id, 'mostrada'].peso
        a  = prefs['sugestao', c.id, 'aceita'].peso
        d  = prefs['sugestao', c.id, 'dispensada'].peso
        ta = prefs['tipo', c.tipo, 'aceita'].peso
        tm = prefs['tipo', c.tipo, 'mostrada'].peso

        afinidade  = clamp((a - d) / (m + 3), -1, 1)            # o +3 é o prior
        afin_tipo  = clamp((ta - max(0, tm - ta)) / 6, -1, 1)
        novidade   = m = 0 ? 1 : 1 / (1 + ln(1 + m))            # decai, nunca zera
        fadiga     = (m >= 5 ∧ a = 0) ? -1 : 0
        declarada  = (prefs.prefere_tipo = c.tipo) ? 1 : 0

        # AS PENALIDADES ENTRAM DENTRO DO CLAMP. Fora dele, o clamp é decorativo:
        # os termos positivos já cabem na faixa e só as penalidades a estouram —
        # foi assim que uma base 0,2 vencia uma base 0,9 numa proposta anterior.
        ajuste = clamp(0.45*afinidade + 0.20*afin_tipo + 0.20*novidade
                       + 0.25*fadiga + 0.30*declarada,
                       -TETO_PESSOAL, +TETO_PESSOAL)

     c.pontos = clamp(base + ajuste, 0, 1)
     se c.nucleo: c.pontos = max(c.pontos, PISO_NUCLEO)
     se silenciada(u, c.id) e hoje <= ate: c.pontos = -INFINITO

  # 3 · ORDENAÇÃO estável: pontos desc, base desc, id asc
  R = ordena(C)

  # 4 · COMPOSIÇÃO — as travas que impedem o painel de virar lista de dívida
  saida = []
  usados = { pendencia: 0, duvida: 0, porTipo: {} }
  se existe c ∈ R com c.classe = 'alivio' e nenhum c ∈ R com classe='pendencia':
     saida += o alívio                                 # o alívio PODE vencer o painel
  para c ∈ R enquanto |saida| < SLOTS:
     se c.classe = 'pendencia' ∧ usados.pendencia >= 1: continua     # TETO DE UMA
     se c.tipo   = 'duvida'    ∧ usados.duvida    >= 1: continua
     se usados.porTipo[c.tipo] >= 2:                    continua
     saida += c; atualiza(usados)

  # 5 · EXPLORAÇÃO determinística (não aleatória — testável)
  se diaDoAno(hoje) mod 3 = 0 e existe inédita ∈ R com mostrada = 0 e ∉ saida:
     saida[SLOTS-1] = inédita

  devolve { sugestoes: saida, badge: existe c ∈ saida com c.nucleo ∧ ¬mostradoHoje(c.id) }
```

### 4.3 As seis defesas contra bolha — e o que a personalização de fato alcança

1. **Piso de núcleo** — o sinal que o instituto precisa ver entra em ≥0,85 mesmo com afinidade zero e vinte dispensas.
2. **Teto de ±0,15** — a preferência reordena vizinhos; nunca atravessa faixas de base. Base 0,88 nunca perde para base 0,20 (0,73 > 0,35). **As penalidades entram dentro do clamp** — sem isso o invariante seria falso na primeira execução.
3. **Silêncio expira** — sempre. Nunca existe "nunca mais me mostre".
4. **Novidade nunca zera** — `1/(1+ln(1+m))` decai devagar e volta a subir sozinha quando o item para de ser mostrado.
5. **Exploração a cada 3 dias** — a pessoa sempre volta a ver algo inédito.
6. **Teto de UMA pendência por painel** — a defesa que nenhuma proposta anterior tinha: sem ela, cada item pode ser educado e o **somatório** ser cobrança diária.

**O que o "Hoje não" faz, literalmente** — e o produto não mente sobre o botão:
- item **não-núcleo**: silencia por 14 dias (`ate = hoje + 14`);
- item **núcleo**: silencia **pelo resto do dia** (`ate = hoje`), e a resposta na tela é *"Tudo bem — hoje eu não trago mais. Amanhã eu trago de novo, porque isso é ponto que o instituto precisa ver."*

**Alcance honesto da personalização, declarado.** Com o piso de núcleo e o teto de uma pendência, em qualquer dia em que um sinal núcleo dispare a vaga 1 está determinada. O que a afinidade reordena são as vagas 2 e 3 — **um terço a dois terços do painel**. A parte da personalização que a pessoa **sente** vem de outros dois lugares, e é por isso que eles existem: a **preferência declarada** (`prefere_tipo`, +0,30 no ajuste, sem nenhuma telemetria) e o **desaparecimento por estado** — a sugestão some porque a chamada foi salva, não porque um contador disse. Esse é o único aprendizado que não envelhece errado, é exato no dia 1 e é exatamente o que uma pessoa quer dizer com *"se moldar à minha dinâmica"*: **pare de me falar do que eu já fiz.**

### 4.4 O que a pessoa vê, desliga e apaga

Seção **dentro** do painel do Passo (nenhuma rota nova — `#/passo` não existe e não precisa existir; assim `telaSegura('')` nunca vira problema):

```
O que eu lembro de você
  [•] Aprender com o meu uso                          LIGADO
  [ ] Voz do Passo                                 DESLIGADA
  [•] Resumo do dia ao abrir                          LIGADO
  Eu gosto mais de…   [ atalhos de ação ] [ dúvidas ] [ nenhum ]

  Eu conto só o que você faz COMIGO: o que eu te ofereci, o que você
  tocou, o que você dispensou, e em que telas você me abriu.
  Eu não observo sua navegação no Percurso, não meço o seu tempo,
  não guardo o texto das suas perguntas nem nome de criança nenhuma,
  e não guardo hora — só o dia.

  sugestões que você tocou      Contar como foi (9×) · Chamada (14×)
  sugestões que você dispensou  1 — volta em 08/09
  tipos que você prefere        Ação ▓▓▓▓▓▓▓▓ 23×   Dúvida ▓▓ 4×

  Cada coisa que eu aprendi some 90 dias depois da última vez que aconteceu.
  [ Esquecer tudo o que o Passo aprendeu ]
```

`aprender = 0` ⇒ `registrar()` vira no-op e `pesos()` devolve `{}` ⇒ o ranking é **idêntico**, por igualdade profunda de arrays, ao determinístico puro (teste U-13).
`passo.som` migra do `localStorage` (`app.js:2569`) para `preferencia.som`, com o `localStorage` como cache write-through — resolve a preferência que morre ao trocar de aparelho, sem round-trip no caminho de pintura.

---

## 5. Qwen como orquestrador

### 5.1 O que isso significa, concretamente — e a inversão que este plano NÃO faz

"Orquestrador" aqui é: **um modelo de referência, um cliente, uma fila, um manifesto** — e o Qwen3-4B-Instruct-2507 é o modelo de referência de **todos** os trabalhos do Passo, inclusive o de roteamento, que é o que de fato orquestra. O Qwen3-1.7B é um **acelerador opcional** do mesmo trabalho: J1 roda em `papel: 'estruturado'`, e `bases('estruturado')` já cai para `127.0.0.1:8081` quando o 8082 não responde (`ai-client.js:32-34`). Quando o 1.7B não está no ar — o caso padrão — o 4B faz tudo. Essa é a leitura honesta do pedido 3, e ela é diferente de pôr o 4B só a reescrever texto que um humano escreveu bem.

O 4B assume **dois trabalhos**, ambos com schema fechado, validador de saída e espelho determinístico obrigatório. Ele nunca calcula, nunca escreve número, nunca escolhe ação, nunca decide o que dispara.

| # | trabalho | quando | caminho quente? | espelho determinístico |
|---|---|---|---|---|
| **J1** | **Roteador de capacidade + entrada do guia** | só quando `casarIntencao()` devolve `null` (hoje isso cai no genérico *"Não entendi de que parte do Percurso você fala"*) ou quando a regex de estado casa | sim, mas só no caso que **hoje já falha** | `rotaDeterministica()` (regex nova) + o genérico atual |
| **J2** | **Ordenar candidatos + reescrever RÓTULOS** | abertura do painel, **assíncrono**, `prioridade: 'fundo'` | **não** | `painel()` do §4.2 com os `rotulo` do catálogo |
| J0 | resposta do chat (já existe) | inalterado | sim | inalterado |

### 5.2 J1 — roteador (uma chamada, dois campos)

Capacidades — todas já são função no repositório:

```js
export const CAPACIDADES = {
  guia:              { papeis: ['educador','coordenacao','diretoria'] },   // GUIA[entrada]
  copilot:           { papeis: ['educador','coordenacao'] },               // REDIRECIONAMENTO
  consulta_agregada: { papeis: ['coordenacao','diretoria'] },              // R.consultar()
  sugestoes:         { papeis: ['educador','coordenacao','diretoria'] },   // painelDoPasso()
  limite:            { papeis: ['*'] },
};
```

```js
const schemaRota = {
  name: 'passo_rota',
  schema: {
    type: 'object', required: ['capacidade','confianca'], additionalProperties: false,
    properties: {
      capacidade: { type: 'string', enum: capacidadesDoPapel(u.papel) },        // 3 a 5 valores
      entrada:    { anyOf: [{ type:'null' },
                            { type:'string', enum: guiaDoPapel(u.papel).map(g => g.id) }] },
      confianca:  { type: 'number' },
    },
  },
};
// papel:'estruturado' (cai para o 4B) · maxTokens: 32 · timeoutMs: 2500 · comVaga prioridade 'interativo'
// prompt: PROMPT_ROTA (~180 tok) + lista de capacidades e ids do guia com uma linha cada (~520 tok)
```

**A ordem dos portões duros não muda — e os vetos rodam DEPOIS do modelo:**

```
1. filtrarPerimetro(texto ORIGINAL, roster)            ← inalterado (assistente.js:420)
2. RECUSAS determinísticas                              ← inalterado
3. diretoria + nome → recusa da decisão 16              ← inalterado
4. anonimizarTexto → `pergunta`                         ← inalterado
5. pareceReflexiva / dominioDoProduto                   ← inalterado
6. casarIntencao(pergunta, tela, papel)                 ← o LÉXICO VENCE SEMPRE que casa
7. só se (6) falhou: J1                                 ← NOVO
8. aplicarVeto(proposta, papel)                         ← NOVO, determinístico
```

```js
export function aplicarVeto(p, { reflexiva, foraDoProduto }, papel) {
  if (reflexiva)      return 'copilot';                                    // hard gate permanece
  if (p?.capacidade === 'copilot' && papel !== 'diretoria') return 'copilot'; // ampliar é mais seguro
  if (foraDoProduto)  return 'limite';
  if (!CAPACIDADES[p?.capacidade]?.papeis.includes(papel)) return 'guia';
  if (!(Number(p.confianca) >= 0.6)) return 'guia';
  return p.capacidade;
}
```

**`consulta_agregada` — contrato fechado, sem ambiguidade.** A saída é `R.consultar(pergunta).resposta` **verbatim**, mais `fonte` e `doutrina`, com `origem: 'guia'`. **O modelo não vê e não reescreve esse retorno.** Ele contém `riscoEvasao({})`, `coberturaRegistro({})` e `presencaMedia()` (`relatorio.js:500-546`) — expor escore a modelo pela porta da redação é exatamente o que a doutrina 3 proíbe. Teste U-18 assere igualdade byte a byte.

**Espelho determinístico** (`AI_ENABLED=0`, `PASSO_ROTA=0`, J1 falhou):
```js
const ESTADO = /(quant[oa]s?|qual (o|a) (n[uú]mero|percentual|taxa)|como est[áa]|quanto[s]? (falta|sobra))/;
export function rotaDeterministica(p, papel, vetos) {
  if (vetos.reflexiva) return 'copilot';
  if (vetos.foraDoProduto) return 'limite';
  if (ESTADO.test(semAcento(p)) && ['coordenacao','diretoria'].includes(papel)) return 'consulta_agregada';
  return 'guia';
}
```

### 5.3 J2 — painel (uma chamada só: ordem + rótulo)

**O que chega ao modelo — e só isto.** Zero banco, zero nome, zero nome de turma, **zero dígito**:

```
PAPEL: educador · TELA: #/chamada
CANDIDATOS (id · tipo · prioridade):
  edu.folha_atrasada     · acao          · alta   · "Contar como foi um encontro que ficou"
  edu.radar_do_registro  · aprimoramento · media  · "Ver quem está sem registro de presença"
  edu.duvida.cronometro  · duvida        · baixa  · "Para que serve o cronômetro?"
  edu.voz_nunca_usada    · pergunta      · baixa  · "A voz preenche a folha falando"
  … (até 8)
Devolva a ORDEM que melhor serve a pessoa agora e, se ajudar, um rótulo mais curto e mais quente.
```

```js
const schemaPainel = {
  name: 'passo_painel',
  schema: {
    type: 'object', required: ['ordem'], additionalProperties: false,
    properties: {
      ordem:   { type:'array', minItems:1, maxItems:8,
                 items:{ type:'string', enum: candidatos.map(c => c.id) } },
      rotulos: { type:'array', maxItems:3,
                 items:{ type:'object', required:['id','rotulo'], additionalProperties:false,
                   properties:{ id:{ type:'string', enum: candidatos.map(c => c.id) },
                                rotulo:{ type:'string' } } } },   // SEM maxLength
    },
  },
};
// papel:'reflexivo' (4B) · maxTokens: 160 · temperatura 0 (forçada pelo schema) · timeoutMs: 2500
```

> **Armadilha travada por teste:** `maxLength` de string em `json_schema` degrada a gramática do llama.cpp de ~143 para 1,5 tok/s. `enum`, `minItems`/`maxItems` e `additionalProperties` são estruturais e ficam. Todo teto de caractere é **pós-geração**. O teste U-17 caminha recursivamente nos três schemas do Passo e falha se `maxLength` aparecer em qualquer profundidade.

**Validação de saída — os oito portões, nesta ordem:**

```js
function conciliar(saida, candidatos, deterministico, roster) {
  const porId = new Map(candidatos.map(c => [c.id, c]));
  // 1 · id fora do conjunto: fora (a gramática não é garantia de 100%)
  let ordem = (saida?.ordem ?? []).filter(id => porId.has(id));
  // 2 · dedupe
  ordem = [...new Set(ordem)];
  // 3 · completa na ordem determinística: o modelo não pode SUMIR com candidato autorizado
  ordem = [...ordem, ...deterministico.map(c => c.id).filter(id => !ordem.includes(id))];
  let R = ordem.map(id => porId.get(id));
  // 4 · o piso de núcleo e as travas de composição rodam DEPOIS do modelo
  R = compor(aplicarPisoNucleo(R));
  // 5..8 · o rótulo reescrito só vale se sobreviver a tudo; senão, o do catálogo
  const novos = new Map((saida?.rotulos ?? []).map(x => [x.id, x.rotulo]));
  return R.map(c => ({ ...c, rotulo: aceitarRotulo(novos.get(c.id), c, roster) }));
}

const NUMERAL = /\b(um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|dezenas?|centenas?|metade|maioria|quase tod[oa]s?|v[áa]rias?|muit[oa]s?|poucas?)\b/i;

function aceitarRotulo(novo, base, roster) {
  if (typeof novo !== 'string') return base.rotulo;
  const t = cortarNaPalavra(novo.trim(), 44);                       // teto POR FORA da gramática
  if (!t) return base.rotulo;
  if (/\d/.test(t)) return base.rotulo;                             // 5 · dígito: proibido, sempre
  if (NUMERAL.test(t)) return base.rotulo;                          // 6 · quantidade por extenso
  if (!semCobranca(t)) return base.rotulo;                          // 7 · tom
  if (/[Cc]rian[çc]as?\s+[A-Z]{1,2}\b/.test(t)) return base.rotulo; // 8a · pseudônimo
  if (anonimizarTexto(t, roster).substituicoes > 0) return base.rotulo; // 8b · nome do roster
  if (NOMES_DE_TURMA.some(n => t.includes(n))) return base.rotulo;      // 8c · proxy da educadora
  if (base.imune) return base.rotulo;                               // edu.retomada nunca é reescrito
  return t;
}
```

**O `texto` com números e o `resumo` do dia NUNCA passam pelo modelo.** São template determinístico. Não existe caminho em que um dígito exibido tenha sido escrito por modelo — por construção, não por verificação.

**Fusível de ENTRADA, não só de saída.** Antes de montar `mensagens`, todo candidato passa por `anonimizarTexto(rotulo, roster)`: `substituicoes > 0` **derruba o candidato** (não o painel), e incrementa um contador na autocrítica. Isso é código no caminho quente, não lint de build.

### 5.4 Custo, latência e fila

| chamada | modelo | prefill | saída | latência esperada | caminho crítico? |
|---|---|---|---|---|---|
| J1 rota | 1.7B (fallback 4B) | ~700 tok | ≤32 | ~0,3 s / ~0,5 s | sim — **só no caso que hoje já falha** |
| J0 chat (existente) | 4B | ~1.900 tok | ≤320 | ~1,2 s | sim, inalterado |
| J2 painel | 4B | ~450 tok | ≤160 | ~1,3 s | **não** |

O `vivo(base)` (`ai-client.js:37`) faz um probe de até 1200 ms **antes de cada chamada** e conta contra o orçamento — declarado aqui porque nenhuma proposta anterior o contou. `timeoutMs: 2500` cobre probe + geração.

**Fila — a mudança cirúrgica.** `comVaga` sai de `copilot.js` para `src/fila-modelo.js` (necessário para a cerca do orquestrador ser real) e ganha prioridade:

```js
export async function comVaga(fn, { prioridade = 'interativo' } = {}) {
  if (prioridade === 'fundo' && (emVoo > 0 || fila.length > 0))
    throw Object.assign(new Error('fila ocupada'), { causa: 'ocupado' });   // J2 desiste na hora
  /* resto idêntico: 2 em voo, teto 4 na espera → 503 */
}
```
J2 é `'fundo'`: **nunca** tira vaga de uma reflexão do copilot nem de uma resposta do Passo. Desistir é gratuito, porque o painel determinístico já está pintado.

**O painel nunca espera o modelo.** `GET /api/passo/painel` responde em ~8 ms e o cliente pinta. Só então dispara `POST /api/passo/painel/refinar`, que troca os **rótulos** no lugar se e quando chegar, comparando o `hash` da lista. Falha, timeout, fila cheia, modelo desligado ou inexistente ⇒ **nada muda visualmente**.

**Kill switches, em cascata:** `AI_ENABLED=0` (padrão, tudo determinístico) → `AI_ASSISTENTE=0` (Passo sem modelo, copilot mantido) → `PASSO_ROTA=0` (J1 fora) → `PASSO_PAINEL=0` (J2 fora, `/refinar` devolve `{refinado:false, motivo:'desligado'}`) → `PASSO_PERFIL=0` (personalização desligada para todos).

### 5.5 As rotas — método, caminho, corpo

```http
GET  /api/passo/painel?tela=<hash>&modo=painel|badge        exigeUsuario
→ 200 { tela, papel, origem:'guia', badge:true, personalizado:true, hash:'a3f1c9',
        resumo:'A chamada de hoje está em aberto e o ciclo fecha sexta.',
        sugestoes:[ { id, tipo, classe, rotulo, texto, porque, nucleo, silenciavel,
                      acao:{ id, rotulo, hash }|null } ] }
   Determinístico puro. NUNCA chama o modelo. NUNCA escreve em banco nenhum.
   modo=badge devolve só { badge, hash } (~1 ms).

POST /api/passo/painel/refinar   { tela, ids:[…] }          exigeUsuario
→ 200 { refinado:true, origem:'modelo', sugestoes:[{ id, rotulo }] }
→ 200 { refinado:false, motivo:'desligado'|'ocupado'|'falhou' }
   NUNCA 5xx, NUNCA 503. O painel determinístico já está na tela.

POST /api/passo/uso        { id, evento:'mostrada'|'aceita'|'dispensada' }   → 200 { ok, silenciada_ate }
                             422 se o id não está no catálogo ou o evento fora do enum
                             200 no-op silencioso quando aprender=0
GET  /api/passo/memoria    → 200 { aprender, som, resumo_do_dia, prefere_tipo, linhas[], silenciadas[], politica }
POST /api/passo/memoria    { aprender?, som?, resumo_do_dia?, prefere_tipo? }  → 200 { …preferencia }
DELETE /api/passo/memoria  → 200 { apagados:{…}, aviso:'Apaguei o que eu sabia do seu uso.' }
GET  /api/passo/qualidade  exigeCoordenacao
→ 200 { por_sugestao:[{ id, tipo, pessoas, mostradas, aceitas, dispensadas, pct_dispensa }],
        rejeicoes_do_modelo:{ enum, digito, cobranca, nome, nucleo_reinserido },
        envelope_falhou:n, minimo_pessoas:5, doutrina:'…' }
```

**Nenhuma rota usa PUT** — `server.js:55` só lê corpo em POST e DELETE. **Nenhuma aceita `educador_id`**: a pessoa só lê e apaga a própria memória; não existe rota para ver a memória de outra pessoa, e essa ausência é a decisão, não um esquecimento.

`GET /api/passo/qualidade` **suprime por PESSOA, não por evento**: uma educadora abrindo o painel 20 vezes produz 20 `mostradas` e representa **uma** pessoa. A chave da supressão é `COUNT(DISTINCT educador_id) >= 5` — com 3 usuários no MVP, a rota devolve todos os recortes suprimidos e o `doutrina` diz isso. `GET /api/assistente/chips` permanece exatamente como está (`api.js:450`), devolvendo `{chips: [3 strings], com_modelo}` — o teste legado (`unit-test.mjs:857-862`) continua verde sem uma linha alterada, e as sugestões viajam num campo próprio.

---

## 6. Superfície no cliente (375 px primeiro)

**6.1 · Ponto no FAB — um ponto, nunca um número.** Contador ao lado do ❋ lê como caixa de entrada em dívida; ponto lê como aviso.

```css
.passo-fab{position:relative}
.passo-ponto{position:absolute;top:6px;right:6px;width:9px;height:9px;border-radius:50%;
  background:var(--atencao);box-shadow:0 0 0 2px var(--bg)}
@media print{ .passo-ponto{display:none !important} }
```
Regras que impedem o badge de virar "hoje é dia útil":
- acende só com candidato **núcleo** vivo, não silenciado hoje, **e cujo id ainda não foi mostrado hoje** (`mostrada_dia`);
- **apaga quando o sinal esfria** (a chamada foi feita), não quando a pessoa clica;
- no momento `em_lapso`, o badge é **suprimido**: quem volta depois de duas semanas fora não é recebido por um ponto que só apaga quando vencer o backlog — isso é o oposto literal do que `domain.js:838-841` chama de anti-abandono;
- busca em `navegar()` com debounce de 400 ms e cache de 60 s por rota, **invalidado no cliente em todo POST bem-sucedido que muda estado** (o cliente já sabe quando salvou). Sem isso, o ponto continua aceso por até 90 s depois de a Maria fechar a chamada — no fluxo `#/chamada → #/hoje`, que é o caminho mais comum dela.

**6.2 · Balão de saudação.** Mantém o comportamento do commit `593c8e6` (uma vez por abertura, `app.js:2640-2656`). Quando `badge`, o texto passa a ser o `rotulo` do slot 1; caso contrário, a saudação atual. Falha de rede: o balão de hoje aparece igual.

**6.3 · Resumo do dia — uma frase, no topo do fio.** Substitui a mensagem-semente (`app.js:2702-2704`) quando há estado. **Template determinístico, nunca modelo**, no máximo 2 orações, nunca lista, nunca falado. Se `em_lapso`, o resumo é **substituído** pela linha de retomada — nunca os dois: empilhar dívida em quem sumiu é o oposto do desenho.

**6.4 · Chips vivos com card.** `#passo-chips` (`app.js:2690`) passa a renderizar sugestões tipadas:

```html
<span class="passo-sug" data-id="edu.folha_atrasada">
  <button class="passo-chip" data-acao="passo-sug" data-tipo="acao">Contar como foi um encontro que ficou</button>
  <button class="passo-adiar" data-acao="passo-adiar" aria-label="Hoje não">×</button>
</span>
```
- `pergunta` / `duvida` → toque **envia como pergunta** (comportamento de hoje, `app.js:2846`).
- `acao` / `aprimoramento` → toque insere **um card no fio** com o `texto` completo (aí sim com o número), a linha *"apareceu porque …"* em texto miúdo, e os botões **Ir para …** e **Agora não**. Dois toques até navegar: a oferta continua sendo oferta.
- **Sugestão nunca fala.** A voz continua exclusiva da resposta do chat, com `limparFala` inalterado. É a regra de uma linha que fecha a classe inteira de risco "o Passo lê em voz alta a pendência da educadora".
- **O Passo nunca empurra um card sozinho.** Card só existe com toque.

Glifos por tipo em `::before` (`▸` ação, `?` pergunta, `✦` aprimoramento, `⌾` dúvida), `aria-hidden`, uma linha com `text-overflow: ellipsis`. Rótulo ≤44 chars cabe em ~200 px; `.passo-chips` já faz `flex-wrap` (`styles.css:609`). O `×` tem alvo de 26×44 px com padding vertical.

**6.5 · Acessibilidade.** O `aria-live` continua no nó próprio com só a última fala (`#passo-vivo`, `app.js:2689`); as sugestões **não** entram na região viva — reanunciar três chips a cada abertura é ruído para leitor de tela. `aria-label` do FAB muda com o badge. O `porque` é texto real, não `title`. Foco preso no sheet, como hoje.

**6.6 · Telemetria do cliente — enxuta e explícita.** `POST /api/passo/uso` em três lugares: `mostrada` ao renderizar (uma vez por id por abertura, e o servidor deduplica por dia), `aceita` no toque de **Ir para**, `dispensada` no `×`. `keepalive`, falha ignorada, nunca um toast. **Nenhum GET tem efeito de escrita** — retry de rede e re-render não podem inflar o contador que alimenta a novidade.

---

## 7. Testes e gates

### 7.1 `scripts/unit-test.mjs` — bloco novo, sem servidor, sem modelo

| # | asserção |
|---|---|
| U-01 | **catálogo livre de nome**: as ~46 entradas, com todos os gatilhos forçados por envelope sintético, têm `anonimizarTexto(rotulo+texto+porque, nomesParaAnonimizar()).substituicoes === 0` |
| U-02 | **catálogo livre de nome de TURMA**: nenhum `rotulo`/`texto`/`porque` contém qualquer `SELECT nome FROM turma` |
| U-03 | **nenhum `rotulo` contém dígito**; no máximo 8 entradas com `gatilho: SEMPRE` |
| U-04 | **lint de tom**: `semCobranca()` verde em todo `rotulo` e todo `texto`, incluindo `edu.retomada`; toda entrada de família cobertura/registro/tempo casa a moldura do sistema |
| U-05 | **educadora nunca é rankeada**: nenhuma entrada de `'educador'` tem `fonte ∈ FONTES_PROIBIDAS`; nenhuma entrada `aprimoramento` de educadora tem `sujeito === 'pessoa'` |
| U-06 | **coerência com o código**: todo `acao` valida em `validarAcao(id, papel)` para **cada** papel da entrada; toda `tela` e todo `suprimidoEm` ∈ `ROTAS_CONHECIDAS`; todo `id` único |
| U-07 | **envelope é livre de nome**: `JSON.stringify(sinaisDe(u, tela))` para os 3 papéis × todas as telas não contém nenhum dos nomes do roster (inclui evadidas) nem nome de turma; `congelar({papel:'educador', x:'Ana Clara'})` lança |
| U-08 | **escopo de turma da educadora**: `sinaisDe(maria).alertas_turma` === `D.alertas(null, maria.id).length`, e é **menor** que `D.alertas().length` no banco semeado |
| U-09 | **diretoria não recebe nada individual**: as chaves do envelope de diretoria estão numa allowlist explícita; nenhum candidato dela carrega `crianca_id`, `turma_id` ou nome |
| U-10 | **teto anti-bolha**: base 0,88 nunca perde para base 0,20, com afinidade e penalidades extremas nos dois sentidos (o teste que quebra se as penalidades saírem de dentro do clamp) |
| U-11 | **piso de núcleo**: perfil com 20 `dispensada` em `edu.chamada_hoje` e chamada aberta → ele continua no slot 1 |
| U-12 | **teto de UMA pendência**: com 5 pendências vivas, o painel devolve no máximo 1 de `classe:'pendencia'`; as outras vagas são de outras classes |
| U-13 | **`aprender=0` ⇒ ranking idêntico** ao determinístico puro (igualdade profunda de ids e ordem) |
| U-14 | **silêncio expira**: não-núcleo dispensado há 15 dias volta; há 13 não. Núcleo dispensado hoje some hoje e **volta amanhã** |
| U-15 | **a sugestão some quando o trabalho é feito**: envelope com chamada aberta → id presente; `D.salvarChamada(...)` → recoleta → id ausente. *(É o teste do "aprendizado".)* |
| U-16 | **supressão por tela**: `edu.chamada_hoje` não aparece em `#/hoje` nem em `#/chamada`; aparece em `#/ciclo` |
| U-17 | **nenhum schema do Passo declara `maxLength`** (caminhada recursiva nos três schemas + no `assistente_passo` existente) |
| U-18 | **consulta agregada é byte a byte**: a resposta da capacidade `consulta_agregada` === `R.consultar(p).resposta` |
| U-19 | **cerca do orquestrador por FECHO TRANSITIVO de imports**: o grafo de `from '...'` a partir de `src/passo/orquestrador.js`, resolvido recursivamente, **não contém** `src/db.js`, `src/domain.js`, `src/scores.js`, `src/relatorio.js` nem `src/copilot.js`. Grep raso não vale: `copilot.js` puxa o banco inteiro por transitividade, e foi por isso que essa cerca foi decorativa em plano anterior |
| U-20 | **`aceitarRotulo`**: rejeita dígito, numeral por extenso, quantificador, cobrança, pseudônimo, nome do roster, nome de turma; e devolve o rótulo do catálogo em `imune: true` |
| U-21 | **vocabulário do perfil**: `registrar(1,'tela', nomeDeCrianca)` lança 422; `registrar(1,'sugestao','inventada')` lança 422 |
| U-22 | **decaimento**: dois eventos a 21 dias → peso ≈1,5; a 63 dias → ≈1,125 (função pura com `hoje` injetado) |
| U-23 | **dedupe diário**: 8 aberturas do painel no mesmo dia produzem `n = 1` em `mostrada` |
| U-24 | **retenção**: linha com `dia_ultimo` de 91 dias atrás some na abertura; de 89 fica |
| U-25 | **apagar é cirúrgico**: `apagarMemoria(1)` zera a pessoa 1 e não toca a 2 |
| U-26 | **fingerprint**: alterar o roster de `educador` no banco principal invalida o perfil na abertura seguinte |
| U-27 | **o painel não escreve no banco principal**: `COUNT(*) FROM atividade` idêntico antes e depois de 20 aberturas (senão `estadoDeRetomada` passa a mentir) |
| U-28 | **orçamento**: `sinaisDe()` < 8 ms por papel no banco semeado (pega O(n²) acidental) |
| U-29 | **rota nunca 5xx**: `sinaisDe` com uma coluna forçada a `null` devolve `ENVELOPE_VAZIO` e o painel cai no fallback estático — não lança |
| U-30 | **os testes atuais do Passo continuam verdes sem alteração** (`unit-test.mjs:797-966`), incluindo `chipsDe(eduPasso,'#/chamada').chips.length === 3` casando `/presença|cronômetro/i` |

### 7.2 `scripts/ai-stub.mjs` — e o canal de controle que faltava

O stub despacha pelo **conteúdo da última mensagem `role:'user'`** (`ai-stub.mjs:56`). No painel não existe mensagem vinda da pessoa — foi por isso que quatro testes de stub eram inexecutáveis em plano anterior. Correção: o orquestrador anexa uma última mensagem de usuário com o marcador **quando `process.env.PASSO_STUB_MARCADOR` está definido** (só em teste; no-op em produção, e o teste U-31 assere que sem a env nenhuma mensagem extra é montada).

```js
else if (nome === 'passo_painel') {
  const ids = js.schema?.properties?.ordem?.items?.enum ?? [];
  conteudo = JSON.stringify({
    ordem: ultima.includes('__stub_inverte__') ? [...ids].reverse()
         : ultima.includes('__stub_dropa__')   ? ids.slice(1)
         : ultima.includes('__stub_id_falso__')? ['id-que-nao-existe', ...ids.slice(0,2)]
         : ids.slice(0, 4),
    rotulos: (ids.slice(0,1)).map(id => ({ id,
      rotulo: ultima.includes('__stub_digito__')   ? 'Faltam 12 olhares no ciclo'
            : ultima.includes('__stub_extenso__')  ? 'Quase todas as crianças sem registro'
            : ultima.includes('__stub_cobranca__') ? 'Você deixou a chamada pendente'
            : ultima.includes('__stub_nome__')     ? 'A Ana Beatriz precisa de atenção'
            : 'Rótulo reescrito pelo stub' })),
  });
}
else if (nome === 'passo_rota') { /* capacidade/entrada/confianca controláveis por marcador */ }
```

### 7.3 `scripts/ai-stub-test.mjs` — 12 asserções

| # | teste | invariante |
|---|---|---|
| S-01 | reflexiva forçada a `copilot` mesmo com J1 dizendo `guia` | veto duro |
| S-02 | J1 **pode** ampliar para `copilot` quando a regex não pegou | ganho de recall, direção segura |
| S-03 | capacidade não permitida ao papel → `guia` | isolamento de papel |
| S-04 | `confianca 0.3` → `guia` | limiar |
| S-05 | J1 **não é chamado** quando `casarIntencao` casa (contador de requisições do stub = 0) | o léxico vence |
| S-06 | `__stub_inverte__` com núcleo presente → núcleo volta ao slot 1 | piso sobrevive ao modelo |
| S-07 | `__stub_dropa__` → o candidato omitido é **reanexado** na ordem determinística | o modelo não some com sinal autorizado |
| S-08 | `__stub_id_falso__` → descartado, painel completo mesmo assim | enum + refiltro |
| S-09 | `__stub_digito__` → rótulo revertido ao catálogo | **número nunca nasce de modelo** |
| S-10 | `__stub_extenso__` → revertido | quantidade por extenso também é número |
| S-11 | `__stub_cobranca__` e `__stub_nome__` → revertidos; contadores da autocrítica incrementam | tom e privacidade |
| S-12 | `__stub_trava__` / `__stub_500__` no `/refinar` → `{refinado:false}` em <3 s, **nunca 5xx**; e com uma reflexão em voo, J2 (`'fundo'`) desiste sem entrar na fila | fallback 100% + não estrangular o copilot |

### 7.4 `scripts/smoke-test.mjs` — bloco 21

1. `GET /api/passo/painel` → 401 sem sessão; 200 para maria/rita/solange.
2. **Varredura de privacidade ponta a ponta:** o corpo INTEIRO da resposta, serializado, para os 3 papéis × todas as telas conhecidas, passa por `anonimizarTexto` com o roster completo → **0 substituições**, nenhum casamento de `/Criança [A-Z]/` e nenhum nome de turma.
3. Todo `acao.hash` devolvido ∈ `PASSO_ROTAS_POR_PAPEL[papel]` (incluindo `#/alertas`, que este plano adiciona).
4. `POST /api/passo/uso {id:'inventada'}` → 422; `{evento:'x'}` → 422.
5. `POST /api/passo/uso {evento:'dispensada'}` → o id some da resposta seguinte e `silenciada_ate` volta preenchido.
6. `POST /api/passo/memoria {aprender:false}` → painel seguinte com **a mesma ordem de ids** do determinístico puro.
7. `DELETE /api/passo/memoria` → `GET` seguinte com `linhas: []`.
8. **Gate de persistência:** grava uso → `node scripts/reset.mjs` → `GET /api/passo/memoria` ainda traz as linhas. Repetir simulando mudança de assinatura do DDL (`PRAGMA user_version = 0` no banco principal + reabrir).
9. `GET /api/passo/qualidade` → 403 para educador e diretoria; 200 para coordenação, com todos os recortes suprimidos (3 pessoas < 5).
10. `modo=badge` responde em p95 < 200 ms sobre 20 chamadas.
11. `GET /api/assistente/chips` mantém **exatamente** `{chips: [3 strings], com_modelo}`.
12. `GET /api/painel` e `GET /api/hoje` não regridem em tempo (o memo de sinais não pode reexecutar `riscoEvasao({})`).

### 7.5 Gates de liberação

1. `npm run test:unit && npm test && npm run test:ia` verdes.
2. `git diff src/db.js` vazio na constante do esquema — **a assinatura do DDL não muda**.
3. `git diff server.js` vazio.
4. Nenhuma linha do diff introduz `maxLength` em schema.
5. **Gate humano (a coordenação lê os textos):** as ~46 frases vão para a tela de uma educadora e passam pela mesma revisão humana do resto do produto antes do piloto. Nenhuma frase de aprimoramento com sujeito "você".
6. **Gate de latência antes de ligar J2:** p50 ≤ 1,5 s e p95 ≤ 2,5 s no `refinar` com o 4B real na máquina alvo; senão entrega com `PASSO_PAINEL=0` — o determinístico é indistinguível para quem usa.
7. ADR 27 escrito; doutrina 5′ substituída nos 4 lugares onde a frase antiga aparece.

---

## 8. Riscos, mitigações e o que fica FORA de escopo

| risco | probabilidade | mitigação decidida |
|---|---|---|
| **Número reescrito pelo modelo** (o furo mais grave das quatro propostas) | alta se não tratado | Estrutural: o modelo só vê e devolve `rotulo`, que é **livre de dígito por construção**; `aceitarRotulo` rejeita dígito, numeral por extenso e quantificador; `texto` e `resumo` são template. Testes U-03, U-20, S-09, S-10 |
| **Somatório vira cobrança** mesmo com cada item educado | alta | Teto de UMA pendência por painel (U-12); alívio pode vencer; badge suprimido em `em_lapso`; "Hoje não" honesto; nunca fala em voz alta |
| **Painel repete a tela** e vale zero nos 2 minutos da Maria | alta | `suprimidoEm` por entrada, com `#/hoje` explicitamente coberto (U-16). Foi a crítica mais repetida entre os quatro ângulos |
| **Nome de turma como proxy da educadora** | média | Proibido em texto e em prompt (U-02, `aceitarRotulo`); o recorte nominativo fica em `#/scores`, que já o renderiza |
| **Cerca do orquestrador furada por transitividade** | média | `comVaga` extraída para `src/fila-modelo.js`; teste de **fecho transitivo** de imports (U-19), não grep |
| **J2 estrangula o copilot** | média | `prioridade:'fundo'` desiste sem entrar na fila (S-12); `timeoutMs` novo em `conversar` impede slot preso por 90 s |
| **Perfil morre no reset / vai para a pessoa errada** | média | Banco derivado + `PERCURSO_PASSO_DB` + fingerprint do banco principal (U-26, smoke 8) |
| **Badge sempre aceso** = badge ignorado | média | Núcleo + `mostrada_dia` + apaga quando o sinal esfria + invalidação no POST de estado |
| **Autoria dos ~46 textos é o gargalo real do lote determinístico** | alta | Reconhecido: não é engenharia, é redação. Os testes escrevem o molde (U-01 a U-05), não o texto. Vai como passo próprio na §9, com gate humano |
| **Personalização sem sinal num piloto de 3 usuários** | alta | Reconhecido e compensado pela **preferência declarada** (`prefere_tipo`, +0,30, zero telemetria) e pelo desaparecimento por estado. O plano não promete efeito de afinidade dentro do horizonte do artefato |
| **`sinais.js` estoura a estimativa** | média | É o arquivo mais denso; vai sozinho no passo 2, com as guardas de custo e o memo escritos junto e cobertos por U-28 |

**Fora de escopo, explicitamente:**
- Rota nova `#/passo` — a memória vive dentro do sheet.
- `marcarAtividade` nas rotas de gestão — criaria trilha por pessoa nova para dois papéis que hoje não têm nenhuma; `publicado_em`/`aprovado_em` já dizem o que precisa ser dito.
- Poda de `atividade` no fecho de ciclo — apagar a trilha quebra `estadoDeRetomada` (`domain.js:847-856`) justamente para quem ficou 200 dias fora, que é quem mais precisa da mensagem.
- Qualquer recorte por educadora em `/api/passo/qualidade`.
- Embeddings, reranking, LoRA, memória de conversa persistida, notificação push.
- Deep-link `#/consulta?q=` — resolvido melhor: o Passo **responde ali mesmo** com `R.consultar()`.
- `riscoEvasao`, `numerosDoPeriodo` e `planoDaTurma` no envelope.

---

## 9. Ordem de implementação — 7 passos, cada um verde por si

| # | entrega | arquivos | verificado por |
|---|---|---|---|
| **1** | **Doutrina e buracos de contrato.** ADR 27; doutrina 5′ nos 4 lugares; `CATALOGO_ACOES` ganha `alertas`; `PASSO_ROTAS_POR_PAPEL` ganha `#/alertas`; `periodosSugeridos` move de `api.js:694` para `relatorio.js` exportada; `comVaga` migra para `src/fila-modelo.js`; `conversar({timeoutMs})` | `assistente.js`, `app.js`, `api.js`, `relatorio.js`, `copilot.js`, `fila-modelo.js`, `ai-client.js`, `docs/` | suíte atual inteira verde, sem uma linha de teste alterada |
| **2** | **Sinais.** `src/passo/sinais.js` com o envelope, `congelar()`, as 7 SQLs novas, o memo por `(educador_id, tela, hoje())` e as guardas de custo. Nada muda na UI. | `src/passo/sinais.js` | U-07, U-08, U-09, U-27, U-28, U-29 |
| **3** | **Catálogo e ranking, determinísticos.** `catalogo.js` (as ~46 entradas), `ranking.js`, `painel.js`, `GET /api/passo/painel`. **Sem modelo, sem perfil.** | `src/passo/*`, `api.js` | U-01…U-06, U-10…U-12, U-16 |
| **4** | **Superfície.** Chips vivos com card, ponto no FAB, resumo do dia, balão do momento, "Hoje não", CSS. **Já é entregável: o produto vira parceiro aqui, com `AI_ENABLED=0`.** | `public/app.js`, `public/styles.css` | smoke 1-3, 11, 12 · manual em 375 px |
| **5** | **Perfil.** `data/passo/uso.db`, telemetria por POST, decaimento, retenção, fingerprint, seção de memória, opt-out, preferência declarada; `reset.mjs --esquecer`. | `src/passo/perfil.js`, rotas, `reset.mjs`, `.gitignore` | U-13…U-15, U-21…U-26 · smoke 4-8 |
| **6** | **Qwen orquestrador.** `orquestrador.js` com J1 e J2, os dois schemas, `conciliar`, `aceitarRotulo`, `/refinar`, prompts versionados, stub estendido. | `src/passo/orquestrador.js`, `assistente.js`, `ai/prompts/*`, `scripts/ai-stub.mjs` | S-01…S-12, U-17…U-20 · gate de latência |
| **7** | **Autocrítica e docs.** `GET /api/passo/qualidade` com supressão por pessoa; decisão 27, doutrina 5′, DDL do perfil e bloco de testes nos docs. | `api.js`, `docs/` | smoke 9 |

**Se o tempo acabar no passo 4, o pedido 1 do usuário está entregue inteiro — sugestões por papel, por tela, ancoradas no estado real, nos quatro tipos — sem uma linha de modelo e sem uma tabela nova.** Esse é o teste real da doutrina "o produto tem que ser INTEIRO sem modelo". O passo 5 entrega o pedido 2; o passo 6 entrega o pedido 3. Cada um é reversível sozinho por kill switch.