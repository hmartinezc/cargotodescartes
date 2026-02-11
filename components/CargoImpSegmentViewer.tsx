/**
 * Componente visual de segmentos CARGO-IMP (EDI)
 * 
 * Muestra cada segmento como una tarjeta pequeña con:
 * - Código del segmento
 * - Contenido editable en caliente
 * - Límite de caracteres
 * - Estado habilitado/deshabilitado
 * - Errores de validación
 * 
 * @author Senior Solutions Architect
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'preact/hooks';
import { FunctionComponent, JSX } from 'preact';
import { 
  FileText, AlertTriangle, CheckCircle2, Edit3, Save, X, 
  ChevronDown, ChevronRight, Copy, Eye, EyeOff, Info,
  Plane, Package, User, Building, MapPin, DollarSign, 
  Shield, Tag, Clock, Hash, FileCode
} from 'lucide-preact';
import { 
  GeneratedSegment, 
  GeneratedCargoImpMessage,
  FwbSegmentType,
  FhlSegmentType,
  FWB_SEGMENTS,
  FHL_SEGMENTS,
  AirlinePolicy
} from '../services/providers/cargoimp';

// ============================================================
// ICONOS POR TIPO DE SEGMENTO
// ============================================================

const SEGMENT_ICONS: Record<string, JSX.Element> = {
  'FWB': <FileCode size={14} />,
  'FHL': <FileCode size={14} />,
  'AWB': <Package size={14} />,
  'MBI': <Package size={14} />,
  'FLT': <Plane size={14} />,
  'RTG': <MapPin size={14} />,
  'SHP': <User size={14} />,
  'CNE': <User size={14} />,
  'AGT': <Building size={14} />,
  'SSR': <Info size={14} />,
  'ACC': <DollarSign size={14} />,
  'CVD': <DollarSign size={14} />,
  'RTD': <Hash size={14} />,
  'NG': <Tag size={14} />,
  'NH': <Tag size={14} />,
  'NV': <Hash size={14} />,
  'NS': <Package size={14} />,
  'HBS': <Package size={14} />,
  'HTS': <Tag size={14} />,
  'OTH': <DollarSign size={14} />,
  'PPD': <DollarSign size={14} />,
  'COL': <DollarSign size={14} />,
  'CER': <Shield size={14} />,
  'ISU': <Clock size={14} />,
  'REF': <FileText size={14} />,
  'SPH': <Shield size={14} />,
  'OCI': <Shield size={14} />,
  'NFY': <User size={14} />,
  'TXT': <FileText size={14} />,
  'FTR': <FileCode size={14} />
};

// Colores por categoría de segmento
const SEGMENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // Header/Footer
  'FWB': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
  'FHL': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
  'FTR': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
  
  // AWB/Carga
  'AWB': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  'MBI': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  'HBS': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  
  // Vuelo/Routing
  'FLT': { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-700' },
  'RTG': { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-700' },
  
  // Partes (Shipper, Consignee, Agent)
  'SHP': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  'CNE': { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  'AGT': { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700' },
  'NFY': { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700' },
  
  // Cargos
  'CVD': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  'RTD': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  'OTH': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  'PPD': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  'COL': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  'ACC': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  
  // Mercancía
  'NG': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' },
  'NH': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' },
  'NV': { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700' },
  'NS': { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700' },
  'HTS': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' },
  
  // Manejo especial / Seguridad
  'SSR': { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700' },
  'SPH': { bg: 'bg-fuchsia-50', border: 'border-fuchsia-300', text: 'text-fuchsia-700' },
  'OCI': { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700' },
  'CER': { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
  
  // Otros
  'ISU': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  'REF': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  'TXT': { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' }
};

// ============================================================
// PROPS
// ============================================================

interface CargoImpSegmentViewerProps {
  /** Mensaje generado con todos los segmentos */
  message: GeneratedCargoImpMessage;
  /** Política de aerolínea aplicada */
  policy?: AirlinePolicy;
  /** Callback cuando un segmento es editado */
  onSegmentChange?: (segmentCode: string, newContent: string) => void;
  /** Callback cuando se solicita regenerar el mensaje */
  onRegenerate?: (segments: GeneratedSegment[]) => void;
  /** Callback cuando se toggle un segmento (habilitar/deshabilitar) */
  onToggleSegment?: (segmentCode: string, enabled: boolean) => void;
  /** Mostrar segmentos deshabilitados */
  showDisabled?: boolean;
  /** Modo solo lectura */
  readOnly?: boolean;
  /** Tamaño de las tarjetas */
  cardSize?: 'compact' | 'normal' | 'expanded';
}

