// Pruebas unitarias de los cálculos del portfolio: posiciones, costo
// promedio, ventas de más y exportación a CSV.
import { describe, expect, it } from "vitest";
import { computePositions, findOversell, tradesCsv } from "../src/lib/portfolio";

const trade = (side, symbol, qty, price, day, extra = {}) => ({
  side, symbol, qty, price, executed_at: `2026-${day}T12:00:00Z`, name: symbol, ...extra,
});

describe("findOversell", () => {
  it("detecta una venta de más de lo que tenías en ese momento", () => {
    const trades = [trade("buy", "AAPL", 10, 100, "01-10"), trade("sell", "AAPL", 12, 120, "02-10")];
    expect(findOversell(trades)).toMatchObject({ symbol: "AAPL", have: 10, sell: 12 });
  });

  it("mira el orden de las fechas, no el de la lista", () => {
    const trades = [trade("sell", "AAPL", 5, 120, "03-10"), trade("buy", "AAPL", 10, 100, "01-10")];
    expect(findOversell(trades)).toBeNull();
  });

  it("no se puede vender algo que nunca compraste", () => {
    expect(findOversell([trade("sell", "MSFT", 1, 300, "01-10")])).toMatchObject({ symbol: "MSFT", have: 0 });
  });
});

describe("computePositions", () => {
  it("costo promedio ponderado y ganancia con el precio actual", () => {
    const trades = [trade("buy", "AAPL", 10, 100, "01-10"), trade("buy", "AAPL", 10, 200, "02-10")];
    const { positions, totals } = computePositions(trades, { AAPL: { price: 180, change: 2, change_pct: 1.12 } });
    expect(positions).toHaveLength(1);
    expect(positions[0].avgCost).toBe(150);
    expect(positions[0].value).toBe(3600);
    expect(totals.cost).toBe(3000);
    expect(totals.pnl).toBe(600);
    expect(totals.pnlPct).toBe(20);
    expect(totals.dayChange).toBe(40);
  });

  it("la venta saca costo en proporción y no cambia el promedio", () => {
    const trades = [trade("buy", "AAPL", 10, 100, "01-10"), trade("sell", "AAPL", 4, 150, "02-10")];
    const { positions } = computePositions(trades, { AAPL: { price: 150 } });
    expect(positions[0].qty).toBe(6);
    expect(positions[0].avgCost).toBe(100);
    expect(positions[0].cost).toBe(600);
  });

  it("una posición vendida entera desaparece", () => {
    const trades = [trade("buy", "KO", 3, 60, "01-10"), trade("sell", "KO", 3, 70, "02-10")];
    expect(computePositions(trades, {}).positions).toEqual([]);
  });

  it("sin cotización usa el costo promedio como precio", () => {
    const { positions } = computePositions([trade("buy", "KO", 2, 50, "01-10")], {});
    expect(positions[0]).toMatchObject({ price: 50, live: false, pnl: 0 });
  });

  it("convierte un CEDEAR en pesos a dólares con el MEP", () => {
    const mep = { rate: 1000, at: () => 1000 };
    const { positions } = computePositions([trade("buy", "MELI.BA", 2, 20000, "01-10")], { "MELI.BA": { price: 25000 } }, "USD", mep);
    expect(positions[0].value).toBe(50);
    expect(positions[0].cost).toBe(40);
  });

  it("la composición suma 100%", () => {
    const trades = [trade("buy", "AAPL", 1, 100, "01-10"), trade("buy", "KO", 3, 100, "01-10")];
    const { positions } = computePositions(trades, {});
    expect(positions.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(100);
  });
});

describe("tradesCsv", () => {
  it("separa con punto y coma, fecha argentina y coma decimal", () => {
    const csv = tradesCsv([trade("buy", "AAPL", 1.5, 100.25, "01-10")]);
    const [head, row] = csv.replace("﻿", "").split("\r\n");
    expect(head.startsWith("Fecha;Operación;Ticker")).toBe(true);
    expect(row).toBe("10/01/2026;Compra;AAPL;AAPL;1,5;100,25;USD;150,38;");
  });

  it("una nota con ; o comillas no rompe las columnas", () => {
    const csv = tradesCsv([trade("buy", "AAPL", 1, 1, "01-10", { note: 'dijo "ya"; compré' })]);
    expect(csv.endsWith('"dijo ""ya""; compré"')).toBe(true);
  });

  it("una nota que empieza con = no se ejecuta como fórmula en Excel", () => {
    const csv = tradesCsv([trade("buy", "AAPL", 1, 1, "01-10", { note: "=HYPERLINK(\"http://x\")" })]);
    expect(csv).not.toMatch(/;=HYPERLINK/);
    expect(csv).toContain("'=HYPERLINK");
  });
});
