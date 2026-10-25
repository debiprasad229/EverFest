import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchServerAiPlan } from './api.js';
import { parseAiPlanError } from '../utils/aiPlanUtils.js';

describe('fetchServerAiPlan and error handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('successfully returns generated plan on HTTP 200 with valid data', async () => {
    const mockPlanData = {
      eventConcept: 'Romantic Candlelit Celebration with acoustic melodies',
      theme: {
        title: 'Amber Glow & Velvet',
        description: 'Warm lighting and elegant gold accents',
        colorPalette: ['#882A36', '#CBA83E', '#D8A47F', '#FAF7F2'],
      },
      agenda: [
        { startTime: '17:00', endTime: '18:00', title: 'Arrival', description: 'Champagne toast', location: 'Foyer', picName: 'Host' },
      ],
      budgetSuggestions: [
        { category: 'VENUE', name: 'Estate Rental', estimatedCost: 5000, notes: 'Includes ballroom' },
      ],
      datedTasks: [
        { title: 'Confirm Caterer', category: 'Catering', priority: 'HIGH', timelineOffsetDays: -30, dueDate: '2026-09-01', description: 'Tasting', isMilestone: true },
      ],
      vendorCategories: [
        { category: 'CATERING', name: 'Artisan Caterer', estimatedBudget: 4000, questionsToAsk: ['Dietary options?'] },
      ],
      decorationIdeas: ['Overhead string lights', 'Floating candles'],
      menuOrActivityIdeas: ['Custom cocktail bar', 'Guest polaroid wall'],
      assumptions: ['Assumes 4-hour setup window'],
      warnings: ['Sound curfew at 23:00'],
      themeConcept: {
        title: 'Amber Glow & Velvet',
        description: 'Warm lighting and elegant gold accents',
        colorPalette: ['#882A36', '#CBA83E', '#D8A47F', '#FAF7F2'],
      },
      suggestedBudgetBreakdown: [],
      milestoneTasks: [],
      runOfShow: [],
      vendorRecommendations: [],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockPlanData }),
    } as unknown as Response);

    const result = await fetchServerAiPlan({
      title: 'Anniversary Dinner',
      eventType: 'ANNIVERSARY',
      date: '2026-10-01',
      totalBudget: 10000,
      guestCount: 50,
    });

    expect(result).toBeDefined();
    expect(result.eventConcept).toBe('Romantic Candlelit Celebration with acoustic melodies');
    expect(result.theme?.title).toBe('Amber Glow & Velvet');
    expect(result.budgetSuggestions?.length).toBe(1);
    expect(result.datedTasks?.length).toBe(1);
  });

  it('handles quota errors (HTTP 429) and provides user-friendly message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        success: false,
        error: 'Gemini API free-tier quota has been reached. Please retry shortly or switch to Demo Mode.',
      }),
    } as unknown as Response);

    let caughtError: Error | null = null;
    try {
      await fetchServerAiPlan({ title: 'Birthday', eventType: 'BIRTHDAY', date: '2026-11-01', totalBudget: 2000, guestCount: 20 });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('quota has been reached');

    const parsed = parseAiPlanError(caughtError);
    expect(parsed.type).toBe('QUOTA');
    expect(parsed.canRetry).toBe(true);
    expect(parsed.suggestDemo).toBe(true);
  });

  it('handles timeouts (HTTP 504) and parses error appropriately', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      json: async () => ({
        success: false,
        message: 'The AI planning request timed out after 25 seconds. Please retry or switch to Demo Mode.',
      }),
    } as unknown as Response);

    let caughtError: Error | null = null;
    try {
      await fetchServerAiPlan({ title: 'Gala', eventType: 'COMMUNITY', date: '2026-12-01', totalBudget: 5000, guestCount: 100 });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('timed out after 25 seconds');

    const parsed = parseAiPlanError(caughtError);
    expect(parsed.type).toBe('TIMEOUT');
    expect(parsed.canRetry).toBe(true);
    expect(parsed.suggestDemo).toBe(true);
  });

  it('handles missing keys or incomplete response payload (HTTP 200 missing data)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        // data key is missing
      }),
    } as unknown as Response);

    let caughtError: Error | null = null;
    try {
      await fetchServerAiPlan({ title: 'Corporate Meeting', eventType: 'CORPORATE', date: '2026-10-15', totalBudget: 8000, guestCount: 40 });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('Malformed or incomplete response');

    const parsed = parseAiPlanError(caughtError);
    expect(parsed.type).toBe('VALIDATION');
    expect(parsed.suggestDemo).toBe(true);
  });

  it('handles malformed non-JSON server error responses safely', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Invalid JSON'); },
    } as unknown as Response);

    let caughtError: Error | null = null;
    try {
      await fetchServerAiPlan({ title: 'Festival', eventType: 'OTHER', date: '2026-11-20', totalBudget: 12000, guestCount: 150 });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('HTTP 500');
  });

  it('handles network failure when backend server is offline or unreachable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    let caughtError: Error | null = null;
    try {
      await fetchServerAiPlan({ title: 'Private Dinner', eventType: 'OTHER', date: '2026-12-10', totalBudget: 3000, guestCount: 15 });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('Backend server is unreachable');

    const parsed = parseAiPlanError(caughtError);
    expect(parsed.type).toBe('NETWORK');
    expect(parsed.canRetry).toBe(true);
    expect(parsed.suggestDemo).toBe(true);
  });
});

