import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CandleChart from "../components/CandleChart";

const MOCK_PORTFOLIO = [
  { symbol: "AAPL",  name: "Apple Inc.",      value: 4820.50,  change_pct:  2.14, shares: 28 },
  { symbol: "NVDA",  name: "NVIDIA Corp.",     value: 3210.00,  change_pct:  5.82, shares: 6  },
  { symbol: "MSFT",  name: "Microsoft Corp.",  value: 2940.75,  change_pct: -0.43, shares: 7  },
  { symbol: "TSLA",  name: "Tesla Inc.",       value: 1380.20,  change_pct: -1.97, shares: 9  },
];

const TOTAL_VALUE   = MOCK_PORTFOLIO.reduce((s, a) => s + a.value, 0);
const TOTAL_CHANGE  = 1.84;

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { navigate("/login"); return; }
    setUser(JSON.parse(stored));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="dash-page">

      {/* Topbar */}
      <header className="dash-topbar">
        <a href="/" className="auth-logo" style={{ marginBottom: 0 }}>Valeur<span>.</span></a>
        <div className="dash-topbar-right">
          <span className="dash-username">@{user.username}</span>
          <button className="dash-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>

      <main className="dash-main">

        {/* Saludo */}
        <section className="dash-greeting">
          <h1>{greeting}, <em>{user.username}</em>.</h1>
          <p>Acá está el resumen de tu portfolio de hoy.</p>
        </section>

        {/* Portfolio summary */}
        <section className="dash-summary">
          <div className="dash-summary-card main-card">
            <span className="summary-label">Valor total</span>
            <strong className="summary-value">${TOTAL_VALUE.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>
            <span className={`summary-badge ${TOTAL_CHANGE >= 0 ? "badge-up" : "badge-down"}`}>
              {TOTAL_CHANGE >= 0 ? "▲" : "▼"} {Math.abs(TOTAL_CHANGE).toFixed(2)}% hoy
            </span>
          </div>

          <div className="dash-summary-card">
            <span className="summary-label">Activos</span>
            <strong className="summary-value">{MOCK_PORTFOLIO.length}</strong>
            <span className="summary-sub">posiciones abiertas</span>
          </div>

          <div className="dash-summary-card">
            <span className="summary-label">Mejor hoy</span>
            <strong className="summary-value">NVDA</strong>
            <span className="summary-badge badge-up">▲ 5.82%</span>
          </div>

          <div className="dash-summary-card">
            <span className="summary-label">Peor hoy</span>
            <strong className="summary-value">TSLA</strong>
            <span className="summary-badge badge-down">▼ 1.97%</span>
          </div>
        </section>


        {/* Posiciones */}
        <section className="dash-positions">
          <h2 className="dash-section-title">Mis posiciones</h2>
          <div className="positions-list">
            {MOCK_PORTFOLIO.map((asset) => {
              const isUp = asset.change_pct >= 0;
              return (
                <div key={asset.symbol} className="position-row">
                  <div className="position-symbol">
                    <strong>{asset.symbol}</strong>
                    <span>{asset.name}</span>
                  </div>
                  <div className="position-shares">{asset.shares} acciones</div>
                  <div className="position-value">${asset.value.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</div>
                  <div className={`position-change ${isUp ? "change-up" : "change-down"}`}>
                    {isUp ? "▲" : "▼"} {Math.abs(asset.change_pct).toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Gráfico */}
        <section className="dash-chart">
          <h2 className="dash-section-title">Explorar mercado</h2>
          <CandleChart />
        </section>

      </main>
    </div>
  );
}
