import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { env } from './config/env.js';

import { generalApiLimiter } from './middleware/rateLimiter.js';

export const createApp = () => {
  const app = express();

  // Safe CORS configuration
  const configuredOrigins = (env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedOrigins = [
    ...configuredOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);

      // Check if origin matches allowedOrigins or any Vercel deployment domain
      let isVercelDomain = false;
      try {
        isVercelDomain = /\.vercel\.app$/.test(new URL(origin).hostname);
      } catch {
        isVercelDomain = false;
      }

      if (allowedOrigins.includes(origin) || isVercelDomain) {
        return callback(null, true);
      }

      // In development or test, allow local loopback origins (localhost and 127.0.0.1 on any port)
      if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (isLocalhost) {
          return callback(null, true);
        }
      }

      return callback(new AppError('Blocked by CORS policy', 403));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  }));

  // Body parser with 100kb limit to prevent payload abuse
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Sanitized request logger
  app.use((req, res, next) => {
    if (env.NODE_ENV !== 'test') {
      const sanitizedUrl = req.url.split('?')[0]; // Strip query parameters to avoid logging tokens
      console.log(`[${new Date().toISOString()}] ${req.method} ${sanitizedUrl}`);
    }
    next();
  });

  // Root health check endpoint for cloud hosts & orchestrators (Render, Railway, Fly.io)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'EverFest Server',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Mount API endpoints with general rate limiting: supports /api, /api/v1, and direct serverless invocation
  app.use('/api', generalApiLimiter, apiRouter);
  app.use('/api/v1', generalApiLimiter, apiRouter);
  app.use('/', generalApiLimiter, apiRouter);

  // 404 handler for unknown routes
  app.use('*', (req, res, next) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
};
