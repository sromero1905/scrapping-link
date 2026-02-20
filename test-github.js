#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { Octokit } from '@octokit/rest';

async function testGitHubGists() {
  console.log('🔧 Probando GitHub Gists...');
  
  try {
    // 1. Verificar que existe el token
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('Variable GITHUB_TOKEN no encontrada');
    }
    
    console.log('✅ Variable GITHUB_TOKEN encontrada');
    console.log(`📏 Longitud: ${token.length} caracteres`);
    console.log(`🔑 Prefix: ${token.substring(0, 8)}...`);
    
    // 2. Crear cliente Octokit
    const octokit = new Octokit({
      auth: token
    });
    
    console.log('✅ Cliente GitHub creado');
    
    // 3. Verificar autenticación
    console.log('🔐 Verificando autenticación...');
    const { data: user } = await octokit.rest.users.getAuthenticated();
    
    console.log('✅ Autenticación exitosa!');
    console.log(`👤 Usuario: ${user.login}`);
    console.log(`📧 Email: ${user.email || 'No público'}`);
    console.log(`📊 Gists públicos: ${user.public_gists}`);
    console.log(`📊 Repositorios: ${user.public_repos}`);
    
    // 4. Listar Gists existentes
    console.log('\n📋 Listando tus Gists existentes...');
    const gists = await octokit.rest.gists.list({
      per_page: 5
    });
    
    console.log(`✅ Tienes ${gists.data.length} Gists (mostrando últimos 5):`);
    if (gists.data.length > 0) {
      gists.data.forEach((gist, i) => {
        const date = new Date(gist.created_at).toLocaleDateString('es-ES');
        const files = Object.keys(gist.files).join(', ');
        console.log(`  ${i+1}. ${gist.description || 'Sin título'} (${date})`);
        console.log(`     📄 Archivos: ${files}`);
        console.log(`     🔗 ${gist.html_url}`);
      });
    } else {
      console.log('  (No tienes Gists aún - ¡vamos a crear el primero!)');
    }
    
    // 5. Crear Gist de prueba
    console.log('\n🧪 Creando Gist de prueba...');
    
    const testContent = `# 🧪 PRUEBA - LinkedIn Content Generator

## Información del Test
- **Fecha:** ${new Date().toLocaleDateString('es-ES')}
- **Hora:** ${new Date().toLocaleTimeString('es-ES')}
- **Usuario GitHub:** ${user.login}

## Posts de Ejemplo

### POST #1 | INFORMATIVO
El futuro de la IA está aquí. GPT-5 alcanza nuevos récords en benchmarks de razonamiento, superando por primera vez la barrera del 80% en tareas complejas.

*¿Estamos listos para lo que viene?*

#IA #Tecnologia #Innovation #GPT5

---

### POST #2 | OPINIÓN  
Unpopular opinion: La automatización no viene a quitarnos el trabajo, viene a quitarnos las tareas aburridas.

El problema real no es la IA, es que no nos estamos preparando lo suficientemente rápido.

#Automatizacion #FuturoDelTrabajo #IA

---

### POST #3 | HUMOR
Yo: "Voy a automatizar mi creación de contenido para LinkedIn"

También yo: *Pasa 3 horas configurando el sistema de automatización*

La ironía de la productividad 😅

#TechHumor #Productividad #Automatizacion

---

## Sistema de Automatización
✅ Scraping funcionando  
✅ Claude API conectada  
✅ GitHub Gists configurado  

**¡El sistema está listo para generar contenido automáticamente!** 🚀

---

*Generado automáticamente por LinkedIn Content Generator*  
*Sistema: Node.js + Claude + Playwright + GitHub Gists*`;

    const testGist = await octokit.rest.gists.create({
      description: `TEST - LinkedIn Content Generator - ${new Date().toLocaleDateString('es-ES')}`,
      public: false, // Privado para pruebas
      files: {
        'test-linkedin-posts.md': {
          content: testContent
        }
      }
    });
    
    console.log('✅ Gist de prueba creado exitosamente!');
    console.log(`🔗 URL: ${testGist.data.html_url}`);
    console.log(`📄 Archivo: test-linkedin-posts.md`);
    console.log(`🆔 ID: ${testGist.data.id}`);
    
    // 6. Obtener URL raw para lectura directa
    const filename = 'test-linkedin-posts.md';
    const rawUrl = testGist.data.files[filename].raw_url;
    console.log(`📖 URL de lectura directa: ${rawUrl}`);
    
    // 7. Verificar que el Gist se puede leer
    console.log('\n🔍 Verificando que el Gist es accesible...');
    const gistDetails = await octokit.rest.gists.get({
      gist_id: testGist.data.id
    });
    
    console.log('✅ Gist verificado correctamente');
    console.log(`📊 Tamaño del archivo: ${gistDetails.data.files[filename].size} bytes`);
    
    // 8. NO eliminar - dejarlo para que lo veas
    console.log('\n📌 Gist de prueba GUARDADO (no eliminado)');
    
    console.log('\n🎉 TODAS LAS PRUEBAS PASARON');
    console.log('✅ GitHub Gists está funcionando perfectamente');
    console.log('✅ Puedes crear Gists públicos y privados');
    console.log('✅ Los archivos son accesibles via URL');
    console.log('\n📍 CÓMO VER TUS GISTS:');
    console.log(`🌐 En navegador: https://gist.github.com/${user.login}`);
    console.log('📱 En móvil: Mismo URL, se adapta automáticamente');
    console.log('🔗 Cada Gist tiene URL única para compartir');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBA:', error.message);
    
    if (error.status === 401) {
      console.log('\n💡 POSIBLES SOLUCIONES:');
      console.log('1. Verificar que el token tenga el scope "gist"');
      console.log('2. Regenerar el Personal Access Token');
      console.log('3. Verificar que el token no haya expirado');
    }
    
    if (error.status === 403) {
      console.log('\n💡 POSIBLES SOLUCIONES:');
      console.log('1. El token puede no tener permisos de Gist');
      console.log('2. Verificar límites de rate limiting');
    }
    
    console.log('\n🔗 Ayuda:');
    console.log('- Crear token: https://github.com/settings/tokens');
    console.log('- Documentación: https://docs.github.com/en/rest/gists');
    
    return false;
  }
}

// Ejecutar prueba
testGitHubGists()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });