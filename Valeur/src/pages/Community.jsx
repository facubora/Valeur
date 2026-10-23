import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Pill from "../components/Pill";
import RecommendModal from "../components/PostComposer";
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
  unfollow,
} from "../lib/social";

/* Qué ve el resto con cada opción de privacidad */
const VIS_HINT = {
  private: "Solo vos. Tus recomendaciones siguen siendo públicas.",
  friends: "Los que seguís y te siguen ven % y rendimiento.",
  public: "Cualquiera ve % y rendimiento. Nunca los montos.",
};

const FEED_TABS = [
  ["following", "Siguiendo"],
  ["all", "Todos"],
  ["verified", "Verificados"],
];

function VisibilitySeg({ value, onChange, disabled }) {
  return (
    <div
      className="vx-tabs sm vis-tabs"
      role="radiogroup"
      aria-label="Quién ve tu portfolio"
      style={{ "--n": VISIBILITY.length, "--i": Math.max(0, VISIBILITY.findIndex(([k]) => k === value)) }}
    >
      <span className="vx-tabs-thumb" aria-hidden="true" />
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

/* Pestañas chicas con ficha deslizante: [[clave, texto, clase?]] */
function Tabs({ items, value, onChange, label, className = "" }) {
  return (
    <div
      className={"vx-tabs sm " + className}
      role="tablist"
      aria-label={label}
      style={{ "--n": items.length, "--i": Math.max(0, items.findIndex(([k]) => k === value)) }}
    >
      <span className="vx-tabs-thumb" aria-hidden="true" />
      {items.map(([k, text, cls = ""]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} className={(value === k ? "on " : "") + cls} onClick={() => onChange(k)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/* Alguien que seguís, en una fila. Dejar de seguir a un amigo corta la
   amistad: se confirma ahí mismo, en la fila */
function PersonRow({ p, uid, graph }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const friend = graph.followers.has(p.id);
  const stop = async () => {
    setAsking(false);
    setBusy(true);
    await attempt(unfollow(uid, p.id), {
      ok: `Dejaste de seguir a @${p.username}`,
      fail: "No se pudo dejar de seguir",
    });
    setBusy(false);
  };

  if (asking) {
    return (
      <li className="pr-ask" onKeyDown={(e) => e.key === "Escape" && setAsking(false)}>
        <Avatar name={p.username} size={36} />
        <span className="pr-ask-txt">
          <b>¿Dejar de seguir a @{p.username}?</b>
          <small>Dejan de ser amigos: no vas a ver su portfolio si es solo para amigos.</small>
        </span>
        <div>
          <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setAsking(false)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={stop}>
            Dejar de seguir
          </button>
        </div>
      </li>
    );
  }
  return (
    <li className="pr-row">
      <Link to={`/u/${p.username}`} className="pr-id">
        <Avatar name={p.username} size={36} />
        <span>
          <b>
            {p.display_name || p.username}
            {p.verified && <Verified label={p.verified_label} />}
          </b>
          <small>
            @{p.username}
            {p.bio ? ` · ${p.bio}` : ""}
          </small>
        </span>
      </Link>
      <button
        type="button"
        className={"pr-state" + (friend ? " friend" : "")}
        onClick={() => (friend ? setAsking(true) : stop())}
        disabled={busy}
        title="Dejar de seguir"
      >
        <i className={friend ? "bi bi-people-fill" : "bi bi-check2"} />
        <span className="pr-now">{friend ? "Amigos" : "Siguiendo"}</span>
        <span className="pr-off">Dejar de seguir</span>
      </button>
    </li>
  );
}

function PeopleSearch({ uid, graph }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const { rows, loading } = usePeopleSearch(q);
  const open = focus && q.trim().length >= 2;
  return (
    <div className="people-search" onFocus={() => setFocus(true)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocus(false)}>
      <div className="search-form filter-in">
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
  // escribir una recomendación (también se abre con ?publicar=1)
  const [writing, setWriting] = useState(() => params.has("publicar"));
  const [savingVis, setSavingVis] = useState(false);
  const [pendingVis, setPendingVis] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const profile = useMyProfile(uid);
  const me = profile.data;
  const fecha = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const today = fecha.charAt(0).toUpperCase() + fecha.slice(1);
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

  const applyVisibility = async (v) => {
    setPendingVis(null);
    setSavingVis(true);
    const label = VISIBILITY.find(([k]) => k === v)?.[1].toLowerCase();
    await attempt(updateProfile(uid, { visibility: v }), { ok: `Tu portfolio ahora es ${label === "amigos" ? "solo para amigos" : label}`, fail: "No se pudo cambiar la privacidad" });
    setSavingVis(false);
  };
  // desde el paso de "Para arrancar" se confirma con el diálogo de siempre
  const setVisibility = async (v) => {
    if (await confirmVisibility(v, me?.visibility)) applyVisibility(v);
  };
  // en el carnet: abrir el portfolio se confirma ahí mismo, debajo de las opciones
  const pickVisibility = (v) => (v === "private" ? applyVisibility(v) : setPendingVis(v));

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
        <button type="button" className="btn btn-line btn-sm" onClick={() => setWriting(true)}>
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
          <span className="kicker">{today}</span>
          <h1>
            La <em>comunidad</em>.
          </h1>
          {graph.loaded && (
            <div className="hpills" aria-label="Tu comunidad en cifras">
              <Pill to="#personas" label="Seguís" value={graph.following.size} />
              <Pill to="#perfil" label="Te siguen" value={counts.followers ?? graph.followers.size} />
              <Pill to="#perfil" label={graph.friends.size === 1 ? "Amigo" : "Amigos"} value={graph.friends.size} />
              {me && (
                <Pill to="#perfil" icon={VISIBILITY.find(([k]) => k === me.visibility)?.[2]} label="Portfolio" value={VISIBILITY.find(([k]) => k === me.visibility)?.[1]} />
              )}
            </div>
          )}
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
          <Tabs items={FEED_TABS} value={tab} onChange={setTab} label="Qué mostrar" />
        </SectionHead>

        <button type="button" className="rc-open" onClick={() => setWriting(true)}>
          <i className="bi bi-pencil" />
          <span>¿Qué activo recomendás hoy?</span>
          <b>Recomendar</b>
        </button>

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
            <Tabs
              items={[["all", "Todas"], ...STANCES.map(([k, label]) => [k, label, k])]}
              value={stanceFilter}
              onChange={setStanceFilter}
              label="Filtrar por postura"
              className="stance-tabs"
            />
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
        <SectionHead
          kicker="Personas"
          title="A quién seguir"
          desc={
            suggested.loaded && !suggested.rows.length
              ? "Ya seguís a todos los perfiles públicos. Buscá a alguien por su usuario arriba."
              : "Verificados y perfiles públicos. Si se siguen mutuamente, son amigos y ven su portfolio."
          }
        />
        {suggested.rows.length ? (
          <div className="people-grid">
            {suggested.rows.map((p) => (
              <PersonCard key={p.id} p={p} uid={uid} graph={graph} />
            ))}
          </div>
        ) : (
          <div className="people-grid" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card person-card gh-person">
                <div className="pc-id">
                  <span className="gh-av" />
                  <span className="gh-ln w60" />
                </div>
                <span className="gh-ln w90" />
                <span className="gh-ln w40" />
              </div>
            ))}
          </div>
        )}

        {following.data.length > 0 && (
          <div className="pr-block">
            <h3 className="sub-title">
              Seguís a {following.data.length} {following.data.length === 1 ? "persona" : "personas"}
              {graph.friends.size > 0 && <span> · {graph.friends.size === 1 ? "1 amigo" : `${graph.friends.size} amigos`}</span>}
            </h3>
            <ul className="card pr-list">
              {following.data.map((p) => (
                <PersonRow key={p.id} p={p} uid={uid} graph={graph} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <section id="perfil" className="block">
        <SectionHead kicker="Vos" title="Tu perfil" desc="Cómo te ven los demás y quién puede ver tu portfolio." />
        <div className="card carnet">
          <div className="cn-id">
            <div className="cn-who">
              <Avatar name={user.username} size={58} />
              <div>
                <b>
                  {me?.display_name || user.username}
                  {me?.verified && <Verified label={me.verified_label} />}
                </b>
                <span>@{user.username}</span>
              </div>
            </div>
            {me?.bio ? <p className="cn-bio">{me.bio}</p> : <p className="cn-bio muted">Todavía no escribiste una bio.</p>}
            <dl className="cn-stats">
              {[
                [counts.followers, counts.followers === 1 ? "seguidor" : "seguidores"],
                [counts.following, "siguiendo"],
                [graph.loaded ? graph.friends.size : null, graph.friends.size === 1 ? "amigo" : "amigos"],
              ].map(([n, label]) => (
                <div key={label}>
                  <dd>{n ?? "—"}</dd>
                  <dt>{label}</dt>
                </div>
              ))}
            </dl>
            <div className="cn-btns">
              <button type="button" className="btn btn-line btn-sm" onClick={() => setEdit("all")} disabled={!me}>
                <i className="bi bi-pencil" /> Editar
              </button>
              <Link to={`/u/${user.username}`} className="btn btn-line btn-sm">
                Ver perfil público
              </Link>
            </div>
          </div>

          <div className="cn-side">
            <span className="cn-lbl">¿Quién ve tu portfolio?</span>
            <div className="cn-vis" role="radiogroup" aria-label="Quién ve tu portfolio">
              {VISIBILITY.map(([k, label, icon]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={me?.visibility === k}
                  className={(me?.visibility === k ? "on" : "") + (pendingVis === k ? " pending" : "")}
                  disabled={!me || savingVis}
                  onClick={() => (me?.visibility === k ? setPendingVis(null) : pickVisibility(k))}
                >
                  <i className={"bi " + icon} />
                  <b>{label}</b>
                  <small>{VIS_HINT[k]}</small>
                </button>
              ))}
            </div>
            {pendingVis && (
              <div className="cn-confirm" onKeyDown={(e) => e.key === "Escape" && setPendingVis(null)}>
                <span>
                  <b>{pendingVis === "public" ? "¿Hacer público tu portfolio?" : "¿Compartirlo con tus amigos?"}</b>
                  {pendingVis === "public"
                    ? " Cualquiera en Valeur va a ver qué tenés y cómo te va, en %. Nunca los montos."
                    : " Los que se siguen con vos van a ver qué tenés y cómo te va, en %. Nunca los montos."}
                </span>
                <div>
                  <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setPendingVis(null)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-pink btn-sm" onClick={() => applyVisibility(pendingVis)}>
                    {pendingVis === "public" ? "Hacerlo público" : "Compartir"}
                  </button>
                </div>
              </div>
            )}
            {me && !me.verified && (
              <div className="cn-verify">
                <i className="bi bi-patch-check" />
                <span>
                  <b>¿Sos analista o creador?</b> Pedí el verificado y aparecé en "A quién seguir".
                </span>
                <button type="button" className="btn btn-line btn-sm" onClick={() => setEdit("verify")}>
                  Pedirlo
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {writing && (
        <RecommendModal
          uid={uid}
          onClose={() => {
            setWriting(false);
            if (params.has("publicar")) setParams({}, { replace: true });
          }}
          onDone={() => setTab("following")}
        />
      )}

      <ProfileModal open={Boolean(edit)} uid={uid} profile={me} focus={edit === "all" ? null : edit} onClose={() => setEdit(null)} />
    </AppShell>
  );
}
