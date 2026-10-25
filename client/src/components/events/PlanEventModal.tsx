import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { TextInput, Textarea, Select } from '../common/Input.js';
import { useToast } from '../common/ToastContext.js';
import { Event, EventType } from '../../types/index.js';
import { Sparkles, Users, DollarSign, Heart, Cake, Wine, Tent, Plus, X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export const planEventSchema = z.object({
  title: z.string().min(2, 'Celebration title must be at least 2 characters'),
  eventType: z.enum(['WEDDING', 'BIRTHDAY', 'ANNIVERSARY', 'COMMUNITY', 'OTHER']),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  estimatedGuests: z.coerce.number().int().min(1, 'Must have at least 1 guest').default(50),
  totalBudget: z.coerce.number().min(0, 'Budget must be positive').default(5000),
  currency: z.string().default('USD'),
  themeAesthetic: z.string().optional(),
  specialPreferences: z.string().optional(),
  notes: z.string().optional(),
});

export type PlanEventFormValues = z.infer<typeof planEventSchema>;

const POPULAR_DIETARY_OPTIONS = [
  'Gluten-Free',
  'Vegetarian',
  'Vegan',
  'Nut Allergy',
  'Dairy-Free',
  'Halal',
  'Kosher',
];

const POPULAR_ACCESSIBILITY_OPTIONS = [
  'Wheelchair Accessible Restrooms',
  'Ramp / Step-Free Entrance',
  'Elevator Access',
  'Quiet Sensory Room',
  'ASL Interpreter',
  'Accessible Reserved Parking',
  'Service Animals Welcome',
];

interface PlanEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: PlanEventFormValues & { dietaryNeeds: string[]; accessibilityNeeds: string[] }) => Promise<void>;
  initialData?: Event | null; // If provided, modal is in EDIT mode!
  defaultType?: EventType;
}

