import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getDaysRemaining(targetDateStr: string): number {
  const target = new Date(targetDateStr).getTime();
  const now = new Date().getTime();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDeadlineText(dueDateStr?: string): { text: string; isOverdue: boolean; isUrgent: boolean } {
  if (!dueDateStr) return { text: 'No due date', isOverdue: false, isUrgent: false };
  const days = getDaysRemaining(dueDateStr);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, isOverdue: true, isUrgent: true };
  if (days === 0) return { text: 'Due today', isOverdue: false, isUrgent: true };
  if (days === 1) return { text: 'Due tomorrow', isOverdue: false, isUrgent: true };
  if (days <= 7) return { text: `Due in ${days} days`, isOverdue: false, isUrgent: true };
  return { text: `Due in ${days} days`, isOverdue: false, isUrgent: false };
}

/**
 * Validates and sanitizes external URLs to prevent javascript:, data:, or malformed URI injection
 */
export function safeExternalUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Disallow javascript: or vbscript: or data:
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return null;
  }
  // Strictly allow valid http/https URLs
  if (/^https?:\/\/[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*(\:[0-9]{1,5})?(\/.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  // Auto-prefix standard web domains (e.g. example.com -> https://example.com)
  if (/^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}(\:[0-9]{1,5})?(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}
