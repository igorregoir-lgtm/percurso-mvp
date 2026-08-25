# Handoff — 25/08/2026, fim da sessão

Para quem retomar. Este documento diz **onde o artefato está**, **o que decidir a seguir** e
**as armadilhas que já custaram tempo** — para não custarem de novo.

> **Leitura obrigatória do vault que NÃO foi feita.** O `CLAUDE.md` do vault manda ler
> `Architectus/Knowledge/outputs/graphify/cross-product-<recente>.md`, `refresh-status.md` e
> `wiki/_transversal/MASTER-INDEX.md` antes de escrever handoff. Os três estão **ilegíveis neste
> Mac** (`EPERM`): `Knowledge/` é uma *junction* do Windows apontando para o OneDrive, e o
> próprio CLAUDE.md registra a migração para Mac em 2026-08-25. Quem retomar num ambiente com
> acesso deve ler os três antes de agir — o handoff abaixo cobre só o produto, não a topologia
> cross-produto.

---

## 1. Estado: verde e publicado

Tudo commitado e no `main` de https://github.com/igorregoir-lgtm/percurso-mvp — working tree limpa.

| gate | resultado |
|---|---|
| `node scripts/unit-test.mjs` | **115 passaram** |
| `node scripts/smoke-test.mjs` | **255 passaram** (exige `node scripts/reset.mjs` antes **e** o servidor no ar) |
| `node scripts/ai-stub-test.mjs` | **24 passaram** |
| `node scripts/rag-test.mjs` | **6 passaram** (hit@5 20/20) |

**Onze commits nesta sessão**, do mais recente ao mais antigo:

```
9b88918  Qwen redigindo síntese e relatório: infraestrutura pronta, 4B reprovado
00fd838  O refinamento pelo Qwen falhava 100% em silêncio — e a guarda que faltava
6ce0e15  As duas pendências da revisão: controle de tipo e resumo do dia
5051eed  Revisão da implementação: 28 achados, 4 bloqueantes corrigidos
f4d865d  Decisão 27 e dois defeitos de integração
d7169b7  Passo proativo: o Qwen orquestrando o painel (passo 6) + 17 testes
eb71ede  Passo proativo: a memória de uso, que nasce desligada (passo 5)
59294be  Passo proativo: a superfície no cliente (passo 4 do plano)
6f70e4b  Passo proativo: 20 achados da revisão adversarial do plano
b65cccf  Passo proativo: fundação determinística (sinais, catálogo, ranking, painel)
13f560a  Relatório do doador: tom de carta e ordem de leitura do doador
```

---

## 2. O que foi entregue

**Relatório do doador em tom de carta** (`13f560a`). Sete blocos reordenados pela leitura de
quem doa; o bloco dos sonhos passou a **fechar** o conteúdo, porque terminar no que ainda falta
é o único pedido honesto que um relatório assim pode fazer.

**O Passo virou parceiro proativo** (decisão 27, `docs/DECISOES-TECNICAS.md`). Seis módulos novos
em `src/passo/`: `sinais` (envelope de contadores), `catalogo` (54 sugestões nos quatro tipos,
vivas nos três papéis), `ranking` (puro), `painel` (a cola), `perfil` (memória, banco derivado),
`orquestrador` (o Qwen). Mais `src/fila-modelo.js`, extraído do copilot para que o orquestrador
possa falar com o modelo **sem alcançar o banco nem transitivamente**.

**A doutrina 5 foi trocada, não contornada.** Ela dizia "o Passo não enxerga dado nenhum" e
virou mentira quando a sugestão passou a nascer de estado real. A frase foi reescrita nos **nove**
lugares para o que passou a ser verdade: **conta quantos, nunca quem**. Num produto que se
sustenta em limites declarados serem verdadeiros, limite que virou mentira é pior que a mudança.

**Redação por modelo** (decisão 28, `src/redacao-modelo.js`): construída, medida e **desligada**.
Ver §4.

---

## 3. As decisões de desenho que não são óbvias

Quem for mexer precisa saber **por que** cada uma existe, senão vai "simplificar" e reintroduzir
o defeito:

- **Teto de UMA pendência por painel** (`ranking.js`). Cada item pode ser gentil e o **somatório**
  ser cobrança diária. É a trava que impede o Passo de virar chefe.
- **A memória nasce DESLIGADA**, com convite de um toque na primeira abertura. Num produto onde
  tudo é opt-in, a única coisa que grava algo sobre a **pessoa** não podia ser a exceção.
- **Nunca o nome da turma** em texto nenhum: `turma.educador_id` é 1:1, então "a turma X está sem
  registro" **é** "a educadora Y não registrou", com outro rótulo.
- **O modelo só COMPRIME rótulo** (`soComprime`, em `orquestrador.js`): pode subtrair e
  reordenar palavras, nunca acrescentar conceito. Torna inversão de sentido impossível em vez de
  tentar detectá-la depois.
