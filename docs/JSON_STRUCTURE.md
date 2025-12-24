# Estructura JSON para Traxon Connector

Este documento explica la estructura del JSON que tu backend (Razor Pages) debe enviar al componente Traxon Connector para abrir una guía Master AWB.

## Uso desde Razor Pages

```html
<!-- 1. Incluir el script -->
<script src="traxon-connector.js"></script>

<!-- 2. Agregar el web component -->
<traxon-connector id="traxonModal"></traxon-connector>

<!-- 3. Abrir con datos de una AWB -->
<script>
  function abrirGuia(datosAwb) {
    const modal = document.getElementById('traxonModal');
    modal.openWithShipment(datosAwb);
  }
</script>
```

## Estructura JSON Mínima (Campos Requeridos)

Para una **guía DIRECTA simple** (sin Houses), el JSON mínimo es:

```json
{
  "awbNumber": "145-11223344",
  "origin": "BOG",
  "destination": "MIA",
  "pieces": 75,
  "weight": 1275,
  "weightUnit": "KILOGRAM",
  "currency": "USD",
  "paymentMethod": "Prepaid",

  "shipper": {
    "name": "CONSOLIDADORA FLORES COLOMBIA SAS",
    "address": {
      "street": "CRA 7 NO 140-20 PISO 3",
      "place": "BOGOTA",
      "countryCode": "CO",
      "postalCode": ""
    }
  },

  "consignee": {
    "name": "USA FLOWER DISTRIBUTORS LLC",
    "address": {
      "street": "8000 NW 36TH STREET SUITE 200",
      "place": "DORAL",
      "countryCode": "US",
      "postalCode": ""
    }
  },

  "agent": {
    "name": "AVTOPF CARGO SAS",
    "iataCode": "1234567",
    "place": "BOGOTA"
  },

  "flights": [
    {
      "flightNumber": "LA4567",
      "date": "2025-12-20",
      "origin": "BOG",
      "destination": "MIA"
    }
  ],

  "rates": [
    {
      "pieces": 75,
      "weight": 1275,
      "rateClassCode": "Q",
      "rateOrCharge": 1.25,
      "total": 1593.75,
      "description": "CUT FLOWERS"
    }
  ],

  "hasHouses": false,
  "houseBills": []
}
```

## Estructura JSON Completa (Todos los Campos)

```json
{
  "id": "shipment-unique-id",
  "messageId": "uuid-opcional-para-tracking",
  "status": "DRAFT",
  
  "awbNumber": "145-11223344",
  "origin": "BOG",
  "destination": "MIA",
  
  "pieces": 75,
  "weight": 1275,
  "weightUnit": "KILOGRAM",
  "volume": 5.5,
  "volumeUnit": "CUBIC_METRE",
  
  "description": "CUT FLOWERS FRESH",
  "commodityCode": "0603",
  "currency": "USD",
  "paymentMethod": "Prepaid",
  
  "executionDate": "2025-12-19",
  "executionPlace": "BOGOTA",
  "signature": "AVTOPF",

  "shipper": {
    "name": "CONSOLIDADORA FLORES COLOMBIA SAS",
    "name2": "DIVISION EXPORTACIONES",
    "accountNumber": "SHP001",
    "taxId": "900123456-1",
    "address": {
      "street": "CRA 7 NO 140-20 PISO 3",
      "street2": "ZONA FRANCA",
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
    "name": "USA FLOWER DISTRIBUTORS LLC",
    "name2": "",
    "accountNumber": "CNE001",
    "taxId": "",
    "address": {
      "street": "8000 NW 36TH STREET SUITE 200",
      "street2": "",
      "place": "DORAL",
      "state": "FL",
      "countryCode": "US",
      "postalCode": "33166"
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
    "place": "BOGOTA",
    "accountNumber": "AGT001"
  },

  "routing": {
    "senderAddress": "REUFFW90AVTOPF/BOG01",
    "recipientAddress": "USCAIR01LUXXSXS"
  },

  "flights": [
    {
      "flightNumber": "LA4567",
      "date": "2025-12-20",
      "time": "08:30:00",
      "origin": "BOG",
      "destination": "MIA"
    }
  ],

  "rates": [
    {
      "pieces": 75,
      "weight": 1275,
      "chargeableWeight": 1400,
      "rateClassCode": "Q",
      "rateOrCharge": 1.25,
      "total": 1750.00,
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
      "pieces": 75,
      "unit": "CENTIMETRE"
    }
  ],

  "oci": [
    {
      "countryCode": "US",
      "infoIdentifier": "ISS",
      "controlInfo": "RA",
      "additionalControlInfo": "RA",
      "supplementaryControlInfo": "01234-567"
    }
  ],

  "specialHandlingCodes": ["PER", "EAP"],

  "hasHouses": false,
  "houseBills": []
}
```

