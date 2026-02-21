#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import TechScraper from './src/scraper.js';
import ContentGenerator from './src/generator.js';
import GistStorage from './src/gist-storage.js';
import NotionStorage from './src/notion-storage.js';

class LinkedInAutomation {
  constructor() {
    this.scraper = null;
    this.generator = null;
    this.gistStorage = null;
    this.notionStorage = null;
    this.stats = {
      startTime: null,
      endTime: null,
      articlesScraped: 0,
      postsGenerated: 0,
      documentsCreated: 0,
      errors: []
    };
  }

  async initialize() {
    console.log('🤖 Iniciando Sistema de Automatización LinkedIn');
    console.log('='.repeat(60));
    console.log(`📅 Fecha: ${new Date().toLocaleDateString('es-ES')}`);
    console.log(`⏰ Hora: ${new Date().toLocaleTimeString('es-ES')}`);
    console.log('='.repeat(60));

    this.stats.startTime = new Date();

    // Verificar variables de entorno
    this.validateEnvironment();

    // Inicializar módulos
    console.log('\n🔧 Inicializando módulos...');

    this.scraper = new TechScraper();
    await this.scraper.initialize();

    this.generator = new ContentGenerator(process.env.ANTHROPIC_API_KEY);

    // Inicializar almacenamiento dual: Notion (principal) + Gists (backup)
    this.notionStorage = new NotionStorage();
    await this.notionStorage.initialize();

    this.gistStorage = new GistStorage();
    await this.gistStorage.initialize();

    console.log('✅ Todos los módulos inicializados correctamente\n');
  }

  validateEnvironment() {
    console.log('🔍 Validando variables de entorno...');

    const requiredVars = ['ANTHROPIC_API_KEY', 'GH_TOKEN', 'NOTION_API_TOKEN', 'NOTION_DATABASE_ID'];
    const missingVars = [];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
      process.exit(1);
    }

