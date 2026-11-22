/* Validaciones de formularios compartidas (registro, entrar, recuperar) */

/* algo@algo.dominio: sin espacios y con un dominio de 2 letras o más
   ("usuario@dominio", sin punto, no pasa) */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (s) => EMAIL_RE.test(String(s || "").trim());

/* Usuario: 3 a 30 letras, números o guión bajo (igual que el check de la base) */
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
