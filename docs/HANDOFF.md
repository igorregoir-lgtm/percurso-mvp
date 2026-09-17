# Handoff — 05/09, 04/09, 03/09, 02/09/2026 (pós-visita) e 25/08/2026

> ## Sessão de 05/09/2026 — auditoria OPAR: fazer o que não depende de ninguém
>
> Pedido: *"faça tudo que não precisa de uma pessoa e que está pendente. Faça em OPAR."* Sete
> dívidas estavam classificadas como trabalho pendente. Relatório completo em
> `~/.claude/AUDITORIA-OPAR-sessao-2026-09-05.md`.
>
> **Duas caíram na observação, antes de qualquer código:** medir o whisper é impossível daqui
> (`whisper-cli` não instalado, `models/` inexistente — o `whisper` do PATH é outra implementação),
> e o certificado HTTPS depende de domínio. As duas viraram item nomeado.
>
> **O que mais vale guardar: a dívida declarada pode estar errada, e duas estavam.**
>
> 1. **O extrator.** A dívida dizia que *"umas seis"* ficava em branco. Medido: sempre devolveu 6.
>    O defeito era o oposto e pior — ele **inventava 1** quando não entendia. *"Todas participaram
>    do começo ao fim"*, numa turma de 24, entrava na planilha socioemocional como **uma** criança.
>    *"Conflito nenhum"* virava **um conflito**. *"Dezesseis pediram ajuda"* virava **6**, porque a
>    alternação casava o sufixo. Tudo isso contra a doutrina escrita no próprio arquivo.
> 2. **A porta C.** A dívida mandava construir "encontro agendado + data retroativa". A data
>    retroativa já funcionava; faltava a tela deixar escolher. E a metade cara — agendar — ficou de
>    fora com razão medida: encontro sem presença entra em **cinco denominadores**, e um deles
>    atravessa a fronteira do Instituto (o relatório do doador publica `COUNT(*) FROM encontro`).
>
> **Verificar antes de agir mudou o que foi construído, não só a ordem.** É o ponto do método.
>
> **Dois falsos positivos em ~30 achados, e os dois instrutivos:** o auditor do extrator testou os
> regexes **isolados** e não viu o portão de confiança que os precede; e eu julguei um 403 ausente
> consultando um banco já mutado pelo smoke — o portão estava certo, minha asserção é que estava
> errada.
>
> **O resto do que entrou:** a prova do consentimento ganhou relógio (vigência congelada, revogação
> com data própria, fecho de ciclo como **detector** que marca e nomeia mas nunca apaga, e a
> reconciliação de órfãos no boot — que achou 4 arquivos para 2 linhas na primeira execução); o
> telefone do responsável passou a ser validado contra DDDs que existem e **conferido** antes do
> primeiro envio, com a primeira mensagem sendo um desafio **sem nome de criança**; e a régua passou
> a dizer quando a faixa de atenção é **aritmeticamente impossível** — medido: 11 de 12 crianças.
>
> **Uma contradição de LGPD, encontrada e corrigida:** a decisão 40 declarava a retenção do relato
> da criança como "descarte no fim do ciclo"; o banco e a tela declaram "matrícula ativa + 2 anos".
> Retenções **diferentes para o mesmo campo**, no artefato que existe para impedir exatamente isso.
>
> **Gates: 512 smoke · 215 unitários · 6 RAG · 24 ia-stub · 19 áudio-stub.** 32 tabelas, 117 rotas.
>
> ### Segunda rodada, mesma noite — "conserte tudo que precisa ser consertado"
>
> Do que ficou aberto, o que era código entrou; o que é política ou depende de fora continua
> nomeado. **Sete correções**, cada uma verificada antes e travada por gate depois:
>
> - **O extrator dizia 0 quando não sabia** (`pediram_ajuda` era `NOT NULL DEFAULT 0`). Zero é
>   afirmação; agora é `NULL` no esquema, no extrator e na tela (traço). E "vinte e um" a "vinte e
>   nove" passaram a contar — composição fechada, não inferência.
> - **O recado anunciava feriado como "próximo encontro"** no texto que vai para as famílias:
>   `proximoEncontro` lia só o dia da semana. Agora lê o calendário da casa (decisão 37).
> - **`descartarRelatosDoCiclo` era retenção de aparência** — sem chamador, apagava por ciclo. Virou
>   `descartarRelatosVencidos`, por criança, e o servidor **recusa** se a matrícula está ativa ou o
>   prazo não venceu. O fecho de ciclo detecta e lista; apagar é rota de coordenação com motivo e log.
> - **`"."` passava como motivo** para destruir prova. Agora exige texto por extenso.
> - **A régua ganhou "N faltas da régua"** ao lado do percentual — a leitura relativa que não sofre da
>   granularidade e responde a pergunta que a coordenação faz. A faixa da decisão 33 continua igual.
> - **A porta C guarda a data do endereço** — `?data=null` renderizava "o encontro de null".
> - **O modal de retenção vencida nascia e morria no mesmo tique**: `navegar()` remove todo `.veu` ao
>   re-renderizar, e eu o chamava depois de montar o modal. Visto no navegador — três tentativas até
>   olhar o JSON cru e perceber que o back devolvia tudo. A lição é a de sempre: quando o servidor está
>   certo e a tela não mostra, o culpado é a ordem, não o dado.
>
> **Continua aberto, com nome:** certificado HTTPS (domínio), medir o whisper na máquina deles (o
> produto agora mede sozinho), encontro agendado como entidade (quebra cinco denominadores), a faixa
> de atenção como intervalo (política), a conferência do telefone sem canal próprio (limite de
> desenho), e o schema do copilot por modelo que ainda força `pediram_ajuda: 0` (opt-in, sem PoC).
>
> **Gates: 517 smoke · 222 unitários · 6 RAG · 24 ia-stub · 19 áudio-stub.** 32 tabelas, 118 rotas.
>


