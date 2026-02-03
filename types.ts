// ============================================================
// MESSAGE PROVIDER TYPES - CARGO-IMP (EDI)
// ============================================================

/**
 * Proveedor de mensajería: CARGO-IMP
 * Formato EDI plano IATA CIMP (FWB/16, FHL/4)
 */
export type MessageProvider = 'CARGO_IMP';

/**
 * Formato de mensaje: EDI plano IATA CIMP
 */
export type MessageFormat = 'CARGO_EDI';

/**
 * Información del proveedor para UI
 */
export const MESSAGE_PROVIDER_INFO: Record<MessageProvider, {
  name: string;
  format: MessageFormat;
  description: string;
  messageTypes: string[];
}> = {
  'CARGO_IMP': {
    name: 'CARGO-IMP (EDI)',
    format: 'CARGO_EDI',
    description: 'Formato EDI plano IATA CIMP - FWB/16, FWB/17, FHL/4',
    messageTypes: ['FWB', 'FHL']
  }
};

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
// SPECIAL HANDLING CODES - Códigos estándar IATA para CARGO-IMP
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
// OCI CONTROL INFO - Códigos estándar IATA para información regulatoria
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
  contactPerson?: string; // Nombre de persona de contacto (para OCI CP)
  address: {
    street: string;
    street2?: string;
    place: string;
    state?: string;
    countryCode: string;
    countryName?: string; // Nombre completo del país (ej: "People's Republic of China")
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

/**
 * Accounting Information - Información contable
 * Según IATA cargoJSON API y FWB segment ACC
 * Usado para información de pago, referencias gubernamentales, etc.
 */
export interface AccountingInfo {
  /**
   * Identificador del tipo de información contable
   * Valores: GovernmentBillOfLading, CreditCardNumber, ShippersReferenceNumber, etc.
   */
  identifier: string;
  /**
   * Detalle de la información contable (máx 34 chars para EDI)
   * Ejemplo: "PAYMENT BY CERTIFIED CHEQUE"
   */
  accountingInformation: string;
}

/**
 * Also Notify Party - Parte a notificar
 * Según IATA cargoJSON API y FWB segment NFY
 * Persona/empresa adicional a ser notificada sobre el envío
 */
export interface AlsoNotifyParty {
  /**
   * Número de cuenta (opcional)
   */
  accountNumber?: string;
  /**
   * Nombre de la parte a notificar (máx 35 chars)
   */
  name: string;
  /**
   * Nombre adicional / línea 2 (máx 35 chars)
   */
  name2?: string;
  /**
   * Dirección de la parte a notificar
   */
  address?: {
    street?: string;
    street2?: string;
    place: string;
    state?: string;
    countryCode: string;
    postalCode?: string;
  };
  /**
   * Información de contacto
   */
  contact?: {
    identifier: string; // TE, FX, EM
    number: string;
  };
}

export interface Dimension {
  length: number;
  width: number;
  height: number;
  pieces: number;
  unit: 'CENTIMETRE' | 'INCH';
}

/**
 * Unit Load Device (ULD) - Contenedor/Pallet para transporte aéreo
 * Según IATA Cargo-XML: AssociatedUnitLoadTransportEquipment
 * Referencia: riege/one-record-converter 888-11111111_XFWB_multipleULD_multipleHTS.xml
 */
export interface ULD {
  /**
   * Número serial del ULD (ej: 1337, 4711)
   */
  serialNumber: string;
  /**
   * Código de tipo de ULD según IATA (ej: PMC, AKE, AKH, AAP, etc.)
   * PMC = Pallet + Net, AKE = LD3 Container, etc.
   */
  typeCode: string;
  /**
   * Código de la aerolínea operadora del ULD (ej: XX, LH, DL)
   */
  ownerCode?: string;
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
   * Cantidad de paquetes/bultos para este rate.
   * Según IATA Cargo-XML: PackageQuantity
   * Opcional - si no se especifica, se usa pieces
   */
  packageQuantity?: number;
  /**
   * Códigos HS/HTS arancelarios para este rate.
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
  locationCode?: string;  // Código de ubicación para SpecifiedCargoAgentLocation
  phone?: string;         // Teléfono para DefinedTradeContact
  postalCode?: string;    // Código postal para FreightForwarderAddress
  street?: string;        // Dirección para FreightForwarderAddress
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
  
  // Campo opcional para CargoXML XFZB - segundo RecipientParty con schemeID="P"
  // Según Riege XFZB puede tener múltiples RecipientParty (C y P)
  recipientParticipantAddress?: string; // Ej: REUAIR08$CODE
}

/**
 * Configuración de transmisión a Descartes.
 * Estos valores vienen del backend y se usan para enviar mensajes EDI.
 */
export interface DescartesTransmitConfig {
  /** URL del endpoint de Descartes (ej: https://wwwtest.myvan.descartes.com/HttpUpload/SimpleUploadHandler.aspx) */
  endpoint: string;
  /** Usuario para Basic Auth */
  username: string;
  /** Contraseña para Basic Auth */
  password: string;
  /** Si la transmisión está habilitada */
  enabled?: boolean;
}

export interface InternalShipment {
  id: string;
  messageId?: string; // UUID/GUID opcional del backend para tracking de transmisiones
  status: ShipmentStatus;
  
  /**
   * Proveedor de mensajería: 'CARGO_IMP' para mensajes EDI (FWB/FHL)
   */
  provider?: MessageProvider;
  
  /**
   * Referencia del remitente para el MessageHeaderDocument.
   * Según IATA Cargo-XML 3.0: SenderAssignedID en BusinessHeaderDocument.
   * Opcional - si no se proporciona, se genera automáticamente.
   */
  senderReference?: string;
  
  /**
   * Código de estado aduanero según IATA Cargo-XML.
   * Según UN/CEFACT: T = Transit, X = Export cleared, etc.
   * Opcional - usado en CustomsStatusCode element.
   */
  customsStatusCode?: string;
  
  /**
   * Total de impuestos (taxes) para charge summary.
   * Se suma a TotalCollectOtherChargeAmount o TotalPrepaidOtherChargeAmount.
   */
  taxTotal?: number;
  
  /**
   * Total debido al carrier (payable carrier).
   * Usado en ApplicableTotalRating > CarrierTotalDuePayableAmount.
   */
  carrierDuePayable?: number;
  
  /**
   * Total debido al agente (payable agent).
   * Usado en ApplicableTotalRating > AgentTotalDuePayableAmount.
   */
  agentDuePayable?: number;
  
  awbNumber: string;
  origin: string;
  destination: string;
  pieces: number;
  weight: number;
  weightUnit: 'KILOGRAM' | 'POUND';
  volume?: number;  // Opcional
  volumeUnit?: 'CUBIC_CENTIMETRE' | 'CUBIC_METRE';  // Opcional
  dimensions?: Dimension[];  // Opcional
  /**
   * Unit Load Devices (ULDs) - Contenedores/Pallets para transporte aéreo
   * Opcional - usado para envíos con pallets, containers LD3, etc.
   * Según IATA Cargo-XML: AssociatedUnitLoadTransportEquipment
   * Referencia: riege/one-record-converter 888-11111111_XFWB_multipleULD_multipleHTS.xml
   */
  ulds?: ULD[];
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
   * Ejemplo: "MUST BE KEPT ABOVE 5 DEGREES CELSIUS."
   */
  specialServiceRequest?: string;
  /**
   * Also Notify Party - Parte adicional a notificar sobre el envío.
   * Opcional. Se mapea a:
   * - EDI: Segmento NFY (NH en algunas aerolíneas)
   * - Cargo-XML: AssociatedParty con RoleCode="NI"
   * - JSON: alsoNotify object
   */
  alsoNotify?: AlsoNotifyParty;
  /**
   * Accounting Information - Información contable.
   * Opcional. Array de líneas de información contable.
   * Se mapea a:
   * - EDI: Segmento ACC (múltiples líneas)
   * - Cargo-XML: AccountingInformation element
   * - JSON: accounting array
   */
  accounting?: AccountingInfo[];
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
  
  /**
   * Configuración de transmisión a Descartes.
   * Opcional - si viene del backend, habilita el botón "Transmitir".
   * Si no está presente, solo se muestra "Copiar EDI".
   */
  descartesConfig?: DescartesTransmitConfig;
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
   * Ejemplo: "CONSOLIDATED FLOWERS, ROSES, CARNATIONS"
   */
  natureOfGoods: string;
  commonName?: string;
  htsCodes?: string[];  // Códigos arancelarios HTS (múltiples permitidos, ej: ["060311", "060312"])
  // Campos completos para FHL
  shipper?: Party;      // Shipper completo para FHL
  consignee?: Party;    // Consignee completo para FHL
  
  // ============================================================
  // CAMPOS ADICIONALES PARA CARGO-XML (XFZB) - según Riege reference
  // ============================================================
  currency?: string;           // Moneda para cargos del house (ISO 4217)
  totalCharge?: number;        // Total de cargos del house
  packageQuantity?: number;    // Número de bultos/cajas (diferente de pieces)
  chargeableWeight?: number;   // Peso cobrable (volumétrico o real)
  volume?: number;             // Volumen en CBM
  customerReference?: string;  // Referencia del cliente / número de pedido
  incoterm?: string;           // Término de comercio (CIP, FOB, etc.)
  informationCode?: string;    // Código de información (NDA = No Dangerous Articles)
}

// Type alias para compatibilidad con componentes
export type HouseBill = InternalHouseBill;

// --- Types for CARGO-IMP EDI Generation ---

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

/**
 * Configuración de CARGO-IMP (EDI)
 */
export interface CargoImpConfig {
  /** Versión FWB a usar: FWB/16 o FWB/17 */
  fwbVersion: 'FWB/16' | 'FWB/17';
  /** Versión FHL a usar: FHL/2 o FHL/4 */
  fhlVersion: 'FHL/2' | 'FHL/4';
  /** Incluir envoltorio UN/EDIFACT UNB/UNZ */
  includeUNB_UNZ: boolean;
  /** Usar prefijo EORI en OCI (true para EU, false para EC/LATAM) */
  ociWithEori: boolean;
  /** Códigos SPH por defecto para CARGO-IMP */
  defaultSphCodes: string[];
  /** Segmentos FWB habilitados */
  enabledFwbSegments: string[];
  /** Segmentos FHL habilitados */
  enabledFhlSegments: string[];
  /** Políticas personalizadas por aerolínea (prefijo AWB) */
  airlinePolicies: Record<string, CargoImpAirlinePolicy>;
  
  // ==================== CONFIGURACIÓN EDIFACT ====================
  
  /** 
   * Número de control EDIFACT (UNB/UNH/UNT/UNZ)
   * Si está vacío, se genera dinámicamente
   * Formato: 14 dígitos, ej: '96728316614806'
   */
  controlNumber: string;
  
  /**
   * Sender ID para mensajes EDIFACT
   * Se usa este valor fijo, independiente del país del shipper
   * Ej: 'REUAGT89COCRGMASTER/BOG01:PIMA'
   */
  senderId: string;
  
  /**
   * Firma por defecto para CER e ISU
   * Ej: 'CARGOOP', 'DSVOP'
   */
  defaultSignature: string;
}

/**
 * Política CARGO-IMP específica por aerolínea
 */
export interface CargoImpAirlinePolicy {
  fwbVersion?: 'FWB/16' | 'FWB/17';
  fhlVersion?: 'FHL/2' | 'FHL/4';
  includeUNB_UNZ?: boolean;
  ociWithEori?: boolean;
  sphCodes?: string[];
  /** Segmentos FWB habilitados para esta aerolínea */
  enabledSegments?: string[];
  /** Segmentos FWB deshabilitados para esta aerolínea */
  disabledSegments?: string[];
  /** Segmentos FHL habilitados para esta aerolínea */
  enabledFhlSegments?: string[];
  /** Segmentos FHL deshabilitados para esta aerolínea */
  disabledFhlSegments?: string[];
  /** Notas adicionales */
  notes?: string;
  
  // ==================== NUEVAS PROPIEDADES CARGO-IMP ====================
  
  /** 
   * Número de caso de política de mensaje:
   * - 20: FWB estándar + FHL individuales (consolidado)
   * - 21: FWB estándar (directo)
   * - 40: FWB_NEW + FHL individuales
   * - 41: FWB_NEW directo
   * - 50: FWB_NEW + FHL concatenadas con '&'
   * - 51: FWB_NEW + FHL concatenadas directo
   * - 70: DHL/ABX - FHL siempre con header EDIFACT
   * - 71: DHL/ABX directo
   * - 80: Todas FHL en 1 mensaje, MBI solo en primera
   * - 81: MBI only first (directo)
   */
  casePolicy?: 20 | 21 | 40 | 41 | 50 | 51 | 70 | 71 | 80 | 81;
  
  /** FHL siempre incluye header/footer EDIFACT (Case 7: DHL/ABX) */
  fhlAlwaysWithHeader?: boolean;
  
  /** MBI solo en primera HAWB de un mensaje concatenado (Case 8) */
  mbiOnlyFirstHawb?: boolean;
  
  /** Usar nombre de agencia en lugar de agente para CER */
  useAgencyNameForCER?: boolean;
  
  /** Requiere código HTS en posición especial */
  requiresHTS?: boolean;
  
  /** Requiere código postal para China */
  requiresChinaPostalCode?: boolean;
  
  /** Usar variante NG consolidada */
  useConsolidatedNG?: boolean;
  
  /** 
   * Prefijos de HAWB que deben agregar 0 adelante
   * Ej: ['CM', 'SK', 'LG'] → se convierten en '0CM', '0SK', '0LG'
   */
  hawbPrefixAdd0?: string[];
  
  /** Dirección de la aerolínea para CVD */
  airlineAddress?: string;
  
  /** Usar formato FWB/9 (legado) en lugar de FWB/16+ */
  useFwb9?: boolean;
  
  /** País del emisor: 'EC' = Ecuador, 'CO' = Colombia */
  senderCountry?: 'EC' | 'CO';
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
  
  // Configuración de CARGO-IMP (EDI)
  cargoImp: CargoImpConfig;
  
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
  // Configuración CARGO-IMP (EDI)
  cargoImp: {
    fwbVersion: 'FWB/16',
    fhlVersion: 'FHL/4',
    includeUNB_UNZ: false,
    ociWithEori: false,  // false = Formato Ecuador/LATAM sin prefijo EORI
    defaultSphCodes: ['EAP', 'PER'],
    enabledFwbSegments: ['AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'SPH', 'OCI', 'CER', 'ISU'],
    enabledFhlSegments: ['MBI', 'TXT', 'HBS', 'OCI'],
    // Control Number fijo para EDIFACT (si vacío se genera dinámicamente)
    controlNumber: '96728316614806',
    // Sender ID fijo (se usa siempre, independiente del país del shipper)
    senderId: 'REUAGT89COCRGMASTER/BOG01:PIMA',
    // Firma por defecto para CER e ISU
    defaultSignature: 'CARGOOP',
    // Políticas por aerolínea según documentación legacy
    // Cada aerolínea puede tener requisitos específicos de versión, segmentos y formato OCI
    airlinePolicies: {
      '075': { // IBERIA - Case 2, Option 0
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: true,  // UE requiere EORI
        sphCodes: ['ECC', 'EAP', 'PER'],
        enabledSegments: ['FWB', 'AWB', 'RTG', 'SHP', 'CNE', 'AGT', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['FLT', 'SSR', 'ACC', 'OTH', 'CER', 'NFY']
      },
      '145': { // LATAM - Case 2, Option 1
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,  // LATAM no requiere EORI
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH', 'NFY']
      },
      '074': { // KLM - Case 2, Option 4
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: true,  // UE requiere EORI
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['NFY'],
        notes: 'KLM requiere todos los segmentos incluyendo OTH'
      },
      '157': { // QATAR - Case 2, Option 3
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['FLT', 'NFY']
      },
      '369': { // ATLAS/Ethiopian - Case 2, Option 2
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: false,  // Sin wrapper EDIFACT
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI'],
        disabledSegments: ['FWB', 'FTR', 'OTH', 'NFY'],  // Sin header/footer
        notes: 'Atlas/Ethiopian: sin header UNB/UNH ni footer UNT/UNZ'
      },
      '057': { // AIR FRANCE
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: true,  // UE requiere EORI
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH', 'NFY']
      },
      '020': { // LUFTHANSA
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: true,  // UE requiere EORI
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH', 'NFY']
      },
      '205': { // EMIRATES (prefijo AWB real)
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH', 'NFY'],
        notes: 'Emirates: prefijo AWB 205'
      },
      '176': { // EMIRATES (código IATA numérico alternativo) - Case 4
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['NFY'],
        useAgencyNameForCER: true,
        notes: 'Emirates 176: CER usa nombre de agencia'
      },
      '235': { // TURKISH AIRLINES - Case 4
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'OTH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['NFY'],
        requiresHTS: true,
        notes: 'Turkish Airlines: requiere código HTS'
      },
      '985': { // LATAM CARGO - Case 2
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH', 'NFY'],
        useConsolidatedNG: true,
        notes: 'LATAM Cargo: NG especial para consolidados'
      },
      '045': { // AVIANCA CARGO - Case 2
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH', 'NFY']
      },
      // === CASO 7: DHL / ABX - FHL siempre con header EDIFACT ===
      '992': { // DHL AVIATION - Case 7
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'NFY', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH'],
        fhlAlwaysWithHeader: true,
        notes: 'DHL Aviation: Caso 7 - FHL siempre incluye header/footer EDIFACT'
      },
      '999': { // POLAR AIR CARGO (DHL) - Case 7
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'NFY', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH'],
        fhlAlwaysWithHeader: true,
        notes: 'Polar Air (DHL): Caso 7'
      },
      '155': { // ABX AIR - Case 7
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'NFY', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH'],
        fhlAlwaysWithHeader: true,
        notes: 'ABX Air: Caso 7 - FHL siempre incluye header/footer EDIFACT'
      },
      // DEFAULT - Se usa para cualquier aerolínea no configurada explícitamente
      'DEFAULT': {
        fwbVersion: 'FWB/16',
        fhlVersion: 'FHL/4',
        includeUNB_UNZ: true,
        ociWithEori: false,  // Por defecto sin EORI (cambiar si destino es UE)
        sphCodes: ['EAP'],
        enabledSegments: ['FWB', 'AWB', 'FLT', 'RTG', 'SHP', 'CNE', 'AGT', 'SSR', 'ACC', 'CVD', 'RTD', 'NG', 'NH', 'PPD', 'COL', 'CER', 'ISU', 'REF', 'SPH', 'OCI', 'FTR'],
        disabledSegments: ['OTH', 'NFY'],
        notes: 'Política por defecto para aerolíneas no configuradas. Ajustar según requisitos.'
      }
    }
  },
  lastUpdated: new Date().toISOString()
};

// Función para cargar configuración desde localStorage
export function loadConnectorConfig(): ConnectorConfig {
  try {
    const saved = localStorage.getItem('cargo_imp_connector_config');
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
    localStorage.setItem('cargo_imp_connector_config', JSON.stringify(config));
  } catch (e) {
    console.error('Error saving connector config:', e);
  }
}

// Función para resetear a defaults
export function resetConnectorConfig(): ConnectorConfig {
  localStorage.removeItem('cargo_imp_connector_config');
  return DEFAULT_CONNECTOR_CONFIG;
}

