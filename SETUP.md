# 🚀 Guía de Puesta en Marcha - LinkedIn Content Generator

Esta guía te llevará paso a paso para configurar y ejecutar el sistema de generación automática de contenido para LinkedIn.

## 📋 Requisitos Previos

- **Node.js 18+** instalado
- Cuenta de **Google Cloud Platform** (gratuita)
- Cuenta de **Anthropic** con créditos para Claude
- **10-15 minutos** para configuración inicial

---

## ⚡ Inicio Rápido (5 minutos)

### 1. Clonar e Instalar
```bash
git clone <tu-repositorio>
cd linkedin-content-generator-2
npm install
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales (ver secciones siguientes)
```

### 3. Ejecutar
```bash
npm start
```

---

## 🔐 Configuración de APIs

### 🤖 Anthropic Claude API

1. **Crear cuenta**: Ve a [console.anthropic.com](https://console.anthropic.com/)
2. **Obtener créditos**: Compra créditos mínimos ($5-10 USD)
3. **Generar API Key**: 
   - Settings → API Keys → Create Key
   - Copia la key que empieza con `sk-ant-`
4. **Añadir a .env**:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui
   ```

### ☁️ Google Drive/Docs API

#### Paso 1: Configurar Google Cloud Project
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **Crear proyecto nuevo**:
   - Click "Select Project" → "New Project"
   - Nombre: `linkedin-automation` 
   - Click "Create"

#### Paso 2: Habilitar APIs
1. En tu proyecto, ve a **APIs & Services → Library**
2. Busca y habilita estas APIs:
   - ✅ **Google Drive API**
   - ✅ **Google Docs API**

#### Paso 3: Crear Service Account
1. **APIs & Services → Credentials**
2. **Create Credentials → Service Account**
3. Llenar:
   - **Name**: `linkedin-content-bot`
   - **Description**: `Bot para generar contenido LinkedIn`
   - Click "Create and Continue"
4. **Grant access** (opcional): Skip, click "Done"

#### Paso 4: Generar Clave JSON
1. En **Credentials**, encuentra tu Service Account
2. Click en el email del Service Account
3. **Keys tab → Add Key → Create new key**
4. Selecciona **JSON** → Create
5. **Descarga el archivo** `credentials.json`

#### Paso 5: Convertir a Base64
```bash
# En Linux/Mac
cat credentials.json | base64 -w 0

# En Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("credentials.json"))
```

6. **Copiar el resultado** y añadir a `.env`:
```bash
GOOGLE_CREDENTIALS=eyJjbGllbnRfZW1haWwiOiAiLi4uIiwgInByaXZhdGVfa2V5IjogIi0tLS0t...
```

#### Paso 6: Permisos de Google Drive
1. **Copia el email del Service Account** (ej: `linkedin-content-bot@proyecto.iam.gserviceaccount.com`)
2. **En tu Google Drive personal**:
   - Crea carpeta "LinkedIn Automation" (opcional)
   - Compartir carpeta con el email del Service Account
   - Dar permisos de **Editor**

---

## 🧪 Probar la Configuración

### Test Individual de Módulos

```bash
# 1. Test de scraping (5-10 min)
node -e "
import TechScraper from './src/scraper.js';
const scraper = new TechScraper();
await scraper.initialize();
const articles = await scraper.scrapeAllSites();
console.log(\`✅ \${articles.length} artículos obtenidos\`);
await scraper.close();
"

# 2. Test de Google Drive (1 min)
node -e "
import GoogleDriveStorage from './src/storage.js';
const storage = new GoogleDriveStorage();
await storage.initialize();
const test = await storage.testConnection();
console.log(test ? '✅ Google Drive OK' : '❌ Error Drive');
"

# 3. Test completo (15-20 min)
npm start
```

---

## 🔧 Desarrollo Local

### Ejecutar en Modo Debug
```bash
DEBUG=true npm start
```

### Ejecutar Solo Fases Específicas
```bash
# Solo scraping
node -e "import('./main.js').then(m => new m.default().runPhase('scraping'))"

# Solo generación (necesita artículos)
node test-generation.js

# Solo almacenamiento 
node test-storage.js
```

### Ver Logs Detallados
```bash
npm start 2>&1 | tee execution.log
```

---

## 📦 Configurar GitHub Actions

### 1. Subir Código a GitHub
```bash
git add .
git commit -m "Setup LinkedIn automation"
git push origin main
```

### 2. Configurar Secrets
1. Ve a tu repo → **Settings → Secrets and variables → Actions**
2. **New repository secret**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: tu API key de Anthropic
3. **New repository secret**:
   - Name: `GOOGLE_CREDENTIALS` 
   - Value: las credenciales en Base64

### 3. Activar Workflow
El workflow se ejecutará:
- **Automáticamente**: Todos los días 10:00 UTC
- **Manual**: Actions tab → "LinkedIn Content Generation" → "Run workflow"

---

## 🐛 Solución de Problemas

### ❌ Error de Anthropic API
```
Error: API key not found
```
**Solución**: Verifica que `ANTHROPIC_API_KEY` esté en `.env` y sea válida

### ❌ Error de Google Drive
```
Error: insufficient authentication scopes
```
**Solución**: 
1. Verifica que las APIs estén habilitadas
2. Regenera las credenciales JSON
3. Convierte de nuevo a Base64

### ❌ Error de Scraping
```
Error: Navigation timeout
```
**Solución**: 
1. Verifica tu conexión a internet
2. Algunos sitios pueden estar bloqueando el bot temporalmente
3. El sistema continuará con otros sitios

### 🔍 Logs Útiles
```bash
# Ver últimas ejecuciones
ls -la fallback/

# Ver logs detallados
DEBUG=true npm start

# Verificar instalación de Playwright
npx playwright install --dry-run
```

---

## 📈 Uso en Producción

### Monitoreo
- **GitHub Actions**: Revisa el tab Actions para ver ejecuciones
- **Google Drive**: Carpeta "LinkedIn Automation" con documentos diarios
- **Artifacts**: Descargar archivos fallback si algo falla

### Costos Esperados
- **Anthropic**: ~$1-2 USD por mes (generando diariamente)
- **Google Cloud**: Gratuito (dentro de límites)
- **GitHub Actions**: Gratuito (repositorios públicos)

### Mantenimiento
- **Semanal**: Revisar logs en GitHub Actions
- **Mensual**: Verificar créditos de Anthropic
- **Según necesidad**: Ajustar selectores si sitios cambian estructura

---

## 🚀 ¡Listo!

Tu sistema está configurado. El contenido se generará automáticamente y encontrarás:

📄 **Posts diarios**: `Posts LinkedIn DD-MM-YYYY` en Google Drive
📊 **Resumen tech**: `Resumen Tech-IA DD-MM-YYYY` en Google Drive

### Próximos Pasos
1. Revisar el primer contenido generado
2. Ajustar estilos de escritura si es necesario  
3. Monitorear ejecuciones en GitHub Actions
4. ¡Disfrutar del contenido automatizado!

---

**¿Problemas?** Revisa los logs en GitHub Actions o ejecuta localmente con `DEBUG=true npm start`