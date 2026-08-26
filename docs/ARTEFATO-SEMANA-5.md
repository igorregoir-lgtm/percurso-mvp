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
| 5 | Registro da validação com usuário real | ⛔ **não aconteceu** | §5 — protocolo pronto, resultado em branco |

O item 5 é o único furo, e ele **não se fabrica**. O que o §5 traz é o que falta e o que já está
preparado para a sessão. Ver também [`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md), que classifica
esta ausência como o maior risco da avaliação acadêmica.

**O protótipo, em Figma:** https://www.figma.com/design/HBBd4GyVRjd7C3WgJ4jnpL

Nove telas de 375×812 numa fileira, três papéis, ponto de partida em `#/entrar` e **12 ligações de
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
desenho, **não abre registro individual**). A psicóloga do Instituto **não é usuária**: o tempo
dela é clínico, e nenhum fluxo do produto depende dela.

Origem das personas: `1 - Arquitetura/Material Produzido em Aula/mvp-percurso-persona.html` e
`visao-produto-ebenezer.html`.

---

## 2. Jornadas — atual e futura

Íntegra das três personas, com ganhos **e custos**, em [`JORNADAS.md`](JORNADAS.md). O resumo do
contraste, para a persona principal:

| | Hoje (papel, planilha, memória) | Com o Percurso |
|---|---|---|
| **Observar** | o que viu fica na cabeça | rubrica de 5 dimensões × 4 âncoras, ~3 min por criança |
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

**A leitura que interessa ao avaliador:** as cinco histórias saem de dois papéis e cobrem o ciclo
inteiro do Desafio B — registrar (US-1), acompanhar (US-2, US-3), demonstrar (US-4) e proteger
(US-5). A proteção não é um requisito à parte: é uma história de usuário, pedida pela coordenação.

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
   5 dimensões × 4 âncoras aqui DESBLOQUEIA a
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

> ### ⛔ A sessão não aconteceu. Este campo fica em branco até acontecer.

O guia exige que o protótipo tenha *"sido testado e validado com pelo menos um usuário real"* e que
a documentação traga *"quem validou, como e principais aprendizados"*. **Nada disso pode ser
preenchido por memória, inferência ou simulação** — validação fabricada é pior que validação
ausente, porque a ausência é honesta e a fabricação contamina todo o resto do documento.

**O que já está pronto para a sessão** ([`VALIDACAO-USUARIO.md`](VALIDACAO-USUARIO.md)):

| Peça | Onde |
|---|---|
| Roteiro de 45 minutos, com seis tarefas cronometradas | §3 |
| As perguntas finais, a fazer literalmente e anotar literalmente | §3.2 |
| Termo de participação | §4 |
| Formulário de registro estruturado | §5 |
| Campo de resultados — **vazio** | §6 |

**O que falta, e é humano:** agendar e executar a sessão com uma educadora real, e transcrever o
formulário da §5 durante a sessão.

**Preencher aqui, depois da sessão:**

| Campo | |
|---|---|
| Quem validou (papel, tempo de casa) | — |
| Quando e onde | — |
| Como (tarefas aplicadas, o que foi medido) | — |
| Principais aprendizados | — |
| O que mudou no produto por causa da sessão | — |

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
