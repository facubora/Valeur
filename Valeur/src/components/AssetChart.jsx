import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import { useTheme } from "../context/ThemeContext";
import { MARKET_API } from "../lib/supabase";
import { formatDate, fmtPrice } from "../lib/market";

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

function useCandles(symbol, interval, range) {
  // El estado guarda la clave del pedido que lo produjo: si no coincide con
  // la actual, hay una carga en curso (así no hace falta setState al arrancar).
  const [res, setRes] = useState({ key: null, candles: [], error: null });
  const [tick, setTick] = useState(0);
  const key = `${symbol}|${interval}|${range}|${tick}`;

  useEffect(() => {
    if (!symbol) return;
    let alive = true;
    (async () => {
      let next;
      try {
        const r = await fetch(`${MARKET_API}/candles/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`);
        if (!r.ok) throw new Error(`No se encontró el ticker "${symbol}"`);
        const data = await r.json();
        next = { key, candles: data.candles || [], error: null };
      } catch (e) {
        const msg = e.message === "Failed to fetch" ? "No se pudo conectar al servidor" : e.message;
        next = { key, candles: [], error: msg };
      }
      if (alive) setRes(next);
    })();
    return () => {
      alive = false;
    };
  }, [symbol, interval, range, tick, key]);

  return {
    candles: res.candles,
    error: res.error,
    loading: res.key !== key,
    reload: () => setTick((t) => t + 1),
  };
}

/* Gráfico de velas tipo TradingView con intervalo, rango, OHLC al pasar el
   cursor y estadísticas de la última sesión (`quote`). */
export default function AssetChart({ symbol, quote }) {
  const { dark } = useTheme();
  const [interval, setInterval] = useState("daily");
  const [range, setRange] = useState("max");
  const [hovered, setHovered] = useState(null);

  const chartRef = useRef(null);
  const chartInst = useRef(null);
  const candleSer = useRef(null);
  const volSer = useRef(null);
  const candlesRef = useRef([]);

  const { candles, loading, error, reload } = useCandles(symbol, interval, range);

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

  const isUp = quote ? quote.change_pct >= 0 : true;
  const compact = (n) => n.toLocaleString("es-AR", { notation: "compact", maximumFractionDigits: 1 });
  const px = (v) => fmtPrice(symbol, v);

  return (
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
                    <b className={cls}>{px(v)}</b>
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
                ["Volumen", quote.volume ? compact(quote.volume) : "—"],
                ["Cierre anterior", px(quote.prev_close)],
                ["Cambio", (isUp ? "+" : "-") + px(Math.abs(quote.change))],
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
  );
}
