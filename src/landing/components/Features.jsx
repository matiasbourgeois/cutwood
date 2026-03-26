import { Cpu, Scissors, Layers, FileText, Ruler, Database } from 'lucide-react';
import { useScrollReveal } from '../hooks';

const features = [
  {
    icon: Cpu,
    title: 'Motor v3 Multi-Heuristico',
    desc: '126 variantes de empaquetado: Guillotine + MaxRects + Local Search. Selecciona automaticamente la mejor solucion.',
  },
  {
    icon: Scissors,
    title: 'Secuencia de Cortes Real',
    desc: 'Descomposicion recursiva binaria con regla "piezas en ambos lados". Secuencias listas para la seccionadora.',
  },
  {
    icon: Layers,
    title: 'Gestion de Retazos',
    desc: 'Guarda sobrantes automaticamente, reutilizalos en futuros proyectos. Nombres editables y agregar manualmente.',
  },
  {
    icon: FileText,
    title: 'PDF Profesional',
    desc: 'Diagramas a color, secuencia de cortes con niveles E1/E2/REC, inventario de retazos. Listo para el taller.',
  },
  {
    icon: Ruler,
    title: 'Veta y Tapacanto',
    desc: 'Respeta la direccion de veta del tablero. Calcula metros lineales de tapacanto por pieza y costo total.',
  },
  {
    icon: Database,
    title: 'Import / Export',
    desc: 'Pega desde Excel, exporta/importa JSON con todos los datos. Historial de muebles guardados con busqueda.',
  },
];

export default function Features() {
  const ref = useScrollReveal();

  return (
    <section className="landing-section" id="features" ref={ref}>
      <div className="landing-container">
        <div className="reveal">
          <div className="landing-section-label">Funcionalidades</div>
          <h2 className="landing-section-title">
            Todo lo que necesitas<br />para optimizar cortes
          </h2>
          <p className="landing-section-subtitle">
            Herramientas profesionales que normalmente cuestan cientos de dolares al ano. Gratis.
          </p>
        </div>

        <div className="features-grid reveal-stagger">
          {features.map((f, i) => (
            <div className="feature-card reveal" key={i}>
              <div className="feature-icon">
                <f.icon size={22} />
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
