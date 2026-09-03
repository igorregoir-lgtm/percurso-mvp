# Artefato de Tecnologia — semana 5

> **O que é este documento.** A documentação de suporte que o *Guia do Aluno — Entrega de
> Artefatos, Módulo 3* exige junto do protótipo navegável: persona (usuário principal), jornadas
> atual e futura, User Stories (3 a 5), fluxo de navegação e registro da validação. Ele **reúne e
> rastreia** o que já existe no repositório — não decide nada novo, e não repete o que já está
> escrito em outro arquivo com mais profundidade.
>
> **Entrega:** 04/09/2026 · **Desafio B** (Monitoramento de Impacto) · Instituto Ebenézer.

**Estado dos cinco itens exigidos:**

| # | Item do guia | Estado | Onde está |
|---|---|---|---|
| 0 | Protótipo navegável, fidelidade média/alta, **em Figma** | ✅ | https://www.figma.com/design/HBBd4GyVRjd7C3WgJ4jnpL |
| 1 | Persona (usuário principal) | ✅ | §1 deste documento |
| 2 | Jornadas do usuário (atual e futura) | ✅ | §2 · íntegra em [`JORNADAS.md`](JORNADAS.md) |
| 3 | User Stories (3 a 5) | ✅ | §3 — as cinco, com a tela e o teste que prova cada uma |
| 4 | Fluxo de navegação | ✅ | §4 |
| 5 | Registro da validação com usuário real | ◐ **parcial** | §5 — demonstração com usuária real em 29/08/2026, registrada; sessão de teste com tarefas cronometradas ainda pendente |

O item 5 é o único que não está inteiro, e ele **não se fabrica**: o §5 registra o que aconteceu
(demonstração, reações literais, o que mudou) e o que não aconteceu (o protocolo de tarefas).
Ver também [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) §6.

**O protótipo, em Figma:** https://www.figma.com/design/HBBd4GyVRjd7C3WgJ4jnpL

Nove telas de 375×812 numa fileira, **dois papéis com tela** (educadora e coordenação — a diretoria
aparece como perfil na entrada e em nenhuma tela própria), ponto de partida em `#/entrar` e **12 ligações de
clique** — dá play e percorre. As cores não são valores soltos: são a coleção de variáveis
`Percurso — cores`, nos modos **Claro** e **Escuro**, com os mesmos tokens declarados em
`public/styles.css` do MVP. Com isso o item CFL-03 (protótipo entregue em HTML em vez de Figma)
**deixa de ser uma divergência a declarar** — ver [`PENDENCIAS-DE-ENTREGA.md`](PENDENCIAS-DE-ENTREGA.md) §6.
O protótipo HTML em `prototipo-figma/` continua no repositório como registro da etapa anterior.

---

## 1. Persona — o usuário principal

**Maria Silvia**, 35 anos, pedagoga do reforço escolar (7–11 anos), de segunda a sexta.

A frase que a define, tirada da dinâmica de personas feita em aula:

> *"Não consigo transformar em dados os resultados do meu trabalho."*

| | |
|---|---|
| **Dores declaradas** | registrar sem tirar atenção das crianças; ter mais tempo para planejar; agir sempre sob demanda, sem controle |
| **Necessidade decisiva** | **não expor as crianças** — exigência da própria usuária, não borda de conformidade |
| **Contexto de uso** | celular, na sala, entre atividades. Sem estação de trabalho e sem tempo contínuo |
| **Restrição do quadro** | o corpo de voluntários se concentra no sábado; Maria é da equipe de semana. O produto não exige frequência diária — ciclos de observação são 2–3×/ano e chamada atrasada nunca expira |

**As duas personas de apoio**, que aparecem no protótipo porque o Desafio B tem três leitores
distintos do mesmo dado: **Rita Amaral** (coordenação — precisa demonstrar resultado sem expor
criança) e **Solange Ribeiro** (diretoria — presta contas a quem financia e, por decisão de
desenho, **não abre registro individual**).

