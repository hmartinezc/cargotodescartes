/**
 * TRAXON cargoJSON API - Enums Oficiales
 * Referencia: Documentación API Traxon cargoJSON
 * Todos los valores con descripciones en español para tooltips
 */

// ============================================================
// WEIGHT UNIT - Unidad de Peso
// ============================================================
export const WeightUnitEnum = {
  KILOGRAM: { value: 'KILOGRAM', label: 'Kilogramos', description: 'Peso en kilogramos (kg)' },
  POUND: { value: 'POUND', label: 'Libras', description: 'Peso en libras (lb)' }
} as const;

export type WeightUnitType = keyof typeof WeightUnitEnum;

// ============================================================
// VOLUME UNIT - Unidad de Volumen
// ============================================================
export const VolumeUnitEnum = {
  CUBIC_CENTIMETRE: { value: 'CUBIC_CENTIMETRE', label: 'cm³', description: 'Centímetros cúbicos' },
  CUBIC_FOOT: { value: 'CUBIC_FOOT', label: 'ft³', description: 'Pies cúbicos' },
  CUBIC_INCH: { value: 'CUBIC_INCH', label: 'in³', description: 'Pulgadas cúbicas' },
  CUBIC_METRE: { value: 'CUBIC_METRE', label: 'm³', description: 'Metros cúbicos' }
} as const;

export type VolumeUnitType = keyof typeof VolumeUnitEnum;

// ============================================================
// LENGTH UNIT - Unidad de Longitud (para dimensiones)
// ============================================================
export const LengthUnitEnum = {
  CENTIMETRE: { value: 'CENTIMETRE', label: 'cm', description: 'Centímetros' },
  DECIMETRE: { value: 'DECIMETRE', label: 'dm', description: 'Decímetros' },
  FOOT: { value: 'FOOT', label: 'ft', description: 'Pies' },
  INCH: { value: 'INCH', label: 'in', description: 'Pulgadas' },
  METRE: { value: 'METRE', label: 'm', description: 'Metros' },
  MILLIMETRE: { value: 'MILLIMETRE', label: 'mm', description: 'Milímetros' },
  YARD: { value: 'YARD', label: 'yd', description: 'Yardas' }
} as const;

// ============================================================
// DENSITY GROUP - Grupo de Densidad
// ============================================================
export const DensityGroupEnum = {
  KG60_PER_CUBICMETRE: { value: 'KG60_PER_CUBICMETRE', label: '60 kg/m³', description: 'Carga ligera (60 kg por metro cúbico)' },
  KG90_PER_CUBICMETRE: { value: 'KG90_PER_CUBICMETRE', label: '90 kg/m³', description: 'Densidad baja (90 kg por metro cúbico)' },
  KG120_PER_CUBICMETRE: { value: 'KG120_PER_CUBICMETRE', label: '120 kg/m³', description: 'Densidad media-baja' },
  KG160_PER_CUBICMETRE: { value: 'KG160_PER_CUBICMETRE', label: '160 kg/m³', description: 'Densidad media' },
  KG220_PER_CUBICMETRE: { value: 'KG220_PER_CUBICMETRE', label: '220 kg/m³', description: 'Densidad media-alta' },
  KG250_PER_CUBICMETRE: { value: 'KG250_PER_CUBICMETRE', label: '250 kg/m³', description: 'Densidad alta' },
  KG300_PER_CUBICMETRE: { value: 'KG300_PER_CUBICMETRE', label: '300 kg/m³', description: 'Carga densa' },
  KG400_PER_CUBICMETRE: { value: 'KG400_PER_CUBICMETRE', label: '400 kg/m³', description: 'Carga muy densa' },
  KG600_PER_CUBICMETRE: { value: 'KG600_PER_CUBICMETRE', label: '600 kg/m³', description: 'Carga pesada' },
  KG950_PER_CUBICMETRE: { value: 'KG950_PER_CUBICMETRE', label: '950 kg/m³', description: 'Carga ultra pesada' }
} as const;

