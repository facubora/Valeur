# valeur/demo.py — Datos de ejemplo para mostrar Valeur con vida: usuarios con
# recomendaciones, seguidores, "me sirve" y jugadores en el modo práctica.
#
#   python demo.py cargar [--usuario TU_USUARIO] [--amigos]
#   python demo.py borrar
#   python demo.py prueba        (muestra qué haría, sin tocar nada)
#
# Con --usuario, los de ejemplo te siguen; con --amigos, además vos los seguís
# a algunos (así aparecen como amigos y en el ranking de amigos).
# Los usuarios de ejemplo tienen mail @demo.valeur.test y "demo" en su
# metadata: borrar saca solo esos (y con ellos, todo lo suyo).

import secrets
import sys
from datetime import datetime, timedelta, timezone

import requests

import supa
from alerts import asset_kind

DOMAIN = "demo.valeur.test"

PEOPLE = [
    # username, nombre, bio, visibilidad, verificado
    ("ana_inversiones", "Ana Pereyra", "Analista de equity LatAm. Opiniones personales.", "public", "Analista"),
    ("juan_cruz", "Juan Cruz", "Largo plazo y CEDEARs. Poco ruido.", "public", None),
    ("sofi_m", "Sofía M.", "Aprendiendo a invertir con lo que sobra del mes.", "friends", None),
    ("martu_cedears", "Martina R.", "Tecnología y energía. Compro de a poco.", "public", None),
    ("leo_trader", "Leo G.", "Corto plazo, stops siempre.", "public", None),
    ("cami_crypto", "Camila V.", "Cripto y fintech. Hago videos explicando.", "public", "Creador de contenido"),
]

# quién, activo, postura, texto, hace cuántos días
POSTS = [
    ("ana_inversiones", "NVDA", "buy", "Data center sigue explotando y la guía vino arriba. La valuación no es barata, pero el crecimiento la banca.", 26),
    ("ana_inversiones", "MELI.BA", "hold", "Excelente negocio, pero ya corrió mucho. Mantengo, no sumo hasta un retroceso.", 18),
    ("juan_cruz", "KO.BA", "buy", "Defensiva para cuando el mercado se pone nervioso. Dividendos y paciencia.", 22),
    ("sofi_m", "AAPL.BA", "buy", "Mi primera compra: de a poco y para el largo plazo.", 15),
    ("martu_cedears", "VIST", "buy", "Vaca Muerta tiene para rato y la producción sigue subiendo trimestre a trimestre.", 20),
    ("leo_trader", "TSLA", "sell", "Márgenes cayendo y mucha competencia en China. Tomo ganancia.", 12),
    ("cami_crypto", "BTC-USD", "buy", "Para mí sigue siendo la reserva de valor del mundo cripto. Compra mensual.", 9),
    ("cami_crypto", "GGAL.BA", "hold", "Bancos argentinos ya descontaron mucho. Mantengo y espero.", 5),
]

# quién sigue a quién (los mutuos son amigos)
FOLLOWS = [
    ("juan_cruz", "ana_inversiones"), ("ana_inversiones", "juan_cruz"),
    ("sofi_m", "ana_inversiones"), ("sofi_m", "cami_crypto"), ("cami_crypto", "sofi_m"),
    ("martu_cedears", "ana_inversiones"), ("leo_trader", "martu_cedears"), ("martu_cedears", "leo_trader"),
    ("cami_crypto", "ana_inversiones"), ("juan_cruz", "leo_trader"),
]

# modo práctica: quién compró qué y cuántos dólares, hace unas semanas
PRACTICE = {
    "ana_inversiones": [("NVDA", 4000), ("MELI.BA", 3000), ("SPY", 2000)],
    "juan_cruz": [("KO.BA", 3000), ("SPY", 5000)],
    "sofi_m": [("AAPL.BA", 2500), ("BTC-USD", 1500)],
    "martu_cedears": [("VIST", 4000), ("YPFD.BA", 3000), ("NVDA", 2000)],
    "leo_trader": [("TSLA", 6000), ("GGAL.BA", 3500)],
    "cami_crypto": [("BTC-USD", 5000), ("ETH-USD", 3000), ("SOL-USD", 1500)],
}


def _admin(method, path, json=None):
    headers = supa._headers()
    headers["Authorization"] = "Bearer " + supa.SERVICE_KEY
    r = requests.request(method, f"{supa.SUPABASE_URL}/auth/v1/admin/{path}", json=json, headers=headers, timeout=20)
    r.raise_for_status()
    return r.json() if r.content else None


def _ago(days):
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def demo_users():
    """Los usuarios de ejemplo que ya existen (id por username)"""
    out, page = {}, 1
    while True:
        data = _admin("GET", f"users?page={page}&per_page=200")
        users = data.get("users", data) if isinstance(data, dict) else data
        for u in users or []:
            if (u.get("email") or "").endswith("@" + DOMAIN):
                out[(u.get("user_metadata") or {}).get("username")] = u["id"]
        if not users or len(users) < 200:
            return out
        page += 1


def prices():
    """Precio de hace ~un mes y de ahora de todo lo que se usa"""
    from backend import fetch_quotes, mep_data

    symbols = sorted({s for _, s, *_ in POSTS} | {s for buys in PRACTICE.values() for s, _ in buys})
    quotes = fetch_quotes(symbols)
    rate = (mep_data() or {}).get("rate")
    missing = [s for s in symbols if not quotes.get(s)]
    if missing:
        print("  sin precio (se saltean):", ", ".join(missing))
    return quotes, rate


