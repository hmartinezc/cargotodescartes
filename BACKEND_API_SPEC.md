# 📋 Especificación de API para Backend → Traxon Connector

> **Versión:** 1.1  
> **Fecha:** 2025-12-18  
> **Validado contra:** Traxon cargoJSON API oficial

---

## 📌 Resumen Rápido

| Tipo de Envío | Mensajes Generados | Sección |
|--------------|-------------------|---------|
| **Directo** (sin houses) | 1× AWB | [Ver JSON](#1-envío-directo-awb-simple) |
| **Consolidado** (con houses) | 1× AWB + 1× CSL | [Ver JSON](#2-envío-consolidado-master--houses) |

> **NOTA (Dic 2024):** Según Traxon EMA, para consolidados ya **NO** es necesario enviar FHL (House Waybills) individuales.  
> El CSL (Consolidation List) contiene toda la información de las houses en el campo `houseWaybillSummaries`.

---

## 🆕 Modos de Visualización del Conector

El conector detecta automáticamente el modo según la cantidad de AWBs:

### Modo 1: Una sola AWB → Vista de Detalle Única
```javascript
// Desde tu backend JS, cuando es UN SOLO envío
traxon.openWithShipment({
    awbNumber: '145-12345678',
    origin: 'BOG',
    destination: 'MIA',
    // ... datos completos
});
```
✅ Se muestra una vista bonita con el detalle de la guía (sin buscador)

### Modo 2: Múltiples AWBs → Lista con Buscador
```javascript
// Desde tu backend JS, cuando son MÚLTIPLES envíos
traxon.openWithShipments([
    { awbNumber: '145-11223344', origin: 'BOG', destination: 'MIA', ... },
    { awbNumber: '145-55667788', origin: 'BOG', destination: 'JFK', ... },
    { awbNumber: '075-99887766', origin: 'BOG', destination: 'MAD', ... }
]);
```
✅ Se muestra una lista con buscador para seleccionar la guía a procesar

---

## 🔑 Campos Obligatorios vs Opcionales

### Campos REQUERIDOS (siempre)
```
awbNumber, origin, destination, pieces, weight,
shipper.name, shipper.address.street, shipper.address.place, shipper.address.countryCode, shipper.address.postalCode,
consignee.name, consignee.address.street, consignee.address.place, consignee.address.countryCode, consignee.address.postalCode,
agent.name, agent.iataCode, agent.place,
routing.senderAddress, routing.recipientAddress,
rates (al menos 1)
```

### Campos OPCIONALES (tienen defaults inteligentes)
| Campo | Default si no se envía |
|-------|------------------------|
| `messageId` | Se genera UUID automáticamente |
| `weightUnit` | `"KILOGRAM"` |
| `volumeUnit` | `"CUBIC_METRE"` |
| `currency` | `"USD"` |
| `paymentMethod` | `"Prepaid"` |
| `specialHandlingCodes` | Por aerolínea: Iberia=`["ECC","EAP","PER"]`, otras=`["EAP"]` |
| `oci` | Por país: CO=`AGT/RA` automático |
| `accountNumber` (shipper/consignee) | Puede omitirse si no lo tienes |

---

## 1️⃣ Envío DIRECTO (AWB Simple)

> **Caso:** Un shipper, un consignee, sin houses. Genera solo mensaje FWB (AWB).

```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  
  "awbNumber": "145-12345678",
  "origin": "BOG",
  "destination": "MIA",
  "pieces": 25,
  "weight": 450.5,
  "weightUnit": "KILOGRAM",
  "description": "CUT FLOWERS",
  "commodityCode": "0603",
  "currency": "USD",
  "paymentMethod": "Prepaid",
  
  "executionDate": "2025-12-18",
  "executionPlace": "BOGOTA",
  "signature": "AVTOPF",

  "shipper": {
    "name": "FLORES DE COLOMBIA SAS",
    "name2": "DIVISION EXPORTACIONES",
    "address": {
      "street": "CALLE 100 NO 15-20",
      "street2": "ZONA FRANCA BOGOTA",
      "place": "BOGOTA",
      "state": "CU",
      "countryCode": "CO",
      "postalCode": "110111"
    },
    "contact": {
      "identifier": "TE",
      "number": "5716012345"
    }
  },

  "consignee": {
    "name": "MIAMI FLOWERS INC",
    "address": {
      "street": "7600 NW 25TH STREET",
      "street2": "SUITE 100",
      "place": "MIAMI",
      "state": "FL",
      "countryCode": "US",
      "postalCode": "33122"
    },
    "contact": {
      "identifier": "TE",
      "number": "3057771234"
    }
  },

  "agent": {
    "name": "AVTOPF CARGO SAS",
    "iataCode": "1234567",
    "cassCode": "0016",
    "place": "BOGOTA"
  },

  "routing": {
    "senderAddress": "REUFFW90AVTOPF/BOG01",
    "recipientAddress": "USCAIR01LUXXSXS"
  },

  "flights": [
    {
      "flightNumber": "LA502",
      "date": "2025-12-18",
      "time": "08:30:00",
      "origin": "BOG",
      "destination": "MIA"
    }
  ],

  "rates": [
    {
      "pieces": 25,
      "weight": 450.5,
      "chargeableWeight": 500,
      "rateClassCode": "Q",
      "rateOrCharge": 1.25,
      "total": 625.00,
      "description": "CUT FLOWERS",
      "commodityCode": "0603",
      "hsCode": "0603110000"
    }
  ],

  "otherCharges": [
    {
      "code": "MY",
      "entitlement": "DueAgent",
      "amount": 25.00,
      "paymentMethod": "Prepaid"
    }
  ],

  "dimensions": [
    {
      "length": 100,
      "width": 40,
      "height": 20,
      "pieces": 25,
      "unit": "CENTIMETRE"
    }
  ],

  "hasHouses": false
}
```

### 📤 Mensajes que genera:
- ✅ **1× FWB** (Air Waybill)

---

## 2️⃣ Envío CONSOLIDADO (Master + Houses)

> **Caso:** Un AWB master con múltiples houses. Genera FWB + FHL por cada house + CSL.

```json
{
  "messageId": "660e8400-e29b-41d4-a716-446655440000",
  
  "awbNumber": "145-98765432",
  "origin": "BOG",
  "destination": "MIA",
  "pieces": 50,
  "weight": 850.0,
  "weightUnit": "KILOGRAM",
  "description": "CONSOL AS PER ATTACHED",
  "commodityCode": "0603",
  "currency": "USD",
  "paymentMethod": "Prepaid",
  
  "executionDate": "2025-12-18",
  "executionPlace": "BOGOTA",
  "signature": "AVTOPF",

  "shipper": {
    "name": "AVTOPF CARGO SAS",
    "address": {
      "street": "AV ELDORADO 90-10",
      "place": "BOGOTA",
      "countryCode": "CO",
      "postalCode": "110111"
    }
  },

  "consignee": {
    "name": "AVTOPF MIAMI LLC",
    "address": {
      "street": "7600 NW 25TH STREET",
      "place": "MIAMI",
      "state": "FL",
      "countryCode": "US",
      "postalCode": "33122"
    }
  },

  "agent": {
    "name": "AVTOPF CARGO SAS",
    "iataCode": "1234567",
    "cassCode": "0016",
    "place": "BOGOTA"
  },

  "routing": {
    "senderAddress": "REUFFW90AVTOPF/BOG01",
    "recipientAddress": "USCAIR01LUXXSXS"
  },

  "flights": [
    {
      "flightNumber": "LA502",
      "date": "2025-12-18",
      "origin": "BOG",
      "destination": "MIA"
    }
  ],

  "rates": [
    {
      "pieces": 50,
      "weight": 850.0,
      "chargeableWeight": 900,
      "rateClassCode": "Q",
      "rateOrCharge": 1.15,
      "total": 1035.00,
      "description": "CONSOL AS PER ATTACHED"
    }
  ],

  "hasHouses": true,

  "houseBills": [
    {
      "messageId": "770e8400-e29b-41d4-a716-446655440001",
      "hawbNumber": "HAWB-001",
      "pieces": 20,
      "weight": 350.0,
      "natureOfGoods": "ROSES",
      "commonName": "FRESH CUT ROSES",
      "shipperName": "FINCA LA ROSA SAS",
      "shipperAddress": {
        "street": "VEREDA EL ROSAL KM5",
        "place": "CHIA",
        "countryCode": "CO",
        "postalCode": "250001"
      },
      "consigneeName": "BLOOM FLOWERS MIAMI",
      "consigneeAddress": {
        "street": "8000 NW 15TH AVE",
        "place": "MIAMI",
        "state": "FL",
        "countryCode": "US",
        "postalCode": "33126"
      }
    },
    {
      "messageId": "770e8400-e29b-41d4-a716-446655440002",
      "hawbNumber": "HAWB-002",
      "pieces": 15,
      "weight": 250.0,
      "natureOfGoods": "CARNATIONS",
      "commonName": "FRESH CARNATIONS",
      "shipperName": "FLORES DEL CAMPO LTDA",
      "shipperAddress": {
        "street": "FINCA LA ESPERANZA",
        "place": "FACATATIVA",
        "countryCode": "CO",
        "postalCode": "253051"
      },
      "consigneeName": "FLOWER DEPOT USA",
      "consigneeAddress": {
        "street": "9200 NW 112TH AVE",
        "place": "DORAL",
        "state": "FL",
        "countryCode": "US",
        "postalCode": "33178"
      }
    },
    {
      "messageId": "770e8400-e29b-41d4-a716-446655440003",
      "hawbNumber": "HAWB-003",
      "pieces": 15,
      "weight": 250.0,
      "natureOfGoods": "MIXED FLOWERS",
      "commonName": "ASSORTED CUT FLOWERS",
      "shipperName": "AGROINDUSTRIAS FLOREX",
      "shipperAddress": {
        "street": "ZONA INDUSTRIAL COTA",
        "place": "COTA",
        "countryCode": "CO",
        "postalCode": "250017"
      },
      "consigneeName": "WHOLESALE BLOOMS INC",
      "consigneeAddress": {
        "street": "1100 NW 159TH DR",
        "place": "MIAMI",
        "state": "FL",
        "countryCode": "US",
        "postalCode": "33169"
      }
    }
  ]
}
```

### 📤 Mensajes que genera:
- ✅ **1× FWB** (Master Air Waybill)
- ✅ **3× FHL** (House Waybills - uno por cada house)
- ✅ **1× CSL** (Consolidation List - resumen de houses)

---

## 📊 Estructura del House Bill (houseBills[])

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `messageId` | string (uuid) | ❌ | ID único para tracking del FHL |
| `hawbNumber` | string | ✅ | Número de house waybill |
| `pieces` | integer | ✅ | Número de piezas |
| `weight` | number | ✅ | Peso en KG |
| `natureOfGoods` | string | ✅ | Descripción mercancía (máx 20 chars) |
| `commonName` | string | ❌ | Nombre común (requerido para KLM) |
| `shipperName` | string | ✅ | Nombre del shipper del house |
| `shipperAddress` | object | ❌ | Dirección completa del shipper |
| `consigneeName` | string | ✅ | Nombre del consignee del house |
| `consigneeAddress` | object | ❌ | Dirección completa del consignee |
| `slac` | integer | ❌ | Shipper's Load and Count |
| `harmonizedCode` | string | ❌ | Código HS arancelario |

---

## 🛡️ OCI - Información de Seguridad/Aduanas

> **NOTA:** Si no envías `oci`, el módulo genera automáticamente según la configuración:
> - Si `includeShipperTIN=true` y el shipper tiene `taxId`, se agrega OCI con su NIT/EORI
> - Si `includeConsigneeTIN=true` y el consignee tiene `taxId`, se agrega OCI con su NIT/EORI

### Formato LEGACY (Default - Compatible con sistemas anteriores)

Usa `ISS` + `additionalControlInfo` para indicar si es SHP o CNE:

```json
{
  "oci": [
    {
      "countryCode": "CO",
      "infoIdentifier": "ISS",
      "controlInfo": "TIN",
      "additionalControlInfo": "SHP/T/EORI",
      "supplementaryControlInfo": "901234567-8"
    },
    {
      "countryCode": "NL",
      "infoIdentifier": "ISS", 
      "controlInfo": "TIN",
      "additionalControlInfo": "CNE/T/EORI",
      "supplementaryControlInfo": "NL123456789"
    }
  ]
}
```

### Formato STANDARD

Usa directamente `SHP` o `CNE` como infoIdentifier:

```json
{
  "oci": [
    {
      "countryCode": "CO",
      "infoIdentifier": "SHP",
      "controlInfo": "TIN",
      "supplementaryControlInfo": "901234567-8"
    },
    {
      "countryCode": "NL",
      "infoIdentifier": "CNE",
      "controlInfo": "TIN", 
      "supplementaryControlInfo": "NL123456789"
    }
  ]
}
```

### Patrones de additionalControlInfo (Formato Legacy):

| Patrón | Descripción |
|--------|-------------|
| `SHP/T/EORI` | Shipper EORI/Tax ID |
| `CNE/T/EORI` | Consignee EORI/Tax ID |
| `SHP/T` | Shipper Tax ID (sin EORI) |
| `CNE/T` | Consignee Tax ID (sin EORI) |

### Códigos disponibles:

**infoIdentifier:**
| Código | Descripción |
|--------|-------------|
| `AGT` | Agent (Agente de carga) |
| `SHP` | Shipper (Remitente) |
| `CNE` | Consignee (Destinatario) |
| `FFW` | Freight Forwarder |
| `ISS` | Issuer (usado en formato legacy) |

**controlInfo:**
| Código | Valor Traxon API | Descripción |
|--------|------------------|-------------|
| `RA` | `REGULATED_AGENT` | Agente Regulado |
| `SPX` | `SECURITY_STATUS` | Estado de Seguridad (examinado) |
| `KC` | `KNOWN_CONSIGNOR` | Consignatario Conocido |
| `AEO` | `AUTHORISED_ECONOMIC_OPERATOR` | Operador Económico Autorizado |
| `SM` | `SCREENING_METHOD` | Método de Inspección |
| `TIN` | `TRADER_IDENTIFICATION_NUMBER` | NIT/Tax ID/EORI |
| `EORI` | `TRADER_IDENTIFICATION_NUMBER` | EORI Number (alias de TIN) |

---

## 🎯 SPH - Special Handling Codes

> **NOTA:** Si no envías `specialHandlingCodes`, se aplican defaults según la aerolínea (primeros 3 dígitos del AWB).

### Códigos más usados para flores:
| Código | Descripción | Uso común |
|--------|-------------|-----------|
| `EAP` | e-AWB Participant | Siempre (obligatorio e-freight) |
| `ECC` | Electronic + Paper | Solo Iberia (075) |
| `PER` | Perishable Cargo | Flores |
| `RFL` | Flowers | Flores específicamente |
| `COL` | Cool Goods | Temp controlada |

### Ejemplo explícito:
```json
{
  "specialHandlingCodes": ["EAP", "PER", "RFL"]
}
```

---

## 🔗 Routing - Direcciones PIMA

| Campo | Formato | Ejemplo |
|-------|---------|---------|
| `senderAddress` | Tu dirección PIMA | `REUFFW90AVTOPF/BOG01` |
| `recipientAddress` | Dirección de aerolínea | `USCAIR01LUXXSXS` |

---

## 📋 Rate Class Codes

| Código Corto | Valor Enum | Descripción |
|--------------|------------|-------------|
| `Q` | `QUANTITY_RATE` | Tarifa por cantidad |
| `M` | `MINIMUM_CHARGE` | Cargo mínimo |
| `N` | `NORMAL_RATE` | Tarifa normal |
| `B` | `BASIC_CHARGE` | Cargo básico |
| `C` | `SPECIFIC_COMMODITY_RATE` | Tarifa commodity específico |
| `K` | `RATE_PER_KILOGRAM` | Tarifa por kilo |

---

## ⚠️ Validaciones Importantes

1. **AWB Number:** Formato `XXX-XXXXXXXX` (3 dígitos aerolínea + 8 dígitos)
2. **Códigos aeropuerto:** 3 letras IATA mayúsculas (BOG, MIA, JFK)
3. **Códigos país:** 2 letras ISO mayúsculas (CO, US, EC)
4. **Peso:** Debe ser > 0
5. **Piezas:** Debe ser >= 1
6. **rates:** Al menos 1 línea de tarifa

---

## 🔄 Respuesta del Módulo

El módulo retorna el resultado de cada mensaje enviado:

```json
{
  "success": true,
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "messages": [
    {
      "type": "FWB",
      "awbNumber": "145-12345678",
      "status": "sent",
      "traxonRef": "TRX-2025-12345"
    },
    {
      "type": "FHL",
      "hawbNumber": "HAWB-001",
      "status": "sent"
    },
    {
      "type": "CSL",
      "status": "sent"
    }
  ],
  "timestamp": "2025-12-18T10:30:00Z"
}
```

---

## 📁 Archivos de Ejemplo

- `schemas/exampleShipmentDirect.json` - Ejemplo envío directo
- `schemas/exampleShipmentConsolidation.json` - Ejemplo consolidado
- `test/awb_directo_test.json` - Test AWB directo
- `test/awb_consolidado_test.json` - Test AWB consolidado
