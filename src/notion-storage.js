import { Client } from '@notionhq/client';
import fs from 'fs/promises';
import path from 'path';

class NotionStorage {
  constructor() {
    this.notion = null;
    this.databaseId = null;
    this.initialized = false;
  }

  async initialize() {
    console.log('🔧 Inicializando Notion Storage...');
    
    // Verificar variables de entorno
    const notionToken = process.env.NOTION_API_TOKEN;
    this.databaseId = process.env.NOTION_DATABASE_ID;
    
    if (!notionToken) {
      throw new Error('❌ NOTION_API_TOKEN no encontrado en variables de entorno');
    }
    
    if (!this.databaseId) {
      throw new Error('❌ NOTION_DATABASE_ID no encontrado en variables de entorno');
    }

    // Inicializar cliente Notion
    this.notion = new Client({
      auth: notionToken,
    });

    // Verificar conectividad
    await this.testConnection();
    
    this.initialized = true;
    console.log('✅ Notion Storage inicializado correctamente');
  }

  async testConnection() {
    try {
      const response = await this.notion.databases.retrieve({
        database_id: this.databaseId,
      });
      
      console.log(`✅ Conexión exitosa con database: ${response.title[0]?.plain_text || 'LinkedIn Content'}`);
      return true;
    } catch (error) {
      console.error('❌ Error conectando con Notion:', error.message);
      throw new Error(`No se pudo conectar con la database de Notion: ${error.message}`);
    }
  }

  async savePostsToNotion(posts) {
    if (!this.initialized) {
      throw new Error('Notion Storage no está inicializado');
    }

    console.log(`📝 Guardando ${posts.length} posts en Notion...`);
    
    const today = new Date().toISOString().split('T')[0];
    let successCount = 0;
    const errors = [];

    // Procesar posts en lotes para no saturar la API
    const batchSize = 5;
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (post) => {
        try {
          await this.createPostPage(post, today);
          successCount++;
        } catch (error) {
          errors.push({ post: post.number, error: error.message });
          console.error(`❌ Error guardando post #${post.number}:`, error.message);
        }
      });

      await Promise.all(batchPromises);
      
      // Pequeña pausa entre lotes
      if (i + batchSize < posts.length) {
        await this.delay(500);
      }
    }

    console.log(`✅ Posts guardados en Notion: ${successCount}/${posts.length}`);
    if (errors.length > 0) {
      console.warn(`⚠️ Errores encontrados: ${errors.length}`);
    }

    return {
      success: successCount,
      total: posts.length,
      errors: errors,
      url: `https://notion.so/${this.databaseId.replace(/-/g, '')}`
    };
  }

  async createPostPage(post, date) {
    // Crear título descriptivo para la página
    const postTitle = `Post #${post.number} - ${post.type} - ${new Date(date).toLocaleDateString('es-ES')}`;
    
    const properties = {
      'Title': {
        title: [
          {
            text: {
              content: this.truncateText(postTitle, 100) // Títulos más cortos
            }
          }
        ]
      },
      'Post Number': {
        number: post.number
      },
      'Content': {
        rich_text: [
          {
            text: {
              content: this.truncateText(post.content, 2000) // Notion limit
            }
          }
        ]
      },
      'Type': {
        select: {
          name: post.type.toLowerCase()
        }
      },
      'Date': {
        date: {
          start: date
        }
      },
      'Has Image': {
        checkbox: !!post.finalImage // True si tiene imagen
      },
      'Source': {
        rich_text: [
          {
            text: {
              content: post.source || 'Generated Content'
            }
          }
        ]
      }
    };

    // Agregar hashtags si existen
    if (post.hashtags) {
      properties['Hashtags'] = {
        rich_text: [
          {
            text: {
              content: post.hashtags
            }
          }
        ]
      };
    }

    // Agregar URL de imagen si existe
    if (post.finalImage && post.finalImage.url) {
      properties['Image URL'] = {
        url: post.finalImage.url
      };
    }

    // No agregar Image Info - no lo necesitamos

    return await this.notion.pages.create({
      parent: {
        database_id: this.databaseId,
      },
      properties: properties,
    });
  }

  async saveTechSummary(techSummary) {
    console.log('📊 Guardando resumen tech en Notion...');
    
    const today = new Date().toISOString().split('T')[0];
    const summaryTitle = `Resumen Tech-IA - ${new Date().toLocaleDateString('es-ES')}`;
    
    try {
      // Crear página separada para el resumen
      const summaryPage = await this.notion.pages.create({
        parent: {
          database_id: this.databaseId,
        },
        properties: {
          'Title': {
            title: [
              {
                text: {
                  content: summaryTitle
                }
              }
            ]
          },
          'Post Number': {
            number: 999 // Número especial para el resumen
          },
          'Content': {
            rich_text: [
              {
                text: {
                  content: this.truncateText(techSummary, 2000)
                }
              }
            ]
          },
          'Type': {
            select: {
              name: 'resumen'
            }
          },
          'Date': {
            date: {
              start: today
            }
          },
          'Has Image': {
            checkbox: false // Los resúmenes no tienen imagen
          },
          'Source': {
            rich_text: [
              {
                text: {
                  content: 'Tech Summary'
                }
              }
            ]
          }
        }
      });

      console.log('✅ Resumen tech guardado en Notion');
      return summaryPage;
    } catch (error) {
      console.error('❌ Error guardando resumen tech:', error.message);
      throw error;
    }
  }

  async saveAllContent(posts, techSummary) {
    try {
      const [postsResult, summaryResult] = await Promise.all([
        this.savePostsToNotion(posts),
        this.saveTechSummary(techSummary)
      ]);

      return {
        posts: postsResult,
        summary: summaryResult,
        notionUrl: postsResult.url
      };
    } catch (error) {
      console.error('❌ Error guardando contenido en Notion:', error.message);
      throw error;
    }
  }

  // Utility methods
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Backup methods (mantener compatibilidad con sistema existente)
  async saveFallbackFiles(posts, techSummary) {
    const timestamp = new Date().toISOString().split('T')[0];
    const fallbackDir = path.join(process.cwd(), 'fallback');
    
    // Asegurar que existe el directorio fallback
    try {
      await fs.access(fallbackDir);
    } catch {
      await fs.mkdir(fallbackDir, { recursive: true });
    }

    const postsFile = path.join(fallbackDir, `posts-linkedin-${timestamp}.txt`);
    const summaryFile = path.join(fallbackDir, `resumen-tech-${timestamp}.txt`);

    const formattedPosts = this.formatPostsForFile(posts);
    
    await Promise.all([
      fs.writeFile(postsFile, formattedPosts, 'utf-8'),
      fs.writeFile(summaryFile, techSummary, 'utf-8')
    ]);

    return {
      postsFile,
      summaryFile
    };
  }

  formatPostsForFile(posts) {
    let formatted = `POSTS LINKEDIN - ${new Date().toLocaleDateString('es-ES')}\n`;
    formatted += '='.repeat(50) + '\n\n';

    posts.forEach(post => {
      formatted += `POST #${post.number} | ${post.type.toUpperCase()}\n`;
      formatted += '-'.repeat(40) + '\n';
      formatted += post.content + '\n';
      if (post.hashtags) {
        formatted += post.hashtags + '\n';
      }
      formatted += '\n';
    });

    return formatted;
  }
}

export default NotionStorage;