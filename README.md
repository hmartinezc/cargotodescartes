# CARGO-IMP EDI Connector

Generador de mensajes EDI en formato CARGO-IMP (FWB/FHL) para transmisión aérea de carga.

## 📋 Descripción

Esta aplicación permite generar mensajes EDI estandarizados para la industria de carga aérea:

- **FWB (Freight Waybill)**: Mensaje de guía aérea master
- **FHL (Freight House List)**: Mensaje de guías hijas para consolidados

Los mensajes se generan según estándares IATA CARGO-IMP y pueden copiarse al portapapeles para envío manual o automático a aerolíneas.

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador.

### Build de Producción

```bash
npm run build
```

Los archivos se generan en la carpeta `dist/`.

### Build Embebido (Web Component)

Para embeber en otras aplicaciones (ASP.NET Razor, Vue, etc.):

```bash
npx vite build --config vite.embed.config.ts
```

Genera `dist-embed/cargo-imp-connector.js` - un Web Component standalone.

## 📁 Estructura del Proyecto

```
├── App.tsx                     # Aplicación principal
├── index.tsx                   # Punto de entrada
├── types.ts                    # Definiciones TypeScript
├── mockData.ts                 # Datos de ejemplo
├── components/
│   ├── ChampModal.tsx          # Modal principal de AWB
│   ├── ConfigPanel.tsx         # Panel de configuración
│   ├── CargoImpSegmentViewer.tsx # Visor de segmentos EDI
│   └── ...
├── services/
│   ├── champService.ts         # Utilidades generales
│   └── providers/
│       └── cargoimp/
│           ├── cargoImpService.ts  # Generador EDI
│           ├── cargoImpTypes.ts    # Tipos EDI
│           └── index.ts
└── src/
    └── webcomponent.tsx        # Web Component para embeber
```

## ✨ Características

### Generación de EDI
- Formato CARGO-IMP versión 16 (FWB) y 5 (FHL)
- Soporte para envíos directos y consolidados
- Configuración de segmentos por aerolínea

### Segmentos FWB Soportados
| Segmento | Descripción |
|----------|-------------|
| AWB | Número de guía y origen/destino |
| FLT | Información de vuelo |
| RTG | Routing |
| SHP | Shipper (remitente) |
| CNE | Consignee (destinatario) |
| AGT | Agente |
| SSR | Special Service Request |
| OSI | Other Service Information |
| CVD | Charges Declaration |
| RTD | Rate Description |
| ACC | Accounting Information |
| OCI | Other Customs Information |
| NFY | Also Notify Party |
| REF | Reference Number |
| PPD/COL | Prepaid/Collect Charges |

### Segmentos FHL Soportados
| Segmento | Descripción |
|----------|-------------|
| MBI | Master Bill Information |
| HBS | House Bill Summary |
| TXT | Text Description |
| SHP | House Shipper |
| CNE | House Consignee |
| OCI | Other Customs Info |

### Políticas por Aerolínea
Configuración personalizada de segmentos según prefijo AWB:
- **LATAM (145)**: Segmentos estándar
- **IBERIA (075)**: Configuración específica
- **Otras aerolíneas**: Política por defecto

## 🔧 Uso como Web Component

```html
<!-- Incluir el script -->
<script src="cargo-imp-connector.js"></script>

<!-- Agregar el componente -->
<cargo-imp-connector id="ediModal"></cargo-imp-connector>

<!-- Abrir con datos -->
<script>
  document.getElementById('ediModal').openWithShipment({
    awbNumber: '145-12345678',
    origin: 'BOG',
    destination: 'MIA',
    pieces: 100,
    weight: 1500,
    shipper: {
      name: 'EXPORTADORA EJEMPLO',
      address: { street: 'CALLE 123', place: 'BOGOTA', countryCode: 'CO' }
    },
    consignee: {
      name: 'IMPORTER EXAMPLE',
      address: { street: '123 MAIN ST', place: 'MIAMI', countryCode: 'US' }
    }
    // ... más campos
  });
</script>
```

### Eventos del Web Component

```javascript
// Cuando se copia EDI exitosamente
element.addEventListener('cargo-imp-copy-result', (e) => {
  console.log('EDI copiado:', e.detail.ediContent);
  console.log('AWB:', e.detail.awbNumber);
});

// ⭐ NUEVO: Cuando el usuario guarda la configuración
element.addEventListener('cargo-imp-config-saved', (e) => {
  const configJson = e.detail.config;  // JSON completo de configuración
  const timestamp = e.detail.timestamp;
  
  // Guardar en tu base de datos via API
  fetch('/api/guardar-politicas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configJson)
  });
});

// Cuando se carga configuración externa
element.addEventListener('cargo-imp-config-loaded', (e) => {
  console.log('Configuración cargada:', e.detail.config);
});

// Cuando se abre el modal
element.addEventListener('cargo-imp-opened', (e) => {
  console.log('Modal abierto:', e.detail);
});

// Cuando se cierra el modal
element.addEventListener('cargo-imp-closed', () => {
  console.log('Modal cerrado');
});
```

### Métodos del Web Component

```javascript
const modal = document.getElementById('ediModal');

// Abrir con un shipment
modal.openWithShipment(shipmentData);

// Abrir con múltiples shipments (lista)
modal.openWithShipments([shipment1, shipment2, ...]);

// ⭐ NUEVO: Cargar configuración desde tu base de datos
const savedConfig = await fetch('/api/obtener-politicas').then(r => r.json());
modal.loadConfig(savedConfig);

// Abrir con datos de demo
modal.open();

// Cerrar
modal.close();

// Verificar si está abierto
modal.isOpen();

// Obtener/Actualizar configuración
modal.getConfig();
modal.setConfig({ ... });
```

