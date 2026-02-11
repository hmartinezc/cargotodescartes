/**
 * ============================================================
 * CARGO-XML SERVICE
 * ============================================================
 * Servicio para generar mensajes IATA Cargo-XML 3.0:
 * - XFWB (Master Air Waybill) 
 * - XFZB (House Waybill)
 * 
 * Basado en el estándar IATA ONE Record / Cargo-XML
 * ============================================================
 */

import { InternalShipment, InternalHouseBill, Dimension, Party } from '../types';

// ============================================================
// INTERFACES
// ============================================================

export interface CargoXmlResult {
  type: 'XFWB' | 'XFZB';
  awbNumber: string;
  hawbNumber?: string;
  xmlContent: string;
  isValid: boolean;
  errors: string[];
  timestamp: string;
}

export interface CargoXmlBundle {
  xfwb: CargoXmlResult;
  xfzbs: CargoXmlResult[];
}

// ============================================================
// NAMESPACES
// ============================================================

const XFWB_NAMESPACES = `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
             xmlns:ram="iata:datamodel:3" 
             xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:8" 
             xmlns:ccts="urn:un:unece:uncefact:documentation:standard:CoreComponentsTechnicalSpecification:2" 
             xmlns:rsm="iata:waybill:1" 
             xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
             xsi:schemaLocation="iata:waybill:1 Waybill_1.xsd"`;

const XFZB_NAMESPACES = `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:ram="iata:datamodel:3" 
                  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:8" 
                  xmlns:ccts="urn:un:unece:uncefact:documentation:standard:CoreComponentsTechnicalSpecification:2" 
                  xmlns:rsm="iata:housewaybill:1" 
                  xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                  xsi:schemaLocation="iata:housewaybill:1 HouseWaybill_1.xsd"`;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function escapeXml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatAwbNumber(awbNumber: string): string {
  // Formato: 992-01651112 -> 992-01651112
  return awbNumber.replace(/\s/g, '');
}

function formatAwbNumberNoHyphen(awbNumber: string): string {
  // Formato: 992-01651112 -> 99201651112
  return awbNumber.replace(/-/g, '').replace(/\s/g, '');
}

function formatDateTime(date?: string): string {
  const d = date ? new Date(date) : new Date();
  return d.toISOString().replace('Z', '').split('.')[0];
}

function formatDate(date?: string): string {
  const d = date ? new Date(date) : new Date();
  return d.toISOString().split('T')[0];
}

function getConversationId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${min}${sec}`;
}

function getCountryName(countryCode: string): string {
  const countries: Record<string, string> = {
    'CO': 'COLOMBIA',
    'US': 'UNITED STATES',
    'EC': 'ECUADOR',
    'MX': 'MEXICO',
    'CA': 'CANADA',
    'NL': 'NETHERLANDS',
    'DE': 'GERMANY',
    'ES': 'SPAIN',
    'FR': 'FRANCE',
    'GB': 'UNITED KINGDOM',
    'IT': 'ITALY',
    'BE': 'BELGIUM',
    'CN': 'CHINA',
    'JP': 'JAPAN',
    'KR': 'SOUTH KOREA',
    'AU': 'AUSTRALIA',
    'BR': 'BRAZIL',
    'CL': 'CHILE',
    'PE': 'PERU',
    'AR': 'ARGENTINA'
  };
  return countries[countryCode?.toUpperCase()] || countryCode?.toUpperCase() || '';
}

function getStateName(stateCode: string | undefined): string {
  if (!stateCode) return '';
  const states: Record<string, string> = {
    'FL': 'FLORIDA',
    'CA': 'CALIFORNIA',
    'NY': 'NEW YORK',
    'TX': 'TEXAS',
    'IL': 'ILLINOIS',
    'GA': 'GEORGIA',
    'NC': 'NORTH CAROLINA',
    'NJ': 'NEW JERSEY',
    'OH': 'OHIO',
    'PA': 'PENNSYLVANIA',
    'MA': 'MASSACHUSETTS',
    'WA': 'WASHINGTON',
    'MD': 'MARYLAND',
    'VA': 'VIRGINIA',
    'KY': 'KENTUCKY',
    'TN': 'TENNESSEE',
    'AZ': 'ARIZONA',
    'CO': 'COLORADO',
    'OR': 'OREGON',
    'ON': 'ONTARIO',
    'BC': 'BRITISH COLUMBIA',
    'QC': 'QUEBEC'
  };
  return states[stateCode.toUpperCase()] || stateCode.toUpperCase();
}

// ============================================================
// OCI (IncludedCustomsNote) HELPER - Usa lógica del EDI
// ============================================================

/**
 * Genera XML para IncludedCustomsNote (OCI) usando la lógica del EDI.
 * Formato IATA Cargo-XML:
 * <IncludedCustomsNote>
 *   <CountryID>CO</CountryID>
 *   <SubjectCode>SHP</SubjectCode>  <!-- SHP=Shipper, CNE=Consignee, AGT=Agent -->
 *   <ContentCode>T</ContentCode>    <!-- T=TIN/Tax ID, RA=Regulated Agent, etc. -->
 *   <Content>901234567</Content>
 * </IncludedCustomsNote>
 * 
 * @param indent - número de espacios para indentación (8 para XFWB, 12 para XFZB)
 */
function generateIncludedCustomsNoteXml(
  shipper: Party | undefined,
  consignee: Party | undefined,
  shipperCountry: string,
  consigneeCountry: string,
  indent: number = 8
): string {
  const notes: string[] = [];
  const pad = ' '.repeat(indent);
  const pad2 = ' '.repeat(indent + 4);

  // Lógica según país de origen (Ecuador vs otros) - igual que buildOciSegment del EDI
  const consigneeTaxId = consignee?.taxId || '';
  const shipperTaxId = shipper?.taxId || '';

  // OCI para Consignee TIN (siempre si hay taxId)
  if (consigneeTaxId) {
    notes.push(`${pad}<ram:IncludedCustomsNote>
${pad2}<ram:CountryID>${consigneeCountry}</ram:CountryID>
${pad2}<ram:SubjectCode>CNE</ram:SubjectCode>
${pad2}<ram:ContentCode>T</ram:ContentCode>
${pad2}<ram:Content>${escapeXml(consigneeTaxId.replace(/\s/g, ''))}</ram:Content>
${pad}</ram:IncludedCustomsNote>`);
  }

  // OCI para Shipper TIN (opcional, si hay taxId)
  if (shipperTaxId) {
    notes.push(`${pad}<ram:IncludedCustomsNote>
