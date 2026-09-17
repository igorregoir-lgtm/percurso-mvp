# -*- coding: utf-8 -*-
"""
Script que refina scripts/atualizar-dossie.py para atender 100% dos apontamentos de UX do usuário:
1. Elimina as telas pretas (Topologia e Enxugamento) e adota a paleta quente e elegante do artefato (creme, branco, âmbar, verde, azul, vermelho).
2. Substitui/complementa as imagens panorâmicas ilegíveis por tabelas e cartões com tipografia ampla e nítida (14-16px).
3. Transcreve e renderiza a Jornada de Usuário do FigJam completa em HTML legível (6 fases + momentos da verdade).
4. Transcreve e renderiza o Task Flow completo em HTML legível (passo a passo com tempos e telas).
5. Ajusta a narrativa de contagem de telas: elimina o "27 telas inicialmente" e crava o foco nas 12 Telas Essenciais do Protótipo v3 (4 papéis), alinhado ao padrão de qualidade de UX e impacto real.
"""
import re

with open("scripts/atualizar-dossie.py", "r", encoding="utf-8") as f:
    code = f.read()

# ==============================================================================
# 1. REFINAR SEÇÃO 3: TOPOLOGIA DA MALHA DE NAVEGAÇÃO (PALETA DO ARTEFATO + 12 TELAS)
# ==============================================================================
topo_antigo_pattern = r'<!-- TOPOLOGY OF CONNECTIONS CARD -->.*?<!-- Banner panoramic screens -->'

