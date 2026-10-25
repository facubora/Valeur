import { Link, useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";

/* 404: la dirección no existe. Una ficha de "activo" punteada (vacío) que
   cotiza en cero, y a dónde ir. */
export default function NotFound() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const home = user ? "/home" : "/";
  const links = user
    ? [
        ["/tickersearch", "bi-graph-up", "Mercado"],
        ["/dashboard", "bi-wallet2", "Portfolio"],
      ]
    : [
        ["/login", "bi-box-arrow-in-right", "Entrar"],
        ["/register", "bi-person-plus", "Crear cuenta"],
      ];

  return (
    <AppShell>
      <section className="e404">
        <div className="e404-copy">
          <span className="kicker">Error 404</span>
          <h1>
            Acá no hay <em>nada</em>.
          </h1>
          <p>
            La dirección <code>{pathname}</code> no existe o se movió. Puede que el link esté mal escrito o que esa página ya no esté.
          </p>
          <div className="e404-acts">
            <Link to={home} className="btn btn-pink">
              <i className="bi bi-house" /> Ir al inicio
            </Link>
            {links.map(([to, icon, label]) => (
              <Link key={to} to={to} className="btn btn-line">
                <i className={"bi " + icon} /> {label}
              </Link>
            ))}
          </div>
        </div>

        {/* la página como si fuera un activo: punteada y en cero */}
        <div className="e404-card" aria-hidden="true">
          <div className="e404-band">
            <span className="e404-logo">?</span>
            <span className="e404-id">
              <b>PAG.404</b>
              <small>Página no encontrada</small>
            </span>
            <span className="e404-chg">
              <i className="bi bi-caret-down-fill" /> −100%
            </span>
          </div>
          <b className="e404-price">US$ 0,00</b>
          <svg className="e404-spark" viewBox="0 0 300 90" preserveAspectRatio="none">
            <path d="M0 22 L30 18 L58 26 L86 14 L112 20 L138 12 L160 24 L182 30 L200 52 L214 46 L232 74 L252 70 L272 86 L300 88" />
          </svg>
          <small className="e404-foot">Sin cotización desde que la buscaste</small>
        </div>
      </section>
    </AppShell>
  );
}
