-- Migración: Agregar campos de facturación a la tabla usuarios
-- Fecha: 2025-01-XX
-- Descripción: Agrega campos necesarios para datos de facturación de usuarios

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS apellido_usuario text,
ADD COLUMN IF NOT EXISTS direccion_usuario text,
ADD COLUMN IF NOT EXISTS departamento_usuario text,
ADD COLUMN IF NOT EXISTS municipio_usuario text,
ADD COLUMN IF NOT EXISTS pais_usuario text DEFAULT 'Colombia',
ADD COLUMN IF NOT EXISTS tiene_datos_facturacion_usuario boolean DEFAULT false;

-- Comentarios para documentación
COMMENT ON COLUMN public.usuarios.apellido_usuario IS 'Apellido del usuario para facturación';
COMMENT ON COLUMN public.usuarios.direccion_usuario IS 'Dirección completa del usuario para facturación';
COMMENT ON COLUMN public.usuarios.departamento_usuario IS 'Departamento del usuario para facturación';
COMMENT ON COLUMN public.usuarios.municipio_usuario IS 'Municipio del usuario para facturación';
COMMENT ON COLUMN public.usuarios.pais_usuario IS 'País del usuario para facturación, por defecto Colombia';
COMMENT ON COLUMN public.usuarios.tiene_datos_facturacion_usuario IS 'Indica si el usuario ya completó sus datos de facturación';

