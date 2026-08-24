# Roteiro do vídeo demonstrativo

Entregável exigido na semana 10. Percurso sugerido: **8 a 10 minutos**. Antes de gravar, rode
`node scripts/reset.mjs` para garantir o estado inicial descrito abaixo.

> **Atualizado para a v2 (22/08/2026).** O vídeo em `video/percurso-demonstracao.mp4` foi gravado
> sobre a v1 e **não mostra** captura por voz, confirmação, pauta de segunda nem relatório do
> doador. Regravar seguindo este roteiro é item aberto da entrega
> (ver `ARQUITETURA.md`, horizonte 1, item 1.6).

> Grave em janela estreita (≈400px) ou no celular: a persona usa o produto em pé, dentro da sala.

---

### 0 · Abertura (30s)

Tela de entrada. Dizer: o desafio escolhido foi o **B — Monitoramento de Impacto**; o produto se
chama **Percurso**; **todos os dados são sintéticos**, nenhum dado real de criança foi usado.

### 1 · O problema, na voz da persona (30s)

Ler a frase da persona: *"Não consigo transformar em dados os resultados do meu trabalho."*
Entrar como **Maria Silvia**.

### 2 · Anti-abandono (45s) — *o que impede a solução de morrer na segunda semana*

Mostrar o banner **"Que bom te ver de volta"**: 7 dias sem registrar, nada se perdeu, 5 datas em
aberto e nenhuma expira. Dizer por que isso está ali: em ONG, o registro não morre por rejeição,
morre por lapso seguido de desistência.

### 3 · Presença em um toque — F2 (45s)

Abrir a chamada. Usar **"Todos presentes"**, marcar uma falta, salvar. Mostrar que ao salvar o
sistema **abre sozinho a próxima data pendente** — recuperação encadeada, sem cobrança.

### 4 · Agenda do ciclo — F4 (45s)

Abrir **Ciclo**: 16 de 18, 89%. Mostrar as duas crianças bloqueadas e ler os motivos em voz alta:
uma por **falta de consentimento do responsável (LGPD Art. 14)**, outra por **janela mínima de
convívio não cumprida**. Dizer: bloqueio explicado nunca é erro da usuária.

### 5 · Contar como foi — F3/F4/F5/F6 (120s) — *o núcleo da v2*

Da tela **Hoje**, tocar em **"Contar como foi"**. Mostrar o microfone, a onda e a contagem de 40
segundos. Falar (ou, se o navegador não transcrever, digitar no campo de baixo — mostrar que a
saída manual está sempre ali) algo como:

> *"Hoje a gente fez uma roda de conversa sobre saúde, a turma participou bastante e ficou alegre.
> Três crianças pediram ajuda. A mãe da Ana contou que ela começou terapia esta semana."*

Tocar em **Terminei**. Três coisas acontecem na tela, e vale nomear cada uma:

1. **O aviso de encaminhamento humano.** *"Tem algo aqui que não entra no sistema. Fale com a
   coordenação — esse caminho é fora daqui."* Dizer: um produto de voz sobre criança vai capturar
   revelação sensível alguma hora; em vez de tentar impedir, o sistema reconhece, **não grava** e
   devolve o caminho certo. O trecho não alimentou campo nenhum.
2. **A tela "O que entendi".** As pills já vêm marcadas — *roda de conversa*, *saúde*, *participou*,
   *alegre*, e o contador em três. Dizer que o agente **escolhe dentro de listas fixas** e nunca
   escreve texto livre: é isso que torna a saída comparável entre educadoras diferentes.
3. **Nada foi gravado ainda.** Trocar a área de *saúde* para *educação* na frente da câmera, para
   mostrar que quem confirma é a pessoa. Só então tocar em **Confirmar e guardar**.

Se der tempo, mostrar o **Descartar**: nada some, porque nada tinha sido gravado.

### 5b · O olhar — F3 da v1 (45s)

Abrir uma observação pendente em `#/ciclo`. Mostrar as 5 dimensões com âncoras comportamentais —
*"marque o que você observou, não o que acha que a criança é"* — e o subtítulo **"Opcional. A folha
do dia já registrou a turma."**

