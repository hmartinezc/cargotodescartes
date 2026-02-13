/**
 * CARGO-IMP (IATA CIMP) - Tipos y Definiciones
 * Formato EDI plano para mensajes FWB/FHL
 * 
 * Basado en el manual técnico legacy Traxon - Casos 2, 4 y 5
 * Versiones soportadas: FWB/16, FWB/17, FHL/4
 * 
 * @author Senior Solutions Architect
 * @version 1.0.0
 */

// ============================================================
// VERSIONES DE MENSAJE
// ============================================================

export type FwbVersion = 'FWB/9' | 'FWB/16' | 'FWB/17';
export type FhlVersion = 'FHL/2' | 'FHL/4';

// ============================================================
// SEGMENTOS EDI - Definiciones
// ============================================================

/**
 * Tipos de segmentos FWB disponibles
 */
export type FwbSegmentType = 
  | 'FWB'   // Mensaje Header
  | 'AWB'   // Air Waybill Number
  | 'FLT'   // Flight
  | 'RTG'   // Routing
  | 'SHP'   // Shipper
  | 'CNE'   // Consignee
  | 'AGT'   // Agent
  | 'SSR'   // Special Service Request
  | 'ACC'   // Accounting Information
  | 'CVD'   // Charge Declarations
  | 'RTD'   // Rate Description
  | 'NG'    // Nature of Goods
  | 'NH'    // Harmonized Code
  | 'NV'    // Volume (Cubic Meters)
  | 'NS'    // SLAC (Pieces)
  | 'OTH'   // Other Charges
  | 'PPD'   // Prepaid Charges
  | 'COL'   // Collect Charges
  | 'CER'   // Certification
  | 'ISU'   // Issue
  | 'REF'   // Reference
  | 'SPH'   // Special Handling
  | 'OCI'   // Other Customs Information
  | 'NFY'   // Notify
  | 'FTR';  // Footer

/**
 * Tipos de segmentos FHL disponibles
 */
export type FhlSegmentType =
  | 'FHL'   // Mensaje Header
  | 'MBI'   // Master Bill Information
  | 'HBS'   // House Bill Summary
  | 'HTS'   // Harmonized Tariff Schedule
  | 'OCI'   // Other Customs Information
  | 'SHP'   // Shipper (House)
  | 'CNE'   // Consignee (House)
  | 'CVD'   // Charge Declarations
  | 'TXT'   // Free Text
  | 'FTR';  // Footer

/**
 * Información de un segmento EDI
 */
export interface SegmentInfo {
  /** Código del segmento (ej: 'AWB', 'SHP') */
  code: string;
  /** Nombre del segmento */
  name: string;
  /** Descripción del segmento */
  description: string;
  /** Es obligatorio en el mensaje */
  required: boolean;
  /** Longitud máxima del contenido (aproximada) */
  maxLength: number;
  /** Orden de aparición en el mensaje */
  order: number;
  /** Versiones donde está disponible */
  versions: (FwbVersion | FhlVersion)[];
  /** Campos del segmento */
  fields: SegmentField[];
}

/**
 * Campo dentro de un segmento
 */
export interface SegmentField {
  /** Nombre del campo */
  name: string;
  /** Descripción */
  description: string;
  /** Longitud máxima */
  maxLength: number;
  /** Es obligatorio */
  required: boolean;
  /** Tipo de dato */
  type: 'string' | 'number' | 'date' | 'code';
  /** Valores permitidos (si es código) */
  allowedValues?: string[];
}

/**
 * Segmento con su contenido generado
 */
export interface GeneratedSegment {
  /** Tipo de segmento */
  type: FwbSegmentType | FhlSegmentType;
  /** Código del segmento */
  code: string;
  /** Nombre legible */
  name: string;
  /** Contenido generado */
  content: string;
  /** Contenido original sin recortar (si se truncó) */
  originalContent?: string;
  /** Orden en el mensaje */
  order: number;
  /** Si está habilitado (puede deshabilitarse por política) */
  enabled: boolean;
  /** Si es editable por el usuario */
  editable: boolean;
  /** Longitud actual del contenido */
  currentLength: number;
  /** Longitud máxima permitida */
  maxLength: number;
  /** Errores de validación */
  errors: string[];
  /** Advertencias */
  warnings: string[];
  /** Si el segmento es requerido (no se puede deshabilitar) */
  required?: boolean;
  /** Campos desglosados para edición */
  fields: GeneratedField[];
}

/**
 * Campo generado dentro del segmento
 */
export interface GeneratedField {
  /** Nombre del campo */
  name: string;
  /** Valor actual */
  value: string;
  /** Valor original (antes de edición) */
  originalValue: string;
  /** Longitud máxima */
  maxLength: number;
  /** Es obligatorio */
  required: boolean;
  /** Si fue modificado */
  modified: boolean;
  /** Error de validación */
  error?: string;
}

