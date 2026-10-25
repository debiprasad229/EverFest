import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

/**
 * Resolves client IP safely without blind header spoofing
 */
export function getClientIp(req: Request): string {
  if (req.app?.get('trust proxy') && req.ip) {
    return req.ip;
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * In-memory IP rate limiter for API endpoints
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, message } = options;
  const ipStore = new Map<string, RateLimitRecord>();

  // Periodically cleanup expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = getClientIp(req);
    const now = Date.now();
    const record = ipStore.get(clientIp);

    if (!record || now > record.resetTime) {
      ipStore.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('RateLimit-Limit', maxRequests);
      res.setHeader('RateLimit-Remaining', maxRequests - 1);
      res.setHeader('RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('RateLimit-Limit', maxRequests);
      res.setHeader('RateLimit-Remaining', 0);
      res.setHeader('RateLimit-Reset', Math.ceil(record.resetTime / 1000));

      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: message || `Rate limit exceeded. You may make up to ${maxRequests} requests per ${Math.round(windowMs / 60000)} minutes. Try again in ${retryAfterSeconds} seconds.`,
      });
      return;
    }

    record.count++;
    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    next();
  };
}

// AI planner limiter: 25 requests per 15 minutes per IP
export const aiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  message: 'AI planning rate limit exceeded. Up to 25 plans can be generated every 15 minutes per client IP.',
});

// General API limiter: 300 requests per 15 minutes per IP to prevent DoS / unbounded spam
export const generalApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 300,
  message: 'API rate limit exceeded. Up to 300 requests can be made every 15 minutes.',
});
