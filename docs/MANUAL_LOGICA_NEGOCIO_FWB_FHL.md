# MANUAL DE LÓGICA DE NEGOCIO Y SINTAXIS — CargoIMP FWB / FHL

> **Versión del documento:** 2.0 — Febrero 2026  
> **Alcance:** FWB versiones 9–16 · FHL versiones 4–5  
> **Basado en:** IATA Cargo-IMP (CSC/12), IATA Resolution 600a, CIMP Handbook, Addendum A (FWB/FHL), Customs Regulatory Notices (PLACI/ACAS/ICS2/Pre-loading Advance Cargo Information), ACI Customs Guidance v1.11 (Dic 2025), e-AWB SOP (Rev 3, Jun 2016), DAKOSY ZAPP-Air FWB v1.6.1 (Nov 2023)

---

## TABLA DE CONTENIDOS

1. [Convenciones Generales](#1-convenciones-generales)
2. [Estructura del Mensaje FWB](#2-estructura-del-mensaje-fwb)
3. [Segmentos FWB — Detalle por Segmento](#3-segmentos-fwb--detalle-por-segmento)
   - 3.1 [AWB — Air Waybill Identification](#31-awb--air-waybill-identification)
   - 3.2 [FLT — Flight Bookings](#32-flt--flight-bookings)
   - 3.3 [RTG — Routing](#33-rtg--routing)
   - 3.4 [SHP — Shipper Details](#34-shp--shipper-name-and-address)
   - 3.5 [CNE — Consignee Details](#35-cne--consignee-name-and-address)
   - 3.6 [AGT — Agent Details](#36-agt--agent)
   - 3.7 [SSR — Special Service Request](#37-ssr--special-service-request)
   - 3.8 [NFY — Also Notify](#38-nfy--also-notify)
   - 3.9 [ACC — Accounting Information](#39-acc--accounting-information)
   - 3.10 [CVD — Charge Declarations](#310-cvd--charge-declarations-valuation)
   - 3.11 [RTD — Rate Description](#311-rtd--rate-description)
   - 3.12 [OTH — Other Charges](#312-oth--other-charges)
   - 3.13 [PPD/COL — Prepaid/Collect Charge Summary](#313-ppdcol--prepaidcollect-charge-summary)
   - 3.14 [ISU — Carrier Execution](#314-isu--carrier-execution)
   - 3.15 [OSI — Other Service Information](#315-osi--other-service-information)
   - 3.16 [CER — Shipper's Certification](#316-cer--shippers-certification)
   - 3.17 [REF — Reference Information (FWB v16+)](#317-ref--reference-information)
   - 3.18 [COR — Customs Origin (EU Transit / NCTS)](#318-cor--customs-origin-eu-transit--ncts)
   - 3.19 [OCI — Other Customs Information](#319-oci--other-customs-information)
   - 3.20 [TXT — Free Text / Nature of Goods Description](#320-txt--free-text--nature-of-goods-description)
4. [Estructura del Mensaje FHL](#4-estructura-del-mensaje-fhl)
   - 4.1 [MBI — Master Bill Identification (FHL)](#41-mbi--master-bill-identification)
   - 4.2 [HBS — House Bill Summary](#42-hbs--house-bill-summary)
   - 4.3 [TXT (FHL) — Nature of Goods (House Level)](#43-txt-fhl--nature-of-goods-house-level)
   - 4.4 [SHP/CNE (FHL) — House-Level Addresses](#44-shpcne-fhl--house-level-addresses)
   - 4.5 [OCI (FHL) — House-Level Customs Data](#45-oci-fhl--house-level-customs-data)
5. [Validación Aduanera Detallada — OCI & TXT](#5-validación-aduanera-detallada--oci--txt)
   - 5.1 [ACAS / Pre-Loading (USA)](#51-acas--pre-loading-usa)
   - 5.2 [ICS2 / Europa](#52-ics2--europa)
   - 5.3 [China — Requisitos de Enterprise Code](#53-china--requisitos-de-enterprise-code)
   - 5.4 [Egipto — ACID Number (Nafeza)](#54-egipto--acid-number-sistema-nafeza--aci)
   - 5.5 [Indonesia — TIN/NPWP](#55-indonesia--tinnpwp)
   - 5.6 [EAU — PLACI (UAE NAIC)](#56-emiratos-árabes-unidos--placi-uae-naic)
   - 5.7 [Bangladesh — BIN y DCV](#57-bangladesh--bin-y-declared-customs-value)
   - 5.8 [Arabia Saudita — ZATCA](#58-arabia-saudita--zatca)
   - 5.9 [Marruecos — Trade Register + HS](#59-marruecos--trade-register--hs-code)
   - 5.10 [Turquía — HS Code](#510-turquía--hs-code)
   - 5.11 [Jordania — Teléfono CNE](#511-jordania--teléfono-del-consignee)
   - 5.12 [Sri Lanka — DCV](#512-sri-lanka--declared-customs-value)
   - 5.13 [Kenia — PIN, HS, COU](#513-kenia--pin-hs-code-cou)
   - 5.14 [Canadá — Descripción CBSA](#514-canadá--descripción-detallada-cbsa)
   - 5.15 [Alemania — FRA-OS](#515-alemania--fra-os-import-platform-frankfurt)
   - 5.16 [Otros Países](#516-otros-países-con-requisitos-especiales)
6. [Descripciones de Carga: Términos Válidos vs Inválidos](#6-descripciones-de-carga-términos-válidos-vs-inválidos)
7. [Códigos de Error FNA/PER por Segmento](#7-códigos-de-error-fnaper-por-segmento)
8. [Tablas Comparativas de Requisitos Aduaneros](#8-tablas-comparativas-de-requisitos-aduaneros)
9. [Apéndice: Formato de Caracteres y Separadores](#9-apéndice-formato-de-caracteres-y-separadores)
   - 9.5 [Escenario Completo de Consolidación Multi-País](#95-escenario-completo-de-consolidación-multi-país--fwb-master--fhl-con-4-houses)

---

## 1. CONVENCIONES GENERALES

### 1.1 Tipos de Caracteres (IATA Cargo-IMP)

| Código | Nombre | Caracteres Permitidos |
|--------|--------|----------------------|
| **a** | Alphabetic | `A-Z` (mayúsculas), espacio |
| **n** | Numeric | `0-9` |
| **an** | Alphanumeric | `A-Z`, `0-9`, espacio |
| **m** | Mixed (texto libre) | `A-Z`, `0-9`, espacio, `.` `-` `/` `,` `(` `)` `'` `+` `:` `=` `?` `!` `"` `%` `&` `*` `;` `<` `>` `#` `@` |
| **t** | Telecom chars | Subconjunto permitido en redes SITA/AFTN: `A-Z`, `0-9`, espacio, `.` `-` `/` |

> **ADVERTENCIA:** Caracteres fuera de la tabla `t` en campos transmitidos por teletipo serán truncados o causarán rechazo. Los caracteres `ñ`, `ü`, `á`, `ç` y similares NO son válidos en ningún campo.

### 1.2 Separadores y Delimitadores

| Separador | Uso |
|-----------|-----|
| `/` (slash) | Separador de sub-campos dentro de una línea |
| `-` (hyphen) | Separador secundario (ej: peso-código de tarifa) |
| `CRLF` (Carriage Return + Line Feed) | Fin de línea lógica |
| Línea en blanco (`CRLF CRLF`) | Separador de segmentos en algunos contextos |

### 1.3 Estructura del Identificador de Línea

Cada línea del mensaje comienza con un **Line Identifier** de 3 caracteres:
```
<SegmentID><LineNumber>
```
Ejemplo: `SHP1` = Segment SHP, línea 1.

### 1.4 Longitud Máxima de Línea

| Contexto | Máximo |
|----------|--------|
| Teletipo (Type-B) | **69 caracteres** por línea (sin contar CRLF) |
| Cargo-IMP digital | **65 caracteres** recomendado; **70 caracteres** máximo |
| Campos individuales | Según especificación de cada campo |

> **REGLA CRÍTICA:** Líneas que exceden 69-70 caracteres serán **cortadas sin aviso** por gateways de teletipo, corrompiendo datos downstream.

### 1.5 Versiones del Protocolo

| Mensaje | Versiones Cubiertas | Identificador de Versión |
|---------|---------------------|--------------------------|
| FWB | 9, 10, 11, 12, 13, 14, 15, **16** (actual) | Primera línea: `FWB/XX` (ej: `FWB/16`) |
| FHL | 4, **5** (actual) | Primera línea: `FHL/X` (ej: `FHL/5`) |

---

## 2. ESTRUCTURA DEL MENSAJE FWB

### 2.1 Orden de Segmentos (FWB v16)

```
FWB/16                           ← Versión de mensaje
AWB (obligatorio)                ← Identificación AWB
FLT (opcional)                   ← Información de vuelo
RTG (obligatorio)                ← Enrutamiento
SHP (obligatorio)                ← Shipper
CNE (obligatorio)                ← Consignee
AGT (opcional)                   ← Agente
SSR (opcional, repetible)        ← Servicios especiales
NFY (opcional)                   ← Notificación
ACC (opcional, repetible)        ← Contabilidad
CVD (obligatorio)                ← Declaración de cargos
RTD (obligatorio, repetible)     ← Descripción de tarifa
OTH (opcional)                   ← Otros cargos
PPD (condicional)                ← Resumen prepago
COL (condicional)                ← Resumen collect
CER (condicional)                ← Certificación DG
ISU (obligatorio)                ← Ejecución del transportista
OSI (opcional, repetible)        ← Otra información
REF (opcional - v15/16)          ← Referencias
COR (condicional)                ← Customs origin (EU transit)
OCI (condicional, repetible)     ← Info aduanera
TXT (opcional, repetible)        ← Texto libre / descripción
```

### 2.2 Obligatoriedad de Segmentos por Versión

| Segmento | v9-11 | v12-14 | v15 | v16 |
|----------|-------|--------|-----|-----|
| AWB | M | M | M | M |
| FLT | O | O | O | O |
| RTG | M | M | M | M |
| SHP | M | M | M | M |
| CNE | M | M | M | M |
| AGT | O | O | O | O |
| SSR | O | O | O | O |
| NFY | O | O | O | O |
| ACC | O | O | O | O |
| CVD | M | M | M | M |
| RTD | M | M | M | M |
| OTH | O | O | O | O |
| PPD | C | C | C | C |
| COL | C | C | C | C |
| CER | C | C | C | C |
| ISU | M | M | M | M |
| OSI | O | O | O | O |
| REF | — | — | O | O |
| COR | C | C | C | C |
| OCI | — | C | C | C |
| TXT | O | O | O | O |

> **M** = Mandatory · **O** = Optional · **C** = Conditional · **—** = No disponible en esa versión

---

## 3. SEGMENTOS FWB — DETALLE POR SEGMENTO

---

### 3.1 AWB — Air Waybill Identification

**Lógica General:** Identifica de forma única el envío. El prefijo de 3 dígitos corresponde al código numérico IATA de la aerolínea, seguido de un número de guía de 8 dígitos.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Airline Prefix | n3 | 3 | Código numérico IATA de la aerolínea |
| 1 | AWB Serial Number | n8 | 8 | Número de serie (incluye dígito de control) |
| 1 | Origin | a3 | 3 | Código IATA del aeropuerto de origen |
| 1 | Destination | a3 | 3 | Código IATA del aeropuerto de destino |
| 1 | Quantity (Shipment Description Code) | a1 | 1 | `T` = Total, `S` = Split/Part |
| 1 | Number of Pieces | n1-4 | 1-4 | Número total de piezas |
| 1 | Weight Code | a1 | 1 | `K` = Kilogramos, `L` = Libras |
| 1 | Weight | n1-7[.n] | 1-8 | Peso bruto (con decimales opcionales) |
| 1 | Volume Code (opcional) | a2 | 2 | `MC` = m³, `CF` = ft³ |
| 1 | Volume Amount (opcional) | n1-9[.n] | 1-11 | Volumen |

**Sintaxis:**
```
AWB/<prefix>-<serial><origin><destination><sdcode><pieces><wcode><weight>[<vcode><volume>]
```
**Ejemplo:**
```
AWB/020-12345675JFKLHRT15K1250.5MC2.5
```

**Reglas Críticas:**
- El dígito de control (posición 8 del serial) debe ser el **módulo-7** de los primeros 7 dígitos.
- Origin y Destination deben ser códigos IATA válidos de aeropuerto (3 letras).
- El campo `T/S` debe coincidir con la información de split shipment (/PART) si aplica.

**Alertas de Rechazo:**
- `AWB0001`: Prefijo de aerolínea no registrado en IATA.
- `AWB0005`: Dígito de control inválido.
- `AWB0010`: Código de aeropuerto de origen o destino no válido.
- `AWB0015`: Peso declarado = 0 o negativo.

---

### 3.2 FLT — Flight Bookings

**Lógica General:** Contiene la información de los vuelos reservados para el transporte de la carga. Opcional pero altamente recomendado para ACAS/PLACI.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Carrier Code | an2-3 | 2-3 | Código IATA/ICAO de la aerolínea operadora |
| 1 | Flight Number | an3-5 | 3-5 | Número de vuelo |
| 1 | Day | n2 | 2 | Día de salida (01-31) |
| 1 | Month (v15+) | a3 | 3 | Mes en formato `JAN`, `FEB`… (opcional en v<15) |

**Sintaxis:**
```
FLT/<carriercode><flightnumber>/<day>[<month>]
```
**Ejemplo:**
```
FLT/BA0175/15JAN
```

**Reglas Críticas:**
- Para vuelos múltiples (transbordos), se repiten líneas FLT separadas por CRLF.
- Si se incluye FLT, debe existir coherencia con RTG (los carrier codes deben coincidir).

---

### 3.3 RTG — Routing

**Lógica General:** Define la ruta completa del envío desde origen hasta destino, con puntos intermedios de transbordo y aerolíneas responsables de cada tramo.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Destination Airport | a3 | 3 | Código IATA del aeropuerto (primer punto) |
| 1 | Carrier Code | an2-3 | 2-3 | Aerolínea del tramo |
| 1+ | Onward Destination | a3 | 3 | Siguiente punto de ruta (repetible) |
| 1+ | Onward Carrier | an2-3 | 2-3 | Aerolínea del tramo siguiente |

**Sintaxis:**
```
RTG/<destination1><carrier1>[/<destination2><carrier2>]...
```
**Ejemplo:**
```
RTG/FRABA/LHRBA
```
(JFK → FRA vía BA, FRA → LHR vía BA)

**Reglas Críticas:**
- El **último** destino del RTG debe coincidir con el destino del AWB.
- Máximo **2 puntos de transbordo** (3 tramos) en la mayoría de sistemas.
- Cada código de aerolínea debe ser un participante registrado IATA/ICAO.

---

### 3.4 SHP — Shipper Name and Address

**Lógica General:** Contiene el nombre y dirección completa del expedidor (shipper/consignor). Es fundamental para cumplimiento aduanero y trazabilidad. Obligatorio en todas las versiones.

**Campos y Formato:**

| Línea | Identificador | Campo | Formato | Long. Máx | Descripción |
|-------|--------------|-------|---------|-----------|-------------|
| 1 | `SHP` | Shipper Name | m | **35** char | Nombre legal completo del shipper |
| 2 | (continuación) | Street Address | m | **35** char | Dirección línea 1 |
| 3 | (continuación) | Street Address 2 | m | **35** char | Dirección línea 2 (opcional) |
| 4 | (continuación) | City/Place | m | **17** char | Ciudad o localidad |
| 4 | (continuación) | State/Province | an | **9** char | Obligatorio para US (2 char), CA (2 char), AU (2-3 char). Campo soporta hasta 9 chars. |
| 5 | (continuación) | Postal/ZIP Code | an | **9** char | Código postal |
| 6 | (continuación) | Country Code | a2 | **2** char | Código ISO 3166-1 alpha-2 |
| 7 | (continuación) | Contact Identifier | a | **2-3** char | Tipo de contacto: `TE` (teléfono), `FX` (fax), `TL` (télex) — Campo separado del número |
| 7 | (continuación) | Contact Number | m | **25** char | Número de contacto |

**Sintaxis (FWB v16):**
```
SHP
/NM<name>
/AD<street_address>
/AD<street_address_line2>
/CI<city>/<state_province>
/PO<postal_code>
/CO<country_code>
/CT<contact_type><contact_number>
```

**Ejemplo:**
```
SHP
/NMSUN ELECTRONICS CO LTD
/AD288 NANJING ROAD BUILDING A
/ADFLOOR 12 UNIT 1205
/CISHANGHAI
/PO200001
/COCN
/CTTE021-5888-1234
```

**Reglas Críticas por País/Aerolínea:**

| País/Región | Requisito | Campo Afectado | Referencia |
|-------------|-----------|----------------|------------|
| **China (CN)** | Enterprise Code (USCI) **obligatorio** como "Tax/VAT Number" | OCI o campo específico carrier | CAAC Regulation 2019 |
| **China (CN)** | Teléfono del shipper **obligatorio** | SHP /CT línea | CAAC Customs Notice |
| **USA** | Nombre completo (no abreviaturas genéricas) | SHP /NM | TSA ACAS Rule |
| **USA** | State/Province code (2 char USPS) **obligatorio** | SHP línea 4 | CBP |
| **Canadá** | Province code (2 char) **obligatorio** | SHP línea 4 | CBSA |
| **Australia (AU)** | State/Territory code (2-3 char, ej: `NSW`, `VIC`, `QLD`) **obligatorio** | SHP línea 4 | ABF |
| **USA / Canadá** | Código Postal (ZIP/Postal Code) **obligatorio** | SHP /PO | CBP Regulation |
| **Alemania (DE)** | Código Postal (PLZ) **obligatorio** | SHP /PO | Zoll/ICS2 |
| **UE (ICS2)** | EORI Number del shipper si es operador económico | OCI (no SHP directo) | EU Reg. 2019/1583 |
| **Indonesia (ID)** | TIN/NPWP del shipper | OCI línea + SHP | DJBC Regulation |
| **India (IN)** | IEC (Import Export Code) del shipper | OCI | CBIC |
| **Brasil (BR)** | CNPJ o CPF obligatorio | OCI | Receita Federal |

**Cuándo está MAL (Alertas de Rechazo):**

| Error Code | Descripción | Causa |
|------------|-------------|-------|
| `SHP0010` | Nombre del shipper vacío o genérico | Nombre = "SHIPPER" o en blanco |
| `SHP0015` | Dirección incompleta | Falta línea de calle |
| `SHP0020` | Ciudad excede 17 caracteres | Nombre de ciudad demasiado largo |
| `SHP0025` | Código de país inválido | No es ISO 3166-1 alpha-2 |
| `SHP0030` | Estado/Provincia faltante para US/CA | Destino US/CA sin state code |
| `SHP0035` | Código postal faltante (destino mandatorio) | ZIP requerido pero ausente |
| `SHP0040` | Caracteres no permitidos | Uso de `ñ`, `ü`, `#`, `@` en campo tipo `t` |
| `SHP0045` | Teléfono faltante (destino CN) | Envío a China sin /CT |
| `SHP0050` | Línea excede longitud máxima | > 35 char en campo o > 69 char en línea total |

---

### 3.5 CNE — Consignee Name and Address

**Lógica General:** Contiene el nombre y dirección completa del consignatario (receptor de la carga). Estructura idéntica a SHP pero con identificador `CNE`. Es el campo más escrutado por aduanas de destino.

**Campos y Formato:**

| Línea | Identificador | Campo | Formato | Long. Máx | Descripción |
|-------|--------------|-------|---------|-----------|-------------|
| 1 | `CNE` | Consignee Name | m | **35** char | Nombre legal completo |
| 2 | | Street Address | m | **35** char | Dirección |
| 3 | | Street Address 2 | m | **35** char | Dirección línea 2 (opcional) |
| 4 | | City/Place | m | **17** char | Ciudad |
| 4 | | State/Province | an | **9** char | Obligatorio para US (2), CA (2), AU (2-3). Campo soporta hasta 9 chars |
| 5 | | Postal/ZIP Code | an | **9** char | Código postal |
| 6 | | Country Code | a2 | **2** char | ISO 3166-1 alpha-2 |
| 7 | | Contact Detail | m | **variado** | Tipo + número de contacto |

**Sintaxis (FWB v16):**
```
CNE
/NM<name>
/AD<street_address>
/CI<city>/<state_province>
/PO<postal_code>
/CO<country_code>
/CT<contact_type><contact_number>
```

**Ejemplo:**
```
CNE
/NMAMERICAN AUTO PARTS INC
/AD1500 INDUSTRIAL BOULEVARD
/ADWAREHOUSE B DOCK 7
/CILOS ANGELES/CA
/PO90015
/COUS
/CTTE1-310-555-0199
```

**Reglas Críticas por País/Aerolínea:**

| País/Región | Requisito | Detalle |
|-------------|-----------|---------|
| **USA** | Nombre, dirección, ciudad, state, ZIP **todos obligatorios** | ACAS 7+1 pre-loading elements |
| **USA** | ZIP code debe ser **5 dígitos** o **5+4** (ZIP+4) | Formato: `nnnnn` o `nnnnn-nnnn` |
| **Canadá** | Postal Code formato `A1A 1A1` | Con espacio intermedio |
| **China (CN)** | Enterprise Code del consignee obligatorio | USCI en OCI |
| **China (CN)** | Teléfono del consignee obligatorio | /CT en CNE |
| **Alemania (DE)** | PLZ (5 dígitos) obligatorio | Rechazo si falta |
| **Japón (JP)** | ZIP (`nnn-nnnn`) obligatorio para AMS-JP | NACCS |
| **Corea del Sur (KR)** | Customs ID del consignee | En línea OCI |
| **Australia (AU)** | ABN (Australian Business Number) | En OCI |
| **India (IN)** | IEC + GSTIN del consignee | En OCI |
| **México (MX)** | RFC del consignee | En OCI |

**Cuándo está MAL (Alertas de Rechazo):**

| Error Code | Descripción | Causa |
|------------|-------------|-------|
| `CNE0010` | Nombre de consignee vacío | Campo /NM en blanco |
| `CNE0015` | Dirección incompleta o genérica | "TO ORDER" sin datos reales (rechazado ACAS) |
| `CNE0020` | Ciudad vacía o excede 17 char | |
| `CNE0025` | Código de país inválido o faltante | |
| `CNE0030` | State code faltante para US/CA | |
| `CNE0035` | ZIP/Postal Code formato incorrecto | US: no es 5 o 9 dígitos; CA: no es `A1A 1A1` |
| `CNE0040` | Consignee = "TO ORDER" sin detalles | Prohibido bajo ACAS/ICS2 sin notify party |
| `CNE0045` | **Código postal inválido** para USA/Canadá | ZIP que no existe en base de datos USPS/CPC |
| `CNE0050` | Teléfono faltante (destino CN) | Envío a China sin contacto |
| `CNE0055` | Caracteres especiales no permitidos | `#`, `@`, `&`, etc. en campo tipo `t` |

---

### 3.6 AGT — Agent

**Lógica General:** Identifica al agente IATA que emite o gestiona el AWB. Incluye el IATA Cargo Agent Code y opcionalmente nombre, ciudad y datos de cuenta.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Agent Name | m | 35 | Nombre del agente |
| 2 | Agent City | m | 17 | Ciudad |
| 3 | Agent IATA Code | n | 7 | Código numérico IATA del agente (7 dígitos) |
| 3 | Agent CASS Address | n | 4 | Dirección CASS del agente (4 dígitos). Total: 11 dígitos (7+4) |
| 4 | Account Number | an | 14 | Número de cuenta del agente con la aerolínea |

**Sintaxis:**
```
AGT
/NM<agent_name>
/CI<city>
/IA<iata_code><cass_address>
/AC<account_number>
```
**Ejemplo:**
```
AGT
/NMDRAGON LOGISTICS CO LTD
/CISHANGHAI
/IA88880001
```

**Reglas Críticas:**
- Si el AWB es emitido por un agente (no directo aerolínea), el segmento AGT es fuertemente recomendado.
- El IATA Code (7 dígitos) + CASS Address (4 dígitos) = **11 dígitos consecutivos** sin separador. Ejemplo: `88880001` = IATA `8888` + CASS `0001`.
- El IATA Code debe corresponder a un agente CASS activo registrado.
- Para envíos ACAS, el Known Shipper status puede validarse contra el AGT code.

---

### 3.7 SSR — Special Service Request / Special Handling Codes (SPH)

**Lógica General:** Contiene códigos de manejo especial siguiendo la nomenclatura estándar IATA de Special Handling Codes (SPH) según IATA TACT Rules, Appendix H y Cargo-IMP CSC/12.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | SSR Code | a3 | 3 | Código de servicio especial IATA (SPH Code) |
| 1 | Free Text | m | 65 | Texto libre descriptivo (opcional) |

> **Nota:** Pueden incluirse **múltiples líneas SSR** en un mismo mensaje FWB. Cada código SPH relevante genera una línea SSR independiente.

#### 3.7.1 Códigos SPH Obligatorios (IATA Resolution 606 / e-AWB)

Estos códigos **deben estar presentes** cuando aplican. Su omisión genera rechazo o alerta.

| Código | Significado | Cuándo es Obligatorio |
|--------|-------------|----------------------|
| `EAP` | e-AWB Associated Paperwork | Cuando existen documentos en papel vinculados al e-AWB (Original MAWB físico acompaña) |
| `EAW` | e-AWB (Electronic Air Waybill) | Cuando el AWB es electrónico. **Obligatorio desde 2012 para aerolíneas en e-AWB multilateral agreement** |
| `ECC` | Electronic Credit Card Shipment | Para envíos pagados por tarjeta de crédito electrónica |
| `ECP` | e-AWB with Customs Paper | Cuando se adjunta documentación aduanera física aunque el AWB sea electrónico |

#### 3.7.2 Códigos de Mercancías Peligrosas (DG)

| Código | Significado | Implicación |
|--------|-------------|-------------|
| `DGR` | Dangerous Goods as per IATA DGR | Requiere Shipper's Declaration for DG + CER obligatorio |
| `CAO` | Cargo Aircraft Only | DG que solo puede viajar en avión carguero |
| `ICE` | Dry Ice (UN 1845) | Declarar peso del hielo seco en RTD o SSR |
| `RCL` | Cargo Containing Dry Ice (used as refrigerant) | Requiere indicación del peso en kg |
| `MAG` | Magnetized Material | Requiere medición de campo magnético a 4.6m |
| `RCM` | Cargo Containing Radioactive Material (excepted packages) | Clase 7, excepted packages |
| `RAD` | Radioactive Cargo | Clase 7, requiere documentación extrema |
| `EXP` | Explosives (Class 1) | Clase 1 — permisos gubernamentales |
| `RCX` | Cargo Containing Explosives (Division 1.3C, 1.3G, 1.4B, 1.4C, 1.4S) | |
| `COR` | Corrosive Substances | Clase 8 |
| `FLM` | Flammable Liquid or Solid | Clases 3, 4.1, 4.2, 4.3 |
| `OXY` | Oxidizing Substances / Organic Peroxides | Clases 5.1, 5.2 |
| `POS` | Poisonous/Toxic Substances | Clase 6.1, 6.2 |
| `RPB` | Packaging of Radioactive Material - Type B(U), B(M), Type C | Aprobación de diseño requerida |
| `RRW` | Radioactive Material - White Label (Category I) | |
| `RRY` | Radioactive Material - Yellow Label (Categories II & III) | |

#### 3.7.3 Códigos de Baterías de Litio (IATA DGR Section II / Packing Instructions)

> **OBLIGATORIO** incluir el texto completo del lithium battery handling label en SSR o TXT cuando aplique.

| Código | Significado | Packing Instruction | UN Number |
|--------|-------------|---------------------|-----------|
| `ELI` | Lithium Ion Batteries (standalone) — PI 965 Sect. II | PI 965 Sect. II | UN 3481 |
| `ELM` | Lithium Ion Batteries packed with equipment — PI 966 Sect. II | PI 966 Sect. II | UN 3481 |
| `RLI` | Lithium Metal Batteries (standalone) — PI 968 Sect. II | PI 968 Sect. II | UN 3090 |
| `RLM` | Lithium Metal Batteries packed with equipment — PI 969 Sect. II | PI 969 Sect. II | UN 3090 |
| `RBI` | Lithium Ion Batteries Packed in equipment — PI 967 Sect. II | PI 967 Sect. II | UN 3481 |
| `RBM` | Lithium Metal Batteries Packed in equipment — PI 970 Sect. II | PI 970 Sect. II | UN 3090 |

**Textos Obligatorios para Baterías de Litio (SSR o TXT):**
```
SSR/ELI/LITHIUM ION BATTERIES IN COMPLIANCE WITH SECTION II OF PI965
SSR/ELM/LITHIUM ION BATTERIES IN COMPLIANCE WITH SECTION II OF PI966
SSR/RLI/LITHIUM METAL BATTERIES IN COMPLIANCE WITH SECTION II OF PI968
SSR/RLM/LITHIUM METAL BATTERIES IN COMPLIANCE WITH SECTION II OF PI969
```

> **Regla Packing Instructions:** Section I = full DG → usar `DGR` + Shipper's DG Declaration. Section II = excepted quantity → usar los códigos `ELI/ELM/RLI/RLM/RBI/RBM` sin DG Declaration, pero **con la frase obligatoria**.

#### 3.7.4 Códigos de Screening / Seguridad (RA3 / ACAS / ACC3)

| Código | Significado | Implicación |
|--------|-------------|-------------|
| `SPX` | Screened for Passenger and All-cargo aircraft (secure method applied) | Nivel más alto — puede viajar en PAX y CGO |
| `SCO` | Screened for Cargo-Only aircraft | Solo para avión carguero |
| `SHR` | Short-shipped — Piece not loaded | Pieza no cargada; alerta operacional |
| `NSC` | Not Screened — screening required before loading | Pre-loading screening pendiente |

#### 3.7.5 Códigos de Temperatura y Perecederos

| Código | Significado | Implicación |
|--------|-------------|-------------|
| `PER` | Perishable | Cadena de frío requerida |
| `COL` | Cool Goods — Temperature controlled (+2°C to +8°C) | Rango farmacéutico |
| `FRO` | Frozen Goods — Temperature controlled (below -18°C) | Alimentos congelados |
| `EAT` | Foodstuffs | Requisitos sanitarios, certificados fitosanitarios |
| `PIL` | Pharmaceuticals | Control de temperatura, GDP compliance |
| `FRI` | Frozen — Temperature controlled (-15°C to -25°C) | Productos biológicos, muestras |

#### 3.7.6 Códigos de Animales Vivos y Restos Humanos

| Código | Significado | Implicación |
|--------|-------------|-------------|
| `AVI` | Live Animals | Requiere AVIH / certificado veterinario / IATA LAR |
| `LHO` | Live Human Organs for Transplant | Prioridad extrema, cadena de frío |
| `HUM` | Human Remains | Protocolos especiales, documentación consular |
| `HEG` | Hatching Eggs | Manejo delicado, temperatura |

#### 3.7.7 Códigos de Carga Especial y Alta Valor

| Código | Significado | Implicación |
|--------|-------------|-------------|
| `VAL` | Valuable Cargo | Seguridad reforzada, custodia |
| `VUN` | Vulnerable Cargo (high risk of pilferage) | Seguridad adicional en handling |
| `HEA` | Heavy (single piece >150 Kg) | Equipo especial de carga/descarga |
| `BIG` | Oversized / Big piece | Dimensiones fuera de estándar ULD |
| `VOL` | Volume / Bulky cargo | Vol. weight > actual weight por margen significativo |
| `GOV` | Government Shipment | Prioridad, protocolos gubernamentales |
| `SHL` | Save Human Life | Prioridad máxima absoluta |
| `DIP` | Diplomatic Cargo | Inmunidad de inspección (Convención de Viena) |
| `WAR` | Weapons and Ammunition (government authorized) | Permisos militares estrictos |
| `MUW` | Munitions of War | Requiere autorización gubernamental |

#### 3.7.8 Códigos de Consolidación y Handling

| Código | Significado | Implicación |
|--------|-------------|-------------|
| `BUP` | Bulk Unitized (shipper-built ULD) | ULD construido por el expedidor; no se abre en tránsito |
| `COU` | Courier Shipment | Sujeto a regulaciones de courier express |
| `SFL` | Shipment on Floor-loaded (non-containerized) | Carga suelta (loose) |
| `RRE` | Re-entry / Return of Goods | Mercancía de retorno |
| `ATT` | Attendant accompanying shipment | Un acompañante viaja con la carga |
| `OBX` | Obnoxious Cargo (strong smell) | Requiere aislamiento de otra carga |
| `WET` | Cargo that may emit liquid | Protección contra goteo |

#### 3.7.9 Otros Códigos Frecuentes

| Código | Significado | Implicación |
|--------|-------------|-------------|
| `ATA` | ATA Carnet | Admisión temporal sin pago de aranceles |
| `AOG` | Aircraft on Ground | Repuestos urgentes para aeronave inoperativa — prioridad alta |
| `PEF` | Protected Endangered Species (CITES Flora) | Convenio CITES — documentación requerida |
| `PEA` | Protected Endangered Species (CITES Fauna) | Convenio CITES — documentación requerida |
| `HEG` | Hatching Eggs | Manejo especial |
| `SWP` | Sawn/Treated Wood Products | Certificado fitosanitario |
| `OHG` | Over Height (over 160 cm) | Limitación en bodega |
| `OWG` | Over Width (oversize lateral) | Limitación en bodega |
| `REQ` | Request for Specific Space | Reserva de espacio especial |

**Sintaxis:**
```
SSR/<code>[/<free_text>]
```
**Ejemplos:**
```
SSR/DGR
SSR/PER/MAINTAIN BETWEEN 2 AND 8 DEGREES CELSIUS
SSR/EAW
SSR/ELI/LITHIUM ION BATTERIES IN COMPLIANCE WITH SECTION II OF PI965
SSR/BUP/SHIPPER BUILT ULD - DO NOT BREAK DOWN IN TRANSIT
SSR/HEA/SINGLE PIECE 480KG REQUIRES FORKLIFT HANDLING
SSR/SPX
SSR/COU
```

**Reglas Críticas:**
- Si `SSR/DGR` está presente, **CER** (Shipper's Certification) se vuelve **obligatorio**.
- El código `DGR` exige secciones especiales en RTD describiendo clase UN, Packing Group, etc.
- `EAW` es **obligatorio** para todas las aerolíneas participantes del IATA Multilateral e-AWB Agreement (desde 2012).
- `EAP` es obligatorio cuando hay documentos en papel que acompañan un e-AWB.
- Los códigos de litio (`ELI/ELM/RLI/RLM`) requieren el **texto completo de compliance** en SSR o TXT. Sin el texto, la carga será rechazada.
- `BUP` implica que la aerolínea no puede inspeccionar el contenido del ULD (shipper-built). El peso y manifiesto del shipper se acepta "as declared".
- `SPX/SCO` son indicadores de screening usados también en OCI con el Customs ID `SD`.

---

### 3.8 NFY — Also Notify

**Lógica General:** Identifica a un tercero que debe ser notificado a la llegada de la carga. Estructura similar a SHP/CNE.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Notify Party Name | m | 35 | Nombre |
| 2 | Address | m | 35 | Dirección |
| 3 | City | m | 17 | Ciudad |
| 4 | Postal Code | an | 9 | Código postal |
| 5 | Country Code | a2 | 2 | ISO 3166-1 alpha-2 |
| 6 | Contact | m | 25 | Teléfono/fax |

**Reglas Críticas:**
- Cuando el consignee es "TO ORDER" (envíos en tránsito), el NFY pasa a ser **de facto obligatorio** para muchas aduanas.
- Para ACAS, si CNE está incompleto, NFY puede complementar la información requerida.

---

### 3.9 ACC — Accounting Information

**Lógica General:** Información contable complementaria. Puede incluir identificadores de factura, referencias de pago, GEN (General) information, o códigos de comisión de agente.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Information Identifier | a3 | 3 | `GEN` (general), `MCO` (miscellaneous charge order), etc. |
| 1+ | Accounting Details | m | variado | Texto libre contable |

**Sintaxis:**
```
ACC/<identifier>/<details>
```
**Ejemplo:**
```
ACC/GEN/INVOICE 2026-00145
ACC/GEN/LC NUMBER HSBC-88712345
```

---

### 3.10 CVD — Charge Declarations (Valuation)

**Lógica General:** Declaración del expedidor sobre cómo se pagarán los cargos. Define si el envío es **Prepaid (PP)** o **Collect (CC)** y el valor declarado para transporte y aduana.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Origin Currency | a3 | 3 | Código ISO 4217 (ej: `USD`, `EUR`, `CNY`) |
| 1 | Charge Code | a2 | 2 | `PP` (Prepaid), `CC` (Collect) |
| 1 | Weight/Valuation Charge PP/CC | a2 | 2 | Prepago de cargos por peso |
| 1 | Other Charges PP/CC | a2 | 2 | Prepago de otros cargos |
| 2 | Declared Value for Carriage | an | 12 | Valor declarado transporte (`NVD` = No Value Declared) |
| 2 | Declared Value for Customs | an | 12 | Valor declarado aduana (`NCV` = No Customs Value) |
| 3 | Amount of Insurance | an | 12 | Valor del seguro (`XXX` = No Insurance) |

**Sintaxis:**
```
CVD/<currency><chg_code><wv_pp_cc><oth_pp_cc>/<declared_carriage>/<declared_customs>/<insurance>
```
**Ejemplo:**
```
CVD/USDPPPP/NVD/NCV/XXX
CVD/EURCCCC/50000.00/75000.00/XXX
```

**Reglas Críticas:**
- `PP` y `CC` son mutuamente excluyentes para cada categoría de cargo.
- Si Declared Value for Carriage ≠ `NVD`, se aplica recargo de valoración en RTD.
- Si `CC`, debe existir un segmento `COL` con totales.
- Si `PP`, debe existir un segmento `PPD` con totales.

**Alertas de Rechazo:**

| Error Code | Descripción |
|------------|-------------|
| `CVD0010` | Código de moneda no válido (no ISO 4217) |
| `CVD0015` | Charge code no es PP ni CC |
| `CVD0020` | Valor declarado negativo o formato inválido |

---

### 3.11 RTD — Rate Description

**Lógica General:** Describe los ítems del envío con su clasificación tarifaria, peso cobrable, tarifa aplicada y cargos resultantes. Pueden existir múltiples grupos RTD para envíos mixtos. Es el segmento más complejo.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Number of Pieces (Rate Line) | n1-4 | 1-4 | Piezas en esta línea tarifaria |
| 1 | Gross Weight (Rate Line) | n1-7.n | 1-8 | Peso bruto para esta línea |
| 1 | Rate Class | a1 | 1 | `M` (minimum), `N` (normal), `Q` (quantity), `C` (specific commodity), `R` (class rate / reduction), `S` (surcharge), `U` (unit load device), `B` (basic), `K` (rate per kg), `E` (specific rate code) |
| 1 | Commodity Item Number | an | 7 | Código de tarifa IATA TACT |
| 1 | Chargeable Weight | n1-7.n | 1-8 | Peso cobrable |
| 1 | Rate/Charge | n1-8.n | 1-9 | Tarifa por unidad de peso |
| 1 | Total (Rate x Weight) | n1-10.n | 1-12 | Cargo total para esta línea |
| 2 | Nature and Quantity of Goods | m | **65×12** | Descripción de la mercancía. Máx 12 líneas de 65 char en sección Rating (compartidas con ND, NV, NU, NS). Prefijo `/NG` para directo, `/NC` para consolidado |
| 2 | Harmonized Code | an | 6-15 | Código HS. Prefijo `/NH`. Mínimo 6 dígitos (ICS2/UAE), 10 dígitos (China) |
| 3 | Dimensions | n | variado | Largo × Ancho × Alto por pieza/grupo. Prefijo `/ND` |
| 3 | Volume | n | variado | Volumen resultante. Prefijo `/NV`. Código: `MC` (m³) o `CF` (ft³) |
| 4 | ULD Info | an | variado | Si aplica: ULD type, número, weight. Prefijo `/NU` |
| 5 | SLAC | n1-8 | 1-8 | Shipper's Load and Count. Prefijo `/NS`. Obligatorio para BUP y ACAS consolidaciones |

**Identificadores de Línea en RTD (Data Identifiers):**

| Prefijo | Tipo de Dato | Uso |
|---------|-------------|-----|
| `/NG` | Nature of Goods | **Envíos directos** (no consolidados) |
| `/NC` | Nature of Goods - Consolidation | **Envíos consolidados**. Si no disponible, usar `/NG` con texto `CONSOLIDATION`, `CONSOL` o `CNSL` |
| `/NH` | Harmonized Code | Código HS (arancelario) |
| `/ND` | Dimensions | Dimensiones por pieza (L×W×H) |
| `/NV` | Volume | Volumen total |
| `/NU` | ULD Information | Datos del contenedor ULD |
| `/NS` | SLAC | Shipper's Load and Count (número real de piezas dentro de BUP/ULD) |

> **REGLA CRÍTICA:** Usar `/NC` para consolidación y `/NG` para directo. La confusión entre ambos puede causar rechazo.

**Sintaxis (con numeración de líneas según práctica de carriers):**
```
RTD/1/P<pieces>/K<weight>/W<chg_weight>/R<rate>/T<total>
/<line#>/NG/<description_of_goods_line_1>
/<line#>/NG/<description_of_goods_line_2>
/<line#>/NH/<harmonized_code>
/<line#>/ND/K<pieces>/CMT<length>-<width>-<height>/<count>
/<line#>/NV/<volume_code><volume>
/<line#>/NS/<slac>
```

> **Nota:** Algunos carriers (CX, EY) usan numeración de líneas explícita (`/1/`, `/2/`, etc.). Otros carriers usan el formato sin números. Verificar con el carrier destino.

**Ejemplo 1 — Envío Directo:**
```
RTD/1/P10/K1250.0/W1250.0/R2.10/T2625.00
/NG/NEW AUTOMOBILE BRAKE PADS
/NG/PART NUMBER BP-2026-A SERIES
/NH/8708.30
/ND/10/CMT120-80-60/10
/NV/MC5.76
```

**Ejemplo 2 — Envío Consolidado:**
```
RTD/1/P6/K226/CQ/W319.5/R15.33/T4897.94
/NC/CONSOLIDATION AS PER
/2/NC/ATTACHED LIST
/3/ND//CMT108-41-53/1
/4/ND//CMT80-60-98/3
/5/NV/MC1.03
/6/NS/39
```

**Ejemplo 3 — BUP (Shipper Built Unit):**

Cuando el envío es BUP, el MAWB declara **T1** (Total 1 Piece) con código SPH `BUP`, y el SLAC indica las piezas reales internas:
```
AWB/020-12345675HKGFRAT1K915.8MC9.74
RTD/1/P1/K915.8/W915.8/R3.50/T3205.30
/NC/CONSOLIDATION AS PER ATTACHED LIST
/NS/39
```

**Reglas Críticas:**
- **Nature of Goods** es el campo más escrutado por ACAS/TSA/CBP. Descripciones genéricas = rechazo. Ver [Sección 6](#6-descripciones-de-carga-términos-válidos-vs-inválidos) para lista completa.
- **`/NG` para envío directo, `/NC` para consolidación.** Usar el identificador incorrecto puede causar rechazo.
- El código HS (`/NH`) es **obligatorio** para: EU (ICS2, mín 6 díg), China (10 díg), Japón (6+), Corea (6+), India, Brasil, Indonesia, Filipinas, Turquía, UAE, Marruecos (4 díg), Kenia.
- **SLAC (`/NS`):** Obligatorio en FWB para envíos BUP (shipper-loaded ULD). En FHL, obligatorio para USA y Canadá.
- Las dimensiones (`/ND`) son necesarias cuando el volumétrico supera el peso real (para tarificación).
- Cada línea de texto `/NG` o `/NC` no debe exceder **65 caracteres** (riesgo de truncamiento).
- Máximo **12 líneas** en la sección Rating (compartidas entre NG/NC, NH, ND, NV, NU, NS).

**Alertas de Rechazo:**

| Error Code | Descripción |
|------------|-------------|
| `RTD0010` | Descripción de mercancía vacía o genérica |
| `RTD0015` | Total = Rate × Chargeable Weight no cuadra (tolerancia ±1 unidad) |
| `RTD0020` | Rate Class código inválido |
| `RTD0025` | Commodity code no existe en TACT vigente |
| `RTD0030` | Falta código HS para destino que lo requiere |
| `RTD0035` | Dimensiones incoherentes (L×W×H = 0) |

---

### 3.12 OTH — Other Charges

**Lógica General:** Cargos adicionales que no son la tarifa de transporte: due agent charges, due carrier charges.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Charge Type | a2 | 2 | `DA` = Due Agent, `DC` = Due Carrier |
| 1 | Entitlement Code | a1 | 1 | `A` = Agent, `C` = Carrier |
| 1 | Charge Code | a2 | 2 | Código IATA de cargo (ej: `MY` = Fuel Surcharge, `AW` = AWB Fee, `SC` = Security, `RA` = Dangerous Goods). Ver tabla IATA TACT 6.2.19 |
| 1 | Amount | n1-10.n | 1-12 | Importe del cargo |

**Sintaxis:**
```
OTH/<charge_type><entitlement><charge_code><amount>
```
**Ejemplo:**
```
OTH/DCA/MY125.00
OTH/DCC/FC850.00
OTH/DCC/SC200.00
```

**Códigos de Cargo Frecuentes (basado en IATA TACT 6.2.19):**

| Código | Descripción | Tipo Usual |
|--------|-------------|------------|
| `AW` | Air Waybill Fee | DC |
| `AT` | Groom Administration Fee | DC |
| `CD` | Clearance and Delivery | DC |
| `CG` | Electronic Processing / Transmission of customs data | DC |
| `CH` | Clearance and Handling — Origin | DC |
| `DB` | Disbursement | DA |
| `FC` | Charges Collect Fee | DC |
| `FE` | Handling Fee | DC |
| `IN` | Insurance Premium | DA/DC |
| `LF` | AVI Permit Fee (ej: HKG) | DC |
| `MA` | CC Due Agent Charge | DA |
| `MC` | Miscellaneous Due Carrier (Terminal Charges) | DC |
| `MR` | Miscellaneous — Due Carrier | DC |
| `MT` | Misc at Transit — Security US Destination | DC |
| `MY` | **Fuel Surcharge** | DC |
| `MZ` | Miscellaneous — Due Agent | DA |
| `RA` | Dangerous Goods Handling Fee | DC |
| `SC` | Security Charge (X-ray / Screening) | DC |
| `VA` | Valuable Cargo Handling Fee | DC |
| `XB` | Security Surcharge | DC |

> **ADVERTENCIA:** Los códigos `MY` (Fuel Surcharge) y `XB` (Security Surcharge) son los más utilizados por carriers globales. Consultar IATA TACT Rules 6.2.19 para lista exhaustiva.

---

### 3.13 PPD/COL — Prepaid/Collect Charge Summary

**Lógica General:** Totales de cargos. `PPD` si el envío es prepago; `COL` si es collect. Al menos uno debe existir (condicional a CVD).

**Campos (PPD):**

| Línea | Campo | Formato | Descripción |
|-------|-------|---------|-------------|
| 1 | Weight Charge | n1-12 | Total de tarifa de peso |
| 1 | Valuation Charge | n1-12 | Cargo por declaración de valor |
| 1 | Tax | n1-12 | Impuestos |
| 1 | Total Other Charges Due Agent | n1-12 | Suma de OTH tipo DA |
| 1 | Total Other Charges Due Carrier | n1-12 | Suma de OTH tipo DC |
| 2 | Grand Total | n1-12 | Suma total prepaid |

**Sintaxis:**
```
PPD/<weight_charge>/<valuation_charge>/<tax>/<total_da>/<total_dc>/<grand_total>
```

**Reglas Críticas:**
- Grand Total = Weight Charge + Valuation Charge + Tax + Total DA + Total DC.
- Tolerancia de cuadre: ± la unidad mínima de la moneda declarada en CVD.
- Si CVD indica PP y no hay PPD, se genera `PPD0010: Falta segmento PPD`.

---

### 3.14 ISU — Carrier Execution

**Lógica General:** Identifica la fecha y lugar de emisión del AWB y la firma del carrier o agente emisor. Obligatorio en todas las versiones.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Date of Issue | n2a3n2 | 7 | Formato: `DDMMMYY` (ej: `15JAN26`) |
| 1 | Place of Issue | m | 17 | Ciudad de emisión |
| 2 | Signature/Authorization | m | 20 | Nombre del autorizante |

**Sintaxis:**
```
ISU/<date><place>/<signature>
```
**Ejemplo:**
```
ISU/15JAN26SHANGHAI/WANG LEI
```

**Reglas Críticas:**
- La fecha de emisión no puede ser posterior a la fecha de vuelo.
- El lugar de emisión debe ser coherente con el origen del AWB.

---

### 3.15 OSI — Other Service Information

**Lógica General:** Texto libre para instrucciones especiales que no encajan en otros segmentos. Repetible (hasta 3 líneas en la mayoría de implementaciones).

**Campos:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | OSI Text | m | **65** char | Texto libre |

**Sintaxis:**
```
OSI/<text>
```
**Ejemplos:**
```
OSI/DO NOT STACK - FRAGILE EQUIPMENT
OSI/ORIGINAL DOCS IN POUCH ATTACHED TO PIECE 1
OSI/TRANSIT CARGO - DO NOT OPEN IN FRA
```

**Reglas Críticas:**
- No usar OSI para datos que pertenecen a OCI (información aduanera).
- No exceder 65 caracteres por línea.

---

### 3.16 CER — Shipper's Certification

**Lógica General:** Declaración del expedidor para mercancías peligrosas. **Obligatorio** si `SSR/DGR` está presente.

**Campos:**

| Línea | Campo | Formato | Descripción |
|-------|-------|---------|-------------|
| 1 | Certification Text | m | Texto estandarizado de certificación DG |
| 2 | Signatory Name | m | Nombre de quien firma |

**Sintaxis:**
```
CER/<certification_text>/<signatory>
```

El texto típico sigue:
```
CER/I HEREBY CERTIFY THAT THE CONTENTS OF THIS CONSIGNMENT
ARE FULLY AND ACCURATELY DESCRIBED ABOVE BY THE PROPER
SHIPPING NAME AND ARE CLASSIFIED PACKAGED MARKED AND
LABELLED AND ARE IN ALL RESPECTS IN PROPER CONDITION FOR
TRANSPORT ACCORDING TO APPLICABLE INTERNATIONAL AND
NATIONAL GOVERNMENTAL REGULATIONS/JOHN DOE
```

---

### 3.17 REF — Reference Information

**Lógica General:** Disponible desde FWB v15. Permite asociar números de referencia adicionales al envío (Purchase Order, invoice, customs declaration, etc.).

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Reference Qualifier | a2-3 | 2-3 | Tipo de referencia |
| 1 | Reference Number | an | 35 | Número/código de referencia |

**Qualificadores Comunes:**

| Qualifier | Descripción |
|-----------|-------------|
| `PO` | Purchase Order Number |
| `IN` | Invoice Number |
| `AW` | AWB Reference |
| `CU` | Customs Declaration Number |
| `FF` | Freight Forwarder Reference |
| `AG` | Agent Reference |
| `CO` | Consignee Order Number |

**Sintaxis:**
```
REF/<qualifier><number>
```
**Ejemplo:**
```
REF/PO/PO-2026-08899
REF/IN/INV-2026-44521
```

---

### 3.18 COR — Customs Origin (EU Transit / NCTS)

**Lógica General:** El segmento COR transmite el código de procedimiento aduanero de origen para carga en tránsito comunitario (EU) bajo el sistema NCTS (New Computerised Transit System). Es condicional: obligatorio cuando la carga viaja bajo régimen de tránsito aduanero T1 o T2 dentro de la UE/EFTA.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Customs Origin Code | a2 | 2 | Código de procedimiento de tránsito |

**Códigos de Procedimiento:**

| Código | Significado | Uso |
|--------|-------------|-----|
| `T1` | External Community Transit | Mercancía de fuera de la UE que transita entre 2+ puntos dentro de la UE sin despacho a libre práctica |
| `T2` | Internal Community Transit | Mercancía con estatus aduanero de la Comunidad que transita por un país no-EU (ej: Suiza, Noruega) |
| `T2F` | Internal Transit for specific fiscal territories | Para Canarias, DOM/TOM, Channel Islands, etc. |
| `TD` | Transit Document (NCTS MRN) | Documento de tránsito electrónico |
| `X` | Mixed / Other | Otros procedimientos |

**Sintaxis:**
```
COR/<customs_origin_code>
```
**Ejemplos:**
```
COR/T1
COR/T2
COR/TD
```

**Reglas Críticas:**
- Si la carga transita por la UE bajo régimen T1/T2, el COR es **obligatorio** para que la aduana del aeropuerto de tránsito no intente despachar la carga.
- El código COR se valida contra el MRN (Movement Reference Number) del documento de tránsito NCTS cuando `COR/TD` se utiliza.
- Para carga no-EU con destino final fuera de la UE que transita por un hub europeo (ej: FRA, AMS, CDG), usar `COR/T1`.
- Para carga intra-EU que transita por Suiza, usar `COR/T2`.
- Si el COR falta cuando es requerido, la aduana del aeropuerto de tránsito puede retener la carga y exigir despacho local.

---

### 3.19 OCI — Other Customs Information

**Lógica General:** Segmento crítico para cumplimiento aduanero. Transporta datos regulatorios específicos por país/aduana que no encajan en los segmentos estándar. Disponible desde FWB v12. Condicional: es obligatorio si la regulación del país de origen/destino/tránsito lo exige.

**Campos y Formato:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Country Code | a2 | 2 | Código ISO 3166-1 alpha-2 del país que requiere la info |
| 1 | Information Identifier | a3 | 3 | Tipo de dato aduanero (ver tabla) |
| 1 | Customs Information Identifier | a2 | 2 | Sub-tipo (calificador) |
| 1 | Supplementary Customs Information | m | 35 | Dato/valor |

**Sintaxis:**
```
OCI/<country_code>/<info_identifier>/<customs_id>/<supplementary_info>
```

**Information Identifiers (más comunes):**

| Info ID | Customs ID | Descripción | Ejemplo Completo |
|---------|------------|-------------|------------------|
| `T` | `AE` | AEO / Authorized Economic Operator | `OCI/DE/T/AE/DEAEO1234567` |
| `T` | `CI` | Consignee Import ID / Tax Code | `OCI/CN/T/CI/91310000MA1FL8XX43` |
| `T` | `SM` | Shipper Import/Export ID | `OCI/CN/T/SM/91310115MA1FL8UE23` |
| `T` | `EI` | EORI Number (EU) | `OCI/EU/T/EI/DE123456789012345` |
| `S` | `TE` | Shipper Telephone | `OCI/CN/S/TE/86-21-5888-1234` |
| `D` | `TE` | Consignee Telephone | `OCI/CN/D/TE/86-10-6655-4321` |
| `T` | `RA` | Export License Number | `OCI/US/T/RA/X20260001` |
| `I` | `AC` | ACID Number (Egipto) | `OCI/EG/I/AC/ACID12345678901234` |
| `T` | `IP` | Import Permit | `OCI/SG/T/IP/IP2026001234` |
| `T` | `TN` | TIN / Tax Identification Number | `OCI/ID/T/TN/01.234.567.8-901.000` |
| `T` | `HS` | Harmonized System Code | `OCI/US/T/HS/8708.30.5060` |
| `C` | `SD` | Screening Status (security) | `OCI/US/C/SD/SPX` |
| `T` | `VN` | VAT Number | `OCI/GB/T/VN/GB123456789` |

**Reglas Críticas por País:**

Se detalla completamente en la [Sección 5](#5-validación-aduanera-detallada--oci--txt).

**Cuándo está MAL (Alertas de Rechazo):**

| Error Code | Descripción |
|------------|-------------|
| `OCI0010` | Country code inválido |
| `OCI0015` | Information Identifier no reconocido |
| `OCI0020` | Falta OCI mandatoria para el país de destino |
| `OCI0025` | Longitud del dato suplementario excede 35 char |
| `OCI0030` | Formato inconsistente del dato (ej: EORI sin país prefijo) |
| `OCI0035` | AEO code formato inválido |
| `OCI0040` | Enterprise Code (USCI) formato inválido para China |
| `OCI0045` | ACID Number longitud o formato inválido para Egipto |

---

### 3.20 TXT — Free Text / Nature of Goods Description

**Lógica General:** Complementa o reemplaza la descripción de mercancía del RTD con texto libre adicional. En práctica, se usa junto con RTD /NG para proporcionar información extendida.

**Campos:**

| Línea | Campo | Formato | Long. | Descripción |
|-------|-------|---------|-------|-------------|
| 1 | Free Text Line | m | **65** char | Descripción libre de la mercancía |

**Sintaxis:**
```
TXT/<free_text_line>
```

**Reglas detalladas en** [Sección 6 — Descripciones de Carga](#6-descripciones-de-carga-términos-válidos-vs-inválidos).

---

## 4. ESTRUCTURA DEL MENSAJE FHL

### Relación Master vs House

El FHL (Free House Waybill List) transporta información a nivel de **House AWB** (HAWB) bajo un **Master AWB** (MAWB). La relación es:

```
MAWB (FWB)
  ├── HAWB 1 (FHL → HBS)
  ├── HAWB 2 (FHL → HBS)
  └── HAWB n (FHL → HBS)
```

- El **FWB** describe el envío consolidado a nivel master.
- El **FHL** desglosa cada house dentro del master, con sus propios shipper/consignee/descripción.
- Para regulaciones ACAS/ICS2/PLACI, los datos **house-level** son los escrutados; el master solo indica la consolidación.

### Orden de Segmentos (FHL v5)

```
FHL/5                            ← Versión
MBI (obligatorio)                ← Master Bill Identification
HBS (obligatorio, repetible)     ← House Bill Summary
  ├── TXT (condicional)          ← Descripción de mercancía (house)
  ├── SHP (obligatorio)          ← Shipper del house
  ├── CNE (obligatorio)          ← Consignee del house
  ├── AGT (opcional)             ← Agente del house
  ├── SSR (opcional)             ← Servicios especiales
  ├── OCI (condicional)          ← Info aduanera house-level
  └── NFY (opcional)             ← Notify party
```

---

### 4.1 MBI — Master Bill Identification

**Lógica General:** Vincula el FHL con su MAWB correspondiente.

**Campos:**

| Campo | Formato | Long. | Descripción |
|-------|---------|-------|-------------|
| Airline Prefix | n3 | 3 | Prefijo IATA aerolínea |
| Master AWB Number | n8 | 8 | Número del MAWB |

**Sintaxis:**
```
MBI/<prefix>-<master_awb_number>
```
**Ejemplo:**
```
MBI/020-12345675
```

---

### 4.2 HBS — House Bill Summary

**Lógica General:** Encabezado de cada House Waybill. Resume piezas, peso e IDs del HAWB.

**Campos:**

| Campo | Formato | Long. | Descripción |
|-------|---------|-------|-------------|
| House Waybill Number | an | 12-35 | Número del HAWB (formato libre del forwarded) |
| Origin | a3 | 3 | Aeropuerto de origen del house |
| Destination | a3 | 3 | Aeropuerto de destino del house |
| Number of Pieces | n1-4 | 1-4 | Piezas del house |
| Weight Code | a1 | 1 | `K` o `L` |
| Weight | n1-7.n | 1-8 | Peso bruto del house |
| SLAC (Shipper's Load and Count) | n1-8 | 1-8 | Conteo del expedidor (FHL v5) |
| Harmonized Code | an | 6-10 | Código HS del house (FHL v5) |

**Sintaxis:**
```
HBS/<hawb_number>/<origin><destination>/<pieces><weight_code><weight>[/S<slac>][/T<harmonized_code>]
```
**Ejemplo:**
```
HBS/FFLAX-2026-001/PVGLAX/25K380.0/S250/T8708.30
```

**Reglas Críticas:**
- HAWB numbers deben ser únicos dentro de un mismo MAWB.
- Origin/Destination del HBS pueden diferir del MAWB (ej: un house desde PVG a LAX bajo un master FRA-LAX).
- La suma de piezas/peso de todos los HBS no necesita coincidir exactamente con el MAWB pero se recomienda strongly.
- **SLAC** es obligatorio para envíos ACAS a USA cuando el house contiene mercancía en bultos sueltos (no palletizada).

**Alertas de Rechazo:**

| Error Code | Descripción |
|------------|-------------|
| `HBS0010` | HAWB number vacío |
| `HBS0015` | Destino no coincide con ruta |
| `HBS0020` | Peso del house ≤ 0 |
| `HBS0025` | Falta código HS (destino requiere) |
| `HBS0030` | SLAC faltante para envío a USA consolidado |

---

### 4.3 TXT (FHL) — Nature of Goods (House Level)

**Lógica General:** Descripción de la mercancía a nivel house. **Obligatorio bajo ACAS/ICS2** para cada house bill.

**Formato:** Igual que TXT del FWB:
```
TXT/<goods_description>
```

**Ejemplo:**
```
TXT/NEW AUTOMOBILE BRAKE PADS AND ROTORS
TXT/PART NUMBERS BP-2026-A AND RT-2026-B
```

**Reglas Críticas:**
- La descripción a nivel house **prevalece** sobre la del master para propósitos aduaneros.
- Aplican las mismas reglas de aceptación/rechazo de [Sección 6](#6-descripciones-de-carga-términos-válidos-vs-inválidos).
- Mínimo **1 línea descriptiva** por house. Máximo recomendado: 5 líneas de 65 char.

---

### 4.4 SHP/CNE (FHL) — House-Level Addresses

**Lógica General:** Estructura y reglas idénticas a las secciones 3.4 y 3.5 del FWB, pero aplicadas a cada house individually.

**Diferencia clave:** Para ACAS/ICS2, los SHP y CNE del **house** son los datos que las aduanas validan. Si el master tiene un freight forwarder como shipper (consolidador), la aduana necesita ver al shipper **real** en cada house.

**Ejemplo FHL SHP (house level):**
```
SHP
/NMBEIJING GREAT WALL AUTO PARTS CO LTD
/AD18 CHAOYANG DISTRICT JIANWAI SOHO
/CIBEIJING
/PO100022
/COCN
/CTTE86-10-8765-4321
```

---

### 4.5 OCI (FHL) — House-Level Customs Data

**Lógica General:** Misma sintaxis que OCI del FWB (sección 3.18) pero con datos específicos del house shipper/consignee. **Mandatorio bajo ACAS, ICS2, China CAAC, y la mayoría de regímenes pre-loading.**

Los datos del OCI a nivel house reemplazan/complementan los del master para efectos aduaneros.

**Ejemplo OCI house-level para envío a China:**
```
OCI/CN/T/SM/91110108MA01N8XX23
OCI/CN/S/TE/86-10-8765-4321
OCI/CN/T/CI/91310000MA1FL8XX43
OCI/CN/D/TE/86-21-5888-1234
```

---

## 5. VALIDACIÓN ADUANERA DETALLADA — OCI & TXT

---

### 5.1 ACAS / Pre-Loading (USA)

**Programa:** Air Cargo Advance Screening (ACAS) — CBP / TSA  
**Aplica a:** Toda carga aérea con destino, tránsito o transbordo en Estados Unidos.  
**Nivel:** House-level (FHL) cuando existen consolidaciones; Master-level (FWB) cuando es direct.

#### Los 7+1 Elementos Obligatorios ACAS

| # | Elemento | Ubicación FWB/FHL | Requisito |
|---|----------|-------------------|-----------|
| 1 | **Shipper Name** | SHP /NM | Nombre legal completo, no genérico |
| 2 | **Shipper Address** | SHP /AD + /CI + /CO | Dirección completa con ciudad y país |
| 3 | **Consignee Name** | CNE /NM | Nombre legal completo |
| 4 | **Consignee Address** | CNE /AD + /CI + State + ZIP + /CO | Dirección completa US incl. State + ZIP |
| 5 | **Quantity (Pieces + Weight)** | AWB / HBS | Piezas y peso bruto |
| 6 | **Description of Goods** | RTD /NG o TXT | Descripción **específica** y precisa |
| 7 | **Air Waybill Number** | AWB / HBS | MAWB y/o HAWB number |
| +1 | **SLAC** (Shipper's Load and Count) | HBS /S campo | Número de bultos internos en consolidación |

#### Reglas de Precisión en Descripción (TSA/CBP)

- La descripción debe permitir a un inspector determinar la naturaleza **exacta** de la mercancía.
- **Prohibido:** Términos vagos, acrónimos sin expansión, descripciones de una sola palabra genérica.
- **Mínimo:** Combinación de [adjetivo/estado] + [sustantivo específico] o nombre técnico de la mercancía.

#### Requisitos de Dirección US

| Campo | Formato Requerido | Ejemplo |
|-------|-------------------|---------|
| State/Province | Exactamente 2 chars del USPS State Code | `CA`, `NY`, `TX` |
| ZIP Code | 5 dígitos (`nnnnn`) o ZIP+4 (`nnnnn-nnnn`) | `90015` o `90015-1234` |
| Country Code | `US` | Siempre `US` |

#### Screening Status (Seguridad)

| OCI Line | Significado |
|----------|-------------|
| `OCI/US/C/SD/SPX` | Screened con Passenger Aircraft (plenary) |
| `OCI/US/C/SD/SCO` | Screened Cargo-Only Aircraft |
| `OCI/US/C/SD/NSC` | Not yet screened (pre-loading screening pending) |

**Alertas de Rechazo ACAS (DNL = Do Not Load):**

| Código | Causa |
|--------|-------|
| `ACAS-DNL-01` | Consignee address incomplete (missing ZIP/State) |
| `ACAS-DNL-02` | Description of goods too vague |
| `ACAS-DNL-03` | Shipper name = generic/abbreviated |
| `ACAS-DNL-04` | HAWB number missing on consolidated shipment |
| `ACAS-DNL-05` | Weight/piece count missing or zero |
| `ACAS-DNL-06` | SLAC missing for consolidated cargo |
| `ACAS-DNL-07` | Screening status not provided |

#### Datos Adicionales ACAS — IC 25-05 (Agosto 2025)

A partir de la Industry Circular **IC 25-05** (efectiva agosto 2025), ACAS incorpora 13 elementos de datos adicionales que, si bien no son todos obligatorios de manera inmediata, serán progresivamente requeridos y mejoran significativamente la evaluación de riesgo:

| # | Elemento Adicional | Ubicación en FWB/FHL | Notas |
|---|-------------------|---------------------|-------|
| 1 | **Consolidation Indicator** | Tipo de envío (Direct vs Consolidated) | Derivable del MBI/HBS en FHL |
| 2 | **Country of Origin of Goods** | OCI `/.../T/RA/` o RTD metadata | ISO 3166-1 alpha-2 |
| 3 | **HS Code** (mínimo 6 dígitos) | RTD `/NH` o HBS `/T` | Ahora más enfáticamente recomendado |
| 4 | **Shipper Phone/Email** | SHP `/CT` o OCI TE | Con código de país |
| 5 | **Consignee Phone/Email** | CNE `/CT` o OCI TE | Con código de país |
| 6 | **Shipper Account Number** | OCI custom field | ID fiscal o cuenta del expedidor |
| 7 | **Consignee Account Number** | OCI custom field | ID fiscal o cuenta del destinatario |
| 8 | **Piece-level weight** | Distribución de peso por pieza/house | Para mejor análisis de consistencia |
| 9 | **Total Piece Count for HAWB** | HBS pieces field | Ya cubierto por el +1 SLAC |
| 10 | **Flight Routing Details** | FLT + RTG | Ruta completa con todos los segmentos de vuelo |
| 11 | **Freight Forwarder Identity** | AGT + OCI | Nombre, IATA Code, dirección del forwarder |
| 12 | **UCR/UCN** | REF | Unique Consignment Reference si disponible |
| 13 | **Prior Air Waybill** | REF | Para re-envíos o returnees |

> **Recomendación:** Aunque estos 13 elementos no generan rechazo inmediato, su inclusión reduce significativamente la probabilidad de recibir un **RFI (Request for Information)** del CBP, que puede resultar en un **DNL (Do Not Load)** temporal mientras se resuelve.

---

### 5.2 ICS2 — Europa

**Programa:** Import Control System 2 (ICS2) — EU Commission / DG TAXUD  
**Aplica a:** Toda carga aérea entrante a la Unión Europea, Noruega, Suiza y UK (bajo su propio régimen post-Brexit).  
**Nivel:** House-level mandatorio.

#### Datos Obligatorios ENS (Entry Summary Declaration)

| Datos | Ubicación | Requisito |
|-------|-----------|-----------|
| Shipper EORI o nombre/dirección completa | OCI `/T/EI/` + SHP | EORI preferido; si no, nombre+dirección+país |
| Consignee EORI o nombre/dirección completa | OCI `/T/EI/` + CNE | Ídem |
| Código HS (6 dígitos mínimo) | RTD /NH o HBS /T | Mínimo 6 dígitos, idealmente 8-10 |
| Descripción de mercancía | RTD /NG o TXT | Precisa y en inglés |
| Peso bruto | AWB / HBS | En KG |
| Número de piezas | AWB / HBS | |
| País de origen de mercancía | OCI o RTD | Código ISO |
| Unique Consignment Reference (UCR) | REF | Si disponible |

#### Formato EORI (European)

```
<CountryCode><Identifier>
```
- Country Code: 2 letras ISO del país de emisión
- Identifier: hasta 15 caracteres alfanuméricos

**Ejemplos:**
- `DE123456789012345` (Alemania)
- `NL123456789` (Holanda)
- `GB123456789000` (UK — post-Brexit, UKIMS)

**OCI para EORI:**
```
OCI/DE/T/EI/DE123456789012345
OCI/GB/T/VN/GB123456789
```

#### AEO Codes (EU)

| Tipo | Formato | Uso |
|------|---------|-----|
| AEO-C | `<CC>AEOC<number>` | Customs Simplifications |
| AEO-S | `<CC>AEOS<number>` | Security and Safety |
| AEO-F | `<CC>AEOF<number>` | Full (C+S combined) |

**OCI para AEO:**
```
OCI/DE/T/AE/DEAEOF1234567890
```

**Alertas ICS2:**
- Falta de HS code → rechazo Filing Incomplete
- EORI inválido → Risk Assessment Flag
- Descripción genérica → Request for Data (RFD)
- Peso = 0 → Filing rejected

---

### 5.3 China — Requisitos de Enterprise Code

**Autoridad:** CAAC (Civil Aviation Administration of China) + GAC (General Administration of Customs)  
**Aplica a:** Toda carga aérea de importación y exportación en China.

#### Datos Obligatorios

| Dato | Campo | Formato | Ejemplo |
|------|-------|---------|---------|
| **Enterprise Code (USCI)** del Shipper | OCI `/CN/T/SM/` | 18 caracteres alfanuméricos (Unified Social Credit Identifier) | `91310115MA1FL8UE23` |
| **Enterprise Code (USCI)** del Consignee | OCI `/CN/T/CI/` | 18 caracteres alfanuméricos | `91310000MA1FL8XX43` |
| **Teléfono del Shipper** | OCI `/CN/S/TE/` o SHP /CT | Con código de país `86-` | `86-21-5888-1234` |
| **Teléfono del Consignee** | OCI `/CN/D/TE/` o CNE /CT | Con código de país `86-` | `86-10-6655-4321` |
| **Código HS** | RTD /NH o HBS /T | 10 dígitos (China usa 10) | `8708.30.0000` |
| **Nombre completo** del Shipper y Consignee | SHP /NM, CNE /NM | En caracteres romanos o Pinyin | |

#### Validación del USCI (Unified Social Credit Identifier)

El código USCI de 18 caracteres tiene la estructura:

| Posición | Significado |
|----------|-------------|
| 1 | Registration Authority Code |
| 2 | Type of Organization |
| 3-8 | Administrative Division Code |
| 9-17 | Organization Code |
| 18 | Check digit |

**Reglas de validación:**
- Exactamente 18 caracteres
- Solo mayúsculas y dígitos (no se permiten guiones ni espacios)
- El dígito 18 (check digit) debe validar por algoritmo MOD-31

**Si no tiene USCI (entidad extranjera):**
Se puede usar "ID" o "PASSPORT" como identificador alternativo, pero se requiere al menos un identificador fiscal o legal.

**Ejemplo completo para China:**
```
OCI/CN/T/SM/91310115MA1FL8UE23
OCI/CN/S/TE/86-21-5888-1234
OCI/CN/T/CI/91310000MA1FL8XX43
OCI/CN/D/TE/86-10-6655-4321
```

**Alertas de Rechazo:**

| Error | Descripción |
|-------|-------------|
| `OCI-CN-001` | Enterprise Code (USCI) del shipper faltante |
| `OCI-CN-002` | Enterprise Code (USCI) del consignee faltante |
| `OCI-CN-003` | Formato USCI inválido (no 18 chars o check digit incorrecto) |
| `OCI-CN-004` | Teléfono del shipper faltante |
| `OCI-CN-005` | Teléfono del consignee faltante |
| `OCI-CN-006` | Código HS faltante o inferior a 10 dígitos |

---

### 5.4 Egipto — ACID Number (Sistema Nafeza / ACI)

**Autoridad:** Egyptian Customs Authority (ECA) — Sistema ACI (Advance Cargo Information) / Plataforma **Nafeza** (نافذة)  
**Aplica a:** Toda carga de importación a Egipto desde octubre 2021.  
**Ref. regulatoria:** Egyptian Presidential Decree 106/2020; ACI customs guidance v1.11 (Dic 2025); vigente enero 2026.

#### Elementos Obligatorios (3 líneas OCI)

Para un envío directo (FWB sin consolidación), se requieren **3 elementos OCI** distintos:

| # | Dato | Info Identifier | Customs ID | Formato | Long. | Campo OCI Completo |
|---|------|-----------------|------------|---------|-------|---------------------|
| 1 | **ACID Number** | `IMP` | `M` | Solo dígitos | 19 | `OCI/EG/IMP/M/<19 dígitos>` |
| 2 | **Enterprise Code del Consignee** | `CNE` | `T` | Alfanumérico | variada | `OCI/EG/CNE/T/<enterprise_code>` |
| 3 | **Enterprise Code del Shipper** | `SHP` | `T` | Alfanumérico | variada | `OCI/EG/SHP/T/<enterprise_code>` |

> **⚠️ CAMBIO CRÍTICO (Ene 2026):** El formato anterior `OCI/EG/I/AC/ACID...` ha sido reemplazado. El Info Identifier es ahora `IMP` (Import) y el Customs ID es `M` (declaración de importación). No usar `I/AC`.

**Estructura del ACID:**
- Emitido por la plataforma **Nafeza** (نافذة) del gobierno egipcio.
- Formato: exactamente **19 dígitos numéricos** (sin prefijo "ACID" en el campo OCI).
- El ACID es único por shipment y se genera en el portal Nafeza por el importador o su agente aduanal en Egipto.

**Sintaxis OCI — Envío Directo (FWB, sin consolidación):**
```
OCI/EG/IMP/M/1234567890123456789
OCI/EG/CNE/T/EG-IMP-ENTERPRISE-001
OCI/EG/SHP/T/CN-EXP-ENTERPRISE-999
```

#### Reglas para Consolidaciones (Master + House)

| Nivel | Contenido OCI Requerido |
|-------|------------------------|
| **FWB (Master)** | Solo el **Tax ID del Freight Forwarder egipcio** (agente de consolidación). NO incluir ACID del importador final. Formato: `OCI/EG/AGT/T/<FF_TAX_ID>` |
| **FHL (House)** | El ACID + Enterprise Codes del shipper/consignee real de cada HAWB. Formato igual que envío directo: `OCI/EG/IMP/M/<19 dígitos>` + `OCI/EG/CNE/T/...` + `OCI/EG/SHP/T/...` |

**Ejemplo — Consolidación (FWB nivel master):**
```
OCI/EG/AGT/T/EG-FF-TAXID-12345
```

**Ejemplo — House dentro de FHL:**
```
OCI/EG/IMP/M/1234567890123456789
OCI/EG/CNE/T/EG-CONSIGNEE-ENT-001
OCI/EG/SHP/T/CN-SHIPPER-ENT-999
```

**Reglas Críticas:**
- El ACID debe ser obtenido **antes del embarque** por el importador en Egipto a través de la plataforma Nafeza.
- Sin ACID válido, la carga será **rechazada en aeropuerto de destino** y sujeta a penalización.
- El número ACID se valida contra la base de datos de Nafeza en tiempo real; un número inválido o expirado da como resultado incautación.
- Para consolidaciones, el ACID va a nivel **house** (FHL/OCI), **nunca** a nivel master FWB.
- El Enterprise Code del consignee debe coincidir con el registro en Nafeza vinculado al ACID.
- Desde enero 2026, las autoridades egipcias validan también el Enterprise Code del shipper.

**Alertas de Rechazo:**

| Error | Descripción |
|-------|-------------|
| `OCI-EG-001` | ACID Number faltante para carga con destino Egipto |
| `OCI-EG-002` | ACID Number formato inválido (no son 19 dígitos o contiene letras) |
| `OCI-EG-003` | ACID Number no validado en Nafeza (expirado o inexistente) |
| `OCI-EG-004` | Enterprise Code del Consignee faltante |
| `OCI-EG-005` | Enterprise Code del Shipper faltante |
| `OCI-EG-006` | Uso de formato obsoleto (`OCI/EG/I/AC/...`) — debe usar `IMP/M` |
| `OCI-EG-007` | ACID en FWB master de consolidación (debe ir en FHL) |

---

### 5.5 Indonesia — TIN/NPWP

**Autoridad:** DJBC (Direktorat Jenderal Bea dan Cukai — Customs & Excise)  
**Aplica a:** Importaciones y exportaciones de Indonesia.  
**Ref. regulatoria:** ACI customs guidance v1.11 (Dic 2025); vigente enero 2026.

#### Requisitos

| Dato | Info Identifier | Customs ID | Formato | Long. | Campo OCI Completo |
|------|-----------------|------------|---------|-------|---------------------|
| **TIN/NPWP** del Consignee (importación) | `CNE` | `T` | Prefijo `TIN` o `NPWP` + 16 dígitos **sin separadores** | 19-20 | `OCI/ID/CNE/T/TIN<16 dígitos>` |
| **TIN/NPWP** del Shipper (exportación) | `SHP` | `T` | Prefijo `TIN` o `NPWP` + 16 dígitos **sin separadores** | 19-20 | `OCI/ID/SHP/T/TIN<16 dígitos>` |
| **NIB** (Nomor Induk Berusaha) | `CNE` o `SHP` | `T` | Prefijo `NIB` + 13 dígitos | 16 | `OCI/ID/CNE/T/NIB<13 dígitos>` |

> **⚠️ CAMBIO CRÍTICO (2024-2026):** El formato anterior con puntos y guiones (`nn.nnn.nnn.n-nnn.nnn`, 15 dígitos) ha sido reemplazado. El nuevo formato NPWP es **16 dígitos sin separadores**, transmitido con prefijo `TIN` o `NPWP` adherido directamente al número. El Info Identifier es `CNE` (para importación) o `SHP` (para exportación), **no** `T/TN` ni `T/CI`.

**Estructura del NPWP (16 dígitos):**

| Posición | Significado |
|----------|-------------|
| 1-2 | Tipo de contribuyente |
| 3-10 | Número de registro |
| 11-13 | Código de oficina fiscal (KPP) |
| 14-16 | Número de sucursal (000 = sede) |

**Ejemplo OCI correcto (formato 2026):**
```
OCI/ID/CNE/T/TIN0123451234512345
OCI/ID/SHP/T/NPWP9876549876543210
```

**Ejemplo OCI con NIB:**
```
OCI/ID/CNE/T/NIB1234567890123
```

> **FORMATO ANTERIOR (OBSOLETO — NO USAR):**  
> ~~`OCI/ID/T/TN/01.234.567.8-901.000`~~ — Este formato de 15 dígitos con puntos y guiones ya no es aceptado por las autoridades indonesias.

**Reglas Críticas:**
- El NPWP es obligatorio para importaciones/exportaciones comerciales.
- Para envíos personales bajo el umbral *de minimis* (USD 3 por envío, regulación PMK 199/2019), puede no requerirse.
- Los 16 dígitos se transmiten **sin puntos, guiones ni espacios**.
- El prefijo `TIN` o `NPWP` se pega directamente antes del número (sin slash adicional).
- El Info Identifier refleja el rol de la parte: `CNE` para importador (destino Indonesia), `SHP` para exportador (origen Indonesia).
- La NIB (Nomor Induk Berusaha) puede complementar o reemplazar el NPWP en ciertos flujos regulatorios bajo el sistema OSS (Online Single Submission).

**Alertas de Rechazo:**

| Error | Descripción |
|-------|-------------|
| `OCI-ID-001` | NPWP/TIN faltante para envío comercial con destino Indonesia |
| `OCI-ID-002` | NPWP formato obsoleto (con puntos/guiones) detectado |
| `OCI-ID-003` | NPWP longitud incorrecta (debe ser 16 dígitos) |
| `OCI-ID-004` | Info Identifier incorrecto (debe usar `CNE` o `SHP`, no `T`) |

---

### 5.6 Emiratos Árabes Unidos — PLACI (UAE NAIC)

**Autoridad:** UAE National Advance Information Center (NAIC) — Federal Decree Law No. 22/2018, Resolution No. 15/2019  
**Aplica a:** Toda carga aérea importada, exportada, en tránsito o transferida desde/vía/a EAU.  
**Vigencia:** PLACI Go-Live efectivo **02 abril 2025**. HS Codes obligatorios desde **29 febrero 2024**.

#### 5.6.1 Elementos PLACI Obligatorios (FWB y FHL)

| # | Elemento | Ubicación | Requisito |
|---|----------|-----------|-----------|
| 1 | MAWB / HAWB number | AWB / HBS | Obligatorio |
| 2 | Total number of pieces | AWB / HBS | Obligatorio |
| 3 | Total weight | AWB / HBS | En KG |
| 4 | Specific goods description | RTD /NG o TXT | **Precisa y verificable** (ver §5.6.3) |
| 5 | Shipper name | SHP /NM | Nombre del expedidor **real** (no forwarder) |
| 6 | Shipper address | SHP /AD + /CI + /CO | Dirección completa, no del forwarder |
| 7 | Consignee name | CNE /NM | Nombre del destinatario **real** |
| 8 | Consignee address | CNE /AD + /CI + /CO | Para importaciones, debe ser dirección en UAE |
| 9 | **HS Code (6 dígitos mínimo)** | RTD /NH (FWB) o HTS (FHL) | Validado contra WCO HS Code list. Se aceptan 8-10 dígitos pero solo se validan los primeros 6 |

#### 5.6.2 HS Codes para UAE

**Envíos directos:** El HS Code se proporciona en RTD del FWB con identificador `/NH`:
```
RTD/1/P6/K45/CQ/W142/R14.88/T2112.96
/NG/FLOWERS
/2/ND/K100/CMT105-52-26/10
/3/NV/MC0.85
/4/NH/060311
/5/NH/060313
/6/NH/060314
```

**Envíos consolidados:** El HS Code se proporciona en FHL con identificador `HTS`:
```
FHL/4
MBI/000-000000DUMDUM/T1K9
HBS/0000000000/DUMDUM/1/K9/1/IVERMECTIN MEDI
TXT/IVERMECTIN
HTS/293890
```

> Si hay más HS codes de los que caben en el FWB/FHL, se proporcionan los más significativos por peso o volumen.

#### 5.6.3 Guía de Descripción de Mercancías (UAE PLACI)

UAE NAIC aplica criterios **extremadamente estrictos** en la descripción de mercancías. Consultar la tabla de §6 para términos válidos vs inválidos. Adicionalmente para UAE:

**Información del Trader (Shipper/Consignee) — Requisitos NAIC:**
- El nombre debe ser del **expedidor/destinatario real** (ultimate shipper/consignee). No se acepta nombre de carrier, freight forwarder o consolidador.
- Para individuos: nombre completo (mínimo nombre + apellido), idealmente igual al documento de identidad.
- Para empresas: nombre completo de la empresa, idealmente igual a la licencia de registro.
- No se aceptan valores placeholder: `TBD`, `TBC`, `Unknown`, números, direcciones, símbolos.
- La dirección del consignee para importaciones **debe estar ubicada en UAE**.
- ZIP/Postal code no puede ser `123`, `00` u otro valor placeholder.
- Teléfono de contacto no puede ser `00000000`.

#### 5.6.4 Self-Filing (Express Couriers)

Los courier express que deseen auto-declarar (self-file) HAWB data:
- Deben obtener aprobación previa de NAIC y de la aerolínea.
- El MAWB debe llevar el código SPH `SFL` (Self-Filed).
- El EORI/identificador del courier debe estar en OCI del FWB.

---

### 5.7 Bangladesh — BIN y Declared Customs Value

**Autoridad:** Bangladesh Customs Authority / National Board of Revenue  
**Aplica a:** Toda carga aérea con destino Bangladesh (DAC).

#### 5.7.1 Declared Value for Customs (DCV)

Desde agosto 2019, es **obligatorio** declarar el valor aduanero en el AWB electrónico:
- **Envíos directos:** DCV en el CVD del FWB (MAWB):
  ```
  CVD/BDT//PP/NVD/1500.00/XXX
  ```
- **Consolidaciones y courier:** DCV en el CVD de cada FHL (HAWB).
- **NCV no es aceptado.** Si no hay valor, usar `0` (cero).
- La moneda e importe deben coincidir con la factura comercial adjunta.
- El valor declarado inicialmente es **final** — Bangladesh Customs no permite enmiendas.

#### 5.7.2 BIN (Business Identification Number)

Desde julio 2023 (General Order 23/2023), el **BIN** del consignee/notify party es obligatorio:

| Nivel | Método | Formato |
|-------|--------|---------|
| FWB (directo y consolidación) | Consignee Account Code | `CNE/<BIN>` |
| FHL (consolidación) | OCI Line | `OCI/BD/NFY/T/BIN<9 dígitos>-<4 dígitos>` |

**Formato BIN:** 9 dígitos numéricos + guión + 4 dígitos numéricos = `XXXXXXXXX-XXXX`

Si el consignee o notify party es persona física sin BIN, se proporciona el National ID Number en su lugar.

**Ejemplo OCI en FHL:**
```
OCI/BD/NFY/T/BIN123456789-0001
```

#### 5.7.3 Courier Shipments (Bangladesh)

- Usar código SPH `COU` para identificar como envío courier.
- El Courier AIN number del consignee debe proporcionarse en el campo Account Number del CNE:
  ```
  CNE/101189445
  /DHL WORLDWIDE EXPRESS BD LTD
  /HAZRAT SHAHJALAL INTL AIRPORT
  /DHAKA
  /BD/00000
  ```

---

### 5.8 Arabia Saudita — ZATCA

**Autoridad:** ZATCA (Zakat, Tax and Customs Authority)  
**Aplica a:** Consolidaciones con destino Arabia Saudita (JED, RUH, DMM).

**Requisito:** Todo freight forwarder que acepte consolidaciones con destino Arabia Saudita debe estar **registrado como Authorized Freight Agent** en el portal ZATCA.

El número de registro del FF se proporciona en el Account Number del CNE en el FWB:
```
CNE/101189445
/ALI ISSA
/AIRPORT RD
/RIYADH
/SA/00000
```

> **Penalización:** FF no registrados en ZATCA **no pueden transportar consolidaciones** a Arabia Saudita.

---

### 5.9 Marruecos — Trade Register + HS Code

**Autoridad:** Morocco Customs Authority  
**Aplica a:** Toda carga terminando en Marruecos (CMN, RBA).

#### 5.9.1 Consignee Trade Register Number

Obligatorio en OCI del FWB:
- **Empresa pública/privada (S.A., SARL, etc.):**
  ```
  OCI/MA/CNE/T/TRADE REGISTER NUMBER 0XX0XXXX
  ```
  (solo dígitos; 0=cero, X=cualquier otro número)

- **Consignee no corporativo:**
  ```
  OCI/MA/CNE/T/000000000000000
  ```
  (15 ceros)

#### 5.9.2 HS Code (4 dígitos mínimo)

El código HS de 4 dígitos es obligatorio para todos los envíos:
- **Directos:** En FWB (MAWB), RTD `/NH`.
- **Consolidaciones:** En FWB **y** FHL (MAWB y HAWB).

> **⚠️ PENALIZACIÓN:** Cualquier modificación posterior al AWB (rate, payment mode, shipper/consignee, destino, detalles de vuelo, other charges, tipo de agente, cargo details) incurre en **multa regulatoria** de las autoridades marroquíes. Se requiere presentar el AWB anterior y actualizado + factura + Import Commitment.

---

### 5.10 Turquía — HS Code

**Autoridad:** Turkey Customs  
**Aplica a:** Toda carga con destino Turquía (IST).

HS Code obligatorio en RTD del FWB/FHL, identificador `/NH`:
```
RTD/1/P10/K3259.50/W3259.50
/NG/GENERAL CARGO
/2/ND/K79/CMT57-62-97/3
/3/NV/MC1.03
/4/NH/798135
```

---

### 5.11 Jordania — Teléfono del Consignee

**Autoridad:** Jordan Customs  
**Aplica a:** Toda carga con destino Jordania (AMM).

**Requisito:** El teléfono del consignee es obligatorio en el FWB/FHL:
```
CNE
/EXPEDITORS INTERNATIONAL- JORDAN
/ZAHRAN ST
/AMMAN
/JO/11180/TE/0096265500100/
```

---

### 5.12 Sri Lanka — Declared Customs Value

**Autoridad:** Sri Lankan Customs Authority  
**Aplica a:** Toda carga con destino Sri Lanka (CMB). Vigente desde **1 agosto 2023**.

**Requisito:** DCV obligatorio — NCV **no es aceptado**.

| Tipo de Envío | Formato |
|---------------|---------|
| Directo | CVD en FWB: `CVD/USD//PP/NVD/1500/XXX` |
| Consolidación | CVD en cada FHL: `CVD/USD//PP/NVD/1000/XXX` |

**Reglas:**
- El DCV no puede ser `NCV`. Si no hay valor, usar `0` (cero).
- La moneda ISO y el monto deben coincidir con la factura adjunta.

---

### 5.13 Kenia — PIN, HS Code, COU

**Autoridad:** Kenya Customs (NBO)  
**Aplica a:** Toda carga con destino Kenia.

#### Requisitos para todos los envíos:
1. **Datos completos del Consignee:**
   - Dirección (P.O. Box)
   - Teléfono
   - **PIN number** (Personal Identification Number)

2. **HS Code** obligatorio en RTD `/NH` del FWB.

#### Courier Shipments:
- Código SPH `COU` obligatorio.
- Courier PIN del consignee en el Account Number del CNE:
  ```
  CNE/101189445
  /ACME COURIERS
  /100 LORIAN ROAD
  /NAIROBI/SHAURI MOYO
  /KE/99999
  ```

---

### 5.14 Canadá — Descripción Detallada (CBSA)

**Autoridad:** Canada Border Services Agency (CBSA)  
**Aplica a:** Toda carga con destino Canadá (YYZ y otros).

**Requisito clave:** La descripción de mercancía debe ser en **lenguaje simple** y lo suficientemente detallada para que el CBSA identifique las características de la carga.

**Reglas CBSA:**
- No incluir información irrelevante en el campo de descripción (cantidad, tipo de embalaje, disclaimers del carrier).
- Si la mercancía es **usada**, especificar `USED` antes de la descripción. De lo contrario se asume nueva.
- Para consolidaciones (donde se esperan HAWBs/Supplementary Cargo Report), se aceptan descripciones genéricas: `FAK`, `SLC`, `CONSOLIDATED`, `GENERAL MERCHANDISE`.

---

### 5.15 Alemania — FRA-OS (Import Platform Frankfurt)

**Autoridad:** EU Regulation No. 952/2013; Frankfurt Airport Authority  
**Aplica a:** Toda carga con destino Frankfurt (FRA). Vigente desde **17 enero 2022**.

**Requisito:** FFM, FWB y FHL deben ser **completos, correctos y oportunos** para cada envío a FRA.

**Especificidades:**
- Los GSA/CSP de origen deben proporcionar una **copia anticipada del manifiesto de consolidación** con asignación de HAWB por BUP (lista de qué HAWBs van en cada ULD).
- Información requerida: vuelo/fecha, lista de AWBs, detalles de HAWB incluyendo asignación de carga por ULD.
- Para **Intact Through Units (TRU)** en tránsito por FRA, aplican los mismos requisitos.
- Mensajes incompletos o incorrectos resultan en **retrasos de despacho y cargos adicionales**.

---

### 5.16 Otros Países con Requisitos Especiales

| País | Código | Requisito | Campo OCI / Método | Formato / Notas |
|------|--------|-----------|---------------------|-----------------|
| **Japón** | JP | NACCS Import Declaration | `OCI/JP/T/CI/<code>` | Código de importador NACCS |
| **Corea del Sur** | KR | Korean Customs ID (P/C Number) | `OCI/KR/T/CI/<pcn>` | Formato: `Pn...` o `Cn...` |
| **India** | IN | IEC (Import Export Code) | `OCI/IN/T/CI/<iec>` | 10 dígitos alfanuméricos |
| **India** | IN | GSTIN | `OCI/IN/T/TN/<gstin>` | 15 caracteres |
| **Brasil** | BR | CNPJ | `OCI/BR/T/CI/<cnpj>` | `nn.nnn.nnn/nnnn-nn` (14 dígitos) |
| **Brasil** | BR | CPF (persona física) | `OCI/BR/T/CI/<cpf>` | `nnn.nnn.nnn-nn` (11 dígitos) |
| **México** | MX | RFC | `OCI/MX/T/CI/<rfc>` | 12-13 caracteres alfanuméricos |
| **Australia** | AU | ABN | `OCI/AU/T/CI/<abn>` | 11 dígitos |
| **Singapur** | SG | UEN | `OCI/SG/T/CI/<uen>` | 9-10 caracteres alfanuméricos |
| **Filipinas** | PH | HS Code + BL Nature Code | RTD `/NH` (directo) | HS code auto-genera BL Code (23/24/28) |
| **Israel** | IL | Importer ID (opcional) | `OCI/IL/CNE/T/<9 dígitos>` | 9 dígitos |
| **Bielorrusia** | BY | Invoice + HS Code | ACC/GEN + RTD `/NH` | Invoice #, fecha, valor + HS (mín 4 dígitos) |
| **Pakistán** | PK | MAWB=FF, HAWB=original CNE | FWB/FHL | Consolidaciones: MAWB≠HAWB consignee, penalización si iguales |
| **Líbano** | LB | COU + Courier PIN | `CNE/<PIN>` + SSR/COU | Para courier shipments |
| **Qatar** | QA | SCC + datos precisos | SSR/COU + datos CNE | COU para courier; datos CNE deben coincidir con AWB físico |
| **Seychelles** | SC | FHL obligatorio | FHL vía aerolínea | Courier: `CNE/TIN <company_code>` |
| **Nigeria** | NG | Customs Declaration | `OCI/NG/I/AC/<code>` | Formato NCS |
| **Sudáfrica** | ZA | Custom Client Number | `OCI/ZA/T/CI/<ccn>` | Alfanumérico |
| **UK** | GB | EORI (post-Brexit) | `OCI/GB/T/EI/<eori>` | `GB` + hasta 15 chars |
| **Tailandia** | TH | Tax ID | `OCI/TH/T/CI/<tax_id>` | 13 dígitos |
| **Vietnam** | VN | Tax Code | `OCI/VN/T/CI/<tax>` | 10-14 dígitos |

---

## 6. DESCRIPCIONES DE CARGA: TÉRMINOS VÁLIDOS VS INVÁLIDOS

Esta sección es **crítica** para cumplimiento ACAS (TSA/CBP), ICS2 (EU) y regulaciones aduaneras globales. La descripción de mercancía en RTD /NG, TXT y HBS debe ser **precisa, específica y verificable**.

### 6.1 Principio General

> **La descripción debe ser suficientemente precisa para que un inspector pueda determinar la naturaleza exacta de la mercancía sin abrir el paquete.**

### 6.2 Términos INVÁLIDOS (Causarán Rechazo o DNL)

> **Fuente:** Basado en ACAS/TSA (USA), ICS2 (EU), UAE PLACI/NAIC, CBSA (Canadá), y mejores prácticas IATA. Lista no exhaustiva.

| Término Rechazado | Razón | Alternativa Válida |
|-------------------|-------|-------------------|
| `CONSOLIDATED` | No describe mercancía (excepto si HAWBs siguen) | Desglosar en houses con descripción individual |
| `SPARE PARTS` / `MACHINE PARTS` | Genérico — ¿de qué? | `NEW AUTOMOBILE BRAKE PADS`, `OIL PUMPS`, `SEALS` |
| `PARTS` | Genérico | `ALUMINUM MACHINED ENGINE VALVES` |
| `AUTO PARTS` / `AUTO` / `AUTOMOBILES` | Genérico | `AIR FILTERS`, `AUTOMOTIVE WINDSHIELD`, `(Brand) (Model)` |
| `SAMPLES` | No indica qué tipo | `TEXTILE FABRIC SAMPLES FOR TESTING`, `SHAMPOO SAMPLE` |
| `EQUIPMENT` / `INDUSTRIAL EQUIPMENT` | Genérico | `OIL WELL EQUIPMENT`, `POULTRY EQUIPMENT` |
| `ELECTRONICS` / `ELECTRONIC GOODS` | Genérico | `MOBILE TELEPHONES`, `DVD PLAYERS`, `VIDEO GAME CONSOLES` |
| `GOODS` / `CONSUMER GOODS` | Totalmente genérico | Descripción clara y concisa del artículo |
| `MERCHANDISE` / `GENERAL MERCHANDISE` | Totalmente genérico | Solo aceptable en consolidaciones (CBSA) |
| `PERSONAL EFFECTS` / `HOUSEHOLD GOODS` | Genérico | `USED HOUSEHOLD ITEMS - CLOTHING AND BOOKS` (solo si son efectos personales usados) |
| `GIFTS` / `NOVELTY ITEMS` | Genérico | `CERAMIC DECORATIVE VASES`, `REMOTE CONTROL CARS`, `PICTURE FRAMES` |
| `MACHINERY` / `MACHINES` | Genérico — ¿tipo? | `SEWING MACHINES`, `PRINTING MACHINES`, `METAL WORKING MACHINERY` |
| `TOOLS` | Genérico — ¿tipo? | `HAND TOOLS`, `POWER TOOLS`, `INDUSTRIAL TOOLS` |
| `ACCESSORIES` | Genérico | `HAIR ELASTICS`, `SUNGLASSES`, `SOCKS` |
| `HARDWARE` | Ambiguo | `STAINLESS STEEL HEX BOLTS M10X50` |
| `SOFTWARE` | Ambiguo | `USB DRIVES CONTAINING CAD SOFTWARE LICENSES` |
| `CHEMICALS` (hazardous o non-hazardous) | Peligrosamente genérico | Nombre químico real: `ALUMINUM POTASSIUM SULFATE`, `METHYL ALCOHOL` |
| `MATERIALS` | Genérico | `WOVEN POLYESTER FABRIC ROLLS` |
| `DOCUMENTS` / `DOCS` / `DOX` | Insuficiente | Tipo de documento: `PASSPORT`, `IDENTITY CARD`, `CIVIL RECORDS DOCUMENTS` |
| `FOODSTUFF` / `FOOD` / `MEAT` / `FISH` / `SNACKS` | Genérico | `FROZEN ATLANTIC SALMON FILLETS`, `FRESH ORANGES`, `CANNED TUNA` |
| `CLOTHING` / `GARMENTS` / `APPAREL` / `WEARING APPAREL` | Genérico | `WOMEN DRESSES`, `MEN SHIRTS`, `BOY JACKETS`, `SHOES` |
| `MISC` / `MISCELLANEOUS` | Totalmente genérico | No aceptado nunca |
| `FAK` (Freight All Kinds) | Agrupación tarifaria, no aduanera | Solo aceptable en consolidaciones (CBSA) |
| `SAID TO CONTAIN` (STC sola) | No es descripción | Agregar descripción real después de STC |
| `AS PER INVOICE` / `AS PER ATTACHED` / `REFER TO ATTACHED` | Referencia, no descripción | Incluir la descripción real |
| `AS ORDERED` | No describe nada | Descripción específica del producto |
| `ANIMALS` | Genérico | `HORSE`, `CAT`, `DOG`, `BOVINE` (especificar clasificación) |
| `APPLIANCES` | Genérico | `REFRIGERATOR`, `MICROWAVE OVEN`, `COFFEE MACHINES` |
| `CAPS` | Ambiguo | `BASEBALL CAPS`, `BLASTING CAPS`, `BOTTLE CAPS`, `HUB CAPS` |
| `CLEANING PRODUCTS` | Genérico | `DETERGENTS`, `MOPS`, `WINDOW CLEANER` |
| `CRAFTS` / `HANDICRAFTS` | Genérico | `PIPE CLEANERS`, `CONSTRUCTION PAPER`, `DECORATIVE OBJECTS MADE BY HAND` |
| `FILM` | Ambiguo | `CAMERA FILM`, `POLYETHYLENE FILM`, `POLYESTER FILM` |
| `FLOORING` | Genérico | `WOOD FLOORING`, `CARPET`, `CERAMIC TILE`, `MARBLE FLOORING` |
| `IRON AND STEEL` / `METAL` | Genérico | `IRON PIPES`, `STEEL PLATES`, `ALUMINUM INGOTS`, `ROUND BARS OF STEEL` |
| `LEATHER ARTICLES` | Genérico | `LEATHER HANDBAGS`, `LEATHER JACKETS`, `SADDLES` |
| `MEDICAL SUPPLIES` / `BIOLOGICALS` | Genérico | `MEDICAL GLOVES`, `SYRINGES`, `DIALYSIS MACHINE`, `BLOOD PLASMA` |
| `MEDICATION` / `PHARMACEUTICALS` | Genérico | `INSULIN`, `ALLERGY MEDICATION` (nombre específico) |
| `OIL` | Ambiguo | `MINERAL OIL`, `MOTOR OIL`, `OLIVE OIL` |
| `ONLINE RETAILER` / `ONLINE RETAILER SHIPMENT` | No es descripción | Descripción específica del contenido |
| `PACKAGING` / `BOXES` / `CARTONS` | Genérico | `CORRUGATED CARDBOARD BOXES`, `MAILING ENVELOPES`, `PLASTIC BUBBLE WRAP` |
| `PAPER` | Genérico | `PAPER ROLLS`, `PRINTING PAPER`, `PAPER TOWEL` |
| `PLANTS` / `FLOWERS` / `CUTTINGS` | Genérico | `TULIPS`, `CEDAR SAPLINGS`, `TOMATO PLANTS` |
| `PLASTIC GOODS` / `INDUSTRIAL PLASTICS` | Genérico | `PLASTIC KITCHENWARE`, `PLASTIC TOYS`, `PLASTIC SHEETS` |
| `POWDER` | Ambiguo + posible DG | `FLEA POWDER`, `BABY POWDER`, `CORN STARCH` |
| `RUBBER ARTICLES` | Genérico | `RUBBER HOSES`, `TIRES`, `RUBBER CONVEYOR BELTS` |
| `SCRAP` | Genérico | `PLASTIC SCRAP`, `ALUMINUM SCRAP`, `IRON SCRAP` |
| `SPORTING GOODS` | Genérico | `HOCKEY STICKS`, `SOCCER BALLS`, `GOAL NETS` |
| `STATIONERY` / `DIDACTIC ARTICLES` | Genérico | `PENCILS`, `SMART BOARDS`, `BOOKS`, `LUXURY PENS` |
| `STEEL` | Genérico | `STEEL PLATES`, `STEEL COILS` |
| `SUPPLEMENTS` | Genérico | `VITAMINS`, `PROTEIN POWDER` (especificar componentes) |
| `SUPPLIES` / `PROMOTIONAL ITEMS` | Genérico | Descripción específica del artículo |
| `TEXTILES` | Genérico | `CARPETS/RUGS`, `SILK`, `FINISHED FABRIC ROLLS` |
| `TILES` | Genérico | `CERAMIC TILES`, `MARBLE TILES` (tipo + modelo + origen) |
| `TOILETRIES` / `BATHROOM PRODUCTS` / `SANITARY GOODS` | Genérico | `TOWELS`, `TOOTHBRUSHES`, `SHAMPOO` |
| `TOYS` / `GAMES` | Genérico | `WOODEN CHILDREN TOYS`, `BOARD GAMES`, `CONSOLE GAMES` |
| `VEHICLES` | Genérico | `CARS`, `TRUCKS`, `TRACTORS`, `BICYCLES` (tipo + marca) |
| `WIRES` | Genérico | `STEEL WIRE`, `COPPER WIRE`, `AUTO HARNESS` |
| `WOOD` | Genérico | `HEMLOCK LOGS WITH BARK`, `EMPTY WOOD PALLETS`, `CUT LUMBER` |
| `BAZAAR GOODS` | Genérico | Descripción específica de cada artículo |
| Descripciones indescifrables (`RED SMOOTH MODULAR`, `CDRE`, `D6T PARTS`) | Incomprensible | Descripción clara en inglés estándar |
| Solo número de serie (`SN HAFR997MJ02041010`) | No es descripción de mercancía | Descripción del artículo + número de serie |

### 6.3 Términos VÁLIDOS y Patrones Aceptados

| Patrón | Ejemplo |
|--------|---------|
| [Estado/Condición] + [Material] + [Producto específico] | `NEW RUBBER AUTOMOTIVE TIMING BELTS` |
| [Material] + [Tipo] + [Uso] | `STAINLESS STEEL SURGICAL INSTRUMENTS` |
| [Tipo] + [Modelo/Marca] + [Especificación] | `HYDRAULIC CYLINDER MODEL HC-500 FOR EXCAVATOR` |
| [Producto] + [Composición] + [Cantidad descriptor] | `VITAMIN C TABLETS 1000MG 100 COUNT BOTTLES` |
| [Categoría específica] + [Detalle] | `PRINTED CIRCUIT BOARDS FOR LED DISPLAYS` |
| STC + [Descripción Real] | `STC 500 PAIRS LEATHER SAFETY WORK BOOTS` |

### 6.4 Términos que Disparan Revisión Adicional (No Rechazo Automático pero Sí Escrutinio)

| Término | Razón |
|---------|-------|
| `LITHIUM` (cualquier variante) | Regulación DG — verificar clase UN |
| `BATTERY` / `BATTERIES` | Puede requerir SSR/DGR y sección IX |
| `POWDER` | Posible regulación de sustancias |
| `LIQUID` | Verificar DG class |
| `AEROSOL` | UN 1950 — requiere documentación DG |
| `MAGNETIC` | Verificar campo magnético |
| `GAS` | DG Class 2 |
| `RADIOACTIVE` | Clase 7 — documentación extrema |
| `VACCINE` / pharma | Cadena de frío, permisos |
| `DUAL USE` | Controles de exportación |
| `AMMUNITION` / `WEAPON` | Requiere permisos militares |

---

## 7. CÓDIGOS DE ERROR FNA POR SEGMENTO

Los mensajes **FNA** (Functional Nack / Error Message) se emiten cuando un FWB o FHL no cumple las validaciones del sistema de la aerolínea. Cada código sigue el formato `<SEGMENTO><NIVEL>` donde:
- **0xxx** = Error de validación (datos inválidos o faltantes)
- **1xxx** = Corrección aplicada (datos corregidos automáticamente por la aerolínea)
- **9xxx** = Error de validación cruzada o lógica de negocio

> **NOTA IMPORTANTE:** Los códigos de error varían según la aerolínea/sistema. Los mostrados aquí se basan en el estándar Cargo-IMP y en las implementaciones de aerolíneas de referencia (e-AWB SOP). Cada carrier puede tener códigos propietarios adicionales.

### 7.1 Errores AWB — Air Waybill Identification

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `AWB0010` | Invalid or missing AWB consignment details | General AWB |
| `AWB0015` | Invalid or missing AWB details – airline prefix | Airline Prefix [1A] |
| `AWB0020` | Invalid or missing AWB details – AWB number | AWB Serial Number [1B] |
| `AWB0025` | Invalid AWB details – airport code of origin | Airport/City Code of Origin |
| `AWB0030` | Invalid or missing AWB details – airport code of destination | Airport/City Code of Destination |
| `AWB0035` | Invalid or missing AWB consignment details – shipment description code | |
| `AWB0040` | Invalid or missing AWB details – number of pieces | Total Number of Pieces [22J] |
| `AWB0045` | Invalid or missing AWB details – unit of weight | Weight Code [22C] |
| `AWB0050` | Invalid or missing AWB details – total gross weight | Total Gross Weight [22K] |
| `AWB9030` | Invalid airport or port code at destination | [18] |
| `AWB9040` | Airport of destination between FOH and FWB is not matched | Cross-validation |
| `AWB9050` | Airport of origin/destination between FWB and Master Consignment of FHL not matched | FWB↔FHL |
| `AWB9060` | AWB number already used | Duplicado |
| `AWB9070` | Weight between FWB and FHL is not matched | FWB↔FHL |
| `AWB9080` | FWB origin must not match FHL destination | Lógica inversa |
| `AWB9090` | Origin must not match destination | Mismos puertos |

### 7.2 Errores SHP — Shipper Details

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `SHP0010` | Invalid or missing shipper details | [2] General |
| `SHP0015` | Invalid or missing shipper details – account number | Shipper Account [2] |
| `SHP0020` | Invalid or missing shipper details – company name | Shipper Name [2] |
| `SHP0025` | Invalid or missing shipper details – street address | Shipper Address [2] |
| `SHP0030` | Invalid or missing shipper details – place | Shipper City [2] |
| `SHP0035` | Invalid or missing shipper details – state or province | State/Province [2] |
| `SHP0040` | Invalid or missing shipper details – ISO country code | Country Code [2] |
| `SHP0045` | Invalid or missing shipper details – postcode | Postal Code [2] |
| `SHP0050` | Invalid or missing shipper details – contact identifier | Contact Type [2] |
| `SHP0055` | Invalid or missing shipper details – contact number | Contact Number [2] |
| `SHP9010` | Shipper blacklisted | Screening list |

### 7.3 Errores CNE — Consignee Details

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `CNE0010` | Invalid or missing consignee details | [4] General |
| `CNE0015` | Invalid or missing consignee details – account number | Consignee Account [4] |
| `CNE0020` | Invalid or missing consignee details – company name | Consignee Name [4] |
| `CNE0025` | Invalid or missing consignee details – street address | Consignee Address [4] |
| `CNE0030` | Invalid or missing consignee details – place | Consignee City [4] |
| `CNE0035` | Invalid or missing consignee details – state or province | State/Province [4] |
| `CNE0040` | Invalid or missing consignee details – country code | Country Code [4] |
| `CNE0045` | Invalid or missing consignee details – postcode | Postal Code [4] |
| `CNE0050` | Invalid or missing consignee details – contact person | Contact Person [4] |
| `CNE0055` | Invalid or missing consignee details – contact number | Contact Number [4] |
| `CNE9010` | Consignee blacklisted | Screening list |
| `CNE9035` | **Invalid or missing consignee state/province for USA** | State for US [4] |
| `CNE9045` | **Invalid or missing consignee Zip Code for USA** | ZIP Code for US [4] |
| `CNE9135` | **Invalid or missing consignee state/province for Canada** | State for CA [4] |
| `CNE9145` | **Invalid or missing consignee Post Code for Canada** | Post Code for CA [4] |
| `CNE9245` | **Invalid or missing consignee Post Code for EU country** | Post Code for EU [4] |
| `CNE9910` | Consignee country code and port code mismatch | Cross-validation |

### 7.4 Errores AGT — Agent Details

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `AGT0010` | Invalid or missing agent details | [7] General |
| `AGT0015` | Invalid or missing agent details – account number | Account Number [8] |
| `AGT0020` | Invalid or missing agent details – IATA agent code | Agent IATA Code [7] |
| `AGT0025` | Invalid or missing agent details – IATA agent CASS address | Agent CASS Address [7] |
| `AGT0030` | Invalid or missing agent details – participant identifier | [6] |
| `AGT0035` | Invalid or missing agent name | Issuing Carrier Agent Name [6] |
| `AGT0040` | Invalid or missing agent address | Issuing Carrier Agent Address [6] |
| `AGT9010` | **Agent blacklisted** | Screening list |

### 7.5 Errores FLT — Flight Bookings

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `FLT0010` | Invalid or missing flight booking details | [19A-B] |
| `FLT0015` | Invalid or missing flight booking details – carrier code | Carrier Code [19A-B] |
| `FLT0020` | Invalid or missing flight booking details – flight number | Flight Number [19A-B] |
| `FLT0025` | Invalid or missing flight booking details – date | Flight Date [19A-B] |

### 7.6 Errores CVD — Charge Declarations

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `CVD0010` | Invalid or missing charge declarations details | General CVD |
| `CVD0015` | Invalid or missing charges currency code | Currency [12] |
| `CVD0020` | Invalid or missing charge declaration detail – charge code | Charges Codes [13] |
| `CVD0025` | Invalid or missing PP or CC of weight or valuation | Weight/Valuation [14A-B] |
| `CVD0030` | Invalid or missing PP or CC for other charges | Other Charges [15A-B] |
| `CVD0035` | Invalid or missing details – declared value for carriage | Declared Value Carriage [16] |
| `CVD0040` | Invalid or missing details – value for customs declaration | Declared Value Customs [17] |
| `CVD0045` | Invalid value for insurance declaration – XXX | Amount Insurance [20] |
| `CVD9025` | **Charges collect not accepted for the destination country** | Restriction destino |

### 7.7 Errores OTH — Other Charges

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `OTH0010` | Invalid or missing other charge details | General OTH |
| `OTH0015` | Invalid or missing other charge details – p/c indicator | PP/CC indicator |
| `OTH0020` | Invalid or missing other charge details – other charge code | Charge Code [23] |
| `OTH0025` | Invalid or missing other charge details – entitlement code | Entitlement [23] |
| `OTH0030` | Invalid or missing other charge details – charge amount | Amount [23] |
| `OTH9010` | **Invalid or non-standard other charge code** | Validación negocio |
| `OTH9020` | **Mandatory miscellaneous charges missing** | Cargos obligatorios |

### 7.8 Errores PPD/COL — Prepaid/Collect Charge Summary

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `PPD0010` | Invalid or missing prepaid charge summary details | General PPD |
| `PPD0020` | Invalid or missing PP charge details – total weight charge | [24A] |
| `PPD0025` | Invalid or missing PP charge details – valuation charge | [25A] |
| `PPD0030` | Invalid or missing prepaid charge details – tax charge | [26A] |
| `PPD0035` | Invalid or missing PP detail – total other charge due agent | [27A] |
| `PPD0040` | Invalid or missing PP details – total other charge due carrier | [28A] |
| `PPD0045` | Invalid or missing PP summary – total charge amount | [30A] |
| `COL0010` | Invalid or missing collect charge summary details | General COL |
| `COL0020` | Invalid or missing CC detail – total weight charge | [24B] |
| `COL0025` | Invalid or missing CC detail – valuation charge | [25B] |
| `COL0030` | Invalid or missing collect charge details – tax | [26B] |
| `COL0035` | Invalid or missing CC detail – total other charge due agent | [27B] |
| `COL0040` | Invalid or missing CC detail – total other charge due carrier | [28B] |
| `COL0045` | Invalid or missing CC summary – total charge amount | [30B] |

### 7.9 Errores OCI — Other Customs Information

| Código | Descripción |
|--------|-------------|
| `OCI0010` | Invalid or missing other customs information details |
| `OCI0015` | Invalid or missing OCI – ISO country code |
| `OCI0020` | Invalid or missing OCI – information identifier |
| `OCI0025` | Invalid or missing OCI – customs information identifier |
| `OCI0030` | Invalid or missing OCI – supplementary customs information |

### 7.10 Errores ISU — Carrier's Execution

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `ISU0010` | Invalid or missing carrier's execution details | [32A-C] |
| `ISU0015` | Invalid or missing execution details – AWB issue day | [32A] |
| `ISU0020` | Invalid or missing execution details – AWB issue month | [32A] |
| `ISU0025` | Invalid or missing execution details – AWB issue year | [32A] |
| `ISU0030` | Invalid or missing execution details – place or airport/city code | [32B] |
| `ISU0035` | Invalid or missing execution details – authorisation/signature | [32C] |

### 7.11 Errores COR — Customs Origin

| Código | Descripción | Campo AWB |
|--------|-------------|-----------|
| `COR0010` | Invalid or missing customs origin code details | [21A] |

### 7.12 Errores FWB — Procesamiento General del Mensaje

| Código | Descripción |
|--------|-------------|
| `FWB0010` | Unable to use the FWB data (cannot update carrier's system) |
| `FWB0015` | AWB already tendered or created in carrier's system (too late) |
| `FWB0020` | Originator's TTY address not recognised by carrier |
| `FWB0025` | Originator TTY address recognised but not configured for this message type |
| `FWB0030` | Carrier does not recognise airport of origin |
| `FWB0035` | Carrier does not recognise airport of destination |
| `FWB0040` | **FWB version number not supported by carrier** |
| `FWB0045` | FWB data differs significantly from booking |
| `FWB0050` | FWB routing differs from booking |
| `FWB0055` | FWB charges collect not allowed to this destination |
| `FWB0060` | FWB invalid airline account number |
| `FWB0065` | FWB rejected – AWB blacklisted |
| `FWB0075` | Pieces in rate line ≠ total dimension number of pieces |
| `FWB0080` | ULD details mandatory for this rate line rate class code |
| `FWB0085` | Per kilo rate can exist only if rate line B (Basic rate) exists |
| `FWB0090` | This AWB number has not been allocated |
| `FWB0095` | **Invalid or no end of message character** |

### 7.13 Errores NFY — Also Notify

| Código | Descripción |
|--------|-------------|
| `NFY0010` | Invalid or missing also notify details |
| `NFY0015` | Invalid or missing notify details – name |
| `NFY0020` | Invalid or missing notify details – street address |
| `NFY0025` | Invalid or missing notify details – place |
| `NFY0030` | Invalid or missing notify details – state/province |
| `NFY0035` | Invalid or missing notify details – ISO country code |
| `NFY0040` | Invalid or missing notify details – postcode |
| `NFY9010` | **Also notify party blacklisted** |

### 7.14 Otros Errores

| Código | Descripción |
|--------|-------------|
| `MSC0010` | SSR-NFY-OSI-COR combined length too long |
| `CER0010` | Invalid or missing shipper's certification details |
| `CER0015` | Invalid or missing shipper's certification – signature |
| `ACC0010` | Invalid or missing accounting information |
| `ACC0015` | Invalid or missing accounting details – information identifier |
| `ACC0020` | Invalid or missing accounting details – accounting information |
| `REF0010` | Invalid or missing sender reference details |
| `CDC0010` | Invalid or missing CC charges in destination currency details |

---

## 8. TABLAS COMPARATIVAS DE REQUISITOS ADUANEROS

### 8.1 Comparativa de Datos Obligatorios por País de Destino

| Dato | USA | EU (ICS2) | UAE | China | Egipto | Indonesia | Bangladesh | Marruecos | Turquía | Jordania | Sri Lanka | Kenia | UK |
|------|-----|-----------|-----|-------|--------|-----------|------------|-----------|---------|----------|-----------|-------|-----|
| Shipper Name | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M |
| Shipper Address | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M |
| Consignee Name | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M |
| Consignee Address | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M |
| ZIP/Postal Code | ✅ M | ✅ M | ✅ M | ✅ M | ✅ R | ✅ R | ✅ R | ✅ R | ✅ R | ✅ R | ✅ R | ✅ R | ✅ M |
| State/Province | ✅ M | — | — | — | — | — | — | — | — | — | — | — | — |
| HS Code | ✅ R | ✅ M(6+) | ✅ M(6+) | ✅ M(10) | ✅ R | ✅ M(6-10) | — | ✅ M(4+) | ✅ M | — | — | ✅ M | ✅ M(6+) |
| Goods Description | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M |
| EORI / Tax ID | — | ✅ M | — | ✅ M(USCI) | ✅ M(Ent.Code) | ✅ M(NPWP 16d) | ✅ M(BIN) | ✅ M(Trade Reg) | ✅ R(VKN) | — | — | ✅ R(PIN) | ✅ M(EORI) |
| ACID Number | — | — | — | — | ✅ M(19d) | — | — | — | — | — | — | — | — |
| DCV (Customs Value) | — | — | — | — | — | — | ✅ M | — | — | — | ✅ M | — | — |
| Shipper Phone | ✅ R | — | ✅ R | ✅ M | — | — | — | — | — | — | — | — | — |
| Consignee Phone | ✅ R | — | ✅ R | ✅ M | — | — | — | — | — | ✅ M | — | ✅ R | — |
| COU (courier) | — | — | — | — | — | — | ✅ M | — | — | — | — | ✅ M | — |
| SLAC (consolidated) | ✅ M | ✅ R | — | — | — | — | — | — | — | — | — | — | ✅ R |
| Screening Status | ✅ M | ✅ R | ✅ R | — | — | — | — | — | — | — | — | — | ✅ R |
| COR (EU Transit) | — | ✅ M* | — | — | — | — | — | — | — | — | — | — | — |

> **M** = Mandatory / **R** = Recommended or conditionally required / **—** = Not specifically required at message level  
> **(6+)** = Mínimo 6 dígitos / **(10)** = 10 dígitos exactos / **(4+)** = Mínimo 4 dígitos / **(16d)** = 16 dígitos sin separadores / **(19d)** = 19 dígitos  
> **✅ M*** = Obligatorio solo cuando la carga transita bajo régimen T1/T2 en la UE

### 8.2 Comparativa de Formatos de Códigos Fiscales/Empresariales

| País | Tipo ID | Longitud | Formato | Ejemplo |
|------|---------|----------|---------|---------|
| China | USCI | 18 | `[A-Z0-9]{18}` | `91310115MA1FL8UE23` |
| EU | EORI | 2 + hasta 15 | `<CC><alphanumeric>` | `DE123456789012345` |
| UK | EORI | 2 + hasta 15 | `GB<alphanumeric>` | `GB123456789000` |
| India | IEC | 10 | `[A-Z0-9]{10}` | `0505012345` |
| India | GSTIN | 15 | `nn[A-Z]{3}[A-Z0-9]{5}[A-Z][0-9][Z][A-Z0-9]` | `22AAAAA0000A1Z5` |
| Brasil | CNPJ | 14 | `nn.nnn.nnn/nnnn-nn` | `12.345.678/0001-95` |
| Brasil | CPF | 11 | `nnn.nnn.nnn-nn` | `123.456.789-09` |
| México | RFC | 12-13 | `[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}` | `XAXX010101000` |
| Indonesia | NPWP | 16 | `[0-9]{16}` (sin separadores, prefijo TIN/NPWP) | `TIN0123451234512345` |
| Egipto | ACID | 19 | `[0-9]{19}` (solo dígitos en OCI, sin prefijo ACID) | `1234567890123456789` |
| Bangladesh | BIN | 13 | `[0-9]{9}-[0-9]{4}` | `123456789-0001` |
| Marruecos | Trade Register | variado | Solo dígitos `0XX0XXXX` | `0120XXXX` |
| UAE | — | — | Sin Tax ID propio; usa HS Code + descripción precisa | — |
| Sri Lanka | DCV | — | Valor numérico en CVD (NCV no aceptado) | `1500.00` |
| Arabia Saudita | ZATCA Registration | variado | Registro de FF en portal ZATCA | En CNE Account Number |
| Australia | ABN | 11 | `nn nnn nnn nnn` | `53 004 085 616` |
| Corea | P/C Number | variado | `P/C + alfanumérico` | `P1234567890` |
| Japón | NACCS Code | variado | Alfanumérico | Depende del tipo |
| Turquía | VKN/TCKN | 10-11 | Solo dígitos | `1234567890` |
| Filipinas | TIN | 12 | `nnn-nnn-nnn-nnn` | `123-456-789-000` |
| USA | EIN | 9 | `nn-nnnnnnn` | `12-3456789` |

---

## 9. APÉNDICE: FORMATO DE CARACTERES Y SEPARADORES

### 9.1 Tabla Completa de Formatos por Campo

| Segmento | Campo | Tipo | Long. Mín | Long. Máx | Separador Previo | Notas |
|----------|-------|------|-----------|-----------|-------------------|-------|
| AWB | Prefix | n | 3 | 3 | `/` | Fijo 3 dígitos |
| AWB | Serial | n | 8 | 8 | `-` | Incluye check digit |
| AWB | Origin | a | 3 | 3 | (implícito) | IATA airport code |
| AWB | Destination | a | 3 | 3 | (implícito) | IATA airport code |
| AWB | Pieces | n | 1 | 4 | (implícito) | |
| AWB | Weight Code | a | 1 | 1 | (implícito) | `K` o `L` |
| AWB | Weight | n | 1 | 7.1 | (implícito) | Decimales opcionales |
| SHP/CNE | Name | m | 1 | 35 | `/NM` | |
| SHP/CNE | Address | m | 1 | 35 | `/AD` | Repetible (2 líneas) |
| SHP/CNE | City | m | 1 | 17 | `/CI` | |
| SHP/CNE | State | an | 0 | 9 | `/` | US=2(USPS), CA=2(province), AU=2-3(state). Hasta 9 chars |
| SHP/CNE | Postal Code | an | 0 | 9 | `/PO` | |
| SHP/CNE | Country | a | 2 | 2 | `/CO` | ISO 3166-1 alpha-2 |
| SHP/CNE | Contact | m | 1 | 25 | `/CT` | Prefijo `TE`/`FX`/`TL` |
| RTD | Rate Class | a | 1 | 1 | (implícito) | `M/N/Q/C/S/U/B/K/E/R` |
| RTD | Goods Description | m | 1 | 65 | `/NG` | Repetible (hasta 12 líneas numeradas) |
| RTD | HS Code | an | 6 | 15 | `/NH` | |
| OCI | Country Code | a | 2 | 2 | `/` | ISO 3166-1 |
| OCI | Info Identifier | a | 1 | 3 | `/` | `T`, `S`, `D`, `I`, `C` |
| OCI | Customs ID | a | 2 | 2 | `/` | `AE`, `CI`, `SM`, `EI`, `TE`, `RA`, etc. |
| OCI | Supplementary Info | m | 1 | 35 | `/` | Dato libre |
| HBS | HAWB Number | an | 1 | 35 | `/` | Formato libre del forwarder |
| HBS | Origin | a | 3 | 3 | `/` | |
| HBS | Destination | a | 3 | 3 | (implícito) | |
| HBS | Pieces | n | 1 | 4 | `/` | |
| HBS | Weight | n | 1 | 7.1 | (implícito) | |
| HBS | SLAC | n | 0 | 8 | `/S` | |
| HBS | HS Code | an | 0 | 10 | `/T` | |

### 9.2 Reglas de Wrap / Truncamiento

| Situación | Comportamiento |
|-----------|---------------|
| Línea > 69 chars en Type-B (teletipo) | Se inserta CRLF en posición 69 sin aviso. El receptor puede no re-ensamblar correctamente. |
| Campo Name > 35 chars | Se trunca en posición 35. Caracteres restantes se pierden. |
| Campo City > 17 chars | Se trunca. Puede causar fallo de geocodificación aduanera. |
| Línea RTD /NG > 65 chars | Se debe partir manualmente en múltiples líneas /NG. |
| OCI supplementary > 35 chars | Rechazo: `OCI0025`. |

### 9.3 Secuencia Completa de un Mensaje FWB v16 — Ejemplo End-to-End

```
FWB/16
AWB/020-98765432PVGLAX T25K1250.5MC15.0
FLT/BA0283/15FEB
RTG/LHRBA/LAXBA
SHP
/NMSHANGHAI GREAT WALL AUTO PARTS CO
/AD288 NANJING EAST ROAD BUILDING C
/ADFLOOR 15 UNIT 1502
/CISHANGHAI
/PO200001
/COCN
/CTTE86-21-5888-1234
CNE
/NMAMERICAN AUTO PARTS WHOLESALE INC
/AD1500 INDUSTRIAL BOULEVARD
/ADWAREHOUSE B DOCK 7
/CILOS ANGELES/CA
/PO90015
/COUS
/CTTE1-310-555-0199
AGT
/NMDRAGON LOGISTICS CO LTD
/CISHANGHAI
/IA8888-0001
CVD/USDPPPP/NVD/NCV/XXX
RTD/25K1250.5C09530 1250.5 2.10 2626.05
/NGNEW AUTOMOBILE BRAKE PADS AND ROTORS
/NGPART NUMBERS BP-2026-A AND RT-2026-B
/NGFOR PASSENGER VEHICLES
/NH8708.30
/ND25/60/40/30/MC1.80
OTH/DCC/FC625.00
OTH/DCC/SC125.00
PPD/2626.05/0.00/0.00/0.00/750.00/3376.05
ISU/10FEB26SHANGHAI/WANG LEI
OSI/TRANSIT CARGO VIA LHR - DO NOT OPEN
OCI/CN/T/SM/91310115MA1FL8UE23
OCI/CN/S/TE/86-21-5888-1234
OCI/US/T/HS/8708.30.5060
OCI/US/C/SD/SPX
```

### 9.4 Secuencia Completa de un Mensaje FHL v5 — Ejemplo End-to-End

```
FHL/5
MBI/020-98765432
HBS/DL-SH-2026-0001/PVGLAX/10K500.0/S100/T8708.30
TXT/NEW AUTOMOBILE BRAKE PADS MODEL BP-2026-A
TXT/FOR PASSENGER VEHICLES - OEM REPLACEMENT
SHP
/NMSHANGHAI SMALL PARTS FACTORY
/AD100 PUDONG AVENUE
/CISHANGHAI
/PO200120
/COCN
/CTTE86-21-6789-0001
CNE
/NMWEST COAST AUTO SUPPLY LLC
/AD2500 PACIFIC HIGHWAY
/CISAN DIEGO/CA
/PO92101
/COUS
/CTTE1-619-555-0300
OCI/CN/T/SM/91310115MA1FL8UE23
OCI/CN/S/TE/86-21-6789-0001
OCI/CN/T/CI/91310000MA1FL8XX43
OCI/CN/D/TE/86-10-6655-4321
OCI/US/C/SD/SPX
HBS/DL-SH-2026-0002/PVGLAX/15K750.5/S150/T8708.30
TXT/NEW AUTOMOBILE DISC BRAKE ROTORS MODEL RT-2026-B
TXT/VENTILATED TYPE FOR SUV APPLICATIONS
SHP
/NMSHANGHAI PRECISION MACHINING CO LTD
/AD50 JINQIAO ROAD PUDONG
/CISHANGHAI
/PO200135
/COCN
/CTTE86-21-5432-0099
CNE
/NMAMERICAN AUTO PARTS WHOLESALE INC
/AD1500 INDUSTRIAL BOULEVARD
/CILOS ANGELES/CA
/PO90015
/COUS
/CTTE1-310-555-0199
OCI/CN/T/SM/91310108MA01N8XX23
OCI/CN/S/TE/86-21-5432-0099
OCI/US/T/HS/8708.30.5060
OCI/US/C/SD/SPX
```

### 9.5 Escenario Completo de Consolidación Multi-País — FWB Master + FHL con 4 Houses

> **Escenario:** Un freight forwarder en Fráncfort (DRAGON LOGISTICS GMBH) consolida 4 envíos house
> bajo un solo MAWB 020-11223344 de FRA a distintos destinos finales:
>
> | House | Ruta | Destino Regulatory | Regulación Clave |
> |-------|------|--------------------|------------------|
> | HAWB-01 | FRA → CAI | Egipto | ACID 19 dígitos + Enterprise Codes (Nafeza) |
> | HAWB-02 | FRA → DAC | Bangladesh | BIN + DCV obligatorio |
> | HAWB-03 | FRA → JFK (vía FRA) | USA | ACAS + HS + Screening + SLAC |
> | HAWB-04 | FRA → AMS → FRA | EU tránsito | ICS2 + COR/T1 (NCTS) |
>
> El master FWB usa `/NC` (Nature of Goods — Consolidation) y el FHL desglosa cada house con sus OCI específicos.

#### 9.5.1 FWB Master (Consolidación)

```
FWB/16
AWB/020-11223344FRAFRA T85K4200.0MC28.0
FLT/LH8400/12FEB
RTG/FRALH
SHP
/NMDRAGON LOGISTICS GMBH
/ADHAUPTSTRASSE 45 BUILDING B
/CIFRANKFURT AM MAIN
/PO60311
/CODE
/CTTE49-69-7890-1234
CNE
/NMTO ORDER OF CONSIGNEES
/ADAS PER ATTACHED MANIFEST
/CIFRANKFURT AM MAIN
/PO60311
/CODE
AGT
/NMDRAGON LOGISTICS GMBH
/CIFRANKFURT AM MAIN
/IA9999-0001
CVD/EURPPPP/NVD/NCV/XXX
RTD/85K4200.0C09530 4200.0 1.80 7560.00
/NC/CONSOLIDATION AS PER
/NC/ATTACHED MANIFEST - 4 HAWBS
/NC/MIXED GENERAL CARGO
/NH8708.30
/ND85/120/80/60/MC3.50
OTH/DCC/FC1200.00
OTH/DCC/MY850.00
PPD/7560.00/0.00/0.00/0.00/2050.00/9610.00
ISU/11FEB26FRANKFURT/SCHMIDT PETRA
OSI/CONSOLIDATED SHIPMENT - 4 HOUSES
OSI/BREAKDOWN AT DESTINATION WAREHOUSES
COR/T1
OCI/EU/T/EI/DE123456789012345
OCI/EU/S/TE/49-69-7890-1234
```

**Notas del FWB Master:**
- **RTD usa `/NC`** (no `/NG`): indica consolidación — la descripción real está en cada house del FHL.
- **CNE es genérico** ("TO ORDER OF CONSIGNEES"): los consignees reales están en cada HBS del FHL.
- **COR/T1**: porque la carga transita bajo régimen T1 dentro de la UE (parte de la carga se reexpide a destinos fuera de EU).
- **OCI EU/T/EI**: EORI del consolidador (obligatorio para ICS2).

---

#### 9.5.2 FHL (4 Houses Multi-País)

```
FHL/5
MBI/020-11223344
```

---

##### HAWB-01: FRA → CAI (Egipto — Nafeza/ACID)

```
HBS/DL-FF-2026-0001/FRACAI/20K950.0/S200/T8544.49
TXT/ELECTRICAL WIRING HARNESSES FOR INDUSTRIAL MACHINERY
TXT/COPPER CORE PVC INSULATED RATED 600V
SHP
/NMSIEMENS ELECTRICAL COMPONENTS GMBH
/ADMAINZER LANDSTRASSE 50
/CIFRANKFURT AM MAIN
/PO60329
/CODE
/CTTE49-69-1234-5678
CNE
/NMCAIRO INDUSTRIAL ELECTRIC CO SAE
/AD12 AHMED EL ZOMOR STREET NASR CITY
/CICAIRO
/PO11765
/COEG
/CTTE20-2-2345-6789
OCI/EG/IMP/M/1234567890123456789
OCI/EG/CNE/T/ENT12345678901
OCI/EG/SHP/T/ENT98765432101
OCI/EG/CNE/T/TEL20-2-2345-6789
```

> **Notas HAWB-01:**
> - `OCI/EG/IMP/M/<19 dígitos>` — ACID number obligatorio (Nafeza). Formato de 3 elementos: Country`/`InfoID`/`CustomsID`/`Data.
> - `ENT` = Enterprise Code del CNE y SHP registrados en la plataforma Nafeza.
> - HS Code `8544.49` declara cables/arneses eléctricos.
> - Sin SLAC porque no es envío a USA.

---

##### HAWB-02: FRA → DAC (Bangladesh — BIN + DCV)

```
HBS/DL-FF-2026-0002/FRADAC/15K800.5/S0/T6204.62
TXT/MENS COTTON TROUSERS AND SHORTS
TXT/ASSORTED SIZES AND COLORS FOR RETAIL
SHP
/NMHAMBURG FASHION EXPORT GMBH
/AD22 SPEICHERSTADT BLOCK D
/CIHAMBURG
/PO20457
/CODE
/CTTE49-40-3456-7890
CNE
/NMBANGLADESH APPAREL IMPORT LTD
/AD45 MOTIJHEEL COMMERCIAL AREA
/CIDHAKA
/PO1000
/COBD
/CTTE880-2-9876-5432
OCI/BD/CNE/T/BIN123456789-0001
OCI/BD/SHP/T/COURIER-NO
OCI/BD/CNE/T/DCV/2500.00USD
```

> **Notas HAWB-02:**
> - `OCI/BD/CNE/T/BIN<13 dígitos>` — Business Identification Number obligatorio.
> - `OCI/BD/SHP/T/COURIER-NO` — indica que NO es envío courier (campo requerido por Bangladesh).
> - `OCI/BD/CNE/T/DCV/2500.00USD` — Declared Customs Value obligatorio (Bangladesh no acepta NCV).
> - HS Code `6204.62` = pantalones de algodón para hombre.

---

##### HAWB-03: FRA → JFK (USA — ACAS)

```
HBS/DL-FF-2026-0003/FRAJFK/30K1800.0/S300/T8708.30
TXT/NEW AUTOMOBILE BRAKE DISCS AND PADS
TXT/OEM REPLACEMENT PARTS FOR PASSENGER VEHICLES
TXT/MANUFACTURER PART NOS BD-2026-X AND BP-2026-Y
SHP
/NMBREMBO AFTERMARKET GMBH
/ADMUNCHENER STRASSE 120
/CISTUTTGART
/PO70191
/CODE
/CTTE49-711-2345-6789
CNE
/NMEAST COAST AUTO DISTRIBUTORS INC
/AD500 NEWARK INDUSTRIAL PARKWAY
/ADUNIT 12 BUILDING C
/CINEWARK/NJ
/PO07114
/COUS
/CTTE1-973-555-0400
AGT
/NMEAST COAST CUSTOMS BROKERS LLC
/CINEWARK
/IA7777-0002
OCI/US/T/HS/8708.30.5060
OCI/US/C/SD/SPX
OCI/DE/S/TE/49-711-2345-6789
OCI/DE/T/EI/DE987654321098765
```

> **Notas HAWB-03:**
> - **SLAC `/S300`** obligatorio para consolidación a USA (ACAS).
> - `OCI/US/T/HS/8708.30.5060` — HS Code a 10 dígitos (recomendado para USA).
> - `OCI/US/C/SD/SPX` — Screening Status = SPX (screened by regulated agent).
> - `OCI/DE/S/TE/` — Teléfono del shipper (origen Alemania).
> - `OCI/DE/T/EI/` — EORI del shipper alemán.
> - **Estado `/NJ`** — obligatorio para USA (2 chars USPS).
> - Incluye **AGT** con IATA code del customs broker en destino.
> - TXT con 3 líneas descriptivas (cumple ACAS: específico, con part numbers).

---

##### HAWB-04: FRA → AMS (EU tránsito — ICS2 + EORI)

```
HBS/DL-FF-2026-0004/FRAAMS/20K650.0/S0/T8481.80
TXT/INDUSTRIAL STAINLESS STEEL BALL VALVES
TXT/DN50 AND DN80 FLANGED TYPE PN16
SHP
/NMRHEINMETALL VALVE TECHNOLOGY GMBH
/AD8 INDUSTRIEPARK HOCHST
/CIFRANKFURT AM MAIN
/PO65929
/CODE
/CTTE49-69-3050-1234
CNE
/NMROTTERDAM INDUSTRIAL SUPPLIES BV
/ADWAALHAVEN ZUIDZIJDE 30
/CIROTTERDAM
/PO3089JB
/CONL
/CTTE31-10-276-5500
OCI/EU/T/EI/NL123456789000
OCI/DE/T/EI/DE555666777888999
OCI/EU/S/TE/49-69-3050-1234
OCI/EU/D/TE/31-10-276-5500
```

> **Notas HAWB-04:**
> - **EU → EU** (FRA→AMS): aplica ICS2 pero no ACAS.
> - `OCI/EU/T/EI/NL...` — EORI del consignee holandés (obligatorio ICS2).
> - `OCI/DE/T/EI/DE...` — EORI del shipper alemán.
> - `OCI/EU/S/TE/` y `OCI/EU/D/TE/` — Teléfonos de shipper y consignee.
> - HS Code `8481.80` = válvulas industriales de acero inoxidable.
> - Sin SLAC (no aplica para intra-EU).
> - Sin screening status (no aplica para intra-EU, solo pre-loading desde terceros países).

---

#### 9.5.3 Resumen de Reglas de Consolidación

| Regla | Detalle |
|-------|---------|
| **FWB Master RTD** | Usar `/NC` (no `/NG`). Texto: `CONSOLIDATION AS PER ATTACHED MANIFEST` + número de houses. |
| **FWB Master CNE** | Puede ser genérico: `TO ORDER OF CONSIGNEES` o `AS PER ATTACHED MANIFEST`. |
| **FHL por separado** | Un mensaje FHL por cada grupo de houses bajo el mismo MAWB. Máximo recomendado: ~20 HBS por FHL message. |
| **Piezas/Peso** | La suma de piezas y kilos de todos los HBS debe ≈ coincidir con el master (tolerancia: ±2% peso, ±0 piezas). |
| **OCI a nivel house** | Cada HBS lleva sus **propios** OCI según el país de destino y la regulación aplicable. Los OCI del master son del consolidador. |
| **HS Code** | Debe ir en **cada HBS** (campo `/T`) Y en los OCI correspondientes cuando la regulación lo exige (EU, USA, UAE, etc.). |
| **SLAC** | Obligatorio en HBS solo para houses con destino USA (ACAS) o UK (si consolidado). |
| **COR/T1** | Va en el **FWB master** (no en el FHL). Indica que la carga está bajo régimen de tránsito comunitario T1. |
| **Screening Status** | `OCI/<CC>/C/SD/<código>`: va en cada HBS individual, no en el master (la aduana evalúa screening por house). |
| **Secuencia de envío** | Enviar **primero el FWB**, obtener FNA OK, luego enviar el/los **FHL**. Algunos sistemas aceptan FHL antes del FWB pero no es best practice. |

---

## GLOSARIO RÁPIDO

| Término | Definición |
|---------|-----------|
| **MAWB** | Master Air Waybill — documento de transporte principal |
| **HAWB** | House Air Waybill — documento de transporte del freight forwarder |
| **FWB** | FreightWaybill message (Cargo-IMP) — mensaje electrónico del MAWB |
| **FHL** | Freight House List message — mensaje electrónico de los HAWBs |
| **FNA** | Functional Nack — mensaje de rechazo |
| **PER** | Processing Error Report — reporte de errores |
| **ACAS** | Air Cargo Advance Screening (USA) |
| **ICS2** | Import Control System 2 (EU) |
| **PLACI** | Pre-Loading Advance Cargo Information |
| **USCI** | Unified Social Credit Identifier (China) |
| **EORI** | Economic Operators Registration and Identification (EU) |
| **ACID** | Advance Cargo Information Declaration (Egipto) |
| **NPWP** | Nomor Pokok Wajib Pajak (Indonesia Tax ID) |
| **NAIC** | National Advance Information Center (UAE) |
| **ZATCA** | Zakat, Tax and Customs Authority (Arabia Saudita) |
| **BIN** | Business Identification Number (Bangladesh) |
| **COR** | Customs Origin segment (EU Transit T1/T2) |
| **NCTS** | New Computerised Transit System (EU) |
| **NAFEZA** | Plataforma electrónica de aduanas de Egipto (نافذة) |
| **CBSA** | Canada Border Services Agency |
| **BUP** | Shipper-built ULD (Build-Up Pallet/Container) |
| **SITA** | Société Internationale de Télécommunications Aéronautiques |
| **Type-B** | Protocolo de mensajería de teletipo aeronáutico |
| **DNL** | Do Not Load — instrucción de seguridad |
| **ENS** | Entry Summary Declaration (EU customs) |
| **TACT** | The Air Cargo Tariff |
| **HS Code** | Harmonized System Code (clasificación arancelaria) |
| **SLAC** | Shipper's Load and Count |
| **SPH** | Special Handling Code |
| **DG** | Dangerous Goods |
| **AEO** | Authorized Economic Operator |

---

*Fin del Manual — Versión 2.0*
