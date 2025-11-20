import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: join(process.cwd(), '.env.local') });
config({ path: join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada en las variables de entorno');
  process.exit(1);
}

async function runMigration() {
  const sql = postgres(DATABASE_URL as string, {
    ssl: 'require',
    max: 1,
  });

  try {
    console.log('📄 Leyendo archivo de migración 005...');
    const migrationPath = join(process.cwd(), 'lib/db/migrations/005_add_codigo_referido_to_usuarios.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Ejecutando migración 005...');
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migración 005 ejecutada correctamente');
  } catch (error: any) {
    // Si la columna ya existe, no es un error crítico
    if (error?.message?.includes('already exists') || error?.code === '42701' || error?.code === '42P07') {
      console.log('⚠️  La columna ya existe, continuando...');
    } else {
      console.error('❌ Error al ejecutar la migración:', error);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

runMigration();

