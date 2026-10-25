import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Logo from "../components/Logo";
import Pill from "../components/Pill";
import SymbolSearch from "../components/SymbolSearch";
import { SkList } from "../components/Skeleton";
import { SectionNav, SectionHead } from "../components/Sections";
import { Avatar, Verified, SetupNotice } from "../components/Social";
import { useAuth } from "../context/AuthContext";
import { lookup } from "../lib/catalog";
import { useQuotes, useMep, assetCurrency, fmtPrice, money, signed, pct, formatDate, tickerUrl } from "../lib/market";
import { timeAgo } from "../lib/social";
import { attempt, toast } from "../lib/feedback";
import {
  PRACTICE_START,
  usePracticeAccount,
  usePracticeTrades,
  usePracticeRanking,
  practicePositions,
  practiceTrade,
  startPractice,
  resetPractice,
  usdPrice,
} from "../lib/practice";

const usd = (n) => money(n, undefined, "USD");
const MEDAL = ["oro", "plata", "bronce"];

/* Modo práctica: una cartera con US$ 10.000 de mentira para comprar y
   vender al precio real, y el ranking de quién va ganando */
export default function Practice() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id;
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const account = usePracticeAccount(uid);
  const trades = usePracticeTrades(uid);
  const acc = account.data;
  const playing = Boolean(acc);
  const positions = useMemo(() => practicePositions(trades.data || []), [trades.data]);
  const fx = useMep();
  const { quotes } = useQuotes(positions.map((p) => p.symbol));
  const [scope, setScope] = useState("all");
  const ranking = usePracticeRanking(scope, Boolean(uid));

  // lo que vale cada posición ahora, en dólares
  const rows = positions.map((p) => {
    const q = quotes[p.symbol];
    const unit = q ? usdPrice(p.symbol, q.price, fx.mep?.rate) : NaN;
    const value = p.qty * unit;
    return { ...p, quote: q, unit, value, gain: value - p.cost, gainPct: p.cost ? (value / p.cost - 1) * 100 : 0 };
  });
  const priced = rows.every((r) => Number.isFinite(r.value));
  const invested = rows.reduce((s, r) => s + (Number.isFinite(r.value) ? r.value : r.cost), 0);
  const cash = acc ? Number(acc.cash) : PRACTICE_START;
  const total = cash + invested;
  const totalPct = (total / PRACTICE_START - 1) * 100;
  const me = ranking.data?.me;

  // a qué operar: ?operar=NVDA (desde un activo) o lo que se toque en la cartera
  const [order, setOrder] = useState(() => ({ side: "buy", symbol: params.get("operar")?.toUpperCase() || "", name: "" }));
  useEffect(() => {
    if (params.has("operar")) setParams({}, { replace: true });
  }, [params, setParams]);
  const operate = (side, p) => {
    setOrder({ side, symbol: p.symbol, name: p.name || "" });
    document.getElementById("operar")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const loaded = account.loaded && (!playing || trades.loaded);

  return (
    <AppShell>
      <section className="page-head">
        <div>
          <span className="kicker">Modo práctica</span>
          <h1>
            Invertí con plata de <em>mentira</em>.
          </h1>
          {playing && loaded && (
            <div className="hpills" aria-label="Tu cartera de práctica">
              <Pill to="#cartera" label="Tu cartera" value={priced ? usd(total) : "…"} delta={priced ? totalPct : null} />
              <Pill to="#ranking" icon="bi-trophy" label="Puesto" value={me ? `${me.rank}° de ${ranking.data.players}` : "—"} />
              <Pill to="#cartera" label="Efectivo" value={usd(cash)} />
            </div>
          )}
        </div>
        {playing && <ResetButton />}
      </section>

      <SetupNotice error={account.error || trades.error} />

      {!loaded ? (
        <section className="block">
          <SkList n={3} />
        </section>
      ) : !playing ? (
        <StartCard ranking={ranking} />
      ) : (
        <>
          <SectionNav
            items={[
              ["cartera", "Tu cartera", "bi-briefcase"],
              ["ranking", "Ranking", "bi-trophy"],
              ["historial", "Historial", "bi-clock-history"],
            ]}
          />

          <section id="cartera" className="block">
            <SectionHead kicker="Cartera" title="Lo que tenés" desc={`Arrancaste con ${usd(PRACTICE_START)} el ${formatDate(acc.started_at.slice(0, 10))}. Se valúa a precio de ahora.`} />
            <div className="pr-grid">
              <div className="pr-left">
                <div className="card pr-sum">
                  <div>
                    <small>Vale</small>
                    <b>{priced ? usd(total) : "…"}</b>
                    {priced && <em className={totalPct >= 0 ? "txt-up" : "txt-down"}>{signed(total - PRACTICE_START, undefined, "USD")} · {pct(totalPct)}</em>}
                  </div>
                  <div>
                    <small>Efectivo</small>
                    <b>{usd(cash)}</b>
                    <em>{Math.round((cash / (total || 1)) * 100)}% sin invertir</em>
                  </div>
                  <div>
                    <small>Invertido</small>
                    <b>{priced ? usd(invested) : "…"}</b>
                    <em>
                      en {rows.length} {rows.length === 1 ? "activo" : "activos"}
                    </em>
                  </div>
                </div>

                {rows.length ? (
                  <ul className="card pr-pos">
                    {rows
                      .sort((a, b) => (b.value || 0) - (a.value || 0))
                      .map((r) => (
                        <li key={r.symbol}>
                          <Link to={tickerUrl(r.symbol)} className="pr-pos-id">
                            <Logo symbol={r.symbol} size={34} />
                            <span>
                              <b>{r.symbol}</b>
                              <small>
                                {r.qty.toLocaleString("es-AR", { maximumFractionDigits: 4 })} · prom. {usd(r.cost / r.qty)}
                              </small>
                            </span>
                          </Link>
                          <span className="pr-pos-num">
                            <b>{Number.isFinite(r.value) ? usd(r.value) : "…"}</b>
                            {Number.isFinite(r.value) && (
                              <small className={r.gain >= 0 ? "txt-up" : "txt-down"}>
                                {signed(r.gain, undefined, "USD")} · {pct(r.gainPct)}
                              </small>
                            )}
                          </span>
                          <span className="pr-pos-acts">
                            <button type="button" className="btn btn-line btn-sm" onClick={() => operate("buy", r)}>
                              Comprar
                            </button>
                            <button type="button" className="btn btn-line btn-sm" onClick={() => operate("sell", r)}>
                              Vender
                            </button>
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="pr-ghost">
                    <div className="card gh-row" aria-hidden="true">
                      <span className="gh-av" />
                      <span className="gh-ln w40" />
                      <span className="gh-pill" />
                    </div>
                    <p>Todavía no compraste nada. Elegí un activo en el panel y arrancá.</p>
                  </div>
                )}
              </div>

              {/* con otro activo u otra operación, el monto arranca vacío */}
              <OrderCard key={order.symbol + order.side} order={order} setOrder={setOrder} cash={cash} positions={rows} mepRate={fx.mep?.rate} />
            </div>
          </section>

          <section id="ranking" className="block">
            <SectionHead kicker="Ranking" title="Quién va ganando" desc="Todos arrancan con lo mismo. Se ordena por lo que vale la cartera ahora.">
              <div className="vx-tabs sm" role="radiogroup" aria-label="Ranking de" style={{ "--n": 2, "--i": scope === "friends" ? 1 : 0 }}>
                <span className="vx-tabs-thumb" aria-hidden="true" />
                {[
                  ["all", "Todos"],
                  ["friends", "Amigos"],
                ].map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={scope === k} className={scope === k ? "on" : ""} onClick={() => setScope(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </SectionHead>
            <Ranking ranking={ranking} uid={uid} scope={scope} />
          </section>

          <section id="historial" className="block">
            <SectionHead kicker="Historial" title="Tus operaciones" desc="Todo lo que compraste y vendiste en el modo práctica." />
            {trades.data.length ? (
              <ul className="card pr-hist">
                {trades.data.map((t) => (
                  <li key={t.id}>
                    <span className={"pr-side " + t.side}>{t.side === "buy" ? "Compra" : "Venta"}</span>
                    <Logo symbol={t.symbol} size={28} />
                    <span className="pr-hist-id">
                      <b>{t.symbol}</b>
                      <small>{timeAgo(t.created_at)}</small>
                    </span>
                    <span className="pr-hist-num">
                      <small>
                        {Number(t.qty).toLocaleString("es-AR", { maximumFractionDigits: 4 })} × {fmtPrice(t.symbol, Number(t.price))}
                      </small>
                      <b>{usd(Number(t.qty) * Number(t.price_usd))}</b>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Cuando operes, va a aparecer acá.</p>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

/* Antes de empezar: qué es, el botón y quién va ganando */
function StartCard({ ranking }) {
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    await attempt(startPractice(), { ok: "¡Listo! Tenés US$ 10.000 para invertir", fail: "No se pudo empezar" });
    setBusy(false);
  };
  const top = ranking.data?.top?.slice(0, 5) || [];
  return (
    <section className="block pr-start">
      <div className="card pr-start-card">
        <span className="pr-coin" aria-hidden="true">
          <i className="bi bi-piggy-bank" />
        </span>
        <h2>Arrancá con {usd(PRACTICE_START)} que no son de verdad.</h2>
        <p>Comprá y vendé CEDEARs, acciones y cripto al precio real del momento, sin arriesgar nada. Es la mejor forma de aprender antes de poner plata.</p>
        <ul>
          <li>
            <i className="bi bi-lightning-charge" /> Precios reales, y los CEDEARs al dólar MEP
          </li>
          <li>
            <i className="bi bi-trophy" /> Un ranking con todos y con tus amigos
          </li>
          <li>
            <i className="bi bi-arrow-counterclockwise" /> Si te va mal, empezás de nuevo cuando quieras
          </li>
        </ul>
        <button type="button" className="btn btn-pink" disabled={busy} onClick={start}>
          <i className="bi bi-play-fill" /> {busy ? "Abriendo tu cuenta…" : "Empezar a practicar"}
        </button>
      </div>
      {top.length > 0 && (
        <div className="card pr-start-top">
          <h3 className="sub-title">Van ganando</h3>
          <ol className="pr-rank compact">
            {top.map((p) => (
              <RankRow key={p.user_id} p={p} />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

/* Comprar (cuántos dólares) o vender (cuántas unidades) */
function OrderCard({ order, setOrder, cash, positions, mepRate }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const { symbol, side } = order;
  const { quotes } = useQuotes(symbol ? [symbol] : []);
  const q = quotes[symbol];
  const unit = q ? usdPrice(symbol, q.price, mepRate) : NaN;
  const held = positions.find((p) => p.symbol === symbol);
  const n = Number(String(amount).replace(",", "."));
  const meta = lookup(symbol);
  const kind = symbol.startsWith("^") || symbol.endsWith("=X");

  const est = side === "buy" ? (n > 0 && unit ? n / unit : 0) : n > 0 && unit ? n * unit : 0;
  const tooMuch = side === "buy" ? n > cash + 0.005 : held ? n > held.qty + 1e-8 : n > 0;
  const ready = symbol && !kind && n > 0 && !tooMuch && Number.isFinite(unit) && !busy;

  const send = async (all = false) => {
    setBusy(true);
    const body = side === "buy" ? { symbol, name: order.name || meta?.name, side, amount: n } : { symbol, side, ...(all ? { all: true } : { qty: n }) };
    const err = await practiceTrade(body);
    setBusy(false);
    if (err) return toast(err, { kind: "error" });
    toast(side === "buy" ? `Compraste ${symbol}` : `Vendiste ${symbol}`);
    setAmount("");
  };

  return (
    <aside id="operar" className="card pr-order">
      <div className="vx-tabs" role="radiogroup" aria-label="Comprar o vender" style={{ "--n": 2, "--i": side === "sell" ? 1 : 0 }}>
        <span className={"vx-tabs-thumb " + side} aria-hidden="true" />
        <button type="button" role="radio" aria-checked={side === "buy"} className={side === "buy" ? "on" : ""} onClick={() => setOrder((o) => ({ ...o, side: "buy" }))}>
          Comprar
        </button>
        <button type="button" role="radio" aria-checked={side === "sell"} className={side === "sell" ? "on" : ""} onClick={() => setOrder((o) => ({ ...o, side: "sell" }))}>
          Vender
        </button>
      </div>

      {symbol ? (
        <div className="tm-picked">
          <Logo symbol={symbol} size={34} />
          <div>
            <b>{symbol}</b>
            <span className={q === null ? "txt-down" : ""}>
              {kind ? "No se puede comprar" : q === null ? "No encontramos cotización" : q ? `${fmtPrice(symbol, q.price)}${assetCurrency(symbol) === "ARS" ? ` · ${usd(unit)}` : ""}` : "…"}
            </span>
          </div>
          <button type="button" className="btn btn-line btn-sm" onClick={() => setOrder((o) => ({ ...o, symbol: "", name: "" }))}>
            Cambiar
          </button>
        </div>
      ) : side === "buy" ? (
        <SymbolSearch onPick={(s) => setOrder((o) => ({ ...o, symbol: s.symbol, name: s.name || "" }))} placeholder="¿Qué querés comprar?" autoFocus={false} />
      ) : (
        <div className="chips">
          {positions.length ? (
            positions.map((p) => (
              <button key={p.symbol} type="button" className="chip" onClick={() => setOrder((o) => ({ ...o, symbol: p.symbol, name: p.name || "" }))}>
                <Logo symbol={p.symbol} size={18} /> {p.symbol}
              </button>
            ))
          ) : (
            <span className="muted small">No tenés nada para vender todavía.</span>
          )}
        </div>
      )}

      {symbol && !kind && (side === "buy" || held) && (
        <>
          <div className="field">
            <label htmlFor="pr-amount" className="sim-lbl">
              {side === "buy" ? "Cuántos dólares" : "Cuántas"}
            </label>
            <div className="in">
              <span className="in-ic pre">{side === "buy" ? "US$" : "#"}</span>
              <input id="pr-amount" type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={side === "buy" ? "1000" : "1"} />
            </div>
            <div className="chips pr-quick">
              {(side === "buy" ? [0.1, 0.25, 0.5, 1] : [0.25, 0.5, 1]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className="chip"
                  onClick={() => setAmount(side === "buy" ? String(Math.floor(cash * f * 100) / 100) : String(+(held.qty * f).toFixed(8)))}
                >
                  {f === 1 ? (side === "buy" ? "Todo el efectivo" : "Todas") : `${f * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="pr-est">
            <span>{side === "buy" ? "Te llevás" : "Recibís"}</span>
            <b>{side === "buy" ? `${est.toLocaleString("es-AR", { maximumFractionDigits: 4 })} ${symbol}` : usd(est)}</b>
          </div>
          {tooMuch && n > 0 && <p className="form-err">{side === "buy" ? `Tenés ${usd(cash)} de efectivo` : `Tenés ${held?.qty.toLocaleString("es-AR", { maximumFractionDigits: 4 })} ${symbol}`}</p>}

          <button type="button" className={"btn " + (side === "buy" ? "btn-pink" : "btn-danger")} disabled={!ready} onClick={() => send(side === "sell" && held && Math.abs(n - held.qty) < 1e-8)}>
            {busy ? "Operando…" : side === "buy" ? `Comprar ${n > 0 ? usd(n) + " de " : ""}${symbol}` : `Vender ${symbol}`}
          </button>
          <small className="sim-note">Al precio de ahora, sin comisiones. Con el mercado cerrado, al último cierre.</small>
        </>
      )}
      {symbol && side === "sell" && !held && <p className="muted small">No tenés {symbol} para vender.</p>}
    </aside>
  );
}

function Ranking({ ranking, uid, scope }) {
  if (!ranking.loaded) return <SkList n={4} />;
  if (ranking.error) return <p className="form-err">{ranking.error}</p>;
  const { top = [], me } = ranking.data || {};
  if (top.length <= 1 && scope === "friends") {
    return (
      <div className="pr-ghost">
        <div className="card gh-row" aria-hidden="true">
          <span className="gh-av" />
          <span className="gh-ln w40" />
          <span className="gh-pill" />
        </div>
        <p>
          Ninguno de tus amigos está jugando. Pasales el link de <b>/practica</b> o <Link to="/comunidad#personas">buscá gente para seguir</Link>.
        </p>
      </div>
    );
  }
  const meInTop = me && top.some((p) => p.user_id === me.user_id);
  return (
    <ol className="card pr-rank">
      {top.map((p) => (
        <RankRow key={p.user_id} p={p} mine={p.user_id === uid} />
      ))}
      {me && !meInTop && (
        <>
          <li className="pr-gap" aria-hidden="true">
            ⋯
          </li>
          <RankRow p={me} mine />
        </>
      )}
    </ol>
  );
}

function RankRow({ p, mine = false }) {
  return (
    <li className={mine ? "me" : ""}>
      <span className={"pr-n " + (MEDAL[p.rank - 1] || "")}>{p.rank <= 3 ? <i className="bi bi-trophy-fill" /> : p.rank}</span>
      <Link to={`/u/${p.username}`} className="pr-who">
        <Avatar name={p.username} size={30} />
        <span>
          <b>
            {p.display_name || p.username}
            {p.verified && <Verified label={p.verified_label} />}
            {mine && <em>vos</em>}
          </b>
          <small>
            {p.trades} {p.trades === 1 ? "operación" : "operaciones"}
            {p.top ? ` · más en ${p.top}` : ""}
          </small>
        </span>
      </Link>
      {p.top && <Logo symbol={p.top} size={24} />}
      <span className="pr-rank-num">
        <b className={p.pct >= 0 ? "txt-up" : "txt-down"}>{pct(p.pct)}</b>
        <small>{usd(p.value)}</small>
      </span>
    </li>
  );
}

/* Empezar de nuevo: se confirma en el mismo botón */
function ResetButton() {
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    setBusy(true);
    await attempt(resetPractice(), { ok: "Volviste a US$ 10.000", fail: "No se pudo reiniciar" });
    setBusy(false);
    setSure(false);
  };
  return sure ? (
    <div className="pr-reset sure" onKeyDown={(e) => e.key === "Escape" && setSure(false)}>
      <span>Se borra todo y volvés a US$ 10.000.</span>
      <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setSure(false)}>
        Cancelar
      </button>
      <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={reset}>
        Empezar de nuevo
      </button>
    </div>
  ) : (
    <div className="pr-reset">
      <button type="button" className="btn btn-line btn-sm" onClick={() => setSure(true)}>
        <i className="bi bi-arrow-counterclockwise" /> Empezar de nuevo
      </button>
    </div>
  );
}
