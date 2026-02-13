
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
import { CargoImpValidationPanel } from './CargoImpValidationPanel';
import { validateCargoImpMessage } from '../services/providers/cargoimp/cargoImpValidator';


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
            <div className="flex flex-col">
              <label className="text-[10px] text-cyan-600 uppercase font-bold mb-0.5">Vol. M³ (NV)</label>
              <input 
                type="number" step="0.01" value={h.volumeCubicMeters || ''} 
                onChange={(e) => updateField('volumeCubicMeters', parseFloat(e.target.value) || 0)}
                readOnly={isReadOnly}
                placeholder="0.00"
                className="text-sm border border-cyan-200 rounded px-2 py-1 focus:ring-1 outline-none bg-cyan-50/30"
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
  /** Rol del usuario: 'ADM' = admin (ve todo), otros = operator */
  userRole?: string;
}

type Tab = 'summary' | 'parties' | 'cargo' | 'financials' | 'security' | 'houses' | 'json';
type JsonSubTab = 'fwb' | 'fhl';

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

const SummaryCard: FunctionComponent<SummaryCardProps> = ({ icon, label, value, subvalue }) => {
  // Color uniforme púrpura claro para todas las cards
  return (
    <div className="rounded-lg border p-3 bg-purple-50/60 border-purple-200/70 text-purple-800">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-purple-500">{icon}</span>
        <span className="text-xs uppercase font-bold text-purple-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-purple-900">{value}</div>
      {subvalue && <div className="text-xs text-purple-400">{subvalue}</div>}
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
// ROL DE USUARIO - Se recibe dinámicamente via prop userRole
// Mapping: 'ADM' → 'admin' (ve todo) | otros → 'operator'
// ============================================================

// ============================================================
// COMPONENTE PRINCIPAL DEL MODAL
// ============================================================

export const ChampModal: FunctionComponent<ChampModalProps> = ({ isOpen, onClose, shipment, onSave, onCopySuccess, onSaveConfig, userRole }) => {
  // Mapear rol externo a rol interno: ADM → admin, otros → operator
  const USER_ROLE: 'supervisor' | 'admin' | 'operator' = userRole?.toUpperCase() === 'ADM' ? 'admin' : 'operator';
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [activeJsonTab, setActiveJsonTab] = useState<JsonSubTab>('fwb');
  const [formData, setFormData] = useState<InternalShipment | null>(null);
  const [copied, setCopied] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<CargoImpResult | null>(null);
  const [sendMode, setSendMode] = useState<'masterOnly' | 'masterAndHouses'>('masterAndHouses');
  // Estado para ver detalles de transmisión: null = ninguno, 'fwb' = FWB, 0/1/2... = índice de FHL
  const [expandedTransmissionDetail, setExpandedTransmissionDetail] = useState<'fwb' | number | null>(null);

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
      setActiveTab('summary');
      setValidationErrors([]);
      setSendResult(null);
      setSendMode('masterAndHouses');
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
      
      // Determinar si es consolidado según el sendMode:
      // - masterAndHouses: consolidado (NC) — envía FWB + FHL
      // - masterOnly: directo (NG) — envía solo FWB
      const isConsolidatedSend = formData.hasHouses && sendMode === 'masterAndHouses';
      
      // Crear shipment con hasHouses ajustado según sendMode para NG/NC correcto
      const shipmentForFwb = isConsolidatedSend ? formData : { ...formData, hasHouses: false };
      
      // Generar FWB (usa política basada en prefijo AWB internamente)
      const fwbMessage = cargoImpService.generateFWB(shipmentForFwb);
      
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
  }, [formData, selectedProvider, configVersion, sendMode]);

  const { fwbMessage: cargoImpFwb, fhlMessages: cargoImpFhl, concatenatedFhl: cargoImpConcatFhl, policyInfo: cargoImpPolicyInfo, error: cargoImpGenError } = cargoImpGenerationResult;



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

  // Estado de validación CARGO-IMP (informativo, NO bloquea envío)
  const [fwbHasValidationErrors, setFwbHasValidationErrors] = useState(false);
  const [fwbValidationErrors, setFwbValidationErrors] = useState(0);
  const [showValidationConfirm, setShowValidationConfirm] = useState(false);

  // Estado para el modal de revisión pre-transmisión (errores y alertas)
  const [showPreTransmitReview, setShowPreTransmitReview] = useState(false);
  const [preTransmitTab, setPreTransmitTab] = useState<'validation' | 'preview'>('validation');

  // Ejecutar validación eagerly para que el conteo de errores esté disponible
  // en cualquier tab (no solo cuando se visita el tab EDI)
  useEffect(() => {
    if (cargoImpFwb) {
      const result = validateCargoImpMessage(cargoImpFwb, cargoImpPolicyInfo?.policy);
      setFwbHasValidationErrors(result.totalErrors > 0);
      setFwbValidationErrors(result.totalErrors);
    } else {
      setFwbHasValidationErrors(false);
      setFwbValidationErrors(0);
    }
  }, [cargoImpFwb, cargoImpPolicyInfo?.policy]);

  // Verificar si hay configuración de Descartes disponible
  const hasDescartesConfig = useMemo(() => {
    return !!(formData?.descartesConfig?.endpoint && 
              formData?.descartesConfig?.username && 
              formData?.descartesConfig?.password);
  }, [formData?.descartesConfig]);

  // Ejecutar la transmisión real
  const executeTransmit = useCallback(async () => {
    if (!formData?.descartesConfig) return;
    if (!cargoImpFwb?.fullMessage) return;

    setIsTransmitting(true);
    setTransmitSuccess(false);
    setSendResult(null);
    setExpandedTransmissionDetail(null);

    try {
      // Configurar el servicio con las credenciales del shipment
      // Si hay proxyUrl, el servicio usará el proxy del backend (evita CORS)
      const service = new DescartesTransmitService({
        endpoint: formData.descartesConfig.endpoint,
        username: formData.descartesConfig.username,
        password: formData.descartesConfig.password,
        proxyUrl: formData.descartesConfig.proxyUrl
      });

      const awbNumber = formData.awbNumber;
      let transmissionResult;
      const masterMessage: string = cargoImpFwb!.fullMessage;
      let houseMessages: string[] = [];
      let hawbNumbers: string[] = [];

      // Preparar FHLs si es consolidado y se quieren todos
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
        onCopySuccess(formData.id, `TRANSMITTED (EDI): ${awbNumber}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setSendResult({
        allSuccess: false,
        summary: `❌ Error de transmisión: ${errorMessage}`,
        fwbMessage: cargoImpFwb?.fullMessage
      });
    } finally {
      setIsTransmitting(false);
    }
  }, [cargoImpFwb, cargoImpFhl, formData, sendMode, onCopySuccess]);

  // Wrapper que muestra confirmación si hay errores de validación
  const handleTransmitToDescartes = useCallback(() => {
    if (fwbHasValidationErrors) {
      setShowValidationConfirm(true);
      return;
    }
    executeTransmit();
  }, [fwbHasValidationErrors, executeTransmit]);

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
  const allTabs = [
    { id: 'summary', icon: Eye, label: 'Resumen', roles: ['supervisor', 'admin', 'operator'] },
    { id: 'json', icon: Terminal, label: 'EDI', roles: ['admin', 'operator'] },
    { id: 'parties', icon: Users, label: 'Partes', roles: ['admin', 'operator'] },
    { id: 'cargo', icon: Package, label: 'Carga', roles: ['admin', 'operator'] },
    { id: 'financials', icon: Banknote, label: 'Cargos', roles: ['admin', 'operator'] },
    { id: 'security', icon: ShieldCheck, label: 'Seguridad', roles: ['admin', 'operator'] },
    { id: 'houses', icon: Layers, label: formData.hasHouses ? `Houses (${formData.houseBills.length})` : 'Houses', roles: ['admin', 'operator'] },
  ];
  // Filtrar tabs según rol del usuario
  const tabs = allTabs.filter(t => t.roles.includes(USER_ROLE));

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
                <SummaryCard icon={<MapPin size={14}/>} label="Origen" value={formData.origin} />
                <SummaryCard icon={<MapPin size={14}/>} label="Destino" value={formData.destination} />
                <SummaryCard icon={<Package size={14}/>} label="Piezas" value={formData.pieces} />
                <SummaryCard icon={<Scale size={14}/>} label="Peso" value={`${formData.weight} ${formData.weightUnit === 'KILOGRAM' ? 'KG' : 'LB'}`} />
                <SummaryCard icon={<Banknote size={14}/>} label="Total" value={`${formData.currency} ${grandTotal.toFixed(2)}`} />
                <SummaryCard icon={<Plane size={14}/>} label="Vuelos" value={formData.flights.length} subvalue={formData.flights[0]?.flightNumber || 'Sin vuelo'} />
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
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 text-slate-600">
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
                
                {/* GOODS DESCRIPTION preview — oculto temporalmente
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  ...
                </div>
                */}

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
                        📟 CARGO-IMP (EDI)
                      </p>
                      <p className="text-sm text-emerald-600">
                        Formato: FWB/16, FWB/17, FHL/4
                      </p>
                      {formData.hasHouses && (
                        <p className="text-xs text-purple-500 mt-1">Consolidado: Master + {formData.houseBills.length} House(s)</p>
                      )}
                      {!formData.hasHouses && formData.flights.length > 1 && (
                        <p className="text-xs text-purple-500 mt-1">Directo con {formData.flights.length} rutas</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Formato: EDI (CARGO-IMP) */}
                      <div className="flex flex-col items-end">
                        <label className="text-[10px] text-blue-600 uppercase font-bold mb-1">Formato</label>
                        <div className="text-sm border border-blue-300 rounded px-3 py-2 bg-blue-50 font-medium text-blue-700">
                          EDI (CARGO-IMP)
                        </div>
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
                              {`FWB + ${formData.houseBills.length} FHL`}
                            </option>
                            <option value="masterOnly">
                              Solo FWB (Master)
                            </option>
                          </select>
                        </div>
                      )}

                      {/* Botón para transmitir a Descartes (solo si hay configuración) */}
                      {hasDescartesConfig && (
                        <div className="flex flex-col items-end gap-1">
                          {/* Alerta informativa de validación (NO bloquea) */}
                          {fwbHasValidationErrors && (
                            <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                              <AlertTriangle size={12} /> {fwbValidationErrors} error(es) detectado(s) — revise antes de enviar
                            </span>
                          )}
                          <button 
                            onClick={() => {
                              setPreTransmitTab('validation');
                              setShowPreTransmitReview(true);
                            }}
                            disabled={
                              !cargoImpFwb?.fullMessage || isTransmitting}
                            className={`${
                              fwbHasValidationErrors
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            } disabled:bg-slate-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg hover:shadow-xl`}
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
                              <Upload size={18} /> {fwbHasValidationErrors ? 'Transmitir (con errores)' : 'Transmitir a Descartes'}
                            </>
                          )}
                          </button>
                        </div>
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
                          <div className="text-[10px] text-slate-400 mb-2 flex items-center gap-1">
                            <Info size={12} />
                            <span>Clic en cada mensaje para ver payload enviado y respuesta completa</span>
                          </div>
                          
                          {/* FWB Result - Clickeable */}
                          <div 
                            className={`p-2 rounded border cursor-pointer transition-all hover:shadow-md ${
                              sendResult.transmissionResult.fwbResult.success 
                                ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                : 'bg-red-50 border-red-200 hover:bg-red-100'
                            }`}
                            onClick={() => setExpandedTransmissionDetail(
                              expandedTransmissionDetail === 'fwb' ? null : 'fwb'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">
                                {expandedTransmissionDetail === 'fwb' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </span>
                              <span className={`text-lg ${sendResult.transmissionResult.fwbResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {sendResult.transmissionResult.fwbResult.success ? '✓' : '✗'}
                              </span>
                              <strong className="text-sm">FWB ({sendResult.transmissionResult.fwbResult.reference})</strong>
                              <span className="ml-auto text-[10px] text-slate-400">
                                {sendResult.transmissionResult.fwbResult.timestamp ? new Date(sendResult.transmissionResult.fwbResult.timestamp).toLocaleTimeString() : ''}
                              </span>
                            </div>
                            {/* Info básica siempre visible */}
                            {sendResult.transmissionResult.fwbResult.descartesResponse && (
                              <div className="ml-8 text-xs flex flex-wrap gap-3 mt-1">
                                {sendResult.transmissionResult.fwbResult.descartesResponse.tid && (
                                  <span><span className="text-slate-500">TID:</span> <span className="font-mono text-blue-700">{sendResult.transmissionResult.fwbResult.descartesResponse.tid}</span></span>
                                )}
                                {sendResult.transmissionResult.fwbResult.descartesResponse.status && (
                                  <span><span className="text-slate-500">Status:</span> <span className="text-green-700 font-medium">{sendResult.transmissionResult.fwbResult.descartesResponse.status}</span></span>
                                )}
                                {sendResult.transmissionResult.fwbResult.descartesResponse.error && (
                                  <span className="text-red-600">{sendResult.transmissionResult.fwbResult.descartesResponse.error}</span>
                                )}
                              </div>
                            )}
                            {sendResult.transmissionResult.fwbResult.error && !sendResult.transmissionResult.fwbResult.descartesResponse && (
                              <p className="ml-8 text-red-600">{sendResult.transmissionResult.fwbResult.error}</p>
                            )}
                          </div>
                          
                          {/* Panel expandido FWB */}
                          {expandedTransmissionDetail === 'fwb' && (
                            <div className="ml-4 p-3 bg-slate-100 rounded border border-slate-300 space-y-3 animate-fadeIn">
                              {/* Payload enviado */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                                    <Upload size={12} /> Mensaje Enviado (Request)
                                  </span>
                                  {sendResult.transmissionResult.fwbResult.requestBody && (
                                    <button
                                      className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(sendResult.transmissionResult!.fwbResult.requestBody || '');
                                      }}
                                    >
                                      <Copy size={10} /> Copiar
                                    </button>
                                  )}
                                </div>
                                <pre className="text-[10px] bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">
                                  {sendResult.transmissionResult.fwbResult.requestBody || '(No disponible)'}
                                </pre>
                              </div>
                              
                              {/* Respuesta completa */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                                    <FileText size={12} /> Respuesta API (Response)
                                  </span>
                                  {sendResult.transmissionResult.fwbResult.responseRaw && (
                                    <button
                                      className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(sendResult.transmissionResult!.fwbResult.responseRaw || '');
                                      }}
                                    >
                                      <Copy size={10} /> Copiar
                                    </button>
                                  )}
                                </div>
                                <pre className="text-[10px] bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">
                                  {sendResult.transmissionResult.fwbResult.responseRaw || sendResult.transmissionResult.fwbResult.responseMessage || '(No disponible)'}
                                </pre>
                              </div>
                              
                              {/* Detalles parseados */}
                              {sendResult.transmissionResult.fwbResult.descartesResponse && (
                                <div>
                                  <span className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                                    <Code size={12} /> Respuesta Parseada
                                  </span>
                                  <pre className="text-[10px] bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-32 font-mono">
                                    {JSON.stringify(sendResult.transmissionResult.fwbResult.descartesResponse, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* FHL Results - Clickeables */}
                          {sendResult.transmissionResult.fhlResults.map((fhl, idx) => (
                            <div key={idx}>
                              <div 
                                className={`p-2 rounded border cursor-pointer transition-all hover:shadow-md ${
                                  fhl.success 
                                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                    : 'bg-red-50 border-red-200 hover:bg-red-100'
                                }`}
                                onClick={() => setExpandedTransmissionDetail(
                                  expandedTransmissionDetail === idx ? null : idx
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">
                                    {expandedTransmissionDetail === idx ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </span>
                                  <span className={`text-lg ${fhl.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {fhl.success ? '✓' : '✗'}
                                  </span>
                                  <strong className="text-sm">FHL ({fhl.reference})</strong>
                                  <span className="ml-auto text-[10px] text-slate-400">
                                    {fhl.timestamp ? new Date(fhl.timestamp).toLocaleTimeString() : ''}
                                  </span>
                                </div>
                                {/* Info básica siempre visible */}
                                {fhl.descartesResponse && (
                                  <div className="ml-8 text-xs flex flex-wrap gap-3 mt-1">
                                    {fhl.descartesResponse.tid && (
                                      <span><span className="text-slate-500">TID:</span> <span className="font-mono text-blue-700">{fhl.descartesResponse.tid}</span></span>
                                    )}
                                    {fhl.descartesResponse.status && (
                                      <span><span className="text-slate-500">Status:</span> <span className="text-green-700 font-medium">{fhl.descartesResponse.status}</span></span>
                                    )}
                                    {fhl.descartesResponse.error && (
                                      <span className="text-red-600">{fhl.descartesResponse.error}</span>
                                    )}
                                  </div>
                                )}
                                {fhl.error && !fhl.descartesResponse && (
                                  <p className="ml-8 text-red-600">{fhl.error}</p>
                                )}
                              </div>
                              
                              {/* Panel expandido FHL */}
                              {expandedTransmissionDetail === idx && (
                                <div className="ml-4 mt-2 p-3 bg-slate-100 rounded border border-slate-300 space-y-3 animate-fadeIn">
                                  {/* Payload enviado */}
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                                        <Upload size={12} /> Mensaje Enviado (Request)
                                      </span>
                                      {fhl.requestBody && (
                                        <button
                                          className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(fhl.requestBody || '');
                                          }}
                                        >
                                          <Copy size={10} /> Copiar
                                        </button>
                                      )}
                                    </div>
                                    <pre className="text-[10px] bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">
                                      {fhl.requestBody || '(No disponible)'}
                                    </pre>
                                  </div>
                                  
                                  {/* Respuesta completa */}
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                                        <FileText size={12} /> Respuesta API (Response)
                                      </span>
                                      {fhl.responseRaw && (
                                        <button
                                          className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(fhl.responseRaw || '');
                                          }}
                                        >
                                          <Copy size={10} /> Copiar
                                        </button>
                                      )}
                                    </div>
                                    <pre className="text-[10px] bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">
                                      {fhl.responseRaw || fhl.responseMessage || '(No disponible)'}
                                    </pre>
                                  </div>
                                  
                                  {/* Detalles parseados */}
                                  {fhl.descartesResponse && (
                                    <div>
                                      <span className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                                        <Code size={12} /> Respuesta Parseada
                                      </span>
                                      <pre className="text-[10px] bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-32 font-mono">
                                        {JSON.stringify(fhl.descartesResponse, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
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
                            const currentCodes = formData.specialHandlingCodes && formData.specialHandlingCodes.length > 0 
                              ? formData.specialHandlingCodes 
                              : getDefaultSphCodes(getAwbPrefix(formData.awbNumber));
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
                        const currentCodes = formData.specialHandlingCodes && formData.specialHandlingCodes.length > 0 
                          ? formData.specialHandlingCodes 
                          : getDefaultSphCodes(getAwbPrefix(formData.awbNumber));
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

                  {/* Visor de segmentos CARGO-IMP — Colapsable */}
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {/* ===== FWB (Master) — Abierto por defecto ===== */}
                    {activeJsonTab === 'fwb' && cargoImpFwb && (
                      <details open className="border border-slate-200 rounded-lg overflow-hidden group">
                        <summary className="px-4 py-2.5 bg-purple-50 border-b border-purple-200 flex items-center justify-between cursor-pointer select-none hover:brightness-95 transition-all">
                          <span className="font-bold text-purple-800 flex items-center gap-2">
                            <ChevronRight size={14} className="text-purple-400 transition-transform group-open:rotate-90" />
                            <FileText size={14} />
                            FWB/{cargoImpFwb.messageVersion?.split('/')[1] || '16'} (Master)
                            {fwbHasValidationErrors && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                                {fwbValidationErrors} error{fwbValidationErrors > 1 ? 'es' : ''}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              copyToClipboard(cargoImpFwb.fullMessage || '');
                            }}
                            className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded flex items-center gap-1 transition-colors"
                          >
                            <Copy size={12} /> Copiar FWB
                          </button>
                        </summary>
                        <div className="p-2">
                          {/* Panel de Validación IATA - FWB */}
                          <CargoImpValidationPanel
                            message={cargoImpFwb}
                            policy={cargoImpPolicyInfo?.policy}
                            defaultCollapsed={true}
                            onValidationChange={({ canSend, errorCount }) => {
                              setFwbHasValidationErrors(errorCount > 0);
                              setFwbValidationErrors(errorCount);
                            }}
                          />
                          <CargoImpSegmentViewer 
                            message={cargoImpFwb}
                            onSegmentChange={(segmentCode, newValue) => {
                              console.log(`[CARGO-IMP] Editando segmento ${segmentCode}:`, newValue);
                            }}
                            onToggleSegment={handleCargoImpToggleSegment}
                          />
                        </div>
                      </details>
                    )}

                    {/* ===== FHL (Houses) — Colapsado por defecto ===== */}
                    {activeJsonTab === 'fhl' && formData.hasHouses && cargoImpFhl && cargoImpFhl.length > 0 && (
                      <details open className="border border-slate-200 rounded-lg overflow-hidden group">
                        <summary className="px-4 py-2.5 bg-sky-50 border-b border-sky-200 flex items-center justify-between cursor-pointer select-none hover:brightness-95 transition-all">
                          <span className="font-bold text-sky-800 flex items-center gap-2">
                            <ChevronRight size={14} className="text-sky-400 transition-transform group-open:rotate-90" />
                            <Layers size={14} />
                            FHL/4 (Houses) — {cargoImpFhl.length} mensaje{cargoImpFhl.length > 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              copyToClipboard(cargoImpConcatFhl || '');
                            }}
                            className="px-2 py-1 text-xs bg-sky-100 hover:bg-sky-200 text-sky-700 rounded flex items-center gap-1 transition-colors"
                          >
                            <Copy size={12} /> Copiar FHL
                          </button>
                        </summary>
                        <div className="p-2 space-y-4">
                          {cargoImpFhl.map((fhlMsg: any, idx: number) => (
                            <div key={idx}>
                              <div className="bg-sky-100 px-3 py-2 rounded-t-lg font-bold text-sky-800 flex items-center gap-2">
                                <Layers size={14}/>
                                FHL #{idx + 1}: {formData.houseBills?.[idx]?.hawbNumber || `House ${idx + 1}`}
                              </div>
                              {/* Panel de Validación IATA - FHL */}
                              <CargoImpValidationPanel
                                message={fhlMsg}
                                policy={cargoImpPolicyInfo?.policy}
                                defaultCollapsed={true}
                                compact={true}
                              />
                              <CargoImpSegmentViewer 
                                message={fhlMsg}
                                onSegmentChange={(segmentCode, newValue) => {
                                  console.log(`[CARGO-IMP FHL ${idx}] Editando segmento ${segmentCode}:`, newValue);
                                }}
                                onToggleSegment={handleCargoImpToggleSegment}
                              />
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Vista EDI Raw (Colapsable) */}
                  {activeJsonTab === 'fwb' && cargoImpFwb && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800 flex items-center gap-2 py-2">
                        <Terminal size={14}/> Ver EDI Raw FWB (Formato plano)
                      </summary>
                      <div className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto font-mono text-xs leading-relaxed max-h-64 mt-2">
                        <pre>{cargoImpFwb.fullMessage}</pre>
                      </div>
                    </details>
                  )}
                  {activeJsonTab === 'fhl' && cargoImpConcatFhl && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800 flex items-center gap-2 py-2">
                        <Terminal size={14}/> Ver EDI Raw FHL (Formato plano)
                      </summary>
                      <div className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto font-mono text-xs leading-relaxed max-h-64 mt-2">
                        <pre>{cargoImpConcatFhl}</pre>
                      </div>
                    </details>
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
      
      {/* ============================================================ */}
      {/* MODAL DE REVISIÓN PRE-TRANSMISIÓN */}
      {/* Muestra errores y alertas antes de enviar */}
      {/* ============================================================ */}
      {showPreTransmitReview && cargoImpFwb && (() => {
        // Validar FWB
        const fwbValidation = validateCargoImpMessage(cargoImpFwb, cargoImpPolicyInfo?.policy);
        
        // Validar FHLs
        const fhlValidations = (cargoImpFhl || []).map((fhlMsg: any, idx: number) => ({
          index: idx,
          hawb: formData?.houseBills?.[idx]?.hawbNumber || `House #${idx + 1}`,
          result: validateCargoImpMessage(fhlMsg, cargoImpPolicyInfo?.policy)
        }));
        
        // Agrupar errores FWB por segmento con descripciones legibles
        const segmentLabels: Record<string, string> = {
          'FWB': 'Header', 'AWB': 'N° Guía', 'FLT': 'Vuelo', 'RTG': 'Ruta',
          'SHP': 'Exportador (Shipper)', 'CNE': 'Consignatario (Consignee)', 'AGT': 'Agente',
          'SSR': 'Serv. Especial', 'ACC': 'Contabilidad', 'CVD': 'Cargos',
          'RTD': 'Tarifas', 'NG': 'Mercancía', 'NH': 'Código HTS', 'NV': 'Volumen',
          'NS': 'SLAC', 'OTH': 'Otros Cargos', 'PPD': 'Prepaid', 'COL': 'Collect',
          'CER': 'Certificación', 'ISU': 'Emisión', 'REF': 'Referencia',
          'SPH': 'Manejo Especial', 'OCI': 'Info Aduanas', 'NFY': 'Notificar', 'FTR': 'Footer',
          'MBI': 'Master Info', 'HBS': 'Resumen House', 'HTS': 'Arancelario', 'TXT': 'Texto Libre'
        };
        
        const fwbErrors = fwbValidation.allIssues.filter(i => i.severity === 'error');
        const fwbWarnings = fwbValidation.allIssues.filter(i => i.severity === 'warning');
        const totalFhlErrors = fhlValidations.reduce((sum, f) => sum + f.result.totalErrors, 0);
        const totalFhlWarnings = fhlValidations.reduce((sum, f) => sum + f.result.totalWarnings, 0);
        const totalErrors = fwbErrors.length + totalFhlErrors;
        const totalWarnings = fwbWarnings.length + totalFhlWarnings;
        const allClear = totalErrors === 0 && totalWarnings === 0;
        
        // Contar houses con problemas vs sin problemas
        const housesWithIssues = fhlValidations.filter(f => f.result.totalErrors > 0 || f.result.totalWarnings > 0).length;
        const housesOk = fhlValidations.length - housesWithIssues;

        return (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className={`px-6 py-4 flex items-center gap-3 ${
                allClear 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                  : totalErrors > 0 
                    ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                    : 'bg-gradient-to-r from-amber-400 to-orange-400'
              }`}>
                {allClear ? (
                  <CheckCircle2 size={28} className="text-white" />
                ) : totalErrors > 0 ? (
                  <AlertTriangle size={28} className="text-white" />
                ) : (
                  <Info size={28} className="text-white" />
                )}
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {allClear ? 'Listo para enviar' : 'Revisión antes de enviar'}
                  </h3>
                  <p className="text-white/80 text-xs">
                    AWB: {formData?.awbNumber} — {formData?.hasHouses ? `Consolidado (${formData.houseBills.length} houses)` : 'Directo'}
                  </p>
                </div>
              </div>
              
              {/* Resumen rápido */}
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3">
                {totalErrors > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                    <AlertTriangle size={14} /> {totalErrors} Error{totalErrors > 1 ? 'es' : ''}
                  </span>
                )}
                {totalWarnings > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-700">
                    <Info size={14} /> {totalWarnings} Alerta{totalWarnings > 1 ? 's' : ''}
                  </span>
                )}
                {allClear && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                    <CheckCircle2 size={14} /> Sin problemas detectados
                  </span>
                )}
              </div>

              {/* Tabs de navegación */}
              <div className="px-6 py-2 bg-white border-b border-slate-200 flex gap-1">
                <button
                  onClick={() => setPreTransmitTab('validation')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                    preTransmitTab === 'validation'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck size={14} />
                  Validación
                  {(totalErrors > 0 || totalWarnings > 0) && (
                    <span className={`text-xs px-1.5 rounded-full ${
                      totalErrors > 0 ? 'bg-red-500 text-white' : 'bg-amber-400 text-white'
                    }`}>
                      {totalErrors + totalWarnings}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setPreTransmitTab('preview')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                    preTransmitTab === 'preview'
                      ? 'bg-sky-100 text-sky-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Terminal size={14} />
                  Preview EDI
                  <span className="text-xs bg-slate-200 text-slate-600 px-1.5 rounded-full">
                    {1 + (cargoImpFhl?.length || 0)}
                  </span>
                </button>
              </div>

              {/* Contenido scrolleable */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                
                {/* ==================== TAB: VALIDACIÓN ==================== */}
                {preTransmitTab === 'validation' && (
                  <>
                {/* Sección colapsable: Master (FWB) — abierto por defecto */}
                <details open className="border border-slate-200 rounded-lg overflow-hidden group">
                  <summary className={`px-4 py-2.5 flex items-center justify-between cursor-pointer select-none hover:brightness-95 transition-all ${
                    fwbErrors.length > 0 ? 'bg-red-50' : fwbWarnings.length > 0 ? 'bg-amber-50' : 'bg-green-50'
                  }`}>
                    <span className="font-bold text-sm flex items-center gap-2">
                      <ChevronRight size={14} className="text-slate-400 transition-transform group-open:rotate-90" />
                      <FileText size={14} className="text-purple-600" /> 
                      Master (FWB)
                    </span>
                    <div className="flex items-center gap-2">
                      {fwbErrors.length > 0 && (
                        <span className="text-xs font-bold text-red-600">{fwbErrors.length} error{fwbErrors.length > 1 ? 'es' : ''}</span>
                      )}
                      {fwbWarnings.length > 0 && (
                        <span className="text-xs font-bold text-amber-600">{fwbWarnings.length} alerta{fwbWarnings.length > 1 ? 's' : ''}</span>
                      )}
                      {fwbErrors.length === 0 && fwbWarnings.length === 0 && (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> OK</span>
                      )}
                    </div>
                  </summary>
                  
                  {(fwbErrors.length > 0 || fwbWarnings.length > 0) ? (
                    <div className="p-3 space-y-2 border-t border-slate-100">
                      {[...fwbErrors, ...fwbWarnings].map((issue, i) => (
                        <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                          issue.severity === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                        }`}>
                          <span className="mt-0.5 flex-shrink-0">
                            {issue.severity === 'error' ? <AlertTriangle size={14} className="text-red-500" /> : <Info size={14} className="text-amber-500" />}
                          </span>
                          <div>
                            <span className="font-bold text-xs bg-white/60 px-1.5 py-0.5 rounded mr-2">
                              {segmentLabels[issue.segment] || issue.segment}
                            </span>
                            {issue.message}
                            {issue.suggestion && (
                              <p className="text-xs mt-0.5 opacity-70">Sugerencia: {issue.suggestion}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 border-t border-slate-100 text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle2 size={14} /> Sin problemas en el Master FWB
                    </div>
                  )}
                </details>

                {/* Sección colapsable: Houses (FHL) — cerrado por defecto */}
                {fhlValidations.length > 0 && (
                  <details className="border border-slate-200 rounded-lg overflow-hidden group">
                    <summary className={`px-4 py-2.5 flex items-center justify-between cursor-pointer select-none hover:brightness-95 transition-all ${
                      totalFhlErrors > 0 ? 'bg-red-50' : totalFhlWarnings > 0 ? 'bg-amber-50' : 'bg-green-50'
                    }`}>
                      <span className="font-bold text-sm flex items-center gap-2">
                        <ChevronRight size={14} className="text-slate-400 transition-transform group-open:rotate-90" />
                        <Layers size={14} className="text-sky-600" />
                        Houses (FHL) — {fhlValidations.length} mensaje{fhlValidations.length > 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {housesOk > 0 && (
                          <span className="text-xs font-bold text-green-600">{housesOk} OK</span>
                        )}
                        {totalFhlErrors > 0 && (
                          <span className="text-xs font-bold text-red-600">{housesWithIssues} con error{housesWithIssues > 1 ? 'es' : ''}</span>
                        )}
                        {totalFhlErrors === 0 && totalFhlWarnings > 0 && (
                          <span className="text-xs font-bold text-amber-600">{housesWithIssues} con alerta{housesWithIssues > 1 ? 's' : ''}</span>
                        )}
                        {totalFhlErrors === 0 && totalFhlWarnings === 0 && (
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> Todas OK</span>
                        )}
                      </div>
                    </summary>
                    
                    <div className="p-3 space-y-2 border-t border-slate-100 max-h-[40vh] overflow-y-auto">
                      {fhlValidations.map((fv) => {
                        const errors = fv.result.allIssues.filter(i => i.severity === 'error');
                        const warnings = fv.result.allIssues.filter(i => i.severity === 'warning');
                        const hasIssues = errors.length > 0 || warnings.length > 0;
                        
                        if (!hasIssues) {
                          return (
                            <div key={fv.index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm text-green-700">
                              <CheckCircle2 size={14} />
                              <span className="font-mono font-bold">{fv.hawb}</span>
                              <span className="text-xs">— Sin problemas</span>
                            </div>
                          );
                        }
                        
                        return (
                          <details key={fv.index} className="border border-slate-100 rounded-lg overflow-hidden group/house">
                            <summary className={`px-3 py-1.5 text-sm font-bold flex items-center gap-2 cursor-pointer select-none hover:brightness-95 ${
                              errors.length > 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              <ChevronRight size={12} className="text-slate-400 transition-transform group-open/house:rotate-90" />
                              <span className="font-mono">{fv.hawb}</span>
                              {errors.length > 0 && <span className="text-xs">({errors.length} error{errors.length > 1 ? 'es' : ''})</span>}
                              {warnings.length > 0 && <span className="text-xs">({warnings.length} alerta{warnings.length > 1 ? 's' : ''})</span>}
                            </summary>
                            <div className="p-2 space-y-1 border-t border-slate-100">
                              {[...errors, ...warnings].map((issue, j) => (
                                <div key={j} className={`flex items-start gap-2 p-1.5 rounded text-xs ${
                                  issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'
                                }`}>
                                  <span className="mt-0.5 flex-shrink-0">
                                    {issue.severity === 'error' ? <AlertTriangle size={12} /> : <Info size={12} />}
                                  </span>
                                  <div>
                                    <span className="font-bold bg-white/60 px-1 py-0.5 rounded mr-1">
                                      {segmentLabels[issue.segment] || issue.segment}
                                    </span>
                                    {issue.message}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </details>
                )}

                {/* Mensaje si todo está OK */}
                {allClear && (
                  <div className="text-center py-4">
                    <CheckCircle2 size={48} className="mx-auto text-green-400 mb-2" />
                    <p className="text-green-700 font-bold text-lg">Todo en orden</p>
                    <p className="text-slate-500 text-sm">No se detectaron errores ni alertas en los mensajes EDI.</p>
                  </div>
                )}
                  </>
                )}

                {/* ==================== TAB: PREVIEW EDI ==================== */}
                {preTransmitTab === 'preview' && (
                  <div className="space-y-4">
                    {/* FWB Preview — abierto por defecto */}
                    <details open className="border border-slate-200 rounded-lg overflow-hidden group">
                      <summary className="px-4 py-2.5 bg-purple-50 border-b border-purple-200 flex items-center justify-between cursor-pointer select-none hover:brightness-95 transition-all">
                        <span className="font-bold text-purple-800 flex items-center gap-2">
                          <ChevronRight size={14} className="text-purple-400 transition-transform group-open:rotate-90" />
                          <FileText size={14} />
                          FWB 16 (Master)
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            navigator.clipboard.writeText(cargoImpFwb.fullMessage || '');
                          }}
                          className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded flex items-center gap-1 transition-colors"
                        >
                          <Copy size={12} /> Copiar
                        </button>
                      </summary>
                      <div className="bg-slate-900 text-green-400 p-4 overflow-x-auto font-mono text-xs leading-relaxed max-h-[40vh]">
                        <pre className="whitespace-pre-wrap">{cargoImpFwb.fullMessage || 'Sin contenido generado'}</pre>
                      </div>
                    </details>

                    {/* FHL Previews — colapsado por defecto */}
                    {cargoImpFhl && cargoImpFhl.length > 0 && (
                      <details className="border border-slate-200 rounded-lg overflow-hidden group">
                        <summary className="px-4 py-2.5 bg-sky-50 border-b border-sky-200 flex items-center justify-between cursor-pointer select-none hover:brightness-95 transition-all">
                          <span className="font-bold text-sky-800 flex items-center gap-2">
                            <ChevronRight size={14} className="text-sky-400 transition-transform group-open:rotate-90" />
                            <Layers size={14} />
                            FHL (Houses) — {cargoImpFhl.length} mensaje{cargoImpFhl.length > 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const allFhl = cargoImpFhl.map((f: any) => f.fullMessage).join('\n\n');
                              navigator.clipboard.writeText(allFhl);
                            }}
                            className="px-2 py-1 text-xs bg-sky-100 hover:bg-sky-200 text-sky-700 rounded flex items-center gap-1 transition-colors"
                          >
                            <Copy size={12} /> Copiar todos
                          </button>
                        </summary>
                        <div className="bg-slate-900 p-4 overflow-y-auto max-h-[40vh] space-y-4">
                          {cargoImpFhl.map((fhlMsg: any, idx: number) => (
                            <div key={idx}>
                              <div className="text-sky-400 font-bold text-xs mb-1 flex items-center justify-between">
                                <span>— FHL #{idx + 1}: {formData?.houseBills?.[idx]?.hawbNumber || 'House ' + (idx + 1)} —</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(fhlMsg.fullMessage || '')}
                                  className="text-slate-500 hover:text-sky-400 transition-colors"
                                >
                                  <Copy size={10} />
                                </button>
                              </div>
                              <pre className="text-green-400 font-mono text-xs leading-relaxed whitespace-pre-wrap">{fhlMsg.fullMessage || 'Sin contenido'}</pre>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Info adicional */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-sm text-blue-700">
                      <Info size={14} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Preview del mensaje EDI</span> — Este es el contenido exacto que será enviado a Descartes GLN.
                        Revisa que la información sea correcta antes de transmitir.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer con botones */}
              <div className="px-6 py-4 bg-slate-50 flex justify-between items-center border-t border-slate-200">
                <button
                  onClick={() => setShowPreTransmitReview(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  Volver
                </button>
                <div className="flex items-center gap-3">
                  {totalErrors > 0 && (
                    <span className="text-xs text-red-600 font-medium">Enviar con {totalErrors} error{totalErrors > 1 ? 'es' : ''}</span>
                  )}
                  <button
                    onClick={() => {
                      setShowPreTransmitReview(false);
                      handleTransmitToDescartes();
                    }}
                    disabled={isTransmitting}
                    className={`px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg ${
                      totalErrors > 0
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Send size={16} />
                    {totalErrors > 0 ? 'Enviar de todas formas' : 'Enviar a Descartes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dialog de Confirmación — Enviar con errores de validación */}
      {showValidationConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-300 max-w-md mx-4 overflow-hidden animate-bounce-in">
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-4 flex items-center gap-3">
              <AlertTriangle size={28} className="text-white" />
              <div>
                <h3 className="text-white font-bold text-lg">⚠️ Mensaje con Errores</h3>
                <p className="text-amber-100 text-xs">Validación IATA CARGO-IMP</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-slate-700 mb-3">
                El mensaje EDI tiene <span className="font-bold text-red-600">{fwbValidationErrors} error(es)</span> de validación según las especificaciones IATA.
              </p>
              <p className="text-slate-600 text-sm mb-4">
                La aerolínea podría <strong>rechazar</strong> el mensaje o generar un <strong>HOLD</strong> en el sistema de Risk Assessment (ACAS/PLACI).
              </p>
              <p className="text-slate-800 font-semibold text-center text-base mb-2">
                ¿Está seguro que desea transmitir?
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-200">
              <button
                onClick={() => setShowValidationConfirm(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowValidationConfirm(false);
                  executeTransmit();
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg"
              >
                <Upload size={16} /> Sí, Enviar de Todas Formas
              </button>
            </div>
          </div>
        </div>
      )}
      
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