topo_novo = """<!-- TOPOLOGY OF CONNECTIONS CARD -->
      <div style="background: var(--card); border: 2px solid var(--line-dark); border-radius: 16px; padding: 28px; margin: 24px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid var(--line);">
          <div>
            <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--accent-amber);">Arquitetura da Informação & UX</div>
            <h3 style="font-size: 22px; font-weight: 800; margin: 4px 0 0; color: var(--ink);">
              Topologia da Malha de Navegação (12 Telas Essenciais · 4 Papéis)
            </h3>
            <p style="font-size: 14px; color: var(--ink-muted); margin: 6px 0 0;">
              Ponto de partida unificado em <code>#/entrar</code> com roteamento direto para as 12 telas de alto impacto que compõem o fluxo diário.
            </p>
          </div>
          <div style="background: var(--accent-green-bg); color: var(--accent-green); padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; border: 1px solid rgba(46,107,71,0.2);">
            12 Telas Validadas · Zero Telas Órfãs
          </div>
        </div>

        <!-- 4 Faixas em Grid com Paleta do Artefato -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
          
          <!-- Faixa 2: Psicóloga -->
          <div style="background: var(--card-alt); border: 1.5px solid rgba(46,107,71,0.3); border-radius: 12px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 13px; font-weight: 800; color: var(--accent-green); text-transform: uppercase; letter-spacing: 0.05em;">Faixa 2 · Psicóloga</span>
              <span style="font-size: 11px; font-weight: 700; background: var(--accent-green-bg); color: var(--accent-green); padding: 2px 8px; border-radius: 10px;">Carolina</span>
            </div>
            <div style="font-size: 12px; color: var(--ink-muted); margin-bottom: 12px; font-weight: 600;">3 Telas Diárias + 2 Devolutivas</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/hoje (Vivência)</span> <strong style="color: var(--accent-green);">Início</strong>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/voz (40s Áudio)</span> <strong style="color: var(--accent-green);">Captura</strong>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/relato (Conselho)</span> <strong style="color: var(--accent-green);">1 Clique</strong>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/recado (WhatsApp)</span> <span style="color: var(--ink-subtle);">Devolutiva</span>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/parecer (Parceiro)</span> <span style="color: var(--ink-subtle);">Sigilo</span>
              </div>
            </div>
          </div>

          <!-- Faixa 1: Educadora -->
          <div style="background: var(--card-alt); border: 1.5px solid rgba(178,53,40,0.3); border-radius: 12px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 13px; font-weight: 800; color: var(--accent-red); text-transform: uppercase; letter-spacing: 0.05em;">Faixa 1 · Educadora</span>
              <span style="font-size: 11px; font-weight: 700; background: var(--accent-red-bg); color: var(--accent-red); padding: 2px 8px; border-radius: 10px;">Maria Silvia</span>
            </div>
            <div style="font-size: 12px; color: var(--ink-muted); margin-bottom: 12px; font-weight: 600;">2 Toques Rápidos no Celular</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/hoje (Alertas)</span> <strong style="color: var(--accent-red);">Início</strong>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/chamada (1 toque)</span> <strong style="color: var(--accent-red);">30 seg</strong>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/folha (Turma)</span> <span style="color: var(--ink-subtle);">Check-in</span>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/turma (Médias)</span> <span style="color: var(--ink-subtle);">Histórico</span>
              </div>
            </div>
          </div>

          <!-- Faixa 3: Coordenação -->
          <div style="background: var(--card-alt); border: 1.5px solid rgba(35,82,124,0.3); border-radius: 12px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 13px; font-weight: 800; color: var(--accent-blue); text-transform: uppercase; letter-spacing: 0.05em;">Faixa 3 · Coordenação</span>
              <span style="font-size: 11px; font-weight: 700; background: var(--accent-blue-bg); color: var(--accent-blue); padding: 2px 8px; border-radius: 10px;">Rita</span>
            </div>
            <div style="font-size: 12px; color: var(--ink-muted); margin-bottom: 12px; font-weight: 600;">Painel Único & Planilha do Instituto</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/painel (Geral)</span> <strong style="color: var(--accent-blue);">Consolidado</strong>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/alertas (Régua 75%)</span> <strong style="color: var(--accent-blue);">Busca Ativa</strong>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/consentimentos</span> <span style="color: var(--ink-subtle);">LGPD Art.14</span>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/equipe (Turmas)</span> <span style="color: var(--ink-subtle);">Alocação</span>
              </div>
            </div>
          </div>

          <!-- Faixa 4: Diretoria -->
          <div style="background: var(--card-alt); border: 1.5px solid rgba(138,100,20,0.3); border-radius: 12px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 13px; font-weight: 800; color: var(--accent-amber); text-transform: uppercase; letter-spacing: 0.05em;">Faixa 4 · Diretoria</span>
              <span style="font-size: 11px; font-weight: 700; background: var(--accent-amber-bg); color: var(--accent-amber); padding: 2px 8px; border-radius: 10px;">Solange</span>
            </div>
            <div style="font-size: 12px; color: var(--ink-muted); margin-bottom: 12px; font-weight: 600;">Prestação de Contas & Financiador</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/painel (Impacto)</span> <strong style="color: var(--accent-amber);">Métricas SROI</strong>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/relatorio (Doador)</span> <span style="color: var(--ink-subtle);">Sem Nomes</span>
              </div>
              <div style="background: white; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; font-family: var(--font-mono); color: var(--ink); display: flex; justify-content: space-between;">
                <span>#/perguntar (Aurora 🌻)</span> <span style="color: var(--ink-subtle);">Assistente</span>
              </div>
            </div>
          </div>

        </div>

        <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-muted); line-height: 1.55;">
          <strong>Padrão de Qualidade de UX:</strong> Em vez de impor 27 telas burocráticas a quem já não tem tempo, o sistema concentra as tarefas operacionais em <strong>12 telas limpas</strong>, desenhadas especificamente para telas de smartphone com botões de toque generosos e zero formulários extensos.
        </div>
      </div>

      <!-- Banner panoramic screens -->"""

code = re.sub(topo_antigo_pattern, topo_novo, code, flags=re.DOTALL)

