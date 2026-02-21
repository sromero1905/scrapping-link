#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import TechScraper from './src/scraper.js';
import ContentGenerator from './src/generator.js';
import ImageFinder from './src/image-finder.js';
import ImageEvaluator from './src/image-evaluator.js';

class ImageSystemTest {
  constructor() {
    this.scraper = null;
    this.generator = null;
    this.imageFinder = null;
    this.imageEvaluator = null;
  }

  async initialize() {
    console.log('🧪 TEST: Sistema Completo de Imágenes de Alta Calidad');
    console.log('='.repeat(60));
    
    // Inicializar módulos
    this.scraper = new TechScraper();
    await this.scraper.initialize();
    
    this.generator = new ContentGenerator(process.env.ANTHROPIC_API_KEY);
    this.imageFinder = new ImageFinder();
    this.imageEvaluator = new ImageEvaluator(process.env.ANTHROPIC_API_KEY);
    
    console.log('✅ Módulos inicializados\n');
  }

  async testScrapeWithImages() {
    console.log('📰 FASE 1: Scraping con captura de imágenes');
    console.log('-'.repeat(40));
    
    try {
      // Scrapear solo 2 artículos de TechCrunch (más probable que tengan imágenes)
      const articles = await this.scraper.scrapeSite('techcrunch.com', 2);
      
      console.log(`✅ Scraping completado: ${articles.length} artículos`);
      
      articles.forEach((article, index) => {
        console.log(`\n📄 Artículo ${index + 1}:`);
        console.log(`   Título: ${article.title.substring(0, 60)}...`);
        console.log(`   🖼️ Imagen original: ${article.originalImage ? '✅ SÍ' : '❌ NO'}`);
        if (article.originalImage) {
          console.log(`      URL: ${article.originalImage.url.substring(0, 60)}...`);
          console.log(`      Alt: ${article.originalImage.alt.substring(0, 40)}...`);
        }
      });
      
      return articles;
    } catch (error) {
      console.error('❌ Error en scraping:', error.message);
      throw error;
    }
  }

