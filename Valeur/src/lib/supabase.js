import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* true si faltan las keys: la app muestra un aviso en vez de romper */
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey)
  : null;

/* URL del backend de mercado (Flask + yfinance) */
export const MARKET_API =
  import.meta.env.VITE_MARKET_API || "http://localhost:5001/api";
