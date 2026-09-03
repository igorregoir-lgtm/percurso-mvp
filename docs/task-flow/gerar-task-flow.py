# -*- coding: utf-8 -*-
# Gera task-flow.html a partir de task-flow.json (fonte de verdade).
# Depois: Chrome headless em 2600px de largura, escala 2 -> Task-Flow-Percurso-Grupo06.png
import json, html as H

J = json.load(open('task-flow.json', encoding='utf-8'))
e = lambda t: H.escape(t or '')

CSS = """
:root{
  --bg:#F4EFE5; --card:#FFFFFF; --card2:#F7F3EA; --ink:#2E2A24; --muted:#8B8478;
  --line:#E6DFD0; --red:#B0392C; --redsoft:#F4DCD7; --ok:#4A6B2A; --okbg:#DCE9CA;
  --amb:#8A6316; --ambbg:#FBF1DC; --blue:#2A5570; --bluebg:#DBE7EF; --chip:#F0EBE0;
  --disp:"Archivo","Helvetica Neue",Arial,sans-serif;
  --body:"IBM Plex Sans","Segoe UI",Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
body{width:2600px;background:var(--bg);color:var(--ink);font-family:var(--body);
     -webkit-font-smoothing:antialiased;padding:48px 56px 40px}
.topo{background:var(--ink);border-radius:16px;padding:28px 36px;display:flex;align-items:center;gap:28px;color:#F4EFE5}
.marca{width:66px;height:66px;border-radius:50%;background:var(--red);display:grid;place-items:center;
       font-family:var(--disp);font-weight:700;font-size:25px;flex:none}
.topo h1{font-family:var(--disp);font-weight:700;font-size:42px;letter-spacing:-.02em;line-height:1.05}
.topo .sub{font-size:18px;color:#C9C0B2;margin-top:7px}
.selo{margin-left:auto;background:var(--red);border-radius:999px;padding:11px 22px;
      font-family:var(--disp);font-weight:600;font-size:15px;letter-spacing:.06em;text-align:right}
.selo small{display:block;font-weight:500;font-size:12px;letter-spacing:.04em;opacity:.85;margin-top:2px}

.faixa{display:grid;grid-template-columns:1.35fr 1fr;gap:0;background:var(--card);
       border:1px solid var(--line);border-top:none;border-radius:0 0 16px 16px;overflow:hidden}
.faixa>div{padding:24px 30px}
.faixa>div+div{border-left:1px solid var(--line)}
.rot{font-family:var(--disp);font-weight:600;font-size:12.5px;letter-spacing:.14em;
     text-transform:uppercase;color:var(--red);margin-bottom:10px}
.hist{font-size:23px;line-height:1.42;font-family:var(--disp);font-weight:500}
.hist b{color:var(--red)}
.orig{font-size:14px;line-height:1.5;color:var(--muted);margin-top:12px}
.tarefa{font-size:26px;line-height:1.3;font-family:var(--disp);font-weight:700;letter-spacing:-.01em}
.pares{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
.par .k{font-family:var(--disp);font-weight:600;font-size:12px;letter-spacing:.1em;
        text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px}
.par p{font-size:14.5px;line-height:1.45}

.recorte{margin-top:20px;background:var(--card2);border:1px solid var(--line);border-left:5px solid var(--blue);
         border-radius:12px;padding:18px 24px;font-size:15px;line-height:1.55}
.recorte b{font-family:var(--disp)}

/* ---- o fluxo ---- */
.fluxo{margin-top:26px;display:flex;align-items:stretch;gap:0}
.no{flex:1 1 0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;
    display:flex;flex-direction:column;min-width:0}
.no.inicio{background:var(--ink);color:#F4EFE5;border-color:var(--ink)}
.no.fim{background:var(--bluebg);border-color:var(--blue)}
.no.atrito{border-color:var(--amb);border-width:2px;background:var(--ambbg)}
.no-h{display:flex;align-items:center;gap:8px;margin-bottom:10px;min-height:24px}
.n{font-family:var(--disp);font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase;
   background:var(--chip);color:var(--ink);border-radius:999px;padding:4px 11px}
.no.inicio .n{background:rgba(244,239,229,.16);color:#F4EFE5}
.no.fim .n{background:var(--blue);color:#fff}
.rota{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;color:var(--muted)}
.no.atrito .rota{color:var(--amb)}
.no h3{font-family:var(--disp);font-weight:700;font-size:20px;line-height:1.22;letter-spacing:-.01em}
.no p{font-size:14px;line-height:1.5;margin-top:9px;color:var(--ink)}
.no.inicio p{color:#CFC7B8}
.no-f{margin-top:auto;padding-top:12px;display:flex;align-items:center;gap:8px}
.t{font-family:var(--disp);font-weight:700;font-size:14px}
.chip{font-family:var(--disp);font-weight:600;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;
      border-radius:999px;padding:4px 10px}
.chip.existe{background:var(--okbg);color:var(--ok)}
.chip.atrito{background:var(--amb);color:#fff}
.seta{flex:0 0 44px;display:grid;place-items:center;color:var(--muted);font-size:30px;font-weight:300}

/* ---- blocos de baixo ---- */
.baixo{margin-top:26px;display:grid;grid-template-columns:1.05fr 1.45fr;gap:22px;align-items:start}
.bloco{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px 28px}
.bloco h2{font-family:var(--disp);font-weight:700;font-size:25px;letter-spacing:-.01em;margin-bottom:4px}
.bloco .cap{font-size:14px;color:var(--muted);line-height:1.5;margin-bottom:16px}
table{width:100%;border-collapse:collapse}
th{font-family:var(--disp);font-weight:600;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;
   color:var(--muted);text-align:left;padding:0 12px 8px 0;border-bottom:1px solid var(--line)}
td{font-size:14px;line-height:1.45;padding:11px 12px 11px 0;border-bottom:1px solid var(--line);vertical-align:top}
td.p{font-family:var(--disp);font-weight:700;white-space:nowrap}
td.h{font-family:var(--disp);font-weight:600;color:var(--blue);white-space:nowrap}
td .lim{color:var(--muted);font-size:13px;display:block;margin-top:4px}

.q{border:1px solid var(--line);border-radius:12px;padding:18px 20px;background:var(--card2)}
.q+.q{margin-top:14px}
.q-h{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}
.q-n{font-family:var(--disp);font-weight:700;font-size:13px;letter-spacing:.1em;color:var(--red)}
.q-bruta{font-size:14.5px;line-height:1.5;color:var(--muted);text-decoration:line-through;text-decoration-color:var(--redsoft);text-decoration-thickness:2px}
.q-prob{font-size:13.5px;line-height:1.5;color:var(--amb);margin-top:8px;padding-left:14px;border-left:3px solid var(--ambbg)}
.q-final{font-family:var(--disp);font-weight:600;font-size:18px;line-height:1.35;margin-top:14px;
         background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.q-mede{font-size:13.5px;line-height:1.5;color:var(--muted);margin-top:9px}
.q-mede b{color:var(--ink);font-family:var(--disp)}

.ajustes{margin-top:22px;background:var(--ink);color:#F4EFE5;border-radius:16px;padding:26px 32px}
.ajustes h2{font-family:var(--disp);font-weight:700;font-size:24px;margin-bottom:6px}
.ajustes .cap{color:#C9C0B2;font-size:14px;margin-bottom:16px}
.ajustes ol{list-style:none;counter-reset:a;display:grid;grid-template-columns:1fr 1fr;gap:12px 28px}
.ajustes li{counter-increment:a;font-size:14.5px;line-height:1.5;padding-left:36px;position:relative;color:#E7E1D6}
.ajustes li::before{content:counter(a,decimal-leading-zero);position:absolute;left:0;top:0;
  font-family:var(--disp);font-weight:700;font-size:13px;color:var(--red);background:rgba(176,57,44,.18);
  border-radius:6px;padding:3px 7px}
.fora{margin-top:18px;padding-top:16px;border-top:1px solid rgba(244,239,229,.18);font-size:14.5px;line-height:1.55;color:#C9C0B2}
.fora b{color:#F4EFE5;font-family:var(--disp)}
.rod{margin-top:20px;font-size:13px;color:var(--muted);line-height:1.6}
"""

nos = []
for i, p in enumerate(J['passos']):
    cls = p['tipo'] if p['tipo'] in ('inicio', 'fim') else ''
    if p.get('estado') == 'atrito':
        cls = 'atrito'
    rota = '<span class="rota">%s</span>' % e(p['tela']) if p['tela'] else ''
    chip = '<span class="chip %s">%s</span>' % (p['estado'], e(p['estado'])) if p.get('estado') else ''
    tempo = '<span class="t">%s</span>' % e(p['tempo']) if p.get('tempo') else ''
    rodape = '<div class="no-f">%s%s</div>' % (tempo, chip) if (tempo or chip) else ''
    nos.append('''<div class="no %s">
      <div class="no-h"><span class="n">%s</span>%s</div>
      <h3>%s</h3><p>%s</p>%s</div>''' % (cls, e(p['n']), rota, e(p['titulo']), e(p['faz']), rodape))
fluxo = '<div class="seta">&#8594;</div>'.join(nos)

obs = '\n'.join(
    '<tr><td class="p">%s</td><td>%s<span class="lim">%s</span></td><td class="h">%s</td></tr>'
    % (e(o[0]), e(o[1]), e(o[2]), e(o[3])) for o in J['observar'])

qs = '\n'.join('''<div class="q">
  <div class="q-h"><span class="q-n">PERGUNTA %s</span><span class="q-n" style="color:var(--muted)">como a IA gerou</span></div>
  <p class="q-bruta">%s</p>
  <p class="q-prob">%s</p>
  <p class="q-final">%s</p>
  <p class="q-mede"><b>Mede:</b> %s</p>
</div>''' % (e(q['n']), e(q['bruta']), e(q['problema']), e(q['final']), e(q['mede'])) for q in J['perguntas'])

