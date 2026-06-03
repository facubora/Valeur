# valeur/backend.py — Mini backend con yfinance + auth
# Requiere: pip install flask flask-cors yfinance mysql-connector-python bcrypt pyjwt python-dotenv

from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import os
import bcrypt
import jwt
import datetime
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me")


def get_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "valeur"),
    )


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "username, email y password son requeridos"}), 400
    if len(password) < 8:
        return jsonify({"error": "La contraseña debe tener al menos 8 caracteres"}), 400

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
            (username, email, password_hash),
        )
        db.commit()
        user_id = cursor.lastrowid
        cursor.close()
        db.close()
    except mysql.connector.IntegrityError:
        return jsonify({"error": "El email o username ya está en uso"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    token = jwt.encode(
        {"user_id": user_id, "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)},
        JWT_SECRET,
        algorithm="HS256",
    )
    return jsonify({"token": token, "user": {"id": user_id, "username": username, "email": email}}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email y password son requeridos"}), 400

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, username, email, password_hash FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        db.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return jsonify({"error": "Credenciales incorrectas"}), 401

    token = jwt.encode(
        {"user_id": user["id"], "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)},
        JWT_SECRET,
        algorithm="HS256",
    )
    return jsonify({"token": token, "user": {"id": user["id"], "username": user["username"], "email": user["email"]}})


# ─── Velas japonesas (OHLCV) ─────────────────────────────────────────────────

@app.route("/api/candles/<symbol>")
def get_candles(symbol):
    interval = request.args.get("interval", "daily").lower()
    limit    = int(request.args.get("limit", 120))

    interval_map = {
        "daily":   "1d",
        "weekly":  "1wk",
        "monthly": "1mo",
    }
    yf_interval = interval_map.get(interval, "1d")

    try:
        ticker = yf.Ticker(symbol)
        if interval == "daily":
            period = "1mo"      
        elif interval == "weekly":
            period = "6mo"     
        elif interval == "monthly":
            period = "12mo"     
        else:
            period = "1mo"

        df = ticker.history(period=period, interval=yf_interval)

        if df.empty:
            return jsonify({"error": "Symbol not found or no data"}), 404

        df = df.tail(limit)
        candles = []
        for date, row in df.iterrows():
            candles.append({
                "date":   date.strftime("%Y-%m-%d"),
                "open":   round(float(row["Open"]), 4),
                "high":   round(float(row["High"]), 4),
                "low":    round(float(row["Low"]), 4),
                "close":  round(float(row["Close"]), 4),
                "volume": int(row["Volume"]),
            })

        return jsonify({"symbol": symbol.upper(), "interval": interval, "candles": candles})

    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ─── Quote ────────────────────────────────────────────────────────────────────

@app.route("/api/quote/<symbol>")
def get_quote(symbol):
    try:
        ticker = yf.Ticker(symbol)
        info   = ticker.fast_info

        price      = round(float(info.last_price), 4)
        prev_close = round(float(info.previous_close), 4)
        change     = round(price - prev_close, 4)
        change_pct = round((change / prev_close) * 100, 4) if prev_close else 0

        return jsonify({
            "symbol":     symbol.upper(),
            "price":      price,
            "change":     change,
            "change_pct": change_pct,
            "volume":     int(info.three_month_average_volume or 0),
            "prev_close": prev_close,
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
    app.run(debug=True, port=5001, host="0.0.0.0")
    