/* ── Catálogo curado del mercado: rubros, tipos y recomendaciones ─────────
   Yahoo no da el rubro de un activo sin un pedido lento por símbolo, así que
   mantenemos una lista curada con lo que más se opera desde Argentina. Los
   símbolos son los de Yahoo Finance (CEDEAR = "<ticker>.BA"). */

export const SECTORS = [
  ["tech", "Tecnología", "bi-cpu"],
  ["semis", "Chips", "bi-motherboard"],
  ["comm", "Medios y redes", "bi-broadcast"],
  ["fin", "Finanzas", "bi-bank"],
  ["energy", "Energía", "bi-lightning-charge"],
  ["consumer", "Consumo", "bi-bag"],
  ["health", "Salud", "bi-heart-pulse"],
  ["industry", "Industria", "bi-gear"],
  ["autos", "Autos", "bi-car-front"],
  ["materials", "Minería y materiales", "bi-gem"],
  ["argentina", "Argentina", "bi-flag"],
  ["crypto", "Cripto", "bi-currency-bitcoin"],
  ["fx", "Monedas", "bi-cash-coin"],
  ["etf", "Índices y ETFs", "bi-collection"],
];
export const SECTOR = Object.fromEntries(SECTORS.map(([k, label, icon]) => [k, { key: k, label, icon }]));

export const KIND_LABEL = {
  stock: "Acción",
  cedear: "CEDEAR",
  crypto: "Cripto",
  fx: "Moneda",
  etf: "ETF",
  index: "Índice",
};

