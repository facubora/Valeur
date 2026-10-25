import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Logo from "../components/Logo";
import Pill from "../components/Pill";
import { SkList, SkPosts } from "../components/Skeleton";
import { SectionNav, SectionHead } from "../components/Sections";
import { Avatar, PostCard, SetupNotice } from "../components/Social";
import { useAuth } from "../context/AuthContext";
import { useBatch } from "../lib/market";
import { attempt } from "../lib/feedback";
import {
  VERIFY_CATEGORIES,
  REPORT_REASON,
  useAdminStats,
  useAdminVerifications,
  useAdminReports,
  reviewVerification,
  dismissReports,
  removeReportedPost,
  timeAgo,
} from "../lib/social";

const CATEGORY = Object.fromEntries(VERIFY_CATEGORIES);
const CAT_ICON = {
  analista: "bi-graph-up-arrow",
  asesor: "bi-briefcase",
  broker: "bi-bank",
  creador: "bi-camera-video",
  periodista: "bi-newspaper",
  otro: "bi-three-dots",
};
const num = (n) => (n ?? 0).toLocaleString("es-AR");

/* Panel admin: pedidos de verificado, recomendaciones reportadas y cómo
   viene Valeur. Solo lo ve quien tiene is_admin en su perfil (y la base lo
   vuelve a chequear en cada pedido). */
export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isAdmin;

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    else if (isAdmin === false) navigate("/home", { replace: true });
  }, [authLoading, user, isAdmin, navigate]);

  const stats = useAdminStats(Boolean(isAdmin));
  const verifs = useAdminVerifications(Boolean(isAdmin));
  const reports = useAdminReports(Boolean(isAdmin));
  const s = stats.data;

  return (
    <AppShell>
      <section className="page-head">
        <div>
          <span className="kicker">Solo para admins</span>
          <h1>
            Panel <em>admin</em>.
          </h1>
          {s && (
            <div className="hpills" aria-label="Lo que hay para revisar">
              <Pill to="#verificaciones" icon="bi-patch-check" label="Pedidos" value={num(s.pending_verifications)} />
              <Pill to="#reportes" icon="bi-flag" label="Reportes" value={num(s.open_reports)} />
              <Pill to="#numeros" label="Usuarios" value={num(s.users)} />
              <Pill to="#numeros" label="Nuevos esta semana" value={num(s.users_week)} />
            </div>
          )}
        </div>
      </section>

      <SetupNotice error={stats.error || verifs.error || reports.error} />

      <SectionNav
        items={[
          ["verificaciones", "Verificaciones", "bi-patch-check"],
          ["reportes", "Reportes", "bi-flag"],
          ["numeros", "Números", "bi-bar-chart"],
        ]}
      />

      <section id="verificaciones" className="block">
        <SectionHead kicker="Verificado" title="Pedidos de verificado" desc="Mirá el link y el motivo. Al aprobar, le aparece la insignia y le avisamos; al rechazar, le avisamos que puede volver a pedirlo." />
        {!verifs.loaded ? (
          <SkList n={2} />
        ) : verifs.data.length ? (
          <ul className="adm-list">
            {verifs.data.map((r) => (
              <VerifyRow key={r.id} r={r} />
            ))}
          </ul>
        ) : (
          <GhostRows text="No hay pedidos pendientes" />
        )}
      </section>

      <section id="reportes" className="block">
        <SectionHead kicker="Moderación" title="Recomendaciones reportadas" desc="Las más reportadas arriba. Dejarla cierra los reportes; borrarla la saca para todos." />
        {!reports.loaded ? (
          <SkPosts n={2} />
        ) : reports.groups.length ? (
          <ReportGrid groups={reports.groups} />
        ) : (
          <GhostRows text="Nadie reportó nada" />
        )}
      </section>

      <section id="numeros" className="block">
        <SectionHead kicker="Números" title="Cómo viene Valeur" desc="Cuentas, sin datos de nadie. Se actualiza cada vez que entrás." />
        {!s ? <SkList n={2} /> : <Numbers s={s} />}
      </section>
    </AppShell>
  );
}

