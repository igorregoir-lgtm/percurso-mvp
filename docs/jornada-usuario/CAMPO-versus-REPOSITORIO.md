# O que a visita derrubou — campo × repositório

> **O achado mais caro desta visita não é o que confirmou o produto: é o que o contradisse.**
> Levantado na visita de campo de 29/08/2026 (4 gravações, 97 min), cruzado contra o que os
> documentos deste repositório afirmam. Cada linha é uma premissa nossa que o campo não sustentou.

Companheiro da [jornada de usuário](Jornada-Usuario-Ebenezer-Grupo06.png) — que mostra o percurso;
este documento mostra onde ele nos contrariou.

---

## 1. Quem nomeia a dor do registro, quem escreve o relatório, quem já anonimiza e quem é proc…

**O que o repositório diz.** A persona principal é uma pedagoga do reforço escolar, 35 anos, equipe de semana, de segunda a sexta (docs/ARTEFATO-SEMANA-5.md §1, docs/JORNADAS.md §1), com a frase-âncora "Não consigo transformar em dados os resultados do meu trabalho." O próprio JORNADAS.md admite a origem: as personas vêm de dinâmica feita em aula, e a jornada futura vem das telas, não do usuário.

**O que o campo mostrou.** Quem nomeia a dor do registro, quem escreve o relatório, quem já anonimiza e quem é procurada pela assistente social do parceiro é a psicóloga: "Eu acho que o ponto mesmo é você registrar" e "Agora o registrar é mais difícil". E a operação é sabática: "E a atividade é basicamente no sábado". O entrevistador admite na fita: "eu não sabia que você era psicóloga".

**Consequência.** A jornada principal do produto foi escrita para um papel que o campo não confirmou como dono da dor. Ou o Percurso ganha a jornada da psicóloga, ou o titular real do registro fica de fora do produto. Efeito colateral bom: o §5 do ARTEFATO-SEMANA-5, hoje marcado "⛔ não aconteceu", pode sair do branco — começando por registrar que a persona mudou.

---

## 2. É ela quem tem a dor central, quem produz o único registro escrito que existe hoje e que…

**O que o repositório diz.** "A psicóloga não é usuária" aparece em cinco afirmações independentes (docs/ARTEFATO-SEMANA-5.md:55, docs/LEAN-INCEPTION.md §2, docs/MVP-CANVAS.md:33, docs/ARQUITETURA.md:27, README.md) e está materializado no código: src/seed.js cria a linha de governança conteudo_clinico com titular "Psicóloga" e acesso "Ninguém, no Percurso"; o filtro de perímetro em src/domain.js bloqueia os termos psicolog, psicólog, terapia, terapeut e atendimento individual.

**O que o campo mostrou.** É ela quem tem a dor central, quem produz o único registro escrito que existe hoje e quem já pratica a anonimização que o produto promete automatizar. Diante do protótipo: "Mas esse aqui, nossa, também ajudaria muito com essas questões práticas".

**Consequência.** O produto exclui por construção a pessoa que tem o problema. Pior: se ela usasse o fluxo de voz e descrevesse o próprio trabalho, o filtro de perímetro classificaria a fala dela como conteúdo clínico e devolveria encaminhamento humano — o sistema recusaria seu usuário mais provável. Proteger o sigilo do atendimento continua certo; confundir sigilo com "ela não usa o sistema" não.

---

## 3. A regra vem de fora e tem dono: "normalmente é o padrão que o CRP... pede. Você registra…

**O que o repositório diz.** "Não expor as crianças" é tratado como exigência da própria usuária, não como borda de conformidade (docs/ARTEFATO-SEMANA-5.md:48, docs/LEAN-INCEPTION.md:55). E nenhum documento do repositório menciona conselho profissional: grep por CRP, conselho regional e conselho profissional em docs/ e README.md retorna zero.

**O que o campo mostrou.** A regra vem de fora e tem dono: "normalmente é o padrão que o CRP... pede. Você registra o procedimento que você faz durante a atividade", e a não individualização é imposta — "De forma não individualizada. Porque não pode ser individualizado."

**Consequência.** Não é preferência de usuária que o produto escolheu respeitar: é formato regulado por terceiro. A saída do Percurso precisa nascer nesse padrão (descrição de procedimento, não individualizada, sem nome), senão ela continua escrevendo o relatório à mão e o sistema vira trabalho duplicado. E o repositório perde o argumento mais forte que tinha: a restrição é externa e inegociável, não um capricho de desenho.

