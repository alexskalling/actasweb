# API de Automatización para n8n

Este endpoint permite automatizar el proceso de generación de actas desde n8n mediante HTTP requests.

## Endpoint

```
POST /api/automation
```

## Autenticación

El endpoint requiere autenticación mediante API key en el header:

```
x-api-key: YOUR_API_KEY
```

## Variables de Entorno Requeridas

Asegúrate de configurar la siguiente variable de entorno en tu servidor:

```env
N8N_API_KEY=tu_api_key_secreta_aqui
```

## Parámetros

### FormData (multipart/form-data)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | File | ✅ | Archivo de audio o video |
| `email` | String | ❌ | Email del usuario (opcional) |
| `name` | String | ❌ | Nombre del usuario (opcional) |

### Tipos de Archivo Permitidos

**Audio:**
- .wav, .mp3, .m4a, .aac, .ogg, .wma, .flac

**Video:**
- .mp4, .avi, .mov, .wmv, .flv, .mkv, .webm

### Límites

- **Tamaño máximo:** 500MB
- **Tiempo de procesamiento:** Variable según el tamaño del archivo

## Respuesta

### Éxito (200)

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

### Error (400, 401, 500)

```json
{
  "status": "error",
  "message": "Descripción del error"
}
```

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Procesamiento exitoso |
| 400 | Error en los datos enviados (archivo inválido, etc.) |
| 401 | API key inválida o no proporcionada |
| 500 | Error interno del servidor |

## Ejemplo de Uso con n8n

### 1. Configuración del Nodo HTTP Request

```json
{
  "method": "POST",
  "url": "https://tu-dominio.com/api/automation",
  "headers": {
    "x-api-key": "{{ $env.N8N_API_KEY }}"
  },
  "formData": {
    "file": "{{ $binary.data }}",
    "email": "{{ $json.email }}",
    "name": "{{ $json.name }}"
  }
}
```

### 2. Flujo de n8n Recomendado

1. **Trigger Node** (ej: Webhook, File Trigger, etc.)
2. **HTTP Request Node** → POST a `/api/automation`
3. **Switch Node** → Verificar `status` en la respuesta
4. **Success Branch** → Procesar `data.transcription` y `data.draft`
5. **Error Branch** → Manejar errores

### 3. Ejemplo de Respuesta en n8n

```javascript
// En un nodo Function para procesar la respuesta
const response = $input.first().json;

if (response.status === "success") {
  // Procesar transcripción
  const transcription = response.data.transcription;
  
  // Procesar borrador del acta
  const draft = response.data.draft;
  
  // Guardar en base de datos, enviar email, etc.
  return {
    transcription,
    draft,
    fileId: response.data.fileId
  };
} else {
  // Manejar error
  throw new Error(response.message);
}
```

## Consideraciones de Seguridad

1. **API Key:** Mantén tu API key segura y no la compartas
2. **Rate Limiting:** Considera implementar rate limiting para prevenir abuso
3. **Validación:** El endpoint valida automáticamente tipos de archivo y tamaños
4. **Logs:** Todas las operaciones se registran en los logs del servidor

## Monitoreo

El endpoint registra automáticamente:
- Intentos de acceso (exitosos y fallidos)
- Errores de procesamiento
- Tiempo de procesamiento
- Información del archivo procesado

## Pruebas

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
export N8N_API_KEY=tu-api-key
```

## Soporte

Para problemas o consultas sobre este endpoint, contacta al equipo de desarrollo.
