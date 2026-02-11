// Test temporal para validar XML generado
import { generateXFWB, generateXFZB } from '../services/cargoXmlService';
import { InternalShipment, InternalHouseBill } from '../types';

const testShipment: Partial<InternalShipment> = {
  awbNumber: '992-01651112',
  origin: 'BOG',
  destination: 'MIA',
  weight: 2163,
  pieces: 271,
  currency: 'USD',
  paymentMethod: 'Prepaid',
  executionDate: '2026-01-23',
  signature: 'nrincon',
  specialHandlingCodes: ['EAP', 'PER'],
  routing: {
    senderAddress: 'TDVAGT03DHLAVIFFW/BRU1',
    recipientAddress: 'TDVAIR08DHV'
  },
  agent: {
    name: 'OPERFLOR LOGISTICA SAS',
    place: 'BOGOTA',
    iataCode: '1234567'
  },
  shipper: {
    name: 'OPERFLOR LOGISTICA SAS',
    taxId: '901234567',
    address: { street: 'CRA 7', place: 'BOGOTA', countryCode: 'CO', postalCode: '110121' }
  },
  consignee: {
    name: 'USA FLOWERS INC',
    taxId: '98-7654321',
    address: { street: '8000 NW 36TH', place: 'DORAL', state: 'FL', countryCode: 'US', postalCode: '33166' }
  },
  alsoNotify: { 
    name: 'MAS CUSTOMS BROKER INC',
    email: 'flores@mascustomsbroker.com',
    address: { 
      street: '3125 NW 77TH AVENUE', 
      place: 'DORAL', 
      state: 'FL', 
      countryCode: 'US', 
      postalCode: '33122' 
    },
    contact: { identifier: 'TE', number: '3051234567' }
  },
  flights: [{
    flightNumber: 'D52246',
    carrierCode: 'D5',
    date: '2026-01-23',
    origin: 'BOG',
    destination: 'MIA'
  }],
  rates: [{
    pieces: 271,
    weight: 2163,
    chargeableWeight: 2481,
    rateClassCode: 'K',
    rateOrCharge: 1.12,
    total: 2778.72,
    description: 'CONSOLIDATION COMERCIAL INVOICE ATTACHED FRESH CUT FLOWERS',
    commodityCode: '1421'
  }],
  volume: 12.38,
  hasHouses: true,
  houseBills: [] as InternalHouseBill[]  // Se rellena después
};

const testHouse: InternalHouseBill = {
  id: '1',
  hawbNumber: 'OFL00024057',
  shipperName: 'INVERPALMAS SAS',
  consigneeName: 'DREISBACH WHOLESALE',
  pieces: 1,
  weight: 8,
  natureOfGoods: 'FRESH CUT FLOWERS',
  htsCodes: ['060312'],
  volume: 0.03,
  chargeableWeight: 8,
  totalCharge: 8.96,
  dimensions: [{ length: 98, width: 25, height: 14, unit: 'CENTIMETRE', pieces: 1 }],
  shipper: {
    name: 'INVERPALMAS SAS',
    taxId: '900111222-3',
    address: { street: 'CALLE 78 No. 9-57', place: 'BOGOTA', countryCode: 'CO', postalCode: '110121' },
    contact: { identifier: 'TE', number: '3174331667' }
  },
  consignee: {
    name: 'DREISBACH WHOLESALE FLORIST INC',
    taxId: '11-2233445',
    email: 'miaflower@armellini.com',
    address: { street: '8021 WARWICK AVE', place: 'LOUISVILLE', state: 'KY', countryCode: 'US', postalCode: '40214' },
    contact: { identifier: 'TE', number: '3055925198' }
  }
};

// Agregar el house al shipment
testShipment.houseBills = [testHouse];

// Generar XFWB (Master)
const xfwb = generateXFWB(testShipment as InternalShipment);
console.log('=== XFWB MASTER WAYBILL ===\n');
console.log(xfwb.xmlContent);

// Verificar problemas XFWB
const linesXfwb = xfwb.xmlContent.split('\n');
console.log('\n=== ANÁLISIS DE LÍNEAS XFWB ===');
let emptyLinesXfwb = 0;
linesXfwb.forEach((line, i) => {
  if (line.trim() === '' && i > 0 && i < linesXfwb.length - 1) {
    emptyLinesXfwb++;
    console.log(`⚠️  Línea vacía en posición ${i + 1}`);
  }
});
if (emptyLinesXfwb === 0) {
  console.log('✅ Sin líneas vacías extra');
}

console.log('\n\n========================================\n');

// Generar XFZB
const xfzb = generateXFZB(testShipment as InternalShipment, testHouse);
console.log('=== XFZB HOUSE WAYBILL ===\n');
console.log(xfzb.xmlContent);

// Verificar problemas
const lines = xfzb.xmlContent.split('\n');
console.log('\n=== ANÁLISIS DE LÍNEAS XFZB ===');
let emptyLines = 0;
lines.forEach((line, i) => {
  if (line.trim() === '' && i > 0 && i < lines.length - 1) {
    emptyLines++;
    console.log(`⚠️  Línea vacía en posición ${i + 1}`);
  }
});
if (emptyLines === 0) {
  console.log('✅ Sin líneas vacías extra');
}

console.log('\n✅ Validación completada');
