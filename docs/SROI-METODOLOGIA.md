# SROI exploratório — metodologia, limites e papel do modelo

> Como a tela **Impacto** (`#/impacto`) calcula, o que ela pode afirmar e o que
> ela é proibida de afirmar. Deriva de `docs/ANALISE-SLM-E-SROI.md` §5 e do
> plano de arquitetura §Fase 3. Motor: `src/sroi/calculator.js` (v1.0.0);
> premissas: `data/sroi/premissas.json` (versionadas).

## O que este número é — e o que não é

**É** uma faixa exploratória de valor social potencial, construída com proxies
brasileiras publicadas, premissas expostas e três cenários, para conversa de
captação. **Não é** prova de impacto: não existe coeficiente causal validado
ligando o programa do Instituto a desfecho monetizado (§5.10 da análise). O
veredito registrado é "adequada com ajustes, não pronta para cálculo
definitivo" — por isso todo resultado sai rotulado como *associação
compatível, não causalidade comprovada*.

**Eixo da narrativa: prevenção de violência e criminalidade** — decisão
registrada do Instituto (§5.2; o Jardim Ângela como território). A decisão
define relevância estratégica; **não prova** que o programa evita crime. Essa
ponte deverá ser construída e testada separadamente.

## O motor é determinístico

Equação (§5.8), executada sem nenhum modelo de linguagem:

```
benefício_t = N × efeito_incremental × proxy_R$ × (1−deadweight) × (1−atribuição)
              × (1−deslocamento) × (1−drop-off)^(t−1) ÷ (1+desconto)^t
SROI = Σ benefícios presentes ÷ investimento total do horizonte
```

O valor "ao longo da vida" da proxy é distribuído em frações iguais no
horizonte (1/T por ano) antes de drop-off e desconto — transparente e
conservador. **Duas diferenças declaradas frente à equação transcrita no plano (§5.8 da análise):**
o termo `efeito_incremental` funde `Δresultado × coeficiente` num parâmetro único — porque não
existe coeficiente local validado para separar os dois (é exatamente a lacuna do §5.10) — e a
amortização 1/T é escolha conservadora adicional, para o valor de vida inteira não entrar de uma
vez no ano 1. Três cenários (conservador/base/superior) com parâmetros padrão
**exploratórios e editáveis** declarados em `premissas.json`; parâmetro fora
de 0..1 é recusado (422).

## Regras que o código impõe

| Regra (§5.9) | Onde |
|---|---|
| Dupla contagem: envelope de R$ 372 mil XOR componentes | `validarDuplaContagem` — 422 na soma |
| Benchmark nunca vira multiplicador | proxies com `uso: benchmark/referencia/narrativa` são recusadas no cálculo |
| Sempre faixa, nunca número único | resposta traz `faixa_sroi` e a `leitura_obrigatoria` fixa |
| Premissa rastreável | cada proxy sai com valor, unidade, ano-base, fonte, URL, confiança e ressalva |
| Ressalva literal | "fatores externos não foram isolados" nas ressalvas fixas |
| Nenhum dado individual | entram só N agregado e custo do programa; nada de criança |

## Mapeamento indicadores → categorias da literatura

Tabela DETERMINÍSTICA em `premissas.json` (`mapeamento_indicadores`): o que o
Percurso mede (permanência/safras, rubrica agregada, alertas tratados,
cobertura da primeira infância) apontando para as categorias com proxy — com a
ponte causal marcada como pendente em todas. O modelo apenas explica este
mapeamento; **nunca o cria nem o altera**.

## Papel do modelo (e sua coleira)

`POST /api/sroi/explicar` — o único canal de modelo da diretoria:

- prompt fechado sobre o resultado calculado; sem sessão de chat, sem RAG de
  casos, sem memória do Modo B (a decisão 16 continua valendo: o
  `copilot/chat` responde 403 para a diretoria);
- proibições no prompt: inventar número/fonte, afirmar causalidade, escolher
  coeficiente;
- **toda saída passa pelo revisor determinístico de sobre-alegação**
  (`revisarSobreAlegacao` — o mesmo do relatório do doador); texto reprovado
  não aparece: entra a explicação determinística;
- o texto aprovado sai rotulado "texto gerado por modelo local — não revisado
  por humano" e **fica fora do relatório exportado por padrão** (classe
  `no-print`/fora da `area-impressao`).

## Gate de uso externo

Relatório impresso/exportado leva premissas, fontes, cenários e ressalvas.
**Uso externo (doador, Rouanet, mídia) exige revisão prévia de
pedagogo/gestor** — gate humano, não automatizável. As lacunas que impedem um
SROI definitivo (§5.10: baseline, contrafactual, atribuição, série
longitudinal, criança×matrícula já resolvida pelo M1) permanecem declaradas.

## Evolução

Quando existirem ≥ 2 ciclos comparáveis com dado real, a sequência do §5.11
prevê evoluir de cenário exploratório para ACB com efeito local medido. Até
lá: faixas, rótulos e revisão humana.
