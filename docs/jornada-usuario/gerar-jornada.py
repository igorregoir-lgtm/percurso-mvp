# -*- coding: utf-8 -*-
# Gera jornada.html a partir de jornada.json (fonte de verdade).
# Depois: Chrome headless em 3400px de largura, escala 2 -> Jornada-Usuario-Ebenezer-Grupo06.png
import json, html

J = json.load(open('jornada.json', encoding='utf-8'))

MARCAS = [
    ('ONDE O PRODUTO ENTRA:', 'entra', 'o produto entra'),
    ('ONDE O PRODUTO AINDA NÃO ENTRA:', 'falta', 'ainda não entra'),
    ('ONDE O PRODUTO NÃO ENTRA:', 'nao', 'o produto não entra'),
    ('SE NADA FOR REGISTRADO:', 'rede', 'se não registrou'),
    ('O QUE NÃO PODE SER PERDIDO:', 'guarda', 'não pode ser perdido'),
    ('O QUE FALTA NA TELA:', 'falta', 'falta na tela'),
]

def bullet(txt):
    for prefixo, classe, rot in MARCAS:
        if txt.startswith(prefixo):
            corpo = txt[len(prefixo):].strip()
            return ('<li class="b %s"><span class="chip %s">%s</span>%s</li>'
                    % (classe, classe, html.escape(rot), html.escape(corpo)))
    return '<li class="b hoje">%s</li>' % html.escape(txt)

def cit(t):
    return html.escape(t.replace('\n', ' ')).strip()

def paras(t):
    return ''.join('<p>%s</p>' % html.escape(p) for p in t.split('\n\n'))

cols = []
for f in J['fases']:
    bs = '\n'.join(bullet(a) for a in f['acoes'])
    tipo = 'conf' if f['tipoCitacao'] == 'confianca' else 'aten'
    cols.append(f'''
    <div class="col">
      <div class="col-h">
        <span class="num">{html.escape(f['numero'])}</span>
        <span class="cnome">{html.escape(f['nome'])}</span>
      </div>
      <div class="emo">
        <span class="emoji">{f['emoji']}</span>
        <span class="etxt">{html.escape(f['emocao'])}</span>
      </div>
      <ul class="acoes">{bs}</ul>
      <div class="quote {tipo}">
        <p>“{cit(f['citacao'])}”</p>
        <span class="fonte">{html.escape(f['fonte'])}</span>
      </div>
    </div>''')

exp = '\n'.join('<li>%s</li>' % html.escape(e) for e in J['expectativas'])

P = J['principio']
portas = []
for p in P['portas']:
    cls = 'ok' if p['estado'] == 'já existe' else 'novo'
    portas.append(f'''<div class="porta {cls}">
      <div class="porta-h"><span class="pn">{html.escape(p['n'])}</span>
        <span class="pe {cls}">{html.escape(p['estado'])}</span></div>
      <h4>{html.escape(p['titulo'])}</h4>
      <p>{html.escape(p['texto'])}</p>
    </div>''')
regras = '\n'.join('<li>%s</li>' % html.escape(r) for r in P['regras'])

mvs = []
for i, m in enumerate(J['momentosDaVerdade'], 1):
    mvs.append(f'''<div class="mv">
      <span class="mv-n">{i:02d}</span>
      <h4>{html.escape(m['titulo'])}</h4>
      <p>{html.escape(m['texto'])}</p>
    </div>''')

HTML = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap">
<style>
:root{{
  --bg:#F4EFE5; --card:#FFFFFF; --card2:#F7F3EA; --ink:#2E2A24; --muted:#8B8478;
  --line:#E6DFD0; --red:#B0392C; --redsoft:#F4DCD7; --ok:#4A6B2A; --okbg:#DCE9CA;
  --amb:#8A6316; --ambbg:#FBF1DC; --blue:#2A5570; --bluebg:#DBE7EF; --chip:#F0EBE0;
  --disp:"Archivo","Helvetica Neue",Arial,sans-serif;
  --body:"IBM Plex Sans","Segoe UI",Helvetica,Arial,sans-serif;
}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{width:3400px;background:var(--bg);color:var(--ink);font-family:var(--body);
     -webkit-font-smoothing:antialiased;padding:52px 60px 44px}}
