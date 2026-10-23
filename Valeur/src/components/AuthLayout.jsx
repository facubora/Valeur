import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useTheme } from "../context/ThemeContext";
import "../styles/app.css";

/* Login/registro: el formulario a la izquierda y, a la derecha, un adelanto
   de lo que te espera adentro (portfolio, una recomendación y una alerta)
   en tarjetas que entran y flotan. Los datos del adelanto son de ejemplo. */
export default function AuthLayout({ headline, sub, children }) {
  const { dark, toggle } = useTheme();
  const show = useRef(null);

  useLayoutEffect(() => {
    const root = show.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 901px)", () => {
      const cards = root.querySelectorAll(".as-card");
      const line = root.querySelector(".as-spark path");
      const total = root.querySelector(".as-total");
      const len = line.getTotalLength();
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(cards, { y: 60, opacity: 0, rotation: (i) => [-6, 6, -4][i], duration: 1.2, stagger: 0.14 }, 0.1)
        .from(root.querySelector(".as-cap"), { y: 24, opacity: 0, duration: 1 }, 0.45)
        .fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.6, ease: "power2.out" }, 0.5)
        .from(root.querySelector(".as-bar i"), { width: 0, duration: 1.4 }, 0.8);
      // el total sube como si recién se calculara
      const n = { v: 0 };
      tl.to(n, { v: 607.45, duration: 1.4, ease: "power3.out", onUpdate: () => (total.textContent = "US$ " + n.v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })) }, 0.35);
      // después, cada tarjeta flota a su ritmo
      cards.forEach((c, i) => {
        gsap.to(c, { y: i % 2 ? 10 : -10, duration: 3.4 + i * 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.4 + i * 0.2 });
      });
      // y siguen apenas al mouse, cada una a su profundidad
      const move = (e) => {
        const r = root.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cards.forEach((c, i) => gsap.to(c, { x: x * (14 + i * 8), rotationY: x * 6, rotationX: -y * 6, duration: 0.9, ease: "power3.out", overwrite: "auto" }));
      };
      root.addEventListener("pointermove", move);
      return () => root.removeEventListener("pointermove", move);
    });
    return () => mm.revert();
  }, []);

  return (
    <div className="app-root auth">
      <section className="auth-side">
        <div className="auth-top">
          <Link to="/" className="brand" aria-label="Valeur, ir al inicio">
            <span className="mark" />
            Valeur
          </Link>
          <button type="button" className="icon-btn" onClick={toggle} aria-label={dark ? "Modo claro" : "Modo oscuro"} title={dark ? "Modo claro" : "Modo oscuro"}>
            <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-fill"} />
          </button>
        </div>
        <div className="auth-box">{children}</div>
        <span className="auth-foot">© {new Date().getFullYear()} Valeur · Hecho en Argentina</span>
      </section>

      <aside className="auth-show" ref={show} aria-hidden="true">
        <div className="as-stage">
          <div className="card as-card as-pf">
            <small>Tu portfolio</small>
            <b className="as-total">US$ 607,45</b>
            <span className="txt-up">
              <i className="bi bi-caret-up-fill" /> +2,14% hoy
            </span>
            <svg className="as-spark" viewBox="0 0 280 60" preserveAspectRatio="none">
              <path d="M0 50 C24 46 40 34 66 37 S112 24 142 28 192 10 222 15 258 7 280 4" />
            </svg>
          </div>
          <div className="card as-card as-jug">
            <div className="as-band">
              <span className="as-logo nv">NV</span>
              <b>NVDA</b>
              <em>
                <i className="bi bi-arrow-up-right" /> Comprar
              </em>
            </div>
            <p>“Data center sigue explotando; el crecimiento banca la valuación.”</p>
            <div className="as-ft">
              <span>@ana_inversiones · 3 h</span>
              <b className="txt-up">+17,8%</b>
            </div>
          </div>
          <div className="card as-card as-al">
            <span className="as-logo ml">ML</span>
            <span className="as-al-txt">
              <b>Si MELI.BA llega a ARS 26.000</b>
              <small>falta subir 4,1%</small>
              <span className="as-bar">
                <i />
              </span>
            </span>
            <i className="bi bi-bell-fill as-bell" />
          </div>
        </div>
        <div className="as-cap">
          <b>{headline}</b>
          <span>{sub || "Seguí lo que tenés, enterate antes con alertas y mirá qué recomiendan los que sabés que saben."}</span>
        </div>
      </aside>
    </div>
  );
}

/* Input de contraseña con botón para mostrar/ocultar */
export function PasswordField({ label, aside = null, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={props.id ?? props.name}>
        {label}
        {aside}
      </label>
      <div className="in">
        <i className="bi bi-lock in-ic" aria-hidden="true" />
        <input id={props.id ?? props.name} type={show ? "text" : "password"} {...props} />
        <button
          type="button"
          className="eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          title={show ? "Ocultar" : "Mostrar"}
          tabIndex={-1}
        >
          <i className={show ? "bi bi-eye-slash" : "bi bi-eye"} />
        </button>
      </div>
    </div>
  );
}

/* Input con ícono a la izquierda (email, usuario) */
export function IconField({ label, icon, prefix = null, ...props }) {
  return (
    <div className="field">
      <label htmlFor={props.id ?? props.name}>{label}</label>
      <div className="in">
        {prefix ? <span className="in-ic pre">{prefix}</span> : <i className={"bi " + icon + " in-ic"} aria-hidden="true" />}
        <input id={props.id ?? props.name} {...props} />
      </div>
    </div>
  );
}

/* Error del formulario: abre/cierra el espacio con transición y no salta.
   Guarda el último mensaje para que se lea mientras se cierra. */
export function FormError({ error }) {
  const [last, setLast] = useState(error);
  if (error && error !== last) setLast(error);
  return (
    <div className="form-msg" data-open={Boolean(error)} aria-live="polite">
      <div>
        {last && (
          <p className="form-err" role="alert" key={last}>
            <i className="bi bi-exclamation-circle-fill" /> {last}
          </p>
        )}
      </div>
    </div>
  );
}

/* Botón principal con spinner mientras se procesa */
export function SubmitButton({ loading, children, loadingText, ...props }) {
  return (
    <button type="submit" className="btn btn-pink" disabled={loading} {...props}>
      {loading && <span className="spinner sm" aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  );
}
