# valeur/backend.py — Mini backend para datos de Alpha Vantage
# Requiere: pip install flask flask-cors requests python-dotenv

from flask import Flask, jsonify, request # type: ignore
from flask_cors import CORS # type: ignore
import requests # type: ignore
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv # type: ignore

load_dotenv()

app = Flask(__name__)
CORS(app)  # Permite requests desde React (localhost:3000)

AV_KEY = os.getenv("ALPHA_VANTAGE_KEY", "demo")
AV_BASE = "https://www.alphavantage.co/query"


def av_get(params: dict):
    """Helper: llama a Alpha Vantage con tu API key."""
    params["apikey"] = AV_KEY
    r = requests.get(AV_BASE, params=params, timeout=10)
    r.raise_for_status()
    return r.json()


# ─── Velas japonesas (OHLCV) ─────────────────────────────────────────────────

@app.route("/api/candles/<symbol>")
def get_candles(symbol):
    """
    Retorna velas diarias para un símbolo.
    Query params:
    - interval: "daily" (default) | "weekly" | "monthly"
    - limit:    cantidad de velas a devolver (default: 90)

    Ejemplo: GET /api/candles/AAPL?interval=daily&limit=60
    """
    interval = request.args.get("interval", "daily").upper()
    limit    = int(request.args.get("limit", 90))

    func_map = {
        "DAILY":   "TIME_SERIES_DAILY",
        "WEEKLY":  "TIME_SERIES_WEEKLY",
        "MONTHLY": "TIME_SERIES_MONTHLY",
    }
    ts_key_map = {
        "DAILY":   "Time Series (Daily)",
        "WEEKLY":  "Weekly Time Series",
        "MONTHLY": "Monthly Time Series",
    }

    func    = func_map.get(interval, "TIME_SERIES_DAILY")
    ts_key  = ts_key_map.get(interval, "Time Series (Daily)")

    try:
        data = av_get({"function": func, "symbol": symbol, "outputsize": "compact"})
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    ts = data.get(ts_key, {})
    if not ts:
        return jsonify({"error": "Symbol not found or API limit reached", "raw": data}), 404

    candles = []
    for date_str, vals in sorted(ts.items(), reverse=True)[:limit]:
        candles.append({
            "date":   date_str,
            "open":   float(vals["1. open"]),
            "high":   float(vals["2. high"]),
            "low":    float(vals["3. low"]),
            "close":  float(vals["4. close"]),
            "volume": int(vals["5. volume"]),
        })

    # Más viejo primero (para el gráfico)
    candles.reverse()

    return jsonify({
        "symbol":   symbol.upper(),
        "interval": interval,
        "candles":  candles,
    })


# ─── Quote en tiempo real ────────────────────────────────────────────────────

@app.route("/api/quote/<symbol>")
def get_quote(symbol):
    try:
        data = av_get({"function": "GLOBAL_QUOTE", "symbol": symbol})
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    q = data.get("Global Quote", {})
    if not q:
        return jsonify({"error": "No data", "raw": data}), 404

    price      = float(q.get("05. price", 0))
    prev_close = float(q.get("08. previous close", 0))

    # Calculamos el cambio desde las velas si el campo viene vacío
    raw_pct = q.get("10. change percent", "0%").replace("%", "")
    try:
        change_pct = float(raw_pct)
    except:
        change_pct = 0.0

    change = price - prev_close

    if change_pct == 0.0 and prev_close != 0:
        change_pct = ((price - prev_close) / prev_close) * 100

    return jsonify({
        "symbol":             q.get("01. symbol"),
        "price":              price,
        "change":             round(change, 4),
        "change_pct":         round(change_pct, 4),
        "volume":             int(q.get("06. volume", 0)),
        "prev_close":         prev_close,
        "latest_trading_day": q.get("07. latest trading day"),
    })


# ─── Búsqueda de símbolo ─────────────────────────────────────────────────────

@app.route("/api/search")
def search_symbol():
    """
    Busca símbolos por nombre o ticker.
    Ejemplo: GET /api/search?q=apple
    """
    q = request.args.get("q", "")
    if not q:
        return jsonify({"error": "Param 'q' required"}), 400

    try:
        data = av_get({"function": "SYMBOL_SEARCH", "keywords": q})
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    results = [
        {
            "symbol":   m["1. symbol"],
            "name":     m["2. name"],
            "type":     m["3. type"],
            "region":   m["4. region"],
            "currency": m["8. currency"],
        }
        for m in data.get("bestMatches", [])
    ]
    return jsonify({"results": results})


# ─── Health check ─────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "key_set": AV_KEY != "demo"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
