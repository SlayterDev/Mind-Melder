import { config } from 'dotenv';
import { resolve } from 'path';
import { OllamaProvider } from './src/providers/ollama-provider';
import type { Capture, Template } from 'types';

// Load .env from project root
config({ path: resolve(process.cwd(), '../../.env') });

async function testOllamaStructuredOutput() {
  console.log('🧪 Testing Ollama Provider with Structured Outputs...\n');
  console.log('Ollama URL:', process.env.OLLAMA_BASE_URL || 'http://localhost:11434');

  const provider = new OllamaProvider({
    baseURL: process.env.OLLAMA_BASE_URL,
    model: 'mistral', // or 'llama3.1', 'qwen2.5', etc.
    temperature: 0.7,
  });

  const mockCaptures: Capture[] = [
    {
      id: 'capture-1',
      userId: 'test-user',
      content: 'Review PR #482 for security fixes by Friday',
      timestamp: new Date(),
      metadata: null,
      organized: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'capture-2',
      userId: 'test-user',
      content: 'Update API documentation for v2.0',
      timestamp: new Date(),
      metadata: null,
      organized: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockTemplate: Template = {
    id: 'template-1',
    userId: 'test-user',
    name: 'Default',
    prompt: 'Extract clear, actionable todos from the captures. Include due dates when mentioned.',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    console.log('📝 Testing organize() method...\n');
    console.log('Input captures:', mockCaptures.length);
    
    const result = await provider.organize(mockCaptures, mockTemplate);
    
    console.log('✅ Organized output received!');
    console.log('Todos extracted:', result.todos.length);
    console.log('\nTodos:');
    result.todos.forEach((todo, i) => {
      console.log(`  ${i + 1}. ${todo.content}`);
      if (todo.dueDate) {
        console.log(`     Due: ${todo.dueDate}`);
      }
    });
    
    console.log('\n🎉 Test passed! Ollama structured outputs are working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nMake sure:');
    console.error('1. Ollama is running (ollama serve)');
    console.error('2. You have a model pulled (ollama pull mistral)');
    console.error('3. OLLAMA_BASE_URL in .env is correct');
    process.exit(1);
  }
}

testOllamaStructuredOutput();
