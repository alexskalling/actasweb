import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno');
}

const client = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  connect_timeout: 60,
});

async function runMigration() {
  try {
    const migrationPath = path.join(process.cwd(), 'lib/db/migrations/002_create_codigos_atencion_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('Ejecutando migración 002...');
    await client.unsafe(migrationSQL);
    console.log('✅ Migración 002 ejecutada exitosamente');
  } catch (error: any) {
    if (error?.message?.includes('already exists') || error?.code === '42701') {
      console.log('⚠️  La tabla ya existe, continuando...');
    } else {
      console.error('❌ Error ejecutando migración:', error);
      throw error;
    }
  } finally {
    await client.end();
  }
}

runMigration();


