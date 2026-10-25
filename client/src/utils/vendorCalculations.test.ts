import { describe, it, expect } from 'vitest';
import {
  normalizeVendorCategory,
  getVendorQuotedPrice,
  getVendorContractAmount,
  calculateVendorMetrics,
  filterVendors,
} from './vendorCalculations.js';
import { Vendor } from '../types/index.js';

describe('vendorCalculations', () => {
  const sampleVendors: Vendor[] = [
    {
      id: 'v1',
      eventId: 'evt-1',
      name: 'Bella Vista Vineyards',
      category: 'VENUE',
      status: 'BOOKED',
      contactPerson: 'Clara Hughes',
      email: 'clara@bellavista.example.com',
      phone: '707-555-0192',
      quotedPrice: 8500,
      contractAmount: 8500,
      budgetCategory: 'VENUE',
      notes: 'Curfew strictly 23:00',
      isDemo: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'v2',
      eventId: 'evt-1',
      name: 'Heritage Farm Table Catering',
      category: 'CATERING',
      status: 'BOOKED',
      contactPerson: 'Mateo Rossi',
      quotedAmount: 9500,
      contractAmount: 9500,
      budgetCategory: 'CATERING',
      notes: 'Organic seasonal farm sourcing',
      isDemo: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'v3',
      eventId: 'evt-1',
      name: 'Lumiere Moments Photography',
      category: 'PHOTOGRAPHY',
      status: 'QUOTED',
      contactPerson: 'Sophie Bennett',
      email: 'sophie@lumieremoments.example.com',
      quotedPrice: 3500,
      budgetCategory: 'PHOTOGRAPHY',
      notes: '8 hours coverage with drone footage',
      isDemo: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'v4',
      eventId: 'evt-1',
      name: 'Velvet & Vow Styling',
      category: 'DECORATION',
      status: 'CONTACTED',
      quotedPrice: 2800,
      budgetCategory: 'DECORATIONS',
      isDemo: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'v5',
      eventId: 'evt-1',
      name: 'Golden Gate Jazz Trio',
      category: 'ENTERTAINMENT',
      status: 'RESEARCHING',
      quotedPrice: 1800,
      isDemo: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'v6',
      eventId: 'evt-1',
      name: 'Napa Valley Luxury Shuttles',
      category: 'TRANSPORT',
      status: 'DECLINED',
      notes: 'Unavailable on target Saturday',
      isDemo: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  describe('normalizeVendorCategory', () => {
    it('correctly maps core categories', () => {
      expect(normalizeVendorCategory('VENUE')).toBe('VENUE');
      expect(normalizeVendorCategory('CATERING')).toBe('CATERING');
      expect(normalizeVendorCategory('PHOTOGRAPHY')).toBe('PHOTOGRAPHY');
      expect(normalizeVendorCategory('DECORATION')).toBe('DECORATION');
      expect(normalizeVendorCategory('ENTERTAINMENT')).toBe('ENTERTAINMENT');
      expect(normalizeVendorCategory('TRANSPORT')).toBe('TRANSPORT');
      expect(normalizeVendorCategory('OTHER')).toBe('OTHER');
    });

    it('maps sub-categories and aliases to parent categories', () => {
      expect(normalizeVendorCategory('DECORATIONS')).toBe('DECORATION');
      expect(normalizeVendorCategory('FLORIST')).toBe('DECORATION');
      expect(normalizeVendorCategory('DECOR_STYLING')).toBe('DECORATION');
      expect(normalizeVendorCategory('RENTALS')).toBe('DECORATION');
      expect(normalizeVendorCategory('BAKER_CAKE')).toBe('CATERING');
      expect(normalizeVendorCategory('VIDEOGRAPHY')).toBe('PHOTOGRAPHY');
      expect(normalizeVendorCategory('MUSIC_DJ')).toBe('ENTERTAINMENT');
    });

    it('falls back to OTHER for unknown or undefined categories', () => {
      expect(normalizeVendorCategory(undefined)).toBe('OTHER');
      expect(normalizeVendorCategory('')).toBe('OTHER');
      expect(normalizeVendorCategory('RANDOM_SERVICE')).toBe('OTHER');
    });
  });

  describe('getVendorQuotedPrice and getVendorContractAmount', () => {
    it('prefers quotedPrice over quotedAmount if both exist', () => {
      expect(getVendorQuotedPrice({ quotedPrice: 2000, quotedAmount: 1800 })).toBe(2000);
    });

    it('uses quotedAmount when quotedPrice is undefined', () => {
      expect(getVendorQuotedPrice({ quotedAmount: 3200 })).toBe(3200);
    });

    it('returns 0 when neither price is defined or valid', () => {
      expect(getVendorQuotedPrice({})).toBe(0);
      expect(getVendorQuotedPrice({ quotedPrice: NaN })).toBe(0);
    });

    it('extracts contract amount properly', () => {
      expect(getVendorContractAmount({ contractAmount: 5000 })).toBe(5000);
      expect(getVendorContractAmount({})).toBe(0);
      expect(getVendorContractAmount({ contractAmount: undefined })).toBe(0);
    });
  });

  describe('calculateVendorMetrics', () => {
    it('returns zeroes for empty vendor list', () => {
      const metrics = calculateVendorMetrics([]);
      expect(metrics.totalCount).toBe(0);
      expect(metrics.bookedCount).toBe(0);
      expect(metrics.quotedCount).toBe(0);
      expect(metrics.totalQuotedValue).toBe(0);
      expect(metrics.totalContractedValue).toBe(0);
    });

    it('computes accurate counts and values across statuses', () => {
      const metrics = calculateVendorMetrics(sampleVendors);
      expect(metrics.totalCount).toBe(6);
      expect(metrics.bookedCount).toBe(2);
      expect(metrics.quotedCount).toBe(1);
      expect(metrics.contactedCount).toBe(1);
      expect(metrics.researchingCount).toBe(1);
      expect(metrics.declinedCount).toBe(1);
      expect(metrics.demoCount).toBe(4);

      // Quoted sum: 8500 + 9500 + 3500 + 2800 + 1800 + 0 = 26100
      expect(metrics.totalQuotedValue).toBe(26100);

      // Contracted sum: 8500 + 9500 = 18000
      expect(metrics.totalContractedValue).toBe(18000);

      // Category breakdown
      expect(metrics.categoryBreakdown.VENUE).toBe(1);
      expect(metrics.categoryBreakdown.CATERING).toBe(1);
      expect(metrics.categoryBreakdown.PHOTOGRAPHY).toBe(1);
      expect(metrics.categoryBreakdown.DECORATION).toBe(1);
      expect(metrics.categoryBreakdown.ENTERTAINMENT).toBe(1);
      expect(metrics.categoryBreakdown.TRANSPORT).toBe(1);
    });
  });

  describe('filterVendors', () => {
    it('filters by category accurately (including aliases)', () => {
      const catering = filterVendors(sampleVendors, { category: 'CATERING' });
      expect(catering.length).toBe(1);
      expect(catering[0].name).toContain('Heritage Farm');

      const decoration = filterVendors(sampleVendors, { category: 'DECORATION' });
      expect(decoration.length).toBe(1);
      expect(decoration[0].name).toContain('Velvet & Vow');
    });

    it('filters by status accurately', () => {
      const booked = filterVendors(sampleVendors, { status: 'BOOKED' });
      expect(booked.length).toBe(2);

      const declined = filterVendors(sampleVendors, { status: 'DECLINED' });
      expect(declined.length).toBe(1);
      expect(declined[0].name).toContain('Napa Valley Luxury Shuttles');
    });

    it('filters by origin (demo vs custom)', () => {
      const demoOnly = filterVendors(sampleVendors, { origin: 'DEMO' });
      expect(demoOnly.length).toBe(4);
      expect(demoOnly.every((v) => v.isDemo)).toBe(true);

      const customOnly = filterVendors(sampleVendors, { origin: 'CUSTOM' });
      expect(customOnly.length).toBe(2);
      expect(customOnly.every((v) => !v.isDemo)).toBe(true);
    });

    it('searches by name, contact, notes, and category', () => {
      const searchByName = filterVendors(sampleVendors, { search: 'lumiere' });
      expect(searchByName.length).toBe(1);
      expect(searchByName[0].name).toBe('Lumiere Moments Photography');

      const searchByContact = filterVendors(sampleVendors, { search: 'Clara' });
      expect(searchByContact.length).toBe(1);
      expect(searchByContact[0].contactPerson).toBe('Clara Hughes');

      const searchByNotes = filterVendors(sampleVendors, { search: 'curfew' });
      expect(searchByNotes.length).toBe(1);
      expect(searchByNotes[0].name).toBe('Bella Vista Vineyards');

      const searchByBudgetCategory = filterVendors(sampleVendors, { search: 'decorations' });
      expect(searchByBudgetCategory.length).toBe(1);
    });

    it('combines search and multiple filters simultaneously', () => {
      const combined = filterVendors(sampleVendors, {
        search: 'drone',
        category: 'PHOTOGRAPHY',
        status: 'QUOTED',
        origin: 'DEMO',
      });
      expect(combined.length).toBe(1);
      expect(combined[0].name).toBe('Lumiere Moments Photography');

      const noMatch = filterVendors(sampleVendors, {
        search: 'drone',
        category: 'VENUE',
      });
      expect(noMatch.length).toBe(0);
    });
  });
});
