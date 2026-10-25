import { describe, it, expect } from 'vitest';
import { 
  parseAiPlanError, 
  generateOfflineDemoPlan, 
  filterPlanForAdoption 
} from './aiPlanUtils.js';

describe('aiPlanUtils', () => {
  describe('parseAiPlanError', () => {
    it('correctly classifies Gemini quota errors', () => {
      const err = new Error('GoogleGenerativeAI Error: [429 RESOURCE_EXHAUSTED] Quota exceeded');
      const parsed = parseAiPlanError(err);
      expect(parsed.type).toBe('QUOTA');
      expect(parsed.suggestDemo).toBe(true);
      expect(parsed.canRetry).toBe(true);
      expect(parsed.title).toContain('Quota');
    });

    it('correctly classifies request timeouts', () => {
      const err = new Error('Gateway Timeout 504: Gemini API request timed out after 25 seconds.');
      const parsed = parseAiPlanError(err);
      expect(parsed.type).toBe('TIMEOUT');
      expect(parsed.title).toContain('Timed Out');
      expect(parsed.suggestDemo).toBe(true);
    });

    it('correctly classifies network failures', () => {
      const err = new Error('Failed to fetch from backend at http://localhost:5000');
      const parsed = parseAiPlanError(err);
      expect(parsed.type).toBe('NETWORK');
      expect(parsed.title).toContain('Backend Unreachable');
    });

    it('correctly classifies input validation errors', () => {
      const err = new Error('Validation Error: title must be at least 2 characters');
      const parsed = parseAiPlanError(err);
      expect(parsed.type).toBe('VALIDATION');
    });

    it('handles unexpected unknown errors', () => {
      const err = new Error('Something completely unexpected occurred');
      const parsed = parseAiPlanError(err);
      expect(parsed.type).toBe('UNKNOWN');
      expect(parsed.canRetry).toBe(true);
    });
  });

  describe('generateOfflineDemoPlan', () => {
    it('generates an explicit demo plan clearly tagged as offline demo', () => {
      const demoPlan = generateOfflineDemoPlan({
        title: 'Maya 30th Birthday',
        eventType: 'BIRTHDAY',
        date: '2026-11-15',
        totalBudget: 4000,
        guestCount: 35,
      });

      expect(demoPlan._source).toBe('OFFLINE_DEMO');
      expect(demoPlan.eventConcept).toContain('[Demo Template]');
      expect(demoPlan.assumptions![0]).toContain('[Demo Assumption]');
      expect(demoPlan.warnings![0]).toContain('[Demo Caution]');

      expect(demoPlan.theme!.colorPalette.length).toBeGreaterThanOrEqual(4);
      expect(demoPlan.budgetSuggestions!.length).toBeGreaterThanOrEqual(4);
      expect(demoPlan.datedTasks!.length).toBeGreaterThanOrEqual(4);
      expect(demoPlan.agenda!.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('filterPlanForAdoption', () => {
    it('applies only user-selected items and respects unselected toggles', () => {
      const basePlan = generateOfflineDemoPlan({
        title: 'Wedding Gala',
        eventType: 'WEDDING',
        date: '2026-10-10',
        totalBudget: 20000,
        guestCount: 100,
      });

      const initialBudgetCount = basePlan.budgetSuggestions!.length;
      const initialTasksCount = basePlan.datedTasks!.length;

      // User selects only 1st and 3rd budget item, 2nd task, and disables theme update
      const filtered = filterPlanForAdoption(basePlan, {
        applyTheme: false,
        selectedBudgetIndices: [0, 2],
        selectedTaskIndices: [1],
        selectedAgendaIndices: [0, 1],
        selectedVendorIndices: [],
      });

      // Theme should not be applied
      expect(filtered.theme!.title).toBe('');

      // Budget items filtered
      expect(filtered.budgetSuggestions!.length).toBe(2);
      expect(filtered.budgetSuggestions![0].name).toBe(basePlan.budgetSuggestions![0].name);
      expect(filtered.budgetSuggestions![1].name).toBe(basePlan.budgetSuggestions![2].name);
      expect(filtered.budgetSuggestions!.length).toBeLessThan(initialBudgetCount);

      // Tasks filtered
      expect(filtered.datedTasks!.length).toBe(1);
      expect(filtered.datedTasks![0].title).toBe(basePlan.datedTasks![1].title);
      expect(filtered.datedTasks!.length).toBeLessThan(initialTasksCount);

      // Agenda filtered
      expect(filtered.agenda!.length).toBe(2);

      // Vendors empty
      expect(filtered.vendorCategories!.length).toBe(0);
    });
  });
});
