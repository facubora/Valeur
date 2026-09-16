import { useState } from "react";
import { useSuggestions } from "../lib/market";

/* Buscador compacto de tickers con sugerencias. onPick({ symbol, name }) */
export default function SymbolSearch({ onPick, placeholder = "Buscar activo…", autoFocus = false }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const suggestions = useSuggestions(q);
  const open = focus && suggestions.length > 0;

  const pick = (s) => {
    onPick({ symbol: s.symbol.toUpperCase(), name: s.name || null });
    setQ("");
    setCursor(-1);
  };

  const onKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (cursor >= 0 && suggestions[cursor]) pick(suggestions[cursor]);
      else if (q.trim()) pick({ symbol: q.trim(), name: null });
    } else if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setCursor((c) => (c + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setCursor((c) => (c <= 0 ? suggestions.length - 1 : c - 1));
    } else if (e.key === "Escape") {
      setFocus(false);
    }
  };

  return (
    <div className="search-form compact">
      <i className="bi bi-search ico" aria-hidden="true" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value.toUpperCase());
          setCursor(-1);
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 120)}
        onKeyDown={onKey}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
      />
      {open && (
        <ul className="suggest" role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={s.symbol}
              role="option"
              aria-selected={i === cursor}
              className={i === cursor ? "on" : ""}
              onMouseDown={() => pick(s)}
              onMouseEnter={() => setCursor(i)}
            >
              <div>
                <b>{s.symbol}</b>
                <span>{s.name}</span>
              </div>
              {s.type && <small>{s.type}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
