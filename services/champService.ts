
import { 
  InternalShipment, 
  Party,
  loadConnectorConfig,
  ConnectorConfig
} from '../types';

import { getApiConfig, getTransmissionEnvironment, UAT_CONFIG } from './traxonApiClient';

// ============================================================
// ENUMS OFICIALES DE TRAXON cargoJSON API
// ============================================================
// Estos son los valores exactos que acepta la API de Traxon
// Documentación: http://cargohub.ignorelist.com/json2/

// Función para obtener configuración actual
let cachedConfig: ConnectorConfig | null = null;
let configLastLoad = 0;
const CONFIG_CACHE_TTL = 5000; // 5 segundos de cache

function getConfig(): ConnectorConfig {
  const now = Date.now();
  if (!cachedConfig || (now - configLastLoad) > CONFIG_CACHE_TTL) {
    cachedConfig = loadConnectorConfig();
    configLastLoad = now;
  }
  return cachedConfig;
}

// WeightUnit Enum
const TRAXON_WEIGHT_UNIT = {
  KILOGRAM: 'KILOGRAM',
  POUND: 'POUND'
} as const;

// VolumeUnit Enum (según documentación oficial cargoJSON)
const TRAXON_VOLUME_UNIT = {
  CUBIC_CENTIMETRE: 'CUBIC_CENTIMETRE',
  CUBIC_FOOT: 'CUBIC_FOOT',  // Corregido: singular según doc oficial
  CUBIC_INCH: 'CUBIC_INCH',
  CUBIC_METRE: 'CUBIC_METRE'
} as const;

// LengthUnit Enum
const TRAXON_LENGTH_UNIT = {
  CENTIMETRE: 'CENTIMETRE',
  INCH: 'INCH',
  FOOT: 'FOOT',
  METRE: 'METRE'
} as const;

// ChargeCode Enum - Valores oficiales Traxon API
// IMPORTANTE: NO existe 'ALL_CHARGES_PREPAID' simple, debe incluir método de pago
const TRAXON_CHARGE_CODE = {
  // Collect (cobrar en destino)
  ALL_CHARGES_COLLECT: 'ALL_CHARGES_COLLECT',
  ALL_CHARGES_COLLECT_BY_CREDIT_CARD: 'ALL_CHARGES_COLLECT_BY_CREDIT_CARD',
  ALL_CHARGES_COLLECT_BY_GBL: 'ALL_CHARGES_COLLECT_BY_GBL',
  // Prepaid (prepagado) - REQUIERE sufijo de método de pago
  ALL_CHARGES_PREPAID_CASH: 'ALL_CHARGES_PREPAID_CASH',
  ALL_CHARGES_PREPAID_CREDIT: 'ALL_CHARGES_PREPAID_CREDIT',  // ← USADO por defecto para Prepaid (crédito)
  ALL_CHARGES_PREPAID_BY_CREDIT_CARD: 'ALL_CHARGES_PREPAID_BY_CREDIT_CARD',
  ALL_CHARGES_PREPAID_BY_GBL: 'ALL_CHARGES_PREPAID_BY_GBL',
  // Destination Collect
  DESTINATION_COLLECT_CASH: 'DESTINATION_COLLECT_CASH',
  DESTINATION_COLLECT_CREDIT: 'DESTINATION_COLLECT_CREDIT',
  DESTINATION_COLLECT_BY_MCO: 'DESTINATION_COLLECT_BY_MCO',
  // Sin cargo / Sin peso
  NO_CHARGE: 'NO_CHARGE',
  NO_WEIGHT_CHARGE_OTHER_CHARGES_COLLECT: 'NO_WEIGHT_CHARGE_OTHER_CHARGES_COLLECT',
  NO_WEIGHT_CHARGE_OTHER_CHARGES_PREPAID_CREDIT: 'NO_WEIGHT_CHARGE_OTHER_CHARGES_PREPAID_CREDIT'
} as const;

// PaymentCondition Enum
const TRAXON_PAYMENT_CONDITION = {
  Prepaid: 'Prepaid',
  Collect: 'Collect'
} as const;

// RateClassCode Enum (según documentación oficial cargoJSON)
const TRAXON_RATE_CLASS_CODE = {
  BASIC_CHARGE: 'BASIC_CHARGE',
  CLASS_RATE_REDUCTION: 'CLASS_RATE_REDUCTION',
  CLASS_RATE_SURCHARGE: 'CLASS_RATE_SURCHARGE',
  INTERNATIONAL_PRIORITY_SERVICE_RATE: 'INTERNATIONAL_PRIORITY_SERVICE_RATE',
  MINIMUM_CHARGE: 'MINIMUM_CHARGE',
  NORMAL_RATE: 'NORMAL_RATE',
  QUANTITY_RATE: 'QUANTITY_RATE',
  RATE_PER_KILOGRAM: 'RATE_PER_KILOGRAM',
  SPECIFIC_COMMODITY_RATE: 'SPECIFIC_COMMODITY_RATE',
  UNIT_LOAD_DEVICE_ADDITIONAL_INFORMATION: 'UNIT_LOAD_DEVICE_ADDITIONAL_INFORMATION',
  UNIT_LOAD_DEVICE_ADDITIONAL_RATE: 'UNIT_LOAD_DEVICE_ADDITIONAL_RATE',
  UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE: 'UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE',
  UNIT_LOAD_DEVICE_DISCOUNT: 'UNIT_LOAD_DEVICE_DISCOUNT'
} as const;

// ServiceCode Enum (según documentación oficial cargoJSON)
const TRAXON_SERVICE_CODE = {
  AIRPORT_TO_AIRPORT: 'AIRPORT_TO_AIRPORT',
  DOOR_TO_AIRPORT: 'DOOR_TO_AIRPORT',
  AIRPORT_TO_DOOR: 'AIRPORT_TO_DOOR',
  DOOR_TO_DOOR_SERVICE: 'DOOR_TO_DOOR_SERVICE'  // Corregido según doc oficial
} as const;

// EntitlementCode Enum
const TRAXON_ENTITLEMENT_CODE = {
  Agent: 'Agent',
  Carrier: 'Carrier'
} as const;

// ShipmentDescriptionCode Enum
const TRAXON_SHIPMENT_DESCRIPTION_CODE = {
  DIVIDED_CONSIGNMENT: 'DIVIDED_CONSIGNMENT',
  PARTIAL_CONSIGNMENT: 'PARTIAL_CONSIGNMENT',
  SPLIT_SHIPMENT: 'SPLIT_SHIPMENT',
  TOTAL_CONSIGNMENT: 'TOTAL_CONSIGNMENT'
} as const;

// DensityGroup Enum
const TRAXON_DENSITY_GROUP = {
  KG60_PER_CUBICMETRE: 'KG60_PER_CUBICMETRE',
  KG90_PER_CUBICMETRE: 'KG90_PER_CUBICMETRE',
  KG120_PER_CUBICMETRE: 'KG120_PER_CUBICMETRE',
  KG160_PER_CUBICMETRE: 'KG160_PER_CUBICMETRE',
  KG220_PER_CUBICMETRE: 'KG220_PER_CUBICMETRE',
  KG250_PER_CUBICMETRE: 'KG250_PER_CUBICMETRE',
  KG300_PER_CUBICMETRE: 'KG300_PER_CUBICMETRE',
  KG400_PER_CUBICMETRE: 'KG400_PER_CUBICMETRE',
  KG600_PER_CUBICMETRE: 'KG600_PER_CUBICMETRE',
  KG950_PER_CUBICMETRE: 'KG950_PER_CUBICMETRE'
} as const;

// ParticipantAddressType Enum
const TRAXON_PARTICIPANT_ADDRESS_TYPE = {
  PIMA: 'PIMA',
  SITA: 'SITA',
  OTHER: 'OTHER'
} as const;

// ParticipantType Enum (para participantIdentifier)
const TRAXON_PARTICIPANT_TYPE = {
  AGT: 'AGT',  // Agent
  AIR: 'AIR',  // Airline
  CNE: 'CNE',  // Consignee
  CTM: 'CTM',  // Customs
  FFW: 'FFW',  // Freight Forwarder
  GHA: 'GHA',  // Ground Handling Agent
  SHP: 'SHP'   // Shipper
} as const;

// SpecialHandlingAndDangerousGoodsCode Enum (códigos más comunes)
const TRAXON_SPH_CODES = {
  ACT: 'ACT',   // Active Temperature Control
  AVI: 'AVI',   // Live Animals
  BIG: 'BIG',   // Outsized
  CAO: 'CAO',   // Cargo Aircraft Only
  COL: 'COL',   // Cool Goods
  DGR: 'DGR',   // Dangerous Goods
  EAP: 'EAP',   // e-freight AWB Printed
  EAT: 'EAT',   // Foodstuffs
  EAW: 'EAW',   // e-freight AWB
  ECC: 'ECC',   // Subject to Quota
  FRI: 'FRI',   // Fragile
  HEA: 'HEA',   // Heavy Cargo
  HUM: 'HUM',   // Human Remains
  ICE: 'ICE',   // Dry Ice
  PEA: 'PEA',   // Hunting Trophies / Animal Skins
  PEM: 'PEM',   // Hatching Eggs
  PEP: 'PEP',   // Fruits / Vegetables
  PER: 'PER',   // Perishable Cargo
  PES: 'PES',   // Live Tropical Fish
  PIL: 'PIL',   // Pharmaceuticals
  RFL: 'RFL',   // Flowers
  SPF: 'SPF',   // Secure - Protected Freight
  SPX: 'SPX',   // Secure - Examined
  VAL: 'VAL',   // Valuable Cargo
  VUN: 'VUN'    // Vulnerable Cargo
} as const;

