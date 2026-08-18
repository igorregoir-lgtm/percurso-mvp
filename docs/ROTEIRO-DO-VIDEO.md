# Roteiro do vídeo demonstrativo

Entregável exigido na semana 10. Percurso sugerido: **6 a 8 minutos**. Antes de gravar, rode
`node scripts/reset.mjs` para garantir o estado inicial descrito abaixo.

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

### 5 · A rubrica e o filtro de proteção — F3 (90s) — *o núcleo metodológico*

Abrir uma observação pendente. Mostrar as 5 dimensões com âncoras comportamentais — *"marque o que
você observou, não o que acha que a criança é"*.

Marcar as cinco. No campo livre, digitar de propósito algo como:

> *"Puxou conversa na roda de leitura. A mãe contou que ele foi diagnosticado com depressão.
> Terminou a tarefa sozinho."*

Concluir. **O filtro de proteção intercepta**, isola só a frase clínica, nomeia a categoria e
oferece "Salvar sem esse trecho". Confirmar. Dizer: o conteúdo bloqueado **não é apagado depois —
ele nunca é gravado**.

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

### 8 · Fecho técnico (45s)

Mostrar o terminal: `node server.js` — sem instalação, sem build, sem mensalidade. Mostrar
`data/percurso.db` — o backup é copiar um arquivo. Rodar `node scripts/smoke-test.mjs` e mostrar
**73 passaram · 0 falharam**.

Encerrar com a restrição do bloco 5: *a solução precisa sobreviver à semana 10* — e é por isso que
ela tem essa forma.
