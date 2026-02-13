/**
 * Validador CARGO-IMP FWB/FHL - Segmento por Segmento
 * 
 * Valida cada línea del mensaje FWB/FHL según las especificaciones IATA:
 * - FWB v16/v17: Freight Waybill
 * - FHL v4: House Bill
 * 
 * Reglas de Sintaxis General IATA:
 * - Caracteres permitidos: A-Z (mayúsculas), 0-9, punto (.) y guion (-)
 * - Longitud máxima de línea: 70 caracteres
 * - Separador de campos: /
 * 
 * @author Senior Solutions Architect
 * @version 1.0.0
 */

import { GeneratedCargoImpMessage, GeneratedSegment, FwbSegmentType, FhlSegmentType, AirlinePolicy } from './cargoImpTypes';

// ============================================================
// TIPOS DE VALIDACIÓN
// ============================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  /** Severidad del problema */
  severity: ValidationSeverity;
  /** Código del segmento donde se encontró el error */
  segment: string;
  /** Nombre del campo con error */
  field?: string;
  /** Línea del mensaje (1-based) */
  line?: number;
  /** Contenido de la línea con error */
  lineContent?: string;
  /** Mensaje descriptivo del error */
  message: string;
  /** Regla IATA que se viola */
  rule: string;
  /** Valor esperado */
  expected?: string;
  /** Valor encontrado */
  found?: string;
  /** Sugerencia de corrección */
  suggestion?: string;
}

export interface SegmentValidationResult {
  /** Código del segmento */
  segment: string;
  /** Nombre del segmento */
  segmentName: string;
  /** Es válido (sin errores, puede tener warnings) */
  isValid: boolean;
  /** Problemas encontrados */
  issues: ValidationIssue[];
  /** Conteo de errores */
  errorCount: number;
  /** Conteo de warnings */
  warningCount: number;
  /** Conteo de info */
  infoCount: number;
  /** Líneas del segmento analizadas */
  lines: string[];
}

export interface FwbValidationResult {
  /** El mensaje es válido (sin errores ni warnings) */
  isValid: boolean;
  /** El mensaje siempre puede enviarse — el usuario decide */
  canSend: boolean;
  /** El mensaje tiene errores de validación */
  hasErrors: boolean;
  /** Resultados por segmento */
  segmentResults: SegmentValidationResult[];
  /** Todos los issues consolidados */
  allIssues: ValidationIssue[];
  /** Total errores */
  totalErrors: number;
  /** Total warnings */
  totalWarnings: number;
  /** Total info */
  totalInfo: number;
  /** Score de calidad (0-100) */
  score: number;
  /** Resumen legible */
  summary: string;
  /** Timestamp de validación */
  timestamp: string;
}

// ============================================================
// PATRONES REGEX IATA
// ============================================================

/** Caracteres permitidos en CARGO-IMP: A-Z, 0-9, punto, guion, espacio, slash, CRLF */
const ALLOWED_CHARS_REGEX = /^[A-Z0-9.\-\s\/\n\r+'():,]*$/;

/** Solo letras mayúsculas */
const ALPHA_ONLY = /^[A-Z]+$/;

/** Solo números */
const NUMERIC_ONLY = /^[0-9]+$/;

/** Alfanumérico (upper) */
const ALPHANUMERIC = /^[A-Z0-9]+$/;

/** Código IATA aeropuerto (3 letras) */
const IATA_AIRPORT = /^[A-Z]{3}$/;

/** Código país ISO (2 letras) */
const ISO_COUNTRY = /^[A-Z]{2}$/;

/** Código moneda ISO (3 letras) */
const ISO_CURRENCY = /^[A-Z]{3}$/;

/** Número AWB (11 dígitos) */
const AWB_NUMBER = /^[0-9]{11}$/;

/** Número AWB con guión (3-8) */
const AWB_WITH_DASH = /^[0-9]{3}-[0-9]{8}$/;

/** Fecha DDMMMYY */
const DATE_DDMMMYY = /^[0-3][0-9](JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[0-9]{2}$/;

/** Fecha DDM (día del mes para FLT): spec n[2] = exactamente 2 dígitos */
const FLT_DATE = /^[0-3][0-9]$/;

/** Día de vuelo permisivo (1 o 2 dígitos — generará warning si es 1) */
const FLT_DATE_LOOSE = /^[0-3]?[0-9]$/;

/** Número de vuelo: 2-3 letras carrier + 1-5 dígitos (o N+letra) */
const FLIGHT_NUMBER = /^[A-Z0-9]{2}[0-9]{1,5}[A-Z]?$/;

/** Peso con decimales */
const WEIGHT_PATTERN = /^[0-9]+(\.[0-9]+)?$/;

/** Código SPH: exactamente 3 letras */
const SPH_CODE = /^[A-Z]{3}$/;

/** Código HS: 6-10 dígitos */
const HS_CODE = /^[0-9]{6,10}$/;

/** Código postal: hasta 9 chars alfanuméricos */
const POSTAL_CODE = /^[A-Z0-9\-\s]{1,9}$/;

/** Teléfono: hasta 25 chars (números, espacios, +, parens) */
const PHONE_PATTERN = /^[0-9\s\+\(\)\-]{1,25}$/;

/** Email pattern básico */
const EMAIL_INDICATOR = /^(TE|FX|EM)$/;

/** Códigos OCI party válidos */
const OCI_PARTY_CODES = ['CNE', 'SHP', 'AGT', 'NFY'];

/** Códigos OCI type válidos */
const OCI_TYPE_CODES = ['T', 'RA', 'CT', 'CP', 'SM', 'SO', 'ACE', 'ACI', 'ACH', 'CB', 'RG', 'ID'];

/** Códigos WT/OT válidos */
const WTOT_CODES = ['PP', 'CC', 'PC', 'CP'];

/** SPH códigos e-AWB obligatorios */
const EAWB_CODES = ['EAW', 'EAP'];

/** Max línea CARGO-IMP */
const MAX_LINE_LENGTH = 70;

// ============================================================
// VALIDADOR PRINCIPAL
// ============================================================

/**
 * Valida un mensaje CARGO-IMP completo (FWB o FHL)
 * Analiza segmento por segmento, línea por línea
 */
export function validateCargoImpMessage(
  message: GeneratedCargoImpMessage,
  policy?: AirlinePolicy
): FwbValidationResult {
  const segmentResults: SegmentValidationResult[] = [];
  const allIssues: ValidationIssue[] = [];

  // 1. Validar cada segmento habilitado
  const enabledSegments = message.segments.filter(s => s.enabled);
  
  for (const segment of enabledSegments) {
    let result: SegmentValidationResult;
    
    if (message.type === 'FWB') {
      result = validateFwbSegment(segment, message, policy);
    } else {
      result = validateFhlSegment(segment, message, policy);
    }
    
    segmentResults.push(result);
    allIssues.push(...result.issues);
  }

  // 2. Validaciones globales del mensaje
  const globalIssues = validateGlobalRules(message, enabledSegments, policy);
  
  // Merge global issues into corresponding segmentResults when they have a specific segment code
  // Issues with segment='GLOBAL' stay global; issues with a specific segment code get merged
  for (const issue of globalIssues) {
    if (issue.segment !== 'GLOBAL') {
      const matchingResult = segmentResults.find(r => r.segment === issue.segment);
      if (matchingResult) {
        matchingResult.issues.push(issue);
        if (issue.severity === 'error') { matchingResult.errorCount++; matchingResult.isValid = false; }
        else if (issue.severity === 'warning') { matchingResult.warningCount++; }
        else if (issue.severity === 'info') { matchingResult.infoCount++; }
      }
    }
  }
  allIssues.push(...globalIssues);

  // 3. Validar longitud de líneas del fullMessage
  const lineIssues = validateLineMaxLengths(message.fullMessage);
  allIssues.push(...lineIssues);

  // 4. Calcular estadísticas
  const totalErrors = allIssues.filter(i => i.severity === 'error').length;
  const totalWarnings = allIssues.filter(i => i.severity === 'warning').length;
  const totalInfo = allIssues.filter(i => i.severity === 'info').length;

  // 5. Score
  const score = calculateScore(totalErrors, totalWarnings, enabledSegments.length);

  // 6. Resumen
  const summary = totalErrors === 0 
    ? (totalWarnings > 0 
        ? `✅ Mensaje válido con ${totalWarnings} advertencia(s).`
        : '✅ Mensaje válido. Sin errores ni advertencias.')
    : `⚠️ ${totalErrors} error(es) encontrado(s). Revise antes de enviar.`;

  return {
    isValid: totalErrors === 0 && totalWarnings === 0,
    canSend: true, // Nunca bloquear — el usuario decide si envía
    hasErrors: totalErrors > 0,
    segmentResults,
    allIssues,
    totalErrors,
    totalWarnings,
    totalInfo,
    score,
    summary,
    timestamp: new Date().toISOString()
  };
}

// ============================================================
// VALIDACIÓN POR SEGMENTO FWB
// ============================================================

function validateFwbSegment(
  segment: GeneratedSegment,
  message: GeneratedCargoImpMessage,
  policy?: AirlinePolicy
): SegmentValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = segment.content.split('\n').filter(l => l.trim());
  const segCode = segment.code as FwbSegmentType;

  switch (segCode) {
    case 'FWB':
      validateFwbHeader(lines, issues, message);
      break;
    case 'AWB':
      validateAwbSegment(lines, issues, segment);
      break;
    case 'FLT':
      validateFltSegment(lines, issues, segment);
      break;
    case 'RTG':
      validateRtgSegment(lines, issues, segment);
      break;
    case 'SHP':
      validatePartySegment('SHP', lines, issues, segment);
      break;
    case 'CNE':
      validatePartySegment('CNE', lines, issues, segment);
      break;
    case 'AGT':
      validateAgtSegment(lines, issues, segment);
      break;
    case 'SSR':
      validateSsrSegment(lines, issues, segment);
      break;
    case 'CVD':
      validateCvdSegment(lines, issues, segment, message);
      break;
    case 'RTD':
      validateRtdSegment(lines, issues, segment);
      break;
    case 'NG':
      validateNgSegment(lines, issues, segment, message);
      break;
    case 'NH':
      validateNhSegment(lines, issues, segment, policy);
      break;
    case 'NV':
      validateNvSegment(lines, issues, segment);
      break;
    case 'NS':
      validateNsSegment(lines, issues, segment);
      break;
    case 'OTH':
      validateOthSegment(lines, issues, segment);
      break;
    case 'PPD':
    case 'COL':
      validateChargeSummarySegment(segCode, lines, issues, segment);
      break;
    case 'CER':
      validateCerSegment(lines, issues, segment);
      break;
    case 'ISU':
      validateIsuSegment(lines, issues, segment);
      break;
    case 'REF':
      validateRefSegment(lines, issues, segment);
      break;
    case 'SPH':
      validateSphSegment(lines, issues, segment, policy);
      break;
    case 'OCI':
      validateOciSegment(lines, issues, segment);
      break;
    case 'NFY':
      validateNfySegment(lines, issues, segment);
      break;
    case 'FTR':
      // Footer se valida en reglas globales
      break;
  }

  // Validar caracteres permitidos en cada línea del segmento (excepto headers/footers EDIFACT)
  if (!['FWB', 'FHL', 'FTR'].includes(segCode)) {
    lines.forEach((line, idx) => {
      validateAllowedChars(line, segCode, idx + 1, issues);
    });
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return {
    segment: segCode,
    segmentName: segment.name,
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    infoCount,
    lines
  };
}

// ============================================================
// VALIDADORES DE SEGMENTOS INDIVIDUALES
// ============================================================

/**
 * FWB Header: valida versión y estructura
 */
function validateFwbHeader(lines: string[], issues: ValidationIssue[], message: GeneratedCargoImpMessage): void {
  const content = lines.join('\n');
  
  // Verificar que contenga la versión FWB/XX
  const versionMatch = content.match(/FWB\/(\d+)/);
  if (!versionMatch) {
    issues.push({
      severity: 'error',
      segment: 'FWB',
      field: 'version',
      message: 'Falta identificador de versión FWB/XX en el header',
      rule: 'FWB.3[a]: El tag siempre debe ser FWB seguido de versión',
      suggestion: 'Agregar FWB/16 o FWB/17'
    });
    return;
  }

  const version = parseInt(versionMatch[1]);
  if (version < 9 || version > 17) {
    issues.push({
      severity: 'warning',
      segment: 'FWB',
      field: 'version',
      message: `Versión FWB/${version} no es estándar. Las versiones comunes son 16 y 17`,
      rule: 'FWB versión: hasta 2[n]',
      found: `FWB/${version}`,
      expected: 'FWB/16 o FWB/17'
    });
  }

  // Si tiene UNB, validar estructura EDIFACT
  if (content.includes('UNB+')) {
    if (!content.includes('IATA:1')) {
      issues.push({
        severity: 'warning',
        segment: 'FWB',
        field: 'UNB',
        message: 'Header EDIFACT debería contener IATA:1 como identificador de sintaxis',
        rule: 'EDIFACT UNB: Syntax identifier IATA:1'
      });
    }
    if (!content.includes('UNH+')) {
      issues.push({
        severity: 'error',
        segment: 'FWB',
        field: 'UNH',
        message: 'Falta segmento UNH (Message Header) en el envelope EDIFACT',
        rule: 'EDIFACT: UNB debe ir seguido de UNH'
      });
    }
  }

  // Si tiene Type B header, validar estructura
  if (content.match(/^Q[KDPU]\s/)) {
    const typeBLines = content.split('\n');
    if (typeBLines.length < 2) {
      issues.push({
        severity: 'error',
        segment: 'FWB',
        field: 'TypeB',
        message: 'Header Type B incompleto. Debe tener al menos 2 líneas (prioridad + origen)',
        rule: 'Type B: Priority line + Origin line + FWB version'
      });
    }
    // Validar línea 2 comienza con punto
    if (typeBLines.length >= 2 && !typeBLines[1].startsWith('.')) {
      issues.push({
        severity: 'error',
        segment: 'FWB',
        field: 'TypeB',
        message: 'Segunda línea del header Type B debe comenzar con punto (.)',
        rule: 'Type B: .SenderPrefix DDHHmm OriginAddress',
        found: typeBLines[1].substring(0, 10),
        suggestion: 'Formato: .DSGTPXA DDHHmm ORIGINADDRESS'
      });
    }
  }
}

/**
 * AWB: Número de guía, origen, destino, piezas, peso
 */
function validateAwbSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'AWB',
      message: 'Segmento AWB está vacío. Es OBLIGATORIO.',
      rule: 'AWB: Segmento requerido en FWB [FNA: AWB0010]'
    });
    return;
  }

  // Validar formato AWB: n[3]-n[8]a[3]a[3]/an[1]n[1-4]a[1]n[1-7]
  // Patrón: Prefijo(3n)-Serial(8n)Origen(3a)Destino(3a)/T{piezas}K_o_L{peso}
  const awbMatch = content.match(/^(\d{3})-(\d{8})([A-Z]{3})([A-Z]{3})\/T(\d+)([KL])([\d.]+)$/);
  
  if (!awbMatch) {
    // Intentar identificar qué parte está mal
    
    // Validar prefijo aerolínea (3 dígitos)
    const prefixMatch = content.match(/^(\d{1,3})/);
    if (!prefixMatch) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'awbPrefix',
        message: 'Falta prefijo de aerolínea (3 dígitos numéricos)',
        rule: 'AWB [1A]: Prefijo aerolínea 3[n] [FNA: AWB0015]',
        expected: 'Ej: 992, 075, 176',
        found: content.substring(0, 5)
      });
    } else if (prefixMatch[1].length !== 3) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'awbPrefix',
        message: `Prefijo de aerolínea debe ser exactamente 3 dígitos. Encontrado: ${prefixMatch[1].length} dígito(s)`,
        rule: 'AWB [1A]: Prefijo aerolínea 3[n] [FNA: AWB0015]',
        expected: '3 dígitos (ej: 992)',
        found: prefixMatch[1]
      });
    }

    // Validar serial (8 dígitos)
    const serialMatch = content.match(/^\d{3}-(\d+)/);
    if (serialMatch && serialMatch[1].length !== 8) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'awbSerial',
        message: `Número serial AWB debe ser exactamente 8 dígitos. Encontrado: ${serialMatch[1].length}`,
        rule: 'AWB [1B]: Serial 8[n] [FNA: AWB0020]',
        expected: '8 dígitos',
        found: serialMatch[1]
      });
    }

    // Validar origen/destino
    const locationMatch = content.match(/\d{8}([A-Z]{0,6})/);
    if (locationMatch) {
      const locations = locationMatch[1];
      if (locations.length < 6) {
        issues.push({
          severity: 'error',
          segment: 'AWB',
          field: 'origin/destination',
          message: 'Origen y destino deben ser códigos IATA de 3 letras cada uno (total 6 caracteres)',
          rule: 'AWB [1/18]: Origen 3[a] + Destino 3[a]',
          expected: 'Ej: BOGMIA, UIOLHR',
          found: locations
        });
      }
    }

    // Validar piezas y peso
    if (!content.includes('/T')) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'pieces',
        message: 'Falta indicador de piezas /T{cantidad}',
        rule: 'AWB [22J]: Piezas hasta 4[n] con prefijo T [FNA: AWB0040]',
        suggestion: 'Formato: /T304 (304 piezas)'
      });
    }
    if (!content.includes('K') && !content.includes('L')) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'weight',
        message: 'Falta indicador de peso K{peso} o L{peso}',
        rule: 'AWB: Peso a[1]n[1-7] — K (kilos) o L (libras) [FNA: AWB0045/AWB0050]',
        suggestion: 'Formato: K1500.0 (1500 kilos) o L3300.0 (3300 libras)'
      });
    }
  } else {
    // Formato general OK, validar campos específicos
    const [_, prefix, serial, origin, destination, pieces, weightUnit, weight] = awbMatch;

    // Info sobre unidad de peso
    if (weightUnit === 'L') {
      issues.push({
        severity: 'info',
        segment: 'AWB',
        field: 'weightUnit',
        message: 'Peso expresado en Libras (L). La mayoría de aerolíneas usan Kilos (K).',
        rule: 'AWB: a[1] = K (kilos) o L (libras)',
        found: 'L (Libras)'
      });
    }

    // Validar dígito de control Mod-7 (último dígito del serial)
    const serialBase = serial.substring(0, 7);
    const checkDigit = parseInt(serial[7]);
    const expectedCheck = parseInt(serialBase) % 7;
    if (checkDigit !== expectedCheck) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'awbCheckDigit',
        message: `Dígito de control Mod-7 inválido. Serial "${serial}" → últimos 7 dígitos: ${serialBase}, mod 7 = ${expectedCheck}, pero check digit es ${checkDigit}`,
        rule: 'AWB: El 8vo dígito del serial es check digit Mod-7 [FNA: AWB0020]',
        expected: `${serialBase}${expectedCheck}`,
        found: serial,
        suggestion: `Corregir serial a ${serialBase}${expectedCheck}`
      });
    }

    // Validar que origen sea un código IATA válido (3 letras)
    if (!IATA_AIRPORT.test(origin)) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'origin',
        message: `Código de origen "${origin}" no es un código IATA válido (3 letras mayúsculas)`,
        rule: 'AWB [1/18]: Origen 3[a] código IATA [FNA: AWB0025]',
        found: origin
      });
    }

    if (!IATA_AIRPORT.test(destination)) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'destination',
        message: `Código de destino "${destination}" no es un código IATA válido (3 letras mayúsculas)`,
        rule: 'AWB [1/18]: Destino 3[a] código IATA [FNA: AWB0030]',
        found: destination
      });
    }

    // Piezas: hasta 4 dígitos
    if (parseInt(pieces) <= 0) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'pieces',
        message: 'Número de piezas debe ser mayor a 0',
        rule: 'AWB [22J]: Piezas hasta 4[n] [FNA: AWB0040]',
        found: pieces
      });
    }
    if (pieces.length > 4) {
      issues.push({
        severity: 'warning',
        segment: 'AWB',
        field: 'pieces',
        message: `Número de piezas excede 4 dígitos (${pieces.length})`,
        rule: 'AWB [22J]: Máximo 4 dígitos [FNA: AWB0040]',
        found: pieces
      });
    }

    // Peso: hasta 7 dígitos con decimales
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'weight',
        message: 'Peso debe ser un número mayor a 0',
        rule: 'AWB [22K]: Peso hasta 7[n] con decimales [FNA: AWB0050]',
        found: weight
      });
    }
    if (weight.replace('.', '').length > 7) {
      issues.push({
        severity: 'warning',
        segment: 'AWB',
        field: 'weight',
        message: `Peso excede 7 dígitos (${weight})`,
        rule: 'AWB [22K]: Máximo 7 dígitos [FNA: AWB0050]',
        found: weight
      });
    }
  }
}

/**
 * FLT: Información de vuelo
 */
function validateFltSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'warning',
      segment: 'FLT',
      message: 'Segmento FLT está vacío. Es obligatorio para procesos de aduana y ACAS.',
      rule: 'FLT: Obligatorio para customs/ACAS [FNA: FLT0010]',
      suggestion: 'Formato: FLT/XX9999/DD (Aerolínea+Vuelo/Día)'
    });
    return;
  }

  // Debe comenzar con FLT
  if (!content.startsWith('FLT')) {
    issues.push({
      severity: 'error',
      segment: 'FLT',
      message: 'Segmento FLT debe comenzar con "FLT"',
      rule: 'FLT: Tag obligatorio',
      found: content.substring(0, 10)
    });
    return;
  }

  // Parsing correcto: FLT/CCNNNN/DD[/CCNNNN/DD]...
  // El contenido después de "FLT" es una serie de pares /vuelo/día
  // Usar split por "/" y reconstruir pares (vuelo, día)
  const raw = content.replace(/^FLT\/?/, ''); // quitar "FLT" o "FLT/"
  const parts = raw.split('/').filter(p => p !== '');
  
  // parts debería ser pares: [vuelo, día, vuelo, día, ...]
  if (parts.length === 0) {
    issues.push({
      severity: 'error',
      segment: 'FLT',
      message: 'Segmento FLT no contiene información de vuelo.',
      rule: 'FLT: Al menos un vuelo requerido',
      suggestion: 'Formato: FLT/XX9999/DD'
    });
    return;
  }

  // Procesar en pares (vuelo, día)
  let i = 0;
  while (i < parts.length) {
    const flightNum = parts[i];
    const day = parts[i + 1]; // puede ser undefined si falta

    // Validar número de vuelo: 2 chars carrier + hasta 5 dígitos (+ sufijo letra opcional)
    const carrierMatch = flightNum.match(/^([A-Z0-9]{2})(\d{1,5}[A-Z]?)$/);
    if (!carrierMatch) {
      issues.push({
        severity: 'error',
        segment: 'FLT',
        field: 'flightNumber',
        message: `Número de vuelo "${flightNum}" no es válido. Formato: 2 chars carrier + hasta 5 dígitos`,
        rule: 'FLT [19A]: Carrier 2[m] + Número hasta 5[m] [FNA: FLT0015/FLT0020]',
        expected: 'Ej: DA926, EY7122, CX456',
        found: flightNum,
        suggestion: 'NO repetir el código de aerolínea en el número. Ej: usar "926" no "DA926" si carrier ya es "DA"'
      });
    }

    // Validar día si existe — spec: n[2] = exactamente 2 dígitos
    if (day !== undefined) {
      if (!FLT_DATE_LOOSE.test(day)) {
        issues.push({
          severity: 'error',
          segment: 'FLT',
          field: 'flightDate',
          message: `Día de vuelo "${day}" no es válido. Debe ser 2 dígitos (01-31)`,
          rule: 'FLT [19A]: Día n[2] (día del mes) [FNA: FLT0025]',
          expected: '01-31',
          found: day
        });
      } else {
        if (day.length === 1) {
          issues.push({
            severity: 'warning',
            segment: 'FLT',
            field: 'flightDate',
            message: `Día de vuelo "${day}" tiene 1 dígito. Spec IATA exige n[2] (2 dígitos). Usar "0${day}" para cumplir spec.`,
            rule: 'FLT [19A]: Día n[2] — usar cero-fill',
            found: day,
            expected: `0${day}`,
            suggestion: `Cambiar ${day} por 0${day}`
          });
        }
        const dayNum = parseInt(day);
        if (dayNum < 1 || dayNum > 31) {
          issues.push({
            severity: 'error',
            segment: 'FLT',
            field: 'flightDate',
            message: `Día de vuelo ${day} fuera de rango (1-31)`,
            rule: 'FLT [19A]: Día debe ser 1-31',
            found: day
          });
        }
      }
      i += 2; // avanzar vuelo + día
    } else {
      // Falta día — warning
      issues.push({
        severity: 'warning',
        segment: 'FLT',
        field: 'flightDate',
        message: `Vuelo "${flightNum}" no tiene día de vuelo.`,
        rule: 'FLT [19A]: Día n[2] recomendado',
        suggestion: 'Agregar día: /DD después del número de vuelo'
      });
      i += 1; // avanzar solo vuelo
    }
  }
}

/**
 * RTG: Routing
 */
function validateRtgSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'RTG',
      message: 'Segmento RTG está vacío. Es OBLIGATORIO.',
      rule: 'RTG: Segmento requerido'
    });
    return;
  }

  if (!content.startsWith('RTG')) {
    issues.push({
      severity: 'error',
      segment: 'RTG',
      message: 'Segmento debe comenzar con "RTG"',
      rule: 'RTG: Tag obligatorio',
      found: content.substring(0, 10)
    });
    return;
  }

  // Extraer segmentos de routing: /XXXCC (aeropuerto 3 + carrier 2)
  const routeParts = content.replace('RTG', '').split('/').filter(p => p.trim());
  
  if (routeParts.length === 0) {
    issues.push({
      severity: 'error',
      segment: 'RTG',
      message: 'RTG no contiene segmentos de ruta',
      rule: 'RTG: Debe tener al menos un segmento aeropuerto+carrier',
      suggestion: 'Ej: RTG/MIADA/LHRBA'
    });
    return;
  }

  // Máximo 3 rutas permitidas
  if (routeParts.length > 3) {
    issues.push({
      severity: 'error',
      segment: 'RTG',
      message: `RTG tiene ${routeParts.length} tramos de ruta. Máximo permitido: 3`,
      rule: 'RTG: Máximo 3 rutas (DDD+CC) permitidas por IATA',
      found: `${routeParts.length} tramos`,
      expected: 'Máximo 3 tramos'
    });
  }

  routeParts.forEach((part, idx) => {
    const trimmed = part.trim();
    if (trimmed.length < 5) {
      issues.push({
        severity: 'warning',
        segment: 'RTG',
        field: `route${idx + 1}`,
        message: `Segmento de ruta "${trimmed}" muy corto. Esperado: 3 letras aeropuerto + 2 letras carrier`,
        rule: 'RTG: AeropuertoIATA(3a) + CarrierCode(2a)',
        expected: 'Ej: MIADA (MIA + DA)',
        found: trimmed
      });
    }
    
    // Extraer aeropuerto (primeros 3) y carrier (siguientes 2)
    if (trimmed.length >= 3) {
      const airport = trimmed.substring(0, 3);
      if (!IATA_AIRPORT.test(airport)) {
        issues.push({
          severity: 'error',
          segment: 'RTG',
          field: `route${idx + 1}`,
          message: `Código aeropuerto "${airport}" no es válido (debe ser 3 letras)`,
          rule: 'RTG: Código IATA aeropuerto 3[a]',
          found: airport
        });
      }
    }
    
    if (trimmed.length >= 5) {
      const carrier = trimmed.substring(3, 5);
      if (!ALPHANUMERIC.test(carrier)) {
        issues.push({
          severity: 'warning',
          segment: 'RTG',
          field: `route${idx + 1}`,
          message: `Código carrier "${carrier}" debe ser 2 caracteres alfanuméricos`,
          rule: 'RTG: Carrier code 2[m]',
          found: carrier
        });
      }
    }
  });
}

/**
 * SHP/CNE: Shipper o Consignee (misma estructura)
 */
function validatePartySegment(
  segCode: 'SHP' | 'CNE',
  lines: string[],
  issues: ValidationIssue[],
  segment: GeneratedSegment
): void {
  const content = segment.content;
  const label = segCode === 'SHP' ? 'Remitente (Shipper)' : 'Consignatario (Consignee)';
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: segCode,
      message: `Segmento ${segCode} está vacío. Es OBLIGATORIO.`,
      rule: `${segCode}: Segmento requerido [FNA: ${segCode}0010]`
    });
    return;
  }

  // Debe empezar con SHP o CNE
  if (!content.startsWith(segCode)) {
    issues.push({
      severity: 'error',
      segment: segCode,
      message: `Segmento debe comenzar con "${segCode}"`,
      rule: `${segCode}: Tag obligatorio`,
      found: content.substring(0, 5)
    });
    return;
  }

  // Separar líneas (después del tag)
  // FWB genera: SHP\n/{nombre}\n/{dir}\n/{city}\n/{CC}/{postal}
  // FHL genera: SHP/{nombre}\n/{dir}\n/{city}\n/{CC}/{postal}
  // Detectar si el nombre está en la misma línea que el tag
  const rawLines = content.split('\n');
  const firstLine = rawLines[0];
  let dataLines: string[];
  
  if (firstLine === segCode || firstLine.match(new RegExp(`^${segCode}$`))) {
    // FWB style: tag solo en la primera línea → datos desde línea 1
    dataLines = rawLines.slice(1);
  } else if (firstLine.startsWith(segCode + '/') || firstLine.startsWith(segCode + '\n')) {
    // FHL style: tag + nombre en la misma línea (SHP/{nombre})
    // Extraer nombre de la primera línea y reconstruir dataLines
    const nameFromTag = firstLine.substring(segCode.length); // /{nombre}
    dataLines = [nameFromTag, ...rawLines.slice(1)];
  } else {
    // FWB/17 style con NAM/: SHP\nNAM/{nombre}... 
    // ya se maneja con slice(1)
    dataLines = rawLines.slice(1);
  }

  // Validar nombre (hasta 35 chars)
  const nameLine = dataLines[0];
  if (!nameLine || nameLine.trim() === '' || nameLine === '/') {
    issues.push({
      severity: 'error',
      segment: segCode,
      field: 'name',
      message: `Nombre del ${label} es OBLIGATORIO y está vacío`,
      rule: `${segCode} [2/4]: Nombre hasta 35[t] [FNA: ${segCode}0020]`
    });
  } else {
    // Extraer nombre después del / o /NAM/
    const nameValue = nameLine.replace(/^\/?(?:NAM\/)?(.*?)$/, '$1').trim();
    if (nameValue.length > 35) {
      issues.push({
        severity: 'error',
        segment: segCode,
        field: 'name',
        message: `Nombre del ${label} excede 35 caracteres (tiene ${nameValue.length})`,
        rule: `${segCode} [2/4]: Nombre hasta 35[t] [FNA: ${segCode}0020]`,
        found: nameValue.substring(0, 40) + '...',
        suggestion: 'Truncar el nombre a 35 caracteres máximo'
      });
    }
    if (nameValue.length === 0) {
      issues.push({
        severity: 'error',
        segment: segCode,
        field: 'name',
        message: `Nombre del ${label} está vacío después del separador`,
        rule: `${segCode} [2/4]: Nombre obligatorio`
      });
    }
  }

  // Validar dirección (hasta 35 chars)
  const addressLine = dataLines[1];
  if (!addressLine || addressLine.trim() === '' || addressLine === '/') {
    issues.push({
      severity: 'error',
      segment: segCode,
      field: 'address',
      message: `Dirección del ${label} es OBLIGATORIA y está vacía. Si no se conoce, usar SN (Sin Número).`,
      rule: `${segCode} [2/4]: Dirección hasta 35[t] [FNA: ${segCode}0025]`,
      suggestion: 'Si no se tiene dirección completa, usar /SN (Sin Número)'
    });
  } else {
    const addressValue = addressLine.replace(/^\//, '').trim();
    if (addressValue.length > 35) {
      issues.push({
        severity: 'error',
        segment: segCode,
        field: 'address',
        message: `Dirección del ${label} excede 35 caracteres (tiene ${addressValue.length})`,
        rule: `${segCode} [2/4]: Dirección hasta 35[t] [FNA: ${segCode}0025]`,
        found: addressValue.substring(0, 40) + '...',
        suggestion: 'Truncar la dirección a 35 caracteres'
      });
    }
    // Hint: Si dirección no tiene número, usar SN
    if (addressValue && !/\d/.test(addressValue)) {
      issues.push({
        severity: 'info',
        segment: segCode,
        field: 'address',
        message: `Dirección del ${label} no contiene número. Si falta el número de calle, agregar SN (Sin Número) según IATA.`,
        rule: `${segCode}: Si falta número de calle, usar SN`,
        suggestion: 'Agregar SN al final de la dirección si no tiene número'
      });
    }
  }

  // Validar ciudad (hasta 17 chars)
  const cityLine = dataLines[2];
  if (!cityLine || cityLine.trim() === '' || cityLine === '/') {
    issues.push({
      severity: 'error',
      segment: segCode,
      field: 'city',
      message: `Ciudad del ${label} es OBLIGATORIA y está vacía`,
      rule: `${segCode} [2/4]: Ciudad hasta 17[t] [FNA: ${segCode}0030]`
    });
  } else {
    const cityParts = cityLine.replace(/^\//, '').split('/');
    const cityValue = cityParts[0].trim();
    if (cityValue.length > 17) {
      issues.push({
        severity: 'error',
        segment: segCode,
        field: 'city',
        message: `Ciudad del ${label} excede 17 caracteres (tiene ${cityValue.length})`,
        rule: `${segCode} [2/4]: Ciudad hasta 17[t] [FNA: ${segCode}0030]`,
        found: cityValue
      });
    }
    // Si es US y hay estado, validar estado (2 letras)
    if (cityParts.length > 1 && cityParts[1].trim()) {
      const state = cityParts[1].trim();
      if (state.length > 9) {
        issues.push({
          severity: 'error',
          segment: segCode,
          field: 'state',
          message: `Estado/Provincia del ${label} excede 9 caracteres`,
          rule: `${segCode} [2/4]: Estado hasta 9[t] (USA: 2[a]) [FNA: ${segCode}0035]`,
          found: state
        });
      }
    }
  }

  // Validar país y código postal
  const countryLine = dataLines[3];
  if (!countryLine || countryLine.trim() === '' || countryLine === '/') {
    issues.push({
      severity: 'error',
      segment: segCode,
      field: 'country',
      message: `País del ${label} es OBLIGATORIO y está vacío`,
      rule: `${segCode} [2/4]: Código de país 2[a] ISO [FNA: ${segCode}0040]`
    });
  } else {
    const countryParts = countryLine.replace(/^\//, '').split('/');
    
    // Primer parte: código de país (2 letras)
    const country = countryParts[0].trim();
    if (!ISO_COUNTRY.test(country)) {
      issues.push({
        severity: 'error',
        segment: segCode,
        field: 'country',
        message: `Código de país "${country}" no es válido. Debe ser código ISO de 2 letras mayúsculas`,
        rule: `${segCode} [2/4]: Código de país 2[a] ISO [FNA: ${segCode}0040]`,
        expected: 'Ej: US, CO, EC, DE, CN',
        found: country
      });
    }

    // Segundo parte: código postal (hasta 9 chars)
    if (countryParts.length >= 2) {
      const postalAndRest = countryParts[1].trim();
      // El postal puede ir seguido de /TE/xxx para teléfono
      const postalParts = postalAndRest.split(/\/(TE|FX|EM)\//);
      const postal = postalParts[0].trim();
      
      if (!postal || postal === '') {
        issues.push({
          severity: 'error',
          segment: segCode,
          field: 'postalCode',
          message: `Código postal del ${label} está vacío. Si no se conoce, usar "00000"`,
          rule: `${segCode} [2/4]: Código postal hasta 9[t]. Regla de relleno: si no existe, usar "00000" [FNA: ${segCode}0045]`,
          suggestion: 'Usar "00000" en lugar de dejar vacío'
        });
      } else if (postal.length > 9) {
        issues.push({
          severity: 'error',
          segment: segCode,
          field: 'postalCode',
          message: `Código postal del ${label} excede 9 caracteres (tiene ${postal.length})`,
          rule: `${segCode} [2/4]: Código postal hasta 9[t] [FNA: ${segCode}0045]`,
          found: postal
        });
      }

      // Validar contacto si existe
      if (postalParts.length >= 3) {
        const contactType = postalParts[1];
        const contactValue = postalParts[2];
        
        if (!EMAIL_INDICATOR.test(contactType)) {
          issues.push({
            severity: 'warning',
            segment: segCode,
            field: 'contact',
            message: `Identificador de contacto "${contactType}" no reconocido. Usar TE (teléfono), FX (fax) o EM (email)`,
            rule: `${segCode} [2/4]: Identificador de contacto 3[a] [FNA: ${segCode}0050]`,
            expected: 'TE, FX o EM',
            found: contactType
          });
        }
        
        if (contactValue && contactValue.length > 25) {
          issues.push({
            severity: 'warning',
            segment: segCode,
            field: 'contact',
            message: `Número de contacto excede 25 caracteres (hasta 70 permitido con ACAS)`,
            rule: `${segCode} [2/4]: Contacto hasta 25[t] (ACAS: 70[t]) [FNA: ${segCode}0055]`,
            found: contactValue.substring(0, 30) + '...'
          });
        }
      }
    } else {
      // No hay código postal
      issues.push({
        severity: 'error',
        segment: segCode,
        field: 'postalCode',
        message: `Falta código postal del ${label}. Si no se conoce, usar "00000"`,
        rule: `${segCode} [2/4]: Código postal obligatorio. Regla de relleno: usar "00000" si no existe [FNA: ${segCode}0045]`,
        suggestion: 'Agregar /CC/00000 después del código de país'
      });
    }
  }

  // Advertencias específicas para China (ACAS/PLACI)
  if (countryLine) {
    const countryCode = countryLine.replace(/^\//, '').split('/')[0].trim();
    if (countryCode === 'CN' && segCode === 'CNE') {
      // China exige teléfono válido del consignatario
      if (!countryLine.includes('/TE/') && !countryLine.includes('/FX/') && !countryLine.includes('/EM/')) {
        issues.push({
          severity: 'warning',
          segment: segCode,
          field: 'contact',
          message: 'CHINA: El consignatario en China DEBE incluir teléfono válido (/TE/). Aduanas de China lo exige para ACAS/PLACI.',
          rule: 'CNE China: Teléfono obligatorio para Risk Assessment',
          suggestion: 'Agregar /TE/número después del código postal'
        });
      }
      // China: si no tiene empresa, usar PASSPORT o 9999CN para particulares
      issues.push({
        severity: 'info',
        segment: segCode,
        message: 'CHINA: Si el consignatario es particular (sin empresa), usar PASSPORT + número o "9999CN" como identificador en OCI.',
        rule: 'OCI China: Regla para particulares CN',
        suggestion: 'Agregar línea OCI: /CN/CNE/T/9999CN o /CN/CNE/P/PASSPORT_NUMBER'
      });
    }
  }
}

/**
 * AGT: Agent
 */
function validateAgtSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'AGT',
      message: 'Segmento AGT está vacío. Es OBLIGATORIO.',
      rule: 'AGT: Segmento requerido [FNA: AGT0010]'
    });
    return;
  }

  if (!content.startsWith('AGT')) {
    issues.push({
      severity: 'error',
      segment: 'AGT',
      message: 'Segmento debe comenzar con "AGT"',
      rule: 'AGT: Tag obligatorio'
    });
    return;
  }

  // Validar código IATA del agente (7 dígitos)
  const iataMatch = content.match(/AGT\/\/(\d+)/);
  if (iataMatch) {
    const iataCode = iataMatch[1];
    if (iataCode.length < 7) {
      issues.push({
        severity: 'warning',
        segment: 'AGT',
        field: 'iataCode',
        message: `Código IATA del agente tiene ${iataCode.length} dígitos. Se esperan 7`,
        rule: 'AGT: Código IATA 7[n] [FNA: AGT0020]',
        found: iataCode
      });
    }
  } else {
    issues.push({
      severity: 'error',
      segment: 'AGT',
      field: 'iataCode',
      message: 'Falta código IATA del agente',
      rule: 'AGT: Código IATA 7 dígitos obligatorio [FNA: AGT0020]',
      suggestion: 'Formato: AGT//{IATA_CODE}/{CASS_CODE}'
    });
  }

  // Validar código CASS (4 dígitos)
  const cassMatch = content.match(/AGT\/\/\d+\/(\d+)/);
  if (cassMatch) {
    const cassCode = cassMatch[1];
    if (cassCode.length !== 4) {
      issues.push({
        severity: 'warning',
        segment: 'AGT',
        field: 'cassCode',
        message: `Código CASS del agente debe ser exactamente 4 dígitos. Encontrado: ${cassCode.length} dígito(s)`,
        rule: 'AGT: Código CASS 4[n] [FNA: AGT0025]',
        expected: '4 dígitos (ej: 0001)',
        found: cassCode
      });
    }
  } else if (iataMatch) {
    issues.push({
      severity: 'warning',
      segment: 'AGT',
      field: 'cassCode',
      message: 'Falta código CASS del agente (4 dígitos después del código IATA)',
      rule: 'AGT: Formato AGT//IATA/CASS [FNA: AGT0025]',
      suggestion: 'Agregar código CASS de 4 dígitos: AGT//{IATA}/{CASS}'
    });
  }

  // Validar nombre del agente
  const agtLines = content.split('\n');
  if (agtLines.length < 2) {
    issues.push({
      severity: 'error',
      segment: 'AGT',
      field: 'name',
      message: 'Falta nombre del agente (línea 2 del segmento AGT)',
      rule: 'AGT: Nombre obligatorio, hasta 35[t] [FNA: AGT0035]'
    });
  } else {
    const name = agtLines[1].replace(/^\//, '').trim();
    if (name.length > 35) {
      issues.push({
        severity: 'warning',
        segment: 'AGT',
        field: 'name',
        message: `Nombre del agente excede 35 caracteres (${name.length})`,
        rule: 'AGT: Nombre hasta 35[t]',
        found: name.substring(0, 40) + '...'
      });
    }
  }

  // Validar ciudad del agente (max 17 chars según spec)
  if (agtLines.length < 3) {
    issues.push({
      severity: 'warning',
      segment: 'AGT',
      field: 'city',
      message: 'Falta ciudad del agente (línea 3 del segmento AGT)',
      rule: 'AGT: Ciudad hasta 17[t]'
    });
  } else {
    const city = agtLines[2].replace(/^\//, '').trim();
    if (city.length > 17) {
      issues.push({
        severity: 'error',
        segment: 'AGT',
        field: 'city',
        message: `Ciudad del agente excede 17 caracteres (tiene ${city.length})`,
        rule: 'AGT: Ciudad hasta a[1-17]',
        found: city.substring(0, 20) + '...'
      });
    }
  }
}

/**
 * SSR: Special Service Request
 */
function validateSsrSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') return; // SSR es opcional

  if (!content.startsWith('SSR/')) {
    issues.push({
      severity: 'error',
      segment: 'SSR',
      message: 'Segmento debe comenzar con "SSR/"',
      rule: 'SSR: Tag obligatorio'
    });
    return;
  }

  // Validar líneas (máximo 3 líneas de 65 chars cada una)
  const ssrLines = content.replace('SSR/', '').split('\n/');
  if (ssrLines.length > 3) {
    issues.push({
      severity: 'warning',
      segment: 'SSR',
      message: `SSR tiene ${ssrLines.length} líneas. Máximo recomendado: 3`,
      rule: 'SSR: Máximo 3 líneas de 65 chars'
    });
  }

  ssrLines.forEach((line, idx) => {
    if (line.length > 65) {
      issues.push({
        severity: 'error',
        segment: 'SSR',
        field: `line${idx + 1}`,
        line: idx + 1,
        message: `Línea ${idx + 1} de SSR excede 65 caracteres (tiene ${line.length})`,
        rule: 'SSR: Cada línea máximo 65[t]',
        found: line.substring(0, 70) + '...'
      });
    }
  });
}

/**
 * CVD: Charge Declarations
 */
function validateCvdSegment(
  lines: string[], 
  issues: ValidationIssue[], 
  segment: GeneratedSegment,
  message: GeneratedCargoImpMessage
): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'CVD',
      message: 'Segmento CVD está vacío. Es OBLIGATORIO.',
      rule: 'CVD: Segmento requerido [FNA: CVD0010]'
    });
    return;
  }

  if (!content.startsWith('CVD/')) {
    issues.push({
      severity: 'error',
      segment: 'CVD',
      message: 'Segmento debe comenzar con "CVD/"',
      rule: 'CVD: Tag obligatorio'
    });
    return;
  }

  // Formato FWB: CVD/USD//PP/NVD/NCV/XXX  (doble barra → parts[1] vacío)
  // Formato FHL: CVD/USD/PP/NVD/NCV/XXX  (sin doble barra → parts[1] = PP)
  const parts = content.replace('CVD/', '').split('/');
  
  // Detectar si es formato FHL (sin doble-barra) o FWB (con doble-barra)
  // Si parts[1] está vacío, es FWB (tenía "//"); si no, es FHL
  const isFhlFormat = parts.length >= 2 && parts[1].trim() !== '';
  
  // Normalizar a un esquema común:
  //   currency, pcCode, declCarriage, declCustoms, insurance
  let currency: string;
  let pcCode: string;
  let declCarriage: string | undefined;
  let declCustoms: string | undefined;
  let insurance: string | undefined;
  
  if (isFhlFormat) {
    // FHL: CVD/USD/PP/NVD/NCV/XXX → parts = [USD, PP, NVD, NCV, XXX]
    currency      = (parts[0] || '').trim();
    pcCode        = (parts[1] || '').trim();
    declCarriage  = parts[2]?.trim();
    declCustoms   = parts[3]?.trim();
    insurance     = parts[4]?.trim();
  } else {
    // FWB: CVD/USD//PP/NVD/NCV/XXX → parts = [USD, '', PP, NVD, NCV, XXX]
    currency      = (parts[0] || '').trim();
    pcCode        = (parts[2] || '').trim();
    declCarriage  = parts[3]?.trim();
    declCustoms   = parts[4]?.trim();
    insurance     = parts[5]?.trim();
  }
  
  // Validar moneda (3 letras)
  if (!ISO_CURRENCY.test(currency)) {
    issues.push({
      severity: 'error',
      segment: 'CVD',
      field: 'currency',
      message: `Código de moneda "${currency}" no es válido (debe ser 3 letras ISO)`,
      rule: 'CVD [12]: Código de moneda 3[a] [FNA: CVD0015]',
      expected: 'Ej: USD, EUR, COP',
      found: currency
    });
  }

  // Validar código P/C (Prepaid/Collect)
  if (pcCode && !WTOT_CODES.includes(pcCode)) {
    issues.push({
      severity: 'error',
      segment: 'CVD',
      field: 'wtOt',
      message: `Código de cargo "${pcCode}" no es válido`,
      rule: 'CVD: P/C debe ser PP, CC, PC o CP [FNA: CVD0020/CVD0025]',
      expected: 'PP (Prepaid), CC (Collect), PC (Weight Prepaid/Other Collect), CP (Weight Collect/Other Prepaid)',
      found: pcCode
    });
  }

  // Validar valor para Transporte
  if (declCarriage !== undefined && declCarriage !== '') {
    if (declCarriage !== 'NVD') {
      if (declCarriage.length > 12) {
        issues.push({
          severity: 'error',
          segment: 'CVD',
          field: 'declaredCarriage',
          message: `Valor para transporte excede 12 caracteres`,
          rule: 'CVD [16]: Valor para transporte hasta 12[m] (o NVD) [FNA: CVD0035]',
          found: declCarriage
        });
      }
      if (!WEIGHT_PATTERN.test(declCarriage) && declCarriage !== '0') {
        issues.push({
          severity: 'warning',
          segment: 'CVD',
          field: 'declaredCarriage',
          message: `Valor para transporte "${declCarriage}" no es numérico ni NVD`,
          rule: 'CVD [16]: Hasta 12[m] o NVD [FNA: CVD0035]',
          found: declCarriage,
          suggestion: 'Usar NVD (No Value Declared) o un valor numérico'
        });
      }
    }
  }

  // Validar valor para Aduanas
  if (declCustoms !== undefined && declCustoms !== '') {
    if (declCustoms !== 'NCV') {
      if (declCustoms.length > 12) {
        issues.push({
          severity: 'error',
          segment: 'CVD',
          field: 'declaredCustoms',
          message: `Valor para aduanas excede 12 caracteres`,
          rule: 'CVD [17]: Valor para aduanas hasta 12[m] (o NCV) [FNA: CVD0040]',
          found: declCustoms
        });
      }
    }
  }

  // Validar campo de seguro
  if (insurance !== undefined && insurance !== '') {
    if (insurance !== 'XXX' && insurance.length > 3) {
      issues.push({
        severity: 'warning',
        segment: 'CVD',
        field: 'insurance',
        message: `Valor de seguro "${insurance}" excede 3 caracteres. Normalmente se usa XXX (sin seguro declarado)`,
        rule: 'CVD: Seguro a[3] — normalmente XXX [FNA: CVD0045]',
        found: insurance,
        suggestion: 'Usar XXX si no se declara seguro'
      });
    }
  } else {
    issues.push({
      severity: 'info',
      segment: 'CVD',
      field: 'insurance',
      message: 'Falta campo de seguro. Normalmente se coloca XXX (sin valor declarado para seguro).',
      rule: 'CVD: Formato completo CVD/CUR/PC/NVD/NCV/XXX',
      suggestion: 'Agregar /XXX al final del CVD'
    });
  }

  // Info: Destinos especiales que requieren valor numérico
  const awbContent = message.segments.find(s => s.code === 'AWB')?.content || '';
  const destMatch = awbContent.match(/[A-Z]{3}([A-Z]{3})/);
  if (destMatch) {
    const dest = destMatch[1];
    // Bangladesh (DAC), Sri Lanka (CMB) requieren valor numérico
    const specialDestinations: Record<string, string> = {
      'DAC': 'Bangladesh',
      'CGP': 'Bangladesh (Chittagong)',
      'CMB': 'Sri Lanka'
    };
    if (specialDestinations[dest] && parts.length >= 5) {
      const declCustoms = parts[4]?.trim();
      if (declCustoms === 'NCV') {
        issues.push({
          severity: 'warning',
          segment: 'CVD',
          field: 'declaredCustoms',
          message: `Destino ${dest} (${specialDestinations[dest]}) puede requerir valor numérico en lugar de NCV. Usar "0" si no hay valor`,
          rule: 'CVD [17]: Excepción para Bangladesh/Sri Lanka: exigen valor numérico',
          suggestion: 'Reemplazar NCV por 0 o valor real'
        });
      }
    }
  }
}

