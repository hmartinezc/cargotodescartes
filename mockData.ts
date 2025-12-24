
import { InternalShipment } from './types';

// ============================================================
// DATOS DE PRUEBA PARA UAT - TRAXON cargoJSON API
// ============================================================
// Endpoint UAT: https://community.champ.aero:8444/avatar-uat/NO_WAIT
// Password: S81bLvtr3Nz!
// Sender PIMA: REUFFW90AVTOPF/BOG01
// Recipient PIMA: USCAIR01LUXXSXS
// ============================================================

export const mockShipments: InternalShipment[] = [
  // ============================================================
  // PRUEBA 1: ENVÍO CONSOLIDADO (AWB + CSL + 3 Houses)
  // LATAM prefix 145, Commodity 0609 -> "CONSOLIDATE FLOWERS"
  // ============================================================
  {
    id: 'uat-consolidado-20251217-001',
    status: 'DRAFT',
    awbNumber: '145-11223344',
    origin: 'BOG',
    destination: 'MIA',
    pieces: 75,
    weight: 1275,
    weightUnit: 'KILOGRAM',
    volume: 7.5,
    volumeUnit: 'CUBIC_METRE',
    dimensions: [
      { pieces: 75, length: 100, width: 40, height: 25, unit: 'CENTIMETRE' }
    ],
    description: 'CONSOLIDATE FLOWERS',
    commodityCode: '0609',
    currency: 'USD',
    paymentMethod: 'Collect',
    
    // Routing PIMA - QUEMADO PARA UAT
    routing: {
      senderAddress: 'REUFFW90AVTOPF/BOG01',
      recipientAddress: 'USCAIR01LUXXSXS'
    },

    agent: {
      name: 'AVTOPF CARGO SAS',
      iataCode: '1234567',
      cassCode: '0016',
      place: 'BOGOTA'
    },

    executionDate: '2025-12-17',
    executionPlace: 'BOGOTA',
    signature: 'AVTOPF',

    rates: [
      { 
        pieces: 75, 
        weight: 1275, 
        chargeableWeight: 1350,
        rateClassCode: 'Q', // QUANTITY_RATE
        rateOrCharge: 1.10, 
        total: 1485.00, 
        description: 'CONSOLIDATE FLOWERS',
        commodityCode: '0609'
      }
    ],

    otherCharges: [],

    oci: [
      { 
        countryCode: 'US', 
        infoIdentifier: 'ISS', 
        controlInfo: 'REGULATED_AGENT', 
        supplementaryControlInfo: 'RA-CO-01234-567' 
      }
    ],

    specialHandlingCodes: ['EAP', 'PER'],

    hasHouses: true,
    houseBills: [
      { 
        id: 'h1', 
        hawbNumber: 'HAWB20251217A', 
        pieces: 25, 
        weight: 425, 
        shipperName: 'FINCA LAS ROSAS SAS', 
        consigneeName: 'BLOOM MIAMI LLC', 
        natureOfGoods: 'ROSES RED',
        commonName: 'RED ROSES'
      },
      { 
        id: 'h2', 
        hawbNumber: 'HAWB20251217B', 
        pieces: 25, 
        weight: 425, 
        shipperName: 'FLORES DEL CAMPO LTDA', 
        consigneeName: 'SUNNY FLOWERS INC', 
        natureOfGoods: 'CARNATIONS',
        commonName: 'CARNATIONS'
      },
      { 
        id: 'h3', 
        hawbNumber: 'HAWB20251217C', 
        pieces: 25, 
        weight: 425, 
        shipperName: 'ORQUIDEAS COLOMBIA SAS', 
        consigneeName: 'ORCHID WORLD USA', 
        natureOfGoods: 'ORCHIDS',
        commonName: 'ORCHIDS'
      }
    ],

    shipper: {
      name: 'CONSOLIDADORA FLORES COLOMBIA SAS',
      address: { 
        street: 'CRA 7 NO 140-20 PISO 3', 
        place: 'BOGOTA', 
        countryCode: 'CO', 
        postalCode: '110121' 
      }
    },

    consignee: {
      name: 'USA FLOWER DISTRIBUTORS LLC',
      address: { 
        street: '8000 NW 36TH STREET SUITE 200', 
        place: 'DORAL', 
        state: 'FL',
        countryCode: 'US', 
        postalCode: '33166' 
      }
    },

    flights: [
      { 
        flightNumber: 'LA4567', 
        date: '2025-12-18', 
        origin: 'BOG', 
        destination: 'MIA',
        carrierCode: 'LA'
      }
    ],

    logs: []
  },

  // ============================================================
  // PRUEBA 2: ENVÍO DIRECTO (AWB sin Houses)
  // LATAM prefix 145, Sin commodity 0609 -> "CUT FLOWERS"
  // ============================================================
  {
    id: 'uat-directo-20251217-002',
    status: 'DRAFT',
    awbNumber: '145-55667788',
    origin: 'BOG',
    destination: 'MIA',
    pieces: 25,
    weight: 425,
    weightUnit: 'KILOGRAM',
    volume: 2.5,
    volumeUnit: 'CUBIC_METRE',
    dimensions: [
      { pieces: 25, length: 100, width: 40, height: 25, unit: 'CENTIMETRE' }
    ],
    description: 'CUT FLOWERS',
    commodityCode: '0603', // Diferente a 0609, entonces será "CUT FLOWERS"
    currency: 'USD',
    paymentMethod: 'Collect',
    
    // Routing PIMA - QUEMADO PARA UAT
    routing: {
      senderAddress: 'REUFFW90AVTOPF/BOG01',
      recipientAddress: 'USCAIR01LUXXSXS'
    },

    agent: {
      name: 'AVTOPF CARGO SAS',
      iataCode: '1234567',
      cassCode: '0016',
      place: 'BOGOTA'
    },

    executionDate: '2025-12-17',
    executionPlace: 'BOGOTA',
    signature: 'AVTOPF',

    rates: [
      { 
        pieces: 25, 
        weight: 425, 
        chargeableWeight: 450,
        rateClassCode: 'Q',
        rateOrCharge: 1.10, 
        total: 495.00, 
        description: 'CUT FLOWERS',
        commodityCode: '0603'
      }
    ],

    otherCharges: [],

    oci: [
      { 
        countryCode: 'US', 
        infoIdentifier: 'ISS', 
        controlInfo: 'REGULATED_AGENT', 
        supplementaryControlInfo: 'RA-CO-01234-567' 
      }
    ],

    specialHandlingCodes: ['EAP', 'PER'],

    hasHouses: false,
    houseBills: [],

    shipper: {
      name: 'FLORES DIRECTAS DE COLOMBIA SAS',
      address: { 
        street: 'CRA 7 NO 140-20 PISO 3', 
        place: 'BOGOTA', 
        countryCode: 'CO', 
        postalCode: '110121' 
      }
    },

    consignee: {
      name: 'DIRECT FLOWERS USA INC',
      address: { 
        street: '8000 NW 36TH STREET SUITE 100', 
        place: 'DORAL', 
        state: 'FL',
        countryCode: 'US', 
        postalCode: '33166' 
      }
    },

    flights: [
      { 
        flightNumber: 'LA4567', 
        date: '2025-12-18', 
        origin: 'BOG', 
        destination: 'MIA',
        carrierCode: 'LA'
      },
      { 
        flightNumber: 'AA1234', 
        date: '2025-12-18', 
        origin: 'MIA', 
        destination: 'JFK',
        carrierCode: 'AA'
      }
    ],

    logs: []
  },

  // ============================================================
  // PRUEBA 3: IBERIA (Para probar SPH diferentes)
  // Prefix 075 -> SPH: ["ECC", "EAP", "PER"]
  // ============================================================
  {
    id: 'uat-iberia-20251217-003',
    status: 'DRAFT',
    awbNumber: '075-99887766',
    origin: 'BOG',
    destination: 'MAD',
    pieces: 30,
    weight: 510,
    weightUnit: 'KILOGRAM',
    volume: 3.0,
    volumeUnit: 'CUBIC_METRE',
    dimensions: [],
    description: 'FRESH FLOWERS',
    commodityCode: '0603',
    currency: 'USD',
    paymentMethod: 'Prepaid',
    
    routing: {
      senderAddress: 'REUFFW90AVTOPF/BOG01',
      recipientAddress: 'USCAIR01LUXXSXS'
    },

    agent: {
      name: 'AVTOPF CARGO SAS',
      iataCode: '1234567',
      cassCode: '0016',
      place: 'BOGOTA'
    },

    executionDate: '2025-12-17',
    executionPlace: 'BOGOTA',
    signature: 'AVTOPF',

    rates: [
      { 
        pieces: 30, 
        weight: 510, 
        chargeableWeight: 540,
        rateClassCode: 'Q',
        rateOrCharge: 1.50, 
        total: 810.00, 
        description: 'FRESH FLOWERS',
        commodityCode: '0603'
      }
    ],

    otherCharges: [
      { code: 'MY', entitlement: 'DueCarrier', amount: 25.00, paymentMethod: 'Prepaid' },
      { code: 'AW', entitlement: 'DueAgent', amount: 15.00, paymentMethod: 'Prepaid' }
    ],

    oci: [
      { 
        countryCode: 'ES', 
        infoIdentifier: 'ISS', 
        controlInfo: 'REGULATED_AGENT', 
        supplementaryControlInfo: 'RA-CO-01234-567' 
      }
    ],

    // IBERIA usa SPH diferentes según legacy
    specialHandlingCodes: ['ECC', 'EAP', 'PER'],

    hasHouses: false,
    houseBills: [],

    shipper: {
      name: 'EXPORTADORA FLORES IBERIA SAS',
      address: { 
        street: 'CALLE 100 NO 20-30', 
        place: 'BOGOTA', 
        countryCode: 'CO', 
        postalCode: '110111' 
      }
    },

    consignee: {
      name: 'FLORES MADRID SL',
      address: { 
        street: 'CALLE GRAN VIA 123', 
        place: 'MADRID', 
        countryCode: 'ES', 
        postalCode: '28013' 
      }
    },

    flights: [
      { 
        flightNumber: 'IB6524', 
        date: '2025-12-18', 
        origin: 'BOG', 
        destination: 'MAD',
        carrierCode: 'IB'
      }
    ],

    logs: []
  }
];
