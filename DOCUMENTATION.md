
# Documentación Técnica: Champ Traxon CargoJSON Connector

**Versión:** 2.3  
**Última Actualización:** 2024-12-18  
**Analista:** Senior Solutions Architect (Logistics/IATA)  
**Alcance Actual:** Transmisiones desde **BOG (Bogotá, Colombia)**

---

## 📋 Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Tracking de Transmisiones (messageId)](#2-tracking-de-transmisiones)
3. [Validación de Campos Obligatorios](#3-validación-de-campos-obligatorios)
4. [Reglas de Negocio por Aerolínea](#4-reglas-de-negocio-por-aerolínea)
5. [Mapeo de Campos EDIFACT → cargoJSON](#5-mapeo-de-campos)
6. [Ejemplos de Mensajes JSON](#6-ejemplos-de-mensajes-json)
7. [Troubleshooting y Errores Comunes](#7-troubleshooting)

---

## 1. Resumen Ejecutivo

Este conector implementa la especificación **cargoJSON de Traxon** para transmisión de:
- **FWB** (Air Waybill) → `type: "air waybill"`
- **FHL** (House Waybill) → `type: "house waybill"`
- **CSL** (Consolidation List) → `type: "consolidation list"`

### Estado de Validación: ✅ APROBADO

| Mensaje | Campos Obligatorios | Estado |
|---------|---------------------|--------|
| Air Waybill | 15/15 | ✅ Completo |
| Consolidation List | 6/6 | ✅ Completo |
| House Waybill | 10/10 | ✅ Completo |

---

## 2. Tracking de Transmisiones (messageId)

### 2.1 Propósito

El campo `messageId` permite al backend **controlar el UUID/GUID** de cada transmisión para:
- **Auditoría**: Guardar en base de datos qué se envió exactamente
- **Correlación**: Vincular respuestas de Traxon con transmisiones específicas
- **Históricos**: Saber cuántas veces se transmitió una guía

### 2.2 Comportamiento

| Si el backend envía... | El módulo... |
|------------------------|--------------|
| `messageId: "550e8400-e29b-41d4-a716-446655440000"` | Usa ese UUID como `id` del mensaje Traxon |
| Sin `messageId` o `messageId: null` | Genera automáticamente un UUID |

### 2.3 Estructura de IDs por Tipo de Mensaje

| Mensaje | Campo Backend | ID Generado en Traxon |
|---------|---------------|------------------------|
| **FWB (Master)** | `messageId` del shipment | `id: <messageId>` |
| **CSL** | `messageId` del shipment | `id: <messageId>-CSL` |
| **FHL** | `messageId` de cada houseBill | `id: <houseBill.messageId>` |

### 2.4 Ejemplo de Uso

```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "awbNumber": "145-12345678",
  "origin": "BOG",
  "destination": "MIA",
  "hasHouses": true,
  "houseBills": [
    {
      "messageId": "660e8400-e29b-41d4-a716-446655440001",
      "hawbNumber": "HAWB001",
      "pieces": 10,
      "weight": 150.5
    },
    {
      "messageId": "770e8400-e29b-41d4-a716-446655440002",
      "hawbNumber": "HAWB002", 
      "pieces": 15,
      "weight": 200.0
    }
  ]
}
```

**Resultado en Traxon:**
- FWB: `id: "550e8400-e29b-41d4-a716-446655440000"`
- CSL: `id: "550e8400-e29b-41d4-a716-446655440000-CSL"`
- FHL 1: `id: "660e8400-e29b-41d4-a716-446655440001"`
- FHL 2: `id: "770e8400-e29b-41d4-a716-446655440002"`

### 2.5 Recomendaciones de Base de Datos

```sql
-- Tabla sugerida para tracking de transmisiones
CREATE TABLE transmisiones_traxon (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    message_id UNIQUEIDENTIFIER NOT NULL,  -- El UUID que envías al módulo
    awb_number VARCHAR(12) NOT NULL,
    message_type VARCHAR(20) NOT NULL,     -- 'FWB', 'CSL', 'FHL'
    hawb_number VARCHAR(35) NULL,          -- Solo para FHL
    fecha_envio DATETIME DEFAULT GETDATE(),
    estado VARCHAR(20) DEFAULT 'PENDIENTE',
    response_status VARCHAR(50) NULL,
    response_message TEXT NULL
);
```

---

## 3. Validación de Campos Obligatorios

### 3.1 AirWayBillMessage (FWB)

Según la documentación oficial de Traxon cargoJSON API:

| Campo | Tipo | Obligatorio | Implementado | Notas |
|-------|------|-------------|--------------|-------|
| `type` | STRING | ✅ | ✅ | Siempre "air waybill" |
| `id` | UUID | ✅ | ✅ | Generado automáticamente |
| `messageHeader` | Object | ✅ | ✅ | Incluye addressing y edifactData |
| `airWaybillNumber` | STRING | ✅ | ✅ | Formato: "XXX-XXXXXXXX" |
| `origin` | IATAAirportCode | ✅ | ✅ | 3 letras (ej: BOG) |
| `destination` | IATAAirportCode | ✅ | ✅ | 3 letras (ej: MIA) |
| `totalConsignmentNumberOfPieces` | STRING | ✅ | ✅ | Número como string |
| `weight` | Weight | ✅ | ✅ | {amount, unit} |
| `route` | Array[Routing] | ✅ | ✅ | Al menos 1 elemento |
| `shipper` | AccountContact | ✅ | ✅ | address.name1/streetAddress1/place/country/postCode obligatorios |
| `consignee` | AccountContact | ✅ | ✅ | Misma estructura que shipper |
| `carriersExecution` | Object | ✅ | ✅ | date, placeOrAirportCityCode obligatorios |
| `senderReference` | ReferenceInfo | ✅ | ✅ | **AGREGADO** - fileReference + participantIdentifier |
| `chargeDeclarations` | Object | ✅ | ✅ | isoCurrencyCode obligatorio |
| `chargeItems` | Array[ChargeItem] | ✅ | ✅ | Rate description obligatorio |

### 2.2 Campos Opcionales Importantes

| Campo | Cuándo Incluir |
|-------|----------------|
| `volume` | Solo si volume > 0 |
| `flights` | Solo si hay vuelos asignados |
| `oci` | Obligatorio para destinos regulados (US, EU) |
| `otherCharges` | Solo si hay cargos adicionales |
| `specialHandlingCodes` | Siempre incluir (mínimo EAP) |

### 2.3 ConsolidationListMessage (CSL)

| Campo | Obligatorio | Implementado |
|-------|-------------|--------------|
| `type` | ✅ | ✅ |
| `id` | ✅ | ✅ |
| `messageHeader` | ✅ | ✅ |
| `airWaybillNumber` | ✅ | ✅ |
| `originAndDestination` | ✅ | ✅ |
| `quantity` | ✅ | ✅ |
| `houseWaybillSummaries` | ✅ | ✅ |

---

## 4. Reglas de Negocio por Aerolínea

### 4.1 Reglas Generales (Todas las Aerolíneas)

```typescript
// Valores por defecto del sistema legacy
const DEFAULTS = {
  signature: "DSVOP",           // Si no viene de BD
  shipperZipCode: "10",         // Si está vacío
  consigneeZipCode: "10",       // Si está vacío
  weightUnit: "KILOGRAM",
  volumeUnit: "CUBIC_METRE",
  currency: "USD",
  goodsDescription: "FRESHPERISH" // Si está vacío
};

// Normalización de países
const COUNTRY_MAPPING = {
  "CW": "NL"  // Curaçao → Netherlands
};

// Normalización de aeropuertos
const AIRPORT_MAPPING = {
  "RNG": "MDE"  // Rionegro → Medellín
};
```

### 4.2 CASS Code por Aeropuerto de Origen

| Aeropuerto | CASS Code | Notas |
|------------|-----------|-------|
| **BOG** | `0016` | ✅ Alcance actual |
| MDE, RNG | `0020` | Futuro |
| LTX, UIO | `0006` | Futuro |

### 4.3 Reglas Específicas por Prefijo de Guía

#### LATAM (Prefijos: 145, 985)
```typescript
// Descripción de mercancía
if (commodityCode === '0609' || commodityCode === '609') {
  goodsDescription = "CONSOLIDATE FLOWERS";  // Consolidadas
} else {
  goodsDescription = "CUT FLOWERS";          // Directas
}
```

#### IBERIA (Prefijo: 075)
```typescript
// Special Handling Codes forzados
specialHandlingCodes = ["ECC", "EAP", "PER"];
```

#### KLM (Prefijo: 074)
```typescript
// Para Houses: usar Common Name en lugar de Nature of Goods
if (origin === 'CO' && houseBill.commonName) {
  natureOfGoods = houseBill.commonName;
}
```

#### Otras Aerolíneas
```typescript
// Default SPH
specialHandlingCodes = ["EAP"];
```

---

## 4. Mapeo de Campos

### 4.1 Estructura Principal

| Concepto Legacy | Campo cargoJSON | Transformación |
|-----------------|-----------------|----------------|
| `strAWB` | `airWaybillNumber` | Directo (XXX-XXXXXXXX) |
| `strOrigen` | `origin` | Aplica normalización RNG→MDE |
| `strDestino` | `destination` | Directo |
| `intPiezas` | `totalConsignmentNumberOfPieces` | `.toString()` |
| `decPeso` | `weight.amount` | `.toString()` |
| `decVolumen` | `volume.amount` | Solo si > 0 |

### 4.2 Partes (Shipper/Consignee)

```typescript
// Transformación aplicada
{
  accountNumber: party.accountNumber,
  address: {
    name1: cleanString(party.name, 35),           // Máx 35 chars
    name2: cleanString(party.name2, 35),          // Opcional
    streetAddress1: cleanString(party.street, 35),
    streetAddress2: cleanString(party.street2, 35), // Opcional
    place: cleanString(party.city, 17),           // Máx 17 chars
    stateProvince: cleanString(party.state, 2),   // Máx 2 chars
    country: normalizeCountry(party.country),     // CW → NL
    postCode: cleanString(party.zip, 9, "10")     // Default "10"
  },
  contactDetails: party.phone ? [{
    contactIdentifier: "TE",
    contactNumber: cleanString(party.phone, 25)
  }] : undefined
}
```

### 4.3 Message Header

```typescript
{
  addressing: {
    routeVia: { type: "PIMA", address: "REUAIR08AIRLINE" },
    routeAnswerVia: { type: "PIMA", address: "REUAIR08AIRLINE" },
    senderAddresses: [{ type: "PIMA", address: "REUAGT87SENDER" }],
    finalRecipientAddresses: [{ type: "PIMA", address: "REUAIR08AIRLINE" }],
    replyAnswerTo: [{ type: "PIMA", address: "REUAGT87SENDER" }]  // ¡CRÍTICO para respuestas!
  },
  creationDate: "2024-12-17T10:30:00.000",
  edifactData: {
    commonAccessReference: "AGENTNAME14", // Máx 14 chars
    messageReference: "MSG12345678",
    interchangeControlReference: "IC12345678"
  }
}
```

### 4.4 OCI (Other Customs, Security and Regulatory Information)

**⚠️ IMPORTANTE:** El campo `controlInformation` debe ser un valor del enum oficial de Traxon, NO abreviaciones.

#### Mapeo de Códigos Legacy → Traxon

| Código Legacy | Valor Traxon | Descripción |
|---------------|--------------|-------------|
| `RA` | `REGULATED_AGENT` | Agente Regulado |
| `KC` | `KNOWN_CONSIGNOR` | Expedidor Conocido |
| `AO`, `AEO` | `AUTHORISED_ECONOMIC_OPERATOR` | Operador Económico Autorizado |
| `SM` | `SCREENING_METHOD` | Método de Inspección |
| `SS` | `SECURITY_STATUS` | Estado de Seguridad |
| `ED` | `EXPIRY_DATE` | Fecha de Expiración |
| `SN` | `SEAL_NUMBER` | Número de Sello |
| `MRN` | `MOVEMENT_REFERENCE_NUMBER` | Número de Referencia de Movimiento |
| `CN` | `CERTIFICATE_NUMBER` | Número de Certificado |
| `DG` | `DANGEROUS_GOODS` | Mercancías Peligrosas |
| `IN` | `INVOICE_NUMBER` | Número de Factura |
| `PL` | `PACKING_LIST_NUMBER` | Número de Lista de Empaque |
| `RC` | `REGULATED_CARRIER` | Transportista Regulado |
| `TIN` | `TRADER_IDENTIFICATION_NUMBER` | Número de Identificación del Comerciante |
| `UCR` | `UNIQUE_CONSIGNMENT_REFERENCE_NUMBER` | Número de Referencia Único de Envío |
| `AC` | `ACCOUNT_CONSIGNOR` | Cuenta del Expedidor |

### 4.5 Enums Oficiales de Traxon API

**✅ v2.2:** Todos los valores de enum ahora usan las constantes oficiales de Traxon.

#### Weight Unit (Unidad de Peso)
| Código Legacy | Valor Traxon |
|---------------|--------------|
| `K`, `KG` | `KILOGRAM` |
| `L`, `LB` | `POUND` |

#### Volume Unit (Unidad de Volumen)
| Código Legacy | Valor Traxon |
|---------------|--------------|
| `MC` | `CUBIC_METRE` |
| `CC` | `CUBIC_CENTIMETRE` |
| `CF` | `CUBIC_FEET` |
| `CI` | `CUBIC_INCH` |

#### Length Unit (Unidad de Longitud)
| Código Legacy | Valor Traxon |
|---------------|--------------|
| `CM` | `CENTIMETRE` |
| `IN` | `INCH` |
| `M` | `METRE` |

#### Rate Class Code (Código de Clase de Tarifa)
| Código Legacy | Valor Traxon |
|---------------|--------------|
| `Q` | `QUANTITY_RATE` |
| `M` | `MINIMUM_CHARGE` |
| `N` | `NORMAL_RATE` |
| `B` | `BASIC_CHARGE` |
| `C`, `S` | `SPECIFIC_COMMODITY_RATE` |
| `R` | `CLASS_RATE_REDUCTION` |
| `K` | `CLASS_RATE_SURCHARGE` |
| `U` | `UNIT_LOAD_DEVICE_RATE` |

#### Charge Code (Código de Cargo)
| Valor Traxon | Descripción |
|--------------|-------------|
| `ALL_CHARGES_PREPAID` | Todos los cargos prepagados |
| `ALL_CHARGES_COLLECT` | Todos los cargos al cobro |
| `NO_WEIGHT_CHARGE_COLLECT` | Sin cargo por peso al cobro |
| `NO_WEIGHT_CHARGE_PREPAID` | Sin cargo por peso prepagado |

#### Entitlement Code (Código de Derecho)
| Valor Traxon | Descripción |
|--------------|-------------|
| `AGENT` | Cargo debido al agente |
| `CARRIER` | Cargo debido al transportista |

#### Service Code (Código de Servicio)
| Valor Traxon | Descripción |
|--------------|-------------|
| `AIRPORT_TO_AIRPORT` | Aeropuerto a aeropuerto |
| `DOOR_TO_DOOR` | Puerta a puerta |
| `DOOR_TO_AIRPORT` | Puerta a aeropuerto |
| `AIRPORT_TO_DOOR` | Aeropuerto a puerta |

#### Ejemplo de Transformación

```typescript
// Input (desde BD legacy)
{ countryCode: 'CO', infoIdentifier: 'ISS', controlInfo: 'RA', supplementaryControlInfo: '01000-001' }

// Output (hacia Traxon API)
{
  "isoCountryCode": "CO",
  "informationIdentifier": "ISS",
  "controlInformation": "REGULATED_AGENT",  // ← Transformado automáticamente
  "supplementaryControlInformation": "01000-001"
}
```

---

## 5. Ejemplos de Mensajes JSON

### 5.1 Air Waybill (LATAM - Flores Consolidadas)

```json
{
  "type": "air waybill",
  "id": "1f7cb56b-7aa4-4077-b38d-9371a24fa45c",
  "messageHeader": {
    "addressing": {
      "routeVia": { "type": "PIMA", "address": "REUAIR08AIRLINE" },
      "routeAnswerVia": { "type": "PIMA", "address": "REUAIR08AIRLINE" },
      "senderAddresses": [{ "type": "PIMA", "address": "REUAGT87SENDER" }],
      "finalRecipientAddresses": [{ "type": "PIMA", "address": "REUAIR08AIRLINE" }],
      "replyAnswerTo": [{ "type": "PIMA", "address": "REUAGT87SENDER" }]
    },
    "creationDate": "2024-12-17T10:30:00.000",
    "edifactData": {
      "commonAccessReference": "BESTFREIGHT",
      "messageReference": "MSG12345678",
      "interchangeControlReference": "IC12345678"
    }
  },
  "airWaybillNumber": "145-97162321",
  "origin": "BOG",
  "destination": "MIA",
  "totalConsignmentNumberOfPieces": "45",
  "weight": { "amount": "225", "unit": "KILOGRAM" },
  "volume": { "amount": "1.2", "unit": "CUBIC_METRE" },
  "flights": [{
    "flight": "LA501",
    "scheduledDate": "2024-12-20"
  }],
  "route": [{
    "carrierCode": "LA",
    "destination": "MIA"
  }],
  "shipper": {
    "address": {
      "name1": "FLORES DE COLOMBIA SAS",
      "streetAddress1": "CALLE 100 15 20",
      "place": "BOGOTA",
      "country": "CO",
      "postCode": "110111"
    }
  },
  "consignee": {
    "address": {
      "name1": "MIAMI DISTRIBUTORS",
      "streetAddress1": "NW 25TH ST",
      "place": "MIAMI",
      "country": "US",
      "postCode": "33122"
    }
  },
  "carriersExecution": {
    "date": "2024-12-17",
    "placeOrAirportCityCode": "BOG",
    "authorisationSignature": "JOSE MARTINEZ"
  },
  "senderReference": {
    "fileReference": "97162321",
    "participantIdentifier": {
      "identifier": "AGT",
      "code": "BESTFREIGHT",
      "airportCityCode": "BOG"
    }
  },
  "chargeDeclarations": {
    "isoCurrencyCode": "USD",
    "chargeCode": "ALL_CHARGES_PREPAID",
    "payment_WeightValuation": "Prepaid",
    "payment_OtherCharges": "Prepaid",
    "declaredValueForCarriage": "NVD",
    "declaredValueForCustoms": "NCV"
  },
  "chargeItems": [{
    "numberOfPieces": "45",
    "commodityItemNumber": ["0603"],
    "grossWeight": { "amount": "225", "unit": "KILOGRAM" },
    "goodsDescription": "CONSOLIDATE FLOWERS",
    "consolidation": "true",
    "packaging": [{
      "numberOfPieces": "45",
      "weight": { "amount": "225", "unit": "KILOGRAM" },
      "dimensions": {
        "unit": "CENTIMETRE",
        "length": "60",
        "width": "40",
        "height": "30"
      }
    }],
    "charges": [{
      "chargeableWeight": { "amount": "225", "unit": "KILOGRAM" },
      "rateClassCode": "QUANTITY_RATE",
      "rateOrCharge": "2.80",
      "totalChargeAmount": "630.00"
    }]
  }],
  "agent": {
    "name": "BEST FREIGHT LOGISTICS",
    "place": "BOGOTA",
    "iataCargoAgentNumericCode": "1234567",
    "iataCargoAgentCASSAddress": "0016"
  },
  "prepaidChargeSummary": {
    "totalWeightCharge": "630.00",
    "totalOtherChargesDueAgent": "15.00",
    "totalOtherChargesDueCarrier": "45.00",
    "chargeSummaryTotal": "690.00"
  },
  "specialHandlingCodes": ["EAP"],
  "otherCharges": [
    { "paymentCondition": "Prepaid", "otherChargeCode": "MY", "entitlementCode": "Carrier", "chargeAmount": "45.00" },
    { "paymentCondition": "Prepaid", "otherChargeCode": "AW", "entitlementCode": "Agent", "chargeAmount": "15.00" }
  ],
  "shippersCertification": "JOSE MARTINEZ",
  "oci": [{
    "isoCountryCode": "CO",
    "informationIdentifier": "ISS",
    "controlInformation": "RA",
    "supplementaryControlInformation": "01000-001"
  }]
}
```

### 5.2 Consolidation List (CSL)

```json
{
  "type": "consolidation list",
  "id": "2a8dc67c-8bb5-5188-c49e-0482b35gb56d",
  "messageHeader": {
    "addressing": {
      "senderAddresses": [{ "type": "PIMA", "address": "REUAGT87SENDER" }],
      "finalRecipientAddresses": [{ "type": "PIMA", "address": "REUAIR08AIRLINE" }]
    },
    "creationDate": "2024-12-17T10:30:00.000"
  },
  "airWaybillNumber": "145-97162321",
  "originAndDestination": {
    "origin": "BOG",
    "destination": "MIA"
  },
  "quantity": {
    "shipmentDescriptionCode": "TOTAL_CONSIGNMENT",
    "numberOfPieces": "45",
    "weight": { "amount": "225", "unit": "KILOGRAM" }
  },
  "houseWaybillSummaries": [
    {
      "serialNumber": "HAWB-771",
      "origin": "BOG",
      "destination": "MIA",
      "numberOfPieces": "10",
      "weight": { "amount": "50", "unit": "KILOGRAM" },
      "natureOfGoods": "ROSAS FRESCAS"
    },
    {
      "serialNumber": "HAWB-772",
      "origin": "BOG",
      "destination": "MIA",
      "numberOfPieces": "15",
      "weight": { "amount": "75", "unit": "KILOGRAM" },
      "natureOfGoods": "CLAVELES"
    }
  ]
}
```

---

## 6. Troubleshooting

### 6.1 Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `FNA - INVALID AWB NUMBER` | Formato incorrecto | Verificar formato XXX-XXXXXXXX |
| `FNA - MISSING SENDER REFERENCE` | Campo senderReference ausente | ✅ Ya corregido en v2.0 |
| `FNA - INVALID COMMODITY CODE` | Código no reconocido | Usar códigos HS válidos |
| `FNA - ROUTING REQUIRED` | route[] vacío | Siempre incluir al menos 1 routing |
| `FNA - REPLY ADDRESS MISSING` | replyAnswerTo ausente | ✅ Ya incluido en messageHeader |

### 6.2 Validación Pre-Transmisión

```typescript
// Checklist antes de enviar
const validateMessage = (msg: any): string[] => {
  const errors: string[] = [];
  
  if (!msg.type) errors.push("Falta 'type'");
  if (!msg.id) errors.push("Falta 'id' (UUID)");
  if (!msg.messageHeader?.addressing?.senderAddresses) 
    errors.push("Falta 'senderAddresses'");
  if (!msg.airWaybillNumber) errors.push("Falta 'airWaybillNumber'");
  if (!msg.origin) errors.push("Falta 'origin'");
  if (!msg.destination) errors.push("Falta 'destination'");
  if (!msg.route || msg.route.length === 0) 
    errors.push("'route' debe tener al menos 1 elemento");
  if (!msg.senderReference) errors.push("Falta 'senderReference' (OBLIGATORIO)");
  if (!msg.chargeDeclarations?.isoCurrencyCode) 
    errors.push("Falta 'chargeDeclarations.isoCurrencyCode'");
  
  return errors;
};
```

---

## 📝 Changelog

### v2.2 (2025-06 - Análisis de Cumplimiento API)
- ✅ **CRÍTICO FHL:** Agregados campos `shipper` y `consignee` al HouseWaybillMessage (requeridos según API Traxon)
- ✅ Actualizado tipo `InternalHouseBill` para soportar shipper/consignee completos
- ✅ **UI:** Implementado componente `ExpandableJsonSection` para visualizar TODOS los campos transmitidos
- ✅ **UI:** Vista expandible por secciones (Shipper, Consignee, Agent, Flights, Charges, etc.)
- ✅ **UI:** Identificación visual de campos REQUERIDOS vs opcionales
- ✅ Corregido error de case sensitivity en `TRAXON_ENTITLEMENT_CODE` (Agent/Carrier)
- ✅ Documentado análisis completo de cumplimiento con especificación cargoJSON

### v2.2 (2024-12-23)
- ✅ **CRÍTICO Traxon Feedback:** Removido `serviceCode: "AIRPORT_TO_AIRPORT"` de chargeItems (aerolíneas siempre operan airport-to-airport)
- ✅ **CRÍTICO Traxon Feedback:** Removido `participantIdentifier` del agent (confunde a aerolíneas, AWB siempre es emitido por agente)
- ✅ Simplificado `goodsDescription` para consolidados: ahora usa `"CONSOLIDATION AS PER\nATTACHED DOCUMENTS"`
- ✅ Códigos HS deben ir en `harmonisedCommodityCode` (array), NO en goodsDescription
- ✅ El formateo con `\n` permite controlar saltos de línea (25 chars por línea en destino)

### v2.1 (2024-12-17)
- ✅ **CRÍTICO OCI:** Agregado mapeo de códigos legacy (RA, KC) a valores enum Traxon (REGULATED_AGENT, KNOWN_CONSIGNOR)
- ✅ Agregada función `normalizeOciControlInfo()` para transformación automática
- ✅ Corregido `chargeCode` enum: `ALL_CHARGES_PREPAID_CASH` → `ALL_CHARGES_PREPAID`

### v2.0 (2024-12-17)
- ✅ Agregado campo obligatorio `senderReference`
- ✅ Agregados `routeVia` y `routeAnswerVia` en addressing
- ✅ Agregado `commonAccessReference` en edifactData
- ✅ Implementadas reglas de negocio por aerolínea (LATAM, IBERIA, KLM)
- ✅ Normalización automática de países (CW→NL) y aeropuertos (RNG→MDE)
- ✅ Agregada función `generateHouseWaybillMessage`
- ✅ Mejorado manejo de campos opcionales (no enviar si undefined)
- ⚠️ ~~Agregado `serviceCode: "AIRPORT_TO_AIRPORT"` en chargeItems~~ (removido en v2.2)

### v1.0 (Inicial)
- Implementación básica AWB y CSL

---

## 7. Vista Expandible de Campos (Nueva Funcionalidad UI)

### Descripción

Se implementó un nuevo componente `ExpandableJsonSection` en el tab JSON del modal que permite:

1. **Ver todos los campos transmitidos** organizados por secciones
2. **Expandir/colapsar** cada sección para ver el detalle
3. **Identificar campos REQUERIDOS** (marcados en rojo)
4. **Visualizar estructuras anidadas** con formato legible
5. **Ver JSON raw** como opción colapsable al final

### Secciones Disponibles

#### Para FWB (Air Waybill):
| Sección | Color | Requerido |
|---------|-------|-----------|
| Identificación del Mensaje | Púrpura | ✅ |
| Message Header | Azul | ✅ |
| Datos Principales AWB | Verde | ✅ |
| Peso y Volumen | Ámbar | ✅ |
| Route | Azul | ✅ |
| Flights | Gris | ❌ |
| Shipper | Azul | ✅ |
| Consignee | Verde | ✅ |
| Agent | Ámbar | ❌ |
| Carriers Execution | Púrpura | ✅ |
| Sender Reference | Gris | ✅ |
| Charge Declarations | Verde | ✅ |
| Charge Items | Ámbar | ✅ |
| Charge Summary | Verde | ❌ |
| Special Handling | Rojo | ❌ |
| Other Charges | Gris | ❌ |
| OCI Security | Rojo | ❌ |
| Shipper's Certification | Púrpura | ❌ |

#### Para FHL (Houses):
| Sección | Color | Requerido |
|---------|-------|-----------|
| CSL - Identificación | Ámbar | ✅ |
| CSL - House Summaries | Ámbar | ✅ |
| FHL - Datos House | Púrpura | ✅ |
| FHL - Shipper | Azul | ✅ |
| FHL - Consignee | Verde | ✅ |
| FHL - Agents Head Office | Ámbar | ✅ |
| FHL - Carriers Execution | Púrpura | ❌ |
| FHL - OCI | Rojo | ❌ |

### Uso

1. Abrir el modal de un envío
2. Ir al tab **"JSON"**
3. Seleccionar **FWB** o **FHL** según corresponda
4. Hacer clic en cada sección para expandir/colapsar
5. Para ver JSON crudo, hacer clic en "Ver JSON Raw" al final
