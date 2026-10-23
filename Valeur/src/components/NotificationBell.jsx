import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import AlertEditor from "./AlertEditor";
import { Avatar } from "./Social";
import { timeAgo } from "../lib/social";
import { useAlerts } from "../lib/alerts";
import { attempt } from "../lib/feedback";
import { BrowserNotifyAsk } from "./AlertRows";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ICON = {
  alert: "bi-bell-fill",
  follow: "bi-person-plus-fill",
  post: "bi-chat-square-quote-fill",
  like: "bi-hand-thumbs-up-fill",
  verified: "bi-patch-check-fill",
};

/* Las alertas de precio son "tu plata"; seguidores, recomendaciones, likes y
   verificación, "comunidad" */
const TABS = [
  ["all", "Todas"],
  ["money", "Tu plata"],
  ["social", "Comunidad"],
];
const tabOf = (n) => (n.kind === "alert" ? "money" : "social");

/* Qué te avisa cada pestaña: se muestra cuando no hay nada */
const WHY = {
  money: [["bi-bell", "Salta una de tus alertas de precio", "Llegó al precio o se movió fuerte en el día"]],
  social: [
    ["bi-person-plus", "Alguien empieza a seguirte", "Si vos también lo seguís, pasan a ser amigos"],
    ["bi-chat-square-quote", "Alguien que seguís recomienda un activo", "Comprar, vender o mantener, con su porqué"],
    ["bi-hand-thumbs-up", "A alguien le sirve tu recomendación", ""],
  ],
};
WHY.all = [...WHY.money, ...WHY.social.slice(0, 2)];
const GO = {
  money: ["/tickersearch", "Crear una alerta en el Mercado"],
  social: ["/comunidad", "Buscar gente para seguir"],
};

/* Hoy, Ayer, Esta semana o Antes, por día calendario */
function dayGroup(ts) {
  const d = new Date(ts);
  const now = new Date();
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5,
  );
  return days <= 0 ? "Hoy" : days === 1 ? "Ayer" : days < 7 ? "Esta semana" : "Antes";
}

/* El @usuario del título resaltado */
const Title = ({ text }) =>
  text.split(/(@[\w.]+)/).map((part, i) => (part.startsWith("@") ? <em key={i}>{part}</em> : part));

/* Lo que encabeza la fila: el logo del activo, la cara de quien lo hizo o el
   ícono, con el tipo en una medallita */
function Lead({ n }) {
  const who = n.title.match(/@([\w.]+)/)?.[1];
  return (
    <span className={"nf-lead " + n.kind}>
      {n.symbol && n.kind !== "follow" ? (
        <Logo symbol={n.symbol} size={36} />
      ) : who ? (
        <Avatar name={who} size={36} />
      ) : (
        <span className="nf-ic">
          <i className={"bi " + (ICON[n.kind] || "bi-bell")} />
        </span>
      )}
      {(n.symbol || who) && (
        <span className="nf-kind">
          <i className={"bi " + (ICON[n.kind] || "bi-bell")} />
        </span>
      )}
    </span>
  );
}

/* La alerta que disparó un aviso: la de ese activo que saltó más cerca de la
   hora del aviso (o la última de ese activo, si se editó después) */
function alertFor(n, alerts) {
  const same = alerts.filter((a) => a.symbol === n.symbol);
  const t = new Date(n.created_at).getTime();
  const gap = (a) => (a.triggered_at ? Math.abs(new Date(a.triggered_at).getTime() - t) : Infinity);
  return same.sort((a, b) => gap(a) - gap(b))[0] || null;
}

/* Una notificación. Al pasar el mouse: borrarla y, si es de una alerta,
   editar esa alerta ahí mismo (o crear otra si ya no está). */
