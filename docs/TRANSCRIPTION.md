# Transcription Endpoint – Implementation Plan

## Overview

This document outlines the implementation plan for adding audio transcription capabilities to Mind Melder. The transcription feature will allow users to upload audio files, which will be transcribed using LLM providers, and the transcriptions will be processed through the existing organization workflow to create structured notes and actionable todos.

## Requirements (from Issue #73)

1. Accept audio file uploads and store on server
2. Pass audio files to LLM providers for transcription
3. Store transcription as note and/or summarize by user template
4. Extract action items and store as todos
5. Handle long-running transcription with user notification

## Architecture Overview

```
┌─────────────────┐
│   Client App    │
│  (Web/Desktop)  │
└────────┬────────┘
         │ POST /api/v1/transcribe
         │ (multipart/form-data)
         │
         ▼
┌─────────────────────────────┐
│   Express API Server        │
│  - File upload middleware   │
│  - Validation               │
│  - Job creation             │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Transcription Service      │
│  - Save audio file          │
│  - Create job record        │
│  - Queue async processing   │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Background Worker         │
│  - Read audio file          │
│  - Call LLM transcribe API  │
│  - Update job status        │
│  - Run organization flow    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Notification System        │
│  - SSE event stream         │
│  - Job status updates       │
│  - Completion notification  │
└─────────────────────────────┘
```

## 1. API Endpoint Design

### POST /api/v1/transcribe

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `audio` (file): Audio file (supported formats: mp3, m4a, wav, webm, mp4, mpeg, mpga)
  - `templateId` (optional string): UUID of organization template to use
  - `language` (optional string): ISO 639-1 language code (e.g., "en", "es") - defaults to auto-detect
  - `prompt` (optional string): Additional context/instructions for transcription

**Response (202 Accepted):**
```json
{
  "jobId": "uuid",
  "status": "pending",
  "message": "Transcription job created successfully"
}
```

**Error Responses:**
- 400 Bad Request: Invalid file format, missing file, or file too large
- 413 Payload Too Large: File exceeds size limit (default: 25MB)
- 500 Internal Server Error: Server error during job creation

### GET /api/v1/transcribe/:jobId

**Response:**
```json
{
  "jobId": "uuid",
  "status": "pending" | "processing" | "completed" | "failed",
  "progress": 0-100,
  "transcription": "...",  // Only when completed
  "createdAt": "ISO timestamp",
  "completedAt": "ISO timestamp",  // Only when completed
  "error": "error message"  // Only when failed
}
```

### GET /api/v1/transcribe

List all transcription jobs for current user:
```json
{
  "jobs": [
    {
      "jobId": "uuid",
      "status": "completed",
      "filename": "recording.mp3",
      "createdAt": "ISO timestamp",
      "completedAt": "ISO timestamp"
    }
  ]
}
```

### DELETE /api/v1/transcribe/:jobId

Delete a transcription job and associated files.

## 2. Database Schema

### New Table: `transcription_jobs`

```typescript
{
  id: uuid (primary key),
  userId: string (indexed),
  filename: string,
  filePath: string,  // Relative path in storage
  fileSize: number,  // Bytes
  mimeType: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,  // 0-100
  transcription: text (nullable),
  language: string (nullable),
  templateId: uuid (nullable, foreign key to templates),
  error: text (nullable),
  metadata: jsonb (nullable),  // Provider-specific data, duration, etc.
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp (nullable)
}
```

**Indexes:**
- `userId` - for listing user's jobs
- `status` - for processing queue queries
- `createdAt` - for chronological ordering

**Relationships:**
- `userId` → users (future auth)
- `templateId` → templates (optional organization template)

## 3. File Storage Strategy

### Option A: Local Filesystem (Recommended for MVP)

**Pros:**
- Simple implementation
- No external dependencies
- Cost-effective for self-hosted
- Good for moderate usage

**Cons:**
- Not horizontally scalable
- Requires Docker volume management
- Manual backup strategy needed

