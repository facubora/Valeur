import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import PostComposer from "../components/PostComposer";
import ProfileModal from "../components/ProfileModal";
import { Avatar, Verified, Person, PersonCard, FollowButton, PostCard, GhostPosts, SetupNotice } from "../components/Social";
import { SectionNav, SectionHead } from "../components/Sections";
import { attempt } from "../lib/feedback";
import { useAuth } from "../context/AuthContext";
import { useBatch } from "../lib/market";
import {
  VISIBILITY,
  STANCES,
  useMyProfile,
  updateProfile,
  confirmVisibility,
  useFollowGraph,
  useFollowCounts,
  useFeed,
  usePeople,
  usePeopleSearch,
  useSuggestedPeople,
} from "../lib/social";

const FEED_TABS = [
  ["following", "Siguiendo"],
  ["all", "Todos"],
  ["verified", "Verificados"],
];

function VisibilitySeg({ value, onChange, disabled }) {
  return (
    <div className="seg full vis-seg" role="radiogroup" aria-label="Quién ve tu portfolio">
      {VISIBILITY.map(([k, label, icon]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          className={value === k ? "on" : ""}
          disabled={disabled}
          onClick={() => onChange(k)}
        >
          <i className={"bi " + icon} /> {label}
        </button>
      ))}
    </div>
  );
}

