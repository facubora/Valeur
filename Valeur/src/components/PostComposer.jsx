import { useState } from "react";
import Logo from "./Logo";
import SymbolSearch from "./SymbolSearch";
import { Avatar } from "./Social";
import { FormError } from "./AuthLayout";
import { getQuote } from "../lib/market";
import { lookup } from "../lib/catalog";
import { STANCES, createPost } from "../lib/social";
import { toast } from "../lib/feedback";

const MAX = 500;

/* Publicar una recomendación sobre un activo.
   Con `initialSymbol` el activo ya viene elegido (desde el mercado). */
export default function PostComposer({ uid, username, initialSymbol = "", onDone, onCancel, autoOpen = false }) {
  const [open, setOpen] = useState(autoOpen || Boolean(initialSymbol));
  const [symbol, setSymbol] = useState(initialSymbol);
  const [stance, setStance] = useState("buy");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("public");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSymbol(initialSymbol);
    setStance("buy");
    setBody("");
    setError("");
    setOpen(autoOpen);
  };

  const submit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!symbol) return setError("Elegí el activo que recomendás");
    if (text.length < 10) return setError("Contá un poco más por qué (mínimo 10 caracteres)");
    if (text.length > MAX) return setError(`Hasta ${MAX} caracteres`);
    setSaving(true);
    // el ticker tiene que existir: se guarda su precio para seguir cómo le va
    const q = await getQuote(symbol).catch(() => undefined);
    if (q === null) {
      setSaving(false);
      return setError(`No encontramos cotización de ${symbol}. Revisá el ticker.`);
    }
    const err = await createPost(uid, {
      symbol,
      stance,
      body: text,
      audience,
      price_at: q?.price ?? null,
    });
    setSaving(false);
    if (err) return setError(/failed to fetch|network/i.test(err) ? "Sin conexión con el servidor. Probá de nuevo." : err);
    toast(audience === "friends" ? "Recomendación publicada para tus amigos" : "Recomendación publicada");
    reset();
    onDone?.();
  };

  if (!open) {
    return (
      <button type="button" className="card composer-closed" onClick={() => setOpen(true)}>
        <Avatar name={username} size={38} />
        <span className="cc-txt">¿Qué activo recomendás hoy?</span>
        <i className="bi bi-pencil-square" />
      </button>
    );
  }

  return (
    <form className="card composer" onSubmit={submit} noValidate>
      <div className="composer-row">
        <Avatar name={username} size={38} />
        {symbol ? (
          <div className="picked">
            <Logo symbol={symbol} size={30} />
            <div>
              <b>{symbol}</b>
              <span>{lookup(symbol)?.name || "Activo"}</span>
            </div>
            {!initialSymbol && (
              <button type="button" className="chip" onClick={() => setSymbol("")}>
                Cambiar
              </button>
            )}
          </div>
        ) : (
          <div className="composer-pick">
            <SymbolSearch onPick={({ symbol: s }) => setSymbol(s)} placeholder="¿Qué activo? AAPL, MELI.BA, BTC…" autoFocus />
          </div>
        )}
      </div>

      <div className="seg full stance-seg" role="radiogroup" aria-label="Recomendación">
        {STANCES.map(([k, label, icon]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={stance === k}
            className={(stance === k ? "on " : "") + k}
            onClick={() => setStance(k)}
          >
            <i className={"bi " + icon} /> {label}
          </button>
        ))}
      </div>

      <div className="field">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX))}
          placeholder="¿Por qué? Resultados, valuación, una noticia…"
          rows={3}
          aria-label="Por qué lo recomendás"
        />
        <small className={"count" + (body.length > MAX - 40 ? " warn" : "")}>
          {body.length}/{MAX}
        </small>
      </div>

      <FormError error={error} />

      <div className="composer-foot">
        <div className="seg" role="radiogroup" aria-label="Quién lo ve">
          <button type="button" role="radio" aria-checked={audience === "public"} className={audience === "public" ? "on" : ""} onClick={() => setAudience("public")}>
            <i className="bi bi-globe2" /> Todos
          </button>
          <button type="button" role="radio" aria-checked={audience === "friends"} className={audience === "friends" ? "on" : ""} onClick={() => setAudience("friends")}>
            <i className="bi bi-people" /> Amigos
          </button>
        </div>
        <div className="composer-btns">
          <button
            type="button"
            className="btn btn-line btn-sm"
            onClick={() => {
              reset();
              onCancel?.();
            }}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn-pink btn-sm" disabled={saving}>
            {saving ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
      <p className="disclaimer">Es tu opinión, no un consejo financiero. Se guarda el precio de hoy para seguir cómo le va.</p>
    </form>
  );
}