**Implementation:**
```
/data/transcriptions/
  ├── {userId}/
  │   ├── {jobId}/
  │   │   ├── original.{ext}  # Original uploaded file
  │   │   └── metadata.json   # Job metadata
```

**Docker Volume:**
```yaml
volumes:
  - transcriptions:/data/transcriptions
```

**File Management:**
- Set retention policy (e.g., delete after 30 days)
- Implement cleanup job for old files
- Size limits per user (optional)

### Option B: S3-Compatible Storage (Future Enhancement)

**Pros:**
- Horizontally scalable
- Built-in redundancy
- Good for multi-instance deployments

**Cons:**
- Additional infrastructure
- Costs for cloud storage
- More complex configuration

**Compatible Services:**
- AWS S3
- MinIO (self-hosted)
- Backblaze B2
- DigitalOcean Spaces

**Implementation (future):**
```typescript
interface StorageProvider {
  save(file: Buffer, path: string): Promise<string>;
  get(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}
```

**Recommendation:** Start with filesystem storage, abstract behind a `StorageService` interface for easy migration to S3 later.

## 4. LLM Provider Support

### 4.1 OpenAI Provider

**Transcription API:** [Whisper API](https://platform.openai.com/docs/api-reference/audio/createTranscription)

**Implementation:**
```typescript
async transcribe(audioFile: Buffer | File, options?: TranscriptionOptions): Promise<string> {
  const file = new File([audioFile], 'audio.mp3', { type: 'audio/mpeg' });
  
  const response = await this.client.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
    language: options?.language,  // Optional: 'en', 'es', etc.
    prompt: options?.prompt,       // Optional context
    response_format: 'json',       // or 'text', 'srt', 'vtt'
    temperature: 0.0               // Lower = more deterministic
  });

  return response.text;
}
```

**Supported Formats:** mp3, mp4, mpeg, mpga, m4a, wav, webm
**File Size Limit:** 25 MB
**Models:** whisper-1 (only model available)
**Cost:** $0.006 per minute (as of 2024)

**Features:**
- ✅ Native transcription support
- ✅ Multi-language support (98 languages)
- ✅ Optional prompts for context
- ✅ Timestamps available (with verbose_json format)
- ✅ Speaker diarization in some cases

**Edge Cases:**
- Large files: Split into chunks if > 25MB
- Poor audio quality: Use prompt parameter to provide context
- Multiple speakers: Consider using verbose_json for timestamps

### 4.2 Anthropic Provider

**Transcription API:** ❌ **No native support**

**Workarounds:**

**Option 1: Delegate to OpenAI** (Recommended for MVP)
```typescript
async transcribe(audioFile: Buffer, options?: TranscriptionOptions): Promise<string> {
  // Use OpenAI Whisper API even when Anthropic is primary provider
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const file = new File([audioFile], 'audio.mp3', { type: 'audio/mpeg' });
  
  const response = await openaiClient.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
    language: options?.language,
    prompt: options?.prompt,
    response_format: 'json'
  });

  return response.text;
}
```

**Pros:**
- Leverages best-in-class transcription (Whisper)
- Simple implementation
- Fast and reliable

**Cons:**
- Requires OpenAI API key even when using Anthropic
- Additional cost beyond Anthropic subscription
- Mixed provider dependencies

**Option 2: Local Transcription Models** (Future)
- Use local Whisper models via faster-whisper or whisper.cpp
- Self-hosted, no API costs
- Requires GPU for reasonable performance
- Complex setup and maintenance

**Option 3: Third-Party Services** (Future)
- AssemblyAI, Deepgram, Rev.ai
- Additional service dependencies
- Extra configuration complexity

**Recommendation:** For MVP, require OpenAI API key for transcription when using Anthropic as primary provider. Document this clearly in setup guide.

### 4.3 Ollama Provider

**Transcription API:** ❌ **No native transcription in Ollama core**

**Workarounds:**

**Option 1: Local Whisper Models** (Recommended for local-first users)

Use [faster-whisper](https://github.com/SYSTRAN/faster-whisper) or [whisper.cpp](https://github.com/ggerganov/whisper.cpp) as external service:

```typescript
async transcribe(audioFile: Buffer, options?: TranscriptionOptions): Promise<string> {
  // Call local whisper service via HTTP
  const formData = new FormData();
  formData.append('audio', new Blob([audioFile]), 'audio.mp3');
  
  const response = await fetch(`${WHISPER_SERVICE_URL}/transcribe`, {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  return result.text;
}
```

**Setup:**
```bash
# Docker Compose addition
whisper-service:
  image: onerahmet/openai-whisper-asr-webservice:latest
  ports:
    - "9000:9000"
  environment:
    - ASR_MODEL=base  # or small, medium, large
    - ASR_ENGINE=faster_whisper
```

**Pros:**
- Fully self-hosted
- No API costs
- Privacy-preserving
- Good for local/air-gapped deployments

**Cons:**
- Additional service to run
- Requires more resources (GPU recommended)
- Slower than cloud APIs
- Manual model management

**Option 2: Delegate to OpenAI** (Fallback)
Same as Anthropic Option 1 - use OpenAI Whisper API.

**Option 3: Use Ollama Model for Post-Processing**
1. Use external transcription (Whisper service or OpenAI)
2. Pass raw transcription to Ollama model for cleanup/formatting
3. Ollama handles organization, not transcription itself

**Recommendation:** 
- For users prioritizing privacy: Document local Whisper setup
- For ease of use: Allow OpenAI as transcription fallback with config flag
- Provide clear documentation on setup options

### 4.4 Provider Interface Extension

Add to `LLMProvider` interface:

```typescript
interface LLMProvider {
  // ... existing methods ...
  
  /**
   * Transcribe audio file to text
   * @param audioFile - Audio file buffer
   * @param options - Transcription options (language, prompt, etc.)
   * @returns Transcribed text
   * @throws Error if transcription not supported by provider
   */
  transcribe(
    audioFile: Buffer, 
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult>;
  
  /**
   * Check if provider supports transcription
   */
  supportsTranscription(): boolean;
}

interface TranscriptionOptions {
  language?: string;      // ISO 639-1 code
  prompt?: string;        // Context hint for better accuracy
  temperature?: number;   // 0-1, lower = more deterministic
}

interface TranscriptionResult {
  text: string;
  language?: string;      // Detected language
  duration?: number;      // Audio duration in seconds
  segments?: {            // Optional timestamps
    start: number;
    end: number;
    text: string;
  }[];
}
```

## 5. Asynchronous Processing

### Why Async?

- Audio transcription can take 10-60+ seconds for longer files
- HTTP timeouts (typically 30-60 seconds)
- Better UX with progress updates
- Allows for retry logic on failures
- Enables background job queue for scalability

### Processing Flow

1. **Request Received**
   - Validate file format and size
   - Save file to storage
   - Create `transcription_jobs` record (status: pending)
   - Return 202 Accepted with jobId

2. **Background Worker**
   - Poll for pending jobs (or use job queue)
   - Update status to "processing"
   - Read audio file from storage
   - Call LLM transcription API
   - Update status to "completed" or "failed"
   - If completed, trigger organization flow

3. **Client Notification**
   - Client polls GET /api/v1/transcribe/:jobId
   - Or subscribes to SSE stream for real-time updates

### Implementation Options

#### Option A: In-Memory Job Queue (MVP)

**Pros:**
- Simple implementation
- No external dependencies
- Good for single-instance deployments

**Cons:**
- Jobs lost on server restart
- Not horizontally scalable
- Limited monitoring

**Implementation:**
```typescript
class TranscriptionQueue {
  private queue: TranscriptionJob[] = [];
  private processing = false;

  async add(job: TranscriptionJob) {
    this.queue.push(job);
    await db.transcriptionJobs.update(job.id, { status: 'pending' });
    this.processNext();
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const job = this.queue.shift()!;
    
    try {
      await this.processJob(job);
    } finally {
      this.processing = false;
      this.processNext();
    }
  }
}
```

#### Option B: BullMQ / Redis Queue (Future)

**Pros:**
- Persistent queue
- Horizontally scalable
- Built-in retry logic
- Job monitoring dashboard

**Cons:**
- Requires Redis
- More complex setup
- Additional infrastructure

**Implementation:**
```typescript
import { Queue, Worker } from 'bullmq';

const transcriptionQueue = new Queue('transcriptions', {
  connection: { host: 'redis', port: 6379 }
});

const worker = new Worker('transcriptions', async (job) => {
  await processTranscription(job.data);
}, {
  connection: { host: 'redis', port: 6379 }
});
```

#### Option C: Database-Backed Queue (Compromise)

**Pros:**
- No additional infrastructure
- Survives restarts
- Simple queries for monitoring

**Cons:**
- Not as efficient as Redis
- Polling overhead
- Limited to single worker without distributed locking

**Implementation:**
```typescript
// Poll every 5 seconds for pending jobs
setInterval(async () => {
  const pendingJobs = await db.transcriptionJobs.findPending(1);
  if (pendingJobs.length > 0) {
    await processTranscription(pendingJobs[0]);
  }
}, 5000);
```

**Recommendation for MVP:** Option C (Database-Backed Queue) offers best balance of simplicity and reliability for self-hosted deployments. Can migrate to BullMQ later if needed.

## 6. User Notification Mechanisms

### Option A: Polling (MVP - Simplest)

**Client Implementation:**
```typescript
async function checkTranscriptionStatus(jobId: string) {
  const maxAttempts = 120; // 10 minutes
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const response = await fetch(`/api/v1/transcribe/${jobId}`);
    const job = await response.json();
    
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }
    
    await sleep(5000); // Poll every 5 seconds
    attempts++;
  }
  
  throw new Error('Transcription timeout');
}
```

**Pros:**
- Simple to implement
- No server-side complexity
- Works everywhere (no special network requirements)

**Cons:**
- Wasteful (repeated requests)
- Not real-time
- Unnecessary database queries

### Option B: Server-Sent Events (SSE) (Recommended)

**Server Implementation:**
```typescript
router.get('/transcribe/:jobId/stream', (req, res) => {
  const { jobId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const checkStatus = async () => {
    const job = await db.transcriptionJobs.findById(jobId);
    res.write(`data: ${JSON.stringify(job)}\n\n`);
    
    if (job.status === 'completed' || job.status === 'failed') {
      res.end();
    }
  };

  const interval = setInterval(checkStatus, 2000);
  
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
  
  checkStatus(); // Send initial status
});
```

**Client Implementation:**
```typescript
function subscribeToTranscription(jobId: string, onUpdate: (job: any) => void) {
  const eventSource = new EventSource(`/api/v1/transcribe/${jobId}/stream`);
  
  eventSource.onmessage = (event) => {
    const job = JSON.parse(event.data);
    onUpdate(job);
    
    if (job.status === 'completed' || job.status === 'failed') {
      eventSource.close();
    }
  };
  
  eventSource.onerror = () => {
    eventSource.close();
  };
  
  return () => eventSource.close();
}
```

**Pros:**
- Real-time updates
- More efficient than polling
- Built-in reconnection
- Works with existing SSE pattern (conversations.ts)

**Cons:**
- Requires open connection
- Can be blocked by some proxies
- Browser connection limits (6 per domain)

### Option C: WebSockets (Future)

**Pros:**
- True bidirectional communication
- Most efficient
- Best for complex real-time features

**Cons:**
- Requires WebSocket server (Socket.io or ws)
- More complex infrastructure
- Sticky sessions for horizontal scaling

### Option D: Push Notifications (Future - Desktop/Mobile)

For Electron desktop app or future mobile apps:

**Pros:**
- System-level notifications
- Works when app is backgrounded
- Great UX

**Cons:**
- Platform-specific implementation
- Requires notification permissions
- Desktop-only for MVP

**Recommendation:** 
- **MVP:** Implement both Polling (Option A) and SSE (Option B)
- Start with polling in UI for simplicity
- Provide SSE endpoint for advanced clients
- Document WebSocket migration path for future

## 7. Integration with Existing Organization Flow

After transcription completes, automatically process through organization pipeline:

```typescript
async function processTranscription(jobId: string) {
  const job = await db.transcriptionJobs.findById(jobId);
  
  try {
    // 1. Update status
    await db.transcriptionJobs.update(jobId, { 
      status: 'processing' 
    });
    
    // 2. Read audio file
    const audioBuffer = await storage.read(job.filePath);
    
    // 3. Call LLM transcription
    const llmProvider = ProviderFactory.createFromSettings(settings);
    const result = await llmProvider.transcribe(audioBuffer, {
      language: job.language,
      prompt: job.metadata?.prompt
    });
    
    // 4. Save transcription
    await db.transcriptionJobs.update(jobId, {
      status: 'completed',
      transcription: result.text,
      completedAt: new Date(),
      metadata: { 
        ...job.metadata, 
        duration: result.duration,
        detectedLanguage: result.language 
      }
    });
    
    // 5. Create capture from transcription
    const capture = await db.captures.create({
      userId: job.userId,
      content: result.text,
      metadata: {
        source: 'transcription',
        jobId: job.id,
        originalFilename: job.filename
      }
    });
    
    // 6. Auto-organize if template provided
    if (job.templateId) {
      const organizationService = new OrganizationService(db, llmProvider);
      await organizationService.organizeSingleCapture(
        capture.id, 
        job.templateId
      );
    }
    
  } catch (error) {
    await db.transcriptionJobs.update(jobId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date()
    });
    throw error;
  }
}
```

## 8. File Upload Middleware

### Recommended: Multer

```bash
pnpm add multer
pnpm add -D @types/multer
```

**Configuration:**
```typescript
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = 'test-user-1'; // TODO: Get from auth
    const uploadPath = path.join(
      process.env.TRANSCRIPTION_STORAGE_PATH || '/data/transcriptions',
      userId
    );
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const jobId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${jobId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/webm',
      'audio/x-m4a',
      'video/mp4',  // Some recorders save as video
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: mp3, m4a, wav, webm, mp4'));
    }
  }
});
```

## 9. Error Handling

### Transcription Errors

1. **File Upload Errors**
   - Invalid format → 400 Bad Request
   - File too large → 413 Payload Too Large
   - Missing file → 400 Bad Request

2. **LLM API Errors**
   - Rate limit → Retry with exponential backoff
   - Invalid audio → Save error, mark as failed
   - API timeout → Retry 3 times, then fail

3. **Storage Errors**
   - Disk full → 507 Insufficient Storage
   - Permission error → 500 Internal Server Error

4. **Processing Errors**
   - Corrupted file → Mark job as failed with error message
   - Unsupported audio codec → Suggest conversion

### Retry Logic

```typescript
async function transcribeWithRetry(
  audioBuffer: Buffer, 
  options: TranscriptionOptions,
  maxRetries = 3
): Promise<TranscriptionResult> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await llmProvider.transcribe(audioBuffer, options);
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (400-499)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }
  
  throw new Error(`Transcription failed after ${maxRetries} attempts: ${lastError.message}`);
}
```

## 10. Security Considerations

### File Validation

1. **MIME Type Validation**
   - Check file extension
   - Verify MIME type in header
   - Optional: Use file-type library for deep inspection

2. **Size Limits**
   - Enforce maximum file size (25MB default)
   - Per-user quotas (future)
   - Rate limiting on uploads

3. **Filename Sanitization**
   - Never use user-provided filenames directly
   - Generate UUIDs for storage
   - Store original filename in metadata only

### Access Control

1. **User Isolation**
   - Store files in user-specific directories
   - Verify ownership before allowing access to jobs
   - Never expose file paths to clients

2. **Cleanup**
   - Implement retention policy (30 days)
   - Delete jobs and files on user request
   - Automatic cleanup of failed/orphaned jobs

### API Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const transcribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: 'Too many transcription requests, please try again later'
});

