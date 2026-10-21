import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { getCandles, assetCurrency, convert } from "./market";

/* ── Acceso a datos (Supabase, RLS por usuario) ──────────────────────────── */

function useTable(table, order, uid) {
  const [state, setState] = useState({ rows: [], loaded: false, error: "" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabase || !uid) return;
    let alive = true;
    supabase
      .from(table)
      .select("*")
      .order(order.column, { ascending: order.ascending ?? false })
      .then(({ data, error }) => {
        if (!alive) return;
        setState({ rows: data || [], loaded: true, error: error?.message || "" });
      });
    return () => {
      alive = false;
    };
  }, [table, order.column, order.ascending, uid, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

const TRADES_ORDER = { column: "executed_at", ascending: false };
const WATCH_ORDER = { column: "added_at", ascending: false };

export function useTrades(uid) {
  return useTable("trades", TRADES_ORDER, uid);
}

export function useWatchlist(uid) {
  return useTable("watchlist", WATCH_ORDER, uid);
}

export async function addTrade(uid, trade) {
  const { error } = await supabase.from("trades").insert({ ...trade, user_id: uid });
  return error?.message || "";
}

export async function deleteTrade(id) {
  const { error } = await supabase.from("trades").delete().eq("id", id);
  return error?.message || "";
}

export async function addWatch(uid, symbol, name = null) {
  const { error } = await supabase
    .from("watchlist")
    .upsert({ user_id: uid, symbol: symbol.toUpperCase(), name }, { onConflict: "user_id,symbol" });
  return error?.message || "";
}

export async function removeWatch(uid, symbol) {
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", uid)
    .eq("symbol", symbol.toUpperCase());
  return error?.message || "";
}

/* ── Cálculo de posiciones a partir de las operaciones ───────────────────── */

/* Operaciones en orden cronológico (misma fecha → orden de carga) */
const chrono = (trades) =>
  [...trades].sort((a, b) =>
    a.executed_at === b.executed_at
      ? String(a.created_at).localeCompare(String(b.created_at))
      : a.executed_at < b.executed_at
        ? -1
        : 1,
  );

/* Aplica una operación al estado por símbolo. Costo promedio ponderado: la
   venta saca costo en proporción y no cambia el promedio. El costo se lleva
   en la moneda del activo y en la de visualización (convertido con el MEP
   del día de la operación, así la ganancia incluye el efecto del dólar). */
function applyTrade(state, t, cur, mep) {
  const native = assetCurrency(t.symbol);
  const p = state.get(t.symbol) || { symbol: t.symbol, name: t.name, native, qty: 0, costNative: 0, cost: 0 };
  const qty = Number(t.qty);
  if (t.side === "buy") {
    const amount = qty * Number(t.price);
    p.qty += qty;
    p.costNative += amount;
    p.cost += convert(amount, native, cur, mep?.at(t.executed_at));
  } else if (p.qty > 0) {
    const frac = Math.min(1, qty / p.qty);
    p.costNative -= p.costNative * frac;
    p.cost -= p.cost * frac;
    p.qty -= qty;
  }
  if (!p.name && t.name) p.name = t.name;
  state.set(t.symbol, p);
}

/* Posiciones abiertas y totales, en la moneda `cur` ("USD" | "ARS").
   `quotes` es { SYM: { price, change, change_pct } | null }; `mep` viene de
   useMep(). Precio y costo promedio quedan en la moneda del activo. */
export function computePositions(trades, quotes = {}, cur = "USD", mep = null) {
  const state = new Map();
  for (const t of chrono(trades)) applyTrade(state, t, cur, mep);

  const positions = [];
  for (const p of state.values()) {
    if (p.qty <= 1e-9) continue; // posición cerrada
    const q = quotes[p.symbol];
    const avgCost = p.costNative / p.qty;
    const price = q?.price ?? avgCost;
    const value = convert(p.qty * price, p.native, cur, mep?.rate);
    const dayChange = q ? convert(p.qty * Number(q.change || 0), p.native, cur, mep?.rate) : 0;
    positions.push({
      symbol: p.symbol,
      name: p.name,
      currency: p.native,
      qty: p.qty,
      avgCost,
      price,
      live: Boolean(q),
      value,
      cost: p.cost,
      pnl: value - p.cost,
      pnlPct: p.cost ? ((value - p.cost) / p.cost) * 100 : 0,
      dayChange,
      dayPct: q ? Number(q.change_pct || 0) : 0,
    });
  }
  positions.sort((a, b) => (b.value || 0) - (a.value || 0));

  const value = positions.reduce((s, p) => s + p.value, 0);
  const cost = positions.reduce((s, p) => s + p.cost, 0);
  const dayChange = positions.reduce((s, p) => s + p.dayChange, 0);
  const prevValue = value - dayChange;
  return {
    positions: positions.map((p) => ({ ...p, weight: value ? (p.value / value) * 100 : 0 })),
    totals: {
      value,
      cost,
      pnl: value - cost,
      pnlPct: cost ? ((value - cost) / cost) * 100 : 0,
      dayChange,
      dayPct: prevValue ? (dayChange / prevValue) * 100 : 0,
    },
  };
}

/* ── Evolución histórica del portfolio ───────────────────────────────────── */

const HISTORY_RANGES = { "1m": "1m", "6m": "6m", "1y": "1y", max: "max" };

/* Por día, desde la primera operación (o el inicio del rango):
   value    = Σ cantidad que tenías ese día × cierre, en `cur` con el MEP del día
   invested = costo de lo que tenías ese día (lo que pusiste de tu bolsillo)
   → [{ time: 'YYYY-MM-DD', value, invested }] */
export function useHistory(trades, range = "6m", cur = "USD", mep = null) {
  const symbols = [...new Set(trades.map((t) => t.symbol))].sort().join(",");
  const tradesKey = trades.map((t) => `${t.id}`).join(",");
  const [res, setRes] = useState({ key: null, candles: null });
  const key = `${symbols}|${range}|${tradesKey}`;

  useEffect(() => {
    if (!symbols) return;
    let alive = true;
    const syms = symbols.split(",");
    Promise.all(
      syms.map((s) => getCandles(s, "daily", HISTORY_RANGES[range] || "6m").catch(() => [])),
    ).then((lists) => {
      if (alive) setRes({ key, candles: Object.fromEntries(syms.map((s, i) => [s, lists[i]])) });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // El armado de la serie depende de la moneda y el MEP: se recalcula sin volver a pedir velas
  const points = useMemo(() => {
    if (res.key !== key || !res.candles) return [];
    const syms = Object.keys(res.candles);
    const closes = new Map(); // date → { sym: close }
    for (const s of syms) {
      for (const c of res.candles[s]) {
        const d = String(c.time).slice(0, 10);
        if (!closes.has(d)) closes.set(d, {});
        closes.get(d)[s] = c.close;
      }
    }
    const firstDate = trades.reduce((m, t) => (t.executed_at < m ? t.executed_at : m), "9999");
    const dates = [...closes.keys()].sort().filter((d) => d >= firstDate);
    const sorted = chrono(trades);
    const state = new Map();
    const last = {}; // último cierre conocido por símbolo (días sin vela)
    let ti = 0;
    return dates.map((d) => {
      while (ti < sorted.length && sorted[ti].executed_at <= d) applyTrade(state, sorted[ti++], cur, mep);
      const row = closes.get(d);
      let value = 0;
      let invested = 0;
      for (const p of state.values()) {
        if (row[p.symbol] != null) last[p.symbol] = row[p.symbol];
        if (p.qty <= 1e-9) continue;
        invested += p.cost;
        // sin cierre todavía (compró hoy, papel sin operaciones): vale lo que costó
        const px = last[p.symbol] ?? p.costNative / p.qty;
        value += convert(p.qty * px, p.native, cur, mep?.at(d));
      }
      return { time: d, value, invested };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, key, cur, mep]);

  return { points, loading: Boolean(symbols) && res.key !== key };
}