export type DensityGroupType = keyof typeof DensityGroupEnum;

// ============================================================
// PAYMENT CONDITION - Condición de Pago
// ============================================================
export const PaymentConditionEnum = {
  Prepaid: { value: 'Prepaid', label: 'Prepagado', description: 'Pago realizado en origen' },
  Collect: { value: 'Collect', label: 'Por Cobrar', description: 'Pago a realizar en destino' }
} as const;

export type PaymentConditionType = keyof typeof PaymentConditionEnum;

// ============================================================
// CHARGE CODE - Código de Cargo (método de pago)
// ============================================================
export const ChargeCodeEnum = {
  ALL_CHARGES_COLLECT: { value: 'ALL_CHARGES_COLLECT', label: 'Todo Collect', description: 'Todos los cargos por cobrar en destino' },
  ALL_CHARGES_PREPAID_CASH: { value: 'ALL_CHARGES_PREPAID_CASH', label: 'Todo Prepago Efectivo', description: 'Todos prepagados en efectivo' },
  ALL_CHARGES_PREPAID_CREDIT: { value: 'ALL_CHARGES_PREPAID_CREDIT', label: 'Todo Prepago Crédito', description: 'Todos prepagados a crédito' },
  ALL_CHARGES_PREPAID_BY_CREDIT_CARD: { value: 'ALL_CHARGES_PREPAID_BY_CREDIT_CARD', label: 'Prepago T. Crédito', description: 'Prepagado con tarjeta de crédito' },
  ALL_CHARGES_COLLECT_BY_CREDIT_CARD: { value: 'ALL_CHARGES_COLLECT_BY_CREDIT_CARD', label: 'Collect T. Crédito', description: 'Por cobrar con tarjeta de crédito' },
  NO_CHARGE: { value: 'NO_CHARGE', label: 'Sin Cargo', description: 'Sin cargos aplicables' },
  DESTINATION_COLLECT_CASH: { value: 'DESTINATION_COLLECT_CASH', label: 'Collect Efectivo Destino', description: 'Por cobrar en efectivo en destino' },
  DESTINATION_COLLECT_CREDIT: { value: 'DESTINATION_COLLECT_CREDIT', label: 'Collect Crédito Destino', description: 'Por cobrar a crédito en destino' }
} as const;

export type ChargeCodeType = keyof typeof ChargeCodeEnum;

// ============================================================
// RATE CLASS CODE - Código de Clase de Tarifa
// ============================================================
export const RateClassCodeEnum = {
  BASIC_CHARGE: { value: 'BASIC_CHARGE', code: 'B', label: 'Cargo Básico', description: 'Tarifa básica estándar' },
  CLASS_RATE_REDUCTION: { value: 'CLASS_RATE_REDUCTION', code: 'R', label: 'Reducción', description: 'Descuento sobre tarifa clase' },
  CLASS_RATE_SURCHARGE: { value: 'CLASS_RATE_SURCHARGE', code: 'S', label: 'Recargo', description: 'Recargo sobre tarifa clase' },
  MINIMUM_CHARGE: { value: 'MINIMUM_CHARGE', code: 'M', label: 'Cargo Mínimo', description: 'Cargo mínimo aplicable' },
  NORMAL_RATE: { value: 'NORMAL_RATE', code: 'N', label: 'Tarifa Normal', description: 'Tarifa normal general' },
  QUANTITY_RATE: { value: 'QUANTITY_RATE', code: 'Q', label: 'Tarifa por Cantidad', description: 'Tarifa basada en cantidad/peso' },
  RATE_PER_KILOGRAM: { value: 'RATE_PER_KILOGRAM', code: 'K', label: 'Tarifa por Kg', description: 'Tarifa por kilogramo' },
  SPECIFIC_COMMODITY_RATE: { value: 'SPECIFIC_COMMODITY_RATE', code: 'C', label: 'SCR', description: 'Tarifa específica por commodity' },
  UNIT_LOAD_DEVICE_ADDITIONAL_RATE: { value: 'UNIT_LOAD_DEVICE_ADDITIONAL_RATE', code: 'Y', label: 'ULD Adicional', description: 'Tarifa adicional ULD' },
  UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE: { value: 'UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE', code: 'U', label: 'ULD Básico', description: 'Cargo/tarifa básica ULD' },
  UNIT_LOAD_DEVICE_DISCOUNT: { value: 'UNIT_LOAD_DEVICE_DISCOUNT', code: 'W', label: 'Descuento ULD', description: 'Descuento por uso de ULD' }
} as const;

