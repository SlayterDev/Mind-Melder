# API Logging

This document describes the logging architecture, conventions, and operational guidance for the Mind-Melder API.

---

## Overview

The API uses a lightweight, zero-dependency structured logger (`apps/api/src/utils/logger.ts`) that:

- Emits **human-readable** output in development and **compact JSON** in production
- Supports four **log levels**: `debug`, `info`, `warn`, `error`
- Tags every log line with a **context label** (service or route name)
- Includes ISO **timestamps** on every line
- Accepts arbitrary **metadata** key-value pairs for structured querying

---

## Log Format

### Development (default)

```
2026-02-24T14:05:01.832Z [INFO ] [HTTP] Request received {"requestId":"abc123","method":"POST","path":"/api/v1/captures"}
2026-02-24T14:05:01.920Z [INFO ] [HTTP] Request completed {"requestId":"abc123","method":"POST","path":"/api/v1/captures","status":201,"durationMs":88}
2026-02-24T14:05:02.100Z [INFO ] [OrganizationService] Organization complete {"userId":"test-user-1","capturesProcessed":5,"todosCreated":3}
```

### Production (`NODE_ENV=production`)

Each log line is a single JSON object for easy ingestion by log aggregators (Loki, Datadog, CloudWatch, etc.):

```json
{"timestamp":"2026-02-24T14:05:01.832Z","level":"info","context":"HTTP","message":"Request received","requestId":"abc123","method":"POST","path":"/api/v1/captures"}
```

---

## Log Levels

| Level   | When to use                                                      |
|---------|------------------------------------------------------------------|
| `debug` | Detailed diagnostic info (e.g. item counts, intermediate state). Hidden in production by default. |
| `info`  | Normal operational events (request in/out, service start, job complete). |
| `warn`  | Unexpected but recoverable situations (validation rejection, LLM returned invalid ID). |
| `error` | Failures that prevent an operation from completing (unhandled exceptions, downstream service errors). |

---

## Configuration

Control logging via environment variables in `.env`:

```env
# Minimum log level to emit. Options: debug | info | warn | error. Default: info
LOG_LEVEL=info

# Set to "production" to enable compact JSON output
NODE_ENV=development
```

---

## Request Logging

Every HTTP request is automatically logged by the `requestLogger` middleware
(`apps/api/src/middleware/request-logger.ts`).

**Request received fields:**

| Field         | Description                                |
|---------------|--------------------------------------------|
| `requestId`   | UUID assigned to this request              |
| `method`      | HTTP verb (GET, POST, etc.)                |
| `path`        | URL path                                   |
| `hasQuery`    | Whether query parameters are present       |
| `contentType` | `Content-Type` header value                |
| `userAgent`   | `User-Agent` header value                  |
| `ip`          | Client IP address                          |

**Request completed fields:**

| Field           | Description                              |
|-----------------|------------------------------------------|
| `requestId`     | Same UUID — links request and response   |
| `method`        | HTTP verb                                |
| `path`          | URL path                                 |
| `status`        | HTTP response status code                |
| `durationMs`    | Total request processing time (ms)       |
| `responseBytes` | `Content-Length` if set by handler       |

The level of the "completed" line reflects the status code:
- `5xx` → `error`
- `4xx` → `warn`
- `2xx / 3xx` → `info`

The `X-Request-Id` response header carries the request ID back to the client for cross-system correlation.

---

## Error Logging

The `errorHandler` middleware (`apps/api/src/middleware/error-handler.ts`) logs all errors before returning a response.

| Error type       | Log level | Key fields logged                                  |
|------------------|-----------|----------------------------------------------------|
| `MulterError`    | `warn`    | `multerCode`, `multerField`                        |
| `ZodError`       | `warn`    | `issues` (array of `{path, message}`)              |
| `ApiError` 4xx   | `warn`    | `statusCode`, `message`                            |
| `ApiError` 5xx   | `error`   | `statusCode`, `message`                            |
| Unknown error    | `error`   | `error.name`, `error.message`, `error.stack`       |

Error logs include `requestId`, `method`, and `path` for correlation.

---

## Service Logging

Each service creates its own named logger instance:

```typescript
import { createLogger } from '../utils/logger.js';
const logger = createLogger('MyService');
```

### OrganizationService

| Event                          | Level   | Key fields                                          |
|--------------------------------|---------|-----------------------------------------------------|
| Starting capture organization  | `info`  | `userId`, `templateId`, `contentLockEnabled`        |
| No unorganized captures found  | `info`  | `userId`                                            |
| Fetched captures               | `debug` | `userId`, `captureCount`                            |
| Template selected              | `debug` | `userId`, `templateName`, `source` (active/default) |
| Calling LLM                    | `info`  | `userId`, `captureCount`                            |
| LLM returned todos             | `debug` | `userId`, `todoCount`                               |
| Organization complete          | `info`  | `userId`, `capturesProcessed`, `todosCreated`       |

### TodaySheetService

