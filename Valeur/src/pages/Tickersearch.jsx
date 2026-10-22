import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import AssetChart from "../components/AssetChart";
import AlertsCard from "../components/AlertsCard";
import Logo from "../components/Logo";
import PostComposer from "../components/PostComposer";
import ProfileModal from "../components/ProfileModal";
import SymbolSearch from "../components/SymbolSearch";
import TradeModal from "../components/TradeModal";
import { PostCard, GhostPosts } from "../components/Social";
import { Delta, CurrencyPick, AssetRow, ForYouCards, ForYouStart } from "../components/MarketBits";
import { SectionNav, SectionHead } from "../components/Sections";
import {
  useSuggestions,
  useQuotes,
  useBatch,
  useAgo,
  useMep,
  useDisplayCurrency,
  searchSymbols,
  tickerUrl,
  fmtPrice,
  priceIn,
  isConverted,
  assetCurrency,
} from "../lib/market";
import { SECTOR, SECTORS, KIND_LABEL, TABS, listFor, lookup, similarTo } from "../lib/catalog";
import { markMarketVisited } from "../lib/onboarding";
import { useWatchlist, addWatch, removeWatch, useTrades, computePositions } from "../lib/portfolio";
import { useAlerts } from "../lib/alerts";
import { useMyProfile, updateProfile, useFollowGraph, useFeed, STANCE } from "../lib/social";
import { useForYou, useStoredList } from "../lib/foryou";
import { toast, attempt } from "../lib/feedback";

/* Datos que comparten el explorador y el detalle */
function useMarketContext(uid) {
  const watch = useWatchlist(uid);
  const trades = useTrades(uid);
  const alerts = useAlerts(uid);
  const profile = useMyProfile(uid);
  const graph = useFollowGraph(uid);
  const feed = useFeed({ uid, mode: "following", following: graph.loaded ? graph.following : null, limit: 60 });

  const followed = useMemo(() => new Set(watch.rows.map((w) => w.symbol)), [watch.rows]);
  const held = useMemo(
    () => Object.fromEntries(computePositions(trades.rows).positions.map((p) => [p.symbol, p.qty])),
    [trades.rows],
  );
  const toggleWatch = async (symbol, name) => {
    if (!uid) return;
    const label = name || lookup(symbol)?.name || null;
    if (followed.has(symbol)) {
      const ok = await attempt(removeWatch(uid, symbol), { fail: `No se pudo dejar de seguir ${symbol}` });
      if (ok) {
        toast(`Dejaste de seguir ${symbol}`, {
          action: { label: "Deshacer", run: () => addWatch(uid, symbol, label).then(() => watch.reload()) },
        });
      }
    } else {
      await attempt(addWatch(uid, symbol, label), { ok: `Seguís ${symbol}`, fail: `No se pudo seguir ${symbol}` });
    }
    watch.reload();
  };
  return { watch, trades, alerts, profile, graph, feed, followed, held, toggleWatch };
}

