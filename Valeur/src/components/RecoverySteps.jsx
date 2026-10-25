/* Panel de la izquierda al recuperar la contraseña: los tres pasos, con el
   que estás haciendo resaltado y la línea que se llena hasta ahí.
   step: 1 pedir · 2 abrir el mail · 3 elegir la nueva · 4 listo.
   error: el paso actual salió mal (el enlace venció). */
const STEPS = [
  ["bi-envelope", "Pedí el enlace", "Con el email de tu cuenta."],
  ["bi-envelope-open", "Abrilo desde tu mail", "Llega en un minuto. Fijate también en spam."],
  ["bi-key", "Elegí la nueva", "Y entrás directo a tu inicio."],
];

export default function RecoverySteps({ step, error = false }) {
  const done = step > STEPS.length;
  return (
    <aside className="auth-show auth-steps" style={{ "--fill": Math.min(step - 1, STEPS.length - 1) / (STEPS.length - 1) }}>
      <span className={"rs-lock" + (done ? " open" : "")} aria-hidden="true">
        <i className={done ? "bi bi-unlock" : "bi bi-shield-lock"} />
      </span>

      <ol className="rs-list" aria-label="Pasos para recuperar la contraseña">
        <span className="rs-line" aria-hidden="true" />
        {STEPS.map(([icon, title, sub], i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? (error ? "bad" : "now") : "next";
          return (
            <li key={title} className={"card rs-step " + state} aria-current={state === "now" ? "step" : undefined} style={{ "--d": i }}>
              <span className="rs-n">{state === "done" ? <i className="bi bi-check-lg" /> : state === "bad" ? <i className="bi bi-exclamation-lg" /> : n}</span>
              <span className="rs-txt">
                <b>{title}</b>
                <small>{state === "bad" ? "El enlace venció o ya se usó. Pedí otro." : sub}</small>
              </span>
              {state === "now" ? <em className="rs-now">Ahora</em> : <i className={"bi " + icon + " rs-ic"} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className="as-cap">
        <b>{done ? "Ya estás de vuelta." : "Te ayudamos a volver."}</b>
        <span>Tu portfolio, tus alertas y tu gente siguen como los dejaste.</span>
      </div>
    </aside>
  );
}
