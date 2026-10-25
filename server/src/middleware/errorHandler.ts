import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Strips secrets, API keys, and sensitive tokens from error messages
 */
export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return '';
  let sanitized = msg;
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 5) {
    sanitized = sanitized.split(env.GEMINI_API_KEY).join('[REDACTED_API_KEY]');
  }
  return sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
    return;
  }

  // Handle Operational App Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: sanitizeErrorMessage(err.message)
    });
    return;
  }

  const rawMessage = err?.message || String(err);
  const sanitizedMessage = sanitizeErrorMessage(rawMessage);

  // Handle Gemini Quota / Rate limit errors
  if (
    err?.status === 429 || 
    sanitizedMessage.includes('RESOURCE_EXHAUSTED') || 
    sanitizedMessage.includes('quota')
  ) {
    res.status(429).json({
      success: false,
      error: 'AI Generation Quota Exceeded',
      message: 'Gemini rate or quota limit has been reached. Please retry shortly.'
    });
    return;
  }

  // Handle Request Timeouts
  if (err?.statusCode === 504 || sanitizedMessage.includes('timed out')) {
    res.status(504).json({
      success: false,
      error: 'Gateway Timeout',
      message: 'The AI planning request timed out before completing.'
    });
    return;
  }

  // Unexpected runtime errors - strictly sanitized, never log secrets
  if (env.NODE_ENV !== 'test') {
    console.error('[Unhandled Error]:', sanitizedMessage);
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'development' ? sanitizedMessage : undefined
  });
};