describe('fetchCreativeIdeas and caching logic', () => {
  const originalFetch = globalThis.fetch;
  const storageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, val: string) => { storageMap.set(key, val); },
    removeItem: (key: string) => { storageMap.delete(key); },
    clear: () => { storageMap.clear(); },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    storageMap.clear();
    (globalThis as any).window = { localStorage: mockLocalStorage };
    (globalThis as any).localStorage = mockLocalStorage;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const samplePayload = {
    title: 'Aurelia Vineyard Wedding',
    eventType: 'WEDDING',
    date: '2026-09-12',
    totalBudget: 25000,
    guestCount: 120,
    location: 'Tuscan Estate',
    theme: 'Autumn Tuscan Glow',
    preferences: 'Acoustic violin, zero-proof mocktails',
    dietaryNeeds: ['Gluten-Free', 'Vegetarian'],
    accessibilityNeeds: ['Wheelchair Ramp'],
    currency: 'USD',
  };

  const sampleIdeasData = {
    themes: [
      {
        title: 'Autumn Tuscan Glow',
        concept: 'Warm amber harvest celebration',
        decorMotifs: ['Olive branches', 'Fluted candles'],
        lightingAndAmbiance: '2200K amber festoons',
        budgetAlternatives: {
          luxe: { title: 'Ceiling Canopy', description: 'Full floral canopy', estCostRange: '$5,000' },
          costSmart: { title: 'Potted Olive Trees', description: 'Nursery rentals', estCostRange: '$800' }
        },
        inclusivityNote: 'Secular natural warmth'
      }
    ],
    palettes: [
      {
        name: 'Tuscan Sunset',
        colors: [
          { hex: '#7A2035', name: 'Mulberry', role: 'primary' },
          { hex: '#CBA83E', name: 'Gold', role: 'accent' },
          { hex: '#FAF7F2', name: 'Ivory', role: 'neutral' },
        ],
        notes: 'Classic palette'
      }
    ],
    invitations: [
      {
        style: 'FORMAL',
        styleLabel: 'Formal & Timeless Elegance',
        headline: 'The Honour of Your Presence',
        bodyText: 'Join us at Tuscan Estate',
        rsvpNote: 'RSVP by August 1',
        inclusivityHighlight: 'Accessible venue'
      }
    ],
    activities: [
      {
        title: 'Storytelling Toast Relay',
        category: 'MEMORABLE_MOMENT',
        description: 'Heartfelt toasts',
        duration: '30 mins',
        budgetTier: 'LOW_COST_DIY',
        budgetAlternative: 'Free peer emceeing',
        inclusivityConsiderations: 'Handheld mic for standing or seated guests'
      }
    ],
    menu: {
      beverages: [
        { name: 'Pear Rosemary Fizz', type: 'CRAFT_MOCKTAIL', description: 'Zero proof nectar', isNonAlcoholic: true },
        { name: 'Aperol Spritz', type: 'SIGNATURE_COCKTAIL', description: 'Classic spritz', isNonAlcoholic: false }
      ],
      appetizers: [{ name: 'Polenta Bites', description: 'Crispy polenta', dietaryFlags: ['Vegetarian'] }],
      mains: [{ name: 'Braised Short Rib', description: 'Tender beef', dietaryFlags: ['Gluten-Free'] }],
      desserts: [{ name: 'Dark Chocolate Torte', description: 'Flourless cake', dietaryFlags: ['Vegetarian'] }],
      budgetAlternatives: { luxeStyle: 'Plated 4-course', costSmartStyle: 'Family-style platters' },
      inclusivityNotes: 'Equal mocktail parity'
    },
    culturalInclusivityStatement: 'Universally welcoming without assuming religion or culture'
  };

  it('computes stable input signatures regardless of array ordering', async () => {
    const { computeInputSignature } = await import('./api.js');
    const sig1 = computeInputSignature({ ...samplePayload, dietaryNeeds: ['Vegetarian', 'Gluten-Free'] });
    const sig2 = computeInputSignature({ ...samplePayload, dietaryNeeds: ['Gluten-Free', 'Vegetarian'] });
    expect(sig1).toBe(sig2);
  });

  it('fetches creative ideas and saves signature to local cache', async () => {
    const { fetchCreativeIdeas } = await import('./api.js');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: sampleIdeasData }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const result = await fetchCreativeIdeas(samplePayload, false, 'event-123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.themes.length).toBe(1);
    expect(result._inputSignature).toBeDefined();

    // Verify written to localStorage
    const raw = window.localStorage.getItem('EVERFEST_CREATIVE_CACHE_event-123');
    expect(raw).not.toBeNull();
  });

  it('avoids repeated network calls when inputs have not changed (uses cache)', async () => {
    const { fetchCreativeIdeas, computeInputSignature } = await import('./api.js');

    const sig = computeInputSignature(samplePayload);
    const cachedData = {
      ...sampleIdeasData,
      _inputSignature: sig,
      _cachedAt: new Date().toISOString(),
    };
    window.localStorage.setItem('EVERFEST_CREATIVE_CACHE_event-123', JSON.stringify(cachedData));

    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    // Call without forceRefresh
    const result = await fetchCreativeIdeas(samplePayload, false, 'event-123');

    // fetch should NOT be called because inputs matched cache!
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.themes[0].title).toBe('Autumn Tuscan Glow');
  });

  it('bypasses cache when forceRefresh is true (regenerate button clicked)', async () => {
    const { fetchCreativeIdeas, computeInputSignature } = await import('./api.js');

    const sig = computeInputSignature(samplePayload);
    window.localStorage.setItem('EVERFEST_CREATIVE_CACHE_event-123', JSON.stringify({
      ...sampleIdeasData,
      _inputSignature: sig,
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          ...sampleIdeasData,
          themes: [{ ...sampleIdeasData.themes[0], title: 'Refreshed Theme Concept' }]
        }
      }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const result = await fetchCreativeIdeas(samplePayload, true, 'event-123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.themes[0].title).toBe('Refreshed Theme Concept');
  });
});

describe('resolveApiBase URL resolution for Vercel & Production hosts', () => {
  it('correctly appends /api to bare domain URLs without paths', async () => {
    const { resolveApiBase } = await import('./api.js');
    expect(resolveApiBase('https://everfest-api.onrender.com')).toBe('https://everfest-api.onrender.com/api');
    expect(resolveApiBase('https://everfest-api.onrender.com/')).toBe('https://everfest-api.onrender.com/api');
  });

  it('preserves existing /api or /api/v1 endpoints', async () => {
    const { resolveApiBase } = await import('./api.js');
    expect(resolveApiBase('https://api.everfest.com/api')).toBe('https://api.everfest.com/api');
    expect(resolveApiBase('https://api.everfest.com/api/v1')).toBe('https://api.everfest.com/api/v1');
    expect(resolveApiBase('https://api.everfest.com/api/v1/')).toBe('https://api.everfest.com/api/v1');
  });

  it('falls back to /api when input is empty or undefined (local Vite proxy)', async () => {
    const { resolveApiBase } = await import('./api.js');
    expect(resolveApiBase('')).toBe('/api');
    expect(resolveApiBase(undefined)).toBe('/api');
  });
});


