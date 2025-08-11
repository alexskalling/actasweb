#!/usr/bin/env node

/**
 * Script de prueba para el endpoint de automatización
 * Uso: node scripts/test-automation-api.js [archivo_audio]
 */

import fs from 'fs';
import FormData from 'form-data';

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000/api/automation';
const API_KEY = process.env.N8N_API_KEY || 'test-api-key';

async function testAutomationAPI(filePath) {
  try {
    console.log('🧪 Iniciando prueba del endpoint de automatización...');
    console.log(`📁 Archivo: ${filePath}`);
    console.log(`🌐 URL: ${API_URL}`);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo ${filePath} no existe`);
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('email', 'test@example.com');
    formData.append('name', 'Usuario de Prueba');

    // Realizar la petición
    console.log('📤 Enviando archivo...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        ...formData.getHeaders()
      },
      body: formData
    });

    const result = await response.json();

    console.log(`📊 Status Code: ${response.status}`);
    console.log('📄 Respuesta:');
    console.log(JSON.stringify(result, null, 2));

    if (response.ok && result.status === 'success') {
      console.log('✅ Prueba exitosa!');
      console.log(`📝 Transcripción: ${result.data.transcription.substring(0, 100)}...`);
      console.log(`📋 Borrador: ${result.data.draft.substring(0, 100)}...`);
      console.log(`🆔 File ID: ${result.data.fileId}`);
    } else {
      console.log('❌ Prueba fallida');
      console.log(`Error: ${result.message}`);
    }

  } catch (error) {
    console.error('💥 Error durante la prueba:', error.message);
    process.exit(1);
  }
}

// Función para probar el endpoint GET (health check)
async function testHealthCheck() {
  try {
    console.log('🏥 Probando health check...');
    
    const response = await fetch(API_URL, {
      method: 'GET'
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Health check exitoso');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Health check fallido');
    }
  } catch (error) {
    console.error('💥 Error en health check:', error.message);
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 Uso: node scripts/test-automation-api.js [archivo_audio]');
    console.log('📖 Ejemplo: node scripts/test-automation-api.js ./test-audio.mp3');
    console.log('');
    console.log('🔧 Variables de entorno opcionales:');
    console.log('   API_URL=http://localhost:3000/api/automation');
    console.log('   N8N_API_KEY=tu-api-key');
    console.log('');
    
    // Probar solo el health check
    await testHealthCheck();
    return;
  }

  const filePath = args[0];
  
  // Primero probar health check
  await testHealthCheck();
  console.log('');
  
  // Luego probar el endpoint principal
  await testAutomationAPI(filePath);
}

// Ejecutar si es el archivo principal
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

export { testAutomationAPI, testHealthCheck };
//C:\Users\PC\Downloads\Actas para tratar\wetransfer_archivos-de-asamblea-praia_2025-08-11_1539.zip/GMT20250809-121424_Recording_2140x1128.mp4