import { z } from 'zod';
import { BudgetItem } from '../types/index.js';

// ==========================================
// STANDARD BUDGET CATEGORIES
// ==========================================

export const STANDARD_BUDGET_CATEGORIES = [
  'VENUE',
  'CATERING',
  'DECORATIONS',
  'PHOTOGRAPHY',
  'ENTERTAINMENT',
  'INVITATIONS',
  'TRANSPORT',
  'CONTINGENCY',
  'OTHER',
] as const;

export type StandardBudgetCategory = (typeof STANDARD_BUDGET_CATEGORIES)[number];

export interface CategoryMetadata {
  key: string;
  label: string;
  color: string;
  accentBg: string;
  description: string;
}

export const CATEGORY_METADATA: Record<string, CategoryMetadata> = {
  VENUE: {
    key: 'VENUE',
    label: 'Venue',
    color: '#4E1B46', // Deep Plum
    accentBg: '#F3EBF1',
    description: 'Estate rentals, permits, site coordinator fees, and cleaning deposits',
  },
  CATERING: {
    key: 'CATERING',
    label: 'Catering',
    color: '#CBA83E', // Restrained Gold
    accentBg: '#FAF5E8',
    description: 'Multi-course dinner, hors d’oeuvres, bar service, and cake cutting',
  },
  DECORATIONS: {
    key: 'DECORATIONS',
    label: 'Decorations',
    color: '#D97706', // Warm Amber
    accentBg: '#FEF3C7',
    description: 'Floral centerpieces, ceremony arch, lighting, drapery, and table styling',
  },
  PHOTOGRAPHY: {
    key: 'PHOTOGRAPHY',
    label: 'Photography',
    color: '#0D9488', // Teal Sage
    accentBg: '#CCFBF1',
    description: 'Full day documentary coverage, second shooter, prints, and video reels',
  },
  ENTERTAINMENT: {
    key: 'ENTERTAINMENT',
    label: 'Entertainment',
    color: '#7C3AED', // Royal Violet
    accentBg: '#EDE9FE',
    description: 'Acoustic quartet, reception live band, DJ, MC, and audio sound system',
  },
  INVITATIONS: {
    key: 'INVITATIONS',
    label: 'Invitations',
    color: '#2563EB', // Blue Sapphire
    accentBg: '#DBEAFE',
    description: 'Letterpress stationery, foil suites, postage, and custom digital RSVP portal',
  },
  TRANSPORT: {
    key: 'TRANSPORT',
    label: 'Transport',
    color: '#0284C7', // Slate Sky
    accentBg: '#E0F2FE',
    description: 'Guest charter shuttles, vintage getaway car, valet service, and parking',
  },
  CONTINGENCY: {
    key: 'CONTINGENCY',
    label: 'Contingency',
    color: '#DC2626', // Crimson Alert
    accentBg: '#FEE2E2',
    description: 'Emergency buffer (recommended 5-10%) for unexpected weather or overtime fees',
  },
  OTHER: {
    key: 'OTHER',
    label: 'Other & Incidentals',
    color: '#64748B', // Neutral Slate
    accentBg: '#F1F5F9',
    description: 'Gratuities, officiant fees, favors, guest book, and miscellaneous items',
  },
};

// Aliases for legacy/alternative naming
const CATEGORY_ALIASES: Record<string, string> = {
  DECOR_STYLING: 'DECORATIONS',
  FLORIST: 'DECORATIONS',
  RENTALS: 'DECORATIONS',
  MUSIC_DJ: 'ENTERTAINMENT',
  VIDEOGRAPHY: 'PHOTOGRAPHY',
  BAKER_CAKE: 'CATERING',
  HAIR_MAKEUP: 'OTHER',
  PERMITS: 'VENUE',
};

/**
 * Normalizes any category string into one of the 8 canonical categories (or OTHER)
 */
export function normalizeBudgetCategory(category: string): string {
  if (!category) return 'OTHER';
  const upper = category.trim().toUpperCase();
  if (CATEGORY_METADATA[upper]) return upper;
  if (CATEGORY_ALIASES[upper]) return CATEGORY_ALIASES[upper];
  return 'OTHER';
}

export function getCategoryDisplay(category: string): CategoryMetadata {
  const normalized = normalizeBudgetCategory(category);
  return CATEGORY_METADATA[normalized] || CATEGORY_METADATA.OTHER;
}

// ==========================================
// ROUNDING & CURRENCY PRECISION
// ==========================================

/**
 * Safely rounds a monetary number to 2 decimal places using epsilon to eliminate
 * IEEE 754 floating point arithmetic drift (e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3)
 */
export function roundToCents(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return 0;
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// ==========================================
// ZOD VALIDATION SCHEMA FOR BUDGET ITEMS
// ==========================================

export const BudgetItemFormSchema = z.object({
  name: z.string().trim().min(1, 'Expense item name is required'),
  category: z.string().default('VENUE'),
  estimatedCost: z.coerce
    .number({ invalid_type_error: 'Estimated cost must be a valid number' })
    .min(0, 'Estimated cost cannot be negative'),
  actualCost: z.coerce
    .number({ invalid_type_error: 'Actual cost must be a valid number' })
    .min(0, 'Actual cost cannot be negative')
    .default(0),
  paymentStatus: z.enum(['UNPAID', 'DEPOSIT_PAID', 'PAID_IN_FULL']).default('UNPAID'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  isEstimate: z.boolean().default(true),
});

export type BudgetItemFormData = z.infer<typeof BudgetItemFormSchema>;

// ==========================================
// DERIVED BUDGET METRICS INTERFACE
// ==========================================

export interface CategorySummary {
  category: string;
  label: string;
  color: string;
  accentBg: string;
  estimated: number;
  actual: number;
  count: number;
  variance: number; // estimated - actual
  percentOfTotal: number;
  isOverBudget: boolean; // actual > estimated
}

export interface BudgetMetrics {
  totalBudget: number;
  estimatedTotal: number;
  actualSpend: number;
  remainingBudget: number; // totalBudget - actualSpend
  remainingEstimated: number; // totalBudget - estimatedTotal
  budgetVariance: number; // totalBudget - estimatedTotal (positive = surplus cushion, negative = estimate exceeds total budget)
  costVariance: number; // estimatedTotal - actualSpend (positive = savings vs estimate, negative = actual overrun vs estimate)
  isOverBudget: boolean; // actualSpend > totalBudget
  isOverBudgetEstimated: boolean; // estimatedTotal > totalBudget
  overBudgetEstimatedAmount: number;
  overBudgetActualAmount: number;
  percentCommitted: number; // (estimatedTotal / totalBudget) * 100
  percentSpent: number; // (actualSpend / totalBudget) * 100
  categoryBreakdown: CategorySummary[];
}

// ==========================================
// PURE METRICS DERIVATION FUNCTION
// ==========================================

/**
 * Derives all totals, remaining funds, variances, and category subtotals from source data.
 * Guarantees that totals are never hardcoded and always reflect the current source items.
 */
export function calculateBudgetMetrics(
  totalBudget: number,
  items: BudgetItem[]
): BudgetMetrics {
  const safeTotalBudget = Math.max(0, roundToCents(totalBudget || 0));

  let rawEstimated = 0;
  let rawActual = 0;

  // Initialize all standard categories so empty categories are cleanly handled
  const catMap: Record<
    string,
    { estimated: number; actual: number; count: number }
  > = {};

  for (const cat of STANDARD_BUDGET_CATEGORIES) {
    catMap[cat] = { estimated: 0, actual: 0, count: 0 };
  }

  // Iterate over source items
  for (const item of items) {
    // Non-negative amounts validation
    const est = Math.max(0, roundToCents(item.estimatedCost || 0));
    const act = Math.max(0, roundToCents(item.actualCost || 0));

    rawEstimated += est;
    rawActual += act;

    const normCat = normalizeBudgetCategory(item.category);
    if (!catMap[normCat]) {
      catMap[normCat] = { estimated: 0, actual: 0, count: 0 };
    }
    catMap[normCat].estimated = roundToCents(catMap[normCat].estimated + est);
    catMap[normCat].actual = roundToCents(catMap[normCat].actual + act);
    catMap[normCat].count += 1;
  }

  const estimatedTotal = roundToCents(rawEstimated);
  const actualSpend = roundToCents(rawActual);

  const remainingBudget = roundToCents(safeTotalBudget - actualSpend);
  const remainingEstimated = roundToCents(safeTotalBudget - estimatedTotal);
  const budgetVariance = roundToCents(safeTotalBudget - estimatedTotal);
  const costVariance = roundToCents(estimatedTotal - actualSpend);

  const isOverBudget = actualSpend > safeTotalBudget;
  const isOverBudgetEstimated = estimatedTotal > safeTotalBudget;

  const overBudgetEstimatedAmount = isOverBudgetEstimated
    ? roundToCents(estimatedTotal - safeTotalBudget)
    : 0;

  const overBudgetActualAmount = isOverBudget
    ? roundToCents(actualSpend - safeTotalBudget)
    : 0;

  const percentCommitted =
    safeTotalBudget > 0
      ? roundToCents((estimatedTotal / safeTotalBudget) * 100)
      : 0;

  const percentSpent =
    safeTotalBudget > 0
      ? roundToCents((actualSpend / safeTotalBudget) * 100)
      : 0;

  // Build category summaries
  const categoryBreakdown: CategorySummary[] = Object.entries(catMap).map(
    ([key, data]) => {
      const meta = getCategoryDisplay(key);
      const est = roundToCents(data.estimated);
      const act = roundToCents(data.actual);
      const variance = roundToCents(est - act);
      const percentOfTotal =
        estimatedTotal > 0 ? roundToCents((est / estimatedTotal) * 100) : 0;

      return {
        category: key,
        label: meta.label,
        color: meta.color,
        accentBg: meta.accentBg,
        estimated: est,
        actual: act,
        count: data.count,
        variance,
        percentOfTotal,
        isOverBudget: act > est && est > 0,
      };
    }
  );

  return {
    totalBudget: safeTotalBudget,
    estimatedTotal,
    actualSpend,
    remainingBudget,
    remainingEstimated,
    budgetVariance,
    costVariance,
    isOverBudget,
    isOverBudgetEstimated,
    overBudgetEstimatedAmount,
    overBudgetActualAmount,
    percentCommitted,
    percentSpent,
    categoryBreakdown,
  };
}
