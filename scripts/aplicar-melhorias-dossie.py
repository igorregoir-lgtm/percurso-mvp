# -*- coding: utf-8 -*-
"""
Script de refinamento do Dossiê Semana 5 (Trilha B).
Aplica os 5 pontos exatos solicitados pelo usuário:
1. Hero Banner: Paleta suave/clara (adeus tela preta) + Métrica de evolução '27 -> 12 Telas Essenciais' pós-visita ao Instituto Ebenézer por razões de UX e impacto real.
2. Faixas de Navegação (Figura 2): Container de rolagem horizontal nativo em alta resolução (min-width 2200px) + Detalhamento tela a tela em fonte grande (15px-16px) e legível.
3. Jornada de Usuário FigJam (Figura 3): Container amplo e rolável (min-width 1400px) + Transcrição expandida com tipografia generosa (15px-17px), citações de campo e matriz comparativa AS-IS vs TO-BE legível.
4. Task Flow FigJam (Figura 4): Container amplo (min-width 1300px) + Tabela e cards de passos operacionais com fonte 15.5px-16px.
5. Inclusão da Figura 5: Imagem real das conexões azuis no modo Prototype do Figma (conexoes_malha_figma.png) com visualizador panorâmico e análise de topologia sem telas órfãs.
"""

import os
import re

