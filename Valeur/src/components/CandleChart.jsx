import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import { useTheme } from "../context/ThemeContext";

const API_BASE = "http://localhost:5001/api";

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDate(d) {
  if (!d) return "";
  // d puede ser "2024-08-09" o un timestamp de lightweight-charts
  const str = typeof d === "string" ? d : "";
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${parseInt(m[3])} ${MESES[parseInt(m[2]) - 1]} ${m[1]}`;
  return String(d);
}

function getThemeColors(dark) {
  return {
    bg:        "transparent",
    text:      dark ? "#94a3b8" : "#64748b",
    gridLine:  dark ? "rgba(255,255,255,0.04)" : "rgba(30,58,138,0.05)",
    crosshair: dark ? "rgba(148,163,184,0.3)"  : "rgba(37,99,235,0.3)",
    border:    dark ? "rgba(255,255,255,0.07)"  : "rgba(30,58,138,0.08)",
    green:     dark ? "#22c55e" : "#16a34a",
    red:       dark ? "#f87171" : "#dc2626",
    textMain:  dark ? "#f1f5f9" : "#0f172a",
    textMuted: dark ? "#94a3b8" : "#64748b",
    surface:   dark ? "rgba(20,20,30,0.9)" : "rgba(255,255,255,0.85)",
    surfaceBg: dark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.5)",
    blue:      dark ? "#3b82f6" : "#2563eb",
    blueDark:  dark ? "#2563eb" : "#1e3a8a",
  };
}

function useCandles(symbol, interval, range) {
  const [candles, setCandles] = useState([]);
  const [quote,   setQuote]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const [cRes, qRes] = await Promise.all([
        fetch(`${API_BASE}/candles/${symbol}?interval=${interval}&range=${range}`),
        fetch(`${API_BASE}/quote/${symbol}`),
      ]);
      if (!cRes.ok) throw new Error(`HTTP ${cRes.status}`);
      const cData = await cRes.json();
      const qData = qRes.ok ? await qRes.json() : null;
      setCandles(cData.candles || []);
      setQuote(qData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, range]);

  useEffect(() => { load(); }, [load]);
  return { candles, quote, loading, error, reload: load };
}

export default function CandleChart() {
  const chartRef   = useRef(null);
  const chartInst  = useRef(null);
  const candleSer  = useRef(null);
  const volSer     = useRef(null);
  const candlesRef = useRef([]);

  const [symbol,   setSymbol]   = useState("AAPL");
  const [interval, setInterval] = useState("daily");
  const [range,    setRange]    = useState("max");
  const [hovered,  setHovered]  = useState(null);
  const [input,    setInput]    = useState("");

  const { dark } = useTheme();
  const C = getThemeColors(dark);

  const { candles, quote, loading, error, reload } = useCandles(symbol, interval, range);

  // Create chart once
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width:  chartRef.current.clientWidth,
      height: 360,
      layout: {
        background:  { color: "transparent" },
        textColor:   C.text,
        fontFamily:  "'Poppins', system-ui, sans-serif",
        fontSize:    11,
      },
      grid: {
        vertLines: { color: C.gridLine },
        horzLines: { color: C.gridLine },
      },
      crosshair: {
        mode:     CrosshairMode.Normal,
        vertLine: { color: C.crosshair, width: 1, style: 3 },
        horzLine: { color: C.crosshair, width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor:  C.border,
        scaleMargins: { top: 0.1, bottom: 0.3 },
      },
      timeScale: {
        borderColor:    C.border,
        timeVisible:    true,
        secondsVisible: false,
        rightOffset:    5,
        barSpacing:     8,
      },
    });

    const cs = chart.addSeries(CandlestickSeries, {
      upColor:         C.green,
      downColor:       C.red,
      borderUpColor:   C.green,
      borderDownColor: C.red,
      wickUpColor:     C.green,
      wickDownColor:   C.red,
    });

    const vs = chart.addSeries(HistogramSeries, {
      priceFormat:  { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) { setHovered(null); return; }
      const cVal = param.seriesData.get(cs);
      if (!cVal) { setHovered(null); return; }
      const arr  = candlesRef.current;
      const idx  = arr.findIndex((c) => c.time === param.time);
      const cur  = idx >= 0 ? arr[idx] : null;
      const prev = idx > 0 ? arr[idx - 1] : null;
      const dayChange = prev ? ((cVal.close - prev.close) / prev.close) * 100 : null;
      setHovered({ ...cVal, date: cur ? cur.date : "", dayChange });
    });

    const ro = new ResizeObserver(() => {
      if (chartRef.current) chart.resize(chartRef.current.clientWidth, 360);
    });
    ro.observe(chartRef.current);

    chartInst.current = chart;
    candleSer.current = cs;
    volSer.current    = vs;

    return () => { chart.remove(); ro.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update chart colors when dark mode changes
  useEffect(() => {
    if (!chartInst.current) return;
    const colors = getThemeColors(dark);
    chartInst.current.applyOptions({
      layout:    { textColor: colors.text },
      grid:      { vertLines: { color: colors.gridLine }, horzLines: { color: colors.gridLine } },
      crosshair: { vertLine: { color: colors.crosshair }, horzLine: { color: colors.crosshair } },
      rightPriceScale: { borderColor: colors.border },
      timeScale:       { borderColor: colors.border },
    });
    candleSer.current?.applyOptions({
      upColor: colors.green, downColor: colors.red,
      borderUpColor: colors.green, borderDownColor: colors.red,
      wickUpColor: colors.green, wickDownColor: colors.red,
    });
  }, [dark]);

  // Update candle data
  useEffect(() => {
    candlesRef.current = candles;
    if (!candleSer.current || !volSer.current || !candles.length) return;
    const colors = getThemeColors(dark);
    candleSer.current.setData(candles.map((c) => ({
      time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
    })));
    volSer.current.setData(candles.map((c) => ({
      time:  c.time,
      value: c.volume,
      color: c.close >= c.open
        ? `${colors.green}40`
        : `${colors.red}33`,
    })));
    // Tipo TradingView: arranca mostrando lo más reciente con detalle,
    // y el resto del histórico queda para deslizar hacia atrás.
    const ts  = chartInst.current?.timeScale();
    const len = candles.length;
    if (ts) {
      if (len > 150) {
        ts.setVisibleLogicalRange({ from: len - 120, to: len + 3 });
      } else {
        ts.fitContent();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  const INTRADAY = ["hourly", "30min"];
  const isIntraday = INTRADAY.includes(interval);

  const handleInterval = (iv) => {
    const toIntraday   = INTRADAY.includes(iv);
    const fromIntraday = INTRADAY.includes(interval);
    if (toIntraday && !fromIntraday) setRange("5d");
    if (!toIntraday && fromIntraday) setRange("max");
    setInterval(iv);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const s = input.trim().toUpperCase();
    if (s) { setSymbol(s); setInput(""); }
  };

  const pct    = quote ? parseFloat(quote.change_pct) : 0;
  const isUp   = pct >= 0;

  return (
    <div style={{
      background:     C.surface,
      backdropFilter: "blur(14px)",
      borderRadius:   24,
      border:         `1px solid ${C.border}`,
      boxShadow:      "0 24px 60px rgba(0,0,0,0.07)",
      overflow:       "hidden",
      fontFamily:     "'Poppins', system-ui, sans-serif",
      transition:     "background 0.25s ease, border-color 0.25s ease",
    }}>
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        padding:        "20px 24px 14px",
        borderBottom:   `1px solid ${C.border}`,
        flexWrap:       "wrap",
        gap:            14,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.textMain, letterSpacing: "-0.04em" }}>
            {symbol}
          </div>
          {quote && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: C.textMain }}>
                ${quote.price.toFixed(2)}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                background: isUp ? `${C.green}18` : `${C.red}18`,
                color: isUp ? C.green : C.red,
              }}>
                {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
              </span>
              <span style={{ fontSize: 12, color: C.textMuted }}>
                {isUp ? "+" : ""}{quote.change?.toFixed(2)} hoy
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Buscar ticker…"
            style={{
              background:   C.surfaceBg,
              border:       `1px solid ${C.border}`,
              borderRadius: 12,
              padding:      "7px 12px",
              color:        C.textMain,
              fontSize:     13,
              fontFamily:   "'Poppins', sans-serif",
              width:        120,
              outline:      "none",
            }}
          />
          <button type="submit" style={{
            background:   C.blueDark,
            border:       "none",
            borderRadius: 12,
            color:        "#fff",
            padding:      "7px 14px",
            cursor:       "pointer",
            fontSize:     13,
            fontWeight:   600,
            fontFamily:   "'Poppins', sans-serif",
          }}>
            Ir
          </button>
        </form>
      </div>

      {/* Symbol chips */}
      <div style={{ display: "flex", gap: 6, padding: "12px 24px", flexWrap: "wrap" }}>
        {SYMBOLS.map((sym) => (
          <button key={sym} onClick={() => setSymbol(sym)} style={{
            background:   sym === symbol ? `${C.blue}14` : C.surfaceBg,
            border:       `1px solid ${sym === symbol ? `${C.blue}33` : C.border}`,
            borderRadius: 10,
            color:        sym === symbol ? C.blue : C.textMuted,
            padding:      "4px 11px",
            cursor:       "pointer",
            fontSize:     12,
            fontWeight:   sym === symbol ? 700 : 500,
            fontFamily:   "'Poppins', sans-serif",
            transition:   "all 0.2s ease",
          }}>
            {sym}
          </button>
        ))}
      </div>

      {/* Interval row */}
      <div style={{ display: "flex", gap: 4, padding: "0 24px 10px", alignItems: "center", flexWrap: "wrap" }}>
        {[["30min", "30min"], ["hourly", "Hora"], ["daily", "Diario"], ["weekly", "Semanal"], ["monthly", "Mensual"]].map(([iv, label]) => (
          <button key={iv} onClick={() => handleInterval(iv)} style={{
            background:   iv === interval ? `${C.blue}10` : "none",
            border:       "none",
            borderRadius: 8,
            color:        iv === interval ? C.blue : C.textMuted,
            padding:      "5px 12px",
            cursor:       "pointer",
            fontSize:     12,
            fontFamily:   "'Poppins', sans-serif",
            fontWeight:   iv === interval ? 700 : 500,
          }}>
            {label}
          </button>
        ))}

        {/* Range selector */}
        <div style={{
          display: "flex", gap: 2, marginLeft: "auto", alignItems: "center",
          background: C.surfaceBg, borderRadius: 10, padding: 3,
          border: `1px solid ${C.border}`,
        }}>
          {(isIntraday
            ? [["1d", "1D"], ["5d", "5D"], ["1m", "1M"]]
            : [["1m", "1M"], ["6m", "6M"], ["1y", "1A"], ["5y", "5A"], ["max", "Máx"]]
          ).map(([rg, label]) => (
            <button key={rg} onClick={() => setRange(rg)} style={{
              background:   rg === range ? C.blueDark : "none",
              border:       "none",
              borderRadius: 7,
              color:        rg === range ? "#fff" : C.textMuted,
              padding:      "4px 10px",
              cursor:       "pointer",
              fontSize:     11,
              fontFamily:   "'Poppins', sans-serif",
              fontWeight:   rg === range ? 700 : 500,
              transition:   "all 0.15s ease",
            }}>
              {label}
            </button>
          ))}
        </div>

        <button onClick={reload} style={{
          background: "none", border: "none",
          color: C.textMuted, cursor: "pointer", fontSize: 18,
          padding: "2px 6px", borderRadius: 8,
        }} title="Recargar">
          ↻
        </button>
      </div>

      {/* OHLC tooltip */}
      <div style={{
        padding:    "7px 24px",
        minHeight:  32,
        display:    "flex",
        alignItems: "center",
        background: C.surfaceBg,
        borderTop:  `1px solid ${C.border}`,
      }}>
        {hovered ? (
          <div style={{ display: "flex", gap: 14, fontSize: 12, fontFamily: "'Poppins', sans-serif", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: C.textMain, fontWeight: 700 }}>{formatDate(hovered.date)}</span>
            {[["A", hovered.open, C.textMuted], ["H", hovered.high, C.green], ["L", hovered.low, C.red], ["C", hovered.close, C.textMain]].map(([l, v, c]) => (
              <span key={l}>
                <span style={{ color: C.textMuted, marginRight: 3 }}>{l}</span>
                <span style={{ color: c, fontWeight: 600 }}>{v?.toFixed(2)}</span>
              </span>
            ))}
            {hovered.dayChange != null && (
              <span style={{
                fontWeight: 700,
                padding: "2px 8px", borderRadius: 999,
                background: hovered.dayChange >= 0 ? `${C.green}18` : `${C.red}18`,
                color: hovered.dayChange >= 0 ? C.green : C.red,
              }}>
                {hovered.dayChange >= 0 ? "▲" : "▼"} {Math.abs(hovered.dayChange).toFixed(2)}% vs ant.
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: C.textMuted, fontSize: 12, fontFamily: "'Poppins', sans-serif" }}>
            {loading ? "Cargando datos…" : error ? `Error: ${error}` : "Pasá el mouse por el gráfico"}
          </span>
        )}
      </div>

      {/* Chart area */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {(loading || error) && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 10,
            background: dark ? "rgba(9,9,15,0.7)" : "rgba(248,250,252,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {loading && (
              <div style={{
                width: 28, height: 28,
                border: `3px solid ${C.border}`,
                borderTop: `3px solid ${C.blue}`,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
            )}
            {error && !loading && (
              <div style={{ textAlign: "center" }}>
                <div style={{ color: C.red, marginBottom: 10, fontSize: 14 }}>{error}</div>
                <button onClick={reload} style={{
                  background: C.blueDark, border: "none", borderRadius: 12,
                  color: "#fff", padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}>
                  Reintentar
                </button>
              </div>
            )}
          </div>
        )}
        <div ref={chartRef} style={{ width: "100%", background: "transparent" }} />
      </div>

      {/* Stats footer */}
      {quote && (
        <div style={{ display: "flex", borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          {[
            ["Volumen",       (quote.volume / 1e6).toFixed(1) + "M"],
            ["Cierre ant.",   "$" + quote.prev_close?.toFixed(2)],
            ["Cambio $",      (isUp ? "+" : "") + quote.change?.toFixed(2)],
            ["Última sesión", quote.latest_trading_day],
          ].map(([label, value]) => (
            <div key={label} style={{
              flex: "1 1 25%",
              display: "flex", flexDirection: "column", gap: 4,
              padding: "12px 18px",
              borderRight: `1px solid ${C.border}`,
              minWidth: 100,
            }}>
              <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 500 }}>{label}</span>
              <span style={{ color: C.textMain, fontSize: 13, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
