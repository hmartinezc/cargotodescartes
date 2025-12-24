/**
 * ============================================================
 * FULLSCREEN AWB VIEW COMPONENT
 * ============================================================
 * Vista de página completa para visualizar toda la información
 * de una guía Master AWB. Se muestra cuando el usuario abre
 * el componente desde Razor con una sola AWB.
 * 
 * Características:
 * - Vista fullscreen (100vh x 100vw)
 * - Toda la información visible sin scroll excesivo
 * - Soporte para múltiples rutas/vuelos
 * - Botón de cancelar visible
 * - Botón para abrir el modal de edición/envío
 * ============================================================
 */

import React from 'react';
import { InternalShipment, ShipmentStatus } from '../types';
import { 
  Plane, Package, MapPin, Building, User, Scale, Layers, 
  Send, ChevronRight, X, Calendar, Clock, FileText, 
  ArrowRight, Briefcase, ShieldCheck, DollarSign
} from 'lucide-react';

interface FullScreenAwbViewProps {
  shipment: InternalShipment;
  onOpenModal: () => void;
  onClose: () => void;
  getStatusBadge?: (status: ShipmentStatus) => React.ReactNode;
}

// Componente para mostrar badge de status
const StatusBadge: React.FC<{ status: ShipmentStatus }> = ({ status }) => {
  const config = {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', label: 'Draft' },
    TRANSMITTED: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', label: 'Pending' },
    ACKNOWLEDGED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'Confirmed' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Rejected' }
  };
  const c = config[status] || config.DRAFT;
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <FileText size={12} className="mr-1" />
      {c.label}
    </span>
  );
};

