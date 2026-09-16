import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import TradeModal from "../components/TradeModal";
import { MARKET_API } from "../lib/supabase";
import { useSuggestions, formatDate, fmtPrice } from "../lib/market";
import { markMarketVisited } from "../lib/onboarding";
import { useWatchlist, addWatch, removeWatch, useTrades, computePositions } from "../lib/portfolio";

/* Colores del gráfico (lightweight-charts no lee variables CSS) */
const CHART = {
  light: {
    text: "#6f6f6f",
    grid: "rgba(0,0,0,0.05)",
    border: "rgba(0,0,0,0.12)",
    cross: "rgba(20,71,230,0.35)",
    up: "#16a34a",
    down: "#dc2626",
  },
  dark: {
    text: "#a3a3a3",
    grid: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.14)",
    cross: "rgba(194,92,245,0.45)",
    up: "#34d399",
    down: "#f87171",
  },
};

const POPULAR = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX"];

const INTERVALS = [
  ["30min", "30m"],
  ["hourly", "1H"],
  ["daily", "1D"],
  ["weekly", "1S"],
  ["monthly", "1M"],
];
const INTRADAY = ["hourly", "30min"];
const RANGES_INTRADAY = [
  ["1d", "1D"],
  ["5d", "5D"],
  ["1m", "1M"],
];
const RANGES_DAILY = [
  ["1m", "1M"],
  ["6m", "6M"],
  ["1y", "1A"],
  ["5y", "5A"],
  ["max", "Máx"],
];

const RECENT_KEY = "valeur-recent";
function loadRecent() {
  try {
    const r = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(r) && r.length ? r : ["AAPL", "NVDA", "TSLA"];
  } catch {
    return ["AAPL", "NVDA", "TSLA"];
  }
}

function useCandles(symbol, interval, range) {
  // El estado guarda la clave del pedido que lo produjo: si no coincide con
  // la actual, hay una carga en curso (así no hace falta setState al arrancar).
  const [res, setRes] = useState({ key: null, candles: [], quote: null, error: null });
  const [tick, setTick] = useState(0);
  const key = `${symbol}|${interval}|${range}|${tick}`;

  useEffect(() => {
    if (!symbol) return;
    let alive = true;
    (async () => {
      let next;
      try {
        const [cRes, qRes] = await Promise.all([
          fetch(`${MARKET_API}/candles/${symbol}?interval=${interval}&range=${range}`),
          fetch(`${MARKET_API}/quote/${symbol}`),
        ]);
        if (!cRes.ok) throw new Error(`No se encontró el ticker "${symbol}"`);
        const cData = await cRes.json();
        const qData = qRes.ok ? await qRes.json() : null;
        next = { key, candles: cData.candles || [], quote: qData, error: null };
      } catch (e) {
        const msg = e.message === "Failed to fetch" ? "No se pudo conectar al servidor" : e.message;
        next = { key, candles: [], quote: null, error: msg };
      }
      if (alive) setRes(next);
    })();
    return () => {
      alive = false;
    };
  }, [symbol, interval, range, tick, key]);

  return {
    candles: res.candles,
    quote: res.quote,
    error: res.error,
    loading: res.key !== key,
    reload: () => setTick((t) => t + 1),
  };
}

export default function TickerSearch() {
  const { dark } = useTheme();
  useEffect(() => {
    markMarketVisited();
  }, []);
  const { user } = useAuth();
  const uid = user?.id;
  const watch = useWatchlist(uid);
  const trades = useTrades(uid);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const symbol = (searchParams.get("symbol") || "AAPL").toUpperCase();

  const [input, setInput] = useState("");
  const [focus, setFocus] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [interval, setInterval] = useState("daily");
  const [range, setRange] = useState("max");
  const [hovered, setHovered] = useState(null);
  const [recent, setRecent] = useState(loadRecent);

  const chartRef = useRef(null);
  const chartInst = useRef(null);
  const candleSer = useRef(null);
  const volSer = useRef(null);
  const candlesRef = useRef([]);

  const suggestions = useSuggestions(input);
  const { candles, quote, loading, error, reload } = useCandles(symbol, interval, range);

  const selectSymbol = (raw) => {
    const sym = raw.trim().toUpperCase();
    if (!sym) return;
    setSearchParams({ symbol: sym }, { replace: true });
    setRecent((prev) => {
      const next = [sym, ...prev.filter((x) => x !== sym)].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* sin storage, no pasa nada */
      }
      return next;
    });
    setInput("");
    setCursor(-1);
    setFocus(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (cursor >= 0 && suggestions[cursor]) selectSymbol(suggestions[cursor].symbol);
    else selectSymbol(input);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") {
      handleSearch(e);
      return;
    }
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c <= 0 ? suggestions.length - 1 : c - 1));
    } else if (e.key === "Escape") {
      setFocus(false);
    }
  };

  const handleInterval = (iv) => {
    const toIntraday = INTRADAY.includes(iv);
    const fromIntraday = INTRADAY.includes(interval);
    if (toIntraday && !fromIntraday) setRange("5d");
    if (!toIntraday && fromIntraday) setRange("max");
    setInterval(iv);
  };

  // Crear el gráfico una sola vez
  useEffect(() => {
    if (!chartRef.current) return;
    const C = CHART[dark ? "dark" : "light"];

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
      layout: {
        background: { color: "transparent" },
        textColor: C.text,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: C.cross, width: 1, style: 3 },
        horzLine: { color: C.cross, width: 1, style: 3 },
      },
      rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.1, bottom: 0.28 } },
      timeScale: {
        borderColor: C.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
    });

    const cs = chart.addSeries(CandlestickSeries, {
      upColor: C.up,
      downColor: C.down,
      borderUpColor: C.up,
      borderDownColor: C.down,
      wickUpColor: C.up,
      wickDownColor: C.down,
    });
    const vs = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chart.subscribeCrosshairMove((param) => {
      const cVal = param.time ? param.seriesData.get(cs) : null;
      if (!cVal) {
        setHovered(null);
        return;
      }
      const arr = candlesRef.current;
      const idx = arr.findIndex((c) => c.time === param.time);
      const cur = idx >= 0 ? arr[idx] : null;
      const prev = idx > 0 ? arr[idx - 1] : null;
      const dayChange = prev ? ((cVal.close - prev.close) / prev.close) * 100 : null;
      setHovered({ ...cVal, date: cur ? cur.date : "", dayChange });
    });

    const ro = new ResizeObserver(() => {
      if (chartRef.current) {
        chart.resize(chartRef.current.clientWidth, chartRef.current.clientHeight);
      }
    });
    ro.observe(chartRef.current);

    chartInst.current = chart;
    candleSer.current = cs;
    volSer.current = vs;

    return () => {
      ro.disconnect();
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recolorear al cambiar el tema
  useEffect(() => {
    if (!chartInst.current) return;
    const C = CHART[dark ? "dark" : "light"];
    chartInst.current.applyOptions({
      layout: { textColor: C.text },
      grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
      crosshair: { vertLine: { color: C.cross }, horzLine: { color: C.cross } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { borderColor: C.border },
    });
    candleSer.current?.applyOptions({
      upColor: C.up,
      downColor: C.down,
      borderUpColor: C.up,
      borderDownColor: C.down,
      wickUpColor: C.up,
      wickDownColor: C.down,
    });
    volSer.current?.setData(
      candlesRef.current.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? `${C.up}33` : `${C.down}2b`,
      })),
    );
  }, [dark]);

  // Cargar datos en el gráfico
  useEffect(() => {
    candlesRef.current = candles;
    if (!candleSer.current || !volSer.current || !candles.length) return;
    const C = CHART[dark ? "dark" : "light"];

    candleSer.current.setData(
      candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })),
    );
    volSer.current.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? `${C.up}33` : `${C.down}2b`,
      })),
    );

    // Tipo TradingView: arranca en lo más reciente con detalle,
    // el resto del histórico queda para deslizar hacia atrás.
    const ts = chartInst.current?.timeScale();
    const len = candles.length;
    if (ts) {
      if (len > 150) ts.setVisibleLogicalRange({ from: len - 120, to: len + 3 });
      else ts.fitContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  const pct = quote ? parseFloat(quote.change_pct) : 0;
  const isUp = pct >= 0;
  const showSuggest = focus && suggestions.length > 0;

  const following = watch.rows.some((w) => w.symbol === symbol);
  const held = Object.fromEntries(
    computePositions(trades.rows).positions.map((p) => [p.symbol, p.qty]),
  );
  const toggleFollow = async () => {
    if (!uid) return;
    setBusy(true);
    if (following) await removeWatch(uid, symbol);
    else await addWatch(uid, symbol);
    setBusy(false);
    watch.reload();
  };

  return (
    <AppShell>
      <section className="page-head">
        <div>
          <h1>
            Buscá un <em>ticker</em>.
          </h1>
          <p>Precios, gráficos y estadísticas de cualquier activo del mercado.</p>
        </div>
      </section>

      {/* Buscador */}
      <section className="card search-card">
        <form className="search-form" onSubmit={handleSearch} role="search">
          <i className="bi bi-search ico" aria-hidden="true" />
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value.toUpperCase());
              setCursor(-1);
            }}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 120)}
            onKeyDown={handleKey}
            placeholder="Ingresá un ticker o empresa… AAPL, Tesla, GOOGL"
            aria-label="Buscar ticker"
            aria-autocomplete="list"
            aria-expanded={showSuggest}
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          <button type="submit" className="btn btn-pink">
            <span>Buscar</span>
            <i className="bi bi-arrow-right" />
          </button>
          {showSuggest && (
            <ul className="suggest" role="listbox">
              {suggestions.map((s, i) => (
                <li
                  key={s.symbol}
                  role="option"
                  aria-selected={i === cursor}
                  className={i === cursor ? "on" : ""}
                  onMouseDown={() => selectSymbol(s.symbol)}
                  onMouseEnter={() => setCursor(i)}
                >
                  <div>
                    <b>{s.symbol}</b>
                    <span>{s.name}</span>
                  </div>
                  {s.type && <small>{s.type}</small>}
                </li>
              ))}
            </ul>
          )}
        </form>

        <div className="chips">
          <span className="lbl">Recientes</span>
          {recent.map((s) => (
            <button
              key={s}
              type="button"
              className={"chip" + (s === symbol ? " on" : "")}
              onClick={() => selectSymbol(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="chips">
          <span className="lbl">Populares</span>
          {POPULAR.map((s) => (
            <button
              key={s}
              type="button"
              className={"chip" + (s === symbol ? " on" : "")}
              onClick={() => selectSymbol(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Ticker seleccionado */}
      <section>
        <div className="quote-bar">
          <span className="sym">{symbol}</span>
          {quote && !loading && (
            <>
              <span className="px">{fmtPrice(symbol, quote.price)}</span>
              <span className={"delta " + (isUp ? "up" : "down")}>
                <i className={isUp ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
                {Math.abs(pct).toFixed(2)}%
              </span>
              <span className="chg">
                {isUp ? "+" : ""}
                {quote.change?.toFixed(2)} hoy
              </span>
            </>
          )}
          <div className="quote-actions">
            {user ? (
              <>
                <button
                  type="button"
                  className={"btn btn-line btn-sm" + (following ? " on" : "")}
                  onClick={toggleFollow}
                  disabled={busy || !watch.loaded}
                >
                  <i className={following ? "bi bi-star-fill" : "bi bi-star"} />
                  {following ? "Siguiendo" : "Seguir"}
                </button>
                <button type="button" className="btn btn-pink btn-sm" onClick={() => setModal(true)}>
                  <i className="bi bi-arrow-left-right" /> Operar
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-line btn-sm">
                Iniciá sesión para seguir u operar
              </Link>
            )}
          </div>
        </div>

        <div className="card chart-card">
          <div className="chart-controls">
            <div className="seg" role="group" aria-label="Intervalo">
              {INTERVALS.map(([iv, label]) => (
                <button
                  key={iv}
                  type="button"
                  className={iv === interval ? "on" : ""}
                  onClick={() => handleInterval(iv)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="right">
              <div className="seg" role="group" aria-label="Rango">
                {(INTRADAY.includes(interval) ? RANGES_INTRADAY : RANGES_DAILY).map(
                  ([rg, label]) => (
                    <button
                      key={rg}
                      type="button"
                      className={rg === range ? "on" : ""}
                      onClick={() => setRange(rg)}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={reload}
                aria-label="Recargar"
                title="Recargar"
              >
                <i className="bi bi-arrow-clockwise" />
              </button>
            </div>
          </div>

          <div className="chart-wrap">
            {(loading || error) && (
              <div className="overlay">
                {loading && <div className="spinner" />}
                {error && !loading && (
                  <>
                    <span className="err">{error}</span>
                    <button type="button" className="btn btn-pink btn-sm" onClick={reload}>
                      Reintentar
                    </button>
                  </>
                )}
              </div>
            )}
            <div ref={chartRef} className="canvas" />
          </div>

          <div className="ohlc">
            {hovered ? (
              <>
                <div className="kv">
                  <small>Fecha</small>
                  <b>{formatDate(hovered.date)}</b>
                </div>
                {[
                  ["Apertura", hovered.open, ""],
                  ["Máximo", hovered.high, "txt-up"],
                  ["Mínimo", hovered.low, "txt-down"],
                  ["Cierre", hovered.close, ""],
                ].map(([l, v, cls]) => (
                  <div key={l} className="kv">
                    <small>{l}</small>
                    <b className={cls}>${v?.toFixed(2)}</b>
                  </div>
                ))}
                {hovered.dayChange != null && (
                  <div className="kv">
                    <small>Cambio</small>
                    <b className={hovered.dayChange >= 0 ? "txt-up" : "txt-down"}>
                      {hovered.dayChange >= 0 ? "▲" : "▼"} {Math.abs(hovered.dayChange).toFixed(2)}%
                    </b>
                  </div>
                )}
              </>
            ) : (
              <span className="hint">
                {loading
                  ? "Cargando datos…"
                  : error
                    ? "Sin datos para mostrar"
                    : "Pasá el cursor por el gráfico para ver el detalle de cada vela"}
              </span>
            )}
          </div>

          {quote && !loading && (
            <div className="stats">
              {[
                ["Volumen", (quote.volume / 1e6).toFixed(1) + "M"],
                ["Cierre anterior", "$" + quote.prev_close?.toFixed(2)],
                ["Cambio $", (isUp ? "+" : "") + quote.change?.toFixed(2)],
                ["Última sesión", formatDate(quote.latest_date)],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {user && (
        <TradeModal
          open={modal}
          onClose={() => setModal(false)}
          uid={uid}
          initial={{ symbol, side: "buy" }}
          held={held}
          onSaved={() => trades.reload()}
        />
      )}
    </AppShell>
  );
}
