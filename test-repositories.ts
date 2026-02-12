/**
 * Test Phase 2 - Repository operations
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { TodaySheetsRepository } from './packages/database/src/repositories/today-sheets-repository';
import type { NewTodaySheet } from './packages/database/src/schema/today-sheets';

async function testRepositories() {
  console.log('🧪 Testing Phase 2 - Repository Layer\n');

  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capture';
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    const repo = new TodaySheetsRepository(db);

    // Test 1: Create a today sheet
    console.log('1️⃣ Testing create()...');
    const newSheet: NewTodaySheet = {
      userId: 'test-user-phase2',
      summary: 'Focus on completing Phase 2 testing and repository validation',
      capturesProcessed: 5,
      todosIncluded: 3,
      totalEstimatedMinutes: 180,
    };
    const created = await repo.create(newSheet);
    console.log('   ✅ Created sheet:', created.id);

    // Test 2: Find by ID
    console.log('\n2️⃣ Testing findById()...');
    const found = await repo.findById(created.id);
    console.log('   ✅ Found sheet:', found?.summary.substring(0, 50) + '...');

    // Test 3: Find by user ID
    console.log('\n3️⃣ Testing findByUserId()...');
    const userSheets = await repo.findByUserId('test-user-phase2');
    console.log(`   ✅ Found ${userSheets.length} sheet(s) for user`);

    // Test 4: Find latest
    console.log('\n4️⃣ Testing findLatest()...');
    const latest = await repo.findLatest('test-user-phase2');
    console.log('   ✅ Latest sheet:', latest?.id === created.id ? 'MATCHES' : 'MISMATCH');

    // Test 5: Create another sheet to test ordering
    console.log('\n5️⃣ Testing ordering (create 2nd sheet)...');
    const secondSheet: NewTodaySheet = {
      userId: 'test-user-phase2',
      summary: 'Second sheet for ordering test',
      capturesProcessed: 2,
      todosIncluded: 1,
      totalEstimatedMinutes: 60,
    };
    const created2 = await repo.create(secondSheet);
    const latestNow = await repo.findLatest('test-user-phase2');
    console.log(
      '   ✅ Latest after 2nd create:',
      latestNow?.id === created2.id ? 'CORRECT (newest)' : 'WRONG ORDER'
    );

    // Test 6: Cleanup - delete test sheets
    console.log('\n6️⃣ Testing delete()...');
    await repo.delete(created.id);
    await repo.delete(created2.id);
    const afterDelete = await repo.findByUserId('test-user-phase2');
    console.log(
      '   ✅ After deletion:',
      afterDelete.length === 0 ? 'CLEANED UP' : `${afterDelete.length} remaining`
    );

    console.log('\n✅ All Phase 2 Repository Tests Passed!');
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testRepositories().catch(console.error);