**A persona que o campo acrescentou — a psicóloga (Carolina Duarte, nome sintético).** Até a
visita de 29/08/2026 este documento dizia que *"a psicóloga não é usuária: o tempo dela é
clínico"*. A visita derrubou isso: é ela quem nomeia o registro como a dor central (*"o maior
desafio aqui é registrar o que você fez, né?"*), quem escreve o único registro que existe (o
relatório do conselho profissional, por procedimento, sem nome) e para quem foi preciso improvisar
um perfil na demonstração, porque o app assumia professora. Ela entra pelo **indicador de
programa** — presença, registro de vivência em lista fechada e check-in de grupo — e o conteúdo
clínico continua fora por construção. A distinção do bloco 6 (registro clínico ≠ indicador de
programa) é o que permite as duas coisas ao mesmo tempo. Jornada completa em
[`JORNADAS.md`](JORNADAS.md) §4; o que o campo contradisse, linha a linha, em
[`jornada-usuario/CAMPO-versus-REPOSITORIO.md`](jornada-usuario/CAMPO-versus-REPOSITORIO.md).

A pedagoga de semana continua persona: o Reforço escolar roda de segunda a sexta. Mas o campo
mostrou que **a operação é de sábado** — vivência, Laboratório e oficinas — e o produto passou a
ter a tela do sábado.

Origem das personas: `1 - Arquitetura/Material Produzido em Aula/mvp-percurso-persona.html` e
`visao-produto-ebenezer.html`; a da psicóloga, das quatro gravações da visita
(`1 - Arquitetura/Material da Visita no Ebenezer/`).

---

## 2. Jornadas — atual e futura

Íntegra das três personas, com ganhos **e custos**, em [`JORNADAS.md`](JORNADAS.md). O resumo do
contraste, para a persona principal:

| | Hoje (papel, planilha, memória) | Com o Percurso |
|---|---|---|
| **Observar** | o que viu fica na cabeça | rubrica de 6 dimensões × 4 âncoras (os indicadores da planilha do Instituto), ~3 min por criança |
| **Registrar presença** | papel ou planilha — fica quem veio, e só | um toque por criança; sem rede, entra na fila e sobe sozinho |
| **Contar como foi o dia** | conta para a colega no corredor — a informação morre ali | fala ~40 s sobre a **turma**; o áudio é descartado no aparelho |
| **Perceber uma ausência** | percebe quando percebe, e age sob demanda | alerta em duas faltas seguidas, na tela de abertura |
| **Provar evolução** | responde de memória, sem data e sem comparação | médias por dimensão, ciclo a ciclo, na tela da turma |
| **Receber algo de volta** | nunca recebe | pauta de segunda: três linhas acionáveis e uma sugestão |

**O custo, declarado.** Jornada futura sem custo é propaganda: **registrar é trabalho novo**. O
produto reduz o custo (voz, um toque, rascunho que persiste) mas não o zera — e a única prova de
que ele cabe na rotina real é a validação do §5, que ainda não aconteceu.

---

## 3. User Stories — as cinco, com a prova de cada uma

O guia pede que o protótipo **demonstre todas as User Stories mapeadas**. As cinco vêm da Lean
Inception ([`LEAN-INCEPTION.md`](LEAN-INCEPTION.md) §5). A coluna da direita é o que torna a
demonstração verificável e não declaratória: cada história tem teste automatizado no repositório.

| # | História | Tela que demonstra | Prova automatizada |
|---|---|---|---|
| **US-1** | Como **pedagoga**, quero registrar minha observação de cada criança em minutos, com âncoras claras, para manter processo consistente sem tirar atenção das crianças. *(F3)* | `#/ciclo` → `#/observacao/:id` | smoke §4 (12 asserções) e §5b (cronômetro de registro, meta de 120 s) |
| **US-2** | Como **pedagoga**, quero ver a evolução entre ciclos, para planejar pelo dado e não só pela demanda do dia. *(F5)* | `#/turma` | smoke §5 — "dois ciclos comparáveis", leitura de forças e atenção |
| **US-3** | Como **pedagoga**, quero ser avisada de ausências acumuladas, para agir antes da evasão. *(F6)* | `#/hoje`, `#/alertas` | smoke §6 — alerta em duas faltas, tratativa registrada, permanência por safra |
| **US-4** | Como **coordenação**, quero painel agregado e síntese de ciclo, para demonstrar resultado sem expor nenhuma criança. *(F5, F7)* | `#/painel` → `#/sintese` | smoke §7 (revisor, ressalva, números conferidos contra o SQL) e §5b (**nenhuma média com n < 5**) |
| **US-5** | Como **coordenação**, quero campos sem consentimento bloqueados por padrão, para que a proteção seja regra do sistema. *(F1)* | `#/consentimentos` | smoke §8 — ativação sem responsável recusada, **revogação volta a bloquear**; §3 — bloqueio aparece na agenda com o motivo |
| **US-6** | Como **psicóloga da Vivência**, quero contar em 40 segundos como foi o encontro, para que o relatório no padrão do conselho exista sem eu ter que escrever à noite. *(decisão 31)* | `#/voz` → `#/confirmar` → `#/relato` | smoke §24 (a Vivência fora da rubrica) e §26 (check-in de grupo gravado, relato gerado dos campos fechados, liberação registrada e devolução por encontro); unit — relato sem nome por construção |

