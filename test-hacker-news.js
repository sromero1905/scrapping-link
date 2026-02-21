#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import TechScraper from './src/scraper.js';
import ContentGenerator from './src/generator.js';
import NotionStorage from './src/notion-storage.js';

class QuickScrapeTest {
  constructor() {
    this.scraper = null;
    this.generator = null;
    this.notionStorage = null;
  }

  async initialize() {
    console.log('🧪 TEST: Scraping TechCrunch + Claude + Notion');
    console.log('='.repeat(50));
    
    // Inicializar módulos
    this.scraper = new TechScraper();
    await this.scraper.initialize();
    
    this.generator = new ContentGenerator(process.env.ANTHROPIC_API_KEY);
    
    this.notionStorage = new NotionStorage();
    await this.notionStorage.initialize();
    
    console.log('✅ Módulos inicializados\n');
  }

  async testScrapingOnly() {
    console.log('📰 FASE 1: Scraping TechCrunch (más confiable para test)');
    console.log('-'.repeat(30));
    
    try {
      // Usar TechCrunch en lugar de Hacker News para test más confiable
      const articles = await this.scraper.scrapeSite('techcrunch.com', 3);
      
      console.log(`✅ Scraping completado: ${articles.length} artículos`);
      
      articles.forEach((article, index) => {
        console.log(`\n📄 Artículo ${index + 1}:`);
        console.log(`   Título: ${article.title.substring(0, 80)}...`);
        console.log(`   URL: ${article.url}`);
        console.log(`   Fecha: ${article.publishedDate || 'No detectada'}`);
      });
      
      return articles;
    } catch (error) {
      console.error('❌ Error en scraping:', error.message);
      throw error;
    }
  }

  async testContentGeneration(articles) {
    console.log('\n🎨 FASE 2: Generación de contenido (mini versión)');
    console.log('-'.repeat(30));
    
    try {
      // Para el test, saltamos el filtrado y generamos directamente
      console.log(`✅ Usando ${articles.length} artículos para generar posts`);
      
      // Generar solo 3 posts en lugar de 100 (test rápido)
      const miniPrompt = `Eres un experto creador de contenido para LinkedIn en español. Basado en estas noticias tech, genera exactamente 3 posts únicos y atractivos:

NOTICIAS:
${articles.map(article => `• ${article.source}: ${article.title}\n  URL: ${article.url}\n  Contenido: ${article.content.substring(0, 150)}...`).join('\n\n')}

DISTRIBUCIÓN REQUERIDA:
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
        max_tokens: 3000,
        messages: [{ role: 'user', content: miniPrompt }]
      });

      const generatedContent = response.content[0].text;
      const posts = this.generator.parseGeneratedPosts(generatedContent);
      
      console.log(`✅ ${posts.length} posts generados para test`);
      
      // Mostrar posts generados
      posts.forEach(post => {
        console.log(`\n📝 POST #${post.number} (${post.type}):`);
        console.log(post.content.substring(0, 100) + '...');
      });
      
      return posts;
    } catch (error) {
      console.error('❌ Error en generación:', error.message);
      throw error;
    }
  }

  async testNotionStorage(posts) {
    console.log('\n🗂️ FASE 3: Test guardado en Notion');
    console.log('-'.repeat(30));
    
    try {
      // Guardar solo posts, sin resumen técnico para el test
      const result = await this.notionStorage.savePostsToNotion(posts);
      
      console.log('✅ Posts guardados en Notion exitosamente');
      console.log(`📊 Éxito: ${result.success}/${result.total} posts`);
      
      if (result.errors.length > 0) {
        console.log('⚠️ Errores encontrados:');
        result.errors.forEach(err => {
          console.log(`   Post #${err.post}: ${err.error}`);
        });
      }
      
      console.log(`🔗 Ver en Notion: ${result.url}`);
      
      return result;
    } catch (error) {
      console.error('❌ Error en Notion:', error.message);
      throw error;
    }
  }

  async runFullTest() {
    try {
      await this.initialize();
      
      // Ejecutar test completo
      const articles = await this.testScrapingOnly();
      const posts = await this.testContentGeneration(articles);
      const notionResult = await this.testNotionStorage(posts);
      
      console.log('\n🎉 TEST COMPLETADO EXITOSAMENTE');
      console.log(`📊 Resultados: ${articles.length} artículos → ${posts.length} posts → ${notionResult.success} guardados`);
      
    } catch (error) {
      console.error('\n💥 TEST FALLÓ:', error.message);
    } finally {
      if (this.scraper) {
        await this.scraper.close();
      }
    }
  }

  // Método para ejecutar solo scraping (más rápido)
  async runScrapingTest() {
    try {
      await this.initialize();
      const articles = await this.testScrapingOnly();
      console.log('\n✅ TEST DE SCRAPING COMPLETADO');
    } catch (error) {
      console.error('\n💥 SCRAPING FALLÓ:', error.message);
    } finally {
      if (this.scraper) {
        await this.scraper.close();
      }
    }
  }
}

// Ejecutar según argumentos
const testType = process.argv[2] || 'full';

const test = new QuickScrapeTest();

if (testType === 'scraping') {
  test.runScrapingTest();
} else {
  test.runFullTest();
}