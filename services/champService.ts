/**
 * champService.ts - Simplificado para CARGO-IMP
 * 
 * Solo contiene las funciones utilitarias necesarias para el servicio CARGO-IMP.
 * Las funciones de generación de JSON Traxon han sido removidas.
 */

import { 
  loadConnectorConfig,
  ConnectorConfig,
  DEFAULT_SPH_BY_AIRLINE
} from '../types';

// ============================================================
// CACHE DE CONFIGURACIÓN
// ============================================================
let cachedConfig: ConnectorConfig | null = null;
let configLastLoad = 0;
const CONFIG_CACHE_TTL = 5000; // 5 segundos de cache

function getConfig(): ConnectorConfig {
  const now = Date.now();
  if (!cachedConfig || (now - configLastLoad) > CONFIG_CACHE_TTL) {
    cachedConfig = loadConnectorConfig();
    configLastLoad = now;
  }
  return cachedConfig;
}

// ============================================================
// SPH Code por aerolínea
// ============================================================
const getSpbByAirline = (awbPrefix: string): string[] => {
  const config = getConfig();
  return config.sphByAirline[awbPrefix] || config.sphByAirline['DEFAULT'] || ['EAP'];
};

// ============================================================
// FUNCIONES PÚBLICAS EXPORTADAS
// ============================================================

/**
 * Obtiene el prefijo de la guía aérea (primeros 3 dígitos)
 */
export const getAwbPrefix = (awbNumber: string): string => {
  return awbNumber.split('-')[0] || awbNumber.substring(0, 3);
};

/**
 * Obtiene los códigos SPH por defecto para una aerolínea
 * @param awbPrefix - Prefijo de la guía
 * @returns Array de códigos por defecto
 */
export const getDefaultSphCodes = (awbPrefix: string): string[] => {
  return getSpbByAirline(awbPrefix);
};

/**
 * Limpia y formatea la descripción de mercancía para el formato EDI
 * - Remueve caracteres especiales
 * - Remueve códigos HS
 * - Formatea en líneas de máximo 25 caracteres
 * - Limita la longitud total
 * 
 * @param description - Descripción original de la mercancía
 * @param maxTotalLength - Longitud máxima total (default: 150)
 * @returns Descripción saneada con saltos de línea cada 25 chars
 */
export const sanitizeGoodsDescription = (description: string | undefined, maxTotalLength: number = 150): string => {
  if (!description || description.trim() === "") return "";
  
  // Paso 1: Limpiar caracteres especiales y normalizar
  const normalized = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const noEnie = normalized.replace(/[ñÑ]/g, "N");
  
  // Paso 2: Remover códigos HS (patrones como "HS 0603110000" o "HS0603110000" o solo "0603110000")
  const noHsCodes = noEnie.replace(/\bHS\s*\d{6,10}\b/gi, "");
  const noLongNumbers = noHsCodes.replace(/\b\d{6,10}\b/g, "");
  
  // Paso 3: Solo permitir A-Z, 0-9 y espacios
  const cleaned = noLongNumbers.replace(/[^A-Za-z0-9\s]/g, "").toUpperCase();
  
  // Paso 4: Normalizar espacios múltiples
  const singleSpaces = cleaned.replace(/\s+/g, " ").trim();
  
  // Paso 5: Si está vacío después de limpiar, retornar vacío
  if (singleSpaces.length === 0) return "";
  
  // Paso 6: Dividir en líneas de máximo 25 caracteres
  const words = singleSpaces.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  
  for (const word of words) {
    // Si la palabra sola es mayor a 25 chars, cortarla
    if (word.length > 25) {
      if (currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = "";
      }
      for (let i = 0; i < word.length; i += 25) {
        lines.push(word.substring(i, i + 25));
      }
      continue;
    }
    
    // Si agregar la palabra excede 25 chars, nueva línea
    if (currentLine.length + word.length + 1 > 25) {
      if (currentLine.length > 0) {
        lines.push(currentLine.trim());
      }
      currentLine = word;
    } else {
      currentLine = currentLine.length > 0 ? currentLine + " " + word : word;
    }
  }
  
  // Agregar última línea
  if (currentLine.length > 0) {
    lines.push(currentLine.trim());
  }
  
  // Paso 7: Unir con \n y limitar longitud total
  const result = lines.join("\n");
  return result.substring(0, maxTotalLength);
};