/* [símbolo, nombre, tipo, rubros, CEDEAR (true = "<símbolo>.BA", string = otro)] */
const RAW = [
  ["AAPL", "Apple", "stock", ["tech"], true],
  ["MSFT", "Microsoft", "stock", ["tech"], true],
  ["NVDA", "NVIDIA", "stock", ["semis", "tech"], true],
  ["GOOGL", "Alphabet", "stock", ["tech", "comm"], true],
  ["AMZN", "Amazon", "stock", ["tech", "consumer"], true],
  ["META", "Meta", "stock", ["comm", "tech"], true],
  ["TSLA", "Tesla", "stock", ["autos", "tech"], true],
  ["MELI", "MercadoLibre", "stock", ["tech", "consumer", "argentina"], true],
  ["AMD", "AMD", "stock", ["semis"], true],
  ["TSM", "TSMC", "stock", ["semis"], true],
  ["AVGO", "Broadcom", "stock", ["semis"], true],
  ["INTC", "Intel", "stock", ["semis"], true],
  ["QCOM", "Qualcomm", "stock", ["semis"], true],
  ["NFLX", "Netflix", "stock", ["comm"], true],
  ["DIS", "Disney", "stock", ["comm", "consumer"], "DISN.BA"],
  ["SPOT", "Spotify", "stock", ["comm"], true],
  ["CRM", "Salesforce", "stock", ["tech"], true],
  ["ORCL", "Oracle", "stock", ["tech"], true],
  ["ADBE", "Adobe", "stock", ["tech"], true],
  ["PLTR", "Palantir", "stock", ["tech"], true],
  ["UBER", "Uber", "stock", ["tech"], true],
  ["SHOP", "Shopify", "stock", ["tech", "consumer"], true],
  ["GLOB", "Globant", "stock", ["tech", "argentina"], true],
  ["V", "Visa", "stock", ["fin"], true],
  ["MA", "Mastercard", "stock", ["fin"], true],
  ["PYPL", "PayPal", "stock", ["fin", "tech"], true],
  ["JPM", "JPMorgan", "stock", ["fin"], true],
  ["BAC", "Bank of America", "stock", ["fin"], true],
  ["GS", "Goldman Sachs", "stock", ["fin"], true],
  ["BRK-B", "Berkshire Hathaway", "stock", ["fin"], "BRKB.BA"],
  ["COIN", "Coinbase", "stock", ["fin", "crypto"], true],
  ["XOM", "Exxon Mobil", "stock", ["energy"], true],
  ["CVX", "Chevron", "stock", ["energy"], true],
  ["VIST", "Vista Energy", "stock", ["energy", "argentina"], true],
  ["YPF", "YPF", "stock", ["energy", "argentina"], false],
  ["PAM", "Pampa Energía", "stock", ["energy", "argentina"], false],
  ["TGS", "Transportadora Gas del Sur", "stock", ["energy", "argentina"], false],
  ["GGAL", "Grupo Galicia", "stock", ["fin", "argentina"], false],
  ["BMA", "Banco Macro", "stock", ["fin", "argentina"], false],
  ["KO", "Coca-Cola", "stock", ["consumer"], true],
  ["PEP", "PepsiCo", "stock", ["consumer"], true],
  ["MCD", "McDonald's", "stock", ["consumer"], true],
  ["WMT", "Walmart", "stock", ["consumer"], true],
  ["COST", "Costco", "stock", ["consumer"], true],
  ["NKE", "Nike", "stock", ["consumer"], true],
  ["SBUX", "Starbucks", "stock", ["consumer"], true],
  ["JNJ", "Johnson & Johnson", "stock", ["health"], true],
  ["LLY", "Eli Lilly", "stock", ["health"], true],
  ["PFE", "Pfizer", "stock", ["health"], true],
  ["ABBV", "AbbVie", "stock", ["health"], true],
  ["UNH", "UnitedHealth", "stock", ["health"], true],
  ["MRNA", "Moderna", "stock", ["health"], true],
  ["BA", "Boeing", "stock", ["industry"], true],
  ["CAT", "Caterpillar", "stock", ["industry"], true],
  ["GE", "GE Aerospace", "stock", ["industry"], true],
  ["F", "Ford", "stock", ["autos"], true],
  ["GM", "General Motors", "stock", ["autos"], true],
  ["TM", "Toyota", "stock", ["autos"], true],
  ["VALE", "Vale", "stock", ["materials"], true],
  ["NEM", "Newmont", "stock", ["materials"], true],
  ["FCX", "Freeport-McMoRan", "stock", ["materials"], true],
  ["SPY", "S&P 500 (SPY)", "etf", ["etf"], true],
  ["QQQ", "Nasdaq 100 (QQQ)", "etf", ["etf", "tech"], true],
  ["DIA", "Dow Jones (DIA)", "etf", ["etf"], true],
  ["EEM", "Emergentes (EEM)", "etf", ["etf"], true],
  ["GLD", "Oro (GLD)", "etf", ["etf", "materials"], true],
  ["XLE", "Energía (XLE)", "etf", ["etf", "energy"], true],
  ["ARKK", "ARK Innovation", "etf", ["etf", "tech"], true],
  ["^GSPC", "S&P 500", "index", ["etf"], false],
  ["^IXIC", "Nasdaq", "index", ["etf", "tech"], false],
  ["^DJI", "Dow Jones", "index", ["etf"], false],
  ["^MERV", "Merval", "index", ["etf", "argentina"], false],
  ["BTC-USD", "Bitcoin", "crypto", ["crypto"], false],
  ["ETH-USD", "Ethereum", "crypto", ["crypto"], false],
  ["SOL-USD", "Solana", "crypto", ["crypto"], false],
  ["XRP-USD", "XRP", "crypto", ["crypto"], false],
  ["BNB-USD", "BNB", "crypto", ["crypto"], false],
  ["ADA-USD", "Cardano", "crypto", ["crypto"], false],
  ["DOGE-USD", "Dogecoin", "crypto", ["crypto"], false],
  ["LINK-USD", "Chainlink", "crypto", ["crypto"], false],
  ["USDARS=X", "Dólar oficial", "fx", ["fx", "argentina"], false],
  ["EURUSD=X", "Euro / Dólar", "fx", ["fx"], false],
  ["USDBRL=X", "Dólar / Real", "fx", ["fx"], false],
  ["GBPUSD=X", "Libra / Dólar", "fx", ["fx"], false],
  ["USDJPY=X", "Dólar / Yen", "fx", ["fx"], false],
  ["USDCLP=X", "Dólar / Peso chileno", "fx", ["fx"], false],
  ["USDMXN=X", "Dólar / Peso mexicano", "fx", ["fx"], false],
];

/* Una fila por activo base; el CEDEAR es otra "vista" del mismo activo */
export const ASSETS = RAW.map(([symbol, name, kind, tags, ced], rank) => ({
  symbol,
  name,
  kind,
  tags,
  rank,
  cedear: ced === true ? `${symbol}.BA` : ced || null,
}));

const BY_SYMBOL = new Map();
for (const a of ASSETS) {
  BY_SYMBOL.set(a.symbol, a);
  if (a.cedear) {
    BY_SYMBOL.set(a.cedear, a);
    BY_SYMBOL.set(a.cedear.replace(/\.BA$/, "D.BA"), a); // CEDEAR en dólares
  }
}

/* Datos del catálogo para cualquier variante del símbolo (AAPL, AAPL.BA, AAPLD.BA) */
export function lookup(symbol = "") {
  return BY_SYMBOL.get(symbol.toUpperCase()) || null;
}

/* Activo base al que pertenece un símbolo (para no recomendar AAPL a quien sigue AAPL.BA) */
export const baseOf = (symbol) => lookup(symbol)?.symbol || symbol.toUpperCase();

/* Pestañas del explorador del mercado */
export const TABS = [
  ["cedear", "CEDEARs"],
  ["stock", "Acciones"],
  ["crypto", "Cripto"],
  ["fx", "Monedas"],
  ["etf", "Índices y ETFs"],
];

