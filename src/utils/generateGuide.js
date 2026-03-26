/**
 * CutWood — Generador de Guia Completa PDF (God-Tier Edition)
 * Ejecutar: node src/utils/generateGuide.js
 * Genera: CutWood_Guia_Completa.pdf en la raiz del proyecto
 */
import jsPDFModule from 'jspdf';
const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default || jsPDFModule;


/* ── Colors ── */
const ACCENT = [108, 99, 255];
const DARK = [26, 26, 46];
const MUTED = [140, 140, 160];
const WHITE = [255, 255, 255];
const BG = [248, 249, 252];
const SUCCESS = [16, 185, 129];
const WARNING = [245, 158, 11];
const SECTION_BG = [238, 236, 255];
const BLUE = [59, 130, 246];

const MARGIN = 18;
const PW = 210;   // A4 portrait width
const PH = 297;   // A4 portrait height
let pageNum = 0;

function newPage(doc, title) {
  if (pageNum > 0) doc.addPage();
  pageNum++;
  // Top accent bar
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PW + 10, 4, 'F');
  // Footer
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('CutWood - Guia Completa de Usuario', MARGIN, PH - 6);
  doc.text('Pagina ' + pageNum, PW - MARGIN, PH - 6, { align: 'right' });
  // Section title
  if (title) {
    doc.setFontSize(18);
    doc.setTextColor(...ACCENT);
    doc.text(title, MARGIN, 22);
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 25, PW - MARGIN, 25);
    return 34;
  }
  return 14;
}

