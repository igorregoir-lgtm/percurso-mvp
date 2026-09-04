# Handoff — 04/09/2026, 03/09/2026, 02/09/2026 (pós-visita) e 25/08/2026

> ## Sessão de 04/09/2026 — F2 a F8: menos telas, menos toques, e o calendário da casa
>
> Continuação direta da noite anterior (F1, a captura por áudio). **28 rotas viraram 12**, os
> steppers sumiram, o calendário deixou de ser deduzido do dia da semana, a psicóloga passou a ver
> a rubrica na língua dela, e toda leitura de dado individual passou a deixar rastro.
>
> **Decisões novas: 36** (fusão de telas), **37** (calendário da casa) e **38** (rastro de acesso).
>
> **O que mais vale guardar são os defeitos que a mudança revelou — nenhum deles apareceu lendo
> código:**
>
> 1. **`#/relatorio` estava inalcançável por hash desde a v2.** `/^#\/relato/` casa em
>    `#/relatorio`, e o despacho pega o primeiro que casa: quem tocava em "Relatório" — a tela
>    principal da DIRETORIA — caía em *"Sem turma atribuída"*. Nenhum gate pegava, e por um motivo
>    estrutural: smoke é HTTP, o unitário não tem DOM, e o defeito morava só no despacho do cliente.
>    Agora há gate, e ele lê as rotas do próprio arquivo.
> 2. **Um teste que mentia conforme o calendário.** `aurora/preferências` chamava o painel real da
>    Rita e exigia tipos que os gatilhos não produzem todo dia. Falhou em 04/09 e passava nos dias
>    anteriores. Gate que passa conforme a data não avisa: sorteia. E a asserção tinha derivado do
>    próprio nome — `compor` promete vaga reservada, não primeiro lugar.
> 3. **O lapso acusava toda quinta-feira quem só atende sábado**, e o teste de fluxo tinha
>    **derivado a asserção da régua errada** para parar de quebrar. O gate se acomodando ao defeito
>    em vez de acusá-lo é pior que o defeito.
> 4. **`faltas_mencionadas` era código morto** ligando algo que o campo tinha pedido em voz alta —
>    e com um bug de fronteira: "Ana" casava dentro de "sem**ana**".
> 5. **A tabela nova ficou fora da lista de limpeza da semeadura.** O esquema passou em tudo e o
>    `reset` só quebrou quando existia UMA linha nela. Virou gate; na primeira execução ele achou
>    uma segunda tabela já faltando há tempos (`parecer`).
> 6. **Guia duplicado vira texto morto.** Ao fundir telas, dois guias da Aurora ficaram com o mesmo
>    hash — `guiaDe` responde sempre pelo primeiro, sem erro nenhum. E dentro de um deles estava a
>    promessa que a F0 tinha desfeito quatro commits antes: *"o áudio nunca sai do seu aparelho"*.
> 7. **Eu criei três telas sem saída** ao absorver rotas, e só apareceram porque fui clicar. Tela em
>    que se entra e não se sai é pior que tela a mais.
> 8. **A pré-marcação de faltas existia só na memória**: a lista renderizava do dado do servidor.
>    Oferecer e não mostrar é pior que não oferecer.
>
> **O que ficou de fora, e por quê:**
> - **F7, o campo livre de relato, continua fechada.** Dos três pré-requisitos, HTTPS e log de
>   auditoria estão pagos; falta **autenticação**. Hoje entrar é escolher um perfil numa lista, sem
>   senha — identificação, não autenticação. Um campo de texto livre sobre uma criança, num produto
>   em que qualquer pessoa que abra a página escolhe ser a psicóloga, é risco, não frente. Ligar
>   autenticação muda o protocolo de validação e a demonstração: é decisão de quem responde pelo
>   Instituto.
> - **A extração dos seis indicadores por voz.** A colisão que a travava está resolvida e testada
>   (as âncoras já são comportamentais e passam no perímetro); a extração em si é frente própria.
> - **A velocidade do whisper na máquina do Instituto** continua não medida — dívida declarada, não
>   número inventado.
>
> **Gates: 443 smoke · 179 unitários · 6 RAG · 24 ia-stub · 15 áudio-stub.**
>
> ### Continuação: autenticação (dec. 39) e o campo livre de relato (dec. 40)
>
> **A senha sozinha teria sido teatro.** O cookie era `percurso_uid=5` — o próprio id; qualquer
> pessoa trocava o número no navegador e virava a psicóloga, e o comentário no código já chamava
> isso de dívida. As duas peças andam juntas: `scrypt` do `node:crypto` **e** token opaco. Sem
> dependência nova.
>
> **Não há senha semeada, e é deliberado:** senha em seed é senha publicada. `senha_hash = NULL` é
> primeiro acesso. O limite disso fica escrito na decisão 39 — quem chegar primeiro reivindica a
> conta —, e com dado real a coordenação define todas antes de entregar o endereço.
>
> **Com as três dívidas pagas (HTTPS · rastro · autenticação), a F7 destravou** e o campo livre
> voltou. Dois campos, não um: o do **grupo** na folha (legítimo interesse, 5 anos, equipe) e o da
> **criança** em tabela própria (consentimento específico, descarte no fim do ciclo, leitor
> restrito). Misturá-los faria o descarte de um levar o outro junto.
>
> **Divergi do plano num ponto, e está declarado na decisão 40.** Ele dizia que o filtro passaria a
> *"avisar sem bloquear"* fora da categoria de nome. Não adotei: as categorias que o perímetro barra
> são clínicas e protetivas, e deixá-las passar transformaria a folha da turma num prontuário com
> retenção de cinco anos. Um aviso ignorável sobre conteúdo dessa natureza é uma porta aberta com um
> bilhete pedindo para não entrar.
>
> **O que sustenta a reversão são duas garantias por construção** — o texto nunca chega a um modelo
> e nunca sai em agregado — e "por construção" só é verdade enquanto ninguém acrescenta a leitura.
> Uma leitura acrescentada não daria erro em lugar nenhum, então virou gate: ele varre relatório,
> síntese, planilha, scores, SROI, recado, copilot, ai-client, assistente, redação e as pastas
> `rag/` e `aurora/`.
>
> **O custo, declarado:** a proteção deixa de ser *"por construção"* e passa a ser *"por controle de
> acesso"*. É troca consciente, e reversível.
>


