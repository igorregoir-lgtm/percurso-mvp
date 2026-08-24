# O que veio do `percurso-v2-pack` — matriz de adoção

Análise de 22/08/2026 do pacote de especificação `percurso-v2-pack` (dez markdowns, três boards
HTML e cinco arquivos em `codigo/`) contra o MVP funcional, seguindo as regras de
`1 - Arquitetura/` (guia do aluno da semana 10, dossiê de campo e os quatro slides produzidos em
aula).

O pack é **especificação**, não repositório: não tem `git`, não tem runner, não tem um único teste,
e o próprio `09-CHECKLIST-ENTREGA.md` marca o bloqueio — *"entrega via repositório: app hospedado em
builder proprietário não atende sozinho"*. O MVP é o repositório que faltava. Esta matriz registra o
que foi adotado, o que foi adaptado com justificativa, e o que foi recusado.

Critério de adoção, herdado do próprio pack (`02-FEATURES.md`): **se o critério de aceite não pode
ser demonstrado, a feature não está pronta.** Cada linha abaixo aponta o teste que a demonstra.

---

## 1. As quinze features

| # | Feature do pack | Estado | Onde | Teste |
|---|---|---|---|---|
| F1 | Chamada que registra, funciona offline | **adotada + fila offline** | `#/chamada`, `public/fila.js` | smoke §2; unit ×5 (fila com armazenamento e envio injetados); decisão 17 |
| F2 | Folha do dia, registro da turma | **nova** | `#/folha`, `src/voz.js` (`salvarFolha`) | smoke §11 |
| F3 | Captura por voz, 40 s, áudio descartado | **adaptada** | `#/voz` (`SpeechRecognition` no navegador) | smoke §11; decisão 13 |
| F4 | Agente extrator com schema fechado | **adaptada** | `src/voz.js` (`extrairDaFala`, `validarExtracao`) | unit ×5 (`validarExtracao` + 4 de `extrairDaFala`), smoke §11 |
| F5 | Lista de exclusão com encaminhamento humano | **adotada e realocada** | `filtrarPerimetro` + `modalEncaminhamento` | unit ×8 (5 de `filtrarPerimetro` + os de regressão SRV-04, categoria 5 e área *saúde*), smoke §11 |
| F6 | Confirmação humana antes de gravar | **adotada** | `#/confirmar`, `POST /api/folha` | smoke §11 |
| F7 | Ingestão retroativa com dedup de criança | **adotada** | `src/ingestao.js`, `#/importar` | unit ×4 (`lerCsv`, `chaveDeCrianca` + regressões SRV-02 e fusão), smoke §15 |
| F8 | Score de risco de evasão | **adotada, pesos recalibrados** | `src/scores.js` (`riscoEvasao`) | unit ×3 + 2 de `suprimir`, smoke §12 |
| F9 | Score de cobertura do registro | **adotada** | `src/scores.js` (`coberturaRegistro`) | unit ×2 (folha em branco + regressão SRV-05), smoke §12 |
| F10 | Score de exposição | **adotada** | `src/scores.js` (`exposicao`) | unit ×1, smoke §12 |
| F11 | Pauta de segunda, com aceite e descarte | **adotada** | `#/pauta`, `pautaDaSemana`, `decidirPauta` | unit ×1, smoke §13 |
| F12 | Painel da coordenação com cobertura | **adotada** | `#/painel` (bloco "Cobertura do registro") | smoke §12 (*"a cobertura enumera TODAS as turmas"*, *"o painel traz a terceira linha do board"*) |
| F13 | Gerador do relatório do ciclo | **adotada** | `src/relatorio.js`, `#/relatorio` | unit ×5 (supressão, revisor ×2, regressão E-02, guarda da interface), smoke §16 |
| F14 | Carta do trimestre | **adotada** | mesmo pipeline, `redigirCarta` | unit ×1 (mínimo de célula na manchete), smoke §16 |
| F15 | Consulta em linguagem natural *(opcional no pack)* | **adotada, determinística** | `consultar`, `#/consulta` | unit ×1, smoke §17 |

## 2. As onze telas

| # | Frame do board v2 | Estado | Rota |
|---|---|---|---|
| 1 | `entrada` — entra Solange Ribeiro, diretoria | adotado | `#/entrar` |
| 2 | `hoje` — "Contar como foi" e bloco "Para esta semana" | adotado | `#/hoje` |
| 3 | `chamada` | sem mudança | `#/chamada` |
| 4 | `folha-do-dia` — "Contar como foi" como ação principal | adotado | `#/folha` |
| 5 | `registrar-por-voz` | adotado | `#/voz` |
| 6 | `confirmar-registro` | adotado | `#/confirmar` |
| 7 | `olhar` — sai o texto livre, vira opcional | adotado *(ver §5)* | `#/observacao/:id` |
| 8 | `pauta-de-segunda` | adotado | `#/pauta` |
| 9 | `turma` — rótulo passa a descrever o registro | adotado | `#/turma` |
| 10 | `painel-coordenacao` — ganha cobertura do registro | adotado | `#/painel` |
| 11 | `gerar-relatorio` (diretoria) | adotado | `#/relatorio` |

