/**
 * Runtime Configuration Store
 * 
 * Sistema de configuración en memoria para políticas y settings.
 * - Inicia con valores hardcodeados (defaults)
 * - Permite modificar en tiempo de ejecución
 * - Cambios se reflejan inmediatamente
 * - Al recargar la página, vuelve a los defaults
 * 
 * NO usa localStorage - todo en memoria para evitar datos corruptos.
 * Las políticas definitivas vendrán del backend.
 * 
 * @author Senior Solutions Architect
 * @version 1.0.0
 */

import { AirlinePolicy, DEFAULT_AIRLINE_POLICIES, FwbSegmentType, FhlSegmentType, FHL_SEGMENTS, TypeBConfig, TypeBPriority, DEFAULT_TYPEB_CONFIG } from './providers/cargoimp/cargoImpTypes';

// Todos los segmentos FHL disponibles (para usar como default)
const ALL_FHL_SEGMENTS: FhlSegmentType[] = Object.keys(FHL_SEGMENTS) as FhlSegmentType[];

// ============================================================
// TIPOS PARA RUNTIME CONFIG
// ============================================================

export interface RuntimeCargoImpConfig {
  /** Override de políticas por aerolínea (awbPrefix -> policy overrides) */
  policyOverrides: Record<string, Partial<AirlinePolicy>>;
  /** Versión FWB global override */
  fwbVersion?: 'FWB/16' | 'FWB/17';
  /** Versión FHL global override */
  fhlVersion?: 'FHL/2' | 'FHL/4';
  /** Incluir UNB/UNZ global */
  includeUnbUnz?: boolean;
  /** Usar Type B header en lugar de EDIFACT (para Descartes) */
  useTypeBHeader?: boolean;
  /** Prioridad Type B por defecto */
  typeBPriority?: TypeBPriority;
  /** Configuración Type B para Descartes */
  typeBConfig?: Partial<TypeBConfig>;
}

export interface RuntimeTraxonConfig {
  /** Endpoint API override */
  apiEndpoint?: string;
  /** Sender ID override */
  senderId?: string;
  /** Settings específicos */
  settings: Record<string, unknown>;
}

export interface RuntimeDescartesConfig {
  /** Endpoint API override */
  apiEndpoint?: string;
  /** Sender ID override */
  senderId?: string;
  /** Settings específicos */
  settings: Record<string, unknown>;
}

export interface RuntimeConfig {
  cargoImp: RuntimeCargoImpConfig;
  traxon: RuntimeTraxonConfig;
  descartes: RuntimeDescartesConfig;
}

// ============================================================
// LISTENERS PARA CAMBIOS
// ============================================================

type ConfigChangeListener = (config: RuntimeConfig) => void;
const listeners: Set<ConfigChangeListener> = new Set();

// ============================================================
// STORE EN MEMORIA
// ============================================================

/** Store inicial - valores por defecto */
function createDefaultConfig(): RuntimeConfig {
  return {
    cargoImp: {
      policyOverrides: {},
      fwbVersion: undefined,
      fhlVersion: undefined,
      includeUnbUnz: undefined,
      useTypeBHeader: true,  // Type B por defecto para Descartes
      typeBPriority: 'QK'    // Prioridad normal por defecto
    },
    traxon: {
      apiEndpoint: undefined,
      senderId: undefined,
      settings: {}
    },
    descartes: {
      apiEndpoint: undefined,
      senderId: undefined,
      settings: {}
    }
  };
}

/** Store en memoria - singleton */
let runtimeConfig: RuntimeConfig = createDefaultConfig();

// ============================================================
// API PÚBLICA
// ============================================================

/**
 * Obtiene la configuración runtime actual
 */
export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig;
}

/**
 * Resetea toda la configuración a los defaults
 */
export function resetRuntimeConfig(): void {
  runtimeConfig = createDefaultConfig();
  notifyListeners();
}

/**
 * Suscribirse a cambios de configuración
 */
export function subscribeToConfigChanges(listener: ConfigChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  listeners.forEach(listener => listener(runtimeConfig));
}

// ============================================================
// CARGO-IMP RUNTIME API
// ============================================================

/**
 * Obtiene la política efectiva para una aerolínea
 * Combina defaults + overrides en memoria
 */