// Mapeo código corto → enum value
export const RateClassCodeShortMap: Record<string, string> = {
  'B': 'BASIC_CHARGE', 'R': 'CLASS_RATE_REDUCTION', 'S': 'CLASS_RATE_SURCHARGE',
  'M': 'MINIMUM_CHARGE', 'N': 'NORMAL_RATE', 'Q': 'QUANTITY_RATE',
  'K': 'RATE_PER_KILOGRAM', 'C': 'SPECIFIC_COMMODITY_RATE',
  'Y': 'UNIT_LOAD_DEVICE_ADDITIONAL_RATE', 'U': 'UNIT_LOAD_DEVIDE_BASIC_CHARGE_OR_RATE',
  'W': 'UNIT_LOAD_DEVICE_DISCOUNT'
};

// ============================================================
// SERVICE CODE - Código de Servicio
// ============================================================
export const ServiceCodeEnum = {
  AIRPORT_TO_AIRPORT: { value: 'AIRPORT_TO_AIRPORT', label: 'Aeropuerto-Aeropuerto', description: 'Servicio entre aeropuertos' },
  DOOR_TO_DOOR_SERVICE: { value: 'DOOR_TO_DOOR_SERVICE', label: 'Puerta-Puerta', description: 'Servicio puerta a puerta completo' },
  AIRPORT_TO_DOOR: { value: 'AIRPORT_TO_DOOR', label: 'Aeropuerto-Puerta', description: 'Desde aeropuerto hasta destino final' },
  DOOR_TO_AIRPORT: { value: 'DOOR_TO_AIRPORT', label: 'Puerta-Aeropuerto', description: 'Desde origen hasta aeropuerto' },
  PRIORITY_SERVICE: { value: 'PRIORITY_SERVICE', label: 'Prioritario', description: 'Servicio con prioridad' },
  EXPRESS_SHIPMENT: { value: 'EXRESS_SHIPMENT', label: 'Express', description: 'Envío express/urgente' }
} as const;

export type ServiceCodeType = keyof typeof ServiceCodeEnum;

// ============================================================
// ENTITLEMENT CODE - Código de Titularidad (para otros cargos)
// ============================================================
export const EntitlementCodeEnum = {
  Agent: { value: 'Agent', label: 'Agente', description: 'Cargo debido al agente' },
  Carrier: { value: 'Carrier', label: 'Aerolínea', description: 'Cargo debido a la aerolínea' }
} as const;

