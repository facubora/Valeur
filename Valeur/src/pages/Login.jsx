import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout, { PasswordField, FormError, SubmitButton } from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

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
    setLoading(true);
    setError("");
    const { error: err } = await signIn(form.email.trim(), form.password);
    setLoading(false);
    if (err) setError(err);
    // si salió bien, onAuthStateChange setea el user y el efecto redirige
  };

  return (
    <AuthLayout
      headline={
        <>
          Tu portfolio te <em>espera</em>.
        </>
      }
    >
      <h1>Bienvenido de vuelta.</h1>
      <p>Ingresá a tu cuenta para continuar.</p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
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
        </div>

        <PasswordField
          label="Contraseña"
          name="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
        />

        <FormError
          error={
            !configured
              ? "Falta configurar Supabase: copiá .env.example a .env"
              : error
          }
        />

        <SubmitButton loading={loading} loadingText="Ingresando…" disabled={loading || !configured}>
          Iniciar sesión
        </SubmitButton>
      </form>

      <p className="auth-alt">
        ¿No tenés cuenta? <Link to="/register">Registrate gratis</Link>
      </p>
    </AuthLayout>
  );
}