---

## 4. Gravar é tratado como proibido, e a palavra usada é perigoso, mesmo com o dado ficando n…

**O que o repositório diz.** O coração do MVP é a captura por voz (#/voz): fala de cerca de 40 segundos, transcrição no próprio aparelho, áudio descartado; a governança em src/seed.js registra "Áudio da captura por voz — Não coletado / Não persiste em nenhum momento".

**O que o campo mostrou.** Gravar é tratado como proibido, e a palavra usada é perigoso, mesmo com o dado ficando na sala: "Mas mesmo que fique aqui dentro este dado, ela não pode fazer? / É perigoso, né?" Em paralelo, gravar vídeo da atividade e mandar para o grupo dos pais é rotina tranquila e chamada de fácil.

**Consequência.** A fronteira real não é técnica, é sobre quem aparece na gravação: a voz da profissional sobre a turma é aceitável, a captação da criança não. A arquitetura já responde certo e a tela do momento da gravação não diz nada disso. Sem essa frase visível no exato instante do toque, o fluxo principal do MVP esbarra no medo — e a garantia "o áudio não persiste" fica escondida num documento que ela nunca vai ler.

---

## 5. "Você depois tem que sair daqui, preencher o relatório... Não dá, não dá." A equipe é in…

**O que o repositório diz.** O clímax do produto só dispara ao concluir a última observação pendente da turma (public/app.js, depoisDaObservacao → celebrar, com pendentes === 0) e exibe "~54 min" como custo do ciclo, calculado como agenda.observaveis * 3 — três minutos por criança, assumidos, nunca medidos.

**O que o campo mostrou.** "Você depois tem que sair daqui, preencher o relatório... Não dá, não dá." A equipe é intermitente (quem conduz o sábado não está na semana), falta voluntário, o sábado é corrido, o domingo é descanso, e ela ainda tem os próprios pacientes: "E aí eu não consigo dar conta".

**Consequência.** Um clímax condicionado a observar a turma inteira num ciclo pode simplesmente nunca disparar nesta operação. O produto precisa devolver algo por encontro, não só no fecho de ciclo. E os "~54 min" seguem sendo premissa de desenho, agora contra evidência de campo que diz que esse tempo não existe.

---

## 6. O destino de maior valor declarado é lateral, não vertical: a assistente social do proje…

**O que o repositório diz.** O registro só sobe: educadora → coordenação → diretoria → doador. A diretoria "não abre registro individual" e a educadora recebe de volta apenas a pauta de segunda. Nenhuma das 25 rotas de public/app.js prevê um profissional de fora da organização.

**O que o campo mostrou.** O destino de maior valor declarado é lateral, não vertical: a assistente social do projeto parceiro manda mensagem perguntando como a criança está, e isso é respondido de memória. O que ela quer do registro é histórico da mesma criança ao longo do tempo. "Que daí seria entre profissionais, que é mais rico ainda."

**Consequência.** Falta um caminho inteiro no produto: troca profissional-a-profissional, com o mesmo cuidado de sigilo do resto. A busca por "assistente social", "Alicerce" e "entre profissionais" em docs/, README.md, src/ e public/app.js retorna zero ocorrências. É o caso de uso que o campo apontou como o mais rico e que o repositório sequer nomeia.

---

## 7. A prestação de contas aos pais já acontece toda semana, por WhatsApp, manualmente, grupo…

**O que o repositório diz.** A família/responsável está fora do MVP como usuário: "O perfil de acesso digital das famílias não está caracterizado; nada pode pressupor aparelho ou conexão" (docs/MVP-CANVAS.md:35, docs/LEAN-INCEPTION.md:114).

**O que o campo mostrou.** A prestação de contas aos pais já acontece toda semana, por WhatsApp, manualmente, grupo por turma — inclusive um grupo restrito a quem tem 75% de presença. E o pedido partiu da própria liderança: "Se você tivesse um mecanismo de enviar isso automaticamente para o pai, seria ótimo."

**Consequência.** O repositório tirou do MVP o único canal de devolutiva que já funciona e que a casa pediu para automatizar. Os aparelhos existem e o WhatsApp está em uso semanal — a premissa de "não pressupor aparelho" foi escrita sem campo, e o campo a derruba. Vale reabrir como escopo de borda, com o cuidado de que o que sai para o grupo é o que já sai hoje (vídeo e recado da turma), nunca dado individual.

---

## 8. Exigir que o registro nasça na janela do encontro é desenhar o produto para a única hora…

**O que o repositório diz.** O registro só nasce na janela do encontro. A jornada da educadora em docs/JORNADAS.md encadeia #/hoje → #/chamada → #/folha → #/voz → #/confirmar como sequência do dia, e a própria versão anterior desta jornada afirmava, na fase 04: "se o registro não nasceu durante ou logo depois da atividade, aqui ele não nasce". O único caminho de entrada é o microfone ao vivo (public/app.js usa SpeechRecognition, que só transcreve fala em tempo real) — não existe rota para importar um arquivo de áudio, e #/importar é importação de planilha CSV pela coordenação.

**O que o campo mostrou.** A janela do encontro é exatamente onde ela não tem mãos livres, e a janela seguinte é onde ela responde "Não dá, não dá". A operação é intermitente por natureza: sábado corrido, domingo de descanso, e quem conduz o sábado não aparece na semana. Ao mesmo tempo, gravar com o celular já é rotina tranquila e chamada de "fácil" — o aparelho já está na mão, gravando.

**Consequência.** Exigir que o registro nasça numa janela é desenhar o produto para a única hora em que a usuária comprovadamente não pode usá-lo. A correção separa captura de registro: capturar é apertar um botão ou já ter o áudio; registrar é trabalho do sistema, a qualquer momento. Isso exige três coisas que o repositório ainda não tem — encontro que nunca fecha (registro atrasado entra na data do encontro), gravação do encontro inteiro, e importação de arquivo de áudio, que por sua vez exige transcrição local de arquivo (o SLM da pasta ai/ não faz ASR; o manifest não tem modelo de áudio). É a mudança de maior alcance apontada por esta jornada.

---


## O que mudou no produto por causa de cada achado (02/09/2026)

| Achado | O que entrou | Onde |
|---|---|---|
| 1 e 2 — a psicóloga é usuária e o filtro a recusaria | Papel `profissional`; Vivência com turma, fora da rubrica e dentro do registro de turma; filtro de perímetro com contexto (o nome do procedimento não dispara, conteúdo sobre criança continua barrado) | decisão 31 · `src/domain.js`, `src/voz.js`, `src/relato.js` |
| 3 — a regra vem do conselho | Relato do procedimento gerado dos campos fechados — não individualizado, sem nome — liberado pela profissional; template provisório até o modelo dela chegar | decisão 31 · `#/relato` |
| 4 — gravar é lido como perigoso | A tela de voz diz o que grava e o que descarta; nome falado vira código na tela e é contado | `#/voz`, `#/confirmar` |
| 5 — o clímax pode nunca disparar | Devolução por encontro: o check-in de hoje contra as últimas folhas (cala sem base) | decisão 33 · `#/hoje` |
| 6 — o destino mais rico é lateral | Parecer a profissional parceiro, por código, sob consentimento específico, revisado e liberado | decisão 32 · `#/parecer/:id` |
| 7 — a devolutiva aos pais já existe e é manual | Recado da turma gerado do registro, sem criança nomeada, link wa.me sem número; a régua de 75% da casa como parâmetro | decisão 33 · `#/recado`, `#/turma` |
| 8 — a janela do encontro é a hora em que ela não pode usar o produto | **Ainda não entrou.** Exige encontro que nunca fecha (registro atrasado com a data do encontro), gravação do encontro inteiro e importação de arquivo de áudio — esta última depende de transcrição local de arquivo, que a pasta `ai/` ainda não tem | pendente · proposto por esta jornada em 02/09/2026 |
| Planilha socioemocional (consolidado §6) | Rubrica com os seis indicadores; resumo da aba Indicadores e exportação por código | decisão 34 · `#/painel` |

## Procedência

Extraído por leitura integral das quatro transcrições em
`1 - Arquitetura/Material da Visita no Ebenezer/`. As seis falas citadas na jornada foram
**conferidas uma a uma contra os arquivos `.txt` e `.srt` originais** — todas literais, nenhuma reprovada.
Nenhum nome de criança e nenhum caso individual identificável foi reproduzido.
