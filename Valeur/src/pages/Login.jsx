import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout, { PasswordField, IconField, FormError, SubmitButton } from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const navigate = useNavigate();
  const { user, signIn, configured } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Ya logueado → al dashboard
  useEffect(() => {
    if (user) navigate("/home", { replace: true });
  }, [user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = form.email.trim();
    if (!email || !form.password) return setError("Completá el email y la contraseña");
    if (!EMAIL_RE.test(email)) return setError("El email no es válido");
    setLoading(true);
    setError("");
    const { error: err } = await signIn(email, form.password);
    setLoading(false);
    if (err) setError(err);
    // si salió bien, onAuthStateChange setea el user y el efecto redirige
  };

  return (
    <AuthLayout headline="Tu plata, el mercado y tu gente.">
      <span className="kicker">Tu cuenta</span>
      <h1>
        Tu portfolio te <em>espera</em>.
      </h1>
      <p>Entrá y fijate cómo viene el día.</p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <IconField
          label="Email"
          icon="bi-envelope"
          id="email"
          type="email"
          name="email"
          placeholder="tu@email.com"
          value={form.email}
          onChange={handleChange}
          required
          autoComplete="email"
          autoFocus
        />

        <PasswordField
          label="Contraseña"
          name="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
        />

        <FormError error={!configured ? "Falta configurar Supabase: copiá .env.example a .env" : error} />

        <SubmitButton loading={loading} loadingText="Entrando…" disabled={loading || !configured}>
          Entrar <i className="bi bi-arrow-right" />
        </SubmitButton>
      </form>

      <p className="auth-alt">
        ¿No tenés cuenta? <Link to="/register">Creala gratis</Link>
      </p>
    </AuthLayout>
  );
}
