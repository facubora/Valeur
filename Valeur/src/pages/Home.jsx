import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Onboarding from "../components/Onboarding";
import Sparkline from "../components/Sparkline";
import Logo from "../components/Logo";
import SymbolSearch from "../components/SymbolSearch";
import { useAuth } from "../context/AuthContext";
import { getCandles, useQuotes, fmtPrice, money, signed, pct } from "../lib/market";
import { POPULAR } from "../lib/onboarding";
import { useTrades, useWatchlist, computePositions, addWatch, removeWatch } from "../lib/portfolio";

/* Listas curadas para "Mercado hoy" (símbolos como los entiende Yahoo Finance) */
const MARKET = {
  popular: {
    label: "Populares",
    items: [
      ["AAPL", "Apple"],
      ["MSFT", "Microsoft"],
      ["NVDA", "NVIDIA"],
      ["TSLA", "Tesla"],
      ["AMZN", "Amazon"],
      ["GOOGL", "Alphabet"],
      ["META", "Meta"],
      ["NFLX", "Netflix"],
    ],
  },
  cedears: {
    label: "CEDEARs",
    items: [
      ["AAPL.BA", "Apple"],
      ["TSLA.BA", "Tesla"],
      ["MSFT.BA", "Microsoft"],
      ["NVDA.BA", "NVIDIA"],
      ["AMZN.BA", "Amazon"],
      ["GOOGL.BA", "Alphabet"],
      ["MELI.BA", "MercadoLibre"],
      ["KO.BA", "Coca-Cola"],
    ],
    /* misma lista liquidada en dólares (sufijo D) */
    itemsUsd: [
      ["AAPLD.BA", "Apple"],
      ["TSLAD.BA", "Tesla"],
      ["MSFTD.BA", "Microsoft"],
      ["NVDAD.BA", "NVIDIA"],
      ["AMZND.BA", "Amazon"],
      ["METAD.BA", "Meta"],
      ["MELID.BA", "MercadoLibre"],
      ["KOD.BA", "Coca-Cola"],
    ],
  },
  fx: {
    label: "Monedas y cripto",
    items: [
      ["USDARS=X", "Dólar / Peso"],
      ["EURUSD=X", "Euro / Dólar"],
      ["USDBRL=X", "Dólar / Real"],
      ["BTC-USD", "Bitcoin"],
      ["ETH-USD", "Ethereum"],
      ["SOL-USD", "Solana"],
    ],
  },
  index: {
    label: "Índices",
    items: [
      ["^GSPC", "S&P 500"],
      ["^IXIC", "Nasdaq"],
      ["^DJI", "Dow Jones"],
      ["^MERV", "Merval"],
      ["GLD", "Oro (GLD)"],
    ],
  },
};

