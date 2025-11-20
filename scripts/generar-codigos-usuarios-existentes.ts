// Cargar variables de entorno PRIMERO
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env.local') });
config({ path: join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno');
}

// Crear conexión directamente
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { usuarios } from '../lib/db/schema';
import { isNull, or, eq } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL as string, {
  ssl: 'require',
  connect_timeout: 60,
});

const db = drizzle(client);

// Función para generar código de referido (copiada de generateReferralCode.ts)
async function generateReferralCode(): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    code = '';
    for (let i = 0; i < 7; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const existing = await db
      .select({ codigoReferido: usuarios.codigoReferido })
      .from(usuarios)
      .where(eq(usuarios.codigoReferido, code))
      .limit(1);

    if (existing.length === 0) {
      isUnique = true;
    } else {
      attempts++;
    }
  }

  if (!isUnique) {
    throw new Error('No se pudo generar un código de referido único después de múltiples intentos');
  }

  return code!;
}

async function generarCodigosParaUsuariosExistentes() {
  try {
    console.log('🔍 Buscando usuarios sin código de referido...');
    
    // Buscar usuarios que no tienen código de referido (null o vacío)
    const usuariosSinCodigo = await db
      .select({
        id: usuarios.id,
        email: usuarios.email,
        nombre: usuarios.nombre,
        codigoReferido: usuarios.codigoReferido,
      })
      .from(usuarios)
      .where(
        or(
          isNull(usuarios.codigoReferido),
          eq(usuarios.codigoReferido, '')
        )
      );

    console.log(`📊 Encontrados ${usuariosSinCodigo.length} usuarios sin código de referido`);

    if (usuariosSinCodigo.length === 0) {
      console.log('✅ Todos los usuarios ya tienen código de referido');
      return;
    }

    let generados = 0;
    let errores = 0;

    for (const usuario of usuariosSinCodigo) {
      try {
        const codigoReferido = await generateReferralCode();
        await db
          .update(usuarios)
          .set({ codigoReferido: codigoReferido })
          .where(eq(usuarios.id, usuario.id));
        
        console.log(`✅ Código generado para ${usuario.email}: ${codigoReferido}`);
        generados++;
      } catch (error) {
        console.error(`❌ Error al generar código para ${usuario.email}:`, error);
        errores++;
      }
    }

    console.log(`\n📈 Resumen:`);
    console.log(`   ✅ Códigos generados: ${generados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📊 Total procesados: ${usuariosSinCodigo.length}`);

  } catch (error) {
    console.error('❌ Error al generar códigos:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

generarCodigosParaUsuariosExistentes();

