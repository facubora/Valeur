import { useCallback, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import { useSupa, changed } from "./social";
import { useQuotes, fmtPrice, pct } from "./market";

/* ── Alertas de precio ──────────────────────────────────────────────────────
   above / below: el precio cruza un valor → avisa una vez y se apaga.
   up_pct / down_pct: el día sube/baja más de X% → avisa una vez por rueda.
   Se evalúan en la app (cada 60 s mientras Valeur está abierto) y también en
   el backend (valeur-backend/alerts.py), que avisa aunque nadie lo tenga
   abierto. El que llega primero se queda con la alerta. */
export const ALERT_KINDS = [
  ["above", "Sube a", "bi-arrow-up", "precio"],
  ["below", "Baja a", "bi-arrow-down", "precio"],
  ["up_pct", "Sube +%", "bi-graph-up-arrow", "pct"],
  ["down_pct", "Cae −%", "bi-graph-down-arrow", "pct"],
];
export const ALERT_KIND = Object.fromEntries(
  ALERT_KINDS.map(([k, label, icon, unit]) => [k, { key: k, label, icon, unit }]),
);

export function alertText(a) {
  const v = Number(a.value);
  switch (a.kind) {
    case "above":
      return `Si llega a ${fmtPrice(a.symbol, v)}`;
    case "below":
      return `Si baja a ${fmtPrice(a.symbol, v)}`;
    case "up_pct":
      return `Si sube más de ${v.toLocaleString("es-AR")}% en el día`;
    default:
      return `Si cae más de ${v.toLocaleString("es-AR")}% en el día`;
  }
}

export function useAlerts(uid) {
  return useSupa((db) => db.from("alerts").select("*").order("created_at", { ascending: false }), [uid], {
    channel: "alerts",
    enabled: Boolean(uid),
    initial: [],
  });
}

const done = (res, channel) => {
  if (!res.error) changed(channel);
  return res.error?.message || "";
};

export async function addAlert(uid, { symbol, kind, value }) {
  return done(await supabase.from("alerts").insert({ user_id: uid, symbol: symbol.toUpperCase(), kind, value }), "alerts");
}

/* Cambiar el tipo o el valor de una alerta: vuelve a quedar activa */
export async function updateAlert(id, { kind, value }) {
  return done(await supabase.from("alerts").update({ kind, value, active: true, triggered_at: null }).eq("id", id), "alerts");
}

/* Qué tiene de malo una alerta antes de guardarla ("" si nada). `existing`
   son las del usuario; `selfId` es la que se está editando (no cuenta como
   repetida). */
export function alertError({ symbol, kind, value, quote, existing = [], selfId = null }) {
  const unit = ALERT_KIND[kind].unit;
  const v = value;
  if (!(v > 0)) return unit === "pct" ? "Poné un porcentaje mayor a cero" : "Poné un precio mayor a cero";
  if (unit === "pct" && v > 100) return "El porcentaje diario tiene que ser menor a 100%";
  if (unit !== "pct" && v > 1e12) return "El precio es demasiado grande";
  if (existing.some((a) => a.id !== selfId && a.active && a.symbol === symbol && a.kind === kind && Math.abs(Number(a.value) - v) < 1e-9)) {
    return "Ya tenés esa misma alerta activa";
  }
  if (quote && kind === "above" && v <= quote.price) return `Ya cotiza a ${fmtPrice(symbol, quote.price)}: poné un precio más alto`;
  if (quote && kind === "below" && v >= quote.price) return `Ya cotiza a ${fmtPrice(symbol, quote.price)}: poné un precio más bajo`;
  return "";
}

const abs = (n) => Math.abs(n).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";

/* Cuánto le falta a una alerta para saltar → { progress 0..1, text } */
export function alertGap(a, q) {
  if (!q) return null;
  const v = Number(a.value);
  if (a.kind === "above") return { progress: Math.min(q.price / v, 1), text: `falta subir ${abs((v / q.price - 1) * 100)}` };
  if (a.kind === "below") return { progress: Math.min(v / q.price, 1), text: `falta bajar ${abs((1 - v / q.price) * 100)}` };
  const day = a.kind === "up_pct" ? Math.max(q.change_pct, 0) : Math.max(-q.change_pct, 0);
  return { progress: Math.min(day / v, 1), text: `hoy ${pct(q.change_pct)} de ${a.kind === "up_pct" ? "+" : "−"}${abs(v)}` };
}

export async function deleteAlert(id) {
  return done(await supabase.from("alerts").delete().eq("id", id), "alerts");
}

/* Reactivar una alerta de precio ya disparada (o pausarla) */
export async function setAlertActive(id, active) {
  return done(await supabase.from("alerts").update({ active, triggered_at: null }).eq("id", id), "alerts");
}

/* Fecha local "YYYY-MM-DD" de un timestamp */
const localDay = (ts) => new Date(ts).toLocaleDateString("sv");

function check(a, q) {
  if (!q || !a.active) return false;
  const v = Number(a.value);
  switch (a.kind) {
    case "above":
      return q.price >= v;
    case "below":
      return q.price <= v;
    case "up_pct":
    case "down_pct":
      // una vez por rueda: si ya avisó por esta sesión, no repetir
      if (a.triggered_at && localDay(a.triggered_at) >= q.latest_date) return false;
      return a.kind === "up_pct" ? q.change_pct >= v : q.change_pct <= -v;
    default:
      return false;
  }
}

function message(a, q) {
  const pctTxt = `${Math.abs(q.change_pct).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
  switch (a.kind) {
    case "above":
      return [`${a.symbol} llegó a ${fmtPrice(a.symbol, Number(a.value))}`, `Ahora cotiza a ${fmtPrice(a.symbol, q.price)}.`];
    case "below":
      return [`${a.symbol} bajó a ${fmtPrice(a.symbol, Number(a.value))}`, `Ahora cotiza a ${fmtPrice(a.symbol, q.price)}.`];
    case "up_pct":
      return [`${a.symbol} sube ${pctTxt} hoy`, `Cotiza a ${fmtPrice(a.symbol, q.price)}.`];
    default:
      return [`${a.symbol} cae ${pctTxt} hoy`, `Cotiza a ${fmtPrice(a.symbol, q.price)}.`];
  }
}

export function browserNotify(title, body, tag) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, tag, icon: "/favicon.svg" });
    }
  } catch {
    /* algunos navegadores no permiten crear notificaciones desde la página */
  }
}

/* Avisos que disparó esta pestaña: así, cuando la misma notificación llega
   por tiempo real, no se muestra dos veces en el navegador */
const firedHere = new Set();

/* Vigila las alertas activas del usuario. Va en la cáscara de la app, así
   corre en cualquier pantalla. El update condicional evita avisos dobles si
   hay dos pestañas abiertas. */
export function useAlertWatcher(uid) {
  const alerts = useAlerts(uid);
  const active = useMemo(() => alerts.data.filter((a) => a.active), [alerts.data]);
  const { quotes } = useQuotes(active.map((a) => a.symbol));
  const firing = useRef(new Set());

  useEffect(() => {
    if (!uid) return;
    for (const a of active) {
      const q = quotes[a.symbol];
      if (!check(a, q) || firing.current.has(a.id)) continue;
      firing.current.add(a.id);
      const oneShot = a.kind === "above" || a.kind === "below";
      let upd = supabase
        .from("alerts")
        .update({ triggered_at: new Date().toISOString(), ...(oneShot ? { active: false } : {}) })
        .eq("id", a.id)
        .eq("active", true);
      upd = a.triggered_at ? upd.eq("triggered_at", a.triggered_at) : upd.is("triggered_at", null);
      upd.select("id").then(async ({ data }) => {
        if (data?.length) {
          const [title, body] = message(a, q);
          await supabase.from("notifications").insert({
            user_id: uid,
            kind: "alert",
            title,
            body,
            symbol: a.symbol,
            link: `/tickersearch?symbol=${encodeURIComponent(a.symbol)}`,
          });
          firedHere.add(title);
          browserNotify(title, body, a.id);
          changed("notifications");
        }
        firing.current.delete(a.id);
        changed("alerts");
      });
    }
  }, [uid, active, quotes]);
}

/* ── Notificaciones ─────────────────────────────────────────────────────── */
export function useNotifications(uid) {
  const res = useSupa(
    (db) => db.from("notifications").select("*").order("created_at", { ascending: false }).limit(40),
    [uid],
    { channel: "notifications", enabled: Boolean(uid), initial: [] },
  );
  const { reload } = res;

  // tiempo real (si está habilitado en Supabase) + un repaso cada 60 s
  useEffect(() => {
    if (!supabase || !uid) return;
    const ch = supabase
      .channel(`notifs-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          const n = payload.new;
          // las alertas que avisó el backend también salen en el navegador
          if (n.kind === "alert" ? !firedHere.delete(n.title) : document.visibilityState !== "visible") browserNotify(n.title, n.body || "", n.id);
          reload();
        },
      )
      .subscribe();
    const id = setInterval(() => document.visibilityState === "visible" && reload(), 60_000);
    return () => {
      clearInterval(id);
      supabase.removeChannel(ch);
    };
  }, [uid, reload]);

  const unread = res.data.filter((n) => !n.read_at).length;
  const markRead = useCallback(
    async (ids) => {
      let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
      q = ids ? q.in("id", ids) : q.eq("user_id", uid);
      await q;
      changed("notifications");
    },
    [uid],
  );
  const remove = useCallback(async (ids) => {
    const { error } = await supabase.from("notifications").delete().in("id", ids);
    if (!error) changed("notifications");
    return error?.message || "";
  }, []);
  return { rows: res.data, loaded: res.loaded, unread, markRead, remove };
}
