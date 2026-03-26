import { useScrollReveal } from '../hooks';

export default function Pricing() {
  const ref = useScrollReveal();

  return (
    <section className="landing-section" id="pricing" ref={ref} style={{ background: 'var(--land-surface)' }}>
      <div className="landing-container">
        <div className="reveal" style={{ textAlign: 'center' }}>
          <div className="landing-section-label">Precios</div>
          <h2 className="landing-section-title">
            Simple. Transparente. Sin sorpresas.
          </h2>
          <p className="landing-section-subtitle" style={{ margin: '0 auto' }}>
            Empeza gratis, escala cuando lo necesites.
          </p>
        </div>

        <div className="pricing-grid reveal-stagger">
          <div className="pricing-card reveal">
            <div className="pricing-name">Gratis</div>
            <div className="pricing-price">$0</div>
            <p className="pricing-desc">Para carpinteros independientes y proyectos personales.</p>
            <ul className="pricing-features">
              <li><span className="check">✓</span> Optimizacion ilimitada</li>
              <li><span className="check">✓</span> Motor v3 completo (126 variantes)</li>
              <li><span className="check">✓</span> Secuencia de cortes recursiva</li>
              <li><span className="check">✓</span> Export PDF profesional</li>
              <li><span className="check">✓</span> Gestion de retazos</li>
              <li><span className="check">✓</span> Funciona offline</li>
              <li><span className="check">✓</span> Datos guardados en tu navegador</li>
            </ul>
            <a href="/app" className="pricing-btn outline">Empezar Gratis</a>
          </div>

          <div className="pricing-card featured reveal">
            <div className="pricing-name">Pro</div>
            <div className="pricing-price">
              <span className="currency">$</span>6.990<span className="period">/mes</span>
            </div>
            <p className="pricing-desc">Para talleres y carpinterias que necesitan la nube.</p>
            <ul className="pricing-features">
              <li><span className="check">✓</span> Todo lo del plan Gratis</li>
              <li><span className="check">✓</span> Datos en la nube (multi-dispositivo)</li>
              <li><span className="check">✓</span> Historial ilimitado de optimizaciones</li>
              <li><span className="check">✓</span> Compartir resultados por link</li>
              <li><span className="check">✓</span> Soporte prioritario por WhatsApp</li>
              <li><span className="check">✓</span> Optimizar multiples muebles juntos</li>
              <li><span className="check">✓</span> Etiquetas adhesivas en PDF</li>
            </ul>
            <button className="pricing-btn primary" disabled style={{ opacity: 0.7, cursor: 'default' }}>
              Proximamente
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
