#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import TechScraper from './src/scraper.js';
import ContentGenerator from './src/generator.js';
import ImageFinder from './src/image-finder.js';
import ImageEvaluator from './src/image-evaluator.js';
import NotionStorage from './src/notion-storage.js';

class CompleteImageTest {
  constructor() {
    this.scraper = null;
    this.generator = null;
    this.imageFinder = null;
    this.imageEvaluator = null;
    this.notionStorage = null;
  }

  async initialize() {
    console.log('🧪 TEST COMPLETO: Scraping + Posts + Imágenes FORZADAS + Notion');
    console.log('='.repeat(70));
    
    // Inicializar todos los módulos
    this.scraper = new TechScraper();
    await this.scraper.initialize();
    
    this.generator = new ContentGenerator(process.env.ANTHROPIC_API_KEY);
    this.imageFinder = new ImageFinder();
    this.imageEvaluator = new ImageEvaluator(process.env.ANTHROPIC_API_KEY);
    
    this.notionStorage = new NotionStorage();
    await this.notionStorage.initialize();
    
    console.log('✅ Todos los módulos inicializados\n');
  }

  async scrapeWithImages() {
    console.log('📰 FASE 1: Scraping con imágenes reales');
    console.log('-'.repeat(40));
    
    try {
      // Scrapear 3 artículos de TechCrunch (alta probabilidad de imágenes)
      const articles = await this.scraper.scrapeSite('techcrunch.com', 3);
      
      console.log(`✅ Scrapeados ${articles.length} artículos:`);
      
      articles.forEach((article, index) => {
        console.log(`\n📄 Artículo ${index + 1}:`);
        console.log(`   Título: ${article.title.substring(0, 60)}...`);
        console.log(`   🖼️ Imagen original: ${article.originalImage ? '✅ SÍ' : '❌ NO'}`);
        if (article.originalImage) {
          console.log(`      URL: ${article.originalImage.url.substring(0, 50)}...`);
          console.log(`      Alt: ${article.originalImage.alt.substring(0, 30)}...`);
        }
      });
      
      return articles;
    } catch (error) {
      console.error('❌ Error en scraping:', error.message);
      throw error;
    }
  }