| Event                          | Level   | Key fields                                          |
|--------------------------------|---------|-----------------------------------------------------|
| Generating today sheet         | `info`  | `userId`, `templateId`, `contentLockEnabled`        |
| Inputs gathered                | `debug` | `userId`, `captureCount`, `pendingTodoCount`        |
| LLM call started               | `info`  | `userId`, `captureCount`, `todoCount`               |
| LLM invalid response format    | `error` | `userId`, `error`                                   |
| LLM response received          | `debug` | `userId`, `sectionCounts`, `totalEstimatedMinutes`  |
| Item skipped (invalid ID)      | `warn`  | `userId`, `itemTitle`, `sourceId`                   |
| Sheet generated                | `info`  | `userId`, `capturesProcessed`, `todosPlaced`, `skippedCount` |

### SchedulerService

| Event                          | Level   | Key fields                                    |
|--------------------------------|---------|-----------------------------------------------|
| Initialization started         | `info`  | —                                             |
| Initialization complete        | `info`  | `activeJobCount`                              |
| Initialization failed          | `error` | error details                                 |
| Job scheduled                  | `info`  | `jobKey`, `description`, `cronExpression`     |
| Job execution started          | `info`  | `jobKey`                                      |
| Job execution succeeded        | `info`  | `jobKey`, outcome-specific fields             |
| Job execution failed           | `error` | `jobKey`, error details                       |
| Job stopped                    | `info`  | `jobKey`, `description`                       |

### TokenTrackingService

| Event                  | Level   | Key fields                                          |
|------------------------|---------|-----------------------------------------------------|
| Usage recorded         | `debug` | `userId`, `provider`, `model`, `method`, token counts |
| Failed to track usage  | `error` | `userId`, `provider`, `model`, `method`, error details |

### TranscribeRoute

| Event                           | Level   | Key fields                                         |
|---------------------------------|---------|----------------------------------------------------|
| Request received                | `info`  | `userId`, `filename`, `mimeType`, `fileSizeBytes`  |
| Provider unsupported            | `warn`  | `userId`, `llmProvider`                            |
| Background transcription started| `info`  | `userId`, `filename`, `useWhisper`                 |
| Whisper server request          | `debug` | `userId`, `whisperUrl`, `filename`                 |
| Whisper server error            | `error` | `userId`, `httpStatus`, `responseBody`             |
| Transcription completed         | `info`  | `userId`, `filename`, `durationMs`, `textLengthChars` |
| Note saved                      | `info`  | `userId`, `filename`                               |
| Background transcription failed | `error` | `userId`, `filename`, error details                |

---

## Using the Logger in New Code

### Creating a logger

```typescript
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MyServiceOrRoute');
```

The context string (e.g. `'MyServiceOrRoute'`) appears in every log line produced by this logger. Use PascalCase matching the class or module name.

### Logging patterns

```typescript
// Informational — normal operation
logger.info('Operation started', { userId, itemCount: items.length });

// Debug — verbose diagnostics (suppressed in production by default)
logger.debug('Intermediate state', { userId, data: someValue });

// Warning — unexpected but non-fatal
logger.warn('Item skipped', { userId, reason: 'invalid ID', itemId: id });

// Error — operation could not complete
logger.error('Database write failed', { userId, table: 'captures', message: err.message });

// Error with full exception serialization (includes stack trace)
logger.errorWithException('Unexpected failure', err, { userId, context: 'additionalInfo' });
```

### What NOT to log

- Raw user content (note text, capture content) — these can be sensitive
- Full audio buffers or binary data
- API keys, tokens, or credentials — even accidentally via `JSON.stringify` of settings objects
- PII beyond `userId`

---

## Application Startup Logs

At startup (`apps/api/src/index.ts`), the following events are logged:

| Event                         | Level  | Key fields                                         |
|-------------------------------|--------|----------------------------------------------------|
| Database client initialized   | `info` | `host` (password redacted)                         |
| API server started            | `info` | `port`, `nodeEnv`, `logLevel`                      |

---

## Operational Guidance

### Filtering logs in development

Use `grep` or `jq` to narrow output:

```bash
# Filter by context
pnpm dev 2>&1 | grep '\[Scheduler\]'

# Filter by log level
pnpm dev 2>&1 | grep '\[ERROR\]'
```

### Filtering JSON logs in production

```bash
# All errors from the last hour
docker logs api | jq 'select(.level == "error")' | tail -50

# All requests slower than 500ms
docker logs api | jq 'select(.durationMs > 500)'

# Trace a specific request
docker logs api | jq 'select(.requestId == "abc-123")'
```

### Adjusting log verbosity

For debugging in production without a restart, `LOG_LEVEL` can be changed via `.env` and the process restarted:

```bash
LOG_LEVEL=debug node dist/index.js
```

---

## Adding Logging to New Features

When implementing a new route or service:

1. Import and create a logger at the module level (not per-request).
2. Log at `info` at the start and end of significant operations.
3. Log at `debug` for intermediate state or data counts.
4. Log at `warn` for recoverable unexpected states.
5. Use `logger.errorWithException` when catching unknown errors so the stack trace is preserved.
6. Always include `userId` in every log line from route handlers and services.
7. Never log user-generated content (captures, note bodies, todo text).
