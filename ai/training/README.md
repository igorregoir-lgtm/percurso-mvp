# Fase 4 — LoRA/QLoRA: infraestrutura e gates (treino NÃO executado)

> **Por que não há adapter aqui.** O gate da própria arquitetura
> (PLANO-IMPLEMENTACAO §4.1) exige **≥ 200 interações aprovadas e anonimizadas
> de pedagogos reais** com o Modo B em uso — elas ainda não existem; o mecanismo
> lícito que as produzirá (doação explícita por interação, ver abaixo) acabou de
> nascer com o copilot. Além disso, QLoRA 4-bit via bitsandbytes é CUDA-only —
> o treino rodará em máquina com GPU NVIDIA (ou via MLX, a validar), não neste
> notebook. Fingir o gate seria violá-lo: treinar com dados sintéticos ou
> rascunhos não aprovados é exatamente o que a análise proíbe
> (ANALISE-SLM-E-SROI §4.3: "nunca usar rascunhos aceites automaticamente").

## O que o LoRA vai (e não vai) fazer

- **Vai**: ajustar COMPORTAMENTO — tom, formato dos 7 blocos, qualidade das
  perguntas socráticas, recusas e escalonamento.
- **Não vai**: "ensinar o corpus". Fatos, normas e materiais aprovados ficam no
  RAG (atualizável, com proveniência e remoção). RAG continua necessário
  depois do LoRA.

## Funil lícito de dados (implementado na Fase 2)

1. Nada de conversa é persistido por padrão (memória só de sessão, TTL).
2. O pedagogo pode **doar uma interação específica**: botão próprio, com
   pré-visualização EXATA do que será gravado (`POST /api/copilot/doacao/previa`).
3. A doação é revalidada contra anonimização ANTES de gravar
   (`doarInteracao` bloqueia se qualquer nome de criança ativa aparecer).
4. Registro em `data/ai-doacoes.jsonl` (gitignorado) com id, data e doador.
5. Revogável: `DELETE /api/copilot/doacao {id}` remove a linha.
6. **Revisão de pedagogo** antes de qualquer exemplo entrar no dataset — a
   doação é condição necessária, não suficiente.

## Pipeline (quando os pré-requisitos existirem)

```
data/ai-doacoes.jsonl
  → node ai/training/prepare-dataset.mjs        (JSONL messages + splits 80/10/10)
  → revisão humana exemplo a exemplo            (planilha de aceite)
  → treino offline (Python: Transformers + PEFT + TRL, QLoRA 4-bit)
  → adapter versionado em models/adapters/<data>-r<rank>/   (fora do git)
  → avaliação congelada: base+RAG vs adapter+RAG            (docs/LORA-AVALIACAO.md)
  → go/no-go + kill switch
```

### Base e hiperparâmetros a validar

| Item | Valor de partida |
|---|---|
| Modelo-base | `Qwen/Qwen3-4B-Instruct-2507` (registrar revision/hash) |
| Método | QLoRA 4-bit (nf4), adapter separado — nunca merge sem teste de equivalência |
| rank / alpha | 8–32 / 16–64 — definir por experimentos pequenos, não copiar de outro domínio |
| Épocas | 1–3, early stop por validação |
| Splits | 80/10/10 POR CENÁRIO pedagógico (sem vazamento por situação/instituição) |
| Hardware | GPU ≥ 8 GB VRAM (estimativa; rodar memory probe antes de contratar) |

### Kill switch e rollback

- O adapter carrega por flag própria; desligar = voltar ao base+RAG na hora.
- Base e adapters imutáveis; promoção por versão; qualquer regressão de
  segurança, viés ou português é no-go absoluto (gates em docs/LORA-AVALIACAO.md).
