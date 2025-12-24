# 📋 Referencia OCI (Other Customs, Security and Regulatory Control Information)

## Resumen de Validación vs Traxon cargoJSON API

Este documento resume las reglas de OCI según la documentación oficial de Traxon cargoJSON API.

---

## Estructura OCI en Traxon API

```typescript
interface OCI {
  isoCountryCode: string;                    // REQUERIDO - Código país ISO (ej: "CO", "US")
  informationIdentifier: string;             // REQUERIDO - DataElementGroupIdentifier enum
  controlInformation: string;                // REQUERIDO - CustomsSecurityAndRegulatoryControlInformationIdentifier enum
  additionalControlInformation?: string;     // OPCIONAL - Información adicional de control
  supplementaryControlInformation?: string;  // OPCIONAL - Información suplementaria (ej: número de registro)
}
```

---

## Enums Válidos

### `informationIdentifier` (DataElementGroupIdentifier)

| Valor | Descripción | Uso Común |
|-------|-------------|-----------|
| `ISS` | Issuer/Security Status | Estado de seguridad del envío |
| `AGT` | Agent | Información del agente |
| `ACC` | Account | Información de cuenta |
| `IMP` | Import | Datos de importación |
| `EXP` | Export | Datos de exportación |
| `TRA` | Transit | Información de tránsito |
| `SHP` | Shipper | Datos del embarcador |
| `CNE` | Consignee | Datos del consignatario |

### `controlInformation` (CustomsSecurityAndRegulatoryControlInformationIdentifier)

| Valor | Descripción |
|-------|-------------|
| `REGULATED_AGENT` | Agente regulado (RA) |
| `KNOWN_CONSIGNOR` | Consignatario conocido (KC) |
| `AUTHORISED_ECONOMIC_OPERATOR` | Operador económico autorizado (AEO) |
| `SCREENING_METHOD` | Método de screening aplicado |
| `SECURITY_STATUS` | Estado de seguridad (SPX, SHR, SCO, etc.) |
| `EXPIRY_DATE` | Fecha de expiración |
| `SEAL_NUMBER` | Número de sello |
| `MOVEMENT_REFERENCE_NUMBER` | Número de referencia de movimiento (MRN) |
| `TRADER_IDENTIFICATION_NUMBER` | Número de identificación tributaria (NIT/RUC) |
| `REGULATED_CARRIER` | Transportador regulado |
| `ACCOUNT_CONSIGNOR` | Consignatario de cuenta |

---

## Combinaciones Válidas (Casos de Uso)

### 1. Declarar Agente Regulado

```json
{
  "isoCountryCode": "CO",
  "informationIdentifier": "AGT",
  "controlInformation": "REGULATED_AGENT",
  "supplementaryControlInformation": "RA-CO-01234-567"
}
```

### 2. Estado de Seguridad SPX (Screened using X-ray)

```json
{
  "isoCountryCode": "US",
  "informationIdentifier": "ISS",
  "controlInformation": "SECURITY_STATUS",
  "additionalControlInformation": "SPX",
  "supplementaryControlInformation": "RA-CO-01234-567"
}
```

### 3. Número de Identificación Tributaria (NIT/RUC)

```json
{
  "isoCountryCode": "CO",
  "informationIdentifier": "SHP",
  "controlInformation": "TRADER_IDENTIFICATION_NUMBER",
  "supplementaryControlInformation": "901234567-1"
}
```

### 4. Consignatario Conocido

```json
{
  "isoCountryCode": "CO",
  "informationIdentifier": "CNE",
  "controlInformation": "KNOWN_CONSIGNOR",
  "supplementaryControlInformation": "KC-CO-98765"
}
```

---

## ⚠️ Combinaciones INCORRECTAS (Evitar)

| ❌ Incorrecto | ✅ Correcto | Razón |
|---------------|-------------|-------|
| `ISS` + `REGULATED_AGENT` | `ISS` + `SECURITY_STATUS` | ISS es para estado de seguridad, no para tipo de agente |
| `AGT` + `SECURITY_STATUS` | `AGT` + `REGULATED_AGENT` | AGT es para información del agente, no estado de seguridad |

---

## Códigos de Security Status (additionalControlInformation)

Cuando `controlInformation = "SECURITY_STATUS"`, el campo `additionalControlInformation` indica el método:

| Código | Descripción |
|--------|-------------|
| `SPX` | Screened using X-ray equipment |
| `SHR` | Secured for handling received |
| `SCO` | Secure consignment from originator |
| `STD` | Standard screening |
| `PHS` | Physical search |
| `VCK` | Visual check |
| `XRY` | X-ray screening |
| `EDS` | Explosive detection system |
| `ETD` | Explosive trace detection |
| `AOM` | Any other means |
| `CMD` | Canine method detection |

---

## Configuración por Defecto

La implementación incluye dos formatos para enviar TIN/EORI:

### Formato LEGACY (Recomendado para compatibilidad)

Usa `ISS` como informationIdentifier con `additionalControlInformation` indicando si es SHP o CNE:

```typescript
// Configuración
{
  tinOciFormat: 'legacy',
  includeShipperTIN: true,
  includeConsigneeTIN: true
}

// Resultado para Shipper
{
  "isoCountryCode": "CO",
  "informationIdentifier": "ISS",
  "controlInformation": "TRADER_IDENTIFICATION_NUMBER",
  "additionalControlInformation": "SHP/T/EORI",
  "supplementaryControlInformation": "901234567-1"
}

// Resultado para Consignee  
{
  "isoCountryCode": "NL",
  "informationIdentifier": "ISS",
  "controlInformation": "TRADER_IDENTIFICATION_NUMBER",
  "additionalControlInformation": "CNE/T/EORI",
  "supplementaryControlInformation": "NL123456789"
}
```

### Formato STANDARD

Usa `SHP` o `CNE` directamente como informationIdentifier:

```typescript
// Configuración
{
  tinOciFormat: 'standard',
  includeShipperTIN: true,
  includeConsigneeTIN: true
}

// Resultado para Shipper
{
  "isoCountryCode": "CO",
  "informationIdentifier": "SHP",
  "controlInformation": "TRADER_IDENTIFICATION_NUMBER",
  "supplementaryControlInformation": "901234567-1"
}

// Resultado para Consignee
{
  "isoCountryCode": "NL", 
  "informationIdentifier": "CNE",
  "controlInformation": "TRADER_IDENTIFICATION_NUMBER",
  "supplementaryControlInformation": "NL123456789"
}
```

### Patrones válidos de additionalControlInformation (Formato Legacy)

| Patrón | Descripción |
|--------|-------------|
| `SHP/T/EORI` | Shipper EORI/Tax ID |
| `CNE/T/EORI` | Consignee EORI/Tax ID |
| `SHP/T` | Shipper Tax ID (sin EORI) |
| `CNE/T` | Consignee Tax ID (sin EORI) |
| `SHP/EX` | Shipper Exporter number |
| `CNE/IM` | Consignee Importer number |

---

## Dónde se usa OCI

| Mensaje | Ubicación | Descripción |
|---------|-----------|-------------|
| **FWB** (Air Waybill) | Raíz del mensaje | `oci: [...]` |
| **FHL** (House Waybill) | Raíz del mensaje | `oci: [...]` |
| **CSL** (Consolidation List) | En cada `houseWaybillSummaries[]` | `houseWaybillSummaries[].oci: [...]` |

---

## Referencias

- Traxon cargoJSON API Specification v1.0
- IATA Cargo-XML Implementation Guide
- TSA/EU ACC3 Security Requirements
