#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';

async function testGoogleCredentials() {
  console.log('🔧 Probando credenciales de Google...');
  
  try {
    // 1. Verificar que existan las credenciales
    const credentialsBase64 = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsBase64) {
      throw new Error('Variable GOOGLE_CREDENTIALS no encontrada');
    }
    
    console.log('✅ Variable GOOGLE_CREDENTIALS encontrada');
    console.log(`📏 Longitud: ${credentialsBase64.length} caracteres`);
    
    // 2. Decodificar y parsear
    let credentials;
    try {
      const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
      credentials = JSON.parse(credentialsJson);
      console.log('✅ Credenciales decodificadas correctamente');
      console.log(`📧 Service Account Email: ${credentials.client_email}`);
      console.log(`🆔 Project ID: ${credentials.project_id}`);
    } catch (e) {
      throw new Error(`Error decodificando credenciales: ${e.message}`);
    }
    
    // 3. Crear cliente de autenticación
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/documents'
      ]
    );
    
    console.log('✅ Cliente JWT creado');
    
    // 4. Autorizar
    await auth.authorize();
    console.log('✅ Autorización exitosa');
    
    // 5. Probar Google Drive API
    const drive = google.drive({ version: 'v3', auth: auth });
    
    console.log('📁 Probando listar archivos en Drive...');
    const response = await drive.files.list({
      pageSize: 5,
      fields: 'files(id, name, mimeType)'
    });
    
    console.log('✅ Conexión a Drive exitosa');
    console.log(`📊 Archivos encontrados: ${response.data.files.length}`);
    
    if (response.data.files.length > 0) {
      console.log('📄 Primeros archivos:');
      response.data.files.forEach((file, i) => {
        console.log(`  ${i+1}. ${file.name} (${file.mimeType})`);
      });
    }
    
    // 6. Buscar carpeta LinkedIn Automation
    console.log('\n📁 Buscando carpeta LinkedIn Automation...');
    
    const folderResponse = await drive.files.list({
      q: "name='LinkedIn Automation' and mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id, name)'
    });

    let folderId = null;
    if (folderResponse.data.files.length > 0) {
      folderId = folderResponse.data.files[0].id;
      console.log(`✅ Carpeta encontrada: ${folderId}`);
    } else {
      console.log('⚠️ Carpeta LinkedIn Automation no encontrada');
      console.log('💡 Créala manualmente en Drive y compártela con el Service Account');
      return false;
    }
    
    // 7. Probar crear archivo EN LA CARPETA
    console.log('\n🧪 Probando crear archivo en carpeta LinkedIn Automation...');
    
    const testContent = `PRUEBA - LinkedIn Content Generator
===========================================

Fecha: ${new Date().toLocaleDateString('es-ES')}
Hora: ${new Date().toLocaleTimeString('es-ES')}

Este archivo fue creado exitosamente por el sistema de automatización.

POSTS DE PRUEBA:
- Post #1: El futuro de la IA está aquí
- Post #2: Automatización que funciona  
- Post #3: Tecnología al servicio del contenido

Sistema funcionando correctamente! 🎉`;

    const testFile = await drive.files.create({
      requestBody: {
        name: 'TEST-LinkedIn-Posts-' + Date.now() + '.txt',
        parents: [folderId]
      },
      media: {
        mimeType: 'text/plain',
        body: testContent
      },
      fields: 'id,name,webViewLink'
    });
    
    console.log('✅ Archivo de prueba creado en carpeta exitosamente!');
    console.log(`🔗 ID: ${testFile.data.id}`);
    console.log(`📄 Nombre: ${testFile.data.name}`);
    console.log(`🌐 URL: ${testFile.data.webViewLink}`);
    
    // 8. Verificar que el archivo esté en la carpeta
    console.log('\n🔍 Verificando archivos en carpeta...');
    const folderContents = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'files(id, name, mimeType)',
      pageSize: 10
    });
    
    console.log(`📊 Archivos en carpeta LinkedIn Automation: ${folderContents.data.files.length}`);
    folderContents.data.files.forEach((file, i) => {
      console.log(`  ${i+1}. ${file.name}`);
    });
    
    // 9. Eliminar archivo de prueba
    await drive.files.delete({
      fileId: testFile.data.id
    });
    console.log('✅ Archivo de prueba eliminado');
    
    console.log('\n🎉 TODAS LAS PRUEBAS PASARON');
    console.log('✅ Las credenciales están correctas');
    console.log('✅ Los permisos de Drive funcionan');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBA:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 POSIBLES SOLUCIONES:');
      console.log('1. Regenerar las credenciales JSON en Google Cloud Console');
      console.log('2. Verificar que el reloj del sistema esté sincronizado');
      console.log('3. Crear un nuevo Service Account');
    }
    
    if (error.message.includes('insufficient authentication scopes')) {
      console.log('\n💡 POSIBLES SOLUCIONES:');
      console.log('1. Habilitar Google Drive API en Google Cloud Console');
      console.log('2. Habilitar Google Docs API en Google Cloud Console');
    }
    
    if (error.message.includes('The caller does not have permission')) {
      console.log('\n💡 POSIBLES SOLUCIONES:');
      console.log('1. Compartir una carpeta específica con el Service Account');
      console.log('2. Dar rol de Editor/Owner al Service Account en IAM');
      console.log(`3. Compartir con: ${credentials?.client_email || 'el Service Account email'}`);
    }
    
    return false;
  }
}

// Ejecutar prueba
testGoogleCredentials()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });