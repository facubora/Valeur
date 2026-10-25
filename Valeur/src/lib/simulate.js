import { convert } from "./market";

/* ── Simulador "¿Y si hubiera invertido?" ─────────────────────────────────
   Con los cierres diarios del activo: cuánto valdría hoy haber puesto
   `amount` (en `cur`) desde `from` ("YYYY-MM-DD"), de una vez o todos los
   meses. El dólar de cada compra es el MEP de ese día; el valor de cada día,
   al MEP de ese día. Sin comisiones ni dividendos. */
export function simulate({ candles, from, amount, monthly, cur, assetCur, mep }) {
  const rows = candles.filter((c) => c.time >= from && Number.isFinite(c.close) && c.close > 0);
  if (!rows.length || !(amount > 0)) return null;
  const rateAt = (day) => (cur === assetCur ? 1 : mep ? mep.at(day) : NaN);
  if (cur !== assetCur && !mep) return null;

  // días de compra: el primero, y si es mensual, el primer día con precio de cada mes
  const buyDays = new Set();
  let lastMonth = "";
  for (const c of rows) {
    const m = c.time.slice(0, 7);
    if (!buyDays.size || (monthly && m !== lastMonth)) buyDays.add(c.time);
    lastMonth = m;
  }

  let units = 0;
  let invested = 0;
  const buys = [];
  const points = [];
  let worst = null;
  let peak = null;
  for (const c of rows) {
    const rate = rateAt(c.time);
    if (buyDays.has(c.time)) {
      const inAsset = convert(amount, cur, assetCur, rate);
      units += inAsset / c.close;
      invested += amount;
      buys.push({ time: c.time, price: c.close, units: inAsset / c.close });
    }
    const value = convert(units * c.close, assetCur, cur, rate);
    if (!Number.isFinite(value)) continue;
    points.push({ time: c.time, value, invested });
    const ratio = value / invested;
    if (!worst || ratio < worst.ratio) worst = { time: c.time, value, invested, ratio };
    if (!peak || ratio > peak.ratio) peak = { time: c.time, value, invested, ratio };
  }
  if (!points.length) return null;

  const last = points[points.length - 1];
  const years = (new Date(last.time) - new Date(rows[0].time)) / (365.25 * 864e5);
  return {
    start: rows[0].time,
    end: last.time,
    firstPrice: rows[0].close,
    lastPrice: rows[rows.length - 1].close,
    units,
    buys: buys.length,
    invested,
    value: last.value,
    gain: last.value - invested,
    pct: (last.value / invested - 1) * 100,
    // rendimiento por año (solo tiene sentido con una sola compra y más de un año)
    perYear: !monthly && years >= 1 ? ((last.value / invested) ** (1 / years) - 1) * 100 : null,
    years,
    worst,
    peak,
    points: thin(points, 700),
  };
}

/* Menos puntos para el gráfico (siempre con el primero y el último) */
function thin(points, max) {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out = [];
  for (let i = 0; i < max - 1; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

/* "Hace N años" desde hoy, como "YYYY-MM-DD" */
export function yearsAgo(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toLocaleDateString("sv");
}
