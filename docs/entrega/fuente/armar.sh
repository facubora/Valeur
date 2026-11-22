#!/usr/bin/env bash
# Arma los PDF de la entrega a partir de estos HTML (los diagramas son Mermaid).
#   ./armar.sh            → ../TP3 - Documento de Arquitectura.pdf y ../Manual Técnico - Testing y Seguridad.pdf
# Necesita Google Chrome y Node (baja Mermaid a una carpeta temporal).
set -e
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"
( cd "$TMP" && npm init -y >/dev/null && npm i mermaid@11 --silent --no-fund --no-audit )
cp "$TMP/node_modules/mermaid/dist/mermaid.min.js" ./mermaid.min.js
for pair in "arquitectura.html:TP3 - Documento de Arquitectura.pdf" "manual-tecnico.html:Manual Técnico - Testing y Seguridad.pdf"; do
  src="${pair%%:*}"; out="../${pair#*:}"
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --allow-file-access-from-files \
    --virtual-time-budget=20000 --run-all-compositor-stages-before-draw \
    --print-to-pdf="$out" "file://$PWD/$src" 2>/dev/null
  echo "listo: $out"
done
rm -rf "$TMP" mermaid.min.js
