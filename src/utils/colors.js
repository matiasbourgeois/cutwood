/**
 * Color palette for pieces in diagrams.
 * Uses distinct, vibrant colors that look good on dark backgrounds.
 */

const PIECE_COLORS = [
  { bg: 'rgba(108, 99, 255, 0.55)', border: '#6c63ff', text: '#e2e8f0' },
  { bg: 'rgba(168, 85, 247, 0.55)', border: '#a855f7', text: '#e2e8f0' },
  { bg: 'rgba(16, 185, 129, 0.55)', border: '#10b981', text: '#e2e8f0' },
  { bg: 'rgba(245, 158, 11, 0.55)', border: '#f59e0b', text: '#1a1a2e' },
  { bg: 'rgba(239, 68, 68, 0.55)', border: '#ef4444', text: '#e2e8f0' },
  { bg: 'rgba(59, 130, 246, 0.55)', border: '#3b82f6', text: '#e2e8f0' },
  { bg: 'rgba(236, 72, 153, 0.55)', border: '#ec4899', text: '#e2e8f0' },
  { bg: 'rgba(20, 184, 166, 0.55)', border: '#14b8a6', text: '#e2e8f0' },
  { bg: 'rgba(249, 115, 22, 0.55)', border: '#f97316', text: '#e2e8f0' },
  { bg: 'rgba(139, 92, 246, 0.55)', border: '#8b5cf6', text: '#e2e8f0' },
  { bg: 'rgba(34, 197, 94, 0.55)', border: '#22c55e', text: '#e2e8f0' },
  { bg: 'rgba(251, 191, 36, 0.55)', border: '#fbbf24', text: '#1a1a2e' },
  { bg: 'rgba(244, 63, 94, 0.55)', border: '#f43f5e', text: '#e2e8f0' },
  { bg: 'rgba(6, 182, 212, 0.55)', border: '#06b6d4', text: '#e2e8f0' },
  { bg: 'rgba(217, 70, 239, 0.55)', border: '#d946ef', text: '#e2e8f0' },
  { bg: 'rgba(132, 204, 22, 0.55)', border: '#84cc16', text: '#1a1a2e' },
];

export function getPieceColor(index) {
  return PIECE_COLORS[index % PIECE_COLORS.length];
}

export function getPieceColorById(id, allIds) {
  const idx = allIds.indexOf(id);
  return getPieceColor(idx >= 0 ? idx : 0);
}
