/**
 * Servicio CARGO-IMP (IATA CIMP) - Generación de mensajes FWB/FHL EDI
 * 
 * Implementa la lógica legacy documentada para generación de mensajes:
 * - FWB/16, FWB/17: Master Air Waybill
 * - FHL/4: House Waybill
 * 
 * Basado en el manual técnico legacy Traxon - Casos 2, 4 y 5
 * 
 * @author Senior Solutions Architect
 * @version 1.0.0
 */

import { InternalShipment, InternalHouseBill, Party, loadConnectorConfig, ConnectorConfig } from '../../../types';
import {
  FwbVersion,
  FhlVersion,
  FwbSegmentType,
  FhlSegmentType,
  GeneratedSegment,
  GeneratedField,
  GeneratedCargoImpMessage,
  FWB_SEGMENTS,
  FHL_SEGMENTS,
  AirlinePolicy,
  DEFAULT_AIRLINE_POLICIES,
  SENDER_IDS,
  TypeBConfig,
  TypeBPriority,
  DEFAULT_TYPEB_CONFIG
} from './cargoImpTypes';
import { getEffectiveAirlinePolicy, getTypeBConfig as getRuntimeTypeBConfig } from '../../runtimeConfigStore';

// ============================================================
// FUNCIÓN DE NORMALIZACIÓN (según legacy)
// ============================================================

/**
 * Normaliza una cadena según las reglas del sistema legacy
 * Remueve caracteres especiales y trunca a la longitud máxima
 * 
 * @param str Cadena a normalizar
 * @param length Longitud máxima (0 = sin límite)
 * @param withSpaces true: reemplaza chars por espacio, false: los elimina
 * @param evalpoint true: remueve puntos, false: conserva puntos (decimales)
 */
