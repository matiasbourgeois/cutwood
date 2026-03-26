import { useScrollReveal } from '../hooks';

export default function Hero() {
  const ref = useScrollReveal();

  return (
    <section className="hero-section">
      {/* Animated gradient background */}
      <div className="hero-bg">
        <div className="hero-gradient-orb orb-1" />
        <div className="hero-gradient-orb orb-2" />
        <div className="hero-gradient-orb orb-3" />
        <div className="hero-grid" />
      </div>

      <div className="hero-content" ref={ref}>
        <div className="hero-text reveal">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Motor v3 — 126 variantes de optimizacion
          </div>

          <h1 className="hero-title">
            Optimiza cada<br />
            <span className="gradient-text">centimetro de tus tableros</span>
          </h1>

          <p className="hero-subtitle">
            El optimizador de cortes que iguala software profesional de $500/ano.
            Carga tus piezas, optimiza en milisegundos, y lleva el PDF al taller.
          </p>

          <div className="hero-actions">
            <a href="/app" className="btn-primary">
              Empezar Gratis →
            </a>
            <a href="#demo" className="btn-secondary"
              onClick={(e) => { e.preventDefault(); document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Ver Demo
            </a>
          </div>
        </div>

        <div className="hero-visual reveal">
          <div className="hero-glow-ring" />
          <svg className="hero-screenshot" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
            {/* Mini diagram mockup */}
            <rect width="600" height="400" rx="12" fill="#131C31" />
            <rect x="20" y="20" width="560" height="360" rx="6" fill="#0B1121" stroke="#1E3A5F" strokeWidth="1" />
            {/* Pieces */}
            <rect x="30" y="30" width="250" height="100" rx="3" fill="#06B6D4" opacity="0.7" />
            <rect x="30" y="135" width="250" height="100" rx="3" fill="#3B82F6" opacity="0.7" />
            <rect x="30" y="240" width="250" height="100" rx="3" fill="#8B5CF6" opacity="0.7" />
            <rect x="290" y="30" width="140" height="155" rx="3" fill="#10B981" opacity="0.7" />
            <rect x="290" y="190" width="140" height="155" rx="3" fill="#F59E0B" opacity="0.7" />
            <rect x="440" y="30" width="130" height="100" rx="3" fill="#EC4899" opacity="0.7" />
            <rect x="440" y="135" width="130" height="100" rx="3" fill="#EF4444" opacity="0.6" />
            {/* Labels */}
            <text x="155" y="85" fill="white" fontSize="14" fontWeight="700" textAnchor="middle">Pieza 1</text>
            <text x="155" y="190" fill="white" fontSize="14" fontWeight="700" textAnchor="middle">Pieza 2</text>
            <text x="155" y="295" fill="white" fontSize="14" fontWeight="700" textAnchor="middle">Pieza 3</text>
            <text x="360" y="112" fill="white" fontSize="13" fontWeight="700" textAnchor="middle">Pieza 4</text>
            <text x="360" y="272" fill="white" fontSize="13" fontWeight="700" textAnchor="middle">Pieza 5</text>
            <text x="505" y="85" fill="white" fontSize="12" fontWeight="700" textAnchor="middle">P6</text>
            <text x="505" y="190" fill="white" fontSize="12" fontWeight="700" textAnchor="middle">P7</text>
            {/* Waste hatching */}
            <rect x="440" y="240" width="130" height="100" rx="3" fill="#1E3A5F" opacity="0.5" />
            <text x="505" y="295" fill="#64748B" fontSize="11" fontWeight="500" textAnchor="middle">Retazo</text>
            {/* Stats overlay */}
            <rect x="20" y="350" width="560" height="30" rx="0 0 6 6" fill="#131C31" opacity="0.9" />
            <text x="40" y="370" fill="#06B6D4" fontSize="12" fontWeight="700">87.3% aprovechamiento</text>
            <text x="240" y="370" fill="#94A3B8" fontSize="11">1 tablero</text>
            <text x="340" y="370" fill="#94A3B8" fontSize="11">7 piezas</text>
            <text x="440" y="370" fill="#10B981" fontSize="11">12ms</text>
          </svg>
        </div>
      </div>
    </section>
  );
}
