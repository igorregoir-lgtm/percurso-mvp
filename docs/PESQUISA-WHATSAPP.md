# Automatizar as devolutivas por WhatsApp do Instituto Ebenézer — pesquisa e recomendação

*Gerado em 02/09/2026 · 3 frentes de pesquisa em paralelo · ~60 fontes lidas · Confiança: **alta** nos fatos de documentação oficial e de repositórios; **média** nos preços em BRL (fontes secundárias convergentes) e nos relatos de banimento (issues primárias existem, blogs são de fornecedores).*

> **Pergunta.** A chamada, os vídeos e o recado que o Instituto já manda toda semana, à mão, para o grupo dos pais e para o grupo dos apoiadores podem ir direto do Percurso para esses grupos?
>
> **Resposta curta.** **Para os grupos que já existem, não há caminho oficial** — a API da Meta só cria grupos próprios de até 8 pessoas e exige um selo que uma ONG de bairro não consegue. Os caminhos que chegam ao grupo existente (Baileys, Evolution, WAHA, Z-API) violam os Termos do WhatsApp e arriscam o número. O que dá para automatizar de forma lícita e barata é (1) **preparar tudo com um toque humano por grupo** — o que o Percurso já faz — e (2) **mandar a presença de cada criança ao próprio responsável, 1-para-1, pela API oficial**, por ~R$ 18/mês. E a pesquisa jurídica mudou a pergunta: a **lista nominal de presença no grupo dos pais não deveria sair nem à mão** — o agregado da turma, sim.

---

## Resumo executivo

