# -*- coding: utf-8 -*-
"""
Gera os arquivos específicos de Negócios e Tecnologia (HTML)
para submissão formal na pasta do Google Drive.
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

# 1. LINK PROTÓTIPO FIGMA E MVP
link_doc = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Percurso · Links Oficiais dos Protótipos & MVP</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; line-height: 1.6; background: #FBF8F3; color: #1F1D1A; }
    .card { background: white; border: 1px solid #E8E2D5; border-radius: 14px; padding: 32px; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    h1 { font-family: Georgia, serif; font-size: 28px; margin-bottom: 8px; color: #B23528; }
    .badge { display: inline-block; background: #E7F0EB; color: #2E6B47; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; margin-bottom: 20px; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #F0EBE0; }
    li strong { display: block; font-size: 16px; margin-bottom: 4px; }
    a { color: #23527C; font-weight: 600; text-decoration: none; word-break: break-all; }
    a:hover { text-decoration: underline; }
    .meta { font-size: 13px; color: #6B655C; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Inteli MBA IA & Dados · Módulo 3 · Semana 5</span>
    <h1>Percurso · Hub de Acesso aos Protótipos e MVP</h1>
    <p>Grupo 06 · Trilha B (Monitoramento Socioemocional — Instituto Social Ebenézer)</p>
    <hr style="border: none; border-top: 1px solid #E8E2D5; margin: 20px 0;">
    <ul>
      <li>
        <strong>🎨 1. Protótipo Canônico Completo no Figma (27 Telas / 4 Papéis / 153 Conexões)</strong>
        <a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank">https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv</a>
        <div class="meta">O produto canônico de referência máxima. Cubra Educadora, Psicóloga, Coordenação e Diretoria. Sem telas órfãs.</div>
      </li>
      <li>
        <strong>🏛️ 2. Protótipo Semana 5 no Figma (Registro Histórico Congelado · 9 Telas)</strong>
        <a href="https://www.figma.com/proto/HBBd4GyVRjd7C3WgJ4jnpL/Percurso-%E2%80%94-Prot%C3%B3tipo-naveg%C3%A1vel-Semana-5?node-id=2-2" target="_blank">https://www.figma.com/proto/HBBd4GyVRjd7C3WgJ4jnpL/Percurso-%E2%80%94-Prot%C3%B3tipo-naveg%C3%A1vel-Semana-5?node-id=2-2</a>
        <div class="meta">Entregue no marco de 04/09/2026 antes da visita de campo ao Instituto Ebenézer.</div>
      </li>
      <li>
        <strong>🌿 3. Protótipo v3 no Figma (12 Telas · Pós-Visita de Campo com Psicóloga)</strong>
        <a href="https://www.figma.com/proto/JMejpNsHkckqeSP8KE1PTh/Percurso-%E2%80%94-prot%C3%B3tipo-v3-%C2%B7-12-telas--4-pap%C3%A9is?node-id=12-2" target="_blank">https://www.figma.com/proto/JMejpNsHkckqeSP8KE1PTh/Percurso-%E2%80%94-prot%C3%B3tipo-v3-%C2%B7-12-telas--4-pap%C3%A9is?node-id=12-2</a>
        <div class="meta">Com as telas da vivência terapêutica de sábado e integração com WhatsApp/Instagram.</div>
      </li>
      <li>
        <strong>⚡ 4. MVP Funcional Online em Produção (Vercel)</strong>
        <a href="https://percurso-ebenezer.vercel.app" target="_blank">https://percurso-ebenezer.vercel.app</a>
        <div class="meta">Aplicação Node.js nativa completa em execução na web com SQLite, PWA offline e testes integrados.</div>
      </li>
      <li>
        <strong>📖 5. Dossiê Completo da Jornada (HTML Interativo)</strong>
        <a href="https://percurso-ebenezer.vercel.app/dossie.html" target="_blank">https://percurso-ebenezer.vercel.app/dossie.html</a>
        <div class="meta">Documentação editorial unificada contendo todos os prints, ata de validação, auditoria ética e negócios.</div>
      </li>
      <li>
        <strong>📂 6. Pasta Oficial de Entrega no Google Drive</strong>
        <a href="https://drive.google.com/drive/folders/1EXUzWlOF0WK9IaVQlZ6X3hT7E4mZ205J?usp=sharing" target="_blank">https://drive.google.com/drive/folders/1EXUzWlOF0WK9IaVQlZ6X3hT7E4mZ205J?usp=sharing</a>
        <div class="meta">Pasta pública para submissão no portal acadêmico Adalove.</div>
      </li>
    </ul>
  </div>
</body>
</html>
"""
salvar("Link_Prototipo_Figma_Navegavel.html", link_doc)

print("Geração de artefatos de apoio concluída.")
