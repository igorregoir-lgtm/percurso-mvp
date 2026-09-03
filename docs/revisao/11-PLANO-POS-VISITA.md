# Plano pós-visita — o que o campo mudou no Percurso

> **O que é.** O plano de ajustes do artefato depois da visita ao Instituto Ebenézer (29/08/2026),
> escrito a partir da leitura integral das quatro transcrições, do consolidado, da planilha
> socioemocional, das duas mentorias (26/08 e 28/08), do guia de entrega do Módulo 3 e do dossiê
> de campo. Segue o método que já funcionou aqui: **plano → revisão adversarial do plano →
> implementação → revisão adversarial da implementação → correção**, em ciclo.
>
> **Trilha B (Monitoramento de Impacto).** Tudo o que entra aqui responde à mesma pergunta do
> dossiê: *afirmar, com base verificável, que uma criança chegou numa condição e evoluiu para
> outra — e agregar as trajetórias numa afirmação sobre o conjunto — sem que dado clínico seja
> capturado e sem consumir o tempo de quem atende criança*.

Data: 02/09/2026. Entregas: semana 5 (04/09) — protótipo + documentação de suporte; semana 10
(09/10) — MVP funcional + handover + pitch/business case.

---

## 0. Diagnóstico — o que o campo disse, em ordem de peso

| # | Achado (com a fonte) | O que o artefato tinha | Consequência |
|---|---|---|---|
| A1 | **Registrar é A dor**, e quem a nomeia é a psicóloga: *"o maior desafio aqui é registrar o que você fez, né?"* (Grav. 82) · *"o ponto mesmo é você registrar"* (Grav. 84). Ela produz o único registro escrito que existe (relatório no padrão do CRP, por procedimento, não individualizado, sem nome) | Persona principal = pedagoga de semana; *"a psicóloga não é usuária"* em cinco documentos e no código (`no_escopo=0`, `conteudo_clinico` sem acesso) | O titular real do registro está fora do produto; o filtro de perímetro recusaria a fala dela sobre o próprio trabalho |
| A2 | A operação é **de sábado**: vivência terapêutica (2 turmas: manhã com mais meninos, tarde com mais meninas), Laboratório de Sonhos, oficinas. Duas pessoas fixas + voluntários (Grav. 81, 83, 84) | Turmas de semana como jornada principal; a vivência sem turma, sem matrícula, sem encontro | O sábado — onde a coisa acontece — não tem a tela do sábado |
| A3 | **Check-in estruturado pós-atividade** testado ao vivo e aceito: *"quantas ajudaram sem ninguém pedir? Duas. Quantas participaram do começo ao fim? Seis. Conflito? Resolveu conversando. Um não foi observado"* (Grav. 84, 10:25). Ela pediu campos para especificidades do grupo | Folha do dia com atividade, área, 6 marcadores e "pediram ajuda" | Faltam as contagens que ela validou — e que alimentam Participação, Convivência e Autocontrole da planilha |
| A4 | **Anonimização** é prática dela (iniciais: "DF") e a tese "você fala o nome, ele apaga, e só libera com o seu OK" foi a mais aplaudida (*"amei isso"*, Grav. 82; Grav. 84 13:00–14:30) | Pseudonimização existe só na camada de IA (`anonimizarTexto`); a tela de voz não mostra nada disso | A garantia mais convincente está invisível no momento em que ela importa |
| A5 | **Gravar é lido como perigoso** mesmo dentro da sala (*"é perigoso, né?"*), enquanto vídeo da atividade para o grupo dos pais é rotina (Grav. 82) | `#/voz` não diz o que grava nem o que descarta | O fluxo principal esbarra no medo por falta de uma frase |
| A6 | **Régua de presença de 75%** já é o sistema de gestão da casa: planilha com % por criança, faixa amarela de atenção, grupo de benefícios só para quem está acima, renovação condicionada (Grav. 82, 12:52–14:47) | Alerta em duas faltas seguidas; % de presença só na ficha e no agregado | O produto não absorve a régua que o Instituto já usa — competiria com ela |
| A7 | **Devolutiva aos responsáveis por WhatsApp** toda semana, manual: PDF de presença e vídeo por turma; pedido literal *"se você tivesse um mecanismo de enviar isso automaticamente para o pai, seria ótimo"* (Grav. 82, 13:52) | Responsável fora do MVP por premissa ("não pressupor aparelho") | A premissa caiu no campo; o único canal que já funciona ficou de fora |
| A8 | **Canal profissional-a-profissional**: a assistente social do projeto parceiro pergunta *"como ele tá"* e é respondida de memória; *"seria entre profissionais, que é mais rico ainda"* (Grav. 84, 03:51) | Nenhuma rota, tela ou tabela — grep retorna zero | O caso de uso que ela chamou de mais rico não tem nome no produto |
| A9 | **Devolver algo por encontro**: *"depois tem que sair daqui, preencher o relatório… não dá, não dá"* (Grav. 84); equipe intermitente, sábado corrido | O clímax só dispara ao concluir a turma inteira no ciclo | Pode nunca disparar nesta operação |
| A10 | **A planilha socioemocional** (6 indicadores 0–2, inicial × final, evolução automática, leitura ≥70/≥50%) é o instrumento que a casa tem em mãos; o método 0/1/2 (piorou/manteve/evoluiu) vem da outra ONG e é confiável para ela (Grav. 82, 47:00–50:00) | Rubrica de 5 dimensões × 4 âncoras com nomes próprios (Interação, Cooperação, Expressão, Autonomia, Persistência) | Dois vocabulários para a mesma coisa; sem Autoestima; sem exportar no formato que ela usa |
| A11 | **Restrições confirmadas**: custo zero, sem mudar a rotina, celular, modelo local, IA valida e não substitui, relatório só sai com OK humano | Já são as decisões 1, 13, 19, 21, 28 | Nada a mudar — a arquitetura foi validada pelo campo |

