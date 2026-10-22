import { useState } from "react";
import { assetCurrency, fmtPrice, useQuotes } from "../lib/market";
import { ALERT_KINDS, ALERT_KIND, alertText, alertError, addAlert, updateAlert, deleteAlert } from "../lib/alerts";
import { toast, attempt } from "../lib/feedback";

/* Como se escribe acá: "28.420,5" → 28420.5 y "24.000" → 24000 (el punto
   es de miles); "18.28" sigue siendo 18,28 */
const toNum = (s) =>
  Number(s.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s);

/* Crear o editar una alerta: tipo (ficha deslizante), valor con atajos y
   guardar. Editando, también se puede borrar (se confirma en el mismo botón).
   Guardar una editada la vuelve a dejar vigilando. */
export default function AlertEditor({ uid, symbol, alert = null, existing = [], onDone, onCancel }) {
  const [kind, setKind] = useState(alert?.kind || "above");
  const [value, setValue] = useState(alert ? String(Number(alert.value)).replace(".", ",") : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const { quotes } = useQuotes([symbol]);
  const quote = quotes[symbol];
  const unit = ALERT_KIND[kind].unit;
  const kindIdx = ALERT_KINDS.findIndex(([k]) => k === kind);

  // atajos: ±5% / ±10% del precio, o 2 / 3 / 5% de movimiento en el día
  const quick =
    unit === "pct"
      ? [2, 3, 5].map((p) => [p, `${p}%`])
      : quote
        ? [5, 10].map((p) => {
            const v = +(quote.price * (kind === "above" ? 1 + p / 100 : 1 - p / 100)).toPrecision(5);
            return [v, `${kind === "above" ? "+" : "−"}${p}% · ${fmtPrice(symbol, v)}`];
          })
        : [];

  const save = async (e) => {
    e.preventDefault();
    const v = toNum(value);
    const bad = alertError({ symbol, kind, value: v, quote, existing, selfId: alert?.id });
    if (bad) return setError(bad);
    setBusy(true);
    const ok = await attempt(alert ? updateAlert(alert.id, { kind, value: v }) : addAlert(uid, { symbol, kind, value: v }), {
      fail: alert ? "No se pudo guardar la alerta" : "No se pudo crear la alerta",
    });
    setBusy(false);
    if (!ok) return;
    const what = alertText({ symbol, kind, value: v }).replace(/^S/, "s");
    toast(alert ? `Alerta de ${symbol} vigilando de nuevo: ${what}` : `Alerta creada: ${what}`);
    if (!alert) setValue("");
    onDone?.();
  };

  const remove = async () => {
    if (!sure) return setSure(true);
    setBusy(true);
    const ok = await attempt(deleteAlert(alert.id), { fail: "No se pudo borrar la alerta" });
    setBusy(false);
    if (ok) {
      toast(`Borraste la alerta de ${symbol}`, {
        action: { label: "Deshacer", run: () => addAlert(alert.user_id, { symbol, kind: alert.kind, value: Number(alert.value) }) },
      });
      onDone?.();
    }
  };

  return (
    <form className="ae" onSubmit={save} onKeyDown={(e) => e.key === "Escape" && onCancel?.()} noValidate>
      <div className="vx-tabs sm ae-kinds" role="radiogroup" aria-label="Tipo de alerta" style={{ "--n": ALERT_KINDS.length, "--i": kindIdx }}>
        <span className="vx-tabs-thumb" aria-hidden="true" />
        {ALERT_KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            className={kind === k ? "on" : ""}
            onClick={() => {
              setKind(k);
              if (k !== kind && ALERT_KIND[k].unit !== unit) setValue("");
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <label className={"ae-in" + (error ? " bad" : "")}>
        <span>{unit === "pct" ? "%" : assetCurrency(symbol) === "ARS" ? "ARS" : "US$"}</span>
        <input
          autoFocus={Boolean(alert)}
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/[^\d.,]/g, ""));
            setError("");
          }}
          placeholder={unit === "pct" ? "3" : quote ? String(quote.price).replace(".", ",") : "Precio"}
          aria-label={unit === "pct" ? "Porcentaje" : "Precio"}
        />
        {unit !== "pct" && quote && <small>hoy {fmtPrice(symbol, quote.price)}</small>}
      </label>
      {quick.length > 0 && (
        <div className="ae-quick">
          {quick.map(([v, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setValue(String(v).replace(".", ","));
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="ae-err" role="alert">
          <i className="bi bi-exclamation-circle" /> {error}
        </p>
      )}
      <div className="ae-btns">
        {alert && (
          <button type="button" className={"ae-del" + (sure ? " sure" : "")} onClick={remove} onBlur={() => setSure(false)} disabled={busy}>
            <i className="bi bi-trash3" /> {sure ? "¿Seguro? Borrar" : "Borrar alerta"}
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn btn-line btn-sm" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-pink btn-sm" disabled={busy}>
          <i className="bi bi-bell" /> {alert ? "Guardar" : "Crear alerta"}
        </button>
      </div>
    </form>
  );
}
