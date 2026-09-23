import { useCallback, useEffect, useState } from "react";
import { MARKET_API } from "./supabase";

/* ── Datos de mercado (backend Flask + yfinance) ─────────────────────────── */

const QUOTE_TTL = 60_000; // 1 min: mismo precio entre dashboard y mercado
const quoteCache = new Map(); // symbol → { at, promise }

/* Error de red (backend caído, sin conexión): distinto de "no hay datos" */
export class NetworkError extends Error {}

function fetchJson(url) {
  return fetch(url).then(
    (r) => (r.ok ? r.json() : null),
    (e) => {
      throw new NetworkError(e.message);
    },
  );
}

/* Cotización de un símbolo (null si no existe). Rechaza con NetworkError si
   el backend no responde; los fallos no se cachean para poder reintentar. */
export function getQuote(symbol, force = false) {
  const sym = symbol.toUpperCase();
  const hit = quoteCache.get(sym);
  if (!force && hit && Date.now() - hit.at < QUOTE_TTL) return hit.promise;
  const promise = fetchJson(`${MARKET_API}/quote/${sym}`)
    .then((q) => (q && q.price != null ? { ...q, change_pct: parseFloat(q.change_pct) } : null))
    .catch((e) => {
      quoteCache.delete(sym);
      throw e;
    });
  quoteCache.set(sym, { at: Date.now(), promise });
  return promise;
}

/* Cotizaciones de varios símbolos → { quotes: { SYM: quote | null }, error }.
   Si algún pedido falla por red, `error` es true y ese símbolo no aparece. */
export async function getQuotes(symbols, force = false) {
  const uniq = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const list = await Promise.allSettled(uniq.map((s) => getQuote(s, force)));
  const quotes = {};
  let error = false;
  list.forEach((r, i) => {
    if (r.status === "fulfilled") quotes[uniq[i]] = r.value;
    else error = true;
  });
  return { quotes, error };
}

const candleCache = new Map(); // key → { at, promise }
const CANDLE_TTL = 5 * 60_000;

/* Velas de un símbolo ([] si no hay). Rechaza con NetworkError si el backend
   no responde; los fallos no se cachean. */
export function getCandles(symbol, interval = "daily", range = "6m") {
  const key = `${symbol.toUpperCase()}|${interval}|${range}`;
  const hit = candleCache.get(key);
  if (hit && Date.now() - hit.at < CANDLE_TTL) return hit.promise;
  const promise = fetchJson(
    `${MARKET_API}/candles/${symbol.toUpperCase()}?interval=${interval}&range=${range}`,
  )
    .then((d) => d?.candles || [])
    .catch((e) => {
      candleCache.delete(key);
      throw e;
    });
  candleCache.set(key, { at: Date.now(), promise });
  return promise;
}

export function searchSymbols(q, signal) {
  return fetch(`${MARKET_API}/search?q=${encodeURIComponent(q)}`, { signal })
    .then((r) => (r.ok ? r.json() : { results: [] }))
    .then((d) => (d.results || []).filter((r) => r.symbol).slice(0, 6));
}

