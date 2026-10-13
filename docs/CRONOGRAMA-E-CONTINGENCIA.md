# Percurso — Cronograma de implantação e contingência

Entrega da Semana 10 · Módulo 3 · Trilha de Tecnologia · MVP Funcional Instituto Ebenézer ·
Desafio B (monitoramento de impacto) · Grupo 06

Quatro semanas, quatro sábados, uma pessoa e um fluxo: a psicóloga, com a chamada e o registro de
vivência, na turma sintética e em paralelo ao registro que ela já faz hoje. Os limiares de sucesso
e o critério de falha são os da `METODOLOGIA-VALIDACAO-PERCURSO.md` §5.1; dado real de criança
continua dependendo dos pré-requisitos do Handover §10.

---

## 1. Cronograma

A semana 1 conta a partir do dia em que a coordenação aprova o início.

| Semana | Segunda a sexta | Sábado | Marco | Para passar à seguinte |
|---|---|---|---|---|
| **1 · Preparar e começar** | **Seg:** reunião com a coordenação — nome de quem liga a máquina no sábado, integrante do grupo que dá apoio, canal de dúvidas. **Ter–qua:** no Instituto, o Percurso instalado na máquina que vai operar (Manual), início automático ligado, certificado aceito em cada celular (Handover §2), rede testada dentro da sala do encontro; backup automatizado (item 2.4 do `ARQUITETURA.md` §5) antecipado. **Qui:** ensaio da psicóloga no próprio celular, com o banco preparado por `scripts/preparar-sessao.mjs` | Primeira chamada no encontro real, **com o apoio do grupo presente** | Ambiente aprovado; primeira chamada registrada | Segunda chamada salva sem ajuda; a cópia do sábado existe e abre |
| **2 · Registro de vivência** | **Seg:** primeira revisão de 15 min — números do painel contra a Metodologia §5.1, chamada em todos os sábados, backup com menos de 24 h. Correção dos pontos onde a psicóloga travou. Voz ligada só se todos os celulares aceitaram o certificado | Chamada e registro de vivência, **sem apoio na sala** | O fluxo do sábado inteiro feito só pela psicóloga | Tempo de chamada e taxa de correção dentro dos limiares |
| **3 · A coordenação entra** | **Seg:** revisão conduzida pela coordenação, no painel. **Qua:** ensaio de falha — registrar com a rede desligada e conferir a sincronização (decisão 17); restaurar uma cópia do backup numa pasta de teste | Terceiro sábado, sem apoio na sala | A coordenação conduz a revisão sozinha | Fila offline e restauração provadas no Instituto |
| **4 · Medir e decidir** | **Seg:** revisão. **Nenhuma mudança no produto** — a semana mede, não corrige | Quarto sábado, sem apoio na sala | Números das quatro semanas fechados | — |
| **Segunda seguinte** | **Decisão da coordenação:** limiares atingidos → **ampliar** para as educadoras do Reforço e iniciar o Horizonte 2; um limiar abaixo com causa conhecida → **corrigir e repetir** por mais duas semanas, com uma única correção; critério de falha observado → **parar** e voltar à sessão moderada de `VALIDACAO-USUARIO.md`. Os valores medidos entram no `MVP-CANVAS.md` §6 e o piloto ganha data no §7 | | | |

---

## 2. Contingência — o que fazer quando algo falha

Regra geral: **se um número cair ou um sábado falhar, alguém do grupo vai até o Instituto antes de
escrever mais código.** O que se vê na sala raramente se corrige pelo repositório.