/**
 * RTD: Rate Description
 */
function validateRtdSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'RTD',
      message: 'Segmento RTD está vacío. Es OBLIGATORIO.',
      rule: 'RTD: Segmento requerido'
    });
    return;
  }

  const rtdLines = content.split('\n').filter(l => l.trim());

  // Máximo 12 líneas en la sección RTD
  if (rtdLines.length > 12) {
    issues.push({
      severity: 'error',
      segment: 'RTD',
      message: `RTD tiene ${rtdLines.length} líneas. Máximo permitido por IATA: 12`,
      rule: 'RTD: Máximo 12 líneas en esta sección',
      found: `${rtdLines.length} líneas`,
      expected: 'Máximo 12 líneas'
    });
  }
  
  rtdLines.forEach((line, idx) => {
    if (!line.startsWith('RTD/')) {
      issues.push({
        severity: 'warning',
        segment: 'RTD',
        line: idx + 1,
        lineContent: line,
        message: `Línea ${idx + 1} no comienza con "RTD/"`,
        rule: 'RTD: Cada línea debe comenzar con RTD/'
      });
      return;
    }

    const parts = line.replace('RTD/', '').split('/');
    
    // Validar número de línea
    if (parts[0]) {
      const lineNum = parseInt(parts[0]);
      if (isNaN(lineNum) || lineNum < 1) {
        issues.push({
          severity: 'warning',
          segment: 'RTD',
          field: 'lineNumber',
          line: idx + 1,
          message: `Número de línea RTD inválido: "${parts[0]}"`,
          rule: 'RTD: Número de línea hasta 2[n]'
        });
      }
    }

    // Validar piezas P{number}
    const piecePart = parts.find(p => p.startsWith('P'));
    if (piecePart) {
      const pieceValue = piecePart.substring(1);
      if (!NUMERIC_ONLY.test(pieceValue)) {
        issues.push({
          severity: 'error',
          segment: 'RTD',
          field: 'pieces',
          line: idx + 1,
          message: `Número de piezas "${pieceValue}" no es numérico`,
          rule: 'RTD: Piezas P{n}',
          found: pieceValue
        });
      }
    }

    // Validar peso K{number}
    const weightPart = parts.find(p => p.startsWith('K'));
    if (weightPart) {
      const weightValue = weightPart.substring(1);
      if (!WEIGHT_PATTERN.test(weightValue)) {
        issues.push({
          severity: 'error',
          segment: 'RTD',
          field: 'weight',
          line: idx + 1,
          message: `Peso "${weightValue}" no tiene formato numérico válido`,
          rule: 'RTD: Peso K{n.n}',
          found: weightValue
        });
      }
    }

    // Validar clase de tarifa C{code}
    const classPart = parts.find(p => p.startsWith('C') && p.length <= 3);
    if (classPart) {
      const classCode = classPart.substring(1);
      const validClasses = ['Q', 'N', 'M', 'C', 'B', 'R', 'S', 'U', 'E'];
      if (classCode.length > 0 && !validClasses.includes(classCode) && !NUMERIC_ONLY.test(classCode)) {
        issues.push({
          severity: 'warning',
          segment: 'RTD',
          field: 'rateClass',
          line: idx + 1,
          message: `Clase de tarifa "${classCode}" no es estándar`,
          rule: 'RTD: Rate class C{code} - C, M, N, Q, B',
          found: classCode,
          expected: 'C (Commodity), N (Normal), M (Minimum), Q (Quantity), B (Basic)'
        });
      }
    }
  });
}

/**
 * NG: Nature of Goods
 */
function validateNgSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment, message?: GeneratedCargoImpMessage): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'NG',
      message: 'Segmento NG está vacío. Es OBLIGATORIO.',
      rule: 'NG: Descripción de mercancía requerida'
    });
    return;
  }

  // Extraer descripción: /NG/DESCRIPTION o /NC/DESCRIPTION
  const ngMatch = content.match(/\/(NG|NC)\/(.*)/);
  if (!ngMatch) {
    issues.push({
      severity: 'warning',
      segment: 'NG',
      message: 'Formato NG no estándar. Esperado: /NG/descripción',
      rule: 'RTD [22I]: Descripción de mercancía 20[t] por línea',
      found: content.substring(0, 30)
    });
    return;
  }

  const description = ngMatch[2];
  if (description.length > 20) {
    issues.push({
      severity: 'warning',
      segment: 'NG',
      field: 'description',
      message: `Descripción de mercancía excede 20 caracteres por línea (tiene ${description.length})`,
      rule: 'RTD [22I]: Descripción 20[t] por línea, máximo 11 líneas',
      found: description.substring(0, 25) + '...'
    });
  }
  if (description.length === 0) {
    issues.push({
      severity: 'error',
      segment: 'NG',
      field: 'description',
      message: 'Descripción de mercancía está vacía',
      rule: 'NG: Descripción obligatoria'
    });
  }

  // ACAS/Risk Assessment: Alertar sobre descripciones vagas (Sección 6 del manual)
  if (description.length > 0) {
    const descUpper = description.toUpperCase().trim();

    // Verificar contra la lista expandida de 70+ descripciones vagas
    const isVagueExact = VAGUE_DESCRIPTIONS_EXACT.some(w => descUpper === w || descUpper === w + 'S');
    // También verificar coincidencia parcial para descripciones compuestas (ej: "MISC PARTS AND GOODS")
    const isVaguePartial = !isVagueExact && VAGUE_DESCRIPTIONS_EXACT.some(w => 
      descUpper.includes(w) && descUpper.length <= w.length + 5
    );

    if (isVagueExact) {
      issues.push({
        severity: 'warning',
        segment: 'NG',
        field: 'description',
        message: `⚠️ ACAS ALERTA: Descripción "${description}" es demasiado vaga. Descripciones genéricas causan HOLDS en Risk Assessment (ACAS/PLACI). Sección 6 del manual lista ${VAGUE_DESCRIPTIONS_EXACT.length}+ términos prohibidos.`,
        rule: 'ACAS Sección 6: Descripciones vagas causan retención en screening [FNA: NG-VAGUE]',
        found: description,
        suggestion: 'Usar descripción específica del producto. Ej: "AUTOMOTIVE BRAKE PADS" en vez de "PARTS", "COTTON TEXTILE GARMENTS" en vez de "GOODS", "LITHIUM ION LAPTOP BATTERIES" en vez de "BATTERIES"'
      });
    } else if (isVaguePartial) {
      issues.push({
        severity: 'info',
        segment: 'NG',
        field: 'description',
        message: `Descripción "${description}" podría ser considerada vaga. Verifique que sea lo suficientemente específica para ACAS/PLACI.`,
        rule: 'ACAS Sección 6: Revisión de descripciones potencialmente vagas [FNA: NG-VAGUE]',
        found: description,
        suggestion: 'Considere agregar más detalle al producto: material, uso, forma, etc.'
      });
    }

    // Detección de términos que disparan escrutinio DG (mercancías peligrosas)
    const dgTermsFound = DG_SCRUTINY_TERMS.filter(t => descUpper.includes(t));
    if (dgTermsFound.length > 0) {
      issues.push({
        severity: 'info',
        segment: 'NG',
        field: 'description',
        message: `Descripción contiene término(s) de escrutinio DG: ${dgTermsFound.join(', ')}. Asegúrese de que el SPH y segmentos DG sean consistentes.`,
        rule: 'DG Scrutiny: Términos que activan revisión adicional de mercancías peligrosas',
        found: description,
        suggestion: dgTermsFound.includes('LITHIUM') || dgTermsFound.includes('BATTERY') || dgTermsFound.includes('BATTERIES')
          ? 'Si contiene baterías de litio, verificar SPH (ELI/ELM/RLI/RLM) y declaración DG según IATA DGR Sección II.'
          : 'Verificar que SPH y documentación DG reflejen correctamente el contenido declarado.'
      });
    }

    // NC (Consolidation) en envío directo es sospechoso — solo alertar si NO es consolidación
    if (ngMatch[1] === 'NC' && !message?.isConsolidation) {
      issues.push({
        severity: 'warning',
        segment: 'NG',
        field: 'type',
        message: 'Tipo NC (Consolidation goods) detectado en envío DIRECTO. Usar /NG/ en lugar de /NC/.',
        rule: 'NG vs NC: NG = General Goods (directos), NC = Consolidation [FNA: NG0010]',
        suggestion: 'Para envíos directos usar /NG/DESCRIPCION'
      });
    }
  }
}

/**
 * NH: Harmonized Code
 */
function validateNhSegment(
  lines: string[], 
  issues: ValidationIssue[], 
  segment: GeneratedSegment,
  policy?: AirlinePolicy
): void {
  const content = segment.content;
  if (!content || content.trim() === '') {
    // NH es obligatorio para ciertos destinos
    if (policy?.requiresHTS) {
      issues.push({
        severity: 'error',
        segment: 'NH',
        message: 'Código HS (Harmonized System) es OBLIGATORIO para esta aerolínea',
        rule: 'NH: Código HS obligatorio según política de aerolínea',
        suggestion: 'Agregar al menos un código HS de 6-10 dígitos'
      });
    }
    return;
  }

  const nhLines = content.split('\n').filter(l => l.trim());
  
  nhLines.forEach((line, idx) => {
    // Formato: /X/NH/XXXXXX
    const nhMatch = line.match(/\/(\d+)\/NH\/(\d+)/);
    if (!nhMatch) {
      issues.push({
        severity: 'warning',
        segment: 'NH',
        line: idx + 1,
        lineContent: line,
        message: `Línea NH con formato inválido: "${line}"`,
        rule: 'NH: Formato /lineNum/NH/codigo',
        suggestion: 'Ej: /2/NH/060311'
      });
      return;
    }

    const hsCode = nhMatch[2];
    if (hsCode.length < 6) {
      issues.push({
        severity: 'error',
        segment: 'NH',
        field: 'hsCode',
        line: idx + 1,
        message: `Código HS "${hsCode}" tiene menos de 6 dígitos. Mínimo 6 dígitos obligatorio para USA, UAE, UE y China`,
        rule: 'NH: Código HS 6 a 10[n] - Mínimo 6 dígitos',
        found: hsCode,
        suggestion: 'Completar a mínimo 6 dígitos'
      });
    }
    if (hsCode.length > 10) {
      issues.push({
        severity: 'error',
        segment: 'NH',
        field: 'hsCode',
        line: idx + 1,
        message: `Código HS "${hsCode}" excede 10 dígitos`,
        rule: 'NH: Código HS máximo 10[n]',
        found: hsCode
      });
    }
    if (!NUMERIC_ONLY.test(hsCode)) {
      issues.push({
        severity: 'error',
        segment: 'NH',
        field: 'hsCode',
        line: idx + 1,
        message: `Código HS "${hsCode}" contiene caracteres no numéricos`,
        rule: 'NH: Solo dígitos permitidos',
        found: hsCode
      });
    }
  });
}

/**
 * NV: Volume
 */
function validateNvSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') return; // NV es opcional

  // Formato: /X/NV/MC0.0018
  const nvMatch = content.match(/\/(\d+)\/NV\/MC([\d.]+)/);
  if (!nvMatch) {
    issues.push({
      severity: 'warning',
      segment: 'NV',
      message: `Formato NV no estándar. Esperado: /lineNum/NV/MC{volumen}`,
      rule: 'NV: Volumen en metros cúbicos con prefijo MC',
      found: content.substring(0, 30),
      suggestion: 'Ej: /4/NV/MC0.50'
    });
    return;
  }

  const volume = parseFloat(nvMatch[2]);
  if (isNaN(volume) || volume < 0) {
    issues.push({
      severity: 'error',
      segment: 'NV',
      field: 'volume',
      message: `Volumen "${nvMatch[2]}" no es un número válido`,
      rule: 'NV: Volumen numérico con decimales',
      found: nvMatch[2]
    });
  }
}

/**
 * NS: SLAC (Shipper Load And Count)
 */
function validateNsSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') return; // NS es opcional

  // Formato: /X/NS/NNN
  const nsMatch = content.match(/\/(\d+)\/NS\/(\d+)/);
  if (!nsMatch) {
    issues.push({
      severity: 'warning',
      segment: 'NS',
      message: `Formato NS no estándar. Esperado: /lineNum/NS/{piezas}`,
      rule: 'NS: SLAC hasta 5[n]',
      found: content.substring(0, 30)
    });
    return;
  }

  const slac = nsMatch[2];
  if (slac.length > 5) {
    issues.push({
      severity: 'warning',
      segment: 'NS',
      field: 'slac',
      message: `SLAC "${slac}" excede 5 dígitos`,
      rule: 'NS: Hasta 5[n]',
      found: slac
    });
  }
}

/**
 * OTH: Other Charges
 */
function validateOthSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') return; // OTH es opcional

  const othLines = content.split('\n').filter(l => l.trim());
  
  othLines.forEach((line, idx) => {
    // Formato: OTH/P/AWC/NN.NN o OTH/C/AWA/NN.NN
    const othMatch = line.match(/OTH\/([PC])\/([A-Z]{2,3})\/([\d.]+)/);
    if (!othMatch) {
      // Intentar detectar problemas
      if (!line.startsWith('OTH/')) {
        issues.push({
          severity: 'warning',
          segment: 'OTH',
          line: idx + 1,
          message: `Línea OTH con formato inválido`,
          rule: 'OTH: Formato OTH/P_o_C/Código/Monto [FNA: OTH0010]',
          found: line.substring(0, 40)
        });
      }
      return;
    }

    const pcIndicator = othMatch[1];
    if (pcIndicator !== 'P' && pcIndicator !== 'C') {
      issues.push({
        severity: 'error',
        segment: 'OTH',
        field: 'prepaidOrCollect',
        line: idx + 1,
        message: `Indicador debe ser P (Prepaid) o C (Collect): "${pcIndicator}"`,
        rule: 'OTH: P=Prepaid, C=Collect [FNA: OTH0015]',
        found: pcIndicator
      });
    }
  });
}

/**
 * PPD/COL: Charge Summary
 */
function validateChargeSummarySegment(
  segCode: 'PPD' | 'COL', 
  lines: string[], 
  issues: ValidationIssue[], 
  segment: GeneratedSegment
): void {
  const content = segment.content;
  if (!content || content.trim() === '') return;

  if (!content.startsWith(segCode + '/')) {
    issues.push({
      severity: 'warning',
      segment: segCode,
      message: `Segmento debe comenzar con "${segCode}/"`,
      rule: `${segCode}: Tag obligatorio`,
      found: content.substring(0, 10)
    });
  }

  // Validar presencia de identificadores obligatorios: WT, OC, CT
  // Spec: PPD o COL debe llevar WT n[1-12], OC n[1-12], CT n[1-12]
  const rawContent = content.replace(`${segCode}/`, '');
  
  const hasWT = /WT[\d.]/.test(rawContent);
  const hasOC = /OC[\d.]/.test(rawContent);
  const hasCT = /CT[\d.]/.test(rawContent);

  if (!hasWT) {
    issues.push({
      severity: 'error',
      segment: segCode,
      field: 'WT',
      message: `Falta identificador WT (Weight Charge) en ${segCode}. Spec: WT n[1-12]`,
      rule: `${segCode}: WT (peso) obligatorio [FNA: ${segCode}0020]`,
      suggestion: `Agregar WT seguido del monto. Ej: ${segCode}/WT3194.24/OC778.00/CT3972.24`
    });
  }
  if (!hasOC) {
    issues.push({
      severity: 'warning',
      segment: segCode,
      field: 'OC',
      message: `Falta identificador OC (Other Charges) en ${segCode}. Si no hay cargos adicionales, usar OC0`,
      rule: `${segCode}: OC (otros cargos) recomendado`,
      suggestion: `Agregar OC0 si no hay cargos adicionales de aerolínea`
    });
  }
  if (!hasCT) {
    issues.push({
      severity: 'error',
      segment: segCode,
      field: 'CT',
      message: `Falta identificador CT (Cargo Total) en ${segCode}. Spec: CT n[1-12]`,
      rule: `${segCode}: CT (total) obligatorio [FNA: ${segCode}0045]`,
      suggestion: `Agregar CT seguido del total. Ej: CT3972.24`
    });
  }

  // Validar que los montos con identificadores sean numéricos
  const wtMatch = rawContent.match(/WT([\d.]+)/);
  if (wtMatch && !WEIGHT_PATTERN.test(wtMatch[1])) {
    issues.push({
      severity: 'error',
      segment: segCode,
      field: 'WT',
      message: `Monto WT "${wtMatch[1]}" no es numérico válido`,
      rule: `${segCode}: WT n[1-12]`,
      found: wtMatch[1]
    });
  }
  const ocMatch = rawContent.match(/OC([\d.]+)/);
  if (ocMatch && !WEIGHT_PATTERN.test(ocMatch[1])) {
    issues.push({
      severity: 'warning',
      segment: segCode,
      field: 'OC',
      message: `Monto OC "${ocMatch[1]}" no es numérico válido`,
      rule: `${segCode}: OC n[1-12]`,
      found: ocMatch[1]
    });
  }
  const ctMatch = rawContent.match(/CT([\d.]+)/);
  if (ctMatch && !WEIGHT_PATTERN.test(ctMatch[1])) {
    issues.push({
      severity: 'error',
      segment: segCode,
      field: 'CT',
      message: `Monto CT "${ctMatch[1]}" no es numérico válido`,
      rule: `${segCode}: CT n[1-12]`,
      found: ctMatch[1]
    });
  }
}

/**
 * CER: Certification
 */
function validateCerSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') return; // CER es opcional

  // Formato: CER/FIRMA
  if (!content.startsWith('CER/')) {
    issues.push({
      severity: 'warning',
      segment: 'CER',
      message: 'Segmento debe comenzar con "CER/"',
      rule: 'CER: Tag obligatorio'
    });
    return;
  }

  const signature = content.replace('CER/', '').trim();
  if (signature.length > 20) {
    issues.push({
      severity: 'warning',
      segment: 'CER',
      field: 'signature',
      message: `Firma excede 20 caracteres (tiene ${signature.length})`,
      rule: 'CER: Firma hasta 20[t]',
      found: signature.substring(0, 25) + '...'
    });
  }
}

/**
 * ISU: Issue (Carrier's Execution)
 */
function validateIsuSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'ISU',
      message: 'Segmento ISU está vacío. Es OBLIGATORIO.',
      rule: 'ISU: Segmento requerido [FNA: ISU0010]'
    });
    return;
  }

  if (!content.startsWith('ISU/')) {
    issues.push({
      severity: 'error',
      segment: 'ISU',
      message: 'Segmento debe comenzar con "ISU/"',
      rule: 'ISU: Tag obligatorio [FNA: ISU0010]'
    });
    return;
  }

  const parts = content.replace('ISU/', '').split('/');
  
  // Validar fecha (DDMMMYY)
  if (parts[0]) {
    const date = parts[0].trim();
    if (!DATE_DDMMMYY.test(date)) {
      issues.push({
        severity: 'error',
        segment: 'ISU',
        field: 'date',
        message: `Fecha "${date}" no tiene formato DDMMMYY`,
        rule: 'ISU: Fecha DDMMMYY (7 chars) [FNA: ISU0015/ISU0020/ISU0025]',
        expected: 'Ej: 24JAN26',
        found: date
      });
    }
  } else {
    issues.push({
      severity: 'error',
      segment: 'ISU',
      field: 'date',
      message: 'Falta fecha de emisión',
      rule: 'ISU: Fecha obligatoria [FNA: ISU0015]'
    });
  }

  // Validar lugar
  if (parts.length >= 2) {
    const place = parts[1].trim();
    if (place.length > 17) {
      issues.push({
        severity: 'warning',
        segment: 'ISU',
        field: 'place',
        message: `Lugar de emisión excede 17 caracteres (tiene ${place.length})`,
        rule: 'ISU: Lugar hasta 17[t] [FNA: ISU0030]',
        found: place
      });
    }
  } else {
    issues.push({
      severity: 'error',
      segment: 'ISU',
      field: 'place',
      message: 'Falta lugar de emisión',
      rule: 'ISU: Lugar obligatorio [FNA: ISU0030]'
    });
  }

  // Firma (opcional)
  if (parts.length >= 3) {
    const sig = parts[2].trim();
    if (sig.length > 20) {
      issues.push({
        severity: 'warning',
        segment: 'ISU',
        field: 'signature',
        message: `Firma excede 20 caracteres`,
        rule: 'ISU: Firma hasta 20[t] [FNA: ISU0035]',
        found: sig.substring(0, 25)
      });
    }
  }
}

/**
 * REF: Reference
 */
function validateRefSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'REF',
      message: 'Segmento REF está vacío. Es OBLIGATORIO.',
      rule: 'REF: Referencia del agente requerida [FNA: REF0010]'
    });
    return;
  }

  if (!content.startsWith('REF')) {
    issues.push({
      severity: 'error',
      segment: 'REF',
      message: 'Segmento debe comenzar con "REF"',
      rule: 'REF: Tag obligatorio'
    });
    return;
  }

  // Validar longitud del contenido
  const refContent = content.replace(/^REF\/?/, '').trim();
  if (refContent.length > 30) {
    issues.push({
      severity: 'warning',
      segment: 'REF',
      field: 'agentRef',
      message: `Referencia excede 30 caracteres (tiene ${refContent.length})`,
      rule: 'REF: Referencia hasta 30[t]',
      found: refContent.substring(0, 35) + '...'
    });
  }
}

/**
 * SPH: Special Handling Codes
 */
function validateSphSegment(
  lines: string[], 
  issues: ValidationIssue[], 
  segment: GeneratedSegment,
  policy?: AirlinePolicy
): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'SPH',
      message: 'Segmento SPH está vacío. Es OBLIGATORIO.',
      rule: 'SPH: Al menos un código de manejo especial requerido'
    });
    return;
  }

  if (!content.startsWith('SPH/')) {
    issues.push({
      severity: 'error',
      segment: 'SPH',
      message: 'Segmento debe comenzar con "SPH/"',
      rule: 'SPH: Tag obligatorio'
    });
    return;
  }

  // Extraer códigos
  const codesStr = content.replace('SPH/', '').trim();
  const codes = codesStr.split('/').filter(c => c.trim());

  // Validar que cada código sea 3 letras
  codes.forEach((code, idx) => {
    const trimmed = code.trim();
    if (!SPH_CODE.test(trimmed)) {
      issues.push({
        severity: 'error',
        segment: 'SPH',
        field: `code${idx + 1}`,
        message: `Código SPH "${trimmed}" no es válido. Debe ser exactamente 3 letras mayúsculas`,
        rule: 'SPH: Códigos SPL 3[a]',
        expected: 'Ej: EAP, PER, EAW',
        found: trimmed
      });
    }
  });

  // Máximo 9 códigos
  if (codes.length > 9) {
    issues.push({
      severity: 'error',
      segment: 'SPH',
      message: `SPH tiene ${codes.length} códigos. Máximo permitido: 9`,
      rule: 'SPH: Máximo 9 códigos',
      found: `${codes.length} códigos`
    });
  }

  // Verificar que tenga código e-AWB obligatorio
  const hasEawb = codes.some(c => EAWB_CODES.includes(c.trim()));
  if (!hasEawb) {
    issues.push({
      severity: 'error',
      segment: 'SPH',
      message: 'Falta código e-AWB obligatorio: EAW (sin bolsa de documentos) o EAP (con bolsa de documentos)',
      rule: 'SPH: Mandatorios e-AWB: EAW o EAP',
      suggestion: 'Agregar EAP (con bolsa) o EAW (sin bolsa)'
    });
  }

  // Info: verificar que EAW y EAP no estén ambos presentes
  const hasEAW = codes.some(c => c.trim() === 'EAW');
  const hasEAP = codes.some(c => c.trim() === 'EAP');
  if (hasEAW && hasEAP) {
    issues.push({
      severity: 'warning',
      segment: 'SPH',
      message: 'Se encontraron EAW y EAP simultáneamente. Usar solo uno: EAW (sin bolsa) o EAP (con bolsa)',
      rule: 'SPH: EAW y EAP son mutuamente excluyentes',
      suggestion: 'Remover uno de los dos códigos'
    });
  }
}

/**
 * OCI: Other Customs Information
 */
function validateOciSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') return; // OCI es opcional según aerolínea

  const ociLines = content.split('\n').filter(l => l.trim());
  
  ociLines.forEach((line, idx) => {
    // Formato: OCI/CC/PARTY/TYPE/VALUE
    // o: /CC/PARTY/TYPE/VALUE (después de la primera línea)
    const lineToCheck = line.startsWith('OCI') ? line.replace('OCI', '') : line;
    const parts = lineToCheck.split('/').filter(p => p !== '');
    
    if (parts.length < 4) {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        line: idx + 1,
        lineContent: line,
        message: `Línea OCI incompleta. Esperado: /País/Identificador/TipoControl/Información`,
        rule: 'OCI: 4 campos obligatorios (País, Party, Type, Value) [FNA: OCI0010]',
        found: line.substring(0, 40)
      });
      return;
    }

    // Validar país (2 letras)
    const country = parts[0].trim();
    if (country && !ISO_COUNTRY.test(country)) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'country',
        line: idx + 1,
        message: `Código de país OCI "${country}" no es válido (debe ser 2 letras ISO)`,
        rule: 'OCI: País 2[a] [FNA: OCI0015]',
        found: country
      });
    }

    // Validar identificador de información (CNE, SHP, AGT)
    const party = parts[1].trim();
    if (party && !OCI_PARTY_CODES.includes(party)) {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        field: 'party',
        line: idx + 1,
        message: `Identificador de información "${party}" no es estándar`,
        rule: 'OCI: Identificador de información 3[a] (CNE, SHP, AGT) [FNA: OCI0020]',
        expected: 'CNE, SHP, AGT, NFY',
        found: party
      });
    }

    // Validar identificador de control (T, RA, etc.)
    const type = parts[2].trim();
    if (type && type.length > 2 && !OCI_TYPE_CODES.includes(type)) {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        field: 'type',
        line: idx + 1,
        message: `Identificador de control "${type}" no es estándar`,
        rule: 'OCI: Identificador de control 1-2[a] (T, RA, CT, etc.) [FNA: OCI0025]',
        found: type
      });
    }

    // Validar información (hasta 35 chars)
    if (parts.length >= 4) {
      const value = parts[3].trim();
      if (value.length > 35) {
        issues.push({
          severity: 'warning',
          segment: 'OCI',
          field: 'value',
          line: idx + 1,
          message: `Información OCI excede 35 caracteres (tiene ${value.length})`,
          rule: 'OCI: Información hasta 35[m] [FNA: OCI0030]',
          found: value.substring(0, 40) + '...'
        });
      }
    }

    // China: sugerir 9999CN si entidad no tiene código
    if (country === 'CN') {
      issues.push({
        severity: 'info',
        segment: 'OCI',
        line: idx + 1,
        message: 'CHINA: Si la entidad no tiene código fiscal, usar "9999CN" como identificador (OCI /CN/CNE/T/9999CN).',
        rule: 'OCI China: Usar 9999CN para entidades sin código',
        suggestion: 'Si no tiene Tax ID, usar 9999CN'
      });
    }

    // USA: recordar Tax ID obligatorio para customs
    if (country === 'US') {
      issues.push({
        severity: 'info',
        segment: 'OCI',
        line: idx + 1,
        message: 'USA: La aduana de EE.UU. requiere Tax ID (EIN/SSN) del consignatario final en OCI.',
        rule: 'OCI USA: Tax ID obligatorio para customs clearance',
        suggestion: 'Verificar que el valor sea un EIN o SSN válido'
      });
    }
  });
}

/**
 * NFY: Also Notify
 */
function validateNfySegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') return; // NFY es opcional

  if (!content.startsWith('NFY')) {
    issues.push({
      severity: 'warning',
      segment: 'NFY',
      message: 'Segmento debe comenzar con "NFY"',
      rule: 'NFY: Tag obligatorio'
    });
  }

  // Misma estructura que SHP/CNE
  const nfyLines = content.split('\n').slice(1);
  if (nfyLines.length > 0) {
    const nameLine = nfyLines[0];
    if (nameLine) {
      const name = nameLine.replace(/^\//, '').trim();
      if (name.length > 35) {
        issues.push({
          severity: 'warning',
          segment: 'NFY',
          field: 'name',
          message: `Nombre de notificación excede 35 caracteres`,
          rule: 'NFY: Nombre hasta 35[t]',
          found: name.substring(0, 40)
        });
      }
    }
  }
}

// ============================================================
// VALIDACIÓN SEGMENTOS FHL
// ============================================================

function validateFhlSegment(
  segment: GeneratedSegment,
  message: GeneratedCargoImpMessage,
  policy?: AirlinePolicy
): SegmentValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = segment.content.split('\n').filter(l => l.trim());
  const segCode = segment.code as FhlSegmentType;

  switch (segCode) {
    case 'MBI':
      validateMbiSegment(lines, issues, segment);
      break;
    case 'HBS':
      validateHbsSegment(lines, issues, segment);
      break;
    case 'SHP':
      validatePartySegment('SHP', lines, issues, segment);
      break;
    case 'CNE':
      validatePartySegment('CNE', lines, issues, segment);
      break;
    case 'OCI':
      validateOciSegment(lines, issues, segment);
      break;
    case 'HTS':
      validateHtsSegment(lines, issues, segment);
      break;
    case 'TXT':
      validateTxtSegment(lines, issues, segment);
      break;
    case 'CVD':
      validateCvdSegment(lines, issues, segment, message);
      break;
  }

  // Validar caracteres permitidos
  if (!['FHL', 'FTR'].includes(segCode)) {
    lines.forEach((line, idx) => {
      validateAllowedChars(line, segCode, idx + 1, issues);
    });
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return {
    segment: segCode,
    segmentName: segment.name,
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    infoCount,
    lines
  };
}

/**
 * MBI: Master Bill Information (FHL)
 * Formato: MBI/n[3]-n[8]a[3]a[3]/an[1]n[1-4]a[1]n[1-7]
 * Incluye: Prefijo-Serial + Origen+Destino / Piezas + Peso
 */
function validateMbiSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'MBI',
      message: 'Segmento MBI está vacío. Es OBLIGATORIO en FHL.',
      rule: 'MBI: Información del Master AWB requerida'
    });
    return;
  }

  // Validar formato AWB en MBI: n[3]-n[8]a[3]a[3]/an[1]n[1-4]a[1]n[1-7]
  // Incluye peso: T{piezas}K{peso} o T{piezas}L{peso}
  const mbiMatch = content.match(/(\d{3})-(\d{8})([A-Z]{3})([A-Z]{3})\/T(\d{1,4})([KL])([\d.]+)?/);
  const mbiMatchNoPeso = !mbiMatch ? content.match(/(\d{3})-(\d{8})([A-Z]{3})([A-Z]{3})\/T(\d{1,4})/) : null;
  if (!mbiMatch && !mbiMatchNoPeso) {
    // Intentar al menos el AWB
    const awbMatch = content.match(/(\d{3})-(\d{8})/);
    if (!awbMatch) {
      issues.push({
        severity: 'error',
        segment: 'MBI',
        field: 'awbNumber',
        message: 'Número AWB no encontrado en formato correcto (999-12345678)',
        rule: 'MBI: AWB = prefijo(3n) + guión + serial(8n)',
        suggestion: 'Formato: MBI/992-56984125BOGMIA/T10'
      });
    } else {
      // Tiene AWB pero puede faltar el resto
      const serial = awbMatch[2];
      // Validar Mod-7 en MBI también
      const serialBase = serial.substring(0, 7);
      const checkDigit = parseInt(serial[7]);
      const expectedCheck = parseInt(serialBase) % 7;
      if (checkDigit !== expectedCheck) {
        issues.push({
          severity: 'error',
          segment: 'MBI',
          field: 'awbCheckDigit',
          message: `Dígito de control Mod-7 inválido en MBI. Serial "${serial}" → mod 7 = ${expectedCheck}, check es ${checkDigit}`,
          rule: 'MBI: El 8vo dígito del serial es check digit Mod-7',
          expected: `${serialBase}${expectedCheck}`,
          found: serial
        });
      }
      
      // Verificar que tenga origen/destino
      const locMatch = content.match(/\d{8}([A-Z]{3})([A-Z]{3})/);
      if (!locMatch) {
        issues.push({
          severity: 'error',
          segment: 'MBI',
          field: 'originDestination',
          message: 'Falta Origen(3a) + Destino(3a) después del serial AWB',
          rule: 'MBI: a[3]a[3] = Origen + Destino IATA',
          suggestion: 'Ej: MBI/992-56984125BOGMIA/T10'
        });
      }

      // Verificar piezas
      if (!content.includes('/T')) {
        issues.push({
          severity: 'warning',
          segment: 'MBI',
          field: 'pieces',
          message: 'Falta indicador de piezas /T{n} en MBI',
          rule: 'MBI: Piezas an[1]n[1-4] obligatorio'
        });
      }
    }
  } else if (mbiMatchNoPeso) {
    // Tiene AWB + origen/dest + piezas pero NO peso
    const serial = mbiMatchNoPeso[2];
    const serialBase = serial.substring(0, 7);
    const checkDigit = parseInt(serial[7]);
    const expectedCheck = parseInt(serialBase) % 7;
    if (checkDigit !== expectedCheck) {
      issues.push({
        severity: 'error',
        segment: 'MBI',
        field: 'awbCheckDigit',
        message: `Dígito de control Mod-7 inválido. Serial "${serial}" → mod 7 = ${expectedCheck}, check es ${checkDigit}`,
        rule: 'MBI: Mod-7 check digit',
        expected: `${serialBase}${expectedCheck}`,
        found: serial
      });
    }
    // Falta peso — spec dice a[1]n[1-7]
    issues.push({
      severity: 'warning',
      segment: 'MBI',
      field: 'weight',
      message: 'Falta indicador de peso K{n} o L{n} después de las piezas en MBI. Spec: a[1]n[1-7]',
      rule: 'MBI: Peso obligatorio (K=kilos, L=libras)',
      suggestion: 'Formato completo: MBI/992-56984125BOGMIA/T10K1500.0'
    });
  } else {
    // Match completo con peso — validar Mod-7
    const serial = mbiMatch![2];
    const serialBase = serial.substring(0, 7);
    const checkDigit = parseInt(serial[7]);
    const expectedCheck = parseInt(serialBase) % 7;
    if (checkDigit !== expectedCheck) {
      issues.push({
        severity: 'error',
        segment: 'MBI',
        field: 'awbCheckDigit',
        message: `Dígito de control Mod-7 inválido. Serial "${serial}" → mod 7 = ${expectedCheck}, check es ${checkDigit}`,
        rule: 'MBI: Mod-7 check digit',
        expected: `${serialBase}${expectedCheck}`,
        found: serial
      });
    }
    // Validar peso
    const weightVal = mbiMatch![7];
    if (weightVal) {
      if (!WEIGHT_PATTERN.test(weightVal) || parseFloat(weightVal) <= 0) {
        issues.push({
          severity: 'error',
          segment: 'MBI',
          field: 'weight',
          message: `Peso MBI "${weightVal}" inválido (debe ser número > 0)`,
          rule: 'MBI: Peso n[1-7] con decimales',
          found: weightVal
        });
      }
    }
  }
}

