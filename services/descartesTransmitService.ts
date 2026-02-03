/**
 * Servicio de Transmisión a Descartes
 * 
 * Envía mensajes CARGO-IMP (FWB/FHL) al endpoint de Descartes vía HTTP POST.
 * 
 * Flujo:
 *   1. Primero envía el Master (FWB)
 *   2. Luego envía cada House (FHL) por separado
 *   3. Retorna resultado consolidado
 * 
 * Endpoint: https://wwwtest.myvan.descartes.com/HttpUpload/SimpleUploadHandler.aspx
 * Auth: Basic Auth (usuario:contraseña en Base64)
 * Headers: Content-Type: application/x-CARGO-IMP
 * Body: Mensaje EDI en texto plano (Type B format)
 * 
 * Respuesta: XML con estructura:
 *   <Response>
 *     <host>...</host>
 *     <service>...</service>
 *     <status>OK</status>           <!-- Éxito -->
 *     <tid>tracking-id</tid>        <!-- ID de seguimiento -->
 *     <bytesReceived>123</bytesReceived>
 *     <error>...</error>            <!-- Si hay error -->
 *     <errorShort>...</errorShort>
 *     <errorDetail>...</errorDetail>
 *   </Response>
 */

export interface DescartesCredentials {
  /** URL del endpoint de Descartes */
  endpoint: string;
  /** Usuario para Basic Auth */
  username: string;
  /** Contraseña para Basic Auth */
  password: string;
}

/**
 * Respuesta parseada del XML de Descartes
 */
export interface DescartesXmlResponse {
  /** Host que procesó la solicitud */
  host?: string;
  /** Servicio */
  service?: string;
  /** Fecha/hora de procesamiento */
  created?: string;
  /** Versión del servicio */
  version?: string;
  /** Bytes recibidos */
  bytesReceived?: number;
  /** Estado (OK si fue exitoso) */
  status?: string;
  /** Tracking ID de la transacción */
  tid?: string;
  /** Mensaje de error general */
  error?: string;
  /** Error corto (categorización) */
  errorShort?: string;
  /** Detalle del error */
  errorDetail?: string;
  /** Excepción no manejada */
  unhandledException?: string;
  /** Segundos para reintentar (-1 = no reintentar) */
  retryAfter?: number;
}

export interface TransmissionResult {
  /** Si el envío fue exitoso */
  success: boolean;
  /** Tipo de mensaje: 'FWB' o 'FHL' */
  messageType: 'FWB' | 'FHL';
  /** Número de AWB o HAWB */
  reference: string;
  /** Código de respuesta HTTP */
  httpStatus?: number;
  /** Mensaje de respuesta del servidor (texto crudo) */
  responseMessage?: string;
  /** Respuesta XML parseada de Descartes */
  descartesResponse?: DescartesXmlResponse;
  /** Error si falló */
  error?: string;
  /** Timestamp del envío */
  timestamp: string;
}

export interface BundleTransmissionResult {
  /** Si todos los envíos fueron exitosos */
  allSuccess: boolean;
  /** Resultado del FWB (Master) */
  fwbResult: TransmissionResult;
  /** Resultados de cada FHL (Houses) */
  fhlResults: TransmissionResult[];
  /** Resumen legible */
  summary: string;
  /** Total de mensajes enviados */
  totalSent: number;
  /** Total de mensajes exitosos */
  totalSuccess: number;
  /** Total de mensajes fallidos */
  totalFailed: number;
}

/**
 * Servicio para transmitir mensajes a Descartes
 */
export class DescartesTransmitService {
  private credentials: DescartesCredentials;

  constructor(credentials: DescartesCredentials) {
    this.credentials = credentials;
  }

  /**
   * Actualiza las credenciales
   */
  updateCredentials(credentials: Partial<DescartesCredentials>): void {
    this.credentials = { ...this.credentials, ...credentials };
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(
      this.credentials.endpoint &&
      this.credentials.username &&
      this.credentials.password
    );
  }

  /**
   * Genera el header Authorization para Basic Auth
   */
  private getAuthHeader(): string {
    const credentials = `${this.credentials.username}:${this.credentials.password}`;
    const base64 = btoa(credentials);
    return `Basic ${base64}`;
  }

