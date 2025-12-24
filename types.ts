
// --- Enums from cargoJSON API ---
export enum RateClassCode {
  BASIC_CHARGE = 'BASIC_CHARGE',
  CLASS_RATE_REDUCTION = 'CLASS_RATE_REDUCTION',
  CLASS_RATE_SURCHARGE = 'CLASS_RATE_SURCHARGE',
  INTERNATIONAL_PRIORITY_SERVICE_RATE = 'INTERNATIONAL_PRIORITY_SERVICE_RATE',
  MINIMUM_CHARGE = 'MINIMUM_CHARGE',
  NORMAL_RATE = 'NORMAL_RATE',
  QUANTITY_RATE = 'QUANTITY_RATE',
  RATE_PER_KILOGRAM = 'RATE_PER_KILOGRAM',
  SPECIFIC_COMMODITY_RATE = 'SPECIFIC_COMMODITY_RATE',
  UNIT_LOAD_DEVICE_ADDITIONAL_INFORMATION = 'UNIT_LOAD_DEVICE_ADDITIONAL_INFORMATION',
  UNIT_LOAD_DEVICE_ADDITIONAL_RATE = 'UNIT_LOAD_DEVICE_ADDITIONAL_RATE',
  UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE = 'UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE',
  UNIT_LOAD_DEVICE_DISCOUNT = 'UNIT_LOAD_DEVICE_DISCOUNT'
}

// ============================================================
// SPECIAL HANDLING CODES - Valores oficiales Traxon cargoJSON API
// Ref: https://api.traxon.cargosmart.ai/docs - SpecialHandlingCode enum
// ============================================================
export const AVAILABLE_SPH_CODES = {
  // Seguridad (Los más comunes para Colombia/Flores)
  EAP: { code: 'EAP', description: 'e-AWB Participant', default: true },
  ECC: { code: 'ECC', description: 'Electronic Consignment with Accompanying Paper', default: false },
  SPX: { code: 'SPX', description: 'Secure - Examined', default: false },
  
  // Perecederos (Flores)
  PER: { code: 'PER', description: 'Perishable Cargo', default: false },
  PEP: { code: 'PEP', description: 'Perishable Fruits & Vegetables', default: false },
  PEF: { code: 'PEF', description: 'Perishable Fresh Fish/Seafood', default: false },
  PES: { code: 'PES', description: 'Live Tropical Fish', default: false },
  RFL: { code: 'RFL', description: 'Flowers', default: false },
  
  // Temperatura controlada
  COL: { code: 'COL', description: 'Cool Goods', default: false },
  FRO: { code: 'FRO', description: 'Frozen Goods', default: false },
  
  // Otros comunes
  PIL: { code: 'PIL', description: 'Pharmaceuticals', default: false },
  VAL: { code: 'VAL', description: 'Valuable Cargo', default: false },
  VUN: { code: 'VUN', description: 'Vulnerable Cargo', default: false },
  SPF: { code: 'SPF', description: 'Secure - Protected Freight', default: false },
  AVI: { code: 'AVI', description: 'Live Animals', default: false },
  DGR: { code: 'DGR', description: 'Dangerous Goods', default: false },
  HEA: { code: 'HEA', description: 'Heavy Cargo', default: false },
  BIG: { code: 'BIG', description: 'Outsized Cargo', default: false },
} as const;

// Códigos SPH por defecto según aerolínea
export const DEFAULT_SPH_BY_AIRLINE: Record<string, string[]> = {
  '075': ['ECC', 'EAP', 'PER'],  // IBERIA
  '145': ['EAP'],                 // LATAM
  '985': ['EAP'],                 // LATAM Cargo
  '074': ['EAP'],                 // KLM
  'DEFAULT': ['EAP']              // Todas las demás
};