// CustomsSecurityAndRegulatoryControlInformationIdentifier Enum (OCI controlInformation)
const TRAXON_OCI_CONTROL_INFO = {
  ACCOUNT_CONSIGNOR: 'ACCOUNT_CONSIGNOR',
  AUTHORISED_ECONOMIC_OPERATOR: 'AUTHORISED_ECONOMIC_OPERATOR',
  AUTOMATED_BROKER_INTERFACE: 'AUTOMATED_BROKER_INTERFACE',
  CERTIFICATE_NUMBER: 'CERTIFICATE_NUMBER',
  CUSTOMS_SECURITY_BLOCK: 'CUSTOMS_SECURITY_BLOCK',
  DANGEROUS_GOODS: 'DANGEROUS_GOODS',
  DECLARATION_IDENTIFICATION: 'DECLARATION_IDENTIFICATION',
  EXEMPTION_LEGEND: 'EXEMPTION_LEGEND',
  EXPIRY_DATE: 'EXPIRY_DATE',
  FACILITIES_INFORMATION: 'FACILITIES_INFORMATION',
  INVOICE_NUMBER: 'INVOICE_NUMBER',
  ITEM_NUMBER: 'ITEM_NUMBER',
  KNOWN_CONSIGNOR: 'KNOWN_CONSIGNOR',
  LICENSE_IDENTIFICATION: 'LICENSE_IDENTIFICATION',
  MOVEMENT_REFERENCE_NUMBER: 'MOVEMENT_REFERENCE_NUMBER',
  PACKING_LIST_NUMBER: 'PACKING_LIST_NUMBER',
  REGULATED_AGENT: 'REGULATED_AGENT',
  REGULATED_CARRIER: 'REGULATED_CARRIER',
  SCREENING_METHOD: 'SCREENING_METHOD',
  SEAL_NUMBER: 'SEAL_NUMBER',
  SECURITY_STATUS: 'SECURITY_STATUS',
  SECURITY_STATUS_DATE_AND_TIME: 'SECURITY_STATUS_DATE_AND_TIME',
  SECURITY_STATUS_NAME_OF_ISSUER: 'SECURITY_STATUS_NAME_OF_ISSUER',
  SECURITY_TEXTUAL_STATEMENT: 'SECURITY_TEXTUAL_STATEMENT',
  SYSTEM_DOWNTIME_REFERENCE: 'SYSTEM_DOWNTIME_REFERENCE',
  TRADER_IDENTIFICATION_NUMBER: 'TRADER_IDENTIFICATION_NUMBER',
  UNIQUE_CONSIGNMENT_REFERENCE_NUMBER: 'UNIQUE_CONSIGNMENT_REFERENCE_NUMBER'
} as const;

// DataElementGroupIdentifier Enum (OCI informationIdentifier)
const TRAXON_OCI_INFO_IDENTIFIER = {
  ACC: 'ACC',  // Account Consignor
  ISS: 'ISS',  // Security Status Issuer
  IMP: 'IMP',  // Import
  EXP: 'EXP',  // Export
  TRA: 'TRA',  // Transit
  SHP: 'SHP',  // Shipper
  CNE: 'CNE',  // Consignee
  AGT: 'AGT'   // Agent
} as const;

// ============================================================
// CONSTANTES DE AEROLÍNEAS (Prefijos AWB)
// ============================================================
const AIRLINE_PREFIXES = {
  LATAM: ['145', '985'],
  IBERIA: ['075'],
  EMIRATES: ['176'],
  KLM: ['074'],
  TURKISH: ['235'],
  ATLAS: ['369'],
  SAUDIA: ['992'],
  QATAR: ['157']
} as const;

// ============================================================
// MAPEO: Código de Aeropuerto → Código ISO de País
// Para el campo isoCountryCode de OCI (requiere 2 letras ISO país)
// ============================================================
const AIRPORT_TO_COUNTRY: Record<string, string> = {
  // Colombia
  'BOG': 'CO', 'MDE': 'CO', 'CLO': 'CO', 'CTG': 'CO', 'BAQ': 'CO', 'RNG': 'CO', 'RCH': 'CO', 'PEI': 'CO', 'BGA': 'CO',
  // Estados Unidos
  'MIA': 'US', 'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'DFW': 'US', 'ATL': 'US', 'IAH': 'US', 'EWR': 'US', 'SFO': 'US',
  // Europa
  'MAD': 'ES', 'BCN': 'ES', 'AMS': 'NL', 'FRA': 'DE', 'LHR': 'GB', 'CDG': 'FR', 'FCO': 'IT', 'MXP': 'IT', 'LIS': 'PT',
  'BRU': 'BE', 'ZRH': 'CH', 'VIE': 'AT', 'CPH': 'DK', 'OSL': 'NO', 'ARN': 'SE', 'HEL': 'FI',
  // Medio Oriente
  'DXB': 'AE', 'DOH': 'QA', 'JED': 'SA', 'RUH': 'SA', 'IST': 'TR', 'TLV': 'IL',
  // Asia
  'HKG': 'HK', 'SIN': 'SG', 'NRT': 'JP', 'HND': 'JP', 'ICN': 'KR', 'PVG': 'CN', 'PEK': 'CN', 'BKK': 'TH',
  // Latinoamérica
  'GRU': 'BR', 'GIG': 'BR', 'EZE': 'AR', 'SCL': 'CL', 'LIM': 'PE', 'UIO': 'EC', 'GYE': 'EC', 'CCS': 'VE',
  'MEX': 'MX', 'GDL': 'MX', 'PTY': 'PA', 'SJO': 'CR', 'SAL': 'SV', 'TGU': 'HN', 'MGA': 'NI', 'GUA': 'GT',
  // Caribe
  'SJU': 'PR', 'SDQ': 'DO', 'HAV': 'CU', 'KIN': 'JM', 'NAS': 'BS',
  // Canadá
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA'
};

/**
 * Obtiene el código ISO de país (2 letras) a partir del código de aeropuerto
 * @param airportCode Código IATA del aeropuerto (ej: "BOG")
 * @returns Código ISO del país (ej: "CO"), o el mismo código si no se encuentra
 */
const getCountryFromAirport = (airportCode: string): string => {
  if (!airportCode) return 'XX';
  const normalized = airportCode.toUpperCase().trim();
  // Si ya es un código de país de 2 letras, retornarlo
  if (normalized.length === 2) return normalized;
  // Buscar en el mapeo
  return AIRPORT_TO_COUNTRY[normalized] || normalized.substring(0, 2);
};

// Special Handling Codes por aerolínea - AHORA USA CONFIGURACIÓN DINÁMICA
// El fallback estático se usa solo si no hay configuración guardada
const getSpbByAirline = (awbPrefix: string): string[] => {
  const config = getConfig();
  return config.sphByAirline[awbPrefix] || config.sphByAirline['DEFAULT'] || [TRAXON_SPH_CODES.EAP];
};

// ============================================================
// MAPEO: Códigos Legacy → Valores Enum Traxon
// ============================================================

// OCI Control Information: Abreviaciones legacy → Enum Traxon
const OCI_CONTROL_INFO_MAP: Record<string, string> = {
  // Abreviaciones comunes del sistema legacy
  'RA': TRAXON_OCI_CONTROL_INFO.REGULATED_AGENT,
  'KC': TRAXON_OCI_CONTROL_INFO.KNOWN_CONSIGNOR,
  'AO': TRAXON_OCI_CONTROL_INFO.AUTHORISED_ECONOMIC_OPERATOR,
  'AEO': TRAXON_OCI_CONTROL_INFO.AUTHORISED_ECONOMIC_OPERATOR,
  'SM': TRAXON_OCI_CONTROL_INFO.SCREENING_METHOD,
  'SS': TRAXON_OCI_CONTROL_INFO.SECURITY_STATUS,
  'ED': TRAXON_OCI_CONTROL_INFO.EXPIRY_DATE,
  'SN': TRAXON_OCI_CONTROL_INFO.SEAL_NUMBER,
  'MRN': TRAXON_OCI_CONTROL_INFO.MOVEMENT_REFERENCE_NUMBER,
  'CN': TRAXON_OCI_CONTROL_INFO.CERTIFICATE_NUMBER,
  'DG': TRAXON_OCI_CONTROL_INFO.DANGEROUS_GOODS,
  'IN': TRAXON_OCI_CONTROL_INFO.INVOICE_NUMBER,
  'PL': TRAXON_OCI_CONTROL_INFO.PACKING_LIST_NUMBER,
  'RC': TRAXON_OCI_CONTROL_INFO.REGULATED_CARRIER,
  'TIN': TRAXON_OCI_CONTROL_INFO.TRADER_IDENTIFICATION_NUMBER,
  'UCR': TRAXON_OCI_CONTROL_INFO.UNIQUE_CONSIGNMENT_REFERENCE_NUMBER,
  'AC': TRAXON_OCI_CONTROL_INFO.ACCOUNT_CONSIGNOR,
  'SPX': TRAXON_OCI_CONTROL_INFO.SECURITY_STATUS, // SPX es un status
  // Valores completos (pasar directo)
  ...Object.fromEntries(Object.values(TRAXON_OCI_CONTROL_INFO).map(v => [v, v]))
};