  async generatePosts(articles) {
    console.log('\n🎨 FASE 2: Generar 3 posts variados');
    console.log('-'.repeat(40));
    
    try {
      const miniPrompt = `Eres un experto creador de contenido para LinkedIn en español. Basado en estas noticias tech, genera exactamente 3 posts únicos:

NOTICIAS:
${articles.map(article => `• ${article.source}: ${article.title}\n  URL: ${article.url}\n  Contenido: ${article.content.substring(0, 150)}...`).join('\n\n')}

DISTRIBUCIÓN:
- 1 post informativo (datos concretos)
- 1 post de opinión (postura clara) 
- 1 post tipo meme/humor tech

FORMATO DE SALIDA:
---
POST #[número] | [TIPO] | Fuente: [URL]
[contenido del post]
[hashtags]
---

Genera los 3 posts ahora:`;

      const response = await this.generator.anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: miniPrompt }]
      });

      const generatedContent = response.content[0].text;
      const posts = this.generator.parseGeneratedPosts(generatedContent);
      
      console.log(`✅ ${posts.length} posts generados:`);
      posts.forEach(post => {
        console.log(`📝 Post #${post.number} (${post.type}): ${post.content.substring(0, 50)}...`);
      });
      
      return posts;
    } catch (error) {
      console.error('❌ Error en generación:', error.message);
      throw error;
    }
  }

  async forceImagesForPosts(posts, articles) {
    console.log('\n🖼️ FASE 3: FORZAR imágenes para TODOS los posts');
    console.log('-'.repeat(40));
    
    const finalPosts = [];
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const article = articles[i] || articles[0];
      
      console.log(`\n🔍 Procesando Post #${post.number} (${post.type}) - IMAGEN FORZADA`);
      
      let finalImage = null;
      let imageSource = '';
      
      // OPCIÓN 1: Usar imagen original si existe y pasa evaluación básica
      if (article.originalImage) {
        console.log('🎨 Evaluando imagen original...');
        const originalEval = await this.imageEvaluator.evaluateOriginalImage(post, article.originalImage);
        
        if (originalEval.score >= 6) { // Criterio más permisivo para el test
          finalImage = article.originalImage;
          imageSource = `Original (${originalEval.score}/10)`;
          console.log(`✅ Imagen original ACEPTADA (${originalEval.score}/10)`);
        } else {
          console.log(`❌ Imagen original rechazada (${originalEval.score}/10)`);
        }
      }
      
      // OPCIÓN 2: Si no hay imagen original o no pasa, buscar en APIs
      if (!finalImage) {
        console.log('🔍 Buscando imágenes en APIs (criterio PERMISIVO para test)...');
        
        const imageOptions = await this.imageFinder.findImageForPost(post.content, post.type, 9); // Más opciones
        console.log(`📸 Encontradas ${imageOptions.length} opciones de APIs`);
        
        if (imageOptions.length > 0) {
          // FORZAR: Tomar la mejor imagen disponible (sin Claude ultra-exigente)
          const bestImage = imageOptions
            .sort((a, b) => b.quality - a.quality)[0]; // La de mayor calidad técnica
          
          finalImage = bestImage;
          imageSource = `${bestImage.provider} (${bestImage.quality}/10 técnica)`;
          console.log(`🎯 FORZADA imagen de ${bestImage.provider} (${bestImage.quality}/10)`);
        }
      }
      
      // OPCIÓN 3: Si aún no hay imagen, generar una búsqueda más genérica
      if (!finalImage) {
        console.log('🆘 Búsqueda genérica como último recurso...');
        
        const genericImages = await this.imageFinder.findImageForPost('technology business', 'informativo', 5);
        if (genericImages.length > 0) {
          finalImage = genericImages[0];
          imageSource = `${genericImages[0].provider} (genérica)`;
          console.log(`🎯 Imagen genérica FORZADA de ${genericImages[0].provider}`);
        }
      }
      
      // Agregar al resultado final
      finalPosts.push({
        ...post,
        finalImage,
        imageSource,
        hasImage: !!finalImage,
        originalImageUrl: article.originalImage?.url || null
      });
      
      console.log(`${finalImage ? '🖼️' : '📝'} Post #${post.number}: ${finalImage ? 'CON imagen' : 'SIN imagen'} (${imageSource || 'ninguna encontrada'})`);
    }
    
    return finalPosts;
  }

  async saveToNotion(posts) {
    console.log('\n💾 FASE 4: Guardando en Notion con URLs de imágenes');
    console.log('-'.repeat(40));
    
    try {
      // Los posts ya tienen la propiedad finalImage, Notion storage los manejará automáticamente
      const result = await this.notionStorage.savePostsToNotion(posts);
      
      console.log('✅ Posts guardados en Notion CON imágenes:');
      console.log(`📊 Éxito: ${result.success}/${result.total} posts`);
      console.log(`🔗 Ver en: ${result.url}`);
      
      // Mostrar detalles de las imágenes guardadas
      posts.forEach(post => {
        if (post.finalImage) {
          console.log(`📄 Post #${post.number}: ${post.finalImage.url.substring(0, 50)}... (${post.imageSource})`);
        } else {
          console.log(`📄 Post #${post.number}: Sin imagen`);
        }
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error guardando en Notion:', error.message);
      throw error;
    }
  }

  async runFullTest() {
    try {
      await this.initialize();
      
      // Ejecutar pipeline completo
      const articles = await this.scrapeWithImages();
      const posts = await this.generatePosts(articles);
      const postsWithImages = await this.forceImagesForPosts(posts, articles);
      const notionResult = await this.saveToNotion(postsWithImages);
      
      // Resumen final
      console.log('\n📊 RESUMEN FINAL');
      console.log('='.repeat(50));
      
      const withImages = postsWithImages.filter(p => p.hasImage).length;
      const withoutImages = postsWithImages.filter(p => !p.hasImage).length;
      
      console.log(`📈 ESTADÍSTICAS:`);
      console.log(`   📄 Posts generados: ${postsWithImages.length}`);
      console.log(`   🖼️ Posts con imagen: ${withImages}`);
      console.log(`   📝 Posts sin imagen: ${withoutImages}`);
      console.log(`   💾 Guardados en Notion: ${notionResult.success}`);
      
      console.log(`\n🎯 DISTRIBUCIÓN DE IMÁGENES:`);
      postsWithImages.forEach(post => {
        console.log(`   Post #${post.number} (${post.type}): ${post.hasImage ? '🖼️ ' + post.imageSource : '📝 Sin imagen'}`);
      });
      
      console.log('\n🎉 TEST COMPLETO FINALIZADO');
      
    } catch (error) {
      console.error('\n💥 TEST FALLÓ:', error.message);
    } finally {
      if (this.scraper) {
        await this.scraper.close();
      }
    }
  }
}

// Ejecutar test
const test = new CompleteImageTest();
test.runFullTest();