// ============================================================
// OTHER CHARGE CODE - Códigos de Otros Cargos (más comunes)
// ============================================================
export const OtherChargeCodeEnum = {
  // Cargos más frecuentes en Colombia/LATAM
  AW: { value: 'AW', label: 'AWB Fee', description: 'Cargo por emisión de guía aérea' },
  FC: { value: 'FC', label: 'Fuel Charge', description: 'Recargo por combustible' },
  SC: { value: 'SC', label: 'Security Charge', description: 'Cargo por seguridad' },
  MY: { value: 'MY', label: 'Customs Fee', description: 'Cargo por trámites aduaneros' },
  TX: { value: 'TX', label: 'Taxes', description: 'Impuestos aplicables' },
  RA: { value: 'RA', label: 'Dangerous Goods', description: 'Recargo mercancía peligrosa' },
  CC: { value: 'CC', label: 'Chgs Collect Fee', description: 'Cargo por cobro en destino' },
  CH: { value: 'CH', label: 'Clearance Handling', description: 'Manejo de desaduanaje' },
  DB: { value: 'DB', label: 'Disbursement Fee', description: 'Cargo por desembolso' },
  IN: { value: 'IN', label: 'Insurance', description: 'Seguro de carga' },
  MA: { value: 'MA', label: 'Misc - Loss/Damage', description: 'Misceláneo - pérdida/daño' },
  PK: { value: 'PK', label: 'Packing', description: 'Cargo por empaque' },
  PU: { value: 'PU', label: 'Pick Up', description: 'Cargo por recolección' },
  SD: { value: 'SD', label: 'Surface Charge Dest', description: 'Cargo terrestre destino' },
  SO: { value: 'SO', label: 'Storage Origin', description: 'Almacenaje en origen' },
  SR: { value: 'SR', label: 'Storage Destination', description: 'Almacenaje en destino' },
  UC: { value: 'UC', label: 'Customs Clearance', description: 'Desaduanaje' }
} as const;

export type OtherChargeCodeType = keyof typeof OtherChargeCodeEnum;

// ============================================================
// SPECIAL HANDLING CODES (SPH) - Códigos de Manejo Especial
// ============================================================
export const SpecialHandlingCodeEnum = {
  // Seguridad
  EAP: { value: 'EAP', label: 'e-AWB Participant', description: 'Participante e-AWB (guía electrónica)', category: 'security' },
  ECC: { value: 'ECC', label: 'Electronic + Paper', description: 'Electrónico con papel acompañante', category: 'security' },
  SPX: { value: 'SPX', label: 'Secure Examined', description: 'Carga examinada/segura', category: 'security' },
  SPF: { value: 'SPF', label: 'Secure Protected', description: 'Carga protegida/segura', category: 'security' },
  NSC: { value: 'NSC', label: 'Not Secured', description: 'Carga no asegurada', category: 'security' },
  
  // Perecederos
  PER: { value: 'PER', label: 'Perishable', description: 'Carga perecedera general', category: 'perishable' },
  PEP: { value: 'PEP', label: 'Fruits/Vegetables', description: 'Frutas y vegetales perecederos', category: 'perishable' },
  PEF: { value: 'PEF', label: 'Fresh Fish', description: 'Pescado/mariscos frescos', category: 'perishable' },
  PES: { value: 'PES', label: 'Live Tropical Fish', description: 'Peces tropicales vivos', category: 'perishable' },
  PEA: { value: 'PEA', label: 'Live Hatching Eggs', description: 'Huevos para incubar', category: 'perishable' },
  PEM: { value: 'PEM', label: 'Meat/Seafood', description: 'Carne/mariscos', category: 'perishable' },
  RFL: { value: 'RFL', label: 'Flowers', description: 'Flores frescas', category: 'perishable' },
  
  // Temperatura
  COL: { value: 'COL', label: 'Cool Goods', description: 'Requiere refrigeración (2-8°C)', category: 'temperature' },
  FRO: { value: 'FRO', label: 'Frozen', description: 'Requiere congelación (-18°C)', category: 'temperature' },
  FRI: { value: 'FRI', label: 'Frozen -20°C', description: 'Congelado especial (-20°C)', category: 'temperature' },
  ERT: { value: 'ERT', label: 'Temp Controlled', description: 'Control de temperatura requerido', category: 'temperature' },
  
  // Animales vivos
  AVI: { value: 'AVI', label: 'Live Animals', description: 'Animales vivos', category: 'live' },
  
  // Mercancía peligrosa
  DGR: { value: 'DGR', label: 'Dangerous Goods', description: 'Mercancía peligrosa regulada', category: 'dangerous' },
  ICE: { value: 'ICE', label: 'Dry Ice', description: 'Contiene hielo seco', category: 'dangerous' },
  RCM: { value: 'RCM', label: 'Radioactive Cat I', description: 'Material radioactivo Cat I', category: 'dangerous' },
  MAG: { value: 'MAG', label: 'Magnetized', description: 'Material magnetizado', category: 'dangerous' },
  
  // Dimensiones/peso especial
  HEA: { value: 'HEA', label: 'Heavy Cargo', description: 'Carga pesada (>150kg/pieza)', category: 'oversized' },
  BIG: { value: 'BIG', label: 'Outsized', description: 'Carga sobredimensionada', category: 'oversized' },
  
  // Valor
  VAL: { value: 'VAL', label: 'Valuable', description: 'Carga de alto valor', category: 'special' },
  VUN: { value: 'VUN', label: 'Vulnerable', description: 'Carga vulnerable/frágil', category: 'special' },
  
  // Farmacéuticos
  PIL: { value: 'PIL', label: 'Pharmaceuticals', description: 'Productos farmacéuticos', category: 'pharma' },
  
  // Otros
  CAO: { value: 'CAO', label: 'Cargo Only', description: 'Solo avión carguero', category: 'other' },
  HUM: { value: 'HUM', label: 'Human Remains', description: 'Restos humanos', category: 'other' },
  DIP: { value: 'DIP', label: 'Diplomatic', description: 'Valija diplomática', category: 'other' },
  AOG: { value: 'AOG', label: 'Aircraft On Ground', description: 'Repuesto urgente aeronave', category: 'other' }
} as const;

