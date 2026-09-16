import { Link } from "react-router-dom";
import { POPULAR, readFlag } from "../lib/onboarding";

/* Checklist de arranque: tres pasos con la acción al lado de cada uno.
   Se muestra mientras falte alguno. Primero seguir, después mirar, después operar. */
export default function Onboarding({ watchCount, tradesCount, onFollow, onTrade, busy }) {
  const steps = [
    {
      id: "watch",
      done: watchCount > 0,
      label: "Seguí un activo",
      hint: "Sin comprarlo: precio, variación y tendencia en tu inicio.",
      action: (
        <div className="chips">
          {POPULAR.slice(0, 4).map(([sym, n]) => (
            <button
              key={sym}
              type="button"
              className="chip"
              disabled={busy === sym}
              onClick={() => onFollow({ symbol: sym, name: n })}
              title={n}
            >
              <i className="bi bi-plus" /> {sym}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: "market",
      done: readFlag(),
      label: "Explorá el mercado",
      hint: "Buscá cualquier ticker y mirá su gráfico con histórico completo.",
      action: (
        <Link to="/tickersearch" className="btn btn-line btn-sm">
          Ir al mercado
        </Link>
      ),
    },
    {
      id: "trade",
      done: tradesCount > 0,
      label: "Registrá tu primera operación",
      hint: "Compras o ventas que ya hiciste; con eso se arma tu portfolio.",
      action: onTrade ? (
        <button type="button" className="btn btn-pink btn-sm" onClick={onTrade}>
          <i className="bi bi-plus-lg" /> Registrar
        </button>
      ) : (
        <Link to="/dashboard" className="btn btn-pink btn-sm">
          <i className="bi bi-plus-lg" /> Registrar
        </Link>
      ),
    },
  ];
  if (steps.every((st) => st.done)) return null;
  const done = steps.filter((st) => st.done).length;

  return (
    <section className="onboard" aria-label="Para arrancar">
      <div className="onboard-head">
        <b>Para arrancar</b>
        <span className="onboard-prog">
          <i style={{ width: `${(done / steps.length) * 100}%` }} />
        </span>
        <small>
          {done}/{steps.length}
        </small>
      </div>
      <ol className="onboard-steps">
        {steps.map((st) => (
          <li key={st.id} className={st.done ? "done" : ""}>
            <span className="chk" aria-hidden="true">
              <i className="bi bi-check-lg" />
            </span>
            <div className="what">
              <b>{st.label}</b>
              <span>{st.hint}</span>
            </div>
            <div className="act">{st.done ? <span className="ok">Listo</span> : st.action}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
