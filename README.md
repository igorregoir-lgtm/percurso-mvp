# Percurso — MVP funcional

**Instituto Ebenézer · Desafio B (Monitoramento de Impacto) · Módulo 3 — MBA IA e Dados para Negócios**

Transforma a observação de minutos do educador em indicador de evolução por trajetória e por
programa — sem que dado individual de criança saia da organização.

> Todos os dados desta aplicação são **sintéticos**. Nenhum dado real de criança atendida foi
> usado em nenhuma etapa (regra 1 do bloco 6 do dossiê).

---

## Como rodar

Requisito único: **Node.js 22.5 ou superior** ([nodejs.org](https://nodejs.org) — instalador padrão).
Não há `npm install`, não há build, não há conta em plataforma, não há mensalidade.

```bash
node server.js
```

Depois abra **http://localhost:3000** no navegador.

Na primeira execução o banco é criado e populado sozinho. Para voltar aos dados de demonstração a
qualquer momento — **pode rodar com o servidor no ar**, basta recarregar a página depois:

```bash
node scripts/reset.mjs
```

Para rodar a bateria de testes do fluxo principal (com o servidor no ar, em outro terminal):

```bash
node scripts/smoke-test.mjs
```

Para rodar os testes unitários das regras críticas (não precisa de servidor; usa um banco
temporário e nunca toca `data/percurso.db`):

```bash
node scripts/unit-test.mjs
```

As duas baterias também rodam automaticamente a cada push (`.github/workflows/ci.yml`).

Para usar outra porta:

```bash
PORT=8080 node server.js
```

---

## Demo hospedada (Vercel)

**Demo no ar: https://percurso-mvp-l551.vercel.app** — deploy automático a cada push na `main`.

O repositório inclui `vercel.json` para uma demo pública. Atenção: no Vercel o banco vive em
`/tmp` de uma função serverless — **os dados são efêmeros por instância** (cada arranque a frio
recomeça dos dados sintéticos, o que serve bem a uma demo e mal a uma operação). A operação real
do Instituto roda como descrito acima: `node server.js` numa máquina própria, banco em arquivo
local com backup por cópia.

---

## Quem entra e o que vê

O MVP não guarda senha — o controle de acesso real é uma decisão da coordenação, registrada em
`docs/DECISOES-TECNICAS.md`. Na tela inicial escolhe-se o perfil:

| Perfil | Papel | Vê |
|---|---|---|
| **Maria Silvia** | Educadora (a persona) | Hoje, Chamada, Ciclo, Turma, Crianças |
| **Rita Amaral** | Coordenação | Painel, Safras, Síntese, Consentimentos, Crianças |
| **Cleide Nunes** | Educadora | As demais turmas |

---

## O que o produto faz — e o que deliberadamente não faz

**Faz.** Registra presença em um toque; registra observação socioemocional por rubrica de âncoras
comportamentais; mostra trajetória por criança (interna) e média por turma e programa (agregada);
acompanha safras, permanência e evasão; alerta ausências consecutivas antes de virarem evasão;
redige a síntese do ciclo em template fechado, com revisor de sobre-alegação e aprovação humana.

**Não faz.** Não guarda conteúdo clínico — a Vivência terapêutica está fora do sistema por
construção, porque o titular do registro é a psicóloga e o sigilo profissional impede a
transferência. Não emite diagnóstico. Não expõe dado individual para fora da organização. Não
ingere o relatório do parceiro educacional (âncora acadêmica) — fica fora até o canal mediado
responder à pergunta 2 do bloco 7.

---

## As sete funcionalidades priorizadas na Lean Inception

Todas implementadas e operantes. O escopo é exatamente este — nada foi acrescentado.

| # | Funcionalidade | Onde está |
|---|---|---|
| F1 | Ficha viva da criança — criança ≠ matrícula, consentimento embutido | `#/criancas`, `#/crianca/:id`, `#/consentimentos` |
| F2 | Presença em um toque | `#/chamada` |
| F3 | Ciclo de observação — rubrica com âncoras + filtro de perímetro | `#/observacao/:id` |
| F4 | Agenda do ciclo — pendências, bloqueios e janela de convívio | `#/ciclo` |
| F5 | Trajetórias — individual categórica, turma/programa agregada | `#/turma`, ficha da criança, `#/painel` |
| F6 | Safras, permanência e alerta de ausência | `#/safras`, `#/alertas` |
| F7 | Fecho do ciclo — síntese em template contido + revisor | `#/sintese` |

---

## Estrutura do repositório

```
server.js                 servidor HTTP (Node puro, sem framework)
src/db.js                 esquema do banco e helpers de SQL
src/domain.js             todas as regras de negócio
src/seed.js               geração dos dados sintéticos
src/api.js                rotas HTTP/JSON
public/                   interface (HTML + CSS + JS, sem build)
scripts/reset.mjs         recria o banco do zero
scripts/smoke-test.mjs    86 testes do fluxo principal (contra o servidor no ar)
scripts/unit-test.mjs     20 testes unitários das regras críticas (banco temporário)
data/percurso.db          o banco (um arquivo — copie para fazer backup)
docs/                     modelo de dados, decisões técnicas, testes, roteiro do vídeo
```

**Backup:** com o servidor **parado**, copiar `data/percurso.db` é o backup completo — restaurar
é copiar de volta. Com o servidor **no ar**, o modo WAL mantém escrita recente em
`percurso.db-wal`; nesse caso copie os três arquivos (`percurso.db`, `-wal`, `-shm`) juntos.

---

## Documentação de handover

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — **plano de arquitetura**: restrições do dossiê → respostas de desenho, arquitetura atual, invariantes e os três horizontes de evolução (entrega 09/10 → piloto real → módulos condicionados)
- [`docs/LEAN-INCEPTION.md`](docs/LEAN-INCEPTION.md) — a análise que originou o escopo
- [`docs/ANALISE-BUSSOLA.md`](docs/ANALISE-BUSSOLA.md) — análise comparativa com o app Bússola: o que foi adotado (cronômetro de registro, reconciliação, plano da semana, supressão n<5, aspiração, impressão) e o que foi rejeitado, com justificativa
- [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md) — entidades, relações e atributos
- [`docs/DECISOES-TECNICAS.md`](docs/DECISOES-TECNICAS.md) — o que foi decidido e por quê
- [`docs/TESTES.md`](docs/TESTES.md) — o que foi testado, como reproduzir
- [`docs/EVIDENCIAS-DE-TESTE.txt`](docs/EVIDENCIAS-DE-TESTE.txt) — saída da última execução
- [`docs/ROTEIRO-DO-VIDEO.md`](docs/ROTEIRO-DO-VIDEO.md) — o roteiro do vídeo
- [`video/percurso-demonstracao.mp4`](video/percurso-demonstracao.mp4) — **vídeo demonstrativo**, 6m14s, 1080p, legendado e sem áudio ([como foi gerado](video/README.md))
- [`docs/revisao/`](docs/revisao/) — revisão arquitetural completa (22/08/2026): baseline de requisitos, matriz de rastreabilidade arquitetura → implementação → teste, e relatório de achados priorizados

---

## Sobre a pasta `remix-bússola-—-instituto-ebenézer/`

É o **protótipo de referência Bússola** (Google AI Studio / React / Gemini), analisado em
[`docs/ANALISE-BUSSOLA.md`](docs/ANALISE-BUSSOLA.md). **Não é o produto entregue e não roda em
produção**: depende de LLM na nuvem e de `localStorage`, duas escolhas rejeitadas com
justificativa escrita. As sete ideias adotadas dele foram reimplementadas de forma
determinística no Percurso. A pasta permanece apenas como material comparativo e não é
rastreada no git.
