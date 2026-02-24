import { chromium } from 'playwright';

const SITES_CONFIG = {
  'techcrunch.com': {
    name: 'TechCrunch',
    baseUrl: 'https://techcrunch.com',
    articleSelector: 'h3 a, h2 a, a[href*="/2026/"], a[href*="/2025/"]',
    titleSelector: 'h1, .article__title, .wp-block-post-title',
    contentSelector: '.article-content, .entry-content, .wp-block-post-content, [data-module="ArticleBody"]',
    maxAge: 72
  },
  'theverge.com': {
    name: 'The Verge',
    baseUrl: 'https://www.theverge.com',
    articleSelector: 'h2 a, .c-entry-box--compact__title a, article h2 a, .duet--content-cards--content-card h2 a',
    titleSelector: 'h1, .c-page-title',
    contentSelector: '.c-entry-content, .duet--article--article-body',
    maxAge: 48
  },
  'wired.com': {
    name: 'Wired',
    baseUrl: 'https://www.wired.com',
    articleSelector: 'h3 a, .SummaryItemHedLink-cgaOuV, [data-testid="SummaryItemHedLink"], article h3 a, .summary-item a',
    titleSelector: 'h1, .ContentHeaderHed-sGKyoD',
    contentSelector: '.ArticleBodyWrapper, .article-body',
    maxAge: 48
  },
  'arstechnica.com': {
    name: 'Ars Technica',
    baseUrl: 'https://arstechnica.com',
    articleSelector: 'h2 a, .listing h4 a, article header h2 a, .article h2 a',
    titleSelector: 'h1, .post-title',
    contentSelector: '.post-content, .article-content, section.post-content',
    maxAge: 48
  },
  'technologyreview.com': {
    name: 'MIT Technology Review',
    baseUrl: 'https://www.technologyreview.com',
    articleSelector: 'a[href*="/2026/"], a[href*="/2025/"], h2 a, h3 a, .story-link a',
    titleSelector: 'h1',
    contentSelector: 'main p, section p, .article__body, .content__body',
    maxAge: 48
  },
  'venturebeat.com': {
    name: 'VentureBeat',
    baseUrl: 'https://venturebeat.com',
    articleSelector: '.ArticleListing__title-link, h3 a, .post-title a, article h2 a',
    titleSelector: 'h1',
    contentSelector: 'article p, .article-content, .the-content',
    maxAge: 48
  },
  'news.ycombinator.com': {
    name: 'Hacker News',
    baseUrl: 'https://news.ycombinator.com',
    articleSelector: '.athing .titleline > a, .athing .title a',
    titleSelector: '',
    contentSelector: '',
    maxAge: 168,
    isAggregator: true
  },
  'zdnet.com': {
    name: 'ZDNet',
    baseUrl: 'https://www.zdnet.com',
    articleSelector: 'h3 a, .c-shortcardFeed__title a, article h2 a',
    titleSelector: 'h1',
    contentSelector: '.c-entry-content, .storyBody',
    maxAge: 48
  }
};

class TechScraper {
  constructor() {
    this.browser = null;
    this.articles = [];
  }

