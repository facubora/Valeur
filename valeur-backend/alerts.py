# valeur/alerts.py — Revisa las alertas de precio de todos en el servidor
# La app también las revisa mientras está abierta; esto hace que avisen aunque
# nadie tenga Valeur abierto. Lee y escribe en Supabase con la service role
# key (salta el RLS), así que esa key solo vive en el .env del backend.
#
# Corre solo dentro de backend.py (un hilo cada ALERTS_EVERY segundos) o
# aparte: `python alerts.py` (en loop) o `python alerts.py --once`.

import os
import sys
import time
import threading
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
EVERY = max(60, int(os.getenv("ALERTS_EVERY", "180")))
AR = ZoneInfo("America/Argentina/Buenos_Aires")

USD_CEDEARS = {t + ".BA" for t in ["AAPLD", "TSLAD", "MSFTD", "NVDAD", "AMZND", "METAD", "NFLXD", "MELID", "KOD", "VISTD"]}


def configured():
    return bool(SUPABASE_URL and SERVICE_KEY)


# ─── Formato (igual que fmtPrice en el front) ────────────────────────────────

def _es(n, lo, hi):
    """Número con miles en punto y decimales en coma, entre lo y hi decimales"""
    s = f"{n:,.{hi}f}"
    if hi > lo:
        whole, _, dec = s.partition(".")
        dec = dec.rstrip("0").ljust(lo, "0")
        s = whole + ("." + dec if dec else "")
    return s.replace(",", "_").replace(".", ",").replace("_", ".")


def asset_kind(symbol):
    s = symbol.upper()
    if s in USD_CEDEARS:
        return "cedear-usd"
    if s.endswith(".BA"):
        return "cedear"
    if s.endswith("=X"):
        return "fx"
    if s.endswith(("-USD", "-USDT", "-ARS")):
        return "crypto"
    if s.startswith("^"):
        return "index"
    return "stock"


def fmt_price(symbol, n):
    kind = asset_kind(symbol)
    if kind == "fx":
        return _es(n, 2, 4)
    if kind == "index":
        return _es(n, 0, 0) + " pts"
    ars = kind == "cedear" or (kind == "crypto" and symbol.upper().endswith("-ARS"))
    return ("ARS " + _es(abs(n), 0, 0)) if ars else ("US$ " + _es(abs(n), 2, 2))


# ─── Reglas (igual que check/message en lib/alerts.js) ───────────────────────

def _day_ar(ts):
    """Fecha "YYYY-MM-DD" en Argentina de un timestamp de Supabase"""
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(AR).strftime("%Y-%m-%d")


def fires(a, q):
    if not q or not a.get("active"):
        return False
    v = float(a["value"])
    kind = a["kind"]
    if kind == "above":
        return q["price"] >= v
    if kind == "below":
        return q["price"] <= v
    if kind in ("up_pct", "down_pct"):
        # una vez por rueda: si ya avisó por esta sesión, no repetir
        if a.get("triggered_at") and _day_ar(a["triggered_at"]) >= q["latest_date"]:
            return False
        return q["change_pct"] >= v if kind == "up_pct" else q["change_pct"] <= -v
    return False


def message(a, q):
    sym = a["symbol"]
    pct = _es(abs(q["change_pct"]), 0, 2) + "%"
    now = fmt_price(sym, q["price"])
    kind = a["kind"]
    if kind == "above":
        return f"{sym} llegó a {fmt_price(sym, float(a['value']))}", f"Ahora cotiza a {now}."
    if kind == "below":
        return f"{sym} bajó a {fmt_price(sym, float(a['value']))}", f"Ahora cotiza a {now}."
    if kind == "up_pct":
        return f"{sym} sube {pct} hoy", f"Cotiza a {now}."
    return f"{sym} cae {pct} hoy", f"Cotiza a {now}."


# ─── Supabase (PostgREST con la service role key) ────────────────────────────

def _rest(method, table, params=None, json=None, prefer=None):
    headers = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}
    if prefer:
        headers["Prefer"] = prefer
    r = requests.request(method, f"{SUPABASE_URL}/rest/v1/{table}", params=params, json=json, headers=headers, timeout=20)
    r.raise_for_status()
    return r.json() if r.content else None


def claim(a):
    """Marca la alerta como disparada solo si nadie lo hizo antes (otra
    vuelta, otra instancia o la app abierta): si devuelve la fila, es nuestra"""
    one_shot = a["kind"] in ("above", "below")
    params = {"id": "eq." + a["id"], "active": "eq.true", "select": "id"}
    params["triggered_at"] = ("eq." + a["triggered_at"]) if a.get("triggered_at") else "is.null"
    body = {"triggered_at": datetime.now(timezone.utc).isoformat()}
    if one_shot:
        body["active"] = False
    return bool(_rest("PATCH", "alerts", params=params, json=body, prefer="return=representation"))


def run_once(fetch_quotes):
    """Una vuelta: trae las alertas activas, los precios, y avisa las que se
    cumplen. Devuelve cuántas avisó."""
    alerts = _rest("GET", "alerts", params={"active": "eq.true", "select": "id,user_id,symbol,kind,value,active,triggered_at"}) or []
    if not alerts:
        return 0
    symbols = sorted({a["symbol"] for a in alerts})
    quotes = {}
    for i in range(0, len(symbols), 60):
        quotes.update(fetch_quotes(symbols[i:i + 60]))
    sent = 0
    for a in alerts:
        q = quotes.get(a["symbol"])
        if not fires(a, q) or not claim(a):
            continue
        title, body = message(a, q)
        _rest("POST", "notifications", json={
            "user_id": a["user_id"],
            "kind": "alert",
            "title": title,
            "body": body,
            "symbol": a["symbol"],
            "link": "/tickersearch?symbol=" + requests.utils.quote(a["symbol"], safe=""),
        }, prefer="return=minimal")
        sent += 1
    return sent


def _loop(fetch_quotes):
    while True:
        try:
            n = run_once(fetch_quotes)
            if n:
                print(f"[alertas] {n} aviso(s) enviados", flush=True)
        except Exception as e:  # una vuelta que falla no corta las siguientes
            print(f"[alertas] falló la vuelta: {e}", file=sys.stderr, flush=True)
        time.sleep(EVERY)


def start(fetch_quotes):
    """Arranca el hilo que revisa las alertas (si hay keys)"""
    if not configured():
        print("[alertas] sin SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: solo se revisan con la app abierta", flush=True)
        return None
    t = threading.Thread(target=_loop, args=(fetch_quotes,), name="alertas", daemon=True)
    t.start()
    print(f"[alertas] revisando cada {EVERY} s", flush=True)
    return t


if __name__ == "__main__":
    from backend import fetch_quotes

    if not configured():
        sys.exit("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env")
    if "--once" in sys.argv:
        print(f"[alertas] {run_once(fetch_quotes)} aviso(s) enviados")
    else:
        _loop(fetch_quotes)
