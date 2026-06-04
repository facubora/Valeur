import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { dark, toggle } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 760) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#hero" className="nav-logo" onClick={() => setMenuOpen(false)}>
          Valeur<span>.</span>
        </a>

        <nav className="nav-links">
          <a href="#problem-section">¿Por qué Valeur?</a>
          <a href="/tickersearch">Búsqueda</a>
          <a href="#features">Funcionalidades</a>
        </nav>

        <div className="nav-actions">
          <button
            className="nav-theme-toggle"
            onClick={toggle}
            aria-label="Cambiar tema"
            title={dark ? "Modo claro" : "Modo oscuro"}
          >
            {dark ? <i class="bi bi-sun"></i> : <i className="bi bi-moon"></i>}
          </button>

          <a href="/login" className="nav-login">Iniciar Sesión</a>
          <a href="/register" className="nav-cta">Registrarse</a>

          <button
            className={`nav-hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menú"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      {/* Mobile drawer */}
      <nav className={`nav-mobile-menu ${menuOpen ? "open" : ""}`}>
        <a href="#features" onClick={() => setMenuOpen(false)}>Funciones</a>
        <a href="#social" onClick={() => setMenuOpen(false)}>Buscar</a>
        <a href="/login" onClick={() => setMenuOpen(false)}>Iniciar Sesión</a>
        <a href="/register" className="nav-cta" onClick={() => setMenuOpen(false)}>Registrarse gratis</a>
      </nav>
    </header>
  );
}

export default Navbar;