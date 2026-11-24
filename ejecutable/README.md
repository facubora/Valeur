# Valeur como ejecutable

Un solo archivo que se abre con doble clic. No hace falta instalar Python, Node ni nada más.

| Sistema | Archivo | Cómo se abre |
|---|---|---|
| Windows 10 / 11 | `Valeur-Windows.exe` | Doble clic. Si aparece "Windows protegió su PC", tocá **Más información → Ejecutar de todas formas**. |
| Mac con chip Apple (M1 o posterior) | `Valeur-Mac.zip` | Descomprimí el zip y hacé clic derecho en `Valeur` → **Abrir** → **Abrir**. Si el Mac no lo deja, andá a **Ajustes del Sistema → Privacidad y seguridad** y tocá **Abrir igualmente**. |

Se abre una ventana negra con la dirección de la app y, al toque, el navegador en `http://localhost:5173`. **Para cerrar Valeur, cerrá esa ventana.** La primera vez puede tardar unos 10 segundos en arrancar.

Necesita internet, porque los datos de las cuentas están en Supabase y los precios vienen de Yahoo Finance.

Los avisos de Windows y del Mac aparecen porque el archivo no está firmado: un certificado de desarrollador se paga y esto es un proyecto escolar.

## Qué hay adentro

Es el mismo backend de precios (`valeur-backend/backend.py`), que además sirve la app ya compilada (`Valeur/dist`). El que arranca todo es [`valeur-backend/lanzador.py`](../valeur-backend/lanzador.py):

- Usa el puerto 5173 si está libre. Es la dirección que Supabase tiene autorizada para el mail de "recuperar contraseña".
- Escucha solo en esta compu (`127.0.0.1`).
- Abre el navegador.

La app se compila con `--mode ejecutable`, que toma `VITE_MARKET_API=/api` de [`Valeur/.env.ejecutable`](../Valeur/.env.ejecutable), así le pide los precios al mismo programa. La URL y la anon key de Supabase salen de `Valeur/.env.example`: son públicas y las protege el RLS. La service role key **no** va adentro, así que las alertas se revisan solo con la app abierta, igual que con `iniciar.sh`.

## Cómo se arma

Lo hace GitHub Actions ([`.github/workflows/ejecutable.yml`](../.github/workflows/ejecutable.yml)) en una máquina Windows y en una Mac. Antes de guardar cada archivo, lo abre y prueba que responda y que la app le pida los precios a `/api`.

- **En cada push** a `main` que toque la app: los dos archivos quedan en la pestaña **Actions** del repo, en la última corrida de "Ejecutable", dentro de **Artifacts**. Para bajarlos hay que estar logueado en GitHub.
- **Con un tag** `v*` crea además un **Release** con los dos archivos, que se bajan sin cuenta:

  ```bash
  git tag v1.0 && git push origin v1.0
  ```

Para armarlo a mano en tu compu (sale para tu mismo sistema):

```bash
cd Valeur && cp -n .env.example .env; npm run build -- --mode ejecutable && cd ..
pip install -r valeur-backend/requirements.txt pyinstaller pillow
pyinstaller --noconfirm ejecutable/valeur.spec     # → dist/Valeur (o dist/Valeur.exe)
```
