# Plano — "Passo", o parceiro de percurso (assistente falante em toda a navegação)

> **Revisão 2** (25/08/2026) — painel adversarial de 3 lentes achou 20 problemas, 17 procedentes
> (4 bloqueantes), todos incorporados abaixo. Registro completo em `08-REVISAO-ASSISTENTE.md`.
>
> **Correções da auditoria incorporadas:**
> 1. **Porta lateral fechada (D-01):** o Passo responde SÓ sobre o produto — mensagem fora do
>    domínio do GUIA não vai ao modelo: resposta canônica redireciona ao copilot (educador/
>    coordenação, com oferta de ir até lá) ou à camada agregada (diretoria).
> 2. **Diretoria × criança nomeada (D-02):** nome do roster em mensagem da diretoria vira RECUSA
>    determinística (texto canônico da decisão 16), sem modelo e sem memória de sessão.
> 3. **A fala é mais restrita que a tela (D-03):** perímetro e recusas saem com `fala: null`;
>    scrub determinístico derruba a `fala` que contenha pseudônimo ou nome do roster; o som
>    nasce DESLIGADO (opt-in por toque); `visibilitychange` cancela a síntese.
> 4. **iOS destravado por gesto (T-01):** `speechSynthesis` é desbloqueada dentro do clique do
>    toggle/enviar (cancel + utterance vazia), com defer entre cancel e speak.
> 5. **Fecho único (T-05):** `fecharPasso()` = pararDitado + cancelar fala + remover + devolver
>    foco ao FAB; Escape global e o cleanup do router ganham os mesmos cancels.
> 6. **Sem eco (UX-05):** iniciar o ditado cancela a fala; fala nunca inicia com ditado ativo.
> 7. **Ação é OFERTA (D-05):** o Passo nunca navega sozinho — a resposta traz o botão
>    "Ir para {tela}"; a navegação é o toque humano (a mesma regra do registro).
> 8. **O que eu NÃO enxergo (D-04):** o GUIA declara os limites (o Passo não vê dado nenhum);
>    pergunta sobre estado de dados → resposta-limite + oferta de ir à tela, nunca um motivo
>    inventado.
> 9. **Gate herdado (D-06):** com modelo, o Passo herda o gate da PoC (decisão 19);
>    `AI_ASSISTENTE=0` desliga só ele.
> 10. **GUIA em dois níveis (UX-02):** rota + TAREFAS com intenções próprias — a chamada cobre
>     marcar presença/falta, "Todos presentes", trocar a data e o cronômetro/meta de 2 min
>     (fatos verificados no código: data-acao marcar/todos/trocar-data + cronômetro).
> 11. **Sessões compartilhadas (T-08):** factory `criarSessoes` (src/sessoes.js) usada por
>     copilot E assistente; `DELETE /api/assistente/sessao` chamado no sair.
> 12. **Fila cheia ≠ 503 (T-09):** 503 da comVaga é capturado e vira fallback do GUIA.
> 13. **Stub honesto (T-07):** o stub devolve a PRIMEIRA ação do enum RECEBIDO no pedido;
>     forma do nulo fixada em `anyOf [null, enum]`; guard para catálogo vazio.
> 14. **Ids próprios (T-10):** `passo-texto`/`passo-ditado-estado`.
> 15. **Descoberta (UX-01):** balão de boas-vindas ancorado ao FAB na primeira vez
>     (`localStorage passo_apresentado`), some ao toque.
> 16. **Acessibilidade (UX-03):** fio com `aria-live=polite`, foco no campo ao abrir, foco de
>     volta ao FAB ao fechar, FAB com aria-label.
> 17. **Offline (UX-04):** falha de rede → resposta imediata na persona ("estou sem conexão —
>     a tela continua funcionando e o que você registrar fica na fila").
> 18. **Voz especificada (UX-06):** `utterance.lang='pt-BR'` sempre; voz escolhida lazy
>     (voiceschanged; pt-BR localService > pt-BR > pt > padrão), rate 0,97.
> 19. **Colisões do FAB (T-04):** toasts sobem para cima do FAB; padding do body cresce; FAB
>     com safe-area.

## O que é

**Passo** — um assistente-parceiro disponível em qualquer tela (botão flutuante), que:
1. **Tira dúvidas sobre o artefato** ("o que é esta tela?", "por que essa criança está bloqueada?").
2. **Ajuda a fazer as tarefas** ("como faço a chamada?" → explica E leva a pessoa até lá).
3. **Fala** — resposta em voz sintetizada do próprio aparelho (Web Speech `speechSynthesis`,
   pt-BR, zero dependência), com botão de som ligado/desligado persistido.
4. **Ouve** — o mesmo componente de ditado já existente (`blocoDitado`).
5. Usa o **Qwen local já no repositório** (Apache-2.0, via `src/ai-client.js`) quando
   `AI_ENABLED=1` — e continua útil sem modelo, com o guia determinístico.

Persona: parceiro caloroso e direto, no tom do produto ("vamos juntos?"), que **acompanha e
nunca decide** — a doutrina inteira do Percurso vale para ele.

## Arquitetura

### Servidor — `src/assistente.js` + rotas em `src/api.js`

- **`GUIA`** (fonte única de conhecimento): uma entrada por rota — o que a tela é, como fazer as
  tarefas dela, dicas por papel. Alimenta TANTO o fallback determinístico QUANTO o prompt do
  modelo. Nada de conhecimento fora do produto.
- **`CATALOGO_ACOES`** (fechado, só NAVEGAÇÃO): `{id, rotulo, hash, papeis[]}` — hoje, chamada,
  voz/folha, pauta, turma, crianças, copilot, painel, scores, safras, síntese, consentimentos,
  relatório, impacto, consulta, importar. **O assistente nunca grava nada**: a única "ação" que
  ele executa é levar a pessoa até a tela certa; qualquer registro continua sendo toque humano.
- **`POST /api/assistente`** `{message, session_id, tela}` — todos os papéis (`exigeUsuario`; o
  conteúdo é guia do PRODUTO, não conversa sobre criança — a decisão 16 segue intacta: o chat
  reflexivo continua 403 para a diretoria). Pipeline na ordem consagrada:
  1. `filtrarPerimetro` no texto ORIGINAL (roster completo) — barrado → encaminhamento humano;
  2. recusas determinísticas (diagnóstico/score/atributo sensível — herdadas do copilot);
  3. pseudonimização (`anonimizarTexto`, roster completo);
  4. tentativa determinística primeiro? NÃO — com IA ligada o modelo responde (com o GUIA no
     prompt); **fallback determinístico** (casamento de intenção por palavras-chave sobre o GUIA,
     no espírito do `consultar()` do relatório) quando IA desligada OU modelo falhar. Sempre há
     resposta; a origem vem declarada (`origem: 'modelo' | 'guia'`).
  5. saída do modelo por **json_schema**: `{resposta (curta, texto da tela), fala (1-2 frases
     para a voz), acao (enum do catálogo filtrado pelo papel | null)}` — forma por gramática,
     ação impossível de inventar (enum);
  6. verificação: `acao` revalidada contra o catálogo+papel no servidor.
- Memória: sessão em RAM com TTL (mesmo padrão do copilot), últimas 4 trocas; nada persistido.
- Fila: **`comVaga` compartilhada** com o copilot (o llama tem 2 slots); `maxTokens` ~350 (o
  Passo é curto por persona); timeout do papel reflexivo.

### Cliente — `public/app.js` + `public/styles.css`

- **FAB** (botão flutuante) acima da nav, canto direito, com safe-area; some em `#/entrar` e fica
  ABAIXO de magia/festa/veu (z-index 60). Identidade papel-e-tinta (sem neon).
- **Painel** em bottom-sheet (idioma do `.veu/.modal`, focus-trap `prenderFoco`, Escape fecha):
  cabeçalho "Passo · parceiro de percurso" + toggle de som (🔊/🔇, `localStorage`), fio de
  mensagens curto, **chips de sugestão por tela** ("O que é esta tela?", "Como faço a chamada?" —
  vindas do GUIA para a rota atual), campo com o mic do `blocoDitado`.
- **Fala**: `speechSynthesis` com voz pt-BR do aparelho; fala o campo `fala` da resposta; cancela
  fala anterior; NUNCA fala com som desligado; para ao fechar o painel/navegar. Privacidade: a
  síntese é do navegador/aparelho — nada de áudio sai do Percurso.
- **Ação**: resposta com `acao` → navega (`location.hash`), fecha o painel, toast "Te levei para
  {rotulo}" e fala curta de confirmação. Client revalida papel antes de navegar.
- Timeout/Cancelar: mesmo padrão anti-travamento do copilot (75s + botão Cancelar + pergunta
  devolvida ao campo).
- Estado local do Passo limpo em `limparEstadoLocal` (troca de perfil não herda conversa).

### O que o Passo NUNCA faz (herdado + próprio)

Não grava; não pontua criança; não recebe nome (perímetro→pseudonimização antes de tudo); não
inventa ação (enum); não abre tela que o papel não pode (dupla checagem servidor+cliente); não
fala sozinho sem o som ligado pela pessoa; com IA desligada, não finge — diz que está no modo
guia e continua ajudando deterministicamente.

## Testes e docs

- **Unit**: casamento de intenção do guia (5+ casos), catálogo filtrado por papel, ação inválida
  descartada, fallback quando IA off.
- **Stub**: resposta canônica `assistente_*` no `scripts/ai-stub.mjs`; asserts no
  `ai-stub-test.mjs` (schema {resposta, fala, acao}, ação fora do papel descartada, perímetro
  vira encaminhamento sem modelo).
- **Smoke**: `POST /api/assistente` com IA off responde 200 com origem 'guia' + ação válida.
- **Docs**: decisão 26 (assistente-parceiro: voz local, ação = só navegação, guia como fonte
  única), README (seção curta), `ai/README.md` (mapa), manual (uma linha).

## Sequência

servidor (`assistente.js` + rotas + stub) → testes de servidor verdes → cliente (FAB, painel,
TTS, chips, ação) → inspeção visual mobile claro/escuro pelo túnel → revisão adversarial da
implementação → ajustes → docs + registro em `08-REVISAO-ASSISTENTE.md` → commit/push.