// ============================================================
// DEFINICIÓN DE SEGMENTOS FWB
// ============================================================

export const FWB_SEGMENTS: Record<FwbSegmentType, SegmentInfo> = {
  FWB: {
    code: 'FWB',
    name: 'Message Header',
    description: 'Cabecera del mensaje FWB con versión (incluye UNB/UNH en Caso 7)',
    required: true,
    maxLength: 200,
    order: 1,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'version', description: 'Versión del mensaje', maxLength: 7, required: true, type: 'string' }
    ]
  },
  AWB: {
    code: 'AWB',
    name: 'Air Waybill Number',
    description: 'Número de guía aérea con origen, destino, piezas y peso',
    required: true,
    maxLength: 50,
    order: 2,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'awbNumber', description: 'Número AWB (11 dígitos sin guión)', maxLength: 11, required: true, type: 'string' },
      { name: 'origin', description: 'Aeropuerto origen (3 chars)', maxLength: 3, required: true, type: 'code' },
      { name: 'destination', description: 'Aeropuerto destino (3 chars)', maxLength: 3, required: true, type: 'code' },
      { name: 'pieces', description: 'Número de piezas', maxLength: 5, required: true, type: 'number' },
      { name: 'weight', description: 'Peso bruto', maxLength: 10, required: true, type: 'number' }
    ]
  },
  FLT: {
    code: 'FLT',
    name: 'Flight',
    description: 'Información de vuelo(s)',
    required: false,
    maxLength: 80,
    order: 3,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'flight1', description: 'Vuelo 1 (carrier+número)', maxLength: 10, required: false, type: 'string' },
      { name: 'date1', description: 'Fecha vuelo 1 (DDMMM)', maxLength: 5, required: false, type: 'date' },
      { name: 'flight2', description: 'Vuelo 2', maxLength: 10, required: false, type: 'string' },
      { name: 'date2', description: 'Fecha vuelo 2', maxLength: 5, required: false, type: 'date' }
    ]
  },
  RTG: {
    code: 'RTG',
    name: 'Routing',
    description: 'Ruta del envío (aeropuertos y aerolíneas)',
    required: true,
    maxLength: 100,
    order: 4,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'segment1', description: 'Primer segmento (AEROPUERTO+CARRIER)', maxLength: 6, required: true, type: 'string' },
      { name: 'segment2', description: 'Segundo segmento', maxLength: 6, required: false, type: 'string' },
      { name: 'segment3', description: 'Tercer segmento', maxLength: 6, required: false, type: 'string' }
    ]
  },
  SHP: {
    code: 'SHP',
    name: 'Shipper',
    description: 'Información del exportador/embarcador',
    required: true,
    maxLength: 200,
    order: 5,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'name', description: 'Nombre (máx 35 chars)', maxLength: 35, required: true, type: 'string' },
      { name: 'address', description: 'Dirección (máx 35 chars)', maxLength: 35, required: true, type: 'string' },
      { name: 'city', description: 'Ciudad', maxLength: 17, required: true, type: 'string' },
      { name: 'country', description: 'País (2 chars ISO)', maxLength: 2, required: true, type: 'code' },
      { name: 'postalCode', description: 'Código postal (máx 9 chars)', maxLength: 9, required: false, type: 'string' },
      { name: 'phone', description: 'Teléfono', maxLength: 25, required: false, type: 'string' }
    ]
  },
  CNE: {
    code: 'CNE',
    name: 'Consignee',
    description: 'Información del importador/consignatario',
    required: true,
    maxLength: 200,
    order: 6,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'name', description: 'Nombre (máx 35 chars)', maxLength: 35, required: true, type: 'string' },
      { name: 'address', description: 'Dirección (máx 35 chars)', maxLength: 35, required: true, type: 'string' },
      { name: 'city', description: 'Ciudad', maxLength: 17, required: true, type: 'string' },
      { name: 'state', description: 'Estado (solo USA, 2 chars)', maxLength: 2, required: false, type: 'code' },
      { name: 'country', description: 'País (2 chars ISO)', maxLength: 2, required: true, type: 'code' },
      { name: 'postalCode', description: 'Código postal (máx 9 chars)', maxLength: 9, required: true, type: 'string' },
      { name: 'phone', description: 'Teléfono', maxLength: 25, required: false, type: 'string' }
    ]
  },
  AGT: {
    code: 'AGT',
    name: 'Agent',
    description: 'Información del agente de carga',
    required: true,
    maxLength: 100,
    order: 7,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'iataCode', description: 'Código IATA (7 dígitos)', maxLength: 7, required: true, type: 'string' },
      { name: 'cassCode', description: 'Código CASS (4 dígitos)', maxLength: 4, required: false, type: 'string' },
      { name: 'name', description: 'Nombre agencia', maxLength: 35, required: true, type: 'string' },
      { name: 'city', description: 'Ciudad', maxLength: 17, required: true, type: 'string' }
    ]
  },
  SSR: {
    code: 'SSR',
    name: 'Special Service Request',
    description: 'Instrucciones especiales de manejo',
    required: false,
    maxLength: 200,
    order: 8,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'line1', description: 'Línea 1 (máx 65 chars)', maxLength: 65, required: false, type: 'string' },
      { name: 'line2', description: 'Línea 2 (máx 65 chars)', maxLength: 65, required: false, type: 'string' },
      { name: 'line3', description: 'Línea 3 (máx 65 chars)', maxLength: 65, required: false, type: 'string' }
    ]
  },
  ACC: {
    code: 'ACC',
    name: 'Accounting Information',
    description: 'Información contable',
    required: false,
    maxLength: 50,
    order: 9,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'accountingInfo', description: 'Info contable (máx 34 chars)', maxLength: 34, required: false, type: 'string' }
    ]
  },
  CVD: {
    code: 'CVD',
    name: 'Charge Declarations',
    description: 'Declaraciones de cargos (moneda, prepaid/collect, valores)',
    required: true,
    maxLength: 80,
    order: 10,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'currency', description: 'Código moneda (3 chars)', maxLength: 3, required: true, type: 'code' },
      { name: 'wtOt', description: 'Weight/Other (PP, CC, PC, CP)', maxLength: 2, required: true, type: 'code', allowedValues: ['PP', 'CC', 'PC', 'CP'] },
      { name: 'declaredCarriage', description: 'Valor declarado transporte (o NVD)', maxLength: 15, required: true, type: 'string' },
      { name: 'declaredCustoms', description: 'Valor declarado aduanas (o NCV)', maxLength: 15, required: true, type: 'string' },
      { name: 'declaredInsurance', description: 'Valor asegurado (o XXX)', maxLength: 15, required: true, type: 'string' }
    ]
  },
  RTD: {
    code: 'RTD',
    name: 'Rate Description',
    description: 'Descripción de tarifas (líneas de cobro)',
    required: true,
    maxLength: 300,
    order: 11,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'lineNumber', description: 'Número de línea', maxLength: 2, required: true, type: 'number' },
      { name: 'pieces', description: 'Número de piezas', maxLength: 5, required: true, type: 'number' },
      { name: 'weight', description: 'Peso bruto', maxLength: 10, required: true, type: 'number' },
      { name: 'rateClass', description: 'Clase de tarifa (C, M, N, Q)', maxLength: 2, required: true, type: 'code' },
      { name: 'commodity', description: 'Código commodity (4 dígitos)', maxLength: 4, required: false, type: 'string' },
      { name: 'chargeableWeight', description: 'Peso cobrable', maxLength: 10, required: false, type: 'number' },
      { name: 'rate', description: 'Tarifa', maxLength: 10, required: false, type: 'number' },
      { name: 'total', description: 'Total línea', maxLength: 15, required: false, type: 'number' }
    ]
  },
  NG: {
    code: 'NG',
    name: 'Nature of Goods',
    description: 'Naturaleza de la mercancía',
    required: true,
    maxLength: 30,
    order: 12,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'description', description: 'Descripción mercancía (máx 20 chars)', maxLength: 20, required: true, type: 'string' }
    ]
  },
  NH: {
    code: 'NH',
    name: 'Harmonized Code',
    description: 'Códigos arancelarios HTS',
    required: false,
    maxLength: 200,
    order: 13,
    versions: ['FWB/16', 'FWB/17'],
    fields: [
      { name: 'codes', description: 'Códigos HTS separados (múltiples)', maxLength: 15, required: false, type: 'string' }
    ]
  },
  NV: {
    code: 'NV',
    name: 'Volume',
    description: 'Volumen total en metros cúbicos (suma de houses)',
    required: false,
    maxLength: 20,
    order: 14,
    versions: ['FWB/16', 'FWB/17'],
    fields: [
      { name: 'volume', description: 'Volumen en M3 con prefijo MC', maxLength: 15, required: false, type: 'number' }
    ]
  },
  NS: {
    code: 'NS',
    name: 'SLAC',
    description: 'Shipper Load and Count (piezas del master)',
    required: false,
    maxLength: 15,
    order: 15,
    versions: ['FWB/16', 'FWB/17'],
    fields: [
      { name: 'pieces', description: 'Número de piezas', maxLength: 10, required: false, type: 'number' }
    ]
  },
  OTH: {
    code: 'OTH',
    name: 'Other Charges',
    description: 'Otros cargos (AWC, AWA, MY)',
    required: false,
    maxLength: 150,
    order: 14,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'prepaidOrCollect', description: 'P=Prepaid, C=Collect', maxLength: 1, required: true, type: 'code', allowedValues: ['P', 'C'] },
      { name: 'chargeCode', description: 'Código cargo (AWC, AWA, MY)', maxLength: 3, required: true, type: 'code' },
      { name: 'amount', description: 'Monto', maxLength: 15, required: true, type: 'number' }
    ]
  },
  PPD: {
    code: 'PPD',
    name: 'Prepaid Charges',
    description: 'Resumen de cargos prepagados',
    required: false,
    maxLength: 100,
    order: 15,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'weightCharge', description: 'Cargo por peso', maxLength: 15, required: false, type: 'number' },
      { name: 'dueAgent', description: 'Due Agent', maxLength: 15, required: false, type: 'number' },
      { name: 'dueCarrier', description: 'Due Carrier', maxLength: 15, required: false, type: 'number' },
      { name: 'total', description: 'Total', maxLength: 15, required: true, type: 'number' }
    ]
  },
  COL: {
    code: 'COL',
    name: 'Collect Charges',
    description: 'Resumen de cargos por cobrar',
    required: false,
    maxLength: 100,
    order: 16,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'weightCharge', description: 'Cargo por peso', maxLength: 15, required: false, type: 'number' },
      { name: 'dueAgent', description: 'Due Agent', maxLength: 15, required: false, type: 'number' },
      { name: 'dueCarrier', description: 'Due Carrier', maxLength: 15, required: false, type: 'number' },
      { name: 'total', description: 'Total', maxLength: 15, required: true, type: 'number' }
    ]
  },
  CER: {
    code: 'CER',
    name: 'Certification',
    description: 'Certificación del embarcador',
    required: false,
    maxLength: 30,
    order: 17,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'signature', description: 'Firma (máx 20 chars)', maxLength: 20, required: false, type: 'string' }
    ]
  },
  ISU: {
    code: 'ISU',
    name: 'Issue',
    description: 'Ejecución del transportista (fecha, lugar, firma)',
    required: true,
    maxLength: 60,
    order: 18,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'date', description: 'Fecha (DDMMMYY)', maxLength: 7, required: true, type: 'date' },
      { name: 'place', description: 'Lugar', maxLength: 17, required: true, type: 'string' },
      { name: 'signature', description: 'Firma (máx 20 chars)', maxLength: 20, required: false, type: 'string' }
    ]
  },
  REF: {
    code: 'REF',
    name: 'Reference',
    description: 'Referencia del remitente (agente)',
    required: true,
    maxLength: 50,
    order: 19,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'agentRef', description: 'Referencia AGT/IATA/CASS/ORIGEN', maxLength: 30, required: true, type: 'string' }
    ]
  },
  SPH: {
    code: 'SPH',
    name: 'Special Handling',
    description: 'Códigos de manejo especial (EAP, PER, etc.)',
    required: true,
    maxLength: 50,
    order: 20,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'codes', description: 'Códigos SPH separados por /', maxLength: 40, required: true, type: 'string' }
    ]
  },
  OCI: {
    code: 'OCI',
    name: 'Other Customs Information',
    description: 'Información aduanera/seguridad (EORI, TIN)',
    required: false,
    maxLength: 200,
    order: 21,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: [
      { name: 'countryCode', description: 'País (2 chars)', maxLength: 2, required: true, type: 'code' },
      { name: 'party', description: 'Parte (CNE, SHP, AGT)', maxLength: 3, required: true, type: 'code', allowedValues: ['CNE', 'SHP', 'AGT'] },
      { name: 'type', description: 'Tipo (T=TIN, RA=RegAgent)', maxLength: 2, required: true, type: 'code' },
      { name: 'value', description: 'Valor (NIT, EORI, etc.)', maxLength: 35, required: true, type: 'string' }
    ]
  },
  NFY: {
    code: 'NFY',
    name: 'Notify',
    description: 'Información de notificación (también notify party)',
    required: false,
    maxLength: 200,
    order: 22,
    versions: ['FWB/16', 'FWB/17'],
    fields: [
      { name: 'name', description: 'Nombre (máx 35 chars)', maxLength: 35, required: false, type: 'string' },
      { name: 'address', description: 'Dirección (máx 35 chars)', maxLength: 35, required: false, type: 'string' },
      { name: 'city', description: 'Ciudad', maxLength: 17, required: false, type: 'string' },
      { name: 'country', description: 'País (2 chars ISO)', maxLength: 2, required: false, type: 'code' },
      { name: 'phone', description: 'Teléfono', maxLength: 25, required: false, type: 'string' }
    ]
  },
  FTR: {
    code: 'FTR',
    name: 'Footer',
    description: 'Pie del mensaje (UNT/UNZ)',
    required: true,
    maxLength: 100,
    order: 23,
    versions: ['FWB/9', 'FWB/16', 'FWB/17'],
    fields: []
  }
};

