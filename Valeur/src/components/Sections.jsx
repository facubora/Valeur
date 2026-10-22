import { useEffect, useRef, useState } from "react";

/* Índice de la página: franja con pestañas que, al scrollear, se acopla
   debajo del header. Salta a cada sección y marca en cuál estás.
   items = [[id, label, icon]] */
export function SectionNav({ items }) {
  const [active, setActive] = useState(items[0]?.[0]);
  const [stuck, setStuck] = useState(false);
  const navRef = useRef(null);
  const key = items.map(([id]) => id).join(",");

  useEffect(() => {
    const ids = key.split(",");
    let raf = 0;
    // activa = la última sección cuyo comienzo ya pasó por debajo del header
    const update = () => {
      raf = 0;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 180) current = id;
      }
      // al llegar al final de la página, la última
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids.at(-1);
      setActive(current);
      // acoplada = llegó a su posición sticky (debajo del header)
      const nav = navRef.current;
      if (nav) setStuck(nav.getBoundingClientRect().top <= parseFloat(getComputedStyle(nav).top) + 1);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);

  const go = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav ref={navRef} className={"sub-nav" + (stuck ? " stuck" : "")} aria-label="Secciones de la página">
      <div className="sub-nav-in">
        <span className="sub-nav-lbl">En esta página</span>
        {items.map(([id, label, icon]) => (
          <button key={id} type="button" className={active === id ? "on" : ""} aria-current={active === id ? "true" : undefined} onClick={() => go(id)}>
            {icon && <i className={"bi " + icon} />}
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* Encabezado de sección: etiqueta chica, título, bajada y herramientas a la derecha */
export function SectionHead({ kicker, title, desc, children }) {
  return (
    <div className="s-head">
      <div className="s-title">
        {kicker && <span className="kicker">{kicker}</span>}
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {children && <div className="s-tools">{children}</div>}
    </div>
  );
}
