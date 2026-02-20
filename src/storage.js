import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

class GoogleDriveStorage {
  constructor() {
    this.auth = null;
    this.drive = null;
    this.docs = null;
    this.folderId = null;
  }

  async initialize() {
    console.log('🔐 Inicializando autenticación con Google Drive...');
    
    try {
      // Obtener credenciales desde variable de entorno
      const credentialsBase64 = process.env.GOOGLE_CREDENTIALS;
      if (!credentialsBase64) {
        throw new Error('Variable de entorno GOOGLE_CREDENTIALS no encontrada');
      }

      // Decodificar credenciales
      const credentials = JSON.parse(
        Buffer.from(credentialsBase64, 'base64').toString('utf-8')
      );

      // Crear cliente de autenticación
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/documents'
        ]
      );

      await this.auth.authorize();
      
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.docs = google.docs({ version: 'v1', auth: this.auth });

      console.log('✅ Autenticación exitosa con Google Drive');
      
      // Crear o encontrar carpeta "LinkedIn Automation"
      await this.ensureFolder();
      
    } catch (error) {
      console.error('❌ Error inicializando Google Drive:', error.message);
      throw error;
    }
  }

  async ensureFolder() {
    console.log('📁 Verificando carpeta "LinkedIn Automation"...');
    
    try {
      // Buscar carpeta existente
      const response = await this.drive.files.list({
        q: "name='LinkedIn Automation' and mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id, name)'
      });

      if (response.data.files.length > 0) {
        this.folderId = response.data.files[0].id;
        console.log('✅ Carpeta encontrada:', this.folderId);
      } else {
        // Crear carpeta
        const folderMetadata = {
          name: 'LinkedIn Automation',
          mimeType: 'application/vnd.google-apps.folder'
        };

        const folder = await this.drive.files.create({
          resource: folderMetadata,
          fields: 'id'
        });

        this.folderId = folder.data.id;
        console.log('✅ Carpeta creada:', this.folderId);
      }
    } catch (error) {
      console.error('❌ Error gestionando carpeta:', error.message);
      throw error;
    }
  }

  async createDocument(title, content) {
    console.log(`📄 Creando documento: "${title}"`);
    
    try {
      // Crear documento de texto simple en la carpeta compartida
      const file = await this.drive.files.create({
        requestBody: {
          name: title + '.txt',
          parents: [this.folderId]
        },
        media: {
          mimeType: 'text/plain',
          body: content
        },
        fields: 'id,name,webViewLink'
      });

      const documentId = file.data.id;

      console.log(`✅ Documento creado: ${file.data.webViewLink}`);
      return {
        id: documentId,
        url: file.data.webViewLink,
        title: file.data.name
      };

    } catch (error) {
      console.error(`❌ Error creando documento "${title}":`, error.message);
      throw error;
    }
  }

  async savePostsDocument(posts, date = null) {
    const today = date || new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const title = `Posts LinkedIn ${today}`;
    
    // Formatear contenido para Google Docs
    let content = `POSTS LINKEDIN - ${today}\n`;
    content += '='.repeat(60) + '\n\n';
    
    // Índice
    content += 'ÍNDICE DE CONTENIDO:\n\n';
    const typeStats = {};
    posts.forEach(post => {
      const type = post.type || 'general';
      typeStats[type] = (typeStats[type] || 0) + 1;
    });
    
    Object.entries(typeStats).forEach(([type, count]) => {
      content += `• ${type.charAt(0).toUpperCase() + type.slice(1)}: ${count} posts\n`;
    });
    
    content += `• TOTAL: ${posts.length} posts\n\n`;
    content += '='.repeat(60) + '\n\n';
    
    // Posts individuales
    posts.forEach((post, index) => {
      const postNumber = post.number || (index + 1);
      const postType = post.type || 'general';
      const postSource = post.source || 'Fuente no especificada';
      
      content += `POST #${postNumber} | ${postType.toUpperCase()}\n`;
      content += `Fuente: ${postSource}\n`;
      content += '-'.repeat(50) + '\n';
      content += (post.content || 'Contenido no disponible') + '\n';
      
      if (post.hashtags) {
        content += '\n' + post.hashtags + '\n';
      }
      
      content += '\n' + '='.repeat(30) + '\n\n';
    });

    // Estadísticas finales
    content += 'ESTADÍSTICAS:\n';
    content += `• Total de posts generados: ${posts.length}\n`;
    const totalWords = posts.reduce((sum, post) => sum + (post.wordCount || 0), 0);
    content += `• Total de palabras: ${totalWords.toLocaleString()}\n`;
    const avgWords = Math.round(totalWords / posts.length);
    content += `• Promedio de palabras por post: ${avgWords}\n`;
    content += `• Fecha de generación: ${new Date().toLocaleString('es-ES')}\n`;

    return await this.createDocument(title, content);
  }

  async saveTechSummary(summary, date = null) {
    const today = date || new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const title = `Resumen Tech-IA ${today}`;
    
    // El contenido ya viene formateado del generador
    let content = summary;
    
    // Añadir metadata al final
    content += '\n' + '='.repeat(60) + '\n';
    content += `Generado automáticamente el ${new Date().toLocaleString('es-ES')}\n`;
    content += 'Sistema de automatización LinkedIn - Claude + Playwright\n';

    return await this.createDocument(title, content);
  }

  async saveFallbackFiles(posts, summary) {
    console.log('💾 Guardando archivos fallback localmente...');
    
    try {
      const today = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');

      // Crear directorio fallback si no existe
      const fallbackDir = path.join(process.cwd(), 'fallback');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }

      // Guardar posts
      const postsFile = path.join(fallbackDir, `posts-linkedin-${today}.txt`);
      let postsContent = `POSTS LINKEDIN - ${today}\n`;
      postsContent += '='.repeat(50) + '\n\n';
      
      posts.forEach((post, index) => {
        postsContent += `POST #${index + 1} | ${(post.type || 'general').toUpperCase()}\n`;
        postsContent += `Fuente: ${post.source || 'N/A'}\n`;
        postsContent += '-'.repeat(40) + '\n';
        postsContent += (post.content || 'Contenido no disponible') + '\n';
        if (post.hashtags) {
          postsContent += post.hashtags + '\n';
        }
        postsContent += '\n';
      });

      fs.writeFileSync(postsFile, postsContent, 'utf-8');

      // Guardar resumen
      const summaryFile = path.join(fallbackDir, `resumen-tech-${today}.txt`);
      fs.writeFileSync(summaryFile, summary, 'utf-8');

      console.log('✅ Archivos fallback guardados:');
      console.log(`  📄 Posts: ${postsFile}`);
      console.log(`  📄 Resumen: ${summaryFile}`);

      return {
        postsFile,
        summaryFile
      };

    } catch (error) {
      console.error('❌ Error guardando archivos fallback:', error.message);
      throw error;
    }
  }

  async uploadToGitHubArtifacts(posts, summary) {
    // Esta función se usaría en GitHub Actions para subir artifacts
    const fallbackFiles = await this.saveFallbackFiles(posts, summary);
    
    // En GitHub Actions, estos archivos estarán disponibles como artifacts
    console.log('📦 Archivos preparados para GitHub Actions artifacts');
    
    return fallbackFiles;
  }

  async saveAllContent(posts, summary) {
    console.log('🚀 Intentando guardar en Google Drive...');
    
    try {
      // Primero intentar crear un archivo simple de prueba
      console.log('🧪 Probando crear archivo simple...');
      
      const testContent = 'Archivo de prueba del sistema';
      const testFile = await this.drive.files.create({
        requestBody: {
          name: `test-${Date.now()}.txt`,
          parents: [this.folderId]
        },
        media: {
          mimeType: 'text/plain',
          body: testContent
        }
      });
      
      console.log('✅ Archivo de prueba creado, eliminando...');
      await this.drive.files.delete({
        fileId: testFile.data.id
      });
      
      // Si llegamos aquí, podemos crear archivos
      const results = {};
      
      // Guardar posts
      console.log('📝 Guardando documento de posts...');
      results.postsDoc = await this.savePostsDocument(posts);
      
      // Guardar resumen tech
      console.log('📊 Guardando resumen tech...');
      results.summaryDoc = await this.saveTechSummary(summary);
      
      console.log('✅ Todo el contenido guardado exitosamente en Google Drive');
      console.log(`📄 Posts: ${results.postsDoc.url}`);
      console.log(`📄 Resumen: ${results.summaryDoc.url}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Error guardando en Google Drive:', error.message);
      console.log('🔄 Intentando guardar archivos fallback...');
      
      try {
        const fallbackFiles = await this.saveFallbackFiles(posts, summary);
        console.log('✅ Contenido guardado en archivos fallback');
        return {
          fallback: true,
          files: fallbackFiles,
          error: error.message
        };
      } catch (fallbackError) {
        console.error('❌ Error también en archivos fallback:', fallbackError.message);
        throw new Error(`Error en Drive: ${error.message}. Error en fallback: ${fallbackError.message}`);
      }
    }
  }

  formatPostsForGoogleDocs(posts) {
    // Función auxiliar para formatear posts específicamente para Google Docs
    return posts.map(post => ({
      ...post,
      content: post.content ? post.content.replace(/\n/g, '\n') : '',
      hashtags: post.hashtags || ''
    }));
  }

  async testConnection() {
    console.log('🔧 Probando conexión con Google Drive...');
    
    try {
      const response = await this.drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)'
      });
      
      console.log('✅ Conexión exitosa con Google Drive');
      return true;
    } catch (error) {
      console.error('❌ Error de conexión con Google Drive:', error.message);
      return false;
    }
  }
}

export default GoogleDriveStorage;