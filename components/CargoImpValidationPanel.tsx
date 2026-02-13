/**
 * Panel de Validación CARGO-IMP (FWB/FHL)
 * 
 * Muestra segmento por segmento los errores de validación según
 * las especificaciones IATA para mensajes CARGO-IMP.
 * 
 * - Errores: Se alertan al usuario (amarillo/rojo) pero NO bloquean el envío
 * - Warnings: Permiten enviar pero alertan (amarillo)
 * - Info: Información adicional (azul)
 * 
 * @author Senior Solutions Architect
 * @version 1.0.0
 */

import { FunctionComponent, JSX } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronRight,
  Shield,
  XCircle,
  Zap,
  FileText,
  Package,
  Plane,
  User,
  Building,
  DollarSign,
  Tag,
  MapPin,
  Hash,
  Clock,
  FileCode
} from 'lucide-preact';
import {
  FwbValidationResult,
  SegmentValidationResult,
  ValidationIssue,
  ValidationSeverity,
  validateCargoImpMessage
} from '../services/providers/cargoimp/cargoImpValidator';
import { GeneratedCargoImpMessage, AirlinePolicy } from '../services/providers/cargoimp';

// ============================================================
// PROPS
// ============================================================

interface CargoImpValidationPanelProps {
  /** Mensaje FWB o FHL generado */
  message: GeneratedCargoImpMessage;
  /** Política de aerolínea aplicada */
  policy?: AirlinePolicy;
  /** Si está colapsado por defecto */
  defaultCollapsed?: boolean;
  /** Versión compacta (menos detalle) */
  compact?: boolean;
  /** Callback al seleccionar un segmento (para scroll) */
  onSegmentSelect?: (segmentCode: string) => void;
  /** Callback cuando cambia el resultado de validación (canSend, errorCount, score) */
  onValidationChange?: (result: { canSend: boolean; errorCount: number; warningCount: number; score: number }) => void;
}

// ============================================================
// ICONOS POR SEGMENTO
// ============================================================

const SEGMENT_ICONS: Record<string, JSX.Element> = {
  'FWB': <FileCode size={13} />,
  'FHL': <FileCode size={13} />,
  'AWB': <Package size={13} />,
  'MBI': <Package size={13} />,
  'FLT': <Plane size={13} />,
  'RTG': <MapPin size={13} />,
  'SHP': <User size={13} />,
  'CNE': <User size={13} />,
  'AGT': <Building size={13} />,
  'SSR': <Info size={13} />,
  'CVD': <DollarSign size={13} />,
  'RTD': <Hash size={13} />,
  'NG': <Tag size={13} />,
  'NH': <Tag size={13} />,
  'NV': <Hash size={13} />,
  'NS': <Package size={13} />,
  'HBS': <Package size={13} />,
  'HTS': <Tag size={13} />,
  'OTH': <DollarSign size={13} />,
  'PPD': <DollarSign size={13} />,
  'COL': <DollarSign size={13} />,
  'CER': <Shield size={13} />,
  'ISU': <Clock size={13} />,
  'REF': <FileText size={13} />,
  'SPH': <Shield size={13} />,
  'OCI': <Shield size={13} />,
  'NFY': <User size={13} />,
  'FTR': <FileCode size={13} />,
  'GLOBAL': <Zap size={13} />
};

// ============================================================
// COMPONENTE: Issue Individual
// ============================================================

interface IssueItemProps {
  issue: ValidationIssue;
  compact?: boolean;
}

