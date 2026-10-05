# Evidências de teste — entrega da Semana 10

Execução de **05/10/2026**, macOS 26.6, Node v26.7.0 (o `.nvmrc` fixa o 24 LTS; o mínimo é 22.13).
Saída completa, linha a linha: [`EVIDENCIAS-DE-TESTE.txt`](EVIDENCIAS-DE-TESTE.txt). O que cada bloco
da bateria de fluxo cobre: [`TESTES.md`](TESTES.md).

## 1. Resumo — sete baterias, nenhuma falha

| Bateria | Comando | Passaram | Servidor | O que prova |
|---|---|---|---|---|
| Fluxo principal | `node scripts/reset.mjs && npm test` | **515 / 515** | o do usuário, no ar | os fluxos dos quatro papéis, ponta a ponta, pela API |
| Regras de domínio | `npm run test:unit` | **223 / 223** | nenhum (banco temporário) | regras críticas isoladas da HTTP |
| Persistência | `npm run test:persistencia` | **9 / 9** | próprio, derrubado e religado | o dado está no disco, não na memória do processo |
| Quebra | `npm run test:quebra` | **17 / 17** | próprio | entrada inválida é recusada com mensagem — nunca 500, nunca lixo gravado |
| Camada de IA | `npm run test:ia` | **24 / 24** | stub do modelo | coleiras do copilot e fallback quando o modelo cai |
| Áudio | `npm run test:audio` | **19 / 19** | stub do whisper | nenhum arquivo de áudio sobrevive à transcrição |
| RAG | `npm run test:rag` | **6 / 6** | nenhum | citações existentes, pt-BR, consulta pseudonimizada |

Nenhuma bateria além da de fluxo toca `data/percurso.db`. As sete rodam no CI a cada push
(`.github/workflows/ci.yml`), com `AI_ENABLED=false`.

## 2. Persistência após reiniciar o servidor

A aula de 30/09 definiu a primeira versão como concluída quando ela *"abre no navegador, salva
informações em pelo menos duas tabelas e persiste os dados após reiniciar o servidor"*. O teste
faz exatamente isso, sem depender de voz: grava uma chamada (tabelas `encontro` + `presenca`) e o
cadastro de uma professora (`educador`), **encerra o processo**, sobe outro sobre o mesmo arquivo e
relê pela API.

```
✓ 1º servidor sobe e cria/semeia o banco sozinho
✓ chamada de 2026-09-29 gravada (20 crianças)
✓ professora nova cadastrada pela coordenação
✓ 1º servidor encerrado
✓ 2º servidor sobe sobre o MESMO arquivo de banco
✓ a chamada continua registrada depois do reinício
✓ cada presença/falta voltou exatamente como foi marcada
✓ a data gravada não volta para a lista de pendentes
✓ a professora cadastrada continua na tela de entrada
```

**O teste foi provado sensível.** Rodado com o banco em memória (`PERCURSO_DB=:memory:`, que
morre com o processo), as quatro asserções de releitura **falham**. Um teste que passa nos dois
casos não prova nada; este distingue o certo do errado.

## 3. Testes de quebra — situação inicial, esperado, obtido

Formato da aula de 30/09: cada caso parte de uma situação, tenta uma entrada inválida e compara o
resultado esperado com o obtido. Nenhum caso depende do reconhecimento de voz.

