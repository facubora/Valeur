import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Logo from "../components/Logo";
import Pill from "../components/Pill";
import PortfolioChart from "../components/PortfolioChart";
import SymbolSearch from "../components/SymbolSearch";
import { SectionHead } from "../components/Sections";
import { Sk } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { lookup } from "../lib/catalog";
import { getCandles, useMep, useDisplayCurrency, assetCurrency, fmtPrice, money, signed, formatDate, tickerUrl } from "../lib/market";
import { simulate, yearsAgo } from "../lib/simulate";

const POPULAR = ["NVDA", "MELI.BA", "BTC-USD", "AAPL.BA", "GGAL.BA", "SPY"];
const WHEN = [
  [1, "Hace 1 año"],
  [3, "3 años"],
  [5, "5 años"],
  [10, "10 años"],
];
const pctTxt = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toLocaleString("es-AR", { maximumFractionDigits: n >= 1000 || n <= -1000 ? 0 : 1 }) + "%";

/* ¿Y si hubiera invertido? Elegís un activo, cuánto y desde cuándo (de una
   vez o todos los meses) y muestra cuánto tendrías hoy, con la curva de lo
   que valdría contra lo que pusiste. Todo queda en la URL para compartirlo. */
export default function Simulator() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [displayCur] = useDisplayCurrency();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // lo que se eligió vive en la URL (?activo=NVDA&monto=1000&moneda=USD&desde=2021-10-01&mensual=1)
  const symbol = (params.get("activo") || "NVDA").toUpperCase();
  const cur = params.get("moneda") === "ARS" ? "ARS" : params.get("moneda") === "USD" ? "USD" : displayCur;
  const amountRaw = params.get("monto") ?? (cur === "ARS" ? "1000000" : "1000");
  const amount = Number(amountRaw);
  const from = params.get("desde") || yearsAgo(5);
  const monthly = params.get("mensual") === "1";
  const set = (patch) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        // null saca el parámetro; "" lo deja vacío (así el monto se puede borrar para escribir otro)
        for (const [k, v] of Object.entries(patch)) v == null ? next.delete(k) : next.set(k, v);
        return next;
      },
      { replace: true },
    );

  const assetCur = assetCurrency(symbol);
  const meta = lookup(symbol);
  const fx = useMep();
  const [data, setData] = useState({ symbol: null, candles: [], error: false });
  useEffect(() => {
    let alive = true;
    getCandles(symbol, "daily", "max").then(
      (candles) => alive && setData({ symbol, candles, error: !candles.length }),
      () => alive && setData({ symbol, candles: [], error: true }),
    );
    return () => {
      alive = false;
    };
  }, [symbol]);
  const loading = data.symbol !== symbol || (cur !== assetCur && !fx.loaded);
  const firstDay = data.symbol === symbol ? data.candles[0]?.time : null;

  const res = useMemo(
    () => (loading || data.error ? null : simulate({ candles: data.candles, from, amount, monthly, cur, assetCur, mep: fx.mep })),
    [loading, data, from, amount, monthly, cur, assetCur, fx.mep],
  );
  // si la fecha es anterior a lo que hay, arranca desde el primer día con precio
  const clipped = res && firstDay && from < firstDay;
  const fmt = (n) => money(n, undefined, cur);
  const name = meta?.name || symbol;

  return (
    <AppShell>
      <section className="page-head">
        <div>
          <span className="kicker">Simulador</span>
          <h1>
            ¿Y si hubiera <em>invertido</em>?
          </h1>
          {res && (
            <div className="hpills" aria-label="El resultado en cifras">
              <Pill icon="bi-tag" label="Activo" value={symbol} />
              <Pill label="Pusiste" value={fmt(res.invested)} />
              <Pill label="Hoy" value={fmt(res.value)} delta={res.pct} />
            </div>
          )}
        </div>
      </section>

      <section className="block sim">
        <div className="card sim-form">
          {/* activo */}
          <div className="field">
            <span className="sim-lbl">Activo</span>
            <div className="tm-picked">
              <Logo symbol={symbol} size={34} />
              <div>
                <b>{symbol}</b>
                <span>{[meta?.name, assetCur === "ARS" ? "cotiza en pesos" : "cotiza en dólares"].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
            <SymbolSearch onPick={(s) => set({ activo: s.symbol })} placeholder="Buscar otro activo…" />
            <div className="chips sim-pop">
              {POPULAR.filter((s) => s !== symbol).map((s) => (
                <button key={s} type="button" className="chip" onClick={() => set({ activo: s })}>
                  <Logo symbol={s} size={18} /> {s}
                </button>
              ))}
            </div>
          </div>

          {/* monto */}
          <div className="field">
            <label htmlFor="sim-amount" className="sim-lbl">
              {monthly ? "Cuánto por mes" : "Cuánto"}
            </label>
            <div className="sim-amount">
              <div className="in">
                <span className="in-ic pre">{cur === "ARS" ? "$" : "US$"}</span>
                <input
                  id="sim-amount"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="any"
                  value={amountRaw}
                  onChange={(e) => set({ monto: e.target.value })}
                />
              </div>
              <div className="cur-seg" data-cur={cur} role="radiogroup" aria-label="Moneda">
                <span className="cur-thumb" aria-hidden="true" />
                {[
                  ["USD", "US$"],
                  ["ARS", "AR$"],
                ].map(([c, t]) => (
                  <button key={c} type="button" role="radio" aria-checked={c === cur} className={c === cur ? "on" : ""} onClick={() => set({ moneda: c })}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* desde cuándo */}
          <div className="field">
            <label htmlFor="sim-from" className="sim-lbl">
              Desde
            </label>
            <div className="chips">
              {WHEN.map(([n, label]) => (
                <button key={n} type="button" className={"chip" + (from === yearsAgo(n) ? " on" : "")} aria-pressed={from === yearsAgo(n)} onClick={() => set({ desde: yearsAgo(n) })}>
                  {label}
                </button>
              ))}
            </div>
            <div className="in sim-date">
              <i className="bi bi-calendar3 in-ic" aria-hidden="true" />
              <input id="sim-from" type="date" value={from} max={yearsAgo(0)} onChange={(e) => e.target.value && set({ desde: e.target.value })} />
            </div>
          </div>

          {/* de una vez o todos los meses */}
          <div className="field">
            <span className="sim-lbl">Cómo</span>
            <div className="vx-tabs" role="radiogroup" aria-label="Cómo invertir" style={{ "--n": 2, "--i": monthly ? 1 : 0 }}>
              <span className="vx-tabs-thumb" aria-hidden="true" />
              <button type="button" role="radio" aria-checked={!monthly} className={!monthly ? "on" : ""} onClick={() => set({ mensual: null })}>
                <i className="bi bi-1-circle" /> De una vez
              </button>
              <button type="button" role="radio" aria-checked={monthly} className={monthly ? "on" : ""} onClick={() => set({ mensual: "1" })}>
                <i className="bi bi-calendar-check" /> Todos los meses
              </button>
            </div>
          </div>
        </div>

        <div className="sim-out" aria-live="polite">
          {loading ? (
            <div className="card sim-res" aria-busy="true" aria-label="Calculando">
              <Sk w="70%" h={14} />
              <Sk w="45%" h={44} r={10} />
              <div className="sim-tiles">
                <Sk h={52} r={12} />
                <Sk h={52} r={12} />
                <Sk h={52} r={12} />
              </div>
              <Sk h={260} r={14} />
            </div>
          ) : !res ? (
            <div className="card sim-res sim-empty">
              <i className="bi bi-hourglass" />
              <b>{data.error ? `No encontramos la historia de ${symbol}` : !(amount > 0) ? "Poné cuánto querés invertir" : "Para esa fecha todavía no hay precios"}</b>
              <span>{data.error ? "Probá con otro activo." : !(amount > 0) ? "Escribilo a la izquierda y el resultado aparece acá." : "Probá con una fecha más cercana."}</span>
            </div>
          ) : (
            <div className="card sim-res">
              <p className="sim-say">
                Si hubieras puesto <b>{fmt(amount)}</b>
                {monthly ? " todos los meses" : ""} en <b>{name}</b> {monthly ? "desde el" : "el"} <b>{formatDate(res.start)}</b>, hoy tendrías
              </p>
              <div className="sim-big">
                <b className={res.gain >= 0 ? "txt-up" : "txt-down"}>{fmt(res.value)}</b>
                <em className={"sim-pct " + (res.gain >= 0 ? "up" : "down")}>
                  <i className={res.gain >= 0 ? "bi bi-arrow-up-right" : "bi bi-arrow-down-right"} /> {pctTxt(res.pct)}
                </em>
              </div>

              <div className="sim-tiles">
                <div>
                  <small>Pusiste</small>
                  <b>{fmt(res.invested)}</b>
                  {monthly && <span>en {res.buys} compras</span>}
                </div>
                <div>
                  <small>{res.gain >= 0 ? "Ganaste" : "Perdiste"}</small>
                  <b className={res.gain >= 0 ? "txt-up" : "txt-down"}>{signed(res.gain, undefined, cur)}</b>
                </div>
                <div>
                  <small>{res.perYear != null ? "Por año" : "Tiempo"}</small>
                  <b>{res.perYear != null ? pctTxt(res.perYear) : res.years >= 1 ? `${res.years.toLocaleString("es-AR", { maximumFractionDigits: 1 })} años` : `${Math.max(1, Math.round(res.years * 12))} meses`}</b>
                </div>
              </div>

              <PortfolioChart points={res.points} currency={cur} />

              <ul className="sim-facts">
                <li>
                  <i className="bi bi-bag" />
                  {monthly ? (
                    <span>
                      Juntaste <b>{res.units.toLocaleString("es-AR", { maximumFractionDigits: 4 })}</b> {symbol}. La primera compra fue a {fmtPrice(symbol, res.firstPrice)}; hoy cotiza {fmtPrice(symbol, res.lastPrice)}.
                    </span>
                  ) : (
                    <span>
                      Comprabas <b>{res.units.toLocaleString("es-AR", { maximumFractionDigits: 4 })}</b> {symbol} a {fmtPrice(symbol, res.firstPrice)}; hoy cotiza {fmtPrice(symbol, res.lastPrice)}.
                    </span>
                  )}
                </li>
                {res.worst && res.worst.ratio < 1 && (
                  <li>
                    <i className="bi bi-graph-down-arrow txt-down" />
                    <span>
                      En el peor momento ({formatDate(res.worst.time)}) llegó a valer <b>{fmt(res.worst.value)}</b>, {pctTxt((res.worst.ratio - 1) * 100)} de lo que habías puesto. Aguantar era parte del resultado.
                    </span>
                  </li>
                )}
                {res.peak && res.peak.ratio > res.value / res.invested + 0.05 && (
                  <li>
                    <i className="bi bi-graph-up-arrow txt-up" />
                    <span>
                      Lo mejor fue el {formatDate(res.peak.time)}: llegó a <b>{fmt(res.peak.value)}</b>.
                    </span>
                  </li>
                )}
                {clipped && (
                  <li>
                    <i className="bi bi-info-circle" />
                    <span>
                      Hay precios de {symbol} desde el {formatDate(firstDay)}, así que arranca ahí.
                    </span>
                  </li>
                )}
                {cur !== assetCur && (
                  <li>
                    <i className="bi bi-currency-exchange" />
                    <span>{symbol} cotiza en {assetCur === "ARS" ? "pesos" : "dólares"}: cada compra se pasa al dólar MEP de ese día.</span>
                  </li>
                )}
              </ul>

              <div className="sim-acts">
                <Link to={tickerUrl(symbol)} className="btn btn-line btn-sm">
                  <i className="bi bi-graph-up" /> Ver {symbol}
                </Link>
                <Link to="/dashboard?operar=1" className="btn btn-pink btn-sm">
                  <i className="bi bi-plus-lg" /> Registrar una compra
                </Link>
              </div>
              <small className="sim-note">Con los precios de cierre de Yahoo Finance, sin comisiones, impuestos ni dividendos. Lo que pasó no asegura lo que va a pasar.</small>
            </div>
          )}
        </div>
      </section>

      <section className="block">
        <SectionHead kicker="Para probar" title="Algunas ideas" desc="Tocá una y mirá qué hubiera pasado." />
        <div className="sim-ideas">
          {[
            ["BTC-USD", 1000, 5, false, "Mil dólares en Bitcoin hace 5 años"],
            ["SPY", 100, 10, true, "US$ 100 por mes en el S&P 500 durante 10 años"],
            ["MELI.BA", 500000, 3, false, "Medio palo en el CEDEAR de MercadoLibre hace 3 años"],
            ["GGAL.BA", 50000, 5, true, "$50.000 por mes en Galicia durante 5 años"],
          ].map(([s, m, y, mm, label]) => (
            <button
              key={label}
              type="button"
              className="card sim-idea"
              onClick={() => {
                set({ activo: s, monto: m, desde: yearsAgo(y), mensual: mm ? "1" : null, moneda: assetCurrency(s) });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Logo symbol={s} size={32} />
              <span>{label}</span>
              <i className="bi bi-arrow-right" />
            </button>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
