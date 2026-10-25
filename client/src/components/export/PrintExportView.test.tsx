import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintExportView } from './PrintExportView.js';
import { ToastProvider } from '../common/ToastContext.js';
import { EventWithDetails } from '../../types/index.js';

describe('PrintExportView (Print-Friendly Event Plan)', () => {
  const mockInternalEventId = 'ev-internal-secret-uuid-12345';
  const mockInternalTaskId = 'task-internal-secret-uuid-67890';
  const mockInternalBudgetId = 'budget-internal-secret-uuid-11223';
  const mockInternalVendorId = 'vendor-internal-secret-uuid-44556';

  const mockEvent: EventWithDetails = {
    id: mockInternalEventId,
    title: 'Eleanor & Lucas Autumn Nuptials',
    eventType: 'WEDDING',
    status: 'CONFIRMED',
    date: '2026-10-30',
    startTime: '15:30',
    endTime: '23:00',
    locationName: 'Rosewood Estate',
    locationAddress: '742 Evergreen Terrace, Portland, OR',
    estimatedGuests: 120,
    totalBudget: 45000,
    currency: 'USD',
    themeAesthetic: 'Rustic Botanical Elegance',
    colorPalette: ['#7A2035', '#E6C687', '#2A4736', '#FAF7F2'],
    dietaryNeeds: ['Gluten-Free (4 guests)', 'Vegan (8 guests)', 'Nut Allergy (2 guests)'],
    accessibilityNeeds: ['Wheelchair ramp at main reception hall', 'Reserved ground-floor seating'],
    specialPreferences: 'Soft golden hour acoustic guitar during ceremony; sparkler exit at 10:45 PM.',
    notes: 'Private family coordinator contact is available on-site.',
    isDemo: false,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-15T12:00:00Z',
    runOfShowItems: [
      {
        id: 'ros-1',
        eventId: mockInternalEventId,
        startTime: '15:30',
        endTime: '16:15',
        title: 'Guest Arrival & Champagne Welcome',
        description: 'String quartet plays acoustic covers in the courtyard.',
        location: 'Courtyard Garden',
        picName: 'Sarah Jenkins (Lead Host)',
        orderIndex: 1,
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'ros-2',
        eventId: mockInternalEventId,
        startTime: '16:30',
        endTime: '17:15',
        title: 'Ceremony & Vow Exchange',
        description: 'Processional begins promptly at 16:30.',
        location: 'Cedar Pavilion',
        picName: 'Pastor Reynolds',
        orderIndex: 2,
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
    ],
    tasks: [
      {
        id: mockInternalTaskId,
        eventId: mockInternalEventId,
        title: 'Finalize Seating Chart & Place Cards',
        description: 'Send finalized chart to calligraphy artist.',
        category: 'Stationery',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: '2026-10-20',
        isMilestone: true,
        assignee: 'Eleanor (Bride)',
        orderIndex: 1,
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'task-2',
        eventId: mockInternalEventId,
        title: 'Order Sparklers for Send-off',
        description: 'Verify 36-inch smokeless sparklers with venue coordinator.',
        category: 'Decor',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        dueDate: '2026-10-10',
        isMilestone: false,
        assignee: 'Lucas (Groom)',
        orderIndex: 2,
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
    ],
    budgetItems: [
      {
        id: mockInternalBudgetId,
        eventId: mockInternalEventId,
        category: 'VENUE',
        name: 'Estate Grounds & Pavilion Rental',
        estimatedCost: 12000,
        actualCost: 11500,
        paymentStatus: 'PAID_IN_FULL',
        notes: 'Includes bridal suite & cleanup fee',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'budget-2',
        eventId: mockInternalEventId,
        category: 'CATERING',
        name: 'Farm-to-Table Plated Dinner',
        estimatedCost: 15000,
        actualCost: 14200,
        paymentStatus: 'DEPOSIT_PAID',
        notes: 'Includes appetizers and bar service',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
    ],
    vendors: [
      {
        id: mockInternalVendorId,
        eventId: mockInternalEventId,
        name: 'Luminescence Photography',
        category: 'PHOTOGRAPHY',
        status: 'BOOKED',
        contactPerson: 'Marcus Vance',
        phone: '(555) 234-5678',
        email: 'marcus@luminescencephoto.com',
        contractAmount: 4800,
        notes: 'Includes 8 hours coverage & secondary shooter',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'vendor-2',
        eventId: mockInternalEventId,
        name: 'Blooms & Boughs Floral Studio',
        category: 'DECORATION',
        status: 'BOOKED',
        contactPerson: 'Chloe Bennett',
        phone: '(555) 876-5432',
        email: 'chloe@bloomsboughs.com',
        contractAmount: 3500,
        notes: 'Arch installation and 14 centerpieces',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
    ],
    metrics: {
      totalEstimatedBudget: 27000,
      totalActualCost: 25700,
      remainingBudget: 19300,
      budgetVariance: 1300,
      completedTasksCount: 1,
      totalTasksCount: 2,
      tasksProgressPercent: 50,
      bookedVendorsCount: 2,
      totalVendorsCount: 2,
    },
  };

  const renderComponent = (event = mockEvent) => {
    return renderToStaticMarkup(
      <ToastProvider>
        <PrintExportView event={event} onClose={vi.fn()} />
      </ToastProvider>
    );
  };

  it('renders all 5 mandatory sections: event details, schedule, checklist, budget summary, and vendors', () => {
    const html = renderComponent();

    // Section 1: Event Details
    expect(html).toContain('Eleanor &amp; Lucas Autumn Nuptials');
    expect(html).toContain('Rosewood Estate');
    expect(html).toContain('742 Evergreen Terrace');
    expect(html).toContain('120 Guests');
    expect(html).toContain('Rustic Botanical Elegance');
    expect(html).toContain('#7A2035');
    expect(html).toContain('#E6C687');
    expect(html).toContain('Gluten-Free (4 guests)');
    expect(html).toContain('Wheelchair ramp at main reception hall');
    expect(html).toContain('Soft golden hour acoustic guitar');

    // Section 2: Schedule (Master Day-of Run-of-Show)
    expect(html).toContain('1. Master Day-of Run-of-Show Schedule');
    expect(html).toContain('Guest Arrival &amp; Champagne Welcome');
    expect(html).toContain('Courtyard Garden');
    expect(html).toContain('Sarah Jenkins (Lead Host)');
    expect(html).toContain('Ceremony &amp; Vow Exchange');

    // Section 3: Checklist (Tasks Roadmap)
    expect(html).toContain('2. Action Checklist &amp; Tasks Roadmap');
    expect(html).toContain('Finalize Seating Chart &amp; Place Cards');
    expect(html).toContain('Milestone');
    expect(html).toContain('Eleanor (Bride)');
    expect(html).toContain('Order Sparklers for Send-off');

    // Section 4: Budget Summary & Ledger
    expect(html).toContain('3. Budget Summary &amp; Ledger');
    expect(html).toContain('Estate Grounds &amp; Pavilion Rental');
    expect(html).toContain('Farm-to-Table Plated Dinner');
    expect(html).toContain('PAID IN FULL');
    expect(html).toContain('DEPOSIT PAID');
    expect(html).toContain('Ledger Totals');

    // Section 5: Vendors Directory
    expect(html).toContain('4. Vendor Directory &amp; Day-of Contacts');
    expect(html).toContain('Luminescence Photography');
    expect(html).toContain('Marcus Vance');
    expect(html).toContain('(555) 234-5678');
    expect(html).toContain('marcus@luminescencephoto.com');
    expect(html).toContain('Blooms &amp; Boughs Floral Studio');
  });

  it('strictly excludes internal IDs, API details, and private secrets from the printable output', () => {
    const html = renderComponent();

    // Verify internal UUIDs are nowhere in the rendered HTML output
    expect(html).not.toContain(mockInternalEventId);
    expect(html).not.toContain(mockInternalTaskId);
    expect(html).not.toContain(mockInternalBudgetId);
    expect(html).not.toContain(mockInternalVendorId);

    // Verify backend API details are not exposed
    expect(html).not.toContain('/api/ai/event-plan');
    expect(html).not.toContain('GEMINI_API_KEY');
    expect(html).not.toContain('process.env');
  });

  it('includes proper print formatting CSS classes to ensure clean printing across pages', () => {
    const html = renderComponent();

    // Verify print container has print CSS classes
    expect(html).toContain('print-section');
    expect(html).toContain('print-avoid-break');
    expect(html).toContain('print:hidden');
    expect(html).toContain('print:text-black');
    expect(html).toContain('id="printable-event-plan"');
  });

  it('renders clean fallback states when schedule, tasks, budget items, or vendors are empty', () => {
    const emptyEvent: EventWithDetails = {
      ...mockEvent,
      runOfShowItems: [],
      tasks: [],
      budgetItems: [],
      vendors: [],
      dietaryNeeds: [],
      accessibilityNeeds: [],
      specialPreferences: '',
      notes: '',
      colorPalette: [],
      metrics: {
        totalEstimatedBudget: 0,
        totalActualCost: 0,
        remainingBudget: 45000,
        budgetVariance: 0,
        completedTasksCount: 0,
        totalTasksCount: 0,
        tasksProgressPercent: 0,
        bookedVendorsCount: 0,
        totalVendorsCount: 0,
      },
    };

    const html = renderComponent(emptyEvent);

    expect(html).toContain('No schedule agenda recorded.');
    expect(html).toContain('No tasks recorded in checklist.');
    expect(html).toContain('No budget line items registered.');
    expect(html).toContain('No vendors registered for this event.');
  });

  it('displays sample demo badge when event is marked as demo data', () => {
    const demoEvent: EventWithDetails = {
      ...mockEvent,
      isDemo: true,
    };

    const html = renderComponent(demoEvent);
    expect(html).toContain('Sample Demo Data');
  });
});