O que o campo **não** pediu e por isso não entra: novas atividades (*"isso não é uma coisa que eu sinta falta"*), chamada por celular no lugar da lista (recusa por legislação, Grav. 82 17:27), mais IA.

---

## 1. Princípios que não se negociam neste plano

1. **Bloco 6 continua inteiro.** Registro clínico (titular: psicóloga; individual, narrativo) fica fora. O que entra da vivência é **indicador de programa**: procedimento em lista fechada, contagens de grupo, presença. Nenhum campo de texto livre sobre criança, em nenhuma tela nova.
2. **Nada sai da organização identificado.** Recado da turma e parecer para parceiro saem sem nome; o parecer só existe sob consentimento específico e com registro de liberação.
3. **Regra 3 do bloco 6 antes de qualquer campo novo**: base legal, titular, acesso e retenção declarados em `governanca_campo` — senão o campo não entra.
4. **O modelo local não cresce** (decisão de 25/08). Tudo abaixo é determinístico; IA continua opt-in.
5. **Os invariantes dos testes seguem valendo** (132 crianças, 106 ativas únicas, 120 matrículas nos programas do dossiê, 14 em dois programas). A vivência entra como programa adicional, contado à parte — como no dossiê, cujos 120 não a incluem.
6. **Dados sintéticos, sempre.** A psicóloga da seed tem nome inventado; nenhuma criança ou caso das gravações é reproduzido.

---

## 2. Etapas

