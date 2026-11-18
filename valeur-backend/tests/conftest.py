# Configuración común de los tests del backend.
#
# Los tests no tocan internet ni la base de datos real:
#  - Supabase queda "sin configurar" (las variables vacías le ganan al .env).
#  - Yahoo Finance se reemplaza por datos falsos (fixture `fake_market`).

import os
import sys

import pandas as pd
import pytest

os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = ""
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import backend  # noqa: E402


def frame(closes, start="2026-11-10", volume=1000):
    """Velas diarias falsas a partir de una lista de cierres"""
    idx = pd.date_range(start, periods=len(closes), freq="D")
    return pd.DataFrame(
        {"Open": closes, "High": [c + 1 for c in closes], "Low": [c - 1 for c in closes],
         "Close": closes, "Volume": [volume] * len(closes)},
        index=idx,
    )


# Precios inventados de cada símbolo "que existe"
PRICES = {
    "AAPL": [100.0, 102.0, 101.0, 105.0],
    "MELI.BA": [20000.0, 20420.0, 20230.0],
    "BTC-USD": [90000.0, 91000.0],
}


class FakeTicker:
    def __init__(self, symbol):
        self.symbol = symbol.upper()

    def history(self, period=None, interval=None):
        if self.symbol == "BOOM":
            raise RuntimeError("Yahoo se cayó: detalle interno /usr/lib/secret")
        closes = PRICES.get(self.symbol)
        return frame(closes) if closes else pd.DataFrame()


def fake_download(symbols, **kwargs):
    if isinstance(symbols, str):
        symbols = [symbols]
    parts = {s: frame(PRICES[s]) for s in symbols if s in PRICES}
    if not parts:
        return pd.DataFrame()
    return pd.concat(parts, axis=1)


@pytest.fixture
def fake_market(monkeypatch):
    monkeypatch.setattr(backend.yf, "Ticker", FakeTicker)
    monkeypatch.setattr(backend.yf, "download", fake_download)
    backend._batch_cache.clear()
    yield


@pytest.fixture
def client(fake_market):
    backend.app.config["TESTING"] = True
    with backend.app.test_client() as c:
        yield c
