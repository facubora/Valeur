import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import Pill from "../components/Pill";
import { SectionNav, SectionHead } from "../components/Sections";
import { GROUPS, TERMS, TERM, matchTerm } from "../lib/glossary";

/* Aprendé: los términos de Valeur explicados simple, agrupados, con un
   buscador y un ejemplo cada uno. Cada término tiene su #ancla, así el
   "Ver más" de la app cae justo ahí. */
export default function Learn() {
  const [q, setQ] = useState("");
  const { hash } = useLocation();
  const terms = TERMS.map(([key]) => TERM[key]);
  const shown = terms.filter((t) => matchTerm(t, q));
  const lit = hash.slice(1); // si se llegó por un término, se resalta un momento

  return (
    <AppShell>
      <section className="page-head">
        <div>
          <span className="kicker">Aprendé</span>
          <h1>
            Lo básico, <em>sin vueltas</em>.
          </h1>
          <div className="hpills" aria-label="Qué hay">
            <Pill icon="bi-book" label="Términos" value={terms.length} />
            <Pill to="/simulador" icon="bi-hourglass-split" label="Probalo en el" value="Simulador" />
            <Pill to="/practica" icon="bi-controller" label="Practicá en el" value="Modo práctica" />
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

      {q && !shown.length && (
        <section className="block">
          <p className="muted">
            No encontramos "{q}". Probá con otra palabra, como <button type="button" className="lnk-btn" onClick={() => setQ("CEDEAR")}>CEDEAR</button> o{" "}
            <button type="button" className="lnk-btn" onClick={() => setQ("dólar")}>dólar</button>.
          </p>
        </section>
      )}

      {GROUPS.map(([gid, label, icon], gi) => {
        const list = shown.filter((t) => t.group === gid);
        if (!list.length) return null;
        return (
          <section key={gid} id={q ? undefined : gid} className="block">
            <SectionHead
              kicker={
                <>
                  <i className={"bi " + icon} /> {gi + 1} de {GROUPS.length}
                </>
              }
              title={label}
            />
            <div className="lr-grid">
              {list.map((t) => (
                <article key={t.key} id={t.key} className={"card lr-card" + (lit === t.key ? " lit" : "")}>
                  <h3>{t.term}</h3>
                  <p className="lr-short">{t.short}</p>
                  <p>{t.long}</p>
                  <p className="lr-ex">
                    <i className="bi bi-lightbulb" /> <span>{t.example}</span>
                  </p>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="block">
        <div className="card lr-cta">
          <div>
            <b>La mejor forma de aprender es probando.</b>
            <span>Mirá qué hubiera pasado con el simulador, o comprá y vendé con US$ 10.000 de mentira.</span>
          </div>
          <div className="lr-cta-acts">
            <Link to="/simulador" className="btn btn-line">
              <i className="bi bi-hourglass-split" /> Simulador
            </Link>
            <Link to="/practica" className="btn btn-pink">
              <i className="bi bi-controller" /> Modo práctica
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