- **"Hoje não" em item núcleo cala só até o fim do dia**, e a tela **diz** isso. O produto não
  mente sobre o que o botão faz.

---

## 4. A decisão que está na sua mão

**O Qwen3-4B foi reprovado como redator da síntese e do relatório: 0 aceitações em 16 chamadas**
(6 por uso de número, 10 por apagar/inventar declaração obrigatória). A infraestrutura, os quatro
portões e 5 testes estão prontos; `AI_REDATOR` está **desligado por padrão** porque ligar hoje só
adiciona ~8 s de latência para cair no mesmo template.

**O gargalo é o porte do modelo, não o desenho.** A máquina (M5 Max, 128 GB) roda um Qwen3-14B ou
30B-A3B com folga. Refazer a medição é: baixar o GGUF, apontar `ai/model-manifest.json`, subir o
`llama-server` e rodar com `AI_REDATOR=1`. **É o próximo passo de maior valor** — ele responde se
"o Qwen redige os documentos" é limitação da ideia ou deste modelo.

> **A lição que vale além deste caso:** *fidelidade numérica não é fidelidade semântica.* Um
> verificador que confere cada número contra o banco aprova, sem hesitar, um documento em que
> **todo número está certo e todas as frases estão erradas**. Foi medido: *"67 crianças foram
> observadas em 106 atividades"* (106 é o nº de crianças **ativas**).

Outras pendências, menores:
- `resumo_do_dia` e `prefere_tipo` já têm controle na tela; nada pendente aí.
- Ligar `AI_ENABLED` em **operação real** continua atrás do gate da PoC com pedagogos (decisão 19).

---

## 5. Armadilhas que já custaram tempo

1. **O smoke exige `node scripts/reset.mjs` ANTES e o servidor no ar.** Estado sujo derruba o
   bloco de escopo e parece bug.
2. **Reinicie o `node server.js` depois de mexer em `src/`.** Perdi uma rodada de diagnóstico
   testando contra um servidor com código velho — o teste falhava e o código estava certo.
3. **O service worker serve o `app.js` em cache.** Depois de editar `public/`, recarregue **duas
   vezes** (ou limpe `caches`) ou você valida a versão anterior.
4. **`export { x } from '…'` NÃO cria binding local.** Quebrou o `copilot.js` quando a fila saiu
   para `fila-modelo.js`: o `chat()` do próprio arquivo deixou de enxergar `comVaga`.
5. **`maxLength` em `json_schema` degrada a gramática do llama.cpp** de ~143 para 1,5 tok/s.
   Estrutura na gramática; teto de tamanho **sempre** pós-geração.
6. **Meça a latência do caminho COMPLETO.** O teto de 2,5 s do refinamento veio de uma medição
   parcial e matava 100% das chamadas em silêncio; o real é 4,6–5,7 s.
7. **Teste que o lint MORDE, não só que o catálogo passa.** O anti-cobrança tinha um `\b` que
   anulava duas alternativas: *"Você está atrasada com a folha"* passava.

---

## 6. Como subir tudo

```bash
cd "/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional"
ai/scripts/start-llama.sh                 # Qwen3-4B em 127.0.0.1:8081
AI_ENABLED=1 node server.js               # app em 127.0.0.1:3000
cloudflared tunnel --url http://127.0.0.1:3000    # URL pública efêmera
```

Ou `ai/scripts/demo-celular.sh`, que sobe os três e imprime QR + URL.
A URL do túnel **muda a cada vez** e morre com o processo (decisão 25: demo, não operação).

Perfis: **Maria Silvia** (educadora) · **Rita Amaral** (coordenação) · **Solange Ribeiro**
(diretoria). Dados 100% sintéticos, semente fixa.

---

## 7. A trilha de auditoria

Cada ciclo desta sessão deixou registro, e ler o registro é mais barato que redescobrir:

| documento | o que contém |
|---|---|
| `docs/DECISOES-TECNICAS.md` | decisões **27** (Passo proativo) e **28** (redação por modelo) |
| `docs/revisao/09-PLANO-PASSO-PROATIVO.md` | o plano, de um painel de 4 propostas × 3 juízes |
| `docs/revisao/10-REVISAO-PASSO-PROATIVO.md` | 28 achados da revisão da implementação + adendo do Qwen |
| `docs/revisao/07` e `08` | o ciclo anterior do Passo |

**O método que funcionou e vale repetir:** plano → **revisão adversarial do plano** → implementação
→ **revisão adversarial da implementação** → correção. As três revisões acharam 68 problemas
confirmados, e os quatro mais graves só apareceram com o modelo real no ar e os contadores lidos
de perto — nenhum deles teria sido pego por leitura de código.