> ## Sessão de 03/09/2026 (noite) — a captura por áudio, de ponta a ponta
>
> Cinco commits (`1ea4041` a `4ae41a1`, mais o de documentos), executando a frente **F1** do plano
> aprovado, na ordem que a revisão do próprio plano impôs: **HTTPS antes de tudo**, porque
> `getUserMedia` exige contexto seguro e o IP da rede local não conta.
>
> **A decisão que o plano não tinha tomado, e sem a qual a frente não era executável.** O
> `whisper.cpp` roda num *host*, não no celular. Adotá-lo em silêncio faria a F1 **falsificar a
> frase que ela mesma declarava inegociável** — *"o áudio não sai do aparelho"*. A saída não foi
> esconder: foi trocar a promessa por uma verdadeira, por caminho, e escrever isso como
> **decisão 35**. A captura curta continua no aparelho quando o navegador sabe; as três portas
> longas mandam o áudio para o computador do Instituto, pela rede daqui.
>
> **O que existe agora:** as portas **A′** (narrar sem pressa), **C** (trazer um áudio que ela já
> tem) e **B** (deixar gravando o encontro, desligada por padrão) — as três terminando no MESMO
> campo de escrever, com "Terminei" como única saída. Porta nova que virasse fluxo novo seria mais
> tela, o contrário do que o campo pediu.
>
> **E os "40 segundos" deixaram de ser teto.** O relógio conta para cima e, aos 40 s, troca de
> frase em vez de desligar o microfone. Isso obrigou a acrescentar o **religamento** do
> reconhecimento (que só existia no ditado de campo): sem ele, tirar o limite seria prometer "fale
> sem pressa" e desligar na primeira respirada do Safari.
>
> **Cinco armadilhas novas, todas encontradas verificando em vez de confiar:**
>
> 1. **`aoSegundo?.(++segundos)` nunca incrementava** sem callback — com encadeamento opcional o
>    *argumento* não é avaliado. O contador ficava em zero para quem lesse `.segundos`.
> 2. **A `reancorar.mjs` escreveu uma colisão.** Moveu `510 → 511`, onde já havia âncora, e chave
>    duplicada em objeto JS **some em silêncio**: a tabela cairia de 18 para 17 sem sinal nenhum —
>    exatamente a espécie de falha que essas âncoras existem para impedir. A ferramenta passa a
>    recusar, e **o teste passa a contar as linhas escritas contra as chaves vivas**.
> 3. **A mesma ferramenta corrompeu um intervalo** (`2234-2238` → `2468-2238`, que anda para trás)
>    e **reescreveu história neste arquivo**. Agora ela desloca as duas pontas e nunca toca no
>    HANDOFF — que é registro do passado. O teste passa a excluí-lo pelo mesmo motivo: até então
>    aquilo passava por **coincidência**, porque o número antigo por acaso ainda era âncora.
> 4. **O estágio 2 quebrou o estágio 1 sem que nada acusasse.** `/api/voz/extrair` recusava texto
>    acima de 4000 caracteres — a medida de uma fala de 40 s. Cinco minutos de narração já passam
>    disso: o teto antigo recusaria justamente a captura que as portas longas existem para
>    permitir. Só apareceu porque o estágio 3 foi mexer nos "40 segundos".
> 5. **O extrator com modelo receberia o encontro inteiro.** Este porte não lê isso; o slot
>    falharia e cairia no extrator lexical **em silêncio**. O corte de contexto passou a ser
>    declarado no código.
>
> **Gate novo: `npm run test:audio`** (15 asserções), no padrão do `ai-stub-test.mjs`. O
> `scripts/whisper-stub.mjs` imita a interface do `whisper-cli`, e o que se testa é o que importa e
> não depende dos 465 MB de modelo: **o ciclo de vida do arquivo**. Provado como gate de verdade —
> removendo o `finally` de `src/transcricao.js`, quatro asserções caem.
>
> **O que NÃO foi feito, e por quê:**
> - **A velocidade do whisper na máquina do Instituto não foi medida.** Não há whisper instalado
>   aqui, e a estimativa que circulava (*"~6× tempo real"*) **não diz nem a direção**. Está na
>   tabela de dívidas como dívida, não como número — inventar seria pior.
> - **Capturar ainda depende de um encontro já existir** (`#/voz` redireciona sem encontro,
>   `src/voz.js` devolve 404). A porta C — *"um áudio de três semanas atrás"* — esbarra nisso. É
>   dependência declarada da frente do calendário, não esquecimento.
> - **`docs/jornada-usuario/` e `docs/revisao/`** foram tocados só no que era mentira de produto;
>   o resto é material datado e fica como está.
>
> **Gates: 385 smoke · 170 unitários · 6 RAG · 24 ia-stub · 15 áudio-stub.**
>

