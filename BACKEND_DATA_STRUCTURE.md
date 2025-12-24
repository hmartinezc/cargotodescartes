# Estructura de Datos para Backend

Este documento describe la estructura JSON que el backend debe construir para enviar al componente `<traxon-connector>`.

---

## 📦 Envío Directo (Sin Houses)

```typescript
{
  // ===== IDENTIFICACIÓN (Opcionales - se generan si no se envían) =====
  id?: string,                    // ID único del shipment (ej: "shipment-123")
  messageId?: string,             // UUID del backend para tracking

  // ===== AWB PRINCIPAL (Requeridos) =====
  awbNumber: string,              // Número AWB completo "145-12345678" (prefijo-serial)
  origin: string,                 // Código IATA origen "BOG"
  destination: string,            // Código IATA destino "MIA"
  
  // ===== CARGA (Requeridos) =====
  pieces: number,                 // Cantidad de piezas (ej: 10)
  weight: number,                 // Peso bruto (ej: 150.5)
  weightUnit?: "KILOGRAM"|"POUND", // Unidad de peso (default: "KILOGRAM")
  
  // ===== CARGA (Opcionales) =====
  volume?: number,                // Volumen en m³ (ej: 2.5)
  volumeUnit?: "CUBIC_METRE"|"CUBIC_CENTIMETRE", // Unidad volumen
  description?: string,           // Descripción mercancía "FRESH FLOWERS"
  commodityCode?: string,         // Código commodity (ej: "P")
  
  // ===== DIMENSIONES (Opcional - Array) =====
  dimensions?: [
    {
      length: number,             // Largo en cm (ej: 100)
      width: number,              // Ancho en cm (ej: 50)
      height: number,             // Alto en cm (ej: 30)
      pieces: number,             // Piezas con estas dimensiones
      unit: "CENTIMETRE"|"INCH"   // Unidad (default: "CENTIMETRE")
    }
  ],

  // ===== FINANCIERO (Requeridos) =====
  currency: string,               // Moneda "USD", "EUR", "COP"
  paymentMethod: "Prepaid"|"Collect", // Método de pago
  
  // ===== SHIPPER - Exportador (Requerido) =====
  shipper: {
    name: string,                 // Nombre/Razón social (max 35 chars)
    name2?: string,               // Segunda línea nombre (opcional, max 35)
    accountNumber?: string,       // Número de cuenta (max 14)
    taxId?: string,               // NIT/Tax ID para OCI
    address: {
      street: string,             // Dirección línea 1 (max 35 chars) REQUERIDO
      street2?: string,           // Dirección línea 2 (max 35)
      place: string,              // Ciudad (max 17 chars) REQUERIDO
      state?: string,             // Estado/Provincia (max 2 chars)
      countryCode: string,        // País ISO 2 letras "CO" REQUERIDO
      postalCode: string          // Código postal (max 9 chars)
    },
    contact?: {
      identifier: string,         // Tipo contacto "TE" (teléfono)
      number: string              // Número (max 25 chars)
    }
  },

  // ===== CONSIGNEE - Importador (Requerido) =====
  consignee: {
    // Misma estructura que shipper
    name: string,
    name2?: string,
    accountNumber?: string,
    taxId?: string,
    address: {
      street: string,
      street2?: string,
      place: string,
      state?: string,
      countryCode: string,
      postalCode: string
    },
    contact?: {
      identifier: string,
      number: string
    }
  },

  // ===== AGENTE IATA (Requerido) =====
  agent: {
    name: string,                 // Nombre agente (max 35) REQUERIDO
    iataCode: string,             // Código IATA 7 dígitos "1234567" REQUERIDO
    cassCode?: string,            // Código CASS (max 4)
    place: string,                // Ciudad del agente REQUERIDO
    accountNumber?: string        // Número cuenta (max 14)
  },

  // ===== VUELOS (Requerido - mínimo 1) =====
  flights: [
    {
      flightNumber: string,       // Número vuelo "AV123" REQUERIDO
      date: string,               // Fecha "2025-01-15" REQUERIDO
      time?: string,              // Hora "08:30"
      origin: string,             // Origen del vuelo "BOG"
      destination: string         // Destino del vuelo "MIA"
    }
  ],

  // ===== TARIFAS/RATES (Requerido - mínimo 1) =====
  rates: [
    {
      pieces: number,             // Piezas para esta tarifa
      weight: number,             // Peso para esta tarifa
      chargeableWeight?: number,  // Peso cobrable (si diferente)
      rateClassCode: string,      // Código: "Q"=Quantity, "N"=Normal, "M"=Mínimo
      rateOrCharge: number,       // Tarifa por kg (ej: 2.50)
      total: number,              // Total = chargeableWeight * rateOrCharge
      description: string,        // Descripción mercancía
      commodityCode?: string,     // Código commodity (ej: "P")
      hsCode?: string             // Código arancelario HTS
    }
  ],

  // ===== OTROS CARGOS (Opcional) =====
  otherCharges?: [
    {
      code: string,               // Código cargo "MY", "AW", "FC", etc.
      entitlement: "DueCarrier"|"DueAgent", // A quién se debe
      amount: number,             // Monto del cargo
      paymentMethod: "Prepaid"|"Collect"
    }
  ],

  // ===== ROUTING (Opcional - tiene defaults) =====
  routing?: {
    senderAddress: string,        // PIMA agente "REUFFW90AVTOPF/BOG01"
    recipientAddress: string      // PIMA aerolínea "USCAIR01LUXXSXS"
  },

  // ===== SEGURIDAD OCI (Opcional - se genera automático) =====
  oci?: [
    {
      countryCode: string,        // "CO"
      infoIdentifier: string,     // "AGT", "ISS", etc.
      controlInfo: string,        // "RA", "SPX", "KC", etc.
      additionalControlInfo?: string,
      supplementaryControlInfo?: string
    }
  ],

  // ===== CÓDIGOS ESPECIALES (Opcional - se generan por aerolínea) =====
  specialHandlingCodes?: string[], // ["EAP", "PER", "COL"]

  // ===== EJECUCIÓN (Opcional) =====
  executionDate?: string,         // Fecha ejecución "2025-01-15"
  executionPlace?: string,        // Lugar ejecución "BOGOTA"
  signature?: string,             // Firma agente "AVTOPF"

  // ===== CONSOLIDACIÓN =====
  hasHouses: false                // false = Envío directo (sin houses)
}
```

