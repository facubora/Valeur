import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import PortfolioChart from "../components/PortfolioChart";
import TradeModal from "../components/TradeModal";
import Onboarding from "../components/Onboarding";
import Logo from "../components/Logo";
import Donut from "../components/Donut";
import Pill from "../components/Pill";
import { SkPortfolio, SkList } from "../components/Skeleton";
import { SectionNav, SectionHead } from "../components/Sections";
import { useAuth } from "../context/AuthContext";
import { useQuotes, useMep, useDisplayCurrency, assetCurrency, fmtPrice, money, signed, pct, formatDate, tickerUrl } from "../lib/market";
import { useTrades, useWatchlist, computePositions, useHistory, addWatch, deleteTrade, findOversell, downloadTradesCsv } from "../lib/portfolio";
import { attempt } from "../lib/feedback";

const RANGES = [
  ["1m", "1M", "en el mes"],
  ["6m", "6M", "en 6 meses"],
  ["1y", "1A", "en el año"],
  ["max", "Máx", "desde el inicio"],
];

/* Paleta de la composición (rota si hay más posiciones) */
const HUES = [230, 300, 150, 30, 190, 60, 340, 100];
const color = (i) => `oklch(0.62 0.16 ${HUES[i % HUES.length]})`;

/* Portfolio "fantasma": la forma de lo que va a haber, punteada, invitando a
   registrar la primera operación (mientras carga va el esqueleto) */