export type SpecialHandlingCodeType = keyof typeof SpecialHandlingCodeEnum;

// Categorías de SPH para agrupación en UI
export const SPH_CATEGORIES = {
  security: { label: 'Seguridad', color: 'blue' },
  perishable: { label: 'Perecederos', color: 'green' },
  temperature: { label: 'Temperatura', color: 'cyan' },
  live: { label: 'Animales', color: 'amber' },
  dangerous: { label: 'Peligrosos', color: 'red' },
  oversized: { label: 'Dimensiones', color: 'purple' },
  special: { label: 'Especiales', color: 'orange' },
  pharma: { label: 'Farmacéuticos', color: 'pink' },
  other: { label: 'Otros', color: 'gray' }
} as const;

// ============================================================
// OCI - INFO IDENTIFIER (Identificador de Información)
// ============================================================
export const OCIInfoIdentifierEnum = {
  // Más usados
  AGT: { value: 'AGT', label: 'Agent', description: 'Información del agente de carga' },
  ISS: { value: 'ISS', label: 'Issue/Security', description: 'Información de seguridad/emisión' },
  IMP: { value: 'IMP', label: 'Import', description: 'Información de importación' },
  EXP: { value: 'EXP', label: 'Export', description: 'Información de exportación' },
  SHP: { value: 'SHP', label: 'Shipper', description: 'Información del embarcador' },
  CNE: { value: 'CNE', label: 'Consignee', description: 'Información del consignatario' },
  TRA: { value: 'TRA', label: 'Transfer', description: 'Información de transferencia' },
  CUS: { value: 'CUS', label: 'Customs', description: 'Información aduanera' }
} as const;

export type OCIInfoIdentifierType = keyof typeof OCIInfoIdentifierEnum;

