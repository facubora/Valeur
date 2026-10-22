import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ModalClose } from "../lib/modal";

/* De dónde sale el modal: el último botón o link que se apretó. Se guarda en
   captura para que esté antes de que el click abra el modal (en Safari los
   botones no quedan con foco al hacer click, así que no alcanza activeElement). */
let lastPress = null;
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      const el = e.target.closest?.("button, a, [role='button']");
      if (el) lastPress = { el, at: Date.now() };
    },
    true,
  );
}

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)"; // el resorte suave de iOS
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* Color de fondo del botón de origen (si es transparente, el del modal):
   el panel arranca con el color del botón y se aclara al crecer */
const bgOf = (el, fallback) => {
  const c = getComputedStyle(el).backgroundColor;
  return !c || c === "transparent" || c.endsWith(", 0)") ? fallback : c;
};

/* Transformación que lleva la caja `to` (el modal ya ubicado) a `from` (el botón) */
function fromRect(from, to) {
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}

/* Modal centrado que nace del botón que lo abrió: el panel viaja desde ahí
   hasta el centro mientras crece, el contenido aparece al llegar, y al cerrar
   vuelve a meterse en el botón. Escape y click afuera cierran.
   Adentro, useModalClose() (lib/modal) da `close`: anima y después llama a onClose. */
export default function Modal({ onClose, label, className = "", bgClass = "", children }) {
  const boxRef = useRef(null);
  const bgRef = useRef(null);
  const closing = useRef(false);
  // el origen se toma una sola vez, al abrir
  const [originEl] = useState(() => (lastPress && Date.now() - lastPress.at < 1500 ? lastPress.el : null));

  useLayoutEffect(() => {
    const box = boxRef.current;
    const el = originEl;
    if (!box || reduced()) return;
    // medir sin animaciones encima (en desarrollo React corre el efecto dos veces)
    const stop = () => [box, bgRef.current, ...box.children].forEach((n) => n?.getAnimations().forEach((a) => a.cancel()));
    stop();
    const to = box.getBoundingClientRect();
    const from = el && el.isConnected ? el.getBoundingClientRect() : null;
    if (from && from.width > 0) {
      const surface = getComputedStyle(box).backgroundColor;
      box.animate(
        [
          { transform: fromRect(from, to), borderRadius: "12px", opacity: 0.6, backgroundColor: bgOf(el, surface) },
          { opacity: 1, offset: 0.3 },
          { transform: "none", borderRadius: "22px", opacity: 1, backgroundColor: surface },
        ],
        { duration: 560, easing: EASE },
      );
      // el contenido aparece cuando el panel ya casi llegó (no se ve estirado)
      box.querySelectorAll(":scope > *").forEach((c, i) =>
        c.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
          duration: 320,
          delay: 220 + i * 30,
          easing: "ease-out",
          fill: "backwards",
        }),
      );
    } else {
      box.animate([{ opacity: 0, transform: "translateY(16px) scale(0.98)" }, { opacity: 1, transform: "none" }], {
        duration: 400,
        easing: EASE,
      });
    }
    bgRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
    return stop;
  }, [originEl]);

  const close = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    const box = boxRef.current;
    const el = originEl;
    if (box && !reduced()) {
      const to = box.getBoundingClientRect();
      const from = el && el.isConnected ? el.getBoundingClientRect() : null;
      bgRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: "ease-in", fill: "forwards" });
      box.querySelectorAll(":scope > *").forEach((c) =>
        c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-in", fill: "forwards" }),
      );
      const surface = getComputedStyle(box).backgroundColor;
      const anim = from && from.width > 0
        ? box.animate(
            [
              { transform: "none", borderRadius: "22px", opacity: 1, backgroundColor: surface },
              { opacity: 1, offset: 0.7 },
              { transform: fromRect(from, to), borderRadius: "12px", opacity: 0, backgroundColor: bgOf(el, surface) },
            ],
            { duration: 420, easing: EASE, fill: "forwards" },
          )
        : box.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(10px) scale(0.98)" }], {
            duration: 200,
            easing: "ease-in",
            fill: "forwards",
          });
      // por si la pestaña está en segundo plano y la animación no avanza
      await Promise.race([anim.finished.catch(() => {}), new Promise((r) => setTimeout(r, 700))]);
    }
    onClose();
  }, [onClose, originEl]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div ref={bgRef} className={"modal-bg vx-modal-bg " + bgClass} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={boxRef} className={"modal vx-modal " + className} role="dialog" aria-modal="true" aria-label={label}>
        <ModalClose.Provider value={close}>{children}</ModalClose.Provider>
      </div>
    </div>
  );
}