Dizer o que **não** existe nesta tela: não há campo de opinião sobre a criança. Texto narrativo
sobre criança nomeada é registro clínico, e registro clínico tem outra titular.

### 5c · A pauta de segunda — F11 (60s) — *o argumento*

Ir para **Pauta**. Mostrar os três cartões: as crianças em risco de sair com o motivo, a área
**Saúde** sem atividade apesar das interessadas, e a sugestão de atividade. Tocar em **"Não faz
sentido"** e dizer que o descarte é registrado — a taxa de descarte é a métrica que diz se a
sugestão está genérica.

Ler o rodapé em voz alta: *"Você não preencheu nada além da chamada e de 40 segundos de voz."*

### 6 · O fecho da turma — F5 (60s) — *o momento*

Concluir a última observação pendente. Deixar a tela de revelação aparecer sem falar por cima:
**18 de 18**, ~54 minutos no ciclo inteiro, as barras dos dois ciclos, e a frase entre aspas.
Só então dizer: *"é esta frase, e não o número de presenças, que o Instituto não conseguia dizer a
quem financia."*

### 7 · A coordenação (90s)

Sair e entrar como **Rita Amaral**.

- **Painel** — 106 crianças únicas para 120 matrículas, 14 em dois programas. Dizer que este é o
  bloco 3 do dossiê respondido: *"120" era matrícula, não criança.* Mostrar a Vivência terapêutica
  declarada **fora do sistema por construção**.
- **Safras** — curvas de permanência e evasão por programa, saindo da planilha de presença que já
  existe, sem coleta nova. Frisar: permanência é **proxy de vínculo**, declarado como proxy.
- **Síntese** — gerar. Mostrar os selos **"revisor de sobre-alegação: aprovado"** e **"aprovação
  humana: pendente"**. Aprovar. Dizer que os números vêm de consulta ao banco e o texto de template
  fechado — nunca de geração livre.
- **Consentimentos** — registrar um consentimento pendente e mostrar a criança sendo desbloqueada.
- **Scores** — os três, com a frase de abertura: *nenhum destes scores pontua a criança*. Mostrar
  que o risco de evasão compara a criança **com a linha de base dela mesma**, que a cobertura do
  registro **mede o sistema e não a professora** (e por isso não aparece em tela de educadora), e
  que a exposição publica a lacuna em vez de escondê-la.
- **Importar planilha antiga** — colar uma planilha com o mesmo nome escrito de três jeitos, clicar
  em **Simular** e mostrar as grafias unificadas em uma criança só, com as linhas descartadas e o
  motivo de cada uma. Dizer que isso entrega no dia 1 a série histórica que um sistema novo só teria
  em 2029.

### 7b · A diretoria — F13/F14 (90s)

Sair e entrar como **Solange Ribeiro**.

- Escolher o período e mostrar a **prévia**, com o aviso de que recortes com menos de cinco crianças
  são agrupados ou suprimidos.
- **Gerar rascunho.** Percorrer os sete blocos na ordem em que um financiador lê: capa de
  permanência, cobertura com **crianças únicas e matrículas lado a lado**, permanência e presença,
  dose com a caixa de limites, exposição com a lacuna publicada, observação estruturada com o aviso
  de que não é instrumento validado, e método/limites/custo com os **dois denominadores**.
- Mostrar o selo **"revisor de sobre-alegação: aprovado"** e a caixa de supressão declarando o que
  foi agrupado. Só então **Revisar e publicar**.
- Fechar dizendo a regra zero: **o doador não entra no sistema** — ele recebe este artefato. Doar
  não pode virar caminho de acesso a criança. E provar: tentar abrir a ficha de uma criança neste
  perfil devolve **403**.

### 8 · Fecho técnico (45s)

Mostrar o terminal: `node server.js` — sem instalação, sem build, sem mensalidade. Mostrar
`data/percurso.db` — o backup é copiar um arquivo. Rodar `node scripts/reset.mjs && node
scripts/smoke-test.mjs` e mostrar **242 passaram · 0 falharam**, e `node scripts/unit-test.mjs` com
**55 passaram**.

Encerrar com a restrição do bloco 5: *a solução precisa sobreviver à semana 10* — e é por isso que
ela tem essa forma.