const IssueItem: FunctionComponent<IssueItemProps> = ({ issue, compact = false }) => {
  const [showDetails, setShowDetails] = useState(false);

  const severityConfig = {
    error: {
      icon: <XCircle size={14} className="text-red-500 flex-shrink-0" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
      label: 'ERROR'
    },
    warning: {
      icon: <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
      label: 'ADVERTENCIA'
    },
    info: {
      icon: <Info size={14} className="text-blue-500 flex-shrink-0" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700',
      label: 'INFO'
    }
  };

  const config = severityConfig[issue.severity];

  return (
    <div className={`${config.bg} ${config.border} border rounded-md p-2 text-xs`}>
      <div 
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => !compact && setShowDetails(!showDetails)}
      >
        {config.icon}
        <div className="flex-1 min-w-0">
          <div className={`${config.text} font-medium leading-tight`}>
            {issue.message}
          </div>
          {issue.field && (
            <span className="text-slate-500 text-[10px]">Campo: {issue.field}</span>
          )}
        </div>
        {!compact && (issue.rule || issue.suggestion || issue.expected || issue.found) && (
          <button className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            {showDetails ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
      </div>

      {/* Detalles expandidos */}
      {showDetails && !compact && (
        <div className="mt-2 pt-2 border-t border-white/50 space-y-1.5 pl-6">
          {/* Regla IATA */}
          {issue.rule && (
            <div className="flex items-start gap-1.5">
              <span className="text-slate-500 font-medium text-[10px] uppercase w-16 flex-shrink-0">Regla:</span>
              <span className="text-slate-600 text-[10px] font-mono">{issue.rule}</span>
            </div>
          )}
          
          {/* Valor encontrado */}
          {issue.found && (
            <div className="flex items-start gap-1.5">
              <span className="text-red-500 font-medium text-[10px] uppercase w-16 flex-shrink-0">Tiene:</span>
              <code className="text-red-600 text-[10px] bg-red-100 px-1 rounded font-mono break-all">
                {issue.found}
              </code>
            </div>
          )}
          
          {/* Valor esperado */}
          {issue.expected && (
            <div className="flex items-start gap-1.5">
              <span className="text-green-500 font-medium text-[10px] uppercase w-16 flex-shrink-0">Espera:</span>
              <code className="text-green-600 text-[10px] bg-green-100 px-1 rounded font-mono break-all">
                {issue.expected}
              </code>
            </div>
          )}
          
          {/* Sugerencia */}
          {issue.suggestion && (
            <div className="flex items-start gap-1.5">
              <span className="text-blue-500 font-medium text-[10px] uppercase w-16 flex-shrink-0">Tip:</span>
              <span className="text-blue-600 text-[10px] italic">{issue.suggestion}</span>
            </div>
          )}

          {/* Línea del mensaje */}
          {issue.lineContent && (
            <div className="flex items-start gap-1.5">
              <span className="text-slate-500 font-medium text-[10px] uppercase w-16 flex-shrink-0">Línea:</span>
              <code className="text-slate-600 text-[10px] bg-slate-100 px-1 rounded font-mono break-all">
                {issue.lineContent}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPONENTE: Resultado por Segmento
// ============================================================

interface SegmentResultCardProps {
  result: SegmentValidationResult;
  compact?: boolean;
  onSelect?: () => void;
}

const SegmentResultCard: FunctionComponent<SegmentResultCardProps> = ({ result, compact, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(!result.isValid);
  const icon = SEGMENT_ICONS[result.segment] || <FileText size={13} />;

  // Determinar color del segmento
  const getColor = () => {
    if (result.errorCount > 0) return {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-700',
      ringColor: 'ring-red-400'
    };
    if (result.warningCount > 0) return {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-700',
      ringColor: 'ring-amber-400'
    };
    return {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-700',
      ringColor: 'ring-green-400'
    };
  };

  const color = getColor();

  return (
    <div className={`
      rounded-lg border ${color.border} ${color.bg} 
      ${result.errorCount > 0 ? 'ring-1 ' + color.ringColor : ''} 
      transition-all duration-200
    `}>
      {/* Header del segmento */}
      <button
        type="button"
        onClick={() => { setIsExpanded(!isExpanded); onSelect && onSelect(); }}
        className="w-full p-2 flex items-center gap-2 hover:bg-black/5 transition-colors rounded-lg"
      >
        <div className={color.text}>{icon}</div>
        <span className={`font-mono font-bold text-xs ${color.text}`}>{result.segment}</span>
        <span className="text-[10px] text-slate-500 truncate flex-1 text-left">{result.segmentName}</span>
        
        {/* Badges */}
        <div className="flex items-center gap-1">
          {result.errorCount > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded-full">
              {result.errorCount} err
            </span>
          )}
          {result.warningCount > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-full">
              {result.warningCount} warn
            </span>
          )}
          {result.isValid && result.warningCount === 0 && (
            <CheckCircle2 size={14} className="text-green-500" />
          )}
        </div>

        {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>

      {/* Issues expandidos */}
      {isExpanded && result.issues.length > 0 && (
        <div className="px-2 pb-2 space-y-1">
          {result.issues.map((issue, idx) => (
            <IssueItem key={idx} issue={issue} compact={compact} />
          ))}
        </div>
      )}

      {/* Si está expandido y es válido, mostrar confirmación */}
      {isExpanded && result.isValid && result.warningCount === 0 && (
        <div className="px-3 pb-2 text-[10px] text-green-600 flex items-center gap-1">
          <CheckCircle2 size={12} />
          Segmento válido - Sin errores ni advertencias
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPONENTE: Score Visual
// ============================================================

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md';
}

const ScoreGauge: FunctionComponent<ScoreGaugeProps> = ({ score, size = 'md' }) => {
  const getColor = () => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBgColor = () => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-amber-100';
    return 'bg-red-100';
  };

  const dimensions = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-lg';

  return (
    <div className={`${dimensions} ${getBgColor()} rounded-full flex items-center justify-center ${getColor()} font-bold`}>
      {score}
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL: Panel de Validación
// ============================================================

export const CargoImpValidationPanel: FunctionComponent<CargoImpValidationPanelProps> = ({
  message,
  policy,
  defaultCollapsed = false,
  compact = false,
  onSegmentSelect,
  onValidationChange
}) => {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [filterSeverity, setFilterSeverity] = useState<ValidationSeverity | 'all'>('all');
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  // Ejecutar validación
  const validation = useMemo<FwbValidationResult>(() => {
    return validateCargoImpMessage(message, policy);
  }, [message, policy]);

  // Notificar al padre cuando cambie el resultado de validación
  useMemo(() => {
    if (onValidationChange) {
      onValidationChange({
        canSend: validation.canSend,
        errorCount: validation.totalErrors,
        warningCount: validation.totalWarnings,
        score: validation.score
      });
    }
  }, [validation.canSend, validation.totalErrors, validation.totalWarnings, validation.score]);

  // Filtrar resultados
  const filteredResults = useMemo(() => {
    if (filterSeverity === 'all' && !showOnlyErrors) {
      return validation.segmentResults;
    }
    
    return validation.segmentResults
      .filter(r => {
        if (showOnlyErrors) return r.errorCount > 0 || r.warningCount > 0;
        return true;
      })
      .map(r => {
        if (filterSeverity === 'all') return r;
        return {
          ...r,
          issues: r.issues.filter(i => i.severity === filterSeverity)
        };
      })
      .filter(r => r.issues.length > 0 || (!showOnlyErrors && filterSeverity === 'all'));
  }, [validation, filterSeverity, showOnlyErrors]);

  // Determinar color general
  const getOverallColor = () => {
    if (validation.totalErrors > 0) return 'red';
    if (validation.totalWarnings > 0) return 'amber';
    return 'green';
  };

  const overallColor = getOverallColor();
  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      headerBg: 'bg-red-100',
      icon: <AlertCircle size={20} className="text-red-500" />
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      headerBg: 'bg-amber-100',
      icon: <AlertTriangle size={20} className="text-amber-500" />
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      headerBg: 'bg-green-100',
      icon: <CheckCircle2 size={20} className="text-green-500" />
    }
  };

  const colors = colorClasses[overallColor];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg mb-4 overflow-hidden`}>
      {/* Header Clickeable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-3 flex items-center justify-between hover:bg-black/5 transition-colors ${colors.headerBg}`}
      >
        <div className="flex items-center gap-3">
          {colors.icon}
          <div className="flex flex-col items-start">
            <span className={`font-bold text-sm ${colors.text}`}>
              Validación CARGO-IMP {message.type}
              {message.hawbNumber && (
                <span className="font-normal text-slate-500 ml-1 text-xs">
                  (HAWB: {message.hawbNumber})
                </span>
              )}
            </span>
            <span className="text-xs text-slate-500">
              {validation.summary}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Contadores */}
          {validation.totalErrors > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
              {validation.totalErrors} error{validation.totalErrors > 1 ? 'es' : ''}
            </span>
          )}
          {validation.totalWarnings > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
              {validation.totalWarnings} warn{validation.totalWarnings > 1 ? 's' : ''}
            </span>
          )}
          
          {/* Score */}
          <ScoreGauge score={validation.score} size="sm" />

          {/* Chevron */}
          {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="p-3 space-y-3">

          {/* Barra de estado rápido */}
          {validation.totalErrors > 0 && (
            <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  ⚠️ Mensaje con {validation.totalErrors} error(es) de validación
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  La aerolínea podría rechazar el mensaje. Revise cada segmento marcado en rojo.
                  Al transmitir se le pedirá confirmación.
                </p>
              </div>
            </div>
          )}

          {validation.totalErrors === 0 && validation.totalWarnings > 0 && (
            <div className="bg-amber-100 border border-amber-300 rounded-lg p-2.5 flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800">
                  ⚠️ Mensaje válido con advertencias
                </p>
                <p className="text-[10px] text-amber-600">
                  Puede enviarse, pero revise las {validation.totalWarnings} advertencia(s) para mejor calidad.
                </p>
              </div>
            </div>
          )}

          {validation.totalErrors === 0 && validation.totalWarnings === 0 && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-2.5 flex items-center gap-3">
              <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
              <p className="text-xs font-bold text-green-800">
                ✅ Mensaje válido. Listo para enviar.
              </p>
            </div>
          )}

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Filtrar:</span>
            {(['all', 'error', 'warning', 'info'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`
                  px-2 py-0.5 text-[10px] rounded-full transition-colors
                  ${filterSeverity === sev 
                    ? (sev === 'error' ? 'bg-red-500 text-white' 
                      : sev === 'warning' ? 'bg-amber-500 text-white'
                      : sev === 'info' ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-white')
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}
                `}
              >
                {sev === 'all' ? 'Todos' : sev === 'error' ? `Errores (${validation.totalErrors})` : sev === 'warning' ? `Warnings (${validation.totalWarnings})` : `Info (${validation.totalInfo})`}
              </button>
            ))}
            <label className="flex items-center gap-1 text-[10px] text-slate-500 ml-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showOnlyErrors}
                onChange={() => setShowOnlyErrors(!showOnlyErrors)}
                className="rounded border-slate-300 text-purple-600 w-3 h-3"
              />
              Solo con problemas
            </label>
          </div>

          {/* Resumen rápido por segmento */}
          <div className="flex flex-wrap gap-1">
            {validation.segmentResults.map(r => (
              <div
                key={r.segment}
                className={`
                  px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer
                  transition-colors hover:ring-1 hover:ring-purple-400
                  ${r.errorCount > 0 ? 'bg-red-200 text-red-800' 
                    : r.warningCount > 0 ? 'bg-amber-200 text-amber-800' 
                    : 'bg-green-200 text-green-800'}
                `}
                title={`${r.segment}: ${r.errorCount} error(es), ${r.warningCount} warning(s)`}
                onClick={() => onSegmentSelect && onSegmentSelect(r.segment)}
              >
                {r.segment}
                {r.errorCount > 0 && ` ×${r.errorCount}`}
              </div>
            ))}
            {/* Pill para issues globales (cross-validation, longitud, etc.) */}
            {(() => {
              const globalIssues = validation.allIssues.filter(i => i.segment === 'GLOBAL');
              const globalErrors = globalIssues.filter(i => i.severity === 'error').length;
              const globalWarnings = globalIssues.filter(i => i.severity === 'warning').length;
              if (globalIssues.length === 0) return null;
              return (
                <div
                  className={`
                    px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer
                    transition-colors hover:ring-1 hover:ring-purple-400
                    ${globalErrors > 0 ? 'bg-red-200 text-red-800' 
                      : globalWarnings > 0 ? 'bg-amber-200 text-amber-800' 
                      : 'bg-blue-200 text-blue-800'}
                  `}
                  title={`GLOBAL: ${globalErrors} error(es), ${globalWarnings} warning(s)`}
                >
                  GLOBAL
                  {globalErrors > 0 && ` ×${globalErrors}`}
                </div>
              );
            })()}
          </div>

          {/* Issues globales (cross-validation) — mostrar ARRIBA para visibilidad */}
          {validation.allIssues.filter(i => i.segment === 'GLOBAL').length > 0 && (
            <div className={`p-2 rounded-lg border ${
              validation.allIssues.filter(i => i.segment === 'GLOBAL' && i.severity === 'error').length > 0
                ? 'bg-red-50 border-red-300'
                : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="text-[10px] font-semibold uppercase mb-1.5 flex items-center gap-1 text-slate-700">
                <Zap size={12} /> Validaciones Globales ({validation.allIssues.filter(i => i.segment === 'GLOBAL').length})
              </div>
              <div className="space-y-1">
                {validation.allIssues
                  .filter(i => i.segment === 'GLOBAL')
                  .map((issue, idx) => (
                    <IssueItem key={`global-${idx}`} issue={issue} compact={compact} />
                  ))
                }
              </div>
            </div>
          )}

          {/* Lista de segmentos con issues */}
          <div className="space-y-2">
            {filteredResults.map(result => (
              <SegmentResultCard
                key={result.segment}
                result={result}
                compact={compact}
                onSelect={() => onSegmentSelect && onSegmentSelect(result.segment)}
              />
            ))}
          </div>

          {/* Score y estadísticas */}
          <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] text-slate-500">
              <span>Segmentos analizados: <strong>{validation.segmentResults.length}</strong></span>
              <span>Líneas totales: <strong>{message.fullMessage.split('\n').length}</strong></span>
              <span>Caracteres: <strong>{message.fullMessage.length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Calidad:</span>
              <ScoreGauge score={validation.score} size="sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CargoImpValidationPanel;
