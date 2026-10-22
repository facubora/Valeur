import { useEffect, useRef, useState } from "react";
import { feedbackBus } from "../lib/feedback";

/* Modal de confirmación (ver confirmDialog en lib/feedback) */
export function ConfirmHost() {
  const [req, setReq] = useState(null);
  const okRef = useRef(null);

  useEffect(() => {
    const on = (e) => setReq(e.detail);
    feedbackBus.addEventListener("confirm", on);
    return () => feedbackBus.removeEventListener("confirm", on);
  }, []);

  const close = (value) => {
    req?.resolve(value);
    setReq(null);
  };

  useEffect(() => {
    if (!req) return;
    const t = setTimeout(() => okRef.current?.focus(), 30);
    const onKey = (e) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!req) return null;
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
      <div className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-body">
        <span className={"cf-ic" + (req.danger ? " danger" : "")}>
          <i className={"bi " + (req.icon || (req.danger ? "bi-exclamation-triangle" : "bi-question-circle"))} />
        </span>
        <h2 id="cf-title">{req.title}</h2>
        {req.body && <p id="cf-body">{req.body}</p>}
        <div className="cf-btns">
          {!req.info && (
            <button type="button" className="btn btn-line btn-sm" onClick={() => close(false)}>
              {req.cancelText || "Cancelar"}
            </button>
          )}
          <button ref={okRef} type="button" className={"btn btn-sm " + (req.danger ? "btn-danger" : "btn-pink")} onClick={() => close(true)}>
            {req.confirmText || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Avisos breves apilados abajo (ver toast en lib/feedback) */
export function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const timers = new Map();
    const drop = (id) => {
      clearTimeout(timers.get(id));
      timers.delete(id);
      setItems((xs) => xs.filter((x) => x.id !== id));
    };
    const on = (e) => {
      const t = e.detail;
      setItems((xs) => [...xs.slice(-2), t]);
      timers.set(t.id, setTimeout(() => drop(t.id), t.ms));
    };
    const onDrop = (e) => drop(e.detail);
    feedbackBus.addEventListener("toast", on);
    feedbackBus.addEventListener("toast-drop", onDrop);
    return () => {
      feedbackBus.removeEventListener("toast", on);
      feedbackBus.removeEventListener("toast-drop", onDrop);
      timers.forEach(clearTimeout);
    };
  }, []);

  const dismiss = (id) => feedbackBus.dispatchEvent(new CustomEvent("toast-drop", { detail: id }));

  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={"toast " + t.kind}>
          <i className={t.kind === "error" ? "bi bi-exclamation-circle-fill" : "bi bi-check-circle-fill"} />
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="toast-act"
              onClick={() => {
                t.action.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="toast-x" aria-label="Cerrar aviso" onClick={() => dismiss(t.id)}>
            <i className="bi bi-x" />
          </button>
        </div>
      ))}
    </div>
  );
}
