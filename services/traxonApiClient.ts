/**
 * Cliente API para envío de mensajes a Traxon cargoJSON
 * Soporta ambiente de Producción y UAT (pruebas)
 */

// ============================================================
// CONFIGURACIÓN DE AMBIENTES
// ============================================================

// Tipo para el ambiente de transmisión
export type TransmissionEnvironment = 'PRODUCTION' | 'UAT';

// Configuración del ambiente de PRODUCCIÓN
export const PRODUCTION_CONFIG = {
  endpoint: 'https://community.champ.aero:8443/avatar-prod/NO_WAIT',
  password: '7Wqft8Sv2!',
  senderAddress: 'REUFFW90AVTOPF/BOG01',
  // En producción, el recipientAddress se determina por la aerolínea (ej: TDVAIR08DHV)
  recipientAddress: 'TDVAIR08DHV'
};

// Configuración del ambiente de UAT (Pruebas)
export const UAT_CONFIG = {
  endpoint: 'https://community.champ.aero:8444/avatar-uat/NO_WAIT',
  password: 'S81bLvtr3Nz!',
  senderAddress: 'REUFFW90AVTOPF/BOG01',
  // En UAT, siempre se envía a esta dirección de pruebas
  recipientAddress: 'USCAIR01LUXXSXS'
};

// Configuración por defecto (PRODUCCIÓN)
export const DEFAULT_API_CONFIG = { ...PRODUCTION_CONFIG };

// Clave para localStorage (solo para config API, NO para ambiente)
const API_CONFIG_KEY = 'traxon_api_config';

// Interfaz para configuración de API
export interface ApiConfig {
  endpoint: string;
  password: string;
  senderAddress: string;
  recipientAddress: string;
  environment?: TransmissionEnvironment;
}

// Variable en memoria para el ambiente (NO se persiste - siempre inicia en PRODUCTION)
let currentSessionEnvironment: TransmissionEnvironment = 'PRODUCTION';

/**
 * Obtiene el ambiente de transmisión actual (solo de la sesión, no persistido)
 */
export function getTransmissionEnvironment(): TransmissionEnvironment {
  return currentSessionEnvironment;
}

/**
 * Establece el ambiente de transmisión (solo para la sesión actual, NO se guarda)
 */
export function setTransmissionEnvironment(env: TransmissionEnvironment): void {
  currentSessionEnvironment = env;
  // Limpiar cache de auth header
  cachedAuthHeader = null;
}

/**
 * Obtiene la configuración según el ambiente actual
 */
export function getEnvironmentConfig(env?: TransmissionEnvironment): ApiConfig {
  const currentEnv = env || getTransmissionEnvironment();
  const baseConfig = currentEnv === 'UAT' ? UAT_CONFIG : PRODUCTION_CONFIG;
  return { ...baseConfig, environment: currentEnv };
}

/**
 * Obtiene la configuración actual de la API (según ambiente seleccionado)
 */
export function getApiConfig(): ApiConfig {
  const env = getTransmissionEnvironment();
  const baseConfig = env === 'UAT' ? UAT_CONFIG : PRODUCTION_CONFIG;
  return { ...baseConfig, environment: env };
}

/**
 * Guarda la configuración de API
 */
export function saveApiConfig(config: Partial<ApiConfig>): void {
  try {
    const current = getApiConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(updated));
    // Limpiar cache de auth header cuando cambia el password
    cachedAuthHeader = null;
  } catch (e) {
    console.error('Error saving API config:', e);
  }
}

/**
 * Resetea la configuración a valores por defecto (Producción)
 */
export function resetApiConfig(): void {
  localStorage.removeItem(API_CONFIG_KEY);
  currentSessionEnvironment = 'PRODUCTION';
  cachedAuthHeader = null;
}

// ============================================================
// TIPOS
// ============================================================
export interface TraxonApiResponse {
  success: boolean;
  statusCode: number;
  message: string;
  rawResponse?: string;
  timestamp: string;
  messageType?: string;
}

export interface TraxonSendResult {
  awbMessage?: TraxonApiResponse;
  cslMessage?: TraxonApiResponse;
  /** Múltiples mensajes CSL - uno por cada house */
  cslMessages?: TraxonApiResponse[];
  /** @deprecated FHL messages ya no se envían según Traxon EMA - el CSL contiene houseWaybillSummaries */
  fhlMessages?: TraxonApiResponse[];
  allSuccess: boolean;
  summary: string;
}

type SendOptions = {
  signal?: AbortSignal;
};

let cachedAuthHeader: string | null = null;
const getAuthHeader = () => {
  const config = getApiConfig();
  // No cachear si el password puede cambiar dinámicamente
  const raw = ':' + config.password;

  // Browser
  if (typeof btoa === 'function') {
    return `Basic ${btoa(raw)}`;
  }

  // Node (tests / scripts)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyGlobal = globalThis as any;
  if (anyGlobal?.Buffer) {
    return `Basic ${anyGlobal.Buffer.from(raw).toString('base64')}`;
  }

  throw new Error('No base64 encoder available for Basic auth');
};

const delay = (ms: number, signal?: AbortSignal) => {
  if (!signal) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }

  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      const err = new Error('Aborted');
      (err as any).name = 'AbortError';
      reject(err);
      return;
    }

    const id = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(id);
      const err = new Error('Aborted');
      (err as any).name = 'AbortError';
      reject(err);
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
};

