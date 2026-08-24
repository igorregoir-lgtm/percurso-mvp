# Relatório de revisão arquitetural — Percurso MVP (22/08/2026)

Revisão completa do repositório contra o baseline de `1 - Arquitetura/`
(ver `00-BASELINE.md`) e a matriz de rastreabilidade (`01-MATRIZ-RASTREABILIDADE.md`).

## Sumário executivo

**O MVP está conforme o baseline arquitetural.** Os sete requisitos funcionais (F1–F7) estão
implementados com verificação no servidor, os módulos deferidos (M2, M4, B4) têm decisão
registrada, e as invariantes de proteção — filtro antes da persistência, consentimento por
campo com bloqueio no POST, supressão n<5, escore nunca de modelo, aprovação humana da
síntese — foram verificadas nesta revisão por 86 smoke tests e 20 testes unitários novos,
todos passando em estado limpo.

Os achados desta revisão se dividem em três grupos:

1. **Nenhum bloqueante para a entrega acadêmica** (demo sintética).
2. **Duas pendências de conformidade** que merecem correção antes do piloto:
   retenção do campo livre não implementada (A-05) e RBAC sem escopo por turma (A-07).
3. **Quatro dívidas já registradas** que bloqueiam apenas a operação com dado real
   (autenticação, HTTPS, auditoria, persistência durável) — corretamente declaradas em
   `DECISOES-TECNICAS.md` e reconfirmadas aqui.

---

## 1. Arquitetura e regras de domínio

### O que está sólido

- **Modelo criança ≠ matrícula** implementado no esquema (UNIQUE criança×programa×entrada),
  no domínio (`inventario`, `reconciliacao`) e exposto na UI. O seed materializa exatamente a
  inconsistência do dossiê (120 matrículas = 106 crianças + 14 em dois programas) e a resolve.
- **Regras concentradas em `src/domain.js`** com a camada HTTP apenas traduzindo — auditável
  como prometido na decisão técnica nº 3. A concentração (937 linhas) é aceitável no MVP;
  se crescer, extrair por área (presença / observação / síntese / safras) na ordem em que
  forem mexidas, não preventivamente.
- **Transações** (`tx`) em toda gravação composta; upserts idempotentes; FKs ativas com
  `PRAGMA foreign_keys = ON`.
- **F4 (agenda do ciclo)**, ausente no protótipo da semana 5, foi implementada no MVP com
  os quatro estados e motivo explícito de bloqueio — gap do baseline resolvido.

### Achados

