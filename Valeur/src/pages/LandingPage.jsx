import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import "../styles/landing.css";

/* Fondo de partículas (estilo ReactBits) — canvas liviano */
function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parent = c.parentElement;
    let W,
      H,
      parts = [],
      mx = -999,
      my = -999,
      raf;

    function build() {
      parts = [];
      let n = Math.round((W * H) / (dpr * dpr * 14000));
      n = Math.max(36, Math.min(90, n));
      for (let i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: Math.random(),
          vx: (Math.random() - 0.5) * 0.12 * dpr,
          vy: (Math.random() - 0.5) * 0.12 * dpr,
        });
      }
    }
    function resize() {
      const r = parent.getBoundingClientRect();
      W = c.width = r.width * dpr;
      H = c.height = r.height * dpr;
      c.style.width = r.width + "px";
      c.style.height = r.height + "px";
      build();
    }
    function tick() {
      ctx.clearRect(0, 0, W, H);
      // Igual que la landing: solo es oscuro con data-theme="dark" explícito
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      const base = dark ? "255,255,255" : "37,99,235";
      const accent = dark ? "194,92,245" : "20,71,230";
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        const dx = p.x - mx,
          dy = p.y - my,
          dist = Math.sqrt(dx * dx + dy * dy);
        const r = (0.7 + p.z * 1.8) * dpr,
          op = 0.18 + p.z * 0.34;
        if (dist < 120 * dpr) {
          const pull = (1 - dist / (120 * dpr)) * 0.4;
          p.x += (dx / dist) * pull;
          p.y += (dy / dist) * pull;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, 6.28);
        ctx.fillStyle =
          p.z > 0.86
            ? "rgba(" + accent + "," + (op + 0.15) + ")"
            : "rgba(" + base + "," + op + ")";
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    function onMove(e) {
      const r = c.getBoundingClientRect();
      mx = (e.clientX - r.left) * dpr;
      my = (e.clientY - r.top) * dpr;
    }
    function onLeave() {
      mx = -999;
      my = -999;
    }

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", resize);
    resize();
    tick();
    return () => {
      cancelAnimationFrame(raf);
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}

const NAV = [
  ["#features", "Producto"],
  ["#como", "Cómo funciona"],
  ["#comunidad", "Comunidad"],
  ["#gratis", "Arrancá"],
];

export default function LandingPage() {
  const { dark, toggle } = useTheme();
  const navRef = useRef(null);
  const activeRef = useRef(null);
  const [ind, setInd] = useState({ x: 0, w: 0, o: 0 });
  const [scrolled, setScrolled] = useState(false);
  const [navPill, setNavPill] = useState(false);

  const moveTo = (el) => {
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth, o: 1 });
  };
  const setActive = (el) => {
    if (el && el !== activeRef.current) {
      activeRef.current = el;
      moveTo(el);
    }
  };
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  useLayoutEffect(() => {
    const first = navRef.current?.querySelector("a");
    if (first) {
      activeRef.current = first;
      moveTo(first);
    }
    const onResize = () => moveTo(activeRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // El indicador sigue la sección visible mientras el usuario scrollea
  useEffect(() => {
    const links = {};
    navRef.current?.querySelectorAll("a").forEach((a) => {
      links[a.getAttribute("href")] = a;
    });
    const sections = NAV.map(([href]) =>
      document.getElementById(href.slice(1)),
    ).filter(Boolean);
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(links["#" + e.target.id]);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  // Estado de scroll vía sentinels (funciona sin importar qué elemento scrollee):
  // pill del navbar al pasar el tope, botón "volver arriba" tras ~480px.
  const topRef = useRef(null);
  const deepRef = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.target === topRef.current) setNavPill(!e.isIntersecting);
          if (e.target === deepRef.current) setScrolled(!e.isIntersecting);
        });
      },
      { threshold: 0 },
    );
    if (topRef.current) obs.observe(topRef.current);
    if (deepRef.current) obs.observe(deepRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing-root">
      <span ref={topRef} className="scroll-sentinel" aria-hidden="true" style={{ top: 0 }} />
      <span ref={deepRef} className="scroll-sentinel" aria-hidden="true" style={{ top: 480 }} />
      {/* NAV */}
      <header className={"top" + (navPill ? " scrolled" : "")}>
        <div className="wrap top-in">
          <div className="brand">
            <span className="mark" />
            Valeur<b></b>
          </div>
          <nav ref={navRef} onMouseLeave={() => moveTo(activeRef.current)}>
            {NAV.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onMouseEnter={(e) => moveTo(e.currentTarget)}
                onClick={(e) => {
                  activeRef.current = e.currentTarget;
                }}
              >
                {label}
              </a>
            ))}
            <span
              className="nav-ind"
              style={{
                transform: `translateX(${ind.x}px)`,
                width: ind.w,
                opacity: ind.o,
              }}
            />
          </nav>
          <div className="right">
            <Link to="/login" className="link-strong">
              Iniciar Sesión
            </Link>
            <Link to="/register" className="btn btn-pink">
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <Particles />
        <span className="hero-glow" aria-hidden="true" />
        <div className="wrap hero-in">
          <div className="hero-copy">
            <h1>
              <span className="l">Invertí con</span>
              <span className="l">
                inteligencia,
              </span>
              <span className="l">crecé con <em>amigos</em>.</span>
            </h1>
            <p className="lead">
              La forma simple, social y accesible de empezar a invertir — aunque
              nunca lo hayas hecho. Seguí el mercado, aprendé de otros y decidí
              con contexto.
            </p>
            <div className="cta-row">
              <Link to="/register" className="btn btn-pink">
                Empezar gratis
              </Link>
              <a href="#como" className="btn btn-line">
                Ver cómo funciona
              </a>
            </div>
          </div>
          <div className="orbit" aria-hidden="true">
            <div className="ring r3">
              <span
                className="node"
                style={{ background: "oklch(0.62 0.16 230)" }}
              >
                FA
              </span>
              <span
                className="node node2"
                style={{ background: "oklch(0.6 0.18 300)" }}
              >
                FB
              </span>
            </div>
            <div className="ring r2">
              <span
                className="node"
                style={{ background: "oklch(0.65 0.15 150)" }}
              >
                RS
              </span>
              <span className="node dot-m" />
            </div>
            <div className="core">Valeur</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="blk wrap" id="features">
        <div className="head-2">
          <h2>
            Todo lo que necesitás para <em>empezar</em>.
          </h2>
          <p>
            Cuatro herramientas que trabajan juntas para que invertir deje de
            sentirse un salto al vacío.
          </p>
        </div>
        <div className="flist">
          <div className="frow">
            <div className="fico">
              <svg viewBox="0 0 24 24">
                <path d="M3 17l5-5 3 3 7-8" />
                <path d="M17 4h4v4" />
              </svg>
            </div>
            <h3>Mercado en vivo</h3>
            <div>
              <p>
                Precios, gráficos e histórico completo de cualquier activo, en
                tiempo real y sin ruido. Todo lo que pasa, cuando pasa.
              </p>
              <a className="more">Explorar</a>
            </div>
          </div>
          <div className="frow">
            <div className="fico">
              <svg viewBox="0 0 24 24">
                <circle cx="9" cy="8" r="3" />
                <path d="M2 20a7 7 0 0 1 14 0" />
                <path d="M16 6a3 3 0 0 1 0 6" />
                <path d="M22 20a6 6 0 0 0-4-5.6" />
              </svg>
            </div>
            <h3>Comunidad</h3>
            <div>
              <p>
                Descubrí cómo invierten otras personas, seguí estrategias y
                compartí tu actividad. Invertir deja de ser algo solitario.
              </p>
              <a className="more">Conocer</a>
            </div>
          </div>
          <div className="frow">
            <div className="fico">
              <svg viewBox="0 0 24 24">
                <path d="M4 5h16v14H4z" />
                <path d="M8 9h8M8 13h5" />
              </svg>
            </div>
            <h3>Noticias con contexto</h3>
            <div>
              <p>
                Valeur analiza tu portfolio y te muestra las noticias que de
                verdad importan para tus inversiones. Nada de scroll infinito.
              </p>
              <a className="more">Ver ejemplo</a>
            </div>
          </div>
          <div className="frow">
            <div className="fico">
              <svg viewBox="0 0 24 24">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M10.5 21a1.5 1.5 0 0 0 3 0" />
              </svg>
            </div>
            <h3>Alertas inteligentes</h3>
            <div>
              <p>
                Definí lo que te importa y recibí avisos claros cuando algo se
                mueve. Sin estar todo el día mirando la pantalla.
              </p>
              <a className="more">Configurar</a>
            </div>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="blk steps" id="como">
        <div className="wrap">
          <div className="head-2">
            <h2>Empezá en tres pasos.</h2>
            <p>
              De cero a tu primera inversión en minutos. Sin papeleo ni vueltas.
            </p>
          </div>
          <div className="steps-grid">
            <div className="step">
              <div className="n">01</div>
              <h3>Creá tu cuenta</h3>
              <p>
                Registrate gratis en un minuto. Sin costos ni mínimos para
                arrancar.
              </p>
            </div>
            <div className="step">
              <div className="n">02</div>
              <h3>Seguí tus activos</h3>
              <p>
                Armá tu lista, explorá el mercado y entendé cómo se mueve tu
                portfolio.
              </p>
            </div>
            <div className="step">
              <div className="n">03</div>
              <h3>Aprendé y compartí</h3>
              <p>
                Mirá qué hace la comunidad, recibí noticias con contexto y
                crecé.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COMUNIDAD */}
      <section className="blk wrap comm" id="comunidad">
        <h2>
          No invertís <em>solo</em>.
        </h2>
        <p>
          Miles de personas aprendiendo, compartiendo y creciendo juntas. La
          inversión también es una conversación.
        </p>
        <div className="cluster">
          <div className="av" style={{ background: "oklch(0.6 0.18 300)" }}>
            ML
          </div>
          <div className="av" style={{ background: "oklch(0.62 0.16 230)" }}>
            LJ
          </div>
          <div className="av" style={{ background: "oklch(0.65 0.15 150)" }}>
            RS
          </div>
          <div className="av" style={{ background: "oklch(0.6 0.17 30)" }}>
            FB
          </div>
          <div className="av" style={{ background: "oklch(0.55 0.16 280)" }}>
            AG
          </div>
          <div className="more">+8k</div>
        </div>
      </section>

      {/* SIEMPRE GRATIS */}
      <section className="blk wrap free" id="gratis">
        <span className="free-glow" aria-hidden="true" />
        <div className="free-head">
          <span className="free-tag">
            <span className="dot" /> Sin costo · para siempre
          </span>
          <h2>
            Valeur es <em>gratis</em>. Y siempre lo va a ser.
          </h2>
          <p>
            Nada de planes, ni tarjetas, ni funciones trabadas detrás de un
            pago. Creemos que aprender a invertir no debería tener un precio de
            entrada.
          </p>
        </div>
        <div className="free-points">
          <div className="fp">
            <span className="fp-ic">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <div>
              <b>Sin comisiones ocultas</b>
              <span>Lo que ves es lo que hay. Cero letra chica.</span>
            </div>
          </div>
          <div className="fp">
            <span className="fp-ic">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </span>
            <div>
              <b>Sin tarjeta</b>
              <span>Creás tu cuenta y arrancás. No pedimos nada más.</span>
            </div>
          </div>
          <div className="fp">
            <span className="fp-ic">
              <svg viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 7.5-2" />
              </svg>
            </span>
            <div>
              <b>Sin límites artificiales</b>
              <span>Todas las funciones, para todos, siempre.</span>
            </div>
          </div>
        </div>
        <div className="free-cta">
          <Link to="/register" className="btn btn-pink">
            Crear cuenta gratis
          </Link>
        </div>
        <p className="free-note">Se crea en un minuto. Sin tarjeta.</p>
      </section>

      {/* FAQ */}
      <section className="blk wrap faq-block">
        <div className="head-2">
          <h2>Preguntas frecuentes.</h2>
          <p>Lo que casi todos preguntan antes de empezar.</p>
        </div>
        <div className="faq">
          <details open>
            <summary>
              ¿Necesito saber de inversiones para empezar?
              <span className="ic" />
            </summary>
            <p>
              Para nada. Valeur está pensado justamente para quien nunca
              invirtió: sin jerga, con explicaciones claras y una comunidad para
              aprender de otros.
            </p>
          </details>
          <details>
            <summary>
              ¿Cuánto cuesta?
              <span className="ic" />
            </summary>
            <p>
              Nada. Valeur es gratis y siempre lo va a ser: sin planes pagos,
              sin tarjeta y sin funciones trabadas detrás de un pago. Todas las
              herramientas están disponibles para todos.
            </p>
          </details>
          <details>
            <summary>
              ¿Los datos son en tiempo real?
              <span className="ic" />
            </summary>
            <p>
              Sí. Precios, gráficos y variaciones se actualizan en vivo, con
              histórico completo para que veas cómo se movió cada activo.
            </p>
          </details>
          <details>
            <summary>
              ¿Es seguro?
              <span className="ic" />
            </summary>
            <p>
              Tus datos están protegidos y tu actividad es privada por defecto:
              vos elegís qué compartir con la comunidad y qué no.
            </p>
          </details>
        </div>
      </section>

      {/* CLOSING */}
      <section className="closing">
        <span className="cglow" aria-hidden="true" />
        <div className="wrap">
          <p style={{ opacity: 0.7, fontSize: ".95rem" }}>
            Empezá hoy, gratis.
          </p>
          <h2>
            Invertir no debería sentirse <em>complicado</em>.
          </h2>
          <p>
            Sin jerga, sin vueltas. Aprendé mientras avanzás y llevá tus
            inversiones a un solo lugar.
          </p>
          <Link to="/register" className="btn btn-pink">
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="brand">
                Valeur<b>.</b>
              </div>
              <p>
                La plataforma que convierte las inversiones en algo simple,
                social y accesible.
              </p>
            </div>
            <div className="fcol">
              <h4>Producto</h4>
              <a href="#features">Mercado</a>
              <a href="#comunidad">Comunidad</a>
              <a href="#features">Noticias</a>
              <a href="#gratis">Gratis</a>
            </div>
            <div className="fcol">
              <h4>Compañía</h4>
              <a href="#">Sobre nosotros</a>
              <a href="#">Blog</a>
              <a href="#">Contacto</a>
            </div>
            <div className="fcol">
              <h4>Legal</h4>
              <a href="#">Términos</a>
              <a href="#">Privacidad</a>
              <a href="#">Cookies</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>© 2026 Valeur — Invertí con inteligencia.</span>
            <span>Hecho con foco en vos.</span>
          </div>
        </div>
      </footer>

      {/* DOCK: volver arriba + tema */}
      <div className="dock">
        <button
          className={"dock-up" + (scrolled ? " show" : "")}
          onClick={toTop}
          aria-label="Volver arriba"
          title="Volver arriba"
        >
          <i className="bi bi-arrow-up" />
        </button>
        <div className="theme-seg" role="radiogroup" aria-label="Tema">
          <button
            role="radio"
            aria-checked={!dark}
            className={!dark ? "on" : ""}
            onClick={() => {
              if (dark) toggle();
            }}
            aria-label="Modo claro"
            title="Modo claro"
          >
            <i className="bi bi-sun-fill" />
          </button>
          <button
            role="radio"
            aria-checked={dark}
            className={dark ? "on" : ""}
            onClick={() => {
              if (!dark) toggle();
            }}
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