| # | Problema identificado | Como aparece | Fazer na hora | Responsável | Se repetir |
|---|---|---|---|---|---|
| 1 | Máquina desligada no sábado | Celular não abre o Percurso no início do encontro | Psicóloga faz a chamada no papel, como antes; registra no Percurso depois — nada expira e registrar atrasado não tem penalidade | Psicóloga | Trocar a pessoa que liga a máquina, ou deixá-la ligada da sexta ao sábado |
| 2 | Servidor caiu no meio do encontro | Telas param de responder com a máquina ligada | Seguir registrando: a fila do aparelho guarda e envia quando o servidor volta (decisão 17). No macOS, o início automático religa o processo sozinho | Psicóloga | Ler `data/percurso-servico.log`; no Windows, religar à mão e avaliar a máquina da coordenação |
| 3 | Rede não chega à sala | Celular sem conexão com a máquina | Registrar assim mesmo; sincroniza ao voltar à rede | Psicóloga | Mudar a máquina de lugar ou o encontro de sala; repetir o ensaio da semana 3 |
| 4 | Celular recusa o certificado | Aviso de conexão não privada que não passa | Usar o Percurso por botões; só a voz fica de fora | Psicóloga | Apoio refaz o aceite do certificado naquele aparelho; persistindo, a voz fica desligada no piloto |
| 5 | Voz erra demais | Taxa de correção acima do limiar no painel | Desligar a voz; o fluxo inteiro funciona por botões | Coordenação | Registrar como achado; decisão 13 manda rever a captura por voz |
| 6 | Chamada lenta | Tempo médio acima do limiar na revisão | Acompanhar um sábado para ver onde o tempo vai | Apoio do grupo | Uma correção, na semana seguinte, só sobre o passo que travou |
| 7 | Um sábado sem registro | Painel mostra o encontro em aberto | Registrar atrasado na segunda, com a psicóloga; a retomada sem culpa é do próprio produto | Coordenação | Perguntar o motivo antes de cobrar; dois sábados seguidos sem registro é sinal do critério de falha |
| 8 | Psicóloga travou em uma tela | Relato no canal ou na revisão | Apoio responde no canal; se não resolver, vai ao Instituto | Apoio do grupo | Corrigir só aquele ponto, na semana seguinte |
| 9 | Psicóloga voltou ao papel ou à planilha | Ela mesma diz, ou os registros param | Não insistir: é o critério de falha da Aula 01 | Coordenação | **Parar** o piloto e voltar à sessão moderada de `VALIDACAO-USUARIO.md` |
| 10 | Backup não foi feito | Última cópia com mais de 24 h | Copiar `data/percurso.db` à mão, como no Manual §4 | Responsável pela máquina | Apoio corrige o agendamento antes do sábado seguinte |
| 11 | Banco perdido ou corrompido | Percurso abre vazio ou com erro | Parar de registrar; restaurar a última cópia como no Manual §4, apagando antes `-wal` e `-shm` antigos | Apoio do grupo | Rever onde as cópias ficam; a segunda mídia não pode ser a mesma máquina |
| 12 | Atualização de código durante o piloto | Alguém quer subir uma correção | Só depois de um backup, e nunca se o esquema mudou — hoje mudança de esquema recria o banco (decisão 14) | Apoio do grupo | Correções esperam a semana seguinte; na semana 4, nenhuma |
| 13 | Dado de criança no canal de dúvidas | Nome, foto ou print de tela no WhatsApp | Apagar a mensagem e lembrar a regra: só a dúvida, nunca a criança | Coordenação | Trocar o canal por conversa presencial na revisão de segunda |
| 14 | Conteúdo clínico digitado no registro | O filtro de perímetro recusa o trecho | Salvar sem o trecho, como o produto oferece; o conteúdo segue pelo regime da psicóloga (decisão 5) | Psicóloga | Levar à revisão: se o filtro barra demais, é ajuste de termos, não de regra |
| 15 | Apoio do grupo indisponível | Ninguém responde no canal | A coordenação decide sozinha pelas linhas desta tabela | Coordenação | Nomear um segundo integrante do grupo como reserva |
| 16 | Máquina perdida, roubada ou formatada | Percurso não existe mais na máquina | Instalar em outra máquina (Manual) e restaurar a última cópia | Apoio do grupo | É o risco permanente do `ARQUITETURA.md` §7; a cópia fora da máquina é o que o mitiga |
