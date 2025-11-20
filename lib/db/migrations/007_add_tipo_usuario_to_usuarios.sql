-- Migración: Agregar columna tipo_usuario_rol a tabla usuarios
-- Fecha: 2025-01-XX
-- Descripción: Agrega columna para identificar el tipo de usuario (cliente, admin, etc.)

-- Agregar columna si no existe
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS tipo_usuario_rol text DEFAULT 'cliente';

-- Actualizar registros existentes que tengan NULL a 'cliente'
UPDATE public.usuarios
SET tipo_usuario_rol = 'cliente'
WHERE tipo_usuario_rol IS NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_usuario_rol ON public.usuarios(tipo_usuario_rol);

-- Comentario para documentación
COMMENT ON COLUMN public.usuarios.tipo_usuario_rol IS 'Tipo de usuario: cliente, admin, etc. Por defecto: cliente';

