import { createDatabaseClient } from './client.js';
import { CapturesRepository } from './repositories/captures-repository.js';
import { TodosRepository } from './repositories/todos-repository.js';
import dotenv from 'dotenv';

// Load environment variables from root .env file
dotenv.config({ path: '../../.env' });

async function testConnection() {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capture';

  console.log('Creating database client...');
  const db = createDatabaseClient(connectionString);

  console.log('Testing Captures Repository...');
  const capturesRepo = new CapturesRepository(db);

  // Create a test capture
  const capture = await capturesRepo.create({
    content: 'Test capture from Phase 2',
    userId: 'test-user-1',
  });
  console.log('✓ Created capture:', capture.id);

  // Find the capture
  const found = await capturesRepo.findById(capture.id);
  console.log('✓ Found capture:', found?.content);

  // Find unorganized captures
  const unorganized = await capturesRepo.findUnorganized('test-user-1');
  console.log('✓ Unorganized captures:', unorganized.length);

  console.log('\nTesting Todos Repository...');
  const todosRepo = new TodosRepository(db);

  // Create a test todo
  const todo = await todosRepo.create({
    content: 'Test todo from Phase 2',
    userId: 'test-user-1',
  });
  console.log('✓ Created todo:', todo.id);

  // Mark as completed
  const completed = await todosRepo.markAsCompleted(todo.id);
  console.log('✓ Marked todo as completed:', completed?.status);

  // Clean up
  await capturesRepo.delete(capture.id);
  await todosRepo.delete(todo.id);
  console.log('\n✓ Cleanup complete');

  console.log('\n✅ All tests passed!');
  process.exit(0);
}

testConnection().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
