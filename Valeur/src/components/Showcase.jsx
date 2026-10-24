import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import Logo from "./Logo";

/* Lo que va rotando en el adelanto (datos de ejemplo): el portfolio, una
   recomendación y una alerta de cada uno */
const SHOWCASE = [
  {
    total: 607.45, day: 2.14, spark: "M0 50 C24 46 40 34 66 37 S112 24 142 28 192 10 222 15 258 7 280 4",
    jug: { symbol: "NVDA", name: "NVIDIA", stance: "buy", text: "Data center sigue explotando; el crecimiento banca la valuación.", who: "@ana_inversiones · 3 h", pct: 17.8 },
    alert: { symbol: "MELI.BA", text: "Si MELI.BA llega a ARS 26.000", gap: "falta subir 4,1%", p: 82 },
  },
  {
    total: 1284.1, day: 0.86, spark: "M0 44 C30 48 52 30 80 34 S126 40 152 26 196 30 226 18 262 20 280 12",
    jug: { symbol: "MELI.BA", name: "MercadoLibre", stance: "hold", text: "Buen negocio, pero ya corrió mucho. Mantengo y no sumo.", who: "@juanchi · 1 d", pct: 3.2 },
    alert: { symbol: "AAPL", text: "Si Apple sube más de 3% en el día", gap: "hoy +1,9% de +3%", p: 63 },
  },
  {
    total: 342.9, day: -1.12, spark: "M0 12 C28 18 46 14 72 26 S118 22 146 34 188 30 220 42 256 38 280 46",
    jug: { symbol: "GGAL.BA", name: "Grupo Galicia", stance: "buy", text: "Los bancos son los primeros en levantar cuando baja la tasa.", who: "@sofi.m · 5 h", pct: 9.4 },
    alert: { symbol: "BTC-USD", text: "Si Bitcoin baja a US$ 78.000", gap: "falta bajar 4,2%", p: 71 },
  },
  {
    total: 2150.0, day: 3.4, spark: "M0 52 C26 50 44 44 70 40 S118 30 150 22 196 20 228 12 260 8 280 4",
    jug: { symbol: "TSLA", name: "Tesla", stance: "sell", text: "Márgenes cayendo trimestre a trimestre. Tomo ganancia.", who: "@marcos_fin · 2 d", pct: 6.1 },
    alert: { symbol: "YPF.BA", text: "Si YPF llega a ARS 48.000", gap: "falta subir 2,6%", p: 90 },
  },
  {
    total: 896.35, day: 1.48, spark: "M0 46 C30 40 48 44 76 32 S124 36 150 24 194 26 224 14 258 16 280 8",
    jug: { symbol: "BTC-USD", name: "Bitcoin", stance: "buy", text: "Compro de a poco todos los meses, sin mirar el precio.", who: "@caro.invierte · 6 h", pct: 12.5 },
    alert: { symbol: "NVDA", text: "Si NVIDIA cae más de 4% en el día", gap: "hoy +0,8% de −4%", p: 20 },
  },
];
const STANCE_TXT = { buy: ["Comprar", "bi-arrow-up-right"], hold: ["Mantener", "bi-pause"], sell: ["Vender", "bi-arrow-down-right"] };
const money2 = (n) => "US$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct1 = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2).replace(".", ",") + "%";
const EVERY = 4800;

/* El adelanto de la app: tres tarjetas que entran, flotan, siguen apenas al
   mouse y cada tanto cambian de activo. Va en entrar/registrarse (con el
   texto abajo) y en el hero de la landing. */
