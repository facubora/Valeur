import { useState } from "react";
import { assetKind } from "../lib/market";

/* Bandera para pares de monedas: la del "otro" lado del dólar (o la base) */
const FX_FLAG = { ARS: "ar", BRL: "br", MXN: "mx", CLP: "cl", COP: "co", PEN: "pe", UYU: "uy",
  EUR: "eu", GBP: "gb", JPY: "jp", CNY: "cn", CAD: "ca", AUD: "au", CHF: "ch", USD: "us" };
/* Índices: sigla corta para el badge */
const INDEX_TAG = { "^GSPC": "S&P", "^IXIC": "NDQ", "^DJI": "DJI", "^MERV": "MERV", "^NYA": "NYSE" };

function sources(symbol) {
  const s = symbol.toUpperCase();
  switch (assetKind(s)) {
    case "cedear":
    case "cedear-usd": {
      const u = s.replace(/\.BA$/, "").replace(/D$/, (m) => (assetKind(s) === "cedear-usd" ? "" : m));
      return [`https://assets.parqet.com/logos/symbol/${u}?format=png`, `https://financialmodelingprep.com/image-stock/${u}.png`];
    }
    case "crypto": {
      const c = s.split("-")[0];
      return [`https://assets.parqet.com/logos/crypto/${c}?format=png`, `https://financialmodelingprep.com/image-stock/${c}USD.png`];
    }
    case "fx": {
      const pair = s.replace(/=X$/, "");
      const base = pair.slice(0, 3);
      const quote = pair.slice(3, 6);
      const cc = FX_FLAG[base === "USD" ? quote : base];
      return cc ? [`https://flagcdn.com/w80/${cc}.png`] : [];
    }
    case "index":
      return [];
    default:
      return [`https://assets.parqet.com/logos/symbol/${s}?format=png`, `https://financialmodelingprep.com/image-stock/${s}.png`];
  }
}

/* Logo de un activo con fallback en cadena → badge con el ticker */
export default function Logo({ symbol, size = 40, className = "" }) {
  const [i, setI] = useState(0);
  const list = sources(symbol);
  const kind = assetKind(symbol);
  const src = list[i];
  const style = { width: size, height: size };

  if (!src) {
    const tag = INDEX_TAG[symbol.toUpperCase()] || symbol.replace(/[.=^-].*$/, "").slice(0, 4);
    return (
      <span className={`logo badge ${kind} ${className}`} style={style} aria-hidden="true">
        {tag}
      </span>
    );
  }
  return (
    <span className={`logo ${kind} ${className}`} style={style} aria-hidden="true">
      <img src={src} alt="" loading="lazy" onError={() => setI((n) => n + 1)} />
    </span>
  );
}
