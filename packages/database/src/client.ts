import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

let client: ReturnType<typeof postgres> | null = null;
let db: PostgresJsDatabase<typeof schema> | null = null;

export function createDatabaseClient(connectionString: string): PostgresJsDatabase<typeof schema> {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  // Create postgres.js client with connection pooling
  client = postgres(connectionString, {
    max: 10, // Maximum number of connections in the pool
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
  });

  // Create Drizzle ORM instance
  db = drizzle(client, { schema });

  return db;
}

export function getDatabaseClient(): PostgresJsDatabase<typeof schema> {
  if (!db) {
    throw new Error('Database client not initialized. Call createDatabaseClient first.');
  }
  return db;
}

export async function closeDatabaseClient() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

export type Database = PostgresJsDatabase<typeof schema>;
