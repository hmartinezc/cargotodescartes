import { useState, useEffect, useCallback } from 'preact/hooks';
import { FunctionComponent, JSX } from 'preact';
import { 
  Settings, X, Plus, Trash2, AlertTriangle, CheckCircle2, 
  Plane, Globe, Shield, Clock, ChevronDown, ChevronRight, Info, Radio, Terminal, FileCode, Send
} from 'lucide-preact';
import { 
  ConnectorConfig, DEFAULT_CONNECTOR_CONFIG,
  AVAILABLE_SPH_CODES, AVAILABLE_OCI_CONTROL_INFO
} from '../types';
import {
  AirlinePolicy,
  DEFAULT_AIRLINE_POLICIES,
  FWB_SEGMENTS,
  FHL_SEGMENTS,
  FwbVersion,
  FhlVersion,
  TypeBPriority,
  DEFAULT_TYPEB_CONFIG
} from '../services/providers/cargoimp';
import {
  isTypeBEnabled,
  setTypeBEnabled,
  getTypeBConfig,
  updateTypeBConfig,
  updateAirlinePolicy
} from '../services/runtimeConfigStore';

// ============================================================
// CONFIGURACIÓN EN MEMORIA (no persiste)
// ============================================================
// Esta variable mantiene la config durante la sesión actual.
// Cuando se cierra el navegador o se recarga, vuelve a DEFAULT.
let sessionConfig: ConnectorConfig = { ...DEFAULT_CONNECTOR_CONFIG };

/**
 * Resetea la configuración de sesión a los valores por defecto.
 * Llamar cuando se cierra el modal de Champ completamente.
 */
export function resetSessionConfig(): void {
  sessionConfig = { ...DEFAULT_CONNECTOR_CONFIG };
}

/**
 * Obtiene la configuración de sesión actual (solo lectura)
 */
export function getSessionConfig(): ConnectorConfig {
  return { ...sessionConfig };
}

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange?: (config: ConnectorConfig) => void;
  /** Callback cuando el usuario hace clic en "Guardar" - emite el JSON completo */
  onSaveConfig?: (config: ConnectorConfig) => void;
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

interface CollapsibleSectionProps {
  title: string;
  icon: JSX.Element;
  children: JSX.Element | JSX.Element[] | null;
  defaultOpen?: boolean;
  badge?: string;
}

