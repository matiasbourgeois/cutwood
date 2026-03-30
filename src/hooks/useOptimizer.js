/**
 * useOptimizer — React hook for the CutWood optimizer Web Worker.
 *
 * API:
 *   const { optimize, cancel, isCalculating, progress, phase, mode, setMode } = useOptimizer();
 *
 *   optimize(pieces, stock, options, offcuts?)   → Promise<result>
 *   cancel()                                     → terminates worker immediately
 *   isCalculating                                → boolean
 *   progress                                     → 0-100 | null (null = no bar)
 *   phase                                        → string describing current phase
 *   mode                                         → 'fast' | 'deep'
 *   setMode                                      → ('fast'|'deep') => void
 *
 * Transparently falls back to synchronous optimizeCuts() if Workers are
 * unavailable (old browsers / unit test environments).
 */

import { useRef, useState, useCallback } from 'react';
import { optimizeCuts } from '../engine/optimizer.js';

export function useOptimizer() {
  const workerRef    = useRef(null);
  const resolveRef   = useRef(null);
  const rejectRef    = useRef(null);

  const [isCalculating, setIsCalculating] = useState(false);
  const [progress,      setProgress]      = useState(null);   // null → no progress bar
  const [phase,         setPhase]         = useState('');
  const [mode,          setMode]          = useState('fast'); // 'fast' | 'deep'

  // ── Teardown ──────────────────────────────────────────────────────────────

  const _terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    resolveRef.current = null;
    rejectRef.current  = null;
  }, []);

  // ── cancel() — safe to call at any point ──────────────────────────────────

  const cancel = useCallback(() => {
    _terminate();
    setIsCalculating(false);
    setProgress(null);
    setPhase('');
  }, [_terminate]);

  // ── optimize() — main entry point ─────────────────────────────────────────

  const optimize = useCallback((pieces, stock, options, offcuts = []) => {
    return new Promise((resolve, reject) => {
      // Kill any running job first
      _terminate();

      setIsCalculating(true);
      setProgress(mode === 'deep' ? 0 : null);
      setPhase('Iniciando optimización...');

      // ── Try to create a module Worker (Vite) ──────────────────────────────
      let worker;
      try {
        worker = new Worker(
          new URL('../engine/optimizer.worker.js', import.meta.url),
          { type: 'module' }
        );
      } catch (_) {
        // Fallback: run synchronously (e.g., in Jest / SSR)
        try {
          const result = optimizeCuts(pieces, stock, options, offcuts);
          setIsCalculating(false);
          setProgress(null);
          resolve(result);
        } catch (err) {
          setIsCalculating(false);
          setProgress(null);
          reject(err);
        }
        return;
      }

      workerRef.current = worker;
      resolveRef.current = resolve;
      rejectRef.current  = reject;

      // ── Handle messages from the worker ──────────────────────────────────
      worker.onmessage = ({ data }) => {
        switch (data.type) {

          case 'progress':
            setProgress(data.percent);
            setPhase(data.phase ?? '');
            break;

          case 'result':
            setIsCalculating(false);
            setProgress(null);
            setPhase('');
            _terminate();
            resolve(data.payload);
            break;

          case 'error':
            setIsCalculating(false);
            setProgress(null);
            setPhase('');
            _terminate();
            reject(new Error(data.message));
            break;

          default:
            break;
        }
      };

      worker.onerror = (err) => {
        setIsCalculating(false);
        setProgress(null);
        setPhase('');
        _terminate();
        reject(err);
      };

      // ── Send the job ──────────────────────────────────────────────────────
      worker.postMessage({ type: 'optimize', pieces, stock, options, offcuts, mode });
    });
  }, [mode, _terminate]);

  return { optimize, cancel, isCalculating, progress, phase, mode, setMode };
}
