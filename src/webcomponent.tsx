/**
 * ============================================================
 * CARGO-IMP EDI WEB COMPONENT
 * ============================================================
 * Este archivo convierte la aplicación Preact en un Web Component
 * con Shadow DOM para embeberse en ASP.NET Razor Pages sin
 * conflictos de estilos.
 * 
 * Genera mensajes EDI (FWB/FHL) en formato CARGO-IMP para
 * copiar y enviar manualmente via comunicación con aerolíneas.
 * 
 * USO DESDE RAZOR PAGES:
 * 
 * 1. Incluir el script:
 *    <script src="cargo-imp-connector.js"></script>
 * 
 * 2. Agregar el componente:
 *    <cargo-imp-connector id="ediModal"></cargo-imp-connector>
 * 
 * 3. Abrir el modal con datos:
 *    document.getElementById('ediModal').openWithShipment({
 *      awbNumber: '145-12345678',
 *      origin: 'BOG',
 *      destination: 'MIA',
 *      // ... resto de datos del AWB
 *    });
 * 
 * 4. O abrir con datos de demo:
 *    document.getElementById('ediModal').open();
 * ============================================================
 */

import { FunctionComponent } from 'preact';
import { useState, useCallback, useEffect } from 'preact/hooks';
import { render } from 'preact';
import { InternalShipment, ShipmentStatus, TransmissionLog, loadConnectorConfig, saveConnectorConfig, ConnectorConfig, DEFAULT_CONNECTOR_CONFIG } from '../types';
import { ChampModal, CargoImpResult } from '../components/ChampModal';
import { FullScreenAwbView, FullScreenViewMode } from '../components/FullScreenAwbView';
import { mockShipments } from '../mockData';
import { getDefaultSphCodes, getAwbPrefix } from '../services/champService';
import { Plane, Package, MapPin, Building, User, Scale, Layers, Send, ChevronRight, X } from 'lucide-preact';
import tailwindStyles from './index.css?inline';

// ============================================================
// INTERFAZ PARA RESULTADO DE COPIA EDI
// ============================================================
export interface CopyResult {
  success: boolean;           // true = EDI copiado correctamente
  awbNumber: string;          // Número de AWB
  timestamp: string;          // Fecha/hora ISO
  summary: string;            // Mensaje descriptivo
  ediContent?: string;        // Contenido EDI copiado (FWB + FHL)
}

// ============================================================
// INTERFAZ PARA DATOS DE ENTRADA
// ============================================================
export interface ShipmentInputData extends Partial<InternalShipment> {
  // Callback opcional para recibir el resultado cuando se copia EDI
  onCopyResult?: (result: CopyResult) => void;
  /** Rol del usuario: 'ADM' = admin (ve Editor Completo y todos los tabs), otros = limitado */
  userRole?: string;
}