// ============================================================
// DEFINICIÓN DE SEGMENTOS FHL
// ============================================================

export const FHL_SEGMENTS: Record<FhlSegmentType, SegmentInfo> = {
  FHL: {
    code: 'FHL',
    name: 'Message Header',
    description: 'Cabecera del mensaje FHL con versión (incluye UNB/UNH en Caso 7)',
    required: true,
    maxLength: 200,
    order: 1,
    versions: ['FHL/2', 'FHL/4'],
    fields: [
      { name: 'version', description: 'Versión del mensaje', maxLength: 7, required: true, type: 'string' }
    ]
  },
  MBI: {
    code: 'MBI',
    name: 'Master Bill Information',
    description: 'Información del Master AWB',
    required: true,
    maxLength: 60,
    order: 2,
    versions: ['FHL/2', 'FHL/4'],
    fields: [
      { name: 'awbNumber', description: 'Número AWB master', maxLength: 11, required: true, type: 'string' },
      { name: 'origin', description: 'Origen', maxLength: 3, required: true, type: 'code' },
      { name: 'destination', description: 'Destino', maxLength: 3, required: true, type: 'code' },
      { name: 'totalPieces', description: 'Piezas totales master', maxLength: 5, required: true, type: 'number' },
      { name: 'totalWeight', description: 'Peso total master', maxLength: 10, required: true, type: 'number' }
    ]
  },
  HBS: {
    code: 'HBS',
    name: 'House Bill Summary',
    description: 'Resumen de guía hija (HAWB)',
    required: true,
    maxLength: 80,
    order: 3,
    versions: ['FHL/2', 'FHL/4'],
    fields: [
      { name: 'hawbNumber', description: 'Número HAWB', maxLength: 20, required: true, type: 'string' },
      { name: 'origin', description: 'Origen', maxLength: 3, required: true, type: 'code' },
      { name: 'destination', description: 'Destino', maxLength: 3, required: true, type: 'code' },
      { name: 'pieces', description: 'Piezas', maxLength: 5, required: true, type: 'number' },
      { name: 'weight', description: 'Peso', maxLength: 10, required: true, type: 'number' },
      { name: 'natureOfGoods', description: 'Descripción (máx 11 chars)', maxLength: 11, required: true, type: 'string' }
    ]
  },
  TXT: {
    code: 'TXT',
    name: 'Free Text (Nature of Goods)',
    description: 'Texto libre - Descripción completa de la mercancía (natureOfGoods)',
    required: false,
    maxLength: 100,
    order: 4,
    versions: ['FHL/4'],
    fields: [
      { name: 'text', description: 'Descripción completa de mercancía', maxLength: 70, required: false, type: 'string' }
    ]
  },
  HTS: {
    code: 'HTS',
    name: 'Harmonized Tariff Schedule',
    description: 'Código arancelario para la house',
    required: false,
    maxLength: 20,
    order: 5,
    versions: ['FHL/4'],
    fields: [
      { name: 'code', description: 'Código HTS', maxLength: 15, required: false, type: 'string' }
    ]
  },
  OCI: {
    code: 'OCI',
    name: 'Other Customs Information',
    description: 'Información aduanera para la house',
    required: false,
    maxLength: 100,
    order: 6,
    versions: ['FHL/2', 'FHL/4'],
    fields: [
      { name: 'countryCode', description: 'País (2 chars)', maxLength: 2, required: true, type: 'code' },
      { name: 'party', description: 'Parte (CNE, SHP)', maxLength: 3, required: true, type: 'code' },
      { name: 'type', description: 'Tipo (T=TIN)', maxLength: 2, required: true, type: 'code' },
      { name: 'value', description: 'Valor (NIT, EORI)', maxLength: 35, required: true, type: 'string' }
    ]
  },
  SHP: {
    code: 'SHP',
    name: 'Shipper (House)',
    description: 'Exportador de la guía hija',
    required: true,
    maxLength: 150,
    order: 7,
    versions: ['FHL/2', 'FHL/4'],
    fields: [
      { name: 'name', description: 'Nombre (máx 35 chars)', maxLength: 35, required: true, type: 'string' },
      { name: 'address', description: 'Dirección (máx 35 chars)', maxLength: 35, required: true, type: 'string' },
      { name: 'city', description: 'Ciudad', maxLength: 17, required: true, type: 'string' },
      { name: 'country', description: 'País (2 chars)', maxLength: 2, required: true, type: 'code' },
      { name: 'postalCode', description: 'Código postal', maxLength: 9, required: false, type: 'string' }
    ]
  },
  CNE: {
    code: 'CNE',
    name: 'Consignee (House)',
    description: 'Importador de la guía hija',
    required: true,
    maxLength: 150,
    order: 8,
    versions: ['FHL/2', 'FHL/4'],
    fields: [
      { name: 'name', description: 'Nombre (máx 35 chars)', maxLength: 35, required: true, type: 'string' },
      { name: 'address', description: 'Dirección (máx 35 chars)', maxLength: 35, required: true, type: 'string' },
      { name: 'city', description: 'Ciudad', maxLength: 17, required: true, type: 'string' },
      { name: 'state', description: 'Estado (solo USA)', maxLength: 2, required: false, type: 'code' },
      { name: 'country', description: 'País (2 chars)', maxLength: 2, required: true, type: 'code' },
      { name: 'postalCode', description: 'Código postal', maxLength: 9, required: true, type: 'string' }
    ]
  },
  CVD: {
    code: 'CVD',
    name: 'Charge Declarations (House)',
    description: 'Declaraciones de cargos para la house',
    required: true,
    maxLength: 50,
    order: 9,
    versions: ['FHL/2', 'FHL/4'],
    fields: [
      { name: 'currency', description: 'Moneda', maxLength: 3, required: true, type: 'code' },
      { name: 'wtOt', description: 'PP/CC', maxLength: 2, required: true, type: 'code' },
      { name: 'declaredCarriage', description: 'NVD', maxLength: 10, required: true, type: 'string' },
      { name: 'declaredCustoms', description: 'NCV', maxLength: 10, required: true, type: 'string' },
      { name: 'declaredInsurance', description: 'XXX', maxLength: 10, required: true, type: 'string' }
    ]
  },
  FTR: {
    code: 'FTR',
    name: 'Footer',
    description: 'Pie del mensaje',
    required: true,
    maxLength: 100,
    order: 10,
    versions: ['FHL/2', 'FHL/4'],
    fields: []
  }
};

