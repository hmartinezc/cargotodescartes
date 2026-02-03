# Documentación Técnica: CARGO-IMP EDI Connector

**Versión:** 3.0  
**Última Actualización:** 2026-01-31  
**Alcance:** Generación de mensajes EDI en formato CARGO-IMP (FWB/FHL)

---

## 📋 Índice

1. [Resumen](#1-resumen)
2. [Formato CARGO-IMP](#2-formato-cargo-imp)
3. [Estructura de Mensajes FWB](#3-estructura-de-mensajes-fwb)
4. [Estructura de Mensajes FHL](#4-estructura-de-mensajes-fhl)
5. [Políticas por Aerolínea](#5-políticas-por-aerolínea)
6. [Configuración de Segmentos](#6-configuración-de-segmentos)
7. [Integración con Backend](#7-integración-con-backend)

---

## 1. Resumen

Este conector genera mensajes EDI en formato **CARGO-IMP** (Cargo Interchange Message Procedures) según estándares IATA:

| Mensaje | Versión | Descripción |
|---------|---------|-------------|
| **FWB** | 16 | Freight Waybill (Guía Aérea Master) |
| **FHL** | 5 | Freight House List (Guías Hijas) |

Los mensajes se generan para copiar al portapapeles y enviar manualmente o via integración con sistemas de aerolíneas.

---

## 2. Formato CARGO-IMP

### 2.1 Estructura General

```
FWB/16
AWB/157-12345678BOG/MIA/T75K1250.0/FLORES FRESCAS
FLT/AV123/15JAN
RTG/MIA
SHP/EXPORTADORA EJEMPLO SAS/CALLE 123/BOGOTA/CO/NIT 900123456
CNE/IMPORTER EXAMPLE LLC/123 MAIN ST/MIAMI/US/EIN 12-3456789
...
LAST
```

### 2.2 Elementos Clave

- **Línea 1**: Tipo de mensaje y versión (FWB/16)
- **Segmentos**: Cada línea comienza con código de 3 letras
- **Separadores**: `/` separa campos, `-` en AWB numbers
- **Terminador**: `LAST` al final del mensaje

---

## 3. Estructura de Mensajes FWB

### 3.1 Segmentos Obligatorios

| Segmento | Descripción | Ejemplo |
|----------|-------------|---------|
| AWB | Número de guía, origen/destino, piezas/peso | `AWB/145-12345678BOG/MIA/T100K1500.0` |
| FLT | Información de vuelo | `FLT/LA1234/20JAN` |
| SHP | Datos del remitente | `SHP/NOMBRE/DIRECCION/CIUDAD/PAIS` |
| CNE | Datos del destinatario | `CNE/NOMBRE/DIRECCION/CIUDAD/PAIS` |
| AGT | Información del agente | `AGT/AGENCIA/BOG/12345678` |
| CVD | Declaración de cargos | `CVD/USD/PP` |

### 3.2 Segmentos Opcionales

| Segmento | Descripción |
|----------|-------------|
| RTG | Routing (aeropuertos intermedios) |
| SSR | Special Service Request |
| OSI | Other Service Information |
| SPH | Special Handling Codes |
| RTD | Rate Description |
| ACC | Accounting Information |
| OCI | Other Customs Information |
| NFY | Also Notify Party |
| REF | Reference Numbers |
| PPD/COL | Prepaid/Collect Charges |

### 3.3 Ejemplo Completo FWB

```
FWB/16
AWB/145-12345678BOG/MIA/T75K1250.0/FLORES FRESCAS CONSOLIDADO
FLT/LA1234/20JAN
RTG/MIA
SHP
/CONSOLIDADORA FLORES COLOMBIA SAS
/CRA 45 NO 23-50
/BOGOTA/CO/111321
/NIT 900123456-1
CNE
/USA FLOWER DISTRIBUTORS LLC
/7700 NW 25TH ST
/DORAL/US/33122
/EIN 30-1234567
AGT/CARGO AGENT SAS/BOG/12345678/00123456
SPH/EAP/PER
CVD/USD/PP
RTD/Q100K12.50
ACC/001/INVOICE 12345
OCI/CO/ISS/RA/00001-BOG/20JAN2026
LAST
```

---

## 4. Estructura de Mensajes FHL

### 4.1 Propósito

El FHL (Freight House List) acompaña al FWB en envíos consolidados, listando cada guía hija.

### 4.2 Segmentos

| Segmento | Descripción |
|----------|-------------|
| MBI | Master Bill Information (referencia al AWB master) |
| HBS | House Bill Summary (número, piezas, peso) |
| TXT | Text - Descripción de mercancía |
| SHP | Shipper del house |
| CNE | Consignee del house |
| OCI | Información aduanera del house |

### 4.3 Ejemplo FHL

```
FHL/5
MBI/145-12345678BOG/MIA
HBS/HAWB001/T25K400.0/ROSES RED
TXT/FRESH CUT ROSES, FREEDOM VARIETY
SHP
/FARM FLOWERS SAS
/VIA SIBERIA KM 5
/CHIA/CO
CNE
/FLOWER SHOP NYC
/100 BROADWAY
/NEW YORK/US
LAST
```

---

## 5. Políticas por Aerolínea

Cada aerolínea puede requerir diferentes segmentos. La configuración se basa en el **prefijo AWB** (3 dígitos).

### 5.1 Políticas Predefinidas

| Prefijo | Aerolínea | Segmentos Especiales |
|---------|-----------|---------------------|
| 145 | LATAM | Estándar + EAP |
| 075 | IBERIA | ECC, configuración EU |
| 985 | LATAM Cargo | Similar a 145 |
| DEFAULT | Otras | Todos los segmentos |

### 5.2 Personalización

Se pueden agregar o eliminar segmentos por aerolínea desde el panel de configuración o editando `cargoImpTypes.ts`.

---

## 6. Configuración de Segmentos

### 6.1 Toggle de Segmentos

El visor EDI permite habilitar/deshabilitar segmentos individualmente:

- ✅ Habilitado: El segmento aparece en el mensaje
- ❌ Deshabilitado: El segmento se omite

### 6.2 Segmentos Editables

Algunos segmentos permiten edición en tiempo real:
- SSR (Special Service Request)
- OSI (Other Service Information)
- ACC (Accounting Information)

### 6.3 Persistencia

Los cambios de segmentos son **efímeros por sesión**:
- Se resetean al cerrar el modal
- No persisten en localStorage
- Para cambios permanentes, editar las políticas por aerolínea

---

## 7. Integración con Backend

### 7.1 Flujo de Datos

```
Backend → JSON Shipment → Connector → EDI String → Clipboard/API
```

### 7.2 Esquema de Entrada (InternalShipment)

```typescript
{
  awbNumber: "145-12345678",
  origin: "BOG",
  destination: "MIA",
  pieces: 75,
  weight: 1250,
  weightUnit: "KILOGRAM",
  shipper: {
    name: "CONSOLIDADORA FLORES",
    address: { street: "CRA 45", place: "BOGOTA", countryCode: "CO" }
  },
  consignee: {
    name: "USA DISTRIBUTORS",
    address: { street: "7700 NW 25TH", place: "DORAL", countryCode: "US" }
  },
  agent: {
    name: "CARGO AGENT",
    iataCode: "12345678",
    place: "BOG"
  },
  flightSegments: [
    { flightNumber: "LA1234", departureDate: "2026-01-20" }
  ],
  description: "FLORES FRESCAS",
  hasHouses: true,
  houseBills: [
    { hawbNumber: "HAWB001", pieces: 25, weight: 400, natureOfGoods: "ROSES" },
    { hawbNumber: "HAWB002", pieces: 50, weight: 850, natureOfGoods: "CARNATIONS" }
  ]
}
```

### 7.3 Salida (EDI String)

El conector genera:
1. **FWB**: Un mensaje con datos del master
2. **FHL**: Un mensaje por cada house (si es consolidado)

Los mensajes se concatenan para copiar/enviar juntos.

---

## 📚 Referencias

- [IATA Cargo-IMP Manual](https://www.iata.org/en/publications/store/cargo-imp/)
- [IATA e-AWB Standards](https://www.iata.org/en/programs/cargo/e/e-awb/)
- [Cargo XML/JSON Messaging](https://www.iata.org/cargo-xml)
