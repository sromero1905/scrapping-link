import fetch from 'node-fetch';

class ImageFinder {
  constructor() {
    this.providers = {
      unsplash: {
        baseUrl: 'https://api.unsplash.com',
        accessKey: process.env.UNSPLASH_ACCESS_KEY,
        rateLimit: 50 // requests per hour
      },
      pexels: {
        baseUrl: 'https://api.pexels.com/v1',
        apiKey: process.env.PEXELS_API_KEY,
        rateLimit: 200 // requests per hour
      },
      pixabay: {
        baseUrl: 'https://pixabay.com/api',
        apiKey: process.env.PIXABAY_API_KEY,
        rateLimit: 5000 // requests per hour
      }
    };
    
    this.cache = new Map(); // Simple cache para evitar requests duplicados
  }

  async findImageForPost(postContent, postType, maxResults = 3) {
    console.log(`🖼️ Buscando imagen para post tipo: ${postType}`);
    
    // Generar keywords basados en el contenido del post
    const keywords = this.extractKeywords(postContent, postType);
    console.log(`🔍 Keywords: ${keywords.join(', ')}`);
    
    const allImages = [];
    
    // Buscar en los 3 proveedores en paralelo
    const providers = ['unsplash', 'pexels', 'pixabay'];
    const searchPromises = providers.map(provider => 
      this.searchInProvider(provider, keywords, 3).catch(err => {
        console.log(`⚠️ Error en ${provider}: ${err.message}`);
        return [];
      })
    );
    
    const results = await Promise.all(searchPromises);
    results.forEach(images => allImages.push(...images));
    
    // Devolver las mejores opciones
    const bestImages = this.rankImages(allImages, postType).slice(0, maxResults);
    
    console.log(`✅ Encontradas ${bestImages.length} imágenes candidatas`);
    return bestImages;
  }

  async searchInProvider(provider, keywords, limit = 3) { // Mínimo 3 para Pixabay
    const config = this.providers[provider];
    if (!config.apiKey && !config.accessKey) {
      console.log(`⚠️ No API key para ${provider}, saltando...`);
      return [];
    }

    // Cache key
    const cacheKey = `${provider}-${keywords.join('-')}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      let images = [];
      
      switch (provider) {
        case 'unsplash':
          images = await this.searchUnsplash(keywords, limit);
          break;
        case 'pexels':
          images = await this.searchPexels(keywords, limit);
          break;
        case 'pixabay':
          images = await this.searchPixabay(keywords, limit);
          break;
      }
      
      // Cachear resultado por 1 hora
      setTimeout(() => this.cache.delete(cacheKey), 3600000);
      this.cache.set(cacheKey, images);
      
      return images;
    } catch (error) {
      console.error(`❌ Error searching ${provider}:`, error.message);
      return [];
    }
  }

  async searchUnsplash(keywords, limit) {
    const query = keywords.join(' ');
    const url = `${this.providers.unsplash.baseUrl}/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape`;
    
    console.log(`🔍 Unsplash URL: ${url}`);
    console.log(`🔍 Access Key: ${this.providers.unsplash.accessKey ? this.providers.unsplash.accessKey.substring(0, 10) + '...' : 'MISSING'}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${this.providers.unsplash.accessKey}`,
        'Accept-Version': 'v1'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Unsplash error response: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    return data.results.map(img => ({
      url: img.urls.regular,
      thumb: img.urls.thumb,
      alt: img.alt_description || img.description || '',
      width: img.width,
      height: img.height,
      provider: 'unsplash',
      credit: `Photo by ${img.user.name} on Unsplash`,
      downloadUrl: img.links.download,
      quality: this.estimateQuality(img.width, img.height, img.likes || 0)
    }));
  }

  async searchPexels(keywords, limit) {
    const query = keywords.join(' ');
    const url = `${this.providers.pexels.baseUrl}/search?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': this.providers.pexels.apiKey
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    return data.photos.map(img => ({
      url: img.src.large,
      thumb: img.src.medium,
      alt: img.alt || '',
      width: img.width,
      height: img.height,
      provider: 'pexels',
      credit: `Photo by ${img.photographer} on Pexels`,
      downloadUrl: img.src.original,
      quality: this.estimateQuality(img.width, img.height)
    }));
  }