export default function Showcase({ className = "", headline = null, sub = null }) {
  const root = useRef(null);
  const [i, setI] = useState(0);
  const prev = useRef(SHOWCASE[0].total);
  const d = SHOWCASE[i];

  // entrada, flotado y mouse
  useLayoutEffect(() => {
    const el = root.current;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 901px)", () => {
      const cards = el.querySelectorAll(".as-card");
      gsap.from(cards, { y: 60, opacity: 0, rotation: (k) => [-6, 6, -4][k], duration: 1.2, stagger: 0.14, ease: "expo.out", delay: 0.1 });
      const cap = el.querySelector(".as-cap");
      if (cap) gsap.from(cap, { y: 24, opacity: 0, duration: 1, ease: "expo.out", delay: 0.45 });
      cards.forEach((c, k) => gsap.to(c, { y: k % 2 ? 10 : -10, duration: 3.4 + k * 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.4 + k * 0.2 }));
      const move = (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cards.forEach((c, k) => gsap.to(c, { x: x * (14 + k * 8), rotationY: x * 6, rotationX: -y * 6, duration: 0.9, ease: "power3.out", overwrite: "auto" }));
      };
      el.addEventListener("pointermove", move);
      // va cambiando de activo (con "reducir movimiento" se queda en el primero)
      const t = setInterval(() => setI((n) => (n + 1) % SHOWCASE.length), EVERY);
      return () => {
        el.removeEventListener("pointermove", move);
        clearInterval(t);
      };
    });
    return () => mm.revert();
  }, []);

  // cada cambio: el contenido entra de nuevo, el total cuenta y la línea se
  // dibuja (en un contexto que se revierte: si se corta, no queda a medias)
  useLayoutEffect(() => {
    const el = root.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const from = prev.current === d.total ? 0 : prev.current;
    prev.current = d.total;
    const ctx = gsap.context(() => {
      // se escribe sobre el mismo nodo de texto que maneja React
      const total = el.querySelector(".as-total").firstChild;
      const line = el.querySelector(".as-spark path");
      const len = line.getTotalLength();
      const n = { v: from };
      gsap
        .timeline()
        .to(n, { v: d.total, duration: 1.2, ease: "power3.out", onUpdate: () => (total.nodeValue = money2(n.v)) }, 0)
        .fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out" }, 0)
        .fromTo(el.querySelectorAll(".as-swap"), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.05 }, 0.05)
        .fromTo(el.querySelector(".as-bar i"), { width: 0 }, { width: d.alert.p + "%", duration: 1.2, ease: "expo.out" }, 0.2);
    }, el);
    return () => ctx.revert();
  }, [d]);

  const [label, icon] = STANCE_TXT[d.jug.stance];
  return (
    <aside className={className} ref={root} aria-hidden="true">
      <div className="as-stage">
        <div className="card as-card as-pf">
          <small>Tu portfolio</small>
          <b className="as-total">{money2(d.total)}</b>
          <span className={"as-swap " + (d.day >= 0 ? "txt-up" : "txt-down")}>
            <i className={d.day >= 0 ? "bi bi-caret-up-fill" : "bi bi-caret-down-fill"} /> {pct1(d.day)} hoy
          </span>
          <svg className={"as-spark" + (d.day >= 0 ? "" : " down")} viewBox="0 0 280 60" preserveAspectRatio="none">
            <path d={d.spark} />
          </svg>
        </div>
        <div className={"card as-card as-jug " + d.jug.stance}>
          <div className="as-band">
            <span className="as-swap as-id">
              <Logo key={d.jug.symbol} symbol={d.jug.symbol} size={30} />
              <span>
                <b>{d.jug.symbol}</b>
                <small>{d.jug.name}</small>
              </span>
            </span>
            <em className="as-swap">
              <i className={"bi " + icon} /> {label}
            </em>
          </div>
          <p className="as-swap">“{d.jug.text}”</p>
          <div className="as-ft as-swap">
            <span>{d.jug.who}</span>
            <b className={d.jug.stance === "sell" ? "txt-down" : d.jug.stance === "hold" ? "" : "txt-up"}>+{d.jug.pct.toFixed(1).replace(".", ",")}%</b>
          </div>
        </div>
        <div className="card as-card as-al">
          <Logo key={d.alert.symbol} symbol={d.alert.symbol} size={30} className="as-swap" />
          <span className="as-al-txt as-swap">
            <b>{d.alert.text}</b>
            <small>{d.alert.gap}</small>
            <span className="as-bar">
              <i style={{ width: d.alert.p + "%" }} />
            </span>
          </span>
          <i className="bi bi-bell-fill as-bell" />
        </div>
        <div className="as-dots">
          {SHOWCASE.map((x, k) => (
            <span key={x.jug.symbol} className={k === i ? "on" : ""} />
          ))}
        </div>
      </div>
      {headline && (
        <div className="as-cap">
          <b>{headline}</b>
          <span>{sub || "Seguí lo que tenés, enterate antes con alertas y mirá qué recomiendan los que sabés que saben."}</span>
        </div>
      )}
    </aside>
  );
}
