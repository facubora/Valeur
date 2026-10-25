import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AppShell from "../components/AppShell";
import Pill from "../components/Pill";
import { SectionNav, SectionHead } from "../components/Sections";
import { GROUPS, TERMS, TERM, matchTerm } from "../lib/glossary";

gsap.registerPlugin(ScrollTrigger);

const SEEN_KEY = "valeur-aprende";
const readSeen = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []);
  } catch {
    return new Set();
  }
};
const saveSeen = (set) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {
    /* sin almacenamiento: el progreso dura hasta recargar */
  }
};

/* Aprendé: cada término es una tarjeta con su ícono que se da vuelta al
   tocarla y muestra la explicación y un ejemplo. Las que ya viste quedan
   tildadas y suben la barra de progreso (se guarda en este navegador).
   Cada término tiene su #ancla: el "Ver más" de la app cae ahí, ya dada
   vuelta. */
export default function Learn() {
  const [q, setQ] = useState("");
  const { hash } = useLocation();
  const lit = hash.slice(1);
  const terms = TERMS.map(([key]) => TERM[key]);
  const shown = terms.filter((t) => matchTerm(t, q));

  const [seen, setSeen] = useState(() => {
    const s = readSeen();
    if (TERM[lit]) s.add(lit);
    return s;
  });
  const [open, setOpen] = useState(() => new Set(TERM[lit] ? [lit] : []));
  // si se llega a otro término con la página abierta, se da vuelta ese
  const [lastLit, setLastLit] = useState(lit);
  if (lit !== lastLit) {
    setLastLit(lit);
    if (TERM[lit]) {
      setOpen((o) => new Set(o).add(lit));
      setSeen((s) => {
        const n = new Set(s).add(lit);
        saveSeen(n);
        return n;
      });
    }
  }

  const flip = (key) => {
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
    if (!seen.has(key)) {
      const n = new Set(seen).add(key);
      setSeen(n);
      saveSeen(n);
    }
  };
  const allOpen = shown.length > 0 && shown.every((t) => open.has(t.key));
  const flipAll = () => {
    if (allOpen) return setOpen(new Set());
    setOpen(new Set(shown.map((t) => t.key)));
    const n = new Set([...seen, ...shown.map((t) => t.key)]);
    setSeen(n);
    saveSeen(n);
  };
  const restart = () => {
    setOpen(new Set());
    setSeen(new Set());
    saveSeen(new Set());
  };
  const count = terms.filter((t) => seen.has(t.key)).length;
  const done = count === terms.length;

  // las tarjetas entran en cascada a medida que aparecen
  const root = useRef(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const cards = gsap.utils.toArray(root.current.querySelectorAll(".lr-flip"));
      gsap.set(cards, { y: 28, opacity: 0 });
      ScrollTrigger.batch(cards, {
        start: "top 92%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.06, overwrite: true }),
      });
    });
    return () => mm.revert();
  }, [q]);

  return (
    <AppShell>
      <section className="page-head">
        <div>
          <span className="kicker">Aprendé</span>
          <h1>
            Lo básico, <em>sin vueltas</em>.
          </h1>
          <div className="hpills" aria-label="Tu progreso">
            <Pill icon="bi-check2-circle" label="Aprendiste" value={`${count} de ${terms.length}`} />
            <Pill to="/simulador" icon="bi-hourglass-split" label="Probalo en el" value="Simulador" />
          </div>
        </div>
        <div className="search-form compact filter-in lr-search">
          <i className="bi bi-search ico" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un término" aria-label="Buscar un término" />
          {q && (
            <button type="button" className="filter-x" onClick={() => setQ("")} aria-label="Limpiar">
              <i className="bi bi-x" />
            </button>
          )}
        </div>
      </section>

      {!q && <SectionNav items={GROUPS.map(([id, label, icon]) => [id, label, icon])} />}

      {/* el progreso: cuántas viste, darlas vuelta todas o empezar de nuevo */}
      <section className="block lr-top">
        <div className={"card lr-prog" + (done ? " done" : "")}>
          <span className="lr-prog-ic" aria-hidden="true">
            <i className={done ? "bi bi-trophy-fill" : "bi bi-mortarboard"} />
          </span>
          <div className="lr-prog-txt">
            <b>{done ? "¡Ya sabés lo básico!" : count ? `Aprendiste ${count} de ${terms.length}` : "Tocá una tarjeta para darla vuelta"}</b>
            <div className="lr-bar" role="progressbar" aria-valuemin={0} aria-valuemax={terms.length} aria-valuenow={count} aria-label="Términos vistos">
              <i style={{ width: `${(count / terms.length) * 100}%` }} />
            </div>
          </div>
          <div className="lr-prog-acts">
            {done ? (
              <Link to="/simulador" className="btn btn-pink btn-sm">
                <i className="bi bi-hourglass-split" /> Probalo en el simulador
              </Link>
            ) : (
              <button type="button" className="btn btn-line btn-sm" onClick={flipAll} disabled={!shown.length}>
                <i className={allOpen ? "bi bi-arrow-counterclockwise" : "bi bi-arrow-repeat"} /> {allOpen ? "Dar vuelta todas" : "Ver todas"}
              </button>
            )}
            {count > 0 && (
              <button type="button" className="lnk-btn" onClick={restart}>
                Empezar de nuevo
              </button>
            )}
          </div>
        </div>
      </section>

      {/* sin caja propia: las secciones siguen separadas como en el resto de las páginas */}
      <div ref={root} className="lr-groups">
        {q && !shown.length && (
          <section className="block">
            <p className="muted">
              No encontramos "{q}". Probá con otra palabra, como{" "}
              <button type="button" className="lnk-btn" onClick={() => setQ("CEDEAR")}>
                CEDEAR
              </button>{" "}
              o{" "}
              <button type="button" className="lnk-btn" onClick={() => setQ("dólar")}>
                dólar
              </button>
              .
            </p>
          </section>
        )}

        {GROUPS.map(([gid, label, icon], gi) => {
          const list = shown.filter((t) => t.group === gid);
          if (!list.length) return null;
          const groupSeen = list.filter((t) => seen.has(t.key)).length;
          return (
            <section key={gid} id={q ? undefined : gid} className="block">
              <SectionHead
                kicker={
                  <>
                    <i className={"bi " + icon} /> {gi + 1} de {GROUPS.length}
                  </>
                }
                title={label}
                desc={groupSeen === list.length ? "Las viste todas." : `Viste ${groupSeen} de ${list.length}.`}
              />
              <div className="lr-grid">
                {list.map((t) => (
                  <FlipCard key={t.key} t={t} open={open.has(t.key)} seen={seen.has(t.key)} lit={lit === t.key} onFlip={() => flip(t.key)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

/* La tarjeta: adelante el ícono y el término; atrás, qué es y un ejemplo */
function FlipCard({ t, open, seen, lit, onFlip }) {
  return (
    <button type="button" id={t.key} className={"lr-flip" + (open ? " on" : "") + (lit ? " lit" : "")} aria-pressed={open} onClick={onFlip}>
      <span className="card lr-face lr-front" aria-hidden={open}>
        {seen && (
          <span className="lr-seen" title="Ya la viste">
            <i className="bi bi-check-lg" />
          </span>
        )}
        <span className="lr-ic">
          <i className={"bi " + t.icon} />
        </span>
        <b className="lr-term">{t.term}</b>
        <span className="lr-hint">
          <i className="bi bi-arrow-repeat" /> Tocá para ver
        </span>
      </span>
      <span className="card lr-face lr-back" aria-hidden={!open}>
        <span className="lr-back-head">
          <i className={"bi " + t.icon} />
          <b>{t.term}</b>
        </span>
        <span className="lr-short">{t.short}</span>
        <span className="lr-long">{t.long}</span>
        <span className="lr-ex">
          <i className="bi bi-lightbulb" /> <span>{t.example}</span>
        </span>
      </span>
    </button>
  );
}
