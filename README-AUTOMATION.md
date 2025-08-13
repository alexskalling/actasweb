# 🤖 Automatización de Generación de Actas

Este proyecto incluye un endpoint API seguro para automatizar la generación de actas desde herramientas externas como n8n.

## 🚀 Características

- **Endpoint REST API** para procesamiento automático de archivos de audio/video
- **Autenticación segura** mediante API key
- **Validación de archivos** (tipo, tamaño, formato)
- **Procesamiento completo** que incluye transcripción y generación de acta
- **Respuesta estructurada** con transcripción y borrador del acta
- **Logging completo** para monitoreo y debugging

## 📋 Requisitos

### Variables de Entorno

Asegúrate de configurar la siguiente variable de entorno:

```env
N8N_API_KEY=tu_api_key_secreta_aqui
```

### Dependencias

El endpoint utiliza las mismas dependencias que el proyecto principal. Asegúrate de tener instaladas todas las dependencias del `package.json`.

## 🔧 Instalación

1. **Configurar la variable de entorno:**
   ```bash
   # En tu archivo .env.local o variables de entorno del servidor
   N8N_API_KEY=tu_api_key_secreta_aqui
   ```

2. **Verificar que el servidor esté funcionando:**
   ```bash
   npm run dev
   ```

3. **Probar el endpoint:**
   ```bash
   # Health check
   curl http://localhost:3000/api/automation
   
   # O usar el script de prueba
   node scripts/test-automation-api.js
   ```

## 📡 Uso del API

### Endpoint

```
POST /api/automation
```

### Autenticación

Incluye el header `x-api-key` con tu API key:

```
x-api-key: tu_api_key_secreta_aqui
```

### Parámetros

Envia los datos como `multipart/form-data`:

- `file` (requerido): Archivo de audio o video
- `email` (opcional): Email del usuario
- `name` (opcional): Nombre del usuario

### Ejemplo con cURL

```bash
curl -X POST \
  -H "x-api-key: tu_api_key_secreta_aqui" \
  -F "file=@audio.mp3" \
  -F "email=usuario@ejemplo.com" \
  -F "name=Juan Pérez" \
  http://localhost:3000/api/automation
```

### Respuesta de Éxito

```json
{
  "status": "success",
  "message": "Archivo procesado exitosamente",
  "data": {
    "transcription": "Texto completo de la transcripción...",
    "draft": "Borrador del acta generado...",
    "fileId": "nombre_del_archivo_original"
  }
}
```

## 🔗 Integración con n8n

### Configuración del Nodo HTTP Request

1. **Método:** POST
2. **URL:** `https://tu-dominio.com/api/automation`
3. **Headers:**
   ```
   x-api-key: {{ $env.N8N_API_KEY }}
   ```
4. **Body:** Form-Data
   - `file`: `{{ $binary.data }}`
   - `email`: `{{ $json.email }}`
   - `name`: `{{ $json.name }}`

### Flujo Recomendado

```
Trigger → HTTP Request → Switch → Success/Error Branches
```

### Ejemplo de Procesamiento en n8n

```javascript
// Nodo Function para procesar la respuesta
const response = $input.first().json;

if (response.status === "success") {
  // Guardar transcripción
  await $node("Database").saveTranscription({
    fileId: response.data.fileId,
    transcription: response.data.transcription
  });
  
  // Guardar borrador
  await $node("Database").saveDraft({
    fileId: response.data.fileId,
    draft: response.data.draft
  });
  
  // Enviar notificación
  await $node("Email").sendNotification({
    to: response.data.email,
    subject: "Acta generada exitosamente",
    body: `Tu acta ha sido generada. File ID: ${response.data.fileId}`
  });
  
  return response.data;
} else {
  // Manejar error
  await $node("Email").sendErrorNotification({
    error: response.message
  });
  
  throw new Error(response.message);
}
```

## 🧪 Pruebas

### Script de Prueba

```bash
# Instalar dependencias del script
cd scripts
npm install

# Probar health check
node test-automation-api.js

# Probar con archivo
node test-automation-api.js ../ruta/al/archivo.mp3
```

### Variables de Entorno para Pruebas

```bash
export API_URL=http://localhost:3000/api/automation
export N8N_API_KEY=tu_api_key_secreta_aqui
```

## 🔒 Seguridad

### Medidas Implementadas

1. **Autenticación por API Key**
2. **Validación de tipos de archivo**
3. **Límite de tamaño de archivo (500MB)**
4. **Logging de todas las operaciones**
5. **Manejo seguro de errores**

### Recomendaciones Adicionales

1. **Rate Limiting:** Considera implementar rate limiting
2. **HTTPS:** Usa siempre HTTPS en producción
3. **API Key Rotation:** Rota las API keys periódicamente
4. **Monitoreo:** Implementa alertas para errores

## 📊 Monitoreo

### Logs Automáticos

El endpoint registra automáticamente:

- Intentos de acceso (exitosos y fallidos)
- Errores de procesamiento
- Tiempo de procesamiento
- Información del archivo procesado

### Métricas Recomendadas

- Tasa de éxito/fallo
- Tiempo promedio de procesamiento
- Uso de recursos
- Errores por tipo

## 🐛 Troubleshooting

### Errores Comunes

1. **401 Unauthorized**
   - Verificar que la API key esté configurada
   - Verificar que el header `x-api-key` esté presente

2. **400 Bad Request**
   - Verificar tipo de archivo permitido
   - Verificar tamaño del archivo (máximo 500MB)

3. **500 Internal Server Error**
   - Revisar logs del servidor
   - Verificar configuración de variables de entorno

### Debugging

```bash
# Verificar health check
curl http://localhost:3000/api/automation

# Verificar logs del servidor
npm run dev
```

## 📞 Soporte

Para problemas o consultas sobre la automatización:

- Revisa los logs del servidor
- Verifica la documentación en `docs/n8n-automation-api.md`
- Contacta al equipo de desarrollo

## 🔄 Actualizaciones

Este endpoint se actualiza automáticamente con las mejoras del sistema principal de generación de actas. No requiere mantenimiento separado.
