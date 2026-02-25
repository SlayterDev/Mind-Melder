import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ErrorHandler');

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = (req as Request & { requestId?: string }).requestId;
  const ctx = { requestId, method: req.method, path: req.path };

  // Multer error (file upload issues)
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      logger.warn('File upload rejected: size limit exceeded', {
        ...ctx,
        multerCode: err.code,
        multerField: err.field,
      });
      return res.status(413).json({
        error: 'File too large. Maximum size is 50MB.',
      });
    }
    logger.warn('File upload error', {
      ...ctx,
      multerCode: err.code,
      message: err.message,
    });
    return res.status(400).json({
      error: `File upload error: ${err.message}`,
    });
  }

  // Zod validation error
  if (err instanceof ZodError) {
    logger.warn('Request validation failed', {
      ...ctx,
      issues: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Custom API error
  if (err instanceof ApiError) {
    const level = err.statusCode >= 500 ? 'error' : 'warn';
    logger[level]('API error', {
      ...ctx,
      statusCode: err.statusCode,
      message: err.message,
    });
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Unhandled / unexpected error
  logger.error('Unhandled server error', {
    ...ctx,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  });

  res.status(500).json({
    error: 'Internal server error',
  });
}