export function normalize(str: string, length: number = 0, withSpaces: boolean = false, evalpoint: boolean = true): string {
  if (!str) return '';
  
  const space = withSpaces ? ' ' : '';
  
  // Reemplazos según legacy
  str = str.replace(/,/g, '.');  // Coma → Punto (decimales)
  str = str.replace(/Ü/g, 'U').replace(/ü/g, 'u');  // Diéresis
  str = str.replace(/-/g, space);  // Guión
  str = str.replace(/\//g, space);  // Slash
  str = str.replace(/#/g, space);  // Numeral
  str = str.replace(/'/g, space);  // Apóstrofe
  str = str.replace(/\?/g, space);  // Interrogación
  str = str.replace(/ñ/g, space).replace(/Ñ/g, space);  // Eñe
  str = str.replace(/\*/g, space);  // Asterisco
  str = str.replace(/&/g, space);  // Ampersand
  str = str.replace(/°/g, space);  // Grado
  str = str.replace(/:/g, space);  // Dos puntos
  str = str.replace(/\n/g, space).replace(/\r/g, space);  // Saltos
  str = str.replace(/\+/g, space);  // Más
  str = str.replace(/"/g, ' ').replace(/"/g, ' ').replace(/"/g, ' ');  // Comillas
  str = str.replace(/`/g, ' ').replace(/´/g, ' ');  // Acentos
  str = str.replace(/_/g, space);  // Underscore (guión bajo)
  str = str.replace(/@/g, space);  // Arroba
  str = str.replace(/\(/g, '').replace(/\)/g, '');  // Paréntesis → eliminar
  
  // Punto condicional
  if (evalpoint) {
    str = str.replace(/\./g, space);
  }
  
  // Truncar
  if (length > 0 && str.length > length) {
    str = str.substring(0, length);
  }
  
  // Limpieza final
  str = str.trim();
  str = str.replace(/\s+/g, ' ');  // Espacios múltiples → simple
  
  return str.toUpperCase();
}

/**
 * Reemplazos post-generación para FWB según legacy (Casos 4, 5, 8)
 * Caracteres que se reemplazan después de generar el mensaje FWB
 */
function applyFwbPostReplacements(message: string): string {
  return message
    .replace(/:/g, ' ')   // Dos puntos → espacio
    .replace(/\$/g, ' ')  // Dólar → espacio
    .replace(/=/g, ' ')   // Igual → espacio
    .replace(/»/g, ' ');  // Guillemet → espacio
}

/**
 * Reemplazos post-generación para FHL según legacy
 * @param includeQuestionMark true para casos 5 y 8, false para casos 2, 4, 7
 */
function applyFhlPostReplacements(message: string, includeQuestionMark: boolean = false): string {
  let result = message
    .replace(/\(/g, '')   // Paréntesis abierto → eliminar
    .replace(/\)/g, '')   // Paréntesis cerrado → eliminar
    .replace(/,/g, '')    // Coma → eliminar
    .replace(/&/g, '')    // Ampersand → eliminar
    .replace(/Ñ/g, 'N')   // Eñe mayúscula → N
    .replace(/ñ/g, 'n');  // Eñe minúscula → n
  
  if (includeQuestionMark) {
    result = result.replace(/\?/g, '');  // Casos 5 y 8 también remueven ?
  }
  
  return result;
}

/**
 * Normaliza prefijos HAWB especiales según legacy
 * CM, SK, LG → 0CM, 0SK, 0LG
 */
function normalizeHawbNumber(hawb: string, prefixes: string[] = ['CM', 'SK', 'LG']): string {
  let result = hawb.toUpperCase().trim();
  
  for (const prefix of prefixes) {
    if (result.startsWith(prefix)) {
      result = '0' + result;
      break;
    }
  }
  
  return result;
}

/**
 * Formatea un número con decimales
 */
function formatNumber(value: number | string, decimals: number = 1): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.0';
  return num.toFixed(decimals);
}

/**
 * Formatea fecha en formato DDMMMYY (ej: 24JAN26)
 */
function formatDate(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
}

/**
 * Formatea fecha/hora para UNB (YYMMDD:HHMM)
 */
function formatDateTime(): string {
  const d = new Date();
  const yy = d.getFullYear().toString().slice(-2);
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${yy}${mm}${dd}:${hh}${min}`;
}

/**
 * Obtiene el número de control EDIFACT
 * Usa el valor fijo de configuración si está definido, sino genera uno dinámico
 */
function getControlNumber(): string {
  const globalConfig = loadGlobalConfig();
  if (globalConfig.controlNumber && globalConfig.controlNumber.trim()) {
    return globalConfig.controlNumber.trim();
  }
  // Fallback: generar dinámicamente
  return Date.now().toString().slice(-14);
}

/**
 * Normaliza el número AWB para segmento AWB (sin guiones)
 * Ej: 992-5698-4125 → 99256984125
 */
function normalizeAwbNumber(awb: string): string {
  return awb.replace(/-/g, '').replace(/\s/g, '');
}

/**
 * Formatea AWB para MBI/FHL con formato correcto: PREFIJO-NUMERO
 * Ej: 992-5698-4125 → 992-56984125 (prefijo + resto sin guiones internos)
 */
function formatAwbForMbi(awb: string): string {
  const clean = awb.replace(/\s/g, '').replace(/-/g, '');
  if (clean.length >= 11) {
    // Formato: 3 dígitos prefijo + guión + 8 dígitos resto
    return clean.substring(0, 3) + '-' + clean.substring(3);
  }
  return clean;
}

/**
 * Normaliza HAWB (sin guiones)
 */
function normalizeHawbForMessage(hawb: string): string {
  return hawb.replace(/-/g, '').replace(/\s/g, '').toUpperCase();
}

/**
 * Obtiene el prefijo de aerolínea del AWB (primeros 3 dígitos)
 */
function getAwbPrefix(awb: string): string {
  return normalizeAwbNumber(awb).substring(0, 3);
}

/**
 * Normaliza destino (LON→LHR)
 */
function normalizeDestination(dest: string): string {
  const mapping: Record<string, string> = {
    'LON': 'LHR',
    'RNG': 'MDE'
  };
  return mapping[dest.toUpperCase()] || dest.toUpperCase();
}

// ============================================================
// CONFIGURACIÓN GLOBAL DESDE LOCALSTORAGE
// ============================================================

interface CargoImpGlobalConfig {
  senderIds: {
    EC: { senderId: string; senderIdDescartes: string };
    CO: { senderId: string; senderIdDescartes: string };
  };
  defaultPostalCodes: {
    EC: string;
    CO: string;
    DEFAULT: string;
  };
  chinaPostalCode: string;
  /** Control Number fijo para EDIFACT (si vacío se genera dinámicamente) */
  controlNumber: string;
  /** Sender ID fijo (se usa siempre, independiente del país del shipper) */
  senderId: string;
  /** Firma por defecto para CER e ISU */
  defaultSignature: string;
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
  chinaPostalCode: '170452',
  controlNumber: '96728316614806',
  senderId: 'REUAGT89COCRGMASTER/BOG01:PIMA',
  defaultSignature: 'CARGOOP'
};

/**
 * Carga la configuración global desde localStorage (ConnectorConfig.cargoImp)
 */
function loadGlobalConfig(): CargoImpGlobalConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_GLOBAL_CONFIG;
  try {
    // Primero intentar cargar desde ConnectorConfig
    const connectorConfig = localStorage.getItem('traxon_connector_config');
    if (connectorConfig) {
      const parsed = JSON.parse(connectorConfig);
      if (parsed.cargoImp) {
        return {
          ...DEFAULT_GLOBAL_CONFIG,
          controlNumber: parsed.cargoImp.controlNumber || DEFAULT_GLOBAL_CONFIG.controlNumber,
          senderId: parsed.cargoImp.senderId || DEFAULT_GLOBAL_CONFIG.senderId,
          defaultSignature: parsed.cargoImp.defaultSignature || DEFAULT_GLOBAL_CONFIG.defaultSignature
        };
      }
    }
    // Fallback a configuración legacy
    const saved = localStorage.getItem('cargoimp_global_config');
    if (saved) {
      return { ...DEFAULT_GLOBAL_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Error loading CARGO-IMP global config:', e);
  }
  return { ...DEFAULT_GLOBAL_CONFIG };
}

/**
 * Obtiene código postal con default según país (usando configuración global)
 * Si no tiene código postal, puede usar el de la agencia pasado como parámetro
 * @param postalCode Código postal a validar
 * @param country País (2 chars)
 * @param agencyPostalCode Código postal de la agencia (fallback)
 */
function getPostalCode(postalCode: string | undefined, country: string, agencyPostalCode?: string): string {
  // 1. Si tiene código postal, usarlo
  if (postalCode && postalCode.trim()) {
    return postalCode.trim().substring(0, 9);
  }
  
  // 2. Si hay código postal de agencia, usarlo como fallback
  if (agencyPostalCode && agencyPostalCode.trim()) {
    return agencyPostalCode.trim().substring(0, 9);
  }
  
  // 3. Usar defaults según país
  const globalConfig = loadGlobalConfig();
  const defaults = globalConfig.defaultPostalCodes;
  
  if (country === 'EC') return defaults.EC || '00000';
  if (country === 'CO') return defaults.CO || '110111';
  return defaults.DEFAULT || '10';
}

/**
 * Obtiene el código postal especial para envíos Ecuador→China
 */
function getChinaPostalCode(): string {
  const globalConfig = loadGlobalConfig();
  return globalConfig.chinaPostalCode || '170452';
}

/**
 * Obtiene el Sender ID desde la configuración global (siempre fijo)
 * No depende del país del shipper - usa el valor configurado
 */
function getSenderId(): string {
  const globalConfig = loadGlobalConfig();
  return globalConfig.senderId || DEFAULT_GLOBAL_CONFIG.senderId;
}

/**
 * Obtiene la firma por defecto desde la configuración global
 */
function getDefaultSignature(): string {
  const globalConfig = loadGlobalConfig();
  return globalConfig.defaultSignature || 'CARGOOP';
}

// ============================================================
// SERVICIO PRINCIPAL CARGO-IMP
// ============================================================

export class CargoImpService {
  private config: ConnectorConfig;

  constructor() {
    this.config = loadConnectorConfig();
  }

  /**
   * Obtiene la política para una aerolínea
   * Usa el RuntimeConfigStore que combina defaults + overrides en memoria
   */
  getAirlinePolicy(awbPrefix: string): AirlinePolicy {
    return getEffectiveAirlinePolicy(awbPrefix);
  }

  /**
   * Recarga la configuración (útil cuando cambia)
   */
  reloadConfig(): void {
    this.config = loadConnectorConfig();
  }

  /**
   * Obtiene información sobre qué política se está usando para un AWB
   * Útil para mostrar en la UI antes del envío
   */
  getPolicyInfo(awbPrefix: string): {
    policy: AirlinePolicy;
    source: 'custom' | 'configured' | 'default';
    airlineName: string;
    isDefault: boolean;
    warnings: string[];
  } {
    const runtimePolicies = this.config.cargoImp?.airlinePolicies;
    const warnings: string[] = [];
    
    // Verificar si existe en configuración runtime
    if (runtimePolicies && runtimePolicies[awbPrefix]) {
      const policy = this.getAirlinePolicy(awbPrefix);
      return {
        policy,
        source: 'custom',
        airlineName: `Aerolínea ${awbPrefix} (Configuración personalizada)`,
        isDefault: false,
        warnings
      };
    }
    
    // Verificar si existe en DEFAULT_AIRLINE_POLICIES
    if (DEFAULT_AIRLINE_POLICIES[awbPrefix]) {
      const policy = this.getAirlinePolicy(awbPrefix);
      return {
        policy,
        source: 'configured',
        airlineName: DEFAULT_AIRLINE_POLICIES[awbPrefix].name,
        isDefault: false,
        warnings
      };
    }
    
    // Usar DEFAULT - agregar warning
    const policy = this.getAirlinePolicy(awbPrefix);
    warnings.push(`⚠️ Aerolínea ${awbPrefix} no tiene política específica configurada. Se usará la política DEFAULT.`);
    warnings.push(`💡 Puedes agregar una política personalizada en Configuración → CARGO-IMP.`);
    
    return {
      policy,
      source: 'default',
      airlineName: `Aerolínea ${awbPrefix} (usando DEFAULT)`,
      isDefault: true,
      warnings
    };
  }

  /**
   * Genera mensaje FWB completo
   */
  generateFWB(shipment: InternalShipment, version?: FwbVersion): GeneratedCargoImpMessage {
    const awbPrefix = getAwbPrefix(shipment.awbNumber);
    const policy = this.getAirlinePolicy(awbPrefix);
    const fwbVersion = version || policy.fwbVersion;
    
    const segments = this.buildFwbSegments(shipment, policy, fwbVersion);
    const fullMessage = this.assembleMessage(segments, policy);
    
    const errors: string[] = [];
    segments.forEach(seg => {
      if (seg.errors.length > 0) {
        errors.push(...seg.errors.map(e => `${seg.code}: ${e}`));
      }
    });

    return {
      type: 'FWB',
      version: fwbVersion,
      awbNumber: shipment.awbNumber,
      isConsolidation: !!shipment.hasHouses,
      segments,
      fullMessage,
      isValid: errors.length === 0,
      errors,
      policy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Genera mensaje FHL para una house
   */
  generateFHL(shipment: InternalShipment, house: InternalHouseBill, version?: FhlVersion): GeneratedCargoImpMessage {
    const awbPrefix = getAwbPrefix(shipment.awbNumber);
    const policy = this.getAirlinePolicy(awbPrefix);
    const fhlVersion = version || policy.fhlVersion;
    
    const segments = this.buildFhlSegments(shipment, house, policy, fhlVersion);
    const fullMessage = this.assembleFhlMessage(segments);
    
    const errors: string[] = [];
    segments.forEach(seg => {
      if (seg.errors.length > 0) {
        errors.push(...seg.errors.map(e => `${seg.code}: ${e}`));
      }
    });

    return {
      type: 'FHL',
      version: fhlVersion,
      awbNumber: shipment.awbNumber,
      hawbNumber: house.hawbNumber,
      segments,
      fullMessage,
      isValid: errors.length === 0,
      errors,
      policy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Genera todos los FHL concatenados (Caso 5)
   * Cada FHL separado por '&\n' y header FHL/4 en cada uno
   */
  generateConcatenatedFHL(shipment: InternalShipment, version?: FhlVersion): string {
    if (!shipment.houseBills || shipment.houseBills.length === 0) {
      return '';
    }

    const awbPrefix = getAwbPrefix(shipment.awbNumber);
    const policy = this.getAirlinePolicy(awbPrefix);
    const fhlVersion = version || policy.fhlVersion;

    const messages: string[] = [];
    shipment.houseBills.forEach((house, index) => {
      const fhl = this.generateFHL(shipment, house, fhlVersion);
      // Aplicar reemplazos post-generación del caso 5 (incluye ?)
      const cleanedMessage = applyFhlPostReplacements(fhl.fullMessage, true);
      messages.push(cleanedMessage);
    });

    // Concatenar con separador '&\n' (Case 5)
    return messages.join('&\n');
  }

  /**
   * Genera FHL para Caso 7 (DHL/ABX)
   * Siempre incluye header/footer EDIFACT (option = -1 en legacy)
   */
  generateFHLCase7(shipment: InternalShipment, house: InternalHouseBill, version?: FhlVersion): GeneratedCargoImpMessage {
    const awbPrefix = getAwbPrefix(shipment.awbNumber);
    const policy = this.getAirlinePolicy(awbPrefix);
    const fhlVersion = version || policy.fhlVersion;
    
    // Forzar includeUnbUnz a true para Caso 7 (simula option=-1)
    const policyCase7: AirlinePolicy = {
      ...policy,
      includeUnbUnz: true, // Siempre con header/footer
      fhlAlwaysWithHeader: true
    };
    
    const segments = this.buildFhlSegments(shipment, house, policyCase7, fhlVersion, true);
    let fullMessage = this.assembleFhlMessage(segments);
    
    // Aplicar reemplazos post-generación del caso 7 (no incluye ?)
    fullMessage = applyFhlPostReplacements(fullMessage, false);
    
    const errors: string[] = [];
    segments.forEach(seg => {
      if (seg.errors.length > 0) {
        errors.push(...seg.errors.map(e => `${seg.code}: ${e}`));
      }
    });

    return {
      type: 'FHL',
      version: fhlVersion,
      awbNumber: shipment.awbNumber,
      hawbNumber: house.hawbNumber,
      segments,
      fullMessage,
      isValid: errors.length === 0,
      errors,
      policy: policyCase7,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Genera FHL para Caso 8
   * MBI solo aparece en la primera HAWB, SIN separador '&' entre HAWBs
   */
  generateAllFHLCase8(shipment: InternalShipment, version?: FhlVersion): string {
    if (!shipment.houseBills || shipment.houseBills.length === 0) {
      return '';
    }

    const awbPrefix = getAwbPrefix(shipment.awbNumber);
    const policy = this.getAirlinePolicy(awbPrefix);
    const fhlVersion = version || policy.fhlVersion;

    // Header FHL solo una vez al inicio
    let result = fhlVersion + '\n';

    shipment.houseBills.forEach((house, index) => {
      // Construir segmentos con o sin MBI según el índice
      const includeMBI = (index === 0); // MBI solo en la primera HAWB
      const segments = this.buildFhlSegmentsCase8(shipment, house, policy, fhlVersion, includeMBI);
      const message = this.assembleFhlMessageWithoutHeader(segments);
      
      // Aplicar reemplazos post-generación del caso 8 (incluye ?)
      const cleanedMessage = applyFhlPostReplacements(message, true);
      result += cleanedMessage;
      
      // Caso 8: NO hay separador & entre HAWBs
    });

    return result;
  }

  /**
   * Genera paquete completo de mensajes según el caso de política
   * Devuelve FWB y FHLs formateados según la política de la aerolínea
   */
  generateMessageBundle(shipment: InternalShipment): {
    fwb: GeneratedCargoImpMessage;
    fhls: GeneratedCargoImpMessage[];
    concatenatedFhl?: string;
    policyCase: number;
    policyOption: number;
  } {
    const awbPrefix = getAwbPrefix(shipment.awbNumber);
    const policy = this.getAirlinePolicy(awbPrefix);
    const policyCase = Math.floor(policy.policy / 10);
    const policyOption = policy.policy % 10;

    // Generar FWB con reemplazos post-generación
    const fwb = this.generateFWB(shipment);
    fwb.fullMessage = applyFwbPostReplacements(fwb.fullMessage);

    const fhls: GeneratedCargoImpMessage[] = [];
    let concatenatedFhl: string | undefined;

    if (shipment.houseBills && shipment.houseBills.length > 0) {
      switch (policyCase) {
        case 2: // Caso 2: FWB estándar + FHL individuales
        case 4: // Caso 4: FWB_NEW + FHL individuales
          shipment.houseBills.forEach((house) => {
            const fhl = this.generateFHL(shipment, house);
            fhl.fullMessage = applyFhlPostReplacements(fhl.fullMessage, false);
            fhls.push(fhl);
          });
          break;

        case 5: // Caso 5: FWB_NEW + FHL concatenadas con '&'
          concatenatedFhl = this.generateConcatenatedFHL(shipment);
          break;

        case 7: // Caso 7: DHL/ABX - FHL siempre con header/footer
          shipment.houseBills.forEach((house) => {
            const fhl = this.generateFHLCase7(shipment, house);
            fhls.push(fhl);
          });
          break;

        case 8: // Caso 8: Todas FHL en 1, MBI solo en primera
          concatenatedFhl = this.generateAllFHLCase8(shipment);
          break;

        default: // Default a Caso 2
          shipment.houseBills.forEach((house) => {
            const fhl = this.generateFHL(shipment, house);
            fhl.fullMessage = applyFhlPostReplacements(fhl.fullMessage, false);
            fhls.push(fhl);
          });
      }
    }

    return {
      fwb,
      fhls,
      concatenatedFhl,
      policyCase,
      policyOption
    };
  }

  // ============================================================
  // CONSTRUCCIÓN DE SEGMENTOS FWB
  // ============================================================

  private buildFwbSegments(shipment: InternalShipment, policy: AirlinePolicy, version: FwbVersion): GeneratedSegment[] {
    const segments: GeneratedSegment[] = [];
    const allSegmentTypes: FwbSegmentType[] = [
      'FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 
      'CVD', 'RTD', 'NG', 'NH', 'NV', 'NS', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 
      'REF', 'SPH', 'OCI', 'NFY', 'FTR'
    ];

    // Obtener arrays de segmentos con fallback a arrays vacíos
    const enabledSegments = policy.enabledSegments || [];
    const disabledSegments = policy.disabledSegments || [];

    allSegmentTypes.forEach((segType, idx) => {
      const segInfo = FWB_SEGMENTS[segType];
      // Un segmento está habilitado si:
      // 1. Está en enabledSegments Y no está en disabledSegments, O
      // 2. enabledSegments está vacío Y no está en disabledSegments
      const isEnabled = enabledSegments.length > 0 
        ? enabledSegments.includes(segType) && !disabledSegments.includes(segType)
        : !disabledSegments.includes(segType);
      
      const segment = this.buildFwbSegment(segType, shipment, policy, version, isEnabled, idx + 1);
      segments.push(segment);
    });

    return segments.sort((a, b) => a.order - b.order);
  }

  private buildFwbSegment(
    segType: FwbSegmentType, 
    shipment: InternalShipment, 
    policy: AirlinePolicy, 
    version: FwbVersion,
    enabled: boolean,
    order: number
  ): GeneratedSegment {
    const segInfo = FWB_SEGMENTS[segType];
    let content = '';
    let fields: GeneratedField[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (segType) {
      case 'FWB':
        content = this.buildFwbHeader(shipment, policy, version);
        fields = [{ name: 'version', value: version, originalValue: version, maxLength: 7, required: true, modified: false }];
        break;

      case 'AWB':
        content = this.buildAwbSegment(shipment);
        fields = [
          { name: 'awbNumber', value: normalizeAwbNumber(shipment.awbNumber), originalValue: normalizeAwbNumber(shipment.awbNumber), maxLength: 11, required: true, modified: false },
          { name: 'origin', value: shipment.origin, originalValue: shipment.origin, maxLength: 3, required: true, modified: false },
          { name: 'destination', value: normalizeDestination(shipment.destination), originalValue: normalizeDestination(shipment.destination), maxLength: 3, required: true, modified: false },
          { name: 'pieces', value: shipment.pieces.toString(), originalValue: shipment.pieces.toString(), maxLength: 5, required: true, modified: false },
          { name: 'weight', value: formatNumber(shipment.weight), originalValue: formatNumber(shipment.weight), maxLength: 10, required: true, modified: false }
        ];
        break;

      case 'FLT':
        content = this.buildFltSegment(shipment);
        if (shipment.flights && shipment.flights.length > 0) {
          fields = shipment.flights.slice(0, 2).map((f, i) => ({
            name: `flight${i + 1}`,
            value: f.flightNumber,
            originalValue: f.flightNumber,
            maxLength: 10,
            required: false,
            modified: false
          }));
        }
        break;

      case 'RTG':
        content = this.buildRtgSegment(shipment);
        fields = [{ name: 'routing', value: content, originalValue: content, maxLength: 100, required: true, modified: false }];
        break;

      case 'SHP':
        const agencyPostalForShp = shipment.agent?.address?.postalCode;
        content = this.buildShpSegment(shipment.shipper, shipment.consignee?.address?.countryCode || '', shipment.awbNumber, version, agencyPostalForShp);
        fields = [
          { name: 'name', value: normalize(shipment.shipper.name, 35, true), originalValue: normalize(shipment.shipper.name, 35, true), maxLength: 35, required: true, modified: false },
          { name: 'address', value: normalize(shipment.shipper.address.street, 35, true), originalValue: normalize(shipment.shipper.address.street, 35, true), maxLength: 35, required: true, modified: false },
          { name: 'city', value: shipment.shipper.address.place, originalValue: shipment.shipper.address.place, maxLength: 17, required: true, modified: false },
          { name: 'country', value: shipment.shipper.address.countryCode, originalValue: shipment.shipper.address.countryCode, maxLength: 2, required: true, modified: false },
          { name: 'postalCode', value: getPostalCode(shipment.shipper.address.postalCode, shipment.shipper.address.countryCode, agencyPostalForShp), originalValue: getPostalCode(shipment.shipper.address.postalCode, shipment.shipper.address.countryCode, agencyPostalForShp), maxLength: 9, required: false, modified: false }
        ];
        break;

      case 'CNE':
        const agencyPostalForCne = shipment.agent?.address?.postalCode;
        content = this.buildCneSegment(shipment.consignee, version, agencyPostalForCne);
        fields = [
          { name: 'name', value: normalize(shipment.consignee.name, 35, true), originalValue: normalize(shipment.consignee.name, 35, true), maxLength: 35, required: true, modified: false },
          { name: 'address', value: normalize(shipment.consignee.address.street, 35, true), originalValue: normalize(shipment.consignee.address.street, 35, true), maxLength: 35, required: true, modified: false },
          { name: 'city', value: shipment.consignee.address.place, originalValue: shipment.consignee.address.place, maxLength: 17, required: true, modified: false },
          { name: 'country', value: shipment.consignee.address.countryCode, originalValue: shipment.consignee.address.countryCode, maxLength: 2, required: true, modified: false },
          { name: 'postalCode', value: getPostalCode(shipment.consignee.address.postalCode, shipment.consignee.address.countryCode, agencyPostalForCne), originalValue: getPostalCode(shipment.consignee.address.postalCode, shipment.consignee.address.countryCode, agencyPostalForCne), maxLength: 9, required: true, modified: false }
        ];
        break;

      case 'AGT':
        content = this.buildAgtSegment(shipment);
        fields = [
          { name: 'iataCode', value: shipment.agent.iataCode, originalValue: shipment.agent.iataCode, maxLength: 7, required: true, modified: false },
          { name: 'cassCode', value: shipment.agent.cassCode || '', originalValue: shipment.agent.cassCode || '', maxLength: 4, required: false, modified: false },
          { name: 'name', value: shipment.agent.name, originalValue: shipment.agent.name, maxLength: 35, required: true, modified: false }
        ];
        break;

      case 'SSR':
        content = this.buildSsrSegment(shipment);
        fields = [{ name: 'ssr', value: shipment.specialServiceRequest || '', originalValue: shipment.specialServiceRequest || '', maxLength: 65, required: false, modified: false }];
        break;

      case 'ACC':
        content = this.buildAccSegment(shipment);
        if (shipment.accounting && shipment.accounting.length > 0) {
          fields = shipment.accounting.map((acc, idx) => ({
            name: `acc${idx + 1}`,
            value: acc.accountingInformation || '',
            originalValue: acc.accountingInformation || '',
            maxLength: 34,
            required: false,
            modified: false
          }));
        }
        break;

      case 'CVD':
        content = this.buildCvdSegment(shipment);
        const wtOt = this.calculateWtOt(shipment);
        fields = [
          { name: 'currency', value: shipment.currency, originalValue: shipment.currency, maxLength: 3, required: true, modified: false },
          { name: 'wtOt', value: wtOt, originalValue: wtOt, maxLength: 2, required: true, modified: false },
          { name: 'declaredCarriage', value: shipment.declaredValueCarriage || 'NVD', originalValue: shipment.declaredValueCarriage || 'NVD', maxLength: 15, required: true, modified: false },
          { name: 'declaredCustoms', value: shipment.declaredValueCustoms || 'NCV', originalValue: shipment.declaredValueCustoms || 'NCV', maxLength: 15, required: true, modified: false }
        ];
        break;

      case 'RTD':
        content = this.buildRtdSegment(shipment, policy);
        break;

      case 'NG':
        content = this.buildNgSegment(shipment, policy);
        const ngDesc = this.getNatureOfGoods(shipment, policy);
        fields = [{ name: 'description', value: ngDesc, originalValue: ngDesc, maxLength: 20, required: true, modified: false }];
        break;

      case 'NH':
        content = this.buildNhSegment(shipment);
        break;

      case 'NV':
        content = this.buildNvSegment(shipment);
        break;

      case 'NS':
        content = this.buildNsSegment(shipment);
        break;

      case 'OTH':
        content = this.buildOthSegment(shipment);
        break;

      case 'PPD':
        content = shipment.paymentMethod === 'Prepaid' ? this.buildChargeSummary(shipment, 'PPD') : '';
        break;

      case 'COL':
        content = shipment.paymentMethod === 'Collect' ? this.buildChargeSummary(shipment, 'COL') : '';
        break;

      case 'CER':
        content = this.buildCerSegment(shipment, policy);
        break;

      case 'ISU':
        content = this.buildIsuSegment(shipment, policy);
        break;

      case 'REF':
        content = this.buildRefSegment(shipment);
        break;

      case 'SPH':
        content = this.buildSphSegment(shipment, policy);
        const sphCodes = this.getSphCodes(shipment, policy);
        fields = [{ name: 'codes', value: sphCodes.join('/'), originalValue: sphCodes.join('/'), maxLength: 40, required: true, modified: false }];
        break;

      case 'OCI':
        content = this.buildOciSegment(shipment, policy);
        break;

      case 'NFY':
        content = this.buildNfySegment(shipment);
        if (shipment.alsoNotify) {
          fields = [
            { name: 'name', value: shipment.alsoNotify.name || '', originalValue: shipment.alsoNotify.name || '', maxLength: 35, required: false, modified: false },
            { name: 'address', value: shipment.alsoNotify.address?.street || '', originalValue: shipment.alsoNotify.address?.street || '', maxLength: 35, required: false, modified: false },
            { name: 'city', value: shipment.alsoNotify.address?.place || '', originalValue: shipment.alsoNotify.address?.place || '', maxLength: 17, required: false, modified: false },
            { name: 'country', value: shipment.alsoNotify.address?.countryCode || '', originalValue: shipment.alsoNotify.address?.countryCode || '', maxLength: 2, required: false, modified: false }
          ];
        }
        break;

      case 'FTR':
        // Type B no usa footer EDIFACT
        content = this.buildFwbFooter(policy);
        break;
    }

    // Guardar contenido original si excede el límite máximo
    const originalContent = content.length > segInfo.maxLength ? content : undefined;
    
    // Agregar error automático si excede el límite
    if (content.length > segInfo.maxLength) {
      errors.push(`Excede límite: ${content.length}/${segInfo.maxLength} caracteres (${content.length - segInfo.maxLength} de más)`);
    }

    return {
      type: segType,
      code: segType,
      name: segInfo.name,
      content,
      originalContent,
      order,
      enabled,
      editable: !['FWB', 'FTR', 'AWB'].includes(segType),
      currentLength: content.length,
      maxLength: segInfo.maxLength,
      errors,
      warnings,
      fields
    };
  }

  // ============================================================
  // CONSTRUCCIÓN DE SEGMENTOS INDIVIDUALES FWB
  // ============================================================

  /**
   * Construye el header Type B para Descartes
   * 
   * Formato Type B (Descartes Universal Header):
   *   QK DSGUNXA                              <- Priority + DSGUNXA (fijo)
   *   .DSGTPXA 031843 TDVAGT03OPERFLOR/BOG1   <- .SenderPrefix + timestamp + OriginAddress
   *   FWB/17                                   <- Inicio del mensaje
   * 
   * DSGUNXA = "Descartes Universal Header"
   * Descartes enruta automáticamente el mensaje a la aerolínea correcta
   * basándose en el contenido del mensaje (AWB prefix, etc.)
   * 
   * Ejemplo: QK DSGUNXA = Priority normal + Universal Header de Descartes
   */
  private buildTypeBHeader(shipment: InternalShipment, policy: AirlinePolicy, version: FwbVersion): string {
    const typeBConfig = this.getTypeBConfig();
    const priority = policy.typeBPriority || typeBConfig.defaultPriority;
    
    // Valores fijos de Descartes
    const recipientAddress = typeBConfig.recipientAddress || 'DSGUNXA';
    const senderPrefix = typeBConfig.senderPrefix || 'DSGTPXA';
    const originAddress = typeBConfig.originAddress || 'TDVAGT03OPERFLOR/BOG1';
    const includeTimestamp = typeBConfig.includeTimestamp ?? true;
    
    // Línea 2: .DSGTPXA DDHHmm OriginAddress
    let originLine = `.${senderPrefix}`;
    if (includeTimestamp) {
      const now = new Date();
      const timestamp = String(now.getUTCDate()).padStart(2, '0') +
                        String(now.getUTCHours()).padStart(2, '0') +
                        String(now.getUTCMinutes()).padStart(2, '0');
      originLine += ` ${timestamp}`;
    }
    originLine += ` ${originAddress}`;
    
    // Línea 1: Priority + ESPACIO + RecipientAddress (DSGUNXA)
    // Línea 2: .SenderPrefix DDHHmm OriginAddress
    // Línea 3+: Mensaje FWB
    return `${priority} ${recipientAddress}\n${originLine}\n${version}`;
  }

  /**
   * Obtiene el código de aerolínea (2 letras) para Type B header
   * Prioridad: 1) carrierCode del vuelo, 2) mapeo desde AWB prefix
   */
  private getCarrierCodeForTypeB(shipment: InternalShipment): string {
    // Intentar obtener del primer vuelo (prioridad máxima)
    if (shipment.flights && shipment.flights.length > 0 && shipment.flights[0].carrierCode) {
      return shipment.flights[0].carrierCode.toUpperCase().substring(0, 2);
    }
    
    // Mapeo AWB prefix → Código IATA 2 letras
    // Fuente: IATA Airline Coding Directory
    const awbPrefix = getAwbPrefix(shipment.awbNumber);
    const prefixToCarrier: Record<string, string> = {
      // Aerolíneas Colombianas y Latinoamericanas
      '729': 'AV', // Avianca
      '134': 'AV', // Avianca Cargo
      '743': 'QT', // Tampa Cargo (Colombia)
      '270': 'LA', // LATAM Airlines Colombia
      '145': 'LA', // LATAM Chile
      '985': 'LA', // LATAM Cargo
      '105': 'CM', // Copa Airlines (Panamá)
      '230': 'P5', // Wingo (Copa Colombia)
      '044': 'AD', // Azul Brazilian Airlines
      '957': 'G3', // GOL Linhas Aéreas
      
      // Aerolíneas Cargueras
      '999': 'C$', // Centurion Cargo
      '695': 'CX', // Cathay Pacific Cargo
      '406': '5Y', // Atlas Air / Polar Air Cargo
      '023': '5X', // UPS Airlines
      '580': 'UX', // Air Europa
      
      // Aerolíneas Norteamericanas
      '001': 'AA', // American Airlines
      '006': 'DL', // Delta Air Lines
      '016': 'UA', // United Airlines
      '014': 'AC', // Air Canada
      '992': 'AA', // American Airlines (alternativo)
      
      // Aerolíneas Europeas
      '057': 'AF', // Air France
      '074': 'KL', // KLM
      '075': 'IB', // Iberia
      '045': 'IB', // Iberia (alternativo)
      '220': 'LH', // Lufthansa
      '020': 'LH', // Lufthansa Cargo
      '235': 'TK', // Turkish Airlines
      '125': 'BA', // British Airways
      '932': 'VS', // Virgin Atlantic
      '555': 'SU', // Aeroflot
      
      // Aerolíneas Medio Oriente
      '176': 'EK', // Emirates
      '157': 'QR', // Qatar Airways
      '607': 'EY', // Etihad Airways
      '071': 'ET', // Ethiopian Airlines
      
      // Aerolíneas Asia-Pacífico
      '131': 'JL', // Japan Airlines
      '180': 'KE', // Korean Air
      '160': 'CA', // Air China
      '618': 'SQ', // Singapore Airlines
    };
    
    return prefixToCarrier[awbPrefix] || 'XX'; // XX como fallback
  }

  /**
   * Obtiene la configuración Type B, usando el RuntimeConfigStore en tiempo real
   */
  private getTypeBConfig(): TypeBConfig {
    // Usar el runtimeConfigStore para obtener la config actualizada en tiempo real
    return getRuntimeTypeBConfig();
  }

  private buildFwbHeader(shipment: InternalShipment, policy: AirlinePolicy, version: FwbVersion): string {
    // Si usa Type B, construir header Type B (sin EDIFACT envelope)
    if (policy.useTypeBHeader) {
      return this.buildTypeBHeader(shipment, policy, version);
    }
    
    // Si la política indica no incluir UNB/UNZ, retornar solo la versión
    if (!policy.includeUnbUnz) return version;
    
    // Usar Sender ID fijo de configuración (no depende del país del shipper)
    const senderId = getSenderId();
    const controlNumber = getControlNumber();
    
    // Obtener dirección de aerolínea: prioridad routing del shipment, luego policy
    const airlineAddress = shipment.routing?.recipientAddress || policy.airlineAddress || 'AIRLINE_ADDRESS';
    
    // Formato según legacy: 
    // UNB+IATA:1+{SENDER_ID}:PIMA+{AIRLINE_ADDRESS}:PIMA+{YYMMDD:HHMM}+{CONTROL_REF}+0++L'UNH+{CONTROL_REF}+CIM{FWB_VERSION}'FWB/{VERSION}
    const versionNumber = version.replace('FWB/', '');
    
    return `UNB+IATA:1+${senderId}+${airlineAddress}:PIMA+${formatDateTime()}+${controlNumber}+0++L'UNH+${controlNumber}+CIMFWB:${versionNumber}'${version}`;
  }

  private buildAwbSegment(shipment: InternalShipment): string {
    // AWB con formato: 992-01622213 (prefijo + guión + resto)
    const awb = formatAwbForMbi(shipment.awbNumber);
    const origin = shipment.origin.toUpperCase();
    const destination = normalizeDestination(shipment.destination);
    return `${awb}${origin}${destination}/T${shipment.pieces}K${formatNumber(shipment.weight)}`;
  }

  private buildFltSegment(shipment: InternalShipment): string {
    if (!shipment.flights || shipment.flights.length === 0) return '';
    
    const parts = ['FLT'];
    shipment.flights.slice(0, 2).forEach(flight => {
      // FLT usa solo el día (DD), no la fecha completa
      const flightDay = flight.date 
        ? new Date(flight.date).getDate().toString().padStart(2, '0')
        : '';
      parts.push(`/${flight.flightNumber}/${flightDay}`);
    });
    
    return parts.join('');
  }

  private buildRtgSegment(shipment: InternalShipment): string {
    const parts = ['RTG'];
    
    if (shipment.flights && shipment.flights.length > 0) {
      shipment.flights.forEach(flight => {
        const dest = normalizeDestination(flight.destination);
        parts.push(`/${dest}${flight.carrierCode}`);
      });
    } else {
      // Routing básico origen-destino
      parts.push(`/${shipment.origin}XX/${normalizeDestination(shipment.destination)}XX`);
    }
    
    return parts.join('');
  }

  private buildShpSegment(shipper: Party, consigneeCountry: string, awb: string, version: FwbVersion, agencyPostalCode?: string): string {
    const name = normalize(shipper.name, 35, true);
    const address = normalize(shipper.address.street, 35, true);
    const city = shipper.address.place.toUpperCase();
    const country = shipper.address.countryCode.toUpperCase();
    // Usar código postal de agencia como fallback si el shipper no tiene
    let postalCode = getPostalCode(shipper.address.postalCode, country, agencyPostalCode);
    
    // Caso especial Ecuador → China
    const awbPrefix = getAwbPrefix(awb);
    if (country === 'EC' && (consigneeCountry === 'CN' || awbPrefix === '992' || awbPrefix === '176')) {
      postalCode = getChinaPostalCode();
    }
    
    let result = '';
    if (version === 'FWB/17') {
      result = `SHP\nNAM/${name}\nADR/${address}\nLOC/${city}\n/${country}/${postalCode}`;
    } else {
      result = `SHP\n/${name}\n/${address}\n/${city}\n/${country}/${postalCode}`;
    }
    
    // Teléfono si existe
    if (shipper.contact?.number) {
      result += `/TE/${shipper.contact.number.replace(/\s/g, '')}`;
    }
    
    return result;
  }

  private buildCneSegment(consignee: Party, version: FwbVersion, agencyPostalCode?: string): string {
    const name = normalize(consignee.name, 35, true);
    const address = normalize(consignee.address.street, 35, true);
    const city = consignee.address.place.toUpperCase();
    const country = consignee.address.countryCode.toUpperCase();
    const state = consignee.address.state?.toUpperCase() || '';
    // Usar código postal de agencia como fallback si el consignee no tiene
    const postalCode = getPostalCode(consignee.address.postalCode, country, agencyPostalCode);
    
    let cityLine = city;
    if (country === 'US' && state) {
      cityLine = `${city}/${state}`;
    }
    
    let result = `CNE\n/${name}\n/${address}\n/${cityLine}\n/${country}/${postalCode}`;
    
    // Teléfono si existe
    if (consignee.contact?.number) {
      result += `/TE/${consignee.contact.number.replace(/\s/g, '')}`;
    }
    
    return result;
  }

  private buildAgtSegment(shipment: InternalShipment): string {
    const iata = shipment.agent.iataCode;
    const cass = shipment.agent.cassCode || '';
    const name = normalize(shipment.agent.name, 35, true);
    const city = shipment.agent.place.toUpperCase();
    
    return `AGT//${iata}/${cass}\n/${name}\n/${city}`;
  }

  private buildSsrSegment(shipment: InternalShipment): string {
    if (!shipment.specialServiceRequest) return '';
    
    const lines = normalize(shipment.specialServiceRequest, 195, true)
      .split('\n')
      .filter(l => l.trim())
      .slice(0, 3);
    
    if (lines.length === 0) return '';
    
    return 'SSR/' + lines.map(l => normalize(l, 65, false, false)).join('\n/');
  }

  private buildCvdSegment(shipment: InternalShipment): string {
    const currency = shipment.currency;
    const wtOt = this.calculateWtOt(shipment);
    const declCarriage = shipment.declaredValueCarriage || 'NVD';
    const declCustoms = shipment.declaredValueCustoms || 'NCV';
    const declInsurance = 'XXX';
    
    return `CVD/${currency}//${wtOt}/${declCarriage}/${declCustoms}/${declInsurance}`;
  }

  private calculateWtOt(shipment: InternalShipment): string {
    // PP = todo prepaid, CC = todo collect, PC/CP = mixto
    // Peso: depende de paymentMethod principal
    // Otros cargos: depende de si hay otherCharges con paymentMethod diferente
    
    const weightIsPrepaid = shipment.paymentMethod === 'Prepaid';
    
    // Verificar si hay otros cargos con método diferente al principal
    let hasCollectOtherCharges = false;
    let hasPrepaidOtherCharges = false;
    
    if (shipment.otherCharges && shipment.otherCharges.length > 0) {
      shipment.otherCharges.forEach(charge => {
        if (charge.paymentMethod === 'Collect') hasCollectOtherCharges = true;
        if (charge.paymentMethod === 'Prepaid') hasPrepaidOtherCharges = true;
      });
    }
    
    // Determinar WT_OT
    if (weightIsPrepaid) {
      // Peso es Prepaid
      if (hasCollectOtherCharges && !hasPrepaidOtherCharges) {
        return 'PC'; // Weight Prepaid, Others Collect
      }
      return 'PP'; // Todo Prepaid
    } else {
      // Peso es Collect
      if (hasPrepaidOtherCharges && !hasCollectOtherCharges) {
        return 'CP'; // Weight Collect, Others Prepaid
      }
      return 'CC'; // Todo Collect
    }
  }

  private buildRtdSegment(shipment: InternalShipment, policy: AirlinePolicy): string {
    const lines: string[] = [];
    const policyOption = policy.policy % 10;
    
    shipment.rates.forEach((rate, idx) => {
      let line = `RTD/${idx + 1}/P${rate.pieces}`;
      line += `/K${formatNumber(rate.weight)}`;
      line += `/C${this.mapRateClass(rate.rateClassCode)}`;
      
      if (rate.commodityCode && /^\d+$/.test(rate.commodityCode)) {
        line += `/S${rate.commodityCode.padStart(4, '0').substring(0, 4)}`;
      }
      
      if (rate.chargeableWeight) {
        line += `/W${formatNumber(rate.chargeableWeight)}`;
      }
      
      // Rate y Total: si policyOption >= 1, forzar R0.0/T0.0 si están vacíos
      if (policyOption >= 1) {
        const rateValue = rate.rateOrCharge ? formatNumber(rate.rateOrCharge, 2) : '0.0';
        const totalValue = rate.total ? formatNumber(rate.total, 2) : '0.0';
        line += `/R${rateValue}/T${totalValue}`;
      }
      
      lines.push(line);
    });
    
    return lines.join('\n');
  }

  private mapRateClass(rateClass: string): string {
    // Mapear valores largos a códigos cortos
    const mapping: Record<string, string> = {
      'QUANTITY_RATE': 'Q',
      'NORMAL_RATE': 'N',
      'MINIMUM_CHARGE': 'M',
      'SPECIFIC_COMMODITY_RATE': 'C',
      'BASIC_CHARGE': 'B'
    };
    
    if (rateClass.length === 1) return rateClass;
    return mapping[rateClass] || 'Q';
  }

  private buildNgSegment(shipment: InternalShipment, policy: AirlinePolicy): string {
    const awbPrefix = getAwbPrefix(shipment.awbNumber);
    
    // Caso especial LATAM (985, 145)
    if (awbPrefix === '985' || awbPrefix === '145') {
      const firstRate = shipment.rates[0];
      const commodityCode = firstRate?.commodityCode || '';
      
      if (shipment.hasHouses) {
        // Consolidados LATAM: siempre /NC/
        if (commodityCode === '0609' || commodityCode === '609') {
          return '/NC/CONSOLIDATE FLOWERS';
        }
        const description = this.getNatureOfGoods(shipment, policy);
        return `/NC/${description}`;
      }
      
      // Directas LATAM: NG/CUT FLOWERS (no FRESHPERISH)
      return '/NG/CUT FLOWERS';
    }
    
    // Resto de aerolíneas
    const description = this.getNatureOfGoods(shipment, policy);
    
    // Consolidados (con houses/HAWBs): usar /NC/ (Nature of goods - Consolidated)
    // Directos (sin houses): usar /NG/ (Nature of Goods)
    if (shipment.hasHouses) {
      return `/NC/${description}`;
    }
    return `/NG/${description}`;
  }

  private getNatureOfGoods(shipment: InternalShipment, policy: AirlinePolicy): string {
    if (shipment.goodsDescriptionOverride) {
      return normalize(shipment.goodsDescriptionOverride, 20, true);
    }
    if (shipment.description) {
      return normalize(shipment.description, 20, true);
    }
    return 'FRESHPERISH';
  }

  /**
   * Construye el segmento NH (Harmonized System Codes)
   * 
   * Formato:
   *   /2/NH/060311
   *   /3/NH/060312
   */
  private buildNhSegment(shipment: InternalShipment): string {
    const htsCodes: string[] = [];
    const lines: string[] = [];
    let nextLineNumber = 2; // Comienza en 2 (después de RTD que es línea 1)
    
    // 1. Primero buscar en rates del master
    shipment.rates.forEach(rate => {
      if (rate.hsCodes) {
        htsCodes.push(...rate.hsCodes);
      } else if (rate.hsCode) {
        htsCodes.push(rate.hsCode);
      }
    });
    
    // 2. Para consolidados: también recolectar de las houses
    if (shipment.hasHouses && shipment.houseBills && shipment.houseBills.length > 0) {
      shipment.houseBills.forEach(house => {
        if (house.htsCodes && house.htsCodes.length > 0) {
          htsCodes.push(...house.htsCodes);
        }
      });
    }
    
    if (htsCodes.length === 0) return '';
    
    // Generar líneas NH (eliminar duplicados)
    const uniqueCodes = [...new Set(htsCodes)];
    uniqueCodes.forEach((code) => {
      lines.push(`/${nextLineNumber}/NH/${code}`);
      nextLineNumber++;
    });
    
    return lines.join('\n');
  }

  /**
   * Obtiene el siguiente número de línea después de NH (para NV y NS)
   */
  private getNextLineNumberAfterNh(shipment: InternalShipment): number {
    const htsCodes: string[] = [];
    
    shipment.rates.forEach(rate => {
      if (rate.hsCodes) {
        htsCodes.push(...rate.hsCodes);
      } else if (rate.hsCode) {
        htsCodes.push(rate.hsCode);
      }
    });
    
    if (shipment.hasHouses && shipment.houseBills && shipment.houseBills.length > 0) {
      shipment.houseBills.forEach(house => {
        if (house.htsCodes && house.htsCodes.length > 0) {
          htsCodes.push(...house.htsCodes);
        }
      });
    }
    
    const uniqueCodes = [...new Set(htsCodes)];
    return 2 + uniqueCodes.length; // 2 es el inicio, + cantidad de NH
  }

  /**
   * Construye el segmento NV (Volume en metros cúbicos)
   * Para consolidados: suma volumeCubicMeters de houses, o usa volume del master
   * Para directos: usa el volume del shipment
   * 
   * Formato: /X/NV/MC0.0018 (hasta 4 decimales para valores pequeños)
   */
  private buildNvSegment(shipment: InternalShipment): string {
    let totalVolume = 0;
    
    if (shipment.hasHouses && shipment.houseBills && shipment.houseBills.length > 0) {
      // CONSOLIDADO: Sumar volumen de cada house
      shipment.houseBills.forEach((house, idx) => {
        // Usar volumeCubicMeters o volume (fallback para datos del backend)
        const vol = house.volumeCubicMeters ?? house.volume ?? 0;
        console.log(`[NV Debug] House ${idx}: volumeCubicMeters=${house.volumeCubicMeters}, volume=${house.volume}, using=${vol}`);
        if (vol > 0) {
          totalVolume += vol;
        }
      });
      
      // Si ningún house tiene volumen, usar el volumen del master
      if (totalVolume <= 0 && shipment.volume && shipment.volume > 0) {
        totalVolume = shipment.volume;
        console.log(`[NV Debug] No volume in houses, using master volume: ${totalVolume}`);
      }
    } else {
      // DIRECTO: Usar volume del shipment
      totalVolume = shipment.volume ?? 0;
      console.log(`[NV Debug] Direct shipment, using master volume: ${totalVolume}`);
    }
    
    console.log(`[NV Debug] Total volume: ${totalVolume}`);
    
    // Solo agregar NV si hay volumen > 0
    if (totalVolume <= 0) return '';
    
    const lineNumber = this.getNextLineNumberAfterNh(shipment);
    
    // Siempre 2 decimales, mínimo 0.01
    const volume2d = Math.max(totalVolume, 0.01);
    return `/${lineNumber}/NV/MC${formatNumber(volume2d, 2)}`;
  }

  /**
   * Construye el segmento NS (SLAC - Shipper Load and Count)
   * Solo para consolidados - muestra las piezas del master
   * 
   * Formato: /X/NS/148
   */
  private buildNsSegment(shipment: InternalShipment): string {
    // Solo para consolidados
    if (!shipment.hasHouses || !shipment.pieces || shipment.pieces <= 0) {
      return '';
    }
    
    // Calcular posición después de NV (si existe)
    let lineNumber = this.getNextLineNumberAfterNh(shipment);
    
    // Si hay volumen (de houses o del master), NV ocupa una línea antes de NS
    let totalVolume = 0;
    if (shipment.houseBills && shipment.houseBills.length > 0) {
      shipment.houseBills.forEach(house => {
        const vol = house.volumeCubicMeters ?? house.volume ?? 0;
        if (vol > 0) {
          totalVolume += vol;
        }
      });
    }
    // Fallback al volumen del master
    if (totalVolume <= 0 && shipment.volume && shipment.volume > 0) {
      totalVolume = shipment.volume;
    }
    
    if (totalVolume > 0) {
      lineNumber++;
    }
    
    return `/${lineNumber}/NS/${shipment.pieces}`;
  }

  private buildOthSegment(shipment: InternalShipment): string {
    if (!shipment.otherCharges || shipment.otherCharges.length === 0) return '';
    
    const lines: string[] = ['OTH'];
    
    shipment.otherCharges.forEach(charge => {
      const pc = charge.paymentMethod === 'Prepaid' ? 'P' : 'C';
      lines.push(`/${pc}/${charge.code}${formatNumber(charge.amount, 2)}`);
    });
    
    return lines.join('\n');
  }

  private buildChargeSummary(shipment: InternalShipment, type: 'PPD' | 'COL'): string {
    if (shipment.chargeSummaryOverride) {
      const cs = shipment.chargeSummaryOverride;
      let result = `${type}`;
      if (cs.totalWeightCharge) result += `/WT${cs.totalWeightCharge}`;
      if (cs.totalOtherChargesDueAgent) result += `\n/OA${cs.totalOtherChargesDueAgent}`;
      if (cs.totalOtherChargesDueCarrier) result += `/OC${cs.totalOtherChargesDueCarrier}`;
      result += `/CT${cs.chargeSummaryTotal}`;
      return result;
    }
    
    // Calcular totales
    let totalWeight = 0;
    let totalDueAgent = 0;
    let totalDueCarrier = 0;
    
    shipment.rates.forEach(rate => {
      totalWeight += rate.total || 0;
    });
    
    if (shipment.otherCharges) {
      shipment.otherCharges.forEach(charge => {
        if (charge.entitlement === 'DueAgent') {
          totalDueAgent += charge.amount;
        } else {
          totalDueCarrier += charge.amount;
        }
      });
    }
    
    const total = totalWeight + totalDueAgent + totalDueCarrier;
    
    let result = `${type}/WT${formatNumber(totalWeight, 2)}`;
    if (totalDueAgent > 0 || totalDueCarrier > 0) {
      result += `\n/OA${formatNumber(totalDueAgent, 2)}/OC${formatNumber(totalDueCarrier, 2)}`;
    }
    result += `/CT${formatNumber(total, 2)}`;
    
    return result;
  }

  /**
   * Construye el segmento CER (Certification)
   * Para Emirates (176) y otras aerolíneas con useAgencyNameForCER, usa nombre de agencia
   */
  private buildCerSegment(shipment: InternalShipment, policy: AirlinePolicy): string {
    let signature: string;
    
    // Si la política indica usar nombre de agencia (Emirates 176)
    if (policy.useAgencyNameForCER) {
      signature = normalize(shipment.agent.name || getDefaultSignature(), 20, true);
    } else {
      // Usar firma del shipment o default de configuración
      signature = normalize(shipment.signature || getDefaultSignature(), 20, true);
    }
    
    return `CER/${signature}`;
  }

  /**
   * Construye el segmento ISU (Carrier's Execution)
   */
  private buildIsuSegment(shipment: InternalShipment, policy?: AirlinePolicy): string {
    const date = formatDate(shipment.executionDate);
    const place = (shipment.executionPlace || shipment.origin).toUpperCase();
    
    // Usar firma del shipment o default de configuración
    let signature: string;
    if (policy?.useAgencyNameForCER) {
      signature = normalize(shipment.agent.name || getDefaultSignature(), 20, true);
    } else {
      signature = normalize(shipment.signature || getDefaultSignature(), 20, true);
    }
    
    return `ISU/${date}/${place}/${signature}`;
  }

  private buildRefSegment(shipment: InternalShipment): string {
    const iata = shipment.agent.iataCode;
    const cass = shipment.agent.cassCode || '';
    const origin = shipment.origin.toUpperCase();
    
    return `REF///AGT/${iata}${cass}/${origin}`;
  }

  private buildSphSegment(shipment: InternalShipment, policy: AirlinePolicy): string {
    const codes = this.getSphCodes(shipment, policy);
    return `SPH/${codes.join('/')}`;
  }

  private getSphCodes(shipment: InternalShipment, policy: AirlinePolicy): string[] {
    if (shipment.specialHandlingCodes && shipment.specialHandlingCodes.length > 0) {
      return shipment.specialHandlingCodes;
    }
    return policy.defaultSphCodes;
  }

  private buildOciSegment(shipment: InternalShipment, policy: AirlinePolicy): string {
    const consigneeCountry = shipment.consignee.address.countryCode.toUpperCase();
    const shipperCountry = shipment.shipper.address.countryCode.toUpperCase();
    const consigneeTin = shipment.consignee.taxId || shipment.consignee.accountNumber || '';
    
    // Sin Tax ID del consignatario → no generar línea OCI (campo opcional)
    if (!consigneeTin.trim()) return '';
    
    const cleanTin = consigneeTin.replace(/\s/g, '');
    
    // US y CA no usan prefijo EORI, tampoco Ecuador origen
    const noEoriPrefix = shipperCountry === 'EC' || consigneeCountry === 'US' || consigneeCountry === 'CA';
    
    return noEoriPrefix
      ? `OCI/${consigneeCountry}/CNE/T/${cleanTin}`
      : `OCI/${consigneeCountry}/CNE/T/EORI${cleanTin}`;
  }

  /**
   * Construye el segmento ACC (Accounting Information)
   * Formato EDI: ACC/[identifier]/[accountingInfo]
   * Múltiples líneas ACC si hay más de una entrada
   */
  private buildAccSegment(shipment: InternalShipment): string {
    if (!shipment.accounting || shipment.accounting.length === 0) {
      return '';
    }

    const lines: string[] = [];
    for (const acc of shipment.accounting) {
      // Mapear identifier a código corto EDI si es necesario
      let identifierCode = acc.identifier || 'GEN';
      // Mapeo de identificadores largos a códigos cortos
      const identifierMap: Record<string, string> = {
        'GovernmentBillOfLading': 'GBL',
        'CreditCardNumber': 'CC',
        'CreditCardExpiryDate': 'CCE',
        'CreditCardIssuanceName': 'CCN',
        'GeneralInformation': 'GEN',
        'ModeOfSettlement': 'MOS',
        'ShippersReferenceNumber': 'SRN'
      };
      identifierCode = identifierMap[identifierCode] || identifierCode.substring(0, 3).toUpperCase();
      
      const info = normalize(acc.accountingInformation || '', 34, true);
      if (info) {
        lines.push(`ACC/${identifierCode}/${info}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Construye el segmento NFY (Notify Party)
   * Formato EDI según FWB/16-17:
   * NFY/[name]
   * /[street]
   * /[city]/[state]/[country]/[postalCode]
   * /[contactId][contactNumber]
   */
  private buildNfySegment(shipment: InternalShipment): string {
    if (!shipment.alsoNotify) {
      return '';
    }

    const notify = shipment.alsoNotify;
    const parts: string[] = [];
    
    // Línea 1: Nombre
    const name = normalize(notify.name || '', 35, true);
    if (!name) return '';
    
    parts.push(`NFY/${name}`);
    
    // Línea 2: Nombre adicional (opcional)
    if (notify.name2) {
      parts.push(`/${normalize(notify.name2, 35, true)}`);
    }
    
    // Línea 3: Dirección
    if (notify.address) {
      const street = normalize(notify.address.street || '', 35, true);
      if (street) {
        parts.push(`/${street}`);
      }
      if (notify.address.street2) {
        parts.push(`/${normalize(notify.address.street2, 35, true)}`);
      }
    }
    
    // Línea 4: Ciudad/Estado/País/CP
    if (notify.address) {
      const city = normalize(notify.address.place || '', 17, true);
      const state = notify.address.state || '';
      const country = notify.address.countryCode || '';
      const postal = notify.address.postalCode || '';
      
      if (city || country) {
        parts.push(`/${city}/${state}/${country}/${postal}`);
      }
    }
    
    // Línea 5: Contacto (opcional)
    if (notify.contact && notify.contact.number) {
      const contactId = notify.contact.identifier || 'TE';
      const number = normalize(notify.contact.number, 25, true);
      parts.push(`/${contactId}${number}`);
    }
    
    return parts.join('\n');
  }

  private buildFwbFooter(policy?: AirlinePolicy): string {
    // Type B no usa footer EDIFACT
    if (policy?.useTypeBHeader) {
      return '';
    }
    const controlNumber = getControlNumber();
    return `'UNT+3+${controlNumber}'UNZ+1+${controlNumber}'`;
  }

  private getCountryFromAirport(airportCode: string): string {
    const mapping: Record<string, string> = {
      'BOG': 'CO', 'MDE': 'CO', 'CLO': 'CO', 'CTG': 'CO',
      'UIO': 'EC', 'GYE': 'EC',
      'MIA': 'US', 'JFK': 'US', 'LAX': 'US',
      'AMS': 'NL', 'FRA': 'DE', 'MAD': 'ES', 'CDG': 'FR', 'LHR': 'GB'
    };
    return mapping[airportCode.toUpperCase()] || 'CO';
  }

  // ============================================================
  // CONSTRUCCIÓN DE SEGMENTOS FHL
  // ============================================================

  /**
   * Verifica si un segmento FHL está habilitado según la política
   * Por defecto todos están habilitados si no hay configuración específica
   */
  private isFhlSegmentEnabled(segType: FhlSegmentType, policy: AirlinePolicy): boolean {
    // Si hay lista de deshabilitados, verificar que no esté ahí
    if (policy.disabledFhlSegments && policy.disabledFhlSegments.length > 0 && policy.disabledFhlSegments.includes(segType)) {
      return false;
    }
    
    // Si hay lista de habilitados con elementos, verificar que esté ahí
    if (policy.enabledFhlSegments && policy.enabledFhlSegments.length > 0) {
      return policy.enabledFhlSegments.includes(segType);
    }
    
    // Por defecto, todos los segmentos FHL están habilitados
    return true;
  }

  /**
   * Construye los segmentos FHL para una house bill
   * @param shipment Master AWB data
   * @param house House bill data
   * @param policy Política de aerolínea
   * @param version Versión FHL
   * @param forceIncludeHeader Forzar inclusión de header EDIFACT (true para Caso 7)
   */
  private buildFhlSegments(
    shipment: InternalShipment, 
    house: InternalHouseBill, 
    policy: AirlinePolicy, 
    version: FhlVersion,
    forceIncludeHeader: boolean = false
  ): GeneratedSegment[] {
    const segments: GeneratedSegment[] = [];
    const includeHeader = forceIncludeHeader || policy.fhlAlwaysWithHeader || 
                          (policy.includeUnbUnz && (policy.policy % 10) < 2);
    
    // FHL Header con o sin EDIFACT según política
    const isFhlEnabled = this.isFhlSegmentEnabled('FHL', policy);
    if (includeHeader) {
      const headerContent = this.buildFhlEdifactHeader(shipment, policy, version);
      segments.push(this.createFhlSegment('FHL', headerContent, 1, isFhlEnabled, []));
    } else {
      segments.push(this.createFhlSegment('FHL', version, 1, isFhlEnabled, []));
    }
    
    // MBI - Master Bill Info
    const mbiContent = this.buildMbiSegment(shipment);
    const isMbiEnabled = this.isFhlSegmentEnabled('MBI', policy);
    segments.push(this.createFhlSegment('MBI', mbiContent, 2, isMbiEnabled, [
      { name: 'awbNumber', value: normalizeAwbNumber(shipment.awbNumber), originalValue: normalizeAwbNumber(shipment.awbNumber), maxLength: 11, required: true, modified: false },
      { name: 'origin', value: shipment.origin, originalValue: shipment.origin, maxLength: 3, required: true, modified: false },
      { name: 'destination', value: shipment.destination, originalValue: shipment.destination, maxLength: 3, required: true, modified: false }
    ]));
    
    // HBS - House Bill Summary
    const hbsContent = this.buildHbsSegment(house, shipment, policy);
    const isHbsEnabled = this.isFhlSegmentEnabled('HBS', policy);
    segments.push(this.createFhlSegment('HBS', hbsContent, 3, isHbsEnabled, [
      { name: 'hawbNumber', value: house.hawbNumber, originalValue: house.hawbNumber, maxLength: 20, required: true, modified: false },
      { name: 'pieces', value: house.pieces.toString(), originalValue: house.pieces.toString(), maxLength: 5, required: true, modified: false },
      { name: 'weight', value: formatNumber(house.weight), originalValue: formatNumber(house.weight), maxLength: 10, required: true, modified: false }
    ]));
    
    // TXT - Free Text (Nature of Goods completa, sin códigos HS que van en HTS)
    const isTxtEnabled = this.isFhlSegmentEnabled('TXT', policy);
    const rawNature = normalize(house.natureOfGoods, 70, true, false) || '';
    // Limpiar: quitar todo desde "HS" en adelante (ej: "FRESH CUT FLOWERS PERISHABLE HS 060311" → "FRESH CUT FLOWERS PERISHABLE")
    const fullNatureOfGoods = rawNature.replace(/\s*HS\s*.*/i, '').trim();
    const slacSuffix = house.pieces ? ` SLAC-${house.pieces}` : '';
    const txtContent = fullNatureOfGoods ? `TXT/${fullNatureOfGoods}${slacSuffix}` : '';
    segments.push(this.createFhlSegment('TXT', txtContent, 4, isTxtEnabled && !!txtContent, []));
    
    // HTS - Harmonized codes (si existen y está habilitado)
    const isHtsEnabled = this.isFhlSegmentEnabled('HTS', policy);
    if (house.htsCodes && house.htsCodes.length > 0) {
      const htsContent = `HTS/${house.htsCodes[0]}`;
      segments.push(this.createFhlSegment('HTS', htsContent, 5, isHtsEnabled, []));
    } else {
      segments.push(this.createFhlSegment('HTS', '', 5, false, []));
    }
    
    // OCI
    const ociContent = this.buildFhlOciSegment(house, shipment, policy);
    const isOciEnabled = this.isFhlSegmentEnabled('OCI', policy) && !!ociContent;
    segments.push(this.createFhlSegment('OCI', ociContent, 6, isOciEnabled, []));
    
    // SHP - Shipper de la house
    const shpContent = this.buildFhlShpSegment(house, shipment, policy);
    const isShpEnabled = this.isFhlSegmentEnabled('SHP', policy);
    segments.push(this.createFhlSegment('SHP', shpContent, 7, isShpEnabled, []));
    
    // CNE - Consignee de la house
    const cneContent = this.buildFhlCneSegment(house, shipment, policy);
    const isCneEnabled = this.isFhlSegmentEnabled('CNE', policy);
    segments.push(this.createFhlSegment('CNE', cneContent, 8, isCneEnabled, []));
    
    // CVD
    const cvdContent = `CVD/${shipment.currency}/PP/NVD/NCV/XXX`;
    const isCvdEnabled = this.isFhlSegmentEnabled('CVD', policy);
    segments.push(this.createFhlSegment('CVD', cvdContent, 9, isCvdEnabled, []));
    
    // Footer (solo si incluye header EDIFACT y no es Type B)
    const isFtrEnabled = this.isFhlSegmentEnabled('FTR', policy) && !policy.useTypeBHeader;
    if (includeHeader && !policy.useTypeBHeader) {
      segments.push(this.createFhlSegment('FTR', this.buildFwbFooter(policy), 10, isFtrEnabled, []));
    } else {
      segments.push(this.createFhlSegment('FTR', '', 10, false, []));
    }
    
    return segments;
  }

  /**
   * Construye header EDIFACT para FHL según legacy
   * UNB+IATA:1+{SENDER}+{AIRLINE}+{DATETIME}+{CONTROL}+0++L'UNH+{CONTROL}+CIMFHL:{VERSION}'FHL/{VERSION}
   * 
   * Para Type B:
   *   {PRIORITY}{CARRIER}
   *   .{ORIGIN}{SENDER_ADDRESS}
   *   FHL/{VERSION}
   */
  private buildFhlEdifactHeader(shipment: InternalShipment, policy: AirlinePolicy, version: FhlVersion): string {
    // Si usa Type B, construir header Type B (sin EDIFACT envelope)
    if (policy.useTypeBHeader) {
      return this.buildTypeBHeaderFhl(shipment, policy, version);
    }
    
    // Usar Sender ID fijo de configuración (no depende del país del shipper)
    const senderId = getSenderId();
    const controlNumber = getControlNumber();
    // Prioridad: routing del shipment, luego policy
    const airlineAddress = shipment.routing?.recipientAddress || policy.airlineAddress || 'AIRLINE_ADDRESS';
    const versionNumber = version.replace('FHL/', '');
    
    return `UNB+IATA:1+${senderId}+${airlineAddress}:PIMA+${formatDateTime()}+${controlNumber}+0++L'UNH+${controlNumber}+CIMFHL:${versionNumber}'${version}`;
  }

  /**
   * Construye header Type B para FHL
   * Formato IATA: {Priority} {DestFFCC}\n.{SenderAddress} [{DDHHmm}]\n{version}
   * 
   * El destinatario (PIMA) se obtiene en orden de prioridad:
   * Descartes Universal Header:
   *   - DSGUNXA = Recipient fijo (Descartes enruta automáticamente)
   *   - DSGTPXA = Prefijo sender fijo
   */
  private buildTypeBHeaderFhl(shipment: InternalShipment, policy: AirlinePolicy, version: FhlVersion): string {
    const typeBConfig = this.getTypeBConfig();
    const priority = policy.typeBPriority || typeBConfig.defaultPriority;
    
    // Valores fijos de Descartes
    const recipientAddress = typeBConfig.recipientAddress || 'DSGUNXA';
    const senderPrefix = typeBConfig.senderPrefix || 'DSGTPXA';
    const originAddress = typeBConfig.originAddress || 'TDVAGT03OPERFLOR/BOG1';
    const includeTimestamp = typeBConfig.includeTimestamp ?? true;
    
    // Línea 2: .DSGTPXA DDHHmm OriginAddress
    let originLine = `.${senderPrefix}`;
    if (includeTimestamp) {
      const now = new Date();
      const timestamp = String(now.getUTCDate()).padStart(2, '0') +
                        String(now.getUTCHours()).padStart(2, '0') +
                        String(now.getUTCMinutes()).padStart(2, '0');
      originLine += ` ${timestamp}`;
    }
    originLine += ` ${originAddress}`;
    
    return `${priority} ${recipientAddress}\n${originLine}\n${version}`;
  }

  /**
   * Construye segmentos FHL para Caso 8 (MBI opcional según índice)
   */
  private buildFhlSegmentsCase8(
    shipment: InternalShipment, 
    house: InternalHouseBill, 
    policy: AirlinePolicy, 
    version: FhlVersion,
    includeMBI: boolean
  ): GeneratedSegment[] {
    const segments: GeneratedSegment[] = [];
    
    // Caso 8: NO incluye FHL header por cada HAWB (ya se puso al inicio)
    // Solo HBS sin MBI a partir de la segunda HAWB
    
    // MBI - Solo si es la primera HAWB
    if (includeMBI) {
      const mbiContent = this.buildMbiSegment(shipment);
      segments.push(this.createFhlSegment('MBI', mbiContent, 1, true, []));
    }
    
    // HBS - House Bill Summary (siempre presente)
    const hbsContent = this.buildHbsSegment(house, shipment, policy);
    segments.push(this.createFhlSegment('HBS', hbsContent, 2, true, []));
    
    // TXT - Free Text (Nature of Goods completa, sin códigos HS que van en HTS)
    const rawNature = normalize(house.natureOfGoods, 70, true, false) || '';
    // Limpiar: quitar todo desde "HS" en adelante (ej: "FRESH CUT FLOWERS PERISHABLE HS 060311" → "FRESH CUT FLOWERS PERISHABLE")
    const fullNatureOfGoods = rawNature.replace(/\s*HS\s*.*/i, '').trim();
    const slacSuffix = house.pieces ? ` SLAC-${house.pieces}` : '';
    const txtContent = fullNatureOfGoods ? `TXT/${fullNatureOfGoods}${slacSuffix}` : '';
    if (txtContent) {
      segments.push(this.createFhlSegment('TXT', txtContent, 3, true, []));
    }
    
    // HTS - Harmonized codes (si existen)
    if (house.htsCodes && house.htsCodes.length > 0) {
      const htsContent = `HTS/${house.htsCodes[0]}`;
      segments.push(this.createFhlSegment('HTS', htsContent, 4, true, []));
    }
    
    // OCI
    const ociContent = this.buildFhlOciSegment(house, shipment, policy);
    if (ociContent) {
      segments.push(this.createFhlSegment('OCI', ociContent, 5, true, []));
    }
    
    // SHP - Shipper de la house
    const shpContent = this.buildFhlShpSegment(house, shipment, policy);
    segments.push(this.createFhlSegment('SHP', shpContent, 6, true, []));
    
    // CNE - Consignee de la house
    const cneContent = this.buildFhlCneSegment(house, shipment, policy);
    segments.push(this.createFhlSegment('CNE', cneContent, 7, true, []));
    
    // CVD
    const cvdContent = `CVD/${shipment.currency}/PP/NVD/NCV/XXX`;
    segments.push(this.createFhlSegment('CVD', cvdContent, 8, true, []));
    
    // Caso 8: NO incluye footer EDIFACT por HAWB
    
    return segments;
  }

  /**
   * Ensambla mensaje FHL sin el header FHL/4 (para Caso 8)
   */
  private assembleFhlMessageWithoutHeader(segments: GeneratedSegment[]): string {
    return segments
      .filter(seg => seg.enabled && seg.content)
      .sort((a, b) => a.order - b.order)
      .map(seg => seg.content)
      .join('\n') + '\n';
  }

  private createFhlSegment(
    type: FhlSegmentType,
    content: string,
    order: number,
    enabled: boolean,
    fields: GeneratedField[]
  ): GeneratedSegment {
    const segInfo = FHL_SEGMENTS[type];
    const errors: string[] = [];
    
    // Guardar contenido original si excede el límite máximo
    const originalContent = content.length > segInfo.maxLength ? content : undefined;
    
    // Agregar error automático si excede el límite
    if (content.length > segInfo.maxLength) {
      errors.push(`Excede límite: ${content.length}/${segInfo.maxLength} caracteres (${content.length - segInfo.maxLength} de más)`);
    }
    
    return {
      type,
      code: type,
      name: segInfo.name,
      content,
      originalContent,
      order,
      enabled,
      editable: !['FHL', 'FTR', 'MBI'].includes(type),
      currentLength: content.length,
      maxLength: segInfo.maxLength,
      errors,
      warnings: [],
      fields
    };
  }

  private buildMbiSegment(shipment: InternalShipment): string {
    // MBI usa formato: PREFIJO-NUMERO (ej: 992-56984125)
    // El AWB debe tener el formato correcto: 3 dígitos prefijo + guión + 8 dígitos
    const awb = formatAwbForMbi(shipment.awbNumber);
    const origin = shipment.origin.toUpperCase();
    const destination = normalizeDestination(shipment.destination);
    return `MBI/${awb}${origin}${destination}/T${shipment.pieces}K${formatNumber(shipment.weight, 0)}`;
  }

  /**
   * Construye segmento HBS (House Bill Summary)
   * Formato FHL/2: HBS/HAWB/ORIG-DEST/piezas/Kpeso/descrip
   * Formato FHL/4: HBS/HAWB/ORIG-DEST/piezas/Kpeso/SLAC/descrip
   * 
   * NOTA: La descripción completa (natureOfGoods) se envía en el segmento TXT.
   * En HBS se usa "CUT FLOWERS" fijo (máx 11 chars).
   * SLAC = Shipper's Load And Count, mismo valor que las piezas.
   */
  private buildHbsSegment(house: InternalHouseBill, shipment: InternalShipment, policy: AirlinePolicy): string {
    const origin = (house.origin || shipment.origin).toUpperCase();
    const destination = normalizeDestination(house.destination || shipment.destination);
    // Descripción fija en HBS - la descripción completa va en TXT
    const natureOfGoods = 'CUT FLOWERS';
    
    // Normalizar HAWB: sin guiones y con prefijos especiales (CM, SK, LG → 0CM, 0SK, 0LG)
    const hawbPrefixes = policy.hawbPrefixAdd0 || ['CM', 'SK', 'LG'];
    let hawbNumber = normalizeHawbForMessage(house.hawbNumber);
    hawbNumber = normalizeHawbNumber(hawbNumber, hawbPrefixes);
    
    // FHL/4: incluir SLAC (piezas) entre peso y descripción
    // FHL/2: separador simple
    const slac = house.pieces.toString();
    
    return `HBS/${hawbNumber}/${origin}${destination}/${house.pieces}/K${formatNumber(house.weight)}/${slac}/${natureOfGoods}`;
  }

  private buildFhlOciSegment(house: InternalHouseBill, shipment: InternalShipment, policy: AirlinePolicy): string {
    const consignee = house.consignee || shipment.consignee;
    const consigneeCountry = consignee.address?.countryCode?.toUpperCase() || 'US';
    const consigneeTin = consignee.taxId || consignee.accountNumber || '';
    
    // Sin Tax ID del consignatario → no generar línea OCI (campo opcional)
    if (!consigneeTin || !consigneeTin.trim()) return '';
    
    const shipperCountry = (house.shipper || shipment.shipper).address?.countryCode?.toUpperCase() || 'CO';
    const cleanTin = consigneeTin.replace(/\s/g, '');
    
    // US y CA no usan prefijo EORI, tampoco Ecuador origen ni policies sin prefijo
    const noEoriPrefix = shipperCountry === 'EC' || consigneeCountry === 'US' || consigneeCountry === 'CA' || policy.ociFormat === 'withoutPrefix';
    
    return noEoriPrefix
      ? `OCI/${consigneeCountry}/CNE/T/${cleanTin}`
      : `OCI/${consigneeCountry}/CNE/T/EORI${cleanTin}`;
  }

  /**
   * Construye segmento SHP para FHL según documentación legacy
   */
  private buildFhlShpSegment(house: InternalHouseBill, shipment: InternalShipment, policy: AirlinePolicy): string {
    const shipper = house.shipper || { 
      name: house.shipperName, 
      address: shipment.shipper.address 
    };
    
    const name = normalize(shipper.name || house.shipperName, 35, true);
    const address = normalize(shipper.address?.street || '', 35, true);
    const city = (shipper.address?.place || '').toUpperCase();
    const country = (shipper.address?.countryCode || 'CO').toUpperCase();
    
    // Código postal: usar agencia como fallback si el shipper de la house no tiene
    const agencyPostalCode = shipment.agent?.address?.postalCode;
    let postalCode = getPostalCode(shipper.address?.postalCode, country, agencyPostalCode);
    
    // Caso especial Ecuador → China (AWB 176 - Air China) usa código configurable
    if (policy.requiresChinaPostalCode && country === 'EC') {
      const consigneeCountry = (house.consignee || shipment.consignee).address?.countryCode?.toUpperCase() || '';
      const awbPrefix = getAwbPrefix(shipment.awbNumber);
      if (consigneeCountry === 'CN' || awbPrefix === '992' || awbPrefix === '176') {
        postalCode = getChinaPostalCode();
      }
    }
    
    // Código postal puede quedar vacío (ej: /CO/)
    const postalSuffix = postalCode ? postalCode : '';
    return `SHP/${name}\n/${address}\n/${city}\n/${country}/${postalSuffix}`;
  }

  /**
   * Construye segmento CNE para FHL según documentación legacy
   */
  private buildFhlCneSegment(house: InternalHouseBill, shipment: InternalShipment, policy: AirlinePolicy): string {
    const consignee = house.consignee || {
      name: house.consigneeName,
      address: shipment.consignee.address
    };
    
    const name = normalize(consignee.name || house.consigneeName, 35, true);
    const address = normalize(consignee.address?.street || '', 35, true);
    const city = (consignee.address?.place || '').toUpperCase();
    const country = (consignee.address?.countryCode || 'US').toUpperCase();
    const state = consignee.address?.state?.toUpperCase() || '';
    
    // Código postal con validación de longitud (máx 9 chars)
    let postalCode = consignee.address?.postalCode || '';
    if (postalCode.length > 9) {
      postalCode = postalCode.substring(0, 9);
    }
    if (!postalCode) {
      postalCode = '10'; // Default según legacy
    }
    
    // Ciudad con estado para USA
    let cityLine = city;
    if (country === 'US' && state) {
      cityLine = `${city}/${state}`;
    }
    
    // Construir línea base
    let result = `CNE/${name}\n/${address}\n/${cityLine}\n/${country}/${postalCode}`;
    
    // Agregar teléfono si existe (formato: /TE/número)
    const phone = consignee.contact?.number;
    if (phone) {
      result += `/TE/${phone.replace(/\s/g, '')}`;
    }
    
    return result;
  }

  // ============================================================
  // ENSAMBLADO DE MENSAJE
  // ============================================================

  private assembleMessage(segments: GeneratedSegment[], policy: AirlinePolicy): string {
    return segments
      .filter(seg => seg.enabled && seg.content)
      .sort((a, b) => a.order - b.order)
      .map(seg => seg.content)
      .join('\n');
  }

  private assembleFhlMessage(segments: GeneratedSegment[]): string {
    return segments
      .filter(seg => seg.enabled && seg.content)
      .sort((a, b) => a.order - b.order)
      .map(seg => seg.content)
      .join('\n');
  }

  // ============================================================
  // MÉTODOS PÚBLICOS DE UTILIDAD
  // ============================================================

  /**
   * Obtiene todos los segmentos disponibles para FWB
   */
  getAllFwbSegments(): typeof FWB_SEGMENTS {
    return FWB_SEGMENTS;
  }

  /**
   * Obtiene todos los segmentos disponibles para FHL
   */
  getAllFhlSegments(): typeof FHL_SEGMENTS {
    return FHL_SEGMENTS;
  }

  /**
   * Obtiene todas las políticas de aerolíneas
   */
  getAllAirlinePolicies(): typeof DEFAULT_AIRLINE_POLICIES {
    return DEFAULT_AIRLINE_POLICIES;
  }

  /**
   * Actualiza un segmento con nuevo contenido
   */
  updateSegment(segment: GeneratedSegment, newContent: string): GeneratedSegment {
    return {
      ...segment,
      content: newContent,
      currentLength: newContent.length,
      errors: newContent.length > segment.maxLength ? [`Excede límite de ${segment.maxLength} caracteres`] : []
    };
  }

  /**
   * Regenera el mensaje completo a partir de segmentos editados
   */
  regenerateMessage(segments: GeneratedSegment[], policy: AirlinePolicy): string {
    return this.assembleMessage(segments, policy);
  }
}

// Instancia singleton
export const cargoImpService = new CargoImpService();
export default cargoImpService;
