import { describe, it, expect, beforeEach } from 'vitest';
import { eventsService } from './events.service.js';
import { storage } from '../data/storage.js';

describe('EventsService', () => {
  beforeEach(() => {
    storage.resetToSeed();
  });

  it('should return seeded celebration events', () => {
    const events = eventsService.getAll();
    expect(events.length).toBeGreaterThanOrEqual(4);
    const types = events.map(e => e.eventType);
    expect(types).toContain('WEDDING');
    expect(types).toContain('BIRTHDAY');
    expect(types).toContain('ANNIVERSARY');
    expect(types).toContain('COMMUNITY');
  });

  it('should get event by id with calculated metrics', () => {
    const wedding = eventsService.getById('evt-wedding-01');
    expect(wedding).toBeDefined();
    expect(wedding.title).toContain('Aurelia & Julian');
    expect(wedding.metrics).toBeDefined();
    expect(wedding.metrics.totalEstimatedBudget).toBeGreaterThan(0);
    expect(wedding.metrics.totalActualCost).toBeGreaterThan(0);
    expect(wedding.budgetItems.length).toBeGreaterThan(0);
    expect(wedding.tasks.length).toBeGreaterThan(0);
    expect(wedding.runOfShowItems.length).toBeGreaterThan(0);
    expect(wedding.vendors.length).toBeGreaterThan(0);
  });

  it('should create a new event successfully', () => {
    const newEvent = eventsService.create({
      title: 'Graduation Summer Fest',
      eventType: 'OTHER',
      status: 'PLANNING',
      date: '2026-07-25',
      totalBudget: 6000,
      estimatedGuests: 75,
      themeAesthetic: 'Golden Hour Garden Picnic',
      colorPalette: ['#F59E0B', '#10B981', '#FFFFFF'],
    });

    expect(newEvent.id).toBeDefined();
    expect(newEvent.title).toBe('Graduation Summer Fest');

    const fetched = eventsService.getById(newEvent.id);
    expect(fetched.title).toBe('Graduation Summer Fest');
  });

  it('should generate full export payload for printing and sharing', () => {
    const exportData = eventsService.getExportData('evt-wedding-01');
    expect(exportData.exportedAt).toBeDefined();
    expect(exportData.event.id).toBe('evt-wedding-01');
    expect(exportData.summary.taskCompletionRate).toBeDefined();
  });
});