### E1 · Fundação: papel `profissional`, vivência com turma, invariantes preservados
- `educador.papel` ganha `profissional` (psicóloga/estagiária de psicologia). Escopo = turmas dela, como educadora; sem pauta de segunda (ela não pediu atividades); sem acesso à cobertura (que mede o sistema, não a pessoa).
- Programa **Vivência terapêutica** ganha 2 turmas (`Vivência · Sábado manhã`, `Vivência · Sábado tarde`) com a profissional como responsável, matrículas para crianças que **já** estão no Laboratório/Reforço (não altera crianças únicas), encontros de sábado com presença e folhas. `no_escopo` passa a significar exatamente *"entra na cobertura da rubrica por ciclo"* — a vivência fica **fora da rubrica** (tempo clínico, decisão do dossiê) e **dentro** de presença, folha e check-in.
- `inventario()` passa a contar matrículas, únicas e "em dois programas" **sobre os programas do dossiê** (`no_escopo=1`), e devolve a vivência à parte. Invariantes 120/106/14 continuam verdadeiros e testados.
- Governança: linha `conteudo_clinico` mantida (acesso: ninguém); linha nova `registro_de_vivencia` (Legítimo interesse — execução do programa; titular: organização; acesso: profissional da turma + coordenação; retenção: 5 anos; sem consentimento — é registro de turma, sem criança).
- Seed: uma profissional sintética; presença de uma criança da vivência abaixo de 75% para a régua ter o que mostrar.
- Cliente: `NAV_PROFISSIONAL`, `PAPEL.profissional = 'Psicóloga'`, rotas do Passo por papel, catálogo do Passo (`pro.` = os de educadora sem pauta), telas de cadastro aceitam o papel.

### E2 · Rubrica alinhada à planilha socioemocional + exportação
- Seis dimensões com os nomes da planilha: **Autocontrole** (ex-Cooperação e combinados), **Convivência** (ex-Interação com colegas), **Participação** (ex-Autonomia na tarefa), **Expressão emocional**, **Autoestima** (nova), **Resiliência** (ex-Persistência). Âncoras 1–4 mantidas e reescritas onde o nome mudou; o corpus do RAG (`interno-rubrica-ancoras.md`) acompanha.
- **Mapeamento declarado** 1–4 → 0–2 da planilha: 1→0 (não apresenta), 2→1, 3→1 (às vezes), 4→2 (com frequência). Vive num único lugar (`domain.js`, `NIVEL_PARA_PLANILHA`) e aparece na exportação e na documentação.
- `GET /api/exportar/planilha?ciclo_inicial=&ciclo_final=` (coordenação): CSV UTF-8 com BOM, separador `;`, no formato da aba *Avaliações* — ID (código EBZ), turma, e por indicador inicial/final/evolução (na escala 0–2), totais. **Sem nome**: o cadastro que liga código a nome fica na organização.
- `resumoPlanilha(cicloA, cicloB)`: a aba *Indicadores* em código — média inicial, média final, crianças avaliadas, % que melhoraram e a **leitura** com os limiares da planilha (≥70% resultado forte, ≥50% evolução moderada, senão atenção). Vai para `#/painel` e para a síntese.
- A trajetória individual (interna) passa a ler evolução como **piorou/manteve/evoluiu** (0/1/2), o método da outra ONG.

### E3 · Registro de vivência: check-in estruturado + relato no padrão do conselho
- `folha` ganha o **check-in de grupo** (contagens, nunca quem): `ajudaram_sem_pedir`, `participaram_inteiro`, `conflitos`, `conflitos_resolvidos_conversando`, `nao_observados`, com CHECK de faixa e `resolvidos ≤ conflitos`. Vale para toda turma; é obrigatório só na vivência.
- Catálogos fechados novos para a vivência: **procedimento** (roda de emoções, jogo da rede de apoio/cidadania, regulação e sistema nervoso, história/metáfora, oficina manual, jogo cooperativo, outro) e **objetivo** (regulação emocional, rede de apoio e cidadania, autoestima, resiliência, convivência, expressão). O extrator lexical aprende os termos e os padrões de contagem ("duas ajudaram sem ninguém pedir", "seis participaram do começo ao fim", "um conflito, resolveram conversando").
- **Relato do procedimento** (padrão do conselho): texto determinístico gerado dos campos fechados — data, turma (sem nome de criança), procedimento, objetivo, o que o grupo apresentou (marcadores e contagens), encaminhamento humano se houve exclusão de perímetro. Nasce **rascunho**; `POST /api/folha/liberar` grava `relato_liberado_por/em`. Copiar e imprimir. O modelo real de relatório que ela prometeu enviar continua pendente — o template é declarado como provisório.
- **Filtro de perímetro com contexto**: na turma da vivência, os nomes do *procedimento* ("vivência terapêutica", "terapia em grupo", "psicoeducação", "trabalho terapêutico") deixam de disparar a categoria de saúde mental; tudo o que é sobre **criança** (diagnóstico, laudo, abuso, estado interno de criança nomeada) continua barrado. A lista de neutralização é fechada e testada.
- Telas: `#/folha` mostra o bloco do check-in e, na vivência, os catálogos de procedimento/objetivo; `#/confirmar` confirma os campos novos; `#/relato` (profissional e coordenação) mostra o texto, o botão de liberar e o aviso de que o texto não tem nome por construção.