// ============================================================
// OCI CONTROL INFO - Valores oficiales Traxon cargoJSON API
// Ref: CustomsSecurityAndRegulatoryControlInformationIdentifier enum
// ============================================================
export const AVAILABLE_OCI_CONTROL_INFO = {
  RA: { code: 'REGULATED_AGENT', short: 'RA', description: 'Agente Regulado (seguridad)', default: true },
  SPX: { code: 'SECURITY_STATUS', short: 'SPX', description: 'Estado de Seguridad (examinado)', default: true },
  KC: { code: 'KNOWN_CONSIGNOR', short: 'KC', description: 'Consignatario Conocido', default: false },
  AEO: { code: 'AUTHORISED_ECONOMIC_OPERATOR', short: 'AEO', description: 'Operador Económico Autorizado', default: false },
  SM: { code: 'SCREENING_METHOD', short: 'SM', description: 'Método de Inspección', default: false },
  TIN: { code: 'TRADER_IDENTIFICATION_NUMBER', short: 'TIN', description: 'NIT/Tax ID (Shipper o Consignee)', default: false },
  EORI: { code: 'TRADER_IDENTIFICATION_NUMBER', short: 'EORI', description: 'EORI Number (EU)', default: false },
} as const;

// Patrones de additionalControlInformation para EORI/TIN (formato legacy)
// Ref: Usado cuando informationIdentifier=ISS y controlInfo=TIN
export const OCI_ADDITIONAL_INFO_PATTERNS = {
  'CNE/T/EORI': 'Consignee EORI number',
  'SHP/T/EORI': 'Shipper EORI number', 
  'CNE/T': 'Consignee Tax ID',
  'SHP/T': 'Shipper Tax ID',
  'SHP/EX': 'Shipper Exporter number',
  'CNE/IM': 'Consignee Importer number'
} as const;

// OCI por defecto para Colombia (origen BOG)
export const DEFAULT_OCI_COLOMBIA = [
  {
    countryCode: 'CO',
    infoIdentifier: 'AGT',  // Agent
    controlInfo: 'RA',      // Regulated Agent
    additionalControlInfo: undefined,
    supplementaryControlInfo: undefined
  }
];

// Mapeo de códigos cortos IATA a valores del enum
export const RateClassCodeMap: Record<string, RateClassCode> = {
  'B': RateClassCode.BASIC_CHARGE,
  'R': RateClassCode.CLASS_RATE_REDUCTION,
  'S': RateClassCode.CLASS_RATE_SURCHARGE,
  'E': RateClassCode.INTERNATIONAL_PRIORITY_SERVICE_RATE,
  'M': RateClassCode.MINIMUM_CHARGE,
  'N': RateClassCode.NORMAL_RATE,
  'Q': RateClassCode.QUANTITY_RATE,
  'K': RateClassCode.RATE_PER_KILOGRAM,
  'C': RateClassCode.SPECIFIC_COMMODITY_RATE,
  'X': RateClassCode.UNIT_LOAD_DEVICE_ADDITIONAL_INFORMATION,
  'Y': RateClassCode.UNIT_LOAD_DEVICE_ADDITIONAL_RATE,
  'U': RateClassCode.UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE,
  'W': RateClassCode.UNIT_LOAD_DEVICE_DISCOUNT
};

// --- Internal App Types ---
export interface Party {
  name: string;
  name2?: string;
  accountNumber?: string;
  taxId?: string; // NIT/Tax ID para OCI AGT/T (identificación fiscal)
  email?: string; // Email de contacto
  fax?: string; // Número de fax
  address: {
    street: string;
    street2?: string;
    place: string;
    state?: string;
    countryCode: string;
    postalCode: string;
  };
  contact?: {
    identifier: string;
    number: string;
  };
}

export interface FlightSegment {
  /**
   * Número de vuelo. Puede incluir el carrier (QT890) o solo el número (890).
   * El componente lo usa tal cual para el campo "flight" del API.
   */
  flightNumber: string;
  date: string;
  time?: string;
  origin: string;
  destination: string;
  /**
   * Código IATA de la aerolínea (2 caracteres). OBLIGATORIO.
   * Se usa directamente para el routing del mensaje.
   * Ejemplo: "D0" para DHL, "KL" para KLM, "LA" para LATAM, "QT" para Avianca Cargo
   */
  carrierCode: string;
}

export interface SecurityInfo {
  countryCode: string;
  infoIdentifier: string;
  controlInfo: string;
  additionalControlInfo?: string;
  supplementaryControlInfo?: string;
}

export interface Dimension {
  length: number;
  width: number;
  height: number;
  pieces: number;
  unit: 'CENTIMETRE' | 'INCH';
}

