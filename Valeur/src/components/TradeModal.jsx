import { useEffect, useRef, useState } from "react";
import { getQuote, useSuggestions, money, fmtPrice, assetCurrency, today, formatDate } from "../lib/market";
import { addTrade, findOversell } from "../lib/portfolio";
import { toast } from "../lib/feedback";
import { useModalClose } from "../lib/modal";
import { FormError, SubmitButton } from "./AuthLayout";
import Modal from "./Modal";
import Logo from "./Logo";

const SYMBOL_RE = /^[A-Z0-9.=^-]{1,12}$/;

/* Modal para registrar una compra o venta. Nace del botón que lo abrió.
   `held` = { SYM: cantidad } para no vender más de lo que se tiene.
   El formulario se monta al abrir, así arranca limpio con lo prellenado. */
export default function TradeModal({ open, onClose, ...props }) {
  return open ? (
    <Modal onClose={onClose} label="Registrar operación" className="tm">
      <TradeForm {...props} />
    </Modal>
  ) : null;
}

function TradeForm({ uid, initial = {}, held = {}, trades = [], onSaved }) {
  const close = useModalClose();
  const [symbol, setSymbol] = useState(initial.symbol || "");
  const [name, setName] = useState(initial.name || "");
  const [query, setQuery] = useState("");
  const [side, setSide] = useState(initial.side || "buy");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState(undefined); // undefined: sin consultar · null: no existe
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const firstInput = useRef(null);
  const suggestions = useSuggestions(query);

  useEffect(() => {
    const t = setTimeout(() => firstInput.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Precio actual del símbolo elegido → sugerido como precio de la operación
  useEffect(() => {
    if (!symbol) return;
    let alive = true;
    // null = el ticker no existe; undefined = no se pudo consultar (sin red)
    getQuote(symbol).then(
      (q) => {
        if (!alive) return;
        setQuote(q);
        if (q) setPrice((p) => (p === "" ? String(q.price) : p));
      },
      () => alive && setQuote(undefined),
    );
    return () => {
      alive = false;
    };
  }, [symbol]);

  const pick = (s) => {
    setSymbol(s.symbol.toUpperCase());
    setName(s.name || "");
    setQuery("");
    setPrice("");
    setQuote(undefined);
  };

  const commitQuery = () => {
    const s = query.trim().toUpperCase();
    if (s) pick({ symbol: s, name: "" });
  };

  const q = Number(qty);
  const p = Number(price);
  const total = q > 0 && p >= 0 ? q * p : 0;
  const heldQty = held[symbol] || 0;
  const currency = assetCurrency(symbol);
  // Precio muy lejos del actual: casi siempre es otra especie (AAPL vs AAPLD.BA) o la moneda equivocada
  const offPrice = quote && p > 0 && Math.abs(p / quote.price - 1) > 0.5;

  const submit = async (e) => {
    e.preventDefault();
    if (!SYMBOL_RE.test(symbol)) return setError("Elegí un ticker válido");
    if (quote === null) return setError(`No encontramos cotización de ${symbol}. Revisá el ticker.`);
    if (!(q > 0)) return setError("La cantidad tiene que ser mayor a cero");
    if (q > 1e9) return setError("La cantidad es demasiado grande");
    if (price === "" || !(p > 0)) return setError("Ingresá el precio de la operación (mayor a cero)");
    if (!date) return setError("Elegí la fecha de la operación");
    if (date > today()) return setError("La fecha no puede ser futura");
    if (date < "1990-01-01") return setError("Revisá la fecha: es demasiado vieja");
    if (side === "sell" && q > heldQty + 1e-9) {
      return setError(heldQty > 0 ? `Solo tenés ${heldQty} ${symbol} para vender` : `No tenés ${symbol} para vender`);
    }
    // la venta tiene que tener respaldo también a esa fecha (no solo hoy)
    if (side === "sell") {
      const bad = findOversell([...trades, { symbol, side, qty: q, executed_at: date, created_at: new Date().toISOString() }]);
      if (bad) return setError(`Al ${formatDate(bad.date)} tenías ${+bad.have.toFixed(6)} ${bad.symbol}: no alcanza para vender ${bad.sell}`);
    }
    setSaving(true);
    const err = await addTrade(uid, {
      symbol,
      name: name || null,
      side,
      qty: q,
      price: p,
      executed_at: date,
      note: note.trim() || null,
    });
    setSaving(false);
    if (err) return setError(/failed to fetch|network/i.test(err) ? "Sin conexión con el servidor. Probá de nuevo." : err);
    toast(`${side === "buy" ? "Compra" : "Venta"} de ${q} ${symbol} registrada`);
    onSaved?.();
    close();
  };

  const sell = side === "sell";
  return (
    <>
      <div className="tm-head">
        <div>
          <span className="kicker">Nueva operación</span>
          <h2 id="trade-title">Registrar operación</h2>
        </div>
        <button type="button" className="tm-x" onClick={close} aria-label="Cerrar">
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {/* el error se va apenas tocás algo */}
      <form className="tm-form" onSubmit={submit} onChange={() => error && setError("")} noValidate>
        {/* Compra / venta: lo primero que se decide */}
        <div className="tm-side" data-side={side} role="radiogroup" aria-label="Tipo de operación">
          <span className="tm-thumb" aria-hidden="true" />
          <button type="button" role="radio" aria-checked={!sell} className={!sell ? "on" : ""} onClick={() => setSide("buy")}>
            <i className="bi bi-plus-lg" /> Compra
          </button>
          <button type="button" role="radio" aria-checked={sell} className={sell ? "on" : ""} onClick={() => setSide("sell")}>
            <i className="bi bi-dash-lg" /> Venta
          </button>
        </div>

        {/* Activo */}
        <div className="field">
          <label htmlFor="t-symbol">Activo</label>
          {symbol ? (
            <div className="tm-picked">
              <Logo symbol={symbol} size={34} />
              <div>
                <b>{symbol}</b>
                <span className={quote === null ? "txt-down" : ""}>
                  {quote === null ? "No encontramos cotización" : [name, quote ? `hoy ${fmtPrice(symbol, quote.price)}` : "…"].filter(Boolean).join(" · ")}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-line btn-sm"
                onClick={() => {
                  setSymbol("");
                  setName("");
                  setPrice("");
                  setQuote(undefined);
                  setTimeout(() => firstInput.current?.focus(), 30);
                }}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="search-form compact tm-search">
              <i className="bi bi-search ico" aria-hidden="true" />
              <input
                id="t-symbol"
                ref={firstInput}
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (suggestions[0] && query.length >= 2) pick(suggestions[0]);
                    else commitQuery();
                  }
                }}
                placeholder="Ticker o empresa… AAPL, Tesla"
                autoComplete="off"
                spellCheck={false}
              />
              {suggestions.length > 0 && (
                <ul className="suggest" role="listbox">
                  {suggestions.map((s) => (
                    <li key={s.symbol} role="option" aria-selected={false} onMouseDown={() => pick(s)}>
                      <div>
                        <b>{s.symbol}</b>
                        <span>{s.name}</span>
                      </div>
                      {s.type && <small>{s.type}</small>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {sell && symbol && <small className="hint">Tenés {heldQty} {symbol}</small>}
        </div>

        <div className="row-2">
          <div className="field">
            <label htmlFor="t-qty">Cantidad</label>
            <input id="t-qty" type="number" min="0" step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label htmlFor="t-price">
              Precio{symbol ? ` (${currency === "ARS" ? "ARS" : "US$"})` : " por unidad"}
              {quote && (
                <button type="button" className="link-btn" onClick={() => setPrice(String(quote.price))}>
                  usar actual
                </button>
              )}
            </label>
            <input id="t-price" type="number" min="0" step="any" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        {offPrice && (
          <p className="price-warn" role="status">
            <i className="bi bi-exclamation-circle" /> {symbol} cotiza a {fmtPrice(symbol, quote.price)}. Revisá que
            el precio sea de esta especie y en {currency === "ARS" ? "pesos" : "dólares"}.
          </p>
        )}

        <div className="row-2">
          <div className="field">
            <label htmlFor="t-date">Fecha</label>
            <input id="t-date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="t-note">Nota (opcional)</label>
            <input id="t-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Por qué la hiciste" />
          </div>
        </div>

        {/* pie: el total en grande y la acción */}
        <div className="tm-foot">
          <div className="tm-total">
            <span>Total {sell ? "recibido" : "invertido"}</span>
            <b>{money(total, undefined, currency)}</b>
          </div>
          <FormError error={error} />
          <SubmitButton loading={saving} loadingText="Guardando…" disabled={saving}>
            {sell ? "Registrar venta" : "Registrar compra"}
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
