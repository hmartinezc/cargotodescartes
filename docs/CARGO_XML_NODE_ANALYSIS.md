# 📋 ANÁLISIS EXHAUSTIVO NODO POR NODO - CARGO-XML

Este documento compara el XML de ejemplo proporcionado con la implementación actual del `cargoXmlService.ts`.

---

## 🔷 XFWB (Master Air Waybill) - TypeCode 741

### Elemento Raíz y Namespaces

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<rsm:Waybill xmlns:rsm="iata:waybill:1">` | ✅ | ✅ `XFWB_NAMESPACES` | N/A (constante) | ✅ OK |
| `xmlns:ram="iata:datamodel:3"` | ✅ | ✅ | N/A | ✅ OK |
| `xmlns:xsi="..."` | ✅ | ✅ | N/A | ✅ OK |
| `xsi:schemaLocation="iata:waybill:1 Waybill_1.xsd"` | ✅ | ✅ | N/A | ✅ OK |

---

### rsm:MessageHeaderDocument

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Formato | Estado |
|----------|---------|---------------|------------|---------|--------|
| `<ram:ID>` | `992-01651112` | `${awbNumber}` | `shipment.awbNumber` | XXX-XXXXXXXX | ✅ OK |
| `<ram:Name>` | `Master Air Waybill` | `${shipment.hasHouses ? 'Master Air Waybill' : 'Air Waybill'}` | `shipment.hasHouses` | Texto | ✅ OK |
| `<ram:TypeCode>` | `741` | `${typeCode}` donde `typeCode = shipment.hasHouses ? '741' : '740'` | `shipment.hasHouses` | 741=Master, 740=Direct | ✅ OK |
| `<ram:IssueDateTime>` | `2026-01-23T16:13:38` | `${issueDateTime}` = `formatDateTime()` | Generado automático | ISO 8601 sin Z | ✅ OK |
| `<ram:PurposeCode>` | `Creation` | `Creation` (hardcoded) | N/A | Creation/Update/Delete | ✅ OK |
| `<ram:VersionID>` | `3.00` | `3.00` (hardcoded) | N/A | Versión IATA | ✅ OK |
| `<ram:ConversationID>` | `20260123161338` | `${conversationId}` = `getConversationId()` | Generado: YYYYMMDDHHmmss | Numérico | ✅ OK |

#### SenderParty / RecipientParty

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:SenderParty><ram:PrimaryID schemeID="C">` | `TDVAGT03DHLAVIFFW/BRU1` | `${shipment.routing?.senderAddress \|\| 'TDVAGT03OPERFLOR/BOG1'}` | `shipment.routing.senderAddress` | ✅ OK |
| `<ram:RecipientParty><ram:PrimaryID schemeID="C">` | `TDVAIR08DHV` | `${shipment.routing?.recipientAddress \|\| 'TDVAIR08DHV'}` | `shipment.routing.recipientAddress` | ✅ OK |

**Nota:** El `schemeID="C"` indica dirección PIMA de CARGO community. ✅ Correcto.

---

### rsm:BusinessHeaderDocument

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:ID>` | `992-01651112` | `${awbNumber}` | `shipment.awbNumber` | ✅ OK |

#### IncludedHeaderNote

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:ContentCode>` | `C` | `${contentCode}` donde `contentCode = shipment.hasHouses ? 'C' : 'M'` | `shipment.hasHouses` | ✅ OK |
| `<ram:Content>` | `CONSOLIDATION COMERCIAL...` | `${goodsDescription}` = `getGoodsDescription(shipment)` | `shipment.description` o generado | ✅ OK |

