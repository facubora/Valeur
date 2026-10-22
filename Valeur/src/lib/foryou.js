import { useMemo, useState } from "react";
import { recommend } from "./catalog";
import { communitySignal } from "./social";

/* Lista guardada en este navegador (recientes, recomendaciones descartadas) */
export function useStoredList(key, fallback = []) {
  const [list, setList] = useState(() => {
    try {
      const r = JSON.parse(localStorage.getItem(key));
      return Array.isArray(r) ? r : fallback;
    } catch {
      return fallback;
    }
  });
  const save = (next) => {
    setList(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* sin storage, queda en memoria */
    }
  };
  return [list, save];
}

/* Recomendaciones "Para vos" a partir de lo que ya cargó la pantalla:
   rubros del perfil, seguidos, operaciones y posts de la gente que seguís.
   → { recs, interests, hidden, hide(base), unhideAll() } */
export function useForYou({ uid, profile, watchRows, tradeRows, posts, limit = 6 }) {
  const [hidden, setHidden] = useStoredList("valeur-recs-hidden");
  const interests = useMemo(() => profile?.interests || [], [profile]);
  const community = useMemo(() => communitySignal(posts, uid), [posts, uid]);
  const recs = useMemo(
    () =>
      recommend({
        interests,
        watched: watchRows.map((w) => w.symbol),
        held: [...new Set(tradeRows.map((t) => t.symbol))],
        community,
        hidden,
        limit,
      }),
    [interests, watchRows, tradeRows, community, hidden, limit],
  );
  return {
    recs,
    interests,
    hidden,
    hide: (base) => setHidden([...hidden, base]),
    unhideAll: () => setHidden([]),
  };
}
