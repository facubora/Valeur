import { useCallback, useEffect, useState } from "react";
import { MARKET_API, supabase } from "./supabase";

/* ── Datos de mercado (backend Flask + yfinance) ─────────────────────────── */

const QUOTE_TTL = 60_000; // 1 min: mismo precio entre dashboard y mercado
const quoteCache = new Map(); // symbol → { at, promise }

/* Últimos valores conocidos (no promesas): con esto las pantallas se pintan
   al instante al volver a ellas, y se guardan en la sesión del navegador para
   sobrevivir a un F5 (ver loadSnap al final). Igual se actualizan atrás. */
const lastQuotes = new Map(); // symbol → { at, q }
function remember(sym, q) {
  lastQuotes.set(sym, { at: Date.now(), q });
  saveSnap();
}
const isFresh = (sym) => {
  const h = lastQuotes.get(sym);
  return Boolean(h) && Date.now() - h.at < QUOTE_TTL;
};
// lo que ya se sabe de una lista "A,B,C" → { A: quote, ... }
function pickKnown(key) {
  const out = {};
  if (!key) return out;
  for (const s of key.split(",")) {
    const h = lastQuotes.get(s.toUpperCase());
    if (h) out[s] = h.q;
  }
  return out;
}
const allKnown = (key) => Boolean(key) && key.split(",").every((s) => lastQuotes.has(s.toUpperCase()));

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
    .then((q) => {
      const out = q && q.price != null ? { ...q, change_pct: parseFloat(q.change_pct) } : null;
      remember(sym, out);
      return out;
    })
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
    // lo ya conocido se muestra de entrada; lo recién traído lo pisa
    quotes: { ...pickKnown(key), ...res.quotes },
    loading: Boolean(key) && res.key !== key && !allKnown(key),
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
      saveSnap();
      if (alive) setData(Object.fromEntries(sparkCache));
    });
    return () => {
      alive = false;
    };
  }, [key, epoch]);
  return data;
}

/* Cotización + cierres del mes de muchos símbolos en un solo pedido (para
   las listas del mercado). Alimenta los mismos cachés que getQuote/useSparks,
   así el resto de la app reusa lo que ya se trajo. */
export async function getBatch(symbols, force = false) {
  const uniq = [...new Set(symbols.map((s) => s.toUpperCase()))];
  // lo que se trajo hace menos de un minuto (con su curva) no se vuelve a pedir
  const ok = (s) => isFresh(s) && (lastQuotes.get(s).q === null || sparkCache.has(s));
  const need = force ? uniq : uniq.filter((s) => !ok(s));
  const known = Object.fromEntries(uniq.filter((s) => !need.includes(s)).map((s) => [s, lastQuotes.get(s).q]));
  if (!need.length) return known;
  const chunks = [];
  for (let i = 0; i < need.length; i += 40) chunks.push(need.slice(i, i + 40));
  // en paralelo, y un tramo caído no tira abajo a los demás
  const res = await Promise.allSettled(
    chunks.map((c) => fetchJson(`${MARKET_API}/batch?symbols=${c.map(encodeURIComponent).join(",")}`)),
  );
  if (res.every((r) => r.status === "rejected")) throw res[0].reason;
  const out = { ...known };
  res.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    for (const s of chunks[i]) {
      const q = r.value?.quotes?.[s];
      if (!q) {
        out[s] = null;
        remember(s, null);
        continue;
      }
      const { closes, ...quote } = q;
      out[s] = { ...quote, change_pct: parseFloat(quote.change_pct) };
      quoteCache.set(s, { at: Date.now(), promise: Promise.resolve(out[s]) });
      if (closes?.length) sparkCache.set(s, closes);
      remember(s, out[s]);
    }
  });
  return out;
}

