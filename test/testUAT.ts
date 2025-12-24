/**
 * Script de Prueba UAT - Envío a Traxon cargoJSON
 * 
 * Ejecutar con: npx ts-node test/testUAT.ts
 * O desde el navegador importando este módulo
 */

// Configuración UAT QUEMADA
const UAT_CONFIG = {
  endpoint: 'https://community.champ.aero:8444/avatar-uat/NO_WAIT',
  password: 'S81bLvtr3Nz!',
  senderAddress: 'REUFFW90AVTOPF/BOG01',
  recipientAddress: 'USCAIR01LUXXSXS'
};

// Importar los archivos de prueba
import awbDirecto from './awb_directo_test.json';
import awbConsolidado from './awb_consolidado_test.json';
import cslConsolidado from './csl_consolidado_test.json';
import fhlConsolidado from './fhl_consolidado_test.json';

interface TestResult {
  testName: string;
  success: boolean;
  statusCode: number;
  response: string;
  timestamp: string;
}

/**
 * Envía un mensaje a Traxon UAT
 */
async function sendToTraxon(payload: any, messageType: string): Promise<TestResult> {
  const testName = `${messageType} - ${payload.airWaybillNumber || payload.serialNumber || 'N/A'}`;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📤 Enviando: ${testName}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Payload:', JSON.stringify(payload, null, 2).substring(0, 500) + '...');
  
  try {
    const response = await fetch(UAT_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(':' + UAT_CONFIG.password).toString('base64')}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    const result: TestResult = {
      testName,
      success: response.ok,
      statusCode: response.status,
      response: responseText,
      timestamp: new Date().toISOString()
    };

    if (response.ok) {
      console.log(`✅ ÉXITO - Status: ${response.status}`);
    } else {
      console.log(`❌ ERROR - Status: ${response.status}`);
    }
    console.log('Respuesta:', responseText.substring(0, 500));
    
    return result;
  } catch (error: any) {
    console.log(`❌ ERROR DE CONEXIÓN: ${error.message}`);
    return {
      testName,
      success: false,
      statusCode: 0,
      response: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Ejecuta todas las pruebas
 */
async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PRUEBAS UAT - TRAXON cargoJSON API                     ║');
  console.log('║     Endpoint: ' + UAT_CONFIG.endpoint.substring(0, 45) + '...  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📅 Fecha: ${new Date().toISOString()}`);
  console.log(`📍 Sender: ${UAT_CONFIG.senderAddress}`);
  console.log(`📍 Recipient: ${UAT_CONFIG.recipientAddress}`);

  const results: TestResult[] = [];

  // ============================================================
  // PRUEBA 1: AWB DIRECTO (Sin Houses)
  // ============================================================
  console.log('\n\n🔷 PRUEBA 1: ENVÍO DIRECTO (AWB sin Houses)');
  console.log('━'.repeat(60));
  
  const resultDirecto = await sendToTraxon(awbDirecto, 'AWB-DIRECTO');
  results.push(resultDirecto);

  // Pausa entre envíos
  await new Promise(r => setTimeout(r, 2000));

  // ============================================================
  // PRUEBA 2: AWB CONSOLIDADO + CSL + 3 FHLs
  // ============================================================
  console.log('\n\n🔷 PRUEBA 2: ENVÍO CONSOLIDADO (AWB + CSL + 3 Houses)');
  console.log('━'.repeat(60));
  
  // 2.1 AWB Master
  console.log('\n📦 2.1 - AWB Master');
  const resultAWB = await sendToTraxon(awbConsolidado, 'AWB-CONSOLIDADO');
  results.push(resultAWB);
  await new Promise(r => setTimeout(r, 1000));

  // 2.2 CSL (Consolidation List)
  console.log('\n📦 2.2 - CSL (Lista de Consolidación)');
  const resultCSL = await sendToTraxon(cslConsolidado, 'CSL');
  results.push(resultCSL);
  await new Promise(r => setTimeout(r, 1000));

  // 2.3 FHLs (House Waybills)
  for (let i = 0; i < fhlConsolidado.length; i++) {
    console.log(`\n📦 2.${3 + i} - FHL House ${i + 1} de ${fhlConsolidado.length}`);
    const resultFHL = await sendToTraxon(fhlConsolidado[i], `FHL-${i + 1}`);
    results.push(resultFHL);
    await new Promise(r => setTimeout(r, 1000));
  }

  // ============================================================
  // RESUMEN FINAL
  // ============================================================
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMEN DE PRUEBAS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const exitosos = results.filter(r => r.success).length;
  const fallidos = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Total: ${results.length} | ✅ Exitosos: ${exitosos} | ❌ Fallidos: ${fallidos}`);
  console.log('\nDetalle:');
  console.log('─'.repeat(60));
  
  results.forEach((r, i) => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${i + 1}. ${icon} ${r.testName} - Status: ${r.statusCode}`);
    if (!r.success) {
      console.log(`   └─ Error: ${r.response.substring(0, 100)}...`);
    }
  });

  console.log('\n' + '═'.repeat(60));
  console.log('Pruebas completadas.');
  
  return results;
}

// Exportar para uso como módulo
export { runAllTests, sendToTraxon, UAT_CONFIG };

// Ejecutar si se llama directamente
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}