export interface RateCharge {
  pieces: number;
  weight: number;
  chargeableWeight?: number;
  rateClassCode: string | RateClassCode; // Acepta código corto (Q, N, M) o enum completo
  rateOrCharge: number;
  total: number;
  description: string;
  /**
   * Override manual de goodsDescription para este rate.
   * Si se proporciona, se usa en lugar de la lógica automática (LATAM/KLM rules).
   * Ejemplo: "CONSOLIDATE FLOWERS" o "CUT FLOWERS FRESH"
   */
  goodsDescriptionOverride?: string;
  commodityCode?: string;
  /**
   * Códigos HS/HTS arancelarios para este rate.
   * Traxon API acepta múltiples códigos por rate.
   * Ejemplo: ["0603110000", "0603129000"]
   */
  hsCodes?: string[];
  /** @deprecated Usar hsCodes[] en su lugar. Se mantiene por compatibilidad. */
  hsCode?: string;
}

export interface OtherCharge {
  code: string;
  entitlement: 'DueCarrier' | 'DueAgent';
  amount: number;
  paymentMethod: 'Prepaid' | 'Collect';
}

export interface Agent {
  name: string;
  iataCode: string;
  cassCode?: string;
  place: string;
  accountNumber?: string;
}

export type ShipmentStatus = 'DRAFT' | 'TRANSMITTED' | 'ACKNOWLEDGED' | 'REJECTED';

export interface TransmissionLog {
  id: string;
  timestamp: string;
  type: 'OUTBOUND';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  payloadJson: string;
  responseMessage?: string;
  responseTimestamp?: string;
}

export interface RoutingInfo {
  senderAddress: string;    // Dirección PIMA del agente (ej: REUFFW90AVTOPF/BOG01)
  recipientAddress: string; // Dirección PIMA de la aerolínea (ej: USCAIR01LUXXSXS)
}

export interface InternalShipment {
  id: string;
  messageId?: string; // UUID/GUID opcional del backend para tracking de transmisiones
  status: ShipmentStatus;
  traxonResponse?: string; 
  awbNumber: string;
  origin: string;
  destination: string;
  pieces: number;
  weight: number;
  weightUnit: 'KILOGRAM' | 'POUND';
  volume?: number;  // Opcional
  volumeUnit?: 'CUBIC_CENTIMETRE' | 'CUBIC_METRE';  // Opcional
  dimensions?: Dimension[];  // Opcional
  description?: string;  // Opcional - se genera automático
  /**
   * Override manual del goodsDescription para el Master AWB.
   * Si se proporciona, se usa en lugar del cálculo automático (sanitizeGoodsDescription).
   * Debe estar formateado con \n para saltos de línea (máx 25 chars por línea).
   */
  goodsDescriptionOverride?: string;
  commodityCode?: string; 
  currency: string; 
  paymentMethod: 'Prepaid' | 'Collect'; 
  serviceCode?: string; // Código de servicio opcional
  slac?: number; // Shipper's Load and Count (número de piezas según shipper)
  declaredValueCarriage?: string; // Valor declarado para transporte
  declaredValueCustoms?: string; // Valor declarado para aduanas
  shipper: Party;
  consignee: Party;
  agent: Agent;
  routing?: RoutingInfo; // Opcional - tiene defaults
  flights: FlightSegment[];
  rates: RateCharge[];
  otherCharges?: OtherCharge[];  // Opcional
  oci?: SecurityInfo[];  // Opcional - se genera automático
  specialHandlingCodes?: string[];
  /**
   * Special Service Request (SSR) - Instrucciones especiales de servicio.
   * Campo opcional que va directamente al API de Traxon.
   * Ejemplo: "MUST BE KEPT ABOVE 5 DEGREES CELSIUS."
   */
  specialServiceRequest?: string;
  /**
   * Override manual del Charge Summary (Prepaid o Collect).
   * Si se proporciona desde el backend, se usa en lugar del cálculo automático.
   * Debe incluir al menos: chargeSummaryTotal
   */
  chargeSummaryOverride?: {
    totalWeightCharge?: string;
    valuationCharge?: string;
    taxes?: string;
    totalOtherChargesDueAgent?: string;
    totalOtherChargesDueCarrier?: string;
    chargeSummaryTotal: string;
  };
  executionDate?: string;  // Opcional
  executionPlace?: string;  // Opcional
  signature?: string;  // Opcional - se genera automático
  hasHouses: boolean;
  houseBills?: InternalHouseBill[];  // Opcional si hasHouses=false
  logs?: TransmissionLog[];  // Opcional
}

