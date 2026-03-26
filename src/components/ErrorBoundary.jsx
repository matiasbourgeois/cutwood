import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('CutWood Error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f0a1e',
          color: 'white',
          fontFamily: "'Inter', sans-serif",
          padding: '40px',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '480px',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Algo salio mal
            </h1>
            <p style={{
              color: '#888',
              fontSize: '14px',
              marginBottom: '24px',
              lineHeight: 1.6,
            }}>
              CutWood encontro un error inesperado. Tus datos estan guardados
              en el navegador — no se perdio nada.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid rgba(108, 99, 255, 0.3)',
                  background: 'rgba(108, 99, 255, 0.1)',
                  color: '#a78bfa',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Intentar de nuevo
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Recargar pagina
              </button>
            </div>
            {this.state.error && (
              <details style={{
                marginTop: '24px',
                textAlign: 'left',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '12px',
              }}>
                <summary style={{ 
                  color: '#666', 
                  fontSize: '12px', 
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}>
                  Detalle tecnico
                </summary>
                <pre style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
