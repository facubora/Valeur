# Motor: convierte los bloques del manual en HTML con el formato del PDF original
import re, html, json, os
OUT, FIGS, TOC = [], [0], []
def t(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"//(.+?)//", r"<i>\1</i>", s)
    return s.replace("✔", '<span class="sy">✔</span>').replace("✘", '<span class="sy">✘</span>')
def add(x): OUT.append(x)
def sid(s): return "s" + re.sub(r"[^0-9A-Za-z]", "-", s)
_ol = [0]
def H1(title, key=None, big=False):
    k = key or title.split(".")[0]; TOC.append((1, title, sid(k))); add(f'<h1 id="{sid(k)}" class="{"big" if big else ""}">{t(title)}</h1>')
def H2(title):
    k = title.split(" ")[0]; TOC.append((2, title, sid(k))); add(f'<h2 id="{sid(k)}">{t(title)}</h2>')
def h3(s): add(f"<h3>{t(s)}</h3>")
def p(s, cls=""):
    if s.rstrip().endswith(":"): cls += " lead"  # no queda solo al final de la página
    add(f'<p class="{cls}">{t(s)}</p>')
def ul(*xs): add("<ul>" + "".join(f"<li>{t(x)}</li>" for x in xs) + "</ul>")
def ol(*xs, cont=False):
    start = _ol[0] + 1 if cont else 1; _ol[0] = start - 1 + len(xs)
    add('<ol class="pasos">' + "".join(f'<li><span class="n">{start+i}.</span>{t(x)}</li>' for i, x in enumerate(xs)) + "</ol>")
def els(*xs, start=1): add('<ol class="els">' + "".join(f'<li><b class="n">{start+i}.</b> {t(x)}</li>' for i, x in enumerate(xs)) + "</ol>")
SIZE = {}
DIM = json.load(open("dim.json")) if os.path.exists("dim.json") else {}
def ancho(name, w):
    css = DIM.get(name, [1280, 800])[0]  # los recortes van a una escala que se lea
    return min(w, round(css * 0.5)) if css < 1200 else w
def fig(name, cap, w=453):
    w = ancho(name, w)
    FIGS[0] += 1; add(f'<figure><img src="capturas/{name}.jpg" style="width:{w}pt"><figcaption>Figura {FIGS[0]} — {t(cap)}</figcaption></figure>')
def fig2(a, b, cap, w=158):
    FIGS[0] += 1; add(f'<figure><div class="par"><img src="capturas/{a}.jpg" style="width:{w}pt"><img src="capturas/{b}.jpg" style="width:{w}pt"></div><figcaption>Figura {FIGS[0]} — {t(cap)}</figcaption></figure>')
def figsvg(svg, cap):
    FIGS[0] += 1; add(f'<figure class="svg">{svg}<figcaption>Figura {FIGS[0]} — {t(cap)}</figcaption></figure>')
