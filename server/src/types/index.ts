import { z } from 'zod';

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const EventTypeEnum = z.enum([
  'WEDDING',
  'BIRTHDAY',
  'ANNIVERSARY',
  'COMMUNITY',
  'OTHER'
]);
export type EventType = z.infer<typeof EventTypeEnum>;

export const EventStatusEnum = z.enum([
  'PLANNING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
]);
export type EventStatus = z.infer<typeof EventStatusEnum>;

export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

export const TaskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const BudgetCategoryEnum = z.enum([
  'VENUE',
  'CATERING',
  'DECORATIONS',
  'PHOTOGRAPHY',
  'ENTERTAINMENT',
  'INVITATIONS',
  'TRANSPORT',
  'CONTINGENCY',
  'OTHER'
]);
export type BudgetCategory = z.infer<typeof BudgetCategoryEnum>;

export const VendorCategoryEnum = z.enum([
  'VENUE',
  'CATERING',
  'PHOTOGRAPHY',
  'DECORATION',
  'DECORATIONS',
  'ENTERTAINMENT',
  'TRANSPORT',
  'VIDEOGRAPHY',
  'MUSIC_DJ',
  'FLORIST',
  'DECOR_STYLING',
  'BAKER_CAKE',
  'HAIR_MAKEUP',
  'INVITATIONS',
  'CONTINGENCY',
  'RENTALS',
  'PERMITS',
  'OTHER'
]);
export type VendorCategory = z.infer<typeof VendorCategoryEnum>;

export const VendorStatusEnum = z.enum([
  'RESEARCHING',
  'CONTACTED',
  'QUOTED',
  'BOOKED',
  'COMPLETED',
  'DECLINED'
]);
export type VendorStatus = z.infer<typeof VendorStatusEnum>;