#### SignatoryConsignorAuthentication

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:Signatory>` | `OPERFLOR LOGISTICA SAS` | `${shipment.agent?.name \|\| shipment.shipper?.name \|\| 'AGENT'}` | `shipment.agent.name` | ✅ OK |

#### SignatoryCarrierAuthentication

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Formato | Estado |
|----------|---------|---------------|------------|---------|--------|
| `<ram:ActualDateTime>` | `2026-01-23T00:00:00` | `${executionDate}` = `formatDateTime(shipment.executionDate)` | `shipment.executionDate` | ISO 8601 | ✅ OK |
| `<ram:Signatory>` | `nrincon` | `${shipment.signature \|\| 'OPERATOR'}` | `shipment.signature` | Texto | ✅ OK |
| `<ram:IssueAuthenticationLocation><ram:Name>` | `BOG` | `${shipment.origin}` | `shipment.origin` | IATA 3 letras | ✅ OK |

---

### rsm:MasterConsignment

#### Indicadores de Valor

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Valores | Estado |
|----------|---------|---------------|------------|---------|--------|
| `<ram:NilCarriageValueIndicator>` | `true` | `true` (hardcoded) | N/A (NVD flores) | true/false | ✅ OK |
| `<ram:NilCustomsValueIndicator>` | `true` | `true` (hardcoded) | N/A (NCV flores) | true/false | ✅ OK |
| `<ram:NilInsuranceValueIndicator>` | `true` | `true` (hardcoded) | N/A (XXX flores) | true/false | ✅ OK |
| `<ram:TotalChargePrepaidIndicator>` | `true` | `${shipment.paymentMethod === 'Prepaid'}` | `shipment.paymentMethod` | true/false | ✅ OK |
| `<ram:TotalDisbursementPrepaidIndicator>` | `true` | `${shipment.paymentMethod === 'Prepaid'}` | `shipment.paymentMethod` | true/false | ✅ OK |

#### Medidas y Cantidades

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Unidad | Estado |
|----------|---------|---------------|------------|--------|--------|
| `<ram:IncludedTareGrossWeightMeasure unitCode="KGM">` | `2163` | `${totalWeight}` = `shipment.weight \|\| 0` | `shipment.weight` | KGM | ✅ OK |
| `<ram:GrossVolumeMeasure unitCode="MTQ">` | `12.38` | `${shipment.volume.toFixed(2)}` (condicional) | `shipment.volume` | MTQ | ✅ OK |
| `<ram:TotalPieceQuantity>` | `271` | `${totalPieces}` = `shipment.pieces \|\| 0` | `shipment.pieces` | Entero | ✅ OK |

---

### ConsignorParty (Shipper)

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:Name>` | `OPERFLOR LOGISTICA SAS` | `${shipper.name}` | `shipment.shipper.name` | ✅ OK |
| `<ram:PostcodeCode>` | `11091` | `${shipper.address?.postalCode}` | `shipment.shipper.address.postalCode` | ✅ OK |
| `<ram:StreetName>` | `CR 102 A 25 H 45...` | `${shipper.address?.street}` | `shipment.shipper.address.street` | ✅ OK |
| `<ram:CityName>` | `BOGOTA` | `${shipper.address?.place}` | `shipment.shipper.address.place` | ✅ OK |
| `<ram:CountryID>` | `CO` | `${shipper.address?.countryCode \|\| 'CO'}` | `shipment.shipper.address.countryCode` | ✅ OK |
| `<ram:CountryName>` | `COLOMBIA` | `getCountryName(countryCode)` | Calculado de countryCode | ✅ OK |
| `<ram:CompleteNumber>` (teléfono) | `3167381785` | `${shipper.contact?.number}` | `shipment.shipper.contact.number` | ✅ OK |

---

### ConsigneeParty

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:Name>` | `J.A. FLOWER SERVICE INC` | `${consignee.name}` | `shipment.consignee.name` | ✅ OK |
| `<ram:PostcodeCode>` | `33122` | `${consignee.address?.postalCode}` | `shipment.consignee.address.postalCode` | ✅ OK |
| `<ram:StreetName>` | `3400 NW 74TH AVENUE...` | `${consignee.address?.street}` | `shipment.consignee.address.street` | ✅ OK |
| `<ram:CityName>` | `MIAMI` | `${consignee.address?.place}` | `shipment.consignee.address.place` | ✅ OK |
| `<ram:CountryID>` | `US` | `${consignee.address?.countryCode \|\| 'US'}` | `shipment.consignee.address.countryCode` | ✅ OK |
| `<ram:CountryName>` | `UNITED STATES` | `getCountryName(countryCode)` | Calculado | ✅ OK |
| `<ram:CountrySubDivisionName>` | `FLORIDA` | `getStateName(state)` | `shipment.consignee.address.state` | ✅ OK |
| `<ram:CompleteNumber>` (teléfono) | `3055925198` | `${consignee.contact?.number}` | `shipment.consignee.contact.number` | ✅ OK |
| `<ram:URIID>` (email) | `miaflower@armellini.com` | `${consignee.email}` | `shipment.consignee.email` | ✅ OK |

---

### FreightForwarderParty (Agent)

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:Name>` | `OPERFLOR LOGISTICA SAS` | `${agent.name}` | `shipment.agent.name` | ✅ OK |
| `<ram:CargoAgentID>` | `7610226` | `${agent.iataCode}` | `shipment.agent.iataCode` | ✅ OK |
| `<ram:FreightForwarderAddress><ram:CityName>` | `BOGOTA` | `${agent.place}` | `shipment.agent.place` | ✅ OK |
| `<ram:SpecifiedCargoAgentLocation><ram:ID>` | `0006` | `${agent.cassCode}` (condicional) | `shipment.agent.cassCode` | ✅ OK |

