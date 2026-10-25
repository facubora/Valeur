import { useEffect, useMemo, useRef, useState } from "react";
import { createChart, createSeriesMarkers, AreaSeries, LineSeries, LineStyle, CrosshairMode } from "lightweight-charts";
import { useTheme } from "../context/ThemeContext";
import { money, signed, pct, formatDate } from "../lib/market";

const THEME = {
  light: {
    text: "#7a7a7a",
    grid: "rgba(0,0,0,0.05)",
    line: "#1447e6",
    top: "rgba(20,71,230,0.22)",
    cross: "rgba(20,71,230,0.4)",
    base: "rgba(0,0,0,0.38)",
    cmp: "#e0861b",
    up: "#16a34a",
    down: "#dc2626",
  },
  dark: {
    text: "#9a9a9a",
    grid: "rgba(255,255,255,0.05)",
    line: "#c25cf5",
    top: "rgba(194,92,245,0.24)",
    cross: "rgba(194,92,245,0.5)",
    base: "rgba(255,255,255,0.4)",
    cmp: "#f2a541",
    up: "#4ade80",
    down: "#f87171",
  },
};

const AXIS = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });

/* Fecha local YYYY-MM-DD (toISOString da el día UTC, que a la noche ya es mañana) */
const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* Evolución del portfolio: el área es lo que vale, la línea punteada es lo
   que pusiste. La distancia entre las dos es la ganancia; así una compra no
   parece una suba. `points` = [{ time, value, invested }]; `live` = { value,
   invested } con precios en vivo, pisa el día de hoy para que el final del
   gráfico coincida con el total de arriba.
   Para el simulador, además: `compare` = { label, points: [{ time, value }] }
   dibuja una segunda línea (lo mismo en otro activo) y `marks` =
   [{ time, kind: "worst" | "best", text }] pone marcas sobre la curva. */
export default function PortfolioChart({ points: raw, live, currency = "USD", loading, compare = null, marks = null }) {
  const { dark } = useTheme();
  const ref = useRef(null);
  const chart = useRef(null);
  const area = useRef(null);
  const base = useRef(null);
  const cmp = useRef(null);
  const pins = useRef(null);
  const [hover, setHover] = useState(null);
  const liveValue = live?.value;
  const liveInvested = live?.invested;

  const points = useMemo(() => {
    const pts = raw.filter((p) => Number.isFinite(p.value) && Number.isFinite(p.invested));
    if (!pts.length || !Number.isFinite(liveValue) || !Number.isFinite(liveInvested)) return pts;
    const day = localDay();
    const rest = pts[pts.length - 1].time === day ? pts.slice(0, -1) : pts;
    return [...rest, { time: day, value: liveValue, invested: liveInvested }];
  }, [raw, liveValue, liveInvested]);

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
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      // eje compacto ("1,5 M", "750 mil"): la moneda ya está en los valores de arriba
      localization: { locale: "es-AR", priceFormatter: (v) => AXIS.format(v) },
      handleScroll: false,
      handleScale: false,
    });
    const b = ch.addSeries(LineSeries, {
      color: C.base,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      lineType: 1, // escalonada: lo invertido cambia de golpe en cada operación
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const c = ch.addSeries(LineSeries, {
      color: C.cmp,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const s = ch.addSeries(AreaSeries, {
      lineColor: C.line,
      topColor: C.top,
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ch.subscribeCrosshairMove((p) => {
      setHover(p.time ? String(p.time) : null);
    });
    const ro = new ResizeObserver(() => {
      if (ref.current) ch.resize(ref.current.clientWidth, ref.current.clientHeight);
    });
    ro.observe(ref.current);
    chart.current = ch;
    area.current = s;
    base.current = b;
    cmp.current = c;
    pins.current = createSeriesMarkers(s, []);
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
    area.current?.applyOptions({ lineColor: C.line, topColor: C.top });
    base.current?.applyOptions({ color: C.base });
    cmp.current?.applyOptions({ color: C.cmp });
  }, [dark]);

  useEffect(() => {
    if (!area.current) return;
    area.current.setData(points.map((p) => ({ time: p.time, value: p.value })));
    base.current.setData(points.map((p) => ({ time: p.time, value: p.invested })));
    chart.current?.timeScale().fitContent();
  }, [points]);

  // la línea para comparar, recortada a las mismas fechas
  const cmpPoints = compare?.points;
  useEffect(() => {
    if (!cmp.current) return;
    const from = points[0]?.time;
    cmp.current.setData(cmpPoints && from ? cmpPoints.filter((p) => p.time >= from && Number.isFinite(p.value)).map((p) => ({ time: p.time, value: p.value })) : []);
  }, [cmpPoints, points]);

  // las marcas caen en el primer día con dato desde su fecha (la curva puede venir raleada)
  useEffect(() => {
    if (!pins.current) return;
    const C = THEME[dark ? "dark" : "light"];
    const times = points.map((p) => p.time);
    const snap = (t) => times.find((x) => x >= t);
    const STYLE = {
      worst: { position: "belowBar", shape: "arrowUp", color: C.down, size: 1 },
      best: { position: "aboveBar", shape: "arrowDown", color: C.up, size: 1 },
    };
    const list = (marks || [])
      .map((m) => ({ ...m, time: snap(m.time) }))
      .filter((m) => m.time)
      .sort((a, b) => (a.time < b.time ? -1 : 1))
      .map((m) => ({ time: m.time, text: m.text || "", ...STYLE[m.kind] }));
    pins.current.setMarkers(list);
  }, [marks, points, dark]);

  const shown = (hover && points.find((p) => p.time === hover)) || points[points.length - 1];
  // lo comparado en ese día (o el último anterior: otro activo puede no cotizar ese día)
  const cmpShown = useMemo(() => {
    if (!cmpPoints?.length || !shown) return null;
    let hit = null;
    for (const p of cmpPoints) {
      if (p.time > shown.time) break;
      hit = p;
    }
    return hit;
  }, [cmpPoints, shown]);
  const gain = shown ? shown.value - shown.invested : 0;
  const gainPct = shown?.invested ? (gain / shown.invested) * 100 : 0;
  const fewPoints = points.length === 1;

  return (
    <div className="pchart">
      <div className="pchart-tip">
        {shown ? (
          <>
            <span className="pt-item">
              <i className="pt-key val" aria-hidden="true" />
              <small>Valor</small>
              <b>{money(shown.value, undefined, currency)}</b>
            </span>
            <span className="pt-item">
              <i className="pt-key inv" aria-hidden="true" />
              <small>Invertido</small>
              <b>{money(shown.invested, undefined, currency)}</b>
            </span>
            {cmpShown && (
              <span className="pt-item">
                <i className="pt-key cmp" aria-hidden="true" />
                <small>{compare.label}</small>
                <b>{money(cmpShown.value, undefined, currency)}</b>
              </span>
            )}
            <span className={"pt-item " + (gain >= 0 ? "txt-up" : "txt-down")}>
              <small>Ganancia</small>
              <b>
                {signed(gain, undefined, currency)} <em>({pct(gainPct)})</em>
              </b>
            </span>
            <small className="pt-date">{hover ? formatDate(hover) : "hoy"}</small>
          </>
        ) : (
          <small>{loading ? "Armando la evolución…" : "Sin datos todavía"}</small>
        )}
      </div>
      <div ref={ref} className="pchart-canvas" />
      {fewPoints && !loading && <p className="pchart-note">La curva se arma a partir del próximo cierre.</p>}
      {loading && <div className="pchart-loading" />}
    </div>
  );
}
