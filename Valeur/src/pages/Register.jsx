import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout, { PasswordField, FormError, SubmitButton } from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export default function Register() {
  const navigate = useNavigate();
  const { user, signUp, configured } = useAuth();
  const [done, setDone] = useState(false); // registrado, falta confirmar el mail
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/home", { replace: true });
  }, [user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const username = form.username.trim();
    if (!USERNAME_RE.test(username)) {
      setError("El usuario debe tener 3 a 30 caracteres: letras, números o guión bajo");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err, needsConfirmation } = await signUp({
      username,
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);
    if (err) setError(err);
    else if (needsConfirmation) setDone(true);
    // con sesión inmediata, el efecto de arriba redirige al dashboard
  };

  if (done) {
    return (
      <AuthLayout
        headline={
          <>
            Un paso <em>más</em>.
          </>
        }
      >
        <span className="done-ic" aria-hidden="true">
          <i className="bi bi-envelope-check" />
        </span>
        <h1>Revisá tu email.</h1>
        <p>
          Te mandamos un enlace a <b>{form.email.trim()}</b> para confirmar la
          cuenta. Cuando lo abras, ya podés iniciar sesión.
        </p>
        <p className="auth-alt">
          <Link to="/login">Ir a iniciar sesión</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      headline={
        <>
          Empezá a invertir <em>hoy</em>.
        </>
      }
    >
      <h1>Creá tu cuenta.</h1>
      <p>Gratis, en un minuto y sin tarjeta.</p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="field">
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            name="username"
            placeholder="tunombre"
            value={form.username}
            onChange={handleChange}
            required
            autoComplete="username"
            autoFocus
          />
        </div>

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
          />
        </div>

        <PasswordField
          label="Contraseña"
          name="password"
          placeholder="Mínimo 8 caracteres"
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
          autoComplete="new-password"
        />

        <PasswordField
          label="Confirmá la contraseña"
          name="confirm"
          placeholder="••••••••"
          value={form.confirm}
          onChange={handleChange}
          required
          autoComplete="new-password"
        />

        <FormError
          error={
            !configured
              ? "Falta configurar Supabase: copiá .env.example a .env"
              : error
          }
        />

        <SubmitButton loading={loading} loadingText="Creando cuenta…" disabled={loading || !configured}>
          Crear cuenta gratis
        </SubmitButton>
      </form>

      <p className="auth-alt">
        ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
