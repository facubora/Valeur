import { useEffect, useRef, useState } from "react";
import { getQuote, useSuggestions, money, today } from "../lib/market";
import { addTrade } from "../lib/portfolio";
import { FormError, SubmitButton } from "./AuthLayout";

const SYMBOL_RE = /^[A-Z0-9.=^-]{1,12}$/;

/* Modal para registrar una compra o venta.
   `held` = { SYM: cantidad } para no vender más de lo que se tiene.
   El formulario se monta al abrir, así arranca limpio con lo prellenado. */
export default function TradeModal({ open, ...props }) {
  return open ? <TradeForm {...props} /> : null;
}

function TradeForm({ onClose, uid, initial = {}, held = {}, onSaved }) {
  const [symbol, setSymbol] = useState(initial.symbol || "");
  const [name, setName] = useState(initial.name || "");
  const [query, setQuery] = useState("");
  const [side, setSide] = useState(initial.side || "buy");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState(null);
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
    getQuote(symbol).then((q) => {
      if (!alive) return;
      setQuote(q);
      if (q) setPrice((p) => (p === "" ? String(q.price) : p));
    });
    return () => {
      alive = false;
    };
  }, [symbol]);

  // Escape cierra
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pick = (s) => {
    setSymbol(s.symbol.toUpperCase());
    setName(s.name || "");
    setQuery("");
    setPrice("");
    setQuote(null);
  };

  const commitQuery = () => {
    const s = query.trim().toUpperCase();
    if (s) pick({ symbol: s, name: "" });
  };

  const q = Number(qty);
  const p = Number(price);
  const total = q > 0 && p >= 0 ? q * p : 0;
  const heldQty = held[symbol] || 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!SYMBOL_RE.test(symbol)) return setError("Elegí un ticker válido");
    if (!(q > 0)) return setError("La cantidad tiene que ser mayor a cero");
    if (!(p >= 0) || price === "") return setError("Ingresá el precio de la operación");
    if (side === "sell" && q > heldQty + 1e-9) {
      return setError(`Solo tenés ${heldQty} ${symbol} para vender`);
    }
    if (date > today()) return setError("La fecha no puede ser futura");
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
    if (err) return setError(err);
    onSaved?.();
    onClose();
  };

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="trade-title">
        <div className="modal-head">
          <h2 id="trade-title">Registrar operación</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <form className="auth-form trade-form" onSubmit={submit} noValidate>
          {/* Activo */}
          <div className="field">
            <label htmlFor="t-symbol">Activo</label>
            {symbol ? (
              <div className="picked">
                <span className="tk">{symbol.slice(0, 4)}</span>
                <div>
                  <b>{symbol}</b>
                  <span>{name || (quote ? money(quote.price) : "…")}</span>
                </div>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    setSymbol("");
                    setName("");
                    setPrice("");
                    setQuote(null);
                    setTimeout(() => firstInput.current?.focus(), 30);
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="search-form compact">
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
          </div>

          {/* Compra / venta */}
          <div className="field">
            <label>Tipo</label>
            <div className="seg full" role="radiogroup" aria-label="Tipo de operación">
              <button type="button" role="radio" aria-checked={side === "buy"} className={side === "buy" ? "on" : ""} onClick={() => setSide("buy")}>
                <i className="bi bi-arrow-down-left" /> Compra
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={side === "sell"}
                className={side === "sell" ? "on sell" : ""}
                onClick={() => setSide("sell")}
              >
                <i className="bi bi-arrow-up-right" /> Venta
              </button>
            </div>
            {side === "sell" && symbol && (
              <small className="hint">Tenés {heldQty} {symbol}</small>
            )}
          </div>

          <div className="row-2">
            <div className="field">
              <label htmlFor="t-qty">Cantidad</label>
              <input id="t-qty" type="number" min="0" step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label htmlFor="t-price">
                Precio por unidad
                {quote && (
                  <button type="button" className="link-btn" onClick={() => setPrice(String(quote.price))}>
                    usar actual {money(quote.price)}
                  </button>
                )}
              </label>
              <input id="t-price" type="number" min="0" step="any" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>

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

          <div className="trade-total">
            <span>Total {side === "buy" ? "invertido" : "recibido"}</span>
            <b>{money(total)}</b>
          </div>

          <FormError error={error} />

          <SubmitButton loading={saving} loadingText="Guardando…" disabled={saving}>
            {side === "buy" ? "Registrar compra" : "Registrar venta"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
