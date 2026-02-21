import { Octokit } from '@octokit/rest';

class GistStorage {
  constructor() {
    this.octokit = null;
  }

  async initialize() {
    console.log('🔐 Inicializando GitHub Gists...');

    try {
      const token = process.env.GH_TOKEN;
      if (!token) {
        throw new Error('Variable de entorno GH_TOKEN no encontrada');
      }

      this.octokit = new Octokit({
        auth: token
      });

      // Test the connection
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      console.log(`✅ Conectado a GitHub como: ${user.login}`);

      return true;
    } catch (error) {
      console.error('❌ Error inicializando GitHub:', error.message);
      throw error;
    }
  }

  async createGist(title, content, isPublic = false) {
    console.log(`📄 Creando Gist: "${title}"`);

    try {
      const filename = title.replace(/[^a-zA-Z0-9\-_\s]/g, '') + '.txt';

      const gist = await this.octokit.rest.gists.create({
        description: `LinkedIn Content - ${title}`,
        public: isPublic,
        files: {
          [filename]: {
            content: content
          }
        }
      });

      const gistData = {
        id: gist.data.id,
        url: gist.data.html_url,
        rawUrl: gist.data.files[filename].raw_url,
        title: title,
        filename: filename
      };

      console.log(`✅ Gist creado: ${gistData.url}`);
      return gistData;

    } catch (error) {
      console.error(`❌ Error creando Gist "${title}":`, error.message);
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

    // Formatear contenido
    let content = `# 📝 POSTS LINKEDIN - ${today}\n\n`;
    content += `> Generado automáticamente el ${new Date().toLocaleString('es-ES')}\n\n`;
    content += `---\n\n`;

    // Índice
    content += `## 📊 RESUMEN\n\n`;
    const typeStats = {};
    posts.forEach(post => {
      const type = post.type || 'general';
      typeStats[type] = (typeStats[type] || 0) + 1;
    });

    Object.entries(typeStats).forEach(([type, count]) => {
      content += `- **${type.charAt(0).toUpperCase() + type.slice(1)}**: ${count} posts\n`;
    });

    content += `- **TOTAL**: ${posts.length} posts\n\n`;
    content += `---\n\n`;

    // Posts individuales
    posts.forEach((post, index) => {
      const postNumber = post.number || (index + 1);
      const postType = post.type || 'general';
      const postSource = post.source || 'Fuente no especificada';

      content += `## POST #${postNumber} | ${postType.toUpperCase()}\n\n`;
      content += `**Fuente:** ${postSource}\n\n`;
      content += `${post.content || 'Contenido no disponible'}\n\n`;

      if (post.hashtags) {
        content += `${post.hashtags}\n\n`;
      }

      content += `---\n\n`;
    });

    // Estadísticas finales
    content += `## 📈 ESTADÍSTICAS\n\n`;
    content += `- **Posts generados**: ${posts.length}\n`;
    const totalWords = posts.reduce((sum, post) => sum + (post.wordCount || 0), 0);
    content += `- **Total palabras**: ${totalWords.toLocaleString()}\n`;
    const avgWords = Math.round(totalWords / posts.length);
    content += `- **Promedio palabras/post**: ${avgWords}\n`;
    content += `- **Generado**: ${new Date().toLocaleString('es-ES')}\n\n`;

    return await this.createGist(title, content, false);
  }

  async saveTechSummary(summary, date = null) {
    const today = date || new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const title = `Resumen Tech-IA ${today}`;

    // Convertir a Markdown si no lo está ya
    let content = `# 🔬 RESUMEN TECH-IA - ${today}\n\n`;
    content += `> Análisis automático de las noticias más relevantes del día\n\n`;
    content += `---\n\n`;

    // El summary ya viene formateado del generador, solo añadir markdown
    content += summary.replace(/^## /gm, '### ').replace(/^# /gm, '## ');

    // Añadir metadata al final
    content += `\n---\n\n`;
    content += `**Generado:** ${new Date().toLocaleString('es-ES')}  \n`;
    content += `**Sistema:** LinkedIn Automation - Claude + Playwright  \n`;

    return await this.createGist(title, content, false);
  }

  async saveAllContent(posts, summary) {
    console.log('🚀 Guardando contenido en GitHub Gists...');

    try {
      const results = {};

      // Guardar posts
      console.log('📝 Creando Gist de posts...');
      results.postsGist = await this.savePostsDocument(posts);

      // Guardar resumen tech
      console.log('📊 Creando Gist de resumen...');
      results.summaryGist = await this.saveTechSummary(summary);

      console.log('✅ Todo el contenido guardado exitosamente en GitHub Gists');
      console.log(`\n🔗 **ENLACES DIRECTOS:**`);
      console.log(`📝 Posts LinkedIn: ${results.postsGist.url}`);
      console.log(`📊 Resumen Tech: ${results.summaryGist.url}`);

      // URLs para leer rápido (raw)
      console.log(`\n📖 **ENLACES DE LECTURA RÁPIDA:**`);
      console.log(`📝 Posts (raw): ${results.postsGist.rawUrl}`);
      console.log(`📊 Resumen (raw): ${results.summaryGist.rawUrl}`);

      return results;

    } catch (error) {
      console.error('❌ Error guardando en GitHub Gists:', error.message);
      throw error;
    }
  }

  async listRecentGists(limit = 10) {
    try {
      const gists = await this.octokit.rest.gists.list({
        per_page: limit
      });

      console.log(`📋 Últimos ${gists.data.length} Gists:`);
      gists.data.forEach((gist, index) => {
        const date = new Date(gist.created_at).toLocaleDateString('es-ES');
        console.log(`  ${index + 1}. ${gist.description || 'Sin título'} (${date})`);
        console.log(`     🔗 ${gist.html_url}`);
      });

      return gists.data;
    } catch (error) {
      console.error('❌ Error listando Gists:', error.message);
      return [];
    }
  }

  async testConnection() {
    console.log('🔧 Probando conexión con GitHub...');

    try {
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      console.log(`✅ Conexión exitosa: ${user.login}`);
      console.log(`📊 Gists públicos: ${user.public_gists}`);
      console.log(`📊 Repositorios públicos: ${user.public_repos}`);

      return true;
    } catch (error) {
      console.error('❌ Error de conexión:', error.message);
      return false;
    }
  }
}

export default GistStorage;