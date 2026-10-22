import { useEffect, useLayoutEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Tickersearch from "./pages/Tickersearch";
import Community from "./pages/Community";
import Profile from "./pages/Profile";

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

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tickersearch" element={<Tickersearch />} />
        <Route path="/comunidad" element={<Community />} />
        <Route path="/u/:username" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