| ID | Sev. | Achado | Arquivo | Recomendação e critério de aceite |
|---|---|---|---|---|
| A-05 | **P1** | Retenção do campo livre declara "descarte ao fim do ciclo" (`governanca_campo`), mas **não existe mecanismo de fechar ciclo** (nenhuma rota/função muda `ciclo.status` para `fechado`) **nem de descartar `observacao.nota_livre`**. A retenção declarada não é cumprida por construção. | `src/domain.js`, `src/api.js` | Criar `fecharCiclo(cicloId)` (coordenação) que: muda status, apaga `nota_livre` das observações do ciclo, e opcionalmente abre o próximo. Aceite: após fechar, `SELECT nota_livre` do ciclo devolve só NULL; smoke test novo cobre. Dependência: decidir com a coordenação se o fecho é manual ou por data. |
| A-06 | P2 | Revogação de consentimento bloqueia observação NOVA, mas o dado já coletado permanece em trajetória e agregados. Pode ser a leitura jurídica correta (tratamento passado era lícito), mas precisa ser uma decisão declarada, não um acaso. | `src/domain.js` (`trajetoriaCrianca`, `agregadoPorCiclo`) | Registrar a decisão em `DECISOES-TECNICAS.md` (manter histórico vs. excluir/anonimizar na revogação). Se excluir: aceite = trajetória vazia após revogação. |
| A-07 | **P1** | RBAC é por papel, não por escopo: qualquer educadora pode ler e gravar **chamada, observação e alerta de criança de outra turma** (ex.: `POST /api/observacao` não valida vínculo educadora↔turma da criança). A governança declara acesso "Educador **da criança** + coordenação" — o código não cumpre o "da criança". | `src/api.js` (rotas de educadora) | No `exigeUsuario` das rotas de escrita, validar que a criança/turma pertence ao educador (coordenação passa sempre). Aceite: Maria recebe 403 ao gravar observação de criança da turma da Cleide; smoke test novo. Na demo sintética o risco é nulo; antes do piloto com mais de uma educadora real, é obrigatório. |
| A-10 | P3 | `numerosDoCiclo` sem `programaId` conta matrículas ativas de QUALQUER programa, inclusive fora de escopo (`no_escopo=0`), no denominador da cobertura. Hoje sem efeito (o seed não matricula no programa 4), mas quebraria silencioso se houvesse matrícula na Vivência. | `src/domain.js` L578–580 | Adicionar `AND m.programa_id IN (SELECT id FROM programa WHERE no_escopo=1)`. Aceite: teste unitário com matrícula sintética no programa 4 não altera a cobertura. |
| A-11 | P3 | Janela de convívio (`encontrosComCrianca`) conta presenças em **qualquer** turma/programa — o convívio medido é com a instituição, não com a educadora que observa. Criança nova no Reforço mas veterana no Laboratório aparece observável para a educadora do Reforço no dia 1. | `src/domain.js` L274–297 | Validar com o protocolo M6 se convívio é institucional ou por dupla educadora-criança. Se por dupla: filtrar presenças pelos encontros da turma da educadora. |
| A-09 | P3 | `revisarSobreAlegacao` usa termos com espaço final (`'gera '`, `'causa '`) — "…gera." no fim de frase passa. Irrelevante enquanto o único produtor de texto é o template fechado; vira risco se texto editado manualmente entrar no fluxo. | `src/domain.js` L556–560 | Trocar por regex com borda de palavra (`\bgera\b`). Aceite: teste unitário com "o programa gera." reprova. |

## 2. Segurança e LGPD

### O que está sólido

- **Filtro de perímetro antes do INSERT**, determinístico e auditável; o 409 devolve trecho e
  categoria; a confirmação grava SEM o trecho. Verificado por smoke e por teste unitário
  direto no domínio (conteúdo clínico nunca chega ao banco, nem com `forcarLimpeza`).
- **Consentimento é FK + verificação no POST** — desabilitar botão no navegador não é o
  controle. Revogação volta a bloquear (testado).
- **Supressão n<5** protege contra reidentificação em qualquer escopo de agregação
  (testado com célula pequena real nesta revisão).
- **Front disciplinado contra XSS**: `esc()` aplicado consistentemente em toda interpolação
  de dado (revisado linha a linha em `public/app.js`); nenhuma injeção encontrada.
- **Servidor**: path traversal bloqueado e testado; corpo limitado a 1 MB; erros sempre em
  JSON sem stack trace; `SameSite=Lax` mitiga CSRF nos POSTs cross-site.
- **Zero exfiltração possível por construção**: nenhuma chamada de rede no backend
  (verificado por busca nesta revisão), zero dependência npm.

### Achados (todos [OPERAÇÃO] — não bloqueiam a demo sintética)

| ID | Sev. | Achado | Recomendação |
|---|---|---|---|
| A-01 | P1-op | Sem autenticação: o cookie é o id do usuário em claro (`percurso_uid=1` dá sessão de Maria; `=2` dá coordenação). Dívida declarada (§8). | Antes do 1º dado real: senha local (hash+salt em SQLite, sem serviço externo) ou token de convite por educadora. Cookie passa a ser id de sessão aleatório. |
| A-02 | P2-op | Cookie sem `HttpOnly` e sem `Secure` — um XSS futuro leria a sessão. | Junto com A-01: `HttpOnly; Secure; SameSite=Lax`. O front não lê o cookie via JS (usa `/api/sessao`), então `HttpOnly` não quebra nada hoje. |
| A-03 | P1-op | Sem HTTPS. | Operação local: Caddy na frente (`caddy reverse-proxy`) ou nada, se a máquina for única e a rede for do Instituto — decisão de operação, registrar. |
| A-04 | P1-op | Sem log de auditoria de acesso a dado individual (LGPD, accountability). A tabela `atividade` registra ação, não acesso. | Tabela `auditoria_acesso` (quem, quando, qual criança, qual tela/rota) preenchida em `fichaCrianca`, `trajetoriaCrianca`, `observacaoDe`. |
| A-08 | P2 | Conversões `Number()` sem validação em query params opcionais (`/api/criancas?turma_id=abc`, `programa_id` em síntese) viram `NaN` e podem gerar 500 em vez de 422. Rotas obrigatórias usam `num()` corretamente. | Aplicar `num()` também aos opcionais quando presentes. Aceite: `GET /api/criancas?turma_id=abc` responde 422. |

