/**
 * CutWood Optimizer — Web Worker
 *
 * Receives: { type: 'optimize', pieces, stock, options, offcuts, mode }
 *           { type: 'cancel' }   ← handled by terminating the worker from the hook
 *
 * Sends:    { type: 'progress', percent: 0-100, phase: string }
 *           { type: 'result',   payload: OptimizerResult }
 *           { type: 'error',    message: string }
 *
 * The worker is created as a Vite module worker so ES imports work natively.
 */

import { optimizeCuts, optimizeDeep } from './optimizer.js';

self.onmessage = function ({ data }) {
  if (data.type !== 'optimize') return;

  const { pieces, stock, options, offcuts = [], mode = 'fast' } = data;

  try {
    if (mode === 'deep') {
      // Deep mode — reports progress throughout
      const result = optimizeDeep(pieces, stock, options, offcuts, {
        onProgress: (percent, phase) => {
          self.postMessage({ type: 'progress', percent, phase });
        },
      });
      self.postMessage({ type: 'result', payload: result });

    } else {
      // Fast mode — single progress tick so the UI knows we started
      self.postMessage({ type: 'progress', percent: 15, phase: 'Analizando configuraciones...' });
      const result = optimizeCuts(pieces, stock, options, offcuts);
      self.postMessage({ type: 'progress', percent: 95, phase: 'Construyendo resultado...' });
      self.postMessage({ type: 'result', payload: result });
    }

  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || 'Error desconocido en el optimizador' });
  }
};
