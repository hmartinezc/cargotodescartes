import { useCallback, useMemo, useRef, useState } from 'preact/hooks';
import { FunctionComponent, JSX } from 'preact';
import { mockShipments } from './mockData';
import { InternalShipment, ShipmentStatus, TransmissionLog } from './types';
import { ChampModal } from './components/ChampModal';
import { FullScreenAwbView, FullScreenViewMode } from './components/FullScreenAwbView';
import { Plane, FileText, ArrowRight, CheckCircle, Clock, ShieldCheck, XCircle, Search, Wifi, Package, MapPin, Building, User, Scale, Layers, Send, ChevronRight, Monitor, Zap } from 'lucide-preact';

// ============================================================
// COMPONENTE: Vista de AWB Única (bonita, sin buscador)
// ============================================================
interface SingleAwbViewProps {
  shipment: InternalShipment;
  onOpenModal: (shipment: InternalShipment) => void;
  getStatusBadge: (status: ShipmentStatus) => JSX.Element;
}

const SingleAwbView: FunctionComponent<SingleAwbViewProps> = ({ shipment, onOpenModal, getStatusBadge }) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header con número de guía destacado - Compacto */}
      <div className="bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 rounded-xl p-5 text-white shadow-lg mb-4">
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
            onClick={() => onOpenModal(shipment)}
            className="bg-white text-purple-700 hover:bg-purple-50 font-semibold px-4 py-2.5 rounded-lg shadow-md transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
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
              <div className="h-0.5 bg-gradient-to-r from-sky-300 to-purple-500 rounded-full"></div>
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
      {shipment.hasHouses && shipment.houseBills.length > 0 && (
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
          {/* Grid compacto para houses */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
            {shipment.houseBills.map((house, idx) => (
              <div key={house.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5 text-xs">
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
  );
};

// ============================================================
// COMPONENTE: Vista de Múltiples AWBs (lista con buscador)
// ============================================================
interface MultipleAwbViewProps {
  shipments: InternalShipment[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenModal: (shipment: InternalShipment) => void;
  getStatusBadge: (status: ShipmentStatus) => JSX.Element;
}

const MultipleAwbView: FunctionComponent<MultipleAwbViewProps> = ({ 
  shipments, 
  searchQuery, 
  onSearchChange, 
  onOpenModal, 
  getStatusBadge 
}) => {
  return (
    <>
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Shipment Management</h2>
          <p className="text-slate-500 mt-1">Selecciona un AWB para revisar y transmitir a Champ/Traxon.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar AWB, Shipper, Estado..." 
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none w-full md:w-80 shadow-sm transition-shadow"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid gap-4">
        {shipments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300 text-slate-500">
            No se encontraron guías que coincidan con "{searchQuery}"
          </div>
        ) : (
          shipments.map((shipment) => (
            <div 
              key={shipment.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              {/* Left Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-bold font-mono text-slate-900 group-hover:text-purple-600 transition-colors">
                    {shipment.awbNumber}
                  </span>
                  
                  {getStatusBadge(shipment.status)}

                  <div className="h-4 w-px bg-slate-300 mx-1"></div>

                  {shipment.hasHouses && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                      Consolidation ({shipment.houseBills.length})
                    </span>
                  )}
                  {!shipment.hasHouses && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      Direct
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Origin</span>
                    <span className="font-semibold">{shipment.origin}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Destination</span>
                    <span className="font-semibold">{shipment.destination}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Shipper</span>
                    <span className="truncate max-w-[120px]" title={shipment.shipper.name}>{shipment.shipper.name}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Consignee</span>
                    <span className="truncate max-w-[120px]" title={shipment.consignee.name}>{shipment.consignee.name}</span>
                  </div>
                </div>
              </div>

              {/* Right Stats & Action */}
              <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                <div className="flex flex-col text-right min-w-[80px]">
                  <span className="text-xl font-bold text-slate-800">{shipment.pieces}</span>
                  <span className="text-xs text-slate-400 uppercase">Pieces</span>
                </div>
                <div className="flex flex-col text-right min-w-[80px]">
                  <span className="text-xl font-bold text-slate-800">{shipment.weight}</span>
                  <span className="text-xs text-slate-400 uppercase">{shipment.weightUnit === 'KILOGRAM' ? 'KG' : 'LB'}</span>
                </div>
                <button
                  onClick={() => onOpenModal(shipment)}
                  className="bg-purple-800 hover:bg-purple-600 text-white p-3 rounded-lg transition-all transform active:scale-95 shadow-sm flex items-center gap-2"
                >
                  <span className="hidden md:inline text-sm font-medium">
                    {shipment.status === 'DRAFT' ? 'Review / Edit' : 'View Status'}
                  </span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

// ============================================================
// APP PRINCIPAL
// ============================================================
const App: FunctionComponent = () => {
  // Initialize state with mock data to allow local updates
  // DEMO: Cambiar a mockShipments.slice(0, 1) para ver vista de 1 AWB
  // DEMO: Cambiar a mockShipments para ver vista de múltiples AWBs
  const [shipments, setShipments] = useState<InternalShipment[]>(mockShipments.slice(0, 1)); // ← SOLO 1 ITEM PARA DEMO
  const [selectedShipment, setSelectedShipment] = useState<InternalShipment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ========== Fullscreen AWB View with mode support ==========
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState<FullScreenViewMode>('review');

  // Detectar si es una sola AWB o múltiples
  const isSingleAwbMode = shipments.length === 1;

  // Preact no tiene useDeferredValue nativo, usamos searchQuery directamente
  const deferredSearchQuery = searchQuery;
  const clearSelectionTimeoutRef = useRef<number | null>(null);

  const handleOpenModal = useCallback((shipment: InternalShipment) => {
    if (clearSelectionTimeoutRef.current !== null) {
      window.clearTimeout(clearSelectionTimeoutRef.current);
      clearSelectionTimeoutRef.current = null;
    }
    setSelectedShipment(shipment);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Add a small delay to clear selection for animation smoothness if needed
    if (clearSelectionTimeoutRef.current !== null) {
      window.clearTimeout(clearSelectionTimeoutRef.current);
    }
    clearSelectionTimeoutRef.current = window.setTimeout(() => {
      setSelectedShipment(null);
      clearSelectionTimeoutRef.current = null;
    }, 200);
  }, []);

  // Triggered when data is edited inside the modal
  const handleSaveShipment = useCallback((updatedShipment: InternalShipment) => {
    setShipments(prev => prev.map(s => s.id === updatedShipment.id ? updatedShipment : s));
    setSelectedShipment(updatedShipment);
  }, []);

  // Handle Copy EDI Result (simplificado - sin transmisiones)
  const handleCopyResult = useCallback((id: string, ediContent: string) => {
    const logId = `log-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Create Log Entry for EDI copy
    const newLog: TransmissionLog = {
        id: logId,
        timestamp: timestamp,
        type: 'OUTBOUND',
        status: 'ACCEPTED',
        payloadJson: ediContent,
        responseMessage: 'EDI copiado al portapapeles',
        responseTimestamp: new Date().toISOString()
    };

    // Update shipment with log
    setShipments(prev => prev.map(s => {
        if (s.id !== id) return s;
        return {
            ...s,
            logs: [newLog, ...(s.logs || [])]
        };
    }));
  }, []);

  // Handler para abrir vista fullscreen con modo específico
  const handleOpenFullScreen = useCallback((shipment: InternalShipment, mode: FullScreenViewMode) => {
    setSelectedShipment(shipment);
    setFullScreenMode(mode);
    setShowFullScreen(true);
  }, []);

  // Handler para cuando la transmisión directa es exitosa (desde FullScreenAwbView transmit mode)
  const handleTransmitSuccess = useCallback((shipmentId: string, summary: string) => {
    console.log(`✅ Transmisión exitosa para ${shipmentId}: ${summary}`);
    setShipments(prev => prev.map(s => {
      if (s.id !== shipmentId) return s;
      return { ...s, status: 'TRANSMITTED' as ShipmentStatus };
    }));
  }, []);

  // Handler para abrir modal desde vista fullscreen
  const handleOpenModalFromFullScreen = useCallback(() => {
    setShowFullScreen(false);
    if (selectedShipment) {
      setIsModalOpen(true);
    }
  }, [selectedShipment]);

  const getStatusBadge = (status: ShipmentStatus) => {
    switch(status) {
      case 'TRANSMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
             <Clock size={10} /> Pending
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
             <ShieldCheck size={10} /> Confirmed
          </span>
        );
      case 'REJECTED':
         return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
             <XCircle size={10} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
             <FileText size={10} /> Draft
          </span>
        );
    }
  };

  const filteredShipments = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) return shipments;
    return shipments.filter(shipment => (
      shipment.awbNumber.toLowerCase().includes(query) ||
      shipment.status.toLowerCase().includes(query) ||
      shipment.shipper.name.toLowerCase().includes(query) ||
      shipment.consignee.name.toLowerCase().includes(query)
    ));
  }, [shipments, deferredSearchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800">
      
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-2 rounded-lg text-white">
              <Plane size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-purple-500">
              CARGO-IMP EDI Connector
            </h1>
          </div>
          <div className="text-sm text-slate-500">
            Authenticated: <span className="font-semibold text-green-600">Connected</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Renderizado condicional: Una sola AWB vs Múltiples */}
        {isSingleAwbMode ? (
          <>
            <SingleAwbView 
              shipment={shipments[0]} 
              onOpenModal={handleOpenModal}
              getStatusBadge={getStatusBadge}
            />
            {/* Botones para abrir vista fullscreen con diferentes modos */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleOpenFullScreen(shipments[0], 'review')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium shadow-sm"
              >
                <Monitor size={16} />
                Vista Fullscreen (Revisar y Enviar)
              </button>
              <button
                onClick={() => handleOpenFullScreen(shipments[0], 'transmit')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold shadow-sm"
              >
                <Zap size={16} />
                Vista Fullscreen (Transmitir Directo)
              </button>
            </div>
          </>
        ) : (
          <MultipleAwbView
            shipments={filteredShipments}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenModal={handleOpenModal}
            getStatusBadge={getStatusBadge}
          />
        )}

        {/* Information Panel - Compacto */}
        <details className="mt-4 bg-purple-50/50 border border-purple-100 rounded-lg text-xs text-purple-700">
          <summary className="cursor-pointer p-2 flex items-center gap-2 hover:bg-purple-50">
            <FileText size={14} />
            <span className="font-medium">Ver workflow de estados</span>
          </summary>
          <div className="px-3 pb-2 text-[11px]">
            <span className="font-semibold">Draft</span> → <span className="font-semibold">Pending</span> → <span className="font-semibold text-green-600">Confirmed</span> o <span className="font-semibold text-red-600">Rejected</span>
          </div>
        </details>

      </main>

      {/* FullScreen AWB View (Review or Transmit mode) */}
      {showFullScreen && selectedShipment && (
        <FullScreenAwbView
          shipment={selectedShipment}
          mode={fullScreenMode}
          onOpenModal={handleOpenModalFromFullScreen}
          onClose={() => { setShowFullScreen(false); setSelectedShipment(null); }}
          onTransmitSuccess={handleTransmitSuccess}
        />
      )}

      {/* Modal */}
      <ChampModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        shipment={selectedShipment} 
        onSave={handleSaveShipment}
        onCopySuccess={handleCopyResult}
      />

    </div>
  );
};

export default App;