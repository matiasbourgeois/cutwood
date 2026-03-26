import './landing.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Metrics from './components/Metrics';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import LiveDemo from './components/LiveDemo';
import Comparison from './components/Comparison';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import { useScrollReveal } from './hooks';

export default function LandingPage() {
  const ctaRef = useScrollReveal();

  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Metrics />
      <Features />
      <HowItWorks />
      <LiveDemo />
      <Comparison />
      <Pricing />
      <FAQ />

      {/* CTA Final */}
      <section className="landing-section cta-section" ref={ctaRef}>
        <div className="landing-container reveal">
          <h2 className="cta-title">
            Empeza a optimizar tus cortes <span style={{
              background: 'var(--land-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>hoy</span>
          </h2>
          <p className="cta-subtitle">
            Sin registro. Sin tarjeta. Sin limites.
          </p>
          <div className="cta-btn-wrap">
            <a href="/app" className="btn-primary cta-btn-glow" style={{ fontSize: '18px', padding: '16px 40px' }}>
              Abrir CutWood →
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
