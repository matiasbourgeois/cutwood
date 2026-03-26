import { useScrollReveal } from '../hooks';

const rows = [
  { feature: 'Precio', cutwood: 'Gratis', pro: '$300-500/año', manual: '$0' },
  { feature: 'Variantes evaluadas', cutwood: '126', pro: '~20', manual: '1' },
  { feature: 'Tiempo de calculo', cutwood: '<50ms', pro: '1-5 seg', manual: '10+ min' },
  { feature: 'Secuencia de cortes', cutwood: '✓ Recursiva', pro: 'Basica', manual: '✗' },
  { feature: 'Gestion de retazos', cutwood: '✓ Automatica', pro: 'Manual', manual: '✗' },
  { feature: 'Export PDF', cutwood: '✓ Incluido', pro: 'Extra $', manual: '✗' },
  { feature: 'Veta y tapacanto', cutwood: '✓ Completo', pro: '✓ Basico', manual: '✗' },
  { feature: 'Funciona offline', cutwood: '✓ Si', pro: '✗ No', manual: '✓ Si' },
];

export default function Comparison() {
  const ref = useScrollReveal();

  return (
    <section className="landing-section" id="comparison" ref={ref}>
      <div className="landing-container">
        <div className="reveal" style={{ textAlign: 'center' }}>
          <div className="landing-section-label">Comparacion</div>
          <h2 className="landing-section-title">
            CutWood vs. la competencia
          </h2>
          <p className="landing-section-subtitle" style={{ margin: '0 auto' }}>
            Rendimiento profesional sin el precio profesional.
          </p>
        </div>

        <table className="comparison-table reveal">
          <thead>
            <tr>
              <th>Caracteristica</th>
              <th>CutWood</th>
              <th>Software pago</th>
              <th>Cortar a mano</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.feature}</td>
                <td>{row.cutwood.startsWith('✓') ? <span className="comparison-check">{row.cutwood}</span> : row.cutwood}</td>
                <td>{row.pro}</td>
                <td>{row.manual === '✗' ? <span className="comparison-x">{row.manual}</span> : row.manual}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