// Componente para mostrar múltiples rutas/vuelos
const RouteCard: React.FC<{ shipment: InternalShipment }> = ({ shipment }) => {
  const flights = shipment.flights || [];
  const hasMultipleFlights = flights.length > 1;
  
  // Si no hay vuelos, mostrar solo origen -> destino básico
  if (flights.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4 text-purple-600">
          <MapPin size={18} />
          <h3 className="font-semibold text-slate-800">Ruta</h3>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">{shipment.origin}</div>
            <div className="text-xs text-slate-500 uppercase mt-1">Origen</div>
          </div>
          <div className="flex-1 mx-4 relative">
            <div className="h-0.5 rounded-full" style={{ background: 'linear-gradient(to right, #38bdf8, #9333ea)' }}></div>
            <Plane size={20} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-600 bg-white" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">{shipment.destination}</div>
            <div className="text-xs text-slate-500 uppercase mt-1">Destino</div>
          </div>
        </div>
      </div>
    );
  }

  // Construir la cadena de rutas desde los vuelos
  const routePoints: string[] = [];
  flights.forEach((flight, idx) => {
    if (idx === 0) {
      routePoints.push(flight.origin);
    }
    routePoints.push(flight.destination);
  });

  // Eliminar duplicados consecutivos
  const uniquePoints = routePoints.filter((point, idx) => idx === 0 || point !== routePoints[idx - 1]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-purple-600">
          <MapPin size={18} />
          <h3 className="font-semibold text-slate-800">Ruta</h3>
        </div>
        {hasMultipleFlights && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
            {flights.length} vuelos
          </span>
        )}
      </div>
      
      {/* Visualización de ruta con múltiples puntos */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {uniquePoints.map((point, idx) => (
          <React.Fragment key={`${point}-${idx}`}>
            <div className="text-center flex-shrink-0">
              <div className={`text-2xl font-bold ${idx === 0 ? 'text-purple-600' : idx === uniquePoints.length - 1 ? 'text-green-600' : 'text-slate-700'}`}>
                {point}
              </div>
              <div className="text-xs text-slate-500 uppercase mt-1">
                {idx === 0 ? 'Origen' : idx === uniquePoints.length - 1 ? 'Destino' : 'Escala'}
              </div>
            </div>
            {idx < uniquePoints.length - 1 && (
              <div className="flex-1 mx-3 relative min-w-[60px]">
                <div className="h-0.5 rounded-full" style={{ background: 'linear-gradient(to right, #c084fc, #9333ea)' }}></div>
                <Plane size={16} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-600 bg-white" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Detalles de vuelos si hay múltiples */}
      {hasMultipleFlights && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 uppercase mb-2 font-semibold">Detalle de Vuelos</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {flights.map((flight, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-2 flex items-center gap-2 text-sm">
                <div className="bg-purple-100 text-purple-600 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-semibold text-slate-800 truncate">{flight.flightNumber}</div>
                  <div className="text-xs text-slate-500">{flight.origin} → {flight.destination}</div>
                </div>
                <div className="text-xs text-slate-400 flex-shrink-0">
                  {flight.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info de vuelo único */}
      {!hasMultipleFlights && flights.length === 1 && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1">
            <Plane size={14} className="text-purple-500" />
            <span className="font-mono font-semibold">{flights[0].flightNumber}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={14} className="text-slate-400" />
            <span>{flights[0].date}</span>
          </div>
          {flights[0].time && (
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-slate-400" />
              <span>{flights[0].time}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const FullScreenAwbView: React.FC<FullScreenAwbViewProps> = ({ 
  shipment, 
  onOpenModal, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ backgroundColor: '#f9fafb' }}>
      
      {/* ========== HEADER ========== */}
      <header className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg text-white">
              <Plane size={20} />
            </div>
            <h1 className="text-xl font-bold" style={{ background: 'linear-gradient(to right, #7c3aed, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Champ Traxon Connector
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              Authenticated: <span className="font-semibold text-green-600">Connected</span>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Cerrar / Cancelar"
            >
              <X size={18} />
              <span className="text-sm font-medium">Cancelar</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTENT - Scrollable ========== */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* ========== AWB HEADER CARD ========== */}
          <div className="rounded-2xl p-6 md:p-8 text-white shadow-xl mb-6" style={{ background: 'linear-gradient(to bottom right, #9333ea, #7c3aed, #6b21a8)' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package size={20} className="opacity-80" />
                  <span className="text-purple-200 text-sm font-medium uppercase tracking-wider">Air Waybill</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-wide">{shipment.awbNumber}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <StatusBadge status={shipment.status} />
                  {shipment.hasHouses ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-400/20 text-purple-100 border border-purple-400/30">
                      <Layers size={12} className="mr-1" />
                      Consolidado ({shipment.houseBills?.length || 0} Houses)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
                      <Package size={12} className="mr-1" />
                      Directo
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onOpenModal}
                className="bg-white text-purple-700 hover:bg-purple-50 font-semibold px-6 py-3 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Send size={18} />
                <span>{shipment.status === 'DRAFT' ? 'Revisar y Enviar' : 'Ver Detalles'}</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* ========== INFO CARDS GRID ========== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Ruta - Con soporte para múltiples vuelos */}
            <RouteCard shipment={shipment} />

            {/* Carga */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4 text-green-600">
                <Scale size={18} />
                <h3 className="font-semibold text-slate-800">Carga</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-900">{shipment.pieces}</div>
                  <div className="text-xs text-slate-500 uppercase mt-1">Piezas</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-900">{shipment.weight}</div>
                  <div className="text-xs text-slate-500 uppercase mt-1">{shipment.weightUnit === 'KILOGRAM' ? 'KG' : 'LB'}</div>
                </div>
              </div>
              {shipment.volume && (
                <div className="mt-3 bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-700">{shipment.volume}</div>
                  <div className="text-xs text-purple-500 uppercase">
                    {shipment.volumeUnit === 'CUBIC_METRE' ? 'm³' : 'cm³'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== SHIPPER & CONSIGNEE ========== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Shipper */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4 text-purple-600">
                <Building size={18} />
                <h3 className="font-semibold text-slate-800">Shipper (Remitente)</h3>
              </div>
              <div className="text-lg text-slate-900 font-semibold mb-2">{shipment.shipper.name}</div>
              {shipment.shipper.name2 && (
                <div className="text-sm text-slate-700 mb-2">{shipment.shipper.name2}</div>
              )}
              <div className="text-sm text-slate-600 space-y-1">
                <div>{shipment.shipper.address.street}</div>
                {shipment.shipper.address.street2 && <div>{shipment.shipper.address.street2}</div>}
                <div className="font-medium">
                  {shipment.shipper.address.place}
                  {shipment.shipper.address.state && `, ${shipment.shipper.address.state}`}
                  , {shipment.shipper.address.countryCode}
                </div>
                {shipment.shipper.address.postalCode && (
                  <div className="text-slate-500">CP: {shipment.shipper.address.postalCode}</div>
                )}
              </div>
              {shipment.shipper.taxId && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
                  <span className="text-slate-500">NIT/Tax ID:</span>
                  <span className="ml-2 font-mono font-semibold text-slate-700">{shipment.shipper.taxId}</span>
                </div>
              )}
            </div>

            {/* Consignee */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4 text-purple-600">
                <User size={18} />
                <h3 className="font-semibold text-slate-800">Consignee (Destinatario)</h3>
              </div>
              <div className="text-lg text-slate-900 font-semibold mb-2">{shipment.consignee.name}</div>
              {shipment.consignee.name2 && (
                <div className="text-sm text-slate-700 mb-2">{shipment.consignee.name2}</div>
              )}
              <div className="text-sm text-slate-600 space-y-1">
                <div>{shipment.consignee.address.street}</div>
                {shipment.consignee.address.street2 && <div>{shipment.consignee.address.street2}</div>}
                <div className="font-medium">
                  {shipment.consignee.address.place}
                  {shipment.consignee.address.state && `, ${shipment.consignee.address.state}`}
                  , {shipment.consignee.address.countryCode}
                </div>
                {shipment.consignee.address.postalCode && (
                  <div className="text-slate-500">CP: {shipment.consignee.address.postalCode}</div>
                )}
              </div>
              {shipment.consignee.taxId && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
                  <span className="text-slate-500">NIT/Tax ID:</span>
                  <span className="ml-2 font-mono font-semibold text-slate-700">{shipment.consignee.taxId}</span>
                </div>
              )}
            </div>
          </div>

          {/* ========== AGENT & CHARGES ========== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Agent */}
            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl border border-purple-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-purple-700">
                <Briefcase size={18} />
                <h3 className="font-semibold">Agente de Carga (IATA)</h3>
              </div>
              <div className="text-lg text-purple-900 font-semibold mb-2">{shipment.agent.name}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-purple-600 text-xs uppercase">Código IATA</span>
                  <div className="font-mono font-bold text-purple-800">{shipment.agent.iataCode}</div>
                </div>
                {shipment.agent.cassCode && (
                  <div>
                    <span className="text-purple-600 text-xs uppercase">Código CASS</span>
                    <div className="font-mono font-bold text-purple-800">{shipment.agent.cassCode}</div>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-purple-600 text-xs uppercase">Ciudad</span>
                  <div className="font-semibold text-purple-800">{shipment.agent.place}</div>
                </div>
              </div>
            </div>

            {/* Resumen de Cargos */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-green-600">
                <DollarSign size={18} />
                <h3 className="font-semibold text-slate-800">Resumen de Cargos</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Moneda:</span>
                  <span className="font-bold text-slate-800">{shipment.currency}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Método de Pago:</span>
                  <span className={`font-bold ${shipment.paymentMethod === 'Prepaid' ? 'text-green-600' : 'text-purple-600'}`}>
                    {shipment.paymentMethod === 'Prepaid' ? 'Prepagado' : 'Por Cobrar'}
                  </span>
                </div>
                {shipment.rates && shipment.rates.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Total Cargos:</span>
                      <span className="font-bold text-lg text-green-700">
                        {shipment.currency} {shipment.rates.reduce((sum, r) => sum + (r.total || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========== HOUSES (si es consolidado) ========== */}
          {shipment.hasHouses && shipment.houseBills && shipment.houseBills.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-purple-600">
                  <Layers size={18} />
                  <h3 className="font-semibold text-slate-800">House Waybills</h3>
                </div>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {shipment.houseBills.length} houses
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {shipment.houseBills.map((house, idx) => (
                  <div key={house.id || idx} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-purple-100 text-purple-600 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div className="font-mono font-semibold text-slate-800 truncate">{house.hawbNumber}</div>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <Building size={12} className="text-slate-400" />
                        <span className="truncate">{house.shipperName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="truncate">{house.consigneeName}</span>
                      </div>
                    </div>
                    <div className="flex justify-between mt-3 pt-2 border-t border-slate-200 text-xs text-slate-500">
                      <span>{house.pieces} pcs</span>
                      <span>{house.weight} kg</span>
                      <span className="truncate max-w-[80px]" title={house.natureOfGoods}>{house.natureOfGoods}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========== DESCRIPCIÓN ========== */}
          {shipment.description && (
            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
              <span className="text-sm text-slate-500">Descripción de Mercancía: </span>
              <span className="font-medium text-slate-800">{shipment.description}</span>
            </div>
          )}

          {/* ========== SPECIAL HANDLING CODES ========== */}
          {shipment.specialHandlingCodes && shipment.specialHandlingCodes.length > 0 && (
            <div className="mt-4 bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2 text-purple-700">
                <ShieldCheck size={16} />
                <span className="font-semibold text-sm">Códigos de Manejo Especial</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shipment.specialHandlingCodes.map((code) => (
                  <span key={code} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="bg-white border-t border-slate-200 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="text-sm text-slate-500">
              <span className="font-semibold">Status:</span> {shipment.status} | 
              <span className="ml-2 font-semibold">Tipo:</span> {shipment.hasHouses ? 'Consolidado' : 'Directo'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={onOpenModal}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 shadow-md"
              >
                <Send size={16} />
                {shipment.status === 'DRAFT' ? 'Revisar y Enviar' : 'Ver Detalles'}
              </button>
            </div>
          </div>
          
          {/* Powered by */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Powered by <span className="font-semibold text-slate-500">Avatar Cargo</span> & <span className="font-semibold text-purple-500">Traxon</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FullScreenAwbView;

