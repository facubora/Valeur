function Hero() {
    return (
        <section className="hero" id="hero">
            <div className="hero-inner">
                <div className="hero-content">
                    <h1>
                        Invertí con <em>inteligencia,</em>
                        <br />
                        crecé con amigos.
                    </h1>

                    <p>
                        Valeur es la plataforma que convierte las inversiones en algo simple, social y accesible. <br />Para vos que querés empezar, aunque nunca lo hayas hecho.
                    </p>

                    <div className="hero-actions">
                        <a href="#cta" className="hero-primary">
                            Empezar gratis
                        </a>
                        <a href="#features" className="hero-secondary">
                            Ver cómo funciona
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Hero;