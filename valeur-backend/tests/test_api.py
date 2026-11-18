# Pruebas de integración: los endpoints HTTP de la API, con el cliente de
# pruebas de Flask (status, formato de la respuesta y manejo de errores).
# Yahoo Finance está reemplazado por datos falsos (ver conftest.py).


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json() == {"status": "ok"}


def test_quote_ok(client):
    r = client.get("/api/quote/AAPL")
    assert r.status_code == 200
    q = r.get_json()
    assert q["symbol"] == "AAPL"
    assert q["price"] == 105.0
    assert q["prev_close"] == 101.0
    assert round(q["change_pct"], 2) == 3.96


def test_quote_simbolo_invalido_400(client):
    r = client.get("/api/quote/AAPL;DROP")
    assert r.status_code == 400
    assert r.get_json() == {"error": "Invalid symbol"}


def test_quote_simbolo_inexistente_404(client):
    r = client.get("/api/quote/NOEXISTE")
    assert r.status_code == 404


def test_error_del_proveedor_no_expone_detalles(client):
    r = client.get("/api/quote/BOOM")
    assert r.status_code == 502
    body = r.get_data(as_text=True)
    assert "secret" not in body and "Traceback" not in body
    assert r.get_json() == {"error": "Market data unavailable"}


def test_candles_ok_y_limit_acotado(client):
    r = client.get("/api/candles/AAPL?range=1m&limit=2")
    assert r.status_code == 200
    data = r.get_json()
    assert data["count"] == 2
    assert [c["close"] for c in data["candles"]] == [101.0, 105.0]
    assert set(data["candles"][0]) >= {"time", "open", "high", "low", "close", "volume"}


def test_candles_limit_invalido_usa_el_default(client):
    r = client.get("/api/candles/AAPL?limit=abc")
    assert r.status_code == 200
    assert r.get_json()["count"] == 4


def test_batch_mezcla_validos_invalidos_e_inexistentes(client):
    r = client.get("/api/batch?symbols=AAPL,btc-usd,<x>,NOPE")
    assert r.status_code == 200
    quotes = r.get_json()["quotes"]
    assert quotes["AAPL"]["price"] == 105.0
    assert quotes["BTC-USD"]["closes"] == [90000.0, 91000.0]
    assert quotes["<X>"] is None   # inválido: ni se consulta
    assert quotes["NOPE"] is None  # válido pero sin datos


def test_batch_sin_simbolos_400(client):
    r = client.get("/api/batch")
    assert r.status_code == 400


def test_batch_limita_a_60_simbolos(client):
    many = ",".join(f"S{i}" for i in range(100))
    r = client.get("/api/batch?symbols=" + many)
    assert len(r.get_json()["quotes"]) == 60


def test_search_sin_query_400(client):
    assert client.get("/api/search").status_code == 400


def test_events_sin_simbolos_devuelve_lista_vacia(client):
    r = client.get("/api/events?symbols=<x>,")
    assert r.status_code == 200
    assert r.get_json() == {"events": []}


def test_ruta_inexistente_404_en_json(client):
    r = client.get("/api/no-existe")
    assert r.status_code == 404
    assert r.is_json


def test_metodo_no_permitido_405(client):
    r = client.post("/api/health")
    assert r.status_code == 405
    assert r.is_json


def test_cabeceras_de_seguridad(client):
    r = client.get("/api/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"


def test_cors_solo_origenes_permitidos(client):
    ok = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
    evil = client.get("/api/health", headers={"Origin": "https://sitio-malo.com"})
    assert "Access-Control-Allow-Origin" not in evil.headers
