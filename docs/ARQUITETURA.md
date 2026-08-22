# Plano de arquitetura — Percurso

Escrito em 22/08/2026, a partir da leitura integral de `1 - Arquitetura` (dossiê de campo, guia
de entregas, decks de discovery e da trilha de tecnologia, e os quatro slides produzidos em aula)
e do estado real de `2 - MVP Funcional` (código, banco, testes e documentação). Este documento é
o mapa: diz o que a arquitetura é hoje, o que não pode mudar nunca, e o que muda — em três
horizontes com datas e gatilhos.

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
    │  fetch JSON
    ▼
server.js        HTTP puro (node:http) — estáticos + despacho de /api/*
    ▼
src/api.js       25 rotas — sessão por perfil, RBAC educadora/coordenação
    ▼
src/domain.js    TODA a regra de negócio — elegibilidade, perímetro,
    │            alertas, agregados com supressão n<5, síntese + revisor
    ▼
src/db.js        esquema (17 tabelas) + helpers — SQLite via node:sqlite
    ▼
data/percurso.db (WAL; backup = copiar o arquivo)

src/seed.js      dados 100% sintéticos, PRNG com semente fixa (regra 1 do bloco 6)
scripts/         reset.mjs · smoke-test.mjs (86 asserções) · unit-test.mjs (20)
.github/ci.yml   as duas baterias a cada push
```

Decisões estruturantes já tomadas e documentadas (não se reabre sem fato novo):

- **Criança ≠ matrícula** — a inconsistência "60+40+20=120" do bloco 3 resolvida no esquema:
  120 matrículas ativas, 106 crianças únicas, 14 em dois programas.
- **Domínio isolado da HTTP** — regra de negócio testável sem servidor (`unit-test.mjs` prova).
- **Número nasce de SQL** — a síntese do ciclo interpola números calculados; o texto é template.
- **Deploy Vercel é demo, não operação** — banco em `/tmp`, efêmero por instância, declarado.
- **Escopo = as sete funcionalidades da inception** — F1 a F7, nada a mais; o que o Bússola
  sugeria a mais foi adotado (7 itens) ou rejeitado por escrito (`docs/ANALISE-BUSSOLA.md`).

---

## 3. Invariantes — o que nenhum horizonte pode mudar

Estes cinco contratos valem para qualquer evolução. Mudança em qualquer um deles não é
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

---

## 4. Horizonte 1 — até 09/10/2026 (entrega da semana 10)

O MVP já cumpre a letra da entrega (aplicação funcional, modelo de dados, dado sintético, testes,
handover, vídeo). O que resta é fechar as duas pendências P1 da revisão arquitetural
(`docs/revisao/02-RELATORIO-REVISAO.md`) e as obrigações de processo do módulo:

| # | Item | Por quê | Critério de aceite |
|---|---|---|---|
| 1.1 | **Fecho de ciclo com descarte do campo livre** | A governança declara retenção "descarte ao fim do ciclo" para o campo livre — hoje não há mecanismo que execute o descarte | Ação "encerrar ciclo" da coordenação apaga `nota_livre` das observações do ciclo e marca o ciclo como `fechado`; teste automatizado prova que o texto sumiu do banco |
| 1.2 | **Escopo de turma no RBAC** | Educadora hoje enxerga crianças além das suas turmas; o acesso declarado na governança é "educador da criança + coordenação" | Rotas de leitura individual filtram por turma do educador logado; smoke test cobre o acesso negado |
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
| 2.7 | Migração da demo | Vercel permanece como vitrine sintética; a operação real roda na máquina do Instituto (`node server.js`) — nunca as duas com o mesmo banco |
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

- **Hoje** o Percurso cumpre F1–F7 sobre uma arquitetura de quatro camadas, zero dependência,
  com o perímetro ético do bloco 6 imposto por esquema de banco — e dois desvios do material de
  aula (no-code, SLM) assumidos e justificados por escrito.
- **Até 09/10**: nenhuma feature nova; fechar descarte do campo livre e escopo de turma no RBAC,
  validar com usuário real e alimentar o business case com os números de sustentação.
- **No piloto real**: as oito medidas do Horizonte 2 deixam de ser dívida aceitável e viram
  pré-requisito; a troca de dado sintético por real é evento de governança com checklist.
- **Depois**: cada evolução (M2, M4, B4, variantes, SLM) tem gatilho externo nomeado e encaixe
  já previsto nas camadas — o plano cresce por substituição e anexação, nunca por reescrita.