> **Auditoria OPAR desta sessão:** `~/.claude/AUDITORIA-OPAR-sessao-2026-09-03.md` — três eixos
> adversariais, **45 achados, 44 confirmados e 1 refutado**, 44 corrigidos em `b657846` (infra),
> `60c0cf3` (domínio) e `f481bec` (docs). Três itens ficaram **abertos por decisão** e estão
> nomeados lá — e **os três foram fechados depois do relatório**: o recado passou a ter um botão
> por turma, o `revisao/09` ganhou nota dizendo que suas referências sem caminho são datadas, e o
> vocabulário do classificador ganhou **critério de parada escrito no código** (só entra radical
> inequívoco no conjunto fechado, e cada adição roda a bateria de 27 casos). **Nenhum item aberto.**
>
> **Sessão de 02–03/09/2026 — o que mudou.** De `1322a77` até este commit — **dezenove até
> aqui**; a faixa é o que vale, o número envelhece a cada commit novo. Todos em
> `main` e em `pos-visita-ebenezer-e-jornada-v2` (as duas apontam para o mesmo commit). Nada de
> arquitetura mudou: a sessão foi de **coerência, cobertura visual e um bug de classificação**.
>
> **1. O protocolo de validação passou para a psicóloga.** As seis tarefas eram de pedagoga e duas
> delas são **inexecutáveis** por ela — a turma da Vivência está fora da rubrica e `#/ciclo`
> responde 422 (`src/api.js:323`). Refeitas a partir do task flow do Exercício 03
> (`docs/task-flow/`); a versão pedagoga virou a §3.4 de `VALIDACAO-USUARIO.md`. Nasceu
> `scripts/preparar-sessao.mjs`: sem ele a sessão começa com o trabalho já feito, porque a seed
> entrega o último sábado registrado. Com `--lapso` ele destrava o Protocolo do Lapso, que até
> então dizia "ajustar a semente" sem dizer como (a retomada lê a tabela `atividade`, não os
> encontros).
>
> **2. Dois protótipos Figma, num arquivo só** — [`h6AnLVYLfpeVl2N4ie0Qzv`](https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv).
> Página *Protótipo completo · 4 papéis*: **27 telas, 153 ligações**, nenhuma tela sem entrada nem
> sem saída — é o **canônico**, e fecha a última pendência de artefato que não dependia de
> terceiros. Página *Protótipo · sessão de validação*: 12 telas, uma faixa por tarefa. O protótipo
> entregue na semana 5 (`HBBd4…`) ficou **congelado como registro**: ele mostra a rubrica de cinco
> dimensões, que a decisão 34 substituiu, e as âncoras também mudaram. Hierarquia dos três em
> `docs/ARTEFATOS-VISUAIS.md` — **ler isso antes de abrir qualquer protótipo.**
>
> **O protótipo acompanha o produto, e isso é trabalho recorrente e manual.** A tela 27
> (`#/consulta`) foi refeita **duas vezes** nesta sessão: primeiro para mostrar a classificação
> corrigida, depois porque a tela real mudou de estrutura (campo e chips antes das respostas).
> Quando `public/app.js` muda uma tela que está no protótipo, ele passa a mentir até alguém ir lá.
> Não há automação para isso, e nenhum teste pega.
>
> **3. O plano da sessão está em `docs/revisao/13-PLANO-ATUALIZACAO-REPOSITORIO.md`, e a §6 é a
> revisão dele contra os arquivos.** Três afirmações do próprio plano não sobreviveram, incluindo
> um achado novo: o repositório atribuía **três papéis** ao protótipo entregue, que tem telas de
> **dois**. Gates corrigidos em quatro lugares que estavam desatualizados.
>
> **4. A consulta em linguagem natural tinha três bugs de classificação — todos corrigidos.** A
> causa era sempre a mesma: **regra de desempate implícita**. Primeiro a ordem da lista (`contagem`
> em primeiro engolia o assunto: *"quantas crianças estão em risco de sair?"* respondia o total do
> instituto). Depois o comprimento do termo (`'alerta'` e `'faltas'` têm seis letras e empatavam).
> A regra agora é explícita, em três passadas: **assunto por termo forte, assunto por termo fraco,
> fórmula de contagem** — e dentro de cada uma vence o termo mais longo. `'faltas'` é declarado
> **fraco** porque é a única palavra que presença e evasão dividem.
>
> Corrigido o classificador, sobrou um problema que não era de resposta e sim de **descoberta**: as
> seis sugestões só apareciam **na recusa**, então quem abria `#/consulta` tinha de errar uma vez
> para saber o que a base responde. Agora `R.SUGESTOES` é constante exportada — fonte única para os
> chips da tela e para a recusa —, `GET /api/consulta` a serve com a mesma guarda de gestão do POST,
> e a tela mostra os chips de saída. O placeholder deixou de repetir um chip: virou *"qual é o
> limiar do alerta de ausência?"*, formulação que **não** está na lista e que só é respondível por
> causa do vocabulário novo — ele existe para dizer que dá para perguntar com as próprias palavras.
> Três asserções travam isso, incluindo **o placeholder ter de ser respondível**.
>
> **5. Roteiro do vídeo v3.** Tinha 13 cenas e nenhuma da psicóloga. Agora tem o bloco dela com
> cinco cenas, mais a consulta, **dentro dos mesmos 7m00** — o que foi cortado está declarado em
> tabela no topo. A cena de fecho mandava ler **"242 · 63"** na câmera; hoje são **381 · 167**.
>
> **Gates: 167 unitários · 381 smoke · 6 rag · 24 ia-stub.**
>
> **Armadilhas novas — as do Figma custaram a maior parte do tempo:**
> (1) **`SF Pro` aparece em `listAvailableFontsAsync` mas renderiza largura ZERO** nesta conta; o
> protótipo está em **Inter**, a seguinte da mesma pilha do CSS. Ao ver texto sumindo, teste a
> mesma string em Inter e Roboto **antes** de culpar o próprio código.
> (2) **`textAutoResize = 'HEIGHT'` num nó de texto recém-criado trava a largura em 0** e ele nunca
> mais cresce. A ordem correta é `characters` → `appendChild` → `FILL` → só então `'HEIGHT'`.
> (3) **Scripts do `use_figma` são transacionais:** um erro na última linha desfaz tudo o que veio
> antes. Um `layoutPositioning` inválido apagou dez minutos de trabalho que pareciam ter dado certo.
> (4) **`node.query()` quebra com seletor não-ASCII** — `[name=Conteúdo]` dá `unexpected character
> (0xc3)`. Use `children.find(...)`.
> (5) **Clonar conteúdo troca o id do nó.** Ids guardados de chamadas anteriores viram `null` e o
> script morre em `cannot read property of null`.
> (6) **`appendChild` da Tab bar depois dos hotspots põe a barra POR CIMA deles e mata a
> navegação** — e o screenshot continua idêntico. Aconteceu duas vezes; varra o z-order das telas
> depois de qualquer edição de conteúdo.
> (7) `overflowDirection` é **`'VERTICAL'`**, não `'VERTICAL_SCROLLING'`.
> (8) Screenshot de **SECTION** enquadra a partir da origem da página: `original_height` vem enorme
> e parece defeito de layout, mas não é.
> (9) **Dois `node server.js` órfãos** ficaram servindo banco antigo e `/api/hoje` devolveu turma
> `null` para quem tinha turma. Matar tudo antes de depurar comportamento estranho de API.
> (10) **O smoke test estava escrito em volta do bug da consulta:** usava *"quantas estão em risco
> de sair?"*, sem a palavra "crianças" — exatamente a formulação que desviava do termo defeituoso.
> Teste que passa pelo caminho que ninguém usa não prova o caminho que todos usam.
>
> (11) **Citação `arquivo:linha` envelhece em silêncio — agora com teste.** Desde 03/09/2026 o
> unitário *"as citações arquivo:linha da documentação apontam para o que prometem"* amarra cada
> uma ao CONTEÚDO esperado e recusa citação nova sem âncora. Renumerar sem conferir passou a
> quebrar o teste, que diz qual saiu do lugar. **Ao mover código, rode `npm run test:unit` antes de
> concluir que a documentação está certa.** O histórico do problema: O botão do recado era citado como
> `public/app.js:510` em três documentos; a linha é a **509**. Varri todas as **18** citações dos
> docs e corrigi todas — inclusive as cinco de `docs/revisao/09-PLANO-PASSO-PROATIVO.md`, por
> decisão sua. Duas delas **não eram erro de numeração**, e é o achado que vale guardar:
> `periodosSugeridos()` tinha saído mesmo de `src/api.js` para `src/relatorio.js:440`, e o `GUIA`
> com os campos `naoEnxergo` deixou de ser lido de `public/app.js` e vive em
> `src/assistente.js:112` — os dois porque **o próprio plano foi executado**. Renumerar às cegas
> teria produzido citação falsa, que é pior que citação velha. O plano ganhou uma nota de
> procedência no topo: a análise não foi tocada, só os ponteiros. **O mesmo vale para os números
> de gate**, que derivaram três vezes só nesta sessão: os blocos de sessão do handoff guardam o
> número **daquele momento** e ficam como estão; as afirmações **vivas** (README, TESTES,
> ARQUITETURA, DECISOES, METODOLOGIA, VALIDACAO, roteiro do vídeo) têm de ser remedidas. Varreduras
> que refazem as duas conferências:
> ```bash
> # com caminho (as que a sessão corrigiu):
> grep -rhoE '(src|public|scripts)/[a-z/-]+\.(js|mjs):[0-9]+' docs/*.md docs/*/*.md | sort -u
> # SEM caminho — o regex acima não pega, e é onde mora mais erro:
> grep -rhoE '\b[a-z-]+\.(js|mjs):[0-9]+' docs/*.md docs/*/*.md | sort -u
> ```
>
> (12) **Rodada de smoke ABORTADA envenena a próxima.** A armadilha (4) do bloco de 02/09 diz que
> a seção 21 troca a professora da turma 1 — mas o que custa tempo é a consequência, que não estava
> escrita: o smoke **muta o banco enquanto roda**, então uma rodada interrompida no meio (erro,
> `pkill`, servidor órfão) deixa a turma 1 com **"Íris Camargo"** no lugar da Maria. A rodada
> seguinte quebra na **seção 2**, em `hoje.turma.id`, com `turma` nulo — e o sintoma aponta para o
> lugar errado: parece defeito de sessão ou de permissão, e é resíduo da rodada anterior.
> **Sempre `node scripts/reset.mjs` imediatamente antes do smoke, em comando sequencial** — não em
> cadeia com `&`, que backgrounda o `&&` inteiro e faz o reset correr junto com o que vem depois.
> Diagnóstico em uma linha:
> ```bash
> node -e "import('./src/db.js').then(m=>{m.getDb();console.log(m.get('SELECT e.nome FROM turma t JOIN educador e ON e.id=t.educador_id WHERE t.id=1'))})"
> ```
> Se não devolver **Maria Silvia**, o banco está sujo — resete antes de investigar qualquer coisa.
>
> **A sessão paralela foi fechada — `48ec1dd`, já em `main`.** `claude/focused-cerf-1530ff` tinha
> trabalho **não commitado** e parado havia 3h30, sem processo ativo: a correção do botão do recado
> na tela Hoje, que era o único elemento do cartão preso à chamada **de hoje** e sumia em dia não
> letivo. A branch não tinha commit próprio — o "rebase" foi mover o ponteiro 17 commits à frente
> com o trabalho em cima (`stash` → `rebase` → `pop`, com backup do diff antes e comparação do
> conteúdo depois: 38 linhas adicionadas, 1 removida, nenhuma alterada). Gates do conjunto naquele
> momento: **165 unitários · 374 smoke** — a auditoria OPAR que veio depois os levou a 167 · 381. O
> commit declara a autoria: o conteúdo é da sessão paralela; esta revisou, verificou e commitou.
>
> **A correção derrubou uma ressalva em três documentos** — `VALIDACAO-USUARIO.md` §2 e a tarefa 6,
> e a instrução 4 do roteiro do vídeo, que mandavam abrir `#/recado` pela URL. Todas atualizadas no
> mesmo lote. **Achado corrigido é documentação a revisar**: a ressalva sobrevive ao defeito se
> ninguém a procurar.
>
> **Lição de worktree:** rebase com árvore suja destrói trabalho em andamento. Antes de tocar numa
> branch de outra sessão, confira se há processo vivo (`ps`) e há quanto tempo os arquivos não
> mudam (`stat`) — e salve o diff num arquivo fora do worktree, que é o que torna a operação
> reversível.


