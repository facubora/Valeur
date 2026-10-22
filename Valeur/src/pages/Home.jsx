import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Onboarding from "../components/Onboarding";
import Logo from "../components/Logo";
import TradeModal from "../components/TradeModal";
import PortfolioSummary, { PortfolioSummaryEmpty } from "../components/PortfolioSummary";
import { PostTile } from "../components/Social";
import { SectionNav, SectionHead } from "../components/Sections";
import { Delta, AssetRow, ForYouCards, ForYouStart } from "../components/MarketBits";
import { useAuth } from "../context/AuthContext";
import {
  useBatch,
  useAgo,
  useMep,
  useDisplayCurrency,
  useMarketStatus,
  fmtPrice,
  priceIn,
  money,
  signed,
  pct,
  tickerUrl,
} from "../lib/market";
import { POPULAR } from "../lib/onboarding";
import { SECTORS, SECTOR, lookup } from "../lib/catalog";
import { useTrades, useWatchlist, computePositions, addWatch, removeWatch } from "../lib/portfolio";
import { useAlerts, alertText } from "../lib/alerts";
import { useMyProfile, updateProfile, useFollowGraph, useFeed } from "../lib/social";
import { useForYou } from "../lib/foryou";
import { toast, attempt } from "../lib/feedback";

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

/* Cuánto le falta a una alerta para saltar → { progress 0..1, text } */
function alertGap(a, q) {
  if (!q) return null;
  const v = Number(a.value);
  if (a.kind === "above") return { progress: Math.min(q.price / v, 1), text: `falta subir ${abs((v / q.price - 1) * 100)}` };
  if (a.kind === "below") return { progress: Math.min(v / q.price, 1), text: `falta bajar ${abs((1 - v / q.price) * 100)}` };
  const day = a.kind === "up_pct" ? Math.max(q.change_pct, 0) : Math.max(-q.change_pct, 0);
  return { progress: Math.min(day / v, 1), text: `hoy ${pct(q.change_pct)} de ${a.kind === "up_pct" ? "+" : "−"}${abs(v)}` };
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
        action: { label: "Deshacer", run: () => addWatch(uid, symbol, row?.name || null).then(() => watch.reload()) },
      });
    }
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
          <div className="movers">
            {[
              ["Subieron", "bi-arrow-up-right", "up", ups],
              ["Bajaron", "bi-arrow-down-right", "down", downs],
            ].map(([title, icon, kind, list]) => (
              <div key={kind} className={"card movers-col " + kind}>
                <div className="mc-head">
                  <span className="mc-ic">
                    <i className={"bi " + icon} />
                  </span>
                  <b>{title}</b>
                  <small>{list.length}</small>
                </div>
                {list.length ? (
                  <ul>
                    {list.map((m) => (
                      <li key={m.symbol}>
                        <Link to={tickerUrl(m.symbol)} className="mv-row">
                          <Logo symbol={m.symbol} size={30} />
                          <div>
                            <b>{m.name}</b>
                            <span>
                              {m.symbol}
                              {m.held && <em className="tag soft">en cartera</em>}
                            </span>
                          </div>
                          <span className="mv-px">{priceIn(m.symbol, m.q.price, cur, rate)}</span>
                          <Delta value={m.q.change_pct} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small mc-none">{kind === "up" ? "Nada de lo tuyo sube hoy." : "Nada de lo tuyo baja hoy."}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="movers ghosted" aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i} className="card movers-col gh-col">
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
          <div className="near-grid">
            {activeAlerts.slice(0, 6).map((a) => {
              const q = quotes[a.symbol];
              const gap = alertGap(a, q);
              return (
                <Link key={a.id} to={tickerUrl(a.symbol)} className="card near">
                  <div className="near-top">
                    <Logo symbol={a.symbol} size={30} />
                    <div>
                      <b>{a.symbol}</b>
                      <span>{alertText(a)}</span>
                    </div>
                  </div>
                  <div className="near-bar">
                    <span style={{ width: `${(gap?.progress ?? 0) * 100}%` }} />
                  </div>
                  <div className="near-foot">
                    <span>{q ? fmtPrice(a.symbol, q.price) : "—"}</span>
                    <small>{gap?.text || "sin datos"}</small>
                  </div>
                </Link>
              );
            })}
          </div>
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
          <div className="card asset-list">
            {watch.rows.map((w) => (
              <AssetRow
                key={w.symbol}
                symbol={w.symbol}
                name={w.name || lookup(w.symbol)?.name}
                tag={SECTOR[lookup(w.symbol)?.tags[0]]?.label}
                quote={quotes[w.symbol]}
                closes={sparks[w.symbol]}
                cur={cur}
                rate={rate}
                busy={busy === w.symbol}
                onRemove={() => unfollow(w.symbol)}
              />
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
