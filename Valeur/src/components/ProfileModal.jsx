import { useState } from "react";
import { FormError } from "./AuthLayout";
import Modal from "./Modal";
import { useModalClose } from "../lib/modal";
import { Verified } from "./Social";
import { SECTORS } from "../lib/catalog";
import {
  VISIBILITY,
  VERIFY_CATEGORIES,
  updateProfile,
  confirmVisibility,
  useMyVerification,
  requestVerification,
} from "../lib/social";
import { toast } from "../lib/feedback";

const netMsg = (err) => (/failed to fetch|network/i.test(err) ? "Sin conexión con el servidor. Probá de nuevo." : err);

/* Editar perfil: nombre, bio, privacidad del portfolio, rubros y verificación.
   Nace del botón que lo abrió. Se monta al abrir, así arranca con los datos actuales. */
export default function ProfileModal({ open, onClose, ...props }) {
  return open ? (
    <Modal onClose={onClose} label="Tu perfil" className="tm pm">
      <ProfileForm {...props} />
    </Modal>
  ) : null;
}

const TABS = [
  ["profile", "Perfil", "bi-person"],
  ["privacy", "Privacidad", "bi-shield-lock"],
  ["verify", "Verificado", "bi-patch-check"],
];
const TAB_OF = { interests: "profile", privacy: "privacy", verify: "verify" };

