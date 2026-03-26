import { useState, useEffect } from 'react';
import { Scissors } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        <a href="/" className="nav-logo">
          <div className="nav-logo-icon"><Scissors size={16} /></div>
          <div className="nav-logo-text">Cut<span>Wood</span></div>
        </a>

        <ul className="nav-links">
          <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Funciones</a></li>
          <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works'); }}>Como Funciona</a></li>
          <li><a href="#pricing" onClick={(e) => { e.preventDefault(); scrollTo('pricing'); }}>Precios</a></li>
          <li><a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo('faq'); }}>FAQ</a></li>
          <li><a href="/app" className="nav-cta">Empezar Gratis →</a></li>
        </ul>

        <button className="nav-mobile-btn" onClick={() => window.location.href = '/app'}>
          Empezar →
        </button>
      </div>
    </nav>
  );
}