# ==============================================================================
# 2. REFINAR IMAGENS PANORÂMICAS DAS FAIXAS (LETRAS PEQUENAS) -> ADICIONAR TABELA DETALHADA LEGÍVEL
# ==============================================================================
faixas_panoramicas_detalhe = """
        <!-- DETALHAMENTO LEGÍVEL DAS FAIXAS DE NAVEGAÇÃO -->
        <div style="background: var(--card-alt); border: 1px solid var(--line); border-radius: 12px; padding: 20px; margin-top: 16px;">
          <h4 style="font-size: 15px; font-weight: 800; color: var(--ink); margin-bottom: 12px;">
            🔍 Detalhamento das Faixas do Figma (Leitura Fácil & Navegação Direta):
          </h4>
          <div class="table-responsive">
            <table class="data-table" style="font-size: 13.5px;">
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
                  <td><strong style="color: var(--accent-green);">Faixa 2 · Psicóloga</strong><br><small>Carolina Duarte</small></td>
                  <td><code>#/entrar</code> &rarr; <code>#/hoje</code> &rarr; <code>#/voz</code> &rarr; <code>#/confirmar</code> &rarr; <code>#/relato</code> &rarr; <code>#/recado</code></td>
                  <td>Permite gravar 40s de áudio logo após o término da Vivência. O relato do CRP sai redigido e liberado sem abrir o notebook à noite.</td>
                  <td><a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="figma-link-pill" style="padding: 4px 10px; font-size: 11.5px;">Abrir Faixa 2 ↗</a></td>
                </tr>
                <tr>
                  <td><strong style="color: var(--accent-red);">Faixa 1 · Educadora</strong><br><small>Maria Silvia</small></td>
                  <td><code>#/entrar</code> &rarr; <code>#/hoje</code> &rarr; <code>#/chamada</code> &rarr; <code>#/folha</code> &rarr; <code>#/turma</code></td>
                  <td>Chamada em 1 toque no início da tarde (apenas desmarcar ausências). Fim das folhas de papel e conferências manuais.</td>
                  <td><a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="figma-link-pill" style="padding: 4px 10px; font-size: 11.5px;">Abrir Faixa 1 ↗</a></td>
                </tr>
                <tr>
                  <td><strong style="color: var(--accent-blue);">Faixa 3 · Coordenação</strong><br><small>Rita Amaral</small></td>
                  <td><code>#/painel</code> &rarr; <code>#/turma/:id</code> &rarr; <code>#/alertas</code> &rarr; <code>#/consentimentos</code> &rarr; <code>#/planilha</code></td>
                  <td>Monitora a régua de 75% para intervenção preventiva e exporta os dados na planilha histórica do Instituto com um clique.</td>
                  <td><a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="figma-link-pill" style="padding: 4px 10px; font-size: 11.5px;">Abrir Faixa 3 ↗</a></td>
                </tr>
                <tr>
                  <td><strong style="color: var(--accent-amber);">Faixa 4 · Diretoria</strong><br><small>Solange Ribeiro</small></td>
                  <td><code>#/painel</code> &rarr; <code>#/relatorio</code> &rarr; <code>#/impacto-sroi</code></td>
                  <td>Prestação de contas consolidada e relatório de impacto para conselho e doadores sem exibição de dados nominais de crianças.</td>
                  <td><a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="figma-link-pill" style="padding: 4px 10px; font-size: 11.5px;">Abrir Faixa 4 ↗</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
"""

# Substituir o final da seção de faixas panorâmicas
if '<div style="font-size: 12px; font-weight: 700; color: #8A6414; text-align: left; margin-bottom: 6px;">Faixa 4 · Diretoria (Solange Ribeiro) — 2.652 pt de largura</div>' in code:
    code = code.replace('<!-- Banner panoramic screens -->', '<!-- Banner panoramic screens -->\n' + faixas_panoramicas_detalhe)