## 📝 Tipos de Datos Principales

### InternalShipment
```typescript
interface InternalShipment {
  id: string;
  awbNumber: string;           // Formato: XXX-XXXXXXXX
  origin: string;              // Código IATA 3 letras
  destination: string;         // Código IATA 3 letras
  pieces: number;
  weight: number;
  weightUnit: 'KILOGRAM' | 'POUND';
  shipper: Party;
  consignee: Party;
  agent: Agent;
  flightSegments: FlightSegment[];
  description: string;
  hasHouses: boolean;          // true = consolidado
  houseBills: HouseBill[];     // Guías hijas
  specialHandlingCodes?: string[];  // Ej: ['EAP', 'PER']
  rates: Rate[];
  otherCharges?: OtherCharge[];
}
```

### Party (Shipper/Consignee)
```typescript
interface Party {
  name: string;
  taxId?: string;
  address: {
    street: string;
    place: string;
    countryCode: string;
    postalCode?: string;
    stateProvince?: string;
  };
}
```

### HouseBill
```typescript
interface HouseBill {
  hawbNumber: string;
  pieces: number;
  weight: number;
  natureOfGoods: string;
  origin?: string;
  destination?: string;
  shipper?: Party;
  consignee?: Party;
}
```

## 🛠 Tecnologías

- **Preact**: Framework UI ligero (3kb)
- **TypeScript**: Tipado estático
- **Vite**: Build tool moderno
- **Tailwind CSS**: Estilos utilitarios
- **Lucide**: Iconos SVG

## 📋 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (localhost:3000) |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `npx vite build --config vite.embed.config.ts` | Build Web Component |

## � Integración con Backend (Razor/.NET)

Esta sección explica cómo persistir y recuperar la configuración de políticas de aerolíneas en tu base de datos.

### Flujo Recomendado

```
┌─────────────────────────────────────────────────────────────────┐
│                         RAZOR PAGE                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Al cargar página:                                           │
│     - Obtener config de BD → loadConfig(json)                   │
│                                                                 │
│  2. Usuario edita políticas en el modal                         │
│                                                                 │
│  3. Usuario click "Guardar":                                    │
│     - Evento cargo-imp-config-saved dispara                     │
│     - Enviar e.detail.config a tu API                           │
│     - Guardar en BD                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Ejemplo Completo en Razor Page

```html
@page
@model MiApp.Pages.EditorCargoModel

<cargo-imp-connector id="ediModal"></cargo-imp-connector>

@section Scripts {
<script type="module">
  const modal = document.getElementById('ediModal');
  
  // ==========================================
  // 1. CARGAR CONFIG DESDE BD AL INICIAR
  // ==========================================
  async function cargarConfiguracion() {
    try {
      const response = await fetch('/api/cargo-config');
      if (response.ok) {
        const savedConfig = await response.json();
        modal.loadConfig(savedConfig);
        console.log('Configuración cargada desde BD');
      }
    } catch (err) {
      console.warn('Usando configuración por defecto:', err);
    }
  }
  
  // Cargar al inicio
  cargarConfiguracion();
  
  // ==========================================
  // 2. GUARDAR CONFIG CUANDO USUARIO GUARDE
  // ==========================================
  modal.addEventListener('cargo-imp-config-saved', async (e) => {
    const configJson = e.detail.config;
    
    try {
      const response = await fetch('/api/cargo-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'RequestVerificationToken': '@Html.AntiForgeryToken()'
        },
        body: JSON.stringify(configJson)
      });
      
      if (response.ok) {
        alert('Configuración guardada exitosamente');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (err) {
      alert('Error guardando configuración: ' + err.message);
    }
  });
  
  // ==========================================
  // 3. ABRIR MODAL CON SHIPMENT
  // ==========================================
  window.abrirEditor = function(shipmentJson) {
    modal.openWithShipment(shipmentJson);
  };
</script>
}
```

### API Controller en .NET

```csharp
[ApiController]
[Route("api/[controller]")]
public class CargoConfigController : ControllerBase
{
    private readonly ICargoConfigService _configService;
    
    [HttpGet]
    public async Task<IActionResult> GetConfig()
    {
        var userId = User.Identity.Name;
        var config = await _configService.GetConfigAsync(userId);
        return Ok(config ?? new { }); // Retorna {} si no hay config
    }
    
    [HttpPost]
    public async Task<IActionResult> SaveConfig([FromBody] JsonElement config)
    {
        var userId = User.Identity.Name;
        await _configService.SaveConfigAsync(userId, config.GetRawText());
        return Ok(new { success = true });
    }
}
```

### Estructura del JSON de Configuración

El JSON que se guarda/carga tiene esta estructura:

```json
{
  "caseOptionByAirline": {
    "125": 20,    // AVIANCA: Case2 Opt0
    "729": 21,    // COPA: Case2 Opt1
    "401": 41,    // AEROMEXICO: Case4 Opt1
    "957": 71     // AEROMÉXICO CARGO: Case7 Opt1
  },
  "defaultCaseOption": 20,
  "outputFormat": "FWB/16",
  "includeHeader": true,
  "useFHL4Format": true,
  "originCountry": "CO",
  "masterPrefix": "M"
}
```

### Tabla Sugerida en SQL Server

```sql
CREATE TABLE CargoImpConfig (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId NVARCHAR(256) NOT NULL,
    ConfigJson NVARCHAR(MAX) NOT NULL,
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_UserId UNIQUE (UserId)
);
```

## �📄 Licencia

Propietario - Todos los derechos reservados.