// ============================================================
// FUNCIONES DE ENVÍO
// ============================================================

/**
 * Envía un mensaje JSON a Traxon (usa configuración dinámica)
 */
export const sendToTraxonUAT = async (
  messagePayload: any,
  messageType: 'AWB' | 'CSL' | 'FHL',
  options: SendOptions = {}
): Promise<TraxonApiResponse> => {
  const config = getApiConfig(); // Obtener configuración actual
  const startTime = new Date().toISOString();
  
  console.log(`[${startTime}] 📤 Enviando ${messageType} a Traxon...`);
  console.log(`Endpoint: ${config.endpoint}`);
  
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
        'Accept': 'application/json'
      },
      body: JSON.stringify(messagePayload),
      signal: options.signal
    });

    const responseText = await response.text();
    
    const result: TraxonApiResponse = {
      success: response.ok,
      statusCode: response.status,
      message: response.ok 
        ? `✅ ${messageType} enviado exitosamente` 
        : `❌ Error: ${response.statusText}`,
      rawResponse: responseText,
      timestamp: new Date().toISOString(),
      messageType
    };

    console.log(`[${result.timestamp}] Respuesta ${messageType}: Status ${response.status}`);
    if (responseText) {
      console.log(`Respuesta: ${responseText.substring(0, 200)}...`);
    }
    
    return result;

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Error enviando ${messageType}:`, error);
    
    return {
      success: false,
      statusCode: 0,
      message: `❌ Error de conexión: ${error.message}`,
      rawResponse: error.toString(),
      timestamp: new Date().toISOString(),
      messageType
    };
  }
};

/**
 * Envía un envío completo (AWB + múltiples CSL si aplica)
 * NOTA: Según Traxon, para consolidados se envía Master AWB + N mensajes CSL (uno por house).
 * Cada house se envía en un mensaje CSL separado.
 */
export const sendCompleteShipment = async (
  awbMessage: any,
  cslMessages?: any[], // Array de CSL - uno por cada house
  _fhlMessages?: any[], // DEPRECATED: FHL ya no se envía, se mantiene por compatibilidad
  options: SendOptions = {}
): Promise<TraxonSendResult> => {
  const result: TraxonSendResult = {
    allSuccess: true,
    summary: '',
    cslMessages: []
  };

  const summaryParts: string[] = [];

  // 1. Enviar AWB (Master Air Waybill)
  console.log('═══════════════════════════════════════════════════════');
  console.log('📦 PASO 1: Enviando AWB (Master Air Waybill)');
  console.log('═══════════════════════════════════════════════════════');
  
  result.awbMessage = await sendToTraxonUAT(awbMessage, 'AWB', options);
  summaryParts.push(`AWB: ${result.awbMessage.success ? '✅' : '❌'} (${result.awbMessage.statusCode})`);

  if (!result.awbMessage.success) {
    result.allSuccess = false;
    result.summary = summaryParts.join(' | ') + ' - AWB falló, proceso detenido';
    return result;
  }

  // Pequeña pausa entre envíos
  await delay(1000, options.signal);

  // 2. Enviar CSL si existen (múltiples mensajes - uno por house)
  if (cslMessages && cslMessages.length > 0) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📦 PASO 2: Enviando ${cslMessages.length} CSL (uno por house)`);
    console.log('═══════════════════════════════════════════════════════');
    
    let cslSuccess = 0;
    let cslFailed = 0;
    
    for (let i = 0; i < cslMessages.length; i++) {
      const cslMessage = cslMessages[i];
      const houseNumber = cslMessage.houseWaybillSummaries?.[0]?.serialNumber || `House ${i + 1}`;
      
      console.log(`\n📄 CSL ${i + 1}/${cslMessages.length}: ${houseNumber}`);
      
      const cslResponse = await sendToTraxonUAT(cslMessage, 'CSL', options);
      result.cslMessages!.push(cslResponse);
      
      if (cslResponse.success) {
        cslSuccess++;
        console.log(`   ✅ CSL enviado correctamente`);
      } else {
        cslFailed++;
        result.allSuccess = false;
        console.log(`   ❌ CSL falló: ${cslResponse.message}`);
      }
      
      // Pequeña pausa entre cada CSL (evitar rate limiting)
      if (i < cslMessages.length - 1) {
        await delay(500, options.signal);
      }
    }
    
    summaryParts.push(`CSL: ${cslSuccess}/${cslMessages.length} ✅${cslFailed > 0 ? ` (${cslFailed} ❌)` : ''}`);
    
    // Para compatibilidad, guardar el primer CSL en cslMessage
    if (result.cslMessages!.length > 0) {
      result.cslMessage = result.cslMessages![0];
    }
  }

  // NOTA: Los FHL (House Waybills individuales) ya NO se envían.
  // Según Traxon EMA, el CSL contiene toda la información necesaria
  // de las houses en el campo houseWaybillSummaries.

  result.summary = summaryParts.join(' | ');
  return result;
};

/**
 * Obtiene la configuración UAT actual
 */
export const getUATConfig = () => ({
  endpoint: UAT_CONFIG.endpoint,
  senderAddress: UAT_CONFIG.senderAddress,
  recipientAddress: UAT_CONFIG.recipientAddress
});

export default {
  sendToTraxonUAT,
  sendCompleteShipment,
  getUATConfig,
  UAT_CONFIG
};
