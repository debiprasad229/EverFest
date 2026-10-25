import { describe, it, expect, beforeEach } from 'vitest';
import { StorageDal } from './storageDal.js';

describe('StorageDal (LocalStorage Data Access Layer)', () => {
  let dal: StorageDal;

  beforeEach(() => {
    dal = new StorageDal();
    dal.getStorage().clear();
    // Re-instantiate so it starts with a clean baseline demo
    dal = new StorageDal();
  });

  it('initializes with a sample celebration clearly labeled demo data', async () => {
    const events = await dal.getEvents();
    expect(events.length).toBeGreaterThan(0);
    const demoEvent = events.find(e => e.isDemo);
    expect(demoEvent).toBeDefined();
    expect(demoEvent?.title).toContain('[Demo]');
    expect(demoEvent?.dietaryNeeds).toBeDefined();
    expect(demoEvent?.accessibilityNeeds).toBeDefined();
  });

  it('creates, views, edits, and deletes an event cleanly', async () => {
    // 1. Create
    const created = await dal.createEvent({
      title: 'Liam & Maya Golden Anniversary',
      eventType: 'ANNIVERSARY',
      status: 'PLANNING',
      date: '2026-12-20',
      totalBudget: 15000,
      currency: 'EUR',
      estimatedGuests: 80,
      dietaryNeeds: ['Vegetarian', 'Gluten-Free'],
      accessibilityNeeds: ['Wheelchair Accessible Restrooms'],
      specialPreferences: 'Live harp performance during toast',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Liam & Maya Golden Anniversary');
    expect(created.currency).toBe('EUR');

    // 2. View
    const fetched = await dal.getEventById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.dietaryNeeds).toContain('Vegetarian');
    expect(fetched?.accessibilityNeeds).toContain('Wheelchair Accessible Restrooms');

    // 3. Edit
    const updated = await dal.updateEvent(created.id, {
      title: 'Liam & Maya 50th Golden Anniversary (Updated)',
      totalBudget: 18000,
    });
    expect(updated.title).toBe('Liam & Maya 50th Golden Anniversary (Updated)');
    expect(updated.totalBudget).toBe(18000);

    // 4. Delete
    const deleted = await dal.deleteEvent(created.id);
    expect(deleted).toBe(true);

    const checkGone = await dal.getEventById(created.id);
    expect(checkGone).toBeNull();
  });

  it('safely handles corrupted or malformed stored data without throwing', async () => {
    // Inject corrupt JSON string into storage
    dal.getStorage().setItem('EVERFEST_STORE_V1', '{ "corrupted": true, bad_json');

    // Instantiating DAL should safely catch syntax error and recover with demo baseline
    const safeDal = new StorageDal();
    const events = await safeDal.getEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].title).toBeDefined();
  });

  it('safely handles invalid data schema in localStorage', async () => {
    // Inject valid JSON with invalid schema (events is not an array)
    dal.getStorage().setItem('EVERFEST_STORE_V1', JSON.stringify({ version: 1, events: "not-an-array" }));

    const safeDal = new StorageDal();
    const events = await safeDal.getEvents();
    expect(events.length).toBeGreaterThan(0);
  });

  it('retrieves upcoming deadlines across all events sorted chronologically', async () => {
    const deadlines = await dal.getAllUpcomingDeadlines();
    expect(deadlines.length).toBeGreaterThan(0);
    expect(deadlines[0].dueDate).toBeDefined();
    expect(deadlines[0].eventTitle).toBeDefined();
  });

  // ==========================================
  // EMPTY STATE & PERSISTENCE PRESERVATION
  // ==========================================
  it('PRESERVES INTENTIONAL EMPTY STATE: deleting all events does NOT restore demo data on reload', async () => {
    const events = await dal.getEvents();
    for (const evt of events) {
      await dal.deleteEvent(evt.id);
    }

    // Verify events list is now empty
    const currentEvents = await dal.getEvents();
    expect(currentEvents.length).toBe(0);

    // Re-instantiate DAL (simulating page reload)
    const reloadedDal = new StorageDal();
    const reloadedEvents = await reloadedDal.getEvents();

    // MUST remain empty, respecting user's explicit deletion
    expect(reloadedEvents.length).toBe(0);
  });

  it('explicit resetToDemo restores full baseline celebration dataset', async () => {
    // Empty the store
    const events = await dal.getEvents();
    for (const evt of events) {
      await dal.deleteEvent(evt.id);
    }
    expect((await dal.getEvents()).length).toBe(0);

    // Call resetToDemo
    dal.resetToDemo();

    // Should now have demo data again
    const restored = await dal.getEvents();
    expect(restored.length).toBeGreaterThan(0);
    expect(restored.some(e => e.isDemo)).toBe(true);
  });

  // ==========================================
  // TASK CRUD OPERATIONS
  // ==========================================
  describe('Task Operations', () => {
    it('creates, toggles status, updates, and deletes tasks cleanly', async () => {
      const events = await dal.getEvents();
      const eventId = events[0].id;

      // 1. Add Task
      const newTask = await dal.addTask(eventId, {
        title: 'Order Custom Cake Topper',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: '2026-11-10',
        category: 'Catering',
        isMilestone: false,
        orderIndex: 99,
      });

      expect(newTask.id).toBeDefined();
      expect(newTask.title).toBe('Order Custom Cake Topper');
      expect(newTask.status).toBe('TODO');

      // 2. Update status to COMPLETED
      const completedTask = await dal.updateTask(newTask.id, {
        status: 'COMPLETED',
      });
      expect(completedTask?.status).toBe('COMPLETED');

      // 3. Delete Task
      const deleted = await dal.deleteTask(newTask.id);
      expect(deleted).toBe(true);

      // Verify task no longer in event details
      const eventDetails = await dal.getEventById(eventId);
      expect(eventDetails?.tasks.some(t => t.id === newTask.id)).toBe(false);
    });
  });

  // ==========================================
  // BUDGET ITEM CRUD OPERATIONS
  // ==========================================
  describe('Budget Item Operations', () => {
    it('creates, updates costs, and deletes budget line items', async () => {
      const events = await dal.getEvents();
      const eventId = events[0].id;

      // 1. Add budget item
      const item = await dal.addBudgetItem(eventId, {
        name: 'Acoustic Guitarist',
        category: 'ENTERTAINMENT',
        estimatedCost: 750,
        actualCost: 700,
        paymentStatus: 'DEPOSIT_PAID',
      });

      expect(item.id).toBeDefined();
      expect(item.name).toBe('Acoustic Guitarist');
      expect(item.estimatedCost).toBe(750);

      // 2. Update item
      const updatedItem = await dal.updateBudgetItem(item.id, {
        actualCost: 750,
        paymentStatus: 'PAID_IN_FULL',
      });
      expect(updatedItem?.actualCost).toBe(750);
      expect(updatedItem?.paymentStatus).toBe('PAID_IN_FULL');

      // 3. Delete item
      const deleted = await dal.deleteBudgetItem(item.id);
      expect(deleted).toBe(true);

      const eventDetails = await dal.getEventById(eventId);
      expect(eventDetails?.budgetItems.some(b => b.id === item.id)).toBe(false);
    });
  });

  // ==========================================
  // VENDOR CRUD OPERATIONS
  // ==========================================
  describe('Vendor Operations', () => {
    it('creates, updates status, and deletes vendors', async () => {
      const events = await dal.getEvents();
      const eventId = events[0].id;

      // 1. Add vendor
      const vendor = await dal.addVendor(eventId, {
        name: 'Golden Hour Photography',
        category: 'PHOTOGRAPHY',
        status: 'RESEARCHING',
        contactPerson: 'Elena Rostova',
        email: 'elena@goldenhour.com',
        phone: '555-0199',
        contractAmount: 3200,
      });

      expect(vendor.id).toBeDefined();
      expect(vendor.name).toBe('Golden Hour Photography');

      // 2. Update vendor status
      const bookedVendor = await dal.updateVendor(vendor.id, {
        status: 'BOOKED',
      });
      expect(bookedVendor?.status).toBe('BOOKED');

      // 3. Delete vendor
      const deleted = await dal.deleteVendor(vendor.id);
      expect(deleted).toBe(true);

      const eventDetails = await dal.getEventById(eventId);
      expect(eventDetails?.vendors.some(v => v.id === vendor.id)).toBe(false);
    });
  });

  // ==========================================
  // RUN-OF-SHOW CRUD OPERATIONS
  // ==========================================
  describe('Run-of-Show Operations', () => {
    it('creates, edits, and deletes schedule items', async () => {
      const events = await dal.getEvents();
      const eventId = events[0].id;

      // 1. Add run-of-show item
      const ros = await dal.addRunOfShowItem(eventId, {
        startTime: '17:00',
        endTime: '17:45',
        title: 'Sunset Champagne Toast',
        location: 'Garden Terrace',
        picName: 'Sarah Jenkins',
        orderIndex: 99,
      });

      expect(ros.id).toBeDefined();
      expect(ros.title).toBe('Sunset Champagne Toast');

      // 2. Update run-of-show item
      const updatedRos = await dal.updateRunOfShowItem(ros.id, {
        startTime: '17:15',
        endTime: '18:00',
      });
      expect(updatedRos?.startTime).toBe('17:15');

      // 3. Delete run-of-show item
      const deleted = await dal.deleteRunOfShowItem(ros.id);
      expect(deleted).toBe(true);

      const eventDetails = await dal.getEventById(eventId);
      expect(eventDetails?.runOfShowItems.some(r => r.id === ros.id)).toBe(false);
    });
  });
});

