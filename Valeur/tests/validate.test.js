// Pruebas unitarias de las validaciones de los formularios de cuenta.
import { describe, expect, it } from "vitest";
import { isEmail, USERNAME_RE } from "../src/lib/validate";

describe("isEmail", () => {
  it.each(["ana@gmail.com", "  ana.p@huergo.edu.ar  ", "a+b@x.io"])("acepta %s", (s) => {
    expect(isEmail(s)).toBe(true);
  });
  it.each(["usuario@dominio", "sin-arroba.com", "a b@x.com", "a@b.c", "", null])("rechaza %s", (s) => {
    expect(isEmail(s)).toBe(false);
  });
});

describe("USERNAME_RE (igual que el check de la base)", () => {
  it("acepta letras, números y guión bajo, de 3 a 30", () => {
    expect(USERNAME_RE.test("facu_99")).toBe(true);
  });
  it.each(["ab", "con espacio", "ñandú", "x".repeat(31), "drop;table"])("rechaza %s", (s) => {
    expect(USERNAME_RE.test(s)).toBe(false);
  });
});