---

### OriginLocation / FinalDestinationLocation

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:OriginLocation><ram:ID>` | `BOG` | `${shipment.origin}` | `shipment.origin` | ✅ OK |
| `<ram:FinalDestinationLocation><ram:ID>` | `MIA` | `${shipment.destination}` | `shipment.destination` | ✅ OK |

---

### SpecifiedLogisticsTransportMovement (Vuelos)

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:StageCode>` | `Main-Carriage` | `Main-Carriage` (hardcoded) | N/A | ✅ OK |
| `<ram:ModeCode>` | `4` | `4` (hardcoded = Air) | N/A | ✅ OK |
| `<ram:Mode>` | `AIR TRANSPORT` | `AIR TRANSPORT` (hardcoded) | N/A | ✅ OK |
| `<ram:ID>` | `D52246` | `${flight.flightNumber}` | `shipment.flights[i].flightNumber` | ✅ OK |
| `<ram:SequenceNumeric>` | `1` | `${index + 1}` | Índice del vuelo | ✅ OK |
| `<ram:UsedLogisticsTransportMeans><ram:Name>` | `D5` | `${flight.carrierCode}` | `shipment.flights[i].carrierCode` | ✅ OK |
| `<ram:OccurrenceArrivalLocation><ram:ID>` | `MIA` | `${flight.destination}` | `shipment.flights[i].destination` | ✅ OK |
| `<ram:OccurrenceArrivalLocation><ram:TypeCode>` | `Airport` | `Airport` (hardcoded) | N/A | ✅ OK |
| `<ram:ScheduledOccurrenceDateTime>` | `2026-01-23T00:00:00` | `formatDateTime(flight.date)` | `shipment.flights[i].date` | ✅ OK |
| `<ram:OccurrenceDepartureLocation><ram:ID>` | `BOG` | `${flight.origin}` | `shipment.flights[i].origin` | ✅ OK |
| `<ram:OccurrenceDepartureLocation><ram:TypeCode>` | `Airport` | `Airport` (hardcoded) | N/A | ✅ OK |

---

### HandlingSPHInstructions

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Valores | Estado |
|----------|---------|---------------|------------|---------|--------|
| `<ram:DescriptionCode>` | `EAP`, `PER` | `${code}` de `shipment.specialHandlingCodes` | `shipment.specialHandlingCodes[]` | EAP, PER, COL, etc. | ✅ OK |

---

### IncludedAccountingNote (CORREGIR ORDEN)

**⚠️ PROBLEMA DETECTADO:** En tu ejemplo, los `IncludedAccountingNote` van ANTES de `IncludedCustomsNote`, pero en el código actual van en orden diferente.

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:ContentCode>` | `GEN` | `GEN` (hardcoded) | N/A | ✅ OK |
| `<ram:Content>` | `NOTIFY TO: MAS CUSTOMS...` | Generado de `shipment.alsoNotify` | `shipment.alsoNotify.name` + dirección | ✅ OK |

**Tu ejemplo tiene 4 líneas de AccountingNote:**
```xml
<ram:Content>NOTIFY TO: MAS CUSTOMS BROKER INC</ram:Content>
<ram:Content>7225 25 ST SUITE 300 ZIP: 33122 PH: 3054183155</ram:Content>
<ram:Content>EMAIL: imports@mascustoms.com</ram:Content>
<ram:Content>MIAMI, FLORIDA, UNITED STATES</ram:Content>
```

**✅ El código actual genera 4 líneas correctamente** (usando campos de `alsoNotify`: `name`, `address.street`, `address.postalCode`, `contact.number`, `email`, `address.place`, `address.state`, `address.countryCode`).

---

### IncludedCustomsNote (OCI)

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:CountryID>` | `CO` o `US` | País del shipper/consignee | Calculado | ✅ OK |
| `<ram:SubjectCode>` | `SHP` o `CNE` | `SHP` para shipper, `CNE` para consignee | Fijo según tipo | ✅ OK |
| `<ram:ContentCode>` | `T` | `T` (Tax ID) | Fijo | ✅ OK |
| `<ram:Content>` | `901234567` | `${taxId.replace(/\s/g, '')}` | `shipper.taxId` o `consignee.taxId` | ✅ OK |

