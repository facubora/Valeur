# valeur/events.py — Próximos resultados y dividendos de las empresas.
#
# Yahoo da, por empresa, la fecha del próximo balance (con lo que esperan los
# analistas) y las fechas de corte y de pago del dividendo. Los CEDEARs y las
# acciones argentinas no las traen, así que se piden a la acción de origen
# (AAPL.BA → AAPL, GGAL.BA → GGAL, YPFD.BA → YPF). Cripto, monedas, índices y
# ETFs no tienen.
#
# GET /api/events?symbols=A,B,…  → los eventos de los próximos 120 días
# Además, avisa el día antes a quien tiene o sigue la empresa (lo llama el
# hilo de las alertas una vez por día).

import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import yfinance as yf
from flask import jsonify, request

import supa
from alerts import USD_CEDEARS, asset_kind

AR = ZoneInfo("America/Argentina/Buenos_Aires")
TTL = 6 * 3600
AHEAD = 120  # días para adelante
_cache = {}  # acción de origen → (cuándo, eventos)

# cuando el ticker de acá no es el de la acción de origen: acciones argentinas
# con ADR de otro nombre y CEDEARs con otro ticker (los del catálogo del front)
ADR = {
    "YPFD": "YPF", "PAMP": "PAM", "TECO2": "TEO", "TGSU2": "TGS", "CRES": "CRESY", "IRSA": "IRS",
    "DISN": "DIS", "BRKB": "BRK-B",
}


def underlying(symbol):
    """La acción de la que salen los eventos (o None si no tiene)"""
    s = symbol.upper()
    kind = asset_kind(s)
    if kind in ("crypto", "fx", "index"):
        return None
    if s.endswith(".BA"):
        base = s[:-3]
        if s in USD_CEDEARS:
            base = base[:-1]  # AAPLD.BA → AAPL
        return ADR.get(base, base)
    return s


def _today():
    return datetime.now(AR).date()


def _fetch(base):
    """Eventos de una empresa (con caché de unas horas)"""
    hit = _cache.get(base)
    if hit and time.time() - hit[0] < TTL:
        return hit[1]
    out = []
    try:
        t = yf.Ticker(base)
        cal = t.calendar or {}
    except Exception:
        cal = {}
    today = _today()
    horizon = today + timedelta(days=AHEAD)

    def ok(d):
        return isinstance(d, date) and today - timedelta(days=1) <= d <= horizon

    earnings = [d for d in (cal.get("Earnings Date") or []) if ok(d)]
    if earnings:
        out.append({
            "kind": "earnings",
            "date": earnings[0].isoformat(),
            "eps": cal.get("Earnings Average"),
            "revenue": cal.get("Revenue Average"),
        })
    exdiv, pay = cal.get("Ex-Dividend Date"), cal.get("Dividend Date")
    if ok(exdiv) or ok(pay):
        amount = None
        try:
            divs = t.dividends
            if len(divs):
                amount = round(float(divs.iloc[-1]), 4)
        except Exception:
            pass
        if ok(exdiv):
            out.append({"kind": "exdiv", "date": exdiv.isoformat(), "amount": amount})
        if ok(pay):
            out.append({"kind": "divpay", "date": pay.isoformat(), "amount": amount})
    _cache[base] = (time.time(), out)
    return out


def events_for(symbols):
    """{símbolo: [eventos]} para cada símbolo que tenga (pidiendo en paralelo)"""
    bases = {s: underlying(s) for s in symbols}
    wanted = sorted({b for b in bases.values() if b})
    with ThreadPoolExecutor(max_workers=8) as pool:
        got = dict(zip(wanted, pool.map(_fetch, wanted)))
    return {s: [dict(e, base=b) for e in got.get(b, [])] for s, b in bases.items() if b and got.get(b)}


def register(app, valid_symbol):
    @app.route("/api/events")
    def get_events():
        symbols = [s.strip().upper() for s in request.args.get("symbols", "").split(",") if s.strip()]
        symbols = [s for s in dict.fromkeys(symbols) if valid_symbol(s)][:60]
        if not symbols:
            return jsonify({"events": []})
        by = events_for(symbols)
        flat = [dict(e, symbol=s) for s, evs in by.items() for e in evs]
        flat.sort(key=lambda e: (e["date"], e["symbol"]))
        return jsonify({"events": flat, "today": _today().isoformat()})


# ─── Aviso del día antes ──────────────────────────────────────────────────────

def _money(n):
    s = f"{n:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    return "US$ " + s


def _notice(kind, symbol, e):
    if kind == "earnings":
        body = f"Esperan una ganancia de {_money(e['eps'])} por acción." if e.get("eps") else "Mirá cómo reacciona el precio."
        return f"{symbol} presenta resultados mañana", body
    amount = f" El último fue de {_money(e['amount'])} por acción." if e.get("amount") else ""
    return f"Mañana corta el dividendo de {symbol}", "Para cobrarlo hay que tenerla hoy al cierre." + amount


def notify_tomorrow():
    """Avisa a cada uno de los resultados y cortes de dividendo de mañana de
    lo que tiene o sigue. event_notices evita avisar dos veces lo mismo."""
    if not supa.configured():
        return 0
    trades = supa.rest("GET", "trades", params={"select": "user_id,symbol,side,qty"}) or []
    watch = supa.rest("GET", "watchlist", params={"select": "user_id,symbol"}) or []
    owned = {}
    for t in trades:
        k = (t["user_id"], t["symbol"])
        owned[k] = owned.get(k, 0) + float(t["qty"]) * (1 if t["side"] == "buy" else -1)
    pairs = {k for k, q in owned.items() if q > 1e-9} | {(w["user_id"], w["symbol"]) for w in watch}
    if not pairs:
        return 0
    tomorrow = (_today() + timedelta(days=1)).isoformat()
    by = events_for(sorted({s for _, s in pairs}))
    sent = 0
    for uid, sym in sorted(pairs):
        for e in by.get(sym, []):
            if e["date"] != tomorrow or e["kind"] not in ("earnings", "exdiv"):
                continue
            # si ya se avisó (por este u otro símbolo de la misma empresa), no se repite
            got = supa.rest("POST", "event_notices", json={"user_id": uid, "base": e["base"], "kind": e["kind"], "day": e["date"]},
                            prefer="return=representation,resolution=ignore-duplicates")
            if not got:
                continue
            title, body = _notice(e["kind"], sym, e)
            supa.rest("POST", "notifications", json={
                "user_id": uid, "kind": "event", "title": title, "body": body, "symbol": sym, "link": "/calendario",
            }, prefer="return=minimal")
            sent += 1
    return sent


_last_day = {"d": None}


def daily(now=None):
    """Lo llama el hilo de las alertas en cada vuelta: avisa una vez por día,
    desde las 10 de la mañana (hora argentina)"""
    now = now or datetime.now(AR)
    if now.hour < 10 or _last_day["d"] == now.date():
        return 0
    _last_day["d"] = now.date()
    return notify_tomorrow()
