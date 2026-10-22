import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { FormError } from "./AuthLayout";
import { assetCurrency, fmtPrice } from "../lib/market";
import { ALERT_KINDS, ALERT_KIND, alertText, alertError, addAlert, deleteAlert, setAlertActive } from "../lib/alerts";
import { toast, attempt } from "../lib/feedback";

/* Pedir permiso para avisos del navegador (solo si todavía no se respondió) */
export function BrowserNotifyAsk() {
  const [perm, setPerm] = useState(() => ("Notification" in window ? Notification.permission : "denied"));
  if (perm !== "default") return null;
  return (
    <button
      type="button"
      className="lnk-btn notify-ask"
      onClick={() => Notification.requestPermission().then(setPerm)}
    >
      <i className="bi bi-app-indicator" /> Avisarme también en el navegador
    </button>
  );
}

function AlertRow({ a, showSymbol }) {
  const [busy, setBusy] = useState(false);
  const fired = !a.active && a.triggered_at;
  const reactivate = async () => {
    setBusy(true);
    await attempt(setAlertActive(a.id, true), { ok: `Alerta de ${a.symbol} reactivada`, fail: "No se pudo reactivar la alerta" });
    setBusy(false);
  };
  // se confirma en la misma fila y después se puede deshacer desde el aviso
  const [asking, setAsking] = useState(false);
  const remove = async () => {
    setAsking(false);
    setBusy(true);
    const ok = await attempt(deleteAlert(a.id), { fail: "No se pudo borrar la alerta" });
    setBusy(false);
    if (ok) {
      toast(`Borraste la alerta de ${a.symbol}`, {
        action: { label: "Deshacer", run: () => addAlert(a.user_id, { symbol: a.symbol, kind: a.kind, value: Number(a.value) }) },
      });
    }
  };
  if (asking) {
    return (
      <li className="alert-row alert-ask" onKeyDown={(e) => e.key === "Escape" && setAsking(false)}>
        <div className="alert-what">
          <b>¿Borrar esta alerta?</b>
          <span>{alertText(a)}. Ya no te va a avisar.</span>
        </div>
        <div className="alert-act">
          <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setAsking(false)}>
            No
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={remove}>
            Borrar
          </button>
        </div>
      </li>
    );
  }
  return (
    <li className={"alert-row" + (a.active ? "" : " off")}>
      {showSymbol ? (
        <Link to={`/tickersearch?symbol=${encodeURIComponent(a.symbol)}`} className="alert-sym" title={a.symbol}>
          <Logo symbol={a.symbol} size={26} />
        </Link>
      ) : (
        <span className={"alert-ic " + a.kind}>
          <i className={"bi " + ALERT_KIND[a.kind].icon} />
        </span>
      )}
      <div className="alert-what">
        <b>{showSymbol ? `${a.symbol} · ${alertText(a).replace(/^Si /, "si ")}` : alertText(a)}</b>
        <span>
          {fired
            ? "Ya avisó · tocá reactivar para volver a vigilar"
            : a.active
              ? a.kind.endsWith("pct")
                ? "Avisa una vez por día"
                : "Avisa una vez y se apaga"
              : "Pausada"}
        </span>
      </div>
      <div className="alert-act">
        {!a.active && (
          <button type="button" className="icon-btn sm" title="Reactivar" aria-label="Reactivar alerta" disabled={busy} onClick={reactivate}>
            <i className="bi bi-arrow-repeat" />
          </button>
        )}
        <button type="button" className="icon-btn sm danger" title="Borrar" aria-label="Borrar alerta" disabled={busy} onClick={() => setAsking(true)}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
    </li>
  );
}

/* Formulario compacto: tipo + valor */
function AlertForm({ uid, symbol, quote, existing = [], onDone }) {
  const [kind, setKind] = useState("above");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const unit = ALERT_KIND[kind].unit;
  const cur = assetCurrency(symbol);

  const submit = async (e) => {
    e.preventDefault();
    const v = Number(String(value).replace(",", "."));
    const bad = alertError({ symbol, kind, value: v, quote, existing });
    if (bad) return setError(bad);
    setSaving(true);
    const err = await addAlert(uid, { symbol, kind, value: v });
    setSaving(false);
    if (err) return setError(/failed to fetch|network/i.test(err) ? "Sin conexión con el servidor. Probá de nuevo." : err);
    toast(`Alerta creada: ${alertText({ symbol, kind, value: v }).replace(/^S/, "s")}`);
    setValue("");
    setError("");
    onDone?.();
  };

  // sugerencias rápidas: ±5% / ±10% del precio, o 3% / 5% de movimiento diario
  const quick =
    unit === "pct"
      ? [2, 3, 5]
      : quote
        ? [5, 10].map((p) => +(quote.price * (kind === "above" ? 1 + p / 100 : 1 - p / 100)).toPrecision(5))
        : [];

  return (
    <form className="alert-form" onSubmit={submit} noValidate>
      <div className="seg full" role="radiogroup" aria-label="Tipo de alerta">
        {ALERT_KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            className={kind === k ? "on" : ""}
            onClick={() => {
              setKind(k);
              setValue("");
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="alert-in">
        <span className="unit">{unit === "pct" ? "%" : cur === "ARS" ? "ARS" : "US$"}</span>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder={unit === "pct" ? "3" : quote ? String(quote.price) : "Precio"}
          aria-label={unit === "pct" ? "Porcentaje" : "Precio"}
        />
        <button type="submit" className="btn btn-pink btn-sm" disabled={saving}>
          <i className="bi bi-bell" /> Crear
        </button>
      </div>
      {quick.length > 0 && (
        <div className="chips quick">
          {quick.map((v, i) => (
            <button key={v} type="button" className="chip" onClick={() => setValue(String(v))}>
              {unit === "pct" ? `${v}%` : `${kind === "above" ? "+" : "−"}${[5, 10][i]}% · ${fmtPrice(symbol, v)}`}
            </button>
          ))}
        </div>
      )}
      <FormError error={error} />
    </form>
  );
}

/* Alertas de un activo (con formulario) o de todos (lista compacta) */
export default function AlertsCard({ uid, alerts, symbol = null, quote = null, wide = false }) {
  const [show, setShow] = useState("all");
  const rows = symbol ? alerts.filter((a) => a.symbol === symbol) : alerts;
  const active = rows.filter((a) => a.active).length;
  const listed = rows.filter((a) => show === "all" || (show === "active" ? a.active : !a.active));
  return (
    <div className={"card alerts-card" + (wide ? " wide" : "")}>
      <div className="side-head">
        <h3>
          <i className="bi bi-bell" /> Alertas
        </h3>
        {rows.length > 0 && <small>{active === 1 ? "1 activa" : `${active} activas`}</small>}
      </div>
      {wide && rows.length > 3 && (
        <div className="seg alert-filter" role="radiogroup" aria-label="Filtrar alertas">
          {[
            ["all", `Todas (${rows.length})`],
            ["active", `Activas (${active})`],
            ["off", `Ya avisaron (${rows.length - active})`],
          ].map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={show === k} className={show === k ? "on" : ""} onClick={() => setShow(k)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {listed.length > 0 && (
        <ul className="alert-list">
          {listed.map((a) => (
            <AlertRow key={a.id} a={a} showSymbol={!symbol} />
          ))}
        </ul>
      )}
      {wide && rows.length > 0 && !listed.length && <p className="muted small">No hay alertas en este filtro.</p>}
      {symbol && <AlertForm uid={uid} symbol={symbol} quote={quote} existing={rows} />}
      <BrowserNotifyAsk />
    </div>
  );
}
