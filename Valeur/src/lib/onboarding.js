/* Estado del arranque: activos sugeridos y flags guardados en el browser */
export const POPULAR = [
  ["AAPL", "Apple"],
  ["MSFT", "Microsoft"],
  ["NVDA", "NVIDIA"],
  ["TSLA", "Tesla"],
  ["AMZN", "Amazon"],
  ["GOOGL", "Alphabet"],
];

const MARKET_VISITED_KEY = "valeur-market-visited";

export function readFlag(key = MARKET_VISITED_KEY) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markMarketVisited() {
  try {
    localStorage.setItem(MARKET_VISITED_KEY, "1");
  } catch {
    /* sin storage */
  }
}