/**
 * HBS: House Bill Summary (FHL)
 */
function validateHbsSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'error',
      segment: 'HBS',
      message: 'Segmento HBS está vacío. Es OBLIGATORIO en FHL.',
      rule: 'HBS: Resumen de guía hija requerido'
    });
    return;
  }

  // Verificar que tenga HAWB number
  if (!content.includes('/')) {
    issues.push({
      severity: 'error',
      segment: 'HBS',
      field: 'hawbNumber',
      message: 'Falta número HAWB en el segmento HBS',
      rule: 'HBS: Número HAWB obligatorio'
    });
    return;
  }

  // Formato esperado (posicional):
  //   HBS/HAWBNUMBER/OOODDD/pcs/Kwgt/SLAC/DESC
  //   Índice: [0]=HAWB  [1]=ruta  [2]=piezas  [3]=peso  [4]=SLAC  [5+]=descripción
  // Las piezas pueden ser:
  //   - Número sin prefijo: "2"
  //   - Con indicador P/T: "P2", "T2"
  const hbsParts = content.replace(/^HBS\/?/, '').split('/').filter(p => p !== '');

  // [0] HAWB number (max 12 alfanumérico)
  if (hbsParts.length >= 1) {
    const hawb = hbsParts[0].trim();
    if (hawb.length === 0) {
      issues.push({
        severity: 'error',
        segment: 'HBS',
        field: 'hawbNumber',
        message: 'Número HAWB está vacío',
        rule: 'HBS: Número HAWB obligatorio (max 12 alfanuméricos)'
      });
    } else if (hawb.length > 12) {
      issues.push({
        severity: 'error',
        segment: 'HBS',
        field: 'hawbNumber',
        message: `Número HAWB "${hawb}" excede 12 caracteres (tiene ${hawb.length})`,
        rule: 'HBS: HAWB máximo 12 caracteres alfanuméricos',
        found: hawb
      });
    }
  }

  // [1] Origen+Destino (6 letras: 3+3)
  if (hbsParts.length >= 2) {
    const origDest = hbsParts[1].trim();
    if (origDest.length !== 6 || !ALPHA_ONLY.test(origDest)) {
      issues.push({
        severity: 'error',
        segment: 'HBS',
        field: 'originDestination',
        message: `Origen/Destino "${origDest}" inválido. Debe ser 6 letras (3 origen + 3 destino)`,
        rule: 'HBS: OOO+DDD = 6 letras IATA',
        expected: 'Ej: BOGMIA, UIOLHR',
        found: origDest
      });
    }
  } else {
    issues.push({
      severity: 'error',
      segment: 'HBS',
      field: 'originDestination',
      message: 'Falta Origen/Destino del House',
      rule: 'HBS: OOO+DDD obligatorio'
    });
  }

  // [2] Piezas — puede ser número sin prefijo ("2") o con prefijo P/T ("P2","T2")
  if (hbsParts.length >= 3) {
    const rawPieces = hbsParts[2].trim();
    let pcsValue: string;
    if (/^[PT]/i.test(rawPieces)) {
      pcsValue = rawPieces.substring(1);
    } else {
      pcsValue = rawPieces;
    }
    if (!NUMERIC_ONLY.test(pcsValue) || parseInt(pcsValue) <= 0) {
      issues.push({
        severity: 'error',
        segment: 'HBS',
        field: 'pieces',
        message: `Piezas "${rawPieces}" inválidas (debe ser número > 0)`,
        rule: 'HBS: Piezas numéricas > 0',
        found: rawPieces
      });
    }
  } else {
    issues.push({
      severity: 'error',
      segment: 'HBS',
      field: 'pieces',
      message: 'Faltan piezas en HBS',
      rule: 'HBS: Piezas obligatorias'
    });
  }

  // [3] Peso (K{n.n} o L{n.n})
  if (hbsParts.length >= 4) {
    const rawWeight = hbsParts[3].trim();
    if (/^[KL]/i.test(rawWeight)) {
      const wgt = rawWeight.substring(1);
      if (!WEIGHT_PATTERN.test(wgt) || parseFloat(wgt) <= 0) {
        issues.push({
          severity: 'error',
          segment: 'HBS',
          field: 'weight',
          message: `Peso "${wgt}" inválido (debe ser número > 0)`,
          rule: 'HBS: Peso numérico > 0',
          found: wgt
        });
      }
    } else {
      issues.push({
        severity: 'error',
        segment: 'HBS',
        field: 'weight',
        message: `Peso "${rawWeight}" no tiene indicador de unidad (K=kg, L=lb)`,
        rule: 'HBS: Indicador de peso K o L obligatorio',
        found: rawWeight,
        expected: 'Ej: K13.0, L28.6'
      });
    }
  } else {
    issues.push({
      severity: 'error',
      segment: 'HBS',
      field: 'weight',
      message: 'Falta peso en HBS',
      rule: 'HBS: Peso obligatorio'
    });
  }

  // [4] SLAC (n[1-4]) — Shipper's Load and Count
  if (hbsParts.length >= 5) {
    const slacPart = hbsParts[4].trim();
    if (NUMERIC_ONLY.test(slacPart)) {
      if (slacPart.length > 4) {
        issues.push({
          severity: 'warning',
          segment: 'HBS',
          field: 'slac',
          message: `SLAC "${slacPart}" excede 4 dígitos (máximo n[1-4])`,
          rule: 'HBS: SLAC hasta 4 dígitos numéricos',
          found: slacPart
        });
      }
      // SLAC válido, no emitir info
    } else {
      // Posición 4 no es numérica — podría ser descripción sin SLAC
      issues.push({
        severity: 'info',
        segment: 'HBS',
        field: 'slac',
        message: 'No se detectó SLAC (Shipper Load And Count) en HBS. Aduanas puede requerirlo (n[1-4]).',
        rule: 'HBS: SLAC recomendado (n[1-4])',
        suggestion: 'Agregar cantidad SLAC después del peso en la línea HBS'
      });
    }
  } else {
    issues.push({
      severity: 'info',
      segment: 'HBS',
      field: 'slac',
      message: 'No se detectó SLAC (Shipper Load And Count) en HBS. Aduanas puede requerirlo (n[1-4]).',
      rule: 'HBS: SLAC recomendado (n[1-4])',
      suggestion: 'Agregar cantidad SLAC después del peso en la línea HBS'
    });
  }

  // [5+] Descripción de mercancía — todo después del SLAC
  const descIndex = hbsParts.length >= 5 && NUMERIC_ONLY.test(hbsParts[4]?.trim()) ? 5 : 4;
  const descParts = hbsParts.slice(descIndex);
  const descText = descParts.join('/').trim();
  
  if (descText) {
    if (descText.length > 20) {
      issues.push({
        severity: 'warning',
        segment: 'HBS',
        field: 'description',
        message: `Descripción "${descText}" es larga (${descText.length} chars). En HBS se recomienda breve; detalles van en TXT.`,
        rule: 'HBS: Descripción breve recomendada',
        found: descText
      });
    }
  } else {
    issues.push({
      severity: 'info',
      segment: 'HBS',
      field: 'description',
      message: 'No se detectó descripción de mercancía en HBS. Aduanas puede requerir descripción.',
      rule: 'HBS: Descripción recomendada para customs',
      suggestion: 'Agregar descripción breve de la mercancía al final de la línea HBS'
    });
  }
}

/**
 * HTS: Harmonized Tariff Schedule (FHL)
 */
function validateHtsSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') return;

  const codes = content.split('\n').filter(l => l.trim());
  codes.forEach((line, idx) => {
    const htsMatch = line.match(/\/(\d+)/);
    if (htsMatch) {
      if (htsMatch[1].length < 6) {
        issues.push({
          severity: 'warning',
          segment: 'HTS',
          field: 'code',
          line: idx + 1,
          message: `Código HTS "${htsMatch[1]}" tiene menos de 6 dígitos`,
          rule: 'HTS: Código HTS mínimo 6 dígitos',
          found: htsMatch[1]
        });
      }
    }
  });
}

/**
 * TXT: Free Text Description (FHL)
 * Spec: TXT/an[1-65] — Cada línea hasta 65 caracteres alfanuméricos.
 * Se usa para descripciones largas de aduanas que no caben en HBS.
 */
function validateTxtSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
  const content = segment.content;
  if (!content || content.trim() === '') {
    issues.push({
      severity: 'warning',
      segment: 'TXT',
      message: 'Segmento TXT está vacío. Si se incluye, debe contener descripción de mercancía.',
      rule: 'TXT: Contenido obligatorio si segmento habilitado'
    });
    return;
  }

  const txtLines = content.split('\n').filter(l => l.trim());

  txtLines.forEach((line, idx) => {
    const cleanLine = line.replace(/^TXT\/?/, '').replace(/^\//, '');

    // Cada línea: máximo 65 caracteres (an[1-65])
    if (cleanLine.length > 65) {
      issues.push({
        severity: 'error',
        segment: 'TXT',
        line: idx + 1,
        lineContent: line.substring(0, 70),
        message: `Línea TXT excede 65 caracteres (tiene ${cleanLine.length}). Dividir en múltiples líneas.`,
        rule: 'TXT: Máximo 65 caracteres por línea (an[1-65])',
        found: cleanLine.substring(0, 40) + '...'
      });
    }

    // Verificar que no esté vacía después del tag
    if (cleanLine.trim() === '') {
      issues.push({
        severity: 'warning',
        segment: 'TXT',
        line: idx + 1,
        message: 'Línea TXT vacía después del tag',
        rule: 'TXT: Contenido mínimo 1 carácter (an[1-65])'
      });
    }
  });
}

// ============================================================
// LISTA EXTENDIDA DE DESCRIPCIONES VAGAS (Sección 6 del Manual)
// Términos que causan ACAS hold / DNL / rechazo aduanero
// ============================================================

const VAGUE_DESCRIPTIONS_EXACT: string[] = [
  'CONSOLIDATION', 'CONSOLIDATED', 'PARTS', 'GOODS', 'GENERAL', 'VARIOUS',
  'MISC', 'MISCELLANEOUS', 'SAMPLES', 'PERSONAL EFFECTS', 'MERCHANDISE',
  'CARGO', 'ITEMS', 'STUFF', 'THINGS',
  // Ampliación según Sección 6 del manual
  'SPARE PARTS', 'MACHINE PARTS', 'AUTO PARTS', 'AUTO', 'AUTOMOBILES',
  'EQUIPMENT', 'INDUSTRIAL EQUIPMENT', 'ELECTRONICS', 'ELECTRONIC GOODS',
  'CONSUMER GOODS', 'GENERAL MERCHANDISE', 'HOUSEHOLD GOODS',
  'GIFTS', 'NOVELTY ITEMS', 'MACHINERY', 'MACHINES', 'TOOLS',
  'ACCESSORIES', 'HARDWARE', 'SOFTWARE', 'CHEMICALS', 'MATERIALS',
  'DOCUMENTS', 'DOCS', 'DOX', 'FOODSTUFF', 'FOOD', 'MEAT', 'FISH', 'SNACKS',
  'CLOTHING', 'GARMENTS', 'APPAREL', 'WEARING APPAREL',
  'FAK', 'SAID TO CONTAIN', 'AS PER INVOICE', 'AS PER ATTACHED',
  'REFER TO ATTACHED', 'AS ORDERED', 'ANIMALS', 'APPLIANCES',
  'CLEANING PRODUCTS', 'CRAFTS', 'HANDICRAFTS', 'FLOORING',
  'IRON AND STEEL', 'METAL', 'LEATHER ARTICLES',
  'MEDICAL SUPPLIES', 'BIOLOGICALS', 'MEDICATION', 'PHARMACEUTICALS',
  'OIL', 'ONLINE RETAILER', 'ONLINE RETAILER SHIPMENT',
  'PACKAGING', 'BOXES', 'CARTONS', 'PAPER', 'PLANTS', 'FLOWERS', 'CUTTINGS',
  'PLASTIC GOODS', 'INDUSTRIAL PLASTICS', 'POWDER',
  'RUBBER ARTICLES', 'SCRAP', 'SPORTING GOODS',
  'STATIONERY', 'DIDACTIC ARTICLES', 'STEEL',
  'SUPPLEMENTS', 'SUPPLIES', 'PROMOTIONAL ITEMS',
  'TEXTILES', 'TILES', 'TOILETRIES', 'BATHROOM PRODUCTS', 'SANITARY GOODS',
  'TOYS', 'GAMES', 'VEHICLES', 'WIRES', 'WOOD',
  'BAZAAR GOODS', 'CAPS'
];

/** Términos que disparan revisión adicional (no rechazo, sí escrutinio DG) */
const DG_SCRUTINY_TERMS: string[] = [
  'LITHIUM', 'BATTERY', 'BATTERIES', 'POWDER', 'LIQUID', 'AEROSOL',
  'MAGNETIC', 'GAS', 'RADIOACTIVE', 'VACCINE', 'DUAL USE',
  'AMMUNITION', 'WEAPON', 'EXPLOSIVE'
];

// ============================================================
// VALIDACIONES GLOBALES
// ============================================================

