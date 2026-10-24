import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import MarketTape from "../components/MarketTape";
import Showcase from "../components/Showcase";
import { PortfolioMock, MarketMock, AlertsMock, CommunityMock, PrivacyMock } from "../components/LandingMocks";
import { useLandingMotion } from "../lib/landingMotion";
import { useMarketStatus } from "../lib/market";
import "../styles/app.css";
import "../styles/social.css";
import "../styles/shell.css";
import "../styles/landing.css";

const NAV = [
  ["#producto", "Producto"],
  ["#como", "Cómo funciona"],
  ["#privacidad", "Privacidad"],
  ["#preguntas", "Preguntas"],
];

/* Lo que hay adentro, cada cosa con un pedazo de la app al lado */
const FEATURES = [
  {
    id: "portfolio",
    kicker: "Portfolio",
    title: (
      <>
        Cuánto vale lo que tenés, <em>hoy</em>.
      </>
    ),
    text: "Cargá tus compras y ventas y Valeur hace las cuentas: precio en vivo de cada posición, cuánto ganaste y cuánto pesa cada cosa.",
    points: ["Ganancia en plata y en %", "En pesos o en dólar MEP, como prefieras", "CEDEARs, acciones, cripto y dólar en el mismo lugar"],
    Mock: PortfolioMock,
    hint: "Probá cambiar la moneda",
  },
  {
    id: "mercado",
    kicker: "Mercado",
    title: (
      <>
        BYMA y Wall Street, <em>sin vueltas</em>.
      </>
    ),
    text: "Explorá por tipo y por rubro, mirá el gráfico de velas de cualquier activo y seguí los que te interesan sin necesidad de comprarlos.",
    points: ["Más de 90 activos ordenados por rubro", "Ideas para vos según lo que seguís", "Buscador con ⌘K desde cualquier pantalla"],
    Mock: MarketMock,
    hint: "Tocá las pestañas",
  },
  {
    id: "alertas",
    kicker: "Alertas",
    title: (
      <>
        Enterate <em>antes</em>.
      </>
    ),
    text: "Decile a Valeur a qué precio querés comprar o vender, o cuánto se tiene que mover en el día, y te avisa a la campanita apenas pasa.",
    points: ["Por precio o por movimiento del día", "Ves cuánto le falta a cada una", "Se editan y se borran ahí mismo"],
    Mock: AlertsMock,
  },
  {
    id: "comunidad",
    kicker: "Comunidad",
    title: (
      <>
        Mirá qué recomienda <em>tu gente</em>.
      </>
    ),
    text: "Cada recomendación guarda el precio del día en que se hizo, así ves si fue para el lado que dijo. Seguí a analistas verificados y a tus amigos.",
    points: ["Comprar, mantener o vender, y por qué", "Cómo le fue a cada una desde ese día", "Para todos o solo para tus amigos"],
    Mock: CommunityMock,
  },
];

const STEPS = [
  ["Creá tu cuenta", "Gratis, en un minuto y sin tarjeta. Solo un usuario, tu email y una contraseña."],
  ["Cargá lo que tenés", "Registrá tus compras, o seguí activos sin comprarlos. Valeur arma tu portfolio solo."],
  ["Seguí, aprendé y compartí", "Poné alertas, mirá qué recomienda la comunidad y contá qué harías vos."],
];

const FAQ = [
  ["¿Necesito saber de inversiones para empezar?", "No. Valeur está pensado para quien recién arranca: sin jerga, con cada número explicado y una comunidad para aprender de otros."],
  ["¿Cuánto cuesta?", "Nada. Valeur es gratis y lo va a seguir siendo: sin planes pagos, sin tarjeta y sin funciones trabadas detrás de un pago."],
  ["¿Puedo comprar y vender desde Valeur?", "No, Valeur no es un broker. Operás donde ya operás y acá registrás lo que hiciste para ver todo junto y bien calculado."],
  ["¿Los precios son en vivo?", "Se actualizan solos cada minuto con datos de Yahoo Finance, con la demora habitual de cada mercado. El dólar MEP sale del cierre del día."],
  ["¿Quién ve mi portfolio?", "Nadie, salvo que vos lo elijas. Podés compartirlo con tus amigos o con todos, y aun así nunca se ven tus montos: solo qué tenés en % y cómo te va."],
];

