// Pruebas unitarias de formatos, monedas y horarios del mercado.
import { describe, expect, it } from "vitest";
import { assetCurrency, assetKind, convert, fmtPrice, marketStatus, money, pct } from "../src/lib/market";
import { alertError } from "../src/lib/alerts";
import { simulate } from "../src/lib/simulate";

describe("tipo y moneda de cada activo", () => {
  it.each([
    ["AAPL", "stock", "USD"],
    ["MELI.BA", "cedear", "ARS"],
    ["AAPLD.BA", "cedear-usd", "USD"],
    ["BTC-USD", "crypto", "USD"],
    ["BTC-ARS", "crypto", "ARS"],
    ["^MERV", "index", "USD"],
  ])("%s es %s en %s", (symbol, kind, cur) => {
    expect(assetKind(symbol)).toBe(kind);
    expect(assetCurrency(symbol)).toBe(cur);
  });
});

describe("formatos", () => {
  it("money: dólares con 2 decimales, pesos sin decimales, guion si no hay número", () => {
    expect(money(1234.5)).toBe("US$ 1.234,50");
    expect(money(-20230.4, undefined, "ARS")).toBe("-ARS 20.230");
    expect(money(NaN)).toBe("—");
    expect(money(null)).toBe("—");
  });

  it("pct con signo y coma", () => {
    expect(pct(3.456)).toBe("+3,46%");
    expect(pct(-0.5)).toBe("−0,50%");
  });

  it("fmtPrice según el activo", () => {
    expect(fmtPrice("^MERV", 2848945.7)).toBe("2.848.946 pts");
    expect(fmtPrice("AAPL", undefined)).toBe("—");
  });
});

describe("convert", () => {
  it("dólares ↔ pesos con el MEP", () => {
    expect(convert(10, "USD", "ARS", 1500)).toBe(15000);
    expect(convert(15000, "ARS", "USD", 1500)).toBe(10);
    expect(convert(5, "USD", "USD")).toBe(5);
  });
  it("sin cotización del dólar no inventa un número", () => {
    expect(convert(10, "USD", "ARS", null)).toBeNaN();
  });
});

describe("marketStatus", () => {
  it("martes 15 h de Argentina: BYMA y NYSE abiertos", () => {
    const [byma, nyse] = marketStatus(new Date("2026-11-17T18:00:00Z"));
    expect(byma.open).toBe(true);
    expect(nyse.open).toBe(true);
  });
  it("sábado: todo cerrado", () => {
    const [byma, nyse] = marketStatus(new Date("2026-11-21T18:00:00Z"));
    expect(byma.open).toBe(false);
    expect(nyse.open).toBe(false);
  });
});

describe("alertError (validación de alertas)", () => {
  const quote = { price: 100 };
  it("rechaza valores no positivos y porcentajes absurdos", () => {
    expect(alertError({ symbol: "AAPL", kind: "above", value: 0, quote })).toMatch(/mayor a cero/);
    expect(alertError({ symbol: "AAPL", kind: "up_pct", value: 150, quote })).toMatch(/menor a 100/);
  });
  it("no deja poner 'sube a' un precio que ya se pasó", () => {
    expect(alertError({ symbol: "AAPL", kind: "above", value: 90, quote })).toMatch(/más alto/);
    expect(alertError({ symbol: "AAPL", kind: "below", value: 110, quote })).toMatch(/más bajo/);
  });
  it("no deja duplicar una alerta activa", () => {
    const existing = [{ id: 1, active: true, symbol: "AAPL", kind: "above", value: "120" }];
    expect(alertError({ symbol: "AAPL", kind: "above", value: 120, quote, existing })).toMatch(/misma alerta/);
    expect(alertError({ symbol: "AAPL", kind: "above", value: 120, quote, existing, selfId: 1 })).toBe("");
  });
});

describe("simulate (¿y si hubiera invertido?)", () => {
  const candles = [
    { time: "2026-01-02", close: 100 },
    { time: "2026-01-20", close: 110 },
    { time: "2026-02-02", close: 120 },
    { time: "2026-02-20", close: 150 },
  ];
  it("una sola compra: compra al primer cierre y vale al último", () => {
    const r = simulate({ candles, from: "2026-01-01", amount: 1000, monthly: false, cur: "USD", assetCur: "USD" });
    expect(r.invested).toBe(1000);
    expect(r.value).toBeCloseTo(1500);
  });
  it("mensual: compra el primer día con precio de cada mes", () => {
    const r = simulate({ candles, from: "2026-01-01", amount: 100, monthly: true, cur: "USD", assetCur: "USD" });
    expect(r.invested).toBe(200);
    expect(r.value).toBeCloseTo(150 + 125);
  });
  it("monto inválido o sin datos → null", () => {
    expect(simulate({ candles, from: "2026-01-01", amount: 0, cur: "USD", assetCur: "USD" })).toBeNull();
    expect(simulate({ candles: [], from: "2026-01-01", amount: 10, cur: "USD", assetCur: "USD" })).toBeNull();
  });
});
