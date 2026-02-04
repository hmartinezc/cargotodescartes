
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { FunctionComponent, JSX } from 'preact';
import { memo } from 'preact/compat';
import { InternalShipment, ShipmentStatus, Party, Agent, FlightSegment, OtherCharge, SecurityInfo, AVAILABLE_SPH_CODES, AVAILABLE_OCI_CONTROL_INFO, DEFAULT_SPH_BY_AIRLINE, loadConnectorConfig, saveConnectorConfig, ConnectorConfig, InternalHouseBill, HouseBill, MessageProvider, MESSAGE_PROVIDER_INFO } from '../types';
import { getAwbPrefix, getDefaultSphCodes, sanitizeGoodsDescription } from '../services/champService';
import { cargoImpService } from '../services/providers';
import { toggleFwbSegment, toggleFhlSegment, resetRuntimeConfig } from '../services/runtimeConfigStore';
import { FwbSegmentType, FhlSegmentType, FHL_SEGMENTS } from '../services/providers/cargoimp/cargoImpTypes';
import { 
  DescartesTransmitService, 
  BundleTransmissionResult,
  TransmissionResult,
  configureDescartesService,
  isDescartesConfigured 
} from '../services/descartesTransmitService';

// Tipo para resultado de generación EDI (reemplaza TraxonSendResult)
export interface CargoImpResult {
  allSuccess: boolean;
  summary: string;
  fwbMessage?: string;
  fhlMessages?: string[];
  // Resultado de transmisión a Descartes (opcional)
  transmissionResult?: BundleTransmissionResult;
}
import { 
  X, Send, Plane, Users, ShieldCheck, Banknote, Layers, Info, MapPin, Copy, Check, AlertTriangle, 
  Building, User, Briefcase, Calendar, PenLine, Eye, Package, Scale, Clock, CheckCircle2, Loader2, Plus, Trash2, Settings,
  ChevronDown, ChevronRight, Terminal, Code, FileText, Upload
} from 'lucide-preact';
import { ConfigPanel, resetSessionConfig } from './ConfigPanel';
import { CargoImpSegmentViewer } from './CargoImpSegmentViewer';
import { CargoXmlViewer } from './CargoXmlViewer';
import { generateCargoXmlBundle, CargoXmlBundle } from '../services/cargoXmlService';

// ============================================================
// COMPONENTE OPTIMIZADO: House Row Colapsable (Memoizado)
// - Renderiza solo el header cuando está colapsado
// - Solo se re-renderiza cuando sus props cambian
// ============================================================
interface HouseRowProps {
  house: HouseBill;
  index: number;
  isExpanded: boolean;
  onToggle: (index: number) => void;
  onUpdate: (index: number, updatedHouse: HouseBill) => void;
  masterOrigin: string;
  masterDestination: string;
  isReadOnly: boolean;
}

