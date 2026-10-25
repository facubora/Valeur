import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout, { PasswordField, IconField, FormError, SubmitButton, PasswordRules } from "../components/AuthLayout";
import { passwordScore } from "../lib/password";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
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
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("El email no es válido");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (passwordScore(form.password) === 0) {
      setError("Esa contraseña es muy común, elegí otra");
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
      <AuthLayout headline="Ya casi estás adentro.">
        <span className="done-ic" aria-hidden="true">
          <i className="bi bi-envelope-check" />
        </span>
        <h1>
          Revisá tu <em>email</em>.
        </h1>
        <p>
          Te mandamos un enlace a <b>{form.email.trim()}</b> para confirmar la cuenta. Cuando lo abras, ya podés entrar.
        </p>
        <p className="auth-alt">
          <Link to="/login">Ir a entrar</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Empezá hoy, aunque nunca hayas invertido." sub="Gratis, sin tarjeta. Cargá lo que tenés, seguí activos y aprendé de tu gente.">
      <span className="kicker">Cuenta nueva</span>
      <h1>
        Empezá a invertir <em>hoy</em>.
      </h1>
      <p>Gratis, en un minuto y sin tarjeta.</p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <IconField
          label="Usuario"
          prefix="@"
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
        />
        <div className="row-2">
          <PasswordField
            label="Contraseña"
            name="password"
            placeholder="8 o más"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            autoComplete="new-password"
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

        <FormError error={!configured ? "Falta configurar Supabase: copiá .env.example a .env" : error} />

        <SubmitButton loading={loading} loadingText="Creando cuenta…" disabled={loading || !configured}>
          Crear cuenta gratis <i className="bi bi-arrow-right" />
        </SubmitButton>
      </form>

      <p className="auth-alt">
        ¿Ya tenés cuenta? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
