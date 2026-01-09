import { useState, useEffect, useCallback } from 'preact/hooks';
import { FunctionComponent, JSX } from 'preact';
import { 
  Settings, X, Plus, Trash2, AlertTriangle, CheckCircle2, 
  Plane, Globe, Shield, Clock, ChevronDown, ChevronRight, Info, Radio
} from 'lucide-preact';
import { 
  ConnectorConfig, DEFAULT_CONNECTOR_CONFIG,
  AVAILABLE_SPH_CODES, AVAILABLE_OCI_CONTROL_INFO
} from '../types';
import { 
  getApiConfig, ApiConfig, 
  getTransmissionEnvironment, setTransmissionEnvironment, 
  TransmissionEnvironment, PRODUCTION_CONFIG, UAT_CONFIG 
} from '../services/traxonApiClient';

// ============================================================
// CONFIGURACIÓN EN MEMORIA (no persiste)
// ============================================================
// Esta variable mantiene la config durante la sesión actual.
// Cuando se cierra el navegador o se recarga, vuelve a DEFAULT.
let sessionConfig: ConnectorConfig = { ...DEFAULT_CONNECTOR_CONFIG };

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange?: (config: ConnectorConfig) => void;
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

export const ConfigPanel: FunctionComponent<ConfigPanelProps> = ({ isOpen, onClose, onConfigChange }) => {
  const [config, setConfig] = useState<ConnectorConfig>(() => ({ ...sessionConfig }));
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newAirlineCode, setNewAirlineCode] = useState('');
  const [newAirlineSph, setNewAirlineSph] = useState<string[]>([]);
  const [newCountryCode, setNewCountryCode] = useState('');
  const [newOciInfoIdentifier, setNewOciInfoIdentifier] = useState('AGT');
  const [newOciControlInfo, setNewOciControlInfo] = useState('RA');
  const [editingCountry, setEditingCountry] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig | null>(null);
  const [currentEnvironment, setCurrentEnvironment] = useState<TransmissionEnvironment>('PRODUCTION');

  // Cargar configuración al abrir (desde memoria de sesión, NO localStorage)
  useEffect(() => {
    if (isOpen) {
      // Cargar desde la variable en memoria (sessionConfig)
      setConfig({ ...sessionConfig });
      setSaveMessage(null);
      const env = getTransmissionEnvironment();
      setCurrentEnvironment(env);
      setApiConfig(getApiConfig());
    }
  }, [isOpen]);

  // Cambiar ambiente de transmisión (NO persiste, solo en memoria)
  const handleEnvironmentChange = (env: TransmissionEnvironment) => {
    setTransmissionEnvironment(env);
    setCurrentEnvironment(env);
    setApiConfig(getApiConfig());
    setSaveMessage({ type: 'success', text: `Ambiente cambiado a ${env === 'PRODUCTION' ? 'Producción' : 'UAT (Pruebas)'}` });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Actualizar config en memoria de sesión (NO persiste en localStorage)
  const updateConfig = useCallback(<K extends keyof ConnectorConfig>(key: K, value: ConnectorConfig[K]) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      // Guardar en la variable de sesión (memoria, no localStorage)
      sessionConfig = newConfig;
      return newConfig;
    });
    setSaveMessage(null);
  }, []);

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
          {/* AMBIENTE DE TRANSMISIÓN */}
          {/* ============================================================ */}
          <div className="border-2 rounded-lg p-4 bg-slate-50 border-slate-300">
            <div className="flex items-start gap-3">
              <Radio className="mt-0.5 flex-shrink-0 text-purple-600" size={18} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-700">
                    🌐 Ambiente de Transmisión
                  </p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    currentEnvironment === 'UAT' 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-green-600 text-white'
                  }`}>
                    {currentEnvironment === 'UAT' ? '🧪 PRUEBAS (UAT)' : '🚀 PRODUCCIÓN'}
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 mb-4">
                  Selecciona el ambiente al que se enviarán los mensajes. <strong>Por defecto es Producción</strong>. 
                  Usa UAT solo para pruebas. No se persiste, al cerrar vuelve a Producción.
                </p>
                
                {/* Selector de Ambiente */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Opción Producción */}
                  <button
                    onClick={() => handleEnvironmentChange('PRODUCTION')}
                    className={`p-4 rounded-lg border-2 text-left ${
                      currentEnvironment === 'PRODUCTION'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 bg-white hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        currentEnvironment === 'PRODUCTION' 
                          ? 'border-green-600 bg-green-600' 
                          : 'border-slate-300'
                      }`}>
                        {currentEnvironment === 'PRODUCTION' && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="font-bold text-green-700">🚀 Producción</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded truncate">
                        {PRODUCTION_CONFIG.endpoint.replace('https://', '')}
                      </p>
                      <p><span className="text-slate-400">Recipient:</span> <span className="font-mono">{PRODUCTION_CONFIG.recipientAddress}</span></p>
                    </div>
                  </button>
                  
                  {/* Opción UAT */}
                  <button
                    onClick={() => handleEnvironmentChange('UAT')}
                    className={`p-4 rounded-lg border-2 text-left ${
                      currentEnvironment === 'UAT'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        currentEnvironment === 'UAT' 
                          ? 'border-amber-600 bg-amber-600' 
                          : 'border-slate-300'
                      }`}>
                        {currentEnvironment === 'UAT' && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="font-bold text-amber-700">🧪 UAT (Pruebas)</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded truncate">
                        {UAT_CONFIG.endpoint.replace('https://', '')}
                      </p>
                      <p><span className="text-slate-400">Recipient:</span> <span className="font-mono">{UAT_CONFIG.recipientAddress}</span></p>
                    </div>
                  </button>
                </div>

                {/* Información del ambiente seleccionado */}
                <div className={`p-3 rounded-lg text-xs ${
                  currentEnvironment === 'UAT' 
                    ? 'bg-amber-100 border border-amber-300' 
                    : 'bg-green-100 border border-green-300'
                }`}>
                  <p className="font-semibold mb-1">
                    {currentEnvironment === 'UAT' ? '⚠️ Modo Pruebas Activo' : '✅ Modo Producción Activo'}
                  </p>
                  <p className="text-slate-600">
                    {currentEnvironment === 'UAT' 
                      ? `Los mensajes se enviarán a ${UAT_CONFIG.recipientAddress} (cuenta de pruebas). No afectan datos reales.`
                      : 'Los mensajes se enviarán a las aerolíneas reales según el AWB.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* DIRECCIONES PIMA - SOLO LECTURA */}
          {/* ============================================================ */}
          <div className="bg-slate-100 border border-slate-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="text-slate-600 mt-0.5 flex-shrink-0" size={18} />
              <div className="flex-1">
                <p className="font-semibold mb-3 text-slate-700">🔒 Direcciones PIMA (Solo Lectura)</p>
                <p className="text-xs text-slate-500 mb-3">
                  Estas direcciones son asignadas por CHAMP/Traxon y se usan en el messageHeader de cada envío.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 font-medium block mb-1">Sender Address (Agente)</label>
                    <div className="bg-white border border-slate-200 rounded px-3 py-2 font-mono text-sm text-slate-700 select-all cursor-text">
                      {apiConfig?.senderAddress || 'No configurado'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium block mb-1">Recipient Address (Aerolínea)</label>
                    <div className="bg-white border border-slate-200 rounded px-3 py-2 font-mono text-sm text-slate-700 select-all cursor-text">
                      {apiConfig?.recipientAddress || 'No configurado'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info sobre accountNumber */}
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
                  <span><strong>074</strong> = KLM</span>
                  <span><strong>057</strong> = Air France</span>
                  <span><strong>020</strong> = Lufthansa</span>
                  <span><strong>006</strong> = Delta</span>
                  <span><strong>001</strong> = American</span>
                  <span><strong>205</strong> = Emirates</span>
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;