function ProfileForm({ uid, profile, focus = null }) {
  const close = useModalClose();
  const [tab, setTab] = useState(TAB_OF[focus] || "profile");
  const [name, setName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [visibility, setVisibility] = useState(profile?.visibility || "private");
  const [interests, setInterests] = useState(profile?.interests || []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (k) => setInterests((xs) => (xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]));

  const save = async (e) => {
    e.preventDefault();
    const display = name.trim().replace(/\s+/g, " ");
    if (display && display.length < 2) return setError("El nombre visible tiene que tener al menos 2 caracteres");
    if (display.length > 40) return setError("El nombre visible puede tener hasta 40 caracteres");
    if (bio.trim().length > 160) return setError("La bio puede tener hasta 160 caracteres");
    if (!(await confirmVisibility(visibility, profile?.visibility))) return;
    setSaving(true);
    const err = await updateProfile(uid, {
      display_name: display || null,
      bio: bio.trim() || null,
      visibility,
      interests,
    });
    setSaving(false);
    if (err) return setError(netMsg(err));
    toast("Perfil actualizado");
    close();
  };

  const ti = TABS.findIndex(([k]) => k === tab);
  return (
    <>
      <div className="tm-head">
        <div>
          <span className="kicker">Tu cuenta</span>
          <h2 id="pm-title">Tu perfil</h2>
        </div>
        <button type="button" className="tm-x" onClick={close} aria-label="Cerrar">
          <i className="bi bi-x-lg" />
        </button>
      </div>

      <div className="pm-body">
        {/* pestañas con ficha que se desliza */}
        <div className="vx-tabs" role="tablist" aria-label="Secciones del perfil" style={{ "--n": TABS.length, "--i": ti }}>
          <span className="vx-tabs-thumb" aria-hidden="true" />
          {TABS.map(([k, label, icon]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              <i className={"bi " + icon} /> {label}
            </button>
          ))}
        </div>

        {tab === "verify" ? (
          <VerifySection uid={uid} profile={profile} />
        ) : (
          <form className="pm-form" onSubmit={save} onChange={() => error && setError("")} noValidate>
            {tab === "profile" ? (
              <>
                <div className="field">
                  <label htmlFor="pm-name">Nombre visible</label>
                  <input id="pm-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={profile?.username} />
                </div>
                <div className="field">
                  <label htmlFor="pm-bio">Bio</label>
                  <textarea id="pm-bio" value={bio} maxLength={160} rows={2} onChange={(e) => setBio(e.target.value)} placeholder="Qué te gusta seguir, cómo invertís…" />
                </div>
                <fieldset className="field">
                  <legend>Rubros que seguís</legend>
                  <div className="chips">
                    {SECTORS.map(([k, label, icon]) => (
                      <button key={k} type="button" className={"chip" + (interests.includes(k) ? " on" : "")} aria-pressed={interests.includes(k)} onClick={() => toggle(k)}>
                        <i className={"bi " + icon} /> {label}
                      </button>
                    ))}
                  </div>
                  <small className="hint">
                    <i className="bi bi-stars" /> Con esto armamos tus recomendaciones en el mercado.
                  </small>
                </fieldset>
              </>
            ) : (
              <fieldset className="field">
                <legend>¿Quién ve tu portfolio?</legend>
                <div className="vis-opts">
                  {VISIBILITY.map(([k, label, icon, desc]) => (
                    <label key={k} className={"vis-opt" + (visibility === k ? " on" : "")}>
                      <input type="radio" name="vis" value={k} checked={visibility === k} onChange={() => setVisibility(k)} />
                      <i className={"bi " + icon} />
                      <b>{label}</b>
                      <span>{desc}</span>
                    </label>
                  ))}
                </div>
                <small className="hint">
                  <i className="bi bi-shield-lock" /> Nunca se muestran montos: solo qué tenés en % y cómo te va.
                </small>
              </fieldset>
            )}

            <div className="tm-foot">
              <FormError error={error} />
              <button type="submit" className="btn btn-pink" disabled={saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

const CAT_ICON = {
  analista: "bi-graph-up-arrow",
  asesor: "bi-briefcase",
  broker: "bi-bank",
  creador: "bi-camera-video",
  periodista: "bi-newspaper",
  otro: "bi-three-dots",
};

/* Verificado: estado actual o pedido */
function VerifySection({ uid, profile }) {
  const req = useMyVerification(uid);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("analista");
  const [link, setLink] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    const url = link.trim();
    if (url && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(url)) return setError("El link no parece válido (ej: linkedin.com/in/tu-usuario)");
    if (reason.trim().length < 10) return setError("Contanos un poco más (mínimo 10 caracteres)");
    setSaving(true);
    const err = await requestVerification(uid, { category, link: url || null, reason: reason.trim() });
    setSaving(false);
    if (err) return setError(netMsg(err));
    toast("Pedido enviado: te avisamos cuando lo revisemos");
    setOpen(false);
  };

  const r = req.data;
  return (
    <section className="verify-box" id="pm-verify">
      <div className="verify-top">
        <span className="verify-ic">
          <i className="bi bi-patch-check-fill" />
        </span>
        <div>
          <b>Cuenta verificada</b>
          {profile?.verified ? (
            <span>
              Ya estás verificado <Verified label={profile.verified_label} /> · {profile.verified_label}
            </span>
          ) : r?.status === "pending" ? (
            <span>Tu pedido está en revisión. Te avisamos por notificación.</span>
          ) : (
            <span>Para analistas, asesores, brokers y creadores. La aprueba el equipo de Valeur.</span>
          )}
        </div>
        {!profile?.verified && r?.status !== "pending" && !open && (
          <button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(true)}>
            Pedir
          </button>
        )}
      </div>
      {r?.status === "rejected" && !open && <p className="muted small">El último pedido no se aprobó. Podés volver a intentarlo.</p>}
      {open && (
        <form className="verify-form" onSubmit={send} noValidate>
          <fieldset className="field">
            <legend>¿Qué sos?</legend>
            <div className="vf-cats" role="radiogroup" aria-label="Qué sos">
              {VERIFY_CATEGORIES.map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={category === k} className={"vf-cat" + (category === k ? " on" : "")} onClick={() => setCategory(k)}>
                  <i className={"bi " + (CAT_ICON[k] || "bi-person")} />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="vf-link">Link que lo respalde (opcional)</label>
            <input id="vf-link" value={link} maxLength={200} onChange={(e) => setLink(e.target.value)} placeholder="LinkedIn, matrícula CNV, canal…" />
          </div>
          <div className="field">
            <label htmlFor="vf-reason">¿Por qué?</label>
            <textarea id="vf-reason" value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} placeholder="Contanos a qué te dedicás" />
          </div>
          <FormError error={error} />
          <div className="row-btns">
            <button type="button" className="btn btn-line" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-pink" disabled={saving}>
              <i className="bi bi-send" /> {saving ? "Enviando…" : "Enviar pedido"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
