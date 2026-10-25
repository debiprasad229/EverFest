import { 
  Event, 
  EventWithDetails, 
  BudgetItem, 
  Task, 
  RunOfShowItem, 
  Vendor, 
  GeneratedAiPlan,
  CreativeIdeasResponse
} from '../types/index.js';
import { storageDal } from './storageDal.js';

/**
 * Resolves the backend API base URL.
 * Handles bare domains (e.g. https://api.everfest.com -> https://api.everfest.com/api)
 * as well as existing paths (/api, /api/v1) and local dev fallback (/api).
 */
export function resolveApiBase(customUrl?: string): string {
  const envUrl = (customUrl !== undefined ? customUrl : import.meta.env.VITE_API_URL)?.trim();
  if (!envUrl) {
    return '/api';
  }
  const clean = envUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api') || clean.endsWith('/api/v1')) {
    return clean;
  }
  return `${clean}/api`;
}

const API_BASE = resolveApiBase();

// In-flight deduplication tracker to prevent duplicate concurrent network requests
const inFlightPlanPromises = new Map<string, Promise<GeneratedAiPlan>>();

async function fetchServerAiPlan(payload: any): Promise<GeneratedAiPlan> {
  const signature = computeInputSignature(payload);
  const existingInFlight = inFlightPlanPromises.get(signature);
  if (existingInFlight) {
    return existingInFlight;
  }

  const promise = (async () => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/ai/event-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      throw new Error(
        `Backend server is unreachable on ${API_BASE}. Ensure the backend server is running or switch to Demo Mode.`
      );
    }

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error(
          json.message || 'Gemini API free-tier quota has been reached. Please retry shortly or switch to Demo Mode.'
        );
      }
      if (res.status === 504) {
        throw new Error(
          json.message || 'The AI planning request timed out after 25 seconds. Please retry or switch to Demo Mode.'
        );
      }
      const errorMsg = json.message || json.error || `Server responded with HTTP ${res.status}`;
      throw new Error(errorMsg);
    }

    if (json.success && json.data) {
      return json.data;
    }

    throw new Error('Malformed or incomplete response received from AI service.');
  })().finally(() => {
    inFlightPlanPromises.delete(signature);
  });

  inFlightPlanPromises.set(signature, promise);
  return promise;
}

export function computeInputSignature(payload: any): string {
  const parts = [
    payload.title || '',
    payload.eventType || '',
    payload.date || '',
    payload.totalBudget || '',
    payload.guestCount || '',
    payload.location || '',
    payload.theme || payload.vibeOrTheme || '',
    payload.preferences || payload.specialPreferences || '',
    (payload.dietaryNeeds || []).slice().sort().join(','),
    (payload.accessibilityNeeds || []).slice().sort().join(','),
  ];
  return parts.join('||');
}

