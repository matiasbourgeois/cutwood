import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useScrollReveal } from '../hooks';

const faqs = [
  {
    q: 'Es realmente gratis?',
    a: 'Si, 100% gratis. El motor completo, export PDF, retazos, historial — todo incluido sin costo. No pedimos tarjeta de credito ni registro.',
  },
  {
    q: 'Funciona sin internet?',
    a: 'Si. CutWood funciona completamente offline. Los datos se guardan en tu navegador (localStorage). Podes usarlo en el taller sin conexion.',
  },
  {
    q: 'Puedo usar mis propios tableros?',
    a: 'Si. Ademas de los tableros predefinidos (2750x1830, 2600x1830, etc.), podes ingresar cualquier medida personalizada de largo y ancho.',
  },
  {
    q: 'Que tan preciso es comparado con software pago?',
    a: 'El motor v3 evalua 126 variantes de empaquetado y en nuestros benchmarks iguala o supera a software profesional. El desperdicio promedio es de 15.33%.',
  },
  {
    q: 'Puedo pegar datos desde Excel?',
    a: 'Si. Copia la tabla de piezas desde Excel o Google Sheets (columnas: Cantidad, Largo, Ancho, Nombre) y pegala con Ctrl+V directamente en la tabla de piezas.',
  },
  {
    q: 'Los retazos se guardan entre proyectos?',
    a: 'Si. Cada vez que optimizas, los sobrantes utiles (>=150x150mm) se guardan automaticamente. Podes reutilizarlos en el proximo proyecto para ahorrar material.',
  },
  {
    q: 'Mis datos estan seguros?',
    a: 'Tus datos nunca salen de tu navegador. No enviamos nada a ningun servidor. Todo se procesa y almacena localmente en tu computadora.',
  },
  {
    q: 'Respeta la veta del tablero?',
    a: 'Si. Podes configurar la veta del tablero (horizontal, vertical, o sin veta) y la veta individual de cada pieza. El motor respeta estas restricciones al optimizar.',
  },
];

export default function FAQ() {
  const ref = useScrollReveal();
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="landing-section" id="faq" ref={ref}>
      <div className="landing-container">
        <div className="reveal" style={{ textAlign: 'center' }}>
          <div className="landing-section-label">FAQ</div>
          <h2 className="landing-section-title">
            Preguntas frecuentes
          </h2>
          <p className="landing-section-subtitle" style={{ margin: '0 auto' }}>
            Todo lo que necesitas saber antes de empezar.
          </p>
        </div>

        <div className="faq-list reveal">
          {faqs.map((faq, i) => (
            <div className="faq-item" key={i}>
              <button
                className="faq-question"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                {faq.q}
                <ChevronDown size={18} className={`faq-chevron ${openIndex === i ? 'open' : ''}`} />
              </button>
              <div className="faq-answer" style={{
                maxHeight: openIndex === i ? '200px' : '0px',
                opacity: openIndex === i ? 1 : 0,
              }}>
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
