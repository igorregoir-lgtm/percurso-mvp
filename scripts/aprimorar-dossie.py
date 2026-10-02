# -*- coding: utf-8 -*-
"""
Script que aprimora scripts/atualizar-dossie.py:
1. Adiciona onerror a todas as tags <img> para fallback garantido para o GitHub Raw CDN.
2. Insere a seção e narrativa detalhada do Enxugamento Radical de Telas pós-visita ao Instituto Ebenézer (Lean UX).
3. Insere a seção de Decisões Tecnológicas Estruturais e Pontos em Aberto (SLM Local vs Nuvem, Hospedagem Vercel/Render vs Local, Banco, etc.) ao final do artefato tecnológico.
"""
import re

with open("scripts/atualizar-dossie.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Substituir todas as tags <img> que referenciam figma_images/
def replace_img(match):
    src = match.group(1)
    alt = match.group(2)
    filename = src.split("/")[-1]
    cdn_url = f"https://raw.githubusercontent.com/igorregoir-lgtm/percurso-mvp/main/public/figma_images/{filename}"
    return f'<img src="{src}" onerror="this.onerror=null; this.src=\'{cdn_url}\';" alt="{alt}" loading="lazy">'

content = re.sub(r'<img src="(figma_images/[^"]+)" alt="([^"]*)">', replace_img, content)

# 2. Atualizar a narrativa da Jornada para destacar explicitamente o ENXUGAMENTO RADICAL DE TELAS pós-visita
secao_enxugamento = """
      <!-- DESTAQUE ARQUITETURAL: O ENXUGAMENTO RADICAL DE TELAS PÓS-VISITA (LEAN UX) -->
      <div style="background: linear-gradient(135deg, #1A1A1A 0%, #2A2318 100%); color: #FBF8F3; border-radius: 16px; padding: 32px; margin: 36px 0; border: 2px solid #D4A017; box-shadow: 0 12px 36px rgba(0,0,0,0.15);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <span style="font-size: 28px;">⚡</span>
          <div>
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #E8C15A;">Lição Central da Visita de Campo (29/08/2026)</div>
            <h3 style="font-size: 22px; font-weight: 800; margin: 0; color: white;">O Enxugamento Radical de Telas: Da Teoria Acadêmica ao Lean UX Real</h3>
          </div>
        </div>
        
        <p style="font-size: 15px; line-height: 1.7; color: #E8E2D5; margin-bottom: 20px;">
          Durante a fase inicial de exploração no Figma, desenhamos um mapa canônico exaustivo com <strong>27 telas e 153 conexões</strong>. 
          O objetivo teórico era cobrir todas as bordas administrativas, múltiplos fluxos de coordenação e formulários individuais de avaliação socioemocional 
          para cada criança (estimando cerca de 54 minutos por ciclo). 
          <strong>Entretanto, a visita de campo de 29/08/2026 ao Instituto Ebenézer provocou um choque de realidade incontornável:</strong>
        </p>

        <div style="background: rgba(255,255,255,0.06); border-left: 4px solid #E8C15A; padding: 16px 20px; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
          <p style="font-size: 15px; font-style: italic; color: #FFF; margin: 0 0 6px;">
            "Você depois tem que sair daqui, preencher relatório... Não dá, não dá! A gente não consegue meio que ter um registro pra conseguir mostrar pros investidores, mas parar aí pro notebook à noite não tem como."
          </p>
          <span style="font-size: 12.5px; color: #D4CABE;">— Falas literais da psicóloga e da liderança comunitária (Gravações 82, 83 e 84)</span>
        </div>

        <p style="font-size: 15px; line-height: 1.7; color: #E8E2D5; margin-bottom: 20px;">
          Com apenas duas pessoas fixas e voluntários aos sábados, <strong>ninguém abriria 27 telas nem preencheria 20 formulários individuais</strong>. 
          A arquitetura precisava ser cirurgicamente compactada. O número de telas operacionais necessárias para o ciclo diário foi <strong>drasticamente reduzido</strong>:
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 20px;">
          <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 18px;">
            <div style="font-weight: 700; color: #E8C15A; font-size: 15px; margin-bottom: 8px;">1. Educadora: De 9 Telas &rarr; 2 Toques no Celular</div>
            <p style="font-size: 13.5px; color: #D4CABE; line-height: 1.55; margin: 0;">
              Eliminamos formulários por criança. A chamada diária virou toque simples na tela <code>#/hoje</code> &rarr; <code>#/chamada</code> (apenas marcar quem faltou, concluído em 30 segundos).
            </p>
          </div>

          <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 18px;">
            <div style="font-weight: 700; color: #7BDCB5; font-size: 15px; margin-bottom: 8px;">2. Psicóloga: De Horas à Noite &rarr; 40s de Áudio</div>
            <p style="font-size: 13.5px; color: #D4CABE; line-height: 1.55; margin: 0;">
              Em vez de relatórios manuais morosos, a profissional aperta o microfone na tela <code>#/voz</code>, relata o encontro em 40s e o sistema gera o relato do CRP em <code>#/relato</code> com 1 clique para liberação.
            </p>
          </div>

          <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 18px;">
            <div style="font-weight: 700; color: #82C9FF; font-size: 15px; margin-bottom: 8px;">3. Coordenação: Painel Único & Planilha do Instituto</div>
            <p style="font-size: 13.5px; color: #D4CABE; line-height: 1.55; margin: 0;">
              Em vez de módulos burocráticos de configuração, a tela <code>#/painel</code> concentra a régua de 75% e a exportação direta para a planilha Excel histórica que a instituição já domina.
            </p>
          </div>
        </div>

        <div style="margin-top: 22px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.12); font-size: 13px; color: #D4CABE;">
          <strong>Conclusão Epistemológica:</strong> As 27 telas do Figma permanecem como o <em>mapa holístico de governança, permissões e design system institucional</em>. 
          Mas a entrega funcional do MVP implementa o <strong>fluxo essencial condensado em 3 a 4 telas mobile</strong>, provando que o melhor software social é aquele que <em>respeita a escassez de tempo de quem está na ponta</em>.
        </div>
      </div>
"""

# Inserir secao_enxugamento antes do MARCO 9 se ainda não estiver inserida
if "O Enxugamento Radical de Telas: Da Teoria Acadêmica ao Lean UX Real" not in content:
    if "<!-- MARCO 9: PROTÓTIPO CANÔNICO COMPLETO 27 TELAS -->" in content:
        content = content.replace("<!-- MARCO 9: PROTÓTIPO CANÔNICO COMPLETO 27 TELAS -->", secao_enxugamento + "\n      <!-- MARCO 9: PROTÓTIPO CANÔNICO COMPLETO 27 TELAS -->")

# 3. Adicionar a seção de Decisões Tecnológicas Estruturais e Pontos em Aberto
secao_decisoes_tecnologicas = """
    <!-- SECTION: PONTOS EM ABERTO E DECISÕES TECNOLÓGICAS ESTRUTURAIS -->
    <section class="section-block" id="decisoes-tecnologicas" style="border-left: 6px solid #23527C;">
      <div class="section-header">
        <div class="section-eyebrow" style="color: #23527C;">Próximos Passos & Arquitetura de Produção</div>
        <h2 class="section-title">Principais Pontos em Aberto e Decisões Tecnológicas Estruturais</h2>
        <p class="section-desc">
          Trade-offs arquiteturais entre modelos locais (SLM) vs nuvem gerenciada, infraestrutura física vs PaaS externo, 
          escalabilidade de banco de dados e sustentabilidade sem equipe de TI no Instituto Ebenézer.
        </p>
      </div>

      <div class="prose">
        <p>
          O MVP funcional entregue na Semana 5 comprova a viabilidade do produto com 167 testes unitários e 381 testes de fumaça. 
          Contudo, a evolução para implantação sustentável e contínua no Instituto Social Ebenézer exige o endereçamento formal 
          de cinco decisões tecnológicas de longo prazo:
        </p>
      </div>

      <!-- DECISÃO 1: SLM LOCAL VS CLOUD LLM -->
      <div style="background: white; border: 1px solid var(--line); border-radius: 14px; padding: 24px; margin: 24px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
          <h3 style="font-size: 18px; font-weight: 800; color: var(--ink); margin: 0;">
            1. Modelo de IA: SLM Local (Small Language Model On-Premise) vs. Cloud LLM Gerenciado
          </h3>
          <span class="badge-tag badge-tobe" style="background: #E6EEF5; color: #23527C; border-color: #A3C1DA;">Decisão Aberta · Arquitetura Híbrida</span>
        </div>

        <p style="font-size: 14.5px; line-height: 1.65; color: var(--ink);">
          A síntese textual dos relatos do conselho e a anonimização de termos livres exigem inferência de linguagem natural. Duas alternativas foram avaliadas:
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 16px 0;">
          <div style="background: var(--card-alt); border-radius: 10px; padding: 16px; border: 1px solid var(--line);">
            <div style="font-weight: 700; color: #2E6B47; margin-bottom: 8px;">Opção A: SLM Local (Ollama / Llama-3.2-3B / Phi-3.5)</div>
            <ul style="font-size: 13.5px; color: var(--ink); padding-left: 18px; line-height: 1.6; margin: 0;">
              <li><strong>Vantagens:</strong> Soberania absoluta dos dados (o texto não sai da máquina local); custo zero de tokens de API; conformidade direta com LGPD para dados ultrassensíveis; opera 100% offline se a internet da favela cair.</li>
              <li><strong>Desvantagens:</strong> Exige hardware potente no local (Mac Mini com Apple Silicon ou PC com GPU &ge; 8GB VRAM); custo de aquisição inicial elevado para a ONG; risco de obsolescência e manutenção física; inferência lenta em máquinas legadas doadas.</li>
            </ul>
          </div>

          <div style="background: var(--card-alt); border-radius: 10px; padding: 16px; border: 1px solid var(--line);">
            <div style="font-weight: 700; color: #23527C; margin-bottom: 8px;">Opção B: Cloud LLM Gerenciado (Claude 3.5 Haiku / GPT-4o-mini)</div>
            <ul style="font-size: 13.5px; color: var(--ink); padding-left: 18px; line-height: 1.6; margin: 0;">
              <li><strong>Vantagens:</strong> Zero investimento em hardware; velocidade de resposta em &lt; 1 segundo; qualidade de redação e síntese substancialmente superior; manutenção e atualização de modelos 100% automáticas pela nuvem.</li>
              <li><strong>Desvantagens:</strong> Dependência de conexão de internet; custo por token (embora residual, ~R$ 5 a 10/mês para o volume do Instituto); exige camada rigorosa de desidentificação/pseudonimização prévia no cliente antes do tráfego.</li>
            </ul>
          </div>
        </div>

        <div style="background: var(--accent-green-bg); border-left: 4px solid var(--accent-green); padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 13.5px; color: var(--accent-green);">
          <strong>Recomendação Técnica:</strong> O MVP implementou um <em>adaptador desacoplado (IA_ADAPTER)</em>. O núcleo de cálculo e relatórios opera de forma 100% determinística via código puro (Node.js/JavaScript), garantindo funcionamento sem qualquer IA. Quando a IA é ligada para aprimoramento de texto, a barreira de pseudonimização no cliente substitui nomes por códigos C001, C002 antes de qualquer requisição, permitindo o uso de APIs leves em nuvem com conformidade legal total.
        </div>
      </div>

      <!-- DECISÃO 2: HOSPEDAGEM LOCAL VS NUVEM GERENCIADA (VERCEL / RENDER) -->
      <div style="background: white; border: 1px solid var(--line); border-radius: 14px; padding: 24px; margin: 24px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
          <h3 style="font-size: 18px; font-weight: 800; color: var(--ink); margin: 0;">
            2. Hospedagem da Solução: Servidor Físico no Instituto vs. Plataforma em Nuvem (Vercel / Render)
          </h3>
          <span class="badge-tag badge-tobe" style="background: #E7F0EB; color: #2E6B47; border-color: #B5D5C2;">Recomendação Fechada · PaaS Nuvem</span>
        </div>

        <p style="font-size: 14.5px; line-height: 1.65; color: var(--ink);">
          Um dos maiores riscos para a sustentabilidade de projetos de TI no terceiro setor é a <em>dependência de infraestrutura física local</em>. 
          A visita de campo revelou que o Instituto Ebenézer opera em uma garagem adaptada no Jardim Ângela, <strong>sem técnico de TI residente, sem sala climatizada e com rede elétrica sujeita a oscilações e quedas frequentes</strong>.
        </p>

        <div class="table-responsive" style="margin: 16px 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Dimensão de Análise</th>
                <th>Servidor Local Físico (Na sede do Instituto)</th>
                <th>Hospedagem em Nuvem PaaS (Vercel / Render / Supabase)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Manutenção Operacional</strong></td>
                <td><span class="badge-tag badge-asis">Altíssimo Risco</span><br>Qualquer pane no disco, poeira, vírus ou desligamento acidental trava a ONG até que um voluntário se desloque presencialmente.</td>
                <td><span class="badge-tag badge-tobe">Manutenção Zero para a ONG</span><br>Servidores gerenciados 24/7 com reinício automático, monitoramento de saúde e suporte remoto transparente.</td>
              </tr>
              <tr>
                <td><strong>Atualizações & Bugfixes</strong></td>
                <td>Exige visita técnica presencial ou acesso remoto instável por AnyDesk/TeamViewer.</td>
                <td>Deploy Contínuo (CI/CD via GitHub): qualquer correção de código sobe automaticamente em menos de 2 minutos.</td>
              </tr>
              <tr>
                <td><strong>Disponibilidade & Uptime</strong></td>
                <td>Vulnerável a quedas de energia no bairro e corte de conexão da operadora local.</td>
                <td>99,99% de disponibilidade global com certificados HTTPS/SSL automatizados e CDN de borda.</td>
              </tr>
              <tr>
                <td><strong>Backups de Segurança</strong></td>
                <td>Geralmente negligenciados ou feitos em pendrives sujeitos a perda física ou corrupção.</td>
                <td>Snapshots diários automatizados com redundância geográfica e retenção criptografada.</td>
              </tr>
              <tr>
                <td><strong>Conformidade LGPD</strong></td>
                <td>Falsa sensação de segurança: servidores físicos em mesas compartilhadas têm vulnerabilidade a acesso não autorizado.</td>
                <td>Totalmente segura quando combinada com o <em>Privacy by Design</em> do Percurso (dados criptografados em repouso e sem PII nominal).</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="background: var(--accent-blue-bg); border-left: 4px solid var(--accent-blue); padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 13.5px; color: var(--accent-blue);">
          <strong>Decisão Estrutural Recomendada:</strong> Hospedar a aplicação em <strong>plataforma de nuvem gerenciada (Vercel ou Render)</strong>. 
          Essa escolha elimina 100% da carga de manutenção técnica para a liderança da ONG (Maria Silvia e Wellington), 
          permite que as educadoras acessem o sistema de seus próprios celulares via Web/PWA em qualquer lugar (inclusive em visitas domiciliares de busca ativa) 
          e viabiliza suporte remoto contínuo pela equipe de engenharia do Inteli e futuros mantenedores.
        </div>
      </div>

      <!-- DECISÃO 3: PERSISTÊNCIA E ESCALABILIDADE DO BANCO DE DADOS -->
      <div style="background: white; border: 1px solid var(--line); border-radius: 14px; padding: 24px; margin: 24px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
          <h3 style="font-size: 18px; font-weight: 800; color: var(--ink); margin: 0;">
            3. Persistência de Dados: SQLite Embutido vs. PostgreSQL Gerenciado (Supabase / Render Postgres)
          </h3>
          <span class="badge-tag badge-tobe" style="background: #F8F1DE; color: #8A6414; border-color: #E2CD9C;">Evolução Pós-Semana 5</span>
        </div>

        <p style="font-size: 14.5px; line-height: 1.65; color: var(--ink);">
          O MVP atual opera sobre SQLite nativo em arquivo único (<code>percurso.db</code>), o que garantiu portabilidade extrema e zero dependências para a Semana 5. 
          Contudo, aos sábados pela manhã, quando duas ou mais profissionais (psicóloga da Vivência e educadora de reforço) realizam o fechamento de presença e check-in concorrentes, 
          o SQLite pode apresentar limitações de concorrência de escrita (bloqueio <code>SQLITE_BUSY</code>).
        </p>

        <p style="font-size: 14px; line-height: 1.6; color: var(--ink-muted);">
          <strong>Plano de Evolução:</strong> Manter o SQLite para ambientes locais de teste/desenvolvimento e configurar migração suave para 
          <strong>PostgreSQL Serverless (Supabase ou Neon)</strong> no ambiente de produção hospedado, aproveitando o plano gratuito perene voltado a projetos sociais. 
          A camada de acesso a dados em <code>src/db.js</code> foi projetada com queries SQL ANSI puras, minimizando o atrito de transição.
        </p>
      </div>

      <!-- DECISÃO 4: TRANSCRIÇÃO DE ÁUDIO ASSÍNCRONA E WHISPER -->
      <div style="background: white; border: 1px solid var(--line); border-radius: 14px; padding: 24px; margin: 24px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
          <h3 style="font-size: 18px; font-weight: 800; color: var(--ink); margin: 0;">
            4. Transcrição de Voz: Web Speech API vs. Whisper Local / API com Filtro de PII
          </h3>
          <span class="badge-tag badge-tobe" style="background: #F0EAF2; color: #5A3D68; border-color: #D3C2D8;">Evolução Funcional</span>
        </div>

        <p style="font-size: 14.5px; line-height: 1.65; color: var(--ink);">
          A captura por voz no MVP utiliza a <code>SpeechRecognition</code> nativa do navegador (Web Speech API). 
          Embora seja rápida e sem custo, ela requer que a psicóloga fale com o navegador aberto em tempo real. 
          Na visita de campo, a psicóloga expressou o desejo de poder gravar o encontro ou enviar um áudio que ela já registrou no WhatsApp enquanto estava na sala.
        </p>

        <p style="font-size: 14px; line-height: 1.6; color: var(--ink-muted);">
          <strong>Plano de Evolução:</strong> Implementar a rota assíncrona de ingestão de arquivo de áudio (<code>POST /api/voz/arquivo</code>), 
          utilizando o modelo <em>Whisper-tiny</em> ou <em>Whisper API</em> protegido por um desidentificador léxico que suprime nomes próprios antes de qualquer processamento duradouro.
        </p>
      </div>

      <!-- DECISÃO 5: AUTENTICAÇÃO E RBAC PARA PRODUÇÃO REAL -->
      <div style="background: white; border: 1px solid var(--line); border-radius: 14px; padding: 24px; margin: 24px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
          <h3 style="font-size: 18px; font-weight: 800; color: var(--ink); margin: 0;">
            5. Gestão de Identidade & Acesso: Transição do Seletor Rápido para RBAC Seguro
          </h3>
          <span class="badge-tag badge-tobe" style="background: #F7EAE7; color: #B23528; border-color: #F1CAC4;">Segurança & Governança</span>
        </div>

        <p style="font-size: 14.5px; line-height: 1.65; color: var(--ink);">
          Para efeitos de demonstração acadêmica e testes da banca avaliadora na Semana 5, o sistema implementou a tela <code>#/entrar</code> 
          com seleção rápida em um clique entre as 4 personas (Carolina, Maria Silvia, Rita e Solange). 
          Para a transição em produção real com dados autênticos da instituição, essa tela será substituída por 
          <strong>Autenticação sem Senha (Magic Link por E-mail ou Passkeys/Biometria do Smartphone)</strong> e controle de acesso estrito baseado em papéis (RBAC), 
          garantindo que cada profissional acesse estritamente suas turmas autorizadas.
        </p>
      </div>
    </section>
"""

# Inserir secao_decisoes_tecnologicas antes do footer se ainda não estiver
if "Principais Pontos em Aberto e Decisões Tecnológicas Estruturais" not in content:
    if "<!-- Footer -->" in content:
        content = content.replace("<!-- Footer -->", secao_decisoes_tecnologicas + "\n    <!-- Footer -->")

# Adicionar link na navegação do topo (nav) se não houver
if 'href="#decisoes-tecnologicas"' not in content:
    content = content.replace('<a href="#mvp-funcional" class="nav-link">MVP Funcional</a>', '<a href="#mvp-funcional" class="nav-link">MVP Funcional</a>\n      <a href="#decisoes-tecnologicas" class="nav-link" style="color: #23527C; font-weight: 700;">Decisões Técnicas</a>')

with open("scripts/atualizar-dossie.py", "w", encoding="utf-8") as f:
    f.write(content)

print("scripts/atualizar-dossie.py aprimorado com sucesso!")
