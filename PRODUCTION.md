# 🚀 Guía de Puesta en Producción - LinkedIn Content Generator

Esta guía te llevará paso a paso para configurar el sistema para que se ejecute automáticamente todos los días a las 7:00 AM (Argentina/Uruguay).

## 📋 Checklist Previo

Antes de empezar, verifica que tengas:
- ✅ **Claude API Key** configurada y funcionando
- ✅ **GitHub Token** configurado y funcionando  
- ✅ **Sistema probado localmente** (`npm start` funciona)
- ✅ **Cuenta de GitHub** (gratis está bien)

---

## 🚀 PASO 1: Crear Repositorio GitHub

### Opción A: Repositorio Público (Recomendado - GitHub Actions gratis)
```bash
# En tu directorio del proyecto
git init
git add .
git commit -m "Initial commit - LinkedIn Content Generator"

# Crear repo en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/linkedin-content-generator.git
git branch -M main
git push -u origin main
```

### Opción B: Repositorio Privado
- Si tienes GitHub Pro/Team, también funciona
- GitHub Actions tiene minutos limitados en repos privados

---

## 🔐 PASO 2: Configurar GitHub Secrets

1. **Ve a tu repositorio** en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**

### Secrets necesarios:

#### `ANTHROPIC_API_KEY`
- **Name**: `ANTHROPIC_API_KEY`
- **Secret**: Tu API key de Claude (empieza con `sk-ant-`)

#### `GH_TOKEN`
- **Name**: `GH_TOKEN` 
- **Secret**: Tu Personal Access Token (empieza con `ghp_`)

### ⚠️ **IMPORTANTE**: NO subas el archivo `.env` al repositorio
```bash
# Asegúrate de que .env esté en .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
git push
```

---

## ⏰ PASO 3: Configurar Horario (Ya configurado)

El workflow ya está configurado para:
- **🕰️ Ejecutarse diario a las 10:00 UTC** = **7:00 AM Argentina**
- **🔄 Retry automático** si algo falla
- **📊 Logs detallados** de cada ejecución

### Cambiar horario (opcional):
Si quieres otro horario, edita en `.github/workflows/daily.yml`:
```yaml
schedule:
  # Cambiar este cron para otro horario
  - cron: '0 10 * * *'  # 10:00 UTC = 7:00 AM Argentina
```

**Ejemplos de horarios:**
- `'0 11 * * *'` = 8:00 AM Argentina
- `'0 12 * * *'` = 9:00 AM Argentina
- `'30 9 * * *'` = 6:30 AM Argentina

---

## 🧪 PASO 4: Probar el Sistema

### Test Manual
1. **Ve a tu repo** → **Actions** tab
2. **LinkedIn Content Generation** → **Run workflow**
3. **Ejecutar** y ver logs en tiempo real

### Verificar que funciona:
- ✅ **Scraping**: Debe obtener 15+ artículos
- ✅ **Claude**: Debe generar 100 posts
- ✅ **Gists**: Debe crear 2 Gists privados
- ✅ **URLs**: Debe mostrar enlaces en los logs

---

## 📱 PASO 5: Encontrar tu Contenido Diario

### Ver tus Gists:
1. **GitHub** → tu perfil → **Gists** 
2. O directamente: `https://gist.github.com/TU_USUARIO`

### Los Gists que se crean cada día:
- 📝 **`Posts LinkedIn DD-MM-YYYY`** - 100 posts listos para usar
- 📊 **`Resumen Tech-IA DD-MM-YYYY`** - Análisis de noticias del día

### 📲 **Leer en móvil:**
- Los Gists se adaptan perfectamente a móvil
- Puedes marcar como favoritos los URLs para acceso rápido

---

## 🔍 PASO 6: Monitoreo y Mantenimiento

### Ver ejecuciones:
- **GitHub** → tu repo → **Actions**
- **Historial completo** de todas las ejecuciones
- **Logs detallados** si algo falla

### Si algo falla:
1. **Revisar logs** en GitHub Actions
2. **Verificar secrets** están configurados
3. **Verificar créditos** de Anthropic
4. **Retry manual** desde Actions tab

### Notificaciones:
- GitHub te enviará **email** si el workflow falla
- Puedes configurar **notificaciones** en GitHub Settings

---

## 💰 Costos de Operación

### Gratis:
- ✅ **GitHub Actions** (repo público)
- ✅ **GitHub Gists** (ilimitados)
- ✅ **Playwright/Scraping** (gratis)

### De Pago:
- 💳 **Claude API**: ~$2-5 USD/mes (generando diariamente)

### Total estimado: **$2-5 USD/mes**

---

## 🛠️ Personalización Avanzada

### Cambiar sitios scrapeados:
Editar `src/scraper.js` → `SITES_CONFIG`

### Cambiar estilos de posts:
Editar `src/generator.js` → `WRITING_STYLES` y prompts

### Cambiar cantidad de posts:
Editar `src/generator.js` → `POST_TYPES`

### Añadir notificaciones:
- Email, Slack, Discord, etc.
- Modificar `src/gist-storage.js`

---

## 🚨 Troubleshooting

### Error "No ANTHROPIC_API_KEY"
- Verificar secret en GitHub repo
- Verificar que tenga créditos en Anthropic

### Error "No GH_TOKEN"  
- Verificar secret en GitHub repo
- Verificar que token tenga scope "gist"

### Error de scraping
- Algunos sitios pueden estar temporalmente no disponibles
- El sistema continúa con otros sitios

### Workflow no se ejecuta
- Verificar que esté en rama `main`
- GitHub Actions debe estar habilitado en el repo

---

## ✅ Checklist Final

Antes de declarar "producción lista":

- [ ] Repositorio creado y código subido
- [ ] Secrets configurados (ANTHROPIC_API_KEY + GH_TOKEN) 
- [ ] Workflow ejecutado manualmente y funcionando
- [ ] Gists creados exitosamente  
- [ ] URLs de Gists accesibles desde móvil
- [ ] Horario configurado (7:00 AM Argentina)
- [ ] Notificaciones de GitHub configuradas

---

## 🎉 ¡Listo!

Una vez completados todos los pasos:

**📅 Tu sistema generará automáticamente:**
- 100 posts únicos para LinkedIn cada día
- Resumen inteligente de noticias tech
- Todo guardado en Gists privados accesibles desde cualquier dispositivo

**🔗 Cada mañana encontrarás:**
- Nuevos Gists en tu cuenta GitHub
- Enlaces en los logs de GitHub Actions
- Contenido listo para usar en LinkedIn

**¡El futuro del content marketing automatizado! 🚀**