const CollapsibleSection: FunctionComponent<CollapsibleSectionProps> = ({ title, icon, children, defaultOpen = false, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-purple-600">{icon}</div>
          <span className="font-semibold text-slate-700">{title}</span>
          {badge && (
            <span className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        {isOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>
      {isOpen && <div className="p-4 bg-white border-t border-slate-100">{children}</div>}
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const ConfigPanel: FunctionComponent<ConfigPanelProps> = ({ isOpen, onClose, onConfigChange, onSaveConfig }) => {
  const [config, setConfig] = useState<ConnectorConfig>(() => ({ ...sessionConfig }));
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newAirlineCode, setNewAirlineCode] = useState('');
  const [newAirlineSph, setNewAirlineSph] = useState<string[]>([]);
  const [newCountryCode, setNewCountryCode] = useState('');
  const [newOciInfoIdentifier, setNewOciInfoIdentifier] = useState('AGT');
  const [newOciControlInfo, setNewOciControlInfo] = useState('RA');
  const [editingCountry, setEditingCountry] = useState<string | null>(null);
  
  // Estado local para Type B (para forzar re-render)
  const [typeBEnabled, setTypeBEnabledLocal] = useState(() => isTypeBEnabled());
  const [typeBConfig, setTypeBConfigLocal] = useState(() => getTypeBConfig());

  // Wrapper para setTypeBEnabled que también actualiza el estado local
  const handleTypeBToggle = useCallback((enabled: boolean) => {
    setTypeBEnabled(enabled);
    setTypeBEnabledLocal(enabled);
    // Notificar cambio
    if (onConfigChange) {
      setTimeout(() => onConfigChange(sessionConfig), 0);
    }
  }, [onConfigChange]);

  // Wrapper para updateTypeBConfig que también actualiza el estado local
  const handleTypeBConfigUpdate = useCallback((updates: Partial<typeof typeBConfig>) => {
    updateTypeBConfig(updates);
    setTypeBConfigLocal(getTypeBConfig());
    // Notificar cambio
    if (onConfigChange) {
      setTimeout(() => onConfigChange(sessionConfig), 0);
    }
  }, [onConfigChange]);

  // Cargar configuración al abrir (desde memoria de sesión, NO localStorage)
  useEffect(() => {
    if (isOpen) {
      // Cargar desde la variable en memoria (sessionConfig)
      // IMPORTANTE: Las políticas de aerolíneas SIEMPRE se cargan desde DEFAULT_AIRLINE_POLICIES
      // para que reflejen la configuración actual del código (a futuro vendrá del backend)
      setConfig({ 
        ...sessionConfig,
        cargoImp: {
          ...sessionConfig.cargoImp,
          airlinePolicies: { ...DEFAULT_AIRLINE_POLICIES }
        }
      });
      // Cargar config Type B
      setTypeBEnabledLocal(isTypeBEnabled());
      setTypeBConfigLocal(getTypeBConfig());
      setSaveMessage(null);
    }
  }, [isOpen]);

  // Actualizar config en memoria de sesión (NO persiste en localStorage)
  // Los cambios se mantienen mientras el modal de Champ esté abierto.
  // Al cerrar el modal de Champ, se resetea a defaults.
  const updateConfig = useCallback(<K extends keyof ConnectorConfig>(key: K, value: ConnectorConfig[K]) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      // Guardar en la variable de sesión (memoria, no localStorage)
      sessionConfig = newConfig;
      return newConfig;
    });
    setSaveMessage(null);
    
    // Notificar al componente padre si hay callback
    if (onConfigChange) {
      setTimeout(() => {
        onConfigChange(sessionConfig);
      }, 0);
    }
  }, [onConfigChange]);

  // Agregar aerolínea
  const addAirline = () => {
    if (newAirlineCode && newAirlineCode.length === 3 && newAirlineSph.length > 0) {
      const updated = { ...config.sphByAirline, [newAirlineCode]: newAirlineSph };
      updateConfig('sphByAirline', updated);
      setNewAirlineCode('');
      setNewAirlineSph([]);
    }
  };

  // Eliminar aerolínea
  const removeAirline = (code: string) => {
    if (code === 'DEFAULT') return;
    const updated = { ...config.sphByAirline };
    delete updated[code];
    updateConfig('sphByAirline', updated);
  };

  // Agregar país OCI
  const addCountryOci = () => {
    if (newCountryCode && newCountryCode.length === 2) {
      const updated = { 
        ...config.ociByOriginCountry, 
        [newCountryCode]: [{ 
          countryCode: newCountryCode, 
          infoIdentifier: newOciInfoIdentifier, 
          controlInfo: newOciControlInfo 
        }] 
      };
      updateConfig('ociByOriginCountry', updated);
      setNewCountryCode('');
      setNewOciInfoIdentifier('AGT');
      setNewOciControlInfo('RA');
    }
  };

  // Agregar OCI adicional a un país existente
  const addOciToCountry = (countryCode: string, infoIdentifier: string, controlInfo: string) => {
    const currentOcis = config.ociByOriginCountry[countryCode] || [];
    if (currentOcis.some(o => o.infoIdentifier === infoIdentifier && o.controlInfo === controlInfo)) {
      return;
    }
    const updated = {
      ...config.ociByOriginCountry,
      [countryCode]: [...currentOcis, { countryCode, infoIdentifier, controlInfo }]
    };
    updateConfig('ociByOriginCountry', updated);
  };

  // Eliminar OCI de un país
  const removeOciFromCountry = (countryCode: string, idx: number) => {
    const currentOcis = config.ociByOriginCountry[countryCode] || [];
    if (currentOcis.length <= 1) return;
    const updated = {
      ...config.ociByOriginCountry,
      [countryCode]: currentOcis.filter((_, i) => i !== idx)
    };
    updateConfig('ociByOriginCountry', updated);
  };

  // Eliminar país OCI
  const removeCountryOci = (code: string) => {
    if (code === 'DEFAULT') return;
    const updated = { ...config.ociByOriginCountry };
    delete updated[code];
    updateConfig('ociByOriginCountry', updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-300 bg-purple-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/30 p-2 rounded-lg">
              <Settings size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Configuración del Conector</h2>
              <p className="text-sm text-purple-200">Lógicas de negocio dinámicas por aerolínea y país</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Mensaje de estado */}
          {saveMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {saveMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span className="text-sm font-medium">{saveMessage.text}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* INFORMACIÓN DE CONFIGURACIÓN EDI */}
          {/* ============================================================ */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="text-purple-600 mt-0.5 flex-shrink-0" size={18} />
              <div className="text-sm text-purple-800">
                <p className="font-semibold mb-1">📋 Aclaración: Campo accountNumber vs NIT/RUC</p>
                <p className="text-purple-700">
                  El campo <code className="bg-purple-100 px-1 rounded">accountNumber</code> en Shipper/Consignee es un 
                  <strong> código de cuenta asignado por la aerolínea</strong>, NO el NIT/RUC del cliente.
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* FORMATO DE MENSAJE - EDIFACT vs TYPE B */}
          {/* ============================================================ */}
          <CollapsibleSection 
            title="Formato de Mensaje (Descartes)" 
            icon={<Send size={18} />}
            badge={typeBEnabled ? 'Type B' : 'EDIFACT'}
            defaultOpen={true}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-500 mb-4">
                Selecciona el formato de envelope para los mensajes EDI. <strong>Type B</strong> es requerido para envío directo a Descartes.
              </p>
              
              {/* Toggle EDIFACT vs Type B */}
              <div className="grid grid-cols-2 gap-4">
                {/* Opción EDIFACT */}
                <button
                  onClick={() => handleTypeBToggle(false)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    !typeBEnabled 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      !typeBEnabled ? 'border-purple-500' : 'border-slate-300'
                    }`}>
                      {!typeBEnabled && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
                    </div>
                    <span className={`font-semibold ${!typeBEnabled ? 'text-purple-700' : 'text-slate-700'}`}>
                      EDIFACT (UNB/UNZ)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Envelope EDIFACT estándar con segmentos UNB, UNH, UNT, UNZ
                  </p>
                  <div className="mt-2 text-xs font-mono bg-slate-100 p-2 rounded text-slate-600">
                    UNB+IATA:1+SENDER...<br/>
                    FWB/17<br/>
                    ...<br/>
                    'UNT+3+...'UNZ+1+...'
                  </div>
                </button>
                
                {/* Opción Type B */}
                <button
                  onClick={() => handleTypeBToggle(true)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    typeBEnabled 
                      ? 'border-sky-500 bg-sky-50' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      typeBEnabled ? 'border-sky-500' : 'border-slate-300'
                    }`}>
                      {typeBEnabled && <div className="w-2 h-2 bg-sky-500 rounded-full" />}
                    </div>
                    <span className={`font-semibold ${typeBEnabled ? 'text-sky-700' : 'text-slate-700'}`}>
                      Type B (Descartes)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Formato IATA Type B para envío a Descartes GLN
                  </p>
                  <div className="mt-2 text-xs font-mono bg-slate-100 p-2 rounded text-slate-600">
                    QK {typeBConfig.recipientAddress || 'DSGUNXA'}<br/>
                    .{typeBConfig.senderPrefix || 'DSGTPXA'}{typeBConfig.includeTimestamp ? ' DDHHmm' : ''} {typeBConfig.originAddress || 'TDVAGT03OPERFLOR/BOG1'}<br/>
                    FWB/17<br/>
                    ...
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    DSGUNXA = Descartes Universal Header (enruta automáticamente)
                  </p>
                </button>
              </div>

              {/* Configuración Type B - Solo visible si está activo */}
              {typeBEnabled && (
                <div className="mt-4 p-4 bg-sky-50 border border-sky-200 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-sky-800 flex items-center gap-2">
                    <Send size={16} /> Configuración Type B
                  </p>
                  
                  {/* Recipient Address (DSGUNXA) */}
                  <div>
                    <label className="text-xs text-sky-700 font-medium block mb-1">Recipient Address (Descartes)</label>
                    <input
                      type="text"
                      value={typeBConfig.recipientAddress || 'DSGUNXA'}
                      onChange={(e) => handleTypeBConfigUpdate({ recipientAddress: e.target.value })}
                      className="w-full border border-sky-300 rounded px-3 py-2 text-sm font-mono bg-white"
                      placeholder="DSGUNXA"
                    />
                    <p className="text-xs text-sky-600 mt-1">DSGUNXA = Descartes Universal Header (enruta automáticamente a la aerolínea)</p>
                  </div>
                  
                  {/* Sender Prefix (DSGTPXA) */}
                  <div>
                    <label className="text-xs text-sky-700 font-medium block mb-1">Sender Prefix (Línea 2)</label>
                    <input
                      type="text"
                      value={typeBConfig.senderPrefix || 'DSGTPXA'}
                      onChange={(e) => handleTypeBConfigUpdate({ senderPrefix: e.target.value })}
                      className="w-full border border-sky-300 rounded px-3 py-2 text-sm font-mono bg-white"
                      placeholder="DSGTPXA"
                    />
                    <p className="text-xs text-sky-600 mt-1">Prefijo fijo de Descartes para la línea del sender</p>
                  </div>
                  
                  {/* Origin Address */}
                  <div>
                    <label className="text-xs text-sky-700 font-medium block mb-1">Origin Address (Tu identificador)</label>
                    <input
                      type="text"
                      value={typeBConfig.originAddress || 'TDVAGT03OPERFLOR/BOG1'}
                      onChange={(e) => handleTypeBConfigUpdate({ originAddress: e.target.value })}
                      className="w-full border border-sky-300 rounded px-3 py-2 text-sm font-mono bg-white"
                      placeholder="TDVAGT03OPERFLOR/BOG1"
                    />
                    <p className="text-xs text-sky-600 mt-1">Tu identificador de agente (proporcionado por Descartes)</p>
                  </div>
                  
                  {/* Timestamp toggle */}
                  <div>
                    <label className="text-xs text-sky-700 font-medium block mb-1">Timestamp en línea origen</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTypeBConfigUpdate({ includeTimestamp: false })}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          !typeBConfig.includeTimestamp
                            ? 'bg-sky-600 text-white'
                            : 'bg-white border border-sky-300 text-sky-700 hover:bg-sky-100'
                        }`}
                      >
                        Sin timestamp
                      </button>
                      <button
                        onClick={() => handleTypeBConfigUpdate({ includeTimestamp: true })}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          typeBConfig.includeTimestamp
                            ? 'bg-sky-600 text-white'
                            : 'bg-white border border-sky-300 text-sky-700 hover:bg-sky-100'
                        }`}
                      >
                        Con timestamp (DDHHmm)
                      </button>
                    </div>
                    <p className="text-xs text-sky-600 mt-1">
                      {typeBConfig.includeTimestamp 
                        ? 'Ej: .DSGTPXA 031545 TDVAGT03OPERFLOR/BOG1' 
                        : 'Ej: .DSGTPXA TDVAGT03OPERFLOR/BOG1'}
                    </p>
                  </div>
                  
                  {/* Priority */}
                  <div>
                    <label className="text-xs text-sky-700 font-medium block mb-1">Prioridad</label>
                    <div className="flex gap-2">
                      {(['QK', 'QD', 'QP', 'QU'] as TypeBPriority[]).map(priority => (
                        <button
                          key={priority}
                          onClick={() => handleTypeBConfigUpdate({ defaultPriority: priority })}
                          className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
                            typeBConfig.defaultPriority === priority
                              ? 'bg-sky-600 text-white'
                              : 'bg-white border border-sky-300 text-sky-700 hover:bg-sky-100'
                          }`}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-sky-600 mt-1">QK=Normal, QD=Deferred, QP=Priority, QU=Urgent</p>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* ============================================================ */}
          {/* SPH POR AEROLÍNEA */}
          {/* ============================================================ */}
          <CollapsibleSection 
            title="Special Handling Codes (SPH) por Aerolínea" 
            icon={<Plane size={18} />}
            badge={`${Object.keys(config.sphByAirline).length} aerolíneas`}
            defaultOpen={false}
          >
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">
                Define qué códigos SPH se agregan automáticamente según el prefijo AWB (primeros 3 dígitos).
              </p>
              
              {/* Lista de aerolíneas */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(config.sphByAirline).map(([code, sphs]: [string, string[]]) => (
                  <div key={code} className={`flex items-center justify-between p-3 rounded-lg border ${
                    code === 'DEFAULT' ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-700 w-12">{code}</span>
                      <span className="text-slate-400">→</span>
                      <div className="flex flex-wrap gap-1">
                        {sphs.map(sph => (
                          <span key={sph} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            {sph}
                          </span>
                        ))}
                      </div>
                    </div>
                    {code !== 'DEFAULT' && (
                      <button 
                        onClick={() => removeAirline(code)}
                        className="text-red-500 hover:bg-red-100 p-1.5 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {code === 'DEFAULT' && (
                      <span className="text-xs text-amber-600 font-medium">Por defecto</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Agregar nueva aerolínea */}
              <div className="flex items-end gap-2 pt-4 border-t border-slate-200">
                <div className="flex-shrink-0">
                  <label className="text-xs text-slate-500 font-medium block mb-1">Prefijo AWB</label>
                  <input
                    type="text"
                    value={newAirlineCode}
                    onChange={(e) => setNewAirlineCode(e.target.value.toUpperCase().slice(0, 3))}
                    placeholder="075"
                    className="w-20 border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"
                    maxLength={3}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 font-medium block mb-1">Códigos SPH (seleccione)</label>
                  <div className="flex flex-wrap gap-1 border border-slate-300 rounded p-2 bg-white max-h-20 overflow-y-auto">
                    {Object.values(AVAILABLE_SPH_CODES).map(sph => (
                      <button
                        key={sph.code}
                        onClick={() => {
                          if (newAirlineSph.includes(sph.code)) {
                            setNewAirlineSph(prev => prev.filter(s => s !== sph.code));
                          } else {
                            setNewAirlineSph(prev => [...prev, sph.code]);
                          }
                        }}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          newAirlineSph.includes(sph.code) 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={sph.description}
                      >
                        {sph.code}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={addAirline}
                  disabled={!newAirlineCode || newAirlineCode.length !== 3 || newAirlineSph.length === 0}
                  className="flex-shrink-0 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>

              {/* Referencia de códigos comunes */}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-600 mb-2">📋 Prefijos AWB comunes:</p>
                <div className="grid grid-cols-4 gap-2 text-xs text-slate-500">
                  <span><strong>075</strong> = Iberia</span>
                  <span><strong>145</strong> = LATAM</span>
                  <span><strong>985</strong> = LATAM Cargo</span>
                  <span><strong>074</strong> = KLM</span>
                  <span><strong>057</strong> = Air France</span>
                  <span><strong>020</strong> = Lufthansa</span>
                  <span><strong>205</strong> = Emirates</span>
                  <span><strong>176</strong> = Emirates (alt)</span>
                  <span><strong>235</strong> = Turkish</span>
                  <span><strong>157</strong> = Qatar</span>
                  <span><strong>045</strong> = Avianca</span>
                  <span><strong>369</strong> = Atlas/Ethiopian</span>
                  <span><strong>992</strong> = DHL Aviation</span>
                  <span><strong>999</strong> = Polar/DHL</span>
                  <span><strong>155</strong> = ABX Air</span>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ============================================================ */}
          {/* OCI POR PAÍS */}
          {/* ============================================================ */}
          <CollapsibleSection 
            title="OCI (Aduanas/Seguridad) por País de Origen" 
            icon={<Globe size={18} />}
            badge={`${Object.keys(config.ociByOriginCountry).length} países`}
          >
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">
                Define qué información OCI se agrega automáticamente según el país de origen del envío.
              </p>
              
              {/* Lista de países */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {Object.entries(config.ociByOriginCountry).map(([code, ocis]: [string, Array<{countryCode: string; infoIdentifier: string; controlInfo: string}>]) => (
                  <div key={code} className={`p-3 rounded-lg border ${
                    code === 'DEFAULT' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border">{code}</span>
                        {code === 'DEFAULT' && (
                          <span className="text-xs text-amber-600 font-medium">Por defecto</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingCountry(editingCountry === code ? null : code)}
                          className="text-purple-500 hover:bg-purple-100 p-1 rounded transition-colors text-xs"
                        >
                          {editingCountry === code ? 'Cerrar' : '+ Agregar OCI'}
                        </button>
                        {code !== 'DEFAULT' && (
                          <button 
                            onClick={() => removeCountryOci(code)}
                            className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* OCIs actuales */}
                    <div className="space-y-1">
                      {ocis.map((oci, idx) => (
                        <div key={idx} className="text-xs text-slate-600 flex items-center gap-2 bg-white p-1.5 rounded">
                          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{oci.infoIdentifier}</span>
                          <span>→</span>
                          <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{oci.controlInfo}</span>
                          {ocis.length > 1 && (
                            <button
                              onClick={() => removeOciFromCountry(code, idx)}
                              className="ml-auto text-red-400 hover:text-red-600"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Formulario para agregar OCI a país existente */}
                    {editingCountry === code && (
                      <div className="mt-3 pt-3 border-t border-dashed border-slate-300">
                        <p className="text-xs text-slate-500 mb-2">Agregar nuevo OCI a {code}:</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={newOciInfoIdentifier}
                            onChange={(e) => setNewOciInfoIdentifier(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="AGT">AGT - Agent</option>
                            <option value="CNE">CNE - Consignee</option>
                            <option value="SHP">SHP - Shipper</option>
                            <option value="FFW">FFW - Freight Forwarder</option>
                          </select>
                          <select
                            value={newOciControlInfo}
                            onChange={(e) => setNewOciControlInfo(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-sm"
                          >
                            {Object.entries(AVAILABLE_OCI_CONTROL_INFO).map(([key, info]) => (
                              <option key={key} value={info.short}>{info.short} - {info.description}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              addOciToCountry(code, newOciInfoIdentifier, newOciControlInfo);
                              setEditingCountry(null);
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Agregar nuevo país */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-2">Agregar nuevo país:</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newCountryCode}
                    onChange={(e) => setNewCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="CO"
                    className="w-16 border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"
                    maxLength={2}
                  />
                  <select
                    value={newOciInfoIdentifier}
                    onChange={(e) => setNewOciInfoIdentifier(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="AGT">AGT - Agent</option>
                    <option value="CNE">CNE - Consignee</option>
                    <option value="SHP">SHP - Shipper</option>
                    <option value="FFW">FFW - Freight Forwarder</option>
                  </select>
                  <select
                    value={newOciControlInfo}
                    onChange={(e) => setNewOciControlInfo(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                  >
                    {Object.entries(AVAILABLE_OCI_CONTROL_INFO).map(([key, info]) => (
                      <option key={key} value={info.short}>{info.short} - {info.description}</option>
                    ))}
                  </select>
                  <button
                    onClick={addCountryOci}
                    disabled={!newCountryCode || newCountryCode.length !== 2}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Plus size={14} /> Agregar País
                  </button>
                </div>
              </div>

              {/* Referencia de códigos de país */}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-600 mb-2">📋 Códigos de país ISO comunes:</p>
                <div className="grid grid-cols-4 gap-2 text-xs text-slate-500">
                  <span><strong>CO</strong> = Colombia</span>
                  <span><strong>EC</strong> = Ecuador</span>
                  <span><strong>PE</strong> = Perú</span>
                  <span><strong>PA</strong> = Panamá</span>
                  <span><strong>MX</strong> = México</span>
                  <span><strong>CL</strong> = Chile</span>
                  <span><strong>AR</strong> = Argentina</span>
                  <span><strong>BR</strong> = Brasil</span>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ============================================================ */}
          {/* OPCIONES GENERALES */}
          {/* ============================================================ */}
          <CollapsibleSection 
            title="Opciones de Envío" 
            icon={<Shield size={18} />}
          >
            <div className="space-y-4">
              {/* Incluir NIT del Consignee/Importer - DEFAULT */}
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">Incluir NIT/RUC del Importer</p>
                  <p className="text-xs text-green-600">Envía el NIT del consignee/importador como OCI (AGT/T/NIT)</p>
                  <p className="text-xs text-green-500 mt-1 italic">✅ Este es el default - Solo se envía si el importer tiene taxId</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeConsigneeTIN ?? true}
                    onChange={(e) => updateConfig('includeConsigneeTIN', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {/* Incluir NIT del Shipper/Exporter - OPCIONAL */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-700">Incluir NIT/RUC del Shipper</p>
                  <p className="text-xs text-slate-500">Envía también el NIT del shipper/exportador (opcional)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeShipperTIN}
                    onChange={(e) => updateConfig('includeShipperTIN', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Auto CSL */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-700">Generar CSL automático</p>
                  <p className="text-xs text-slate-500">Crear Consolidation List para envíos con houses</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.messageConfig.autoGenerateCSL}
                    onChange={(e) => updateConfig('messageConfig', { ...config.messageConfig, autoGenerateCSL: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </CollapsibleSection>

          {/* ============================================================ */}
          {/* OCI DE SEGURIDAD - Campos adicionales requeridos por aerolíneas */}
          {/* ============================================================ */}
          <CollapsibleSection 
            title="OCI Seguridad (RA/ED/SM/SD/SN)" 
            icon={<Shield size={18} />}
            badge={config.securityOci?.enabled ? 'Activo' : 'Inactivo'}
          >
            <div className="space-y-4">
              {/* Nota informativa */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Información de Seguridad OCI</p>
                    <p>Algunos destinos/aerolíneas requieren información de seguridad adicional para documentar quién, cómo y cuándo se aseguró el envío. Active esta opción solo si la aerolínea lo requiere.</p>
                  </div>
                </div>
              </div>

              {/* Toggle habilitar OCI de seguridad */}
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div>
                  <p className="font-medium text-amber-800">Incluir OCI de Seguridad</p>
                  <p className="text-xs text-amber-600">Enviar RA, ED, SM, SD, SN en el mensaje</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.securityOci?.enabled || false}
                    onChange={(e) => updateConfig('securityOci', { 
                      ...config.securityOci, 
                      enabled: e.target.checked 
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Campos de seguridad (solo visibles si está habilitado) */}
              {config.securityOci?.enabled && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {/* RA - Regulated Agent Number */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-bold mr-2">RA</span>
                      Número de Agente Regulado
                    </label>
                    <input
                      type="text"
                      value={config.securityOci?.regulatedAgentNumber || ''}
                      onChange={(e) => updateConfig('securityOci', { 
                        ...config.securityOci, 
                        regulatedAgentNumber: e.target.value 
                      })}
                      placeholder="Ej: 00100-01"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                      maxLength={35}
                    />
                    <p className="text-xs text-slate-500 mt-1">Número de certificado del agente regulado de Colombia</p>
                  </div>

                  {/* ED - Expiry Date */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-bold mr-2">ED</span>
                      Fecha Expiración Certificado
                    </label>
                    <input
                      type="text"
                      value={config.securityOci?.expiryDate || ''}
                      onChange={(e) => updateConfig('securityOci', { 
                        ...config.securityOci, 
                        expiryDate: e.target.value.toUpperCase().replace(/[^0-9]/g, '').substring(0, 4)
                      })}
                      placeholder="MMYY (Ej: 1225 = Dic 2025)"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                      maxLength={4}
                    />
                    <p className="text-xs text-slate-500 mt-1">Formato MMYY - Mes y año de expiración del certificado</p>
                  </div>

                  {/* SM - Screening Method */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold mr-2">SM</span>
                      Método de Screening
                    </label>
                    <select
                      value={config.securityOci?.screeningMethod || ''}
                      onChange={(e) => updateConfig('securityOci', { 
                        ...config.securityOci, 
                        screeningMethod: e.target.value 
                      })}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="">-- Seleccionar método --</option>
                      <option value="XRY">XRY - Rayos X</option>
                      <option value="EDS">EDS - Sistema de Detección de Explosivos</option>
                      <option value="ETD">ETD - Detección de Trazas de Explosivos</option>
                      <option value="VCK">VCK - Verificación Visual</option>
                      <option value="PHS">PHS - Inspección Física</option>
                      <option value="EDD">EDD - Perros Detectores de Explosivos</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Método utilizado para inspeccionar la carga</p>
                  </div>

                  {/* SD - Screening Date */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-bold mr-2">SD</span>
                      Fecha/Hora de Screening
                    </label>
                    <input
                      type="text"
                      value={config.securityOci?.screeningDate || ''}
                      onChange={(e) => updateConfig('securityOci', { 
                        ...config.securityOci, 
                        screeningDate: e.target.value.toUpperCase().substring(0, 13)
                      })}
                      placeholder="DDMMMYYHHmm (Ej: 24DEC252359)"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                      maxLength={13}
                    />
                    <p className="text-xs text-slate-500 mt-1">Formato DDMMMYYHHmm - Fecha y hora local del screening</p>
                  </div>

                  {/* SN - Screener Name */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-xs font-bold mr-2">SN</span>
                      Nombre del Responsable
                    </label>
                    <input
                      type="text"
                      value={config.securityOci?.screenerName || ''}
                      onChange={(e) => updateConfig('securityOci', { 
                        ...config.securityOci, 
                        screenerName: e.target.value.toUpperCase().substring(0, 35)
                      })}
                      placeholder="Ej: JORGE GAMBOA"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm uppercase"
                      maxLength={35}
                    />
                    <p className="text-xs text-slate-500 mt-1">Nombre de la persona que realizó el screening</p>
                  </div>

                  {/* Preview del OCI que se enviará */}
                  <div className="mt-4 p-3 bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2 font-medium">Vista previa del OCI de seguridad:</p>
                    <pre className="text-xs text-green-400 font-mono overflow-x-auto">
{`[
${config.securityOci?.regulatedAgentNumber ? `  { "isoCountryCode": "CO", "informationIdentifier": "AGT", "additionalControlInformation": "RA", "supplementaryControlInformation": "${config.securityOci.regulatedAgentNumber}" },\n` : ''}${config.securityOci?.expiryDate ? `  { "additionalControlInformation": "ED", "supplementaryControlInformation": "${config.securityOci.expiryDate}" },\n` : ''}${config.securityOci?.screeningMethod ? `  { "additionalControlInformation": "SM", "supplementaryControlInformation": "${config.securityOci.screeningMethod}" },\n` : ''}${config.securityOci?.screeningDate ? `  { "additionalControlInformation": "SD", "supplementaryControlInformation": "${config.securityOci.screeningDate}" },\n` : ''}${config.securityOci?.screenerName ? `  { "additionalControlInformation": "SN", "supplementaryControlInformation": "${config.securityOci.screenerName}" }\n` : ''}]`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* ============================================================ */}
          {/* CARGO-IMP (EDI) CONFIGURACIÓN */}
          {/* ============================================================ */}
          <CollapsibleSection 
            title="CARGO-IMP (EDI) Configuración" 
            icon={<Terminal size={18} />}
            badge="Formato EDI"
            defaultOpen={true}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-500 mb-4">
                Configura las versiones de mensaje y opciones para el formato CARGO-IMP (IATA CIMP EDI).
              </p>

              {/* Configuración Principal - Editable */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">⚙️ Configuración Global</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Versión FWB */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Versión FWB</label>
                    <select
                      value={config.cargoImp?.fwbVersion || 'FWB/16'}
                      onChange={(e) => updateConfig('cargoImp', { 
                        ...config.cargoImp, 
                        fwbVersion: e.currentTarget.value as 'FWB/16' | 'FWB/17' 
                      })}
                      className="w-full border border-emerald-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="FWB/16">FWB/16 (Estándar)</option>
                      <option value="FWB/17">FWB/17 (Extendido)</option>
                    </select>
                  </div>
                  
                  {/* Versión FHL */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Versión FHL</label>
                    <select
                      value={config.cargoImp?.fhlVersion || 'FHL/4'}
                      onChange={(e) => updateConfig('cargoImp', { 
                        ...config.cargoImp, 
                        fhlVersion: e.currentTarget.value as 'FHL/2' | 'FHL/4' 
                      })}
                      className="w-full border border-emerald-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="FHL/4">FHL/4 (Actual)</option>
                      <option value="FHL/2">FHL/2 (Legacy)</option>
                    </select>
                  </div>
                  
                  {/* Toggle UNB/UNZ */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cargoImpUNB"
                      checked={config.cargoImp?.includeUNB_UNZ || false}
                      onChange={(e) => updateConfig('cargoImp', { 
                        ...config.cargoImp, 
                        includeUNB_UNZ: e.currentTarget.checked 
                      })}
                      className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-400"
                    />
                    <label htmlFor="cargoImpUNB" className="text-xs text-slate-700">
                      Incluir UNB/UNZ<br/>
                      <span className="text-[10px] text-slate-400">(EDIFACT wrapper)</span>
                    </label>
                  </div>
                  
                  {/* Toggle EORI */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cargoImpEORI"
                      checked={config.cargoImp?.ociWithEori || false}
                      onChange={(e) => updateConfig('cargoImp', { 
                        ...config.cargoImp, 
                        ociWithEori: e.currentTarget.checked 
                      })}
                      className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-400"
                    />
                    <label htmlFor="cargoImpEORI" className="text-xs text-slate-700">
                      EORI en OCI<br/>
                      <span className="text-[10px] text-slate-400">(Requerido UE)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Códigos SPH por defecto */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3">📦 Códigos SPH por defecto</p>
                <div className="flex flex-wrap gap-2">
                  {['EAP', 'ECC', 'PER', 'SPX', 'DGR', 'ICE', 'VAL', 'AVI', 'HEA'].map(code => (
                    <label key={code} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-purple-200 cursor-pointer hover:bg-purple-100">
                      <input
                        type="checkbox"
                        checked={(config.cargoImp?.defaultSphCodes || []).includes(code)}
                        onChange={(e) => {
                          const current = config.cargoImp?.defaultSphCodes || [];
                          const updated = e.currentTarget.checked 
                            ? [...current, code]
                            : current.filter(c => c !== code);
                          updateConfig('cargoImp', { ...config.cargoImp, defaultSphCodes: updated });
                        }}
                        className="w-3 h-3 rounded border-purple-300 text-purple-600"
                      />
                      <span className="text-xs font-mono text-purple-700">{code}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Políticas por Aerolínea - EDITABLE con políticas predefinidas */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">✈️ Políticas por Aerolínea (Pre-configuradas)</p>
                  <button
                    onClick={() => {
                      // Sincronizar con políticas predefinidas (992=DHL, 999=Polar, etc.)
                      updateConfig('cargoImp', { 
                        ...config.cargoImp, 
                        airlinePolicies: { ...DEFAULT_AIRLINE_POLICIES }
                      });
                    }}
                    className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200"
                    title="Actualiza 992=DHL, 999=Polar Air, etc."
                  >
                    🔄 Sincronizar predefinidas
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Haz clic en una aerolínea para expandir y editar. Los segmentos son clickeables para activar/desactivar.
                </p>
                
                {/* Combinar políticas guardadas con las predefinidas */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {Object.entries({ ...DEFAULT_AIRLINE_POLICIES, ...(config.cargoImp?.airlinePolicies || {}) })
                    .sort(([a], [b]) => {
                      if (a === 'DEFAULT') return 1;
                      if (b === 'DEFAULT') return -1;
                      return a.localeCompare(b);
                    })
                    .map(([code, rawPolicy]) => {
                      // Migrar políticas antiguas: agregar NV y NS si NH está habilitado
                      let enabledSegs = [...(rawPolicy.enabledSegments || [])];
                      const disabledSegs = rawPolicy.disabledSegments || [];
                      if (enabledSegs.includes('NH')) {
                        if (!enabledSegs.includes('NV') && !disabledSegs.includes('NV')) {
                          const nhIdx = enabledSegs.indexOf('NH');
                          enabledSegs = [...enabledSegs.slice(0, nhIdx + 1), 'NV', ...enabledSegs.slice(nhIdx + 1)];
                        }
                        if (!enabledSegs.includes('NS') && !disabledSegs.includes('NS')) {
                          const nvIdx = enabledSegs.indexOf('NV');
                          if (nvIdx >= 0) {
                            enabledSegs = [...enabledSegs.slice(0, nvIdx + 1), 'NS', ...enabledSegs.slice(nvIdx + 1)];
                          } else {
                            const nhIdx = enabledSegs.indexOf('NH');
                            enabledSegs = [...enabledSegs.slice(0, nhIdx + 1), 'NS', ...enabledSegs.slice(nhIdx + 1)];
                          }
                        }
                      }
                      const policy = { ...rawPolicy, enabledSegments: enabledSegs };
                      
                      const allSegments = Object.keys(FWB_SEGMENTS);
                      const policyCase = Math.floor((policy.policy || 20) / 10);
                      
                      return (
                        <details key={code} className="group bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded w-12 text-center">{code}</span>
                              <span className="text-xs text-slate-600">{policy.name || code}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded ${
                                policyCase === 7 ? 'bg-orange-100 text-orange-700' :
                                policyCase === 5 ? 'bg-purple-100 text-purple-700' :
                                policyCase === 4 ? 'bg-green-100 text-green-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                Caso {policyCase}
                              </span>
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{policy.fwbVersion || 'FWB/16'}</span>
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{policy.fhlVersion || 'FHL/4'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ChevronRight size={14} className="text-slate-400 group-open:rotate-90 transition-transform" />
                              {code !== 'DEFAULT' && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const updated = { ...config.cargoImp?.airlinePolicies };
                                    delete updated[code];
                                    updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </summary>
                          
                          <div className="px-3 pb-3 border-t border-slate-100 pt-3 space-y-3">
                            {/* Selector de Política/Caso */}
                            <div className="p-2 bg-amber-50 rounded border border-amber-200">
                              <label className="text-[10px] text-amber-700 font-bold block mb-1">🔧 Política de Caso</label>
                              <select
                                value={policy.policy || 20}
                                onChange={(e) => {
                                  const newPolicyValue = parseInt(e.currentTarget.value);
                                  const allFwbSegs = Object.keys(FWB_SEGMENTS);
                                  const allFhlSegs = Object.keys(FHL_SEGMENTS);
                                  
                                  // Segmentos base que siempre están habilitados
                                  const baseEnabledFwb = ['FWB', 'AWB', 'RTG', 'SHP', 'CNE', 'AGT', 'CVD', 'ISU', 'FTR'];
                                  const baseEnabledFhl = allFhlSegs; // FHL todos por defecto
                                  
                                  // Segmentos adicionales según el caso
                                  let enabledFwbSegs = [...baseEnabledFwb];
                                  let disabledFwbSegs: string[] = [];
                                  let includeUnbUnz = true;
                                  let fhlAlwaysWithHeader = false;
                                  
                                  // Configurar según el caso seleccionado
                                  const caseNum = Math.floor(newPolicyValue / 10);
                                  switch(caseNum) {
                                    case 2: // Caso 2: Estándar
                                      enabledFwbSegs = ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'];
                                      disabledFwbSegs = allFwbSegs.filter(s => !enabledFwbSegs.includes(s));
                                      break;
                                    case 4: // Caso 4: FWB_NEW
                                      enabledFwbSegs = ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'];
                                      disabledFwbSegs = allFwbSegs.filter(s => !enabledFwbSegs.includes(s));
                                      break;
                                    case 5: // Caso 5: FHL concatenados
                                      enabledFwbSegs = ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'];
                                      disabledFwbSegs = allFwbSegs.filter(s => !enabledFwbSegs.includes(s));
                                      break;
                                    case 7: // Caso 7: DHL/ABX
                                      enabledFwbSegs = ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'NFY', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'];
                                      disabledFwbSegs = allFwbSegs.filter(s => !enabledFwbSegs.includes(s));
                                      fhlAlwaysWithHeader = true;
                                      break;
                                    case 8: // Caso 8: Todas FHL en 1
                                      enabledFwbSegs = ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'ISU', 'SPH', 'OCI', 'FTR'];
                                      disabledFwbSegs = allFwbSegs.filter(s => !enabledFwbSegs.includes(s));
                                      break;
                                  }
                                  
                                  const updated = {
                                    ...(config.cargoImp?.airlinePolicies || {}),
                                    [code]: { 
                                      ...policy, 
                                      policy: newPolicyValue,
                                      enabledSegments: enabledFwbSegs,
                                      disabledSegments: disabledFwbSegs,
                                      enabledFhlSegments: baseEnabledFhl,
                                      disabledFhlSegments: [],
                                      includeUnbUnz,
                                      fhlAlwaysWithHeader
                                    }
                                  };
                                  updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                  console.log(`[ConfigPanel] Caso cambiado a ${newPolicyValue} para ${code}, segmentos FWB: ${enabledFwbSegs.length} habilitados`);
                                }}
                                className="w-full border border-amber-300 rounded px-2 py-1 text-xs bg-white"
                              >
                                <optgroup label="📦 Consolidados">
                                  <option value={20}>Caso 2: FWB + FHL individuales</option>
                                  <option value={40}>Caso 4: FWB_NEW + FHL individuales</option>
                                  <option value={50}>Caso 5: FWB_NEW + FHL concatenados</option>
                                  <option value={70}>Caso 7: DHL/ABX (FHL con header)</option>
                                  <option value={80}>Caso 8: Todas FHL en 1 mensaje</option>
                                </optgroup>
                                <optgroup label="📄 Directos">
                                  <option value={21}>Caso 2: FWB directo</option>
                                  <option value={41}>Caso 4: FWB_NEW directo</option>
                                  <option value={71}>Caso 7: DHL/ABX directo</option>
                                </optgroup>
                              </select>
                            </div>

                            {/* Versiones y opciones */}
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-500 block mb-0.5">FWB</label>
                                <select
                                  value={policy.fwbVersion || 'FWB/16'}
                                  onChange={(e) => {
                                    const updated = {
                                      ...(config.cargoImp?.airlinePolicies || {}),
                                      [code]: { ...policy, fwbVersion: e.currentTarget.value as FwbVersion }
                                    };
                                    updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                  }}
                                  className="w-full border border-slate-300 rounded px-1 py-1 text-xs"
                                >
                                  <option value="FWB/16">FWB/16</option>
                                  <option value="FWB/17">FWB/17</option>
                                  <option value="FWB/9">FWB/9</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 block mb-0.5">FHL</label>
                                <select
                                  value={policy.fhlVersion || 'FHL/4'}
                                  onChange={(e) => {
                                    const updated = {
                                      ...(config.cargoImp?.airlinePolicies || {}),
                                      [code]: { ...policy, fhlVersion: e.currentTarget.value as FhlVersion }
                                    };
                                    updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                  }}
                                  className="w-full border border-slate-300 rounded px-1 py-1 text-xs"
                                >
                                  <option value="FHL/4">FHL/4</option>
                                  <option value="FHL/2">FHL/2</option>
                                </select>
                              </div>
                              <label className="flex items-center gap-1 text-[10px] p-1 bg-slate-100 rounded">
                                <input 
                                  type="checkbox" 
                                  checked={policy.includeUnbUnz !== false}
                                  onChange={(e) => {
                                    const updated = {
                                      ...(config.cargoImp?.airlinePolicies || {}),
                                      [code]: { ...policy, includeUnbUnz: e.currentTarget.checked }
                                    };
                                    updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                  }}
                                  className="w-3 h-3" 
                                />
                                UNB/UNZ
                              </label>
                              <label className="flex items-center gap-1 text-[10px] p-1 bg-slate-100 rounded">
                                <input 
                                  type="checkbox" 
                                  checked={policy.ociFormat === 'withPrefix'}
                                  onChange={(e) => {
                                    const updated = {
                                      ...(config.cargoImp?.airlinePolicies || {}),
                                      [code]: { ...policy, ociFormat: e.currentTarget.checked ? 'withPrefix' : 'withoutPrefix' }
                                    };
                                    updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                  }}
                                  className="w-3 h-3" 
                                />
                                EORI
                              </label>
                            </div>
                            
                            {/* Segmentos - CLICKEABLES */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-700">📋 Segmentos (click para toggle):</label>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const updated = {
                                        ...(config.cargoImp?.airlinePolicies || {}),
                                        [code]: { ...policy, enabledSegments: [...allSegments], disabledSegments: [] }
                                      };
                                      updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                    }}
                                    className="text-[9px] text-green-600 hover:underline"
                                  >
                                    Todos
                                  </button>
                                  <button
                                    onClick={() => {
                                      const minimal = ['FWB', 'AWB', 'SHP', 'CNE', 'CVD', 'ISU', 'FTR'];
                                      const updated = {
                                        ...(config.cargoImp?.airlinePolicies || {}),
                                        [code]: { ...policy, enabledSegments: minimal, disabledSegments: allSegments.filter(s => !minimal.includes(s)) }
                                      };
                                      updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                    }}
                                    className="text-[9px] text-amber-600 hover:underline"
                                  >
                                    Mínimos
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-8 gap-1">
                                {allSegments.map(seg => {
                                  const isEnabled = (policy.enabledSegments || []).includes(seg);
                                  return (
                                    <button
                                      key={seg}
                                      onClick={() => {
                                        const currentEnabled = policy.enabledSegments || allSegments;
                                        const currentDisabled = policy.disabledSegments || [];
                                        
                                        let newEnabled: string[];
                                        let newDisabled: string[];
                                        
                                        if (isEnabled) {
                                          newEnabled = currentEnabled.filter(s => s !== seg);
                                          newDisabled = [...currentDisabled, seg];
                                        } else {
                                          newEnabled = [...currentEnabled, seg];
                                          newDisabled = currentDisabled.filter(s => s !== seg);
                                        }
                                        
                                        const updated = {
                                          ...(config.cargoImp?.airlinePolicies || {}),
                                          [code]: { ...policy, enabledSegments: newEnabled, disabledSegments: newDisabled }
                                        };
                                        updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                        
                                        // Sincronizar con runtimeConfigStore para que el EDI se actualice
                                        updateAirlinePolicy(code, { enabledSegments: newEnabled, disabledSegments: newDisabled });
                                      }}
                                      className={`p-1 rounded text-[9px] font-mono font-bold text-center transition-all ${
                                        isEnabled 
                                          ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200' 
                                          : 'bg-red-50 text-red-400 border border-red-200 line-through hover:bg-red-100'
                                      }`}
                                      title={FWB_SEGMENTS[seg as keyof typeof FWB_SEGMENTS]?.name || seg}
                                    >
                                      {seg}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] text-slate-400 mt-1">
                                ✓ {(policy.enabledSegments || []).length} activos | ✗ {(policy.disabledSegments || []).length} deshabilitados
                              </p>
                            </div>
                            
                            {/* Segmentos FHL - CLICKEABLES */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-blue-700">📦 Segmentos FHL (Houses - click para toggle):</label>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const allFhlSegs = Object.keys(FHL_SEGMENTS);
                                      const updated = {
                                        ...(config.cargoImp?.airlinePolicies || {}),
                                        [code]: { ...policy, enabledFhlSegments: [...allFhlSegs], disabledFhlSegments: [] }
                                      };
                                      updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                    }}
                                    className="text-[9px] text-blue-600 hover:underline"
                                  >
                                    Todos
                                  </button>
                                  <button
                                    onClick={() => {
                                      const minimalFhl = ['FHL', 'MBI', 'HBS', 'SHP', 'CNE', 'CVD'];
                                      const allFhlSegs = Object.keys(FHL_SEGMENTS);
                                      const updated = {
                                        ...(config.cargoImp?.airlinePolicies || {}),
                                        [code]: { ...policy, enabledFhlSegments: minimalFhl, disabledFhlSegments: allFhlSegs.filter(s => !minimalFhl.includes(s)) }
                                      };
                                      updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                    }}
                                    className="text-[9px] text-amber-600 hover:underline"
                                  >
                                    Mínimos
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-5 gap-1">
                                {Object.keys(FHL_SEGMENTS).map(seg => {
                                  const allFhlSegs = Object.keys(FHL_SEGMENTS);
                                  const enabledFhl = policy.enabledFhlSegments || allFhlSegs;
                                  const isEnabled = enabledFhl.includes(seg);
                                  return (
                                    <button
                                      key={seg}
                                      onClick={() => {
                                        const currentEnabled = policy.enabledFhlSegments || allFhlSegs;
                                        const currentDisabled = policy.disabledFhlSegments || [];
                                        
                                        let newEnabled: string[];
                                        let newDisabled: string[];
                                        
                                        if (isEnabled) {
                                          newEnabled = currentEnabled.filter(s => s !== seg);
                                          newDisabled = [...currentDisabled, seg];
                                        } else {
                                          newEnabled = [...currentEnabled, seg];
                                          newDisabled = currentDisabled.filter(s => s !== seg);
                                        }
                                        
                                        const updated = {
                                          ...(config.cargoImp?.airlinePolicies || {}),
                                          [code]: { ...policy, enabledFhlSegments: newEnabled, disabledFhlSegments: newDisabled }
                                        };
                                        updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                                      }}
                                      className={`p-1 rounded text-[9px] font-mono font-bold text-center transition-all ${
                                        isEnabled 
                                          ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200' 
                                          : 'bg-red-50 text-red-400 border border-red-200 line-through hover:bg-red-100'
                                      }`}
                                      title={FHL_SEGMENTS[seg as keyof typeof FHL_SEGMENTS]?.name || seg}
                                    >
                                      {seg}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] text-blue-400 mt-1">
                                ✓ {(policy.enabledFhlSegments || Object.keys(FHL_SEGMENTS)).length} FHL activos
                              </p>
                            </div>
                            
                            {/* Notas */}
                            {policy.notes && (
                              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                                <p className="text-[10px] text-amber-700">
                                  <Info size={10} className="inline mr-1" />
                                  {policy.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </details>
                      );
                    })}
                </div>

                {/* Agregar nueva política */}
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-700 mb-2">+ Agregar política de aerolínea</p>
                  <div className="flex items-end gap-2 flex-wrap">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Prefijo AWB</label>
                      <input
                        type="text"
                        maxLength={3}
                        placeholder="Ej: 075"
                        value={newAirlineCode}
                        onChange={(e) => setNewAirlineCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 3))}
                        className="w-16 border border-emerald-300 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Nombre</label>
                      <input
                        type="text"
                        placeholder="Ej: DHL"
                        id="newPolicyName"
                        className="w-24 border border-emerald-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (newAirlineCode && newAirlineCode.length === 3) {
                          const nameInput = document.getElementById('newPolicyName') as HTMLInputElement;
                          const allSegs = Object.keys(FWB_SEGMENTS);
                          
                          const updated = {
                            ...(config.cargoImp?.airlinePolicies || {}),
                            [newAirlineCode]: {
                              awbPrefix: newAirlineCode,
                              name: nameInput?.value || `Aerolínea ${newAirlineCode}`,
                              policy: 21,
                              fwbVersion: 'FWB/16' as FwbVersion,
                              fhlVersion: 'FHL/4' as FhlVersion,
                              includeUnbUnz: true,
                              ociFormat: 'withPrefix',
                              enabledSegments: allSegs,
                              disabledSegments: [],
                              defaultSphCodes: ['EAP']
                            }
                          };
                          updateConfig('cargoImp', { ...config.cargoImp, airlinePolicies: updated });
                          setNewAirlineCode('');
                          if (nameInput) nameInput.value = '';
                        }
                      }}
                      disabled={!newAirlineCode || newAirlineCode.length !== 3}
                      className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Plus size={12} /> Agregar
                    </button>
                  </div>
                </div>
              </div>

              {/* Referencia de segmentos */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800 flex items-center gap-2 py-2 font-medium">
                  <ChevronRight size={14}/> Ver referencia de segmentos FWB/FHL
                </summary>
                <div className="mt-2 p-3 bg-slate-100 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-purple-700 mb-2">Segmentos FWB ({Object.keys(FWB_SEGMENTS).length})</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(FWB_SEGMENTS).map(seg => (
                          <span key={seg} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono">
                            {seg}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-700 mb-2">Segmentos FHL ({Object.keys(FHL_SEGMENTS).length})</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(FHL_SEGMENTS).map(seg => (
                          <span key={seg} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                            {seg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </CollapsibleSection>

          {/* ============================================================ */}
          {/* TIMEOUTS Y REINTENTOS */}
          {/* ============================================================ */}
          <CollapsibleSection 
            title="Configuración de Red" 
            icon={<Clock size={18} />}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={config.messageConfig.sendTimeoutMs}
                  onChange={(e) => updateConfig('messageConfig', { ...config.messageConfig, sendTimeoutMs: parseInt(e.target.value) || 30000 })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  min={5000}
                  max={120000}
                  step={1000}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Reintentos máximos</label>
                <input
                  type="number"
                  value={config.messageConfig.maxRetries}
                  onChange={(e) => updateConfig('messageConfig', { ...config.messageConfig, maxRetries: parseInt(e.target.value) || 3 })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  min={0}
                  max={10}
                />
              </div>
            </div>
          </CollapsibleSection>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Los cambios se aplican inmediatamente. Use "Guardar" para persistir en su sistema.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-300 flex items-center gap-2"
            >
              Cerrar
            </button>
            {onSaveConfig && (
              <button
                onClick={() => {
                  onSaveConfig(config);
                  setSaveMessage({ type: 'success', text: '✓ Configuración emitida para guardar' });
                }}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
              >
                <CheckCircle2 size={16} /> Guardar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;

