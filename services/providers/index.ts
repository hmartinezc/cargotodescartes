/**
 * Factory de Proveedores de Mensajería
 * Proveedor único: CARGO-IMP (EDI)
 * 
 * @author Senior Solutions Architect
 * @version 2.0.0 - Simplificado
 */

import { cargoImpService, CargoImpService } from './cargoimp';

// ============================================================
// TIPOS SIMPLIFICADOS
// ============================================================

export type MessageProvider = 'CARGO_IMP';
export type MessageFormat = 'CARGO_EDI';

// ============================================================
// CONFIGURACIÓN
// ============================================================

export const DEFAULT_PROVIDER_CONFIG = {
  provider: 'CARGO_IMP' as MessageProvider,
  format: 'CARGO_EDI' as MessageFormat,
  description: 'Formato EDI plano IATA CIMP - FWB/16, FWB/17, FHL/4',
  messageTypes: ['FWB', 'FHL']
};

// ============================================================
// FACTORY SIMPLIFICADO
// ============================================================

/**
 * Obtiene el servicio de mensajería CargoIMP
 */
export function getMessageService(): CargoImpService {
  return cargoImpService;
}

/**
 * Obtiene la lista de proveedores disponibles
 */
export function getAvailableProviders(): MessageProvider[] {
  return ['CARGO_IMP'];
}

/**
 * Verifica si el proveedor está disponible
 */
export function isProviderAvailable(provider: MessageProvider): boolean {
  return provider === 'CARGO_IMP';
}

/**
 * Obtiene información sobre el proveedor
 */
export function getProviderInfo(provider: MessageProvider): {
  name: string;
  format: string;
  description: string;
  messageTypes: string[];
} {
  if (provider === 'CARGO_IMP') {
    return {
      name: 'CARGO-IMP (EDI)',
      format: 'IATA CIMP EDI',
      description: 'Formato EDI legado IATA Cargo Interchange Message Procedures',
      messageTypes: ['FWB/16 (Air Waybill)', 'FWB/17', 'FHL/4 (House Manifest)', 'FHL/2']
    };
  }
  return {
    name: 'Unknown',
    format: 'Unknown',
    description: 'Proveedor no reconocido',
    messageTypes: []
  };
}

// ============================================================
// EXPORTS
// ============================================================

export { cargoImpService, CargoImpService } from './cargoimp';
export * from './cargoimp/cargoImpTypes';