| # | Situação inicial | Entrada inválida | Esperado | Obtido | |
|---|---|---|---|---|---|
| 1 | Coordenação no cadastro de equipe | nome em branco | recusa 4xx com mensagem | 422 — "O nome é obrigatório." | ✓ |
| 2 | Coordenação no cadastro de equipe | nome só com espaços | recusa 4xx com mensagem | 422 — "O nome é obrigatório." | ✓ |
| 3 | Coordenação no cadastro de equipe | papel inexistente ("diretor-geral") | recusa 4xx com mensagem | 422 — "Escolha o papel: professora, psicóloga, coordenação ou diretoria." | ✓ |
| 4 | Coordenação no cadastro de criança | nome da criança em branco | recusa 4xx com mensagem | 422 — "O nome da criança é obrigatório." | ✓ |
| 5 | Coordenação no cadastro de criança | nascimento "ontem à tarde" (data ilegível) | recusa 4xx com mensagem | 422 — "A data de nascimento precisa vir no formato dia/mês/ano." | ✓ |
| 6 | Coordenação no cadastro de criança | turma inexistente (id 999999) | recusa 4xx com mensagem | 404 — "Turma não encontrada." | ✓ |
| 7 | Coordenação no cadastro de criança | turma com id negativo (-3) | recusa 4xx com mensagem | 422 — "Parâmetro inválido: turma_id." | ✓ |
| 8 | Educadora na chamada do dia | turma com id negativo (-1) | recusa 4xx com mensagem | 422 — "Parâmetro inválido: turma_id." | ✓ |
| 9 | Educadora na chamada do dia | turma inexistente (id 999999) | recusa 4xx com mensagem | 404 — "Turma não encontrada." | ✓ |
| 10 | Educadora na chamada do dia | data em branco | assume a data de hoje (padrão da rota) | 200 — chamada registrada com a data de hoje | ✓ |
| 11 | Educadora na chamada do dia | data impossível (2026-02-31) | recusa 4xx com mensagem | 422 — "A data da chamada não existe no calendário." | ✓ |
| 12 | Educadora na chamada do dia | criança que não existe na lista | recusa 4xx com mensagem | 422 — "Criança 999999 não pertence a esta turma." | ✓ |
| 13 | Educadora na chamada do dia | tempo de registro negativo (-30 s) | o -30 não vira medida | 200 — chamada salva, tempo gravado vazio | ✓ |
| 14 | Educadora na chamada do dia | lista de marcações vazia | recusa 4xx com mensagem | 422 — "Faltou marcar 20 criança(s). Marque todas antes de salvar." | ✓ |
| 15 | Qualquer tela que envia dados | JSON malformado | recusa 4xx com mensagem | 400 — "JSON inválido no corpo da requisição." | ✓ |
| 16 | Tela de entrada | educador_id com injeção SQL ("1 OR 1=1") | recusa 4xx com mensagem | 422 — "Parâmetro inválido: educador_id." | ✓ |
| 17 | Lista de crianças | filtro de turma não numérico (?turma_id=abc) | recusa 4xx com mensagem | 422 — "Parâmetro inválido: turma_id." | ✓ |

### 3.1 O que a primeira execução encontrou

O teste de quebra foi escrito nesta entrega e **falhou em quatro casos na primeira execução**. É
para isso que ele existe. O que foi feito com cada um:

| Caso | Antes | Diagnóstico | Agora |
|---|---|---|---|
| 11 · data impossível | **200**: gravava um encontro em 31/02 | a única checagem era `data > hoje()`, comparação de **texto**; "2026-02-31" é menor que hoje | `salvarChamada` passa pela mesma `dataObrigatoria` que já protegia a data de nascimento — ida e volta pelo calendário |
| 17 · `?turma_id=abc` | **200**: devolvia todas as turmas | `Number('abc')` é NaN e o filtro sumia em silêncio | filtro presente e inválido é 422, com o mesmo `num()` das outras rotas |
| 13 · tempo negativo | **200**: o -30 era gravado como **1 s** | um `Math.max(1, …)` "consertava" o valor, que entrava na métrica de custo de tempo do painel (meta de 120 s) | tempo fora de (0, 1 h] é **descartado** (`null`) e a chamada salva igual — decisão do gestor: a medição que falha não derruba o registro. Vale também para o outro extremo: o app esquecido aberto deixou de virar "1 hora" |
| 10 · data em branco | **200** | não é defeito: a rota assume hoje quando a data não vem, no GET e no POST | mantido; o caso passou a esperar esse comportamento |

O caso 13 ganhou também um teste unitário que cobre os dois extremos e o texto (`-30`, `5000`,
`'abc'` → vazio; `47` → 47), conferindo que a presença é gravada em todos.

## 4. Recorte sem voz

A aula de 30/09 pediu ao grupo testes de funcionalidades **que não dependem da camada de
reconhecimento de voz**, porque ruído e sotaque tornam a voz difícil de testar. Persistência e
quebra são inteiramente sem voz. Na bateria de fluxo, a voz aparece só nos blocos 11 e 26 (folha do dia e
registro de vivência), e mesmo ali o que se testa é o **texto** já transcrito (o extrator, o filtro de perímetro, a confirmação humana),
nunca o microfone. Todo fluxo que tem voz tem também o caminho por botões.

## 5. Limites — o que estes testes não provam

- **Uso por gente real.** Nenhuma bateria substitui a sessão com a psicóloga, que não aconteceu
  ([`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md)).
- **O microfone de verdade.** Reconhecimento de fala em sala com ruído não é testável em CI.
- **Carga.** Não há teste de carga; a operação é de ~120 matrículas e uma dezena de operadores.
- **Navegadores antigos.** Verificado em navegador baseado em Chromium atual.
