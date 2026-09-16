# valeur/backend.py — Micro-servicio de datos de mercado (yfinance)
# Auth y base de datos viven en Supabase; acá solo hay candles, quote y search.
# Requiere: pip install flask flask-cors yfinance python-dotenv

from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# CORS: cualquier origen local (localhost / 127.0.0.1, cualquier puerto) + los de CORS_ORIGINS
_origins = [r"^http://localhost(:\d+)?$", r"^http://127\.0\.0\.1(:\d+)?$"]
_origins += [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
CORS(app, origins=_origins)


# ─── Velas japonesas (OHLCV) ─────────────────────────────────────────────────

@app.route("/api/candles/<symbol>")
def get_candles(symbol):
    interval = request.args.get("interval", "daily").lower()
    rng      = request.args.get("range", "").lower()
    limit    = int(request.args.get("limit", 5000))

    interval_map = {
        "daily":   "1d",
        "weekly":  "1wk",
        "monthly": "1mo",
        "hourly":  "1h",
        "30min":   "30m",
    }
    yf_interval = interval_map.get(interval, "1d")
    intraday = interval in ("hourly", "30min")

    if intraday:
        # yfinance: 30m permite máx ~60 días; 1h máx ~730 días
        range_map = {"1d": "1d", "5d": "5d", "1m": "1mo"}
        period = range_map.get(rng, "5d")
    else:
        range_map = {
            "1m": "1mo", "3m": "3mo", "6m": "6mo",
            "1y": "1y",  "1a": "1y",
            "5y": "5y",  "5a": "5y",
            "max": "max",
        }
        default_period = {"daily": "6mo", "weekly": "2y", "monthly": "max"}
        period = range_map.get(rng, default_period.get(interval, "6mo"))

    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=yf_interval)

        if df.empty:
            return jsonify({"error": "Symbol not found or no data"}), 404

        df = df.tail(limit)
        candles = []
        for date, row in df.iterrows():
            if intraday:
                # lightweight-charts necesita timestamp unix (segundos) para intradía
                t    = int(date.timestamp())
                disp = date.strftime("%d/%m %H:%M")
            else:
                t    = date.strftime("%Y-%m-%d")
                disp = date.strftime("%Y-%m-%d")
            candles.append({
                "time":   t,
                "date":   disp,
                "open":   round(float(row["Open"]), 4),
                "high":   round(float(row["High"]), 4),
                "low":    round(float(row["Low"]), 4),
                "close":  round(float(row["Close"]), 4),
                "volume": int(row["Volume"]),
            })

        return jsonify({
            "symbol":   symbol.upper(),
            "interval": interval,
            "range":    period,
            "intraday": intraday,
            "count":    len(candles),
            "candles":  candles,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ─── Quote ────────────────────────────────────────────────────────────────────

@app.route("/api/quote/<symbol>")
def get_quote(symbol):
    try:
        ticker = yf.Ticker(symbol)

        # Derivamos el quote de la misma serie diaria que alimenta el gráfico,
        # así el % y el volumen coinciden exactamente con la última vela.
        hist = ticker.history(period="5d", interval="1d")
        if hist.empty:
            return jsonify({"error": "Symbol not found or no data"}), 404

        hist = hist.dropna(subset=["Close"])
        if hist.empty:
            return jsonify({"error": "Symbol not found or no data"}), 404

        last       = hist.iloc[-1]
        price      = round(float(last["Close"]), 4)
        volume     = int(last["Volume"])
        # Cierre del día anterior; si solo hay una vela, usamos su apertura
        prev_close = round(float(hist.iloc[-2]["Close"]), 4) if len(hist) >= 2 else round(float(last["Open"]), 4)
        change     = round(price - prev_close, 4)
        change_pct = round((change / prev_close) * 100, 4) if prev_close else 0

        return jsonify({
            "symbol":      symbol.upper(),
            "price":       price,
            "change":      change,
            "change_pct":  change_pct,
            "volume":      volume,
            "prev_close":  prev_close,
            "latest_date": last.name.strftime("%Y-%m-%d"),
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ─── Búsqueda ─────────────────────────────────────────────────────────────────

@app.route("/api/search")
def search_symbol():
    q = request.args.get("q", "")
    if not q:
        return jsonify({"error": "Param 'q' required"}), 400
    try:
        results = yf.Search(q).quotes
        return jsonify({"results": [
            {
                "symbol": r.get("symbol"),
                "name":   r.get("longname") or r.get("shortname"),
                "type":   r.get("quoteType"),
            }
            for r in results[:8]
        ]})
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ─── Health check ─────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", 5001)), host="0.0.0.0")
    