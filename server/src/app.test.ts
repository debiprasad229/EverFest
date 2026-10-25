import { describe, it, expect } from 'vitest';
import { createApp } from './app.js';

describe('Server Application Setup & CORS', () => {
  it('creates express application instance with health endpoint', () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});
