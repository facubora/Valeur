import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { getCandles } from "./market";

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

/* Agrupa por símbolo: cantidad neta, costo promedio de compra, P&L.
   `quotes` es { SYM: { price, change, change_pct } | null }. */
export function computePositions(trades, quotes = {}) {
  const by = new Map();
  for (const t of trades) {
    const p = by.get(t.symbol) || { symbol: t.symbol, name: t.name, qty: 0, buyQty: 0, buyCost: 0 };
    const qty = Number(t.qty);
    const price = Number(t.price);
    if (t.side === "buy") {
      p.qty += qty;
      p.buyQty += qty;
      p.buyCost += qty * price;
    } else {
      p.qty -= qty;
    }
    if (!p.name && t.name) p.name = t.name;
    by.set(t.symbol, p);
  }

  const positions = [];
  for (const p of by.values()) {
    if (p.qty <= 1e-9) continue; // posición cerrada
    const q = quotes[p.symbol];
    const avgCost = p.buyQty ? p.buyCost / p.buyQty : 0;
    const price = q?.price ?? avgCost;
    const value = p.qty * price;
    const cost = p.qty * avgCost;
    const dayChange = q ? p.qty * Number(q.change || 0) : 0;
    positions.push({
      symbol: p.symbol,
      name: p.name,
      qty: p.qty,
      avgCost,
      price,
      live: Boolean(q),
      value,
      cost,
      pnl: value - cost,
      pnlPct: cost ? ((value - cost) / cost) * 100 : 0,
      dayChange,
      dayPct: q ? Number(q.change_pct || 0) : 0,
    });
  }
  positions.sort((a, b) => b.value - a.value);

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

/* Valor del portfolio por día: Σ (cantidad que tenías ese día × cierre).
   Devuelve [{ time: 'YYYY-MM-DD', value }] desde la primera operación. */
export function useHistory(trades, range = "6m") {
  const symbols = [...new Set(trades.map((t) => t.symbol))].sort().join(",");
  const firstDate = trades.reduce((m, t) => (t.executed_at < m ? t.executed_at : m), "9999");
  const tradesKey = trades.map((t) => `${t.id}`).join(",");
  const [res, setRes] = useState({ key: null, points: [] });
  const key = `${symbols}|${range}|${tradesKey}`;

  useEffect(() => {
    if (!symbols) return;
    let alive = true;
    const syms = symbols.split(",");
    Promise.all(syms.map((s) => getCandles(s, "daily", HISTORY_RANGES[range] || "6m"))).then(
      (lists) => {
        if (!alive) return;
        // cierre por fecha y símbolo
        const closes = new Map(); // date → { sym: close }
        lists.forEach((candles, i) => {
          for (const c of candles) {
            const d = String(c.time).slice(0, 10);
            if (!closes.has(d)) closes.set(d, {});
            closes.get(d)[syms[i]] = c.close;
          }
        });
        const dates = [...closes.keys()].sort().filter((d) => d >= firstDate);
        // cantidad acumulada por símbolo hasta cada fecha (operaciones ordenadas)
        const sorted = [...trades].sort((a, b) => (a.executed_at < b.executed_at ? -1 : 1));
        const qty = {};
        const last = {}; // último cierre conocido por símbolo (días sin vela)
        let ti = 0;
        const points = dates.map((d) => {
          while (ti < sorted.length && sorted[ti].executed_at <= d) {
            const t = sorted[ti++];
            qty[t.symbol] = (qty[t.symbol] || 0) + (t.side === "buy" ? 1 : -1) * Number(t.qty);
          }
          const row = closes.get(d);
          let value = 0;
          for (const s of syms) {
            if (row[s] != null) last[s] = row[s];
            if (qty[s] > 0 && last[s] != null) value += qty[s] * last[s];
          }
          return { time: d, value };
        });
        setRes({ key, points });
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { points: res.points, loading: Boolean(symbols) && res.key !== key };
}
