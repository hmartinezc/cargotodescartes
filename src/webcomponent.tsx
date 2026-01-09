/**
 * ============================================================
 * TRAXON CONNECTOR WEB COMPONENT
 * ============================================================
 * Este archivo convierte la aplicación React en un Web Component
 * con Shadow DOM para embeberse en ASP.NET Razor Pages sin
 * conflictos de estilos.
 * 
 * USO DESDE RAZOR PAGES:
 * 
 * 1. Incluir el script:
 *    <script src="traxon-connector.js"></script>
 * 
 * 2. Agregar el componente:
 *    <traxon-connector id="traxonModal"></traxon-connector>
 * 
 * 3. Abrir el modal con datos:
 *    document.getElementById('traxonModal').openWithShipment({
 *      awbNumber: '145-12345678',
 *      origin: 'BOG',
 *      destination: 'MIA',
 *      // ... resto de datos del AWB
 *    });
 * 
 * 4. O abrir con datos de demo:
 *    document.getElementById('traxonModal').open();
 * ============================================================
 */

import { FunctionComponent } from 'preact';
import { useState, useCallback, useEffect } from 'preact/hooks';
import { render } from 'preact';
import { InternalShipment, ShipmentStatus, TransmissionLog, loadConnectorConfig, saveConnectorConfig, ConnectorConfig, DEFAULT_CONNECTOR_CONFIG } from '../types';
import { ChampModal } from '../components/ChampModal';
import { TraxonSendResult, UAT_CONFIG, saveApiConfig, getApiConfig, ApiConfig } from '../services/traxonApiClient';
import { mockShipments } from '../mockData';
import { Plane, Package, MapPin, Building, User, Scale, Layers, Send, ChevronRight, X } from 'lucide-preact';
import tailwindStyles from './index.css?inline';

// ============================================================
// INTERFAZ PARA RESULTADO DE TRANSMISIÓN
// ============================================================
export interface TransmissionResult {
  success: boolean;           // true = transmisión exitosa, false = error
  awbNumber: string;          // Número de AWB transmitido
  timestamp: string;          // Fecha/hora ISO de la transmisión
  summary: string;            // Mensaje descriptivo del resultado
  httpStatus?: number;        // Código HTTP de respuesta
}

// ============================================================
// INTERFAZ PARA DATOS DE ENTRADA CON CONFIGURACIÓN
// ============================================================
export interface ShipmentInputData extends Partial<InternalShipment> {
  // Configuración opcional de API (si se pasa, sobrescribe la guardada)
  apiConfig?: {
    endpoint?: string;        // URL del endpoint Traxon
    password?: string;        // Contraseña del cliente
    senderAddress?: string;   // Dirección PIMA del agente (emisor)
    recipientAddress?: string; // Dirección PIMA de la aerolínea (receptor)
  };
  