function PeopleSearch({ uid, graph }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const { rows, loading } = usePeopleSearch(q);
  const open = focus && q.trim().length >= 2;
  return (
    <div className="people-search" onFocus={() => setFocus(true)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocus(false)}>
      <div className="search-form compact">
        <i className="bi bi-search ico" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setFocus(false)}
          placeholder="Buscar personas…"
          aria-label="Buscar personas"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {open && (
        <div className="people-drop">
          {rows.length ? (
            rows.map((p) => (
              <div key={p.id} className="people-row">
                <Person p={p} size={34} />
                <FollowButton uid={uid} target={p.id} graph={graph} name={p.username} />
              </div>
            ))
          ) : (
            <p className="muted small">{loading ? "Buscando…" : "No encontramos a nadie con ese nombre."}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Community() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id;
  const [params, setParams] = useSearchParams();
  const postId = params.get("post");
  const [tab, setTab] = useState("following");
  const [stanceFilter, setStanceFilter] = useState("all");
  const [symFilter, setSymFilter] = useState("");
  const [edit, setEdit] = useState(null); // null | "privacy" | "interests" | "verify" | "all"
  const [composerKey, setComposerKey] = useState(0);
  const [savingVis, setSavingVis] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const profile = useMyProfile(uid);
  const me = profile.data;
  const graph = useFollowGraph(uid);
  const counts = useFollowCounts(uid);
  const feed = useFeed({ uid, mode: tab, following: graph.loaded ? graph.following : null });
  const single = useFeed({ uid, postId, mode: "all", limit: 1, enabled: Boolean(postId) });
  const suggested = useSuggestedPeople(uid, graph.following);
  const following = usePeople(graph.following);

  const highlighted = postId ? single.data[0] : null;
  const posts = feed.data.filter((p) => p.id !== highlighted?.id);
  // filtros del feed: postura y activo (ticker o nombre de quien publica)
  const fq = symFilter.trim().toUpperCase();
  const shown = posts.filter(
    (p) =>
      (stanceFilter === "all" || p.stance === stanceFilter) &&
      (!fq || p.symbol.includes(fq) || (p.author?.username || "").toUpperCase().includes(fq)),
  );
  const filtering = stanceFilter !== "all" || fq;
  const { quotes } = useBatch([...posts, ...(highlighted ? [highlighted] : [])].map((p) => p.symbol));

  const myPosts = useMemo(() => feed.data.filter((p) => p.user_id === uid).length, [feed.data, uid]);
  const starting = graph.loaded && graph.following.size === 0;

  if (!user) return null;

  const setVisibility = async (v) => {
    if (!(await confirmVisibility(v, me?.visibility))) return;
    setSavingVis(true);
    const label = VISIBILITY.find(([k]) => k === v)?.[1].toLowerCase();
    await attempt(updateProfile(uid, { visibility: v }), { ok: `Tu portfolio ahora es ${label === "amigos" ? "solo para amigos" : label}`, fail: "No se pudo cambiar la privacidad" });
    setSavingVis(false);
  };

  const steps = [
    {
      done: graph.following.size > 0,
      title: "Seguí a alguien",
      desc: "Cuando se siguen mutuamente, son amigos.",
      act: (
        <div className="chips">
          {suggested.rows.slice(0, 3).map((p) => (
            <FollowButton key={p.id} uid={uid} target={p.id} graph={graph} name={p.username} />
          ))}
          {!suggested.rows.length && <span className="muted small">Buscá personas arriba</span>}
        </div>
      ),
    },
    {
      done: myPosts > 0,
      title: "Recomendá un activo",
      desc: "Comprar, mantener o vender, y por qué.",
      act: (
        <button type="button" className="btn btn-line btn-sm" onClick={() => setComposerKey((k) => k + 1)}>
          <i className="bi bi-pencil-square" /> Escribir
        </button>
      ),
    },
    {
      done: me && me.visibility !== "private",
      title: "Elegí quién ve tu portfolio",
      desc: "Sin montos: solo % y rendimiento.",
      act: me && <VisibilitySeg value={me.visibility} onChange={setVisibility} disabled={savingVis} />,
    },
  ];

  return (
    <AppShell>
      <section className="page-head">
        <div>
          <h1>
            La <em>comunidad</em>.
          </h1>
          <p>Lo que recomiendan y tienen las personas que seguís.</p>
        </div>
        <PeopleSearch uid={uid} graph={graph} />
      </section>

      <SetupNotice error={profile.error || feed.error} />

      <SectionNav
        items={[
          ["recomendaciones", "Recomendaciones", "bi-chat-square-quote"],
          ["personas", "Personas", "bi-people"],
          ["perfil", "Tu perfil", "bi-person"],
        ]}
      />

      {starting && (
        <div className="onboard">
          <div className="onboard-head">
            <b>Para arrancar</b>
            <div className="onboard-prog">
              <i style={{ width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%` }} />
            </div>
            <small>
              {steps.filter((s) => s.done).length}/{steps.length}
            </small>
          </div>
          <ol className="onboard-steps">
            {steps.map((s) => (
              <li key={s.title} className={s.done ? "done" : ""}>
                <span className="chk">{s.done && <i className="bi bi-check-lg" />}</span>
                <div className="what">
                  <b>{s.title}</b>
                  <span>{s.desc}</span>
                </div>
                <div className="act">{s.act}</div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <section id="recomendaciones" className="block">
        <SectionHead kicker="Feed" title="Recomendaciones" desc="Qué recomiendan comprar, mantener o vender, y cómo les fue desde que lo dijeron.">
          <div className="seg" role="tablist" aria-label="Qué mostrar">
            {FEED_TABS.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>
        </SectionHead>

        <PostComposer key={composerKey} uid={uid} username={user.username} autoOpen={composerKey > 0} onDone={() => setTab("following")} />

        {highlighted && (
          <div className="post-hl">
            <PostCard post={highlighted} uid={uid} quote={quotes[highlighted.symbol]} highlight />
            <button type="button" className="lnk-btn" onClick={() => setParams({})}>
              Cerrar
            </button>
          </div>
        )}

        {posts.length > 0 && (
          <div className="list-filters">
            <div className="seg" role="radiogroup" aria-label="Filtrar por postura">
              {[["all", "Todas"], ...STANCES.map(([k, label]) => [k, label])].map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={stanceFilter === k} className={stanceFilter === k ? "on" : ""} onClick={() => setStanceFilter(k)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="search-form compact filter-in">
              <i className="bi bi-funnel ico" aria-hidden="true" />
              <input value={symFilter} onChange={(e) => setSymFilter(e.target.value)} placeholder="Filtrar por activo o persona" aria-label="Filtrar recomendaciones" />
              {symFilter && (
                <button type="button" className="filter-x" onClick={() => setSymFilter("")} aria-label="Limpiar filtro">
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
            {filtering && (
              <span className="muted small">
                {shown.length} de {posts.length}
              </span>
            )}
          </div>
        )}

        {!feed.loaded ? (
          <GhostPosts n={2} />
        ) : shown.length ? (
          <div className="feed-grid">
            {shown.map((p) => (
              <PostCard key={p.id} post={p} uid={uid} quote={quotes[p.symbol]} />
            ))}
          </div>
        ) : filtering ? (
          <div className="side-empty wide">
            <p>No hay recomendaciones que coincidan con el filtro.</p>
            <button
              type="button"
              className="btn btn-line btn-sm"
              onClick={() => {
                setStanceFilter("all");
                setSymFilter("");
              }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="feed-empty">
            <GhostPosts n={2} />
            {tab !== "all" && (
              <button type="button" className="btn btn-line btn-sm" onClick={() => setTab("all")}>
                Ver lo que recomienda todo Valeur
              </button>
            )}
          </div>
        )}
      </section>

      <section id="personas" className="block">
        <SectionHead kicker="Personas" title="A quién seguir" desc="Verificados y perfiles públicos. Si se siguen mutuamente, son amigos y ven su portfolio." />
        {suggested.rows.length ? (
          <div className="people-grid">
            {suggested.rows.map((p) => (
              <PersonCard key={p.id} p={p} uid={uid} graph={graph} />
            ))}
          </div>
        ) : (
          <div className="side-empty wide">
            <p>{suggested.loaded ? "Ya seguís a todos los perfiles públicos. Buscá a alguien por su usuario." : "Cargando…"}</p>
          </div>
        )}

        {following.data.length > 0 && (
          <>
            <h3 className="sub-title">
              Seguís a {following.data.length} {following.data.length === 1 ? "persona" : "personas"}
              {graph.friends.size > 0 && <span> · {graph.friends.size === 1 ? "1 amigo" : `${graph.friends.size} amigos`}</span>}
            </h3>
            <div className="people-grid compact">
              {following.data.map((p) => (
                <PersonCard key={p.id} p={p} uid={uid} graph={graph} compact />
              ))}
            </div>
          </>
        )}
      </section>

      <section id="perfil" className="block">
        <SectionHead kicker="Vos" title="Tu perfil" desc="Cómo te ven los demás y quién puede ver tu portfolio.">
          <Link to={`/u/${user.username}`} className="btn btn-line btn-sm">
            Ver mi perfil público
          </Link>
          <button type="button" className="btn btn-line btn-sm" onClick={() => setEdit("all")} disabled={!me}>
            <i className="bi bi-pencil" /> Editar
          </button>
        </SectionHead>
        <div className="card me-strip">
          <div className="me-top">
            <Avatar name={user.username} size={56} />
            <div>
              <b>
                {me?.display_name || user.username}
                {me?.verified && <Verified label={me.verified_label} />}
              </b>
              <span>@{user.username}</span>
              {me?.bio && <p className="me-bio">{me.bio}</p>}
            </div>
          </div>
          <div className="me-counts">
            <div>
              <b>{counts.followers ?? "—"}</b>
              <span>{counts.followers === 1 ? "seguidor" : "seguidores"}</span>
            </div>
            <div>
              <b>{counts.following ?? "—"}</b>
              <span>siguiendo</span>
            </div>
            <div>
              <b>{graph.loaded ? graph.friends.size : "—"}</b>
              <span>{graph.friends.size === 1 ? "amigo" : "amigos"}</span>
            </div>
          </div>
          {me && (
            <div className="me-vis">
              <small>Tu portfolio lo ve</small>
              <VisibilitySeg value={me.visibility} onChange={setVisibility} disabled={savingVis} />
              {!me.verified && (
                <button type="button" className="lnk-btn verify-cta" onClick={() => setEdit("verify")}>
                  <i className="bi bi-patch-check" /> ¿Sos analista o creador? Pedí el verificado
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <ProfileModal open={Boolean(edit)} uid={uid} profile={me} focus={edit === "all" ? null : edit} onClose={() => setEdit(null)} />
    </AppShell>
  );
}
