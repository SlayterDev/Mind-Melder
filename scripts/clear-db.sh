#!/bin/bash

# Script to clear all tables in the PostgreSQL database
# This preserves the schema but removes all data

set -e  # Exit on error

# Load environment variables from .env if it exists
if [ -f .env ]; then
  # Load environment variables, ignoring comments and blank lines
  # Using 'set -a' to export all variables defined in the sourced file
  set -a
  source .env
  set +a
fi

# Database connection parameters (with defaults)
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
POSTGRES_DB=${POSTGRES_DB:-capture}
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

# Use DATABASE_URL if provided, otherwise construct it
if [ -n "$DATABASE_URL" ]; then
  CONNECTION_STRING="$DATABASE_URL"
else
  CONNECTION_STRING="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
fi

echo "Connecting to database: ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "User: ${POSTGRES_USER}"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "Error: psql command not found. Please install PostgreSQL client tools."
  exit 1
fi

# Export password for psql (non-interactive)
export PGPASSWORD="$POSTGRES_PASSWORD"

# Clear all tables (truncate preserves schema, CASCADE handles foreign keys)
psql "$CONNECTION_STRING" <<EOF
-- Disable foreign key checks temporarily for cleaner truncation
SET session_replication_role = 'replica';

-- Truncate all tables in correct order to handle foreign key constraints
TRUNCATE TABLE 
  todos,
  organized_notes,
  captures,
  templates
CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Show table counts to confirm
SELECT 
  'captures' as table_name, COUNT(*) as row_count FROM captures
UNION ALL
SELECT 
  'organized_notes', COUNT(*) FROM organized_notes
UNION ALL
SELECT 
  'todos', COUNT(*) FROM todos
UNION ALL
SELECT 
  'templates', COUNT(*) FROM templates;
EOF

echo ""
echo "✅ All tables cleared successfully!"
echo ""

# Unset password
unset PGPASSWORD