// ============================================================
// POLÍTICAS POR AEROLÍNEA
// ============================================================

export type PolicyOption = 0 | 1 | 2 | 3 | 4;

/** Prioridades IATA Type B messaging */
export type TypeBPriority = 'QK' | 'QD' | 'QP' | 'QU';

/** 
 * Configuración Type B para Descartes/Traxon
 * 
 * Formato IATA Type B según Wikipedia/Airline Teletype System:
 *   QK HKGFFLH              <- Priority + ESPACIO + Dirección destino (7 chars)
 *   .BOGFFAV 231201         <- .Dirección origen (7 chars) + ESPACIO + timestamp (DDHHmm)
 * 
 * Dirección IATA = 7 caracteres:
 *   - 3 chars: Código ubicación IATA (ciudad/aeropuerto)
 *   - 2 chars: Código función (FF=Cargo, FX=Freight Express, etc.)
 *   - 2 chars: Código aerolínea IATA
 * 
 * Ejemplo: BOGFFAV = BOG (Bogotá) + FF (Cargo) + AV (Avianca)
 */
export interface TypeBConfig {
  /**
   * Dirección del destinatario (recipiente) - FIJA para Descartes
   * DSGUNXA = "Descartes Universal Header" - ellos enrutan automáticamente
   * según el contenido del mensaje a la aerolínea correcta.
   */
  recipientAddress: string;
  /**
   * Prefijo del sender en la línea 2 del header Type B - FIJO para Descartes
   * DSGTPXA = Prefijo estándar de Descartes
   * Formato final: .DSGTPXA DDHHmm <originAddress>
   */
  senderPrefix: string;
  /** 
   * Dirección origen completa del sender/agente (identificador único)
   * Ejemplo: TDVAGT03OPERFLOR/BOG1
   * Este valor identifica al agente que envía el mensaje.
   */
  originAddress: string;
  /** Ciudad origen por defecto para construir dirección (ej: BOG) */
  defaultOrigin: string;
  /** Prioridad por defecto */
  defaultPriority: TypeBPriority;
  /** 
   * Código función para direcciones IATA Type B (2 chars)
   * FF = Cargo Office (por defecto)
   * FX = Freight Express
   * CF = Cargo Filing
   * NOTA: Ya no se usa con Descartes Universal Header
   */
  functionCode: string;
  /**
   * Incluir timestamp (DDHHmm) en la segunda línea del header Type B
   * true = incluye timestamp (formato estándar IATA/Descartes)
   * false = omite el timestamp
   */
  includeTimestamp: boolean;
}

