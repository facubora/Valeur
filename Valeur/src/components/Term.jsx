import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { TERM } from "../lib/glossary";

/* Un término con su explicación al lado: subrayado punteado y, al pasar el
   mouse (o tocarlo en el celu), una tarjetita con qué es y un link a Aprendé.
   <Term k="cedear">CEDEAR</Term> */
export default function Term({ k, children }) {
  const t = TERM[k];
  const id = useId();
  const [open, setOpen] = useState(false);
  if (!t) return children;
  return (
    <span className={"term" + (open ? " open" : "")} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="term-word"
        aria-describedby={id}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      >
        {children ?? t.term}
        <i className="bi bi-question-circle" aria-hidden="true" />
      </button>
      <span role="tooltip" id={id} className="term-pop">
        <b>{t.term}</b>
        <span>{t.short}</span>
        <Link to={`/aprende#${t.key}`} onClick={(e) => e.stopPropagation()}>
          Ver más en Aprendé <i className="bi bi-arrow-right" />
        </Link>
      </span>
    </span>
  );
}