function validateGlobalRules(
  message: GeneratedCargoImpMessage, 
  enabledSegments: GeneratedSegment[],
  policy?: AirlinePolicy
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const segCodes = enabledSegments.map(s => s.code);

  if (message.type === 'FWB') {
    // Segmentos obligatorios FWB
    const requiredFwbSegments = ['AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'CVD', 'RTD', 'ISU', 'SPH'];
    requiredFwbSegments.forEach(seg => {
      if (!segCodes.includes(seg)) {
        issues.push({
          severity: 'error',
          segment: 'GLOBAL',
          message: `Falta segmento OBLIGATORIO: ${seg}`,
          rule: `FWB: Segmento ${seg} es requerido por IATA [FNA: ${seg}0010]`,
          suggestion: `Habilitar el segmento ${seg}`
        });
      }
    });

    // Verificar segmentos vacíos que están habilitados y son obligatorios
    enabledSegments.forEach(seg => {
      if (seg.content.trim() === '' && requiredFwbSegments.includes(seg.code)) {
        issues.push({
          severity: 'error',
          segment: seg.code,
          message: `Segmento ${seg.code} (${seg.name}) está habilitado pero vacío. Es obligatorio.`,
          rule: `${seg.code}: Contenido obligatorio [FNA: ${seg.code}0010]`
        });
      }
    });

    // Verificar coherencia AWB número
    const awbSeg = enabledSegments.find(s => s.code === 'AWB');
    if (awbSeg && message.awbNumber) {
      const awbClean = message.awbNumber.replace(/-/g, '').replace(/\s/g, '');
      if (awbClean.length !== 11) {
        issues.push({
          severity: 'error',
          segment: 'GLOBAL',
          field: 'awbNumber',
          message: `Número AWB "${message.awbNumber}" no tiene 11 dígitos (3 prefijo + 8 serial)`,
          rule: 'AWB IATA: 11 dígitos (3 airline prefix + 8 serial) [FNA: AWB0020]',
          found: awbClean,
          expected: '11 dígitos'
        });
      }
    }

    // ===========================================================
    // VALIDACIÓN AWB destino == último RTG destino
    // ===========================================================
    const awbContent = enabledSegments.find(s => s.code === 'AWB')?.content || '';
    const rtgContent = enabledSegments.find(s => s.code === 'RTG')?.content || '';
    const awbDestMatch = awbContent.match(/[A-Z]{3}([A-Z]{3})\/T/);
    if (awbDestMatch && rtgContent) {
      const awbDest = awbDestMatch[1];
      const rtgParts = rtgContent.replace('RTG', '').split('/').filter(p => p.trim());
      if (rtgParts.length > 0) {
        const lastRtg = rtgParts[rtgParts.length - 1].trim();
        const lastRtgAirport = lastRtg.substring(0, 3);
        if (lastRtgAirport && IATA_AIRPORT.test(lastRtgAirport) && lastRtgAirport !== awbDest) {
          issues.push({
            severity: 'error',
            segment: 'GLOBAL',
            field: 'rtg_awb_mismatch',
            message: `Destino AWB "${awbDest}" no coincide con último punto RTG "${lastRtgAirport}"`,
            rule: 'RTG: El último destino del RTG debe coincidir con el destino del AWB [FNA: AWB9040]',
            found: `AWB dest: ${awbDest}, RTG último: ${lastRtgAirport}`,
            suggestion: 'Corregir el RTG para que termine en el destino del AWB'
          });
        }
      }
    }

    // ===========================================================
    // VALIDACIONES POR PAÍS DE DESTINO (Sección 5 del Manual)
    // ===========================================================
    const destinationCode = extractDestinationAirport(enabledSegments);
    const destinationCountry = getCountryFromAirport(destinationCode);
    if (destinationCountry) {
      const countryIssues = validateCountrySpecificRules(
        destinationCountry, destinationCode, enabledSegments, message
      );
      issues.push(...countryIssues);
    }

    // ===========================================================
    // VALIDACIÓN: FWB consolidación debe usar /NC no /NG
    // ===========================================================
    const isConsolidation = !!message.isConsolidation || !!message.hawbNumber || enabledSegments.some(s => s.content?.includes('/NC/'));
    if (isConsolidation) {
      const ngSeg = enabledSegments.find(s => s.code === 'NG');
      if (ngSeg && ngSeg.content.includes('/NG/')) {
        issues.push({
          severity: 'error',
          segment: 'NG',
          message: 'FWB master de consolidación debería usar /NC/ (Nature-Consolidation) en vez de /NG/ (Nature-General)',
          rule: 'RTD: /NC para consolidaciones, /NG para directos (§9.5.3)',
          suggestion: 'Cambiar /NG/ por /NC/ y agregar "CONSOLIDATION AS PER ATTACHED MANIFEST"'
        });
      }
    }
  }

  if (message.type === 'FHL') {
    // Segmentos obligatorios FHL
    const requiredFhlSegments = ['MBI', 'HBS'];
    requiredFhlSegments.forEach(seg => {
      if (!segCodes.includes(seg)) {
        issues.push({
          severity: 'error',
          segment: 'GLOBAL',
          message: `Falta segmento OBLIGATORIO para FHL: ${seg}`,
          rule: `FHL: Segmento ${seg} es requerido`
        });
      }
    });

    // ===========================================================
    // VALIDACIÓN CRUZADA FWB ↔ FHL: piezas y peso
    // NOTA: Solo tiene sentido cuando hay MÚLTIPLES HBS en el mismo mensaje.
    // En FHL individuales (1 house por mensaje) siempre diferirá del master.
    // ===========================================================
    const mbiSeg = enabledSegments.find(s => s.code === 'MBI');
    const hbsSegs = enabledSegments.filter(s => s.code === 'HBS');
    if (mbiSeg && hbsSegs.length > 1) {
      // Extraer totales del MBI
      const mbiPiecesMatch = mbiSeg.content.match(/\/T(\d+)/);
      const mbiWeightMatch = mbiSeg.content.match(/[KL]([\d.]+)/);
      const mbiTotalPieces = mbiPiecesMatch ? parseInt(mbiPiecesMatch[1]) : 0;
      const mbiTotalWeight = mbiWeightMatch ? parseFloat(mbiWeightMatch[1]) : 0;

      // Sumar piezas y peso de todos los HBS
      let hbsTotalPieces = 0;
      let hbsTotalWeight = 0;
      for (const hbs of hbsSegs) {
        const hbsPiecesMatch = hbs.content.match(/[PT](\d+)/);
        const hbsWeightMatch = hbs.content.match(/[KL]([\d.]+)/);
        if (hbsPiecesMatch) hbsTotalPieces += parseInt(hbsPiecesMatch[1]);
        if (hbsWeightMatch) hbsTotalWeight += parseFloat(hbsWeightMatch[1]);
      }

      // Verificar piezas (tolerancia = 0)
      if (mbiTotalPieces > 0 && hbsTotalPieces > 0 && mbiTotalPieces !== hbsTotalPieces) {
        issues.push({
          severity: 'error',
          segment: 'GLOBAL',
          field: 'crossValidation_pieces',
          message: `Total piezas MBI (${mbiTotalPieces}) ≠ suma piezas HBS (${hbsTotalPieces})`,
          rule: 'FHL §9.5.3: Suma de piezas de todos los HBS debe = total del master MBI [FNA: AWB9070]',
          expected: `${mbiTotalPieces} piezas`,
          found: `${hbsTotalPieces} piezas (${hbsSegs.length} houses)`
        });
      }

      // Verificar peso (tolerancia ±2%)
      if (mbiTotalWeight > 0 && hbsTotalWeight > 0) {
        const weightDiff = Math.abs(mbiTotalWeight - hbsTotalWeight);
        const weightTolerance = mbiTotalWeight * 0.02;
        if (weightDiff > weightTolerance) {
          issues.push({
            severity: 'error',
            segment: 'GLOBAL',
            field: 'crossValidation_weight',
            message: `Peso MBI (${mbiTotalWeight} kg) difiere de suma HBS (${hbsTotalWeight.toFixed(1)} kg) por ${weightDiff.toFixed(1)} kg (> 2% tolerancia)`,
            rule: 'FHL §9.5.3: Suma peso HBS ≈ total MBI (tolerancia ±2%) [FNA: AWB9070]',
            expected: `${mbiTotalWeight} kg ± ${weightTolerance.toFixed(1)}`,
            found: `${hbsTotalWeight.toFixed(1)} kg`
          });
        }
      }
    }

    // ===========================================================
    // VALIDACIONES POR PAÍS DE DESTINO en FHL
    // ===========================================================
    const hbsSegsForDest = enabledSegments.filter(s => s.code === 'HBS');
    for (const hbs of hbsSegsForDest) {
      const hbsDestMatch = hbs.content.match(/[A-Z]{3}([A-Z]{3})/);
      if (hbsDestMatch) {
        const hbsDestAirport = hbsDestMatch[1];
        const hbsDestCountry = getCountryFromAirport(hbsDestAirport);
        if (hbsDestCountry) {
          const countryIssues = validateCountrySpecificRules(
            hbsDestCountry, hbsDestAirport, enabledSegments, message
          );
          issues.push(...countryIssues);
        }
      }
    }
  }

  return issues;
}

// ============================================================
// HELPER: Extraer aeropuerto destino del AWB
// ============================================================

function extractDestinationAirport(enabledSegments: GeneratedSegment[]): string {
  const awbSeg = enabledSegments.find(s => s.code === 'AWB');
  if (!awbSeg) return '';
  const match = awbSeg.content.match(/[A-Z]{3}([A-Z]{3})\/T/);
  return match ? match[1] : '';
}

// ============================================================
// MAPEO AEROPUERTO → CÓDIGO PAÍS (principales aeropuertos)
// ============================================================

function getCountryFromAirport(airportCode: string): string {
  const airportCountryMap: Record<string, string> = {
    // Egipto
    'CAI': 'EG', 'HRG': 'EG', 'SSH': 'EG', 'LXR': 'EG', 'ALY': 'EG',
    // Indonesia
    'CGK': 'ID', 'DPS': 'ID', 'SUB': 'ID', 'JOG': 'ID', 'BPN': 'ID', 'UPG': 'ID',
    // UAE
    'DXB': 'AE', 'AUH': 'AE', 'SHJ': 'AE', 'RKT': 'AE',
    // Bangladesh
    'DAC': 'BD', 'CGP': 'BD', 'ZYL': 'BD',
    // Sri Lanka
    'CMB': 'LK', 'HRI': 'LK',
    // Marruecos
    'CMN': 'MA', 'RBA': 'MA', 'RAK': 'MA', 'FEZ': 'MA', 'TNG': 'MA',
    // Turquía
    'IST': 'TR', 'SAW': 'TR', 'ESB': 'TR', 'ADB': 'TR', 'AYT': 'TR',
    // Jordania
    'AMM': 'JO', 'AQJ': 'JO',
    // Kenia
    'NBO': 'KE', 'MBA': 'KE',
    // USA
    'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'MIA': 'US', 'ATL': 'US', 'DFW': 'US',
    'SFO': 'US', 'EWR': 'US', 'IAD': 'US', 'IAH': 'US', 'BOS': 'US', 'SEA': 'US',
    'MSP': 'US', 'DTW': 'US', 'PHL': 'US', 'CLT': 'US', 'DEN': 'US', 'PHX': 'US',
    'MCO': 'US', 'FLL': 'US', 'TPA': 'US', 'SAN': 'US', 'CVG': 'US', 'MEM': 'US',
    'SDF': 'US', 'ANC': 'US', 'HNL': 'US',
    // Canadá
    'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA', 'YOW': 'CA', 'YEG': 'CA', 'YYC': 'CA',
    'YWG': 'CA', 'YHZ': 'CA',
    // EU principales
    'FRA': 'DE', 'MUC': 'DE', 'HAM': 'DE', 'CGN': 'DE', 'DUS': 'DE', 'BER': 'DE',
    'CDG': 'FR', 'ORY': 'FR', 'NCE': 'FR', 'LYS': 'FR',
    'AMS': 'NL', 'RTM': 'NL',
    'BRU': 'BE', 'LGG': 'BE',
    'MAD': 'ES', 'BCN': 'ES', 'ZAZ': 'ES',
    'FCO': 'IT', 'MXP': 'IT', 'LIN': 'IT',
    'LIS': 'PT', 'OPO': 'PT',
    'VIE': 'AT', 'ZRH': 'CH', 'GVA': 'CH',
    'CPH': 'DK', 'OSL': 'NO', 'ARN': 'SE', 'HEL': 'FI',
    'WAW': 'PL', 'PRG': 'CZ', 'BUD': 'HU', 'OTP': 'RO',
    'ATH': 'GR', 'SOF': 'BG', 'ZAG': 'HR',
    'DUB': 'IE', 'LUX': 'LU',
    // UK
    'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'STN': 'GB', 'EDI': 'GB', 'BHX': 'GB',
    'EMA': 'GB', 'BFS': 'GB',
    // China
    'PVG': 'CN', 'PEK': 'CN', 'CAN': 'CN', 'SZX': 'CN', 'CTU': 'CN', 'HKG': 'HK',
    'XIY': 'CN', 'WUH': 'CN', 'NKG': 'CN', 'TSN': 'CN', 'CKG': 'CN',
    // Arabia Saudita
    'JED': 'SA', 'RUH': 'SA', 'DMM': 'SA',
    // Otros
    'SIN': 'SG', 'KUL': 'MY', 'BKK': 'TH', 'ICN': 'KR', 'NRT': 'JP', 'HND': 'JP',
    'KIX': 'JP', 'DEL': 'IN', 'BOM': 'IN', 'MAA': 'IN', 'BLR': 'IN',
    'GRU': 'BR', 'VCP': 'BR', 'GIG': 'BR',
    'MEX': 'MX', 'GDL': 'MX',
    'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU', 'PER': 'AU',
    'AKL': 'NZ', 'CHC': 'NZ',
    'JNB': 'ZA', 'CPT': 'ZA',
    'LOS': 'NG', 'ABV': 'NG',
    'TLV': 'IL', 'ISB': 'PK', 'KHI': 'PK', 'LHE': 'PK',
    'BEY': 'LB', 'DOH': 'QA', 'BAH': 'BH', 'MCT': 'OM', 'KWI': 'KW',
    // Colombia
    'BOG': 'CO', 'MDE': 'CO', 'CLO': 'CO', 'CTG': 'CO', 'BAQ': 'CO',
    // Ecuador
    'UIO': 'EC', 'GYE': 'EC'
  };
  return airportCountryMap[airportCode] || '';
}

// Lista de países EU para validación ICS2/EORI
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// ============================================================
// VALIDACIONES POR PAÍS DE DESTINO (Sección 5 del Manual)
// ============================================================

function validateCountrySpecificRules(
  countryCode: string,
  airportCode: string,
  enabledSegments: GeneratedSegment[],
  message: GeneratedCargoImpMessage
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fullMessage = message.fullMessage || '';
  const ociContent = enabledSegments.find(s => s.code === 'OCI')?.content || '';
  const cvdContent = enabledSegments.find(s => s.code === 'CVD')?.content || '';
  const cneContent = enabledSegments.find(s => s.code === 'CNE')?.content || '';
  const sphContent = enabledSegments.find(s => s.code === 'SPH')?.content || '';
  const rtdContent = enabledSegments.find(s => s.code === 'RTD')?.content || '';
  const nhContent = enabledSegments.find(s => s.code === 'NH')?.content || '';
  const hbsSegs = enabledSegments.filter(s => s.code === 'HBS');

  // -----------------------------------------------------------
  // EGIPTO (EG) — ACID + Enterprise Codes (Nafeza) §5.4
  // -----------------------------------------------------------
  if (countryCode === 'EG') {
    // ACID Number obligatorio
    const hasAcid = /OCI\/EG\/IMP\/M\/\d{19}/.test(ociContent) || /OCI\/EG\/IMP\/M\/\d{19}/.test(fullMessage);
    if (!hasAcid) {
      // En consolidaciones, ACID va en FHL no en FWB
      const isConsoEG = !!message.hawbNumber || enabledSegments.some(s => s.content?.includes('/NC/'));
      if (message.type === 'FHL' || !isConsoEG) {
        issues.push({
          severity: 'error',
          segment: 'OCI',
          field: 'ACID',
          message: `EGIPTO: Falta ACID Number (19 dígitos) obligatorio para destino ${airportCode}. Sin ACID válido la carga será RECHAZADA.`,
          rule: 'OCI §5.4: OCI/EG/IMP/M/<19 dígitos> obligatorio para Egipto [FNA: OCI-EG-001]',
          suggestion: 'Agregar: OCI/EG/IMP/M/1234567890123456789 (19 dígitos del portal Nafeza)'
        });
      }
    } else {
      // Validar formato ACID: exactamente 19 dígitos
      const acidMatch = ociContent.match(/OCI\/EG\/IMP\/M\/(\S+)/) || fullMessage.match(/OCI\/EG\/IMP\/M\/(\S+)/);
      if (acidMatch) {
        const acidValue = acidMatch[1];
        if (!/^\d{19}$/.test(acidValue)) {
          issues.push({
            severity: 'error',
            segment: 'OCI',
            field: 'ACID',
            message: `EGIPTO: ACID "${acidValue}" formato inválido. Debe ser exactamente 19 dígitos numéricos.`,
            rule: 'OCI §5.4: ACID = 19 dígitos sin letras ni prefijo [FNA: OCI-EG-002]',
            found: acidValue,
            expected: '19 dígitos numéricos (ej: 1234567890123456789)'
          });
        }
      }
    }

    // Enterprise Code CNE obligatorio
    const hasCneEntCode = /OCI\/EG\/CNE\/T\//.test(ociContent) || /OCI\/EG\/CNE\/T\//.test(fullMessage);
    if (!hasCneEntCode) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'enterpriseCode_CNE',
        message: `EGIPTO: Falta Enterprise Code del Consignee para destino ${airportCode}`,
        rule: 'OCI §5.4: OCI/EG/CNE/T/<enterprise_code> obligatorio [FNA: OCI-EG-004]',
        suggestion: 'Agregar: OCI/EG/CNE/T/<Enterprise Code del consignee registrado en Nafeza>'
      });
    }

    // Enterprise Code SHP obligatorio (desde enero 2026)
    const hasShpEntCode = /OCI\/EG\/SHP\/T\//.test(ociContent) || /OCI\/EG\/SHP\/T\//.test(fullMessage);
    if (!hasShpEntCode) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'enterpriseCode_SHP',
        message: `EGIPTO: Falta Enterprise Code del Shipper para destino ${airportCode} (obligatorio desde enero 2026)`,
        rule: 'OCI §5.4: OCI/EG/SHP/T/<enterprise_code> obligatorio [FNA: OCI-EG-005]',
        suggestion: 'Agregar: OCI/EG/SHP/T/<Enterprise Code del shipper>'
      });
    }

    // En consolidación, ACID NO debe ir en FWB master
    const isConsoEG2 = !!message.hawbNumber || enabledSegments.some(s => s.content?.includes('/NC/'));
    if (message.type === 'FWB' && isConsoEG2) {
      const hasAcidInMaster = /OCI\/EG\/IMP\/M\//.test(ociContent);
      if (hasAcidInMaster) {
        issues.push({
          severity: 'error',
          segment: 'OCI',
          field: 'ACID_master',
          message: 'EGIPTO: ACID Number NO debe ir en FWB master de consolidación. Debe ir en cada FHL (house).',
          rule: 'OCI §5.4: En consolidaciones ACID va a nivel house (FHL), no master [FNA: OCI-EG-007]',
          suggestion: 'Mover OCI/EG/IMP/M/... al FHL de cada house'
        });
      }
    }
  }

  // -----------------------------------------------------------
  // INDONESIA (ID) — NPWP/TIN 16 dígitos §5.5
  // -----------------------------------------------------------
  if (countryCode === 'ID') {
    const hasNpwp = /OCI\/ID\/CNE\/T\/(TIN|NPWP)\d{16}/.test(ociContent) || /OCI\/ID\/CNE\/T\/(TIN|NPWP)\d{16}/.test(fullMessage);
    const hasNib = /OCI\/ID\/CNE\/T\/NIB\d{13}/.test(ociContent) || /OCI\/ID\/CNE\/T\/NIB\d{13}/.test(fullMessage);
    if (!hasNpwp && !hasNib) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'NPWP',
        message: `INDONESIA: Falta NPWP/TIN (16 dígitos) o NIB (13 dígitos) del consignee para destino ${airportCode}`,
        rule: 'OCI §5.5: OCI/ID/CNE/T/TIN<16 dígitos> obligatorio para Indonesia [FNA: OCI-ID-001]',
        suggestion: 'Agregar: OCI/ID/CNE/T/TIN0123451234512345 (16 dígitos sin separadores)'
      });
    }
    // Detectar formato obsoleto (con puntos/guiones)
    const oldFormat = /OCI\/ID\/T\/TN\/\d{2}\.\d{3}/.test(ociContent) || /OCI\/ID\/T\/TN\/\d{2}\.\d{3}/.test(fullMessage);
    if (oldFormat) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'NPWP_format',
        message: 'INDONESIA: Formato NPWP obsoleto detectado (con puntos/guiones). Usar 16 dígitos sin separadores con prefijo TIN o NPWP.',
        rule: 'OCI §5.5: Formato 2026 = TIN + 16 dígitos [FNA: OCI-ID-002]',
        suggestion: 'Cambiar a: OCI/ID/CNE/T/TIN<16 dígitos sin separadores>'
      });
    }
  }

  // -----------------------------------------------------------
  // UAE (AE) — PLACI: HS Code + descripción estricta §5.6
  // -----------------------------------------------------------
  if (countryCode === 'AE') {
    // HS Code obligatorio (6+ dígitos)
    const hasHsCode = /\/NH\/\d{6}/.test(rtdContent) || /\/NH\/\d{6}/.test(nhContent) || /\/NH\/\d{6}/.test(fullMessage);
    const hasHTS = hbsSegs.some(s => /\/T\d{6}/.test(s.content));
    if (!hasHsCode && !hasHTS) {
      issues.push({
        severity: 'error',
        segment: 'GLOBAL',
        field: 'HS_UAE',
        message: `UAE PLACI: Falta HS Code (mínimo 6 dígitos) obligatorio para destino ${airportCode}. Sin HS Code: DNL (Do Not Load).`,
        rule: 'PLACI §5.6: HS Code 6+ dígitos obligatorio desde 29/Feb/2024 para UAE',
        suggestion: 'Agregar código HS en RTD: /NH/060311 (6 dígitos mínimo)'
      });
    }

    // Nombres de shipper/consignee deben ser del trader REAL (no forwarder)
    const cneNameMatch = cneContent.match(/(?:\/NM|\/NAM\/|^CNE\n\/)(.*)/);
    if (cneNameMatch) {
      const cneName = cneNameMatch[1].replace(/^\//, '').trim().toUpperCase();
      const placeholders = ['TBD', 'TBC', 'UNKNOWN', 'N/A', 'NA', 'NONE', 'TO ORDER', 'TO BE ADVISED'];
      if (placeholders.some(p => cneName === p || cneName.startsWith(p))) {
        issues.push({
          severity: 'error',
          segment: 'CNE',
          field: 'name_UAE',
          message: `UAE PLACI: Nombre consignee "${cneName}" no aceptado. Debe ser nombre del destinatario REAL (no placeholder).`,
          rule: 'PLACI §5.6.3: Nombre debe ser del ultimate consignee real',
          found: cneName,
          suggestion: 'Usar nombre completo legal de la empresa o persona'
        });
      }
    }
  }

  // -----------------------------------------------------------
  // BANGLADESH (BD) — BIN + DCV obligatorio §5.7
  // -----------------------------------------------------------
  if (countryCode === 'BD') {
    // BIN obligatorio
    const hasBin = /OCI\/BD\/(CNE|NFY)\/T\/BIN\d{9}-\d{4}/.test(ociContent) || /OCI\/BD\/(CNE|NFY)\/T\/BIN\d{9}-\d{4}/.test(fullMessage);
    if (!hasBin) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'BIN',
        message: `BANGLADESH: Falta BIN (Business Identification Number) del consignee para destino ${airportCode}`,
        rule: 'OCI §5.7.2: OCI/BD/CNE/T/BIN<9 dígitos>-<4 dígitos> obligatorio',
        suggestion: 'Agregar: OCI/BD/CNE/T/BIN123456789-0001'
      });
    }

    // DCV obligatorio — NCV no aceptado
    if (cvdContent.includes('NCV')) {
      issues.push({
        severity: 'error',
        segment: 'CVD',
        field: 'DCV_BD',
        message: `BANGLADESH: NCV (No Customs Value) NO es aceptado para destino ${airportCode}. Debe declarar valor numérico.`,
        rule: 'CVD §5.7.1: Valor aduanero obligatorio. Si no hay valor, usar 0 [FNA: CVD0040]',
        found: 'NCV',
        suggestion: 'Reemplazar NCV por 0 o el valor real de la mercancía'
      });
    }
  }

  // -----------------------------------------------------------
  // SRI LANKA (LK) — DCV obligatorio §5.12
  // -----------------------------------------------------------
  if (countryCode === 'LK') {
    if (cvdContent.includes('NCV')) {
      issues.push({
        severity: 'error',
        segment: 'CVD',
        field: 'DCV_LK',
        message: `SRI LANKA: NCV NO es aceptado para destino ${airportCode}. Declarar valor numérico obligatorio.`,
        rule: 'CVD §5.12: Valor aduanero obligatorio desde 1/Ago/2023. Usar 0 si no hay valor.',
        found: 'NCV',
        suggestion: 'Reemplazar NCV por 0 o el valor real'
      });
    }
  }

  // -----------------------------------------------------------
  // MARRUECOS (MA) — Trade Register + HS 4+ dígitos §5.9
  // -----------------------------------------------------------
  if (countryCode === 'MA') {
    const hasTradeRegister = /OCI\/MA\/CNE\/T\//.test(ociContent) || /OCI\/MA\/CNE\/T\//.test(fullMessage);
    if (!hasTradeRegister) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'tradeRegister_MA',
        message: `MARRUECOS: Falta Trade Register Number del consignee para destino ${airportCode}`,
        rule: 'OCI §5.9.1: OCI/MA/CNE/T/<trade_register> obligatorio. Para no-corporativo usar 15 ceros.',
        suggestion: 'Agregar: OCI/MA/CNE/T/0XX0XXXX o OCI/MA/CNE/T/000000000000000 (si no es empresa)'
      });
    }

    // HS Code 4+ dígitos obligatorio
    const hasHs = /\/NH\/\d{4}/.test(rtdContent) || /\/NH\/\d{4}/.test(nhContent) || /\/NH\/\d{4}/.test(fullMessage);
    if (!hasHs) {
      issues.push({
        severity: 'error',
        segment: 'GLOBAL',
        field: 'HS_MA',
        message: `MARRUECOS: Falta HS Code (mínimo 4 dígitos) obligatorio para destino ${airportCode}`,
        rule: 'HS §5.9.2: Código HS 4+ dígitos obligatorio para Marruecos',
        suggestion: 'Agregar código HS en RTD /NH'
      });
    }
  }

  // -----------------------------------------------------------
  // TURQUÍA (TR) — HS Code obligatorio §5.10
  // -----------------------------------------------------------
  if (countryCode === 'TR') {
    const hasHs = /\/NH\/\d{6}/.test(rtdContent) || /\/NH\/\d{6}/.test(nhContent) || /\/NH\/\d{6}/.test(fullMessage);
    if (!hasHs) {
      issues.push({
        severity: 'error',
        segment: 'GLOBAL',
        field: 'HS_TR',
        message: `TURQUÍA: Falta HS Code obligatorio para destino ${airportCode}`,
        rule: 'HS §5.10: Código HS obligatorio en RTD /NH para Turquía',
        suggestion: 'Agregar código HS en RTD /NH'
      });
    }
  }

  // -----------------------------------------------------------
  // JORDANIA (JO) — Teléfono CNE obligatorio §5.11
  // -----------------------------------------------------------
  if (countryCode === 'JO') {
    const hasPhone = /\/TE\//.test(cneContent) || /\/CT.*TE/.test(cneContent);
    if (!hasPhone) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'phone_JO',
        message: `JORDANIA: Falta teléfono del consignee obligatorio para destino ${airportCode}`,
        rule: 'CNE §5.11: Teléfono del consignee obligatorio para Jordania [FNA: CNE0055]',
        suggestion: 'Agregar /TE/00962XXXXXXXXX después del código postal en CNE'
      });
    }
  }

  // -----------------------------------------------------------
  // KENIA (KE) — PIN + HS + COU §5.13
  // -----------------------------------------------------------
  if (countryCode === 'KE') {
    // HS Code obligatorio
    const hasHs = /\/NH\/\d{6}/.test(rtdContent) || /\/NH\/\d{6}/.test(nhContent) || /\/NH\/\d{6}/.test(fullMessage);
    if (!hasHs) {
      issues.push({
        severity: 'error',
        segment: 'GLOBAL',
        field: 'HS_KE',
        message: `KENIA: Falta HS Code obligatorio para destino ${airportCode}`,
        rule: 'HS §5.13: Código HS obligatorio para Kenia',
        suggestion: 'Agregar código HS en RTD /NH'
      });
    }

    // Teléfono CNE obligatorio
    const hasPhone = /\/TE\//.test(cneContent) || /\/CT.*TE/.test(cneContent);
    if (!hasPhone) {
      issues.push({
        severity: 'warning',
        segment: 'CNE',
        field: 'phone_KE',
        message: `KENIA: Se recomienda teléfono del consignee para destino ${airportCode}`,
        rule: 'CNE §5.13: Teléfono recomendado para Kenia'
      });
    }
  }

  // -----------------------------------------------------------
  // USA (US) — ACAS 7+1 elements §5.1
  // -----------------------------------------------------------
  if (countryCode === 'US') {
    // State obligatorio (2 chars)
    // Buscar línea que termine en /XX (exactamente 2 letras = state code)
    // Ej: /MIAMI/FL  /LOS ANGELES/CA  /CIMIAMI/FL
    // NO matchea: /US/33122 (tiene dígitos) ni /TE/3055... (no termina ahí)
    const cneLines = cneContent.split('\n');
    const stateMatch = cneLines.some(line => /\/[A-Z][A-Z\s]*\/[A-Z]{2}\s*$/.test(line.trim()));
    if (!stateMatch) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'state_US',
        message: `USA: Falta State/Province code (2 letras USPS) obligatorio para el consignee en destino USA`,
        rule: 'CNE §3.5: State code 2[a] obligatorio para USA [FNA: CNE9035]',
        suggestion: 'Agregar código de estado (ej: CA, NY, TX, FL) en la línea de ciudad: /CILOS ANGELES/CA'
      });
    }

    // ZIP Code obligatorio — validación estricta de formato IATA
    // Según IATA: ZIP Code para USA debe ser exactamente 5 dígitos (nnnnn) o 9 dígitos ZIP+4 (nnnnn-nnnn)
    // El código postal máximo en IATA es 9[t] (9 caracteres tipo telecom)
    // IMPORTANTE: El guión (-) SÍ está permitido en campos tipo "t" (telecom) según IATA
    const allZipMatches = cneContent.match(/\/(\d{1,9}(-\d{1,4})?)/g) || [];
    const zipValues = allZipMatches.map(m => m.replace('/', '').trim()).filter(z => z.length >= 1);
    
    // Buscar un ZIP que cumpla con el formato correcto
    const validZipFound = zipValues.some(z => /^\d{5}(-\d{4})?$/.test(z));
    const anyZipLikeValue = zipValues.find(z => /^\d+(-\d+)?$/.test(z));
    
    if (zipValues.length === 0) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'zip_US',
        message: `USA: Falta ZIP Code obligatorio para el consignee en destino USA. Sin ZIP válido el envío será RECHAZADO por CBP.`,
        rule: 'CNE §3.5: ZIP Code (5 dígitos nnnnn o ZIP+4 nnnnn-nnnn) obligatorio para USA [FNA: CNE9045]',
        suggestion: 'Agregar ZIP Code: exactamente 5 dígitos (ej: 33126) o ZIP+4 con guión (ej: 33126-1234)'
      });
    } else if (!validZipFound && anyZipLikeValue) {
      // Hay algo que parece ZIP pero no tiene el formato correcto
      const foundZip = anyZipLikeValue;
      
      // Detectar problemas específicos
      if (/^\d{1,4}$/.test(foundZip)) {
        // ZIP muy corto (menos de 5 dígitos) - ej: "10", "123", "1234"
        issues.push({
          severity: 'error',
          segment: 'CNE',
          field: 'zip_US',
          message: `USA: ZIP Code "${foundZip}" es INVÁLIDO. Tiene solo ${foundZip.length} dígito(s). El ZIP Code de USA DEBE tener exactamente 5 dígitos.`,
          rule: 'CNE §3.5: ZIP Code USA = exactamente 5[n] (nnnnn) o 9[n] con guión (nnnnn-nnnn) [FNA: CNE0045]',
          found: foundZip,
          expected: 'Formato: 12345 (5 dígitos) o 12345-1234 (ZIP+4)',
          suggestion: `Corregir "${foundZip}" a un ZIP Code válido de 5 dígitos. Ejemplo: si destino es Miami usar 33126`
        });
      } else if (/^\d{6,9}$/.test(foundZip) && !foundZip.includes('-')) {
        // ZIP de 6-9 dígitos sin guión - probablemente ZIP+4 mal formateado
        issues.push({
          severity: 'warning',
          segment: 'CNE',
          field: 'zip_format_US',
          message: `USA: ZIP Code "${foundZip}" tiene ${foundZip.length} dígitos. Si es ZIP+4, debe tener guión: ${foundZip.slice(0, 5)}-${foundZip.slice(5)}`,
          rule: 'CNE §3.5: ZIP+4 formato = nnnnn-nnnn (con guión). El guión SÍ está permitido por IATA en campos tipo "t" [FNA: CNE0045]',
          found: foundZip,
          expected: `${foundZip.slice(0, 5)}-${foundZip.slice(5)}`,
          suggestion: `Agregar guión: ${foundZip.slice(0, 5)}-${foundZip.slice(5)}`
        });
      } else if (/^\d+-\d+$/.test(foundZip) && !/^\d{5}-\d{4}$/.test(foundZip)) {
        // Tiene guión pero no en el formato correcto
        const parts = foundZip.split('-');
        issues.push({
          severity: 'warning',
          segment: 'CNE',
          field: 'zip_format_US',
          message: `USA: ZIP Code "${foundZip}" tiene formato incorrecto. Formato ZIP+4 correcto: nnnnn-nnnn (5 dígitos, guión, 4 dígitos).`,
          rule: 'CNE §3.5: ZIP+4 = 5 dígitos + guión + 4 dígitos [FNA: CNE0045]',
          found: foundZip,
          expected: 'Formato: 12345-1234',
          suggestion: `Verificar que la primera parte tenga 5 dígitos y la segunda 4 dígitos`
        });
      } else {
        // Otro formato no reconocido
        issues.push({
          severity: 'warning',
          segment: 'CNE',
          field: 'zip_format_US',
          message: `USA: ZIP Code "${foundZip}" puede no ser válido. Formato estándar USPS: 5 dígitos o ZIP+4 (con guión).`,
          rule: 'CNE §3.5: ZIP Code formato USPS estándar [FNA: CNE9046]',
          found: foundZip,
          expected: 'Formato: 12345 o 12345-1234',
          suggestion: 'Verificar que el ZIP Code corresponda a una dirección real en USA'
        });
      }
    }

    // TIN/EIN del consignee — obligatorio para empresas en USA
    const hasTinCne = /OCI\/US\/CNE\/T\/(TIN|EIN|SSN|ITIN)/.test(ociContent) || 
                       /OCI\/US\/CNE\/T\/(TIN|EIN|SSN|ITIN)/.test(fullMessage) ||
                       /OCI\/US\/T\/ID\//.test(ociContent);
    if (!hasTinCne) {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        field: 'TIN_US',
        message: `USA: Se recomienda TIN/EIN del consignee para destino ${airportCode}. El Tax ID mejora el procesamiento de aduanas CBP.`,
        rule: 'OCI §5.1: OCI/US/CNE/T/TIN<número> o EIN recomendado para USA [FNA: OCI-US-001]',
        suggestion: 'Agregar: OCI/US/CNE/T/TIN123456789 (9 dígitos sin guiones) o OCI/US/CNE/T/EIN123456789'
      });
    }

    // SLAC obligatorio en consolidaciones
    if (message.type === 'FHL') {
      for (const hbs of hbsSegs) {
        const hbsDestMatch = hbs.content.match(/[A-Z]{3}([A-Z]{3})/);
        const hbsDest = hbsDestMatch ? getCountryFromAirport(hbsDestMatch[1]) : '';
        if (hbsDest === 'US') {
          // Detectar SLAC en ambos formatos:
          // FHL/2 legacy: /S<digits>  (ej: /S5)
          // FHL/4 actual: .../piezas/Kpeso/slac/descripcion (campo numérico entre peso y descripción)
          const hasSlac = /\/S\d+/.test(hbs.content) || 
                          /\/K[\d.]+\/\d+\//.test(hbs.content);
          if (!hasSlac) {
            const hawbMatch = hbs.content.match(/HBS\/([^\/]+)/);
            issues.push({
              severity: 'error',
              segment: 'HBS',
              field: 'SLAC_US',
              message: `USA ACAS: Falta SLAC en house ${hawbMatch ? hawbMatch[1] : '?'} con destino USA. Obligatorio para consolidaciones.`,
              rule: 'HBS §9.5.3: SLAC (Shipper Load And Count) obligatorio para houses con destino USA',
              suggestion: 'Agregar /S<piezas> en la línea HBS'
            });
          }
        }
      }
    }

    // HS Code recomendado
    const hasHs = /\/NH\/\d{6}/.test(rtdContent) || /\/NH\/\d{6}/.test(nhContent) || /\/NH\/\d{6}/.test(fullMessage);
    if (!hasHs) {
      issues.push({
        severity: 'warning',
        segment: 'GLOBAL',
        field: 'HS_US',
        message: `USA: HS Code recomendado (6+ dígitos) para destino ${airportCode}. Mejora procesamiento ACAS.`,
        rule: 'ACAS §5.1: HS Code recomendado para USA',
        suggestion: 'Agregar código HS en RTD /NH o OCI/US/T/HS/<hscode>'
      });
    }
  }

  // -----------------------------------------------------------
  // CANADÁ (CA) — Descripción detallada CBSA §5.14
  // -----------------------------------------------------------
  if (countryCode === 'CA') {
    // Province obligatorio (2 chars) — misma lógica que US
    const cneLinesCA = cneContent.split('\n');
    const stateMatch = cneLinesCA.some(line => /\/[A-Z][A-Z\s]*\/[A-Z]{2}\s*$/.test(line.trim()));
    if (!stateMatch) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'province_CA',
        message: `CANADÁ: Falta Province code (2 letras) obligatorio para el consignee. Sin Province el envío será RECHAZADO por CBSA.`,
        rule: 'CNE §3.5: Province code 2[a] obligatorio para Canadá [FNA: CNE9135]',
        suggestion: 'Agregar código de provincia (ej: ON, QC, BC, AB) en línea ciudad'
      });
    }

    // Postal code obligatorio (formato A1A 1A1 o A1A1A1) - IATA permite hasta 9[t]
    // Formato canadiense: Letra-Dígito-Letra (espacio opcional) Dígito-Letra-Dígito
    // El espacio SÍ está permitido por IATA en campos tipo "t"
    
    // Buscar todos los posibles códigos postales en el contenido
    const allPostalMatchesCA = cneContent.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/g) || [];
    const anyPostalLikeCA = cneContent.match(/[A-Z0-9]{3,7}/g) || [];
    
    // Filtrar valores que parecen códigos postales canadienses
    const validPostalCA = allPostalMatchesCA.length > 0;
    
    if (!validPostalCA) {
      // Buscar si hay algo que parece código postal pero está mal formateado
      const possibleBadPostal = cneContent.match(/\/CA\/([^\/\n]+)/)?.[1]?.trim() || '';
      
      if (possibleBadPostal && possibleBadPostal.length > 0) {
        // Hay algo después de /CA/ pero no es formato válido
        if (/^\d+$/.test(possibleBadPostal)) {
          // Solo números - probablemente confundido con ZIP de USA
          issues.push({
            severity: 'error',
            segment: 'CNE',
            field: 'postal_CA',
            message: `CANADÁ: Código postal "${possibleBadPostal}" es INVÁLIDO. Canadá usa formato alfanumérico A1A 1A1, NO numérico como USA.`,
            rule: 'CNE §3.5: Postal Code Canadá = A1A 1A1 (letra-número-letra espacio número-letra-número) [FNA: CNE0045]',
            found: possibleBadPostal,
            expected: 'Formato: A1A 1A1 (ej: M5V 2H1)',
            suggestion: 'El código postal canadiense alterna letras y números. Ejemplo: M5V 2H1, V6B 5K3'
          });
        } else if (/^[A-Z]{2,}/.test(possibleBadPostal) || /\d{4,}/.test(possibleBadPostal)) {
          // Demasiadas letras seguidas o números seguidos
          issues.push({
            severity: 'error',
            segment: 'CNE',
            field: 'postal_CA',
            message: `CANADÁ: Código postal "${possibleBadPostal}" tiene formato incorrecto. Debe alternar letra-número-letra número-letra-número.`,
            rule: 'CNE §3.5: Postal Code Canadá = A1A 1A1 exactamente [FNA: CNE9145]',
            found: possibleBadPostal,
            expected: 'Formato: A1A 1A1 (ej: M5V 2H1)',
            suggestion: 'Verificar que el código postal siga el patrón canadiense: M5V 2H1'
          });
        } else {
          issues.push({
            severity: 'error',
            segment: 'CNE',
            field: 'postal_CA',
            message: `CANADÁ: Código postal "${possibleBadPostal}" no tiene formato válido canadiense. Formato requerido: A1A 1A1.`,
            rule: 'CNE §3.5: Postal Code formato A1A 1A1 obligatorio para Canadá [FNA: CNE9145]',
            found: possibleBadPostal,
            expected: 'Formato: A1A 1A1 (ej: M5V 2H1)',
            suggestion: 'El código postal canadiense tiene 6 caracteres: Letra-Número-Letra Número-Letra-Número'
          });
        }
      } else {
        issues.push({
          severity: 'error',
          segment: 'CNE',
          field: 'postal_CA',
          message: `CANADÁ: Falta Postal Code obligatorio para el consignee. Sin código postal válido el envío será RECHAZADO por CBSA.`,
          rule: 'CNE §3.5: Postal Code formato A1A 1A1 obligatorio para Canadá [FNA: CNE9145]',
          suggestion: 'Agregar código postal en formato canadiense: A1A 1A1 (ej: M5V 2H1, V6B 5K3)'
        });
      }
    }

    // BN (Business Number) del consignee — recomendado para CBSA
    const hasBnCne = /OCI\/CA\/CNE\/T\/(BN|GST|TIN)/.test(ociContent) || 
                      /OCI\/CA\/CNE\/T\/(BN|GST|TIN)/.test(fullMessage) ||
                      /OCI\/CA\/T\/ID\//.test(ociContent);
    if (!hasBnCne) {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        field: 'BN_CA',
        message: `CANADÁ: Se recomienda Business Number (BN) del consignee para destino ${airportCode}. Mejora procesamiento CBSA.`,
        rule: 'OCI §5.14: OCI/CA/CNE/T/BN<número> recomendado para Canadá [FNA: OCI-CA-001]',
        suggestion: 'Agregar: OCI/CA/CNE/T/BN123456789RC0001 (15 caracteres formato CRA)'
      });
    }
  }

  // -----------------------------------------------------------
  // EU / ICS2 — EORI OBLIGATORIO §5.2
  // -----------------------------------------------------------
  if (EU_COUNTRIES.includes(countryCode)) {
    // EORI es OBLIGATORIO para destinos EU bajo regulación ICS2
    const hasEori = /OCI\/(EU|[A-Z]{2})\/T\/EI\//.test(ociContent) || 
                    /OCI\/(EU|[A-Z]{2})\/T\/EI\//.test(fullMessage) ||
                    /OCI\/(EU|[A-Z]{2})\/CNE\/T\//.test(ociContent);
    
    if (!hasEori) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'EORI_EU',
        message: `EU ICS2: Falta EORI Number OBLIGATORIO para destino ${airportCode} (${countryCode}). Sin EORI válido la carga puede ser RECHAZADA en aduana EU.`,
        rule: 'OCI §5.2: OCI/EU/T/EI/<EORI> OBLIGATORIO para cumplimiento ICS2 [FNA: OCI-EU-001]',
        suggestion: `Agregar: OCI/EU/T/EI/${countryCode}XXXXXXXXXXXXX (EORI del consignee - prefijo país + hasta 15 caracteres)`
      });
    } else {
      // Validar formato EORI: código país (2 letras) + hasta 15 caracteres alfanuméricos
      const eoriMatch = ociContent.match(/OCI\/(?:EU|[A-Z]{2})\/T\/EI\/([A-Z0-9]+)/) || 
                        fullMessage.match(/OCI\/(?:EU|[A-Z]{2})\/T\/EI\/([A-Z0-9]+)/);
      if (eoriMatch) {
        const eoriValue = eoriMatch[1];
        // EORI debe comenzar con código de país EU y tener entre 5 y 17 caracteres
        if (eoriValue.length < 5 || eoriValue.length > 17) {
          issues.push({
            severity: 'warning',
            segment: 'OCI',
            field: 'EORI_format_EU',
            message: `EU: EORI "${eoriValue}" tiene formato inusual (${eoriValue.length} caracteres). Formato estándar: código país (2 letras) + 3-15 caracteres.`,
            rule: 'OCI §5.2: EORI formato = CC + hasta 15 chars alfanuméricos',
            found: eoriValue,
            expected: 'Formato: DE123456789 o NL123456789001 (país + 3-15 chars)'
          });
        }
        // Verificar que comience con código de país válido EU
        const eoriCountry = eoriValue.substring(0, 2);
        if (!EU_COUNTRIES.includes(eoriCountry) && eoriCountry !== 'EU') {
          issues.push({
            severity: 'warning',
            segment: 'OCI',
            field: 'EORI_country_EU',
            message: `EU: EORI "${eoriValue}" no comienza con código de país EU válido. Verificar que el EORI corresponda al país de destino.`,
            rule: 'OCI §5.2: EORI debe comenzar con código ISO del país EU registrado',
            found: eoriCountry,
            expected: `Código país EU (ej: ${countryCode}, DE, NL, FR)`
          });
        }
      }
    }

    // Postal code obligatorio para EU
    const hasPostalEU = cneContent.includes('/PO') || /\/\d{4,5}/.test(cneContent);
    if (!hasPostalEU) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'postal_EU',
        message: `EU ICS2: Falta código postal del consignee obligatorio para destino ${airportCode} (${countryCode}). Sin código postal el envío puede ser RECHAZADO.`,
        rule: 'CNE: Código postal obligatorio para destinos EU [FNA: CNE9245]',
        suggestion: 'Agregar código postal del país de destino en el segmento CNE'
      });
    }
  }

  // -----------------------------------------------------------
  // UK (GB) — EORI post-Brexit OBLIGATORIO §5.16
  // -----------------------------------------------------------
  if (countryCode === 'GB') {
    const hasGbEori = /OCI\/GB\/T\/EI\/GB/.test(ociContent) || 
                       /OCI\/GB\/T\/EI\/GB/.test(fullMessage) ||
                       /OCI\/GB\/CNE\/T\//.test(ociContent);
    
    if (!hasGbEori) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'EORI_GB',
        message: `UK: Falta EORI Number OBLIGATORIO para destino ${airportCode}. Sin EORI válido la carga puede ser RECHAZADA por HMRC.`,
        rule: 'OCI §5.16: OCI/GB/T/EI/GB<alphanumeric> obligatorio para UK post-Brexit [FNA: OCI-GB-001]',
        suggestion: 'Agregar: OCI/GB/T/EI/GB123456789000 (GB + hasta 12 caracteres alfanuméricos)'
      });
    } else {
      // Validar formato EORI UK: GB + 9-15 caracteres
      const gbEoriMatch = ociContent.match(/OCI\/GB\/T\/EI\/(GB[A-Z0-9]+)/) || 
                          fullMessage.match(/OCI\/GB\/T\/EI\/(GB[A-Z0-9]+)/);
      if (gbEoriMatch) {
        const gbEoriValue = gbEoriMatch[1];
        // EORI UK debe ser GB + 9 a 15 caracteres (total 11-17)
        if (gbEoriValue.length < 11 || gbEoriValue.length > 17) {
          issues.push({
            severity: 'warning',
            segment: 'OCI',
            field: 'EORI_format_GB',
            message: `UK: EORI "${gbEoriValue}" tiene formato inusual (${gbEoriValue.length} caracteres). Formato estándar UK: GB + 9-15 caracteres.`,
            rule: 'OCI §5.16: EORI UK formato = GB + 9-15 chars alfanuméricos',
            found: gbEoriValue,
            expected: 'Formato: GB123456789 o GB123456789000'
          });
        }
      }
    }

    // Postal code obligatorio para UK
    const hasPostalGB = cneContent.includes('/PO') || /[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/.test(cneContent);
    if (!hasPostalGB) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'postal_GB',
        message: `UK: Falta código postal del consignee obligatorio para destino ${airportCode}. Sin postal code el envío puede ser RECHAZADO.`,
        rule: 'CNE: Código postal obligatorio para UK [FNA: CNE9345]',
        suggestion: 'Agregar código postal UK: formato XX1 1XX (ej: SW1A 1AA, M1 1AE)'
      });
    }
  }

  // -----------------------------------------------------------
  // CHINA (CN) — Enterprise Code + teléfono §5.3
  // -----------------------------------------------------------
  if (countryCode === 'CN') {
    // Enterprise Code (USCI) del consignee
    const hasUsci = /OCI\/CN\/CNE\/T\//.test(ociContent) || /OCI\/CN\/CNE\/T\//.test(fullMessage) ||
                    /OCI\/CN\/T\/SM\//.test(ociContent) || /OCI\/CN\/T\/SM\//.test(fullMessage);
    if (!hasUsci) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'USCI_CN',
        message: `CHINA: Falta Enterprise Code (USCI) del consignee para destino ${airportCode}. Obligatorio para CAAC.`,
        rule: 'OCI §5.3: Enterprise Code 18 chars [A-Z0-9] obligatorio para China',
        suggestion: 'Agregar: OCI/CN/CNE/T/<18 chars USCI> o OCI/CN/CNE/T/9999CN (si no tiene código)'
      });
    }

    // Teléfono del consignee obligatorio
    const hasCnePhone = /\/TE\//.test(cneContent) || /\/CT.*TE/.test(cneContent);
    if (!hasCnePhone) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'phone_CN',
        message: `CHINA: Falta teléfono del consignee obligatorio para destino ${airportCode}. CAAC lo exige para Risk Assessment.`,
        rule: 'CNE §5.3: Teléfono del consignee obligatorio para China [FNA: CNE0055]',
        suggestion: 'Agregar /TE/86XXXXXXXXX en el segmento CNE'
      });
    }
  }

  // -----------------------------------------------------------
  // ARABIA SAUDITA (SA) — ZATCA §5.8
  // -----------------------------------------------------------
  if (countryCode === 'SA') {
    const isConsoSA = !!message.hawbNumber || enabledSegments.some(s => s.content?.includes('/NC/'));
    if (isConsoSA || message.type === 'FHL') {
      issues.push({
        severity: 'info',
        segment: 'GLOBAL',
        message: `ARABIA SAUDITA: El Freight Forwarder debe estar registrado como Authorized Freight Agent en portal ZATCA para consolidaciones a ${airportCode}.`,
        rule: 'ZATCA §5.8: Registro en ZATCA obligatorio para FF con consolidaciones a SA',
        suggestion: 'Verificar registro ZATCA del FF y agregar número de registro en CNE Account Number'
      });
    }
  }

  // -----------------------------------------------------------
  // JAPÓN (JP) — ZIP Code + NACCS §5.16
  // -----------------------------------------------------------
  if (countryCode === 'JP') {
    // ZIP Code obligatorio para Japón (formato nnn-nnnn)
    const jpZipMatch = cneContent.match(/(\d{3}-\d{4})/);
    const hasJpZip = jpZipMatch !== null;
    const anyNumeric = cneContent.match(/\/(\d{3,7})/);
    
    if (!hasJpZip) {
      if (anyNumeric) {
        const foundNum = anyNumeric[1];
        if (/^\d{7}$/.test(foundNum)) {
          // 7 dígitos sin guión
          issues.push({
            severity: 'warning',
            segment: 'CNE',
            field: 'zip_JP',
            message: `JAPÓN: ZIP Code "${foundNum}" debería tener formato nnn-nnnn (con guión). Formato: ${foundNum.slice(0,3)}-${foundNum.slice(3)}`,
            rule: 'CNE §3.5: ZIP Code Japón = nnn-nnnn (7 dígitos con guión) [FNA: CNE0045]',
            found: foundNum,
            expected: `${foundNum.slice(0,3)}-${foundNum.slice(3)}`,
            suggestion: 'Agregar guión después del tercer dígito'
          });
        } else if (foundNum.length < 7) {
          issues.push({
            severity: 'error',
            segment: 'CNE',
            field: 'zip_JP',
            message: `JAPÓN: ZIP Code "${foundNum}" es INVÁLIDO. Japón usa 7 dígitos formato nnn-nnnn.`,
            rule: 'CNE §3.5: ZIP Code Japón = exactamente 7 dígitos [FNA: CNE0045]',
            found: foundNum,
            expected: 'Formato: 100-0001',
            suggestion: 'Verificar el código postal japonés correcto'
          });
        }
      } else {
        issues.push({
          severity: 'error',
          segment: 'CNE',
          field: 'zip_JP',
          message: `JAPÓN: Falta ZIP Code obligatorio para el consignee. Requerido por AMS-JP (NACCS).`,
          rule: 'CNE §3.5: ZIP Code formato nnn-nnnn obligatorio para Japón [FNA: CNE0045]',
          suggestion: 'Agregar código postal japonés: formato nnn-nnnn (ej: 100-0001)'
        });
      }
    }
  }

  // -----------------------------------------------------------
  // ALEMANIA (DE) — PLZ 5 dígitos obligatorio §5.15
  // -----------------------------------------------------------
  if (countryCode === 'DE') {
    // PLZ (Postleitzahl) obligatorio - exactamente 5 dígitos
    const dePlzMatch = cneContent.match(/\/(\d{5})(?:\/|$|\s)/);
    const anyPlzLike = cneContent.match(/\/(\d{1,6})(?:\/|$|\s)/);
    
    if (!dePlzMatch) {
      if (anyPlzLike) {
        const foundPlz = anyPlzLike[1];
        if (foundPlz.length !== 5) {
          issues.push({
            severity: 'error',
            segment: 'CNE',
            field: 'plz_DE',
            message: `ALEMANIA: PLZ "${foundPlz}" es INVÁLIDO. Alemania usa exactamente 5 dígitos.`,
            rule: 'CNE §3.5: PLZ Alemania = exactamente 5[n] dígitos [FNA: CNE0045]',
            found: `${foundPlz.length} dígitos`,
            expected: '5 dígitos (ej: 60313)',
            suggestion: `El código postal alemán tiene exactamente 5 dígitos`
          });
        }
      } else {
        issues.push({
          severity: 'error',
          segment: 'CNE',
          field: 'plz_DE',
          message: `ALEMANIA: Falta PLZ (Postleitzahl) obligatorio para el consignee. Sin PLZ el envío será RECHAZADO.`,
          rule: 'CNE §3.5: PLZ obligatorio para Alemania [FNA: CNE0045]',
          suggestion: 'Agregar código postal alemán: 5 dígitos (ej: 60313 Frankfurt)'
        });
      }
    }
  }

  // -----------------------------------------------------------
  // AUSTRALIA (AU) — ABN + State §5.16
  // -----------------------------------------------------------
  if (countryCode === 'AU') {
    // State obligatorio (2-3 chars): NSW, VIC, QLD, WA, SA, TAS, NT, ACT
    const auStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
    const hasAuState = auStates.some(st => cneContent.includes(`/${st}`) || cneContent.includes(`/${st}/`));
    
    if (!hasAuState) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'state_AU',
        message: `AUSTRALIA: Falta State/Territory code obligatorio para el consignee.`,
        rule: 'CNE §3.5: State code 2-3[a] obligatorio para Australia [FNA: CNE0035]',
        suggestion: 'Agregar código: NSW, VIC, QLD, WA, SA, TAS, NT o ACT'
      });
    }

    // Postal code obligatorio (4 dígitos para Australia)
    const auPostalMatch = cneContent.match(/\/(\d{4})(?:\/|$|\s)/);
    if (!auPostalMatch) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'postal_AU',
        message: `AUSTRALIA: Falta Postal Code obligatorio para el consignee. Australia usa 4 dígitos.`,
        rule: 'CNE §3.5: Postal Code Australia = 4[n] dígitos [FNA: CNE0045]',
        suggestion: 'Agregar código postal australiano: 4 dígitos (ej: 2000 Sydney, 3000 Melbourne)'
      });
    }

    // ABN recomendado
    const hasAbn = /OCI\/AU\/CNE\/T\/ABN/.test(ociContent) || /OCI\/AU\/T\/ID\//.test(ociContent);
    if (!hasAbn) {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        field: 'ABN_AU',
        message: `AUSTRALIA: Se recomienda ABN (Australian Business Number) del consignee para destino ${airportCode}.`,
        rule: 'OCI §5.16: OCI/AU/CNE/T/ABN<11 dígitos> recomendado',
        suggestion: 'Agregar: OCI/AU/CNE/T/ABN53004085616 (11 dígitos sin espacios)'
      });
    }
  }

  // -----------------------------------------------------------
  // INDIA (IN) — IEC + GSTIN §5.16
  // -----------------------------------------------------------
  if (countryCode === 'IN') {
    // IEC (Importer-Exporter Code) obligatorio
    const hasIec = /OCI\/IN\/CNE\/T\/IEC/.test(ociContent) || /OCI\/IN\/T\/ID\//.test(ociContent);
    const hasGstin = /OCI\/IN\/CNE\/T\/GST/.test(ociContent);
    
    if (!hasIec && !hasGstin) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'IEC_IN',
        message: `INDIA: Falta IEC (Importer-Exporter Code) o GSTIN del consignee para destino ${airportCode}. Obligatorio para aduanas India.`,
        rule: 'OCI §5.16: IEC (10 chars) o GSTIN (15 chars) obligatorio para India [FNA: OCI-IN-001]',
        suggestion: 'Agregar: OCI/IN/CNE/T/IEC0505012345 (10 chars) o OCI/IN/CNE/T/GST22AAAAA0000A1Z5 (15 chars)'
      });
    }

    // Postal code obligatorio (6 dígitos para India)
    const inPostalMatch = cneContent.match(/\/(\d{6})(?:\/|$|\s)/);
    if (!inPostalMatch) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'postal_IN',
        message: `INDIA: Falta PIN Code obligatorio para el consignee. India usa 6 dígitos.`,
        rule: 'CNE §3.5: PIN Code India = 6[n] dígitos [FNA: CNE0045]',
        suggestion: 'Agregar código postal indio: 6 dígitos (ej: 110001 Delhi, 400001 Mumbai)'
      });
    }
  }

  // -----------------------------------------------------------
  // MÉXICO (MX) — RFC §5.16
  // -----------------------------------------------------------
  if (countryCode === 'MX') {
    // RFC (Registro Federal de Contribuyentes) recomendado
    const hasRfc = /OCI\/MX\/CNE\/T\/RFC/.test(ociContent) || /OCI\/MX\/T\/ID\//.test(ociContent);
    
    if (!hasRfc) {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        field: 'RFC_MX',
        message: `MÉXICO: Se recomienda RFC (Registro Federal de Contribuyentes) del consignee para destino ${airportCode}.`,
        rule: 'OCI §5.16: RFC 12-13 chars recomendado para México',
        suggestion: 'Agregar: OCI/MX/CNE/T/RFCXAXX010101000 (12-13 caracteres)'
      });
    }

    // Código postal obligatorio (5 dígitos para México)
    const mxPostalMatch = cneContent.match(/\/(\d{5})(?:\/|$|\s)/);
    if (!mxPostalMatch) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'postal_MX',
        message: `MÉXICO: Falta Código Postal obligatorio para el consignee. México usa 5 dígitos.`,
        rule: 'CNE §3.5: Código Postal México = 5[n] dígitos [FNA: CNE0045]',
        suggestion: 'Agregar código postal mexicano: 5 dígitos (ej: 06600 Ciudad de México)'
      });
    }
  }

  // -----------------------------------------------------------
  // BRASIL (BR) — CNPJ/CPF §5.16
  // -----------------------------------------------------------
  if (countryCode === 'BR') {
    // CNPJ (empresa) o CPF (persona) recomendado
    const hasCnpj = /OCI\/BR\/CNE\/T\/CNPJ/.test(ociContent) || /OCI\/BR\/T\/ID\//.test(ociContent);
    const hasCpf = /OCI\/BR\/CNE\/T\/CPF/.test(ociContent);
    
    if (!hasCnpj && !hasCpf) {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        field: 'CNPJ_BR',
        message: `BRASIL: Se recomienda CNPJ (empresa) o CPF (persona física) del consignee para destino ${airportCode}.`,
        rule: 'OCI §5.16: CNPJ 14 dígitos o CPF 11 dígitos recomendado para Brasil',
        suggestion: 'Agregar: OCI/BR/CNE/T/CNPJ12345678000195 (sin puntos/guiones) o OCI/BR/CNE/T/CPF12345678909'
      });
    }

    // CEP obligatorio (8 dígitos o 5-3 con guión)
    const brCepMatch = cneContent.match(/(\d{5}-?\d{3})/);
    if (!brCepMatch) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'cep_BR',
        message: `BRASIL: Falta CEP obligatorio para el consignee. Brasil usa 8 dígitos (nnnnn-nnn).`,
        rule: 'CNE §3.5: CEP Brasil = 8 dígitos formato nnnnn-nnn [FNA: CNE0045]',
        suggestion: 'Agregar CEP: 8 dígitos (ej: 01310-100 São Paulo)'
      });
    }
  }

  // -----------------------------------------------------------
  // COREA DEL SUR (KR) — P/C Number §5.16
  // -----------------------------------------------------------
  if (countryCode === 'KR') {
    // P/C Number (Personal/Company Customs ID) recomendado
    const hasPcNumber = /OCI\/KR\/CNE\/T\/P/.test(ociContent) || /OCI\/KR\/T\/ID\//.test(ociContent);
    
    if (!hasPcNumber) {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        field: 'PC_KR',
        message: `COREA DEL SUR: Se recomienda P/C Number (Customs ID) del consignee para destino ${airportCode}.`,
        rule: 'OCI §5.16: P/C Number recomendado para Corea del Sur',
        suggestion: 'Agregar: OCI/KR/CNE/T/P<número de customs ID>'
      });
    }

    // Postal code obligatorio (5 dígitos para Corea del Sur)
    const krPostalMatch = cneContent.match(/\/(\d{5})(?:\/|$|\s)/);
    if (!krPostalMatch) {
      issues.push({
        severity: 'error',
        segment: 'CNE',
        field: 'postal_KR',
        message: `COREA DEL SUR: Falta Postal Code obligatorio. Corea del Sur usa 5 dígitos.`,
        rule: 'CNE §3.5: Postal Code Corea = 5[n] dígitos [FNA: CNE0045]',
        suggestion: 'Agregar código postal coreano: 5 dígitos (ej: 06236 Seoul)'
      });
    }
  }

  // -----------------------------------------------------------
  // VALIDACIÓN GENERAL: Identificación Tributaria del Consignatario
  // -----------------------------------------------------------
  // Verificar si el OCI tiene ALGÚN tipo de identificador para el consignatario
  // Esto aplica para TODOS los destinos como buena práctica
  const hasAnyConsigneeId = 
    /OCI\/[A-Z]{2}\/CNE\/T\//.test(ociContent) ||    // OCI estándar con CNE
    /OCI\/[A-Z]{2}\/T\/EI\//.test(ociContent) ||     // EORI
    /OCI\/[A-Z]{2}\/T\/ID\//.test(ociContent) ||     // ID genérico
    /OCI\/[A-Z]{2}\/T\/SM\//.test(ociContent) ||     // Social Media/ID CN
    /OCI\/[A-Z]{2}\/T\/TN\//.test(ociContent) ||     // TIN antiguo formato
    /OCI\/[A-Z]{2}\/IMP\//.test(ociContent);         // Import permit (Egipto, etc.)

  // Detectar países que REQUIEREN identificación
  const countriesRequiringId = ['US', 'CA', 'CN', 'EG', 'ID', 'BD', 'MA', ...EU_COUNTRIES, 'GB'];
  const requiresId = countriesRequiringId.includes(countryCode);

  if (!hasAnyConsigneeId) {
    if (requiresId) {
      issues.push({
        severity: 'error',
        segment: 'OCI',
        field: 'consignee_id_general',
        message: `Falta número de identificación tributaria/fiscal del consignatario para destino ${airportCode} (${countryCode}). Este país REQUIERE identificación del importador.`,
        rule: `OCI: Identificador del consignee obligatorio para ${countryCode} [FNA: OCI-GEN-001]`,
        suggestion: getSuggestionForCountryId(countryCode)
      });
    } else {
      issues.push({
        severity: 'warning',
        segment: 'OCI',
        field: 'consignee_id_recommended',
        message: `Se recomienda incluir número de identificación tributaria del consignatario para destino ${airportCode}. Mejora el procesamiento aduanero.`,
        rule: 'OCI: Identificador del consignee recomendado para agilizar aduanas',
        suggestion: 'Agregar OCI con identificador fiscal: NIT, TIN, EORI, VAT, etc. según país de destino'
      });
    }
  }

  return issues;
}