.topo{{background:var(--ink);border-radius:16px;padding:30px 38px;display:flex;
      align-items:center;gap:30px;color:#F4EFE5}}
.marca{{width:70px;height:70px;border-radius:50%;background:var(--red);display:grid;
       place-items:center;font-family:var(--disp);font-weight:700;font-size:27px;flex:none}}
.topo h1{{font-family:var(--disp);font-weight:700;font-size:46px;letter-spacing:-.02em;line-height:1.05}}
.topo .sub{{font-size:19px;color:#C9C0B2;margin-top:7px}}
.selo{{margin-left:auto;background:var(--red);border-radius:999px;padding:11px 22px;
      font-family:var(--disp);font-weight:600;font-size:16px;letter-spacing:.06em;text-align:right}}
.selo small{{display:block;font-weight:500;font-size:12.5px;letter-spacing:.04em;opacity:.85;margin-top:2px}}

.lens{{display:grid;grid-template-columns:640px 1fr 900px;gap:0;background:var(--card);
      border:1px solid var(--line);border-top:none;border-radius:0 0 16px 16px;overflow:hidden}}
.lens>div{{padding:26px 30px}}
.lens>div+div{{border-left:1px solid var(--line)}}
.rot{{font-family:var(--disp);font-weight:600;font-size:13px;letter-spacing:.14em;
     text-transform:uppercase;color:var(--red);margin-bottom:11px}}
.pessoa{{display:flex;gap:18px;align-items:flex-start}}
.av{{width:64px;height:64px;border-radius:50%;background:var(--okbg);color:var(--ok);
    display:grid;place-items:center;font-size:30px;flex:none;border:2px solid var(--ok)}}
.pessoa h3{{font-family:var(--disp);font-weight:700;font-size:23px;line-height:1.2}}
.pessoa .papel{{font-size:15px;color:var(--muted);margin-top:5px;line-height:1.45}}
.desc{{font-size:14.5px;line-height:1.55;color:var(--ink);margin-top:14px}}
.cen p{{font-size:16px;line-height:1.6}}
.cen p+p{{margin-top:11px}}
.exp ul{{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:8px 22px}}
.exp li{{font-size:14.5px;line-height:1.45;padding-left:17px;position:relative}}
.exp li::before{{content:"";position:absolute;left:0;top:8px;width:7px;height:7px;
                border-radius:50%;background:var(--ok)}}

/* ---- banda do princípio ---- */
.prin{{margin-top:22px;background:var(--ink);color:#F4EFE5;border-radius:16px;padding:30px 34px}}
.prin-top{{display:grid;grid-template-columns:760px 1fr;gap:34px;align-items:start}}
.rot.claro{{color:#E9A79A}}
.prin h2{{font-family:var(--disp);font-weight:700;font-size:40px;letter-spacing:-.02em;line-height:1.05}}
.tese{{font-size:16px;line-height:1.62;color:#D8D1C4;margin-top:14px}}
.portas{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}}
.porta{{background:#3A352E;border-radius:12px;padding:18px 20px;border-top:5px solid var(--ok)}}
.porta.novo{{border-top-color:#D9A43B}}
.porta-h{{display:flex;align-items:center;gap:10px;margin-bottom:9px}}
.pn{{font-family:var(--disp);font-weight:700;font-size:15px;width:29px;height:29px;border-radius:50%;
    display:grid;place-items:center;background:#F4EFE5;color:var(--ink);flex:none}}
.pe{{font-family:var(--disp);font-weight:600;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;
    padding:4px 9px;border-radius:5px}}
.pe.ok{{background:var(--okbg);color:#33501C}}
.pe.novo{{background:#F7E4BC;color:#6E4E0E}}
.porta h4{{font-family:var(--disp);font-weight:700;font-size:20px;line-height:1.2;margin-bottom:7px}}
.porta p{{font-size:13.6px;line-height:1.5;color:#CFC8BB}}
.prin-bot{{display:grid;grid-template-columns:1fr 760px;gap:34px;margin-top:26px;
          border-top:1px solid #4A443B;padding-top:22px;align-items:start}}
.regras{{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:12px 26px}}
.regras li{{font-size:14px;line-height:1.48;padding-left:18px;position:relative;color:#E4DDD0}}
.regras li::before{{content:"";position:absolute;left:0;top:7px;width:8px;height:8px;
                   border-radius:2px;background:#E9A79A}}
.cond{{background:#4A2B26;border:1px solid #8A473C;border-radius:11px;padding:16px 19px;
      font-size:13.8px;line-height:1.52;color:#F3DAD4}}
.cond b{{font-family:var(--disp);font-weight:700;color:#FFD9D0;display:block;margin-bottom:5px;
        font-size:12px;letter-spacing:.1em;text-transform:uppercase}}

.grade{{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-top:22px}}
.col{{background:var(--card);border:1px solid var(--line);border-radius:14px;
     overflow:hidden;display:flex;flex-direction:column}}
.col-h{{background:var(--ink);color:#F4EFE5;padding:16px 18px 14px;text-align:center}}
.num{{display:block;font-family:var(--disp);font-weight:600;font-size:13px;
     letter-spacing:.16em;color:var(--red);filter:brightness(1.7)}}
.cnome{{display:block;font-family:var(--disp);font-weight:700;font-size:19.5px;
       line-height:1.22;margin-top:5px;text-wrap:balance}}
.emo{{background:var(--card2);border-bottom:1px solid var(--line);padding:14px 18px;
     display:flex;gap:12px;align-items:flex-start;min-height:104px}}
.emoji{{font-size:31px;line-height:1;flex:none}}
.etxt{{font-size:13px;line-height:1.42;color:var(--muted)}}
.acoes{{list-style:none;padding:16px 18px;display:flex;flex-direction:column;gap:11px;flex:1}}
.b{{font-size:13.4px;line-height:1.46}}
.b.hoje{{padding-left:15px;position:relative;color:var(--ink)}}
.b.hoje::before{{content:"";position:absolute;left:0;top:7px;width:6px;height:6px;
                border-radius:50%;background:var(--line)}}
.chip{{display:inline-block;font-family:var(--disp);font-weight:600;font-size:10.5px;
      letter-spacing:.07em;text-transform:uppercase;padding:3px 8px;border-radius:5px;
      margin-right:7px;vertical-align:1px;white-space:nowrap}}
.chip.entra{{background:var(--okbg);color:var(--ok)}}
.chip.falta,.chip.nao{{background:var(--redsoft);color:var(--red)}}
.chip.guarda{{background:var(--ambbg);color:var(--amb)}}
.chip.rede{{background:var(--bluebg);color:var(--blue)}}
.b.entra{{background:#F3F8EC;border-left:3px solid var(--ok);padding:9px 11px;border-radius:0 7px 7px 0}}
.b.falta,.b.nao{{background:#FCF4F2;border-left:3px solid var(--red);padding:9px 11px;border-radius:0 7px 7px 0}}
.b.guarda{{background:#FDF8EE;border-left:3px solid var(--amb);padding:9px 11px;border-radius:0 7px 7px 0}}
.b.rede{{background:#EFF5F9;border-left:3px solid var(--blue);padding:9px 11px;border-radius:0 7px 7px 0}}
.quote{{margin:0 18px 18px;padding:14px 16px;border-radius:10px;font-style:italic;
       font-size:13.4px;line-height:1.5}}
.quote.conf{{background:var(--okbg);border:1px solid var(--ok);color:#33501C}}
.quote.aten{{background:var(--redsoft);border:1px solid var(--red);color:#7E2A20}}
.quote .fonte{{display:block;font-style:normal;font-size:10.5px;letter-spacing:.03em;
              margin-top:9px;opacity:.75;font-family:var(--disp);font-weight:500}}

.legenda{{background:var(--ink);color:#C9C0B2;border-radius:12px;margin-top:18px;
         padding:15px 30px;display:flex;align-items:center;gap:26px;font-size:13.5px;flex-wrap:wrap}}
.pt{{display:inline-flex;align-items:center;gap:9px}}
.pt i{{width:11px;height:11px;border-radius:50%;display:block}}
.dir{{margin-left:auto;font-family:var(--disp);font-weight:500}}

.insights{{margin-top:26px}}
.ih{{font-family:var(--disp);font-weight:700;font-size:27px;margin-bottom:5px}}
.isub{{font-size:15.5px;color:var(--muted);margin-bottom:17px}}
.mvs{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}}
.mv{{background:var(--card);border:1px solid var(--line);border-left:5px solid var(--amb);
    border-radius:0 12px 12px 0;padding:19px 22px}}
.mv-n{{font-family:var(--disp);font-weight:600;font-size:12px;letter-spacing:.14em;color:var(--amb)}}
.mv h4{{font-family:var(--disp);font-weight:700;font-size:18px;line-height:1.28;margin:6px 0 9px}}
.mv p{{font-size:13.6px;line-height:1.52;color:#4A443B}}

.rodape{{margin-top:24px;font-size:13px;color:var(--muted);line-height:1.55;
        border-top:1px solid var(--line);padding-top:16px;display:flex;gap:40px}}
.rodape b{{color:var(--ink);font-weight:600}}
</style></head><body>

<div class="topo">
  <div class="marca">P</div>
  <div>
    <h1>Jornada de Usuário — {html.escape(J['titulo'])}</h1>
    <div class="sub">Instituto Ebenézer · Desafio B (Monitoramento de Impacto) · Produto: <b>Percurso</b> · Grupo 06</div>
  </div>
  <div class="selo">JORNADA ATUAL<small>levantada em campo · 29/08/2026</small></div>
</div>

<div class="lens">
  <div>
    <div class="rot">Quem</div>
    <div class="pessoa">
      <div class="av">◔</div>
      <div>
        <h3>{html.escape(J['persona']['nome'])}</h3>
        <div class="papel">{html.escape(J['persona']['papel'])}</div>
      </div>
    </div>
    <div class="desc">{html.escape(J['persona']['descricao'])}</div>
  </div>
  <div class="cen">
    <div class="rot">Cenário</div>
    {paras(J['cenario'])}
  </div>
  <div class="exp">
    <div class="rot">O que ela espera de qualquer solução</div>
    <ul>{exp}</ul>
  </div>
</div>

<div class="prin">
  <div class="prin-top">
    <div>
      <div class="rot claro">O princípio que atravessa a jornada inteira</div>
      <h2>{html.escape(P['titulo'])}</h2>
      <p class="tese">{html.escape(P['tese'])}</p>
    </div>
    <div class="portas">{''.join(portas)}</div>
  </div>
  <div class="prin-bot">
    <ul class="regras">{regras}</ul>
    <div class="cond"><b>A condição inegociável</b>{html.escape(P['condicao'])}</div>
  </div>
</div>

<div class="grade">{''.join(cols)}</div>

<div class="legenda">
  <span class="pt"><i style="background:#B5D48C"></i> momento de confiança / o que já funciona</span>
  <span class="pt"><i style="background:#E4796A"></i> ponto de atenção / onde trava</span>
  <span class="pt"><i style="background:#DCE9CA;border:1px solid #4A6B2A"></i> onde o Percurso entra</span>
  <span class="pt"><i style="background:#DBE7EF;border:1px solid #2A5570"></i> a rede: o que acontece se ela não registrar nada</span>
  <span class="pt"><i style="background:#F4DCD7;border:1px solid #B0392C"></i> onde ele ainda não entra</span>
  <span class="dir">Modelo de 3 zonas (Lens · Experience · Insights) — NN/g</span>
</div>

<div class="insights">
  <div class="ih">Momentos da verdade</div>
  <div class="isub">Os pontos em que a solução é aprovada ou reprovada na prática — cada um ancorado numa fala da visita.</div>
  <div class="mvs">{''.join(mvs)}</div>
</div>

<div class="rodape">
  <div style="flex:1"><b>Fonte.</b> Visita de campo ao Instituto Ebenézer em 29/08/2026, das 11h às 13h. Quatro gravações (97 min), transcritas e consolidadas. As seis falas citadas nesta jornada foram <b>conferidas uma a uma contra as transcrições originais</b> — todas literais.</div>
  <div style="flex:1"><b>Proteção.</b> Nenhum nome de criança e nenhum caso individual identificável aparece aqui. A persona é nomeada pelo papel, não pelo nome próprio — como a norma do conselho profissional exige dos relatórios da própria psicóloga.</div>
  <div style="flex:1"><b>Leitura.</b> A faixa escura é o princípio; as seis colunas são a jornada de hoje; a linha azul dentro de cada coluna é a rede de segurança — o que o sistema faz quando ela não registra nada. As portas marcadas <b>a construir</b> ainda não existem no MVP.</div>
</div>

</body></html>'''

open('jornada.html', 'w', encoding='utf-8').write(HTML)
print('jornada.html gerado —', len(HTML), 'bytes')
