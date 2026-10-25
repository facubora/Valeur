import { useEffect, useState } from "react";
import { MARKET_API } from "./supabase";

/* ── Próximos resultados y dividendos ───────────────────────────────────────
   Los da el backend (valeur-backend/events.py) para los próximos 4 meses. Los
   CEDEARs traen los de su acción de origen. Se guardan unos minutos en memoria. */
export const EVENT_KIND = {
  earnings: { label: "Presenta resultados", short: "Resultados", icon: "bi-clipboard-data" },
  exdiv: { label: "Corte del dividendo", short: "Corte de dividendo", icon: "bi-scissors" },
  divpay: { label: "Paga el dividendo", short: "Pago de dividendo", icon: "bi-cash-coin" },
};

const TTL = 10 * 60_000;
const cache = new Map(); // "A,B,C" → { at, promise }

export function getEvents(symbols) {
  const key = [...new Set(symbols)].sort().join(",");
  if (!key) return Promise.resolve([]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.promise;
  const promise = fetch(`${MARKET_API}/events?symbols=${encodeURIComponent(key)}`)
    .then((r) => (r.ok ? r.json() : { events: [] }))
    .then((d) => d.events || [])
    .catch((e) => {
      cache.delete(key);
      throw e;
    });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

export function useEvents(symbols, enabled = true) {
  const key = [...new Set(symbols)].sort().join(",");
  const [res, setRes] = useState({ key: null, events: [], error: false });
  useEffect(() => {
    if (!enabled || !key) return;
    let alive = true;
    getEvents(key.split(",")).then(
      (events) => alive && setRes({ key, events, error: false }),
      () => alive && setRes({ key, events: [], error: true }),
    );
    return () => {
      alive = false;
    };
  }, [key, enabled]);
  const loaded = !key || res.key === key;
  return { events: loaded ? res.events : [], loaded, error: res.key === key && res.error };
}

/* Días desde hoy hasta una fecha "YYYY-MM-DD" (0 = hoy) */
export function daysUntil(day) {
  const [y, m, d] = day.split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d) - today) / 864e5);
}

export function whenTxt(day) {
  const n = daysUntil(day);
  if (n < 0) return "ayer";
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  if (n < 7) return `en ${n} días`;
  if (n < 14) return "la semana que viene";
  return `en ${Math.round(n / 7)} semanas`;
}

/* Lo que tenés (posiciones abiertas) a partir de las operaciones */
export function heldSymbols(trades) {
  const q = new Map();
  for (const t of trades) q.set(t.symbol, (q.get(t.symbol) || 0) + Number(t.qty) * (t.side === "buy" ? 1 : -1));
  return [...q].filter(([, n]) => n > 1e-9).map(([s]) => s);
}