## Rutas con Múltiples Vuelos (Conexiones)

Si la carga tiene conexiones (escala), puedes enviar múltiples vuelos:

```json
{
  "flights": [
    {
      "flightNumber": "AV9765",
      "date": "2025-12-20",
      "time": "06:00:00",
      "origin": "BOG",
      "destination": "MDE"
    },
    {
      "flightNumber": "LA4567",
      "date": "2025-12-20",
      "time": "11:30:00",
      "origin": "MDE",
      "destination": "MIA"
    }
  ]
}
```

El componente mostrará automáticamente: **BOG → MDE → MIA** con los detalles de cada vuelo.

## Envío Consolidado (Con Houses)

Para un envío **CONSOLIDADO** con House Waybills:

```json
{
  "awbNumber": "145-11223344",
  "origin": "BOG",
  "destination": "MIA",
  "pieces": 75,
  "weight": 1275,
  "weightUnit": "KILOGRAM",
  
  "hasHouses": true,
  "houseBills": [
    {
      "id": "house-1",
      "hawbNumber": "HAWB2025001",
      "shipperName": "FINCA LAS ROSAS",
      "consigneeName": "BLOOM MIAMI LLC",
      "pieces": 30,
      "weight": 510,
      "natureOfGoods": "ROSES RED"
    },
    {
      "id": "house-2",
      "hawbNumber": "HAWB2025002",
      "shipperName": "FLORES DEL CAMPO",
      "consigneeName": "SUNNY FLOWERS INC",
      "pieces": 25,
      "weight": 425,
      "natureOfGoods": "CARNATIONS"
    },
    {
      "id": "house-3",
      "hawbNumber": "HAWB2025003",
      "shipperName": "ORQUIDEAS COLOMBIA",
      "consigneeName": "ORCHID WORLD USA",
      "pieces": 20,
      "weight": 340,
      "natureOfGoods": "ORCHIDS"
    }
  ],
  
  "shipper": { ... },
  "consignee": { ... },
  "agent": { ... },
  "flights": [ ... ],
  "rates": [ ... ]
}
```

## Campos Opcionales vs Requeridos

### ✅ Campos REQUERIDOS (el componente fallará sin estos):
- `awbNumber` - Número AWB formato XXX-XXXXXXXX
- `origin` - Código IATA 3 letras
- `destination` - Código IATA 3 letras
- `pieces` - Número entero > 0
- `weight` - Número > 0
- `shipper.name` - Nombre del exportador
- `shipper.address.street` - Dirección
- `shipper.address.place` - Ciudad
- `shipper.address.countryCode` - Código país ISO 2 letras
- `consignee.name` - Nombre del importador
- `consignee.address.street` - Dirección
- `consignee.address.place` - Ciudad
- `consignee.address.countryCode` - Código país ISO 2 letras
- `agent.name` - Nombre del agente
- `agent.iataCode` - Código IATA 7 dígitos
- `flights` - Array con al menos 1 vuelo
- `rates` - Array con al menos 1 rate line

### ⚪ Campos OPCIONALES (tienen valores por defecto):
- `id` - Se genera automáticamente
- `status` - Default: `"DRAFT"`
- `weightUnit` - Default: `"KILOGRAM"`
- `volume`, `volumeUnit` - Si no se envía, no se muestra
- `description` - Default: descripción de rates
- `currency` - Default: `"USD"`
- `paymentMethod` - Default: `"Prepaid"`
- `dimensions` - Opcional
- `otherCharges` - Array vacío si no hay
- `oci` - Se genera automáticamente basado en configuración
- `specialHandlingCodes` - Se genera automáticamente basado en aerolínea
- `hasHouses` - Default: `false`
- `houseBills` - Array vacío si no es consolidado

## Eventos JavaScript

El componente dispara eventos que puedes escuchar:

```javascript
const modal = document.getElementById('traxonModal');

// Cuando se abre el modal
modal.addEventListener('traxon-opened', (e) => {
  console.log('Modal abierto:', e.detail);
});

// Cuando se cierra el modal
modal.addEventListener('traxon-closed', (e) => {
  console.log('Modal cerrado');
});

// Cuando se actualiza la configuración
modal.addEventListener('traxon-config-updated', (e) => {
  console.log('Config actualizada:', e.detail.config);
});
```

## Ejemplo de Integración en Razor

```csharp
@page
@model MiPaginaModel

<button onclick="abrirGuia()">Ver Guía Master</button>

<traxon-connector id="traxonModal"></traxon-connector>

<script>
function abrirGuia() {
    const datos = @Html.Raw(Json.Serialize(Model.DatosGuia));
    document.getElementById('traxonModal').openWithShipment(datos);
}
</script>
```

Donde `Model.DatosGuia` es un objeto C# que coincide con la estructura JSON descrita arriba.
