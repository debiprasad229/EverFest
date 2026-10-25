import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, getDaysRemaining, cn, safeExternalUrl } from './cn.js';

describe('Client Utilities', () => {
  it('formats currency correctly without fractional cents by default', () => {
    expect(formatCurrency(25000)).toBe('$25,000');
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats dates into readable format', () => {
    const formatted = formatDate('2026-10-18');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Oct');
  });

  it('calculates days remaining accurately', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const days = getDaysRemaining(futureDate.toISOString());
    expect(days).toBeGreaterThanOrEqual(9);
    expect(days).toBeLessThanOrEqual(11);
  });

  it('merges tailwind classes cleanly', () => {
    const merged = cn('px-4 py-2', 'bg-red-500', { 'text-white': true, 'hidden': false });
    expect(merged).toContain('px-4');
    expect(merged).toContain('bg-red-500');
    expect(merged).toContain('text-white');
    expect(merged).not.toContain('hidden');
  });

  it('safely sanitizes external URLs and strictly blocks script injection schemes', () => {
    // Valid HTTPS / HTTP URLs
    expect(safeExternalUrl('https://example.com')).toBe('https://example.com');
    expect(safeExternalUrl('http://example.com/portfolio')).toBe('http://example.com/portfolio');
    expect(safeExternalUrl('photographer.example.com')).toBe('https://photographer.example.com');

    // Malicious script schemes
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('JAVASCRIPT:void(0)')).toBeNull();
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();

    // Empty / null inputs
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });
});
