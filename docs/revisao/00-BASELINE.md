# Baseline de conformidade — revisão arquitetural (22/08/2026)

Consolida os requisitos extraídos de `1 - Arquitetura/` contra os quais o MVP Percurso foi
auditado. Cada requisito é classificado em uma de três faixas:

- **[MVP]** — obrigatório na entrega da semana 10;
- **[DEFERIDO]** — explicitamente fora do MVP por decisão registrada (não é defeito);
- **[OPERAÇÃO]** — exigível apenas antes de operar com dado real de criança.

Fontes: `percurso-arquitetura-case.html`, `mvp-percurso-persona.html`,
`percurso-mvp-prototipo.html` (Material Produzido em Aula); Business Case bloco 5/6/7 e
Guia do Aluno (Material da Aula).

---

## 1. Módulos (M1–M6, B4)

| ID | Módulo | Faixa | Requisito |
|---|---|---|---|
| M1 | Inventário + modelo | [MVP] | Criança é entidade; matrícula é relação criança × programa × período. Import/representação da base histórica. Painel "o que temos". |
| M2 | Âncora acadêmica | [DEFERIDO] | Ingestão do relatório anual do parceiro educacional. Aguarda canal mediado (pergunta 2, bloco 7). |
| M3 | Safras/permanência | [MVP] | Coortes por safra de entrada, evasão, tempo médio, alerta de ausências consecutivas. Dado sintético. |
| M4 | Demanda clínica | [DEFERIDO] | Contador mensal de atendimentos/horas da psicóloga — contagem, nunca conteúdo. |
| M5 | Rubrica socioemocional | [MVP] | 5 dimensões × escala 1–4 com âncoras comportamentais, relato do educador, 2–3 ciclos/ano. Piloto de 1 ciclo. |
| M6 | Protocolo | [MVP] | Transversal: quem aplica, janela mínima de convívio, checklist regulatório LGPD/CFP. |
| B4 | SROI vivo | [DEFERIDO] | Consome a síntese aprovada (F7). O MVP entrega apenas a saída (síntese), não o consumo. |

## 2. Funcionalidades (F1–F7, Lean Inception)

| ID | Funcionalidade | Faixa | Critério verificável |
|---|---|---|---|
| F1 | Ficha viva + consentimento | [MVP] | Ficha única por criança; campo sem consentimento nasce bloqueado (LGPD Art. 14, por campo). |
| F2 | Presença em um toque | [MVP] | Chamada por turma; registro completo exigido; nada expira. |
| F3 | Ciclo de observação | [MVP] | Rubrica + campo livre com filtro de perímetro ANTES da persistência. |
| F4 | Agenda do ciclo | [MVP] | Janelas, pendências, bloqueios com motivo explícito. (Ausente no protótipo HTML; exigida na persona.) |
| F5 | Trajetórias | [MVP] | Individual categórica e interna; agregado por turma/programa para circular. |
| F6 | Safras + alerta evasão | [MVP] | Curvas de permanência; alerta em N faltas consecutivas. |
| F7 | Fecho do ciclo | [MVP] | Síntese em template contido, revisor de sobre-alegação, aprovação humana obrigatória. |

## 3. Requisitos não funcionais e perímetro ético