def nota(s): add(f'<div class="nota"><b>Nota:</b> {t(s)}</div>')
def detalle(s): add(f'<div class="detalle"><b>Detalle:</b> {t(s)}</div>')
def tabla(head, rows, widths, size=10, w=468):
    c = "".join(f'<col style="width:{x}%">' for x in widths)
    add(f'<table style="font-size:{size}pt;width:{w}pt"><colgroup>{c}</colgroup><thead><tr>' + "".join(f"<th>{t(h)}</th>" for h in head) + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{t(x)}</td>" for x in r) + "</tr>" for r in rows) + "</tbody></table>")
def win(nombre, direccion, para, quien, como):
    h3("1. Nombre de la ventana"); p(f"{nombre}  —  dirección: **{direccion}**")
    h3("2. Para qué sirve"); p(para)
    h3("3. Quién puede entrar"); p(quien)
    h3("4. Cómo se llega"); ul(*como)
    h3("5. Captura de pantalla anotada")
def elementos(): h3("6. Elementos de la pantalla")
def pasos(): h3("7. Cómo se usa, paso a paso")
def conecta(*xs): h3("8. Con qué se conecta"); ul(*xs)
CSS = """
@font-face{font-family:'DM Sans';font-style:italic;font-weight:400;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2rp2ywxg089UriCZaSExd86J3t9jz86Mvy4qCRAL19DksVat-JDW3z.ttf) format('truetype')}
@font-face{font-family:'DM Sans';font-style:normal;font-weight:400;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf) format('truetype')}
@font-face{font-family:'DM Sans';font-style:normal;font-weight:600;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAfJthTg.ttf) format('truetype')}
@font-face{font-family:'DM Sans';font-style:normal;font-weight:700;src:url(https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf) format('truetype')}
@page { size: 596pt 842pt; margin: 56pt 56.7pt 70pt 56.7pt;
  @bottom-center { content: "Manual de Usuario - Valeur"; font: 11pt 'DM Sans'; color:#000; vertical-align: top; padding-top: 22pt; }
  @bottom-right { content: counter(page); font: 11pt 'DM Sans'; color:#000; vertical-align: top; padding-top: 22pt; padding-right: 24pt; text-align:right } }
@page tapa { margin: 0; @bottom-center { content: none } @bottom-right { content: none } }
* { box-sizing: border-box } html,body { margin:0 }
body { font: 11pt/16.4pt 'DM Sans', sans-serif; color:#000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.tapa { page: tapa; width:596pt; height:841.5pt; overflow:hidden; break-after: page }
.tapa img { width:596pt; height:842pt; display:block }
h1 { font: 700 17pt/22pt 'DM Sans'; margin: 0 0 18pt; break-before: page; break-after: avoid }
h1.big { font-size:19pt; line-height:25pt; margin-bottom:16pt }
h2 { font: 700 14pt/18.5pt 'DM Sans'; margin: 22pt 0 9pt; break-after: avoid }
h1 + h2 { margin-top: 14pt }
h3 { font: 700 11pt/16.4pt 'DM Sans'; margin: 9pt 0 3pt; break-after: avoid }
p.lead { break-after: avoid }
p { margin: 0 0 6pt; orphans:2; widows:2 }
ul { list-style:none; margin: 2pt 0 6pt; padding:0 } ul li { position:relative; padding-left: 24pt; margin-bottom: 3.4pt; break-inside: avoid }
ul li::before { content:"•"; position:absolute; left: 12pt }
ol { list-style:none; margin: 2pt 0 6pt; padding:0 }
ol.pasos li { position:relative; padding-left: 24pt; margin-bottom: 4pt; break-inside: avoid } ol.pasos .n { position:absolute; left: 6pt; font-weight:700 }
ol.els { margin-top: 5pt } ol.els li { padding-left: 18pt; text-indent:-18pt; margin-bottom: 3.2pt; break-inside: avoid } ol.els .n { margin-right: 2pt }
figure { margin: 10pt 0 14pt; text-align:center; break-inside: avoid } figure img { display:block; margin: 0 auto; border: .6pt solid #e2e8f0 }
figure .par { display:flex; justify-content:center; gap: 26pt } figure .par img { margin:0 }
figcaption { font-size:10pt; line-height:15pt; margin-top: 7pt; padding: 0 10pt }
.nota,.detalle { margin: 10pt 0 12pt -5.5pt; padding: 1.5pt 6pt 1.5pt 8.5pt; border-left: 3pt solid #2563eb; background:#eff6ff; break-inside: avoid }
.detalle { border-color:#f59e0b; background:#fef3c7 }
table { border-collapse: collapse; margin: 4pt 0 16pt; table-layout: fixed; line-height:1.48 } thead { display: table-header-group } tr { break-inside: avoid }
th { background:#1e3a8a; color:#f8fafc; font-weight:700; text-align:left; padding: 2.6pt 5.5pt; border: 1pt solid #cbd5e1 }
td { padding: 2.6pt 5.5pt; border: 1pt solid #cbd5e1; vertical-align: middle; overflow-wrap: break-word } tbody tr:nth-child(even) td { background:#f8fafc }
.sy { font-family: 'Zapf Dingbats','Arial Unicode MS',sans-serif; font-size:.95em }
a { color:#1155cc; font-weight:700 }
.toc { margin-top: 4pt } .toc a { display:flex; align-items:baseline; color:#000; text-decoration:none; font-weight:400; font-size:10pt; line-height:15.1pt } .toc a.l1 { font-weight:700; font-size:11pt; margin-top: 6.5pt; line-height:16pt } .toc a.l2 { padding-left: 18pt } .toc .d { flex:1; border-bottom: .8pt dotted #94a3b8; margin: 0 6pt; transform: translateY(-3pt) }
figure.svg svg { width: 480pt; display:block; margin:0 auto }
"""
def build(path, pages=None):
    toc = ""
    for lv, title, i in TOC: toc += f'<a class="l{lv}" href="#{i}"><span>{t(title)}</span><span class="d"></span><span>{(pages or {}).get(i, "")}</span></a>'
    body = "".join(OUT).replace("@@TOC@@", toc)
    open(path, "w").write(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Valeur - Manual de usuario</title><style>{CSS}</style></head><body><div class="tapa"><img src="tapa.png"></div>{body}</body></html>')