/**
 * Retorna la sugerencia específica de identificador según el país
 */
function getSuggestionForCountryId(countryCode: string): string {
  const suggestions: Record<string, string> = {
    'US': 'Agregar: OCI/US/CNE/T/TIN123456789 (Tax ID 9 dígitos) o OCI/US/CNE/T/EIN123456789',
    'CA': 'Agregar: OCI/CA/CNE/T/BN123456789RC0001 (Business Number 15 caracteres)',
    'CN': 'Agregar: OCI/CN/CNE/T/<USCI 18 caracteres> o OCI/CN/CNE/T/9999CN (si no tiene)',
    'EG': 'Agregar: OCI/EG/CNE/T/<Enterprise Code> (registro Nafeza)',
    'ID': 'Agregar: OCI/ID/CNE/T/TIN<16 dígitos> (NPWP sin separadores)',
    'BD': 'Agregar: OCI/BD/CNE/T/BIN<9 dígitos>-<4 dígitos>',
    'MA': 'Agregar: OCI/MA/CNE/T/<Trade Register Number>',
    'GB': 'Agregar: OCI/GB/T/EI/GB<hasta 15 caracteres> (EORI UK)',
    // EU defaults
    'DE': 'Agregar: OCI/EU/T/EI/DE<hasta 15 caracteres> (EORI Alemania)',
    'FR': 'Agregar: OCI/EU/T/EI/FR<hasta 15 caracteres> (EORI Francia)',
    'NL': 'Agregar: OCI/EU/T/EI/NL<hasta 15 caracteres> (EORI Países Bajos)',
    'ES': 'Agregar: OCI/EU/T/EI/ES<hasta 15 caracteres> (EORI España)',
    'IT': 'Agregar: OCI/EU/T/EI/IT<hasta 15 caracteres> (EORI Italia)',
    'BE': 'Agregar: OCI/EU/T/EI/BE<hasta 15 caracteres> (EORI Bélgica)',
    'AT': 'Agregar: OCI/EU/T/EI/AT<hasta 15 caracteres> (EORI Austria)',
  };
  
  // Para países EU no específicos
  if (EU_COUNTRIES.includes(countryCode) && !suggestions[countryCode]) {
    return `Agregar: OCI/EU/T/EI/${countryCode}<hasta 15 caracteres> (EORI)`;
  }
  
  return suggestions[countryCode] || 'Agregar identificador fiscal del consignatario según regulación del país de destino';
}

