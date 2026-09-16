import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import "../styles/app.css";

/* Layout de login/registro: panel de marca a la izquierda + formulario */
export default function AuthLayout({ headline, children }) {
  const { dark, toggle } = useTheme();

  return (
    <div className="app-root auth">
      <aside className="auth-panel">
        <span className="auth-glow" aria-hidden="true" />
        <Link to="/" className="brand" aria-label="Valeur, ir al inicio">
          <span className="mark" />
          Valeur
        </Link>
        <div>
          <h2>{headline}</h2>
          <p>
            La forma simple, social y accesible de empezar a invertir — aunque
            nunca lo hayas hecho.
          </p>
          <div className="pts">
            <span>
              <i className="bi bi-check-circle-fill" /> Gratis, sin tarjeta ni
              planes
            </span>
            <span>
              <i className="bi bi-check-circle-fill" /> Precios y gráficos en
              tiempo real
            </span>
            <span>
              <i className="bi bi-check-circle-fill" /> Una comunidad para
              aprender de otros
            </span>
          </div>
        </div>
        <span className="foot">© 2026 Valeur — Invertí con inteligencia.</span>
      </aside>

      <section className="auth-side">
        <Link to="/" className="brand auth-mobile-brand" aria-label="Valeur, ir al inicio">
          <span className="mark" />
          Valeur
        </Link>
        <button
          type="button"
          className="icon-btn"
          onClick={toggle}
          aria-label={dark ? "Modo claro" : "Modo oscuro"}
          title={dark ? "Modo claro" : "Modo oscuro"}
        >
          <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-fill"} />
        </button>
        <div className="auth-box">
          <Link to="/" className="auth-back">
            <i className="bi bi-arrow-left" /> Volver al inicio
          </Link>
          {children}
        </div>
      </section>
    </div>
  );
}

/* Input de contraseña con botón para mostrar/ocultar */
export function PasswordField({ label, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={props.id ?? props.name}>{label}</label>
      <div className="in">
        <input
          id={props.id ?? props.name}
          type={show ? "text" : "password"}
          {...props}
        />
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
