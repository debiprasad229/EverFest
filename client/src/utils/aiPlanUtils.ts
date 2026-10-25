import { GeneratedAiPlan, VendorCategory, TaskPriority, CreativeIdeasResponse } from '../types/index.js';

export interface PlanSelections {
  applyTheme: boolean;
  selectedBudgetIndices: number[];
  selectedTaskIndices: number[];
  selectedAgendaIndices: number[];
  selectedVendorIndices: number[];
}

export type PlanSource = 'LIVE_AI' | 'OFFLINE_DEMO';

export interface PlanWithMetadata extends GeneratedAiPlan {
  _source: PlanSource;
  _generatedAt: string;
  _modelUsed?: string;
}

export interface AiPlanErrorDetails {
  type: 'QUOTA' | 'TIMEOUT' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN';
  title: string;
  message: string;
  canRetry: boolean;
  suggestDemo: boolean;
}

/**
 * Classifies an error into a user-friendly structured error category
 */
export function parseAiPlanError(err: any): AiPlanErrorDetails {
  const message = err?.message || (typeof err === 'string' ? err : 'Unknown error occurred');
  const lower = message.toLowerCase();

  if (
    lower.includes('quota') || 
    lower.includes('429') || 
    lower.includes('resource_exhausted') || 
    lower.includes('rate limit')
  ) {
    return {
      type: 'QUOTA',
      title: 'Gemini Quota Exceeded',
      message: 'The Google Gemini free-tier quota limit has been reached for the current time window. You can retry shortly or switch to Demo Mode.',
      canRetry: true,
      suggestDemo: true,
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('504')) {
    return {
      type: 'TIMEOUT',
      title: 'Request Timed Out',
      message: 'The AI planning engine took longer than 25 seconds to respond. Check your network or retry.',
      canRetry: true,
      suggestDemo: true,
    };
  }

  if (
    lower.includes('failed to fetch') || 
    lower.includes('network') || 
    lower.includes('econnrefused') || 
    lower.includes('unreachable')
  ) {
    return {
      type: 'NETWORK',
      title: 'Backend Unreachable',
      message: 'Could not connect to the EverFest server on http://localhost:5000. Ensure the backend server is running or use Demo Mode.',
      canRetry: true,
      suggestDemo: true,
    };
  }

  if (
    lower.includes('validation') || 
    lower.includes('invalid') || 
    lower.includes('malformed') || 
    lower.includes('incomplete') || 
    lower.includes('schema') || 
    lower.includes('400')
  ) {
    return {
      type: 'VALIDATION',
      title: 'Invalid or Malformed Data',
      message: message,
      canRetry: false,
      suggestDemo: true,
    };
  }

  return {
    type: 'UNKNOWN',
    title: 'Generation Failed',
    message: message,
    canRetry: true,
    suggestDemo: true,
  };
}

/**
 * Generates an offline deterministic demo plan with explicit demo tagging
 */
export function generateOfflineDemoPlan(input: {
  title: string;
  eventType: string;
  date: string;
  totalBudget: number;
  guestCount: number;
  vibeOrTheme?: string;
  location?: string;
}): PlanWithMetadata {
  const budget = input.totalBudget || 5000;
  const guests = input.guestCount || 50;
  const type = input.eventType;
  const eventDate = new Date(input.date);

  const themeTitle = input.vibeOrTheme || 'Romantic Tuscan Twilight & Warm Amber';
  const themeDesc = 'Candlelight warmth, textured linen runners, olive branch foliage, and acoustic jazz melodies creating an intimate, timeless celebration.';
  const colorPalette = ['#882A36', '#CBA83E', '#D8A47F', '#2E382B', '#FAF7F2'];

  const budgetSuggestions = [
    { category: 'VENUE', name: 'Estate Lawn & Reception Pavilion', estimatedCost: Math.round(budget * 0.30), notes: '10 hours exclusive access, private dressing suites, and cleanup' },
    { category: 'CATERING', name: 'Farm-to-Table Plated Dinner & Wine Service', estimatedCost: Math.round(budget * 0.32), notes: `Approx. $${Math.round((budget * 0.32) / Math.max(guests, 1))}/guest with welcome appetizers` },
    { category: 'PHOTOGRAPHY', name: 'Documentary Photo & Aerial Highlights', estimatedCost: Math.round(budget * 0.12), notes: 'Full day coverage with digital gallery and print rights' },
    { category: 'DECORATION', name: 'Ceremony Arch, Centerpieces & Ambient Lighting', estimatedCost: Math.round(budget * 0.10), notes: 'Botanical foliage, custom bronze candelabras, and fairy lights' },
    { category: 'ENTERTAINMENT', name: 'Acoustic Trio Prelude & Evening DJ', estimatedCost: Math.round(budget * 0.08), notes: 'Sound equipment, wireless microphones, and dance floor lighting' },
    { category: 'TRANSPORT', name: 'Guest Shuttle Vans & VIP Getaway Vehicle', estimatedCost: Math.round(budget * 0.04), notes: 'Looping transport between downtown hotels and venue' },
    { category: 'OTHER', name: 'Contingency & Incidentals Cushion', estimatedCost: Math.round(budget * 0.04), notes: 'Emergency buffer for weather adjustments and unexpected overtime' },
  ];

  const tasksRaw = [
    { title: 'Secure & Deposit Venue Contract', category: 'Venue', priority: 'URGENT' as TaskPriority, offset: -180, desc: 'Confirm noise curfew, setup windows, and insurance requirements', milestone: true },
    { title: 'Contract Photographer & Videographer', category: 'Creative', priority: 'HIGH' as TaskPriority, offset: -150, desc: 'Review sample galleries and lock in date with initial retainer', milestone: true },
    { title: 'Tasting & Custom Menu Selection', category: 'Catering', priority: 'HIGH' as TaskPriority, offset: -120, desc: 'Coordinate dietary flags (gluten-free, vegan) with catering chef', milestone: false },
    { title: 'Send Formal Invitations & Launch RSVP Link', category: 'Stationery', priority: 'HIGH' as TaskPriority, offset: -90, desc: 'Collect guest meal choices and accessibility accommodations', milestone: true },
    { title: 'Finalize Day-of Run-of-Show & Vendor Brief', category: 'Coordination', priority: 'URGENT' as TaskPriority, offset: -14, desc: 'Distribute timeline cheat-sheet to bridal party, DJ, and coordinator', milestone: true },
    { title: 'Walkthrough Rehearsal & Vendor Check-in', category: 'Operations', priority: 'MEDIUM' as TaskPriority, offset: -1, desc: 'Verify seating arrangements, audio soundcheck, and final guest counts', milestone: false },
  ];

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

  const agenda = [
    { startTime: '15:30', endTime: '16:00', title: 'Guest Arrival & Refreshments', description: 'Guests welcomed with infused spritzes and acoustic prelude music', location: 'Welcome Lawn', picName: 'Lead Usher' },
    { startTime: '16:15', endTime: '17:00', title: 'Main Ceremony / Presentation', description: 'Processional, heartfelt exchange of vows or anniversary tribute', location: 'Ceremony Pavilion', picName: 'Lead Officiant' },
    { startTime: '17:00', endTime: '18:15', title: 'Sunset Cocktails & Golden Hour Photos', description: 'Canapés circulated; portrait session in natural light', location: 'Terrace Garden', picName: 'Banquet Captain' },
    { startTime: '18:30', endTime: '20:15', title: 'Plated Dinner Banquet & Commemorative Toasts', description: '3-course plated culinary experience with speeches', location: 'Main Dining Hall', picName: 'MC & Banquet Lead' },
    { startTime: '20:30', endTime: '23:00', title: 'First Dance & Open Dance Floor', description: 'DJ ignites celebration, dessert station opens, evening dancing', location: 'Dance Pavilion', picName: 'DJ & MC' },
  ];

  const vendorCategories = [
    { category: 'VENUE', name: 'Estate Coordinator', estimatedBudget: Math.round(budget * 0.30), questionsToAsk: ['Are outside insured caterers allowed?', 'What is the exact amplification curfew?'] },
    { category: 'CATERING', name: 'Boutique Catering Chef', estimatedBudget: Math.round(budget * 0.32), questionsToAsk: ['How are gluten-free and allergen meals labeled?', 'Is bar staff included in quote?'] },
    { category: 'PHOTOGRAPHY', name: 'Visual Storyteller', estimatedBudget: Math.round(budget * 0.12), questionsToAsk: ['How many edited photos are delivered?', 'Is a secondary shooter included?'] },
  ];

  return {
    _source: 'OFFLINE_DEMO',
    _generatedAt: new Date().toISOString(),
    eventConcept: `[Demo Template] An authentically orchestrated ${type.toLowerCase()} celebration uniting loved ones through memorable dining and seamless milestone transitions.`,
    theme: {
      title: themeTitle,
      description: themeDesc,
      colorPalette,
    },
    agenda,
    budgetSuggestions,
    datedTasks,
    vendorCategories,
    decorationIdeas: [
      'Low-incline botanical floral runners interspersed with hand-poured plum and ivory taper candles.',
      'Custom gold leaf acrylic welcome signage positioned at the pavilion foyer entrance.',
      'Overhead warm string lights creating a canopy effect across the main dining and dancing space.'
    ],
    menuOrActivityIdeas: [
      'Welcome Elderflower Rosemary Spritz with citrus garnish for refreshing guest greeting.',
      'Local seasonal farm salad with heirloom beets, goat cheese medallions, and honey balsamic vinaigrette.',
      'Interactive Polaroid memory guestbook table with metallic calligraphy markers.'
    ],
    assumptions: [
      '[Demo Assumption] Assumes a 4-hour pre-event vendor setup window granted by venue management.',
      '[Demo Assumption] Assumes outside insured catering and live amplification are permitted within municipal sound ordinances.'
    ],
    warnings: [
      '[Demo Caution] Strict outdoor sound curfew typically enforced at 23:00 by local residential ordinance.',
      '[Demo Caution] Catering headcounts and dietary restrictions must be frozen at least 14 days prior to avoid overage surcharges.'
    ],

    // Aliases
    themeConcept: {
      title: themeTitle,
      description: themeDesc,
      colorPalette,
    },
    suggestedBudgetBreakdown: budgetSuggestions,
    milestoneTasks: datedTasks,
    runOfShow: agenda,
    vendorRecommendations: vendorCategories,
  };
}

/**
 * Filters a plan so only the user's selected suggestions are applied,
 * ensuring no unselected or existing items are overwritten.
 */
export function filterPlanForAdoption(
  plan: GeneratedAiPlan,
  selections: PlanSelections
): GeneratedAiPlan {
  const budgetSource = plan.budgetSuggestions || plan.suggestedBudgetBreakdown || [];
  const selectedBudget = selections.selectedBudgetIndices.map((i) => budgetSource[i]).filter(Boolean);

  const taskSource = plan.datedTasks || plan.milestoneTasks || [];
  const selectedTasks = selections.selectedTaskIndices.map((i) => taskSource[i]).filter(Boolean);

  const agendaSource = plan.agenda || plan.runOfShow || [];
  const selectedAgenda = selections.selectedAgendaIndices.map((i) => agendaSource[i]).filter(Boolean);

  const vendorSource = plan.vendorCategories || plan.vendorRecommendations || [];
  const selectedVendors = selections.selectedVendorIndices.map((i) => vendorSource[i]).filter(Boolean);

  return {
    ...plan,
    theme: selections.applyTheme ? plan.theme : { title: '', description: '', colorPalette: [] },
    themeConcept: selections.applyTheme ? plan.themeConcept : { title: '', description: '', colorPalette: [] },
    budgetSuggestions: selectedBudget,
    suggestedBudgetBreakdown: selectedBudget,
    datedTasks: selectedTasks,
    milestoneTasks: selectedTasks,
    agenda: selectedAgenda,
    runOfShow: selectedAgenda,
    vendorCategories: selectedVendors,
    vendorRecommendations: selectedVendors,
  };
}

/**
 * Generates an offline deterministic creative inspiration pack with explicit demo branding.
 */
export function generateOfflineDemoCreativeIdeas(input: any): CreativeIdeasResponse {
  const isWedding = input.eventType === 'WEDDING';
  const isBirthday = input.eventType === 'BIRTHDAY';
  const isAnniversary = input.eventType === 'ANNIVERSARY';
  const title = input.title || 'Celebration';
  const date = input.date || 'TBD';
  const location = input.location || 'Private Celebration Venue';
  const budget = input.totalBudget || 5000;
  const currency = input.currency || 'USD';
  const guests = input.guestCount || 50;

  const themeTitle = input.theme || input.vibeOrTheme || (
    isWedding ? 'Botanical Twilight & Amber Candlelight' :
    isBirthday ? 'Radiant Euphoria & Midsummer Lanterns' :
    isAnniversary ? 'Heritage Gold & Vintage Velvet' :
    'Modern Minimalist Hearth & Harmony'
  );

  return {
    themes: [
      {
        title: `[Demo Template] ${themeTitle}`,
        concept: `An intimate and sensory-rich celebration honoring ${title}. Designed around tactile organic textures, warm acoustic resonance, and unhurried hospitality for ${guests} guests.`,
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
            estCostRange: `${Math.round(budget * 0.22)} - ${Math.round(budget * 0.30)} ${currency}`
          },
          costSmart: {
            title: 'Refined Tabletop Statement Accents',
            description: 'High-density clusters of brass candlestick holders paired with potted rosemary herbs that guests can take home as favors.',
            estCostRange: `${Math.round(budget * 0.06)} - ${Math.round(budget * 0.10)} ${currency}`
          }
        },
        inclusivityNote: 'Focuses strictly on warmth, natural elements, and community welcome without prescribing any cultural or religious iconography.'
      },
      {
        title: isWedding ? '[Demo Template] Modern Terracotta & Clean Architectural Lines' :
               isBirthday ? '[Demo Template] Electric Velvet & Starlit Neon Glow' :
               isAnniversary ? '[Demo Template] Timeless Monochromatic Ivory & Onyx' :
               '[Demo Template] Sunkissed Citrus & Community Plaza',
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
            estCostRange: `${Math.round(budget * 0.20)} - ${Math.round(budget * 0.28)} ${currency}`
          },
          costSmart: {
            title: 'Modular Living Plant Vignettes',
            description: 'Renting mature potted fiddle-leaf figs and monstera plants from local nursery suppliers for backdrop greenery.',
            estCostRange: `${Math.round(budget * 0.05)} - ${Math.round(budget * 0.09)} ${currency}`
          }
        },
        inclusivityNote: 'Secular, contemporary styling centered on hospitality and effortless gathering.'
      }
    ],
    palettes: [
      {
        name: 'Autumn Velvet & Spiced Amber',
        colors: [
          { hex: '#7A2035', name: 'Mulberry Wine', role: 'primary' },
          { hex: '#CBA83E', name: 'Restrained Gold', role: 'accent' },
          { hex: '#D8A47F', name: 'Warm Terracotta', role: 'highlight' },
          { hex: '#2E382B', name: 'Forest Moss', role: 'accent' },
          { hex: '#FAF7F2', name: 'Warm Ivory', role: 'neutral' },
        ],
        notes: 'Use Warm Ivory for base linens and stationery; layer Mulberry Wine into floral highlights and napkins; use Restrained Gold sparingly on cutlery and candle rims.'
      },
      {
        name: 'Earthy Sage & Sun-Bleached Sand',
        colors: [
          { hex: '#4A5B4E', name: 'Dusty Sage', role: 'primary' },
          { hex: '#8C6D53', name: 'Toasted Walnut', role: 'neutral' },
          { hex: '#E2D7C5', name: 'Desert Sand', role: 'neutral' },
          { hex: '#D4AF37', name: 'Champagne Brass', role: 'highlight' },
          { hex: '#222923', name: 'Charcoal Spruce', role: 'accent' },
        ],
        notes: 'Calming and organic. Best suited for open-air, garden, or modern loft celebrations with abundant natural daylight.'
      }
    ],
    invitations: [
      {
        style: 'FORMAL',
        styleLabel: 'Formal & Timeless Elegance',
        headline: `The Honour of Your Presence is Requested`,
        bodyText: `Together with their families and dearest companions, you are cordially invited to celebrate ${title}.\n\nTaking place on ${date} at ${location}.\n\nDinner, commemorative toasts, and celebratory music to follow. Formal or black-tie optional attire requested.`,
        rsvpNote: `Kindly reply by ${date}. Please indicate any dietary accommodations (including vegetarian, vegan, and gluten-free) or accessibility requirements with your RSVP.`,
        inclusivityHighlight: 'Clearly invites all dietary and mobility accommodations proactively without making guests feel singled out.'
      },
      {
        style: 'WARM_CELEBRATORY',
        styleLabel: 'Warm, Celebratory & Heartfelt',
        headline: `Join Us to Celebrate ${title}!`,
        bodyText: `Because you have filled our lives with laughter, friendship, and joy, we would be overjoyed to have you celebrate with us on ${date} at ${location}.\n\nCome ready for delicious food, great stories, heartfelt music, and dancing under the stars. Cocktail or festive celebratory attire.`,
        rsvpNote: `Please let us know if you can make it by ${date}. Tell us your favorite dance song and any food preferences so everyone is thoroughly cared for!`,
        inclusivityHighlight: 'Focuses warmly on community, connection, and mutual joy.'
      },
      {
        style: 'CASUAL_MODERN',
        styleLabel: 'Modern & Relaxed',
        headline: `Let's Celebrate: ${title}`,
        bodyText: `Save the date for great food, relaxed vibes, and wonderful company! We are gathering on ${date} at ${location} to mark this special milestone.\n\nDress comfortably and come as you are.`,
        rsvpNote: `RSVP online by ${date}. Include any food allergies or accessibility needs so we can ensure everyone has a wonderful time.`,
        inclusivityHighlight: 'Low-pressure, modern tone with inclusive hospitality.'
      },
      {
        style: 'SHORT_DIGITAL',
        styleLabel: 'Concise & Digital / Paperless',
        headline: `${title} • ${date}`,
        bodyText: `You're invited! Join us at ${location} on ${date}.\n\nDrinks, dining & celebration. Full details, maps, and directions online.`,
        rsvpNote: `Tap link to RSVP. Dietary options and wheelchair accessibility confirmed on site.`,
        inclusivityHighlight: 'Optimized for mobile viewing, text messaging, and screen readers.'
      }
    ],
    activities: [
      {
        title: 'Storytelling Circle & Commemorative Toast Relay',
        category: 'MEMORABLE_MOMENT',
        description: 'Designate 4-5 close companions to share short, 90-second heartfelt reflections or hilarious anecdotes, followed by a shared collective toast for all guests.',
        duration: '25-35 mins',
        budgetTier: 'LOW_COST_DIY',
        budgetAlternative: 'Cost-smart: Free DIY moderation by an articulate friend instead of a hired emcee.',
        inclusivityConsiderations: 'Handheld wireless mics provided so speakers can stand or sit comfortably; sparkling apple cider and mocktails available for all to participate.'
      },
      {
        title: 'Interactive Audio Guestbook & Polaroid Station',
        category: 'INTERACTIVE',
        description: 'A vintage telephone recording booth or instant polaroid table where guests snap photos, write advice cards, and leave voice messages.',
        duration: 'Ongoing throughout evening',
        budgetTier: 'MODERATE',
        budgetAlternative: 'Luxe option: Hired vintage phone booth; Cost-smart option: QR code linking to a private voice-memo drop box.',
        inclusivityConsiderations: 'Accessible table height (30 inches); tactile pens and large-print prompts provided for all abilities.'
      },
      {
        title: 'Bespoke Celebration Trivia & Icebreaker Quest',
        category: 'ICEBREAKER',
        description: 'A lighthearted 5-question table quiz about the guest of honor or celebration history, encouraging guests at each table to collaborate.',
        duration: '20 mins during salad or cocktail hour',
        budgetTier: 'LOW_COST_DIY',
        budgetAlternative: 'Cost-smart: Printable parchment cards on tables; Luxe: Smartphone app with real-time projector leaderboard.',
        inclusivityConsiderations: 'No physical movement required; questions focus on universal fun facts rather than niche cultural trivia.'
      },
      {
        title: 'Acoustic Golden Hour Lounge & Quiet Sanctuary',
        category: 'LOW_KEY',
        description: 'A dedicated low-stimulus seating area with comfortable armchairs and soft ambient background acoustics away from the primary dance floor speakers.',
        duration: 'Available throughout event',
        budgetTier: 'LOW_COST_DIY',
        budgetAlternative: 'Free: Repurposing existing venue patio or alcove with cozy throw blankets and warm lamp light.',
        inclusivityConsiderations: 'Crucial sensory-friendly sanctuary for neurodiverse guests, elderly family members, and those needing a quiet moment.'
      }
    ],
    menu: {
      beverages: [
        {
          name: 'The Golden Hour Spritz',
          type: 'SIGNATURE_COCKTAIL',
          description: 'Artisan botanical gin, sparkling prosecco, elderflower liqueur, garnished with dehydrated blood orange and fresh rosemary.',
          isNonAlcoholic: false
        },
        {
          name: 'Sparkling Rosemary & Pear Nectar (Zero-Proof)',
          type: 'CRAFT_MOCKTAIL',
          description: 'Chilled white pear purée, wildflower honey syrup, sparkling mineral water, charred rosemary sprig, and crushed pink peppercorn.',
          isNonAlcoholic: true
        },
        {
          name: 'Smoked Vanilla & Cardamom Cold Brew Bar',
          type: 'ARTISAN_TEA_COFFEE',
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
    },
    culturalInclusivityStatement: '[Demo Mode] These creative concepts celebrate love, milestones, and community without presuming any specific religion, ethnicity, or dogmatic traditions. All elements can be adapted to honor your unique personal values.',
    _source: 'OFFLINE_DEMO'
  };
}

