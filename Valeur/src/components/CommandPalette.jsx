import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { Avatar, Verified } from "./Social";
import { useSuggestions, tickerUrl } from "../lib/market";
import { ASSETS, KIND_LABEL } from "../lib/catalog";
import { usePeopleSearch } from "../lib/social";

/* Accesos directos que aparecen siempre (filtrados por lo que se escribe) */
const PAGES = [
  ["/home", "Inicio", "bi-house-door", "Resumen del día, seguidos e ideas"],
  ["/dashboard", "Portfolio", "bi-wallet2", "Tus posiciones y operaciones"],
  ["/tickersearch", "Mercado", "bi-graph-up-arrow", "Explorar CEDEARs, acciones, cripto y monedas"],
  ["/comunidad", "Comunidad", "bi-people", "Recomendaciones y personas"],
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

/* Buscador global: activos, personas y secciones. Se abre con ⌘K / Ctrl+K o "/" */
export default function CommandPalette({ open, onClose, username }) {
  return open ? <Palette onClose={onClose} username={username} /> : null;
}

function Palette({ onClose, username }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef(null);
  const listRef = useRef(null);
  const yahoo = useSuggestions(q.toUpperCase());
  const people = usePeopleSearch(q);
  const nq = norm(q.trim());

  useEffect(() => {
    input.current?.focus();
  }, []);

  // resultados en una lista plana (para moverse con las flechas) agrupada por tipo
  const groups = useMemo(() => {
    const out = [];
    if (!nq) {
      const rec = recents();
      if (rec.length) out.push(["Recientes", rec.map((s) => ({ kind: "asset", symbol: s, name: ASSETS.find((a) => a.symbol === s || a.cedear === s)?.name }))]);
      out.push(["Ir a", PAGES.map(([to, label, icon, desc]) => ({ kind: "page", to, label, icon, desc }))]);
      if (username) out.push(["Tu cuenta", [{ kind: "page", to: `/u/${username}`, label: "Mi perfil", icon: "bi-person", desc: `@${username}` }]]);
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
    const assets = [...local, ...remote].slice(0, 7);
    if (assets.length) out.push(["Activos", assets]);
    if (people.rows.length) out.push(["Personas", people.rows.slice(0, 4).map((p) => ({ kind: "person", p }))]);
    const pages = PAGES.filter(([, label, , desc]) => norm(label).includes(nq) || norm(desc).includes(nq));
    if (pages.length) out.push(["Ir a", pages.map(([to, label, icon, desc]) => ({ kind: "page", to, label, icon, desc }))]);
    return out;
  }, [nq, yahoo, people.rows, username]);

  const flat = groups.flatMap(([, items]) => items);
  const sel = Math.min(cursor, Math.max(flat.length - 1, 0));

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
      onClose();
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

  let i = -1;
  return (
    <div className="modal-bg cmdk-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Buscar en Valeur">
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
            placeholder="Buscá un activo, una persona o una sección…"
            aria-label="Buscar"
            aria-controls="cmdk-list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>esc</kbd>
        </div>
        <div className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
          {groups.map(([title, items]) => (
            <div key={title} className="cmdk-group">
              <span className="cmdk-title">{title}</span>
              {items.map((it) => {
                i += 1;
                const idx = i;
                return (
                  <button
                    key={title + (it.symbol || it.to || it.p?.id)}
                    type="button"
                    role="option"
                    aria-selected={idx === sel}
                    className="cmdk-item"
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => go(it)}
                  >
                    {it.kind === "asset" && (
                      <>
                        <Logo symbol={it.symbol} size={28} />
                        <span className="ci-txt">
                          <b>{it.symbol}</b>
                          <span>{it.name || " "}</span>
                        </span>
                        {it.sub && <small>{it.sub}</small>}
                      </>
                    )}
                    {it.kind === "person" && (
                      <>
                        <Avatar name={it.p.username} size={28} />
                        <span className="ci-txt">
                          <b>
                            {it.p.display_name || it.p.username}
                            {it.p.verified && <Verified label={it.p.verified_label} />}
                          </b>
                          <span>@{it.p.username}</span>
                        </span>
                        <small>Perfil</small>
                      </>
                    )}
                    {it.kind === "page" && (
                      <>
                        <span className="ci-ic">
                          <i className={"bi " + it.icon} />
                        </span>
                        <span className="ci-txt">
                          <b>{it.label}</b>
                          <span>{it.desc}</span>
                        </span>
                      </>
                    )}
                    <i className="bi bi-arrow-return-left ci-go" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ))}
          {nq && !flat.length && (
            <p className="cmdk-none">
              {/^[A-Z0-9.=^-]{1,12}$/.test(q.trim().toUpperCase()) ? (
                <>
                  Enter para buscar <b>{q.trim().toUpperCase()}</b> en el mercado
                </>
              ) : (
                "No encontramos nada con eso."
              )}
            </p>
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
      </div>
    </div>
  );
}