Telas que o MVP tem **além** do board, herdadas da v1 e mantidas: `#/ciclo` (agenda de observação),
`#/safras`, `#/sintese`, `#/consentimentos`, `#/alertas`, `#/criancas`, `#/crianca/:id`. Duas telas
novas fora do board, exigidas pelas features: `#/scores` (F9/F10 não cabem no painel) e `#/importar`
(F7 precisa de uma porta).

## 3. Design

Os tokens do board foram adotados **integralmente**, sem cor nem fonte nova:

| Token | Valor | Onde |
|---|---|---|
| Fundo | `#F4EFE5` | `--bg` |
| Cartão | `#FFFFFF`, borda `#E6DFD0`, canto `11px` | `--card`, `--line`, `--r` |
| Primário | `#B0392C`, texto branco, canto `9px` | `--red`, `--r-s` |
| Secundário | branco com borda | `.btn.secundario` |
| Pill ativa | fundo `#DCE9CA`, texto `#4A6B2A` | `--ok-bg`, `--ok` |
| Âmbar (atenção) | `#FBF1DC` / `#8A6316` / borda `#EBDCB8` | `--atencao-bg`, `--atencao`, `--atencao-linha` |
| Tipografia | sans, sentence case, títulos `600` com `-0.02em` | `--sans`, `h1`–`h3` |

**Uma adição declarada:** o board não previa modo escuro; o MVP mantém a variante escura da v1,
reencenando os mesmos papéis (fundo, superfície, tinta, linha, acento, verde, âmbar) em luminância
invertida. Nenhum matiz novo foi introduzido. Derrubar o modo escuro seria regressão de
acessibilidade para uma persona que usa o celular em pé dentro da sala.

**Uma remoção declarada:** os títulos deixaram de ser serif (Georgia). O board v2 é sans em tudo, e
o pack manda explicitamente *"não introduza cor nem fonte nova"*.

## 4. As três regras do pack, verificadas

| Regra | Onde vira código | Teste que prova |
|---|---|---|
| 1. A IA nunca grava; a IA pré-preenche e a pessoa confirma | `POST /api/voz/extrair` devolve `gravado: false`; a única escrita é `POST /api/folha` | *"antes de confirmar, não existe folha no banco"*, *"o que a pessoa confirmou vence o que a IA propôs"* |
| 2. Nenhum dado individual sai; agregado com supressão abaixo de cinco | `suprimir()` roda antes da redação, em programas, faixas e áreas | *"a supressão foi aplicada ANTES da redação"*, *"nenhum nome de criança aparece no relatório"* |
| 3. Se a IA cair, o registro manual continua | `#/folha` é caminho completo e independente; "Prefiro escrever" e o campo de digitação estão sempre visíveis; falha de rede cai na fila | *"editar à mão marca a folha como manual"* e *"edição manual não grava confiança de agente nenhum"* (smoke §11); os cinco testes de fila em `unit-test.mjs` |

## 5. O que foi adaptado, e por quê

**Transcrição paga → `SpeechRecognition` do navegador.** O pack desenha n8n + API de transcrição.
O bloco 5 do dossiê trata licença recorrente como risco, e mandar áudio de criança para nuvem de
terceiro cruza o perímetro do bloco 6. A transcrição acontece no aparelho; o servidor recebe texto,
usa em memória e não grava. Decisão 13.

**Agente extrator LLM → casamento lexical sobre listas fechadas.** Mesmo contrato de saída, mesma
validação de schema, mesmo estado de baixa confiança, custo de licença R$ 0 e cada campo auditável.
O slot do modelo continua declarado: trocar por um SLM local não muda contrato nenhum. Decisão 13.

**`codigo/scores.js` do pack → `src/scores.js`.** Três correções:
1. Era CommonJS (`module.exports`) num projeto todo ESM.
2. Chamava `new Date()` dentro do corpo — impossível de testar de forma determinística. O relógio
   virou parâmetro (`ref`).
