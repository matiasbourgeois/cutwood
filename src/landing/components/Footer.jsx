import { Scissors } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <a href="/" className="footer-logo">
          <Scissors size={16} />
          CutWood
        </a>
        <span className="footer-text">
          Hecho con ❤️ en Argentina — 2026
        </span>
        <div className="footer-links">
          <a href="/app">Aplicacion</a>
          <a href="#features">Funciones</a>
          <a href="#pricing">Precios</a>
          <a href="#faq">FAQ</a>
        </div>
      </div>
    </footer>
  );
}