// ============================================================
// CSS EMBEBIDO (se inyectará en el Shadow DOM)
// ============================================================
const STRUCTURAL_STYLES = `
/* Reset básico para Shadow DOM del Portal */
:host {
  /* No usar all: initial para evitar perder estilos de Tailwind en prod */
  display: block !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
  /* Forzar nuevo stacking context */
  isolation: isolate !important;
  contain: layout style !important;
}

:host([data-visible="true"]) {
  pointer-events: auto !important;
}

/* Contenedor raíz del portal */
#cargo-imp-portal-mount {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
}

#cargo-imp-portal-mount:has(.modal-overlay),
#cargo-imp-portal-mount:has(.fixed) {
  pointer-events: auto !important;
}

*, *::before, *::after {
  box-sizing: border-box;
}

/* ===================================================== */
/* ESTILOS CRÍTICOS PARA PRODUCCIÓN                     */
/* Aseguran layout correcto independiente de Tailwind   */
/* ===================================================== */

/* Flexbox container para la vista fullscreen */
.fixed.inset-0.flex.flex-col {
  display: flex !important;
  flex-direction: column !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
}

/* Flex-1 para contenido scrolleable */
.flex-1 {
  flex: 1 1 0% !important;
}

/* Flex-shrink-0 para header/footer */
.flex-shrink-0 {
  flex-shrink: 0 !important;
}

/* Overflow para scrolling */
.overflow-y-auto {
  overflow-y: auto !important;
}

.overflow-hidden {
  overflow: hidden !important;
}

/* Footer siempre visible al fondo */
footer.flex-shrink-0 {
  flex-shrink: 0 !important;
  margin-top: auto !important;
}

/* Header siempre arriba */
header.flex-shrink-0 {
  flex-shrink: 0 !important;
}

/* Modal overlay */
.modal-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background-color: rgba(0, 0, 0, 0.5) !important;
  z-index: 50 !important;
}

/* Modal content */
.modal-content {
  display: flex !important;
  flex-direction: column !important;
  background-color: white !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  max-height: 88vh !important;
  overflow: hidden !important;
}

/* Grids básicos */
.grid {
  display: grid !important;
}

.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
.grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }

/* Gap */
.gap-1 { gap: 0.25rem !important; }
.gap-2 { gap: 0.5rem !important; }
.gap-3 { gap: 0.75rem !important; }
.gap-4 { gap: 1rem !important; }
.gap-6 { gap: 1.5rem !important; }

/* Padding y margin críticos */
.p-4 { padding: 1rem !important; }
.p-6 { padding: 1.5rem !important; }
.px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
.px-6 { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
.py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
.py-3 { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
.py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
.py-6 { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }
.mb-4 { margin-bottom: 1rem !important; }
.mb-6 { margin-bottom: 1.5rem !important; }

/* Colores de fondo críticos */
.bg-white { background-color: #ffffff !important; }
.bg-gray-50 { background-color: #f9fafb !important; }
.bg-slate-50 { background-color: #f8fafc !important; }
.bg-purple-50 { background-color: #faf5ff !important; }
.bg-purple-600 { background-color: #9333ea !important; }
.bg-purple-700 { background-color: #7c3aed !important; }

/* Colores de texto críticos */
.text-white { color: #ffffff !important; }
.text-slate-500 { color: #64748b !important; }
.text-slate-600 { color: #475569 !important; }
.text-slate-700 { color: #334155 !important; }
.text-slate-800 { color: #1e293b !important; }
.text-slate-900 { color: #0f172a !important; }
.text-purple-600 { color: #9333ea !important; }
.text-purple-700 { color: #7c3aed !important; }

/* Bordes */
.border { border-width: 1px !important; border-style: solid !important; }
.border-t { border-top-width: 1px !important; border-top-style: solid !important; }
.border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; }
.border-slate-100 { border-color: #f1f5f9 !important; }
.border-slate-200 { border-color: #e2e8f0 !important; }
.border-slate-300 { border-color: #cbd5e1 !important; }

/* Rounded */
.rounded { border-radius: 0.25rem !important; }
.rounded-lg { border-radius: 0.5rem !important; }
.rounded-xl { border-radius: 0.75rem !important; }
.rounded-2xl { border-radius: 1rem !important; }
.rounded-full { border-radius: 9999px !important; }

/* Shadow */
.shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important; }
.shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important; }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important; }
.shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important; }

/* CRÍTICO: Gradientes de fondo para vista CompactAwbView */
.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)) !important;
}
.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--tw-gradient-stops)) !important;
}
.from-slate-100 { --tw-gradient-from: #f1f5f9 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(241, 245, 249, 0)) !important; }
.via-purple-50 { --tw-gradient-stops: var(--tw-gradient-from), #faf5ff, var(--tw-gradient-to, rgba(250, 245, 255, 0)) !important; }
.to-indigo-100 { --tw-gradient-to: #e0e7ff !important; }
.from-purple-600 { --tw-gradient-from: #9333ea !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(147, 51, 234, 0)) !important; }
.to-indigo-600 { --tw-gradient-to: #4f46e5 !important; }
.from-purple-700 { --tw-gradient-from: #7c3aed !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(124, 58, 237, 0)) !important; }
.via-purple-800 { --tw-gradient-stops: var(--tw-gradient-from), #6b21a8, var(--tw-gradient-to, rgba(107, 33, 168, 0)) !important; }
.to-indigo-900 { --tw-gradient-to: #312e81 !important; }
.from-sky-300 { --tw-gradient-from: #7dd3fc !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(125, 211, 252, 0)) !important; }
.to-purple-500 { --tw-gradient-to: #a855f7 !important; }
.from-sky-400 { --tw-gradient-from: #38bdf8 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(56, 189, 248, 0)) !important; }
.from-purple-400 { --tw-gradient-from: #c084fc !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(192, 132, 252, 0)) !important; }
.to-purple-600 { --tw-gradient-to: #9333ea !important; }

/* CRÍTICO: Gradientes para header del modal de pre-transmisión */
.from-emerald-500 { --tw-gradient-from: #10b981 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(16, 185, 129, 0)) !important; }
.to-green-500 { --tw-gradient-to: #22c55e !important; }
.from-red-500 { --tw-gradient-from: #ef4444 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(239, 68, 68, 0)) !important; }
.to-orange-500 { --tw-gradient-to: #f97316 !important; }
.from-amber-400 { --tw-gradient-from: #fbbf24 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(251, 191, 36, 0)) !important; }
.to-orange-400 { --tw-gradient-to: #fb923c !important; }

/* Backdrop blur */
.backdrop-blur-sm { backdrop-filter: blur(4px) !important; -webkit-backdrop-filter: blur(4px) !important; }

/* Opacidad de fondo blanco */
.bg-white\/80 { background-color: rgba(255, 255, 255, 0.8) !important; }
.bg-white\/20 { background-color: rgba(255, 255, 255, 0.2) !important; }

/* Colores adicionales de fondo */
.bg-indigo-100 { background-color: #e0e7ff !important; }
.bg-sky-400\/20 { background-color: rgba(56, 189, 248, 0.2) !important; }

/* Sticky positioning */
.sticky { position: sticky !important; }
.top-0 { top: 0 !important; }
.z-10 { z-index: 10 !important; }

/* Colores de texto adicionales */
.text-purple-200 { color: #e9d5ff !important; }
.text-sky-100 { color: #e0f2fe !important; }
.text-green-600 { color: #16a34a !important; }
.text-sky-600 { color: #0284c7 !important; }
.text-amber-700 { color: #b45309 !important; }
.text-red-700 { color: #b91c1c !important; }
.text-indigo-600 { color: #4f46e5 !important; }

/* Bordes adicionales */
.border-sky-400\/30 { border-color: rgba(56, 189, 248, 0.3) !important; }
.border-white\/30 { border-color: rgba(255, 255, 255, 0.3) !important; }

/* Colores de fondo para estados */
.bg-gray-100 { background-color: #f3f4f6 !important; }
.text-gray-600 { color: #4b5563 !important; }
.bg-amber-100 { background-color: #fef3c7 !important; }
.bg-green-100 { background-color: #dcfce7 !important; }
.text-green-700 { color: #15803d !important; }
.bg-red-100 { background-color: #fee2e2 !important; }

/* Overflow */
.overflow-auto { overflow: auto !important; }

/* Flexbox helpers */
.flex { display: flex !important; }
.flex-col { flex-direction: column !important; }
.flex-row { flex-direction: row !important; }
.items-center { align-items: center !important; }
.justify-between { justify-content: space-between !important; }
.justify-center { justify-content: center !important; }

/* Tamaños de texto */
.text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
.text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
.text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
.text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
.text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
.text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; }
.text-3xl { font-size: 1.875rem !important; line-height: 2.25rem !important; }
.text-4xl { font-size: 2.25rem !important; line-height: 2.5rem !important; }

/* Font weights */
.font-medium { font-weight: 500 !important; }
.font-semibold { font-weight: 600 !important; }
.font-bold { font-weight: 700 !important; }

/* Max widths */
.max-w-6xl { max-width: 72rem !important; }
.max-w-7xl { max-width: 80rem !important; }
.mx-auto { margin-left: auto !important; margin-right: auto !important; }

/* Z-index */
.z-50 { z-index: 50 !important; }

/* Inset-0 */
.inset-0 {
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
}

/* Width/Height */
.w-full { width: 100% !important; }
.h-16 { height: 4rem !important; }

/* ===================================================== */
/* CRÍTICO: Estilos para SummaryCards y Pre-Transmit    */
/* Agregados para garantizar consistencia dev/prod       */
/* ===================================================== */

/* SummaryCard - Púrpura uniforme con opacidad */
.bg-purple-50\\/60 { background-color: rgba(250, 245, 255, 0.6) !important; }
.border-purple-200\\/70 { border-color: rgba(233, 213, 255, 0.7) !important; }
.text-purple-400 { color: #c084fc !important; }
.text-purple-500 { color: #a855f7 !important; }
.text-purple-800 { color: #6b21a8 !important; }
.text-purple-900 { color: #581c87 !important; }
.border-purple-200 { border-color: #e9d5ff !important; }

/* Pre-transmit modal - z-index alto */
.z-\\[99999\\] { z-index: 99999 !important; }

/* Scroll container para houses */
.max-h-\\[40vh\\] { max-height: 40vh !important; }

/* Colores de validación */
.bg-red-50 { background-color: #fef2f2 !important; }
.bg-amber-50 { background-color: #fffbeb !important; }
.bg-green-50 { background-color: #f0fdf4 !important; }
.text-red-600 { color: #dc2626 !important; }
.text-amber-600 { color: #d97706 !important; }
.text-green-600 { color: #16a34a !important; }
.text-red-800 { color: #991b1b !important; }
.text-amber-800 { color: #92400e !important; }
.text-green-800 { color: #166534 !important; }

/* Details/Summary collapsible - group-open:rotate-90 */
.group\\/house { /* marker for group */ }
details.group > summary .group-open\\:rotate-90,
.group[open] .group-open\\:rotate-90 { rotate: 90deg !important; }
.group\\/house[open] .group-open\\/house\\:rotate-90 { rotate: 90deg !important; }

/* Hide default summary marker/triangle */
summary.list-none::-webkit-details-marker { display: none !important; }
summary.list-none::marker { display: none !important; content: "" !important; }
.list-none { list-style-type: none !important; }

/* Hover brightness para summary */
.hover\\:brightness-95:hover { filter: brightness(0.95) !important; }

/* User select none */
.select-none { 
  -webkit-user-select: none !important; 
  user-select: none !important; 
}

/* Responsive grids para SummaryCards */
@media (min-width: 768px) {
  .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
  .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
}
@media (min-width: 1024px) {
  .lg\\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
}

/* Backdrop blur para overlay */
.backdrop-blur-sm { 
  backdrop-filter: blur(4px) !important; 
  -webkit-backdrop-filter: blur(4px) !important; 
}

/* Black overlay con opacidad */
.bg-black\\/50 { background-color: rgba(0, 0, 0, 0.5) !important; }

/* Rounded 2xl para modal */
.rounded-2xl { border-radius: 1rem !important; }

/* Max widths para modal */
.max-w-2xl { max-width: 42rem !important; }
.max-w-lg { max-width: 32rem !important; }

/* Shadow 2xl para modal */
.shadow-2xl { 
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important; 
}

/* Space-y para vertical spacing */
.space-y-2 > * + * { margin-top: 0.5rem !important; }
.space-y-3 > * + * { margin-top: 0.75rem !important; }
.space-y-4 > * + * { margin-top: 1rem !important; }

/* Transition-transform para íconos */
.transition-transform { 
  transition-property: transform, rotate !important;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
  transition-duration: 150ms !important;
}

/* Transition-all para animaciones */
.transition-all {
  transition-property: all !important;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
  transition-duration: 150ms !important;
}

/* Cursor pointer */
.cursor-pointer { cursor: pointer !important; }

/* Border-t para separadores */
.border-t { 
  border-top-width: 1px !important; 
  border-top-style: solid !important; 
}
.border-slate-100 { border-color: #f1f5f9 !important; }

/* Flex gap */
.gap-1 { gap: 0.25rem !important; }
.gap-1\\.5 { gap: 0.375rem !important; }
.gap-2 { gap: 0.5rem !important; }

/* Font mono para HAWB numbers */
.font-mono { 
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace !important; 
}

/* ===================================================== */
/* FALLBACKS PARA FullScreenAwbView — Resumen/Detalle,  */
/* Blocking Errors Modal y SendMode Selector             */
/* Estas clases se usan en las tabs de validación,      */
/* el modal de errores bloqueantes y el pie de página    */
/* ===================================================== */

/* Z-index arbitrarios para modales internos */
.z-\\[70\\] { z-index: 70 !important; }
.z-\\[80\\] { z-index: 80 !important; }

/* Backgrounds con opacidad */
.bg-black\\/40 { background-color: rgba(0, 0, 0, 0.4) !important; }
.bg-red-100\\/50 { background-color: rgba(254, 226, 226, 0.5) !important; }
.bg-white\\/60 { background-color: rgba(255, 255, 255, 0.6) !important; }
.bg-white\\/70 { background-color: rgba(255, 255, 255, 0.7) !important; }

/* Fondos sólidos */
.bg-red-500 { background-color: #ef4444 !important; }
.bg-red-600 { background-color: #dc2626 !important; }
.bg-red-200 { background-color: #fecaca !important; }
.bg-amber-200 { background-color: #fde68a !important; }
.bg-amber-600 { background-color: #d97706 !important; }
.bg-green-400\\/20 { background-color: rgba(74, 222, 128, 0.2) !important; }
.bg-purple-100 { background-color: #f3e8ff !important; }

/* Bordes con opacidad */
.border-white\\/50 { border-color: rgba(255, 255, 255, 0.5) !important; }
.border-white\\/60 { border-color: rgba(255, 255, 255, 0.6) !important; }
.border-green-200 { border-color: #bbf7d0 !important; }
.border-green-400\\/30 { border-color: rgba(74, 222, 128, 0.3) !important; }
.border-red-100 { border-color: #fee2e2 !important; }
.border-red-200 { border-color: #fecaca !important; }
.border-amber-200 { border-color: #fde68a !important; }
.border-purple-300 { border-color: #d8b4fe !important; }
.border-slate-700 { border-color: #334155 !important; }

/* Max height/width arbitrarios */
.max-h-\\[120px\\] { max-height: 120px !important; }
.max-h-\\[200px\\] { max-height: 200px !important; }
.max-h-\\[500px\\] { max-height: 500px !important; }
.max-h-\\[50vh\\] { max-height: 50vh !important; }
.max-h-\\[92vh\\] { max-height: 92vh !important; }
.max-w-xl { max-width: 36rem !important; }
.max-w-4xl { max-width: 56rem !important; }

/* Tamaños de texto arbitrarios */
.text-\\[9px\\] { font-size: 9px !important; line-height: 1.2 !important; }
.text-\\[10px\\] { font-size: 10px !important; line-height: 1.2 !important; }
.text-\\[11px\\] { font-size: 11px !important; line-height: 1.3 !important; }

/* Colores de texto con opacidad */
.text-red-500\\/70 { color: rgba(239, 68, 68, 0.7) !important; }

/* Colores de texto sólidos */
.text-green-100 { color: #dcfce7 !important; }
.text-green-300 { color: #86efac !important; }
.text-green-400 { color: #4ade80 !important; }
.text-green-500 { color: #22c55e !important; }
.text-cyan-400 { color: #22d3ee !important; }
.text-cyan-600 { color: #0891b2 !important; }
.text-blue-500 { color: #3b82f6 !important; }
.text-red-400 { color: #f87171 !important; }
.text-red-800 { color: #991b1b !important; }
.text-amber-500 { color: #f59e0b !important; }

/* Space-y */
.space-y-1 > * + * { margin-top: 0.25rem !important; }
.space-y-1\\.5 > * + * { margin-top: 0.375rem !important; }

/* Transforms y transiciones */
.active\\:scale-95:active { transform: scale(0.95) !important; }
.hover\\:scale-105:hover { transform: scale(1.05) !important; }
.transition-colors { 
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke !important;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
  transition-duration: 150ms !important;
}

/* Hover backgrounds */
.hover\\:bg-green-400\\/30:hover { background-color: rgba(74, 222, 128, 0.3) !important; }
.hover\\:bg-amber-50:hover { background-color: #fffbeb !important; }
.hover\\:bg-red-100:hover { background-color: #fee2e2 !important; }
.hover\\:text-red-600:hover { color: #dc2626 !important; }
.hover\\:bg-black\\/5:hover { background-color: rgba(0, 0, 0, 0.05) !important; }

/* Focus ring */
.focus\\:ring-2:focus { 
  --tw-ring-offset-shadow: var(--tw-ring-inset, ) 0 0 0 var(--tw-ring-offset-width, 0px) var(--tw-ring-offset-color, #fff) !important;
  --tw-ring-shadow: var(--tw-ring-inset, ) 0 0 0 calc(2px + var(--tw-ring-offset-width, 0px)) var(--tw-ring-color, #3b82f6) !important;
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000) !important;
}
.focus\\:ring-purple-500:focus { --tw-ring-color: #a855f7 !important; }

/* Animaciones */
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-spin { animation: spin 1s linear infinite !important; }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Tipografía y layout */
.leading-relaxed { line-height: 1.625 !important; }
.h-0\\.5 { height: 0.125rem !important; }
.h-px { height: 1px !important; }
.min-w-0 { min-width: 0 !important; }
.items-start { align-items: flex-start !important; }
.flex-wrap { flex-wrap: wrap !important; }
.inline-flex { display: inline-flex !important; }
.whitespace-pre-wrap { white-space: pre-wrap !important; }
.truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
.outline-none { outline: 2px solid transparent !important; outline-offset: 2px !important; }
.uppercase { text-transform: uppercase !important; }
.opacity-70 { opacity: 0.7 !important; }
.opacity-80 { opacity: 0.8 !important; }

/* Spacing granular */
.p-0\\.5 { padding: 0.125rem !important; }
.p-1\\.5 { padding: 0.375rem !important; }
.p-2\\.5 { padding: 0.625rem !important; }
.p-5 { padding: 1.25rem !important; }
.pb-0\\.5 { padding-bottom: 0.125rem !important; }
.pb-2 { padding-bottom: 0.5rem !important; }
.pb-2\\.5 { padding-bottom: 0.625rem !important; }
.pb-3 { padding-bottom: 0.75rem !important; }
.pt-1 { padding-top: 0.25rem !important; }
.pt-1\\.5 { padding-top: 0.375rem !important; }
.pt-2 { padding-top: 0.5rem !important; }
.px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
.px-1\\.5 { padding-left: 0.375rem !important; padding-right: 0.375rem !important; }
.px-2\\.5 { padding-left: 0.625rem !important; padding-right: 0.625rem !important; }
.px-5 { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
.py-0\\.5 { padding-top: 0.125rem !important; padding-bottom: 0.125rem !important; }
.py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
.py-1\\.5 { padding-top: 0.375rem !important; padding-bottom: 0.375rem !important; }
.py-2\\.5 { padding-top: 0.625rem !important; padding-bottom: 0.625rem !important; }

/* Margins granulares */
.mb-0\\.5 { margin-bottom: 0.125rem !important; }
.mb-1 { margin-bottom: 0.25rem !important; }
.mb-1\\.5 { margin-bottom: 0.375rem !important; }
.mb-3 { margin-bottom: 0.75rem !important; }
.ml-1 { margin-left: 0.25rem !important; }
.ml-1\\.5 { margin-left: 0.375rem !important; }
.mr-1 { margin-right: 0.25rem !important; }
.mt-0\\.5 { margin-top: 0.125rem !important; }
.mt-2 { margin-top: 0.5rem !important; }
.mt-3 { margin-top: 0.75rem !important; }
.mx-3 { margin-left: 0.75rem !important; margin-right: 0.75rem !important; }
.mx-4 { margin-left: 1rem !important; margin-right: 1rem !important; }

/* Translate para centrado absoluto */
.-translate-x-1\\/2 { transform: translateX(-50%) !important; }
.-translate-y-1\\/2 { transform: translateY(-50%) !important; }
.left-1\\/2 { left: 50% !important; }
.top-1\\/2 { top: 50% !important; }

/* Hover utilities adicionales */
.hover\\:underline:hover { text-decoration: underline !important; }
.hover\\:text-slate-600:hover { color: #475569 !important; }
.hover\\:text-slate-700:hover { color: #334155 !important; }
.hover\\:bg-slate-100:hover { background-color: #f1f5f9 !important; }
.hover\\:bg-slate-200:hover { background-color: #e2e8f0 !important; }
.hover\\:bg-slate-50:hover { background-color: #f8fafc !important; }
.hover\\:bg-purple-50:hover { background-color: #faf5ff !important; }
.hover\\:bg-purple-700:hover { background-color: #7c3aed !important; }
.hover\\:bg-slate-700:hover { background-color: #334155 !important; }
.hover\\:bg-amber-700:hover { background-color: #b45309 !important; }

/* Responsive: md */
@media (min-width: 768px) {
  .md\\:flex-row { flex-direction: row !important; }
  .md\\:items-center { align-items: center !important; }
  .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .md\\:text-3xl { font-size: 1.875rem !important; line-height: 2.25rem !important; }
}

/* Responsive: lg */
@media (min-width: 1024px) {
  .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
}

/* Text alignment */
.text-center { text-align: center !important; }
.text-left { text-align: left !important; }
.text-right { text-align: right !important; }

/* Tracking */
.tracking-wide { letter-spacing: 0.025em !important; }
.tracking-wider { letter-spacing: 0.05em !important; }

/* Misc positional */
.absolute { position: absolute !important; }
.relative { position: relative !important; }
.right-0 { right: 0 !important; }
.bottom-0 { bottom: 0 !important; }
.transform { /* noop, activador */ }
.w-4 { width: 1rem !important; }
.w-5 { width: 1.25rem !important; }
.h-4 { height: 1rem !important; }
.h-5 { height: 1.25rem !important; }

/* ===================================================== */
/* FALLBACKS COMPLETOS — Clases faltantes detectadas     */
/* Garantizan consistencia CSS entre dev local y prod    */
/* ===================================================== */

/* ------- PADDING CRÍTICO (afecta badges y tarjetas) ------- */
.p-1 { padding: 0.25rem !important; }
.p-2 { padding: 0.5rem !important; }
.p-3 { padding: 0.75rem !important; }
.px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
.px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
.pt-3 { padding-top: 0.75rem !important; }
.pr-2 { padding-right: 0.5rem !important; }
.pl-3 { padding-left: 0.75rem !important; }
.pl-7 { padding-left: 1.75rem !important; }
.py-5 { padding-top: 1.25rem !important; padding-bottom: 1.25rem !important; }
.py-8 { padding-top: 2rem !important; padding-bottom: 2rem !important; }

/* ------- MARGIN ------- */
.mb-2 { margin-bottom: 0.5rem !important; }
.mt-1 { margin-top: 0.25rem !important; }
.mt-4 { margin-top: 1rem !important; }
.ml-2 { margin-left: 0.5rem !important; }
.ml-4 { margin-left: 1rem !important; }
.ml-8 { margin-left: 2rem !important; }
.ml-auto { margin-left: auto !important; }
.mx-1 { margin-left: 0.25rem !important; margin-right: 0.25rem !important; }
.mx-6 { margin-left: 1.5rem !important; margin-right: 1.5rem !important; }
.-mt-2 { margin-top: -0.5rem !important; }
.-mx-2 { margin-left: -0.5rem !important; margin-right: -0.5rem !important; }

/* ------- FONDOS SÓLIDOS ------- */
.bg-slate-100 { background-color: #f1f5f9 !important; }
.bg-slate-200 { background-color: #e2e8f0 !important; }
.bg-slate-900 { background-color: #0f172a !important; }
.bg-purple-200 { background-color: #e9d5ff !important; }
.bg-purple-300 { background-color: #d8b4fe !important; }
.bg-green-500 { background-color: #22c55e !important; }
.bg-green-600 { background-color: #16a34a !important; }
.bg-red-300 { background-color: #fca5a5 !important; }
.bg-sky-50 { background-color: #f0f9ff !important; }
.bg-sky-100 { background-color: #e0f2fe !important; }
.bg-blue-50 { background-color: #eff6ff !important; }
.bg-blue-100 { background-color: #dbeafe !important; }
.bg-emerald-50 { background-color: #ecfdf5 !important; }
.bg-emerald-100 { background-color: #d1fae5 !important; }
.bg-emerald-600 { background-color: #059669 !important; }
.bg-orange-100 { background-color: #ffedd5 !important; }
.bg-cyan-100 { background-color: #cffafe !important; }
.bg-pink-100 { background-color: #fce7f3 !important; }
.bg-amber-500 { background-color: #f59e0b !important; }
.bg-slate-600 { background-color: #475569 !important; }
.bg-transparent { background-color: transparent !important; }

/* ------- FONDOS CON OPACIDAD ------- */
.bg-red-50\\/70 { background-color: rgba(254, 242, 242, 0.7) !important; }
.bg-amber-50\\/70 { background-color: rgba(255, 251, 235, 0.7) !important; }
.bg-red-100\\/60 { background-color: rgba(254, 226, 226, 0.6) !important; }
.bg-amber-100\\/60 { background-color: rgba(254, 243, 199, 0.6) !important; }
.bg-amber-100\\/50 { background-color: rgba(254, 243, 199, 0.5) !important; }
.bg-white\\/50 { background-color: rgba(255, 255, 255, 0.5) !important; }
.bg-purple-50\\/50 { background-color: rgba(250, 245, 255, 0.5) !important; }
.bg-green-50\\/50 { background-color: rgba(240, 253, 244, 0.5) !important; }
.bg-amber-50\\/50 { background-color: rgba(255, 251, 235, 0.5) !important; }
.bg-red-50\\/50 { background-color: rgba(254, 242, 242, 0.5) !important; }
.bg-slate-50\\/50 { background-color: rgba(248, 250, 252, 0.5) !important; }
.bg-slate-50\\/30 { background-color: rgba(248, 250, 252, 0.3) !important; }
.bg-slate-50\\/95 { background-color: rgba(248, 250, 252, 0.95) !important; }
.bg-sky-50\\/50 { background-color: rgba(240, 249, 255, 0.5) !important; }
.bg-cyan-50\\/30 { background-color: rgba(236, 254, 255, 0.3) !important; }
.bg-green-200\\/70 { background-color: rgba(187, 247, 208, 0.7) !important; }
.bg-red-200\\/70 { background-color: rgba(254, 202, 202, 0.7) !important; }

/* ------- COLORES DE TEXTO ------- */
.text-slate-300 { color: #cbd5e1 !important; }
.text-slate-400 { color: #94a3b8 !important; }
.text-purple-300 { color: #d8b4fe !important; }
.text-red-500 { color: #ef4444 !important; }
.text-blue-600 { color: #2563eb !important; }
.text-blue-700 { color: #1d4ed8 !important; }
.text-blue-800 { color: #1e40af !important; }
.text-blue-100 { color: #dbeafe !important; }
.text-emerald-600 { color: #059669 !important; }
.text-emerald-700 { color: #047857 !important; }
.text-emerald-800 { color: #065f46 !important; }
.text-sky-700 { color: #0369a1 !important; }
.text-sky-800 { color: #075985 !important; }
.text-sky-400 { color: #38bdf8 !important; }
.text-indigo-700 { color: #4338ca !important; }
.text-orange-800 { color: #9a3412 !important; }
.text-cyan-800 { color: #155e75 !important; }
.text-pink-800 { color: #9d174d !important; }
.text-white\\/80 { color: rgba(255, 255, 255, 0.8) !important; }
.text-amber-100 { color: #fef3c7 !important; }

/* ------- BORDES ------- */
.border-gray-200 { border-color: #e5e7eb !important; }
.border-transparent { border-color: transparent !important; }
.border-purple-600 { border-color: #9333ea !important; }
.border-purple-100 { border-color: #f3e8ff !important; }
.border-sky-100 { border-color: #e0f2fe !important; }
.border-sky-200 { border-color: #bae6fd !important; }
.border-cyan-200 { border-color: #a5f3fc !important; }
.border-blue-100 { border-color: #dbeafe !important; }
.border-blue-200 { border-color: #bfdbfe !important; }
.border-blue-300 { border-color: #93c5fd !important; }
.border-amber-100 { border-color: #fef3c7 !important; }
.border-amber-300 { border-color: #fcd34d !important; }
.border-emerald-200 { border-color: #a7f3d0 !important; }
.border-green-300 { border-color: #86efac !important; }
.border-green-400 { border-color: #4ade80 !important; }
.border-red-300 { border-color: #fca5a5 !important; }
.border-red-400 { border-color: #f87171 !important; }
.border-0 { border-width: 0 !important; border-style: none !important; }
.border-2 { border-width: 2px !important; border-style: solid !important; }
.border-b-2 { border-bottom-width: 2px !important; border-bottom-style: solid !important; }
.border-l-2 { border-left-width: 2px !important; border-left-style: solid !important; }

/* ------- ROUNDED VARIANTES ------- */
.rounded-md { border-radius: 0.375rem !important; }
.rounded-t-lg { border-top-left-radius: 0.5rem !important; border-top-right-radius: 0.5rem !important; }

/* ------- HOVER STATES ------- */
.hover\\:bg-red-300:hover { background-color: #fca5a5 !important; }
.hover\\:bg-green-600:hover { background-color: #16a34a !important; }
.hover\\:bg-green-700:hover { background-color: #15803d !important; }
.hover\\:bg-green-100:hover { background-color: #dcfce7 !important; }
.hover\\:bg-red-200:hover { background-color: #fecaca !important; }
.hover\\:bg-purple-100:hover { background-color: #f3e8ff !important; }
.hover\\:bg-purple-200:hover { background-color: #e9d5ff !important; }
.hover\\:bg-amber-200:hover { background-color: #fde68a !important; }
.hover\\:bg-amber-600:hover { background-color: #d97706 !important; }
.hover\\:bg-sky-200:hover { background-color: #bae6fd !important; }
.hover\\:bg-blue-200:hover { background-color: #bfdbfe !important; }
.hover\\:bg-slate-300:hover { background-color: #cbd5e1 !important; }
.hover\\:bg-slate-200\\/50:hover { background-color: rgba(226, 232, 240, 0.5) !important; }
.hover\\:bg-white\\/30:hover { background-color: rgba(255, 255, 255, 0.3) !important; }
.hover\\:bg-emerald-700:hover { background-color: #047857 !important; }
.hover\\:text-purple-600:hover { color: #9333ea !important; }
.hover\\:text-purple-800:hover { color: #6b21a8 !important; }
.hover\\:text-slate-800:hover { color: #1e293b !important; }
.hover\\:text-amber-900:hover { color: #78350f !important; }
.hover\\:opacity-90:hover { opacity: 0.9 !important; }
.hover\\:shadow-md:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) !important; }
.hover\\:shadow-xl:hover { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04) !important; }
.hover\\:border-blue-300:hover { border-color: #93c5fd !important; }

/* ------- FOCUS / DISABLED / PLACEHOLDER ------- */
.cursor-not-allowed { cursor: not-allowed !important; }
.focus\\:ring-1:focus {
  --tw-ring-offset-shadow: var(--tw-ring-inset, ) 0 0 0 var(--tw-ring-offset-width, 0px) var(--tw-ring-offset-color, #fff) !important;
  --tw-ring-shadow: var(--tw-ring-inset, ) 0 0 0 calc(1px + var(--tw-ring-offset-width, 0px)) var(--tw-ring-color, #a855f7) !important;
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000) !important;
}
.focus\\:ring-purple-300:focus { --tw-ring-color: #d8b4fe !important; }
.focus\\:ring-purple-400:focus { --tw-ring-color: #c084fc !important; }
.focus\\:ring-slate-200:focus { --tw-ring-color: #e2e8f0 !important; }
.focus\\:ring-amber-300:focus { --tw-ring-color: #fcd34d !important; }
.focus\\:ring-blue-500:focus { --tw-ring-color: #3b82f6 !important; }
.disabled\\:bg-slate-50:disabled { background-color: #f8fafc !important; }
.disabled\\:bg-slate-400:disabled { background-color: #94a3b8 !important; }
.placeholder\\:text-purple-400::placeholder { color: #c084fc !important; }
.placeholder\\:italic::placeholder { font-style: italic !important; }
.placeholder\\:text-slate-400::placeholder { color: #94a3b8 !important; }

/* ------- TIPOGRAFÍA Y DECORACIONES ------- */
.italic { font-style: italic !important; }
.normal-case { text-transform: none !important; }
.underline { text-decoration-line: underline !important; }
.opacity-50 { opacity: 0.5 !important; }
.resize-none { resize: none !important; }
.whitespace-nowrap { white-space: nowrap !important; }
.overflow-x-auto { overflow-x: auto !important; }

/* ------- TRANSFORMS Y TRANSICIONES ------- */
.rotate-180 { rotate: 180deg !important; }
.duration-200 { transition-duration: 200ms !important; }
.duration-150 { transition-duration: 150ms !important; }
.scale-105 { transform: scale(1.05) !important; }

/* ------- SHADOW & RING ------- */
.shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05) !important; }
.ring-1 {
  --tw-ring-offset-shadow: var(--tw-ring-inset, ) 0 0 0 var(--tw-ring-offset-width, 0px) var(--tw-ring-offset-color, #fff) !important;
  --tw-ring-shadow: var(--tw-ring-inset, ) 0 0 0 calc(1px + var(--tw-ring-offset-width, 0px)) var(--tw-ring-color, rgba(0,0,0,0.05)) !important;
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000) !important;
}
.ring-black\\/5 { --tw-ring-color: rgba(0, 0, 0, 0.05) !important; }

/* ------- ANIMACIONES ------- */
@keyframes bounce {
  0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
  50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
}
.animate-bounce { animation: bounce 1s infinite !important; }

/* ------- SIZING ------- */
.w-6 { width: 1.5rem !important; }
.h-6 { height: 1.5rem !important; }
.h-full { height: 100% !important; }
.h-20 { height: 5rem !important; }
.max-w-md { max-width: 28rem !important; }
.max-w-\\[150px\\] { max-width: 150px !important; }
.max-w-\\[200px\\] { max-width: 200px !important; }
.max-h-\\[85vh\\] { max-height: 85vh !important; }
.max-h-\\[400px\\] { max-height: 400px !important; }
.max-h-64 { max-height: 16rem !important; }
.max-h-96 { max-height: 24rem !important; }
.max-h-40 { max-height: 10rem !important; }
.max-h-32 { max-height: 8rem !important; }
.min-h-\\[28px\\] { min-height: 28px !important; }
.min-h-\\[32px\\] { min-height: 32px !important; }
.min-h-\\[46px\\] { min-height: 46px !important; }
.min-w-\\[120px\\] { min-width: 120px !important; }
.h-\\[34px\\] { height: 34px !important; }

/* ------- GRID HELPERS ------- */
.col-span-2 { grid-column: span 2 / span 2 !important; }
.col-span-3 { grid-column: span 3 / span 3 !important; }
.gap-x-2 { column-gap: 0.5rem !important; }
.gap-y-1\\.5 { row-gap: 0.375rem !important; }

/* ------- GRADIENTES ADICIONALES ------- */
.from-slate-50 { --tw-gradient-from: #f8fafc !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(248, 250, 252, 0)) !important; }
.to-purple-50 { --tw-gradient-to: #faf5ff !important; }
.from-purple-50 { --tw-gradient-from: #faf5ff !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(250, 245, 255, 0)) !important; }
.to-fuchsia-50 { --tw-gradient-to: #fdf4ff !important; }
.from-amber-50 { --tw-gradient-from: #fffbeb !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(255, 251, 235, 0)) !important; }
.to-yellow-50 { --tw-gradient-to: #fefce8 !important; }
.to-orange-50 { --tw-gradient-to: #fff7ed !important; }
.from-green-50 { --tw-gradient-from: #f0fdf4 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(240, 253, 244, 0)) !important; }
.to-emerald-50 { --tw-gradient-to: #ecfdf5 !important; }
.from-emerald-50 { --tw-gradient-from: #ecfdf5 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(236, 253, 245, 0)) !important; }
.to-teal-50 { --tw-gradient-to: #f0fdfa !important; }
.from-green-100 { --tw-gradient-from: #dcfce7 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(220, 252, 231, 0)) !important; }
.to-emerald-100 { --tw-gradient-to: #d1fae5 !important; }
.from-red-100 { --tw-gradient-from: #fee2e2 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(254, 226, 226, 0)) !important; }
.to-orange-100 { --tw-gradient-to: #ffedd5 !important; }
.from-blue-600 { --tw-gradient-from: #2563eb !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(37, 99, 235, 0)) !important; }
.to-blue-700 { --tw-gradient-to: #1d4ed8 !important; }

/* ------- DISPLAY, POSITION, FLEX ------- */
.fixed { position: fixed !important; }
.flex-nowrap { flex-wrap: nowrap !important; }
.list-disc { list-style-type: disc !important; }
.list-inside { list-style-position: inside !important; }

/* ------- GROUP-HOVER / TRANSLATE ------- */
.group:hover .group-hover\\:translate-x-1 { transform: translateX(0.25rem) !important; }
.group:hover .group-hover\\:text-blue-600 { color: #2563eb !important; }

/* ===================================================== */
/* FALLBACKS FINALES — Últimas 25 clases detectadas      */
/* ===================================================== */

/* Animations */
@keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.animate-bounce-in { animation: bounceIn 0.5s ease-out !important; }
.animate-fadeIn { animation: fadeIn 0.3s ease-out !important; }
.animate-in { animation: fadeIn 0.2s ease-out !important; }
.animate-slideInRight { animation: slideInRight 0.3s ease-out forwards !important; }
.slide-in-from-top-1 { animation: fadeIn 0.2s ease-out !important; }

/* Rose / Violet (used in some OCI/validation variants) */
.bg-rose-100 { background-color: #ffe4e6 !important; }
.text-rose-700 { color: #be123c !important; }
.bg-violet-100 { background-color: #ede9fe !important; }
.text-violet-700 { color: #6d28d9 !important; }

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent !important; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.5) !important; border-radius: 3px !important; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(148, 163, 184, 0.8) !important; }

/* Font weight / Flex alignment */
.font-normal { font-weight: 400 !important; }
.items-end { align-items: flex-end !important; }

/* Spacing */
.mr-2 { margin-right: 0.5rem !important; }
.pb-1 { padding-bottom: 0.25rem !important; }
.space-y-6 > * + * { margin-top: 1.5rem !important; }
.space-y-0\\.5 > * + * { margin-top: 0.125rem !important; }

/* Max height */
.max-h-\\[88vh\\] { max-height: 88vh !important; }

/* Widths */
.w-8 { width: 2rem !important; }
.w-16 { width: 4rem !important; }
.w-20 { width: 5rem !important; }
.w-24 { width: 6rem !important; }
.w-28 { width: 7rem !important; }
.w-32 { width: 8rem !important; }

/* Hover: text */
.hover\\:text-red-700:hover { color: #b91c1c !important; }
.hover\\:text-sky-400:hover { color: #38bdf8 !important; }
`;