### E4 · A tela de voz diz o que faz — e mostra o nome virando código
- Em `#/voz`, antes do toque: *"Sua voz sobre a turma. Nenhuma criança é gravada. O áudio não sai deste aparelho e é descartado na transcrição."*
- A transcrição exibida passa por `anonimizarTexto` com os nomes da turma: a pessoa vê *"Criança A"* no lugar do nome e a linha *"2 nomes substituídos por código — o nome nunca é gravado"*. O servidor continua recebendo a transcrição só em memória (o filtro de perímetro precisa do nome para a 5ª categoria); a resposta devolve `nomes_substituidos`.

### E5 · Régua de presença (75%) e recado da turma
- `PARAMS.PRESENCA_MINIMA_PCT = 75` e `PRESENCA_ATENCAO_PCT = 80`. `presencaPorCrianca(turmaId, periodo)`: % por criança no período (semestre corrente por padrão) e a faixa: `abaixo` (<75), `atencao` (75–79), `ok` (≥80).
- `GET /api/turma/presenca` (educadora/profissional na própria turma; coordenação em qualquer): lista com faixa, e o resumo por faixa. Na tela `#/turma`, bloco *"Régua de presença"*; no `#/painel`, contagem por faixa e por programa. Nunca sai para fora identificado.
- **Recado da turma**: `GET /api/recado?turma_id&data` gera texto curto **da turma** a partir da chamada e da folha — atividade, objetivo, presença em número (*"12 de 14 presentes"*), marcadores, e o resumo mensal de presença da turma. Sem nome, sem criança. Botões *Copiar* e *Abrir no WhatsApp* (`wa.me/?text=`, sem número). Governança: `recado_da_turma` (Legítimo interesse — comunicação com responsáveis; acesso: responsáveis da turma; retenção: não persiste — gerado sob demanda).
- O aviso de que o dado individual de presença **não** entra no recado fica na tela — a régua é para dentro.

### E6 · Devolução por encontro
- Ao confirmar a folha, a resposta traz `devolucao`: comparação das contagens e marcadores de hoje com as últimas quatro folhas da turma (*"6 de 8 participaram do começo ao fim — acima da média das últimas vivências"*), determinística, sem número que não venha do banco. Aparece em `#/confirmar` e no `#/hoje` do dia.

### E7 · Parecer profissional-a-profissional
- Tabela `parecer` (crianca_id, destinatario, texto, gerado_por/em, status `rascunho|liberado`, liberado_por/em). Governança: `parecer_profissional` (Consentimento específico do responsável — Art. 14; titular: organização; acesso: profissional parceiro nomeado pela coordenação; retenção: o registro da liberação é permanente, o texto é do parecer). Consentimento nasce **pendente** para toda criança, como a rubrica.
- `POST /api/parecer/gerar` (coordenação e profissional da turma): recusa sem consentimento ativo (403 com o motivo). Texto determinístico: **código** da criança (nunca nome), período, presença %, faixa da régua, evolução por indicador em piorou/manteve/evoluiu entre os dois últimos ciclos, alerta aberto (só o fato), programas. Passa pelo revisor de sobre-alegação. `POST /api/parecer/liberar` registra quem liberou. `GET /api/parecer?crianca_id` lista o histórico.
- Tela `#/parecer/:id`, a partir da ficha da criança. A diretoria não vê (decisão 16).

