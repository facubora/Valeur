# Valeur

**Valeur** es una plataforma web para seguir el mercado de acciones de forma simple, social y accesible. Permite consultar precios en tiempo real, explorar gráficos de velas con histórico completo, buscar activos y gestionar una cuenta de usuario con registro e inicio de sesión.

---

## Funcionalidades

- **Consulta de precios en tiempo real** — cotizaciones (precio, variación diaria, volumen) vía Yahoo Finance.
- **Gráficos de velas japonesas** estilo TradingView — histórico completo (hasta ~20 años), scroll y zoom, con tooltip de fecha y cambio día a día.
- **Búsqueda de activos** — desde la barra del navbar o la página dedicada, te lleva directo al gráfico del ticker.
- **Cuentas de usuario** — registro e inicio de sesión con contraseñas hasheadas (bcrypt) y autenticación por JWT.
- **Base de datos MySQL** — persistencia de usuarios. Posteriormente será actualizada a Supabase. 
- **Modo claro / oscuro** en toda la app.

---

## Stack

| Capa     | Tecnología |
|----------|------------|
| Frontend | React 19 + Vite, React Router, [lightweight-charts](https://github.com/tradingview/lightweight-charts) |
| Backend  | Python 3.9 + Flask, yfinance, PyJWT, bcrypt |
| Base de datos | MySQL |

---

## Estructura

```
Valeur/
├── Valeur/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/  # Navbar, CandleChart, secciones del landing
│   │   ├── pages/       # Login, Register, Dashboard, Tickersearch
│   │   ├── context/     # ThemeContext (modo claro/oscuro)
│   │   └── App.jsx      # Rutas
│   └── package.json
│
└── valeur-backend/      # Backend (Flask)
    ├── backend.py       # API: auth + datos de mercado
    ├── schema.sql       # Esquema de la base de datos
    ├── requirements.txt
    └── .env.example     # Plantilla de variables de entorno
```

---

## Puesta en marcha

### Requisitos previos
- Node.js 18+
- Python 3.9+
- MySQL en ejecución

### 1. Base de datos

Creá la base y la tabla ejecutando el esquema (desde MySQL Workbench o por consola):

```bash
mysql -u root -p < valeur-backend/schema.sql
```

Esto crea la base `valeur` con la tabla `users`.

### 2. Backend

```bash
cd valeur-backend

# Variables de entorno
cp .env.example .env
# Editá .env con tu password de MySQL y un JWT_SECRET largo

# Entorno virtual + dependencias
python3 -m venv venv
venv\Scripts\activate        # MacOS: source venv/bin/activate  
pip install -r requirements.txt

# Levantar la API (http://localhost:5001)
python backend.py
```

Variables del `.env`:

| Variable      | Descripción                          |
|---------------|--------------------------------------|
| `DB_HOST`     | Host de MySQL (ej. `localhost`)      |
| `DB_PORT`     | Puerto de MySQL (ej. `3306`)         |
| `DB_USER`     | Usuario de MySQL                     |
| `DB_PASSWORD` | Contraseña de MySQL                  |
| `DB_NAME`     | Nombre de la base (`valeur`)         |
| `JWT_SECRET`  | Clave secreta para firmar los tokens |

### 3. Frontend

```bash
cd Valeur
npm install
npm run dev                        # http://localhost:5173
```

Abrí **http://localhost:5173** en el navegador. El frontend espera el backend corriendo en `localhost:5001`.

---

## API

| Método | Endpoint                              | Descripción |
|--------|---------------------------------------|-------------|
| `POST` | `/api/auth/register`                  | Registro `{ username, email, password }` → devuelve JWT |
| `POST` | `/api/auth/login`                     | Login `{ email, password }` → devuelve JWT |
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
- El `.env` no se versiona (está en `.gitignore`). Usá `.env.example` como plantilla.
- El resumen de portfolio del Dashboard usa datos de ejemplo (próximo paso: persistir posiciones reales en la base).

---

Proyecto desarrollado como MVP - Desarrollo de Sistemas 2026 - AGUILAR, BORASSI, SERALVO. 
