import Anthropic from '@anthropic-ai/sdk';
import ImageFinder from './image-finder.js';
import ImageEvaluator from './image-evaluator.js';

const WRITING_STYLES = [
  'directo_impactante', 'conversacional_cercano', 'analista_experto',
  'storyteller_narrativo', 'humor_inteligente', 'visionario_futuro',
  'critico_constructivo', 'educativo_simple', 'provocador_debate', 'optimista_inspirador'
];

const POST_TYPES = [
  { type: 'informativo', count: 40, description: 'Posts informativos con datos concretos' },
  { type: 'opinion', count: 25, description: 'Posts de opinión con postura clara' },
  { type: 'meme', count: 20, description: 'Posts tipo meme/humor tech' },
  { type: 'storytelling', count: 15, description: 'Posts de storytelling o reflexión' }
];

class ContentGenerator {
  constructor(apiKey) {
    this.anthropic = new Anthropic({
      apiKey: apiKey
    });
    this.generatedPosts = [];
    this.newsContent = '';
    this.filteredNews = [];
    
    // Inicializar módulos de imágenes
    this.imageFinder = new ImageFinder();
    this.imageEvaluator = new ImageEvaluator(apiKey);
  }

  async filterRelevantContent(articles) {
    console.log('🔍 Filtrando contenido relevante con Claude...');

    // Preparar el contenido para análisis
    this.newsContent = articles.map((article, index) =>
      `[${index + 1}] ${article.source} - ${article.title}\n${article.content}\nURL: ${article.url}\n---`
    ).join('\n\n');

    const filterPrompt = `Eres un experto curador de contenido tech e IA. Analiza estas noticias del día de hoy y selecciona SOLO las verdaderamente relevantes e importantes.

CRITERIOS DE SELECCIÓN:
- Noticias que impacten el futuro de la tecnología o IA
- Anuncios importantes de productos o empresas tech
- Cambios significativos en el mercado tech
- Innovaciones genuinas (no marketing fluff)
- Noticias que generen conversación en la comunidad tech

DESCARTAR:
- Contenido repetitivo entre fuentes
- Noticias menores o clickbait
- Actualizaciones insignificantes
- Contenido demasiado técnico sin relevancia general

NOTICIAS DEL DÍA:
${this.newsContent}

Responde con un JSON con esta estructura:
{
  "selected_news": [
    {
      "original_index": 1,
      "title": "título original",
      "source": "fuente",
      "url": "url",
      "relevance_reason": "por qué es relevante en 1 línea",
      "key_points": ["punto clave 1", "punto clave 2", "punto clave 3"]
    }
  ],
  "filtering_summary": "resumen de cuántas noticias seleccionaste y por qué"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: filterPrompt }]
      });

      // Limpiar respuesta de Claude (remover markdown si existe)
      let jsonText = response.content[0].text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      const result = JSON.parse(jsonText);
      this.filteredNews = result.selected_news;

      console.log(`✅ Filtrado completado: ${this.filteredNews.length} noticias relevantes seleccionadas`);
      console.log(`📊 ${result.filtering_summary}`);

      return this.filteredNews;
    } catch (error) {
      console.error('❌ Error filtrando contenido:', error.message);
      // Fallback: usar todas las noticias si falla el filtrado
      this.filteredNews = articles.map((article, index) => ({
        original_index: index,
        title: article.title,
        source: article.source,
        url: article.url,
        relevance_reason: 'Noticia del día',
        key_points: [article.title]
      }));
      return this.filteredNews;
    }
  }

  async generatePosts() {
    console.log('🎨 Generando 100 posts para LinkedIn...');

    if (this.filteredNews.length === 0) {
      throw new Error('No hay noticias filtradas para generar posts');
    }

    const newsForPrompt = this.filteredNews.map(news =>
      `• ${news.source}: ${news.title}\n  Relevancia: ${news.relevance_reason}\n  Puntos clave: ${news.key_points.join(', ')}\n  URL: ${news.url}`
    ).join('\n\n');

    const generatePrompt = `Eres un experto creador de contenido para LinkedIn en español. Tu tarea es generar 100 posts únicos y atractivos basados en las noticias tech e IA más relevantes de hoy.

NOTICIAS SELECCIONADAS:
${newsForPrompt}

DISTRIBUCIÓN REQUERIDA:
- 40 posts informativos (datos concretos de las noticias)
- 25 posts de opinión (postura clara, nada de "por un lado... por otro")
- 20 posts tipo meme/humor tech (genuinamente graciosos)
- 15 posts de storytelling/reflexión (narrativa real)

ESTILOS DE ESCRITURA (distribuir entre los 100 posts):
1. Directo e impactante - frases cortas, datos duros
2. Conversacional y cercano - como hablar con un amigo
3. Analista experto - insights profundos pero accesibles
4. Storyteller narrativo - historias que conectan
5. Humor inteligente - referencias actuales, no forzado
6. Visionario del futuro - qué significa esto a largo plazo
7. Crítico constructivo - señalar problemas con soluciones
8. Educativo simple - explicar lo complejo de forma fácil
9. Provocador de debate - preguntas que generen discusión
10. Optimista inspirador - el lado positivo de los cambios

REGLAS DE CALIDAD CRÍTICAS:
- Cada post debe sentirse humano, no de IA
- PROHIBIDO empezar con "En el mundo actual..." o frases corporativas genéricas
- Usar metáforas, analogías, referencias culturales actuales
- Variar estructura: posts cortos (2-3 líneas), listas, preguntas, narrativos largos
- Los memes deben usar referencias culturales españolas/latinoamericanas cuando sea relevante
- Los de opinión deben tener postura clara que genere conversación
- Mezclar uso de emojis: algunos posts con emojis, otros sin ninguno
- Hashtags relevantes al final (3-6 hashtags por post)

FORMATO DE SALIDA:
---
POST #[número] | [TIPO] | Fuente: [URL]
[contenido del post]
[hashtags]
---

IMPORTANTE: 
- Cada post debe basarse en al menos una noticia específica
- Cita la fuente cuando sea relevante
- Los 100 posts deben ser completamente únicos
- Si una noticia es muy relevante, puedes hacer múltiples posts con ángulos diferentes
- El objetivo es que alguien lea 5 posts seguidos y quiera seguir leyendo

Genera los 100 posts ahora:`;

    try {
      console.log('🤖 Enviando prompt a Claude...');

      const response = await this.anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: generatePrompt }]
      });

      const generatedContent = response.content[0].text;

      // Parsear los posts del contenido generado
      this.generatedPosts = this.parseGeneratedPosts(generatedContent);

      console.log(`✅ Generación completada: ${this.generatedPosts.length} posts creados`);

      // Mostrar estadísticas
      this.showGenerationStats();

      // Procesar imágenes para posts seleccionados (criterio ultra-exigente)
      console.log('\n🖼️ Procesando imágenes con criterios ultra-selectivos...');
      await this.processImagesForPosts(this.generatedPosts);

      return this.generatedPosts;

    } catch (error) {
      console.error('❌ Error generando posts:', error.message);

      // Retry con exponential backoff
      console.log('🔄 Reintentando generación...');
      await this.delay(2000);
      return await this.retryGeneration(generatePrompt);
    }
  }

  parseGeneratedPosts(content) {
    const posts = [];
    const postRegex = /---\s*POST\s*#(\d+)\s*\|\s*([^|]+)\s*\|\s*Fuente:\s*([^\n]+)\n([\s\S]*?)(?=---|\n\n#|\n$)/g;

    let match;
    while ((match = postRegex.exec(content)) !== null) {
      const [, number, type, source, fullContent] = match;

      // Separar contenido de hashtags
      const lines = fullContent.trim().split('\n');
      const lastLine = lines[lines.length - 1];

      let postContent = fullContent.trim();
      let hashtags = '';

      if (lastLine.includes('#') && lastLine.match(/#\w+/)) {
        hashtags = lastLine;
        postContent = lines.slice(0, -1).join('\n').trim();
      }

      posts.push({
        number: parseInt(number),
        type: type.trim(),
        source: source.trim(),
        content: postContent,
        hashtags: hashtags,
        wordCount: postContent.split(' ').length
      });
    }

    return posts;
  }

  async retryGeneration(prompt, attempt = 1) {
    if (attempt > 3) {
      throw new Error('Máximo de intentos alcanzado para generar contenido');
    }

    try {
      console.log(`🔄 Intento ${attempt} de generación...`);

      const response = await this.anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      });

      const generatedContent = response.content[0].text;
      this.generatedPosts = this.parseGeneratedPosts(generatedContent);

      console.log(`✅ Generación exitosa en intento ${attempt}: ${this.generatedPosts.length} posts`);
      return this.generatedPosts;

    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error.message);

      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
        await this.delay(delay);
        return await this.retryGeneration(prompt, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  showGenerationStats() {
    console.log('\n📊 Estadísticas de generación:');

    const typeStats = {};
    const styleStats = {};
    let totalWords = 0;

    this.generatedPosts.forEach(post => {
      // Estadísticas por tipo
      typeStats[post.type] = (typeStats[post.type] || 0) + 1;

      // Contar palabras
      totalWords += post.wordCount;
    });

    console.log('\n📈 Posts por tipo:');
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} posts`);
    });

    const avgWords = Math.round(totalWords / this.generatedPosts.length);
    console.log(`\n📝 Promedio de palabras por post: ${avgWords}`);
    console.log(`📊 Total de palabras generadas: ${totalWords.toLocaleString()}`);
  }

  getFormattedPosts() {
    let formatted = `POSTS LINKEDIN - ${new Date().toLocaleDateString('es-ES')}\n`;
    formatted += '='.repeat(50) + '\n\n';

    // Índice
    formatted += 'ÍNDICE:\n';
    const typeStats = {};
    this.generatedPosts.forEach(post => {
      typeStats[post.type] = (typeStats[post.type] || 0) + 1;
    });

    Object.entries(typeStats).forEach(([type, count]) => {
      formatted += `• ${type}: ${count} posts\n`;
    });
    formatted += '\n' + '='.repeat(50) + '\n\n';

    // Posts
    this.generatedPosts.forEach(post => {
      formatted += `POST #${post.number} | ${post.type.toUpperCase()} | Fuente: ${post.source}\n`;
      formatted += '-'.repeat(60) + '\n';
      formatted += post.content + '\n';
      if (post.hashtags) {
        formatted += post.hashtags + '\n';
      }
      formatted += '\n';
    });

    return formatted;
  }

  getTechSummary() {
    let summary = `RESUMEN TECH-IA - ${new Date().toLocaleDateString('es-ES')}\n`;
    summary += '='.repeat(50) + '\n\n';

    // Noticias por categoría
    const categories = {
      'IA': [],
      'Producto': [],
      'Negocios': [],
      'Comunidad': []
    };

    this.filteredNews.forEach(news => {
      // Categorizar automáticamente basado en keywords
      const title = news.title.toLowerCase();
      const points = news.key_points.join(' ').toLowerCase();
      const text = (title + ' ' + points).toLowerCase();

      if (text.includes('ai') || text.includes('artificial intelligence') ||
        text.includes('machine learning') || text.includes('llm') ||
        text.includes('openai') || text.includes('anthropic') || text.includes('deepmind')) {
        categories['IA'].push(news);
      } else if (text.includes('product') || text.includes('launch') ||
        text.includes('feature') || text.includes('update')) {
        categories['Producto'].push(news);
      } else if (text.includes('funding') || text.includes('investment') ||
        text.includes('acquisition') || text.includes('ipo') ||
        text.includes('market') || text.includes('revenue')) {
        categories['Negocios'].push(news);
      } else {
        categories['Comunidad'].push(news);
      }
    });

    Object.entries(categories).forEach(([category, newsList]) => {
      if (newsList.length > 0) {
        summary += `## ${category}\n\n`;
        newsList.forEach(news => {
          summary += `### ${news.title}\n`;
          summary += `**Fuente:** ${news.source}\n`;
          summary += `**Relevancia:** ${news.relevance_reason}\n`;
          summary += `**Puntos clave:** ${news.key_points.join(', ')}\n`;
          summary += `**URL:** ${news.url}\n\n`;
        });
      }
    });

    // Tendencias clave
    summary += `## 🎯 TENDENCIAS CLAVE DEL DÍA\n\n`;
    const trends = this.identifyTrends();
    trends.forEach((trend, index) => {
      summary += `${index + 1}. **${trend.title}**\n   ${trend.description}\n\n`;
    });

    return summary;
  }

  identifyTrends() {
    // Analizar las noticias para identificar tendencias
    const keywords = {};
    const trends = [];

    this.filteredNews.forEach(news => {
      const text = (news.title + ' ' + news.key_points.join(' ')).toLowerCase();

      // Contar menciones de tecnologías clave
      const techKeywords = ['ai', 'artificial intelligence', 'machine learning',
        'llm', 'automation', 'cloud', 'api', 'open source',
        'startup', 'funding', 'acquisition', 'ipo'];

      techKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          keywords[keyword] = (keywords[keyword] || 0) + 1;
        }
      });
    });

    // Generar tendencias basadas en frecuencia
    const sortedKeywords = Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    sortedKeywords.forEach(([keyword, count]) => {
      if (count >= 2) {
        trends.push({
          title: keyword.toUpperCase(),
          description: `Múltiples noticias (${count}) mencionan ${keyword}, indicando alta actividad en esta área`
        });
      }
    });

    // Añadir tendencias generales si no hay suficientes específicas
    if (trends.length < 3) {
      trends.push(
        {
          title: 'INNOVACIÓN CONTINUA',
          description: 'El ecosistema tech mantiene un ritmo acelerado de lanzamientos y actualizaciones'
        },
        {
          title: 'COMPETENCIA IA',
          description: 'Las empresas tech continúan invirtiendo fuertemente en capacidades de inteligencia artificial'
        },
        {
          title: 'DEMOCRATIZACIÓN TECNOLÓGICA',
          description: 'Nuevas herramientas hacen la tecnología más accesible para usuarios no técnicos'
        }
      );
    }

    return trends.slice(0, 3);
  }

  async processImagesForPosts(posts) {
    let postsWithImages = 0;
    let postsEvaluated = 0;
    
    for (const post of posts) {
      // PASO 1: Claude evalúa si el post necesita imagen
      const needsImage = await this.imageEvaluator.evaluatePostForImage(post);
      postsEvaluated++;
      
      if (!needsImage) {
        post.finalImage = null;
        continue;
      }
      
      // PASO 2: Buscar imagen original del artículo relacionado (si existe)
      let finalImage = null;
      const relatedArticle = this.findRelatedArticle(post);
      
      if (relatedArticle && relatedArticle.originalImage) {
        console.log(`🎨 Evaluando imagen original para Post #${post.number}...`);
        const originalEval = await this.imageEvaluator.evaluateOriginalImage(post, relatedArticle.originalImage);
        
        if (originalEval.approved) {
          finalImage = relatedArticle.originalImage;
          console.log(`✅ Post #${post.number}: Imagen original aprobada (${originalEval.score}/10)`);
        }
      }
      
      // PASO 3: Si no hay imagen original aprobada, buscar en APIs
      if (!finalImage) {
        console.log(`🔍 Buscando imágenes externas para Post #${post.number}...`);
        
        const imageOptions = await this.imageFinder.findImageForPost(post.content, post.type, 3);
        
        if (imageOptions.length > 0) {
          const selectionResult = await this.imageEvaluator.evaluateSearchResults(post, imageOptions);
          
          if (selectionResult.approved) {
            finalImage = selectionResult.selectedImage;
            console.log(`✅ Post #${post.number}: Imagen externa aprobada (${finalImage.provider})`);
          } else {
            console.log(`❌ Post #${post.number}: Todas las opciones rechazadas`);
          }
        } else {
          console.log(`⚠️ Post #${post.number}: No se encontraron opciones en APIs`);
        }
      }
      
      // Asignar resultado final
      post.finalImage = finalImage;
      if (finalImage) postsWithImages++;
    }
    
    console.log(`\n📊 Procesamiento de imágenes completado:`);
    console.log(`   🔍 Posts evaluados: ${postsEvaluated}`);
    console.log(`   🖼️ Posts con imagen: ${postsWithImages}`);
    console.log(`   📝 Posts sin imagen: ${postsEvaluated - postsWithImages}`);
    console.log(`   🎯 Ratio de calidad: ${postsWithImages > 0 ? 'SISTEMA ULTRA-SELECTIVO' : 'CRITERIOS MUY ESTRICTOS'}`);
  }

  findRelatedArticle(post) {
    // Intentar encontrar el artículo relacionado basado en la fuente del post
    // Para esta versión simple, retornamos null
    // En el futuro se podría mejorar la asociación post-artículo
    return null;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ContentGenerator;