router.post('/transcribe', transcribeLimiter, upload.single('audio'), ...);
```

## 11. Testing Strategy

### Unit Tests

1. **Provider Tests**
   ```typescript
   describe('OpenAIProvider.transcribe', () => {
     it('should transcribe audio file', async () => {
       const audioBuffer = fs.readFileSync('test/fixtures/sample.mp3');
       const result = await provider.transcribe(audioBuffer);
       expect(result.text).toBeTruthy();
     });
     
     it('should handle invalid audio format', async () => {
       const invalidBuffer = Buffer.from('invalid');
       await expect(provider.transcribe(invalidBuffer)).rejects.toThrow();
     });
   });
   ```

2. **Queue Tests**
   ```typescript
   describe('TranscriptionQueue', () => {
     it('should process jobs in order', async () => {
       const job1 = await queue.add({ ... });
       const job2 = await queue.add({ ... });
       
       // job1 should complete before job2 starts
     });
   });
   ```

### Integration Tests

1. **End-to-End Flow**
   ```bash
   # Test script
   curl -X POST http://localhost:3000/api/v1/transcribe \
     -F "audio=@test/fixtures/sample.mp3" \
     -F "templateId=uuid-here"
   
   # Poll for completion
   curl http://localhost:3000/api/v1/transcribe/{jobId}
   ```

2. **Provider Integration**
   - Test with real API keys in CI/CD
   - Use small test files to minimize costs
   - Mock external APIs in unit tests

### Manual Testing

1. **Audio Formats**
   - Test each supported format (mp3, m4a, wav, webm, mp4)
   - Test with different durations (short, medium, long)
   - Test with poor audio quality

2. **Error Cases**
   - Upload invalid file types
   - Upload files > 25MB
   - Test with missing API keys
   - Simulate network failures

## 12. Documentation Requirements

### User Documentation

1. **Setup Guide** (update LLM_SETUP.md)
   - Required API keys for transcription
   - Supported audio formats
   - File size limits
   - Cost estimates per provider

2. **Usage Guide**
   - How to upload audio files
   - Expected processing time
   - Monitoring job status
   - Organization flow after transcription

### Developer Documentation

1. **API Reference**
   - Endpoint documentation
   - Request/response schemas
   - Error codes and messages

2. **Architecture Docs**
   - Component diagram
   - Data flow
   - Provider abstraction

3. **Migration Guide**
   - Upgrading from polling to SSE
   - Moving to BullMQ queue
   - Migrating to S3 storage

## 13. Configuration

### Environment Variables

Add to `.env.example`:
```bash
# Transcription Configuration
TRANSCRIPTION_ENABLED=true
TRANSCRIPTION_STORAGE_PATH=/data/transcriptions
TRANSCRIPTION_MAX_FILE_SIZE_MB=25
TRANSCRIPTION_RETENTION_DAYS=30