def aplicar_melhorias():
    with open("scripts/atualizar-dossie.py", "r", encoding="utf-8") as f:
        content = f.read()

    # =========================================================================
    # 1. AJUSTAR CSS DO HERO BANNER (SUBSTITUIR FUNDO PRETO POR PALETA SUAVE)
    # =========================================================================
    css_hero_antigo = r'/\* Hero Banner \*/.*?\.hero-banner \{.*?box-shadow: var\(--shadow-lg\);\s*\}'
    css_hero_novo = """/* Hero Banner - Paleta Suave e Editorial do Artefato (Sem Fundo Escuro) */
    .hero-banner {
      background: linear-gradient(135deg, #FFFFFF 0%, #FAF6EE 100%);
      color: var(--ink);
      border: 2px solid var(--line-dark);
      border-radius: var(--radius-lg);
      padding: 48px 44px;
      margin-bottom: 40px;
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow-md);
    }"""
    content = re.sub(css_hero_antigo, css_hero_novo, content, flags=re.DOTALL)

    css_hero_after_antigo = r'\.hero-banner::after \{.*?pointer-events: none;\s*\}'
    css_hero_after_novo = """.hero-banner::after {
      content: "";
      position: absolute;
      top: -30%;
      right: -5%;
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(212, 160, 23, 0.12) 0%, rgba(251, 248, 243, 0) 70%);
      pointer-events: none;
    }"""
    content = re.sub(css_hero_after_antigo, css_hero_after_novo, content, flags=re.DOTALL)

    css_badges_hero_antigo = r'\.badge-inteli \{.*?\.badge-trilha \{.*?color: white;\s*\}'
    css_badges_hero_novo = """.badge-inteli {
      background: var(--accent-blue-bg);
      color: var(--accent-blue);
      border: 1px solid rgba(35, 82, 124, 0.3);
    }

    .badge-status {
      background: var(--accent-green-bg);
      color: var(--accent-green);
      border: 1px solid rgba(46, 107, 71, 0.3);
    }

    .badge-trilha {
      background: var(--accent-red-bg);
      color: var(--accent-red);
      border: 1px solid rgba(178, 53, 40, 0.3);
    }"""
    content = re.sub(css_badges_hero_antigo, css_badges_hero_novo, content, flags=re.DOTALL)

    css_hero_textos_antigo = r'\.hero-title \{.*?\.stat-sub \{.*?margin-top: 2px;\s*\}'
    css_hero_textos_novo = """.hero-title {
      font-family: var(--font-serif);
      font-size: 42px;
      line-height: 1.18;
      font-weight: 600;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
      color: var(--ink);
    }

    .hero-lead {
      font-size: 17.5px;
      line-height: 1.6;
      color: var(--ink-muted);
      max-width: 920px;
      margin-bottom: 32px;
      font-weight: 400;
    }

    .hero-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 18px;
      border-top: 1.5px solid var(--line);
      padding-top: 28px;
    }

    .hero-stat-box {
      background: #FFFFFF;
      border: 1.5px solid var(--line);
      border-radius: var(--radius-md);
      padding: 20px 22px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .hero-stat-box:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
    }

    .stat-num {
      font-size: 26px;
      font-weight: 800;
      color: var(--accent-red);
      font-family: var(--font-mono);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 13.5px;
      color: var(--ink);
      font-weight: 700;
      margin-top: 6px;
    }

    .stat-sub {
      font-size: 12px;
      color: var(--ink-muted);
      margin-top: 4px;
      line-height: 1.45;
    }"""
    content = re.sub(css_hero_textos_antigo, css_hero_textos_novo, content, flags=re.DOTALL)

    # =========================================================================
    # 2. AJUSTAR HTML DO HERO BANNER (27 -> 12 TELAS ESSENCIAIS PÓS-VISITA)
    # =========================================================================
    html_hero_antigo = r'<!-- Hero Banner -->.*?</div>\s*</div>\s*<!-- Quick Access Hub -->'
    html_hero_novo = """<!-- Hero Banner (Paleta Suave e Clara · Sem Fundo Preto) -->
    <div class="hero-banner">
      <div class="hero-meta">
        <span class="badge-pill badge-inteli">Inteli MBA em IA & Dados · Módulo 3</span>
        <span class="badge-pill badge-trilha">Trilha B: Monitoramento Socioemocional</span>
        <span class="badge-pill badge-status">Entrega Semana 5 Consolidada</span>
      </div>

      <h1 class="hero-title">Percurso: A Jornada de Construção do Artefato de Impacto</h1>
      <p class="hero-lead">
        Documentação unificada, visual e executiva da concepção, prototipação, validação em campo e engenharia do 
        produto <strong>Percurso</strong> para o <strong>Instituto Social Ebenézer</strong>. Alinhado às orientações da 
        <strong>Profª. Bruna Mayer</strong>, ao Guia do Aluno da Semana 5 e aos critérios de avaliação de Negócios e Tecnologia.
      </p>

      <div class="hero-stats-grid">
        <div class="hero-stat-box" style="border-top: 4px solid var(--accent-red);">
          <div class="stat-num">27 ➔ 12 Telas</div>
          <div class="stat-label">Evolução Pós-Visita de Campo</div>
          <div class="stat-sub">Mapeamento exploratório inicial de 27 pranchetas no Figma enxugado para <strong>12 telas essenciais</strong> após visita ao Instituto Ebenézer: foco irrestrito na melhor experiência do usuário (UX), impacto prático e facilidade para os voluntários.</div>
        </div>
        <div class="hero-stat-box" style="border-top: 4px solid var(--accent-green);">
          <div class="stat-num">4 Papéis Reais</div>
          <div class="stat-label">Psicóloga em 1º Lugar</div>
          <div class="stat-sub"><strong>Carolina Duarte (Psicóloga)</strong> posicionada como a 1ª opção de acesso na entrada do app, seguida por Maria Silvia (Educadora), Rita (Coordenação) e Solange (Diretoria).</div>
        </div>
        <div class="hero-stat-box" style="border-top: 4px solid var(--accent-blue);">
          <div class="stat-num">100% Sintético</div>
          <div class="stat-label">Privacidade & Conformidade</div>
          <div class="stat-sub">Códigos C001..C106 sem exposição de dados reais de crianças em vulnerabilidade social · Sigilo estrito conforme LGPD Art. 14.</div>
        </div>
        <div class="hero-stat-box" style="border-top: 4px solid var(--accent-amber);">
          <div class="stat-num">R$ 0 / Mês</div>
          <div class="stat-label">Sustentabilidade & Impacto</div>
          <div class="stat-sub">Arquitetura sustentável (PWA + Vercel / Render com opção de SLM local): manutenção simples, zero custo de servidor e vida longa pós-Semana 10.</div>
        </div>
      </div>
    </div>

    <!-- Quick Access Hub -->"""
    content = re.sub(html_hero_antigo, html_hero_novo, content, flags=re.DOTALL)

    # =========================================================================
    # 3. SEÇÃO CONEXÕES: INCLUIR FIGURA 5 + ZOOM + DETALHAMENTO DE FAIXAS (FIGURA 2)
    # =========================================================================
    secao_conexoes_antiga = r'<!-- SECTION: TELA DE CONEXÕES.*?<!-- SECTION: A HISTÓRIA DA AURORA'
    secao_conexoes_nova = """<!-- SECTION: TELA DE CONEXÕES (12 TELAS ESSENCIAIS EM 4 PAPÉIS) -->
    <section class="section-block" id="conexoes-figma" style="border: 2px solid var(--line-dark);">
      <div class="section-header">
        <div class="section-eyebrow" style="color: var(--accent-amber);">Arquitetura da Informação & UX</div>
        <h2 class="section-title">Mapa das Conexões Interativas (12 Telas Essenciais · 4 Papéis)</h2>
        <p class="section-desc">
          O protótipo no Figma (<code>JMejpNsHkckqeSP8KE1PTh</code> / <code>h6AnLVYLfpeVl2N4ie0Qzv</code>) foi consolidado com foco estrito na experiência do usuário (UX): 
          <strong>12 telas essenciais organizadas em 4 faixas independentes</strong> com conexões interativas completas, 
          assegurando <strong>zero telas órfãs, zero becos sem saída e máxima agilidade no celular</strong>.
        </p>
      </div>

      <div class="prose">
        <p style="font-size: 16px; line-height: 1.7; color: var(--ink);">
          <strong>Por que o protótipo evoluiu de 27 pranchetas para 12 telas essenciais?</strong><br>
          Durante a fase inicial de ideação em sala de aula, foram geradas 27 pranchetas para explorar todas as variantes hipotéticas de navegação. 
          Entretanto, ao realizar a <strong>visita presencial de campo ao Instituto Ebenézer no sábado 29/08/2026</strong>, a realidade da sala de aula e da garagem adaptada impôs uma lição clara de Design Centrado no Usuário: <em>um sistema com dezenas de telas fragmentadas geraria abandono imediato por parte de voluntários que já estão sobrecarregados</em>. 
          Para entregar a <strong>melhor experiência possível</strong> e assegurar que o artefato seja <strong>efetivamente utilizado no dia a dia</strong>, o grupo enxugou o produto para <strong>12 telas essenciais</strong> em 4 trilhas de navegação contínua, eliminando qualquer tela supérflua.
        </p>
      </div>

      <!-- NOVA FIGURA 5: MAPA REAL DE CONEXÕES NO FIGMA (MODO PROTOTYPE) -->
      <div style="background: white; border: 2px solid var(--accent-blue); border-radius: 16px; padding: 24px; margin: 28px 0; box-shadow: var(--shadow-md);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid var(--line); padding-bottom: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; background: var(--accent-blue-bg); color: var(--accent-blue); padding: 4px 10px; border-radius: 99px; border: 1px solid rgba(35,82,124,0.3);">
                Figma Prototype Mode · Evidência Real
              </span>
              <span style="font-size: 12px; color: var(--ink-muted); font-weight: 600;">
                Semana 5 · Trilha B
              </span>
            </div>
            <h3 style="font-size: 22px; font-weight: 800; color: var(--ink); margin: 8px 0 4px;">
              🔗 Malha Completa de Conexões Interativas no Figma (Modo Prototype)
            </h3>
            <p style="font-size: 15px; color: var(--ink-muted); margin: 0; line-height: 1.55;">
              Visualização panorâmica capturada diretamente do modo <strong>Prototype do Figma</strong>, demonstrando cada ligação interativa (fios azuis) entre as pranchetas.
              Comprova visualmente a integridade do fluxo: <strong>zero telas órfãs</strong> (todas acessíveis a partir da entrada) e <strong>zero becos sem saída</strong> (todas com rotas claras de retorno).
            </p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="https://www.figma.com/proto/h6AnLVYLfpeVl2N4ie0Qzv/Percurso-%C2%B7-Semana-5-%C2%B7-Trilha-B?node-id=0-1" target="_blank" class="figma-link-pill" style="background: var(--accent-blue); color: white; border-color: var(--accent-blue); font-size: 13px; padding: 8px 16px;">
              Navegar no Protótipo Real ↗
            </a>
            <a href="figma_images/conexoes_malha_figma.png" target="_blank" class="figma-link-pill" style="font-size: 13px; padding: 8px 16px;">
              🔍 Ver Imagem em Tela Cheia
            </a>
          </div>
        </div>

        <!-- Scrollable Pan Viewer for Connections -->
        <div style="background: #FAF7F2; border: 1.5px solid var(--line-dark); border-radius: 12px; padding: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: var(--ink-muted); font-weight: 600;">
            <span>↔ Arraste horizontalmente para inspecionar todas as conexões da esquerda à direita</span>
            <span style="font-family: var(--font-mono); font-size: 11.5px; background: white; padding: 3px 10px; border-radius: 6px; border: 1px solid var(--line);">Largura Nativa · Alta Definição</span>
          </div>
          <div style="min-width: 1400px; text-align: center;">
            <img src="figma_images/conexoes_malha_figma.png" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/igorregoir-lgtm/percurso-mvp/main/public/figma_images/conexoes_malha_figma.png';" alt="Malha de Conexões Interativas no Figma" style="width: 100%; height: auto; display: block; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);" loading="lazy">
          </div>
        </div>

        <!-- Callouts explicativos da malha de conexões -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-top: 20px;">
          <div style="background: var(--card-alt); border: 1px solid var(--line); border-radius: 10px; padding: 16px;">
            <strong style="color: var(--accent-blue); font-size: 14.5px; display: block; margin-bottom: 6px;">1. Entrada Unificada (<code>#/entrar</code>)</strong>
            <p style="font-size: 13.5px; color: var(--ink); margin: 0; line-height: 1.5;">Roteia com 1 toque para os 4 papéis, com destaque prioritário para a <strong>Psicóloga Carolina Duarte</strong> como primeiro card na tela.</p>
          </div>
          <div style="background: var(--card-alt); border: 1px solid var(--line); border-radius: 10px; padding: 16px;">
            <strong style="color: var(--accent-green); font-size: 14.5px; display: block; margin-bottom: 6px;">2. Ciclo Completo da Psicóloga</strong>
            <p style="font-size: 13.5px; color: var(--ink); margin: 0; line-height: 1.5;"><code>#/hoje</code> &rarr; Gravação de 40s &rarr; Revisão humana obrigatória &rarr; Liberação do relato &rarr; Compartilhamento seguro por WhatsApp.</p>
          </div>
          <div style="background: var(--card-alt); border: 1px solid var(--line); border-radius: 10px; padding: 16px;">
            <strong style="color: var(--accent-red); font-size: 14.5px; display: block; margin-bottom: 6px;">3. Chamada Ágil da Educadora</strong>
            <p style="font-size: 13.5px; color: var(--ink); margin: 0; line-height: 1.5;">Desmarcação em 30 segundos no celular, sem papel nem planilhas, gerando cálculo automático de presença para a Coordenação.</p>
          </div>
          <div style="background: var(--card-alt); border: 1px solid var(--line); border-radius: 10px; padding: 16px;">
            <strong style="color: var(--accent-amber); font-size: 14.5px; display: block; margin-bottom: 6px;">4. Assistente Aurora 🌻 e Devolutivas</strong>
            <p style="font-size: 13.5px; color: var(--ink); margin: 0; line-height: 1.5;">Drawer global acessível em qualquer tela via FAB do Girassol, trazendo avisos contextuais sem bloquear o fluxo principal.</p>
          </div>
        </div>
      </div>

      <!-- Connection Visual Matrix -->
      <div class="connection-matrix-box">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--line); padding-bottom: 14px;">
          <div>
            <h4 style="font-size: 19px; font-weight: 800; color: var(--ink); margin: 0;">Topologia da Malha de Navegação (12 Telas Essenciais)</h4>
            <p style="font-size: 14px; color: var(--ink-muted); margin: 4px 0 0;">Ponto de partida unificado: <code>#/entrar</code> com roteamento para os 4 papéis reais.</p>
          </div>
          <span style="background: var(--accent-green-bg); color: var(--accent-green); border: 1px solid rgba(46,107,71,0.3); padding: 6px 14px; border-radius: 99px; font-size: 12.5px; font-weight: 700; font-family: var(--font-mono);">
            12 Telas Validadas · Zero Telas Órfãs
          </span>
        </div>

        <div class="conn-grid">
          <!-- Coluna 1: Psicóloga (1º LUGAR) -->
          <div class="conn-col" style="border-top: 3px solid var(--accent-green);">
            <h5 style="color: var(--accent-green); font-size: 13.5px;">Faixa 2 · Psicóloga (Carolina)</h5>
            <div style="font-size: 12px; color: var(--ink-muted); margin-bottom: 10px; font-weight: 600;">3 Telas Diárias + 2 Devolutivas</div>
            <div class="conn-item"><span>#/hoje (Vivência)</span> <span class="conn-count" style="color: var(--accent-green);">Entrada</span></div>
            <div class="conn-item"><span>#/voz (40s Áudio)</span> <span class="conn-count" style="color: var(--accent-green);">Captura</span></div>
            <div class="conn-item"><span>#/relato (CRP)</span> <span class="conn-count" style="color: var(--accent-green);">1 Clique</span></div>
            <div class="conn-item"><span>#/recado (WhatsApp)</span> <span class="conn-count" style="color: var(--ink-subtle);">Devolutiva</span></div>
            <div class="conn-item"><span>#/parecer (Parceiro)</span> <span class="conn-count" style="color: var(--ink-subtle);">Sigilo</span></div>
          </div>

          <!-- Coluna 2: Educadora -->
          <div class="conn-col" style="border-top: 3px solid var(--accent-red);">
            <h5 style="color: var(--accent-red); font-size: 13.5px;">Faixa 1 · Educadora (Maria Silvia)</h5>
            <div style="font-size: 12px; color: var(--ink-muted); margin-bottom: 10px; font-weight: 600;">2 Toques Rápidos no Celular</div>
            <div class="conn-item"><span>#/hoje (Alertas)</span> <span class="conn-count" style="color: var(--accent-red);">Entrada</span></div>
            <div class="conn-item"><span>#/chamada (1 toque)</span> <span class="conn-count" style="color: var(--accent-red);">30 seg</span></div>
            <div class="conn-item"><span>#/folha (Turma)</span> <span class="conn-count" style="color: var(--ink-subtle);">Check-in</span></div>
            <div class="conn-item"><span>#/turma (Médias)</span> <span class="conn-count" style="color: var(--ink-subtle);">Histórico</span></div>
          </div>

          <!-- Coluna 3: Coordenação -->
          <div class="conn-col" style="border-top: 3px solid var(--accent-blue);">
            <h5 style="color: var(--accent-blue); font-size: 13.5px;">Faixa 3 · Coordenação (Rita)</h5>
            <div style="font-size: 12px; color: var(--ink-muted); margin-bottom: 10px; font-weight: 600;">Painel Único & Planilha</div>
            <div class="conn-item"><span>#/painel (Geral)</span> <span class="conn-count" style="color: var(--accent-blue);">Consolidado</span></div>
            <div class="conn-item"><span>#/alertas (Régua 75%)</span> <span class="conn-count" style="color: var(--accent-blue);">Busca Ativa</span></div>
            <div class="conn-item"><span>#/consentimentos</span> <span class="conn-count" style="color: var(--ink-subtle);">Art. 14</span></div>
            <div class="conn-item"><span>#/equipe (Turmas)</span> <span class="conn-count" style="color: var(--ink-subtle);">Alocação</span></div>
          </div>

          <!-- Coluna 4: Diretoria -->
          <div class="conn-col" style="border-top: 3px solid var(--accent-amber);">
            <h5 style="color: var(--accent-amber); font-size: 13.5px;">Faixa 4 · Diretoria (Solange)</h5>
            <div style="font-size: 12px; color: var(--ink-muted); margin-bottom: 10px; font-weight: 600;">Prestação de Contas & Financiador</div>
            <div class="conn-item"><span>#/painel (Impacto)</span> <span class="conn-count" style="color: var(--accent-amber);">Métricas</span></div>
            <div class="conn-item"><span>#/relatorio (Doador)</span> <span class="conn-count" style="color: var(--ink-subtle);">Sem Nomes</span></div>
            <div class="conn-item"><span>#/perguntar (Aurora 🌻)</span> <span class="conn-count" style="color: var(--ink-subtle);">Assistente</span></div>
          </div>
        </div>

        <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 14px; color: var(--ink-muted); line-height: 1.6;">
          <strong>Padrão de Qualidade de UX:</strong> Em vez de impor telas burocráticas a quem já não tem tempo, o sistema concentra as tarefas operacionais em <strong>12 telas limpas</strong>, desenhadas especificamente para telas de smartphone com botões de toque generosos e zero formulários extensos.
        </div>
      </div>

      <!-- DETALHAMENTO LEGÍVEL DAS FAIXAS DE NAVEGAÇÃO COM TIPOGRAFIA GRANDE -->
      <div style="background: var(--card-alt); border: 1.5px solid var(--line-dark); border-radius: 14px; padding: 24px; margin-top: 24px;">
        <h4 style="font-size: 18px; font-weight: 800; color: var(--ink); margin-bottom: 14px;">
          🔍 Detalhamento das 4 Faixas do Figma (Leitura Confortável & Navegação Direta):
        </h4>
        <div class="table-responsive">
          <table class="data-table" style="font-size: 15px; line-height: 1.6;">
            <thead>
              <tr>
                <th style="width: 18%;">Faixa & Persona</th>
                <th style="width: 25%;">Sequência de Telas no Figma</th>
                <th style="width: 37%;">Objetivo de Impacto & Redução de Atrito</th>
                <th style="width: 20%;">Link Figma</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong style="color: var(--accent-green); font-size: 15.5px;">Faixa 2 · Psicóloga</strong><br><small style="font-size: 13px;">Carolina Duarte</small></td>
                <td><code>#/entrar</code> &rarr; <code>#/hoje</code> &rarr; <code>#/voz</code> &rarr; <code>#/confirmar</code> &rarr; <code>#/relato</code> &rarr; <code>#/recado</code></td>
                <td>Permite gravar 40s de áudio logo após o término da Vivência. O relato do CRP sai redigido e liberado sem abrir o notebook à noite.</td>
                <td><a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="figma-link-pill" style="padding: 6px 12px; font-size: 12.5px;">Abrir Faixa 2 ↗</a></td>
              </tr>
              <tr>
                <td><strong style="color: var(--accent-red); font-size: 15.5px;">Faixa 1 · Educadora</strong><br><small style="font-size: 13px;">Maria Silvia</small></td>
                <td><code>#/entrar</code> &rarr; <code>#/hoje</code> &rarr; <code>#/chamada</code> &rarr; <code>#/folha</code> &rarr; <code>#/turma</code></td>
                <td>Chamada em 1 toque no início da tarde (apenas desmarcar ausências). Fim das folhas de papel e conferências manuais.</td>
                <td><a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="figma-link-pill" style="padding: 6px 12px; font-size: 12.5px;">Abrir Faixa 1 ↗</a></td>
              </tr>
              <tr>
                <td><strong style="color: var(--accent-blue); font-size: 15.5px;">Faixa 3 · Coordenação</strong><br><small style="font-size: 13px;">Rita Amaral</small></td>
                <td><code>#/painel</code> &rarr; <code>#/turma/:id</code> &rarr; <code>#/alertas</code> &rarr; <code>#/consentimentos</code> &rarr; <code>#/planilha</code></td>
                <td>Monitora a régua de 75% para intervenção preventiva e exporta os dados na planilha histórica do Instituto com um clique.</td>
                <td><a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="figma-link-pill" style="padding: 6px 12px; font-size: 12.5px;">Abrir Faixa 3 ↗</a></td>
              </tr>
              <tr>
                <td><strong style="color: var(--accent-amber); font-size: 15.5px;">Faixa 4 · Diretoria</strong><br><small style="font-size: 13px;">Solange Ribeiro</small></td>
                <td><code>#/painel</code> &rarr; <code>#/relatorio</code> &rarr; <code>#/impacto-sroi</code></td>
                <td>Prestação de contas consolidada e relatório de impacto para conselho e doadores sem exibição de dados nominais de crianças.</td>
                <td><a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="figma-link-pill" style="padding: 6px 12px; font-size: 12.5px;">Abrir Faixa 4 ↗</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- FAIXAS PANORÂMICAS COM ROLAGEM HORIZONTAL E LETRAS GRANDES (FIGURA 2) -->
      <h4 style="font-size: 18px; font-weight: 800; margin: 32px 0 16px; color: var(--ink);">
        🖼️ Faixas de Navegação Contínua Inspecionadas no Figma (Rolagem Horizontal em Alta Resolução):
      </h4>
      <p style="font-size: 14.5px; color: var(--ink-muted); margin-bottom: 20px;">
        Como cada faixa no canvas original possui entre 2.600 pt e 8.200 pt de extensão, os visualizadores abaixo possuem 
        <strong>rolagem horizontal suave (overflow-x: auto)</strong> para permitir a leitura clara de cada tela sem compressão visual.
      </p>

      <div style="display: flex; flex-direction: column; gap: 24px;">
        
        <!-- Faixa 2: Psicóloga -->
        <div style="background: white; border: 1.5px solid #2E6B47; border-radius: 14px; padding: 18px; box-shadow: 0 2px 10px rgba(46,107,71,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 16px; font-weight: 800; color: #2E6B47;">Faixa 2 · Psicóloga (Carolina Duarte) — 7.272 pt de extensão</div>
            <div style="display: flex; gap: 8px;">
              <span style="font-size: 12px; background: var(--accent-green-bg); color: #2E6B47; padding: 3px 8px; border-radius: 4px; font-weight: 700;">↔ Role horizontalmente</span>
              <a href="figma_images/canonico_faixa2_psicologa.png" target="_blank" class="figma-link-pill" style="font-size: 11.5px; padding: 3px 8px;">Ver Imagem Cheia</a>
            </div>
          </div>
          <div style="overflow-x: auto; background: #FAF7F2; border: 1px solid var(--line); border-radius: 8px; padding: 12px; -webkit-overflow-scrolling: touch;">
            <div style="min-width: 2200px;">
              <img src="figma_images/canonico_faixa2_psicologa.png" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/igorregoir-lgtm/percurso-mvp/main/public/figma_images/canonico_faixa2_psicologa.png';" alt="Faixa 2 Psicóloga" style="width: 100%; height: auto; display: block;" loading="lazy">
            </div>
          </div>
          <div style="margin-top: 12px; font-size: 14.5px; color: var(--ink); line-height: 1.55; background: #F4EFE6; padding: 12px 16px; border-radius: 8px;">
            <strong>Telas da Faixa 2:</strong> <code>#/entrar</code> (Login Carolina) &rarr; <code>#/hoje</code> (Card Vivência Pendente) &rarr; <code>#/voz</code> (Gravar 40s) &rarr; <code>#/confirmar</code> (Conferência Humana) &rarr; <code>#/relato</code> (Texto CRP Aprovado) &rarr; <code>#/recado</code> (WhatsApp Seguro).
          </div>
        </div>

        <!-- Faixa 1: Educadora -->
        <div style="background: white; border: 1.5px solid #B23528; border-radius: 14px; padding: 18px; box-shadow: 0 2px 10px rgba(178,53,40,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 16px; font-weight: 800; color: #B23528;">Faixa 1 · Educadora (Maria Silvia) — 8.196 pt de extensão</div>
            <div style="display: flex; gap: 8px;">
              <span style="font-size: 12px; background: var(--accent-red-bg); color: #B23528; padding: 3px 8px; border-radius: 4px; font-weight: 700;">↔ Role horizontalmente</span>
              <a href="figma_images/canonico_faixa1_educadora.png" target="_blank" class="figma-link-pill" style="font-size: 11.5px; padding: 3px 8px;">Ver Imagem Cheia</a>
            </div>
          </div>
          <div style="overflow-x: auto; background: #FAF7F2; border: 1px solid var(--line); border-radius: 8px; padding: 12px; -webkit-overflow-scrolling: touch;">
            <div style="min-width: 2200px;">
              <img src="figma_images/canonico_faixa1_educadora.png" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/igorregoir-lgtm/percurso-mvp/main/public/figma_images/canonico_faixa1_educadora.png';" alt="Faixa 1 Educadora" style="width: 100%; height: auto; display: block;" loading="lazy">
            </div>
          </div>
          <div style="margin-top: 12px; font-size: 14.5px; color: var(--ink); line-height: 1.55; background: #F4EFE6; padding: 12px 16px; border-radius: 8px;">
            <strong>Telas da Faixa 1:</strong> <code>#/entrar</code> (Login Maria Silvia) &rarr; <code>#/hoje</code> (Avisos da Tarde) &rarr; <code>#/chamada</code> (Chamada em 1 toque) &rarr; <code>#/folha</code> (Check-in Turma A) &rarr; <code>#/turma</code> (Histórico de Frequência).
          </div>
        </div>

        <!-- Faixa 3: Coordenação -->
        <div style="background: white; border: 1.5px solid #23527C; border-radius: 14px; padding: 18px; box-shadow: 0 2px 10px rgba(35,82,124,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 16px; font-weight: 800; color: #23527C;">Faixa 3 · Coordenação (Rita Amaral) — 5.424 pt de extensão</div>
            <div style="display: flex; gap: 8px;">
              <span style="font-size: 12px; background: var(--accent-blue-bg); color: #23527C; padding: 3px 8px; border-radius: 4px; font-weight: 700;">↔ Role horizontalmente</span>
              <a href="figma_images/canonico_faixa3_coordenacao.png" target="_blank" class="figma-link-pill" style="font-size: 11.5px; padding: 3px 8px;">Ver Imagem Cheia</a>
            </div>
          </div>
          <div style="overflow-x: auto; background: #FAF7F2; border: 1px solid var(--line); border-radius: 8px; padding: 12px; -webkit-overflow-scrolling: touch;">
            <div style="min-width: 2200px;">
              <img src="figma_images/canonico_faixa3_coordenacao.png" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/igorregoir-lgtm/percurso-mvp/main/public/figma_images/canonico_faixa3_coordenacao.png';" alt="Faixa 3 Coordenação" style="width: 100%; height: auto; display: block;" loading="lazy">
            </div>
          </div>
          <div style="margin-top: 12px; font-size: 14.5px; color: var(--ink); line-height: 1.55; background: #F4EFE6; padding: 12px 16px; border-radius: 8px;">
            <strong>Telas da Faixa 3:</strong> <code>#/painel</code> (Visão Geral de Turmas) &rarr; <code>#/turma/turma-a</code> (Ficha de Turma) &rarr; <code>#/alertas</code> (Régua de 75%) &rarr; <code>#/consentimentos</code> (Gestão Art. 14 LGPD) &rarr; <code>#/planilha</code> (Exportação).
          </div>
        </div>

        <!-- Faixa 4: Diretoria -->
        <div style="background: white; border: 1.5px solid #8A6414; border-radius: 14px; padding: 18px; box-shadow: 0 2px 10px rgba(138,100,20,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 16px; font-weight: 800; color: #8A6414;">Faixa 4 · Diretoria (Solange Ribeiro) — 2.652 pt de extensão</div>
            <div style="display: flex; gap: 8px;">
              <span style="font-size: 12px; background: var(--accent-amber-bg); color: #8A6414; padding: 3px 8px; border-radius: 4px; font-weight: 700;">↔ Role horizontalmente</span>
              <a href="figma_images/canonico_faixa4_diretoria.png" target="_blank" class="figma-link-pill" style="font-size: 11.5px; padding: 3px 8px;">Ver Imagem Cheia</a>
            </div>
          </div>
          <div style="overflow-x: auto; background: #FAF7F2; border: 1px solid var(--line); border-radius: 8px; padding: 12px; -webkit-overflow-scrolling: touch;">
            <div style="min-width: 1800px;">
              <img src="figma_images/canonico_faixa4_diretoria.png" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/igorregoir-lgtm/percurso-mvp/main/public/figma_images/canonico_faixa4_diretoria.png';" alt="Faixa 4 Diretoria" style="width: 100%; height: auto; display: block;" loading="lazy">
            </div>
          </div>
          <div style="margin-top: 12px; font-size: 14.5px; color: var(--ink); line-height: 1.55; background: #F4EFE6; padding: 12px 16px; border-radius: 8px;">
            <strong>Telas da Faixa 4:</strong> <code>#/painel</code> (Consolidação de Impacto) &rarr; <code>#/relatorio</code> (Relatório em PDF/Impressão sem Nomes) &rarr; <code>#/impacto-sroi</code> (Cálculo de Retorno Social sobre Investimento).
          </div>
        </div>

      </div>
    </section>

    <!-- SECTION: A HISTÓRIA DA AURORA"""
    content = re.sub(secao_conexoes_antiga, secao_conexoes_nova, content, flags=re.DOTALL)

    # =========================================================================
    # 4. MARCO 4: JORNADA DE USUÁRIO FIGJAM (FIGURA 3) COM FONTE GRANDE E ZOOM
    # =========================================================================
    marco4_antigo = r'<!-- MARCO 4: JORNADA DO USUÁRIO GRUPO 06 -->.*?<!-- MARCO 5: WIREFRAME'
    marco4_novo = """<!-- MARCO 4: JORNADA DO USUÁRIO GRUPO 06 -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">04</div>
            <div>
              <div class="artifact-name">Jornada do Usuário Nativa (AS-IS vs. TO-BE)</div>
              <div class="artifact-name" style="font-size: 14px; font-weight: 600; color: var(--ink-muted);">FigJam Nativo do Grupo 06 · 6 Fases & 8 Momentos da Verdade</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="https://www.figma.com/board/QSzxKH22Hnevnhw7HluW6m/Jornada-de-Usu%C3%A1rio-%E2%80%94-Instituto-Eben%C3%A9zer--Grupo-06-" target="_blank" class="figma-link-pill">
              Abrir no FigJam ↗
            </a>
            <a href="figma_images/jornada_usuario_figjam.png" target="_blank" class="figma-link-pill">
              🔍 Ver Imagem em Resolução Máxima
            </a>
          </div>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p style="font-size: 16px; line-height: 1.65; color: var(--ink);">
              Mapeamento completo dos pontos de contato, estados emocionais, canais e dores nas 6 etapas do ciclo pedagógico: 
              <em>Observar</em>, <em>Registrar Presença</em>, <em>Contar o Dia</em>, <em>Perceber Ausência</em>, <em>Provar Evolução</em> e <em>Receber Devolutiva</em>.
            </p>
          </div>

          <!-- Pan Viewer da Imagem da Jornada FigJam -->
          <div style="background: #FAF7F2; border: 1.5px solid var(--line-dark); border-radius: 12px; padding: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: var(--ink-muted); font-weight: 600;">
              <span>↔ Arraste horizontalmente para inspecionar o board completo do FigJam em tamanho real</span>
              <span style="font-family: var(--font-mono); font-size: 11px; background: white; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--line);">Board Original FigJam</span>
            </div>
            <div style="min-width: 1400px;">
              <img src="figma_images/jornada_usuario_figjam.png" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/igorregoir-lgtm/percurso-mvp/main/public/figma_images/jornada_usuario_figjam.png';" alt="Jornada de Usuário FigJam Grupo 06" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);" loading="lazy">
            </div>
          </div>
        </div>

        <!-- TRANSCRIÇÃO COMPLETA E EXPANDIDA DA JORNADA COM FONTE GRANDE (15px-17px) -->
        <div style="background: white; border: 1.5px solid var(--line-dark); border-radius: 16px; padding: 32px; margin-top: 24px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid var(--line); padding-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h4 style="font-size: 22px; font-weight: 800; color: var(--ink); margin: 0;">
                📋 As 6 Fases da Jornada Real Levantadas em Campo (Leitura Completa em Alta Legibilidade):
              </h4>
              <p style="font-size: 15px; color: var(--ink-muted); margin: 4px 0 0;">
                Depoimentos literais coletados durante a imersão de campo (Gravações 81 a 84) transcritos sem redução de fonte.
              </p>
            </div>
            <span style="background: var(--card-alt); border: 1px solid var(--line-dark); padding: 6px 14px; border-radius: 99px; font-size: 13px; font-weight: 700; color: var(--ink);">
              6 Fases · 8 Momentos da Verdade
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
            
            <!-- Fase 01 -->
            <div style="background: var(--card-alt); border-radius: 12px; padding: 22px; border-left: 6px solid #8A6414; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <strong style="font-size: 17px; color: var(--ink);">01 · Antes: Ela monta o encontro sozinha</strong>
                <span style="font-size: 24px;">🙂</span>
              </div>
              <p style="font-size: 15px; color: var(--ink-muted); margin-bottom: 14px; line-height: 1.6;">
                Segura no que faz, sozinha no resto. A atividade ela sabe dar; o problema é que a casa inteira cabe em duas pessoas.
              </p>
              <div style="font-size: 14.5px; font-style: italic; color: #3A352F; background: white; padding: 14px; border-radius: 8px; border: 1px solid var(--line); line-height: 1.6;">
                "Mas ele tem uma coisa razoavelmente organizada aqui. Para só ele e uma pedagoga. Razoavelmente organizada." <br>
                <small style="color: var(--ink-subtle); font-style: normal; font-weight: 600; display: block; margin-top: 6px;">— Gravação 81 · Observação do entrevistador</small>
              </div>
              <div style="margin-top: 12px; font-size: 14px; color: var(--accent-green); font-weight: 700; line-height: 1.5;">
                ✔ Onde o Percurso entra: Notificação contextual antes do encontro para preparar a captura com custo zero de tempo.
              </div>
            </div>

            <!-- Fase 02 -->
            <div style="background: var(--card-alt); border-radius: 12px; padding: 22px; border-left: 6px solid #2E6B47; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <strong style="font-size: 17px; color: var(--ink);">02 · Durante: Acontece a coisa boa e ninguém vê</strong>
                <span style="font-size: 24px;">✨</span>
              </div>
              <p style="font-size: 15px; color: var(--ink-muted); margin-bottom: 14px; line-height: 1.6;">
                Todo o valor está aqui, e nada vira registro. Mãos e atenção ocupadas conduzindo a dinâmica e acolhendo as crianças.
              </p>
              <div style="font-size: 14.5px; font-style: italic; color: #3A352F; background: white; padding: 14px; border-radius: 8px; border: 1px solid var(--line); line-height: 1.6;">
                "Agora eu já mando um vídeozinho, tá vendo? Do que tá acontecendo aqui. E você que fez? Pegou seu celular, gravou e fez. Isso, é fácil. Se você pudesse fazer tudo isso no celular, seria muito mais fácil. Do que você parar aí pro notebook." <br>
                <small style="color: var(--ink-subtle); font-style: normal; font-weight: 600; display: block; margin-top: 6px;">— Gravação 82 · Fala da liderança comunitária</small>
              </div>
              <div style="margin-top: 12px; font-size: 14px; color: var(--accent-green); font-weight: 700; line-height: 1.5;">
                ✔ Onde o Percurso entra: Celular na mão com gravação de 40s de fala assim que o grupo termina na sala.
              </div>
            </div>

            <!-- Fase 03 -->
            <div style="background: var(--card-alt); border-radius: 12px; padding: 22px; border-left: 6px solid #B23528; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <strong style="font-size: 17px; color: var(--ink);">03 · Logo depois: A hora em que o registro deveria nascer</strong>
                <span style="font-size: 24px;">😕</span>
              </div>
              <p style="font-size: 15px; color: var(--ink-muted); margin-bottom: 14px; line-height: 1.6;">
                Queda de energia pós-encontro. Ela nomeia a dor em voz alta: fazer, a equipe faz bem. Registrar é o que quebra o ritmo.
              </p>
              <div style="font-size: 14.5px; font-style: italic; color: #3A352F; background: white; padding: 14px; border-radius: 8px; border: 1px solid var(--line); line-height: 1.6;">
                "Eu acho que o maior desafio aqui é registrar o que você fez, né? Essa é a maior dificuldade, é o registro." <br>
                <small style="color: var(--ink-subtle); font-style: normal; font-weight: 600; display: block; margin-top: 6px;">— Gravação 82 · Fala literal da psicóloga</small>
              </div>
              <div style="margin-top: 12px; font-size: 14px; color: var(--accent-green); font-weight: 700; line-height: 1.5;">
                ✔ Onde o Percurso entra: Check-in por contagens simples e fala espontânea sem exigir telas burocráticas.
              </div>
            </div>

            <!-- Fase 04 -->
            <div style="background: var(--card-alt); border-radius: 12px; padding: 22px; border-left: 6px solid #5A3D68; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <strong style="font-size: 17px; color: var(--ink);">04 · À noite: O relatório é empurrado</strong>
                <span style="font-size: 24px;">😮‍💨</span>
              </div>
              <p style="font-size: 15px; color: var(--ink-muted); margin-bottom: 14px; line-height: 1.6;">
                Fundo do dia. Não é má vontade: não sobra tempo nem energia no final de semana, e a negativa é categórica.
              </p>
              <div style="font-size: 14.5px; font-style: italic; color: #3A352F; background: white; padding: 14px; border-radius: 8px; border: 1px solid var(--line); line-height: 1.6;">
                "Você depois tem que sair daqui, preencher o relatório... Não dá, não dá." <br>
                <small style="color: var(--ink-subtle); font-style: normal; font-weight: 600; display: block; margin-top: 6px;">— Gravação 84 · Fala literal da profissional</small>
              </div>
              <div style="margin-top: 12px; font-size: 14px; color: var(--accent-green); font-weight: 700; line-height: 1.5;">
                ✔ Onde o Percurso entra: Rascunho no padrão do CRP já sai estruturado; a psicóloga apenas lê, valida e libera na hora.
              </div>
            </div>

            <!-- Fase 05 -->
            <div style="background: var(--card-alt); border-radius: 12px; padding: 22px; border-left: 6px solid #23527C; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <strong style="font-size: 17px; color: var(--ink);">05 · Na semana: Tem história, não tem prova</strong>
                <span style="font-size: 24px;">😟</span>
              </div>
              <p style="font-size: 15px; color: var(--ink-muted); margin-bottom: 14px; line-height: 1.6;">
                Peso existencial: entusiasmo com as crianças, mas ansiedade extrema na hora de prestar contas a conselhos e financiadores.
              </p>
              <div style="font-size: 14.5px; font-style: italic; color: #3A352F; background: white; padding: 14px; border-radius: 8px; border: 1px solid var(--line); line-height: 1.6;">
                "E aí você fica, a gente sempre faz o trabalho com os meninos... só que a gente não consegue meio que ter um registro pra conseguir, por exemplo, mostrar pros investidores, sabe?" <br>
                <small style="color: var(--ink-subtle); font-style: normal; font-weight: 600; display: block; margin-top: 6px;">— Gravação 83 · Fala da psicóloga</small>
              </div>
              <div style="margin-top: 12px; font-size: 14px; color: var(--accent-green); font-weight: 700; line-height: 1.5;">
                ✔ Onde o Percurso entra: Consolidação de médias e relatórios em 1 clique com anonimização total das crianças.
              </div>
            </div>

            <!-- Fase 06 -->
            <div style="background: var(--card-alt); border-radius: 12px; padding: 22px; border-left: 6px solid #2E6B47; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <strong style="font-size: 17px; color: var(--ink);">06 · Depois: Registro para conversar, não arquivar</strong>
                <span style="font-size: 24px;">🤝</span>
              </div>
              <p style="font-size: 15px; color: var(--ink-muted); margin-bottom: 14px; line-height: 1.6;">
                Alívio com condição: interesse genuíno, com a exigência inegociável de poder revisar e corrigir qualquer texto gerado.
              </p>
              <div style="font-size: 14.5px; font-style: italic; color: #3A352F; background: white; padding: 14px; border-radius: 8px; border: 1px solid var(--line); line-height: 1.6;">
                "Que daí seria entre profissionais, que é mais rico ainda." <br>
                <small style="color: var(--ink-subtle); font-style: normal; font-weight: 600; display: block; margin-top: 6px;">— Gravação 84 · Diálogo sobre a assistente social parceira</small>
              </div>
              <div style="margin-top: 12px; font-size: 14px; color: var(--accent-green); font-weight: 700; line-height: 1.5;">
                ✔ Onde o Percurso entra: Parecer sigiloso por código para diálogo interdisciplinar na rede de proteção social.
              </div>
            </div>

          </div>

          <!-- Matriz Comparativa da Jornada AS-IS vs TO-BE com Tipografia Grande -->
          <div style="margin-top: 32px; border-top: 2px solid var(--line); padding-top: 24px;">
            <h5 style="font-size: 18px; font-weight: 800; color: var(--ink); margin-bottom: 16px;">
              📊 Matriz de Ganho Operacional da Jornada (AS-IS vs. TO-BE):
            </h5>
            <div class="table-responsive">
              <table class="data-table" style="font-size: 15px; line-height: 1.6;">
                <thead>
                  <tr>
                    <th style="width: 20%;">Atividade</th>
                    <th style="width: 30%;">Como É Hoje (AS-IS)</th>
                    <th style="width: 35%;">Com o Percurso (TO-BE)</th>
                    <th style="width: 15%;">Ganho Real</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Presença das Crianças</strong></td>
                    <td>Papel sulfite na prancheta + digitação manual em planilha na semana seguinte.</td>
                    <td>1 toque no celular ao iniciar o encontro; apenas desmarca ausências.</td>
                    <td><span class="badge-tag badge-tobe" style="font-size: 13px;">15 min &rarr; 40 seg</span></td>
                  </tr>
                  <tr>
                    <td><strong>Registro da Vivência</strong></td>
                    <td>Memória individual, rascunhos soltos no WhatsApp ou omissão por exaustão.</td>
                    <td>Áudio de ~40 segundos no término da oficina com transcrição determinística.</td>
                    <td><span class="badge-tag badge-tobe" style="font-size: 13px;">Zero trabalho à noite</span></td>
                  </tr>
                  <tr>
                    <td><strong>Relatório Técnico do CRP</strong></td>
                    <td>Redação manual de 2 horas no domingo à noite com risco de dados expostos.</td>
                    <td>Estruturação conforme Resolução CFP 06/2019 sem expor nomes de crianças.</td>
                    <td><span class="badge-tag badge-tobe" style="font-size: 13px;">2h &rarr; 2 minutos</span></td>
                  </tr>
                  <tr>
                    <td><strong>Prestação de Contas</strong></td>
                    <td>Dias inteiros compilando relatórios subjetivos para doadores corporativos.</td>
                    <td>Painel gerencial com agregação automática e supressão quando n &lt; 5.</td>
                    <td><span class="badge-tag badge-tobe" style="font-size: 13px;">12h &rarr; 5 minutos</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="artifact-footer">
          <span style="font-size: 14px; color: var(--ink-muted);">Board FigJam: <code>QSzxKH22Hnevnhw7HluW6m</code></span>
          <a href="https://www.figma.com/board/QSzxKH22Hnevnhw7HluW6m/Jornada-de-Usu%C3%A1rio-%E2%80%94-Instituto-Eben%C3%A9zer--Grupo-06-" target="_blank" class="figma-link-pill" style="font-size: 13px; padding: 6px 14px;">
            Acessar FigJam ↗
          </a>
        </div>
      </div>

      <!-- MARCO 5: WIREFRAME"""
    content = re.sub(marco4_antigo, marco4_novo, content, flags=re.DOTALL)

    # =========================================================================
    # 5. MARCO 5: TASK FLOW FIGJAM (FIGURA 4) COM FONTE GRANDE E ZOOM
    # =========================================================================
    marco5_antigo = r'<!-- MARCO 5: WIREFRAME.*?<!-- MARCO 6: EXERCÍCIO'
    marco5_novo = """<!-- MARCO 5: WIREFRAME & TASK FLOW INTERATIVO -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">05</div>
            <div>
              <div class="artifact-name">Wireframe & Task Flow Detalhado (US-6)</div>
              <div class="artifact-name" style="font-size: 14px; font-weight: 600; color: var(--ink-muted);">Fluxo Operacional de Registro de Vivência em &le; 3 Minutos · FigJam</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="https://www.figma.com/board/4q6n3WBQmtpgWDvO0YAofa/Wire-frame" target="_blank" class="figma-link-pill">
              Abrir Board no Figma ↗
            </a>
            <a href="figma_images/task_flow_percurso.png" target="_blank" class="figma-link-pill">
              🔍 Ver Imagem em Resolução Máxima
            </a>
          </div>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p style="font-size: 16px; line-height: 1.65; color: var(--ink);">
              O diagrama de Task Flow detalha o fluxo operacional da profissional ao registrar um encontro: 
              gatilho na tela inicial &rarr; conferência da chamada rápida &rarr; fala do dia (~40s) &rarr; extração assistida por IA local 
              &rarr; <strong>nó de decisão e conferência humana obrigatória</strong> &rarr; aprovação do relato sem identificação nominal 
              &rarr; despacho do recado coletivo para os canais de contato.
            </p>
          </div>

          <!-- Pan Viewer da Imagem do Task Flow -->
          <div style="background: #FAF7F2; border: 1.5px solid var(--line-dark); border-radius: 12px; padding: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: var(--ink-muted); font-weight: 600;">
              <span>↔ Arraste horizontalmente para inspecionar os blocos de decisão do Task Flow</span>
              <span style="font-family: var(--font-mono); font-size: 11px; background: white; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--line);">Diagrama FigJam</span>
            </div>
            <div style="min-width: 1300px;">
              <img src="figma_images/task_flow_percurso.png" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/igorregoir-lgtm/percurso-mvp/main/public/figma_images/task_flow_percurso.png';" alt="Task Flow do Percurso Grupo 06" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);" loading="lazy">
            </div>
          </div>
        </div>

        <!-- TRANSCRIÇÃO COMPLETA E EXPANDIDA DO TASK FLOW COM FONTE GRANDE (15px-16.5px) -->
        <div style="background: white; border: 1.5px solid var(--line-dark); border-radius: 16px; padding: 32px; margin-top: 24px; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid var(--line); padding-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h4 style="font-size: 22px; font-weight: 800; color: var(--ink); margin: 0;">
                ⚡ Task Flow Detalhado · Registrar a Vivência Falando (US-6)
              </h4>
              <div style="font-size: 15px; color: var(--ink-muted); margin-top: 4px;">
                Gatilho: Sábado 11h40 (grupo acabou, sala sendo arrumada) &rarr; Meta Estrita: Relato liberado em &le; 3 minutos
              </div>
            </div>
            <span class="badge-tag badge-tobe" style="font-size: 14px; padding: 6px 14px;">Cronômetro Validado: ~160 seg</span>
          </div>

          <div class="table-responsive">
            <table class="data-table" style="font-size: 15px; line-height: 1.65;">
              <thead>
                <tr>
                  <th style="width: 8%;">Passo</th>
                  <th style="width: 16%;">Tela no App</th>
                  <th style="width: 46%;">O que a Profissional Faz no Celular</th>
                  <th style="width: 14%;">Tempo Estimado</th>
                  <th style="width: 16%;">Atrito & Solução</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>01</strong></td>
                  <td><code>#/entrar</code></td>
                  <td>Toca no 1º card <strong>"Carolina Duarte (Psicóloga)"</strong> na abertura do app. Sem senha para não travar o fluxo na sala.</td>
                  <td>~10 segundos</td>
                  <td><span class="badge-tag badge-tobe" style="font-size: 12.5px;">Zero atrito</span></td>
                </tr>
                <tr>
                  <td><strong>02</strong></td>
                  <td><code>#/hoje</code></td>
                  <td>Vê o card destacado <em>"Registro da Vivência · Pendente"</em> e toca no botão principal <strong>"Contar como foi"</strong>.</td>
                  <td>~5 segundos</td>
                  <td><span class="badge-tag badge-tobe" style="font-size: 12.5px;">Ação direta</span></td>
                </tr>
                <tr>
                  <td><strong>03</strong></td>
                  <td><code>#/voz</code></td>
                  <td>Lê o aviso de proteção (nenhuma criança gravada), toca no microfone e fala naturalmente por 40s sobre a oficina realizada.</td>
                  <td>~45 segundos</td>
                  <td><span class="badge-tag badge-tobe" style="font-size: 12.5px;">Sem digitar nada</span></td>
                </tr>
                <tr>
                  <td><strong>04</strong></td>
                  <td><code>#/confirmar</code></td>
                  <td>Visualiza os campos pré-preenchidos pela transcrição (procedimento, contagens estimadas) e toca <strong>"Confirmar e guardar"</strong>.</td>
                  <td>~30 segundos</td>
                  <td><span class="badge-tag badge-tobe" style="font-size: 12.5px;">Conferência rápida</span></td>
                </tr>
                <tr>
                  <td><strong>05</strong></td>
                  <td><code>#/relato</code></td>
                  <td>Lê o texto determinístico gerado no padrão técnico do CRP (sem nomes de crianças) e toca <strong>"Revisei — liberar relato"</strong>.</td>
                  <td>~60 segundos</td>
                  <td><span class="badge-tag badge-tobe" style="font-size: 12.5px;">Aprovação humana</span></td>
                </tr>
                <tr style="background: var(--accent-green-bg); font-weight: 700;">
                  <td><strong>Fim</strong></td>
                  <td><code>#/recado</code></td>
                  <td>Folha fechada, relato gravado no histórico da turma e recado de WhatsApp pronto para disparo com 1 toque.</td>
                  <td>Total: ~2,5 min</td>
                  <td><strong style="color: var(--accent-green); font-size: 14px;">Meta Atingida (&le; 3 min)</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="artifact-footer">
          <span style="font-size: 14px; color: var(--ink-muted);">Board: <code>4q6n3WBQmtpgWDvO0YAofa</code> · Task Flow Nativo</span>
          <a href="https://www.figma.com/board/4q6n3WBQmtpgWDvO0YAofa/Wire-frame" target="_blank" class="figma-link-pill" style="font-size: 13px; padding: 6px 14px;">
            Acessar no Figma ↗
          </a>
        </div>
      </div>

      <!-- MARCO 6: EXERCÍCIO"""
    content = re.sub(marco5_antigo, marco5_novo, content, flags=re.DOTALL)

    # Gravar o arquivo atualizar-dossie.py atualizado
    with open("scripts/atualizar-dossie.py", "w", encoding="utf-8") as f:
        f.write(content)

    print(f"scripts/atualizar-dossie.py atualizado com sucesso! ({len(content)} bytes)")

if __name__ == "__main__":
    aplicar_melhorias()
