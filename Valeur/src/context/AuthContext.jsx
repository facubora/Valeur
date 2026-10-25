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
  if (/should be different from the old/i.test(m)) return "Tiene que ser distinta de la anterior";
  if (/reauthenticat/i.test(m)) return "Por seguridad, salí y volvé a entrar antes de cambiarla";
  if (/auth session missing|session.*expired|invalid.*(token|grant)/i.test(m)) return "El enlace venció. Pedí uno nuevo";
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
    // con * anda aunque falte alguna columna nueva (is_admin viene de la 0005)
    supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data, error }) => alive && setProfile(data || (error ? { id: uid, failed: true } : null)));
    return () => {
      alive = false;
    };
  }, [uid]);

  const user = session
    ? {
        id: uid,
        email: session.user.email,
        username:
          (profile && profile.id === uid && profile.username) ||
          session.user.user_metadata?.username ||
          session.user.email.split("@")[0],
        currency: session.user.user_metadata?.currency || null,
        // null mientras no se sabe (todavía carga el perfil)
        isAdmin: profile && profile.id === uid ? Boolean(profile.is_admin) : null,
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

  // Recuperar la contraseña: manda el mail con el enlace que vuelve a /nueva-clave
  const resetPassword = async (email) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/nueva-clave",
    });
    return { error: translate(error) };
  };

  const updatePassword = async (password) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: translate(error) };
  };

  // Cambiarla estando adentro: primero se comprueba la actual
  const changePassword = async (current, next) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error: wrong } = await supabase.auth.signInWithPassword({ email: session.user.email, password: current });
    if (wrong) return { error: /invalid login credentials/i.test(wrong.message) ? "La contraseña actual no es correcta" : translate(wrong) };
    const { error } = await supabase.auth.updateUser({ password: next });
    return { error: translate(error) };
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
        resetPassword,
        updatePassword,
        changePassword,
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
