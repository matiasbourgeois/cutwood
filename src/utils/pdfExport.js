/**
 * CutWood — God-Tier PDF Export
 * Professional multi-page PDF with branded layout, stat boxes,
 * colored diagrams, and fully paginated cut sequences.
 */
import jsPDF from 'jspdf';
import { getPieceColor } from './colors.js';

/* ── Color constants ── */
const ACCENT = [108, 99, 255];        // #6c63ff
const DARK = [26, 26, 46];            // #1a1a2e
const MID = [80, 80, 100];
const LIGHT_TEXT = [60, 60, 75];
const MUTED = [140, 140, 160];
const BG_LIGHT = [248, 249, 252];
const ROW_ALT = [241, 243, 249];
const WHITE = [255, 255, 255];
const SUCCESS = [16, 185, 129];
const WARNING = [245, 158, 11];
const DANGER = [239, 68, 68];

/* ── Layout constants ── */
const MARGIN = 16;
const PAGE_W = 287;   // A4 landscape width in mm
const PAGE_H = 200;   // A4 landscape height in mm

/* -- Helpers -- */
/** Sanitize text for jsPDF — keep accented Spanish chars, replace problematic unicode */
function sanitizeText(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/\u2014/g, '-')    // em dash
    .replace(/\u2013/g, '-')    // en dash
    .replace(/\u00d7/g, 'x')   // multiplication sign ×
    .replace(/\u00b7/g, '|')   // middle dot
    .replace(/\u00b2/g, '2')   // superscript 2
    .replace(/\u2265/g, '>=')  // greater than or equal
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')  // strip emojis only
    .replace(/[^\x20-\x7E\u00C0-\u00FF]/g, ''); // keep Latin-1 (accents)
}

/** Clip a diagonal line segment to a rectangle. Returns null if fully outside. */
function clipLineToRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  const left = rx, right = rx + rw, top = ry, bottom = ry + rh;
  // Cohen-Sutherland style clipping for a line from (x1,y1) to (x2,y2)
  const dx = x2 - x1, dy = y2 - y1;
  let tMin = 0, tMax = 1;
  const clip = (p, q) => {
    if (Math.abs(p) < 1e-10) return q >= 0;
    const t = q / p;
    if (p < 0) { if (t > tMax) return false; if (t > tMin) tMin = t; }
    else       { if (t < tMin) return false; if (t < tMax) tMax = t; }
    return true;
  };
  if (!clip(-dx, x1 - left)) return null;
  if (!clip(dx, right - x1)) return null;
  if (!clip(-dy, y1 - top)) return null;
  if (!clip(dy, bottom - y1)) return null;
  return [
    x1 + tMin * dx, y1 + tMin * dy,
    x1 + tMax * dx, y1 + tMax * dy,
  ];
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function drawAccentBar(doc) {
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W + 20, 4, 'F');
}

function drawFooter(doc, pageNum, totalPages) {
  const y = PAGE_H - 4;
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('CutWood \u2014 Optimizador de Cortes', MARGIN, y);
  doc.text('Pagina ' + pageNum + ' de ' + totalPages, PAGE_W - MARGIN, y, { align: 'right' });
  // Subtle bottom line
  doc.setDrawColor(220, 220, 230);
  doc.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);
}

function drawDivider(doc, y) {
  doc.setDrawColor(220, 220, 230);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function drawStatBox(doc, x, y, w, h, value, label, color) {
  // Background
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setLineWidth(0.2);

  // Colored left accent strip
  doc.setFillColor(...color);
  doc.rect(x, y, 2.5, h, 'F');

  // Value
  doc.setFontSize(16);
  doc.setTextColor(...color);
  doc.text(String(value), x + w / 2 + 1, y + h / 2 - 1, { align: 'center' });

  // Label
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), x + w / 2 + 1, y + h / 2 + 5, { align: 'center' });
}

