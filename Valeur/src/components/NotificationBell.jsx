import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { timeAgo } from "../lib/social";
import { BrowserNotifyAsk } from "./AlertsCard";

const ICON = {
  alert: "bi-bell-fill",
  follow: "bi-person-plus-fill",
  post: "bi-chat-square-quote-fill",
  like: "bi-hand-thumbs-up-fill",
  verified: "bi-patch-check-fill",
};

/* Campanita del header: abre las notificaciones en el cajón de la barra.
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

/* Notificaciones dentro del cajón: filtro, lista y aviso del navegador */
export function NotificationsPanel({ rows, unread, markRead, onGo }) {
  const [onlyUnread, setOnlyUnread] = useState(false);
  const navigate = useNavigate();

  const go = (n) => {
    if (!n.read_at) markRead([n.id]);
    onGo?.();
    if (n.link) navigate(n.link);
  };

  return (
    <div className="dr-notifs" role="region" aria-label="Notificaciones">
      <div className="dn-head">
        <b>Notificaciones</b>
        {rows.length > 0 && (
          <div className="seg notif-filter" role="radiogroup" aria-label="Filtrar notificaciones">
            <button type="button" role="radio" aria-checked={!onlyUnread} className={!onlyUnread ? "on" : ""} onClick={() => setOnlyUnread(false)}>
              Todas
            </button>
            <button type="button" role="radio" aria-checked={onlyUnread} className={onlyUnread ? "on" : ""} onClick={() => setOnlyUnread(true)}>
              Sin leer{unread ? ` (${unread})` : ""}
            </button>
          </div>
        )}
        {unread > 0 && (
          <button type="button" className="lnk-btn" onClick={() => markRead()}>
            Marcar todo leído
          </button>
        )}
      </div>
      {onlyUnread && !unread ? (
        <p className="muted small notif-none">Estás al día: no tenés notificaciones sin leer.</p>
      ) : rows.length ? (
        <ul className="notif-list">
          {rows
            .filter((n) => !onlyUnread || !n.read_at)
            .map((n) => (
              <li key={n.id}>
                <button type="button" className={"notif" + (n.read_at ? "" : " new")} onClick={() => go(n)}>
                  <span className={"n-ic " + n.kind}>
                    <i className={"bi " + (ICON[n.kind] || "bi-bell")} />
                  </span>
                  <span className="n-txt">
                    <b>{n.title}</b>
                    {n.body && <span>{n.body}</span>}
                  </span>
                  <small>{timeAgo(n.created_at)}</small>
                </button>
              </li>
            ))}
        </ul>
      ) : (
        <div className="notif-empty" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="gh-notif">
              <span className="gh-av" />
              <span className="gh-ln w60" />
            </div>
          ))}
        </div>
      )}
      <div className="notif-foot">
        <BrowserNotifyAsk />
      </div>
    </div>
  );
}