export function getEffectiveAirlinePolicy(awbPrefix: string): AirlinePolicy {
  const defaultPolicy = DEFAULT_AIRLINE_POLICIES[awbPrefix] || DEFAULT_AIRLINE_POLICIES['DEFAULT'];
  const override = runtimeConfig.cargoImp.policyOverrides[awbPrefix] || {};
  
  // Para FHL: si no hay configuración específica, TODOS los segmentos están habilitados por defecto
  const effectiveFhlEnabled = override.enabledFhlSegments || defaultPolicy.enabledFhlSegments || ALL_FHL_SEGMENTS;
  const effectiveFhlDisabled = override.disabledFhlSegments || defaultPolicy.disabledFhlSegments || [];
  
  // Merge default + override
  const effectivePolicy: AirlinePolicy = {
    ...defaultPolicy,
    ...override,
    // Asegurar arrays válidos para FWB
    enabledSegments: override.enabledSegments || defaultPolicy.enabledSegments || [],
    disabledSegments: override.disabledSegments || defaultPolicy.disabledSegments || [],
    // Para FHL: usar todos por defecto si no hay configuración
    enabledFhlSegments: effectiveFhlEnabled,
    disabledFhlSegments: effectiveFhlDisabled,
    // Aplicar versiones globales si no hay override específico
    fwbVersion: override.fwbVersion || runtimeConfig.cargoImp.fwbVersion || defaultPolicy.fwbVersion,
    fhlVersion: override.fhlVersion || runtimeConfig.cargoImp.fhlVersion || defaultPolicy.fhlVersion,
    includeUnbUnz: override.includeUnbUnz ?? runtimeConfig.cargoImp.includeUnbUnz ?? defaultPolicy.includeUnbUnz,
    // Type B: aplicar global si no hay override específico (true por defecto para Descartes)
    useTypeBHeader: override.useTypeBHeader ?? runtimeConfig.cargoImp.useTypeBHeader ?? defaultPolicy.useTypeBHeader ?? true,
    typeBPriority: override.typeBPriority || runtimeConfig.cargoImp.typeBPriority || defaultPolicy.typeBPriority || 'QK'
  };
  
  return effectivePolicy;
}

/**
 * Actualiza la política de una aerolínea (override parcial)
 */
export function updateAirlinePolicy(awbPrefix: string, updates: Partial<AirlinePolicy>): void {
  const currentOverride = runtimeConfig.cargoImp.policyOverrides[awbPrefix] || {};
  runtimeConfig.cargoImp.policyOverrides[awbPrefix] = {
    ...currentOverride,
    ...updates
  };
  notifyListeners();
}

/**
 * Toggle un segmento FWB para una aerolínea
 */
export function toggleFwbSegment(awbPrefix: string, segment: FwbSegmentType, enabled: boolean): void {
  const policy = getEffectiveAirlinePolicy(awbPrefix);
  const currentOverride = runtimeConfig.cargoImp.policyOverrides[awbPrefix] || {};
  
  let enabledSegments = [...(currentOverride.enabledSegments || policy.enabledSegments || [])];
  let disabledSegments = [...(currentOverride.disabledSegments || policy.disabledSegments || [])];
  
  if (enabled) {
    // Agregar a enabled, quitar de disabled
    if (!enabledSegments.includes(segment)) {
      enabledSegments.push(segment);
    }
    disabledSegments = disabledSegments.filter(s => s !== segment);
  } else {
    // Agregar a disabled, quitar de enabled
    if (!disabledSegments.includes(segment)) {
      disabledSegments.push(segment);
    }
    enabledSegments = enabledSegments.filter(s => s !== segment);
  }
  
  runtimeConfig.cargoImp.policyOverrides[awbPrefix] = {
    ...currentOverride,
    enabledSegments,
    disabledSegments
  };
  notifyListeners();
}

/**
 * Toggle un segmento FHL para una aerolínea
 */
export function toggleFhlSegment(awbPrefix: string, segment: FhlSegmentType, enabled: boolean): void {
  const policy = getEffectiveAirlinePolicy(awbPrefix);
  const currentOverride = runtimeConfig.cargoImp.policyOverrides[awbPrefix] || {};
  
  let enabledFhlSegments = [...(currentOverride.enabledFhlSegments || policy.enabledFhlSegments || [])];
  let disabledFhlSegments = [...(currentOverride.disabledFhlSegments || policy.disabledFhlSegments || [])];
  
  if (enabled) {
    // Agregar a enabled, quitar de disabled
    if (!enabledFhlSegments.includes(segment)) {
      enabledFhlSegments.push(segment);
    }
    disabledFhlSegments = disabledFhlSegments.filter(s => s !== segment);
  } else {
    // Agregar a disabled, quitar de enabled
    if (!disabledFhlSegments.includes(segment)) {
      disabledFhlSegments.push(segment);
    }
    enabledFhlSegments = enabledFhlSegments.filter(s => s !== segment);
  }
  
  runtimeConfig.cargoImp.policyOverrides[awbPrefix] = {
    ...currentOverride,
    enabledFhlSegments,
    disabledFhlSegments
  };
  notifyListeners();
}

