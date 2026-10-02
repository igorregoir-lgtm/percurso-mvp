# Revisão da experiência mobile + efeitos "uau" (25/08/2026)

> Ciclo completo: análise (2 exploradores) → espec de motion (agente dedicado) → plano →
> implementação → **revisão adversarial (3 lentes + verificação cruzada: 17 achados, 13
> confirmados, 4 descartados)** → ajustes → gates verdes. Objetivo: o Percurso no celular da
> professora como app de verdade, com o "what the hell effect" nas três direções pedidas
> (celebração cinematográfica, primeira impressão nativa, a voz como mágica) — **sem perder um
> conceito do artefato**.

## O que entrou

- **A magia** (`magiaExtracao`): entre "Terminei" e "O que entendi", a fala vira campos em cena —
  sublinhado terracota SÓ nas palavras que geraram campo de verdade (máx. 4; sem match, sem
  sublinhado), traço do percurso, campos materializando com stagger e contador. **Honesta por
  construção**: começa com o POST real, e falha (baixa confiança) ou proteção (perímetro) NÃO
  ganham mágica — a barra assenta cinza / a fala esmaece, nunca se destaca o trecho sensível.
  Pular/Escape abortam a coreografia, nunca o POST.
- **A festa 2.0** (`efeitosFesta`): confete de papel em canvas nas tintas do sistema (tema escuro
  de graça via getComputedStyle), contagem 0→N com easing, traço do percurso em marca d'água com
  o ponto "você chegou aqui", vibração no Android. Cleanup centralizado (`pararFesta`).
- **App nativo**: View Transitions com fallback CSS (180–200ms), entrada orquestrada do
  `#/entrar` com traço-assinatura, press/release com mola em todo elemento tocável,
  tap-highlight transparente, `touch-action:manipulation`, inputs a 16px (fim do zoom do iOS),
  alvos ≥44px, safe-areas completas, sombras de rolagem nas tabelas, PWA com PNGs reais e
  theme-color por tema.
- **Demo no celular**: `ai/scripts/demo-celular.sh` (modelo + app + túnel cloudflared + QR;
  decisão 25 — demonstração, nunca operação; bind segue 127.0.0.1).
- **Autonomia de operação**: `docs/MANUAL-DE-INSTALACAO.md` (instalar em qualquer máquina, sem
  jargão) + `ai/scripts/instalar-inicio-automatico.sh` (LaunchAgent com KeepAlive condicionado —
  ligou o computador, o Percurso está no ar).

## Achados da revisão adversarial → o que foi feito

| Id | Achado | Tratamento |
|---|---|---|
| CONCEITOS-01 | Kill-switch de reduced-motion não zerava `animation-delay` — cascatas viravam conteúdo piscando para quem pediu sem movimento | `animation-delay:0s`/`transition-delay:0s` no bloco RM |
| CONCEITOS-02 | `<b>` das opções do SROI em peso 700 (teto da identidade é 600) | `.opcao b{font-weight:600}` |
| TECNICA-01 | Rota síncrona liberava a guarda do roteador antes do hashchange — o re-render destruía o modal de perímetro recém-aberto no caminho sem View Transitions | Liberação adiada da guarda (`setTimeout 0`, condicionada ao hash) — verificado ao vivo: modal sobrevive |
| TECNICA-02 | Redirect interno clobberava a guarda do navegar externo | A liberação condicionada ao hash preserva a marca do redirect |
| TECNICA-03 | Com VT, o loader de 240ms nunca aparecia (pintura congelada) — rota lenta = tela velha travada | `vtAtual.skipTransition()` quando o loader dispara |
| TECNICA-04 | Erros do render engolidos pelo catch da VT | `updateCallbackDone` com log; limpeza/pintarNav movidos para o try que pinta o cartão de erro |
| TECNICA-05 | Back/navegação com festa ou magia abertas deixava overlay órfão e sequestrava a navegação | Roteador fecha festa e magia (com cleanup); magia cancelada ⇒ o fluxo NÃO força `#/confirmar` |
| TECNICA-06 | Seleção do SROI dependia de `:has()` — engine sem suporte via radio invisível sem indicador | Essencial por irmão adjacente; `:has` só como realce |
| TECNICA-07 | Sombras de rolagem com `background-attachment:scroll` têm histórico de bug no iOS | **Aceito com pendência**: validar no aparelho real; fallback (wrapper com pseudo-elementos) documentado aqui |
| TECNICA-08 | Festa sem safe-area de topo (notch) | `env(safe-area-inset-*)` nos 4 lados (festa e magia) |
| TECNICA-09 | demo-celular.sh não matava netos nem checava porta — vazava servidores e podia expor instância errada | Checagem de porta (lsof) + kill de filhos e netos + node sem subshell |
| TECNICA-10 | Início automático declarava sucesso com serviço morto; KeepAlive em loop | Ramo de falha explícito; `bootstrap/bootout`; KeepAlive só em saída anormal |
| ESPEC-03 | Spring da nav a 200ms (espec: 240–260) | 240ms |

Descartados na verificação (4): match por prefixo-5 no sublinhado (flexão pt-BR, honestidade
intacta), viewBox 64×10 vs 64×8 (evita clipar o traço), duração da magia ~2,7s vs "~2,3s"
(escala com conteúdo real), teto de 6 no stagger de perfis (seed tem 4 — inobservável).

## Verificação

- 63 unitários · 246 smoke · 6 gates RAG · 17 IA-stub — verdes após os ajustes.
- **Pelo túnel HTTPS real** (cloudflared): secure context ✓, service worker registrado e ATIVO ✓,
  SpeechRecognition disponível ✓, manifest instalável ✓, copilot 9,3s com 3 fontes ✓, e o caso
  crítico TECNICA-01 re-testado ao vivo (modal de perímetro vivo após a magia, caminho sem VT).
- Visual mobile 375×812 claro/escuro: entrar (cascata + traço), hoje, voz→magia (fase B flagrada
  com sublinhados honestos), confirmar pré-preenchido, perímetro (modal por cima), festa
  completa (contagem 18/18, traço, confete com autodestruição confirmada).

## Pendências que só o aparelho físico prova

Instalação do PWA (iPhone e Android), microfone/voz no celular, vibração no Android e o
comportamento das sombras de rolagem no Safari real (TECNICA-07).
