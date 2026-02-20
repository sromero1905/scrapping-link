import { chromium } from 'playwright';

const SITES_CONFIG = {
  'techcrunch.com': {
    name: 'TechCrunch',
    baseUrl: 'https://techcrunch.com',
    articleSelector: 'h3 a, h2 a, a[href*="/2026/"], a[href*="/2025/"]',
    titleSelector: 'h1, .article__title, .wp-block-post-title',
    contentSelector: '.article-content, .entry-content, .wp-block-post-content, [data-module="ArticleBody"]',
    maxAge: 24 // hours
  },
  'theverge.com': {
    name: 'The Verge',
    baseUrl: 'https://www.theverge.com',
    articleSelector: 'h2 a, .c-entry-box--compact__title a, article h2 a, .duet--content-cards--content-card h2 a',
    titleSelector: 'h1, .c-page-title',
    contentSelector: '.c-entry-content, .duet--article--article-body',
    maxAge: 24
  },
  'wired.com': {
    name: 'Wired',
    baseUrl: 'https://www.wired.com',
    articleSelector: 'h3 a, .SummaryItemHedLink-cgaOuV, [data-testid="SummaryItemHedLink"], article h3 a, .summary-item a',
    titleSelector: 'h1, .ContentHeaderHed-sGKyoD',
    contentSelector: '.ArticleBodyWrapper, .article-body',
    maxAge: 24
  },
  'arstechnica.com': {
    name: 'Ars Technica',
    baseUrl: 'https://arstechnica.com',
    articleSelector: 'h2 a, .listing h4 a, article header h2 a, .article h2 a',
    titleSelector: 'h1, .post-title',
    contentSelector: '.post-content, .article-content, section.post-content',
    maxAge: 24
  },
  'technologyreview.com': {
    name: 'MIT Technology Review',
    baseUrl: 'https://www.technologyreview.com',
    articleSelector: 'a[href*="/2026/"], a[href*="/2025/"], h2 a, h3 a, .story-link a',
    titleSelector: 'h1',
    contentSelector: 'main p, section p, .article__body, .content__body',
    maxAge: 24
  },
  'venturebeat.com': {
    name: 'VentureBeat',
    baseUrl: 'https://venturebeat.com',
    articleSelector: '.ArticleListing__title-link, h3 a, .post-title a, article h2 a',
    titleSelector: 'h1',
    contentSelector: 'article p, .article-content, .the-content',
    maxAge: 24
  },
  'news.ycombinator.com': {
    name: 'Hacker News',
    baseUrl: 'https://news.ycombinator.com',
    articleSelector: '.athing .titleline > a, .athing .title a',
    titleSelector: '',
    contentSelector: '',
    maxAge: 24,
    isAggregator: true
  },
  'huggingface.co': {
    name: 'Hugging Face Blog',
    baseUrl: 'https://huggingface.co/blog',
    articleSelector: '.mb-2 a[href*="/blog/"], article h2 a, h3 a, .blog-post-link',
    titleSelector: 'h1',
    contentSelector: '.prose, .blog-content',
    maxAge: 24
  },
  'openai.com': {
    name: 'OpenAI Blog',
    baseUrl: 'https://openai.com/index/',
    articleSelector: 'a[href*="/index/"], h3 a, h2 a, article a',
    titleSelector: 'h1',
    contentSelector: '.prose, .blog-content',
    maxAge: 24
  },
  'anthropic.com': {
    name: 'Anthropic News',
    baseUrl: 'https://www.anthropic.com/news',
    articleSelector: 'a[href*="/news/"], h2 a, h3 a, .post-link a',
    titleSelector: 'h1',
    contentSelector: '.prose, .news-content',
    maxAge: 24
  },
  'deepmind.google': {
    name: 'DeepMind Blog',
    baseUrl: 'https://deepmind.google/discover/blog/',
    articleSelector: 'article a, h2 a, h3 a, .blog-card a',
    titleSelector: 'h1',
    contentSelector: '.article-content, .blog-content',
    maxAge: 24
  },
  'ai.meta.com': {
    name: 'Meta AI Blog',
    baseUrl: 'https://ai.meta.com/blog',
    articleSelector: 'a[href*="/blog/"]',
    titleSelector: 'h1',
    contentSelector: '.prose, .article-content, main p',
    maxAge: 24
  },
  'stability.ai': {
    name: 'Stability AI Blog',
    baseUrl: 'https://stability.ai/news',
    articleSelector: 'a[href*="/news/"]',
    titleSelector: 'h1',
    contentSelector: '.prose, .article-content, main p',
    maxAge: 24
  },
  'mistral.ai': {
    name: 'Mistral AI Blog',
    baseUrl: 'https://mistral.ai/news',
    articleSelector: 'a[href*="/news/"]',
    titleSelector: 'h1',
    contentSelector: '.prose, .article-content, main p',
    maxAge: 24
  },
  'cohere.com': {
    name: 'Cohere Blog',
    baseUrl: 'https://cohere.com/blog',
    articleSelector: 'a[href*="/blog/"]',
    titleSelector: 'h1',
    contentSelector: '.prose, .article-content, main p',
    maxAge: 24
  },
  'scale.com': {
    name: 'Scale AI Blog',
    baseUrl: 'https://scale.com/blog',
    articleSelector: 'a[href*="/blog/"]',
    titleSelector: 'h1',
    contentSelector: '.prose, .article-content, main p',
    maxAge: 24
  },
  'blog.perplexity.ai': {
    name: 'Perplexity AI Blog',
    baseUrl: 'https://blog.perplexity.ai',
    articleSelector: 'a[href*="/blog/"], h2 a, h3 a',
    titleSelector: 'h1',
    contentSelector: '.prose, .article-content, main p',
    maxAge: 24
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
    // Siempre retornamos true para tomar todos los artículos de la home
    // La home page naturalmente muestra las noticias más recientes
    return true;
  }

  async scrapeArticleContent(page, url, config) {
    try {
      console.log(`  📖 Extrayendo contenido de: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

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

      // Para sitios agregadores como Hacker News, el título es suficiente
      if (config.isAggregator) {
        content = `Noticia destacada en ${config.name}`;
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