**A leitura que interessa ao avaliador:** as seis histórias saem de três papéis e cobrem o ciclo
inteiro do Desafio B — registrar (US-1, US-6), acompanhar (US-2, US-3), demonstrar (US-4) e proteger
(US-5). A proteção não é um requisito à parte: é uma história de usuário, pedida pela coordenação.

**A US-6 tem procedência diferente das outras cinco, e isso importa.** As cinco primeiras saíram da
Lean Inception, com a pedagoga como persona. A sexta saiu da **visita de campo de 29/08/2026**, que
mostrou que quem escreve o relatório e nomeia o registro como a dor é a psicóloga — não a pedagoga.
É a única história do artefato que foi levantada com a usuária na frente, e é a que a sessão de
[`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) foi refeita para medir.

---

## 4. Fluxo de navegação

Três entradas, uma por papel, a partir da mesma tela de escolha de perfil (`#/entrar`). O produto
não tem menu único: **cada papel vê só o que o papel opera** — o que a tela mostra e o que o
servidor autoriza são a mesma regra, verificada por teste (smoke §0, §19).

```
                              #/entrar
                     escolhe quem está registrando
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   EDUCADORA               COORDENAÇÃO              DIRETORIA
   Maria Silvia            Rita Amaral            Solange Ribeiro

   #/hoje                  #/painel                #/relatorio
    ├ retomada sem culpa    ├ crianças × matrículas  ├ sete blocos, supressão n<5
    ├ alerta de ausência    ├ cobertura do ciclo     ├ revisor de sobre-alegação
    └ o que falta hoje      └ alertas abertos        └ publicar (só a diretoria)
        │                       │                       │
        ▼                       ▼                       ▼
   #/chamada               #/scores                #/impacto
   um toque por criança    evasão · cobertura ·    SROI exploratório:
   fila offline se cair    exposição               3 cenários e faixa
        │                       │                       │
        ▼                       ▼                       ▼
   #/voz → #/confirmar     #/safras                #/consulta
   fala ~40 s da TURMA     permanência e evasão    pergunta em linguagem
   nada grava sem o toque  por safra de entrada    natural sobre o agregado
        │                       │
        ▼                       ▼
   #/ciclo                 #/sintese
   quem falta observar,    template + revisor +
   quem está bloqueada     aprovação humana
   e por quê                   │
        │                       ▼
        ▼                  #/consentimentos
   #/observacao/:id        pendências; ativar
   6 dimensões × 4 âncoras aqui DESBLOQUEIA a
        │                  observação lá
        ▼                       │
   #/turma  ◄────────────── #/pessoas · #/arquivo
   médias ciclo a ciclo     cadastro e saída de
        │                   equipe e crianças
        ▼
   #/pauta
   três linhas e uma sugestão — a devolução de segunda
```

**Telas comuns aos dois primeiros papéis:** `#/criancas` e `#/crianca/:id` (ficha viva, com escopo
de turma para a educadora) e `#/alertas`. **Presente em todas:** o **Passo**, assistente de
navegação que responde só sobre o produto e oferece "Ir para…" — nunca grava nada.

**Os dois cruzamentos que contam a tese do produto**, e que a demonstração deve mostrar nesta
ordem:

1. `#/chamada` → `#/alertas`: a presença registrada em um toque **gera sozinha** o alerta de
   ausência. O trabalho de sempre passa a produzir sinal.
2. `#/consentimentos` → `#/observacao/:id`: ativar o consentimento na tela da coordenação
   **desbloqueia** a observação na tela da educadora. A proteção é estado do sistema, não aviso.

---

## 5. Registro da validação com usuário real

> ### Validação **parcial**: uma demonstração com usuária real aconteceu em 29/08/2026; a sessão de teste com tarefas cronometradas, não.

O guia exige que o protótipo tenha *"sido testado e validado com pelo menos um usuário real"* e que
a documentação traga *"quem validou, como e principais aprendizados"*. O que está abaixo é **o que
aconteceu**, sem completar nada por inferência: o protótipo foi mostrado a uma usuária real e a
reação dela foi registrada literalmente; o protocolo de seis tarefas cronometradas de
[`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) **não foi aplicado** e continua pendente.

| Campo | |
|---|---|
| **Quem validou** | A **psicóloga** do Instituto (voluntária há 6 anos, conduz a vivência terapêutica de sábado, autora do único registro escrito da operação) e o **líder** do Instituto (quem faz a chamada, o vídeo e a devolutiva aos responsáveis). Nomeados pelo papel, por regra. |
| **Quando e onde** | Sábado, 29/08/2026, ~11h às 13h, na sede (garagem adaptada, Jardim Ângela), durante e depois da vivência da manhã. |
| **Como** | (1) Cinco minutos de observação silenciosa da atividade (jogo de cartas sobre a rede de apoio da comunidade). (2) Conversa com o líder sobre o sistema de presença (planilha com % por criança, régua de 75%, grupos de WhatsApp) e sobre as teses do produto. (3) **Demonstração guiada no celular do autor**, com a psicóloga ao lado: Hoje → "contar como foi" → o **check-in estruturado**, respondido por ela ao vivo (*"Quantas ajudaram sem ninguém pedir? — Duas. Quantas participaram do começo ao fim? — Seis. Conflito? — Resolveu conversando. Um não foi observado."*) → assistente. (4) Perguntas abertas sobre a dor, o registro e a rede. Quatro gravações de áudio (97 min), transcritas e conferidas contra os `.srt`. **O que não foi feito:** o aparelho não ficou na mão dela; nenhuma tarefa foi cronometrada; não houve termo assinado nem formulário; a camada de IA ficou desligada. |
| **Principais aprendizados** | A persona principal estava errada: quem tem a dor do registro é a psicóloga, não a pedagoga de semana (*"eu não sabia que você era psicóloga"*, na fita). A dor é registrar, não ter atividades (*"o ponto mesmo é você registrar"*). O check-in em contagens foi aceito e ela pediu campos para especificidades do grupo. A anonimização com liberação por OK foi o item mais aplaudido (*"amei isso"*). Gravar é lido como perigoso mesmo dentro da sala — a tela de voz precisa dizer o que grava. A régua de 75% e a devolutiva semanal por WhatsApp já existem e são manuais. O destino mais rico do registro é lateral: a assistente social do projeto parceiro. A chamada por voz foi **recusada** por legislação. O relatório dela segue o padrão do conselho profissional — não individualizado, sem nome. Os sete pontos em que o campo contradisse o repositório: [`jornada-usuario/CAMPO-versus-REPOSITORIO.md`](jornada-usuario/CAMPO-versus-REPOSITORIO.md). |
| **O que mudou no produto** | O papel `profissional` e a Vivência com turma (decisão 31); rubrica alinhada aos seis indicadores da planilha do Instituto, com exportação (decisão 34); registro de vivência com check-in de grupo e relato no padrão do conselho, com liberação; a tela de voz dizendo o que grava e mostrando o nome virar código; régua de presença de 75% e recado da turma (decisão 33); devolução por encontro; parecer profissional-a-profissional sob consentimento (decisão 32). Plano e revisão: [`revisao/11-PLANO-POS-VISITA.md`](revisao/11-PLANO-POS-VISITA.md). |

**O que continua pendente, e é humano:** a sessão de teste com o protocolo de
[`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md) (aparelho na mão da usuária, seis tarefas
cronometradas, termo, formulário, Protocolo do Lapso) — agora com **a psicóloga como uma das
participantes**, além de uma educadora; e o retorno dela sobre o protótipo, que ficou combinado
(*"ó, eu testei, isso aqui eu precisaria colocar mais coisas"*).

---

## Rastreabilidade

Este documento consolida, sem duplicar: [`JORNADAS.md`](JORNADAS.md) (jornadas completas das três
personas), [`LEAN-INCEPTION.md`](LEAN-INCEPTION.md) (origem das User Stories e do escopo),
[`MVP-CANVAS.md`](MVP-CANVAS.md) (proposta e hipóteses), [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md)
(protocolo da sessão), [`EVIDENCIAS-DE-TESTE.txt`](EVIDENCIAS-DE-TESTE.txt) (saída das 294
asserções citadas na §3) e [`PENDENCIAS-DE-ENTREGA.md`](PENDENCIAS-DE-ENTREGA.md) (CFL-03 e o
checklist do processo de entrega).

Todos os dados exibidos no protótipo e no MVP são **sintéticos**. Nenhum dado real de criança
atendida foi usado, em nenhuma etapa.
