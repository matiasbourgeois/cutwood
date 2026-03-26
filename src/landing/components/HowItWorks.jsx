import { useScrollReveal } from '../hooks';

const steps = [
  {
    num: 1,
    title: 'Carga tus piezas',
    desc: 'Ingresa las medidas manualmente o pegalas directo desde Excel. El sistema entiende cantidades, largo, ancho y nombre de cada pieza.',
  },
  {
    num: 2,
    title: 'Optimiza en milisegundos',
    desc: 'El motor v3 evalua 126 combinaciones de empaquetado y selecciona la que genera menos desperdicio. En menos de 50ms.',
  },
  {
    num: 3,
    title: 'Corta con confianza',
    desc: 'Exporta el PDF con el diagrama de cortes, la secuencia paso a paso y el inventario de retazos. Llevalo al taller e imprimilo.',
  },
];

export default function HowItWorks() {
  const ref = useScrollReveal();

  return (
    <section className="landing-section" id="how-it-works" ref={ref} style={{ background: 'var(--land-surface)' }}>
      <div className="landing-container">
        <div className="reveal">
          <div className="landing-section-label">Como Funciona</div>
          <h2 className="landing-section-title">
            Tres pasos. Cero complicaciones.
          </h2>
          <p className="landing-section-subtitle">
            De la lista de piezas al PDF de produccion en menos de un minuto.
          </p>
        </div>

        <div className="steps-container">
          {steps.map((step) => (
            <div className="step-item reveal" key={step.num}>
              <div className="step-number">{step.num}</div>
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
