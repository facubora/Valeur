import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout, { PasswordField, FormError, SubmitButton, PasswordRules } from "../components/AuthLayout";
import { passwordOk } from "../lib/password";
import { useAuth } from "../context/AuthContext";

/* Si el enlace vino con error (vencido o ya usado), Supabase lo pone en la URL */
function linkError() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
  return params.get("error_code") || params.get("error") || "";
}

/* Contraseña nueva: se llega desde el enlace del mail, que ya abre la sesión */
export default function NewPassword() {
  const navigate = useNavigate();
  const { user, loading: checking, updatePassword } = useAuth();
  const [badLink] = useState(linkError);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordOk(form.password, form.confirm)) return;
    setLoading(true);
    setError("");
    const { error: err } = await updatePassword(form.password);
    setLoading(false);
    if (err) setError(err);
    else setDone(true);
  };

  if (checking && !badLink) {
    return (
      <AuthLayout headline="Te ayudamos a volver.">
        <span className="done-ic" aria-hidden="true">
          <span className="spinner" />
        </span>
        <h1>Abriendo el enlace…</h1>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout headline="Te ayudamos a volver.">
        <span className="done-ic" aria-hidden="true">
          <i className="bi bi-shield-check" />
        </span>
        <h1>
          Listo, ya la <em>cambiaste</em>.
        </h1>
        <p>A partir de ahora entrás con la contraseña nueva.</p>
        <div className="auth-form">
          <button type="button" className="btn btn-pink" onClick={() => navigate("/home", { replace: true })}>
            Ir a mi inicio <i className="bi bi-arrow-right" />
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (badLink || !user) {
    return (
      <AuthLayout headline="Te ayudamos a volver.">
        <span className="done-ic warn" aria-hidden="true">
          <i className="bi bi-link-45deg" />
        </span>
        <h1>
          El enlace ya no <em>sirve</em>.
        </h1>
        <p>Puede que haya vencido o que ya lo hayas usado. Pedí uno nuevo y abrilo desde el último mail que te llegue.</p>
        <div className="auth-form">
          <Link to="/recuperar" className="btn btn-pink">
            Pedir otro enlace <i className="bi bi-arrow-right" />
          </Link>
        </div>
        <p className="auth-alt">
          <Link to="/login">Volver a entrar</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Te ayudamos a volver.">
      <span className="kicker">Recuperar acceso</span>
      <h1>
        Elegí una contraseña <em>nueva</em>.
      </h1>
      <p>
        Para <b>{user.email}</b>. Abajo vas viendo si cumple todo.
      </p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="row-2">
          <PasswordField
            label="Contraseña nueva"
            name="password"
            placeholder="8 o más"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
          />
          <PasswordField
            label="Repetila"
            name="confirm"
            placeholder="••••••••"
            value={form.confirm}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
        </div>
        <PasswordRules password={form.password} confirm={form.confirm} />

        <FormError error={error} />

        <SubmitButton loading={loading} loadingText="Guardando…" disabled={loading || !passwordOk(form.password, form.confirm)}>
          Guardar contraseña <i className="bi bi-arrow-right" />
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
