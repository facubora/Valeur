import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthLayout, { IconField, FormError, SubmitButton } from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Recuperar la contraseña: pide el mail y manda el enlace para elegir una nueva */
export default function ForgotPassword() {
  const { state } = useLocation();
  const { resetPassword, configured } = useAuth();
  const [email, setEmail] = useState(state?.email ?? "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean) return setError("Escribí tu email");
    if (!EMAIL_RE.test(clean)) return setError("El email no es válido");
    setLoading(true);
    setError("");
    const { error: err } = await resetPassword(clean);
    setLoading(false);
    if (err) setError(err);
    else setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout headline="Te ayudamos a volver.">
        <span className="done-ic" aria-hidden="true">
          <i className="bi bi-envelope-check" />
        </span>
        <h1>
          Revisá tu <em>email</em>.
        </h1>
        <p>
          Si <b>{email.trim()}</b> tiene una cuenta en Valeur, te llega un enlace para elegir una contraseña nueva. Fijate también en spam.
        </p>
        <p className="auth-alt">
          ¿No llegó?{" "}
          <button type="button" className="link-btn" onClick={() => setSent(false)}>
            Probá de nuevo
          </button>{" "}
          · <Link to="/login">Volver a entrar</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Te ayudamos a volver.">
      <span className="kicker">Recuperar acceso</span>
      <h1>
        ¿Te <em>olvidaste</em> la contraseña?
      </h1>
      <p>Pasá tu email y te mandamos un enlace para elegir una nueva.</p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <IconField
          label="Email"
          icon="bi-envelope"
          id="email"
          type="email"
          name="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          required
          autoComplete="email"
          autoFocus
        />

        <FormError error={!configured ? "Falta configurar Supabase: copiá .env.example a .env" : error} />

        <SubmitButton loading={loading} loadingText="Mandando…" disabled={loading || !configured}>
          Mandame el enlace <i className="bi bi-arrow-right" />
        </SubmitButton>
      </form>

      <p className="auth-alt">
        ¿Te acordaste? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
