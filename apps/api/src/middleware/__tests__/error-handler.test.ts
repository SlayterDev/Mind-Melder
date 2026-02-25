import { describe, it, expect, vi } from 'vitest';
import { ZodError, ZodIssueCode } from 'zod';
import { errorHandler, ApiError } from '../error-handler.js';
import type { Request, Response, NextFunction } from 'express';

// Minimal mocks for Express req/res/next
function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  // Allow chaining: res.status(400).json(...)
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

const req = {} as Request;
const next = vi.fn() as unknown as NextFunction;

function makeZodError(path: (string | number)[], message: string): ZodError {
  return new ZodError([
    {
      code: ZodIssueCode.custom,
      path,
      message,
    },
  ]);
}

describe('errorHandler middleware', () => {
  describe('ZodError', () => {
    it('should respond with 400 and a details array', () => {
      const res = makeRes();
      const err = makeZodError(['content'], 'Content is required');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: [{ path: 'content', message: 'Content is required' }],
      });
    });

    it('should join nested path segments with a dot', () => {
      const res = makeRes();
      const err = makeZodError(['user', 'email'], 'Invalid email');

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [{ path: 'user.email', message: 'Invalid email' }],
        })
      );
    });

    it('should include an empty path string for top-level refinement errors', () => {
      const res = makeRes();
      const err = makeZodError([], 'At least one field must be provided');

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [{ path: '', message: 'At least one field must be provided' }],
        })
      );
    });
  });

  describe('ApiError', () => {
    it('should use the statusCode from the ApiError', () => {
      const res = makeRes();
      const err = new ApiError(404, 'Capture not found');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Capture not found' });
    });

    it('should pass through a 403 status', () => {
      const res = makeRes();
      const err = new ApiError(403, 'Forbidden');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should pass through a 409 status', () => {
      const res = makeRes();
      const err = new ApiError(409, 'Conflict');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('MulterError', () => {
    it('should respond 413 for LIMIT_FILE_SIZE', async () => {
      // Dynamically import multer to create a real MulterError
      const { MulterError } = await import('multer');
      const res = makeRes();
      const err = new MulterError('LIMIT_FILE_SIZE');

      errorHandler(err as unknown as Error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({ error: 'File too large. Maximum size is 50MB.' });
    });

    it('should respond 400 for other Multer errors', async () => {
      const { MulterError } = await import('multer');
      const res = makeRes();
      const err = new MulterError('LIMIT_UNEXPECTED_FILE');

      errorHandler(err as unknown as Error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('File upload error') })
      );
    });
  });

  describe('unknown errors', () => {
    it('should respond 500 for a generic Error', () => {
      const res = makeRes();
      const err = new Error('Something unexpected happened');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