/* → { quotes, sparks, loading, error, updatedAt, refresh }. Mientras recarga conserva lo último. */
export function useBatch(symbols, every = QUOTE_TTL) {
  const key = [...new Set(symbols)].sort().join(",");
  const [res, setRes] = useState({ key: null, quotes: {}, error: false, updatedAt: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    getBatch(key.split(","), tick > 0).then(
      (quotes) =>
        alive && setRes((prev) => ({ key, quotes: { ...prev.quotes, ...quotes }, error: false, updatedAt: Date.now() })),
      () => alive && setRes((prev) => ({ ...prev, key, error: true })),
    );
    return () => {
      alive = false;
    };
  }, [key, tick]);

  useEffect(() => {
    if (!key || !every) return;
    const id = setInterval(() => document.visibilityState === "visible" && setTick((t) => t + 1), every);
    return () => clearInterval(id);
  }, [key, every]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return {
    quotes: { ...pickKnown(key), ...res.quotes },
    sparks: Object.fromEntries(sparkCache),
    loading: Boolean(key) && res.key !== key && !allKnown(key),
    error: res.error,
    updatedAt: res.updatedAt,
    refresh,
  };
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

/* ── Horario de los mercados ─────────────────────────────────────────────
   BYMA 11 a 17 h (Buenos Aires) y NYSE 9:30 a 16 h (Nueva York), días
   hábiles. No contempla feriados. Los horarios se muestran en hora argentina. */
function clockIn(tz, date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return { day: parts.weekday, mins: (Number(parts.hour) % 24) * 60 + Number(parts.minute) };
}

const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function marketStatus(date = new Date()) {
  const ar = clockIn("America/Argentina/Buenos_Aires", date);
  const ny = clockIn("America/New_York", date);
  const shift = (((ar.mins - ny.mins) % 1440) + 1440) % 1440; // minutos que AR va adelante de NY
  const mk = (key, { day, mins }, open, close, toAr) => {
    const weekday = !["Sat", "Sun"].includes(day);
    const isOpen = weekday && mins >= open && mins < close;
    return {
      key,
      open: isOpen,
      hint: isOpen ? `cierra ${hhmm(close + toAr)}` : `abre ${hhmm(open + toAr)}`,
    };
  };
  return [mk("BYMA", ar, 11 * 60, 17 * 60, 0), mk("NYSE", ny, 9 * 60 + 30, 16 * 60, shift)];
}

export function useMarketStatus() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return marketStatus(new Date(now));
}

/* Link al detalle de un activo en el mercado */
export const tickerUrl = (s) => `/tickersearch?symbol=${encodeURIComponent(s)}`;

/* ── Formato ─────────────────────────────────────────────────────────────── */
/* Monto con moneda: "US$ 1.234,56" / "ARS 1.234.567". Los pesos van sin
   decimales salvo que se pidan. No finito → "—". */
export const money = (n, digits, cur = "USD") => {
  if (n == null || !Number.isFinite(n)) return "—";
  const d = digits ?? (cur === "ARS" ? 0 : 2);
  return (
    (n < 0 ? "-" : "") +
    (cur === "ARS" ? "ARS " : "US$ ") +
    Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d })
  );
};

export const signed = (n, digits, cur = "USD") =>
  n == null || !Number.isFinite(n) ? "—" : (n >= 0 ? "+" : "-") + money(Math.abs(n), digits, cur);

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

/* Moneda en la que cotiza un activo: CEDEARs en pesos y cripto contra el
   peso → ARS; el resto (acciones de EE.UU., CEDEARs D, cripto en dólares) → USD */
export function assetCurrency(symbol = "") {
  const kind = assetKind(symbol);
  if (kind === "cedear") return "ARS";
  if (kind === "crypto" && symbol.toUpperCase().endsWith("-ARS")) return "ARS";
  return "USD";
}

/* Precio con la moneda/unidad que corresponde al tipo de activo */
export function fmtPrice(symbol, n) {
  if (n == null || Number.isNaN(n)) return "—";
  switch (assetKind(symbol)) {
    case "fx":
      return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    case "index":
      return n.toLocaleString("es-AR", { maximumFractionDigits: 0 }) + " pts";
    default:
      return money(n, undefined, assetCurrency(symbol));
  }
}

/* Precio en la moneda elegida por el usuario (dólar MEP o pesos). Monedas e
   índices no se convierten: son cotizaciones/puntos, no precios de un activo. */
export function priceIn(symbol, n, cur, rate) {
  const kind = assetKind(symbol);
  if (!cur || kind === "fx" || kind === "index") return fmtPrice(symbol, n);
  const v = convert(n, assetCurrency(symbol), cur, rate);
  return Number.isFinite(v) ? money(v, undefined, cur) : fmtPrice(symbol, n);
}

/* ¿El precio mostrado está convertido (no es la moneda en la que cotiza)? */
export function isConverted(symbol, cur) {
  const kind = assetKind(symbol);
  return Boolean(cur) && kind !== "fx" && kind !== "index" && assetCurrency(symbol) !== cur;
}

/* ── Dólar MEP ───────────────────────────────────────────────────────────── */
/* Serie diaria del MEP (derivado de CEDEARs en el backend). `at(fecha)` da
   el MEP de ese día o del último día hábil anterior. */
const MEP_TTL = 15 * 60_000;
let mepCache = null; // { at, promise }
let mepRaw = null; // { at, d }: la respuesta tal cual, para guardarla en la sesión
let mepBuilt = null; // el último MEP armado, para pintar sin esperar