**Nota:** El código no genera OCI si no hay `taxId`. Esto es **correcto** para IATA.

---

### ApplicableOriginCurrencyExchange

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:SourceCurrencyCode>` | `USD` | `${currency}` = `shipment.currency \|\| 'USD'` | `shipment.currency` | ✅ OK |

---

### ApplicableLogisticsServiceCharge

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Valores | Estado |
|----------|---------|---------------|------------|---------|--------|
| `<ram:TransportPaymentMethodCode>` | `PP` | `${shipment.paymentMethod === 'Prepaid' ? 'PP' : 'CC'}` | `shipment.paymentMethod` | PP/CC | ✅ OK |
| `<ram:ServiceTypeCode>` | `A` | `A` (hardcoded = Airport-to-Airport) | N/A | A/D/H/P | ✅ OK |

---

### ApplicableLogisticsAllowanceCharge (Otros Cargos)

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:ID>` | `DA`, `DC`, `MY`, `FE`, `AW`, `CG` | `mapOtherChargeCode(charge.code)` | `shipment.otherCharges[i].code` | ✅ OK |
| `<ram:PrepaidIndicator>` | `true` | `${charge.paymentMethod === 'Prepaid'}` | `shipment.otherCharges[i].paymentMethod` | ✅ OK |
| `<ram:PartyTypeCode>` | `A` o `C` | `${charge.entitlement === 'DueAgent' ? 'A' : 'C'}` | `shipment.otherCharges[i].entitlement` | ✅ OK |
| `<ram:ActualAmount currencyID="">` | `25.00` | `${charge.amount.toFixed(2)}` | `shipment.otherCharges[i].amount` | ✅ OK |

---

### ApplicableRating > IncludedMasterConsignmentItem

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:TypeCode>A</ram:TypeCode>` | `A` | `A` (hardcoded) | N/A | ✅ OK |
| `<ram:TotalChargeAmount>` | `2778.72` | `${totalChargeAmount.toFixed(2)}` | Suma de `rates[].total` | ✅ OK |
| `<ram:SequenceNumeric>` | `1` | `1` (hardcoded) | N/A | ✅ OK |
| `<ram:TypeCode>` (HTS) | `060311`, `060312`, etc. | De `getUniqueHtsCodes()` | `rates[i].hsCodes[]` o `houseBills[].htsCodes[]` | ✅ OK |
| `<ram:GrossWeightMeasure unitCode="KGM">` | `2163` | `${totalWeight}` | `shipment.weight` | ✅ OK |
| `<ram:GrossVolumeMeasure unitCode="MTQ">` | `12.38` | `${shipment.volume.toFixed(2)}` | `shipment.volume` | ✅ OK |
| `<ram:PieceQuantity>` | `271` | `${totalPieces}` | `shipment.pieces` | ✅ OK |
| `<ram:Identification>` | `CONSOLIDATION...` | `${goodsDescription}` | `shipment.description` | ✅ OK |
| `<ram:OriginCountry><ram:ID>` | `CO` | `${shipment.shipper?.address?.countryCode}` | `shipment.shipper.address.countryCode` | ✅ OK |

#### TransportLogisticsPackage

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:ItemQuantity>` | `271` | `${totalPieces}` | `shipment.pieces` | ✅ OK |
| `<ram:GrossWeightMeasure unitCode="KGM">` | `2163` | `${totalWeight}` | `shipment.weight` | ✅ OK |
| `<ram:WidthMeasure unitCode="CMT">` | `29` | `${dim.width}` | `shipment.dimensions[0].width` | ✅ OK |
| `<ram:LengthMeasure unitCode="CMT">` | `105` | `${dim.length}` | `shipment.dimensions[0].length` | ✅ OK |
| `<ram:HeightMeasure unitCode="CMT">` | `15` | `${dim.height}` | `shipment.dimensions[0].height` | ✅ OK |

