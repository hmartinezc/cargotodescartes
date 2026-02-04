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

import { InternalShipment, InternalHouseBill } from '../types';

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
// XFWB (MASTER WAYBILL) GENERATOR
// ============================================================

export function generateXFWB(shipment: InternalShipment): CargoXmlResult {
  const errors: string[] = [];
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
    const sphXml = sphCodes.map(code => `
        <ram:HandlingSPHInstructions>
            <ram:DescriptionCode>${code}</ram:DescriptionCode>
        </ram:HandlingSPHInstructions>`).join('');
    
    // HTS codes
    const htsCodes = getUniqueHtsCodes(shipment);
    const htsXml = htsCodes.map(code => `
                <ram:TypeCode>${code}</ram:TypeCode>`).join('');
    
    // Vuelos
    const flightsXml = generateFlightsXml(shipment);
    
    // Accounting notes
    const accountingXml = generateAccountingNotesXml(shipment);
    
    // Descripción de mercancía
    const goodsDescription = escapeXml(getGoodsDescription(shipment));
    
    // Construir XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:Waybill ${XFWB_NAMESPACES}>
    <rsm:MessageHeaderDocument>
        <ram:ID>${awbNumber}</ram:ID>
        <ram:Name>Master Air Waybill</ram:Name>
        <ram:TypeCode>741</ram:TypeCode>
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
            <ram:ContentCode>C</ram:ContentCode>
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
${flightsXml}${sphXml}${accountingXml}
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
    const htsXml = htsCodes.map(code => `
                <ram:TypeCode>${code}</ram:TypeCode>`).join('');
    
    // SPH codes
    const sphCodes = shipment.specialHandlingCodes || ['EAP', 'PER'];
    const sphXml = sphCodes.map(code => `
            <ram:HandlingSPHInstructions>
                <ram:DescriptionCode>${code}</ram:DescriptionCode>
            </ram:HandlingSPHInstructions>`).join('');
    
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
${flightsXml}${sphXml}
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
                <ram:GrossWeightMeasure unitCode="KGM">${totalWeight}</ram:GrossWeightMeasure>
                <ram:PieceQuantity>${totalPieces}</ram:PieceQuantity>
                <ram:NatureIdentificationTransportCargo>
                    <ram:Identification>${goodsDescription}</ram:Identification>
                </ram:NatureIdentificationTransportCargo>
                <ram:OriginCountry>
                    <ram:ID>${houseShipper?.address?.countryCode || shipment.shipper?.address?.countryCode || 'CO'}</ram:ID>
                </ram:OriginCountry>
                <ram:TransportLogisticsPackage>
                    <ram:ItemQuantity>${totalPieces}</ram:ItemQuantity>
                    <ram:GrossWeightMeasure unitCode="KGM">${totalWeight}</ram:GrossWeightMeasure>
                </ram:TransportLogisticsPackage>
                <ram:ApplicableFreightRateServiceCharge>
                    <ram:CategoryCode>K</ram:CategoryCode>
                    <ram:CommodityItemID>${shipment.commodityCode || '1421'}</ram:CommodityItemID>
                    <ram:ChargeableWeightMeasure unitCode="KGM">${totalWeight}</ram:ChargeableWeightMeasure>
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
            </ram:PostalStructuredAddress>${shipper.contact?.number ? `
            <ram:DefinedTradeContact>
                <ram:DirectTelephoneCommunication>
                    <ram:CompleteNumber>${escapeXml(shipper.contact.number)}</ram:CompleteNumber>
                </ram:DirectTelephoneCommunication>
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
            </ram:PostalStructuredAddress>${consignee.contact?.number ? `
            <ram:DefinedTradeContact>
                <ram:DirectTelephoneCommunication>
                    <ram:CompleteNumber>${escapeXml(consignee.contact.number)}</ram:CompleteNumber>
                </ram:DirectTelephoneCommunication>
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
                <ram:PostalStructuredAddress>
                    <ram:StreetName>${escapeXml(address.street || '')}</ram:StreetName>
                    <ram:CityName>${escapeXml(address.place || '')}</ram:CityName>
                    <ram:CountryID>${address.countryCode || 'CO'}</ram:CountryID>
                    <ram:CountryName>${getCountryName(address.countryCode || 'CO')}</ram:CountryName>
                </ram:PostalStructuredAddress>${shipper.contact?.number ? `
                <ram:DefinedTradeContact>
                    <ram:DirectTelephoneCommunication>
                        <ram:CompleteNumber>${escapeXml(shipper.contact.number)}</ram:CompleteNumber>
                    </ram:DirectTelephoneCommunication>
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
                <ram:PostalStructuredAddress>
                    <ram:StreetName>${escapeXml(address.street || '')}</ram:StreetName>
                    <ram:CityName>${escapeXml(address.place || '')}</ram:CityName>
                    <ram:CountryID>${address.countryCode || 'US'}</ram:CountryID>
                    <ram:CountryName>${getCountryName(address.countryCode || 'US')}</ram:CountryName>${state ? `
                    <ram:CountrySubDivisionName>${getStateName(state)}</ram:CountrySubDivisionName>` : ''}
                </ram:PostalStructuredAddress>${consignee.contact?.number ? `
                <ram:DefinedTradeContact>
                    <ram:DirectTelephoneCommunication>
                        <ram:CompleteNumber>${escapeXml(consignee.contact.number)}</ram:CompleteNumber>
                    </ram:DirectTelephoneCommunication>
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
        </ram:SpecifiedLogisticsTransportMovement>
`;
  }).join('');
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
            </ram:SpecifiedLogisticsTransportMovement>
`;
  }).join('');
}

function generateAccountingNotesXml(shipment: InternalShipment): string {
  if (!shipment.accounting || shipment.accounting.length === 0) return '';
  
  return shipment.accounting.map(acc => `
        <ram:IncludedAccountingNote>
            <ram:ContentCode>GEN</ram:ContentCode>
            <ram:Content>${escapeXml(acc.accountingInformation || '')}</ram:Content>
        </ram:IncludedAccountingNote>`).join('');
}

function generateDimensionsXml(dimensions?: InternalShipment['dimensions']): string {
  if (!dimensions || dimensions.length === 0) return '';
  
  // Usar primera dimensión para el ejemplo
  const dim = dimensions[0];
  return `
                    <ram:LinearSpatialDimension>
                        <ram:WidthMeasure unitCode="CMT">${dim.width || 0}</ram:WidthMeasure>
                        <ram:LengthMeasure unitCode="CMT">${dim.length || 0}</ram:LengthMeasure>
                        <ram:HeightMeasure unitCode="CMT">${dim.height || 0}</ram:HeightMeasure>
                    </ram:LinearSpatialDimension>`;
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