export interface InternalHouseBill {
  id: string;
  messageId?: string; // UUID/GUID opcional del backend para tracking del FHL
  hawbNumber: string;
  shipperName: string;  // Nombre resumido para UI
  consigneeName: string; // Nombre resumido para UI
  pieces: number;
  weight: number;
  origin?: string; // Opcional - si no viene, usa el del master AWB
  destination?: string; // Opcional - si no viene, usa el del master AWB
  /**
   * Descripción de mercancía / Nature of Goods
   * 
   * En JSON API de Traxon NO hay límite de 20 chars como en EDI legacy.
   * Puede contener hasta 500+ caracteres con información completa:
   * - Descripción de productos
   * - "INVOICES ATTACHMENT"
   * - "DOCUMENTS ATTACHMENT"  
   * - Lista de productos
   * 
   * Ejemplo: "CONSOLIDATED FLOWERS, INVOICES ATTACHMENT, DOCUMENTS ATTACHMENT, ROSES RED 50%, CARNATIONS 30%, ORCHIDS 20%"
   */
  natureOfGoods: string;
  commonName?: string;
  htsCodes?: string[];  // Códigos arancelarios HTS (múltiples permitidos, ej: ["060311", "060312"])
  // Campos completos para API Traxon (opcionales para compatibilidad)
  shipper?: Party;      // Shipper completo para FHL (requerido por Traxon API)
  consignee?: Party;    // Consignee completo para FHL (requerido por Traxon API)
}

// Type alias para compatibilidad con componentes
export type HouseBill = InternalHouseBill;

// --- Champ Traxon CargoJSON Spec Types ---

export interface ChampWeight {
  amount: string;
  unit: "KILOGRAM" | "POUND";
}

export interface ChampVolume {
  amount: string;
  unit: string;
}

export interface ChampChargeSummary {
  totalWeightCharge?: string;
  valuationCharge?: string;
  taxes?: string;
  totalOtherChargesDueAgent?: string;
  totalOtherChargesDueCarrier?: string;
  chargeSummaryTotal: string;
}

export interface ChampMessageHeader {
  addressing: {
    routeVia?: { type: string; address: string };
    routeAnswerVia?: { type: string; address: string };
    senderAddresses: Array<{ type: string; address: string }>;
    finalRecipientAddresses: Array<{ type: string; address: string }>;
    replyAnswerTo?: Array<{ type: string; address: string }>;
  };
  creationDate: string;
  edifactData?: {
    commonAccessReference?: string;
    messageReference: string;
    password?: string;
    interchangeControlReference: string;
  };
}

export interface ChampFlight {
  flight: string;
  scheduledDate: string;
  scheduledTime?: string;
}

export interface ChampRouting {
  carrierCode: string;
  destination: string;
}

export interface ChampChargeItem {
  numberOfPieces?: string;
  rateCombinationPointCityCode?: string;
  commodityItemNumber?: string[];
  grossWeight?: ChampWeight;
  goodsDescription?: string;
  consolidation?: string; // "true" or "false"
  harmonisedCommodityCode?: string[];
  isoCountryCodeOfOriginOfGoods?: string;
  packaging?: Array<{
    numberOfPieces?: string;
    weight?: ChampWeight;
    volume?: ChampVolume;
    dimensions?: {
      unit: string;
      length: string;
      width: string;
      height: string;
    };
    uld?: any;
    shippersLoadAndCount?: string;
  }>;
  charges?: Array<{
    chargeableWeight?: ChampWeight;
    rateClassCode?: string;
    rateClassCodeBasis?: string;
    classRatePercentage?: string;
    uldRateClassType?: string;
    rateOrCharge?: string;
    totalChargeAmount?: string;
  }>;
  serviceCode?: string;
}

