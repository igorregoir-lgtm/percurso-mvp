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

## Pendências declaradas

- `prefere_tipo` funciona no servidor e é a alavanca de personalização mais visível, mas ainda
  não tem controle na interface — a pessoa só a alcança pela API.
- `resumo_do_dia` é aceito e gravado, mas o cliente ainda não o lê.
- Ligar `AI_ENABLED` em operação real continua atrás do gate da PoC (decisão 19).
