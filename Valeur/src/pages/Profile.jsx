import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Logo from "../components/Logo";
import ProfileModal from "../components/ProfileModal";
import { Avatar, Verified, FollowButton, PostCard, GhostPosts, SetupNotice } from "../components/Social";
import { useAuth } from "../context/AuthContext";
import { useBatch, useMep, assetCurrency, convert, formatDate } from "../lib/market";
import { lookup } from "../lib/catalog";
import {
  VISIBILITY,
  useProfileByUsername,
  useFollowGraph,
  useFollowCounts,
  useSharedPortfolio,
  useFeed,
} from "../lib/social";

/* Paleta de la composición (misma idea que el dashboard) */
const HUES = [230, 300, 150, 30, 190, 60, 340, 100];

const pctTxt = (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

/* Composición y rendimiento a partir de las cantidades escaladas: sin montos.
   Todo se lleva a dólares con el MEP para poder sumar CEDEARs y acciones. */
function useComposition(positions, quotes, mep) {
  return useMemo(() => {
    const rate = mep?.rate;
    const rows = positions.map((p) => {
      const q = quotes[p.symbol];
      const units = Number(p.units);
      const avg = Number(p.avg_cost);
      const price = q?.price ?? avg;
      const cur = assetCurrency(p.symbol);
      const value = convert(units * price, cur, "USD", rate);
      const cost = convert(units * avg, cur, "USD", rate);
      return { ...p, price, value, cost, ret: avg ? (price / avg - 1) * 100 : 0, live: Boolean(q) };
    });
    const total = rows.reduce((s, r) => s + (Number.isFinite(r.value) ? r.value : 0), 0);
    const cost = rows.reduce((s, r) => s + (Number.isFinite(r.cost) ? r.cost : 0), 0);
    return {
      rows: rows
        .map((r) => ({ ...r, weight: total ? (r.value / total) * 100 : 0 }))
        .sort((a, b) => b.weight - a.weight),
      ret: cost ? (total / cost - 1) * 100 : null,
    };
  }, [positions, quotes, mep]);
}

/* Aciertos: recomendaciones de comprar/vender que fueron para el lado que dijo */
function trackRecord(posts, quotes) {
  let n = 0;
  let hits = 0;
  let sum = 0;
  for (const p of posts) {
    const q = quotes[p.symbol];
    if (!q || !p.price_at || p.stance === "hold") continue;
    const move = (q.price / Number(p.price_at) - 1) * 100;
    const signedMove = p.stance === "buy" ? move : -move;
    n += 1;
    sum += signedMove;
    if (signedMove >= 0) hits += 1;
  }
  return n ? { n, hits, avg: sum / n } : null;
}

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id;
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const prof = useProfileByUsername(username);
  const p = prof.data;
  const isMe = p?.id === uid;
  const graph = useFollowGraph(uid);
  const counts = useFollowCounts(p?.id);
  const shared = useSharedPortfolio(p?.id);
  const posts = useFeed({ uid, mode: "all", authorId: p?.id, enabled: Boolean(p?.id) });
  const { quotes } = useBatch([...shared.positions.map((x) => x.symbol), ...posts.data.map((x) => x.symbol)]);
  const fx = useMep();
  const comp = useComposition(shared.positions, quotes, fx.mep);
  const record = trackRecord(posts.data, quotes);

  if (!user) return null;

  if (prof.loaded && !p) {
    return (
      <AppShell>
        <SetupNotice error={prof.error} />
        <section className="page-head">
          <div>
            <h1>
              No encontramos a <em>@{username}</em>.
            </h1>
            <p>Puede que haya cambiado de nombre o que el link esté mal.</p>
          </div>
          <Link to="/comunidad" className="btn btn-line btn-sm">
            <i className="bi bi-arrow-left" /> Volver a la comunidad
          </Link>
        </section>
      </AppShell>
    );
  }

  const vis = VISIBILITY.find(([k]) => k === p?.visibility);
  const canSee = isMe || p?.visibility === "public" || (p?.visibility === "friends" && graph.friends.has(p?.id));
  const followsMe = p && graph.followers.has(p.id);
  const friends = p && graph.friends.has(p.id);

  return (
    <AppShell>
      <section className="card profile-head">
        {p ? (
          <>
            <Avatar name={p.username} size={84} />
            <div className="ph-main">
              <h1>
                {p.display_name || p.username}
                {p.verified && <Verified label={p.verified_label} />}
              </h1>
              <div className="ph-sub">
                <span>@{p.username}</span>
                {p.verified && <span className="tag verified-tag">{p.verified_label}</span>}
                {friends ? (
                  <span className="tag soft">
                    <i className="bi bi-people-fill" /> Son amigos
                  </span>
                ) : (
                  followsMe && <span className="tag soft">Te sigue</span>
                )}
              </div>
              {p.bio && <p className="ph-bio">{p.bio}</p>}
              <div className="ph-counts">
                <span>
                  <b>{counts.followers ?? "—"}</b> {counts.followers === 1 ? "seguidor" : "seguidores"}
                </span>
                <span>
                  <b>{counts.following ?? "—"}</b> siguiendo
                </span>
                <span className="muted">
                  Desde {new Date(p.created_at).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
            <div className="ph-act">
              {isMe ? (
                <button type="button" className="btn btn-line btn-sm" onClick={() => setEdit(true)}>
                  <i className="bi bi-pencil" /> Editar perfil
                </button>
              ) : (
                <FollowButton uid={uid} target={p.id} graph={graph} name={p.username} />
              )}
            </div>
          </>
        ) : (
          <div className="ph-loading loading-box" />
        )}
      </section>

      <section className="profile-grid">
        <div className="profile-main">
          {/* Portfolio */}
          <div className="card pf-share">
            <div className="side-head">
              <h3>
                <i className="bi bi-pie-chart" /> Portfolio
              </h3>
              {vis && (
                <span className="tag soft">
                  <i className={"bi " + vis[2]} /> {vis[1]}
                </span>
              )}
            </div>

            {canSee && comp.rows.length > 0 ? (
              <>
                <div className="pf-ret">
                  <div>
                    <small>Rendimiento total</small>
                    <b className={comp.ret >= 0 ? "txt-up" : "txt-down"}>{comp.ret == null ? "—" : pctTxt(comp.ret)}</b>
                  </div>
                  <div>
                    <small>Activos</small>
                    <b>{comp.rows.length}</b>
                  </div>
                </div>
                <div className="alloc-bar">
                  {comp.rows.map((r, i) => (
                    <span key={r.symbol} style={{ flex: Math.max(r.weight, 0.5), background: `oklch(0.62 0.16 ${HUES[i % HUES.length]})` }} title={`${r.symbol} ${r.weight.toFixed(1)}%`} />
                  ))}
                </div>
                <ul className="share-list">
                  {comp.rows.map((r, i) => (
                    <li key={r.symbol}>
                      <span className="dot" style={{ background: `oklch(0.62 0.16 ${HUES[i % HUES.length]})` }} />
                      <Link to={`/tickersearch?symbol=${encodeURIComponent(r.symbol)}`} className="share-id">
                        <Logo symbol={r.symbol} size={28} />
                        <div>
                          <b>{r.symbol}</b>
                          <span>{r.name || lookup(r.symbol)?.name || " "}</span>
                        </div>
                      </Link>
                      <span className="w">{r.weight.toFixed(1)}%</span>
                      <span className={"r " + (r.ret >= 0 ? "txt-up" : "txt-down")}>{pctTxt(r.ret)}</span>
                    </li>
                  ))}
                </ul>
                <p className="muted small foot-note">
                  <i className="bi bi-shield-lock" /> Sin montos: solo proporciones y rendimiento desde que compró.
                </p>
              </>
            ) : (
              <div className="pf-locked">
                <div className="gh-alloc" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="pf-locked-msg">
                  <i className={canSee ? "bi bi-inbox" : "bi bi-lock"} />
                  <b>
                    {!shared.loaded && canSee
                      ? "Cargando…"
                      : canSee
                        ? isMe
                          ? "Todavía no cargaste operaciones"
                          : "Todavía no cargó operaciones"
                        : p?.visibility === "friends"
                          ? "Solo lo ven sus amigos"
                          : "Portfolio privado"}
                  </b>
                  {!canSee && p?.visibility === "friends" && <span>Si se siguen mutuamente, lo vas a poder ver.</span>}
                  {isMe && !comp.rows.length && (
                    <Link to="/dashboard" className="btn btn-line btn-sm">
                      Ir a mi portfolio
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Últimas operaciones */}
          {canSee && shared.trades.length > 0 && (
            <div className="card side-card">
              <div className="side-head">
                <h3>
                  <i className="bi bi-clock-history" /> Últimos movimientos
                </h3>
              </div>
              <ul className="moves">
                {shared.trades.map((t, i) => (
                  <li key={i} className={t.side}>
                    <span className="side-ic">
                      <i className={t.side === "buy" ? "bi bi-plus-lg" : "bi bi-dash-lg"} />
                    </span>
                    <span>
                      {t.side === "buy" ? "Compró" : "Vendió"}{" "}
                      <Link to={`/tickersearch?symbol=${encodeURIComponent(t.symbol)}`}>
                        <b>{t.symbol}</b>
                      </Link>
                    </span>
                    <small>{formatDate(t.executed_at)}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recomendaciones */}
        <div className="profile-posts">
          <div className="sec-head">
            <div className="sec-title">
              <h2>Recomendaciones</h2>
              {posts.data.length > 0 && <span className="sub">{posts.data.length} publicadas</span>}
            </div>
          </div>
          {record && (
            <div className="card record">
              <div>
                <small>Aciertos</small>
                <b>
                  {record.hits}/{record.n}
                </b>
              </div>
              <div>
                <small>Movimiento a favor, promedio</small>
                <b className={record.avg >= 0 ? "txt-up" : "txt-down"}>{pctTxt(record.avg)}</b>
              </div>
            </div>
          )}
          {posts.data.length ? (
            <div className="post-list">
              {posts.data.map((post) => (
                <PostCard key={post.id} post={post} uid={uid} quote={quotes[post.symbol]} />
              ))}
            </div>
          ) : (
            <GhostPosts n={2} />
          )}
        </div>
      </section>

      {isMe && <ProfileModal open={edit} uid={uid} profile={p} onClose={() => setEdit(false)} />}
    </AppShell>
  );
}