> ## Sessão de 04/09/2026 (madrugada) — a segunda rodada de WhatsApp e Instagram (dec. 50)
>
> Pedido: *"veja se não há nada que não possa ser melhorado… seja criativo… alternativas ainda
> não usualmente exploradas"*. **A criatividade veio depois do diagnóstico**, e o diagnóstico foi
> olhar para onde a coordenação de fato está: rede local em http, notebook sem WhatsApp, responsável
> que não digita link, sábado corrido em que se manda duas vezes.
>
> **A peça que destravou três coisas de uma vez foi um codificador de QR escrito à mão**
> (`public/qr.js`, ISO 18004, sem biblioteca — decisão 1 intacta). O que vale guardar é **como foi
> verificado**: com o `BarcodeDetector` do navegador, um leitor real, e não contra o próprio código.
> Foi o leitor que pegou o único defeito — a v7 falhava porque eu desenhava o sincronismo antes do
> padrão de alinhamento que fica em cima dele. Um teste que só conferisse a matriz contra o
> codificador teria passado verde para sempre.
>
> **O que entrou:** o texto **dentro do link** (`wa.me/?text=`, o WhatsApp abre com a mensagem
> escrita — o clipboard, que não existe em http, saiu do caminho crítico); o **passe por QR** do
> notebook para o celular (dez minutos, uma leitura, sem a imagem); a **folha da turma** com QR de
> cada grupo para colar na parede; a **trava de envio duplicado** ("já recebeu isto hoje",
> desmarcado por padrão); story, carrossel e texto alternativo no card do Instagram; negrito e
> itálico do WhatsApp no recado e no boletim.
>
> **Um defeito meu de ontem que só apareceu hoje:** a referência do disparo era montada de duas
> formas em dois lugares, e a trava de duplicidade **nunca casava** — verde na tela, inútil na
> prática. Virou uma fonte só. E "hoje" era UTC: um envio às 21h de sábado em São Paulo já era
> domingo. Virou meia-noite local, mandada pelo cliente.
>
> **A alternativa legítima para "um envio, todos"** não é código: é a **Comunidade** do WhatsApp,
> cujo grupo de avisos alcança todos os grupos de uma vez. Estava na pesquisa desde o começo, sem
> ninguém ligar ao pedido. Agora a tela diz.
>
> **Os grafos foram atualizados:** o canônico do produto (raiz `Inteli - Artefato Modulo III/`,
> 608 → 1.552 nós — mas ele segue o `main`, que está **39 commits atrás** deste branch) e o do
> repositório no branch (`graphify-out/` no worktree, 1.773 nós, agora no `.gitignore`). Quem for
> fundir o branch: rode `graphify update .` na raiz do produto depois.
>
> **Gates: 504 smoke · 205 unitários · 6 RAG · 24 ia-stub · 15 áudio-stub.** 31 tabelas, 116 rotas.
>


