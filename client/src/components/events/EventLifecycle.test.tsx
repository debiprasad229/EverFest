import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanEventModal } from './PlanEventModal.js';
import { ToastProvider } from '../common/ToastContext.js';
import { Event } from '../../types/index.js';
import { storageDal } from '../../services/storageDal.js';

describe('Event Lifecycle: PlanEventModal & Storage DAL (RTL Tests)', () => {
  beforeEach(() => {
    storageDal.getStorage().clear();
    storageDal.resetToDemo();
    vi.restoreAllMocks();
  });

  const renderModal = (props: Partial<React.ComponentProps<typeof PlanEventModal>> = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onSubmit: vi.fn().mockResolvedValue(undefined),
      initialData: null,
      defaultType: 'WEDDING' as const,
    };

    const mergedProps = { ...defaultProps, ...props };

    const utils = render(
      <ToastProvider>
        <PlanEventModal {...mergedProps} />
      </ToastProvider>
    );

    return { ...utils, props: mergedProps };
  };

  // ==========================================
  // 1. MODAL RENDERING & ACCESSIBILITY
  // ==========================================
  describe('Modal Rendering & Form Controls', () => {
    it('renders the creation modal with all standard fields and headings', () => {
      renderModal();

      // Heading
      expect(screen.getByRole('heading', { name: /Plan an Event/i })).toBeInTheDocument();

      // Category buttons
      expect(screen.getByRole('button', { name: /wedding/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /birthday/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /anniversary/i })).toBeInTheDocument();

      // Inputs
      expect(screen.getByLabelText(/Celebration Name \/ Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Event Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Estimated Guest Count/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Planned Budget/i)).toBeInTheDocument();

      // Action buttons
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Initialize Celebration/i })).toBeInTheDocument();
    });

    it('invokes onClose when clicking Cancel button', () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // 2. FORM VALIDATION & ERROR MESSAGES
  // ==========================================
  describe('Form Validation & Boundary Checks', () => {
    it('displays validation error message when submitting a title shorter than 2 characters', async () => {
      const onSubmit = vi.fn();
      renderModal({ onSubmit });

      const titleInput = screen.getByLabelText(/Celebration Name \/ Title/i);
      fireEvent.change(titleInput, { target: { value: 'A' } });

      const submitBtn = screen.getByRole('button', { name: /Initialize Celebration/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Celebration title must be at least 2 characters/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('applies celebration preset when clicking a category button in create mode', () => {
      renderModal();

      const birthdayBtn = screen.getByRole('button', { name: /birthday/i });
      fireEvent.click(birthdayBtn);

      const titleInput = screen.getByLabelText(/Celebration Name \/ Title/i) as HTMLInputElement;
      expect(titleInput.value).toContain('Birthday');

        const budgetInput = screen.getByLabelText(/Planned Budget/i) as HTMLInputElement;
      expect(Number(budgetInput.value)).toBe(4000);
    });
  });

  // ==========================================
  // 3. CREATE EVENT SUBMISSION FLOW
  // ==========================================
  describe('Create Event Submission Flow', () => {
    it('submits valid form and triggers onSubmit with formatted values', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      renderModal({ onSubmit, onClose });

      const titleInput = screen.getByLabelText(/Celebration Name \/ Title/i);
      fireEvent.change(titleInput, { target: { value: 'Grand Midsummer Solstice Gala' } });

      const budgetInput = screen.getByLabelText(/Planned Budget/i);
      fireEvent.change(budgetInput, { target: { value: '25000' } });

      const guestsInput = screen.getByLabelText(/Estimated Guest Count/i);
      fireEvent.change(guestsInput, { target: { value: '150' } });

      // Click a dietary tag
      const veganTag = screen.getByRole('button', { name: /\+ Vegan/i });
      fireEvent.click(veganTag);

      const submitBtn = screen.getByRole('button', { name: /Initialize Celebration/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = onSubmit.mock.calls[0][0];
      expect(submittedData.title).toBe('Grand Midsummer Solstice Gala');
      expect(submittedData.totalBudget).toBe(25000);
      expect(submittedData.estimatedGuests).toBe(150);
      expect(submittedData.dietaryNeeds).toContain('Vegan');

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ==========================================
  // 4. EDIT EVENT MODE
  // ==========================================
  describe('Edit Event Mode', () => {
    const existingEvent: Event = {
      id: 'evt-existing-1',
      title: 'Original Milestone Celebration',
      eventType: 'ANNIVERSARY',
      status: 'PLANNING',
      date: '2026-11-20',
      startTime: '17:00',
      endTime: '22:00',
      locationName: 'Sapphire Ballroom',
      locationAddress: '456 Ocean Ave',
      estimatedGuests: 85,
      totalBudget: 12000,
      currency: 'USD',
      themeAesthetic: 'Timeless Sterling Elegance',
      dietaryNeeds: ['Gluten-Free'],
      accessibilityNeeds: ['Elevator Access'],
      specialPreferences: 'Soft string acoustic duet',
      notes: 'Key coordinator on standby',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    it('renders prefilled fields when in edit mode', () => {
      renderModal({ initialData: existingEvent });

      expect(screen.getByRole('heading', { name: /Edit Celebration Details/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();

      const titleInput = screen.getByLabelText(/Celebration Name \/ Title/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Original Milestone Celebration');

      const budgetInput = screen.getByLabelText(/Planned Budget/i) as HTMLInputElement;
      expect(budgetInput.value).toBe('12000');

      const guestsInput = screen.getByLabelText(/Estimated Guest Count/i) as HTMLInputElement;
      expect(guestsInput.value).toBe('85');
    });

    it('submits updated values in edit mode', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderModal({ initialData: existingEvent, onSubmit });

      const titleInput = screen.getByLabelText(/Celebration Name \/ Title/i);
      fireEvent.change(titleInput, { target: { value: 'Updated 25th Silver Anniversary' } });

      const budgetInput = screen.getByLabelText(/Planned Budget/i);
      fireEvent.change(budgetInput, { target: { value: '14500' } });

      const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      const updated = onSubmit.mock.calls[0][0];
      expect(updated.title).toBe('Updated 25th Silver Anniversary');
      expect(updated.totalBudget).toBe(14500);
      expect(updated.dietaryNeeds).toContain('Gluten-Free');
    });
  });

  // ==========================================
  // 5. STORAGE DAL END-TO-END LIFECYCLE
  // ==========================================
  describe('Full Event Create / Read / Update / Delete in StorageDal', () => {
    it('executes full create, retrieve, update, and delete cycle cleanly', async () => {
      // 1. Create
      const created = await storageDal.createEvent({
        title: 'Autumnal Wine Tasting & Dinner',
        eventType: 'OTHER',
        status: 'PLANNING',
        date: '2026-11-28',
        estimatedGuests: 30,
        totalBudget: 4500,
        currency: 'USD',
        dietaryNeeds: ['Vegetarian'],
        accessibilityNeeds: ['Ramp Access'],
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('Autumnal Wine Tasting & Dinner');

      // 2. Read with details (metrics should be derived)
      const details = await storageDal.getEventById(created.id);
      expect(details).not.toBeNull();
      expect(details?.totalBudget).toBe(4500);
      expect(details?.tasks.length).toBeGreaterThan(0); // Starter tasks automatically created
      expect(details?.metrics.remainingBudget).toBe(4500);

      // 3. Update
      const updated = await storageDal.updateEvent(created.id, {
        title: 'Autumnal Wine Tasting & Gala Dinner (Expanded)',
        totalBudget: 6000,
      });

      expect(updated.title).toBe('Autumnal Wine Tasting & Gala Dinner (Expanded)');
      expect(updated.totalBudget).toBe(6000);

      // Verify updated details
      const refetched = await storageDal.getEventById(created.id);
      expect(refetched?.title).toBe('Autumnal Wine Tasting & Gala Dinner (Expanded)');
      expect(refetched?.metrics.remainingBudget).toBe(6000);

      // 4. Delete
      const deleted = await storageDal.deleteEvent(created.id);
      expect(deleted).toBe(true);

      const afterDelete = await storageDal.getEventById(created.id);
      expect(afterDelete).toBeNull();
    });
  });
});