  async initialize() {
    console.log('🚀 Inicializando navegador...');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Navegador cerrado');
    }
  }

  isRecentArticle(publishedDate, maxAgeHours = 24) {
    if (!publishedDate) return true; // Si no podemos determinar fecha, asumimos que es reciente
    
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convertir horas a ms
    const articleAge = now - publishedDate;
    
    return articleAge <= maxAge;
  }

  async extractPublishDate(page) {
    // Selectores comunes para fechas de publicación
    const dateSelectors = [
      'time[datetime]',
      '[datetime]',
      '.published-date',
      '.publish-date', 
      '.post-date',
      '.article-date',
      '.date',
      '.timestamp',
      '.meta-date',
      '[data-published]',
      '[data-date]'
    ];

    for (const selector of dateSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          // Intentar obtener datetime attribute primero
          const datetime = await element.getAttribute('datetime');
          if (datetime) {
            const date = new Date(datetime);
            if (!isNaN(date.getTime())) return date;
          }
          
          // Intentar obtener data attributes
          const dataPublished = await element.getAttribute('data-published') || 
                               await element.getAttribute('data-date');
          if (dataPublished) {
            const date = new Date(dataPublished);
            if (!isNaN(date.getTime())) return date;
          }
          
          // Intentar parsear el texto del elemento
          const text = await element.textContent();
          if (text) {
            const date = this.parseDateFromText(text.trim());
            if (date) return date;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback: buscar fechas en meta tags
    try {
      const metaDate = await page.$eval('meta[property="article:published_time"]', 
        el => el.getAttribute('content'));
      if (metaDate) {
        const date = new Date(metaDate);
        if (!isNaN(date.getTime())) return date;
      }
    } catch (e) {}

    try {
      const metaDate = await page.$eval('meta[name="publishdate"]', 
        el => el.getAttribute('content'));
      if (metaDate) {
        const date = new Date(metaDate);
        if (!isNaN(date.getTime())) return date;
      }
    } catch (e) {}

    return null; // No se pudo determinar fecha
  }

  parseDateFromText(text) {
    // Patterns comunes de fechas
    const patterns = [
      /(\d{4})-(\d{2})-(\d{2})/,           // 2025-02-21
      /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, // 21/02/2025 or 21-02-2025
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, // 21 Feb 2025
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i, // Feb 21, 2025
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const date = new Date(text);
        if (!isNaN(date.getTime())) return date;
      }
    }

    // Intentar parseo directo
    const date = new Date(text);
    if (!isNaN(date.getTime()) && date.getFullYear() > 2020) {
      return date;
    }

    return null;
  }


  async scrapeArticleContent(page, url, config) {
    let publishDate = null;
    
    try {
      console.log(`  📖 Extrayendo contenido de: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Para sitios agregadores, saltar detección de fecha en URLs externas
      if (!config.isAggregator) {
        // Detectar fecha de publicación antes de continuar
        publishDate = await this.extractPublishDate(page);
        if (publishDate && !this.isRecentArticle(publishDate, config.maxAge || 24)) {
          console.log(`  ⏰ Artículo demasiado viejo: ${publishDate.toLocaleDateString()}`);
          return null;
        }
      }

      // Extraer título
      let title = '';
      if (config.titleSelector) {
        try {
          title = await page.textContent(config.titleSelector, { timeout: 5000 });
          title = title?.trim() || '';
        } catch (e) {
          // Fallback: buscar en meta tags o h1 genérico
          title = await page.textContent('h1').catch(() => '') || 
                  await page.getAttribute('meta[property="og:title"]', 'content').catch(() => '') ||
                  await page.textContent('title').catch(() => '');
        }
      }


      // Extraer contenido
      let content = '';
      if (config.contentSelector && !config.isAggregator) {
        try {
          const contentElements = await page.$$(config.contentSelector);
          if (contentElements.length > 0) {
            for (const element of contentElements) {
              const text = await element.textContent();
              content += text + '\n';
            }
          }
        } catch (e) {
          // Fallback: buscar contenido en selectores comunes
          const fallbackSelectors = [
            'article', 
            '.content', 
            '.post-content', 
            '.entry-content',
            'main p',
            '.article-body p'
          ];
          
          for (const selector of fallbackSelectors) {
            try {
              const elements = await page.$$(selector + ' p');
              if (elements.length > 0) {
                for (const p of elements.slice(0, 5)) { // Solo primeros 5 párrafos
                  const text = await p.textContent();
                  content += text + '\n';
                }
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
      }

      // Para sitios agregadores como Hacker News, usar el título como contenido
      if (config.isAggregator) {
        content = `Trending en ${config.name}: ${title}`;
      }

      // Limpiar contenido
      content = content.trim().substring(0, 2000); // Limitar a 2000 caracteres
      title = title.trim().substring(0, 200); // Limitar título

      if (title && (content || config.isAggregator)) {
        return {
          title,
          content: content || 'Contenido no disponible',
          url,
          source: config.name,
          publishedDate: publishDate ? publishDate.toISOString() : null,
          scrapedAt: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error(`  ❌ Error extrayendo contenido de ${url}:`, error.message);
      return null;
    }
  }

  async scrapeSite(siteKey) {
    const config = SITES_CONFIG[siteKey];
    console.log(`\n🔍 Scrapeando ${config.name}...`);

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
      // Navegar al sitio principal
      await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Buscar enlaces de artículos recientes
      const articleLinks = await page.$$eval(config.articleSelector, (elements) => {
        return elements.map(el => ({
          url: el.href,
          title: el.textContent?.trim() || '',
          element: el.outerHTML
        })).filter(item => item.url && item.title);
      }).catch(() => []);

      if (articleLinks.length === 0) {
        console.log(`  ⚠️ No se encontraron artículos en ${config.name}`);
        return [];
      }

      console.log(`  📰 Encontrados ${articleLinks.length} artículos potenciales`);

      // Filtrar y obtener solo URLs únicas y válidas
      const uniqueUrls = [...new Set(articleLinks.map(item => {
        let url = item.url;
        // Convertir URLs relativas a absolutas
        if (url.startsWith('/')) {
          url = new URL(url, config.baseUrl).href;
        }
        return url;
      }))];

      // Tomar más artículos para mayor diversidad de contenido
      const urlsToScrape = uniqueUrls.slice(0, 12);
      const siteArticles = [];

      // Extraer contenido de cada artículo
      for (let i = 0; i < Math.min(urlsToScrape.length, 10); i++) {
        const url = urlsToScrape[i];
        
        try {
          const articleData = await this.scrapeArticleContent(page, url, config);
          if (articleData) {
            siteArticles.push(articleData);
            console.log(`  ✅ Extraído: "${articleData.title.substring(0, 50)}..."`);
          }
        } catch (error) {
          console.error(`  ❌ Error en artículo ${url}:`, error.message);
        }

        // Pequeña pausa entre artículos
        await page.waitForTimeout(1000);
      }

      console.log(`  📊 ${config.name}: ${siteArticles.length} artículos extraídos exitosamente`);
      return siteArticles;

    } catch (error) {
      console.error(`❌ Error scrapeando ${config.name}:`, error.message);
      return [];
    } finally {
      await context.close();
    }
  }

  async scrapeAllSites() {
    console.log('🎯 Iniciando scraping de todos los sitios tech...');
    const startTime = Date.now();

    for (const siteKey of Object.keys(SITES_CONFIG)) {
      try {
        const siteArticles = await this.scrapeSite(siteKey);
        this.articles.push(...siteArticles);
        
        // Pausa entre sitios para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error en sitio ${siteKey}:`, error.message);
        continue; // Continuar con el siguiente sitio
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`\n🎉 Scraping completado!`);
    console.log(`📊 Total de artículos extraídos: ${this.articles.length}`);
    console.log(`⏱️ Tiempo total: ${duration} segundos`);
    console.log(`📈 Promedio: ${(this.articles.length / Object.keys(SITES_CONFIG).length).toFixed(1)} artículos por sitio`);

    return this.articles;
  }

  getArticlesSummary() {
    const summary = {};
    this.articles.forEach(article => {
      if (!summary[article.source]) {
        summary[article.source] = 0;
      }
      summary[article.source]++;
    });

    console.log('\n📋 Resumen por fuente:');
    Object.entries(summary).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} artículos`);
    });

    return summary;
  }
}

export default TechScraper;