// Rate Class Code: Códigos legacy IATA (Q, M, N, etc.) → Enum Traxon oficial
const RATE_CLASS_CODE_MAP: Record<string, string> = {
  'B': TRAXON_RATE_CLASS_CODE.BASIC_CHARGE,
  'R': TRAXON_RATE_CLASS_CODE.CLASS_RATE_REDUCTION,
  'S': TRAXON_RATE_CLASS_CODE.CLASS_RATE_SURCHARGE,
  'E': TRAXON_RATE_CLASS_CODE.INTERNATIONAL_PRIORITY_SERVICE_RATE,
  'M': TRAXON_RATE_CLASS_CODE.MINIMUM_CHARGE,
  'N': TRAXON_RATE_CLASS_CODE.NORMAL_RATE,
  'Q': TRAXON_RATE_CLASS_CODE.QUANTITY_RATE,
  'K': TRAXON_RATE_CLASS_CODE.RATE_PER_KILOGRAM,
  'C': TRAXON_RATE_CLASS_CODE.SPECIFIC_COMMODITY_RATE,
  'X': TRAXON_RATE_CLASS_CODE.UNIT_LOAD_DEVICE_ADDITIONAL_INFORMATION,
  'Y': TRAXON_RATE_CLASS_CODE.UNIT_LOAD_DEVICE_ADDITIONAL_RATE,
  'U': TRAXON_RATE_CLASS_CODE.UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE,
  'W': TRAXON_RATE_CLASS_CODE.UNIT_LOAD_DEVICE_DISCOUNT,
  // Valores completos (pasar directo)
  ...Object.fromEntries(Object.values(TRAXON_RATE_CLASS_CODE).map(v => [v, v]))
};

// Weight Unit: Legacy → Traxon
const WEIGHT_UNIT_MAP: Record<string, string> = {
  'K': TRAXON_WEIGHT_UNIT.KILOGRAM,
  'KG': TRAXON_WEIGHT_UNIT.KILOGRAM,
  'L': TRAXON_WEIGHT_UNIT.POUND,
  'LB': TRAXON_WEIGHT_UNIT.POUND,
  'KILOGRAM': TRAXON_WEIGHT_UNIT.KILOGRAM,
  'POUND': TRAXON_WEIGHT_UNIT.POUND
};

// Volume Unit: Legacy → Traxon (corregido CUBIC_FOOT singular)
const VOLUME_UNIT_MAP: Record<string, string> = {
  'MC': TRAXON_VOLUME_UNIT.CUBIC_METRE,
  'CC': TRAXON_VOLUME_UNIT.CUBIC_CENTIMETRE,
  'CF': TRAXON_VOLUME_UNIT.CUBIC_FOOT,
  'CI': TRAXON_VOLUME_UNIT.CUBIC_INCH,
  'CUBIC_METRE': TRAXON_VOLUME_UNIT.CUBIC_METRE,
  'CUBIC_CENTIMETRE': TRAXON_VOLUME_UNIT.CUBIC_CENTIMETRE,
  'CUBIC_FOOT': TRAXON_VOLUME_UNIT.CUBIC_FOOT,
  'CUBIC_FEET': TRAXON_VOLUME_UNIT.CUBIC_FOOT,  // Alias para compatibilidad
  'CUBIC_INCH': TRAXON_VOLUME_UNIT.CUBIC_INCH
};

// ============================================================
// FUNCIONES DE NORMALIZACIÓN (Legacy → Traxon Enum)
// ============================================================

/**
 * Normaliza el código de control de OCI al formato Traxon
 */
const normalizeOciControlInfo = (controlInfo: string): string => {
  const normalized = controlInfo.toUpperCase().trim();
  return OCI_CONTROL_INFO_MAP[normalized] || normalized;
};

/**
 * Normaliza el código de clase de tarifa al formato Traxon
 */
const normalizeRateClassCode = (rateClassCode: string): string => {
  const normalized = rateClassCode.toUpperCase().trim();
  return RATE_CLASS_CODE_MAP[normalized] || TRAXON_RATE_CLASS_CODE.QUANTITY_RATE;
};

/**
 * Normaliza la unidad de peso al formato Traxon
 */
const normalizeWeightUnit = (unit: string): string => {
  const normalized = unit.toUpperCase().trim();
  return WEIGHT_UNIT_MAP[normalized] || TRAXON_WEIGHT_UNIT.KILOGRAM;
};

/**
 * Normaliza la unidad de volumen al formato Traxon
 */
const normalizeVolumeUnit = (unit: string): string => {
  const normalized = unit.toUpperCase().trim();
  return VOLUME_UNIT_MAP[normalized] || TRAXON_VOLUME_UNIT.CUBIC_METRE;
};

// Length Unit: Legacy → Traxon
const LENGTH_UNIT_MAP: Record<string, string> = {
  'CM': TRAXON_LENGTH_UNIT.CENTIMETRE,
  'IN': TRAXON_LENGTH_UNIT.INCH,
  'M': TRAXON_LENGTH_UNIT.METRE,
  'CENTIMETRE': TRAXON_LENGTH_UNIT.CENTIMETRE,
  'INCH': TRAXON_LENGTH_UNIT.INCH,
  'METRE': TRAXON_LENGTH_UNIT.METRE
};

/**
 * Normaliza la unidad de longitud al formato Traxon
 */
const normalizeLengthUnit = (unit: string): string => {
  const normalized = unit.toUpperCase().trim();
  return LENGTH_UNIT_MAP[normalized] || TRAXON_LENGTH_UNIT.CENTIMETRE;
};

/**
 * Normaliza el código de Other Charge a 2 letras según Traxon API
 * 
 * IMPORTANTE (Feedback Traxon - 2024-12-23):
 * El otherChargeCode debe ser de 2 letras. La 3ra letra (A/C) que se ve en 
 * el AWB de papel indica Agent/Carrier y se transmite por separado en entitlementCode.
 * 
 * Ejemplos de normalización:
 * - "AWC" → "AW" (la C indica Carrier, va en entitlementCode)
 * - "AWA" → "AW" (la A indica Agent, va en entitlementCode)
 * - "FCC" → "FC"
 * - "AW"  → "AW" (ya está correcto)
 * 
 * También detecta si la 3ra letra indica el entitlement para casos donde
 * el backend envía código de 3 letras.
 */
const normalizeOtherChargeCode = (code: string): { chargeCode: string; inferredEntitlement?: 'Agent' | 'Carrier' } => {
  if (!code) return { chargeCode: '' };
  
  const normalized = code.toUpperCase().trim();
  
  // Si ya es de 2 letras, retornar tal cual
  if (normalized.length === 2) {
    return { chargeCode: normalized };
  }
  
  // Si es de 3 letras, la última letra puede indicar A (Agent) o C (Carrier)
  if (normalized.length === 3) {
    const baseCode = normalized.substring(0, 2);
    const suffix = normalized.charAt(2);
    
    // Detectar entitlement de la 3ra letra
    if (suffix === 'A') {
      return { chargeCode: baseCode, inferredEntitlement: 'Agent' };
    } else if (suffix === 'C') {
      return { chargeCode: baseCode, inferredEntitlement: 'Carrier' };
    }
    
    // Si la 3ra letra no es A ni C, aún así usar solo 2 letras
    return { chargeCode: baseCode };
  }
  
  // Cualquier otro caso, tomar primeras 2 letras
  return { chargeCode: normalized.substring(0, 2) };
};

/**
 * Generador de ID compatible (Fallback para crypto.randomUUID)
 */
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Construye array de OCI incluyendo automáticamente información según país de origen
 * AHORA USA CONFIGURACIÓN DINÁMICA del panel de configuración
 * 
 * FORMATOS SOPORTADOS:
 * 1. LEGACY (tinOciFormat='legacy'): 
 *    - ISS + TRADER_IDENTIFICATION_NUMBER + "CNE/T/EORI" o "SHP/T/EORI" + NIT/EORI
 *    - Ejemplo: { isoCountryCode: "NL", informationIdentifier: "ISS", controlInformation: "TRADER_IDENTIFICATION_NUMBER", additionalControlInformation: "CNE/T/EORI", supplementaryControlInformation: "123456789" }
 * 
 * 2. STANDARD (tinOciFormat='standard'):
 *    - SHP o CNE + TRADER_IDENTIFICATION_NUMBER + NIT/RUC
 *    - Ejemplo: { isoCountryCode: "CO", informationIdentifier: "SHP", controlInformation: "TRADER_IDENTIFICATION_NUMBER", supplementaryControlInformation: "901234567-1" }
 */