| ID | Requisito | Faixa | Fonte |
|---|---|---|---|
| RNF-01 | Somente dado sintético em todas as etapas | [MVP] | Bloco 6, regra 1 |
| RNF-02 | Dado sensível não sai da organização; nenhum serviço externo recebe dado de criança | [MVP] | visão de produto |
| RNF-03 | Processamento local (sem nuvem para dado sensível) | [MVP] | visão de produto |
| RNF-04 | Sem licença recorrente; operável por equipe sem TI após a semana 10 | [MVP] | Bloco 5 |
| RNF-05 | Escore/indicador nunca nasce de modelo; números vêm de fórmula/SQL | [MVP] | arquitetura-case |
| RNF-06 | Verbos causais controlados ("contribuiu para", nunca "gerou") + ressalva metodológica | [MVP] | protótipo |
| RNF-07 | Registro rápido (meta operacional: chamada < 2 min; observação ~3 min/criança) | [MVP] | persona (ver conflito CFL-04) |
| RNF-08 | Agregado para fora; individual só uso interno | [MVP] | protótipo |
| RNF-09 | Indicador de programa ≠ registro clínico; conteúdo clínico fora do sistema por construção | [MVP] | Bloco 6 |
| RNF-10 | Governança por campo: base legal, titular, acesso, retenção declarados | [MVP] | Bloco 6, regra 3 |
| RNF-11 | Supressão de célula pequena (n < 5) nos agregados | [MVP] | doutrina EDI adotada |
| RNF-12 | Autenticação real, HTTPS, auditoria de acesso individual, persistência durável | [OPERAÇÃO] | DECISOES-TECNICAS §8 |
| RNF-13 | Retenção declarada é cumprida (ex.: campo livre — "descarte ao fim do ciclo") | [OPERAÇÃO] | governança seed |

## 4. Entregáveis acadêmicos (Guia do Aluno)

| ID | Entregável | Faixa | Situação esperada |
|---|---|---|---|
| EA-01 | MVP funcional com modelo de dados | [MVP] | Código + `docs/MODELO-DE-DADOS.md` |
| EA-02 | Repositório + handover (decisões, testes, vídeo) | [MVP] | `docs/` + `video/percurso-demonstracao.mp4` |
| EA-03 | Protótipo navegável (semana 5) | [MVP] | HTML interativo em `1 - Arquitetura/` (ver conflito CFL-03) |
| EA-04 | Personas, jornadas, user stories, validação com usuário real | [MVP] | Persona e US existem; jornada formal e registro de validação ausentes |
| EA-05 | Lean Canvas / MVP Canvas | [MVP] | `docs/LEAN-INCEPTION.md` cobre parcialmente |

## 5. Conflitos de baseline registrados

| ID | Conflito | Resolução adotada nesta revisão |
|---|---|---|
| CFL-01 | Nome: "Percurso" (arquitetura) vs "Bússola" (protótipo Google AI Studio) | Percurso é o produto entregue. Bússola é protótipo de referência, analisado em `docs/ANALISE-BUSSOLA.md`, mantido no repositório apenas como material comparativo (não rastreado no git). |
| CFL-02 | Stack: "Airtable + formulários" (arquitetura-case) vs código próprio | O código próprio VENCE o slide: atende melhor às restrições do bloco 5 (sem mensalidade, sem conta em plataforma) e ao Guia (repositório + handover). Decisão registrada em `DECISOES-TECNICAS.md` §1, que descarta Airtable explicitamente. |
| CFL-03 | Guia pede protótipo "Figma"; a semana 5 entregou HTML interativo | O HTML cumpre a função (navegável, fidelidade média/alta). Divergência formal a declarar na entrega, não a corrigir com retrabalho. |
| CFL-04 | Meta de tempo: "30 segundos" (visão) vs "2 min" (chamada, PARAMS) vs "~3 min" (observação) | Não é conflito real: 30 s é a promessa da CHAMADA na UI ("leva 30 segundos"), 2 min é a META do experimento de validação (`META_REGISTRO_SEGUNDOS=120`), ~3 min é a OBSERVAÇÃO por criança. As três convivem; a documentação deve nomeá-las separadamente. |
| CFL-05 | Faixa etária da persona (5–9 na nota de ajuste) vs programas 3–5 e 7–11 | O seed usa as faixas dos programas (3–5 e 7–11). A nota da persona é a desatualizada. |

## 6. Evidência de verificação desta revisão

- `node scripts/reset.mjs` → seed determinístico: 132 crianças (106 ativas únicas), 120 matrículas ativas, 182 encontros, 3 749 presenças, 156 observações, 4 consentimentos pendentes.
- `node scripts/smoke-test.mjs` em estado limpo: **86 passaram · 0 falharam** (22/08/2026).
- `node scripts/unit-test.mjs` (novo nesta revisão): **20 passaram · 0 falharam**.
- Node local: v24.19.0 (requisito: ≥ 22.5, agora fixado em `.nvmrc`).
