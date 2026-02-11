/**
 * Exports para el módulo CARGO-IMP (IATA CIMP)
 * 
 * Soporte para mensajes FWB/FHL en formato EDI plano:
 * - FWB/16, FWB/17: Master Air Waybill
 * - FHL/2, FHL/4: House Waybill
 * 
 * Casos soportados según documentación legacy:
 * - Caso 2: FWB estándar + FHL individuales
 * - Caso 4: FWB_NEW + FHL individuales
 * - Caso 5: FWB_NEW + FHL concatenadas con '&'
 * - Caso 7: DHL/ABX - FHL siempre con header EDIFACT
 * - Caso 8: Todas FHL en 1 mensaje, MBI solo en primera
 */

export { 
  CargoImpService, 
  cargoImpService, 
  default, 
  normalize,
} from './cargoImpService';

export * from './cargoImpTypes';

export { 
  validateCargoImpMessage,
  type FwbValidationResult,
  type SegmentValidationResult,
  type ValidationIssue,
  type ValidationSeverity
} from './cargoImpValidator';