// ============================================================
// OCI - CONTROL INFORMATION (Identificador de Control)
// ============================================================
export const OCIControlInfoEnum = {
  // Seguridad - Los más usados
  REGULATED_AGENT: { value: 'REGULATED_AGENT', short: 'RA', label: 'Agente Regulado', description: 'El agente está certificado como Agente Regulado' },
  KNOWN_CONSIGNOR: { value: 'KNOWN_CONSIGNOR', short: 'KC', label: 'Consignatario Conocido', description: 'Consignatario registrado y verificado' },
  SECURITY_STATUS: { value: 'SECURITY_STATUS', short: 'SS', label: 'Estado Seguridad', description: 'Estado de seguridad de la carga' },
  SCREENING_METHOD: { value: 'SCREENING_METHOD', short: 'SM', label: 'Método Inspección', description: 'Método de screening aplicado' },
  SECURITY_STATUS_DATE_AND_TIME: { value: 'SECURITY_STATUS_DATE_AND_TIME', short: 'SD', label: 'Fecha/Hora Seguridad', description: 'Fecha y hora del estado de seguridad' },
  SECURITY_STATUS_NAME_OF_ISSUER: { value: 'SECURITY_STATUS_NAME_OF_ISSUER', short: 'SN', label: 'Emisor Seguridad', description: 'Nombre del emisor del estado' },
  
  // Identificación fiscal
  TRADER_IDENTIFICATION_NUMBER: { value: 'TRADER_IDENTIFICATION_NUMBER', short: 'TIN', label: 'NIT/Tax ID', description: 'Número de identificación fiscal (NIT, RUC, EORI)' },
  AUTHORISED_ECONOMIC_OPERATOR: { value: 'AUTHORISED_ECONOMIC_OPERATOR', short: 'AEO', label: 'OEA', description: 'Operador Económico Autorizado' },
  
  // Aduanas
  MOVEMENT_REFERENCE_NUMBER: { value: 'MOVEMENT_REFERENCE_NUMBER', short: 'MRN', label: 'MRN', description: 'Número de Referencia de Movimiento' },
  UNIQUE_CONSIGNMENT_REFERENCE_NUMBER: { value: 'UNIQUE_CONSIGNMENT_REFERENCE_NUMBER', short: 'UCR', label: 'UCR', description: 'Referencia Única de Consignación' },
  CUSTOMS_RELEASE_OK: { value: 'CUSTOMS_RELEASE_OK', short: 'CRO', label: 'Liberación Aduanas', description: 'Autorización de liberación aduanera' },
  
  // Fechas
  EXPIRY_DATE: { value: 'EXPIRY_DATE', short: 'ED', label: 'Fecha Expiración', description: 'Fecha de expiración (formato MMYY)' },
  
  // Otros
  DANGEROUS_GOODS: { value: 'DANGEROUS_GOODS', short: 'DG', label: 'Mercancía Peligrosa', description: 'Información de mercancía peligrosa' },
  CERTIFICATE_NUMBER: { value: 'CERTIFICATE_NUMBER', short: 'CN', label: 'No. Certificado', description: 'Número de certificado' }
} as const;

export type OCIControlInfoType = keyof typeof OCIControlInfoEnum;

// ============================================================
// ACCOUNTING INFORMATION IDENTIFIER
// ============================================================
export const AccountingInfoIdentifierEnum = {
  CreditCardNumber: { value: 'CreditCardNumber', label: 'No. Tarjeta Crédito', description: 'Número de tarjeta de crédito' },
  CreditCardExpiryDate: { value: 'CreditCardExpiryDate', label: 'Vencimiento Tarjeta', description: 'Fecha expiración tarjeta' },
  CreditCardIssuanceName: { value: 'CreditCardIssuanceName', label: 'Nombre Titular', description: 'Nombre en la tarjeta' },
  GeneralInformation: { value: 'GeneralInformation', label: 'Info General', description: 'Información general de pago' },
  GovernmentBillOfLading: { value: 'GovernmentBillOfLading', label: 'GBL', description: 'Conocimiento de embarque gubernamental' },
  ModeOfSettlement: { value: 'ModeOfSettlement', label: 'Modo Liquidación', description: 'Método de liquidación' },
  ShippersReferenceNumber: { value: 'ShippersReferenceNumber', label: 'Ref. Embarcador', description: 'Número de referencia del embarcador' }
} as const;

