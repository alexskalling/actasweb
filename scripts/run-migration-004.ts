import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada en las variables de entorno');
  process.exit(1);
}

async function runMigration() {
  const sql = postgres(DATABASE_URL, {
    ssl: 'require',
    max: 1,
  });

  try {
    console.log('📄 Leyendo archivo de migración 004...');
    const migrationPath = join(process.cwd(), 'lib/db/migrations/004_add_tipo_usuario_documento.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Ejecutando migración 004...');
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migración 004 ejecutada correctamente');
  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

