import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Onboarding from "../components/Onboarding";
import Logo from "../components/Logo";
import TradeModal from "../components/TradeModal";
import PortfolioSummary, { PortfolioSummaryEmpty } from "../components/PortfolioSummary";
import AlertRows from "../components/AlertRows";
import { PostTile } from "../components/Social";
import { SectionNav, SectionHead } from "../components/Sections";
import { ForYouCards, ForYouStart } from "../components/MarketBits";
import { useAuth } from "../context/AuthContext";
import {
  useBatch,
  useAgo,
  useMep,
  useDisplayCurrency,
  useMarketStatus,
  priceIn,
  money,
  signed,
  pct,
  tickerUrl,
} from "../lib/market";
import { POPULAR } from "../lib/onboarding";
import { SECTORS, lookup } from "../lib/catalog";
import { useTrades, useWatchlist, computePositions, addWatch, removeWatch } from "../lib/portfolio";
import { useAlerts } from "../lib/alerts";
import { useMyProfile, updateProfile, useFollowGraph, useFeed } from "../lib/social";
import { useForYou } from "../lib/foryou";
import { toast, attempt, confirmDialog } from "../lib/feedback";

const abs = (n) => Math.abs(n).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";

/* Una cifra del día en una pastilla: etiqueta, valor y variación con flecha.
   Con `to` es un link. */
