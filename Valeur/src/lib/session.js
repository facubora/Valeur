/* Iniciales para el avatar del usuario */
export function initials(name = "") {
  return name.slice(0, 2).toUpperCase() || "V";
}
