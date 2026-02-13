/**
 * ============================================================
 * AWB VIEW COMPONENT (Modal Compacto + Transmitir Directo)
 * ============================================================
 * Vista compacta tipo modal para visualizar AWB y transmitir EDI.
 * 
 * Modos de operación:
 * - 'review': Botón "Revisar y Enviar" abre el ChampModal completo.
 * - 'transmit': (DEFAULT) Vista compacta con botón "Transmitir" directo.
 *    Incluye badge "Ver EDI" para previsualizar mensajes FWB/FHL.
 *    Al transmitir: valida → si hay errores los muestra → si no, envía.
 * 
 * Se muestra como modal (backdrop + card centrada) para producción.
 * ============================================================
 */

import { FunctionComponent, JSX, Fragment } from 'preact';
import { useState, useCallback, useMemo, useEffect } from 'preact/hooks';
import { InternalShipment, ShipmentStatus, InternalHouseBill } from '../types';
import { 
  Plane, Package, MapPin, Building, User, Scale, Layers, 
  Send, ChevronRight, ChevronDown, X, Calendar, Clock, FileText, 
  ArrowRight, Briefcase, ShieldCheck, DollarSign,
  Code, AlertTriangle, CheckCircle2, Loader2, Eye, XCircle, Terminal
} from 'lucide-preact';
import { cargoImpService } from '../services/providers';
import { validateCargoImpMessage, FwbValidationResult } from '../services/providers/cargoimp/cargoImpValidator';
import { GeneratedCargoImpMessage } from '../services/providers/cargoimp/cargoImpTypes';
import { DescartesTransmitService, BundleTransmissionResult } from '../services/descartesTransmitService';

/**
 * Modo de operación:
 * - 'review': Botón "Revisar y Enviar" → abre modal completo (ChampModal).
 * - 'transmit': (DEFAULT) Botón "Transmitir" → envía EDI directo.
 */
export type FullScreenViewMode = 'review' | 'transmit';

interface FullScreenAwbViewProps {
  shipment: InternalShipment;
  onOpenModal: () => void;
  onClose: () => void;
  getStatusBadge?: (status: ShipmentStatus) => JSX.Element;
  mode?: FullScreenViewMode;
  onTransmitSuccess?: (shipmentId: string, summary: string) => void;
  /** Rol del usuario: solo 'ADM' ve el botón "Editor Completo" */
  userRole?: string;
}

// ============================================================
// Badge de status compacto
// ============================================================
const StatusBadge: FunctionComponent<{ status: ShipmentStatus }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', label: 'Draft' },
    TRANSMITTED: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', label: 'Pending' },
    ACKNOWLEDGED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'Confirmed' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Rejected' }
  };
  const c = config[status] || config.DRAFT;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <FileText size={10} className="mr-1" />
      {c.label}
    </span>
  );
};

// ============================================================
// EDI Preview Panel (slide-in lateral)
// ============================================================

// --- Types for Smart Validation Summary ---
interface FhlValidationEntry {
  hawbNumber: string;
  validation: FwbValidationResult;
}

interface ActorIssueGroup {
  actorName: string;
  actorType: 'shipper' | 'consignee';
  hawbNumbers: string[];
  errorCount: number;
  warningCount: number;
  uniqueIssues: { message: string; severity: string; segment: string; suggestion?: string; count: number }[];
}

