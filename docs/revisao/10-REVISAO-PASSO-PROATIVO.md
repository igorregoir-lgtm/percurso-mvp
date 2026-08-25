# 10 — Revisão da implementação do Passo proativo

**Data:** 25/08/2026 · **Escopo:** os 7 passos do plano `09-PLANO-PASSO-PROATIVO.md`
**Método:** plano por painel (4 propostas × 3 juízes) → revisão adversarial do plano
(4 lentes × cético, 20 achados confirmados) → implementação → revisão adversarial da
implementação (4 lentes × cético, 32 agentes, **28 achados confirmados, 0 refutados**).

## O que ficou de pé

| peça | arquivo | o que faz |
|---|---|---|
| Envelope | `src/passo/sinais.js` | contadores do dia da pessoa; `congelar()` roda em produção e recusa qualquer valor fora do contrato |
| Catálogo | `src/passo/catalogo.js` | 54 entradas, quatro tipos vivos nos três papéis, lint de cobrança, sete regras de escrita |
| Ranking | `src/passo/ranking.js` | urgência institucional manda; preferência reordena ±0,15; piso de núcleo; **teto de UMA pendência** |
| Painel | `src/passo/painel.js` | a cola; total (nunca lança); sem gatilho, cai nos chips do GUIA |
| Perfil | `src/passo/perfil.js` | banco derivado, **nasce desligado**, vocabulário fechado, decaimento, apagamento |
| Orquestrador | `src/passo/orquestrador.js` | o Qwen ordena e reescreve rótulo; nove portões; nunca alcança o banco |

## Os 28 achados da revisão da implementação

**Bloqueantes (4 distintos, cada um encontrado por 2 lentes):**

1. **`silenciar()` gravava string livre — nome de criança chegava ao perfil.** A fronteira do
   vocabulário existia só em `registrar()`; `silenciar()` passava por fora. Pior: a rota
   respondia **422 e a linha ficava gravada** — o erro mentia, porque a escrita já tinha
   acontecido, e a string voltava na tela de memória por 14 dias. E acontecia **antes** de a
   pessoa responder o convite, com `aprender=0`. *Corrigido:* `validarChave()` num lugar só,
   por onde toda escrita passa. Verificado ao vivo: 422 sem rastro.
2. **O "portão 4" não existia.** `recompor` era a identidade `(ordem) => ordem`, enquanto o
   comentário **e o corpo de `GET /api/passo/qualidade`** afirmavam que o piso de núcleo roda
   depois do modelo. Com `ordem_alterada: 42` em `chamadas: 50`, a vaga 1 era do modelo.
   A doutrina publicada era mais forte que o código. *Corrigido:* sort estável por núcleo
   depois do modelo, e a string de auditoria reescrita para dizer o que o código faz.
3. **`explorar()` dava a PRIMEIRA vaga à inédita**, não a última — e com pesos vazios (o
   padrão) *todo* candidato é inédito, então a exploração disparava para todo mundo, todo
   terceiro dia, na configuração de fábrica, rebaixando o sinal núcleo. *Corrigido:* uma linha.
4. **Perfil quebrado derrubava o painel** com 5xx e gaveta vazia — o oposto do fallback
   determinístico em 100% das falhas. *Corrigido:* `painelDoPasso` é total.

