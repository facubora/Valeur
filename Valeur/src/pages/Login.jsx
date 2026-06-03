import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = "http://localhost:5001/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch {
      setError("No se pudo conectar al servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <a href="/" className="auth-logo">Valeur<span>.</span></a>

        <h1 className="auth-title">Bienvenido de vuelta</h1>
        <p className="auth-subtitle">Ingresá a tu cuenta para continuar</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="auth-switch">
          ¿No tenés cuenta? <Link to="/register">Registrate gratis</Link>
        </p>
      </div>
    </div>
  );
}