> **Sessão de 02/09/2026 — o que mudou.** A visita ao Instituto (29/08) foi lida inteira (quatro
> gravações, consolidado, planilha socioemocional) e virou o plano `docs/revisao/11-PLANO-POS-VISITA.md`
> (com a revisão adversarial na §4) e cinco commits, E1 a E7. Resumo do que entrou: papel
> `profissional` (psicóloga) e a Vivência terapêutica com turma, fora da rubrica e dentro do
> registro de turma (decisão 31); rubrica com os seis indicadores da planilha do Instituto e a
> planilha preenchida/exportada por código (decisão 34); registro de vivência com check-in de
> grupo, relato no padrão do conselho liberado pela profissional, filtro de perímetro com contexto,
> tela de voz que diz o que grava; régua de 75% e recado da turma (decisão 33); devolução por
> encontro; parecer a profissional parceiro por código e sob consentimento (decisão 32). A
> documentação da semana 5 registra a validação de 29/08 como **parcial** (demonstração com
> usuária real; protocolo de tarefas pendente). Gates: **159 unitários · 365 smoke · 6 rag · 24
> ia-stub**. Revisão adversarial da implementação: `docs/revisao/12-REVISAO-POS-VISITA.md`.
>
> **Armadilhas da sessão de 02/09 (implementação pós-visita):** (1) a seed tem DOIS geradores — tudo o que é da Vivência
> usa `randVivencia`; consumir `rand` para dado novo desloca os números documentados (38% de
> descarte virou 19% até isso ser visto); (2) `Response.text()` descarta o BOM do CSV — teste
> pelos bytes; (3) regex literal escrito via script com `\\s` vira barra literal — `node --check`
> não pega, o teste pega; (4) a turma 1 troca de professora na seção 21 do smoke: quem responde
> por ela depois disso é outra pessoa, e testes que dependem de "Maria" quebram; (5) o service
> worker no navegador embutido devolve 503 para `/api/*` — pelo IP da LAN (sem SW) o app abre normal.