// ============================================================
// ULD LOADING INDICATOR
// ============================================================
export const ULDLoadingIndicatorEnum = {
  MAIN_DECK_LOADING_ONLY: { value: 'MAIN_DECK_LOADING_ONLY', label: 'Solo Main Deck', description: 'Cargar solo en cubierta principal' },
  NOSE_DOOR_LOADING_ONLY: { value: 'NOSE_DOOR_LOADING_ONLY', label: 'Solo Puerta Nariz', description: 'Cargar solo por puerta frontal' },
  ULD_HEIGHT_BELOW_160_CENTIMETRES: { value: 'ULD_HEIGHT_BELOW_160_CENTIMETRES', label: 'Altura <160cm', description: 'ULD altura menor a 160cm' },
  ULD_HEIGHT_BELOW_160_AND_244_CENTIMETRES: { value: 'ULD_HEIGHT_BELOW_160_AND_244_CENTIMETRES', label: 'Altura 160-244cm', description: 'ULD altura entre 160-244cm' },
  ULD_HEIGHT_ABOVE_244_CENTIMETRES: { value: 'ULD_HEIGHT_ABOVE_244_CENTIMETRES', label: 'Altura >244cm', description: 'ULD altura mayor a 244cm' }
} as const;

// ============================================================
// SHIPMENT DESCRIPTION CODE
// ============================================================
export const ShipmentDescriptionCodeEnum = {
  TOTAL_CONSIGNMENT: { value: 'TOTAL_CONSIGNMENT', label: 'Total', description: 'Consignación completa' },
  PART_CONSIGNMENT: { value: 'PART_CONSIGNMENT', label: 'Parcial', description: 'Parte de una consignación' },
  SPLIT_CONSIGMENT: { value: 'SPLIT_CONSIGMENT', label: 'Dividida', description: 'Consignación dividida' },
  DIVIDED_CONSIGNMENT: { value: 'DIVIDED_CONSIGNMENT', label: 'Dividida', description: 'Consignación dividida' }
} as const;

// ============================================================
// CONTACT IDENTIFIER - Tipo de contacto
// ============================================================
export const ContactIdentifierEnum = {
  TE: { value: 'TE', label: 'Teléfono', description: 'Número telefónico' },
  FX: { value: 'FX', label: 'Fax', description: 'Número de fax' },
  EM: { value: 'EM', label: 'Email', description: 'Correo electrónico' },
  TL: { value: 'TL', label: 'Télex', description: 'Número de télex' }
} as const;

// ============================================================
// PARTICIPANT ADDRESS TYPE - Tipo de dirección
// ============================================================
export const ParticipantAddressTypeEnum = {
  PIMA: { value: 'PIMA', label: 'PIMA', description: 'Participant Identification and Message Address' },
  TTY: { value: 'TTY', label: 'Télex', description: 'Dirección de télex' },
  CARRIER_CODE_3N: { value: 'CARRIER_CODE_3N', label: 'Código 3N', description: 'Código de aerolínea 3 dígitos' },
  IATA_CARRIER_CODE: { value: 'IATA_CARRIER_CODE', label: 'IATA', description: 'Código IATA de aerolínea' },
  EMAIL: { value: 'EMAIL', label: 'Email', description: 'Correo electrónico' }
} as const;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Obtiene las opciones de un enum para usar en un <select>
 */
export function getEnumOptions<T extends Record<string, { value: string; label: string; description: string }>>(
  enumObj: T
): Array<{ value: string; label: string; description: string }> {
  return Object.values(enumObj);
}

/**
 * Obtiene la descripción de un valor de enum
 */
export function getEnumDescription<T extends Record<string, { value: string; description: string }>>(
  enumObj: T,
  value: string
): string {
  const entry = Object.values(enumObj).find(e => e.value === value);
  return entry?.description || value;
}

/**
 * Agrupa SPH codes por categoría para mostrar en UI
 */
export function getSPHByCategory(): Record<string, typeof SpecialHandlingCodeEnum[keyof typeof SpecialHandlingCodeEnum][]> {
  const grouped: Record<string, typeof SpecialHandlingCodeEnum[keyof typeof SpecialHandlingCodeEnum][]> = {};
  
  Object.values(SpecialHandlingCodeEnum).forEach(sph => {
    if (!grouped[sph.category]) {
      grouped[sph.category] = [];
    }
    grouped[sph.category].push(sph);
  });
  
  return grouped;
}