function PortfolioGhost({ onTrade }) {
  return (
    <div className="pfd-ghost">
      <div className="card pfr ghosted">
        <div className="pfr-main">
          <span className="lbl">Valor total</span>
          <span className="gh-ln w40 big" />
          <svg className="ghost-line" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,96 C60,90 90,70 140,74 S230,40 280,46 S360,20 400,16" />
          </svg>
          <button type="button" className="btn btn-pink btn-sm" onClick={onTrade}>
            <i className="bi bi-plus-lg" /> Registrá tu primera operación
          </button>
        </div>
        <div className="pfr-side">
          <span className="lbl">Composición</span>
          <div className="donut ghost" aria-hidden="true">
            <svg viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="54" />
            </svg>
          </div>
        </div>
      </div>
      <div className="card pv ghosted" aria-hidden="true">
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

/* Una operación. Borrar se confirma en la misma fila; si borrarla dejaría una
   venta posterior sin respaldo, la fila lo explica en vez de borrar. */
function TradeRow({ t, all, onDeleted }) {
  const [ask, setAsk] = useState(null); // null | { bad } | "confirm"
  const buy = t.side === "buy";
  const what = `${buy ? "compra" : "venta"} de ${Number(t.qty)} ${t.symbol}`;
  const tryDelete = () => {
    const bad = findOversell(all.filter((x) => x.id !== t.id));
    setAsk(bad ? { bad } : "confirm");
  };
  const remove = async () => {
    setAsk(null);
    if (await attempt(deleteTrade(t.id), { ok: `Borraste la ${what}`, fail: "No se pudo borrar la operación" })) onDeleted();
  };

  if (ask) {
    const bad = ask.bad;
    return (
      <li className={"trx-ask" + (bad ? " info" : "")} onKeyDown={(e) => e.key === "Escape" && setAsk(null)}>
        <span className="trx-ask-txt">
          <b>{bad ? "No se puede borrar esta compra" : `¿Borrar la ${what}?`}</b>
          <small>
            {bad
              ? `Sin ella, la venta de ${bad.sell} ${bad.symbol} del ${formatDate(bad.date)} quedaría sin respaldo. Borrá primero esa venta.`
              : `Del ${formatDate(t.executed_at)}. Se recalculan tus posiciones y la evolución.`}
          </small>
        </span>
        <div className="nrx-btns">
          <button type="button" className="btn btn-line btn-sm" autoFocus onClick={() => setAsk(null)}>
            {bad ? "Entendido" : "Cancelar"}
          </button>
          {!bad && (
            <button type="button" className="btn btn-danger btn-sm" onClick={remove}>
              <i className="bi bi-trash3" /> Borrar
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link to={tickerUrl(t.symbol)} className="trx-row">
        <span className={"trx-side " + t.side}>{buy ? "Compra" : "Venta"}</span>
        <Logo symbol={t.symbol} size={28} />
        <span className="pfx-name">
          <b>{t.symbol}</b>
          <small>
            {formatDate(t.executed_at)}
            {t.note ? ` · ${t.note}` : ""}
          </small>
        </span>
        <span className="trx-qty">
          {Number(t.qty)} × {fmtPrice(t.symbol, Number(t.price))}
        </span>
        <span className="pfx-val">{money(Number(t.qty) * Number(t.price), undefined, assetCurrency(t.symbol))}</span>
      </Link>
      <span className="nrx-acts">
        <button type="button" className="danger" onClick={tryDelete} aria-label={`Borrar la ${what}`} title="Borrar">
          <i className="bi bi-trash3" />
        </button>
      </span>
    </li>
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
  const [params, setParams] = useSearchParams();
  const [showAll, setShowAll] = useState(false);
  const [tradeSide, setTradeSide] = useState("all");
  const [tradeQuery, setTradeQuery] = useState("");
  const [focus, setFocus] = useState(null); // posición resaltada en la composición
  const [busy, setBusy] = useState("");
  const [cur] = useDisplayCurrency();
  const fx = useMep();

  // Ruta protegida
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const posSymbols = useMemo(() => [...new Set(trades.rows.map((t) => t.symbol))], [trades.rows]);
  const { quotes, loading: quotesLoading } = useQuotes(posSymbols);
  const { positions, totals } = useMemo(
    () => computePositions(trades.rows, quotes, cur, fx.mep),
    [trades.rows, quotes, cur, fx.mep],
  );
  const history = useHistory(trades.rows, range, cur, fx.mep);

  if (!user) return null;

  const held = Object.fromEntries(positions.map((p) => [p.symbol, p.qty]));
  // Si hay activos en otra moneda que la elegida, esperamos el MEP para convertir
  const needsFx = trades.rows.some((t) => assetCurrency(t.symbol) !== cur);
  const ready = trades.loaded && watch.loaded && (!needsFx || fx.loaded);
  // El portfolio se "abre" recién con la primera operación (seguir activos no cuenta)
  const empty = ready && trades.rows.length === 0;

  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  const follow = async ({ symbol, name }) => {
    setBusy(symbol);
    await attempt(addWatch(uid, symbol, name), { ok: `Seguís ${symbol}`, fail: `No se pudo seguir ${symbol}` });
    setBusy("");
    watch.reload();
  };

  // lo ganado en el rango, sin contar lo que pusiste en el medio
  const pts = history.points.filter((p) => Number.isFinite(p.value) && Number.isFinite(p.invested));
  const gainIn = (p) => p.value - p.invested;
  const periodGain = pts.length > 1 ? gainIn(pts.at(-1)) - gainIn(pts[0]) : null;
  const best = positions.reduce((m, p) => (!m || p.pnlPct > m.pnlPct ? p : m), null);
  const worst = positions.reduce((m, p) => (!m || p.pnlPct < m.pnlPct ? p : m), null);

  // operaciones filtradas por tipo y por ticker
  const tq = tradeQuery.trim().toUpperCase();
  const filteredTrades = trades.rows.filter(
    (t) => (tradeSide === "all" || t.side === tradeSide) && (!tq || t.symbol.includes(tq) || (t.name || "").toUpperCase().includes(tq)),
  );
  const shownTrades = showAll ? filteredTrades : filteredTrades.slice(0, 8);

  return (
    <AppShell>
      <section className="page-head">
        <div>
          <span className="kicker">{today.charAt(0).toUpperCase() + today.slice(1)}</span>
          <h1>
            Tu <em>portfolio</em>.
          </h1>
          {/* el portfolio de un vistazo, como las pastillas del Inicio */}
          {ready && !empty && (
            <div className="hpills" aria-label="Tu portfolio en cifras">
              <Pill label="Invertido" value={money(totals.cost, 0, cur)} />
              <Pill label="Ganancia" value={signed(totals.pnl, 0, cur)} delta={totals.pnlPct} />
              {best && positions.length > 1 && <Pill to={tickerUrl(best.symbol)} label="Mejor" value={best.symbol} delta={best.pnlPct} />}
              <Pill label={positions.length === 1 ? "Activo" : "Activos"} value={positions.length} />
            </div>
          )}
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-pink btn-sm" onClick={() => setModal({})}>
            <i className="bi bi-plus-lg" /> Registrar operación
          </button>
        </div>
      </section>

      {trades.error && <p className="form-err">{trades.error}</p>}

      {/* mientras llegan las operaciones y los precios: la forma, en gris */}
      {!ready && (
        <section className="block sk-page" aria-busy="true" aria-label="Cargando tu portfolio">
          <SkPortfolio />
          <SkList n={3} />
        </section>
      )}

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

      {empty && <PortfolioGhost onTrade={() => setModal({})} />}

      {ready && !empty && (
        <>
          <SectionNav
            items={[
              ["resumen", "Resumen", "bi-pie-chart"],
              ...(positions.length ? [["posiciones", "Posiciones", "bi-list-ul"]] : []),
              ["operaciones", "Operaciones", "bi-arrow-left-right"],
            ]}
          />

          {/* Resumen: cuánto vale, cómo evolucionó y en qué está */}
          <section id="resumen" className="block">
            <SectionHead kicker="Hoy" title="Resumen" desc="Cuánto vale, cómo viene y en qué está repartido." />
            <div className="card pfr">
              <div className="pfr-main">
                <div className="pfr-top">
                  <span className="lbl">Valor total</span>
                  <div className="seg pfr-range" role="radiogroup" aria-label="Período del gráfico">
                    {RANGES.map(([k, label]) => (
                      <button key={k} type="button" role="radio" aria-checked={range === k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pfr-value">
                  <span className="pfx-num">{money(totals.value, undefined, cur)}</span>
                  <span className={"pfx-day " + (totals.dayChange >= 0 ? "up" : "down")}>
                    <i className={totals.dayChange >= 0 ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
                    {signed(totals.dayChange, undefined, cur)} · {pct(totals.dayPct)} hoy
                  </span>
                  {/* lo invertido y la ganancia total ya los muestra el gráfico (y al pasar el mouse, de cada día) */}
                  {periodGain != null && (
                    <span className={"pfx-day soft " + (periodGain >= 0 ? "up" : "down")}>
                      {signed(periodGain, undefined, cur)} {RANGES.find(([k]) => k === range)?.[2]}
                    </span>
                  )}
                </div>
                {positions.length ? (
                  <PortfolioChart points={history.points} live={{ value: totals.value, invested: totals.cost }} currency={cur} loading={history.loading} />
                ) : (
                  <p className="muted pfr-none">Vendiste todo: no tenés posiciones abiertas.</p>
                )}
              </div>

              <div className="pfr-side">
                <span className="lbl">Composición</span>
                {positions.length > 0 && (
                  <>
                    <Donut
                      items={positions.map((p, i) => ({ key: p.symbol, label: p.symbol, weight: p.weight, color: color(i) }))}
                      focus={focus}
                      onFocus={setFocus}
                      center={
                        <>
                          <b>{positions.length}</b>
                          <small>{positions.length === 1 ? "activo" : "activos"}</small>
                        </>
                      }
                    />
                    <ul className="pfr-legend" onMouseLeave={() => setFocus(null)}>
                      {positions.slice(0, 6).map((p, i) => (
                        <li key={p.symbol} className={focus && focus !== p.symbol ? "dim" : ""} onMouseEnter={() => setFocus(p.symbol)}>
                          <i style={{ background: color(i) }} />
                          <b>{p.symbol}</b>
                          <span className="w">{p.weight.toFixed(1)}%</span>
                        </li>
                      ))}
                      {positions.length > 6 && <li className="more">y {positions.length - 6} más</li>}
                    </ul>
                  </>
                )}
                {best && worst && positions.length > 1 && (
                  <div className="pfr-bw">
                    <span>
                      <small>Mejor</small>
                      <b>{best.symbol}</b>
                      <em className={best.pnlPct >= 0 ? "txt-up" : "txt-down"}>{pct(best.pnlPct)}</em>
                    </span>
                    <span>
                      <small>Peor</small>
                      <b>{worst.symbol}</b>
                      <em className={worst.pnlPct >= 0 ? "txt-up" : "txt-down"}>{pct(worst.pnlPct)}</em>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Posiciones */}
          {positions.length > 0 && (
            <section id="posiciones" className="block">
              <SectionHead
                kicker="Lo que tenés"
                title="Posiciones"
                desc={`${positions.length} ${positions.length === 1 ? "activo" : "activos"} · ${quotesLoading ? "actualizando precios…" : "precios en vivo"}`}
              />
              <div className="card pv">
                <div className="pv-row pv-head" aria-hidden="true">
                  <span>Activo</span>
                  <span>Cantidad</span>
                  <span>Precio</span>
                  <span>Valor</span>
                  <span>Ganancia</span>
                </div>
                <ul className="pv-list">
                  {positions.map((p, i) => (
                    <li key={p.symbol} className={focus && focus !== p.symbol ? "dim" : ""} onMouseEnter={() => setFocus(p.symbol)} onMouseLeave={() => setFocus(null)}>
                      <Link to={tickerUrl(p.symbol)} className="pv-row">
                        <span className="pv-id">
                          <Logo symbol={p.symbol} size={30} />
                          <span className="pfx-name">
                            <b>{p.symbol}</b>
                            <small>{p.name || p.symbol}</small>
                          </span>
                        </span>
                        <span className="pv-num">
                          {+p.qty.toFixed(6)}
                          <small>prom. {fmtPrice(p.symbol, p.avgCost)}</small>
                        </span>
                        <span className="pv-num">
                          {fmtPrice(p.symbol, p.price)}
                          <small className={p.dayPct >= 0 ? "txt-up" : "txt-down"}>{pct(p.dayPct)} hoy</small>
                        </span>
                        <span className="pv-num">
                          {money(p.value, undefined, cur)}
                          <span className="pv-w" title={`${p.weight.toFixed(1)}% del total`}>
                            <span style={{ width: `${p.weight}%`, background: color(i) }} />
                          </span>
                        </span>
                        <span className={"pv-num " + (p.pnl >= 0 ? "txt-up" : "txt-down")}>
                          {signed(p.pnl, undefined, cur)}
                          <small>{pct(p.pnlPct)}</small>
                        </span>
                      </Link>
                      <span className="nrx-acts pv-acts">
                        <button type="button" onClick={() => setModal({ symbol: p.symbol, name: p.name, side: "buy" })} title={`Comprar ${p.symbol}`}>
                          <i className="bi bi-plus-lg" />
                        </button>
                        <button type="button" className="danger" onClick={() => setModal({ symbol: p.symbol, name: p.name, side: "sell" })} title={`Vender ${p.symbol}`}>
                          <i className="bi bi-dash-lg" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Operaciones */}
          <section id="operaciones" className="block">
            <SectionHead kicker="Historial" title="Operaciones" desc="Todo lo que compraste y vendiste.">
              <div className="seg" role="radiogroup" aria-label="Tipo de operación">
                {[
                  ["all", "Todas"],
                  ["buy", "Compras"],
                  ["sell", "Ventas"],
                ].map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={tradeSide === k} className={tradeSide === k ? "on" : ""} onClick={() => setTradeSide(k)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="search-form compact filter-in">
                <i className="bi bi-funnel ico" aria-hidden="true" />
                <input value={tradeQuery} onChange={(e) => setTradeQuery(e.target.value)} placeholder="Filtrar por ticker" aria-label="Filtrar operaciones" />
                {tradeQuery && (
                  <button type="button" className="filter-x" onClick={() => setTradeQuery("")} aria-label="Limpiar filtro">
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>
              {/* baja lo que se está viendo (con el filtro puesto, solo eso) */}
              <button
                type="button"
                className="btn btn-line btn-sm trx-export"
                disabled={!filteredTrades.length}
                onClick={() => downloadTradesCsv(filteredTrades)}
                title={tradeSide !== "all" || tradeQuery ? "Baja solo las operaciones filtradas" : "Baja todas tus operaciones para abrir en Excel"}
              >
                <i className="bi bi-download" /> Exportar
              </button>
            </SectionHead>
            <div className="card nrx trx">
              {!shownTrades.length ? (
                <p className="mvx-none">No hay operaciones que coincidan con el filtro.</p>
              ) : (
                <ul className="nrx-list">
                  {shownTrades.map((t) => (
                    <TradeRow key={t.id} t={t} all={trades.rows} onDeleted={() => trades.reload()} />
                  ))}
                </ul>
              )}
              {filteredTrades.length > 8 && (
                <button type="button" className="pfx-go trx-more" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Ver menos" : `Ver todas (${filteredTrades.length})`} <i className={showAll ? "bi bi-chevron-up" : "bi bi-chevron-down"} />
                </button>
              )}
            </div>
          </section>
        </>
      )}

      {/* ?operar=1 (desde Tu cuenta) abre el registro directo */}
      <TradeModal
        open={modal !== null || params.has("operar")}
        onClose={() => {
          setModal(null);
          if (params.has("operar")) setParams({}, { replace: true });
        }}
        uid={uid}
        initial={modal || {}}
        held={held}
        trades={trades.rows}
        onSaved={() => trades.reload()}
      />
    </AppShell>
  );
}
