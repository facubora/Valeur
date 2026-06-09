import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { createChart, CrosshairMode, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { useTheme } from "../context/ThemeContext";

const API_BASE = "http://localhost:5001/api";

function getThemeColors(dark) {
  return {
    bg:        dark ? "#0b0b12" : "#f8fafc",
    text:      dark ? "#f1f5f9" : "#0f172a",
    textMuted: dark ? "#94a3b8" : "#64748b",
    blue:      dark ? "#3b82f6" : "#2563eb",
    blueDark:  dark ? "#2563eb" : "#1e3a8a",
    green:     dark ? "#22c55e" : "#16a34a",
    red:       dark ? "#f87171" : "#dc2626",

    // Superficies
    surface:      dark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.65)",
    surfaceCard:  dark ? "rgba(255,255,255,0.05)"  : "rgba(255,255,255,0.72)",
    surfaceInput: dark ? "rgba(255,255,255,0.04)"  : "rgba(248,250,252,0.85)",
    surfaceSoft:  dark ? "rgba(255,255,255,0.03)"  : "rgba(248,250,252,0.6)",
    chip:         dark ? "rgba(255,255,255,0.05)"  : "rgba(248,250,252,0.72)",

    // Bordes
    border:      dark ? "rgba(255,255,255,0.09)" : "rgba(30,58,138,0.08)",
    borderSoft:  dark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)",
    borderInput: dark ? "rgba(255,255,255,0.12)" : "rgba(30,58,138,0.12)",

    // Acentos
    blueSoft:       dark ? "rgba(59,130,246,0.16)" : "rgba(37,99,235,0.08)",
    blueSoftBorder: dark ? "rgba(59,130,246,0.34)" : "rgba(37,99,235,0.2)",

    // Sombras / overlay
    overlay:    dark ? "rgba(11,11,18,0.78)"          : "rgba(248,250,252,0.75)",
    shadow:     dark ? "0 24px 60px rgba(0,0,0,0.45)"  : "0 24px 60px rgba(15,23,42,0.05)",
    shadowSoft: dark ? "0 18px 45px rgba(0,0,0,0.4)"   : "0 18px 45px rgba(15,23,42,0.05)",
    shadowBtn:  dark ? "0 10px 24px rgba(37,99,235,0.4)" : "0 10px 24px rgba(30,58,138,0.18)",

    // Gráfico
    chartGrid: dark ? "rgba(255,255,255,0.045)" : "rgba(30,58,138,0.04)",
    crosshair: dark ? "rgba(148,163,184,0.35)"  : "rgba(37,99,235,0.25)",
  };
}

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
  ["30min", "30m"],
  ["hourly", "1H"],
  ["daily", "1D"],
  ["weekly", "1S"],
  ["monthly", "1M"],
];

const INTRADAY = ["hourly", "30min"];

