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
