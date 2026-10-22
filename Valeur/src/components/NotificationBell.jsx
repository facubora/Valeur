import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications, useAlertWatcher } from "../lib/alerts";
import { timeAgo } from "../lib/social";
import { BrowserNotifyAsk } from "./AlertsCard";

const ICON = {
  alert: "bi-bell-fill",
  follow: "bi-person-plus-fill",
  post: "bi-chat-square-quote-fill",
  like: "bi-hand-thumbs-up-fill",
  verified: "bi-patch-check-fill",
};

/* Campanita del header: notificaciones en vivo + vigía de alertas de precio */
export default function NotificationBell({ uid }) {
  useAlertWatcher(uid);
  const { rows, unread, markRead } = useNotifications(uid);
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const go = (n) => {
    if (!n.read_at) markRead([n.id]);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        type="button"
        className={"icon-btn bell" + (unread ? " has" : "")}
        aria-label={unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className={unread ? "bi bi-bell-fill" : "bi bi-bell"} />
        {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
          <div className="notif-head">
            <b>Notificaciones</b>
            {unread > 0 && (
              <button type="button" className="lnk-btn" onClick={() => markRead()}>
                Marcar todo leído
              </button>
            )}
          </div>
          {rows.length > 0 && (
            <div className="seg full notif-filter" role="radiogroup" aria-label="Filtrar notificaciones">
              <button type="button" role="radio" aria-checked={!onlyUnread} className={!onlyUnread ? "on" : ""} onClick={() => setOnlyUnread(false)}>
                Todas
              </button>
              <button type="button" role="radio" aria-checked={onlyUnread} className={onlyUnread ? "on" : ""} onClick={() => setOnlyUnread(true)}>
                Sin leer{unread ? ` (${unread})` : ""}
              </button>
            </div>
          )}
          {onlyUnread && !unread ? (
            <p className="muted small notif-none">Estás al día: no tenés notificaciones sin leer.</p>
          ) : rows.length ? (
            <ul className="notif-list">
              {rows.filter((n) => !onlyUnread || !n.read_at).map((n) => (
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
      )}
    </div>
  );
}
