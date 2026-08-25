# Plano de arquitetura — Percurso

Escrito em 22/08/2026, a partir da leitura integral de `1 - Arquitetura` (dossiê de campo, guia
de entregas, decks de discovery e da trilha de tecnologia, e os quatro slides produzidos em aula)
e do estado real de `2 - MVP Funcional` (código, banco, testes e documentação). Este documento é
o mapa: diz o que a arquitetura é hoje, o que não pode mudar nunca, e o que muda — em três
horizontes com datas e gatilhos.

**Atualizado na mesma data** com a incorporação do `percurso-v2-pack`: cinco camadas de IA, três
scores, saída para o doador e o design v2. A matriz de adoção — o que veio, o que foi adaptado com
justificativa e o que foi recusado — está em [`O-QUE-VEIO-DA-V2.md`](O-QUE-VEIO-DA-V2.md).

**Prazos que governam o plano** (guia do aluno): semana 5 em **04/09/2026** (protótipo — já
superado pelo MVP funcional) e semana 10 em **09/10/2026** (MVP funcional + handover; na trilha
de negócios, pitch deck e business case com ROI/VPL/Payback e plano de sustentação).

---

## 1. O que a arquitetura tem que respeitar

Cada restrição do bloco 5 do dossiê é verificável, não negociável, e tem uma consequência de
desenho. A coluna da direita é a resposta arquitetural adotada.

| Restrição (bloco 5) | Consequência declarada | Resposta na arquitetura |
|---|---|---|
| Voluntários concentrados no sábado | Coleta e disponibilidade têm que coincidir | Ciclos 2–3×/ano, não semanais; chamada atrasada nunca expira |
| Tempo da psicóloga é clínico | Tempo dela em sistema = tempo tirado de atendimento | A psicóloga **não é usuária**; nada no fluxo depende dela |
| Sem equipe de tecnologia | Solução que exige manutenção técnica é solução que para | Node puro + SQLite em arquivo; zero dependência, zero build, `node server.js` e pronto |
| Sem orçamento para licença recorrente | Custo mensal de plataforma é risco, não linha de custo | Custo de licença = **R$ 0** (sem SaaS, sem API paga, sem plano) |
| Acesso digital das famílias não caracterizado | Nada pode pressupor aparelho do responsável | Nenhum fluxo de autoatendimento familiar; consentimento é registrado pela equipe |
| Todo o público é menor de idade | Criança nunca é titular operacional | Nenhum fluxo depende de ação da criança; consentimento é sempre do responsável |
| Sigilo profissional da psicóloga | Existe uma classe de dado que o sistema não pode capturar | Conteúdo clínico **fora por construção**: sem tabela, sem campo; filtro de perímetro descarta antes do `INSERT` |
| **Sobreviver à semana 10** | O critério de viabilidade é a organização operar sozinha | Handover completo em `docs/`, seed determinística, backup por cópia de arquivo, testes reproduzíveis |

O bloco 6 (perímetro ético e legal) não é restrição adicional — é a espinha do modelo de dados:
a regra 3 ("todo campo declara base legal, titular, acesso e retenção") virou a tabela
`governanca_campo` com chave estrangeira obrigatória a partir de `consentimento`. Campo sem as
quatro respostas é **impossível de gravar**, não apenas proibido.

### Os dois desvios declarados do material de aula

