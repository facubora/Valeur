# Manual de usuario: cómo se arma

El texto está en `parte1.py` (introducción y visitante), `parte2.py` (usuario registrado y admin) y `parte3.py` (flujos, problemas, FAQ, glosario y anexos). El formato está en `motor.py`.

Para volver a armar el PDF después de tocar un texto (necesita Google Chrome, Node 22+ y `pip install pypdf`):

```bash
python3 armar.py "../Valeur - Manual de usuario.pdf"
```

En `capturar/` están el Supabase de mentira (`server.mjs`) y los scripts con los que se sacaron las capturas; `recortes.py` las recorta y achica.