const buildOciWithColombiaRules = (
  existingOci: Array<{ countryCode: string; infoIdentifier: string; controlInfo: string; additionalControlInfo?: string; supplementaryControlInfo?: string }> | undefined,
  shipper: Party,
  consignee: Party,
  airportOrigin: string,  // Código de aeropuerto (ej: BOG)
  airportDestination?: string  // Código de aeropuerto destino (ej: MIA)
): Array<any> | undefined => {
  const config = getConfig();
  
  // Convertir códigos de aeropuerto a códigos de país ISO
  const countryOrigin = getCountryFromAirport(airportOrigin);
  const countryDestination = airportDestination ? getCountryFromAirport(airportDestination) : undefined;
  
  // Obtener país del shipper y consignee desde su address.countryCode
  const shipperCountry = shipper.address?.countryCode || countryOrigin;
  const consigneeCountry = consignee.address?.countryCode || countryDestination || countryOrigin;
  
  // Array de OCI resultante
  let ociArray: Array<any> = [];
  
  // ============================================================
  // CONSIGNEE/IMPORTER TIN - Formato legacy: AGT/T/NIT
  // isoCountryCode = país del CONSIGNEE/IMPORTER
  // ESTE ES EL DEFAULT - Se envía solo si tiene taxId
  // ============================================================
  const includeConsigneeTIN = config.includeConsigneeTIN ?? true;  // true por defecto
  if (includeConsigneeTIN && consignee.taxId) {
    ociArray.push({
      isoCountryCode: consigneeCountry,
      informationIdentifier: 'AGT',
      additionalControlInformation: 'T',
      supplementaryControlInformation: cleanString(consignee.taxId, 35)
    });
  }
  
  // ============================================================
  // SHIPPER/EXPORTER TIN - Formato legacy: AGT/T/NIT (OPCIONAL)
  // isoCountryCode = país del SHIPPER
  // Solo se envía si está habilitado Y tiene taxId
  // ============================================================
  if (config.includeShipperTIN && shipper.taxId) {
    ociArray.push({
      isoCountryCode: shipperCountry,
      informationIdentifier: 'AGT',
      additionalControlInformation: 'T',
      supplementaryControlInformation: cleanString(shipper.taxId, 35)
    });
  }
  
  // ============================================================
  // OCI adicionales del backend (si vienen)
  // ============================================================
  if (existingOci && existingOci.length > 0) {
    existingOci.forEach(o => {
      const isoCountry = getCountryFromAirport(o.countryCode);
      const oci: any = {
        isoCountryCode: isoCountry,
        informationIdentifier: o.infoIdentifier
      };
      // Solo agregar campos opcionales si tienen valor
      if (o.additionalControlInfo) {
        oci.additionalControlInformation = o.additionalControlInfo;
      }
      if (o.supplementaryControlInfo) {
        oci.supplementaryControlInformation = o.supplementaryControlInfo;
      }
      ociArray.push(oci);
    });
  }
  
  // ============================================================
  // OCI DE SEGURIDAD (configurados por el usuario en el panel)
  // Solo se envían si están habilitados y tienen valor
  // Formato: AGT (igual que los TIN) para consistencia
  // ============================================================
  const securityOci = (config as any).securityOci;
  if (securityOci?.enabled) {
    // RA - Regulated Agent: Número de certificado
    // Usa AGT como informationIdentifier (igual que TIN)
    if (securityOci.regulatedAgentNumber) {
      ociArray.push({
        isoCountryCode: countryOrigin,
        informationIdentifier: 'AGT',
        additionalControlInformation: 'RA',
        supplementaryControlInformation: securityOci.regulatedAgentNumber
      });
    }
    
    // ED - Expiry Date: Fecha de expiración del certificado (MMYY)
    if (securityOci.expiryDate) {
      ociArray.push({
        additionalControlInformation: 'ED',
        supplementaryControlInformation: securityOci.expiryDate
      });
    }
    
    // SM - Screening Method: Método de screening (XRY, EDS, VCK, ETD)
    if (securityOci.screeningMethod) {
      ociArray.push({
        additionalControlInformation: 'SM',
        supplementaryControlInformation: securityOci.screeningMethod
      });
    }
    
    // SD - Screening Date: Fecha/hora del screening (DDMMMYYHHmm)
    if (securityOci.screeningDate) {
      ociArray.push({
        additionalControlInformation: 'SD',
        supplementaryControlInformation: securityOci.screeningDate
      });
    }
    
    // SN - Screener Name: Nombre del responsable
    if (securityOci.screenerName) {
      ociArray.push({
        additionalControlInformation: 'SN',
        supplementaryControlInformation: securityOci.screenerName
      });
    }
  }
  
  return ociArray.length > 0 ? ociArray : undefined;
};

/**
 * Limpieza estricta de strings según reglas de Traxon API
 * Remueve: puntos, guiones, comas, slash, #, ñ, acentos, paréntesis, comillas, &, @
 * Solo permite: letras A-Z, números 0-9, espacios
 */
const cleanString = (str: string | undefined, maxLength: number, defaultValue: string = ""): string => {
  if (!str || str.trim() === "") return defaultValue;
  // Normaliza y quita acentos
  const normalized = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Reemplaza ñ/Ñ por N
  const noEnie = normalized.replace(/[ñÑ]/g, "N");
  // Solo permite A-Z, 0-9 y espacios - todo lo demás se elimina
  const cleaned = noEnie.replace(/[^A-Za-z0-9\s]/g, "").toUpperCase();
  // Normaliza espacios múltiples a uno solo
  const singleSpaces = cleaned.replace(/\s+/g, " ").trim();
  return singleSpaces.substring(0, maxLength);
};

/**
 * Sanea y formatea el goodsDescription según reglas de Traxon
 * 
 * REGLAS (Feedback Traxon 2024-12-23):
 * 1. Máximo 25 caracteres por línea
 * 2. Usar \n para saltos de línea
 * 3. NO incluir códigos HS (van en harmonisedCommodityCode)
 * 4. Quitar espacios innecesarios y formateo decorativo
 * 5. Solo A-Z, 0-9, espacios
 * 
 * @param description - Descripción original del backend
 * @param maxTotalLength - Longitud máxima total (default 150 chars = ~6 líneas)
 * @returns Descripción saneada con saltos de línea cada 25 chars
 */
export const sanitizeGoodsDescription = (description: string | undefined, maxTotalLength: number = 150): string => {
  if (!description || description.trim() === "") return "";
  
  // Paso 1: Limpiar caracteres especiales y normalizar
  const normalized = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const noEnie = normalized.replace(/[ñÑ]/g, "N");
  
  // Paso 2: Remover códigos HS (patrones como "HS 0603110000" o "HS0603110000" o solo "0603110000")
  // Patrón: HS seguido de espacio opcional y 6-10 dígitos
  const noHsCodes = noEnie.replace(/\bHS\s*\d{6,10}\b/gi, "");
  // También remover códigos numéricos largos que parecen HS (6-10 dígitos seguidos)
  const noLongNumbers = noHsCodes.replace(/\b\d{6,10}\b/g, "");
  
  // Paso 3: Solo permitir A-Z, 0-9 y espacios
  const cleaned = noLongNumbers.replace(/[^A-Za-z0-9\s]/g, "").toUpperCase();
  
  // Paso 4: Normalizar espacios múltiples
  const singleSpaces = cleaned.replace(/\s+/g, " ").trim();
  
  // Paso 5: Si está vacío después de limpiar, retornar vacío
  if (singleSpaces.length === 0) return "";
  
  // Paso 6: Dividir en líneas de máximo 25 caracteres
  const words = singleSpaces.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  
  for (const word of words) {
    // Si la palabra sola es mayor a 25 chars, cortarla
    if (word.length > 25) {
      // Guardar línea actual si tiene contenido
      if (currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = "";
      }
      // Cortar palabra en pedazos de 25
      for (let i = 0; i < word.length; i += 25) {
        lines.push(word.substring(i, i + 25));
      }
      continue;
    }
    
    // Si agregar la palabra excede 25 chars, nueva línea
    if (currentLine.length + word.length + 1 > 25) {
      if (currentLine.length > 0) {
        lines.push(currentLine.trim());
      }
      currentLine = word;
    } else {
      currentLine = currentLine.length > 0 ? currentLine + " " + word : word;
    }
  }
  
  // Agregar última línea
  if (currentLine.length > 0) {
    lines.push(currentLine.trim());
  }
  
  // Paso 7: Unir con \n y limitar longitud total
  const result = lines.join("\n");
  return result.substring(0, maxTotalLength);
};

/**
 * Limpia el número de House Waybill (HAWB)
 * Remueve caracteres especiales, guiones, espacios
 * Solo permite letras A-Z y números 0-9
 * Máximo 12 caracteres según Traxon API
 */
const cleanHawbNumber = (hawb: string | undefined): string => {
  if (!hawb || hawb.trim() === "") return "";
  // Quita acentos
  const normalized = hawb.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Solo letras y números, sin espacios, guiones ni caracteres especiales
  const cleaned = normalized.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  // Máximo 12 caracteres
  return cleaned.substring(0, 12);
};

/**
 * Normaliza códigos HTS (Harmonised Tariff Schedule) según reglas legacy
 * 
 * El sistema legacy usaba dsProducts.hts con 6 dígitos (posición arancelaria)
 * Ejemplo: "0603110000" → "060311" (primeros 6 dígitos significativos)
 * 
 * Reglas:
 * - Solo dígitos permitidos
 * - Máximo 6 caracteres para código base (según legacy)
 * - Se pueden enviar códigos más largos si la aerolínea lo requiere
 * - Elimina ceros a la izquierda solo si el código completo es numérico
 * 
 * @param htsCode - Código HTS del backend
 * @returns Código HTS normalizado (string de hasta 18 caracteres según Traxon API)
 */
const normalizeHtsCode = (htsCode: string | undefined): string => {
  if (!htsCode || htsCode.trim() === "") return "";
  
  // Solo permitir dígitos
  const digitsOnly = htsCode.replace(/[^0-9]/g, "");
  
  // Si está vacío después de limpiar, retornar vacío
  if (digitsOnly.length === 0) return "";
  
  // Máximo 18 caracteres según Traxon API spec (harmonisedTariffScheduleInformation)
  // pero el legacy usaba típicamente 6 dígitos para flores (ej: 060311)
  return digitsOnly.substring(0, 18);
};

/**
 * Normaliza el número de AWB al formato correcto XXX-XXXXXXXX
 * Ejemplos:
 *   "745-1256-5214" → "745-12565214"
 *   "745 1256 5214" → "745-12565214"
 *   "74512565214"   → "745-12565214"
 *   "745-12565214"  → "745-12565214" (ya correcto)
 */
const normalizeAwbNumber = (awb: string): string => {
  if (!awb) return awb;
  
  // Quita todo excepto números
  const digitsOnly = awb.replace(/[^0-9]/g, "");
  
  // Debe tener 11 dígitos (3 prefijo + 8 número)
  if (digitsOnly.length !== 11) {
    // Si no tiene 11 dígitos, intenta devolver en formato XXX-resto
    if (digitsOnly.length >= 3) {
      return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3)}`;
    }
    return awb; // Retorna original si no se puede normalizar
  }
  
  // Formato correcto: XXX-XXXXXXXX
  return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3)}`;
};

export const generateShortSignature = (agentName: string): string => {
  const cleaned = cleanString(agentName, 50);
  const noSpaces = cleaned.replace(/\s+/g, '');
  return noSpaces.substring(0, 20);
};

const getCassCode = (origin: string, iataCode: string): string => {
  const airport = origin.toUpperCase();
  if (airport === 'BOG') return '0016';
  if (airport === 'MDE' || airport === 'RNG') return '0020';
  if (airport === 'LTX' || airport === 'UIO') return '0006';
  return iataCode.replace(/[^0-9]/g, "").slice(-4) || "0000";
};

