# Traxon API - Especificación Completa de Mensajes

> **Documento de referencia técnica para la integración con Traxon API**
> 
> Este documento contiene las especificaciones detalladas de todos los tipos de mensajes, estructuras de datos y enumeraciones utilizadas en la API de Traxon para el envío de mensajes de carga aérea.

---

## Tabla de Contenidos

1. [AirWayBillMessage](#1-airwaybillmessage)
2. [MessageHeader](#2-messageheader)
3. [Addressing](#3-addressing)
4. [ParticipantAddress](#4-participantaddress)
5. [ParticipantAddressType (Enumeración)](#5-participantaddresstype-enumeración)
6. [EdifactMessageHeader](#6-edifactmessageheader)
7. [AirWayBill (Payload)](#7-airwaybill-payload)
8. [HouseWaybillMessage](#8-housewaybillmessage)
9. [HouseWaybill (Payload)](#9-housewaybill-payload)
10. [ConsolidationListMessage](#10-consolidationlistmessage)
11. [ConsolidationList (Payload)](#11-consolidationlist-payload)
12. [Estrategia de Envío (Master + Houses)](#12-estrategia-de-envío-master--houses)

---

## 1. AirWayBillMessage

**Descripción:** Mensaje canónico de carga que contiene un AirWayBill como payload.

**Importante:** Esta estructura es un subtipo identificado por un parámetro de tipo llamado `"type"`. El nombre del tipo es siempre `"air waybill"` y la información del tipo **DEBE** ser el primer elemento en los datos JSON.

### 1.1 Campos Principales

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `type` | Identificador del tipo de mensaje. **DEBE ser el primer campo del JSON** | STRING (constante) | **Sí** | `"air waybill"` |
| `id` | Identificación única del mensaje | UUID | **Sí** | `"1f7cb56b-7aa4-4077-b38d-9371a24fa45c"` |
| `messageHeader` | Cabecera del mensaje | [MessageHeader](#2-messageheader) | **Sí** | Ver sección 2 |
| `payload` (unwrapped) | Cuerpo del mensaje con el payload de negocio. **Nota:** El nombre "payload" NO se usa en el JSON, los campos se incluyen directamente | [AirWayBill](#11-airwaybill-payload) | No | Ver sección 1.1 |

### 1.2 AirWayBill (Payload - Campos Directos en Raíz)

Los siguientes campos pertenecen al payload del AirWayBill y se colocan **directamente en la raíz del JSON** (no dentro de un objeto "payload"):

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `airWaybillNumber` | Número del Air Waybill | STRING | **Sí** | `"123-12345678"` |
| `origin` | Código de aeropuerto/ciudad de origen | STRING (3 chars) | **Sí** | `"JFK"` |
| `destination` | Código de aeropuerto/ciudad de destino | STRING (3 chars) | **Sí** | `"FRA"` |
| `totalConsignmentNumberOfPieces` | Número total de piezas del envío | STRING (numérico) | No | `"20"` |
| `weight` | Peso total | [Weight](#weight) | No | Ver estructura |
| `volume` | Volumen total | [Volume](#volume) | No | Ver estructura |
| `densityGroup` | Grupo de densidad | [DensityGroup](#densitygroup-enumeración) | No | `"KG60_PER_CUBICMETRE"` |
| `flights` | Array de vuelos | Array de [Flight](#flight) | No | Ver estructura |
| `route` | Ruta del envío | Array de [RouteSegment](#routesegment) | No | Ver estructura |
| `shipper` | Información del expedidor | [Party](#party-shipperconignee) | No | Ver estructura |
| `consignee` | Información del consignatario | [Party](#party-shipperconignee) | No | Ver estructura |
| `carriersExecution` | Ejecución del transportista | [CarriersExecution](#carriersexecution) | No | Ver estructura |
| `senderReference` | Referencia del remitente | [SenderReference](#senderreference) | No | Ver estructura |
| `chargeDeclarations` | Declaraciones de cargos | [ChargeDeclarations](#chargedeclarations) | No | Ver estructura |
| `chargeItems` | Items de cargo | Array de [ChargeItem](#chargeitem) | No | Ver estructura |
| `agent` | Información del agente | [Agent](#agent) | No | Ver estructura |
| `specialServiceRequest` | Solicitud de servicio especial | STRING | No | `"MUST BE KEPT ABOVE 5 DEGREES CELSIUS."` |
| `alsoNotify` | Parte a notificar también | [Party](#party-shipperconignee) | No | Ver estructura |
| `prepaidChargeSummary` | Resumen de cargos prepagados | [ChargeSummary](#chargesummary) | No | Ver estructura |
| `collectChargeSummary` | Resumen de cargos a cobrar | [ChargeSummary](#chargesummary) | No | Ver estructura |
| `specialHandlingCodes` | Códigos de manejo especial | Array de STRING | No | `["EAP"]` |
| `additionalSpecialHandlingCodes` | Códigos adicionales de manejo especial | Array de STRING | No | `["FOO"]` |
| `accounting` | Información contable | Array de [Accounting](#accounting) | No | Ver estructura |
| `otherCharges` | Otros cargos | Array de [OtherCharge](#othercharge) | No | Ver estructura |
| `shippersCertification` | Certificación del expedidor | STRING | No | `"K. WILSON"` |
| `otherServiceInformation` | Otra información de servicio | STRING | No | `"EXTRA CHARGE DUE TO SPECIAL HANDLING REQUIREMENTS."` |
| `chargesCollectInDestCurrency` | Cargos a cobrar en moneda destino | [ChargesCollectInDestCurrency](#chargescollectindestcurrency) | No | Ver estructura |
| `customsOriginCode` | Código de origen aduanas | STRING | No | `"T2"` |
| `commissionInfo` | Información de comisión | [CommissionInfo](#commissioninfo) | No | Ver estructura |
| `salesIncentive` | Incentivo de ventas | [SalesIncentive](#salesincentive) | No | Ver estructura |
| `agentFileReference` | Referencia de archivo del agente | STRING | No | `"123456"` |
| `nominatedHandlingParty` | Parte de manejo nominada | [NominatedHandlingParty](#nominatedhandlingparty) | No | Ver estructura |
| `shipmentReferenceInformation` | Información de referencia del envío | [ShipmentReferenceInformation](#shipmentreferenceinformation) | No | Ver estructura |
| `otherParticipant` | Otros participantes | Array de [OtherParticipant](#otherparticipant) | No | Ver estructura |
| `oci` | Other Customs Information | Array de [OCI](#oci) | No | Ver estructura |

### 1.3 JSON Ejemplo Completo - AirWayBillMessage

```json
{
  "type" : "air waybill",
  "id" : "1f7cb56b-7aa4-4077-b38d-9371a24fa45c",
  "messageHeader" : {
    "addressing" : {
      "routeVia" : {
        "type" : "PIMA",
        "address" : "REUAIR08AIRLINE"
      },
      "routeAnswerVia" : {
        "type" : "PIMA",
        "address" : "REUAIR08AIRLINE"
      },
      "senderAddresses" : [ {
        "type" : "PIMA",
        "address" : "REUAGT87SENDER"
      } ],
      "finalRecipientAddresses" : [ {
        "type" : "PIMA",
        "address" : "REUAIR08AIRLINE"
      } ],
      "replyAnswerTo" : [ {
        "type" : "PIMA",
        "address" : "REUAGT87SENDER"
      } ]
    },
    "creationDate" : "2017-09-05T11:46:13.000",
    "edifactData" : {
      "commonAccessReference" : "CARMAX14",
      "messageReference" : "MSGREFMAX14",
      "password" : "password",
      "interchangeControlReference" : "ICREFMAX14"
    }
  },
  "airWaybillNumber" : "123-12345678",
  "origin" : "JFK",
  "destination" : "FRA",
  "totalConsignmentNumberOfPieces" : "20",
  "weight" : {
    "amount" : "100",
    "unit" : "KILOGRAM"
  },
  "volume" : {
    "amount" : "250",
    "unit" : "CUBIC_CENTIMETRE"
  },
  "densityGroup" : "KG60_PER_CUBICMETRE",
  "flights" : [ {
    "flight" : "LH116",
    "scheduledDate" : "2017-09-05",
    "scheduledTime" : "11:46:13.000"
  } ],
  "route" : [ {
    "carrierCode" : "BA",
    "destination" : "FRA"
  } ],
  "shipper" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "DONALD TRUMP",
      "name2" : "PRESIDENT OF THE UNITED STATES OF AMERICA",
      "streetAddress1" : "THE WHITE HOUSE",
      "streetAddress2" : "1600 PENNSYLVANIA AVENUE NW",
      "place" : "WASHINGTON",
      "stateProvince" : "DC",
      "country" : "US",
      "postCode" : "20500"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "5148446311"
    } ]
  },
  "consignee" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "ANGELA MERKEL",
      "name2" : "FEDERAL CHANCELOR",
      "streetAddress1" : "WILLY-BRANDT-STRASSE 1",
      "streetAddress2" : "BUNDESKANZLERAMT",
      "place" : "BERLIN",
      "stateProvince" : "BE",
      "country" : "DE",
      "postCode" : "10557"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "491802720000"
    } ]
  },
  "carriersExecution" : {
    "date" : "2017-09-05",
    "placeOrAirportCityCode" : "LONDON",
    "authorisationSignature" : "K. WILSON"
  },
  "senderReference" : {
    "officeMessageAddress" : {
      "airportCityCode" : "LHR",
      "officeFunctionDesignator" : "6F",
      "companyDesignator" : "XB"
    },
    "fileReference" : "123456",
    "participantIdentifier" : {
      "identifier" : "AGT",
      "code" : "EXPORT AGENT",
      "airportCityCode" : "LHR"
    }
  },
  "chargeDeclarations" : {
    "isoCurrencyCode" : "EUR",
    "chargeCode" : "ALL_CHARGES_COLLECT",
    "payment_WeightValuation" : "Collect",
    "payment_OtherCharges" : "Collect",
    "declaredValueForCarriage" : "100.00",
    "declaredValueForCustoms" : "120.00",
    "declaredValueForInsurance" : "1000.00"
  },
  "chargeItems" : [ {
    "numberOfPieces" : "8",
    "rateCombinationPointCityCode" : "PAR",
    "commodityItemNumber" : [ "9017" ],
    "grossWeight" : {
      "amount" : "100",
      "unit" : "KILOGRAM"
    },
    "goodsDescription" : "Tooth paste",
    "consolidation" : "true",
    "harmonisedCommodityCode" : [ "427127829" ],
    "isoCountryCodeOfOriginOfGoods" : "US",
    "packaging" : [ {
      "numberOfPieces" : "8",
      "weight" : {
        "amount" : "100",
        "unit" : "KILOGRAM"
      },
      "volume" : {
        "amount" : "250",
        "unit" : "CUBIC_CENTIMETRE"
      },
      "dimensions" : {
        "unit" : "CENTIMETRE",
        "length" : "200",
        "width" : "150",
        "height" : "100"
      },
      "uld" : {
        "type" : "ASE",
        "serialNumber" : "1234",
        "ownerCode" : "TW",
        "loadingIndicator" : "MAIN_DECK_LOADING_ONLY",
        "remarks" : "DO NOT LOAD VIA NOSE DOOR.",
        "weightOfULDContents" : {
          "amount" : "100",
          "unit" : "KILOGRAM"
        }
      },
      "shippersLoadAndCount" : "15000"
    } ],
    "charges" : [ {
      "chargeableWeight" : {
        "amount" : "100",
        "unit" : "KILOGRAM"
      },
      "rateClassCode" : "BASIC_CHARGE",
      "rateClassCodeBasis" : "BASIC_CHARGE",
      "classRatePercentage" : "67",
      "uldRateClassType" : "8",
      "rateOrCharge" : "1234.56",
      "totalChargeAmount" : "2500.00"
    } ],
    "serviceCode" : "AIRPORT_TO_AIRPORT"
  } ],
  "agent" : {
    "name" : "ACE SHIPPING CO.",
    "place" : "LONDON",
    "accountNumber" : "ABC94269",
    "iataCargoAgentNumericCode" : "1234567",
    "iataCargoAgentCASSAddress" : "1234",
    "participantIdentifier" : "AGT"
  },
  "specialServiceRequest" : "MUST BE KEPT ABOVE 5 DEGREES CELSIUS.",
  "alsoNotify" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "EMMANUEL MACRON",
      "name2" : "PRESIDENT OF FRANCE",
      "streetAddress1" : "ELYSEE PALACE",
      "streetAddress2" : "55 RUE DU FAUBOURG SAINT-HONORE",
      "place" : "PARIS",
      "stateProvince" : "FR",
      "country" : "FR",
      "postCode" : "75008"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "331123456789"
    } ]
  },
  "prepaidChargeSummary" : {
    "totalWeightCharge" : "120.99",
    "valuationCharge" : "110.00",
    "taxes" : "22.45",
    "totalOtherChargesDueAgent" : "32.95",
    "totalOtherChargesDueCarrier" : "43.00",
    "chargeSummaryTotal" : "329.39"
  },
  "collectChargeSummary" : {
    "totalWeightCharge" : "120.99",
    "valuationCharge" : "110.00",
    "taxes" : "22.45",
    "totalOtherChargesDueAgent" : "32.95",
    "totalOtherChargesDueCarrier" : "43.00",
    "chargeSummaryTotal" : "329.39"
  },
  "specialHandlingCodes" : [ "EAP" ],
  "additionalSpecialHandlingCodes" : [ "FOO" ],
  "accounting" : [ {
    "identifier" : "GovernmentBillOfLading",
    "accountingInformation" : "PAYMENT BY CERTIFIED CHEQUE."
  } ],
  "otherCharges" : [ {
    "paymentCondition" : "Collect",
    "otherChargeCode" : "UC",
    "entitlementCode" : "Agent",
    "chargeAmount" : "120.46"
  } ],
  "shippersCertification" : "K. WILSON",
  "otherServiceInformation" : "EXTRA CHARGE DUE TO SPECIAL HANDLING REQUIREMENTS.",
  "chargesCollectInDestCurrency" : {
    "isoCurrencyCode" : "EUR",
    "currencyConversionRateOfExchange" : "2.1512",
    "chargesInDestinationCurrency" : "430.24",
    "chargesAtDestination" : "200.00",
    "totalCollectCharges" : "200.00"
  },
  "customsOriginCode" : "T2",
  "commissionInfo" : {
    "amountCASSSettlementFactor" : "139",
    "percentageCASSSettlementFactor" : "12"
  },
  "salesIncentive" : {
    "chargeAmount" : "20.00",
    "cassIndicator" : "AWB_AS_INVOICE"
  },
  "agentFileReference" : "123456",
  "nominatedHandlingParty" : {
    "name" : "ACE SHIPPING CO.",
    "place" : "LONDON"
  },
  "shipmentReferenceInformation" : {
    "referenceNumber" : "ABCD-12345",
    "info" : "COMPANY MAT"
  },
  "otherParticipant" : [ {
    "name" : "ACE SHIPPING CO.",
    "fileReference" : "123456",
    "participantIdentification" : {
      "identifier" : "AIR",
      "code" : "98764",
      "airportCityCode" : "LHR"
    }
  } ],
  "oci" : [ {
    "isoCountryCode" : "US",
    "informationIdentifier" : "ISS",
    "controlInformation" : "REGULATED_AGENT",
    "additionalControlInformation" : "RA",
    "supplementaryControlInformation" : "01000-001"
  },
  {
    "controlInformation" : "EXPIRY_DATE",
    "supplementaryControlInformation" : "0220"
  } ]
}
```

---

## 2. MessageHeader

**Descripción:** Cabecera de mensaje de un Cargo Canonical Message.

### 2.1 Campos

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `addressing` | Datos de direccionamiento | [Addressing](#3-addressing) | **Sí** | Ver sección 3 |
| `creationDate` | Fecha y hora de creación del mensaje | DATETIME | **Sí** | `"2017-09-05T11:46:13.000"` |
| `edifactData` | Datos EDIFACT | [EdifactMessageHeader](#6-edifactmessageheader) | No | Ver sección 6 |

### 2.2 Formato de Fecha/Hora

- **Formato:** `YYYY-MM-DDTHH:mm:ss.SSS`
- **Ejemplo:** `"2017-09-05T11:46:13.000"`

### 2.3 JSON Ejemplo - MessageHeader

```json
{
  "addressing" : {
    "routeVia" : {
      "type" : "PIMA",
      "address" : "REUAIR08AIRLINE"
    },
    "routeAnswerVia" : {
      "type" : "PIMA",
      "address" : "REUAIR08AIRLINE"
    },
    "senderAddresses" : [ {
      "type" : "PIMA",
      "address" : "REUAGT87SENDER"
    } ],
    "finalRecipientAddresses" : [ {
      "type" : "PIMA",
      "address" : "REUAIR08AIRLINE"
    } ],
    "replyAnswerTo" : [ {
      "type" : "PIMA",
      "address" : "REUAGT87SENDER"
    } ]
  },
  "creationDate" : "2017-09-05T11:46:13.000",
  "edifactData" : {
    "commonAccessReference" : "CARMAX14",
    "messageReference" : "MSGREFMAX14",
    "password" : "password",
    "interchangeControlReference" : "ICREFMAX14"
  }
}
```

---

## 3. Addressing

**Descripción:** Datos de direccionamiento de un Cargo Canonical Message.

### 3.1 Campos

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `routeVia` | Dirección del participante por donde se enviará el mensaje | [ParticipantAddress](#4-participantaddress) | No | Ver sección 4 |
| `routeAnswerVia` | Dirección del participante por donde se enviará la respuesta | [ParticipantAddress](#4-participantaddress) | No | Ver sección 4 |
| `senderAddresses` | Array de direcciones del remitente del mensaje | Array de [ParticipantAddress](#4-participantaddress) | **Sí** | Ver sección 4 |
| `finalRecipientAddresses` | Array de direcciones de los destinatarios finales | Array de [ParticipantAddress](#4-participantaddress) | **Sí** | Ver sección 4 |
| `replyAnswerTo` | Array de direcciones para entregar respuestas al mensaje | Array de [ParticipantAddress](#4-participantaddress) | No | Ver sección 4 |

### 3.2 Notas Importantes

- `senderAddresses` y `finalRecipientAddresses` son **REQUERIDOS** y son arrays
- Cada array debe contener al menos un elemento
- `routeVia`, `routeAnswerVia` y `replyAnswerTo` son opcionales

### 3.3 JSON Ejemplo - Addressing

```json
{
  "routeVia" : {
    "type" : "PIMA",
    "address" : "REUAIR08AIRLINE"
  },
  "routeAnswerVia" : {
    "type" : "PIMA",
    "address" : "REUAIR08AIRLINE"
  },
  "senderAddresses" : [ {
    "type" : "PIMA",
    "address" : "REUAGT87SENDER"
  } ],
  "finalRecipientAddresses" : [ {
    "type" : "PIMA",
    "address" : "REUAIR08AIRLINE"
  } ],
  "replyAnswerTo" : [ {
    "type" : "PIMA",
    "address" : "REUAGT87SENDER"
  } ]
}
```

---

## 4. ParticipantAddress

**Descripción:** Dirección de un participante en el manejo de Cargo Canonical messages.

### 4.1 Campos

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `type` | Tipo de dirección del participante | [ParticipantAddressType](#5-participantaddresstype-enumeración) | **Sí** | `"PIMA"` |
| `address` | La dirección | STRING | **Sí** | `"REUAIR08AAL"` |

### 4.2 JSON Ejemplo - ParticipantAddress

```json
{
  "type" : "PIMA",
  "address" : "REUAIR08AIRLINE"
}
```

---

## 5. ParticipantAddressType (Enumeración)

**Descripción:** Enumeración para el tipo de dirección de un participante en el manejo de Cargo Canonical messages.

### 5.1 Valores de la Enumeración

| Valor | Descripción |
|-------|-------------|
| `PIMA` | PIMA address (Participant Identification and Message Address) |
| `TTY` | Teletype address |
| `CARRIER_CODE_3N` | Código de transportista de 3 caracteres numéricos |
| `IATA_CARRIER_CODE` | Código de transportista IATA |
| `EMAIL` | Dirección de correo electrónico |
| `WEBSITE` | Dirección de sitio web |
| `UNKNOWN` | Tipo de dirección desconocido |

### 5.2 Nota sobre PIMA

- **PIMA** (Participant Identification and Message Address) es el tipo más común
- Formato típico: `REUAGT87SENDER` o `REUAIR08AIRLINE`
- Estructura: Código de región + Tipo de participante + Identificador

---

## 6. EdifactMessageHeader

**Descripción:** Datos EDIFACT del header del mensaje (opcional).

### 6.1 Campos

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `commonAccessReference` | Referencia de acceso común | STRING | No | `"CARMAX14"` |
| `messageReference` | Referencia del mensaje | STRING | No | `"MSGREFMAX14"` |
| `password` | Contraseña | STRING | No | `"password"` |
| `interchangeControlReference` | Referencia de control de intercambio | STRING | No | `"ICREFMAX14"` |

### 6.2 JSON Ejemplo - EdifactMessageHeader

```json
{
  "commonAccessReference" : "CARMAX14",
  "messageReference" : "MSGREFMAX14",
  "password" : "password",
  "interchangeControlReference" : "ICREFMAX14"
}
```

---

## 7. AirWayBill (Payload)

**Descripción:** Un Air Waybill (AWB) es un recibo emitido por una aerolínea internacional para mercancías y una evidencia del contrato de transporte.

**Nota Importante:** Estos campos van directamente en la raíz del JSON del mensaje (no dentro de un objeto "payload"), ya que el payload está "unwrapped".

### 7.1 Campos del AirWayBill

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `airWaybillNumber` | Número del Air Waybill | [AirWaybillNumber](#72-airwaybillnumber) | **Sí** | `"020-97162321"` |
| `origin` | Código de aeropuerto de origen | [IATAAirportCode](#73-iataairportcode) | **Sí** | `"FRA"` |
| `destination` | Código de aeropuerto de destino | [IATAAirportCode](#73-iataairportcode) | **Sí** | `"FRA"` |
| `totalConsignmentNumberOfPieces` | Número total de piezas del envío completo | INTEGER | **Sí** | `"20"` |
| `weight` | Datos de peso del envío | [Weight](#74-weight) | **Sí** | Ver sección |
| `volume` | Datos de volumen del envío | [Volume](#75-volume) | No | Ver sección |
| `densityGroup` | Grupo de densidad (usualmente dado si no se especifica volumen) | [DensityGroup](#76-densitygroup-enumeración) | No | `"KG60_PER_CUBICMETRE"` |
| `flights` | Reservas de vuelo | Array de [Flight](#77-flight) | No | Ver sección |
| `route` | Enrutamiento | Array de [Routing](#78-routing) | **Sí** | Ver sección |
| `shipper` | Contacto de cuenta del expedidor | [AccountContact](#79-accountcontact) | **Sí** | Ver sección |
| `consignee` | Contacto de cuenta del consignatario | [AccountContact](#79-accountcontact) | **Sí** | Ver sección |
| `carriersExecution` | Ejecución del transportista | [CarriersExecution](#712-carriersexecution) | **Sí** | Ver sección |
| `senderReference` | Referencia del remitente | [ReferenceInfo](#713-referenceinfo-senderreference) | **Sí** | Ver sección |
| `chargeDeclarations` | Declaraciones de cargos | [ChargeDeclarations](#714-chargedeclarations) | **Sí** | Ver sección |
| `chargeItems` | Array de items de cargo (también conocido como rate description) | Array de [ChargeItem](#715-chargeitem) | **Sí** | Ver sección |
| `agent` | Agente (si tiene derecho a comisión) | [AgentIdentification](#716-agentidentification) | No | Ver sección |
| `specialServiceRequest` | Solicitud de servicio especial (instrucciones para acciones especiales) | STRING | No | `"Must be kept above 5 degrees celsius."` |
| `alsoNotify` | Contacto de cuenta a notificar sobre cambios de estado del envío | [AccountContact](#79-accountcontact) | No | Ver sección |
| `prepaidChargeSummary` | Resumen de cargos prepagados. **Nota:** Aunque opcional, uno de prepaid o collect debe estar presente | [ChargeSummary](#717-chargesummary) | No* | Ver sección |
| `collectChargeSummary` | Resumen de cargos a cobrar. **Nota:** Aunque opcional, uno de prepaid o collect debe estar presente | [ChargeSummary](#717-chargesummary) | No* | Ver sección |
| `specialHandlingCodes` | Array de códigos para manejo especial y mercancías peligrosas | Array de [SpecialHandlingAndDangerousGoodsCode](#718-specialhandlinganddangerousgoodscode-enumeración) | No | `["ACT"]` |
| `additionalSpecialHandlingCodes` | Códigos de manejo especial no cubiertos por la enumeración | Array de STRING | No | `["FOO"]` |
| `accounting` | Información contable | Array de [Accounting](#719-accounting) | No | Ver sección |
| `otherCharges` | Otros cargos | Array de [OtherChargeItem](#720-otherchargeitem) | No | Ver sección |
| `shippersCertification` | Certificación del expedidor (nombre de firma) | STRING | No | `"K. Wilson"` |
| `otherServiceInformation` | Otra información de servicio: Observaciones del envío | STRING | No | `"Extra charge due to special handling requirements."` |
| `chargesCollectInDestCurrency` | Cargos a cobrar en moneda de destino | [CollectChargesInDestinationCurrency](#721-collectchargesindestinationcurrency) | No | Ver sección |
| `customsOriginCode` | Código que indica el origen de mercancías para propósitos aduaneros | STRING | No | `"T2"` |
| `commissionInfo` | Información de comisión | [CommissionInfo](#722-commissioninfo) | No | Ver sección |
| `salesIncentive` | Información de incentivo de ventas | [SalesIncentive](#723-salesincentive) | No | Ver sección |
| `agentFileReference` | Referencia de archivo del agente para identificar reserva o archivo específico | STRING | No | `"123456"` |
| `nominatedHandlingParty` | Parte de manejo nominada | [NominatedHandlingParty](#724-nominatedhandlingparty) | No | Ver sección |
| `shipmentReferenceInformation` | Información de referencia del envío | [ShipmentReferenceInfo](#725-shipmentreferenceinfo) | No | Ver sección |
| `otherParticipant` | Array de información de otros participantes | Array de [OtherParticipant](#726-otherparticipant) | No | Ver sección |
| `oci` | Array de otra información aduanera, de seguridad y control regulatorio | Array de [OCI](#727-oci) | No | Ver sección |

> **⚠️ Nota Importante sobre Charge Summary:** Aunque `prepaidChargeSummary` y `collectChargeSummary` son opcionales individualmente, **AL MENOS UNO DE LOS DOS DEBE ESTAR PRESENTE**.

### 7.2 AirWaybillNumber

**Descripción:** Número de Air Waybill usado para identificar una entidad de carga aérea.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `awbNumber` (unwrapped) | String de 3 dígitos de aerolínea + guión + 8 dígitos. **El nombre NO se usa en JSON, se pasa directamente como string** | STRING | **Sí** | `"020-97162321"` |

**Expresión Regular:** `[0-9]{3}-[0-9]{8}`

**Formato:** `XXX-XXXXXXXX` donde:
- `XXX` = Código numérico de 3 dígitos de la aerolínea
- `-` = Guión separador
- `XXXXXXXX` = Número de 8 dígitos

**Ejemplos válidos:**
- `"020-97162321"`
- `"123-12345678"`
- `"057-00123456"`

### 7.3 IATAAirportCode

**Descripción:** Código de aeropuerto en formato IATA.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `code` (unwrapped) | Código de aeropuerto IATA de 3 letras. **El nombre NO se usa en JSON, se pasa directamente como string** | STRING | **Sí** | `"FRA"` |

**Formato:** 3 letras mayúsculas

**Ejemplos:**
- `"FRA"` - Frankfurt
- `"JFK"` - New York John F. Kennedy
- `"LHR"` - London Heathrow
- `"MAD"` - Madrid Barajas

### 7.4 Weight

**Descripción:** Estructura que contiene los datos de peso de un envío.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `amount` | Cantidad de unidades de peso | DECIMAL | **Sí** | `"100"` |
| `unit` | Unidad del peso reportado | [WeightUnit](#74a-weightunit-enumeración) | **Sí** | `"KILOGRAM"` |

#### 7.4a WeightUnit (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `KILOGRAM` | Kilogramos |
| `POUND` | Libras |

**JSON Ejemplo:**
```json
{
  "amount" : "100",
  "unit" : "KILOGRAM"
}
```

### 7.5 Volume

**Descripción:** Estructura que contiene los datos de volumen de un envío.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `amount` | Cantidad de unidades de volumen | DECIMAL | **Sí** | `"250"` |
| `unit` | Unidad del volumen reportado | [VolumeUnit](#75a-volumeunit-enumeración) | **Sí** | `"CUBIC_CENTIMETRE"` |

#### 7.5a VolumeUnit (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `CUBIC_CENTIMETRE` | Centímetros cúbicos |
| `CUBIC_FOOT` | Pies cúbicos |
| `CUBIC_INCH` | Pulgadas cúbicas |
| `CUBIC_METRE` | Metros cúbicos |

**JSON Ejemplo:**
```json
{
  "amount" : "250",
  "unit" : "CUBIC_CENTIMETRE"
}
```

### 7.6 DensityGroup (Enumeración)

**Descripción:** Grupo de densidad - usualmente se proporciona si no se especifican datos de volumen.

| Valor | Descripción |
|-------|-------------|
| `KG60_PER_CUBICMETRE` | 60 kg por metro cúbico |
| *(otros valores pendientes de documentar)* | |

### 7.7 Flight

**Descripción:** Datos de vuelo.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `flight` | Identidad del vuelo | [FlightIdentity](#77a-flightidentity) | **Sí** | `"LH116"` |
| `scheduledDate` | Fecha programada del vuelo | DATE | **Sí** | `"2017-09-05"` |
| `scheduledTime` | Hora programada del vuelo | TIME | No | `"11:46:13.000"` |

#### 7.7a FlightIdentity

**Descripción:** Identificación de vuelo.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `value` (unwrapped) | String de identificación de vuelo. **El nombre NO se usa en JSON** | STRING | **Sí** | `"LH116"` |

**Expresión Regular:** `(?:[A-Z][A-Z]|[A-Z][0-9]|[0-9][A-Z])[0-9]{1,4}[A-Z]?`

**Formato:**
- 2 caracteres: código de aerolínea (2 letras, o 1 letra + 1 número, o 1 número + 1 letra)
- 1-4 dígitos: número de vuelo
- 0-1 letra opcional: sufijo

**Ejemplos válidos:**
- `"LH116"` - Lufthansa vuelo 116
- `"BA256"` - British Airways vuelo 256
- `"AA1234A"` - American Airlines vuelo 1234A

**JSON Ejemplo:**
```json
{
  "flight" : "LH116",
  "scheduledDate" : "2017-09-05",
  "scheduledTime" : "11:46:13.000"
}
```

### 7.8 Routing

**Descripción:** Datos de enrutamiento. **Al menos uno de los campos debe estar presente.**

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `carrierCode` | Código del transportista | [IATACarrierCode](#78a-iatacarriercode) | No* | `"BA"` |
| `destination` | Destino (código de aeropuerto/ciudad) | [IATAAirportCode](#73-iataairportcode) | No* | `"FRA"` |

> **⚠️ Nota:** Aunque ambos campos son técnicamente opcionales, **AL MENOS UNO DEBE ESTAR PRESENTE**.

#### 7.8a IATACarrierCode

**Descripción:** Identificación codificada aprobada por IATA para un transportista.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `code` (unwrapped) | Código que coincide con la expresión regular. **El nombre NO se usa en JSON** | STRING | **Sí** | `"BA"` |

**Expresión Regular:** `(?:[A-Z][A-Z]|[A-Z][0-9]|[0-9][A-Z])`

**Formato:** 2 caracteres (2 letras, o 1 letra + 1 número, o 1 número + 1 letra)

**Ejemplos:**
- `"BA"` - British Airways
- `"LH"` - Lufthansa
- `"AA"` - American Airlines
- `"7X"` - Formato con número

**JSON Ejemplo:**
```json
{
  "carrierCode" : "BA",
  "destination" : "FRA"
}
```

### 7.9 AccountContact

**Descripción:** Datos de contacto de una cuenta (por ejemplo, para un shipper o consignee).

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `accountNumber` | Número de cuenta (identificación codificada de un participante) | STRING | No | `"ABC94269"` |
| `address` | Dirección del contacto | [Address](#710-address) | **Sí** | Ver sección |
| `contactDetails` | Detalles adicionales de contacto | Array de [ContactDetail](#711-contactdetail) | No | Ver sección |

**JSON Ejemplo:**
```json
{
  "accountNumber" : "ABC94269",
  "address" : {
    "name1" : "DONALD TRUMP",
    "name2" : "PRESIDENT OF THE UNITED STATES OF AMERICA",
    "streetAddress1" : "THE WHITE HOUSE",
    "streetAddress2" : "1600 PENNSYLVANIA AVENUE NW",
    "place" : "WASHINGTON",
    "stateProvince" : "DC",
    "country" : "US",
    "postCode" : "20500"
  },
  "contactDetails" : [ {
    "contactIdentifier" : "TE",
    "contactNumber" : "5148446311"
  } ]
}
```

### 7.10 Address

**Descripción:** Dirección postal de un individuo o una empresa.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `name1` | Primer campo de nombre (obligatorio) | STRING | **Sí** | `"Donald Trump"` |
| `name2` | Segundo campo de nombre (opcional) | STRING | No | `"President of the United States of America"` |
| `streetAddress1` | Primer campo de calle (obligatorio) | STRING | **Sí** | `"The White House"` |
| `streetAddress2` | Segundo campo de calle (opcional) | STRING | No | `"1600 Pennsylvania Avenue NW"` |
| `place` | Ubicación o lugar de la dirección | STRING | **Sí** | `"Washington, DC"` |
| `stateProvince` | Parte de un país (estado/provincia) | STRING | No | `"DC"` |
| `country` | Código ISO del país de la dirección | ISOCountryCode | **Sí** | `"US"` |
| `postCode` | Código postal de la dirección | STRING | **Sí** | `"20500"` |

**JSON Ejemplo:**
```json
{
  "name1" : "DONALD TRUMP",
  "name2" : "PRESIDENT OF THE UNITED STATES OF AMERICA",
  "streetAddress1" : "THE WHITE HOUSE",
  "streetAddress2" : "1600 PENNSYLVANIA AVENUE NW",
  "place" : "WASHINGTON",
  "stateProvince" : "DC",
  "country" : "US",
  "postCode" : "20500"
}
```

### 7.11 ContactDetail

**Descripción:** Detalles de contacto.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `contactIdentifier` | Código que identifica un medio de contacto para un participante | STRING | **Sí** | `"TE"` |
| `contactNumber` | Número de contacto del participante | STRING | **Sí** | `"5148446311"` |

**Identificadores Comunes de Contacto:**

| Código | Descripción |
|--------|-------------|
| `TE` | Teléfono |
| `FX` | Fax |
| `TL` | Télex |

**JSON Ejemplo:**
```json
{
  "contactIdentifier" : "TE",
  "contactNumber" : "5148446311"
}
```

### 7.12 CarriersExecution

**Descripción:** Ejecución del transportista.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `date` | Fecha de emisión del Air Waybill | DATE | **Sí** | `"2017-09-05"` |
| `placeOrAirportCityCode` | Ubicación (como 'LONDON') o representación codificada de aeropuerto/ciudad (como 'LHR') | STRING | **Sí** | `"LONDON"` |
| `authorisationSignature` | Autorización: Nombre del firmante | STRING | No | `"K. Wilson"` |

**Formato de Fecha:** `YYYY-MM-DD`

**JSON Ejemplo:**
```json
{
  "date" : "2017-09-05",
  "placeOrAirportCityCode" : "LONDON",
  "authorisationSignature" : "K. WILSON"
}
```

### 7.13 ReferenceInfo (SenderReference)

**Descripción:** Información de referencia general de propósito múltiple.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `officeMessageAddress` | Dirección de mensaje de oficina | [OfficeMessageAddress](#713a-officemessageaddress) | No | Ver sub-sección |
| `fileReference` | Referencia de archivo: identificar una reserva o archivo específico | STRING | No | `"123456"` |
| `participantIdentifier` | Identificación del participante | [ParticipantIdentifier](#713b-participantidentifier) | No | Ver sub-sección |

#### 7.13a OfficeMessageAddress

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `airportCityCode` | Código de aeropuerto/ciudad | STRING | **Sí** | `"LHR"` |
| `officeFunctionDesignator` | Designador de función de oficina | STRING | **Sí** | `"6F"` |
| `companyDesignator` | Designador de compañía | STRING | **Sí** | `"XB"` |

#### 7.13b ParticipantIdentifier

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `identifier` | Identificador del tipo de participante | STRING | **Sí** | `"AGT"` |
| `code` | Código del participante | STRING | **Sí** | `"AGENT"` |
| `airportCityCode` | Código de aeropuerto/ciudad | STRING | **Sí** | `"LHR"` |

**JSON Ejemplo:**
```json
{
  "officeMessageAddress" : {
    "airportCityCode" : "LHR",
    "officeFunctionDesignator" : "6F",
    "companyDesignator" : "XB"
  },
  "fileReference" : "123456",
  "participantIdentifier" : {
    "identifier" : "AGT",
    "code" : "AGENT",
    "airportCityCode" : "LHR"
  }
}
```

### 7.14 ChargeDeclarations

**Descripción:** Declaraciones de cargos.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `isoCurrencyCode` | Código de moneda ISO: Representación codificada aprobada por ISO | STRING | **Sí** | `"EUR"` |
| `chargeCode` | Código de cargo: Código que identifica método de pago | [ChargeCode](#714a-chargecode-enumeración) | No | `"ALL_CHARGES_COLLECT"` |
| `payment_WeightValuation` | Indicador Prepaid/Collect para valoración de peso | [PaymentCondition](#714b-paymentcondition-enumeración) | No | `"Collect"` |
| `payment_OtherCharges` | Indicador Prepaid/Collect para otros cargos | [PaymentCondition](#714b-paymentcondition-enumeración) | No | `"Collect"` |
| `declaredValueForCarriage` | Valor declarado para transporte | DECIMAL | No | `"100.00"` |
| `declaredValueForCustoms` | Valor declarado para aduanas | DECIMAL | No | `"120.00"` |
| `declaredValueForInsurance` | Monto de seguro: Valor del envío para propósitos de seguro | DECIMAL | No | `"1000.00"` |

#### 7.14a ChargeCode (Enumeración)

**IMPORTANTE:** NO existe `ALL_CHARGES_PREPAID` simple. Debe incluir el método de pago.

| Valor | Descripción |
|-------|-------------|
| `ALL_CHARGES_COLLECT` | Todos los cargos a cobrar en destino |
| `ALL_CHARGES_COLLECT_BY_CREDIT_CARD` | Todos los cargos a cobrar con tarjeta de crédito |
| `ALL_CHARGES_COLLECT_BY_GBL` | Todos los cargos a cobrar por GBL |
| `ALL_CHARGES_PREPAID_CASH` | Todos prepagados en efectivo |
| `ALL_CHARGES_PREPAID_CREDIT` | Todos prepagados a crédito **(Más común para flores/carga)** |
| `ALL_CHARGES_PREPAID_BY_CREDIT_CARD` | Todos prepagados con tarjeta de crédito |
| `ALL_CHARGES_PREPAID_BY_GBL` | Todos prepagados por GBL |
| `DESTINATION_COLLECT_CASH` | Por cobrar en efectivo en destino |
| `DESTINATION_COLLECT_CREDIT` | Por cobrar a crédito en destino |
| `DESTINATION_COLLECT_BY_MCO` | Por cobrar por MCO en destino |
| `NO_CHARGE` | Sin cargo |
| `NO_WEIGHT_CHARGE_OTHER_CHARGES_COLLECT` | Sin cargo por peso, otros cargos collect |
| `NO_WEIGHT_CHARGE_OTHER_CHARGES_PREPAID_CASH` | Sin cargo por peso, otros prepago efectivo |
| `NO_WEIGHT_CHARGE_OTHER_CHARGES_PREPAID_CREDIT` | Sin cargo por peso, otros prepago crédito |
| `NO_WEIGHT_CHARGE_OTHER_CHARGES_PREPAID_BY_CREDIT_CARD` | Sin cargo por peso, otros prepago T.C. |
| `NO_WEIGHT_CHARGE_OTHER_CHARGES_PREPAID_BY_GBL` | Sin cargo por peso, otros prepago GBL |
| `PARTIAL_COLLECT_CREDIT_PARTIAL_PREPAID_CASH` | Parcial collect crédito, parcial prepago efectivo |
| `PARTIAL_COLLECT_CREDIT_PARTIAL_PREPAID_CREDIT` | Parcial collect crédito, parcial prepago crédito |
| `PARTIAL_PREPAID_CASH_PARTIAL_COLLECT_CASH` | Parcial prepago efectivo, parcial collect efectivo |
| `PARTIAL_PREPAID_CREDIT_PARTIAL_COLLECT_CASH` | Parcial prepago crédito, parcial collect efectivo |

#### 7.14b PaymentCondition (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `Collect` | A cobrar |
| `Prepaid` | Prepagado |

**JSON Ejemplo:**
```json
{
  "isoCurrencyCode" : "EUR",
  "chargeCode" : "ALL_CHARGES_COLLECT",
  "payment_WeightValuation" : "Collect",
  "payment_OtherCharges" : "Collect",
  "declaredValueForCarriage" : "100.00",
  "declaredValueForCustoms" : "120.00",
  "declaredValueForInsurance" : "1000.00"
}
```

### 7.15 ChargeItem

**Descripción:** Item de cargo (también conocido como rate description).

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `numberOfPieces` | Número de piezas: Items sueltos y/o ULDs aceptados para transporte | INTEGER | No | `"8"` |
| `rateCombinationPointCityCode` | Punto de combinación de tarifa (RCP): Punto sobre el cual se combinan tarifas de sector. Patrón: código de 3 letras mayúsculas | STRING | No | `"PAR"` |
| `commodityItemNumber` | Array de números de item de commodity para identificar una commodity específica | Array de STRING | No | `["9017"]` |
| `grossWeight` | Peso bruto cobrable | [Weight](#74-weight) | No | Ver sección |
| `goodsDescription` | Naturaleza y cantidad de mercancías | STRING | No | `"Tooth paste"` |
| `consolidation` | Indica si 'goodsDescription' está contenida en el house waybill | BOOLEAN | No | `"true"` |
| `harmonisedCommodityCode` | Array de códigos de commodity armonizados (número para aduanas/estadísticas) | Array de STRING | No | `["427127829"]` |
| `isoCountryCodeOfOriginOfGoods` | País de origen de las mercancías | ISOCountryCode | No | `"US"` |
| `packaging` | Array de detalles de empaque | Array de [Packaging](#715a-packaging) | No | Ver sub-sección |
| `charges` | Array de datos de cargo | Array de [Charge](#715b-charge) | No | Ver sub-sección |
| `serviceCode` | Código de servicio | [ServiceCode](#715c-servicecode-enumeración) | No | `"AIRPORT_TO_AIRPORT"` |

#### 7.15a Packaging

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `numberOfPieces` | Número de piezas | INTEGER | No | `"8"` |
| `weight` | Peso | [Weight](#74-weight) | No | Ver sección |
| `volume` | Volumen | [Volume](#75-volume) | No | Ver sección |
| `dimensions` | Dimensiones | [Dimensions](#715a1-dimensions) | No | Ver sub-sección |
| `uld` | Unit Load Device | [ULD](#715a2-uld) | No | Ver sub-sección |
| `shippersLoadAndCount` | Carga y conteo del expedidor | STRING | No | `"15000"` |

##### 7.15a1 Dimensions

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `unit` | Unidad de medida | [DimensionUnit](#715a1a-dimensionunit-enumeración) | **Sí** | `"CENTIMETRE"` |
| `length` | Longitud | DECIMAL | **Sí** | `"200"` |
| `width` | Ancho | DECIMAL | **Sí** | `"150"` |
| `height` | Alto | DECIMAL | **Sí** | `"100"` |

###### 7.15a1a DimensionUnit (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `CENTIMETRE` | Centímetros |
| `INCH` | Pulgadas |
| `METRE` | Metros |

##### 7.15a2 ULD

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `type` | Tipo de ULD | STRING | **Sí** | `"ASE"` |
| `serialNumber` | Número de serie | STRING | **Sí** | `"1234"` |
| `ownerCode` | Código del propietario | STRING | **Sí** | `"TW"` |
| `loadingIndicator` | Indicador de carga | [LoadingIndicator](#715a2a-loadingindicator-enumeración) | No | `"MAIN_DECK_LOADING_ONLY"` |
| `remarks` | Observaciones | STRING | No | `"DO NOT LOAD VIA NOSE DOOR."` |
| `weightOfULDContents` | Peso del contenido del ULD | [Weight](#74-weight) | No | Ver sección |

###### 7.15a2a LoadingIndicator (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `MAIN_DECK_LOADING_ONLY` | Solo carga en cubierta principal |
| `LOWER_DECK_LOADING_ONLY` | Solo carga en cubierta inferior |
| *(otros valores pendientes)* | |

#### 7.15b Charge

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `chargeableWeight` | Peso cobrable | [Weight](#74-weight) | No | Ver sección |
| `rateClassCode` | Código de clase de tarifa | [RateClassCode](#715b1-rateclasscode-enumeración) | No | `"BASIC_CHARGE"` |
| `rateClassCodeBasis` | Base del código de clase de tarifa | [RateClassCode](#715b1-rateclasscode-enumeración) | No | `"BASIC_CHARGE"` |
| `classRatePercentage` | Porcentaje de tarifa de clase | STRING | No | `"67"` |
| `uldRateClassType` | Tipo de clase de tarifa ULD | STRING | No | `"8"` |
| `rateOrCharge` | Tarifa o cargo | DECIMAL | No | `"1234.56"` |
| `totalChargeAmount` | Monto total del cargo | DECIMAL | No | `"2500.00"` |

##### 7.15b1 RateClassCode (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `BASIC_CHARGE` | Cargo básico |
| `MINIMUM_CHARGE` | Cargo mínimo |
| `NORMAL_RATE` | Tarifa normal |
| `QUANTITY_RATE` | Tarifa por cantidad |
| `SPECIFIC_COMMODITY_RATE` | Tarifa de commodity específica |
| *(otros valores pendientes)* | |

#### 7.15c ServiceCode (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `AIRPORT_TO_AIRPORT` | Aeropuerto a aeropuerto |
| `DOOR_TO_DOOR` | Puerta a puerta |
| `DOOR_TO_AIRPORT` | Puerta a aeropuerto |
| `AIRPORT_TO_DOOR` | Aeropuerto a puerta |

**JSON Ejemplo:**
```json
{
  "numberOfPieces" : "8",
  "rateCombinationPointCityCode" : "PAR",
  "commodityItemNumber" : [ "9017" ],
  "grossWeight" : {
    "amount" : "100",
    "unit" : "KILOGRAM"
  },
  "goodsDescription" : "TOOTH PASTE",
  "consolidation" : "true",
  "harmonisedCommodityCode" : [ "427127829" ],
  "isoCountryCodeOfOriginOfGoods" : "US",
  "packaging" : [ {
    "numberOfPieces" : "8",
    "weight" : {
      "amount" : "100",
      "unit" : "KILOGRAM"
    },
    "volume" : {
      "amount" : "250",
      "unit" : "CUBIC_CENTIMETRE"
    },
    "dimensions" : {
      "unit" : "CENTIMETRE",
      "length" : "200",
      "width" : "150",
      "height" : "100"
    },
    "uld" : {
      "type" : "ASE",
      "serialNumber" : "1234",
      "ownerCode" : "TW",
      "loadingIndicator" : "MAIN_DECK_LOADING_ONLY",
      "remarks" : "DO NOT LOAD VIA NOSE DOOR.",
      "weightOfULDContents" : {
        "amount" : "100",
        "unit" : "KILOGRAM"
      }
    },
    "shippersLoadAndCount" : "15000"
  } ],
  "charges" : [ {
    "chargeableWeight" : {
      "amount" : "100",
      "unit" : "KILOGRAM"
    },
    "rateClassCode" : "BASIC_CHARGE",
    "rateClassCodeBasis" : "BASIC_CHARGE",
    "classRatePercentage" : "67",
    "uldRateClassType" : "8",
    "rateOrCharge" : "1234.56",
    "totalChargeAmount" : "2500.00"
  } ],
  "serviceCode" : "AIRPORT_TO_AIRPORT"
}
```

### 7.16 AgentIdentification

**Descripción:** Identifica un agente (si tiene derecho a comisión).

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `name` | Identificación de individuo o compañía | STRING | **Sí** | `"ACE SHIPPING CO."` |
| `place` | Ubicación del individuo o compañía | STRING | **Sí** | `"LONDON"` |
| `accountNumber` | Identificación codificada de un participante | STRING | No | `"ABC94269"` |
| `iataCargoAgentNumericCode` | Código Numérico de Agente de Carga IATA (código emitido por IATA para identificar cada Agente de Carga IATA) | STRING | **Sí** | `"1234567"` |
| `iataCargoAgentCASSAddress` | Dirección CASS del Agente de Carga IATA (código para identificar ubicaciones individuales de agentes para facturación CASS) | STRING | No | `"1234"` |
| `participantIdentifier` | Identificador de Participante: Código que identifica el tipo de participante en el movimiento del envío | STRING | No | `"CNE"` |

**Códigos Comunes de participantIdentifier:**

| Código | Descripción |
|--------|-------------|
| `AGT` | Agente |
| `CNE` | Consignatario |
| `SHP` | Shipper (Expedidor) |
| `FFW` | Freight Forwarder |
| `GHA` | Ground Handling Agent |

**JSON Ejemplo:**
```json
{
  "name" : "ACE SHIPPING CO.",
  "place" : "LONDON",
  "accountNumber" : "ABC94269",
  "iataCargoAgentNumericCode" : "1234567",
  "iataCargoAgentCASSAddress" : "1234",
  "participantIdentifier" : "CNE"
}
```

### 7.17 ChargeSummary

**Descripción:** Resumen de cargos - estructura que resume condiciones de cargo. Todos los valores son dinero en una moneda acordada.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `totalWeightCharge` | Monto de cargo por peso total | DECIMAL | No | `"120.99"` |
| `valuationCharge` | Monto de cargo de valoración | DECIMAL | No | `"110.00"` |
| `taxes` | Impuestos | DECIMAL | No | `"22.45"` |
| `totalOtherChargesDueAgent` | Total de otros cargos debidos al agente | DECIMAL | No | `"32.95"` |
| `totalOtherChargesDueCarrier` | Total de otros cargos debidos al transportista | DECIMAL | No | `"43.00"` |
| `chargeSummaryTotal` | Total de cargos | DECIMAL | **Sí** | `"329.39"` |

**JSON Ejemplo:**
```json
{
  "totalWeightCharge" : "120.99",
  "valuationCharge" : "110.00",
  "taxes" : "22.45",
  "totalOtherChargesDueAgent" : "32.95",
  "totalOtherChargesDueCarrier" : "43.00",
  "chargeSummaryTotal" : "329.39"
}
```

### 7.18 SpecialHandlingAndDangerousGoodsCode (Enumeración)

**Descripción:** Enumeración de códigos para manejo especial y mercancías peligrosas.

| Valor | Descripción |
|-------|-------------|
| `ACT` | Active Temperature Control |
| `AOG` | Aircraft on Ground |
| `BUP` | Bulk Unitization Program |
| `CAO` | Cargo Aircraft Only |
| `CAT` | Cat |
| `NSC` | Not Secured |
| `SHR` | Short Shipped |
| `COM` | Company Material |
| `ECP` | e-CSD Participating |
| `ECC` | e-CSD Capable |
| `CRT` | Critical |
| `COL` | Cool Goods |
| `RDS` | Rapid Delivery Service |
| `DIP` | Diplomatic |
| `EAP` | e-AWB Participating |
| `EAW` | e-AWB |
| `REQ` | Requires |
| `RRE` | Requires Refrigeration |
| `PES` | Perishable |
| `PEF` | Perishable - Frozen |
| `EAT` | Eat |
| `FRI` | Fragile |
| `FRO` | Frozen |
| `PEP` | Perishable - Packed |
| `ATT` | Attendant |
| `GOH` | Garment on Hanger |
| `HEG` | Hatching Eggs |
| `HEA` | Heavy |
| `HUM` | Human Remains |
| `PEA` | Perishable - Animal |
| `SCO` | Small Package |
| `SPF` | Special Freight |
| `SPX` | Special Cargo |
| `LIC` | License Required |
| `AVI` | Live Animals |
| `LHO` | Live Human Organs |
| `MAL` | Mail |
| `PEM` | Perishable - Meat |
| `MUW` | Munitions of War |
| `NWP` | Newspapers |
| `OBX` | Obnoxious |
| `BIG` | Outsized |
| `OHG` | Overhang |
| `PAC` | Priority Air Cargo |
| `PER` | Perishable |
| `PIL` | Pillows |
| `XPS` | Express |
| `QRT` | Quick Return |
| `RAC` | Remains in Coffin |
| `SHL` | Save Human Life |
| `WET` | Wet Cargo |
| `SWP` | Swapped |
| `SUR` | Surface |
| `FIL` | Film |
| `VAL` | Valuable |
| `VIC` | Very Important Cargo |
| `VOL` | Volume |
| `VUN` | Vulnerable |
| `PEB` | Perishable - Blood |
| `PHY` | Pharmaceuticals |
| `VAG` | Vaccines |
| `FSA` | FSA |
| `XPH` | Express Priority Handling |
| `AER` | Aerosols |
| `VIP` | VIP |
| `UCB` | Uncleared Customs Bond |
| `XPU` | Express Priority |
| `MON` | Monetary |
| `PEV` | Perishable - Vegetables |
| `ART` | Art |
| `BSD` | Base Documents |
| `BPL` | Blood Plasma |
| `CSL` | Consolidated |
| `DGR` | Dangerous Goods |
| `NOS` | Not Otherwise Specified |
| `PPL` | Partial Packed Loose |
| `SEC` | Security |
| `SMU` | Small Package Under |
| `ZXF` | Priority 1 |
| `ZXO` | Priority 2 |
| `ELI` | Lithium Batteries Contained in Equipment |
| `ELM` | Lithium Metal Batteries Contained in Equipment |
| `RCM` | Radioactive Material Cat I |
| `RCL` | Radioactive Material Cat II |
| `RFW` | Radioactive Material Cat III |
| `ICE` | Dry Ice |
| `REX` | Excepted Quantities |
| `RCX` | Radioactive Excepted |
| `RGX` | Radioactive LSA |
| `RLI` | Lithium Ion Batteries |
| `RLM` | Lithium Metal Batteries |
| `RXB` | Magnetized Material |
| `RXC` | Cryogenic |
| `RXD` | Diagnostic Specimens |
| `RXE` | Biological Substance Cat B |
| `RXG` | Genetically Modified Organisms |
| `RXS` | Clinical Samples |
| `RFG` | Flammable Gas |
| `RFL` | Flammable Liquid |
| `RFS` | Flammable Solid |
| `RIS` | Infectious Substance |
| `MAG` | Magnetized |
| `RMD` | Miscellaneous Dangerous Goods |
| `RNG` | Non-Flammable Gas |
| `ROP` | Organic Peroxide |
| `ROX` | Oxidizer |
| `RPB` | Toxic Substance |
| `RPG` | Poison Gas |
| `RSB` | Polymeric Beads |
| `RRW` | Radioactive White |
| `RRY` | Radioactive Yellow |
| `RSC` | Spontaneously Combustible |

### 7.19 Accounting

**Descripción:** Información contable.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `identifier` | Identificador de Información Contable (código que indica un tipo específico de información contable) | [AccountingInformationIdentifier](#719a-accountinginformationidentifier-enumeración) | **Sí** | `"GovernmentBillOfLading"` |
| `accountingInformation` | Detalle de la información contable | STRING | **Sí** | `"Payment by certified cheque."` |

#### 7.19a AccountingInformationIdentifier (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `GovernmentBillOfLading` | Carta de porte gubernamental |
| *(otros valores pendientes de documentar)* | |

**JSON Ejemplo:**
```json
{
  "identifier" : "GovernmentBillOfLading",
  "accountingInformation" : "PAYMENT BY CERTIFIED CHEQUE."
}
```

### 7.20 OtherChargeItem

**Descripción:** Estructura para otros items de cargo.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `paymentCondition` | Indicador Prepaid/Collect | [PaymentCondition](#714b-paymentcondition-enumeración) | **Sí** | `"Collect"` |
| `otherChargeCode` | Código de otro cargo | [OtherChargeCode](#720a-otherchargecode-enumeración) | **Sí** | `"UC"` |
| `entitlementCode` | Código de derecho | [EntitlementCode](#720b-entitlementcode-enumeración) | **Sí** | `"Agent"` |
| `chargeAmount` | Monto del cargo (dinero) | DECIMAL | **Sí** | `"120.46"` |

#### 7.20a OtherChargeCode (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `UC` | Charge not otherwise specified |
| `AW` | Air Waybill Fee |
| `FC` | Charges Collect Fee |
| `DB` | Disbursement Fee |
| `IN` | Insurance |
| `SC` | Storage Charges |
| *(otros valores pendientes)* | |

#### 7.20b EntitlementCode (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `Agent` | Agente |
| `Carrier` | Transportista |

**JSON Ejemplo:**
```json
{
  "paymentCondition" : "Collect",
  "otherChargeCode" : "UC",
  "entitlementCode" : "Agent",
  "chargeAmount" : "120.46"
}
```

### 7.21 CollectChargesInDestinationCurrency

**Descripción:** Cargos a cobrar en moneda de destino. *(Pendiente especificación detallada)*

**JSON Ejemplo:**
```json
{
  "isoCurrencyCode" : "EUR",
  "currencyConversionRateOfExchange" : "2.1512",
  "chargesInDestinationCurrency" : "430.24",
  "chargesAtDestination" : "200.00",
  "totalCollectCharges" : "200.00"
}
```

### 7.22 CommissionInfo

**Descripción:** Información de comisión. *(Pendiente especificación detallada)*

**JSON Ejemplo:**
```json
{
  "amountCASSSettlementFactor" : "139",
  "percentageCASSSettlementFactor" : "12"
}
```

### 7.23 SalesIncentive

**Descripción:** Información de incentivo de ventas. *(Pendiente especificación detallada)*

**JSON Ejemplo:**
```json
{
  "chargeAmount" : "20.00",
  "cassIndicator" : "AWB_AS_INVOICE"
}
```

### 7.24 NominatedHandlingParty

**Descripción:** Parte de manejo nominada. *(Pendiente especificación detallada)*

**JSON Ejemplo:**
```json
{
  "name" : "ACE Shipping Co.",
  "place" : "London"
}
```

### 7.25 ShipmentReferenceInfo

**Descripción:** Información de referencia del envío. *(Pendiente especificación detallada)*

**JSON Ejemplo:**
```json
{
  "referenceNumber" : "ABCD-12345",
  "info" : "COMPANY MAT"
}
```

### 7.26 OtherParticipant

**Descripción:** Información de otros participantes. *(Pendiente especificación detallada)*

**JSON Ejemplo:**
```json
{
  "name" : "ACE Shipping Co.",
  "officeMessageAddress" : {
    "airportCityCode" : "LHR",
    "officeFunctionDesignator" : "6F",
    "companyDesignator" : "XB"
  },
  "fileReference" : "123456",
  "participantIdentification" : {
    "identifier" : "AIR",
    "code" : "98764",
    "airportCityCode" : "LHR"
  }
}
```

### 7.27 OCI (Other Customs Information)

**Descripción:** Otra información aduanera, de seguridad y control regulatorio.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `isoCountryCode` | Código de país ISO | ISOCountryCode | No | `"US"` |
| `informationIdentifier` | Identificador de información | [DataElementGroupIdentifier](#727a-dataelementgroupidentifier-enumeración) | No | `"ACC"` |
| `controlInformation` | Identificador de información de control aduanero, seguridad y regulatorio | [CustomsSecurityAndRegulatoryControlInformationIdentifier](#727b-customssecurityandregulatorycontrolinformationidentifier-enumeración) | No | `"ACCOUNT_CONSIGNOR"` |
| `additionalControlInformation` | Identificador no contenido en IATA CIMP Spec | STRING | No | `"D"` |
| `supplementaryControlInformation` | Información suplementaria identificando parte o ubicación relacionada con requerimientos aduaneros | STRING | No | `"BCBP123"` |

#### 7.27a DataElementGroupIdentifier (Enumeración)

**Descripción:** Código que identifica un grupo particular de elementos de datos.

| Valor | Descripción |
|-------|-------------|
| `ACC` | Account |
| `AGT` | Agent |
| `ARD` | Arrival Date |
| `API` | Advance Passenger Information |
| `AIR` | Airline |
| `ALA` | Alarm |
| `ALI` | Alias |
| `ALR` | Alert |
| `ALT` | Alternative |
| `AUD` | Audit |
| `NFY` | Notify |
| `AMD` | Amendment |
| `AID` | Aid |
| `ATH` | Authentication |
| `AVS` | Advice |
| `ABI` | ABI |
| `ACS` | ACS |
| `ACD` | ACD |
| `CER` | Certificate |
| `ISU` | Issue |
| `ISS` | Issuer |
| `ARI` | Arrival Information |
| `ABS` | ABS |
| `ABT` | ABT |
| `ATW` | ATW |
| `BGD` | Background |
| `BGT` | Budget |
| `REF` | Reference |
| `BRK` | Broker |
| `CCL` | Cancel |
| `CRD` | Credit |
| `CWI` | CWI |
| `CBD` | CBD |
| `CBI` | CBI |
| `CBP` | CBP |
| `CIN` | CIN |
| `CIH` | CIH |
| `CDC` | CDC |
| `CAI` | CAI |
| `CAS` | CAS |
| `CTI` | CTI |
| `CTW` | CTW |
| `RQD` | RQD |
| `RQT` | RQT |
| `RQH` | RQH |
| `RQU` | RQU |
| `RQV` | RQV |
| `CDI` | CDI |
| `CVD` | CVD |
| `COL` | Collection |
| `COI` | COI |
| `CNE` | Consignee |
| `CCD` | CCD |
| `CMI` | CMI |
| `CID` | CID |
| `CBR` | CBR |
| `CBS` | CBS |
| `CBV` | CBV |
| `CUR` | Currency |
| `CUS` | Customs |
| `CAN` | Canada |
| `CND` | CND |
| `COR` | Correction |
| `DTN` | DTN |
| `DCL` | Declaration |
| `DES` | Description |
| `DAI` | DAI |
| `DAP` | DAP |
| `DAT` | Date |
| `DCI` | DCI |
| `DHD` | DHD |
| `DAU` | DAU |
| `DII` | DII |
| `DNR` | DNR |
| `DPI` | DPI |
| `DQP` | DQP |
| `DSN` | DSN |
| `DOS` | DOS |
| `DRA` | DRA |
| `DRC` | DRC |
| `DRP` | DRP |
| `DSU` | DSU |
| `DIM` | Dimensions |
| `DOC` | Document |
| `CRR` | Carrier |
| `COM` | Communication |
| `JST` | JST |
| `RTS` | RTS |
| `EIC` | EIC |
| `EXP` | Export |
| `FLT` | Flight |
| `TXT` | Text |
| `GRI` | GRI |
| `GTI` | GTI |
| `HDL` | Handling |
| `HTS` | HTS |
| `HWB` | House Waybill |
| `HPI` | HPI |
| `HAH` | HAH |
| `HCD` | HCD |
| `HLC` | HLC |
| `HBS` | HBS |
| `IMP` | Import |
| `ITA` | ITA |
| `ITW` | ITW |
| `LOC` | Location |
| `MAL` | MAL |
| `MCH` | MCH |
| `MCT` | MCT |
| `MHU` | MHU |
| `MID` | MID |
| `MLI` | MLI |
| `MOD` | MOD |
| `MSD` | MSD |
| `MUD` | MUD |
| `MBI` | MBI |
| `MSU` | MSU |
| `MAT` | MAT |
| `MPI` | MPI |
| `NAM` | Name |
| `NBI` | NBI |
| `NNS` | NNS |
| `NEW` | New |
| `NOM` | Nominated |
| `OLD` | Old |
| `OTH` | Other |
| `OCI` | OCI |
| `OPI` | OPI |
| `OSI` | OSI |
| `PAS` | Passenger |
| `PPD` | Prepaid |
| `PRD` | PRD |
| `PID` | PID |
| `RTD` | RTD |
| `RID` | RID |
| `RIH` | RIH |
| `RIR` | RIR |
| `ACK` | Acknowledge |
| `RCI` | RCI |
| `RTI` | RTI |
| `REC` | Record |
| `RTG` | Routing |
| `SII` | SII |
| `SAR` | SAR |
| `SAA` | SAA |
| `SKH` | SKH |
| `SRI` | SRI |
| `SHP` | Shipper |
| `SCI` | SCI |
| `SPH` | Special Handling |
| `SSR` | Special Service Request |
| `STS` | Status |
| `SLC` | SLC |
| `STI` | STI |
| `ADR` | Address |
| `SRA` | SRA |
| `SRR` | SRR |
| `SSI` | SSI |
| `SCS` | SCS |
| `SDI` | SDI |
| `SPI` | SPI |
| `SVA` | SVA |
| `SVL` | SVL |
| `SVD` | SVD |
| `SVN` | SVN |
| `TXS` | Taxes |
| `TID` | TID |
| `OSS` | OSS |
| `TOT` | Total |
| `TAR` | Tariff |
| `TCC` | TCC |
| `TRN` | Transaction |
| `TRA` | Transfer |
| `UCI` | UCI |
| `ULD` | ULD |
| `UDI` | UDI |
| `UII` | UII |
| `UMI` | UMI |
| `UPI` | UPI |
| `VOD` | VOD |
| `VCD` | VCD |
| `WBD` | WBD |
| `WBL` | Waybill |
| `WBH` | WBH |
| `WBI` | WBI |

#### 7.27b CustomsSecurityAndRegulatoryControlInformationIdentifier (Enumeración)

**Descripción:** Identificador de información de control aduanero, seguridad y regulatorio.

| Valor | Descripción |
|-------|-------------|
| `ACCOUNT_CONSIGNOR` | Cuenta del consignador |
| `AUTHORISED_ECONOMIC_OPERATOR` | Operador económico autorizado |
| `AUTOMATED_BROKER_INTERFACE` | Interfaz de broker automatizado |
| `CERTIFICATE_NUMBER` | Número de certificado |
| `DANGEROUS_GOODS` | Mercancías peligrosas |
| `EXEMPTION_LEGEND` | Leyenda de exención |
| `INVOICE_NUMBER` | Número de factura |
| `ITEM_NUMBER` | Número de item |
| `FACILITIES_INFORMATION` | Información de instalaciones |
| `KNOWN_CONSIGNOR` | Consignador conocido |
| `MOVEMENT_REFERENCE_NUMBER` | Número de referencia de movimiento |
| `PACKING_LIST_NUMBER` | Número de lista de empaque |
| `REGULATED_AGENT` | Agente regulado |
| `REGULATED_CARRIER` | Transportista regulado |
| `LICENSE_IDENTIFICATION` | Identificación de licencia |
| `DECLARATION_IDENTIFICATION` | Identificación de declaración |
| `SCREENING_METHOD` | Método de screening |
| `SECURITY_STATUS_DATE_AND_TIME` | Fecha y hora del estado de seguridad |
| `SECURITY_STATUS_NAME_OF_ISSUER` | Nombre del emisor del estado de seguridad |
| `SECURITY_STATUS` | Estado de seguridad |
| `SECURITY_TEXTUAL_STATEMENT` | Declaración textual de seguridad |
| `EXPIRY_DATE` | Fecha de expiración |
| `SEAL_NUMBER` | Número de sello |
| `SYSTEM_DOWNTIME_REFERENCE` | Referencia de tiempo de inactividad del sistema |
| `TRADER_IDENTIFICATION_NUMBER` | Número de identificación del comerciante |
| `UNIQUE_CONSIGNMENT_REFERENCE_NUMBER` | Número de referencia único del envío |
| `CUSTOMS_SECURITY_BLOCK` | Bloqueo de seguridad aduanera |
| `CUSTOMS_SECURITY_HOLD_DO_NOT_LOAD` | Retención de seguridad aduanera - No cargar |
| `CUSTOMS_RELEASE_OK` | Liberación aduanera OK |
| `CONTACT_PERSON` | Persona de contacto |
| `CONTACT_TELEPHONE_NUMBER` | Número de teléfono de contacto |

**JSON Ejemplos:**

Con código de país:
```json
{
  "isoCountryCode" : "US",
  "informationIdentifier" : "ISS",
  "controlInformation" : "REGULATED_AGENT",
  "additionalControlInformation" : "RA",
  "supplementaryControlInformation" : "01000-001"
}
```

Sin código de país:
```json
{
  "controlInformation" : "EXPIRY_DATE",
  "supplementaryControlInformation" : "0220"
}
```

### 7.28 JSON Ejemplo Completo - AirWayBill

```json
{
  "airWaybillNumber" : "123-12345678",
  "origin" : "FRA",
  "destination" : "FRA",
  "totalConsignmentNumberOfPieces" : "20",
  "weight" : {
    "amount" : "100",
    "unit" : "KILOGRAM"
  },
  "volume" : {
    "amount" : "250",
    "unit" : "CUBIC_CENTIMETRE"
  },
  "densityGroup" : "KG60_PER_CUBICMETRE",
  "flights" : [ {
    "flight" : "LH116",
    "scheduledDate" : "2017-09-05",
    "scheduledTime" : "11:46:13.000"
  } ],
  "route" : [ {
    "carrierCode" : "BA",
    "destination" : "FRA"
  } ],
  "shipper" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "DONALD TRUMP",
      "name2" : "PRESIDENT OF THE UNITED STATES OF AMERICA",
      "streetAddress1" : "THE WHITE HOUSE",
      "streetAddress2" : "1600 PENNSYLVANIA AVENUE NW",
      "place" : "WASHINGTON",
      "stateProvince" : "DC",
      "country" : "US",
      "postCode" : "20500"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "5148446311"
    } ]
  },
  "consignee" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "ANGELA MERKEL",
      "name2" : "FEDERAL CHANCELOR",
      "streetAddress1" : "WILLY-BRANDT-STRASSE 1",
      "streetAddress2" : "BUNDESKANZLERAMT",
      "place" : "BERLIN",
      "stateProvince" : "BE",
      "country" : "DE",
      "postCode" : "10557"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "491802720000"
    } ]
  },
  "carriersExecution" : {
    "date" : "2017-09-05",
    "placeOrAirportCityCode" : "LONDON",
    "authorisationSignature" : "K. WILSON"
  },
  "senderReference" : {
    "fileReference" : "123456",
    "participantIdentifier" : {
      "identifier" : "AGT",
      "code" : "AGENT",
      "airportCityCode" : "LHR"
    }
  },
  "chargeDeclarations" : {
    "isoCurrencyCode" : "EUR",
    "chargeCode" : "ALL_CHARGES_COLLECT",
    "payment_WeightValuation" : "Collect",
    "payment_OtherCharges" : "Collect",
    "declaredValueForCarriage" : "100.00",
    "declaredValueForCustoms" : "120.00",
    "declaredValueForInsurance" : "1000.00"
  },
  "chargeItems" : [ {
    "numberOfPieces" : "8",
    "rateCombinationPointCityCode" : "PAR",
    "commodityItemNumber" : [ "9017" ],
    "grossWeight" : {
      "amount" : "100",
      "unit" : "KILOGRAM"
    },
    "goodsDescription" : "TOOTH PASTE",
    "consolidation" : "true",
    "harmonisedCommodityCode" : [ "427127829" ],
    "isoCountryCodeOfOriginOfGoods" : "US",
    "packaging" : [ {
      "numberOfPieces" : "8",
      "weight" : {
        "amount" : "100",
        "unit" : "KILOGRAM"
      },
      "volume" : {
        "amount" : "250",
        "unit" : "CUBIC_CENTIMETRE"
      },
      "dimensions" : {
        "unit" : "CENTIMETRE",
        "length" : "200",
        "width" : "150",
        "height" : "100"
      },
      "uld" : {
        "type" : "ASE",
        "serialNumber" : "1234",
        "ownerCode" : "TW",
        "loadingIndicator" : "MAIN_DECK_LOADING_ONLY",
        "remarks" : "DO NOT LOAD VIA NOSE DOOR.",
        "weightOfULDContents" : {
          "amount" : "100",
          "unit" : "KILOGRAM"
        }
      },
      "shippersLoadAndCount" : "15000"
    } ],
    "charges" : [ {
      "chargeableWeight" : {
        "amount" : "100",
        "unit" : "KILOGRAM"
      },
      "rateClassCode" : "BASIC_CHARGE",
      "rateClassCodeBasis" : "BASIC_CHARGE",
      "classRatePercentage" : "67",
      "uldRateClassType" : "8",
      "rateOrCharge" : "1234.56",
      "totalChargeAmount" : "2500.00"
    } ],
    "serviceCode" : "AIRPORT_TO_AIRPORT"
  } ],
  "agent" : {
    "name" : "ACE SHIPPING CO.",
    "place" : "LONDON",
    "accountNumber" : "ABC94269",
    "iataCargoAgentNumericCode" : "1234567",
    "iataCargoAgentCASSAddress" : "1234",
    "participantIdentifier" : "CNE"
  },
  "specialServiceRequest" : "MUST BE KEPT ABOVE 5 DEGREES CELSIUS.",
  "alsoNotify" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "DONALD TRUMP",
      "name2" : "PRESIDENT OF THE UNITED STATES OF AMERICA",
      "streetAddress1" : "THE WHITE HOUSE",
      "streetAddress2" : "1600 PENNSYLVANIA AVENUE NW",
      "place" : "WASHINGTON",
      "stateProvince" : "DC",
      "country" : "US",
      "postCode" : "20500"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "5148446311"
    } ]
  },
  "prepaidChargeSummary" : {
    "totalWeightCharge" : "120.99",
    "valuationCharge" : "110.00",
    "taxes" : "22.45",
    "totalOtherChargesDueAgent" : "32.95",
    "totalOtherChargesDueCarrier" : "43.00",
    "chargeSummaryTotal" : "329.39"
  },
  "collectChargeSummary" : {
    "totalWeightCharge" : "120.99",
    "valuationCharge" : "110.00",
    "taxes" : "22.45",
    "totalOtherChargesDueAgent" : "32.95",
    "totalOtherChargesDueCarrier" : "43.00",
    "chargeSummaryTotal" : "329.39"
  },
  "specialHandlingCodes" : [ "ACT" ],
  "additionalSpecialHandlingCodes" : [ "FOO" ],
  "accounting" : [ {
    "identifier" : "GovernmentBillOfLading",
    "accountingInformation" : "PAYMENT BY CERTIFIED CHEQUE."
  } ],
  "otherCharges" : [ {
    "paymentCondition" : "Collect",
    "otherChargeCode" : "UC",
    "entitlementCode" : "Agent",
    "chargeAmount" : "120.46"
  } ],
  "shippersCertification" : "K. WILSON",
  "otherServiceInformation" : "EXTRA CHARGE DUE TO SPECIAL HANDLING REQUIREMENTS.",
  "chargesCollectInDestCurrency" : {
    "isoCurrencyCode" : "EUR",
    "currencyConversionRateOfExchange" : "2.1512",
    "chargesInDestinationCurrency" : "430.24",
    "chargesAtDestination" : "200.00",
    "totalCollectCharges" : "200.00"
  },
  "customsOriginCode" : "T2",
  "commissionInfo" : {
    "amountCASSSettlementFactor" : "139",
    "percentageCASSSettlementFactor" : "12"
  },
  "salesIncentive" : {
    "chargeAmount" : "20.00",
    "cassIndicator" : "AWB_AS_INVOICE"
  },
  "agentFileReference" : "123456",
  "nominatedHandlingParty" : {
    "name" : "ACE Shipping Co.",
    "place" : "London"
  },
  "shipmentReferenceInformation" : {
    "referenceNumber" : "ABCD-12345",
    "info" : "COMPANY MAT"
  },
  "otherParticipant" : [ {
    "name" : "ACE Shipping Co.",
    "officeMessageAddress" : {
      "airportCityCode" : "LHR",
      "officeFunctionDesignator" : "6F",
      "companyDesignator" : "XB"
    },
    "fileReference" : "123456",
    "participantIdentification" : {
      "identifier" : "AIR",
      "code" : "98764",
      "airportCityCode" : "LHR"
    }
  } ],
  "oci" : [ {
    "isoCountryCode" : "US",
    "informationIdentifier" : "ISS",
    "controlInformation" : "REGULATED_AGENT",
    "additionalControlInformation" : "RA",
    "supplementaryControlInformation" : "01000-001"
  },
  {
    "controlInformation" : "EXPIRY_DATE",
    "supplementaryControlInformation" : "0220"
  } ]
}
```

---

## 8. HouseWaybillMessage

**Descripción:** Mensaje canónico de carga que contiene un HouseWaybill como payload.

**Importante:** Esta estructura es un subtipo identificado por un parámetro de tipo llamado `"type"`. El nombre del tipo es siempre `"house waybill"` y la información del tipo **DEBE** ser el primer elemento en los datos JSON.

### 8.1 Campos Principales

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `type` | Identificador del tipo de mensaje. **DEBE ser el primer campo del JSON** | STRING (constante) | **Sí** | `"house waybill"` |
| `id` | Identificación única del mensaje | UUID | **Sí** | `"1f7cb56b-7aa4-4077-b38d-9371a24fa45c"` |
| `messageHeader` | Cabecera del mensaje | [MessageHeader](#2-messageheader) | **Sí** | Ver sección 2 |
| `payload` (unwrapped) | Cuerpo del mensaje con el payload de negocio. **Nota:** El nombre "payload" NO se usa en el JSON, los campos se incluyen directamente | [HouseWaybill](#9-housewaybill-payload) | No | Ver sección 9 |

### 8.2 JSON Ejemplo Completo - HouseWaybillMessage

```json
{
  "type" : "house waybill",
  "id" : "1f7cb56b-7aa4-4077-b38d-9371a24fa45c",
  "messageHeader" : {
    "addressing" : {
      "routeVia" : {
        "type" : "PIMA",
        "address" : "REUAIR08AIRLINE"
      },
      "routeAnswerVia" : {
        "type" : "PIMA",
        "address" : "REUAIR08AIRLINE"
      },
      "senderAddresses" : [ {
        "type" : "PIMA",
        "address" : "REUAGT87SENDER"
      } ],
      "finalRecipientAddresses" : [ {
        "type" : "PIMA",
        "address" : "REUAIR08AIRLINE"
      } ],
      "replyAnswerTo" : [ {
        "type" : "PIMA",
        "address" : "REUAGT87SENDER"
      } ]
    },
    "creationDate" : "2017-09-05T11:46:13.000",
    "edifactData" : {
      "commonAccessReference" : "CARMAX14",
      "messageReference" : "MSGREFMAX14",
      "password" : "password",
      "interchangeControlReference" : "ICREFMAX14"
    }
  },
  "airWaybillNumber" : "123-12345678",
  "origin" : "FRA",
  "destination" : "FRA",
  "serialNumber" : "LON123456789",
  "numberOfPieces" : "42",
  "weight" : {
    "amount" : "100",
    "unit" : "KILOGRAM"
  },
  "flights" : [ {
    "flight" : "LH116",
    "scheduledDate" : "2017-09-05",
    "scheduledTime" : "11:46:13.000"
  } ],
  "route" : [ {
    "carrierCode" : "BA",
    "destination" : "FRA"
  } ],
  "shipper" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "DONALD TRUMP",
      "name2" : "PRESIDENT OF THE UNITED STATES OF AMERICA",
      "streetAddress1" : "THE WHITE HOUSE",
      "streetAddress2" : "1600 PENNSYLVANIA AVENUE NW",
      "place" : "WASHINGTON",
      "stateProvince" : "DC",
      "country" : "US",
      "postCode" : "20500"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "5148446311"
    } ]
  },
  "consignee" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "ANGELA MERKEL",
      "name2" : "FEDERAL CHANCELOR",
      "streetAddress1" : "WILLY-BRANDT-STRASSE 1",
      "streetAddress2" : "BUNDESKANZLERAMT",
      "place" : "BERLIN",
      "stateProvince" : "BE",
      "country" : "DE",
      "postCode" : "10557"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "491802720000"
    } ]
  },
  "agent" : {
    "name" : "ACE SHIPPING CO.",
    "place" : "LONDON",
    "accountNumber" : "ABC94269",
    "iataCargoAgentNumericCode" : "1234567",
    "iataCargoAgentCASSAddress" : "1234",
    "participantIdentifier" : "AGT"
  },
  "specialServiceRequest" : "EN CLOSE POUCH WITH EXPORT DOCUMENTS",
  "alsoNotify" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "DONALD TRUMP",
      "name2" : "PRESIDENT OF THE UNITED STATES OF AMERICA",
      "streetAddress1" : "THE WHITE HOUSE",
      "streetAddress2" : "1600 PENNSYLVANIA AVENUE NW",
      "place" : "WASHINGTON",
      "stateProvince" : "DC",
      "country" : "US",
      "postCode" : "20500"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "5148446311"
    } ]
  },
  "accounting" : [ {
    "identifier" : "GovernmentBillOfLading",
    "accountingInformation" : "PAYMENT BY CERTIFIED CHEQUE."
  } ],
  "chargeDeclarations" : {
    "isoCurrencyCode" : "EUR",
    "chargeCode" : "ALL_CHARGES_COLLECT",
    "payment_WeightValuation" : "Collect",
    "payment_OtherCharges" : "Collect",
    "declaredValueForCarriage" : "100.00",
    "declaredValueForCustoms" : "120.00",
    "declaredValueForInsurance" : "1000.00"
  },
  "chargeItems" : [ {
    "numberOfPieces" : "8",
    "rateCombinationPointCityCode" : "PAR",
    "commodityItemNumber" : [ "9017" ],
    "grossWeight" : {
      "amount" : "100",
      "unit" : "KILOGRAM"
    },
    "goodsDescription" : "Tooth paste",
    "consolidation" : "true",
    "harmonisedCommodityCode" : [ "427127829" ],
    "isoCountryCodeOfOriginOfGoods" : "US",
    "packaging" : [ {
      "numberOfPieces" : "8",
      "weight" : {
        "amount" : "100",
        "unit" : "KILOGRAM"
      },
      "volume" : {
        "amount" : "250",
        "unit" : "CUBIC_CENTIMETRE"
      },
      "dimensions" : {
        "unit" : "CENTIMETRE",
        "length" : "200",
        "width" : "150",
        "height" : "100"
      },
      "uld" : {
        "type" : "ASE",
        "serialNumber" : "1234",
        "ownerCode" : "TW",
        "loadingIndicator" : "MAIN_DECK_LOADING_ONLY",
        "remarks" : "DO NOT LOAD VIA NOSE DOOR.",
        "weightOfULDContents" : {
          "amount" : "100",
          "unit" : "KILOGRAM"
        }
      },
      "shippersLoadAndCount" : "15000"
    } ],
    "charges" : [ {
      "chargeableWeight" : {
        "amount" : "100",
        "unit" : "KILOGRAM"
      },
      "rateClassCode" : "BASIC_CHARGE",
      "rateClassCodeBasis" : "BASIC_CHARGE",
      "classRatePercentage" : "67",
      "uldRateClassType" : "8",
      "rateOrCharge" : "1234.56",
      "totalChargeAmount" : "2500.00"
    } ],
    "serviceCode" : "AIRPORT_TO_AIRPORT"
  } ],
  "otherCharges" : [ {
    "paymentCondition" : "Collect",
    "otherChargeCode" : "UC",
    "entitlementCode" : "Agent",
    "chargeAmount" : "120.46"
  } ],
  "prepaidChargeSummary" : {
    "totalWeightCharge" : "120.99",
    "valuationCharge" : "110.00",
    "taxes" : "22.45",
    "totalOtherChargesDueAgent" : "32.95",
    "totalOtherChargesDueCarrier" : "43.00",
    "chargeSummaryTotal" : "329.39"
  },
  "collectChargeSummary" : {
    "totalWeightCharge" : "120.99",
    "valuationCharge" : "110.00",
    "taxes" : "22.45",
    "totalOtherChargesDueAgent" : "32.95",
    "totalOtherChargesDueCarrier" : "43.00",
    "chargeSummaryTotal" : "329.39"
  },
  "shippersCertification" : "AGENT",
  "carriersExecution" : {
    "date" : "2017-09-05",
    "placeOrAirportCityCode" : "LONDON",
    "authorisationSignature" : "K. WILSON"
  },
  "otherServiceInformation" : "not secured",
  "customsOriginCode" : "T1",
  "agentsHeadOffice" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "DONALD TRUMP",
      "name2" : "PRESIDENT OF THE UNITED STATES OF AMERICA",
      "streetAddress1" : "THE WHITE HOUSE",
      "streetAddress2" : "1600 PENNSYLVANIA AVENUE NW",
      "place" : "WASHINGTON",
      "stateProvince" : "DC",
      "country" : "US",
      "postCode" : "20500"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "5148446311"
    } ]
  },
  "letterOfCredit" : "SYSTEM CLOSED 01-02 AM UTC",
  "otherParticipant" : [ {
    "fileReference" : "123456",
    "participantIdentification" : {
      "identifier" : "AGT",
      "code" : "ACESHIPPING",
      "airportCityCode" : "LHR"
    }
  } ],
  "specialHandlingCodes" : [ "ACT" ],
  "additionalSpecialHandlingCodes" : [ "FOO" ],
  "shipmentReferenceInformation" : {
    "referenceNumber" : "ABCD-12345",
    "info" : "COMPANY MAT"
  },
  "oci" : [ {
    "isoCountryCode" : "US",
    "informationIdentifier" : "ISS",
    "controlInformation" : "REGULATED_AGENT",
    "additionalControlInformation" : "RA",
    "supplementaryControlInformation" : "01000-001"
  },
  {
    "controlInformation" : "EXPIRY_DATE",
    "supplementaryControlInformation" : "0220"
  } ]
}
```

---

## 9. HouseWaybill (Payload)

**Descripción:** Payload del mensaje HouseWaybill.

**Nota Importante:** Estos campos van directamente en la raíz del JSON del mensaje (no dentro de un objeto "payload"), ya que el payload está "unwrapped".

### 9.1 Campos del HouseWaybill

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `airWaybillNumber` | Número del Air Waybill | [AirWaybillNumber](#72-airwaybillnumber) | **Sí** | `"020-97162321"` |
| `origin` | Código de aeropuerto de origen | [IATAAirportCode](#73-iataairportcode) | **Sí** | `"FRA"` |
| `destination` | Código de aeropuerto de destino | [IATAAirportCode](#73-iataairportcode) | **Sí** | `"FRA"` |
| `serialNumber` | Número de serie del house waybill | STRING | **Sí** | `"LON123456789"` |
| `numberOfPieces` | Número de piezas | INTEGER | **Sí** | `"42"` |
| `weight` | Peso | [Weight](#74-weight) | **Sí** | Ver sección 7.4 |
| `flights` | Vuelos | Array de [Flight](#77-flight) | No | Ver sección 7.7 |
| `route` | Ruta | Array de [Routing](#78-routing) | No | Ver sección 7.8 |
| `shipper` | Expedidor del House (recomendado para consolidados) | [AccountContact](#79-accountcontact) | **Recomendado** | Ver sección 7.9 |
| `consignee` | Consignatario del House (recomendado para consolidados) | [AccountContact](#79-accountcontact) | **Recomendado** | Ver sección 7.9 |
| `agent` | Agente | [AgentIdentification](#716-agentidentification) | No | Ver sección 7.16 |
| `specialServiceRequest` | Solicitud de servicio especial | STRING | No | `"En close pouch with export documents"` |
| `alsoNotify` | Parte a notificar también | [AccountContact](#79-accountcontact) | No | Ver sección 7.9 |
| `accounting` | Información contable | Array de [Accounting](#719-accounting) | No | Ver sección 7.19 |
| `chargeDeclarations` | Declaraciones de cargos | [ChargeDeclarations](#714-chargedeclarations) | **Sí** | Ver sección 7.14 |
| `chargeItems` | Items de cargo | Array de [ChargeItem](#715-chargeitem) | No | Ver sección 7.15 |
| `otherCharges` | Otros cargos | Array de [OtherChargeItem](#720-otherchargeitem) | No | Ver sección 7.20 |
| `prepaidChargeSummary` | Resumen de cargos prepagados | [ChargeSummary](#717-chargesummary) | No | Ver sección 7.17 |
| `collectChargeSummary` | Resumen de cargos a cobrar | [ChargeSummary](#717-chargesummary) | No | Ver sección 7.17 |
| `shippersCertification` | Certificación del expedidor | STRING | No | `"AGENT"` |
| `carriersExecution` | Ejecución del transportista | [CarriersExecution](#712-carriersexecution) | **Sí** | Ver sección 7.12 |
| `otherServiceInformation` | Otra información de servicio | STRING | No | `"not secured"` |
| `customsOriginCode` | Código de origen aduanas | STRING | No | `"T1"` |
| `agentsHeadOffice` | Oficina central del agente | [AccountContact](#79-accountcontact) | **Sí** | Ver sección 7.9 |
| `letterOfCredit` | Carta de crédito | STRING | No | `"SYSTEM CLOSED 01-02 AM UTC"` |
| `otherParticipant` | Otros participantes | Array de [OtherParticipant](#726-otherparticipant) | No | Ver sección 7.26 |
| `specialHandlingCodes` | Códigos de manejo especial | Array de [SpecialHandlingAndDangerousGoodsCode](#718-specialhandlinganddangerousgoodscode-enumeración) | No | `["ACT"]` |
| `additionalSpecialHandlingCodes` | Códigos adicionales de manejo especial | Array de STRING | No | `["FOO"]` |
| `shipmentReferenceInformation` | Información de referencia del envío | [ShipmentReferenceInfo](#725-shipmentreferenceinfo) | No | Ver sección 7.25 |
| `oci` | Other Customs Information | Array de [OCI](#727-oci-other-customs-information) | No | Ver sección 7.27 |

```

---

## 10. ConsolidationListMessage

**Descripción:** Mensaje canónico de carga que contiene una ConsolidationList como payload.

**Importante:** Esta estructura es un subtipo identificado por un parámetro de tipo llamado `"type"`. El nombre del tipo es siempre `"consolidation list"` y la información del tipo **DEBE** ser el primer elemento en los datos JSON.

### 10.1 Campos Principales

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `type` | Identificador del tipo de mensaje. **DEBE ser el primer campo del JSON** | STRING (constante) | **Sí** | `"consolidation list"` |
| `id` | Identificación única del mensaje | UUID | **Sí** | `"1f7cb56b-7aa4-4077-b38d-9371a24fa45c"` |
| `messageHeader` | Cabecera del mensaje | [MessageHeader](#2-messageheader) | **Sí** | Ver sección 2 |
| `payload` (unwrapped) | Cuerpo del mensaje con el payload de negocio. **Nota:** El nombre "payload" NO se usa en el JSON, los campos se incluyen directamente | [ConsolidationList](#11-consolidationlist-payload) | No | Ver sección 11 |

### 10.2 JSON Ejemplo Completo - ConsolidationListMessage

```json
{
  "type" : "consolidation list",
  "id" : "1f7cb56b-7aa4-4077-b38d-9371a24fa45c",
  "messageHeader" : {
    "addressing" : {
      "routeVia" : {
        "type" : "PIMA",
        "address" : "REUAIR08AIRLINE"
      },
      "routeAnswerVia" : {
        "type" : "PIMA",
        "address" : "REUAIR08AIRLINE"
      },
      "senderAddresses" : [ {
        "type" : "PIMA",
        "address" : "REUAGT87SENDER"
      } ],
      "finalRecipientAddresses" : [ {
        "type" : "PIMA",
        "address" : "REUAIR08AIRLINE"
      } ],
      "replyAnswerTo" : [ {
        "type" : "PIMA",
        "address" : "REUAGT87SENDER"
      } ]
    },
    "creationDate" : "2017-09-05T11:46:13.000",
    "edifactData" : {
      "commonAccessReference" : "CARMAX14",
      "messageReference" : "MSGREFMAX14",
      "password" : "password",
      "interchangeControlReference" : "ICREFMAX14"
    }
  },
  "airWaybillNumber" : "123-12345678",
  "originAndDestination" : {
    "origin" : "FRA",
    "destination" : "FRA"
  },
  "quantity" : {
    "shipmentDescriptionCode" : "TOTAL_CONSIGNMENT",
    "numberOfPieces" : "8",
    "weight" : {
      "amount" : "100",
      "unit" : "KILOGRAM"
    }
  },
  "houseWaybillSummaries" : [ {
    "serialNumber" : "12345678ABCD",
    "origin" : "FRA",
    "destination" : "FRA",
    "numberOfPieces" : "8",
    "weight" : {
      "amount" : "100",
      "unit" : "KILOGRAM"
    },
    "natureOfGoods" : "TELEVISION SETS",
    "shippersLoadAndCount" : "15000",
    "specialHandlingRequirementsCodes" : [ "ACT" ],
    "freeTextDescriptionOfGoods" : "3D 4K SUPERSONIC TELEVISION SETS.",
    "harmonisedTariffScheduleInformation" : [ "427127829" ],
    "oci" : [ {
    "isoCountryCode" : "US",
    "informationIdentifier" : "ISS",
    "controlInformation" : "REGULATED_AGENT",
    "additionalControlInformation" : "RA",
    "supplementaryControlInformation" : "01000-001"
    },
    {
    "controlInformation" : "EXPIRY_DATE",
    "supplementaryControlInformation" : "0220"
    } ]
  } ],
  "shipper" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "DONALD TRUMP",
      "name2" : "PRESIDENT OF THE UNITED STATES OF AMERICA",
      "streetAddress1" : "THE WHITE HOUSE",
      "streetAddress2" : "1600 PENNSYLVANIA AVENUE NW",
      "place" : "WASHINGTON",
      "stateProvince" : "DC",
      "country" : "US",
      "postCode" : "20500"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "5148446311"
    } ]
  },
  "consignee" : {
    "accountNumber" : "ABC94269",
    "address" : {
      "name1" : "ANGELA MERKEL",
      "name2" : "FEDERAL CHANCELOR",
      "streetAddress1" : "WILLY-BRANDT-STRASSE 1",
      "streetAddress2" : "BUNDESKANZLERAMT",
      "place" : "BERLIN",
      "stateProvince" : "BE",
      "country" : "DE",
      "postCode" : "10557"
    },
    "contactDetails" : [ {
      "contactIdentifier" : "TE",
      "contactNumber" : "491802720000"
    } ]
  },
  "chargeDeclarations" : {
    "isoCurrencyCode" : "EUR",
    "chargeCode" : "ALL_CHARGES_COLLECT",
    "payment_WeightValuation" : "Collect",
    "payment_OtherCharges" : "Collect",
    "declaredValueForCarriage" : "100.00",
    "declaredValueForCustoms" : "120.00",
    "declaredValueForInsurance" : "1000.00"
  }
}
```

---

## 11. ConsolidationList (Payload)

**Descripción:** Una lista de consolidación proporciona una "lista de verificación" de House Waybills asociados con un Master Air Waybill.

**Nota Importante:** Estos campos van directamente en la raíz del JSON del mensaje (no dentro de un objeto "payload"), ya que el payload está "unwrapped".

### 11.1 Campos de ConsolidationList

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `airWaybillNumber` | Contiene el número del air waybill | [AirWaybillNumber](#72-airwaybillnumber) | **Sí** | `"020-97162321"` |
| `originAndDestination` | Aeropuertos de origen y destino del envío | [OriginAndDestination](#112-originanddestination) | **Sí** | Ver sección 11.2 |
| `quantity` | Detalles de cantidad del envío | [Quantity](#113-quantity) | **Sí** | Ver sección 11.3 |
| `houseWaybillSummaries` | Array de detalles de resumen de house waybill | Array de [HouseWaybillSummary](#114-housewaybillsummary) | **Sí** | Ver sección 11.4 |
| `shipper` | Contacto de cuenta del expedidor | [AccountContact](#79-accountcontact) | No | Ver sección 7.9 |
| `consignee` | Contacto de cuenta del consignatario | [AccountContact](#79-accountcontact) | No | Ver sección 7.9 |
| `chargeDeclarations` | Declaraciones de cargos | [ChargeDeclarations](#714-chargedeclarations) | No | Ver sección 7.14 |

### 11.2 OriginAndDestination

**Descripción:** Aeropuertos de origen y destino de un envío.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `origin` | Código de aeropuerto de origen | [IATAAirportCode](#73-iataairportcode) | **Sí** | `"FRA"` |
| `destination` | Código de aeropuerto de destino | [IATAAirportCode](#73-iataairportcode) | **Sí** | `"FRA"` |

**JSON Ejemplo:**
```json
{
  "origin" : "FRA",
  "destination" : "FRA"
}
```

### 11.3 Quantity

**Descripción:** Detalles de cantidad de un envío.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `shipmentDescriptionCode` | Código de descripción del envío | [ShipmentDescriptionCode](#113a-shipmentdescriptioncode-enumeración) | **Sí** | `"TOTAL_CONSIGNMENT"` |
| `numberOfPieces` | Número de items sueltos y/o ULDs aceptados para transporte | INTEGER | **Sí** | `"8"` |
| `weight` | Peso de la carga | [Weight](#74-weight) | No | Ver sección 7.4 |

#### 11.3a ShipmentDescriptionCode (Enumeración)

| Valor | Descripción |
|-------|-------------|
| `TOTAL_CONSIGNMENT` | Envío total |
| `DIVIDED_CONSIGNMENT` | Envío dividido |
| *(otros valores posibles)* | |

**JSON Ejemplo:**
```json
{
  "shipmentDescriptionCode" : "TOTAL_CONSIGNMENT",
  "numberOfPieces" : "8",
  "weight" : {
    "amount" : "100",
    "unit" : "KILOGRAM"
  }
}
```

### 11.4 HouseWaybillSummary

**Descripción:** Detalles de resumen de house waybill.

| Campo | Descripción | Tipo | Requerido | Ejemplo |
|-------|-------------|------|-----------|---------|
| `serialNumber` | Número de serie asignado por un agente/consolidador para identificar un envío de carga aérea particular dentro de un master air waybill | STRING | **Sí** | `"12345678ABCD"` |
| `origin` | Código de aeropuerto de origen | [IATAAirportCode](#73-iataairportcode) | **Sí** | `"FRA"` |
| `destination` | Código de aeropuerto de destino | [IATAAirportCode](#73-iataairportcode) | **Sí** | `"FRA"` |
| `numberOfPieces` | Número de items sueltos y/o ULDs aceptados para transporte | INTEGER | **Sí** | `"8"` |
| `weight` | Peso de la carga | [Weight](#74-weight) | **Sí** | Ver sección 7.4 |
| `natureOfGoods` | Descripción de las mercancías para propósitos de manifiesto | STRING | **Sí** | `"Television sets"` |
| `shippersLoadAndCount` | Carga y conteo del expedidor | INTEGER | No | `"15000"` |
| `specialHandlingRequirementsCodes` | Array de códigos para manejo especial y mercancías peligrosas | Array de [SpecialHandlingAndDangerousGoodsCode](#718-specialhandlinganddangerousgoodscode-enumeración) | No | `["ACT"]` |
| `freeTextDescriptionOfGoods` | Descripción de texto libre de las mercancías | STRING | No | `"3D 4K supersonic television sets."` |
| `harmonisedTariffScheduleInformation` | Información de cronograma de tarifas armonizadas: Número identificando mercancías para propósitos aduaneros o estadísticos | Array de STRING | No | `["427127829"]` |
| `oci` | Array de otra información de control aduanero, de seguridad y regulatorio | Array de [OCI](#727-oci-other-customs-information) | No | Ver sección 7.27 |

**JSON Ejemplo:**
```json
{
  "serialNumber" : "12345678ABCD",
  "origin" : "FRA",
  "destination" : "FRA",
  "numberOfPieces" : "8",
  "weight" : {
    "amount" : "100",
    "unit" : "KILOGRAM"
  },
  "natureOfGoods" : "TELEVISION SETS",
  "shippersLoadAndCount" : "15000",
  "specialHandlingRequirementsCodes" : [ "ACT" ],
  "freeTextDescriptionOfGoods" : "3D 4K SUPERSONIC TELEVISION SETS.",
  "harmonisedTariffScheduleInformation" : [ "427127829" ],
  "oci" : [ {
        "isoCountryCode" : "US",
        "informationIdentifier" : "ISS",
        "controlInformation" : "REGULATED_AGENT",
        "additionalControlInformation" : "RA",
        "supplementaryControlInformation" : "01000-001"
    },
    {
        "controlInformation" : "EXPIRY_DATE",
        "supplementaryControlInformation" : "0220"
  } ]
}
```

---

## 12. Estrategia de Envío (Master + Houses)

Para la correcta implementación de envíos consolidados, se debe seguir la siguiente estrategia de transmisión de mensajes al API:

**Escenario:** 1 Master Air Waybill (MAWB) con 3 House Air Waybills (HAWB).

**Proceso:** El backend debe realizar un total de **5 envíos** al API:

1.  **1x AirWayBillMessage:** Conteniendo los datos de la Master (MAWB).
2.  **1x ConsolidationListMessage:** Listando los números de referencia de las 3 Houses.
3.  **3x HouseWaybillMessage:** Un envío individual por cada House (HAWB) con su detalle completo.

> **Nota:** Es crucial mantener la consistencia de los datos (pesos, piezas, orígenes, destinos) entre los mensajes de la Master, la lista de consolidación y los mensajes individuales de las Houses.

### 12.1 Campos Clave para Master Consolidada (AWB)

| Campo | Valor Requerido | Descripción |
|-------|-----------------|-------------|
| `chargeItems[].consolidation` | `"true"` | Indica que la mercancía está detallada en house waybills |
| `chargeItems[].goodsDescription` | Depende de aerolínea | LATAM (145, 985): `"CONSOLIDATE FLOWERS"` para commodity 0609 |
| `specialHandlingCodes` | Array | Incluir códigos según aerolínea (ej: `["EAP", "PER"]`) |

### 12.2 Campos Clave para ConsolidationList (CSL)

| Campo | Valor Requerido | Descripción |
|-------|-----------------|-------------|
| `quantity.shipmentDescriptionCode` | `"TOTAL_CONSIGNMENT"` | Indica envío completo |
| `houseWaybillSummaries` | Array requerido | Lista de resúmenes de cada house |
| `houseWaybillSummaries[].serialNumber` | Requerido | Número de HAWB (máx 12 caracteres) |
| `houseWaybillSummaries[].natureOfGoods` | Requerido | Descripción de mercancía |

### 12.3 Campos Clave para HouseWaybill (FHL)

| Campo | Valor Requerido | Descripción |
|-------|-----------------|-------------|
| `airWaybillNumber` | Requerido | Número del AWB Master asociado |
| `serialNumber` | Requerido | Número de este HAWB |
| `shipper` | **Recomendado** | Shipper específico del house (no heredar del master) |
| `consignee` | **Recomendado** | Consignee específico del house (no heredar del master) |
| `carriersExecution` | Requerido | Fecha y lugar de ejecución |
| `agentsHeadOffice` | Requerido | Datos del agente/consolidador |

> ⚠️ **Importante:** Aunque `shipper` y `consignee` son técnicamente opcionales en la spec, se recomienda fuertemente incluirlos para cada FHL, ya que cada house típicamente tiene su propio shipper (exportador) y consignee (importador) diferente del master.

---

## Resumen de Campos Requeridos

### Nivel Raíz (AirWayBillMessage)
- ✅ `type` = `"air waybill"` (DEBE ser el primer campo)
- ✅ `id` (UUID)
- ✅ `messageHeader`

### MessageHeader
- ✅ `addressing`
- ✅ `creationDate`

### Addressing
- ✅ `senderAddresses` (Array, mínimo 1 elemento)
- ✅ `finalRecipientAddresses` (Array, mínimo 1 elemento)

### ParticipantAddress
- ✅ `type`
- ✅ `address`

---

## Historial de Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0.0 | 2024-XX-XX | Versión inicial con AirWayBillMessage, MessageHeader, Addressing, ParticipantAddress |

---

> **Documento en construcción** - Se irán agregando más estructuras a medida que se proporcione la especificación completa del API.