# Handoff — 25/08/2026, fim da sessão

> **Atualizado depois da redação original:** o **cadastro de pessoas** e o **arquivo** entraram
> (§2), e a reavaliação do redator **num modelo maior foi descartada** por decisão de produto
> (§4). Os gates da §1 foram refeitos: 136 unit · 294 smoke.

Para quem retomar. Este documento diz **onde o artefato está**, **o que decidir a seguir** e
**as armadilhas que já custaram tempo** — para não custarem de novo.

> **Leitura obrigatória do vault que NÃO foi feita.** O `CLAUDE.md` do vault manda ler
> `Architectus/Knowledge/outputs/graphify/cross-product-<recente>.md`, `refresh-status.md` e
> `wiki/_transversal/MASTER-INDEX.md` antes de escrever handoff. Os três estão **ilegíveis neste
> Mac** (`EPERM`): `Knowledge/` é uma *junction* do Windows apontando para o OneDrive, e o
> próprio CLAUDE.md registra a migração para Mac em 2026-08-25. Quem retomar num ambiente com
> acesso deve ler os três antes de agir — o handoff abaixo cobre só o produto, não a topologia
> cross-produto.

---

## 1. Estado: verde e publicado

Tudo commitado e no `main` de https://github.com/igorregoir-lgtm/percurso-mvp — working tree limpa.

