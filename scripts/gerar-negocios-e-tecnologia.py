# -*- coding: utf-8 -*-
"""
Gera os arquivos separados de Negócios e Tecnologia para a pasta do Drive.
"""
import os

base_dir_onedrive = "/Users/igorrego/Library/CloudStorage/OneDrive-Pessoal/02_Allla/Inteli - Artefato Modulo III/1 - Arquitetura"
base_dir_public = "/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional/public"

def salvar(nome, conteudo):
    for base in [base_dir_onedrive, base_dir_public]:
        path = os.path.join(base, nome)
        with open(path, "w", encoding="utf-8") as f:
            f.write(conteudo)
        print(f"Salvo: {path}")

# NEGÓCIOS HTML
negocios_html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Percurso · Artefato de Negócios (Semana 5 - Trilha B)</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Newsreader:ital,wght@0,600;1,400&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #FBF8F3; color: #1F1D1A; padding: 40px 24px; line-height: 1.6; }
    .container { max-width: 960px; margin: 0 auto; background: white; border: 1px solid #E8E2D5; border-radius: 16px; padding: 44px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    h1 { font-family: 'Newsreader', Georgia, serif; font-size: 36px; color: #B23528; margin-bottom: 8px; }
    .badge { display: inline-block; background: #B23528; color: white; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
    h2 { font-size: 22px; margin: 32px 0 14px; border-bottom: 2px solid #F4EFE6; padding-bottom: 8px; }
    .card { background: #FBF8F3; border: 1px solid #E8E2D5; border-radius: 10px; padding: 20px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th { background: #F4EFE6; text-align: left; padding: 12px; border-bottom: 2px solid #D4CABE; }
    td { padding: 12px; border-bottom: 1px solid #E8E2D5; }
    .btn { display: inline-block; background: #23527C; color: white; padding: 10px 20px; border-radius: 99px; text-decoration: none; font-weight: 700; font-size: 13px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Inteli MBA IA & Dados · Módulo 3 · Semana 5</span>
    <h1>Artefato de Negócios · Percurso</h1>
    <p><strong>Trilha B:</strong> Monitoramento de Impacto Socioemocional — Instituto Social Ebenézer | <strong>Grupo 06</strong></p>
    
    <div style="margin: 20px 0; display: flex; gap: 10px;">
      <a href="Dossie_Jornada_Semana5_TrilhaB.html" class="btn" style="background: #B23528;">Ver Dossiê Visual Completo com Prints ↗</a>
      <a href="https://percurso-ebenezer.vercel.app" target="_blank" class="btn" style="background: #2E6B47;">Acessar MVP Online ↗</a>
    </div>

    <h2>1. Proposta de Valor do MVP</h2>
    <div class="card">
      <p><strong>Para:</strong> A coordenação, educadores e psicóloga do Instituto Social Ebenézer.</p>
      <p><strong>Que:</strong> Vivenciam a transformação socioemocional das crianças na favela do Jardim Keralux, mas não possuem como registrá-la nem comprová-la a quem financia o projeto.</p>
      <p><strong>O Percurso é:</strong> Um sistema leve que transforma a observação em sala e as vivências em indicadores estruturados e relatórios no padrão do conselho profissional.</p>
      <p><strong>Diferentemente de:</strong> Planilhas manuais isoladas e relatórios anuais puramente qualitativos.</p>
      <p><strong>Nosso produto entrega:</strong> Comprovação de impacto real sem expor dados nominais de crianças, sem cobrança recorrente de licenças e mantido pela própria equipe local.</p>
    </div>

    <h2>2. Lean Canvas Resumido (9 Blocos)</h2>
    <table>
      <tr><th>Bloco</th><th>Definição Estratégica</th></tr>
      <tr><td><strong>Problema</strong></td><td>A evolução socioemocional acontece toda semana, mas não é registrada; educadores sem tempo hábil para relatórios; financiadores exigem métricas.</td></tr>
      <tr><td><strong>Segmentos</strong></td><td>Educadoras do reforço escolar, psicóloga da vivência terapêutica, liderança comunitária e doadores institucionais.</td></tr>
      <tr><td><strong>Proposta de Valor</strong></td><td>Comprovar a transformação socioemocional sem expor crianças, com custo zero de licenças e adoção fluida.</td></tr>
      <tr><td><strong>Solução</strong></td><td>Rubrica com âncoras claras (~3 min por criança), captura por voz com descarte imediato do áudio e síntese automática de ciclo.</td></tr>
      <tr><td><strong>Canais</strong></td><td>PWA instalado nos smartphones da equipe, recados via WhatsApp oficial e relatórios de ciclo em PDF.</td></tr>
      <tr><td><strong>Custos</strong></td><td>R$ 0 recorrente para a ONG (Node.js nativo + SQLite local) e ~R$ 18/mês na Meta caso opte pela Cloud API oficial.</td></tr>
      <tr><td><strong>Métricas</strong></td><td>% de crianças na régua &ge; 75%, tempo de preenchimento &le; 180s e índice de progressão nos ciclos de observação.</td></tr>
      <tr><td><strong>Vantagem Injusta</strong></td><td>Desenhado sob medida com a equipe na favela, incorporando a régua de 75% e a planilha histórica do Instituto.</td></tr>
    </table>

    <h2>3. Reconciliação dos Dados Demográficos (120 Crianças)</h2>
    <p>O Instituto atende uma capacidade de 120 crianças (60 manhã / 60 tarde). Destas, 106 crianças são ativas em sala nas oficinas semanais e vivências aos sábados. As 14 crianças restantes representam casos em transição familiar, ausências frequentes ou risco de evasão, sendo monitoradas pelo sistema através da régua preventiva de 75% de presença para deflagração imediata de busca ativa.</p>

    <h2>4. Escopo do MVP</h2>
    <p>O MVP implementa estritamente: (F1) Ficha viva com consentimento Art. 14 por padrão; (F2) Chamada diária em um toque; (F3) Rubrica socioemocional de 6 dimensões; (F4) Agenda longitudinal de ciclos; (F5) Painel agregado para captação de recursos; e (F6) Alerta preventivo de ausências seguidas. Ficam deliberadamente fora do MVP prontuários clínicos individuais e logins de família.</p>
  </div>
</body>
</html>
"""
salvar("Artefato_Negocios_Semana5_TrilhaB.html", negocios_html)

# TECNOLOGIA HTML
tecnologia_html = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Percurso · Artefato de Tecnologia & UX/UI (Semana 5 - Trilha B)</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Newsreader:ital,wght@0,600;1,400&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #FBF8F3; color: #1F1D1A; padding: 40px 24px; line-height: 1.6; }
    .container { max-width: 960px; margin: 0 auto; background: white; border: 1px solid #E8E2D5; border-radius: 16px; padding: 44px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    h1 { font-family: 'Newsreader', Georgia, serif; font-size: 36px; color: #23527C; margin-bottom: 8px; }
    .badge { display: inline-block; background: #23527C; color: white; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
    h2 { font-size: 22px; margin: 32px 0 14px; border-bottom: 2px solid #F4EFE6; padding-bottom: 8px; }
    .card { background: #FBF8F3; border: 1px solid #E8E2D5; border-radius: 10px; padding: 20px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th { background: #F4EFE6; text-align: left; padding: 12px; border-bottom: 2px solid #D4CABE; }
    td { padding: 12px; border-bottom: 1px solid #E8E2D5; }
    .btn { display: inline-block; background: #23527C; color: white; padding: 10px 20px; border-radius: 99px; text-decoration: none; font-weight: 700; font-size: 13px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Inteli MBA IA & Dados · Módulo 3 · Semana 5</span>
    <h1>Artefato de Tecnologia, UX & Arquitetura · Percurso</h1>
    <p><strong>Trilha B:</strong> Monitoramento de Impacto Socioemocional — Instituto Social Ebenézer | <strong>Grupo 06</strong></p>

    <div style="margin: 20px 0; display: flex; gap: 10px;">
      <a href="Dossie_Jornada_Semana5_TrilhaB.html" class="btn" style="background: #B23528;">Ver Dossiê Visual Completo com Prints ↗</a>
      <a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="btn" style="background: #23527C;">Protótipo Canônico Figma (27 Telas) ↗</a>
    </div>

    <h2>1. Personas e Citações de Campo</h2>
    <div class="card">
      <p><strong>Maria Silvia (35 anos, Pedagoga do Reforço Escolar):</strong> <em>"Não consigo transformar em dados os resultados do meu trabalho."</em> Dor: falta de tempo para redigir relatórios sem desviar o olhar das crianças na sala de aula. Necessidade decisiva: sigilo absoluto das crianças.</p>
      <p><strong>Líder Wellington (48 anos, Fundador):</strong> <em>"O Instituto vive de confiança e doação; precisamos mostrar onde cada centavo toca a vida das crianças."</em> Opera sem equipe de tecnologia e implementou a régua dos 75% de frequência.</p>
      <p><strong>Carolina Duarte (39 anos, Psicóloga Voluntária):</strong> <em>"O maior desafio aqui é registrar o que você fez. Sair daqui à noite e preencher relatório... não dá."</em> Realiza vivências de sábado e necessita de relatórios no padrão do CRP sem identificação de menores.</p>
    </div>

    <h2>2. Matriz das User Stories & Frames do Figma</h2>
    <table>
      <tr><th>História</th><th>Enunciado do Usuário</th><th>Tela no Figma</th><th>Validação Automatizada</th></tr>
      <tr><td><strong>US-1</strong></td><td>Como educadora, quero registrar observações em minutos com âncoras objetivas.</td><td><code>#/ciclo</code> &rarr; <code>#/observacao</code> (Frame #7:51)</td><td>Smoke §4 (12 asserções) e §5b (cronômetro &le; 180s).</td></tr>
      <tr><td><strong>US-2</strong></td><td>Como educadora, quero comparar ciclos para planejar com base em dados.</td><td><code>#/turma</code> (Frame #8:2)</td><td>Smoke §5 (dispersão e evolução de médias).</td></tr>
      <tr><td><strong>US-3</strong></td><td>Como educadora, quero alerta de ausências acumuladas para agir preventivamente.</td><td><code>#/hoje</code> (Frame #5:2)</td><td>Smoke §6 (disparo em 2 faltas consecutivas).</td></tr>
      <tr><td><strong>US-4</strong></td><td>Como coordenação, quero painel agregado sem expor nenhuma criança.</td><td><code>#/painel</code> &rarr; <code>#/sintese</code> (Frame #9:2)</td><td>Smoke §7 (supressão automática de médias quando n &lt; 5).</td></tr>
      <tr><td><strong>US-5</strong></td><td>Como coordenação, quero bloqueio por padrão de campos sem consentimento.</td><td><code>#/consentimentos</code> (Frame #8:71)</td><td>Smoke §8 (ativação e revogação em tempo real).</td></tr>
      <tr><td><strong>US-6</strong></td><td>Como psicóloga, quero falar 40s sobre o dia para gerar o relatório do conselho.</td><td><code>#/voz</code> &rarr; <code>#/relato</code> (Frame #25:505)</td><td>Smoke §24 e §26 (relato por procedimento sem nomes).</td></tr>
    </table>

    <h2>3. Jornada AS-IS vs. TO-BE (Ganho de Tempo e Redução de Atrito)</h2>
    <table>
      <tr><th>Atividade</th><th>Processo Atual (AS-IS)</th><th>Com o Percurso (TO-BE)</th><th>Redução de Atrito</th></tr>
      <tr><td>Presença</td><td>Lista de papel + digitação manual em planilha</td><td>1 toque por criança no PWA mobile</td><td>15 min &rarr; 40 segundos</td></tr>
      <tr><td>Observação</td><td>Memória do educador / relatos soltos no corredor</td><td>Rubrica padronizada de 6 dimensões</td><td>Estruturação de 100% dos casos</td></tr>
      <tr><td>Relato de Vivência</td><td>Horas preenchendo relatórios à noite</td><td>Áudio de ~40s com transcrição e descarte</td><td>Eliminação da escrita manual noturna</td></tr>
      <tr><td>Prestação de Contas</td><td>Dias redigindo relatórios qualitativos subjetivos</td><td>Síntese de ciclo com agregação em 1 clique</td><td>12 horas &rarr; 5 minutos</td></tr>
    </table>

    <h2>4. Ata da Validação Presencial com Usuária Real (29/08/2026)</h2>
    <p>A sessão com a psicóloga Carolina Duarte e o líder Wellington durante as vivências de sábado comprovou a fluidez da proposta: o teste de transformar os check-ins da vivência em um rascunho de relatório sem expor nomes de crianças gerou aprovação imediata (<em>"Amei isso!"</em> - Gravação 82, 57:20). O teste em campo resultou na criação da persona da psicóloga, na adoção das 6 dimensões reais da planilha e na automação da régua de 75%.</p>

    <h2>5. Auditoria Ética (Bloco 6)</h2>
    <p><strong>Privacidade:</strong> Dados 100% sintéticos (códigos C001..C106). Áudio descartado da memória após a transcrição local.<br>
    <strong>Governança:</strong> Bloqueio mandatório de campos sem consentimento formal assinado pelo responsável (LGPD Art. 14).<br>
    <strong>Sobrevivência:</strong> Custo zero pós-Semana 10. Roda em Node.js com SQLite local, sem dependência de TI ou servidores pagos.</p>
  </div>
</body>
</html>
"""
salvar("Artefato_Tecnologia_UX_UI_Semana5_TrilhaB.html", tecnologia_html)

print("Geração dos arquivos específicos concluída!")
