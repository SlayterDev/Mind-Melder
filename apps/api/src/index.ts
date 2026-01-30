import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createDatabaseClient,
  CapturesRepository,
  TodosRepository,
  OrganizedNotesRepository,
  TemplatesRepository,
} from 'database';
import { ProviderFactory } from 'llm';
import { createCapturesRouter, createTodosRouter, createNotesRouter, createTemplatesRouter } from './routes/index.js';
import { createOrganizeRouter } from './routes/organize.js';
import { createTodaySheetRouter } from './routes/today-sheet.js';
import { errorHandler, requestLogger } from './middleware/index.js';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.API_PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capture';

// Initialize database
const db = createDatabaseClient(DATABASE_URL);
console.log('Database connected');

// LLM provider will be lazily initialized when needed
const getLLMProvider = () => {
  try {
    return ProviderFactory.createFromEnv();
  } catch (error) {
    throw new Error(
      `Failed to initialize LLM provider: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

// Initialize repositories
const capturesRepo = new CapturesRepository(db);
const todosRepo = new TodosRepository(db);
const notesRepo = new OrganizedNotesRepository(db);
const templatesRepo = new TemplatesRepository(db);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/captures', createCapturesRouter(capturesRepo));
app.use('/api/v1/todos', createTodosRouter(todosRepo));
app.use('/api/v1/notes', createNotesRouter(notesRepo));
app.use('/api/v1/templates', createTemplatesRouter(templatesRepo));
app.use('/api/v1/organize', createOrganizeRouter(db, getLLMProvider));
app.use('/api/v1/today-sheet', createTodaySheetRouter(db, getLLMProvider));

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