/* Un pedido: quién, qué dice que es, el link y el porqué. Rechazar se
   confirma en la misma fila. */
function VerifyRow({ r }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const u = r.user || {};
  const label = CATEGORY[r.category] || "Otro";
  const href = r.link ? (/^https?:\/\//i.test(r.link) ? r.link : "https://" + r.link) : null;

  const review = async (status) => {
    setBusy(true);
    await attempt(reviewVerification(r.id, status), {
      ok: status === "approved" ? `@${u.username} ya está verificado` : "Pedido rechazado",
      fail: "No se pudo guardar",
    });
    setBusy(false);
    setAsking(false);
  };

  return (
    <li className="card adm-vf">
      <div className="adm-vf-who">
        <Link to={`/u/${u.username}`} aria-label={`Perfil de @${u.username}`}>
          <Avatar name={u.username || "?"} size={40} />
        </Link>
        <div>
          <Link to={`/u/${u.username}`} className="adm-name">
            {u.display_name || u.username}
          </Link>
          <small>
            @{u.username} · pidió {timeAgo(r.created_at)}
          </small>
        </div>
        <span className="adm-cat">
          <i className={"bi " + (CAT_ICON[r.category] || "bi-person")} /> {label}
        </span>
      </div>
      <blockquote className="adm-vf-why">{r.reason}</blockquote>
      {href ? (
        <a className="adm-vf-link" href={href} target="_blank" rel="noopener noreferrer">
          <i className="bi bi-box-arrow-up-right" /> {r.link}
        </a>
      ) : (
        <span className="adm-vf-link none">
          <i className="bi bi-link-45deg" /> Sin link
        </span>
      )}
      <div className="adm-acts">
        {asking ? (
          <div className="adm-sure" onKeyDown={(e) => e.key === "Escape" && setAsking(false)}>
            <span>¿Rechazar? Le avisamos que puede volver a pedirlo.</span>
            <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setAsking(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => review("rejected")}>
              Rechazar
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="btn btn-line btn-sm" disabled={busy} onClick={() => setAsking(true)}>
              Rechazar
            </button>
            <button type="button" className="btn btn-pink btn-sm" disabled={busy} onClick={() => review("approved")}>
              <i className="bi bi-patch-check-fill" /> Aprobar como {label}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function ReportGrid({ groups }) {
  const { quotes } = useBatch(groups.map((g) => g.post.symbol));
  return (
    <div className="feed-grid adm-reps">
      {groups.map((g) => (
        <ReportCard key={g.post.id} g={g} quote={quotes[g.post.symbol]} />
      ))}
    </div>
  );
}

/* Una recomendación reportada: la tarjeta como la ve todo el mundo y abajo
   por qué la reportaron y qué hacer */
function ReportCard({ g, quote }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  const keep = async () => {
    setBusy(true);
    await attempt(dismissReports(g.post.id), { ok: "Listo, la recomendación queda", fail: "No se pudo guardar" });
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    await attempt(removeReportedPost(g.post.id), { ok: "Recomendación borrada", fail: "No se pudo borrar" });
    setBusy(false);
  };

  return (
    <div className="adm-rep">
      <PostCard post={{ ...g.post, post_likes: [] }} uid={null} quote={quote} />
      <div className="card adm-rep-foot">
        <div className="adm-reasons">
          <b>
            {g.count} {g.count === 1 ? "reporte" : "reportes"}
          </b>
          {Object.entries(g.reasons).map(([k, n]) => (
            <span key={k} className="adm-reason">
              <i className={"bi " + (REPORT_REASON[k]?.icon || "bi-flag")} /> {REPORT_REASON[k]?.label || k}
              {n > 1 && <em>×{n}</em>}
            </span>
          ))}
        </div>
        <div className="adm-acts">
          {asking ? (
            <div className="adm-sure" onKeyDown={(e) => e.key === "Escape" && setAsking(false)}>
              <span>¿Borrarla para todos?</span>
              <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setAsking(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={remove}>
                <i className="bi bi-trash3" /> Borrar
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="btn btn-line btn-sm" disabled={busy} onClick={keep}>
                Dejarla
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setAsking(true)}>
                <i className="bi bi-trash3" /> Borrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Los números: tarjetas con la cifra, los registros de las últimas 8
   semanas en barritas y qué activos se siguen y se recomiendan más */
function Numbers({ s }) {
  const tiles = [
    ["bi-people", "Usuarios", s.users, `+${num(s.users_week)} esta semana`],
    ["bi-lightning-charge", "Activos esta semana", s.active_week, "cargaron, recomendaron o siguieron algo"],
    ["bi-wallet2", "Con operaciones", s.with_trades, s.users ? `${Math.round((s.with_trades / s.users) * 100)}% de los usuarios` : ""],
    ["bi-chat-square-quote", "Recomendaciones", s.posts, `+${num(s.posts_week)} esta semana`],
    ["bi-hand-thumbs-up", "Me sirve", s.likes, ""],
    ["bi-person-plus", "Seguimientos", s.follows, ""],
    ["bi-bell", "Alertas activas", s.alerts_active, `${num(s.alerts_fired)} avisaron esta semana`],
    ["bi-patch-check", "Verificados", s.verified, ""],
  ];
  const max = Math.max(1, ...(s.signups || []).map((w) => w.n));
  return (
    <>
      <div className="adm-kpis">
        {tiles.map(([icon, label, value, sub]) => (
          <div key={label} className="card adm-kpi">
            <span className="adm-kpi-l">
              <i className={"bi " + icon} /> {label}
            </span>
            <b>{num(value)}</b>
            {sub && <small>{sub}</small>}
          </div>
        ))}
      </div>

      <div className="adm-cols">
        <div className="card adm-weeks">
          <h3 className="sub-title">Registros por semana</h3>
          <div className="adm-bars" role="img" aria-label={(s.signups || []).map((w) => `${w.n} la semana del ${weekLabel(w.week)}`).join(", ")}>
            {(s.signups || []).map((w) => (
              <div key={w.week} className="adm-bar">
                <em>{w.n || ""}</em>
                <i style={{ "--p": w.n / max }} />
                <small>{weekLabel(w.week)}</small>
              </div>
            ))}
          </div>
        </div>
        <TopList title="Lo más seguido" rows={s.top_watched} unit="lo siguen" />
        <TopList title="Lo más recomendado" rows={s.top_recommended} unit="recomendaciones" />
      </div>
    </>
  );
}

function weekLabel(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "");
}

function TopList({ title, rows = [], unit }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="card adm-top">
      <h3 className="sub-title">{title}</h3>
      {rows.length ? (
        <ol>
          {rows.map((r) => (
            <li key={r.symbol}>
              <Logo symbol={r.symbol} size={26} />
              <Link to={`/tickersearch?symbol=${encodeURIComponent(r.symbol)}`}>{r.symbol}</Link>
              <span className="adm-top-bar">
                <i style={{ width: `${(r.n / max) * 100}%` }} />
              </span>
              <b title={`${r.n} ${unit}`}>{num(r.n)}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted small">Todavía nada.</p>
      )}
    </div>
  );
}

/* Vacío punteado: la forma de lo que va a aparecer */
function GhostRows({ text }) {
  return (
    <div className="adm-ghost">
      <div className="card gh-row" aria-hidden="true">
        <span className="gh-av" />
        <span className="gh-ln w40" />
        <span className="gh-pill" />
      </div>
      <p>
        <i className="bi bi-check2-circle" /> {text}
      </p>
    </div>
  );
}