async function fetchCreativeIdeas(
  payload: any, 
  forceRefresh = false, 
  eventId?: string
): Promise<CreativeIdeasResponse> {
  const signature = computeInputSignature(payload);
  const cacheKey = eventId ? `EVERFEST_CREATIVE_CACHE_${eventId}` : null;

  // Check LocalStorage cache if not forcing refresh
  if (!forceRefresh && cacheKey && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && cached._inputSignature === signature) {
          return cached;
        }
      }
    } catch (e) {
      // Ignore cache read failure
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/ai/creative-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    throw new Error(
      `Backend server is unreachable on ${API_BASE}. Ensure the backend server is running or switch to Demo Mode.`
    );
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        json.message || 'Gemini API free-tier quota has been reached. Please retry shortly or switch to Demo Mode.'
      );
    }
    if (res.status === 504) {
      throw new Error(
        json.message || 'The AI creative inspiration request timed out after 25 seconds. Please retry or switch to Demo Mode.'
      );
    }
    const errorMsg = json.message || json.error || `Server responded with HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  if (json.success && json.data) {
    const dataWithMeta: CreativeIdeasResponse = {
      ...json.data,
      _inputSignature: signature,
      _cachedAt: new Date().toISOString(),
    };

    if (cacheKey && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(dataWithMeta));
      } catch (e) {
        // Ignore quota
      }
    }

    return dataWithMeta;
  }

  throw new Error('Malformed or incomplete response received from Creative Ideas service.');
}

export { fetchServerAiPlan, fetchCreativeIdeas };

export const api = {
  // Events via LocalStorage DAL
  getEvents: () => storageDal.getEvents(),
  getEventById: (id: string) => storageDal.getEventById(id),
  createEvent: (data: Partial<Event>) => storageDal.createEvent(data as any),
  updateEvent: (id: string, data: Partial<Event>) => storageDal.updateEvent(id, data),
  deleteEvent: (id: string) => storageDal.deleteEvent(id),
  resetToDemo: () => storageDal.resetToDemo(),

  // Deadlines
  getAllUpcomingDeadlines: () => storageDal.getAllUpcomingDeadlines(),

  // Budget
  getBudget: (eventId: string) => storageDal.getBudgetItems(eventId),
  addBudgetItem: (eventId: string, item: Partial<BudgetItem>) => storageDal.addBudgetItem(eventId, item as any),
  updateBudgetItem: (id: string, item: Partial<BudgetItem>) => storageDal.updateBudgetItem(id, item),
  deleteBudgetItem: (id: string) => storageDal.deleteBudgetItem(id),
  deleteBudgetCategory: (eventId: string, category: string) => storageDal.deleteBudgetCategory(eventId, category),
  updateBudgetCategory: (eventId: string, oldCat: string, newCat: string) => storageDal.updateBudgetCategory(eventId, oldCat, newCat),

  // Tasks
  getTasks: (eventId: string) => storageDal.getTasks(eventId),
  addTask: (eventId: string, task: Partial<Task>) => storageDal.addTask(eventId, task as any),
  updateTask: (id: string, task: Partial<Task>) => storageDal.updateTask(id, task),
  deleteTask: (id: string) => storageDal.deleteTask(id),
  generateStarterTasks: (eventId: string) => storageDal.generateStarterTasks(eventId),

  // Run of Show
  getRunOfShow: (eventId: string) => storageDal.getRunOfShow(eventId),
  addRunOfShowItem: (eventId: string, item: Partial<RunOfShowItem>) => storageDal.addRunOfShowItem(eventId, item as any),
  updateRunOfShowItem: (id: string, item: Partial<RunOfShowItem>) => storageDal.updateRunOfShowItem(id, item),
  deleteRunOfShowItem: (id: string) => storageDal.deleteRunOfShowItem(id),

  // Vendors
  getVendors: (eventId: string) => storageDal.getVendors(eventId),
  addVendor: (eventId: string, vendor: Partial<Vendor>) => storageDal.addVendor(eventId, vendor as any),
  updateVendor: (id: string, vendor: Partial<Vendor>) => storageDal.updateVendor(id, vendor),
  deleteVendor: (id: string) => storageDal.deleteVendor(id),

  // AI Planner
  generateAiPlan: (payload: any) => fetchServerAiPlan(payload),
  applyAiPlan: (eventId: string, plan: GeneratedAiPlan, options?: any) => storageDal.applyAiPlan(eventId, plan, options),

  // Creative Inspiration Studio
  fetchCreativeIdeas: (payload: any, forceRefresh?: boolean, eventId?: string) => 
    fetchCreativeIdeas(payload, forceRefresh, eventId),
  saveCreativeIdeas: (eventId: string, ideas: any) => storageDal.saveCreativeIdeas(eventId, ideas),
  getCreativeIdeas: (eventId: string) => storageDal.getCreativeIdeas(eventId),
  applyCreativeTheme: (eventId: string, theme: { title: string; colorPalette?: string[] }) =>
    storageDal.applyCreativeTheme(eventId, theme),
  applyCreativePalette: (eventId: string, hexCodes: string[]) => 
    storageDal.applyCreativePalette(eventId, hexCodes),
  saveInvitationWording: (eventId: string, styleLabel: string, wording: string) => 
    storageDal.saveInvitationWording(eventId, styleLabel, wording),
  addCreativeActivityAsTask: (eventId: string, activity: { title: string; description: string; duration?: string }) => 
    storageDal.addCreativeActivityAsTask(eventId, activity),
};