# Whisper Service (for Ollama users who want local transcription)
WHISPER_SERVICE_URL=http://whisper:9000

# Fallback Transcription (when primary provider doesn't support it)
TRANSCRIPTION_FALLBACK_PROVIDER=openai
TRANSCRIPTION_FALLBACK_API_KEY=sk-...
```

### Feature Flags

```typescript
const config = {
  transcription: {
    enabled: process.env.TRANSCRIPTION_ENABLED === 'true',
    maxFileSizeMB: parseInt(process.env.TRANSCRIPTION_MAX_FILE_SIZE_MB || '25'),
    retentionDays: parseInt(process.env.TRANSCRIPTION_RETENTION_DAYS || '30'),
    storageProvider: 'filesystem', // or 's3'
    notificationMethod: 'sse', // or 'polling', 'websocket'
  }
};
```

## 14. Performance Considerations

### File Upload

- Use streaming uploads to avoid loading entire file in memory
- Implement chunked uploads for very large files (future)
- Compress files client-side before upload (optional)

### Transcription

- OpenAI Whisper: ~0.5x realtime (60s audio = ~30s processing)
- Anthropic: N/A (delegated to OpenAI)
- Local Whisper: Varies by hardware (CPU: 1-2x, GPU: 0.1-0.5x)

### Storage

- Monitor disk usage, implement alerts
- Archive old transcriptions to cold storage
- Consider compression for completed jobs

### Database

- Index on status for queue queries
- Index on userId for user queries
- Consider partitioning by date for large datasets

## 15. Monitoring & Observability

### Metrics

1. **Success Rate**
   - Completed / Total jobs
   - By provider
   - By audio format

2. **Processing Time**
   - P50, P95, P99 latency
   - By file size
   - By provider

3. **Error Rates**
   - By error type
   - By provider
   - Retry success rate

### Logging

```typescript
logger.info('Transcription started', {
  jobId,
  userId,
  provider,
  fileSize,
  mimeType
});