---

## 📦📦 Envío Consolidado (Con Houses)

Para consolidados, se envía la misma estructura anterior PERO con:

```typescript
{
  // ... todos los campos anteriores del Master AWB ...
  
  // ===== CONSOLIDACIÓN =====
  hasHouses: true,                // true = Es consolidado
  
  // ===== HOUSE BILLS (Requerido si hasHouses=true) =====
  houseBills: [
    {
      id: string,                 // ID único de la house "house-1"
      messageId?: string,         // UUID del backend para tracking FHL
      hawbNumber: string,         // Número HAWB "HAWB-001" REQUERIDO
      
      // Campos resumidos (para UI)
      shipperName: string,        // Nombre shipper resumido "FLORES ABC"
      consigneeName: string,      // Nombre consignee resumido "MIAMI IMP"
      
      // Carga de la house
      pieces: number,             // Piezas en esta house REQUERIDO
      weight: number,             // Peso de esta house REQUERIDO
      natureOfGoods: string,      // Descripción corta (max 20) "ROSES"
      
      // Opcionales
      commonName?: string,        // Nombre común mercancía
      htsCodes?: string[],        // Códigos HTS ["0603110010"]
      
      // Partes completas (Requeridas para API Traxon)
      shipper?: {                 // Shipper completo de la house
        name: string,
        name2?: string,
        accountNumber?: string,
        address: {
          street: string,
          street2?: string,
          place: string,
          state?: string,
          countryCode: string,
          postalCode: string
        },
        contact?: {
          identifier: string,
          number: string
        }
      },
      consignee?: {               // Consignee completo de la house
        // Misma estructura que shipper
      }
    }
    // ... más houses ...
  ]
}
```

---

## 🔑 Campos Mínimos Requeridos

### Para Envío Directo (sin houses):

```json
{
  "awbNumber": "145-12345678",
  "origin": "BOG",
  "destination": "MIA",
  "pieces": 10,
  "weight": 150.5,
  "currency": "USD",
  "paymentMethod": "Prepaid",
  "shipper": {
    "name": "EXPORTADORA FLORES SA",
    "address": {
      "street": "CALLE 123 #45-67",
      "place": "BOGOTA",
      "countryCode": "CO",
      "postalCode": "110111"
    }
  },
  "consignee": {
    "name": "MIAMI FLOWER IMPORTS LLC",
    "address": {
      "street": "123 NW 87TH AVE",
      "place": "MIAMI",
      "countryCode": "US",
      "postalCode": "33172"
    }
  },
  "agent": {
    "name": "AGENCIA CARGO LTDA",
    "iataCode": "1234567",
    "place": "BOGOTA"
  },
  "flights": [
    {
      "flightNumber": "AV123",
      "date": "2025-01-15",
      "origin": "BOG",
      "destination": "MIA"
    }
  ],
  "rates": [
    {
      "pieces": 10,
      "weight": 150.5,
      "rateClassCode": "Q",
      "rateOrCharge": 2.50,
      "total": 376.25,
      "description": "FRESH FLOWERS"
    }
  ],
  "hasHouses": false
}
```

### Para Envío Consolidado (con houses):

