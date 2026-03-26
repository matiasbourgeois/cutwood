import { useCountUp, useScrollReveal } from '../hooks';

export default function Metrics() {
  const sectionRef = useScrollReveal();
  const ref1 = useCountUp(67.1, 2000, '%');
  const ref2 = useCountUp(126, 1800, '');
  const ref3 = useCountUp(50, 1500, 'ms');
  const ref4 = useCountUp(0, 1000, '');

  return (
    <section className="metrics-section" ref={sectionRef}>
      <div className="landing-container">
        <div className="metrics-grid reveal-stagger">
          <div className="metric-item reveal">
            <div className="metric-value" ref={ref1}>0%</div>
            <div className="metric-label">Aprovechamiento promedio</div>
          </div>
          <div className="metric-item reveal">
            <div className="metric-value" ref={ref2}>0</div>
            <div className="metric-label">Variantes evaluadas</div>
          </div>
          <div className="metric-item reveal">
            <div className="metric-value">
              {'<'}<span ref={ref3}>0ms</span>
            </div>
            <div className="metric-label">Tiempo de calculo</div>
          </div>
          <div className="metric-item reveal">
            <div className="metric-value" ref={ref4}>∞</div>
            <div className="metric-label">Proyectos ilimitados</div>
          </div>
        </div>
      </div>
    </section>
  );
}