export default function TickerSearch() {
  const { user } = useAuth();
  const uid = user?.id;
  const [params, setParams] = useSearchParams();
  const symbol = (params.get("symbol") || "").trim().toUpperCase();
  const ctx = useMarketContext(uid);
  const [recent, setRecent] = useStoredList("valeur-recent", ["AAPL", "NVDA", "MELI.BA"]);

  useEffect(() => {
    markMarketVisited();
  }, []);

  // cada activo que se abre queda en "Recientes"
  useEffect(() => {
    if (symbol && recent[0] !== symbol) setRecent([symbol, ...recent.filter((x) => x !== symbol)].slice(0, 8));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const open = (s) => setParams(s ? { symbol: s.toUpperCase() } : {});

  return (
    <AppShell>
      {symbol ? (
        <AssetDetail key={symbol} symbol={symbol} uid={uid} user={user} ctx={ctx} onOpen={open} />
      ) : (
        <Explore uid={uid} user={user} ctx={ctx} recent={recent} onOpen={open} />
      )}
    </AppShell>
  );
}

/* ═══════════════════════════ Explorador ═══════════════════════════════ */

/* Buscador con sugerencias + recientes en la misma franja */
function SearchBar({ onOpen, recent }) {
  const [input, setInput] = useState("");
  const [focus, setFocus] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const suggestions = useSuggestions(input);
  const showSuggest = focus && suggestions.length > 0;

  const go = (raw) => {
    const s = raw.trim().toUpperCase();
    if (!s) return;
    setInput("");
    setCursor(-1);
    onOpen(s);
  };
  const onKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      go(cursor >= 0 && suggestions[cursor] ? suggestions[cursor].symbol : input);
    } else if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setCursor((c) => (c + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setCursor((c) => (c <= 0 ? suggestions.length - 1 : c - 1));
    } else if (e.key === "Escape") {
      setFocus(false);
    }
  };

  return (
    <section className="mkt-searchbar">
      <div className="search-form" role="search">
        <i className="bi bi-search ico" aria-hidden="true" />
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value.toUpperCase());
            setCursor(-1);
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 120)}
          onKeyDown={onKey}
          placeholder="Buscá un activo… AAPL, MELI.BA, bitcoin, dólar"
          aria-label="Buscar activo"
          aria-autocomplete="list"
          aria-expanded={showSuggest}
          autoComplete="off"
          spellCheck={false}
        />
        {showSuggest && (
          <ul className="suggest" role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s.symbol}
                role="option"
                aria-selected={i === cursor}
                className={i === cursor ? "on" : ""}
                onMouseDown={() => go(s.symbol)}
                onMouseEnter={() => setCursor(i)}
              >
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
      {recent.length > 0 && (
        <div className="chips recents">
          <span className="lbl">Recientes</span>
          {recent.slice(0, 5).map((s) => (
            <button key={s} type="button" className="chip" onClick={() => go(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

const SORTS = [
  ["rank", "Populares", null],
  ["up", "Suben", "bi-caret-up-fill"],
  ["down", "Bajan", "bi-caret-down-fill"],
];

function Explore({ uid, user, ctx, recent, onOpen }) {
  const { watch, trades, alerts, profile, feed, followed, toggleWatch } = ctx;
  const [cur] = useDisplayCurrency();
  const fx = useMep();
  const rate = fx.mep?.rate;
  const [tab, setTab] = useState("cedear");
  const [sector, setSector] = useState(null);
  const [sort, setSort] = useState("rank");
  const [more, setMore] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [editInterests, setEditInterests] = useState(false);
  const [busy, setBusy] = useState("");

  const fy = useForYou({ uid, profile: profile.data, watchRows: watch.rows, tradeRows: trades.rows, posts: feed.data, limit: 8 });

  const interests = fy.interests;

  const lq = listQuery.trim().toUpperCase();
  const rows = useMemo(
    () => listFor(tab, sector).filter((r) => !lq || r.symbol.includes(lq) || r.name.toUpperCase().includes(lq)),
    [tab, sector, lq],
  );
  // rubros que tienen algo en esta pestaña (para no mostrar filtros vacíos)
  const tabSectors = useMemo(() => {
    const all = new Set(listFor(tab).flatMap((r) => r.tags));
    return SECTORS.filter(([k]) => all.has(k) && k !== tab && !(tab === "etf" && k === "etf"));
  }, [tab]);

  // lo más mencionado en la comunidad últimamente (posts de quienes seguís + propios)
  const talk = useMemo(() => {
    const m = new Map();
    for (const p of feed.data) {
      const e = m.get(p.symbol) || { symbol: p.symbol, n: 0, buy: 0, hold: 0, sell: 0 };
      e.n += 1;
      e[p.stance] += 1;
      m.set(p.symbol, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  }, [feed.data]);

  // lista y recomendaciones por separado: las recomendaciones (pocas) llegan rápido
  const list = useBatch(rows.map((r) => r.symbol));
  const side = useBatch([...fy.recs.map((r) => r.symbol), ...talk.map((t) => t.symbol)]);
  const ago = useAgo(list.updatedAt);

  const sorted = useMemo(() => {
    if (sort === "rank") return rows;
    const val = (r) => list.quotes[r.symbol]?.change_pct;
    return [...rows].filter((r) => val(r) != null).sort((a, b) => (sort === "up" ? val(b) - val(a) : val(a) - val(b)));
  }, [rows, sort, list.quotes]);
  const visible = more ? sorted : sorted.slice(0, 12);
  const alertSyms = new Set(alerts.data.filter((a) => a.active).map((a) => a.symbol));

  const setInterest = async (k, on) => {
    if (!uid || !profile.data) return;
    setBusy(k);
    await attempt(updateProfile(uid, { interests: on ? [...new Set([...interests, k])] : interests.filter((x) => x !== k) }), {
      ok: on ? `Seguís el rubro ${SECTOR[k].label}` : `Dejaste de seguir ${SECTOR[k].label}`,
      fail: "No se pudo guardar el rubro",
    });
    setBusy("");
  };
  const star = async (sym, name) => {
    setBusy(sym);
    await toggleWatch(sym, name);
    setBusy("");
  };

  const navItems = [
    ...(user ? [["para-vos", "Para vos", "bi-stars"]] : []),
    ["explorar", "Explorar", "bi-grid"],
    ...(user && alerts.data.length ? [["alertas", "Alertas", "bi-bell"]] : []),
    ...(user ? [["comunidad", "Comunidad", "bi-people"]] : []),
  ];

  return (
    <>
      <section className="page-head">
        <div>
          <h1>
            El <em>mercado</em>, a tu medida.
          </h1>
          <p>Buscá cualquier activo, explorá por rubro y recibí ideas según lo que seguís.</p>
        </div>
        <CurrencyPick />
      </section>

      <SearchBar onOpen={onOpen} recent={recent} />

      {navItems.length > 1 && <SectionNav items={navItems} />}

      {user && (
        <section id="para-vos" className="block">
          <SectionHead kicker="Ideas" title="Para vos" desc="Según tus rubros, lo que seguís y lo que recomienda tu comunidad.">
            {profile.data && (
              <button type="button" className="btn btn-line btn-sm" onClick={() => setEditInterests(true)}>
                <i className="bi bi-sliders" /> Tus rubros{interests.length ? ` (${interests.length})` : ""}
              </button>
            )}
            {fy.hidden.length > 0 && (
              <button type="button" className="lnk-btn quiet" onClick={fy.unhideAll}>
                Volver a mostrar {fy.hidden.length === 1 ? "1 descartada" : `${fy.hidden.length} descartadas`}
              </button>
            )}
          </SectionHead>
          {fy.recs.length ? (
            <ForYouCards
              recs={fy.recs}
              quotes={side.quotes}
              sparks={side.sparks}
              cur={cur}
              rate={rate}
              followed={followed}
              busy={busy}
              onStar={(r) => star(r.symbol, r.name)}
              onHide={fy.hide}
            />
          ) : (
            <ForYouStart sectors={SECTORS} busy={busy} disabled={!profile.data} onPick={(k) => setInterest(k, true)} wide />
          )}
        </section>
      )}

      <section id="explorar" className="block">
        <SectionHead
          kicker="Mercado"
          title="Explorar"
          desc={list.updatedAt ? `Precios ${list.error ? "sin conexión" : `actualizados ${ago}`} · ${sorted.length} activos` : "CEDEARs, acciones, cripto, monedas e índices."}
        >
          <div className="seg sort-seg" role="radiogroup" aria-label="Ordenar">
            {SORTS.map(([k, label, icon]) => (
              <button key={k} type="button" role="radio" aria-checked={sort === k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>
                {icon && <i className={"bi " + icon} />} {label}
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn" onClick={list.refresh} disabled={list.loading} title="Actualizar precios" aria-label="Actualizar precios">
            <i className={"bi bi-arrow-clockwise" + (list.loading ? " spin" : "")} />
          </button>
        </SectionHead>

        <div className="explore-bar">
          <div className="seg mkt-tabs" role="tablist" aria-label="Tipo de activo">
            {TABS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                className={tab === k ? "on" : ""}
                onClick={() => {
                  setTab(k);
                  setSector(null);
                  setMore(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {tabSectors.length > 1 && (
            <div className="chips scroll">
              <button type="button" className={"chip" + (!sector ? " on" : "")} onClick={() => setSector(null)}>
                Todos
              </button>
              {tabSectors.map(([k, label, icon]) => (
                <button
                  key={k}
                  type="button"
                  className={"chip" + (sector === k ? " on" : "")}
                  onClick={() => {
                    setSector(sector === k ? null : k);
                    setMore(false);
                  }}
                >
                  <i className={"bi " + icon} /> {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="list-filters">
          <div className="search-form compact filter-in">
            <i className="bi bi-funnel ico" aria-hidden="true" />
            <input
              value={listQuery}
              onChange={(e) => {
                setListQuery(e.target.value);
                setMore(false);
              }}
              placeholder={`Filtrar ${TABS.find(([k]) => k === tab)?.[1]} por nombre o ticker`}
              aria-label="Filtrar la lista"
            />
            {listQuery && (
              <button type="button" className="filter-x" onClick={() => setListQuery("")} aria-label="Limpiar filtro">
                <i className="bi bi-x" />
              </button>
            )}
          </div>
        </div>

        {sector && profile.data && (
          <div className="sector-follow">
            <span>
              <i className={"bi " + SECTOR[sector].icon} /> {rows.length} activos de <b>{SECTOR[sector].label}</b>
            </span>
            <button
              type="button"
              className={"btn btn-line btn-sm" + (interests.includes(sector) ? " on" : "")}
              disabled={busy === sector}
              onClick={() => setInterest(sector, !interests.includes(sector))}
            >
              <i className={interests.includes(sector) ? "bi bi-star-fill" : "bi bi-star"} />
              {interests.includes(sector) ? "Seguís este rubro" : "Seguir rubro"}
            </button>
          </div>
        )}

        <div className="card asset-list">
          {visible.map((r) => {
            const main = r.tags.find((t) => t !== "argentina" && t !== tab) || r.tags[0];
            return (
              <AssetRow
                key={r.symbol}
                symbol={r.symbol}
                name={r.name}
                tag={main && SECTOR[main] ? SECTOR[main].label : null}
                quote={list.quotes[r.symbol]}
                closes={list.sparks[r.symbol]}
                cur={cur}
                rate={rate}
                following={followed.has(r.symbol)}
                busy={busy === r.symbol || !watch.loaded}
                onStar={user ? () => star(r.symbol, r.name) : null}
                alert={alertSyms.has(r.symbol)}
              />
            );
          })}
          {!visible.length && (
            <p className="asset-none muted">
              {list.loading && !lq ? "Cargando precios…" : lq ? `Nada coincide con "${listQuery.trim()}" en esta pestaña. Probá el buscador (⌘K).` : "No hay activos para este filtro."}
            </p>
          )}
        </div>
        {sorted.length > 12 && (
          <button type="button" className="btn btn-line btn-sm list-more" onClick={() => setMore((m) => !m)}>
            {more ? "Ver menos" : `Ver los ${sorted.length}`}
            <i className={more ? "bi bi-chevron-up" : "bi bi-chevron-down"} />
          </button>
        )}
      </section>

      {user && alerts.data.length > 0 && (
        <section id="alertas" className="block">
          <SectionHead kicker="Avisos" title="Tus alertas" desc="Te avisamos por notificación cuando un activo llega al precio o se mueve fuerte en el día." />
          <AlertsCard uid={uid} alerts={alerts.data} wide />
        </section>
      )}

      {user && (
        <section id="comunidad" className="block">
          <SectionHead kicker="Comunidad" title="Lo que más se recomienda" desc="Los activos de los que más habla la gente que seguís.">
            <Link to="/comunidad" className="btn btn-line btn-sm">
              <i className="bi bi-people" /> Ir a la comunidad
            </Link>
          </SectionHead>
          {talk.length ? (
            <div className="talk-grid">
              {talk.map((t) => {
                const q = side.quotes[t.symbol];
                return (
                  <Link key={t.symbol} to={tickerUrl(t.symbol)} className="card talk-tile">
                    <div className="tt-top">
                      <Logo symbol={t.symbol} size={34} />
                      <div>
                        <b>{lookup(t.symbol)?.name || t.symbol}</b>
                        <span>{t.symbol}</span>
                      </div>
                      {q && <Delta value={q.change_pct} />}
                    </div>
                    <div className="cons-bar">
                      {["buy", "hold", "sell"].map((k) => (t[k] ? <span key={k} className={k} style={{ flex: t[k] }} /> : null))}
                    </div>
                    <span className="tt-foot">
                      {t.n} {t.n === 1 ? "recomendación" : "recomendaciones"} · <b>{Math.round((t.buy / t.n) * 100)}% compra</b>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="side-empty wide">
              <p>Seguí personas en la comunidad para ver qué activos recomiendan.</p>
              <Link to="/comunidad" className="btn btn-line btn-sm">
                <i className="bi bi-people" /> Ir a la comunidad
              </Link>
            </div>
          )}
        </section>
      )}

      {user && (
        <ProfileModal open={editInterests} uid={uid} profile={profile.data} focus="interests" onClose={() => setEditInterests(false)} />
      )}
    </>
  );
}

/* ═══════════════════════════ Detalle de un activo ═════════════════════ */

/* Nombre del activo: catálogo → lo guardado → búsqueda */
function useAssetName(symbol, ctx) {
  const known =
    lookup(symbol)?.name ||
    ctx.watch.rows.find((w) => w.symbol === symbol)?.name ||
    ctx.trades.rows.find((t) => t.symbol === symbol)?.name ||
    null;
  const [found, setFound] = useState(null);
  useEffect(() => {
    if (known) return;
    const ctrl = new AbortController();
    searchSymbols(symbol, ctrl.signal)
      .then((rs) => setFound(rs.find((r) => r.symbol?.toUpperCase() === symbol)?.name || null))
      .catch(() => {});
    return () => ctrl.abort();
  }, [symbol, known]);
  return known || found;
}

/* Ticker que no existe: aviso claro y tickers parecidos para elegir */
function NotFound({ symbol, onOpen }) {
  const similar = useSuggestions(symbol.replace(/[.=^-].*$/, ""));
  return (
    <section className="not-found">
      <span className="cf-ic danger">
        <i className="bi bi-search" />
      </span>
      <h1>
        No encontramos <em>{symbol}</em>.
      </h1>
      <p>Puede que el ticker esté mal escrito o que Yahoo Finance no lo tenga. Los CEDEARs llevan ".BA" (por ejemplo MELI.BA).</p>
      {similar.length > 0 && (
        <div className="chips">
          <span className="lbl">¿Quisiste decir?</span>
          {similar.slice(0, 5).map((s) => (
            <button key={s.symbol} type="button" className="chip" onClick={() => onOpen(s.symbol)}>
              {s.symbol} <span>{s.name}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="btn btn-line btn-sm" onClick={() => onOpen(null)}>
        <i className="bi bi-arrow-left" /> Volver al mercado
      </button>
    </section>
  );
}

function AssetDetail({ symbol, uid, user, ctx, onOpen }) {
  const { alerts, followed, held, toggleWatch, trades } = ctx;
  const name = useAssetName(symbol, ctx);
  const meta = lookup(symbol);
  const { quotes } = useQuotes([symbol]);
  const quote = quotes[symbol];
  const [cur] = useDisplayCurrency();
  const fx = useMep();
  const rate = fx.mep?.rate;
  const converted = isConverted(symbol, cur) && rate;
  const [trade, setTrade] = useState(false);
  const [composer, setComposer] = useState(false);
  const [busy, setBusy] = useState(false);
  const following = followed.has(symbol);
  const kind = symbol.endsWith(".BA") && meta?.cedear ? "cedear" : meta?.kind;

  const posts = useFeed({ uid, mode: "all", symbol, limit: 20 });
  const counts = { buy: 0, hold: 0, sell: 0 };
  posts.data.forEach((p) => (counts[p.stance] += 1));
  const total = posts.data.length;

  const similar = useMemo(() => similarTo(symbol, 5), [symbol]);
  const side = useBatch(similar.map((s) => s.symbol));

  const pos = useMemo(() => {
    if (!held[symbol]) return null;
    return computePositions(trades.rows, quote ? { [symbol]: quote } : {}).positions.find((p) => p.symbol === symbol);
  }, [held, symbol, trades.rows, quote]);

  const toggle = async () => {
    setBusy(true);
    await toggleWatch(symbol, name);
    setBusy(false);
  };

  // Escape cierra el modal de recomendar
  useEffect(() => {
    if (!composer) return;
    const onKey = (e) => e.key === "Escape" && setComposer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [composer]);

  if (quote === null) return <NotFound symbol={symbol} onOpen={onOpen} />;

  return (
    <>
      <nav className="crumbs">
        <button type="button" className="lnk-btn back" onClick={() => onOpen(null)}>
          <i className="bi bi-arrow-left" /> Mercado
        </button>
        <div className="crumb-right">
          <CurrencyPick />
          <div className="crumb-search">
            <SymbolSearch onPick={({ symbol: s }) => onOpen(s)} placeholder="Buscar otro activo…" />
          </div>
        </div>
      </nav>

      <section className="asset-head">
        <div className="asset-title">
          <Logo symbol={symbol} size={54} />
          <div>
            <h1>{name || symbol}</h1>
            <div className="asset-tags">
              <span className="sym">{symbol}</span>
              {kind && <span className="tag">{KIND_LABEL[kind]}</span>}
              {meta?.tags.map((t) => (
                <span key={t} className="tag soft">
                  <i className={"bi " + SECTOR[t].icon} /> {SECTOR[t].label}
                </span>
              ))}
              <span className="tag soft">{assetCurrency(symbol) === "ARS" ? "En pesos" : "En dólares"}</span>
            </div>
          </div>
        </div>
        <div className="asset-quote">
          {quote ? (
            <>
              <b>{priceIn(symbol, quote.price, cur, rate)}</b>
              <div>
                <Delta value={quote.change_pct} />
                <span className="chg">
                  {quote.change >= 0 ? "+" : "-"}
                  {priceIn(symbol, Math.abs(quote.change), cur, rate)} hoy
                </span>
              </div>
              {converted && (
                <small className="native" title="Precio convertido al dólar MEP">
                  Cotiza {fmtPrice(symbol, quote.price)}
                </small>
              )}
            </>
          ) : quote === null ? (
            <span className="muted">Sin cotización</span>
          ) : (
            <>
              <span className="ph-line px big" />
              <span className="ph-line short" />
            </>
          )}
        </div>
      </section>

      {user ? (
        <div className="asset-actions">
          <button type="button" className={"btn btn-line btn-sm" + (following ? " on" : "")} onClick={toggle} disabled={busy || !ctx.watch.loaded}>
            <i className={following ? "bi bi-star-fill" : "bi bi-star"} />
            {following ? "Siguiendo" : "Seguir"}
          </button>
          <a href="#alertas" className="btn btn-line btn-sm">
            <i className="bi bi-bell" /> Alerta
          </a>
          <button type="button" className="btn btn-line btn-sm" onClick={() => setComposer(true)}>
            <i className="bi bi-chat-square-quote" /> Recomendar
          </button>
          <button type="button" className="btn btn-pink btn-sm" onClick={() => setTrade(true)}>
            <i className="bi bi-arrow-left-right" /> Operar
          </button>
        </div>
      ) : (
        <div className="asset-actions">
          <Link to="/login" className="btn btn-line btn-sm">
            Iniciá sesión para seguir, crear alertas u operar
          </Link>
        </div>
      )}

      <section className="asset-grid">
        <div className="asset-main">
          <AssetChart symbol={symbol} quote={quote} />

          {user && (
            <section className="asset-talk">
              <div className="sec-head">
                <div className="sec-title">
                  <h2>Qué dice la comunidad</h2>
                  {total > 0 && (
                    <span className="sub">
                      {total} {total === 1 ? "recomendación" : "recomendaciones"}
                    </span>
                  )}
                </div>
                <button type="button" className="lnk-btn" onClick={() => setComposer(true)}>
                  <i className="bi bi-pencil-square" /> Recomendar
                </button>
              </div>
              {total > 0 && (
                <div className="consensus" role="img" aria-label={`Comprar ${counts.buy}, mantener ${counts.hold}, vender ${counts.sell}`}>
                  <div className="cons-bar">
                    {["buy", "hold", "sell"].map((k) =>
                      counts[k] ? <span key={k} className={k} style={{ flex: counts[k] }} /> : null,
                    )}
                  </div>
                  <div className="cons-legend">
                    {["buy", "hold", "sell"].map((k) => (
                      <span key={k} className={k}>
                        <i /> {STANCE[k].label} <b>{Math.round((counts[k] / total) * 100)}%</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {total > 0 ? (
                <div className="post-list">
                  {posts.data.slice(0, 6).map((p) => (
                    <PostCard key={p.id} post={p} uid={uid} quote={p.symbol === symbol ? quote : null} />
                  ))}
                </div>
              ) : (
                <div className="talk-empty">
                  <GhostPosts n={1} />
                  <button type="button" className="btn btn-line btn-sm" onClick={() => setComposer(true)}>
                    <i className="bi bi-pencil-square" /> Sé el primero en recomendar {symbol}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="asset-side">
          {pos && (
            <div className="card side-card pos-mini">
              <div className="side-head">
                <h3>
                  <i className="bi bi-wallet2" /> Tu posición
                </h3>
                <Link to="/dashboard" className="lnk">
                  Portfolio
                </Link>
              </div>
              <dl className="pm-kv">
                <div>
                  <dt>Cantidad</dt>
                  <dd>{pos.qty.toLocaleString("es-AR", { maximumFractionDigits: 4 })}</dd>
                </div>
                <div>
                  <dt>Costo promedio</dt>
                  <dd>{fmtPrice(symbol, pos.avgCost)}</dd>
                </div>
                <div>
                  <dt>Valor hoy</dt>
                  <dd>{priceIn(symbol, pos.qty * pos.price, cur, rate)}</dd>
                </div>
                <div>
                  <dt>Resultado</dt>
                  <dd className={pos.pnlPct >= 0 ? "txt-up" : "txt-down"}>
                    {pos.pnlPct >= 0 ? "+" : ""}
                    {pos.pnlPct.toFixed(2)}%
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {user && (
            <div id="alertas">
              <AlertsCard uid={uid} alerts={alerts.data} symbol={symbol} quote={quote} />
            </div>
          )}

          {similar.length > 0 && (
            <div className="card side-card">
              <div className="side-head">
                <h3>
                  <i className="bi bi-diagram-3" /> Del mismo rubro
                </h3>
              </div>
              <ul className="sim-list">
                {similar.map((s) => {
                  const q = side.quotes[s.symbol];
                  return (
                    <li key={s.symbol}>
                      <Link to={tickerUrl(s.symbol)}>
                        <Logo symbol={s.symbol} size={28} />
                        <div>
                          <b>{s.name}</b>
                          <span>{s.symbol}</span>
                        </div>
                        {q ? <Delta value={q.change_pct} /> : <span className="ph-line short" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </section>

      {user && (
        <TradeModal
          open={trade}
          onClose={() => setTrade(false)}
          uid={uid}
          initial={{ symbol, name: name || "", side: "buy" }}
          held={held}
          trades={trades.rows}
          onSaved={() => trades.reload()}
        />
      )}

      {composer && (
        <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && setComposer(false)}>
          <div className="modal composer-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title">
            <div className="modal-head">
              <h2 id="cm-title">Recomendar {symbol}</h2>
              <button type="button" className="icon-btn" onClick={() => setComposer(false)} aria-label="Cerrar">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <PostComposer
              uid={uid}
              username={user.username}
              initialSymbol={symbol}
              autoOpen
              onDone={() => setComposer(false)}
              onCancel={() => setComposer(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
