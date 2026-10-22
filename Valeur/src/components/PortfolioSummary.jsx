import { Link } from "react-router-dom";
import Logo from "./Logo";
import { CurrencyPick } from "./MarketBits";
import { money, signed, pct, tickerUrl } from "../lib/market";

/* Tu portfolio en el Inicio: lo justo para el que entra a ver qué onda su
   plata. Cuánto vale, cómo viene el día, cuánto ganaste y cómo se mueve hoy
   cada cosa. Gráficos y composición quedan para la pantalla del portfolio. */
export default function PortfolioSummary({ positions, totals, cur }) {
  const shown = positions.slice(0, 5);
  const rest = positions.length - shown.length;
  const up = totals.dayChange >= 0;

  return (
    <div className="card pfx">
      <div className="pfx-main">
        <div className="pfx-top">
          <span className="lbl">Valor total</span>
          <CurrencyPick />
        </div>
        <Link to="/dashboard" className="pfx-num">
          {money(totals.value, undefined, cur)}
        </Link>
        <span className={"pfx-day " + (up ? "up" : "down")}>
          <i className={up ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
          {signed(totals.dayChange, undefined, cur)} · {pct(totals.dayPct)} hoy
        </span>
        <p className="pfx-gain">
          Ganancia total{" "}
          <b className={totals.pnl >= 0 ? "txt-up" : "txt-down"}>
            {signed(totals.pnl, undefined, cur)} ({pct(totals.pnlPct)})
          </b>
        </p>
      </div>

      <div className="pfx-side">
        <ul className="pfx-list">
          {shown.map((p) => (
            <li key={p.symbol}>
              <Link to={tickerUrl(p.symbol)}>
                <Logo symbol={p.symbol} size={28} />
                <span className="pfx-name">
                  <b>{p.symbol}</b>
                  <small>{p.name || p.symbol}</small>
                </span>
                <span className="pfx-val">{money(p.value, undefined, cur)}</span>
                <span className={"pfx-chg " + (p.dayPct >= 0 ? "txt-up" : "txt-down")}>{pct(p.dayPct)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/dashboard" className="pfx-go">
          {rest > 0 ? `Ver los ${positions.length} activos` : "Ver portfolio completo"} <i className="bi bi-arrow-right" />
        </Link>
      </div>
    </div>
  );
}

/* Sin operaciones: la forma de lo que va a haber, punteada, y para arrancar */
export function PortfolioSummaryEmpty({ onTrade }) {
  return (
    <div className="card pfx empty">
      <div className="pfx-main">
        <span className="lbl">Valor total</span>
        <span className="gh-ln w40 big" />
        <button type="button" className="btn btn-pink btn-sm pfx-start" onClick={onTrade}>
          <i className="bi bi-plus-lg" /> Registrá tu primera operación
        </button>
      </div>
      <div className="pfx-side" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="gh-row">
            <span className="gh-box">+</span>
            <span className="gh-ln w60" />
          </div>
        ))}
      </div>
    </div>
  );
}
