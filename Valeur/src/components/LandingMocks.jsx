import { useState } from "react";
import Logo from "./Logo";
import { Avatar } from "./Social";

/* Maquetas de la landing: pedazos de la app con datos de ejemplo, hechos
   con las mismas piezas (tarjetas, fichas, filas) para que se vea lo que
   hay adentro. Algunas se pueden tocar. */

const MEP = 1557;
const HUES = [230, 300, 150];
const usd = (n) => "US$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ars = (n) => "ARS " + Math.round(n).toLocaleString("es-AR");
const pct = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2).replace(".", ",") + "%";

/* una línea de precio inventada pero estable (misma semilla, misma forma) */
function sparkPath(seed, up, w = 96, h = 28) {
  let v = 0.5;
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const r = Math.sin(seed * 9.3 + i * 1.7) * 0.5 + Math.sin(seed * 3.1 + i * 0.6) * 0.5;
    v = Math.min(0.92, Math.max(0.08, v + r * 0.12 + (up ? -0.025 : 0.025)));
    pts.push([(i / 15) * w, v * h]);
  }
  return "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
}

function Spark({ seed, up }) {
  return (
    <svg className={"lx-spark " + (up ? "up" : "down")} viewBox="0 0 96 28" preserveAspectRatio="none" aria-hidden="true">
      <path d={sparkPath(seed, up)} />
    </svg>
  );
}

/* ── Portfolio: el total, cómo viene el día y las posiciones; la moneda se
   puede cambiar ─────────────────────────────────────────────────────────── */
const POSITIONS = [
  { symbol: "AAPL.BA", name: "Apple · CEDEAR", value: 1840.2, pnl: 12.4 },
  { symbol: "MELI", name: "MercadoLibre", value: 1520, pnl: 31.2 },
  { symbol: "BTC-USD", name: "Bitcoin", value: 858.4, pnl: -3.1 },
];

