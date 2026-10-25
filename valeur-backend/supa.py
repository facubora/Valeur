# valeur/supa.py — Acceso a Supabase desde el backend (PostgREST y Auth) con la
# service role key, que salta el RLS: solo vive en el .env del backend.

import os

import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""


def configured():
    return bool(SUPABASE_URL and SERVICE_KEY)


def _headers(prefer=None):
    # las keys nuevas (sb_secret_…) van solo en apikey; las viejas (JWT) también en Authorization
    headers = {"apikey": SERVICE_KEY}
    if SERVICE_KEY.startswith("eyJ"):
        headers["Authorization"] = "Bearer " + SERVICE_KEY
    if prefer:
        headers["Prefer"] = prefer
    return headers


def rest(method, table, params=None, json=None, prefer=None):
    r = requests.request(method, f"{SUPABASE_URL}/rest/v1/{table}", params=params, json=json, headers=_headers(prefer), timeout=20)
    r.raise_for_status()
    return r.json() if r.content else None


def rpc(name, args=None):
    """Llama una función de la base. Si falla, levanta RpcError con el
    código y el mensaje de Postgres (para traducirlos)."""
    r = requests.post(f"{SUPABASE_URL}/rest/v1/rpc/{name}", json=args or {}, headers=_headers(), timeout=20)
    if r.status_code >= 400:
        try:
            body = r.json()
        except ValueError:
            body = {}
        raise RpcError(body.get("code") or str(r.status_code), body.get("message") or r.text)
    return r.json() if r.content else None


class RpcError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def user_from_token(token):
    """El id del usuario dueño de un access token de Supabase (o None)"""
    if not token:
        return None
    r = requests.get(f"{SUPABASE_URL}/auth/v1/user", headers={"apikey": SERVICE_KEY, "Authorization": "Bearer " + token}, timeout=10)
    return r.json().get("id") if r.ok else None
