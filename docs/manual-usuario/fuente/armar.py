# Arma el PDF: dos pasadas para que el índice tenga los números de página reales
import json, subprocess, sys, os
from pypdf import PdfReader
import motor, parte1, parte2, parte3
OUT = sys.argv[1] if len(sys.argv) > 1 else "manual.pdf"
def pdf(): subprocess.run(["node", "imprimir.mjs", "manual.html", OUT], check=True)
motor.build("manual.html"); pdf()
def pages():
    r = PdfReader(OUT); d = {}
    for k, v in r.named_destinations.items(): d[k.lstrip("/")] = r.get_destination_page_number(v) + 1
    return d
pg = pages(); motor.build("manual.html", pg); pdf(); pg2 = pages()
if pg2 != pg: motor.build("manual.html", pg2); pdf()
print(len(PdfReader(OUT).pages), "páginas,", motor.FIGS[0], "figuras", [i for *_, i in motor.TOC if i not in pg2])