> ## Sessão de 04/09/2026 (noite) — WhatsApp, Instagram e a câmera que vira
>
> Três pedidos, e o segundo é o mais importante **porque metade dele não é possível**.
>
> **1. "Permita virar a câmera do celular"** (dec. 49). Óbvio em uso, não trivial em desenho:
> `MediaRecorder` fica preso ao stream em que começou, e virar no meio da gravação perderia o que já
> foi dito — emendar dois arquivos tampouco serve, são dois contêineres. Então a escolha passou a
> acontecer **antes**, com a imagem na tela, que é quando ela importa. Dois detalhes que só aparecem
> usando: a prévia frontal é **espelhada na tela** (sem isso a pessoa não se enquadra) e o **arquivo
> não é** — prova invertida seria prova adulterada; e o botão só aparece se houver duas câmeras.
>
> **2. "Um botão que mande para vários grupos de WhatsApp"** (dec. 47). **Isso não existe, e a tela
> passou a dizer isso.** Não é limitação do produto: a Groups API oficial só cria grupos novos de até
> oito com um selo que quase ninguém tem; a Cloud API é 1-para-1; e as bibliotecas que postam em
> grupo violam os Termos, com o número como preço possível — e o número é o único canal do Instituto
> com as famílias. `PESQUISA-WHATSAPP.md` já tinha medido isso; o que faltava era **executar o Degrau
> 0**, e é o que foi feito.
>
> **O que realmente custava caro nunca foi o toque.** Era montar o texto, lembrar quais grupos
> existem, decidir o que pode ir para cada um e perder a conta de quais já receberam. Os quatro
> saíram do caminho: os grupos viraram cadastro (`canal`), o texto é montado e copiado **uma vez**, a
> fila **sobrevive a sair do navegador** (`localStorage`) e o que saiu fica registrado (`disparo`).
> Sobra um toque por grupo, que é o que a Meta exige.
>
> **A trava que mais vale:** o público do canal não é etiqueta. A tabela do §4 da pesquisa virou
> código, e a recusa é **do servidor** — carta do período não vai para grupo de responsáveis (repasse
> do dado de cada criança a terceiros, Art. 14 §3º), recado da turma não vai para o Instagram.
>
> **3. "Integrações com Instagram"** (dec. 48). *"Na medida do possível"* tem medida exata: postar por
> API exige conta Business, token de servidor e revisão de aplicativo na Meta — infraestrutura que
> esta casa não opera. O que não exige nada disso é o trabalho **antes** do post, e é o que entrou: o
> card do período desenhado em `<canvas>` no próprio navegador, sem biblioteca (decisão 1 intacta, com
> gate varrendo o gerador atrás de `import(` e CDN), do mesmo agregado do relatório, com supressão de
> célula pequena e passando pelo revisor de sobre-alegação. A ressalva metodológica vai **dentro da
> imagem**, não só na legenda: legenda se corta, imagem circula.
>
> **Três coisas que só apareceram exercitando:**
>
> - **`lerFila` já existia neste arquivo**, e é OUTRA fila — a dos POSTs sem rede. Duas filas com o
>   mesmo nome viram um defeito que ninguém enxerga; virou `lerDivulgacao`, com gate contando que só
>   há um `lerFila`.
> - **Eu escrevi uma asserção vazia no smoke** (`(await0 => 0)()` devolvendo `true`) e ela passou
>   verde. Um gate que passa aconteça o que acontecer é pior que gate nenhum: removida.
> - **`textoObrigatorio` não era exportada** de `domain.js`, e o módulo novo só quebrou no primeiro
>   `import` real — nenhum `node --check` pegaria.
>
> **A honestidade que fica na tela, e é o que eu não quero que a próxima pessoa apague:** o rodapé de
> `#/divulgar` explica por que não há o botão único. Sem ele, alguém vai "melhorar" isso instalando
> Baileys, e o Instituto perde o WhatsApp.
>
> **Gates: 489 smoke · 198 unitários · 6 RAG · 24 ia-stub · 15 áudio-stub.** 31 tabelas, 113 rotas,
> 13 telas.
>