  async searchPixabay(keywords, limit) {
    const query = keywords.join('+'); // Pixabay usa + en lugar de espacios
    const url = `${this.providers.pixabay.baseUrl}/?key=${this.providers.pixabay.apiKey}&q=${query}&per_page=${limit}&image_type=photo&orientation=horizontal&min_width=800&min_height=600&safesearch=true`;
    
    console.log(`🔍 Pixabay URL: ${url.replace(this.providers.pixabay.apiKey, 'API_KEY')}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    return data.hits.map(img => ({
      url: img.webformatURL,
      thumb: img.previewURL,
      alt: img.tags,
      width: img.webformatWidth, // Usar dimensiones correctas
      height: img.webformatHeight,
      provider: 'pixabay',
      credit: `Image by ${img.user} from Pixabay`,
      downloadUrl: img.largeImageURL || img.webformatURL,
      quality: this.estimateQuality(img.webformatWidth, img.webformatHeight, img.downloads || 0)
    }));
  }

  extractKeywords(postContent, postType) {
    // Keywords base según el tipo de post
    const typeKeywords = {
      informativo: ['technology', 'business', 'innovation', 'digital'],
      opinion: ['concept', 'abstract', 'thinking', 'idea'],
      meme: ['funny', 'creative', 'humor', 'concept'],
      storytelling: ['people', 'success', 'growth', 'achievement'],
      resumen: ['analysis', 'data', 'research', 'summary']
    };

    // Extraer keywords del contenido del post
    const contentKeywords = [];
    const text = postContent.toLowerCase();
    
    // Tech keywords comunes
    const techTerms = ['ai', 'artificial intelligence', 'machine learning', 'startup', 'technology', 
                      'innovation', 'digital', 'software', 'app', 'platform', 'data', 'cloud',
                      'blockchain', 'crypto', 'mobile', 'web', 'internet', 'computer', 'coding'];
    
    techTerms.forEach(term => {
      if (text.includes(term)) {
        contentKeywords.push(term.replace(' ', '-'));
      }
    });

    // Combinar keywords del tipo y del contenido
    const baseKeywords = typeKeywords[postType] || typeKeywords.informativo;
    const finalKeywords = [...baseKeywords];
    
    // Agregar 1-2 keywords del contenido si están disponibles
    if (contentKeywords.length > 0) {
      finalKeywords.push(...contentKeywords.slice(0, 2));
    }

    return finalKeywords.slice(0, 4); // Máximo 4 keywords para mejor relevancia
  }

  estimateQuality(width, height, likes = 0) {
    let score = 0;
    
    // Resolución
    const pixels = width * height;
    if (pixels >= 2000000) score += 3; // 2MP+
    else if (pixels >= 1000000) score += 2; // 1MP+
    else if (pixels >= 500000) score += 1; // 500K+
    
    // Aspecto ratio (preferir landscape para LinkedIn)
    const ratio = width / height;
    if (ratio >= 1.2 && ratio <= 1.9) score += 2; // Buen ratio para LinkedIn
    else if (ratio >= 1.0 && ratio <= 2.5) score += 1;
    
    // Engagement (likes/downloads)
    if (likes > 1000) score += 2;
    else if (likes > 100) score += 1;
    
    return Math.min(score, 10); // Score máximo de 10
  }

  rankImages(images, postType) {
    // Ordenar por calidad estimada y diversidad de proveedores
    return images
      .sort((a, b) => {
        // Priorizar calidad
        if (b.quality !== a.quality) return b.quality - a.quality;
        
        // Luego por diversidad de proveedores (preferir variedad)
        const providerPriority = { unsplash: 3, pexels: 2, pixabay: 1 };
        return providerPriority[b.provider] - providerPriority[a.provider];
      });
  }
}

export default ImageFinder;