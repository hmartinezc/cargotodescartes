/**
 * Panel de Validación de Cargo-XML
 * Muestra errores, warnings y estado de cumplimiento regulatorio
 * 
 * @author Senior Solutions Architect
 * @version 1.0.0
 */

import { FunctionComponent, JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Shield, 
  ChevronDown, 
  ChevronRight,
  Globe,
  FileWarning,
  Zap
} from 'lucide-preact';
import { 
  XmlValidationResult, 
  ValidationIssue, 
  validateCargoXml 
} from '../services/providers/descartes/cargoXmlValidator';

interface XmlValidationPanelProps {
  xml: string | null;
  messageType: 'XFWB' | 'XFZB';
}

/**
 * Panel de validación que muestra el estado del XML
 */
export const XmlValidationPanel: FunctionComponent<XmlValidationPanelProps> = ({ xml, messageType }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Validar XML cuando cambie
  const validation = useMemo<XmlValidationResult | null>(() => {
    if (!xml) return null;
    return validateCargoXml(xml);
  }, [xml]);

  if (!xml || !validation) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-slate-500">
          <FileWarning size={16} />
          <span className="text-sm">Sin XML para validar</span>
        </div>
      </div>
    );
  }

  // Determinar color y estado general
  const getStatusColor = () => {
    if (validation.errors.length > 0) return 'red';
    if (validation.warnings.length > 0) return 'amber';
    return 'green';
  };

  const statusColor = getStatusColor();
  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      accent: 'text-red-500',
      badge: 'bg-red-100 text-red-700'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      accent: 'text-amber-500',
      badge: 'bg-amber-100 text-amber-700'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      accent: 'text-green-500',
      badge: 'bg-green-100 text-green-700'
    }
  };

  const colors = colorClasses[statusColor];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg mb-4 overflow-hidden`}>
      {/* Header Clickeable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Icono de estado */}
          {validation.errors.length > 0 ? (
            <AlertCircle size={20} className="text-red-500" />
          ) : validation.warnings.length > 0 ? (
            <AlertTriangle size={20} className="text-amber-500" />
          ) : (
            <CheckCircle2 size={20} className="text-green-500" />
          )}
          
          {/* Título */}
          <div className="flex flex-col items-start">
            <span className={`font-bold ${colors.text}`}>
              Validación {messageType}
              {validation.summary.awbNumber && (
                <span className="font-normal text-slate-600 ml-2">
                  ({validation.summary.awbNumber})
                </span>
              )}
            </span>
            <span className="text-xs text-slate-500">
              {validation.isValid 
                ? 'XML válido según estándar IATA Cargo-XML 3.0'
                : `${validation.errors.length} error(es) encontrado(s)`
              }
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badges de conteo */}
          {validation.errors.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">
              {validation.errors.length} error{validation.errors.length > 1 ? 'es' : ''}
            </span>
          )}
          {validation.warnings.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
              {validation.warnings.length} warning{validation.warnings.length > 1 ? 's' : ''}
            </span>
          )}
          
          {/* Score */}
          <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>
            Score: {validation.score}/100
          </div>

          {/* Chevron */}
          {isExpanded ? (
            <ChevronDown size={16} className="text-slate-400" />
          ) : (
            <ChevronRight size={16} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Contenido Expandible */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-white/50">
          {/* Badges de Cumplimiento Regulatorio */}
          <div className="flex items-center gap-2 mt-3 mb-3">
            <span className="text-xs text-slate-500 font-medium">Cumplimiento:</span>
            
            {/* ICS2 (UE) */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              validation.summary.ics2Compliant 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              <Globe size={10} />
              ICS2 (UE) {validation.summary.ics2Compliant ? '✓' : '✗'}
            </span>
            
            {/* ACAS (US) */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              validation.summary.acasCompliant 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              <Shield size={10} />
              ACAS (US) {validation.summary.acasCompliant ? '✓' : '⚠'}
            </span>

            {/* TypeCode */}
            {validation.summary.typeCode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                <Zap size={10} />
                TypeCode: {validation.summary.typeCode}
              </span>
            )}
          </div>

          {/* Lista de Errores */}
          {validation.errors.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-red-600 uppercase mb-1 flex items-center gap-1">
                <AlertCircle size={12} /> Errores Críticos
              </div>
              <div className="space-y-1">
                {validation.errors.map((error, i) => (
                  <ValidationIssueRow key={i} issue={error} />
                ))}
              </div>
            </div>
          )}

          {/* Lista de Warnings */}
          {validation.warnings.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-amber-600 uppercase mb-1 flex items-center gap-1">
                <AlertTriangle size={12} /> Advertencias
              </div>
              <div className="space-y-1">
                {validation.warnings.map((warning, i) => (
                  <ValidationIssueRow key={i} issue={warning} />
                ))}
              </div>
            </div>
          )}

          {/* Toggle para ver éxitos/info */}
          {(validation.success.length > 0 || validation.info.length > 0) && (
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              {showDetails ? 'Ocultar detalles' : `Ver ${validation.success.length} validaciones exitosas`}
            </button>
          )}

          {/* Lista de Éxitos (colapsado por defecto) */}
          {showDetails && validation.success.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-bold text-green-600 uppercase mb-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> Validaciones Correctas
              </div>
              <div className="space-y-0.5">
                {validation.success.map((item, i) => (
                  <div key={i} className="text-xs text-green-700 flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-green-500 flex-shrink-0" />
                    {item.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Fila individual de issue de validación
 */
const ValidationIssueRow: FunctionComponent<{ issue: ValidationIssue }> = ({ issue }) => {
  const severityClasses = {
    error: 'bg-red-100 border-red-200 text-red-700',
    warning: 'bg-amber-100 border-amber-200 text-amber-700',
    info: 'bg-blue-100 border-blue-200 text-blue-700',
    success: 'bg-green-100 border-green-200 text-green-700'
  };

  const regulationBadges: Record<string, { bg: string; text: string }> = {
    ICS2: { bg: 'bg-blue-500', text: 'text-white' },
    ACAS: { bg: 'bg-purple-500', text: 'text-white' },
    IATA: { bg: 'bg-cyan-500', text: 'text-white' },
    CUSTOMS: { bg: 'bg-orange-500', text: 'text-white' }
  };

  return (
    <div className={`${severityClasses[issue.severity]} border rounded p-2 text-xs`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {/* Mensaje principal */}
          <div className="font-medium">{issue.message}</div>
          
          {/* Recomendación */}
          {issue.recommendation && (
            <div className="text-[10px] opacity-80 mt-0.5">
              💡 {issue.recommendation}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Badge de sección */}
          {issue.section && (
            <span className="text-[9px] px-1.5 py-0.5 bg-white/50 rounded">
              {issue.section}
            </span>
          )}
          
          {/* Badge de regulación */}
          {issue.regulation && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${regulationBadges[issue.regulation]?.bg} ${regulationBadges[issue.regulation]?.text}`}>
              {issue.regulation}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Versión compacta para mostrar solo el estado
 */
export const XmlValidationBadge: FunctionComponent<{ xml: string | null }> = ({ xml }) => {
  const validation = useMemo(() => {
    if (!xml) return null;
    return validateCargoXml(xml);
  }, [xml]);

  if (!validation) return null;

  if (validation.errors.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
        <AlertCircle size={12} />
        {validation.errors.length} error{validation.errors.length > 1 ? 'es' : ''}
      </span>
    );
  }

  if (validation.warnings.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
        <AlertTriangle size={12} />
        {validation.warnings.length} warning{validation.warnings.length > 1 ? 's' : ''}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
      <CheckCircle2 size={12} />
      Válido
    </span>
  );
};

export default XmlValidationPanel;