  async testGeneratePosts(articles) {
    console.log('\n🎨 FASE 2: Generación de posts (solo 2 para test)');
    console.log('-'.repeat(40));
    
    try {
      // Generar solo 2 posts para test rápido
      const miniPrompt = `Eres un experto creador de contenido para LinkedIn en español. Basado en estas noticias tech, genera exactamente 2 posts únicos y atractivos:

NOTICIAS:
${articles.map(article => `• ${article.source}: ${article.title}\n  URL: ${article.url}\n  Contenido: ${article.content.substring(0, 200)}...`).join('\n\n')}

DISTRIBUCIÓN:
- 1 post informativo 
- 1 post de opinión

FORMATO DE SALIDA:
---
POST #[número] | [TIPO] | Fuente: [URL]
[contenido del post]
[hashtags]
---

Genera los 2 posts ahora:`;

      const response = await this.generator.anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: miniPrompt }]
      });

      const generatedContent = response.content[0].text;
      const posts = this.generator.parseGeneratedPosts(generatedContent);
      
      console.log(`✅ ${posts.length} posts generados para test de imágenes`);
      
      return posts;
    } catch (error) {
      console.error('❌ Error en generación:', error.message);
      throw error;
    }
  }

  async testImageSystem(posts, articles) {
    console.log('\n🖼️ FASE 3: Sistema de Imágenes de Alta Calidad');
    console.log('-'.repeat(40));
    
    const finalPosts = [];
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const article = articles[i] || articles[0]; // Asociar artículo
      
      console.log(`\n🔍 Procesando Post #${post.number} (${post.type})`);
      console.log(`Contenido: ${post.content.substring(0, 80)}...`);
      
      // PASO 1: ¿Este post necesita imagen?
      const needsImage = await this.imageEvaluator.evaluatePostForImage(post);
      
      if (!needsImage) {
        console.log('📝 Post finalizado SIN imagen (Claude decidió que no la necesita)');
        finalPosts.push({
          ...post,
          finalImage: null,
          imageDecision: 'No necesita imagen'
        });
        continue;
      }
      
      // PASO 2: ¿El artículo original tiene imagen de calidad?
      let finalImage = null;
      let imageDecision = '';
      
      if (article.originalImage) {
        console.log('🎨 Evaluando imagen original del artículo...');
        const originalEvaluation = await this.imageEvaluator.evaluateOriginalImage(post, article.originalImage);
        
        if (originalEvaluation.approved) {
          finalImage = article.originalImage;
          imageDecision = `Imagen original aprobada (${originalEvaluation.score}/10)`;
          console.log('✅ Imagen original APROBADA - Post completado');
        } else {
          console.log('❌ Imagen original RECHAZADA - Buscando alternativas...');
        }
      }
      
      // PASO 3: Si no hay imagen aprobada, buscar en APIs
      if (!finalImage) {
        console.log('🔍 Buscando imágenes en APIs externas...');
        
        // Generar keywords específicos con IA
        const aiKeywords = await this.imageEvaluator.generateImageKeywords(post);
        const imageOptions = await this.imageFinder.findImageForPost(post.content, post.type, 3);
        
        if (imageOptions.length > 0) {
          console.log(`📸 Encontradas ${imageOptions.length} opciones, evaluando calidad...`);
          
          // Claude evalúa y selecciona la mejor opción
          const selectionResult = await this.imageEvaluator.evaluateSearchResults(post, imageOptions);
          
          if (selectionResult.approved) {
            finalImage = selectionResult.selectedImage;
            imageDecision = `Imagen de ${selectionResult.selectedImage.provider} seleccionada`;
            console.log('✅ Imagen externa APROBADA - Post completado');
          } else {
            imageDecision = 'Todas las opciones rechazadas - Calidad insuficiente';
            console.log('❌ Todas las opciones RECHAZADAS - Post sin imagen');
          }
        } else {
          imageDecision = 'No se encontraron opciones en APIs';
          console.log('❌ No se encontraron imágenes en APIs - Post sin imagen');
        }
      }
      
      // Resultado final
      finalPosts.push({
        ...post,
        finalImage,
        imageDecision,
        originalImageUrl: article.originalImage?.url || null
      });
      
      console.log(`${finalImage ? '🖼️' : '📝'} Post #${post.number} finalizado ${finalImage ? 'CON' : 'SIN'} imagen`);
    }
    
    return finalPosts;
  }

  async runFullTest() {
    try {
      await this.initialize();
      
      // Test completo del sistema
      const articles = await this.testScrapeWithImages();
      const posts = await this.testGeneratePosts(articles);
      const finalPosts = await this.testImageSystem(posts, articles);
      
      // Resumen final
      console.log('\n📊 RESUMEN FINAL DEL TEST');
      console.log('='.repeat(50));
      
      let withImages = 0;
      let withoutImages = 0;
      
      finalPosts.forEach(post => {
        console.log(`\n📄 Post #${post.number} (${post.type}):`);
        console.log(`   Contenido: ${post.content.substring(0, 60)}...`);
        console.log(`   🖼️ Imagen: ${post.finalImage ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   📋 Decisión: ${post.imageDecision}`);
        
        if (post.finalImage) {
          console.log(`      Fuente: ${post.finalImage.provider || 'original'}`);
          console.log(`      URL: ${post.finalImage.url.substring(0, 50)}...`);
          withImages++;
        } else {
          withoutImages++;
        }
      });
      
      console.log(`\n🎯 ESTADÍSTICAS:`);
      console.log(`   📊 Posts con imagen: ${withImages}/${finalPosts.length}`);
      console.log(`   📝 Posts sin imagen: ${withoutImages}/${finalPosts.length}`);
      console.log(`   🎨 Ratio de calidad: ${withImages > 0 ? 'SISTEMA FUNCIONANDO' : 'MUY SELECTIVO'}`);
      
      console.log('\n🎉 TEST DEL SISTEMA DE IMÁGENES COMPLETADO');
      
    } catch (error) {
      console.error('\n💥 TEST FALLÓ:', error.message);
    } finally {
      if (this.scraper) {
        await this.scraper.close();
      }
    }
  }

  // Test solo de APIs (sin scraping)
  async testAPIsOnly() {
    try {
      await this.initialize();
      
      console.log('🔍 TEST RÁPIDO: Solo APIs de imágenes');
      console.log('-'.repeat(40));
      
      // Post de prueba
      const testPost = {
        number: 1,
        type: 'informativo',
        content: 'La nueva actualización de ChatGPT incluye capacidades de análisis de imágenes avanzadas que revolucionarán la forma en que interactuamos con la IA visual.'
      };
      
      console.log('📝 Post de prueba:', testPost.content.substring(0, 80) + '...');
      
      // Buscar imágenes
      const images = await this.imageFinder.findImageForPost(testPost.content, testPost.type, 3);
      
      console.log(`\n📸 Encontradas ${images.length} imágenes:`);
      images.forEach((img, index) => {
        console.log(`   ${index + 1}. ${img.provider} - ${img.quality}/10 - ${img.url.substring(0, 50)}...`);
      });
      
      // Evaluar con Claude
      if (images.length > 0) {
        const evaluation = await this.imageEvaluator.evaluateSearchResults(testPost, images);
        console.log(`\n🎨 Evaluación Claude: ${evaluation.approved ? '✅ APROBADA' : '❌ RECHAZADA'}`);
        if (evaluation.selectedImage) {
          console.log(`   Seleccionada: ${evaluation.selectedImage.provider} - ${evaluation.selectedImage.url.substring(0, 50)}...`);
        }
      }
      
    } catch (error) {
      console.error('💥 ERROR:', error.message);
    } finally {
      if (this.scraper) {
        await this.scraper.close();
      }
    }
  }
}

// Ejecutar según argumentos
const testType = process.argv[2] || 'full';

const test = new ImageSystemTest();

if (testType === 'apis') {
  test.testAPIsOnly();
} else {
  test.runFullTest();
}