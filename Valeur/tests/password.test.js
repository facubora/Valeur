// Pruebas unitarias de las reglas de contraseña (registro, nueva clave y
// cambio de contraseña usan las mismas).
import { describe, expect, it } from "vitest";
import { passwordOk, passwordScore } from "../src/lib/password";

describe("passwordScore", () => {
  it("las contraseñas comunes valen 0 aunque sean largas", () => {
    expect(passwordScore("12345678")).toBe(0);
    expect(passwordScore("Password")).toBe(0);
    expect(passwordScore("valeur123")).toBe(0);
  });

  it("las cortas nunca pasan de 1", () => {
    expect(passwordScore("aB3$")).toBeLessThanOrEqual(1);
  });

  it("suma por largo, letras + números y símbolos o mayúsculas", () => {
    expect(passwordScore("mipalabra")).toBe(1);
    expect(passwordScore("mipalabra7")).toBe(2);
    expect(passwordScore("Mi-palabra-larga7")).toBe(4);
  });
});

describe("passwordOk", () => {
  it("pide 8 o más, que no sea común y que coincida la confirmación", () => {
    expect(passwordOk("corta1", "corta1")).toBe(false);
    expect(passwordOk("12345678", "12345678")).toBe(false);
    expect(passwordOk("buenaClave9", "buenaClave8")).toBe(false);
    expect(passwordOk("buenaClave9", "buenaClave9")).toBe(true);
  });
});
