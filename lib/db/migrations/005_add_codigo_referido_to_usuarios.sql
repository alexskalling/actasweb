-- Migración: Agregar columna codigo_referido a tabla usuarios
-- Fecha: 2025-01-XX
-- Descripción: Agrega columna para almacenar el código único de referido de cada usuario

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS codigo_referido text UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_codigo_referido ON public.usuarios(codigo_referido);

-- Comentario para documentación
COMMENT ON COLUMN public.usuarios.codigo_referido IS 'Código único de referido del usuario (7 caracteres alfanuméricos en mayúsculas)';