/** Configuración Type B por defecto para Descartes */
export const DEFAULT_TYPEB_CONFIG: TypeBConfig = {
  recipientAddress: 'DSGUNXA',              // Descartes Universal Header - enruta automáticamente
  senderPrefix: 'DSGTPXA',                   // Prefijo fijo de Descartes para sender line
  originAddress: 'TDVAGT03OPERFLOR/BOG1',    // Identificador del agente (proporcionado por Descartes)
  defaultOrigin: 'BOG',
  defaultPriority: 'QK',
  functionCode: 'FF',                        // Cargo Office (legacy, no usado con Descartes)
  includeTimestamp: true                     // Descartes requiere timestamp DDHHmm
};

export interface AirlinePolicy {
  /** Código AWB prefix (3 dígitos) */
  awbPrefix: string;
  /** Nombre de la aerolínea */
  name: string;
  /** Política (case = policy/10, option = policy%10) */
  policy: number;
  /** Versión FWB preferida */
  fwbVersion: FwbVersion;
  /** Versión FHL preferida */
  fhlVersion: FhlVersion;
  /** Segmentos FWB habilitados para esta aerolínea */
  enabledSegments: FwbSegmentType[];
  /** Segmentos FWB deshabilitados */
  disabledSegments: FwbSegmentType[];
  /** Segmentos FHL habilitados para esta aerolínea */
  enabledFhlSegments?: FhlSegmentType[];
  /** Segmentos FHL deshabilitados */
  disabledFhlSegments?: FhlSegmentType[];
  /** Códigos SPH por defecto */
  defaultSphCodes: string[];
  /** Formato OCI (EORI con prefijo o sin) */
  ociFormat: 'withPrefix' | 'withoutPrefix';
  /** Requiere header/footer UNB/UNZ */
  includeUnbUnz: boolean;
  /** Notas adicionales */
  notes?: string;
  
