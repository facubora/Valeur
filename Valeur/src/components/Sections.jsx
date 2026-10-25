import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* Índice de la página: no ocupa lugar en la página. Cuando bajás hasta las
   secciones aparece colgado de la barra del header, saliendo del link de la
   página actual (en el hueco #vx-sub-slot de AppShell), y marca en cuál estás.
   items = [[id, label, icon]] (el ícono no se muestra) */
export function SectionNav({ items }) {
  const [active, setActive] = useState(items[0]?.[0]);
  const [shown, setShown] = useState(false);
  const [slot, setSlot] = useState(null);
  const key = items.map(([id]) => id).join(",");
  const rowRef = useRef(null);
  const indRef = useRef(null);

  // ficha + barrita que se deslizan como en la navegación de arriba
  const moveTo = (el) => {
    const ind = indRef.current;
    if (!el || !ind) return;
    ind.style.transform = `translateX(${el.offsetLeft}px)`;
    ind.style.width = `${el.offsetWidth}px`;
    ind.style.opacity = "1";
  };
  const activeBtn = () => rowRef.current?.querySelector("button.on");
  useLayoutEffect(() => {
    moveTo(activeBtn());
  }, [active, shown, slot]);

  useEffect(() => {
    const ids = key.split(",");
    let raf = 0;
    const update = () => {
      raf = 0;
      setSlot(document.getElementById("vx-sub-slot"));
      // activa = la última sección cuyo comienzo ya pasó por debajo del header
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 180) current = id;
      }
      // al llegar al final de la página, la última
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids.at(-1);
      setActive(current);
      // se necesita recién cuando la primera sección llega arriba
      const first = document.getElementById(ids[0]);
      setShown(Boolean(first) && first.getBoundingClientRect().top <= 220);
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

  if (!slot) return null;
  return createPortal(
    <nav className={"vx-sub" + (shown ? " open" : "")} aria-label="Secciones de la página" inert={!shown}>
      {/* el vidrio va en capas aparte: un elemento con backdrop-filter no deja
          que sus hijos (las curvas) desenfoquen lo que hay detrás */}
      <span className="vx-sub-bg" aria-hidden="true" />
      <span className="vx-sub-fl l" aria-hidden="true" />
      <span className="vx-sub-fl r" aria-hidden="true" />
      <div className="vx-sub-in">
        <div ref={rowRef} className="vx-sub-row" onMouseLeave={() => moveTo(activeBtn())}>
          <span ref={indRef} className="vx-sub-ind" aria-hidden="true" />
          {/* solo texto: con íconos el índice quedaba muy cargado */}
          {items.map(([id, label]) => (
            <button key={id} type="button" className={active === id ? "on" : ""} aria-current={active === id ? "true" : undefined} onClick={() => go(id)} onMouseEnter={(e) => moveTo(e.currentTarget)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>,
    slot,
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