// --- Sub-component: Actor Group Card (Importador/Exportador con issues) ---
const ActorGroupCard: FunctionComponent<{ group: ActorIssueGroup }> = ({ group }) => {
  const [expanded, setExpanded] = useState(false);
  const hasErrors = group.errorCount > 0;

  return (
    <div className={`rounded-lg border ${hasErrors ? 'border-red-200 bg-red-50/70' : 'border-amber-200 bg-amber-50/70'} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2.5 flex items-center gap-2 hover:bg-black/5 transition-colors text-left"
      >
        <div className={`p-1.5 rounded-lg ${group.actorType === 'consignee' ? 'bg-purple-100 text-purple-600' : 'bg-sky-100 text-sky-600'}`}>
          {group.actorType === 'consignee' ? <User size={12} /> : <Building size={12} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 text-xs truncate">{group.actorName}</div>
          <div className="text-[10px] text-slate-500">
            {group.hawbNumbers.length} house{group.hawbNumbers.length > 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {group.errorCount > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-200 text-red-800 rounded-full">
              {group.errorCount} err
            </span>
          )}
          {group.warningCount > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-200 text-amber-800 rounded-full">
              {group.warningCount} warn
            </span>
          )}
        </div>
        {expanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 space-y-1.5 border-t border-white/60">
          <div className="text-[10px] text-slate-500 pt-1.5 pb-0.5 flex flex-wrap gap-1">
            <span className="font-medium">Houses:</span>
            {group.hawbNumbers.map((h, i) => (
              <span key={i} className="font-mono bg-white/60 px-1 rounded text-[9px]">{h}</span>
            ))}
          </div>
          {group.uniqueIssues.map((issue, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-1.5 text-[11px] rounded-md p-1.5 ${
                issue.severity === 'error' ? 'bg-red-100/60 text-red-700' : 'bg-amber-100/60 text-amber-700'
              }`}
            >
              {issue.severity === 'error'
                ? <XCircle size={11} className="flex-shrink-0 mt-0.5" />
                : <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <span className="font-semibold">[{issue.segment}]</span> {issue.message}
                {issue.count > 1 && (
                  <span className="text-[9px] opacity-70 ml-1">(×{issue.count} houses)</span>
                )}
                {issue.suggestion && (
                  <div className="text-[9px] opacity-70 mt-0.5">💡 {issue.suggestion}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Sub-component: FHL Detail Card (per house, for Detalle tab) ---
const FhlDetailCard: FunctionComponent<{
  entry: FhlValidationEntry;
  index: number;
  houseBills?: InternalHouseBill[];
  forceExpand?: boolean;
}> = ({ entry, index, houseBills, forceExpand }) => {
  const [expanded, setExpanded] = useState(false);
  // Sync with parent control
  useEffect(() => { if (forceExpand !== undefined) setExpanded(forceExpand); }, [forceExpand]);
  const house = houseBills?.find(h => h.hawbNumber === entry.hawbNumber);
  const hasErrors = entry.validation.totalErrors > 0;
  const hasWarnings = entry.validation.totalWarnings > 0;

  return (
    <div className={`rounded-lg border ${
      hasErrors ? 'border-red-200 bg-red-50' 
        : hasWarnings ? 'border-amber-200 bg-amber-50' 
        : 'border-green-200 bg-green-50'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2 flex items-center gap-2 hover:bg-black/5 transition-colors text-left"
      >
        <span className="bg-purple-100 text-purple-600 font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-mono text-xs text-slate-700 font-medium">{entry.hawbNumber}</span>
          {house && <span className="text-[10px] text-slate-400 ml-1.5">→ {house.consigneeName}</span>}
        </div>
        <div className="flex items-center gap-1">
          {hasErrors && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded-full">
              {entry.validation.totalErrors} err
            </span>
          )}
          {hasWarnings && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-full">
              {entry.validation.totalWarnings} warn
            </span>
          )}
          {!hasErrors && !hasWarnings && <CheckCircle2 size={12} className="text-green-500" />}
        </div>
        {expanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
      </button>
      {expanded && entry.validation.allIssues.length > 0 && (
        <div className="px-2 pb-2 space-y-1 border-t border-white/50">
          {entry.validation.allIssues
            .filter(i => i.severity !== 'info')
            .map((issue, idx) => (
              <div
                key={idx}
                className={`rounded-md p-1.5 text-[11px] flex items-start gap-1.5 ${
                  issue.severity === 'error' ? 'bg-red-100/50 text-red-700' : 'bg-amber-100/50 text-amber-700'
                }`}
              >
                {issue.severity === 'error'
                  ? <XCircle size={10} className="flex-shrink-0 mt-0.5" />
                  : <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">[{issue.segment}]</span> {issue.message}
                  {issue.suggestion && <div className="text-[9px] text-slate-400 mt-0.5">💡 {issue.suggestion}</div>}
                </div>
              </div>
            ))}
          {entry.validation.allIssues.filter(i => i.severity !== 'info').length === 0 && (
            <div className="text-[10px] text-green-600 flex items-center gap-1 px-1 py-1">
              <CheckCircle2 size={10} /> Solo información / Sin errores
            </div>
          )}
        </div>
      )}
      {expanded && entry.validation.allIssues.length === 0 && (
        <div className="px-3 pb-2 text-[10px] text-green-600 flex items-center gap-1 border-t border-white/50 pt-1">
          <CheckCircle2 size={10} /> Sin errores ni advertencias
        </div>
      )}
    </div>
  );
};
interface EdiPreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fwbMessage: GeneratedCargoImpMessage | null;
  fhlMessages: GeneratedCargoImpMessage[];
  concatenatedFhl?: string;
  validation: FwbValidationResult | null;
  /** FHL validations per house (for smart summary) */
  fhlValidations: FhlValidationEntry[];
  /** House bills data for actor grouping */
  houseBills?: InternalHouseBill[];
}

const EdiPreviewPanel: FunctionComponent<EdiPreviewPanelProps> = ({
  isOpen, onClose, fwbMessage, fhlMessages, concatenatedFhl, validation,
  fhlValidations, houseBills
}) => {
  const [activeTab, setActiveTab] = useState<'fwb' | 'fhl' | 'resumen' | 'detalle'>('fwb');
  const [copiedFwb, setCopiedFwb] = useState(false);
  const [copiedFhl, setCopiedFhl] = useState(false);
  const [expandedFhls, setExpandedFhls] = useState<Record<number, boolean>>({});

  const toggleFhl = useCallback((idx: number) => {
    setExpandedFhls(prev => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const handleCopy = useCallback((text: string, type: 'fwb' | 'fhl') => {
    navigator.clipboard.writeText(text);
    if (type === 'fwb') { setCopiedFwb(true); setTimeout(() => setCopiedFwb(false), 2000); }
    else { setCopiedFhl(true); setTimeout(() => setCopiedFhl(false), 2000); }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-purple-600" />
            <h3 className="font-bold text-slate-800 text-sm">EDI Preview</h3>
            <span className="text-[10px] text-slate-400 font-mono">CARGO-IMP</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5 bg-white">
          <button onClick={() => setActiveTab('fwb')} className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'fwb' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            FWB/16
          </button>
          {(fhlMessages.length > 0 || concatenatedFhl) && (
            <button onClick={() => setActiveTab('fhl')} className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'fhl' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              FHL ({fhlMessages.length})
            </button>
          )}
          {validation && (
            <button onClick={() => setActiveTab('resumen')} className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'resumen' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              Resumen
              {(() => {
                const totalErr = (validation.totalErrors || 0) + fhlValidations.reduce((s, f) => s + f.validation.totalErrors, 0);
                const totalWarn = (validation.totalWarnings || 0) + fhlValidations.reduce((s, f) => s + f.validation.totalWarnings, 0);
                if (totalErr > 0) return <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalErr}</span>;
                if (totalWarn > 0) return <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalWarn}</span>;
                return <CheckCircle2 size={10} className="text-green-500" />;
              })()}
            </button>
          )}
          {validation && (
            <button onClick={() => setActiveTab('detalle')} className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'detalle' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              Detalle
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'fwb' && fwbMessage && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-mono">AWB: {fwbMessage.awbNumber}</span>
                <button onClick={() => handleCopy(fwbMessage.fullMessage, 'fwb')} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${copiedFwb ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {copiedFwb ? <><CheckCircle2 size={10} /> Copiado</> : <><Code size={10} /> Copiar FWB</>}
                </button>
              </div>
              <pre className="bg-slate-900 text-green-400 p-3 rounded-lg text-[11px] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed border border-slate-700">{fwbMessage.fullMessage}</pre>
            </div>
          )}

          {activeTab === 'fhl' && (
            <div className="p-4 space-y-2">
              {concatenatedFhl ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-mono">FHL Concatenado</span>
                    <button onClick={() => handleCopy(concatenatedFhl, 'fhl')} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${copiedFhl ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {copiedFhl ? <><CheckCircle2 size={10} /> Copiado</> : <><Code size={10} /> Copiar</>}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-cyan-400 p-3 rounded-lg text-[11px] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed border border-slate-700">{concatenatedFhl}</pre>
                </div>
              ) : fhlMessages.map((fhl, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleFhl(idx)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-600 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{idx + 1}</span>
                      <span className="text-[10px] text-slate-600 font-mono font-medium">{fhl.hawbNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleCopy(fhl.fullMessage, 'fhl'); }} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-400 hover:bg-slate-200 transition-colors">
                        <Code size={9} /> Copiar
                      </button>
                      <ChevronDown
                        size={12}
                        className={`text-slate-400 transition-transform duration-200 ${expandedFhls[idx] ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {expandedFhls[idx] && (
                    <div className="px-3 pb-3 pt-2">
                      <pre className="bg-slate-900 text-cyan-400 p-2 rounded-lg text-[10px] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed border border-slate-700">{fhl.fullMessage}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ========== RESUMEN TAB (Smart Grouped Summary) ========== */}
          {activeTab === 'resumen' && validation && (() => {
            // ---------- Smart Summary Computation ----------
            const fwbErrors = validation.allIssues.filter(i => i.severity === 'error');
            const fwbWarnings = validation.allIssues.filter(i => i.severity === 'warning');

            // Group FHL issues by consignee and shipper
            const consigneeMap = new Map<string, ActorIssueGroup>();
            const shipperMap = new Map<string, ActorIssueGroup>();
            let totalFhlErrors = 0;
            let totalFhlWarnings = 0;
            let housesWithErrors = 0;
            let housesClean = 0;

            fhlValidations.forEach(entry => {
              const house = houseBills?.find(h => h.hawbNumber === entry.hawbNumber);
              const shipperName = house?.shipperName || house?.shipper?.name || 'Exportador Desconocido';
              const consigneeName = house?.consigneeName || house?.consignee?.name || 'Importador Desconocido';
              const hasErr = entry.validation.totalErrors > 0;
              const hasWarn = entry.validation.totalWarnings > 0;

              if (hasErr) housesWithErrors++;
              else if (!hasWarn) housesClean++;
              totalFhlErrors += entry.validation.totalErrors;
              totalFhlWarnings += entry.validation.totalWarnings;

              // Group by consignee (importer)
              if (hasErr || hasWarn) {
                if (!consigneeMap.has(consigneeName)) {
                  consigneeMap.set(consigneeName, {
                    actorName: consigneeName, actorType: 'consignee',
                    hawbNumbers: [], errorCount: 0, warningCount: 0, uniqueIssues: []
                  });
                }
                const cGrp = consigneeMap.get(consigneeName)!;
                cGrp.hawbNumbers.push(entry.hawbNumber);
                cGrp.errorCount += entry.validation.totalErrors;
                cGrp.warningCount += entry.validation.totalWarnings;
                entry.validation.allIssues.forEach(issue => {
                  if (issue.severity === 'info') return;
                  const ex = cGrp.uniqueIssues.find(u => u.message === issue.message && u.segment === issue.segment);
                  if (ex) ex.count++;
                  else cGrp.uniqueIssues.push({ message: issue.message, severity: issue.severity, segment: issue.segment, suggestion: issue.suggestion, count: 1 });
                });
              }

              // Group by shipper (exporter)
              if (hasErr || hasWarn) {
                if (!shipperMap.has(shipperName)) {
                  shipperMap.set(shipperName, {
                    actorName: shipperName, actorType: 'shipper',
                    hawbNumbers: [], errorCount: 0, warningCount: 0, uniqueIssues: []
                  });
                }
                const sGrp = shipperMap.get(shipperName)!;
                sGrp.hawbNumbers.push(entry.hawbNumber);
                sGrp.errorCount += entry.validation.totalErrors;
                sGrp.warningCount += entry.validation.totalWarnings;
                entry.validation.allIssues.forEach(issue => {
                  if (issue.severity === 'info') return;
                  const ex = sGrp.uniqueIssues.find(u => u.message === issue.message && u.segment === issue.segment);
                  if (ex) ex.count++;
                  else sGrp.uniqueIssues.push({ message: issue.message, severity: issue.severity, segment: issue.segment, suggestion: issue.suggestion, count: 1 });
                });
              }
            });

            // Common issues across multiple houses
            const issueCountMap = new Map<string, { message: string; severity: string; segment: string; suggestion?: string; count: number }>();
            fhlValidations.forEach(entry => {
              const seen = new Set<string>();
              entry.validation.allIssues.forEach(issue => {
                if (issue.severity === 'info') return;
                const key = `${issue.segment}|${issue.message}`;
                if (seen.has(key)) return;
                seen.add(key);
                if (!issueCountMap.has(key)) {
                  issueCountMap.set(key, { message: issue.message, severity: issue.severity, segment: issue.segment, suggestion: issue.suggestion, count: 0 });
                }
                issueCountMap.get(key)!.count++;
              });
            });
            const commonIssues = Array.from(issueCountMap.values())
              .filter(i => i.count > 1)
              .sort((a, b) => {
                if (a.severity === 'error' && b.severity !== 'error') return -1;
                if (a.severity !== 'error' && b.severity === 'error') return 1;
                return b.count - a.count;
              });

            const consigneeGroups = Array.from(consigneeMap.values()).sort((a, b) => b.errorCount - a.errorCount);
            const shipperGroups = Array.from(shipperMap.values()).sort((a, b) => b.errorCount - a.errorCount);
            const totalHouses = fhlValidations.length;

            return (
              <div className="p-4 space-y-4">
                {/* ===== STATS BAR ===== */}
                <div className={`grid ${totalHouses > 0 ? 'grid-cols-4' : 'grid-cols-2'} gap-2 text-center`}>
                  <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm">
                    <div className={`text-xl font-bold ${validation.score >= 90 ? 'text-green-600' : validation.score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{validation.score}</div>
                    <div className="text-[10px] text-slate-400">Score FWB</div>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm">
                    <div className={`text-xl font-bold ${(fwbErrors.length + totalFhlErrors) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fwbErrors.length + totalFhlErrors}
                    </div>
                    <div className="text-[10px] text-slate-400">Errores Total</div>
                  </div>
                  {totalHouses > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm">
                      <div className="text-xl font-bold text-green-600">{housesClean}</div>
                      <div className="text-[10px] text-slate-400">Houses OK</div>
                    </div>
                  )}
                  {totalHouses > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm">
                      <div className={`text-xl font-bold ${housesWithErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>{housesWithErrors}</div>
                      <div className="text-[10px] text-slate-400">Houses con Error</div>
                    </div>
                  )}
                </div>

                {/* ===== FWB CRITICAL ERRORS ===== */}
                {fwbErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle size={14} className="text-red-600" />
                      <span className="font-bold text-red-700 text-xs">FWB — Errores Críticos ({fwbErrors.length})</span>
                    </div>
                    <div className="space-y-1">
                      {fwbErrors.map((issue, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-red-700 bg-red-100/50 rounded-md p-1.5">
                          <XCircle size={11} className="flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold">[{issue.segment}]</span> {issue.message}
                            {issue.suggestion && <div className="text-[10px] text-red-500/70 mt-0.5">💡 {issue.suggestion}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FWB Warnings Summary (collapsed when only warnings) */}
                {fwbWarnings.length > 0 && fwbErrors.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span className="font-semibold text-amber-700 text-xs">FWB — {fwbWarnings.length} advertencia(s) menores</span>
                    <CheckCircle2 size={12} className="text-amber-500 ml-auto" />
                  </div>
                )}
                {fwbWarnings.length > 0 && fwbErrors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
                    <AlertTriangle size={13} className="text-amber-600" />
                    <span className="text-amber-700 text-[11px]">+ {fwbWarnings.length} advertencia(s) FWB</span>
                  </div>
                )}

                {/* FWB All Clear */}
                {fwbErrors.length === 0 && fwbWarnings.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-600" />
                    <span className="text-green-700 text-xs font-semibold">FWB — Sin errores ni advertencias ✓</span>
                  </div>
                )}

                {/* ===== FHL SECTION ===== */}
                {totalHouses > 0 && (
                  <>
                    {/* Divider */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">FHL — {totalHouses} House(s)</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* Common Issues Across Houses */}
                    {commonIssues.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={14} className="text-slate-600" />
                          <span className="font-bold text-slate-700 text-xs">Problemas Recurrentes</span>
                          <span className="text-[9px] text-slate-400">(afectan múltiples houses)</span>
                        </div>
                        <div className="space-y-1">
                          {commonIssues.slice(0, 15).map((issue, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-1.5 text-[11px] rounded-md p-1.5 ${
                                issue.severity === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}
                            >
                              {issue.severity === 'error'
                                ? <XCircle size={11} className="flex-shrink-0 mt-0.5" />
                                : <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />}
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold">[{issue.segment}]</span> {issue.message}
                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/80">
                                  {issue.count}/{totalHouses} houses
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Importadores (Consignee) con Problemas */}
                    {consigneeGroups.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User size={14} className="text-purple-600" />
                          <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                            Importadores con Problemas
                          </span>
                          <span className="text-[9px] text-slate-400">({consigneeGroups.length} importador{consigneeGroups.length > 1 ? 'es' : ''})</span>
                        </div>
                        <div className="space-y-2">
                          {consigneeGroups.map((group, idx) => (
                            <ActorGroupCard key={idx} group={group} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exportadores (Shipper) con Problemas */}
                    {shipperGroups.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Building size={14} className="text-sky-600" />
                          <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                            Exportadores con Problemas
                          </span>
                          <span className="text-[9px] text-slate-400">({shipperGroups.length} exportador{shipperGroups.length > 1 ? 'es' : ''})</span>
                        </div>
                        <div className="space-y-2">
                          {shipperGroups.map((group, idx) => (
                            <ActorGroupCard key={idx} group={group} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All FHL Clean */}
                    {totalFhlErrors === 0 && totalFhlWarnings === 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-green-600" />
                        <span className="text-green-700 text-xs font-semibold">
                          Las {totalHouses} house(s) FHL pasan validación sin errores ✓
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* ===== TIP: Go to Detalle ===== */}
                <div className="bg-slate-50 rounded-lg p-2.5 flex items-center gap-2 border border-slate-200">
                  <FileText size={12} className="text-slate-400" />
                  <span className="text-[10px] text-slate-500">
                    Para ver cada error en detalle por segmento, consulte la pestaña <button onClick={() => setActiveTab('detalle')} className="font-semibold text-purple-600 hover:underline">Detalle</button>.
                  </span>
                </div>
              </div>
            );
          })()}

          {/* ========== DETALLE TAB (Full segment-by-segment, collapsible) ========== */}
          {activeTab === 'detalle' && (() => {
            const fhlWithErrors = fhlValidations.filter(f => f.validation.totalErrors > 0).length;
            const fhlWithWarnings = fhlValidations.filter(f => f.validation.totalErrors === 0 && f.validation.totalWarnings > 0).length;
            const fhlClean = fhlValidations.length - fhlWithErrors - fhlWithWarnings;
            return (
            <div className="p-4 space-y-3">

              {/* ---- Quick stats bar ---- */}
              {fhlValidations.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="text-slate-500 font-medium">{fhlValidations.length} houses:</span>
                  {fhlWithErrors > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">{fhlWithErrors} con errores</span>}
                  {fhlWithWarnings > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">{fhlWithWarnings} con alertas</span>}
                  {fhlClean > 0 && <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">{fhlClean} limpios</span>}
                </div>
              )}

              {/* FWB Detailed Validation — Collapsible */}
              {validation && (
                <details className="group" open>
                  <summary className="flex items-center gap-2 cursor-pointer select-none list-none rounded-lg p-2 hover:bg-slate-50 transition-colors">
                    <ChevronRight size={14} className="text-slate-400 transition-transform group-open:rotate-90 flex-shrink-0" />
                    <FileText size={14} className="text-purple-600" />
                    <span className="font-bold text-slate-700 text-xs">FWB — Validación Detallada</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {validation.totalErrors > 0 && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded-full">{validation.totalErrors} err</span>}
                      {validation.totalWarnings > 0 && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-full">{validation.totalWarnings} warn</span>}
                      {validation.totalErrors === 0 && validation.totalWarnings === 0 && <CheckCircle2 size={12} className="text-green-500" />}
                      <span className={`text-lg font-bold ${validation.totalErrors > 0 ? 'text-red-600' : validation.totalWarnings > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {validation.score}
                      </span>
                    </div>
                  </summary>
                  <div className="pl-7 pt-1 pb-1">
                    <div className={`rounded-lg p-2.5 mb-2 flex items-center justify-between ${
                      validation.totalErrors > 0 ? 'bg-red-50 border border-red-200' 
                        : validation.totalWarnings > 0 ? 'bg-amber-50 border border-amber-200' 
                        : 'bg-green-50 border border-green-200'
                    }`}>
                      <div className={`text-xs font-semibold ${validation.totalErrors > 0 ? 'text-red-700' : validation.totalWarnings > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                        {validation.summary}
                      </div>
                    </div>
                    {validation.allIssues.length > 0 ? (
                      <div className="space-y-1.5 mb-2">
                        {validation.allIssues.map((issue, idx) => (
                          <div key={idx} className={`rounded-lg p-2 text-xs flex items-start gap-1.5 ${
                            issue.severity === 'error' ? 'bg-red-50 border border-red-100' 
                              : issue.severity === 'warning' ? 'bg-amber-50 border border-amber-100' 
                              : 'bg-blue-50 border border-blue-100'
                          }`}>
                            {issue.severity === 'error' 
                              ? <XCircle size={12} className="text-red-500 flex-shrink-0 mt-0.5" /> 
                              : issue.severity === 'warning'
                              ? <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                              : <CheckCircle2 size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-slate-700">[{issue.segment}]</span> {issue.message}
                              {issue.suggestion && <div className="text-[10px] text-slate-400 mt-0.5">💡 {issue.suggestion}</div>}
                              {issue.found && <div className="text-[10px] mt-0.5"><span className="text-red-500 font-medium">Tiene:</span> <code className="bg-red-100 px-1 rounded text-red-600 font-mono">{issue.found}</code></div>}
                              {issue.expected && <div className="text-[10px]"><span className="text-green-500 font-medium">Espera:</span> <code className="bg-green-100 px-1 rounded text-green-600 font-mono">{issue.expected}</code></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-green-600">
                        <CheckCircle2 size={16} className="mx-auto mb-1" />
                        <div className="text-xs font-semibold">FWB sin errores</div>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* FHL Per-House Detailed Validation — Collapsible cards */}
              {fhlValidations.length > 0 && (() => {
                const [fhlExpandAll, setFhlExpandAll] = useState<boolean | undefined>(undefined);
                return (
                <div>
                  <div className="flex items-center gap-2 mb-2 pt-2 border-t border-slate-200">
                    <Package size={14} className="text-cyan-600" />
                    <span className="font-bold text-slate-700 text-xs">FHL — Detalle por House ({fhlValidations.length})</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => setFhlExpandAll(true)}
                        className="px-1.5 py-0.5 text-[9px] font-medium text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="Expandir todos"
                      >Abrir todos</button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => setFhlExpandAll(false)}
                        className="px-1.5 py-0.5 text-[9px] font-medium text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="Colapsar todos"
                      >Cerrar todos</button>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                    {fhlValidations.map((fhlEntry, idx) => (
                      <FhlDetailCard key={idx} entry={fhlEntry} index={idx} houseBills={houseBills} forceExpand={fhlExpandAll} />
                    ))}
                  </div>
                </div>
                );
              })()}

              {/* If no FHL validations and FWB clean */}
              {fhlValidations.length === 0 && validation && validation.totalErrors === 0 && validation.totalWarnings === 0 && (
                <div className="text-center py-6 text-green-600">
                  <CheckCircle2 size={24} className="mx-auto mb-1" />
                  <div className="text-sm font-semibold">Mensaje completamente válido</div>
                </div>
              )}
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL: FullScreenAwbView
// ============================================================

export const FullScreenAwbView: FunctionComponent<FullScreenAwbViewProps> = ({ 
  shipment, 
  onOpenModal, 
  onClose,
  mode = 'transmit',
  onTransmitSuccess,
  userRole
}) => {
  // ========== State for transmit mode ==========
  const [showEdiPreview, setShowEdiPreview] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmissionResult, setTransmissionResult] = useState<BundleTransmissionResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showForceTransmit, setShowForceTransmit] = useState(false);
  const [housesExpanded, setHousesExpanded] = useState(false);
  // Send mode: masterAndHouses (FWB+FHL, consolidado) or masterOnly (solo FWB, directo)
  const [sendMode, setSendMode] = useState<'masterOnly' | 'masterAndHouses'>(shipment.hasHouses ? 'masterAndHouses' : 'masterOnly');
  // Modal that shows blocking errors
  const [showBlockingErrorsModal, setShowBlockingErrorsModal] = useState(false);

  // Generate EDI messages (memoized, only for transmit mode)
  // sendMode adjusts hasHouses: masterOnly → FWB directo (NG), masterAndHouses → consolidado (NC)
  const ediData = useMemo(() => {
    if (mode !== 'transmit') return null;
    try {
      const isConsolidatedSend = shipment.hasHouses && sendMode === 'masterAndHouses';
      // When masterOnly, override hasHouses=false so FWB generates as direct (NG instead of NC)
      const shipmentForGen = isConsolidatedSend ? shipment : { ...shipment, hasHouses: false };
      const bundle = cargoImpService.generateMessageBundle(shipmentForGen);
      const fwbValidation = validateCargoImpMessage(bundle.fwb, bundle.fwb.policy);
      
      // Validate each FHL individually for smart summary (only if sending houses)
      const fhlValidations = isConsolidatedSend
        ? bundle.fhls.map(fhl => ({
            hawbNumber: fhl.hawbNumber || '',
            validation: validateCargoImpMessage(fhl, fhl.policy)
          }))
        : [];

      return { ...bundle, fwbValidation, fhlValidations };
    } catch (e) {
      console.error('Error generating EDI:', e);
      return null;
    }
  }, [mode, shipment, sendMode]);

  // Compute blocking errors: ONLY red errors (not warnings) block transmission
  const blockingErrors = useMemo(() => {
    if (!ediData) return [];
    const errors: { source: string; message: string; segment: string; suggestion?: string }[] = [];
    // FWB errors
    ediData.fwbValidation.allIssues
      .filter(i => i.severity === 'error')
      .forEach(i => errors.push({ source: 'FWB', message: i.message, segment: i.segment, suggestion: i.suggestion }));
    // FHL errors (only when sending houses)
    if (sendMode === 'masterAndHouses') {
      ediData.fhlValidations.forEach(entry => {
        entry.validation.allIssues
          .filter(i => i.severity === 'error')
          .forEach(i => errors.push({ source: `FHL ${entry.hawbNumber}`, message: i.message, segment: i.segment, suggestion: i.suggestion }));
      });
    }
    return errors;
  }, [ediData, sendMode]);
  const hasBlockingErrors = blockingErrors.length > 0;

  // Basic data validation
  const validateForTransmit = useCallback((): string[] => {
    const errors: string[] = [];
    if (!shipment.awbNumber || shipment.awbNumber.length < 11) errors.push('AWB Number inválido (mínimo 11 caracteres)');
    if (!shipment.origin || shipment.origin.length !== 3) errors.push('Origen debe ser código IATA de 3 letras');
    if (!shipment.destination || shipment.destination.length !== 3) errors.push('Destino debe ser código IATA de 3 letras');
    if (!shipment.shipper.name) errors.push('Nombre del Shipper es obligatorio');
    if (!shipment.consignee.name) errors.push('Nombre del Consignee es obligatorio');
    if (!shipment.agent.name) errors.push('Nombre del Agente es obligatorio');
    if (!shipment.agent.iataCode) errors.push('Código IATA del Agente es obligatorio');
    if (shipment.pieces <= 0) errors.push('Piezas debe ser mayor a 0');
    if (shipment.weight <= 0) errors.push('Peso debe ser mayor a 0');
    if (!shipment.descartesConfig?.endpoint || !shipment.descartesConfig?.username || !shipment.descartesConfig?.password) {
      errors.push('Configuración de Descartes incompleta');
    }
    return errors;
  }, [shipment]);

  // Execute direct transmit (respects sendMode for what to send)
  const handleDirectTransmit = useCallback(async (force: boolean = false) => {
    // If blocking errors, show the errors modal instead of transmitting
    if (hasBlockingErrors && !force) {
      setShowBlockingErrorsModal(true);
      return;
    }

    const errors = validateForTransmit();
    if (errors.length > 0 && !force) {
      setValidationErrors(errors);
      setShowForceTransmit(true);
      return;
    }
    setValidationErrors([]);
    setShowForceTransmit(false);
    setShowBlockingErrorsModal(false);
    
    if (!ediData?.fwb?.fullMessage) {
      setValidationErrors(['No se pudo generar el mensaje EDI.']);
      return;
    }
    if (!shipment.descartesConfig) {
      setValidationErrors(['Configuración de Descartes no disponible.']);
      return;
    }

    setIsTransmitting(true);
    setTransmissionResult(null);

    try {
      const service = new DescartesTransmitService({
        endpoint: shipment.descartesConfig.endpoint,
        username: shipment.descartesConfig.username,
        password: shipment.descartesConfig.password,
        proxyUrl: shipment.descartesConfig.proxyUrl
      });

      const masterMessage = ediData.fwb.fullMessage;
      let houseMessages: string[] = [];
      let hawbNumbers: string[] = [];

      // Only include FHL messages when sendMode is masterAndHouses
      if (sendMode === 'masterAndHouses' && shipment.hasHouses && ediData.fhls.length > 0) {
        houseMessages = ediData.fhls.map(f => f.fullMessage);
        hawbNumbers = shipment.houseBills?.map(h => h.hawbNumber) || [];
      }

      const result = await service.sendBundle(masterMessage, shipment.awbNumber, houseMessages, hawbNumbers);
      setTransmissionResult(result);

      if (result.allSuccess && onTransmitSuccess) {
        onTransmitSuccess(shipment.id, result.summary);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setValidationErrors([`Error de transmisión: ${errorMessage}`]);
    } finally {
      setIsTransmitting(false);
    }
  }, [validateForTransmit, ediData, shipment, onTransmitSuccess, sendMode, hasBlockingErrors]);

  const hasDescartesConfig = !!(shipment.descartesConfig?.endpoint && shipment.descartesConfig?.username && shipment.descartesConfig?.password);

  // ================================================================
  // RENDER — Modal compacto con backdrop
  // ================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-4xl max-h-[92vh] mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* ========== HEADER ========== */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-1.5 rounded-lg text-white">
              <Plane size={16} />
            </div>
            <h1 className="text-sm font-bold" style={{ background: 'linear-gradient(to right, #7c3aed, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              CARGO-IMP EDI Connector
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400">
              Authenticated: <span className="font-semibold text-green-600">Connected</span>
            </span>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600" title="Cerrar">
              <X size={16} />
            </button>
          </div>
        </header>

        {/* ========== SCROLLABLE CONTENT ========== */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4">
            
            {/* ========== AWB HEADER CARD (Compacto) ========== */}
            <div className="rounded-xl p-5 text-white shadow-lg mb-4" style={{ background: 'linear-gradient(to bottom right, #9333ea, #7c3aed, #6b21a8)' }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Package size={14} className="opacity-80" />
                    <span className="text-purple-200 text-[10px] font-medium uppercase tracking-wider">Air Waybill</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold font-mono tracking-wide">{shipment.awbNumber}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <StatusBadge status={shipment.status} />
                    {shipment.hasHouses ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-400/20 text-sky-100 border border-sky-400/30">
                        <Layers size={10} className="mr-1" />
                        {shipment.houseBills?.length || 0} Houses
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/30">
                        <Package size={10} className="mr-1" />
                        Directo
                      </span>
                    )}
                    {/* EDI Preview badge (transmit mode) */}
                    {mode === 'transmit' && ediData && (
                      <button
                        onClick={() => setShowEdiPreview(true)}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-400/20 text-green-100 border border-green-400/30 hover:bg-green-400/30 transition-colors cursor-pointer"
                      >
                        <Code size={10} className="mr-1" />
                        Ver EDI
                        {(() => {
                          const totalErr = ediData.fwbValidation.totalErrors + (ediData.fhlValidations?.reduce((s, f) => s + f.validation.totalErrors, 0) || 0);
                          if (totalErr > 0) return <span className="ml-1 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">{totalErr}</span>;
                          return <CheckCircle2 size={9} className="ml-1 text-green-300" />;
                        })()}
                      </button>
                    )}
                  </div>
                </div>
                {/* Main action button */}
                {mode === 'transmit' ? (
                  <button
                    onClick={() => hasBlockingErrors ? setShowBlockingErrorsModal(true) : handleDirectTransmit(false)}
                    disabled={isTransmitting || !hasDescartesConfig}
                    className={`font-semibold px-5 py-2.5 rounded-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 text-sm flex-shrink-0 ${
                      isTransmitting ? 'bg-purple-200 text-purple-400 cursor-not-allowed'
                        : hasBlockingErrors ? 'bg-red-200 text-red-600 hover:bg-red-300 cursor-pointer'
                        : transmissionResult?.allSuccess ? 'bg-green-500 text-white hover:bg-green-600'
                        : !hasDescartesConfig ? 'bg-white/50 text-purple-300 cursor-not-allowed'
                        : 'bg-white text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    {isTransmitting ? (
                      <><Loader2 size={16} className="animate-spin" /><span>Transmitiendo...</span></>
                    ) : hasBlockingErrors ? (
                      <><XCircle size={16} /><span>{blockingErrors.length} Error(es)</span></>
                    ) : transmissionResult?.allSuccess ? (
                      <><CheckCircle2 size={16} /><span>Transmitido</span></>
                    ) : (
                      <><Send size={16} /><span>Transmitir</span><ChevronRight size={16} /></>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={onOpenModal}
                    className="bg-white text-purple-700 hover:bg-purple-50 font-semibold px-5 py-2.5 rounded-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 text-sm flex-shrink-0"
                  >
                    <Send size={16} />
                    <span>{shipment.status === 'DRAFT' ? 'Revisar y Enviar' : 'Ver Detalles'}</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* ========== TRANSMISSION RESULT / ERRORS (inline) ========== */}
            {mode === 'transmit' && isTransmitting && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 flex items-center gap-3 animate-pulse">
                <Loader2 size={18} className="text-purple-600 animate-spin" />
                <div>
                  <div className="font-semibold text-purple-700 text-sm">Transmitiendo a Descartes...</div>
                  <div className="text-xs text-purple-500">Enviando mensajes EDI</div>
                </div>
              </div>
            )}

            {mode === 'transmit' && validationErrors.length > 0 && !isTransmitting && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-red-600" />
                    <span className="font-bold text-red-700 text-xs">Errores ({validationErrors.length})</span>
                  </div>
                  <button onClick={() => { setValidationErrors([]); setShowForceTransmit(false); }} className="text-red-400 hover:text-red-600 p-0.5"><X size={14} /></button>
                </div>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {validationErrors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-red-700">
                      <XCircle size={11} className="flex-shrink-0 mt-0.5" /><span>{err}</span>
                    </div>
                  ))}
                </div>
                {showForceTransmit && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-red-200">
                    <button onClick={() => handleDirectTransmit(true)} className="px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors">
                      Transmitir de todas formas
                    </button>
                    <button onClick={() => { setShowForceTransmit(false); setValidationErrors([]); }} className="px-3 py-1 text-amber-600 text-xs font-semibold hover:bg-amber-50 rounded-lg transition-colors">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'transmit' && transmissionResult && !isTransmitting && (
              <div className={`rounded-lg p-4 mb-4 border ${transmissionResult.allSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {transmissionResult.allSuccess ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-red-600" />}
                    <span className={`font-bold text-xs ${transmissionResult.allSuccess ? 'text-green-700' : 'text-red-700'}`}>{transmissionResult.summary}</span>
                  </div>
                  <button onClick={() => setTransmissionResult(null)} className="text-slate-400 hover:text-slate-600 p-0.5"><X size={14} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/70 rounded p-1.5 text-center"><div className="font-bold text-slate-700">{transmissionResult.totalSent}</div><div className="text-[10px] text-slate-400">Enviados</div></div>
                  <div className="bg-white/70 rounded p-1.5 text-center"><div className="font-bold text-green-600">{transmissionResult.totalSuccess}</div><div className="text-[10px] text-slate-400">Exitosos</div></div>
                  <div className="bg-white/70 rounded p-1.5 text-center"><div className="font-bold text-red-600">{transmissionResult.totalFailed}</div><div className="text-[10px] text-slate-400">Fallidos</div></div>
                </div>
                {/* Individual results */}
                <div className="mt-2 space-y-1 text-[10px]">
                  <div className={`flex items-center gap-1.5 ${transmissionResult.fwbResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {transmissionResult.fwbResult.success ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    <span className="font-mono">FWB {transmissionResult.fwbResult.reference}</span>
                    {transmissionResult.fwbResult.descartesResponse?.tid && <span className="text-slate-400 ml-1">TID: {transmissionResult.fwbResult.descartesResponse.tid}</span>}
                    {transmissionResult.fwbResult.error && <span className="text-red-500 ml-1">{transmissionResult.fwbResult.error}</span>}
                  </div>
                  {transmissionResult.fhlResults.map((fhl, idx) => (
                    <div key={idx} className={`flex items-center gap-1.5 ${fhl.success ? 'text-green-600' : 'text-red-600'}`}>
                      {fhl.success ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      <span className="font-mono">FHL {fhl.reference}</span>
                      {fhl.descartesResponse?.tid && <span className="text-slate-400 ml-1">TID: {fhl.descartesResponse.tid}</span>}
                      {fhl.error && <span className="text-red-500 ml-1">{fhl.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========== INFO CARDS (Compacto 2-col) ========== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Ruta */}
              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2 text-purple-600">
                  <MapPin size={13} />
                  <h3 className="font-semibold text-slate-800 text-xs">Ruta</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-900">{shipment.origin}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Origen</div>
                  </div>
                  <div className="flex-1 mx-3 relative">
                    <div className="h-0.5 bg-gradient-to-r from-sky-300 to-purple-500 rounded-full"></div>
                    <Plane size={14} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-600 bg-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-900">{shipment.destination}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Destino</div>
                  </div>
                </div>
                {/* Flight info */}
                {shipment.flights && shipment.flights.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="font-mono font-semibold">{shipment.flights[0].flightNumber}</span>
                    <span>{shipment.flights[0].date}</span>
                    {shipment.flights.length > 1 && <span className="text-purple-600 font-semibold">+{shipment.flights.length - 1} vuelos</span>}
                  </div>
                )}
              </div>

              {/* Carga */}
              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2 text-green-600">
                  <Scale size={13} />
                  <h3 className="font-semibold text-slate-800 text-xs">Carga</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-slate-900">{shipment.pieces}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Piezas</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-slate-900">{shipment.weight}</div>
                    <div className="text-[9px] text-slate-400 uppercase">{shipment.weightUnit === 'KILOGRAM' ? 'KG' : 'LB'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== SHIPPER & CONSIGNEE (Compacto) ========== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5 text-sky-600">
                  <Building size={13} />
                  <h3 className="font-semibold text-slate-800 text-xs">Shipper</h3>
                </div>
                <div className="text-slate-900 font-medium text-sm">{shipment.shipper.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {shipment.shipper.address.place}, {shipment.shipper.address.countryCode}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5 text-purple-600">
                  <User size={13} />
                  <h3 className="font-semibold text-slate-800 text-xs">Consignee</h3>
                </div>
                <div className="text-slate-900 font-medium text-sm">{shipment.consignee.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {shipment.consignee.address.place}, {shipment.consignee.address.countryCode}
                </div>
              </div>
            </div>

            {/* ========== AGENT INFO (Compacto) ========== */}
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm mb-3">
              <div className="flex items-center gap-1.5 mb-1.5 text-amber-600">
                <Briefcase size={13} />
                <h3 className="font-semibold text-slate-800 text-xs">Agente</h3>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-900 font-medium text-sm">{shipment.agent.name}</div>
                  <div className="text-[11px] text-slate-500">{shipment.agent.place}{shipment.agent.address?.countryCode ? `, ${shipment.agent.address.countryCode}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">IATA</div>
                  <div className="font-mono font-bold text-slate-800 text-sm">{shipment.agent.iataCode}</div>
                </div>
              </div>
            </div>

            {/* ========== DESCRIPCIÓN ========== */}
            {shipment.description && (
              <div className="bg-slate-50 rounded-lg px-3 py-2 text-center text-[11px] mb-3">
                <span className="text-slate-500">Descripción: </span>
                <span className="font-medium text-slate-700">{shipment.description}</span>
              </div>
            )}

            {/* ========== SPECIAL HANDLING CODES (arriba de Houses) ========== */}
            {shipment.specialHandlingCodes && shipment.specialHandlingCodes.length > 0 && (
              <div className="bg-purple-50 rounded-lg px-3 py-2 border border-purple-200 mb-3">
                <div className="flex items-center gap-1.5 mb-1 text-purple-700">
                  <ShieldCheck size={12} />
                  <span className="font-semibold text-[10px]">SPH</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {shipment.specialHandlingCodes.map((code) => (
                    <span key={code} className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ========== HOUSES (colapsable) ========== */}
            {shipment.hasHouses && shipment.houseBills && shipment.houseBills.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-3 overflow-hidden">
                <button
                  onClick={() => setHousesExpanded(!housesExpanded)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-1.5 text-purple-600">
                    <Layers size={13} />
                    <h3 className="font-semibold text-slate-800 text-xs">House Waybills</h3>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium ml-1">
                      {shipment.houseBills.length} houses
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${housesExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                {housesExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 pt-2 max-h-[200px] overflow-y-auto">
                      {shipment.houseBills.map((house, idx) => (
                        <div key={house.id || idx} className="flex items-center gap-1.5 bg-slate-50 rounded px-2 py-1.5 text-[10px]">
                          <span className="bg-purple-100 text-purple-600 font-bold w-4 h-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0">
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
              </div>
            )}

          </div>
        </div>

        {/* ========== FOOTER ========== */}
        <footer className="border-t border-slate-200 px-5 py-3 flex-shrink-0 bg-slate-50">
          {/* Row 1: Send mode selector + validation status */}
          {mode === 'transmit' && (
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {/* Send Mode Selector (only for consolidados) */}
                {shipment.hasHouses && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-purple-600 uppercase font-bold">Contenido</label>
                    <select 
                      value={sendMode} 
                      onChange={(e) => setSendMode(e.target.value as 'masterOnly' | 'masterAndHouses')}
                      className="text-xs border border-purple-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium"
                    >
                      <option value="masterAndHouses">
                        {`FWB + ${shipment.houseBills?.length || 0} FHL`}
                      </option>
                      <option value="masterOnly">
                        Solo FWB (Master)
                      </option>
                    </select>
                  </div>
                )}
                {/* Info about current mode */}
                <span className="text-[10px] text-slate-400">
                  {sendMode === 'masterOnly' 
                    ? '📦 Modo Directo — NG (Nature of Goods) como descripción'
                    : shipment.hasHouses 
                      ? `📦 Consolidado — NC + ${shipment.houseBills?.length || 0} houses`
                      : '📦 Envío directo'}
                </span>
              </div>

              {/* Validation quick status */}
              {ediData && (
                <div className="flex items-center gap-1.5">
                  {hasBlockingErrors ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                      <XCircle size={11} />
                      {blockingErrors.length} error(es) — Corregir antes de transmitir
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                      <CheckCircle2 size={11} />
                      Listo para transmitir
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Row 2: Action buttons */}
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-slate-400">
              <span className="font-semibold">{shipment.status}</span> • {sendMode === 'masterOnly' ? 'Directo' : shipment.hasHouses ? 'Consolidado' : 'Directo'}
              {mode === 'transmit' && ediData && <span> • EDI: FWB/16{sendMode === 'masterAndHouses' && ediData.fhls.length > 0 ? ` + ${ediData.fhls.length} FHL` : ''}</span>}
            </div>
            <div className="flex items-center gap-2">
              {mode === 'transmit' && ediData && (
                <button
                  onClick={() => setShowEdiPreview(true)}
                  className="px-3 py-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5 border border-purple-200"
                >
                  <Eye size={12} />
                  Ver EDI
                </button>
              )}
              {mode === 'transmit' && userRole?.toUpperCase() === 'ADM' && (
                <button onClick={onOpenModal} className="px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5 border border-slate-200">
                  <FileText size={12} />
                  Editor Completo
                </button>
              )}
              <button onClick={onClose} className="px-4 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium">
                Cancelar
              </button>
              {mode === 'transmit' ? (
                <button
                  onClick={() => handleDirectTransmit(false)}
                  disabled={isTransmitting || !hasDescartesConfig || hasBlockingErrors}
                  title={hasBlockingErrors ? 'Corrija los errores de validación antes de transmitir' : undefined}
                  className={`px-4 py-1.5 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                    isTransmitting ? 'bg-purple-300 text-white cursor-not-allowed' :
                    hasBlockingErrors ? 'bg-red-100 text-red-400 cursor-not-allowed border border-red-200' :
                    transmissionResult?.allSuccess ? 'bg-green-600 hover:bg-green-700 text-white' :
                    !hasDescartesConfig ? 'bg-slate-200 text-slate-400 cursor-not-allowed' :
                    'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isTransmitting ? <><Loader2 size={12} className="animate-spin" /> Transmitiendo...</>
                    : hasBlockingErrors ? <><XCircle size={12} /> Errores pendientes</>
                    : transmissionResult?.allSuccess ? <><CheckCircle2 size={12} /> Transmitido</>
                    : <><Send size={12} /> Transmitir</>}
                </button>
              ) : (
                <button onClick={onOpenModal} className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <Send size={12} />
                  {shipment.status === 'DRAFT' ? 'Revisar y Enviar' : 'Ver Detalles'}
                </button>
              )}
            </div>
          </div>
          <div className="text-center mt-2 pt-2 border-t border-slate-100">
            <p className="text-[9px] text-slate-300">
              Powered by <span className="font-semibold text-slate-400">Avatar Cargo</span>
            </p>
          </div>
        </footer>
      </div>

      {/* ========== BLOCKING ERRORS MODAL ========== */}
      {showBlockingErrorsModal && hasBlockingErrors && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBlockingErrorsModal(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideInRight">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-red-50 border-b border-red-200">
              <div className="flex items-center gap-2">
                <div className="bg-red-600 p-1.5 rounded-lg text-white">
                  <XCircle size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-red-800 text-sm">Errores que Bloquean la Transmisión</h3>
                  <p className="text-[10px] text-red-600">Corrija estos errores en el sistema antes de poder transmitir</p>
                </div>
              </div>
              <button onClick={() => setShowBlockingErrorsModal(false)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                <X size={16} className="text-red-400" />
              </button>
            </div>

            {/* Error List */}
            <div className="p-4 max-h-[50vh] overflow-y-auto space-y-1.5">
              {blockingErrors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-2.5 text-xs">
                  <XCircle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-200 text-red-800">{err.source}</span>
                      <span className="text-[10px] font-semibold text-slate-600">[{err.segment}]</span>
                    </div>
                    <div className="text-red-700">{err.message}</div>
                    {err.suggestion && (
                      <div className="text-[10px] text-red-500/70 mt-0.5">💡 {err.suggestion}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[10px] text-slate-500">
                {blockingErrors.length} error(es) deben corregirse en el sistema origen
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowBlockingErrorsModal(false); setShowEdiPreview(true); }}
                  className="px-3 py-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5 border border-purple-200"
                >
                  <Eye size={12} />
                  Ver Detalle EDI
                </button>
                <button
                  onClick={() => setShowBlockingErrorsModal(false)}
                  className="px-4 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-xs font-semibold"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== EDI PREVIEW PANEL ========== */}
      {mode === 'transmit' && (
        <EdiPreviewPanel
          isOpen={showEdiPreview}
          onClose={() => setShowEdiPreview(false)}
          fwbMessage={ediData?.fwb || null}
          fhlMessages={ediData?.fhls || []}
          concatenatedFhl={ediData?.concatenatedFhl}
          validation={ediData?.fwbValidation || null}
          fhlValidations={ediData?.fhlValidations || []}
          houseBills={shipment.houseBills}
        />
      )}
    </div>
  );
};

export default FullScreenAwbView;
