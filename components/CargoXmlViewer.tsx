/**
 * ============================================================
 * CARGO-XML SEGMENT VIEWER
 * ============================================================
 * Componente para visualizar mensajes Cargo-XML (XFWB/XFZB)
 * con syntax highlighting y estructura en árbol.
 * ============================================================
 */

import { FunctionComponent } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { memo } from 'preact/compat';
import { 
  ChevronDown, ChevronRight, Copy, Check, FileText, 
  AlertTriangle, CheckCircle2, Package, Layers 
} from 'lucide-preact';
import type { CargoXmlResult, CargoXmlBundle } from '../services/cargoXmlService';

// ============================================================
// TIPOS
// ============================================================

interface CargoXmlViewerProps {
  bundle: CargoXmlBundle;
  onCopy?: (content: string, type: string) => void;
}

interface XmlNodeViewerProps {
  xml: string;
  title: string;
  type: 'XFWB' | 'XFZB';
  hawbNumber?: string;
  isValid: boolean;
  errors: string[];
  onCopy?: (content: string) => void;
}

// ============================================================
// HELPER: Syntax Highlighting para XML
// ============================================================

function highlightXml(xml: string): string {
  // Escapar HTML primero
  let escaped = xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Aplicar highlighting
  escaped = escaped
    // Tags de cierre
    .replace(/&lt;\/([a-zA-Z:]+)&gt;/g, '<span class="xml-bracket">&lt;/</span><span class="xml-tag">$1</span><span class="xml-bracket">&gt;</span>')
    // Tags de apertura con atributos
    .replace(/&lt;([a-zA-Z:]+)(\s+[^&]*?)&gt;/g, (match, tag, attrs) => {
      // Procesar atributos
      const processedAttrs = attrs.replace(/([a-zA-Z:]+)="([^"]*)"/g, 
        '<span class="xml-attr-name">$1</span>=<span class="xml-attr-value">"$2"</span>');
      return `<span class="xml-bracket">&lt;</span><span class="xml-tag">${tag}</span>${processedAttrs}<span class="xml-bracket">&gt;</span>`;
    })
    // Tags self-closing
    .replace(/&lt;([a-zA-Z:]+)\s*\/&gt;/g, '<span class="xml-bracket">&lt;</span><span class="xml-tag">$1</span><span class="xml-bracket"> /&gt;</span>')
    // Tags simples sin atributos
    .replace(/&lt;([a-zA-Z:]+)&gt;/g, '<span class="xml-bracket">&lt;</span><span class="xml-tag">$1</span><span class="xml-bracket">&gt;</span>')
    // Declaración XML
    .replace(/&lt;\?xml([^?]*)\?&gt;/g, '<span class="xml-declaration">&lt;?xml$1?&gt;</span>');

  return escaped;
}

// ============================================================
// COMPONENTE: XML Node Viewer (un solo mensaje)
// ============================================================

