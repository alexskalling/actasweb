-- Migración: Agregar columna url_contenido_acta a tabla actas
-- Fecha: 2025-01-XX
-- Descripción: Agrega columna para almacenar la URL del archivo de contenido del acta

-- Agregar columna si no existe
ALTER TABLE public.actas
ADD COLUMN IF NOT EXISTS url_contenido_acta text;

-- Comentario para documentación
COMMENT ON COLUMN public.actas.url_contenido_acta IS 'URL pública del archivo de contenido del acta (_Contenido.txt)';

