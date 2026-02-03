/**
 * Panel de Configuración de Políticas de Aerolíneas para CARGO-IMP
 * 
 * Permite configurar:
 * - Segmentos habilitados/deshabilitados por aerolínea
 * - Versiones de mensaje (FWB/16, FWB/17, FHL/4)
 * - Códigos SPH por defecto
 * - Formato OCI
 * 
 * @author Senior Solutions Architect
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'preact/hooks';
import { FunctionComponent, JSX } from 'preact';
import { 
  Settings, X, Plus, Trash2, AlertTriangle, CheckCircle2, 
  Plane, Save, ChevronDown, ChevronRight, Info, Edit3,
  ToggleLeft, ToggleRight, FileText
} from 'lucide-preact';
import {
  AirlinePolicy,
  DEFAULT_AIRLINE_POLICIES,
  FwbVersion,
  FhlVersion,
  FwbSegmentType,
  FhlSegmentType,
  FWB_SEGMENTS,
  FHL_SEGMENTS
} from '../services/providers/cargoimp';

// ============================================================
// STORAGE
// ============================================================

const STORAGE_KEY = 'cargoimp_airline_policies';
const STORAGE_KEY_GLOBAL = 'cargoimp_global_config';

// ============================================================
// CONFIGURACIÓN GLOBAL EDI
// ============================================================

export interface CargoImpGlobalConfig {
  /** Sender IDs por país */
  senderIds: {
    EC: { senderId: string; senderIdDescartes: string };
    CO: { senderId: string; senderIdDescartes: string };
  };
  /** Códigos postales por defecto por país */
  defaultPostalCodes: {
    EC: string;
    CO: string;
    DEFAULT: string;
  };
  /** Código postal especial para envíos Ecuador→China */
  chinaPostalCode: string;
}

const DEFAULT_GLOBAL_CONFIG: CargoImpGlobalConfig = {
  senderIds: {
    EC: { senderId: 'REUAGT89ECRGML/UIO01:PIMA', senderIdDescartes: 'TDVAGT03DSV/BOG01:PIMA' },
    CO: { senderId: 'REUAGT89COCRGMASTER/BOG01:PIMA', senderIdDescartes: 'TDVAGT03DSV/BOG01:PIMA' }
  },
  defaultPostalCodes: {
    EC: '00000',
    CO: '110111',
    DEFAULT: '10'
  },
  chinaPostalCode: '170452'
};

function loadGlobalConfig(): CargoImpGlobalConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GLOBAL);
    if (saved) {
      return { ...DEFAULT_GLOBAL_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Error loading CARGO-IMP global config:', e);
  }
  return { ...DEFAULT_GLOBAL_CONFIG };
}

function saveGlobalConfig(config: CargoImpGlobalConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_GLOBAL, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving CARGO-IMP global config:', e);
  }
}

// Función exportada para usar desde cargoImpService
export function getGlobalConfig(): CargoImpGlobalConfig {
  return loadGlobalConfig();
}

function loadPolicies(): Record<string, AirlinePolicy> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const savedPolicies = JSON.parse(saved);
      // Combinar: DEFAULT_AIRLINE_POLICIES como base, luego sobrescribir con guardadas
      // Pero asegurar que nuevas aerolíneas en DEFAULT siempre aparezcan
      const combined: Record<string, AirlinePolicy> = { ...DEFAULT_AIRLINE_POLICIES };
      
      // Solo sobrescribir si el usuario realmente personalizó (no datos viejos erróneos)
      for (const [prefix, policy] of Object.entries(savedPolicies)) {
        if (policy && typeof policy === 'object') {
          combined[prefix] = policy as AirlinePolicy;
        }
      }
      
      return combined;
    }
  } catch (e) {
    console.warn('Error loading CARGO-IMP policies:', e);
  }
  return { ...DEFAULT_AIRLINE_POLICIES };
}

function savePolicies(policies: Record<string, AirlinePolicy>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
  } catch (e) {
    console.error('Error saving CARGO-IMP policies:', e);
  }
}

// ============================================================
// COMPONENTE: Editor de Política Individual
// ============================================================

interface PolicyEditorProps {
  policy: AirlinePolicy;
  onSave: (policy: AirlinePolicy) => void;
  onCancel: () => void;
}

