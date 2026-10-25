export type EventType = 'WEDDING' | 'BIRTHDAY' | 'ANNIVERSARY' | 'COMMUNITY' | 'OTHER';
export type EventStatus = 'PLANNING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
export type PaymentStatus = 'UNPAID' | 'DEPOSIT_PAID' | 'PAID_IN_FULL';
export type VendorStatus = 'RESEARCHING' | 'CONTACTED' | 'QUOTED' | 'BOOKED' | 'COMPLETED' | 'DECLINED';

export type BudgetCategory =
  | 'VENUE'
  | 'CATERING'
  | 'DECORATIONS'
  | 'PHOTOGRAPHY'
  | 'ENTERTAINMENT'
  | 'INVITATIONS'
  | 'TRANSPORT'
  | 'CONTINGENCY'
  | 'OTHER';

export type VendorCategory =
  | 'VENUE'
  | 'CATERING'
  | 'PHOTOGRAPHY'
  | 'DECORATION'
  | 'DECORATIONS'
  | 'ENTERTAINMENT'
  | 'TRANSPORT'
  | 'VIDEOGRAPHY'
  | 'MUSIC_DJ'
  | 'FLORIST'
  | 'DECOR_STYLING'
  | 'BAKER_CAKE'
  | 'HAIR_MAKEUP'
  | 'INVITATIONS'
  | 'CONTINGENCY'
  | 'RENTALS'
  | 'PERMITS'
  | 'OTHER';

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
  startTime: string;
  endTime?: string;
  title: string;
  description?: string;
  location?: string;
  picName?: string;
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
  date: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
  locationAddress?: string;
  estimatedGuests: number;
  totalBudget: number;
  currency?: string; // e.g. USD, EUR, GBP, CAD, AUD, INR
  themeAesthetic?: string;
  colorPalette?: string[];
  dietaryNeeds?: string[];
  accessibilityNeeds?: string[];
  specialPreferences?: string;
  isDemo?: boolean; // Clearly marks sample event as demo data
  notes?: string;
  savedCreativeIdeas?: CreativeIdeasResponse;
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

export interface GeneratedAiPlan {
  // Structured fields
  eventConcept?: string;
  theme?: {
    title: string;
    description: string;
    colorPalette: string[];
  };
  agenda?: Array<{
    startTime: string;
    endTime: string;
    title: string;
    description: string;
    location: string;
    picName: string;
  }>;
  budgetSuggestions?: Array<{
    category: VendorCategory | string;
    name: string;
    estimatedCost: number;
    notes: string;
  }>;
  datedTasks?: Array<{
    title: string;
    category: string;
    priority: TaskPriority;
    timelineOffsetDays: number;
    dueDate?: string;
    description: string;
    isMilestone: boolean;
  }>;
  vendorCategories?: Array<{
    category: VendorCategory | string;
    name: string;
    estimatedBudget: number;
    questionsToAsk: string[];
  }>;
  decorationIdeas?: string[];
  menuOrActivityIdeas?: string[];
  assumptions?: string[];
  warnings?: string[];

  // Compatibility aliases
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
    dueDate?: string;
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
// CREATIVE INSPIRATION & STUDIO TYPES
// ==========================================

export interface ThemeIdea {
  title: string;
  concept: string;
  decorMotifs: string[];
  lightingAndAmbiance: string;
  budgetAlternatives: {
    luxe: {
      title: string;
      description: string;
      estCostRange: string;
    };
    costSmart: {
      title: string;
      description: string;
      estCostRange: string;
    };
  };
  inclusivityNote: string;
}

export interface PaletteColor {
  hex: string;
  name: string;
  role: 'primary' | 'accent' | 'neutral' | 'highlight';
}

export interface ColorPaletteIdea {
  name: string;
  colors: PaletteColor[];
  notes: string;
}

export type InvitationStyle = 'FORMAL' | 'WARM_CELEBRATORY' | 'CASUAL_MODERN' | 'SHORT_DIGITAL';

export interface InvitationWording {
  style: InvitationStyle;
  styleLabel: string;
  headline: string;
  bodyText: string;
  rsvpNote: string;
  inclusivityHighlight: string;
}

export type ActivityCategory = 'INTERACTIVE' | 'LOW_KEY' | 'ALL_AGES' | 'ICEBREAKER' | 'MEMORABLE_MOMENT';

export interface ActivityIdea {
  title: string;
  category: ActivityCategory;
  description: string;
  duration: string;
  budgetTier: 'LOW_COST_DIY' | 'MODERATE' | 'PREMIUM_HIRED';
  budgetAlternative: string;
  inclusivityConsiderations: string;
}

export interface BeverageIdea {
  name: string;
  type: 'SIGNATURE_COCKTAIL' | 'CRAFT_MOCKTAIL' | 'WINE_INFUSION' | 'ARTISAN_TEA_COFFEE';
  description: string;
  isNonAlcoholic: boolean;
}

export interface DishIdea {
  name: string;
  description: string;
  dietaryFlags: string[];
}

export interface MenuIdeas {
  beverages: BeverageIdea[];
  appetizers: DishIdea[];
  mains: DishIdea[];
  desserts: DishIdea[];
  budgetAlternatives: {
    luxeStyle: string;
    costSmartStyle: string;
  };
  inclusivityNotes: string;
}

export interface CreativeIdeasResponse {
  themes: ThemeIdea[];
  palettes: ColorPaletteIdea[];
  invitations: InvitationWording[];
  activities: ActivityIdea[];
  menu: MenuIdeas;
  culturalInclusivityStatement: string;
  _source?: 'LIVE_AI' | 'OFFLINE_DEMO';
  _cachedAt?: string;
  _inputSignature?: string;
}

