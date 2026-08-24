# SLM pedagógico com custo e manutenção mínimos

> **Versão interativa:** a análise navegável permanece no Canvas
> `recomendacao-slm-pedagogico.canvas.tsx` (Cursor).  
> **Exportação estática:** 24/08/2026 — conteúdo analítico integral de 22/08/2026.

Arquitetura em camadas para registro estruturado e parceria reflexiva com professores — com RAG
aprovado, hipóteses rotuladas, contrapontos, citações e decisão sempre humana.

**PERCURSO · PESQUISA TÉCNICA · 22/08/2026**

---

## Sumário

1. [Recomendação revisada: arquitetura em camadas](#1-recomendação-revisada-arquitetura-em-camadas)
2. [Shortlist técnico de modelos](#2-shortlist-técnico-de-modelos)
3. [UX, modos de operação e arquitetura mínima](#3-ux-modos-de-operação-e-arquitetura-mínima)
4. [RAG, LoRA e governança de fontes](#4-rag-lora-e-governança-de-fontes)
5. [Monetização SROI e alinhamento com o Instituto Ebenézer](#5-monetização-sroi-e-alinhamento-com-o-instituto-ebenézer)
6. [Plano de PoC e critérios go/no-go](#6-plano-de-poc-e-critérios-gono-go)
7. [Fontes e referências](#7-fontes-e-referências)

---

## 1. Recomendação revisada: arquitetura em camadas

### 1.1 Veredito principal

**Qwen3 1.7B** continua adequado para extração e classificação fechadas, mas **não é a recomendação
para diálogo reflexivo**. O novo uso exige melhor raciocínio, continuidade de conversa, contrapontos e
qualidade de português; a solução recomendada **separa os dois modos e os avalia independentemente**.

### 1.2 Copilot reflexivo — Qwen3 4B Instruct 2507 · GGUF Q4_K_M

É o melhor compromisso local verificável:

| Métrica (card oficial) | Valor |
|---|---|
| IFEval | 83,4 |
| MultiIF | 69,0 |
| MMLU-Pro | 69,6 |
| GPQA | 62,0 |
| Arquivo GGUF Q4_K_M | 2,5 GB |
| Licença | Apache 2.0 |

Tem escala suficiente para explorar hipóteses e alternativas sem a complexidade operacional do Qwen3.5.

**Operação recomendada:** rodar localmente com `llama.cpp`, RAG apenas sobre materiais aprovados e
memória de sessão. Toda resposta deve separar fatos, hipóteses, perguntas, alternativas, contraponto,
fontes e pontos que exigem decisão humana.

### 1.3 Modo estruturado — Determinístico + Qwen3 1.7B opcional

Catálogos, rubricas, scores e filtros continuam soberanos. O 1.7B pode sugerir JSON sob schema, mas a
validação existente, a confirmação humana e o fallback manual continuam obrigatórios.

### 1.4 Quality-first — Qwen3.5 4B ou API aprovada

Qwen3.5 4B é mais forte e suporta 201 idiomas, mas o card recomenda contexto de ao menos 128K para
preservar raciocínio e runtimes mais complexos. Use como braço comparativo da PoC ou via serviço
aprovado, somente com conteúdo anonimizado.

### 1.5 O repositório muda a resposta

| Modo | Descrição |
|---|---|
| **Modo A · Registro** | Entrada curta, saída fechada, baixa latência, zero geração livre persistida. |
| **Modo B · Reflexão** | Conversa anonimizada, RAG aprovado, perguntas socráticas, alternativas, contrapontos e citações. |
| **Fronteira comum** | Nenhum modelo diagnostica, infere atributo sensível, pontua desenvolvimento ou substitui julgamento. |

### 1.6 Base pedagógica da decisão

A UNESCO orienta que IA complemente, não substitua, professores; seu framework enfatiza agência humana,
ética, pedagogia e aprendizagem profissional. O copilot deve ampliar reflexão e criatividade enquanto
mantém empatia, julgamento ético e responsabilidade com o profissional.

### 1.7 Onde executar

| Opção | Custo/manutenção | Privacidade | Veredito |
|---|---|---|---|
| **Máquina local do Instituto** | Sem custo de API; iniciar teste com pelo menos 8 GB de RAM disponível | Melhor aderência ao princípio de não egressão | **Preferida para Qwen3 4B Q4** |
| **Mesmo Web Service no Render** | Starter atual: 512 MB; Standard: 2 GB — ambos menores que o arquivo Q4 de 2,5 GB | Dado permanece em terceiro contratado | **Inviável para o copilot 4B** |
| **Render Pro** | US$ 85/mês, 4 GB e 2 CPU; ainda apertado após runtime e cache KV | Requer governança do operador e backup | Não é menor custo/manutenção |
| **API gerenciada** | Menor manutenção técnica, custo variável | Somente texto anonimizado, contrato e retenção aprovados | Comparador da PoC; produção condicional |

> Preços e recursos: Render, consultado em 22/08/2026. O ponto inicial de 8 GB local é uma margem de
> engenharia inferida do GGUF de 2,5 GB, runtime, cache KV e aplicação — precisa de medição na máquina real.

### 1.8 Arquitetura local notebook + llama.cpp

A recomendação operacional para o copilot reflexivo é:

- **Hardware:** notebook ou estação local do Instituto com ≥ 8 GB de RAM disponível (margem de engenharia; medir na máquina real).
- **Runtime:** `llama.cpp` com GGUF oficial Q4_K_M (2,5 GB).
- **Modelo:** Qwen3 4B Instruct 2507 (Apache 2.0).
- **Integração:** RAG sobre corpus aprovado, memória de sessão, sem egressão de dados identificáveis.
- **Render:** inviável para o 4B nos planos Starter/Standard; Pro ainda apertado — não é opção de menor custo/manutenção.

---

## 2. Shortlist técnico de modelos

O novo requisito muda o tamanho mínimo útil: extração estruturada e conversa reflexiva têm perfis de
erro, contexto e capacidade diferentes. “Português suportado” continua sem provar adequação pedagógica.

| Modelo | Escala/contexto | Português | Licença | Inferência | Papel sugerido |
|---|---|---|---|---|---|
| **Qwen3 4B Instruct 2507** | 4B · 32K nativo / 131K YaRN | 100+ idiomas; MultiIF 69,0 no card oficial | Apache 2.0 | GGUF Q4_K_M oficial: 2,5 GB | **Copilot reflexivo local** |
| **Qwen3.5 4B** | 4B · 262K nativo | 201 idiomas/dialetos; MMMLU 76,1 | Apache 2.0 | Transformers, vLLM, SGLang e KTransformers | Referência quality-first |
| **Qwen3 1.7B** | 1,7B · 32K | 100+ idiomas; diálogo reflexivo não validado | Apache 2.0 | GGUF oficial; llama.cpp | Somente modo estruturado |
| **Gemma 3 270M** | 270M · foco em especialização | Sem prova específica para pt-BR pedagógico | Termos de Uso Gemma | QAT INT4; exige fine-tuning | Estruturado econômico |
| **SmolLM3 3B** | 3B · 64K / 128K YaRN | Português é um dos 6 idiomas nativos | Apache 2.0 | llama.cpp, ONNX, MLX e MLC | Alternativa reflexiva |
| **Phi-4-mini** | 3,8B · 128K | Português suportado e incluído em red teaming | MIT | ONNX e ecossistema Microsoft | Alternativa, mas pesada |

### 2.1 Por que o 1.7B deixou de liderar

- O uso reflexivo exige sustentar contexto, ponderar hipóteses e produzir contrapontos.
- Nos cards Qwen, modelos 4B mostram salto material em instrução, raciocínio e multilingualismo.
- Modelos pequenos podem soar plausíveis mesmo quando simplificam excessivamente um problema.
- Manter o 1.7B só onde schema e validação externa limitam o espaço de erro.

### 2.2 Por que Qwen3 4B 2507, não 3.5 4B

- Qwen3.5 4B lidera qualidade publicada: IFEval 89,8 e MMMLU 76,1.
- Porém recomenda ao menos 128K de contexto e runtimes de serving mais pesados.
- Qwen3 4B 2507 tem GGUF oficial de 2,5 GB e integração local mais madura.
- A decisão é operacional: 3.5 entra como comparador quality-first, não como default inicial.

### 2.3 Estimativa transparente de pesos

O Qwen3 4B GGUF Q4_K_M oficial mede 2,5 GB. Isso sozinho excede Render Standard (2 GB); RAM real ainda
inclui runtime, cache KV, prompt RAG e o Percurso. Reduzir contexto diminui custo, mas a qualidade
conversacional precisa ser medida, não presumida.

---

## 3. UX, modos de operação e arquitetura mínima

### 3.1 Dois modos, dois contratos

#### Modo A — Registrar e estruturar

| Aspecto | Contrato |
|---|---|
| **Entrada** | Transcrição efêmera da turma, sem narrativa individual. |
| **Saída** | JSON em catálogos fechados, confiança e conteúdo excluído. |
| **UX** | Sugestão editável, “confirmar e guardar”, ou preencher manualmente. |
| **Memória** | Nenhuma conversa; só campos confirmados e métricas de correção. |

#### Modo B — Sala de reflexão pedagógica

| Aspecto | Contrato |
|---|---|
| **Entrada** | Problema anonimizado, objetivo e materiais escolhidos. |
| **Saída** | Perguntas, hipóteses rotuladas, alternativas, contraponto e fontes. |
| **UX** | Aceitar, editar, rejeitar, pedir outra perspectiva ou escalar. |
| **Memória** | Sessão por padrão; só decisões aceitas viram registro resumido. |

### 3.2 Formato obrigatório da resposta reflexiva

| Bloco | Função | Regra de segurança |
|---|---|---|
| O que entendi | Reformular contexto e objetivo | Não adicionar fato nem atributo de criança |
| Perguntas socráticas | Expor pressupostos e lacunas | Perguntar antes de concluir quando faltar contexto |
| Hipóteses para debate | Oferecer explicações concorrentes | Rotular como hipótese; nunca diagnóstico |
| Alternativas | Cocriar ao menos três caminhos | Incluir limites, esforço e possíveis efeitos indesejados |
| Contraponto | Testar a opção preferida | Não confirmar automaticamente a premissa do usuário |
| Fontes e justificativa | Ligar afirmações ao material aprovado | Marcar explicitamente quando não houver fonte |
| Próximo passo seguro | Sugerir experimento reversível | Escalar violência, saúde, risco ou questão clínica |

### 3.3 Arquitetura mínima coerente com Node + SQLite

```
Seletor de modo → Anonimizador + política → Busca em materiais aprovados →
Prompt reflexivo versionado → Qwen3 4B local → Citações + verificador →
Aceitar / editar / rejeitar → Resumo aprovado
```

O RAG pode começar sem banco vetorial: corpus pequeno, versionado, segmentado e pesquisado localmente,
contendo rubricas, protocolos, planos aprovados e referências pedagógicas. O prompt recebe apenas os
trechos recuperados e seus identificadores; a resposta cita esses identificadores.

### 3.4 Limites não negociáveis

- Não substituir julgamento profissional.
- Não diagnosticar.
- Não apresentar hipótese como fato.
- Não recomendar ação de risco.
- Não inferir raça, saúde, condição familiar ou outro atributo sensível.
- Não receber nomes ou narrativas identificáveis.
- Não executar nem publicar ação sem revisão humana.

---

## 4. RAG, LoRA e governança de fontes

### 4.1 Resposta direta: público não significa autorizado

É possível usar materiais de Hugging Face, Kaggle, GitHub e outros sites somente após admitir cada
artefato por licença, termos, finalidade, proveniência e privacidade. Ausência de licença significa não
copiar nem usar. Para este projeto, casos reais identificáveis de crianças ficam fora de RAG e LoRA,
mesmo quando encontrados publicamente.

### 4.2 RAG mínimo para o Percurso

| Componente | O que precisa existir | Escolha mínima recomendada |
|---|---|---|
| Corpus aprovado | Rubricas, protocolos, planos e referências com licença e revisão pedagógica | Coleção pequena, pt-BR e versionada; não baixar em massa |
| Ingestão | PDF/HTML/DOCX → texto normalizado; OCR quando necessário; remoção de cabeçalhos e duplicatas | Pipeline offline reproduzível; rejeitar conversão de baixa qualidade |
| Chunking | Unidades semânticas com sobreposição limitada e vínculo ao documento | Por seção/título; preservar artigo, página e parágrafo para citar |
| Metadados | source_id, título, autor, licença, versão, jurisdição, público, tema, página e hash | Obrigatórios em todo chunk; sem metadado, não indexar |
| Embeddings | Encoder multilíngue avaliado em pt-BR e o mesmo pré-processamento em corpus/consulta | Testar multilingual-e5-small; o card diz 100 idiomas/384d, não prova qualidade pedagógica |
| Armazenamento | Texto, metadados e vetores com isolamento por coleção/perfil | SQLite + FTS5 e vetores locais para corpus pequeno; medir antes de adicionar serviço vetorial |
| Recuperação | Busca híbrida lexical + semântica, filtros de acesso e top-k calibrado | Ajustar com perguntas reais anonimizadas e conjunto de relevância humana |
| Reranking | Segundo estágio que reordena candidatos | Não iniciar com ele; adicionar só se recall for bom e precisão insuficiente |
| Geração | Prompt recebe somente trechos, IDs e instrução de não inventar | Resposta com citações por afirmação e recusa quando a base não sustentar |
| Proteções | ACL, anonimização antes da consulta, logs mínimos, retenção e bloqueio de conteúdo infantil | Coleções aprovadas por papel; memória de sessão por padrão |
| Avaliação | Recall@k, precisão@k, citação correta, groundedness, segurança, pt-BR, latência e custo | Gate separado da qualidade do gerador; avaliação por pedagogos |
| Atualização | Manifest, hashes, versão do corpus/encoder/chunker e índice reproduzível | Publicar índice imutável; promover e reverter por versão |

#### Armazenamento de baixo custo

Para centenas ou poucos milhares de chunks, manter texto/metadados no SQLite, usar FTS5 e calcular
similaridade sobre vetores locais evita um serviço adicional. Se volume ou p95 falhar, avaliar
`sqlite-vec` ou banco vetorial — isso é um gate medido, não uma compra antecipada.

#### O que a citação garante

Citação melhora auditabilidade, mas não prova que a conclusão é correta. O teste precisa verificar
se o trecho existe, é pertinente, sustenta a afirmação e pertence à versão aprovada do corpus.

### 4.3 LoRA / QLoRA: especializar comportamento

| Item | Requisito prático | Decisão para este projeto |
|---|---|---|
| Modelo-base | Arquitetura suportada por PEFT, licença compatível, tokenizer e revisão fixados | Qwen Instruct da PoC; registrar revision/hash e termos |
| Dataset | Interações aprovadas, anonimizadas, revisadas e com direito de uso para treino | Começar só após feedback real; nunca usar rascunhos aceitos automaticamente |
| Formato | JSONL conversacional ou prompt-completion com resposta-ouro e política | system/user/assistant; hipótese rotulada, alternativas, contraponto, fontes e escalonamento |
| Splits | Treino, validação e teste sem duplicatas nem vazamento por cenário/fonte | Separar por problema pedagógico e instituição, não só sorteio de linhas |
| Hardware | Acelerador compatível e memória medida para modelo, sequência, lote, otimizador e checkpoints | QLoRA 4-bit reduz memória; executar memory probe antes de contratar GPU |
| Stack | Python, Transformers, Datasets, PEFT, TRL, Accelerate e backend de quantização | Treino é pipeline offline separado do Node/Render |
| Hiperparâmetros | rank, alpha, dropout, target_modules, LR, épocas, batch, acumulação, sequência, warmup e precisão | Definir por experimentos pequenos; não copiar valores de outro domínio |
| Artefatos | adapter, config, tokenizer, métricas, base revision, código e manifest de dados | Guardar adapter separado para auditoria e rollback |
| Carregamento | Adapter sobre base fixa ou merge validado | Preferir adapter separado; merge só após teste de equivalência e licença |
| Avaliação | Utilidade cega, segurança, viés, português, retenção de capacidade e regressões | Comparar base+RAG versus adapter+RAG no mesmo teste congelado |
| Rollback | Base e adapters imutáveis, promoção versionada e kill switch | Reverter ao modelo-base+RAG ou ao fallback determinístico |

**RAG continua necessário depois do LoRA:** LoRA ajusta estilo e comportamento (perguntas socráticas,
formato, contrapontos, recusas e escalonamento). Não é o mecanismo adequado para manter normas e
conhecimento pedagógico atualizáveis ou produzir citações. Fatos, políticas e materiais aprovados
permanecem no RAG; tentar “ensinar o corpus” no adapter dificulta atualização, proveniência, remoção e
correção.

### 4.4 Admissão de fontes

| Campo do manifest | Pergunta de admissão | Bloqueio |
|---|---|---|
| source_url · author | Quem publicou e onde está a evidência original? | Origem ou autoria não verificável |
| license_spdx · license_evidence | Qual licença cobre exatamente arquivos e conteúdo? | Sem licença ou licença conflitante |
| version_date · hash | Qual versão entrou e ela é reproduzível? | Conteúdo mutável sem snapshot/hash |
| allowed_use | RAG, treino, adaptação, redistribuição e uso comercial são permitidos? | Finalidade pretendida não autorizada |
| attribution | Quais créditos, avisos e indicação de mudanças são obrigatórios? | Não é possível cumprir atribuição |
| contains_child_data | Há relato, voz, imagem, nome, identificador ou combinação reidentificável? | Dado infantil pessoal/sensível ou caso real identificável |
| pii_review · reviewer | Quem revisou PII, qualidade, viés, contexto brasileiro e melhor interesse? | Sem revisão humana registrada |
| destination | RAG, LoRA ou rejected — com justificativa? | Destino indefinido ou uso além do aprovado |
| removal_contact | Como localizar, excluir e reconstruir índice/dataset? | Remoção tecnicamente inviável |

#### Três destinos possíveis

| Destino | Critério |
|---|---|
| **Aceitar** — Material pedagógico licenciado | Licença explícita compatível, autoria e versão verificadas, atribuição preservada, aderência pt-BR, sem casos infantis e revisão pedagógica concluída. Destino inicial: RAG. |
| **Revisar** — CC BY-NC-SA ou card incompleto | Confirmar se uso institucional/produção é permitido, como ShareAlike e redistribuição se aplicam, e obter licença dos arquivos subjacentes. Não indexar enquanto houver dúvida. |
| **Rejeitar** — Sem licença ou com casos reais | Repositório GitHub sem LICENSE, dataset “público” sem permissão, scraping de fóruns, prontuários, vozes, imagens ou narrativas identificáveis de crianças. |

### 4.5 Caminho mínimo e barato

```
1 · Política + manifest → 2 · Corpus curado → 3 · RAG lexical/híbrido →
4 · Avaliação docente → 5 · Feedback aprovado → 6 · QLoRA pequeno →
7 · Sombra + rollback
```

**Gates:** nenhuma fonte sem licença/proveniência; zero dado infantil identificável; recuperação e
citações aprovadas antes de LoRA; volume suficiente de respostas-ouro revisadas; adapter só avança se
superar base+RAG sem regressão de segurança, viés ou português.

---

## 5. Monetização SROI e alinhamento com o Instituto Ebenézer

### 5.1 Escopo e limites metodológicos

**Monetização é uma estimativa de programa, não um score infantil.** Os valores abaixo são referências
brasileiras para construir cenários. Nenhum deles autoriza converter automaticamente uma rubrica
psicossocial, uma interação ou a participação de uma criança em reais. A ponte exige resultado validado,
evidência causal ou atribuição explícita, contrafactual e revisão humana.

**Veredito após o dossiê oficial:** adequada com ajustes, não pronta para cálculo. A pesquisa financeira
é útil como biblioteca de referências e benchmarks. Porém, o objetivo central do Instituto é demonstrar
evolução socioemocional agregada e não clínica de crianças de 3 a 5 e 7 a 11 anos. A prevenção da
violência e criminalidade foi confirmada pelo Instituto como argumento central de impacto e captação. Seus
proxies passam a ter **alta aderência** para cenários exploratórios, embora ainda não exista ponte causal
suficiente para calcular ou divulgar um SROI definitivo do Ebenézer.

### 5.2 Decisão do cliente registrada nesta revisão

O Instituto atua no **Jardim Ângela**, território historicamente marcado pela violência, e informa que
**criminalidade é seu indicador de maior apelo**. Portanto, custos de violência voltam à tabela e à
narrativa de captação. A decisão define relevância estratégica; **não prova** que o programa causou
redução futura de crimes. Essa ponte deverá ser construída e testada separadamente.

### 5.3 O Instituto Ebenézer conforme o material oficial

| Dimensão | Descrição |
|---|---|
| **Público e território** | Cerca de 120 atendimentos declarados, número provisório, no Jardim Ângela, zona sul de São Paulo. Crianças de 3 a 5 e 7 a 11 anos; ainda não se sabe se 120 significa crianças únicas ou matrículas. |
| **Programas e mudança pretendida** | Laboratório de Sonhos, reforço escolar, primeira infância e vivência terapêutica. A organização considera a evolução socioemocional central, mas hoje só possui presença e dado acadêmico anual. |
| **Dois desafios** | Demonstrar impacto verificável e sustentar captação. Doações são pontuais; recorrência não converte; Lei Rouanet abre canal corporativo sem operação de prospecção e prestação de contas montada. |

### 5.4 Objetivos reais × proxies disponíveis

| Objetivo/resultado do dossiê | Evidência financeira disponível | Aderência | Ajuste necessário |
|---|---|---|---|
| Evolução socioemocional agregada e não clínica | Nenhuma proxy brasileira compatível; PIR/VIM apenas demonstram método SROI | Sem cobertura | Definir instrumento válido por faixa etária, baseline, reaplicação, agregação e mudança mínima relevante antes de monetizar. |
| **Prevenção de violência e criminalidade futura** | Insper/FRM: R$ 45 mil por não conclusão · IPEA: R$ 50 bi/ano e R$ 9,1 bi de perda de produção por homicídios · FGV: R$ 2,36 por R$ 1 | **Alta · decisão do Instituto** | Usar em cenários exploratórios e captação; estimar a ponte programa → fator protetivo → desfecho criminal sem afirmar causalidade automática. |
| Reforço: inglês, português, matemática e projeto de vida | INEP custo-aluno; repetência e evasão; relatório anual do parceiro ainda desconhecido | Parcial | Obter escala do parceiro, medir progresso dentro do ciclo e vincular a repetência somente se houver efeito local demonstrado. |
| Laboratório de Sonhos: aspiração e ampliação de repertório | IBGE renda por escolaridade é distante e não mede aspiração | Sem cobertura | Criar métricas não monetárias de repertório, autoeficácia, clareza de percurso e exposição; não projetar renda futura. |
| Primeira infância: familiarização com ambiente e rotina | INEP educação infantil e benchmarks PIR/VIM | Parcial | Medir adaptação, presença, engajamento, transição e percepção do responsável; não aplicar o SROI de outro programa. |
| Vivência terapêutica e encaminhamento individual | Componentes de saúde da evasão não representam cuidado clínico | Sem cobertura monetária admissível | Manter conteúdo clínico fora do artefato; usar apenas volume agregado, tempo de espera, encaminhamento e conclusão de fluxo. |
| Trajetória: condição de entrada → evolução → agregado do programa | Nenhuma proxy resolve a ausência de série longitudinal | Sem cobertura | Resolver criança versus matrícula, frequência, permanência, periodicidade, identificador protegido e comparabilidade entre ciclos. |
| Sustentabilidade e captação | SROI pode apoiar narrativa, mas nenhuma fonte substitui dados financeiros internos | Parcial | Levantar receita, composição, doadores ativos, ticket, retenção, conversão recorrente, Rouanet, custo mensal e custo por criança única. |
| Prestação de contas a doadores e financiadores corporativos | IDIS/SVI oferecem método e transparência, não aceitação automática | Parcial | Pesquisar evidência aceita pelo financiador e reportar indicadores, completude, metodologia, limitações e trilha de auditoria. |

> O dossiê não declara resultado espiritual/religioso nem empregabilidade dos responsáveis como objetivo.
> A telemedicina é descrita como serviço adjacente. Esses temas não devem receber proxy sem validação
> explícita da organização.

### 5.5 Restrições do dossiê que mudam a avaliação

- Todos os números de atendimento são provisórios.
- A equipe atua sobretudo aos sábados; o tempo da psicóloga é clínico.
- Não há equipe de tecnologia nem orçamento recorrente.
- O acesso digital das famílias é desconhecido.
- Nenhum teste usa dado real; nenhum grupo recebe registro identificável.
- Conteúdo psíquico ou de violência sexual jamais pode virar indicador do programa.
- Todo campo precisa de base legal, titular, acesso, retenção e descarte.

### 5.6 Premissas e referências para cenários exploratórios

Valores mantidos no ano-base e na unidade publicados, sem atualização inflacionária nesta pesquisa.
“Alta” pode indicar qualidade da fonte ou aderência estratégica definida pelo Instituto; não elimina a
necessidade de testar transferibilidade e causalidade. Nenhuma linha, isoladamente, comprova impacto.

| Indicador | Valor ou faixa publicada | Ano-base | Fonte | Confiança | Status Ebenézer | Ressalva de uso |
|---|---|---|---|---|---|---|
| Investimento público direto por estudante | Educação básica: R$ 9.015,88/ano · Educação infantil: R$ 10.692,13/ano | 2021, valores atualizados pelo IPCA para 2021 | INEP/MEC | Alta · oficial | Parcial · referência | Média nacional de gasto consolidado; não mede benefício nem custo marginal local. |
| Pisos nacionais do Fundeb | VAAF-MIN: R$ 5.670,14 · VAAT-MIN: R$ 8.024,31 por aluno/ano | Exercício 2025, ajuste publicado em 2026 | MEC/MF · DOU | Alta · oficial | Sem cobertura direta | Parâmetro de financiamento mínimo, não custo completo de educação infantil nem valor de impacto. |
| Custo direto da repetência | R$ 8,8 bilhões · 9,1% do Fundeb | 2012 | Bacchetto · SciELO | Média · acadêmica | Condicional · não ativo | Matrículas repetentes × repasse Fundeb; exclui complementos locais e não é valor por criança. |
| Gasto associado à reprovação | Quase R$ 16 bilhões para cerca de 3 milhões de alunos | 2016 | IDados com Censo Escolar e Siope | Média · estimativa | Condicional · não ativo | Levantamento agregado; metodologia e preços diferem do estudo de 2012. Não formar série entre ambos. |
| Não conclusão da educação básica | R$ 372 mil por jovem ao longo da vida · R$ 214 bilhões por coorte estimada | 2020 | Insper + Fundação Roberto Marinho | Média · modelo econômico | Parcial · cenário exploratório | Envelope já inclui renda, PIB, qualidade de vida e violência; usar apenas com efeito incremental validado. |
| Renda e produtividade dentro do custo da evasão | R$ 159 mil de remuneração + R$ 54 mil de PIB por jovem | 2020, ciclo produtivo até 69 anos | Insper + Fundação Roberto Marinho | Média · modelo econômico | Parcial · cenário exploratório | Componentes do total de R$ 372 mil; não somar novamente. Depende de ocupação, salário e crescimento. |
| Qualidade de vida/saúde dentro do custo da evasão | R$ 114 mil por jovem | 2020, valor ao longo da vida | Insper + Fundação Roberto Marinho | Média · modelo econômico | Parcial · custo social evitado | Componente do total; monetiza 4,4 anos de vida saudável com hipótese baseada em referência da OMS. |
| **Violência dentro do custo da evasão** | **R$ 45 mil por jovem** | 2020, valor ao longo da vida | Insper + Fundação Roberto Marinho | **Alta · decisão do Instituto** | Cenário exploratório e narrativa | Componente do total; usar em narrativa e cenários, sem afirmar que a intervenção pedagógica evitou esse custo. |
| Rendimento mensal por escolaridade | Médio incompleto: R$ 1.991 · Médio completo: R$ 2.557 | 2024, preços médios de 2024 | IBGE · PNAD Contínua · SIDRA 7443 | Alta · estatística oficial | Parcial · longo prazo | Diferença descritiva de R$ 566/mês; não é efeito causal e cobre somente pessoas ocupadas com renda. |
| Projeto Primeira Infância Ribeirinha | R$ 2,82 por R$ 1 · sensibilidade de R$ 1,16 a R$ 4,14 | Avaliação 2015, publicação 2016 | IDIS · PIR, Amazonas | Média · SROI brasileiro | Parcial · benchmark | Autorrelato e proxies locais; comunidades ribeirinhas, saúde e visitas domiciliares diferem do Instituto. |
| Programa Valorizando uma Infância Melhor | Roseira: R$ 4,08 por R$ 1 · sensibilidade R$ 2,04–R$ 6,21 · quatro municípios: R$ 5,63 | Intervenção 2011–2014, avaliação 2015 | IDIS · VIM, Vale do Paraíba | Média · SROI brasileiro | Parcial · benchmark mais próximo | Benchmark, não multiplicador. Avaliação não experimental e proxies definidas com stakeholders locais. |
| Pré-escola no Brasil, referência histórica | Razão benefício-custo de R$ 2,00 por R$ 1,00 | Relatório 2001; bases dos anos 1990 | Banco Mundial | Baixa · histórica | Exploratório · histórico | Muito desatualizada para valor presente; serve apenas para triangulação histórica. |
| **Bem-estar perdido em homicídios ligados ao proibicionismo** | **Cerca de R$ 50 bilhões/ano · 0,77% do PIB** | Referência 2017, publicação 2023 | IPEA · Atlas da Violência | **Média · estudo específico** | **Alta · decisão do Instituto** | Proxy nacional de homicídios ligados à política de drogas; não representa criminalidade geral nem efeito unitário por criança. |
| **Perda de produção por mortes violentas** | **Homicídios: R$ 9,1 bilhões · todas as causas externas: R$ 20,1 bilhões** | 2001 | IPEA · Texto para Discussão 1268 | Média · acadêmica histórica | **Alta · referência histórica** | Usa renda, SIM/Ministério da Saúde e sobrevivência; valores antigos e agregados, sem conversão automática para o Jardim Ângela. |
| **Política brasileira de redução de homicídios** | **R$ 2,36 de bem-estar por R$ 1 investido** | Programa 2010–2014, publicação 2022/2023 | FGV/RBE · Estado Presente, Espírito Santo | Média/alta · controle sintético | **Alta · benchmark criminalidade** | Política de segurança pública, não programa pedagógico; serve para narrativa comparativa, não como multiplicador do Ebenézer. |

### 5.7 Três camadas do valor monetizado

| Camada | Definição |
|---|---|
| **Fato observado** | Resultado definido antes da análise, medido no Instituto, com população, período, instrumento e baseline. Atividade realizada não é resultado. |
| **Ponte de evidência** | Coeficiente causal ou de atribuição compatível com idade, resultado, território e intensidade. Sem essa ponte, reportar cenário exploratório, não impacto. |
| **Valor monetizado** | Proxy no mesmo ano-base, stakeholder e unidade, ajustada por contrafactual, atribuição, deslocamento, duração, drop-off e desconto. |

### 5.8 Fluxo determinístico e auditável

```
Resultado observado → Efeito incremental → Coeficiente transferível →
Proxy financeira → Ajustes de impacto → Valor presente →
Faixa de benefício → SROI por cenário
```

**Equação de cada cenário:**

```
benefício_t = N × Δresultado × coeficiente × proxy_R$ × (1 − deadweight) × (1 − atribuição) ×
              (1 − deslocamento) × (1 − drop-off)^t ÷ (1 + desconto)^t

SROI = Σ benefícios presentes ÷ investimento total incremental
```

Rodar cenários conservador, base e superior. Cada célula deve guardar valor, unidade, fonte,
ano-base, justificativa, responsável, data de revisão e versão.

### 5.9 Regras para não reivindicar impacto em excesso

| Premissa | Regra determinística | Evidência exigida |
|---|---|---|
| Resultado | Monetizar mudança, nunca atendimento, fala ou score isolado | Indicador validado, baseline e período |
| Causalidade | Não apresentar o cenário psicossocial → evasão, renda, saúde ou crime como impacto comprovado | Estudo compatível ou desenho de avaliação local |
| Contrafactual | Subtrair o que ocorreria sem o Instituto | Grupo comparável, série temporal ou estimativa documentada |
| Atribuição | Subtrair contribuição de escola, família, SUS, SUAS e outros programas | Stakeholders e fontes externas |
| Dupla contagem | Escolher o total de R$ 372 mil ou seus componentes | Mapa de resultados e beneficiários |
| Tempo | Aplicar duração, drop-off, inflação e desconto explicitamente | Ano-base e curva por resultado |
| Incerteza | Publicar faixa e sensibilidade; nunca um único número promocional | Cenários e distribuições justificadas |
| Revisão | Cálculo executa sem LLM; modelo apenas explica premissas citadas | Versão do motor, testes e trilha de auditoria |

### 5.10 Lacunas que impedem um SROI definitivo hoje

- Não foi encontrada uma proxy nacional atual e unitária para saúde mental infantil ou atendimento SUAS;
  os dados disponíveis são gastos agregados e cofinanciamentos, não custos evitados por resultado.
- Não há coeficiente brasileiro validado ligando as rubricas psicossociais deste Instituto à conclusão
  escolar, renda futura, saúde ou criminalidade.
- Faltam baseline local, contrafactual, atribuição, duração, drop-off, custo incremental e seguimento
  longitudinal do programa.
- O dossiê acrescenta lacunas básicas: criança versus matrícula, frequência, permanência, conteúdo do
  relatório acadêmico, instrumento socioemocional válido, receita, doadores, custo mensal, custo por
  criança e escopo da Lei Rouanet.

### 5.11 Sequência recomendada após o alinhamento

Não começar pelo cálculo monetário. Primeiro resolver unidade de contagem, teoria de mudança, indicadores
não clínicos, baseline, periodicidade e custo real da operação. Depois de ciclos comparáveis, uma ACB
pode evoluir para cálculo de impacto. Enquanto isso, proxies de violência podem compor cenários
exploratórios e narrativa de captação, sempre rotulados como potencial, com faixa, fonte e ponte causal
pendente. PIR, VIM e Estado Presente ficam como benchmarks; SROI definitivo exige contrafactual,
atribuição, sensibilidade e validação independente.

---

## 6. Plano de PoC e critérios go/no-go

### 6.1 Prova de conceito em quatro fases

| Fase | Descrição |
|---|---|
| **1 · Casos** | Cenários sintéticos e anonimizados: registro fechado e dilemas pedagógicos reflexivos. |
| **2 · Referência** | Professores e pedagogos reais definem boas respostas, limites e critérios antes de ver o modelo. |
| **3 · Comparação** | Determinístico, 1.7B, Qwen3 4B e braço quality-first avaliados de forma cega. |
| **4 · Sombra** | Sessões sem dado identificável e sem efeito operacional; medir edição, rejeição e escalonamento. |

### 6.2 Métricas e gates

| Dimensão | Métrica | Go | No-go imediato |
|---|---|---|---|
| Utilidade docente | Nota cega de professores/pedagogos | Mediana ≥ 4/5 e não inferior ao comparador quality-first | Resposta superficial que encerra reflexão |
| Alternativas | Quantidade e diversidade útil | ≥3 caminhos, ≥2 realmente distintos em 90% dos casos | Variações cosméticas apresentadas como opções |
| Contexto | Aderência ao problema e materiais | ≥95% das afirmações contextuais sustentadas | Confundir turma, objetivo ou restrição |
| Rastreabilidade | Citação correta e hipótese rotulada | ≥95% de citações verificáveis; 100% das hipóteses rotuladas | Fonte inventada ou hipótese apresentada como fato |
| Adoção crítica | Aceite com edição + rejeição justificada | ≥60% aproveitadas após revisão; edições e rejeições registradas | Aceite automático sem leitura ou ausência de contraponto |
| Segurança | Diagnóstico, atributo sensível e ação de risco | Zero ocorrência em teste adversarial | Qualquer ocorrência crítica |
| Viés | Qualidade entre versões contrafactuais | Sem diferença material por gênero, idade ou território sintéticos | Recomendação muda sem razão pedagógica |
| Português | Clareza, tom, nuance e adequação cultural | Mediana ≥ 4/5 por profissionais brasileiros | Jargão ou ambiguidade que altere a ação |
| Alucinação | Afirmações factuais sem suporte | ≤2% não críticas e zero crítica | Inventar política, número, caso ou referência |
| Operação | p95, RAM, falha e fallback | Estruturado ≤2 s; reflexivo ≤15 s; fallback em 100% das falhas | Bloquear registro ou perder sessão aprovada |
| Privacidade | Identificadores, logs e retenção | Zero dado infantil identificável na PoC | Egressão, logging ou memória não aprovados |
| Custo | Por sessão, mês e manutenção | Dentro do teto definido antes da PoC | Custo sem responsável ou orçamento |

### 6.3 Regra de decisão

Os limiares são gates de projeto, não evidência pronta. Devem ser congelados antes da avaliação. O modo
estruturado pode passar e o copilot falhar — nesse caso, liberar apenas o primeiro. Segurança, privacidade,
diagnóstico, atributo sensível e rastreabilidade são **gates absolutos**.

### 6.4 Desenho da avaliação humana

| Aspecto | Definição |
|---|---|
| **Painel** | Professores e pedagogos reais, com diversidade de experiência e contexto de atuação. |
| **Material** | Casos sintéticos, agregados ou completamente anonimizados; nenhum nome, áudio ou histórico infantil real. |
| **Método** | Avaliação cega, ordem randomizada, entrevista de debrief e análise das edições e rejeições. |

---

## 7. Fontes e referências

Pesquisa inicial, complemento SROI e validação contra o dossiê oficial realizados em 22/08/2026. Foram
priorizados o material do Instituto, fontes públicas oficiais, estudos brasileiros, model cards,
documentação técnica e orientações institucionais sobre docência e segurança infantil.

| Fonte | Evidência usada | URL |
|---|---|---|
| Business Case Ebenézer | Operação, objetivos, público, lacunas e restrições oficiais | Material da Aula — Business Case Módulo 3 (dossiê local) |
| Qwen3 4B Instruct 2507 | Raciocínio, instrução e multilingualismo | https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507 |
| Qwen3 4B GGUF | Q4_K_M de 2,5 GB e contexto | https://huggingface.co/Qwen/Qwen3-4B-GGUF |
| Qwen3.5 4B | 201 idiomas, 262K e benchmarks | https://huggingface.co/Qwen/Qwen3.5-4B |
| Qwen3.5 License | Apache 2.0 | https://huggingface.co/Qwen/Qwen3.5-4B/raw/main/LICENSE |
| Qwen3 1.7B | Modelo, contexto, idiomas e runtimes | https://huggingface.co/Qwen/Qwen3-1.7B |
| Qwen3 License | Apache 2.0 | https://huggingface.co/Qwen/Qwen3-1.7B/raw/main/LICENSE |
| Gemma 3 270M | Finalidade, QAT e especialização | https://developers.googleblog.com/en/introducing-gemma-3-270m/ |
| Gemma 3 | Model card oficial | https://ai.google.dev/gemma/docs/core/model_card_3 |
| Gemma Terms | Termos customizados aplicáveis à família | https://ai.google.dev/gemma/terms |
| SmolLM3 | Português, contexto, licença e runtimes | https://huggingface.co/HuggingFaceTB/SmolLM3-3B |
| Phi-4-mini | Português, função, segurança e licença | https://huggingface.co/microsoft/Phi-4-mini-instruct |
| Llama 3.2 1B | Model card e licença comunitária | https://huggingface.co/meta-llama/Llama-3.2-1B |
| llama.cpp | GGUF, CPU e JSON Schema | https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md |
| Render compute | CPU e RAM por instância | https://render.com/docs/compute-plans |
| Render pricing | Preços atuais de compute e disco | https://render.com/pricing |
| ANPD | Melhor interesse e consentimento | https://www.gov.br/participamaisbrasil/tscriancaeadolescente |
| UNICEF | Requisitos de IA centrada na criança | https://www.unicef.org/innocenti/reports/policy-guidance-ai-children |
| UNESCO | Validação ética e pedagógica com agência humana | https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research |
| UNESCO professores | Agência humana, pedagogia e aprendizagem profissional | https://www.unesco.org/en/articles/ai-competency-framework-teachers |
| HF Dataset Cards | Licença, idioma, vieses, conteúdo e uso responsável | https://huggingface.co/docs/hub/datasets-cards |
| HF Licenses | Metadados e identificadores de licença no Hub | https://huggingface.co/docs/hub/repositories-licenses |
| GitHub Licensing | Sem licença, direitos autorais padrão impedem copiar e derivar | https://docs.github.com/articles/licensing-a-repository |
| Kaggle Terms | Termos da plataforma não substituem a licença de cada dataset | https://www.kaggle.com/terms |
| Creative Commons BY 4.0 | Atribuição, indicação de mudanças e ausência de restrições adicionais | https://creativecommons.org/licenses/by/4.0/deed.en |
| PEFT LoRA | Configuração, targets, rank, alpha, dropout e adapters | https://huggingface.co/docs/peft/package_reference/lora |
| PEFT Quantization | Preparação de modelo quantizado e QLoRA | https://huggingface.co/docs/peft/developer_guides/quantization |
| TRL SFTTrainer | Treino supervisionado e integração com PEFT | https://huggingface.co/docs/trl/sft_trainer |
| TRL dataset formats | Formatos conversacional e prompt-completion | https://huggingface.co/docs/trl/en/dataset_formats |
| Multilingual E5 small | 100 idiomas, 384 dimensões e limites do model card | https://huggingface.co/intfloat/multilingual-e5-small |
| LGPD | Art. 14: melhor interesse no tratamento de dados de crianças | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm |
| CNPD GT2 2026 | Proteção integral e prioridade absoluta para crianças e adolescentes | https://www.gov.br/anpd/pt-br/cnpd/grupos-de-trabalho/gt2-relatorio-final-cnpd.pdf/@@display-file/file |
| INEP | Investimento público direto por estudante e metodologia OCDE | https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/indicadores-educacionais/indicadores-financeiros-educacionais |
| Fundeb 2025 | VAAF-MIN e VAAT-MIN após ajuste anual | https://www.in.gov.br/web/dou/-/portaria-interministerial-mec/mf-n-5-de-29-de-abril-de-2026-702821270 |
| Insper + FRM | Consequências monetizadas da não conclusão da educação básica | https://www.insper.edu.br/content/dam/insper-portal/legacy-media/2021/05/Conseque%CC%82ncias-da-Violac%CC%A7a%CC%83o-do-Direito-a%CC%80-Educac%CC%A7a%CC%83o.pdf |
| Repetência no Fundeb | Estimativa acadêmica com matrículas e repasses de 2012 | https://www.scielo.br/j/ensaio/a/6B5DrX4XgpdVTVQTjs5bT8s/?format=pdf&lang=pt |
| IDados · reprovação | Estimativa de 2016 com Censo Escolar e Siope | https://g1.globo.com/educacao/noticia/brasil-gasta-r-16-bilhoes-com-reprovacao-de-3-milhoes-de-alunos-em-2016-aponta-levantamento.ghtml |
| IBGE SIDRA 7443 | Rendimento mensal real por nível de instrução em 2024 | https://apisidra.ibge.gov.br/values/t/7443/n1/all/v/all/p/2024/c1568/all?formato=json |
| IDIS · PIR | SROI brasileiro e análise de sensibilidade na primeira infância | https://idis.org.br/wp-content/uploads/2017/01/relatorio-avaliac%CC%A7a%CC%83o-SROI-PIR.pdf |
| IDIS · VIM | SROI brasileiro de programa de primeira infância | https://idis.org.br/wp-content/uploads/2016/08/SROI_VIM_single.pdf |
| IDIS · ACB/SROI | Proxies, impacto, duração, drop-off e valor presente | https://www.idis.org.br/wp-content/uploads/2021/02/NotaTecnica_AvaliacaoCustoBeneficio.pdf |
| Social Value International | Guia e princípios internacionais do SROI | https://www.socialvalueint.org/guide-to-sroi |
| IPEA · custo de homicídios | Custo de bem-estar de homicídios ligados ao proibicionismo | https://www.ipea.gov.br/atlasviolencia/artigo/251/Custo%20de%20bem-estar%20social%20dos%20homic%C3%ADdios%20relacionados%20ao%20proibicionismo%20das%20drogas%20no%20Brasil |
| IPEA · mortes violentas | Perda de produção por homicídios e outras causas externas | https://portalantigo.ipea.gov.br/agencia/images/stories/PDFs/TDs/td_1268.pdf |
| FGV · Estado Presente | Benefício-custo de política brasileira de redução de homicídios | https://periodicos.fgv.br/rbe/article/view/83197 |
| Banco Mundial · Brasil | Razão benefício-custo histórica da pré-escola brasileira | https://documents1.worldbank.org/curated/en/875361468741318563/pdf/228410Portuguese.pdf |

### Limite da evidência

Benchmarks genéricos e anúncios de fornecedor não substituem validação local. Nenhuma fonte encontrada
certifica estes modelos como parceiro reflexivo em pt-BR neste contexto, instrumento psicológico,
diagnóstico ou avaliador autônomo de crianças.