| gate | resultado |
|---|---|
| `node scripts/unit-test.mjs` | **136 passaram** |
| `node scripts/smoke-test.mjs` | **294 passaram** (exige `node scripts/reset.mjs` antes **e** o servidor no ar) |
| `node scripts/ai-stub-test.mjs` | **24 passaram** |
| `node scripts/rag-test.mjs` | **6 passaram** (hit@5 20/20) |

**Quinze commits nesta sessão**, do mais recente ao mais antigo:

```
6a3a5de  Arquivo: ninguém é apagado — e os dois defeitos que a tela de saída expôs
274a86b  Porte do modelo é restrição de desenho, não variável livre
94eccb6  Cadastro de pessoas: a porta manual do item 2.8, com a criança nascendo bloqueada
258cf37  Handoff da sessão de 25/08/2026
9b88918  Qwen redigindo síntese e relatório: infraestrutura pronta, 4B reprovado
00fd838  O refinamento pelo Qwen falhava 100% em silêncio — e a guarda que faltava
6ce0e15  As duas pendências da revisão: controle de tipo e resumo do dia
5051eed  Revisão da implementação: 28 achados, 4 bloqueantes corrigidos
f4d865d  Decisão 27 e dois defeitos de integração
d7169b7  Aurora proativo: o Qwen orquestrando o painel (passo 6) + 17 testes
eb71ede  Aurora proativo: a memória de uso, que nasce desligada (passo 5)
59294be  Aurora proativo: a superfície no cliente (passo 4 do plano)
6f70e4b  Aurora proativo: 20 achados da revisão adversarial do plano
b65cccf  Aurora proativo: fundação determinística (sinais, catálogo, ranking, painel)
13f560a  Relatório do doador: tom de carta e ordem de leitura do doador
```

---

## 2. O que foi entregue

**Relatório do doador em tom de carta** (`13f560a`). Sete blocos reordenados pela leitura de
quem doa; o bloco dos sonhos passou a **fechar** o conteúdo, porque terminar no que ainda falta
é o único pedido honesto que um relatório assim pode fazer.

**A Aurora virou parceiro proativo** (decisão 27, `docs/DECISOES-TECNICAS.md`). Seis módulos novos
em `src/aurora/`: `sinais` (envelope de contadores), `catalogo` (54 sugestões nos quatro tipos,
vivas nos três papéis), `ranking` (puro), `painel` (a cola), `perfil` (memória, banco derivado),
`orquestrador` (o Qwen). Mais `src/fila-modelo.js`, extraído do copilot para que o orquestrador
possa falar com o modelo **sem alcançar o banco nem transitivamente**.