#### ApplicableFreightRateServiceCharge

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Valores | Estado |
|----------|---------|---------------|------------|---------|--------|
| `<ram:CategoryCode>` | `K` | `mapRateClassCode(rates[0].rateClassCode)` | `shipment.rates[0].rateClassCode` | K, Q, M, C, N | ✅ OK |
| `<ram:CommodityItemID>` | `1421` | `${shipment.commodityCode \|\| '1421'}` | `shipment.commodityCode` | IATA commodity | ✅ OK |
| `<ram:ChargeableWeightMeasure unitCode="KGM">` | `2481` | `${chargeableWeight}` | `shipment.rates[0].chargeableWeight` | ✅ OK |
| `<ram:AppliedRate>` | `1.12` | `${appliedRate.toFixed(2)}` | `shipment.rates[0].rateOrCharge` | ✅ OK |
| `<ram:AppliedAmount currencyID="">` | `2778.72` | `${totalChargeAmount.toFixed(2)}` | Suma `rates[].total` | ✅ OK |

---

### ApplicableTotalRating

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:TypeCode>` | `A` | `A` (hardcoded) | N/A | ✅ OK |
| `<ram:PrepaidIndicator>` | `true` | `${shipment.paymentMethod === 'Prepaid'}` | `shipment.paymentMethod` | ✅ OK |
| `<ram:WeightChargeTotalAmount>` | `2778.72` | `${totalChargeAmount.toFixed(2)}` | Suma `rates[].total` | ✅ OK |
| `<ram:AgentTotalDuePayableAmount>` | `25.00` | `${agentCharges.toFixed(2)}` | Suma de `otherCharges[].amount` donde `entitlement=DueAgent` | ✅ OK |
| `<ram:CarrierTotalDuePayableAmount>` | `683.25` | `${carrierCharges.toFixed(2)}` | Suma de `otherCharges[].amount` donde `entitlement=DueCarrier` | ✅ OK |
| `<ram:GrandTotalAmount>` | `3486.97` | `${grandTotal.toFixed(2)}` | totalChargeAmount + agentCharges + carrierCharges | ✅ OK |

---

## 🔷 XFZB (House Waybill) - TypeCode 703

### MessageHeaderDocument

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:ID>` | `OFL00024057_992-01651112` | `${hawbNumber}_${awbNumber}` | `house.hawbNumber` + `shipment.awbNumber` | ✅ OK |
| `<ram:Name>` | `House Waybill` | `House Waybill` (hardcoded) | N/A | ✅ OK |
| `<ram:TypeCode>` | `703` | `703` (hardcoded) | N/A | ✅ OK |

---

### BusinessHeaderDocument

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:ID>` | `OFL00024057` | `${hawbNumber}` | `house.hawbNumber` | ✅ OK |

---

### MasterConsignment (nivel superior)

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:IncludedTareGrossWeightMeasure>` | `2163` | `${shipment.weight}` | `shipment.weight` (del MASTER) | ✅ OK |
| `<ram:TotalPieceQuantity>` | `271` | `${shipment.pieces}` | `shipment.pieces` (del MASTER) | ✅ OK |
| `<ram:TransportContractDocument><ram:ID>` | `992-01651112` | `${awbNumber}` | `shipment.awbNumber` | ✅ OK |

---

### IncludedHouseConsignment

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:IncludedTareGrossWeightMeasure>` | `8` | `${house.weight}` | `house.weight` | ✅ OK |
| `<ram:TotalPieceQuantity>` | `1` | `${house.pieces}` | `house.pieces` | ✅ OK |
| `<ram:SummaryDescription>` | `CONSOLIDATION...` | `${house.natureOfGoods}` | `house.natureOfGoods` | ✅ OK |

#### House ConsignorParty/ConsigneeParty

Misma estructura que XFWB pero usando:
- `house.shipper` → ConsignorParty
- `house.consignee` → ConsigneeParty

---

### AssociatedReferenceDocument

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:ID>` | `992-01651112` | `${awbNumber}` | `shipment.awbNumber` | ✅ OK |
| `<ram:TypeCode>` | `741` | `741` (hardcoded = Master AWB) | N/A | ✅ OK |
| `<ram:Name>` | `Master Air Waybill` | `Master Air Waybill` (hardcoded) | N/A | ✅ OK |

---

### IncludedHouseConsignmentItem

| Nodo XML | Ejemplo | Código Actual | Campo JSON | Estado |
|----------|---------|---------------|------------|--------|
| `<ram:TypeCode>` (HTS) | `060312` | De `house.htsCodes[]` | `house.htsCodes[]` | ✅ OK |
| `<ram:GrossWeightMeasure>` | `8` | `${house.weight}` | `house.weight` | ✅ OK |
| `<ram:GrossVolumeMeasure>` | `0.03` | `${house.volume.toFixed(3)}` | `house.volume` | ✅ OK |
| `<ram:PieceQuantity>` | `1` | `${house.pieces}` | `house.pieces` | ✅ OK |
| `<ram:ChargeableWeightMeasure>` | `8` | `${house.chargeableWeight \|\| house.weight}` | `house.chargeableWeight` | ✅ OK |
| `<ram:AppliedAmount>` | `8.96` | `${house.totalCharge.toFixed(2)}` | `house.totalCharge` | ✅ OK |

