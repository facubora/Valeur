import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import AssetChart from "../components/AssetChart";
import AlertRows, { BrowserNotifyAsk } from "../components/AlertRows";
import { SkList, SkPosts } from "../components/Skeleton";
import SymbolSearch from "../components/SymbolSearch";
import AlertEditor from "../components/AlertEditor";
import AlertList from "../components/AssetAlerts";
import Logo from "../components/Logo";
import RecommendModal from "../components/PostComposer";
import ProfileModal from "../components/ProfileModal";
import TradeModal from "../components/TradeModal";
import { PostCard, GhostPosts } from "../components/Social";
import { AssetRow, ForYouCards, ForYouStart } from "../components/MarketBits";
import { SectionNav, SectionHead } from "../components/Sections";
import Modal from "../components/Modal";
import Pill from "../components/Pill";
import { useModalClose } from "../lib/modal";
import {
  useSuggestions,
  useQuotes,
  useBatch,
  useAgo,
  useMep,
  useDisplayCurrency,
  searchSymbols,
  tickerUrl,
  money,
  priceIn,
  assetCurrency,
} from "../lib/market";
import { SECTOR, SECTORS, KIND_LABEL, TABS, listFor, lookup, similarTo } from "../lib/catalog";
import Term from "../components/Term";
import { useEvents, EVENT_KIND, whenTxt } from "../lib/events";

