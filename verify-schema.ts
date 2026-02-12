/**
 * Verify database schema changes for Phase 1
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function verifySchema() {
  console.log('🔍 Verifying Phase 1 Schema Changes\n');

  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capture';
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Check if today_sheets table exists
    const todaySheetsExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'today_sheets'
      );
    `);
    const tableExists = (todaySheetsExists as any)[0]?.exists;
    console.log('✓ today_sheets table:', tableExists ? 'EXISTS' : 'MISSING');

    // Check today_sheets columns
    if (tableExists) {
      const todaySheetsColumns = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'today_sheets'
        ORDER BY ordinal_position;
      `);
      console.log('  Columns:', (todaySheetsColumns as any[]).map((r) => r.column_name).join(', '));
    }

    // Check if description column exists on todos
    const descriptionExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'todos'
        AND column_name = 'description'
      );
    `);
    console.log(
      '\n✓ todos.description column:',
      (descriptionExists as any)[0]?.exists ? 'EXISTS' : 'MISSING'
    );

    // Check if today_sheet_id column exists on todos
    const todaySheetIdExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'todos'
        AND column_name = 'today_sheet_id'
      );
    `);
    console.log(
      '✓ todos.today_sheet_id column:',
      (todaySheetIdExists as any)[0]?.exists ? 'EXISTS' : 'MISSING'
    );

    // Check FK constraint
    const fkExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE table_name = 'todos'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'todos_today_sheet_id_today_sheets_id_fk'
      );
    `);
    console.log(
      '✓ FK constraint (todos → today_sheets):',
      (fkExists as any)[0]?.exists ? 'EXISTS' : 'MISSING'
    );

    // Check indexes on today_sheets
    const indexesExist = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'today_sheets';
    `);
    console.log(
      '\n✓ today_sheets indexes:',
      (indexesExist as any[]).map((r) => r.indexname).join(', ')
    );

    console.log('\n✅ Phase 1 Schema Verification Complete!');
  } catch (error) {
    console.error('\n❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifySchema().catch(console.error);
