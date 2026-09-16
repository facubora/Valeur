import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { initials } from "../lib/session";
import "../styles/app.css";

const NAV = [
  ["/home", "Inicio", "bi-house-door-fill"],
  ["/dashboard", "Portfolio", "bi-pie-chart-fill"],
  ["/tickersearch", "Mercado", "bi-graph-up-arrow"],
];

/* Cáscara común de la app: el mismo navbar de la landing (pill al scrollear,
   indicador que sigue el mouse y la ruta activa) + sesión a la derecha. */
export default function AppShell({ children }) {
  const { dark, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navRef = useRef(null);
  const indRef = useRef(null);
  const topRef = useRef(null);
  const menuRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  // Menú de usuario: se cierra con Escape o clic afuera
  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => e.key === "Escape" && setMenu(false);
    const onDown = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [menu]);

  // El indicador se mueve directo en el DOM (sin re-render)
  const moveTo = (el) => {
    const ind = indRef.current;
    if (!el || !ind) return;
    ind.style.transform = `translateX(${el.offsetLeft}px)`;
    ind.style.width = `${el.offsetWidth}px`;
    ind.style.opacity = "1";
  };
  const activeLink = () => navRef.current?.querySelector("a.active");

  // El indicador se posiciona sobre la ruta activa (y se reacomoda al redimensionar)
  useLayoutEffect(() => {
    moveTo(activeLink());
    const onResize = () => moveTo(activeLink());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pathname]);

  // Pill del navbar al pasar el tope de la página
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 });
    if (topRef.current) obs.observe(topRef.current);
    return () => obs.disconnect();
  }, []);

  const logout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="app-root">
      <span ref={topRef} className="scroll-sentinel" aria-hidden="true" />
      <header className={"top" + (scrolled ? " scrolled" : "")}>
        <div className="wrap top-in">
          <Link to="/" className="brand" aria-label="Valeur, ir al inicio">
            <span className="mark" />
            Valeur
          </Link>

          <nav ref={navRef} aria-label="Secciones de la app" onMouseLeave={() => moveTo(activeLink())}>
            {NAV.map(([to, label, icon]) => (
              <NavLink key={to} to={to} title={label} onMouseEnter={(e) => moveTo(e.currentTarget)}>
                <i className={"bi " + icon} />
                <span>{label}</span>
              </NavLink>
            ))}
            <span ref={indRef} className="nav-ind" />
          </nav>

          <div className="right">
            {user ? (
              <div className="user-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="user-chip"
                  aria-haspopup="menu"
                  aria-expanded={menu}
                  onClick={() => setMenu((m) => !m)}
                  title={`@${user.username}`}
                >
                  <span className="avatar">{initials(user.username)}</span>
                  <span className="uname">@{user.username}</span>
                  <i className="bi bi-chevron-down caret" aria-hidden="true" />
                </button>
                {menu && (
                  <div className="user-menu" role="menu">
                    <div className="who">
                      <b>@{user.username}</b>
                      <span>{user.email}</span>
                    </div>
                    <Link to="/dashboard" role="menuitem" onClick={() => setMenu(false)}>
                      <i className="bi bi-pie-chart" /> Mi portfolio
                    </Link>
                    <button type="button" role="menuitem" className="danger" onClick={logout}>
                      <i className="bi bi-box-arrow-right" /> Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-pink">
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="wrap app-main">{children}</main>

      {/* Dock flotante: tema (mismo que la landing) */}
      <div className="dock">
        <div className="theme-seg" role="radiogroup" aria-label="Tema">
          <button
            type="button"
            role="radio"
            aria-checked={!dark}
            className={!dark ? "on" : ""}
            onClick={() => dark && toggle()}
            aria-label="Modo claro"
            title="Modo claro"
          >
            <i className="bi bi-sun-fill" />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={dark}
            className={dark ? "on" : ""}
            onClick={() => !dark && toggle()}
            aria-label="Modo oscuro"
            title="Modo oscuro"
          >
            <i className="bi bi-moon-fill" />
          </button>
        </div>
      </div>
    </div>
  );
}