3. `riscoEvasao` devolvia `0` quando o histórico tinha menos de quatro pontos, o que **reprovava o
   próprio critério de aceite de F8** ("criança com duas faltas seguidas aparece na lista no dia
   seguinte à segunda falta"). A contagem de faltas consecutivas agora é sempre calculada.
   Os pesos também foram recalibrados: ver decisão 18.

**`suprimir()` do pack → agrupamento em vez de descarte silencioso.** A versão do pack filtra os
recortes pequenos e some com eles. O `08-RELATORIO-DOADOR` diz que *"turmas pequenas são agrupadas
antes da geração"*. A versão adotada agrupa em um bucket nomeado, e só descarta se nem o bucket
passar do mínimo — e o relatório declara na tela o que foi agrupado. Apagar sem dizer transforma
supressão em omissão.

**Modelo de dados do pack → esquema do MVP.** A tabela `score_snapshot` do `05-MODELO-DE-DADOS.md`
não foi criada: o próprio pack diz que o score de evasão é *"recalculado, não historiado"*. Ele é
computado a cada consulta. `aspiracao` virou tabela própria com `declarada_em`, como o pack pede
(na v1 era coluna em `crianca`).

**`olhar` perde o texto livre.** Adotado do pack, com uma consequência que o pack não previu: o
filtro de perímetro **muda de posto** e passa a guardar a transcrição de voz, onde revelação
sensível é muito mais provável. Decisão 15.

## 6. O que foi recusado

| Item | Por quê |
|---|---|
| Stack no-code (Glide + n8n + Airtable + Softr) | Licença recorrente é risco declarado no bloco 5; formulário externo move dado de criança para nuvem de terceiro. O desvio já estava registrado na decisão 1 e vale igualmente para a v2. |
| `score_snapshot` como tabela | O próprio pack declara o score como recalculado. Historiar score de risco de criança cria um passivo de retenção sem uso. |
| Bloco 4 do relatório com a âncora acadêmica | O relatório do parceiro educacional não é ingerido: a pergunta 2 do bloco 7 segue sem resposta pelo canal mediado. O bloco existe com a comparação de dose que o sistema **consegue** calcular, e declara por escrito o que ainda não entrou. |
| Marcadores do `olhar` do board ("Ajudou outra criança" etc.) como substitutos da rubrica | A rubrica de âncoras comportamentais é a resposta M5 do slide de arquitetura, ancorada em EDI/DESSA/SENNA. Os marcadores do board viraram `folha_marcador`, no nível da turma — que é onde o pack mesmo os coloca no schema de extração. |

## 7. O que o pack pedia e o MVP já tinha

Vale registrar, porque é o argumento de por que a base era esta e não o app do builder: agenda do
ciclo com motivo de bloqueio, consentimento por campo com chave estrangeira, safras e permanência,
reconciliação das fontes divergentes, síntese de ciclo com revisor de sobre-alegação, cronômetro do
tempo de registro, plano da semana, supressão de célula pequena nos agregados, retomada sem culpa
após lapso — tudo já operante e testado antes desta rodada.

## 8. Auditoria adversarial de 22/08/2026

Depois de implementar, o repositório passou por uma auditoria multi-agente com seis lentes
independentes (aceites do pack, copy e telas, código de servidor, perímetro ético, front-end,
documentação e testes) e um refutador por lente, instruído a derrubar cada achado e a refutar na
dúvida. Foram levantados 28 achados; **19 sobreviveram à refutação e todos foram corrigidos**, com
teste de regressão para cada um. O registro completo está em
[`revisao/03-AUDITORIA-V2.md`](revisao/03-AUDITORIA-V2.md).

O achado P1 vale ser lido antes de qualquer outra coisa: **o texto que sai para o financiador
afirmava que "os programas contribuíram para os avanços observados", e o revisor de sobre-alegação
aprovava** — porque "contribuiu" não estava na lista de verbos e porque a ressalva metodológica
exigida pela trava estava dentro da própria frase causal. A trava existia, estava ligada, e o único
texto que ela deveria barrar era o que ela carimbava.

## 9. O que continua em aberto

| Item | Origem | Estado |
|---|---|---|
| Validação com usuário real | `09-CHECKLIST-ENTREGA.md` e guia da semana 5 | **pendente** — é a única coisa que não dá para fazer na véspera |
| RBAC com escopo de turma nas rotas **herdadas** de leitura individual (ficha, lista, observação) | revisão de 22/08/2026 (A-07) | pendente. As rotas da v2 e a chamada já têm escopo (`exigeAcessoTurma`); fechar as herdadas exige decidir com a coordenação o caso da educadora substituta, que hoje não tem representação no modelo |
| Autenticação, HTTPS e log de auditoria de acesso | achados A-01 a A-04 | dívida declarada; bloqueiam operação com dado real, não a entrega |
| Vídeo demonstrativo | entrega da semana 10 | **desatualizado**: o vídeo em `video/` mostra a v1, antes das telas de voz, pauta e relatório |
| Âncora acadêmica (M2) | pergunta 2 do bloco 7 | aguarda canal mediado |