/* La puerta de entrada: qué es Valeur, con pedazos de la app de verdad */
export default function LandingPage() {
  const { dark, toggle } = useTheme();
  const root = useRef(null);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState("");
  const markets = useMarketStatus();
  useLandingMotion(root);

  // menú del teléfono: se cierra con Escape o al volver a ancho de compu
  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => e.key === "Escape" && setMenu(false);
    const mq = window.matchMedia("(min-width: 901px)");
    const onMq = (e) => e.matches && setMenu(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [menu]);

  // qué sección se está viendo, para marcarla en la barra
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive("#" + e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    NAV.forEach(([href]) => {
      const el = document.getElementById(href.slice(1));
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="app-root shell lx" ref={root}>
      <MarketTape />

      <header className={"lx-nav" + (menu ? " open" : "")}>
        <div className="wrap lx-nav-in">
          <Link to="/" className="brand" aria-label="Valeur, ir arriba">
            <span className="mark" />
            Valeur
          </Link>
          <nav className="lx-links" aria-label="Secciones">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className={active === href ? "on" : ""}>
                {label}
              </a>
            ))}
          </nav>
          <div className="lx-right">
            <button type="button" className="icon-btn lx-theme" onClick={toggle} aria-label={dark ? "Modo claro" : "Modo oscuro"} title={dark ? "Modo claro" : "Modo oscuro"}>
              <i className={dark ? "bi bi-sun-fill" : "bi bi-moon-fill"} />
            </button>
            <Link to="/login" className="btn btn-line lx-in">
              Entrar
            </Link>
            <Link to="/register" className="btn btn-pink lx-up">
              Crear cuenta
            </Link>
            <button type="button" className="icon-btn lx-burger" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label={menu ? "Cerrar menú" : "Abrir menú"}>
              <i className={menu ? "bi bi-x-lg" : "bi bi-list"} />
            </button>
          </div>
        </div>
        <div className="lx-menu" inert={!menu}>
          <div className="lx-menu-in">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
            <div className="lx-menu-btns">
              <Link to="/login" className="btn btn-line">
                Entrar
              </Link>
              <Link to="/register" className="btn btn-pink">
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="lx-hero">
          <div className="wrap lx-hero-in">
            <div className="lx-hero-copy">
              <span className="kicker">Gratis · sin tarjeta · para siempre</span>
              <h1>
                Tu plata, el mercado y tu gente, en <em>un solo lugar</em>.
              </h1>
              <p className="lx-lead">
                Cargá lo que tenés y mirá cuánto vale hoy, en pesos o en dólares. Seguí CEDEARs, acciones y cripto, poné alertas y mirá qué recomienda la gente que sabés que sabe.
              </p>
              <div className="lx-ctas">
                <Link to="/register" className="btn btn-pink lx-cta">
                  <i className="bi bi-arrow-right" /> Crear cuenta gratis
                </Link>
                <a href="#producto" className="btn btn-line lx-cta">
                  Ver qué hay adentro
                </a>
              </div>
              <div className="hpills lx-proof">
                {markets.map((m) => (
                  <span key={m.key} className={"hp lx-mk" + (m.open ? " open" : "")} title={m.hint}>
                    <i /> {m.key} {m.open ? "abierto" : "cerrado"}
                  </span>
                ))}
                <span className="hp">
                  <i className="bi bi-currency-exchange hp-ic" /> Pesos o dólar MEP
                </span>
                <span className="hp">
                  <i className="bi bi-shield-lock hp-ic" /> Nunca se ven tus montos
                </span>
              </div>
            </div>
            <Showcase className="lx-show" />
          </div>
        </section>

        {/* PRODUCTO */}
        <section id="producto" className="lx-block">
          <div className="wrap">
            <div className="lx-head">
              <span className="kicker">Producto</span>
              <h2>
                Cuatro cosas, <em>bien hechas</em>.
              </h2>
              <p>Todo lo que necesitás para seguir tus inversiones sin planillas ni diez apps abiertas.</p>
            </div>
            <div className="lx-feats">
              {FEATURES.map(({ id, kicker, title, text, points, Mock, hint }, i) => (
                <article key={id} id={id} className={"lx-feat" + (i % 2 ? " flip" : "")}>
                  <div className="lx-feat-copy">
                    <span className="kicker">{kicker}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <ul>
                      {points.map((t) => (
                        <li key={t}>
                          <i className="bi bi-check2" /> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="lx-feat-mock">
                    <Mock />
                    {hint && (
                      <span className="lx-hint">
                        <i className="bi bi-hand-index" /> {hint}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como" className="lx-block">
          <div className="wrap">
            <div className="lx-head">
              <span className="kicker">Cómo funciona</span>
              <h2>
                De cero a tu portfolio en <em>tres pasos</em>.
              </h2>
            </div>
            <ol className="lx-steps">
              <span className="lx-steps-line" aria-hidden="true" />
              {STEPS.map(([t, d], i) => (
                <li key={t} className="card lx-step">
                  <span className="lx-step-n">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PRIVACIDAD */}
        <section id="privacidad" className="lx-block">
          <div className="wrap lx-priv">
            <div className="lx-head left">
              <span className="kicker">Privacidad</span>
              <h2>
                Vos elegís quién ve <em>tu portfolio</em>.
              </h2>
              <p>Arranca privado. Si lo compartís, los demás ven qué tenés y cómo te va en porcentaje. Tus montos no los ve nadie, nunca.</p>
            </div>
            <PrivacyMock />
          </div>
        </section>

        {/* GRATIS */}
        <section id="gratis" className="lx-block">
          <div className="wrap">
            <div className="card lx-free">
              <span className="lx-free-glow" aria-hidden="true" />
              <div className="lx-head">
                <span className="kicker">Sin costo</span>
                <h2>
                  Gratis. Y siempre lo va a <em>ser</em>.
                </h2>
                <p>Creemos que aprender a invertir no debería tener precio de entrada.</p>
              </div>
              <div className="lx-free-pts">
                {[
                  ["bi-receipt", "Sin comisiones", "Valeur no cobra por nada: ni por cargar, ni por seguir, ni por avisarte."],
                  ["bi-credit-card", "Sin tarjeta", "Creás tu cuenta y arrancás. No te pedimos ningún dato de pago."],
                  ["bi-unlock", "Sin funciones trabadas", "Todo está disponible para todos, desde el primer día."],
                ].map(([ic, t, d]) => (
                  <div key={t} className="lx-free-pt">
                    <span className="lx-ic">
                      <i className={"bi " + ic} />
                    </span>
                    <b>{t}</b>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PREGUNTAS */}
        <section id="preguntas" className="lx-block">
          <div className="wrap lx-faq-wrap">
            <div className="lx-head left">
              <span className="kicker">Preguntas</span>
              <h2>Lo que casi todos preguntan.</h2>
              <p>
                ¿Te quedó otra? <Link to="/register">Creá tu cuenta</Link> y preguntale a la comunidad.
              </p>
            </div>
            <div className="card lx-faq">
              {FAQ.map(([q, a], i) => (
                <details key={q} open={i === 0}>
                  <summary>
                    {q}
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CIERRE */}
        <section className="lx-block lx-close-wrap">
          <div className="wrap">
            <div className="lx-close">
              <span className="kicker">Empezá hoy</span>
              <h2>
                Invertir no debería sentirse <em>complicado</em>.
              </h2>
              <p>Tu cuenta se crea en un minuto. Sin tarjeta, sin letra chica.</p>
              <Link to="/register" className="btn btn-pink lx-cta">
                <i className="bi bi-arrow-right" /> Crear cuenta gratis
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* PIE: el mismo de la app */}
      <footer className="vx-foot">
        <div className="wrap">
          <div className="vf-top">
            <div className="vf-brand">
              <Link to="/" className="brand" aria-label="Valeur, ir arriba">
                <span className="mark" />
                Valeur
              </Link>
              <p>Tu plata, el mercado y tu gente, en un solo lugar.</p>
            </div>
            <nav className="vf-cols" aria-label="Pie de página">
              <div>
                <b>Producto</b>
                <ul>
                  {FEATURES.map((f) => (
                    <li key={f.id}>
                      <a href={"#" + f.id}>{f.kicker}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <b>Tu cuenta</b>
                <ul>
                  <li>
                    <Link to="/register">Crear cuenta</Link>
                  </li>
                  <li>
                    <Link to="/login">Entrar</Link>
                  </li>
                </ul>
              </div>
              <div>
                <b>Valeur</b>
                <ul>
                  <li>
                    <a href="#privacidad">Privacidad</a>
                  </li>
                  <li>
                    <a href="#preguntas">Preguntas</a>
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
            <span>© {new Date().getFullYear()} Valeur · Hecho en Argentina</span>
            <span>Cotizaciones de Yahoo Finance, con demora. Lo que ves es información, no asesoramiento financiero.</span>
          </div>
        </div>
        <div className="vf-word" aria-hidden="true">
          Valeur
        </div>
      </footer>
    </div>
  );
}
