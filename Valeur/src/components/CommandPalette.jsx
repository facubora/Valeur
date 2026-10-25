import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { Avatar, Verified } from "./Social";
import { useSuggestions, useQuotes, fmtPrice, tickerUrl } from "../lib/market";
import { ASSETS, KIND_LABEL } from "../lib/catalog";
import { usePeopleSearch, useFollowGraph } from "../lib/social";
import { useWatchlist } from "../lib/portfolio";
import { useAuth } from "../context/AuthContext";
import { useModalClose } from "../lib/modal";
import Modal from "./Modal";

/* Secciones de la app (filtradas por lo que se escribe) */
const PAGES = [
  ["/home", "Inicio", "bi-house-door", "Resumen del día, tu portfolio y lo que seguís"],
  ["/dashboard", "Portfolio", "bi-wallet2", "Tus posiciones y operaciones"],
  ["/tickersearch", "Mercado", "bi-graph-up-arrow", "Ideas para vos y CEDEARs, acciones, cripto y monedas"],
  ["/comunidad", "Comunidad", "bi-people", "Recomendaciones y personas"],
];

/* Lo que se hace todo el tiempo, a un Enter */
const ACTIONS = [
  ["/dashboard?operar=1", "Registrar una operación", "bi-arrow-left-right", "Compra o venta", "comprar vender operar cargar"],
  ["/comunidad?publicar=1#recomendaciones", "Recomendar un activo", "bi-chat-square-quote", "Contale a la comunidad qué harías", "recomendar publicar escribir"],
  ["/tickersearch#alertas", "Mis alertas", "bi-bell", "Ver y editar tus avisos de precio", "alertas avisos notificaciones"],
  ["/practica", "Modo práctica", "bi-controller", "Invertí con US$ 10.000 de mentira y competí", "practica practicar jugar ranking mentira virtual simulacion"],
  ["/simulador", "Simular una inversión", "bi-hourglass-split", "¿Y si hubiera invertido?", "simulador simular hubiera invertido calcular rendimiento"],
];

const norm = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function recents() {
  try {
    const r = JSON.parse(localStorage.getItem("valeur-recent"));
    return Array.isArray(r) ? r.slice(0, 5) : [];
  } catch {
    return [];
  }
}

/* Buscador global: activos, personas y secciones. Se abre con ⌘K / Ctrl+K o "/".
   Si se abre con el buscador del header, nace de ahí (Modal). */
export default function CommandPalette({ open, onClose, username }) {
  return open ? (
    <Modal onClose={onClose} label="Buscar en Valeur" className="cmdk" bgClass="cmdk-bg">
      <Palette onClose={onClose} username={username} />
    </Modal>
  ) : null;
}

/* El texto con la parte que coincide con la búsqueda resaltada (sin
   importar tildes ni mayúsculas) */
function Hl({ text = "", q }) {
  const chars = [...text];
  const flat = chars.map((c) => norm(c)).join("");
  const at = q ? flat.indexOf(q) : -1;
  // si alguna letra cambia de largo al normalizarla, mejor no marcar nada;
  // va en un span para que el título (flex) no se coma los espacios
  if (at < 0 || flat.length !== chars.length) return <span>{text}</span>;
  return (
    <span>
      {chars.slice(0, at).join("")}
      <mark>{chars.slice(at, at + q.length).join("")}</mark>
      {chars.slice(at + q.length).join("")}
    </span>
  );
}

/* Precio y cómo viene hoy, a la derecha de cada activo */
function Px({ symbol, q }) {
  if (!q) return <span className="ci-px" />;
  const up = q.change_pct >= 0;
  return (
    <span className="ci-px">
      <b>{fmtPrice(symbol, q.price)}</b>
      <em className={up ? "txt-up" : "txt-down"}>
        {up ? "+" : "−"}
        {Math.abs(q.change_pct).toFixed(2).replace(".", ",")}%
      </em>
    </span>
  );
}

const assetName = (s) => ASSETS.find((a) => a.symbol === s || a.cedear === s)?.name;

