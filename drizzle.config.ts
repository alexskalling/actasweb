import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Cargar variables de entorno
dotenv.config({ path: join(process.cwd(), '.env.local') });
dotenv.config({ path: join(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno');
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: 'require',
  },
});

