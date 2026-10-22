import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { initials } from "../lib/session";
import { lookup } from "../lib/catalog";
import { STANCE, follow, unfollow, setLike, deletePost, changed, timeAgo } from "../lib/social";
import { confirmDialog, attempt } from "../lib/feedback";

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
  if (!uid || uid === target) return null;
  const following = graph.following.has(target);
  const followsMe = graph.followers.has(target);
  const label = following ? (followsMe ? "Amigos" : "Siguiendo") : followsMe ? "Seguir también" : "Seguir";
  const who = name ? `@${name}` : "esta persona";
  const toggle = async () => {
    // dejar de seguir a un amigo corta la amistad: se confirma
    if (following && followsMe) {
      const ok = await confirmDialog({
        title: `¿Dejar de seguir a ${who}?`,
        body: "Dejan de ser amigos: no vas a ver su portfolio si lo comparte solo con amigos, ni sus recomendaciones privadas.",
        confirmText: "Dejar de seguir",
        danger: true,
      });
      if (!ok) return;
    }
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
      className={"btn btn-" + size + (following ? " btn-line on" : " btn-pink") + " follow-btn"}
      onClick={toggle}
      disabled={busy || !graph.loaded}
      title={following ? "Dejar de seguir" : undefined}
    >
      <i className={following ? (followsMe ? "bi bi-people-fill" : "bi bi-check2") : "bi bi-person-plus"} />
      <span>{label}</span>
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

/* Recomendación: autor, postura, activo con cómo le fue desde que se publicó */
export function PostCard({ post, uid, quote, onChange, highlight = false }) {
  const [busy, setBusy] = useState(false);
  const likes = post.post_likes?.length || 0;
  const liked = post.post_likes?.some((l) => l.user_id === uid);
  const meta = lookup(post.symbol);
  const since = quote && post.price_at ? (quote.price / Number(post.price_at) - 1) * 100 : null;
  // ¿va en la dirección que dijo? (comprar → sube, vender → baja)
  const right = since == null || post.stance === "hold" ? null : post.stance === "buy" ? since >= 0 : since <= 0;

  const like = async () => {
    setBusy(true);
    await attempt(setLike(uid, post.id, !liked), { fail: "No se pudo guardar tu reacción" });
    setBusy(false);
    changed("posts");
    onChange?.();
  };
  const remove = async () => {
    const ok = await confirmDialog({
      title: "¿Borrar esta recomendación?",
      body: `Tu recomendación de ${post.symbol} y sus "me sirve" desaparecen para todos. No se puede deshacer.`,
      confirmText: "Borrar",
      danger: true,
    });
    if (!ok) return;
    if (await attempt(deletePost(post.id), { ok: "Recomendación borrada", fail: "No se pudo borrar la recomendación" })) onChange?.();
  };

  return (
    <article className={"card post" + (highlight ? " hl" : "")}>
      <header className="post-head">
        <Person p={post.author} sub={`@${post.author?.username} · ${timeAgo(post.created_at)}`} />
        {post.audience === "friends" && (
          <span className="aud" title="Solo para amigos">
            <i className="bi bi-people" />
          </span>
        )}
        <StanceTag stance={post.stance} />
      </header>

      <Link to={tickerUrl(post.symbol)} className="post-asset">
        <Logo symbol={post.symbol} size={30} />
        <div>
          <b>{post.symbol}</b>
          <span>{meta?.name || " "}</span>
        </div>
        {since != null && (
          <div className="post-since">
            <small>Desde que lo dijo</small>
            <span className={since >= 0 ? "txt-up" : "txt-down"}>
              {since >= 0 ? "+" : ""}
              {since.toFixed(2)}%
              {right != null && <i className={right ? "bi bi-check2-circle" : "bi bi-x-circle"} />}
            </span>
          </div>
        )}
      </Link>

      <p className="post-body">{post.body}</p>

      <footer className="post-foot">
        <button type="button" className={"react" + (liked ? " on" : "")} onClick={like} disabled={busy || !uid}>
          <i className={liked ? "bi bi-hand-thumbs-up-fill" : "bi bi-hand-thumbs-up"} />
          Me sirve{likes > 0 && <b>{likes}</b>}
        </button>
        {post.user_id === uid && (
          <button type="button" className="react quiet" onClick={remove}>
            <i className="bi bi-trash3" /> Borrar
          </button>
        )}
      </footer>
    </article>
  );
}

/* Feed vacío "fantasma": la forma de los posts que van a aparecer */
export function GhostPosts({ n = 2 }) {
  return (
    <div className="ghost-posts" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card post gh-post">
          <div className="post-head">
            <span className="gh-av" />
            <span className="gh-ln w40" />
            <span className="gh-pill" />
          </div>
          <div className="gh-asset">
            <span className="gh-av sq" />
            <span className="gh-ln w25" />
          </div>
          <span className="gh-ln w90" />
          <span className="gh-ln w60" />
        </div>
      ))}
    </div>
  );
}

/* Aviso para el desarrollador si falta correr la migración de comunidad */
export function SetupNotice({ error }) {
  if (!/column|relation|does not exist|schema cache/i.test(error || "")) return null;
  return (
    <div className="net-notice" role="alert">
      <i className="bi bi-database-exclamation" />
      <div>
        <b>Falta preparar la base para la comunidad.</b>
        <span>
          Corré <code>supabase/migrations/0003_community.sql</code> en Supabase → SQL Editor y recargá.
        </span>
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