export function PortfolioMock() {
  const [cur, setCur] = useState("USD");
  const total = POSITIONS.reduce((s, p) => s + p.value, 0);
  const fmt = (n) => (cur === "USD" ? usd(n) : ars(n * MEP));
  return (
    <div className="card lx-mock lx-pf">
      <div className="lx-mock-head">
        <span className="lx-lbl">Tu portfolio</span>
        <div className="cur-seg" data-cur={cur} role="radiogroup" aria-label="Moneda">
          <span className="cur-thumb" aria-hidden="true" />
          {[
            ["USD", "US$"],
            ["ARS", "AR$"],
          ].map(([c, t]) => (
            <button key={c} type="button" role="radio" aria-checked={c === cur} className={c === cur ? "on" : ""} onClick={() => setCur(c)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <b className="lx-big">{fmt(total)}</b>
      <span className="lx-day txt-up">
        <i className="bi bi-caret-up-fill" /> {pct(1.32)} hoy · {cur === "USD" ? "+US$ 55,02" : "+ARS 85.666"}
      </span>
      <div className="lx-alloc" aria-hidden="true">
        {POSITIONS.map((p, i) => (
          <span key={p.symbol} style={{ flex: p.value, background: `oklch(0.62 0.16 ${HUES[i]})` }} />
        ))}
      </div>
      <ul className="lx-rows">
        {POSITIONS.map((p, i) => (
          <li key={p.symbol}>
            <span className="lx-dot" style={{ background: `oklch(0.62 0.16 ${HUES[i]})` }} />
            <Logo symbol={p.symbol} size={30} />
            <span className="lx-name">
              <b>{p.symbol}</b>
              <small>{p.name}</small>
            </span>
            <span className="lx-num">
              <b>{fmt(p.value)}</b>
              <small className={p.pnl >= 0 ? "txt-up" : "txt-down"}>{pct(p.pnl)}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Mercado: pestañas con ficha que se desliza y filas con su línea ─── */
const MARKET = {
  cedear: [
    ["NVDA.BA", "NVIDIA", "ARS 9.360", 2.41],
    ["AAPL.BA", "Apple", "ARS 18.410", -0.59],
    ["MELI.BA", "MercadoLibre", "ARS 25.660", 1.12],
    ["KO.BA", "Coca-Cola", "ARS 21.980", 0.34],
  ],
  accion: [
    ["GGAL.BA", "Grupo Galicia", "ARS 6.120", 3.05],
    ["YPFD.BA", "YPF", "ARS 46.800", 1.87],
    ["PAMP.BA", "Pampa Energía", "ARS 3.415", -0.92],
    ["BMA.BA", "Banco Macro", "ARS 10.250", 2.2],
  ],
  cripto: [
    ["BTC-USD", "Bitcoin", "US$ 81.402", 0.11],
    ["ETH-USD", "Ethereum", "US$ 2.399", -1.04],
    ["SOL-USD", "Solana", "US$ 104,01", 4.6],
    ["USDT-USD", "Tether", "US$ 1,00", 0.01],
  ],
};
const MTABS = [
  ["cedear", "CEDEARs"],
  ["accion", "Acciones"],
  ["cripto", "Cripto"],
];

export function MarketMock() {
  const [tab, setTab] = useState("cedear");
  const idx = MTABS.findIndex(([k]) => k === tab);
  return (
    <div className="card lx-mock lx-mkt">
      <div className="vx-tabs sm" role="radiogroup" aria-label="Qué mirar" style={{ "--n": MTABS.length, "--i": idx }}>
        <span className="vx-tabs-thumb" aria-hidden="true" />
        {MTABS.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      <ul className="lx-rows" key={tab}>
        {MARKET[tab].map(([sym, name, price, chg], i) => (
          <li key={sym} style={{ "--d": i }}>
            <Logo symbol={sym} size={30} />
            <span className="lx-name">
              <b>{sym}</b>
              <small>{name}</small>
            </span>
            <Spark seed={sym.length * 7 + i * 3 + idx} up={chg >= 0} />
            <span className="lx-num">
              <b>{price}</b>
              <small className={chg >= 0 ? "txt-up" : "txt-down"}>{pct(chg)}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Alertas: cuánto le falta a cada una y el aviso que llega ───────── */
export function AlertsMock() {
  return (
    <div className="lx-al-wrap">
      <div className="card lx-mock lx-al">
        <span className="lx-lbl">Tus alertas</span>
        <ul className="lx-rows">
          {[
            ["MELI.BA", "Si llega a ARS 26.000", "falta subir 1,3%", 96],
            ["NVDA", "Si cae más de 4% en el día", "hoy −0,6% de −4%", 15],
            ["BTC-USD", "Si baja a US$ 78.000", "falta bajar 4,2%", 71],
          ].map(([sym, what, gap, p]) => (
            <li key={sym}>
              <Logo symbol={sym} size={30} />
              <span className="lx-name">
                <b>{sym}</b>
                <small>{what}</small>
              </span>
              <span className="lx-gap">
                <span className="lx-bar">
                  <i style={{ width: p + "%" }} />
                </span>
                <small>{gap}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {/* el aviso que cae a la campanita */}
      <div className="card lx-toast">
        <span className="lx-bell">
          <i className="bi bi-bell-fill" />
        </span>
        <span>
          <b>MELI.BA llegó a ARS 26.000</b>
          <small>Ahora cotiza a ARS 26.040 · recién</small>
        </span>
      </div>
    </div>
  );
}

/* ── Comunidad: dos recomendaciones como en la app ─────────────────── */
const JUGADAS = [
  { symbol: "NVDA", name: "NVIDIA", stance: "buy", call: ["Comprar", "bi-arrow-up-right"], body: "Data center sigue explotando; la valuación no es barata pero el crecimiento la banca.", who: "Ana Pereyra", user: "ana_inversiones", meta: "3 h · 12 les sirvió", perf: 17.8, how: "va bien" },
  { symbol: "TSLA", name: "Tesla", stance: "sell", call: ["Vender", "bi-arrow-down-right"], body: "Márgenes cayendo trimestre a trimestre. Tomo ganancia.", who: "Juan Cruz", user: "juanchi", meta: "1 d · 4 les sirvió", perf: -6.1, how: "va bien" },
];

export function CommunityMock() {
  return (
    <div className="lx-jugs">
      {JUGADAS.map((j) => (
        <article key={j.symbol} className={"card post jug " + j.stance}>
          <div className="jug-band">
            <Logo symbol={j.symbol} size={38} />
            <span className="jug-asset">
              <b>{j.symbol}</b>
              <small>{j.name}</small>
            </span>
            <span className="jug-call">
              <i className={"bi " + j.call[1]} /> {j.call[0]}
            </span>
          </div>
          <blockquote className="jug-body">{j.body}</blockquote>
          <footer className="jug-foot">
            <div className="jug-who">
              <Avatar name={j.user} size={28} />
              <div>
                <span className="jug-name">{j.who}</span>
                <span className="jug-meta">{j.meta}</span>
              </div>
            </div>
            <div className="jug-perf">
              <b className={j.perf >= 0 ? "txt-up" : "txt-down"}>
                {j.perf >= 0 ? "+" : "−"}
                {Math.abs(j.perf).toFixed(1).replace(".", ",")}%
              </b>
              <small>{j.how}</small>
            </div>
          </footer>
        </article>
      ))}
    </div>
  );
}

/* ── Privacidad: quién ve tu portfolio (se puede elegir) ───────────── */
const VIS = [
  ["private", "Privado", "bi-lock", "Solo vos ves tu portfolio."],
  ["friends", "Amigos", "bi-people", "Lo ven quienes se siguen con vos."],
  ["public", "Público", "bi-globe2", "Lo ve cualquiera en Valeur."],
];

export function PrivacyMock() {
  const [v, setV] = useState("friends");
  return (
    <div className="lx-vis" role="radiogroup" aria-label="Quién ve tu portfolio">
      {VIS.map(([k, label, icon, desc]) => (
        <button key={k} type="button" role="radio" aria-checked={v === k} className={"card lx-vis-opt" + (v === k ? " on" : "")} onClick={() => setV(k)}>
          <i className={"bi " + icon} />
          <b>{label}</b>
          <span>{desc}</span>
        </button>
      ))}
    </div>
  );
}