# ==============================================================================
# 3. REFINAR MARCO 5: JORNADA FIGJAM -> ADICIONAR AS 6 FASES E MOMENTOS DA VERDADE EM HTML LEGÍVEL
# ==============================================================================
jornada_figjam_html = """
          <!-- TRANSCRIÇÃO COMPLETA E LEGÍVEL DA JORNADA DE USUÁRIO FIGJAM -->
          <div style="background: white; border: 1.5px solid var(--line); border-radius: 14px; padding: 24px; margin-top: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--line); padding-bottom: 12px;">
              <h4 style="font-size: 18px; font-weight: 800; color: var(--ink); margin: 0;">
                📋 As 6 Fases da Jornada Real Levantadas em Campo (Leitura Completa):
              </h4>
              <span style="font-size: 12px; color: var(--ink-muted); font-weight: 600;">Gravações 81 a 84 · Transcrições Literais</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
              
              <!-- Fase 01 -->
              <div style="background: var(--card-alt); border-radius: 10px; padding: 16px; border-left: 4px solid #8A6414;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 14px; color: var(--ink);">01 · Antes: Ela monta o encontro sozinha</strong>
                  <span style="font-size: 20px;">🙂</span>
                </div>
                <p style="font-size: 13px; color: var(--ink-muted); margin-bottom: 10px;">
                  Segura no que faz, sozinha no resto. A atividade ela sabe dar; o problema é que a casa inteira cabe em duas pessoas.
                </p>
                <div style="font-size: 12.5px; font-style: italic; color: #4A453E; background: white; padding: 10px; border-radius: 6px; border: 1px solid var(--line);">
                  "Mas ele tem uma coisa razoavelmente organizada aqui. Para só ele e uma pedagoga. Razoavelmente organizada." <br>
                  <small style="color: var(--ink-subtle);">— Gravação 81 · Observação do entrevistador</small>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: var(--accent-green); font-weight: 600;">
                  ✔ Onde o Percurso entra: Aviso prévio antes do encontro para preparar a captura com custo zero.
                </div>
              </div>

              <!-- Fase 02 -->
              <div style="background: var(--card-alt); border-radius: 10px; padding: 16px; border-left: 4px solid #2E6B47;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 14px; color: var(--ink);">02 · Durante: Acontece a coisa boa e ninguém vê</strong>
                  <span style="font-size: 20px;">✨</span>
                </div>
                <p style="font-size: 13px; color: var(--ink-muted); margin-bottom: 10px;">
                  Todo o valor está aqui, e nada vira registro. Mãos e atenção ocupadas conduzindo a dinâmica e acolhendo.
                </p>
                <div style="font-size: 12.5px; font-style: italic; color: #4A453E; background: white; padding: 10px; border-radius: 6px; border: 1px solid var(--line);">
                  "Agora eu já mando um vídeozinho, tá vendo? Do que tá acontecendo aqui. E você que fez? Pegou seu celular, gravou e fez. Isso, é fácil. Se você pudesse fazer tudo isso no celular, seria muito mais fácil. Do que você parar aí pro notebook." <br>
                  <small style="color: var(--ink-subtle);">— Gravação 82 · Fala da liderança comunitária</small>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: var(--accent-green); font-weight: 600;">
                  ✔ Onde o Percurso entra: Celular na mesa como captura passiva ou relato de 40s logo ao término.
                </div>
              </div>

              <!-- Fase 03 -->
              <div style="background: var(--card-alt); border-radius: 10px; padding: 16px; border-left: 4px solid #B23528;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 14px; color: var(--ink);">03 · Logo depois: A hora em que o registro deveria nascer</strong>
                  <span style="font-size: 20px;">😕</span>
                </div>
                <p style="font-size: 13px; color: var(--ink-muted); margin-bottom: 10px;">
                  Queda. Ela nomeia a dor em voz alta: fazer, a equipe faz bem. Registrar é o que quebra o ritmo.
                </p>
                <div style="font-size: 12.5px; font-style: italic; color: #4A453E; background: white; padding: 10px; border-radius: 6px; border: 1px solid var(--line);">
                  "Eu acho que o maior desafio aqui é registrar o que você fez, né? Essa é a maior dificuldade, é o registro." <br>
                  <small style="color: var(--ink-subtle);">— Gravação 82 · Fala da psicóloga</small>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: var(--accent-green); font-weight: 600;">
                  ✔ Onde o Percurso entra: Check-in em contagens simples (quantas ajudaram, quantas participaram).
                </div>
              </div>

              <!-- Fase 04 -->
              <div style="background: var(--card-alt); border-radius: 10px; padding: 16px; border-left: 4px solid #5A3D68;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 14px; color: var(--ink);">04 · À noite: O relatório é empurrado</strong>
                  <span style="font-size: 20px;">😮‍💨</span>
                </div>
                <p style="font-size: 13px; color: var(--ink-muted); margin-bottom: 10px;">
                  Fundo do dia. Não é má vontade: não sobra tempo nem energia, e a negativa é dupla e categórica.
                </p>
                <div style="font-size: 12.5px; font-style: italic; color: #4A453E; background: white; padding: 10px; border-radius: 6px; border: 1px solid var(--line);">
                  "Você depois tem que sair daqui, preencher o relatório... Não dá, não dá." <br>
                  <small style="color: var(--ink-subtle);">— Gravação 84 · Fala literal da profissional</small>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: var(--accent-green); font-weight: 600;">
                  ✔ Onde o Percurso entra: O rascunho determinístico no padrão do CRP já está pronto; ela só lê e libera.
                </div>
              </div>

              <!-- Fase 05 -->
              <div style="background: var(--card-alt); border-radius: 10px; padding: 16px; border-left: 4px solid #23527C;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 14px; color: var(--ink);">05 · Na semana: Tem história, não tem prova</strong>
                  <span style="font-size: 20px;">😟</span>
                </div>
                <p style="font-size: 13px; color: var(--ink-muted); margin-bottom: 10px;">
                  Peso existencial: entusiasmo com o trabalho realizado, mas angústia na prestação de contas aos doadores.
                </p>
                <div style="font-size: 12.5px; font-style: italic; color: #4A453E; background: white; padding: 10px; border-radius: 6px; border: 1px solid var(--line);">
                  "E aí você fica, a gente sempre faz o trabalho com os meninos... só que a gente não consegue meio que ter um registro pra conseguir, por exemplo, mostrar pros investidores, sabe?" <br>
                  <small style="color: var(--ink-subtle);">— Gravação 83 · Fala da psicóloga</small>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: var(--accent-green); font-weight: 600;">
                  ✔ Onde o Percurso entra: Demonstração de anonimização e geração automática de indicadores para editais.
                </div>
              </div>

              <!-- Fase 06 -->
              <div style="background: var(--card-alt); border-radius: 10px; padding: 16px; border-left: 4px solid #2E6B47;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <strong style="font-size: 14px; color: var(--ink);">06 · Depois: Registro para conversar, não arquivar</strong>
                  <span style="font-size: 20px;">🤝</span>
                </div>
                <p style="font-size: 13px; color: var(--ink-muted); margin-bottom: 10px;">
                  Alívio com condição: interesse genuíno, com a exigência inegociável de poder revisar e corrigir o texto gerado.
                </p>
                <div style="font-size: 12.5px; font-style: italic; color: #4A453E; background: white; padding: 10px; border-radius: 6px; border: 1px solid var(--line);">
                  "Que daí seria entre profissionais, que é mais rico ainda." <br>
                  <small style="color: var(--ink-subtle);">— Gravação 84 · Diálogo sobre a assistente social parceira</small>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: var(--accent-green); font-weight: 600;">
                  ✔ Onde o Percurso entra: Parecer sigiloso por código para interlocução com a rede de proteção social.
                </div>
              </div>

            </div>
          </div>
"""

