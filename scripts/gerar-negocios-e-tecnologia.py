# -*- coding: utf-8 -*-
"""
Gera os arquivos separados de Negócios e Tecnologia com a inclusão completa da
Diretoria (Solange Ribeiro), do modelo SROI determinístico e da demonstração
de impacto por redução da violência urbana e evasão escolar (Insper/IPEA/FGV).
Salva nas pastas públicas locais e nas pastas de entrega do OneDrive.
"""
import os
import zipfile

base_dir_onedrive_1 = "/Users/igorrego/Library/CloudStorage/OneDrive-Pessoal/02_Allla/Inteli - Artefato Modulo III/1 - Arquitetura"
base_dir_onedrive_2 = "/Users/igorrego/Library/CloudStorage/OneDrive-Pessoal/02_Allla/Inteli - Artefato Modulo III/1 - Arquitetura/[Inteli MBA T2] Modulo 3 - Semana 5 - Trilha B - Grupo 06"
base_dir_public = "/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional/public"

destinos = [base_dir_onedrive_1, base_dir_onedrive_2, base_dir_public]

def salvar(nome, conteudo):
    for base in destinos:
        if os.path.exists(base):
            path = os.path.join(base, nome)
            with open(path, "w", encoding="utf-8") as f:
                f.write(conteudo)
            print(f"Salvo com sucesso: {path}")
        else:
            print(f"Diretório não encontrado, ignorado: {base}")

