# Jornadas — atual e futura, por persona

As personas vêm do material produzido em aula
(`1 - Arquitetura/Material Produzido em Aula/mvp-percurso-persona.html` e
`visao-produto-ebenezer.html`); a jornada atual vem do dossiê de campo lido pela
[`LEAN-INCEPTION.md`](LEAN-INCEPTION.md); a futura, das telas que o MVP entrega
([`README.md`](../README.md)). Este documento formaliza o que o achado D-05 da
[`revisao/02-RELATORIO-REVISAO.md`](revisao/02-RELATORIO-REVISAO.md) apontou como disperso.

Os ganhos listados são os que o produto entrega por construção. Os custos também estão listados,
porque jornada futura sem custo é propaganda: **registrar é trabalho novo**, e a única prova de
que ele cabe na rotina é a validação com usuário real — que ainda não aconteceu
([`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md)).

---

## 1. A educadora — Maria Silvia

35 anos, pedagoga do reforço escolar (7–11), roda de segunda a sexta. A frase que a define, tirada
da dinâmica de personas: *"Não consigo transformar em dados os resultados do meu trabalho."*
Dores declaradas: registrar sem tirar atenção das crianças; ter mais tempo para planejar; agir
sempre sob demanda, sem controle. Necessidade decisiva: **não expor as crianças** — exigência da
própria usuária, não borda de conformidade.

O quadro de voluntários do Instituto se concentra no sábado; Maria Silvia é da equipe de semana.
A jornada abaixo vale para a voluntária de sábado também — o produto não exige frequência diária:
ciclos de observação são 2–3 vezes por ano e chamada atrasada nunca expira.

### Jornada atual (papel, planilha, memória)

1. Observa a criança durante a atividade. O que viu fica **na cabeça**.
2. Faz a chamada no papel ou na planilha. Fica registrado quem veio — e só.
3. Conta o episódio marcante para uma colega no corredor. **A informação morre ali.**
4. Uma criança some por duas semanas; ela percebe quando percebe, e age sob demanda.
5. No fim do ano, se perguntada sobre a evolução de alguém, responde de memória — sem data, sem
   comparação, sem como provar.

**Dores desta jornada:** o trabalho central dela (ver a criança mudar) não deixa rastro; qualquer
registro que se tentasse por escrito competiria com a atenção às crianças; e ela nunca recebe
nada de volta pelo que observa.

### Jornada futura (com o Percurso)

1. **`#/hoje`** — abre e vê o que falta hoje, o alerta de ausência (duas faltas seguidas) e, se
   ficou dias sem entrar, a retomada sem culpa: *"nada se perdeu"*, com atalho para a data em
   aberto.
2. **`#/chamada`** — presença em um toque por criança. Sem rede, o registro entra na fila offline
   e sobe sozinho quando a conexão volta.
3. **`#/folha` → `#/voz` → `#/confirmar`** — fala ~40 segundos sobre o dia da **turma**; o áudio é
   transcrito no próprio aparelho e descartado; o extrator pré-preenche a folha em listas
   fechadas; **nada é gravado antes de ela confirmar**. Se preferir, digita — o caminho manual
   está sempre visível.
4. **`#/ciclo`** — vê quem falta observar e quem está bloqueada, com o motivo explícito (janela de
   convívio, consentimento) — bloqueio é protocolo, nunca erro dela.
5. **`#/observacao/:id`** — rubrica de 6 dimensões × 4 âncoras comportamentais (os seis indicadores da planilha socioemocional do Instituto — decisão 34), ~3 minutos por
   criança; rascunho persiste se ela sair no meio. Sem campo de texto livre sobre a criança — por
   decisão de desenho (decisão 15 de [`DECISOES-TECNICAS.md`](DECISOES-TECNICAS.md)).
6. **`#/pauta`** — toda segunda recebe três linhas acionáveis e uma sugestão de atividade, que
   aceita ou descarta. É a primeira vez que o registro devolve algo a ela.
7. **`#/turma`** — vê as médias por dimensão mudarem ciclo a ciclo. Ao fechar a última observação
   da turma, a tela devolve em números o que ela sabia e não conseguia provar.

**Passo opcional (v3, se `AI_ENABLED=1`):** na aba **Refletir**, descrever uma situação da
turma (sem nomear a criança — nomes viram pseudônimo antes do modelo) e receber perguntas
socráticas, hipóteses rotuladas e alternativas com citação do corpus aprovado. A decisão
pedagógica continua dela; situação de risco escala para o caminho humano.

### Ganhos e custos, honestos

| Ganha | Custa |
|---|---|
| O que ela via passa a existir como dado, com data e comparação | Registrar é trabalho novo: ~3 min por observação e ~40 s por folha do dia — se isso não couber na rotina, o produto falha, e só a sessão de validação mede isso |
| Devolução concreta: pauta de segunda, trajetória da turma | O extrator lexical entende menos variação de fala que um LLM; ela vai corrigir campos. A taxa de correção está instrumentada e o limite declarado é 40% (decisão 13) |
| Alerta de ausência tira o "agir sob demanda" | O aviso de conteúdo sensível interrompe a fala dela e devolve encaminhamento humano — certo por proteção, mas é fricção real |
| Proteção por construção: sem texto livre sobre criança, fala nunca sai do aparelho | O MVP não tem senha — o perfil se escolhe na tela. Aceitável na demo sintética; bloqueante antes de dado real (dívida declarada) |

---

## 2. A coordenação — Rita Amaral

Usuária secundária na inception: precisa do agregado, da cobertura, da evasão e da síntese que
alimenta o relatório ao financiador.

### Jornada atual (papel, planilha, memória)

1. Recebe a planilha de presença de cada turma e consolida à mão.
2. Sobre a evolução socioemocional — a dimensão que o Instituto considera central — **não recebe
   nada, porque nada é registrado**. Cobertura zero.
3. Descobre no braço que 120 matrículas não são 120 crianças (14 estão em dois programas), toda
   vez que alguém pede o número.
4. No fim do ano, escreve o relatório anual **com adjetivos, porque não tem substantivos**.
5. Apresenta ao financiador quantas crianças atendeu e quantas vezes vieram. Sobre o que mudou,
   não tem como afirmar nada.

**Dores desta jornada:** a lacuna de medição vira lacuna de captação; financiador corporativo que
entra por incentivo fiscal cobra prestação de contas, e prestação de contas sem dado é passivo.

### Jornada futura (com o Percurso)

1. **`#/painel`** — 106 crianças, 120 matrículas, 14 em dois programas: a reconciliação que ela
   fazia no braço, pronta. Cobertura do ciclo, presença do mês, alertas abertos.
2. **`#/scores`** — três scores que medem vínculo, sistema e oferta — **nunca a criança**: risco
   de evasão, cobertura do registro, exposição (aspiração declarada × atividade realizada).
3. **`#/safras`** — permanência e evasão por safra e por programa.
4. **`#/consentimentos`** — pendências de consentimento; campo sem base legal declarada nasce
   bloqueado no servidor, não no botão da tela.
5. **`#/sintese`** — gera a síntese do ciclo em template fechado (números vêm de SQL, nunca de
   modelo), passa pelo revisor de sobre-alegação e **aprova ou devolve** — a aprovação é dela.
6. **Fecho do ciclo** — fecha o ciclo, a retenção declarada é executada e o próximo abre.

**Passo opcional (v3, se `AI_ENABLED=1`):** a mesma sala **Refletir** para preparar conversas
de calibração — e, no painel, a leitura de divergência entre educadoras por dimensão (pauta de
reunião, nunca ranking).

### Ganhos e custos, honestos

| Ganha | Custa |
|---|---|
| Pela primeira vez pode afirmar o que mudou, com número auditável por terceiro | Fechar ciclo, decidir pauta de consentimento e aprovar síntese são tarefas novas dela — o sistema não decide sozinho, por desenho |
| Reconciliação criança ≠ matrícula deixa de ser trabalho manual | A cobertura do registro depende das educadoras registrarem; o score de cobertura mede o sistema, mas quem corre atrás é ela |
| Síntese com ressalva metodológica obrigatória — ninguém sobre-alega em nome do Instituto | Antes de operar com dado real, autenticação, HTTPS e auditoria de acesso são decisões de operação que caem no colo dela (dívidas declaradas em `DECISOES-TECNICAS.md`) |

---

## 3. A diretoria — Solange Ribeiro

Perfil que entrou com a v2. Existe para uma coisa: prestar contas a quem financia.

### Jornada atual (papel, planilha, memória)

1. Pede material à coordenação quando o financiador cobra; recebe presença consolidada e texto.
2. Monta a prestação de contas com o que há: número de atendidos, fotos, relato qualitativo.
3. Sobre impacto, escolhe entre não afirmar nada ou afirmar sem lastro — e afirmar sem lastro,
   diante de financiador que audita, é risco institucional.

### Jornada futura (com o Percurso)

1. Entra como diretoria e vai a **`#/relatorio`** — gera o relatório do ciclo em sete blocos, com
   a supressão de célula pequena (n < 5) aplicada **antes** da redação e o revisor de
   sobre-alegação barrando verbo causal forte. Revisa e publica. A carta do trimestre sai do
   mesmo pipeline.
2. **`#/consulta`** — pergunta em linguagem natural sobre a camada agregada; quando o sistema não
   reconhece a pergunta, diz que não sabe.
3. **Não abre registro individual.** As rotas de ficha e lista de crianças respondem 403 para o
   perfil dela, por decisão de desenho (decisão 16): quem presta contas trabalha sobre a camada
   agregada, então não precisa de acesso individual — e por isso não tem.

**Passo novo (v3):** na aba **Impacto**, montar os três cenários exploratórios de SROI com
premissas expostas (faixa, nunca número único; revisão humana antes de uso externo) — e, com a
camada de IA ligada, pedir a explicação das premissas (texto rotulado, fora do export padrão).

### Ganhos e custos, honestos

| Ganha | Custa |
|---|---|
| Relatório com números reproduzíveis (SQL + template fechado), defensável diante de auditoria | O texto é contido por construção: ela não pode escrever "o programa gerou X" — o revisor barra, e a ressalva de não-isolamento de fatores é obrigatória. É limite deliberado, não defeito |
| Nenhum caminho, nem acidental, de exposição de criança na prestação de contas | Perguntas fora da lista fechada da consulta voltam sem resposta — o sistema prefere não saber a inventar |

---

## 4. A psicóloga — Carolina Duarte (papel `profissional`)

> **Persona que o campo trouxe** (visita de 29/08/2026, decisão 31). Até então cinco documentos
> deste repositório diziam *"a psicóloga não é usuária"*. A visita mostrou o contrário duas
> vezes: é ela quem nomeia o registro como a dor central (*"o maior desafio aqui é registrar o
> que você fez, né?"*) e quem produz o único registro escrito que existe — o relatório no padrão
> do conselho profissional, por procedimento, não individualizado, sem nome. Na demonstração ao
> vivo foi preciso improvisar um perfil dela, porque o app assumia professora. O nome aqui é
> sintético; a pessoa real é nomeada pelo papel, a mesma regra que o conselho impõe ao relatório
> que ela escreve.

Psicóloga voluntária há seis anos, remunerada por parceria só desde este ano e só até dezembro.
Conduz a **vivência terapêutica** aos sábados (duas turmas: manhã e tarde), faz acolhimentos
pontuais, atende na própria clínica, trabalha numa segunda organização e cursa uma
pós-graduação. O tempo dela é o recurso mais escasso da casa — o dossiê já dizia isso, e a visita
confirmou: *"e aí eu não consigo dar conta"*.

O que ela quer do produto não é atividade nova (*"isso não é uma coisa que eu sinta falta"*): é
**registrar sem parar o atendimento** e sair com o relatório que o conselho pede.

### Jornada atual (memória, relatório à mão, WhatsApp)

1. Conduz a vivência (ex.: jogo de cartas sobre a rede de apoio da comunidade; roda sobre
   regulação e sistema nervoso). Observa o grupo — quem ajudou, quem participou do começo ao
   fim, quem entrou em conflito e como resolveu. **Fica na cabeça.**
2. Depois, quando dá, escreve o relatório do procedimento no padrão do conselho: o que foi
   feito, com que objetivo, o que o grupo apresentou — sem nome, não individualizado. Quando
   precisa citar alguém, usa iniciais. *"Depois tem que sair daqui, preencher o relatório… não
   dá, não dá."*
3. A assistente social do projeto parceiro manda mensagem perguntando *"como ele tá"*. Responde
   **de memória**.
4. Uma oficina de costura em que uma menina quis desistir e terminou dizendo *"nossa, eu
   consegui"* trabalhou resiliência e autoestima — e **não deixou rastro** para ninguém, nem para
   quem financia.

**Dores desta jornada:** o registro compete com o atendimento; o relatório é trabalho de fora de
hora; o conhecimento de seis anos está só nela (*"ninguém consegue fazer um download do seu
cérebro"*); o que ela vê não vira evidência.

### Jornada futura (com o Percurso)

1. **`#/hoje`** — entra como psicóloga e vê a turma da Vivência do sábado. **Não há agenda de
   ciclo**: a turma dela fica fora da rubrica por decisão (o olhar clínico não vira dado).
2. **`#/chamada`** — presença em um toque, igual às demais turmas. É a mesma régua de 75% que o
   Instituto já usa.
3. **`#/voz` → `#/confirmar`** — fala ~40 segundos sobre **o grupo**: o procedimento (lista
   fechada), o objetivo, como o grupo esteve, e o **check-in estruturado** que ela validou ao
   vivo — *quantas ajudaram sem ninguém pedir, quantas participaram do começo ao fim, quantos
   conflitos e quantos resolvidos conversando, quantas não observadas*. Se falar um nome, a tela
   mostra o nome virando código antes de qualquer gravação. Se falar de um caso, o filtro de
   perímetro devolve encaminhamento humano — e a frase "vivência terapêutica" não dispara o
   filtro, porque é o nome do procedimento, não conteúdo sobre criança.
4. **`#/relato`** — o registro do procedimento nasce pronto, no padrão do conselho, sem nome por
   construção; ela **revisa e libera** (ou não). O texto é dela; a IA, quando ligada, só organiza.
5. **`#/turma`** — a devolução por encontro: como o grupo de hoje se compara às últimas
   vivências, em contagens; e a régua de presença da turma.
6. **Parecer para profissional parceiro** — quando a assistente social perguntar, ela (ou a
   coordenação) gera um parecer por **código**, com presença, participação e evolução por
   indicador — só com consentimento específico do responsável e com a liberação registrada.

### O que a jornada de campo v2 exige e o MVP ainda não tem (02/09/2026)

A jornada de campo (`docs/jornada-usuario/`) foi revista em 02/09/2026 e trouxe uma distinção que
o passo 3 acima ainda não respeita: **capturar não é registrar**. Capturar é apertar um botão — ou
já ter um áudio no celular. Registrar é virar relato, contagem e indicador, e isso é trabalho do
sistema, a qualquer momento. Quem é metódico é o sistema; quem estrutura o dado é o sistema.

Na prática, o fluxo `#/voz` de hoje só existe numa janela: durante ou logo depois do encontro. É
exatamente a hora em que o campo mostra que ela **não tem mãos livres** — e a hora seguinte é onde
ela responde *"Não dá, não dá"*. Faltam, portanto, quatro coisas, nenhuma delas implementada:

| O que falta | Por quê | O que exige |
|---|---|---|
| **O encontro nunca fecha** | registro atrasado precisa entrar com a data do encontro, não a de hoje | modelo de dados aceitar data retroativa + marca de "registrado depois" |
| **O sistema não cobra** | sem notificação de atraso e sem pendência vermelha por encontro em aberto | revisão de `#/hoje` e `#/alertas` |
| **Gravar o encontro inteiro** | captura de custo zero: ela aperta no começo e larga o celular na mesa | transcrição local de áudio longo — o `SpeechRecognition` do navegador não serve |
| **Importar um áudio que ela já tem** | o áudio do gravador do celular ou do WhatsApp, de hoje ou de três semanas atrás | transcrição local **de arquivo**; `ai/model-manifest.json` não tem modelo de áudio (`#/importar` é CSV) |

**Condição inegociável para as duas últimas.** O campo chamou gravar criança de *"perigoso"*. As
duas só podem existir com três garantias ditas na própria tela, no instante do toque: o áudio não
sai do aparelho, é apagado assim que vira texto, e nome falado vira código antes de qualquer
gravação. Sem essas três frases visíveis, não se constrói.


### Ganhos e custos, honestos

| Ganha | Custa |
|---|---|
| O relatório do conselho sai do próprio registro de 40 s, sem hora extra | O tempo dela em sistema é tempo de atendimento (bloco 5): o custo declarado é ~40 s de fala + a confirmação por encontro, e só a operação real mede se cabe |
| O que o grupo mostrou vira contagem, e a contagem vira série — a costura passa a deixar rastro | Contagem de grupo é pobre por desenho: o que acontece com **uma** criança no grupo continua fora, e isso é a fronteira do bloco 6, não um defeito a corrigir |
| Anonimização visível no ato de falar — a prática dela (iniciais) virou regra do sistema | Falar de um caso no meio do relato interrompe o fluxo com o aviso de perímetro: proteção certa, fricção real |
| A pergunta do parceiro tem resposta com lastro, e o envio fica registrado | Sem consentimento específico do responsável, não há parecer — a coordenação precisa correr atrás do consentimento antes |
| O modelo de relatório do conselho que ela usa **ainda não chegou**: o template do Percurso é provisório até ele chegar (pendência) | |