/* Filas de una pestaña, opcionalmente filtradas por rubro → [{ symbol, name, kind, tags }] */
export function listFor(tab, sector = null) {
  const rows = [];
  for (const a of ASSETS) {
    if (sector && !a.tags.includes(sector)) continue;
    if (tab === "cedear") {
      if (a.cedear && a.kind !== "index") rows.push({ ...a, symbol: a.cedear, kind: "cedear", base: a.symbol });
    } else if (tab === "etf" ? a.kind === "etf" || a.kind === "index" : a.kind === tab) {
      rows.push({ ...a, base: a.symbol });
    }
  }
  return rows;
}

/* Activos del mismo rubro que `symbol` (misma variante: CEDEAR o EE.UU.) */
export function similarTo(symbol, limit = 4) {
  const me = lookup(symbol);
  if (!me) return [];
  const asCedear = symbol.toUpperCase().endsWith(".BA");
  const main = me.tags[0];
  return ASSETS.filter((a) => a !== me && a.tags.includes(main) && (!asCedear || a.cedear))
    .slice(0, limit)
    .map((a) => ({ ...a, symbol: asCedear ? a.cedear : a.symbol, base: a.symbol }));
}

/* ── Recomendaciones "Para vos" ──────────────────────────────────────────────
   Puntaje por activo del catálogo que todavía no seguís ni tenés:
     · rubros que elegiste seguir                       (+3 c/u)
     · comparte rubro con lo que seguís o tenés          (+1.5 c/u, máx 3)
     · lo recomiendan (comprar) personas que seguís      (+2.5 c/u)
     · mismo tipo que lo que ya mirás (cripto, monedas)  (+1)
   Con CEDEARs en tu lista, recomienda el CEDEAR en vez de la acción de EE.UU.
   Devuelve [{ symbol, name, kind, tags, reason: { icon, text } }]. */
const KIND_WHY = { crypto: "Mirás cripto", fx: "Mirás monedas", etf: "Mirás ETFs" };

export function recommend({ interests = [], watched = [], held = [], community = {}, hidden = [], limit = 8 }) {
  const mine = [...watched, ...held].map((s) => s.toUpperCase());
  if (!interests.length && !mine.length && !Object.keys(community).length) return [];

  const owned = new Set(mine.map(baseOf));
  const skip = new Set(hidden.map(baseOf));
  const byma = mine.filter((s) => s.endsWith(".BA")).length;
  const preferCedear = byma >= mine.length - byma;

  // rubros y tipos presentes en lo que ya seguís, con un ejemplo para el motivo
  const tagSeen = new Map(); // tag → símbolo de ejemplo
  const kinds = new Set();
  for (const s of mine) {
    const a = lookup(s);
    if (!a) continue;
    kinds.add(a.kind);
    a.tags.forEach((t) => !tagSeen.has(t) && tagSeen.set(t, s));
  }

  const out = [];
  for (const a of ASSETS) {
    if (owned.has(a.symbol) || skip.has(a.symbol) || a.kind === "index") continue;
    let score = 0;
    let reason = null;
    let best = 0;
    const bump = (pts, why) => {
      score += pts;
      if (pts > best) {
        best = pts;
        reason = why;
      }
    };

    const interest = a.tags.filter((t) => interests.includes(t));
    if (interest.length) bump(3 * interest.length, { icon: SECTOR[interest[0]].icon, text: `Seguís ${SECTOR[interest[0]].label}` });

    const shared = a.tags.filter((t) => tagSeen.has(t)).slice(0, 2);
    if (shared.length) bump(1.5 * shared.length, { icon: "bi-diagram-3", text: `Parecido a ${tagSeen.get(shared[0])}` });

    const c = community[a.symbol];
    if (c?.count > 0) {
      bump(2.5 * c.count, {
        icon: "bi-people",
        text: c.count === 1 ? `Lo recomienda @${c.users[0]}` : `Lo recomiendan ${c.count} que seguís`,
      });
    }

    if (kinds.has(a.kind) && KIND_WHY[a.kind]) bump(1, { icon: SECTOR[a.tags[0]].icon, text: KIND_WHY[a.kind] });
    if (score <= 0) continue;

    const asCedear = preferCedear && a.cedear;
    out.push({
      ...a,
      symbol: asCedear ? a.cedear : a.symbol,
      kind: asCedear ? "cedear" : a.kind,
      base: a.symbol,
      score: score - a.rank / 1000, // desempate: lo más operado primero
      reason,
    });
  }
  // variedad: no más de 2 con el mismo motivo arriba de todo; después se completa
  const sorted = out.sort((x, y) => y.score - x.score);
  const picked = [];
  const per = {};
  for (const r of sorted) {
    const k = r.reason?.text || "";
    if ((per[k] || 0) >= 2) continue;
    per[k] = (per[k] || 0) + 1;
    picked.push(r);
    if (picked.length === limit) return picked;
  }
  return [...picked, ...sorted.filter((r) => !picked.includes(r))].slice(0, limit);
}
