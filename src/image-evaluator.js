import Anthropic from '@anthropic-ai/sdk';

class ImageEvaluator {
  constructor(apiKey) {
    this.anthropic = new Anthropic({
      apiKey: apiKey
    });
  }

  async evaluatePostForImage(post) {
    console.log(`🤔 Evaluando si Post #${post.number} necesita imagen...`);
    
    const evaluationPrompt = `Eres un experto curador visual para LinkedIn con criterios ULTRA-EXIGENTES de calidad estética.

ANALIZA este post y decide si NECESITA una imagen:

POST:
Tipo: ${post.type}
Contenido: ${post.content}

CRITERIOS ULTRA-SELECTIVOS:
✅ SÍ necesita imagen si:
- El post habla de productos visuales, interfaces, diseños
- Menciona conceptos que se benefician de metáforas visuales potentes
- Es storytelling que ganaría MUCHO con una imagen conceptual
- Es meme/humor que REQUIERE apoyo visual para ser efectivo

❌ NO necesita imagen si:
- Es principalmente texto/opinión que ya funciona solo
- El mensaje es tan fuerte que una imagen lo distraería  
- Es contenido puramente informativo/técnico
- Una imagen sería decorativa sin valor real

RESPONDE SOLO:
"SÍ" o "NO"

Recuerda: Somos ULTRA-SELECTIVOS. Mejor sin imagen que con imagen mediocre.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 50,
        messages: [{ role: 'user', content: evaluationPrompt }]
      });

      const decision = response.content[0].text.trim().toUpperCase();
      const needsImage = decision.includes('SÍ') || decision.includes('YES');
      
      console.log(`${needsImage ? '🖼️' : '📝'} Post #${post.number}: ${needsImage ? 'NECESITA' : 'NO necesita'} imagen`);
      
      return needsImage;
    } catch (error) {
      console.error('❌ Error evaluando necesidad de imagen:', error.message);
      return false; // Si hay error, mejor sin imagen
    }
  }

  async evaluateOriginalImage(post, originalImage) {
    console.log(`🎨 Evaluando calidad de imagen original para Post #${post.number}...`);
    
    const qualityPrompt = `Eres un director creativo con estándares de CALIDAD VISUAL EXTREMOS para LinkedIn.

EVALÚA esta imagen original del artículo:

POST CONTEXT:
${post.content.substring(0, 300)}...

IMAGEN:
URL: ${originalImage.url}
Alt text: ${originalImage.alt}
Fuente: ${originalImage.source}

CRITERIOS DE CALIDAD BRUTAL:
🏆 APROBAR (8-10/10) solo si es:
- Visualmente IMPACTANTE y profesional
- Perfectamente relevante al contenido
- Alta resolución y bien compuesta
- NO es stock photo genérico obvio
- NO es screenshot básico sin diseño
- AGREGA valor real al post

❌ RECHAZAR si es:
- Stock photo corporativo aburrido
- Logo simple sobre fondo blanco  
- Screenshot sin contexto visual interesante
- Imagen pixelada o de baja calidad
- Genérica/repetitiva/clickbait
- No relacionada directamente

RESPONDE:
Calificación: [1-10]/10
Decisión: APROBAR o RECHAZAR
Razón: [1 línea explicando por qué]

Sé BRUTAL. Solo lo mejor de lo mejor pasa.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{ role: 'user', content: qualityPrompt }]
      });

      const evaluation = response.content[0].text;
      const approved = evaluation.includes('APROBAR');
      const scoreMatch = evaluation.match(/(\d+)\/10/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
      
      console.log(`${approved ? '✅' : '❌'} Imagen original: ${approved ? 'APROBADA' : 'RECHAZADA'} (${score}/10)`);
      
      return {
        approved,
        score,
        evaluation,
        image: originalImage
      };
    } catch (error) {
      console.error('❌ Error evaluando imagen original:', error.message);
      return { approved: false, score: 0, evaluation: 'Error en evaluación', image: originalImage };
    }
  }

  async evaluateSearchResults(post, imageOptions) {
    if (!imageOptions || imageOptions.length === 0) {
      return { approved: false, selectedImage: null, evaluation: 'No hay opciones para evaluar' };
    }

    console.log(`🔍 Evaluando ${imageOptions.length} opciones de búsqueda para Post #${post.number}...`);
    
    // Preparar información de las imágenes
    const imagesInfo = imageOptions.map((img, index) => 
      `OPCIÓN ${index + 1}:
URL: ${img.url}
Alt: ${img.alt}
Provider: ${img.provider}
Tamaño: ${img.width}x${img.height}
Calidad técnica: ${img.quality}/10`
    ).join('\n\n');

    const selectionPrompt = `Eres un director de arte con criterios DESPIADADAMENTE ALTOS para LinkedIn.

CONTEXTO DEL POST:
${post.content.substring(0, 400)}...

OPCIONES DE IMÁGENES:
${imagesInfo}

CRITERIOS DE SELECCIÓN ULTRA-ESTRICTOS:
🏆 APROBAR solo si encuentras UNA imagen que sea:
- VISUALMENTE ESPECTACULAR (no solo "buena")
- PERFECTAMENTE relevante al mensaje
- PROFESIONAL de nivel revista
- QUE PARE EL SCROLL inmediatamente
- MEMORABLE y única

❌ RECHAZAR TODO si:
- Son stock photos genéricas/corporativas
- No hay conexión clara con el mensaje  
- Se ven repetitivas o aburridas
- Calidad visual no es EXCEPCIONAL
- Mejor el post sin imagen que con imagen mediocre

RESPONDE:
Decisión: APROBAR_OPCION_[número] o RECHAZAR_TODO
Razón: [1 línea explicando tu decisión]

Recuerda: Somos ULTRA-SELECTIVOS. Solo lo EXTRAORDINARIO pasa.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: selectionPrompt }]
      });

      const evaluation = response.content[0].text;
      
      // Parsear respuesta
      const approveMatch = evaluation.match(/APROBAR_OPCION_(\d+)/);
      if (approveMatch) {
        const selectedIndex = parseInt(approveMatch[1]) - 1;
        if (selectedIndex >= 0 && selectedIndex < imageOptions.length) {
          const selectedImage = imageOptions[selectedIndex];
          console.log(`✅ Imagen APROBADA: Opción ${selectedIndex + 1} (${selectedImage.provider})`);
          return {
            approved: true,
            selectedImage,
            evaluation
          };
        }
      }
      
      console.log('❌ Todas las opciones RECHAZADAS - Post sin imagen');
      return {
        approved: false,
        selectedImage: null,
        evaluation
      };
    } catch (error) {
      console.error('❌ Error evaluando opciones de búsqueda:', error.message);
      return { approved: false, selectedImage: null, evaluation: 'Error en evaluación' };
    }
  }

  async generateImageKeywords(post) {
    // Generar keywords más específicos usando IA
    const keywordPrompt = `Genera 3-4 keywords en inglés para buscar la imagen PERFECTA para este post de LinkedIn:

POST: ${post.content.substring(0, 200)}...

Los keywords deben ser:
- ESPECÍFICOS y relevantes al contenido
- VISUALES (que produzcan imágenes interesantes)
- PROFESIONALES para LinkedIn
- En inglés para mejores resultados de búsqueda

Responde solo los keywords separados por comas:`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: keywordPrompt }]
      });

      const keywords = response.content[0].text
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0)
        .slice(0, 4);

      console.log(`🔍 Keywords IA generados: ${keywords.join(', ')}`);
      return keywords;
    } catch (error) {
      console.error('❌ Error generando keywords:', error.message);
      // Fallback a keywords básicos
      return ['technology', 'business', 'innovation'];
    }
  }
}

export default ImageEvaluator;