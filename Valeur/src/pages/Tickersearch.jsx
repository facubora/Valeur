import { useState, useEffect, useRef, useCallback } from "react";
import { createChart, CrosshairMode, CandlestickSeries, HistogramSeries } from "lightweight-charts";

const API_BASE = "http://localhost:5001/api";

const THEME = {
  bg: "#f8fafc",
  surface: "rgba(255,255,255,0.72)",
  border: "rgba(30,58,138,0.08)",
  text: "#0f172a",
  textMuted: "#64748b",
  blue: "#2563eb",
  blueDark: "#1e3a8a",
  green: "#16a34a",
  red: "#dc2626",
};

const POPULAR_TICKERS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "JPM", name: "JPMorgan" },
  { symbol: "V", name: "Visa" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "DIS", name: "Disney" },
];

const INTERVALS = [
  ["daily", "1D"],
  ["weekly", "1S"],
  ["monthly", "1M"],
];

function useCandles(symbol, interval) {
  const [candles, setCandles] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const [cRes, qRes] = await Promise.all([
        fetch(`${API_BASE}/candles/${symbol}?interval=${interval}&limit=120`),
        fetch(`${API_BASE}/quote/${symbol}`),
      ]);
      if (!cRes.ok) throw new Error(`No se encontró el ticker "${symbol}"`);
      const cData = await cRes.json();
      const qData = qRes.ok ? await qRes.json() : null;
      setCandles(cData.candles || []);
      setQuote(qData);
    } catch (e) {
      setError(e.message);
      setCandles([]);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => {
    load();
  }, [load]);

  return { candles, quote, loading, error, reload: load };
}

function MiniChart({ symbol }) {
  const chartRef = useRef(null);
  const { candles } = useCandles(symbol, "daily");

  useEffect(() => {
    if (!chartRef.current || !candles.length) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 60,
      layout: { background: { color: "transparent" }, textColor: "transparent" },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      handleScroll: false,
      handleScale: false,
    });

    const first = candles[0]?.close ?? 0;
    const last = candles[candles.length - 1]?.close ?? 0;
    const isUp = last >= first;

    const lineSeries = chart.addSeries(CandlestickSeries, {
      upColor: THEME.green,
      downColor: THEME.red,
      borderUpColor: THEME.green,
      borderDownColor: THEME.red,
      wickUpColor: THEME.green,
      wickDownColor: THEME.red,
    });

    lineSeries.setData(
      candles.map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [candles]);

  return <div ref={chartRef} style={{ width: "100%", height: 60 }} />;
}