## 3. Frontend, fluxos e acessibilidade

Fluxos comparados tela a tela com o protótipo (`percurso-mvp-prototipo.html`):

- **Educadora**: Hoje → Chamada → Ciclo → Observação → Turma → Crianças/Ficha — todos
  presentes, com adições boas ausentes no protótipo (retomada pós-lapso, cronômetro,
  tela de fecho de ciclo, plano da semana).
- **Coordenação**: Painel → Safras → Síntese → Consentimentos — todos presentes, com
  reconciliação de fontes e promessa de tempo medida.
- **Acessibilidade verificada no código**: `aria-pressed` nos botões de estado,
  `role="dialog"`/`aria-modal` nos modais com foco gerenciado, `:focus-visible` com outline,
  alvos ≥48px, `prefers-reduced-motion`, toasts com `role="status"/"alert"`.

| ID | Sev. | Achado | Recomendação |
|---|---|---|---|
| A-12 | P3 | O modal de celebração (`.festa`) não fecha com Esc — o listener de Esc só remove `.veu`. Foco inicial está correto. | Incluir `.festa` no handler de Esc (`public/app.js` L1181–1184). |
| A-13 | P3 | Lista de crianças limitada a 60 sem indicação de corte na UI; a busca mitiga (dívida já registrada). | Mostrar "exibindo 60 de N — use a busca" quando o corte ocorrer. |
| A-15 | P3 | Sem focus-trap nos modais: Tab pode sair do diálogo para o fundo. Esc e clique-fora funcionam. | Aceitável no MVP; se refinar, prender Tab dentro do `role="dialog"`. |

## 4. Verificação, testes e reprodutibilidade

Executado nesta revisão, em estado limpo:

```
node scripts/reset.mjs      → seed determinístico (132 crianças, 120 matrículas ativas…)
node server.js (porta 3210) → boot limpo
node scripts/smoke-test.mjs → 86 passaram · 0 falharam
node scripts/unit-test.mjs  → 20 passaram · 0 falharam   (novo nesta revisão)
node scripts/reset.mjs      → banco devolvido ao estado de demonstração
```

Adicionado nesta revisão:

- **`scripts/unit-test.mjs`** — 20 testes unitários das regras críticas, direto no domínio,
  contra banco temporário descartável (nunca toca `data/percurso.db`): filtro de perímetro
  (4 categorias + limite de paráfrase declarado como teste), revisor de sobre-alegação,
  template sempre aprovável, consentimento abre/fecha campo, conteúdo clínico nunca persiste,
  ciclo fechado recusa, escala 1–4, supressão n<5 com célula pequena real, síntese aprovada
  imutável, utilitários de data.
- **`.github/workflows/ci.yml`** — CI mínimo: unit + servidor + smoke a cada push/PR.
- **`.nvmrc`** (22.5) — o requisito de Node era só texto no README.
- **`npm run test:unit`** no `package.json`.

Decisão sobre a Bússola: o subprojeto **não entra no CI** — é referência histórica, não
runtime (ver §6). Se um dia for reativado, precisa de lockfile e validação própria.

Lacunas que permanecem (aceitas no MVP): sem E2E de navegador (o teste manual documentado
em `TESTES.md` cobre; o pipeline de vídeo em `video/` já automatiza a navegação e pode ser a
base de um E2E futuro), sem teste de carga (~106 crianças não justifica), sem axe/pa11y
automatizado.

## 5. Persistência, deploy e operação

- **Local**: banco em arquivo, WAL, auto-seed no primeiro boot. Correto.
- **Render (deploy canônico)**: `render.yaml` monta disco persistente em `/var/data` e define
  `PERCURSO_DB=/var/data/percurso.db`. O serviço deve permanecer com uma instância enquanto usar
  SQLite; o plano gratuito sem disco é inadequado para persistência. Esta configuração substitui
  a antiga demo efêmera no Vercel.