/**
 * Obtiene el prefijo de la guía aérea (primeros 3 dígitos)
 */
export const getAwbPrefix = (awbNumber: string): string => {
  return awbNumber.split('-')[0] || awbNumber.substring(0, 3);
};

/**
 * Determina los códigos de manejo especial según la aerolínea
 * Regla Legacy: IBERIA usa ['ECC', 'EAP', 'PER'], otras usan ['EAP']
 * @param awbPrefix - Prefijo de la guía (ej: '145', '075')
 * @param customCodes - Códigos personalizados del usuario/backend
 * @returns Array de códigos SPH a enviar
 */
export const getSpecialHandlingCodes = (awbPrefix: string, customCodes?: string[]): string[] => {
  // Si el usuario/backend envía códigos, usarlos
  if (customCodes && customCodes.length > 0) return customCodes;
  // Sino, usar defaults por aerolínea
  return getSpbByAirline(awbPrefix);
};

/**
 * Obtiene los códigos SPH por defecto para una aerolínea
 * @param awbPrefix - Prefijo de la guía
 * @returns Array de códigos por defecto
 */
export const getDefaultSphCodes = (awbPrefix: string): string[] => {
  return getSpbByAirline(awbPrefix);
};

/**
 * Determina la descripción de mercancía según reglas de aerolínea y tipo de envío
 * 
 * NOTA IMPORTANTE (Traxon feedback):
 * - Evitar formateo decorativo (espacios entre letras, texto largo innecesario)
 * - Usar \n para controlar saltos de línea (destino permite 25 chars por línea)
 * - Los códigos HS van en harmonisedCommodityCode, NO en goodsDescription
 * - Para consolidados: "CONSOLIDATION AS PER\nATTACHED DOCUMENTS"
 * - Para directos: descripción corta del producto
 * 
 * Regla Legacy LATAM: Commodity 0609 = 'CONSOLIDATE FLOWERS', otros = 'CUT FLOWERS'
 */
const getNatureOfGoods = (awbPrefix: string, commodityCode: string | undefined, description: string, hasHouses: boolean): string => {
  // Consolidados: descripción simplificada según recomendación Traxon
  if (hasHouses) {
    return 'CONSOLIDATION AS PER\nATTACHED DOCUMENTS';
  }
  
  // Regla LATAM (145, 985) - texto corto específico
  if (AIRLINE_PREFIXES.LATAM.includes(awbPrefix as any)) {
    if (commodityCode === '0609' || commodityCode === '609') {
      return 'CONSOLIDATE FLOWERS';
    }
    return 'CUT FLOWERS'; // Directas
  }
  
  // Default para directos: usar función de saneado con formato de 25 chars/línea
  // Remueve códigos HS automáticamente y formatea con \n
  const sanitized = sanitizeGoodsDescription(description, 150);
  return sanitized || 'FRESH CUT FLOWERS';
};

/**
 * Corrige código de país según reglas legacy
 * Regla: 'CW' (Curaçao) -> 'NL' (Netherlands)
 */
const normalizeCountryCode = (countryCode: string): string => {
  if (countryCode === 'CW') return 'NL';
  return countryCode;
};

/**
 * Normaliza el aeropuerto de origen según reglas legacy
 * Regla: 'RNG' -> 'MDE'
 */
const normalizeOrigin = (origin: string): string => {
  if (origin === 'RNG') return 'MDE';
  return origin;
};

const transformToChampContact = (party: Party): any => {
  const contact: any = {
    accountNumber: party.accountNumber || undefined,
    address: {
      name1: cleanString(party.name, 35),
      name2: party.name2 ? cleanString(party.name2, 35) : undefined,
      streetAddress1: cleanString(party.address.street, 35),
      streetAddress2: party.address.street2 ? cleanString(party.address.street2, 35) : undefined,
      place: cleanString(party.address.place, 17),
      stateProvince: party.address.state ? cleanString(party.address.state, 2) : undefined,
      country: normalizeCountryCode(party.address.countryCode), // Aplica regla CW -> NL
      postCode: cleanString(party.address.postalCode, 9, "10") // Default "10" según legacy
    }
  };
  
  // Solo agregar contactDetails si existe información de contacto
  if (party.contact && party.contact.number) {
    contact.contactDetails = [{
      contactIdentifier: party.contact.identifier || "TE",
      contactNumber: cleanString(party.contact.number, 25)
    }];
  }
  
  // Eliminar campos undefined para JSON limpio
  Object.keys(contact.address).forEach(key => {
    if (contact.address[key] === undefined) delete contact.address[key];
  });
  
  return contact;
};

// ============================================================
// SANITIZACIÓN DE DATOS (Limpia y corrige formatos antes de validar)
// ============================================================

/**
 * Sanitiza un número de AWB para que cumpla con el formato XXX-XXXXXXXX
 * Maneja formatos como: "810-5043-4042", "8105043 4042", "810 50434042", etc.
 */
const sanitizeAwbNumber = (awb: string | undefined | null): string => {
  if (!awb) return '';
  
  // Extraer solo dígitos
  const digits = awb.replace(/\D/g, '');
  
  // Debe tener 11 dígitos (3 prefijo + 8 número)
  if (digits.length === 11) {
    return `${digits.substring(0, 3)}-${digits.substring(3)}`;
  }
  
  // Si tiene más de 11, tomar los primeros 11
  if (digits.length > 11) {
    return `${digits.substring(0, 3)}-${digits.substring(3, 11)}`;
  }
  
  // Si tiene menos, retornar como está (fallará validación con mensaje claro)
  if (digits.length >= 3) {
    return `${digits.substring(0, 3)}-${digits.substring(3).padEnd(8, '0')}`;
  }
  
  return awb; // Retornar original si no se puede procesar
};

/**
 * Extrae código IATA de 3 letras de strings compuestos
 * Maneja formatos como: "BOG/MIA", "BOG-MIA", "BOG MIA", "BOGOTA", etc.
 */
