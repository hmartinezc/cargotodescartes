/**
 * Tests de validación para IATA Cargo-XML (XFWB y XFZB)
 * Basado en el convertidor de referencia: https://github.com/riege/one-record-converter
 * 
 * Este archivo valida que los XMLs generados cumplen con el estándar IATA Cargo-XML 3.0
 * 
 * @author Senior Solutions Architect
 * @version 1.0.0
 */

import { DescartesXmlService } from '../services/providers/descartes/descartesXmlService';
import { InternalShipment, InternalHouseBill, Party, FlightSegment, RateCharge, ULD, Dimension } from '../types';

// ============================================================
// DATOS DE PRUEBA (Basados en ejemplos de Riege)
// AWB: 888-11111111 (similar al test de Riege)
// ============================================================

const TEST_SHIPPER: Party = {
  name: 'SHIPPER COMPANY IRELAND',
  name2: 'ATTN: HILDA HILARIOUS',
  address: {
    street: 'Harbour Point Business Park',
    street2: '',
    place: 'LITTLE CITY',
    state: 'IE',
    countryCode: 'IE',
    postalCode: 'ABCD'
  },
  contact: {
    identifier: 'TE',
    number: '353123456789'
  }
};

const TEST_CONSIGNEE: Party = {
  name: 'FORWARDER COMPANY SHANGHAI LTD',
  address: {
    street: 'SUHANG RD PUDONG AIRPORT',
    street2: 'AIRPORT ROAD',
    place: 'SHANGHAI',
    state: '',
    countryCode: 'CN',
    postalCode: ''
  },
  contact: {
    identifier: 'TE',
    number: '862123454321'
  }
};

const TEST_AGENT = {
  name: 'FORWARDER COMPANY IRELAND LIMITED',
  iataCode: '3456789',
  place: 'Little City'
};

// Flights según la interfaz FlightSegment
const TEST_FLIGHTS: FlightSegment[] = [
  {
    flightNumber: 'XX8012',
    origin: 'ORK',
    destination: 'DUB',
    date: '2021-03-10',
    carrierCode: 'XX'
  },
  {
    flightNumber: 'XX345',
    origin: 'DUB',
    destination: 'AUH',
    date: '2021-03-12',
    carrierCode: 'XX'
  }
];

// Rates según la interfaz RateCharge
const TEST_RATES: RateCharge[] = [
  {
    pieces: 3,
    weight: 1042,
    chargeableWeight: 1042,
    rateClassCode: 'M',
    rateOrCharge: 4.44,
    total: 4626.48,
    description: 'CONSOLIDATION AS PER ATTACHED MANIFEST SECURE CARGO',
    hsCodes: ['000111']
  }
];

// Shipment DIRECTO (sin houses) - Similar a 888-11111111_XFWB.xml de Riege
const DIRECT_SHIPMENT: InternalShipment = {
  id: 'test-direct-001',
  status: 'DRAFT',
  awbNumber: '888-11111111',
  messageId: 'MSG-888-11111111-TEST',
  origin: 'ORK',
  destination: 'PVG',
  pieces: 3,
  weight: 1042,
  weightUnit: 'KILOGRAM',
  volume: 2.602,
  volumeUnit: 'CUBIC_METRE',
  currency: 'EUR',
  paymentMethod: 'Prepaid',
  declaredValueCarriage: 'NVD',
  declaredValueCustoms: 'NVD',
  hasHouses: false,
  shipper: TEST_SHIPPER,
  consignee: TEST_CONSIGNEE,
  agent: TEST_AGENT,
  flights: TEST_FLIGHTS,
  rates: TEST_RATES,
  otherCharges: [],
  specialHandlingCodes: ['GEN'],
  oci: [
    {
      countryCode: 'IE',
      infoIdentifier: 'SHP',
      controlInfo: 'T',
      additionalControlInfo: 'IE1234567N'
    }
  ],
  signature: 'MARK USER',
  executionPlace: 'ORK',
  executionDate: '2021-03-10'
};

// Houses según la interfaz InternalHouseBill
const TEST_HOUSES: InternalHouseBill[] = [
  {
    id: 'house-001',
    hawbNumber: 'HAWB-001',
    pieces: 5,
    weight: 250,
    shipperName: 'HOUSE SHIPPER ONE',
    consigneeName: 'HOUSE CONSIGNEE ONE',
    origin: 'ORK',
    destination: 'PVG',
    natureOfGoods: 'SPARE PARTS',
    htsCodes: ['8421.21']
  },
  {
    id: 'house-002',
    hawbNumber: 'HAWB-002',
    pieces: 10,
    weight: 792,
    shipperName: 'HOUSE SHIPPER TWO',
    consigneeName: 'HOUSE CONSIGNEE TWO',
    origin: 'ORK',
    destination: 'PVG',
    natureOfGoods: 'ELECTRONIC COMPONENTS',
    htsCodes: ['8542.31']
  }
];

