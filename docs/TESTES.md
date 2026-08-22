# Testes

## Como reproduzir

Em um terminal:

```bash
node server.js
```

Em outro:

```bash
node scripts/smoke-test.mjs
```

Saída da última execução: [`EVIDENCIAS-DE-TESTE.txt`](EVIDENCIAS-DE-TESTE.txt) — **86 passaram, 0 falharam**.

Há também uma bateria de **20 testes unitários** das regras críticas de domínio (filtro de
perímetro, revisor de sobre-alegação, consentimento, supressão n<5, imutabilidade da síntese),
que roda sem servidor, contra um banco temporário descartável:

```bash
node scripts/unit-test.mjs
```

As duas baterias rodam a cada push via [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml).

Os testes **alteram o banco** (concluem observações, aprovam a síntese, revogam consentimento).
Para voltar ao estado de demonstração — pode rodar com o servidor no ar, é só recarregar a página:

```bash
node scripts/reset.mjs
```

---

## O que a bateria cobre

| Bloco | Testes | O que verifica |
|---|---|---|
| 0 · Sessão | 5 | 401 sem sessão; entrada dos dois perfis; educadora barrada no painel da coordenação (403); usuário inexistente |
| 1 · Modelo de dados | 3 | crianças únicas < matrículas; a diferença é exatamente o nº de crianças em 2 programas; vivência terapêutica fora de escopo |
| 2 · Chamada (F2) | 10 | datas em aberto; chamada incompleta recusada (422); status inválido recusado; data futura recusada; salva; sai da lista de pendentes; persiste no banco |
| 3 · Agenda do ciclo (F4) | 4 | observáveis + bloqueadas = total; bloqueio por consentimento; bloqueio por janela de convívio; cobertura só sobre observáveis |
| 4 · Observação e proteção (F3) | 14 | 403 sem consentimento; 403 sem convívio; 422 com dimensão faltando; nível fora da escala recusado; rascunho aceito e recuperado; **filtro de perímetro bloqueia (409), devolve o trecho e a categoria, preserva as marcações**; com confirmação, grava sem o trecho; **o conteúdo clínico não chega ao banco** |
| 5 · Fechar o ciclo (F5) | 7 | conclusão das pendentes; pendências zeram; cobertura 100%; bloqueadas continuam bloqueadas; dois ciclos comparáveis; leitura de forças e atenção |
| 5b · Melhorias da análise Bússola | 13 | custo de tempo medido e persistido; meta = 120s; plano da semana com foco na menor média; atividade do banco fixo; doutrina declarada; ganchos agregados; **invariante de supressão: nenhuma média com n < 5**; reconciliação com 3 fontes; aspiração na ficha e na governança |
| 6 · Alerta e safras (F6) | 6 | alerta aberto; status inválido recusado; tratativa registrada; curvas por safra; **permanência nunca sobe dentro de uma safra**; evasão por programa |
| 7 · Síntese (F7) | 9 | gerada como rascunho; revisor aprova; **texto sem verbo causal forte**; ressalva metodológica presente; números do texto batem com o SQL; educadora não aprova (403); coordenação aprova; síntese aprovada não é sobrescrita |
| 8 · Consentimento (F1) | 7 | painel separa ativos de pendentes; governança declara os 4 atributos; ativação sem responsável recusada; registro desbloqueia a criança; **revogação volta a bloquear** |
| 9 · Ficha viva (F1) | 4 | busca; ficha completa; 404 para criança inexistente; 422 para parâmetro inválido |
| 10 · Robustez | 4 | rota inexistente em JSON; JSON malformado (400); não serve arquivo fora de `public/`; painel monta inteiro |

---

## Teste manual da interface — o que foi verificado no navegador

Executado em viewport móvel (375×812) e desktop (1280×800).

| Fluxo | Resultado |
|---|---|
| Entrada como Maria Silvia | Tela **Hoje** com saudação, turma e data corretas |
| Banner de retomada após lapso | *"Que bom te ver de volta — Você ficou 7 dias sem registrar…"* com atalho para a data mais antiga em aberto |
| Alerta de ausência na tela inicial | 2 crianças da turma, com o número de faltas consecutivas |
| Chamada — "Todos presentes" | 20/20 marcadas; botão Salvar habilita só com todas marcadas |
| Chamada — alternar P/F | `aria-pressed` alterna corretamente; contador atualiza |
| Chamada — salvar | Toast de confirmação e **abertura automática da próxima data pendente** |
| Ciclo de observação | 16 de 18, 89%; duas bloqueadas com motivos distintos e explícitos |
| Observação — rubrica | 5 dimensões × 4 âncoras; contador "x de 5 dimensões marcadas" |
| Observação — rascunho | Reabre preenchido, com *"Você tinha começado — continue de onde parou"* |
| **Filtro de proteção** | Modal isola só a frase clínica, nomeia a categoria (*saúde mental / diagnóstico*) e oferece "Salvar sem esse trecho" |
| **Fecho da turma** | Ao concluir a última pendente, a tela de revelação abre com 18 de 18, o tempo investido, as barras dos dois ciclos e a frase para o financiador |
| Painel da coordenação | 106 crianças / 120 matrículas / 14 em 2 programas; cobertura, presença e alertas |
| Safras | Gráfico de permanência com 3 safras; tabela de evasão por programa |
| Síntese | Geração, revisor "aprovado", aprovação humana pela coordenação |
| Consentimentos | Modal com validação de campo vazio; registro desbloqueia a criança e sai da lista de pendentes |
| Responsividade | Layout íntegro em 375px e em 1280px; tabelas largas rolam dentro do próprio contêiner |
| Acessibilidade | Alvos de toque ≥48px; `aria-pressed` nos botões de estado; foco visível; `prefers-reduced-motion` respeitado; contraste dentro do padrão |

---

## Limites do que foi testado

- Não há teste de carga. A operação é de ~106 crianças e uma dezena de operadores.
- Não há teste de navegador antigo. Verificado em navegador baseado em Chromium atual.
- A validação com usuário real (a educadora) é a etapa seguinte — o registro dessa validação
  pertence à documentação da semana 5.
