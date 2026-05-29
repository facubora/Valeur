// valeur/CandleChart.jsx — Estilo Valeur (light mode, glassmorphism, Poppins)
// Requiere: npm install lightweight-charts

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CrosshairMode, CandlestickSeries, HistogramSeries } from "lightweight-charts";

const API_BASE = "http://localhost:5000/api";

const THEME = {
  bg:        "#f8fafc",
  surface:   "rgba(255,255,255,0.72)",
  border:    "rgba(30,58,138,0.08)",
  text:      "#0f172a",
  textMuted: "#64748b",
  blue:      "#2563eb",
  blueDark:  "#1e3a8a",
  green:     "#16a34a",
  red:       "#dc2626",
};

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];

function useCandles(symbol, interval) {
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
        fetch(`${API_BASE}/candles/${symbol}?interval=${interval}&limit=120`),
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
  }, [symbol, interval]);

  useEffect(() => { load(); }, [load]);
  return { candles, quote, loading, error, reload: load };
}

export default function CandleChart() {
  const chartRef  = useRef(null);
  const chartInst = useRef(null);
  const candleSer = useRef(null);
  const volSer    = useRef(null);

  const [symbol,   setSymbol]   = useState("AAPL");
  const [interval, setInterval] = useState("daily");
  const [hovered,  setHovered]  = useState(null);
  const [input,    setInput]    = useState("");

  const { candles, quote, loading, error, reload } = useCandles(symbol, interval);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width:  chartRef.current.clientWidth,
      height: 380,
      layout: {
        background:  { color: "transparent" },
        textColor:   THEME.textMuted,
        fontFamily:  "'Poppins', system-ui, sans-serif",
        fontSize:    11,
      },
      grid: {
        vertLines: { color: "rgba(30,58,138,0.05)" },
        horzLines: { color: "rgba(30,58,138,0.05)" },
      },
      crosshair: {
        mode:     CrosshairMode.Normal,
        vertLine: { color: "rgba(37,99,235,0.3)", width: 1, style: 3 },
        horzLine: { color: "rgba(37,99,235,0.3)", width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor:  "rgba(30,58,138,0.08)",
        scaleMargins: { top: 0.1, bottom: 0.3 },
      },
      timeScale: {
        borderColor:    "rgba(30,58,138,0.08)",
        timeVisible:    true,
        secondsVisible: false,
        rightOffset:    5,
        barSpacing:     8,
      },
    });

    const cs = chart.addSeries(CandlestickSeries, {
      upColor:         THEME.green,
      downColor:       THEME.red,
      borderUpColor:   THEME.green,
      borderDownColor: THEME.red,
      wickUpColor:     THEME.green,
      wickDownColor:   THEME.red,
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
      if (cVal) setHovered(cVal);
    });

    const ro = new ResizeObserver(() => {
      chart.resize(chartRef.current.clientWidth, 380);
    });
    ro.observe(chartRef.current);

    chartInst.current = chart;
    candleSer.current = cs;
    volSer.current    = vs;

    return () => { chart.remove(); ro.disconnect(); };
  }, []);

  useEffect(() => {
    if (!candleSer.current || !volSer.current || !candles.length) return;

    candleSer.current.setData(candles.map(c => ({
      time: c.date, open: c.open, high: c.high, low: c.low, close: c.close,
    })));
    volSer.current.setData(candles.map(c => ({
      time:  c.date,
      value: c.volume,
      color: c.close >= c.open ? "rgba(22,163,74,0.25)" : "rgba(220,38,38,0.2)",
    })));
    chartInst.current?.timeScale().fitContent();
  }, [candles]);

  const handleSearch = (e) => {
    e.preventDefault();
    const s = input.trim().toUpperCase();
    if (s) { setSymbol(s); setInput(""); }
  };

  const pct    = quote ? parseFloat(quote.change_pct) : 0;
  const isUp   = pct >= 0;
  const pctClr = isUp ? THEME.green : THEME.red;

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.titleRow}>
          <div>
            <div style={s.symbolName}>{symbol}</div>
            {quote && (
              <div style={s.priceRow}>
                <span style={s.price}>${quote.price.toFixed(2)}</span>
                <span style={{ ...s.badge, background: isUp ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)", color: pctClr }}>
                  {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                </span>
                <span style={s.change}>
                  {isUp ? "+" : ""}{quote.change?.toFixed(2)} hoy
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Búsqueda */}
        <form onSubmit={handleSearch} style={s.form}>
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="Buscar ticker…"
            style={s.input}
          />
          <button type="submit" style={s.btnPrimary}>Ir</button>
        </form>
      </div>

      {/* Chips */}
      <div style={s.chips}>
        {SYMBOLS.map(sym => (
          <button
            key={sym}
            onClick={() => setSymbol(sym)}
            style={{ ...s.chip, ...(sym === symbol ? s.chipActive : {}) }}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Intervalo */}
      <div style={s.intervalRow}>
        {[["daily","Diario"],["weekly","Semanal"],["monthly","Mensual"]].map(([iv, label]) => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            style={{ ...s.ivBtn, ...(iv === interval ? s.ivActive : {}) }}
          >
            {label}
          </button>
        ))}
        <button onClick={reload} style={s.reloadBtn} title="Recargar">↻</button>
      </div>

      {/* Tooltip OHLC */}
      <div style={s.tooltip}>
        {hovered ? (
          <div style={{ display: "flex", gap: 16, fontSize: 12, fontFamily: "'Poppins', sans-serif" }}>
            {[["A", hovered.open, THEME.textMuted], ["H", hovered.high, THEME.green], ["L", hovered.low, THEME.red], ["C", hovered.close, THEME.text]].map(([l, v, c]) => (
              <span key={l}>
                <span style={{ color: THEME.textMuted, marginRight: 4 }}>{l}</span>
                <span style={{ color: c, fontWeight: 600 }}>{v?.toFixed(2)}</span>
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: THEME.textMuted, fontSize: 12, fontFamily: "'Poppins', sans-serif" }}>
            {loading ? "Cargando datos…" : error ? `Error: ${error}` : "Pasá el mouse por el gráfico"}
          </span>
        )}
      </div>

      {/* Gráfico */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
        {(loading || error) && (
          <div style={s.overlay}>
            {loading && <div style={s.spinner} />}
            {error && !loading && (
              <div style={{ textAlign: "center" }}>
                <div style={{ color: THEME.red, marginBottom: 10, fontFamily: "'Poppins', sans-serif", fontSize: 14 }}>{error}</div>
                <button onClick={reload} style={s.btnPrimary}>Reintentar</button>
              </div>
            )}
          </div>
        )}
        <div ref={chartRef} style={{ width: "100%", background: "transparent" }} />
      </div>

      {/* Stats footer */}
      {quote && (
        <div style={s.stats}>
          {[
            ["Volumen",       (quote.volume / 1e6).toFixed(1) + "M"],
            ["Cierre ant.",   "$" + quote.prev_close?.toFixed(2)],
            ["Cambio $",      (isUp ? "+" : "") + quote.change?.toFixed(2)],
            ["Última sesión", quote.latest_trading_day],
          ].map(([label, value]) => (
            <div key={label} style={s.stat}>
              <span style={s.statLabel}>{label}</span>
              <span style={s.statValue}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  root: {
    background:   "rgba(255,255,255,0.72)",
    backdropFilter: "blur(14px)",
    borderRadius: 24,
    border:       "1px solid rgba(15,23,42,0.06)",
    boxShadow:    "0 24px 60px rgba(15,23,42,0.05)",
    overflow:     "hidden",
    fontFamily:   "'Poppins', system-ui, sans-serif",
    transition:   "transform 0.25s ease, box-shadow 0.25s ease",
  },
  header: {
    display:        "flex",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    padding:        "24px 28px 16px",
    borderBottom:   "1px solid rgba(30,58,138,0.06)",
    flexWrap:       "wrap",
    gap:            16,
  },
  titleRow:   { display: "flex", alignItems: "flex-start", gap: 16 },
  symbolName: { fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.04em" },
  priceRow:   { display: "flex", alignItems: "center", gap: 10, marginTop: 4 },
  price:      { fontSize: 18, fontWeight: 600, color: "#0f172a" },
  badge: {
    fontSize:     11,
    fontWeight:   700,
    padding:      "3px 9px",
    borderRadius: 999,
  },
  change: { fontSize: 12, color: "#64748b" },
  form:   { display: "flex", gap: 8, alignItems: "center" },
  input: {
    background:   "rgba(248,250,252,0.8)",
    border:       "1px solid rgba(30,58,138,0.1)",
    borderRadius: 12,
    padding:      "8px 14px",
    color:        "#0f172a",
    fontSize:     13,
    fontFamily:   "'Poppins', sans-serif",
    width:        130,
    outline:      "none",
  },
  btnPrimary: {
    background:   "#1e3a8a",
    border:       "none",
    borderRadius: 12,
    color:        "#fff",
    padding:      "8px 16px",
    cursor:       "pointer",
    fontSize:     13,
    fontWeight:   600,
    fontFamily:   "'Poppins', sans-serif",
    boxShadow:    "0 10px 24px rgba(30,58,138,0.18)",
    transition:   "background 0.2s ease, transform 0.2s ease",
  },
  chips: { display: "flex", gap: 8, padding: "14px 28px", flexWrap: "wrap" },
  chip: {
    background:   "rgba(248,250,252,0.72)",
    border:       "1px solid rgba(30,58,138,0.08)",
    borderRadius: 10,
    color:        "#64748b",
    padding:      "5px 12px",
    cursor:       "pointer",
    fontSize:     12,
    fontWeight:   500,
    fontFamily:   "'Poppins', sans-serif",
    transition:   "all 0.2s ease",
  },
  chipActive: {
    background:   "rgba(37,99,235,0.08)",
    borderColor:  "rgba(37,99,235,0.2)",
    color:        "#2563eb",
    fontWeight:   700,
  },
  intervalRow: {
    display:    "flex",
    gap:        4,
    padding:    "0 28px 12px",
    alignItems: "center",
  },
  ivBtn: {
    background:   "none",
    border:       "none",
    borderRadius: 8,
    color:        "#64748b",
    padding:      "5px 12px",
    cursor:       "pointer",
    fontSize:     12,
    fontFamily:   "'Poppins', sans-serif",
    fontWeight:   500,
    transition:   "all 0.2s ease",
  },
  ivActive: {
    background: "rgba(37,99,235,0.07)",
    color:      "#2563eb",
    fontWeight: 700,
  },
  reloadBtn: {
    marginLeft:   "auto",
    background:   "none",
    border:       "none",
    color:        "#64748b",
    cursor:       "pointer",
    fontSize:     18,
    padding:      "2px 6px",
    borderRadius: 8,
    transition:   "color 0.15s",
  },
  tooltip: {
    padding:    "8px 28px",
    minHeight:  34,
    display:    "flex",
    alignItems: "center",
    background: "rgba(248,250,252,0.5)",
    borderTop:  "1px solid rgba(30,58,138,0.04)",
  },
  overlay: {
    position:       "absolute",
    inset:          0,
    zIndex:         10,
    background:     "rgba(248,250,252,0.75)",
    backdropFilter: "blur(4px)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
  },
  spinner: {
    width:        32,
    height:       32,
    border:       "3px solid rgba(30,58,138,0.1)",
    borderTop:    "3px solid #2563eb",
    borderRadius: "50%",
    animation:    "spin 0.8s linear infinite",
  },
  stats: {
    display:       "flex",
    borderTop:     "1px solid rgba(30,58,138,0.06)",
  },
  stat: {
    flex:          1,
    display:       "flex",
    flexDirection: "column",
    gap:           4,
    padding:       "14px 20px",
    borderRight:   "1px solid rgba(30,58,138,0.06)",
  },
  statLabel: { color: "#64748b", fontSize: 11, fontWeight: 500 },
  statValue: { color: "#0f172a", fontSize: 13, fontWeight: 600 },
};