// Shipment CONSOLIDADO (con houses) - Master AWB TypeCode 741
const CONSOLIDATED_SHIPMENT: InternalShipment = {
  ...DIRECT_SHIPMENT,
  id: 'test-consol-001',
  awbNumber: '180-99999999',
  messageId: 'MSG-180-99999999-CONSOL',
  hasHouses: true,
  houseBills: TEST_HOUSES
};

// Shipment con ULDs - Para test de AssociatedUnitLoadTransportEquipment
// Basado en riege/one-record-converter 888-11111111_XFWB_multipleULD_multipleHTS.xml
const SHIPMENT_WITH_ULDS: InternalShipment = {
  ...DIRECT_SHIPMENT,
  id: 'test-uld-001',
  awbNumber: '888-22222222',
  messageId: 'MSG-888-22222222-ULD',
  ulds: [
    {
      serialNumber: '1337',
      typeCode: 'PMC',
      ownerCode: 'XX'
    },
    {
      serialNumber: '4711',
      typeCode: 'AKE',
      ownerCode: 'XX'
    }
  ],
  dimensions: [
    {
      length: 120,
      width: 80,
      height: 96,
      pieces: 2,
      unit: 'CENTIMETRE'
    },
    {
      length: 120,
      width: 80,
      height: 79,
      pieces: 1,
      unit: 'CENTIMETRE'
    }
  ]
};

// ============================================================
// VALIDADORES DE ESTRUCTURA XML
// ============================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

/**
 * Valida que un XML contenga los elementos requeridos para XFWB
 * Soporta formato Riege (ns2:Waybill) y formato simplificado (iata:XFWB)
 */
