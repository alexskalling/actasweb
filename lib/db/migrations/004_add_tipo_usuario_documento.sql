-- Agregar campos de tipo de usuario y documento a la tabla usuarios
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS tipo_usuario TEXT DEFAULT 'natural',
ADD COLUMN IF NOT EXISTS tipo_documento TEXT,
ADD COLUMN IF NOT EXISTS numero_documento TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN usuarios.tipo_usuario IS 'Tipo de usuario: natural o juridica';
COMMENT ON COLUMN usuarios.tipo_documento IS 'Tipo de documento: CC, CE, NIT, TI, PP, NIP';
COMMENT ON COLUMN usuarios.numero_documento IS 'Número de documento de identificación';




