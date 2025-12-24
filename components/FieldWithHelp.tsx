import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface FieldWithHelpProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  example?: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'datetime-local';
  readOnly?: boolean;
  className?: string;
  inputClassName?: string;
}

/**
 * Campo de entrada con tooltip de ayuda
 * - Muestra icono de ayuda que despliega descripción
 * - Indica visualmente si es requerido u opcional
 * - Muestra contador de caracteres si hay maxLength
 */
export const FieldWithHelp: React.FC<FieldWithHelpProps> = ({
  label,
  value,
  onChange,
  description,
  required = false,
  maxLength,
  placeholder,
  example,
  type = 'text',
  readOnly = false,
  className = '',
  inputClassName = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const borderClass = required 
    ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-200' 
    : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100';

  const labelClass = required ? 'text-slate-700' : 'text-slate-500';

  return (
    <div className={`relative ${className}`}>
      {/* Label con icono de ayuda */}
      <div className="flex items-center gap-1 mb-1">
        <label className={`text-xs font-medium ${labelClass}`}>
          {label}
          {required && <span className="text-purple-500 ml-0.5">*</span>}
        </label>
        {!required && (
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">opcional</span>
        )}
        <div className="relative ml-auto">
          <HelpCircle 
            size={14} 
            className="text-slate-400 hover:text-purple-500 cursor-help transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute z-50 right-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg">
              <p className="font-medium mb-1">{label}</p>
              <p className="text-slate-300">{description}</p>
              {maxLength && (
                <p className="text-slate-400 mt-1">Máx: {maxLength} caracteres</p>
              )}
              {example && (
                <p className="text-purple-300 mt-1">Ej: {example}</p>
              )}
              <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        className={`
          w-full px-2 py-1.5 text-sm rounded border
          ${borderClass}
          ${readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}
          focus:outline-none focus:ring-1
          transition-colors
          ${inputClassName}
        `}
      />

      {/* Contador de caracteres */}
      {maxLength && value && (
        <div className="absolute right-1 bottom-1 text-[10px] text-slate-400">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
};

// ============================================================
// SELECT CON AYUDA
// ============================================================

interface SelectWithHelpProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
  description: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export const SelectWithHelp: React.FC<SelectWithHelpProps> = ({
  label,
  value,
  onChange,
  options,
  description,
  required = false,
  placeholder = 'Seleccionar...',
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const borderClass = required 
    ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-200' 
    : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100';

  const labelClass = required ? 'text-slate-700' : 'text-slate-500';

  return (
    <div className={`relative ${className}`}>
      {/* Label con icono de ayuda */}
      <div className="flex items-center gap-1 mb-1">
        <label className={`text-xs font-medium ${labelClass}`}>
          {label}
          {required && <span className="text-purple-500 ml-0.5">*</span>}
        </label>
        {!required && (
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">opcional</span>
        )}
        <div className="relative ml-auto">
          <HelpCircle 
            size={14} 
            className="text-slate-400 hover:text-purple-500 cursor-help transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
          {showTooltip && (
            <div className="absolute z-50 right-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg">
              <p className="font-medium mb-1">{label}</p>
              <p className="text-slate-300">{description}</p>
              <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
            </div>
          )}
        </div>
      </div>

      {/* Select */}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-2 py-1.5 text-sm rounded border h-[34px]
          ${borderClass}
          bg-white
          focus:outline-none focus:ring-1
          transition-colors
        `}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// ============================================================
// TEXTAREA CON AYUDA
// ============================================================

interface TextAreaWithHelpProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export const TextAreaWithHelp: React.FC<TextAreaWithHelpProps> = ({
  label,
  value,
  onChange,
  description,
  required = false,
  maxLength,
  rows = 3,
  placeholder,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const borderClass = required 
    ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-200' 
    : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100';

  const labelClass = required ? 'text-slate-700' : 'text-slate-500';

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1 mb-1">
        <label className={`text-xs font-medium ${labelClass}`}>
          {label}
          {required && <span className="text-purple-500 ml-0.5">*</span>}
        </label>
        {!required && (
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">opcional</span>
        )}
        <div className="relative ml-auto">
          <HelpCircle 
            size={14} 
            className="text-slate-400 hover:text-purple-500 cursor-help transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
          {showTooltip && (
            <div className="absolute z-50 right-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg">
              <p className="font-medium mb-1">{label}</p>
              <p className="text-slate-300">{description}</p>
              {maxLength && (
                <p className="text-slate-400 mt-1">Máx: {maxLength} caracteres</p>
              )}
              <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
            </div>
          )}
        </div>
      </div>

      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={`
          w-full px-2 py-1.5 text-sm rounded border
          ${borderClass}
          bg-white
          focus:outline-none focus:ring-1
          transition-colors resize-none
        `}
      />

      {maxLength && value && (
        <div className="absolute right-2 bottom-2 text-[10px] text-slate-400">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
};

