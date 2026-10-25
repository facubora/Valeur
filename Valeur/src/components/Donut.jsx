/* Anillo de composición: un arco por parte, con un hueco entre arcos. La parte
   enfocada (por el arco o desde afuera, con `focus`) se resalta y el centro
   muestra su peso; si no hay foco, muestra `center`.
   items = [{ key, label, weight (0..100), color }] */
export default function Donut({ items, focus, onFocus, center }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const GAP = items.length > 1 ? 3 : 0;
  // cada arco arranca donde terminan los anteriores
  const lens = items.map((it) => (Math.max(it.weight, 0) / 100) * C);
  const f = items.find((it) => it.key === focus);
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={R} className="donut-track" />
        {items.map((it, i) => {
          const len = Math.max(lens[i] - GAP, 0.5);
          return (
            <circle
              key={it.key}
              cx="70"
              cy="70"
              r={R}
              className={"donut-arc" + (focus && focus !== it.key ? " dim" : "")}
              stroke={it.color}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-lens.slice(0, i).reduce((s, l) => s + l, 0)}
              onMouseEnter={() => onFocus?.(it.key)}
              onMouseLeave={() => onFocus?.(null)}
            />
          );
        })}
      </svg>
      <div className="donut-center">
        {f ? (
          <>
            <b>{f.weight.toFixed(1)}%</b>
            <small>{f.label}</small>
          </>
        ) : (
          center
        )}
      </div>
    </div>
  );
}
