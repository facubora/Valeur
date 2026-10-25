import { Link } from "react-router-dom";
import { money, formatDate, useMep, useMarketStatus } from "../lib/market";

const YEAR = new Date().getFullYear();

const COLS = [
  [
    "La app",
    [
      ["/home", "Inicio"],
      ["/dashboard", "Portfolio"],
      ["/tickersearch", "Mercado"],
      ["/comunidad", "Comunidad"],
      ["/aprende", "Aprendé"],
    ],
  ],
  [
    "Tu cuenta",
    [
      ["/dashboard?operar=1", "Registrar operación"],
      ["/tickersearch#alertas", "Mis alertas"],
      ["/comunidad?publicar=1#recomendaciones", "Recomendar un activo"],
    ],
  ],
];

/* El pie de todas las pantallas de la app: la marca, a dónde ir, cómo están
   los mercados y de dónde salen los datos */
export default function AppFooter({ username, onSearch }) {
  const markets = useMarketStatus();
  const fx = useMep();

  return (
    <footer className="vx-foot">
      <div className="wrap">
        <div className="vf-top">
          <div className="vf-brand">
            <Link to="/home" className="brand" aria-label="Valeur, ir al inicio">
              <span className="mark" />
              Valeur
            </Link>
            <p>Tu plata, el mercado y tu gente, en un solo lugar.</p>
            <div className="vf-status">
              {markets.map((m) => (
                <span key={m.key} className={m.open ? "open" : ""} title={`${m.hint} (hora argentina)`}>
                  <i /> {m.key} {m.open ? "abierto" : "cerrado"}
                </span>
              ))}
              {fx.mep && (
                <span title={`Cierre ${formatDate(fx.mep.date)}`}>
                  MEP <b>{money(fx.mep.rate, 0, "ARS")}</b>
                </span>
              )}
            </div>
          </div>

          <nav className="vf-cols" aria-label="Pie de página">
            {COLS.map(([title, links]) => (
              <div key={title}>
                <b>{title}</b>
                <ul>
                  {title === "Tu cuenta" && username && (
                    <li>
                      <Link to={`/u/${username}`}>Mi perfil</Link>
                    </li>
                  )}
                  {links.map(([to, label]) => (
                    <li key={to}>
                      <Link to={to}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <b>Atajos</b>
              <ul>
                <li>
                  <button type="button" onClick={onSearch}>
                    Buscar <kbd>⌘K</kbd>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    Volver arriba <i className="bi bi-arrow-up" />
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="vf-bottom">
          <span>© {YEAR} Valeur · Hecho en Argentina</span>
          <span>Cotizaciones de Yahoo Finance, con demora. Lo que ves es información, no asesoramiento financiero.</span>
        </div>
      </div>
      {/* la marca grande, apenas marcada, cerrando la página */}
      <div className="vf-word" aria-hidden="true">
        Valeur
      </div>
    </footer>
  );
}