function Pill({ to, label, value, delta }) {
  const up = delta >= 0;
  const body = (
    <>
      <span className="hp-l">{label}</span>
      {value && <b>{value}</b>}
      {delta != null && Number.isFinite(delta) && (
        <em className={up ? "up" : "down"}>
          <i className={up ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
          {abs(delta)}
        </em>
      )}
    </>
  );
  return to ? (
    <Link to={to} className="hp">
      {body}
    </Link>
  ) : (
    <span className="hp">{body}</span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id;
  const watch = useWatchlist(uid);
  const trades = useTrades(uid);
  const alerts = useAlerts(uid);
  const profile = useMyProfile(uid);
  const graph = useFollowGraph(uid);
  const feed = useFeed({ uid, mode: "following", following: graph.loaded ? graph.following : null, limit: 30 });
  const [busy, setBusy] = useState("");
  const [leaving, setLeaving] = useState("");
  // cuántas fichas entran por fila en el tablero de seguidos (para completar
  // la primera fila con fichas punteadas)
  const wltRef = useRef(null);
  const [wltCols, setWltCols] = useState(4);
  const hasWatch = watch.rows.length > 0;
  useEffect(() => {
    const el = wltRef.current;
    if (!el) return;
    const measure = () => setWltCols(getComputedStyle(el).gridTemplateColumns.split(" ").length);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasWatch]);
  const [trade, setTrade] = useState(false);
  const [cur] = useDisplayCurrency();
  const fx = useMep();
  const rate = fx.mep?.rate;
  const status = useMarketStatus();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const fy = useForYou({ uid, profile: profile.data, watchRows: watch.rows, tradeRows: trades.rows, posts: feed.data, limit: 8 });
  const watchSymbols = useMemo(() => watch.rows.map((w) => w.symbol), [watch.rows]);
  const posSymbols = useMemo(() => [...new Set(trades.rows.map((t) => t.symbol))], [trades.rows]);
  const posts = useMemo(() => feed.data.filter((p) => p.user_id !== uid).slice(0, 6), [feed.data, uid]);
  const activeAlerts = useMemo(() => alerts.data.filter((a) => a.active), [alerts.data]);

  const mkt = useBatch([
    "^MERV",
    ...watchSymbols,
    ...posSymbols,
    ...activeAlerts.map((a) => a.symbol),
    ...fy.recs.map((r) => r.symbol),
    ...posts.map((p) => p.symbol),
  ]);
  const { quotes, sparks } = mkt;
  const ago = useAgo(mkt.updatedAt);
  const { positions, totals } = useMemo(() => computePositions(trades.rows, quotes, cur, fx.mep), [trades.rows, quotes, cur, fx.mep]);

  // lo tuyo (seguidos + posiciones) ordenado por cómo le fue hoy
  const movers = useMemo(() => {
    const names = Object.fromEntries([...watch.rows, ...trades.rows].map((r) => [r.symbol, r.name]));
    return [...new Set([...watchSymbols, ...posSymbols])]
      .filter((s) => quotes[s])
      .map((s) => ({ symbol: s, name: names[s] || lookup(s)?.name || s, q: quotes[s], held: posSymbols.includes(s) }))
      .sort((a, b) => b.q.change_pct - a.q.change_pct);
  }, [watchSymbols, posSymbols, quotes, watch.rows, trades.rows]);
  const ups = movers.filter((m) => m.q.change_pct >= 0).slice(0, 4);
  const downs = movers.filter((m) => m.q.change_pct < 0).reverse().slice(0, 4);

  if (!user) return null;

  const followed = new Set(watchSymbols);
  const held = Object.fromEntries(positions.map((p) => [p.symbol, p.qty]));
  const follow = async ({ symbol, name }) => {
    // si la ficha se había ido hace un rato, que no vuelva "yéndose"
    if (leaving === symbol) setLeaving("");
    setBusy(symbol);
    await attempt(addWatch(uid, symbol, name || lookup(symbol)?.name || null), { ok: `Seguís ${symbol}`, fail: `No se pudo seguir ${symbol}` });
    setBusy("");
    watch.reload();
  };
  const unfollow = async (symbol) => {
    const row = watch.rows.find((w) => w.symbol === symbol);
    setBusy(symbol);
    const ok = await attempt(removeWatch(uid, symbol), { fail: `No se pudo dejar de seguir ${symbol}` });
    setBusy("");
    watch.reload();
    if (ok) {
      toast(`Dejaste de seguir ${symbol}`, {
        action: {
          label: "Deshacer",
          run: () => {
            setLeaving("");
            addWatch(uid, symbol, row?.name || null).then(() => watch.reload());
          },
        },
      });
    }
    return ok;
  };
  // la ficha se va (animación) y recién después se deja de seguir
  const dropTile = async (symbol) => {
    const yes = await confirmDialog({
      title: `¿Dejar de seguir ${symbol}?`,
      body: "Sale de tus seguidos y de la cinta de arriba. Lo podés volver a seguir cuando quieras.",
      confirmText: "Dejar de seguir",
      danger: true,
      icon: "bi-star",
    });
    if (!yes) return;
    setLeaving(symbol);
    await new Promise((r) => setTimeout(r, 300));
    // si salió bien, la ficha ya no vuelve (se va con el reload); si falló, reaparece
    if (!(await unfollow(symbol))) setLeaving("");
  };
  const addInterest = async (k) => {
    if (!profile.data) return;
    setBusy(k);
    await attempt(updateProfile(uid, { interests: [...new Set([...fy.interests, k])] }), { fail: "No se pudo guardar el rubro" });
    setBusy("");
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const fecha = now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const today = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  const ready = watch.loaded && trades.loaded;

  // lo que más se mueve de lo tuyo, para un lado o para el otro
  const merv = quotes["^MERV"];
  const top = movers.reduce((m, x) => (!m || Math.abs(x.q.change_pct) > Math.abs(m.q.change_pct) ? x : m), null);
  const mepRecent = fx.mep?.recent || [];
  const mepDay = mepRecent.length > 1 ? (mepRecent.at(-1) / mepRecent.at(-2) - 1) * 100 : null;


  return (
    <AppShell>
      <section className="home-hero">
        <div className="hh-main">
          <span className="kicker">
            {today}
            {status.map((m) => (
              <span key={m.key} className={"hh-mk" + (m.open ? " open" : "")}>
                <i /> {m.key} {m.open ? "abierto" : "cerrado"}
              </span>
            ))}
          </span>
          <h1>
            {greeting}, <em>{user.username}</em>.
          </h1>
        </div>

        <div className="hpills" aria-label="Resumen del día">
          {positions.length ? (
            // hasta que llegan los precios no hay variación que mostrar
            posSymbols.some((sym) => quotes[sym]) && <Pill to="/dashboard" label="Tu portfolio" value={signed(totals.dayChange, undefined, cur)} delta={totals.dayPct} />
          ) : (
            <button type="button" className="hp hp-add" onClick={() => setTrade(true)}>
              <i className="bi bi-plus-lg" /> Registrá tu primera operación
            </button>
          )}
          {top && <Pill to={tickerUrl(top.symbol)} label={top.symbol} delta={top.q.change_pct} />}
          {merv && <Pill to={tickerUrl("^MERV")} label="Merval" delta={merv.change_pct} />}
          {fx.mep && <Pill label="MEP" value={money(fx.mep.rate, 0, "ARS")} delta={mepDay} />}
        </div>
      </section>

      {ready && <Onboarding watchCount={watch.rows.length} tradesCount={trades.rows.length} onFollow={follow} busy={busy} />}

      {mkt.error && (
        <div className="net-notice" role="alert">
          <i className="bi bi-wifi-off" />
          <div>
            <b>No pudimos traer los precios del mercado.</b>
            <span>{mkt.updatedAt ? `Te mostramos los últimos que teníamos (${ago}).` : "Revisá tu conexión o que el servidor esté levantado."}</span>
          </div>
          <button type="button" className="btn btn-line btn-sm" onClick={mkt.refresh}>
            <i className="bi bi-arrow-clockwise" /> Reintentar
          </button>
        </div>
      )}

      <SectionNav
        items={[
          ["resumen", "Tu portfolio", "bi-wallet2"],
          ["movimientos", "Movimientos", "bi-activity"],
          ...(activeAlerts.length ? [["alertas", "Alertas", "bi-bell"]] : []),
          ["seguidos", "Seguidos", "bi-star"],
          ["para-vos", "Para vos", "bi-stars"],
          ["comunidad", "Comunidad", "bi-people"],
        ]}
      />

      {/* Portfolio */}
      <section id="resumen" className="block">
        <SectionHead kicker="Hoy" title="Tu portfolio" desc="Cuánto vale y cómo viene el día.">
          <button type="button" className="btn btn-pink btn-sm" onClick={() => setTrade(true)}>
            <i className="bi bi-plus-lg" /> Registrar operación
          </button>
        </SectionHead>

        {positions.length ? (
          <PortfolioSummary positions={positions} totals={totals} cur={cur} />
        ) : (
          <PortfolioSummaryEmpty onTrade={() => setTrade(true)} />
        )}
      </section>

      {/* Movimientos de lo tuyo */}
      <section id="movimientos" className="block">
        <SectionHead kicker="En el día" title="Movimientos" desc="Lo que más subió y lo que más bajó hoy de lo que seguís y tenés." />
        {movers.length ? (
          <div className="card mvx">
            {[
              ["Suben", "up", ups, "Nada de lo tuyo sube hoy."],
              ["Bajan", "down", downs, "Nada de lo tuyo baja hoy."],
            ].map(([title, kind, list, none]) => (
              <div key={kind} className={"mvx-col " + kind}>
                <div className="mvx-head">
                  <i className={kind === "up" ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
                  <b>{title}</b>
                  <small>{list.length}</small>
                </div>
                {list.length ? (
                  <ul className="pfx-list">
                    {list.map((m) => (
                      <li key={m.symbol}>
                        <Link to={tickerUrl(m.symbol)}>
                          <Logo symbol={m.symbol} size={28} />
                          <span className="pfx-name">
                            <b>
                              {m.symbol}
                              {m.held && <i className="bi bi-wallet2 mvx-held" title="En tu cartera" aria-label="En tu cartera" />}
                            </b>
                            <small>{m.name}</small>
                          </span>
                          <span className="pfx-val">{priceIn(m.symbol, m.q.price, cur, rate)}</span>
                          <span className={"pfx-chg " + (kind === "up" ? "txt-up" : "txt-down")}>{pct(m.q.change_pct)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mvx-none">{none}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card mvx ghosted" aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i} className="mvx-col">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="gh-row">
                    <span className="gh-box">+</span>
                    <span className="gh-ln w60" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alertas cercanas */}
      {activeAlerts.length > 0 && (
        <section id="alertas" className="block">
          <SectionHead kicker="Avisos" title="Tus alertas" desc="Cuánto le falta a cada una para saltar.">
            <Link to="/tickersearch#alertas" className="btn btn-line btn-sm">
              Administrar
            </Link>
          </SectionHead>
          <AlertRows alerts={activeAlerts.slice(0, 6)} quotes={quotes} existing={alerts.data} />
        </section>
      )}

      {/* Seguidos */}
      <section id="seguidos" className="block">
        <SectionHead
          kicker="Tu lista"
          title="Tus seguidos"
          desc={watch.rows.length ? `${watch.rows.length} activos · actualizado ${mkt.loading ? "ahora" : ago}` : "Lo que seguís, sin necesidad de comprarlo."}
        >
          <Link to="/tickersearch" className="btn btn-line btn-sm">
            <i className="bi bi-search" /> Explorar mercado
          </Link>
        </SectionHead>
        {!watch.loaded ? (
          <div className="card asset-list loading-box home-loading" />
        ) : watch.rows.length ? (
          <div ref={wltRef} className="wlt">
            {watch.rows.map((w) => {
              const q = quotes[w.symbol];
              const up = q ? q.change_pct >= 0 : null;
              return (
                <div key={w.symbol} className={"card wlt-tile" + (up === null ? "" : up ? " up" : " down") + (leaving === w.symbol ? " out" : "")}>
                  <Link to={tickerUrl(w.symbol)} className="wlt-in">
                    <span className="wlt-id">
                      <Logo symbol={w.symbol} size={24} />
                      <b>{w.symbol}</b>
                    </span>
                    <span className="wlt-px">{q ? priceIn(w.symbol, q.price, cur, rate) : "—"}</span>
                    <span className="wlt-chg">
                      {q && <i className={up ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />}
                      {q ? pct(q.change_pct) : "sin datos"}
                    </span>
                  </Link>
                  <button type="button" className="wlt-x" disabled={busy === w.symbol} onClick={() => dropTile(w.symbol)} aria-label={`Dejar de seguir ${w.symbol}`} title="Dejar de seguir">
                    <i className="bi bi-x" />
                  </button>
                </div>
              );
            })}
            {/* hasta llenar la primera fila, fichas punteadas para sumar más */}
            {Array.from({ length: Math.max(0, wltCols - watch.rows.length) }, (_, i) => (
              <Link key={`gh${i}`} to="/tickersearch#explorar" className="wlt-ghost" aria-label="Seguir otro activo">
                <span className="gh-box">+</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="follow-empty">
            <span className="lbl">Empezá siguiendo</span>
            <div className="chips">
              {POPULAR.map(([sym, n]) => (
                <button key={sym} type="button" className="chip" disabled={busy === sym} onClick={() => follow({ symbol: sym, name: n })}>
                  <i className="bi bi-plus" /> {sym} <span>{n}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Para vos */}
      <section id="para-vos" className="block">
        <SectionHead kicker="Ideas" title="Para vos" desc="Según tus rubros, lo que seguís y lo que recomienda tu comunidad.">
          <Link to="/tickersearch#para-vos" className="btn btn-line btn-sm">
            Ver más ideas
          </Link>
        </SectionHead>
        {fy.recs.length ? (
          <ForYouCards
            recs={fy.recs}
            quotes={quotes}
            sparks={sparks}
            cur={cur}
            rate={rate}
            followed={followed}
            busy={busy}
            onStar={(r) => (followed.has(r.symbol) ? unfollow(r.symbol) : follow(r))}
            onHide={fy.hide}
          />
        ) : (
          <ForYouStart sectors={SECTORS} busy={busy} disabled={!profile.data} onPick={addInterest} wide />
        )}
      </section>

      {/* Comunidad */}
      <section id="comunidad" className="block">
        <SectionHead kicker="Comunidad" title="Lo que recomiendan" desc="Lo último de las personas que seguís.">
          <Link to="/comunidad" className="btn btn-line btn-sm">
            <i className="bi bi-people" /> Ir a la comunidad
          </Link>
        </SectionHead>
        {posts.length ? (
          <div className="post-grid">
            {posts.map((p) => (
              <PostTile key={p.id} post={p} quote={quotes[p.symbol]} />
            ))}
          </div>
        ) : (
          <div className="post-grid ghosted" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card post-tile gh-tile">
                <div className="pt-head">
                  <span className="gh-av" />
                  <span className="gh-ln w40" />
                </div>
                <span className="gh-ln w60" />
                <span className="gh-ln w90" />
              </div>
            ))}
          </div>
        )}
      </section>

      <TradeModal open={trade} onClose={() => setTrade(false)} uid={uid} initial={{ side: "buy" }} held={held} trades={trades.rows} onSaved={() => trades.reload()} />
    </AppShell>
  );
}