function Delta({ value }) {
  const up = value >= 0;
  return (
    <span className={"delta " + (up ? "up" : "down")}>
      <i className={up ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

/* Cierres del último mes para sparklines */
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

const tickerUrl = (s) => `/tickersearch?symbol=${encodeURIComponent(s)}`;

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id;
  const watch = useWatchlist(uid);
  const trades = useTrades(uid);
  const [tab, setTab] = useState("popular");
  const [cedearUsd, setCedearUsd] = useState(false);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const watchSymbols = useMemo(() => watch.rows.map((w) => w.symbol), [watch.rows]);
  const tabItems = useMemo(
    () => (tab === "cedears" && cedearUsd ? MARKET.cedears.itemsUsd : MARKET[tab].items),
    [tab, cedearUsd],
  );
  const tabSymbols = useMemo(() => tabItems.map(([s]) => s), [tabItems]);
  const posSymbols = useMemo(() => [...new Set(trades.rows.map((t) => t.symbol))], [trades.rows]);

  const { quotes, loading: quotesLoading } = useQuotes([...watchSymbols, ...tabSymbols, ...posSymbols]);
  const sparks = useSparks([...watchSymbols, ...tabSymbols]);
  const { positions, totals } = useMemo(
    () => computePositions(trades.rows, quotes),
    [trades.rows, quotes],
  );

  if (!user) return null;

  const followed = new Set(watchSymbols);
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const ready = watch.loaded && trades.loaded;

  return (
    <AppShell>
      <section className="page-head home-head">
        <div>
          <h1>
            {greeting}, <em>{user.username}</em>.
          </h1>
          <p>Qué se mueve hoy en lo que seguís y en el mercado.</p>
        </div>
        <div className="home-search">
          <SymbolSearch
            onPick={({ symbol }) => navigate(tickerUrl(symbol))}
            placeholder="Buscá un activo… AAPL, MELI.BA, BTC"
          />
        </div>
      </section>

      {ready && (
        <Onboarding
          watchCount={watch.rows.length}
          tradesCount={trades.rows.length}
          onFollow={follow}
          busy={busy}
        />
      )}

      {/* Seguidos */}
      <section>
        <div className="sec-head">
          <h2>Tus seguidos</h2>
          {watch.rows.length > 0 && (
            <span className="sub">{quotesLoading ? "actualizando…" : `${watch.rows.length} activos`}</span>
          )}
        </div>
        {!watch.loaded ? (
          <div className="watch-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card watch gh-add loading-box" />
            ))}
          </div>
        ) : watch.rows.length ? (
          <div className="watch-grid">
            {watch.rows.map((w) => {
              const q = quotes[w.symbol];
              const closes = sparks[w.symbol] || [];
              const up = q ? q.change_pct >= 0 : closes.length > 1 && closes.at(-1) >= closes[0];
              return (
                <div key={w.symbol} className="card watch">
                  <Link to={tickerUrl(w.symbol)} className="watch-main">
                    <div className="watch-id">
                      <Logo symbol={w.symbol} size={30} />
                      <div>
                        <b>{w.symbol}</b>
                        <span>{w.name || " "}</span>
                      </div>
                    </div>
                    <Sparkline values={closes} up={up} />
                    <div className="watch-px">
                      <b>{q ? fmtPrice(w.symbol, q.price) : "—"}</b>
                      {q ? <Delta value={q.change_pct} /> : <small>sin datos</small>}
                    </div>
                  </Link>
                  <div className="watch-act">
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
          <div className="follow-empty">
            <span className="lbl">Empezá siguiendo</span>
            <div className="chips">
              {POPULAR.map(([sym, n]) => (
                <button
                  key={sym}
                  type="button"
                  className="chip"
                  disabled={busy === sym}
                  onClick={() => follow({ symbol: sym, name: n })}
                >
                  <i className="bi bi-plus" /> {sym} <span>{n}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Mercado hoy */}
      <section>
        <div className="sec-head">
          <h2>Mercado hoy</h2>
          <Link to="/tickersearch">Ver todo el mercado</Link>
        </div>
        <div className="mkt-bar">
          <div className="seg mkt-tabs" role="tablist" aria-label="Listas de mercado">
            {Object.entries(MARKET).map(([k, v]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                className={tab === k ? "on" : ""}
                onClick={() => setTab(k)}
              >
                {v.label}
              </button>
            ))}
          </div>
          {tab === "cedears" && (
            <div className="seg mkt-ccy" role="radiogroup" aria-label="Moneda">
              <button type="button" role="radio" aria-checked={!cedearUsd} className={!cedearUsd ? "on" : ""} onClick={() => setCedearUsd(false)}>
                En pesos
              </button>
              <button type="button" role="radio" aria-checked={cedearUsd} className={cedearUsd ? "on" : ""} onClick={() => setCedearUsd(true)}>
                En dólares
              </button>
            </div>
          )}
        </div>
        <div className="mkt-grid">
          {tabItems.map(([sym, name]) => {
            const q = quotes[sym];
            const closes = sparks[sym] || [];
            const up = q ? q.change_pct >= 0 : true;
            const isF = followed.has(sym);
            return (
              <div key={sym} className={"card mkt" + (isF ? " on" : "")}>
                <div className="mkt-top">
                  <Link to={tickerUrl(sym)} className="mkt-id">
                    <Logo symbol={sym} size={36} />
                    <div>
                      <b>{name}</b>
                      <span>{sym}</span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className={"star" + (isF ? " on" : "")}
                    disabled={busy === sym || !watch.loaded}
                    onClick={() => (isF ? unfollow(sym) : follow({ symbol: sym, name }))}
                    aria-label={isF ? `Dejar de seguir ${name}` : `Seguir ${name}`}
                    title={isF ? "Siguiendo" : "Seguir"}
                  >
                    <i className={isF ? "bi bi-star-fill" : "bi bi-star"} />
                  </button>
                </div>
                <div className="mkt-bot">
                  <div className="mkt-px">
                    {q ? (
                      <>
                        <b>{fmtPrice(sym, q.price)}</b>
                        <Delta value={q.change_pct} />
                      </>
                    ) : (
                      <>
                        <span className="ph-line" />
                        <span className="ph-line short" />
                      </>
                    )}
                  </div>
                  <div className="mkt-spark">
                    {closes.length ? (
                      <Sparkline values={closes} up={up} width={120} height={36} />
                    ) : (
                      <span className="ph-line" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tu portfolio, resumido */}
      <section>
        <div className="sec-head">
          <h2>Tu portfolio</h2>
          <Link to="/dashboard">Ver portfolio</Link>
        </div>
        {positions.length ? (
          <Link to="/dashboard" className="card pf-strip">
            <div className="pf-main">
              <span className="lbl">Valor total</span>
              <b>{money(totals.value)}</b>
            </div>
            <div className="pf-kv">
              <small>Hoy</small>
              <span className={totals.dayChange >= 0 ? "txt-up" : "txt-down"}>
                {signed(totals.dayChange)} ({pct(totals.dayPct)})
              </span>
            </div>
            <div className="pf-kv">
              <small>Ganancia</small>
              <span className={totals.pnl >= 0 ? "txt-up" : "txt-down"}>
                {signed(totals.pnl)} ({pct(totals.pnlPct)})
              </span>
            </div>
            <div className="pf-kv">
              <small>Posiciones</small>
              <span>{positions.map((p) => p.symbol).join(" · ")}</span>
            </div>
          </Link>
        ) : (
          <Link to="/dashboard" className="card pf-strip empty">
            <span className="tk">
              <i className="bi bi-plus" />
            </span>
            <div>
              <b>Todavía no registraste operaciones</b>
              <span>Cuando lo hagas, acá vas a ver el valor y la ganancia de tu portfolio.</span>
            </div>
          </Link>
        )}
      </section>
    </AppShell>
  );
}
