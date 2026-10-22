/* ── Feedback global: confirmaciones y avisos ─────────────────────────────
   Se pueden llamar desde cualquier lado (sin hooks). Los muestran
   <ConfirmHost/> y <ToastHost/>, montados en la cáscara de la app. */

const bus = new EventTarget();
export const feedbackBus = bus;

/* Pide confirmación con un modal propio → Promise<boolean>
   confirmDialog({ title, body, confirmText, cancelText, danger, icon, info })
   Con `info` es solo un aviso: un único botón. */
export function confirmDialog(opts) {
  return new Promise((resolve) => {
    bus.dispatchEvent(new CustomEvent("confirm", { detail: { ...opts, resolve } }));
  });
}

let nextId = 1;
/* Aviso breve abajo de la pantalla.
   toast("Guardado") · toast("No se pudo", { kind: "error" })
   toast("Dejaste de seguir NVDA", { action: { label: "Deshacer", run } }) */
export function toast(text, { kind = "ok", action = null, ms = 4200 } = {}) {
  bus.dispatchEvent(new CustomEvent("toast", { detail: { id: nextId++, text, kind, action, ms } }));
}

/* Corre una acción de Supabase que devuelve "" o un mensaje de error:
   si falla avisa con un toast y devuelve false. */
export async function attempt(promise, { ok = null, fail = "No se pudo completar la acción" } = {}) {
  let err;
  try {
    err = await promise;
  } catch (e) {
    err = e?.message || "error";
  }
  if (err) {
    toast(/failed to fetch|network/i.test(err) ? "Sin conexión con el servidor. Probá de nuevo." : `${fail}.`, { kind: "error" });
    return false;
  }
  if (ok) toast(ok);
  return true;
}