logger.info('Transcription completed', {
  jobId,
  duration: completedAt - createdAt,
  transcriptionLength: result.text.length
});

logger.error('Transcription failed', {
  jobId,
  error: error.message,
  stack: error.stack,
  attempt: retryCount
});
```

### Alerting

- Alert on high error rate (>5%)
- Alert on slow processing (>5min average)
- Alert on disk space (>80% full)
- Alert on failed queue processing

## 16. Cost Estimates

### OpenAI Whisper

- $0.006 per minute of audio
- 1 hour meeting = $0.36
- 100 hours/month = $36/month

### Local Whisper

- $0 API costs
- Infrastructure: GPU recommended (~$50-100/month cloud GPU instance)
- Or run on existing hardware if available

### Storage

- Filesystem: Limited by disk space (~$0.10/GB/month for cloud storage)
- S3: ~$0.023/GB/month + transfer costs
- Average 5MB audio file = ~$0.0001/month

### Bandwidth

- Upload: User's bandwidth
- Download (if streaming results): Minimal (text only)

## 17. Future Enhancements

### Phase 2 Features

1. **Speaker Diarization**
   - Identify different speakers
   - Label speakers in transcription
   - Useful for meeting transcriptions

2. **Real-time Transcription**
   - Stream audio while recording
   - Get transcription as you speak
   - WebSocket-based implementation

3. **Translation**
   - Transcribe and translate simultaneously
   - Support multiple target languages
   - Leverage Whisper's translation capabilities

4. **Audio Preprocessing**
   - Noise reduction
   - Volume normalization
   - Format conversion

5. **Smart Chunking**
   - Split long audio into logical segments
   - Process in parallel for faster transcription
   - Merge results intelligently

### Phase 3 Features

1. **Video Support**
   - Extract audio from video files
   - Support YouTube URLs
   - Video file upload

2. **Calendar Integration**
   - Auto-transcribe meeting recordings
   - Link to calendar events
   - Automatic attendee tagging

3. **Templates for Meetings**
   - Meeting-specific organization templates
   - Extract action items by person
   - Generate meeting summaries

4. **Collaboration**
   - Share transcriptions
   - Collaborative editing
   - Comments on transcriptions

## 18. Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Add multer dependency
- [ ] Create transcription_jobs table migration
- [ ] Implement TranscriptionRepository
- [ ] Create TranscriptionService
- [ ] Implement filesystem storage
- [ ] Add POST /api/v1/transcribe endpoint
- [ ] Add GET /api/v1/transcribe/:jobId endpoint
- [ ] Add GET /api/v1/transcribe list endpoint
- [ ] Add DELETE /api/v1/transcribe/:jobId endpoint

### Phase 2: LLM Provider Support

- [ ] Add transcribe() to LLMProvider interface
- [ ] Implement OpenAI transcription
- [ ] Implement Anthropic transcription (delegate to OpenAI)
- [ ] Implement Ollama transcription (local or delegate)
- [ ] Add provider capability checking
- [ ] Add configuration for fallback providers

### Phase 3: Async Processing

- [ ] Implement database-backed job queue
- [ ] Add background worker
- [ ] Implement retry logic
- [ ] Add job status updates
- [ ] Add error handling and logging

### Phase 4: Notifications

- [ ] Add SSE endpoint for job status
- [ ] Implement polling support
- [ ] Add client-side helper functions
- [ ] Add progress tracking

### Phase 5: Integration

- [ ] Auto-create capture from transcription
- [ ] Trigger organization flow
- [ ] Link transcription to organized content
- [ ] Add UI components for upload

### Phase 6: Polish

- [ ] Add comprehensive tests
- [ ] Update documentation
- [ ] Add monitoring and logging
- [ ] Implement cleanup jobs
- [ ] Add rate limiting
- [ ] Security audit

## 19. Migration Path

### From Polling to SSE

```typescript
// v1: Polling
function checkStatus(jobId) {
  return fetch(`/api/v1/transcribe/${jobId}`);
}

