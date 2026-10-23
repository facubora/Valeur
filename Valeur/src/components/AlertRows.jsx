import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import AlertEditor from "./AlertEditor";
import { alertText, alertGap, addAlert, deleteAlert, setAlertActive } from "../lib/alerts";
import { fmtPrice, tickerUrl } from "../lib/market";
import { toast, attempt } from "../lib/feedback";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* Pedir permiso para avisos del navegador (solo si todavía no se respondió) */
export function BrowserNotifyAsk() {
  const [perm, setPerm] = useState(() => ("Notification" in window ? Notification.permission : "denied"));
  if (perm !== "default") return null;
  return (
    <button type="button" className="lnk-btn notify-ask" onClick={() => Notification.requestPermission().then(setPerm)}>
      <i className="bi bi-app-indicator" /> Avisarme también en el navegador
    </button>
  );
}

/* Una alerta: cuánto le falta y, al pasar el mouse, editar o borrar. Editar
   abre el mismo editor que en el activo, ahí en la fila. Borrar se confirma
   en la fila y se puede deshacer desde el aviso. Si ya avisó, se reactiva
   con un toque. */
function AlertRow({ a, q, existing }) {
  const [mode, setMode] = useState(""); // "" | "edit" | "ask"
  const [busy, setBusy] = useState(false);
  // animaciones: "out" se va (al borrar), "back" vuelve de editar, "saved" destella
  const [fx, setFx] = useState("");
  const gap = a.active ? alertGap(a, q) : null;
  const close = (next) => {
    setMode("");
    setFx(next);
  };

  const reactivate = async () => {
    setBusy(true);
    const ok = await attempt(setAlertActive(a.id, true), { ok: `Alerta de ${a.symbol} vigilando de nuevo`, fail: "No se pudo reactivar la alerta" });
    setBusy(false);
    if (ok) setFx("saved");
  };
  // primero la fila se va (se desliza y se cierra) y después se borra; si
  // falla, vuelve
  const remove = async () => {
    setMode("");
    setBusy(true);
    setFx("out");
    await wait(320);
    const ok = await attempt(deleteAlert(a.id), { fail: "No se pudo borrar la alerta" });
    setBusy(false);
    if (!ok) setFx("back");
    if (ok) {
      toast(`Borraste la alerta de ${a.symbol}`, {
        action: { label: "Deshacer", run: () => addAlert(a.user_id, { symbol: a.symbol, kind: a.kind, value: Number(a.value) }) },
      });
    }
  };

  if (mode === "ask") {
    return (
      <li className="nrx-ask" onKeyDown={(e) => e.key === "Escape" && setMode("")}>
        <Logo symbol={a.symbol} size={28} />
        <span className="nrx-ask-txt">
          <b>¿Borrar la alerta de {a.symbol}?</b>
          <small>{alertText(a)}. Ya no te va a avisar.</small>
        </span>
        <div className="nrx-btns">
          <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setMode("")}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={remove}>
            <i className="bi bi-trash3" /> Borrar
          </button>
        </div>
      </li>
    );
  }

  if (mode === "edit") {
    return (
      <li className="nrx-edit">
        <div className="nrx-edit-head">
          <Logo symbol={a.symbol} size={28} />
          <b>{a.symbol}</b>
          <small>{a.active ? "Editando" : "Editala y vuelve a vigilar"}</small>
        </div>
        <AlertEditor symbol={a.symbol} alert={a} existing={existing} onDone={() => close("saved")} onCancel={() => close("back")} />
      </li>
    );
  }

  return (
    <li className={(a.active ? "" : "off ") + (fx ? "nrx-" + fx : "")} onAnimationEnd={(e) => e.target === e.currentTarget && fx !== "out" && setFx("")}>
      <Link to={tickerUrl(a.symbol)}>
        <Logo symbol={a.symbol} size={28} />
        <span className="pfx-name">
          <b>{a.symbol}</b>
          <small>{alertText(a)}</small>
        </span>
        <span className="nrx-gap">
          {a.active ? (
            <>
              <span className="nrx-bar">
                <span style={{ width: `${(gap?.progress ?? 0) * 100}%` }} />
              </span>
              <small>{gap?.text || "sin datos"}</small>
            </>
          ) : (
            <small>
              <i className="bi bi-check2" /> Ya avisó, no está vigilando
            </small>
          )}
        </span>
        <span className="pfx-val">{q ? fmtPrice(a.symbol, q.price) : "—"}</span>
      </Link>
      <span className="nrx-acts">
        {!a.active && (
          <button type="button" className="again" onClick={reactivate} disabled={busy}>
            <i className="bi bi-arrow-repeat" /> Reactivar
          </button>
        )}
        <button type="button" onClick={() => setMode("edit")} disabled={busy} aria-label={`Editar la alerta de ${a.symbol}`} title="Editar">
          <i className="bi bi-pencil" />
        </button>
        <button type="button" className="danger" onClick={() => setMode("ask")} disabled={busy} aria-label={`Borrar la alerta de ${a.symbol}`} title="Borrar">
          <i className="bi bi-trash3" />
        </button>
      </span>
    </li>
  );
}

/* Alertas, una fila cada una (Inicio y Mercado) */
export default function AlertRows({ alerts, quotes, existing }) {
  return (
    <div className="card nrx">
      <ul className="nrx-list">
        {alerts.map((a) => (
          <AlertRow key={a.id} a={a} q={quotes[a.symbol]} existing={existing} />
        ))}
      </ul>
    </div>
  );
}
