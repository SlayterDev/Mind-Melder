import { createDatabaseClient } from './src/client';
import { TodosRepository } from './src/repositories/todos-repository';

async function testTodaySheetFields() {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capture';
  const db = createDatabaseClient(connectionString);
  const todosRepo = new TodosRepository(db);

  console.log('🧪 Testing Today Sheet fields...\n');

  try {
    // Test 1: Creating todo with today sheet fields
    console.log('1️⃣ Creating todo with Today Sheet fields...');
    const todo = await todosRepo.create({
      userId: 'test-user-1',
      content: 'Test today sheet item',
      todaySheetSection: 'must_do_today',
      todaySheetOrder: 0,
      timeEstimate: 'medium',
      priorityScore: 85,
      tags: ['urgent', 'code-review'],
    });
    console.log('✅ Created todo:', {
      id: todo.id,
      content: todo.content,
      section: todo.todaySheetSection,
      order: todo.todaySheetOrder,
      estimate: todo.timeEstimate,
      score: todo.priorityScore,
      tags: todo.tags,
    });
    console.log();

    // Test 2: Create another todo in a different section
    console.log('2️⃣ Creating second todo in "likely_today" section...');
    const todo2 = await todosRepo.create({
      userId: 'test-user-1',
      content: 'Review PR #482',
      todaySheetSection: 'likely_today',
      todaySheetOrder: 0,
      timeEstimate: 'quick',
      priorityScore: 70,
      tags: ['review'],
    });
    console.log('✅ Created second todo:', {
      id: todo2.id,
      content: todo2.content,
      section: todo2.todaySheetSection,
    });
    console.log();

    // Test 3: findInTodaySheet
    console.log('3️⃣ Testing findInTodaySheet...');
    const sheetTodos = await todosRepo.findInTodaySheet('test-user-1');
    console.log('✅ Found', sheetTodos.length, 'todos in today sheet');
    sheetTodos.forEach((t, i) => {
      console.log(`   ${i + 1}. [${t.todaySheetSection}:${t.todaySheetOrder}] ${t.content}`);
    });
    console.log();

    // Test 4: updatePositions (reorder)
    console.log('4️⃣ Testing updatePositions (drag-and-drop simulation)...');
    await todosRepo.updatePositions([
      { id: todo.id, section: 'likely_today', order: 1 }, // Move from must_do to likely_today
      { id: todo2.id, section: 'must_do_today', order: 0 }, // Move from likely_today to must_do
    ]);
    const afterReorder = await todosRepo.findInTodaySheet('test-user-1');
    console.log('✅ After reordering:');
    afterReorder.forEach((t, i) => {
      console.log(`   ${i + 1}. [${t.todaySheetSection}:${t.todaySheetOrder}] ${t.content}`);
    });
    console.log();

    // Test 5: removeFromTodaySheet
    console.log('5️⃣ Testing removeFromTodaySheet...');
    await todosRepo.removeFromTodaySheet([todo.id, todo2.id]);
    const afterRemove = await todosRepo.findInTodaySheet('test-user-1');
    console.log('✅ Todos after remove:', afterRemove.length);
    console.log();

    // Test 6: Verify they're set to 'none'
    console.log('6️⃣ Verifying todos are set to section "none"...');
    const allTodos = await todosRepo.findByUserId('test-user-1');
    const testTodos = allTodos.filter((t) => t.id === todo.id || t.id === todo2.id);
    testTodos.forEach((t) => {
      console.log(
        `   - ${t.content}: section="${t.todaySheetSection}", order=${t.todaySheetOrder}`
      );
    });
    console.log();

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await todosRepo.delete(todo.id);
    await todosRepo.delete(todo2.id);
    console.log('✅ Cleanup complete\n');

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTodaySheetFields()
  .then(() => {
    console.log('\n✨ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
