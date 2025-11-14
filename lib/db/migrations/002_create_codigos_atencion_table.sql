-- Migración: Crear tabla codigos_atencion
-- Fecha: 2025-01-XX
-- Descripción: Crea la tabla para gestionar códigos de atención con saldo y reserva de minutos

CREATE TABLE IF NOT EXISTS public.codigos_atencion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  saldo integer NOT NULL DEFAULT 0,
  reserva integer NOT NULL DEFAULT 0,
  descripcion text,
  estado boolean NOT NULL DEFAULT true,
  fecha_creacion timestamp with time zone NOT NULL DEFAULT now()
);

-- Índice para búsqueda rápida por código
CREATE INDEX IF NOT EXISTS idx_codigos_atencion_codigo ON public.codigos_atencion(codigo);

-- Índice para filtrar por estado activo
CREATE INDEX IF NOT EXISTS idx_codigos_atencion_estado ON public.codigos_atencion(estado) WHERE estado = true;

-- Comentarios para documentación
COMMENT ON TABLE public.codigos_atencion IS 'Tabla para gestionar códigos de atención con saldo de minutos';
COMMENT ON COLUMN public.codigos_atencion.codigo IS 'Código único de atención (ej: skln12)';
COMMENT ON COLUMN public.codigos_atencion.saldo IS 'Minutos disponibles en el código';
COMMENT ON COLUMN public.codigos_atencion.reserva IS 'Minutos reservados temporalmente durante el procesamiento';
COMMENT ON COLUMN public.codigos_atencion.estado IS 'Indica si el código está activo (true) o desactivado (false)';
COMMENT ON COLUMN public.codigos_atencion.descripcion IS 'Descripción opcional del código';


