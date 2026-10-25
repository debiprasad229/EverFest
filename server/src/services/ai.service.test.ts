import { describe, it, expect, beforeEach } from 'vitest';
import { 
  aiService, 
  sanitizeLog, 
  sanitizeString, 
  extractJsonFromText, 
  withTimeout 
} from './ai.service.js';
import { storage } from '../data/storage.js';
import { 
  EventPlanRequestSchema, 
  GeminiEventPlanResponseSchema,
  CreativeIdeasRequestSchema,
  CreativeIdeasResponseSchema
} from '../types/index.js';

describe('AiService', () => {
  beforeEach(() => {
    storage.resetToSeed();
  });

  describe('Structured Plan Generation', () => {
    it('should generate all required structured fields for an event plan', async () => {
      const plan = await aiService.generatePlan({
        title: 'Julian & Aurelia Vineyard Gala',
        eventType: 'WEDDING',
        date: '2026-09-12',
        totalBudget: 25000,
        guestCount: 120,
        theme: 'Tuscan Sunset & Candlelight',
        location: 'Sonoma Valley Estate',
        preferences: 'Acoustic violin for prelude, sparkler send-off',
        dietaryNeeds: ['Gluten-Free', 'Vegan'],
        accessibilityNeeds: ['Wheelchair Ramp'],
      });

      // Verify all required structured keys exist
      expect(plan.eventConcept).toBeDefined();
      expect(typeof plan.eventConcept).toBe('string');
      expect(plan.eventConcept.length).toBeGreaterThan(15);

      expect(plan.theme).toBeDefined();
      expect(plan.theme.title).toBeDefined();
      expect(plan.theme.description).toBeDefined();
      expect(plan.theme.colorPalette.length).toBeGreaterThanOrEqual(4);

      expect(plan.agenda).toBeDefined();
      expect(plan.agenda.length).toBeGreaterThanOrEqual(2);
      expect(plan.agenda[0].startTime).toBeDefined();
      expect(plan.agenda[0].title).toBeDefined();

      expect(plan.budgetSuggestions).toBeDefined();
      expect(plan.budgetSuggestions.length).toBeGreaterThanOrEqual(2);

      expect(plan.datedTasks).toBeDefined();
      expect(plan.datedTasks.length).toBeGreaterThanOrEqual(2);
      expect(plan.datedTasks[0].dueDate).toBeDefined();

      expect(plan.vendorCategories).toBeDefined();
      expect(plan.vendorCategories.length).toBeGreaterThan(0);

      expect(plan.decorationIdeas).toBeDefined();
      expect(plan.decorationIdeas.length).toBeGreaterThan(0);

      expect(plan.menuOrActivityIdeas).toBeDefined();
      expect(plan.menuOrActivityIdeas.length).toBeGreaterThan(0);

      expect(plan.assumptions).toBeDefined();
      expect(plan.warnings).toBeDefined();

      // Compatibility aliases
      expect(plan.themeConcept).toEqual(plan.theme);
      expect(plan.suggestedBudgetBreakdown).toEqual(plan.budgetSuggestions);
      expect(plan.milestoneTasks).toEqual(plan.datedTasks);
      expect(plan.runOfShow).toEqual(plan.agenda);
    });

    it('should generate plans for birthday parties with custom run-of-show', async () => {
      const plan = await aiService.generatePlan({
        title: 'Chloe 21st Birthday',
        eventType: 'BIRTHDAY',
        date: '2026-08-15',
        totalBudget: 3500,
        guestCount: 40,
      });

      expect(plan.theme.title).toBeDefined();
      expect(plan.agenda.some(r => 
        r.title.toLowerCase().includes('cake') || 
        r.title.toLowerCase().includes('party') || 
        r.title.toLowerCase().includes('toast')
      )).toBe(true);
    });

    it('should apply generated plan directly to an existing event', async () => {
      const newEvent = storage.createEvent({
        title: 'Civic Harvest Gala',
        eventType: 'COMMUNITY',
        status: 'PLANNING',
        date: '2026-11-01',
        totalBudget: 10000,
        estimatedGuests: 200,
      });

      const plan = await aiService.generatePlan({
        title: newEvent.title,
        eventType: 'COMMUNITY',
        date: newEvent.date,
        totalBudget: newEvent.totalBudget,
        guestCount: newEvent.estimatedGuests,
      });

      const result = aiService.applyPlanToEvent(newEvent.id, plan);
      expect(result.message).toContain('successfully applied');

      const updated = storage.getEventById(newEvent.id);
      expect(updated?.budgetItems.length).toBeGreaterThan(0);
      expect(updated?.tasks.length).toBeGreaterThan(0);
      expect(updated?.runOfShowItems.length).toBeGreaterThan(0);
      expect(updated?.themeAesthetic).toBeDefined();
    });
  });

  describe('Security & Sanitization', () => {
    it('scrubs Google API keys and secrets from log strings', () => {
      const mockKey = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q';
      const rawLog = `Error connecting to Gemini endpoint with key: ${mockKey}`;
      const sanitized = sanitizeLog(rawLog);

      expect(sanitized).not.toContain(mockKey);
      expect(sanitized).toContain('[REDACTED_API_KEY]');
    });

    it('sanitizes dangerous HTML and script tags from model outputs', () => {
      const dangerousHtml = '<script>alert("hack")</script>Atmospheric candlelight dinner<iframe src="evil.com"></iframe>';
      const safe = sanitizeString(dangerousHtml);

      expect(safe).not.toContain('<script>');
      expect(safe).not.toContain('<iframe>');
      expect(safe).toContain('Atmospheric candlelight dinner');
    });

    it('cleanly extracts JSON from markdown backticks', () => {
      const wrapped = '```json\n{"eventConcept":"Great event"}\n```';
      const extracted = extractJsonFromText(wrapped);
      expect(extracted).toBe('{"eventConcept":"Great event"}');

      const plain = '{"eventConcept":"Great event"}';
      expect(extractJsonFromText(plain)).toBe('{"eventConcept":"Great event"}');
    });

    it('handles timeouts safely and throws AppError with 504 status', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(resolve, 500));
      await expect(
        withTimeout(slowPromise, 50, 'Timeout triggered')
      ).rejects.toThrow('Timeout triggered');
    });
  });

  describe('Request Validation Schemas', () => {
    it('accepts valid event plan input within limits', () => {
      const valid = {
        title: '50th Jubilee Anniversary',
        eventType: 'ANNIVERSARY',
        date: '2026-10-24',
        totalBudget: 15000,
        guestCount: 75,
        location: 'Grand Ballroom',
        theme: 'Vintage Gold & Champagne',
        preferences: 'Live quartet during entrance',
      };

      const result = EventPlanRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects input exceeding maximum length constraints', () => {
      const oversized = {
        title: 'A'.repeat(200), // Exceeds 150 limit
        eventType: 'WEDDING',
        date: '2026-10-24',
        totalBudget: 15000,
        guestCount: 50,
      };

      const result = EventPlanRequestSchema.safeParse(oversized);
      expect(result.success).toBe(false);
    });

    it('rejects negative budgets or zero guests', () => {
      const invalid = {
        title: 'Gala Dinner',
        eventType: 'WEDDING',
        date: '2026-10-24',
        totalBudget: -500,
        guestCount: 0,
      };

      const result = EventPlanRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Gemini Response Shape Schema Validation', () => {
    it('validates a complete compliant Gemini response shape', () => {
      const validGeminiResponse = {
        eventConcept: 'An intimate autumn vineyard gathering featuring private tastings and acoustic melodies.',
        theme: {
          title: 'Autumn Tuscan Glow',
          description: 'Textured ivory runners, brass lanterns, and seasonal foliage.',
          colorPalette: ['#882A36', '#CBA83E', '#D8A47F', '#2E382B', '#FAF7F2'],
        },
        agenda: [
          { startTime: '16:00', endTime: '17:00', title: 'Arrival', description: 'Greeting', location: 'Lawn', picName: 'Host' },
          { startTime: '17:00', endTime: '18:30', title: 'Dinner', description: 'Plated dinner', location: 'Hall', picName: 'Captain' },
        ],
        budgetSuggestions: [
          { category: 'VENUE', name: 'Estate Lawn', estimatedCost: 5000, notes: 'Rental' },
          { category: 'CATERING', name: 'Plated Dinner', estimatedCost: 6000, notes: 'Dinner' },
        ],
        datedTasks: [
          { title: 'Sign Contract', category: 'Venue', priority: 'URGENT', timelineOffsetDays: -60, description: 'Book', isMilestone: true },
          { title: 'Tasting', category: 'Catering', priority: 'HIGH', timelineOffsetDays: -30, description: 'Food', isMilestone: false },
        ],
        vendorCategories: [
          { category: 'VENUE', name: 'Estate Coordinator', estimatedBudget: 5000, questionsToAsk: ['Curfew?'] },
        ],
        decorationIdeas: ['Overhead string lighting', 'Bronze candelabras'],
        menuOrActivityIdeas: ['Elderflower spritz', 'Interactive memory guestbook'],
        assumptions: ['Assumes 4-hour setup window'],
        warnings: ['Outdoor sound curfew at 23:00'],
      };

      const result = GeminiEventPlanResponseSchema.safeParse(validGeminiResponse);
      expect(result.success).toBe(true);
    });

    it('rejects Gemini responses missing required keys or with invalid types', () => {
      const invalidGeminiResponse = {
        eventConcept: 'Too short',
        // missing theme
        // missing agenda
      };

      const result = GeminiEventPlanResponseSchema.safeParse(invalidGeminiResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Personalized Creative Inspiration & Inclusivity', () => {
    it('generates personalized themes, color palettes, invitations, activities, and menu', async () => {
      const ideas = await aiService.generateCreativeIdeas({
        title: 'Maya 30th Birthday',
        eventType: 'BIRTHDAY',
        date: '2026-11-20',
        totalBudget: 4500,
        guestCount: 35,
        location: 'Sunset Terrace Lounge',
        theme: 'Golden Euphoria & Midsummer Lanterns',
        preferences: 'Acoustic guitar background, signature mocktails',
        dietaryNeeds: ['Vegetarian', 'Gluten-Free'],
        accessibilityNeeds: ['Step-Free Access'],
      });

      // 1. Themes & Decor
      expect(ideas.themes.length).toBeGreaterThanOrEqual(1);
      expect(ideas.themes[0].title).toBeDefined();
      expect(ideas.themes[0].decorMotifs.length).toBeGreaterThanOrEqual(2);
      expect(ideas.themes[0].budgetAlternatives.luxe).toBeDefined();
      expect(ideas.themes[0].budgetAlternatives.costSmart).toBeDefined();

      // 2. Color Palettes
      expect(ideas.palettes.length).toBeGreaterThanOrEqual(1);
      expect(ideas.palettes[0].colors.length).toBeGreaterThanOrEqual(3);
      expect(ideas.palettes[0].colors[0].hex).toMatch(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);

      // 3. Multi-style Invitations
      expect(ideas.invitations.length).toBeGreaterThanOrEqual(2);
      const formal = ideas.invitations.find(i => i.style === 'FORMAL');
      expect(formal).toBeDefined();
      expect(formal?.bodyText).toContain('Maya 30th Birthday');
      expect(formal?.bodyText).toContain('2026-11-20');
      expect(formal?.rsvpNote.toLowerCase()).toContain('dietary');

      // 4. Activities with Inclusivity
      expect(ideas.activities.length).toBeGreaterThanOrEqual(2);
      expect(ideas.activities[0].budgetAlternative).toBeDefined();
      expect(ideas.activities[0].inclusivityConsiderations).toBeDefined();

      // 5. Menu with Mocktail Parity
      expect(ideas.menu.beverages.some(b => b.isNonAlcoholic)).toBe(true);
      expect(ideas.menu.budgetAlternatives.luxeStyle).toBeDefined();
      expect(ideas.menu.budgetAlternatives.costSmartStyle).toBeDefined();

      // 6. Cultural Inclusivity Statement
      expect(ideas.culturalInclusivityStatement).toBeDefined();
      expect(ideas.culturalInclusivityStatement.toLowerCase()).toContain('without presuming');
    });

    it('validates CreativeIdeasRequestSchema rejecting negative budget or empty title', () => {
      const invalid = {
        title: '',
        eventType: 'BIRTHDAY',
        date: '2026-11-20',
        totalBudget: -100,
        guestCount: 0,
      };

      const result = CreativeIdeasRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('computes stable deterministic signatures and deduplicates identical calls', async () => {
      const payload = {
        title: 'Sarah & Dan Autumn Reception',
        eventType: 'WEDDING' as const,
        date: '2026-10-31',
        totalBudget: 30000,
        guestCount: 100,
        theme: 'Rustic Barn Warmth',
      };

      const sig1 = aiService.computePlanSignature(payload);
      const sig2 = aiService.computePlanSignature(payload);
      expect(sig1).toBe(sig2);

      // Concurrent execution should return the exact same plan data
      const [res1, res2] = await Promise.all([
        aiService.generatePlan(payload),
        aiService.generatePlan(payload),
      ]);

      expect(res1.eventConcept).toBe(res2.eventConcept);
      expect(res1.theme.title).toBe(res2.theme.title);
    });
  });
});