- **Sem migrations**: o esquema é `CREATE TABLE IF NOT EXISTS`. Suficiente enquanto o
  esquema for estável; a primeira alteração de coluna vai exigir script manual. Registrar
  como limite conhecido — não vale a pena um framework de migração para este porte.

| ID | Sev. | Achado | Recomendação |
|---|---|---|---|
| A-14 | P2 | O backup documentado ("copiar `data/percurso.db`") **perde transações se feito com o servidor no ar**, porque o WAL mantém escrita em `percurso.db-wal`. | Documentar: backup com servidor parado, OU copiar os três arquivos (`.db`, `-wal`, `-shm`), OU usar `sqlite3 data/percurso.db ".backup backup.db"`. Aceite: README corrigido. |
| A-16 | P3 | Sem health check dedicado; `GET /api/sessao` serve na prática (o CI já o usa). | Opcional: rota `GET /api/saude` devolvendo `{ ok, criancas }`. |
| A-17 | P3 | Logs: só `console.error` em 500. Para uma máquina única do Instituto, suficiente; anotar que o log vive no terminal/serviço que rodar o `node server.js`. | Se virar serviço (systemd/launchd), redirecionar stdout/err para arquivo com rotação. |

## 6. Documentação e entregáveis

| ID | Sev. | Achado | Ação |
|---|---|---|---|
| D-01 | P2 | README e `DECISOES-TECNICAS.md` diziam "73 testes"; a bateria real tem 86 (+ 20 unitários novos). | **Corrigido nesta revisão.** |
| D-02 | P1-acad | Registro da validação com usuário real (educadora) ausente — exigência da semana 5, admitida como pendente em `TESTES.md`. | Fazer 1 sessão guiada com uma educadora (ou proxy), registrar em `docs/VALIDACAO-USUARIO.md`: tarefa, tempo, fricções, citações. É o maior risco da avaliação acadêmica. |
| D-03 | P2 | A pasta `remix-bússola-—-instituto-ebenézer/` está no diretório sem explicação no README (e não rastreada no git); o zip duplicado vive fora do repositório. | **README atualizado nesta revisão** com nota de que é protótipo de referência. Recomendação: mover a pasta para fora do repositório ou adicioná-la ao `.gitignore`, e apagar o zip da raiz do workspace. |
| D-04 | P3 | `1 - Arquitetura/`: `percurso-mvp-prototipo_1.html` é cópia idêntica do protótipo; nota da persona com faixa etária desatualizada (5–9). | Apagar a cópia; corrigir a nota. Fora do repositório git — arrumar direto na pasta. |
| D-05 | P3 | Jornada formal do usuário e canvas visual não existem como artefatos (o conteúdo existe disperso em `LEAN-INCEPTION.md` e nos slides). | Se a banca exigir o formato: 1 página de jornada da Maria Silvia derivada do roteiro do vídeo, que já a narra cena a cena. |

## 7. Roteiro de correção priorizado

**P0 — nenhum.** Não há violação de integridade ou LGPD na demo sintética.

**P1 — antes do piloto (mesmo sintético, com usuárias reais):**
1. A-05 fecho de ciclo + descarte do campo livre (cumpre a retenção declarada).
2. A-07 escopo de turma no RBAC de escrita.
3. D-02 registro da validação com usuário real (acadêmico).

**P2 — qualidade e operação:**
4. A-08 validação dos query params opcionais (422, não 500).
5. A-14 procedimento de backup compatível com WAL (doc).
6. A-06 decisão registrada sobre dado histórico pós-revogação.

**P3 — oportunistas (fazer quando tocar no arquivo):**
7. A-09 revisor com borda de palavra; A-10 filtro `no_escopo` no denominador;
   A-11 decisão sobre convívio por dupla; A-12 Esc na festa; A-13 aviso de corte na lista;
   D-04/D-05 higiene de artefatos.

**[OPERAÇÃO] — bloqueantes para dado real (ordem de implantação):**
A-01 autenticação → A-02 cookie endurecido → A-03 HTTPS → A-04 auditoria de acesso.
Já declarados como dívida; esta revisão confirma que nada além deles bloqueia a virada.

