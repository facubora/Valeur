import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import PortfolioChart from "../components/PortfolioChart";
import Sparkline from "../components/Sparkline";
import SymbolSearch from "../components/SymbolSearch";
import TradeModal from "../components/TradeModal";
import Onboarding from "../components/Onboarding";
import { useAuth } from "../context/AuthContext";
import { getCandles, useQuotes, money, signed, pct, formatDate } from "../lib/market";
import {
  useTrades,
  useWatchlist,
  computePositions,
  useHistory,
  addWatch,
  removeWatch,
  deleteTrade,
} from "../lib/portfolio";

const RANGES = [
  ["1m", "1M"],
  ["6m", "6M"],
  ["1y", "1A"],
  ["max", "Máx"],
];

/* Paleta para la distribución (rota si hay más posiciones) */
const HUES = [230, 300, 150, 30, 190, 60, 340, 100];

function Delta({ value, className = "" }) {
  const up = value >= 0;
  return (
    <span className={`delta ${up ? "up" : "down"} ${className}`}>
      <i className={up ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

/* Cierres del último mes para los sparklines de seguidos */
function useSparks(symbols) {
  const key = [...new Set(symbols)].sort().join(",");
  const [res, setRes] = useState({ key: null, data: {} });
  useEffect(() => {
    if (!key) return;
    let alive = true;
    const syms = key.split(",");
    Promise.all(syms.map((s) => getCandles(s, "daily", "1m"))).then((lists) => {
      if (!alive) return;
      setRes({ key, data: Object.fromEntries(syms.map((s, i) => [s, lists[i].map((c) => c.close)])) });
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return res.data;
}

/* Dashboard "fantasma": la forma de lo que va a haber, sin datos.
   Con `loading` hace de skeleton (barrido de luz) mientras llegan los datos. */
function GhostDashboard({ loading = false, hideWatch = false }) {
  const dash = <span className="gh">—</span>;
  return (
    <div className={"ghost" + (loading ? " loading" : "")} aria-hidden="true">
      <section className="dash-grid">
        <div className="card overview">
          <div className="ov-top">
            <div>
              <span className="lbl">Valor del portfolio</span>
              <div className="ov-val">$0,00</div>
              <div className="ov-deltas gh">
                <span>— hoy</span>
                <span className="sep" />
                <span>— desde que invertís</span>
              </div>
            </div>
            <div className="seg">
              <button type="button" tabIndex={-1}>1M</button>
              <button type="button" tabIndex={-1} className="on">6M</button>
              <button type="button" tabIndex={-1}>1A</button>
              <button type="button" tabIndex={-1}>Máx</button>
            </div>
          </div>
          <div className="ghost-chart">
            <svg viewBox="0 0 600 200" preserveAspectRatio="none">
              <path d="M0,150 C60,140 90,160 140,120 S220,100 280,110 S360,60 420,70 S520,30 600,20" />
            </svg>
          </div>
        </div>
        <div className="card alloc">
          <div className="sec-head">
            <h2>Distribución</h2>
            <span className="sub gh">$0 invertidos</span>
          </div>
          <div className="alloc-bar">
            <span style={{ width: "45%" }} />
            <span style={{ width: "30%" }} />
            <span style={{ width: "25%" }} />
          </div>
          <ul className="alloc-list gh">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <span className="dot" />
                <b>—</b>
                <span className="w">—%</span>
                <span className="pl">—</span>
              </li>
            ))}
          </ul>
          <div className="alloc-foot">
            <span>
              <small>Posiciones</small>
              <b className="gh">0</b>
            </span>
            <span>
              <small>Operaciones</small>
              <b className="gh">0</b>
            </span>
            <span>
              <small>Seguidos</small>
              <b className="gh">0</b>
            </span>
          </div>
        </div>
      </section>

      <section>
        <div className="sec-head">
          <h2>Mis posiciones</h2>
        </div>
        <div className="card pos-list">
          <div className="pos-row head">
            <span>Activo</span>
            <span className="col-shares">Cantidad</span>
            <span className="col-avg">Precio prom.</span>
            <span className="col-price">Precio</span>
            <span>Valor</span>
            <span className="col-pnl">Ganancia</span>
            <span />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="pos-row">
              <div className="pos-sym">
                <span className="tk">
                  <i className="bi bi-plus" />
                </span>
                <div>
                  <b className="gh">Activo</b>
                  <span className="gh">—</span>
                </div>
              </div>
              <div className="pos-num col-shares">{dash}</div>
              <div className="pos-num col-avg">{dash}</div>
              <div className="pos-num col-price">{dash}</div>
              <div className="pos-num">{dash}</div>
              <div className="pos-num col-pnl">{dash}</div>
              <span />
            </div>
          ))}
        </div>
      </section>

      {!hideWatch && (
        <section>
          <div className="sec-head">
            <h2>Seguidos</h2>
          </div>
          <div className="watch-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card watch gh-add">
                <i className="bi bi-plus-lg" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id;

  const trades = useTrades(uid);
  const watch = useWatchlist(uid);
  const [range, setRange] = useState("6m");
  const [modal, setModal] = useState(null); // null | { symbol?, name?, side? }
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState("");

  // Ruta protegida
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const posSymbols = useMemo(() => [...new Set(trades.rows.map((t) => t.symbol))], [trades.rows]);
  const watchSymbols = useMemo(() => watch.rows.map((w) => w.symbol), [watch.rows]);
  const { quotes, loading: quotesLoading } = useQuotes([...posSymbols, ...watchSymbols]);
  const { positions, totals } = useMemo(
    () => computePositions(trades.rows, quotes),
    [trades.rows, quotes],
  );
  const history = useHistory(trades.rows, range);
  const sparks = useSparks(watchSymbols);

  if (!user) return null;

  const held = Object.fromEntries(positions.map((p) => [p.symbol, p.qty]));
  const ready = trades.loaded && watch.loaded;
  // El portfolio se "abre" recién con la primera operación (seguir activos no cuenta)
  const empty = ready && trades.rows.length === 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateLabel = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const follow = async ({ symbol, name }) => {
    setBusy(symbol);
    await addWatch(uid, symbol, name);
    setBusy("");
    watch.reload();
  };
  const unfollow = async (symbol) => {
    setBusy(symbol);
    await removeWatch(uid, symbol);
    setBusy("");
    watch.reload();
  };
  const removeTrade = async (t) => {
    if (!window.confirm(`¿Borrar la ${t.side === "buy" ? "compra" : "venta"} de ${t.qty} ${t.symbol}?`)) return;
    await deleteTrade(t.id);
    trades.reload();
  };

  const shownTrades = showAll ? trades.rows : trades.rows.slice(0, 6);

  /* Seguidos: se muestra real aunque no haya operaciones */
  const watchSection = (
    <section>
      <div className="sec-head">
        <h2>Seguidos</h2>
        <div className="sec-tools">
          <SymbolSearch onPick={follow} placeholder="Seguir un activo…" />
        </div>
      </div>
      {watch.rows.length ? (
        <div className="watch-grid">
          {watch.rows.map((w) => {
            const q = quotes[w.symbol];
            const closes = sparks[w.symbol] || [];
            const up = q ? q.change_pct >= 0 : closes.length > 1 && closes.at(-1) >= closes[0];
            return (
              <div key={w.symbol} className="card watch">
                <Link to={`/tickersearch?symbol=${w.symbol}`} className="watch-main">
                  <div className="watch-id">
                    <b>{w.symbol}</b>
                    <span>{w.name || " "}</span>
                  </div>
                  <Sparkline values={closes} up={up} />
                  <div className="watch-px">
                    <b>{q ? money(q.price) : "—"}</b>
                    {q ? <Delta value={q.change_pct} /> : <small>sin datos</small>}
                  </div>
                </Link>
                <div className="watch-act">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Registrar operación"
                    aria-label={`Operar ${w.symbol}`}
                    onClick={() => setModal({ symbol: w.symbol, name: w.name, side: "buy" })}
                  >
                    <i className="bi bi-plus-lg" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Dejar de seguir"
                    aria-label={`Dejar de seguir ${w.symbol}`}
                    disabled={busy === w.symbol}
                    onClick={() => unfollow(w.symbol)}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card pad muted">
          Todavía no seguís ningún activo. Buscalo arriba o desde el{" "}
          <Link to="/tickersearch" className="lnk">
            mercado
          </Link>
          .
        </div>
      )}
    </section>
  );


  return (
    <AppShell>
      <section className="page-head">
        <div>
          <h1>
            {greeting}, <em>{user.username}</em>.
          </h1>
          <p className="date-line">{dateLabel}</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-pink btn-sm" onClick={() => setModal({})}>
            <i className="bi bi-plus-lg" /> Registrar operación
          </button>
        </div>
      </section>

      {trades.error && <p className="form-err">{trades.error}</p>}

      {/* Cargando: el mismo fantasma, con barrido de luz */}
      {!ready && <GhostDashboard loading />}

      {/* Checklist de arranque (mientras falte algún paso) */}
      {ready && (
        <Onboarding
          watchCount={watch.rows.length}
          tradesCount={trades.rows.length}
          onFollow={follow}
          onTrade={() => setModal({})}
          busy={busy}
        />
      )}

      {/* Sin operaciones: dashboard "fantasma" (los seguidos sí son reales) */}
      {empty && (
        <>
          <GhostDashboard hideWatch={watch.rows.length > 0} />
          {watch.rows.length > 0 && watchSection}
        </>
      )}

      {ready && !empty && (
        <>
          {/* Resumen + evolución + distribución */}
          <section className="dash-grid">
            <div className="card overview">
              <div className="ov-top">
                <div>
                  <span className="lbl">Valor del portfolio</span>
                  <div className="ov-val">{money(totals.value)}</div>
                  <div className="ov-deltas">
                    <Delta value={totals.dayPct} />
                    <span className={totals.dayChange >= 0 ? "txt-up" : "txt-down"}>
                      {signed(totals.dayChange)} hoy
                    </span>
                    <span className="sep" />
                    <span className={totals.pnl >= 0 ? "txt-up" : "txt-down"}>
                      {signed(totals.pnl)} ({pct(totals.pnlPct)}) desde que invertís
                    </span>
                  </div>
                </div>
                <div className="seg" role="group" aria-label="Período">
                  {RANGES.map(([r, label]) => (
                    <button
                      key={r}
                      type="button"
                      className={r === range ? "on" : ""}
                      onClick={() => setRange(r)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {positions.length ? (
                <PortfolioChart points={history.points} loading={history.loading} />
              ) : (
                <div className="ov-none">
                  <p>Todavía no tenés posiciones abiertas.</p>
                  <button type="button" className="btn btn-pink btn-sm" onClick={() => setModal({})}>
                    <i className="bi bi-plus-lg" /> Registrar operación
                  </button>
                </div>
              )}
            </div>

            <div className="card alloc">
              <div className="sec-head">
                <h2>Distribución</h2>
                <span className="sub">{money(totals.cost, 0)} invertidos</span>
              </div>
              {positions.length ? (
                <>
                  <div className="alloc-bar" aria-hidden="true">
                    {positions.map((p, i) => (
                      <span
                        key={p.symbol}
                        style={{ width: `${p.weight}%`, background: `oklch(0.62 0.17 ${HUES[i % HUES.length]})` }}
                        title={`${p.symbol} ${p.weight.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                  <ul className="alloc-list">
                    {positions.map((p, i) => (
                      <li key={p.symbol}>
                        <span className="dot" style={{ background: `oklch(0.62 0.17 ${HUES[i % HUES.length]})` }} />
                        <b>{p.symbol}</b>
                        <span className="w">{p.weight.toFixed(1)}%</span>
                        <span className={"pl " + (p.pnl >= 0 ? "txt-up" : "txt-down")}>{signed(p.pnl, 0)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="muted">Se arma con tus primeras compras.</p>
              )}
              <div className="alloc-foot">
                <span>
                  <small>Posiciones</small>
                  <b>{positions.length}</b>
                </span>
                <span>
                  <small>Operaciones</small>
                  <b>{trades.rows.length}</b>
                </span>
                <span>
                  <small>Seguidos</small>
                  <b>{watch.rows.length}</b>
                </span>
              </div>
            </div>
          </section>

          {/* Posiciones */}
          {positions.length > 0 && (
            <section>
              <div className="sec-head">
                <h2>Mis posiciones</h2>
                <span className="sub">{quotesLoading ? "actualizando precios…" : "precios en vivo"}</span>
              </div>
              <div className="card pos-list">
                <div className="pos-row head" aria-hidden="true">
                  <span>Activo</span>
                  <span className="col-shares">Cantidad</span>
                  <span className="col-avg">Precio prom.</span>
                  <span className="col-price">Precio</span>
                  <span>Valor</span>
                  <span className="col-pnl">Ganancia</span>
                  <span />
                </div>
                {positions.map((p) => (
                  <div key={p.symbol} className="pos-row">
                    <Link to={`/tickersearch?symbol=${p.symbol}`} className="pos-sym" title={`Ver ${p.symbol}`}>
                      <span className="tk">{p.symbol.slice(0, 4)}</span>
                      <div>
                        <b>{p.symbol}</b>
                        <span>{p.name || `${p.qty} unidades`}</span>
                      </div>
                    </Link>
                    <div className="pos-num col-shares">{p.qty}</div>
                    <div className="pos-num col-avg">{money(p.avgCost)}</div>
                    <div className="pos-num col-price">
                      {money(p.price)}
                      <small className={p.dayPct >= 0 ? "txt-up" : "txt-down"}>{pct(p.dayPct)} hoy</small>
                    </div>
                    <div className="pos-num">
                      {money(p.value)}
                      <small>{p.weight.toFixed(1)}% del total</small>
                    </div>
                    <div className={"pos-num col-pnl " + (p.pnl >= 0 ? "txt-up" : "txt-down")}>
                      {signed(p.pnl)}
                      <small>{pct(p.pnlPct)}</small>
                    </div>
                    <div className="pos-act">
                      <button
                        type="button"
                        className="icon-btn"
                        title={`Operar ${p.symbol}`}
                        aria-label={`Operar ${p.symbol}`}
                        onClick={() => setModal({ symbol: p.symbol, name: p.name, side: "buy" })}
                      >
                        <i className="bi bi-arrow-left-right" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {watchSection}

          {/* Operaciones */}
          {trades.rows.length > 0 && (
            <section>
              <div className="sec-head">
                <h2>Operaciones</h2>
                {trades.rows.length > 6 && (
                  <button type="button" className="lnk-btn" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Ver menos" : `Ver todas (${trades.rows.length})`}
                  </button>
                )}
              </div>
              <div className="card trade-list">
                {shownTrades.map((t) => (
                  <div key={t.id} className={"trade-row " + t.side}>
                    <span className="side-ic" aria-hidden="true">
                      <i className={t.side === "buy" ? "bi bi-arrow-down-left" : "bi bi-arrow-up-right"} />
                    </span>
                    <div className="trade-what">
                      <b>
                        {t.side === "buy" ? "Compra" : "Venta"} · {t.symbol}
                      </b>
                      <span>
                        {formatDate(t.executed_at)}
                        {t.note ? ` · ${t.note}` : ""}
                      </span>
                    </div>
                    <div className="trade-nums">
                      <b>{money(Number(t.qty) * Number(t.price))}</b>
                      <span>
                        {Number(t.qty)} × {money(Number(t.price))}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn danger sm"
                      title="Borrar operación"
                      aria-label="Borrar operación"
                      onClick={() => removeTrade(t)}
                    >
                      <i className="bi bi-trash3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <TradeModal
        open={modal !== null}
        onClose={() => setModal(null)}
        uid={uid}
        initial={modal || {}}
        held={held}
        onSaved={() => trades.reload()}
      />
    </AppShell>
  );
}