export default function TickerSearch() {
  const [input, setInput] = useState("");
  const [symbol, setSymbol] = useState("AAPL");
  const [interval, setInterval] = useState("daily");
  const [hovered, setHovered] = useState(null);
  const [recentSearches, setRecentSearches] = useState(["AAPL", "NVDA", "TSLA"]);

  const chartRef = useRef(null);
  const chartInst = useRef(null);
  const candleSer = useRef(null);
  const volSer = useRef(null);

  const { candles, quote, loading, error, reload } = useCandles(symbol, interval);

  // Build main chart once
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 340,
      layout: {
        background: { color: "transparent" },
        textColor: THEME.textMuted,
        fontFamily: "'Poppins', system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(30,58,138,0.04)" },
        horzLines: { color: "rgba(30,58,138,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(37,99,235,0.25)", width: 1, style: 3 },
        horzLine: { color: "rgba(37,99,235,0.25)", width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: "rgba(30,58,138,0.08)",
        scaleMargins: { top: 0.1, bottom: 0.28 },
      },
      timeScale: {
        borderColor: "rgba(30,58,138,0.08)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
    });

    const cs = chart.addSeries(CandlestickSeries, {
      upColor: THEME.green,
      downColor: THEME.red,
      borderUpColor: THEME.green,
      borderDownColor: THEME.red,
      wickUpColor: THEME.green,
      wickDownColor: THEME.red,
    });

    const vs = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setHovered(null);
        return;
      }
      const cVal = param.seriesData.get(cs);
      if (cVal) setHovered(cVal);
    });

    const ro = new ResizeObserver(() => {
      if (chartRef.current) chart.resize(chartRef.current.clientWidth, 340);
    });
    ro.observe(chartRef.current);

    chartInst.current = chart;
    candleSer.current = cs;
    volSer.current = vs;

    return () => {
      chart.remove();
      ro.disconnect();
    };
  }, []);

  // Feed data into chart
  useEffect(() => {
    if (!candleSer.current || !volSer.current || !candles.length) return;

    candleSer.current.setData(
      candles.map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    volSer.current.setData(
      candles.map((c) => ({
        time: c.date,
        value: c.volume,
        color:
          c.close >= c.open ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.18)",
      }))
    );
    chartInst.current?.timeScale().fitContent();
  }, [candles]);

  const handleSearch = (e) => {
    e.preventDefault();
    const s = input.trim().toUpperCase();
    if (!s) return;
    selectSymbol(s);
    setInput("");
  };

  const selectSymbol = (s) => {
    setSymbol(s);
    setRecentSearches((prev) => {
      const next = [s, ...prev.filter((x) => x !== s)].slice(0, 5);
      return next;
    });
  };

  const pct = quote ? parseFloat(quote.change_pct) : 0;
  const isUp = pct >= 0;
  const pctClr = isUp ? THEME.green : THEME.red;

  return (
    <div className="dash-page">
      {/* Topbar */}
      <header className="dash-topbar">
        <a href="/" className="auth-logo" style={{ marginBottom: 0 }}>
          Valeur<span>.</span>
        </a>
        <div className="dash-topbar-right">
          <a href="/dashboard" className="dash-logout" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            ← Dashboard
          </a>
        </div>
      </header>

      <main className="dash-main">
        {/* Título */}
        <section className="dash-greeting">
          <h1>
            Buscá un <em>ticker</em>.
          </h1>
          <p>Explorá precios, gráficos y estadísticas de cualquier activo del mercado.</p>
        </section>

        {/* Barra de búsqueda principal */}
        <div style={s.searchBlock}>
          <form onSubmit={handleSearch} style={s.searchForm}>
            <div style={s.searchIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={THEME.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Ingresá un ticker… ej: AAPL, TSLA, GOOGL"
              style={s.searchInput}
              autoFocus
            />
            <button type="submit" style={s.searchBtn}>
              Buscar
            </button>
          </form>

          {/* Búsquedas recientes */}
          {recentSearches.length > 0 && (
            <div style={s.recentRow}>
              <span style={s.recentLabel}>Recientes</span>
              {recentSearches.map((sym) => (
                <button
                  key={sym}
                  onClick={() => selectSymbol(sym)}
                  style={{
                    ...s.recentChip,
                    ...(sym === symbol ? s.recentChipActive : {}),
                  }}
                >
                  {sym}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tickers populares */}
        <section>
          <h2 className="dash-section-title">Tickers populares</h2>
          <div style={s.popularGrid}>
            {POPULAR_TICKERS.map((t) => (
              <button
                key={t.symbol}
                onClick={() => selectSymbol(t.symbol)}
                style={{
                  ...s.popularCard,
                  ...(t.symbol === symbol ? s.popularCardActive : {}),
                }}
              >
                <strong style={s.popularSymbol}>{t.symbol}</strong>
                <span style={s.popularName}>{t.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Panel principal del ticker seleccionado */}
        <section>
          <h2 className="dash-section-title">
            {symbol} — Detalle del activo
          </h2>

          {/* Quote header */}
          {quote && !loading && (
            <div style={s.quoteBar}>
              <div style={s.quoteLeft}>
                <span style={s.quoteTicker}>{symbol}</span>
                <span style={s.quotePrice}>${quote.price?.toFixed(2)}</span>
                <span
                  style={{
                    ...s.quoteBadge,
                    background: isUp
                      ? "rgba(22,163,74,0.1)"
                      : "rgba(220,38,38,0.1)",
                    color: pctClr,
                  }}
                >
                  {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                </span>
                <span style={s.quoteChange}>
                  {isUp ? "+" : ""}
                  {quote.change?.toFixed(2)} hoy
                </span>
              </div>
              <div style={s.intervalRow}>
                {INTERVALS.map(([iv, label]) => (
                  <button
                    key={iv}
                    onClick={() => setInterval(iv)}
                    style={{
                      ...s.ivBtn,
                      ...(iv === interval ? s.ivActive : {}),
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button onClick={reload} style={s.reloadBtn} title="Recargar">
                  ↻
                </button>
              </div>
            </div>
          )}

          {/* Chart card */}
          <div style={s.chartCard}>
            {/* OHLC tooltip */}
            <div style={s.tooltip}>
              {hovered ? (
                <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: "'Poppins', sans-serif" }}>
                  {[
                    ["Apertura", hovered.open, THEME.textMuted],
                    ["Máx", hovered.high, THEME.green],
                    ["Mín", hovered.low, THEME.red],
                    ["Cierre", hovered.close, THEME.text],
                  ].map(([l, v, c]) => (
                    <span key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: THEME.textMuted, fontSize: 10 }}>{l}</span>
                      <span style={{ color: c, fontWeight: 700 }}>
                        ${v?.toFixed(2)}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ color: THEME.textMuted, fontSize: 12, fontFamily: "'Poppins', sans-serif" }}>
                  {loading
                    ? "Cargando datos…"
                    : error
                    ? `⚠ ${error}`
                    : "Pasá el cursor por el gráfico para ver OHLC"}
                </span>
              )}
            </div>

            {/* Chart */}
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", margin: "0 4px 4px" }}>
              {(loading || error) && (
                <div style={s.overlay}>
                  {loading && <div style={s.spinner} />}
                  {error && !loading && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: THEME.red, marginBottom: 10, fontFamily: "'Poppins', sans-serif", fontSize: 14 }}>
                        {error}
                      </div>
                      <button onClick={reload} style={s.btnPrimary}>
                        Reintentar
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div ref={chartRef} style={{ width: "100%", background: "transparent" }} />
            </div>

            {/* Stats footer */}
            {quote && !loading && (
              <div style={s.statsRow}>
                {[
                  ["Volumen", (quote.volume / 1e6).toFixed(1) + "M"],
                  ["Cierre ant.", "$" + quote.prev_close?.toFixed(2)],
                  ["Cambio $", (isUp ? "+" : "") + quote.change?.toFixed(2)],
                  ["Última sesión", quote.latest_trading_day],
                ].map(([label, value]) => (
                  <div key={label} style={s.statCell}>
                    <span style={s.statLabel}>{label}</span>
                    <span style={s.statValue}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const s = {
  // Search block
  searchBlock: {
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(30,58,138,0.08)",
    borderRadius: 20,
    padding: "20px 24px",
    backdropFilter: "blur(14px)",
    boxShadow: "0 18px 45px rgba(15,23,42,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  searchForm: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
  },
  searchInput: {
    flex: 1,
    height: 52,
    paddingLeft: 46,
    paddingRight: 16,
    border: "1px solid rgba(30,58,138,0.12)",
    borderRadius: 14,
    background: "rgba(248,250,252,0.85)",
    color: "#0f172a",
    fontSize: 15,
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 500,
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  searchBtn: {
    height: 52,
    padding: "0 24px",
    background: "#1e3a8a",
    border: "none",
    borderRadius: 14,
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Poppins', sans-serif",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(30,58,138,0.18)",
    transition: "background 0.2s ease, transform 0.2s ease",
    whiteSpace: "nowrap",
  },
  recentRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  recentLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    fontFamily: "'Poppins', sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginRight: 4,
  },
  recentChip: {
    height: 30,
    padding: "0 12px",
    background: "rgba(248,250,252,0.72)",
    border: "1px solid rgba(30,58,138,0.08)",
    borderRadius: 8,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Poppins', sans-serif",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  recentChipActive: {
    background: "rgba(37,99,235,0.08)",
    borderColor: "rgba(37,99,235,0.2)",
    color: "#2563eb",
  },

  // Popular grid
  popularGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: 12,
  },
  popularCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    padding: "16px 18px",
    background: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 16,
    backdropFilter: "blur(10px)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left",
  },
  popularCardActive: {
    background: "rgba(37,99,235,0.06)",
    borderColor: "rgba(37,99,235,0.18)",
    boxShadow: "0 4px 16px rgba(37,99,235,0.08)",
  },
  popularSymbol: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.02em",
    fontFamily: "'Poppins', sans-serif",
  },
  popularName: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 500,
  },

  // Quote bar
  quoteBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
    padding: "16px 20px",
    background: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 16,
    backdropFilter: "blur(10px)",
  },
  quoteLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  quoteTicker: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.04em",
    fontFamily: "'Poppins', sans-serif",
  },
  quotePrice: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.04em",
    fontFamily: "'Poppins', sans-serif",
  },
  quoteBadge: {
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    fontFamily: "'Poppins', sans-serif",
  },
  quoteChange: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: "'Poppins', sans-serif",
  },
  intervalRow: {
    display: "flex",
    gap: 4,
    alignItems: "center",
  },
  ivBtn: {
    background: "none",
    border: "1px solid rgba(30,58,138,0.08)",
    borderRadius: 9,
    color: "#64748b",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 500,
    transition: "all 0.2s ease",
  },
  ivActive: {
    background: "rgba(37,99,235,0.07)",
    borderColor: "rgba(37,99,235,0.18)",
    color: "#2563eb",
    fontWeight: 700,
  },
  reloadBtn: {
    marginLeft: 4,
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontSize: 20,
    padding: "2px 6px",
    borderRadius: 8,
    transition: "color 0.15s",
  },

  // Chart card
  chartCard: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(14px)",
    borderRadius: 24,
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.05)",
    overflow: "hidden",
  },
  tooltip: {
    padding: "12px 24px",
    minHeight: 40,
    display: "flex",
    alignItems: "center",
    background: "rgba(248,250,252,0.5)",
    borderBottom: "1px solid rgba(30,58,138,0.05)",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    background: "rgba(248,250,252,0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(30,58,138,0.1)",
    borderTop: "3px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  statsRow: {
    display: "flex",
    borderTop: "1px solid rgba(30,58,138,0.06)",
  },
  statCell: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "14px 20px",
    borderRight: "1px solid rgba(30,58,138,0.06)",
  },
  statLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "'Poppins', sans-serif",
  },
  statValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Poppins', sans-serif",
  },
  btnPrimary: {
    background: "#1e3a8a",
    border: "none",
    borderRadius: 12,
    color: "#fff",
    padding: "8px 18px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Poppins', sans-serif",
    boxShadow: "0 10px 24px rgba(30,58,138,0.18)",
    transition: "background 0.2s ease",
  },
};