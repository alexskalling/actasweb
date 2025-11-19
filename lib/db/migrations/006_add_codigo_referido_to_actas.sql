-- Migración: Agregar columna codigo_referido a tabla actas
-- Fecha: 2025-01-XX
-- Descripción: Agrega columna para registrar qué código de referido se usó al pagar el acta

ALTER TABLE public.actas
ADD COLUMN IF NOT EXISTS codigo_referido text;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_actas_codigo_referido ON public.actas(codigo_referido);

-- Comentario para documentación
COMMENT ON COLUMN public.actas.codigo_referido IS 'Código de referido usado por el usuario al pagar esta acta. Vacío si no se usó código.';


