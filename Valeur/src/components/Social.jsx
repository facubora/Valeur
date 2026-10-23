import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { initials } from "../lib/session";
import { lookup } from "../lib/catalog";
import { STANCE, follow, unfollow, setLike, deletePost, changed, timeAgo } from "../lib/social";
import { attempt } from "../lib/feedback";

/* Piezas chicas de la comunidad: avatar, verificado, persona, seguir y post */

/* Tono estable por username: cada persona tiene "su" color */
const hue = (name = "") => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export function Avatar({ name, size = 36 }) {
  return (
    <span
      className="p-avatar"
      style={{ "--h": hue(name), width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function Verified({ label }) {
  return (
    <span className="verified" title={label || "Cuenta verificada"} aria-label={label || "Cuenta verificada"}>
      <i className="bi bi-patch-check-fill" />
    </span>
  );
}

/* Avatar + nombre + @usuario, linkea al perfil */
export function Person({ p, size = 36, sub = null }) {
  if (!p) return null;
  return (
    <Link to={`/u/${p.username}`} className="person">
      <Avatar name={p.username} size={size} />
      <div>
        <b>
          {p.display_name || p.username}
          {p.verified && <Verified label={p.verified_label} />}
        </b>
        <span>{sub ?? `@${p.username}`}</span>
      </div>
    </Link>
  );
}

/* Seguir / Siguiendo / Amigos. `graph` viene de useFollowGraph */
export function FollowButton({ uid, target, graph, size = "sm", name = null }) {
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  if (!uid || uid === target) return null;
  const following = graph.following.has(target);
  const followsMe = graph.followers.has(target);
  const label = following ? (followsMe ? "Amigos" : "Siguiendo") : followsMe ? "Seguir también" : "Seguir";
  const who = name ? `@${name}` : "esta persona";
  const toggle = async () => {
    // dejar de seguir a un amigo corta la amistad: se confirma en el mismo botón
    if (following && followsMe && !asking) return setAsking(true);
    setAsking(false);
    setBusy(true);
    await attempt(following ? unfollow(uid, target) : follow(uid, target), {
      ok: following ? `Dejaste de seguir a ${who}` : `Ahora seguís a ${who}`,
      fail: following ? "No se pudo dejar de seguir" : "No se pudo seguir",
    });
    setBusy(false);
  };
  return (
    <button
      type="button"
      className={"btn" + (size ? " btn-" + size : "") + (following ? " btn-line on" : " btn-pink") + " follow-btn" + (asking ? " sure" : "")}
      onClick={toggle}
      onBlur={() => setAsking(false)}
      onKeyDown={(e) => e.key === "Escape" && setAsking(false)}
      disabled={busy || !graph.loaded}
      title={asking ? "Dejan de ser amigos: no vas a ver lo que comparte solo con amigos" : following ? "Dejar de seguir" : undefined}
    >
      <i className={asking ? "bi bi-person-dash" : following ? (followsMe ? "bi bi-people-fill" : "bi bi-check2") : "bi bi-person-plus"} />
      <span>{asking ? "¿Dejar de ser amigos? Sí" : label}</span>
    </button>
  );
}

/* Tarjeta de persona para grillas: identidad, bio y botón de seguir */
export function PersonCard({ p, uid, graph, compact = false }) {
  const vis = { public: ["bi-globe2", "Portfolio público"], friends: ["bi-people", "Portfolio para amigos"] }[p.visibility];
  return (
    <article className={"card person-card" + (compact ? " compact" : "")}>
      <Link to={`/u/${p.username}`} className="pc-id">
        <Avatar name={p.username} size={compact ? 40 : 52} />
        <div>
          <b>
            {p.display_name || p.username}
            {p.verified && <Verified label={p.verified_label} />}
          </b>
          <span>@{p.username}</span>
        </div>
      </Link>
      {!compact && (
        <>
          {p.verified && <span className="tag verified-tag">{p.verified_label}</span>}
          <p className="pc-bio">{p.bio || "Sin bio todavía."}</p>
          {vis && (
            <span className="pc-vis">
              <i className={"bi " + vis[0]} /> {vis[1]}
            </span>
          )}
        </>
      )}
      <FollowButton uid={uid} target={p.id} graph={graph} name={p.username} />
    </article>
  );
}

export function StanceTag({ stance }) {
  const s = STANCE[stance];
  return (
    <span className={"stance " + stance}>
      <i className={"bi " + s.icon} />
      {s.label}
    </span>
  );
}

const tickerUrl = (s) => `/tickersearch?symbol=${encodeURIComponent(s)}`;

/* Recomendación como "jugada": arriba una franja del color de la postura con
   el activo; en el medio el porqué, como una cita; abajo quién lo dijo y cómo
   le fue desde entonces. Borrar la propia se confirma en la misma tarjeta. */
export function PostCard({ post, uid, quote, onChange, highlight = false }) {
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const likes = post.post_likes?.length || 0;
  const liked = post.post_likes?.some((l) => l.user_id === uid);
  const meta = lookup(post.symbol);
  const st = STANCE[post.stance] || STANCE.hold;
  const since = quote && post.price_at ? (quote.price / Number(post.price_at) - 1) * 100 : null;
  // ¿va en la dirección que dijo? (comprar → sube, vender → baja)
  const right = since == null || post.stance === "hold" ? null : post.stance === "buy" ? since >= 0 : since <= 0;
  const a = post.author;

  const like = async () => {
    setBusy(true);
    await attempt(setLike(uid, post.id, !liked), { fail: "No se pudo guardar tu reacción" });
    setBusy(false);
    changed("posts");
    onChange?.();
  };
  const remove = async () => {
    setAsking(false);
    setBusy(true);
    const ok = await attempt(deletePost(post.id), { ok: "Recomendación borrada", fail: "No se pudo borrar la recomendación" });
    setBusy(false);
    if (ok) onChange?.();
  };

  return (
    <article className={"card post jug " + post.stance + (highlight ? " hl" : "")}>
      <Link to={tickerUrl(post.symbol)} className="jug-band">
        <Logo symbol={post.symbol} size={38} />
        <span className="jug-asset">
          <b>{post.symbol}</b>
          <small>{meta?.name || " "}</small>
        </span>
        <span className="jug-call">
          <i className={"bi " + st.icon} /> {st.label}
        </span>
      </Link>

      <blockquote className="jug-body">{post.body}</blockquote>

      <footer className="jug-foot">
        <div className="jug-who">
          {a && (
            <Link to={`/u/${a.username}`} aria-label={`Perfil de @${a.username}`}>
              <Avatar name={a.username} size={28} />
            </Link>
          )}
          <div>
            {a && (
              <Link to={`/u/${a.username}`} className="jug-name">
                {a.display_name || a.username}
                {a.verified && <Verified label={a.verified_label} />}
              </Link>
            )}
            <span className="jug-meta">
              {timeAgo(post.created_at)}
              {post.audience === "friends" && " · solo amigos"}
              <button type="button" className={"jug-like" + (liked ? " on" : "")} onClick={like} disabled={busy || !uid} aria-pressed={liked} title="Me sirve">
                <i className={liked ? "bi bi-hand-thumbs-up-fill" : "bi bi-hand-thumbs-up"} />
                {likes > 0 ? likes : "Me sirve"}
              </button>
              {post.user_id === uid && (
                <button type="button" className="jug-del" onClick={() => setAsking(true)} disabled={busy} title="Borrar" aria-label="Borrar recomendación">
                  <i className="bi bi-trash3" />
                </button>
              )}
            </span>
          </div>
        </div>
        {since != null && (
          <div className="jug-perf">
            <b className={since >= 0 ? "txt-up" : "txt-down"}>
              {since >= 0 ? "+" : "−"}
              {Math.abs(since).toFixed(1).replace(".", ",")}%
            </b>
            <small>{right == null ? "desde que lo dijo" : right ? "va bien" : "va en contra"}</small>
          </div>
        )}
      </footer>

      {asking && (
        <div className="jug-ask" onKeyDown={(e) => e.key === "Escape" && setAsking(false)}>
          <b>¿Borrar esta recomendación?</b>
          <span>Tu recomendación de {post.symbol} y sus "me sirve" desaparecen para todos.</span>
          <div>
            <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setAsking(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={remove}>
              <i className="bi bi-trash3" /> Borrar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/* Feed vacío "fantasma": la forma de los posts que van a aparecer */
export function GhostPosts({ n = 2 }) {
  return (
    <div className="ghost-posts feed-grid" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card post gh-post gh-jug">
          <div className="jug-band">
            <span className="gh-av sq" />
            <span className="gh-ln w40" />
            <span className="gh-pill" />
          </div>
          <div className="gh-jug-body">
            <span className="gh-ln w90" />
            <span className="gh-ln w60" />
          </div>
          <div className="jug-foot">
            <span className="gh-av" />
            <span className="gh-ln w25" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Aviso para el desarrollador si falta correr la migración de comunidad */
export function SetupNotice({ error }) {
  if (!error) return null;
  // falta correr la migración: se explica cómo; cualquier otra falla, se muestra
  const setup = /column|relation|does not exist|schema cache/i.test(error) && !/more than one relationship/i.test(error);
  return (
    <div className="net-notice" role="alert">
      <i className="bi bi-database-exclamation" />
      <div>
        {setup ? (
          <>
            <b>Falta preparar la base para la comunidad.</b>
            <span>
              Corré <code>supabase/migrations/0003_community.sql</code> en Supabase → SQL Editor y recargá.
            </span>
          </>
        ) : (
          <>
            <b>No pudimos traer las recomendaciones.</b>
            <span>{/failed to fetch|network/i.test(error) ? "Sin conexión con el servidor. Probá de nuevo." : error}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* Recomendación resumida, para grillas (Inicio, Mercado) */
export function PostTile({ post, quote }) {
  const since = quote && post.price_at ? (quote.price / Number(post.price_at) - 1) * 100 : null;
  return (
    <Link to={`/comunidad?post=${post.id}`} className="card post-tile">
      <div className="pt-head">
        <Avatar name={post.author?.username} size={32} />
        <div>
          <b>
            {post.author?.display_name || post.author?.username}
            {post.author?.verified && <Verified label={post.author.verified_label} />}
          </b>
          <span>
            @{post.author?.username} · {timeAgo(post.created_at)}
          </span>
        </div>
      </div>
      <div className="pt-what">
        <StanceTag stance={post.stance} />
        <Logo symbol={post.symbol} size={22} />
        <b>{post.symbol}</b>
        {since != null && (
          <em className={since >= 0 ? "txt-up" : "txt-down"}>
            {since >= 0 ? "+" : ""}
            {since.toFixed(2)}%
          </em>
        )}
      </div>
      <p className="pt-body">{post.body}</p>
    </Link>
  );
}