export interface AirWayBillMessagePayload {
  type: "air waybill";
  id: string;
  messageHeader: ChampMessageHeader;
  airWaybillNumber: string;
  origin: string;
  destination: string;
  totalConsignmentNumberOfPieces: string; // Changed to string
  weight: ChampWeight;
  volume?: ChampVolume;
  densityGroup?: string;
  flights?: ChampFlight[];
  route: ChampRouting[];
  shipper: any; // AccountContact
  consignee: any; // AccountContact
  carriersExecution: {
    date: string;
    placeOrAirportCityCode: string;
    authorisationSignature?: string;
  };
  senderReference?: any;
  chargeDeclarations: {
    isoCurrencyCode: string;
    chargeCode?: string;
    payment_WeightValuation?: string;
    payment_OtherCharges?: string;
    declaredValueForCarriage?: string;
    declaredValueForCustoms?: string;
    declaredValueForInsurance?: string;
  };
  chargeItems: ChampChargeItem[];
  agent?: any; // AgentIdentification
  specialServiceRequest?: string;
  alsoNotify?: any; // AccountContact
  prepaidChargeSummary?: ChampChargeSummary;
  collectChargeSummary?: ChampChargeSummary;
  specialHandlingCodes?: string[];
  additionalSpecialHandlingCodes?: string[];
  accounting?: any[];
  otherCharges?: Array<{
    paymentCondition: string;
    otherChargeCode: string;
    entitlementCode: string;
    chargeAmount: string;
  }>;
  shippersCertification?: string;
  otherServiceInformation?: string;
  chargesCollectInDestCurrency?: any;
  customsOriginCode?: string;
  commissionInfo?: any;
  salesIncentive?: any;
  agentFileReference?: string;
  nominatedHandlingParty?: any;
  shipmentReferenceInformation?: any;
  otherParticipant?: any[];
  oci?: Array<{
    isoCountryCode?: string;
    informationIdentifier?: string;
    controlInformation?: string;
    additionalControlInformation?: string;
    supplementaryControlInformation?: string;
  }>;
}

export interface ConsolidationListMessagePayload {
  type: "consolidation list";
  id: string;
  messageHeader: ChampMessageHeader;
  airWaybillNumber: string;
  originAndDestination: {
    origin: string;
    destination: string;
  };
  quantity: {
    shipmentDescriptionCode: string;
    numberOfPieces: string;
    weight: ChampWeight;
  };
  houseWaybillSummaries: Array<{
    serialNumber: string;
    origin: string;
    destination: string;
    numberOfPieces: string;
    weight: ChampWeight;
    natureOfGoods: string;
    shippersLoadAndCount?: string;
    specialHandlingRequirementsCodes?: string[];
    freeTextDescriptionOfGoods?: string;
    harmonisedTariffScheduleInformation?: string[];
    oci?: any[];
  }>;
  shipper?: any;
  consignee?: any;
  chargeDeclarations?: any;
}

// ============================================================
// CONFIGURACIÓN DINÁMICA DEL CONECTOR
// Estas configuraciones se guardan en localStorage y persisten
// ============================================================

// Campos OCI de seguridad adicionales (configurables por usuario)
export interface SecurityOciConfig {
  // Habilitar envío de OCI de seguridad
  enabled: boolean;
  // RA - Regulated Agent: Número de certificado del agente regulado
  regulatedAgentNumber: string;
  // ED - Expiry Date: Fecha de expiración del certificado (formato MMYY)
  expiryDate: string;
  // SM - Screening Method: Método de screening (XRY, EDS, ETD, VCK, etc.)
  screeningMethod: string;
  // SD - Screening Date: Fecha/hora del screening (formato DDMMMYYHHmm)
  screeningDate: string;
  // SN - Screener Name: Nombre del responsable del screening
  screenerName: string;
}

export interface ConnectorConfig {
  // SPH Codes por defecto según prefijo de aerolínea (AWB)
  sphByAirline: Record<string, string[]>;
  
  // OCI por defecto según país de origen
  ociByOriginCountry: Record<string, Array<{
    countryCode: string;
    infoIdentifier: string;
    controlInfo: string;
    additionalControlInfo?: string;
    supplementaryControlInfo?: string;
  }>>;
  