1. **Grupos existentes são inalcançáveis pela via oficial.** A *Groups API* da Meta (2026) só cria grupos novos, de até **8 participantes**, e exige *Official Business Account* — selo que pede "notabilidade" e é negado à maioria ([Groups API](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups); [OBA](https://developers.facebook.com/documentation/business-messaging/whatsapp/official-business-accounts/)). Canais e Comunidades não têm API.
2. **A via oficial é 1-para-1 e custa pouco:** template *utility* a R$ 0,035 por mensagem entregue (BRL desde 07/2026) → 120 responsáveis × 1 msg/semana ≈ **R$ 18/mês** na Meta. O custo real é o provedor: de R$ 0 (Cloud API direta, Gupshup, Twilio) a R$ 200–300/mês (Umbler, BotConversa, 360dialog). Vídeo até 16 MB; PDF até 100 MB; um anexo por template.
3. **As bibliotecas não oficiais funcionam — e infringem os Termos.** Baileys (10,9k★), whatsapp-web.js (22,5k★), WPPConnect, WAHA, Evolution API: todas enviam texto, PDF e vídeo para grupo por QR ou *pairing code*. O ToS proíbe "auto-messaging" e clientes não autorizados; há banimentos documentados em 2025–2026, todos ligados a **disparo em massa**; não há relato primário de ban por 2–3 envios/dia em grupos próprios — mas o número pode cair, e o número é o único canal do Instituto com as famílias.
4. **Hugging Face não serve para enviar**, só para processar texto (resumo em pt-BR com `ptt5-base-summ`, classificação com BERTimbau). Os Spaces "whatsapp" são analisadores de export de chat, quase todos quebrados.
5. **A LGPD redesenha o conteúdo:** presença **nominal** da turma no grupo é repasse de dado de cada criança a terceiros (art. 14 §3º, art. 6º III); vídeo com criança para doadores exige autorização específica por finalidade e prazo, e crianças com histórico de violência não devem ser identificáveis (ECA art. 143; UNICEF; Save the Children). **O agregado ("18 de 22 presentes") não é dado pessoal** — e é exatamente o que o Percurso já gera (decisão 33).

---

## 1. O que a Meta permite hoje (via oficial)

| Caminho | Chega ao grupo existente? | Automatizável | Custo | Fonte |
|---|---|---|---|---|
| Template *utility* 1-para-1 (Cloud API), com opt-in de cada responsável | Não (é conversa individual) | Sim, 100% | R$ 0,035/msg + provedor | [Pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) |
| Groups API | Não — só grupos novos de ≤8, criados pelo número da API, com OBA | Sim | por mensagem | [Groups API](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups) |
| Lista de transmissão do app WhatsApp Business (grátis) | Não (cada um recebe individualmente) | Não (manual) | R$ 0 | [FAQ](https://faq.whatsapp.com/966911743874339/?locale=pt_BR) |
| Comunidades → grupo de avisos (até 2 mil) | Substitui o grupo; só admins publicam | Não | R$ 0 | [FAQ Avisos](https://faq.whatsapp.com/582420703681043/?locale=pt_BR) |
| Canais (unidirecional, público) | Não | Não | R$ 0 | [FAQ Canais](https://faq.whatsapp.com/1318001139066835?locale=pt_BR) |
| `wa.me` / Web Share (o que o Percurso faz) | Sim — **com um toque humano** por grupo | Semi | R$ 0 | [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API) |

**Regras e mudanças de preço que importam** (documentação oficial): cobrança por mensagem de template entregue desde 01/07/2025; faturamento em BRL desde 01/07/2026; **a partir de 01/10/2026 as mensagens de serviço na janela de 24 h também passam a ser cobradas** ([non-template pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)). Opt-in explícito é obrigatório ([Política](https://whatsappbusiness.com/pt-br/policy/)). Limite inicial de 250 destinatários únicos por dia sem verificação da empresa ([Messaging Limits](https://developers.facebook.com/docs/whatsapp/messaging-limits/)) — cabe o Instituto inteiro. Mídia: vídeo 16 MB, documento 100 MB ([Media](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media)).

**Custo estimado para 120 responsáveis, 1 mensagem/semana** (inferência sobre as tarifas):

| Opção | Provedor/mês | Meta/mês | Total |
|---|---|---|---|
| Cloud API direta (sem provedor) | R$ 0 | ≈ R$ 18 | **≈ R$ 18** |
| Gupshup (sem mensalidade) | ≈ R$ 3 | ≈ R$ 18 | ≈ R$ 21 |
| Twilio | ≈ R$ 13 | ≈ R$ 18 | ≈ R$ 31 |
| Umbler Talk / BotConversa / 360dialog | R$ 200–300 | ≈ R$ 18 | ≈ R$ 220–320 |
| Recado aos apoiadores como *marketing* (50 pessoas) | — | + R$ 70 | — |

Ressalva: templates com conteúdo misto caem em *marketing* (R$ 0,32); um recado de captação para doadores é marketing por definição.

## 2. As bibliotecas não oficiais (GitHub) e o risco real

| Projeto | Stars | Último push | Grupo + PDF/vídeo | Login | Licença | Observação |
|---|---|---|---|---|---|---|
| [Baileys](https://github.com/WhiskeySockets/Baileys) | 10,9k | 30/08/2026 | Sim | QR + pairing | MIT | WebSocket puro, sem navegador (~500 MB de RAM a menos). README: "we discourage any bulk or automated messaging". Linha 7 ainda em `rc` |
| [whatsapp-web.js](https://github.com/wwebjs/whatsapp-web.js) | 22,5k | 01/09/2026 | Sim (vídeo exige Google Chrome) | QR + pairing | Apache-2.0 | Puppeteer; "not guaranteed you will not be blocked" |
| [WPPConnect](https://github.com/wppconnect-team/wppconnect) / wa-js / server | 3,4k / 0,8k / 1,0k | 02/09/2026 | Sim | QR + pairing | LGPL / Apache | Comunidade brasileira, muito ativa; pede mantenedores |
| [Evolution API](https://github.com/evolution-foundation/evolution-api) | 9,5k | 07/2026 (código: 05/2026) | Sim | QR | Apache + cláusulas | Padrão brasileiro com n8n; exige Postgres + Redis + Docker; agrega Baileys **e** Cloud API |
| [WAHA](https://github.com/devlikeapro/waha) | 7,3k | 01/09/2026 | Sim | QR + código | Apache-2.0 | Um contêiner Docker, REST simples; tudo grátis desde 2026.6 |
| [whatsmeow](https://github.com/tulir/whatsmeow) | 7,2k | 28/08/2026 | Sim | QR | MPL-2.0 | Go; base do WAHA (GOWS) |
| [Venom](https://github.com/vynect/venom) | 6,6k | 08/2026 | Sim | QR | Apache/MIT | Governança instável; npm parado em 5.3.0 |
| [Z-API](https://z-api.io/) (comercial) | — | — | Sim (aceita ID de grupo) | QR | — | R$ 99,99/mês; não oficial |

**Termos do WhatsApp** ([ToS](https://www.whatsapp.com/legal/terms-of-service)): proíbem "bulk messaging, auto-messaging", uso não pessoal sem autorização e software que "function substantially the same as our Services". **Relatos primários de banimento** (issues [Baileys #2260](https://github.com/WhiskeySockets/Baileys/issues/2260), [#2658](https://github.com/WhiskeySockets/Baileys/issues/2658), [Evolution #1870](https://github.com/evolution-foundation/evolution-api/issues/1870)) envolvem disparo em massa; os "40–60% banidos no Q1 2026" vêm de blogs de quem vende a API oficial, sem fonte primária. **Risco de supply chain:** o pacote `lotusbail` (fork "anti-ban" do Baileys, 56 mil downloads) roubava sessões ([SecurityWeek](https://www.securityweek.com/npm-package-with-56000-downloads-steals-whatsapp-credentials-data/)) — só o `@whiskeysockets/baileys` oficial. Mitigações citadas pelas comunidades: número dedicado, opt-in registrado, volume baixo, uma sessão só, celular ligado, plano B manual.

## 3. Hugging Face

Irrelevante para enviar. [Spaces "whatsapp"](https://huggingface.co/spaces?search=whatsapp): analisadores de export `.txt`, a maioria em erro; um Space com Evolution API em Docker, quebrado. Modelos: nenhum útil específico de WhatsApp em pt-BR; o que serve é geral — [ptt5-base-summ](https://huggingface.co/recogna-nlp/ptt5-base-summ) (resumo, ~220M parâmetros, roda em CPU) e [BERTimbau](https://github.com/neuralmind-ai/portuguese-bert). Datasets de "conversas WhatsApp" são sintéticos ou em outras línguas, com PII sem tratamento; para anonimização, [pii-masking-300k](https://huggingface.co/datasets/ai4privacy/pii-masking-300k).

## 4. O que pode e o que não pode sair, por grupo (LGPD, ECA, conselhos)

| Conteúdo | Grupo dos pais | Grupo dos apoiadores |
|---|---|---|
| Presença **nominal** da turma (PDF com nomes) | **Não.** Repasse do dado de cada criança aos outros pais (LGPD art. 14 §3º; art. 6º III; [Guia MPCE §41](https://www.mpce.mp.br/wp-content/uploads/2023/10/Guia-orientativo-de-tratamento-de-dados-pessoais-de-criancas-e-adolescentes.pdf)). Numa comunidade com medidas protetivas, a falta pode revelar situação familiar | **Não** |
| Presença do **próprio filho** | **Sim, 1-para-1** (lista de transmissão ou API oficial) | — |
| **Agregado** (X de Y, %) | **Sim** — cuidado só com turma muito pequena | **Sim** — é prestação de contas |
| Recado da turma (texto) | Sim, sem nome ligado a fato | Sim, sem nome |
| Vídeo/foto da atividade | Só com termo específico "comunicação às famílias"; enquadrar a atividade, não o rosto ([Aliança pela Infância](https://aliancapelainfancia.org.br/guia-de-orientacao-sobre-uso-de-imagem-de-criancas-na-smb/)) | Só crianças com termo "divulgação a apoiadores", com prazo e revogável ([ConJur 05/2026](https://conjur.com.br/2026-mai-14/uso-de-imagem-de-menores-o-que-muda-e-o-que-nao-muda-com-o-eca-digital/)); sem nome completo nem local; histórico de violência → sem rosto ou fora |
| Qualquer dado de atendimento psicológico | Não (CFP 001/2009) | Não |

Consentimento de matrícula genérico "não se sustenta" para imagem (ConJur). A ANPD admite outras bases legais além do consentimento, "com cautela adicional" ([Enunciado 01/2023](https://www.lhlaw.com.br/publicacoes/anpd-publica-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes/)). ECA Digital (Lei 15.211/2025) não alcança ONGs e escolas em publicações orgânicas ([Data Privacy Brasil](https://www.dataprivacybr.org/eca-digital-entra-em-vigor-o-que-a-lei-preve-e-o-que-ainda-falta-regulamentar/)). Posição do MPSP ou do Conselho Tutelar sobre lista nominal em grupo: **não encontrada**. Caso de ONG brasileira com Evolution/n8n documentando custos e problemas: **não encontrado**.

---

## 5. Recomendação para o Percurso — três degraus

**Degrau 0 — já existe, custo zero, dentro das regras: o "pacote pronto" com um toque por grupo.** O Percurso gera o recado da turma (agregado + atividade + próximo encontro) e abre o WhatsApp para a pessoa escolher o grupo (decisão 33). O que falta e cabe agora: (a) **Web Share com arquivos** — anexar ao mesmo toque o PDF agregado e o vídeo já filtrado; (b) **dois pacotes distintos** — pais (agregado + recado + vídeo sem rosto) e apoiadores (agregado + recado + vídeo só de crianças com termo "apoiadores"); (c) o produto **consulta a governança** (consentimento de imagem por finalidade) antes de montar o vídeo. Custo: 1 toque por grupo, ~10 segundos, contra os minutos de hoje. Esta é a única automação que **não** depende de nada externo e não arrisca o número.

**Degrau 1 — presença individual pela API oficial, ~R$ 18–31/mês.** O que a LGPD pede (cada responsável recebe só o próprio filho) é exatamente o que a Cloud API faz bem: um template *utility* aprovado ("Hoje o seu filho esteve presente / faltou na turma X"), com opt-in registrado no cadastro. Requer número dedicado, Meta Business, templates aprovados e alguém para configurar uma vez; depois é `POST` do Percurso. Substitui o PDF nominal por algo mais protetor e mais útil para a família. Provedor recomendado para começar sem mensalidade: Cloud API direta ou Gupshup; quando houver quem opere, Twilio.

**Degrau 2 — só com decisão consciente da diretoria: biblioteca não oficial para postar no grupo.** Se o Instituto aceitar o risco de perder o número (violação dos Termos), o desenho de menor exposição é **Baileys embutido no próprio Percurso** (sem Docker, sem navegador, sessão em pasta local, número dedicado, 1–3 envios por sábado, só para grupos onde o número é membro, plano B manual). WAHA é a alternativa se Docker for aceitável. Evolution API é sobredimensionada para dois grupos. **Não recomendo** este degrau enquanto o Degrau 0 resolver o tempo da equipe — o ganho é tirar um toque; a perda possível é o único canal com as famílias.

**O que não fazer, em nenhum degrau:** lista nominal de presença em grupo; vídeo com rosto de criança sem termo por finalidade; qualquer fork "anti-ban" do npm; mandar recado de captação como *utility*.

## Principais conclusões

- A automação "direto para o grupo" que o líder pediu não existe na via oficial e é violação de Termos na não oficial; o pedido real é **tempo**, e o tempo se recupera com o pacote pronto.
- A pesquisa jurídica é o achado mais valioso: **o PDF nominal que sai hoje para o grupo dos pais é o que deveria parar** — e o Percurso já produz o substituto (agregado + individual).
- A API oficial vale para a presença individual, por menos de R$ 20/mês na Meta; o custo está no provedor e na configuração inicial, não no envio.

---

## Fontes principais (as ~60 completas estão nos três relatórios de origem)

**Meta / WhatsApp (oficial):** [Groups API](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups) · [Official Business Accounts](https://developers.facebook.com/documentation/business-messaging/whatsapp/official-business-accounts/) · [Pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) · [Non-template pricing 2026](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages) · [Media limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media) · [Messaging Limits](https://developers.facebook.com/docs/whatsapp/messaging-limits/) · [Política de Mensagens (pt-br)](https://whatsappbusiness.com/pt-br/policy/) · [Termos de Serviço](https://www.whatsapp.com/legal/terms-of-service) · [FAQ listas de transmissão](https://faq.whatsapp.com/966911743874339/?locale=pt_BR) · [FAQ avisos das Comunidades](https://faq.whatsapp.com/582420703681043/?locale=pt_BR) · [FAQ segurança nos Canais](https://faq.whatsapp.com/1318001139066835?locale=pt_BR)

**Provedores:** [360dialog](https://360dialog.com/pricing) · [Twilio WhatsApp](https://www.twilio.com/en-us/whatsapp/pricing) · [Z-API](https://z-api.io/) · [BotConversa](https://botconversa.chat/planos-e-precos.html) · [Umbler Talk](https://a.umbler.com/br/talk/) · [WizeBot — tabela BRL](https://wizebot.com.br/custo-por-mensagens) · [Message Central — Brasil](https://www.messagecentral.com/blog/whatsapp-business-api-pricing-brazil)

**GitHub:** [Baileys](https://github.com/WhiskeySockets/Baileys) · [whatsapp-web.js](https://github.com/wwebjs/whatsapp-web.js) · [WPPConnect](https://github.com/wppconnect-team/wppconnect) · [Evolution API](https://github.com/evolution-foundation/evolution-api) · [WAHA](https://github.com/devlikeapro/waha) · [whatsmeow](https://github.com/tulir/whatsmeow) · [Venom](https://github.com/vynect/venom) · [Baileys #2260](https://github.com/WhiskeySockets/Baileys/issues/2260) · [Evolution #1870](https://github.com/evolution-foundation/evolution-api/issues/1870) · [lotusbail (SecurityWeek)](https://www.securityweek.com/npm-package-with-56000-downloads-steals-whatsapp-credentials-data/)

**Hugging Face:** [Spaces](https://huggingface.co/spaces?search=whatsapp) · [Models](https://huggingface.co/models?search=whatsapp) · [Datasets](https://huggingface.co/datasets?search=whatsapp) · [ptt5-base-summ](https://huggingface.co/recogna-nlp/ptt5-base-summ) · [pii-masking-300k](https://huggingface.co/datasets/ai4privacy/pii-masking-300k)

**Lei e salvaguarda:** [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) · [Enunciado ANPD 01/2023 (LHLaw)](https://www.lhlaw.com.br/publicacoes/anpd-publica-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes/) · [Guia MPCE 2023](https://www.mpce.mp.br/wp-content/uploads/2023/10/Guia-orientativo-de-tratamento-de-dados-pessoais-de-criancas-e-adolescentes.pdf) · [ConJur — imagem de menores e ECA Digital](https://conjur.com.br/2026-mai-14/uso-de-imagem-de-menores-o-que-muda-e-o-que-nao-muda-com-o-eca-digital/) · [Aliança pela Infância](https://aliancapelainfancia.org.br/guia-de-orientacao-sobre-uso-de-imagem-de-criancas-na-smb/) · [UNICEF — reporting on children](https://www.unicef.org/armenia/en/stories/principles-and-guidelines-media-reporting-children) · [Save the Children — safeguarding](https://resourcecentre.savethechildren.net/sites/default/files/documents/6150.pdf) · [CFP Res. 001/2009](https://site.cfp.org.br/wp-content/uploads/2009/04/resolucao2009_01.pdf) · [Arco/ClassApp — grupos de WhatsApp](https://www.arcoeducacao.com.br/meu-arco-blog/5-regras-para-o-grupo-de-whatsapp-da-escola)

## Metodologia

Três agentes em paralelo, ~55 buscas (`WebSearch`, pt e en) e ~50 páginas lidas a fundo. **Tooling:** sem firecrawl/exa nesta sessão; a leitura foi por `WebFetch`, `curl` (READMEs raw, API do GitHub e do npm para estrelas/datas) — o `scrape-local` falhou por dependência ausente (`httpx`). Estrelas e datas de push são de 02/09/2026. **Não acessadas:** rate card oficial da Meta em BRL (arquivo não renderizável), FAQ do WhatsApp sobre apps não suportados (só via fontes secundárias), páginas UNICEF/Save the Children (403; conteúdo via PDF e busca), notícia da ANPD no gov.br (401). Fatos e inferências estão marcados nos relatórios de origem; aqui, tudo o que é estimativa de custo ou leitura jurídica é inferência sobre as fontes citadas.
