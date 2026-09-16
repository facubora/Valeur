import { useEffect, useRef, useState } from "react";
import { createChart, AreaSeries, CrosshairMode } from "lightweight-charts";
import { useTheme } from "../context/ThemeContext";
import { money, formatDate } from "../lib/market";

const THEME = {
  light: { text: "#7a7a7a", grid: "rgba(0,0,0,0.05)", line: "#1447e6", top: "rgba(20,71,230,0.28)", cross: "rgba(20,71,230,0.4)" },
  dark: { text: "#9a9a9a", grid: "rgba(255,255,255,0.05)", line: "#c25cf5", top: "rgba(194,92,245,0.3)", cross: "rgba(194,92,245,0.5)" },
};

/* Evolución del valor del portfolio (área). `points` = [{ time, value }] */
export default function PortfolioChart({ points, loading }) {
  const { dark } = useTheme();
  const ref = useRef(null);
  const chart = useRef(null);
  const series = useRef(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!ref.current) return;
    const C = THEME[dark ? "dark" : "light"];
    const ch = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: ref.current.clientHeight,
      layout: {
        background: { color: "transparent" },
        textColor: C.text,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: C.cross, width: 1, style: 3, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.15, bottom: 0.05 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: false,
      handleScale: false,
    });
    const s = ch.addSeries(AreaSeries, {
      lineColor: C.line,
      topColor: C.top,
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "custom", formatter: (v) => money(v, 0) },
    });
    ch.subscribeCrosshairMove((p) => {
      const v = p.time ? p.seriesData.get(s) : null;
      setHover(v ? { time: p.time, value: v.value } : null);
    });
    const ro = new ResizeObserver(() => {
      if (ref.current) ch.resize(ref.current.clientWidth, ref.current.clientHeight);
    });
    ro.observe(ref.current);
    chart.current = ch;
    series.current = s;
    return () => {
      ro.disconnect();
      ch.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const C = THEME[dark ? "dark" : "light"];
    chart.current?.applyOptions({
      layout: { textColor: C.text },
      grid: { horzLines: { color: C.grid } },
      crosshair: { vertLine: { color: C.cross } },
    });
    series.current?.applyOptions({ lineColor: C.line, topColor: C.top });
  }, [dark]);

  useEffect(() => {
    if (!series.current) return;
    series.current.setData(points);
    chart.current?.timeScale().fitContent();
  }, [points]);

  const first = points[0]?.value ?? 0;
  const lastPt = points[points.length - 1]?.value ?? 0;
  const shown = hover?.value ?? lastPt;
  const diff = shown - first;

  return (
    <div className="pchart">
      <div className="pchart-tip">
        {points.length ? (
          <>
            <b>{money(shown)}</b>
            <span className={diff >= 0 ? "txt-up" : "txt-down"}>
              {diff >= 0 ? "+" : "-"}
              {money(Math.abs(diff))} en el período
            </span>
            <small>{hover ? formatDate(hover.time) : "hoy"}</small>
          </>
        ) : (
          <small>{loading ? "Armando la evolución…" : "Sin datos todavía"}</small>
        )}
      </div>
      <div ref={ref} className="pchart-canvas" />
      {loading && <div className="pchart-loading" />}
    </div>
  );
}