  /**
   * Parsea la respuesta XML de Descartes
   */
  private parseDescartesXml(xmlText: string): DescartesXmlResponse {
    const result: DescartesXmlResponse = {};
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      
      // Verificar si hay error de parseo
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        console.warn('Error parseando XML de Descartes:', parseError.textContent);
        return result;
      }
      
      // Extraer campos del Response
      const getValue = (tagName: string): string | undefined => {
        const element = doc.querySelector(tagName);
        return element?.textContent || undefined;
      };
      
      result.host = getValue('host');
      result.service = getValue('service');
      result.created = getValue('created');
      result.version = getValue('version');
      result.status = getValue('status');
      result.tid = getValue('tid');
      result.error = getValue('error');
      result.errorShort = getValue('errorShort');
      result.errorDetail = getValue('errorDetail');
      result.unhandledException = getValue('unhandledException');
      
      const bytesReceived = getValue('bytesReceived');
      if (bytesReceived) result.bytesReceived = parseInt(bytesReceived, 10);
      
      const retryAfter = getValue('retryAfter');
      if (retryAfter) result.retryAfter = parseInt(retryAfter, 10);
      
    } catch (e) {
      console.error('Error parseando respuesta Descartes:', e);
    }
    
    return result;
  }

  /**
   * Determina si la respuesta de Descartes indica éxito
   */
  private isSuccessResponse(parsed: DescartesXmlResponse): boolean {
    // Éxito si hay status y NO hay errores
    if (parsed.error || parsed.errorShort || parsed.errorDetail || parsed.unhandledException) {
      return false;
    }
    // Status presente indica éxito
    if (parsed.status) {
      return true;
    }
    // Si hay tid (tracking id) también es éxito
    if (parsed.tid) {
      return true;
    }
    return false;
  }

  /**
   * Envía un mensaje individual a Descartes
   */
  async sendMessage(
    message: string,
    messageType: 'FWB' | 'FHL',
    reference: string
  ): Promise<TransmissionResult> {
    const timestamp = new Date().toISOString();

    if (!this.isConfigured()) {
      return {
        success: false,
        messageType,
        reference,
        error: 'Servicio no configurado. Falta endpoint, usuario o contraseña.',
        timestamp
      };
    }

    try {
      const response = await fetch(this.credentials.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-CARGO-IMP',
          'Authorization': this.getAuthHeader()
        },
        body: message
      });

      const responseText = await response.text();
      
      // Parsear respuesta XML de Descartes
      const descartesResponse = this.parseDescartesXml(responseText);
      
      // Determinar éxito basándose en el contenido XML
      const isSuccess = response.ok && this.isSuccessResponse(descartesResponse);
      
      if (isSuccess) {
        return {
          success: true,
          messageType,
          reference,
          httpStatus: response.status,
          responseMessage: descartesResponse.status || 'OK',
          descartesResponse,
          timestamp
        };
      } else {
        // Construir mensaje de error detallado
        let errorMsg = '';
        if (descartesResponse.error) errorMsg = descartesResponse.error;
        else if (descartesResponse.errorShort) errorMsg = descartesResponse.errorShort;
        else if (descartesResponse.errorDetail) errorMsg = descartesResponse.errorDetail;
        else if (descartesResponse.unhandledException) errorMsg = `Exception: ${descartesResponse.unhandledException}`;
        else if (!response.ok) errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        else errorMsg = 'Error desconocido en respuesta';
        
        return {
          success: false,
          messageType,
          reference,
          httpStatus: response.status,
          responseMessage: responseText,
          descartesResponse,
          error: errorMsg,
          timestamp
        };
      }
    } catch (error) {
      return {
        success: false,
        messageType,
        reference,
        error: error instanceof Error ? error.message : 'Error de conexión desconocido',
        timestamp
      };
    }
  }

  /**
   * Envía un bundle completo (FWB + FHLs) a Descartes
   * 
   * Flujo:
   *   1. Primero envía el FWB (Master)
   *   2. Si el FWB es exitoso, envía cada FHL secuencialmente
   *   3. Retorna resultado consolidado
   * 
   * @param fwbMessage - Mensaje FWB completo (Master AWB)
   * @param awbNumber - Número de AWB del master
   * @param fhlMessages - Array de mensajes FHL (Houses)
   * @param hawbNumbers - Array de números HAWB correspondientes a cada FHL
   */
  async sendBundle(
    fwbMessage: string,
    awbNumber: string,
    fhlMessages: string[] = [],
    hawbNumbers: string[] = []
  ): Promise<BundleTransmissionResult> {
    const fhlResults: TransmissionResult[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    // 1. Enviar FWB (Master) primero
    console.log(`📤 Transmitiendo FWB ${awbNumber} a Descartes...`);
    const fwbResult = await this.sendMessage(fwbMessage, 'FWB', awbNumber);
    
    if (fwbResult.success) {
      totalSuccess++;
      console.log(`✅ FWB ${awbNumber} transmitido exitosamente`);
    } else {
      totalFailed++;
      console.error(`❌ Error transmitiendo FWB ${awbNumber}:`, fwbResult.error);
    }

    // 2. Si hay FHLs, enviarlos secuencialmente
    if (fwbResult.success && fhlMessages.length > 0) {
      for (let i = 0; i < fhlMessages.length; i++) {
        const fhlMessage = fhlMessages[i];
        const hawbNumber = hawbNumbers[i] || `HAWB-${i + 1}`;
        
        console.log(`📤 Transmitiendo FHL ${hawbNumber} (${i + 1}/${fhlMessages.length})...`);
        const fhlResult = await this.sendMessage(fhlMessage, 'FHL', hawbNumber);
        fhlResults.push(fhlResult);
        
        if (fhlResult.success) {
          totalSuccess++;
          console.log(`✅ FHL ${hawbNumber} transmitido exitosamente`);
        } else {
          totalFailed++;
          console.error(`❌ Error transmitiendo FHL ${hawbNumber}:`, fhlResult.error);
        }

        // Pequeña pausa entre envíos para no saturar el servidor
        if (i < fhlMessages.length - 1) {
          await this.delay(100);
        }
      }
    }

    // 3. Construir resultado consolidado
    const totalSent = 1 + fhlMessages.length;
    const allSuccess = totalFailed === 0;

    let summary: string;
    if (allSuccess) {
      summary = `✅ Transmisión exitosa: FWB${fhlMessages.length > 0 ? ` + ${fhlMessages.length} FHL` : ''} enviados a Descartes`;
    } else if (totalSuccess === 0) {
      summary = `❌ Error en transmisión: No se pudo enviar ningún mensaje`;
    } else {
      summary = `⚠️ Transmisión parcial: ${totalSuccess}/${totalSent} mensajes enviados (${totalFailed} fallidos)`;
    }

    return {
      allSuccess,
      fwbResult,
      fhlResults,
      summary,
      totalSent,
      totalSuccess,
      totalFailed
    };
  }

  /**
   * Utilidad para esperar
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// SINGLETON Y CONFIGURACIÓN GLOBAL
// ============================================================

/** Instancia global del servicio */
let descartesService: DescartesTransmitService | null = null;

/**
 * Obtiene la instancia del servicio de Descartes.
 * Si no existe, la crea con credenciales vacías.
 */
export function getDescartesService(): DescartesTransmitService {
  if (!descartesService) {
    descartesService = new DescartesTransmitService({
      endpoint: '',
      username: '',
      password: ''
    });
  }
  return descartesService;
}

/**
 * Configura el servicio de Descartes con las credenciales del backend.
 * Llamar desde el componente cuando el backend pase la configuración.
 */
export function configureDescartesService(credentials: DescartesCredentials): void {
  if (descartesService) {
    descartesService.updateCredentials(credentials);
  } else {
    descartesService = new DescartesTransmitService(credentials);
  }
  console.log('🔧 Descartes service configurado:', {
    endpoint: credentials.endpoint,
    username: credentials.username,
    hasPassword: !!credentials.password
  });
}

/**
 * Verifica si el servicio está listo para transmitir
 */
export function isDescartesConfigured(): boolean {
  return descartesService?.isConfigured() ?? false;
}
