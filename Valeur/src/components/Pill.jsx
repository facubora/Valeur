import { Link } from "react-router-dom";

const abs = (n) => Math.abs(n).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";

/* Una cifra en una pastilla (las de abajo del título de cada página):
   etiqueta, valor y variación con flecha. Con `to` es un link y con
   `onClick`, un botón. */
export default function Pill({ to, onClick, label, value, delta, icon }) {
  const up = delta >= 0;
  const body = (
    <>
      {icon && <i className={"bi " + icon + " hp-ic"} />}
      <span className="hp-l">{label}</span>
      {value != null && value !== "" && <b>{value}</b>}
      {delta != null && Number.isFinite(delta) && (
        <em className={up ? "up" : "down"}>
          <i className={up ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
          {abs(delta)}
        </em>
      )}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="hp" onClick={onClick}>
        {body}
      </button>
    );
  }
  return to ? (
    <Link to={to} className="hp">
      {body}
    </Link>
  ) : (
    <span className="hp">{body}</span>
  );
}