${pad2}<ram:CountryID>${shipperCountry}</ram:CountryID>
${pad2}<ram:SubjectCode>SHP</ram:SubjectCode>
${pad2}<ram:ContentCode>T</ram:ContentCode>
${pad2}<ram:Content>${escapeXml(shipperTaxId.replace(/\s/g, ''))}</ram:Content>
${pad}</ram:IncludedCustomsNote>`);
  }

  return notes.length > 0 ? '\n' + notes.join('\n') : '';
}

// ============================================================
// EMAIL HELPER - Genera URIEmailCommunication
// ============================================================

function generateEmailXml(email: string | undefined): string {
  if (!email || !email.trim()) return '';
  return `
                <ram:URIEmailCommunication>
                    <ram:URIID>${escapeXml(email.trim())}</ram:URIID>
                </ram:URIEmailCommunication>`;
}

// ============================================================
// DIMENSIONS HELPER - Genera LinearSpatialDimension
// ============================================================

/**
 * Genera LinearSpatialDimension para XFWB/XFZB
 * NOTA: Solo genera el nodo LinearSpatialDimension, NO el TransportLogisticsPackage
 * porque va DENTRO de un TransportLogisticsPackage existente (según XML proveedor)
 */
function generateDimensionsXml(dimensions: Dimension[] | undefined): string {
  if (!dimensions || dimensions.length === 0) return '';

  // Tomar primera dimensión (la más común en consolidados de flores)
  // Si hay múltiples, se puede expandir a generar múltiples LinearSpatialDimension
  const dim = dimensions[0];
  const unitCode = dim.unit === 'INCH' ? 'INH' : 'CMT';
  
  return `
                    <ram:LinearSpatialDimension>
                        <ram:WidthMeasure unitCode="${unitCode}">${dim.width}</ram:WidthMeasure>
                        <ram:LengthMeasure unitCode="${unitCode}">${dim.length}</ram:LengthMeasure>
                        <ram:HeightMeasure unitCode="${unitCode}">${dim.height}</ram:HeightMeasure>
                    </ram:LinearSpatialDimension>`;
}

/**
 * Genera dimensiones para XFZB (House) - como nodo interno de TransportLogisticsPackage
 */
function generateDimensionsXmlForHouse(dimensions: Dimension[] | undefined): string {
  if (!dimensions || dimensions.length === 0) return '';

  // Tomar primera dimensión
  const dim = dimensions[0];
  const unitCode = dim.unit === 'INCH' ? 'INH' : 'CMT';
  
  return `
                    <ram:LinearSpatialDimension>
                        <ram:WidthMeasure unitCode="${unitCode}">${dim.width}</ram:WidthMeasure>
                        <ram:LengthMeasure unitCode="${unitCode}">${dim.length}</ram:LengthMeasure>
                        <ram:HeightMeasure unitCode="${unitCode}">${dim.height}</ram:HeightMeasure>
                    </ram:LinearSpatialDimension>`;
}

// ============================================================
// VALIDACIÓN DE DATOS REQUERIDOS
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Valida que los datos del shipment sean suficientes para generar XFWB
 * Retorna lista de errores/warnings
 */
export function validateXFWBData(shipment: InternalShipment): ValidationError[] {
  const errors: ValidationError[] = [];

  // Campos obligatorios críticos
  if (!shipment.awbNumber) {
    errors.push({ field: 'awbNumber', message: 'Número de AWB requerido', severity: 'error' });
  } else if (!/^\d{3}-\d{8}$/.test(shipment.awbNumber.replace(/\s/g, ''))) {
    errors.push({ field: 'awbNumber', message: 'Formato AWB debe ser XXX-XXXXXXXX', severity: 'error' });
  }

  if (!shipment.origin || shipment.origin.length !== 3) {
    errors.push({ field: 'origin', message: 'Origen (código IATA 3 letras) requerido', severity: 'error' });
  }

  if (!shipment.destination || shipment.destination.length !== 3) {
    errors.push({ field: 'destination', message: 'Destino (código IATA 3 letras) requerido', severity: 'error' });
  }

  if (!shipment.weight || shipment.weight <= 0) {
    errors.push({ field: 'weight', message: 'Peso debe ser mayor a 0', severity: 'error' });
  }

  if (!shipment.pieces || shipment.pieces <= 0) {
    errors.push({ field: 'pieces', message: 'Piezas debe ser mayor a 0', severity: 'error' });
  }

  // Shipper
  if (!shipment.shipper?.name) {
    errors.push({ field: 'shipper.name', message: 'Nombre del shipper requerido', severity: 'error' });
  }
  if (!shipment.shipper?.address?.place) {
    errors.push({ field: 'shipper.address.place', message: 'Ciudad del shipper requerida', severity: 'error' });
  }
  if (!shipment.shipper?.address?.countryCode) {
    errors.push({ field: 'shipper.address.countryCode', message: 'País del shipper requerido', severity: 'error' });
  }

  // Consignee
  if (!shipment.consignee?.name) {
    errors.push({ field: 'consignee.name', message: 'Nombre del consignee requerido', severity: 'error' });
  }
  if (!shipment.consignee?.address?.place) {
    errors.push({ field: 'consignee.address.place', message: 'Ciudad del consignee requerida', severity: 'error' });
  }
  if (!shipment.consignee?.address?.countryCode) {
    errors.push({ field: 'consignee.address.countryCode', message: 'País del consignee requerido', severity: 'error' });
  }

  // Agent (opcional pero recomendado)
  if (!shipment.agent?.name) {
    errors.push({ field: 'agent.name', message: 'Nombre del agente recomendado', severity: 'warning' });
  }
  if (!shipment.agent?.iataCode) {
    errors.push({ field: 'agent.iataCode', message: 'Código IATA del agente recomendado', severity: 'warning' });
  }

  // Vuelos (recomendado para transmisión completa)
  if (!shipment.flights || shipment.flights.length === 0) {
    errors.push({ field: 'flights', message: 'Al menos un vuelo recomendado para XFWB', severity: 'warning' });
  } else {
    shipment.flights.forEach((flight, idx) => {
      if (!flight.flightNumber) {
        errors.push({ field: `flights[${idx}].flightNumber`, message: 'Número de vuelo requerido', severity: 'warning' });
      }
      if (!flight.carrierCode) {
        errors.push({ field: `flights[${idx}].carrierCode`, message: 'Código de aerolínea requerido', severity: 'warning' });
      }
    });
  }

  // Consolidado: verificar houses
  if (shipment.hasHouses) {
    if (!shipment.houseBills || shipment.houseBills.length === 0) {
      errors.push({ field: 'houseBills', message: 'AWB consolidado debe tener al menos 1 house', severity: 'error' });
    }
  }

  return errors;
}

/**
 * Valida que los datos del house sean suficientes para generar XFZB
 */
export function validateXFZBData(house: InternalHouseBill, shipment: InternalShipment): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!house.hawbNumber) {
    errors.push({ field: 'hawbNumber', message: 'Número de HAWB requerido', severity: 'error' });
  }

  if (!house.weight || house.weight <= 0) {
    errors.push({ field: 'weight', message: 'Peso del house debe ser mayor a 0', severity: 'error' });
  }

  if (!house.pieces || house.pieces <= 0) {
    errors.push({ field: 'pieces', message: 'Piezas del house debe ser mayor a 0', severity: 'error' });
  }

  // Shipper del house
  const houseShipper = house.shipper || { name: house.shipperName };
  if (!houseShipper.name) {
    errors.push({ field: 'shipper.name', message: 'Nombre del shipper del house requerido', severity: 'error' });
  }

  // Consignee del house
  const houseConsignee = house.consignee || { name: house.consigneeName };
  if (!houseConsignee.name) {
    errors.push({ field: 'consignee.name', message: 'Nombre del consignee del house requerido', severity: 'error' });
  }

  // Referencia al master AWB
  if (!shipment.awbNumber) {
    errors.push({ field: 'awbNumber', message: 'AWB master requerido para referencia en XFZB', severity: 'error' });
  }

  return errors;
}

// ============================================================
// XFWB (MASTER WAYBILL) GENERATOR
// ============================================================

export function generateXFWB(shipment: InternalShipment): CargoXmlResult {
  const errors: string[] = [];
  
  // Validar datos antes de generar
  const validationErrors = validateXFWBData(shipment);
  const criticalErrors = validationErrors.filter(e => e.severity === 'error');
  
  if (criticalErrors.length > 0) {
    return {
      type: 'XFWB',
      awbNumber: shipment.awbNumber || '',
      xmlContent: '',
      isValid: false,
      errors: criticalErrors.map(e => `${e.field}: ${e.message}`),
      timestamp: new Date().toISOString()
    };
  }
  
  // Agregar warnings (no bloquean generación)
  validationErrors.filter(e => e.severity === 'warning').forEach(w => {
    console.warn(`[XFWB Warning] ${w.field}: ${w.message}`);
  });
  const timestamp = new Date().toISOString();
  
  try {
    const awbNumber = formatAwbNumber(shipment.awbNumber);
    const conversationId = getConversationId();
    const issueDateTime = formatDateTime();
    const executionDate = formatDateTime(shipment.executionDate);
    
    // Calcular totales
    const totalWeight = shipment.weight || 0;
    const totalPieces = shipment.pieces || 0;
    const currency = shipment.currency || 'USD';
    
    // Calcular cargos
    let totalChargeAmount = 0;
    let chargeableWeight = 0;
    let appliedRate = 0;
    
    if (shipment.rates && shipment.rates.length > 0) {
      totalChargeAmount = shipment.rates.reduce((sum, r) => sum + (r.total || 0), 0);
      chargeableWeight = shipment.rates[0].chargeableWeight || totalWeight;
      appliedRate = shipment.rates[0].rateOrCharge || 0;
    }
    
    // Calcular otros cargos
    let agentCharges = 0;
    let carrierCharges = 0;
    const otherChargesXml: string[] = [];
    
    if (shipment.otherCharges) {
      shipment.otherCharges.forEach(charge => {
        const isPrepaid = charge.paymentMethod === 'Prepaid';
        const partyType = charge.entitlement === 'DueAgent' ? 'A' : 'C';
        const chargeCode = mapOtherChargeCode(charge.code);
        
        if (charge.entitlement === 'DueAgent') {
          agentCharges += charge.amount;
        } else {
          carrierCharges += charge.amount;
        }
        
        otherChargesXml.push(`
        <ram:ApplicableLogisticsAllowanceCharge>
            <ram:ID>${chargeCode}</ram:ID>
            <ram:PrepaidIndicator>${isPrepaid}</ram:PrepaidIndicator>
            <ram:PartyTypeCode>${partyType}</ram:PartyTypeCode>
            <ram:ActualAmount currencyID="${currency}">${charge.amount.toFixed(2)}</ram:ActualAmount>
        </ram:ApplicableLogisticsAllowanceCharge>`);
      });
    }
    
    const grandTotal = totalChargeAmount + agentCharges + carrierCharges;
    
    // SPH codes
    const sphCodes = shipment.specialHandlingCodes || ['EAP', 'PER'];
    const sphXml = sphCodes.map(code => 
      `        <ram:HandlingSPHInstructions>
            <ram:DescriptionCode>${code}</ram:DescriptionCode>
        </ram:HandlingSPHInstructions>`).join('\n');
    
    // HTS codes
    const htsCodes = getUniqueHtsCodes(shipment);
    const htsXml = htsCodes.length > 0 
      ? '\n' + htsCodes.map(code => `                <ram:TypeCode>${code}</ram:TypeCode>`).join('\n')
      : '';
    
    // Vuelos
    const flightsXml = generateFlightsXml(shipment);
    
    // Accounting notes
    const accountingXml = generateAccountingNotesXml(shipment);
    
    // Descripción de mercancía
    const goodsDescription = escapeXml(getGoodsDescription(shipment));
    
    // Construir XML
    // Determinar TypeCode: 740 = Direct AWB, 741 = Master AWB (consolidación)
    const typeCode = shipment.hasHouses ? '741' : '740';
    // ContentCode: C = Consolidation, M = Master/Direct
    const contentCode = shipment.hasHouses ? 'C' : 'M';
    // Número de houses para ConsignmentItemQuantity
    const houseCount = shipment.houseBills?.length || 0;
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:Waybill ${XFWB_NAMESPACES}>
    <rsm:MessageHeaderDocument>
        <ram:ID>${awbNumber}</ram:ID>
        <ram:Name>${shipment.hasHouses ? 'Master Air Waybill' : 'Air Waybill'}</ram:Name>
        <ram:TypeCode>${typeCode}</ram:TypeCode>
        <ram:IssueDateTime>${issueDateTime}</ram:IssueDateTime>
        <ram:PurposeCode>Creation</ram:PurposeCode>
        <ram:VersionID>3.00</ram:VersionID>
        <ram:ConversationID>${conversationId}</ram:ConversationID>
        <ram:SenderParty>
            <ram:PrimaryID schemeID="C">${escapeXml(shipment.routing?.senderAddress || 'TDVAGT03OPERFLOR/BOG1')}</ram:PrimaryID>
        </ram:SenderParty>
        <ram:RecipientParty>
            <ram:PrimaryID schemeID="C">${escapeXml(shipment.routing?.recipientAddress || 'TDVAIR08DHV')}</ram:PrimaryID>
        </ram:RecipientParty>
    </rsm:MessageHeaderDocument>
    <rsm:BusinessHeaderDocument>
        <ram:ID>${awbNumber}</ram:ID>
        <ram:IncludedHeaderNote>
            <ram:ContentCode>${contentCode}</ram:ContentCode>
            <ram:Content>${goodsDescription}</ram:Content>
        </ram:IncludedHeaderNote>
        <ram:SignatoryConsignorAuthentication>
            <ram:Signatory>${escapeXml(shipment.agent?.name || shipment.shipper?.name || 'AGENT')}</ram:Signatory>
        </ram:SignatoryConsignorAuthentication>
        <ram:SignatoryCarrierAuthentication>
            <ram:ActualDateTime>${executionDate}</ram:ActualDateTime>
            <ram:Signatory>${escapeXml(shipment.signature || 'OPERATOR')}</ram:Signatory>
            <ram:IssueAuthenticationLocation>
                <ram:Name>${shipment.origin}</ram:Name>
            </ram:IssueAuthenticationLocation>
        </ram:SignatoryCarrierAuthentication>
    </rsm:BusinessHeaderDocument>
    <rsm:MasterConsignment>
        <ram:NilCarriageValueIndicator>true</ram:NilCarriageValueIndicator>
        <ram:NilCustomsValueIndicator>true</ram:NilCustomsValueIndicator>
        <ram:NilInsuranceValueIndicator>true</ram:NilInsuranceValueIndicator>
        <ram:TotalChargePrepaidIndicator>${shipment.paymentMethod === 'Prepaid'}</ram:TotalChargePrepaidIndicator>
        <ram:TotalDisbursementPrepaidIndicator>${shipment.paymentMethod === 'Prepaid'}</ram:TotalDisbursementPrepaidIndicator>
        <ram:IncludedTareGrossWeightMeasure unitCode="KGM">${totalWeight}</ram:IncludedTareGrossWeightMeasure>${shipment.volume ? `
        <ram:GrossVolumeMeasure unitCode="MTQ">${shipment.volume.toFixed(2)}</ram:GrossVolumeMeasure>` : ''}
        <ram:TotalPieceQuantity>${totalPieces}</ram:TotalPieceQuantity>
        ${generateConsignorPartyXml(shipment.shipper)}
        ${generateConsigneePartyXml(shipment.consignee)}
        ${generateFreightForwarderXml(shipment.agent)}
        <ram:OriginLocation>
            <ram:ID>${shipment.origin}</ram:ID>
        </ram:OriginLocation>
        <ram:FinalDestinationLocation>
            <ram:ID>${shipment.destination}</ram:ID>
        </ram:FinalDestinationLocation>
${flightsXml}
${sphXml}${accountingXml}
        <ram:ApplicableOriginCurrencyExchange>
            <ram:SourceCurrencyCode>${currency}</ram:SourceCurrencyCode>
        </ram:ApplicableOriginCurrencyExchange>
        <ram:ApplicableLogisticsServiceCharge>
            <ram:TransportPaymentMethodCode>${shipment.paymentMethod === 'Prepaid' ? 'PP' : 'CC'}</ram:TransportPaymentMethodCode>
            <ram:ServiceTypeCode>A</ram:ServiceTypeCode>
        </ram:ApplicableLogisticsServiceCharge>${otherChargesXml.join('')}
        <ram:ApplicableRating>
            <ram:TypeCode>A</ram:TypeCode>
            <ram:TotalChargeAmount>${totalChargeAmount.toFixed(2)}</ram:TotalChargeAmount>
            <ram:IncludedMasterConsignmentItem>
                <ram:SequenceNumeric>1</ram:SequenceNumeric>${htsXml}
                <ram:GrossWeightMeasure unitCode="KGM">${totalWeight}</ram:GrossWeightMeasure>${shipment.volume ? `
                <ram:GrossVolumeMeasure unitCode="MTQ">${shipment.volume.toFixed(2)}</ram:GrossVolumeMeasure>` : ''}
                <ram:PieceQuantity>${totalPieces}</ram:PieceQuantity>
                <ram:NatureIdentificationTransportCargo>
                    <ram:Identification>${goodsDescription}</ram:Identification>
                </ram:NatureIdentificationTransportCargo>
                <ram:OriginCountry>
                    <ram:ID>${shipment.shipper?.address?.countryCode || 'CO'}</ram:ID>
                </ram:OriginCountry>
                <ram:TransportLogisticsPackage>
                    <ram:ItemQuantity>${totalPieces}</ram:ItemQuantity>
                    <ram:GrossWeightMeasure unitCode="KGM">${totalWeight}</ram:GrossWeightMeasure>${generateDimensionsXml(shipment.dimensions)}
                </ram:TransportLogisticsPackage>
                <ram:ApplicableFreightRateServiceCharge>
                    <ram:CategoryCode>${mapRateClassCode(shipment.rates?.[0]?.rateClassCode)}</ram:CategoryCode>
                    <ram:CommodityItemID>${shipment.commodityCode || '1421'}</ram:CommodityItemID>
                    <ram:ChargeableWeightMeasure unitCode="KGM">${chargeableWeight}</ram:ChargeableWeightMeasure>
                    <ram:AppliedRate>${appliedRate.toFixed(2)}</ram:AppliedRate>
                    <ram:AppliedAmount currencyID="${currency}">${totalChargeAmount.toFixed(2)}</ram:AppliedAmount>
                </ram:ApplicableFreightRateServiceCharge>
            </ram:IncludedMasterConsignmentItem>
        </ram:ApplicableRating>
        <ram:ApplicableTotalRating>
            <ram:TypeCode>A</ram:TypeCode>
            <ram:ApplicablePrepaidCollectMonetarySummation>
                <ram:PrepaidIndicator>${shipment.paymentMethod === 'Prepaid'}</ram:PrepaidIndicator>
                <ram:WeightChargeTotalAmount currencyID="${currency}">${totalChargeAmount.toFixed(2)}</ram:WeightChargeTotalAmount>
                <ram:AgentTotalDuePayableAmount currencyID="${currency}">${agentCharges.toFixed(2)}</ram:AgentTotalDuePayableAmount>
                <ram:CarrierTotalDuePayableAmount currencyID="${currency}">${carrierCharges.toFixed(2)}</ram:CarrierTotalDuePayableAmount>
                <ram:GrandTotalAmount currencyID="${currency}">${grandTotal.toFixed(2)}</ram:GrandTotalAmount>
            </ram:ApplicablePrepaidCollectMonetarySummation>
        </ram:ApplicableTotalRating>
    </rsm:MasterConsignment>
</rsm:Waybill>`;

    return {
      type: 'XFWB',
      awbNumber,
      xmlContent: xml,
      isValid: errors.length === 0,
      errors,
      timestamp
    };
    
  } catch (e: any) {
    errors.push(`Error generando XFWB: ${e.message}`);
    return {
      type: 'XFWB',
      awbNumber: shipment.awbNumber,
      xmlContent: '',
      isValid: false,
      errors,
      timestamp
    };
  }
}

