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

/** Fecha DDM (día + mes abreviado para FLT) */
const FLT_DATE = /^[0-3]?[0-9]$/;

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
      validateNgSegment(lines, issues, segment);
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
      rule: 'AWB: Segmento requerido en FWB'
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
        rule: 'AWB [1A]: Prefijo aerolínea 3[n]',
        expected: 'Ej: 992, 075, 176',
        found: content.substring(0, 5)
      });
    } else if (prefixMatch[1].length !== 3) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'awbPrefix',
        message: `Prefijo de aerolínea debe ser exactamente 3 dígitos. Encontrado: ${prefixMatch[1].length} dígito(s)`,
        rule: 'AWB [1A]: Prefijo aerolínea 3[n]',
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
        rule: 'AWB [1B]: Serial 8[n]',
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
        rule: 'AWB [22J]: Piezas hasta 4[n] con prefijo T',
        suggestion: 'Formato: /T304 (304 piezas)'
      });
    }
    if (!content.includes('K') && !content.includes('L')) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'weight',
        message: 'Falta indicador de peso K{peso} o L{peso}',
        rule: 'AWB: Peso a[1]n[1-7] — a[1] = K (kilos) o L (libras)',
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
        rule: 'AWB: El 8vo dígito del serial es check digit (primeros 7 dígitos mod 7)',
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
        rule: 'AWB [1/18]: Origen 3[a] código IATA',
        found: origin
      });
    }

    if (!IATA_AIRPORT.test(destination)) {
      issues.push({
        severity: 'error',
        segment: 'AWB',
        field: 'destination',
        message: `Código de destino "${destination}" no es un código IATA válido (3 letras mayúsculas)`,
        rule: 'AWB [1/18]: Destino 3[a] código IATA',
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
        rule: 'AWB [22J]: Piezas hasta 4[n]',
        found: pieces
      });
    }
    if (pieces.length > 4) {
      issues.push({
        severity: 'warning',
        segment: 'AWB',
        field: 'pieces',
        message: `Número de piezas excede 4 dígitos (${pieces.length})`,
        rule: 'AWB [22J]: Máximo 4 dígitos',
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
        rule: 'AWB [22K]: Peso hasta 7[n] con decimales',
        found: weight
      });
    }
    if (weight.replace('.', '').length > 7) {
      issues.push({
        severity: 'warning',
        segment: 'AWB',
        field: 'weight',
        message: `Peso excede 7 dígitos (${weight})`,
        rule: 'AWB [22K]: Máximo 7 dígitos',
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
      rule: 'FLT: Obligatorio para customs/ACAS',
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

  // Extraer vuelos: /CARRIER+NUMBER/DAY
  const flightParts = content.replace('FLT', '').split(/(?=\/)/);
  
  for (const part of flightParts) {
    if (!part.trim()) continue;
    
    // Formato esperado: /XX1234/DD
    const flightMatch = part.match(/^\/([A-Z0-9]{2,7})\/(\d{1,2})$/);
    
    if (!flightMatch) {
      // Intentar detectar problemas comunes
      const basicMatch = part.match(/^\/(.+)$/);
      if (basicMatch) {
        const flightData = basicMatch[1];
        const flightPieces = flightData.split('/');
        
        if (flightPieces.length >= 1) {
          const flightNum = flightPieces[0];
          
          // Validar número de vuelo
          // El carrier code es 2 chars (letras o alfanumérico), seguido de número
          const carrierMatch = flightNum.match(/^([A-Z0-9]{2})(\d{1,5}[A-Z]?)$/);
          if (!carrierMatch) {
            issues.push({
              severity: 'error',
              segment: 'FLT',
              field: 'flightNumber',
              message: `Número de vuelo "${flightNum}" no es válido. Formato: 2 chars carrier + hasta 5 dígitos`,
              rule: 'FLT [19A]: Carrier 2[m] + Número hasta 5[m]',
              expected: 'Ej: DA926, EY7122, CX456',
              found: flightNum,
              suggestion: 'NO repetir el código de aerolínea en el número. Ej: usar "926" no "DA926" si carrier ya es "DA"'
            });
          }

          // Validar día si existe
          if (flightPieces.length >= 2) {
            const day = flightPieces[1];
            if (!FLT_DATE.test(day)) {
              issues.push({
                severity: 'error',
                segment: 'FLT',
                field: 'flightDate',
                message: `Día de vuelo "${day}" no es válido. Debe ser 2 dígitos (01-31)`,
                rule: 'FLT [19A]: Día 2[n] (día del mes)',
                expected: '01-31',
                found: day
              });
            } else {
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
          }
        }
      } else {
        issues.push({
          severity: 'error',
          segment: 'FLT',
          message: `Formato de vuelo inválido: "${part}"`,
          rule: 'FLT: Formato /CarrierNumber/Day',
          suggestion: 'Ej: /DA926/15'
        });
      }
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
      rule: `${segCode}: Segmento requerido`
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
  const dataLines = content.split('\n').slice(1); // Saltar primera línea (tag)
  
  // Buscar campos según posición en FWB/16:
  // Línea 1 (después del tag): /NAM/nombre o /nombre
  // Línea 2: /dirección  
  // Línea 3: /ciudad o /ciudad/estado
  // Línea 4: /CC/codigopostal[/TE/telefono]

  // Validar nombre (hasta 35 chars)
  const nameLine = dataLines[0];
  if (!nameLine || nameLine.trim() === '' || nameLine === '/') {
    issues.push({
      severity: 'error',
      segment: segCode,
      field: 'name',
      message: `Nombre del ${label} es OBLIGATORIO y está vacío`,
      rule: `${segCode} [2/4]: Nombre hasta 35[t]`
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
        rule: `${segCode} [2/4]: Nombre hasta 35[t]`,
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
      message: `Dirección del ${label} es OBLIGATORIA y está vacía`,
      rule: `${segCode} [2/4]: Dirección hasta 35[t]`
    });
  } else {
    const addressValue = addressLine.replace(/^\//, '').trim();
    if (addressValue.length > 35) {
      issues.push({
        severity: 'error',
        segment: segCode,
        field: 'address',
        message: `Dirección del ${label} excede 35 caracteres (tiene ${addressValue.length})`,
        rule: `${segCode} [2/4]: Dirección hasta 35[t]`,
        found: addressValue.substring(0, 40) + '...',
        suggestion: 'Truncar la dirección a 35 caracteres'
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
      rule: `${segCode} [2/4]: Ciudad hasta 17[t]`
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
        rule: `${segCode} [2/4]: Ciudad hasta 17[t]`,
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
          rule: `${segCode} [2/4]: Estado hasta 9[t] (USA: 2[a])`,
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
      rule: `${segCode} [2/4]: Código de país 2[a] ISO`
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
        rule: `${segCode} [2/4]: Código de país 2[a] ISO`,
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
          rule: `${segCode} [2/4]: Código postal hasta 9[t]. Regla de relleno: si no existe, usar "00000"`,
          suggestion: 'Usar "00000" en lugar de dejar vacío'
        });
      } else if (postal.length > 9) {
        issues.push({
          severity: 'error',
          segment: segCode,
          field: 'postalCode',
          message: `Código postal del ${label} excede 9 caracteres (tiene ${postal.length})`,
          rule: `${segCode} [2/4]: Código postal hasta 9[t]`,
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
            rule: `${segCode} [2/4]: Identificador de contacto 3[a]`,
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
            rule: `${segCode} [2/4]: Contacto hasta 25[t] (ACAS: 70[t])`,
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
        rule: `${segCode} [2/4]: Código postal obligatorio. Regla de relleno: usar "00000" si no existe`,
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
      rule: 'AGT: Segmento requerido'
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
        rule: 'AGT: Código IATA 7[n]',
        found: iataCode
      });
    }
  } else {
    issues.push({
      severity: 'error',
      segment: 'AGT',
      field: 'iataCode',
      message: 'Falta código IATA del agente',
      rule: 'AGT: Código IATA 7 dígitos obligatorio',
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
        rule: 'AGT: Código CASS 4[n]',
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
      rule: 'AGT: Formato AGT//IATA/CASS',
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
      rule: 'AGT: Nombre obligatorio, hasta 35[t]'
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

  // Validar ciudad del agente
  if (agtLines.length < 3) {
    issues.push({
      severity: 'warning',
      segment: 'AGT',
      field: 'city',
      message: 'Falta ciudad del agente (línea 3 del segmento AGT)',
      rule: 'AGT: Ciudad hasta 17[t]'
    });
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
      rule: 'CVD: Segmento requerido'
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

  // Formato: CVD/USD//PP/NVD/NCV/XXX
  const parts = content.replace('CVD/', '').split('/');
  
  // Validar moneda (3 letras)
  if (parts.length >= 1) {
    const currency = parts[0].trim();
    if (!ISO_CURRENCY.test(currency)) {
      issues.push({
        severity: 'error',
        segment: 'CVD',
        field: 'currency',
        message: `Código de moneda "${currency}" no es válido (debe ser 3 letras ISO)`,
        rule: 'CVD [12]: Código de moneda 3[a]',
        expected: 'Ej: USD, EUR, COP',
        found: currency
      });
    }
  }

  // Validar WT/OT (después del //)
  // parts[1] está vacío (por el //), parts[2] es WT_OT
  if (parts.length >= 3) {
    const wtOt = parts[2].trim();
    if (!WTOT_CODES.includes(wtOt)) {
      issues.push({
        severity: 'error',
        segment: 'CVD',
        field: 'wtOt',
        message: `Código WT/OT "${wtOt}" no es válido`,
        rule: 'CVD: WT/OT debe ser PP, CC, PC o CP',
        expected: 'PP (Prepaid), CC (Collect), PC (Weight Prepaid/Other Collect), CP (Weight Collect/Other Prepaid)',
        found: wtOt
      });
    }
  }

  // Validar valor para Transporte
  if (parts.length >= 4) {
    const declCarriage = parts[3].trim();
    if (declCarriage !== 'NVD') {
      if (declCarriage.length > 12) {
        issues.push({
          severity: 'error',
          segment: 'CVD',
          field: 'declaredCarriage',
          message: `Valor para transporte excede 12 caracteres`,
          rule: 'CVD [16]: Valor para transporte hasta 12[m] (o NVD)',
          found: declCarriage
        });
      }
      if (!WEIGHT_PATTERN.test(declCarriage) && declCarriage !== '0') {
        issues.push({
          severity: 'warning',
          segment: 'CVD',
          field: 'declaredCarriage',
          message: `Valor para transporte "${declCarriage}" no es numérico ni NVD`,
          rule: 'CVD [16]: Hasta 12[m] o NVD',
          found: declCarriage,
          suggestion: 'Usar NVD (No Value Declared) o un valor numérico'
        });
      }
    }
  }

  // Validar valor para Aduanas
  if (parts.length >= 5) {
    const declCustoms = parts[4].trim();
    if (declCustoms !== 'NCV') {
      if (declCustoms.length > 12) {
        issues.push({
          severity: 'error',
          segment: 'CVD',
          field: 'declaredCustoms',
          message: `Valor para aduanas excede 12 caracteres`,
          rule: 'CVD [17]: Valor para aduanas hasta 12[m] (o NCV)',
          found: declCustoms
        });
      }
    }
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
function validateNgSegment(lines: string[], issues: ValidationIssue[], segment: GeneratedSegment): void {
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

  // ACAS/Risk Assessment: Alertar sobre descripciones vagas
  if (description.length > 0) {
    const vagueWords = ['CONSOLIDATION', 'CONSOLIDATED', 'PARTS', 'GOODS', 'GENERAL', 'VARIOUS', 'MISC', 'MISCELLANEOUS', 'SAMPLES', 'PERSONAL EFFECTS', 'MERCHANDISE', 'CARGO', 'ITEMS', 'STUFF', 'THINGS'];
    const descUpper = description.toUpperCase().trim();
    const isVague = vagueWords.some(w => descUpper === w || descUpper === w + 'S');
    if (isVague) {
      issues.push({
        severity: 'warning',
        segment: 'NG',
        field: 'description',
        message: `⚠️ ACAS ALERTA: Descripción "${description}" es demasiado vaga. Descripciones genéricas como "Parts", "Consolidation" o "Goods" generan HOLDS en Risk Assessment (ACAS/PLACI).`,
        rule: 'ACAS: Descripciones vagas causan retención en screening de seguridad',
        found: description,
        suggestion: 'Usar descripción específica. Ej: "AUTOMOTIVE BRAKE PADS" en vez de "PARTS", "TEXTILE GARMENTS" en vez de "GOODS"'
      });
    }
    // NC (Consolidation) en envío directo es sospechoso
    if (ngMatch[1] === 'NC') {
      issues.push({
        severity: 'warning',
        segment: 'NG',
        field: 'type',
        message: 'Tipo NC (Consolidation goods) detectado. Si este es un envío DIRECTO (no consolidado), usar /NG/ en lugar de /NC/.',
        rule: 'NG vs NC: NG = General Goods (directos), NC = Consolidation',
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
          rule: 'OTH: Formato OTH/P_o_C/Código/Monto',
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
        rule: 'OTH: P=Prepaid, C=Collect',
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

  // Validar que los montos sean numéricos
  const amounts = content.replace(`${segCode}/`, '').split('/');
  amounts.forEach((amt, idx) => {
    const trimmed = amt.trim();
    if (trimmed && !WEIGHT_PATTERN.test(trimmed) && trimmed !== '0') {
      issues.push({
        severity: 'warning',
        segment: segCode,
        field: `amount${idx + 1}`,
        message: `Monto "${trimmed}" no es numérico`,
        rule: `${segCode}: Montos hasta 15[m] numéricos`,
        found: trimmed
      });
    }
  });
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
      rule: 'ISU: Segmento requerido'
    });
    return;
  }

  if (!content.startsWith('ISU/')) {
    issues.push({
      severity: 'error',
      segment: 'ISU',
      message: 'Segmento debe comenzar con "ISU/"',
      rule: 'ISU: Tag obligatorio'
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
        rule: 'ISU: Fecha DDMMMYY (7 chars)',
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
      rule: 'ISU: Fecha obligatoria'
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
        rule: 'ISU: Lugar hasta 17[t]',
        found: place
      });
    }
  } else {
    issues.push({
      severity: 'error',
      segment: 'ISU',
      field: 'place',
      message: 'Falta lugar de emisión',
      rule: 'ISU: Lugar obligatorio'
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
        rule: 'ISU: Firma hasta 20[t]',
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
      rule: 'REF: Referencia del agente requerida'
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
        rule: 'OCI: 4 campos obligatorios (País, Party, Type, Value)',
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
        rule: 'OCI: País 2[a]',
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
        rule: 'OCI: Identificador de información 3[a] (CNE, SHP, AGT)',
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
        rule: 'OCI: Identificador de control 1-2[a] (T, RA, CT, etc.)',
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
          rule: 'OCI: Información hasta 35[m]',
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
 * Formato: MBI/n[3]-n[8]a[3]a[3]/an[1]n[1-4]
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

  // Validar formato AWB en MBI: n[3]-n[8]a[3]a[3]/an[1]n[1-4]
  const mbiMatch = content.match(/(\d{3})-(\d{8})([A-Z]{3})([A-Z]{3})\/T(\d{1,4})/);
  if (!mbiMatch) {
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
  } else {
    // Match completo — validar Mod-7
    const serial = mbiMatch[2];
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

  // Formato esperado: HBS/HAWBNUMBER/OOODDD/Ppcs/Kwgt[/SLAC/DESC]
  const hbsParts = content.replace(/^HBS\/?/, '').split('/').filter(p => p !== '');

  // HAWB number (max 12 alfanumérico)
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

  // Origen+Destino (6 letras: 3+3)
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

  // Piezas (P{n})
  const piecePart = hbsParts.find(p => /^[PT]\d/.test(p));
  if (piecePart) {
    const pcs = piecePart.substring(1);
    if (!NUMERIC_ONLY.test(pcs) || parseInt(pcs) <= 0) {
      issues.push({
        severity: 'error',
        segment: 'HBS',
        field: 'pieces',
        message: `Piezas "${pcs}" inválidas (debe ser número > 0)`,
        rule: 'HBS: Piezas numéricas > 0',
        found: pcs
      });
    }
  } else {
    issues.push({
      severity: 'error',
      segment: 'HBS',
      field: 'pieces',
      message: 'Faltan piezas en HBS (indicador P o T seguido de cantidad)',
      rule: 'HBS: Piezas obligatorias'
    });
  }

  // Peso (K{n.n})
  const weightPart = hbsParts.find(p => /^[KL][\d.]/.test(p));
  if (weightPart) {
    const wgt = weightPart.substring(1);
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
      message: 'Falta peso en HBS (indicador K o L seguido de peso)',
      rule: 'HBS: Peso obligatorio'
    });
  }

  // Descripción de mercancía (a[1-15]) — spec: campo obligatorio para aduanas
  // Buscar la parte que no sea código HBS, ruta, piezas ni peso
  const descPart = hbsParts.find(p => 
    p && 
    !/^\d/.test(p) && // No empieza con números (no es HBS ID numérico)
    !/^[A-Z]{3}[A-Z]{3}$/.test(p) && // No es ruta (ORGDST 6 letras)
    !/^[A-Z]{6}$/.test(p) && // No es ruta alternativa
    !/^[PT]\d/.test(p) && // No es piezas
    !/^[KL][\d.]/.test(p) && // No es peso
    p.length <= 15 &&
    /^[A-Za-z]/.test(p) // Empieza con letra
  );
  
  if (descPart) {
    if (descPart.length > 15) {
      issues.push({
        severity: 'warning',
        segment: 'HBS',
        field: 'description',
        message: `Descripción "${descPart}" excede 15 caracteres (máximo a[1-15])`,
        rule: 'HBS: Descripción hasta 15 caracteres alfabéticos',
        found: descPart
      });
    }
  } else {
    issues.push({
      severity: 'info',
      segment: 'HBS',
      field: 'description',
      message: 'No se detectó descripción de mercancía en HBS. Aduanas puede requerir descripción (a[1-15]).',
      rule: 'HBS: Descripción recomendada para customs (a[1-15])',
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
          rule: `FWB: Segmento ${seg} es requerido por IATA`,
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
          rule: `${seg.code}: Contenido obligatorio`
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
          rule: 'AWB IATA: 11 dígitos (3 airline prefix + 8 serial)',
          found: awbClean,
          expected: '11 dígitos'
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
  }

  return issues;
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