const PolicyEditor: FunctionComponent<PolicyEditorProps> = ({ policy, onSave, onCancel }) => {
  const [editedPolicy, setEditedPolicy] = useState<AirlinePolicy>({ ...policy });
  const [newSphCode, setNewSphCode] = useState('');

  const allFwbSegments: FwbSegmentType[] = Object.keys(FWB_SEGMENTS) as FwbSegmentType[];
  const allFhlSegments: FhlSegmentType[] = Object.keys(FHL_SEGMENTS) as FhlSegmentType[];
  
  // Toggle segmento FWB
  const toggleFwbSegment = (segment: FwbSegmentType) => {
    const isEnabled = editedPolicy.enabledSegments.includes(segment);
    
    if (isEnabled) {
      setEditedPolicy(prev => ({
        ...prev,
        enabledSegments: prev.enabledSegments.filter(s => s !== segment),
        disabledSegments: [...prev.disabledSegments, segment]
      }));
    } else {
      setEditedPolicy(prev => ({
        ...prev,
        enabledSegments: [...prev.enabledSegments, segment],
        disabledSegments: prev.disabledSegments.filter(s => s !== segment)
      }));
    }
  };

  // Toggle segmento FHL
  const toggleFhlSegment = (segment: FhlSegmentType) => {
    const enabledFhl = editedPolicy.enabledFhlSegments || allFhlSegments;
    const disabledFhl = editedPolicy.disabledFhlSegments || [];
    const isEnabled = enabledFhl.includes(segment);
    
    if (isEnabled) {
      setEditedPolicy(prev => ({
        ...prev,
        enabledFhlSegments: enabledFhl.filter(s => s !== segment),
        disabledFhlSegments: [...disabledFhl, segment]
      }));
    } else {
      setEditedPolicy(prev => ({
        ...prev,
        enabledFhlSegments: [...enabledFhl, segment],
        disabledFhlSegments: disabledFhl.filter(s => s !== segment)
      }));
    }
  };

  const addSphCode = () => {
    if (newSphCode && !editedPolicy.defaultSphCodes.includes(newSphCode.toUpperCase())) {
      setEditedPolicy(prev => ({
        ...prev,
        defaultSphCodes: [...prev.defaultSphCodes, newSphCode.toUpperCase()]
      }));
      setNewSphCode('');
    }
  };

  const removeSphCode = (code: string) => {
    setEditedPolicy(prev => ({
      ...prev,
      defaultSphCodes: prev.defaultSphCodes.filter(c => c !== code)
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-slate-800">
          Editar Política: {editedPolicy.name} ({editedPolicy.awbPrefix})
        </h3>
        <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded">
          <X size={18} />
        </button>
      </div>

      {/* Versiones */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Versión FWB</label>
          <select
            value={editedPolicy.fwbVersion}
            onChange={(e) => setEditedPolicy(prev => ({ 
              ...prev, 
              fwbVersion: (e.target as HTMLSelectElement).value as FwbVersion 
            }))}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          >
            <option value="FWB/9">FWB/9</option>
            <option value="FWB/16">FWB/16</option>
            <option value="FWB/17">FWB/17</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Versión FHL</label>
          <select
            value={editedPolicy.fhlVersion}
            onChange={(e) => setEditedPolicy(prev => ({ 
              ...prev, 
              fhlVersion: (e.target as HTMLSelectElement).value as FhlVersion 
            }))}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          >
            <option value="FHL/2">FHL/2</option>
            <option value="FHL/4">FHL/4</option>
          </select>
        </div>
      </div>

      {/* ========== SECCIÓN: Política de Caso (NUEVA) ========== */}
      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <label className="text-xs text-amber-700 font-bold block mb-2">
          🔧 Política de Generación de Mensajes
        </label>
        <select
          value={editedPolicy.policy || 20}
          onChange={(e) => setEditedPolicy(prev => ({ 
            ...prev, 
            policy: parseInt((e.target as HTMLSelectElement).value) as AirlinePolicy['policy']
          }))}
          className="w-full border border-amber-300 rounded px-3 py-2 text-sm bg-white"
        >
          <optgroup label="Consolidados">
            <option value={20}>Caso 2: FWB estándar + FHL individuales</option>
            <option value={40}>Caso 4: FWB_NEW + FHL individuales</option>
            <option value={50}>Caso 5: FWB_NEW + FHL concatenadas (&amp;)</option>
            <option value={70}>Caso 7: DHL/ABX - FHL con header EDIFACT</option>
            <option value={80}>Caso 8: Todas FHL en 1 mensaje (MBI solo primera)</option>
          </optgroup>
          <optgroup label="Directos">
            <option value={21}>Caso 2: FWB estándar (directo)</option>
            <option value={41}>Caso 4: FWB_NEW (directo)</option>
            <option value={51}>Caso 5: FWB_NEW directo</option>
            <option value={71}>Caso 7: DHL/ABX directo</option>
            <option value={81}>Caso 8: MBI only first (directo)</option>
          </optgroup>
        </select>
      </div>

      {/* ========== SECCIÓN: País del Emisor ========== */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">País del Emisor</label>
          <select
            value={editedPolicy.senderCountry || 'EC'}
            onChange={(e) => setEditedPolicy(prev => ({ 
              ...prev, 
              senderCountry: (e.target as HTMLSelectElement).value as 'EC' | 'CO'
            }))}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          >
            <option value="EC">🇪🇨 Ecuador</option>
            <option value="CO">🇨🇴 Colombia</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">Dirección Aerolínea (CVD)</label>
          <input
            type="text"
            value={editedPolicy.airlineAddress || ''}
            onChange={(e) => setEditedPolicy(prev => ({ 
              ...prev, 
              airlineAddress: (e.target as HTMLInputElement).value 
            }))}
            placeholder="Ej: CVD/NVD/PP"
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Opciones */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <span className="text-sm text-slate-700">Incluir UNB/UNZ (Header/Footer)</span>
          <button
            onClick={() => setEditedPolicy(prev => ({ ...prev, includeUnbUnz: !prev.includeUnbUnz }))}
            className={`p-1 rounded ${editedPolicy.includeUnbUnz ? 'text-green-600' : 'text-slate-400'}`}
          >
            {editedPolicy.includeUnbUnz ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          </button>
        </div>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <span className="text-sm text-slate-700">OCI con prefijo EORI</span>
          <button
            onClick={() => setEditedPolicy(prev => ({ 
              ...prev, 
              ociFormat: prev.ociFormat === 'withPrefix' ? 'withoutPrefix' : 'withPrefix' 
            }))}
            className={`p-1 rounded ${editedPolicy.ociFormat === 'withPrefix' ? 'text-green-600' : 'text-slate-400'}`}
          >
            {editedPolicy.ociFormat === 'withPrefix' ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          </button>
        </div>
      </div>

      {/* ========== SECCIÓN: Opciones Avanzadas de Caso ========== */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <label className="text-xs text-blue-700 font-bold block mb-3">
          ⚙️ Opciones de Comportamiento
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-2 bg-white rounded border">
            <span className="text-xs text-slate-700">FHL siempre con Header (Case 7)</span>
            <button
              onClick={() => setEditedPolicy(prev => ({ ...prev, fhlAlwaysWithHeader: !prev.fhlAlwaysWithHeader }))}
              className={`p-1 rounded ${editedPolicy.fhlAlwaysWithHeader ? 'text-green-600' : 'text-slate-400'}`}
            >
              {editedPolicy.fhlAlwaysWithHeader ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded border">
            <span className="text-xs text-slate-700">MBI solo primera HAWB (Case 8)</span>
            <button
              onClick={() => setEditedPolicy(prev => ({ ...prev, mbiOnlyFirstHawb: !prev.mbiOnlyFirstHawb }))}
              className={`p-1 rounded ${editedPolicy.mbiOnlyFirstHawb ? 'text-green-600' : 'text-slate-400'}`}
            >
              {editedPolicy.mbiOnlyFirstHawb ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded border">
            <span className="text-xs text-slate-700">Usar nombre agencia (CER)</span>
            <button
              onClick={() => setEditedPolicy(prev => ({ ...prev, useAgencyNameForCER: !prev.useAgencyNameForCER }))}
              className={`p-1 rounded ${editedPolicy.useAgencyNameForCER ? 'text-green-600' : 'text-slate-400'}`}
            >
              {editedPolicy.useAgencyNameForCER ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded border">
            <span className="text-xs text-slate-700">Requiere HTS</span>
            <button
              onClick={() => setEditedPolicy(prev => ({ ...prev, requiresHTS: !prev.requiresHTS }))}
              className={`p-1 rounded ${editedPolicy.requiresHTS ? 'text-green-600' : 'text-slate-400'}`}
            >
              {editedPolicy.requiresHTS ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded border">
            <span className="text-xs text-slate-700">Código postal China</span>
            <button
              onClick={() => setEditedPolicy(prev => ({ ...prev, requiresChinaPostalCode: !prev.requiresChinaPostalCode }))}
              className={`p-1 rounded ${editedPolicy.requiresChinaPostalCode ? 'text-green-600' : 'text-slate-400'}`}
            >
              {editedPolicy.requiresChinaPostalCode ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded border">
            <span className="text-xs text-slate-700">Usar NG consolidada</span>
            <button
              onClick={() => setEditedPolicy(prev => ({ ...prev, useConsolidatedNG: !prev.useConsolidatedNG }))}
              className={`p-1 rounded ${editedPolicy.useConsolidatedNG ? 'text-green-600' : 'text-slate-400'}`}
            >
              {editedPolicy.useConsolidatedNG ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ========== SECCIÓN: Prefijos HAWB que agregan 0 ========== */}
      <div>
        <label className="text-xs text-slate-500 font-medium block mb-2">
          Prefijos HAWB que agregan 0 (ej: CM → 0CM)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(editedPolicy.hawbPrefixAdd0 || []).map(prefix => (
            <span 
              key={prefix} 
              className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
            >
              {prefix} → 0{prefix}
              <button 
                onClick={() => setEditedPolicy(prev => ({
                  ...prev,
                  hawbPrefixAdd0: (prev.hawbPrefixAdd0 || []).filter(p => p !== prefix)
                }))} 
                className="hover:text-red-600"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            id="newHawbPrefix"
            placeholder="CM, SK, LG..."
            className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm uppercase"
            maxLength={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                const val = input.value.trim().toUpperCase();
                if (val && !(editedPolicy.hawbPrefixAdd0 || []).includes(val)) {
                  setEditedPolicy(prev => ({
                    ...prev,
                    hawbPrefixAdd0: [...(prev.hawbPrefixAdd0 || []), val]
                  }));
                  input.value = '';
                }
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById('newHawbPrefix') as HTMLInputElement;
              const val = input?.value.trim().toUpperCase();
              if (val && !(editedPolicy.hawbPrefixAdd0 || []).includes(val)) {
                setEditedPolicy(prev => ({
                  ...prev,
                  hawbPrefixAdd0: [...(prev.hawbPrefixAdd0 || []), val]
                }));
                input.value = '';
              }
            }}
            className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Códigos SPH */}
      <div>
        <label className="text-xs text-slate-500 font-medium block mb-2">Códigos SPH por Defecto</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {editedPolicy.defaultSphCodes.map(code => (
            <span 
              key={code} 
              className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
            >
              {code}
              <button onClick={() => removeSphCode(code)} className="hover:text-red-600">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSphCode}
            onChange={(e) => setNewSphCode((e.target as HTMLInputElement).value.toUpperCase())}
            placeholder="EAP, PER, etc."
            className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm"
            maxLength={3}
          />
          <button
            onClick={addSphCode}
            disabled={!newSphCode}
            className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Segmentos FWB */}
      <div>
        <label className="text-xs text-purple-600 font-medium block mb-2">📋 Segmentos FWB Habilitados (Master AWB)</label>
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-purple-50 rounded-lg">
          {allFwbSegments.map(segment => {
            const isEnabled = editedPolicy.enabledSegments.includes(segment);
            const segInfo = FWB_SEGMENTS[segment];
            return (
              <button
                key={segment}
                onClick={() => toggleFwbSegment(segment)}
                className={`
                  p-2 rounded-lg text-xs font-mono font-bold text-left
                  ${isEnabled 
                    ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                    : 'bg-slate-200 text-slate-400 border-2 border-dashed border-slate-300'}
                  hover:opacity-80 transition-all
                `}
                title={segInfo.description}
              >
                <div className="flex items-center justify-between">
                  <span>{segment}</span>
                  {isEnabled ? <CheckCircle2 size={12} /> : <X size={12} />}
                </div>
                <div className="text-[9px] font-normal mt-0.5 truncate opacity-70">
                  {segInfo.name}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>{editedPolicy.enabledSegments.length} segmentos FWB activos</span>
          <div className="flex gap-2">
            <button
              onClick={() => setEditedPolicy(prev => ({ 
                ...prev, 
                enabledSegments: allFwbSegments,
                disabledSegments: []
              }))}
              className="text-green-600 hover:underline"
            >
              Activar todos
            </button>
            <button
              onClick={() => setEditedPolicy(prev => ({ 
                ...prev, 
                enabledSegments: ['FWB', 'AWB', 'SHP', 'CNE', 'CVD', 'ISU', 'FTR'],
                disabledSegments: allFwbSegments.filter(s => !['FWB', 'AWB', 'SHP', 'CNE', 'CVD', 'ISU', 'FTR'].includes(s))
              }))}
              className="text-amber-600 hover:underline"
            >
              Solo obligatorios
            </button>
          </div>
        </div>
      </div>

      {/* Segmentos FHL */}
      <div>
        <label className="text-xs text-blue-600 font-medium block mb-2">📦 Segmentos FHL Habilitados (Houses)</label>
        <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-2 bg-blue-50 rounded-lg">
          {allFhlSegments.map(segment => {
            const enabledFhl = editedPolicy.enabledFhlSegments || allFhlSegments;
            const isEnabled = enabledFhl.includes(segment);
            const segInfo = FHL_SEGMENTS[segment];
            return (
              <button
                key={segment}
                onClick={() => toggleFhlSegment(segment)}
                className={`
                  p-2 rounded-lg text-xs font-mono font-bold text-left
                  ${isEnabled 
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                    : 'bg-slate-200 text-slate-400 border-2 border-dashed border-slate-300'}
                  hover:opacity-80 transition-all
                `}
                title={segInfo.description}
              >
                <div className="flex items-center justify-between">
                  <span>{segment}</span>
                  {isEnabled ? <CheckCircle2 size={12} /> : <X size={12} />}
                </div>
                <div className="text-[9px] font-normal mt-0.5 truncate opacity-70">
                  {segInfo.name}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>{(editedPolicy.enabledFhlSegments || allFhlSegments).length} segmentos FHL activos</span>
          <div className="flex gap-2">
            <button
              onClick={() => setEditedPolicy(prev => ({ 
                ...prev, 
                enabledFhlSegments: [...allFhlSegments],
                disabledFhlSegments: []
              }))}
              className="text-blue-600 hover:underline"
            >
              Activar todos FHL
            </button>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="text-xs text-slate-500 font-medium block mb-1">Notas</label>
        <textarea
          value={editedPolicy.notes || ''}
          onChange={(e) => setEditedPolicy(prev => ({ 
            ...prev, 
            notes: (e.target as HTMLTextAreaElement).value 
          }))}
          placeholder="Notas adicionales sobre esta política..."
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm resize-none"
          rows={2}
        />
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(editedPolicy)}
          className="px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg flex items-center gap-2"
        >
          <Save size={14} />
          Guardar Política
        </button>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: Lista de Políticas
// ============================================================

/**
 * Describe el caso de política según el número
 */
function describePolicyCase(policy: number): { case: number; option: number; description: string; color: string } {
  const policyCase = Math.floor(policy / 10);
  const policyOption = policy % 10;
  
  const caseDescriptions: Record<number, { desc: string; color: string }> = {
    2: { desc: 'FWB + FHL individuales', color: 'bg-blue-100 text-blue-700' },
    4: { desc: 'FWB_NEW + FHL individuales', color: 'bg-green-100 text-green-700' },
    5: { desc: 'FWB_NEW + FHL concatenados (&)', color: 'bg-purple-100 text-purple-700' },
    7: { desc: 'DHL/ABX (FHL con header)', color: 'bg-orange-100 text-orange-700' },
    8: { desc: 'FHL en 1 msg (MBI primera)', color: 'bg-pink-100 text-pink-700' }
  };
  
  const info = caseDescriptions[policyCase] || { desc: 'Estándar', color: 'bg-slate-100 text-slate-700' };
  
  return {
    case: policyCase,
    option: policyOption,
    description: info.desc,
    color: info.color
  };
}

interface AirlinePolicyListProps {
  policies: Record<string, AirlinePolicy>;
  onEdit: (awbPrefix: string) => void;
  onDelete: (awbPrefix: string) => void;
  onQuickUpdate: (awbPrefix: string, updates: Partial<AirlinePolicy>) => void;
}

const AirlinePolicyList: FunctionComponent<AirlinePolicyListProps> = ({ policies, onEdit, onDelete, onQuickUpdate }) => {
  const [expandedPrefix, setExpandedPrefix] = useState<string | null>(null);
  
  // Todos los segmentos disponibles
  const allFwbSegments: FwbSegmentType[] = Object.keys(FWB_SEGMENTS) as FwbSegmentType[];
  const allFhlSegments: FhlSegmentType[] = Object.keys(FHL_SEGMENTS) as FhlSegmentType[];
  
  // Ordenar políticas: primero por prefijo numérico
  const sortedPolicies = Object.entries(policies).sort(([a], [b]) => {
    if (a === 'DEFAULT') return 1;
    if (b === 'DEFAULT') return -1;
    return a.localeCompare(b);
  });
  
  // Toggle segmento FWB
  const toggleFwbSegment = (prefix: string, segment: FwbSegmentType) => {
    const policy = policies[prefix];
    const isEnabled = policy.enabledSegments.includes(segment);
    
    if (isEnabled) {
      onQuickUpdate(prefix, {
        enabledSegments: policy.enabledSegments.filter(s => s !== segment),
        disabledSegments: [...policy.disabledSegments, segment]
      });
    } else {
      onQuickUpdate(prefix, {
        enabledSegments: [...policy.enabledSegments, segment],
        disabledSegments: policy.disabledSegments.filter(s => s !== segment)
      });
    }
  };

  // Toggle segmento FHL
  const toggleFhlSegment = (prefix: string, segment: FhlSegmentType) => {
    const policy = policies[prefix];
    const enabledFhl = policy.enabledFhlSegments || allFhlSegments;
    const disabledFhl = policy.disabledFhlSegments || [];
    const isEnabled = enabledFhl.includes(segment);
    
    if (isEnabled) {
      onQuickUpdate(prefix, {
        enabledFhlSegments: enabledFhl.filter(s => s !== segment),
        disabledFhlSegments: [...disabledFhl, segment]
      });
    } else {
      onQuickUpdate(prefix, {
        enabledFhlSegments: [...enabledFhl, segment],
        disabledFhlSegments: disabledFhl.filter(s => s !== segment)
      });
    }
  };
  
  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {sortedPolicies.map(([prefix, policy]) => {
        const caseInfo = describePolicyCase(policy.policy);
        const isExpanded = expandedPrefix === prefix;
        
        return (
          <div 
            key={prefix}
            className={`
              rounded-lg border overflow-hidden transition-all
              ${prefix === 'DEFAULT' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}
              ${isExpanded ? 'ring-2 ring-purple-400' : ''}
            `}
          >
            {/* Header - Clickeable para expandir */}
            <div 
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50"
              onClick={() => setExpandedPrefix(isExpanded ? null : prefix)}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-lg text-slate-700 w-12">{prefix}</span>
                <div>
                  <div className="font-medium text-slate-800 flex items-center gap-2">
                    {policy.name}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${caseInfo.color}`}>
                      Caso {caseInfo.case}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{policy.fwbVersion}</span>
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{policy.fhlVersion}</span>
                    <span className={policy.includeUnbUnz ? 'text-green-600' : 'text-orange-600'}>
                      {policy.includeUnbUnz ? '✓ UNB/UNZ' : '✗ Sin UNB'}
                    </span>
                    <span className="text-purple-600 font-medium">SPH: {policy.defaultSphCodes.join(', ')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {policy.fhlAlwaysWithHeader && (
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    FHL+Header
                  </span>
                )}
                <ChevronDown 
                  size={18} 
                  className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
            
            {/* Contenido expandido */}
            {isExpanded && (
              <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-4">
                
                {/* ========== SECCIÓN: Política de Caso ========== */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <label className="text-xs text-amber-700 font-bold block mb-2">
                    🔧 Política de Generación de Mensajes
                  </label>
                  <select
                    value={policy.policy || 20}
                    onChange={(e) => {
                      e.stopPropagation();
                      onQuickUpdate(prefix, { 
                        policy: parseInt((e.target as HTMLSelectElement).value) as AirlinePolicy['policy']
                      });
                    }}
                    className="w-full border border-amber-300 rounded px-3 py-2 text-sm bg-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <optgroup label="📦 Consolidados">
                      <option value={20}>Caso 2: FWB estándar + FHL individuales</option>
                      <option value={40}>Caso 4: FWB_NEW + FHL individuales</option>
                      <option value={50}>Caso 5: FWB_NEW + FHL concatenadas (&amp;)</option>
                      <option value={70}>Caso 7: DHL/ABX - FHL con header EDIFACT</option>
                      <option value={80}>Caso 8: Todas FHL en 1 mensaje (MBI solo primera)</option>
                    </optgroup>
                    <optgroup label="📄 Directos">
                      <option value={21}>Caso 2: FWB estándar (directo)</option>
                      <option value={41}>Caso 4: FWB_NEW (directo)</option>
                      <option value={51}>Caso 5: FWB_NEW directo</option>
                      <option value={71}>Caso 7: DHL/ABX directo</option>
                      <option value={81}>Caso 8: MBI only first (directo)</option>
                    </optgroup>
                  </select>
                  <p className="text-[10px] text-amber-600 mt-1 italic">
                    {caseInfo.description}
                  </p>
                </div>

                {/* ========== SECCIÓN: Versiones y Opciones ========== */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 font-medium block mb-1">Versión FWB</label>
                    <select
                      value={policy.fwbVersion}
                      onChange={(e) => {
                        e.stopPropagation();
                        onQuickUpdate(prefix, { 
                          fwbVersion: (e.target as HTMLSelectElement).value as FwbVersion 
                        });
                      }}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="FWB/9">FWB/9</option>
                      <option value="FWB/16">FWB/16</option>
                      <option value="FWB/17">FWB/17</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium block mb-1">Versión FHL</label>
                    <select
                      value={policy.fhlVersion}
                      onChange={(e) => {
                        e.stopPropagation();
                        onQuickUpdate(prefix, { 
                          fhlVersion: (e.target as HTMLSelectElement).value as FhlVersion 
                        });
                      }}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="FHL/2">FHL/2</option>
                      <option value="FHL/4">FHL/4</option>
                    </select>
                  </div>
                </div>

                {/* ========== SECCIÓN: Toggles de Opciones ========== */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onQuickUpdate(prefix, { includeUnbUnz: !policy.includeUnbUnz }); 
                    }}
                    className={`flex items-center justify-between p-2 rounded border text-xs ${
                      policy.includeUnbUnz 
                        ? 'bg-green-50 border-green-300 text-green-700' 
                        : 'bg-slate-50 border-slate-300 text-slate-500'
                    }`}
                  >
                    <span>UNB/UNZ (Header)</span>
                    {policy.includeUnbUnz ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onQuickUpdate(prefix, { 
                        ociFormat: policy.ociFormat === 'withPrefix' ? 'withoutPrefix' : 'withPrefix' 
                      }); 
                    }}
                    className={`flex items-center justify-between p-2 rounded border text-xs ${
                      policy.ociFormat === 'withPrefix' 
                        ? 'bg-green-50 border-green-300 text-green-700' 
                        : 'bg-slate-50 border-slate-300 text-slate-500'
                    }`}
                  >
                    <span>OCI con EORI</span>
                    {policy.ociFormat === 'withPrefix' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onQuickUpdate(prefix, { fhlAlwaysWithHeader: !policy.fhlAlwaysWithHeader }); 
                    }}
                    className={`flex items-center justify-between p-2 rounded border text-xs ${
                      policy.fhlAlwaysWithHeader 
                        ? 'bg-orange-50 border-orange-300 text-orange-700' 
                        : 'bg-slate-50 border-slate-300 text-slate-500'
                    }`}
                  >
                    <span>FHL con Header (Caso 7)</span>
                    {policy.fhlAlwaysWithHeader ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onQuickUpdate(prefix, { requiresChinaPostalCode: !policy.requiresChinaPostalCode }); 
                    }}
                    className={`flex items-center justify-between p-2 rounded border text-xs ${
                      policy.requiresChinaPostalCode 
                        ? 'bg-red-50 border-red-300 text-red-700' 
                        : 'bg-slate-50 border-slate-300 text-slate-500'
                    }`}
                  >
                    <span>Postal China 170452</span>
                    {policy.requiresChinaPostalCode ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </div>
                
                {/* ========== SECCIÓN: Segmentos FWB ========== */}
                <div>
                  <label className="text-xs text-purple-700 font-bold block mb-2">
                    📋 Segmentos FWB (click para activar/desactivar):
                  </label>
                  <div className="grid grid-cols-6 gap-1">
                    {allFwbSegments.map(seg => {
                      const isEnabled = policy.enabledSegments.includes(seg);
                      return (
                        <button
                          key={seg}
                          onClick={(e) => { e.stopPropagation(); toggleFwbSegment(prefix, seg); }}
                          className={`
                            p-1.5 rounded text-xs font-mono font-bold text-center transition-all
                            ${isEnabled 
                              ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200' 
                              : 'bg-red-50 text-red-400 border border-red-200 line-through hover:bg-red-100'}
                          `}
                          title={FWB_SEGMENTS[seg]?.name || seg}
                        >
                          {seg}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                    <span className="text-green-600">✓ {policy.enabledSegments.length} FWB activos</span>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickUpdate(prefix, { 
                            enabledSegments: [...allFwbSegments],
                            disabledSegments: []
                          });
                        }}
                        className="text-green-600 hover:underline"
                      >
                        Todos
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const minimal = ['FWB', 'AWB', 'SHP', 'CNE', 'CVD', 'ISU', 'FTR'] as FwbSegmentType[];
                          onQuickUpdate(prefix, { 
                            enabledSegments: minimal,
                            disabledSegments: allFwbSegments.filter(s => !minimal.includes(s))
                          });
                        }}
                        className="text-amber-600 hover:underline"
                      >
                        Mínimos
                      </button>
                    </div>
                  </div>
                </div>

                {/* ========== SECCIÓN: Segmentos FHL ========== */}
                <div>
                  <label className="text-xs text-blue-700 font-bold block mb-2">
                    📦 Segmentos FHL (Houses - click para activar/desactivar):
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {allFhlSegments.map(seg => {
                      const enabledFhl = policy.enabledFhlSegments || allFhlSegments;
                      const isEnabled = enabledFhl.includes(seg);
                      return (
                        <button
                          key={seg}
                          onClick={(e) => { e.stopPropagation(); toggleFhlSegment(prefix, seg); }}
                          className={`
                            p-1.5 rounded text-xs font-mono font-bold text-center transition-all
                            ${isEnabled 
                              ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200' 
                              : 'bg-red-50 text-red-400 border border-red-200 line-through hover:bg-red-100'}
                          `}
                          title={FHL_SEGMENTS[seg]?.name || seg}
                        >
                          {seg}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                    <span className="text-blue-600">✓ {(policy.enabledFhlSegments || allFhlSegments).length} FHL activos</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickUpdate(prefix, { 
                          enabledFhlSegments: [...allFhlSegments],
                          disabledFhlSegments: []
                        });
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Todos FHL
                    </button>
                  </div>
                </div>
                
                {/* Notas */}
                {policy.notes && (
                  <div className="p-2 bg-amber-50 rounded border border-amber-200">
                    <span className="text-xs text-amber-700">{policy.notes}</span>
                  </div>
                )}
                
                {/* Botones de acción */}
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(prefix); }}
                    className="px-3 py-1.5 text-purple-600 hover:bg-purple-50 rounded text-sm flex items-center gap-1"
                  >
                    <Edit3 size={14} /> Editor avanzado
                  </button>
                  {prefix !== 'DEFAULT' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(prefix); }}
                      className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

interface CargoImpPolicyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CargoImpPolicyPanel: FunctionComponent<CargoImpPolicyPanelProps> = ({ isOpen, onClose }) => {
  const [policies, setPolicies] = useState<Record<string, AirlinePolicy>>(loadPolicies());
  const [globalConfig, setGlobalConfig] = useState<CargoImpGlobalConfig>(loadGlobalConfig());
  const [editingPrefix, setEditingPrefix] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAwbPrefix, setNewAwbPrefix] = useState('');
  const [newAirlineName, setNewAirlineName] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'policies' | 'global'>('policies');

  useEffect(() => {
    if (isOpen) {
      setPolicies(loadPolicies());
      setGlobalConfig(loadGlobalConfig());
    }
  }, [isOpen]);

  const handleSaveGlobalConfig = useCallback(() => {
    saveGlobalConfig(globalConfig);
    setSaveMessage({ type: 'success', text: 'Configuración global guardada' });
    setTimeout(() => setSaveMessage(null), 3000);
  }, [globalConfig]);

  const handleSavePolicy = useCallback((policy: AirlinePolicy) => {
    const updated = { ...policies, [policy.awbPrefix]: policy };
    setPolicies(updated);
    savePolicies(updated);
    setEditingPrefix(null);
    setSaveMessage({ type: 'success', text: `Política ${policy.name} guardada` });
    setTimeout(() => setSaveMessage(null), 3000);
  }, [policies]);

  const handleDeletePolicy = useCallback((awbPrefix: string) => {
    if (awbPrefix === 'DEFAULT') return;
    const updated = { ...policies };
    delete updated[awbPrefix];
    setPolicies(updated);
    savePolicies(updated);
    setSaveMessage({ type: 'success', text: 'Política eliminada' });
    setTimeout(() => setSaveMessage(null), 3000);
  }, [policies]);

  // Handler para actualizaciones rápidas desde la lista expandida
  const handleQuickUpdate = useCallback((awbPrefix: string, updates: Partial<AirlinePolicy>) => {
    const currentPolicy = policies[awbPrefix];
    if (!currentPolicy) return;
    
    const updatedPolicy = { ...currentPolicy, ...updates };
    const updated = { ...policies, [awbPrefix]: updatedPolicy };
    setPolicies(updated);
    savePolicies(updated);
  }, [policies]);

  const handleAddNew = () => {
    if (newAwbPrefix.length === 3 && newAirlineName && !policies[newAwbPrefix]) {
      const newPolicy: AirlinePolicy = {
        ...DEFAULT_AIRLINE_POLICIES['DEFAULT'],
        awbPrefix: newAwbPrefix,
        name: newAirlineName
      };
      const updated = { ...policies, [newAwbPrefix]: newPolicy };
      setPolicies(updated);
      savePolicies(updated);
      setNewAwbPrefix('');
      setNewAirlineName('');
      setIsAddingNew(false);
      setEditingPrefix(newAwbPrefix);
    }
  };

  // Sincronizar con las políticas predefinidas (actualiza nombres y configuraciones base)
  const handleSyncWithDefaults = () => {
    const synced: Record<string, AirlinePolicy> = { ...DEFAULT_AIRLINE_POLICIES };
    
    // Mantener las personalizaciones del usuario para aerolíneas que no están en DEFAULT
    for (const [prefix, policy] of Object.entries(policies)) {
      if (!DEFAULT_AIRLINE_POLICIES[prefix]) {
        // Es una aerolínea personalizada del usuario, mantenerla
        synced[prefix] = policy;
      }
      // Las que están en DEFAULT se sobrescriben con los valores actualizados
    }
    
    setPolicies(synced);
    savePolicies(synced);
    setSaveMessage({ type: 'success', text: 'Políticas sincronizadas con valores predefinidos actualizados' });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_GLOBAL);
    setPolicies({ ...DEFAULT_AIRLINE_POLICIES });
    setGlobalConfig({ ...DEFAULT_GLOBAL_CONFIG });
    setSaveMessage({ type: 'success', text: 'Políticas y configuración restauradas a valores por defecto' });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-indigo-300 bg-indigo-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/30 p-2 rounded-lg">
              <FileText size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Configuración CARGO-IMP (EDI)</h2>
              <p className="text-sm text-indigo-200">Sender IDs, códigos postales y políticas por aerolínea</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('global')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'global'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              ⚙️ Configuración Global
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'policies'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              ✈️ Políticas por Aerolínea
            </button>
          </div>
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

          {/* TAB: Configuración Global */}
          {activeTab === 'global' && (
            <div className="space-y-6">
              {/* Sender IDs */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                  📡 Sender IDs (Identificadores EDIFACT)
                </h3>
                <div className="space-y-4">
                  {/* Ecuador */}
                  <div className="bg-white p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🇪🇨</span>
                      <span className="font-medium text-slate-700">Ecuador</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Sender ID Normal</label>
                        <input
                          type="text"
                          value={globalConfig.senderIds.EC.senderId}
                          onChange={(e) => setGlobalConfig(prev => ({
                            ...prev,
                            senderIds: {
                              ...prev.senderIds,
                              EC: { ...prev.senderIds.EC, senderId: (e.target as HTMLInputElement).value }
                            }
                          }))}
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                          placeholder="REUAGT89ECRGML/UIO01:PIMA"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Sender ID DESCARTES</label>
                        <input
                          type="text"
                          value={globalConfig.senderIds.EC.senderIdDescartes}
                          onChange={(e) => setGlobalConfig(prev => ({
                            ...prev,
                            senderIds: {
                              ...prev.senderIds,
                              EC: { ...prev.senderIds.EC, senderIdDescartes: (e.target as HTMLInputElement).value }
                            }
                          }))}
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                          placeholder="TDVAGT03DSV/BOG01:PIMA"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Colombia */}
                  <div className="bg-white p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🇨🇴</span>
                      <span className="font-medium text-slate-700">Colombia</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Sender ID Normal</label>
                        <input
                          type="text"
                          value={globalConfig.senderIds.CO.senderId}
                          onChange={(e) => setGlobalConfig(prev => ({
                            ...prev,
                            senderIds: {
                              ...prev.senderIds,
                              CO: { ...prev.senderIds.CO, senderId: (e.target as HTMLInputElement).value }
                            }
                          }))}
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                          placeholder="REUAGT89COCRGMASTER/BOG01:PIMA"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Sender ID DESCARTES</label>
                        <input
                          type="text"
                          value={globalConfig.senderIds.CO.senderIdDescartes}
                          onChange={(e) => setGlobalConfig(prev => ({
                            ...prev,
                            senderIds: {
                              ...prev.senderIds,
                              CO: { ...prev.senderIds.CO, senderIdDescartes: (e.target as HTMLInputElement).value }
                            }
                          }))}
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                          placeholder="TDVAGT03DSV/BOG01:PIMA"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Códigos Postales por Defecto */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
                  📮 Códigos Postales por Defecto
                </h3>
                <p className="text-xs text-amber-700 mb-3">
                  Cuando el shipper no tiene código postal, se usa el valor por defecto según el país de origen.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">🇪🇨 Ecuador</label>
                    <input
                      type="text"
                      value={globalConfig.defaultPostalCodes.EC}
                      onChange={(e) => setGlobalConfig(prev => ({
                        ...prev,
                        defaultPostalCodes: {
                          ...prev.defaultPostalCodes,
                          EC: (e.target as HTMLInputElement).value
                        }
                      }))}
                      className="w-full border border-amber-300 rounded px-3 py-2 text-sm font-mono bg-white"
                      placeholder="00000"
                      maxLength={9}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">🇨🇴 Colombia</label>
                    <input
                      type="text"
                      value={globalConfig.defaultPostalCodes.CO}
                      onChange={(e) => setGlobalConfig(prev => ({
                        ...prev,
                        defaultPostalCodes: {
                          ...prev.defaultPostalCodes,
                          CO: (e.target as HTMLInputElement).value
                        }
                      }))}
                      className="w-full border border-amber-300 rounded px-3 py-2 text-sm font-mono bg-white"
                      placeholder="110111"
                      maxLength={9}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">🌍 Otros países</label>
                    <input
                      type="text"
                      value={globalConfig.defaultPostalCodes.DEFAULT}
                      onChange={(e) => setGlobalConfig(prev => ({
                        ...prev,
                        defaultPostalCodes: {
                          ...prev.defaultPostalCodes,
                          DEFAULT: (e.target as HTMLInputElement).value
                        }
                      }))}
                      className="w-full border border-amber-300 rounded px-3 py-2 text-sm font-mono bg-white"
                      placeholder="10"
                      maxLength={9}
                    />
                  </div>
                </div>
              </div>

              {/* Código postal especial China */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  🇨🇳 Código Postal Especial Ecuador → China
                </h3>
                <p className="text-xs text-red-700 mb-3">
                  Para envíos desde Ecuador a China (AWB 176 - Air China), se usa este código postal fijo.
                </p>
                <input
                  type="text"
                  value={globalConfig.chinaPostalCode}
                  onChange={(e) => setGlobalConfig(prev => ({
                    ...prev,
                    chinaPostalCode: (e.target as HTMLInputElement).value
                  }))}
                  className="w-full max-w-xs border border-red-300 rounded px-3 py-2 text-sm font-mono bg-white"
                  placeholder="170452"
                  maxLength={9}
                />
              </div>

              {/* Info ACC */}
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                  ℹ️ Nota sobre segmento ACC (Accounting Information)
                </h3>
                <p className="text-sm text-slate-600">
                  El segmento ACC <strong>no viene del backend de Traxon</strong> en el JSON. Este campo estaba en el sistema legacy 
                  pero actualmente no se transmite en los datos del shipment. Si necesitas incluirlo, deberías 
                  agregarlo manualmente en el campo <code className="bg-slate-200 px-1 rounded">specialServiceRequest</code> 
                  o solicitar que se agregue al esquema del backend.
                </p>
              </div>

              {/* Botón guardar */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={handleSaveGlobalConfig}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
                >
                  <Save size={16} />
                  Guardar Configuración Global
                </button>
              </div>
            </div>
          )}

          {/* TAB: Políticas por Aerolínea */}
          {activeTab === 'policies' && (
            <>
              {/* Modo edición de política */}
              {editingPrefix && policies[editingPrefix] ? (
                <PolicyEditor
                  policy={policies[editingPrefix]}
                  onSave={handleSavePolicy}
                  onCancel={() => setEditingPrefix(null)}
                />
              ) : (
                <>
                  {/* Info */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="text-indigo-600 mt-0.5 flex-shrink-0" size={18} />
                  <div className="text-sm text-indigo-800">
                    <p className="font-semibold mb-1">📋 Configuración por Aerolínea</p>
                    <p className="text-indigo-700">
                      Define qué segmentos incluir en los mensajes FWB/FHL según el prefijo AWB de cada aerolínea.
                      Los segmentos no habilitados aparecerán en gris pero no se incluirán en el mensaje final.
                    </p>
                  </div>
                </div>
              </div>

              {/* Agregar nueva */}
              {isAddingNew ? (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-700 mb-3">Nueva Política de Aerolínea</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 font-medium block mb-1">Prefijo AWB (3 dígitos)</label>
                      <input
                        type="text"
                        value={newAwbPrefix}
                        onChange={(e) => setNewAwbPrefix((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="075"
                        className="w-full border border-slate-300 rounded px-3 py-2 font-mono"
                        maxLength={3}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-slate-500 font-medium block mb-1">Nombre Aerolínea</label>
                      <input
                        type="text"
                        value={newAirlineName}
                        onChange={(e) => setNewAirlineName((e.target as HTMLInputElement).value)}
                        placeholder="Iberia"
                        className="w-full border border-slate-300 rounded px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => { setIsAddingNew(false); setNewAwbPrefix(''); setNewAirlineName(''); }}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddNew}
                      disabled={newAwbPrefix.length !== 3 || !newAirlineName || !!policies[newAwbPrefix]}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded disabled:opacity-50 flex items-center gap-1"
                    >
                      <Plus size={14} /> Crear
                    </button>
                  </div>
                  {policies[newAwbPrefix] && (
                    <p className="text-xs text-red-500 mt-2">Ya existe una política para este prefijo</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="w-full p-3 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Agregar Nueva Aerolínea
                </button>
              )}

              {/* Lista de políticas */}
              <AirlinePolicyList
                policies={policies}
                onEdit={(prefix) => setEditingPrefix(prefix)}
                onDelete={handleDeletePolicy}
                onQuickUpdate={handleQuickUpdate}
              />

              {/* Acciones */}
              <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    <button
                      onClick={handleSyncWithDefaults}
                      className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                      title="Actualiza las aerolíneas predefinidas con los valores más recientes (992=DHL, etc.)"
                    >
                      🔄 Sincronizar predefinidas
                    </button>
                    <button
                      onClick={handleResetToDefaults}
                      className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
                    >
                      ⚠️ Restaurar todo
                    </button>
                  </div>
                  <div className="text-xs text-slate-400">
                    {Object.keys(policies).length} políticas configuradas
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  💡 "Sincronizar predefinidas" actualiza 992=DHL, 999=Polar Air, etc. sin borrar tus personalizaciones.
                </p>
              </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CargoImpPolicyPanel;