// ============================================================
// XFZB (HOUSE WAYBILL) GENERATOR
// ============================================================

export function generateXFZB(shipment: InternalShipment, house: InternalHouseBill): CargoXmlResult {
  const errors: string[] = [];
  const timestamp = new Date().toISOString();
  
  // Validar datos antes de generar
  const validationErrors = validateXFZBData(house, shipment);
  const criticalErrors = validationErrors.filter(e => e.severity === 'error');
  
  if (criticalErrors.length > 0) {
    return {
      type: 'XFZB',
      awbNumber: shipment.awbNumber || '',
      hawbNumber: house.hawbNumber || '',
      xmlContent: '',
      isValid: false,
      errors: criticalErrors.map(e => `${e.field}: ${e.message}`),
      timestamp
    };
  }
  
  try {
    const awbNumber = formatAwbNumber(shipment.awbNumber);
    const hawbNumber = house.hawbNumber;
    const documentId = `${hawbNumber}_${awbNumber}`;
    const conversationId = getConversationId();
    const issueDateTime = formatDateTime();
    const executionDate = formatDateTime(shipment.executionDate);
    
    const currency = shipment.currency || 'USD';
    const totalWeight = house.weight || 0;
    const totalPieces = house.pieces || 0;
    
    // HTS codes de la house
    const htsCodes = house.htsCodes || [];
    const htsXml = htsCodes.length > 0 
      ? '\n' + htsCodes.map(code => `                <ram:TypeCode>${code}</ram:TypeCode>`).join('\n')
      : '';
    
    // SPH codes
    const sphCodes = shipment.specialHandlingCodes || ['EAP', 'PER'];
    const sphXml = sphCodes.map(code => 
      `            <ram:HandlingSPHInstructions>
                <ram:DescriptionCode>${code}</ram:DescriptionCode>
            </ram:HandlingSPHInstructions>`).join('\n');
    
    // Vuelos
    const flightsXml = generateFlightsXmlForHouse(shipment);
    
    // Descripción
    const goodsDescription = escapeXml(house.natureOfGoods || getGoodsDescription(shipment));
    
    // Shipper y Consignee de la house
    const houseShipper = house.shipper || { name: house.shipperName, address: shipment.shipper?.address };
    const houseConsignee = house.consignee || { name: house.consigneeName, address: shipment.consignee?.address };
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:HouseWaybill ${XFZB_NAMESPACES}>
    <rsm:MessageHeaderDocument>
        <ram:ID>${escapeXml(documentId)}</ram:ID>
        <ram:Name>House Waybill</ram:Name>
        <ram:TypeCode>703</ram:TypeCode>
        <ram:IssueDateTime>${issueDateTime}</ram:IssueDateTime>
        <ram:PurposeCode>Creation</ram:PurposeCode>
        <ram:VersionID>3.00</ram:VersionID>
        <ram:ConversationID>${conversationId}</ram:ConversationID>
        <ram:SenderParty>
            <ram:PrimaryID schemeID="C">${escapeXml(shipment.routing?.senderAddress || 'TDVAGT03OPERFLOR/BOG1')}</ram:PrimaryID>
        </ram:SenderParty>
        <ram:RecipientParty>
            <ram:PrimaryID schemeID="C">${escapeXml(shipment.routing?.recipientAddress || 'TDVAIR08DHV')}</ram:PrimaryID>
        </ram:RecipientParty>
    </rsm:MessageHeaderDocument>
    <rsm:BusinessHeaderDocument>
        <ram:ID>${escapeXml(hawbNumber)}</ram:ID>
        <ram:SignatoryConsignorAuthentication>
            <ram:Signatory>${escapeXml(shipment.agent?.name || 'AGENT')}</ram:Signatory>
        </ram:SignatoryConsignorAuthentication>
        <ram:SignatoryCarrierAuthentication>
            <ram:ActualDateTime>${executionDate}</ram:ActualDateTime>
            <ram:Signatory>${escapeXml(shipment.signature || 'OPERATOR')}</ram:Signatory>
            <ram:IssueAuthenticationLocation>
                <ram:Name>${shipment.origin}</ram:Name>
            </ram:IssueAuthenticationLocation>
        </ram:SignatoryCarrierAuthentication>
    </rsm:BusinessHeaderDocument>
    <rsm:MasterConsignment>
        <ram:IncludedTareGrossWeightMeasure unitCode="KGM">${shipment.weight}</ram:IncludedTareGrossWeightMeasure>
        <ram:TotalPieceQuantity>${shipment.pieces}</ram:TotalPieceQuantity>
        <ram:TransportContractDocument>
            <ram:ID>${awbNumber}</ram:ID>
        </ram:TransportContractDocument>
        <ram:OriginLocation>
            <ram:ID>${shipment.origin}</ram:ID>
        </ram:OriginLocation>
        <ram:FinalDestinationLocation>
            <ram:ID>${shipment.destination}</ram:ID>
        </ram:FinalDestinationLocation>
        <ram:IncludedHouseConsignment>
            <ram:NilCarriageValueIndicator>true</ram:NilCarriageValueIndicator>
            <ram:NilCustomsValueIndicator>true</ram:NilCustomsValueIndicator>
            <ram:NilInsuranceValueIndicator>true</ram:NilInsuranceValueIndicator>
            <ram:TotalChargePrepaidIndicator>${shipment.paymentMethod === 'Prepaid'}</ram:TotalChargePrepaidIndicator>
            <ram:TotalDisbursementPrepaidIndicator>${shipment.paymentMethod === 'Prepaid'}</ram:TotalDisbursementPrepaidIndicator>
            <ram:IncludedTareGrossWeightMeasure unitCode="KGM">${totalWeight}</ram:IncludedTareGrossWeightMeasure>
            <ram:TotalPieceQuantity>${totalPieces}</ram:TotalPieceQuantity>
            <ram:SummaryDescription>${goodsDescription}</ram:SummaryDescription>
            ${generateHouseConsignorPartyXml(houseShipper)}
            ${generateHouseConsigneePartyXml(houseConsignee)}
            ${generateHouseFreightForwarderXml(shipment.agent)}
            <ram:OriginLocation>
                <ram:ID>${house.origin || shipment.origin}</ram:ID>
            </ram:OriginLocation>
            <ram:FinalDestinationLocation>
                <ram:ID>${house.destination || shipment.destination}</ram:ID>
            </ram:FinalDestinationLocation>
${flightsXml}
${sphXml}${generateIncludedCustomsNoteXml(
              houseShipper as Party,
              houseConsignee as Party,
              houseShipper?.address?.countryCode || 'CO',
              houseConsignee?.address?.countryCode || 'US',
              12
            )}${generateAccountingNotesXmlForHouse(house, shipment)}
            <ram:AssociatedReferenceDocument>
                <ram:ID>${awbNumber}</ram:ID>
                <ram:TypeCode>741</ram:TypeCode>
                <ram:Name>Master Air Waybill</ram:Name>
            </ram:AssociatedReferenceDocument>
            <ram:ApplicableOriginCurrencyExchange>
                <ram:SourceCurrencyCode>${currency}</ram:SourceCurrencyCode>
            </ram:ApplicableOriginCurrencyExchange>
            <ram:IncludedHouseConsignmentItem>
                <ram:SequenceNumeric>1</ram:SequenceNumeric>${htsXml}
                <ram:GrossWeightMeasure unitCode="KGM">${totalWeight}</ram:GrossWeightMeasure>${house.volume ? `
                <ram:GrossVolumeMeasure unitCode="MTQ">${house.volume.toFixed(3)}</ram:GrossVolumeMeasure>` : ''}
                <ram:PieceQuantity>${totalPieces}</ram:PieceQuantity>
                <ram:NatureIdentificationTransportCargo>
                    <ram:Identification>${goodsDescription}</ram:Identification>
                </ram:NatureIdentificationTransportCargo>
                <ram:OriginCountry>
                    <ram:ID>${houseShipper?.address?.countryCode || shipment.shipper?.address?.countryCode || 'CO'}</ram:ID>
                </ram:OriginCountry>
                <ram:TransportLogisticsPackage>
                    <ram:ItemQuantity>${totalPieces}</ram:ItemQuantity>
                    <ram:GrossWeightMeasure unitCode="KGM">${totalWeight}</ram:GrossWeightMeasure>${generateDimensionsXmlForHouse(house.dimensions)}
                </ram:TransportLogisticsPackage>
                <ram:ApplicableFreightRateServiceCharge>
                    <ram:CategoryCode>K</ram:CategoryCode>
                    <ram:CommodityItemID>${shipment.commodityCode || '1421'}</ram:CommodityItemID>
                    <ram:ChargeableWeightMeasure unitCode="KGM">${house.chargeableWeight || totalWeight}</ram:ChargeableWeightMeasure>${house.totalCharge ? `
                    <ram:AppliedAmount currencyID="${currency}">${house.totalCharge.toFixed(2)}</ram:AppliedAmount>` : ''}
                </ram:ApplicableFreightRateServiceCharge>
            </ram:IncludedHouseConsignmentItem>
        </ram:IncludedHouseConsignment>
    </rsm:MasterConsignment>
</rsm:HouseWaybill>`;

    return {
      type: 'XFZB',
      awbNumber,
      hawbNumber,
      xmlContent: xml,
      isValid: errors.length === 0,
      errors,
      timestamp
    };
    
  } catch (e: any) {
    errors.push(`Error generando XFZB: ${e.message}`);
    return {
      type: 'XFZB',
      awbNumber: shipment.awbNumber,
      hawbNumber: house.hawbNumber,
      xmlContent: '',
      isValid: false,
      errors,
      timestamp
    };
  }
}

// ============================================================
// BUNDLE GENERATOR
// ============================================================

export function generateCargoXmlBundle(shipment: InternalShipment): CargoXmlBundle {
  const xfwb = generateXFWB(shipment);
  const xfzbs: CargoXmlResult[] = [];
  
  if (shipment.hasHouses && shipment.houseBills && shipment.houseBills.length > 0) {
    shipment.houseBills.forEach(house => {
      xfzbs.push(generateXFZB(shipment, house));
    });
  }
  
  return { xfwb, xfzbs };
}

// ============================================================
// HELPER XML GENERATORS
// ============================================================

function generateConsignorPartyXml(shipper: InternalShipment['shipper']): string {
  if (!shipper) return '';
  
  return `<ram:ConsignorParty>
            <ram:Name>${escapeXml(shipper.name)}</ram:Name>
            <ram:PostalStructuredAddress>
                <ram:PostcodeCode>${escapeXml(shipper.address?.postalCode || '')}</ram:PostcodeCode>
                <ram:StreetName>${escapeXml(shipper.address?.street || '')}</ram:StreetName>
                <ram:CityName>${escapeXml(shipper.address?.place || '')}</ram:CityName>
                <ram:CountryID>${shipper.address?.countryCode || 'CO'}</ram:CountryID>
                <ram:CountryName>${getCountryName(shipper.address?.countryCode || 'CO')}</ram:CountryName>
            </ram:PostalStructuredAddress>${shipper.contact?.number || shipper.email ? `
            <ram:DefinedTradeContact>${shipper.contact?.number ? `
                <ram:DirectTelephoneCommunication>
                    <ram:CompleteNumber>${escapeXml(shipper.contact.number)}</ram:CompleteNumber>
                </ram:DirectTelephoneCommunication>` : ''}${shipper.email ? `
                <ram:URIEmailCommunication>
                    <ram:URIID>${escapeXml(shipper.email)}</ram:URIID>
                </ram:URIEmailCommunication>` : ''}
            </ram:DefinedTradeContact>` : ''}
        </ram:ConsignorParty>`;
}

function generateConsigneePartyXml(consignee: InternalShipment['consignee']): string {
  if (!consignee) return '';
  
  const state = consignee.address?.state;
  
  return `<ram:ConsigneeParty>
            <ram:Name>${escapeXml(consignee.name)}</ram:Name>
            <ram:PostalStructuredAddress>
                <ram:PostcodeCode>${escapeXml(consignee.address?.postalCode || '')}</ram:PostcodeCode>
                <ram:StreetName>${escapeXml(consignee.address?.street || '')}</ram:StreetName>
                <ram:CityName>${escapeXml(consignee.address?.place || '')}</ram:CityName>
                <ram:CountryID>${consignee.address?.countryCode || 'US'}</ram:CountryID>
                <ram:CountryName>${getCountryName(consignee.address?.countryCode || 'US')}</ram:CountryName>${state ? `
                <ram:CountrySubDivisionName>${getStateName(state)}</ram:CountrySubDivisionName>` : ''}
            </ram:PostalStructuredAddress>${consignee.contact?.number || consignee.email ? `
            <ram:DefinedTradeContact>${consignee.contact?.number ? `
                <ram:DirectTelephoneCommunication>
                    <ram:CompleteNumber>${escapeXml(consignee.contact.number)}</ram:CompleteNumber>
                </ram:DirectTelephoneCommunication>` : ''}${consignee.email ? `
                <ram:URIEmailCommunication>
                    <ram:URIID>${escapeXml(consignee.email)}</ram:URIID>
                </ram:URIEmailCommunication>` : ''}
            </ram:DefinedTradeContact>` : ''}
        </ram:ConsigneeParty>`;
}

function generateFreightForwarderXml(agent: InternalShipment['agent']): string {
  if (!agent) return '';
  
  return `<ram:FreightForwarderParty>
            <ram:Name>${escapeXml(agent.name)}</ram:Name>
            <ram:CargoAgentID>${escapeXml(agent.iataCode)}</ram:CargoAgentID>
            <ram:FreightForwarderAddress>
                <ram:CityName>${escapeXml(agent.place)}</ram:CityName>
            </ram:FreightForwarderAddress>${agent.cassCode ? `
            <ram:SpecifiedCargoAgentLocation>
                <ram:ID>${escapeXml(agent.cassCode)}</ram:ID>
            </ram:SpecifiedCargoAgentLocation>` : ''}
        </ram:FreightForwarderParty>`;
}

function generateHouseConsignorPartyXml(shipper: any): string {
  if (!shipper) return '';
  
  const name = shipper.name || shipper.shipperName || '';
  const address = shipper.address || {};
  
  return `<ram:ConsignorParty>
                <ram:Name>${escapeXml(name)}</ram:Name>
                <ram:PostalStructuredAddress>${address.postalCode ? `
                    <ram:PostcodeCode>${escapeXml(address.postalCode)}</ram:PostcodeCode>` : ''}
                    <ram:StreetName>${escapeXml(address.street || '')}</ram:StreetName>
                    <ram:CityName>${escapeXml(address.place || '')}</ram:CityName>
                    <ram:CountryID>${address.countryCode || 'CO'}</ram:CountryID>
                    <ram:CountryName>${getCountryName(address.countryCode || 'CO')}</ram:CountryName>
                </ram:PostalStructuredAddress>${shipper.contact?.number || shipper.email ? `
                <ram:DefinedTradeContact>${shipper.contact?.number ? `
                    <ram:DirectTelephoneCommunication>
                        <ram:CompleteNumber>${escapeXml(shipper.contact.number)}</ram:CompleteNumber>
                    </ram:DirectTelephoneCommunication>` : ''}${shipper.email ? `
                    <ram:URIEmailCommunication>
                        <ram:URIID>${escapeXml(shipper.email)}</ram:URIID>
                    </ram:URIEmailCommunication>` : ''}
                </ram:DefinedTradeContact>` : ''}
            </ram:ConsignorParty>`;
}

function generateHouseConsigneePartyXml(consignee: any): string {
  if (!consignee) return '';
  
  const name = consignee.name || consignee.consigneeName || '';
  const address = consignee.address || {};
  const state = address.state;
  
  return `<ram:ConsigneeParty>
                <ram:Name>${escapeXml(name)}</ram:Name>
                <ram:PostalStructuredAddress>${address.postalCode ? `
                    <ram:PostcodeCode>${escapeXml(address.postalCode)}</ram:PostcodeCode>` : ''}
                    <ram:StreetName>${escapeXml(address.street || '')}</ram:StreetName>
                    <ram:CityName>${escapeXml(address.place || '')}</ram:CityName>
                    <ram:CountryID>${address.countryCode || 'US'}</ram:CountryID>
                    <ram:CountryName>${getCountryName(address.countryCode || 'US')}</ram:CountryName>${state ? `
                    <ram:CountrySubDivisionName>${getStateName(state)}</ram:CountrySubDivisionName>` : ''}
                </ram:PostalStructuredAddress>${consignee.contact?.number || consignee.email ? `
                <ram:DefinedTradeContact>${consignee.contact?.number ? `
                    <ram:DirectTelephoneCommunication>
                        <ram:CompleteNumber>${escapeXml(consignee.contact.number)}</ram:CompleteNumber>
                    </ram:DirectTelephoneCommunication>` : ''}${consignee.email ? `
                    <ram:URIEmailCommunication>
                        <ram:URIID>${escapeXml(consignee.email)}</ram:URIID>
                    </ram:URIEmailCommunication>` : ''}
                </ram:DefinedTradeContact>` : ''}
            </ram:ConsigneeParty>`;
}

function generateHouseFreightForwarderXml(agent: InternalShipment['agent']): string {
  if (!agent) return '';
  
  return `<ram:FreightForwarderParty>
                <ram:Name>${escapeXml(agent.name)}</ram:Name>
                <ram:PostalStructuredAddress>
                    <ram:CityName>${escapeXml(agent.place)}</ram:CityName>
                    <ram:CountryID>CO</ram:CountryID>
                </ram:PostalStructuredAddress>
            </ram:FreightForwarderParty>`;
}

function generateFlightsXml(shipment: InternalShipment): string {
  if (!shipment.flights || shipment.flights.length === 0) return '';
  
  return shipment.flights.map((flight, index) => {
    const departureDate = formatDateTime(flight.date);
    
    return `        <ram:SpecifiedLogisticsTransportMovement>
            <ram:StageCode>Main-Carriage</ram:StageCode>
            <ram:ModeCode>4</ram:ModeCode>
            <ram:Mode>AIR TRANSPORT</ram:Mode>
            <ram:ID>${escapeXml(flight.flightNumber)}</ram:ID>
            <ram:SequenceNumeric>${index + 1}</ram:SequenceNumeric>
            <ram:UsedLogisticsTransportMeans>
                <ram:Name>${escapeXml(flight.carrierCode)}</ram:Name>
            </ram:UsedLogisticsTransportMeans>
            <ram:ArrivalEvent>
                <ram:OccurrenceArrivalLocation>
                    <ram:ID>${flight.destination}</ram:ID>
                    <ram:TypeCode>Airport</ram:TypeCode>
                </ram:OccurrenceArrivalLocation>
            </ram:ArrivalEvent>
            <ram:DepartureEvent>
                <ram:ScheduledOccurrenceDateTime>${departureDate}</ram:ScheduledOccurrenceDateTime>
                <ram:OccurrenceDepartureLocation>
                    <ram:ID>${flight.origin}</ram:ID>
                    <ram:TypeCode>Airport</ram:TypeCode>
                </ram:OccurrenceDepartureLocation>
            </ram:DepartureEvent>
        </ram:SpecifiedLogisticsTransportMovement>`;
  }).join('\n');
}

function generateFlightsXmlForHouse(shipment: InternalShipment): string {
  if (!shipment.flights || shipment.flights.length === 0) return '';
  
  return shipment.flights.map((flight, index) => {
    const departureDate = formatDateTime(flight.date);
    
    return `            <ram:SpecifiedLogisticsTransportMovement>
                <ram:StageCode>Main-Carriage</ram:StageCode>
                <ram:ModeCode>4</ram:ModeCode>
                <ram:Mode>AIR TRANSPORT</ram:Mode>
                <ram:ID>${escapeXml(flight.flightNumber)}</ram:ID>
                <ram:SequenceNumeric>${index + 1}</ram:SequenceNumeric>
                <ram:UsedLogisticsTransportMeans>
                    <ram:Name>${escapeXml(flight.carrierCode)}</ram:Name>
                </ram:UsedLogisticsTransportMeans>
                <ram:ArrivalEvent>
                    <ram:OccurrenceArrivalLocation>
                        <ram:ID>${flight.destination}</ram:ID>
                    </ram:OccurrenceArrivalLocation>
                </ram:ArrivalEvent>
                <ram:DepartureEvent>
                    <ram:ScheduledOccurrenceDateTime>${departureDate}</ram:ScheduledOccurrenceDateTime>
                    <ram:OccurrenceDepartureLocation>
                        <ram:ID>${flight.origin}</ram:ID>
                    </ram:OccurrenceDepartureLocation>
                </ram:DepartureEvent>
            </ram:SpecifiedLogisticsTransportMovement>`;
  }).join('\n');
}

function generateAccountingNotesXml(shipment: InternalShipment): string {
  const notes: string[] = [];
  
  // Also Notify Party → genera múltiples IncludedAccountingNote (1 por línea de datos)
  const notifyParty = shipment.alsoNotify;
  if (notifyParty?.name) {
    // Línea 1: NOTIFY TO: nombre
    notes.push(`        <ram:IncludedAccountingNote>
            <ram:ContentCode>GEN</ram:ContentCode>
            <ram:Content>NOTIFY TO: ${escapeXml(notifyParty.name)}</ram:Content>
        </ram:IncludedAccountingNote>`);
    
    // Línea 2: Dirección con ZIP y teléfono
    const address = notifyParty.address;
    if (address?.street || address?.postalCode || notifyParty.contact?.number) {
      const line2Parts: string[] = [];
      if (address?.street) line2Parts.push(address.street);
      if (address?.postalCode) line2Parts.push(`ZIP: ${address.postalCode}`);
      if (notifyParty.contact?.number) line2Parts.push(`PH: ${notifyParty.contact.number}`);
      if (line2Parts.length > 0) {
        notes.push(`        <ram:IncludedAccountingNote>
            <ram:ContentCode>GEN</ram:ContentCode>
            <ram:Content>${escapeXml(line2Parts.join(' '))}</ram:Content>
        </ram:IncludedAccountingNote>`);
      }
    }
    
    // Línea 3: Email con prefijo "EMAIL:"
    if (notifyParty.email) {
      notes.push(`        <ram:IncludedAccountingNote>
            <ram:ContentCode>GEN</ram:ContentCode>
            <ram:Content>EMAIL: ${escapeXml(notifyParty.email)}</ram:Content>
        </ram:IncludedAccountingNote>`);
    }
    
    // Línea 4: Ciudad, Estado (nombre completo), País (nombre completo)
    if (address?.place || address?.state || address?.countryCode) {
      const locationParts: string[] = [];
      if (address?.place) locationParts.push(address.place);
      if (address?.state) locationParts.push(getStateName(address.state));
      if (address?.countryCode) locationParts.push(getCountryName(address.countryCode));
      if (locationParts.length > 0) {
        notes.push(`        <ram:IncludedAccountingNote>
            <ram:ContentCode>GEN</ram:ContentCode>
            <ram:Content>${escapeXml(locationParts.join(', '))}</ram:Content>
        </ram:IncludedAccountingNote>`);
      }
    }
  }
  
  // Accounting info general
  if (shipment.accounting && shipment.accounting.length > 0) {
    shipment.accounting.forEach(acc => {
      if (acc.accountingInformation) {
        notes.push(`        <ram:IncludedAccountingNote>
            <ram:ContentCode>GEN</ram:ContentCode>
            <ram:Content>${escapeXml(acc.accountingInformation)}</ram:Content>
        </ram:IncludedAccountingNote>`);
      }
    });
  }
  
  return notes.length > 0 ? '\n' + notes.join('\n') : '';
}

function generateAccountingNotesXmlForHouse(house: InternalHouseBill, shipment: InternalShipment): string {
  const notes: string[] = [];
  
  // Also Notify Party → genera múltiples IncludedAccountingNote (1 por línea de datos)
  // Usa el de la house si existe, si no hereda del master
  const notifyParty = house.alsoNotify || shipment.alsoNotify;
  if (notifyParty?.name) {
    // Línea 1: NOTIFY TO: nombre
    notes.push(`            <ram:IncludedAccountingNote>
                <ram:ContentCode>GEN</ram:ContentCode>
                <ram:Content>NOTIFY TO: ${escapeXml(notifyParty.name)}</ram:Content>
            </ram:IncludedAccountingNote>`);
    
    // Línea 2: Dirección con ZIP y teléfono
    const address = notifyParty.address;
    if (address?.street || address?.postalCode || notifyParty.contact?.number) {
      const line2Parts: string[] = [];
      if (address?.street) line2Parts.push(address.street);
      if (address?.postalCode) line2Parts.push(`ZIP: ${address.postalCode}`);
      if (notifyParty.contact?.number) line2Parts.push(`PH: ${notifyParty.contact.number}`);
      if (line2Parts.length > 0) {
        notes.push(`            <ram:IncludedAccountingNote>
                <ram:ContentCode>GEN</ram:ContentCode>
                <ram:Content>${escapeXml(line2Parts.join(' '))}</ram:Content>
            </ram:IncludedAccountingNote>`);
      }
    }
    
    // Línea 3: Email con prefijo "EMAIL:"
    if (notifyParty.email) {
      notes.push(`            <ram:IncludedAccountingNote>
                <ram:ContentCode>GEN</ram:ContentCode>
                <ram:Content>EMAIL: ${escapeXml(notifyParty.email)}</ram:Content>
            </ram:IncludedAccountingNote>`);
    }
    
    // Línea 4: Ciudad, Estado (nombre completo), País (nombre completo)
    if (address?.place || address?.state || address?.countryCode) {
      const locationParts: string[] = [];
      if (address?.place) locationParts.push(address.place);
      if (address?.state) locationParts.push(getStateName(address.state));
      if (address?.countryCode) locationParts.push(getCountryName(address.countryCode));
      if (locationParts.length > 0) {
        notes.push(`            <ram:IncludedAccountingNote>
                <ram:ContentCode>GEN</ram:ContentCode>
                <ram:Content>${escapeXml(locationParts.join(', '))}</ram:Content>
            </ram:IncludedAccountingNote>`);
      }
    }
  }
  
  // Accounting info: usa el de la house si existe, si no hereda del master
  const accountingInfo = (house.accounting && house.accounting.length > 0) 
    ? house.accounting 
    : shipment.accounting;
  
  if (accountingInfo && accountingInfo.length > 0) {
    accountingInfo.forEach(acc => {
      if (acc.accountingInformation) {
        notes.push(`            <ram:IncludedAccountingNote>
                <ram:ContentCode>GEN</ram:ContentCode>
                <ram:Content>${escapeXml(acc.accountingInformation)}</ram:Content>
            </ram:IncludedAccountingNote>`);
      }
    });
  }
  
  return notes.length > 0 ? '\n' + notes.join('\n') : '';
}

function getUniqueHtsCodes(shipment: InternalShipment): string[] {
  const codes = new Set<string>();
  
  // Códigos del master
  if (shipment.rates) {
    shipment.rates.forEach(rate => {
      if (rate.hsCodes) {
        rate.hsCodes.forEach(code => codes.add(code));
      } else if (rate.hsCode) {
        codes.add(rate.hsCode);
      }
    });
  }
  
  // Códigos de houses
  if (shipment.houseBills) {
    shipment.houseBills.forEach(house => {
      if (house.htsCodes) {
        house.htsCodes.forEach(code => codes.add(code));
      }
    });
  }
  
  return Array.from(codes);
}

function getGoodsDescription(shipment: InternalShipment): string {
  if (shipment.description) {
    return shipment.description.substring(0, 200);
  }
  
  if (shipment.hasHouses) {
    return 'CONSOLIDATION COMERCIAL INVOICE ATTACHED FRESH CUT FLOWERS';
  }
  
  return shipment.rates?.[0]?.description || 'FRESH CUT FLOWERS';
}

function mapOtherChargeCode(code: string): string {
  // Mapeo de códigos CARGO-IMP a códigos XML
  const mapping: Record<string, string> = {
    'AWC': 'AW',
    'AWA': 'DA',
    'MY': 'MY',
    'FE': 'FE',
    'CG': 'CG'
  };
  return mapping[code] || code.substring(0, 2);
}

function mapRateClassCode(code?: string): string {
  if (!code) return 'K';
  
  const mapping: Record<string, string> = {
    'N': 'K',
    'Q': 'Q',
    'C': 'C',
    'M': 'M',
    'NORMAL_RATE': 'K',
    'QUANTITY_RATE': 'Q',
    'SPECIFIC_COMMODITY_RATE': 'C',
    'MINIMUM_CHARGE': 'M'
  };
  
  return mapping[code] || 'K';
}

// ============================================================
// EXPORT SERVICE CLASS
// ============================================================

export class CargoXmlService {
  generateXFWB(shipment: InternalShipment): CargoXmlResult {
    return generateXFWB(shipment);
  }
  
  generateXFZB(shipment: InternalShipment, house: InternalHouseBill): CargoXmlResult {
    return generateXFZB(shipment, house);
  }
  
  generateBundle(shipment: InternalShipment): CargoXmlBundle {
    return generateCargoXmlBundle(shipment);
  }
}

export const cargoXmlService = new CargoXmlService();
