# Revisão adversarial da implementação da camada de IA (25/08/2026)

> Fecho previsto no §9 do [plano de complementação](04-PLANO-COMPLEMENTACAO-IA.md):
> depois de implementar as Etapas A–H, revisar tudo em busca de erros e lacunas
> e executar os ajustes. Método: 4 revisores adversariais independentes
> (segurança/privacidade da IA, correção do código, fidelidade ao plano,
> consistência documental) + verificação cruzada de cada achado contra o código
> real. **37 achados levantados, 35 confirmados, 2 refutados — 35 tratados.**

## Baseline no início da revisão

63 testes unitários + 242 asserções smoke + 6 gates RAG + 17 asserções da
camada de IA com stub — todos verdes; Modo A com modelo real 6/6 sem regressão;
Modo B validado ao vivo (7 blocos, citações reais, recusas, pseudonimização).

## Achados de segurança/privacidade (4 confirmados)

| Id | O que era | O que foi feito |
|---|---|---|
| SEG-01 (bloqueante) | O cookie de identidade sem assinatura (decisão 8) torna declarativos também os papéis da camada de IA (diretoria 403 no chat, dono da doação) | **Mantida como dívida declarada** — é a mesma dívida de autenticação, agora com a herança EXplicitada na decisão 19 e em `ai/README.md`; bloqueante antes de dado real |
| SEG-02 | Pseudonimização restrita ao roster da educadora: criança de OUTRA turma citada pelo nome chegaria íntegra ao modelo e à busca | `nomesParaAnonimizar` passou a devolver SEMPRE o roster completo de crianças ativas (o papel governa o que se vê, não o conjunto de nomes protegidos); `extrairComModelo` pseudonimiza contra o roster completo e só aceita token de falta da própria turma |
| SEG-03 | Revogação de doação sem checagem de dono — qualquer educador/coordenação apagava doação alheia pelo id | `revogarDoacao(u, id)`: só o doador (ou a coordenação) revoga; 403 explícito para terceiros |
| SEG-04 | `k=abc` em `/api/rag/search` virava `LIMIT NaN` → 500 | Saneamento na rota e dentro de `buscar()` |

## Achados de correção de código (9 confirmados)

| Id | O que era | O que foi feito |
|---|---|---|
| COD-01 | Timeout do ai-client cobria só os headers; corpo travado prendia o slot da fila para sempre (copilot morto em 503) | `resp.json()` movido para dentro da janela do AbortController; SyntaxError vira `saida_invalida` |
| COD-02 | Envios cruzados no chat sobrescreviam o placeholder errado e desalinhavam o índice de doação | Índice do placeholder capturado no push; envio bloqueado enquanto houver resposta em voo |
| COD-03 | `copiloto`/`sroi` (estado do cliente) vazavam entre usuários na troca de perfil no mesmo aparelho | `limparEstadoLocal()` em entrar e sair (sair também apaga a sessão do copilot no servidor) |
| COD-04 | `horizonte_anos: 0` virava 5 em silêncio; fração de ano era aceita | Horizonte inválido agora é 422 declarado (inteiro 1–30) |
| COD-05 | SW devolvia `index.html` para QUALQUER GET offline fora do cache (CSS/ícone virando HTML) | Fallback de `index.html` só para navegação; o resto responde 504 declarado |
| COD-06 | `cache.put` flutuando no SW (worker podia morrer antes) | `e.waitUntil(...)` |
| COD-07 | (= SEG-03) | idem |
| COD-08 | Índice de doação recontado no cliente atravessava expiração de sessão | O servidor devolve `indice` na resposta do chat; o cliente usa esse valor |
| COD-09 | Handle do corpus preso ao inode antigo depois de um re-ingest com o servidor de pé | `abrir()` compara mtime e reabre quando o arquivo mudou |
| COD-10 | `/api/sroi/explicar` chamava o modelo por fora da fila de 2 | `comVaga` exportado e aplicado também ali |

## Fidelidade ao plano (7 confirmados)

- Botões **aceitar/rejeitar/escalar** prometidos na UI do copilot — adicionados
  (registro local de decisão, nada persistido; escalar reforça o caminho humano).
- Este documento é o registro da **revisão final** prometida no §9.
- Comentário desatualizado em `src/api.js` (dizia que o escopo A4 estava aberto) — corrigido.
- Comentário-guarda de FTS5 prometido em `src/db.js` — adicionado.
- `.gitignore` com o padrão genérico `data/*.jsonl` prometido — aplicado.
- Caso smoke de escopo cross-turma prometido em A4 — bloco 12 novo
  (**242 → 246 asserções**: lista escopada, criança exclusiva, ficha 403, observação 403).
- Divergência declarada da equação SROI (efeito_incremental funde Δ×coeficiente;
  amortização 1/T) — nomeada em `SROI-METODOLOGIA.md`.

## Consistência documental (14 confirmados)

Números e claims atualizados em cadeia: 43→53 rotas e 55→63 unitários no
as-built da `ARQUITETURA.md` (+ item 1.2 do Horizonte 1 riscado como feito);
55→63 e duas→quatro baterias em `TESTES.md`; 242→246 em `README.md`,
`DECISOES-TECNICAS.md` (decisão 9) e `VALIDACAO-USUARIO.md`; `MVP-CANVAS.md`
sem o "Node 22.5+" que quebraria o boot e sem a pendência de RBAC já fechada;
tabela de perfis do README com Refletir/Impacto; jornadas com os passos da v3;
caminhos relativos do `POC-COPILOT.md`; tabela de seed do `MODELO-DE-DADOS.md`
datada como snapshot (volumes dependem do calendário); rodapé do README em
25/08/2026; `EVIDENCIAS-DE-TESTE.txt` regenerado (246 passaram, 0 falharam).

## Refutados (2)

- SEGURANCA-IA-05 (injeção de prompt via mensagem): tecnicamente correto, sem
  consequência acionável — gramática força a forma, citações inventadas são
  descartadas, o modelo é local e a resposta volta só ao próprio autor.
- FIDELIDADE-PLANO-02 (gate Modo A "não rodou em CI"): o plano manda esse gate
  para máquina local; está executado e registrado em `ai/README.md` (6/6, 0
  regressões).

## Estado ao fim da revisão

63 unitários · **246 smoke** · 6 gates RAG · 17 IA-stub — todos verdes após os
ajustes. Dívidas remanescentes: tabela em `DECISOES-TECNICAS.md` (autenticação
continua a bloqueante nº 1 antes de dado real, agora explicitamente herdada
pela camada de IA).
