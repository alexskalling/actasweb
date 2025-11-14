import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno');
}

const client = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  connect_timeout: 60,
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../lib/db/migrations/001_add_billing_fields_to_usuarios.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Ejecutando migración...');
    await client.unsafe(migrationSQL);
    console.log('✅ Migración ejecutada exitosamente');
  } catch (error: any) {
    // Si la columna ya existe, no es un error crítico
    if (error?.message?.includes('already exists') || error?.code === '42701') {
      console.log('⚠️  La columna ya existe, continuando...');
    } else {
      console.error('❌ Error ejecutando migración:', error);
      throw error;
    }
  } finally {
    await client.end();
  }
}

runMigration();