const CHART_HEIGHT = 560;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDate(d) {
  if (!d) return "";
  const str = typeof d === "string" ? d : "";
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${parseInt(m[3])} ${MESES[parseInt(m[2]) - 1]} ${m[1]}`;
  return String(d);
}

function useCandles(symbol, interval, range = "6m") {
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
        fetch(`${API_BASE}/candles/${symbol}?interval=${interval}&range=${range}`),
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
  }, [symbol, interval, range]);

  useEffect(() => {
    load();
  }, [load]);

  return { candles, quote, loading, error, reload: load };
}

function MiniChart({ symbol }) {
  const chartRef = useRef(null);
  const { dark } = useTheme();
  const C = getThemeColors(dark);
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
      upColor: C.green,
      downColor: C.red,
      borderUpColor: C.green,
      borderDownColor: C.red,
      wickUpColor: C.green,
      wickDownColor: C.red,
    });

    lineSeries.setData(
      candles.map((c) => ({
        time: c.time,
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
  const { dark, toggle } = useTheme();
  const C = getThemeColors(dark);
  const s = makeStyles(C);

  const [searchParams] = useSearchParams();
  const initialSymbol = (searchParams.get("symbol") || "AAPL").toUpperCase();

  const [input, setInput] = useState("");
  const [symbol, setSymbol] = useState(initialSymbol);
  const [interval, setInterval] = useState("daily");
  const [range, setRange] = useState("max");
  const [hovered, setHovered] = useState(null);
  const [recentSearches, setRecentSearches] = useState(["AAPL", "NVDA", "TSLA"]);

  const chartRef = useRef(null);
  const chartInst = useRef(null);
  const candleSer = useRef(null);
  const volSer = useRef(null);
  const candlesRef = useRef([]);

  const handleInterval = (iv) => {
    const toIntraday = INTRADAY.includes(iv);
    const fromIntraday = INTRADAY.includes(interval);
    if (toIntraday && !fromIntraday) setRange("5d");
    if (!toIntraday && fromIntraday) setRange("max");
    setInterval(iv);
  };

  const { candles, quote, loading, error, reload } = useCandles(symbol, interval, range);

  // Build main chart once
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight || CHART_HEIGHT,
      layout: {
        background: { color: "transparent" },
        textColor: C.textMuted,
        fontFamily: "'Poppins', system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: C.chartGrid },
        horzLines: { color: C.chartGrid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: C.crosshair, width: 1, style: 3 },
        horzLine: { color: C.crosshair, width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: C.border,
        scaleMargins: { top: 0.1, bottom: 0.28 },
      },
      timeScale: {
        borderColor: C.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
    });

    const cs = chart.addSeries(CandlestickSeries, {
      upColor: C.green,
      downColor: C.red,
      borderUpColor: C.green,
      borderDownColor: C.red,
      wickUpColor: C.green,
      wickDownColor: C.red,
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
      if (chartRef.current) chart.resize(chartRef.current.clientWidth, chartRef.current.clientHeight || CHART_HEIGHT);
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

  // Recolorear el gráfico cuando cambia el tema
  useEffect(() => {
    if (!chartInst.current) return;
    chartInst.current.applyOptions({
      layout: { textColor: C.textMuted },
      grid: { vertLines: { color: C.chartGrid }, horzLines: { color: C.chartGrid } },
      crosshair: { vertLine: { color: C.crosshair }, horzLine: { color: C.crosshair } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { borderColor: C.border },
    });
    candleSer.current?.applyOptions({
      upColor: C.green, downColor: C.red,
      borderUpColor: C.green, borderDownColor: C.red,
      wickUpColor: C.green, wickDownColor: C.red,
    });
    volSer.current?.setData(
      candlesRef.current.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? `${C.green}33` : `${C.red}2b`,
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  // Feed data into chart
  useEffect(() => {
    candlesRef.current = candles;
    if (!candleSer.current || !volSer.current || !candles.length) return;

    candleSer.current.setData(
      candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    volSer.current.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? `${C.green}33` : `${C.red}2b`,
      }))
    );

    // Tipo TradingView: arranca en lo más reciente con detalle,
    // el resto del histórico queda para deslizar hacia atrás.
    const ts = chartInst.current?.timeScale();
    const len = candles.length;
    if (ts) {
      if (len > 150) {
        ts.setVisibleLogicalRange({ from: len - 120, to: len + 3 });
      } else {
        ts.fitContent();
      }
    }
  }, [candles]);

  const handleSearch = (e) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    selectSymbol(sym);
    setInput("");
  };

  const selectSymbol = (sym) => {
    setSymbol(sym);
    setRecentSearches((prev) => {
      const next = [sym, ...prev.filter((x) => x !== sym)].slice(0, 5);
      return next;
    });
  };

  const pct = quote ? parseFloat(quote.change_pct) : 0;
  const isUp = pct >= 0;
  const pctClr = isUp ? C.green : C.red;

  return (
    <div className="dash-page">
      {/* Topbar */}
      <header className="dash-topbar">
        <a href="/" className="auth-logo" style={{ marginBottom: 0 }}>
          Valeur<span>.</span>
        </a>
        <div className="dash-topbar-right">
          <button
            className="dash-theme-toggle"
            onClick={toggle}
            aria-label="Cambiar tema"
            title={dark ? "Modo claro" : "Modo oscuro"}
          >
            {dark ? <i className="bi bi-sun"></i> : <i className="bi bi-moon"></i>}
          </button>
        </div>
      </header>

      <main className="dash-main">
        {/* Título */}
        <section className="dash-greeting">
          <h1>
            Buscá un <em>ticker.</em>
          </h1>
          <p>Explorá precios, gráficos y estadísticas de cualquier activo del mercado.</p>
        </section>

        {/* Barra de búsqueda principal */}
        <div style={s.searchBlock}>
          <form onSubmit={handleSearch} style={s.searchForm}>
            <div style={s.searchIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* Panel principal del ticker seleccionado */}
        <section>
          {/* Header mínimo arriba */}
          {quote && !loading && (
            <div style={s.quoteBarMin}>
              <span style={s.quoteTicker}>{symbol}</span>
              <span style={s.quotePrice}>${quote.price?.toFixed(2)}</span>
              <span
                style={{
                  ...s.quoteBadge,
                  background: isUp ? `${C.green}1a` : `${C.red}1a`,
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
          )}

          {/* Chart card — protagonista */}
          <div style={s.chartCard}>
            {/* Gráfico grande */}
            <div style={s.chartWrap}>
              {(loading || error) && (
                <div style={s.overlay}>
                  {loading && <div style={s.spinner} />}
                  {error && !loading && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: C.red, marginBottom: 10, fontFamily: "'Poppins', sans-serif", fontSize: 14 }}>
                        {error}
                      </div>
                      <button onClick={reload} style={s.btnPrimary}>
                        Reintentar
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div ref={chartRef} style={{ width: "100%", height: "100%", background: "transparent" }} />
            </div>

            {/* Barra de controles ABAJO: intervalos + OHLC */}
            <div style={s.controlBar}>


              <div style={s.ohlcRow}>
                {hovered ? (
                  <>
                    <span style={s.ohlcItem}>
                      <span style={s.ohlcLabel}>Fecha</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{formatDate(hovered.date)}</span>
                    </span>
                    {[
                      ["Apert.", hovered.open, C.textMuted],
                      ["Máx", hovered.high, C.green],
                      ["Mín", hovered.low, C.red],
                      ["Cierre", hovered.close, C.text],
                    ].map(([l, v, c]) => (
                      <span key={l} style={s.ohlcItem}>
                        <span style={s.ohlcLabel}>{l}</span>
                        <span style={{ color: c, fontWeight: 700 }}>${v?.toFixed(2)}</span>
                      </span>
                    ))}
                    {hovered.dayChange != null && (
                      <span style={s.ohlcItem}>
                        <span style={s.ohlcLabel}>Cambio</span>
                        <span style={{ color: hovered.dayChange >= 0 ? C.green : C.red, fontWeight: 700 }}>
                          {hovered.dayChange >= 0 ? "▲" : "▼"} {Math.abs(hovered.dayChange).toFixed(2)}%
                        </span>
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: C.textMuted, fontSize: 12 }}>
                    {loading ? "Cargando datos…" : error ? `⚠ ${error}` : "Pasá el cursor por el gráfico"}
                  </span>
                )}
              </div>
            </div>

            {/* Stats footer */}
            {quote && !loading && (
              <div style={s.statsRow}>
                {[
                  ["Volumen", (quote.volume / 1e6).toFixed(1) + "M"],
                  ["Cierre ant.", "$" + quote.prev_close?.toFixed(2)],
                  ["Cambio $", (isUp ? "+" : "") + quote.change?.toFixed(2)],
                  ["Última sesión", formatDate(quote.latest_date)],
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

function makeStyles(C) {
  return {
    // Search block
    searchBlock: {
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      padding: "20px 24px",
      backdropFilter: "blur(14px)",
      boxShadow: C.shadowSoft,
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
      border: `1px solid ${C.borderInput}`,
      borderRadius: 14,
      background: C.surfaceInput,
      color: C.text,
      fontSize: 15,
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 500,
      outline: "none",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    searchBtn: {
      height: 52,
      padding: "0 24px",
      background: C.blueDark,
      border: "none",
      borderRadius: 14,
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "'Poppins', sans-serif",
      cursor: "pointer",
      boxShadow: C.shadowBtn,
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
      color: C.textMuted,
      fontFamily: "'Poppins', sans-serif",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginRight: 4,
    },
    recentChip: {
      height: 30,
      padding: "0 12px",
      background: C.chip,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      color: C.textMuted,
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "'Poppins', sans-serif",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    recentChipActive: {
      background: C.blueSoft,
      borderColor: C.blueSoftBorder,
      color: C.blue,
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
      background: C.surface,
      border: `1px solid ${C.borderSoft}`,
      borderRadius: 16,
      backdropFilter: "blur(10px)",
      cursor: "pointer",
      transition: "all 0.2s ease",
      textAlign: "left",
    },
    popularCardActive: {
      background: C.blueSoft,
      borderColor: C.blueSoftBorder,
      boxShadow: "0 4px 16px rgba(37,99,235,0.08)",
    },
    popularSymbol: {
      fontSize: 14,
      fontWeight: 700,
      color: C.text,
      letterSpacing: "-0.02em",
      fontFamily: "'Poppins', sans-serif",
    },
    popularName: {
      fontSize: 11,
      color: C.textMuted,
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
      background: C.surface,
      border: `1px solid ${C.borderSoft}`,
      borderRadius: 16,
      backdropFilter: "blur(10px)",
    },
    quoteLeft: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    quoteBarMin: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 12,
      padding: "0 4px",
    },
    chartWrap: {
      position: "relative",
      height: "76vh",
      minHeight: 440,
      borderRadius: 18,
      overflow: "hidden",
      margin: 4,
    },
    controlBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
      padding: "10px 20px",
      borderTop: `1px solid ${C.borderSoft}`,
    },
    ohlcRow: {
      display: "flex",
      alignItems: "center",
      gap: 18,
      flexWrap: "wrap",
      fontFamily: "'Poppins', sans-serif",
    },
    ohlcItem: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      fontSize: 12,
    },
    ohlcLabel: {
      color: C.textMuted,
      fontSize: 10,
    },
    quoteTicker: {
      fontSize: 18,
      fontWeight: 700,
      color: C.text,
      letterSpacing: "-0.04em",
      fontFamily: "'Poppins', sans-serif",
    },
    quotePrice: {
      fontSize: 20,
      fontWeight: 700,
      color: C.text,
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
      color: C.textMuted,
      fontFamily: "'Poppins', sans-serif",
    },
    intervalRow: {
      display: "flex",
      gap: 4,
      alignItems: "center",
      flexWrap: "wrap",
    },
    rangeGroup: {
      display: "flex",
      gap: 2,
      marginLeft: "auto",
      alignItems: "center",
      background: C.surfaceSoft,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: 3,
    },
    rangeBtn: {
      background: "none",
      border: "none",
      borderRadius: 7,
      color: C.textMuted,
      padding: "4px 10px",
      cursor: "pointer",
      fontSize: 11,
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 500,
      transition: "all 0.15s ease",
    },
    rangeActive: {
      background: C.blueDark,
      color: "#fff",
      fontWeight: 700,
    },
    ivBtn: {
      background: "none",
      border: `1px solid ${C.border}`,
      borderRadius: 9,
      color: C.textMuted,
      padding: "6px 14px",
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 500,
      transition: "all 0.2s ease",
    },
    ivActive: {
      background: C.blueSoft,
      borderColor: C.blueSoftBorder,
      color: C.blue,
      fontWeight: 700,
    },
    reloadBtn: {
      marginLeft: 4,
      background: "none",
      border: "none",
      color: C.textMuted,
      cursor: "pointer",
      fontSize: 20,
      padding: "2px 6px",
      borderRadius: 8,
      transition: "color 0.15s",
    },

    // Chart card
    chartCard: {
      background: C.surfaceCard,
      backdropFilter: "blur(14px)",
      borderRadius: 24,
      border: `1px solid ${C.borderSoft}`,
      boxShadow: C.shadow,
      overflow: "hidden",
    },
    tooltip: {
      padding: "12px 24px",
      minHeight: 40,
      display: "flex",
      alignItems: "center",
      background: C.surfaceSoft,
      borderBottom: `1px solid ${C.border}`,
    },
    overlay: {
      position: "absolute",
      inset: 0,
      zIndex: 10,
      background: C.overlay,
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    spinner: {
      width: 32,
      height: 32,
      border: `3px solid ${C.border}`,
      borderTop: `3px solid ${C.blue}`,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    },
    statsRow: {
      display: "flex",
      borderTop: `1px solid ${C.borderSoft}`,
    },
    statCell: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 4,
      padding: "14px 20px",
      borderRight: `1px solid ${C.borderSoft}`,
    },
    statLabel: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: 500,
      fontFamily: "'Poppins', sans-serif",
    },
    statValue: {
      color: C.text,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'Poppins', sans-serif",
    },
    btnPrimary: {
      background: C.blueDark,
      border: "none",
      borderRadius: 12,
      color: "#fff",
      padding: "8px 18px",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'Poppins', sans-serif",
      boxShadow: C.shadowBtn,
      transition: "background 0.2s ease",
    },
  };
}