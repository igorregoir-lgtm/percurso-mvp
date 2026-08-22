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

Para usar outra porta:

```bash
PORT=8080 node server.js
```

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
scripts/smoke-test.mjs    73 testes do fluxo principal
data/percurso.db          o banco (um arquivo — copie para fazer backup)
docs/                     Lean Inception, modelo de dados, decisões técnicas
prototipo-figma/          protótipo mobile fiel ao Figma (standalone)
```

---

## Protótipo Figma (mobile)

Dentro de `prototipo-figma/` há o protótipo interativo fiel ao design do Figma:

- `completo.html` ou `percurso-prototipo.html` — abre direto no navegador (standalone)
- `index.html` + `styles.css` + `app.js` — versão modular

Telas: Entrada · Hoje · Chamada · Folha do dia · Olhar · Turma · Painel da coordenação

```bash
# opcional: servir localmente
cd prototipo-figma && python3 -m http.server 8765
```

---

## Atualização

Última sincronização deste repositório: **22 de agosto de 2026**.