  // Callback opcional para recibir el resultado de la transmisión
  // Se llama cuando el usuario hace clic en "Transmitir" y se completa (éxito o error)
  onTransmitResult?: (result: TransmissionResult) => void;
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
#traxon-portal-mount {
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

#traxon-portal-mount:has(.modal-overlay),
#traxon-portal-mount:has(.fixed) {
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
interface TraxonConnectorAppProps {
  initialShipment?: Partial<InternalShipment> | null;
  initialShipments?: Partial<InternalShipment>[] | null; // NUEVO: Array de shipments
  onClose: () => void;
  isVisible: boolean;
  onTransmitResult?: (success: boolean, awbNumber: string, details: {
    timestamp: string;
    summary: string;
    httpStatus?: number;
  }) => void; // Callback para notificar resultado de transmisión
}

const TraxonConnectorApp: FunctionComponent<TraxonConnectorAppProps> = ({ 
  initialShipment,
  initialShipments,
  onClose,
  isVisible,
  onTransmitResult
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
        // Si es uno solo, abrir modal directamente
        if (fullShipments.length === 1) {
          setSelectedShipment(fullShipments[0]);
          setIsModalOpen(true);  // ABRIR MODAL DIRECTAMENTE
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
        setIsModalOpen(true);  // ABRIR MODAL DIRECTAMENTE
        setShowFullScreen(false);
      } 
      // Demo con uno solo
      else {
        setShipments([mockShipments[0]]);
        setSelectedShipment(mockShipments[0]);
        setIsModalOpen(true);  // ABRIR MODAL DIRECTAMENTE
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

  const handleTransmit = useCallback((id: string, payloadJson: string, traxonResult?: TraxonSendResult) => {
    const logId = `log-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const isSuccess = traxonResult?.allSuccess ?? false;
    const responseMessage = traxonResult?.summary || 'Envío procesado';
    const awbStatus = traxonResult?.awbMessage?.statusCode || 0;

    // Obtener AWB number del shipment actual
    const currentAwb = selectedShipment?.awbNumber || '';

    // NOTIFICAR RESULTADO A LA APLICACIÓN PADRE (Razor/Vue)
    if (onTransmitResult) {
      onTransmitResult(isSuccess, currentAwb, {
        timestamp,
        summary: responseMessage,
        httpStatus: awbStatus
      });
    }

    const newLog: TransmissionLog = {
      id: logId,
      timestamp,
      type: 'OUTBOUND',
      status: isSuccess ? 'ACCEPTED' : 'REJECTED',
      payloadJson,
      responseMessage,
      responseTimestamp: new Date().toISOString()
    };

    const finalStatus: ShipmentStatus = isSuccess ? 'ACKNOWLEDGED' : 'REJECTED';
    
    setShipments(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        status: finalStatus,
        traxonResponse: `${responseMessage} (HTTP ${awbStatus})`,
        logs: [newLog, ...(s.logs || [])]
      };
    }));

    if (selectedShipment && selectedShipment.id === id) {
      setSelectedShipment(prev => prev ? ({
        ...prev,
        status: finalStatus,
        traxonResponse: `${responseMessage} (HTTP ${awbStatus})`,
        logs: [newLog, ...(prev.logs || [])]
      }) : null);
    }

    console.log(`✅ Shipment ${id} actualizado: ${finalStatus}`);
  }, [selectedShipment, onTransmitResult]);

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

  // Si es una sola AWB, mostrar SOLO el modal directamente
  if (isSingleAwbMode && selectedShipment) {
    return (
      <ChampModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        shipment={selectedShipment}
        onSave={handleSaveShipment}
        onTransmitSuccess={handleTransmit}
      />
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
        onTransmitSuccess={handleTransmit}
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
    specialHandlingCodes: partial.specialHandlingCodes || [],
    // Special Service Request (opcional) - instrucciones especiales para la aerolínea
    specialServiceRequest: partial.specialServiceRequest || undefined,
    // Override manual del Charge Summary (opcional) - si viene del backend, se usa en lugar del cálculo
    chargeSummaryOverride: partial.chargeSummaryOverride || undefined,
    executionDate: partial.executionDate || new Date().toISOString().split('T')[0],
    executionPlace: partial.executionPlace || 'BOGOTA',
    signature: partial.signature || 'AVTOPF',
    hasHouses: partial.hasHouses ?? false,
    houseBills: normalizedHouses,
    logs: partial.logs || []
  };
}

// ============================================================
// WEB COMPONENT CLASS
// ============================================================
class TraxonConnectorElement extends HTMLElement {
  private portalMountRef: HTMLDivElement | null = null;
  private shadowRoot_: ShadowRoot;
  private isVisible: boolean = false;
  private currentShipment: Partial<InternalShipment> | null = null;
  private currentShipments: Partial<InternalShipment>[] | null = null; // NUEVO: Array de shipments
  private mountPoint: HTMLDivElement;
  private portalContainer: HTMLDivElement | null = null;
  private portalShadow: ShadowRoot | null = null;
  
  // Callback para notificar resultado de transmisión (pasado via openWithShipment)
  private transmitResultCallback: ((result: TransmissionResult) => void) | null = null;

  constructor() {
    super();
    
    // Crear Shadow DOM local (para cuando el componente no está visible)
    this.shadowRoot_ = this.attachShadow({ mode: 'open' });
    
    // Crear punto de montaje dentro del shadow
    this.mountPoint = document.createElement('div');
    this.mountPoint.id = 'traxon-connector-root';
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
      this.portalContainer.id = 'traxon-connector-portal';
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
      portalMount.id = 'traxon-portal-mount';
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
    const portalMount = shadow.getElementById('traxon-portal-mount') as HTMLDivElement;
    
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
        <TraxonConnectorApp
            initialShipment={this.currentShipment}
            initialShipments={this.currentShipments}
            onClose={() => this.close()}
            isVisible={this.isVisible}
            onTransmitResult={(success, awbNumber, details) => {
              // Crear objeto de resultado
              const result: TransmissionResult = {
                success,
                awbNumber,
                timestamp: details.timestamp,
                summary: details.summary,
                httpStatus: details.httpStatus
              };
              
              // 1. Llamar callback si fue pasado en openWithShipment
              if (this.transmitResultCallback) {
                this.transmitResultCallback(result);
              }
              
              // 2. También disparar evento CustomEvent (para quienes usen addEventListener)
              this.dispatchEvent(new CustomEvent('traxon-transmission-result', { 
                detail: result,
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
   *                       También puede incluir:
   *                       - apiConfig: para sobrescribir endpoint/password/PIMA
   *                       - onTransmitResult: callback que se llama cuando se transmite (éxito o error)
   * 
   * EJEMPLO DE USO CON CALLBACK:
   * traxonModal.openWithShipment({
   *   awbNumber: '145-12345678',
   *   origin: 'BOG',
   *   onTransmitResult: (result) => {
   *     if (result.success) {
   *       // Guardar en BD: result.awbNumber, result.timestamp
   *     }
   *   }
   * });
   */
  openWithShipment(shipmentData: ShipmentInputData) {
    // Si viene configuración de API en el JSON, guardarla
    if (shipmentData.apiConfig) {
      this.setApiConfig(shipmentData.apiConfig);
    }
    
    // Guardar callback si viene
    if (shipmentData.onTransmitResult) {
      this.transmitResultCallback = shipmentData.onTransmitResult;
    } else {
      this.transmitResultCallback = null;
    }
    
    // Extraer solo los datos del shipment (sin apiConfig ni callback)
    const { apiConfig, onTransmitResult, ...shipmentOnly } = shipmentData;
    
    this.currentShipment = shipmentOnly;
    this.currentShipments = null;
    this.isVisible = true;
    this.setAttribute('data-visible', 'true');
    this.renderApp();
    
    // Disparar evento
    this.dispatchEvent(new CustomEvent('traxon-opened', { 
      detail: { shipment: shipmentOnly, mode: 'single', hasApiConfig: !!apiConfig },
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * NUEVO: Abre el modal con múltiples shipments (lista con buscador)
   * @param shipmentsData - Array de AWBs (pueden ser parciales)
   * @param apiConfig - Configuración opcional de API para todos los shipments
   */
  openWithShipments(shipmentsData: ShipmentInputData[], apiConfig?: Partial<ApiConfig>) {
    // Si viene configuración de API, guardarla
    if (apiConfig) {
      this.setApiConfig(apiConfig);
    }
    
    // Limpiar apiConfig de cada shipment
    const shipmentsOnly = shipmentsData.map(s => {
      const { apiConfig: _, ...shipmentOnly } = s;
      return shipmentOnly;
    });
    
    this.currentShipment = null;
    this.currentShipments = shipmentsOnly;
    this.isVisible = true;
    this.setAttribute('data-visible', 'true');
    this.renderApp();
    
    // Disparar evento
    this.dispatchEvent(new CustomEvent('traxon-opened', { 
      detail: { shipments: shipmentsOnly, mode: 'multiple', count: shipmentsOnly.length },
      bubbles: true,
      composed: true 
    }));
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
    
    this.dispatchEvent(new CustomEvent('traxon-opened', { 
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
    
    this.dispatchEvent(new CustomEvent('traxon-closed', { 
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Obtiene la configuración actual del conector
   */
  getConfig(): ConnectorConfig {
    return loadConnectorConfig();
  }

  /**
   * Configura los parámetros de conexión a la API de Traxon
   * @param config - endpoint, password, senderAddress (PIMA emisor), recipientAddress (PIMA receptor)
   */
  setApiConfig(config: Partial<ApiConfig>) {
    saveApiConfig(config);
    
    this.dispatchEvent(new CustomEvent('traxon-api-config-updated', { 
      detail: { 
        endpoint: config.endpoint ? '***configured***' : undefined,
        password: config.password ? '***configured***' : undefined,
        senderAddress: config.senderAddress,
        recipientAddress: config.recipientAddress
      },
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Obtiene la configuración actual de la API
   */
  getApiConfig(): ApiConfig {
    return getApiConfig();
  }

  /**
   * Actualiza la configuración del conector (endpoint, password, etc.)
   */
  setConfig(config: Partial<ConnectorConfig>) {
    const current = loadConnectorConfig();
    const updated = { ...current, ...config };
    saveConnectorConfig(updated);
    
    this.dispatchEvent(new CustomEvent('traxon-config-updated', { 
      detail: { config: updated },
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Resetea la configuración a valores por defecto
   */
  resetConfig() {
    saveConnectorConfig(DEFAULT_CONNECTOR_CONFIG);
    
    this.dispatchEvent(new CustomEvent('traxon-config-reset', { 
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
if (!customElements.get('traxon-connector')) {
  customElements.define('traxon-connector', TraxonConnectorElement);
}

// Exportar para uso programático
export { TraxonConnectorElement };
export default TraxonConnectorElement;

// Declaración de tipos para TypeScript en el host
declare global {
  interface HTMLElementTagNameMap {
    'traxon-connector': TraxonConnectorElement;
  }
  
  namespace preact.JSX {
    interface IntrinsicElements {
      'traxon-connector': JSX.HTMLAttributes<TraxonConnectorElement>;
    }
  }
}