const EMBEDDED_STYLES = STRUCTURAL_STYLES + tailwindStyles;

// ============================================================
// COMPONENTE: Vista Compacta de AWB (igual que desarrollo)
// ============================================================
interface CompactAwbViewProps {
  shipment: InternalShipment;
  onOpenModal: () => void;
  onClose: () => void;
}

const CompactAwbView: FunctionComponent<CompactAwbViewProps> = ({ shipment, onOpenModal, onClose }) => {
  const getStatusBadge = (status: ShipmentStatus) => {
    const config: Record<ShipmentStatus, { bg: string; text: string; label: string }> = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Borrador' },
      TRANSMITTED: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' },
      ACKNOWLEDGED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmado' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazado' }
    };
    const c = config[status] || config.DRAFT;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  return (
    <div className="fixed inset-0 overflow-auto" style={{ background: 'linear-gradient(to bottom right, #f1f5f9, #faf5ff, #e0e7ff)' }}>
      {/* Header superior */}
      <div className="border-b border-slate-200 sticky top-0 z-10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg shadow-md" style={{ background: 'linear-gradient(to bottom right, #9333ea, #4f46e5)' }}>
              <Plane size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg">Traxon Connector</h1>
              <p className="text-xs text-slate-500">Transmisión de guías aéreas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Contenido centrado */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Header con número de guía destacado - Compacto */}
        <div className="rounded-xl p-5 text-white shadow-lg mb-4" style={{ background: 'linear-gradient(to bottom right, #7c3aed, #6b21a8, #312e81)' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Package size={16} className="opacity-80" />
                  <span className="text-purple-200 text-xs font-medium uppercase tracking-wider">Air Waybill</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold font-mono tracking-wide">{shipment.awbNumber}</h2>
                <div className="flex items-center gap-3 mt-2">
                  {getStatusBadge(shipment.status)}
                  {shipment.hasHouses ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-400/20 text-sky-100 border border-sky-400/30">
                      <Layers size={10} className="mr-1" />
                      {shipment.houseBills.length} Houses
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/30">
                      <Package size={10} className="mr-1" />
                      Directo
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onOpenModal}
                className="bg-white text-purple-700 hover:bg-purple-50 font-semibold px-4 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 text-sm"
              >
                <Send size={16} />
                <span>{shipment.status === 'DRAFT' ? 'Revisar y Enviar' : 'Ver Detalles'}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Tarjetas de información - Compactas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Ruta */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-purple-600">
                <MapPin size={14} />
                <h3 className="font-semibold text-slate-800 text-sm">Ruta</h3>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{shipment.origin}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Origen</div>
                </div>
                <div className="flex-1 mx-3 relative">
                  <div className="h-0.5 rounded-full" style={{ background: 'linear-gradient(to right, #7dd3fc, #a855f7)' }}></div>
                  <Plane size={16} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-600 bg-white" />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{shipment.destination}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Destino</div>
                </div>
              </div>
            </div>

            {/* Carga */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-green-600">
                <Scale size={14} />
                <h3 className="font-semibold text-slate-800 text-sm">Carga</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="text-xl font-bold text-slate-900">{shipment.pieces}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Piezas</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <div className="text-xl font-bold text-slate-900">{shipment.weight}</div>
                  <div className="text-[10px] text-slate-400 uppercase">{shipment.weightUnit === 'KILOGRAM' ? 'KG' : 'LB'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Shipper y Consignee - Compacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Shipper */}
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-sky-600">
                <Building size={14} />
                <h3 className="font-semibold text-slate-800 text-sm">Shipper</h3>
              </div>
              <div className="text-slate-900 font-medium text-sm">{shipment.shipper.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {shipment.shipper.address.place}, {shipment.shipper.address.countryCode}
              </div>
            </div>

            {/* Consignee */}
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-purple-600">
                <User size={14} />
                <h3 className="font-semibold text-slate-800 text-sm">Consignee</h3>
              </div>
              <div className="text-slate-900 font-medium text-sm">{shipment.consignee.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {shipment.consignee.address.place}, {shipment.consignee.address.countryCode}
              </div>
            </div>
          </div>

          {/* Houses (si es consolidado) - Vista compacta */}
          {shipment.hasHouses && shipment.houseBills && shipment.houseBills.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-purple-600">
                  <Layers size={16} />
                  <h3 className="font-semibold text-slate-800 text-sm">House Waybills</h3>
                </div>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  {shipment.houseBills.length} houses
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                {shipment.houseBills.map((house, idx) => (
                  <div key={house.id || idx} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5 text-xs">
                    <span className="bg-purple-100 text-purple-600 font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-medium text-slate-800 truncate">{house.hawbNumber}</div>
                      <div className="text-slate-400 truncate">{house.pieces}pcs • {house.weight}kg</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Descripción - Más compacta */}
          {shipment.description && (
            <div className="bg-slate-50 rounded-lg px-3 py-2 text-center text-xs">
              <span className="text-slate-500">Descripción: </span>
              <span className="font-medium text-slate-700">{shipment.description}</span>
            </div>
          )}
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE WRAPPER INTERNO
// ============================================================
interface CargoImpConnectorAppProps {
  initialShipment?: Partial<InternalShipment> | null;
  initialShipments?: Partial<InternalShipment>[] | null;
  onClose: () => void;
  isVisible: boolean;
  onCopyResult?: (success: boolean, awbNumber: string, details: {
    timestamp: string;
    summary: string;
    ediContent?: string;
  }) => void;
  /** Callback cuando el usuario guarda la configuración desde el panel */
  onSaveConfig?: (config: ConnectorConfig) => void;
  /** Rol del usuario: 'ADM' = admin, otros roles = limitado */
  userRole?: string;
}

const CargoImpConnectorApp: FunctionComponent<CargoImpConnectorAppProps> = ({ 
  initialShipment,
  initialShipments,
  onClose,
  isVisible,
  onCopyResult,
  onSaveConfig,
  userRole
}) => {
  const [shipments, setShipments] = useState<InternalShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<InternalShipment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  // Detectar modo: una sola AWB o múltiples
  const isSingleAwbMode = shipments.length === 1;

  // Cuando cambia la visibilidad o los datos iniciales, actualizar el estado
  useEffect(() => {
    if (isVisible) {
      // Si hay un array de shipments, usarlos
      if (initialShipments && initialShipments.length > 0) {
        const fullShipments = initialShipments.map(s => createShipmentFromPartial(s));
        setShipments(fullShipments);
        // Si es uno solo, mostrar vista compacta de transmisión directa (sin abrir ChampModal)
        if (fullShipments.length === 1) {
          setSelectedShipment(fullShipments[0]);
          setIsModalOpen(false);  // NO abrir ChampModal, se muestra FullScreenAwbView en transmit mode
          setShowFullScreen(false);
        } else {
          setShowFullScreen(false);
        }
      }
      // Si hay un solo shipment (API anterior)
      else if (initialShipment && Object.keys(initialShipment).length > 0) {
        const fullShipment = createShipmentFromPartial(initialShipment);
        setShipments([fullShipment]);
        setSelectedShipment(fullShipment);
        setIsModalOpen(false);  // NO abrir ChampModal, se muestra FullScreenAwbView en transmit mode
        setShowFullScreen(false);
      } 
      // Demo con uno solo
      else {
        setShipments([mockShipments[0]]);
        setSelectedShipment(mockShipments[0]);
        setIsModalOpen(false);  // NO abrir ChampModal, se muestra FullScreenAwbView en transmit mode
        setShowFullScreen(false);
      }
    } else {
      setIsModalOpen(false);
      setShowFullScreen(false);
    }
  }, [isVisible, initialShipment, initialShipments]);

  const handleSaveShipment = useCallback((updated: InternalShipment) => {
    setShipments(prev => prev.map(s => s.id === updated.id ? updated : s));
    setSelectedShipment(updated);
  }, []);

  // Handler cuando se copia EDI exitosamente
  const handleCopyResult = useCallback((id: string, ediContent: string) => {
    const logId = `log-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Obtener AWB number del shipment actual
    const currentAwb = selectedShipment?.awbNumber || '';

    // Notificar resultado a la aplicación padre (Razor/Vue)
    if (onCopyResult) {
      onCopyResult(true, currentAwb, {
        timestamp,
        summary: 'EDI copiado al portapapeles',
        ediContent
      });
    }

    const newLog: TransmissionLog = {
      id: logId,
      timestamp,
      type: 'OUTBOUND',
      status: 'ACCEPTED',
      payloadJson: ediContent,
      responseMessage: 'EDI copiado exitosamente',
      responseTimestamp: new Date().toISOString()
    };
    
    setShipments(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        logs: [newLog, ...(s.logs || [])]
      };
    }));

    console.log(`✅ EDI copiado para shipment ${id}`);
  }, [selectedShipment, onCopyResult]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // En modo single AWB, cerrar todo directamente
    if (shipments.length === 1) {
      setSelectedShipment(null);
      onClose();  // Cerrar completamente
    } else {
      setSelectedShipment(null);
    }
  }, [shipments.length, onClose]);

  // Cerrar completamente (desde vista fullscreen o múltiples)
  const handleCloseAll = useCallback(() => {
    setIsModalOpen(false);
    setShowFullScreen(false);
    setSelectedShipment(null);
    onClose();
  }, [onClose]);

  // Abrir modal desde la vista fullscreen
  const handleOpenModalFromFullScreen = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleOpenModal = useCallback((shipment: InternalShipment) => {
    setSelectedShipment(shipment);
    setIsModalOpen(true);
  }, []);

  if (!isVisible) return null;

  // Si es una sola AWB, mostrar vista compacta de transmisión directa (DEFAULT)
  // El ChampModal completo se abre desde el botón "Editor Completo"
  if (isSingleAwbMode && selectedShipment) {
    return (
      <>
        <FullScreenAwbView
          shipment={selectedShipment}
          mode="transmit"
          onClose={handleCloseModal}
          onOpenModal={handleOpenModalFromFullScreen}
          userRole={userRole}
          onTransmitSuccess={(shipmentId, summary) => {
            console.log(`✅ Transmisión exitosa para ${shipmentId}: ${summary}`);
            if (onCopyResult) {
              onCopyResult(true, selectedShipment.awbNumber, {
                timestamp: new Date().toISOString(),
                summary: `Transmitido: ${summary}`,
                ediContent: summary
              });
            }
          }}
        />
        <ChampModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          shipment={selectedShipment}
          onSave={handleSaveShipment}
          onCopySuccess={handleCopyResult}
          onSaveConfig={onSaveConfig}
          userRole={userRole}
        />
      </>
    );
  }

  // Si son múltiples AWBs, mostrar la lista con el modal
  return (
    <>
      <MultipleShipmentsView 
        shipments={shipments}
        onSelectShipment={handleOpenModal}
        onClose={handleCloseAll}
      />
      <ChampModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        shipment={selectedShipment}
        onSave={handleSaveShipment}
        onCopySuccess={handleCopyResult}
        onSaveConfig={onSaveConfig}
        userRole={userRole}
      />
    </>
  );
};

// ============================================================
// COMPONENTE: Vista de Múltiples Shipments (para webcomponent)
// ============================================================
interface MultipleShipmentsViewProps {
  shipments: InternalShipment[];
  onSelectShipment: (shipment: InternalShipment) => void;
  onClose: () => void;
}

const MultipleShipmentsView: FunctionComponent<MultipleShipmentsViewProps> = ({
  shipments,
  onSelectShipment,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredShipments = shipments.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.awbNumber.toLowerCase().includes(query) ||
      s.shipper.name.toLowerCase().includes(query) ||
      s.consignee.name.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: ShipmentStatus) => {
    switch(status) {
      case 'TRANSMITTED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Pending</span>;
      case 'ACKNOWLEDGED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Confirmed</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Draft</span>;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Shipment Management</h2>
              <p className="text-blue-100 text-sm">{shipments.length} AWBs para transmitir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar AWB, Shipper, Consignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* List - scrollable content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(70vh - 150px)' }}>
          <div className="space-y-3">
            {filteredShipments.map((shipment) => (
              <div
                key={shipment.id}
                onClick={() => onSelectShipment(shipment)}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold font-mono text-slate-900 group-hover:text-blue-600 transition-colors">
                        {shipment.awbNumber}
                      </span>
                      {getStatusBadge(shipment.status)}
                      {shipment.hasHouses && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Consol ({shipment.houseBills.length})
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm text-slate-600">
                      <div>
                        <span className="text-xs text-slate-400 uppercase block">Ruta</span>
                        <span className="font-semibold">{shipment.origin} → {shipment.destination}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 uppercase block">Shipper</span>
                        <span className="truncate block max-w-[150px]">{shipment.shipper.name}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 uppercase block">Piezas/Peso</span>
                        <span className="font-semibold">{shipment.pieces} pcs / {shipment.weight} kg</span>
                      </div>
                      <div className="flex items-center justify-end">
                        <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredShipments.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No se encontraron guías que coincidan con "{searchQuery}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-sm text-slate-600">
          Selecciona una guía para revisar y transmitir a Traxon
        </div>
      </div>
    </div>
  );
};

// ============================================================
// HELPER: Normalizar valores de entrada del backend
// Acepta múltiples formatos y los convierte al formato interno
// ============================================================
function normalizeWeightUnit(unit: string | undefined): 'KILOGRAM' | 'POUND' {
  if (!unit) return 'KILOGRAM';
  const normalized = unit.toUpperCase().trim();
  // Aceptar múltiples formatos
  if (['KG', 'KGS', 'KILOGRAM', 'KILOGRAMS', 'KILO', 'KILOS'].includes(normalized)) {
    return 'KILOGRAM';
  }
  if (['LB', 'LBS', 'POUND', 'POUNDS', 'LIBRA', 'LIBRAS'].includes(normalized)) {
    return 'POUND';
  }
  return 'KILOGRAM'; // Default
}

function normalizeVolumeUnit(unit: string | undefined): 'CUBIC_CENTIMETRE' | 'CUBIC_METRE' | undefined {
  if (!unit) return undefined;
  const normalized = unit.toUpperCase().trim();
  if (['CM3', 'CM³', 'CUBIC_CENTIMETRE', 'CUBIC_CENTIMETER', 'CC'].includes(normalized)) {
    return 'CUBIC_CENTIMETRE';
  }
  if (['M3', 'M³', 'CUBIC_METRE', 'CUBIC_METER', 'CBM'].includes(normalized)) {
    return 'CUBIC_METRE';
  }
  return 'CUBIC_METRE'; // Default
}

function normalizePaymentMethod(method: string | undefined): 'Prepaid' | 'Collect' {
  if (!method) return 'Prepaid';
  const normalized = method.toUpperCase().trim();
  if (['COLLECT', 'COL', 'C', 'COBRAR', 'POR_COBRAR'].includes(normalized)) {
    return 'Collect';
  }
  if (['PREPAID', 'PRE', 'P', 'PP', 'PREPAGO', 'PAGADO'].includes(normalized)) {
    return 'Prepaid';
  }
  return 'Prepaid'; // Default
}

function normalizeStatus(status: string | undefined): ShipmentStatus {
  if (!status) return 'DRAFT';
  const normalized = status.toUpperCase().trim();
  if (['DRAFT', 'BORRADOR', 'NUEVO', 'NEW'].includes(normalized)) return 'DRAFT';
  if (['TRANSMITTED', 'ENVIADO', 'SENT', 'PENDING'].includes(normalized)) return 'TRANSMITTED';
  if (['ACKNOWLEDGED', 'ACK', 'CONFIRMADO', 'CONFIRMED', 'OK'].includes(normalized)) return 'ACKNOWLEDGED';
  if (['REJECTED', 'RECHAZADO', 'ERROR', 'FAILED'].includes(normalized)) return 'REJECTED';
  return 'DRAFT';
}

function normalizeDimensionUnit(unit: string | undefined): 'CENTIMETRE' | 'INCH' {
  if (!unit) return 'CENTIMETRE';
  const normalized = unit.toUpperCase().trim();
  if (['IN', 'INCH', 'INCHES', 'PULGADA', 'PULGADAS'].includes(normalized)) {
    return 'INCH';
  }
  return 'CENTIMETRE'; // Default (CM, CENTIMETRE, etc.)
}

function normalizeRateClassCode(code: string | undefined): string {
  if (!code) return 'QUANTITY_RATE';

  const upper = code.toUpperCase().trim();

  // Códigos cortos → valores largos que usa el formulario
  const shortToLong: Record<string, string> = {
    'Q': 'QUANTITY_RATE',
    'N': 'NORMAL_RATE',
    'M': 'MINIMUM_CHARGE',
    'B': 'BASIC_CHARGE',
    'C': 'SPECIFIC_COMMODITY_RATE',
    'K': 'RATE_PER_KILOGRAM',
    'R': 'CLASS_RATE_REDUCTION',
    'S': 'CLASS_RATE_SURCHARGE',
    'E': 'INTERNATIONAL_PRIORITY_SERVICE_RATE',
    'X': 'UNIT_LOAD_DEVICE_ADDITIONAL_INFORMATION',
    'Y': 'UNIT_LOAD_DEVICE_ADDITIONAL_RATE',
    'U': 'UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE',
    'W': 'UNIT_LOAD_DEVICE_DISCOUNT'
  };

  if (shortToLong[upper]) {
    return shortToLong[upper];
  }

  // Mantener si ya viene en formato largo esperado
  const allowedLong = new Set(Object.values(shortToLong));
  if (allowedLong.has(upper)) {
    return upper;
  }

  // Fallback seguro
  return 'QUANTITY_RATE';
}

function normalizeOtherChargeEntitlement(entitlement: string | undefined): 'DueCarrier' | 'DueAgent' {
  if (!entitlement) return 'DueAgent';
  const normalized = entitlement.toUpperCase().trim();
  if (['DUECARRIER', 'DUE_CARRIER', 'CARRIER', 'C', 'AEROLINEA'].includes(normalized)) {
    return 'DueCarrier';
  }
  return 'DueAgent'; // Default
}

// Normalizar un Party (Shipper/Consignee)
function normalizeParty(party: any, defaultParty: any): any {
  if (!party) return defaultParty;
  return {
    name: party.name || defaultParty.name,
    name2: party.name2 || '',
    accountNumber: party.accountNumber || '',
    taxId: party.taxId || party.nit || party.ruc || '', // Aceptar múltiples nombres
    address: {
      street: party.address?.street || party.direccion || defaultParty.address.street,
      street2: party.address?.street2 || '',
      place: party.address?.place || party.address?.city || party.ciudad || defaultParty.address.place,
      state: party.address?.state || party.address?.provincia || '',
      countryCode: (party.address?.countryCode || party.address?.country || party.pais || defaultParty.address.countryCode).toUpperCase().substring(0, 2),
      postalCode: party.address?.postalCode || party.address?.zip || ''
    },
    contact: party.contact || defaultParty.contact || { identifier: 'TE', number: '' }
  };
}

// Normalizar Agent
function normalizeAgent(agent: any, defaultAgent: any): any {
  if (!agent) return defaultAgent;
  return {
    name: agent.name || defaultAgent.name,
    iataCode: agent.iataCode || agent.codigoIata || defaultAgent.iataCode,
    cassCode: agent.cassCode || agent.codigoCass || '',
    place: agent.place || agent.ciudad || defaultAgent.place,
    accountNumber: agent.accountNumber || ''
  };
}

// Normalizar un HouseBill
function normalizeHouseBill(house: any): any {
  // Extraer datos del shipper - puede venir como objeto o campos planos
  const shipperName = house.shipperName || house.shipper?.name || '';
  const shipperTaxId = house.shipperTaxId || house.shipper?.taxId || '';
  const shipperAddress = house.shipperAddress || house.shipper?.address?.street || '';
  const shipperCity = house.shipperCity || house.shipper?.address?.place || '';
  const shipperCountry = house.shipperCountry || house.shipper?.address?.countryCode || '';
  const shipperState = house.shipperState || house.shipper?.address?.state || '';
  const shipperPostalCode = house.shipperPostalCode || house.shipper?.address?.postalCode || '';
  const shipperPhone = house.shipperPhone || house.shipper?.contact?.number || '';
  
  // Extraer datos del consignee - puede venir como objeto o campos planos
  const consigneeName = house.consigneeName || house.consignee?.name || '';
  const consigneeTaxId = house.consigneeTaxId || house.consignee?.taxId || '';
  const consigneeAddress = house.consigneeAddress || house.consignee?.address?.street || '';
  const consigneeCity = house.consigneeCity || house.consignee?.address?.place || '';
  const consigneeCountry = house.consigneeCountry || house.consignee?.address?.countryCode || '';
  const consigneeState = house.consigneeState || house.consignee?.address?.state || '';
  const consigneePostalCode = house.consigneePostalCode || house.consignee?.address?.postalCode || '';
  const consigneePhone = house.consigneePhone || house.consignee?.contact?.number || '';

  return {
    id: house.id || `house-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    messageId: house.messageId,
    hawbNumber: house.hawbNumber || house.numero || '',
    origin: house.origin || '',
    destination: house.destination || '',
    // Shipper campos planos para UI
    shipperName,
    shipperTaxId,
    shipperAddress,
    shipperCity,
    shipperCountry,
    shipperState,
    shipperPostalCode,
    shipperPhone,
    // Consignee campos planos para UI
    consigneeName,
    consigneeTaxId,
    consigneeAddress,
    consigneeCity,
    consigneeCountry,
    consigneeState,
    consigneePostalCode,
    consigneePhone,
    // Cargo
    pieces: house.pieces ?? 0,
    weight: house.weight ?? 0,
    chargeableWeight: house.chargeableWeight ?? house.pesoFacturable ?? undefined,
    volume: house.volume ?? house.volumen ?? undefined,
    volumeCubicMeters: house.volumeCubicMeters ?? house.volumenM3 ?? house.cbm ?? house.volume ?? undefined,
    natureOfGoods: house.natureOfGoods || house.descripcion || '',
    commonName: house.commonName || '',
    htsCodes: house.htsCodes || [],
    // Party completo para API Traxon (construido desde campos planos o existente)
    shipper: house.shipper ? normalizeParty(house.shipper, { name: '', address: { street: '', place: '', countryCode: 'CO', postalCode: '' } }) : (shipperName ? {
      name: shipperName,
      taxId: shipperTaxId,
      address: {
        street: shipperAddress,
        place: shipperCity,
        countryCode: shipperCountry || 'CO',
        state: shipperState,
        postalCode: shipperPostalCode
      },
      contact: shipperPhone ? { identifier: 'TE', number: shipperPhone } : undefined
    } : undefined),
    consignee: house.consignee ? normalizeParty(house.consignee, { name: '', address: { street: '', place: '', countryCode: 'US', postalCode: '' } }) : (consigneeName ? {
      name: consigneeName,
      taxId: consigneeTaxId,
      address: {
        street: consigneeAddress,
        place: consigneeCity,
        countryCode: consigneeCountry || 'US',
        state: consigneeState,
        postalCode: consigneePostalCode
      },
      contact: consigneePhone ? { identifier: 'TE', number: consigneePhone } : undefined
    } : undefined)
  };
}

// Normalizar Rates
function normalizeRate(rate: any): any {
  return {
    pieces: rate.pieces ?? 0,
    weight: rate.weight ?? 0,
    chargeableWeight: rate.chargeableWeight || rate.pesoFacturable,
    rateClassCode: normalizeRateClassCode(rate.rateClassCode),
    rateOrCharge: rate.rateOrCharge ?? rate.tarifa ?? 0,
    total: rate.total ?? 0,
    description: rate.description || rate.descripcion || '',
    // Override manual de descripción de mercancía (opcional)
    goodsDescriptionOverride: rate.goodsDescriptionOverride || rate.descripcionMercancia || undefined,
    commodityCode: rate.commodityCode || '',
    hsCode: rate.hsCode || ''
  };
}

// Normalizar OtherCharges
function normalizeOtherCharge(charge: any): any {
  return {
    code: charge.code || charge.codigo || '',
    entitlement: normalizeOtherChargeEntitlement(charge.entitlement),
    amount: charge.amount ?? charge.monto ?? 0,
    paymentMethod: normalizePaymentMethod(charge.paymentMethod)
  };
}

// Normalizar Dimensions
function normalizeDimension(dim: any): any {
  return {
    length: dim.length ?? dim.largo ?? 0,
    width: dim.width ?? dim.ancho ?? 0,
    height: dim.height ?? dim.alto ?? 0,
    pieces: dim.pieces ?? dim.piezas ?? 1,
    unit: normalizeDimensionUnit(dim.unit)
  };
}

// ============================================================
// HELPER: Crear shipment completo desde datos parciales
// Con normalización automática de todos los campos
// ============================================================
function createShipmentFromPartial(partial: Partial<InternalShipment>): InternalShipment {
  const base = mockShipments[0]; // Usar demo como base
  
  // Normalizar arrays
  const normalizedRates = (partial.rates || base.rates).map(normalizeRate);
  const normalizedHouses = (partial.houseBills || []).map(normalizeHouseBill);
  const normalizedOtherCharges = (partial.otherCharges || []).map(normalizeOtherCharge);
  const normalizedDimensions = partial.dimensions ? partial.dimensions.map(normalizeDimension) : undefined;
  
  return {
    id: partial.id || `shipment-${Date.now()}`,
    messageId: partial.messageId,
    status: normalizeStatus(partial.status),
    traxonResponse: partial.traxonResponse,
    awbNumber: partial.awbNumber || base.awbNumber,
    origin: (partial.origin || base.origin).toUpperCase().substring(0, 3),
    destination: (partial.destination || base.destination).toUpperCase().substring(0, 3),
    pieces: partial.pieces ?? base.pieces,
    weight: partial.weight ?? base.weight,
    weightUnit: normalizeWeightUnit(partial.weightUnit),
    volume: partial.volume,
    volumeUnit: partial.volume ? normalizeVolumeUnit(partial.volumeUnit) : undefined,
    dimensions: normalizedDimensions,
    description: partial.description || base.description,
    commodityCode: partial.commodityCode || base.commodityCode,
    currency: (partial.currency || 'USD').toUpperCase(),
    paymentMethod: normalizePaymentMethod(partial.paymentMethod),
    shipper: normalizeParty(partial.shipper, base.shipper),
    consignee: normalizeParty(partial.consignee, base.consignee),
    agent: normalizeAgent(partial.agent, base.agent),
    routing: partial.routing || base.routing,
    flights: partial.flights || base.flights,
    rates: normalizedRates,
    otherCharges: normalizedOtherCharges,
    oci: partial.oci || [],
    // Auto-poblar SPH desde la política por defecto según AWB prefix si no vienen del backend
    specialHandlingCodes: (partial.specialHandlingCodes && partial.specialHandlingCodes.length > 0)
      ? partial.specialHandlingCodes
      : getDefaultSphCodes(getAwbPrefix(partial.awbNumber || base.awbNumber)),
    // Special Service Request (opcional) - instrucciones especiales para la aerolínea
    specialServiceRequest: partial.specialServiceRequest || undefined,
    // Override manual del Charge Summary (opcional) - si viene del backend, se usa en lugar del cálculo
    chargeSummaryOverride: partial.chargeSummaryOverride || undefined,
    executionDate: partial.executionDate || new Date().toISOString().split('T')[0],
    executionPlace: partial.executionPlace || 'BOGOTA',
    signature: partial.signature || 'AVTOPF',
    // IMPORTANTE: Inferir hasHouses automáticamente si hay houseBills con datos
    hasHouses: partial.hasHouses ?? (normalizedHouses.length > 0),
    houseBills: normalizedHouses,
    logs: partial.logs || [],
    // Configuración de Descartes para transmisión directa (opcional)
    descartesConfig: partial.descartesConfig
  };
}

// ============================================================
// WEB COMPONENT CLASS
// ============================================================
class CargoImpConnectorElement extends HTMLElement {
  private portalMountRef: HTMLDivElement | null = null;
  private shadowRoot_: ShadowRoot;
  private isVisible: boolean = false;
  private currentShipment: Partial<InternalShipment> | null = null;
  private currentShipments: Partial<InternalShipment>[] | null = null;
  private mountPoint: HTMLDivElement;
  private portalContainer: HTMLDivElement | null = null;
  private portalShadow: ShadowRoot | null = null;
  
  // Callback para notificar resultado de copia EDI
  private copyResultCallback: ((result: CopyResult) => void) | null = null;

  // Rol del usuario: 'ADM' = admin (ve Editor Completo y tabs completos)
  private userRole: string = '';

  constructor() {
    super();
    
    // Crear Shadow DOM local (para cuando el componente no está visible)
    this.shadowRoot_ = this.attachShadow({ mode: 'open' });
    
    // Crear punto de montaje dentro del shadow
    this.mountPoint = document.createElement('div');
    this.mountPoint.id = 'cargo-imp-connector-root';
    this.shadowRoot_.appendChild(this.mountPoint);
  }

  /**
   * Crear o obtener el contenedor portal en el body
   * Esto asegura que el modal siempre esté por encima de todo
   */
  private getOrCreatePortal(): { container: HTMLDivElement; shadow: ShadowRoot } {
    if (!this.portalContainer) {
      // Crear contenedor en el body
      this.portalContainer = document.createElement('div');
      this.portalContainer.id = 'cargo-imp-connector-portal';
      this.portalContainer.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        pointer-events: none;
      `;
      document.body.appendChild(this.portalContainer);
      
      // Crear Shadow DOM en el portal para aislar estilos
      this.portalShadow = this.portalContainer.attachShadow({ mode: 'open' });
      
      // Inyectar estilos en el shadow del portal
      const styleSheet = document.createElement('style');
      styleSheet.textContent = EMBEDDED_STYLES;
      this.portalShadow.appendChild(styleSheet);
      
      // Crear punto de montaje en el shadow del portal
      const portalMount = document.createElement('div');
      portalMount.id = 'cargo-imp-portal-mount';
      this.portalShadow.appendChild(portalMount);
    }
    
    return { container: this.portalContainer!, shadow: this.portalShadow! };
  }

  /**
   * Actualizar visibilidad del portal
   */
  private updatePortalVisibility(visible: boolean) {
    if (this.portalContainer) {
      this.portalContainer.style.pointerEvents = visible ? 'auto' : 'none';
      this.portalContainer.setAttribute('data-visible', visible.toString());
    }
  }

  connectedCallback() {
    // Montar Preact - usamos el portal para mejor z-index
    const { shadow } = this.getOrCreatePortal();
    const portalMount = shadow.getElementById('cargo-imp-portal-mount') as HTMLDivElement;
    
    if (portalMount) {
      this.portalMountRef = portalMount;
      this.renderApp();
    }
  }

  disconnectedCallback() {
    // Desmontar Preact
    if (this.portalMountRef) {
      render(null, this.portalMountRef);
      this.portalMountRef = null;
    }
    
    // Limpiar portal del body
    if (this.portalContainer && this.portalContainer.parentNode) {
      this.portalContainer.parentNode.removeChild(this.portalContainer);
      this.portalContainer = null;
      this.portalShadow = null;
    }
  }

  private renderApp() {
    // Actualizar visibilidad del portal
    this.updatePortalVisibility(this.isVisible);
    
    if (this.portalMountRef) {
      render(
        <CargoImpConnectorApp
            initialShipment={this.currentShipment}
            initialShipments={this.currentShipments}
            onClose={() => this.close()}
            isVisible={this.isVisible}
            userRole={this.userRole}
            onCopyResult={(success, awbNumber, details) => {
              // Crear objeto de resultado
              const result: CopyResult = {
                success,
                awbNumber,
                timestamp: details.timestamp,
                summary: details.summary,
                ediContent: details.ediContent
              };
              
              // 1. Llamar callback si fue pasado en openWithShipment
              if (this.copyResultCallback) {
                this.copyResultCallback(result);
              }
              
              // 2. También disparar evento CustomEvent
              this.dispatchEvent(new CustomEvent('cargo-imp-copy-result', { 
                detail: result,
                bubbles: true,
                composed: true 
              }));
            }}
            onSaveConfig={(config) => {
              // Disparar evento con la configuración completa para guardar en BD
              this.dispatchEvent(new CustomEvent('cargo-imp-config-saved', {
                detail: { 
                  config,
                  timestamp: new Date().toISOString()
                },
                bubbles: true,
                composed: true
              }));
            }}
          />,
        this.portalMountRef
      );
    }
  }

  // ============================================================
  // API PÚBLICA - Métodos llamables desde Razor Pages
  // ============================================================

  /**
   * Abre el modal con un shipment específico (una sola AWB)
   * @param shipmentData - Datos del AWB (puede ser parcial, se completan con defaults)
   *                       Puede incluir onCopyResult callback
   * 
   * EJEMPLO DE USO CON CALLBACK Y ROL:
   * ediModal.openWithShipment({
   *   awbNumber: '145-12345678',
   *   origin: 'BOG',
   *   userRole: 'ADM',  // 'ADM' = admin (ve Editor Completo), otro = oculto
   *   onCopyResult: (result) => {
   *     if (result.success) {
   *       console.log('EDI copiado:', result.ediContent);
   *     }
   *   }
   * });
   */
  openWithShipment(shipmentData: ShipmentInputData) {
    // Guardar callback si viene
    if (shipmentData.onCopyResult) {
      this.copyResultCallback = shipmentData.onCopyResult;
    } else {
      this.copyResultCallback = null;
    }
    
    // Guardar rol del usuario - buscar en cualquier variación de case
    // Soporta: userRole, UserRole, userrole, user_role, etc.
    const rawData = shipmentData as any;
    const roleValue = rawData.userRole || rawData.UserRole || rawData.userrole || rawData.USERROLE || rawData.user_role || '';
    if (roleValue) {
      this.userRole = String(roleValue);
    }
    console.log('[CargoImpConnector] userRole recibido:', this.userRole, '| raw keys:', Object.keys(shipmentData).filter(k => k.toLowerCase().includes('role')));
    
    // Extraer solo los datos del shipment (sin callback ni userRole)
    const { onCopyResult, userRole, ...shipmentOnly } = shipmentData;
    
    this.currentShipment = shipmentOnly;
    this.currentShipments = null;
    this.isVisible = true;
    this.setAttribute('data-visible', 'true');
    this.renderApp();
    
    // Disparar evento
    this.dispatchEvent(new CustomEvent('cargo-imp-opened', { 
      detail: { shipment: shipmentOnly, mode: 'single' },
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Abre el modal con múltiples shipments (lista con buscador)
   * @param shipmentsData - Array de AWBs (pueden ser parciales)
   * @param options - Opciones adicionales como userRole
   */
  openWithShipments(shipmentsData: ShipmentInputData[], options?: { userRole?: string }) {
    // Guardar rol si viene en options o en el primer shipment
    if (options?.userRole) {
      this.userRole = options.userRole;
    } else if (shipmentsData[0]?.userRole) {
      this.userRole = shipmentsData[0].userRole;
    }

    // Limpiar callbacks y userRole de cada shipment
    const shipmentsOnly = shipmentsData.map(s => {
      const { onCopyResult, userRole, ...shipmentOnly } = s;
      return shipmentOnly;
    });
    
    this.currentShipment = null;
    this.currentShipments = shipmentsOnly;
    this.isVisible = true;
    this.setAttribute('data-visible', 'true');
    this.renderApp();
    
    // Disparar evento
    this.dispatchEvent(new CustomEvent('cargo-imp-opened', { 
      detail: { shipments: shipmentsOnly, mode: 'multiple', count: shipmentsOnly.length },
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Establece el rol del usuario dinámicamente.
   * @param role - 'ADM' para admin (ve Editor Completo + tabs completos), cualquier otro valor = limitado
   * 
   * EJEMPLO:
   *   ediModal.setUserRole('ADM');   // Habilita Editor Completo
   *   ediModal.setUserRole('OPE');   // Oculta Editor Completo
   */
  setUserRole(role: string) {
    this.userRole = role;
    // Si está visible, re-renderizar para aplicar el cambio
    if (this.isVisible) {
      this.renderApp();
    }
  }

  /**
   * Abre el modal con datos de demo
   */
  open() {
    this.currentShipment = null;
    this.currentShipments = null;
    this.isVisible = true;
    this.setAttribute('data-visible', 'true');
    this.renderApp();
    
    this.dispatchEvent(new CustomEvent('cargo-imp-opened', { 
      detail: { shipment: null, usingDemo: true },
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Cierra el modal
   */
  close() {
    this.isVisible = false;
    this.currentShipment = null;
    this.currentShipments = null;
    this.removeAttribute('data-visible');
    this.renderApp();
    
    this.dispatchEvent(new CustomEvent('cargo-imp-closed', { 
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Obtiene la configuración actual del conector
   */
  /**
   * Obtiene la configuración actual del conector
   */
  getConfig(): ConnectorConfig {
    return loadConnectorConfig();
  }

  /**
   * Carga configuración desde un JSON externo (ej: desde tu base de datos)
   * Usar al abrir el componente para restaurar la configuración del usuario
   * 
   * EJEMPLO DE USO EN RAZOR:
   * ```javascript
   * // Al cargar la página, obtener config de tu BD
   * const savedConfig = await fetch('/api/obtener-politicas').then(r => r.json());
   * 
   * // Cargar en el componente
   * document.getElementById('ediModal').loadConfig(savedConfig);
   * ```
   * 
   * @param config - JSON de configuración (puede ser parcial, se mergea con defaults)
   */
  loadConfig(config: Partial<ConnectorConfig>): void {
    const current = loadConnectorConfig();
    const merged = { ...current, ...config };
    saveConnectorConfig(merged);
    
    // Re-renderizar para aplicar la nueva configuración
    this.renderApp();
    
    this.dispatchEvent(new CustomEvent('cargo-imp-config-loaded', { 
      detail: { config: merged },
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Actualiza la configuración del conector (alias de loadConfig para compatibilidad)
   */
  setConfig(config: Partial<ConnectorConfig>) {
    this.loadConfig(config);
  }

  /**
   * Resetea la configuración a valores por defecto
   */
  resetConfig() {
    saveConnectorConfig(DEFAULT_CONNECTOR_CONFIG);
    
    this.dispatchEvent(new CustomEvent('cargo-imp-config-reset', { 
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Verifica si el modal está abierto
   */
  isOpen(): boolean {
    return this.isVisible;
  }
}

// ============================================================
// REGISTRAR WEB COMPONENT
// ============================================================
// Registrar con nombre principal: traxon-connector
if (!customElements.get('traxon-connector')) {
  customElements.define('traxon-connector', CargoImpConnectorElement);
}

// También registrar alias legacy: cargo-imp-connector (para compatibilidad)
if (!customElements.get('cargo-imp-connector')) {
  // Crear una clase que extiende la original para el alias
  class CargoImpConnectorAlias extends CargoImpConnectorElement {}
  customElements.define('cargo-imp-connector', CargoImpConnectorAlias);
}

// Exportar para uso programático
export { CargoImpConnectorElement };
export default CargoImpConnectorElement;

// Declaración de tipos para TypeScript en el host
declare global {
  interface HTMLElementTagNameMap {
    'traxon-connector': CargoImpConnectorElement;
    'cargo-imp-connector': CargoImpConnectorElement;
  }
  
  namespace preact.JSX {
    interface IntrinsicElements {
      'traxon-connector': JSX.HTMLAttributes<CargoImpConnectorElement>;
      'cargo-imp-connector': JSX.HTMLAttributes<CargoImpConnectorElement>;
    }
  }
}
