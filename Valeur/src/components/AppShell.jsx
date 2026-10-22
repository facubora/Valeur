import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { initials } from "../lib/session";
import { useWatchlist } from "../lib/portfolio";
import NotificationBell from "./NotificationBell";
import MarketTape from "./MarketTape";
import CommandPalette from "./CommandPalette";
import { ConfirmHost, ToastHost } from "./Feedback";
import "../styles/app.css";
import "../styles/social.css";
import "../styles/shell.css";

const NAV = [
  ["/home", "Inicio", "bi-house-door", "bi-house-door-fill"],
  ["/dashboard", "Portfolio", "bi-wallet2", "bi-wallet-fill"],
  ["/tickersearch", "Mercado", "bi-graph-up", "bi-graph-up-arrow"],
  ["/comunidad", "Comunidad", "bi-people", "bi-people-fill"],
];

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/* Cáscara de la app: cinta de mercado en vivo, barra con navegación numerada
   y buscador global (⌘K), y en mobile una barra de pestañas abajo. */
export default function AppShell({ children }) {
  const { dark, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const watch = useWatchlist(user?.id);

  const navRef = useRef(null);
  const indRef = useRef(null);
  const topRef = useRef(null);
  const menuRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

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

  // Buscador global: ⌘K / Ctrl+K desde cualquier lado, "/" si no se está escribiendo
  useEffect(() => {
    const onKey = (e) => {
      const typing = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // El trazo de la navegación se mueve directo en el DOM (sin re-render)
  const moveTo = (el) => {
    const ind = indRef.current;
    if (!el || !ind) return;
    ind.style.transform = `translateX(${el.offsetLeft}px)`;
    ind.style.width = `${el.offsetWidth}px`;
    ind.style.opacity = "1";
  };
  const activeLink = () => navRef.current?.querySelector("a.active");

  // Sobre la ruta activa; se reacomoda al redimensionar o al cargar las fuentes
  useLayoutEffect(() => {
    moveTo(activeLink());
    const onResize = () => moveTo(activeLink());
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pathname]);

  // Barra con fondo y línea al pasar el tope de la página
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
    <div className="app-root shell">
      <MarketTape watch={watch.rows} />
      <span ref={topRef} className="shell-sentinel" aria-hidden="true" />

      <header className={"vx-top" + (scrolled ? " scrolled" : "")}>
        <div className="wrap vx-bar">
          <Link to={user ? "/home" : "/"} className="brand" aria-label="Valeur, ir al inicio">
            <span className="mark" />
            Valeur
          </Link>

          <nav ref={navRef} className="vx-nav" aria-label="Secciones de la app" onMouseLeave={() => moveTo(activeLink())}>
            {NAV.map(([to, label, icon, iconOn], i) => (
              <NavLink key={to} to={to} onMouseEnter={(e) => moveTo(e.currentTarget)}>
                {({ isActive }) => (
                  <>
                    <span className="n">{String(i + 1).padStart(2, "0")}</span>
                    <i className={"bi " + (isActive ? iconOn : icon)} />
                    <span className="t">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <span ref={indRef} className="vx-ind" aria-hidden="true" />
          </nav>

          <div className="vx-right">
            <div className="vx-tools">
              <button type="button" className="vx-search" onClick={() => setSearch(true)} aria-label="Buscar (⌘K)">
                <i className="bi bi-search" />
                <span>Buscar activos, personas…</span>
                <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>
              </button>
              {user && <NotificationBell uid={user.id} />}
              {user && (
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
                    <span className="uname">{user.username}</span>
                    <i className="bi bi-chevron-down caret" aria-hidden="true" />
                  </button>
                  {menu && (
                    <div className="user-menu" role="menu">
                      <div className="who">
                        <b>@{user.username}</b>
                        <span>{user.email}</span>
                      </div>
                      <Link to={`/u/${user.username}`} role="menuitem" onClick={() => setMenu(false)}>
                        <i className="bi bi-person" /> Mi perfil
                      </Link>
                      <Link to="/dashboard" role="menuitem" onClick={() => setMenu(false)}>
                        <i className="bi bi-wallet2" /> Mi portfolio
                      </Link>
                      <button type="button" role="menuitem" onClick={toggle}>
                        <i className={dark ? "bi bi-sun" : "bi bi-moon"} /> {dark ? "Modo claro" : "Modo oscuro"}
                      </button>
                      <button type="button" role="menuitem" className="danger" onClick={logout}>
                        <i className="bi bi-box-arrow-right" /> Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!user && (
              <Link to="/login" className="btn btn-pink btn-sm">
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="wrap app-main">{children}</main>

      {/* Mobile: pestañas abajo, al alcance del pulgar */}
      <nav className="tabbar" aria-label="Secciones de la app">
        {NAV.map(([to, label, icon, iconOn]) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <>
                <i className={"bi " + (isActive ? iconOn : icon)} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Dock flotante: tema (mismo que la landing; en mobile está en el menú) */}
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

      <CommandPalette open={search} onClose={() => setSearch(false)} username={user?.username} />
      <ConfirmHost />
      <ToastHost />
    </div>
  );
}
