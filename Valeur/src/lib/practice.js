import { useCallback, useEffect, useState } from "react";
import { supabase, MARKET_API } from "./supabase";
import { useSupa, changed } from "./social";
import { assetCurrency } from "./market";

/* ── Modo práctica ────────────────────────────────────────────────────────
   Una cartera con US$ 10.000 de mentira. Comprar y vender pasa por el
   backend (valeur-backend/practice.py), que pone el precio real del momento;
   la cuenta y las operaciones se leen de Supabase. */
export const PRACTICE_START = 10000;

export function usePracticeAccount(uid) {
  return useSupa((db) => db.from("practice_accounts").select("*").eq("user_id", uid).maybeSingle(), [uid], {
    channel: "practice",
    enabled: Boolean(uid),
  });
}

export function usePracticeTrades(uid) {
  return useSupa((db) => db.from("practice_trades").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(200), [uid], {
    channel: "practice",
    enabled: Boolean(uid),
    initial: [],
  });
}

const rpcErr = ({ error }) => error?.message || "";

// avisa a la cuenta, las operaciones y el ranking que algo cambió
const touched = () => {
  changed("practice");
  window.dispatchEvent(new Event("valeur:practice"));
};

export async function startPractice() {
  const err = rpcErr(await supabase.rpc("practice_start"));
  if (!err) touched();
  return err;
}

export async function resetPractice() {
  const err = rpcErr(await supabase.rpc("practice_reset"));
  if (!err) touched();
  return err;
}

async function authed(path, init = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${MARKET_API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

/* Comprar (amount en dólares) o vender (qty, o all para todo). Devuelve el
   mensaje de error o "" */
export async function practiceTrade(order) {
  try {
    const { ok, body } = await authed("/practice/trade", { method: "POST", body: JSON.stringify(order) });
    if (!ok) return body.error || "No se pudo operar";
    touched();
    return "";
  } catch {
    return "Sin conexión con el servidor de precios";
  }
}

/* El ranking: todos o solo tus amigos. Se refresca cuando operás. */
export function usePracticeRanking(scope, enabled = true) {
  const [res, setRes] = useState({ key: null, data: null, error: "" });
  const [tick, setTick] = useState(0);
  const key = `${scope}|${tick}`;
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("valeur:practice", on);
    return () => window.removeEventListener("valeur:practice", on);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    authed(`/practice/ranking?scope=${scope}`).then(
      ({ ok, body }) => alive && setRes({ key, data: ok ? body : null, error: ok ? "" : body.error || "No se pudo cargar el ranking" }),
      () => alive && setRes({ key, data: null, error: "Sin conexión con el servidor de precios" }),
    );
    return () => {
      alive = false;
    };
  }, [key, scope, enabled]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  // mientras recarga, sigue mostrando lo último de la misma pestaña
  return { data: res.data, error: res.error, loaded: Boolean(res.key?.startsWith(scope + "|")), reload };
}

/* Lo que tenés de cada activo con el costo promedio en dólares (las ventas
   bajan el costo en proporción) */
export function practicePositions(trades) {
  const by = new Map();
  for (const t of [...trades].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))) {
    const p = by.get(t.symbol) || { symbol: t.symbol, name: t.name, qty: 0, cost: 0 };
    const q = Number(t.qty);
    if (t.side === "buy") {
      p.qty += q;
      p.cost += q * Number(t.price_usd);
    } else if (p.qty > 0) {
      p.cost -= p.cost * Math.min(1, q / p.qty);
      p.qty -= q;
    }
    if (t.name) p.name = t.name;
    by.set(t.symbol, p);
  }
  return [...by.values()].filter((p) => p.qty > 1e-8);
}

/* Precio por unidad en dólares, como lo cuenta el backend */
export const usdPrice = (symbol, price, mepRate) => (assetCurrency(symbol) === "ARS" ? (mepRate ? price / mepRate : NaN) : price);
