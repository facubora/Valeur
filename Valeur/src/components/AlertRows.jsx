import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { ALERT_KINDS, ALERT_KIND, alertText, alertError, addAlert, updateAlert, deleteAlert } from "../lib/alerts";
import { fmtPrice, pct, tickerUrl } from "../lib/market";
import { toast, attempt, confirmDialog } from "../lib/feedback";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const abs = (n) => Math.abs(n).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";

/* Cuánto le falta a una alerta para saltar → { progress 0..1, text } */
function alertGap(a, q) {
  if (!q) return null;
  const v = Number(a.value);
  if (a.kind === "above") return { progress: Math.min(q.price / v, 1), text: `falta subir ${abs((v / q.price - 1) * 100)}` };
  if (a.kind === "below") return { progress: Math.min(v / q.price, 1), text: `falta bajar ${abs((1 - v / q.price) * 100)}` };
  const day = a.kind === "up_pct" ? Math.max(q.change_pct, 0) : Math.max(-q.change_pct, 0);
  return { progress: Math.min(day / v, 1), text: `hoy ${pct(q.change_pct)} de ${a.kind === "up_pct" ? "+" : "−"}${abs(v)}` };
}

/* Una alerta: cuánto le falta y, al pasar el mouse, editar o borrar.
   Editar se hace ahí mismo (tipo + valor), con las mismas validaciones que
   al crearla. Borrar se puede deshacer desde el aviso. */
function AlertRow({ a, q, existing }) {
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState(a.kind);
  const [value, setValue] = useState(String(Number(a.value)));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // animaciones: "out" se va (al borrar), "back" vuelve de editar, "saved" destella
  const [fx, setFx] = useState("");
  const gap = alertGap(a, q);
  const close = (next) => {
    setEditing(false);
    setFx(next);
  };

  const open = () => {
    setKind(a.kind);
    setValue(String(Number(a.value)));
    setError("");
    setEditing(true);
  };
  const save = async (e) => {
    e.preventDefault();
    const v = Number(String(value).replace(",", "."));
    const bad = alertError({ symbol: a.symbol, kind, value: v, quote: q, existing, selfId: a.id });
    if (bad) return setError(bad);
    setBusy(true);
    const ok = await attempt(updateAlert(a.id, { kind, value: v }), { fail: "No se pudo guardar la alerta" });
    setBusy(false);
    if (ok) {
      toast(`Alerta de ${a.symbol}: ${alertText({ symbol: a.symbol, kind, value: v }).replace(/^S/, "s")}`);
      close("saved");
    }
  };
  // primero la fila se va (se desliza y se cierra) y después se borra; si
  // falla, vuelve
  const remove = async () => {
    const yes = await confirmDialog({
      title: `¿Borrar la alerta de ${a.symbol}?`,
      body: `${alertText(a)}. Ya no te va a avisar.`,
      confirmText: "Borrar",
      danger: true,
      icon: "bi-trash3",
    });
    if (!yes) return;
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

  if (editing) {
    const unit = ALERT_KIND[kind].unit;
    return (
      <li className="nrx-edit">
        <form onSubmit={save} onKeyDown={(e) => e.key === "Escape" && close("back")}>
          <Logo symbol={a.symbol} size={28} />
          <b className="nrx-sym">{a.symbol}</b>
          <div className="seg nrx-kinds" role="radiogroup" aria-label="Tipo de alerta">
            {ALERT_KINDS.map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>
                {label}
              </button>
            ))}
          </div>
          <label className="nrx-val">
            <input
              autoFocus
              inputMode="decimal"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              aria-label={unit === "pct" ? "Porcentaje" : "Precio"}
            />
            <span>{unit === "pct" ? "%" : q ? `hoy ${fmtPrice(a.symbol, q.price)}` : ""}</span>
          </label>
          <div className="nrx-btns">
            <button type="button" className="btn btn-line btn-sm" onClick={() => close("back")}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-pink btn-sm" disabled={busy}>
              Guardar
            </button>
          </div>
        </form>
        {error && <p className="nrx-err">{error}</p>}
      </li>
    );
  }

  return (
    <li className={fx ? "nrx-" + fx : ""} onAnimationEnd={(e) => e.target === e.currentTarget && fx !== "out" && setFx("")}>
      <Link to={tickerUrl(a.symbol)}>
        <Logo symbol={a.symbol} size={28} />
        <span className="pfx-name">
          <b>{a.symbol}</b>
          <small>{alertText(a)}</small>
        </span>
        <span className="nrx-gap">
          <span className="nrx-bar">
            <span style={{ width: `${(gap?.progress ?? 0) * 100}%` }} />
          </span>
          <small>{gap?.text || "sin datos"}</small>
        </span>
        <span className="pfx-val">{q ? fmtPrice(a.symbol, q.price) : "—"}</span>
      </Link>
      <span className="nrx-acts">
        <button type="button" onClick={open} disabled={busy} aria-label={`Editar la alerta de ${a.symbol}`} title="Editar">
          <i className="bi bi-pencil" />
        </button>
        <button type="button" className="danger" onClick={remove} disabled={busy} aria-label={`Borrar la alerta de ${a.symbol}`} title="Borrar">
          <i className="bi bi-trash3" />
        </button>
      </span>
    </li>
  );
}

/* Las alertas activas en el Inicio, una fila cada una */
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
