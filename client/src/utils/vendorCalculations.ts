import { Vendor, VendorCategory, VendorStatus } from '../types/index.js';

export const CORE_VENDOR_CATEGORIES = [
  { value: 'VENUE', label: 'Venue' },
  { value: 'CATERING', label: 'Catering' },
  { value: 'PHOTOGRAPHY', label: 'Photography' },
  { value: 'DECORATION', label: 'Decoration' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const VENDOR_STATUS_OPTIONS = [
  { value: 'RESEARCHING', label: 'Researching', description: 'Exploring and discovering potential partners' },
  { value: 'CONTACTED', label: 'Contacted', description: 'Inquiry sent; awaiting response or introductory call' },
  { value: 'QUOTED', label: 'Quoted', description: 'Estimate or formal pricing received' },
  { value: 'BOOKED', label: 'Booked', description: 'Contract signed or deposit locked in' },
  { value: 'DECLINED', label: 'Declined', description: 'Passed on or unavailable for celebration date' },
] as const;

export interface VendorMetrics {
  totalCount: number;
  bookedCount: number;
  quotedCount: number;
  contactedCount: number;
  researchingCount: number;
  declinedCount: number;
  totalQuotedValue: number;
  totalContractedValue: number;
  demoCount: number;
  categoryBreakdown: Record<string, number>;
}

export interface VendorFilterOptions {
  search?: string;
  category?: string;
  status?: string;
  origin?: 'ALL' | 'DEMO' | 'CUSTOM';
}

/**
 * Normalizes vendor categories to core categories:
 * VENUE, CATERING, PHOTOGRAPHY, DECORATION, ENTERTAINMENT, TRANSPORT, OTHER
 */
export function normalizeVendorCategory(category: string | undefined): string {
  if (!category) return 'OTHER';
  const upper = category.toUpperCase().trim();
  
  if (upper === 'VENUE') return 'VENUE';
  if (upper === 'CATERING' || upper === 'BAKER_CAKE') return 'CATERING';
  if (upper === 'PHOTOGRAPHY' || upper === 'VIDEOGRAPHY') return 'PHOTOGRAPHY';
  if (
    upper === 'DECORATION' || 
    upper === 'DECORATIONS' || 
    upper === 'FLORIST' || 
    upper === 'DECOR_STYLING' || 
    upper === 'RENTALS'
  ) {
    return 'DECORATION';
  }
  if (upper === 'ENTERTAINMENT' || upper === 'MUSIC_DJ') return 'ENTERTAINMENT';
  if (upper === 'TRANSPORT') return 'TRANSPORT';
  
  return 'OTHER';
}

/**
 * Safely extracts quoted price from vendor (supports quotedPrice or quotedAmount)
 */
export function getVendorQuotedPrice(vendor: Partial<Vendor>): number {
  if (typeof vendor.quotedPrice === 'number' && !isNaN(vendor.quotedPrice)) {
    return vendor.quotedPrice;
  }
  if (typeof vendor.quotedAmount === 'number' && !isNaN(vendor.quotedAmount)) {
    return vendor.quotedAmount;
  }
  return 0;
}

/**
 * Safely extracts contract amount from vendor
 */
export function getVendorContractAmount(vendor: Partial<Vendor>): number {
  if (typeof vendor.contractAmount === 'number' && !isNaN(vendor.contractAmount)) {
    return vendor.contractAmount;
  }
  return 0;
}

/**
 * Calculates aggregate vendor metrics and category breakdowns
 */
export function calculateVendorMetrics(vendors: Vendor[]): VendorMetrics {
  if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
    return {
      totalCount: 0,
      bookedCount: 0,
      quotedCount: 0,
      contactedCount: 0,
      researchingCount: 0,
      declinedCount: 0,
      totalQuotedValue: 0,
      totalContractedValue: 0,
      demoCount: 0,
      categoryBreakdown: {
        VENUE: 0,
        CATERING: 0,
        PHOTOGRAPHY: 0,
        DECORATION: 0,
        ENTERTAINMENT: 0,
        TRANSPORT: 0,
        OTHER: 0,
      },
    };
  }

  let bookedCount = 0;
  let quotedCount = 0;
  let contactedCount = 0;
  let researchingCount = 0;
  let declinedCount = 0;
  let totalQuotedValue = 0;
  let totalContractedValue = 0;
  let demoCount = 0;

  const categoryBreakdown: Record<string, number> = {
    VENUE: 0,
    CATERING: 0,
    PHOTOGRAPHY: 0,
    DECORATION: 0,
    ENTERTAINMENT: 0,
    TRANSPORT: 0,
    OTHER: 0,
  };

  for (const v of vendors) {
    const status = (v.status || '').toUpperCase();
    if (status === 'BOOKED' || status === 'COMPLETED') {
      bookedCount++;
    } else if (status === 'QUOTED') {
      quotedCount++;
    } else if (status === 'CONTACTED') {
      contactedCount++;
    } else if (status === 'DECLINED') {
      declinedCount++;
    } else {
      researchingCount++;
    }

    if (v.isDemo) {
      demoCount++;
    }

    const quoted = getVendorQuotedPrice(v);
    totalQuotedValue += quoted;

    const contracted = getVendorContractAmount(v);
    totalContractedValue += contracted;

    const normCat = normalizeVendorCategory(v.category);
    categoryBreakdown[normCat] = (categoryBreakdown[normCat] || 0) + 1;
  }

  return {
    totalCount: vendors.length,
    bookedCount,
    quotedCount,
    contactedCount,
    researchingCount,
    declinedCount,
    totalQuotedValue: Math.round(totalQuotedValue * 100) / 100,
    totalContractedValue: Math.round(totalContractedValue * 100) / 100,
    demoCount,
    categoryBreakdown,
  };
}

/**
 * Filters vendors by keyword search, category, status, and origin
 */
export function filterVendors(
  vendors: Vendor[],
  filters: VendorFilterOptions = {}
): Vendor[] {
  if (!vendors || !Array.isArray(vendors)) return [];

  const { search, category, status, origin } = filters;
  const cleanSearch = (search || '').toLowerCase().trim();
  const cleanCategory = category ? category.toUpperCase().trim() : 'ALL';
  const cleanStatus = status ? status.toUpperCase().trim() : 'ALL';
  const cleanOrigin = origin || 'ALL';

  return vendors.filter((vendor) => {
    // 1. Origin filter
    if (cleanOrigin === 'DEMO' && !vendor.isDemo) return false;
    if (cleanOrigin === 'CUSTOM' && vendor.isDemo) return false;

    // 2. Status filter
    if (cleanStatus !== 'ALL') {
      const vStatus = (vendor.status || '').toUpperCase();
      if (cleanStatus === 'BOOKED' && vStatus !== 'BOOKED' && vStatus !== 'COMPLETED') {
        return false;
      } else if (cleanStatus !== 'BOOKED' && vStatus !== cleanStatus) {
        return false;
      }
    }

    // 3. Category filter (normalized match)
    if (cleanCategory !== 'ALL') {
      const normalizedVendorCat = normalizeVendorCategory(vendor.category);
      const targetNormalized = normalizeVendorCategory(cleanCategory);
      if (normalizedVendorCat !== targetNormalized) {
        return false;
      }
    }

    // 4. Keyword Search
    if (cleanSearch) {
      const nameMatch = vendor.name.toLowerCase().includes(cleanSearch);
      const contactMatch = (vendor.contactPerson || '').toLowerCase().includes(cleanSearch);
      const contactDetailsMatch = (vendor.contactDetails || '').toLowerCase().includes(cleanSearch);
      const emailMatch = (vendor.email || '').toLowerCase().includes(cleanSearch);
      const phoneMatch = (vendor.phone || '').toLowerCase().includes(cleanSearch);
      const notesMatch = (vendor.notes || '').toLowerCase().includes(cleanSearch);
      const categoryMatch = vendor.category.toLowerCase().includes(cleanSearch);
      const statusMatch = vendor.status.toLowerCase().includes(cleanSearch);
      const budgetCategoryMatch = (vendor.budgetCategory || '').toLowerCase().includes(cleanSearch);

      const matchesAny =
        nameMatch ||
        contactMatch ||
        contactDetailsMatch ||
        emailMatch ||
        phoneMatch ||
        notesMatch ||
        categoryMatch ||
        statusMatch ||
        budgetCategoryMatch;

      if (!matchesAny) return false;
    }

    return true;
  });
}
