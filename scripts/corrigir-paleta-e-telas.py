# -*- coding: utf-8 -*-
import re

with open("scripts/atualizar-dossie.py", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Corrigir CSS de .connection-matrix-box, .conn-col, .conn-item
css_antigo = r'\.connection-matrix-box \{.*?\.conn-count \{.*?\}'

css_novo = """.connection-matrix-box {
      background: var(--card);
      color: var(--ink);
      border: 1.5px solid var(--line-dark);
      border-radius: var(--radius-md);
      padding: 28px;
      margin: 28px 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }

    .conn-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 20px;
    }

    .conn-col {
      background: var(--card-alt);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 16px;
    }

    .conn-col h5 {
      font-family: var(--font-sans);
      font-size: 12.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 8px;
    }

    .conn-item {
      font-size: 12.5px;
      padding: 8px 10px;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 6px;
      margin-bottom: 8px;
      color: var(--ink);
      font-family: var(--font-mono);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .conn-count {
      font-size: 11px;
      font-weight: 700;
    }"""

text = re.sub(css_antigo, css_novo, text, flags=re.DOTALL)

# 2. Corrigir a Seção 3 inteira no HTML
secao3_antiga = r'<!-- SECTION: TELA DE CONEXÕES.*?<!-- Banner panoramic screens -->'

secao3_nova = """<!-- SECTION: TELA DE CONEXÕES (12 TELAS ESSENCIAIS EM 4 PAPÉIS) -->
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
        <p>
          Em avaliações de prototipagem para bancas acadêmicas e validações de campo, telas órfãs (que não podem ser alcançadas por cliques) 
          ou telas sem retorno (becos sem saída) degradam a experiência. No <strong>Percurso</strong>, cada uma das 12 telas essenciais possui 
          rotas diretas de ida e volta articuladas pelos botões de ação e pela barra inferior de cada papel.
        </p>
      </div>

      <!-- Connection Visual Matrix -->
      <div class="connection-matrix-box">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--line); padding-bottom: 14px;">
          <div>
            <h4 style="font-size: 18px; font-weight: 800; color: var(--ink); margin: 0;">Topologia da Malha de Navegação (12 Telas Essenciais)</h4>
            <p style="font-size: 13px; color: var(--ink-muted); margin: 4px 0 0;">Ponto de partida unificado: <code>#/entrar</code> com roteamento para os 4 papéis reais.</p>
          </div>
          <span style="background: var(--accent-green-bg); color: var(--accent-green); border: 1px solid rgba(46,107,71,0.3); padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; font-family: var(--font-mono);">
            12 Telas Validadas · Zero Telas Órfãs
          </span>
        </div>

        <div class="conn-grid">
          <!-- Coluna 1: Psicóloga (1º LUGAR) -->
          <div class="conn-col" style="border-top: 3px solid var(--accent-green);">
            <h5 style="color: var(--accent-green);">Faixa 2 · Psicóloga (Carolina)</h5>
            <div style="font-size: 11px; color: var(--ink-muted); margin-bottom: 10px; font-weight: 600;">3 Telas Diárias + 2 Devolutivas</div>
            <div class="conn-item"><span>#/hoje (Vivência)</span> <span class="conn-count" style="color: var(--accent-green);">Entrada</span></div>
            <div class="conn-item"><span>#/voz (40s Áudio)</span> <span class="conn-count" style="color: var(--accent-green);">Captura</span></div>
            <div class="conn-item"><span>#/relato (CRP)</span> <span class="conn-count" style="color: var(--accent-green);">1 Clique</span></div>
            <div class="conn-item"><span>#/recado (WhatsApp)</span> <span class="conn-count" style="color: var(--ink-subtle);">Devolutiva</span></div>
            <div class="conn-item"><span>#/parecer (Parceiro)</span> <span class="conn-count" style="color: var(--ink-subtle);">Sigilo</span></div>
          </div>

          <!-- Coluna 2: Educadora -->
          <div class="conn-col" style="border-top: 3px solid var(--accent-red);">
            <h5 style="color: var(--accent-red);">Faixa 1 · Educadora (Maria Silvia)</h5>
            <div style="font-size: 11px; color: var(--ink-muted); margin-bottom: 10px; font-weight: 600;">2 Toques Rápidos no Celular</div>
            <div class="conn-item"><span>#/hoje (Alertas)</span> <span class="conn-count" style="color: var(--accent-red);">Entrada</span></div>
            <div class="conn-item"><span>#/chamada (1 toque)</span> <span class="conn-count" style="color: var(--accent-red);">30 seg</span></div>
            <div class="conn-item"><span>#/folha (Turma)</span> <span class="conn-count" style="color: var(--ink-subtle);">Check-in</span></div>
            <div class="conn-item"><span>#/turma (Médias)</span> <span class="conn-count" style="color: var(--ink-subtle);">Histórico</span></div>
          </div>

          <!-- Coluna 3: Coordenação -->
          <div class="conn-col" style="border-top: 3px solid var(--accent-blue);">
            <h5 style="color: var(--accent-blue);">Faixa 3 · Coordenação (Rita)</h5>
            <div style="font-size: 11px; color: var(--ink-muted); margin-bottom: 10px; font-weight: 600;">Painel Único & Planilha</div>
            <div class="conn-item"><span>#/painel (Geral)</span> <span class="conn-count" style="color: var(--accent-blue);">Consolidado</span></div>
            <div class="conn-item"><span>#/alertas (Régua 75%)</span> <span class="conn-count" style="color: var(--accent-blue);">Busca Ativa</span></div>
            <div class="conn-item"><span>#/consentimentos</span> <span class="conn-count" style="color: var(--ink-subtle);">Art. 14</span></div>
            <div class="conn-item"><span>#/equipe (Turmas)</span> <span class="conn-count" style="color: var(--ink-subtle);">Alocação</span></div>
          </div>

          <!-- Coluna 4: Diretoria -->
          <div class="conn-col" style="border-top: 3px solid var(--accent-amber);">
            <h5 style="color: var(--accent-amber);">Faixa 4 · Diretoria (Solange)</h5>
            <div style="font-size: 11px; color: var(--ink-muted); margin-bottom: 10px; font-weight: 600;">Prestação de Contas & Financiador</div>
            <div class="conn-item"><span>#/painel (Impacto)</span> <span class="conn-count" style="color: var(--accent-amber);">Métricas</span></div>
            <div class="conn-item"><span>#/relatorio (Doador)</span> <span class="conn-count" style="color: var(--ink-subtle);">Sem Nomes</span></div>
            <div class="conn-item"><span>#/perguntar (Aurora 🌻)</span> <span class="conn-count" style="color: var(--ink-subtle);">Assistente</span></div>
          </div>
        </div>

        <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-muted); line-height: 1.55;">
          <strong>Padrão de Qualidade de UX:</strong> Em vez de impor telas burocráticas a quem já não tem tempo, o sistema concentra as tarefas operacionais em <strong>12 telas limpas</strong>, desenhadas especificamente para telas de smartphone com botões de toque generosos e zero formulários extensos.
        </div>
      </div>

      <!-- Banner panoramic screens -->"""

text = re.sub(secao3_antiga, secao3_nova, text, flags=re.DOTALL)

# 3. Substituir no nav-bar o link "153 Conexões Figma" para "12 Telas & Conexões"
text = text.replace('class="nav-link">153 Conexões Figma</a>', 'class="nav-link">12 Telas & Conexões</a>')

with open("scripts/atualizar-dossie.py", "w", encoding="utf-8") as f:
    f.write(text)

print("scripts/atualizar-dossie.py atualizado com sucesso!")