**Importantes tratados:** o perfil guardava **hora** contra a política que ele mesmo mostra na
tela; o dedupe de "mostrada" só cobria uma das três famílias e o próprio refinamento inflava o
ranking; **'aceita' era inalcançável** para pergunta e dúvida — o Passo só conseguia aprender a
*esconder*; o rótulo escrito pelo modelo era atribuído **à pessoa** no fio ("você: O áudio tá
gravado onde?"); o modelo transformava ofertas em **comandos** ("Decida a pauta") e o lint de
cobrança não pega imperativo; o portão agregado **sequestrava a conversa de ajuda** — o chip
"O que é cobertura?" respondia "está em 79%" em vez de explicar; o balão de apresentação era
**destruído 3 ms depois de nascer** com o flag já consumido; o resumo sobrevivia à troca de tela.

## Gates

**106 unit · 255 smoke · 24 ai-stub · 6 RAG**, todos verdes. Oito testes novos nasceram desta
revisão, e três deles existem porque o teste anterior passava de forma vácua: verificar que o
catálogo passa no lint não é o mesmo que verificar que o lint **morde**.

## Pendências — fechadas em 25/08/2026

As duas pendências desta revisão foram implementadas no mesmo dia:

- **`prefere_tipo` ganhou controle na tela.** A seção "O que eu lembro de você" virou leitura
  **e** controle: quatro chips de tipo mais "sem preferência". É a alavanca que a pessoa sente
  no primeiro dia, sem telemetria nenhuma — verificado ao vivo: tocar "Dúvidas da tela" muda o
  painel de `acao · acao · aprimoramento` para `duvida · acao · acao`.
- **`resumo_do_dia` passou a ser honrado** em `painelDoPasso`, com UMA exceção declarada: quem
  está em lapso recebe a linha de retomada mesmo com o resumo desligado. Silêncio para quem
  sumiu é o oposto do desenho anti-abandono.

Três testes novos (106 → 109), incluindo o que impede a preferência declarada de virar botão
morto: ela tem que MUDAR o painel, não só ser gravada.

Pendência que permanece: ligar `AI_ENABLED` em operação real continua atrás do gate da PoC
(decisão 19).


---

## Adendo — "então não estamos usando o Qwen?" (25/08/2026, à noite)

A pergunta expôs um defeito que nenhuma das três revisões pegou, porque ele só aparece com o
modelo REAL no ar e com os contadores olhados de perto: **o refinamento do painel falhava em
100% das chamadas, em silêncio.**

`GET /api/passo/qualidade` mostrava `falhou: 2` em `chamadas: 2`. Causa: `TIMEOUT_MS = 2500`,
vindo de uma medição parcial minha. A latência REAL da chamada completa (prompt de sistema +
candidatos + gramática do schema) é **4,6–5,7 s** neste 4B. O modelo era chamado, respondia
corretamente, e o trabalho ia para o lixo com `refinado: false`. É a pior forma de usar um
modelo: pagar o custo e descartar o resultado.

**Corrigido:** teto de 8 s (é trabalho de fundo, com prioridade `'fundo'`, sobre um painel já
pintado — ninguém espera). E o motivo da falha deixou de ser a string genérica `'falhou'`:
`/api/passo/refinar` devolve a causa real.

### O segundo achado, que só existiu porque o primeiro foi corrigido

Com o refinamento finalmente funcionando, medi 10 reescritas de rótulo: **3 melhoravam, 3 eram
neutras e 4 PIORAVAM** — e as que pioravam invertiam sentido, passando por todos os nove
portões:

| catálogo | reescrita do modelo | problema |
|---|---|---|
| "Há alerta de ausência na sua turma" | "Algo está faltando na turma" | vago; soa como falta DA turma |
| "Um sonho da turma segue sem atividade" | "O sonho da turma ainda não foi contado" | invertido: o sonho FOI contado; faltou atividade |
| "O áudio fica gravado em algum lugar?" | "O áudio é gravado? Tô com dúvida!" | põe dúvida na boca da pessoa, na pergunta mais sensível do produto |

Nenhum portão pegava, porque **nenhum deles olhava para o rótulo original**. A correção não é
detectar inversão depois que ela acontece — é torná-la impossível: **o modelo pode SUBTRAIR e
REORDENAR palavras, nunca ACRESCENTAR conceito novo** (`soComprime`). Ele vira um COMPRESSOR de
rótulo, que é exatamente o que serve numa tela de 375 px.

Medido depois da correção, em 5 telas: **10 reescritas aceitas, 2 barradas por sentido, 1 por
outros portões, 0 falhas** — e todas as aceitas são compressões honestas ("Há alerta de ausência
na sua turma" → "Alerta de ausência"; "O áudio fica gravado em algum lugar?" → "O áudio fica
gravado?").

### Onde o Qwen está, medido

| trabalho | usa o modelo? | evidência |
|---|---|---|
| Conversa do Passo | **sim** | `origem: modelo`, 3,5 s, resposta composta ("Vamos começar pela Chamada — é o mais rápido…") |
| Ordenação e rótulos do painel | **sim** | 10 aceitos em 5 telas, `ordem_alterada` instrumentado |
| Copilot (Refletir), 7 blocos | sim | pré-existente |
| Explicação do SROI | sim | pré-existente |
| Extração da voz (Modo A) | opcional | `AI_EXTRATOR=1` |
| **Números, escores, qual sugestão dispara, ação** | **não, por construção** | o `texto` com contagens nunca vai ao prompt; o `rotulo` é livre de dígito |
