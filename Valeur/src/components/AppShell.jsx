import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useWatchlist } from "../lib/portfolio";
import { useMyProfile } from "../lib/social";
import { useAlertWatcher, useNotifications } from "../lib/alerts";
import { BellButton, NotificationsPanel } from "./NotificationBell";
import { Verified } from "./Social";
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

/* Lo que se ve en el cajón: las secciones de cada página */
const DRAWER = {
  "/home": [
    ["resumen", "Tu portfolio", "bi-wallet2"],
    ["movimientos", "Movimientos", "bi-activity"],
    ["seguidos", "Seguidos", "bi-star"],
    ["para-vos", "Para vos", "bi-stars"],
  ],
  "/dashboard": [
    ["resumen", "Resumen", "bi-pie-chart"],
    ["posiciones", "Posiciones", "bi-list-ul"],
    ["operaciones", "Operaciones", "bi-arrow-left-right"],
  ],
  "/tickersearch": [
    ["para-vos", "Para vos", "bi-stars"],
    ["explorar", "Explorar", "bi-grid"],
    ["alertas", "Alertas", "bi-bell"],
    ["comunidad", "Lo que se recomienda", "bi-chat-square-quote"],
  ],
  "/comunidad": [
    ["recomendaciones", "Recomendaciones", "bi-chat-square-quote"],
    ["personas", "Personas", "bi-people"],
    ["perfil", "Tu perfil", "bi-person"],
  ],
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/* Cáscara de la app: cinta de mercado en vivo, barra con navegación numerada,
   buscador global (⌘K) y un cajón que se despliega desde la barra con las
   secciones de cada página, atajos y la cuenta. En mobile, pestañas abajo. */
export default function AppShell({ children }) {
  const { dark, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname, hash, key } = useLocation();
  const watch = useWatchlist(user?.id);
  const profile = useMyProfile(user?.id);

  const navRef = useRef(null);
  const indRef = useRef(null);
  const topRef = useRef(null);
  const barRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  // qué se despliega de la barra: null | "more" (el cajón con las secciones)
  // | "notif" (notificaciones) | "me" (la cuenta). Uno a la vez.
  const [panel, setPanel] = useState(null);
  const drawer = panel === "more";
  const flip = (k) => setPanel((p) => (p === k ? null : k));
  const close = () => setPanel(null);
  // vigía de alertas de precio + notificaciones en vivo (campanita)
  useAlertWatcher(user?.id);
  const notifs = useNotifications(user?.id);
  const [search, setSearch] = useState(false);
  const [tapeOff, setTapeOff] = useState(() => {
    try {
      return localStorage.getItem("valeur-tape") === "off";
    } catch {
      return false;
    }
  });
  const setTape = (on) => {
    setTapeOff(!on);
    try {
      localStorage.setItem("valeur-tape", on ? "on" : "off");
    } catch {
      /* sin almacenamiento: vale solo para esta página */
    }
  };

  // Lo desplegado se cierra con Escape o al elegir un destino
  useEffect(() => {
    if (!panel) return;
    const onKey = (e) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  // Links con ancla (/tickersearch#alertas): bajar a la sección cuando aparezca
  useEffect(() => {
    const id = hash.slice(1);
    if (!id) return;
    let tries = 0;
    const t = setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 20) clearInterval(t);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearInterval(t);
  }, [hash, key]);

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
  // con el cajón de secciones abierto, la ficha se queda en "Más"
  const activeLink = () => navRef.current?.querySelector(panel === "more" ? ".vx-more" : "a.active");

  // Sobre la ruta activa; se reacomoda al redimensionar o al cargar las fuentes
  useLayoutEffect(() => {
    // el recuadro de "Más" arranca donde arranca la navegación, y el índice
    // de la página sale del link de la página en la que estás
    const place = () => {
      const bar = barRef.current;
      const nav = navRef.current;
      if (!bar || !nav) return;
      const here = nav.querySelector("a.active");
      bar.style.setProperty("--nav-x", `${nav.offsetLeft - 8}px`);
      bar.style.setProperty("--sub-x", `${nav.offsetLeft + (here ? here.offsetLeft : 0) - 8}px`);
    };
    place();
    moveTo(activeLink());
    const onResize = () => {
      place();
      moveTo(activeLink());
    };
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, panel]);

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
  const me = profile.data;
  const name = me?.display_name || user?.username;

  return (
    <div className="app-root shell">
      {/* la cinta se prende y se apaga desde Tu cuenta (y se recuerda) */}
      <div className={"tape-wrap" + (tapeOff ? " off" : "")} inert={tapeOff}>
        <div className="tape-clip">
          <MarketTape watch={watch.rows} />
        </div>
      </div>
      <span ref={topRef} className="shell-sentinel" aria-hidden="true" />

      <header className={"vx-top" + (scrolled ? " scrolled" : "")}>
        <div ref={barRef} className="wrap vx-bar">
          <Link to={user ? "/home" : "/"} className="brand" aria-label="Valeur, ir al inicio">
            <span className="mark" />
            Valeur
          </Link>

          <nav ref={navRef} className="vx-nav" aria-label="Secciones de la app" onMouseLeave={() => moveTo(activeLink())}>
            {NAV.map(([to, label, icon, iconOn]) => (
              <NavLink key={to} to={to} onMouseEnter={(e) => moveTo(e.currentTarget)}>
                {({ isActive }) => (
                  <>
                    <i className={"bi " + (isActive ? iconOn : icon)} />
                    <span className="t">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            {user && (
              <button
                type="button"
                className={"vx-more" + (panel === "more" ? " on" : "")}
                aria-expanded={panel === "more"}
                aria-controls="vx-drawer"
                onClick={() => flip("more")}
                onMouseEnter={(e) => moveTo(e.currentTarget)}
              >
                Más
                <i className="bi bi-chevron-down" aria-hidden="true" />
              </button>
            )}
            <span ref={indRef} className="vx-ind" aria-hidden="true" />
          </nav>

          <div className="vx-right">
            <button type="button" className="vx-search" onClick={() => setSearch(true)} aria-label="Buscar (⌘K)">
              <i className="bi bi-search" />
              <span>Buscar activos, personas…</span>
              <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>
            </button>
            {user && <BellButton unread={notifs.unread} open={panel === "notif"} onClick={() => flip("notif")} />}
            {user ? (
              <>
                <button
                  type="button"
                  className={"vx-me" + (panel === "me" ? " on" : "")}
                  aria-expanded={panel === "me"}
                  aria-controls="vx-me-pop"
                  onClick={() => flip("me")}
                >
                  <span className="vx-me-txt">
                    <b>
                      {name}
                      {me?.verified && <Verified label={me.verified_label} />}
                    </b>
                    <small>@{user.username}</small>
                  </span>
                  <i className="bi bi-person-circle" aria-hidden="true" />
                </button>
                {/* en mobile la navegación no está: el cajón se abre desde acá */}
                <button
                  type="button"
                  className={"vx-more-m" + (panel === "more" ? " on" : "")}
                  aria-label={panel === "more" ? "Cerrar el menú" : "Abrir el menú"}
                  aria-expanded={panel === "more"}
                  aria-controls="vx-drawer"
                  onClick={() => flip("more")}
                >
                  <i className={panel === "more" ? "bi bi-x-lg" : "bi bi-grid"} />
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-pink btn-sm">
                Iniciar sesión
              </Link>
            )}
          </div>

          {/* hueco para el índice de la página (SectionNav), que cuelga de la barra */}
          <div id="vx-sub-slot" className="vx-sub-slot" />

          {/* Recuadros que salen de la barra: secciones (debajo de la navegación),
              notificaciones y cuenta (a la derecha) */}
          {user && (
            <>
              <div
                id="vx-drawer"
                className={"vx-pop more-pop" + (drawer ? " open" : "")}
                inert={!drawer}
                onClick={(e) => e.target.closest("a") && close()}
              >
                <div className="vx-pop-in">
                  <div className="vx-dr-grid">
                    {NAV.map(([to, label]) => (
                      <div key={to} className={"dr-col" + (pathname.startsWith(to) ? " here" : "")}>
                        <Link to={to} className="dr-title">
                          {label}
                          <i className="bi bi-arrow-right" />
                        </Link>
                        <ul>
                          {DRAWER[to].map(([id, sub, ic]) => (
                            <li key={id}>
                              <Link to={`${to}#${id}`}>
                                <i className={"bi " + ic} /> {sub}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={"vx-pop notif-pop" + (panel === "notif" ? " open" : "")} inert={panel !== "notif"}>
                <div className="vx-pop-in">
                  <NotificationsPanel {...notifs} onGo={close} />
                </div>
              </div>
              <div
                id="vx-me-pop"
                className={"vx-pop me-pop" + (panel === "me" ? " open" : "")}
                inert={panel !== "me"}
                onClick={(e) => e.target.closest("a") && close()}
              >
                <div className="vx-pop-in">
                  <div className="mp">
                    <Link to={`/u/${user.username}`} className="mp-who">
                      <b>
                        {name}
                        {me?.verified && <Verified label={me.verified_label} />}
                      </b>
                      <small>{user.email}</small>
                    </Link>
                    <div className="mp-list">
                      <Link to={`/u/${user.username}`}>
                        <i className="bi bi-person" /> Mi perfil
                      </Link>
                      <Link to="/dashboard">
                        <i className="bi bi-wallet2" /> Mi portfolio
                      </Link>
                      <Link to="/dashboard?operar=1">
                        <i className="bi bi-plus-lg" /> Registrar operación
                      </Link>
                      <Link to="/comunidad?publicar=1#recomendaciones">
                        <i className="bi bi-chat-square-quote" /> Recomendar un activo
                      </Link>
                      <Link to="/tickersearch#alertas">
                        <i className="bi bi-bell" /> Mis alertas
                      </Link>
                      <button type="button" role="switch" aria-checked={!tapeOff} className="mp-switch" onClick={() => setTape(tapeOff)}>
                        <i className="bi bi-activity" /> Cinta de cotizaciones
                        <span className="sw" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mp-foot">
                      <div className="theme-seg" role="radiogroup" aria-label="Tema">
                        <button type="button" role="radio" aria-checked={!dark} className={!dark ? "on" : ""} onClick={() => dark && toggle()} aria-label="Modo claro">
                          <i className="bi bi-sun-fill" />
                        </button>
                        <button type="button" role="radio" aria-checked={dark} className={dark ? "on" : ""} onClick={() => !dark && toggle()} aria-label="Modo oscuro">
                          <i className="bi bi-moon-fill" />
                        </button>
                      </div>
                      <button type="button" className="mp-out" onClick={logout}>
                        <i className="bi bi-box-arrow-right" /> Cerrar sesión
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      </header>
      <div className={"vx-scrim" + (panel ? " on" : "")} onClick={close} aria-hidden="true" />

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
