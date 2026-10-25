import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Showcase from "./Showcase";
import { passwordScore } from "../lib/password";
import "../styles/app.css";

/* Login/registro: a la izquierda el adelanto de la app (u otro panel, como
   los pasos de recuperar la contraseña) y a la derecha el formulario */
export default function AuthLayout({ headline, sub, aside = null, children }) {
  const { dark, toggle } = useTheme();
  return (
    <div className="app-root auth">
      {aside ?? <Showcase className="auth-show" headline={headline} sub={sub} />}
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
    <button type="submit" className="btn btn-pink" disabled={loading} aria-busy={loading} {...props}>
      {loading && <span className="spinner sm" aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  );
}

const LEVELS = ["Muy fácil", "Débil", "Más o menos", "Buena", "Fuerte"];

/* Requisitos en vivo debajo de los campos: la barrita de fuerza y los tildes
   que se marcan mientras escribís */
export function PasswordRules({ password, confirm }) {
  const score = passwordScore(password);
  const rules = [
    ["8 caracteres o más", password.length >= 8],
    ["Que no sea de las comunes", password.length > 0 && score > 0],
    ["Las dos coinciden", confirm.length > 0 && password === confirm],
  ];
  const tip =
    password.length === 0
      ? "Mezclá letras, números y algún símbolo."
      : score < 3
        ? "Sumá números, mayúsculas o un símbolo para hacerla más fuerte."
        : score < 4
          ? "Bien. Con un símbolo o más largo queda fuerte."
          : "Muy bien, es difícil de adivinar.";
  return (
    <div className="pw-rules" data-score={password ? score : ""} aria-live="polite">
      <div className="pw-meter" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={password && score >= n ? "on" : ""} />
        ))}
      </div>
      <div className="pw-level">
        <b>{password ? LEVELS[score] : "Seguridad"}</b>
        <span>{tip}</span>
      </div>
      <ul>
        {rules.map(([label, ok]) => (
          <li key={label} className={ok ? "ok" : ""}>
            <i className={"bi " + (ok ? "bi-check-circle-fill" : "bi-circle")} aria-hidden="true" />
            {label}
            <span className="sr-only">{ok ? " (listo)" : " (falta)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
