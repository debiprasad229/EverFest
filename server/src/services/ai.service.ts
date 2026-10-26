import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { storage } from '../data/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import { 
  EventPlanRequestInput, 
  GeneratedAiPlan, 
  VendorCategory,
  TaskPriority,
  GeminiEventPlanResponseSchema,
  GeminiEventPlanResponse,
  CreativeIdeasRequestInput,
  CreativeIdeasResponse,
  CreativeIdeasResponseSchema
} from '../types/index.js';

/**
 * Utility to scrub potential secrets or API keys from logs and error strings
 */
export function sanitizeLog(message: any): string {
  if (!message) return '';
  let str = typeof message === 'string' ? message : JSON.stringify(message);
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 5) {
    str = str.split(env.GEMINI_API_KEY).join('[REDACTED_API_KEY]');
  }
  // Generic pattern for Google API Keys (AIzaSy...)
  str = str.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  return str;
}

/**
 * Utility to sanitize output text and prevent raw model HTML/script injection
 */
export function sanitizeString(val: string): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Promise wrapper enforcing strict timeout
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new AppError(errorMessage, 504));
    }, ms);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

/**
 * Clean and extract JSON string even if enclosed in markdown codeblocks
 */
export function extractJsonFromText(rawText: string): string {
  const trimmed = rawText.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  return trimmed;
}

export class AiService {
  private genAI: GoogleGenerativeAI | null = null;
  private readonly TIMEOUT_MS = 25000; // 25s timeout for Gemini API calls
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute memoization TTL

  // In-memory caches to prevent duplicate AI calls and preserve quota
  private planCache = new Map<string, { plan: GeneratedAiPlan; timestamp: number }>();
  private planInFlight = new Map<string, Promise<GeneratedAiPlan>>();

  private creativeCache = new Map<string, { ideas: CreativeIdeasResponse; timestamp: number }>();
  private creativeInFlight = new Map<string, Promise<CreativeIdeasResponse>>();

  constructor() {
    this.initGemini();
  }

  private initGemini(): void {
    const key = env.GEMINI_API_KEY;
    if (key && key !== 'your_gemini_api_key_here' && key.trim().length > 0) {
      try {
        this.genAI = new GoogleGenerativeAI(key.trim());
      } catch (err) {
        console.warn('[AiService] Failed to initialize Google Generative AI client:', sanitizeLog(err));
      }
    } else {
      this.genAI = null;
    }
  }

  /**
   * Computes deterministic canonical signature for event planning requests
   */
  public computePlanSignature(input: EventPlanRequestInput): string {
    return [
      input.eventType || '',
      input.title || '',
      input.date || '',
      input.totalBudget || '',
      input.guestCount || '',
      input.location || '',
      input.theme || input.vibeOrTheme || '',
      input.preferences || '',
      (input.dietaryNeeds || []).slice().sort().join(','),
      (input.accessibilityNeeds || []).slice().sort().join(','),
      (input.priorities || []).slice().sort().join(','),
    ].join('||');
  }

  /**
   * Computes deterministic canonical signature for creative inspiration requests
   */
  public computeCreativeSignature(input: CreativeIdeasRequestInput): string {
    return [
      input.eventType || '',
      input.title || '',
      input.guestCount || '',
      input.totalBudget || '',
      input.theme || input.vibeOrTheme || '',
      input.preferences || input.specialPreferences || '',
      (input.dietaryNeeds || []).slice().sort().join(','),
      (input.accessibilityNeeds || []).slice().sort().join(','),
    ].join('||');
  }

  /**
   * Main entrypoint to generate a structured celebration plan.
   * Employs deduplication and memoization to prevent duplicate AI calls and preserve quota.
   */
  public async generatePlan(input: EventPlanRequestInput): Promise<GeneratedAiPlan> {
    const sig = this.computePlanSignature(input);

    // 1. Check in-memory TTL cache (prevents duplicate calls when inputs have not changed)
    const cached = this.planCache.get(sig);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
      return JSON.parse(JSON.stringify(cached.plan));
    }

    // 2. Check if identical request is already in-flight (prevents concurrent duplicate submissions)
    const inFlight = this.planInFlight.get(sig);
    if (inFlight) {
      return inFlight;
    }

    // 3. Execute generation and register in-flight promise
    const execPromise = this.executePlanGeneration(input)
      .then((plan) => {
        this.planCache.set(sig, { plan, timestamp: Date.now() });
        return plan;
      })
      .finally(() => {
        this.planInFlight.delete(sig);
      });

