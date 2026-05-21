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
            <div className="visual-card chart-card">
              <div className="visual-top">
                <span>Portfolio</span>
                <strong>+12.4%</strong>
              </div>
              <div className="bars">
                <i></i><i></i><i></i><i></i><i></i>
              </div>
            </div>
          </div>
        </article>

        <article className="showcase-row reverse">
          <div className="showcase-text">
            <span>02</span>
            <h3>Aprendé viendo cómo invierten otros.</h3>
            <p>
              Conectate con amigos, descubrí estrategias y compartí actividad de forma pública o privada.
            </p>
          </div>

          <div className="showcase-visual">
            <div className="visual-card social-card">
              <div className="friend-line">MA invirtió en AAPL</div>
              <div className="friend-line">JL sigue fondos tecnológicos</div>
              <div className="friend-line">SR ganó +8.2% este mes</div>
            </div>
          </div>
        </article>

        <article className="showcase-row">
          <div className="showcase-text">
            <span>03</span>
            <h3>Recibí sugerencias adaptadas a vos.</h3>
            <p>
              Valeur analiza tus intereses, actividad y comportamiento para ayudarte a descubrir activos relevantes.
            </p>
          </div>

          <div className="showcase-visual">
            <div className="visual-card recommend-card">
              <span>Recomendado para vos</span>
              <h4>ETF tecnológico</h4>
              <p>Coincide con tu perfil moderado y tus búsquedas recientes.</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default FeaturesShowcase;