-- Migración: Agregar columna soporte a tabla actas
-- Fecha: 2025-01-XX
-- Descripción: Agrega columna para almacenar información de soporte (ej: "regeneracion desde transcripcion")

-- Agregar columna si no existe
ALTER TABLE public.actas
ADD COLUMN IF NOT EXISTS soporte text;

-- Comentario para documentación
COMMENT ON COLUMN public.actas.soporte IS 'Información de soporte, por ejemplo: "regeneracion desde transcripcion"';