export const PlanEventModal: React.FC<PlanEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultType = 'WEDDING',
}) => {
  const isEditMode = !!initialData;
  const { success } = useToast();

  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [customDietInput, setCustomDietInput] = useState('');
  
  const [accessibilityTags, setAccessibilityTags] = useState<string[]>([]);
  const [customAccessInput, setCustomAccessInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanEventFormValues>({
    resolver: zodResolver(planEventSchema),
    defaultValues: {
      eventType: defaultType,
      title: '',
      date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: '16:00',
      endTime: '22:00',
      estimatedGuests: 75,
      totalBudget: 15000,
      currency: 'USD',
      themeAesthetic: '',
      specialPreferences: '',
      notes: '',
    },
  });

  const selectedType = watch('eventType');

  // Sync initialData when editing
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        eventType: initialData.eventType,
        date: initialData.date,
        startTime: initialData.startTime || '16:00',
        endTime: initialData.endTime || '22:00',
        locationName: initialData.locationName || '',
        locationAddress: initialData.locationAddress || '',
        estimatedGuests: initialData.estimatedGuests || 50,
        totalBudget: initialData.totalBudget || 5000,
        currency: initialData.currency || 'USD',
        themeAesthetic: initialData.themeAesthetic || '',
        specialPreferences: initialData.specialPreferences || '',
        notes: initialData.notes || '',
      });
      setDietaryTags(initialData.dietaryNeeds || []);
      setAccessibilityTags(initialData.accessibilityNeeds || []);
    } else {
      reset({
        eventType: defaultType,
        title: '',
        date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: '16:00',
        endTime: '22:00',
        estimatedGuests: 75,
        totalBudget: 15000,
        currency: 'USD',
        themeAesthetic: '',
        specialPreferences: '',
        notes: '',
      });
      setDietaryTags([]);
      setAccessibilityTags([]);
    }
  }, [initialData, defaultType, reset]);

  const celebrationPresets: Record<EventType, { title: string; budget: number; guests: number; theme: string; icon: string }> = {
    WEDDING: { title: 'Maya & Julian’s Vineyard Wedding', budget: 25000, guests: 120, theme: 'Romantic Autumn Twilight & Candlelight', icon: '💍' },
    BIRTHDAY: { title: 'Elena’s 30th Rooftop Birthday', budget: 4000, guests: 50, theme: 'Retro Neon Glow & Cocktail Lounge', icon: '🎂' },
    ANNIVERSARY: { title: 'Silver 25th Wedding Anniversary', budget: 10000, guests: 70, theme: 'Timeless Sterling Elegance & Live Jazz', icon: '🥂' },
    COMMUNITY: { title: 'Annual Riverside Arts & Music Fest', budget: 8500, guests: 300, theme: 'Vibrant Community Harvest Fair', icon: '🎪' },
    OTHER: { title: 'Celebration of Excellence Gala', budget: 6000, guests: 80, theme: 'Modern Festive Chic', icon: '✨' },
  };

  const handleApplyPreset = (type: EventType) => {
    setValue('eventType', type);
    if (!isEditMode) {
      const preset = celebrationPresets[type];
      setValue('title', preset.title);
      setValue('totalBudget', preset.budget);
      setValue('estimatedGuests', preset.guests);
      setValue('themeAesthetic', preset.theme);
    }
  };

  const toggleDietaryTag = (tag: string) => {
    setDietaryTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomDietTag = () => {
    const trimmed = customDietInput.trim();
    if (trimmed && !dietaryTags.includes(trimmed)) {
      setDietaryTags(prev => [...prev, trimmed]);
      setCustomDietInput('');
    }
  };

  const toggleAccessTag = (tag: string) => {
    setAccessibilityTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomAccessTag = () => {
    const trimmed = customAccessInput.trim();
    if (trimmed && !accessibilityTags.includes(trimmed)) {
      setAccessibilityTags(prev => [...prev, trimmed]);
      setCustomAccessInput('');
    }
  };

  const handleFormSubmit = async (data: PlanEventFormValues) => {
    await onSubmit({
      ...data,
      dietaryNeeds: dietaryTags,
      accessibilityNeeds: accessibilityTags,
    });
    success(
      isEditMode ? 'Celebration Updated' : 'Celebration Initialized',
      `"${data.title}" successfully saved.`
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Celebration Details' : 'Plan an Event'}
      subtitle={isEditMode 
        ? 'Update timeline dates, budget allocations, dietary guidelines, and accessibility requests.'
        : 'Establish an event workspace for a wedding, birthday, anniversary, or community gathering.'}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        
        {/* Celebration Type Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Celebration Category *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['WEDDING', 'BIRTHDAY', 'ANNIVERSARY', 'COMMUNITY', 'OTHER'] as EventType[]).map((type) => {
              const preset = celebrationPresets[type];
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleApplyPreset(type)}
                  className={cn(
                    'p-3 rounded-2xl border text-left flex flex-col justify-between transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
                    isSelected
                      ? 'border-plum-800 bg-plum-50/90 text-plum-950 shadow-soft ring-1 ring-plum-700/50'
                      : 'border-ivory-200 hover:border-ivory-300 hover:bg-ivory-100 text-slate-700'
                  )}
                >
                  <span className="text-xl mb-1" aria-hidden="true">{preset.icon}</span>
                  <div>
                    <span className="block text-xs font-bold capitalize">
                      {type.toLowerCase()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name / Title */}
        <TextInput
          label="Celebration Name / Title"
          placeholder="e.g. Maya & Julian's Autumn Vineyard Wedding"
          error={errors.title?.message}
          {...register('title')}
          required
        />

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TextInput
            label="Event Date"
            type="date"
            error={errors.date?.message}
            {...register('date')}
            required
          />

          <TextInput
            label="Start Time"
            type="time"
            {...register('startTime')}
          />

          <TextInput
            label="End Time"
            type="time"
            {...register('endTime')}
          />
        </div>

        {/* Location Name & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput
            label="Location / Venue Name"
            placeholder="e.g. Bella Vista Vineyards & Pavilion"
            {...register('locationName')}
          />

          <TextInput
            label="Location Address"
            placeholder="e.g. 1482 Hilltop Road, Sonoma Valley, CA"
            {...register('locationAddress')}
          />
        </div>

        {/* Budget, Currency & Guest Count */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TextInput
            label="Planned Budget"
            type="number"
            step="50"
            leftIcon={<DollarSign className="w-4 h-4 text-slate-400" />}
            error={errors.totalBudget?.message}
            {...register('totalBudget')}
            required
          />

          <Select
            label="Currency"
            {...register('currency')}
          >
            <option value="USD">USD ($ - US Dollar)</option>
            <option value="EUR">EUR (€ - Euro)</option>
            <option value="GBP">GBP (£ - British Pound)</option>
            <option value="CAD">CAD ($ - Canadian Dollar)</option>
            <option value="AUD">AUD ($ - Australian Dollar)</option>
            <option value="INR">INR (₹ - Indian Rupee)</option>
          </Select>

          <TextInput
            label="Estimated Guest Count"
            type="number"
            leftIcon={<Users className="w-4 h-4 text-slate-400" />}
            error={errors.estimatedGuests?.message}
            {...register('estimatedGuests')}
            required
          />
        </div>

        {/* Theme & Aesthetic Vibe */}
        <TextInput
          label="Theme / Aesthetic Vibe"
          placeholder="e.g. Romantic Candlelight, Tuscan Harvest, Retro Neon, Silver Elegance"
          {...register('themeAesthetic')}
        />

        {/* Dietary Needs Tag Selector */}
        <div className="space-y-2 bg-ivory-50/70 p-4 rounded-2xl border border-ivory-200">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Dietary Needs & Accommodations
          </label>
          <p className="text-[11px] text-slate-500">
            Select standard guidelines for catering menus or enter custom allergy notes.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {POPULAR_DIETARY_OPTIONS.map((diet) => {
              const active = dietaryTags.includes(diet);
              return (
                <button
                  key={diet}
                  type="button"
                  onClick={() => toggleDietaryTag(diet)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                    active
                      ? 'bg-plum-800 text-white border-plum-900 shadow-soft'
                      : 'bg-white text-slate-700 border-ivory-300 hover:bg-ivory-100'
                  )}
                >
                  {active ? `✓ ${diet}` : `+ ${diet}`}
                </button>
              );
            })}
          </div>

          {/* Custom Dietary Tag Input */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              placeholder="Add custom dietary restriction..."
              value={customDietInput}
              onChange={(e) => setCustomDietInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomDietTag();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-ivory-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={addCustomDietTag}
            >
              Add
            </Button>
          </div>

          {dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-ivory-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">Active:</span>
              {dietaryTags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-plum-100 text-plum-900 border border-plum-200">
                  <span>{t}</span>
                  <button type="button" onClick={() => toggleDietaryTag(t)} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Accessibility Needs Tag Selector */}
        <div className="space-y-2 bg-ivory-50/70 p-4 rounded-2xl border border-ivory-200">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Accessibility Needs & Physical Logistics
          </label>
          <p className="text-[11px] text-slate-500">
            Tag required accessibility accommodations for venue staging and guest comfort.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {POPULAR_ACCESSIBILITY_OPTIONS.map((access) => {
              const active = accessibilityTags.includes(access);
              return (
                <button
                  key={access}
                  type="button"
                  onClick={() => toggleAccessTag(access)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                    active
                      ? 'bg-plum-800 text-white border-plum-900 shadow-soft'
                      : 'bg-white text-slate-700 border-ivory-300 hover:bg-ivory-100'
                  )}
                >
                  {active ? `✓ ${access}` : `+ ${access}`}
                </button>
              );
            })}
          </div>

          {/* Custom Accessibility Tag Input */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              placeholder="Add custom accessibility requirement..."
              value={customAccessInput}
              onChange={(e) => setCustomAccessInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomAccessTag();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-ivory-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={addCustomAccessTag}
            >
              Add
            </Button>
          </div>

          {accessibilityTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-ivory-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">Active:</span>
              {accessibilityTags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gold-100 text-gold-950 border border-gold-300">
                  <span>{t}</span>
                  <button type="button" onClick={() => toggleAccessTag(t)} className="hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Special Preferences */}
        <Textarea
          label="Special Preferences & Creative Vision"
          placeholder="Musical genre requests, surprise elements, photography guidelines, attire dress codes, or MC instructions..."
          {...register('specialPreferences')}
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-ivory-200">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="plum"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Sparkles className="w-4 h-4 text-gold-400" />}
          >
            {isEditMode ? 'Save Changes' : 'Initialize Celebration'}
          </Button>
        </div>

      </form>
    </Modal>
  );
};