**A doutrina 5 foi trocada, não contornada.** Ela dizia "a Aurora não enxerga dado nenhum" e
virou mentira quando a sugestão passou a nascer de estado real. A frase foi reescrita nos **nove**
lugares para o que passou a ser verdade: **conta quantos, nunca quem**. Num produto que se
sustenta em limites declarados serem verdadeiros, limite que virou mentira é pior que a mudança.

**Redação por modelo** (decisão 28, `src/redacao-modelo.js`): construída, medida e **desligada**.
Ver §4.

**Metodologia de validação com usuário real** (`docs/METODOLOGIA-VALIDACAO-PERCURSO.md` +
`docs/visita-ebenezer/`). Fecha a pendência da mentoria de tecnologia de 26/08 ("critérios e
métricas quantitativas para os testes com usuários") e o achado D-02 da revisão arquitetural. O
objeto do estudo é a **v2, com `AI_ENABLED` desligada**: testar a camada opcional antes do fluxo
principal inverteria a pergunta. A §6 de `VALIDACAO-USUARIO.md` continua **em branco** — e só pode
ser preenchida com o formulário da sessão, nunca por memória ou inferência.

**Cadastro de pessoas** (decisão 29, `#/pessoas`, `94eccb6`). Até então toda pessoa vinha da seed
ou da planilha; agora a coordenação inclui professora, coordenação, diretoria e criança uma a uma.
Três guardas que não são o caminho curto: a porta é de coordenação (papel e matrícula decidem o
escopo de leitura do resto do produto); o consentimento nasce **pendente** e a criança entra
bloqueada para observação — com as duas linhas gravadas na mesma transação, senão ela sumiria da
única tela que a desbloqueia; e homônimo é **409 com o id do que já existe**, porque a mesma
criança virar duas parte a série de presença e nenhum número do relatório fecha. Dois defeitos
latentes pagos junto: o código `EBZ-NNNN` da ingestão saía de `COUNT(*)+1` (reemitia código já
usado assim que uma criança saísse do banco, contra um `UNIQUE`), e `Date.parse` aceitava
`2026-02-30` rolando para 02/03 em silêncio.

**Arquivo — ninguém é apagado** (decisão 30). Não existe `DELETE` de pessoa em rota nenhuma, e um
teste de fumaça guarda a ausência (404). Quem sai vai para `#/arquivo` e volta de lá. O ponto de
aplicação é `usuarioDa`, **não o login**: o cookie não é assinado e vale 24 h, então a checagem
mora na resolução da sessão e a sessão aberta de quem foi arquivada morre no ato. Duas recusas
existem para o sistema não se trancar por fora — ninguém arquiva a si mesma, e a última
coordenação na ativa não sai. Para a criança, voltar é **matrícula nova** (reabrir a antiga
apagaria a saída, e a saída é o que a curva de permanência lê) e o consentimento volta a pendente.

**E a tela de arquivo expôs dois defeitos que estavam no banco há semanas**, porque nenhuma tela
mostrava data de saída: a seed produzia matrícula encerrada com **saída no futuro**, e a curva de
permanência **podia subir** (80% aos 9 meses, 82% aos 12) porque `safras()` recalculava o
denominador a cada marco — quatro populações diferentes ligadas por uma `polyline`. Os dois estão
corrigidos, com teste fixando cada regra. A lição: *dado que nenhuma tela mostra não é dado
verificado*.

---

## 3. As decisões de desenho que não são óbvias

Quem for mexer precisa saber **por que** cada uma existe, senão vai "simplificar" e reintroduzir
o defeito:

- **Teto de UMA pendência por painel** (`ranking.js`). Cada item pode ser gentil e o **somatório**
  ser cobrança diária. É a trava que impede a Aurora de virar chefe.
- **A memória nasce DESLIGADA**, com convite de um toque na primeira abertura. Num produto onde
  tudo é opt-in, a única coisa que grava algo sobre a **pessoa** não podia ser a exceção.
- **Nunca o nome da turma** em texto nenhum: `turma.educador_id` é 1:1, então "a turma X está sem
  registro" **é** "a educadora Y não registrou", com outro rótulo.
- **O modelo só COMPRIME rótulo** (`soComprime`, em `orquestrador.js`): pode subtrair e
  reordenar palavras, nunca acrescentar conceito. Torna inversão de sentido impossível em vez de
  tentar detectá-la depois.
- **"Hoje não" em item núcleo cala só até o fim do dia**, e a tela **diz** isso. O produto não
  mente sobre o que o botão faz.

---

## 4. A decisão que estava na sua mão — e foi tomada

**O Qwen3-4B foi reprovado como redator da síntese e do relatório: 0 aceitações em 16 chamadas**
(6 por uso de número, 10 por apagar/inventar declaração obrigatória). A infraestrutura, os quatro
portões e 5 testes estão prontos; `AI_REDATOR` está **desligado por padrão** porque ligar hoje só
adiciona ~8 s de latência para cair no mesmo template.

**Subir o porte do modelo está FORA — decisão do produto, 25/08/2026.** Esta máquina (M5 Max,
128 GB) rodaria um Qwen3-14B ou 30B-A3B com folga, e essa era a recomendação anterior deste
handoff. Ela caiu: a arquitetura do Percurso exige rodar **no notebook comum de uma organização
social**, e um modelo que só cabe nesta máquina não é o produto — é uma demonstração que a
Ebenézer não conseguiria operar. O porte do modelo é restrição de desenho, não variável livre.

**O que isso deixa em pé:** `AI_REDATOR` fica desligado, e a síntese e o relatório continuam
saindo do template determinístico — que é o comportamento correto, não um degrau. A
infraestrutura, os quatro portões e os 5 testes ficam como estão: se um dia um modelo do PORTE
do 4B (ou menor) passar nos portões, a reavaliação é uma variável de ambiente. O caminho de
ganho aqui é modelo melhor no mesmo porte, ou prompt/portões melhores — nunca modelo maior.

> **A lição que vale além deste caso:** *fidelidade numérica não é fidelidade semântica.* Um
> verificador que confere cada número contra o banco aprova, sem hesitar, um documento em que
> **todo número está certo e todas as frases estão erradas**. Foi medido: *"67 crianças foram
> observadas em 106 atividades"* (106 é o nº de crianças **ativas**).

Outras pendências, menores:
- `resumo_do_dia` e `prefere_tipo` já têm controle na tela; nada pendente aí.
- Ligar `AI_ENABLED` em **operação real** continua atrás do gate da PoC com pedagogos (decisão 19).

---

## 5. Armadilhas que já custaram tempo

1. **O smoke exige `node scripts/reset.mjs` ANTES e o servidor no ar.** Estado sujo derruba o
   bloco de escopo e parece bug.
2. **Reinicie o `node server.js` depois de mexer em `src/`.** Perdi uma rodada de diagnóstico
   testando contra um servidor com código velho — o teste falhava e o código estava certo.
3. **O service worker serve o `app.js` em cache.** Depois de editar `public/`, recarregue **duas
   vezes** (ou limpe `caches`) ou você valida a versão anterior.
4. **`export { x } from '…'` NÃO cria binding local.** Quebrou o `copilot.js` quando a fila saiu
   para `fila-modelo.js`: o `chat()` do próprio arquivo deixou de enxergar `comVaga`.
5. **`maxLength` em `json_schema` degrada a gramática do llama.cpp** de ~143 para 1,5 tok/s.
   Estrutura na gramática; teto de tamanho **sempre** pós-geração.
6. **Meça a latência do caminho COMPLETO.** O teto de 2,5 s do refinamento veio de uma medição
   parcial e matava 100% das chamadas em silêncio; o real é 4,6–5,7 s.
7. **Teste que o lint MORDE, não só que o catálogo passa.** O anti-cobrança tinha um `\b` que
   anulava duas alternativas: *"Você está atrasada com a folha"* passava.

---

## 6. Como subir tudo

```bash
cd "/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional"
ai/scripts/start-llama.sh                 # Qwen3-4B em 127.0.0.1:8081
AI_ENABLED=1 node server.js               # app em 127.0.0.1:3000
cloudflared tunnel --url http://127.0.0.1:3000    # URL pública efêmera
```

Ou `ai/scripts/demo-celular.sh`, que sobe os três e imprime QR + URL.
A URL do túnel **muda a cada vez** e morre com o processo (decisão 25: demo, não operação).

Perfis: **Maria Silvia** (educadora) · **Rita Amaral** (coordenação) · **Solange Ribeiro**
(diretoria). Dados 100% sintéticos, semente fixa.

---

## 7. A trilha de auditoria

Cada ciclo desta sessão deixou registro, e ler o registro é mais barato que redescobrir:

| documento | o que contém |
|---|---|
| `docs/DECISOES-TECNICAS.md` | decisões **27** (Aurora proativo) e **28** (redação por modelo) |
| `docs/revisao/09-PLANO-PASSO-PROATIVO.md` | o plano, de um painel de 4 propostas × 3 juízes |
| `docs/revisao/10-REVISAO-PASSO-PROATIVO.md` | 28 achados da revisão da implementação + adendo do Qwen |
| `docs/revisao/07` e `08` | o ciclo anterior da Aurora |
| `docs/METODOLOGIA-VALIDACAO-PERCURSO.md` | hipóteses, limiares com fonte, Protocolo do Lapso, ameaças à validade |
| `docs/VALIDACAO-USUARIO.md` | o protocolo da sessão e onde o resultado é registrado (§6, em branco) |
| `docs/visita-ebenezer/` | execução em campo: roteiros e cartões de Igor, do grupo e dos alunos |

**O método que funcionou e vale repetir:** plano → **revisão adversarial do plano** → implementação
→ **revisão adversarial da implementação** → correção. As três revisões acharam 68 problemas
confirmados, e os quatro mais graves só apareceram com o modelo real no ar e os contadores lidos
de perto — nenhum deles teria sido pego por leitura de código.
