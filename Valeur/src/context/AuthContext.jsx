import { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";

const AuthContext = createContext(null);

const NOT_CONFIGURED =
  "Falta configurar Supabase: copiá Valeur/.env.example a .env y completá las keys.";

/* Mensajes de Supabase → español */
function translate(error) {
  if (!error) return "";
  const m = error.message || "";
  if (/invalid login credentials/i.test(m)) return "Email o contraseña incorrectos";
  if (/email not confirmed/i.test(m)) return "Confirmá tu email antes de ingresar";
  if (/already registered|already been registered/i.test(m)) return "Ese email ya está registrado";
  if (/password should be at least/i.test(m)) return "La contraseña es demasiado corta";
  if (/unable to validate email|invalid email/i.test(m)) return "El email no es válido";
  if (/rate limit|too many requests/i.test(m)) return "Demasiados intentos, probá en un rato";
  if (/failed to fetch|network/i.test(m)) return "No se pudo conectar con Supabase";
  return m || "Algo salió mal";
}

export function AuthProvider({ children }) {
  // undefined = todavía no sabemos si hay sesión (evita redirigir de más)
  const [session, setSession] = useState(supabaseConfigured ? undefined : null);
  const [profile, setProfile] = useState(null);

  // Sesión inicial + cambios (login, logout, refresh de token, otra pestaña)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Perfil (username) del usuario logueado
  const uid = session?.user?.id;
  useEffect(() => {
    if (!supabase || !uid) return;
    let alive = true;
    supabase
      .from("profiles")
      .select("id, username")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => alive && data && setProfile(data));
    return () => {
      alive = false;
    };
  }, [uid]);

  const user = session
    ? {
        id: uid,
        email: session.user.email,
        username:
          (profile?.id === uid && profile.username) ||
          session.user.user_metadata?.username ||
          session.user.email.split("@")[0],
      }
    : null;

  const signIn = async (email, password) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: translate(error) };
  };

  const signUp = async ({ username, email, password }) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { data: free, error: rpcErr } = await supabase.rpc("username_available", {
      candidate: username,
    });
    if (rpcErr) return { error: translate(rpcErr) };
    if (!free) return { error: "Ese nombre de usuario ya está en uso" };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return { error: translate(error) };
    // Con "Confirm email" activado en Supabase no hay sesión hasta confirmar
    return { error: "", needsConfirmation: !data.session };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: session === undefined,
        configured: supabaseConfigured,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