// el tipo de activo, con su explicación de Aprendé
const KIND_TERM = { stock: "accion", cedear: "cedear", crypto: "cripto", index: "indice" };
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
        {input && <kbd className="search-go">↵</kbd>}
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

  // lista y recomendaciones por separado: las recomendaciones (pocas) llegan rápido
  const list = useBatch(rows.map((r) => r.symbol));
  const side = useBatch(fy.recs.map((r) => r.symbol));
  const ago = useAgo(list.updatedAt);

  const sorted = useMemo(() => {
    if (sort === "rank") return rows;
    const val = (r) => list.quotes[r.symbol]?.change_pct;
    return [...rows].filter((r) => val(r) != null).sort((a, b) => (sort === "up" ? val(b) - val(a) : val(a) - val(b)));
  }, [rows, sort, list.quotes]);
  const visible = more ? sorted : sorted.slice(0, 12);
  // cómo viene el día en esta pestaña: cuántos suben y bajan, y los extremos
  const day = useMemo(() => {
    const qs = rows.map((r) => [r.symbol, list.quotes[r.symbol]]).filter(([, q]) => q && Number.isFinite(q.change_pct));
    if (!qs.length) return null;
    const by = [...qs].sort((a, b) => b[1].change_pct - a[1].change_pct);
    return { up: qs.filter(([, q]) => q.change_pct >= 0).length, down: qs.filter(([, q]) => q.change_pct < 0).length, top: by[0], bottom: by.at(-1) };
  }, [rows, list.quotes]);
  const tabName = TABS.find(([k]) => k === tab)?.[1];
  const fecha = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
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
    ...(user ? [["alertas", "Alertas", "bi-bell"]] : []),
  ];

  return (
    <>
      <section className="page-head">
        <div>
          <span className="kicker">{fecha.charAt(0).toUpperCase() + fecha.slice(1)}</span>
          <h1>
            El <em>mercado</em>, a tu medida.
          </h1>
          {/* cómo viene el día en la pestaña que estás mirando */}
          {day && (
            <div className="hpills" aria-label={`Cómo vienen hoy los ${tabName}`}>
              <Pill label={tabName} value={`${day.up} suben · ${day.down} bajan`} />
              <Pill to={`?symbol=${encodeURIComponent(day.top[0])}`} label="Más sube" value={day.top[0]} delta={day.top[1].change_pct} />
              <Pill to={`?symbol=${encodeURIComponent(day.bottom[0])}`} label="Más baja" value={day.bottom[0]} delta={day.bottom[1].change_pct} />
            </div>
          )}
        </div>
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
          {/* mismo control que las pestañas: ficha que se desliza, sin color de acento */}
          <div
            className="vx-tabs sm sort-seg"
            role="radiogroup"
            aria-label="Ordenar"
            style={{ "--n": SORTS.length, "--i": Math.max(0, SORTS.findIndex(([k]) => k === sort)) }}
          >
            <span className="vx-tabs-thumb" aria-hidden="true" />
            {SORTS.map(([k, label, icon]) => (
              <button key={k} type="button" role="radio" aria-checked={sort === k} className={(sort === k ? "on " : "") + k} onClick={() => setSort(k)}>
                {icon && <i className={"bi " + icon} />} {label}
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn" onClick={list.refresh} disabled={list.loading} title="Actualizar precios" aria-label="Actualizar precios">
            <i className={"bi bi-arrow-clockwise" + (list.loading ? " spin" : "")} />
          </button>
        </SectionHead>

        <div className="explore-bar">
          <div
            className="vx-tabs mkt-tabs"
            role="tablist"
            aria-label="Tipo de activo"
            style={{ "--n": TABS.length, "--i": Math.max(0, TABS.findIndex(([k]) => k === tab)) }}
          >
            <span className="vx-tabs-thumb" aria-hidden="true" />
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

      {user && <MyAlerts uid={uid} alerts={alerts} />}

      {user && (
        <ProfileModal open={editInterests} uid={uid} profile={profile.data} focus="interests" onClose={() => setEditInterests(false)} />
      )}
    </>
  );
}

/* Tus alertas: las que vigilan y las que ya avisaron, para editar, borrar o
   reactivar en la fila; y crear otra de cualquier activo */
function MyAlerts({ uid, alerts }) {
  const on = alerts.data.filter((a) => a.active);
  const off = alerts.data.filter((a) => !a.active);
  const [show, setShow] = useState(null);
  const [adding, setAdding] = useState(false);
  const { quotes } = useQuotes(alerts.data.map((a) => a.symbol));
  // arranca en las que vigilan; si no hay, en las que ya avisaron
  const tab = show || (on.length || !off.length ? "on" : "off");
  const listed = tab === "on" ? on : off;
  const TABS_A = [
    ["on", `Vigilando · ${on.length}`],
    ["off", `Ya avisaron · ${off.length}`],
  ];

  return (
    <section id="alertas" className="block">
      <SectionHead kicker="Avisos" title="Tus alertas" desc="Te llega a la campanita cuando un activo llega al precio o se mueve fuerte en el día.">
        {off.length > 0 && (
          <div className="vx-tabs sm" role="radiogroup" aria-label="Qué alertas ver" style={{ "--n": 2, "--i": tab === "on" ? 0 : 1 }}>
            <span className="vx-tabs-thumb" aria-hidden="true" />
            {TABS_A.map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={tab === k} className={tab === k ? "on" : ""} onClick={() => setShow(k)}>
                {label}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-line btn-sm" onClick={() => setAdding(true)}>
          <i className="bi bi-bell" /> Nueva alerta
        </button>
      </SectionHead>

      {!alerts.loaded ? (
        <SkList n={2} />
      ) : listed.length ? (
        <AlertRows alerts={listed} quotes={quotes} existing={alerts.data} />
      ) : (
        <GhostAlerts />
      )}
      <BrowserNotifyAsk />

      {adding && (
        <Modal onClose={() => setAdding(false)} label="Nueva alerta" className="tm am">
          <NewAlertBody uid={uid} alerts={alerts.data} />
        </Modal>
      )}
    </section>
  );
}

/* Sin alertas: filas punteadas con la forma de las de verdad */
function GhostAlerts() {
  return (
    <div className="card nrx gh-nrx" aria-hidden="true">
      {[40, 60, 25].map((w) => (
        <div key={w} className="gh-nrx-row">
          <span className="gh-av" />
          <span className="gh-nrx-txt">
            <span className="gh-ln w40" />
            <span className={"gh-ln w" + w} />
          </span>
          <span className="gh-nrx-bar" />
        </div>
      ))}
    </div>
  );
}

/* Crear una alerta de cualquier activo: elegirlo y después el editor */
function NewAlertBody({ uid, alerts }) {
  const close = useModalClose();
  const [symbol, setSymbol] = useState("");
  const meta = symbol ? lookup(symbol) : null;
  return (
    <>
      <div className="tm-head">
        <div>
          <span className="kicker">Alertas</span>
          <h2>{symbol ? `¿Cuándo te avisamos de ${symbol}?` : "¿De qué activo?"}</h2>
          <p className="am-sub">Te llega a la campanita, en cualquier pantalla de Valeur.</p>
        </div>
        <button type="button" className="tm-x" onClick={close} aria-label="Cerrar">
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="am-body">
        {symbol ? (
          <>
            <div className="rc-picked">
              <Logo symbol={symbol} size={36} />
              <span>
                <b>{symbol}</b>
                <small>{meta?.name || "Activo"}</small>
              </span>
              <span className="rc-px">
                <button type="button" className="lnk-btn" onClick={() => setSymbol("")}>
                  Cambiar
                </button>
              </span>
            </div>
            <AlertEditor key={symbol} uid={uid} symbol={symbol} existing={alerts} onDone={close} onCancel={close} />
          </>
        ) : (
          <div className="rc-pick">
            <SymbolSearch onPick={({ symbol: s }) => setSymbol(s.toUpperCase())} placeholder="AAPL, MELI.BA, bitcoin…" autoFocus />
          </div>
        )}
      </div>
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
  const [trade, setTrade] = useState(false);
  const [composer, setComposer] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const following = followed.has(symbol);
  const kind = symbol.endsWith(".BA") && meta?.cedear ? "cedear" : meta?.kind;

  const posts = useFeed({ uid, mode: "all", symbol, limit: 20 });
  const counts = { buy: 0, hold: 0, sell: 0 };
  posts.data.forEach((p) => (counts[p.stance] += 1));
  const total = posts.data.length;

  // los del mismo rubro se cotizan recién al abrir la lista
  const similar = useMemo(() => similarTo(symbol, 6), [symbol]);
  const side = useBatch(simOpen ? similar.map((s) => s.symbol) : []);

  const pos = useMemo(() => {
    if (!held[symbol]) return null;
    return computePositions(trades.rows, quote ? { [symbol]: quote } : {}, cur, fx.mep).positions.find((p) => p.symbol === symbol);
  }, [held, symbol, trades.rows, quote, cur, fx.mep]);

  const toggle = async () => {
    setBusy(true);
    await toggleWatch(symbol, name);
    setBusy(false);
  };

  // lo próximo de la empresa: resultados o dividendo
  const { events: upcoming } = useEvents([symbol]);
  const nextEvent = upcoming[0];

  if (quote === null) return <NotFound symbol={symbol} onOpen={onOpen} />;

  const myAlerts = alerts.data.filter((a) => a.symbol === symbol && a.active).length;
  const lead = total ? ["buy", "hold", "sell"].reduce((m, k) => (counts[k] > counts[m] ? k : m), "buy") : null;
  const up = quote ? quote.change_pct >= 0 : true;

  return (
    <>
      <section className="page-head ad-head">
        <div className="ad-id">
          <span className="kicker ad-kicker">
            <button type="button" onClick={() => onOpen(null)}>
              <i className="bi bi-arrow-left" /> Mercado
            </button>
            {kind && <span>{KIND_TERM[kind] ? <Term k={KIND_TERM[kind]}>{KIND_LABEL[kind]}</Term> : KIND_LABEL[kind]}</span>}
            {meta?.tags.map((t) => (
              <span key={t}>{SECTOR[t].label}</span>
            ))}
            <span>{assetCurrency(symbol) === "ARS" ? "En pesos" : "En dólares"}</span>
          </span>
          <div className="ad-title">
            <Logo symbol={symbol} size={44} />
            <h1>
              {name || symbol}
              <small>
                {symbol}
                {following && <i className="bi bi-star-fill" title="Lo seguís" />}
              </small>
            </h1>
          </div>
          <div className="hpills">
            {quote && (
              <span className={"ad-day " + (up ? "txt-up" : "txt-down")}>
                <i className={up ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
                {Math.abs(quote.change_pct).toFixed(2).replace(".", ",")}% · {up ? "+" : "−"}
                {priceIn(symbol, Math.abs(quote.change), cur, rate)} hoy
              </span>
            )}
            {pos && <Pill to="/dashboard" label="Tu posición" value={money(pos.value, undefined, cur)} delta={pos.pnlPct} />}
            {myAlerts > 0 && (
              <Pill onClick={() => setAlerting(true)} icon="bi-bell" label="Alertas" value={myAlerts === 1 ? "1 vigilando" : `${myAlerts} vigilando`} />
            )}
            {nextEvent && (
              <Pill to="/calendario" icon={EVENT_KIND[nextEvent.kind].icon} label={EVENT_KIND[nextEvent.kind].short} value={whenTxt(nextEvent.date)} />
            )}
            {lead && (
              <Pill
                to="#comunidad"
                label="Comunidad"
                value={`${Math.round((counts[lead] / total) * 100)}% ${STANCE[lead].label.toLowerCase()}`}
              />
            )}
          </div>
        </div>

        <div className="ad-quote">
          {quote ? (
            <b className="ad-price">{priceIn(symbol, quote.price, cur, rate)}</b>
          ) : (
            <span className="ph-line px big" />
          )}
          <div className="ad-acts">
            {user ? (
              <>
                {/* lo de todos los días, a un toque: seguir, alerta y recomendar */}
                <button
                  type="button"
                  className={"btn btn-line aq" + (following ? " on fav" : "")}
                  onClick={toggle}
                  disabled={busy || !ctx.watch.loaded}
                  aria-pressed={following}
                >
                  <i className={following ? "bi bi-star-fill" : "bi bi-star"} />
                  {following ? "Siguiendo" : "Seguir"}
                </button>
                <button type="button" className={"btn btn-line aq" + (myAlerts ? " on" : "")} onClick={() => setAlerting(true)}>
                  <i className={myAlerts ? "bi bi-bell-fill" : "bi bi-bell"} />
                  Alerta
                  {myAlerts > 0 && <em>{myAlerts}</em>}
                </button>
                <button type="button" className="btn btn-line aq" onClick={() => setComposer(true)}>
                  <i className="bi bi-chat-square-quote" />
                  Recomendar
                </button>
                <Link to={`/simulador?activo=${encodeURIComponent(symbol)}`} className="btn btn-line aq aq-tool" title="Simular: ¿y si hubieras invertido?" aria-label="Simular">
                  <i className="bi bi-hourglass-split" />
                  <span className="aq-txt">Simular</span>
                </Link>
                <button type="button" className="btn btn-pink ad-trade" onClick={() => setTrade(true)}>
                  <i className="bi bi-arrow-left-right" /> Operar
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-pink ad-trade">
                Iniciá sesión para operar
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="ad-main">
        <AssetChart symbol={symbol} quote={quote} />

        {similar.length > 0 && (
          <div className={"card ad-sim" + (simOpen ? " open" : "")}>
            <button type="button" className="ad-sim-head" aria-expanded={simOpen} onClick={() => setSimOpen((o) => !o)}>
              <i className="bi bi-diagram-3" />
              <b>Del mismo rubro</b>
              <span className="ad-sim-logos" aria-hidden="true">
                {similar.slice(0, 4).map((s) => (
                  <Logo key={s.symbol} symbol={s.symbol} size={24} />
                ))}
              </span>
              <small>{similar.length} activos</small>
              <i className="bi bi-chevron-down ad-sim-chev" />
            </button>
            <div className="ad-sim-body" inert={!simOpen}>
              <ul>
                {similar.map((s) => {
                  const q = side.quotes[s.symbol];
                  return (
                    <li key={s.symbol}>
                      <Link to={tickerUrl(s.symbol)}>
                        <Logo symbol={s.symbol} size={30} />
                        <span>
                          <b>{s.name}</b>
                          <small>{s.symbol}</small>
                        </span>
                        {q ? (
                          <span className="ad-sim-px">
                            <b>{priceIn(s.symbol, q.price, cur, rate)}</b>
                            <small className={q.change_pct >= 0 ? "txt-up" : "txt-down"}>
                              <i className={q.change_pct >= 0 ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} />
                              {Math.abs(q.change_pct).toFixed(2).replace(".", ",")}%
                            </small>
                          </span>
                        ) : (
                          <span className="ph-line short" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </section>

      {user && (
        <section id="comunidad" className="block ad-talk">
          <SectionHead
            kicker="Comunidad"
            title={`Qué dicen de ${symbol}`}
            desc={
              total
                ? `${total} ${total === 1 ? "recomendación" : "recomendaciones"} de la comunidad.`
                : "Todavía nadie lo recomendó. Podés ser el primero."
            }
          >
            <button type="button" className="btn btn-line btn-sm" onClick={() => setComposer(true)}>
              <i className="bi bi-pencil-square" /> Recomendar
            </button>
          </SectionHead>
          {total > 0 && (
            <div className="consensus" role="img" aria-label={`Comprar ${counts.buy}, mantener ${counts.hold}, vender ${counts.sell}`}>
              <div className="cons-bar">
                {["buy", "hold", "sell"].map((k) => (counts[k] ? <span key={k} className={k} style={{ flex: counts[k] }} /> : null))}
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
          {!posts.loaded ? (
            <SkPosts n={1} />
          ) : total > 0 ? (
            <div className="post-list">
              {posts.data.slice(0, 6).map((p) => (
                <PostCard key={p.id} post={p} uid={uid} quote={p.symbol === symbol ? quote : null} />
              ))}
            </div>
          ) : (
            <GhostPosts n={1} />
          )}
        </section>
      )}

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

      {alerting && (
        <Modal onClose={() => setAlerting(false)} label={`Alertas de ${symbol}`} className="tm am">
          <AlertBody uid={uid} symbol={symbol} name={name} alerts={alerts.data} quote={quote} />
        </Modal>
      )}

      {composer && <RecommendModal uid={uid} initialSymbol={symbol} onClose={() => setComposer(false)} />}
    </>
  );
}

/* Alertas del activo (en el Modal que nace del botón): las que ya tenés,
   para editar o borrar, y abajo crear otra */
function AlertBody({ uid, symbol, name, alerts, quote }) {
  const close = useModalClose();
  const mine = alerts.filter((a) => a.symbol === symbol);
  return (
    <>
      <div className="tm-head">
        <div>
          <span className="kicker">Alertas · {name || symbol}</span>
          <h2>¿Cuándo te avisamos?</h2>
          <p className="am-sub">Te llega a la campanita, en cualquier pantalla de Valeur.</p>
        </div>
        <button type="button" className="tm-x" onClick={close} aria-label="Cerrar">
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="am-body">
        {mine.length > 0 && (
          <div className="am-list">
            <span className="lbl">Las que tenés</span>
            <AlertList symbol={symbol} alerts={alerts} quote={quote} />
          </div>
        )}
        <div className="am-new">
          {mine.length > 0 && <span className="lbl">Nueva alerta</span>}
          <AlertEditor uid={uid} symbol={symbol} existing={alerts} onDone={close} onCancel={close} />
        </div>
      </div>
    </>
  );
}
