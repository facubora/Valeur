/* Qué tan fuerte es una contraseña, de 0 a 4. Las muy comunes valen 0. */
const COMMON = /^(12345678|123456789|1234567890|password|contraseña|qwerty123|11111111|abcd1234|valeur123)$/i;
export function passwordScore(pw) {
  if (!pw || COMMON.test(pw)) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-zA-Zñ]/.test(pw) && /\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9ñÑ]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++;
  return pw.length < 8 ? Math.min(s, 1) : Math.max(s, 1);
}

/* Lo obligatorio: 8 o más, que no sea de las comunes y que las dos coincidan */
export const passwordOk = (pw, confirm) => pw.length >= 8 && passwordScore(pw) > 0 && pw === confirm;
