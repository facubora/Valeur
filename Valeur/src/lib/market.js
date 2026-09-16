import { useEffect, useState } from "react";
import { MARKET_API } from "./supabase";

/* ── Datos de mercado (backend Flask + yfinance) ─────────────────────────── */

const QUOTE_TTL = 60_000; // 1 min: mismo precio entre dashboard y mercado
const quoteCache = new Map(); // symbol → { at, promise }

export function getQuote(symbol) {
  const sym = symbol.toUpperCase();
  const hit = quoteCache.get(sym);
  if (hit && Date.now() - hit.at < QUOTE_TTL) return hit.promise;
  const promise = fetch(`${MARKET_API}/quote/${sym}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((q) => (q && q.price != null ? { ...q, change_pct: parseFloat(q.change_pct) } : null))
    .catch(() => null);
  quoteCache.set(sym, { at: Date.now(), promise });
  return promise;
}

/* Cotizaciones de varios símbolos → { SYM: quote | null } */
export async function getQuotes(symbols) {
  const uniq = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const list = await Promise.all(uniq.map(getQuote));
  return Object.fromEntries(uniq.map((s, i) => [s, list[i]]));
}

const candleCache = new Map(); // key → { at, promise }
const CANDLE_TTL = 5 * 60_000;

export function getCandles(symbol, interval = "daily", range = "6m") {
  const key = `${symbol.toUpperCase()}|${interval}|${range}`;
  const hit = candleCache.get(key);
  if (hit && Date.now() - hit.at < CANDLE_TTL) return hit.promise;
  const promise = fetch(
    `${MARKET_API}/candles/${symbol.toUpperCase()}?interval=${interval}&range=${range}`,
  )
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.candles || [])
    .catch(() => []);
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

/* Cotizaciones de una lista de símbolos; se refrescan cuando cambia la lista */
export function useQuotes(symbols) {
  const key = [...new Set(symbols)].sort().join(",");
  const [res, setRes] = useState({ key: null, quotes: {} });
  useEffect(() => {
    if (!key) return;
    let alive = true;
    getQuotes(key.split(",")).then((quotes) => alive && setRes({ key, quotes }));
    return () => {
      alive = false;
    };
  }, [key]);
  return { quotes: res.quotes, loading: Boolean(key) && res.key !== key };
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