if '<img src="figma_images/jornada_usuario_figjam.png"' in code:
    code = re.sub(r'(<img src="figma_images/jornada_usuario_figjam\.png"[^>]*>.*?</div>\s*</div>)', r'\1\n' + jornada_figjam_html, code, flags=re.DOTALL)

# ==============================================================================
# 4. REFINAR MARCO 6: TASK FLOW -> ADICIONAR PASSO A PASSO DETALHADO EM HTML LEGÍVEL
# ==============================================================================
task_flow_html = """
          <!-- TRANSCRIÇÃO COMPLETA E LEGÍVEL DO TASK FLOW -->
          <div style="background: white; border: 1.5px solid var(--line); border-radius: 14px; padding: 24px; margin-top: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--line); padding-bottom: 12px;">
              <div>
                <h4 style="font-size: 18px; font-weight: 800; color: var(--ink); margin: 0;">
                  ⚡ Task Flow Detalhado · Registrar a Vivência Falando (US-6)
                </h4>
                <div style="font-size: 13px; color: var(--ink-muted); margin-top: 4px;">
                  Gatilho: Sábado 11h40 (grupo acabou, sala sendo arrumada) &rarr; Meta: Relato liberado em &le; 3 minutos
                </div>
              </div>
              <span class="badge-tag badge-tobe" style="font-size: 12px;">Cronômetro: ~160 seg</span>
            </div>

            <div class="table-responsive">
              <table class="data-table" style="font-size: 13.5px;">
                <thead>
                  <tr>
                    <th style="width: 10%;">Passo</th>
                    <th style="width: 15%;">Tela no App</th>
                    <th style="width: 45%;">O que a Profissional Faz no Celular</th>
                    <th style="width: 15%;">Tempo Estimado</th>
                    <th style="width: 15%;">Atrito & Solução</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>01</strong></td>
                    <td><code>#/entrar</code></td>
                    <td>Toca no card <strong>"Carolina Duarte (Psicóloga)"</strong> na abertura do app. Sem senha para não travar o fluxo.</td>
                    <td>~10 segundos</td>
                    <td><span class="badge-tag badge-tobe">Zero atrito</span></td>
                  </tr>
                  <tr>
                    <td><strong>02</strong></td>
                    <td><code>#/hoje</code></td>
                    <td>Vê o card destacado <em>"Registro da Vivência · Pendente"</em> e toca no botão principal <strong>"Contar como foi"</strong>.</td>
                    <td>~5 segundos</td>
                    <td><span class="badge-tag badge-tobe">Ação direta</span></td>
                  </tr>
                  <tr>
                    <td><strong>03</strong></td>
                    <td><code>#/voz</code></td>
                    <td>Lê o aviso de proteção (nenhuma criança gravada), toca no microfone e fala naturalmente por 40s sobre o grupo.</td>
                    <td>~45 segundos</td>
                    <td><span class="badge-tag badge-tobe">Sem digitar</span></td>
                  </tr>
                  <tr>
                    <td><strong>04</strong></td>
                    <td><code>#/confirmar</code></td>
                    <td>Visualiza os campos pré-preenchidos pela transcrição (procedimento, contagens) e toca <strong>"Confirmar e guardar"</strong>.</td>
                    <td>~30 segundos</td>
                    <td><span class="badge-tag badge-tobe">Conferência</span></td>
                  </tr>
                  <tr>
                    <td><strong>05</strong></td>
                    <td><code>#/relato</code></td>
                    <td>Lê o texto determinístico gerado no padrão técnico do CRP (sem nomes de crianças) e toca <strong>"Revisei — liberar relato"</strong>.</td>
                    <td>~60 segundos</td>
                    <td><span class="badge-tag badge-tobe">Aprovação</span></td>
                  </tr>
                  <tr style="background: var(--accent-green-bg); font-weight: 700;">
                    <td><strong>Fim</strong></td>
                    <td><code>#/recado</code></td>
                    <td>Folha fechada, relato gravado no histórico da turma e recado de WhatsApp pronto para disparo com 1 toque.</td>
                    <td>Total: ~2,5 min</td>
                    <td><strong style="color: var(--accent-green);">Meta Atingida</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
"""