/* Sugerencias con debounce, para cualquier buscador de tickers */
export function useSuggestions(query) {
  const [items, setItems] = useState([]);
  const q = query.trim();
  useEffect(() => {
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchSymbols(q, ctrl.signal)
        .then(setItems)
        .catch(() => {});
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  return q.length < 2 ? [] : items;
}

/* Cotizaciones de una lista de símbolos. Se refrescan cuando cambia la lista
   y cada `every` ms (solo con la pestaña visible). Mientras refresca se siguen
   mostrando las últimas; `error` avisa que el backend no respondió y
   `refresh()` reintenta salteando el caché. */
export function useQuotes(symbols, every = QUOTE_TTL) {
  const key = [...new Set(symbols)].sort().join(",");
  const [res, setRes] = useState({ key: null, quotes: {}, error: false, updatedAt: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const force = tick > 0;
    getQuotes(key.split(","), force).then(({ quotes, error }) => {
      if (!alive) return;
      setRes((prev) => ({
        key,
        // ante un fallo conservamos lo último que se pudo mostrar
        quotes: error ? { ...prev.quotes, ...quotes } : quotes,
        error,
        updatedAt: error ? prev.updatedAt : Date.now(),
      }));
    });
    return () => {
      alive = false;
    };
  }, [key, tick]);

  // polling: cada `every` ms, y al volver a la pestaña si pasó el intervalo
  useEffect(() => {
    if (!key || !every) return;
    let last = Date.now();
    const bump = () => {
      last = Date.now();
      setTick((t) => t + 1);
    };
    const id = setInterval(() => document.visibilityState === "visible" && bump(), every);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last >= every) bump();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key, every]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return {
    quotes: res.quotes,
    loading: Boolean(key) && res.key !== key,
    error: res.error,
    updatedAt: res.updatedAt,
    refresh,
  };
}

/* Cierres del último mes para sparklines. Caché por símbolo: al cambiar la
   lista solo se piden los que faltan y los demás siguen visibles. */
const sparkCache = new Map(); // symbol → closes[]

export function useSparks(symbols, epoch = 0) {
  const key = [...new Set(symbols)].sort().join(",");
  const [data, setData] = useState(() => Object.fromEntries(sparkCache));
  useEffect(() => {
    if (!key) return;
    let alive = true;
    const missing = key.split(",").filter((s) => !sparkCache.has(s));
    if (!missing.length) return;
    Promise.allSettled(missing.map((s) => getCandles(s, "daily", "1m"))).then((results) => {
      results.forEach((r, i) => {
        if (r.status === "fulfilled") sparkCache.set(missing[i], r.value.map((c) => c.close));
      });
      if (alive) setData(Object.fromEntries(sparkCache));
    });
    return () => {
      alive = false;
    };
  }, [key, epoch]);
  return data;
}

/* "hace 2 min" — para mostrar cuándo se actualizaron los precios */
export function useAgo(ts) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ts) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [ts]);
  if (!ts) return "";
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return "recién";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return `hace ${h} h`;
}

/* ── Formato ─────────────────────────────────────────────────────────────── */
export const money = (n, digits = 2) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(n).toLocaleString("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const signed = (n, digits = 2) => (n >= 0 ? "+" : "-") + money(Math.abs(n), digits).slice(1);

export const pct = (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function formatDate(d) {
  const m = typeof d === "string" ? d.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  if (m) return `${parseInt(m[3])} ${MESES[parseInt(m[2]) - 1]} ${m[1]}`;
  return d ? String(d) : "";
}

export const today = () => new Date().toISOString().slice(0, 10);

/* CEDEARs liquidados en dólares (sufijo D en BYMA). Lista curada: el sufijo
   solo no alcanza (YPFD.BA, por ejemplo, es YPF en pesos). */
export const USD_CEDEARS = new Set(
  ["AAPLD", "TSLAD", "MSFTD", "NVDAD", "AMZND", "METAD", "NFLXD", "MELID", "KOD", "VISTD"].map(
    (t) => t + ".BA",
  ),
);

/* ── Tipo de activo por símbolo ──────────────────────────────────────────── */
export function assetKind(symbol = "") {
  const s = symbol.toUpperCase();
  if (USD_CEDEARS.has(s)) return "cedear-usd";
  if (s.endsWith(".BA")) return "cedear";
  if (s.endsWith("=X")) return "fx";
  if (/-(USD|USDT|ARS)$/.test(s)) return "crypto";
  if (s.startsWith("^")) return "index";
  return "stock";
}

/* Precio con la moneda/unidad que corresponde al tipo de activo */
export function fmtPrice(symbol, n) {
  if (n == null || Number.isNaN(n)) return "—";
  switch (assetKind(symbol)) {
    case "cedear":
      return "ARS " + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
    case "cedear-usd":
      return "US$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "fx":
      return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    case "index":
      return n.toLocaleString("es-AR", { maximumFractionDigits: 0 }) + " pts";
    default:
      return money(n);
  }
}
