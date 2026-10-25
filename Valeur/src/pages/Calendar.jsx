import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Logo from "../components/Logo";
import Pill from "../components/Pill";
import Term from "../components/Term";
import { SkList } from "../components/Skeleton";
import { SectionHead } from "../components/Sections";
import { useAuth } from "../context/AuthContext";
import { lookup } from "../lib/catalog";
import { tickerUrl } from "../lib/market";
import { useTrades, useWatchlist } from "../lib/portfolio";
import { EVENT_KIND, useEvents, whenTxt, daysUntil, heldSymbols } from "../lib/events";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const FILTERS = [
  ["all", "Todo"],
  ["earnings", "Resultados"],
  ["div", "Dividendos"],
];
const usd = (n) => "US$ " + Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const big = (n) => "US$ " + new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
// "Este mes", "El mes que viene", "En 2 meses" (con el año si no es este)
const monthsAway = (y, m) => {
  const now = new Date();
  const n = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());
  const txt = n <= 0 ? "Este mes" : n === 1 ? "El mes que viene" : `En ${n} meses`;
  return y !== now.getFullYear() ? `${txt} · ${y}` : txt;
};
const parse = (day) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/* Calendario: cuándo presentan resultados y cuándo cortan o pagan el
   dividendo las empresas que tenés o seguís, de acá a 4 meses. El backend
   avisa el día antes. */
