import { Link } from "react-router-dom";
import { useBatch, useMep, useMarketStatus, fmtPrice, money, tickerUrl } from "../lib/market";

/* Lo que se ve siempre en la cinta; después se suman los seguidos del usuario */
const BASE = [
  ["USDARS=X", "Oficial"],
  ["^MERV", "Merval"],
  ["^GSPC", "S&P 500"],
  ["^IXIC", "Nasdaq"],
  ["BTC-USD", "Bitcoin"],
  ["ETH-USD", "Ethereum"],
];

/* Cinta de mercado: estado de BYMA/NYSE y precios en loop. Se pausa al pasar
   el mouse; con "reducir movimiento" queda quieta y se puede deslizar. */
export default function MarketTape({ watch = [] }) {
  const status = useMarketStatus();
  const fx = useMep();
  const extra = watch.filter((w) => !BASE.some(([s]) => s === w.symbol)).slice(0, 8);
  const items = [...BASE, ...extra.map((w) => [w.symbol, w.symbol])];
  const { quotes } = useBatch(items.map(([s]) => s));

  const cells = (
    <>
      {fx.mep && (
        <span className="tp-item">
          <b>MEP</b>
          <span>{money(fx.mep.rate, 0, "ARS")}</span>
        </span>
      )}
      {items.map(([sym, label]) => {
        const q = quotes[sym];
        const up = q ? q.change_pct >= 0 : true;
        return (
          <Link key={sym} to={tickerUrl(sym)} className="tp-item" tabIndex={-1}>
            <b>{label}</b>
            <span>{q ? fmtPrice(sym, q.price) : "—"}</span>
            {q && (
              <em className={up ? "up" : "down"}>
                {up ? "▲" : "▼"} {Math.abs(q.change_pct).toFixed(2)}%
              </em>
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="tape" role="region" aria-label="Cotizaciones del momento">
      <div className="tape-status">
        {status.map((m) => (
          <span key={m.key} className={"mk" + (m.open ? " open" : "")} title={`${m.key} ${m.open ? "abierto" : "cerrado"} · ${m.hint} (hora argentina)`}>
            <i />
            {m.key}
            <small>{m.open ? "abierto" : "cerrado"}</small>
          </span>
        ))}
      </div>
      <div className="tape-track">
        {/* dos copias para que el loop sea continuo */}
        <div className="tape-run" style={{ "--n": items.length + 1 }}>
          <div className="tape-set">{cells}</div>
          <div className="tape-set" aria-hidden="true">
            {cells}
          </div>
        </div>
      </div>
    </div>
  );
}