    this.planInFlight.set(sig, execPromise);
    return execPromise;
  }

  private async executePlanGeneration(input: EventPlanRequestInput): Promise<GeneratedAiPlan> {
    // In automated test environments, immediately use deterministic planner for fast, reliable testing
    if (env.NODE_ENV === 'test') {
      return this.generateDeterministicPlan(input);
    }

    // Re-verify client initialization in case env changed
    if (!this.genAI && env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      this.initGemini();
    }

    if (this.genAI) {
      try {
        return await withTimeout(
          this.generateWithGemini(input),
          this.TIMEOUT_MS,
          'Gemini API request timed out after 25 seconds.'
        );
      } catch (err: any) {
        const errorString = sanitizeLog(err?.message || err);

        // Check for Quota or Rate Limit errors (HTTP 429, RESOURCE_EXHAUSTED)
        const isQuotaError = 
          err?.status === 429 || 
          errorString.includes('429') || 
          errorString.includes('RESOURCE_EXHAUSTED') || 
          errorString.includes('quota');

        if (isQuotaError) {
          console.warn('[AiService] Gemini API quota limit reached. Falling back to Intelligent Domain Planner.');
          const fallback = this.generateDeterministicPlan(input);
          fallback.warnings = [
            'Notice: Gemini API quota exceeded for your current tier. This plan was synthesized using EverFest\'s Intelligent Domain Planning Engine.',
            ...fallback.warnings
          ];
          return fallback;
        }

        // Check for Timeout
        if (err?.statusCode === 504 || errorString.includes('timed out')) {
          console.warn('[AiService] Gemini API call timed out. Falling back to Intelligent Domain Planner.');
          const fallback = this.generateDeterministicPlan(input);
          fallback.warnings = [
            'Notice: The AI planning request timed out. This plan was synthesized using EverFest\'s Intelligent Domain Planning Engine.',
            ...fallback.warnings
          ];
          return fallback;
        }

        console.warn(`[AiService] Gemini API call failed: ${errorString}. Falling back to Intelligent Domain Planner.`);
      }
    }

    // High-fidelity fallback / offline generator tailored to the celebration parameters
    return this.generateDeterministicPlan(input);
  }

  /**
   * Direct Gemini LLM structured plan generation with schema enforcement
   */
  private async generateWithGemini(input: EventPlanRequestInput): Promise<GeneratedAiPlan> {
    if (!this.genAI) throw new Error('Gemini client is not initialized');

    const modelName = env.GEMINI_MODEL || 'gemini-3.8-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are the world's finest celebration architect and event planner.
Generate a comprehensive, highly personalized celebration blueprint for the following event:

Event Title: "${input.title}"
Celebration Type: ${input.eventType}
Event Date: ${input.date}
Total Budget: $${input.totalBudget} USD
Estimated Guests: ${input.guestCount}
Vibe / Aesthetic: "${input.theme || input.vibeOrTheme || 'Elegant and memorable'}"
Location / Venue Type: "${input.location || 'Local venue'}"
Top Priorities: ${JSON.stringify(input.priorities || [])}
Preferences: "${input.preferences || input.specialPreferences || ''}"
Dietary Needs: ${JSON.stringify(input.dietaryNeeds || [])}
Accessibility Needs: ${JSON.stringify(input.accessibilityNeeds || [])}
Restrictions / Notes: ${JSON.stringify(input.restrictions || [])}

You must return a single valid JSON object with NO surrounding markdown backticks and NO HTML tags matching this exact schema:
{
  "eventConcept": "A vivid 2-3 sentence overview describing the emotional narrative, atmosphere, and experiential highlight of this celebration",
  "theme": {
    "title": "Evocative Theme Title",
    "description": "Atmospheric styling and design description",
    "colorPalette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5"]
  },
  "agenda": [
    {
      "startTime": "HH:MM (24-hour e.g. 15:30)",
      "endTime": "HH:MM",
      "title": "Segment Name",
      "description": "Specific activities taking place",
      "location": "Specific zone/area at the venue",
      "picName": "Designated Person in Charge"
    }
  ],
  "budgetSuggestions": [
    {
      "category": "VENUE" | "CATERING" | "PHOTOGRAPHY" | "DECORATION" | "ENTERTAINMENT" | "TRANSPORT" | "OTHER",
      "name": "Line item name",
      "estimatedCost": number (positive amount, total sum should approximate the total budget),
      "notes": "Allocation rationale and vendor scope"
    }
  ],
  "datedTasks": [
    {
      "title": "Clear action-oriented task name",
      "category": "Category name",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "timelineOffsetDays": number (negative integer representing days before event date, e.g. -120),
      "description": "Practical execution tips",
      "isMilestone": boolean
    }
  ],
  "vendorCategories": [
    {
      "category": "VENUE" | "CATERING" | "PHOTOGRAPHY" | "DECORATION" | "ENTERTAINMENT" | "TRANSPORT" | "OTHER",
      "name": "Vendor specialty descriptor",
      "estimatedBudget": number,
      "questionsToAsk": ["Key question 1", "Key question 2"]
    }
  ],
  "decorationIdeas": [
    "Specific tablescape, lighting, or staging concept",
    "Floral or entryway installation detail",
    "Signage or photo backdrop design element"
  ],
  "menuOrActivityIdeas": [
    "Signature welcome cocktail/beverage concept",
    "Curated culinary feature tailored to dietary needs",
    "Interactive guest activity or musical moment"
  ],
  "assumptions": [
    "Clear logistical assumption made regarding venue, setup window, or equipment",
    "Assumption regarding weather contingency or catering staffing"
  ],
  "warnings": [
    "Crucial planning caution (e.g. noise curfew, permit lead time, deposit deadlines)",
    "Budget sensitivity or supply risk warning"
  ]
}
`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleanJsonText = extractJsonFromText(rawText);

    let parsedRaw: any;
    try {
      parsedRaw = JSON.parse(cleanJsonText);
    } catch (parseErr) {
      console.warn('[AiService] Gemini output was not valid JSON. Falling back to deterministic plan:', sanitizeLog(rawText.substring(0, 200)));
      return this.generateDeterministicPlan(input);
    }

    // Validate response shape with Zod
    const validationResult = GeminiEventPlanResponseSchema.safeParse(parsedRaw);

    if (!validationResult.success) {
      console.warn(
        '[AiService] Gemini response shape failed validation:',
        validationResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      );
      // Attempt to repair or fall back
      return this.repairOrFallbackPlan(parsedRaw, input);
    }

    return this.transformToGeneratedPlan(validationResult.data, input.date);
  }

  /**
   * Transforms validated Gemini response into full GeneratedAiPlan with backward compatibility aliases
   */
  private transformToGeneratedPlan(data: GeminiEventPlanResponse, eventDateStr: string): GeneratedAiPlan {
    const eventDate = new Date(eventDateStr);

    const datedTasks = data.datedTasks.map((t) => {
      let dueDateStr: string | undefined = t.dueDate;
      if (!dueDateStr && !isNaN(eventDate.getTime())) {
        const d = new Date(eventDate);
        d.setDate(d.getDate() + (t.timelineOffsetDays || 0));
        dueDateStr = d.toISOString().split('T')[0];
      }

      return {
        title: sanitizeString(t.title),
        category: sanitizeString(t.category),
        priority: t.priority as TaskPriority,
        timelineOffsetDays: t.timelineOffsetDays,
        dueDate: dueDateStr,
        description: sanitizeString(t.description || ''),
        isMilestone: !!t.isMilestone,
      };
    });

    const agenda = data.agenda.map((a) => ({
      startTime: sanitizeString(a.startTime),
      endTime: sanitizeString(a.endTime),
      title: sanitizeString(a.title),
      description: sanitizeString(a.description),
      location: sanitizeString(a.location),
      picName: sanitizeString(a.picName || 'Lead Host / Coordinator'),
    }));

    const budgetSuggestions = data.budgetSuggestions.map((b) => ({
      category: sanitizeString(b.category) as VendorCategory,
      name: sanitizeString(b.name),
      estimatedCost: Math.max(0, Math.round(b.estimatedCost)),
      notes: sanitizeString(b.notes || ''),
    }));

    const vendorCategories = data.vendorCategories.map((v) => ({
      category: sanitizeString(v.category) as VendorCategory,
      name: sanitizeString(v.name),
      estimatedBudget: Math.max(0, Math.round(v.estimatedBudget || 0)),
      questionsToAsk: (v.questionsToAsk || []).map(sanitizeString),
    }));

    const theme = {
      title: sanitizeString(data.theme.title),
      description: sanitizeString(data.theme.description),
      colorPalette: (data.theme.colorPalette || []).map(sanitizeString),
    };

    return {
      eventConcept: sanitizeString(data.eventConcept),
      theme,
      agenda,
      budgetSuggestions,
      datedTasks,
      vendorCategories,
      decorationIdeas: (data.decorationIdeas || []).map(sanitizeString),
      menuOrActivityIdeas: (data.menuOrActivityIdeas || []).map(sanitizeString),
      assumptions: (data.assumptions || []).map(sanitizeString),
      warnings: (data.warnings || []).map(sanitizeString),

      // Aliases for frontend compatibility
      themeConcept: theme,
      suggestedBudgetBreakdown: budgetSuggestions,
      milestoneTasks: datedTasks,
      runOfShow: agenda,
      vendorRecommendations: vendorCategories,
    };
  }

  /**
   * Safely repairs semi-valid parsed objects or returns deterministic fallback
   */
  private repairOrFallbackPlan(raw: any, input: EventPlanRequestInput): GeneratedAiPlan {
    const fallback = this.generateDeterministicPlan(input);
    if (!raw || typeof raw !== 'object') return fallback;

    return {
      eventConcept: sanitizeString(raw.eventConcept || fallback.eventConcept),
      theme: {
        title: sanitizeString(raw.theme?.title || raw.themeConcept?.title || fallback.theme.title),
        description: sanitizeString(raw.theme?.description || raw.themeConcept?.description || fallback.theme.description),
        colorPalette: Array.isArray(raw.theme?.colorPalette) ? raw.theme.colorPalette : fallback.theme.colorPalette,
      },
      agenda: Array.isArray(raw.agenda) && raw.agenda.length >= 2 ? raw.agenda : fallback.agenda,
      budgetSuggestions: Array.isArray(raw.budgetSuggestions) && raw.budgetSuggestions.length >= 2 
        ? raw.budgetSuggestions 
        : fallback.budgetSuggestions,
      datedTasks: Array.isArray(raw.datedTasks) && raw.datedTasks.length >= 2 
        ? raw.datedTasks 
        : fallback.datedTasks,
      vendorCategories: Array.isArray(raw.vendorCategories) ? raw.vendorCategories : fallback.vendorCategories,
      decorationIdeas: Array.isArray(raw.decorationIdeas) ? raw.decorationIdeas : fallback.decorationIdeas,
      menuOrActivityIdeas: Array.isArray(raw.menuOrActivityIdeas) ? raw.menuOrActivityIdeas : fallback.menuOrActivityIdeas,
      assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : fallback.assumptions,
      warnings: Array.isArray(raw.warnings) ? raw.warnings : fallback.warnings,

      // Aliases
      themeConcept: {
        title: sanitizeString(raw.theme?.title || raw.themeConcept?.title || fallback.theme.title),
        description: sanitizeString(raw.theme?.description || raw.themeConcept?.description || fallback.theme.description),
        colorPalette: Array.isArray(raw.theme?.colorPalette) ? raw.theme.colorPalette : fallback.theme.colorPalette,
      },
      suggestedBudgetBreakdown: Array.isArray(raw.budgetSuggestions) ? raw.budgetSuggestions : fallback.budgetSuggestions,
      milestoneTasks: Array.isArray(raw.datedTasks) ? raw.datedTasks : fallback.datedTasks,
      runOfShow: Array.isArray(raw.agenda) ? raw.agenda : fallback.agenda,
      vendorRecommendations: Array.isArray(raw.vendorCategories) ? raw.vendorCategories : fallback.vendorCategories,
    };
  }

  /**
   * Deterministic domain planning engine tailored to celebration parameters
   */
  public generateDeterministicPlan(input: EventPlanRequestInput): GeneratedAiPlan {
    const budget = input.totalBudget || 5000;
    const guests = input.guestCount || 50;
    const type = input.eventType;
    const eventDate = new Date(input.date);

    let eventConcept = `An exquisitely orchestrated ${type.toLowerCase()} celebration uniting loved ones through memorable shared dining, warm atmospheric design, and seamless milestone transitions.`;
    let themeTitle = input.theme || input.vibeOrTheme || 'Romantic Tuscan Twilight & Warm Amber';
    let themeDesc = 'Candlelight warmth, textured linen runners, olive branch foliage, and acoustic jazz melodies creating an intimate, timeless celebration.';
    let palette = ['#882A36', '#CBA83E', '#D8A47F', '#2E382B', '#FAF7F2'];

    let budgetBreakdown = [
      { category: 'VENUE', name: 'Estate Lawn & Reception Pavilion', estimatedCost: Math.round(budget * 0.30), notes: '10 hours exclusive access, private dressing suites, and cleanup' },
      { category: 'CATERING', name: 'Farm-to-Table Plated Dinner & Wine Service', estimatedCost: Math.round(budget * 0.32), notes: `Approx. $${Math.round((budget * 0.32) / Math.max(guests, 1))}/guest with welcome appetizers` },
      { category: 'PHOTOGRAPHY', name: 'Documentary Photo & Aerial Highlights', estimatedCost: Math.round(budget * 0.12), notes: 'Full day coverage with digital gallery and print rights' },
      { category: 'DECORATION', name: 'Ceremony Arch, Centerpieces & Ambient Lighting', estimatedCost: Math.round(budget * 0.10), notes: 'Botanical foliage, custom bronze candelabras, and fairy lights' },
      { category: 'ENTERTAINMENT', name: 'Acoustic Trio Prelude & Evening DJ', estimatedCost: Math.round(budget * 0.08), notes: 'Sound equipment, wireless microphones, and dance floor lighting' },
      { category: 'TRANSPORT', name: 'Guest Shuttle Vans & VIP Getaway Vehicle', estimatedCost: Math.round(budget * 0.04), notes: 'Looping transport between downtown hotels and venue' },
      { category: 'OTHER', name: 'Contingency & Incidentals Cushion', estimatedCost: Math.round(budget * 0.04), notes: 'Emergency buffer for weather adjustments and unexpected overtime' },
    ];

    let tasksRaw = [
      { title: 'Secure & Deposit Venue Contract', category: 'Venue', priority: 'URGENT' as TaskPriority, offset: -180, desc: 'Confirm noise curfew, setup windows, and insurance requirements', milestone: true },
      { title: 'Contract Photographer & Videographer', category: 'Creative', priority: 'HIGH' as TaskPriority, offset: -150, desc: 'Review sample galleries and lock in date with initial retainer', milestone: true },
      { title: 'Tasting & Custom Menu Selection', category: 'Catering', priority: 'HIGH' as TaskPriority, offset: -120, desc: 'Coordinate dietary flags (gluten-free, vegan) with catering chef', milestone: false },
      { title: 'Send Formal Invitations & Launch RSVP Link', category: 'Stationery', priority: 'HIGH' as TaskPriority, offset: -90, desc: 'Collect guest meal choices and accessibility accommodations', milestone: true },
      { title: 'Finalize Day-of Run-of-Show & Vendor Brief', category: 'Coordination', priority: 'URGENT' as TaskPriority, offset: -14, desc: 'Distribute timeline cheat-sheet to bridal party, DJ, and coordinator', milestone: true },
      { title: 'Walkthrough Rehearsal & Vendor Check-in', category: 'Operations', priority: 'MEDIUM' as TaskPriority, offset: -1, desc: 'Verify seating arrangements, audio soundcheck, and final guest counts', milestone: false },
    ];

    let agenda = [
      { startTime: '15:30', endTime: '16:00', title: 'Guest Arrival & Refreshments', description: 'Guests welcomed with infused spritzes and acoustic prelude music', location: 'Welcome Lawn', picName: 'Lead Usher' },
      { startTime: '16:15', endTime: '17:00', title: 'Main Ceremony / Presentation', description: 'Processional, heartfelt exchange of vows or anniversary tribute', location: 'Ceremony Pavilion', picName: 'Lead Officiant' },
      { startTime: '17:00', endTime: '18:15', title: 'Sunset Cocktails & Golden Hour Photos', description: 'Canapés circulated; portrait session in natural light', location: 'Terrace Garden', picName: 'Banquet Captain' },
      { startTime: '18:30', endTime: '20:15', title: 'Plated Dinner Banquet & Commemorative Toasts', description: '3-course plated culinary experience with speeches', location: 'Main Dining Hall', picName: 'MC & Banquet Lead' },
      { startTime: '20:30', endTime: '23:00', title: 'First Dance & Open Dance Floor', description: 'DJ ignites celebration, dessert station opens, evening dancing', location: 'Dance Pavilion', picName: 'DJ & MC' },
    ];

    let decorationIdeas = [
      'Low-incline botanical floral runners interspersed with hand-poured plum and ivory taper candles.',
      'Custom gold leaf acrylic welcome signage positioned at the pavilion foyer entrance.',
      'Overhead warm string lights creating a canopy effect across the main dining and dancing space.'
    ];

    let menuOrActivityIdeas = [
      'Welcome Elderflower Rosemary Spritz with citrus garnish for refreshing guest greeting.',
      'Local seasonal farm salad with heirloom beets, goat cheese medallions, and honey balsamic vinaigrette.',
      'Interactive Polaroid memory guestbook table with metallic calligraphy markers.'
    ];

    let assumptions = [
      'Assumes a 4-hour pre-event vendor setup window granted by venue management.',
      'Assumes outside insured catering and live amplification are permitted within municipal sound ordinances.'
    ];

    let warnings = [
      'Strict outdoor sound curfew typically enforced at 23:00 by local residential ordinance.',
      'Catering headcounts and dietary restrictions must be frozen at least 14 days prior to avoid overage surcharges.'
    ];

    if (type === 'BIRTHDAY') {
      eventConcept = `A vibrant, joyful birthday celebration honoring milestones with festive craft cocktails, dynamic live entertainment, and personalized culinary surprises.`;
      themeTitle = input.theme || input.vibeOrTheme || 'Golden Midnight Glamour & Festive Spark';
      palette = ['#1E1B4B', '#CBA83E', '#F59E0B', '#F1F5F9', '#0F172A'];
      agenda[1].title = 'Welcome Toast & Milestone Tribute';
      agenda[4].title = 'Birthday Cake Reveal & Dance Party';
    } else if (type === 'COMMUNITY') {
      eventConcept = `An engaging, highly inclusive civic gathering bringing neighbors together through interactive workshops, community dining, and local musical showcases.`;
      themeTitle = input.theme || input.vibeOrTheme || 'Civic Harmony & Vibrant Unity';
      palette = ['#1E3A8A', '#0D9488', '#F59E0B', '#10B981', '#FAF7F2'];
      assumptions.push('Assumes public park and safety permits are approved by municipal parks department.');
      warnings.push('Ensure ADA accessibility ramps and clear pedestrian transit routes are marked throughout.');
    }

    const datedTasks = tasksRaw.map((t) => {
      let dueDateStr: string | undefined;
      if (!isNaN(eventDate.getTime())) {
        const d = new Date(eventDate);
        d.setDate(d.getDate() + t.offset);
        dueDateStr = d.toISOString().split('T')[0];
      }
      return {
        title: t.title,
        category: t.category,
        priority: t.priority,
        timelineOffsetDays: t.offset,
        dueDate: dueDateStr,
        description: t.desc,
        isMilestone: t.milestone,
      };
    });

    const vendorCategories = [
      { category: 'VENUE', name: 'Estate Coordinator', estimatedBudget: Math.round(budget * 0.30), questionsToAsk: ['Are outside insured caterers allowed?', 'What is the exact amplification curfew?'] },
      { category: 'CATERING', name: 'Boutique Catering Chef', estimatedBudget: Math.round(budget * 0.32), questionsToAsk: ['How are gluten-free and allergen meals labeled?', 'Is bar staff included in quote?'] },
      { category: 'PHOTOGRAPHY', name: 'Visual Storyteller', estimatedBudget: Math.round(budget * 0.12), questionsToAsk: ['How many edited photos are delivered?', 'Is a secondary shooter included?'] },
    ];

    return {
      eventConcept,
      theme: {
        title: themeTitle,
        description: themeDesc,
        colorPalette: palette,
      },
      agenda,
      budgetSuggestions: budgetBreakdown,
      datedTasks,
      vendorCategories,
      decorationIdeas,
      menuOrActivityIdeas,
      assumptions,
      warnings,

      // Aliases
      themeConcept: {
        title: themeTitle,
        description: themeDesc,
        colorPalette: palette,
      },
      suggestedBudgetBreakdown: budgetBreakdown,
      milestoneTasks: datedTasks,
      runOfShow: agenda,
      vendorRecommendations: vendorCategories,
    };
  }

  /**
   * Applies a generated plan to an existing event in local server storage
   */
  public applyPlanToEvent(eventId: string, plan: GeneratedAiPlan): { message: string } {
    const event = storage.getEventById(eventId);
    if (!event) throw new AppError(`Event ${eventId} not found`, 404);

    storage.updateEvent(eventId, {
      themeAesthetic: plan.theme.title || plan.themeConcept.title,
      colorPalette: plan.theme.colorPalette || plan.themeConcept.colorPalette,
    });

    // 1. Add budget items
    const budgetList = plan.budgetSuggestions || plan.suggestedBudgetBreakdown || [];
    for (const bgt of budgetList) {
      storage.addBudgetItem(eventId, {
        category: bgt.category,
        name: bgt.name,
        estimatedCost: bgt.estimatedCost,
        actualCost: 0,
        paymentStatus: 'UNPAID',
        notes: bgt.notes,
        isEstimate: true,
      });
    }

    // 2. Add milestone tasks
    const eventDate = new Date(event.date);
    const tasksList = plan.datedTasks || plan.milestoneTasks || [];
    for (const [idx, task] of tasksList.entries()) {
      let dueDateStr = task.dueDate;
      if (!dueDateStr && !isNaN(eventDate.getTime())) {
        const d = new Date(eventDate);
        d.setDate(d.getDate() + (task.timelineOffsetDays || 0));
        dueDateStr = d.toISOString().split('T')[0];
      }

      storage.addTask(eventId, {
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: 'TODO',
        dueDate: dueDateStr,
        orderIndex: idx + 1,
        isMilestone: task.isMilestone,
      });
    }

    // 3. Add run-of-show agenda
    const agendaList = plan.agenda || plan.runOfShow || [];
    for (const [idx, item] of agendaList.entries()) {
      storage.addRunOfShowItem(eventId, {
        startTime: item.startTime,
        endTime: item.endTime,
        title: item.title,
        description: item.description,
        location: item.location,
        picName: item.picName,
        orderIndex: idx + 1,
      });
    }

    return { message: 'AI Plan successfully applied to celebration workspace!' };
  }

  /**
   * Generates personalized creative inspiration (themes, palettes, wording, activities, menu)
   * with budget-aware alternatives and cultural inclusivity.
   * Employs deduplication and memoization to prevent duplicate AI calls and preserve quota.
   */
  public async generateCreativeIdeas(input: CreativeIdeasRequestInput): Promise<CreativeIdeasResponse> {
    const sig = this.computeCreativeSignature(input);

    // 1. Check in-memory TTL cache
    const cached = this.creativeCache.get(sig);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
      return JSON.parse(JSON.stringify(cached.ideas));
    }

    // 2. Check if identical request is already in-flight
    const inFlight = this.creativeInFlight.get(sig);
    if (inFlight) {
      return inFlight;
    }

    // 3. Execute generation and register in-flight promise
    const execPromise = this.executeCreativeGeneration(input)
      .then((ideas) => {
        this.creativeCache.set(sig, { ideas, timestamp: Date.now() });
        return ideas;
      })
      .finally(() => {
        this.creativeInFlight.delete(sig);
      });

    this.creativeInFlight.set(sig, execPromise);
    return execPromise;
  }

  private async executeCreativeGeneration(input: CreativeIdeasRequestInput): Promise<CreativeIdeasResponse> {
    if (env.NODE_ENV === 'test') {
      return this.generateDeterministicCreativeIdeas(input);
    }

    if (!this.genAI && env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      this.initGemini();
    }

    if (this.genAI) {
      try {
        return await withTimeout(
          this.generateWithGeminiCreativeIdeas(input),
          this.TIMEOUT_MS,
          'Gemini creative inspiration request timed out after 25 seconds.'
        );
      } catch (err: any) {
        const errorString = sanitizeLog(err?.message || err);
        console.warn(`[AiService] Gemini creative ideas call failed: ${errorString}. Falling back to deterministic creative synthesis.`);
      }
    }

    return this.generateDeterministicCreativeIdeas(input);
  }

  /**
   * Direct Gemini call for personalized creative ideas
   */
  private async generateWithGeminiCreativeIdeas(input: CreativeIdeasRequestInput): Promise<CreativeIdeasResponse> {
    if (!this.genAI) throw new Error('Gemini client is not initialized');

    const modelName = env.GEMINI_MODEL || 'gemini-3.8-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are the world's most perceptive, culturally inclusive, and sophisticated celebration designer.
Generate personalized creative inspiration, themes, color palettes, multi-style invitation wording, activities, and menu concepts for the following celebration:

Event Title: "${input.title}"
Celebration Type: ${input.eventType}
Date: ${input.date}
Total Budget: ${input.totalBudget} ${input.currency || 'USD'}
Guest Count: ${input.guestCount}
Location: "${input.location || 'Celebration venue'}"
Aesthetic / Vibe: "${input.theme || input.vibeOrTheme || 'Elegant and joyful'}"
Special Preferences: "${input.preferences || input.specialPreferences || ''}"
Dietary Accommodations: ${JSON.stringify(input.dietaryNeeds || [])}
Accessibility Accommodations: ${JSON.stringify(input.accessibilityNeeds || [])}

CRITICAL INCLUSIVITY DIRECTIVE:
1. Do NOT assume or impose any religious ceremonies, theological rituals, or ethnic traditions unless the user explicitly requested them in their preferences.
2. Ensure all concepts are universally welcoming, human-centered, and focused on gratitude, community, milestones, and joy.
3. Always include non-alcoholic craft beverage alternatives (signature mocktails, artisan herbal teas, sparkling infusions) so non-drinking guests feel equally honored.
4. Cater thoughtfully to the declared dietary accommodations (e.g. vegan, gluten-free, nut-free, halal-friendly, kosher-style).
5. For activities, ensure physical accessibility and quiet sensory-friendly alternatives.

BUDGET-AWARE DIRECTIVE:
Provide distinct budget alternatives for themes, activities, and menus (e.g., Luxe/High-End statement options vs Smart/Cost-Conscious alternatives).

Return a single valid JSON object with NO markdown backticks conforming to this exact structure:
{
  "themes": [
    {
      "title": "Evocative Theme Name",
      "concept": "Narrative describing the emotional atmosphere and experiential mood",
      "decorMotifs": ["Specific decor item 1", "Specific decor item 2", "Specific decor item 3"],
      "lightingAndAmbiance": "Specific ambient lighting and acoustic music guidelines",
      "budgetAlternatives": {
        "luxe": {
          "title": "Luxe Vision",
          "description": "High-impact custom installations or premium rentals",
          "estCostRange": "e.g. 25-35% of total budget"
        },
        "costSmart": {
          "title": "Cost-Smart Alternative",
          "description": "Creative DIY, repurposing, or minimalist architectural lighting",
          "estCostRange": "e.g. 8-12% of total budget"
        }
      },
      "inclusivityNote": "Explanation of how this theme remains universally welcoming without assumptions"
    }
  ],
  "palettes": [
    {
      "name": "Palette Name",
      "colors": [
        { "hex": "#HEX1", "name": "Color Name 1", "role": "primary" },
        { "hex": "#HEX2", "name": "Color Name 2", "role": "accent" },
        { "hex": "#HEX3", "name": "Color Name 3", "role": "neutral" },
        { "hex": "#HEX4", "name": "Color Name 4", "role": "highlight" }
      ],
      "notes": "Styling guidance on applying palette across stationery, linens, and floral arrangements"
    }
  ],
  "invitations": [
    {
      "style": "FORMAL",
      "styleLabel": "Formal & Timeless Elegance",
      "headline": "Invitation headline",
      "bodyText": "Complete wording with event title, date, location, and dress code",
      "rsvpNote": "Clear RSVP deadline with dietary and accessibility accommodation instructions",
      "inclusivityHighlight": "Explicitly welcomes dietary and accessibility requests with ease"
    },
    {
      "style": "WARM_CELEBRATORY",
      "styleLabel": "Warm, Celebratory & Heartfelt",
      "headline": "Celebratory headline",
      "bodyText": "Warm invitation wording celebrating milestone",
      "rsvpNote": "Friendly RSVP note",
      "inclusivityHighlight": "Warm, community-focused tone"
    },
    {
      "style": "CASUAL_MODERN",
      "styleLabel": "Modern & Relaxed",
      "headline": "Relaxed headline",
      "bodyText": "Conversational, modern invitation wording",
      "rsvpNote": "Simple RSVP details",
      "inclusivityHighlight": "Approachable and welcoming to all guests"
    },
    {
      "style": "SHORT_DIGITAL",
      "styleLabel": "Concise & Digital / Paperless",
      "headline": "Quick headline",
      "bodyText": "Clean, punchy text ideal for paperless / SMS / email invites",
      "rsvpNote": "One-click digital RSVP instructions",
      "inclusivityHighlight": "Streamlined accessibility instructions"
    }
  ],
  "activities": [
    {
      "title": "Activity Name",
      "category": "INTERACTIVE",
      "description": "Engaging description of how the activity works",
      "duration": "30-45 mins",
      "budgetTier": "LOW_COST_DIY",
      "budgetAlternative": "Smart alternative suggestion to scale the activity cost up or down",
      "inclusivityConsiderations": "How it accommodates mobility, quiet sensory needs, or all ages"
    }
  ],
  "menu": {
    "beverages": [
      {
        "name": "Beverage Name",
        "type": "CRAFT_MOCKTAIL",
        "description": "Flavor profile",
        "isNonAlcoholic": true
      }
    ],
    "appetizers": [
      {
        "name": "Appetizer Name",
        "description": "Flavor description",
        "dietaryFlags": ["Vegetarian", "Gluten-Free"]
      }
    ],
    "mains": [
      {
        "name": "Main Course Name",
        "description": "Entrée details",
        "dietaryFlags": ["Gluten-Free"]
      }
    ],
    "desserts": [
      {
        "name": "Dessert Name",
        "description": "Decadent dessert",
        "dietaryFlags": ["Vegetarian"]
      }
    ],
    "budgetAlternatives": {
      "luxeStyle": "Plated multi-course or chef-attended stations",
      "costSmartStyle": "Elevated family-style sharing platters or artisanal savory grazing tables"
    },
    "inclusivityNotes": "Details on equal beverage parity for non-drinkers and allergen separation"
  },
  "culturalInclusivityStatement": "These creative concepts celebrate love, milestones, and community without presuming any specific religion, ethnicity, or dogmatic traditions. All elements can be adapted to honor your unique personal values."
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = extractJsonFromText(text);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      throw new AppError('Gemini creative ideas response contained invalid JSON.', 502);
    }

    const validated = CreativeIdeasResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn('[AiService] Creative ideas response failed schema validation:', validated.error.format());
      return this.generateDeterministicCreativeIdeas(input);
    }

    return {
      ...validated.data,
      _source: 'LIVE_AI',
    };
  }

  /**
   * Deterministic creative inspiration generator for offline, test, and fallback modes
   */
  public generateDeterministicCreativeIdeas(input: CreativeIdeasRequestInput): CreativeIdeasResponse {
    const isWedding = input.eventType === 'WEDDING';
    const isBirthday = input.eventType === 'BIRTHDAY';
    const isAnniversary = input.eventType === 'ANNIVERSARY';
    const isCommunity = input.eventType === 'COMMUNITY';

    const locationStr = input.location || 'Private Venue';
    const budgetTotal = input.totalBudget || 5000;
    const currency = input.currency || 'USD';
    const guests = input.guestCount || 50;

    // 1. Personalized Themes with Luxe vs Cost-Smart alternatives
    const themeTitle = input.theme || input.vibeOrTheme || (
      isWedding ? 'Botanical Twilight & Amber Candlelight' :
      isBirthday ? 'Radiant Euphoria & Midsummer Lanterns' :
      isAnniversary ? 'Heritage Gold & Vintage Velvet' :
      isCommunity ? 'Open Air Harvest & Acoustic Gathering' :
      'Modern Minimalist Hearth & Harmony'
    );

    const theme1 = {
      title: themeTitle,
      concept: `An intimate and sensory-rich celebration honoring ${input.title}. Designed around tactile organic textures, warm acoustic resonance, and unhurried hospitality for ${guests} cherished guests.`,
      decorMotifs: [
        'Floating hand-poured soy candles in fluted glass hurricanes',
        'Seasonal architectural foliage, wild eucalyptus, and dried wheat sprays',
        'Woven raw linen runners in oatmeal ivory with bronze table numbers',
        'Minimalist typography signage on deckled recycled cotton paper'
      ],
      lightingAndAmbiance: 'Dimmable 2200K amber filament pendants complemented by 40+ staggered votives at varying heights and low acoustic string arrangements.',
      budgetAlternatives: {
        luxe: {
          title: 'Full Architectural Canopy Installation',
          description: 'Hanging ceiling floral clouds with integrated brass chandeliers and custom-built arched entryway portals.',
          estCostRange: `${Math.round(budgetTotal * 0.22)} - ${Math.round(budgetTotal * 0.30)} ${currency}`
        },
        costSmart: {
          title: 'Refined Tabletop Statement Accents',
          description: 'High-density clusters of thrifted brass candlestick holders paired with potted rosemary herbs that guests can take home as favors.',
          estCostRange: `${Math.round(budgetTotal * 0.06)} - ${Math.round(budgetTotal * 0.10)} ${currency}`
        }
      },
      inclusivityNote: 'Focuses strictly on warmth, natural elements, and community welcome without prescribing any cultural or religious iconography.'
    };

    const theme2 = {
      title: isWedding ? 'Modern Terracotta & Clean Architectural Lines' :
             isBirthday ? 'Electric Velvet & Starlit Neon Glow' :
             isAnniversary ? 'Timeless Monochromatic Ivory & Onyx' :
             'Sunkissed Citrus & Community Plaza',
      concept: `A fresh, design-forward alternative emphasizing uncluttered spaces, bold accent geometry, and relaxed communal mingling.`,
      decorMotifs: [
        'Matte ceramic vessels in soft desert earth tones',
        'Architectural palm fronds and sculptural pampas stalks',
        'Warm wood communal banquet tables with modern cane seating',
        'Interactive polaroid guest portrait gallery wall'
      ],
      lightingAndAmbiance: 'Warm perimeter uplighting with soft geometric neon accent monogram and curated downtempo jazz soundtrack.',
      budgetAlternatives: {
        luxe: {
          title: 'Custom Fabric Drapery & Furniture Lounges',
          description: 'Rented mid-century velvet seating clusters, sculpted cocktail bars, and floor-to-ceiling Belgian linen drape partitions.',
          estCostRange: `${Math.round(budgetTotal * 0.20)} - ${Math.round(budgetTotal * 0.28)} ${currency}`
        },
        costSmart: {
          title: 'Modular Living Plant Vignettes',
          description: 'Renting mature potted fiddle-leaf figs and monstera plants from local nursery suppliers for backdrop greenery.',
          estCostRange: `${Math.round(budgetTotal * 0.05)} - ${Math.round(budgetTotal * 0.09)} ${currency}`
        }
      },
      inclusivityNote: 'Secular, contemporary styling centered on hospitality and effortless gathering.'
    };

    // 2. Curated Color Palettes
    const palette1 = {
      name: 'Autumn Velvet & Spiced Amber',
      colors: [
        { hex: '#7A2035', name: 'Mulberry Wine', role: 'primary' as const },
        { hex: '#CBA83E', name: 'Restrained Gold', role: 'accent' as const },
        { hex: '#D8A47F', name: 'Warm Terracotta', role: 'highlight' as const },
        { hex: '#2E382B', name: 'Forest Moss', role: 'accent' as const },
        { hex: '#FAF7F2', name: 'Warm Ivory', role: 'neutral' as const },
      ],
      notes: 'Use Warm Ivory for base linens and stationery; layer Mulberry Wine into floral highlights and napkins; use Restrained Gold sparingly on cutlery and candle rims.'
    };

    const palette2 = {
      name: 'Earthy Sage & Sun-Bleached Sand',
      colors: [
        { hex: '#4A5B4E', name: 'Dusty Sage', role: 'primary' as const },
        { hex: '#8C6D53', name: 'Toasted Walnut', role: 'neutral' as const },
        { hex: '#E2D7C5', name: 'Desert Sand', role: 'neutral' as const },
        { hex: '#D4AF37', name: 'Champagne Brass', role: 'highlight' as const },
        { hex: '#222923', name: 'Charcoal Spruce', role: 'accent' as const },
      ],
      notes: 'Calming and organic. Best suited for open-air, garden, or modern loft celebrations with abundant natural daylight.'
    };

    // 3. Multi-style Invitation Wording
    const formalWording = {
      style: 'FORMAL' as const,
      styleLabel: 'Formal & Timeless Elegance',
      headline: `The Honour of Your Presence is Requested`,
      bodyText: `Together with their families and dearest companions, you are cordially invited to celebrate ${input.title}.\n\nTaking place on ${input.date} at ${locationStr}.\n\nDinner, commemorative toasts, and celebratory music to follow. Formal or black-tie optional attire requested.`,
      rsvpNote: `Kindly reply by ${input.date}. Please indicate any dietary accommodations (including vegetarian, vegan, and gluten-free) or accessibility requirements with your RSVP.`,
      inclusivityHighlight: 'Clearly invites all dietary and mobility accommodations proactively without making guests feel singled out.'
    };

    const warmWording = {
      style: 'WARM_CELEBRATORY' as const,
      styleLabel: 'Warm, Celebratory & Heartfelt',
      headline: `Join Us to Celebrate ${input.title}!`,
      bodyText: `Because you have filled our lives with laughter, friendship, and joy, we would be overjoyed to have you celebrate with us on ${input.date} at ${locationStr}.\n\nCome ready for delicious food, great stories, heartfelt music, and dancing under the stars. Cocktail or festive celebratory attire.`,
      rsvpNote: `Please let us know if you can make it by ${input.date}. Tell us your favorite dance song and any food preferences so everyone is thoroughly cared for!`,
      inclusivityHighlight: 'Focuses warmly on community, connection, and mutual joy.'
    };

    const casualWording = {
      style: 'CASUAL_MODERN' as const,
      styleLabel: 'Modern & Relaxed',
      headline: `Let's Celebrate: ${input.title}`,
      bodyText: `Save the date for great food, relaxed vibes, and wonderful company! We are gathering on ${input.date} at ${locationStr} to mark this special milestone.\n\nDress comfortably and come as you are.`,
      rsvpNote: `RSVP online by ${input.date}. Include any food allergies or accessibility needs so we can ensure everyone has a wonderful time.`,
      inclusivityHighlight: 'Low-pressure, modern tone with inclusive hospitality.'
    };

    const shortDigitalWording = {
      style: 'SHORT_DIGITAL' as const,
      styleLabel: 'Concise & Digital / Paperless',
      headline: `${input.title} • ${input.date}`,
      bodyText: `You're invited! Join us at ${locationStr} on ${input.date}.\n\nDrinks, dining & celebration. Full details, maps, and directions online.`,
      rsvpNote: `Tap link to RSVP. Dietary options and wheelchair accessibility confirmed on site.`,
      inclusivityHighlight: 'Optimized for mobile viewing, text messaging, and screen readers.'
    };

    // 4. Inclusive & Budget-Aware Activities
    const activities = [
      {
        title: 'Storytelling Circle & Commemorative Toast Relay',
        category: 'MEMORABLE_MOMENT' as const,
        description: 'Designate 4-5 close companions to share short, 90-second heartfelt reflections or hilarious anecdotes, followed by a shared collective toast for all guests.',
        duration: '25-35 mins',
        budgetTier: 'LOW_COST_DIY' as const,
        budgetAlternative: 'Cost-smart: Free DIY moderation by an articulate friend instead of a hired emcee.',
        inclusivityConsiderations: 'Handheld wireless mics provided so speakers can stand or sit comfortably; sparkling apple cider and mocktails available for all to participate.'
      },
      {
        title: 'Interactive Audio Guestbook & Polaroid Station',
        category: 'INTERACTIVE' as const,
        description: 'A vintage telephone recording booth or instant polaroid table where guests snap photos, write advice cards, and leave voice messages.',
        duration: 'Ongoing throughout evening',
        budgetTier: 'MODERATE' as const,
        budgetAlternative: 'Luxe option: Hired vintage phone booth; Cost-smart option: QR code linking to a private voice-memo drop box.',
        inclusivityConsiderations: 'Accessible table height (30 inches); tactile pens and large-print prompts provided for all abilities.'
      },
      {
        title: 'Bespoke Celebration Trivia & Icebreaker Quest',
        category: 'ICEBREAKER' as const,
        description: 'A lighthearted 5-question table quiz about the guest of honor or celebration history, encouraging guests at each table to collaborate.',
        duration: '20 mins during salad or cocktail hour',
        budgetTier: 'LOW_COST_DIY' as const,
        budgetAlternative: 'Cost-smart: Printable parchment cards on tables; Luxe: Smartphone app with real-time projector leaderboard.',
        inclusivityConsiderations: 'No physical movement required; questions focus on universal fun facts rather than niche cultural trivia.'
      },
      {
        title: 'Acoustic Golden Hour Lounge & Quiet Sanctuary',
        category: 'LOW_KEY' as const,
        description: 'A dedicated low-stimulus seating area with comfortable armchairs and soft ambient background acoustics away from the primary dance floor speakers.',
        duration: 'Available throughout event',
        budgetTier: 'LOW_COST_DIY' as const,
        budgetAlternative: 'Free: Repurposing existing venue patio or alcove with cozy throw blankets and warm lamp light.',
        inclusivityConsiderations: 'Crucial sensory-friendly sanctuary for neurodiverse guests, elderly family members, and those needing a quiet moment.'
      }
    ];

    // 5. Inclusive Menu with Mocktail Parity and Budget Alternatives
    const dietaryNotes = input.dietaryNeeds || ['Gluten-Free', 'Vegetarian'];
    const menu = {
      beverages: [
        {
          name: 'The Golden Hour Spritz',
          type: 'SIGNATURE_COCKTAIL' as const,
          description: 'Artisan botanical gin, sparkling prosecco, elderflower liqueur, garnished with dehydrated blood orange and fresh rosemary.',
          isNonAlcoholic: false
        },
        {
          name: 'Sparkling Rosemary & Pear Nectar (Zero-Proof)',
          type: 'CRAFT_MOCKTAIL' as const,
          description: 'Chilled white pear purée, wildflower honey syrup, sparkling mineral water, charred rosemary sprig, and crushed pink peppercorn.',
          isNonAlcoholic: true
        },
        {
          name: 'Smoked Vanilla & Cardamom Cold Brew Bar',
          type: 'ARTISAN_TEA_COFFEE' as const,
          description: 'Slow-steeped craft cold brew or roasted chicory, oat milk foam, infused cardamom syrup, and dark cocoa dust.',
          isNonAlcoholic: true
        }
      ],
      appetizers: [
        {
          name: 'Crispy Polenta Bites with Fig & Whipped Ricotta',
          description: 'Golden herbed polenta cubes topped with caramelized mission fig jam, micro basil, and a drizzle of balsamic glaze.',
          dietaryFlags: ['Vegetarian', 'Gluten-Free']
        },
        {
          name: 'Wild Mushroom Tartlet with Thyme & Truffle Crema',
          description: 'Flaky pastry nest filled with sautéed chanterelles, caramelized shallots, and dairy-free thyme emulsion.',
          dietaryFlags: ['Vegetarian', 'Vegan Option Available']
        }
      ],
      mains: [
        {
          name: 'Slow-Braised Rosemary Short Rib or Pan-Seared Halibut',
          description: 'Served atop parsnip-potato purée with charred asparagus spears and red wine reduction.',
          dietaryFlags: ['Gluten-Free', 'Halal-Friendly Meat Source Available']
        },
        {
          name: 'Roasted Delicata Squash with Wild Rice & Pomegranate Jewels',
          description: 'Stuffed heirloom squash with toasted pecans, wild grains, tender greens, and warm maple-tahini drizzle.',
          dietaryFlags: ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free Modification Ready']
        }
      ],
      desserts: [
        {
          name: 'Flourless Dark Chocolate Torte with Raspberry Couli',
          description: 'Decadent 70% dark cocoa torte served with fresh berries, gold dust, and spun vanilla bean chantilly.',
          dietaryFlags: ['Vegetarian', 'Gluten-Free']
        }
      ],
      budgetAlternatives: {
        luxeStyle: 'Multi-course synchronized French plated service with paired vintage pours and tableside sommelier presentation.',
        costSmartStyle: 'Elevated family-style shared platters with warm hearth breads, grain salads, and carving board served at the center of each table.'
      },
      inclusivityNotes: 'Dedicated 1-to-1 craft mocktail parity ensures non-drinkers are celebrated equally. Clear allergen labeling on printed menus and separate prep surfaces for dietary needs.'
    };

    return {
      themes: [theme1, theme2],
      palettes: [palette1, palette2],
      invitations: [formalWording, warmWording, casualWording, shortDigitalWording],
      activities,
      menu,
      culturalInclusivityStatement: 'These creative concepts celebrate love, milestones, and community without presuming any specific religion, ethnicity, or dogmatic traditions. All elements can be adapted to honor your unique personal values.',
      _source: 'OFFLINE_DEMO'
    };
  }
}

export const aiService = new AiService();
