function ProblemSection() {
  return (
    <section className="problem-section">
      <div className="problem-inner">
        <h2>
          Tu debut como <em>inversor</em> no tiene por qué sentirse como un salto al vacío
        </h2>

        <div className="problem-grid">
          <article className="problem-card">
            <span>01</span>
            <h3>Información fragmentada</h3>
            <p>
              Precios, noticias, análisis y opiniones suelen estar repartidos
              en distintas apps o sitios difíciles de comparar.
            </p>
          </article>

          <article className="problem-card">
            <span>02</span>
            <h3>Poca claridad</h3>
            <p>
              Muchos jóvenes quieren empezar, pero se encuentran con jerga,
              gráficos confusos y decisiones que parecen demasiado técnicas.
            </p>
          </article>

          <article className="problem-card">
            <span>03</span>
            <h3>Falta de comunidad</h3>
            <p>
              Invertir suele ser una experiencia individual, sin poder ver qué
              hacen otros inversores ni aprender de sus estrategias.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

export default ProblemSection;  