export default function Calendar() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id;
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const trades = useTrades(uid);
  const watch = useWatchlist(uid);
  const held = useMemo(() => heldSymbols(trades.rows), [trades.rows]);
  const watched = useMemo(() => watch.rows.map((w) => w.symbol), [watch.rows]);
  const mine = useMemo(() => [...new Set([...held, ...watched])], [held, watched]);
  const ready = trades.loaded && watch.loaded;
  const ev = useEvents(mine, ready);
  const [filter, setFilter] = useState("all");

  // una empresa puede aparecer dos veces (el CEDEAR y la de origen): se deja la que tenés
  const all = useMemo(() => {
    const seen = new Map();
    for (const e of ev.events) {
      const k = `${e.base}|${e.kind}|${e.date}`;
      const prev = seen.get(k);
      if (!prev || (held.includes(e.symbol) && !held.includes(prev.symbol))) seen.set(k, e);
    }
    return [...seen.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.symbol < b.symbol ? -1 : 1));
  }, [ev.events, held]);
  const shown = all.filter((e) => filter === "all" || (filter === "earnings" ? e.kind === "earnings" : e.kind !== "earnings"));
  const months = useMemo(() => {
    const by = new Map();
    for (const e of shown) {
      const k = e.date.slice(0, 7);
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(e);
    }
    return [...by];
  }, [shown]);

  const nextEarn = all.find((e) => e.kind === "earnings");
  const nextDiv = all.find((e) => e.kind === "exdiv");
  const loading = !ready || !ev.loaded;
  const fi = FILTERS.findIndex(([k]) => k === filter);

  return (
    <AppShell>
      <section className="page-head">
        <div>
          <span className="kicker">Calendario</span>
          <h1>
            Lo que viene en <em>tus empresas</em>.
          </h1>
          {!loading && (
            <div className="hpills" aria-label="Lo próximo">
              {nextEarn && <Pill to={`#e-${nextEarn.symbol}-${nextEarn.kind}-${nextEarn.date}`} icon="bi-clipboard-data" label={`Resultados ${nextEarn.symbol}`} value={whenTxt(nextEarn.date)} />}
              {nextDiv && <Pill to={`#e-${nextDiv.symbol}-${nextDiv.kind}-${nextDiv.date}`} icon="bi-scissors" label={`Dividendo ${nextDiv.symbol}`} value={whenTxt(nextDiv.date)} />}
              <Pill icon="bi-bell" label="Te avisamos" value="el día antes" />
            </div>
          )}
        </div>
        <div className="vx-tabs cal-tabs" role="radiogroup" aria-label="Qué mostrar" style={{ "--n": FILTERS.length, "--i": fi }}>
          <span className="vx-tabs-thumb" aria-hidden="true" />
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="block">
          <SkList n={4} />
        </section>
      ) : !mine.length ? (
        <CalGhost text="Todavía no tenés ni seguís ninguna empresa. Seguí algunas en el Mercado y acá vas a ver cuándo presentan resultados y pagan dividendos." />
      ) : !shown.length ? (
        <CalGhost
          text={
            ev.error
              ? "No pudimos traer el calendario. Fijate que el backend esté andando y probá de nuevo."
              : filter === "div"
                ? "Ninguna de tus empresas corta ni paga dividendos en los próximos 4 meses."
                : "No hay nada en los próximos 4 meses para lo que tenés o seguís. Las cripto, los índices y los ETFs no presentan resultados."
          }
        />
      ) : (
        months.map(([month, list]) => {
          const [y, m] = month.split("-").map(Number);
          return (
            <section key={month} className="block">
              <SectionHead kicker={monthsAway(y, m)} title={MONTHS[m - 1].charAt(0).toUpperCase() + MONTHS[m - 1].slice(1)} desc={`${list.length} ${list.length === 1 ? "evento" : "eventos"}`} />
              <ol className="card cal-list">
                {list.map((e) => (
                  <EventRow key={`${e.symbol}-${e.kind}-${e.date}`} e={e} held={held.includes(e.symbol)} />
                ))}
              </ol>
            </section>
          );
        })
      )}

      <section className="block">
        <div className="cal-help">
          <div>
            <i className="bi bi-clipboard-data" />
            <span>
              <b>
                <Term k="resultados">Resultados</Term>
              </b>{" "}
              Cada tres meses la empresa cuenta cuánto vendió y cuánto ganó. Si le fue mejor de lo que esperaban, el precio suele subir; si le fue peor, bajar.
            </span>
          </div>
          <div>
            <i className="bi bi-scissors" />
            <span>
              <b>
                <Term k="dividendo">Dividendo</Term>
              </b>{" "}
              Parte de la ganancia que se reparte. Para cobrarlo tenés que tener la acción antes del día de corte; se paga unos días o semanas después.
            </span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function EventRow({ e, held }) {
  const k = EVENT_KIND[e.kind];
  const d = parse(e.date);
  const n = daysUntil(e.date);
  const name = lookup(e.symbol)?.name || e.base;
  const cedear = e.symbol !== e.base;
  let detail = "";
  if (e.kind === "earnings") {
    detail = [e.eps != null && `Esperan ${usd(e.eps)} de ganancia por acción`, e.revenue && `ventas por ${big(e.revenue)}`].filter(Boolean).join(" y ");
  } else if (e.amount) {
    detail = `${e.kind === "exdiv" ? "El último fue de" : "De"} ${usd(e.amount)} por acción${cedear ? ` de ${e.base} (el CEDEAR cobra su parte)` : ""}`;
  }
  return (
    <li id={`e-${e.symbol}-${e.kind}-${e.date}`} className={"cal-row " + e.kind + (n <= 1 ? " soon" : "")}>
      <span className="cal-day">
        <small>{WEEKDAYS[d.getDay()]}</small>
        <b>{d.getDate()}</b>
      </span>
      <Link to={tickerUrl(e.symbol)} className="cal-id">
        <Logo symbol={e.symbol} size={34} />
        <span className="cal-id-txt">
          <b>{e.symbol}</b>
          <small>{name}</small>
        </span>
      </Link>
      <span className="cal-what">
        <b>
          <i className={"bi " + k.icon} /> {k.label}
        </b>
        {detail && <small>{detail}</small>}
      </span>
      <span className="cal-meta">
        <em className={"cal-when" + (n <= 1 ? " soon" : "")}>{whenTxt(e.date)}</em>
        <small>{held ? "La tenés" : "La seguís"}</small>
      </span>
    </li>
  );
}

function CalGhost({ text }) {
  return (
    <section className="block">
      <div className="cal-ghost">
        <div className="card gh-row" aria-hidden="true">
          <span className="gh-av sq" />
          <span className="gh-ln w40" />
          <span className="gh-pill" />
        </div>
        <p>
          {text} <Link to="/tickersearch">Ir al Mercado</Link>
        </p>
      </div>
    </section>
  );
}