# ==============================================================================
# 1. ARTEFATO DE NEGÓCIOS (HTML)
# ==============================================================================
negocios_html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Percurso · Artefato de Negócios (Semana 5 - Trilha B)</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Newsreader:ital,wght@0,600;0,700;1,400&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #FBF8F3;
      --card-bg: #FFFFFF;
      --ink: #1F1D1A;
      --ink-muted: #5C5549;
      --line: #E8E2D5;
      --line-subtle: #F0EBE0;
      --accent-red: #B23528;
      --accent-green: #2E6B47;
      --accent-blue: #23527C;
      --accent-amber: #9A6B15;
      --accent-amber-bg: #FEF8EC;
      --accent-blue-bg: #F2F7FC;
      --accent-green-bg: #F0F7F2;
    }
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background: var(--bg); color: var(--ink); padding: 40px 24px; line-height: 1.6; }
    .container { max-width: 1040px; margin: 0 auto; background: var(--card-bg); border: 1px solid var(--line); border-radius: 16px; padding: 48px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
    h1 { font-family: 'Newsreader', Georgia, serif; font-size: 36px; color: var(--accent-red); margin: 8px 0 12px; letter-spacing: -0.02em; }
    .badge { display: inline-block; background: var(--accent-red); color: white; padding: 4px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 12px; }
    .badge-amber { background: var(--accent-amber); }
    h2 { font-size: 22px; font-weight: 700; margin: 36px 0 16px; border-bottom: 2px solid var(--line-subtle); padding-bottom: 10px; color: var(--ink); display: flex; align-items: center; gap: 10px; }
    h3 { font-size: 17px; font-weight: 700; color: var(--accent-blue); margin: 24px 0 10px; }
    .card { background: #FAF7F2; border: 1px solid var(--line); border-radius: 12px; padding: 24px; margin: 18px 0; }
    .card-highlight { background: var(--accent-amber-bg); border: 1.5px solid var(--accent-amber); border-radius: 12px; padding: 24px; margin: 18px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th { background: #F4EFE6; text-align: left; padding: 12px 14px; border-bottom: 2px solid #D4CABE; font-weight: 700; color: var(--ink); }
    td { padding: 12px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .btn { display: inline-block; background: var(--accent-blue); color: white; padding: 10px 22px; border-radius: 99px; text-decoration: none; font-weight: 700; font-size: 13.5px; transition: all 0.2s ease; }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .tag-red { background: #FDF2F0; color: var(--accent-red); border: 1px solid #FACDC8; }
    .tag-green { background: var(--accent-green-bg); color: var(--accent-green); border: 1px solid #C8E6D3; }
    .tag-blue { background: var(--accent-blue-bg); color: var(--accent-blue); border: 1px solid #C7DCF0; }
    .tag-amber { background: var(--accent-amber-bg); color: var(--accent-amber); border: 1px solid #F5DEB3; }
    .formula-box { font-family: 'JetBrains Mono', monospace; font-size: 13px; background: #22201D; color: #F7F5F0; padding: 16px 20px; border-radius: 8px; line-height: 1.7; margin: 14px 0; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Inteli MBA IA & Dados · Módulo 3 · Semana 5</span>
    <span class="badge badge-amber">Trilha B · Grupo 06</span>
    <h1>Artefato de Negócios · Sistema Percurso</h1>
    <p style="font-size: 15px; color: var(--ink-muted); margin-bottom: 24px;">
      <strong>Organização Parceira:</strong> Instituto Social Ebenézer | <strong>Território:</strong> Jardim Keralux / Jardim Ângela (São Paulo - SP)<br>
      <strong>Tema:</strong> Monitoramento Longitudinal de Impacto Socioemocional, Prevenção da Violência e Governança Ética
    </p>
    
    <div style="margin: 20px 0; display: flex; gap: 12px; flex-wrap: wrap;">
      <a href="Dossie_Jornada_Semana5_TrilhaB.html" class="btn" style="background: var(--accent-red);">📖 Ver Dossiê Visual Completo com Prints ↗</a>
      <a href="Artefato_Tecnologia_UX_UI_Semana5_TrilhaB.html" class="btn" style="background: var(--accent-blue);">⚙️ Ver Artefato de Tecnologia & UX ↗</a>
      <a href="https://percurso-ebenezer.vercel.app" target="_blank" class="btn" style="background: var(--accent-green);">⚡ Acessar MVP Funcional Online ↗</a>
    </div>

    <h2>1. Proposta de Valor do Produto</h2>
    <div class="card">
      <p><strong>Para:</strong> A <strong>Diretoria Executiva (Solange Ribeiro)</strong>, a <strong>Coordenação Geral (Rita Amaral)</strong>, as <strong>Educadoras Sociais (Maria Silvia)</strong> e a <strong>Psicóloga das Vivências (Carolina Duarte)</strong> do Instituto Social Ebenézer.</p>
      <p><strong>Que:</strong> Atuam na linha de frente de territórios de altíssima vulnerabilidade social e violência urbana na periferia de São Paulo, transformando vidas através de reforço escolar e vivências terapêuticas, mas enfrentam o desafio crônico de comprovar retorno social sobre o investimento (SROI) e evolução pedagógica diante de conselhos fiscais, editais públicos e doadores corporativos (Lei Rouanet / ESG), sem dispor de tempo hábil para burocracias e sem poder expor dados nominais de crianças.</p>
      <p><strong>O Percurso é:</strong> Um sistema leve e integrado de registro operacional, governança protetiva e motor determinístico de comprovação de impacto social.</p>
      <p><strong>Diferentemente de:</strong> Planilhas manuais isoladas propensas a extravio, anotações de corredor não auditáveis ou afirmações promocionais de impacto sem lastro empírico.</p>
      <p><strong>Nosso produto entrega:</strong>
        <br>• <strong>Para a Linha de Frente (Educadora e Psicóloga):</strong> Registro de chamada em 1 toque (30s) e transcrição rápida de vivência por voz com descarte imediato do áudio na memória, eliminando a escrita manual noturna.
        <br>• <strong>Para a Coordenação:</strong> Visão longitudinal de turmas, gestão ativa da régua dos 75% e bloqueio por padrão de dados sem consentimento formal (LGPD Art. 14).
        <br>• <strong>Para a Diretoria:</strong> Relatórios de ciclo em PDF prontos em 1 clique e <strong>simulador determinístico de SROI com foco na prevenção da violência e evasão escolar</strong>, fundamentado em evidências de institutos de ponta (Insper, IPEA, FGV), garantindo blindagem jurídica e zero exposição de crianças.
      </p>
    </div>

    <h2>2. Lean Canvas Estratégico (9 Blocos)</h2>
    <table>
      <thead>
        <tr><th style="width: 22%;">Bloco Estratégico</th><th style="width: 78%;">Detalhamento com Validação Real no Ebenézer</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Problema</strong></td>
          <td>
            • Evolução socioemocional ocorre semanalmente, mas se perde na oralidade e em cadernos informais.<br>
            • Risco severo de evasão escolar em crianças com presença &lt; 75% na comunidade.<br>
            • Diretoria não possui dados auditáveis para renovar parcerias financeiras e provar impacto aos doadores.<br>
            • Risco grave de vazamento de dados sensíveis de menores em situação de extrema vulnerabilidade.
          </td>
        </tr>
        <tr>
          <td><strong>2. Segmentos de Clientes & Usuários</strong></td>
          <td>
            <strong>4 Papéis Reais Mapeados em Campo:</strong><br>
            1. <em>Educadoras (Maria Silvia):</em> Foco em agilidade máxima e âncoras claras de observação em sala.<br>
            2. <em>Psicóloga (Carolina Duarte):</em> Relato de vivência sabática no padrão do CRP sem identificação nominal.<br>
            3. <em>Coordenação (Rita Amaral):</em> Busca ativa, alocação de voluntários e governança de consentimentos.<br>
            4. <strong>Diretoria (Solange Ribeiro):</strong> Captação de recursos, prestação de contas ao conselho fiscal, relatórios para doadores institucionais e demonstração de SROI.
          </td>
        </tr>
        <tr>
          <td><strong>3. Proposta de Valor Única</strong></td>
          <td>
            Fechamento de ponta a ponta: do registro de 30 segundos em sala de aula até a comprovação matemática de impacto social e custo social de violência evitado, com custo zero de licença para a ONG.
          </td>
        </tr>
        <tr>
          <td><strong>4. Solução</strong></td>
          <td>
            • Rubrica padronizada de 6 dimensões com âncoras comportamentais objetivas.<br>
            • Registro sabático por voz com descarte do arquivo de áudio logo após extração de contagens.<br>
            • Alerta automatizado de ausências consecutivas e régua de 75% de presença.<br>
            • Relatório do ciclo em 7 blocos com anonimização automática (supressão para n &lt; 5).<br>
            • <strong>Motor SROI determinístico:</strong> cálculo de retorno social em 3 cenários sem uso de LLM para números.
          </td>
        </tr>
        <tr>
          <td><strong>5. Canais</strong></td>
          <td>
            • PWA mobile nativo instalado nos smartphones dos educadores.<br>
            • Relatórios de ciclo executivos exportáveis em PDF / impressão para conselho e doadores.<br>
            • Recados de turma com resumo de presença disparados no WhatsApp oficial das famílias.
          </td>
        </tr>
        <tr>
          <td><strong>6. Estrutura de Custos</strong></td>
          <td>
            • <strong>Infraestrutura Básica: R$ 0 / mês recorrente</strong> (arquitetura Node.js + SQLite local auto-hospedável em servidores gratuitos como Render/Vercel ou computador local do Instituto).<br>
            • <strong>Canal WhatsApp (Opcional): ~R$ 18 / mês</strong> caso o Instituto decida utilizar a Meta Cloud API oficial.<br>
            • <strong>Zero dependência de licenças proprietárias</strong> de terceiros (Salesforce, PowerBI ou Airtable).
          </td>
        </tr>
        <tr>
          <td><strong>7. Métricas-Chave</strong></td>
          <td>
            • % de crianças na faixa segura da régua (&ge; 75% de presença).<br>
            • Tempo de registro por criança &le; 180 segundos.<br>
            • Índice de completude dos ciclos longitudinais de observação.<br>
            • <strong>Faixa de SROI apurada:</strong> indicador de retorno social estimado (R$ 2,36 a R$ 4,08 por R$ 1 investido em cenários exploratórios parametrizados).
          </td>
        </tr>
        <tr>
          <td><strong>8. Vantagem Injusta</strong></td>
          <td>
            Solução desenhada diretamente na favela em co-criação com fundadores e psicóloga, já aderente à planilha histórica do Instituto, com barreira arquitetural ética inquebrável (Decisão 16: Diretoria não acessa dados nominais).
          </td>
        </tr>
      </tbody>
    </table>

    <h2>3. O Eixo Narrativo de Impacto: Prevenção da Violência e Criminalidade (SROI)</h2>
    <div class="card-highlight">
      <h3 style="color: var(--accent-amber); margin-top: 0;">Decisão Institucional: A Violência Urbana como Indicador Central de Apelo</h3>
      <p>
        O Instituto Social Ebenézer atua em um território historicamente assolado pela criminalidade e violência urbana na Zona Leste/Sul de São Paulo. A liderança do Instituto registrou formalmente durante a pesquisa que <strong>a prevenção da violência e o afastamento de jovens do crime organizado constituem o principal argumento de impacto e o maior catalisador de captação de recursos junto a parceiros mantenedores</strong>.
      </p>
      <p>
        Para que a Diretoria possa demonstrar esse impacto sem recorrer a "achismos" ou a sobre-alegações levianas que seriam reprovadas em auditorias, o Percurso integra a metodologia SROI (<em>Social Return on Investment</em>) balizada em pesquisas e modelos econométricos brasileiros publicados por instituições de primeira linha:
      </p>

      <table style="background: white; border-radius: 8px; overflow: hidden; margin-top: 14px;">
        <thead>
          <tr>
            <th>Proxy de Impacto</th>
            <th>Valor Unitário / Referência</th>
            <th>Fonte Oficial & Ano</th>
            <th>Papel no Modelo do Ebenézer</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background: #FFFDF8;">
            <td><strong>Violência dentro do Custo da Evasão</strong></td>
            <td><strong style="color: var(--accent-red);">R$ 45.000 / jovem</strong><br><small>ao longo da vida</small></td>
            <td>Insper + Fundação Roberto Marinho (2020)</td>
            <td><span class="tag tag-red">Eixo Central</span> Componente de segurança pública evitado pelo fortalecimento do vínculo escolar.</td>
          </tr>
          <tr>
            <td><strong>Não Conclusão da Educação Básica (Envelope Total)</strong></td>
            <td><strong>R$ 372.000 / jovem</strong><br><small>ao longo da vida</small></td>
            <td>Insper + Fundação Roberto Marinho (2020)</td>
            <td><span class="tag tag-amber">Envelope</span> Custo social total (inclui renda, saúde e violência). Motor bloqueia dupla contagem.</td>
          </tr>
          <tr>
            <td><strong>Remuneração e Produtividade Futura</strong></td>
            <td><strong>R$ 159.000 / jovem</strong><br><small>ciclo produtivo até 69 anos</small></td>
            <td>Insper + Fundação Roberto Marinho (2020)</td>
            <td><span class="tag tag-blue">Componente</span> Renda individual gerada ao evitar a evasão precoce.</td>
          </tr>
          <tr>
            <td><strong>Qualidade de Vida e Saúde Evitada</strong></td>
            <td><strong>R$ 114.000 / jovem</strong><br><small>ao longo da vida</small></td>
            <td>Insper + Fundação Roberto Marinho (2020)</td>
            <td><span class="tag tag-blue">Componente</span> Monetização de 4,4 anos de vida saudável (referência OMS).</td>
          </tr>
          <tr>
            <td><strong>Bem-Estar Perdido em Homicídios</strong></td>
            <td><strong>R$ 50 bilhões / ano</strong><br><small>0,77% do PIB nacional</small></td>
            <td>IPEA · Atlas da Violência (2023)</td>
            <td><span class="tag tag-amber">Benchmark</span> Proxy macroeconômica nacional de perda associada a homicídios.</td>
          </tr>
          <tr>
            <td><strong>Programa Brasileiro de Redução de Homicídios</strong></td>
            <td><strong>R$ 2,36 por R$ 1 investido</strong><br><small>relação benefício-custo</small></td>
            <td>FGV/RBE · Estado Presente (Controle Sintético)</td>
            <td><span class="tag tag-green">Benchmark</span> Parâmetro de sensibilidade para intervenções sociais territoriais.</td>
          </tr>
        </tbody>
      </table>

      <h3>Fórmula do Motor Determinístico (src/sroi/calculator.js)</h3>
      <div class="formula-box">
benefício_t = N × efeito_incremental × proxy_R$ × (1 − deadweight) × (1 − atribuição)
              × (1 − deslocamento) × (1 − drop-off)^(t−1) ÷ (1 + desconto)^t

SROI = Σ benefícios_presentes ÷ investimento_total_do_horizonte
      </div>
      <p style="font-size: 13.5px; color: var(--ink-muted); margin-bottom: 0;">
        <strong>Doutrina de Governança:</strong> O cálculo executa de forma 100% matemática, sem inteligência generativa inventando números. Os resultados são sempre reportados em <strong>3 cenários (Conservador, Base e Superior)</strong> e com a ressalva mandatória: <em>"Associação compatível, não causalidade comprovada. Fatores externos de comunidade não foram isolados."</em>
      </p>
    </div>

    <h2>4. Reconciliação dos Dados Demográficos (120 Crianças)</h2>
    <p>
      O termo "120 crianças" do edital original representava, na realidade de campo, o teto físico de <strong>matrículas</strong> (60 crianças no turno matutino e 60 no vespertino). O Percurso implementou a distinção ontológica estrita entre <em>Criança Única</em> e <em>Matrícula em Programa</em>:
    </p>
    <ul>
      <li><strong>106 Crianças Únicas Efetivas:</strong> Ativas no reforço escolar e nas atividades socioemocionais regulares.</li>
      <li><strong>24 Matrículas nas Vivências de Sábado:</strong> Conduzidas pela psicóloga voluntária (2 turmas de 12 crianças), formadas por participantes já matriculados no contraturno.</li>
      <li><strong>14 Crianças em Alerta de Evasão / Busca Ativa:</strong> Crianças que apresentavam faltas frequentes ou transições familiares delicadas, agora monitoradas preventivamente pela <strong>régua dos 75%</strong> para deflagração imediata de contato com os responsáveis.</li>
    </ul>

    <h2>5. Escopo e Módulos Entregues no MVP Funcional</h2>
    <table>
      <thead>
        <tr><th>Módulo</th><th>Funcionalidade</th><th>Público Alvo</th><th>Status no MVP</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>F1 / F2</strong></td><td>Ficha com Consentimento LGPD Art. 14 e Chamada Diária em 1 Toque</td><td>Educadoras</td><td><span class="tag tag-green">Implementado</span></td></tr>
        <tr><td><strong>F3 / F4</strong></td><td>Rubrica Socioemocional (6 Dimensões) com Ciclos Longitudinais</td><td>Educadoras</td><td><span class="tag tag-green">Implementado</span></td></tr>
        <tr><td><strong>F6 / F7</strong></td><td>Alerta de Ausências (Régua 75%) e Registro de Vivência por Voz (Descarte de Áudio)</td><td>Educadora e Psicóloga</td><td><span class="tag tag-green">Implementado</span></td></tr>
        <tr><td><strong>F8 / F9</strong></td><td>Painel Consolidado de Turmas e Governança de Consentimentos</td><td>Coordenação</td><td><span class="tag tag-green">Implementado</span></td></tr>
        <tr><td><strong>F13 / F14</strong></td><td>Relatório do Ciclo do Doador com Supressão Automática (n &lt; 5)</td><td><strong>Diretoria (Solange)</strong></td><td><span class="tag tag-green">Implementado</span></td></tr>
        <tr><td><strong>F15 / SROI</strong></td><td><strong>Simulador de Retorno Social (SROI) focado em Prevenção da Violência</strong></td><td><strong>Diretoria (Solange)</strong></td><td><span class="tag tag-green">Implementado</span></td></tr>
        <tr><td><strong>Passo / Aurora</strong></td><td>Assistente Guiado de Navegação e Pergunta Agregada em Linguagem Natural</td><td>Todos os Papéis</td><td><span class="tag tag-green">Implementado</span></td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>
"""
salvar("Artefato_Negocios_Semana5_TrilhaB.html", negocios_html)

# ==============================================================================
# 2. ARTEFATO DE TECNOLOGIA, UX & ARQUITETURA (HTML)
# ==============================================================================
tecnologia_html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Percurso · Artefato de Tecnologia & UX/UI (Semana 5 - Trilha B)</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Newsreader:ital,wght@0,600;0,700;1,400&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #FBF8F3;
      --card-bg: #FFFFFF;
      --ink: #1F1D1A;
      --ink-muted: #5C5549;
      --line: #E8E2D5;
      --line-subtle: #F0EBE0;
      --accent-red: #B23528;
      --accent-green: #2E6B47;
      --accent-blue: #23527C;
      --accent-amber: #9A6B15;
      --accent-amber-bg: #FEF8EC;
      --accent-blue-bg: #F2F7FC;
      --accent-green-bg: #F0F7F2;
    }
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background: var(--bg); color: var(--ink); padding: 40px 24px; line-height: 1.6; }
    .container { max-width: 1040px; margin: 0 auto; background: var(--card-bg); border: 1px solid var(--line); border-radius: 16px; padding: 48px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
    h1 { font-family: 'Newsreader', Georgia, serif; font-size: 36px; color: var(--accent-blue); margin: 8px 0 12px; letter-spacing: -0.02em; }
    .badge { display: inline-block; background: var(--accent-blue); color: white; padding: 4px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 12px; }
    .badge-amber { background: var(--accent-amber); }
    h2 { font-size: 22px; font-weight: 700; margin: 36px 0 16px; border-bottom: 2px solid var(--line-subtle); padding-bottom: 10px; color: var(--ink); display: flex; align-items: center; gap: 10px; }
    h3 { font-size: 17px; font-weight: 700; color: var(--accent-red); margin: 24px 0 10px; }
    .card { background: #FAF7F2; border: 1px solid var(--line); border-radius: 12px; padding: 22px; margin: 16px 0; }
    .card-persona { border-left: 5px solid var(--accent-blue); background: #FAF7F2; margin-bottom: 18px; border-radius: 0 12px 12px 0; padding: 20px 24px; }
    .card-diretoria { border-left: 5px solid var(--accent-amber); background: var(--accent-amber-bg); }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th { background: #F4EFE6; text-align: left; padding: 12px 14px; border-bottom: 2px solid #D4CABE; font-weight: 700; color: var(--ink); }
    td { padding: 12px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .btn { display: inline-block; background: var(--accent-blue); color: white; padding: 10px 22px; border-radius: 99px; text-decoration: none; font-weight: 700; font-size: 13.5px; transition: all 0.2s ease; }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .tag-red { background: #FDF2F0; color: var(--accent-red); border: 1px solid #FACDC8; }
    .tag-green { background: var(--accent-green-bg); color: var(--accent-green); border: 1px solid #C8E6D3; }
    .tag-blue { background: var(--accent-blue-bg); color: var(--accent-blue); border: 1px solid #C7DCF0; }
    .tag-amber { background: var(--accent-amber-bg); color: var(--accent-amber); border: 1px solid #F5DEB3; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 13px; background: #EFE9DE; padding: 2px 6px; border-radius: 4px; color: #78261F; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Inteli MBA IA & Dados · Módulo 3 · Semana 5</span>
    <span class="badge badge-amber">Trilha B · Grupo 06</span>
    <h1>Artefato de Tecnologia, UX & Arquitetura · Percurso</h1>
    <p style="font-size: 15px; color: var(--ink-muted); margin-bottom: 24px;">
      <strong>Projeto:</strong> Percurso — Monitoramento de Impacto Socioemocional e Governança de Dados<br>
      <strong>Parceiro:</strong> Instituto Social Ebenézer | <strong>Local:</strong> Jardim Keralux / Jardim Ângela (São Paulo - SP)
    </p>

    <div style="margin: 20px 0; display: flex; gap: 12px; flex-wrap: wrap;">
      <a href="Dossie_Jornada_Semana5_TrilhaB.html" class="btn" style="background: var(--accent-red);">📖 Ver Dossiê Visual Completo com Prints ↗</a>
      <a href="Artefato_Negocios_Semana5_TrilhaB.html" class="btn" style="background: var(--accent-amber);">💼 Ver Artefato de Negócios ↗</a>
      <a href="https://www.figma.com/proto/JMejpNsHkckqeSP8KE1PTh/Percurso-%E2%80%94-prot%C3%B3tipo-v3-%C2%B7-12-telas--4-pap%C3%A9is?node-id=9-2&p=f&t=T34yyWpc1jfmYeyG-0&scaling=min-zoom&content-scaling=fixed&page-id=2%3A20&starting-point-node-id=9%3A2" target="_blank" class="btn" style="background: var(--accent-blue);">🎨 Protótipo Canônico no Figma (27 Telas / 4 Papéis) ↗</a>
    </div>

    <h2>1. Personas e Citações Reais de Campo (4 Papéis)</h2>
    
    <div class="card-persona">
      <h3 style="margin-top: 0; color: var(--accent-red);">1. Maria Silvia (35 anos) · Educadora do Reforço Escolar (Faixa 1)</h3>
      <p><em>"Eu não consigo transformar em dados os resultados do meu trabalho com as crianças."</em></p>
      <p><strong>Desafio de Campo:</strong> Falta crônica de tempo hábil para relatórios escritos; interrupções no atendimento às turmas. <strong>Necessidade Decisiva:</strong> Registro da chamada e observações em menos de 1 minuto no próprio celular, mantendo sigilo estrito de dados nominais das crianças da favela.</p>
    </div>

    <div class="card-persona" style="border-left-color: var(--accent-green);">
      <h3 style="margin-top: 0; color: var(--accent-green);">2. Carolina Duarte (39 anos) · Psicóloga Voluntária da Vivência (Faixa 2)</h3>
      <p><em>"O maior desafio aqui é registrar o que você fez. Sair daqui no sábado à noite e preencher relatório técnico... não dá."</em></p>
      <p><strong>Desafio de Campo:</strong> Atende turmas sabáticas de acolhimento emocional; tempo clínico 100% escasso. <strong>Necessidade Decisiva:</strong> Gravar áudio rápido de 40s após o encontro com transcrição automática e descarte do arquivo de voz, gerando o relatório formal exigido pelo Conselho Regional de Psicologia (CRP) sem nomes de crianças.</p>
    </div>

    <div class="card-persona">
      <h3 style="margin-top: 0; color: var(--accent-blue);">3. Rita Amaral (42 anos) · Coordenação Pedagógica Geral (Faixa 3)</h3>
      <p><em>"O Instituto vive de confiança e doações; precisamos saber exatamente quem está faltando para fazer busca ativa antes da evasão."</em></p>
      <p><strong>Desafio de Campo:</strong> Planilhas manuais desconectadas e risco de perda de vínculo. <strong>Necessidade Decisiva:</strong> Painel de indicadores longitudinais, régua de presença de 75% e bloqueio sistêmico por padrão de campos sem consentimento assinado (LGPD Art. 14).</p>
    </div>

    <div class="card-persona card-diretoria">
      <h3 style="margin-top: 0; color: var(--accent-amber);">4. Solange Ribeiro (52 anos) · Diretora Executiva / Captação & Governança (Faixa 4)</h3>
      <p><em>"Diante de grandes financiadores e do conselho fiscal, não posso apresentar 'achismos' nem inflar números. Ao mesmo tempo, atuamos na periferia: nosso maior impacto é tirar os jovens da rota da violência urbana e da evasão escolar."</em></p>
      <p><strong>Desafio de Campo:</strong> Dificuldade em comprovar retorno social em reuniões de captação (Lei Rouanet / ESG) e risco de auditoria caso sobre-alegue impacto causal. <strong>Necessidade Decisiva:</strong> Relatório consolidado em 7 blocos com supressão de células pequenas (n &lt; 5) e simulador determinístico de SROI com proxies de violência e evasão (Insper/IPEA/FGV), sob a blindagem da <strong>Decisão Técnica 16 (bloqueio 403 para fichas individuais de crianças)</strong>.</p>
    </div>

    <h2>2. Matriz Completa de User Stories & Rastreabilidade no Figma</h2>
    <table>
      <thead>
        <tr>
          <th>História</th>
          <th>Papel</th>
          <th>Enunciado da Necessidade do Usuário</th>
          <th>Tela no Figma / Rota</th>
          <th>Critério de Validação Automatizada</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>US-1</strong></td>
          <td><span class="tag tag-red">Educadora</span></td>
          <td>Como educadora, quero registrar observações socioemocionais em minutos com âncoras comportamentais claras.</td>
          <td><code>#/ciclo</code> &rarr; <code>#/observacao</code><br><small>Frame #7:51 (Faixa 1)</small></td>
          <td>Smoke §4 (12 asserções) e §5b (cronômetro &le; 180s por avaliação).</td>
        </tr>
        <tr>
          <td><strong>US-2</strong></td>
          <td><span class="tag tag-red">Educadora</span></td>
          <td>Como educadora, quero comparar a evolução entre ciclos para planejar atividades pedagógicas com dados reais.</td>
          <td><code>#/turma</code><br><small>Frame #8:2 (Faixa 1)</small></td>
          <td>Smoke §5 (dispersão estatística e evolução temporal de médias).</td>
        </tr>
        <tr>
          <td><strong>US-3</strong></td>
          <td><span class="tag tag-red">Educadora</span></td>
          <td>Como educadora, quero alertas imediatos de ausências acumuladas para agir preventivamente na turma.</td>
          <td><code>#/hoje</code><br><small>Frame #5:2 (Faixa 1)</small></td>
          <td>Smoke §6 (disparo do alerta preventivo em 2 faltas consecutivas).</td>
        </tr>
        <tr>
          <td><strong>US-4</strong></td>
          <td><span class="tag tag-blue">Coordenação</span></td>
          <td>Como coordenação, quero painel agregado de indicadores sem risco de expor a identidade de nenhuma criança.</td>
          <td><code>#/painel</code> &rarr; <code>#/sintese</code><br><small>Frame #9:2 (Faixa 3)</small></td>
          <td>Smoke §7 (supressão automática de células quando n &lt; 5).</td>
        </tr>
        <tr>
          <td><strong>US-5</strong></td>
          <td><span class="tag tag-blue">Coordenação</span></td>
          <td>Como coordenação, quero bloqueio por padrão de coleta e visualização de campos sem termo de consentimento.</td>
          <td><code>#/consentimentos</code><br><small>Frame #8:71 (Faixa 3)</small></td>
          <td>Smoke §8 e §28 (bloqueio 403 e revogação em tempo real).</td>
        </tr>
        <tr>
          <td><strong>US-6</strong></td>
          <td><span class="tag tag-green">Psicóloga</span></td>
          <td>Como psicóloga, quero gravar relato de 40s sobre a vivência para gerar minuta do CRP sem preenchimento manual noturno.</td>
          <td><code>#/voz</code> &rarr; <code>#/relato</code><br><small>Frame #25:505 (Faixa 2)</small></td>
          <td>Smoke §24 e §26 (extração de contagens e descarte do áudio).</td>
        </tr>
        <tr style="background: #FFFDF8;">
          <td><strong>US-7</strong></td>
          <td><span class="tag tag-amber">Diretoria</span></td>
          <td><strong>Como diretora, quero gerar relatórios de ciclo consolidados em 7 blocos para doadores e conselho fiscal, sem exibir dados nominais.</strong></td>
          <td><code>#/relatorio</code><br><small>Frame #26:802 (Faixa 4)</small></td>
          <td>Smoke §25 e Testes Unitários de Relatório (revisor de sobre-alegação e bloqueio de dados individuais).</td>
        </tr>
        <tr style="background: #FFFDF8;">
          <td><strong>US-8</strong></td>
          <td><span class="tag tag-amber">Diretoria</span></td>
          <td><strong>Como diretora, quero simular o retorno social sobre investimento (SROI) em 3 cenários exploratórios tendo a redução da violência e evasão como premissas transparentes.</strong></td>
          <td><code>#/impacto</code><br><small>Frame #26:803 (Faixa 4)</small></td>
          <td>Testes do motor determinístico (<code>src/sroi/calculator.js</code>), bloqueio de dupla contagem (422) e premissas Insper/IPEA/FGV.</td>
        </tr>
      </tbody>
    </table>

    <h2>3. Jornada Comparativa AS-IS vs. TO-BE (Ganhos Reais de Eficiência)</h2>
    <table>
      <thead>
        <tr>
          <th>Atividade Operacional</th>
          <th>Processo Anterior (AS-IS)</th>
          <th>Com o Sistema Percurso (TO-BE)</th>
          <th>Ganho de Eficiência & Redução de Risco</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Presença Diária</strong></td>
          <td>Lista física em papel sujeita a rasuras e digitação manual posterior.</td>
          <td>1 toque por criança no celular via PWA offline-first (<code>#/chamada</code>).</td>
          <td>Redução de 15 minutos para <strong>40 segundos</strong>.</td>
        </tr>
        <tr>
          <td><strong>Registro de Vivência (Psicóloga)</strong></td>
          <td>Horas preenchendo relatórios técnicos no computador tarde da noite.</td>
          <td>Áudio de ~40s com transcrição e descarte imediato do áudio na memória (<code>#/voz</code>).</td>
          <td>Eliminação total da escrita manual noturna.</td>
        </tr>
        <tr>
          <td><strong>Gestão da Régua de 75%</strong></td>
          <td>Percepção tardia do abandono escolar somente no final do semestre.</td>
          <td>Régua automatizada com alerta visual para busca ativa imediata (<code>#/painel</code>).</td>
          <td>Identificação precoce de 100% dos casos de risco.</td>
        </tr>
        <tr style="background: #FFFDF8;">
          <td><strong>Prestação de Contas (Diretoria)</strong></td>
          <td>Dias redigindo relatórios qualitativos subjetivos com dados dispersos.</td>
          <td>Síntese de ciclo com agregação em 1 clique e supressão de dados nominais (<code>#/relatorio</code>).</td>
          <td>Redução de 12 horas para <strong>2 minutos</strong> de geração.</td>
        </tr>
        <tr style="background: #FFFDF8;">
          <td><strong>Demonstração de Impacto (Diretoria)</strong></td>
          <td>Escolha perigosa entre omitir impacto ou inventar números sem base científica diante de doadores.</td>
          <td>Simulador determinístico de SROI com 3 cenários e premissas de redução de violência do Insper/IPEA/FGV (<code>#/impacto</code>).</td>
          <td><strong>Cálculo auditável e defensável</strong> perante conselhos fiscais e auditorias externas.</td>
        </tr>
      </tbody>
    </table>

    <h2>4. Arquitetura de Governança e Blindagem Ética (Decisão 16)</h2>
    <div class="card">
      <h3 style="color: var(--accent-blue); margin-top: 0;">Princípio da Menor Exposição de Dados (LGPD Art. 14 & ECA)</h3>
      <p>
        Uma das decisões mais estruturantes da arquitetura do Percurso é a <strong>Decisão Técnica 16: A Diretoria não abre registro individual de criança</strong>.
      </p>
      <ul>
        <li><strong>Camada Agregada Exclusiva:</strong> Como o papel da Diretoria Executiva é prestar contas a financiadores e gerir a sustentabilidade institucional, ela não necessita acessar prontuários individuais, históricos familiares ou nomes de menores atendidos.</li>
        <li><strong>Bloqueio Sistêmico (403 Forbidden):</strong> O servidor backend rejeita deterministicamente qualquer tentativa de acesso do perfil de diretoria às rotas <code>#/crianca/:id</code>, <code>#/folha</code> ou listagens nominais.</li>
        <li><strong>Filtro no Copilot / Assistente:</strong> Caso a diretoria pergunte ao assistente sobre o nome de uma criança, o sistema recusa deterministicamente a resposta antes de acionar qualquer modelo de linguagem.</li>
      </ul>
      <p style="margin-bottom: 0; font-size: 13.5px; color: var(--ink-muted);">
        <strong>Resultado:</strong> Segurança jurídica absoluta para o Instituto e blindagem das crianças da comunidade contra qualquer risco de exposição indevida em documentos institucionais.
      </p>
    </div>
  </div>
</body>
</html>
"""
salvar("Artefato_Tecnologia_UX_UI_Semana5_TrilhaB.html", tecnologia_html)

# ==============================================================================
# 3. ATUALIZAÇÃO DO ARQUIVO ZIP NA PASTA DO ONEDRIVE
# ==============================================================================
zip_path = os.path.join(base_dir_onedrive_1, "Entrega_Semana5_TrilhaB_Grupo06.zip")
if os.path.exists(base_dir_onedrive_1):
    arquivos_para_zip = [
        "Artefato_Negocios_Semana5_TrilhaB.html",
        "Artefato_Tecnologia_UX_UI_Semana5_TrilhaB.html",
        "Dossie_Jornada_Semana5_TrilhaB.html",
        "Link_Prototipo_Figma_Navegavel.html"
    ]
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for arq in arquivos_para_zip:
            origem = os.path.join(base_dir_onedrive_1, arq)
            if os.path.exists(origem):
                zf.write(origem, arq)
                print(f"Compactado no ZIP: {arq}")
        # Adicionar imagens do figma se existirem
        figma_dir = os.path.join(base_dir_onedrive_1, "figma_images")
        if os.path.exists(figma_dir):
            for img in os.listdir(figma_dir):
                if img.endswith((".png", ".svg", ".jpg")):
                    img_origem = os.path.join(figma_dir, img)
                    zf.write(img_origem, os.path.join("figma_images", img))
            print("Pasta figma_images compactada com sucesso no ZIP!")
    print(f"ZIP de entrega atualizado com sucesso: {zip_path}")

print("\nProcesso concluído com sucesso!")
