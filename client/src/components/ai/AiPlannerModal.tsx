import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  DollarSign, 
  Clock, 
  Palette, 
  HelpCircle,
  RefreshCw,
  Users,
  Copy,
  AlertTriangle,
  ShieldAlert,
  Edit3,
  Calendar,
  Building2,
  Utensils,
  Lightbulb,
  CheckSquare,
  Square,
  ArrowRight,
  Info
} from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { TextInput, Textarea, Select } from '../common/Input.js';
import { useToast } from '../common/ToastContext.js';
import { EventWithDetails, GeneratedAiPlan, TaskPriority, VendorCategory } from '../../types/index.js';
import { api } from '../../services/api.js';
import { formatCurrency, cn } from '../../utils/cn.js';
import { 
  parseAiPlanError, 
  generateOfflineDemoPlan, 
  PlanWithMetadata, 
  AiPlanErrorDetails 
} from '../../utils/aiPlanUtils.js';

interface AiPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventWithDetails;
  onPlanApplied: () => void;
}

type TabType = 'overview' | 'theme' | 'agenda' | 'budget' | 'tasks' | 'vendors' | 'menu';

export const AiPlannerModal: React.FC<AiPlannerModalProps> = ({
  isOpen,
  onClose,
  event,
  onPlanApplied,
}) => {
  // Input parameters
  const [themeInput, setThemeInput] = useState(event.themeAesthetic || '');
  const [prioritiesText, setPrioritiesText] = useState('Atmosphere, Memorable Photography, Seasonal Food');
  const [preferencesText, setPreferencesText] = useState(event.specialPreferences || '');

  // Generation & error states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationError, setGenerationError] = useState<AiPlanErrorDetails | null>(null);

  // Loaded plan state (editable by user)
  const [plan, setPlan] = useState<PlanWithMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isApplying, setIsApplying] = useState(false);

  // User item selection checkboxes (for selective merge without silent overwrites)
  const [applyTheme, setApplyTheme] = useState(true);
  const [selectedBudgetIndices, setSelectedBudgetIndices] = useState<number[]>([]);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<number[]>([]);
  const [selectedAgendaIndices, setSelectedAgendaIndices] = useState<number[]>([]);
  const [selectedVendorIndices, setSelectedVendorIndices] = useState<number[]>([]);

  const { success, error } = useToast();

  // Reset or initialize state when opened
  useEffect(() => {
    if (isOpen) {
      setThemeInput(event.themeAesthetic || '');
      setPreferencesText(event.specialPreferences || '');
      setGenerationError(null);
    }
  }, [isOpen, event]);

  // When a plan is loaded, default all item checkboxes to selected
  useEffect(() => {
    if (plan) {
      const budgetItems = plan.budgetSuggestions || plan.suggestedBudgetBreakdown || [];
      setSelectedBudgetIndices(budgetItems.map((_, i) => i));

      const tasks = plan.datedTasks || plan.milestoneTasks || [];
      setSelectedTaskIndices(tasks.map((_, i) => i));

      const agenda = plan.agenda || plan.runOfShow || [];
      setSelectedAgendaIndices(agenda.map((_, i) => i));

      const vendors = plan.vendorCategories || plan.vendorRecommendations || [];
      setSelectedVendorIndices(vendors.map((_, i) => i));

      setApplyTheme(true);
    }
  }, [plan]);

  // Handle live AI generation call
  const handleGenerate = async () => {
    if (isGenerating) return; // Prevent duplicate submissions
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('Connecting to Gemini AI service...');

    const stepTimer1 = setTimeout(() => {
      setGenerationStep('Synthesizing event concept and color palette...');
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setGenerationStep('Allocating budget and calculating milestone deadlines...');
    }, 2800);

    const stepTimer3 = setTimeout(() => {
      setGenerationStep('Formulating minute-by-minute run-of-show agenda...');
    }, 4500);

    try {
      const payload = {
        eventType: event.eventType,
        title: event.title,
        date: event.date,
        totalBudget: event.totalBudget,
        guestCount: event.estimatedGuests,
        location: event.locationName || undefined,
        theme: themeInput.trim() || undefined,
        vibeOrTheme: themeInput.trim() || undefined,
        preferences: preferencesText.trim() || undefined,
        dietaryNeeds: event.dietaryNeeds || [],
        accessibilityNeeds: event.accessibilityNeeds || [],
        priorities: prioritiesText.split(',').map((s) => s.trim()).filter(Boolean),
      };

      const result = await api.generateAiPlan(payload);

      const planWithMeta: PlanWithMetadata = {
        ...result,
        _source: 'LIVE_AI',
        _generatedAt: new Date().toISOString(),
      };

      setPlan(planWithMeta);
      setActiveTab('overview');
      success('Live AI Blueprint Generated', 'Personalized celebration plan generated by Gemini AI.');
    } catch (err: any) {
      const parsedError = parseAiPlanError(err);
      setGenerationError(parsedError);
      error(parsedError.title, parsedError.message);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Explicit Demo Mode generation (offline, zero-pretend)
  const handleGenerateDemoMode = () => {
    setGenerationError(null);
    const demoPlan = generateOfflineDemoPlan({
      title: event.title,
      eventType: event.eventType,
      date: event.date,
      totalBudget: event.totalBudget,
      guestCount: event.estimatedGuests,
      vibeOrTheme: themeInput || undefined,
      location: event.locationName || undefined,
    });

    setPlan(demoPlan);
    setActiveTab('overview');
    success('Offline Demo Plan Loaded', 'Loaded deterministic celebration template (Not live AI).');
  };

  // Copy color palette hex codes
  const handleCopyPalette = () => {
    const palette = plan?.theme?.colorPalette || plan?.themeConcept?.colorPalette;
    if (palette && palette.length > 0) {
      navigator.clipboard.writeText(palette.join(', '));
      success('Palette Copied', 'Hex codes copied to clipboard.');
    }
  };

  // Selective adoption: Merge into celebration workspace
  const handleApplyToEvent = async () => {
    if (!plan) return;
    setIsApplying(true);

    try {
      await api.applyAiPlan(event.id, plan, {
        applyTheme,
        selectedBudgetIndices,
        selectedTaskIndices,
        selectedAgendaIndices,
        selectedVendorIndices,
      });

      success('Blueprint Adopted!', 'Selected components have been safely merged into your celebration.');
      onPlanApplied();
      onClose();
    } catch (err: any) {
      error('Adoption Failed', err.message || 'Unable to merge plan.');
    } finally {
      setIsApplying(false);
    }
  };

  // Helper toggle functions for checkboxes
  const toggleIndex = (list: number[], index: number, setList: (val: number[]) => void) => {
    if (list.includes(index)) {
      setList(list.filter((i) => i !== index));
    } else {
      setList([...list, index]);
    }
  };

  const toggleAll = (totalCount: number, list: number[], setList: (val: number[]) => void) => {
    if (list.length === totalCount) {
      setList([]);
    } else {
      setList(Array.from({ length: totalCount }, (_, i) => i));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Celebration Blueprint Architect"
      subtitle="Generate, customize, and selectively adopt celebration concepts, budgets, milestones, and schedules."
      maxWidth="4xl"
    >
      <div className="space-y-6">
        
        {/* Input Parameters Banner (collapsible/compact) */}
        <div className="bg-ivory-50/80 p-4 sm:p-5 rounded-2xl border border-ivory-200/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700 block">
                Target Celebration Parameters
              </span>
              <h4 className="text-sm font-bold text-plum-950 font-serif">
                {event.title} • {formatCurrency(event.totalBudget, event.currency)} Budget • {event.estimatedGuests} Guests
              </h4>
            </div>

            {/* Live Model or Demo Mode Badge */}
            {plan && (
              <div>
                {plan._source === 'LIVE_AI' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Live Gemini AI Plan</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                    <span>Offline Demo Baseline (Not Live AI)</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextInput
              label="Atmospheric Vibe / Theme"
              placeholder="e.g. Tuscan Vineyard Sunset"
              value={themeInput}
              onChange={(e) => setThemeInput(e.target.value)}
              disabled={isGenerating}
            />

            <TextInput
              label="Top Priorities"
              placeholder="e.g. Photography, Fine Dining"
              value={prioritiesText}
              onChange={(e) => setPrioritiesText(e.target.value)}
              disabled={isGenerating}
            />

            <TextInput
              label="Special Preferences"
              placeholder="e.g. Acoustic violin, sparklers"
              value={preferencesText}
              onChange={(e) => setPreferencesText(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <p className="text-[11px] text-slate-500 font-sans">
              All generation requests run through server endpoint <code className="bg-ivory-200 px-1 py-0.5 rounded font-mono text-[10px]">POST /api/ai/event-plan</code>
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateDemoMode}
                disabled={isGenerating}
                className="text-xs"
              >
                Load Offline Demo Plan
              </Button>

              <Button
                variant="plum"
                size="sm"
                onClick={handleGenerate}
                isLoading={isGenerating}
                leftIcon={<Sparkles className="w-4 h-4 text-gold-400" />}
                className="shadow-sm"
              >
                {plan ? 'Regenerate Live Blueprint' : 'Generate Live AI Blueprint'}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State Banner */}
        {isGenerating && (
          <div className="p-8 bg-plum-950 text-white rounded-3xl text-center space-y-4 animate-pulse border border-gold-500/30">
            <div className="w-12 h-12 mx-auto rounded-full bg-gold-500/20 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-gold-400 animate-spin" />
            </div>
            <div>
              <h4 className="text-lg font-bold font-serif text-gold-200">
                Synthesizing Celebration Architecture
              </h4>
              <p className="text-xs text-ivory-200 mt-1 max-w-md mx-auto">
                {generationStep || 'Consulting Google Gemini AI for customized event allocations...'}
              </p>
            </div>
          </div>
        )}

        {/* Error and Retry Banner */}
        {generationError && !isGenerating && (
          <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 text-slate-800 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-950 font-serif">
                  {generationError.title}
                </h4>
                <p className="text-xs text-rose-800 leading-relaxed font-sans">
                  {generationError.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-rose-200/80">
              {generationError.canRetry && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerate}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  className="bg-white hover:bg-rose-100/50 text-rose-900 border-rose-300"
                >
                  Retry Live AI Request
                </Button>
              )}

              {generationError.suggestDemo && (
                <Button
                  variant="plum"
                  size="sm"
                  onClick={handleGenerateDemoMode}
                  className="bg-plum-900 text-xs"
                >
                  Switch to Offline Demo Plan
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Plan Display and Editable Sections */}
        {plan && !isGenerating && (
          <div className="space-y-5">
            
            {/* Demo Source Banner (if generated offline) */}
            {plan._source === 'OFFLINE_DEMO' && (
              <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-300 text-amber-950 flex items-center gap-2.5 text-xs font-sans">
                <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>
                  <strong>Demo Mode Notice:</strong> This celebration plan was produced by EverFest's offline domain planning baseline. It was <strong>NOT</strong> generated by a live AI request.
                </span>
              </div>
            )}

            {/* Section Tabs Navigation */}
            <div className="flex border-b border-ivory-200 gap-2 sm:gap-4 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'border-plum-900 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Overview & Concept</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('theme')}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'theme'
                    ? 'border-plum-900 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Theme & Decor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('agenda')}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'agenda'
                    ? 'border-plum-900 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Agenda ({selectedAgendaIndices.length}/{(plan.agenda || plan.runOfShow || []).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('budget')}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'budget'
                    ? 'border-plum-900 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Budget Suggestions ({selectedBudgetIndices.length}/{(plan.budgetSuggestions || plan.suggestedBudgetBreakdown || []).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'tasks'
                    ? 'border-plum-900 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tasks Roadmap ({selectedTaskIndices.length}/{(plan.datedTasks || plan.milestoneTasks || []).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vendors')}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'vendors'
                    ? 'border-plum-900 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Vendor Checklist ({selectedVendorIndices.length}/{(plan.vendorCategories || plan.vendorRecommendations || []).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'menu'
                    ? 'border-plum-900 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Menu & Activities</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW & CONCEPT */}
            {activeTab === 'overview' && (
              <div className="space-y-4 font-sans animate-fade-in">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Event Concept & Emotional Atmosphere (Editable)
                  </label>
                  <Textarea
                    value={plan.eventConcept || ''}
                    onChange={(e) => setPlan({ ...plan, eventConcept: e.target.value })}
                    rows={3}
                    className="text-xs font-sans leading-relaxed"
                  />
                </div>

                {/* Key Assumptions & Cautions Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-ivory-50 p-4 rounded-2xl border border-ivory-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                      Identified Planning Assumptions
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                      {(plan.assumptions && plan.assumptions.length > 0
                        ? plan.assumptions
                        : ['Assumes standard 4-hour setup window', 'Assumes insured external vendors allowed']
                      ).map((item, idx) => (
                        <li key={idx} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block mb-1.5">
                      Critical Cautions & Warnings
                    </span>
                    <ul className="space-y-1.5 text-xs text-amber-950 list-disc list-inside">
                      {(plan.warnings && plan.warnings.length > 0
                        ? plan.warnings
                        : ['Strict sound curfew enforced at 23:00', 'Guest counts must be frozen 14 days prior']
                      ).map((item, idx) => (
                        <li key={idx} className="leading-relaxed font-medium">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: THEME & DECOR */}
            {activeTab === 'theme' && (
              <div className="space-y-4 font-sans animate-fade-in">
                <div className="flex items-center justify-between p-3 bg-ivory-50 rounded-xl border border-ivory-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyTheme}
                      onChange={(e) => setApplyTheme(e.target.checked)}
                      className="w-4 h-4 text-plum-900 border-ivory-300 rounded focus:ring-gold-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Apply this Theme & Aesthetic Palette to Celebration
                    </span>
                  </label>

                  <span className="text-[10px] text-slate-500">
                    {applyTheme ? 'Will update celebration theme' : 'Preserves current theme'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextInput
                    label="Theme Aesthetic Title (Editable)"
                    value={plan.theme?.title || plan.themeConcept?.title || ''}
                    onChange={(e) => {
                      const updated = { ...(plan.theme || plan.themeConcept), title: e.target.value };
                      setPlan({ ...plan, theme: updated, themeConcept: updated });
                    }}
                  />

                  {/* Swatches with Copy */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Harmonized 5-Color Palette
                    </label>
                    <div className="flex items-center gap-2">
                      {(plan.theme?.colorPalette || plan.themeConcept?.colorPalette || []).map((hex, idx) => (
                        <span
                          key={idx}
                          title={hex}
                          style={{ backgroundColor: hex }}
                          className="w-7 h-7 rounded-full border border-black/15 shadow-sm inline-block"
                        />
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCopyPalette}
                        leftIcon={<Copy className="w-3 h-3" />}
                        className="text-xs py-1 px-2.5 ml-2"
                      >
                        Copy Hex
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Theme Description & Atmosphere (Editable)
                  </label>
                  <Textarea
                    value={plan.theme?.description || plan.themeConcept?.description || ''}
                    onChange={(e) => {
                      const updated = { ...(plan.theme || plan.themeConcept), description: e.target.value };
                      setPlan({ ...plan, theme: updated, themeConcept: updated });
                    }}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                {/* Decoration Ideas */}
                <div className="bg-ivory-50 p-4 rounded-2xl border border-ivory-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Decoration & Staging Concepts
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                    {(plan.decorationIdeas && plan.decorationIdeas.length > 0
                      ? plan.decorationIdeas
                      : ['Low-incline botanical floral table runners', 'Custom bronze candelabras and fairy lights']
                    ).map((idea, idx) => (
                      <li key={idx} className="leading-relaxed">{idea}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 3: AGENDA (RUN OF SHOW) */}
            {activeTab === 'agenda' && (
              <div className="space-y-4 font-sans animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAll((plan.agenda || plan.runOfShow || []).length, selectedAgendaIndices, setSelectedAgendaIndices)}
                      className="text-xs font-bold text-plum-900 hover:underline flex items-center gap-1.5"
                    >
                      {selectedAgendaIndices.length === (plan.agenda || plan.runOfShow || []).length ? (
                        <CheckSquare className="w-4 h-4 text-plum-900" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Select All Agenda Items ({selectedAgendaIndices.length})</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Existing run-of-show entries will be preserved
                  </span>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {(plan.agenda || plan.runOfShow || []).map((item, idx) => {
                    const isSelected = selectedAgendaIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                          isSelected ? 'bg-white border-ivory-300 shadow-2xs' : 'bg-ivory-50/60 border-ivory-200 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleIndex(selectedAgendaIndices, idx, setSelectedAgendaIndices)}
                          className="w-4 h-4 mt-1 text-plum-900 border-ivory-300 rounded focus:ring-gold-500 cursor-pointer"
                        />

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={item.startTime}
                            onChange={(e) => {
                              const list = [...(plan.agenda || plan.runOfShow || [])];
                              list[idx].startTime = e.target.value;
                              setPlan({ ...plan, agenda: list, runOfShow: list });
                            }}
                            className="text-xs font-mono font-bold text-slate-800 bg-ivory-100/80 px-2 py-1 rounded border border-ivory-200"
                            placeholder="Start Time"
                          />

                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const list = [...(plan.agenda || plan.runOfShow || [])];
                              list[idx].title = e.target.value;
                              setPlan({ ...plan, agenda: list, runOfShow: list });
                            }}
                            className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded border border-ivory-200 sm:col-span-2"
                            placeholder="Activity Title"
                          />

                          <input
                            type="text"
                            value={item.location}
                            onChange={(e) => {
                              const list = [...(plan.agenda || plan.runOfShow || [])];
                              list[idx].location = e.target.value;
                              setPlan({ ...plan, agenda: list, runOfShow: list });
                            }}
                            className="text-xs text-slate-600 bg-ivory-50 px-2 py-1 rounded border border-ivory-200"
                            placeholder="Location / Zone"
                          />

                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const list = [...(plan.agenda || plan.runOfShow || [])];
                                list[idx].description = e.target.value;
                                setPlan({ ...plan, agenda: list, runOfShow: list });
                              }}
                              className="w-full text-xs text-slate-600 bg-white px-2 py-1 rounded border border-ivory-200 font-sans"
                              placeholder="Description and instructions"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: BUDGET SUGGESTIONS */}
            {activeTab === 'budget' && (
              <div className="space-y-4 font-sans animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAll((plan.budgetSuggestions || plan.suggestedBudgetBreakdown || []).length, selectedBudgetIndices, setSelectedBudgetIndices)}
                      className="text-xs font-bold text-plum-900 hover:underline flex items-center gap-1.5"
                    >
                      {selectedBudgetIndices.length === (plan.budgetSuggestions || plan.suggestedBudgetBreakdown || []).length ? (
                        <CheckSquare className="w-4 h-4 text-plum-900" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Select All Budget Items ({selectedBudgetIndices.length})</span>
                    </button>
                  </div>

                  <span className="text-xs font-bold font-mono text-plum-900">
                    Selected Sum: {formatCurrency(
                      selectedBudgetIndices.reduce((sum, idx) => {
                        const item = (plan.budgetSuggestions || plan.suggestedBudgetBreakdown || [])[idx];
                        return sum + (item ? item.estimatedCost : 0);
                      }, 0),
                      event.currency
                    )}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {(plan.budgetSuggestions || plan.suggestedBudgetBreakdown || []).map((item, idx) => {
                    const isSelected = selectedBudgetIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                          isSelected ? 'bg-white border-ivory-300 shadow-2xs' : 'bg-ivory-50/60 border-ivory-200 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleIndex(selectedBudgetIndices, idx, setSelectedBudgetIndices)}
                          className="w-4 h-4 mt-1 text-plum-900 border-ivory-300 rounded focus:ring-gold-500 cursor-pointer"
                        />

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const list = [...(plan.budgetSuggestions || plan.suggestedBudgetBreakdown || [])];
                              list[idx].name = e.target.value;
                              setPlan({ ...plan, budgetSuggestions: list, suggestedBudgetBreakdown: list });
                            }}
                            className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded border border-ivory-200 sm:col-span-2"
                            placeholder="Line Item Name"
                          />

                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400 font-mono">$</span>
                            <input
                              type="number"
                              value={item.estimatedCost}
                              onChange={(e) => {
                                const list = [...(plan.budgetSuggestions || plan.suggestedBudgetBreakdown || [])];
                                list[idx].estimatedCost = parseFloat(e.target.value) || 0;
                                setPlan({ ...plan, budgetSuggestions: list, suggestedBudgetBreakdown: list });
                              }}
                              className="w-full text-xs font-mono font-bold text-slate-800 bg-ivory-50 px-2 py-1 rounded border border-ivory-200"
                              placeholder="Estimated Cost"
                            />
                          </div>

                          <div className="flex items-center justify-end">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              AI Estimate
                            </span>
                          </div>

                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => {
                                const list = [...(plan.budgetSuggestions || plan.suggestedBudgetBreakdown || [])];
                                list[idx].notes = e.target.value;
                                setPlan({ ...plan, budgetSuggestions: list, suggestedBudgetBreakdown: list });
                              }}
                              className="w-full text-xs text-slate-500 bg-ivory-50/50 px-2 py-1 rounded border border-ivory-150 italic font-sans"
                              placeholder="Allocation rationale and scope"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: TASKS ROADMAP */}
            {activeTab === 'tasks' && (
              <div className="space-y-4 font-sans animate-fade-in">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleAll((plan.datedTasks || plan.milestoneTasks || []).length, selectedTaskIndices, setSelectedTaskIndices)}
                    className="text-xs font-bold text-plum-900 hover:underline flex items-center gap-1.5"
                  >
                    {selectedTaskIndices.length === (plan.datedTasks || plan.milestoneTasks || []).length ? (
                      <CheckSquare className="w-4 h-4 text-plum-900" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Select All Tasks ({selectedTaskIndices.length})</span>
                  </button>

                  <span className="text-[11px] text-slate-500">
                    Existing tasks will be preserved
                  </span>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {(plan.datedTasks || plan.milestoneTasks || []).map((task, idx) => {
                    const isSelected = selectedTaskIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                          isSelected ? 'bg-white border-ivory-300 shadow-2xs' : 'bg-ivory-50/60 border-ivory-200 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleIndex(selectedTaskIndices, idx, setSelectedTaskIndices)}
                          className="w-4 h-4 mt-1 text-plum-900 border-ivory-300 rounded focus:ring-gold-500 cursor-pointer"
                        />

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => {
                              const list = [...(plan.datedTasks || plan.milestoneTasks || [])];
                              list[idx].title = e.target.value;
                              setPlan({ ...plan, datedTasks: list, milestoneTasks: list });
                            }}
                            className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded border border-ivory-200 sm:col-span-2"
                            placeholder="Task Title"
                          />

                          <input
                            type="date"
                            value={task.dueDate || ''}
                            onChange={(e) => {
                              const list = [...(plan.datedTasks || plan.milestoneTasks || [])];
                              list[idx].dueDate = e.target.value;
                              setPlan({ ...plan, datedTasks: list, milestoneTasks: list });
                            }}
                            className="text-xs text-slate-700 bg-ivory-50 px-2 py-1 rounded border border-ivory-200"
                          />

                          <select
                            value={task.priority}
                            onChange={(e) => {
                              const list = [...(plan.datedTasks || plan.milestoneTasks || [])];
                              list[idx].priority = e.target.value as TaskPriority;
                              setPlan({ ...plan, datedTasks: list, milestoneTasks: list });
                            }}
                            className="text-xs font-semibold text-slate-800 bg-ivory-50 px-2 py-1 rounded border border-ivory-200 cursor-pointer"
                          >
                            <option value="LOW">Low Priority</option>
                            <option value="MEDIUM">Medium Priority</option>
                            <option value="HIGH">High Priority</option>
                            <option value="URGENT">Urgent</option>
                          </select>

                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={task.description}
                              onChange={(e) => {
                                const list = [...(plan.datedTasks || plan.milestoneTasks || [])];
                                list[idx].description = e.target.value;
                                setPlan({ ...plan, datedTasks: list, milestoneTasks: list });
                              }}
                              className="w-full text-xs text-slate-500 bg-ivory-50/50 px-2 py-1 rounded border border-ivory-150 font-sans"
                              placeholder="Action instructions"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 6: VENDOR CHECKLIST */}
            {activeTab === 'vendors' && (
              <div className="space-y-4 font-sans animate-fade-in">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleAll((plan.vendorCategories || plan.vendorRecommendations || []).length, selectedVendorIndices, setSelectedVendorIndices)}
                    className="text-xs font-bold text-plum-900 hover:underline flex items-center gap-1.5"
                  >
                    {selectedVendorIndices.length === (plan.vendorCategories || plan.vendorRecommendations || []).length ? (
                      <CheckSquare className="w-4 h-4 text-plum-900" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Import Selected Vendors into Directory ({selectedVendorIndices.length})</span>
                  </button>

                  <span className="text-[11px] text-slate-500">
                    Existing directory partners will be preserved
                  </span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {(plan.vendorCategories || plan.vendorRecommendations || []).map((vendor, idx) => {
                    const isSelected = selectedVendorIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                          isSelected ? 'bg-white border-ivory-300 shadow-2xs' : 'bg-ivory-50/60 border-ivory-200 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleIndex(selectedVendorIndices, idx, setSelectedVendorIndices)}
                          className="w-4 h-4 mt-1 text-plum-900 border-ivory-300 rounded focus:ring-gold-500 cursor-pointer"
                        />

                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-slate-900">
                              {vendor.name} ({vendor.category})
                            </h5>
                            <span className="font-mono text-xs font-bold text-plum-900">
                              Budget: {formatCurrency(vendor.estimatedBudget || 0, event.currency)}
                            </span>
                          </div>

                          {vendor.questionsToAsk && vendor.questionsToAsk.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                Screening Checklist Questions:
                              </span>
                              <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5">
                                {vendor.questionsToAsk.map((q, qIdx) => (
                                  <li key={qIdx}>{q}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 7: MENU & ACTIVITIES */}
            {activeTab === 'menu' && (
              <div className="space-y-4 font-sans animate-fade-in">
                <div className="bg-ivory-50 p-4 rounded-2xl border border-ivory-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Curated Signature Beverages & Culinary Highlights
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                    {(plan.menuOrActivityIdeas && plan.menuOrActivityIdeas.length > 0
                      ? plan.menuOrActivityIdeas
                      : ['Signature elderflower rosemary welcome spritz', 'Interactive memory Polaroid guestbook station']
                    ).map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Bottom Merge & Adoption Footer */}
            <div className="pt-4 border-t border-ivory-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-sans">
                <span className="font-bold text-plum-950">Safe Merge:</span>{' '}
                {selectedBudgetIndices.length} budget items, {selectedTaskIndices.length} tasks, and {selectedAgendaIndices.length} schedule entries selected.{' '}
                <span className="text-emerald-700 font-medium">Existing user edits will never be overwritten.</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  disabled={isApplying}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="plum"
                  size="sm"
                  onClick={handleApplyToEvent}
                  isLoading={isApplying}
                  leftIcon={<Check className="w-4 h-4 text-gold-400" />}
                  className="shadow-sm font-semibold"
                >
                  Adopt Selected Blueprint
                </Button>
              </div>
            </div>

          </div>
        )}

      </div>
    </Modal>
  );
};