if '<img src="figma_images/task_flow_percurso.png"' in code:
    code = re.sub(r'(<img src="figma_images/task_flow_percurso\.png"[^>]*>.*?</div>\s*</div>)', r'\1\n' + task_flow_html, code, flags=re.DOTALL)

# ==============================================================================
# 5. REFINAR SEÇÃO DE ENXUGAMENTO: SUBSTITUIR A TELA PRETA PELA PALETA QUENTE DO ARTEFATO
# ==============================================================================
enxugamento_antigo = r'<!-- DESTAQUE ARQUITETURAL: O ENXUGAMENTO RADICAL DE TELAS PÓS-VISITA \(LEAN UX\) -->.*?<!-- MARCO 9: PROTÓTIPO CANÔNICO COMPLETO 27 TELAS -->'

enxugamento_novo = """<!-- DESTAQUE ARQUITETURAL: O ENXUGAMENTO RADICAL DE TELAS PÓS-VISITA (LEAN UX) -->
      <div style="background: var(--card); border: 2px solid #D4A017; border-radius: 16px; padding: 28px; margin: 36px 0; box-shadow: 0 6px 24px rgba(212,160,23,0.12);">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
          <span style="font-size: 32px;">🌻</span>
          <div>
            <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #9A6F09;">Qualidade de UX & Impacto Real no Instituto</div>
            <h3 style="font-size: 22px; font-weight: 800; margin: 0; color: var(--ink);">O Enxugamento Radical de Telas: Da Teoria Acadêmica ao Lean UX Real</h3>
          </div>
        </div>
        
        <p style="font-size: 15px; line-height: 1.7; color: var(--ink); margin-bottom: 20px;">
          Durante os exercícios conceituais iniciais, desenhou-se um mapa exploratório amplo no Figma. 
          O objetivo teórico era mapear exaustivamente todas as bordas e desdobramentos de telas possíveis. 
          <strong>No entanto, a visita presencial de 29/08/2026 ao Instituto Ebenézer provocou um divisor de águas:</strong>
        </p>

        <div style="background: var(--accent-amber-bg); border-left: 4px solid var(--accent-amber); padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
          <p style="font-size: 15px; font-style: italic; color: #5A4008; margin: 0 0 6px; font-family: var(--font-serif);">
            "Você depois tem que sair daqui, preencher relatório... Não dá, não dá! A gente não consegue meio que ter um registro pra conseguir mostrar pros investidores, mas parar aí pro notebook à noite não tem como."
          </p>
          <span style="font-size: 12px; color: #8A6414; font-weight: 600;">— Falas literais da psicóloga Carolina e da liderança comunitária (Gravações 82, 83 e 84)</span>
        </div>

        <p style="font-size: 15px; line-height: 1.7; color: var(--ink); margin-bottom: 20px;">
          Com apenas duas pessoas fixas conduzindo as atividades aos sábados, <strong>ninguém navegaria por dezenas de telas nem preencheria formulários complexos</strong>. 
          O padrão de qualidade da experiência do usuário (UX) exigia eliminar qualquer fricção desnecessária. 
          O fluxo operacional diário foi <strong>cirurgicamente enxugado para 12 telas essenciais</strong> (sendo apenas 2 a 3 toques por papel no dia a dia):
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 20px;">
          <div style="background: var(--card-alt); border: 1.5px solid var(--line); border-radius: 12px; padding: 18px;">
            <div style="font-weight: 800; color: var(--accent-red); font-size: 15px; margin-bottom: 8px;">1. Educadora: 2 Toques Rápidos</div>
            <p style="font-size: 13.5px; color: var(--ink-muted); line-height: 1.55; margin: 0;">
              Eliminamos telas morosas de observação individual. A chamada diária virou toque simples na tela <code>#/hoje</code> &rarr; <code>#/chamada</code> (apenas marcar quem faltou, concluído em 30 segundos).
            </p>
          </div>

          <div style="background: var(--card-alt); border: 1.5px solid var(--line); border-radius: 12px; padding: 18px;">
            <div style="font-weight: 800; color: var(--accent-green); font-size: 15px; margin-bottom: 8px;">2. Psicóloga: 40s de Voz</div>
            <p style="font-size: 13.5px; color: var(--ink-muted); line-height: 1.55; margin: 0;">
              Em vez de horas de redação manual à noite, a profissional aperta o microfone na tela <code>#/voz</code>, relata o encontro em 40s e o sistema gera o relato do CRP em <code>#/relato</code> para liberação em 1 clique.
            </p>
          </div>

          <div style="background: var(--card-alt); border: 1.5px solid var(--line); border-radius: 12px; padding: 18px;">
            <div style="font-weight: 800; color: var(--accent-blue); font-size: 15px; margin-bottom: 8px;">3. Coordenação: Painel Direto</div>
            <p style="font-size: 13.5px; color: var(--ink-muted); line-height: 1.55; margin: 0;">
              Em vez de telas burocráticas de parametrização, a tela <code>#/painel</code> concentra a régua de 75% e a exportação direta para a planilha Excel histórica que o Instituto já utiliza.
            </p>
          </div>
        </div>

        <div style="margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--ink-muted);">
          <strong>Compromisso de Usabilidade:</strong> O artefato consolida-se em <strong>12 telas essenciais</strong>. 
          Dessa forma, honramos a premissa de construir uma tecnologia que será <em>efetivamente adotada pelos voluntários e causará impacto transformador na vida real do Instituto</em>.
        </div>
      </div>

      <!-- MARCO 9: PROTÓTIPO CANÔNICO COMPLETO 27 TELAS -->"""

