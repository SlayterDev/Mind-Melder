#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/database
node -e "
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Connecting to database...');
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });
  console.log('Migrations completed successfully!');
  await sql.end();
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
"

echo "Starting API server..."
cd /app/apps/api
exec node dist/index.js
