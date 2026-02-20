# 🤖 Sistema Automatizado de Generación de Contenido para LinkedIn

Sistema completo que scrapea noticias tech diariamente, las procesa con IA y genera 100 posts únicos para LinkedIn, guardándolos automáticamente en Google Drive.

## 🚀 Características

- **Scraping Inteligente**: Navega dinámicamente 15+ sitios tech para extraer las noticias más recientes
- **Filtrado con IA**: Claude selecciona solo el contenido verdaderamente relevante
- **Generación Variada**: 100 posts únicos en español con 10 estilos de escritura diferentes
- **Almacenamiento Automático**: Documentos organizados en Google Drive + fallback local
- **Ejecución Diaria**: GitHub Actions ejecuta automáticamente a las 10:00 UTC
- **Recuperación ante Fallos**: Sistema robusto con retry automático y múltiples fallbacks

## 📁 Estructura del Proyecto

```
linkedin-content-generator-2/
├── src/
│   ├── scraper.js          # Scraping con Playwright
│   ├── generator.js        # Generación con Claude
│   └── storage.js          # Almacenamiento en Google Drive
├── .github/workflows/
│   └── daily.yml           # Workflow de GitHub Actions
├── main.js                 # Orquestador principal
├── package.json            # Dependencias
├── .env.example            # Ejemplo de configuración
└── README.md               # Esta documentación
```

## 🔧 Configuración

### 1. Variables de Entorno

Configura estas variables como **GitHub Secrets** en tu repositorio:

#### `ANTHROPIC_API_KEY`
- Obtén tu API key en [Anthropic Console](https://console.anthropic.com/)
- Necesitas acceso a Claude-3.5-Sonnet

#### `GOOGLE_CREDENTIALS`
- Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/)
- Habilita las APIs de Google Drive y Google Docs
- Crea un Service Account con permisos de editor
- Descarga las credenciales JSON
- Convierte a Base64: `cat credenciales.json | base64 -w 0`

### 2. Configuración de GitHub Secrets

1. Ve a tu repositorio → Settings → Secrets and variables → Actions
2. Añade estas secrets:
   - `ANTHROPIC_API_KEY`: Tu API key de Anthropic
   - `GOOGLE_CREDENTIALS`: Las credenciales de Google en Base64

### 3. Instalación Local (Opcional)

```bash
# Clonar repositorio
git clone <tu-repo>
cd linkedin-content-generator-2

# Instalar dependencias
npm install

# Instalar navegadores de Playwright
npx playwright install chromium

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar
npm start
```

## 🎯 Funcionamiento

### Sitios Scrapeados

El sistema extrae automáticamente noticias de:

- **Tech General**: TechCrunch, The Verge, Wired, Ars Technica
- **IA Especializada**: OpenAI Blog, Anthropic News, DeepMind Blog
- **Comunidad**: Hacker News, Product Hunt, Hugging Face
- **Newsletters**: The Rundown AI, Ben's Bites, TLDR Tech
- **Academia**: MIT Technology Review, VentureBeat

### Tipos de Posts Generados

- **40 Posts Informativos**: Datos concretos extraídos de noticias
- **25 Posts de Opinión**: Posturas claras que generan debate  
- **20 Posts Humor/Meme**: Referencias culturales y humor tech genuino
- **15 Posts Storytelling**: Narrativas y reflexiones con historia real

### Estilos de Escritura

El sistema utiliza 10 estilos diferentes distribuidos entre los posts:

1. **Directo e impactante** - Frases cortas, datos duros
2. **Conversacional y cercano** - Como hablar con un amigo
3. **Analista experto** - Insights profundos pero accesibles
4. **Storyteller narrativo** - Historias que conectan
5. **Humor inteligente** - Referencias actuales, no forzado
6. **Visionario del futuro** - Qué significa a largo plazo
7. **Crítico constructivo** - Señalar problemas con soluciones
8. **Educativo simple** - Explicar lo complejo fácilmente
9. **Provocador de debate** - Preguntas que generan discusión
10. **Optimista inspirador** - El lado positivo de los cambios

## 📊 Salidas Generadas

### En Google Drive (Carpeta "LinkedIn Automation")

1. **`Posts LinkedIn [DD-MM-YYYY]`**
   - 100 posts numerados y listos para usar
   - Índice por tipo de contenido
   - Hashtags relevantes incluidos

2. **`Resumen Tech-IA [DD-MM-YYYY]`**
   - Noticias organizadas por categoría
   - 3 tendencias clave detectadas
   - Enlaces a fuentes originales

### Archivos Fallback

Si Google Drive falla, se crean archivos locales:
- `fallback/posts-linkedin-[fecha].txt`
- `fallback/resumen-tech-[fecha].txt`

## ⚙️ GitHub Actions

### Ejecución Automática
- **Diario**: 10:00 UTC (7:00 AM Argentina)
- **Manual**: Botón "Run workflow" en GitHub

### Características del Workflow
- **Retry automático**: 2 intentos con exponential backoff
- **Timeout**: 30 minutos máximo por ejecución
- **Artifacts**: Subida automática de archivos fallback
- **Health check**: Monitoreo del estado del sistema
- **Logs detallados**: Información completa de cada ejecución

### Monitoreo

Revisa el estado en:
- GitHub Actions → tu repositorio → Actions tab
- Artifacts descargables si hay fallos
- Summary reports automáticos

## 🛠️ Desarrollo y Testing

### Ejecutar Fases Individuales

```bash
# Solo scraping
node -e "import('./main.js').then(m => new m.default().runPhase('scraping'))"

# Solo generación (requiere datos de scraping)
node -e "import('./main.js').then(m => new m.default().runPhase('generation', articles))"

# Solo almacenamiento
node -e "import('./main.js').then(m => new m.default().runPhase('storage', contentData))"
```

### Logs y Debugging

El sistema genera logs detallados mostrando:
- Progreso de scraping por sitio
- Estadísticas de filtrado de noticias  
- Resumen de posts generados por tipo
- Estado de guardado en Google Drive
- Tiempo total de ejecución

## 🚨 Manejo de Errores

### Estrategias de Recuperación

1. **Scraping**: Si un sitio falla, continúa con los demás
2. **IA**: Retry automático con exponential backoff (3 intentos)
3. **Storage**: Fallback a archivos locales si Drive falla
4. **GitHub Actions**: Reintento automático una vez

### Logging

- Errores detallados por fase
- Estadísticas de éxito/fallo
- Archivos de respaldo siempre disponibles

## 📈 Estadísticas y Métricas

Cada ejecución reporta:
- Artículos scrapeados por fuente
- Noticias relevantes filtradas  
- Posts generados por tipo y estilo
- Tiempo total de ejecución
- URLs de documentos creados

## ⚡ Optimizaciones

- **Scraping paralelo** por sitios
- **Caché inteligente** para evitar re-scraping
- **Límites de contenido** para optimizar tokens de IA
- **Fallbacks múltiples** para máxima confiabilidad

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/mejora`)
3. Commit tus cambios (`git commit -m 'Añadir mejora'`)
4. Push a la rama (`git push origin feature/mejora`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs en GitHub Actions
2. Verifica que las secrets estén configuradas
3. Comprueba que las APIs de Google estén habilitadas
4. Asegúrate de tener créditos en Anthropic

---

**🤖 Generado con orgullo usando Claude + Playwright + Node.js**