# Pruebas unitarias: funciones de negocio y validaciones, aisladas
# (sin servidor, sin red, sin base de datos).

from datetime import datetime

import pytest

import alerts
import backend
import events


# ─── Validación de símbolos ───────────────────────────────────────────────────

@pytest.mark.parametrize("symbol", ["AAPL", "MELI.BA", "BTC-USD", "^MERV", "USDARS=X", "aapl"])
def test_valid_symbol_acepta_los_de_yahoo(symbol):
    assert backend.valid_symbol(symbol)


@pytest.mark.parametrize("symbol", ["", None, "AAPL;DROP", "<script>", "A A", "' OR 1=1", "X" * 16, "../etc"])
def test_valid_symbol_rechaza_lo_demas(symbol):
    assert not backend.valid_symbol(symbol)


@pytest.mark.parametrize("raw,expected", [("10", 10), ("abc", 5000), ("-3", 1), ("999999", 5000), (None, 5000)])
def test_int_arg_acota_y_tolera_basura(raw, expected):
    qs = {} if raw is None else {"limit": raw}
    with backend.app.test_request_context(query_string=qs):
        assert backend.int_arg("limit", 5000, 1, 5000) == expected


# ─── Tipo de activo y formato de precios ─────────────────────────────────────

@pytest.mark.parametrize("symbol,kind", [
    ("AAPL", "stock"), ("MELI.BA", "cedear"), ("AAPLD.BA", "cedear-usd"),
    ("BTC-USD", "crypto"), ("USDARS=X", "fx"), ("^MERV", "index"),
])
def test_asset_kind(symbol, kind):
    assert alerts.asset_kind(symbol) == kind


@pytest.mark.parametrize("symbol,n,text", [
    ("AAPL", 1234.5, "US$ 1.234,50"),
    ("MELI.BA", 20230.4, "ARS 20.230"),
    ("^MERV", 2848945.7, "2.848.946 pts"),
    ("USDARS=X", 1450.1234, "1.450,1234"),
])
def test_fmt_price_formato_argentino(symbol, n, text):
    assert alerts.fmt_price(symbol, n) == text


# ─── Reglas de las alertas de precio ─────────────────────────────────────────

QUOTE = {"price": 105.0, "change_pct": 3.5, "latest_date": "2026-11-17"}


@pytest.mark.parametrize("kind,value,fires", [
    ("above", 100, True), ("above", 110, False),
    ("below", 110, True), ("below", 100, False),
    ("up_pct", 3, True), ("up_pct", 5, False),
    ("down_pct", 3, False),
])
def test_fires_segun_el_tipo(kind, value, fires):
    a = {"kind": kind, "value": value, "active": True}
    assert alerts.fires(a, QUOTE) is fires


def test_fires_no_avisa_si_esta_pausada_o_sin_precio():
    assert not alerts.fires({"kind": "above", "value": 1, "active": False}, QUOTE)
    assert not alerts.fires({"kind": "above", "value": 1, "active": True}, None)


def test_fires_porcentual_una_sola_vez_por_rueda():
    a = {"kind": "up_pct", "value": 3, "active": True, "triggered_at": "2026-11-17T15:00:00Z"}
    assert not alerts.fires(a, QUOTE)          # ya avisó hoy
    a["triggered_at"] = "2026-11-14T15:00:00Z"
    assert alerts.fires(a, QUOTE)              # la última vez fue otra rueda


def test_message_de_alerta():
    title, body = alerts.message({"symbol": "AAPL", "kind": "above", "value": 100}, QUOTE)
    assert title == "AAPL llegó a US$ 100,00"
    assert body == "Ahora cotiza a US$ 105,00."


# ─── Calendario: acción de origen de cada activo ─────────────────────────────

@pytest.mark.parametrize("symbol,base", [
    ("AAPL", "AAPL"), ("AAPL.BA", "AAPL"), ("AAPLD.BA", "AAPL"),
    ("YPFD.BA", "YPF"), ("DISN.BA", "DIS"), ("BRKB.BA", "BRK-B"),
    ("BTC-USD", None), ("^MERV", None), ("USDARS=X", None),
])
def test_underlying(symbol, base):
    assert events.underlying(symbol) == base


def test_aviso_diario_una_vez_por_dia_y_desde_las_10(monkeypatch):
    calls = []
    monkeypatch.setattr(events, "notify_tomorrow", lambda: calls.append(1) or 0)
    events._last_day["d"] = None
    events.daily(datetime(2026, 11, 17, 9, 59, tzinfo=events.AR))
    assert calls == []                         # antes de las 10, nada
    events.daily(datetime(2026, 11, 17, 10, 0, tzinfo=events.AR))
    events.daily(datetime(2026, 11, 17, 18, 0, tzinfo=events.AR))
    assert calls == [1]                        # una sola vez en el día
    events.daily(datetime(2026, 11, 18, 10, 5, tzinfo=events.AR))
    assert calls == [1, 1]                     # y al otro día otra vez


def test_notice_de_dividendo():
    title, body = events._notice("exdiv", "KO.BA", {"amount": 0.53})
    assert title == "Mañana corta el dividendo de KO.BA"
    assert "US$ 0,53" in body