/**
 * Resetea la política de una aerolínea a los defaults
 */
export function resetAirlinePolicy(awbPrefix: string): void {
  delete runtimeConfig.cargoImp.policyOverrides[awbPrefix];
  notifyListeners();
}

/**
 * Actualiza configuración global de CARGO-IMP
 */
export function updateCargoImpGlobalConfig(updates: Partial<Omit<RuntimeCargoImpConfig, 'policyOverrides'>>): void {
  runtimeConfig.cargoImp = {
    ...runtimeConfig.cargoImp,
    ...updates
  };
  notifyListeners();
}

// ============================================================
// TRAXON RUNTIME API
// ============================================================

/**
 * Obtiene configuración Traxon efectiva
 */
export function getTraxonConfig(): RuntimeTraxonConfig {
  return runtimeConfig.traxon;
}

/**
 * Actualiza configuración Traxon
 */
export function updateTraxonConfig(updates: Partial<RuntimeTraxonConfig>): void {
  runtimeConfig.traxon = {
    ...runtimeConfig.traxon,
    ...updates
  };
  notifyListeners();
}

// ============================================================
// DESCARTES RUNTIME API
// ============================================================

/**
 * Obtiene configuración Descartes efectiva
 */
export function getDescartesConfig(): RuntimeDescartesConfig {
  return runtimeConfig.descartes;
}

/**
 * Actualiza configuración Descartes
 */
export function updateDescartesConfig(updates: Partial<RuntimeDescartesConfig>): void {
  runtimeConfig.descartes = {
    ...runtimeConfig.descartes,
    ...updates
  };
  notifyListeners();
}

// ============================================================
// TYPE B CONFIGURATION API
// ============================================================

/**
 * Habilita o deshabilita Type B globalmente
 */
export function setTypeBEnabled(enabled: boolean): void {
  runtimeConfig.cargoImp.useTypeBHeader = enabled;
  notifyListeners();
}

/**
 * Verifica si Type B está habilitado globalmente
 * Por defecto true para Descartes
 */
export function isTypeBEnabled(): boolean {
  return runtimeConfig.cargoImp.useTypeBHeader ?? true;
}

/**
 * Configura Type B para una aerolínea específica
 */
export function setAirlineTypeBEnabled(awbPrefix: string, enabled: boolean): void {
  const currentOverride = runtimeConfig.cargoImp.policyOverrides[awbPrefix] || {};
  runtimeConfig.cargoImp.policyOverrides[awbPrefix] = {
    ...currentOverride,
    useTypeBHeader: enabled
  };
  notifyListeners();
}

/**
 * Obtiene la configuración Type B efectiva
 */
export function getTypeBConfig(): TypeBConfig {
  const override = runtimeConfig.cargoImp.typeBConfig;
  return {
    ...DEFAULT_TYPEB_CONFIG,
    ...override
  };
}

/**
 * Actualiza la configuración Type B
 */
export function updateTypeBConfig(updates: Partial<TypeBConfig>): void {
  runtimeConfig.cargoImp.typeBConfig = {
    ...runtimeConfig.cargoImp.typeBConfig,
    ...updates
  };
  notifyListeners();
}

// ============================================================
// DEBUG / DEV HELPERS
// ============================================================

/**
 * Imprime estado actual del store (solo para debug)
 */
export function debugPrintConfig(): void {
  console.log('[RuntimeConfigStore] Current state:', JSON.stringify(runtimeConfig, null, 2));
}

/**
 * Verifica si hay overrides activos para una aerolínea
 */
export function hasOverrides(awbPrefix: string): boolean {
  return !!runtimeConfig.cargoImp.policyOverrides[awbPrefix];
}

/**
 * Obtiene lista de aerolíneas con overrides activos
 */
export function getAirlinesWithOverrides(): string[] {
  return Object.keys(runtimeConfig.cargoImp.policyOverrides);
}
