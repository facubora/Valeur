/* Esqueletos de carga: la forma de lo que va a llegar, en gris lleno con un
   brillo que pasa (todos a la vez). No confundir con los fantasmas
   punteados, que son para "todavía no tenés nada". */

export function Sk({ w, h, r, className = "" }) {
  return <span className={"sk " + className} style={{ width: w, height: h, borderRadius: r }} />;
}

/* Filas de una lista: logo, dos líneas y el valor a la derecha */
export function SkList({ n = 3, className = "" }) {
  return (
    <div className={"card sk-list " + className} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="sk-row">
          <Sk w={30} h={30} r="50%" />
          <span className="sk-col">
            <Sk w={`${44 - (i % 3) * 8}%`} h={11} />
            <Sk w={`${28 + (i % 2) * 10}%`} h={9} />
          </span>
          <span className="sk-col end">
            <Sk w={72} h={11} />
            <Sk w={44} h={9} />
          </span>
        </div>
      ))}
    </div>
  );
}

/* Recomendaciones: la franja, la cita y el pie, como las jugadas */
export function SkPosts({ n = 2 }) {
  return (
    <div className="feed-grid" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card sk-post">
          <div className="sk-band">
            <Sk w={30} h={30} r="50%" />
            <Sk w={70} h={12} />
            <Sk w={64} h={10} className="push" />
          </div>
          <div className="sk-body">
            <Sk w="92%" h={12} />
            <Sk w={i % 2 ? "64%" : "78%"} h={12} />
          </div>
          <div className="sk-foot">
            <Sk w={26} h={26} r="50%" />
            <Sk w={90} h={10} />
            <Sk w={52} h={18} className="push" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Fichas de seguidos */
export function SkTiles({ n = 4 }) {
  return (
    <div className="sk-tiles" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card sk-tile">
          <span className="sk-tile-top">
            <Sk w={28} h={28} r="50%" />
            <Sk w={56} h={11} />
          </span>
          <Sk w="60%" h={18} />
          <Sk w="36%" h={10} />
        </div>
      ))}
    </div>
  );
}

/* Personas para seguir */
export function SkPeople({ n = 3 }) {
  return (
    <div className="people-grid" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card sk-person">
          <span className="sk-tile-top">
            <Sk w={44} h={44} r="50%" />
            <span className="sk-col">
              <Sk w={100} h={12} />
              <Sk w={70} h={9} />
            </span>
          </span>
          <Sk w="90%" h={10} />
          <Sk w={96} h={32} r={10} />
        </div>
      ))}
    </div>
  );
}

/* El portfolio grande: valor total, gráfico y composición */
export function SkPortfolio({ side = true }) {
  return (
    <div className={"card sk-pf" + (side ? "" : " solo")} aria-hidden="true">
      <div className="sk-pf-main">
        <Sk w={90} h={10} />
        <Sk w={220} h={40} r={10} />
        <Sk w={150} h={12} />
        <svg className="sk-pf-line" viewBox="0 0 400 120" preserveAspectRatio="none">
          <path d="M0,96 C60,90 90,70 140,74 S230,40 280,46 S360,20 400,16" />
        </svg>
      </div>
      {side && (
        <div className="sk-pf-side">
          <Sk w={140} h={140} r="50%" className="ring" />
          <Sk w="70%" h={10} />
          <Sk w="50%" h={10} />
        </div>
      )}
    </div>
  );
}
