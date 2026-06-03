import { useEffect, useState } from "react";

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#hero" className="nav-logo">
          Valeur<span>.</span>
        </a>

        <nav className="nav-links">
          <a href="#features">Funciones</a>
          <a href="#social">Comunidad</a>
          <a href="#how">Cómo funciona</a>
        </nav>

        <div className="nav-actions">
          <a href="/login" className="nav-login">Iniciar Sesión</a>
          <a href="#cta" className="nav-cta">Registrarse</a>
        </div>
      </div>
    </header>
  );
}

export default Navbar;