// v2: SSE
function streamStatus(jobId, onUpdate) {
  const es = new EventSource(`/api/v1/transcribe/${jobId}/stream`);
  es.onmessage = (e) => onUpdate(JSON.parse(e.data));
  return () => es.close();
}
```

### From Filesystem to S3

1. Implement StorageProvider interface
2. Add S3StorageProvider implementation
3. Use environment variable to select provider
4. Run migration script to move existing files
5. Update documentation

### From In-Memory to BullMQ

1. Add Redis to docker-compose.yml
2. Install BullMQ dependencies
3. Replace TranscriptionQueue with BullMQ implementation
4. Update worker to use BullMQ
5. Add monitoring dashboard

## 20. Open Questions

1. **Should we support batch uploads?**
   - Upload multiple files at once
   - Process in parallel or sequential?

2. **How long should we retain transcriptions?**
   - Default: 30 days
   - Configurable per user?
   - Premium feature for longer retention?

3. **Should transcriptions be editable?**
   - Allow manual corrections
   - Re-run organization after edits
   - Version history

4. **Should we support URL uploads?**
   - YouTube, Spotify, podcast URLs
   - Download, transcribe, organize
   - Legal/copyright implications

5. **How to handle very long audio (2+ hours)?**
   - Split into chunks
   - Process in parallel
   - Progress tracking per chunk

## 21. Success Criteria

### MVP Launch

- [ ] Users can upload audio files via API
- [ ] Transcription completes successfully 95%+ of time
- [ ] Average processing time < 2x audio duration
- [ ] Clear error messages on failures
- [ ] Basic notification mechanism (polling)
- [ ] Transcriptions flow into existing organization pipeline
- [ ] Documentation for all supported providers

### Post-MVP

- [ ] SSE streaming for real-time status updates
- [ ] Support for all three LLM providers
- [ ] Retention policy and cleanup automation
- [ ] Rate limiting and security hardening
- [ ] Comprehensive test coverage (>80%)
- [ ] Performance monitoring and alerting

---

## Summary

This implementation plan provides a complete roadmap for adding transcription capabilities to Mind Melder. The design prioritizes:

1. **Provider Flexibility**: Support for OpenAI (native), Anthropic (delegated), and Ollama (local or delegated)
2. **Async Processing**: Non-blocking transcription with multiple notification options
3. **Simple Storage**: Start with filesystem, easy migration to S3
4. **Seamless Integration**: Transcriptions flow naturally into existing organization workflow
5. **Self-Hosted Friendly**: All features work in self-hosted deployments
6. **Incremental Implementation**: Clear phases from MVP to advanced features

The recommended MVP implementation:
- OpenAI Whisper for transcription (all providers)
- Filesystem storage with Docker volume
- Database-backed job queue
- SSE for real-time notifications (with polling fallback)
- Auto-organization after transcription
- Comprehensive error handling and retry logic

This foundation supports future enhancements like speaker diarization, real-time transcription, and video support.
