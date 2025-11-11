import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno');
}

const client = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  connect_timeout: 30,
  max: 10,
});

export const db = drizzle(client)