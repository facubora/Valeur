# PyInstaller: arma Valeur en un solo archivo (Valeur.exe en Windows, Valeur en Mac).
# Antes hay que compilar la app con la API en el mismo sitio:
#   cd Valeur && npm run build -- --mode ejecutable
# y después, desde la raíz del repo:
#   pyinstaller ejecutable/valeur.spec
# Lo hace solo el workflow .github/workflows/ejecutable.yml (ver ejecutable/README.md).
import os
from PyInstaller.utils.hooks import collect_all

RAIZ = os.path.abspath(os.path.join(SPECPATH, ".."))
BACK = os.path.join(RAIZ, "valeur-backend")

datas = [(os.path.join(RAIZ, "Valeur", "dist"), "web")]
binaries = []
hiddenimports = ["backend", "events", "alerts", "supa"]
# yfinance pide sus datos a Yahoo con curl_cffi (librería nativa) y usa las
# zonas horarias de tzdata en Windows: van enteros para que no falte nada
for paquete in ("curl_cffi", "yfinance", "tzdata"):
    d, b, h = collect_all(paquete)
    datas += d
    binaries += b
    hiddenimports += h

a = Analysis(
    [os.path.join(BACK, "lanzador.py")],
    pathex=[BACK],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    excludes=["tkinter", "matplotlib", "IPython", "pytest"],
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    name="Valeur",
    # el ícono de la app (PyInstaller lo pasa a .ico con Pillow; en Mac no aplica)
    icon=os.path.join(RAIZ, "Valeur", "public", "icon-512.png") if os.name == "nt" else None,
    console=True,  # la ventanita negra: muestra la dirección y al cerrarla se cierra Valeur
    upx=False,
)