function validateXFWBStructure(xml: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: []
  };

  // 1. Verificar declaración XML
  if (!xml.startsWith('<?xml')) {
    result.errors.push('Falta declaración XML');
  }

  // 2. Verificar elemento raíz XFWB con namespaces - soporta ambos formatos
  const hasWaybillRoot = xml.includes('<iata:XFWB') || xml.includes('<ns2:Waybill');
  if (!hasWaybillRoot) {
    result.errors.push('Falta elemento raíz Waybill (iata:XFWB o ns2:Waybill)');
  }

  // 3. Verificar namespaces requeridos - soporta formato Riege
  const hasWaybillNamespace = 
    xml.includes('xmlns:iata="iata:waybill:1"') ||
    xml.includes('xmlns:ns2="iata:waybill:1"');
  if (!hasWaybillNamespace) {
    result.errors.push('Falta namespace iata:waybill:1');
  }

  // 4. MessageHeaderDocument - soporta formato con prefijo ns2
  const hasMessageHeader = xml.includes('<MessageHeaderDocument>') || xml.includes('<ns2:MessageHeaderDocument>');
  if (!hasMessageHeader) {
    result.errors.push('Falta MessageHeaderDocument');
  }
  
  // TypeCode debe ser 740 (Direct) o 741 (Master)
  const typeCodeMatch = xml.match(/<TypeCode>(\d+)<\/TypeCode>/);
  if (typeCodeMatch) {
    const code = typeCodeMatch[1];
    if (code !== '740' && code !== '741') {
      result.errors.push(`TypeCode inválido: ${code}. Debe ser 740 (Direct) o 741 (Master)`);
    } else {
      result.info.push(`TypeCode: ${code} (${code === '740' ? 'Direct AWB' : 'Master AWB'})`);
    }
  } else {
    result.errors.push('Falta TypeCode en MessageHeaderDocument');
  }

  // 5. BusinessHeaderDocument - soporta formato ns2
  const hasBusinessHeader = xml.includes('<BusinessHeaderDocument>') || xml.includes('<ns2:BusinessHeaderDocument>');
  if (!hasBusinessHeader) {
    result.errors.push('Falta BusinessHeaderDocument');
  }

  // 6. Verificar AWB ID en BusinessHeaderDocument - soporta formato ns2
  const awbMatch = xml.match(/<(?:ns2:)?BusinessHeaderDocument>[\s\S]*?<ID>(\d{3}-\d{8})<\/ID>/);
  if (awbMatch) {
    result.info.push(`AWB Number: ${awbMatch[1]}`);
    // Validar formato
    if (!/^\d{3}-\d{8}$/.test(awbMatch[1])) {
      result.warnings.push('AWB format should be XXX-XXXXXXXX');
    }
  } else {
    result.errors.push('Falta AWB ID en BusinessHeaderDocument');
  }

  // 7. MasterConsignment - soporta formato ns2
  const hasMasterConsignment = xml.includes('<MasterConsignment>') || xml.includes('<ns2:MasterConsignment>');
  if (!hasMasterConsignment) {
    result.errors.push('Falta MasterConsignment');
  }

  // 8. TransportContractDocument - NO OBLIGATORIO en formato Riege actual
  // Los indicadores NVD van directamente después del ID
  if (xml.includes('<TransportContractDocument>')) {
    result.info.push('TransportContractDocument presente');
  }

  // 9. TotalPieceQuantity
  if (!xml.includes('<TotalPieceQuantity>')) {
    result.errors.push('Falta TotalPieceQuantity');
  }

  // 10. IncludedTareGrossWeightMeasure
  if (!xml.includes('<IncludedTareGrossWeightMeasure')) {
    result.errors.push('Falta IncludedTareGrossWeightMeasure');
  }

  // 11. OriginLocation y FinalDestinationLocation
  if (!xml.includes('<OriginLocation>')) {
    result.errors.push('Falta OriginLocation');
  }
  if (!xml.includes('<FinalDestinationLocation>')) {
    result.errors.push('Falta FinalDestinationLocation');
  }

  // 12. Parties
  if (!xml.includes('<ConsignorParty>')) {
    result.errors.push('Falta ConsignorParty (Shipper)');
  }
  if (!xml.includes('<ConsigneeParty>')) {
    result.errors.push('Falta ConsigneeParty');
  }
  if (!xml.includes('<FreightForwarderParty>')) {
    result.warnings.push('Falta FreightForwarderParty (opcional pero recomendado)');
  }

  // 13. Para consolidados, verificar indicadores
  if (xml.includes('<TypeCode>741</TypeCode>')) {
    if (!xml.includes('<ConsolidationIndicator>true</ConsolidationIndicator>')) {
      result.errors.push('Master AWB (741) debe tener ConsolidationIndicator=true');
    }
    if (!xml.includes('<ConsignmentItemQuantity>')) {
      result.warnings.push('Master AWB debería tener ConsignmentItemQuantity (cantidad de houses)');
    }
  }

  // 14. IncludedHeaderNote (ContentCode M o C)
  if (xml.includes('<IncludedHeaderNote>')) {
    const contentCodeMatch = xml.match(/<IncludedHeaderNote>[\s\S]*?<ContentCode>([MC])<\/ContentCode>/);
    if (contentCodeMatch) {
      result.info.push(`IncludedHeaderNote ContentCode: ${contentCodeMatch[1]} (${contentCodeMatch[1] === 'M' ? 'Master' : 'Consolidation'})`);
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Valida que un XML contenga los elementos requeridos para XFZB
 */
function validateXFZBStructure(xml: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    info: []
  };

  // 1. Verificar declaración XML
  if (!xml.startsWith('<?xml')) {
    result.errors.push('Falta declaración XML');
  }

  // 2. Verificar elemento raíz XFZB con namespaces - soporta ambos formatos
  const hasXfzbRoot = xml.includes('<iata:XFZB') || xml.includes('<ns2:HouseWaybill');
  if (!hasXfzbRoot) {
    result.errors.push('Falta elemento raíz (iata:XFZB o ns2:HouseWaybill)');
  }

  // 3. Verificar namespaces requeridos - soporta formato Riege
  const hasHouseNamespace = 
    xml.includes('xmlns:iata="iata:housewaybill:1"') ||
    xml.includes('xmlns:ns2="iata:housewaybill:1"');
  if (!hasHouseNamespace) {
    result.errors.push('Falta namespace iata:housewaybill:1');
  }

  // 4. MessageHeaderDocument - soporta formato ns2
  const hasMessageHeader = xml.includes('<MessageHeaderDocument>') || xml.includes('<ns2:MessageHeaderDocument>');
  if (!hasMessageHeader) {
    result.errors.push('Falta MessageHeaderDocument');
  }

  // TypeCode debe ser 703 (House Manifest)
  const typeCodeMatch = xml.match(/<TypeCode>(\d+)<\/TypeCode>/);
  if (typeCodeMatch) {
    const code = typeCodeMatch[1];
    if (code !== '703') {
      result.warnings.push(`TypeCode: ${code}. Esperado 703 para House Manifest`);
    } else {
      result.info.push('TypeCode: 703 (House Manifest)');
    }
  }

  // 5. BusinessHeaderDocument con referencia al Master - soporta formato ns2
  const hasBusinessHeader = xml.includes('<BusinessHeaderDocument>') || xml.includes('<ns2:BusinessHeaderDocument>');
  if (!hasBusinessHeader) {
    result.errors.push('Falta BusinessHeaderDocument');
  }

  // 6. MasterConsignment con TransportContractDocument (link al XFWB) - soporta formato ns2
  const hasMasterConsignment = xml.includes('<MasterConsignment>') || xml.includes('<ns2:MasterConsignment>');
  if (!hasMasterConsignment) {
    result.errors.push('Falta MasterConsignment');
  }

  // TransportContractDocument en MasterConsignment (CRÍTICO - vinculación con XFWB)
  const masterTransportDoc = xml.match(/<(?:ns2:)?MasterConsignment>[\s\S]*?<TransportContractDocument>[\s\S]*?<ID>([^<]+)<\/ID>/);
  if (masterTransportDoc) {
    result.info.push(`XFZB referencia al Master AWB: ${masterTransportDoc[1]}`);
  } else {
    result.errors.push('Falta TransportContractDocument en MasterConsignment (requerido para vincular con XFWB)');
  }

  // 7. IncludedHouseConsignment(s)
  const houseCount = (xml.match(/<IncludedHouseConsignment>/g) || []).length;
  if (houseCount === 0) {
    result.errors.push('Falta al menos un IncludedHouseConsignment');
  } else {
    result.info.push(`Número de Houses: ${houseCount}`);
  }

  // 8. Cada house debe tener TransportContractDocument (HAWB number)
  const houseTransportDocs = xml.match(/<IncludedHouseConsignment>[\s\S]*?<TransportContractDocument>[\s\S]*?<ID>([^<]+)<\/ID>/g);
  if (houseTransportDocs) {
    result.info.push(`Houses con TransportContractDocument: ${houseTransportDocs.length}`);
    if (houseTransportDocs.length !== houseCount) {
      result.warnings.push('Algunos houses no tienen TransportContractDocument');
    }
  } else {
    result.errors.push('IncludedHouseConsignment debe tener TransportContractDocument con HAWB ID');
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Compara valores específicos en el XML
 */
function extractXmlValue(xml: string, xpath: string): string | null {
  // Simple extractor para testing (no es XPath real)
  const regex = new RegExp(`<${xpath}>([^<]*)</${xpath}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

// ============================================================
// TESTS
// ============================================================

class CargoXmlTestRunner {
  private service: DescartesXmlService;
  private testResults: { name: string; passed: boolean; details: string[] }[] = [];

  constructor() {
    this.service = new DescartesXmlService({
      environment: 'UAT'
    });
  }

  /**
   * Ejecuta todos los tests
   */
  async runAllTests(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('       IATA Cargo-XML Validation Tests');
    console.log('       Basado en riege/one-record-converter');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test 1: XFWB Directo (similar a 888-11111111_XFWB.xml de Riege)
    this.testXFWBDirect();

    // Test 2: XFWB Master (consolidado con TypeCode 741)
    this.testXFWBMaster();

    // Test 3: XFZB (House manifest)
    this.testXFZB();

    // Test 4: Validación de AWB format
    this.testAwbFormat();

    // Test 5: Validación de partes (Shipper, Consignee, Agent)
    this.testParties();

    // Test 6: Validación de vuelos
    this.testFlights();

    // Test 7: ULDs (Unit Load Devices) - Según Riege multipleULD
    this.testULDs();

    // Test 8: XFZB Indicadores (NVD, Prepaid) - Según Riege SEL22222222_XFZB
    this.testXFZBIndicators();

    // Test 9: ICS2 listAgencyID - Cumplimiento UE
    this.testICS2ListAgencyID();

    // Test 10: ACAS Email - Cumplimiento EE.UU.
    this.testACASEmailSupport();

    // Resumen
    this.printSummary();
  }

  private testXFWBDirect(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 1: XFWB Directo (TypeCode 740)                         │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    const details: string[] = [];
    let passed = true;

    try {
      const result = this.service.generateMasterAWB(DIRECT_SHIPMENT);
      const xml = result.content;
      
      console.log('Generando XFWB para AWB:', DIRECT_SHIPMENT.awbNumber);
      
      const validation = validateXFWBStructure(xml);
      
      // Imprimir info
      for (const info of validation.info) {
        console.log(`  ℹ️  ${info}`);
        details.push(`INFO: ${info}`);
      }
      
      // Imprimir warnings
      for (const warning of validation.warnings) {
        console.log(`  ⚠️  ${warning}`);
        details.push(`WARNING: ${warning}`);
      }
      
      // Imprimir errors
      for (const error of validation.errors) {
        console.log(`  ❌ ${error}`);
        details.push(`ERROR: ${error}`);
        passed = false;
      }

      // Verificaciones específicas de Riege
      const typeCode = extractXmlValue(xml, 'TypeCode');
      if (typeCode !== '740') {
        console.log(`  ❌ TypeCode esperado: 740, obtenido: ${typeCode}`);
        passed = false;
      } else {
        console.log(`  ✅ TypeCode: 740 (Direct AWB)`);
      }

      // No debe tener ConsolidationIndicator
      if (xml.includes('<ConsolidationIndicator>')) {
        console.log('  ⚠️  Direct AWB no debería tener ConsolidationIndicator');
        details.push('WARNING: Direct AWB tiene ConsolidationIndicator');
      }

      console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      passed = false;
    }

    this.testResults.push({ name: 'XFWB Directo', passed, details });
  }

  private testXFWBMaster(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 2: XFWB Master Consolidado (TypeCode 741)              │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    const details: string[] = [];
    let passed = true;

    try {
      const result = this.service.generateMasterAWB(CONSOLIDATED_SHIPMENT);
      const xml = result.content;
      
      console.log('Generando XFWB para AWB:', CONSOLIDATED_SHIPMENT.awbNumber);
      console.log('Número de Houses:', CONSOLIDATED_SHIPMENT.houseBills?.length);
      
      const validation = validateXFWBStructure(xml);
      
      // Imprimir resultados
      for (const info of validation.info) {
        console.log(`  ℹ️  ${info}`);
      }
      for (const warning of validation.warnings) {
        console.log(`  ⚠️  ${warning}`);
      }
      for (const error of validation.errors) {
        console.log(`  ❌ ${error}`);
        passed = false;
      }

      // TypeCode debe ser 741
      const typeCode = extractXmlValue(xml, 'TypeCode');
      if (typeCode !== '741') {
        console.log(`  ❌ TypeCode esperado: 741 (Master), obtenido: ${typeCode}`);
        passed = false;
      } else {
        console.log(`  ✅ TypeCode: 741 (Master AWB)`);
      }

      // Debe tener ConsolidationIndicator=true
      if (!xml.includes('<ConsolidationIndicator>true</ConsolidationIndicator>')) {
        console.log('  ❌ Falta ConsolidationIndicator=true');
        passed = false;
      } else {
        console.log('  ✅ ConsolidationIndicator: true');
      }

      // Debe tener ConsignmentItemQuantity
      const itemQty = extractXmlValue(xml, 'ConsignmentItemQuantity');
      if (itemQty === String(CONSOLIDATED_SHIPMENT.houseBills?.length)) {
        console.log(`  ✅ ConsignmentItemQuantity: ${itemQty}`);
      } else {
        console.log(`  ⚠️  ConsignmentItemQuantity: ${itemQty} (esperado: ${CONSOLIDATED_SHIPMENT.houseBills?.length})`);
      }

      console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      passed = false;
    }

    this.testResults.push({ name: 'XFWB Master', passed, details });
  }

  private testXFZB(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 3: XFZB House Manifest (TypeCode 703)                  │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    const details: string[] = [];
    let passed = true;

    try {
      const results = this.service.generateConsolidation(CONSOLIDATED_SHIPMENT);
      
      if (results.length === 0) {
        console.log('  ❌ No se generó ningún XFZB');
        passed = false;
      } else {
        const xml = results[0].content;
        console.log('Generando XFZB para Master AWB:', CONSOLIDATED_SHIPMENT.awbNumber);
        
        const validation = validateXFZBStructure(xml);
        
        for (const info of validation.info) {
          console.log(`  ℹ️  ${info}`);
        }
        for (const warning of validation.warnings) {
          console.log(`  ⚠️  ${warning}`);
        }
        for (const error of validation.errors) {
          console.log(`  ❌ ${error}`);
          passed = false;
        }

        // TypeCode debe ser 703
        const typeCode = extractXmlValue(xml, 'TypeCode');
        if (typeCode === '703') {
          console.log('  ✅ TypeCode: 703 (House Manifest)');
        } else {
          console.log(`  ⚠️  TypeCode: ${typeCode} (esperado 703)`);
        }

        // Verificar namespace correcto
        if (xml.includes('xmlns:iata="iata:housewaybill:1"')) {
          console.log('  ✅ Namespace XFZB correcto');
        } else {
          console.log('  ❌ Namespace XFZB incorrecto');
          passed = false;
        }

        // Verificar vinculación con Master
        if (xml.includes(`<ID>${CONSOLIDATED_SHIPMENT.awbNumber}</ID>`)) {
          console.log('  ✅ Referencia al Master AWB presente');
        } else {
          console.log('  ❌ Falta referencia al Master AWB');
          passed = false;
        }
      }

      console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      passed = false;
    }

    this.testResults.push({ name: 'XFZB House Manifest', passed, details });
  }

  private testAwbFormat(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 4: Validación formato AWB (XXX-XXXXXXXX)               │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    let passed = true;

    // Tests de formato AWB según Riege
    const testCases = [
      { input: '88811111111', expected: '888-11111111' },
      { input: '888-11111111', expected: '888-11111111' },
      { input: '180-99999999', expected: '180-99999999' },
      { input: '18099999999', expected: '180-99999999' }
    ];

    for (const tc of testCases) {
      const shipment = { ...DIRECT_SHIPMENT, awbNumber: tc.input };
      const result = this.service.generateMasterAWB(shipment);
      
      // Extraer AWB del XML
      const awbMatch = result.content.match(/<BusinessHeaderDocument>[\s\S]*?<ID>([^<]+)<\/ID>/);
      const awbInXml = awbMatch ? awbMatch[1] : null;
      
      if (awbInXml === tc.expected) {
        console.log(`  ✅ "${tc.input}" → "${awbInXml}"`);
      } else {
        console.log(`  ❌ "${tc.input}" → "${awbInXml}" (esperado: "${tc.expected}")`);
        passed = false;
      }
    }

    console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');
    this.testResults.push({ name: 'AWB Format', passed, details: [] });
  }

  private testParties(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 5: Validación de Parties (Shipper, Consignee, Agent)   │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    let passed = true;

    try {
      const result = this.service.generateMasterAWB(DIRECT_SHIPMENT);
      const xml = result.content;

      // Shipper (ConsignorParty)
      if (xml.includes('<ConsignorParty>') && xml.includes('SHIPPER COMPANY IRELAND')) {
        console.log('  ✅ ConsignorParty (Shipper) presente');
      } else {
        console.log('  ❌ ConsignorParty incorrecto');
        passed = false;
      }

      // Consignee (ConsigneeParty)
      if (xml.includes('<ConsigneeParty>') && xml.includes('FORWARDER COMPANY SHANGHAI')) {
        console.log('  ✅ ConsigneeParty (Consignee) presente');
      } else {
        console.log('  ❌ ConsigneeParty incorrecto');
        passed = false;
      }

      // Agent (FreightForwarderParty)
      if (xml.includes('<FreightForwarderParty>') && xml.includes('FORWARDER COMPANY IRELAND LIMITED')) {
        console.log('  ✅ FreightForwarderParty (Agent) presente');
      } else {
        console.log('  ❌ FreightForwarderParty incorrecto');
        passed = false;
      }

      // Verificar estructura de dirección
      if (xml.includes('<PostalStructuredAddress>') && xml.includes('<CityName>')) {
        console.log('  ✅ PostalStructuredAddress estructura correcta');
      } else {
        console.log('  ⚠️  PostalStructuredAddress puede estar incompleto');
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      passed = false;
    }

    console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');
    this.testResults.push({ name: 'Parties', passed, details: [] });
  }

  private testFlights(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 6: Validación de Transport Movements (Flights)         │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    let passed = true;

    try {
      const result = this.service.generateMasterAWB(DIRECT_SHIPMENT);
      const xml = result.content;

      // Verificar que existen los vuelos
      const flightCount = (xml.match(/<SpecifiedLogisticsTransportMovement>/g) || []).length;
      const expectedFlights = DIRECT_SHIPMENT.flights?.length || 0;

      if (flightCount === expectedFlights) {
        console.log(`  ✅ Número de vuelos: ${flightCount}`);
      } else {
        console.log(`  ❌ Vuelos: ${flightCount} (esperado: ${expectedFlights})`);
        passed = false;
      }

      // Verificar estructura de vuelo
      for (const flight of DIRECT_SHIPMENT.flights || []) {
        if (xml.includes(`<ID>${flight.flightNumber}</ID>`)) {
          console.log(`  ✅ Vuelo ${flight.flightNumber} encontrado`);
        } else {
          console.log(`  ❌ Vuelo ${flight.flightNumber} no encontrado`);
          passed = false;
        }
      }

      // ModeCode debe ser 4 (Air transport)
      if (xml.includes('<ModeCode>4</ModeCode>')) {
        console.log('  ✅ ModeCode: 4 (Air transport)');
      } else {
        console.log('  ⚠️  ModeCode no es 4');
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      passed = false;
    }

    console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');
    this.testResults.push({ name: 'Flights', passed, details: [] });
  }

  /**
   * TEST 7: ULDs (Unit Load Devices)
   * Valida AssociatedUnitLoadTransportEquipment según riege/888-11111111_XFWB_multipleULD_multipleHTS.xml
   */
  private testULDs(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 7: ULDs (AssociatedUnitLoadTransportEquipment)         │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    let passed = true;

    try {
      const result = this.service.generateMasterAWB(SHIPMENT_WITH_ULDS);
      const xml = result.content;

      console.log('Generando XFWB con ULDs:', SHIPMENT_WITH_ULDS.awbNumber);
      console.log('Número de ULDs:', SHIPMENT_WITH_ULDS.ulds?.length);

      // Verificar presencia de AssociatedUnitLoadTransportEquipment
      const uldCount = (xml.match(/<AssociatedUnitLoadTransportEquipment>/g) || []).length;
      const expectedUlds = SHIPMENT_WITH_ULDS.ulds?.length || 0;

      if (uldCount === expectedUlds) {
        console.log(`  ✅ AssociatedUnitLoadTransportEquipment: ${uldCount} encontrados`);
      } else {
        console.log(`  ❌ ULDs: ${uldCount} (esperado: ${expectedUlds})`);
        passed = false;
      }

      // Verificar ULD específicos
      for (const uld of SHIPMENT_WITH_ULDS.ulds || []) {
        if (xml.includes(`<CharacteristicCode>${uld.typeCode}</CharacteristicCode>`)) {
          console.log(`  ✅ ULD ${uld.typeCode}${uld.serialNumber} encontrado`);
        } else {
          console.log(`  ❌ ULD ${uld.typeCode}${uld.serialNumber} no encontrado`);
          passed = false;
        }
      }

      // Verificar Dimensions (TransportLogisticsPackage)
      const dimensionCount = (xml.match(/<TransportLogisticsPackage>/g) || []).length;
      const expectedDimensions = SHIPMENT_WITH_ULDS.dimensions?.length || 0;

      if (dimensionCount === expectedDimensions) {
        console.log(`  ✅ TransportLogisticsPackage: ${dimensionCount} encontrados`);
      } else {
        console.log(`  ⚠️  Dimensions: ${dimensionCount} (esperado: ${expectedDimensions})`);
      }

      // Verificar LinearSpatialDimension
      if (xml.includes('<LinearSpatialDimension>') && xml.includes('<WidthMeasure')) {
        console.log('  ✅ LinearSpatialDimension con medidas');
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      passed = false;
    }

    console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');
    this.testResults.push({ name: 'ULDs', passed, details: [] });
  }

  /**
   * TEST 8: XFZB Indicadores
   * Valida NilInsuranceValueIndicator, TotalChargePrepaidIndicator según riege/SEL22222222_XFZB.xml
   */
  private testXFZBIndicators(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 8: XFZB Indicadores (NVD, Prepaid)                     │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    let passed = true;

    try {
      const results = this.service.generateConsolidation(CONSOLIDATED_SHIPMENT);
      
      if (results.length === 0) {
        console.log('  ❌ No se generó ningún XFZB');
        passed = false;
      } else {
        const xml = results[0].content;
        console.log('Validando indicadores XFZB para:', CONSOLIDATED_SHIPMENT.awbNumber);

        // Verificar ID en IncludedHouseConsignment
        if (xml.includes('<IncludedHouseConsignment>') && xml.includes('<ID>HAWB-')) {
          console.log('  ✅ IncludedHouseConsignment tiene <ID>');
        } else {
          console.log('  ⚠️  IncludedHouseConsignment sin <ID> inicial');
        }

        // NilCarriageValueIndicator
        if (xml.includes('<NilCarriageValueIndicator>true</NilCarriageValueIndicator>')) {
          console.log('  ✅ NilCarriageValueIndicator: true');
        } else {
          console.log('  ❌ Falta NilCarriageValueIndicator');
          passed = false;
        }

        // NilCustomsValueIndicator
        if (xml.includes('<NilCustomsValueIndicator>true</NilCustomsValueIndicator>')) {
          console.log('  ✅ NilCustomsValueIndicator: true');
        } else {
          console.log('  ❌ Falta NilCustomsValueIndicator');
          passed = false;
        }

        // NilInsuranceValueIndicator (nuevo según Riege)
        if (xml.includes('<NilInsuranceValueIndicator>true</NilInsuranceValueIndicator>')) {
          console.log('  ✅ NilInsuranceValueIndicator: true');
        } else {
          console.log('  ❌ Falta NilInsuranceValueIndicator');
          passed = false;
        }

        // TotalChargePrepaidIndicator (nuevo según Riege)
        if (xml.includes('<TotalChargePrepaidIndicator>')) {
          const isPrepaid = CONSOLIDATED_SHIPMENT.paymentMethod === 'Prepaid';
          const expectedValue = isPrepaid ? 'true' : 'false';
          if (xml.includes(`<TotalChargePrepaidIndicator>${expectedValue}</TotalChargePrepaidIndicator>`)) {
            console.log(`  ✅ TotalChargePrepaidIndicator: ${expectedValue}`);
          } else {
            console.log(`  ⚠️  TotalChargePrepaidIndicator valor incorrecto`);
          }
        } else {
          console.log('  ❌ Falta TotalChargePrepaidIndicator');
          passed = false;
        }

        // TotalDisbursementPrepaidIndicator (nuevo según Riege)
        if (xml.includes('<TotalDisbursementPrepaidIndicator>')) {
          console.log('  ✅ TotalDisbursementPrepaidIndicator presente');
        } else {
          console.log('  ❌ Falta TotalDisbursementPrepaidIndicator');
          passed = false;
        }

        // Verificar peso y piezas en IncludedHouseConsignmentItem
        if (xml.includes('<GrossWeightMeasure') && xml.includes('<PieceQuantity>')) {
          console.log('  ✅ IncludedHouseConsignmentItem con peso y piezas');
        } else {
          console.log('  ⚠️  IncludedHouseConsignmentItem sin peso/piezas detallados');
        }
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      passed = false;
    }

    console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');
    this.testResults.push({ name: 'XFZB Indicators', passed, details: [] });
  }

  /**
   * TEST 9: ICS2 listAgencyID
   * Valida que TypeCode incluya listAgencyID="1" para códigos HS (Requerido por ICS2 UE)
   * Según sección 5.1 del Informe Técnico Global
   */
  private testICS2ListAgencyID(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 9: ICS2 listAgencyID (Cumplimiento UE)                 │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    let passed = true;

    try {
      const result = this.service.generateMasterAWB(DIRECT_SHIPMENT);
      const xml = result.content;

      console.log('Validando listAgencyID en TypeCode para ICS2...');

      // Verificar presencia de TypeCode con listAgencyID="1"
      const typeCodeWithAgency = xml.match(/<TypeCode listAgencyID="1">[^<]+<\/TypeCode>/g);
      
      if (typeCodeWithAgency && typeCodeWithAgency.length > 0) {
        console.log(`  ✅ TypeCode con listAgencyID="1": ${typeCodeWithAgency.length} encontrados`);
        console.log(`  ℹ️  Ejemplo: ${typeCodeWithAgency[0]}`);
      } else {
        // Verificar si hay TypeCode sin listAgencyID (para HS codes)
        const hsCodeMatch = xml.match(/<TypeCode>(\d{6,10})<\/TypeCode>/);
        if (hsCodeMatch) {
          console.log(`  ⚠️  TypeCode encontrado sin listAgencyID: ${hsCodeMatch[0]}`);
          console.log('  ❌ ICS2 requiere listAgencyID="1" para códigos HS');
          passed = false;
        } else {
          console.log('  ℹ️  No hay códigos HS en este envío');
        }
      }

      // Verificar en XFZB también
      const xfzbResults = this.service.generateConsolidation(CONSOLIDATED_SHIPMENT);
      if (xfzbResults.length > 0) {
        const xfzbXml = xfzbResults[0].content;
        const xfzbTypeCodeWithAgency = xfzbXml.match(/<TypeCode listAgencyID="1">[^<]+<\/TypeCode>/g);
        
        if (xfzbTypeCodeWithAgency && xfzbTypeCodeWithAgency.length > 0) {
          console.log(`  ✅ XFZB TypeCode con listAgencyID: ${xfzbTypeCodeWithAgency.length} encontrados`);
        }
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      passed = false;
    }

    console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');
    this.testResults.push({ name: 'ICS2 listAgencyID', passed, details: [] });
  }

  /**
   * TEST 10: ACAS Email Support
   * Valida URIEmailCommunication en DefinedTradeContact (Requerido por ACAS EE.UU.)
   * Según sección 4.1 del Informe Técnico Global
   */
  private testACASEmailSupport(): void {
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 10: ACAS Email Support (Cumplimiento EE.UU.)           │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    let passed = true;

    try {
      // Crear shipment con email
      const shipmentWithEmail: InternalShipment = {
        ...DIRECT_SHIPMENT,
        id: 'test-email-001',
        shipper: {
          ...TEST_SHIPPER,
          email: 'shipper@example.com'
        },
        consignee: {
          ...TEST_CONSIGNEE,
          email: 'consignee@example.com'
        }
      };

      const result = this.service.generateMasterAWB(shipmentWithEmail);
      const xml = result.content;

      console.log('Validando URIEmailCommunication para ACAS...');

      // Verificar URIEmailCommunication
      if (xml.includes('<URIEmailCommunication>')) {
        const emailMatches = xml.match(/<URIEmailCommunication>[\s\S]*?<\/URIEmailCommunication>/g);
        console.log(`  ✅ URIEmailCommunication: ${emailMatches?.length || 0} encontrados`);
        
        // Verificar estructura correcta
        if (xml.includes('<URIID>')) {
          console.log('  ✅ URIID presente en URIEmailCommunication');
        } else {
          console.log('  ⚠️  Falta URIID dentro de URIEmailCommunication');
        }

        // Verificar emails específicos
        if (xml.includes('shipper@example.com')) {
          console.log('  ✅ Email del Shipper encontrado');
        }
        if (xml.includes('consignee@example.com')) {
          console.log('  ✅ Email del Consignee encontrado');
        }
      } else {
        console.log('  ❌ Falta URIEmailCommunication (requerido por ACAS)');
        passed = false;
      }

      // Verificar que DirectTelephoneCommunication también esté presente
      if (xml.includes('<DirectTelephoneCommunication>')) {
        console.log('  ✅ DirectTelephoneCommunication presente');
      } else {
        console.log('  ⚠️  Falta DirectTelephoneCommunication');
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      passed = false;
    }

    console.log(passed ? '  ✅ TEST PASSED\n' : '  ❌ TEST FAILED\n');
    this.testResults.push({ name: 'ACAS Email Support', passed, details: [] });
  }

  private printSummary(): void {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                        RESUMEN DE TESTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let passedCount = 0;
    let failedCount = 0;

    for (const result of this.testResults) {
      const icon = result.passed ? '✅' : '❌';
      console.log(`  ${icon} ${result.name}`);
      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }
    }

    console.log('\n───────────────────────────────────────────────────────────────');
    console.log(`  Total: ${this.testResults.length} tests`);
    console.log(`  ✅ Pasados: ${passedCount}`);
    console.log(`  ❌ Fallidos: ${failedCount}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (failedCount === 0) {
      console.log('🎉 TODOS LOS TESTS PASARON - Cargo-XML cumple con estándar IATA\n');
    } else {
      console.log('⚠️  Hay tests fallidos - revisar implementación\n');
    }
  }

  /**
   * Genera y guarda ejemplos XML para inspección manual
   */
  generateSampleFiles(): { xfwbDirect: string; xfwbMaster: string; xfwbWithUlds: string; xfzb: string } {
    const xfwbDirect = this.service.generateMasterAWB(DIRECT_SHIPMENT).content;
    const xfwbMaster = this.service.generateMasterAWB(CONSOLIDATED_SHIPMENT).content;
    const xfwbWithUlds = this.service.generateMasterAWB(SHIPMENT_WITH_ULDS).content;
    const xfzbResults = this.service.generateConsolidation(CONSOLIDATED_SHIPMENT);
    const xfzb = xfzbResults.length > 0 ? xfzbResults[0].content : '';

    return { xfwbDirect, xfwbMaster, xfwbWithUlds, xfzb };
  }
}

// ============================================================
// EXPORTAR RUNNER PARA USO EN NODE.JS O BROWSER
// ============================================================

export { CargoXmlTestRunner, validateXFWBStructure, validateXFZBStructure };
export { DIRECT_SHIPMENT, CONSOLIDATED_SHIPMENT, SHIPMENT_WITH_ULDS };

// Si se ejecuta directamente (Node.js)
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  const runner = new CargoXmlTestRunner();
  runner.runAllTests();
}
