// Front compilado + Supabase de mentira (en memoria) + proxy con caché al backend de precios
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { randomUUID as uuid } from "node:crypto";
const DIST = new URL("./dist/", import.meta.url).pathname, MARKET = process.env.MARKET || "http://127.0.0.1:5002";
const day = (n) => new Date(Date.now() - n * 864e5).toISOString();
const d10 = (n) => day(n).slice(0, 10);
const U = {}; const mk = (username, o = {}) => (U[username] = { id: uuid(), username, email: o.email || `${username}@valeur.test`, display_name: null, bio: null, visibility: "private", interests: [], verified: false, verified_label: null, is_admin: false, created_at: day(60), ...o });
mk("manualdemo", { email: "manual@valeur.test", display_name: "Manuel Demo", bio: "Aprendiendo a invertir. CEDEARs y un poco de cripto.", visibility: "friends", interests: ["tech", "energy", "argentina"], created_at: day(170) });
mk("nuevo", { email: "nuevo@valeur.test", created_at: day(0) });
mk("admin", { email: "admin@valeur.test", display_name: "Equipo Valeur", is_admin: true, created_at: day(300) });
mk("ana_inversiones", { display_name: "Ana Pereyra", bio: "Analista de equity LatAm. Opiniones personales.", visibility: "public", verified: true, verified_label: "Analista", created_at: day(200) });
mk("juan_cruz", { display_name: "Juan Cruz", bio: "Largo plazo y CEDEARs. Poco ruido.", visibility: "friends", created_at: day(150) });
mk("sofi_m", { display_name: "Sofía M.", bio: "Aprendiendo a invertir con lo que sobra del mes.", visibility: "private", created_at: day(90) });
mk("martu_cedears", { display_name: "Martina R.", bio: "Tecnología y energía. Compro de a poco.", visibility: "public", created_at: day(80) });
mk("leo_trader", { display_name: "Leo G.", bio: "Corto plazo, stops siempre.", visibility: "public", created_at: day(70) });
mk("cami_crypto", { display_name: "Camila V.", bio: "Cripto y fintech. Hago videos explicando.", visibility: "public", verified: true, verified_label: "Creador de contenido", created_at: day(120) });
const me = U.manualdemo;
const prices = {}; // símbolo → velas
async function candles(s) { if (!prices[s]) { const r = await (await fetch(`${MARKET}/api/candles/${encodeURIComponent(s)}?interval=daily&range=1y`)).json(); prices[s] = r.candles || []; } return prices[s]; }
async function closeAt(s, n) { const c = await candles(s); const d = d10(n); const b = c.filter((x) => String(x.time).slice(0, 10) <= d); return +(b.length ? b.at(-1) : c[0]).close.toFixed(4); }
const T = { trades: [], watchlist: [], follows: [], posts: [], post_likes: [], alerts: [], notifications: [], verification_requests: [], reports: [], profiles: Object.values(U) };
async function seed() {
  const names = { "AAPL.BA": "Apple", "MELI.BA": "MercadoLibre", "KO.BA": "Coca-Cola", NVDA: "NVIDIA", "BTC-USD": "Bitcoin" };
  for (const [s, side, qty, n, note] of [["AAPL.BA","buy",60,160,"De a poco y a largo plazo"],["MELI.BA","buy",12,130,"La que más creció"],["KO.BA","buy",15,100,"Defensiva y paga dividendos"],["NVDA","buy",2,75,null],["BTC-USD","buy",0.01,60,"Un poquito de cripto"],["AAPL.BA","sell",5,30,"Tomé algo de ganancia"]])
    T.trades.push({ id: uuid(), user_id: me.id, symbol: s, name: names[s], side, qty, price: await closeAt(s, n), executed_at: d10(n), note, created_at: day(n) });
  for (const [i, [s, n]] of [["GGAL.BA","Grupo Galicia"],["YPFD.BA","YPF"],["TSLA","Tesla"],["MSFT.BA","Microsoft"],["SPY","S&P 500"]].entries()) T.watchlist.push({ user_id: me.id, symbol: s, name: n, added_at: day(i + 3) });
  for (const [s, kind, k] of [["AAPL.BA","above",1.1],["GGAL.BA","below",0.9],["BTC-USD","down_pct",8]]) T.alerts.push({ id: uuid(), user_id: me.id, symbol: s, kind, value: kind.endsWith("pct") ? k : +((await closeAt(s, 0)) * k).toPrecision(4), active: true, triggered_at: null, created_at: day(8) });
  T.alerts.push({ id: uuid(), user_id: me.id, symbol: "MELI.BA", kind: "above", value: +((await closeAt("MELI.BA", 4)) * 0.99).toPrecision(4), active: false, triggered_at: day(4), created_at: day(20) });
  const fw = (a, b, n = 20) => T.follows.push({ follower_id: U[a].id, followee_id: U[b].id, created_at: day(n) });
  for (const [a, b] of [["manualdemo","ana_inversiones"],["manualdemo","cami_crypto"],["manualdemo","juan_cruz"],["juan_cruz","manualdemo"],["sofi_m","manualdemo"],["martu_cedears","manualdemo"],["juan_cruz","ana_inversiones"],["ana_inversiones","juan_cruz"],["sofi_m","ana_inversiones"],["sofi_m","cami_crypto"],["cami_crypto","sofi_m"],["leo_trader","martu_cedears"],["martu_cedears","leo_trader"],["cami_crypto","ana_inversiones"]]) fw(a, b);
  for (const [u, s, stance, body, n, aud] of [
    ["ana_inversiones","NVDA","buy","Data center sigue explotando y la guía vino arriba. La valuación no es barata, pero el crecimiento la banca.",26],
    ["ana_inversiones","MELI.BA","hold","Excelente negocio, pero ya corrió mucho. Mantengo, no sumo hasta un retroceso.",18],
    ["juan_cruz","KO.BA","buy","Defensiva para cuando el mercado se pone nervioso. Dividendos y paciencia.",22],
    ["sofi_m","AAPL.BA","buy","Mi primera compra: de a poco y para el largo plazo.",15],
    ["martu_cedears","VIST","buy","Vaca Muerta tiene para rato y la producción sigue subiendo trimestre a trimestre.",20],
    ["leo_trader","TSLA","sell","Márgenes cayendo y mucha competencia en China. Tomo ganancia.",12],
    ["cami_crypto","BTC-USD","buy","Para mí sigue siendo la reserva de valor del mundo cripto. Compra mensual.",9],
    ["cami_crypto","GGAL.BA","hold","Bancos argentinos ya descontaron mucho. Mantengo y espero.",5],
    ["manualdemo","AAPL.BA","buy","El iPhone y los servicios siguen creciendo. Sumo un poco todos los meses.",6],
    ["leo_trader","GGAL.BA","buy","Seguro sube 300% esta semana, entren todos ya al grupo del link.",3]])
    T.posts.push({ id: uuid(), user_id: U[u].id, symbol: s, stance, body, audience: aud || "public", price_at: await closeAt(s, n), created_at: day(n) });
  const likes = [5, 3, 2, 4, 3, 1, 4, 2, 2, 0]; const ids = Object.values(U).map((u) => u.id);
  T.posts.forEach((p, i) => ids.filter((x) => x !== p.user_id && x !== me.id).slice(0, likes[i]).forEach((id) => T.post_likes.push({ post_id: p.id, user_id: id })));
  const nt = (kind, title, body, symbol, link, h, read) => T.notifications.push({ id: uuid(), user_id: me.id, kind, title, body, symbol, link, created_at: new Date(Date.now() - h * 36e5).toISOString(), read_at: read ? day(0) : null });
  const mv = T.alerts.at(-1).value.toLocaleString("es-AR");
  nt("event", "GGAL.BA presenta resultados mañana", "Esperan una ganancia de US$ 1,49 por acción.", "GGAL.BA", "/calendario", 7, false);
  nt("post", "@ana_inversiones recomienda comprar NVDA", "Data center sigue explotando y la guía vino arriba.", "NVDA", "/comunidad", 12, false);
  nt("like", "A @sofi_m le sirvió tu recomendación", "AAPL.BA", "AAPL.BA", "/comunidad", 30, false);
  nt("follow", "@martu_cedears empezó a seguirte", null, null, "/u/martu_cedears", 34, true);
  nt("alert", `MELI.BA llegó a ARS ${mv}`, "Ahora cotiza a ARS 20.100.", "MELI.BA", "/tickersearch?symbol=MELI.BA", 96, true);
  T.verification_requests.push({ id: uuid(), user_id: U.martu_cedears.id, category: "creador", link: "youtube.com/@martucedears", reason: "Hago videos explicando CEDEARs para gente que arranca. 12 mil suscriptores.", status: "pending", created_at: day(2) });
  const bad = T.posts.at(-1); for (const [u, r] of [["sofi_m","spam"],["juan_cruz","misleading"],["ana_inversiones","spam"]]) T.reports.push({ id: uuid(), post_id: bad.id, reporter: U[u].id, reason: r, status: "open", created_at: day(1) });
}
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const session = (u) => { const exp = Math.floor(Date.now() / 1000) + 86400; return { access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, email: u.email, role: "authenticated", exp })}.x`, token_type: "bearer", expires_in: 86400, expires_at: exp, refresh_token: "r", user: userObj(u) }; };
const userObj = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, user_metadata: { username: u.username, currency: u.currency || "USD" }, app_metadata: {}, created_at: u.created_at });
const OWN = { trades: 1, watchlist: 1, alerts: 1, notifications: 1 };
const who = (req) => { try { return JSON.parse(Buffer.from(req.headers.authorization.split(" ")[1].split(".")[1], "base64url")).sub; } catch { return null; } };
const author = (id) => { const u = T.profiles.find((x) => x.id === id); return u && { id: u.id, username: u.username, display_name: u.display_name, verified: u.verified, verified_label: u.verified_label }; };
function match(row, k, v) {
  const i = v.indexOf("."), op = v.slice(0, i), arg = v.slice(i + 1);
  if (k.includes(".")) { const [a, b] = k.split("."); row = { [k]: a === "author" ? author(row.user_id)?.[b] : undefined }; }
  const val = row[k]; const s = val == null ? "null" : String(val);
  if (op === "eq") return s === arg; if (op === "neq") return s !== arg; if (op === "is") return s === arg;
  if (op === "in") return arg.slice(1, -1).split(",").map((x) => x.replace(/^"|"$/g, "")).includes(s);
  if (op === "ilike") { const re = new RegExp("^" + arg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%|\\\*/g, ".*") + "$", "i"); return re.test(s); }
  return true;
}
function orMatch(row, v) { return v.slice(1, -1).split(",").some((c) => { const i = c.indexOf("."); return match(row, c.slice(0, i), c.slice(i + 1)); }); }
function rest(req, url, body) {
  const t = url.pathname.split("/").pop(), uid = who(req); let rows = T[t] || [];
  const f = [...url.searchParams].filter(([k]) => !["select","order","limit","offset","on_conflict","columns"].includes(k));
  const sel = (r) => (!OWN[t] || r.user_id === uid) && f.every(([k, v]) => (k === "or" ? orMatch(r, v) : match(r, k, v)));
  const hit = rows.filter(sel);
  if (req.method === "POST") { for (const r of [].concat(body)) { if (t === "watchlist") { const x = rows.find((w) => w.user_id === r.user_id && w.symbol === r.symbol); if (x) continue; r.added_at = day(0); } rows.unshift({ id: uuid(), created_at: day(0), user_id: uid, active: true, triggered_at: null, read_at: null, status: t === "reports" ? "open" : "pending", ...r }); } return [201, null]; }
  if (req.method === "PATCH") { hit.forEach((r) => { Object.assign(r, body); if (t === "verification_requests" && body.status === "approved") Object.assign(T.profiles.find((p) => p.id === r.user_id), { verified: true, verified_label: "Creador de contenido" }); }); return [200, hit]; }
  if (req.method === "DELETE") { T[t] = rows.filter((r) => !hit.includes(r)); return [204, null]; }
  let out = hit.map((r) => ({ ...r }));
  const ord = url.searchParams.get("order"); if (ord) for (const o of ord.split(",").reverse()) { const [c, dir] = o.split("."); out.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (dir === "desc" ? -1 : 1)); }
  const total = out.length; const lim = +url.searchParams.get("limit"); if (lim) out = out.slice(0, lim);
  if (t === "posts") out.forEach((p) => { p.author = author(p.user_id); p.post_likes = T.post_likes.filter((l) => l.post_id === p.id); });
  if (t === "verification_requests") out.forEach((r) => (r.user = author(r.user_id)));
  if (t === "reports") out.forEach((r) => { const p = T.posts.find((x) => x.id === r.post_id); r.post = p && { ...p, author: author(p.user_id) }; });
  return [200, out, total];
}
async function rpc(name, body, uid) {
  if (name === "username_available") return !T.profiles.some((p) => p.username.toLowerCase() === body.candidate.toLowerCase());
  if (name === "shared_portfolio") { const mine = body.target === uid ? T.trades.filter((t) => t.user_id === uid) : null;
    if (mine) { const m = {}; for (const t of [...mine].sort((a, b) => a.executed_at < b.executed_at ? -1 : 1)) { const p = (m[t.symbol] ||= { symbol: t.symbol, name: t.name, units: 0, cost: 0 }); if (t.side === "buy") { p.units += t.qty; p.cost += t.qty * t.price; } else { p.cost -= p.cost * t.qty / p.units; p.units -= t.qty; } } return Object.values(m).map((p) => ({ symbol: p.symbol, name: p.name, units: p.units, avg_cost: p.cost / p.units })); }
    const u = T.profiles.find((p) => p.id === body.target); if (["sofi_m"].includes(u?.username) || !u) return [];
    return [["NVDA", "NVIDIA", 4, 90], ["MELI.BA", "MercadoLibre", 20, 140], ["KO.BA", "Coca-Cola", 25, 110], ["AAPL.BA", "Apple", 18, 170]].reduce(async (acc, [s, n, q, dd]) => [...(await acc), { symbol: s, name: n, units: q, avg_cost: await closeAt(s, dd) }], Promise.resolve([])); }
  if (name === "shared_trades") { if (body.target === uid) return T.trades.map(({ symbol, side, executed_at }) => ({ symbol, side, executed_at })).sort((a, b) => (a.executed_at < b.executed_at ? 1 : -1)); const u = T.profiles.find((p) => p.id === body.target); return u?.username === "sofi_m" ? [] : [["NVDA","buy",12],["AAPL.BA","sell",25],["MELI.BA","buy",40],["KO.BA","buy",61]].map(([symbol, side, n]) => ({ symbol, side, executed_at: d10(n) })); }
  if (name === "admin_stats") return { users: 42, users_week: 6, active_week: 19, with_trades: 27, posts: 58, posts_week: 9, likes: 131, follows: 96, alerts_active: 34, alerts_fired: 7, verified: 3, pending_verifications: T.verification_requests.filter((r) => r.status === "pending").length, open_reports: T.reports.filter((r) => r.status === "open").length, signups: [2,3,4,3,6,7,5,6].map((n, i) => ({ week: d10((7 - i) * 7 + 1), n })), top_watched: [["GGAL.BA",18],["MELI.BA",15],["NVDA",13],["YPFD.BA",11],["BTC-USD",8]].map(([symbol, n]) => ({ symbol, n })), top_recommended: [["NVDA",9],["AAPL.BA",7],["MELI.BA",6],["VIST",4],["KO.BA",3]].map(([symbol, n]) => ({ symbol, n })) };
  return null;
}
const cache = new Map(); let marketDown = false, authDown = false;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".webmanifest": "application/manifest+json" };
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:5190"); const H = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
  const send = (c, o, h = {}) => { res.writeHead(c, { "content-type": "application/json", ...H, ...h }); res.end(o == null ? "" : JSON.stringify(o)); };
  let raw = ""; for await (const c of req) raw += c; let body = null; try { body = JSON.parse(raw); } catch {}
  const p = url.pathname;
  try {
    if (req.method === "OPTIONS") return send(200, {});
    if (p === "/__market") { marketDown = url.searchParams.get("down") === "1"; return send(200, {}); }
    if (p === "/__auth") { authDown = url.searchParams.get("down") === "1"; return send(200, {}); }
    if (p.startsWith("/api/")) {
      if (marketDown) return req.socket.destroy();
      const k = req.url; if (!cache.has(k)) { const r = await fetch(MARKET + req.url); const tx = await r.text(); if (!r.ok) return (res.writeHead(r.status, { "content-type": "application/json" }), res.end(tx)); cache.set(k, tx); }
      res.writeHead(200, { "content-type": "application/json" }); return res.end(cache.get(k));
    }
    if (p.startsWith("/auth/v1")) {
      if (authDown) return req.socket.destroy();
      const ep = p.split("/").pop();
      if (ep === "token") { const u = T.profiles.find((x) => x.email === body.email); if (body.refresh_token) return send(200, session(me)); if (!u || /incorrecta/i.test(body.password)) return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }); return send(200, session(u)); }
      if (ep === "signup") { if (T.profiles.some((x) => x.email === body.email)) return send(422, { code: 422, msg: "User already registered" }); const u = { ...mk(body.data.username, { email: body.email, created_at: day(0) }) }; T.profiles.push(U[body.data.username]); return send(200, body.email === "tu@email.com" ? userObj(u) : session(U[body.data.username])); }
      if (ep === "recover") return send(200, {}); if (ep === "logout") return send(204, null);
      if (ep === "user") { const u = T.profiles.find((x) => x.id === who(req)) || me; if (req.method === "PUT" && body?.data) Object.assign(u, body.data); return send(200, userObj(u)); }
      return send(200, {});
    }
    if (p.startsWith("/rest/v1/rpc/")) return send(200, await rpc(p.split("/").pop(), body, who(req)));
    if (p.startsWith("/rest/v1/")) {
      const [c, out, total] = rest(req, url, body); const one = /vnd\.pgrst\.object/.test(req.headers.accept || "");
      if (one) return out?.length ? send(200, out[0]) : send(406, { code: "PGRST116", details: "0 rows", message: "0 rows" });
      if (req.method === "HEAD") return send(200, null, { "content-range": `0-0/${total}` });
      return send(c, out, total != null ? { "content-range": `0-${Math.max(0, out.length - 1)}/${total}` } : {});
    }
    if (p.startsWith("/realtime")) return send(404, {});
    let f = path.join(DIST, decodeURIComponent(p)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  } catch (e) { console.error(p, e); send(500, { message: String(e) }); }
}).listen(5190, async () => { await seed(); console.log("listo"); });