    console.log('✅ Variables de entorno validadas');
  }

  async runScraping() {
    console.log('🕷️ FASE 1: SCRAPING DE NOTICIAS TECH');
    console.log('-'.repeat(40));

    try {
      const articles = await this.scraper.scrapeAllSites();
      this.stats.articlesScraped = articles.length;

      if (articles.length === 0) {
        throw new Error('No se pudieron obtener artículos de ningún sitio');
      }

      console.log(`\n✅ Scraping completado: ${articles.length} artículos obtenidos`);
      this.scraper.getArticlesSummary();

      return articles;

    } catch (error) {
      console.error('❌ Error en fase de scraping:', error.message);
      this.stats.errors.push({ phase: 'scraping', error: error.message });
      throw error;
    }
  }

  async runContentGeneration(articles) {
    console.log('\n🎨 FASE 2: GENERACIÓN DE CONTENIDO CON IA');
    console.log('-'.repeat(40));

    try {
      // Filtrar contenido relevante
      console.log('🔍 Paso 1: Filtrando contenido relevante...');
      const filteredNews = await this.generator.filterRelevantContent(articles);

      if (filteredNews.length === 0) {
        throw new Error('No se encontró contenido relevante después del filtrado');
      }

      console.log(`✅ ${filteredNews.length} noticias relevantes seleccionadas`);

      // Generar posts
      console.log('\n🚀 Paso 2: Generando 100 posts para LinkedIn...');
      const posts = await this.generator.generatePosts();

      this.stats.postsGenerated = posts.length;

      if (posts.length === 0) {
        throw new Error('No se pudieron generar posts');
      }

      console.log(`✅ ${posts.length} posts generados exitosamente`);

      return {
        posts,
        filteredNews,
        formattedPosts: this.generator.getFormattedPosts(),
        techSummary: this.generator.getTechSummary()
      };

    } catch (error) {
      console.error('❌ Error en generación de contenido:', error.message);
      this.stats.errors.push({ phase: 'generation', error: error.message });
      throw error;
    }
  }

  async runStorage(contentData) {
    console.log('\n🗂️ FASE 3: GUARDADO EN NOTION + GITHUB GISTS');
    console.log('-'.repeat(40));

    try {
      const { posts, techSummary } = contentData;

      // Intentar guardar en Notion primero (principal)
      console.log('📝 Guardando en Notion (principal)...');
      let notionResult = null;
      try {
        notionResult = await this.notionStorage.saveAllContent(posts, techSummary);
        console.log('✅ Contenido guardado exitosamente en Notion');
      } catch (notionError) {
        console.error('⚠️ Error guardando en Notion:', notionError.message);
        this.stats.errors.push({ phase: 'notion-storage', error: notionError.message });
      }

      // Guardar en Gists como backup siempre
      console.log('💾 Guardando backup en GitHub Gists...');
      let gistResult = null;
      try {
        gistResult = await this.gistStorage.saveAllContent(posts, techSummary);
        console.log('✅ Backup guardado en GitHub Gists');
      } catch (gistError) {
        console.error('⚠️ Error guardando en Gists:', gistError.message);
        this.stats.errors.push({ phase: 'gist-storage', error: gistError.message });
      }

      // Si ambos fallan, usar fallback local
      if (!notionResult && !gistResult) {
        console.log('🆘 Ambos storages fallaron, usando guardado de emergencia...');
        const emergencyResult = await this.notionStorage.saveFallbackFiles(posts, techSummary);
        return {
          emergency: true,
          files: emergencyResult,
          notion: null,
          gist: null
        };
      }

      this.stats.documentsCreated = (notionResult ? 1 : 0) + (gistResult ? 1 : 0);

      return {
        notion: notionResult,
        gist: gistResult,
        emergency: false
      };

    } catch (error) {
      console.error('❌ Error crítico en almacenamiento:', error.message);
      this.stats.errors.push({ phase: 'storage', error: error.message });
      throw error;
    }
  }

  async run() {
    try {
      // Inicializar sistema
      await this.initialize();

      // Ejecutar fases secuencialmente
      const articles = await this.runScraping();
      const contentData = await this.runContentGeneration(articles);
      const storageResult = await this.runStorage(contentData);

      // Finalizar
      this.stats.endTime = new Date();
      await this.finalize(storageResult);

      console.log('\n🎉 PROCESO COMPLETADO EXITOSAMENTE');
      process.exit(0);

    } catch (error) {
      console.error('\n💥 ERROR CRÍTICO:', error.message);

      this.stats.endTime = new Date();
      this.printErrorReport();

      process.exit(1);
    }
  }

  async finalize(storageResult) {
    // Cerrar navegador
    if (this.scraper) {
      await this.scraper.close();
    }

    // Imprimir reporte final
    this.printFinalReport(storageResult);
  }

  printFinalReport(storageResult) {
    console.log('\n📊 REPORTE FINAL');
    console.log('='.repeat(50));

    const duration = Math.round((this.stats.endTime - this.stats.startTime) / 1000);

    console.log(`⏱️ Duración total: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`📰 Artículos scrapeados: ${this.stats.articlesScraped}`);
    console.log(`📝 Posts generados: ${this.stats.postsGenerated}`);
    console.log(`📄 Documentos creados: ${this.stats.documentsCreated}`);

    // Enlaces de resultados
    if (storageResult && !storageResult.emergency) {
      console.log('\n🔗 Enlaces de contenido guardado:');

      if (storageResult.notion && storageResult.notion.notionUrl) {
        console.log(`📝 Notion Database: ${storageResult.notion.notionUrl}`);
      }

      if (storageResult.gist && storageResult.gist.postsGist) {
        console.log(`💾 Posts Gist: ${storageResult.gist.postsGist.url}`);
        console.log(`📊 Summary Gist: ${storageResult.gist.summaryGist.url}`);
      }
    } else if (storageResult && storageResult.emergency) {
      console.log('\n🆘 Archivos de emergencia creados:');
      console.log(`📁 ${storageResult.files.postsFile}`);
      console.log(`📁 ${storageResult.files.summaryFile}`);
    }

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️ Errores encontrados: ${this.stats.errors.length}`);
      this.stats.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. [${err.phase}] ${err.error}`);
      });
    }

    console.log('\n✨ Resumen de ejecución para GitHub Actions:');
    console.log(`SCRAPED_ARTICLES=${this.stats.articlesScraped}`);
    console.log(`GENERATED_POSTS=${this.stats.postsGenerated}`);
    console.log(`CREATED_DOCUMENTS=${this.stats.documentsCreated}`);
    console.log(`TOTAL_ERRORS=${this.stats.errors.length}`);
    console.log(`EXECUTION_TIME=${Math.round((this.stats.endTime - this.stats.startTime) / 1000)}`);
  }

  printErrorReport() {
    console.log('\n💥 REPORTE DE ERRORES');
    console.log('='.repeat(50));

    const duration = this.stats.endTime ?
      Math.round((this.stats.endTime - this.stats.startTime) / 1000) : 0;

    console.log(`⏱️ Tiempo transcurrido: ${duration}s`);
    console.log(`📰 Artículos scrapeados antes del fallo: ${this.stats.articlesScraped}`);
    console.log(`📝 Posts generados antes del fallo: ${this.stats.postsGenerated}`);

    console.log('\n❌ Errores detallados:');
    this.stats.errors.forEach((err, index) => {
      console.log(`  ${index + 1}. [${err.phase.toUpperCase()}] ${err.error}`);
    });

    console.log('\n🔧 Para debugging en GitHub Actions:');
    console.log(`ERROR_COUNT=${this.stats.errors.length}`);
    console.log(`LAST_PHASE=${this.stats.errors.length > 0 ? this.stats.errors[this.stats.errors.length - 1].phase : 'unknown'}`);
  }

  // Método para ejecutar solo una fase (útil para testing)
  async runPhase(phase, ...args) {
    await this.initialize();

    switch (phase) {
      case 'scraping':
        return await this.runScraping();
      case 'generation':
        return await this.runContentGeneration(...args);
      case 'storage':
        return await this.runStorage(...args);
      default:
        throw new Error(`Fase desconocida: ${phase}`);
    }
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const automation = new LinkedInAutomation();
  automation.run();
}

export default LinkedInAutomation;