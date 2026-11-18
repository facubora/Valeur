import { useEffect, useLayoutEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import NewPassword from "./pages/NewPassword";
import Dashboard from "./pages/Dashboard";
import Tickersearch from "./pages/Tickersearch";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Simulator from "./pages/Simulator";
import Learn from "./pages/Learn";
import Calendar from "./pages/Calendar";

/* Dónde estaba cada pantalla del historial, para volver ahí con "atrás" */
const positions = new Map();

/* El scroll al navegar: un link nuevo arranca arriba (sin animación, así el
   contenido no sube de golpe); atrás/adelante vuelve a donde estabas, aunque
   la página tarde en cargar; un cambio de URL que no es navegación (replace
   en la misma ruta) no lo toca. Los links con #sección los resuelve AppShell. */
function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const nav = useNavigationType();
  const prevPath = useRef(pathname);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  // se va anotando la posición de la pantalla actual mientras se scrollea.
  // Justo al navegar se ignora: el navegador recorta el scroll al alto de la
  // página nueva y eso no es dónde estabas en la anterior.
  const current = useRef(key);
  const quietUntil = useRef(0);
  useEffect(() => {
    const save = () => {
      if (performance.now() > quietUntil.current) positions.set(current.current, window.scrollY);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, []);

  useLayoutEffect(() => {
    const samePage = prevPath.current === pathname;
    prevPath.current = pathname;
    current.current = key;
    quietUntil.current = performance.now() + 200;
    if (nav === "REPLACE" && samePage) return;
    if (hash && nav !== "POP") return;
    const y = nav === "POP" ? positions.get(key) ?? 0 : 0;
    window.scrollTo({ top: y, behavior: "instant" });
    if (!y) return;
    // la página puede estar cargando todavía: reintentar hasta llegar
    let tries = 0;
    const t = setInterval(() => {
      window.scrollTo({ top: y, behavior: "instant" });
      if (Math.abs(window.scrollY - y) < 2 || ++tries > 30) clearInterval(t);
    }, 50);
    return () => clearInterval(t);
  }, [key, pathname, hash, nav]);
  return null;
}

/* Si el enlace de "recuperar contraseña" cae en otra página (por ejemplo, si
   Supabase no tiene /nueva-clave entre las URLs permitidas y vuelve al
   inicio), igual se lleva a elegir la contraseña nueva */
function RecoveryRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/nueva-clave") navigate("/nueva-clave", { replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
  return null;
}

/* Rutas privadas: sin sesión, a entrar. Está acá una sola vez para que una
   pantalla nueva no quede abierta por olvidarse el chequeo adentro. Los
   permisos de verdad los pone la base (RLS): esto es para no mostrar la
   pantalla vacía. */
function Private({ children }) {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <RecoveryRedirect />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recuperar" element={<ForgotPassword />} />
        <Route path="/nueva-clave" element={<NewPassword />} />
        <Route path="/home" element={<Private><Home /></Private>} />
        <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
        <Route path="/tickersearch" element={<Tickersearch />} />
        <Route path="/comunidad" element={<Private><Community /></Private>} />
        <Route path="/u/:username" element={<Private><Profile /></Private>} />
        <Route path="/simulador" element={<Private><Simulator /></Private>} />
        <Route path="/aprende" element={<Learn />} />
        <Route path="/calendario" element={<Private><Calendar /></Private>} />
        <Route path="/admin" element={<Private><Admin /></Private>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