> ## Sessão de 04/09/2026 (tarde) — as seis perguntas do campo, respondidas com código
>
> O dono do produto abriu o artefato no celular e mandou seis perguntas sobre **telas que ele estava
> vendo**. Nenhuma era pedido de recurso novo em abstrato; cada uma apontava para um lugar em que o
> produto **parecia** completo e não era. Foram seis, e viraram as **decisões 41 a 46**.
>
> **1. *"Quem faz a matrícula da criança em cada turma? Quem cadastra as turmas?"*** A resposta
> honesta era **metade**. A matrícula existia (`Pessoas → Quem entra → Nova criança`). O cadastro de
> turma **não existia em lugar nenhum**: as sete turmas vinham da `seed`. E faltava a metade
> seguinte, que só se vê depois: **para quem já está na ativa não havia como trocar de turma** —
> `rematricularCrianca` só serve a quem voltou do arquivo. Entrou a aba **Turmas**, mais
> `transferirDeTurma` e `matricularEmPrograma`, com porta na própria ficha (**dec. 41**).
>
> **2. *"Onde esses pontos são registrados? Não é a professora que tem que registrar?"*** Era ela,
> sempre foi — mas a **tabela que mostra os pontos, na ficha, não levava a lugar nenhum**. A única
> porta ficava em `Hoje → Ciclo`. Quem olhava para os números não tinha como mexer neles, e a
> pergunta que isso gera é exatamente a que foi feita. O cartão passou a dizer o estado e abrir o
> registro (**dec. 46**) — e isso obrigou `GET /api/observacao` a devolver `na_rubrica`, senão a
> ficha ofereceria, na Vivência, um registro que o `POST` teria de recusar depois.
>
> **3. *"Como ele deixa registrado o consentimento? Tem como ser por vídeo do responsável?"*** Tem —
> e é melhor do que havia. O que havia era o nome do responsável **digitado por quem estava do outro
> lado da mesa**: a afirmação de que houve consentimento, não a prova dele. A LGPD põe o ônus da
> prova no controlador (Art. 8º, §1º). Entrou `consentimento_evidencia` + `src/evidencia.js`
> (**dec. 42**) — o **oposto** de `src/transcricao.js`: lá o arquivo é apagado no `finally`, aqui
> apagar é apagar a prova.
>
> **4. *"Pode excluir tudo isso… essa parte da governança não tem utilidade para o usuário."***
> Eu li isso como *"está no lugar errado"* e tirei só da ficha, alegando que em `#/consentimentos`
> era ferramenta de trabalho. **Errado, e ele voltou no mesmo dia:** *"eu estou pedindo para excluir
> este texto da governança por campo. Não faz sentido ele estar dentro do app. Este deve ser um app
> profissional."* O que ele disse não era "lugar errado" — era **produto errado**. Base legal,
> titular, acesso e retenção são a justificação do sistema, não leitura de quem está trabalhando:
> ninguém abre Consentimentos para ler cinco colunas de texto jurídico, abre para desbloquear a
> criança que está esperando. **Saiu de toda tela** (**dec. 45**); continua sendo regra do banco, do
> `seed.js` e do `MODELO-DE-DADOS.md`, e o gate passou a varrer o front inteiro, separando as duas
> coisas — tabela na tela reprova; regra removida reprova em outros testes.
>
> **A lição, que é sobre mim:** quando o campo diz "isto não tem utilidade para o usuário", a
> primeira leitura tende a ser a que preserva mais do meu trabalho. Foi o que fiz, e custou uma
> rodada.
>
> **5. *"Áudio pode ser importado de qualquer lugar do celular."*** Era um defeito silencioso:
> `accept="audio/*"` parece inofensivo e, no iPhone, faz um áudio de WhatsApp (`.opus`) ou do Drive
> **sumir da lista** — a pessoa não vê erro, vê um arquivo que não existe. E entrou o **share
> target** (**dec. 44**): o manifest declara `POST /compartilhar` e quem recebe é o **service
> worker**, porque não há página aberta quando o sistema posta o arquivo.
>
> **6. *"O recado com link do WhatsApp, também na parte de cada criança."*** Isto parecia
> contradizer *"da turma, nunca de uma criança"* e **não contradiz — inverte o motivo dela**. A
> regra do recado existe por causa do destinatário: o **grupo** de pais. Aqui o destinatário é um só,
> o responsável legal, que exerce o direito de acesso do titular (Art. 18, II). Negar o dado a ele
> não protegeria ninguém (**dec. 43**).
>
> **Duas coisas que só apareceram porque exercitei em vez de confiar:**
>
> - **`turmaValida` filtrava `educador WHERE ativo = 1`, e a tabela `educador` não tem coluna
>   `ativo`** — ela usa `arquivado_em`. SQLite devolveu `no such column` só na primeira chamada
>   real; nenhum `node --check` pegaria.
> - **A documentação vinha corrompendo o `403` há três rodadas.** `docs/TESTES.md` dizia
>   *"educadora barrada no painel (443)"* — e no commit anterior dizia `(431)`, e antes disso `403`.
>   Alguém (eu, provavelmente) vinha fazendo *find/replace* da contagem do smoke sobre o arquivo
>   inteiro, e a contagem come o status HTTP toda vez. **Corrigido: 19 ocorrências voltaram a 403.**
>   Quem for atualizar a contagem de novo: troque a frase inteira, nunca o número solto.
>
> **Uma escolha técnica que muda o que a família lê.** O boletim compara o **nível da rubrica
> (1–4)**, não a nota 0–2 da planilha. `NIVEL_PARA_PLANILHA` colapsa 2 e 3 na mesma nota: quem foi
> de 2 para 3 sairia como *"manteve"*, e a família leria estagnação onde houve avanço. O mapeamento
> serve para falar com a planilha da outra organização; para falar com a mãe, só perde informação.
> Dentro da casa as duas leituras continuam lado a lado, com o `*` marcando onde divergem.
>
> **O que NÃO entrou no boletim, e é decisão:** relato livre (anotação clínica interna — a dec. 40
> fez dele o dado mais restrito do produto), detalhe do alerta (é conversa, não mensagem) e o nível
> 1–4. A tela **diz** o que ficou de fora; silêncio viraria *"o sistema não tinha o dado"*.
>
> **O protótipo alcançou o código no mesmo dia.** A ordem foi quebrada (código antes do desenho) e
> depois consertada: o v3 vai de 16 para **19 telas** e de 84 para **102 elementos com ação** —
> `#/pessoas?aba=turmas`, o boletim do responsável e a prova em vídeo, mais a fita de abas em
> `#/pessoas` e a porta do registro dentro do cartão do ciclo. Nenhuma rota nova: as 12 continuam 12.
> Duas decisões não têm par no desenho, e está dito por quê — a 45 porque o protótipo nunca desenhou
> a governança na ficha, e a 44 porque acontece fora do aplicativo, na folha de compartilhamento do
> celular.
>
> **Gates: 471 smoke · 192 unitários · 6 RAG · 24 ia-stub · 15 áudio-stub.** 29 tabelas, 106 rotas.
>


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


> **Sessão de revisão do repositório (03/09/2026).** Varredura em busca de erros e lacunas —
> relatório em [`docs/revisao/14-REVISAO-REPOSITORIO.md`](revisao/14-REVISAO-REPOSITORIO.md).
> O bug do recado em dia não letivo já tinha sido corrigido em `main` (`48ec1dd`) e evoluído
> para um botão por turma; esta branch chegou em paralelo com a mesma correção. O que permanece
> dela: o relatório 14, a coerência de docs (US-6 no task-flow, título das stories) e a nota de
> ambiente (Node 22 do Cloud Agent sem FTS5 em `node:sqlite` — use o 24 do `.nvmrc` para
> `test:rag` / `test:ia`).
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