  // Si se debe incluir NIT/RUC del shipper como OCI
  includeShipperTIN: boolean;
  
  // Si se debe incluir NIT/RUC del consignee como OCI
  includeConsigneeTIN: boolean;
  
  // Formato de OCI para TIN: 'legacy' usa ISS+additionalControlInfo, 'standard' usa SHP/CNE directo
  tinOciFormat: 'legacy' | 'standard';
  
  // Campo a usar para el NIT del shipper (si includeShipperTIN = true)
  shipperTINField: 'accountNumber' | 'oci';
  
  // Aerolíneas que requieren ECC (Electronic Consignment with Accompanying Paper)
  airlinesRequiringECC: string[];
  
  // Configuración de OCI de seguridad (RA, ED, SM, SD, SN)
  securityOci: SecurityOciConfig;
  
  // Configuración de mensajes
  messageConfig: {
    // Incluir CSL automático para consolidados
    autoGenerateCSL: boolean;
    // Timeout para envío (ms)
    sendTimeoutMs: number;
    // Reintentos automáticos
    maxRetries: number;
  };
  
  // Última actualización
  lastUpdated: string;
}

// Configuración por defecto
export const DEFAULT_CONNECTOR_CONFIG: ConnectorConfig = {
  sphByAirline: {
    '075': ['ECC', 'EAP', 'PER'],  // IBERIA
    '145': ['EAP'],                 // LATAM
    '985': ['EAP'],                 // LATAM Cargo  
    '074': ['EAP'],                 // KLM
    '057': ['EAP'],                 // Air France
    '020': ['EAP'],                 // Lufthansa
    '006': ['EAP'],                 // Delta
    '001': ['EAP'],                 // American Airlines
    '205': ['EAP'],                 // Emirates
    'DEFAULT': ['EAP']              // Todas las demás
  },
  // OCI adicionales por país de origen - vacío por defecto
  // El usuario puede agregar OCIs adicionales desde la configuración si lo requiere
  ociByOriginCountry: {
    'CO': [],
    'EC': [],
    'PE': [],
    'DEFAULT': []
  },
  includeShipperTIN: false,      // Por defecto NO enviar NIT del shipper (exportador)
  includeConsigneeTIN: true,     // Por defecto SÍ enviar NIT del consignee/importer
  tinOciFormat: 'legacy',  // Usar formato legacy: AGT/T/NIT
  shipperTINField: 'oci',
  airlinesRequiringECC: ['075'],  // Solo Iberia por defecto
  securityOci: {
    enabled: false,  // Deshabilitado por defecto - el usuario lo activa si la aerolínea lo requiere
    regulatedAgentNumber: '',  // RA: Número de certificado del agente regulado (ej: 00100-01)
    expiryDate: '',            // ED: Fecha expiración MMYY (ej: 1225 = Dic 2025)
    screeningMethod: '',       // SM: Método de screening (XRY, EDS, VCK, ETD)
    screeningDate: '',         // SD: Fecha/hora screening DDMMMYYHHmm (ej: 24DEC252359)
    screenerName: ''           // SN: Nombre del responsable
  },
  messageConfig: {
    autoGenerateCSL: true,
    sendTimeoutMs: 30000,
    maxRetries: 3
  },
  lastUpdated: new Date().toISOString()
};

// Función para cargar configuración desde localStorage
export function loadConnectorConfig(): ConnectorConfig {
  try {
    const saved = localStorage.getItem('traxon_connector_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge con defaults para asegurar que nuevos campos existan
      return { ...DEFAULT_CONNECTOR_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Error loading connector config:', e);
  }
  return DEFAULT_CONNECTOR_CONFIG;
}

// Función para guardar configuración
export function saveConnectorConfig(config: ConnectorConfig): void {
  try {
    config.lastUpdated = new Date().toISOString();
    localStorage.setItem('traxon_connector_config', JSON.stringify(config));
  } catch (e) {
    console.error('Error saving connector config:', e);
  }
}

// Función para resetear a defaults
export function resetConnectorConfig(): ConnectorConfig {
  localStorage.removeItem('traxon_connector_config');
  return DEFAULT_CONNECTOR_CONFIG;
}

