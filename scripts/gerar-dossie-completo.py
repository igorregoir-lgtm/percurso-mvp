# -*- coding: utf-8 -*-
"""
Gerador do Dossiê Consolidado de Entrega da Semana 5 — Trilha B
MBA em IA e Dados para Negócios · Inteli
Instituto Social Ebenézer · Produto: Percurso
"""
import os
import sys

def gerar_html():
    html_content = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Percurso · Dossiê Consolidado de Entrega — Semana 5 (Trilha B)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,400;1,600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #FBF8F3;
      --card: #FFFFFF;
      --card-alt: #F4EFE6;
      --ink: #1F1D1A;
      --ink-muted: #6B655C;
      --ink-subtle: #968F83;
      --line: #E8E2D5;
      --line-dark: #D4CABE;
      
      --accent-red: #B23528;
      --accent-red-bg: #F7EAE7;
      --accent-green: #2E6B47;
      --accent-green-bg: #E7F0EB;
      --accent-blue: #23527C;
      --accent-blue-bg: #E6EEF5;
      --accent-amber: #8A6414;
      --accent-amber-bg: #F8F1DE;
      --accent-purple: #5A3D68;
      --accent-purple-bg: #F0EAF2;

      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-serif: 'Newsreader', Georgia, serif;
      --font-mono: 'JetBrains Mono', monospace;

      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-pill: 9999px;

      --shadow-sm: 0 2px 8px rgba(31, 29, 26, 0.04);
      --shadow-md: 0 8px 24px rgba(31, 29, 26, 0.07);
      --shadow-lg: 0 16px 40px rgba(31, 29, 26, 0.10);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      scroll-behavior: smooth;
      font-size: 16px;
    }

    body {
      background-color: var(--bg);
      color: var(--ink);
      font-family: var(--font-sans);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* Top Sticky Navigation Bar */
    .nav-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(251, 248, 243, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--line);
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--ink);
    }

    .brand-badge {
      background: var(--accent-red);
      color: white;
      font-weight: 800;
      font-size: 15px;
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      display: grid;
      place-items: center;
      letter-spacing: -0.02em;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .brand-sub {
      font-size: 12px;
      color: var(--ink-muted);
      font-weight: 500;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      white-space: nowrap;
      padding-bottom: 2px;
    }

    .nav-link {
      padding: 6px 14px;
      border-radius: var(--radius-pill);
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-muted);
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .nav-link:hover {
      background: var(--card-alt);
      color: var(--ink);
    }

    .nav-link.active {
      background: var(--ink);
      color: white;
    }

    .nav-cta {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: var(--radius-pill);
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.18s ease;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: var(--accent-red);
      color: white;
      box-shadow: 0 3px 10px rgba(178, 53, 40, 0.25);
    }
    .btn-primary:hover {
      background: #9b2c21;
      transform: translateY(-1px);
    }

    .btn-outline {
      background: white;
      color: var(--ink);
      border-color: var(--line-dark);
    }
    .btn-outline:hover {
      background: var(--card-alt);
      border-color: var(--ink-muted);
    }

    .btn-demo {
      background: var(--accent-green);
      color: white;
      box-shadow: 0 3px 10px rgba(46, 107, 71, 0.25);
    }
    .btn-demo:hover {
      background: #25583a;
      transform: translateY(-1px);
    }

    /* Layout Containers */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    /* Header Banner */
    .hero-banner {
      background: linear-gradient(135deg, #1F1D1A 0%, #2A2521 100%);
      color: #FBF8F3;
      border-radius: var(--radius-lg);
      padding: 56px 48px;
      margin-bottom: 48px;
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow-lg);
    }

    .hero-banner::after {
      content: "";
      position: absolute;
      top: -40%;
      right: -10%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(178, 53, 40, 0.22) 0%, rgba(178, 53, 40, 0) 70%);
      pointer-events: none;
    }

    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-bottom: 24px;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: var(--radius-pill);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .badge-inteli {
      background: rgba(255, 255, 255, 0.12);
      color: #FBF8F3;
      border: 1px solid rgba(255, 255, 255, 0.18);
    }

    .badge-status {
      background: var(--accent-green);
      color: white;
    }

    .badge-trilha {
      background: var(--accent-red);
      color: white;
    }

    .hero-title {
      font-family: var(--font-serif);
      font-size: 48px;
      line-height: 1.15;
      font-weight: 600;
      margin-bottom: 18px;
      letter-spacing: -0.02em;
    }

    .hero-lead {
      font-size: 19px;
      line-height: 1.5;
      color: #D4CABE;
      max-width: 860px;
      margin-bottom: 36px;
      font-weight: 400;
    }

    .hero-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 32px;
    }

    .hero-stat-box {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-md);
      padding: 18px 22px;
    }

    .stat-num {
      font-size: 28px;
      font-weight: 800;
      color: #FFFFFF;
      font-family: var(--font-mono);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 13px;
      color: #BDB4A5;
      font-weight: 500;
      margin-top: 4px;
    }

    .stat-sub {
      font-size: 11px;
      color: #8C8375;
      margin-top: 2px;
    }

    /* Section Headers */
    .section-block {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 48px;
      margin-bottom: 40px;
      box-shadow: var(--shadow-sm);
    }

    .section-header {
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--card-alt);
    }

    .section-eyebrow {
      font-size: 12px;
      font-weight: 800;
      color: var(--accent-red);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-eyebrow::before {
      content: "";
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-red);
    }

    .section-title {
      font-family: var(--font-serif);
      font-size: 36px;
      line-height: 1.2;
      color: var(--ink);
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .section-desc {
      font-size: 16px;
      color: var(--ink-muted);
      margin-top: 10px;
      max-width: 880px;
      line-height: 1.55;
    }

    /* Editorial Prose */
    .prose p {
      margin-bottom: 18px;
      font-size: 15.5px;
      line-height: 1.68;
      color: #2D2A26;
    }

    .prose strong {
      color: var(--ink);
      font-weight: 700;
    }

    .prose blockquote {
      border-left: 4px solid var(--accent-red);
      background: var(--accent-red-bg);
      padding: 18px 24px;
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
      margin: 24px 0;
      font-style: italic;
      font-family: var(--font-serif);
      font-size: 18px;
      color: #4A1B16;
      line-height: 1.5;
    }

    .prose blockquote cite {
      display: block;
      font-family: var(--font-sans);
      font-size: 12px;
      font-style: normal;
      font-weight: 700;
      color: var(--accent-red);
      margin-top: 8px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* Figma Artifact Cards */
    .figma-artifact {
      background: var(--bg);
      border: 1px solid var(--line-dark);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin: 32px 0;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;
    }

    .figma-artifact:hover {
      box-shadow: var(--shadow-md);
      border-color: #BDB4A5;
    }

    .artifact-header {
      padding: 20px 24px;
      background: white;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .artifact-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .step-number {
      background: var(--ink);
      color: white;
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 700;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .artifact-name {
      font-size: 18px;
      font-weight: 700;
      color: var(--ink);
      letter-spacing: -0.01em;
    }

    .artifact-meta {
      font-size: 12px;
      color: var(--ink-muted);
      font-weight: 500;
    }

    .artifact-body {
      padding: 24px;
    }

    .artifact-narrative {
      font-size: 15px;
      color: var(--ink);
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .artifact-image-wrap {
      background: #ECE6DA;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--line);
      text-align: center;
      position: relative;
    }

    .artifact-image-wrap img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    }

    .artifact-footer {
      padding: 16px 24px;
      background: white;
      border-top: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
    }

    .figma-link-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--accent-blue);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      background: var(--accent-blue-bg);
      padding: 7px 16px;
      border-radius: var(--radius-pill);
      border: 1px solid rgba(35, 82, 124, 0.2);
      transition: all 0.15s ease;
    }

    .figma-link-pill:hover {
      background: #d6e4ef;
      transform: translateY(-1px);
    }

    .figma-icon {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }

    /* Grid of screens */
    .screens-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .screen-card {
      background: white;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
    }

    .screen-card-img {
      background: #f0ebe1;
      padding: 12px;
      text-align: center;
      border-bottom: 1px solid var(--line);
    }

    .screen-card-img img {
      width: 100%;
      max-width: 240px;
      height: auto;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: block;
      margin: 0 auto;
    }

    .screen-card-info {
      padding: 14px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .screen-card-tag {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--accent-red);
      font-weight: 700;
      text-transform: uppercase;
    }

    .screen-card-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      margin: 4px 0 8px;
    }

    .screen-card-desc {
      font-size: 12px;
      color: var(--ink-muted);
      line-height: 1.45;
    }

    /* Comparison Table (AS-IS vs TO-BE) */
    .table-responsive {
      overflow-x: auto;
      margin: 24px 0;
      border-radius: var(--radius-md);
      border: 1px solid var(--line);
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      text-align: left;
      font-size: 14px;
    }

    table.data-table th {
      background: var(--card-alt);
      color: var(--ink);
      font-weight: 700;
      padding: 14px 18px;
      border-bottom: 2px solid var(--line-dark);
      font-size: 13px;
      letter-spacing: 0.02em;
    }

    table.data-table td {
      padding: 14px 18px;
      border-bottom: 1px solid var(--line);
      color: #2D2A26;
      vertical-align: top;
      line-height: 1.5;
    }

    table.data-table tr:hover td {
      background: #FCFAF6;
    }

    .badge-tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: var(--radius-pill);
      font-size: 11px;
      font-weight: 700;
    }

    .badge-asis {
      background: #FDF1EE;
      color: #A32D21;
      border: 1px solid #F3C3BC;
    }

    .badge-tobe {
      background: #EDF7F1;
      color: #246B43;
      border: 1px solid #B8E4C9;
    }

    /* Audit Alert Callouts */
    .callout {
      border-radius: var(--radius-md);
      padding: 22px 26px;
      margin: 24px 0;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      line-height: 1.55;
    }

    .callout-success {
      background: var(--accent-green-bg);
      border: 1px solid rgba(46, 107, 71, 0.25);
      color: #173B25;
    }

    .callout-warning {
      background: var(--accent-amber-bg);
      border: 1px solid rgba(138, 100, 20, 0.25);
      color: #4C370B;
    }

    .callout-info {
      background: var(--accent-blue-bg);
      border: 1px solid rgba(35, 82, 124, 0.25);
      color: #163654;
    }

    .callout-danger {
      background: var(--accent-red-bg);
      border: 1px solid rgba(178, 53, 40, 0.25);
      color: #4A1B16;
    }

    .callout-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .callout-content h4 {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .callout-content p {
      font-size: 13.5px;
      margin-bottom: 6px;
    }

    /* Lean Canvas 9 Blocks */
    .lean-canvas-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-template-rows: auto auto;
      gap: 12px;
      margin: 28px 0;
    }

    .canvas-block {
      background: white;
      border: 1px solid var(--line-dark);
      border-radius: var(--radius-sm);
      padding: 16px;
      display: flex;
      flex-direction: column;
      min-height: 190px;
      box-shadow: var(--shadow-sm);
    }

    .canvas-block-title {
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent-red);
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--line);
    }

    .canvas-block-body {
      font-size: 12.5px;
      line-height: 1.45;
      color: var(--ink);
      flex-grow: 1;
    }

    .canvas-block-body ul {
      padding-left: 16px;
      margin: 6px 0;
    }

    .canvas-span-2 {
      grid-column: span 2;
    }

    .canvas-span-2-row {
      grid-row: span 2;
    }

    /* Persona Cards */
    .persona-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      margin: 28px 0;
    }

    .persona-card {
      background: white;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
    }

    .persona-card-header {
      background: var(--card-alt);
      padding: 20px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .persona-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--ink);
      color: white;
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 20px;
      flex-shrink: 0;
      border: 2px solid white;
      box-shadow: var(--shadow-sm);
    }

    .persona-name {
      font-size: 17px;
      font-weight: 700;
      color: var(--ink);
    }

    .persona-role {
      font-size: 13px;
      color: var(--accent-red);
      font-weight: 600;
    }

    .persona-card-body {
      padding: 20px;
      font-size: 13.5px;
      line-height: 1.5;
      color: #333;
    }

    .persona-quote {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 15px;
      color: var(--ink);
      border-left: 3px solid var(--accent-red);
      padding-left: 12px;
      margin: 12px 0;
    }

    /* Code Snippet */
    .code-box {
      background: #1A1917;
      color: #E6E1D8;
      font-family: var(--font-mono);
      font-size: 12.5px;
      padding: 20px;
      border-radius: var(--radius-md);
      overflow-x: auto;
      margin: 20px 0;
      line-height: 1.55;
    }

    /* Footer */
    .footer {
      border-top: 1px solid var(--line);
      padding-top: 40px;
      margin-top: 80px;
      text-align: center;
      color: var(--ink-muted);
      font-size: 13px;
    }

    @media (max-width: 900px) {
      .hero-title { font-size: 36px; }
      .section-block { padding: 28px 20px; }
      .lean-canvas-grid { grid-template-columns: 1fr; }
      .canvas-span-2, .canvas-span-2-row { grid-column: auto; grid-row: auto; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>

  <!-- Top Sticky Bar -->
  <header class="nav-bar">
    <a href="#inicio" class="nav-brand">
      <div class="brand-badge">P</div>
      <div>
        <div class="brand-title">Percurso · Trilha B</div>
        <div class="brand-sub">Inteli MBA IA & Dados · Módulo 3 · Semana 5</div>
      </div>
    </a>

    <nav class="nav-links">
      <a href="#jornada-pedagogica" class="nav-link">Jornada Pedagógica</a>
      <a href="#negocios" class="nav-link">Dossiê de Negócios</a>
      <a href="#tecnologia" class="nav-link">Dossiê de Tecnologia</a>
      <a href="#campo" class="nav-link">Visita & Validação</a>
      <a href="#auditoria-etica" class="nav-link">Auditoria Ética</a>
      <a href="#mvp-funcional" class="nav-link">MVP & WhatsApp</a>
      <a href="#entrega-drive" class="nav-link">Google Drive & Adalove</a>
    </nav>

    <div class="nav-cta">
      <a href="https://percurso-ebenezer.vercel.app" target="_blank" class="btn btn-demo">
        <span>🚀 Ver MVP Online</span>
      </a>
      <a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="btn btn-primary">
        <span>🎨 Protótipo Canônico Figma</span>
      </a>
    </div>
  </header>

  <main class="container" id="inicio">

    <!-- Hero Banner -->
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
        <div class="hero-stat-box">
          <div class="stat-num">27 Telas</div>
          <div class="stat-label">Protótipo Canônico Figma</div>
          <div class="stat-sub">153 ligações interativas sem telas órfãs</div>
        </div>
        <div class="hero-stat-box">
          <div class="stat-num">4 Papéis</div>
          <div class="stat-label">Navegação por Perfil Real</div>
          <div class="stat-sub">Educadora, Psicóloga, Coordenação e Diretoria</div>
        </div>
        <div class="hero-stat-box">
          <div class="stat-num">100% Sintético</div>
          <div class="stat-label">Privacidade & Conformidade</div>
          <div class="stat-sub">Códigos C001..C106 · Sigilo LGPD Art. 14</div>
        </div>
        <div class="hero-stat-box">
          <div class="stat-num">R$ 0 / Mês</div>
          <div class="stat-label">Sobrevivência Pós-Semana 10</div>
          <div class="stat-sub">Node + SQLite local sem equipe de TI</div>
        </div>
      </div>
    </div>

    <!-- Quick Access Hub -->
    <div class="callout callout-info" style="margin-bottom: 40px;">
      <div class="callout-icon">📍</div>
      <div class="callout-content">
        <h4>Acesso Imediato aos Artefatos Oficiais</h4>
        <p>
          Este documento consolida em formato HTML a narrativa pedagógica completa, as evidências visuais de cada rascunho do Figma, 
          o Dossiê de Negócios, o Dossiê de Tecnologia e o MVP Funcional implantado em produção.
        </p>
        <div style="margin-top: 10px; display: flex; gap: 12px; flex-wrap: wrap;">
          <a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="figma-link-pill">
            🎨 Protótipo Canônico (27 Telas / 4 Papéis)
          </a>
          <a href="https://www.figma.com/design/HBBd4GyVRjd7C3WgJ4jnpL" target="_blank" class="figma-link-pill">
            🏛️ Protótipo Semana 5 Congelado (Histórico)
          </a>
          <a href="https://percurso-ebenezer.vercel.app" target="_blank" class="figma-link-pill" style="color: var(--accent-green); background: var(--accent-green-bg); border-color: rgba(46,107,71,0.3);">
            ⚡ Aplicação Web Funcional na Vercel
          </a>
          <a href="https://drive.google.com/drive/folders/1EXUzWlOF0WK9IaVQlZ6X3hT7E4mZ205J?usp=sharing" target="_blank" class="figma-link-pill" style="color: var(--accent-amber); background: var(--accent-amber-bg); border-color: rgba(138,100,20,0.3);">
            📂 Pasta de Entrega no Google Drive
          </a>
        </div>
      </div>
    </div>

    <!-- SECTION 1: JORNADA PEDAGÓGICA -->
    <section class="section-block" id="jornada-pedagogica">
      <div class="section-header">
        <div class="section-eyebrow">Etapas Pedagógicas da Formação</div>
        <h2 class="section-title">A Jornada Pedagógica & Os Favoritos do Figma</h2>
        <p class="section-desc">
          A narrativa cronológica de como a solução foi construída ao longo dos encontros com a Profª. Bruna Mayer, 
          desde a descoberta do problema na garagem adaptada até o protótipo de alta fidelidade e validação de campo.
        </p>
      </div>

      <div class="prose">
        <p>
          O projeto do <strong>Percurso</strong> nasceu dentro do desafio da <strong>Trilha B</strong>: 
          <em>como medir e comprovar o impacto socioemocional em uma organização comunitária sem tirar a atenção dos educadores e sem gerar custos inviáveis?</em>
          A seguir, percorremos os 10 marcos estruturais refletidos nos rascunhos e boards favoritados no Figma.
        </p>
      </div>

      <!-- MARCO 1: DISCOVERY CANVAS -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">01</div>
            <div>
              <div class="artifact-name">Project Discovery Canvas & Diagnóstico da Organização</div>
              <div class="artifact-meta">Imersão de Problema, Stakeholders e Processo AS-IS · FigJam</div>
            </div>
          </div>
          <a href="https://www.figma.com/board/Zg3dZaENAUq3I3WpOY3a5H/PROJECT-DISCOVERY-CANVAS-%E2%80%94-INSTITUTO-EBEN%C3%89ZER" target="_blank" class="figma-link-pill">
            Abrir Board no Figma ↗
          </a>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p>
              Na primeira etapa conduzida em sala de aula, mapeamos o ecossistema do Instituto Social Ebenézer. 
              Identificamos que a entidade opera com apenas <strong>duas pessoas fixas</strong> (o líder Wellington e uma pedagoga), 
              voluntários no sábado e atende cerca de 120 crianças da comunidade em contraturno escolar.
            </p>
            <p>
              A dor fulcral emergiu com clareza: a instituição mede frequência diária em planilhas e desempenho escolar pelo parceiro Alicerce, 
              mas a <strong>transformação socioemocional</strong> (mudança de postura, autoconfiança, superação de traumas) ficava restrita à memória dos educadores.
            </p>
          </div>

          <div class="screens-grid">
            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/discovery_01_organizacao.png" alt="Conheça a Organização">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Seção 01</div>
                <div class="screen-card-title">A Organização & Propósito</div>
                <div class="screen-card-desc">Estrutura comunitária, história na favela do Jardim Keralux e missão preventiva com as famílias.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/discovery_03_stakeholders.png" alt="Mapa de Stakeholders">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Seção 03</div>
                <div class="screen-card-title">Mapa de Stakeholders</div>
                <div class="screen-card-desc">Crianças, educadoras, psicóloga, líderes comunitários, conselho tutelar e financiadores corporativos.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/discovery_05_processo_asis.png" alt="Processo AS-IS">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Seção 05</div>
                <div class="screen-card-title">Processo Atual (As-Is)</div>
                <div class="screen-card-desc">O abismo do registro: a conversa morre no corredor e o relatório anual é feito apenas com adjetivos.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/discovery_09_priorizacao.png" alt="Matriz de Priorização">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Seção 09</div>
                <div class="screen-card-title">Matriz de Priorização</div>
                <div class="screen-card-desc">Definição do escopo essencial (MVP): observação rápida por rubricas e chamada em um toque.</div>
              </div>
            </div>
          </div>
        </div>
        <div class="artifact-footer">
          <span style="font-size: 13px; color: var(--ink-muted);">Board Original de Discovery: <code>Zg3dZaENAUq3I3WpOY3a5H</code></span>
          <a href="https://www.figma.com/board/Zg3dZaENAUq3I3WpOY3a5H/PROJECT-DISCOVERY-CANVAS-%E2%80%94-INSTITUTO-EBEN%C3%89ZER" target="_blank" class="figma-link-pill">
            Acessar no Figma ↗
          </a>
        </div>
      </div>

      <!-- MARCO 2: EXERCÍCIO DE PERSONAS -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">02</div>
            <div>
              <div class="artifact-name">Exercício de Personas & Empatia</div>
              <div class="artifact-name" style="font-size: 13px; font-weight: 500; color: var(--ink-muted);">Mapeamento de Maria Silvia, Líder Wellington e Elenco · Figma Design</div>
            </div>
          </div>
          <a href="https://www.figma.com/design/PnLTlp1UR1o3m1fdnWDUlz/Exercicio-Personas" target="_blank" class="figma-link-pill">
            Abrir Board no Figma ↗
          </a>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p>
              Durante a dinâmica de personas da Profª. Bruna Mayer, construímos as personas centrais com base em relatos reais. 
              A persona de <strong>Maria Silvia</strong> (35 anos, pedagoga do reforço escolar) sintetizou a tensão essencial: 
              a dedicação apaixonada pelas crianças versus a incapacidade de produzir registros comprobatórios sem perder o foco na sala.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1.6fr; gap: 20px; align-items: start;">
            <div class="artifact-image-wrap">
              <img src="figma_images/persona_maria_silvia.png" alt="Persona Maria Silvia">
            </div>
            <div class="artifact-image-wrap">
              <img src="figma_images/personas_board_overview.png" alt="Visão Geral do Board de Personas">
            </div>
          </div>

          <div class="prose" style="margin-top: 18px;">
            <blockquote>
              "Não consigo transformar em dados os resultados do meu trabalho... e minha maior preocupação é nunca expor as crianças."
              <cite>— Maria Silvia, Pedagoga do Reforço Escolar</cite>
            </blockquote>
          </div>
        </div>
        <div class="artifact-footer">
          <span style="font-size: 13px; color: var(--ink-muted);">Arquivo de Design: <code>PnLTlp1UR1o3m1fdnWDUlz</code> · Frame #1:350</span>
          <a href="https://www.figma.com/design/PnLTlp1UR1o3m1fdnWDUlz/Exercicio-Personas" target="_blank" class="figma-link-pill">
            Acessar no Figma ↗
          </a>
        </div>
      </div>

      <!-- MARCO 3: STORYBOARD DA MARIA -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">03</div>
            <div>
              <div class="artifact-name">Storyboard: A Tarde da Maria</div>
              <div class="artifact-name" style="font-size: 13px; font-weight: 500; color: var(--ink-muted);">Visual Storytelling da Rotina e Alívio de Fricção · Figma Design / Proto</div>
            </div>
          </div>
          <a href="https://www.figma.com/proto/FpSSqLEKxdcVnSicN2nlyB/Percurso-%C2%B7-Storyboard-da-Maria-%C2%B7-Trilha-B?node-id=0-1" target="_blank" class="figma-link-pill">
            Executar Modo Protótipo ↗
          </a>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p>
              O Storyboard traduz em quadrinhos a jornada emocional de Maria Silvia. Mostra o início da tarde com o acolhimento das turmas, 
              o esforço para mediar conflitos na leitura, o momento de revelação em que uma criança vence uma trava de comunicação, 
              e a posterior frustração ao perceber que não haverá tempo para registrar esse avanço. 
              O Percurso surge como o instrumento libertador: uma gravação contextual de 40 segundos e uma rubrica ágil de 3 minutos.
            </p>
          </div>

          <div class="artifact-image-wrap" style="max-height: 520px; overflow-y: auto;">
            <img src="figma_images/storyboard_maria.png" alt="Storyboard A Tarde da Maria">
          </div>
        </div>
        <div class="artifact-footer">
          <span style="font-size: 13px; color: var(--ink-muted);">Arquivo: <code>FpSSqLEKxdcVnSicN2nlyB</code></span>
          <div style="display: flex; gap: 10px;">
            <a href="https://www.figma.com/design/FpSSqLEKxdcVnSicN2nlyB/Percurso-%C2%B7-Storyboard-da-Maria-%C2%B7-Trilha-B" target="_blank" class="figma-link-pill">
              Design Mode ↗
            </a>
            <a href="https://www.figma.com/proto/FpSSqLEKxdcVnSicN2nlyB/Percurso-%C2%B7-Storyboard-da-Maria-%C2%B7-Trilha-B?node-id=0-1" target="_blank" class="figma-link-pill">
              Prototype Mode ↗
            </a>
          </div>
        </div>
      </div>

      <!-- MARCO 4: JORNADA DO USUÁRIO GRUPO 06 -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">04</div>
            <div>
              <div class="artifact-name">Jornada do Usuário Nativa (AS-IS vs. TO-BE)</div>
              <div class="artifact-name" style="font-size: 13px; font-weight: 500; color: var(--ink-muted);">FigJam Nativo do Grupo 06 · 6 Fases & 8 Momentos da Verdade</div>
            </div>
          </div>
          <a href="https://www.figma.com/board/QSzxKH22Hnevnhw7HluW6m/Jornada-de-Usu%C3%A1rio-%E2%80%94-Instituto-Eben%C3%A9zer--Grupo-06-" target="_blank" class="figma-link-pill">
            Abrir no FigJam ↗
          </a>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p>
              Mapeamento completo dos pontos de contato, estados emocionais, canais e dores nas 6 etapas do ciclo pedagógico: 
              <em>Observar</em>, <em>Registrar Presença</em>, <em>Contar o Dia</em>, <em>Perceber Ausência</em>, <em>Provar Evolução</em> e <em>Receber Devolutiva</em>.
            </p>
          </div>

          <div class="artifact-image-wrap">
            <img src="figma_images/jornada_usuario_figjam.png" alt="Jornada de Usuário FigJam Grupo 06">
          </div>
        </div>
        <div class="artifact-footer">
          <span style="font-size: 13px; color: var(--ink-muted);">Board FigJam: <code>QSzxKH22Hnevnhw7HluW6m</code> (Link da Turma: <code>fL1rxchBDlNkQZO7AEjwrf</code>)</span>
          <a href="https://www.figma.com/board/QSzxKH22Hnevnhw7HluW6m/Jornada-de-Usu%C3%A1rio-%E2%80%94-Instituto-Eben%C3%A9zer--Grupo-06-" target="_blank" class="figma-link-pill">
            Acessar FigJam ↗
          </a>
        </div>
      </div>

      <!-- MARCO 5: WIREFRAME E TASK FLOW -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">05</div>
            <div>
              <div class="artifact-name">Wireframe & Task Flow com Decisões (Exercício 03)</div>
              <div class="artifact-name" style="font-size: 13px; font-weight: 500; color: var(--ink-muted);">Mapeamento do Fluxo da US-6 com Setas, Decisões e Teste de Observação</div>
            </div>
          </div>
          <a href="https://www.figma.com/board/4q6n3WBQmtpgWDvO0YAofa/Wire-frame" target="_blank" class="figma-link-pill">
            Abrir Board no Figma ↗
          </a>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p>
              O diagrama de Task Flow detalha o fluxo operacional da profissional ao registrar um encontro: 
              gatilho na tela inicial &rarr; conferência da chamada rápida &rarr; fala do dia (~40s) &rarr; extração assistida por IA local 
              &rarr; <strong>nó de decisão e conferência humana obrigatória</strong> &rarr; aprovação do relato sem identificação nominal 
              &rarr; despacho do recado coletivo para os canais de contato.
            </p>
          </div>

          <div class="artifact-image-wrap">
            <img src="figma_images/task_flow_percurso.png" alt="Task Flow do Percurso Grupo 06">
          </div>
        </div>
        <div class="artifact-footer">
          <span style="font-size: 13px; color: var(--ink-muted);">Board: <code>4q6n3WBQmtpgWDvO0YAofa</code> · Task Flow Nativo</span>
          <a href="https://www.figma.com/board/4q6n3WBQmtpgWDvO0YAofa/Wire-frame" target="_blank" class="figma-link-pill">
            Acessar no Figma ↗
          </a>
        </div>
      </div>

      <!-- MARCO 6: EXERCÍCIO PROTOTYPE CONNECTION MCP -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">06</div>
            <div>
              <div class="artifact-name">Exercício: Prototype Connection via MCP</div>
              <div class="artifact-name" style="font-size: 13px; font-weight: 500; color: var(--ink-muted);">Laboratório de Conexões de Interação, Modais e Overlays · Figma Design</div>
            </div>
          </div>
          <a href="https://www.figma.com/design/XGml124TYVKFVufs6j9fiE/Exerc%C3%ADcio-%E2%80%94-Prototype-Connection-via-MCP" target="_blank" class="figma-link-pill">
            Abrir no Figma ↗
          </a>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p>
              Exercício prático focado em garantir consistência e rastreabilidade nas conexões do protótipo no Figma. 
              Aqui ensaiamos a mecânica de transição de telas, passagem de contexto e confirmação por overlays antes de expandir para o artefato completo.
            </p>
          </div>

          <div class="screens-grid">
            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/exercicio_mcp_tela1.png" alt="Tela 1 Início">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #1:2</div>
                <div class="screen-card-title">Tela 1 · Início</div>
                <div class="screen-card-desc">Gatilho de ação principal com navegação direta para fluxo detalhado.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/exercicio_mcp_tela2.png" alt="Tela 2 Detalhe">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #1:11</div>
                <div class="screen-card-title">Tela 2 · Detalhe</div>
                <div class="screen-card-desc">Exibição contextual e formulário de validação das variáveis.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/exercicio_mcp_overlay.png" alt="Overlay Aviso">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #2:12</div>
                <div class="screen-card-title">Overlay · Confirmação</div>
                <div class="screen-card-desc">Modal flutuante de alerta e consentimento com bloqueio de backdrop.</div>
              </div>
            </div>
          </div>
        </div>
        <div class="artifact-footer">
          <span style="font-size: 13px; color: var(--ink-muted);">Arquivo: <code>XGml124TYVKFVufs6j9fiE</code></span>
          <a href="https://www.figma.com/design/XGml124TYVKFVufs6j9fiE/Exerc%C3%ADcio-%E2%80%94-Prototype-Connection-via-MCP" target="_blank" class="figma-link-pill">
            Acessar no Figma ↗
          </a>
        </div>
      </div>

      <!-- MARCO 7: PROTÓTIPO SEMANA 5 CONGELADO -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">07</div>
            <div>
              <div class="artifact-name">Protótipo Semana 5 (Registro Histórico Congelado)</div>
              <div class="artifact-name" style="font-size: 13px; font-weight: 500; color: var(--ink-muted);">9 Telas · 375×812 pt · 12 Ligações de Clique · 2 Papéis Originais</div>
            </div>
          </div>
          <a href="https://www.figma.com/proto/HBBd4GyVRjd7C3WgJ4jnpL/Percurso-%E2%80%94-Prot%C3%B3tipo-naveg%C3%A1vel-Semana-5?node-id=2-2" target="_blank" class="figma-link-pill">
            Navegar Protótipo Semana 5 ↗
          </a>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p>
              Este é o artefato entregue no marco da <strong>Semana 5 (04/09/2026)</strong>. Ele foi <strong>congelado</strong> 
              propositalmente como documento histórico para atestar o que foi desenvolvido antes da visita de campo ao Instituto. 
              Apresenta 9 telas contínuas navegáveis, cobrindo o fluxo de Educadora e Coordenação.
            </p>
          </div>

          <div class="screens-grid">
            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/semana5_01_entrar.png" alt="Tela Entrar">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #2:2 · Ponto de Partida</div>
                <div class="screen-card-title">01 · Entrar</div>
                <div class="screen-card-desc">Identificação dos perfis de Educadora (Cleide) e Coordenação (Solange).</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/semana5_02_hoje.png" alt="Tela Hoje">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #5:2 · US-3</div>
                <div class="screen-card-title">02 · Hoje & Alertas</div>
                <div class="screen-card-desc">Alerta ativo de ausências consecutivas para busca ativa antecipada.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/semana5_03_chamada.png" alt="Tela Chamada">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #5:39 · F2</div>
                <div class="screen-card-title">03 · Chamada em 1 Toque</div>
                <div class="screen-card-desc">Marcação ultra-rápida de presença que alimenta a régua de frequência.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/semana5_04_ciclo.png" alt="Tela Ciclo">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #7:2 · US-1</div>
                <div class="screen-card-title">04 · Agenda do Ciclo</div>
                <div class="screen-card-desc">Distribuição das observações no tempo; bloqueio por falta de convívio mínimo.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/semana5_05_observacao.png" alt="Tela Observação">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #7:51 · US-1</div>
                <div class="screen-card-title">05 · Rubrica de Âncoras</div>
                <div class="screen-card-desc">Avaliação comportamental estruturada (~3 min por criança) sem texto livre sensível.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/semana5_06_turma.png" alt="Tela Turma">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #8:2 · US-2</div>
                <div class="screen-card-title">06 · Evolução da Turma</div>
                <div class="screen-card-desc">Comparação gráfica entre ciclos: médias de convivência, autonomia e expressão.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/semana5_07_consentimentos.png" alt="Tela Consentimentos">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #8:71 · US-5</div>
                <div class="screen-card-title">07 · Consentimentos LGPD</div>
                <div class="screen-card-desc">Gestão dos termos de consentimento Art. 14; bloqueio automático no sistema.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/semana5_08_painel.png" alt="Tela Painel">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #9:2 · US-4</div>
                <div class="screen-card-title">08 · Painel da Coordenação</div>
                <div class="screen-card-desc">Visão macro de cobertura de dados, safras e indicadores institucionais.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/semana5_09_sintese.png" alt="Tela Síntese">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #9:56 · US-4</div>
                <div class="screen-card-title">09 · Síntese de Ciclo</div>
                <div class="screen-card-desc">Redação assistida para prestação de contas com revisão e aprovação humana.</div>
              </div>
            </div>
          </div>
        </div>
        <div class="artifact-footer">
          <span style="font-size: 13px; color: var(--ink-muted);">Arquivo Congelado: <code>HBBd4GyVRjd7C3WgJ4jnpL</code></span>
          <div style="display: flex; gap: 10px;">
            <a href="https://www.figma.com/design/HBBd4GyVRjd7C3WgJ4jnpL/Percurso-%E2%80%94-Prot%C3%B3tipo-naveg%C3%A1vel--Semana-5-" target="_blank" class="figma-link-pill">
              Design View ↗
            </a>
            <a href="https://www.figma.com/proto/HBBd4GyVRjd7C3WgJ4jnpL/Percurso-%E2%80%94-Prot%C3%B3tipo-naveg%C3%A1vel-Semana-5?node-id=2-2" target="_blank" class="figma-link-pill">
              Prototype View ↗
            </a>
          </div>
        </div>
      </div>

      <!-- MARCO 8: PROTÓTIPO V3 PÓS-VISITA -->
      <div class="figma-artifact">
        <div class="artifact-header">
          <div class="artifact-title-group">
            <div class="step-number">08</div>
            <div>
              <div class="artifact-name">Protótipo v3 (12 Telas · 4 Papéis · Pós-Visita de Campo)</div>
              <div class="artifact-name" style="font-size: 13px; font-weight: 500; color: var(--ink-muted);">A Inclusão da Psicóloga, Telas de Vivência e Divulgação WhatsApp/Instagram</div>
            </div>
          </div>
          <a href="https://www.figma.com/proto/JMejpNsHkckqeSP8KE1PTh/Percurso-%E2%80%94-prot%C3%B3tipo-v3-%C2%B7-12-telas--4-pap%C3%A9is?node-id=12-2" target="_blank" class="figma-link-pill">
            Navegar Protótipo v3 ↗
          </a>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p>
              Após a visita presencial ao Instituto em 29/08/2026, atualizamos a arquitetura. 
              Descobrimos que a <strong>psicóloga voluntária</strong> é o coração do registro no sábado, 
              que os dados reais utilizavam <strong>6 dimensões comportamentais</strong> da planilha do Instituto 
              e que a instituição necessitava urgentemente de um mecanismo para preparar devolutivas para grupos de WhatsApp e cards para o Instagram.
            </p>
          </div>

          <div class="screens-grid">
            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/v3_01_psicologa_hoje.png" alt="Psicóloga Hoje">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #3:2</div>
                <div class="screen-card-title">Psicóloga · Painel Hoje</div>
                <div class="screen-card-desc">Entrada dedicada para a vivência terapêutica de sábado com captura prioritária.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/v3_02_registrar_captura.png" alt="Registrar Captura">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #5:2</div>
                <div class="screen-card-title">Captura Rápida de Vivência</div>
                <div class="screen-card-desc">Check-in em lista fechada (participação, resolução de conflitos, cooperação).</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/v3_03_sai_daqui_relato.png" alt="Sai Daqui Relato">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #7:2</div>
                <div class="screen-card-title">Sai Daqui · Relato do Conselho</div>
                <div class="screen-card-desc">Geração automática no padrão do CRP sem nomes de crianças + recado da turma.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/v3_04_painel_coordenacao.png" alt="Painel Coordenação">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #10:2</div>
                <div class="screen-card-title">Coordenação · Painel Unificado</div>
                <div class="screen-card-desc">Agregação por safras, scores médios e acompanhamento da permanência de 75%.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/v3_05_relatorio_diretoria.png" alt="Relatório Diretoria">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #10:53</div>
                <div class="screen-card-title">Diretoria · Impacto & SROI</div>
                <div class="screen-card-desc">Visualização agregada para investidores sem acesso a dados individuais de crianças.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/v3_06_divulgar_whatsapp.png" alt="Divulgar WhatsApp">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #100:2 · Decisão 47</div>
                <div class="screen-card-title">Divulgar · WhatsApp Oficial</div>
                <div class="screen-card-desc">Preparação do recado agregado da turma com link wa.me e envio individual 1-para-1.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/v3_07_divulgar_instagram.png" alt="Divulgar Instagram">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Frame #100:47 · Decisão 48</div>
                <div class="screen-card-title">Divulgar · Card do Instagram</div>
                <div class="screen-card-desc">Geração de cards visuais com métricas de impacto do período para captação institucional.</div>
              </div>
            </div>
          </div>
        </div>
        <div class="artifact-footer">
          <span style="font-size: 13px; color: var(--ink-muted);">Arquivo: <code>JMejpNsHkckqeSP8KE1PTh</code></span>
          <a href="https://www.figma.com/proto/JMejpNsHkckqeSP8KE1PTh/Percurso-%E2%80%94-prot%C3%B3tipo-v3-%C2%B7-12-telas--4-pap%C3%A9is?node-id=12-2" target="_blank" class="figma-link-pill">
            Acessar no Figma ↗
          </a>
        </div>
      </div>

      <!-- MARCO 9: PROTÓTIPO CANÔNICO COMPLETO 27 TELAS -->
      <div class="figma-artifact" style="border: 2px solid var(--accent-red);">
        <div class="artifact-header" style="background: var(--accent-red-bg);">
          <div class="artifact-title-group">
            <div class="step-number" style="background: var(--accent-red);">09</div>
            <div>
              <div class="artifact-name" style="color: var(--accent-red);">Protótipo Canônico Completo (27 Telas · 153 Conexões)</div>
              <div class="artifact-name" style="font-size: 13px; font-weight: 600; color: #781F15;">O Artefato de Referência Máxima · 4 Papéis Independentes · 402×874 pt</div>
            </div>
          </div>
          <a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="btn btn-primary">
            Abrir Canônico no Figma ↗
          </a>
        </div>
        <div class="artifact-body">
          <div class="artifact-narrative">
            <p>
              O <strong>protótipo canônico</strong> consolida a totalidade da experiência do produto <em>Percurso</em>. 
              Organizado em 4 faixas de navegação independentes (uma para cada perfil de usuário real no Instituto), 
              possui <strong>153 conexões ativas</strong> no Figma, garantindo que <strong>nenhuma tela é órfã e nenhum fluxo tem becos sem saída</strong>.
            </p>
          </div>

          <h4 style="font-size: 15px; font-weight: 700; margin: 18px 0 10px;">As 4 Faixas por Papel no Protótipo Canônico</h4>
          <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
            <div style="background: white; border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px;">
              <strong style="color: var(--ink);">Faixa 1 · Educadora (Maria Silvia):</strong> 9 telas cobrindo <code>#/hoje</code>, chamada em 1 toque, agenda de ciclo, rubrica de 6 dimensões, pauta de segunda, evolução de turma e reflexão.
            </div>
            <div style="background: white; border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px;">
              <strong style="color: var(--ink);">Faixa 2 · Psicóloga (Carolina Duarte):</strong> 8 telas cobrindo vivência de sábado, chamada, gravação de áudio com transcrição local, conferência humana, relato para o conselho e parecer anonimizado.
            </div>
            <div style="background: white; border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px;">
              <strong style="color: var(--ink);">Faixa 3 · Coordenação (Rita Amaral):</strong> 6 telas de acompanhamento institucional: cobertura de dados, safras de presença, síntese de ciclo com aprovação e gestão de termos de consentimento Art. 14.
            </div>
            <div style="background: white; border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px;">
              <strong style="color: var(--ink);">Faixa 4 · Diretoria (Solange Ribeiro):</strong> 4 telas executivas de prestação de contas: relatório para doadores, indicador de impacto social SROI e consulta agregada sem acesso a registros nominais de crianças.
            </div>
          </div>

          <div class="screens-grid">
            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/canonico_01_entrar.png" alt="Canônico 01 Entrar">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Canônico · Tela 01</div>
                <div class="screen-card-title">Porta de Entrada dos 4 Papéis</div>
                <div class="screen-card-desc">Seleção de perfil com credenciais e aviso explícito de dados sintéticos C001..C106.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/canonico_05_educadora_observacao.png" alt="Canônico Observação">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Canônico · Tela 05</div>
                <div class="screen-card-title">Rubrica das 6 Dimensões</div>
                <div class="screen-card-desc">Autocontrole, Convivência, Participação, Expressão emocional, Autoestima e Resiliência.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/canonico_13_psicologa_voz.png" alt="Canônico Voz">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Canônico · Tela 13</div>
                <div class="screen-card-title">Gravação por Voz & Transcrição</div>
                <div class="screen-card-desc">Áudio falado no celular descartado imediatamente após transcrição local.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/canonico_16_psicologa_relato.png" alt="Canônico Relato">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Canônico · Tela 16</div>
                <div class="screen-card-title">Relato do Conselho Profissional</div>
                <div class="screen-card-desc">Adequado às normas éticas do CRP: relatório por procedimento, sem identificação nominal.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/canonico_23_coordenacao_consentimentos.png" alt="Canônico Consentimentos">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Canônico · Tela 23</div>
                <div class="screen-card-title">Gestão de Consentimentos</div>
                <div class="screen-card-desc">Auditoria contínua de bases legais; qualquer revogação bloqueia imediatamente o campo.</div>
              </div>
            </div>

            <div class="screen-card">
              <div class="screen-card-img">
                <img src="figma_images/canonico_26_diretoria_sroi.png" alt="Canônico SROI">
              </div>
              <div class="screen-card-info">
                <div class="screen-card-tag">Canônico · Tela 26</div>
                <div class="screen-card-title">Impacto Social & Retorno (SROI)</div>
                <div class="screen-card-desc">Cálculo de retorno socioeconômico do investimento comunitário para captação de recursos.</div>
              </div>
            </div>
          </div>
        </div>
        <div class="artifact-footer" style="background: var(--accent-red-bg);">
          <span style="font-size: 13px; font-weight: 700; color: var(--accent-red);">Arquivo Canônico: <code>h6AnLVYLfpeVl2N4ie0Qzv</code> · 27 Telas</span>
          <a href="https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv" target="_blank" class="btn btn-primary">
            Acessar Canônico Completo no Figma ↗
          </a>
        </div>
      </div>
    </section>

    <!-- SECTION 2: DOSSIÊ DE NEGÓCIOS -->
    <section class="section-block" id="negocios">
      <div class="section-header">
        <div class="section-eyebrow">Entrega de Negócios · Semana 5</div>
        <h2 class="section-title">Dossiê de Negócios Consolidado</h2>
        <p class="section-desc">
          O modelo de geração de valor, viabilidade econômica, estrutura de captação e reconciliação dos dados demográficos de atendimento.
        </p>
      </div>

      <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">1. Lean Canvas de 9 Blocos</h3>
      <div class="lean-canvas-grid">
        <div class="canvas-block">
          <div class="canvas-block-title">1. Problema</div>
          <div class="canvas-block-body">
            <ul>
              <li>A evolução socioemocional acontece toda semana, mas não é registrada nem comprovável a financiadores.</li>
              <li>Tempo escasso dos educadores: registrar disputa com a atenção dada às crianças.</li>
              <li>Relatório anual feito apenas com adjetivos por falta de dados estruturados.</li>
            </ul>
          </div>
        </div>

        <div class="canvas-block">
          <div class="canvas-block-title">4. Solução</div>
          <div class="canvas-block-body">
            <ul>
              <li>Rubrica comportamental rápida (~3 min por criança) com âncoras claras.</li>
              <li>Captura por voz da vivência terapêutica com descarte imediato do áudio.</li>
              <li>Painel agregado com cálculo de evolução sem expor dados nominais.</li>
            </ul>
          </div>
        </div>

        <div class="canvas-block">
          <div class="canvas-block-title">3. Proposta de Valor Única</div>
          <div class="canvas-block-body">
            <strong>"Comprovar a transformação humana que o Instituto realiza, sem expor as crianças, sem mensalidades de software e operável pela própria equipe sem equipe de TI."</strong>
          </div>
        </div>

        <div class="canvas-block">
          <div class="canvas-block-title">9. Vantagem Injusta</div>
          <div class="canvas-block-body">
            <ul>
              <li>Construído diretamente com as dores da equipe de campo.</li>
              <li>Aderência nativa à rotina do Instituto (régua de 75% e planilha real).</li>
              <li>Privacidade por design respeitando normas do CRP e LGPD Art. 14.</li>
            </ul>
          </div>
        </div>

        <div class="canvas-block">
          <div class="canvas-block-title">2. Segmentos de Clientes</div>
          <div class="canvas-block-body">
            <ul>
              <li><strong>Usuários Internos:</strong> Pedagoga do reforço escolar e Psicóloga voluntária.</li>
              <li><strong>Gestão Interna:</strong> Coordenação pedagógica e Líder comunitário.</li>
              <li><strong>Clientes Finais de Impacto:</strong> Financiadores institucionais e doadores corporativos.</li>
            </ul>
          </div>
        </div>

        <div class="canvas-block canvas-span-2">
          <div class="canvas-block-title">7. Estrutura de Custos</div>
          <div class="canvas-block-body">
            <ul>
              <li><strong>Software:</strong> R$ 0 recorrente (stack Node.js + SQLite local em computadores doados).</li>
              <li><strong>Nuvem Opcional:</strong> Tier gratuito da Vercel / Render.</li>
              <li><strong>WhatsApp Oficial (Opcional):</strong> R$ 0,035 por mensagem utilitária (~R$ 18/mês para 120 famílias).</li>
            </ul>
          </div>
        </div>

        <div class="canvas-block">
          <div class="canvas-block-title">8. Métricas-Chave</div>
          <div class="canvas-block-body">
            <ul>
              <li>% de crianças com frequência &ge; 75%.</li>
              <li>Tempo médio por registro (&le; 180 segundos).</li>
              <li>% de crianças com evolução positiva nos ciclos.</li>
            </ul>
          </div>
        </div>

        <div class="canvas-block canvas-span-2">
          <div class="canvas-block-title">5. Canais de Distribuição & 6. Fontes de Receita</div>
          <div class="canvas-block-body">
            <ul>
              <li><strong>Canais:</strong> PWA instalado direto no celular dos educadores; WhatsApp para recados coletivos; relatórios em PDF para doadores.</li>
              <li><strong>Sustentabilidade:</strong> O sistema não cobra do Instituto; seu ROI é viabilizar captações de recursos via incentivo fiscal (FIA/FUMCAD) e empresas parceiras ao provar impacto quantitativo.</li>
            </ul>
          </div>
        </div>
      </div>

      <h3 style="font-size: 20px; font-weight: 700; margin: 32px 0 16px;">2. Reconciliação dos Dados Demográficos (As 120 Crianças)</h3>
      <div class="prose">
        <p>
          Durante o discovery e as mentorias com o Prof. Egon Daxbacher, reconciliamos as divergências numéricas aparentes nos documentos do Instituto:
        </p>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Segmento de Dados</th>
              <th>Total de Crianças</th>
              <th>Caracterização Operacional</th>
              <th>Tratamento no Percurso</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Universo Cadastral Total</strong></td>
              <td><span class="badge-tag badge-asis">120 crianças</span></td>
              <td>Capacidade física máxima da sede na garagem (60 no período da manhã e 60 na tarde).</td>
              <td>Base máxima suportada no banco de dados local com isolamento de turmas.</td>
            </tr>
            <tr>
              <td><strong>Crianças Ativas em Sala</strong></td>
              <td><span class="badge-tag badge-tobe">106 crianças</span></td>
              <td>Frequência regular nas oficinas de reforço e vivências de sábado.</td>
              <td>Alimentam as chamadas diárias e os ciclos de observação socioemocional.</td>
            </tr>
            <tr>
              <td><strong>Crianças em Transição / Risco</strong></td>
              <td><span class="badge-tag badge-asis">14 crianças</span></td>
              <td>Faltas consecutivas, mudança de domicílio ou em processo de acolhimento social.</td>
              <td>Disparam a régua preventiva de 75% na tela inicial <code>#/hoje</code> para busca ativa.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 style="font-size: 20px; font-weight: 700; margin: 32px 0 16px;">3. Escopo do MVP: O que entra vs. O que não entra</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Funcionalidade</th>
              <th>Status no MVP</th>
              <th>Justificativa Estratégica</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>F1: Ficha Viva & Consentimento Art. 14</td>
              <td><span class="badge-tag badge-tobe">Dentro do Escopo</span></td>
              <td>Exigência ética: campo sem consentimento assinado nasce bloqueado por padrão.</td>
            </tr>
            <tr>
              <td>F2: Chamada em 1 Toque</td>
              <td><span class="badge-tag badge-tobe">Dentro do Escopo</span></td>
              <td>Alimenta o controle de presença sem desviar o educador da atividade pedagógica.</td>
            </tr>
            <tr>
              <td>F3: Rubrica das 6 Dimensões (~3 min)</td>
              <td><span class="badge-tag badge-tobe">Dentro do Escopo</span></td>
              <td>Substitui textos abertos por âncoras objetivas da planilha real do Instituto.</td>
            </tr>
            <tr>
              <td>F4: Agenda & Trajetórias por Safra</td>
              <td><span class="badge-tag badge-tobe">Dentro do Escopo</span></td>
              <td>Mostra evolução longitudinal ciclo a ciclo exigida por financiadores.</td>
            </tr>
            <tr>
              <td>Portal Digital com Login para os Pais</td>
              <td><span class="badge-tag badge-asis">Fora do Escopo</span></td>
              <td>As famílias possuem conectividade limitada e planos de dados pré-pagos; o canal é o WhatsApp.</td>
            </tr>
            <tr>
              <td>Prontuário Psicológico Clínico Individual</td>
              <td><span class="badge-tag badge-asis">Veto Deliberado</span></td>
              <td>O produto afere indicadores de programa, nunca psicoterapia individual protegida pelo CFP.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- SECTION 3: DOSSIÊ DE TECNOLOGIA -->
    <section class="section-block" id="tecnologia">
      <div class="section-header">
        <div class="section-eyebrow">Entrega de Tecnologia & UX/UI · Semana 5</div>
        <h2 class="section-title">Dossiê de Tecnologia & Arquitetura</h2>
        <p class="section-desc">
          Especificação das personas, contraste de atrito AS-IS vs. TO-BE, mapeamento das User Stories e arquitetura de navegação.
        </p>
      </div>

      <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">1. Personas do Ecossistema</h3>
      <div class="persona-grid">
        <div class="persona-card">
          <div class="persona-card-header">
            <div class="persona-avatar">MS</div>
            <div>
              <div class="persona-name">Maria Silvia, 35</div>
              <div class="persona-role">Pedagoga do Reforço Escolar (Seg a Sex)</div>
            </div>
          </div>
          <div class="persona-card-body">
            <div class="persona-quote">"Não consigo transformar em dados os resultados do meu trabalho."</div>
            <p><strong>Contexto:</strong> Celular na mão, na sala, sem estação de trabalho. Precisa registrar sem tirar a atenção dos 60 alunos do reforço.</p>
            <p><strong>Necessidade Decisiva:</strong> Não expor as crianças. Proteção dos alunos é uma exigência da própria educadora.</p>
          </div>
        </div>

        <div class="persona-card">
          <div class="persona-card-header">
            <div class="persona-avatar">W</div>
            <div>
              <div class="persona-name">Líder Wellington, 48</div>
              <div class="persona-role">Fundador & Gestor Comunitário</div>
            </div>
          </div>
          <div class="persona-card-body">
            <div class="persona-quote">"O Instituto vive de confiança e doação; precisamos mostrar onde cada centavo toca a vida dessas crianças."</div>
            <p><strong>Contexto:</strong> Faz tudo: cozinha, dá banho, atende famílias, gerencia compras e controla planilhas. Opera com orçamento zero de TI.</p>
            <p><strong>Regra de Ouro:</strong> A régua de 75% de frequência para acesso aos benefícios (passeios e oficinas).</p>
          </div>
        </div>

        <div class="persona-card">
          <div class="persona-card-header">
            <div class="persona-avatar">CD</div>
            <div>
              <div class="persona-name">Carolina Duarte, 39</div>
              <div class="persona-role">Psicóloga Voluntária (Sábados)</div>
            </div>
          </div>
          <div class="persona-card-body">
            <div class="persona-quote">"O maior desafio aqui é registrar o que você fez. Sair daqui à noite e preencher relatório... não dá."</div>
            <p><strong>Contexto:</strong> Conduz vivências terapêuticas em grupo há 6 anos. Seu conhecimento acumulado ficava restrito à memória.</p>
            <p><strong>Exigência Ética:</strong> Relatórios no padrão do CRP sem identificação de nomes de crianças.</p>
          </div>
        </div>
      </div>

      <h3 style="font-size: 20px; font-weight: 700; margin: 36px 0 16px;">2. Jornada AS-IS vs. TO-BE (Ganho de Tempo e Redução de Atrito)</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Etapa do Ciclo</th>
              <th>Processo Atual (AS-IS)</th>
              <th>Com o Percurso (TO-BE)</th>
              <th>Ganho Quantificável</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Observar Comportamento</strong></td>
              <td>O que é visto fica na cabeça do educador; memórias se perdem ao longo do semestre.</td>
              <td>Rubrica de 6 dimensões × 4 âncoras comportamentais pré-definidas.</td>
              <td><span class="badge-tag badge-tobe">Padronização 100% estruturada</span></td>
            </tr>
            <tr>
              <td><strong>2. Registro de Presença</strong></td>
              <td>Papel e planilha manual; demora para consolidar faltas.</td>
              <td>1 toque por criança no celular; sincronização offline em fila.</td>
              <td><span class="badge-tag badge-tobe">De 15 min &rarr; 40 segundos</span></td>
            </tr>
            <tr>
              <td><strong>3. Relato do Encontro</strong></td>
              <td>Conversas informais no corredor que não viram documentação.</td>
              <td>Áudio de ~40 segundos transcrito localmente e descartado no browser.</td>
              <td><span class="badge-tag badge-tobe">Zero escrita manual à noite</span></td>
            </tr>
            <tr>
              <td><strong>4. Alerta de Evasão</strong></td>
              <td>Percebe-se a ausência tarde demais, após semanas de abandono.</td>
              <td>Alerta automático na tela de abertura após 2 faltas consecutivas.</td>
              <td><span class="badge-tag badge-tobe">Busca ativa 14 dias antes</span></td>
            </tr>
            <tr>
              <td><strong>5. Relatório do Financiador</strong></td>
              <td>Semanas redigindo relatórios textuais subjetivos sem números.</td>
              <td>Síntese de ciclo com um clique, com médias agregadas e gráfico temporal.</td>
              <td><span class="badge-tag badge-tobe">De 12 horas &rarr; 5 minutos</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 style="font-size: 20px; font-weight: 700; margin: 36px 0 16px;">3. Tabela das User Stories Mapeadas no Figma</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>História</th>
              <th>Enunciado do Usuário</th>
              <th>Frame no Figma</th>
              <th>Evidência & Prova no Código</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>US-1</strong></td>
              <td>Como <strong>pedagoga</strong>, quero registrar minha observação com âncoras claras em menos de 3 minutos para não tirar atenção das crianças.</td>
              <td><code>#/ciclo</code> &rarr; <code>#/observacao/:id</code><br>(Frame #7:51)</td>
              <td>Smoke test §4 (12 asserções) e §5b (cronômetro de registro com meta &le; 180s).</td>
            </tr>
            <tr>
              <td><strong>US-2</strong></td>
              <td>Como <strong>pedagoga</strong>, quero visualizar a evolução entre ciclos para planejar atividades baseadas em dados reais da turma.</td>
              <td><code>#/turma</code><br>(Frame #8:2)</td>
              <td>Smoke test §5 (comparação de dois ciclos e cálculo de dispersão de médias).</td>
            </tr>
            <tr>
              <td><strong>US-3</strong></td>
              <td>Como <strong>pedagoga</strong>, quero ser alertada sobre ausências acumuladas para realizar busca ativa preventiva.</td>
              <td><code>#/hoje</code><br>(Frame #5:2)</td>
              <td>Smoke test §6 (disparo do alerta em 2 faltas consecutivas e régua de 75%).</td>
            </tr>
            <tr>
              <td><strong>US-4</strong></td>
              <td>Como <strong>coordenação</strong>, quero painel agregado e síntese de ciclo para prestar contas sem expor dados nominais.</td>
              <td><code>#/painel</code> &rarr; <code>#/sintese</code><br>(Frame #9:2)</td>
              <td>Smoke test §7 (supressão automática de médias quando n &lt; 5 crianças).</td>
            </tr>
            <tr>
              <td><strong>US-5</strong></td>
              <td>Como <strong>coordenação</strong>, quero que campos sem consentimento assinado nasçam bloqueados por padrão no sistema.</td>
              <td><code>#/consentimentos</code><br>(Frame #8:71)</td>
              <td>Smoke test §8 (bloqueio por padrão; revogação de termo revoga permissão na hora).</td>
            </tr>
            <tr>
              <td><strong>US-6</strong></td>
              <td>Como <strong>psicóloga</strong>, quero falar por 40 segundos sobre o encontro para gerar o relatório no padrão do conselho sem trabalhar à noite.</td>
              <td><code>#/voz</code> &rarr; <code>#/relato</code><br>(Frame #25:505)</td>
              <td>Smoke test §24 e §26 (geração de relatório por procedimento e descarte de áudio).</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- SECTION 4: VISITA & VALIDAÇÃO EM CAMPO -->
    <section class="section-block" id="campo">
      <div class="section-header">
        <div class="section-eyebrow">Evidência Empírica Real · 29/08/2026</div>
        <h2 class="section-title">Ata da Sessão de Validação no Instituto Ebenézer</h2>
        <p class="section-desc">
          Registro fidedigno da visita presencial, transcrição literal dos 97 minutos gravados, reações à demonstração e ajustes estruturais incorporados.
        </p>
      </div>

      <div class="prose">
        <p>
          No sábado, <strong>29 de agosto de 2026</strong>, a equipe esteve presencialmente na sede do Instituto Ebenézer durante as atividades da manhã e da tarde. 
          Realizamos a demonstração assistida do protótipo com a psicóloga responsável pelas vivências em grupo e com o fundador Wellington.
        </p>

        <div class="callout callout-success">
          <div class="callout-icon">🎙️</div>
          <div class="callout-content">
            <h4>Reação da Usuária Real na Demonstração</h4>
            <p><em>"Eu acho que o maior desafio aqui é registrar o que você fez. Essa é a maior dificuldade, é o registro... Sair daqui e preencher relatório não dá."</em></p>
            <p>Ao visualizar o protótipo transformando os check-ins da atividade em um rascunho de relatório pré-formatado para o conselho profissional sem nomes de crianças, sua reação foi imediata: <strong>"Amei isso!"</strong> (Gravação 82, 57:20).</p>
          </div>
        </div>

        <h4 style="font-size: 17px; font-weight: 700; margin: 24px 0 12px;">Os 4 Ajustes Estruturais Decorrentes da Visita:</h4>
        <ol style="padding-left: 20px; line-height: 1.7; font-size: 15px;">
          <li>
            <strong>Criação da Persona da Psicóloga (Decisão 31):</strong> O repositório tratava a psicóloga como "fora de escopo clínico". 
            A visita revelou que ela conduz oficinas em grupo aos sábados e é quem mais sofre com a sobrecarga de relatórios. O perfil foi integrado imediatamente.
          </li>
          <li>
            <strong>Adoção das 6 Dimensões da Planilha Real (Decisão 34):</strong> Substituímos as 5 dimensões acadêmicas teóricas pelas 6 métricas 
            já consolidadas na planilha histórica do Instituto: <em>Autocontrole, Convivência, Participação, Expressão Emocional, Autoestima e Resiliência</em>.
          </li>
          <li>
            <strong>Automatização da Régua de 75% (Decisão 33):</strong> O Instituto já possui a regra de que crianças com menos de 75% de presença não participam 
            de passeios externos. O Percurso absorveu essa régua como motor de busca ativa antes que vire evasão.
          </li>
          <li>
            <strong>Privacidade por Design no Áudio Gravado:</strong> Ficou estabelecido que nenhuma gravação de voz é salva permanentemente. 
            O navegador processa a transcrição e o arquivo de áudio é eliminado da memória imediatamente.
          </li>
        </ol>
      </div>
    </section>

    <!-- SECTION 5: AUDITORIA ÉTICA BLOC 6 -->
    <section class="section-block" id="auditoria-etica">
      <div class="section-header">
        <div class="section-eyebrow">Conformidade Legal & Proteção à Criança</div>
        <h2 class="section-title">Auditoria Ética Pré-Entrega (Bloco 6)</h2>
        <p class="section-desc">
          Checklist rigoroso de governança de dados, conformidade com a LGPD e sobrevivência sustentável sem equipe de suporte técnico.
        </p>
      </div>

      <div class="callout callout-success">
        <div class="callout-icon">🛡️</div>
        <div class="callout-content">
          <h4>1. Check de Privacidade: Anonimização Rigorosa</h4>
          <p>
            <strong>Status: APROVADO.</strong> Nenhum nome de criança real foi utilizado no desenvolvimento, nos testes ou na base do sistema. 
            Todas as instâncias operam com códigos alfanuméricos sintéticos (ex.: <code>C001</code> a <code>C106</code>). 
            Casos clínicos específicos são vedados pelo sistema; o produto afere unicamente indicadores do programa pedagógico.
          </p>
        </div>
      </div>

      <div class="callout callout-info">
        <div class="callout-icon">⚖️</div>
        <div class="callout-content">
          <h4>2. Check de Governança: LGPD Arts. 11 e 14</h4>
          <p>
            <strong>Status: APROVADO.</strong> O tratamento de dados pessoais de menores exige consentimento específico e em destaque dado por pelo menos um dos pais ou responsável legal. 
            No Percurso, qualquer criança sem o termo assinado registrado em <code>#/consentimentos</code> possui suas fichas de observação travadas por design.
          </p>
        </div>
      </div>

      <div class="callout callout-warning">
        <div class="callout-icon">🔋</div>
        <div class="callout-content">
          <h4>3. Check de Sobrevivência Pós-Semana 10 (Sem Equipe de TI)</h4>
          <p>
            <strong>Status: APROVADO.</strong> O sistema não depende de contêineres Docker pesados, instâncias de nuvem que cobram em dólar ou orquestradores complexos. 
            Foi arquitetado em Node.js com SQLite nativo de arquivo único, permitindo rodar em notebooks doados do Instituto ou ser exportado para planilhas Excel a qualquer momento.
          </p>
        </div>
      </div>
    </section>

    <!-- SECTION 6: HISTÓRIA DA CONSTRUÇÃO DO MVP & WHATSAPP -->
    <section class="section-block" id="mvp-funcional">
      <div class="section-header">
        <div class="section-eyebrow">Engenharia de Software & Integração</div>
        <h2 class="section-title">Construção do MVP Funcional & Pesquisa WhatsApp</h2>
        <p class="section-desc">
          A história técnica da implementação do repositório em Node.js, os degraus de integração e o veto ético a disparos nominais.
        </p>
      </div>

      <div class="prose">
        <p>
          O MVP funcional localizado em <code>/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional</code> 
          foi desenvolvido sob o princípio de <strong>Zero Dependência Externa</strong>. Composto por um servidor Node.js ultra-leve, 
          banco SQLite embarcado e interface PWA offline-first com Service Worker, a solução sincroniza chamadas e registros 
          mesmo quando a conexão de internet na favela oscila.
        </p>

        <h3 style="font-size: 20px; font-weight: 700; margin: 28px 0 14px;">A Pesquisa de Integração WhatsApp / Instagram</h3>
        <p>
          O Instituto já gasta horas semanais montando mensagens e relatórios em PDF para enviar aos grupos de mães e de apoiadores. 
          Investigamos a viabilidade técnica e jurídica de automatizar esses disparos através de três degraus:
        </p>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Degrau de Solução</th>
              <th>Tecnologia</th>
              <th>Custo Estimado</th>
              <th>Veredito Jurídico & Operacional</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Degrau 0 (Adotado no MVP)</strong></td>
              <td>Web Share API & links <code>wa.me</code> agregados</td>
              <td><strong>R$ 0</strong></td>
              <td><span class="badge-tag badge-tobe">100% Legal & Seguro</span><br>O sistema monta o texto agregado da turma e a pessoa clica para disparar no app. Zero risco de banimento.</td>
            </tr>
            <tr>
              <td><strong>Degrau 1 (API Oficial Meta)</strong></td>
              <td>WhatsApp Cloud API (Template 1-para-1)</td>
              <td><strong>~R$ 18 / mês</strong><br>(R$ 0,035 por msg)</td>
              <td><span class="badge-tag badge-tobe">Caminho Oficial Seguro</span><br>Permite envio individual para cada responsável com opt-in prévio. Não atinge grupos abertos de terceiros.</td>
            </tr>
            <tr>
              <td><strong>Degrau 2 (Não Oficial)</strong></td>
              <td>Baileys / WAHA / Evolution API</td>
              <td>Risco de banimento</td>
              <td><span class="badge-tag badge-asis">Risco de Perda da Linha</span><br>Viola os Termos de Serviço da Meta. A perda do número de telefone seria catastrófica para a ONG.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="callout callout-danger" style="margin-top: 24px;">
        <div class="callout-icon">🚫</div>
        <div class="callout-content">
          <h4>O Veto Ético e Jurídico Categórico</h4>
          <p>
            A pesquisa jurídica concluiu que <strong>a lista nominal de faltas de crianças nunca deve ser disparada em grupos abertos de WhatsApp</strong>. 
            Divulgar o nome de crianças ausentes em grupos públicos viola frontalmente o Art. 14 §3º da LGPD e as diretrizes do ECA/UNICEF sobre exposição vexatória. 
            O Percurso implementou exclusivamente o envio do <strong>indicador agregado</strong> da turma (ex.: <em>"Hoje tivemos 18 das 22 crianças presentes na oficina!"</em>).
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 36px;">
        <a href="https://percurso-ebenezer.vercel.app" target="_blank" class="btn btn-demo" style="font-size: 16px; padding: 14px 32px;">
          <span>🚀 Acessar Demonstração do MVP Funcional na Vercel</span>
        </a>
        <div style="font-size: 13px; color: var(--ink-muted); margin-top: 8px;">
          Instância de produção ativa: <code>https://percurso-ebenezer.vercel.app</code>
        </div>
      </div>
    </section>

    <!-- SECTION 7: GUIA DE SUBMISSÃO & DRIVE -->
    <section class="section-block" id="entrega-drive">
      <div class="section-header">
        <div class="section-eyebrow">Procedimento de Submissão</div>
        <h2 class="section-title">Estruturação no Google Drive & Envio Adalove</h2>
        <p class="section-desc">
          Diretrizes práticas para conferência da pasta compartilhada e envio individual no portal acadêmico do Inteli.
        </p>
      </div>

      <div class="prose">
        <p>
          Conforme solicitado na dinâmica de entrega da Semana 5, todos os artefatos devem estar disponíveis com acesso público na pasta compartilhada:
        </p>

        <div style="background: white; border: 2px dashed var(--accent-amber); border-radius: var(--radius-md); padding: 24px; text-align: center; margin: 20px 0;">
          <h4 style="font-size: 18px; font-weight: 700; color: var(--accent-amber); margin-bottom: 8px;">Pasta Oficial da Entrega no Google Drive</h4>
          <p style="font-size: 14px; margin-bottom: 16px;">Configurada como <em>"Qualquer pessoa com o link pode visualizar"</em>.</p>
          <a href="https://drive.google.com/drive/folders/1EXUzWlOF0WK9IaVQlZ6X3hT7E4mZ205J?usp=sharing" target="_blank" class="btn btn-primary" style="background: var(--accent-amber); border-color: var(--accent-amber);">
            Abrir Pasta no Google Drive ↗
          </a>
        </div>

        <h4 style="font-size: 17px; font-weight: 700; margin: 28px 0 12px;">Passo a Passo para Envio no Adalove:</h4>
        <ol style="padding-left: 20px; line-height: 1.8; font-size: 15px;">
          <li>Acesse a plataforma acadêmica em <a href="https://adalove.inteli.edu.br/" target="_blank"><strong>https://adalove.inteli.edu.br/</strong></a> com seu e-mail <code>@mba.inteli.edu.br</code>.</li>
          <li>Navegue até <strong>Módulo 3 &rarr; Semana 5 &rarr; Trilha B (Monitoramento de Impacto)</strong>.</li>
          <li>Cole o link da pasta compartilhada do Google Drive no campo de submissão do artefato.</li>
          <li><strong>Importante:</strong> Cada membro da equipe deve realizar a submissão no seu login individual para fins de registro de presença e avaliação de competências.</li>
        </ol>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p><strong>Percurso</strong> · Sistema de Monitoramento de Impacto Socioemocional para o Instituto Social Ebenézer</p>
      <p style="margin-top: 4px;">MBA em Inteligência Artificial e Dados para Negócios · Inteli · Turma 2 · Setembro de 2026</p>
      <p style="margin-top: 4px; font-size: 11.5px; color: var(--ink-subtle);">Orientação: Profª. Bruna Mayer · Grupo 06</p>
    </footer>

  </main>

</body>
</html>
"""
    # Write to destinations
    paths = [
        "/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional/public/jornada.html",
        "/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional/public/dossie.html",
        "/Users/igorrego/DEV/allla/Inteli - Artefato Modulo III/2 - MVP Funcional/docs/JORNADA-ARTEFATO-SEMANA-5-TRILHA-B.html",
        "/Users/igorrego/Library/CloudStorage/OneDrive-Pessoal/02_Allla/Inteli - Artefato Modulo III/1 - Arquitetura/Dossie_Jornada_Semana5_TrilhaB.html"
    ]

    for p in paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"Sucesso gerando: {p} ({len(html_content)} bytes)")

if __name__ == "__main__":
    gerar_html()