/* ══════════════════════════════════════════════════════════ */
/*  MAIN EXPORT FUNCTION                                     */
/* ══════════════════════════════════════════════════════════ */
export function exportToPDF(result, projectName, pieces, stock, options = {}) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const stats = result.stats;
  const allPieceIds = [...new Set(pieces.map((p) => p.id))];

  // We'll collect pages first, then add footers
  let totalPages = 0;

  /* ═══════════════════════════════════════════════════════ */
  /*  PAGE 1 — Cover & Summary                              */
  /* ═══════════════════════════════════════════════════════ */
  totalPages++;
  drawAccentBar(doc);

  /* CutWood branding — top right */
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('CutWood', PAGE_W - MARGIN, 14, { align: 'right' });

  // Title
  let y = 18;
  doc.setFontSize(22);
  doc.setTextColor(...DARK);
  doc.text('CutWood', MARGIN, y);
  doc.setFontSize(22);
  doc.setTextColor(...ACCENT);
  const titleW = doc.getTextWidth('CutWood ');
  doc.text(sanitizeText(projectName || 'Proyecto'), MARGIN + titleW, y);

  // Subtitle line
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const dateStr = new Date().toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const grainLabel = (stock.grain === 'vertical') ? 'Vertical' : (stock.grain === 'horizontal') ? 'Horizontal' : 'Sin veta';
  const kerfVal = options.kerf || result.boards[0]?.cutSequence?.[0]?.kerf || 0;
  doc.text(
    sanitizeText('Tablero: ' + stock.width + ' x ' + stock.height + ' mm  |  Espesor: ' + (stock.thickness || '-') + 'mm  |  Kerf: ' + kerfVal + 'mm  |  Veta: ' + grainLabel + (stock.pricePerBoard ? '  |  $' + stock.pricePerBoard + '/tablero' : '') + '  |  ' + dateStr),
    MARGIN, y
  );

  // Divider
  y += 5;
  drawDivider(doc, y);

  // ── Stat boxes ──
  y += 6;

  // Calculate tapacanto and costs
  const edgeBandingMeters = (pieces || []).reduce((total, p) => {
    const eb = p.edgeBanding;
    if (!eb) return total;
    const qty = p.quantity || 1;
    let m = 0;
    if (eb.top) m += p.width;
    if (eb.bottom) m += p.width;
    if (eb.left) m += p.height;
    if (eb.right) m += p.height;
    return total + (m * qty) / 1000;
  }, 0);
  const pricePerBoard = stock.pricePerBoard || 0;
  const pricePerMeterEdge = stock.pricePerMeterEdge || 0;
  const boardCost = stats.totalBoards * pricePerBoard;
  const edgeCost = edgeBandingMeters * pricePerMeterEdge;
  const totalCost = boardCost + edgeCost;
  const hasCosts = pricePerBoard > 0;
  const hasTapacanto = edgeBandingMeters > 0;
  const totalOffcutBoards = stats.totalOffcutBoards || 0;
  const hasOffcutBoards = totalOffcutBoards > 0;

  // Collect all generated offcuts
  const allOffcuts = [];
  result.boards.forEach((board, idx) => {
    if (board.offcuts && board.offcuts.length > 0) {
      board.offcuts.forEach(oc => {
        allOffcuts.push({
          ...oc,
          source: board.isOffcut
            ? `Retazo - ${board.stockWidth}x${board.stockHeight}`
            : `Tablero ${idx + 1}`,
        });
      });
    }
  });

  // Dynamic box count
  const boxCount = 4 + (hasOffcutBoards ? 1 : 0) + (hasTapacanto ? 1 : 0) + (hasCosts ? 1 : 0);
  const totalBoxSpace = PAGE_W - MARGIN * 2;
  const boxGap = 6;
  const boxW = Math.min(58, (totalBoxSpace - boxGap * (boxCount - 1)) / boxCount);
  const boxH = 22;
  const boxStartX = MARGIN;
  const PURPLE = [167, 139, 250];
  const GREEN = [52, 211, 153];

  const utilizationVal = `${stats.overallUtilization}%`;
  const utilizationColor = parseFloat(stats.overallUtilization) >= 80 ? SUCCESS
    : parseFloat(stats.overallUtilization) >= 50 ? WARNING : DANGER;

  let bx = boxStartX;
  drawStatBox(doc, bx, y, boxW, boxH, utilizationVal, 'Aprovechamiento', utilizationColor);
  bx += boxW + boxGap;
  drawStatBox(doc, bx, y, boxW, boxH, stats.totalBoards, 'Tableros', ACCENT);
  bx += boxW + boxGap;
  drawStatBox(doc, bx, y, boxW, boxH, stats.placedPieces, 'Piezas', [59, 130, 246]);
  bx += boxW + boxGap;
  drawStatBox(doc, bx, y, boxW, boxH, `${(stats.totalWasteArea / 1000000).toFixed(2)} m2`, 'Desperdicio', DANGER);
  if (hasTapacanto) {
    bx += boxW + boxGap;
    drawStatBox(doc, bx, y, boxW, boxH, `${edgeBandingMeters.toFixed(1)} m`, 'Tapacanto', PURPLE);
  }
  if (hasOffcutBoards) {
    bx += boxW + boxGap;
    drawStatBox(doc, bx, y, boxW, boxH, totalOffcutBoards, 'Retazos usados', [52, 211, 153]);
  }
  if (hasCosts) {
    bx += boxW + boxGap;
    drawStatBox(doc, bx, y, boxW, boxH, `$${totalCost.toLocaleString('es-AR')}`, 'Costo total', GREEN);
  }

  // ── Pieces Table ──
  y += boxH + 12;
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text('LISTA DE PIEZAS', MARGIN, y);
  y += 7;

  // Table header — wider with veta + bordes columns
  const tableW = PAGE_W - MARGIN * 2;
  const cols = [
    { label: '#', x: MARGIN, w: 8 },
    { label: 'Nombre', x: MARGIN + 8, w: 58 },
    { label: 'Largo', x: MARGIN + 66, w: 28 },
    { label: 'Ancho', x: MARGIN + 94, w: 28 },
    { label: 'Cant.', x: MARGIN + 122, w: 18 },
    { label: 'Veta', x: MARGIN + 140, w: 22 },
    { label: 'Bordes', x: MARGIN + 162, w: 30 },
    { label: 'Area', x: MARGIN + 192, w: 30 },
  ];

  // Header bg
  doc.setFillColor(...ACCENT);
  doc.roundedRect(MARGIN, y - 4, tableW, 7, 1, 1, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  cols.forEach((col) => {
    doc.text(col.label.toUpperCase(), col.x + 2, y);
  });
  y += 6;

  // Table rows — only valid pieces
  doc.setFontSize(9);
  const validPieces = pieces.filter((p) => p.width && p.height);
  validPieces.forEach((piece, i) => {
    if (y > PAGE_H - 18) {
      doc.addPage();
      totalPages++;
      drawAccentBar(doc);
      y = 18;
    }

    // Alt row
    if (i % 2 === 0) {
      doc.setFillColor(...ROW_ALT);
      doc.rect(MARGIN, y - 3.5, tableW, 6.5, 'F');
    }

    // Color swatch
    const pColor = getPieceColor(allPieceIds.indexOf(piece.id) >= 0 ? allPieceIds.indexOf(piece.id) : i);
    const rgb = hexToRgb(pColor.border);
    doc.setFillColor(...rgb);
    doc.circle(cols[0].x + 3, y - 0.8, 1.5, 'F');

    doc.setTextColor(...DARK);
    doc.text(String(i + 1), cols[0].x + 5.5, y);
    doc.text((piece.name || '-').substring(0, 22), cols[1].x + 2, y);
    doc.text(String(piece.width), cols[2].x + 2, y);
    doc.text(String(piece.height), cols[3].x + 2, y);
    doc.setTextColor(...ACCENT);
    doc.text(String(piece.quantity), cols[4].x + 2, y);

    // Veta column
    const grain = piece.grain || 'none';
    const grainLabel = grain === 'vertical' ? 'Vertical' : grain === 'horizontal' ? 'Horizontal' : '-';
    const grainColor = grain !== 'none' ? WARNING : MUTED;
    doc.setTextColor(...grainColor);
    doc.text(grainLabel, cols[5].x + 2, y);

    // Bordes column
    const eb = piece.edgeBanding;
    let bordesLabel = '-';
    if (eb) {
      const sides = [];
      if (eb.top) sides.push('Sup');
      if (eb.bottom) sides.push('Inf');
      if (eb.left) sides.push('Izq');
      if (eb.right) sides.push('Der');
      if (sides.length > 0) bordesLabel = sides.join('+');
    }
    const bordesColor = bordesLabel !== '-' ? PURPLE : MUTED;
    doc.setTextColor(...bordesColor);
    doc.text(bordesLabel, cols[6].x + 2, y);

    // Area (in m²)
    doc.setTextColor(...MUTED);
    const areaM2 = ((piece.width * piece.height * (piece.quantity || 1)) / 1000000).toFixed(3);
    doc.text(areaM2 + ' m2', cols[7].x + 2, y);

    y += 6.5;
  });

  /* ═══════════════════════════════════════════════════════ */
  /*  BOARD DIAGRAM PAGES                                    */
  /* ═══════════════════════════════════════════════════════ */
  result.boards.forEach((board, idx) => {
    doc.addPage();
    totalPages++;
    drawAccentBar(doc);

    // Board header
    let by = 15;
    doc.setFontSize(16);
    doc.setTextColor(...DARK);
    let titleText;
    if (board.isOffcut) {
      titleText = 'RETAZO';
      doc.text(titleText, MARGIN, by);
    } else {
      titleText = `Tablero ${idx + 1}`;
      doc.text(titleText, MARGIN, by);
    }

    // Utilization badge — position after the title
    const utilVal = `${board.utilization.toFixed(1)}%`;
    const utilColor = board.utilization >= 80 ? SUCCESS : board.utilization >= 50 ? WARNING : DANGER;
    doc.setFontSize(16); // ensure correct font for width calculation
    const badgeX = MARGIN + doc.getTextWidth(titleText + '  ') + 2;
    doc.setFillColor(...utilColor);
    doc.roundedRect(badgeX, by - 4.5, 22, 6.5, 1.5, 1.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text(utilVal, badgeX + 11, by - 0.8, { align: 'center' });

    // Board info subtitle
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const boardGrainLabel = (stock.grain === 'vertical') ? 'Vertical' : (stock.grain === 'horizontal') ? 'Horizontal' : 'Sin veta';
    const infoLine = board.isOffcut
      ? sanitizeText(`${board.stockWidth} x ${board.stockHeight} mm  |  ${board.pieces.length} piezas  |  Origen: ${board.offcutSource || 'Retazo'}  |  Desperdicio: ${(board.wasteArea / 1000000).toFixed(3)} m2`)
      : sanitizeText(`${board.stockWidth} x ${board.stockHeight} mm  |  ${board.pieces.length} piezas  |  Veta: ${boardGrainLabel}  |  Desperdicio: ${(board.wasteArea / 1000000).toFixed(3)} m2`);
    doc.text(infoLine, MARGIN, by + 7);

    // ── Draw board diagram ──
    const maxDiagramW = PAGE_W - MARGIN * 2;
    const maxDiagramH = PAGE_H - 55;
    const scaleX = maxDiagramW / board.stockWidth;
    const scaleY = maxDiagramH / board.stockHeight;
    const scale = Math.min(scaleX, scaleY);
    const dw = board.stockWidth * scale;
    const dh = board.stockHeight * scale;
    const dx = MARGIN + (maxDiagramW - dw) / 2;
    const dy = by + 14;

    // Board background
    doc.setFillColor(...BG_LIGHT);
    doc.setDrawColor(180, 180, 195);
    doc.setLineWidth(0.5);
    doc.rect(dx, dy, dw, dh, 'FD');
    doc.setLineWidth(0.2);

    // Edge trim visual — dashed rectangle showing usable area
    const edgeTrim = board.isOffcut ? 0 : (options.edgeTrim || 0);
    if (edgeTrim > 0) {
      const etScale = edgeTrim * scale;
      doc.setDrawColor(200, 200, 215);
      doc.setLineWidth(0.15);
      doc.setLineDashPattern([1, 1.5], 0);
      doc.rect(dx + etScale, dy + etScale, dw - etScale * 2, dh - etScale * 2, 'S');
      doc.setLineDashPattern([], 0);
      doc.setLineWidth(0.2);
    }

    // Dimension labels
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${board.stockWidth} mm`, dx + dw / 2, dy - 2, { align: 'center' });
    // Vertical dim — rotated
    doc.text(`${board.stockHeight} mm`, dx - 4, dy + dh / 2, { angle: 90 });

    // ── Draw pieces ──
    board.pieces.forEach((piece) => {
      const colorIdx = allPieceIds.indexOf(piece.id) >= 0 ? allPieceIds.indexOf(piece.id) : 0;
      const color = getPieceColor(colorIdx);
      const rgb = hexToRgb(color.border);

      const px = dx + piece.x * scale;
      const py = dy + piece.y * scale;
      const pw = piece.placedWidth * scale;
      const ph = piece.placedHeight * scale;

      // Filled rect with slight transparency
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.setDrawColor(40, 40, 55);
      doc.setLineWidth(0.3);

      doc.setGState(doc.GState({ opacity: 0.75 }));
      doc.rect(px, py, pw, ph, 'FD');
      doc.setGState(doc.GState({ opacity: 1 }));
      doc.setLineWidth(0.2);

      // Label inside piece
      if (pw > 12 && ph > 7) {
        doc.setFontSize(pw > 30 ? 7 : 5.5);
        doc.setTextColor(...WHITE);
        const label = sanitizeText(piece.name || `P${piece.id}`);
        const isRotated = piece.rotated || (piece.placedWidth !== piece.width);
        const dims = piece.placedWidth + 'x' + piece.placedHeight + (isRotated ? ' (rot)' : '');
        doc.text(label, px + pw / 2, py + ph / 2 - 1.5, { align: 'center' });
        doc.setFontSize(pw > 30 ? 6 : 5);
        doc.setTextColor(220, 220, 240);
        doc.text(dims, px + pw / 2, py + ph / 2 + 2.5, { align: 'center' });
      }
    });

    // ── Draw scrap/offcut overlays with diagonal hatching ──
    if (board.offcuts && board.offcuts.length > 0) {
      board.offcuts.forEach((oc, i) => {
        const px = dx + oc.x * scale;
        const py = dy + oc.y * scale;
        const pw = oc.width * scale;
        const ph = oc.height * scale;

        // Light gray background
        doc.setGState(doc.GState({ opacity: 0.25 }));
        doc.setFillColor(120, 120, 140);
        doc.rect(px, py, pw, ph, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));

        // Diagonal hatching lines — manually clipped to rect bounds
        doc.setDrawColor(160, 160, 180);
        doc.setLineWidth(0.2);
        const step = 3;
        for (let d = -ph; d < pw + ph; d += step) {
          const x1 = px + d;
          const y1 = py;
          const x2 = px + d - ph;
          const y2 = py + ph;
          const clipped = clipLineToRect(x1, y1, x2, y2, px, py, pw, ph);
          if (clipped) {
            doc.line(clipped[0], clipped[1], clipped[2], clipped[3]);
          }
        }

        // Dashed border
        doc.setDrawColor(140, 140, 160);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.rect(px, py, pw, ph, 'S');
        doc.setLineDashPattern([], 0);
        doc.setLineWidth(0.2);

        // Label
        if (pw > 10 && ph > 6) {
          const labelSize = pw > 25 ? 6.5 : 5;
          doc.setFontSize(labelSize);
          doc.setTextColor(100, 100, 120);
          doc.text(`R${i + 1}: ${oc.width}x${oc.height}`, px + pw / 2, py + ph / 2, { align: 'center' });
        }
      });
    }
  });

  /* ═══════════════════════════════════════════════════════ */
  /*  CUT SEQUENCE PAGES — ALL cuts, fully paginated         */
  /* ═══════════════════════════════════════════════════════ */
  result.boards.forEach((board, idx) => {
    if (!board.cutSequence || board.cutSequence.length === 0) return;

    doc.addPage();
    totalPages++;
    drawAccentBar(doc);

    let cy = 15;
    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    doc.text('SECUENCIA DE CORTES  -  ' + (board.isOffcut ? 'Retazo ' + board.stockWidth + 'x' + board.stockHeight : 'Tablero ' + (idx + 1)), MARGIN, cy);

    // Grain context subtitle
    const seqGrain = stock.grain || 'none';
    const l1Cuts = board.cutSequence.filter(c => c.level === 1).length;
    const l2Cuts = board.cutSequence.filter(c => c.level === 2).length;
    const l3Cuts = board.cutSequence.filter(c => c.level === 3).length;
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    cy += 7;
    const grainNote = seqGrain !== 'none'
      ? `Veta ${seqGrain}`
      : `Sin veta`;
    const countsParts = [l1Cuts && `${l1Cuts} primarios`, l2Cuts && `${l2Cuts} secundarios`, l3Cuts && `${l3Cuts} recortes`].filter(Boolean).join(' + ');
    doc.text(sanitizeText(board.cutSequence.length + ' operaciones  |  ' + countsParts + '  |  ' + grainNote), MARGIN, cy);
    cy += 5;
    drawDivider(doc, cy);
    cy += 6;

    // Table header with NIVEL column
    const drawCutSeqHeader = (doc, cy) => {
      doc.setFillColor(...DARK);
      doc.roundedRect(MARGIN, cy - 4, PAGE_W - MARGIN * 2, 7, 1, 1, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(...WHITE);
      doc.text('#', MARGIN + 4, cy);
      doc.text('NIVEL', MARGIN + 18, cy);
      doc.text('TIPO', MARGIN + 42, cy);
      doc.text('DIRECCION', MARGIN + 65, cy);
      doc.text('POSICION', MARGIN + 120, cy);
      doc.text('KERF', MARGIN + 175, cy);
    };
    drawCutSeqHeader(doc, cy);
    cy += 8;

    board.cutSequence.forEach((cut, i) => {
      // Page break check
      if (cy > PAGE_H - 18) {
        doc.addPage();
        totalPages++;
        drawAccentBar(doc);
        cy = 15;

        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        doc.text('Secuencia de Cortes - Tablero ' + (idx + 1) + ' (cont.)', MARGIN, cy);
        cy += 8;

        // Re-draw table header
        drawCutSeqHeader(doc, cy);
        cy += 8;
      }

      // Alt row
      if (i % 2 === 0) {
        doc.setFillColor(...ROW_ALT);
        doc.rect(MARGIN, cy - 3.5, PAGE_W - MARGIN * 2, 7, 'F');
      }

      // Number badge
      const isHorizontal = cut.type === 'horizontal';
      const badgeColor = isHorizontal ? WARNING : [59, 130, 246];
      doc.setFillColor(...badgeColor);
      doc.roundedRect(MARGIN + 2, cy - 3, 10, 5.5, 1.2, 1.2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);
      doc.text(String(cut.number), MARGIN + 7, cy + 0.5, { align: 'center' });

      // NIVEL badge (L1 = Primary/green, L2 = Secondary/blue, REC = trim/gray)
      const levelLabel = cut.level === 1 ? 'E1' : cut.level === 2 ? 'E2' : 'REC';
      const levelColor = cut.level === 1 ? SUCCESS : cut.level === 2 ? [59, 130, 246] : [100, 116, 139];
      const levelBadgeW = cut.level === 3 ? 14 : 12;
      doc.setFillColor(...levelColor);
      doc.roundedRect(MARGIN + 18, cy - 3, levelBadgeW, 5.5, 1.2, 1.2, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(...WHITE);
      doc.text(levelLabel, MARGIN + 18 + levelBadgeW / 2, cy + 0.5, { align: 'center' });

      // Type indicator (draw a small line instead of unicode arrows)
      doc.setDrawColor(...(isHorizontal ? WARNING : [59, 130, 246]));
      doc.setLineWidth(0.8);
      if (isHorizontal) {
        doc.line(MARGIN + 42, cy - 0.5, MARGIN + 48, cy - 0.5);
      } else {
        doc.line(MARGIN + 45, cy - 2.5, MARGIN + 45, cy + 1);
      }
      doc.setLineWidth(0.2);

      // Direction
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(isHorizontal ? 'Horizontal' : 'Vertical', MARGIN + 50, cy + 0.5);

      // Position
      doc.setTextColor(...LIGHT_TEXT);
      doc.text(
        `A ${cut.position} mm desde ${isHorizontal ? 'arriba' : 'la izquierda'}`,
        MARGIN + 78, cy + 0.5
      );

      // Kerf
      if (cut.kerf > 0) {
        doc.setTextColor(...MUTED);
        doc.text(`${cut.kerf} mm`, MARGIN + 175, cy + 0.5);
      }

      cy += 7;
    });
  });

  /* ═══════════════════════════════════════════════════════ */
  /*  OFFCUTS INVENTORY PAGE                                 */
  /* ═══════════════════════════════════════════════════════ */
  if (allOffcuts.length > 0) {
    doc.addPage();
    totalPages++;
    drawAccentBar(doc);

    let oy = 15;
    doc.setFontSize(16);
    doc.setTextColor(...DARK);
    doc.text('RETAZOS GENERADOS', MARGIN, oy);
    oy += 7;
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`${allOffcuts.length} retazos utiles (>=150x150mm) generados en esta optimizacion`, MARGIN, oy);
    oy += 5;
    drawDivider(doc, oy);
    oy += 6;

    // Table header
    doc.setFillColor(...DARK);
    doc.roundedRect(MARGIN, oy - 4, PAGE_W - MARGIN * 2, 7, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(...WHITE);
    doc.text('#', MARGIN + 4, oy);
    doc.text('LARGO', MARGIN + 20, oy);
    doc.text('ANCHO', MARGIN + 55, oy);
    doc.text('AREA', MARGIN + 90, oy);
    doc.text('ORIGEN', MARGIN + 130, oy);
    oy += 8;

    allOffcuts.forEach((oc, i) => {
      // Page break handling for offcuts
      if (oy > PAGE_H - 18) {
        doc.addPage();
        totalPages++;
        drawAccentBar(doc);
        oy = 15;
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        doc.text('Retazos Generados (cont.)', MARGIN, oy);
        oy += 8;
        doc.setFillColor(...DARK);
        doc.roundedRect(MARGIN, oy - 4, PAGE_W - MARGIN * 2, 7, 1, 1, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(...WHITE);
        doc.text('#', MARGIN + 4, oy);
        doc.text('LARGO', MARGIN + 20, oy);
        doc.text('ANCHO', MARGIN + 55, oy);
        doc.text('AREA', MARGIN + 90, oy);
        doc.text('ORIGEN', MARGIN + 130, oy);
        oy += 8;
      }

      if (i % 2 === 0) {
        doc.setFillColor(...ROW_ALT);
        doc.rect(MARGIN, oy - 3.5, PAGE_W - MARGIN * 2, 7, 'F');
      }

      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      doc.text(String(i + 1), MARGIN + 4, oy + 0.5);

      doc.setTextColor(...ACCENT);
      doc.text(`${oc.width} mm`, MARGIN + 20, oy + 0.5);
      doc.text(`${oc.height} mm`, MARGIN + 55, oy + 0.5);

      doc.setTextColor(...MUTED);
      doc.text(`${((oc.width * oc.height) / 1000000).toFixed(3)} m2`, MARGIN + 90, oy + 0.5);
      doc.text(sanitizeText(oc.source || '-'), MARGIN + 130, oy + 0.5);

      oy += 7;
    });

    // Total area summary
    const totalOffcutArea = allOffcuts.reduce((s, o) => s + (o.width * o.height) / 1000000, 0);
    oy += 4;
    drawDivider(doc, oy);
    oy += 8;
    doc.setFontSize(11);
    doc.setTextColor(...ACCENT);
    doc.text(`Area total de retazos: ${totalOffcutArea.toFixed(3)} m2`, MARGIN, oy);
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  ADD FOOTERS TO ALL PAGES                               */
  /* ═══════════════════════════════════════════════════════ */
  const numPages = doc.getNumberOfPages();
  for (let i = 1; i <= numPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, numPages);
  }

  /* ── Save ── */
  doc.save(`${projectName || 'CutWood'}_cortes.pdf`);
}
