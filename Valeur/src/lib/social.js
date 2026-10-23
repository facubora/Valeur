import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { lookup } from "./catalog";
import { confirmDialog } from "./feedback";

/* ── Comunidad: perfiles, seguir/amigos, recomendaciones y verificación ────
   Todo vive en Supabase (ver supabase/migrations/0003_community.sql). */

/* Avisos entre pantallas: quien cambia datos llama a `changed("follows")`
   y los hooks suscriptos a ese canal se recargan solos. */
const bus = new EventTarget();
export const changed = (channel) => bus.dispatchEvent(new Event(channel));

/* Consulta a Supabase → { data, count, loaded, error, reload }. `fn` recibe el
   cliente y devuelve el builder; se vuelve a correr si cambian `deps` o
   alguien avisa en `channel`. Con `enabled` en false no consulta.
   Caché "muestra lo último y actualiza atrás": al volver a una pantalla se
   pinta al instante lo que ya se había traído y la consulta corre por detrás.
   La clave es el canal + el código de la consulta + sus deps. */
const supaCache = new Map(); // clave → { data, count }
// lo de una cuenta no se le muestra a la siguiente
supabase?.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") supaCache.clear();
});

export function useSupa(fn, deps, { channel, enabled = true, initial = null } = {}) {
  const key = `${channel || ""}|${fn.toString()}|${JSON.stringify(deps)}`;
  const [state, setState] = useState(() => {
    const hit = supaCache.get(key);
    return { key, data: hit ? hit.data : initial, count: hit?.count ?? null, loaded: Boolean(hit), error: "" };
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!channel) return;
    const on = () => setTick((t) => t + 1);
    bus.addEventListener(channel, on);
    return () => bus.removeEventListener(channel, on);
  }, [channel]);

  useEffect(() => {
    if (!supabase || !enabled) return;
    let alive = true;
    Promise.resolve(fn(supabase)).then(({ data, count, error }) => {
      if (!error) supaCache.set(key, { data: data ?? initial, count: count ?? null });
      if (alive) setState({ key, data: data ?? initial, count: count ?? null, loaded: true, error: error?.message || "" });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  // si cambiaron las deps y ya había algo guardado para las nuevas, eso
  const hit = state.key !== key ? supaCache.get(key) : null;
  const view = hit ? { data: hit.data, count: hit.count, loaded: true, error: "" } : state;
  return { data: view.data, count: view.count, loaded: view.loaded, error: view.error, reload };
}

const errMsg = ({ error }) => error?.message || "";

/* ── Perfiles ─────────────────────────────────────────────────────────────── */
export const PROFILE_COLS =
  "id, username, display_name, bio, visibility, interests, verified, verified_label, created_at";
const AUTHOR_COLS = "id, username, display_name, verified, verified_label";

export const VISIBILITY = [
  ["private", "Privado", "bi-lock", "Solo vos ves tu portfolio"],
  ["friends", "Amigos", "bi-people", "Lo ven quienes se siguen con vos"],
  ["public", "Público", "bi-globe2", "Lo ve cualquier persona en Valeur"],
];

export function useMyProfile(uid) {
  return useSupa((db) => db.from("profiles").select(PROFILE_COLS).eq("id", uid).maybeSingle(), [uid], {
    channel: "profile",
    enabled: Boolean(uid),
  });
}

export function useProfileByUsername(username) {
  return useSupa(
    (db) => db.from("profiles").select(PROFILE_COLS).ilike("username", username).maybeSingle(),
    [username],
    { channel: "profile", enabled: Boolean(username) },
  );
}

/* Cambiar quién ve el portfolio. Pasar a público (o a amigos) se confirma. */
export async function confirmVisibility(next, current) {
  if (next === current || next === "private") return true;
  return confirmDialog({
    title: next === "public" ? "¿Hacer público tu portfolio?" : "¿Compartir tu portfolio con amigos?",
    body:
      next === "public"
        ? "Cualquier persona en Valeur va a ver qué activos tenés, en qué proporción y cómo te va. Nunca se muestran montos."
        : "Las personas que se siguen con vos van a ver qué activos tenés, en qué proporción y cómo te va. Nunca se muestran montos.",
    confirmText: next === "public" ? "Hacerlo público" : "Compartir con amigos",
    icon: next === "public" ? "bi-globe2" : "bi-people",
  });
}

export async function updateProfile(uid, patch) {
  const err = errMsg(await supabase.from("profiles").update(patch).eq("id", uid));
  if (!err) changed("profile");
  return err;
}

/* Personas por id (para listas de amigos, seguidores, etc.) */
export function usePeople(ids) {
  const key = [...ids].sort().join(",");
  return useSupa((db) => db.from("profiles").select(AUTHOR_COLS + ", visibility, bio").in("id", key.split(",")), [key], {
    enabled: Boolean(key),
    initial: [],
  });
}

/* Buscador de personas por username o nombre (con debounce) */
export function usePeopleSearch(query) {
  const q = query.trim().replace(/[%,()]/g, "");
  const [res, setRes] = useState({ q: "", rows: [] });
  useEffect(() => {
    if (!supabase || q.length < 2) return;
    let alive = true;
    const t = setTimeout(() => {
      supabase
        .from("profiles")
        .select(AUTHOR_COLS + ", visibility")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .order("verified", { ascending: false })
        .limit(8)
        .then(({ data }) => alive && setRes({ q, rows: data || [] }));
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);
  return q.length < 2 ? { rows: [], loading: false } : { rows: res.rows, loading: res.q !== q };
}

/* A quién seguir: verificados y perfiles públicos que todavía no seguís */
export function useSuggestedPeople(uid, following) {
  const { data, loaded } = useSupa(
    (db) =>
      db
        .from("profiles")
        .select(AUTHOR_COLS + ", visibility, bio")
        .or("verified.eq.true,visibility.eq.public")
        .neq("id", uid)
        .order("verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20),
    [uid],
    { enabled: Boolean(uid), initial: [] },
  );
  return { rows: data.filter((p) => !following.has(p.id)).slice(0, 6), loaded };
}

/* ── Seguir / amigos ──────────────────────────────────────────────────────── */
/* Grafo del usuario: a quién sigue, quién lo sigue y los amigos (mutuos) */
export function useFollowGraph(uid) {
  const out = useSupa((db) => db.from("follows").select("followee_id").eq("follower_id", uid), [uid], {
    channel: "follows",
    enabled: Boolean(uid),
    initial: [],
  });
  const inc = useSupa((db) => db.from("follows").select("follower_id").eq("followee_id", uid), [uid], {
    channel: "follows",
    enabled: Boolean(uid),
    initial: [],
  });
  const following = new Set(out.data.map((r) => r.followee_id));
  const followers = new Set(inc.data.map((r) => r.follower_id));
  const friends = new Set([...following].filter((id) => followers.has(id)));
  return { following, followers, friends, loaded: out.loaded && inc.loaded };
}

/* Contadores de un perfil cualquiera */
export function useFollowCounts(id) {
  const followers = useSupa(
    (db) => db.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", id),
    [id],
    { channel: "follows", enabled: Boolean(id) },
  );
  const following = useSupa(
    (db) => db.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", id),
    [id],
    { channel: "follows", enabled: Boolean(id) },
  );
  return { followers: followers.count, following: following.count };
}

export async function follow(uid, target) {
  const err = errMsg(await supabase.from("follows").insert({ follower_id: uid, followee_id: target }));
  changed("follows");
  return err;
}

export async function unfollow(uid, target) {
  const err = errMsg(await supabase.from("follows").delete().eq("follower_id", uid).eq("followee_id", target));
  changed("follows");
  return err;
}

/* ── Recomendaciones (posts) ─────────────────────────────────────────────── */
export const STANCES = [
  ["buy", "Comprar", "bi-arrow-up-right"],
  ["hold", "Mantener", "bi-pause"],
  ["sell", "Vender", "bi-arrow-down-right"],
];
export const STANCE = Object.fromEntries(STANCES.map(([k, label, icon]) => [k, { key: k, label, icon }]));

/* Todas las variantes de un activo (AAPL, AAPL.BA, AAPLD.BA) para juntar lo que se dijo */
export function symbolVariants(symbol) {
  const a = lookup(symbol);
  if (!a) return [symbol.toUpperCase()];
  return [a.symbol, a.cedear, a.cedear?.replace(/\.BA$/, "D.BA")].filter(Boolean);
}

/* Feed → posts con autor y "me sirve".
   mode: "following" (los que seguís + vos) | "all" | "verified"
   Opcional: symbol (todas sus variantes), authorId, postId. */
export function useFeed({
  uid,
  mode = "all",
  following = null,
  symbol = null,
  authorId = null,
  postId = null,
  limit = 30,
  enabled = true,
}) {
  const followKey = following ? [...following].sort().join(",") : "";
  return useSupa(
    (db) => {
      const inner = mode === "verified" ? "!inner" : "";
      let q = db
        .from("posts")
        // el autor por la FK de posts: "profiles" a secas es ambiguo porque
        // post_likes también une posts con profiles (Supabase devuelve PGRST201)
        .select(`*, author:profiles!posts_user_id_fkey${inner}(${AUTHOR_COLS}), post_likes(user_id)`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (postId) q = q.eq("id", postId);
      if (mode === "following") q = q.in("user_id", [uid, ...(followKey ? followKey.split(",") : [])]);
      if (mode === "verified") q = q.eq("author.verified", true);
      if (symbol) q = q.in("symbol", symbolVariants(symbol));
      if (authorId) q = q.eq("user_id", authorId);
      return q;
    },
    [uid, mode, followKey, symbol, authorId, postId, limit],
    { channel: "posts", enabled: Boolean(uid) && enabled, initial: [] },
  );
}

export async function createPost(uid, post) {
  const err = errMsg(await supabase.from("posts").insert({ ...post, user_id: uid }));
  if (!err) changed("posts");
  return err;
}

export async function deletePost(id) {
  const err = errMsg(await supabase.from("posts").delete().eq("id", id));
  if (!err) changed("posts");
  return err;
}

export async function setLike(uid, postId, on) {
  const res = on
    ? await supabase.from("post_likes").insert({ post_id: postId, user_id: uid })
    : await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", uid);
  return errMsg(res);
}

/* Lo que recomiendan comprar las personas que seguís → { BASE: { count, users } }
   (alimenta el "Para vos" del mercado) */
export function communitySignal(posts, uid) {
  const out = {};
  const seen = new Set();
  for (const p of posts) {
    if (p.user_id === uid || p.stance !== "buy") continue;
    const base = lookup(p.symbol)?.symbol || p.symbol;
    const k = `${base}|${p.user_id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out[base] ??= { count: 0, users: [] };
    out[base].count += 1;
    out[base].users.push(p.author?.username || "alguien");
  }
  return out;
}

/* ── Portfolio compartido (sin montos) ───────────────────────────────────── */
export function useSharedPortfolio(targetId) {
  const pf = useSupa((db) => db.rpc("shared_portfolio", { target: targetId }), [targetId], {
    channel: "profile",
    enabled: Boolean(targetId),
    initial: [],
  });
  const trades = useSupa((db) => db.rpc("shared_trades", { target: targetId, lim: 12 }), [targetId], {
    channel: "profile",
    enabled: Boolean(targetId),
    initial: [],
  });
  return { positions: pf.data, trades: trades.data, loaded: pf.loaded && trades.loaded, error: pf.error };
}

/* ── Verificación ─────────────────────────────────────────────────────────── */
export const VERIFY_CATEGORIES = [
  ["analista", "Analista"],
  ["asesor", "Asesor financiero"],
  ["broker", "Broker / ALyC"],
  ["creador", "Creador de contenido"],
  ["periodista", "Periodista"],
  ["otro", "Otro"],
];

export function useMyVerification(uid) {
  return useSupa(
    (db) =>
      db
        .from("verification_requests")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    [uid],
    { channel: "verification", enabled: Boolean(uid) },
  );
}

export async function requestVerification(uid, req) {
  const res = await supabase.from("verification_requests").insert({ ...req, user_id: uid });
  if (res.error?.code === "23505") return "Ya tenés un pedido en revisión";
  const err = errMsg(res);
  if (!err) changed("verification");
  return err;
}

/* ── Formato ──────────────────────────────────────────────────────────────── */
export function timeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return "recién";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(ts).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
