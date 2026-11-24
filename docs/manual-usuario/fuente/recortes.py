# Recorta lo que sobra abajo, achica y guarda el tamaño de cada captura
import json, re, subprocess, os, glob
H = {"portfolio-operaciones-a":650,"portfolio-borrar":620,"portfolio-nosepuede":620,"alertas-a":560,"alertas-avisaron":420,"alertas-editar-a":690,"inicio-seg-a":470,"inicio-seg-confirma":470,"activo-noexiste":480,"perfil-privado":440,"comunidad-perfil-a":600,"comunidad-confirma":650,"simulador-ideas":440,"admin-a":780,"admin-reportes-a":640,"activo-comunidad-a":600,"e404-a":580,"calendario-a":700,"portfolio-posiciones-a":680,"mercado-rubro-a":740,"activo-rubro-a":460,"comunidad-dejar":560,"comunidad-reportar-a":560,"comunidad-borrar":560,"registro-mail":800}
used = set()
for f in glob.glob("parte*.py"):
    for m in re.finditer(r'fig(2?)\("([\w-]+)"(?:, "([\w-]+)")?', open(f).read()):
        used.add(m[2]); m[1] and used.add(m[3])
dim = {}
os.makedirs("capturas", exist_ok=True)
for n in sorted(used):
    src, dst = f"capturar/shots/{n}.jpg", f"capturas/{n}.jpg"
    o = subprocess.run(["sips","-g","pixelWidth","-g","pixelHeight",src],capture_output=True,text=True).stdout
    w, h = [int(x) for x in re.findall(r": (\d+)", o)]
    k = 3 if w == 1170 else 2
    subprocess.run(["cp", src, dst])
    if n in H and w == 2560 and H[n]*2 < h:
        subprocess.run(["sips","-c",str(H[n]*2),str(w),"--cropOffset","1","1",dst],capture_output=True); h = H[n]*2
    dim[n] = [w//k, h//k]
    mx = 1560 if w >= 2000 else min(max(w, h), 1400)
    if w >= h: subprocess.run(["sips","--resampleWidth",str(min(w,1400)),"-s","formatOptions","68",dst],capture_output=True)
    else: subprocess.run(["sips","--resampleWidth",str(min(w,900)),"-s","formatOptions","68",dst],capture_output=True)
json.dump(dim, open("dim.json","w"))
print(len(used), "capturas")
