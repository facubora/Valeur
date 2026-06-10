import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const sym = query.trim().toUpperCase();
    if (!sym) return;
    setMenuOpen(false);
    navigate(`/tickersearch?symbol=${encodeURIComponent(sym)}`);
  };

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

        <form className="nav-search" onSubmit={handleSearch}>
          <i className="bi bi-search nav-search-icon"></i>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar un ticker"
            aria-label="Buscar ticker"
          />
        </form>

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
        <form className="nav-search nav-search-mobile" onSubmit={handleSearch}>
          <i className="bi bi-search nav-search-icon"></i>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar un ticker…"
            aria-label="Buscar ticker"
          />
        </form>
        <a href="/login" onClick={() => setMenuOpen(false)}>Iniciar Sesión</a>
        <a href="/register" className="nav-cta" onClick={() => setMenuOpen(false)}>Registrarse gratis</a>
      </nav>
    </header>
  );
}

export default Navbar;