const HouseRow = memo<HouseRowProps>(({ 
  house: h, 
  index: i, 
  isExpanded, 
  onToggle, 
  onUpdate,
  masterOrigin,
  masterDestination,
  isReadOnly 
}) => {
  // Helpers para obtener valores (memoizados dentro del componente)
  const getShipperValue = useCallback((field: string) => {
    const flatKey = `shipper${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof typeof h;
    if (h[flatKey] !== undefined && h[flatKey] !== '') return h[flatKey];
    if (field === 'name') return h.shipperName || h.shipper?.name || '';
    if (field === 'taxId') return h.shipper?.taxId || '';
    if (field === 'address') return h.shipper?.address?.street || '';
    if (field === 'city') return h.shipper?.address?.place || '';
    if (field === 'country') return h.shipper?.address?.countryCode || '';
    return '';
  }, [h]);
  
  const getConsigneeValue = useCallback((field: string) => {
    const flatKey = `consignee${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof typeof h;
    if (h[flatKey] !== undefined && h[flatKey] !== '') return h[flatKey];
    if (field === 'name') return h.consigneeName || h.consignee?.name || '';
    if (field === 'taxId') return h.consignee?.taxId || '';
    if (field === 'address') return h.consignee?.address?.street || '';
    if (field === 'city') return h.consignee?.address?.place || '';
    if (field === 'country') return h.consignee?.address?.countryCode || '';
    return '';
  }, [h]);

  // Update handlers optimizados
  const updateField = useCallback((field: string, value: string | number | string[]) => {
    const updated = { ...h, [field]: value };
    onUpdate(i, updated);
  }, [h, i, onUpdate]);

  const updateShipper = useCallback((field: string, value: string) => {
    const updated = { ...h };
    const flatKey = `shipper${field.charAt(0).toUpperCase() + field.slice(1)}`;
    (updated as any)[flatKey] = value;
    
    if (!updated.shipper) {
      updated.shipper = { name: '', address: { street: '', place: '', countryCode: '', postalCode: '' } };
    }
    if (field === 'name') { updated.shipper.name = value; updated.shipperName = value; }
    else if (field === 'taxId') updated.shipper.taxId = value;
    else if (field === 'address') updated.shipper.address.street = value;
    else if (field === 'city') updated.shipper.address.place = value;
    else if (field === 'country') updated.shipper.address.countryCode = value;
    
    onUpdate(i, updated);
  }, [h, i, onUpdate]);

  const updateConsignee = useCallback((field: string, value: string) => {
    const updated = { ...h };
    const flatKey = `consignee${field.charAt(0).toUpperCase() + field.slice(1)}`;
    (updated as any)[flatKey] = value;
    
    if (!updated.consignee) {
      updated.consignee = { name: '', address: { street: '', place: '', countryCode: '', postalCode: '' } };
    }
    if (field === 'name') { updated.consignee.name = value; updated.consigneeName = value; }
    else if (field === 'taxId') updated.consignee.taxId = value;
    else if (field === 'address') updated.consignee.address.street = value;
    else if (field === 'city') updated.consignee.address.place = value;
    else if (field === 'country') updated.consignee.address.countryCode = value;
    
    onUpdate(i, updated);
  }, [h, i, onUpdate]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header Compacto - Siempre visible, clickeable */}
      <button
        type="button"
        onClick={() => onToggle(i)}
        className="w-full bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="bg-sky-100 text-sky-700 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="font-mono font-bold text-slate-800 text-sm">{h.hawbNumber || 'Sin HAWB'}</span>
          <span className="text-slate-400 text-xs">|</span>
          <span className="text-xs text-slate-600 truncate max-w-[150px]" title={String(getShipperValue('name') || '')}>
            {String(getShipperValue('name') || '?')} → {String(getConsigneeValue('name') || '?')}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-sm font-semibold text-slate-700">{h.pieces} pcs</span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-sm font-semibold text-slate-700">{h.weight} kg</span>
          </div>
          {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        </div>
      </button>
      
      {/* Contenido Expandible - Solo se monta cuando está expandido */}
      {isExpanded && (
        <div className="p-3 space-y-3 animate-in slide-in-from-top-1 duration-150">
          {/* Fila 1: Datos básicos */}
          <div className="grid grid-cols-5 gap-2">
            <div className="flex flex-col">
              <label className="text-[10px] text-purple-600 uppercase font-bold mb-0.5">HAWB *</label>
              <input 
                type="text" value={h.hawbNumber || ''} 
                onChange={(e) => updateField('hawbNumber', e.target.value)}
                readOnly={isReadOnly} maxLength={12}
                className="text-sm border border-purple-200 rounded px-2 py-1 focus:ring-1 focus:ring-purple-400 outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Origen</label>
              <input 
                type="text" value={h.origin || masterOrigin} 
                onChange={(e) => updateField('origin', e.target.value)}
                readOnly={isReadOnly} maxLength={3}
                className="text-sm border border-slate-200 rounded px-2 py-1 focus:ring-1 outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Destino</label>
              <input 
                type="text" value={h.destination || masterDestination} 
                onChange={(e) => updateField('destination', e.target.value)}
                readOnly={isReadOnly} maxLength={3}
                className="text-sm border border-slate-200 rounded px-2 py-1 focus:ring-1 outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Piezas *</label>
              <input 
                type="number" value={h.pieces} 
                onChange={(e) => updateField('pieces', parseInt(e.target.value) || 0)}
                readOnly={isReadOnly}
                className="text-sm border border-slate-200 rounded px-2 py-1 focus:ring-1 outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Peso *</label>
              <input 
                type="number" step="0.01" value={h.weight} 
                onChange={(e) => updateField('weight', parseFloat(e.target.value) || 0)}
                readOnly={isReadOnly}
                className="text-sm border border-slate-200 rounded px-2 py-1 focus:ring-1 outline-none"
              />
            </div>
          </div>

          {/* Shipper y Consignee lado a lado - Compacto */}
          <div className="grid grid-cols-2 gap-2">
            {/* Shipper */}
            <div className="bg-sky-50/50 border border-sky-100 rounded p-2">
              <div className="text-[10px] font-bold text-sky-600 mb-1 flex items-center gap-1">
                <Building size={10}/> SHIPPER
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <input placeholder="Nombre *" value={getShipperValue('name') as string} onChange={(e) => updateShipper('name', e.target.value)} 
                  readOnly={isReadOnly} className="col-span-2 px-1.5 py-1 border border-sky-200 rounded text-xs" />
                <input placeholder="NIT/Tax ID" value={getShipperValue('taxId') as string} onChange={(e) => updateShipper('taxId', e.target.value)} 
                  readOnly={isReadOnly} className="px-1.5 py-1 border rounded text-xs" />
                <input placeholder="Dirección" value={getShipperValue('address') as string} onChange={(e) => updateShipper('address', e.target.value)} 
                  readOnly={isReadOnly} className="col-span-3 px-1.5 py-1 border rounded text-xs" />
                <input placeholder="Ciudad" value={getShipperValue('city') as string} onChange={(e) => updateShipper('city', e.target.value)} 
                  readOnly={isReadOnly} className="col-span-2 px-1.5 py-1 border rounded text-xs" />
                <input placeholder="País" value={getShipperValue('country') as string} onChange={(e) => updateShipper('country', e.target.value)} 
                  readOnly={isReadOnly} maxLength={2} className="px-1.5 py-1 border rounded text-xs" />
              </div>
            </div>
            
            {/* Consignee */}
            <div className="bg-purple-50/50 border border-purple-100 rounded p-2">
              <div className="text-[10px] font-bold text-purple-600 mb-1 flex items-center gap-1">
                <User size={10}/> CONSIGNEE
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <input placeholder="Nombre *" value={getConsigneeValue('name') as string} onChange={(e) => updateConsignee('name', e.target.value)} 
                  readOnly={isReadOnly} className="col-span-2 px-1.5 py-1 border border-purple-200 rounded text-xs" />
                <input placeholder="NIT/Tax ID" value={getConsigneeValue('taxId') as string} onChange={(e) => updateConsignee('taxId', e.target.value)} 
                  readOnly={isReadOnly} className="px-1.5 py-1 border rounded text-xs" />
                <input placeholder="Dirección" value={getConsigneeValue('address') as string} onChange={(e) => updateConsignee('address', e.target.value)} 
                  readOnly={isReadOnly} className="col-span-3 px-1.5 py-1 border rounded text-xs" />
                <input placeholder="Ciudad" value={getConsigneeValue('city') as string} onChange={(e) => updateConsignee('city', e.target.value)} 
                  readOnly={isReadOnly} className="col-span-2 px-1.5 py-1 border rounded text-xs" />
                <input placeholder="País" value={getConsigneeValue('country') as string} onChange={(e) => updateConsignee('country', e.target.value)} 
                  readOnly={isReadOnly} maxLength={2} className="px-1.5 py-1 border rounded text-xs" />
              </div>
            </div>
          </div>

          {/* Nature of Goods y Common Name */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Nature of Goods *</label>
              <input 
                type="text" value={h.natureOfGoods || ''} 
                onChange={(e) => updateField('natureOfGoods', e.target.value)}
                readOnly={isReadOnly} maxLength={500}
                className="text-xs border border-slate-200 rounded px-2 py-1 focus:ring-1 outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Common Name</label>
              <input 
                type="text" value={h.commonName || ''} 
                onChange={(e) => updateField('commonName', e.target.value)}
                readOnly={isReadOnly} maxLength={500}
                className="text-xs border border-slate-200 rounded px-2 py-1 focus:ring-1 outline-none"
              />
            </div>
          </div>

          {/* HTS Codes (Códigos Arancelarios) */}
          <div className="flex flex-col">
            <label className="text-[10px] text-purple-600 uppercase font-bold mb-0.5 flex items-center gap-1">
              <Code size={10}/> HTS Codes (Arancelarios)
            </label>
            <div className="flex flex-wrap gap-1 min-h-[28px] p-1.5 bg-purple-50 border border-purple-200 rounded">
              {(h.htsCodes || []).length > 0 && h.htsCodes.map((code, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-mono">
                  {code}
                  {!isReadOnly && (
                    <button 
                      onClick={() => {
                        const newCodes = h.htsCodes.filter((_, i) => i !== idx);
                        updateField('htsCodes', newCodes);
                      }}
                      className="hover:text-red-600"
                    >
                      <X size={10}/>
                    </button>
                  )}
                </span>
              ))}
              {!isReadOnly && (
                <input
                  type="text"
                  placeholder={(h.htsCodes || []).length > 0 ? "+ Agregar HTS" : "Escribe código HTS y presiona Enter"}
                  className="flex-1 min-w-[120px] px-1 py-0.5 text-xs border-0 bg-transparent outline-none placeholder:text-purple-400 placeholder:italic"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const newCode = e.currentTarget.value.trim().replace(/\D/g, '');
                      const currentCodes = h.htsCodes || [];
                      if (newCode && !currentCodes.includes(newCode)) {
                        updateField('htsCodes', [...currentCodes, newCode]);
                      }
                      e.currentTarget.value = '';
                    }
                  }}
                />
              )}
              {isReadOnly && (h.htsCodes || []).length === 0 && (
                <span className="text-xs text-purple-400 italic">Sin códigos HTS</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renders innecesarios
  return (
    prevProps.house === nextProps.house &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isReadOnly === nextProps.isReadOnly &&
    prevProps.index === nextProps.index
  );
});

HouseRow.displayName = 'HouseRow';

// Componente colapsable para secciones opcionales
interface CollapsibleOptionalProps {
  title: string;
  children: JSX.Element | JSX.Element[] | null;
  defaultOpen?: boolean;
}

const CollapsibleOptional: FunctionComponent<CollapsibleOptionalProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-100 rounded overflow-hidden mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-xs text-slate-600"
      >
        <span className="flex items-center gap-1">
          {isOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
          {title}
        </span>
        <span className="text-[10px] text-slate-400 bg-slate-200 px-1 rounded">opcional</span>
      </button>
      {isOpen && <div className="p-2 bg-white border-t border-slate-100">{children}</div>}
    </div>
  );
};

interface ChampModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: InternalShipment | null;
  onSave?: (shipment: InternalShipment) => void;
  onCopySuccess?: (id: string, ediContent: string) => void;
  /** Callback cuando el usuario guarda la configuración - emite JSON completo para persistir en BD */
  onSaveConfig?: (config: ConnectorConfig) => void;
}

type Tab = 'summary' | 'parties' | 'cargo' | 'financials' | 'security' | 'houses' | 'json' | 'xml';
type JsonSubTab = 'fwb' | 'fhl';
type XmlSubTab = 'xfwb' | 'xfzb';

const deepClone = <T,>(value: T): T => {
  // structuredClone es significativamente más rápido que JSON.parse(JSON.stringify(...))
  // y evita algunos edge-cases (aunque este modelo de datos es serializable).
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

// ============================================================
// COMPONENTES REUTILIZABLES
// ============================================================

interface InputGroupProps {
  label: string;
  value: string | number | undefined;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'number' | 'date';
  required?: boolean;
}

const InputGroup: FunctionComponent<InputGroupProps> = ({ 
  label, value, onChange, readOnly = false, maxLength, placeholder, className = "", type = "text", required = false 
}) => {
  const strValue = value?.toString() || '';
  const isOver = maxLength && strValue.length > maxLength;
  const isEmpty = required && !strValue.trim();
  
  // Clases visuales: azul para requerido, gris para opcional
  const borderClass = required 
    ? (isEmpty || isOver ? 'border-red-300 bg-red-50' : 'border-purple-300 focus:ring-purple-300') 
    : (isOver ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:ring-slate-200');
  
  const labelClass = required ? 'text-slate-600' : 'text-slate-400';
  
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-0.5">
        <label className={`text-[10px] uppercase font-bold flex items-center gap-1 ${labelClass}`}>
          {label}
          {required && <span className="text-purple-500">*</span>}
          {!required && <span className="text-[9px] text-slate-300 font-normal normal-case">(opt)</span>}
        </label>
        {maxLength && !readOnly && (
          <span className={`text-[9px] ${isOver ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
            {strValue.length}/{maxLength}
          </span>
        )}
      </div>
      {readOnly ? (
        <div className={`text-sm font-medium py-1.5 border-b min-h-[32px] flex items-center px-2 rounded ${required ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-slate-50/50'} text-slate-700`}>
          {strValue || <span className="text-slate-400 italic text-xs">-</span>}
        </div>
      ) : (
        <input 
          type={type}
          value={strValue} 
          onChange={(e) => onChange?.(e.target.value)} 
          className={`text-sm border ${borderClass} rounded px-2 py-1.5 focus:ring-1 outline-none transition-all h-[34px]`}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};

// Componente para mostrar sección de Party (Shipper/Consignee)
interface PartySectionProps {
  title: string;
  icon: JSX.Element;
  party: Party;
  onUpdate: (party: Party) => void;
  readOnly: boolean;
}

const PartySection: FunctionComponent<PartySectionProps> = ({ title, icon, party, onUpdate, readOnly }) => {
  const updateField = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'address') {
        onUpdate({ ...party, address: { ...party.address, [child]: value } });
      } else if (parent === 'contact') {
        onUpdate({ ...party, contact: { ...party.contact, identifier: party.contact?.identifier || 'TE', [child]: value } });
      }
    } else {
      onUpdate({ ...party, [field]: value });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
        <div className="bg-purple-100 p-1 rounded text-purple-600">{icon}</div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        {!readOnly && <span className="ml-auto text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded flex items-center gap-1"><PenLine size={10}/></span>}
      </div>
      {/* Layout 2 columnas para lado a lado */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
        <InputGroup label="Nombre *" value={party.name} onChange={(v) => updateField('name', v)} readOnly={readOnly} maxLength={35} required />
        <InputGroup label="Nombre 2" value={party.name2 || ''} onChange={(v) => updateField('name2', v)} readOnly={readOnly} maxLength={35} />
        
        <InputGroup label="NIT/Tax ID" value={party.taxId || ''} onChange={(v) => updateField('taxId', v)} readOnly={readOnly} maxLength={17} />
        <InputGroup label="No. Cuenta" value={party.accountNumber || ''} onChange={(v) => updateField('accountNumber', v)} readOnly={readOnly} maxLength={14} />
        
        <InputGroup label="Dirección 1 *" value={party.address.street} onChange={(v) => updateField('address.street', v)} readOnly={readOnly} maxLength={35} required />
        <InputGroup label="Dirección 2" value={party.address.street2 || ''} onChange={(v) => updateField('address.street2', v)} readOnly={readOnly} maxLength={35} />
        
        <InputGroup label="Ciudad *" value={party.address.place} onChange={(v) => updateField('address.place', v)} readOnly={readOnly} maxLength={17} required />
        <InputGroup label="Estado" value={party.address.state || ''} onChange={(v) => updateField('address.state', v)} readOnly={readOnly} maxLength={9} />
        
        <InputGroup label="País (ISO) *" value={party.address.countryCode} onChange={(v) => updateField('address.countryCode', v)} readOnly={readOnly} maxLength={2} required />
        <InputGroup label="Código Postal" value={party.address.postalCode} onChange={(v) => updateField('address.postalCode', v)} readOnly={readOnly} maxLength={9} />
        
        <InputGroup label="Teléfono" value={party.contact?.number || ''} onChange={(v) => updateField('contact.number', v)} readOnly={readOnly} maxLength={25} className="col-span-2" />
      </div>
      
      {/* Campos opcionales colapsables */}
      <CollapsibleOptional title="Campos Adicionales">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
          <InputGroup label="Email" value={party.email || ''} onChange={(v) => updateField('email', v)} readOnly={readOnly} maxLength={70} />
          <InputGroup label="Fax" value={party.fax || ''} onChange={(v) => updateField('fax', v)} readOnly={readOnly} maxLength={25} />
        </div>
      </CollapsibleOptional>
    </div>
  );
};

// Componente para Agent
interface AgentSectionProps {
  agent: Agent;
  onUpdate: (agent: Agent) => void;
  readOnly: boolean;
}

const AgentSection: FunctionComponent<AgentSectionProps> = ({ agent, onUpdate, readOnly }) => {
  const updateField = (field: keyof Agent, value: string) => {
    onUpdate({ ...agent, [field]: value });
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-purple-200 pb-2">
        <div className="bg-purple-100 p-1.5 rounded text-purple-600"><Briefcase size={16}/></div>
        <h3 className="font-bold text-purple-800">Agente de Carga (IATA)</h3>
        {!readOnly && <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded flex items-center gap-1"><PenLine size={10}/> Editable</span>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <InputGroup label="Nombre del Agente" value={agent.name} onChange={(v) => updateField('name', v)} readOnly={readOnly} maxLength={35} required className="col-span-2" />
        <InputGroup label="Código IATA" value={agent.iataCode} onChange={(v) => updateField('iataCode', v)} readOnly={readOnly} maxLength={7} required />
        <InputGroup label="Código CASS" value={agent.cassCode || ''} onChange={(v) => updateField('cassCode', v)} readOnly={readOnly} maxLength={4} />
        <InputGroup label="Ciudad/Lugar" value={agent.place} onChange={(v) => updateField('place', v)} readOnly={readOnly} maxLength={17} required />
        <InputGroup label="Número de Cuenta" value={agent.accountNumber || ''} onChange={(v) => updateField('accountNumber', v)} readOnly={readOnly} maxLength={14} />
      </div>
    </div>
  );
};

// Componente de Resumen Visual
interface SummaryCardProps {
  icon: JSX.Element;
  label: string;
  value: string | number;
  subvalue?: string;
  color?: string;
}

const SummaryCard: FunctionComponent<SummaryCardProps> = ({ icon, label, value, subvalue, color = 'blue' }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700'
  };
  
  return (
    <div className={`rounded-lg border p-3 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs uppercase font-bold opacity-70">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
      {subvalue && <div className="text-xs opacity-60">{subvalue}</div>}
    </div>
  );
};

// ============================================================
// COMPONENTE EXPANDIBLE PARA VER CAMPOS JSON TRANSMITIDOS
// ============================================================

interface ExpandableJsonSectionProps {
  title: string;
  icon: JSX.Element;
  data: any;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'slate' | 'red';
  defaultExpanded?: boolean;
  description?: string;
  isRequired?: boolean;
}

const ExpandableJsonSection: FunctionComponent<ExpandableJsonSectionProps> = ({ 
  title, icon, data, color = 'blue', defaultExpanded = false, description, isRequired = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const colorClasses: Record<string, { border: string; bg: string; text: string; headerBg: string }> = {
    blue: { border: 'border-purple-200', bg: 'bg-purple-50/50', text: 'text-purple-700', headerBg: 'bg-purple-100' },
    green: { border: 'border-green-200', bg: 'bg-green-50/50', text: 'text-green-700', headerBg: 'bg-green-100' },
    amber: { border: 'border-amber-200', bg: 'bg-amber-50/50', text: 'text-amber-700', headerBg: 'bg-amber-100' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50/50', text: 'text-purple-700', headerBg: 'bg-purple-100' },
    slate: { border: 'border-slate-200', bg: 'bg-slate-50/50', text: 'text-slate-700', headerBg: 'bg-slate-100' },
    red: { border: 'border-red-200', bg: 'bg-red-50/50', text: 'text-red-700', headerBg: 'bg-red-100' }
  };
  
  const colors = colorClasses[color];
  const isEmpty = !data || (typeof data === 'object' && Object.keys(data).length === 0);
  const fieldCount = data && typeof data === 'object' ? Object.keys(data).length : (data ? 1 : 0);

  // Renderiza un valor de forma recursiva
  const renderValue = (value: any, depth: number = 0): JSX.Element | string => {
    if (value === null || value === undefined) {
      return <span className="text-slate-400 italic">null</span>;
    }
    if (typeof value === 'boolean') {
      return <span className={value ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{value.toString()}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-purple-600 font-mono">{value}</span>;
    }
    if (typeof value === 'string') {
      return <span className="text-purple-600 font-mono">"{value}"</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-400 italic">[]</span>;
      return (
        <div className={`ml-${Math.min(depth * 4, 12)} border-l-2 border-slate-200 pl-3 mt-1`}>
          {value.map((item, idx) => (
            <div key={idx} className="mb-2">
              <span className="text-slate-400 text-xs">[{idx}]</span>
              {typeof item === 'object' ? (
                <div className="ml-2">{renderValue(item, depth + 1)}</div>
              ) : (
                <span className="ml-2">{renderValue(item, depth + 1)}</span>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return <span className="text-slate-400 italic">{'{}'}</span>;
      return (
        <div className={depth > 0 ? `ml-${Math.min(depth * 4, 12)} border-l-2 border-slate-200 pl-3 mt-1` : ''}>
          {keys.map((key) => (
            <div key={key} className="py-1 flex flex-wrap items-start gap-2">
              <span className="text-slate-600 font-semibold text-xs min-w-[120px]">{key}:</span>
              <div className="flex-1">{renderValue(value[key], depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  return (
    <div className={`rounded-lg border ${colors.border} overflow-hidden mb-3`}>
      {/* Header Clickeable */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 ${colors.headerBg} hover:opacity-90 transition-all`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded ${colors.bg} ${colors.text}`}>
            {icon}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm ${colors.text}`}>{title}</span>
              {isRequired && <span className="text-red-500 text-xs font-bold">REQUERIDO</span>}
              {isEmpty && <span className="text-amber-500 text-xs font-bold">VACÍO</span>}
            </div>
            {description && <span className="text-xs text-slate-500">{description}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/70 px-2 py-0.5 rounded text-slate-600">
            {fieldCount} campo{fieldCount !== 1 ? 's' : ''}
          </span>
          {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
        </div>
      </button>
      
      {/* Contenido Expandible */}
      {isExpanded && (
        <div className={`px-4 py-3 ${colors.bg} text-sm max-h-96 overflow-y-auto`}>
          {isEmpty ? (
            <p className="text-slate-400 italic">Sin datos</p>
          ) : (
            renderValue(data)
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL DEL MODAL
// ============================================================

export const ChampModal: FunctionComponent<ChampModalProps> = ({ isOpen, onClose, shipment, onSave, onCopySuccess, onSaveConfig }) => {
  const [activeTab, setActiveTab] = useState<Tab>('parties');
  const [activeJsonTab, setActiveJsonTab] = useState<JsonSubTab>('fwb');
  const [activeXmlTab, setActiveXmlTab] = useState<XmlSubTab>('xfwb');
  const [formData, setFormData] = useState<InternalShipment | null>(null);
  const [copied, setCopied] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<CargoImpResult | null>(null);
  const [sendMode, setSendMode] = useState<'masterOnly' | 'masterAndHouses'>('masterAndHouses');
  const [messageFormat, setMessageFormat] = useState<'cargoxml' | 'edi'>('cargoxml');
  const [activeParty, setActiveParty] = useState<'shipper' | 'consignee'>('shipper');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [connectorConfig, setConnectorConfig] = useState<ConnectorConfig>(() => loadConnectorConfig());
  
  // Contador para forzar re-render cuando cambia la configuración runtime
  const [configVersion, setConfigVersion] = useState(0);
  
  // Proveedor fijo: CARGO_IMP (EDI)
  const selectedProvider: MessageProvider = 'CARGO_IMP';
  
  // Estado para houses expandidos - Set para O(1) lookup
  const [expandedHouses, setExpandedHouses] = useState<Set<number>>(new Set());

  const copyTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Determinar si es editable (solo en DRAFT)
  const isEditable = formData?.status === 'DRAFT';
  const isReadOnly = !isEditable;
  
  // Handler para toggle de houses (memoizado)
  const toggleHouseExpanded = useCallback((index: number) => {
    setExpandedHouses(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Handler para cerrar el modal completo
  // Resetea todas las configuraciones temporales (runtimeConfigStore y sessionConfig)
  // Los cambios hechos en el Tab EDI son efímeros y no persisten
  // Los cambios en ConfigPanel también se pierden al cerrar (en el futuro se guardarán en backend)
  const handleCloseModal = useCallback(() => {
    // Resetear configuración runtime (cambios del Tab EDI)
    resetRuntimeConfig();
    // Resetear configuración de sesión (cambios del ConfigPanel)
    resetSessionConfig();
    // Resetear el contador de versión
    setConfigVersion(0);
    // Llamar al onClose original
    onClose();
  }, [onClose]);

  // Handler para actualizar un house específico (memoizado)
  const updateHouse = useCallback((index: number, updatedHouse: InternalHouseBill) => {
    setFormData(prev => {
      if (!prev) return prev;
      const newHouses = [...prev.houseBills];
      newHouses[index] = updatedHouse;
      return { ...prev, houseBills: newHouses };
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (shipment) {
      setFormData(deepClone(shipment));
      setActiveJsonTab('fwb');
      setActiveXmlTab('xfwb');
      setActiveTab('parties');
      setValidationErrors([]);
      setSendResult(null);
      setSendMode('masterAndHouses');
      setMessageFormat('cargoxml');
      setActiveParty('shipper');
      // Resetear houses expandidos al cambiar de shipment
      setExpandedHouses(new Set());
    }
  }, [shipment]);

  // ============================================================
  // MEMO: Generación EDI para CARGO-IMP
  // Dependencias: configVersion para forzar re-generación cuando se toggle un segmento
  // Se genera siempre (no solo en tab json) para que los botones de copiar/transmitir funcionen
  // ============================================================
  const cargoImpGenerationResult = useMemo(() => {
    if (!formData) return { fwbMessage: null, fhlMessages: null, concatenatedFhl: null, policyInfo: null, error: null };
    
    try {
      // Obtener información de la política que se usará
      const awbPrefix = formData.awbNumber?.split('-')[0] || '000';
      const policyInfo = cargoImpService.getPolicyInfo(awbPrefix);
      
      // Log para debug de toggles
      console.log(`[CARGO-IMP] Regenerando (v${configVersion}) con política: ${policyInfo.airlineName}, segmentos habilitados: ${policyInfo.policy.enabledSegments?.length || 0}`);
      
      // Generar FWB (usa política basada en prefijo AWB internamente)
      const fwbMessage = cargoImpService.generateFWB(formData);
      
      // Generar FHL si es consolidado
      let fhlMessages: any[] = [];
      let concatenatedFhl: string = '';
      if (formData.hasHouses && formData.houseBills.length > 0) {
        // Generar mensajes FHL individuales para visualización
        fhlMessages = formData.houseBills.map(house => 
          cargoImpService.generateFHL(formData, house)
        );
        // Generar versión concatenada para copiar
        concatenatedFhl = cargoImpService.generateConcatenatedFHL(formData);
      }
      
      return { 
        fwbMessage, 
        fhlMessages: fhlMessages.length > 0 ? fhlMessages : null,
        concatenatedFhl,
        policyInfo,
        error: null 
      };
    } catch (e: any) {
      console.error('[CARGO-IMP Generation Error]', e);
      return { fwbMessage: null, fhlMessages: null, concatenatedFhl: null, policyInfo: null, error: e.message || 'Error generando EDI' };
    }
  }, [formData, selectedProvider, configVersion]);

  const { fwbMessage: cargoImpFwb, fhlMessages: cargoImpFhl, concatenatedFhl: cargoImpConcatFhl, policyInfo: cargoImpPolicyInfo, error: cargoImpGenError } = cargoImpGenerationResult;

  // ============================================================
  // MEMO: Generación XML para Cargo-XML (XFWB/XFZB)
  // ============================================================
  const cargoXmlBundle = useMemo<CargoXmlBundle | null>(() => {
    if (!formData) return null;
    
    try {
      console.log('[CARGO-XML] Generando bundle XFWB/XFZB...');
      const bundle = generateCargoXmlBundle(formData);
      console.log(`[CARGO-XML] Bundle generado: XFWB válido=${bundle.xfwb.isValid}, XFZBs=${bundle.xfzbs.length}`);
      return bundle;
    } catch (e: any) {
      console.error('[CARGO-XML Generation Error]', e);
      return null;
    }
  }, [formData, configVersion]);

  // Handler para toggle de segmentos desde el visor EDI
  // Usa el RuntimeConfigStore (en memoria, sin localStorage)
  const handleCargoImpToggleSegment = useCallback((segmentCode: string, enabled: boolean) => {
    if (!formData?.awbNumber) return;
    
    const awbPrefix = formData.awbNumber.split('-')[0] || '000';
    
    // Segmentos FHL conocidos
    const fhlSegmentCodes = Object.keys(FHL_SEGMENTS);
    const isFhlSegment = fhlSegmentCodes.includes(segmentCode);
    
    if (isFhlSegment) {
      toggleFhlSegment(awbPrefix, segmentCode as FhlSegmentType, enabled);
    } else {
      toggleFwbSegment(awbPrefix, segmentCode as FwbSegmentType, enabled);
    }
    
    // Forzar re-render incrementando un contador
    setConfigVersion(v => v + 1);
    
    console.log(`[CARGO-IMP] Toggle segmento ${isFhlSegment ? 'FHL' : 'FWB'} ${segmentCode} -> ${enabled ? 'HABILITADO' : 'DESHABILITADO'} para ${awbPrefix}`);
  }, [formData]);

  // Validación de datos requeridos
  const validateData = (): string[] => {
    const errors: string[] = [];
    if (!formData) return errors;

    // AWB
    if (!formData.awbNumber || formData.awbNumber.length < 11) errors.push('AWB Number inválido (mínimo 11 caracteres)');
    if (!formData.origin || formData.origin.length !== 3) errors.push('Origen debe ser código IATA de 3 letras');
    if (!formData.destination || formData.destination.length !== 3) errors.push('Destino debe ser código IATA de 3 letras');
    
    // Shipper
    if (!formData.shipper.name) errors.push('Nombre del Shipper es obligatorio');
    if (!formData.shipper.address.street) errors.push('Dirección del Shipper es obligatoria');
    if (!formData.shipper.address.place) errors.push('Ciudad del Shipper es obligatoria');
    if (!formData.shipper.address.countryCode) errors.push('País del Shipper es obligatorio');
    
    // Consignee
    if (!formData.consignee.name) errors.push('Nombre del Consignee es obligatorio');
    if (!formData.consignee.address.street) errors.push('Dirección del Consignee es obligatoria');
    if (!formData.consignee.address.place) errors.push('Ciudad del Consignee es obligatoria');
    if (!formData.consignee.address.countryCode) errors.push('País del Consignee es obligatorio');
    
    // Agent
    if (!formData.agent.name) errors.push('Nombre del Agente es obligatorio');
    if (!formData.agent.iataCode) errors.push('Código IATA del Agente es obligatorio');
    
    // Cargo
    if (formData.pieces <= 0) errors.push('Cantidad de piezas debe ser mayor a 0');
    if (formData.weight <= 0) errors.push('Peso debe ser mayor a 0');

    return errors;
  };

  // Función para copiar mensajes EDI generados
  const handleCopyEdi = useCallback(() => {
    if (!cargoImpFwb?.fullMessage) return;
    
    let textToCopy = cargoImpFwb.fullMessage;
    
    // Si es consolidado y se quieren todos los mensajes
    if (formData?.hasHouses && sendMode === 'masterAndHouses' && cargoImpConcatFhl) {
      textToCopy = cargoImpFwb.fullMessage + '\n\n' + cargoImpConcatFhl;
    }
    
    copyToClipboard(textToCopy);
    
    const result: CargoImpResult = {
      allSuccess: true,
      summary: `✅ Mensaje EDI copiado al clipboard. FWB${formData?.hasHouses ? ` + ${formData.houseBills.length} FHL` : ''}.`,
      fwbMessage: cargoImpFwb.fullMessage,
      fhlMessages: cargoImpFhl?.map(f => f.fullMessage)
    };
    
    setSendResult(result);
    
    // Notificar al componente padre
    if (formData && onCopySuccess) {
      onCopySuccess(formData.id, textToCopy);
    }
  }, [cargoImpFwb, cargoImpConcatFhl, cargoImpFhl, formData, sendMode, onCopySuccess]);

  // Estado para transmisión a Descartes
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmitSuccess, setTransmitSuccess] = useState(false);

  // Verificar si hay configuración de Descartes disponible
  const hasDescartesConfig = useMemo(() => {
    return !!(formData?.descartesConfig?.endpoint && 
              formData?.descartesConfig?.username && 
              formData?.descartesConfig?.password);
  }, [formData?.descartesConfig]);

  // Función para transmitir a Descartes (soporta EDI y Cargo-XML)
  const handleTransmitToDescartes = useCallback(async () => {
    if (!formData?.descartesConfig) return;

    // Validar según formato
    if (messageFormat === 'cargoxml' && !cargoXmlBundle?.xfwb?.xmlContent) return;
    if (messageFormat === 'edi' && !cargoImpFwb?.fullMessage) return;

    setIsTransmitting(true);
    setTransmitSuccess(false);
    setSendResult(null);

    try {
      // Configurar el servicio con las credenciales del shipment
      const service = new DescartesTransmitService({
        endpoint: formData.descartesConfig.endpoint,
        username: formData.descartesConfig.username,
        password: formData.descartesConfig.password
      });

      const awbNumber = formData.awbNumber;
      let transmissionResult;
      let masterMessage: string;
      let houseMessages: string[] = [];

      if (messageFormat === 'cargoxml') {
        // === CARGO-XML ===
        masterMessage = cargoXmlBundle!.xfwb.xmlContent;
        
        // Preparar XFZBs si es consolidado y se quieren todos
        let hawbNumbers: string[] = [];
        
        if (formData.hasHouses && sendMode === 'masterAndHouses' && cargoXmlBundle!.xfzbs.length > 0) {
          houseMessages = cargoXmlBundle!.xfzbs.map(x => x.xmlContent);
          hawbNumbers = cargoXmlBundle!.xfzbs.map(x => x.hawbNumber || '');
        }

        // Transmitir bundle XML (XFWB + XFZBs)
        transmissionResult = await service.sendBundle(
          masterMessage,
          awbNumber,
          houseMessages,
          hawbNumbers
        );
      } else {
        // === EDI (CARGO-IMP) ===
        masterMessage = cargoImpFwb!.fullMessage;
        
        // Preparar FHLs si es consolidado y se quieren todos
        let hawbNumbers: string[] = [];
        
        if (formData.hasHouses && sendMode === 'masterAndHouses' && cargoImpFhl) {
          houseMessages = cargoImpFhl.map(f => f.fullMessage);
          hawbNumbers = formData.houseBills.map(h => h.hawbNumber);
        }

        // Transmitir bundle EDI (FWB + FHLs)
        transmissionResult = await service.sendBundle(
          masterMessage,
          awbNumber,
          houseMessages,
          hawbNumbers
        );
      }

      // Crear resultado
      const result: CargoImpResult = {
        allSuccess: transmissionResult.allSuccess,
        summary: transmissionResult.summary,
        fwbMessage: masterMessage,
        fhlMessages: houseMessages.length > 0 ? houseMessages : undefined,
        transmissionResult
      };

      setSendResult(result);
      setTransmitSuccess(transmissionResult.allSuccess);

      // Notificar al componente padre si fue exitoso
      if (transmissionResult.allSuccess && onCopySuccess) {
        onCopySuccess(formData.id, `TRANSMITTED (${messageFormat.toUpperCase()}): ${awbNumber}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setSendResult({
        allSuccess: false,
        summary: `❌ Error de transmisión: ${errorMessage}`,
        fwbMessage: messageFormat === 'cargoxml' ? cargoXmlBundle?.xfwb?.xmlContent : cargoImpFwb?.fullMessage
      });
    } finally {
      setIsTransmitting(false);
    }
  }, [cargoImpFwb, cargoImpFhl, cargoXmlBundle, formData, sendMode, messageFormat, onCopySuccess]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        setCopied(false);
      }
      copyTimeoutRef.current = null;
    }, 2000);
  }, []);

  const { totalWeightCharge, totalOtherCharges, grandTotal } = useMemo(() => {
    if (!formData) {
      return { totalWeightCharge: 0, totalOtherCharges: 0, grandTotal: 0 };
    }
    const weightCharge = formData.rates.reduce((acc, r) => acc + r.total, 0);
    const otherCharge = formData.otherCharges.reduce((acc, oc) => acc + oc.amount, 0);
    return {
      totalWeightCharge: weightCharge,
      totalOtherCharges: otherCharge,
      grandTotal: weightCharge + otherCharge
    };
  }, [formData]);

  if (!isOpen || !formData) return null;

  // ============================================================
  // TABS DE NAVEGACIÓN
  // ============================================================
  const tabs = [
    { id: 'parties', icon: Users, label: 'Partes' },
    { id: 'cargo', icon: Package, label: 'Carga' },
    { id: 'financials', icon: Banknote, label: 'Cargos' },
    { id: 'security', icon: ShieldCheck, label: 'Seguridad' },
    { id: 'houses', icon: Layers, label: formData.hasHouses ? `Houses (${formData.houseBills.length})` : 'Houses' },
    { id: 'summary', icon: Eye, label: 'Resumen' },
    { id: 'json', icon: Terminal, label: 'EDI' },
    { id: 'xml', icon: FileText, label: 'XML' },
  ];

  return (
    <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="modal-content bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[88vh] flex flex-col overflow-hidden">
        
        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-purple-50">
          <div className="flex items-center gap-4">
            <div className="bg-purple-600 p-2.5 rounded-lg text-white shadow-md">
              <Plane size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {isEditable ? 'Editor de Envío' : 'Visualización de Envío'}
                {isEditable && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <PenLine size={10}/> MODO EDICIÓN
                  </span>
                )}
                {!isEditable && (
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    SOLO LECTURA
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-500 font-mono">AWB: <span className="font-bold text-slate-700">{formData.awbNumber}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${
              formData.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' :
              formData.status === 'TRANSMITTED' ? 'bg-amber-100 text-amber-700' :
              formData.status === 'ACKNOWLEDGED' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {formData.status === 'ACKNOWLEDGED' && <CheckCircle2 size={12}/>}
              {formData.status === 'REJECTED' && <AlertTriangle size={12}/>}
              {formData.status === 'TRANSMITTED' && <Clock size={12}/>}
              {formData.status}
            </div>
            {/* Config Button */}
            <button 
              onClick={() => setIsConfigOpen(true)} 
              className="text-slate-500 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors"
              title="Configuración del Conector"
            >
              <Settings size={20} />
            </button>
            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TABS */}
        {/* ============================================================ */}
        <div className="px-6 border-b border-slate-200 flex gap-1 bg-white overflow-x-auto flex-nowrap min-h-[46px]">
          {tabs.map((t) => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id as Tab)} 
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                activeTab === t.id 
                  ? 'border-purple-600 text-purple-700 bg-purple-50 rounded-t-lg' 
                  : 'border-transparent text-slate-600 hover:text-purple-600 hover:bg-slate-50'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* ERRORES DE VALIDACIÓN */}
        {/* ============================================================ */}
        {validationErrors.length > 0 && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
              <AlertTriangle size={16} /> Errores de Validación
            </div>
            <ul className="text-sm text-red-600 list-disc list-inside">
              {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        {/* ============================================================ */}
        {/* CONTENT - Área scrolleable - Optimizada para máximo espacio */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50/30" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          
          {/* ========== TAB: RESUMEN ========== */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Resumen Visual */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <SummaryCard icon={<MapPin size={14}/>} label="Origen" value={formData.origin} color="blue" />
                <SummaryCard icon={<MapPin size={14}/>} label="Destino" value={formData.destination} color="green" />
                <SummaryCard icon={<Package size={14}/>} label="Piezas" value={formData.pieces} color="amber" />
                <SummaryCard icon={<Scale size={14}/>} label="Peso" value={`${formData.weight} ${formData.weightUnit === 'KILOGRAM' ? 'KG' : 'LB'}`} color="purple" />
                <SummaryCard icon={<Banknote size={14}/>} label="Total" value={`${formData.currency} ${grandTotal.toFixed(2)}`} color="green" />
                <SummaryCard icon={<Plane size={14}/>} label="Vuelos" value={formData.flights.length} subvalue={formData.flights[0]?.flightNumber || 'Sin vuelo'} color="slate" />
              </div>

              {/* Partes Involucradas - Vista Rápida */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 text-purple-600">
                    <Building size={16}/> <span className="font-bold text-sm">SHIPPER (Exportador)</span>
                  </div>
                  <p className="font-bold text-slate-800">{formData.shipper.name}</p>
                  <p className="text-sm text-slate-500">{formData.shipper.address.street}</p>
                  <p className="text-sm text-slate-500">{formData.shipper.address.place}, {formData.shipper.address.countryCode}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 text-green-600">
                    <User size={16}/> <span className="font-bold text-sm">CONSIGNEE (Importador)</span>
                  </div>
                  <p className="font-bold text-slate-800">{formData.consignee.name}</p>
                  <p className="text-sm text-slate-500">{formData.consignee.address.street}</p>
                  <p className="text-sm text-slate-500">{formData.consignee.address.place}, {formData.consignee.address.countryCode}</p>
                </div>
                <div className="bg-white border border-amber-200 rounded-lg p-4 bg-amber-50/50">
                  <div className="flex items-center gap-2 mb-3 text-amber-600">
                    <Briefcase size={16}/> <span className="font-bold text-sm">AGENT (Agente IATA)</span>
                  </div>
                  <p className="font-bold text-slate-800">{formData.agent.name}</p>
                  <p className="text-sm text-slate-500">
                    <span className="font-semibold">IATA:</span> {formData.agent.iataCode} 
                    {formData.agent.cassCode && <span className="ml-2"><span className="font-semibold">CASS:</span> {formData.agent.cassCode}</span>}
                  </p>
                  <p className="text-sm text-slate-500">{formData.agent.place}</p>
                </div>
              </div>

              {/* Firma y Ejecución */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3 text-purple-700">
                  <PenLine size={16}/> <span className="font-bold text-sm">FIRMA Y EJECUCIÓN</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-purple-500 uppercase">Firma Autorizada</span>
                    <p className="font-bold text-lg text-purple-800">{formData.signature || 'Sin firma'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-purple-500 uppercase">Fecha de Ejecución</span>
                    <p className="font-bold text-lg text-purple-800">{formData.executionDate}</p>
                  </div>
                  <div>
                    <span className="text-xs text-purple-500 uppercase">Lugar de Ejecución</span>
                    <p className="font-bold text-lg text-purple-800">{formData.executionPlace}</p>
                  </div>
                </div>
              </div>

              {/* Descripción de Mercancía */}
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="font-bold text-sm text-slate-700 mb-3">DESCRIPCIÓN DE MERCANCÍA</h3>
                <div className="grid grid-cols-3 gap-4">
                  <InputGroup label="Descripción (Backend)" value={formData.description} onChange={(v) => setFormData({...formData, description: v})} readOnly={isReadOnly} maxLength={500} className="col-span-2" />
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Tipo de Envío</label>
                    <div className={`text-sm font-medium py-2 px-3 rounded ${formData.hasHouses ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-slate-50 border border-slate-200 text-slate-700'}`}>
                      {formData.hasHouses ? (
                        <span className="flex items-center gap-2">
                          <Layers size={14} />
                          CONSOLIDADO ({formData.houseBills.length} Hijas)
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Package size={14} />
                          DIRECTO {formData.flights.length > 1 && `(${formData.flights.length} Rutas)`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Preview de goodsDescription que se enviará a Traxon */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-blue-800 flex items-center gap-1">
                      <FileText size={12} />
                      GOODS DESCRIPTION (Lo que se enviará a Traxon)
                    </p>
                    <span className="text-[10px] text-blue-600">Máx 25 chars/línea • Usa Enter para saltos</span>
                  </div>
                  
                  {/* Campo editable para override */}
                  <div className="mb-3">
                    <label className="text-[10px] text-blue-700 font-bold mb-1 block">
                      Override Manual (deja vacío para usar automático):
                    </label>
                    <textarea
                      value={formData.goodsDescriptionOverride || ''}
                      onChange={(e) => setFormData({...formData, goodsDescriptionOverride: e.target.value || undefined})}
                      placeholder="Ej: FRESH CUT FLOWERS&#10;PERISHABLE CARGO"
                      disabled={isReadOnly}
                      className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-slate-50 resize-none"
                      rows={3}
                      maxLength={200}
                    />
                    <div className="flex justify-between text-[10px] text-blue-500 mt-1">
                      <span>Usa Enter para nueva línea (cada línea máx 25 chars)</span>
                      <span>{(formData.goodsDescriptionOverride || '').length}/200</span>
                    </div>
                  </div>

                  {/* Preview del resultado final */}
                  <div className="border-t border-blue-200 pt-2">
                    <p className="text-[10px] text-blue-700 font-bold mb-1">Preview Final:</p>
                    {(() => {
                      // Calcular el goodsDescription que se enviará
                      const awbPrefix = formData.awbNumber?.split('-')[0] || '';
                      let finalDescription = '';
                      let source = '';
                      
                      // PRIORIDAD: Override manual > Automático
                      if (formData.goodsDescriptionOverride) {
                        finalDescription = formData.goodsDescriptionOverride.toUpperCase();
                        source = 'override';
                      } else if (formData.hasHouses) {
                        finalDescription = 'CONSOLIDATION AS PER\nATTACHED DOCUMENTS';
                        source = 'consolidado';
                      } else if (['145', '985'].includes(awbPrefix)) {
                        finalDescription = formData.commodityCode === '0609' || formData.commodityCode === '609' 
                          ? 'CONSOLIDATE FLOWERS' 
                          : 'CUT FLOWERS';
                        source = 'latam';
                      } else {
                        finalDescription = sanitizeGoodsDescription(formData.description, 150) || 'FRESH CUT FLOWERS';
                        source = 'auto';
                      }
                      
                      // Mostrar cada línea separada
                      const lines = finalDescription.split('\n');
                      return (
                        <div className="font-mono text-sm">
                          {lines.map((line, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className={`${line.length > 25 ? 'text-red-600 bg-red-100' : 'text-blue-900 bg-white'} px-2 py-0.5 rounded border ${line.length > 25 ? 'border-red-300' : 'border-blue-200'}`}>
                                {line || '(vacío)'}
                              </span>
                              <span className={`text-[10px] ${line.length > 25 ? 'text-red-500 font-bold' : 'text-blue-500'}`}>
                                ({line.length}/25)
                                {line.length > 25 && ' ⚠️ EXCEDE'}
                              </span>
                            </div>
                          ))}
                          <p className="text-[10px] text-blue-600 mt-2">
                            Total: {finalDescription.length} chars | {lines.length} líneas | 
                            <span className={`ml-1 font-bold ${source === 'override' ? 'text-purple-600' : source === 'consolidado' ? 'text-amber-600' : source === 'latam' ? 'text-green-600' : 'text-blue-600'}`}>
                              {source === 'override' && '✏️ Override manual'}
                              {source === 'consolidado' && '📦 Consolidado (fijo)'}
                              {source === 'latam' && '✈️ LATAM (específico)'}
                              {source === 'auto' && '🔄 Saneado automático'}
                            </span>
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                {formData.hasHouses && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium mb-2">
                      <Layers size={12} className="inline mr-1" />
                      Este envío consolidado transmitirá: 1 Master AWB (FWB) + 1 Lista de Consolidación (CSL) + {formData.houseBills.length} House Waybills (FHL)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.houseBills.map((h, i) => (
                        <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-amber-200 text-amber-800 font-mono">
                          {h.hawbNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botón de Acción Rápida */}
              {isEditable && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-emerald-800">
                        {messageFormat === 'cargoxml' ? '📄 Cargo-XML (XFWB/XFZB)' : '📟 CARGO-IMP (EDI)'}
                      </p>
                      <p className="text-sm text-emerald-600">
                        {messageFormat === 'cargoxml' 
                          ? 'Formato: IATA Cargo-XML 3.0' 
                          : 'Formato: FWB/16, FWB/17, FHL/4'}
                      </p>
                      {formData.hasHouses && (
                        <p className="text-xs text-purple-500 mt-1">Consolidado: Master + {formData.houseBills.length} House(s)</p>
                      )}
                      {!formData.hasHouses && formData.flights.length > 1 && (
                        <p className="text-xs text-purple-500 mt-1">Directo con {formData.flights.length} rutas</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Selector de FORMATO (Cargo-XML o EDI) */}
                      <div className="flex flex-col items-end">
                        <label className="text-[10px] text-blue-600 uppercase font-bold mb-1">Formato</label>
                        <select 
                          value={messageFormat} 
                          onChange={(e) => {
                            const newFormat = e.target.value as 'cargoxml' | 'edi';
                            setMessageFormat(newFormat);
                            // Cambiar automáticamente al tab correspondiente
                            setActiveTab(newFormat === 'cargoxml' ? 'xml' : 'json');
                          }}
                          className="text-sm border border-blue-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                        >
                          <option value="cargoxml">Cargo-XML</option>
                          <option value="edi">EDI (CARGO-IMP)</option>
                        </select>
                      </div>

                      {/* Selector de CONTENIDO para consolidados */}
                      {formData.hasHouses && (
                        <div className="flex flex-col items-end">
                          <label className="text-[10px] text-purple-600 uppercase font-bold mb-1">Contenido</label>
                          <select 
                            value={sendMode} 
                            onChange={(e) => setSendMode(e.target.value as 'masterOnly' | 'masterAndHouses')}
                            className="text-sm border border-purple-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                          >
                            <option value="masterAndHouses">
                              {messageFormat === 'cargoxml' 
                                ? `XFWB + ${formData.houseBills.length} XFZB` 
                                : `FWB + ${formData.houseBills.length} FHL`}
                            </option>
                            <option value="masterOnly">
                              {messageFormat === 'cargoxml' ? 'Solo XFWB (Master)' : 'Solo FWB (Master)'}
                            </option>
                          </select>
                        </div>
                      )}

                      {/* Botón para transmitir a Descartes (solo si hay configuración) */}
                      {hasDescartesConfig && (
                        <button 
                          onClick={handleTransmitToDescartes}
                          disabled={messageFormat === 'cargoxml' 
                            ? !cargoXmlBundle?.xfwb?.xmlContent 
                            : !cargoImpFwb?.fullMessage || isTransmitting}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg hover:shadow-xl"
                        >
                          {isTransmitting ? (
                            <>
                              <Loader2 size={18} className="animate-spin" /> Transmitiendo...
                            </>
                          ) : transmitSuccess ? (
                            <>
                              <CheckCircle2 size={18} /> ¡Transmitido!
                            </>
                          ) : (
                            <>
                              <Upload size={18} /> Transmitir a Descartes
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resultado del envío */}
                  {sendResult && (
                    <div className={`mt-4 p-4 rounded-lg border-2 shadow-lg ${
                      sendResult.allSuccess 
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-400 animate-pulse' 
                        : 'bg-gradient-to-r from-red-100 to-orange-100 border-red-400 animate-pulse'
                    }`}
                    style={{ animationDuration: '2s' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {sendResult.allSuccess ? (
                          <CheckCircle2 size={24} className="text-green-600 animate-bounce" />
                        ) : (
                          <AlertTriangle size={24} className="text-red-600 animate-bounce" />
                        )}
                        <span className={`font-bold text-lg ${sendResult.allSuccess ? 'text-green-700' : 'text-red-700'}`}>
                          {sendResult.transmissionResult 
                            ? (sendResult.allSuccess ? '✅ TRANSMITIDO' : '❌ ERROR TRANSMISIÓN')
                            : (sendResult.allSuccess ? '✅ EDI COPIADO' : '❌ ERROR')
                          }
                        </span>
                      </div>
                      {/* Resumen grande y llamativo */}
                      <div className={`text-base font-bold py-2 px-3 rounded-lg mb-3 ${
                        sendResult.allSuccess 
                          ? 'bg-green-200/70 text-green-800 border border-green-300' 
                          : 'bg-red-200/70 text-red-800 border border-red-300'
                      }`}>
                        📊 {sendResult.summary}
                      </div>
                      
                      {/* Detalles de transmisión a Descartes */}
                      {sendResult.transmissionResult && (
                        <div className="mt-2 text-xs bg-white/70 p-3 rounded border border-slate-200 space-y-2">
                          {/* FWB Result */}
                          <div className="p-2 rounded bg-slate-50 border border-slate-200">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-lg ${sendResult.transmissionResult.fwbResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {sendResult.transmissionResult.fwbResult.success ? '✓' : '✗'}
                              </span>
                              <strong className="text-sm">FWB ({sendResult.transmissionResult.fwbResult.reference})</strong>
                            </div>
                            {sendResult.transmissionResult.fwbResult.descartesResponse && (
                              <div className="ml-6 text-xs space-y-0.5">
                                {sendResult.transmissionResult.fwbResult.descartesResponse.tid && (
                                  <p><span className="text-slate-500">TID:</span> <span className="font-mono text-blue-700">{sendResult.transmissionResult.fwbResult.descartesResponse.tid}</span></p>
                                )}
                                {sendResult.transmissionResult.fwbResult.descartesResponse.status && (
                                  <p><span className="text-slate-500">Status:</span> <span className="text-green-700 font-medium">{sendResult.transmissionResult.fwbResult.descartesResponse.status}</span></p>
                                )}
                                {sendResult.transmissionResult.fwbResult.descartesResponse.bytesReceived && (
                                  <p><span className="text-slate-500">Bytes:</span> {sendResult.transmissionResult.fwbResult.descartesResponse.bytesReceived}</p>
                                )}
                                {sendResult.transmissionResult.fwbResult.descartesResponse.error && (
                                  <p className="text-red-600"><span className="text-slate-500">Error:</span> {sendResult.transmissionResult.fwbResult.descartesResponse.error}</p>
                                )}
                                {sendResult.transmissionResult.fwbResult.descartesResponse.errorDetail && (
                                  <p className="text-red-600"><span className="text-slate-500">Detalle:</span> {sendResult.transmissionResult.fwbResult.descartesResponse.errorDetail}</p>
                                )}
                              </div>
                            )}
                            {sendResult.transmissionResult.fwbResult.error && !sendResult.transmissionResult.fwbResult.descartesResponse && (
                              <p className="ml-6 text-red-600">{sendResult.transmissionResult.fwbResult.error}</p>
                            )}
                          </div>
                          
                          {/* FHL Results */}
                          {sendResult.transmissionResult.fhlResults.map((fhl, idx) => (
                            <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-200">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-lg ${fhl.success ? 'text-green-600' : 'text-red-600'}`}>
                                  {fhl.success ? '✓' : '✗'}
                                </span>
                                <strong className="text-sm">FHL ({fhl.reference})</strong>
                              </div>
                              {fhl.descartesResponse && (
                                <div className="ml-6 text-xs space-y-0.5">
                                  {fhl.descartesResponse.tid && (
                                    <p><span className="text-slate-500">TID:</span> <span className="font-mono text-blue-700">{fhl.descartesResponse.tid}</span></p>
                                  )}
                                  {fhl.descartesResponse.status && (
                                    <p><span className="text-slate-500">Status:</span> <span className="text-green-700 font-medium">{fhl.descartesResponse.status}</span></p>
                                  )}
                                  {fhl.descartesResponse.error && (
                                    <p className="text-red-600"><span className="text-slate-500">Error:</span> {fhl.descartesResponse.error}</p>
                                  )}
                                  {fhl.descartesResponse.errorDetail && (
                                    <p className="text-red-600"><span className="text-slate-500">Detalle:</span> {fhl.descartesResponse.errorDetail}</p>
                                  )}
                                </div>
                              )}
                              {fhl.error && !fhl.descartesResponse && (
                                <p className="ml-6 text-red-600">{fhl.error}</p>
                              )}
                            </div>
                          ))}
                          
                          {/* Resumen total */}
                          <div className="pt-2 border-t border-slate-300 flex items-center justify-between">
                            <span className="text-slate-600">
                              📈 Total: <strong>{sendResult.transmissionResult.totalSuccess}/{sendResult.transmissionResult.totalSent}</strong> exitosos
                            </span>
                            {sendResult.transmissionResult.totalFailed > 0 && (
                              <span className="text-red-600 font-medium">
                                ⚠️ {sendResult.transmissionResult.totalFailed} fallidos
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Información de copia (sin transmisión) */}
                      {!sendResult.transmissionResult && sendResult.fwbMessage && (
                        <div className="mt-2 text-xs font-mono bg-white/70 p-2 rounded border border-slate-200">
                          <p><strong>FWB:</strong> Mensaje generado correctamente</p>
                        </div>
                      )}
                      {!sendResult.transmissionResult && sendResult.fhlMessages && sendResult.fhlMessages.length > 0 && (
                        <div className="mt-1 text-xs font-mono bg-white/70 p-2 rounded border border-slate-200">
                          <p className="font-bold mb-1"><strong>FHL:</strong> {sendResult.fhlMessages.length} mensaje(s) FHL generado(s)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========== TAB: PARTES ========== */}
          {activeTab === 'parties' && (
            <div className="space-y-4">
              {/* Shipper y Consignee lado a lado */}
              <div className="grid grid-cols-2 gap-4">
                <PartySection 
                  title="SHIPPER (Exportador)" 
                  icon={<Building size={16}/>}
                  party={formData.shipper}
                  onUpdate={(p) => setFormData({...formData, shipper: p})}
                  readOnly={isReadOnly}
                />
                <PartySection 
                  title="CONSIGNEE (Importador)" 
                  icon={<User size={16}/>}
                  party={formData.consignee}
                  onUpdate={(p) => setFormData({...formData, consignee: p})}
                  readOnly={isReadOnly}
                />
              </div>

              <AgentSection 
                agent={formData.agent}
                onUpdate={(a) => setFormData({...formData, agent: a})}
                readOnly={isReadOnly}
              />
              
              {/* Firma */}
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <PenLine size={14}/> FIRMA Y EJECUCIÓN DEL TRANSPORTISTA
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <InputGroup label="Firma Autorizada" value={formData.signature} onChange={(v) => setFormData({...formData, signature: v})} readOnly={isReadOnly} maxLength={20} required />
                  <InputGroup label="Fecha de Ejecución" value={formData.executionDate} onChange={(v) => setFormData({...formData, executionDate: v})} readOnly={isReadOnly} type="date" required />
                  <InputGroup label="Lugar de Ejecución" value={formData.executionPlace} onChange={(v) => setFormData({...formData, executionPlace: v})} readOnly={isReadOnly} maxLength={17} required />
                </div>
              </div>
            </div>
          )}

          {/* ========== TAB: CARGO ========== */}
          {activeTab === 'cargo' && (
            <div className="space-y-4">
              {/* Datos Principales AWB */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h3 className="font-bold text-sm text-slate-700 mb-2">DATOS PRINCIPALES AWB</h3>
                <div className="grid grid-cols-5 gap-3">
                  <InputGroup label="AWB Number *" value={formData.awbNumber} onChange={(v) => setFormData({...formData, awbNumber: v})} readOnly={isReadOnly} maxLength={12} required />
                  <InputGroup label="Origen (IATA) *" value={formData.origin} onChange={(v) => setFormData({...formData, origin: v})} readOnly={isReadOnly} maxLength={3} required />
                  <InputGroup label="Destino (IATA) *" value={formData.destination} onChange={(v) => setFormData({...formData, destination: v})} readOnly={isReadOnly} maxLength={3} required />
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Pago *</label>
                    <select 
                      value={formData.paymentMethod} 
                      onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as 'Prepaid' | 'Collect'})}
                      disabled={isReadOnly}
                      className="text-sm border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none bg-white disabled:bg-slate-50 h-[34px]"
                    >
                      <option value="Prepaid">Prepaid</option>
                      <option value="Collect">Collect</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Servicio</label>
                    <select 
                      value={formData.serviceCode || ''} 
                      onChange={(e) => setFormData({...formData, serviceCode: e.target.value})}
                      disabled={isReadOnly}
                      className="text-sm border border-slate-200 rounded px-2 py-1.5 outline-none bg-white disabled:bg-slate-50 h-[34px]"
                    >
                      <option value="">--</option>
                      <option value="AIRPORT_TO_AIRPORT">A-A</option>
                      <option value="DOOR_TO_DOOR_SERVICE">D-D</option>
                      <option value="AIRPORT_TO_DOOR">A-D</option>
                      <option value="DOOR_TO_AIRPORT">D-A</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Peso y Volumen */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h3 className="font-bold text-sm text-slate-700 mb-2">PESO Y VOLUMEN</h3>
                <div className="grid grid-cols-6 gap-3">
                  <InputGroup label="Piezas *" value={formData.pieces} onChange={(v) => setFormData({...formData, pieces: parseInt(v) || 0})} readOnly={isReadOnly} type="number" required />
                  <InputGroup label="Peso Total *" value={formData.weight} onChange={(v) => setFormData({...formData, weight: parseFloat(v) || 0})} readOnly={isReadOnly} type="number" required />
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Unidad</label>
                    <select 
                      value={formData.weightUnit} 
                      onChange={(e) => setFormData({...formData, weightUnit: e.target.value as any})}
                      disabled={isReadOnly}
                      className="text-sm border border-slate-200 rounded px-2 py-1.5 outline-none bg-white disabled:bg-slate-50 h-[34px]"
                    >
                      <option value="KILOGRAM">KG</option>
                      <option value="POUND">LB</option>
                    </select>
                  </div>
                  <InputGroup label="Volumen" value={formData.volume} onChange={(v) => setFormData({...formData, volume: parseFloat(v) || 0})} readOnly={isReadOnly} type="number" />
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Vol Unit</label>
                    <select 
                      value={formData.volumeUnit || 'CUBIC_METRE'} 
                      onChange={(e) => setFormData({...formData, volumeUnit: e.target.value as any})}
                      disabled={isReadOnly}
                      className="text-sm border border-slate-200 rounded px-2 py-1.5 outline-none bg-white disabled:bg-slate-50 h-[34px]"
                    >
                      <option value="CUBIC_METRE">m³</option>
                      <option value="CUBIC_CENTIMETRE">cm³</option>
                      <option value="CUBIC_FOOT">ft³</option>
                    </select>
                  </div>
                  <InputGroup label="SLAC" value={formData.slac || ''} onChange={(v) => setFormData({...formData, slac: parseInt(v) || 0})} readOnly={isReadOnly} type="number" />
                </div>
              </div>

              {/* Vuelos */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h3 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-2">
                  <Plane size={14}/> VUELOS / ROUTING
                </h3>
                {formData.flights.length === 0 ? (
                  <p className="text-slate-500 italic text-sm">Sin vuelos asignados</p>
                ) : (
                  <div className="space-y-2">
                    {formData.flights.map((f, i) => (
                      <div key={i} className="grid grid-cols-4 gap-3 bg-slate-50 p-2 rounded-lg">
                        <InputGroup label="Vuelo" value={f.flightNumber} onChange={(v) => {
                          const newFlights = [...formData.flights];
                          newFlights[i] = {...f, flightNumber: v};
                          setFormData({...formData, flights: newFlights});
                        }} readOnly={isReadOnly} />
                        <InputGroup label="Fecha" value={f.date} onChange={(v) => {
                          const newFlights = [...formData.flights];
                          newFlights[i] = {...f, date: v};
                          setFormData({...formData, flights: newFlights});
                        }} readOnly={isReadOnly} type="date" />
                        <InputGroup label="Origen" value={f.origin} readOnly />
                        <InputGroup label="Destino" value={f.destination} readOnly />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Descripción y SPH */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h3 className="font-bold text-sm text-slate-700 mb-2">DESCRIPCIÓN DE MERCANCÍA</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InputGroup label="Descripción *" value={formData.description} onChange={(v) => setFormData({...formData, description: v})} readOnly={isReadOnly} maxLength={500} required />
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">SPH Codes</label>
                    <div className="text-sm bg-slate-50 px-2 py-1.5 rounded border border-slate-200 min-h-[32px] flex flex-wrap gap-1">
                      {formData.specialHandlingCodes && formData.specialHandlingCodes.length > 0 
                        ? formData.specialHandlingCodes.map(code => (
                            <span key={code} className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs">{code}</span>
                          ))
                        : <span className="text-slate-400 text-xs">Ninguno</span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== TAB: FINANCIALS ========== */}
          {activeTab === 'financials' && (
            <div className="space-y-4">
              {/* Charge Declarations */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <h3 className="font-bold text-sm text-slate-700 mb-2">CHARGE DECLARATIONS</h3>
                <div className="grid grid-cols-4 gap-3">
                  <InputGroup label="Moneda (ISO) *" value={formData.currency} onChange={(v) => setFormData({...formData, currency: v})} readOnly={isReadOnly} maxLength={3} required />
                  <div className="flex flex-col">
                    <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Pago Weight *</label>
                    <select 
                      value={formData.paymentMethod} 
                      onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as 'Prepaid' | 'Collect'})}
                      disabled={isReadOnly}
                      className="text-sm border border-slate-300 rounded px-2 py-1.5 outline-none bg-white disabled:bg-slate-50 h-[34px]"
                    >
                      <option value="Prepaid">Prepaid</option>
                      <option value="Collect">Collect</option>
                    </select>
                  </div>
                  <InputGroup label="Valor Declarado Carga" value={formData.declaredValueCarriage || ''} onChange={(v) => setFormData({...formData, declaredValueCarriage: v})} readOnly={isReadOnly} />
                  <InputGroup label="Valor Declarado Aduana" value={formData.declaredValueCustoms || ''} onChange={(v) => setFormData({...formData, declaredValueCustoms: v})} readOnly={isReadOnly} />
                </div>
              </div>

              {/* Rates Editables */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-slate-700">RATE CHARGES</h3>
                  {!isReadOnly && (
                    <button
                      onClick={() => setFormData({...formData, rates: [...formData.rates, {pieces: 0, weight: 0, rateClassCode: 'QUANTITY_RATE', rateOrCharge: 0, total: 0, description: ''}]})}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                    >
                      + Añadir Rate
                    </button>
                  )}
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-1.5 w-16">Pzas</th>
                      <th className="text-left p-1.5 w-20">Peso</th>
                      <th className="text-left p-1.5 w-24">P.Cobr</th>
                      <th className="text-left p-1.5 w-28">Clase</th>
                      <th className="text-left p-1.5 w-20">Tarifa</th>
                      <th className="text-left p-1.5 w-32">Desc. Merc.</th>
                      <th className="text-right p-1.5 w-24">Total</th>
                      {!isReadOnly && <th className="w-8"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {formData.rates.map((r, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-1">
                          <input type="number" value={r.pieces} onChange={(e) => {
                            const newRates = [...formData.rates];
                            newRates[i] = {...r, pieces: parseInt(e.target.value) || 0};
                            setFormData({...formData, rates: newRates});
                          }} disabled={isReadOnly} className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs disabled:bg-slate-50" />
                        </td>
                        <td className="p-1">
                          <input type="number" value={r.weight} onChange={(e) => {
                            const newRates = [...formData.rates];
                            const weight = parseFloat(e.target.value) || 0;
                            newRates[i] = {...r, weight, total: weight * (r.rateOrCharge || 0)};
                            setFormData({...formData, rates: newRates});
                          }} disabled={isReadOnly} className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs disabled:bg-slate-50" />
                        </td>
                        <td className="p-1">
                          <input type="number" value={r.chargeableWeight || r.weight} onChange={(e) => {
                            const newRates = [...formData.rates];
                            newRates[i] = {...r, chargeableWeight: parseFloat(e.target.value) || 0};
                            setFormData({...formData, rates: newRates});
                          }} disabled={isReadOnly} className="w-full px-1 py-0.5 border border-purple-200 rounded text-xs font-semibold text-purple-700 disabled:bg-slate-50" />
                        </td>
                        <td className="p-1">
                          <select value={r.rateClassCode} onChange={(e) => {
                            const newRates = [...formData.rates];
                            newRates[i] = {...r, rateClassCode: e.target.value};
                            setFormData({...formData, rates: newRates});
                          }} disabled={isReadOnly} className="w-full px-1 py-0.5 border rounded text-xs disabled:bg-slate-50">
                            <option value="QUANTITY_RATE">Q-Cantidad</option>
                            <option value="MINIMUM_CHARGE">M-Mínimo</option>
                            <option value="NORMAL_RATE">N-Normal</option>
                            <option value="SPECIFIC_COMMODITY_RATE">C-SCR</option>
                            <option value="BASIC_CHARGE">B-Básico</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <input type="number" step="0.01" value={r.rateOrCharge} onChange={(e) => {
                            const newRates = [...formData.rates];
                            const rate = parseFloat(e.target.value) || 0;
                            const cw = r.chargeableWeight || r.weight;
                            newRates[i] = {...r, rateOrCharge: rate, total: cw * rate};
                            setFormData({...formData, rates: newRates});
                          }} disabled={isReadOnly} className="w-full px-1 py-0.5 border rounded text-xs disabled:bg-slate-50" />
                        </td>
                        <td className="p-1">
                          <input 
                            type="text" 
                            value={r.goodsDescriptionOverride || ''} 
                            placeholder="Auto"
                            onChange={(e) => {
                              const newRates = [...formData.rates];
                              newRates[i] = {...r, goodsDescriptionOverride: e.target.value || undefined};
                              setFormData({...formData, rates: newRates});
                            }} 
                            disabled={isReadOnly} 
                            className="w-full px-1 py-0.5 border border-amber-200 rounded text-xs disabled:bg-slate-50 placeholder:text-slate-400"
                            title="Descripción de mercancía (ej: CONSOLIDATE FLOWERS). Deja vacío para usar valor automático."
                          />
                        </td>
                        <td className="p-1 text-right font-bold">{formData.currency} {r.total.toFixed(2)}</td>
                        {!isReadOnly && (
                          <td className="p-1">
                            <button onClick={() => {
                              const newRates = formData.rates.filter((_, idx) => idx !== i);
                              setFormData({...formData, rates: newRates});
                            }} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-purple-50">
                    <tr>
                      <td colSpan={6} className="p-1.5 text-right font-bold text-xs">Total Weight:</td>
                      <td className="p-1.5 text-right font-bold text-purple-700">{formData.currency} {totalWeightCharge.toFixed(2)}</td>
                      {!isReadOnly && <td></td>}
                    </tr>
                  </tfoot>
                </table>
                
                {/* Preview de goodsDescription por cada rate */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-blue-800 flex items-center gap-1">
                      <FileText size={12} />
                      GOODS DESCRIPTION - Preview por Rate (máx 25 chars/línea)
                    </p>
                  </div>
                  <div className="space-y-2">
                    {formData.rates.map((r, idx) => {
                      const awbPrefix = formData.awbNumber?.split('-')[0] || '';
                      let finalDesc = '';
                      let source = '';
                      
                      // PRIORIDAD: Override rate > Override master > Automático
                      if (r.goodsDescriptionOverride) {
                        finalDesc = r.goodsDescriptionOverride.toUpperCase();
                        source = 'override-rate';
                      } else if (formData.goodsDescriptionOverride) {
                        finalDesc = formData.goodsDescriptionOverride.toUpperCase();
                        source = 'override-master';
                      } else if (formData.hasHouses) {
                        finalDesc = 'CONSOLIDATION AS PER\nATTACHED DOCUMENTS';
                        source = 'consolidado';
                      } else if (['145', '985'].includes(awbPrefix)) {
                        finalDesc = formData.commodityCode === '0609' || formData.commodityCode === '609' 
                          ? 'CONSOLIDATE FLOWERS' : 'CUT FLOWERS';
                        source = 'latam';
                      } else {
                        finalDesc = sanitizeGoodsDescription(r.description || formData.description, 150) || 'FRESH CUT FLOWERS';
                        source = 'auto';
                      }
                      
                      const lines = finalDesc.split('\n');
                      const hasOverflow = lines.some(l => l.length > 25);
                      
                      return (
                        <div key={idx} className={`p-2 rounded border ${hasOverflow ? 'bg-red-50 border-red-200' : 'bg-white border-blue-100'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-600">Rate #{idx + 1}</span>
                            <span className={`text-[10px] px-1 rounded ${
                              source === 'override-rate' ? 'bg-purple-100 text-purple-700' :
                              source === 'override-master' ? 'bg-indigo-100 text-indigo-700' :
                              source === 'consolidado' ? 'bg-amber-100 text-amber-700' :
                              source === 'latam' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {source === 'override-rate' && '✏️ Override Rate'}
                              {source === 'override-master' && '✏️ Override Master'}
                              {source === 'consolidado' && '📦 Consolidado'}
                              {source === 'latam' && '✈️ LATAM'}
                              {source === 'auto' && '🔄 Auto'}
                            </span>
                          </div>
                          <div className="font-mono text-xs space-y-0.5">
                            {lines.map((line, lidx) => (
                              <div key={lidx} className="flex items-center gap-1">
                                <span className={`px-1 rounded ${line.length > 25 ? 'bg-red-200 text-red-800' : 'bg-slate-100'}`}>
                                  {line || '(vacío)'}
                                </span>
                                <span className={`text-[9px] ${line.length > 25 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                                  {line.length}/25 {line.length > 25 && '⚠️'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-blue-600 mt-2">
                    💡 Para editar: escribe en "Desc. Merc." de cada rate, o usa el Override Master arriba en "Descripción de Mercancía"
                  </p>
                </div>
              </div>

              {/* Other Charges Editables */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-slate-700">OTHER CHARGES</h3>
                  {!isReadOnly && (
                    <button
                      onClick={() => setFormData({...formData, otherCharges: [...formData.otherCharges, {code: 'AW', entitlement: 'DueCarrier', paymentMethod: 'Prepaid', amount: 0}]})}
                      className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200"
                    >
                      + Añadir Cargo
                    </button>
                  )}
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-1.5 w-24">Código</th>
                      <th className="text-left p-1.5 w-24">Entitlement</th>
                      <th className="text-left p-1.5 w-24">Pago</th>
                      <th className="text-right p-1.5 w-28">Monto</th>
                      {!isReadOnly && <th className="w-8"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {formData.otherCharges.map((oc, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-1">
                          <select value={oc.code} onChange={(e) => {
                            const newOC = [...formData.otherCharges];
                            newOC[i] = {...oc, code: e.target.value};
                            setFormData({...formData, otherCharges: newOC});
                          }} disabled={isReadOnly} className="w-full px-1 py-0.5 border rounded text-xs font-mono disabled:bg-slate-50">
                            <option value="AW">AW-AWB Fee</option>
                            <option value="FC">FC-Fuel</option>
                            <option value="SC">SC-Security</option>
                            <option value="MY">MY-Customs</option>
                            <option value="TX">TX-Taxes</option>
                            <option value="RA">RA-DGR</option>
                            <option value="CC">CC-Collect Fee</option>
                            <option value="IN">IN-Insurance</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <select value={oc.entitlement} onChange={(e) => {
                            const newOC = [...formData.otherCharges];
                            newOC[i] = {...oc, entitlement: e.target.value as 'DueCarrier' | 'DueAgent'};
                            setFormData({...formData, otherCharges: newOC});
                          }} disabled={isReadOnly} className="w-full px-1 py-0.5 border rounded text-xs disabled:bg-slate-50">
                            <option value="DueCarrier">Carrier</option>
                            <option value="DueAgent">Agent</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <select value={oc.paymentMethod} onChange={(e) => {
                            const newOC = [...formData.otherCharges];
                            newOC[i] = {...oc, paymentMethod: e.target.value as 'Prepaid' | 'Collect'};
                            setFormData({...formData, otherCharges: newOC});
                          }} disabled={isReadOnly} className="w-full px-1 py-0.5 border rounded text-xs disabled:bg-slate-50">
                            <option value="Prepaid">Prepaid</option>
                            <option value="Collect">Collect</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <input type="number" step="0.01" value={oc.amount} onChange={(e) => {
                            const newOC = [...formData.otherCharges];
                            newOC[i] = {...oc, amount: parseFloat(e.target.value) || 0};
                            setFormData({...formData, otherCharges: newOC});
                          }} disabled={isReadOnly} className="w-full px-1 py-0.5 border rounded text-xs text-right disabled:bg-slate-50" />
                        </td>
                        {!isReadOnly && (
                          <td className="p-1">
                            <button onClick={() => {
                              const newOC = formData.otherCharges.filter((_, idx) => idx !== i);
                              setFormData({...formData, otherCharges: newOC});
                            }} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-amber-50">
                    <tr>
                      <td colSpan={3} className="p-1.5 text-right font-bold text-xs">Total Other:</td>
                      <td className="p-1.5 text-right font-bold text-amber-700">{formData.currency} {totalOtherCharges.toFixed(2)}</td>
                      {!isReadOnly && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Grand Total */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-green-800">GRAND TOTAL</span>
                  <span className="font-bold text-green-800 text-xl">{formData.currency} {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ========== TAB: SECURITY ========== */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* ===== SPECIAL HANDLING CODES ===== */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-purple-600" />
                    <h3 className="font-bold text-purple-800">Special Handling Codes (SPH)</h3>
                  </div>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    Default: {getDefaultSphCodes(getAwbPrefix(formData.awbNumber)).join(', ')}
                  </span>
                </div>
                
                {/* Códigos actuales */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(formData.specialHandlingCodes && formData.specialHandlingCodes.length > 0 
                    ? formData.specialHandlingCodes 
                    : getDefaultSphCodes(getAwbPrefix(formData.awbNumber))
                  ).map((code, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {code}
                      {AVAILABLE_SPH_CODES[code as keyof typeof AVAILABLE_SPH_CODES]?.description && (
                        <span className="text-purple-200 text-xs">
                          ({AVAILABLE_SPH_CODES[code as keyof typeof AVAILABLE_SPH_CODES]?.description})
                        </span>
                      )}
                      {!isReadOnly && (
                        <button 
                          onClick={() => {
                            const currentCodes = formData.specialHandlingCodes || [];
                            setFormData({...formData, specialHandlingCodes: currentCodes.filter(c => c !== code)});
                          }}
                          className="ml-1 hover:bg-purple-700 rounded-full p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {/* Selector para agregar más códigos */}
                {!isReadOnly && (
                  <div className="border-t border-purple-200 pt-3">
                    <p className="text-xs text-purple-600 mb-2 font-medium">Agregar código adicional:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(AVAILABLE_SPH_CODES).map(([key, info]) => {
                        const currentCodes = formData.specialHandlingCodes || getDefaultSphCodes(getAwbPrefix(formData.awbNumber));
                        const isSelected = currentCodes.includes(key);
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (isSelected) {
                                setFormData({...formData, specialHandlingCodes: currentCodes.filter(c => c !== key)});
                              } else {
                                setFormData({...formData, specialHandlingCodes: [...currentCodes, key]});
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                              isSelected 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-100'
                            }`}
                            title={info.description}
                          >
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-purple-500 mt-3 italic">
                  💡 Si no envías SPH desde tu backend, se usarán los valores por defecto según la aerolínea.
                </p>
              </div>

              {/* ===== SPECIAL SERVICE REQUEST (SSR) ===== */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-amber-600" />
                  <h3 className="font-bold text-amber-800">Special Service Request (SSR)</h3>
                  <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded ml-auto">Opcional</span>
                </div>
                <textarea
                  value={formData.specialServiceRequest || ''}
                  onChange={(e) => setFormData({...formData, specialServiceRequest: e.target.value || undefined})}
                  disabled={isReadOnly}
                  placeholder="Ej: MUST BE KEPT ABOVE 5 DEGREES CELSIUS. / EN CLOSE POUCH WITH EXPORT DOCUMENTS"
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm resize-none h-20 focus:ring-2 focus:ring-amber-300 outline-none disabled:bg-slate-50"
                />
                <p className="text-xs text-amber-600 mt-2 italic">
                  💡 Instrucciones especiales de servicio que se envían a la aerolínea. Deja vacío si no se requiere.
                </p>
              </div>

              {/* ===== OCI / SECURITY INFO ===== */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={18} className="text-amber-600" />
                  <h3 className="font-bold text-amber-800">OCI / Información de Seguridad y Aduanas</h3>
                </div>

                {/* Vista previa del OCI que se enviará automáticamente */}
                <div className="bg-white/70 rounded-lg p-3 border border-amber-200">
                  <p className="text-amber-700 text-sm mb-2 font-bold flex items-center gap-1">
                    <Eye size={14} /> Vista previa del OCI que se enviará:
                  </p>
                  <div className="space-y-1 text-xs font-mono">
                    {/* OCI del Importer (Consignee) - si tiene taxId */}
                    {(connectorConfig.includeConsigneeTIN ?? true) && formData.consignee?.taxId && (
                      <div className="bg-green-100 text-green-800 p-2 rounded flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-600" />
                        <span>
                          <strong>{formData.consignee?.address?.countryCode || 'US'}/AGT/T/</strong>
                          {formData.consignee.taxId}
                        </span>
                        <span className="text-green-600 text-[10px] ml-auto">← NIT Importer</span>
                      </div>
                    )}
                    {(connectorConfig.includeConsigneeTIN ?? true) && !formData.consignee?.taxId && (
                      <div className="bg-slate-100 text-slate-500 p-2 rounded flex items-center gap-2 italic">
                        <AlertTriangle size={12} className="text-slate-400" />
                        <span>Importer sin taxId - No se enviará OCI de TIN</span>
                      </div>
                    )}
                    
                    {/* OCI del Shipper - si está habilitado y tiene taxId */}
                    {connectorConfig.includeShipperTIN && formData.shipper?.taxId && (
                      <div className="bg-purple-100 text-purple-800 p-2 rounded flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-purple-600" />
                        <span>
                          <strong>{formData.shipper?.address?.countryCode || 'CO'}/AGT/T/</strong>
                          {formData.shipper.taxId}
                        </span>
                        <span className="text-purple-600 text-[10px] ml-auto">← NIT Shipper</span>
                      </div>
                    )}
                    
                    {/* Security OCI - si está habilitado */}
                    {connectorConfig.securityOci?.enabled && (
                      <>
                        {connectorConfig.securityOci.regulatedAgentNumber && (
                          <div className="bg-amber-100 text-amber-800 p-2 rounded flex items-center gap-2">
                            <span><strong>CO/AGT/RA/</strong>{connectorConfig.securityOci.regulatedAgentNumber}</span>
                            <span className="text-amber-600 text-[10px] ml-auto">← Agente Regulado</span>
                          </div>
                        )}
                        {connectorConfig.securityOci.expiryDate && (
                          <div className="bg-orange-100 text-orange-800 p-2 rounded">
                            <strong>ED/</strong>{connectorConfig.securityOci.expiryDate}
                          </div>
                        )}
                        {connectorConfig.securityOci.screeningMethod && (
                          <div className="bg-blue-100 text-blue-800 p-2 rounded">
                            <strong>SM/</strong>{connectorConfig.securityOci.screeningMethod}
                          </div>
                        )}
                        {connectorConfig.securityOci.screeningDate && (
                          <div className="bg-cyan-100 text-cyan-800 p-2 rounded">
                            <strong>SD/</strong>{connectorConfig.securityOci.screeningDate}
                          </div>
                        )}
                        {connectorConfig.securityOci.screenerName && (
                          <div className="bg-pink-100 text-pink-800 p-2 rounded">
                            <strong>SN/</strong>{connectorConfig.securityOci.screenerName}
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Si no hay nada configurado */}
                    {!(connectorConfig.includeConsigneeTIN ?? true) && !connectorConfig.includeShipperTIN && !connectorConfig.securityOci?.enabled && (
                      <div className="bg-slate-100 text-slate-500 p-2 rounded italic">
                        No hay OCI configurados. Activa opciones en el panel de Configuración.
                      </div>
                    )}
                  </div>
                  <p className="text-amber-500 text-[10px] mt-2 italic">
                    💡 Para modificar estos valores, ve al panel de <strong>Configuración</strong> (⚙️)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========== TAB: HOUSES (OPTIMIZADO) ========== */}
          {activeTab === 'houses' && (
            <div className="space-y-2">
              {/* Header con controles */}
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-slate-50/95 backdrop-blur-sm py-2 -mt-2 -mx-2 px-2 z-10 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-700 text-sm">House Waybills</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${formData.hasHouses ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {formData.hasHouses ? `${formData.houseBills.length} houses` : 'Directo'}
                  </span>
                </div>
                {formData.hasHouses && formData.houseBills.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setExpandedHouses(new Set(formData.houseBills.map((_, i) => i)))}
                      className="text-[10px] text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50"
                    >
                      Expandir todo
                    </button>
                    <button 
                      onClick={() => setExpandedHouses(new Set())}
                      className="text-[10px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
                    >
                      Colapsar todo
                    </button>
                  </div>
                )}
              </div>
              
              {!formData.hasHouses ? (
                <div className="text-center py-8 text-slate-400">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Envío directo - No tiene house waybills</p>
                </div>
              ) : (
                /* Lista virtualizada de houses usando componentes memoizados */
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {formData.houseBills.map((house, index) => (
                    <HouseRow
                      key={house.id || index}
                      house={house}
                      index={index}
                      isExpanded={expandedHouses.has(index)}
                      onToggle={toggleHouseExpanded}
                      onUpdate={updateHouse}
                      masterOrigin={formData.origin}
                      masterDestination={formData.destination}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </div>
              )}
              
              {/* Resumen compacto al final */}
              {formData.hasHouses && formData.houseBills.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>Total: {formData.houseBills.reduce((sum, h) => sum + h.pieces, 0)} piezas, {formData.houseBills.reduce((sum, h) => sum + h.weight, 0).toFixed(2)} kg</span>
                  <span className="text-amber-600 font-medium">
                    {expandedHouses.size} de {formData.houseBills.length} expandidos
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ========== TAB: EDI (CARGO-IMP) ========== */}
          {activeTab === 'json' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                {/* Switch para selección de mensaje FWB/FHL */}
                <div className="bg-slate-100 p-1 rounded-lg inline-flex items-center shadow-inner">
                  <button 
                    onClick={() => setActiveJsonTab('fwb')} 
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                      activeJsonTab === 'fwb' 
                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5 transform scale-105'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    <Terminal size={14} />
                    FWB/{cargoImpFwb?.messageVersion?.split('/')[1] || '16'}
                  </button>
                  {formData.hasHouses && (
                    <button 
                      onClick={() => setActiveJsonTab('fhl')} 
                      className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                        activeJsonTab === 'fhl' 
                          ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5 transform scale-105'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                    >
                      <Layers size={14} />
                      FHL/4 (Houses)
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      copyToClipboard(activeJsonTab === 'fwb' ? cargoImpFwb?.fullMessage || '' : cargoImpConcatFhl || '');
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-600"/> : <Copy size={14}/>}
                    {copied ? 'Copiado!' : 'Copiar EDI'}
                  </button>
                </div>
              </div>

              {/* Mostrar errores de generación */}
              {cargoImpGenError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-2 text-red-700">
                  <AlertTriangle size={16}/> Error generando EDI: {cargoImpGenError}
                </div>
              )}


              {/* ========== CONTENIDO EDI (CARGO-IMP) ========== */}
              {/* Header informativo para EDI */}
              <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal size={16} className="text-emerald-600" />
                  <span className="font-bold text-emerald-800">Vista EDI - IATA CARGO-IMP</span>
                  <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">
                    {cargoImpFwb?.messageVersion || 'FWB/16'}
                  </span>
                </div>
                <p className="text-xs text-emerald-600">
                  Formato EDI legado IATA Cargo Interchange Message Procedures. 
                  Cada segmento se visualiza como una tarjeta editable con límites de caracteres.
                </p>
              </div>

              {/* Panel de Política aplicada */}
              {cargoImpPolicyInfo && (
                    <div className={`mb-4 p-3 rounded-lg border ${
                      cargoImpPolicyInfo.isDefault 
                        ? 'bg-amber-50 border-amber-300' 
                        : cargoImpPolicyInfo.source === 'custom'
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Plane size={14} className={cargoImpPolicyInfo.isDefault ? 'text-amber-600' : 'text-blue-600'} />
                          <span className={`font-bold text-sm ${cargoImpPolicyInfo.isDefault ? 'text-amber-800' : 'text-blue-800'}`}>
                            {cargoImpPolicyInfo.airlineName}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            cargoImpPolicyInfo.source === 'custom' 
                              ? 'bg-purple-200 text-purple-700'
                              : cargoImpPolicyInfo.source === 'configured'
                                ? 'bg-blue-200 text-blue-700'
                                : 'bg-amber-200 text-amber-700'
                          }`}>
                            {cargoImpPolicyInfo.source === 'custom' ? '✏️ Personalizada' 
                              : cargoImpPolicyInfo.source === 'configured' ? '✓ Pre-configurada' 
                              : '⚠️ DEFAULT'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Detalles de la política */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          <strong>FWB:</strong> {cargoImpPolicyInfo.policy.fwbVersion}
                        </span>
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          <strong>FHL:</strong> {cargoImpPolicyInfo.policy.fhlVersion}
                        </span>
                        {cargoImpPolicyInfo.policy.includeUNB_UNZ && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">UNB/UNZ</span>
                        )}
                        {cargoImpPolicyInfo.policy.ociWithEori && (
                          <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">EORI</span>
                        )}
                        {cargoImpPolicyInfo.policy.sphCodes && cargoImpPolicyInfo.policy.sphCodes.length > 0 && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                            SPH: {cargoImpPolicyInfo.policy.sphCodes.join(', ')}
                          </span>
                        )}
                      </div>
                      
                      {/* Warnings para DEFAULT */}
                      {cargoImpPolicyInfo.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {cargoImpPolicyInfo.warnings.map((warning, i) => (
                            <p key={i} className="text-xs text-amber-700">{warning}</p>
                          ))}
                        </div>
                      )}
                      
                      {/* Botón para ir a configuración */}
                      {cargoImpPolicyInfo.isDefault && (
                        <button
                          onClick={() => setIsConfigOpen(true)}
                          className="mt-2 text-xs text-amber-700 underline hover:text-amber-900 flex items-center gap-1"
                        >
                          <Settings size={12} /> Configurar política para aerolínea {formData?.awbNumber?.split('-')[0]}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Error de generación */}
                  {cargoImpGenError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-2 text-red-700">
                      <AlertTriangle size={16}/> Error generando EDI: {cargoImpGenError}
                    </div>
                  )}

                  {/* Visor de segmentos CARGO-IMP */}
                  <div className="flex-1 overflow-y-auto">
                    {activeJsonTab === 'fwb' && cargoImpFwb && (
                      <CargoImpSegmentViewer 
                        message={cargoImpFwb}
                        onSegmentChange={(segmentCode, newValue) => {
                          // Por ahora solo log, en futuro permitir edición
                          console.log(`[CARGO-IMP] Editando segmento ${segmentCode}:`, newValue);
                        }}
                        onToggleSegment={handleCargoImpToggleSegment}
                      />
                    )}
                    {activeJsonTab === 'fhl' && (
                      <>
                        {cargoImpFhl && cargoImpFhl.length > 0 ? (
                          <>
                            <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                              <span className="text-sm font-bold text-purple-800">
                                📦 {cargoImpFhl.length} Mensaje(s) FHL
                              </span>
                            </div>
                            {cargoImpFhl.map((fhlMsg: any, idx: number) => (
                              <div key={idx} className="mb-4">
                                <div className="bg-purple-100 px-3 py-2 rounded-t-lg font-bold text-purple-800 flex items-center gap-2">
                                  <Layers size={14}/>
                                  FHL #{idx + 1}
                                </div>
                                <CargoImpSegmentViewer 
                                  message={fhlMsg}
                                  onSegmentChange={(segmentCode, newValue) => {
                                    console.log(`[CARGO-IMP FHL ${idx}] Editando segmento ${segmentCode}:`, newValue);
                                  }}
                                  onToggleSegment={handleCargoImpToggleSegment}
                                />
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="text-slate-400 italic p-4 text-center">
                            No hay houses en este envío. FHL solo se genera para envíos consolidados.
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Vista EDI Raw (Colapsable) */}
                  {cargoImpFwb && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800 flex items-center gap-2 py-2">
                        <Terminal size={14}/> Ver EDI Raw (Formato plano)
                      </summary>
                      <div className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto font-mono text-xs leading-relaxed max-h-64 mt-2">
                        <pre>{cargoImpFwb.fullMessage}</pre>
                      </div>
                    </details>
                  )}
            </div>
          )}

          {/* ========== TAB: XML (CARGO-XML) ========== */}
          {activeTab === 'xml' && (
            <div className="h-full flex flex-col">
              {cargoXmlBundle ? (
                <CargoXmlViewer 
                  bundle={cargoXmlBundle}
                  onCopy={(content, type) => {
                    console.log(`[CARGO-XML] Copiado ${type}`);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No se pudo generar el Cargo-XML</p>
                    <p className="text-sm">Verifique los datos del envío</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* ============================================================ */}
        {/* FOOTER - Compacto para maximizar espacio de trabajo */}
        {/* ============================================================ */}
        <div className="px-3 py-2 border-t border-slate-100 flex justify-between items-center bg-white">
          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
            {sendResult?.allSuccess && (
              <span className="text-green-500">
                EDI copiado al portapapeles
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleCloseModal} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded transition-colors">
              Cerrar
            </button>
            {isEditable && cargoImpFwb && (
              <button 
                onClick={handleCopyEdi}
                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors flex items-center gap-1.5 font-semibold"
              >
                <Copy size={12} /> Copiar EDI
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Panel de Configuración */}
      <ConfigPanel 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        onConfigChange={(newConfig) => {
          setConnectorConfig(newConfig);
          // Forzar regeneración del mensaje cuando cambia la configuración (incluye Type B)
          setConfigVersion(v => v + 1);
        }}
        onSaveConfig={onSaveConfig}
      />
    </div>
  );
};