export const PaymentStatusEnum = z.enum([
  'UNPAID',
  'DEPOSIT_PAID',
  'PAID_IN_FULL'
]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

// ==========================================
// CORE ENTITY INTERFACES
// ==========================================

export interface BudgetItem {
  id: string;
  eventId: string;
  category: BudgetCategory | VendorCategory | string;
  name: string;
  estimatedCost: number;
  actualCost: number;
  paymentStatus: PaymentStatus;
  dueDate?: string;
  notes?: string;
  vendorId?: string;
  isEstimate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  notes?: string;
  assignee?: string;
  category?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  orderIndex: number;
  isMilestone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RunOfShowItem {
  id: string;
  eventId: string;
  startTime: string;   // "15:30"
  endTime?: string;    // "16:15"
  title: string;
  description?: string;
  location?: string;
  picName?: string;    // Person In Charge
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  eventId: string;
  name: string;
  category: VendorCategory;
  status: VendorStatus;
  contactPerson?: string;
  contactDetails?: string;
  email?: string;
  phone?: string;
  website?: string;
  quotedPrice?: number;
  quotedAmount?: number;
  contractAmount?: number;
  notes?: string;
  budgetCategory?: string;
  budgetItemId?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  eventType: EventType;
  status: EventStatus;
  date: string;         // ISO date string "2026-11-14"
  startTime?: string;   // "14:00"
  endTime?: string;     // "22:00"
  locationName?: string;
  locationAddress?: string;
  estimatedGuests: number;
  totalBudget: number;
  themeAesthetic?: string;
  colorPalette?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventWithDetails extends Event {
  budgetItems: BudgetItem[];
  tasks: Task[];
  runOfShowItems: RunOfShowItem[];
  vendors: Vendor[];
  metrics: {
    totalEstimatedBudget: number;
    totalActualCost: number;
    remainingBudget: number;
    budgetVariance: number;
    completedTasksCount: number;
    totalTasksCount: number;
    tasksProgressPercent: number;
    bookedVendorsCount: number;
    totalVendorsCount: number;
  };
}

// ==========================================
// AI GENERATION SCHEMAS & VALIDATION
// ==========================================

export const EventPlanRequestSchema = z.object({
  eventType: EventTypeEnum,
  title: z
    .string()
    .min(2, "Event title must be at least 2 characters")
    .max(150, "Event title cannot exceed 150 characters"),
  date: z
    .string()
    .min(4, "Date is required")
    .max(50, "Date string format is invalid"),
  totalBudget: z
    .number()
    .nonnegative("Budget must be non-negative")
    .max(100_000_000, "Budget cannot exceed $100,000,000"),
  guestCount: z
    .number()
    .int()
    .positive("Guest count must be at least 1")
    .max(100_000, "Guest count cannot exceed 100,000"),
  location: z
    .string()
    .max(200, "Location cannot exceed 200 characters")
    .optional(),
  theme: z
    .string()
    .max(300, "Theme cannot exceed 300 characters")
    .optional(),
  vibeOrTheme: z
    .string()
    .max(300, "Vibe / theme cannot exceed 300 characters")
    .optional(),
  preferences: z
    .string()
    .max(1000, "Preferences cannot exceed 1000 characters")
    .optional(),
  specialPreferences: z
    .string()
    .max(1000, "Special preferences cannot exceed 1000 characters")
    .optional(),
  dietaryNeeds: z
    .array(z.string().max(100, "Dietary entry cannot exceed 100 characters"))
    .max(30)
    .optional(),
  accessibilityNeeds: z
    .array(z.string().max(100, "Accessibility entry cannot exceed 100 characters"))
    .max(30)
    .optional(),
  priorities: z
    .array(z.string().max(100, "Priority item cannot exceed 100 characters"))
    .max(30)
    .optional(),
  restrictions: z
    .array(z.string().max(100, "Restriction item cannot exceed 100 characters"))
    .max(30)
    .optional(),
});
export type EventPlanRequestInput = z.infer<typeof EventPlanRequestSchema>;
export const GenerateAiPlanSchema = EventPlanRequestSchema;
export type GenerateAiPlanInput = EventPlanRequestInput;

// Server-side Gemini response shape validation schema
export const GeminiEventPlanResponseSchema = z.object({
  eventConcept: z.string().min(10, "Event concept summary is required"),
  theme: z.object({
    title: z.string().min(2),
    description: z.string().min(5),
    colorPalette: z.array(z.string()).min(3).max(8),
  }),
  agenda: z.array(
    z.object({
      startTime: z.string(),
      endTime: z.string(),
      title: z.string(),
      description: z.string(),
      location: z.string(),
      picName: z.string().optional().default('Event Lead / Coordinator'),
    })
  ).min(2),
  budgetSuggestions: z.array(
    z.object({
      category: z.string(),
      name: z.string(),
      estimatedCost: z.number().nonnegative(),
      notes: z.string().optional().default(''),
    })
  ).min(2),
  datedTasks: z.array(
    z.object({
      title: z.string(),
      category: z.string(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      timelineOffsetDays: z.number(),
      dueDate: z.string().optional(),
      description: z.string().optional().default(''),
      isMilestone: z.boolean().default(false),
    })
  ).min(2),
  vendorCategories: z.array(
    z.object({
      category: z.string(),
      name: z.string(),
      estimatedBudget: z.number().nonnegative().optional().default(0),
      questionsToAsk: z.array(z.string()).optional().default([]),
    })
  ).default([]),
  decorationIdeas: z.array(z.string()).default([]),
  menuOrActivityIdeas: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type GeminiEventPlanResponse = z.infer<typeof GeminiEventPlanResponseSchema>;

export interface GeneratedAiPlan {
  // Required structured fields
  eventConcept: string;
  theme: {
    title: string;
    description: string;
    colorPalette: string[];
  };
  agenda: Array<{
    startTime: string;
    endTime: string;
    title: string;
    description: string;
    location: string;
    picName: string;
  }>;
  budgetSuggestions: Array<{
    category: VendorCategory | string;
    name: string;
    estimatedCost: number;
    notes: string;
  }>;
  datedTasks: Array<{
    title: string;
    category: string;
    priority: TaskPriority;
    timelineOffsetDays: number;
    dueDate?: string;
    description: string;
    isMilestone: boolean;
  }>;
  vendorCategories: Array<{
    category: VendorCategory | string;
    name: string;
    estimatedBudget: number;
    questionsToAsk: string[];
  }>;
  decorationIdeas: string[];
  menuOrActivityIdeas: string[];
  assumptions: string[];
  warnings: string[];

  // Compatibility aliases for existing UI code
  themeConcept: {
    title: string;
    description: string;
    colorPalette: string[];
  };
  suggestedBudgetBreakdown: Array<{
    category: VendorCategory | string;
    name: string;
    estimatedCost: number;
    notes: string;
  }>;
  milestoneTasks: Array<{
    title: string;
    category: string;
    priority: TaskPriority;
    timelineOffsetDays: number;
    description: string;
    isMilestone: boolean;
  }>;
  runOfShow: Array<{
    startTime: string;
    endTime: string;
    title: string;
    description: string;
    location: string;
    picName: string;
  }>;
  vendorRecommendations: Array<{
    category: VendorCategory | string;
    name: string;
    estimatedBudget: number;
    questionsToAsk: string[];
  }>;
}

// ==========================================
// VALIDATION SCHEMAS FOR REST APIS
// ==========================================

export const CreateEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  eventType: EventTypeEnum,
  status: EventStatusEnum.default('PLANNING'),
  date: z.string().min(4, "Date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  estimatedGuests: z.number().int().nonnegative().default(50),
  totalBudget: z.number().nonnegative().default(5000),
  themeAesthetic: z.string().optional(),
  colorPalette: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial();

export const CreateBudgetItemSchema = z.object({
  category: z.string().default('OTHER'),
  name: z.string().min(1, "Name is required"),
  estimatedCost: z.number().nonnegative("Estimated cost cannot be negative"),
  actualCost: z.number().nonnegative("Actual cost cannot be negative").default(0),
  paymentStatus: PaymentStatusEnum.default('UNPAID'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  vendorId: z.string().optional(),
  isEstimate: z.boolean().optional(),
});

export const UpdateBudgetItemSchema = CreateBudgetItemSchema.partial();

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  assignee: z.string().optional(),
  category: z.string().optional(),
  priority: TaskPriorityEnum.default('MEDIUM'),
  status: TaskStatusEnum.default('TODO'),
  dueDate: z.string().optional(),
  orderIndex: z.number().int().default(0),
  isMilestone: z.boolean().default(false),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const CreateRunOfShowSchema = z.object({
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  title: z.string().min(1, "Schedule item title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  picName: z.string().optional(),
  orderIndex: z.number().int().default(0),
});

export const UpdateRunOfShowSchema = CreateRunOfShowSchema.partial();

export const CreateVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  category: VendorCategoryEnum.default('OTHER'),
  status: VendorStatusEnum.default('RESEARCHING'),
  contactPerson: z.string().optional(),
  contactDetails: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  quotedPrice: z.number().nonnegative().optional(),
  quotedAmount: z.number().nonnegative().optional(),
  contractAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  budgetCategory: z.string().optional(),
  budgetItemId: z.string().optional(),
  isDemo: z.boolean().optional(),
});

export const UpdateVendorSchema = CreateVendorSchema.partial();

// ==========================================
// CREATIVE IDEAS & INSPIRATION SCHEMAS
// ==========================================

export const CreativeIdeasRequestSchema = z.object({
  title: z.string().min(2, "Event title must be at least 2 characters").max(150),
  eventType: EventTypeEnum,
  date: z.string().min(4, "Date is required").max(50),
  totalBudget: z.number().nonnegative("Budget must be non-negative").max(100_000_000),
  guestCount: z.number().int().positive("Guest count must be at least 1").max(100_000),
  location: z.string().max(200).optional(),
  theme: z.string().max(300).optional(),
  vibeOrTheme: z.string().max(300).optional(),
  preferences: z.string().max(1000).optional(),
  specialPreferences: z.string().max(1000).optional(),
  dietaryNeeds: z.array(z.string().max(100)).max(30).optional(),
  accessibilityNeeds: z.array(z.string().max(100)).max(30).optional(),
  currency: z.string().max(10).optional(),
});

export type CreativeIdeasRequestInput = z.input<typeof CreativeIdeasRequestSchema>;

export const ThemeIdeaSchema = z.object({
  title: z.string().min(2),
  concept: z.string().min(10),
  decorMotifs: z.array(z.string()).min(2),
  lightingAndAmbiance: z.string().min(5),
  budgetAlternatives: z.object({
    luxe: z.object({
      title: z.string(),
      description: z.string(),
      estCostRange: z.string(),
    }),
    costSmart: z.object({
      title: z.string(),
      description: z.string(),
      estCostRange: z.string(),
    }),
  }),
  inclusivityNote: z.string(),
});

export const PaletteColorSchema = z.object({
  hex: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Valid hex code required"),
  name: z.string(),
  role: z.enum(['primary', 'accent', 'neutral', 'highlight']).default('primary'),
});

export const ColorPaletteIdeaSchema = z.object({
  name: z.string().min(2),
  colors: z.array(PaletteColorSchema).min(3).max(8),
  notes: z.string(),
});

export const InvitationWordingSchema = z.object({
  style: z.enum(['FORMAL', 'WARM_CELEBRATORY', 'CASUAL_MODERN', 'SHORT_DIGITAL']),
  styleLabel: z.string(),
  headline: z.string(),
  bodyText: z.string(),
  rsvpNote: z.string(),
  inclusivityHighlight: z.string(),
});

export const ActivityIdeaSchema = z.object({
  title: z.string().min(2),
  category: z.enum(['INTERACTIVE', 'LOW_KEY', 'ALL_AGES', 'ICEBREAKER', 'MEMORABLE_MOMENT']),
  description: z.string().min(10),
  duration: z.string(),
  budgetTier: z.enum(['LOW_COST_DIY', 'MODERATE', 'PREMIUM_HIRED']),
  budgetAlternative: z.string(),
  inclusivityConsiderations: z.string(),
});

export const BeverageIdeaSchema = z.object({
  name: z.string(),
  type: z.enum(['SIGNATURE_COCKTAIL', 'CRAFT_MOCKTAIL', 'WINE_INFUSION', 'ARTISAN_TEA_COFFEE']),
  description: z.string(),
  isNonAlcoholic: z.boolean(),
});

export const DishIdeaSchema = z.object({
  name: z.string(),
  description: z.string(),
  dietaryFlags: z.array(z.string()),
});

export const MenuIdeasSchema = z.object({
  beverages: z.array(BeverageIdeaSchema).min(2),
  appetizers: z.array(DishIdeaSchema).min(2),
  mains: z.array(DishIdeaSchema).min(2),
  desserts: z.array(DishIdeaSchema).min(1),
  budgetAlternatives: z.object({
    luxeStyle: z.string(),
    costSmartStyle: z.string(),
  }),
  inclusivityNotes: z.string(),
});

export const CreativeIdeasResponseSchema = z.object({
  themes: z.array(ThemeIdeaSchema).min(1),
  palettes: z.array(ColorPaletteIdeaSchema).min(1),
  invitations: z.array(InvitationWordingSchema).min(2),
  activities: z.array(ActivityIdeaSchema).min(2),
  menu: MenuIdeasSchema,
  culturalInclusivityStatement: z.string(),
  _source: z.enum(['LIVE_AI', 'OFFLINE_DEMO']).optional().default('LIVE_AI'),
});

export type CreativeIdeasResponse = z.infer<typeof CreativeIdeasResponseSchema>;

export const ApplyPlanBodySchema = z.object({
  theme: z.object({
    title: z.string().optional(),
    colorPalette: z.array(z.string()).optional(),
  }).optional(),
  themeConcept: z.object({
    title: z.string().optional(),
    colorPalette: z.array(z.string()).optional(),
  }).optional(),
  budgetSuggestions: z.array(z.any()).optional(),
  suggestedBudgetBreakdown: z.array(z.any()).optional(),
  datedTasks: z.array(z.any()).optional(),
  milestoneTasks: z.array(z.any()).optional(),
  agenda: z.array(z.any()).optional(),
  runOfShow: z.array(z.any()).optional(),
  vendorCategories: z.array(z.any()).optional(),
  vendorRecommendations: z.array(z.any()).optional(),
}).passthrough();
