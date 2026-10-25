import { describe, it, expect } from 'vitest';
import { 
  calculateBudgetMetrics, 
  roundToCents, 
  normalizeBudgetCategory, 
  STANDARD_BUDGET_CATEGORIES,
  BudgetItemFormSchema
} from './budgetCalculations.js';
import { BudgetItem } from '../types/index.js';

describe('budgetCalculations utility', () => {
  const createMockItem = (overrides: Partial<BudgetItem>): BudgetItem => ({
    id: `bgt-test-${Math.random()}`,
    eventId: 'evt-test-1',
    category: 'VENUE',
    name: 'Test Item',
    estimatedCost: 1000,
    actualCost: 500,
    paymentStatus: 'UNPAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  // ==========================================
  // 1. TOTALS DERIVATION
  // ==========================================
  describe('Totals Derivation', () => {
    it('correctly calculates total estimated and actual spend across multiple items', () => {
      const items: BudgetItem[] = [
        createMockItem({ category: 'VENUE', estimatedCost: 5000, actualCost: 5000 }),
        createMockItem({ category: 'CATERING', estimatedCost: 3500, actualCost: 1750 }),
        createMockItem({ category: 'PHOTOGRAPHY', estimatedCost: 2000, actualCost: 0 }),
        createMockItem({ category: 'DECORATIONS', estimatedCost: 1500, actualCost: 800 }),
        createMockItem({ category: 'ENTERTAINMENT', estimatedCost: 1200, actualCost: 1200 }),
        createMockItem({ category: 'INVITATIONS', estimatedCost: 600, actualCost: 600 }),
        createMockItem({ category: 'TRANSPORT', estimatedCost: 800, actualCost: 0 }),
        createMockItem({ category: 'CONTINGENCY', estimatedCost: 1000, actualCost: 0 }),
      ];

      const metrics = calculateBudgetMetrics(20000, items);

      // Estimated: 5000 + 3500 + 2000 + 1500 + 1200 + 600 + 800 + 1000 = 15600
      expect(metrics.estimatedTotal).toBe(15600);
      // Actual: 5000 + 1750 + 0 + 800 + 1200 + 600 + 0 + 0 = 9350
      expect(metrics.actualSpend).toBe(9350);
      // Cost Variance: 15600 - 9350 = 6250 (savings vs estimated allocation)
      expect(metrics.costVariance).toBe(6250);
      // Budget Variance: 20000 - 15600 = 4400 (unallocated budget safety buffer)
      expect(metrics.budgetVariance).toBe(4400);
    });

    it('derives category-specific subtotals from source items', () => {
      const items: BudgetItem[] = [
        createMockItem({ category: 'CATERING', estimatedCost: 2000, actualCost: 1000 }),
        createMockItem({ category: 'CATERING', estimatedCost: 1500, actualCost: 750 }),
        createMockItem({ category: 'VENUE', estimatedCost: 6000, actualCost: 6000 }),
      ];

      const metrics = calculateBudgetMetrics(10000, items);
      const catering = metrics.categoryBreakdown.find(c => c.category === 'CATERING');
      const venue = metrics.categoryBreakdown.find(c => c.category === 'VENUE');

      expect(catering).toBeDefined();
      expect(catering?.estimated).toBe(3500);
      expect(catering?.actual).toBe(1750);
      expect(catering?.count).toBe(2);
      expect(catering?.variance).toBe(1750);

      expect(venue).toBeDefined();
      expect(venue?.estimated).toBe(6000);
      expect(venue?.actual).toBe(6000);
      expect(venue?.count).toBe(1);
      expect(venue?.variance).toBe(0);
    });
  });

  // ==========================================
  // 2. REMAINING BALANCE CALCULATION
  // ==========================================
  describe('Remaining Balance Calculation', () => {
    it('calculates remaining budget accurately against actual spend', () => {
      const items: BudgetItem[] = [
        createMockItem({ estimatedCost: 4000, actualCost: 2500 }),
      ];

      const metrics = calculateBudgetMetrics(10000, items);
      // Remaining Budget = 10000 - 2500 = 7500
      expect(metrics.remainingBudget).toBe(7500);
      // Remaining Estimated = 10000 - 4000 = 6000
      expect(metrics.remainingEstimated).toBe(6000);
    });

    it('handles zero spend leaving 100% of the budget remaining', () => {
      const items: BudgetItem[] = [
        createMockItem({ estimatedCost: 3000, actualCost: 0 }),
      ];

      const metrics = calculateBudgetMetrics(15000, items);
      expect(metrics.remainingBudget).toBe(15000);
      expect(metrics.actualSpend).toBe(0);
      expect(metrics.percentSpent).toBe(0);
    });

    it('handles exact budget exhaustion where remaining balance is zero', () => {
      const items: BudgetItem[] = [
        createMockItem({ estimatedCost: 8000, actualCost: 8000 }),
      ];

      const metrics = calculateBudgetMetrics(8000, items);
      expect(metrics.remainingBudget).toBe(0);
      expect(metrics.budgetVariance).toBe(0);
      expect(metrics.isOverBudget).toBe(false);
    });

    it('reflects negative remaining balance when actual spend exceeds budget', () => {
      const items: BudgetItem[] = [
        createMockItem({ estimatedCost: 5000, actualCost: 6500 }),
      ];

      const metrics = calculateBudgetMetrics(5000, items);
      expect(metrics.remainingBudget).toBe(-1500);
      expect(metrics.overBudgetActualAmount).toBe(1500);
      expect(metrics.isOverBudget).toBe(true);
    });
  });

  // ==========================================
  // 3. ROUNDING & PRECISION
  // ==========================================
  describe('Rounding & Precision', () => {
    it('eliminates IEEE 754 floating point arithmetic drift', () => {
      expect(roundToCents(0.1 + 0.2)).toBe(0.3);
      expect(roundToCents(1.005)).toBe(1.01);
      expect(roundToCents(10.333333)).toBe(10.33);
      expect(roundToCents(10.335)).toBe(10.34);
    });

    it('handles sub-cent fractions without accumulating rounding drift across items', () => {
      const items: BudgetItem[] = [
        createMockItem({ estimatedCost: 10.333, actualCost: 5.123 }),
        createMockItem({ estimatedCost: 20.333, actualCost: 10.123 }),
        createMockItem({ estimatedCost: 30.334, actualCost: 15.124 }),
      ];

      const metrics = calculateBudgetMetrics(100.555, items);
      // Budget: 100.56
      expect(metrics.totalBudget).toBe(100.56);
      // Est: 10.33 + 20.33 + 30.33 = 60.99
      expect(metrics.estimatedTotal).toBe(60.99);
      // Act: 5.12 + 10.12 + 15.12 = 30.36
      expect(metrics.actualSpend).toBe(30.36);
      // Remaining: 100.56 - 30.36 = 70.20
      expect(metrics.remainingBudget).toBe(70.20);
    });

    it('safely handles non-numeric or infinite values in roundToCents', () => {
      expect(roundToCents(NaN)).toBe(0);
      expect(roundToCents(Infinity)).toBe(0);
      expect(roundToCents(-Infinity)).toBe(0);
    });

    it('enforces non-negative values and ignores negative tampering', () => {
      const items: BudgetItem[] = [
        createMockItem({ estimatedCost: -500, actualCost: -200 }),
      ];

      const metrics = calculateBudgetMetrics(5000, items);
      expect(metrics.estimatedTotal).toBe(0);
      expect(metrics.actualSpend).toBe(0);
      expect(metrics.remainingBudget).toBe(5000);
    });
  });

  // ==========================================
  // 4. EMPTY CATEGORIES HANDLING
  // ==========================================
  describe('Empty Categories Handling', () => {
    it('returns clean zeroed metrics for an empty budget list without NaN', () => {
      const metrics = calculateBudgetMetrics(10000, []);

      expect(metrics.totalBudget).toBe(10000);
      expect(metrics.estimatedTotal).toBe(0);
      expect(metrics.actualSpend).toBe(0);
      expect(metrics.remainingBudget).toBe(10000);
      expect(metrics.remainingEstimated).toBe(10000);
      expect(metrics.budgetVariance).toBe(10000);
      expect(metrics.costVariance).toBe(0);
      expect(metrics.isOverBudget).toBe(false);
      expect(metrics.isOverBudgetEstimated).toBe(false);
      expect(metrics.percentCommitted).toBe(0);
      expect(metrics.percentSpent).toBe(0);

      // Verify all 8 standard categories + OTHER are present and zeroed
      expect(metrics.categoryBreakdown.length).toBeGreaterThanOrEqual(8);
      for (const cat of STANDARD_BUDGET_CATEGORIES) {
        const found = metrics.categoryBreakdown.find(c => c.category === cat);
        expect(found).toBeDefined();
        expect(found?.count).toBe(0);
        expect(found?.estimated).toBe(0);
        expect(found?.actual).toBe(0);
        expect(found?.variance).toBe(0);
        expect(found?.isOverBudget).toBe(false);
      }
    });

    it('maintains zero totals for unpopulated categories when only one category has items', () => {
      const items: BudgetItem[] = [
        createMockItem({ category: 'CONTINGENCY', estimatedCost: 1500, actualCost: 0 }),
      ];

      const metrics = calculateBudgetMetrics(15000, items);

      const contingency = metrics.categoryBreakdown.find(c => c.category === 'CONTINGENCY');
      expect(contingency?.count).toBe(1);
      expect(contingency?.estimated).toBe(1500);

      const transport = metrics.categoryBreakdown.find(c => c.category === 'TRANSPORT');
      expect(transport?.count).toBe(0);
      expect(transport?.estimated).toBe(0);
      expect(transport?.actual).toBe(0);
    });
  });

  // ==========================================
  // 5. OVER-BUDGET CONDITIONS
  // ==========================================
  describe('Over-Budget Conditions & Warnings', () => {
    it('flags overBudgetEstimated when planned allocations exceed total budget', () => {
      const items: BudgetItem[] = [
        createMockItem({ category: 'VENUE', estimatedCost: 7000, actualCost: 0 }),
        createMockItem({ category: 'CATERING', estimatedCost: 4000, actualCost: 0 }),
      ];

      // Total Budget: 10,000 | Estimated Total: 11,000
      const metrics = calculateBudgetMetrics(10000, items);

      expect(metrics.isOverBudgetEstimated).toBe(true);
      expect(metrics.overBudgetEstimatedAmount).toBe(1000);
      expect(metrics.budgetVariance).toBe(-1000);
      // Actual spend is still 0 so actual is not over budget
      expect(metrics.isOverBudget).toBe(false);
      expect(metrics.remainingBudget).toBe(10000);
    });

    it('flags overBudget when actual spend exceeds total budget', () => {
      const items: BudgetItem[] = [
        createMockItem({ category: 'VENUE', estimatedCost: 5000, actualCost: 5500 }),
      ];

      // Total Budget: 5,000 | Actual: 5,500
      const metrics = calculateBudgetMetrics(5000, items);

      expect(metrics.isOverBudget).toBe(true);
      expect(metrics.overBudgetActualAmount).toBe(500);
      expect(metrics.remainingBudget).toBe(-500);
    });

    it('correctly handles boundary edge cases: exact match vs 0.01 cent over', () => {
      // 1. Exact match
      const exactItems: BudgetItem[] = [
        createMockItem({ estimatedCost: 5000, actualCost: 5000 }),
      ];
      const exactMetrics = calculateBudgetMetrics(5000, exactItems);
      expect(exactMetrics.isOverBudgetEstimated).toBe(false);
      expect(exactMetrics.isOverBudget).toBe(false);
      expect(exactMetrics.budgetVariance).toBe(0);

      // 2. Exactly 1 cent over budget
      const overItems: BudgetItem[] = [
        createMockItem({ estimatedCost: 5000.01, actualCost: 5000.01 }),
      ];
      const overMetrics = calculateBudgetMetrics(5000, overItems);
      expect(overMetrics.isOverBudgetEstimated).toBe(true);
      expect(overMetrics.overBudgetEstimatedAmount).toBe(0.01);
      expect(overMetrics.isOverBudget).toBe(true);
      expect(overMetrics.overBudgetActualAmount).toBe(0.01);
    });
  });

  // ==========================================
  // 6. CATEGORY NORMALIZATION & VALIDATION
  // ==========================================
  describe('Category Normalization & Validation', () => {
    it('normalizes legacy and alias category strings to standard categories', () => {
      expect(normalizeBudgetCategory('DECOR_STYLING')).toBe('DECORATIONS');
      expect(normalizeBudgetCategory('FLORIST')).toBe('DECORATIONS');
      expect(normalizeBudgetCategory('MUSIC_DJ')).toBe('ENTERTAINMENT');
      expect(normalizeBudgetCategory('VIDEOGRAPHY')).toBe('PHOTOGRAPHY');
      expect(normalizeBudgetCategory('BAKER_CAKE')).toBe('CATERING');
      expect(normalizeBudgetCategory('UNKNOWN_CAT')).toBe('OTHER');
    });

    it('validates non-negative amounts with Zod Form Schema', () => {
      const valid = BudgetItemFormSchema.safeParse({
        name: 'Sound System Rental',
        category: 'ENTERTAINMENT',
        estimatedCost: 1200,
        actualCost: 600,
        paymentStatus: 'DEPOSIT_PAID',
        isEstimate: true,
      });
      expect(valid.success).toBe(true);

      const invalidNegativeEst = BudgetItemFormSchema.safeParse({
        name: 'Invalid Item',
        category: 'VENUE',
        estimatedCost: -100,
      });
      expect(invalidNegativeEst.success).toBe(false);

      const invalidNegativeAct = BudgetItemFormSchema.safeParse({
        name: 'Invalid Item',
        category: 'VENUE',
        estimatedCost: 500,
        actualCost: -50,
      });
      expect(invalidNegativeAct.success).toBe(false);
    });
  });

  // ==========================================
  // 7. EXTREME BUDGET & ARITHMETIC EDGE CASES
  // ==========================================
  describe('Extreme Budget & Arithmetic Edge Cases', () => {
    it('handles zero totalBudget with positive expenses without crashing or dividing by zero', () => {
      const items: BudgetItem[] = [
        createMockItem({ estimatedCost: 1500, actualCost: 1200 }),
      ];

      const metrics = calculateBudgetMetrics(0, items);

      expect(metrics.totalBudget).toBe(0);
      expect(metrics.actualSpend).toBe(1200);
      expect(metrics.estimatedTotal).toBe(1500);
      expect(metrics.remainingBudget).toBe(-1200);
      expect(metrics.isOverBudget).toBe(true);
      expect(metrics.isOverBudgetEstimated).toBe(true);
      // Percentage when totalBudget is 0 should be safely 0, not NaN or Infinity
      expect(metrics.percentCommitted).toBe(0);
      expect(metrics.percentSpent).toBe(0);
      expect(Number.isFinite(metrics.percentSpent)).toBe(true);
    });

    it('accurately handles multi-million dollar budgets ($50,000,000) without numeric overflow', () => {
      const largeBudget = 50000000;
      const items: BudgetItem[] = [
        createMockItem({ category: 'VENUE', estimatedCost: 15000000, actualCost: 14500000 }),
        createMockItem({ category: 'CATERING', estimatedCost: 20000000, actualCost: 19800000 }),
        createMockItem({ category: 'ENTERTAINMENT', estimatedCost: 5000000, actualCost: 5200000 }),
      ];

      const metrics = calculateBudgetMetrics(largeBudget, items);

      expect(metrics.totalBudget).toBe(50000000);
      expect(metrics.estimatedTotal).toBe(40000000);
      expect(metrics.actualSpend).toBe(39500000);
      expect(metrics.remainingBudget).toBe(10500000);
      expect(metrics.budgetVariance).toBe(10000000);
      expect(metrics.costVariance).toBe(500000);
      expect(metrics.isOverBudget).toBe(false);
      expect(metrics.percentSpent).toBe(79);
    });

    it('safely handles items with missing or undefined cost properties', () => {
      const itemsWithMissingFields = [
        {
          id: 'test-undef-1',
          eventId: 'evt-1',
          category: 'OTHER',
          name: 'Item without costs',
          paymentStatus: 'UNPAID' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as BudgetItem,
        createMockItem({ estimatedCost: 500, actualCost: 250 }),
      ];

      const metrics = calculateBudgetMetrics(1000, itemsWithMissingFields);
      expect(metrics.estimatedTotal).toBe(500);
      expect(metrics.actualSpend).toBe(250);
      expect(metrics.remainingBudget).toBe(750);
      expect(metrics.isOverBudget).toBe(false);
    });

    it('correctly tracks category-level over-budget independent of overall event budget', () => {
      // Event total budget is 20,000, catering estimate is 5,000, but catering actual is 6,500.
      // Overall event is NOT over budget (actual 6,500 < 20,000), but Catering category IS over budget.
      const items: BudgetItem[] = [
        createMockItem({ category: 'CATERING', estimatedCost: 5000, actualCost: 6500 }),
      ];

      const metrics = calculateBudgetMetrics(20000, items);
      expect(metrics.isOverBudget).toBe(false);
      expect(metrics.remainingBudget).toBe(13500);

      const catering = metrics.categoryBreakdown.find(c => c.category === 'CATERING');
      expect(catering).toBeDefined();
      expect(catering?.isOverBudget).toBe(true);
      expect(catering?.variance).toBe(-1500); // 5000 - 6500 = -1500
    });

    it('handles precision rounding on fractional cents (e.g. 0.004 vs 0.006)', () => {
      expect(roundToCents(10.004)).toBe(10.00);
      expect(roundToCents(10.006)).toBe(10.01);
      expect(roundToCents(10.005)).toBe(10.01);
    });
  });
});