const sanitizeIataCode = (code: string | undefined | null, isOrigin: boolean = true): string => {
  if (!code) return '';
  
  const trimmed = code.trim().toUpperCase();
  
  // Si ya es código IATA válido de 3 letras
  if (/^[A-Z]{3}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Buscar separadores comunes: "/" "-" " " ","
  const separators = /[\/\-\s,]+/;
  const parts = trimmed.split(separators).filter(p => p.length > 0);
  
  if (parts.length >= 2) {
    // Si es ruta como "BOG/MIA", tomar origen o destino según corresponda
    const candidateOrigin = parts[0];
    const candidateDest = parts[parts.length - 1];
    
    // Extraer primeras 3 letras de cada parte
    const origin3 = candidateOrigin.replace(/[^A-Z]/g, '').substring(0, 3);
    const dest3 = candidateDest.replace(/[^A-Z]/g, '').substring(0, 3);
    
    if (origin3.length === 3 && dest3.length === 3) {
      return isOrigin ? origin3 : dest3;
    }
    
    // Si solo uno es válido, retornarlo
    if (origin3.length === 3) return origin3;
    if (dest3.length === 3) return dest3;
  }
  
  // Si es una sola parte, tomar primeras 3 letras
  const letters = trimmed.replace(/[^A-Z]/g, '');
  if (letters.length >= 3) {
    return letters.substring(0, 3);
  }
  
  return trimmed.substring(0, 3) || '';
};

/**
 * Sanitiza todos los campos críticos del shipment ANTES de validar
 * Modifica el objeto in-place y retorna el mismo objeto sanitizado
 */
export const sanitizeShipment = (shipment: InternalShipment): InternalShipment => {
  // Sanitizar AWB
  if (shipment.awbNumber) {
    const originalAwb = shipment.awbNumber;
    shipment.awbNumber = sanitizeAwbNumber(shipment.awbNumber);
    if (originalAwb !== shipment.awbNumber) {
      console.log(`[Sanitize] AWB: "${originalAwb}" → "${shipment.awbNumber}"`);
    }
  }
  
  // Sanitizar Origin
  if (shipment.origin) {
    const originalOrigin = shipment.origin;
    shipment.origin = sanitizeIataCode(shipment.origin, true);
    if (originalOrigin !== shipment.origin) {
      console.log(`[Sanitize] Origin: "${originalOrigin}" → "${shipment.origin}"`);
    }
  }
  
  // Sanitizar Destination
  if (shipment.destination) {
    const originalDest = shipment.destination;
    shipment.destination = sanitizeIataCode(shipment.destination, false);
    if (originalDest !== shipment.destination) {
      console.log(`[Sanitize] Destination: "${originalDest}" → "${shipment.destination}"`);
    }
  }
  
  // Sanitizar flights (origin/destination en cada vuelo)
  if (shipment.flights && shipment.flights.length > 0) {
    shipment.flights = shipment.flights.map((flight, idx) => {
      const sanitized = { ...flight };
      if (flight.origin) {
        sanitized.origin = sanitizeIataCode(flight.origin, true);
      }
      if (flight.destination) {
        sanitized.destination = sanitizeIataCode(flight.destination, false);
      }
      return sanitized;
    });
  }
  
  return shipment;
};

// ============================================================
// VALIDACIONES (Previenen errores en Traxon API)
// ============================================================

/**
 * Valida que un shipment tenga los campos mínimos requeridos para AWB
 * Lanza error descriptivo si falta algún campo crítico
 */
const validateShipmentForAwb = (shipment: InternalShipment): void => {
  const errors: string[] = [];
  
  // Campos obligatorios raíz
  if (!shipment.awbNumber || !/^\d{3}-\d{8}$/.test(shipment.awbNumber)) {
    errors.push(`AWB Number inválido: "${shipment.awbNumber}". Formato esperado: XXX-XXXXXXXX`);
  }
  if (!shipment.origin || shipment.origin.length !== 3) {
    errors.push(`Origin inválido: "${shipment.origin}". Debe ser código IATA de 3 letras`);
  }
  if (!shipment.destination || shipment.destination.length !== 3) {
    errors.push(`Destination inválido: "${shipment.destination}". Debe ser código IATA de 3 letras`);
  }
  if (!shipment.pieces || shipment.pieces <= 0) {
    errors.push(`Pieces inválido: ${shipment.pieces}. Debe ser mayor a 0`);
  }
  if (!shipment.weight || shipment.weight <= 0) {
    errors.push(`Weight inválido: ${shipment.weight}. Debe ser mayor a 0`);
  }
  
  // Shipper obligatorio con campos mínimos
  if (!shipment.shipper) {
    errors.push('Shipper es requerido');
  } else {
    if (!shipment.shipper.name) errors.push('Shipper.name es requerido');
    if (!shipment.shipper.address?.street) errors.push('Shipper.address.street es requerido');
    if (!shipment.shipper.address?.place) errors.push('Shipper.address.place es requerido');
    if (!shipment.shipper.address?.countryCode) errors.push('Shipper.address.countryCode es requerido');
  }
  
  // Consignee obligatorio con campos mínimos
  if (!shipment.consignee) {
    errors.push('Consignee es requerido');
  } else {
    if (!shipment.consignee.name) errors.push('Consignee.name es requerido');
    if (!shipment.consignee.address?.street) errors.push('Consignee.address.street es requerido');
    if (!shipment.consignee.address?.place) errors.push('Consignee.address.place es requerido');
    if (!shipment.consignee.address?.countryCode) errors.push('Consignee.address.countryCode es requerido');
  }
  
  // Agent obligatorio
  if (!shipment.agent) {
    errors.push('Agent es requerido');
  } else {
    if (!shipment.agent.name) errors.push('Agent.name es requerido');
    if (!shipment.agent.iataCode) errors.push('Agent.iataCode es requerido');
  }
  
  // Rates obligatorio (al menos uno)
  if (!shipment.rates || shipment.rates.length === 0) {
    errors.push('Al menos un rate es requerido');
  }
  
  if (errors.length > 0) {
    throw new Error(`Validación AWB fallida:\n- ${errors.join('\n- ')}`);
  }
};

/**
 * Valida que un shipment sea válido para CSL (consolidado)
 */
const validateShipmentForCsl = (shipment: InternalShipment): void => {
  validateShipmentForAwb(shipment); // Mismas validaciones base
  
  if (!shipment.houseBills || shipment.houseBills.length === 0) {
    throw new Error('CSL requiere al menos un house bill');
  }
  
  shipment.houseBills.forEach((h, i) => {
    if (!h.hawbNumber) throw new Error(`House ${i + 1}: hawbNumber es requerido`);
    if (!h.pieces || h.pieces <= 0) throw new Error(`House ${i + 1}: pieces debe ser mayor a 0`);
    if (!h.weight || h.weight <= 0) throw new Error(`House ${i + 1}: weight debe ser mayor a 0`);
  });
};

export const generateAirWayBillMessage = (shipment: InternalShipment): any => {
  // ============================================================
  // SANITIZACIÓN (Limpia formatos antes de validar)
  // ============================================================
  sanitizeShipment(shipment);
  
  // ============================================================
  // VALIDACIÓN
  // ============================================================
  validateShipmentForAwb(shipment);
  
  // ============================================================
  // PREPARACIÓN Y REGLAS DE NEGOCIO
  // ============================================================
  const awbPrefix = getAwbPrefix(shipment.awbNumber);
  const normalizedOrigin = normalizeOrigin(shipment.origin);
  
  // Cálculo de totales para el Resumen de Cargos
  const weightChargeTotal = shipment.rates.reduce((acc, r) => acc + r.total, 0);
  const otherCharges = shipment.otherCharges || [];  // Default a array vacío si no viene
  const otherDueAgent = otherCharges.filter(oc => oc.entitlement === 'DueAgent').reduce((acc, oc) => acc + oc.amount, 0);
  const otherDueCarrier = otherCharges.filter(oc => oc.entitlement === 'DueCarrier').reduce((acc, oc) => acc + oc.amount, 0);
  const grandTotal = weightChargeTotal + otherDueAgent + otherDueCarrier;

  // Charge Summary (requerido al menos uno: prepaid o collect)
  // PRIORIDAD: Backend override > Cálculo automático
  const chargeSummary = shipment.chargeSummaryOverride || {
    totalWeightCharge: weightChargeTotal.toFixed(2),
    totalOtherChargesDueAgent: otherDueAgent > 0 ? otherDueAgent.toFixed(2) : undefined,
    totalOtherChargesDueCarrier: otherDueCarrier > 0 ? otherDueCarrier.toFixed(2) : undefined,
    chargeSummaryTotal: grandTotal.toFixed(2)
  };

  // Signature con fallback según legacy (antes era DSVOP, ahora OPFLOROP)
  const signature = shipment.signature || generateShortSignature(shipment.agent.name) || "OPFLOROP";
  
  // Regla Legacy para CER (shippersCertification):
  // Para prefijo 176 (Emirates), CER usa el nombre completo de la agencia en lugar de signature
  // ISU (carriersExecution.authorisationSignature) siempre usa signature normal
  const cerSignature = AIRLINE_PREFIXES.EMIRATES.includes(awbPrefix as any)
    ? cleanString(shipment.agent.name, 35)  // agencyName normalizado a 35 chars
    : signature;

  // ============================================================
  // CONSTRUCCIÓN DEL MENSAJE AWB (Según Traxon cargoJSON Spec)
  // ============================================================
  // Si el backend envía messageId, usarlo; sino generar uno nuevo
  const messageId = shipment.messageId || generateUUID();
  
  // Obtener configuración de API (incluye recipientAddress según ambiente)
  const apiConfig = getApiConfig();
  const currentEnv = getTransmissionEnvironment();
  
  // En UAT: SIEMPRE usar recipientAddress de UAT (ignorar el del backend)
  // En PRODUCCIÓN: OBLIGATORIO que venga del backend - si no viene, error
  let effectiveRecipientAddress: string;
  if (currentEnv === 'UAT') {
    effectiveRecipientAddress = UAT_CONFIG.recipientAddress;
  } else {
    // PRODUCCIÓN: debe venir del backend obligatoriamente
    if (!shipment.routing?.recipientAddress) {
      throw new Error('PRODUCCIÓN: recipientAddress es obligatorio del backend. No se puede enviar sin dirección de destino.');
    }
    effectiveRecipientAddress = shipment.routing.recipientAddress;
  }
  
  return {
    // --- Identificación del Mensaje ---
    // NOTA: 'id' NO se incluye - Traxon asigna su propio UUID internamente
    type: "air waybill",
    
    // --- Message Header SIMPLIFICADO (según formato del cliente) ---
    // En UAT siempre se usa el recipient de pruebas, en PROD se respeta el del backend
    messageHeader: {
      addressing: {
        senderAddresses: [{ 
          type: "PIMA", 
          address: shipment.routing?.senderAddress || apiConfig.senderAddress
        }],
        finalRecipientAddresses: [{ 
          type: "PIMA", 
          address: effectiveRecipientAddress
        }]
      },
      // Formato Traxon: YYYY-MM-DDTHH:mm:ss.SSS (sin Z al final)
      creationDate: new Date().toISOString().replace('Z', '')
    },

    // --- Datos Principales AWB (OBLIGATORIOS) ---
    airWaybillNumber: normalizeAwbNumber(shipment.awbNumber),
    origin: normalizedOrigin, // Aplica regla RNG -> MDE
    destination: shipment.destination,
    totalConsignmentNumberOfPieces: shipment.pieces.toString(),
    weight: { amount: shipment.weight.toString(), unit: normalizeWeightUnit(shipment.weightUnit) },
    
    // --- Volume (Opcional) ---
    volume: shipment.volume && shipment.volume > 0 ? { 
      amount: shipment.volume.toString(), 
      unit: normalizeVolumeUnit(shipment.volumeUnit || 'CUBIC_METRE') 
    } : undefined,
    
    // --- Customs Origin Code (Requerido para Colombia - mercancía en tránsito T2) ---
    // Según legacy: CARGOM usa T2 para indicar mercancía comunitaria no nacional
    customsOriginCode: "T2",
    
    // --- Vuelos (Opcional) ---
    flights: shipment.flights.length > 0 ? shipment.flights.map(f => ({
      flight: f.flightNumber,
      scheduledDate: f.date,
      scheduledTime: f.time || undefined // Solo si existe
    })) : undefined,

    // --- Routing (OBLIGATORIO - Al menos un elemento) ---
    // carrierCode DEBE venir del backend - flightNumber puede ser completo (QT890) o solo número (890)
    route: shipment.flights.length > 0 ? shipment.flights.map(f => ({
      carrierCode: (f.carrierCode || '').toUpperCase(),
      destination: f.destination
    })) : [{ 
      carrierCode: "XX", // Fallback si no hay flights
      destination: shipment.destination 
    }],

    // --- Shipper (OBLIGATORIO) ---
    shipper: transformToChampContact(shipment.shipper),
    
    // --- Consignee (OBLIGATORIO) ---
    consignee: transformToChampContact(shipment.consignee),
    
    // --- Carrier's Execution (OBLIGATORIO) ---
    carriersExecution: {
      date: shipment.executionDate || new Date().toISOString().split('T')[0],
      placeOrAirportCityCode: cleanString(shipment.executionPlace || normalizedOrigin, 17),
      authorisationSignature: signature
    },

    // --- Sender Reference (OBLIGATORIO según Traxon Spec) ---
    senderReference: {
      fileReference: shipment.awbNumber.split('-')[1] || shipment.awbNumber,
      participantIdentifier: {
        identifier: "AGT",
        code: cleanString(shipment.agent.name, 15).replace(/\s+/g, ''),
        airportCityCode: normalizedOrigin
      }
    },

    // --- Charge Declarations (OBLIGATORIO solo isoCurrencyCode, chargeCode es OPCIONAL) ---
    // Nota: declaredValueForCarriage/Customs son OPCIONALES y tipo DECIMAL
    // Si no se declara valor, simplemente no se envían (NVD/NCV no son válidos)
    chargeDeclarations: {
      isoCurrencyCode: shipment.currency || "USD",
      // ALL_CHARGES_PREPAID_CREDIT = Prepago a crédito | ALL_CHARGES_COLLECT = Por cobrar
      chargeCode: shipment.paymentMethod === 'Prepaid' ? TRAXON_CHARGE_CODE.ALL_CHARGES_PREPAID_CREDIT : TRAXON_CHARGE_CODE.ALL_CHARGES_COLLECT,
      payment_WeightValuation: shipment.paymentMethod,
      payment_OtherCharges: shipment.paymentMethod
      // declaredValueForCarriage y declaredValueForCustoms omitidos (opcionales)
      // Si el backend envía valores numéricos, se pueden agregar aquí
    },

    // --- Charge Items / Rate Description (OBLIGATORIO) ---
    chargeItems: shipment.rates.map(r => {
      // hsCodes: prioridad array > string legacy
      const hsCodes = r.hsCodes && r.hsCodes.length > 0 
        ? r.hsCodes 
        : (r.hsCode ? [r.hsCode] : undefined);
      
      // PRIORIDAD para goodsDescription:
      // 1. Override del rate individual (r.goodsDescriptionOverride)
      // 2. Override del master shipment (shipment.goodsDescriptionOverride)
      // 3. Cálculo automático por reglas de aerolínea
      const finalGoodsDescription = r.goodsDescriptionOverride 
        || shipment.goodsDescriptionOverride 
        || getNatureOfGoods(awbPrefix, shipment.commodityCode, r.description, shipment.hasHouses);
      
      return {
        numberOfPieces: r.pieces.toString(),
        commodityItemNumber: r.commodityCode ? [r.commodityCode] : undefined,
        grossWeight: { amount: r.weight.toString(), unit: shipment.weightUnit || "KILOGRAM" },
        goodsDescription: finalGoodsDescription,
        consolidation: shipment.hasHouses ? "true" : "false",
        harmonisedCommodityCode: hsCodes,
        packaging: [{
          numberOfPieces: r.pieces.toString(),
          weight: { amount: r.weight.toString(), unit: normalizeWeightUnit(shipment.weightUnit) },
          volume: shipment.volume && shipment.volume > 0 ? {
            amount: shipment.volume.toString(),
            unit: normalizeVolumeUnit(shipment.volumeUnit || 'CUBIC_METRE')
          } : undefined,
          dimensions: shipment.dimensions && shipment.dimensions.length > 0 ? {
            unit: normalizeLengthUnit(shipment.dimensions[0].unit),
            length: shipment.dimensions[0].length.toString(),
            width: shipment.dimensions[0].width.toString(),
            height: shipment.dimensions[0].height.toString()
          } : undefined
        }],
        charges: [{
          chargeableWeight: { amount: (r.chargeableWeight || r.weight).toString(), unit: normalizeWeightUnit(shipment.weightUnit) },
          rateClassCode: normalizeRateClassCode(r.rateClassCode),
          rateOrCharge: r.rateOrCharge.toString(),
          totalChargeAmount: r.total.toFixed(2)
        }]
        // serviceCode removido según indicación Traxon: aerolíneas siempre operan airport-to-airport
      };
    }),

    // --- Agent (Opcional pero recomendado) ---
    // NOTA: participantIdentifier removido según indicación Traxon - confunde a aerolíneas
    agent: {
      name: cleanString(shipment.agent.name, 35),
      place: cleanString(shipment.agent.place, 17),
      accountNumber: shipment.agent.accountNumber,
      iataCargoAgentNumericCode: shipment.agent.iataCode,
      // Usa cassCode si viene del backend, sino lo genera automáticamente
      iataCargoAgentCASSAddress: shipment.agent.cassCode || getCassCode(normalizedOrigin, shipment.agent.iataCode)
    },

    // --- Charge Summary (Obligatorio al menos uno) ---
    [shipment.paymentMethod.toLowerCase() + "ChargeSummary"]: chargeSummary,

    // --- Special Handling Codes (Aplica regla por aerolínea) ---
    specialHandlingCodes: getSpecialHandlingCodes(awbPrefix, shipment.specialHandlingCodes),

    // --- Special Service Request (Opcional - solo si viene del backend/usuario) ---
    // Ejemplo: "MUST BE KEPT ABOVE 5 DEGREES CELSIUS."
    ...(shipment.specialServiceRequest ? { specialServiceRequest: shipment.specialServiceRequest } : {}),

    // --- Other Charges (Opcional) ---
    // IMPORTANTE (Traxon 2024-12-23): otherChargeCode debe ser 2 letras (ej: "AW", no "AWC")
    // La 3ra letra que se ve en AWB papel (A=Agent, C=Carrier) se indica en entitlementCode
    otherCharges: otherCharges.length > 0 ? otherCharges.map(oc => {
      const { chargeCode, inferredEntitlement } = normalizeOtherChargeCode(oc.code);
      // Si el código de 3 letras indicaba entitlement, usarlo; sino usar el que viene del backend
      const finalEntitlement = inferredEntitlement || 
        (oc.entitlement === 'DueAgent' ? 'Agent' : 'Carrier');
      return {
        paymentCondition: oc.paymentMethod,
        otherChargeCode: chargeCode,
        entitlementCode: finalEntitlement,
        chargeAmount: oc.amount.toFixed(2)
      };
    }) : undefined,

    // --- Shipper's Certification (CER) ---
    // Regla Legacy: Para prefijo 176 (Emirates), usa nombre de agencia; para otros, usa signature
    shippersCertification: cerSignature,
    
    // --- OCI - Security Information (Obligatorio para ciertos destinos) ---
    // Incluye automáticamente TIN con NIT/EORI para shipper y consignee si tienen taxId
    oci: buildOciWithColombiaRules(shipment.oci, shipment.shipper, shipment.consignee, normalizedOrigin, shipment.destination)
  };
};

/**
 * Genera UN mensaje CSL para UNA sola house
 * Según Traxon: cada house se envía en un mensaje CSL separado
 * NOTA: El campo 'id' NO se incluye - Traxon asigna su propio UUID
 */
export const generateSingleConsolidationListMessage = (
  shipment: InternalShipment, 
  houseBill: typeof shipment.houseBills[0],
  houseIndex: number
): any => {
  const awbPrefix = getAwbPrefix(shipment.awbNumber);
  const normalizedOrigin = normalizeOrigin(shipment.origin);
  
  // Obtener configuración de API (incluye recipientAddress según ambiente)
  const apiConfig = getApiConfig();
  const currentEnv = getTransmissionEnvironment();
  
  // En UAT: SIEMPRE usar recipientAddress de UAT (ignorar el del backend)
  // En PRODUCCIÓN: OBLIGATORIO que venga del backend - si no viene, error
  let effectiveRecipientAddress: string;
  if (currentEnv === 'UAT') {
    effectiveRecipientAddress = UAT_CONFIG.recipientAddress;
  } else {
    // PRODUCCIÓN: debe venir del backend obligatoriamente
    if (!shipment.routing?.recipientAddress) {
      throw new Error('PRODUCCIÓN: recipientAddress es obligatorio del backend. No se puede enviar CSL sin dirección de destino.');
    }
    effectiveRecipientAddress = shipment.routing.recipientAddress;
  }
  
  return {
    // --- Identificación del Mensaje ---
    // NOTA: 'id' NO se incluye - Traxon asigna su propio UUID internamente
    type: "consolidation list",
    
    // --- Message Header SIMPLIFICADO (según formato del cliente) ---
    messageHeader: {
      addressing: {
        senderAddresses: [{ 
          type: "PIMA", 
          address: shipment.routing?.senderAddress || apiConfig.senderAddress
        }],
        finalRecipientAddresses: [{ 
          type: "PIMA", 
          address: effectiveRecipientAddress
        }]
      },
      // Formato Traxon: YYYY-MM-DDTHH:mm:ss.SSS (sin Z al final)
      creationDate: new Date().toISOString().replace('Z', '')
    },
    
    // --- AWB Number (OBLIGATORIO) ---
    airWaybillNumber: normalizeAwbNumber(shipment.awbNumber),
    
    // --- Origin and Destination (OBLIGATORIO) ---
    originAndDestination: { 
      origin: normalizedOrigin, 
      destination: shipment.destination 
    },
    
    // --- Quantity (OBLIGATORIO) - Datos de la house específica ---
    quantity: {
      shipmentDescriptionCode: TRAXON_SHIPMENT_DESCRIPTION_CODE.TOTAL_CONSIGNMENT,
      numberOfPieces: houseBill.pieces.toString(),
      weight: { amount: houseBill.weight.toString(), unit: normalizeWeightUnit(shipment.weightUnit) }
    },
    
    // --- House Waybill Summaries (OBLIGATORIO) - SOLO UNA HOUSE por mensaje ---
    houseWaybillSummaries: [{
      serialNumber: cleanHawbNumber(houseBill.hawbNumber),
      origin: normalizedOrigin,
      destination: shipment.destination,
      numberOfPieces: houseBill.pieces.toString(),
      weight: { amount: houseBill.weight.toString(), unit: normalizeWeightUnit(shipment.weightUnit) },
      natureOfGoods: cleanString(houseBill.natureOfGoods, 500, "CONSOLIDATED"),
      // Para KLM (074) usar commonName en lugar de natureOfGoods
      ...(awbPrefix === '074' && houseBill.commonName ? {
        natureOfGoods: cleanString(houseBill.commonName, 500)
      } : {}),
      // HTS Codes (Harmonised Tariff Schedule)
      ...(houseBill.htsCodes && houseBill.htsCodes.length > 0 ? {
        harmonisedTariffScheduleInformation: houseBill.htsCodes.map(code => normalizeHtsCode(code))
      } : {})
    }],
    
    // --- Shipper: usar el de la house si existe, o el master ---
    shipper: transformToChampContact(houseBill.shipper || shipment.shipper),
    
    // --- Consignee: usar el de la house si existe, o el master ---
    consignee: transformToChampContact(houseBill.consignee || shipment.consignee)
  };
};

/**
 * Genera MÚLTIPLES mensajes CSL - uno por cada house
 * Según Traxon: "houseWaybillSummaries should have only one main element"
 * Si hay 50 houses, se generan 50 mensajes CSL separados
 */
export const generateConsolidationListMessages = (shipment: InternalShipment): any[] => {
  // Sanitización y Validación específica para CSL
  sanitizeShipment(shipment);
  validateShipmentForCsl(shipment);
  
  // Generar un CSL por cada house
  return shipment.houseBills.map((house, index) => 
    generateSingleConsolidationListMessage(shipment, house, index)
  );
};

/**
 * @deprecated Use generateConsolidationListMessages (plural) en su lugar.
 * Esta función se mantiene por compatibilidad pero genera un solo CSL con todas las houses.
 */
export const generateConsolidationListMessage = (shipment: InternalShipment): any => {
  // Para compatibilidad, retornamos el primer CSL o un CSL vacío
  const messages = generateConsolidationListMessages(shipment);
  // Retornar un objeto que muestre todos los CSL para visualización
  return {
    _note: `Se enviarán ${messages.length} mensajes CSL separados (uno por house)`,
    _totalMessages: messages.length,
    messages: messages
  };
};

/**
 * @deprecated DEPRECATED - Según Traxon EMA, los FHL (House Waybills individuales) ya NO son necesarios.
 * Para consolidados, solo se envía AWB + CSL. El CSL contiene toda la información de las houses
 * en el campo houseWaybillSummaries.
 * 
 * Esta función se mantiene por compatibilidad, pero no debe usarse para nuevas implementaciones.
 * 
 * Genera un mensaje House Waybill (FHL) según especificación Traxon
 * NOTA: Según la documentación de Traxon cargoJSON API, los campos shipper y consignee
 * son REQUERIDOS en HouseWaybillMessage (a diferencia del Master AWB que los hereda)
 */
export const generateHouseWaybillMessage = (shipment: InternalShipment, houseBill: typeof shipment.houseBills[0]): any => {
  // Sanitizar datos antes de procesar
  sanitizeShipment(shipment);
  
  const awbPrefix = getAwbPrefix(shipment.awbNumber);
  const normalizedOrigin = normalizeOrigin(shipment.origin);
  
  // Construir shipper del house: usar el específico si existe, o heredar del master con nombre del house
  // CRÍTICO: streetAddress1 y postCode son REQUERIDOS según Traxon API
  const houseShipper = houseBill.shipper 
    ? transformToChampContact(houseBill.shipper)
    : {
        address: {
          name1: cleanString(houseBill.shipperName, 35),
          // Hereda dirección del shipper master (campos requeridos)
          streetAddress1: shipment.shipper.address.street 
            ? cleanString(shipment.shipper.address.street, 35) 
            : "NO DISPONIBLE",
          place: normalizedOrigin,
          country: normalizeCountryCode(shipment.shipper.address.countryCode),
          postCode: shipment.shipper.address.postalCode 
            ? cleanString(shipment.shipper.address.postalCode, 9) 
            : "10" // Default según legacy Colombia
        }
      };
  
  // Construir consignee del house: usar el específico si existe, o heredar del master con nombre del house
  // CRÍTICO: streetAddress1 y postCode son REQUERIDOS según Traxon API
  const houseConsignee = houseBill.consignee 
    ? transformToChampContact(houseBill.consignee)
    : {
        address: {
          name1: cleanString(houseBill.consigneeName, 35),
          // Hereda dirección del consignee master (campos requeridos)
          streetAddress1: shipment.consignee.address.street 
            ? cleanString(shipment.consignee.address.street, 35) 
            : "NO DISPONIBLE",
          place: shipment.destination,
          country: normalizeCountryCode(shipment.consignee.address.countryCode),
          postCode: shipment.consignee.address.postalCode 
            ? cleanString(shipment.consignee.address.postalCode, 9) 
            : "10" // Default según legacy Colombia
        }
      };
  
  // Para FHL usamos el messageId del house si viene del backend o generamos uno
  const fhlMessageId = houseBill.messageId || generateUUID();
  
  // Obtener configuración de API (incluye recipientAddress según ambiente)
  const apiConfig = getApiConfig();
  const currentEnv = getTransmissionEnvironment();
  
  // En UAT: SIEMPRE usar recipientAddress de UAT (ignorar el del backend)
  // En PRODUCCIÓN: OBLIGATORIO que venga del backend - si no viene, error
  let effectiveRecipientAddress: string;
  if (currentEnv === 'UAT') {
    effectiveRecipientAddress = UAT_CONFIG.recipientAddress;
  } else {
    // PRODUCCIÓN: debe venir del backend obligatoriamente
    if (!shipment.routing?.recipientAddress) {
      throw new Error('PRODUCCIÓN: recipientAddress es obligatorio del backend. No se puede enviar FHL sin dirección de destino.');
    }
    effectiveRecipientAddress = shipment.routing.recipientAddress;
  }
  
  return {
    type: "house waybill",
    id: fhlMessageId,
    // --- Message Header SIMPLIFICADO (según formato del cliente) ---
    // En UAT siempre se usa el recipient de pruebas, en PROD se respeta el del backend
    messageHeader: {
      addressing: {
        senderAddresses: [{ 
          type: "PIMA", 
          address: shipment.routing?.senderAddress || apiConfig.senderAddress
        }],
        finalRecipientAddresses: [{ 
          type: "PIMA", 
          address: effectiveRecipientAddress
        }]
      },
      // Formato Traxon: YYYY-MM-DDTHH:mm:ss.SSS (sin Z al final)
      creationDate: new Date().toISOString().replace('Z', '')
    },
    airWaybillNumber: normalizeAwbNumber(shipment.awbNumber),
    origin: normalizedOrigin,
    destination: shipment.destination,
    serialNumber: cleanHawbNumber(houseBill.hawbNumber),
    numberOfPieces: houseBill.pieces.toString(),
    weight: { amount: houseBill.weight.toString(), unit: normalizeWeightUnit(shipment.weightUnit) },
    
    // natureOfGoods: En JSON API puede tener hasta 500+ chars (no hay límite de 20 como en EDI)
    // Ejemplo: "ROSES RED, INVOICES ATTACHMENT, DOCUMENTS ATTACHMENT, PRODUCT LIST..."
    // Regla KLM: usar commonName
    ...(awbPrefix === '074' && houseBill.commonName ? {
      natureOfGoods: cleanString(houseBill.commonName, 500)
    } : {
      natureOfGoods: cleanString(houseBill.natureOfGoods, 500, "CONSOLIDATED")
    }),
    
    // --- Shipper del House (REQUERIDO según Traxon API) ---
    shipper: houseShipper,
    
    // --- Consignee del House (REQUERIDO según Traxon API) ---
    consignee: houseConsignee,
    
    // Flights y Route heredados del Master
    flights: shipment.flights.length > 0 ? shipment.flights.map(f => ({
      flight: f.flightNumber,
      scheduledDate: f.date
    })) : undefined,
    
    route: shipment.flights.length > 0 ? shipment.flights.map(f => ({
      carrierCode: (f.carrierCode || '').toUpperCase(),
      destination: f.destination
    })) : undefined,
    
    chargeDeclarations: {
      isoCurrencyCode: shipment.currency || "USD",
      chargeCode: shipment.paymentMethod === 'Prepaid' ? TRAXON_CHARGE_CODE.ALL_CHARGES_PREPAID_CREDIT : TRAXON_CHARGE_CODE.ALL_CHARGES_COLLECT,
      payment_WeightValuation: shipment.paymentMethod,
      payment_OtherCharges: shipment.paymentMethod
    },
    
    carriersExecution: {
      date: shipment.executionDate || new Date().toISOString().split('T')[0],
      placeOrAirportCityCode: cleanString(shipment.executionPlace || normalizedOrigin, 17),
      authorisationSignature: shipment.signature || generateShortSignature(shipment.agent.name) || "OPFLOROP"
    },
    
    agentsHeadOffice: transformToChampContact(shipment.shipper),
    
    specialHandlingCodes: getSpecialHandlingCodes(awbPrefix, shipment.specialHandlingCodes),
    
    // --- HTS Codes (Códigos arancelarios) - Si el house tiene htsCodes, incluirlos ---
    // Según legacy: dsProducts.hts filtrado por guia_hija
    ...(houseBill.htsCodes && houseBill.htsCodes.length > 0 ? {
      harmonisedCommodityCode: houseBill.htsCodes.map(code => normalizeHtsCode(code))
    } : {}),
    
    // --- OCI - Incluye TIN con NIT/EORI para shipper y consignee del HOUSE ---
    // CRÍTICO: Cada house puede tener su propio shipper/consignee con diferente taxId
    // Por eso usamos houseBill.shipper/consignee si existen, sino fallback al master
    oci: buildOciWithColombiaRules(
      shipment.oci, 
      houseBill.shipper || shipment.shipper,   // Shipper del house o fallback al master
      houseBill.consignee || shipment.consignee, // Consignee del house o fallback al master
      normalizedOrigin, 
      shipment.destination
    )
  };
};