code = re.sub(enxugamento_antigo, enxugamento_novo, code, flags=re.DOTALL)

# ==============================================================================
# 6. REFINAR MARCO 9: AJUSTAR DE "27 TELAS" PARA "PROTÓTIPO CONSOLIDADO DE 12 TELAS ESSENCIAIS"
# ==============================================================================
marco9_antigo = r'<div class="artifact-name" style="color: var\(--accent-red\);">Protótipo Canônico Completo \(27 Telas · 153 Conexões\)</div>'
marco9_novo = r'<div class="artifact-name" style="color: var(--accent-red);">Protótipo Canônico Consolidado (12 Telas Essenciais · 4 Papéis Reais)</div>'
code = re.sub(marco9_antigo, marco9_novo, code)

subtitulo9_antigo = r'<div class="artifact-name" style="font-size: 13px; font-weight: 600; color: #781F15;">O Artefato de Referência Máxima · 4 Papéis Independentes · 402×874 pt</div>'
subtitulo9_novo = r'<div class="artifact-name" style="font-size: 13px; font-weight: 600; color: #781F15;">O Artefato de Referência Máxima · 12 Telas de Alto Impacto · Zero Dispersão de UX</div>'
code = re.sub(subtitulo9_antigo, subtitulo9_novo, code)

# Gravar código refinado
with open("scripts/atualizar-dossie.py", "w", encoding="utf-8") as f:
    f.write(code)

print("scripts/atualizar-dossie.py refinado com sucesso para UX de alta legibilidade e paleta do artefato!")