// ============================================================
// COMPONENTE: Tarjeta de Segmento Individual
// ============================================================

interface SegmentCardProps {
  segment: GeneratedSegment;
  onEdit?: (code: string, content: string) => void;
  onToggle?: (code: string, enabled: boolean) => void;
  readOnly?: boolean;
  cardSize?: 'compact' | 'normal' | 'expanded';
}

const SegmentCard: FunctionComponent<SegmentCardProps> = ({ 
  segment, 
  onEdit,
  onToggle,
  readOnly = false,
  cardSize = 'normal'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  // Usar originalContent si existe (texto completo sin truncar), sino el content
  const fullContent = segment.originalContent || segment.content;
  const [editContent, setEditContent] = useState(fullContent);
  const [isExpanded, setIsExpanded] = useState(cardSize === 'expanded');
  
  // Detectar si el contenido está truncado/excede el límite
  const isTruncated = segment.originalContent && segment.originalContent.length > segment.content.length;
  const hasExceededLimit = segment.currentLength > segment.maxLength || (segment.originalContent && segment.originalContent.length > segment.maxLength);

  useEffect(() => {
    setEditContent(segment.originalContent || segment.content);
  }, [segment.content, segment.originalContent]);

  const colors = SEGMENT_COLORS[segment.code] || { 
    bg: 'bg-gray-50', 
    border: 'border-gray-300', 
    text: 'text-gray-700' 
  };
  const icon = SEGMENT_ICONS[segment.code] || <FileText size={14} />;

  const handleSave = () => {
    if (onEdit) {
      onEdit(segment.code, editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(segment.content);
    setIsEditing(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(segment.content);
  };

  // Determinar si está dentro del límite
  const isOverLimit = segment.currentLength > segment.maxLength;
  const usagePercent = Math.min(100, (segment.currentLength / segment.maxLength) * 100);

  // Card disabled
  if (!segment.enabled) {
    return (
      <div className="relative group">
        <div className={`
          p-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50
          opacity-60 hover:opacity-80
          transition-all duration-200 ${onToggle ? 'cursor-pointer hover:border-green-400 hover:bg-green-50/30' : 'cursor-not-allowed'}
        `}
        onClick={() => onToggle && onToggle(segment.code, true)}
        >
          <div className="flex items-center gap-2">
            <div className="text-slate-400">{icon}</div>
            <span className="font-mono text-xs font-bold text-slate-400">{segment.code}</span>
            <span className="text-[10px] text-slate-400 truncate flex-1">{segment.name}</span>
            {onToggle ? (
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(segment.code, true); }}
                className="p-1 hover:bg-green-100 rounded transition-colors text-green-600"
                title="Habilitar segmento"
              >
                <Eye size={12} />
              </button>
            ) : (
              <EyeOff size={12} className="text-slate-400" />
            )}
          </div>
          {cardSize !== 'compact' && (
            <div className="mt-1 text-[10px] text-slate-400 italic flex items-center justify-between">
              <span>Deshabilitado por política de aerolínea</span>
              {onToggle && (
                <span className="text-green-600 font-medium">Clic para habilitar →</span>
              )}
            </div>
          )}
        </div>
        {/* Tooltip on hover */}
        <div className="absolute hidden group-hover:block bottom-full left-0 mb-1 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-50 w-56">
          {onToggle 
            ? 'Clic para HABILITAR este segmento y ver sus datos' 
            : 'Este segmento no se incluye según la política configurada para esta aerolínea.'}
        </div>
      </div>
    );
  }

  return (
    <div className={`
      rounded-lg border-2 ${colors.border} ${colors.bg}
      transition-all duration-200 hover:shadow-md
      ${segment.errors.length > 0 ? 'ring-2 ring-red-400' : ''}
      ${hasExceededLimit ? 'ring-2 ring-orange-500 border-orange-400' : ''}
    `}>
      {/* ⚠️ ALERTA: Texto excede el límite máximo */}
      {hasExceededLimit && (
        <div className="bg-orange-500 text-white px-3 py-1.5 text-xs font-medium flex items-center gap-2 rounded-t-md">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>
            ⚠️ EXCEDE LÍMITE: {segment.originalContent?.length || segment.currentLength} / {segment.maxLength} caracteres 
            ({(segment.originalContent?.length || segment.currentLength) - segment.maxLength} de más)
          </span>
          {!readOnly && segment.editable && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsExpanded(true); }}
              className="ml-auto px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] flex items-center gap-1"
            >
              <Edit3 size={10} /> Editar para corregir
            </button>
          )}
        </div>
      )}
      {/* Header del segmento */}
      <div 
        className={`
          flex items-center gap-2 p-2 cursor-pointer
          ${cardSize === 'compact' ? 'py-1' : ''}
        `}
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className={colors.text}>{icon}</div>
        <span className={`font-mono font-bold ${colors.text} text-sm`}>{segment.code}</span>
        <span className={`text-[10px] ${colors.text} opacity-70 truncate flex-1`}>
          {segment.name}
        </span>
        
        {/* Indicador de longitud */}
        <div className="flex items-center gap-1">
          <div 
            className={`
              text-[9px] font-mono px-1.5 py-0.5 rounded
              ${isOverLimit ? 'bg-red-100 text-red-700' : 'bg-white/50 text-slate-500'}
            `}
            title={`${segment.currentLength} / ${segment.maxLength} caracteres`}
          >
            {segment.currentLength}/{segment.maxLength}
          </div>
          
          {/* Barra de progreso mini */}
          <div className="w-8 h-1 bg-white/50 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${isOverLimit ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
        
        {/* Botones de acción */}
        {!readOnly && segment.editable && !isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsExpanded(true); }}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Editar segmento"
          >
            <Edit3 size={12} className={colors.text} />
          </button>
        )}
        
        <button
          onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
          className="p-1 hover:bg-white/50 rounded transition-colors"
          title="Copiar contenido"
        >
          <Copy size={12} className={colors.text} />
        </button>
        
        {/* Botón para deshabilitar segmento */}
        {onToggle && !segment.required && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(segment.code, false); }}
            className="p-1 hover:bg-red-100 rounded transition-colors text-red-400 hover:text-red-600"
            title="Deshabilitar segmento"
          >
            <EyeOff size={12} />
          </button>
        )}
        
        {isExpanded ? (
          <ChevronDown size={14} className={colors.text} />
        ) : (
          <ChevronRight size={14} className={colors.text} />
        )}
      </div>

      {/* Errores/Warnings */}
      {segment.errors.length > 0 && (
        <div className="px-2 pb-1">
          {segment.errors.map((err, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px] text-red-600">
              <AlertTriangle size={10} />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="border-t border-white/50 p-2">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent((e.target as HTMLTextAreaElement).value)}
                className={`
                  w-full font-mono text-xs p-2 rounded border
                  ${editContent.length > segment.maxLength ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'}
                  focus:outline-none focus:ring-2 focus:ring-purple-400
                  resize-none
                `}
                rows={Math.min(10, Math.max(3, fullContent.split('\n').length + 1))}
                spellcheck={false}
              />
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className={`text-[10px] ${editContent.length > segment.maxLength ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                    {editContent.length} / {segment.maxLength} caracteres
                    {editContent.length > segment.maxLength && (
                      <span className="ml-1 text-red-600">
                        (⚠️ {editContent.length - segment.maxLength} de más - ¡Debe reducir!)
                      </span>
                    )}
                  </span>
                  {isTruncated && (
                    <span className="text-[9px] text-orange-600">
                      ℹ️ Mostrando texto original completo para edición
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={handleCancel}
                    className="px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded flex items-center gap-1"
                  >
                    <X size={12} /> Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-1"
                  >
                    <Save size={12} /> Guardar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <pre className={`
              font-mono text-[11px] whitespace-pre-wrap break-all
              ${colors.text} opacity-90 leading-relaxed
            `}>
              {segment.content || <span className="italic text-slate-400">Sin contenido</span>}
            </pre>
          )}
          
          {/* Campos desglosados */}
          {segment.fields.length > 0 && !isEditing && (
            <div className="mt-2 pt-2 border-t border-white/30">
              <div className="text-[9px] text-slate-500 mb-1 uppercase tracking-wide font-semibold">
                Campos:
              </div>
              <div className="flex flex-wrap gap-1">
                {segment.fields.map((field, idx) => (
                  <div 
                    key={idx}
                    className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded border border-white/80"
                    title={`${field.name}: máx ${field.maxLength} chars${field.required ? ' (requerido)' : ''}`}
                  >
                    <span className="font-medium text-slate-600">{field.name}:</span>{' '}
                    <span className={`font-mono ${field.modified ? 'text-purple-600 font-bold' : 'text-slate-700'}`}>
                      {field.value || '-'}
                    </span>
                    <span className="text-slate-400 ml-1">({field.value?.length || 0}/{field.maxLength})</span>
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

// ============================================================
// COMPONENTE PRINCIPAL: Visor de Segmentos
// ============================================================

export const CargoImpSegmentViewer: FunctionComponent<CargoImpSegmentViewerProps> = ({
  message,
  policy,
  onSegmentChange,
  onRegenerate,
  onToggleSegment,
  showDisabled = true,
  readOnly = false,
  cardSize = 'normal'
}) => {
  const [segments, setSegments] = useState<GeneratedSegment[]>(message.segments);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSegments(message.segments);
  }, [message]);

  const handleSegmentEdit = useCallback((code: string, newContent: string) => {
    setSegments(prev => prev.map(seg => 
      seg.code === code 
        ? { ...seg, content: newContent, currentLength: newContent.length }
        : seg
    ));
    if (onSegmentChange) {
      onSegmentChange(code, newContent);
    }
  }, [onSegmentChange]);

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(segments);
    }
  };

  const copyFullMessage = () => {
    navigator.clipboard.writeText(message.fullMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtrar segmentos según showDisabled
  const displaySegments = showDisabled 
    ? segments 
    : segments.filter(s => s.enabled);

  // Estadísticas
  const enabledCount = segments.filter(s => s.enabled).length;
  const disabledCount = segments.filter(s => !s.enabled).length;
  const errorsCount = segments.reduce((acc, s) => acc + s.errors.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`
              px-3 py-1.5 rounded-lg font-bold text-sm
              ${message.type === 'FWB' ? 'bg-purple-600 text-white' : 'bg-sky-600 text-white'}
            `}>
              {message.type}/{message.version.split('/')[1]}
            </div>
            <span className="font-mono text-sm text-slate-600">{message.awbNumber}</span>
            {message.hawbNumber && (
              <span className="font-mono text-xs text-slate-400">→ {message.hawbNumber}</span>
            )}
          </div>
          
          {/* Estado de validación */}
          <div className={`flex items-center gap-1 text-xs ${message.isValid ? 'text-green-600' : 'text-red-600'}`}>
            {message.isValid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {message.isValid ? 'Válido' : `${errorsCount} error${errorsCount !== 1 ? 'es' : ''}`}
          </div>
        </div>

        {/* Estadísticas y acciones */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 space-x-2">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {enabledCount} activos
            </span>
            {disabledCount > 0 && (
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {disabledCount} inactivos
              </span>
            )}
          </div>
          
          <button
            onClick={() => setShowFullMessage(!showFullMessage)}
            className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
          >
            {showFullMessage ? <EyeOff size={12} /> : <Eye size={12} />}
            {showFullMessage ? 'Ocultar' : 'Ver mensaje'}
          </button>
          
          <button
            onClick={copyFullMessage}
            className={`
              px-3 py-1.5 text-xs rounded-lg flex items-center gap-1
              ${copied ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}
            `}
          >
            <Copy size={12} />
            {copied ? '¡Copiado!' : 'Copiar todo'}
          </button>
        </div>
      </div>

      {/* Policy info */}
      {policy && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
          <Info size={12} />
          <span>Política: <strong>{policy.name}</strong> ({policy.awbPrefix})</span>
          <span className="text-slate-300">|</span>
          <span>Versión: {policy.fwbVersion}</span>
          <span className="text-slate-300">|</span>
          <span>SPH: {policy.defaultSphCodes.join(', ')}</span>
          {policy.notes && (
            <>
              <span className="text-slate-300">|</span>
              <span className="italic">{policy.notes}</span>
            </>
          )}
        </div>
      )}

      {/* Vista de mensaje completo */}
      {showFullMessage && (
        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
          <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap">
            {message.fullMessage}
          </pre>
        </div>
      )}

      {/* Grid de segmentos */}
      <div className={`
        grid gap-2
        ${cardSize === 'compact' ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : ''}
        ${cardSize === 'normal' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : ''}
        ${cardSize === 'expanded' ? 'grid-cols-1 md:grid-cols-2' : ''}
      `}>
        {displaySegments.map((segment) => (
          <SegmentCard
            key={`${segment.code}-${segment.order}`}
            segment={segment}
            onEdit={handleSegmentEdit}
            onToggle={onToggleSegment}
            readOnly={readOnly}
            cardSize={cardSize}
          />
        ))}
      </div>

      {/* Botón de regenerar */}
      {!readOnly && onRegenerate && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleRegenerate}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Save size={16} />
            Regenerar mensaje
          </button>
        </div>
      )}

      {/* Leyenda de colores */}
      <div className="border-t border-slate-200 pt-4">
        <div className="text-xs text-slate-500 mb-2 font-semibold">Leyenda de segmentos:</div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="bg-purple-50 border border-purple-300 text-purple-700 px-2 py-0.5 rounded">AWB/Carga</span>
          <span className="bg-sky-50 border border-sky-300 text-sky-700 px-2 py-0.5 rounded">Vuelo/Ruta</span>
          <span className="bg-green-50 border border-green-300 text-green-700 px-2 py-0.5 rounded">Partes</span>
          <span className="bg-amber-50 border border-amber-300 text-amber-700 px-2 py-0.5 rounded">Cargos</span>
          <span className="bg-indigo-50 border border-indigo-300 text-indigo-700 px-2 py-0.5 rounded">Mercancía</span>
          <span className="bg-fuchsia-50 border border-fuchsia-300 text-fuchsia-700 px-2 py-0.5 rounded">Manejo/Seguridad</span>
          <span className="bg-slate-50 border-2 border-dashed border-slate-300 text-slate-400 px-2 py-0.5 rounded">Deshabilitado</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: Selector de Tamaño de Vista
// ============================================================

interface ViewSizeSelectorProps {
  value: 'compact' | 'normal' | 'expanded';
  onChange: (value: 'compact' | 'normal' | 'expanded') => void;
}

export const ViewSizeSelector: FunctionComponent<ViewSizeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {(['compact', 'normal', 'expanded'] as const).map((size) => (
        <button
          key={size}
          onClick={() => onChange(size)}
          className={`
            px-2 py-1 text-xs rounded-md transition-all
            ${value === size ? 'bg-white shadow text-purple-700 font-medium' : 'text-slate-500 hover:text-slate-700'}
          `}
        >
          {size === 'compact' ? 'Compacto' : size === 'normal' ? 'Normal' : 'Expandido'}
        </button>
      ))}
    </div>
  );
};

export default CargoImpSegmentViewer;