/**
 * Valida que cada línea del mensaje no exceda 70 caracteres
 */
function validateLineMaxLengths(fullMessage: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = fullMessage.split('\n');
  
  lines.forEach((line, idx) => {
    // Saltar líneas de headers EDIFACT/Type B (pueden ser más largas)
    if (line.startsWith('UNB+') || line.startsWith('UNH+') || line.startsWith('UNT+') || line.startsWith('UNZ+')) return;
    if (line.match(/^Q[KDPU]\s/)) return; // Type B priority line
    if (line.startsWith('.')) return; // Type B origin line
    
    if (line.length > MAX_LINE_LENGTH) {
      issues.push({
        severity: 'warning',
        segment: 'GLOBAL',
        line: idx + 1,
        lineContent: line.substring(0, 75) + '...',
        message: `Línea ${idx + 1} excede ${MAX_LINE_LENGTH} caracteres (tiene ${line.length})`,
        rule: `IATA: Máximo ${MAX_LINE_LENGTH} caracteres por línea`,
        found: `${line.length} caracteres`
      });
    }
  });

  return issues;
}

/**
 * Valida caracteres permitidos en una línea CARGO-IMP
 */
function validateAllowedChars(line: string, segment: string, lineNum: number, issues: ValidationIssue[]): void {
  // Los caracteres permitidos son: A-Z, 0-9, . - / espacio \n y separadores CARGO-IMP
  const invalidChars: string[] = [];
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const code = char.charCodeAt(0);
    
    // Permitir: A-Z, a-z (se convertirá a upper), 0-9, espacio, ., -, /, +, ', (, ), :, ,, \n, \r
    if (
      (code >= 65 && code <= 90) || // A-Z
      (code >= 48 && code <= 57) || // 0-9
      char === ' ' || char === '.' || char === '-' || char === '/' ||
      char === '+' || char === '\'' || char === '(' || char === ')' ||
      char === ':' || char === ',' || char === '\n' || char === '\r'
    ) {
      continue;
    }
    
    // Caracteres en minúsculas (se deberían haber convertido)
    if (code >= 97 && code <= 122) {
      invalidChars.push(`"${char}" (minúscula en posición ${i + 1})`);
      continue;
    }
    
    // Otros caracteres inválidos
    if (code > 127 || (code < 32 && code !== 10 && code !== 13)) {
      invalidChars.push(`"${char}" (código ${code} en posición ${i + 1})`);
    }
  }

  if (invalidChars.length > 0) {
    issues.push({
      severity: 'warning',
      segment,
      line: lineNum,
      lineContent: line.substring(0, 50),
      message: `Caracteres no permitidos encontrados: ${invalidChars.slice(0, 3).join(', ')}${invalidChars.length > 3 ? ` y ${invalidChars.length - 3} más` : ''}`,
      rule: 'IATA: Solo A-Z mayúsculas, 0-9, punto (.) y guion (-) permitidos',
      suggestion: 'Convertir a mayúsculas y remover caracteres especiales'
    });
  }
}

/**
 * Calcula score de calidad del mensaje
 */
function calculateScore(errors: number, warnings: number, totalSegments: number): number {
  if (totalSegments === 0) return 0;
  
  let score = 100;
  score -= errors * 15;    // Cada error resta 15 puntos
  score -= warnings * 3;   // Cada warning resta 3 puntos
  
  return Math.max(0, Math.min(100, score));
}

// ============================================================
// EXPORTS
// ============================================================

export default validateCargoImpMessage;
