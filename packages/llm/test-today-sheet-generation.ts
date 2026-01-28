import { config } from 'dotenv';
import { resolve } from 'path';
import { ProviderFactory } from './src/provider-factory';
import type { TodaySheetInput } from './src/types';

// Load .env from project root
config({ path: resolve(process.cwd(), '../../.env') });

async function testTodaySheetGeneration() {
  const provider = ProviderFactory.createFromEnv();

  console.log('🧪 Testing Today Sheet generation...\n');
  console.log('Provider:', process.env.LLM_PROVIDER || 'openai');

  const mockInput: TodaySheetInput = {
    captures: [
      {
        id: 'capture-1',
        userId: 'test-user',
        content: 'Need to review PR #482 for security fix. Blocking deployment.',
        timestamp: new Date(),
        metadata: null,
        organized: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'capture-2',
        userId: 'test-user',
        content: 'Schedule Q4 planning meeting with leadership team.',
        timestamp: new Date(),
        metadata: null,
        organized: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'capture-3',
        userId: 'test-user',
        content: 'Update API documentation for v2 endpoints.',
        timestamp: new Date(),
        metadata: null,
        organized: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    existingTodos: [
      {
        id: 'todo-1',
        userId: 'test-user',
        content: 'Finalize Q4 budget report',
        status: 'pending',
        dueDate: new Date(), // Due today
        completedAt: null,
        todaySheetSection: 'none',
        todaySheetOrder: null,
        timeEstimate: 'none',
        priorityScore: null,
        tags: [],
        captureId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    template: {
      id: 'template-1',
      userId: 'test-user',
      name: 'Daily Planning',
      prompt: 'Prioritize security and compliance tasks. Group related items. Highlight deadlines.',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    context: {
      currentTimeOfDay: 9, // 9 AM
      workingHoursMinutes: 480, // 8 hours
      currentDate: new Date().toISOString().split('T')[0],
    },
  };

  try {
    console.log('📝 Input:');
    console.log('  - Captures:', mockInput.captures.length);
    console.log('  - Existing todos:', mockInput.existingTodos.length);
    console.log('  - Time:', mockInput.context.currentTimeOfDay + ':00');
    console.log('  - Available:', mockInput.context.workingHoursMinutes, 'minutes\n');

    console.log('🤖 Calling LLM...\n');
    const result = await provider.generateTodaySheet(mockInput);

    console.log('✅ Generated Today Sheet:\n');
    console.log('📋 Summary:', result.summary);
    console.log('⏱️  Total time:', result.totalEstimatedMinutes, 'minutes\n');

    for (const [section, items] of Object.entries(result.sections)) {
      const sectionName = section.replace(/_/g, ' ').toUpperCase();
      console.log(`\n${sectionName} (${items.length} items):`);
      items.forEach((item, i) => {
        console.log(`  ${i + 1}. [${item.timeEstimate}] ${item.title}`);
        console.log(`     Score: ${item.priorityScore} | Tags: ${item.tags.join(', ')}`);
        console.log(`     Source: ${item.sourceType} (${item.sourceId.slice(0, 8)}...)`);
        if (item.description) {
          console.log(`     → ${item.description}`);
        }
      });
    }

    console.log('\n\n🎉 Test passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTodaySheetGeneration();
