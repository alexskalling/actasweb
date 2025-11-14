-- Migración: Agregar columna codigo_atencion a tabla actas
-- Fecha: 2025-01-XX
-- Descripción: Agrega columna para registrar qué código de atención se usó en el acta

ALTER TABLE public.actas
ADD COLUMN IF NOT EXISTS codigo_atencion text;

-- Comentario para documentación
COMMENT ON COLUMN public.actas.codigo_atencion IS 'Código de atención usado para generar el acta. Vacío si no se usó código.';


