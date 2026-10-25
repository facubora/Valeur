import { useState } from "react";
import AlertEditor from "./AlertEditor";
import { ALERT_KIND, alertText, alertGap, addAlert, deleteAlert, setAlertActive } from "../lib/alerts";
import { toast, attempt } from "../lib/feedback";

/* Una alerta del activo: qué vigila y cuánto le falta. Al pasar el mouse,
   editarla ahí mismo o borrarla (se confirma en la fila). Si ya avisó, se
   reactiva con un toque. */
function Row({ a, quote, alerts }) {
  const [mode, setMode] = useState(""); // "" | "edit" | "ask"
  const [busy, setBusy] = useState(false);
  const gap = a.active ? alertGap(a, quote) : null;

  const reactivate = async () => {
    setBusy(true);
    await attempt(setAlertActive(a.id, true), { ok: `Alerta de ${a.symbol} vigilando de nuevo`, fail: "No se pudo reactivar la alerta" });
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true);
    const ok = await attempt(deleteAlert(a.id), { fail: "No se pudo borrar la alerta" });
    setBusy(false);
    if (ok) {
      toast(`Borraste la alerta de ${a.symbol}`, {
        action: { label: "Deshacer", run: () => addAlert(a.user_id, { symbol: a.symbol, kind: a.kind, value: Number(a.value) }) },
      });
    }
  };

  if (mode === "edit") {
    return (
      <li className="aa-edit">
        <AlertEditor symbol={a.symbol} alert={a} existing={alerts} onDone={() => setMode("")} onCancel={() => setMode("")} />
      </li>
    );
  }
  if (mode === "ask") {
    return (
      <li className="aa-ask" onKeyDown={(e) => e.key === "Escape" && setMode("")}>
        <span>
          <b>¿Borrar esta alerta?</b>
          <small>{alertText(a)}. Ya no te va a avisar.</small>
        </span>
        <div>
          <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setMode("")}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
            <i className="bi bi-trash3" /> Borrar
          </button>
        </div>
      </li>
    );
  }
  return (
    <li className={"aa-row" + (a.active ? "" : " off")}>
      <span className={"aa-ic " + a.kind}>
        <i className={"bi " + ALERT_KIND[a.kind].icon} />
      </span>
      <span className="aa-txt">
        <b>{alertText(a)}</b>
        {a.active ? (
          <>
            <span className="aa-bar">
              <span style={{ width: `${(gap?.progress ?? 0) * 100}%` }} />
            </span>
            <small>{gap?.text || "vigilando"}</small>
          </>
        ) : (
          <small>Ya avisó · no está vigilando</small>
        )}
      </span>
      <span className="aa-acts">
        {!a.active && (
          <button type="button" className="aa-again" onClick={reactivate} disabled={busy}>
            <i className="bi bi-arrow-repeat" /> Reactivar
          </button>
        )}
        <button type="button" onClick={() => setMode("edit")} disabled={busy} title="Editar" aria-label={`Editar: ${alertText(a)}`}>
          <i className="bi bi-pencil" />
        </button>
        <button type="button" className="danger" onClick={() => setMode("ask")} disabled={busy} title="Borrar" aria-label={`Borrar: ${alertText(a)}`}>
          <i className="bi bi-trash3" />
        </button>
      </span>
    </li>
  );
}

/* Las alertas que ya tenés de un activo, para editar o borrar */
export default function AlertList({ symbol, alerts, quote }) {
  return (
    <ul className="aa-list">
      {alerts
        .filter((a) => a.symbol === symbol)
        .map((a) => (
          <Row key={a.id} a={a} quote={quote} alerts={alerts} />
        ))}
    </ul>
  );
}
