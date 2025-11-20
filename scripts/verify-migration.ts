import postgres from 'postgres';
import * as path from 'path';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno');
}

const client = postgres(process.env.DATABASE_URL as string, {
  ssl: 'require',
  connect_timeout: 60,
});

async function verifyMigration() {
  try {
    // Verificar si la columna existe
    const result = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'usuarios' 
      AND column_name = 'id_industria_usuario';
    `;
    
    if (result.length > 0) {
      console.log('✅ La columna id_industria_usuario existe');
    } else {
      console.log('❌ La columna id_industria_usuario NO existe. Creándola...');
      await client`
        ALTER TABLE public.usuarios
        ADD COLUMN IF NOT EXISTS id_industria_usuario integer REFERENCES public.industrias(id_industria);
      `;
      console.log('✅ Columna creada exitosamente');
    }
  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

verifyMigration();

