# valeur/backend.py — Micro-servicio de datos de mercado (yfinance)
# Auth y base de datos viven en Supabase; acá hay candles, quote, search y el
# chequeo de alertas de todos (alerts.py) que corre en un hilo aparte.
# Requiere: pip install flask flask-cors yfinance python-dotenv

from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import os
import re
import threading
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# CORS: cualquier origen local (localhost / 127.0.0.1, cualquier puerto) + los de CORS_ORIGINS
_origins = [r"^http://localhost(:\d+)?$", r"^http://127\.0\.0\.1(:\d+)?$"]
_origins += [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
CORS(app, origins=_origins)

# Símbolos como los entiende Yahoo: AAPL, MELI.BA, BTC-USD, ^MERV, USDARS=X
SYMBOL_RE = re.compile(r"^[A-Z0-9.=^-]{1,15}$")


def valid_symbol(symbol):
    return bool(SYMBOL_RE.match((symbol or "").upper()))


def bad_symbol():
    return jsonify({"error": "Invalid symbol"}), 400


def int_arg(name, default, lo, hi):
    """Entero acotado desde la query string (si es inválido, el default)"""
    try:
        return max(lo, min(hi, int(request.args.get(name, default))))
    except (TypeError, ValueError):
        return default


# ─── Velas japonesas (OHLCV) ─────────────────────────────────────────────────

@app.route("/api/candles/<symbol>")
def get_candles(symbol):
    if not valid_symbol(symbol):
        return bad_symbol()
    interval = request.args.get("interval", "daily").lower()
    rng      = request.args.get("range", "").lower()
    limit    = int_arg("limit", 5000, 1, 5000)

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

        # sin velas incompletas (la del día puede venir con NaN, que no es JSON válido)
        df = df.dropna(subset=["Open", "High", "Low", "Close"])
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
                "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,
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
    if not valid_symbol(symbol):
        return bad_symbol()
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
        volume     = int(last["Volume"]) if last["Volume"] == last["Volume"] else 0
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


# ─── Lote de cotizaciones + sparkline ─────────────────────────────────────────
# Para las listas del mercado: una sola descarga para muchos símbolos en vez
# de un pedido por activo. Devuelve el mismo formato que /quote más los
# cierres del último mes. Caché corto por símbolo.

BATCH_TTL = 60
_batch_cache = {}  # symbol → (at, data)
# yf.download guarda estado global: dos descargas a la vez se pisan los resultados
_download_lock = threading.Lock()


def fetch_quotes(symbols):
    """Cotización + cierres del último mes de varios símbolos válidos, en una
    sola descarga (con caché corto). Lo que no tiene datos vuelve como None.
    Lo usan /api/batch y el chequeo de alertas."""
    import time

    now = time.time()
    out = {s: _batch_cache[s][1] for s in symbols if s in _batch_cache and now - _batch_cache[s][0] < BATCH_TTL}
    missing = [s for s in symbols if s not in out]
    if not missing:
        return out
    try:
        with _download_lock:
            df = yf.download(missing, period="1mo", interval="1d", progress=False,
                             auto_adjust=False, group_by="ticker", threads=True)
    except Exception:
        if not out:
            raise
        df = None
    for s in missing:
        data = None
        try:
            # con group_by="ticker" las columnas son (símbolo, campo), salvo
            # en algunas versiones de yfinance cuando se pide uno solo
            multi = df is not None and df.columns.nlevels > 1
            sub = df[s] if multi else df
            hist = sub.dropna(subset=["Close"]) if sub is not None else None
            if hist is not None and not hist.empty:
                last = hist.iloc[-1]
                price = round(float(last["Close"]), 4)
                prev = round(float(hist.iloc[-2]["Close"]), 4) if len(hist) >= 2 else round(float(last["Open"]), 4)
                change = round(price - prev, 4)
                vol = last.get("Volume")
                data = {
                    "symbol": s,
                    "price": price,
                    "change": change,
                    "change_pct": round(change / prev * 100, 4) if prev else 0,
                    "volume": int(vol) if vol == vol and vol is not None else 0,
                    "prev_close": prev,
                    "latest_date": last.name.strftime("%Y-%m-%d"),
                    "closes": [round(float(v), 4) for v in hist["Close"].tolist()],
                }
        except (KeyError, IndexError, ValueError):
            data = None
        if data:  # lo que falló se vuelve a pedir la próxima vez
            _batch_cache[s] = (now, data)
        out[s] = data
    return out


@app.route("/api/batch")
def get_batch():
    symbols = [s.strip().upper() for s in request.args.get("symbols", "").split(",") if s.strip()]
    symbols = list(dict.fromkeys(symbols))[:60]
    if not symbols:
        return jsonify({"error": "Param 'symbols' required"}), 400
    # los inválidos ni se consultan: vuelven como "sin datos"
    invalid = [s for s in symbols if not valid_symbol(s)]
    symbols = [s for s in symbols if valid_symbol(s)]
    out = {}
    if symbols:
        try:
            out = fetch_quotes(symbols)
        except Exception as e:
            return jsonify({"error": str(e)}), 502
    out.update({s: None for s in invalid})
    return jsonify({"quotes": out})


# ─── Dólar MEP ────────────────────────────────────────────────────────────────
# Yahoo no tiene los bonos (AL30/GD30), así que lo derivamos de los CEDEARs:
# precio en pesos ÷ precio en dólares de la misma especie. Mediana de varios
# pares por día, para que un papel sin operaciones no mueva el número.

MEP_PAIRS = ["AAPL", "SPY", "MSFT", "MELI", "NVDA", "KO"]
MEP_TTL = 15 * 60
_mep_cache = {"at": 0, "data": None}


def mep_data():
    """Dólar MEP de hoy y su historia (con caché de 15 min). None si no hay datos."""
    import time
    import pandas as pd

    if _mep_cache["data"] and time.time() - _mep_cache["at"] < MEP_TTL:
        return _mep_cache["data"]
    tickers = [p + ".BA" for p in MEP_PAIRS] + [p + "D.BA" for p in MEP_PAIRS]
    with _download_lock:
        df = yf.download(tickers, period="max", interval="1d", progress=False, auto_adjust=False)["Close"]
    ratios = pd.concat([df[p + ".BA"] / df[p + "D.BA"] for p in MEP_PAIRS], axis=1)
    mep = ratios.median(axis=1, skipna=True).dropna()
    if mep.empty:
        return None
    data = {
        "rate": round(float(mep.iloc[-1]), 2),
        "date": mep.index[-1].strftime("%Y-%m-%d"),
        "series": [[d.strftime("%Y-%m-%d"), round(float(v), 2)] for d, v in mep.items()],
    }
    _mep_cache.update(at=time.time(), data=data)
    return data


@app.route("/api/mep")
def get_mep():
    try:
        data = mep_data()
        return jsonify(data) if data else (jsonify({"error": "No data"}), 502)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ─── Búsqueda ─────────────────────────────────────────────────────────────────

@app.route("/api/search")
def search_symbol():
    q = request.args.get("q", "").strip()[:64]
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
    # con debug, Flask corre dos procesos (el que vigila los cambios y el que
    # atiende): las alertas se revisan solo en el que atiende
    if os.getenv("WERKZEUG_RUN_MAIN") == "true":
        import alerts
        alerts.start(lambda syms: fetch_quotes([s for s in syms if valid_symbol(s)]))
    app.run(debug=True, port=int(os.getenv("PORT", 5001)), host="0.0.0.0")
    