# valeur/lanzador.py — Valeur en un solo programa (lo que corre el ejecutable).
# El mismo backend de precios sirve además la app ya compilada (Valeur/dist),
# así no hace falta Node ni Python en la compu: se abre el navegador solo.
#
#   Probarlo sin empaquetar:  (cd ../Valeur && npm run build -- --mode ejecutable)
#                             python lanzador.py
#   Empaquetarlo:             ver ../ejecutable/README.md

import logging
import os
import socket
import sys
import threading
import webbrowser

from flask import abort, send_from_directory
from werkzeug.serving import make_server

# Con PyInstaller los archivos van dentro del ejecutable (sys._MEIPASS);
# sin empaquetar, la app compilada está al lado, en ../Valeur/dist
if getattr(sys, "frozen", False):
    WEB = os.path.join(sys._MEIPASS, "web")
else:
    WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Valeur", "dist")

# 5173 primero: es la dirección que Supabase tiene autorizada para volver
# del mail de "recuperar contraseña". Si está ocupado, cualquiera libre.
PUERTOS = [5173, 5180, 5181, 5182, 0]

from backend import app  # noqa: E402  (después de fijar las rutas)


@app.route("/", defaults={"ruta": ""})
@app.route("/<path:ruta>")
def web(ruta):
    """La app compilada: el archivo si existe; si no, index.html (rutas de React)"""
    if ruta.startswith("api/"):
        abort(404)
    if ruta and os.path.isfile(os.path.join(WEB, ruta)):
        resp = send_from_directory(WEB, ruta)
        if ruta.startswith("assets/"):
            # llevan un hash en el nombre: nunca cambian
            resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return resp
    return send_from_directory(WEB, "index.html")


def ocupado(puerto):
    """Algo ya atiende en localhost:puerto (por IPv4 o IPv6)"""
    for host in ("127.0.0.1", "::1"):
        try:
            socket.create_connection((host, puerto), timeout=0.3).close()
            return True
        except OSError:
            pass
    return False


def servidor():
    """El primer puerto libre de PUERTOS, solo en esta compu"""
    for puerto in PUERTOS:
        if puerto and ocupado(puerto):
            continue  # si no, el navegador podría terminar en otro programa
        try:
            return make_server("127.0.0.1", puerto, app, threaded=True)
        except (OSError, SystemExit):
            continue
    raise SystemExit("No hay ningún puerto libre para abrir Valeur")


def main():
    logging.basicConfig(level=logging.WARNING, format="[%(name)s] %(message)s")
    logging.getLogger("werkzeug").setLevel(logging.ERROR)  # sin una línea por pedido

    if not os.path.isfile(os.path.join(WEB, "index.html")):
        raise SystemExit(f"No encuentro la app compilada en {WEB}")

    srv = servidor()
    url = f"http://localhost:{srv.server_port}"
    print(flush=True)
    print("  Valeur está abierta en " + url, flush=True)
    print("  Si el navegador no se abrió solo, copiá esa dirección.", flush=True)
    print("  Para cerrar Valeur, cerrá esta ventana (o Ctrl+C).", flush=True)
    print(flush=True)
    threading.Timer(1.0, webbrowser.open, args=(url,)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
