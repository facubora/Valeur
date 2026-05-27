function FeaturesShowcase() {
  return (
    <section className="showcase-section" id="features">
      <div className="showcase-inner">
        <div className="showcase-heading">
          <h2>
            Una plataforma para <em>entender, </em>seguir y compartir tus inversiones.
          </h2>
        </div>

        <article className="showcase-row">
          <div className="showcase-text">
            <span>01</span>
            <h3>Seguí tus inversiones en tiempo real.</h3>
            <p>
              Visualizá el rendimiento de tus activos, cambios del mercado e historial de operaciones desde un solo lugar.
            </p>
          </div>

          <div className="showcase-visual">
            <div className="visual-card portfolio-card">
              <div className="portfolio-head">
                <div>
                  <span>Tu portfolio actual</span>
                  <strong>$128.573,69 ARS</strong>
                </div>
              </div>

              <div className="portfolio-chart minimal-chart">

                <div className="chart-badge">
                  +12.4%
                </div>

                <svg viewBox="0 0 320 140" preserveAspectRatio="none">

                  <defs>
                    <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(37,99,235,0.22)" />
                      <stop offset="100%" stopColor="rgba(37,99,235,0)" />
                    </linearGradient>
                  </defs>

                  {/* area */}
                  <path
                    d="
        M0 105
        L40 52
        L78 112
        L120 72
        L158 28
        L195 118
        L235 58
        L272 86
        L320 18
        L320 140
        L0 140
        Z
      "
                    fill="url(#lineFill)"
                  />

                  {/* line */}
                  <path
                    d="
        M0 105
        L40 52
        L78 112
        L120 72
        L158 28
        L195 118
        L235 58
        L272 86
        L320 18
      "
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* highlighted point */}
                  <circle cx="320" cy="18" r="7" fill="#2563EB" />

                  <circle
                    cx="320"
                    cy="18"
                    r="14"
                    fill="rgba(37,99,235,0.14)"
                  />

                </svg>
              </div>

              <div className="portfolio-assets">
                <div>
                  <span>Acciones</span>
                  <strong>42%</strong>
                </div>
                <div>
                  <span>Fondos</span>
                  <strong>35%</strong>
                </div>
                <div>
                  <span>Crypto</span>
                  <strong>23%</strong>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="showcase-row reverse">
          <div className="showcase-text">
            <span>02</span>
            <h3>Aprendé viendo cómo invierten otros.</h3>
            <p>
              Conectate con otras personas, descubrí estrategias y compartí actividad de forma pública o privada.
            </p>
          </div>

          <div className="showcase-visual">
            <div className="visual-card social-card">
              <div className="friend-line">ML invirtió en AAPL luego de máximos históricos</div>
              <div className="friend-line">LJ vendió NVDA por un supuesto quiebre cercano</div>
              <div className="friend-line">FB invirtió en AMD luego de la bajada pasada</div>
              <div className="friend-line">RS ganó +8.2% este mes</div>
            </div>
          </div>
        </article>

        <article className="showcase-row">
          <div className="showcase-text">
            <span>03</span>
            <h3>Recibí noticias sobre tu portfolio.</h3>
            <p>
              Valeur analiza tus inversiones, actividad y portfolio actual para darte las noticias de mayor interés.
            </p>
          </div>

          <div className="showcase-visual">
            <div className="visual-card recommend-card">
              <span>Según tus inversiones...</span>
              <h4>AAPL baja hasta un 15,4% luego de máximos históricos</h4>
              <p>Ingresá en la nota para enterarte el por qué y cómo se estabiliza el mercado</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default FeaturesShowcase;