function Palette({ onClose, username }) {
  const close = useModalClose();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef(null);
  const listRef = useRef(null);
  const yahoo = useSuggestions(q.toUpperCase());
  const people = usePeopleSearch(q);
  const graph = useFollowGraph(user?.id);
  const watch = useWatchlist(user?.id);
  const nq = norm(q.trim());

  useEffect(() => {
    input.current?.focus();
  }, []);

  const toItem = ([to, label, icon, desc]) => ({ kind: "page", to, label, icon, desc });

  // resultados en una lista plana (para moverse con las flechas) agrupada por tipo
  const groups = useMemo(() => {
    const out = [];
    if (!nq) {
      // lo último que miraste; si todavía nada, lo que seguís
      const rec = recents();
      const tiles = (rec.length ? rec : watch.data.map((w) => w.symbol)).slice(0, 4);
      if (tiles.length) out.push([rec.length ? "Recientes" : "Lo que seguís", tiles.map((s) => ({ kind: "asset", symbol: s, name: assetName(s) })), "tiles"]);
      out.push(["Hacer", ACTIONS.map(toItem)]);
      out.push(["Ir a", [...PAGES.map(toItem), ...(username ? [toItem([`/u/${username}`, "Mi perfil", "bi-person", `@${username}`])] : [])]]);
      return out;
    }
    // catálogo, al instante: primero ticker que empieza igual, después una
    // palabra del nombre que empieza igual, y al final si solo la contiene
    const score = (a) => {
      const sym = norm(a.symbol).replace(/^\^/, "");
      const name = norm(a.name);
      if (sym.startsWith(nq)) return 3;
      if (name.split(/[\s/().-]+/).some((w) => w.startsWith(nq))) return 2;
      return name.includes(nq) ? 1 : 0;
    };
    const local = [];
    const ranked = ASSETS.map((a) => [score(a), a])
      .filter(([sc]) => sc > 0)
      .sort((x, y) => y[0] - x[0] || x[1].rank - y[1].rank);
    for (const [, asset] of ranked) {
      if (local.length >= 6) break;
      local.push({ kind: "asset", symbol: asset.symbol, name: asset.name, sub: KIND_LABEL[asset.kind] });
      if (asset.cedear && asset.kind !== "index" && local.length < 6) local.push({ kind: "asset", symbol: asset.cedear, name: asset.name, sub: "CEDEAR" });
    }
    const seen = new Set(local.map((x) => x.symbol));
    const remote = yahoo.filter((s) => !seen.has(s.symbol)).map((s) => ({ kind: "asset", symbol: s.symbol, name: s.name, sub: s.type }));
    const assets = [...local, ...remote].slice(0, 6);
    if (assets.length) out.push(["Activos", assets]);
    if (people.rows.length) out.push(["Personas", people.rows.slice(0, 4).map((p) => ({ kind: "person", p }))]);
    const hit = (label, desc, extra = "") => [label, desc, extra].some((t) => norm(t).includes(nq));
    const links = [
      ...ACTIONS.filter(([, label, , desc, extra]) => hit(label, desc, extra)),
      ...PAGES.filter(([, label, , desc]) => hit(label, desc)),
    ];
    if (links.length) out.push(["Ir a", links.map(toItem)]);
    return out;
  }, [nq, yahoo, people.rows, username, watch.data]);

  const flat = groups.flatMap(([, items]) => items);
  const sel = Math.min(cursor, Math.max(flat.length - 1, 0));
  const { quotes } = useQuotes(flat.filter((it) => it.kind === "asset").map((it) => it.symbol));

  const go = (item) => {
    if (!item) {
      // solo si parece un ticker (AAPL, MELI.BA, BTC-USD, ^MERV, USDARS=X)
      const sym = q.trim().toUpperCase();
      if (/^[A-Z0-9.=^-]{1,12}$/.test(sym)) {
        navigate(tickerUrl(sym));
        onClose();
      }
      return;
    }
    if (item.kind === "asset") navigate(tickerUrl(item.symbol));
    else if (item.kind === "person") navigate(`/u/${item.p.username}`);
    else navigate(item.to);
    onClose();
  };

  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((sel + 1) % Math.max(flat.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((sel - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flat[sel]);
    }
  };

  // el elemento elegido siempre a la vista
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const relation = (id) => (graph.friends.has(id) ? "Amigos" : graph.following.has(id) ? "Lo seguís" : graph.followers.has(id) ? "Te sigue" : "Perfil");

  let i = -1;
  return (
    <>
      <div className="cmdk-in">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKey}
          placeholder="Buscá un activo, una persona o qué querés hacer…"
          aria-label="Buscar"
          aria-controls="cmdk-list"
          autoComplete="off"
          spellCheck={false}
        />
        {q ? (
          <button
            type="button"
            className="cmdk-clear"
            onClick={() => {
              setQ("");
              input.current?.focus();
            }}
            aria-label="Borrar la búsqueda"
          >
            <i className="bi bi-x-circle-fill" />
          </button>
        ) : (
          <kbd>esc</kbd>
        )}
      </div>
      <div className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
        {groups.map(([title, items, layout]) => (
          <div key={title} className={"cmdk-group" + (layout ? " " + layout : "")}>
            <span className="cmdk-title">{title}</span>
            <div className="cmdk-items">
              {items.map((it) => {
                i += 1;
                const idx = i;
                const key = title + (it.symbol || it.to || it.p?.id);
                const props = {
                  type: "button",
                  role: "option",
                  "aria-selected": idx === sel,
                  onMouseEnter: () => setCursor(idx),
                  onClick: () => go(it),
                };
                // los recientes, como fichas con precio
                if (layout === "tiles") {
                  const qt = quotes[it.symbol];
                  return (
                    <button key={key} {...props} className="cmdk-tile">
                      <span className="ct-top">
                        <Logo symbol={it.symbol} size={26} />
                        <b>{it.symbol}</b>
                      </span>
                      <span className="ct-name">{it.name || " "}</span>
                      {qt ? (
                        <span className="ct-px">
                          {fmtPrice(it.symbol, qt.price)}
                          <em className={qt.change_pct >= 0 ? "txt-up" : "txt-down"}>
                            {qt.change_pct >= 0 ? "+" : "−"}
                            {Math.abs(qt.change_pct).toFixed(2).replace(".", ",")}%
                          </em>
                        </span>
                      ) : (
                        <span className="ct-px ph-line short" />
                      )}
                    </button>
                  );
                }
                return (
                  <button key={key} {...props} className="cmdk-item">
                    {it.kind === "asset" && (
                      <>
                        <Logo symbol={it.symbol} size={32} />
                        <span className="ci-txt">
                          <b>
                            <Hl text={it.symbol} q={nq} />
                            {it.sub && <small className="ci-tag">{it.sub}</small>}
                          </b>
                          <span>
                            <Hl text={it.name || " "} q={nq} />
                          </span>
                        </span>
                        <Px symbol={it.symbol} q={quotes[it.symbol]} />
                      </>
                    )}
                    {it.kind === "person" && (
                      <>
                        <Avatar name={it.p.username} size={32} />
                        <span className="ci-txt">
                          <b>
                            <Hl text={it.p.display_name || it.p.username} q={nq} />
                            {it.p.verified && <Verified label={it.p.verified_label} />}
                          </b>
                          <span>
                            @<Hl text={it.p.username} q={nq} />
                          </span>
                        </span>
                        <small className={"ci-rel" + (relation(it.p.id) === "Perfil" ? "" : " on")}>{relation(it.p.id)}</small>
                      </>
                    )}
                    {it.kind === "page" && (
                      <>
                        <span className="ci-ic">
                          <i className={"bi " + it.icon} />
                        </span>
                        <span className="ci-txt">
                          <b>
                            <Hl text={it.label} q={nq} />
                          </b>
                          <span>{it.desc}</span>
                        </span>
                        <span />
                      </>
                    )}
                    <i className="bi bi-arrow-return-left ci-go" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {nq && !flat.length && (
          <div className="cmdk-none">
            <i className="bi bi-search" />
            {/^[A-Z0-9.=^-]{1,12}$/.test(q.trim().toUpperCase()) ? (
              <span>
                No lo tenemos a mano. <kbd>↵</kbd> para buscar <b>{q.trim().toUpperCase()}</b> en el mercado.
              </span>
            ) : (
              <span>No encontramos nada con «{q.trim()}». Probá con el ticker o el nombre de la empresa.</span>
            )}
          </div>
        )}
      </div>
      <div className="cmdk-foot">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> moverse
        </span>
        <span>
          <kbd>↵</kbd> abrir
        </span>
        <span>
          <kbd>esc</kbd> cerrar
        </span>
      </div>
    </>
  );
}