def _usd(symbol, price, rate):
    # la misma regla que el backend: YPFD.BA es YPF en pesos, AAPLD.BA es Apple en dólares
    kind = asset_kind(symbol)
    ars = kind == "cedear" or (kind == "crypto" and symbol.endswith("-ARS"))
    return price / rate if ars else price


def cargar(usuario=None, amigos=False, dry=False):
    if not supa.configured():
        sys.exit("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env")
    quotes, rate = prices()
    if not rate:
        sys.exit("No se pudo calcular el dólar MEP; probá en un rato")
    me = None
    if usuario:
        rows = supa.rest("GET", "profiles", params={"username": "ilike." + usuario, "select": "id,username"}) or []
        if not rows:
            sys.exit(f"No existe el usuario @{usuario}")
        me = rows[0]["id"]

    print(f"Usuarios: {len(PEOPLE)} · recomendaciones: {len(POSTS)} · seguimientos: {len(FOLLOWS)} · jugadores: {len(PRACTICE)}")
    if dry:
        for who, buys in PRACTICE.items():
            parts = [f"{s} US$ {a}" for s, a in buys if quotes.get(s)]
            print(f"  {who}: {', '.join(parts)}")
        return

    ids = demo_users()
    for username, name, bio, vis, verified in PEOPLE:
        if username not in ids:
            u = _admin("POST", "users", {
                "email": f"{username}@{DOMAIN}",
                "password": secrets.token_urlsafe(18),
                "email_confirm": True,
                "user_metadata": {"username": username, "demo": True},
            })
            ids[username] = u["id"]
        supa.rest("PATCH", "profiles", params={"id": "eq." + ids[username]}, json={
            "display_name": name, "bio": bio, "visibility": vis,
            "verified": bool(verified), "verified_label": verified,
        }, prefer="return=minimal")
    print("  usuarios listos")

    posts = []
    for who, sym, stance, body, days in POSTS:
        q = quotes.get(sym)
        if not q:
            continue
        posts.append({
            "user_id": ids[who], "symbol": sym, "stance": stance, "body": body,
            "price_at": q["closes"][0] if q.get("closes") else q["price"],
            "audience": "public", "created_at": _ago(days),
        })
    # se vuelven a cargar de cero (si se corre dos veces no se duplican)
    supa.rest("DELETE", "posts", params={"user_id": "in.(" + ",".join(ids.values()) + ")"}, prefer="return=minimal")
    made = supa.rest("POST", "posts", json=posts, prefer="return=representation") or []
    print(f"  {len(made)} recomendaciones")

    # "me sirve": cada recomendación le sirvió a algunos de los otros
    likes = []
    for i, p in enumerate(made):
        others = [v for v in ids.values() if v != p["user_id"]]
        for v in others[: 1 + (i * 3) % len(others)]:
            likes.append({"post_id": p["id"], "user_id": v})
    if likes:
        supa.rest("POST", "post_likes", json=likes, prefer="return=minimal,resolution=ignore-duplicates")
    print(f"  {len(likes)} me sirve")

    follows = [{"follower_id": ids[a], "followee_id": ids[b]} for a, b in FOLLOWS]
    if me:
        follows += [{"follower_id": v, "followee_id": me} for v in ids.values()]
        if amigos:
            follows += [{"follower_id": me, "followee_id": ids[u]} for u in ("ana_inversiones", "cami_crypto", "juan_cruz")]
    supa.rest("POST", "follows", json=follows, prefer="return=minimal,resolution=ignore-duplicates")
    print(f"  {len(follows)} seguimientos" + (f" (te siguen los {len(ids)})" if me else ""))

    # modo práctica: compraron hace ~4 semanas al precio de ese momento
    for who, buys in PRACTICE.items():
        uid = ids[who]
        supa.rest("DELETE", "practice_trades", params={"user_id": "eq." + uid}, prefer="return=minimal")
        cash, trades = 10000.0, []
        for sym, amount in buys:
            q = quotes.get(sym)
            if not q:
                continue
            then = q["closes"][0] if q.get("closes") else q["price"]
            p_usd = _usd(sym, then, rate)
            qty = round(amount / p_usd, 8)
            cash -= qty * p_usd
            trades.append({"user_id": uid, "symbol": sym, "side": "buy", "qty": qty, "price": then, "price_usd": round(p_usd, 6), "created_at": _ago(27)})
        supa.rest("POST", "practice_accounts", json={"user_id": uid, "cash": round(cash, 4), "started_at": _ago(28)}, prefer="return=minimal,resolution=merge-duplicates")
        if trades:
            supa.rest("POST", "practice_trades", json=trades, prefer="return=minimal")
    print(f"  {len(PRACTICE)} jugadores en el modo práctica")
    print("Listo. Para sacarlo: python demo.py borrar")


def borrar():
    if not supa.configured():
        sys.exit("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env")
    ids = demo_users()
    for uid in ids.values():
        _admin("DELETE", f"users/{uid}")
    print(f"Borrados {len(ids)} usuarios de ejemplo (y todo lo suyo).")


if __name__ == "__main__":
    args = sys.argv[1:]
    cmd = args[0] if args else ""
    usuario = args[args.index("--usuario") + 1] if "--usuario" in args and args.index("--usuario") + 1 < len(args) else None
    if cmd == "cargar":
        cargar(usuario, amigos="--amigos" in args)
    elif cmd == "prueba":
        cargar(usuario, dry=True)
    elif cmd == "borrar":
        borrar()
    else:
        print(__doc__ if __doc__ else "python demo.py cargar|borrar|prueba [--usuario U] [--amigos]")
        print("Uso: python demo.py cargar [--usuario TU_USUARIO] [--amigos] | borrar | prueba")
