import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Logo from "../components/Logo";
import ProfileModal from "../components/ProfileModal";
import RecommendModal from "../components/PostComposer";
import Pill from "../components/Pill";
import { SkPosts, SkList } from "../components/Skeleton";
import { SectionNav, SectionHead } from "../components/Sections";
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

const pctTxt = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2).replace(".", ",") + "%";

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
  const [edit, setEdit] = useState(null);
  const [writing, setWriting] = useState(false);

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
            <span className="kicker">Perfil</span>
            <h1>
              No encontramos a <em>@{username}</em>.
            </h1>
            <p>Puede que haya cambiado de nombre o que el link esté mal.</p>
          </div>
          <Link to="/comunidad#personas" className="btn btn-line">
            <i className="bi bi-arrow-left" /> Buscar en la comunidad
          </Link>
        </section>
      </AppShell>
    );
  }

  const vis = VISIBILITY.find(([k]) => k === p?.visibility);
  const canSee = isMe || p?.visibility === "public" || (p?.visibility === "friends" && graph.friends.has(p?.id));
  const since = p && new Date(p.created_at).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <AppShell>
      <SetupNotice error={prof.error || posts.error} />

      {/* mismo encabezado que el activo: la vuelta arriba, avatar y nombre
          como título, pastillas abajo; a la derecha la bio y qué hacer */}
      <section className="page-head ad-head up-head">
        <div className="ad-id">
          <span className="kicker ad-kicker">
            <Link to="/comunidad">
              <i className="bi bi-arrow-left" /> Comunidad
            </Link>
            {p?.verified && p.verified_label && <span>{p.verified_label}</span>}
            {since && <span>Desde {since}</span>}
          </span>
          <div className="ad-title">
            {p ? <Avatar name={p.username} size={44} /> : <span className="gh-av" />}
            <h1>
              {p ? p.display_name || p.username : <span className="ph-line" />}
              {p && (
                <small>
                  @{p.username}
                  {p.verified && <Verified label={p.verified_label} />}
                </small>
              )}
            </h1>
          </div>
          {p && (
            <div className="hpills">
              <Pill label={counts.followers === 1 ? "Seguidor" : "Seguidores"} value={counts.followers ?? "—"} />
              <Pill label="Siguiendo" value={counts.following ?? "—"} />
              {record && <Pill to="#recomendaciones" label="Aciertos" value={`${record.hits} de ${record.n}`} delta={record.avg} />}
              {vis && <Pill to="#portfolio" icon={vis[2]} label="Portfolio" value={vis[1]} />}
            </div>
          )}
        </div>

        <div className="ad-quote up-side">
          {p?.bio ? (
            <p className="up-bio">{p.bio}</p>
          ) : (
            isMe && (
              <button type="button" className="lnk-btn up-bio" onClick={() => setEdit("bio")}>
                <i className="bi bi-plus" /> Sumá una bio para que sepan quién sos
              </button>
            )
          )}
          {p && (
            <div className="ad-acts">
              {isMe ? (
                <>
                  <button type="button" className="btn btn-line" onClick={() => setEdit("all")}>
                    <i className="bi bi-pencil" /> Editar perfil
                  </button>
                  <button type="button" className="btn btn-pink" onClick={() => setWriting(true)}>
                    <i className="bi bi-chat-square-quote" /> Recomendar
                  </button>
                </>
              ) : (
                <FollowButton uid={uid} target={p.id} graph={graph} size={null} name={p.username} />
              )}
            </div>
          )}
        </div>
      </section>

      <SectionNav
        items={[
          ["portfolio", "Portfolio", "bi-pie-chart"],
          ["recomendaciones", "Recomendaciones", "bi-chat-square-quote"],
        ]}
      />

      {/* Portfolio: proporciones y rendimiento, nunca montos */}
      <section id="portfolio" className="block">
        <SectionHead kicker="Cartera" title="Portfolio" desc="Sin montos: qué tiene, cuánto pesa cada cosa y cómo le va desde que compró.">
          {vis && (
            <span className="tag soft">
              <i className={"bi " + vis[2]} /> {vis[1]}
            </span>
          )}
        </SectionHead>

        {!p || (canSee && !shared.loaded) ? (
          <SkList n={3} />
        ) : canSee && comp.rows.length > 0 ? (
          <div className={"up-pf" + (shared.trades.length ? "" : " solo")}>
            <div className="card pf-share">
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
                    <span className="w">{r.weight.toFixed(1).replace(".", ",")}%</span>
                    <span className={"r " + (r.ret >= 0 ? "txt-up" : "txt-down")}>{pctTxt(r.ret)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {shared.trades.length > 0 && (
              <div className="card up-moves">
                <span className="up-lbl">Últimos movimientos</span>
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
        ) : (
          <div className="up-locked">
            <div className="gh-alloc" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="up-locked-msg">
              <i className={canSee ? "bi bi-inbox" : "bi bi-lock"} />
              <span>
                <b>
                  {canSee
                      ? isMe
                        ? "Todavía no cargaste operaciones"
                        : "Todavía no cargó operaciones"
                      : p.visibility === "friends"
                        ? "Solo lo ven sus amigos"
                        : "Portfolio privado"}
                </b>
                {p && !canSee && p.visibility === "friends" && <small>Si se siguen mutuamente, lo vas a poder ver.</small>}
                {p && !canSee && p.visibility === "private" && <small>Eligió no mostrarlo. Sus recomendaciones sí las ves.</small>}
              </span>
              {isMe && !comp.rows.length && shared.loaded && (
                <Link to="/dashboard?operar=1" className="btn btn-line">
                  Registrar una operación
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Recomendaciones, como en la comunidad */}
      <section id="recomendaciones" className="block">
        <SectionHead
          kicker="Jugadas"
          title="Recomendaciones"
          desc={
            record
              ? `${record.hits} de ${record.n} fueron para el lado que ${isMe ? "dijiste" : "dijo"}, con ${pctTxt(record.avg)} a favor en promedio.`
              : posts.data.length
                ? `${posts.data.length} ${posts.data.length === 1 ? "publicada" : "publicadas"}, con cómo le fue a cada una desde ese día.`
                : isMe
                  ? "Lo que recomiendes va a aparecer acá, con cómo le fue desde ese día."
                  : "Todavía no recomendó nada."
          }
        />
        {!posts.loaded ? (
          <SkPosts n={3} />
        ) : posts.data.length ? (
          <div className="feed-grid">
            {posts.data.map((post) => (
              <PostCard key={post.id} post={post} uid={uid} quote={quotes[post.symbol]} />
            ))}
          </div>
        ) : (
          <GhostPosts n={3} />
        )}
      </section>

      {isMe && writing && <RecommendModal uid={uid} onClose={() => setWriting(false)} />}
      {isMe && <ProfileModal open={Boolean(edit)} uid={uid} profile={p} focus={edit === "all" ? null : edit} onClose={() => setEdit(null)} />}
    </AppShell>
  );
}