function NotifRow({ n, uid, alerts, onOpen, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [out, setOut] = useState(false);
  const isAlert = n.kind === "alert" && n.symbol;
  const alert = isAlert ? alertFor(n, alerts) : null;

  const del = async () => {
    setOut(true);
    await wait(280);
    if (!(await attempt(onRemove([n.id]), { fail: "No se pudo borrar la notificación" }))) setOut(false);
  };

  return (
    <li className={"nf-li" + (out ? " out" : "") + (editing ? " editing" : "")}>
      <button type="button" className={"nf-row" + (n.read_at ? "" : " new")} onClick={() => onOpen(n)}>
        <Lead n={n} />
        <span className="nf-txt">
          <b>
            <Title text={n.title} />
          </b>
          {n.body && <span>{n.body}</span>}
        </span>
        <small>
          {timeAgo(n.created_at)}
          {!n.read_at && <span className="nf-dot" aria-label="sin leer" />}
        </small>
      </button>
      <span className="nf-acts">
        {isAlert && (
          <button
            type="button"
            className={editing ? "on" : ""}
            onClick={() => setEditing((e) => !e)}
            aria-expanded={editing}
            title={alert ? "Editar la alerta" : "Crear otra alerta"}
            aria-label={alert ? `Editar la alerta de ${n.symbol}` : `Crear otra alerta de ${n.symbol}`}
          >
            <i className={alert ? "bi bi-pencil" : "bi bi-bell"} />
          </button>
        )}
        <button type="button" className="danger" onClick={del} title="Borrar notificación" aria-label="Borrar notificación">
          <i className="bi bi-x-lg" />
        </button>
      </span>
      {editing && (
        <div className="nf-edit">
          <p>
            {alert ? (
              <>
                Alerta de <b>{n.symbol}</b> · {alert.active ? "vigilando" : "ya avisó, guardala para volver a vigilar"}
              </>
            ) : (
              <>
                La alerta de <b>{n.symbol}</b> ya no está. Creá otra:
              </>
            )}
          </p>
          <AlertEditor
            key={alert?.id || "new"}
            uid={uid}
            symbol={n.symbol}
            alert={alert}
            existing={alerts}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </li>
  );
}

/* Campanita del header: abre las notificaciones en el recuadro de la barra.
   Los datos (useNotifications) y el vigía de alertas viven en AppShell. */
export function BellButton({ unread, open, onClick }) {
  return (
    <button
      type="button"
      className={"icon-btn bell" + (unread ? " has" : "") + (open ? " on" : "")}
      aria-label={unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
      aria-expanded={open}
      aria-controls="vx-drawer"
      onClick={onClick}
    >
      <i className={unread ? "bi bi-bell-fill" : "bi bi-bell"} />
      {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
    </button>
  );
}

/* Notificaciones: pestañas por tipo, agrupadas por día; sin nada, explica
   qué te va a avisar */
export function NotificationsPanel({ rows, markRead, remove, uid, onGo }) {
  const [tab, setTab] = useState("all");
  const [clearing, setClearing] = useState(false);
  const navigate = useNavigate();
  const alerts = useAlerts(uid).data;

  const shown = rows.filter((n) => tab === "all" || tabOf(n) === tab);
  const unreadIn = (t) => rows.filter((n) => !n.read_at && (t === "all" || tabOf(n) === t)).length;
  const unread = unreadIn(tab);
  const groups = [];
  for (const n of shown) {
    const g = dayGroup(n.created_at);
    if (groups.at(-1)?.[0] !== g) groups.push([g, []]);
    groups.at(-1)[1].push(n);
  }

  const go = (n) => {
    if (!n.read_at) markRead([n.id]);
    onGo?.();
    if (n.link) navigate(n.link);
  };
  const readAll = () => markRead(tab === "all" ? undefined : shown.filter((n) => !n.read_at).map((n) => n.id));
  const read = shown.filter((n) => n.read_at);
  // borrar las leídas de la pestaña: el primer toque pregunta, el segundo borra
  const clearRead = async () => {
    if (!clearing) return setClearing(true);
    setClearing(false);
    await attempt(remove(read.map((n) => n.id)), { fail: "No se pudieron borrar las notificaciones" });
  };

  return (
    <div className="nf" role="region" aria-label="Notificaciones">
      <div className="nf-head">
        <b>Notificaciones</b>
        <span className="nf-head-acts">
          {unread > 0 ? (
            <button type="button" className="lnk-btn" onClick={readAll}>
              <i className="bi bi-check2-all" /> Marcar leídas
            </button>
          ) : (
            read.length > 0 && (
              <button type="button" className={"lnk-btn nf-clear" + (clearing ? " sure" : "")} onClick={clearRead} onBlur={() => setClearing(false)}>
                <i className="bi bi-trash3" /> {clearing ? `¿Borrar ${read.length === 1 ? "la leída" : `las ${read.length}`}? Sí` : "Borrar leídas"}
              </button>
            )
          )}
        </span>
      </div>
      <div
        className="vx-tabs sm nf-tabs"
        role="tablist"
        aria-label="Tipo de notificación"
        style={{ "--n": TABS.length, "--i": TABS.findIndex(([k]) => k === tab) }}
      >
        <span className="vx-tabs-thumb" aria-hidden="true" />
        {TABS.map(([k, label]) => {
          const c = unreadIn(k);
          return (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => {
                setTab(k);
                setClearing(false);
              }}>
              {label}
              {c > 0 && <span className="nf-count">{c > 9 ? "9+" : c}</span>}
            </button>
          );
        })}
      </div>

      {shown.length ? (
        <div className="nf-scroll">
          {groups.map(([g, list]) => (
            <section key={g} className="nf-group">
              <h4>{g}</h4>
              <ul>
                {list.map((n) => (
                  <NotifRow key={n.id} n={n} uid={uid} alerts={alerts} onOpen={go} onRemove={remove} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="nf-empty">
          <p>
            {tab === "money"
              ? "Todavía no saltó ninguna alerta. Te avisamos acá cuando:"
              : tab === "social"
                ? "Nada de la comunidad por ahora. Te avisamos acá cuando:"
                : "Todavía no tenés notificaciones. Te avisamos acá cuando:"}
          </p>
          <ul>
            {WHY[tab].map(([icon, what, more]) => (
              <li key={what}>
                <span className="gh-box">
                  <i className={"bi " + icon} />
                </span>
                <span>
                  <b>{what}</b>
                  {more && <small>{more}</small>}
                </span>
              </li>
            ))}
          </ul>
          {GO[tab] && (
            <Link to={GO[tab][0]} className="nf-go" onClick={onGo}>
              {GO[tab][1]} <i className="bi bi-arrow-right" />
            </Link>
          )}
        </div>
      )}

      <div className="nf-foot">
        <BrowserNotifyAsk />
      </div>
    </div>
  );
}