Após cada correção P1/P2: rodar `npm run test:unit` e `npm test`, adicionar o teste de
regressão indicado no achado, e reexecutar a leitura da matriz (`01-MATRIZ`).

## 8. Veredicto

O Percurso cumpre o que a arquitetura da semana 5 prometeu, com uma qualidade de
documentação e de invariantes acima do usual para MVP acadêmico. As tensões do baseline
(Airtable vs código, Figma vs HTML, Percurso vs Bússola) foram resolvidas por decisões
registradas, não por omissão. O que separa a demo do piloto real é pequeno e está nomeado:
fecho de ciclo com descarte (A-05), escopo no RBAC (A-07) e o pacote de operação já
declarado como dívida. Nenhuma alegação de "pronto para dado real" deve ser feita antes
desses itens — e o repositório, corretamente, não a faz.

---

## 9. Situação dos achados após a incorporação da v2 (22/08/2026, mesma data)

A rodada que incorporou o `percurso-v2-pack` mexeu em partes do código que esta revisão havia
apontado. O estado de cada achado, verificado por teste:

| ID | Sev. original | Estado agora | Onde |
|---|---|---|---|
| **A-05** | P1 | **RESOLVIDO** — o campo livre saiu do produto (decisão 15) e `fecharCiclo` apaga qualquer valor legado; a coordenação fecha o ciclo e o próximo abre | `src/domain.js` (`fecharCiclo`), unit *"executa a retenção declarada e apaga texto legado"*, smoke §18 |
| **A-09** | P3 | **RESOLVIDO** — o revisor passou a usar borda de palavra em vez de substring, e a lista ganhou "graças", "por causa", "o impacto foi", "transformou". Deixou de ser oportunista: o revisor agora guarda também o relatório que **sai** da organização | `src/domain.js` (`REGEX_PROIBIDOS`), unit *"borda de palavra, não substring (achado A-09)"* |
| **A-12** | P3 | **RESOLVIDO** — Esc fecha o véu e, se não houver véu, a tela de celebração | `public/app.js` (listener de `keydown`) |
| **A-07** | P1 | **PARCIAL** — o perfil da diretoria foi fechado para todo registro individual (decisão 16, smoke §16). O escopo **entre educadoras** continua aberto e permanece como item 1.2 do horizonte 1 | `src/api.js` (`semAcessoIndividual`) |
| A-06, A-08, A-10, A-11, A-13 | P2/P3 | **em aberto**, sem mudança |
| A-01 a A-04 | operação | **em aberto**, como declarado; nenhum deles foi tocado pela v2 |

**Achados novos, encontrados e corrigidos na própria rodada da v2** (registrados aqui para que a
próxima revisão saiba que existiram):

| O quê | Como apareceu | Correção |
|---|---|---|
| `PRAGMA user_version` carimbado sem que o esquema fosse recriado, deixando banco velho marcado como novo | primeira execução da migração | a versão passou a ser a assinatura do próprio DDL (decisão 14) |
| A confiança do extrator podia ser reescrita pelo corpo da requisição ao editar a folha à mão, sujando a métrica que mede o agente | leitura do fluxo de edição | a confiança passa a vir só da sugestão do agente; editar à mão marca `origem = manual` (smoke §11) |
| Folha fechada sem caminho de reabertura — beco sem saída num sistema que a organização opera sozinha | leitura do fluxo de fecho | `reabrirFolha`, restrita à coordenação e registrada no lastro de atividade (smoke §11) |
| Score de evasão saturando em 100 para toda criança em risco, tornando a coluna inútil para priorizar | observação da tela `#/scores` | pesos recalibrados com teto por componente (decisão 18), com teste que reprova saturação |
| `revisarSobreAlegacao` endurecido reprovando o próprio disclaimer do relatório ("não estabelece causa") | regressão detectada pelo teste novo | o disclaimer passou a usar "relação causal"; teste cobre o caso |
| Cartão "Chamada de hoje" convidando a registrar encontro em dia sem aula (sábado numa turma de semana) | observação da tela `#/hoje` | `/api/hoje` devolve `dia_letivo` e o cartão aponta a data em aberto |