### E8 · Documentação, personas e o registro honesto da validação
- `DECISOES-TECNICAS.md`: decisões **31** (psicóloga como usuária do indicador de programa; vivência fora da rubrica, dentro do registro de turma), **32** (parecer sob consentimento e liberação), **33** (régua 75% e recado — o produto absorve a gestão que existe), **34** (rubrica alinhada à planilha; mapeamento 1–4 → 0–2 declarado).
- `MODELO-DE-DADOS.md`, `ARQUITETURA.md` (rotas), `README.md` (perfis, "faz/não faz"), `TESTES.md` e `EVIDENCIAS-DE-TESTE.txt` (contagens novas), `HANDOFF.md` (sessão de 02/09), `PENDENCIAS-DE-ENTREGA.md` (modelo do CRP, aval das 6 rubricas, notebooks doados, telas novas no Figma).
- `JORNADAS.md`: jornada da psicóloga (atual e futura, com custo). `ARTEFATO-SEMANA-5.md` §1: a psicóloga como usuária co-principal do registro, a pedagoga permanece; §5: **o que aconteceu em 29/08** — demonstração do protótipo a uma usuária real e ao líder, check-in testado ao vivo, reações literais, e o que **não** foi feito (tarefas cronometradas, termo, formulário) — validação **parcial**, declarada como tal. `VALIDACAO-USUARIO.md` §6 idem. `LEAN-INCEPTION.md` e `MVP-CANVAS.md` ganham a nota histórica de que a premissa "psicóloga não é usuária" caiu no campo.
- `docs/jornada-usuario/CAMPO-versus-REPOSITORIO.md`: coluna "o que mudou" por achado, apontando a etapa.

### E9 · Testes, grafo e fecho
- Unitários: dimensões e mapeamento; validação do check-in; extrator com contagens; perímetro com contexto (neutraliza procedimento, barra criança); régua por faixa; recado sem nome; parecer sem consentimento → recusa, com consentimento → sem nome e aprovado pelo revisor; inventário com invariantes.
- Smoke: profissional entra, vê a vivência no `#/hoje`, faz chamada, extrai fala com contagens, confirma folha com check-in, libera relato, recado sem nome, régua, parecer (403 para educadora de outra turma e para diretoria; 403 sem consentimento; 200 com), exportação CSV com cabeçalho da planilha.
- Grafo: `graphify --update` na raiz do produto (inclui os documentos da visita e o código novo), `graphify-out/` no `.gitignore` do MVP (o corpus da visita tem nomes), e três consultas de verificação: as decisões novas estão ligadas ao código; nenhum documento novo ficou órfão; o caminho psicóloga → registro de vivência → planilha existe.
- Commits por etapa, com o trailer `Agent: Claude Code`, sem push.

---

## 3. O que fica explicitamente fora

- Chamada por voz/celular no lugar da lista — recusada no campo por legislação.
- Envio automático pelo WhatsApp (API): o recado é copiar/compartilhar; integração exige conta e custo, contra a restrição de licença.
- Rubrica preenchida pela psicóloga: tempo clínico; a vivência entra com registro de turma.
- Registro feito pelas famílias em casa (Grav. 84): validado como direção, mas exige canal, consentimento e desenho próprios — vai para pendências como hipótese.
- Qualquer mudança no porte do modelo local.
- Telas novas no protótipo Figma: pendência humana registrada, não código.

---

## 4. Revisão adversarial do plano (feita antes de implementar)

Critérios: o guia de entrega (semana 5 e 10), o dossiê (blocos 5, 6 e 7), as duas mentorias e o propósito do artefato. Cada achado abaixo mudou o plano acima.

