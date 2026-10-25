# valeur/practice.py — Modo práctica: comprar y vender con plata de mentira
# al precio real del momento, y el ranking de todos (o de tus amigos).
#
# El precio lo pone el backend (no el navegador), así el ranking es justo. La
# cuenta arranca con US$ 10.000; los CEDEARs y lo que cotiza en pesos se pasan
# a dólares al MEP del momento. Sin comisiones.

import time

from flask import jsonify, request

import supa
from alerts import asset_kind

START = 10000.0
RANK_TTL = 60
_rank_cache = {"at": 0, "rows": None}
_tokens = {}  # access token → (user id, hasta cuándo vale)


def _uid():
    """El usuario del pedido, por su access token de Supabase (con caché corto)"""
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if not token:
        return None
    hit = _tokens.get(token)
    if hit and hit[1] > time.time():
        return hit[0]
    uid = supa.user_from_token(token)
    if uid:
        if len(_tokens) > 500:
            _tokens.clear()
        _tokens[token] = (uid, time.time() + 300)
    return uid


def _err(msg, code=400):
    return jsonify({"error": msg}), code


def _in_ars(symbol):
    kind = asset_kind(symbol)
    return kind == "cedear" or (kind == "crypto" and symbol.endswith("-ARS"))


def register(app, fetch_quotes, mep_rate, valid_symbol):
    def usd_price(symbol, price):
        """Precio por unidad en dólares (al MEP si cotiza en pesos)"""
        if not _in_ars(symbol):
            return price
        rate = mep_rate()
        return price / rate if rate else None

    @app.route("/api/practice/trade", methods=["POST"])
    def practice_trade():
        if not supa.configured():
            return _err("El modo práctica necesita las keys de Supabase en el backend", 503)
        uid = _uid()
        if not uid:
            return _err("Iniciá sesión de nuevo", 401)
        body = request.get_json(silent=True) or {}
        symbol = str(body.get("symbol", "")).strip().upper()
        side = body.get("side")
        if not valid_symbol(symbol) or side not in ("buy", "sell"):
            return _err("Pedido inválido")
        if asset_kind(symbol) in ("index", "fx"):
            return _err("Los índices y las monedas no se pueden comprar")

        q = fetch_quotes([symbol]).get(symbol)
        if not q:
            return _err(f"No encontramos la cotización de {symbol}", 404)
        price = float(q["price"])
        p_usd = usd_price(symbol, price)
        if not p_usd:
            return _err("No pudimos calcular el dólar MEP. Probá en un rato", 502)

        try:
            if side == "buy":
                amount = float(body.get("amount") or 0)
                if not 1 <= amount <= 1e9:
                    return _err("Poné cuántos dólares querés invertir")
                qty = round(amount / p_usd, 8)
            elif body.get("all"):
                rows = supa.rest("GET", "practice_trades", params={"user_id": "eq." + uid, "symbol": "eq." + symbol, "select": "side,qty"}) or []
                qty = round(sum(float(r["qty"]) * (1 if r["side"] == "buy" else -1) for r in rows), 8)
                if qty <= 0:
                    return _err(f"No tenés {symbol}")
            else:
                qty = round(float(body.get("qty") or 0), 8)
                if qty <= 0:
                    return _err("Poné cuántas querés vender")
        except (TypeError, ValueError):
            return _err("Pedido inválido")

        try:
            out = supa.rpc("practice_execute", {
                "p_user": uid,
                "p_symbol": symbol,
                "p_name": (str(body.get("name") or "")[:80] or None),
                "p_side": side,
                "p_qty": qty,
                "p_price": price,
                "p_price_usd": round(p_usd, 6),
            })
        except supa.RpcError as e:
            msg = {
                "no alcanza el efectivo": "No te alcanza el efectivo",
                "no tenes tantas": f"No tenés tantas {symbol}",
                "sin cuenta de practica": "Primero empezá el modo práctica",
            }.get(e.message)
            return _err(msg or "No se pudo operar", 400 if msg else 502)
        except Exception as e:
            return _err(str(e), 502)
        _rank_cache["at"] = 0  # el ranking cambia
        return jsonify(out)

    def board():
        """Todos los jugadores valuados a precio de ahora (con caché corto)"""
        if _rank_cache["rows"] is not None and time.time() - _rank_cache["at"] < RANK_TTL:
            return _rank_cache["rows"]
        rows = supa.rpc("practice_board") or []
        symbols = sorted({r["symbol"] for r in rows if r.get("symbol")})
        quotes = {}
        for i in range(0, len(symbols), 60):
            quotes.update(fetch_quotes(symbols[i:i + 60]))
        players = {}
        for r in rows:
            p = players.setdefault(r["user_id"], {
                "user_id": r["user_id"],
                "username": r["username"],
                "display_name": r["display_name"],
                "verified": r["verified"],
                "verified_label": r["verified_label"],
                "cash": float(r["cash"]),
                "started_at": r["started_at"],
                "trades": r["trades"],
                "value": float(r["cash"]),
                "positions": 0,
                "top": None,
            })
            if not r.get("symbol"):
                continue
            q = quotes.get(r["symbol"])
            p_usd = usd_price(r["symbol"], float(q["price"])) if q else None
            if p_usd:
                worth = float(r["qty"]) * p_usd
                p["value"] += worth
                p["positions"] += 1
                if not p["top"] or worth > p["top"][1]:
                    p["top"] = (r["symbol"], worth)
        out = sorted(players.values(), key=lambda p: p["value"], reverse=True)
        for p in out:
            p["pct"] = (p["value"] / START - 1) * 100
            p["top"] = p["top"][0] if p["top"] else None
        _rank_cache.update(at=time.time(), rows=out)
        return out

    @app.route("/api/practice/ranking")
    def practice_ranking():
        if not supa.configured():
            return _err("El modo práctica necesita las keys de Supabase en el backend", 503)
        uid = _uid()
        try:
            rows = board()
        except Exception as e:
            return _err(str(e), 502)
        # amigos = se siguen mutuamente (más vos)
        if request.args.get("scope") == "friends" and uid:
            out_f = supa.rest("GET", "follows", params={"follower_id": "eq." + uid, "select": "followee_id"}) or []
            in_f = supa.rest("GET", "follows", params={"followee_id": "eq." + uid, "select": "follower_id"}) or []
            friends = {f["followee_id"] for f in out_f} & {f["follower_id"] for f in in_f}
            rows = [r for r in rows if r["user_id"] in friends or r["user_id"] == uid]
        ranked = [dict(r, rank=i + 1) for i, r in enumerate(rows)]
        me = next((r for r in ranked if r["user_id"] == uid), None)
        return jsonify({"players": len(ranked), "top": ranked[:50], "me": me, "start": START})