function heading(doc, y, text, level = 2) {
  if (y > PH - 20) y = newPage(doc);
  if (level === 2) {
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(text, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    return y + 7;
  }
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.setFont('helvetica', 'bold');
  doc.text(text, MARGIN + 4, y);
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

function para(doc, y, text, indent = 0) {
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 75);
  const lines = doc.splitTextToSize(text, PW - MARGIN * 2 - indent);
  if (y + lines.length * 4.5 > PH - 14) {
    y = newPage(doc);
  }
  doc.text(lines, MARGIN + indent, y);
  return y + lines.length * 4.5 + 2;
}

function bullet(doc, y, text, indent = 6) {
  if (y > PH - 16) y = newPage(doc);
  doc.setFontSize(9.5);
  doc.setTextColor(...ACCENT);
  doc.text('\u2022', MARGIN + indent - 4, y);
  doc.setTextColor(60, 60, 75);
  const lines = doc.splitTextToSize(text, PW - MARGIN * 2 - indent - 2);
  doc.text(lines, MARGIN + indent, y);
  return y + lines.length * 4.5 + 1;
}

function featureBox(doc, y, title, desc) {
  if (y > PH - 28) y = newPage(doc);
  const boxH = 16;
  doc.setFillColor(...SECTION_BG);
  doc.roundedRect(MARGIN, y - 3, PW - MARGIN * 2, boxH, 2, 2, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(MARGIN, y - 3, 3, boxH, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN + 7, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 100);
  doc.text(desc, MARGIN + 7, y + 9);
  return y + boxH + 4;
}

function tipBox(doc, y, text) {
  if (y > PH - 22) y = newPage(doc);
  const lines = doc.splitTextToSize(text, PW - MARGIN * 2 - 14);
  const boxH = lines.length * 4.5 + 6;
  doc.setFillColor(240, 249, 235);
  doc.roundedRect(MARGIN, y - 3, PW - MARGIN * 2, boxH, 2, 2, 'F');
  doc.setFillColor(...SUCCESS);
  doc.rect(MARGIN, y - 3, 3, boxH, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...SUCCESS);
  doc.setFont('helvetica', 'bold');
  doc.text('TIP', MARGIN + 7, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 75);
  doc.text(lines, MARGIN + 7, y + 7);
  return y + boxH + 4;
}

/* ═════════════════════════════════════════════════ */
/*  GENERATE                                         */
/* ═════════════════════════════════════════════════ */
const doc = new jsPDF('portrait', 'mm', 'a4');

/* ── PAGE 1: Cover ── */
pageNum++;
doc.setFillColor(...ACCENT);
doc.rect(0, 0, PW + 10, 4, 'F');

// Branding top right
doc.setFontSize(10);
doc.setTextColor(150);
doc.text('cutwood.vercel.app', PW - MARGIN, 16, { align: 'right' });

// Title block
let y = 55;
doc.setFillColor(...DARK);
doc.roundedRect(MARGIN, y - 10, PW - MARGIN * 2, 60, 4, 4, 'F');

doc.setFontSize(38);
doc.setTextColor(...WHITE);
doc.text('CutWood', MARGIN + 12, y + 8);

doc.setFontSize(15);
doc.setTextColor(...ACCENT);
doc.text('Optimizador de Cortes Profesional', MARGIN + 12, y + 20);

doc.setFontSize(10);
doc.setTextColor(180, 180, 200);
doc.text('Guia Completa de Usuario  |  Motor v3  |  Edicion 2026', MARGIN + 12, y + 32);
doc.text('Secuencia de Cortes con Descomposicion Recursiva', MARGIN + 12, y + 39);

// Version badge
doc.setFillColor(...SUCCESS);
doc.roundedRect(PW - MARGIN - 30, y - 8, 28, 8, 2, 2, 'F');
doc.setFontSize(7);
doc.setTextColor(...WHITE);
doc.text('v3.1 GOD', PW - MARGIN - 16, y - 3, { align: 'center' });

// Feature highlights
y = 125;
doc.setFontSize(13);
doc.setTextColor(...DARK);
doc.setFont('helvetica', 'bold');
doc.text('Funcionalidades Principales', MARGIN, y);
doc.setFont('helvetica', 'normal');
y += 10;

y = featureBox(doc, y, 'Motor de Optimizacion v3',
  'Algoritmo multi-heuristico con 126 variantes: Guillotine + MaxRects + Local Search');
y = featureBox(doc, y, 'Secuencia de Cortes Recursiva',
  'Descomposicion binaria con regla "piezas en ambos lados" - secuencias operativas para panel saw');
y = featureBox(doc, y, 'Drag-to-Pan y Zoom',
  'Canvas interactivo: zoom con +/- y arrastre con mano para navegar tableros grandes');
y = featureBox(doc, y, 'Gestion de Retazos',
  'Almacena, reutiliza y gestiona sobrantes automaticamente con nombres editables');
y = featureBox(doc, y, 'Exportacion PDF Profesional',
  'Diagramas a color, secuencia de cortes con niveles E1/E2/REC, inventario de retazos');
y = featureBox(doc, y, 'Veta, Tapacanto y Costos',
  'Soporte completo para direccion de veta, calculo de tapacanto por pieza y costeo total');
y = featureBox(doc, y, 'Import/Export y Historial',
  'Guardar multiples muebles, importar/exportar JSON, ejemplo predefinido incluido');

// Footer
doc.setFontSize(7);
doc.setTextColor(...MUTED);
doc.text('CutWood - Guia Completa de Usuario', MARGIN, PH - 6);
doc.text('Pagina 1', PW - MARGIN, PH - 6, { align: 'right' });

/* ── PAGE 2: Interfaz ── */
y = newPage(doc, '1. Interfaz General');

y = para(doc, y, 'CutWood tiene una interfaz dividida en tres zonas: el panel lateral izquierdo (sidebar) con todos los controles de entrada, el area central con el diagrama interactivo de cortes, y el panel derecho con estadisticas y secuencia de cortes.');
y += 2;

y = heading(doc, y, 'Panel Lateral (Sidebar)');
y = bullet(doc, y, 'Proyecto/Mueble: nombre del proyecto, guardar, nuevo mueble, historial de proyectos guardados.');
y = bullet(doc, y, 'Piezas de Corte: tabla con 5 filas vacias por defecto para cargar piezas con cantidad, largo, ancho, nombre.');
y = bullet(doc, y, 'Opciones por pieza: veta individual, tapacanto por lado (sup, inf, izq, der), duplicar, eliminar.');
y = bullet(doc, y, 'Tablero y Opciones: tableros predefinidos o personalizado, kerf, margen de borde, veta, precios.');
y = bullet(doc, y, 'Optimizar Cortes: boton que ejecuta el motor v3 y genera el layout optimo.');
y += 3;

y = heading(doc, y, 'Area Central (Canvas)');
y = bullet(doc, y, 'Diagrama SVG interactivo con piezas coloreadas, nombres y dimensiones.');
y = bullet(doc, y, 'Zoom con botones +/- o Ctrl+scroll. El SVG se expande para ocupar todo el espacio disponible.');
y = bullet(doc, y, 'Drag-to-Pan: cuando el zoom agranda el diagrama, arrastre con la mano para navegar.');
y = bullet(doc, y, 'Navegacion entre tableros con flechas cuando se usan multiples tableros.');
y = bullet(doc, y, 'Hover en la secuencia de cortes resalta la linea de corte en el diagrama (dentro de su strip).');
y += 3;

y = heading(doc, y, 'Panel Derecho');
y = bullet(doc, y, 'Estadisticas: aprovechamiento (verde >80%, amarillo >50%, rojo <50%), tableros, piezas, desperdicio.');
y = bullet(doc, y, 'Costos: costo total de tableros + tapacanto si se configuraron precios.');
y = bullet(doc, y, 'Secuencia de cortes: lista paso a paso con tipo, posicion, kerf y piezas afectadas.');
y += 2;

y = heading(doc, y, 'Temas Visual');
y = para(doc, y, 'CutWood soporta tema oscuro (dark) y claro (light). Use el boton de sol/luna en el header para alternar. La preferencia se guarda automaticamente.');

/* ── PAGE 3: Tableros ── */
y = newPage(doc, '2. Configuracion del Tablero');

y = heading(doc, y, 'Tableros Predefinidos');
y = para(doc, y, 'CutWood incluye los tableros mas comunes de la industria argentina:');
y += 1;
y = bullet(doc, y, 'Estandar 2750 x 1830 mm (melamina estandar argentina)');
y = bullet(doc, y, 'Estandar 2600 x 1830 mm (melamina compacta)');
y = bullet(doc, y, 'Melamina 2440 x 1830 mm');
y = bullet(doc, y, 'Melamina 2440 x 1220 mm');
y = bullet(doc, y, 'Compact 1830 x 1830 mm');
y += 3;

y = heading(doc, y, 'Tablero Personalizado');
y = para(doc, y, 'Seleccione "Personalizado" en el dropdown o edite directamente Largo y Ancho. El selector se sincroniza: si los valores coinciden con un preset, lo muestra; si no, muestra "Personalizado".');
y += 3;

y = heading(doc, y, 'Opciones de Corte');
y = bullet(doc, y, 'Kerf (sierra): ancho de la hoja de sierra en mm (tipicamente 3mm). Se descuenta entre cada pieza.');
y = bullet(doc, y, 'Margen de borde: distancia minima desde el borde del tablero (tipicamente 5mm).');
y += 3;

y = heading(doc, y, 'Veta del Tablero');
y = para(doc, y, 'Tres opciones de veta para el tablero:');
y = bullet(doc, y, 'Sin veta: las piezas pueden rotar libremente. Mejor aprovechamiento.');
y = bullet(doc, y, 'Horizontal: fibras de izquierda a derecha. Restringe la rotacion.');
y = bullet(doc, y, 'Vertical: fibras de arriba a abajo.');
y += 2;
y = tipBox(doc, y, 'Usar veta restringe la rotacion de piezas y puede aumentar el desperdicio. Solo activela si el material lo requiere (ej: veteado visible en melamina).');
y += 2;

y = heading(doc, y, 'Precios');
y = bullet(doc, y, 'Precio por tablero: costo de cada placa. Se multiplica por la cantidad de tableros usados.');
y = bullet(doc, y, 'Precio tapacanto por metro: costo del tapacanto por metro lineal. Se calcula automaticamente.');

/* ── PAGE 4: Piezas ── */
y = newPage(doc, '3. Piezas de Corte');

y = heading(doc, y, 'Cargar Piezas');
y = para(doc, y, 'La tabla de piezas arranca con 5 filas vacias listas para llenar. Cada pieza tiene:');
y = bullet(doc, y, 'Cantidad: cuantas unidades de esta pieza se necesitan.');
y = bullet(doc, y, 'Largo (mm): dimension mayor de la pieza.');
y = bullet(doc, y, 'Ancho (mm): dimension menor de la pieza.');
y = bullet(doc, y, 'Nombre/Obs: nombre descriptivo (ej: "Lateral Izq", "Estante", "Fondo").');
y += 2;

y = heading(doc, y, 'Acciones por Pieza');
y = bullet(doc, y, 'Duplicar: crea una copia identica con todos los parametros.');
y = bullet(doc, y, 'Opciones avanzadas (engranaje): abre panel de veta individual y tapacanto por lado.');
y = bullet(doc, y, 'Eliminar: remueve la pieza de la lista.');
y = bullet(doc, y, '+ Agregar pieza: agrega una fila vacia al final de la tabla.');
y += 3;

y = heading(doc, y, 'Tapacanto (Edge Banding)');
y = para(doc, y, 'Para cada pieza se indica en que lados se aplica tapacanto: Superior, Inferior, Izquierdo, Derecho. El sistema calcula automaticamente los metros lineales totales y el costo asociado.');
y += 3;

y = heading(doc, y, 'Pegado desde Excel (Ctrl+V)');
y = para(doc, y, 'Se puede pegar una tabla directamente desde Excel o Google Sheets. El formato esperado es columnas separadas por tabulacion:');
y = bullet(doc, y, 'Cantidad | Largo | Ancho | Nombre');
y = para(doc, y, 'El sistema detecta automaticamente las columnas y crea las piezas.');
y += 2;
y = tipBox(doc, y, 'El pegado rapido es la forma mas eficiente de cargar muchas piezas. Prepare su lista en Excel y peguela directamente.');

/* ── PAGE 5: Motor v3 ── */
y = newPage(doc, '4. Motor de Optimizacion v3');

y = para(doc, y, 'CutWood utiliza un motor de optimizacion de ultima generacion que iguala o supera el rendimiento de software profesional.');
y += 2;

y = heading(doc, y, 'Fase 1: Multi-Heuristic Best-of-N');
y = para(doc, y, 'El motor evalua 126 variantes de empaquetado combinando:');
y = bullet(doc, y, '2 algoritmos de bin-packing: Guillotine (cortes rectos) y MaxRects (rectangulos maximales).');
y = bullet(doc, y, '3 heuristicas: BAF (Best Area Fit), BLF (Bottom-Left Fit), BSSF (Best Short Side Fit).');
y = bullet(doc, y, '2 reglas de split: SLA (Shorter Leftover Axis) y LLA (Longer Leftover Axis).');
y = bullet(doc, y, '7 ordenes de priorizacion: area, perimetro, lado mayor, ancho, largo, diferencia, defecto.');
y = para(doc, y, 'De las 126 combinaciones, se selecciona la que genera menor desperdicio.');
y += 3;

y = heading(doc, y, 'Fase 2: Maximal Rectangles');
y = para(doc, y, 'El algoritmo MaxRects mantiene una lista de todos los rectangulos libres maximales, permitiendo un empaquetado mas eficiente que el Guillotine tradicional, especialmente con piezas de tamanos variados.');
y += 3;

y = heading(doc, y, 'Fase 3: Local Search');
y = para(doc, y, 'Despues del packing, el motor intenta consolidar piezas en menos tableros:');
y = bullet(doc, y, 'Anchor-piece packing: prueba cada pieza como "ancla" del tablero.');
y = bullet(doc, y, 'Random shuffle: permutaciones aleatorias para escapar optimos locales.');
y += 3;

y = heading(doc, y, 'Benchmarks');

// Performance table
const tableY = y;
doc.setFillColor(...ACCENT);
doc.roundedRect(MARGIN, tableY - 4, PW - MARGIN * 2, 7, 1, 1, 'F');
doc.setFontSize(8);
doc.setTextColor(...WHITE);
doc.text('EJEMPLO', MARGIN + 4, tableY);
doc.text('PIEZAS', MARGIN + 50, tableY);
doc.text('CUTWOOD', MARGIN + 80, tableY);
doc.text('LEPTON', MARGIN + 115, tableY);
doc.text('RESULTADO', MARGIN + 145, tableY);
y = tableY + 6;

const benchmarks = [
  ['Ejemplo 1', '30', '15.95%', '13.63%', 'Delta < 2.5%'],
  ['Ejemplo 2', '29', '14.96%', '14.76%', 'Delta < 0.2%'],
  ['Ejemplo 3', '47', '19.21%', '21.03%', 'CutWood GANA'],
  ['Ejemplo 4', '25', '14.21%', '14.36%', 'CutWood GANA'],
  ['Ejemplo 5', '20', '12.3%', '13.12%', 'CutWood GANA'],
];
benchmarks.forEach((row, i) => {
  if (i % 2 === 0) {
    doc.setFillColor(...BG);
    doc.rect(MARGIN, y - 3.5, PW - MARGIN * 2, 6.5, 'F');
  }
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text(row[0], MARGIN + 4, y);
  doc.text(row[1], MARGIN + 50, y);

  doc.setTextColor(...SUCCESS);
  doc.text(row[2], MARGIN + 80, y);

  doc.setTextColor(...MUTED);
  doc.text(row[3], MARGIN + 115, y);

  const isWin = row[4].includes('GANA');
  doc.setTextColor(...(isWin ? SUCCESS : WARNING));
  doc.text(row[4], MARGIN + 145, y);
  y += 6.5;
});
y += 4;
y = para(doc, y, 'Promedio general: CutWood 15.33% desperdicio vs Lepton 15.38%. El motor es instantaneo (<50ms para casos tipicos, <500ms para sets complejos).');

/* ── PAGE 6: Secuencia de Cortes ── */
y = newPage(doc, '5. Secuencia de Cortes');

y = para(doc, y, 'CutWood genera secuencias de corte operativamente validas para panel saw (seccionadora) usando un algoritmo de Descomposicion Recursiva Binaria.');
y += 2;

y = heading(doc, y, 'Algoritmo Recursivo');
y = para(doc, y, 'El algoritmo divide el tablero en regiones cada vez mas pequenas siguiendo reglas estrictas:');
y = bullet(doc, y, 'Regla "Ambos Lados": un corte solo se ejecuta si hay piezas a AMBOS lados de la linea de corte. Esto evita cortar desperdicio prematuramente.');
y = bullet(doc, y, 'Prioridad Peeling: se priorizan cortes que "pelan" una sola pieza del borde del tablero.');
y = bullet(doc, y, 'Proximidad al Borde: entre cortes equivalentes, se elige el mas cercano al borde para minimizar movimiento.');
y += 3;

y = heading(doc, y, 'Niveles de Corte');
y = para(doc, y, 'Cada corte tiene un nivel que indica su etapa en la produccion:');
y = bullet(doc, y, 'E1 (Etapa 1 - verde): cortes primarios de lado a lado del tablero completo.');
y = bullet(doc, y, 'E2 (Etapa 2 - azul): cortes secundarios dentro de una tira o region.');
y = bullet(doc, y, 'REC (Recorte - gris): cortes finales para separar sobrantes del borde de piezas.');
y += 3;

y = heading(doc, y, 'Visualizacion Interactiva');
y = para(doc, y, 'Al pasar el mouse sobre un corte en la lista de secuencia:');
y = bullet(doc, y, 'Se resalta la linea de corte en el diagrama, DENTRO de su region/strip (no de lado a lado).');
y = bullet(doc, y, 'Se muestra la zona de kerf (franja semitransparente roja).');
y = bullet(doc, y, 'Se resaltan las piezas afectadas por ese corte.');
y = bullet(doc, y, 'Se muestra una flecha con la medida exacta de la posicion del corte.');
y += 2;
y = tipBox(doc, y, 'El operador puede seguir la secuencia paso a paso. Cada corte muestra exactamente donde cortar y que piezas separa.');

/* ── PAGE 7: Retazos ── */
y = newPage(doc, '6. Gestion de Retazos');

y = para(doc, y, 'CutWood gestiona automaticamente los sobrantes de cada optimizacion, permitiendo reutilizarlos en futuros proyectos para reducir costos.');
y += 2;

y = heading(doc, y, 'Retazos Generados');
y = para(doc, y, 'Despues de cada optimizacion, el sistema identifica sobrantes >= 150x150mm y los guarda automaticamente. Cada retazo incluye:');
y = bullet(doc, y, 'Nombre editable (por defecto: "Retazo Ancho x Alto").');
y = bullet(doc, y, 'Dimensiones, espesor, origen (de que tablero proviene).');
y = bullet(doc, y, 'Material, marca y color del tablero original.');
y += 3;

y = heading(doc, y, 'Usar Retazos en Optimizacion');
y = para(doc, y, 'Active "Usar retazos al optimizar" para que el motor ubique piezas primero en retazos disponibles antes de usar tableros nuevos. Los retazos usados se consumen automaticamente.');
y += 3;

y = heading(doc, y, 'Agregar Retazos Manualmente');
y = para(doc, y, 'Desde el modal de Retazos puede agregar retazos que tenga en stock fisicamente. Complete las dimensiones y el sistema los considerara en la proxima optimizacion.');
y += 3;

y = heading(doc, y, 'Gestionar');
y = bullet(doc, y, 'Cada retazo se puede eliminar individualmente.');
y = bullet(doc, y, '"Limpiar todos" elimina todos los retazos guardados.');
y = bullet(doc, y, 'Los nombres son editables: haga clic en el nombre para cambiarlo.');

/* ── PAGE 8: PDF Export ── */
y = newPage(doc, '7. Exportacion PDF');

y = para(doc, y, 'CutWood genera un PDF profesional listo para llevar a produccion:');
y += 2;

y = heading(doc, y, 'Pagina 1: Portada y Resumen');
y = bullet(doc, y, 'Titulo del proyecto con fecha.');
y = bullet(doc, y, 'Datos del tablero: dimensiones, espesor, kerf, veta, precio.');
y = bullet(doc, y, 'Stat boxes: aprovechamiento, tableros, piezas, desperdicio, tapacanto, costo total.');
y = bullet(doc, y, 'Tabla de piezas con nombre, dimensiones, cantidad, veta, bordes y area.');
y += 3;

y = heading(doc, y, 'Paginas de Tableros');
y = bullet(doc, y, 'Diagrama a color de cada tablero con piezas etiquetadas.');
y = bullet(doc, y, 'Badge de aprovechamiento por tablero (verde/amarillo/rojo).');
y = bullet(doc, y, 'Retazos con lineas diagonales (hatching) y etiqueta R1, R2, etc.');
y = bullet(doc, y, 'Linea punteada de margen de borde (edge trim).');
y = bullet(doc, y, 'Dimensiones del tablero en mm.');
y += 3;

y = heading(doc, y, 'Secuencia de Cortes en PDF');
y = bullet(doc, y, 'Tabla paginada con cada operacion de corte.');
y = bullet(doc, y, 'Badges de nivel: E1 (verde), E2 (azul), REC (gris).');
y = bullet(doc, y, 'Resumen: N operaciones | X primarios + Y secundarios + Z recortes | Veta.');
y = bullet(doc, y, 'Tipo (horizontal/vertical), posicion exacta y kerf.');
y += 3;

y = heading(doc, y, 'Inventario de Retazos');
y = bullet(doc, y, 'Lista de retazos utiles generados con largo, ancho, area y origen.');
y = bullet(doc, y, 'Area total de retazos para control de stock.');

/* ── PAGE 9: Import/Export ── */
y = newPage(doc, '8. Import/Export y Proyectos');

y = heading(doc, y, 'Guardar Proyectos');
y = para(doc, y, 'Ponga un nombre al mueble y presione el icono de guardar. El proyecto se almacena con todas las piezas, configuracion de tablero y opciones.');
y += 2;

y = heading(doc, y, 'Historial de Muebles');
y = para(doc, y, 'Acceda al historial desde el boton "Historial de Muebles". Incluye:');
y = bullet(doc, y, 'Busqueda por nombre de mueble o pieza.');
y = bullet(doc, y, 'Paginacion cuando tiene muchos proyectos.');
y = bullet(doc, y, 'Boton "Cargar" para restaurar un mueble guardado.');
y = bullet(doc, y, 'Boton "Eliminar" para borrar un proyecto.');
y = bullet(doc, y, 'Proyecto de ejemplo "Modular Ejemplo" siempre disponible.');
y += 3;

y = heading(doc, y, 'Nuevo Mueble');
y = para(doc, y, 'El boton "Nuevo Mueble" guarda automaticamente el proyecto actual (si tiene nombre y piezas) y limpia todo para empezar de cero con 5 filas vacias.');
y += 3;

y = heading(doc, y, 'Export/Import JSON');
y = para(doc, y, 'Desde el header:');
y = bullet(doc, y, 'Exportar (flecha abajo): descarga un archivo JSON con TODOS los datos (proyectos, retazos, configuracion, tema).');
y = bullet(doc, y, 'Importar (flecha arriba): carga un archivo JSON previamente exportado. Restaura todo el estado.');
y += 2;
y = tipBox(doc, y, 'Use Export/Import para hacer backups o para transferir datos entre computadoras.');

/* ── PAGE 10: Tips ── */
y = newPage(doc, '9. Tips y Mejores Practicas');

y = heading(doc, y, 'Maximizar Aprovechamiento');
y = bullet(doc, y, 'Use "Sin veta" si el material lo permite. La rotacion libre mejora hasta un 5%.');
y = bullet(doc, y, 'Agrupe piezas de multiples muebles en un proyecto. Mas piezas = mejor optimizacion.');
y = bullet(doc, y, 'Active "Usar retazos" para aprovechar sobrantes de proyectos anteriores.');
y = bullet(doc, y, 'No descarte retazos pequenos: el sistema guarda todo >= 150x150mm.');
y += 3;

y = heading(doc, y, 'Produccion Fluida');
y = bullet(doc, y, 'Verifique el kerf antes de optimizar. Un kerf incorrecto genera piezas fuera de medida.');
y = bullet(doc, y, 'Use nombres descriptivos (ej: "Lat.Izq", "Est.Sup"). Facilita el armado.');
y = bullet(doc, y, 'Imprima el PDF con la secuencia de cortes. El operario de la seccionadora lo agradecera.');
y = bullet(doc, y, 'Guarde el proyecto antes de optimizar. Se puede recargar desde el historial.');
y = bullet(doc, y, 'Siga la secuencia de cortes en orden: primero E1, luego E2, y al final REC.');
y += 3;

y = heading(doc, y, 'Atajos');
y = bullet(doc, y, 'Ctrl+V en la tabla de piezas: pegar desde Excel/Google Sheets.');
y = bullet(doc, y, 'Ctrl+scroll sobre el diagrama: zoom rapido.');
y = bullet(doc, y, 'Click + arrastrar sobre el diagrama: pan (mover la vista).');
y = bullet(doc, y, 'Arrastrar borde del sidebar: ajustar ancho del panel (20% a 60%).');

/* ── PAGE 11: Soporte ── */
y = newPage(doc, '10. Informacion Tecnica');

y = heading(doc, y, 'Stack Tecnologico');
y = bullet(doc, y, 'Motor: v3 Multi-Heuristic (126 variantes + Local Search + Recursive Cut Sequence)');
y = bullet(doc, y, 'Algoritmos: Guillotine + Maximal Rectangles + Binary Tree Decomposition');
y = bullet(doc, y, 'Frontend: React 18 + Vite + jsPDF + Lucide Icons');
y = bullet(doc, y, 'Persistencia: localStorage (proyectos, retazos, opciones, tema)');
y = bullet(doc, y, 'Deploy: Vercel (cutwood.vercel.app)');
y = bullet(doc, y, 'Rendimiento: <50ms tipico, <500ms maximo para sets complejos');
y += 3;

y = heading(doc, y, 'Navegadores Soportados');
y = bullet(doc, y, 'Chrome/Edge 90+ (recomendado)');
y = bullet(doc, y, 'Firefox 90+');
y = bullet(doc, y, 'Safari 15+');
y += 3;

y = heading(doc, y, 'Contacto y Soporte');
y = para(doc, y, 'CutWood es desarrollado y mantenido por su equipo fundador. Para soporte, consultas comerciales o reportar problemas:');
y += 2;
y = bullet(doc, y, 'Web: cutwood.vercel.app');
y += 4;

// Final accent box
if (y > PH - 35) y = newPage(doc);
doc.setFillColor(...DARK);
doc.roundedRect(MARGIN, y, PW - MARGIN * 2, 20, 3, 3, 'F');
doc.setFontSize(11);
doc.setTextColor(...WHITE);
doc.text('CutWood - Optimizador de Cortes Profesional', MARGIN + 8, y + 8);
doc.setFontSize(9);
doc.setTextColor(...ACCENT);
doc.text('Maximice el aprovechamiento de cada tablero. Ahorre material, tiempo y dinero.', MARGIN + 8, y + 15);

/* ── SAVE ── */
doc.save('CutWood_Guia_Completa.pdf');
console.log('Guia generada: CutWood_Guia_Completa.pdf (' + pageNum + ' paginas)');