| # | Achado | Efeito no plano |
|---|---|---|
| R1 | **Semana 5 vence em 04/09** — a documentação de suporte (persona, jornadas, validação) é o que o avaliador lê primeiro. O plano deixava E8 por último. | E8 sobe: personas, jornada da psicóloga e §5 honesto entram **logo depois de E1**, e o resto da documentação fecha no fim. |
| R2 | O guia da semana 10 exige *"MVP que executa o fluxo principal"* — não um produto com 40 telas. Sete etapas de código podem diluir o fluxo principal. | Cada etapa é aditiva e testada isoladamente; o fluxo principal (chamada → folha por voz → observação → síntese → relatório) não muda de forma. E7 (parecer) é a última de código e só entra se E1–E6 estiverem verdes. |
| R3 | O dossiê (bloco 5): *"tempo da psicóloga em sistema é tempo retirado de atendimento — explicitar e quantificar"*. O plano dava a ela mais telas sem dizer o custo. | O registro de vivência é medido como a folha: `duracao_segundos` e taxa de correção do extrator valem para ela; a jornada da psicóloga declara o custo (~40 s de fala + confirmação) e a decisão 31 registra a troca. |
| R4 | Mentoria de negócios (28/08): *"cautela ao cruzar dados; não ultrapassar a fronteira do dado sensível"*. O parecer cruza presença + rubrica + alerta **da mesma criança** e sai para fora. | O parecer é o único item que sai identificável por código: fica atrás de **consentimento específico + liberação registrada + revisor**, sem texto livre, sem alerta detalhado (só o fato de haver acompanhamento), sem nada da vivência. E é a última etapa, cortável. |
| R5 | A régua de 75% pode virar **punição** na tela da educadora (a criança "vermelha"). O produto tem a doutrina "conta quantos, nunca quem" para o Passo e "nunca ranking" para calibração. | A régua na tela da educadora mostra a **criança com a faixa e o número** (ela precisa saber para conversar com a família — é a prática da casa), mas a linguagem é de protocolo ("abaixo da régua do Instituto"), sem cor de erro, e o Passo continua contando quantos. A diretoria não vê régua individual. |
| R6 | Renomear dimensões quebra a **continuidade** de quem já leu os documentos e o corpus do RAG; e as âncoras foram escritas para os nomes antigos. | As âncoras são reescritas para o nome novo (não só o rótulo); o corpus do RAG é regenerado; `docs/ARQUITETURA.md` e o relatório do doador citam os nomes novos; o `rag-test` protege as citações. A decisão 34 registra a correspondência antiga → nova. |
| R7 | O mapeamento 1–4 → 0–2 tem uma escolha arbitrária (2 e 3 caem no mesmo 1). Um avaliador pode contestar. | O mapeamento é declarado como **provisório até o aval da psicóloga**, fica em um único lugar, e a exportação carrega a legenda. O agregado interno continua na escala 1–4. |
| R8 | "Recado da turma" pode ser lido como o produto pressupondo aparelho da família — a premissa do bloco 5. | O recado só **substitui o que já sai hoje** (o líder já manda por WhatsApp toda semana — fato de campo); o produto não fala com a família, quem envia é a pessoa. Documentado como escopo de borda reaberto **por evidência**. |
| R9 | O filtro de perímetro com contexto é o ponto mais perigoso do plano: uma neutralização mal escrita abre buraco na proteção. | A neutralização é uma **lista fechada de sintagmas do procedimento**, aplicada só quando a turma é da vivência; os testes exercitam pares (frase de procedimento passa / frase sobre criança com a mesma palavra é barrada). |
| R10 | Etapa E6 (devolução por encontro) compara com "as últimas quatro folhas" — com poucas folhas, a comparação mente. | Abaixo de 3 folhas anteriores a devolução diz só o número de hoje, sem comparação — "falhar em branco" (06-AGENTES-IA). |
| R11 | Nada no plano toca o **Pitch/Business Case** (semana 10). | Fora de escopo de código; `PENDENCIAS-DE-ENTREGA.md` ganha o que a visita entregou de insumo: 6 anos de operação, remuneração até dezembro, notebooks doados, a régua de 75% como política existente. |

**Ordem final de execução:** E1 → E8a (personas, jornada, §5) → E2 → E3 → E4 → E5 → E6 → E7 → E8b (restante da documentação) → E9. Depois: revisão adversarial da implementação (`12-REVISAO-POS-VISITA.md`), plano de correção, correção — em ciclo até não haver achado bloqueante.
