# Valeur

**Valeur** es una plataforma web para seguir el mercado de acciones de forma simple, social y accesible. Permite consultar precios en tiempo real, explorar gráficos de velas con histórico completo, buscar activos y gestionar una cuenta de usuario con registro e inicio de sesión.

---

## Funcionalidades

- **Consulta de precios en tiempo real** — cotizaciones (precio, variación diaria, volumen) vía Yahoo Finance.
- **Gráficos de velas japonesas** estilo TradingView — histórico completo (hasta ~20 años), scroll y zoom, con tooltip de fecha y cambio día a día.
- **Búsqueda de activos** — desde la barra del navbar o la página dedicada, te lleva directo al gráfico del ticker.
- **Cuentas de usuario** — registro e inicio de sesión con [Supabase Auth](https://supabase.com/auth) (email + contraseña).
- **Base de datos Postgres (Supabase)** — perfiles de usuario con Row Level Security.
- **Modo claro / oscuro** en toda la app.

---

## Stack

| Capa     | Tecnología |
|----------|------------|
| Frontend | React 19 + Vite, React Router, [lightweight-charts](https://github.com/tradingview/lightweight-charts) |
| Auth + DB | Supabase (Auth, Postgres con RLS) |
| Mercado  | Python 3.9 + Flask, yfinance (micro-servicio de datos) |

---

## Estructura

```
Valeur/
├── Valeur/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/  # Navbar, CandleChart, secciones del landing
│   │   ├── pages/       # Landing, Login, Register, Dashboard, Tickersearch
│   │   ├── context/     # ThemeContext (tema) y AuthContext (Supabase Auth)
│   │   ├── lib/         # Cliente de Supabase, helpers
│   │   └── App.jsx      # Rutas
│   ├── .env.example     # Keys de Supabase + URL del backend de mercado
│   └── package.json
│
├── supabase/
│   └── migrations/      # SQL para la base (tabla profiles, RLS, triggers)
│
└── valeur-backend/      # Micro-servicio de mercado (Flask + yfinance)
    ├── backend.py       # API: candles, quote, search
    ├── requirements.txt
    └── .env.example
```

---

## Puesta en marcha

### Requisitos previos
- Node.js 18+
- Python 3.9+
- Un proyecto en [supabase.com](https://supabase.com) (plan gratuito alcanza)

### 1. Supabase (auth + base de datos)

1. Creá un proyecto en Supabase.
2. En **SQL Editor**, pegá y ejecutá `supabase/migrations/0001_profiles.sql`. Crea la tabla `profiles`, sus políticas RLS y el trigger que da de alta el perfil al registrarse.
3. En **Authentication → Providers → Email** dejá habilitado *Email*. Si desactivás *Confirm email*, el registro inicia sesión al instante; si lo dejás activo, el usuario recibe un mail y la app le avisa que lo confirme.
4. Copiá la **Project URL** y la **anon public key** de *Project Settings → API*: van en el `.env` del frontend (paso 3).

### 2. Backend de mercado

```bash
cd valeur-backend

# Variables de entorno (opcional: solo CORS)
cp .env.example .env

# Entorno virtual + dependencias
python3 -m venv venv
venv\Scripts\activate        # MacOS: source venv/bin/activate  
pip install -r requirements.txt

# Levantar la API (http://localhost:5001)
python backend.py
```

Variables del `.env` del backend:

| Variable       | Descripción                                              |
|----------------|----------------------------------------------------------|
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma (default `http://localhost:5173`) |

### 3. Frontend

```bash
cd Valeur
cp .env.example .env               # completá con la URL y anon key de Supabase
npm install
npm run dev                        # http://localhost:5173
```

Variables del `.env` del frontend:

| Variable                 | Descripción                                        |
|--------------------------|----------------------------------------------------|
| `VITE_SUPABASE_URL`      | Project URL de Supabase                            |
| `VITE_SUPABASE_ANON_KEY` | anon public key (la protege el RLS, no es secreta) |
| `VITE_MARKET_API`        | URL del backend de mercado (default `http://localhost:5001/api`) |

Abrí **http://localhost:5173** en el navegador. Sin las keys de Supabase la app carga igual, pero login y registro muestran un aviso.

---

## API de mercado (Flask)

Auth y perfiles no pasan por acá: el frontend habla directo con Supabase.

| Método | Endpoint                              | Descripción |
|--------|---------------------------------------|-------------|
| `GET`  | `/api/candles/<symbol>?interval=&range=` | Velas OHLCV |
| `GET`  | `/api/quote/<symbol>`                 | Cotización: precio, variación, volumen |
| `GET`  | `/api/search?q=`                      | Búsqueda de tickers |
| `GET`  | `/api/health`                         | Estado del servicio |

---

## Scripts (frontend)

| Comando           | Acción                          |
|-------------------|---------------------------------|
| `npm run dev`     | Servidor de desarrollo          |
| `npm run build`   | Build de producción             |
| `npm run preview` | Previsualizar el build          |
| `npm run lint`    | Linter (ESLint)                 |

---

## Notas

- Los datos de mercado provienen de Yahoo Finance a través de `yfinance`.
- Los `.env` no se versionan (están en `.gitignore`). Usá los `.env.example` como plantilla.
- La tabla `profiles` guarda solo el `username`; el email y la contraseña los maneja Supabase Auth. Los usuarios del viejo MySQL (`Valeur.sql`) no migran: los hashes de bcrypt no se importan a Supabase, hay que volver a registrarse.
- El resumen de portfolio del Dashboard usa datos de ejemplo (próximo paso: persistir posiciones reales en la base).

---

Proyecto desarrollado como MVP - Desarrollo de Sistemas 2026 - AGUILAR, BORASSI, SERALVO. 
