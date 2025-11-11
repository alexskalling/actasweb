# Variables de Entorno para ePayco

## Variables Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================
# ePayco - OnPage Checkout
# ============================================
NEXT_PUBLIC_EPAYCO_PUBLIC_KEY=tu_public_key_aqui
EPAYCO_PRIVATE_KEY=tu_private_key_aqui
EPAYCO_P_CUST_ID_CLIENTE=tu_p_cust_id_cliente_aqui
EPAYCO_P_KEY=tu_p_key_aqui
NEXT_PUBLIC_EPAYCO_TEST=true  # true para pruebas, false para producción
```

## Descripción de Variables

- **NEXT_PUBLIC_EPAYCO_PUBLIC_KEY**: Clave pública de ePayco (visible en el cliente)
- **EPAYCO_PRIVATE_KEY**: Clave privada de ePayco (solo servidor, no exponer)
- **EPAYCO_P_CUST_ID_CLIENTE**: ID del cliente en ePayco
- **EPAYCO_P_KEY**: Llave para firma de ePayco
- **NEXT_PUBLIC_EPAYCO_TEST**: `true` para entorno de pruebas, `false` para producción

## Nota

Estas credenciales se obtienen desde el panel de configuración de tu cuenta en ePayco.