1. **"No-code (Airtable + formulários)" → código próprio.** O slide de arquitetura previa MVP
   no-code; o dossiê exige desenvolvimento em "plataformas no-code e low-code, conforme definição
   do módulo". O Percurso desvia e assume o ônus da justificativa: no-code resolve a semana 10 e
   falha na semana 11 — Airtable no plano necessário é licença recorrente (que o bloco 5 manda
   tratar como risco), e formulário externo move dado de criança para nuvem de terceiro. O
   critério do próprio dossiê ("a organização conseguir operá-lo sozinha depois que o grupo se
   dispersar") é melhor atendido por um artefato sem conta, sem mensalidade e sem build do que
   por uma stack de assinaturas. O desvio está registrado em `docs/DECISOES-TECNICAS.md` (nº 1) e
   deve ser defendido explicitamente no pitch da semana 10.
2. **"SLM nas bordas" → determinístico com o mesmo contrato.** A doutrina do slide é o contrato:
   *"escore nunca nasce de modelo; nasce da rubrica e da fórmula"*, com SLM apenas em três bordas
   (filtro de perímetro, síntese em template contido, revisor de sobre-alegação). O MVP implementa
   as três bordas com regras auditáveis (lista de termos, template fixo com números vindos de SQL,
   verificação lexical de verbos causais) — o slot arquitetural do SLM existe e está preenchido
   por lógica determinística. Trocar por um SLM local de verdade é uma substituição de
   implementação **sem mudança de contrato** (ver Horizonte 3).

---

## 2. Arquitetura atual (as-built)

Quatro camadas em um processo, um arquivo de banco, interface servida estaticamente.

```
navegador (public/ — HTML+CSS+JS puro, hash routing, sem build)
    │   SpeechRecognition nativo: o ÁUDIO nunca sai daqui
    │   fila offline em localStorage: falha de rede não perde registro
    │  fetch JSON
    ▼
server.js        HTTP puro (node:http) — estáticos + despacho de /api/*
    ▼
src/api.js       53 rotas — sessão por perfil; RBAC educadora / coordenação /
    │            diretoria (a diretoria não abre registro individual)
    ▼
    ├── src/domain.js     núcleo: elegibilidade, perímetro, alertas, safras,
    │                     agregados com supressão n<5, síntese + revisor, fecho de ciclo
    ├── src/voz.js        catálogos fechados, agente extrator, folha do dia
    ├── src/scores.js     evasão · cobertura · exposição · supressão · pauta
    ├── src/relatorio.js  sete blocos do doador, carta, consulta agregada
    └── src/ingestao.js   ingestão retroativa com deduplicação de criança
    ▼
src/db.js        esquema (24 tabelas) + helpers — SQLite via node:sqlite
    │            migração pela assinatura do próprio DDL (decisão 14)
    ▼
data/percurso.db local ou /var/data/percurso.db no Render
                   (WAL; disco persistente; backup externo obrigatório)

src/seed.js      dados 100% sintéticos, PRNG com semente fixa (regra 1 do bloco 6)
scripts/         reset.mjs · smoke-test.mjs (246 asserções) · unit-test.mjs (63)
                 rag-test.mjs (gate do RAG) · ai-stub-test.mjs (camada de IA sem modelo)
.github/workflows/ci.yml   as quatro baterias a cada push (AI_ENABLED=false)
```

**Por que o domínio deixou de ser um arquivo só.** A revisão de 22/08 recomendava extrair por área
"na ordem em que forem mexidas, não preventivamente". A v2 mexeu em quatro áreas novas de uma vez;
elas nasceram em arquivos próprios, cada um com a doutrina que o governa escrita no topo. O núcleo
herdado continua em `domain.js`, e a camada HTTP continua só traduzindo.

Decisões estruturantes já tomadas e documentadas (não se reabre sem fato novo):

- **Criança ≠ matrícula** — a inconsistência "60+40+20=120" do bloco 3 resolvida no esquema:
  120 matrículas ativas, 106 crianças únicas, 14 em dois programas.
- **Domínio isolado da HTTP** — regra de negócio testável sem servidor (`unit-test.mjs` prova).
- **Número nasce de SQL** — a síntese do ciclo interpola números calculados; o texto é template.
- **Render é o deploy canônico em nuvem** — `render.yaml` monta disco persistente em `/var/data`,
  define `PERCURSO_DB=/var/data/percurso.db` e mantém uma única instância para o SQLite.
- **Escopo = as sete funcionalidades da inception + as quinze da v2** — F1 a F7 da Lean Inception e
  F1 a F15 do `percurso-v2-pack`, cada uma com o critério de aceite do próprio pack demonstrado por
  teste. O que o Bússola sugeria a mais foi adotado (7 itens) ou rejeitado por escrito
  (`docs/ANALISE-BUSSOLA.md`); o mesmo tratamento foi dado ao pack v2 (`docs/O-QUE-VEIO-DA-V2.md`).
- **A IA pré-preenche, a pessoa confirma** — nenhuma das cinco camadas de IA escreve no banco. A
  única gravação do fluxo de voz é o `POST /api/folha`, disparado pelo toque em "Confirmar e
  guardar". Verificado por teste ("antes de confirmar, não existe folha no banco").
- **Áudio e transcrição não são dados do sistema** — a transcrição acontece no navegador, o texto é
  usado em memória durante uma requisição e some. Ambos constam em `governanca_campo` com retenção
  declarada "não persiste em nenhum momento", justamente para que a ausência seja auditável.

---

## 3. Invariantes — o que nenhum horizonte pode mudar

Estes oito contratos valem para qualquer evolução. Mudança em qualquer um deles não é
refatoração: é outro produto, e exige decisão da coordenação do Instituto por escrito.

1. **Indicador de programa, nunca registro clínico.** Agregado e categórico para fora; trajetória
   individual só interna; conteúdo de atendimento da psicóloga jamais entra.
2. **Campo sem governança não existe.** Todo campo novo passa por `governanca_campo` (base legal,
   titular, acesso, retenção) antes da primeira gravação — a FK garante.
3. **Escore e texto nascem de regra auditável.** Modelo (SLM ou LLM) pode filtrar, redigir em
   template e revisar — nunca pontuar, nunca inventar número, nunca decidir sozinho.
4. **Aprovação humana obrigatória na saída.** Nada circula para financiador sem um humano assinar.
5. **Dado sintético até haver consentimento real.** A troca da seed por dado real é um evento de
   governança (Horizonte 2), não um deploy.
6. **A IA nunca grava.** Toda saída de agente passa por confirmação humana antes da primeira
   escrita. Cancelar não deixa rastro, porque não havia rastro a deixar.
7. **Não existe score socioemocional individual.** Classificação automatizada de estado psíquico de
   menor vulnerável não sobrevive ao Art. 11 da LGPD nem ao bloco 6. Os três scores medem vínculo em
   risco, cobertura do sistema e oferta — nunca a criança.
8. **Se a IA cair, o registro manual continua.** Toda tela que usa IA tem saída manual visível, e
   falha de rede vira fila no aparelho, nunca perda de registro.

---

## 4. Horizonte 1 — até 09/10/2026 (entrega da semana 10)

O MVP já cumpre a letra da entrega (aplicação funcional, modelo de dados, dado sintético, testes,
handover, vídeo). O que resta é fechar as duas pendências P1 da revisão arquitetural
(`docs/revisao/02-RELATORIO-REVISAO.md`) e as obrigações de processo do módulo:

| # | Item | Por quê | Critério de aceite |
|---|---|---|---|
| ~~1.1~~ | ~~**Fecho de ciclo com descarte do campo livre**~~ | **FEITO (22/08)** — o campo livre saiu do produto (decisão 15) e `fecharCiclo` apaga qualquer valor legado | Teste unitário "fecharCiclo: executa a retenção declarada e apaga texto legado" e smoke §18 |
| ~~1.2~~ | ~~**Escopo de turma no RBAC**~~ **FEITO 25/08** (decisão 22) | O acesso declarado na governança é "educador da criança + coordenação"; a v2 fechou a diretoria (decisão 16) e a v3 fechou o escopo entre educadoras | Rotas de leitura individual filtram por turma do educador logado; smoke bloco 12 cobre o acesso negado (403) |
| 1.6 | **Regravar o vídeo demonstrativo** | O vídeo em `video/` grava a v1: não mostra voz, confirmação, pauta nem relatório do doador. O handover da semana 10 exige vídeo demonstrativo do que está entregue | Vídeo cobrindo os três perfis e o fluxo de voz de ponta a ponta |
| 1.3 | **Validação com usuário real** | Exigência da semana 5 que permanece pendente e será cobrada na 10 | Registro de quem validou, roteiro usado e aprendizados, anexado em `docs/` |
| 1.4 | **Insumos de arquitetura para o business case** | O pitch da semana 10 exige custo total (incl. assinaturas) e plano de sustentação | Uma página: custo de licença R$ 0, requisito de máquina, quem opera, tempo estimado/semana — extraída deste documento |
| 1.5 | **Defesa escrita do desvio no-code** | O dossiê prescreve no-code; o desvio precisa virar argumento, não ficar implícito | Slide/parágrafo no pitch com a justificativa da seção 1 |

Nada de funcionalidade nova neste horizonte. O risco da semana 10 não é falta de feature — é
pendência de conformidade com a própria governança declarada.

---

## 5. Horizonte 2 — piloto com dado real no Instituto (pós-entrega)

Gatilho: decisão do Instituto de operar o Percurso com crianças reais. **Nenhum item deste
horizonte é opcional quando o gatilho dispara** — são as dívidas de segurança hoje conhecidas e
aceitáveis apenas porque o dado é sintético.

| Ordem | Item | Desenho proposto |
|---|---|---|
| 2.1 | Autenticação real | Senha por educador (hash + sal, `node:crypto`), sessão em cookie assinado; sem provedor externo — mantém zero dependência |
| 2.2 | Transporte cifrado | Operação em rede local do Instituto com TLS (certificado próprio) ou túnel gerenciado; se sair da rede local, HTTPS obrigatório |
| 2.3 | Trilha de auditoria | Tabela `auditoria` (quem, o quê, quando) alimentada pela camada de API; a tabela `atividade` já é o embrião |
| 2.4 | Backup automatizado | Cópia diária dos três arquivos WAL para segunda mídia + teste de restauração mensal documentado; hoje o backup é manual por cópia |
| 2.5 | Consentimento de verdade | Termo impresso por campo (a tabela `consentimento` já modela), assinado pelo responsável, arquivado fisicamente; o registro no sistema aponta para o termo |
| 2.6 | Encarregado LGPD | Nomeação formal pela coordenação; canal de requisição do titular (acesso, correção, eliminação) — a eliminação já é viável por SQL, precisa virar procedimento |
| 2.7 | Operação no Render | O Web Service canônico usa disco persistente e uma única instância; backup externo continua obrigatório. Escala horizontal exige migrar do SQLite para banco compartilhado |
| 2.8 | Troca da seed | Cadastro real substitui a seed **depois** de 2.1–2.6 prontos; `reset.mjs` passa a ser proibido em produção (guarda por variável de ambiente) |

Critério de saída do horizonte: uma educadora real registra uma chamada real, com consentimento
real arquivado, num banco que sobreviveria à perda da máquina.

---

## 6. Horizonte 3 — evoluções condicionadas (cada uma tem dono e gatilho)

Nenhuma entra por vontade — cada uma espera um fato externo, e o desenho já está preparado
para recebê-la sem quebrar as camadas.

| Módulo do plano de aula | O que é | Gatilho | Encaixe na arquitetura |
|---|---|---|---|
| **M2 — Âncora acadêmica** | Ingerir o relatório anual do parceiro educacional como segunda série longitudinal e testar correlação | Resposta da pergunta 2 do bloco 7 (dimensões e escala do relatório) pelo canal mediado | Nova tabela `serie_academica` FK em `crianca`; correlação em `domain.js`; nada muda nas camadas |
| **M4 — Demanda de cuidado** | Contador mensal de atendimentos e horas da psicóloga — contagem, nunca conteúdo | Baseline via canal mediado + aceite da psicóloga (1 min/mês declarado) | Tabela agregada por mês/programa; sem FK para `crianca` **de propósito** — individual aqui seria vazamento do perímetro |
| **B4 — SROI vivo** | Modelagem financeira de impacto a jusante | Síntese de ciclo operando com dado real por ≥2 ciclos | Consome `sintese.numeros_json`; é leitor, não escritor — pode até ser sistema separado |
| **Variante primeira infância (3–5)** | Rubrica adaptada à faixa, referenciada em ASQ | Decisão pedagógica da coordenação | `dimensao`/`ancora` já suportam conjuntos por programa; é dado novo, não código novo |
| **SDQ papel, 1×/ano** | Calibração externa gratuita para ONG (papel; eletrônica exige licença Youthinmind) | Decisão da coordenação + logística de aplicação | Fica **fora do sistema** (papel arquivado); só o agregado anual entra como número de contexto |
| **SLM local de verdade** | Substituir filtro lexical, template e revisor por modelo compacto rodando na máquina do Instituto | Filtro de termos gerar falso-negativo documentado em operação real | Mesmo contrato das três bordas (seção 1); troca de implementação em `domain.js`, zero mudança de esquema ou API |
| **Offline-first** | Registro sem rede com sincronização | Evidência de falha de rede recorrente na operação real | Rejeitado hoje (análise Bússola); se entrar, exige revisão do invariante de banco único |

### 6.1. SLM local — recomendação técnica

Pesquisa registrada para quando o gatilho da linha **SLM local de verdade** dispara (falso-negativo
documentado do filtro lexical em operação real). O contrato das três bordas não muda — invariante
3 e seção 1: o modelo filtra, redige em template e revisa; nunca pontua, nunca inventa número,
nunca decide sozinho. Os três casos de uso são:

1. **Filtro de perímetro** — classificar observação em texto livre como sensível ou segura (pt-BR,
   no momento do `INSERT`).
2. **Síntese de ciclo** — redigir texto dentro de template contido, com números vindos de SQL.
3. **Revisor de sobre-alegação** — verificar que a saída não extrapola o que os dados permitem.

Hoje as três bordas são determinísticas (lista de termos em `domain.js`, interpolação de números de
SQL, verificação lexical de verbos causais). A recomendação abaixo é o caminho pré-aprovado para
substituir a implementação **sem mudança de contrato, esquema ou API**.

#### Recomendação primária: Gemma 3 270M + fine-tuning LoRA

| Critério | Avaliação |
|---|---|
| Desenho do modelo | Google otimizou explicitamente para fine-tuning em tarefas de classificação e estruturação |
| Recursos na máquina do Instituto | ~300–550 MB RAM quantizado (Q4_K_M); roda em CPU de notebook |
| Dados de treino | Observações pedagógicas (sensível vs seguro); dataset inicial bootstrapped dos termos de `PERIMETRO` já em `domain.js` |
| Pipeline de entrega | LoRA via Unsloth/PEFT → merge do adaptador → conversão GGUF; execução **uma vez pelos autores**; o Instituto recebe arquivo estático |
| Licença e custo | Apache 2.0 / licença Gemma; **R$ 0** recorrente |
| Execução em produção | `node-llama-cpp` embutido em `server.js` |

**Trade-off deliberado:** `node-llama-cpp` seria a **primeira dependência npm** do projeto — hoje
o Percurso é zero-dependência (`node server.js` e pronto). A troca é justificada porque o SLM só
entra com gatilho documentado e o modelo roda localmente; a alternativa (manter só regras após
falso-negativo) é aceitar risco de perímetro. Ollama serve como atalho de desenvolvimento, **não**
para handover: adiciona um serviço externo ao processo que o bloco 5 manda evitar.

#### Alternativas (segunda escolha)

| Modelo | Perfil | Limitação para o Percurso |
|---|---|---|
| **Tucano 2** (0,6B–3,7B) | Português brasileiro nativo, totalmente aberto | Melhor candidato se a síntese sair do template; 3,7B lento em CPU para filtro em tempo real; 0,6B é o meio-termo |
| **BERTimbau** (110M encoder) | Melhor eficiência para classificação na literatura PROPOR 2026 | Sem geração de texto; toolchain Python/ONNX acrescenta manutenção fora do stack Node |
| **Qwen 3.5 4B / Phi-4-mini** | Líderes multilíngues genéricos em 2026 | Sem vantagem pt-BR sobre Tucano; pesados para CPU do Instituto |

#### Quando implementar

Manter o filtro determinístico até **falso-negativo documentado em operação real** — o gatilho já
nomeado na tabela do Horizonte 3. Curto prazo ante qualquer ocorrência: ampliar termos (risco
arquitetural, seção 7). Esta pesquisa registra o caminho estrutural pré-aprovado para quando o
gatilho dispara.

### 6.2. Camada de IA local implementada (v3, 25/08/2026) — e o que ela NÃO substitui

A revisão de 25/08/2026 implementou o plano da pasta de arquitetura
(`PLANO-IMPLEMENTACAO-RAG-COPILOT-SROI-LORA.md`) como **camada adicional opt-in** — coisa diferente
da linha "SLM local de verdade" da tabela acima, que segue esperando o gatilho dela:

- **As três bordas continuam determinísticas.** Filtro de perímetro, síntese em template e revisor
  de sobre-alegação não foram substituídos por modelo — o gatilho (falso-negativo documentado em
  operação real) não disparou. A **borda 2** (consistência entre observadores) ganhou implementação
  determinística: a leitura de calibração no painel da coordenação.
- **O que entrou, atrás de `AI_ENABLED` (padrão: desligada):** RAG com corpus governado
  (`src/rag/`, `docs/GOVERNANCA-FONTES-RAG.md`), copilot reflexivo Modo B (`#/copilot`,
  Qwen3 4B local via `llama.cpp` em `127.0.0.1`), Modo A opcional sobre o slot da decisão 13
  (`AI_EXTRATOR=1`, fallback lexical), SROI exploratório determinístico (`#/impacto`,
  `docs/SROI-METODOLOGIA.md`) e a infraestrutura da Fase 4 (`ai/training/`, treino não executado
  por gate). Arquitetura em camadas: `celular/navegador → Node → RAG (SQLite/FTS5) →
  llama.cpp (127.0.0.1) → GGUF local`.
- **Invariantes preservados:** o escore nunca nasce de modelo; a IA nunca grava; nome de criança
  nunca chega a modelo (perímetro antes, pseudonimização depois, limite residual declarado);
  fallback determinístico em 100% das falhas; ligar em operação real depende do go da PoC
  (`docs/POC-COPILOT.md`). Mapa completo: `ai/README.md`; plano auditado e registro da execução:
  `docs/revisao/04-PLANO-COMPLEMENTACAO-IA.md`.
- **Nota sobre a recomendação 6.1:** ela permanece válida para o caso dela (classificador de
  borda, Gemma 270M + LoRA). O copilot usa modelo maior (4B) porque o uso é outro — diálogo
  reflexivo, que a análise (`ANALISE-SLM-E-SROI.md` §2.1) mostrou exigir mais escala. A camada
  atual fala com o `llama-server` por HTTP local SEM dependência npm — o trade-off do
  `node-llama-cpp` registrado em 6.1 não foi consumido.

#### O que não usar

- **APIs em nuvem** (Sabiá, Maritaca, Gemini) — viola *dado não sai da organização*; o perímetro
  ético do bloco 6 exige processamento local.
- **Modelos ≥7B** — não rodam com latência aceitável em CPU de notebook do Instituto; o critério
  de sustentação (item 1.4) pressupõe máquina comum, não GPU.

---

## 7. Riscos arquiteturais e gatilhos de decisão

| Risco | Sinal de disparo | Resposta preparada |
|---|---|---|
| Banca do módulo contestar o desvio no-code | Feedback da semana 5/10 | Defesa da seção 1 + demonstração ao vivo do custo zero de operação |
| Instituto não ter máquina para operar | Levantamento do plano de sustentação (item 1.4) | Qualquer notebook com Node roda; alternativa: serviço gerenciado com disco persistente — entra como risco de licença no business case, nos termos do bloco 5 |
| Filtro de perímetro deixar passar conteúdo sensível | Qualquer ocorrência em operação real | Curto prazo: ampliar termos; estrutural: gatilho do SLM local (Horizonte 3) |
| Volume crescer além do SQLite confortável | >10× o volume atual com escrita concorrente | Improvável no porte do Instituto (120 matrículas); se ocorrer, o isolamento de `db.js` limita a troca a uma camada |
| Perda da única máquina de operação | — (risco permanente) | Mitigado por 2.4; até lá, backup manual documentado no README |
| Dependência de uma pessoa para operar | Handover exige operação sem os autores | `docs/` cobre instalação, reset, backup e testes; o plano de sustentação (1.4) nomeia operador e tempo |

---

## 8. Resumo executivo do plano

- **Hoje** o Percurso cumpre **F1–F7 da Lean Inception e F1–F15 do `percurso-v2-pack`** sobre uma
  arquitetura de quatro camadas com o domínio dividido por área, zero dependência, e o perímetro
  ético do bloco 6 imposto por esquema de banco — com os desvios do material de aula (no-code, SLM)
  e do pack (transcrição no navegador, extrator determinístico) assumidos e justificados por escrito.
- **Até 09/10**: o escopo de turma no RBAC das rotas herdadas foi fechado em 25/08 (decisão 22),
  e a v3 acrescentou a camada de IA opt-in (seção 6.2) com o produto intacto quando desligada.
  Continuam pendentes de gente: regravar o vídeo sobre a versão atual, validar com usuário real e
  alimentar o business case com os números de sustentação (`docs/PENDENCIAS-DE-ENTREGA.md`).
  O descarte do campo livre e a retenção declarada já foram fechados (achado A-05, decisão 15).
- **No piloto real**: as oito medidas do Horizonte 2 deixam de ser dívida aceitável e viram
  pré-requisito; a troca de dado sintético por real é evento de governança com checklist.
- **Depois**: cada evolução (M2, M4, B4, variantes, SLM) tem gatilho externo nomeado e encaixe
  já previsto nas camadas — o plano cresce por substituição e anexação, nunca por reescrita.