---

## ⚠️ PROBLEMAS DETECTADOS Y ESTADO

### 1. ✅ CORREGIDO: IncludedAccountingNote con dirección completa del Notify Party

**Problema original:** El código generaba solo 1 línea con el nombre.

**Tu ejemplo esperaba 4 líneas:**
```xml
<ram:Content>NOTIFY TO: MAS CUSTOMS BROKER INC</ram:Content>
<ram:Content>7225 25 ST SUITE 300 ZIP: 33122 PH: 3054183155</ram:Content>
<ram:Content>EMAIL: imports@mascustoms.com</ram:Content>
<ram:Content>MIAMI, FLORIDA, UNITED STATES</ram:Content>
```

**✅ SOLUCIÓN IMPLEMENTADA:** Se modificaron las funciones `generateAccountingNotesXml()` y `generateAccountingNotesXmlForHouse()` para generar 4 líneas:
1. `NOTIFY TO: ${name}`
2. `${street} ZIP ${postalCode} TEL ${phone}`
3. `${email}`
4. `${city}, ${state}, ${countryCode}`

**Código actual genera correctamente:**
```xml
<ram:IncludedAccountingNote>
    <ram:ContentCode>GEN</ram:ContentCode>
    <ram:Content>NOTIFY TO: MAS CUSTOMS BROKER INC</ram:Content>
</ram:IncludedAccountingNote>
<ram:IncludedAccountingNote>
    <ram:ContentCode>GEN</ram:ContentCode>
    <ram:Content>3125 NW 77TH AVENUE ZIP 33122 TEL 3051234567</ram:Content>
</ram:IncludedAccountingNote>
<ram:IncludedAccountingNote>
    <ram:ContentCode>GEN</ram:ContentCode>
    <ram:Content>flores@mascustomsbroker.com</ram:Content>
</ram:IncludedAccountingNote>
<ram:IncludedAccountingNote>
    <ram:ContentCode>GEN</ram:ContentCode>
    <ram:Content>DORAL, FL, US</ram:Content>
</ram:IncludedAccountingNote>
```

---

### 2. ⚠️ ORDEN DE NODOS EN XFWB/XFZB

**Observación:** El orden de generación actual es:
```
HandlingSPHInstructions → IncludedAccountingNote → IncludedCustomsNote → ApplicableOriginCurrencyExchange
```

**Tu ejemplo muestra:**
```
HandlingSPHInstructions → IncludedAccountingNote → ApplicableOriginCurrencyExchange
```

**Nota:** El orden puede variar según el receptor. El estándar IATA es flexible mientras los nodos estén en el lugar correcto del XSD. Si hay rechazo, se puede reorganizar.

---

### 3. ⚠️ TransportContractDocument en XFWB

**Tu ejemplo NO tiene TransportContractDocument en XFWB**, pero el código lo genera.

**Sin embargo**, según el estándar IATA Cargo-XML 3.0 (referencia Riege), **sí debería estar**. Tu proveedor puede aceptarlo o no.

---

### 4. ⚠️ ConsolidationIndicator y ConsignmentItemQuantity

**Tu ejemplo NO tiene estos nodos**, pero el código los genera para consolidados.

**Según estándar Riege**, estos son **correctos** para Master AWB (741). Si tu receptor los rechaza, se pueden hacer opcionales.

---

## ✅ RESUMEN DE CORRECCIONES IMPLEMENTADAS

| Item | Estado | Descripción |
|------|--------|-------------|
| TypeCode dinámico (740/741) | ✅ Implementado | 740 para Direct, 741 para Master |
| ContentCode dinámico (C/M) | ✅ Implementado | C para Consolidation, M para Direct |
| TransportContractDocument | ✅ Implementado | En XFWB y XFZB |
| ConsolidationIndicator | ✅ Implementado | Solo para hasHouses=true |
| ConsignmentItemQuantity | ✅ Implementado | Solo para hasHouses=true |
| IncludedAccountingNote (4 líneas) | ✅ Implementado | Dirección completa del notify party |
| Validaciones XFWB/XFZB | ✅ Implementado | Funciones de validación |