```json
{
  "awbNumber": "145-12345678",
  "origin": "BOG",
  "destination": "MIA",
  "pieces": 25,
  "weight": 400,
  "currency": "USD",
  "paymentMethod": "Prepaid",
  "shipper": {
    "name": "CONSOLIDADORA CARGO SA",
    "address": {
      "street": "ZONA FRANCA BOGOTA",
      "place": "BOGOTA",
      "countryCode": "CO",
      "postalCode": "110111"
    }
  },
  "consignee": {
    "name": "US CONSOLIDATION INC",
    "address": {
      "street": "456 CARGO BLVD",
      "place": "MIAMI",
      "countryCode": "US",
      "postalCode": "33166"
    }
  },
  "agent": {
    "name": "AGENCIA CARGO LTDA",
    "iataCode": "1234567",
    "place": "BOGOTA"
  },
  "flights": [
    {
      "flightNumber": "AV123",
      "date": "2025-01-15",
      "origin": "BOG",
      "destination": "MIA"
    }
  ],
  "rates": [
    {
      "pieces": 25,
      "weight": 400,
      "rateClassCode": "Q",
      "rateOrCharge": 2.00,
      "total": 800.00,
      "description": "CONSOLIDATED CARGO"
    }
  ],
  "hasHouses": true,
  "houseBills": [
    {
      "id": "house-1",
      "hawbNumber": "HAWB-001",
      "shipperName": "FLORES ABC SAS",
      "consigneeName": "FLOWER SHOP MIAMI",
      "pieces": 10,
      "weight": 150,
      "natureOfGoods": "ROSES",
      "shipper": {
        "name": "FLORES ABC SAS",
        "address": {
          "street": "KR 50 #20-30",
          "place": "BOGOTA",
          "countryCode": "CO",
          "postalCode": "110221"
        }
      },
      "consignee": {
        "name": "FLOWER SHOP MIAMI LLC",
        "address": {
          "street": "789 FLOWER ST",
          "place": "MIAMI",
          "countryCode": "US",
          "postalCode": "33125"
        }
      }
    },
    {
      "id": "house-2",
      "hawbNumber": "HAWB-002",
      "shipperName": "FRUTAS COLOMBIA",
      "consigneeName": "FRESH FRUITS USA",
      "pieces": 15,
      "weight": 250,
      "natureOfGoods": "TROPICAL FRUITS",
      "shipper": {
        "name": "FRUTAS COLOMBIA SA",
        "address": {
          "street": "CL 80 #10-20",
          "place": "MEDELLIN",
          "countryCode": "CO",
          "postalCode": "050001"
        }
      },
      "consignee": {
        "name": "FRESH FRUITS USA INC",
        "address": {
          "street": "555 PRODUCE AVE",
          "place": "LOS ANGELES",
          "countryCode": "US",
          "postalCode": "90001"
        }
      }
    }
  ]
}
```

---

## 📋 Códigos de Referencia

### Rate Class Codes (rateClassCode)
| Código | Descripción |
|--------|-------------|
| `Q` | Quantity Rate (tarifa por cantidad) |
| `N` | Normal Rate |
| `M` | Minimum Charge |
| `K` | Rate Per Kilogram |
| `C` | Specific Commodity Rate |
| `B` | Basic Charge |

### Special Handling Codes (specialHandlingCodes) - Opcionales
| Código | Descripción |
|--------|-------------|
| `EAP` | e-AWB Participant (auto para la mayoría) |
| `PER` | Perishable Cargo |
| `COL` | Cool Goods |
| `FRO` | Frozen Goods |
| `RFL` | Flowers |
| `PEP` | Perishable Fruits & Vegetables |
| `DGR` | Dangerous Goods |
| `AVI` | Live Animals |
| `VAL` | Valuable Cargo |
| `PIL` | Pharmaceuticals |

### Other Charge Codes (otherCharges.code)
| Código | Descripción |
|--------|-------------|
| `MY` | Miscellaneous - Due Agent |
| `AW` | Air Waybill Fee |
| `FC` | Fuel Surcharge |
| `SC` | Security Charge |
| `TX` | Tax |

---

## 🚀 Ejemplo de Uso en JavaScript

```javascript
// Datos que construye tu backend
const shipmentData = {
  awbNumber: "145-98765432",
  origin: "BOG",
  destination: "JFK",
  pieces: 20,
  weight: 300,
  // ... resto de campos
};

// Abrir el modal con los datos
document.getElementById('traxonModal').openWithShipment(shipmentData);

// Para múltiples AWBs
document.getElementById('traxonModal').openWithShipments([
  shipmentData1,
  shipmentData2,
  shipmentData3
]);
```

---

## ⚠️ Notas Importantes

1. **Campos opcionales**: Si no envías un campo opcional, el componente usa valores por defecto o permite editarlos en el modal.

2. **specialHandlingCodes**: Se generan automáticamente según el prefijo AWB (aerolínea) si no los envías.

3. **oci (Seguridad)**: Se genera automáticamente con valores estándar para Colombia si no lo envías.

4. **routing**: Tiene valores por defecto configurables en el panel de configuración del modal.

5. **Houses completas**: Para consolidados, aunque `shipperName` y `consigneeName` son suficientes para la UI, se recomienda enviar `shipper` y `consignee` completos para la transmisión a Traxon.