  // === Propiedades extendidas según legacy ===
  
  /** CER usa nombre de agencia en vez de firma (Emirates 176) */
  useAgencyNameForCER?: boolean;
  /** Requiere código HTS obligatorio (Turkish 235, Ethiopian 369) */
  requiresHTS?: boolean;
  /** Usar código postal fijo 170452 para Ecuador→China (Air China 176) */
  requiresChinaPostalCode?: boolean;
  /** Usar NG=NC/CONSOLIDATE FLOWERS para consolidados (LATAM 985, 145) */
  useConsolidatedNG?: boolean;
  /** FHL siempre incluye header/footer EDIFACT - Caso 7 DHL/ABX (option=-1) */
  fhlAlwaysWithHeader?: boolean;
  /** Caso 8: MBI solo en primera HAWB, FHLs sin separador & */
  mbiOnlyFirstHawb?: boolean;
  /** Prefijo de HAWB especiales que necesitan agregar 0 (CM,SK,LG → 0CM,0SK,0LG) */
  hawbPrefixAdd0?: string[];
  /** Dirección Traxon de la aerolínea (aux_info) */
  airlineAddress?: string;
  /** País del emisor: 'EC' = Ecuador, 'CO' = Colombia */
  senderCountry?: 'EC' | 'CO';
  
