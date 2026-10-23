import { useState } from "react";
import Logo from "./Logo";
import Modal from "./Modal";
import SymbolSearch from "./SymbolSearch";
import { useModalClose } from "../lib/modal";
import { getQuote, useQuotes, fmtPrice } from "../lib/market";
import { lookup, KIND_LABEL } from "../lib/catalog";
import { STANCES, createPost } from "../lib/social";
import { toast } from "../lib/feedback";

const MAX = 500;
const AUDIENCES = [
  ["public", "Todos", "bi-globe2"],
  ["friends", "Amigos", "bi-people"],
];

/* El formulario: activo, qué harías (tres botones grandes), por qué y para
   quién. Con `initialSymbol` el activo ya viene elegido (desde el mercado). */
function RecommendForm({ uid, initialSymbol = "", onDone }) {
  const close = useModalClose();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [stance, setStance] = useState("buy");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("public");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { quotes } = useQuotes(symbol ? [symbol] : []);
  const q = quotes[symbol];
  const meta = symbol ? lookup(symbol) : null;
  const kind = symbol.endsWith(".BA") && meta?.cedear ? "cedear" : meta?.kind;

  const submit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!symbol) return setError("Elegí el activo que recomendás");
    if (text.length < 10) return setError("Contá un poco más por qué (mínimo 10 caracteres)");
    setSaving(true);
    // el ticker tiene que existir: se guarda su precio para seguir cómo le va
    const quote = await getQuote(symbol).catch(() => undefined);
    if (quote === null) {
      setSaving(false);
      return setError(`No encontramos cotización de ${symbol}. Revisá el ticker.`);
    }
    const err = await createPost(uid, { symbol, stance, body: text, audience, price_at: quote?.price ?? null });
    setSaving(false);
    if (err) return setError(/failed to fetch|network/i.test(err) ? "Sin conexión con el servidor. Probá de nuevo." : err);
    toast(audience === "friends" ? "Recomendación publicada para tus amigos" : "Recomendación publicada");
    onDone?.();
    close();
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="rc-body">
        <div>
          <span className="rc-lbl">Activo</span>
          {symbol ? (
            <div className="rc-picked">
              <Logo symbol={symbol} size={40} />
              <span>
                <b>{symbol}</b>
                <small>{[meta?.name, kind && KIND_LABEL[kind]].filter(Boolean).join(" · ") || "Activo"}</small>
              </span>
              <span className="rc-px">
                {q && <b>{fmtPrice(symbol, q.price)}</b>}
                {!initialSymbol && (
                  <button type="button" className="lnk-btn" onClick={() => setSymbol("")}>
                    Cambiar
                  </button>
                )}
              </span>
            </div>
          ) : (
            <div className="rc-pick">
              <SymbolSearch onPick={({ symbol: s }) => (setSymbol(s), setError(""))} placeholder="¿Qué activo? AAPL, MELI.BA, bitcoin…" autoFocus />
            </div>
          )}
        </div>

        <div>
          <span className="rc-lbl">¿Qué harías?</span>
          <div className="rc-stances" role="radiogroup" aria-label="Qué harías">
            {STANCES.map(([k, label, icon]) => (
              <button key={k} type="button" role="radio" aria-checked={stance === k} className={"rc-stance " + k + (stance === k ? " on" : "")} onClick={() => setStance(k)}>
                <i className={"bi " + icon} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="rc-why">
          <span className="rc-lbl">¿Por qué?</span>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value.slice(0, MAX));
              setError("");
            }}
            placeholder="Resultados, valuación, una noticia… contalo en criollo."
            rows={4}
            autoFocus={Boolean(initialSymbol)}
          />
          <small className={body.length > MAX - 40 ? "warn" : ""}>
            {body.length} / {MAX}
          </small>
        </label>

        {error && (
          <p className="ae-err" role="alert">
            <i className="bi bi-exclamation-circle" /> {error}
          </p>
        )}
      </div>

      <div className="rc-foot">
        <div className="vx-tabs sm" role="radiogroup" aria-label="Quién lo ve" style={{ "--n": AUDIENCES.length, "--i": AUDIENCES.findIndex(([k]) => k === audience) }}>
          <span className="vx-tabs-thumb" aria-hidden="true" />
          {AUDIENCES.map(([k, label, icon]) => (
            <button key={k} type="button" role="radio" aria-checked={audience === k} className={audience === k ? "on" : ""} onClick={() => setAudience(k)}>
              <i className={"bi " + icon} /> {label}
            </button>
          ))}
        </div>
        <span className="rc-note">Es tu opinión, no un consejo. Guardamos el precio de hoy para seguir cómo le va.</span>
        <button type="submit" className="btn btn-pink" disabled={saving}>
          <i className="bi bi-send" /> {saving ? "Publicando…" : "Publicar"}
        </button>
      </div>
    </form>
  );
}

/* Recomendar un activo, en el Modal que nace del botón que lo abrió */
export default function RecommendModal({ uid, initialSymbol = "", onClose, onDone }) {
  return (
    <Modal onClose={onClose} label={initialSymbol ? `Recomendar ${initialSymbol}` : "Recomendar un activo"} className="tm rc">
      <RecommendHead symbol={initialSymbol} />
      <RecommendForm uid={uid} initialSymbol={initialSymbol} onDone={onDone} />
    </Modal>
  );
}

function RecommendHead({ symbol }) {
  const close = useModalClose();
  return (
    <div className="tm-head">
      <div>
        <span className="kicker">Comunidad</span>
        <h2>{symbol ? `Recomendá ${symbol}` : "Recomendá un activo"}</h2>
      </div>
      <button type="button" className="tm-x" onClick={close} aria-label="Cerrar">
        <i className="bi bi-x-lg" />
      </button>
    </div>
  );
}