ajustes = '\n'.join('<li>%s</li>' % e(a) for a in J['ajustes'])

hist = J['historia']
HTML = """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap">
<style>%s</style></head><body>

<div class="topo">
  <div class="marca">06</div>
  <div><h1>%s</h1><div class="sub">%s</div></div>
  <div class="selo">EXERCÍCIO 03<small>TASK FLOW DO PROJETO</small></div>
</div>

<div class="faixa">
  <div>
    <div class="rot">História de usuário · %s</div>
    <p class="hist">%s</p>
    <p class="orig">%s</p>
  </div>
  <div>
    <div class="rot">Tarefa principal que ela representa</div>
    <p class="tarefa">%s</p>
    <div class="pares">
      <div class="par"><span class="k">Gatilho</span><p>%s</p></div>
      <div class="par"><span class="k">Termina quando</span><p>%s</p></div>
    </div>
  </div>
</div>

<div class="recorte"><b>Por que é task flow e não user flow.</b> %s</div>

<div class="fluxo">%s</div>

<div class="baixo">
  <div class="bloco">
    <h2>O que observar, passo a passo</h2>
    <p class="cap">Cada linha tem um limiar que reprova. Sem limiar, observação vira impressão.</p>
    <table>
      <tr><th>Passo</th><th>Medida e o que reprova</th><th>Hipótese</th></tr>
      %s
    </table>
  </div>
  <div class="bloco">
    <h2>As três perguntas — antes e depois</h2>
    <p class="cap">A IA gerou as três de cima. Nenhuma sobreviveu inteira: as três entregavam o caminho que a tarefa existe para testar. Riscado é o que veio; em destaque é o que vai ser dito na sessão.</p>
    %s
  </div>
</div>

<div class="ajustes">
  <h2>Os ajustes necessários</h2>
  <p class="cap">O que mudou no protocolo de validação depois de desenhar este fluxo e gerar as perguntas.</p>
  <ol>%s</ol>
  <p class="fora"><b>O que este teste não prova.</b> %s</p>
</div>

<p class="rod">Fontes: <b>jornada de usuário v2</b> (docs/jornada-usuario) · <b>decisão 31</b> de DECISOES-TECNICAS.md · protocolo de VALIDACAO-USUARIO.md e METODOLOGIA-VALIDACAO-PERCURSO.md · rotas conferidas em public/app.js.<br>
Dados da sessão são sintéticos: perfil <i>Carolina Duarte</i>, turma <i>Vivência · Sábado manhã</i>, ambos do seed. Nenhuma criança real é representada.</p>

</body></html>""" % (CSS, e(J['titulo']), e(J['subtitulo']), e(hist['id']), e(hist['texto']),
                     e(hist['origem']), e(hist['tarefa']), e(hist['gatilho']), e(hist['fim']),
                     e(J['recorte']), fluxo, obs, qs, ajustes, e(J['fora']))

open('task-flow.html', 'w', encoding='utf-8').write(HTML)
print('task-flow.html gerado')