  // === Type B Header (alternativa a EDIFACT UNB/UNZ) ===
  
  /** Usar formato Type B en lugar de EDIFACT envelope */
  useTypeBHeader?: boolean;
  /** Prioridad para Type B: QK=normal, QD=deferred, QP=priority, QU=urgent */
  typeBPriority?: 'QK' | 'QD' | 'QP' | 'QU';
}

/**
 * Políticas por defecto según documentación legacy
 */
export const DEFAULT_AIRLINE_POLICIES: Record<string, AirlinePolicy> = {
  '075': { // IBERIA
    awbPrefix: '075',
    name: 'Iberia',
    policy: 20, // case 2, option 0
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'RTG', 'SHP', 'CNE', 'AGT', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['FLT', 'SSR', 'ACC', 'OTH', 'CER', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true
  },
  '145': { // LATAM
    awbPrefix: '145',
    name: 'LATAM',
    policy: 21, // case 2, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true
  },
  '074': { // KLM
    awbPrefix: '074',
    name: 'KLM',
    policy: 24, // case 2, option 4
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true,
    notes: 'KLM requiere todos los segmentos incluyendo OTH'
  },
  '157': { // QATAR
    awbPrefix: '157',
    name: 'Qatar Airways',
    policy: 23, // case 2, option 3
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'FLT', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true
  },
  '369': { // ATLAS
    awbPrefix: '369',
    name: 'Atlas Air / Ethiopian',
    policy: 22, // case 2, option 2
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    // Según legacy Reservas.cs:3048-3056, orden para option=2:
    // AWB + FLT + RTG + SHP + CNE + AGT + SSR + ACC + CVD + RTD + NG + NH + PPD + COL + CER + ISU + REF + SPH + OCI (sin OTH)
    // FWB se incluye pero solo genera la línea de versión (FWB/16) sin UNB/UNH (Reservas.cs:1447-1470)
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI'],
    disabledSegments: ['SSR', 'FTR', 'OTH', 'NFY'], // Sin UNB/UNH/UNT/UNZ ni OTH, pero SÍ incluye línea FWB/16
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: false,
    notes: 'Atlas/Ethiopian: sin header UNB/UNH ni footer UNT/UNZ, pero SÍ incluye línea FWB/16'
  },
  '176': { // EMIRATES
    awbPrefix: '176',
    name: 'Emirates',
    policy: 41, // case 4, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true,
    useAgencyNameForCER: true, // CER usa agencia_nombre en vez de firma
    notes: 'Emirates: CER usa nombre de agencia'
  },
  '235': { // TURKISH
    awbPrefix: '235',
    name: 'Turkish Airlines',
    policy: 41, // case 4, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true,
    requiresHTS: true,
    notes: 'Turkish: requiere código HTS'
  },
  '992': { // DHL Aviation (European Air Transport Leipzig)
    awbPrefix: '992',
    name: 'DHL Aviation (992)',
    policy: 71, // case 7, option 1 - DHL style
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'NFY', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true,
    fhlAlwaysWithHeader: true, // FHL siempre con UNB/UNZ
    notes: 'DHL Aviation: Caso 7 - FHL siempre incluye header/footer EDIFACT'
  },
  '999': { // Polar Air Cargo / DHL Logistics
    awbPrefix: '999',
    name: 'Polar Air Cargo (DHL)',
    policy: 71, // case 7
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'NFY', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true,
    fhlAlwaysWithHeader: true,
    notes: 'Polar Air (DHL): Caso 7'
  },
  '985': { // LATAM CARGO
    awbPrefix: '985',
    name: 'LATAM Cargo',
    policy: 21, // case 2, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true,
    useConsolidatedNG: true, // NG=NC/CONSOLIDATE FLOWERS para consolidados
    notes: 'LATAM Cargo: NG especial para consolidados'
  },
  '045': { // AVIANCA CARGO
    awbPrefix: '045',
    name: 'Avianca Cargo',
    policy: 21, // case 2, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true
  },
  // === CASO 7: DHL / ABX ===
  // Nota: D5 es carrier code, no AWB prefix. Los AWB de DHL usan prefijos 992, 999.
  '155': { // ABX Air
    awbPrefix: '155',
    name: 'ABX Air',
    policy: 71, // case 7, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'NFY', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true,
    fhlAlwaysWithHeader: true,
    notes: 'ABX Air Caso 7: FHL siempre incluye header/footer EDIFACT'
  },
  // === AEROLÍNEAS EUROPEAS (requieren EORI) ===
  '057': { // AIR FRANCE
    awbPrefix: '057',
    name: 'Air France',
    policy: 21, // case 2, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix', // UE requiere EORI
    includeUnbUnz: true,
    notes: 'Air France: destino UE, requiere EORI en OCI'
  },
  '020': { // LUFTHANSA
    awbPrefix: '020',
    name: 'Lufthansa',
    policy: 21, // case 2, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix', // UE requiere EORI
    includeUnbUnz: true,
    notes: 'Lufthansa: destino UE, requiere EORI en OCI'
  },
  '205': { // EMIRATES (prefijo AWB real)
    awbPrefix: '205',
    name: 'Emirates',
    policy: 21, // case 2, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true,
    notes: 'Emirates: prefijo AWB 205 (176 es código IATA numérico alternativo)'
  },
  'DEFAULT': {
    awbPrefix: 'DEFAULT',
    name: 'Default (todas las demás)',
    policy: 21, // case 2, option 1
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
    disabledSegments: ['SSR', 'OTH', 'NFY'],
    defaultSphCodes: ['EAP', 'PER', 'COL'],
    ociFormat: 'withPrefix',
    includeUnbUnz: true
  }
};

// ============================================================
// SENDER IDS POR PAÍS
// ============================================================

export interface SenderInfo {
  /** País de origen */
  country: string;
  /** Sender ID normal */
  senderId: string;
  /** Sender ID para DESCARTES */
  senderIdDescartes: string;
}

export const SENDER_IDS: Record<string, SenderInfo> = {
  'EC': {
    country: 'Ecuador',
    senderId: 'REUAGT89ECRGML/UIO01:PIMA',
    senderIdDescartes: 'TDVAGT03OPERFLOR/UIO' // Type B format para Descartes
  },
  'CO': {
    country: 'Colombia',
    senderId: 'REUAGT89COCRGMASTER/BOG01:PIMA',
    senderIdDescartes: 'TDVAGT03OPERFLOR/BOG' // Type B format para Descartes
  }
};

// ============================================================
// MENSAJE GENERADO COMPLETO
// ============================================================

export interface GeneratedCargoImpMessage {
  /** Tipo de mensaje */
  type: 'FWB' | 'FHL';
  /** Versión del mensaje */
  version: FwbVersion | FhlVersion;
  /** Número AWB */
  awbNumber: string;
  /** Número HAWB (solo para FHL) */
  hawbNumber?: string;
  /** Es un envío consolidado (tiene houses) */
  isConsolidation?: boolean;
  /** Segmentos generados */
  segments: GeneratedSegment[];
  /** Mensaje completo generado */
  fullMessage: string;
  /** Validación exitosa */
  isValid: boolean;
  /** Errores de validación */
  errors: string[];
  /** Política aplicada */
  policy?: AirlinePolicy;
  /** Timestamp de generación */
  timestamp: string;
}
