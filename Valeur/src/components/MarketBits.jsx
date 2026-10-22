import { Link } from "react-router-dom";
import Logo from "./Logo";
import Sparkline from "./Sparkline";
import { useDisplayCurrency, useMep, money, priceIn, formatDate, tickerUrl } from "../lib/market";
import { KIND_LABEL } from "../lib/catalog";

/* Piezas de mercado compartidas entre Inicio y Mercado */

export function Delta({ value }) {
  if (value == null || Number.isNaN(value)) return null;
  const up = value >= 0;
  return (
    <span className={"delta " + (up ? "up" : "down")}>
      <i className={up ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

/* Dólar MEP | Pesos — la preferencia es la misma en toda la app */
export function CurrencyPick({ label = "Precios en" }) {
  const [cur, setCur] = useDisplayCurrency();
  const fx = useMep();
  return (
    <div className="cur-pick" title="Los precios en otra moneda se convierten al dólar MEP">
      {label && <span className="cur-lbl">{label}</span>}
      <div className="seg" role="radiogroup" aria-label="Moneda">
        {[
          ["USD", "Dólar MEP"],
          ["ARS", "Pesos"],
        ].map(([c, text]) => (
          <button key={c} type="button" role="radio" aria-checked={c === cur} className={c === cur ? "on" : ""} onClick={() => setCur(c)}>
            {text}
          </button>
        ))}
      </div>
      {fx.mep && (
        <small title={`Dólar MEP implícito en los CEDEARs, cierre ${formatDate(fx.mep.date)}`}>
          MEP {money(fx.mep.rate, 0, "ARS")}
        </small>
      )}
    </div>
  );
}

/* Fila de un activo: logo y nombre, sparkline, precio, variación y acciones */
export function AssetRow({ symbol, name, tag, quote, closes = [], cur, rate, following, busy, onStar, onRemove, alert }) {
  return (
    <div className="asset-row">
      <Link to={tickerUrl(symbol)} className="asset-id">
        <Logo symbol={symbol} size={34} />
        <div>
          <b>{name || symbol}</b>
          <span>
            {symbol}
            {tag && <em className="tag">{tag}</em>}
          </span>
        </div>
      </Link>
      <div className="asset-month">
        {closes.length > 1 ? (
          <>
            <small>1 mes</small>
            <span className={closes.at(-1) >= closes[0] ? "txt-up" : "txt-down"}>
              {closes.at(-1) >= closes[0] ? "+" : ""}
              {((closes.at(-1) / closes[0] - 1) * 100).toFixed(1)}%
            </span>
          </>
        ) : null}
      </div>
      <div className="asset-spark">
        {closes.length > 1 ? (
          <Sparkline values={closes} up={quote ? quote.change_pct >= 0 : closes.at(-1) >= closes[0]} width={88} height={28} />
        ) : (
          <span className="ph-line" />
        )}
      </div>
      <div className="asset-px">
        {quote ? (
          <>
            <b>{priceIn(symbol, quote.price, cur, rate)}</b>
            <Delta value={quote.change_pct} />
          </>
        ) : quote === null ? (
          <small className="muted">sin datos</small>
        ) : (
          <>
            <span className="ph-line px" />
            <span className="ph-line short" />
          </>
        )}
      </div>
      <div className="asset-act">
        {alert && (
          <Link to={tickerUrl(symbol)} className="has-alert" title="Tenés alertas en este activo">
            <i className="bi bi-bell-fill" />
          </Link>
        )}
        {onStar && (
          <button
            type="button"
            className={"star" + (following ? " on" : "")}
            disabled={busy}
            onClick={onStar}
            aria-label={following ? `Dejar de seguir ${name || symbol}` : `Seguir ${name || symbol}`}
            title={following ? "Siguiendo" : "Seguir"}
          >
            <i className={following ? "bi bi-star-fill" : "bi bi-star"} />
          </button>
        )}
        {onRemove && (
          <button type="button" className="icon-btn sm danger" disabled={busy} onClick={onRemove} aria-label={`Dejar de seguir ${symbol}`} title="Dejar de seguir">
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>
    </div>
  );
}

/* "Para vos" en formato lista compacta (para columnas laterales) */
export function ForYouList({ recs, quotes, cur, rate, followed, busy, onStar, onHide }) {
  return (
    <ul className="fy-list">
      {recs.map((r) => {
        const q = quotes[r.symbol];
        const isF = followed.has(r.symbol);
        return (
          <li key={r.symbol} className="fy-row">
            <Link to={tickerUrl(r.symbol)} className="fy-id">
              <Logo symbol={r.symbol} size={32} />
              <div>
                <b>{r.name}</b>
                <span className="fy-why">
                  <i className={"bi " + (r.reason?.icon || "bi-stars")} />
                  {r.reason?.text || KIND_LABEL[r.kind]}
                </span>
              </div>
            </Link>
            <div className="fy-px" title={q ? priceIn(r.symbol, q.price, cur, rate) : undefined}>
              {q ? <Delta value={q.change_pct} /> : <span className="ph-line tiny" />}
            </div>
            <div className="fy-act">
              <button
                type="button"
                className={"star sm" + (isF ? " on" : "")}
                disabled={busy === r.symbol}
                onClick={() => onStar(r)}
                aria-label={isF ? `Dejar de seguir ${r.name}` : `Seguir ${r.name}`}
                title={isF ? "Siguiendo" : "Seguir"}
              >
                <i className={isF ? "bi bi-star-fill" : "bi bi-star"} />
              </button>
              <button type="button" className="fy-x" onClick={() => onHide(r.base)} aria-label={`No me interesa ${r.name}`} title="No me interesa">
                <i className="bi bi-x" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* Fantasma de "Para vos" + rubros para arrancar */
export function ForYouStart({ sectors, busy, disabled, onPick, wide = false }) {
  return (
    <div className={"fy-start" + (wide ? " wide" : "")}>
      <div className="fy-ghost" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="gh-row">
            <span className="gh-box">+</span>
            <span className="gh-ln w60" />
          </div>
        ))}
      </div>
      <b>¿Qué rubros te interesan?</b>
      <div className="chips">
        {sectors.map(([k, label, icon]) => (
          <button key={k} type="button" className="chip" disabled={busy === k || disabled} onClick={() => onPick(k)}>
            <i className={"bi " + icon} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* "Para vos" en tarjetas, para secciones a lo ancho */
export function ForYouCards({ recs, quotes, sparks = {}, cur, rate, followed, busy, onStar, onHide }) {
  return (
    <div className="fy-cards">
      {recs.map((r) => {
        const q = quotes[r.symbol];
        const closes = sparks[r.symbol] || [];
        const isF = followed.has(r.symbol);
        return (
          <article key={r.symbol} className="card fy-card">
            <div className="fy-card-top">
              <span className="fy-why">
                <i className={"bi " + (r.reason?.icon || "bi-stars")} />
                {r.reason?.text || KIND_LABEL[r.kind]}
              </span>
              <button type="button" className="fy-x" onClick={() => onHide(r.base)} aria-label={`No me interesa ${r.name}`} title="No me interesa">
                <i className="bi bi-x" />
              </button>
            </div>
            <Link to={tickerUrl(r.symbol)} className="fy-id">
              <Logo symbol={r.symbol} size={38} />
              <div>
                <b>{r.name}</b>
                <span>
                  {r.symbol} · {KIND_LABEL[r.kind]}
                </span>
              </div>
            </Link>
            <div className="fy-card-bot">
              <div className="fy-card-px">
                {q ? (
                  <>
                    <b>{priceIn(r.symbol, q.price, cur, rate)}</b>
                    <Delta value={q.change_pct} />
                  </>
                ) : (
                  <>
                    <span className="ph-line px" />
                    <span className="ph-line tiny" />
                  </>
                )}
              </div>
              {closes.length > 1 && <Sparkline values={closes} up={q ? q.change_pct >= 0 : true} width={96} height={34} />}
            </div>
            <button
              type="button"
              className={"btn btn-line btn-sm fy-follow" + (isF ? " on" : "")}
              disabled={busy === r.symbol}
              onClick={() => onStar(r)}
            >
              <i className={isF ? "bi bi-star-fill" : "bi bi-star"} />
              {isF ? "Siguiendo" : "Seguir"}
            </button>
          </article>
        );
      })}
    </div>
  );
}