function buildMep(d) {
  const dates = d.series.map((r) => r[0]);
  const rates = d.series.map((r) => r[1]);
  const at = (date) => {
    if (!date || date >= dates[dates.length - 1]) return d.rate;
    // búsqueda binaria: última fecha <= date
    let lo = 0;
    let hi = dates.length - 1;
    if (date < dates[0]) return rates[0];
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (dates[mid] <= date) lo = mid;
      else hi = mid - 1;
    }
    return rates[lo];
  };
  // últimos cierres, para la curva del mes
  return { rate: d.rate, date: d.date, at, recent: rates.slice(-23) };
}

export function getMep() {
  if (mepCache && Date.now() - mepCache.at < MEP_TTL) return mepCache.promise;
  const promise = fetchJson(`${MARKET_API}/mep`)
    .then((d) => {
      if (!d?.series?.length) return null;
      mepRaw = { at: Date.now(), d };
      mepBuilt = buildMep(d);
      saveSnap();
      return mepBuilt;
    })
    .catch((e) => {
      mepCache = null;
      throw e;
    });
  mepCache = { at: Date.now(), promise };
  return promise;
}

/* → { mep: { rate, date, at, recent } | null, loaded, error } */
export function useMep() {
  const [res, setRes] = useState(() => (mepBuilt ? { mep: mepBuilt, loaded: true, error: false } : { mep: null, loaded: false, error: false }));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    getMep().then(
      (mep) => alive && setRes({ mep, loaded: true, error: !mep }),
      () => alive && setRes({ mep: null, loaded: true, error: true }),
    );
    return () => {
      alive = false;
    };
  }, [tick]);
  // si falló (backend caído o reiniciándose), reintentar cada 30 s
  useEffect(() => {
    if (!res.error) return;
    const t = setTimeout(() => setTick((n) => n + 1), 30_000);
    return () => clearTimeout(t);
  }, [res.error, tick]);
  return res;
}

/* Pasa un monto de una moneda a otra con el MEP dado (NaN si falta el MEP) */
export function convert(amount, from, to, rate) {
  if (from === to) return amount;
  if (!rate) return NaN;
  return from === "USD" ? amount * rate : amount / rate;
}

/* Moneda en la que se muestra el portfolio (preferencia del usuario,
   compartida entre pantallas y recordada en este navegador) */
const CUR_KEY = "valeur-currency";
const curListeners = new Set();
let curValue = (() => {
  try {
    return localStorage.getItem(CUR_KEY) === "ARS" ? "ARS" : "USD";
  } catch {
    return "USD";
  }
})();

/* Cambia la moneda en toda la app (y la recuerda en este navegador) */
function applyCurrency(c) {
  curValue = c;
  try {
    localStorage.setItem(CUR_KEY, c);
  } catch {
    /* sin storage: queda solo en memoria */
  }
  curListeners.forEach((fn) => fn(c));
}

/* La moneda es de la cuenta: al entrar se toma la guardada (si hay) */
export function adoptAccountCurrency(c) {
  if ((c === "USD" || c === "ARS") && c !== curValue) applyCurrency(c);
}

export function useDisplayCurrency() {
  const [cur, setLocal] = useState(curValue);
  useEffect(() => {
    curListeners.add(setLocal);
    return () => curListeners.delete(setLocal);
  }, []);
  // además de aplicarla, la guarda en la cuenta para los otros dispositivos
  const setCur = useCallback((c) => {
    applyCurrency(c);
    supabase?.auth.updateUser({ data: { currency: c } }).catch(() => {});
  }, []);
  return [cur, setCur];
}

/* ── Instantánea en la sesión del navegador ──────────────────────────────── */
/* Precios, curvas del mes y MEP se guardan en sessionStorage (no son datos
   de la cuenta) para que un F5 pinte al instante. Cada valor guarda cuándo se
   trajo, así los vencimientos de arriba siguen valiendo. */
const SNAP_KEY = "valeur-mkt-v1";
let snapTimer = 0;
function saveSnap() {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    try {
      sessionStorage.setItem(SNAP_KEY, JSON.stringify({ quotes: [...lastQuotes], sparks: [...sparkCache], mep: mepRaw }));
    } catch {
      /* lleno o bloqueado: queda solo en memoria */
    }
  }, 800);
}
function loadSnap() {
  try {
    const snap = JSON.parse(sessionStorage.getItem(SNAP_KEY) || "null");
    if (!snap) return;
    for (const [sym, h] of snap.quotes || []) {
      lastQuotes.set(sym, h);
      quoteCache.set(sym, { at: h.at, promise: Promise.resolve(h.q) });
    }
    for (const [sym, closes] of snap.sparks || []) sparkCache.set(sym, closes);
    if (snap.mep?.d?.series?.length) {
      mepRaw = snap.mep;
      mepBuilt = buildMep(snap.mep.d);
      mepCache = { at: snap.mep.at, promise: Promise.resolve(mepBuilt) };
    }
  } catch {
    /* sin almacenamiento o dato roto: arranca vacío */
  }
}
loadSnap();