const XmlNodeViewer = memo<XmlNodeViewerProps>(({ 
  xml, 
  title, 
  type, 
  hawbNumber,
  isValid, 
  errors,
  onCopy 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  // Formatear y resaltar XML
  const formattedXml = useMemo(() => {
    if (viewMode === 'raw') {
      return xml;
    }
    return highlightXml(xml);
  }, [xml, viewMode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xml);
      setCopied(true);
      onCopy?.(xml);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Error copying XML:', e);
    }
  };

  const bgColor = type === 'XFWB' 
    ? 'from-blue-50 to-indigo-50 border-blue-200' 
    : 'from-purple-50 to-pink-50 border-purple-200';

  const headerColor = type === 'XFWB'
    ? 'bg-blue-600'
    : 'bg-purple-600';

  const IconComponent = type === 'XFWB' ? Package : Layers;

  return (
    <div className={`rounded-lg border overflow-hidden mb-4 bg-gradient-to-r ${bgColor}`}>
      {/* Header */}
      <div 
        className={`${headerColor} px-4 py-2.5 flex items-center justify-between cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-white">
          <button className="p-0.5 hover:bg-white/20 rounded">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <IconComponent size={16} />
          <span className="font-bold">{title}</span>
          {hawbNumber && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
              HAWB: {hawbNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isValid ? (
            <span className="flex items-center gap-1 text-xs text-green-200">
              <CheckCircle2 size={12} /> Válido
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-200">
              <AlertTriangle size={12} /> Errores: {errors.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('formatted')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'formatted' 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Formateado
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'raw' 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Raw
              </button>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              {copied ? 'Copiado!' : 'Copiar XML'}
            </button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1">
                <AlertTriangle size={14} /> Errores de validación
              </div>
              <ul className="text-xs text-red-600 list-disc list-inside">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* XML Content */}
          <div className="bg-slate-900 rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-96 p-4">
              {viewMode === 'formatted' ? (
                <pre 
                  className="text-xs font-mono leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formattedXml }}
                />
              ) : (
                <pre className="text-xs font-mono leading-relaxed text-green-400 whitespace-pre-wrap">
                  {xml}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Styles for XML highlighting */}
      <style>{`
        .xml-bracket { color: #9ca3af; }
        .xml-tag { color: #60a5fa; }
        .xml-attr-name { color: #a78bfa; }
        .xml-attr-value { color: #34d399; }
        .xml-declaration { color: #fbbf24; }
        .xml-comment { color: #6b7280; font-style: italic; }
      `}</style>
    </div>
  );
});

// ============================================================
// COMPONENTE PRINCIPAL: Cargo XML Viewer
// ============================================================

export const CargoXmlViewer: FunctionComponent<CargoXmlViewerProps> = memo(({ bundle, onCopy }) => {
  const [activeXmlTab, setActiveXmlTab] = useState<'xfwb' | 'xfzb'>('xfwb');
  const [copiedAll, setCopiedAll] = useState(false);

  const hasXfzbs = bundle.xfzbs && bundle.xfzbs.length > 0;

  // Concatenar todos los XMLs para copiar todo
  const allXmlContent = useMemo(() => {
    let content = bundle.xfwb.xmlContent;
    if (hasXfzbs) {
      bundle.xfzbs.forEach((xfzb, i) => {
        content += `\n\n<!-- ========== XFZB #${i + 1}: ${xfzb.hawbNumber} ========== -->\n\n${xfzb.xmlContent}`;
      });
    }
    return content;
  }, [bundle, hasXfzbs]);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(allXmlContent);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (e) {
      console.error('Error copying all XML:', e);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header con tabs XFWB/XFZB */}
      <div className="flex items-center justify-between mb-4">
        <div className="bg-slate-100 p-1 rounded-lg inline-flex items-center shadow-inner">
          <button
            onClick={() => setActiveXmlTab('xfwb')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
              activeXmlTab === 'xfwb'
                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5 transform scale-105'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Package size={14} />
            XFWB (Master)
          </button>
          {hasXfzbs && (
            <button
              onClick={() => setActiveXmlTab('xfzb')}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeXmlTab === 'xfzb'
                  ? 'bg-white text-purple-700 shadow-sm ring-1 ring-black/5 transform scale-105'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Layers size={14} />
              XFZB (Houses: {bundle.xfzbs.length})
            </button>
          )}
        </div>

        <button
          onClick={handleCopyAll}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          {copiedAll ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copiedAll ? 'Copiado!' : 'Copiar Todo'}
        </button>
      </div>

      {/* Header informativo */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-blue-600" />
          <span className="font-bold text-blue-800">Vista XML - IATA Cargo-XML 3.0</span>
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
            {activeXmlTab === 'xfwb' ? 'XFWB (Waybill)' : 'XFZB (HouseWaybill)'}
          </span>
        </div>
        <p className="text-xs text-blue-600">
          Formato XML estándar IATA ONE Record / Cargo-XML para mensajes electrónicos de guía aérea.
          {activeXmlTab === 'xfwb' 
            ? ' XFWB contiene los datos del Master Air Waybill.' 
            : ' XFZB contiene los datos de las House Waybills.'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeXmlTab === 'xfwb' && bundle.xfwb && (
          <XmlNodeViewer
            xml={bundle.xfwb.xmlContent}
            title={`XFWB - Master AWB ${bundle.xfwb.awbNumber}`}
            type="XFWB"
            isValid={bundle.xfwb.isValid}
            errors={bundle.xfwb.errors}
            onCopy={(content) => onCopy?.(content, 'XFWB')}
          />
        )}

        {activeXmlTab === 'xfzb' && (
          <>
            {hasXfzbs ? (
              <>
                <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-sm font-bold text-purple-800">
                    📦 {bundle.xfzbs.length} Mensaje(s) XFZB
                  </span>
                </div>
                {bundle.xfzbs.map((xfzb, idx) => (
                  <XmlNodeViewer
                    key={idx}
                    xml={xfzb.xmlContent}
                    title={`XFZB #${idx + 1}`}
                    type="XFZB"
                    hawbNumber={xfzb.hawbNumber}
                    isValid={xfzb.isValid}
                    errors={xfzb.errors}
                    onCopy={(content) => onCopy?.(content, `XFZB-${xfzb.hawbNumber}`)}
                  />
                ))}
              </>
            ) : (
              <div className="text-slate-400 italic p-4 text-center">
                No hay houses en este envío. XFZB solo se genera para envíos consolidados.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default CargoXmlViewer;
