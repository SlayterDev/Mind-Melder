import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('HTTP');

/**
 * Generate a short, unique request ID.
 * Uses crypto.randomUUID when available (Node 15+), otherwise falls back to a
 * timestamp + random hex string that is unique enough for log correlation.
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older Node versions
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * HTTP request/response logger middleware.
 *
 * Attaches a unique `requestId` to every incoming request and logs:
 *   - REQUEST  – method, path, query string presence, content-type, user-agent
 *   - RESPONSE – method, path, status code, duration (ms), response size
 *
 * The request ID is also sent back to the client as `X-Request-Id` for
 * easier cross-system log correlation.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();
  const start = Date.now();

  // Attach to request so route handlers can reference it
  (req as Request & { requestId: string }).requestId = requestId;

  // Expose to client for correlation
  res.setHeader('X-Request-Id', requestId);

  const hasQuery = Object.keys(req.query).length > 0;

  logger.info('Request received', {
    requestId,
    method: req.method,
    path: req.path,
    hasQuery,
    contentType: req.headers['content-type'] ?? null,
    userAgent: req.headers['user-agent'] ?? null,
    ip: req.ip ?? req.socket?.remoteAddress ?? null,
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const contentLength = res.getHeader('content-length');
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      ...(contentLength !== undefined ? { responseBytes: Number(contentLength) } : {}),
    });
  });

  next();
}
