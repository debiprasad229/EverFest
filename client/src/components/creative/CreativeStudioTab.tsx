import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Palette, 
  Mail, 
  Gamepad2, 
  Utensils, 
  HeartHandshake, 
  Save, 
  Edit3, 
  Plus, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  GlassWater, 
  CheckCircle2,
  Info,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  EventWithDetails, 
  CreativeIdeasResponse, 
  ThemeIdea, 
  ColorPaletteIdea, 
  InvitationWording, 
  ActivityIdea, 
  MenuIdeas,
  InvitationStyle
} from '../../types/index.js';
import { api } from '../../services/api.js';
import { parseAiPlanError, generateOfflineDemoCreativeIdeas } from '../../utils/aiPlanUtils.js';
import { useToast } from '../common/ToastContext.js';
import { Button } from '../common/Button.js';
import { CardSkeleton } from '../common/Skeleton.js';
import { ErrorState } from '../common/ErrorState.js';
import { EmptyState } from '../common/EmptyState.js';
import { formatCurrency, formatDate, cn } from '../../utils/cn.js';

interface CreativeStudioTabProps {
  event: EventWithDetails;
  onRefreshEvent: () => void;
}

export const CreativeStudioTab: React.FC<CreativeStudioTabProps> = ({
  event,
  onRefreshEvent,
}) => {
  const { success, error, info } = useToast();

  const [ideas, setIdeas] = useState<CreativeIdeasResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<any | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'themes' | 'palettes' | 'invitations' | 'activities' | 'menu'>('themes');
  const [selectedInvitationStyle, setSelectedInvitationStyle] = useState<InvitationStyle>('FORMAL');

  // Edit states
  const [isEditingTheme, setIsEditingTheme] = useState<boolean>(false);
  const [isEditingInvitation, setIsEditingInvitation] = useState<boolean>(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load ideas on mount
  useEffect(() => {
    loadIdeas(false);
  }, [event.id]);

  const loadIdeas = async (forceRefresh: boolean) => {
    setLoading(true);
    setErrorDetails(null);

    const payload = {
      title: event.title,
      eventType: event.eventType,
      date: event.date,
      totalBudget: event.totalBudget,
      guestCount: event.estimatedGuests,
      location: event.locationName || event.locationAddress || 'Private Venue',
      theme: event.themeAesthetic,
      vibeOrTheme: event.themeAesthetic,
      preferences: event.specialPreferences,
      specialPreferences: event.specialPreferences,
      dietaryNeeds: event.dietaryNeeds || [],
      accessibilityNeeds: event.accessibilityNeeds || [],
      currency: event.currency || 'USD',
    };

    try {
      const data = await api.fetchCreativeIdeas(payload, forceRefresh, event.id);
      setIdeas(data);
      setIsCached(!forceRefresh && !!data._cachedAt);
    } catch (err: any) {
      console.error('Failed to fetch creative ideas:', err);
      const parsed = parseAiPlanError(err);
      setErrorDetails(parsed);
    } finally {
      setLoading(false);
    }
  };

  const handleUseOfflineDemo = () => {
    const demo = generateOfflineDemoCreativeIdeas({
      title: event.title,
      eventType: event.eventType,
      date: event.date,
      totalBudget: event.totalBudget,
      guestCount: event.estimatedGuests,
      location: event.locationName,
      theme: event.themeAesthetic,
      dietaryNeeds: event.dietaryNeeds,
      accessibilityNeeds: event.accessibilityNeeds,
      currency: event.currency,
    });
    setIdeas(demo);
    setErrorDetails(null);
    setIsCached(false);
    info('Offline Demo Loaded', 'Displaying sample creative baseline.');
  };

  const copyToClipboard = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(key);
    success(`${label} Copied`, 'Copied formatted text to clipboard.');
    setTimeout(() => {
      setCopiedItem(null);
    }, 2500);
  };

  const handleSaveAllIdeas = async () => {
    if (!ideas) return;
    setIsSaving(true);
    try {
      await api.saveCreativeIdeas(event.id, ideas);
      success('Ideas Saved', 'Your custom creative pack has been saved to this celebration.');
      onRefreshEvent();
    } catch (err: any) {
      error('Failed to Save', err.message || 'Could not save ideas to storage.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyTheme = async (theme: ThemeIdea) => {
    try {
      const activePalette = ideas?.palettes[0]?.colors.map(c => c.hex) || [];
      await api.applyCreativeTheme(event.id, {
        title: theme.title.replace('[Demo Template] ', ''),
        colorPalette: activePalette.length > 0 ? activePalette : undefined,
      });
      success('Theme Applied', `"${theme.title}" is now the active celebration theme.`);
      onRefreshEvent();
    } catch (err: any) {
      error('Could not apply theme', err.message);
    }
  };

  const handleApplyPalette = async (palette: ColorPaletteIdea) => {
    try {
      const hexList = palette.colors.map(c => c.hex);
      await api.applyCreativePalette(event.id, hexList);
      success('Palette Applied', `"${palette.name}" colors applied to event.`);
      onRefreshEvent();
    } catch (err: any) {
      error('Could not apply palette', err.message);
    }
  };

  const handleSaveInvitationToNotes = async (invitation: InvitationWording) => {
    try {
      const fullWording = `${invitation.headline}\n\n${invitation.bodyText}\n\nRSVP: ${invitation.rsvpNote}`;
      await api.saveInvitationWording(event.id, invitation.styleLabel, fullWording);
      success('Invitation Saved', `Saved ${invitation.styleLabel} wording to event notes.`);
      onRefreshEvent();
    } catch (err: any) {
      error('Could not save wording', err.message);
    }
  };

  const handleAddActivityAsTask = async (activity: ActivityIdea) => {
    try {
      await api.addCreativeActivityAsTask(event.id, {
        title: `Coordinate: ${activity.title}`,
        description: `${activity.description} | Budget Alternative: ${activity.budgetAlternative} | Inclusivity: ${activity.inclusivityConsiderations}`,
        duration: activity.duration,
      });
      success('Activity Added', `Created a planning task for "${activity.title}".`);
      onRefreshEvent();
    } catch (err: any) {
      error('Could not create task', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-ivory-200/90 shadow-soft p-6 sm:p-7 relative overflow-hidden border-t-4 border-t-gold-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-xl bg-gold-50 text-gold-700 border border-gold-200">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-gold-800">
                Inspiration & Creative Studio
              </span>

              {isCached && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-ivory-100 text-slate-700 border border-ivory-300">
                  <Clock className="w-3 h-3 text-gold-600" />
                  Cached (Inputs Unchanged)
                </span>
              )}

              {ideas?._source === 'OFFLINE_DEMO' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                  Offline Demo Mode
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black font-serif text-plum-950">
              Personalized Themes, Wording & Experiences
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl font-sans">
              Tailored to {event.title} • {event.estimatedGuests} Guests • {formatCurrency(event.totalBudget, event.currency)} Budget. 
              Respectful, budget-aware, and culturally inclusive without assumptions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadIdeas(true)}
              disabled={loading}
              leftIcon={<RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />}
            >
              {loading ? 'Synthesizing...' : 'Regenerate'}
            </Button>

            {ideas && (
              <Button
                variant="plum"
                size="sm"
                onClick={handleSaveAllIdeas}
                disabled={isSaving}
                leftIcon={<Save className="w-3.5 h-3.5 text-gold-400" />}
              >
                {isSaving ? 'Saving...' : 'Save All Ideas'}
              </Button>
            )}
          </div>
        </div>

        {/* Event Context Pill Bar */}
        <div className="mt-4 pt-4 border-t border-ivory-200 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Context:
          </span>
          <span className="bg-ivory-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-ivory-200 font-medium">
            Type: {event.eventType}
          </span>
          <span className="bg-ivory-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-ivory-200 font-medium">
            Date: {formatDate(event.date)}
          </span>
          {event.locationName && (
            <span className="bg-ivory-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-ivory-200 font-medium">
              Venue: {event.locationName}
            </span>
          )}
          {event.dietaryNeeds?.map((d, i) => (
            <span key={i} className="bg-plum-50 text-plum-900 px-2.5 py-0.5 rounded-full border border-plum-200 font-medium">
              Diet: {d}
            </span>
          ))}
          {event.accessibilityNeeds?.map((a, i) => (
            <span key={i} className="bg-gold-50 text-gold-900 px-2.5 py-0.5 rounded-full border border-gold-300 font-medium">
              Access: {a}
            </span>
          ))}
        </div>
      </div>

      {/* Cultural Inclusivity & Respect Banner */}
      <div className="bg-ivory-50 border border-gold-300/60 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
        <HeartHandshake className="w-5 h-5 text-gold-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-plum-950 font-serif">
            Inclusive & Non-Presumptive Celebration Design
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            EverFest generates concepts focused on gratitude, community, milestones, and joy without presuming any specific religion, ethnicity, or dogmatic traditions. All mocktail offerings, sensory-conscious nooks, and dietary accommodations are treated with equal prestige.
          </p>
        </div>
      </div>

      {/* Section Navigation Pills */}
      <div className="flex border-b border-ivory-300 gap-2 sm:gap-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSection('themes')}
          className={cn(
            'pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap',
            activeSection === 'themes'
              ? 'border-plum-800 text-plum-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Palette className="w-4 h-4 text-gold-600" />
          <span>Themes & Aesthetics</span>
        </button>

        <button
          onClick={() => setActiveSection('palettes')}
          className={cn(
            'pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap',
            activeSection === 'palettes'
              ? 'border-plum-800 text-plum-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Layers className="w-4 h-4 text-gold-600" />
          <span>Color Palettes</span>
        </button>

        <button
          onClick={() => setActiveSection('invitations')}
          className={cn(
            'pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap',
            activeSection === 'invitations'
              ? 'border-plum-800 text-plum-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Mail className="w-4 h-4 text-gold-600" />
          <span>Invitation Wording</span>
        </button>

        <button
          onClick={() => setActiveSection('activities')}
          className={cn(
            'pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap',
            activeSection === 'activities'
              ? 'border-plum-800 text-plum-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Gamepad2 className="w-4 h-4 text-gold-600" />
          <span>Activities & Moments</span>
        </button>

        <button
          onClick={() => setActiveSection('menu')}
          className={cn(
            'pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap',
            activeSection === 'menu'
              ? 'border-plum-800 text-plum-950'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Utensils className="w-4 h-4 text-gold-600" />
          <span>Menu & Mocktails</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4 py-8">
          <div className="p-6 bg-white rounded-3xl border border-ivory-200 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-gold-600 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-plum-950 font-serif">
              Crafting Personalized Celebration Inspiration...
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Analyzing guest count, budget ceilings, dietary accommodations, and aesthetic vibe to generate inclusive, multi-tier options.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && errorDetails && (
        <div className="p-6 bg-white rounded-3xl border border-rose-200 shadow-soft space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                {errorDetails.title || 'Creative Studio Unavailable'}
              </h3>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                {errorDetails.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {errorDetails.canRetry && (
              <Button
                variant="plum"
                size="sm"
                onClick={() => loadIdeas(true)}
              >
                Retry Live Request
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleUseOfflineDemo}
            >
              Use Offline Demo Inspiration
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorDetails && !ideas && (
        <EmptyState
          icon={<Sparkles className="w-8 h-8 text-gold-600" />}
          title="Creative Inspiration Studio"
          description="Generate personalized themes, color palettes, multi-style invitation wording, inclusive activities, and menu concepts with budget alternatives."
          actionLabel="Generate Creative Ideas"
          onAction={() => loadIdeas(true)}
        />
      )}

      {/* Content Renderers */}
      {!loading && ideas && (
        <div className="space-y-6">
          
          {/* 1. THEMES & AESTHETICS */}
          {activeSection === 'themes' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ideas.themes.map((theme, idx) => (
                  <div 
                    key={idx}
                    className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft flex flex-col justify-between space-y-5 border-t-2 border-t-gold-500/40"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full border border-gold-200 uppercase tracking-wider">
                            {idx === 0 ? 'Primary Concept' : 'Design Alternative'}
                          </span>
                          <h3 className="text-lg font-bold text-plum-950 font-serif mt-1.5">
                            {theme.title}
                          </h3>
                        </div>

                        <button
                          onClick={() => copyToClipboard(
                            `${theme.title}\n\nConcept:\n${theme.concept}\n\nDecor Motifs:\n${theme.decorMotifs.join('\n- ')}\n\nAmbiance:\n${theme.lightingAndAmbiance}`,
                            'Theme Concept',
                            `theme-${idx}`
                          )}
                          title="Copy theme concept"
                          className="p-2 text-slate-400 hover:text-plum-800 hover:bg-ivory-100 rounded-xl transition-colors"
                        >
                          {copiedItem === `theme-${idx}` ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        {theme.concept}
                      </p>

                      {/* Decor Motifs Chips */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Decor & Styling Motifs
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {theme.decorMotifs.map((motif, mIdx) => (
                            <span 
                              key={mIdx}
                              className="text-[11px] font-medium bg-ivory-100 text-slate-800 px-2.5 py-1 rounded-xl border border-ivory-200"
                            >
                              {motif}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Lighting and Ambiance */}
                      <div className="p-3 bg-ivory-50 rounded-2xl border border-ivory-200/80">
                        <span className="text-[10px] font-bold text-gold-800 uppercase tracking-wider block mb-1">
                          Lighting & Ambiance
                        </span>
                        <p className="text-xs text-slate-600 font-sans">
                          {theme.lightingAndAmbiance}
                        </p>
                      </div>

                      {/* Budget Alternatives: Luxe vs Cost-Smart */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-plum-50/50 rounded-2xl border border-plum-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-plum-900 uppercase">Luxe Vision</span>
                            <span className="text-[10px] font-semibold text-plum-700">{theme.budgetAlternatives.luxe.estCostRange}</span>
                          </div>
                          <p className="text-xs font-bold text-plum-950 mt-1">{theme.budgetAlternatives.luxe.title}</p>
                          <p className="text-[11px] text-slate-600 mt-1 leading-normal">{theme.budgetAlternatives.luxe.description}</p>
                        </div>

                        <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-900 uppercase">Cost-Smart Choice</span>
                            <span className="text-[10px] font-semibold text-emerald-700">{theme.budgetAlternatives.costSmart.estCostRange}</span>
                          </div>
                          <p className="text-xs font-bold text-emerald-950 mt-1">{theme.budgetAlternatives.costSmart.title}</p>
                          <p className="text-[11px] text-slate-600 mt-1 leading-normal">{theme.budgetAlternatives.costSmart.description}</p>
                        </div>
                      </div>

                      {/* Inclusivity Note */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-gold-600 flex-shrink-0" />
                        <span>{theme.inclusivityNote}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-ivory-200 flex items-center justify-between">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleApplyTheme(theme)}
                        leftIcon={<Check className="w-3.5 h-3.5 text-gold-600" />}
                      >
                        Apply Theme to Celebration
                      </Button>
                      <span className="text-[11px] text-slate-400">Updates event banner & notes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. COLOR PALETTES */}
          {activeSection === 'palettes' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ideas.palettes.map((palette, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-gold-700 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-200 uppercase tracking-wider">
                          Palette {pIdx + 1}
                        </span>
                        <h3 className="text-lg font-bold text-plum-950 font-serif mt-1.5">
                          {palette.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => copyToClipboard(
                            palette.colors.map(c => `${c.name}: ${c.hex}`).join(', '),
                            'Hex Palette',
                            `palette-${pIdx}`
                          )}
                          leftIcon={copiedItem === `palette-${pIdx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        >
                          Copy Hex Codes
                        </Button>
                      </div>
                    </div>

                    {/* Color Swatches Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {palette.colors.map((c, cIdx) => (
                        <div 
                          key={cIdx}
                          onClick={() => copyToClipboard(c.hex, c.name, `color-${pIdx}-${cIdx}`)}
                          className="group cursor-pointer p-2.5 rounded-2xl bg-ivory-50 border border-ivory-200 hover:border-gold-400 transition-all text-center flex flex-col items-center justify-between"
                        >
                          <div 
                            className="w-12 h-12 rounded-xl shadow-inner mb-2 border border-black/10 group-hover:scale-105 transition-transform relative flex items-center justify-center"
                            style={{ backgroundColor: c.hex }}
                          >
                            {copiedItem === `color-${pIdx}-${cIdx}` && (
                              <Check className="w-4 h-4 text-white drop-shadow" />
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 line-clamp-1">{c.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">{c.hex}</span>
                          <span className="text-[9px] text-slate-400 capitalize">{c.role}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-ivory-50 rounded-2xl border border-ivory-200">
                      <span className="text-[10px] font-bold text-gold-800 uppercase tracking-wider block mb-1">
                        Styling Guidance
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        {palette.notes}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleApplyPalette(palette)}
                        leftIcon={<Check className="w-3.5 h-3.5 text-gold-600" />}
                      >
                        Apply Palette to Event
                      </Button>
                      <span className="text-[11px] text-slate-400">Click any swatch to copy individual hex</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. INVITATION WORDING */}
          {activeSection === 'invitations' && (
            <div className="space-y-6">
              {/* Style selector pills */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-ivory-100 rounded-2xl border border-ivory-200">
                {ideas.invitations.map((inv) => (
                  <button
                    key={inv.style}
                    onClick={() => setSelectedInvitationStyle(inv.style)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                      selectedInvitationStyle === inv.style
                        ? 'bg-plum-800 text-white shadow-soft'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    )}
                  >
                    {inv.styleLabel}
                  </button>
                ))}
              </div>

              {/* Active Invitation Card */}
              {(() => {
                const activeInv = ideas.invitations.find(i => i.style === selectedInvitationStyle) || ideas.invitations[0];
                return (
                  <div className="p-8 bg-white rounded-3xl border border-ivory-200/90 shadow-elevated max-w-3xl mx-auto space-y-6 border-t-4 border-t-gold-500">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ivory-200 pb-4">
                      <div>
                        <span className="text-[10px] font-bold text-gold-700 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-200 uppercase tracking-wider">
                          {activeInv.styleLabel}
                        </span>
                        <h3 className="text-xl font-bold font-serif text-plum-950 mt-1">
                          Stationery & Digital Invitation Text
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => copyToClipboard(
                            `${activeInv.headline}\n\n${activeInv.bodyText}\n\nRSVP:\n${activeInv.rsvpNote}`,
                            'Invitation Wording',
                            'inv-wording'
                          )}
                          leftIcon={copiedItem === 'inv-wording' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        >
                          Copy Wording
                        </Button>

                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleSaveInvitationToNotes(activeInv)}
                          leftIcon={<Save className="w-3.5 h-3.5 text-gold-600" />}
                        >
                          Save to Event Notes
                        </Button>
                      </div>
                    </div>

                    {/* Invitation Preview Frame */}
                    <div className="p-8 bg-ivory-50 rounded-2xl border border-ivory-300/80 shadow-inner space-y-4 text-center font-serif">
                      <p className="text-xs tracking-widest uppercase text-gold-800 font-sans font-bold">
                        {activeInv.headline}
                      </p>
                      
                      <div className="w-12 h-0.5 bg-gold-400 mx-auto" />

                      <div className="text-sm sm:text-base text-slate-800 leading-loose whitespace-pre-line max-w-xl mx-auto">
                        {activeInv.bodyText}
                      </div>

                      <div className="w-12 h-0.5 bg-gold-400 mx-auto mt-6" />

                      <p className="text-xs text-slate-600 font-sans italic pt-2">
                        {activeInv.rsvpNote}
                      </p>
                    </div>

                    {/* Inclusivity Feature Highlight */}
                    <div className="p-3 bg-plum-50/50 rounded-2xl border border-plum-100 flex items-center gap-2.5 text-xs text-plum-950 font-sans">
                      <HeartHandshake className="w-4 h-4 text-plum-700 flex-shrink-0" />
                      <span><strong>Hospitality Note:</strong> {activeInv.inclusivityHighlight}</span>
                    </div>

                  </div>
                );
              })()}
            </div>
          )}

          {/* 4. ACTIVITIES & MOMENTS */}
          {activeSection === 'activities' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ideas.activities.map((act, aIdx) => (
                  <div
                    key={aIdx}
                    className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-plum-800 bg-plum-50 px-2.5 py-0.5 rounded-full border border-plum-200 uppercase">
                            {act.category.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-ivory-100 px-2 py-0.5 rounded-full border border-ivory-200">
                            {act.duration}
                          </span>
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            act.budgetTier === 'LOW_COST_DIY' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            act.budgetTier === 'MODERATE' ? 'bg-gold-50 text-gold-900 border-gold-300' :
                            'bg-plum-50 text-plum-900 border-plum-200'
                          )}>
                            {act.budgetTier.replace('_', ' ')}
                          </span>
                        </div>

                        <button
                          onClick={() => copyToClipboard(
                            `${act.title} (${act.duration})\n\n${act.description}\n\nBudget Alternative:\n${act.budgetAlternative}\n\nInclusivity:\n${act.inclusivityConsiderations}`,
                            'Activity',
                            `act-${aIdx}`
                          )}
                          title="Copy activity details"
                          className="p-1.5 text-slate-400 hover:text-plum-800 rounded-lg hover:bg-ivory-100 transition-colors"
                        >
                          {copiedItem === `act-${aIdx}` ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-plum-950 font-serif">
                        {act.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        {act.description}
                      </p>

                      <div className="p-3 bg-ivory-50 rounded-2xl border border-ivory-200 text-xs space-y-1.5 font-sans">
                        <div>
                          <span className="font-bold text-slate-800 block text-[10px] uppercase text-gold-800">
                            Budget Alternative:
                          </span>
                          <span className="text-slate-600 text-[11px]">{act.budgetAlternative}</span>
                        </div>
                        <div className="pt-1 border-t border-ivory-200">
                          <span className="font-bold text-slate-800 block text-[10px] uppercase text-emerald-800">
                            Inclusivity & Mobility:
                          </span>
                          <span className="text-slate-600 text-[11px]">{act.inclusivityConsiderations}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-ivory-200 flex items-center justify-between">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleAddActivityAsTask(act)}
                        leftIcon={<Plus className="w-3.5 h-3.5 text-gold-600" />}
                      >
                        Add to Tasks / Run of Show
                      </Button>
                      <span className="text-[11px] text-slate-400">Creates planning task</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. MENU & MOCKTAILS */}
          {activeSection === 'menu' && (
            <div className="space-y-6">
              
              {/* Beverage & Mocktail Parity */}
              <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GlassWater className="w-5 h-5 text-gold-700" />
                    <h3 className="text-base font-bold font-serif text-plum-950">
                      Beverage Concepts & Signature Mocktail Parity
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    50/50 Zero-Proof Craft Parity
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ideas.menu.beverages.map((bev, bIdx) => (
                    <div 
                      key={bIdx}
                      className="p-4 rounded-2xl bg-ivory-50 border border-ivory-200 flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                            bev.isNonAlcoholic 
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                              : 'bg-plum-100 text-plum-900 border border-plum-300'
                          )}>
                            {bev.isNonAlcoholic ? 'Zero-Proof / Mocktail' : 'Cocktail'}
                          </span>
                          <span className="text-[10px] text-slate-400">{bev.type.replace('_', ' ')}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 font-serif">{bev.name}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 font-sans">{bev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Culinary Course Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Appetizers */}
                <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft space-y-4">
                  <span className="text-[10px] font-bold text-gold-700 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-200 uppercase tracking-wider">
                    Course 1: Canapés & Starters
                  </span>
                  <div className="space-y-3">
                    {ideas.menu.appetizers.map((app, i) => (
                      <div key={i} className="p-3 bg-ivory-50 rounded-2xl border border-ivory-200">
                        <h4 className="text-xs font-bold text-slate-900 font-serif">{app.name}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-normal font-sans">{app.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {app.dietaryFlags.map((flag, fIdx) => (
                            <span key={fIdx} className="text-[9px] font-bold bg-white text-plum-900 px-2 py-0.5 rounded-full border border-ivory-300">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mains */}
                <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft space-y-4">
                  <span className="text-[10px] font-bold text-gold-700 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-200 uppercase tracking-wider">
                    Course 2: Mains & Entrées
                  </span>
                  <div className="space-y-3">
                    {ideas.menu.mains.map((main, i) => (
                      <div key={i} className="p-3 bg-ivory-50 rounded-2xl border border-ivory-200">
                        <h4 className="text-xs font-bold text-slate-900 font-serif">{main.name}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-normal font-sans">{main.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {main.dietaryFlags.map((flag, fIdx) => (
                            <span key={fIdx} className="text-[9px] font-bold bg-white text-emerald-900 px-2 py-0.5 rounded-full border border-ivory-300">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desserts */}
                <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft space-y-4">
                  <span className="text-[10px] font-bold text-gold-700 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-200 uppercase tracking-wider">
                    Course 3: Sweet Confections
                  </span>
                  <div className="space-y-3">
                    {ideas.menu.desserts.map((dessert, i) => (
                      <div key={i} className="p-3 bg-ivory-50 rounded-2xl border border-ivory-200">
                        <h4 className="text-xs font-bold text-slate-900 font-serif">{dessert.name}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-normal font-sans">{dessert.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {dessert.dietaryFlags.map((flag, fIdx) => (
                            <span key={fIdx} className="text-[9px] font-bold bg-white text-plum-900 px-2 py-0.5 rounded-full border border-ivory-300">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Catering Budget Alternatives & Inclusivity */}
              <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Catering Service Alternatives & Inclusivity Notes
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-plum-50/50 rounded-2xl border border-plum-100">
                    <span className="text-[10px] font-bold text-plum-900 uppercase">Luxe Service Style</span>
                    <p className="text-xs text-slate-700 mt-1 font-sans">{ideas.menu.budgetAlternatives.luxeStyle}</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase">Cost-Smart Service Style</span>
                    <p className="text-xs text-slate-700 mt-1 font-sans">{ideas.menu.budgetAlternatives.costSmartStyle}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-1 font-sans">
                  <strong>Hospitality & Allergen Isolation:</strong> {ideas.menu.inclusivityNotes}
                </p>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
