function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">

        <a href="#hero" className="footer-logo">
          Valeur<span>.</span>
        </a>

        <nav className="footer-links">
          <a href="#features">Funciones</a>
          <a href="#social">Comunidad</a>
          <a href="#how">Cómo funciona</a>
          <a href="/login">Iniciar sesión</a>
        </nav>

        <p className="footer-copy">
          © {year} Valeur. Todos los derechos reservados.
        </p>

      </div>
    </footer>
  );
}

export default Footer;