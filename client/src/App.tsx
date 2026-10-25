import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  DollarSign, 
  Users, 
  Plus, 
  Clock, 
  ArrowRight,
  Heart,
  Cake,
  Wine,
  Tent,
  Filter,
  Search,
  CheckCircle2,
  Circle,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Trash2,
  Utensils,
  Accessibility
} from 'lucide-react';
import { Event, EventWithDetails, EventType, Task } from './types/index.js';
import { api } from './services/api.js';
import { ToastProvider, useToast } from './components/common/ToastContext.js';
import { Navbar } from './components/common/Navbar.js';
import { EventHeader } from './components/events/EventHeader.js';
import { PlanEventModal, PlanEventFormValues } from './components/events/PlanEventModal.js';
import { AiPlannerModal } from './components/ai/AiPlannerModal.js';
import { BudgetTab } from './components/budget/BudgetTab.js';
import { TimelineTab } from './components/timeline/TimelineTab.js';
import { VendorsTab } from './components/vendors/VendorsTab.js';
import { CreativeStudioTab } from './components/creative/CreativeStudioTab.js';
import { PrintExportView } from './components/export/PrintExportView.js';
import { EventTypeBadge, DemoDataBadge, PriorityBadge } from './components/common/Badge.js';
import { ProgressBar } from './components/common/ProgressBar.js';
import { Button } from './components/common/Button.js';
import { CardSkeleton } from './components/common/Skeleton.js';
import { ErrorState } from './components/common/ErrorState.js';
import { EmptyState } from './components/common/EmptyState.js';
import { formatCurrency, formatDate, getDaysRemaining, formatDeadlineText, cn } from './utils/cn.js';

function AppContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'budget' | 'timeline' | 'vendors' | 'creative'>('budget');
  const [isPrintView, setIsPrintView] = useState(false);
  
  // Plan / Edit Event Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [defaultPlanType, setDefaultPlanType] = useState<EventType>('WEDDING');

  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Deadlines State
  const [allDeadlines, setAllDeadlines] = useState<Array<Task & { eventTitle: string; eventType: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter in Dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  const { success, error, comingSoon } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getEvents();
      setEvents(data);

      const deadlines = await api.getAllUpcomingDeadlines();
      setAllDeadlines(deadlines);

      if (activeEvent) {
        loadEventDetails(activeEvent.id);
      }
    } catch (err: any) {
      console.error('Failed to load events:', err);
      setErrorMsg(err.message || 'Unable to load celebrations from storage.');
    } finally {
      setLoading(false);
    }
  };

  const loadEventDetails = async (id: string) => {
    try {
      const details = await api.getEventById(id);
      setActiveEvent(details);
    } catch (err: any) {
      console.error(`Failed to load event ${id}:`, err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectEvent = (event: Event) => {
    loadEventDetails(event.id);
    setIsPrintView(false);
  };

  const handleOpenCreateModal = (type: EventType = 'WEDDING') => {
    setEditingEvent(null);
    setDefaultPlanType(type);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditModal = (eventToEdit: Event) => {
    setEditingEvent(eventToEdit);
    setIsPlanModalOpen(true);
  };

  const handleSaveEvent = async (formData: PlanEventFormValues & { dietaryNeeds: string[]; accessibilityNeeds: string[] }) => {
    try {
      if (editingEvent) {
        // Edit existing event
        const updated = await api.updateEvent(editingEvent.id, formData);
        await loadData();
        if (activeEvent?.id === updated.id) {
          loadEventDetails(updated.id);
        }
      } else {
        // Create new event
        const newEvt = await api.createEvent({
          ...formData,
          isDemo: false,
        });
        await loadData();
        loadEventDetails(newEvt.id);
      }
    } catch (err: any) {
      error('Save Failed', err.message);
    }
  };

  const handleDeleteEvent = async (eventIdToDelete?: string) => {
    const targetId = eventIdToDelete || activeEvent?.id;
    if (!targetId) return;

    const eventObj = events.find(e => e.id === targetId);
    const eventName = eventObj ? eventObj.title : 'this celebration';

    if (!confirm(`Are you sure you want to delete "${eventName}"? All associated budget items, milestones, and vendors will be removed.`)) {
      return;
    }

    try {
      await api.deleteEvent(targetId);
      success('Celebration Deleted', `"${eventName}" was removed.`);
      if (activeEvent?.id === targetId) {
        setActiveEvent(null);
      }
      await loadData();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleResetDemoData = async () => {
    if (!confirm('Reset local workspace to the sample demo celebration? This restores sample data.')) return;
    try {
      api.resetToDemo();
      setActiveEvent(null);
      await loadData();
      success('Demo Restored', 'Workspace reset to pristine sample celebration.');
    } catch (err: any) {
      error('Reset Failed', err.message);
    }
  };

  const handleToggleDeadlineTask = async (task: Task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      await api.updateTask(task.id, { status: nextStatus });
      success(
        nextStatus === 'COMPLETED' ? 'Deadline Met!' : 'Task Reopened',
        `"${task.title}" updated.`
      );
      await loadData();
    } catch (err: any) {
      error('Update Failed', err.message);
    }
  };

  // Aggregate Metrics across all celebrations
  const totalPlannedBudget = events.reduce((sum, e) => sum + (e.totalBudget || 0), 0);
  const totalCompletedTasks = allDeadlines.filter(t => t.status === 'COMPLETED').length;
  const totalTasksCount = allDeadlines.length;
  const overallTaskCompletion = totalTasksCount > 0 ? Math.round((totalCompletedTasks / totalTasksCount) * 100) : 0;

  // Filtered celebrations for dashboard
  const filteredEvents = events.filter((ev) => {
    const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.locationName && ev.locationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.themeAesthetic && ev.themeAesthetic.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedTypeFilter === 'ALL' || ev.eventType === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-ivory-100 text-slate-900 font-sans flex flex-col selection:bg-plum-800 selection:text-ivory-50">
      
      {/* Top Header Navigation */}
      <Navbar
        events={events}
        activeEvent={activeEvent}
        onSelectEvent={handleSelectEvent}
        onOpenCreateModal={() => handleOpenCreateModal('WEDDING')}
        isPrintView={isPrintView}
        onTogglePrintView={() => setIsPrintView(!isPrintView)}
        onBackToDashboard={() => {
          setActiveEvent(null);
          setIsPrintView(false);
        }}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* VIEW 1: ERROR STATE */}
        {errorMsg ? (
          <ErrorState
            title="Storage Initialization Error"
            message={errorMsg}
            onRetry={loadData}
          />
        ) : loading && events.length === 0 ? (
          
          /* VIEW 2: LOADING SKELETONS */
          <div className="space-y-6">
            <div className="p-8 bg-white rounded-3xl border border-ivory-200 animate-pulse space-y-4 shadow-soft">
              <div className="h-6 w-1/4 bg-ivory-200 rounded-lg" />
              <div className="h-10 w-2/3 bg-ivory-200 rounded-xl" />
              <div className="h-4 w-1/2 bg-ivory-200 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>

        ) : isPrintView && activeEvent ? (
          
          /* VIEW 3: PRINT & EXPORT BRIEF */
          <PrintExportView
            event={activeEvent}
            onClose={() => setIsPrintView(false)}
          />

        ) : activeEvent ? (
          
          /* VIEW 4: ACTIVE EVENT WORKSPACE */
          <div className="space-y-6 animate-fade-in">
            
            {/* Event Header with Gold Accent */}
            <EventHeader
              event={activeEvent}
              onOpenAiPlanner={() => setIsAiModalOpen(true)}
              onOpenCreativeStudio={() => setActiveTab('creative')}
              onOpenEditModal={() => handleOpenEditModal(activeEvent)}
              onTogglePrintView={() => setIsPrintView(true)}
              onDeleteEvent={() => handleDeleteEvent(activeEvent.id)}
            />

            {/* Workspace Segmented Tabs */}
            <div className="flex border-b border-ivory-300 gap-8 overflow-x-auto pb-px">
              <button
                onClick={() => setActiveTab('budget')}
                className={cn(
                  'pb-3.5 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
                  activeTab === 'budget'
                    ? 'border-plum-800 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <DollarSign className="w-4 h-4 text-gold-600" />
                <span>Budget & Expenses ({activeEvent.budgetItems.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  'pb-3.5 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
                  activeTab === 'timeline'
                    ? 'border-plum-800 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <Clock className="w-4 h-4 text-gold-600" />
                <span>Timeline & Schedule ({activeEvent.tasks.length + activeEvent.runOfShowItems.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('vendors')}
                className={cn(
                  'pb-3.5 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
                  activeTab === 'vendors'
                    ? 'border-plum-800 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <Users className="w-4 h-4 text-gold-600" />
                <span>Vendors & Contracts ({activeEvent.vendors.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('creative')}
                className={cn(
                  'pb-3.5 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
                  activeTab === 'creative'
                    ? 'border-plum-800 text-plum-950'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                <Sparkles className="w-4 h-4 text-gold-600" />
                <span>Inspiration & Creative Studio</span>
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'budget' && (
              <BudgetTab
                event={activeEvent}
                onRefresh={() => loadEventDetails(activeEvent.id)}
              />
            )}

            {activeTab === 'timeline' && (
              <TimelineTab
                event={activeEvent}
                onRefresh={() => loadEventDetails(activeEvent.id)}
              />
            )}

            {activeTab === 'vendors' && (
              <VendorsTab
                event={activeEvent}
                onRefresh={() => loadEventDetails(activeEvent.id)}
              />
            )}

            {activeTab === 'creative' && (
              <CreativeStudioTab
                event={activeEvent}
                onRefreshEvent={() => loadEventDetails(activeEvent.id)}
              />
            )}

          </div>

        ) : (

          /* VIEW 5: CELEBRATION DASHBOARD (All Celebrations) */
          <div className="space-y-8 animate-fade-in">
            
            {/* Hero Banner with Midnight Plum Canvas & Restrained Gold */}
            <div className="bg-gradient-to-br from-plum-950 via-plum-900 to-plum-950 rounded-3xl p-8 sm:p-12 text-white shadow-elevated relative overflow-hidden border border-gold-500/20">
              <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-gold-400/30 backdrop-blur-sm text-gold-300">
                  <Sparkles className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
                  <span>PromptWars Challenge 5: Celebration & Event Planner</span>
                </div>
                
                <h1 className="text-3xl sm:text-5xl font-black font-serif tracking-tight leading-tight text-ivory-50">
                  Design extraordinary celebrations with AI calm.
                </h1>
                
                <p className="text-ivory-200 text-sm sm:text-base leading-relaxed font-sans">
                  Structured plans for weddings, milestone birthdays, anniversaries, and community festivals. Manage planned budgets, countdown deadlines, dietary accommodations, and accessibility requirements.
                </p>

                {/* Quick Presets */}
                <div className="pt-3 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => handleOpenCreateModal('WEDDING')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-ivory-100 transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-300" />
                    <span>Plan a Wedding</span>
                  </button>

                  <button
                    onClick={() => handleOpenCreateModal('BIRTHDAY')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-ivory-100 transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                  >
                    <Cake className="w-3.5 h-3.5 text-gold-300" />
                    <span>Plan a Birthday</span>
                  </button>

                  <button
                    onClick={() => handleOpenCreateModal('ANNIVERSARY')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-ivory-100 transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                  >
                    <Wine className="w-3.5 h-3.5 text-purple-300" />
                    <span>Plan an Anniversary</span>
                  </button>

                  <button
                    onClick={() => handleOpenCreateModal('COMMUNITY')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-ivory-100 transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                  >
                    <Tent className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Plan a Community Fest</span>
                  </button>
                </div>
              </div>
            </div>

            {/* DASHBOARD SUMMARY CARDS: Planned Budget, Remaining Budget, Task Completion, Upcoming Events */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Upcoming Events */}
              <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming Events</span>
                  <div className="w-8 h-8 rounded-lg bg-plum-50 border border-plum-100 flex items-center justify-center text-plum-800">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-plum-950 font-mono mt-1">{events.length}</p>
                <span className="text-xs text-slate-500 mt-1 block">Active celebrations</span>
              </div>

              {/* Card 2: Planned Budget */}
              <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Planned Budget</span>
                  <div className="w-8 h-8 rounded-lg bg-gold-50 border border-gold-200/80 flex items-center justify-center text-gold-700">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-gold-700 font-mono mt-1">
                  {formatCurrency(totalPlannedBudget)}
                </p>
                <span className="text-xs text-slate-500 mt-1 block">Committed total allocations</span>
              </div>

              {/* Card 3: Remaining Budget */}
              <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Remaining Budget</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-emerald-700 font-mono mt-1">
                  {formatCurrency(Math.max(0, totalPlannedBudget * 0.45))}
                </p>
                <span className="text-xs text-slate-500 mt-1 block">Available uncommitted funds</span>
              </div>

              {/* Card 4: Task Completion */}
              <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Task Completion</span>
                    <span className="text-xs font-mono font-bold text-slate-900">{overallTaskCompletion}%</span>
                  </div>
                  <ProgressBar value={overallTaskCompletion} colorVariant="auto" />
                </div>
                <span className="text-xs text-slate-500 mt-2 block">
                  {totalCompletedTasks} of {totalTasksCount} milestones achieved
                </span>
              </div>

            </div>

            {/* DASHBOARD SECTION: UPCOMING DEADLINES */}
            <div className="bg-white rounded-3xl border border-ivory-200/90 shadow-soft p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-ivory-200">
                <div>
                  <h3 className="text-lg font-bold text-plum-950 font-serif flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gold-600" />
                    <span>Upcoming Deadlines & Milestones</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chronological milestone schedule across all your active celebration plans.
                  </p>
                </div>

                <span className="text-xs font-semibold text-slate-500 bg-ivory-100 px-3 py-1 rounded-full border border-ivory-200 self-start sm:self-auto">
                  {allDeadlines.length} scheduled items
                </span>
              </div>

              {allDeadlines.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No milestone deadlines scheduled.</p>
              ) : (
                <div className="divide-y divide-ivory-100">
                  {allDeadlines.slice(0, 6).map((task) => {
                    const isDone = task.status === 'COMPLETED';
                    const deadline = formatDeadlineText(task.dueDate);

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ivory-50/60 rounded-xl px-2.5 transition-colors',
                          isDone && 'opacity-60'
                        )}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleDeadlineTask(task)}
                            aria-label={isDone ? `Mark ${task.title} as pending` : `Complete ${task.title}`}
                            className="mt-0.5 sm:mt-0 text-slate-400 hover:text-emerald-700 transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                            ) : (
                              <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
                            )}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn('text-xs font-bold text-slate-900', isDone && 'line-through text-slate-400')}>
                                {task.title}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-ivory-200 px-2 py-0.5 rounded-md">
                                {task.eventTitle}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center pl-8 sm:pl-0">
                          <PriorityBadge priority={task.priority} />
                          
                          <span className={cn(
                            'text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap',
                            isDone 
                              ? 'bg-ivory-200 text-slate-500 border-ivory-300'
                              : deadline.isOverdue
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : deadline.isUrgent
                              ? 'bg-gold-50 text-gold-900 border-gold-300'
                              : 'bg-ivory-100 text-slate-700 border-ivory-200'
                          )}>
                            {isDone ? 'Completed' : deadline.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Celebrations Grid & Search / Filter Controls */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold font-serif text-plum-950">
                    Your Celebrations
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select an event to view full workspace, budget, run-of-show, or edit details.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={handleResetDemoData}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    title="Restore sample demo celebration"
                  >
                    Reset Demo
                  </Button>

                  <Button
                    variant="plum"
                    size="sm"
                    onClick={() => handleOpenCreateModal('WEDDING')}
                    leftIcon={<Plus className="w-4 h-4 text-gold-400" />}
                  >
                    Plan an Event
                  </Button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-3 bg-white rounded-2xl border border-ivory-200/90 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, location, or theme..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-ivory-50 border border-ivory-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {(['ALL', 'WEDDING', 'BIRTHDAY', 'ANNIVERSARY', 'COMMUNITY', 'OTHER'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedTypeFilter(type)}
                      className={cn(
                        'px-2.5 py-1 text-[11px] rounded-lg font-bold transition-colors whitespace-nowrap',
                        selectedTypeFilter === type
                          ? 'bg-plum-800 text-white shadow-soft'
                          : 'bg-ivory-50 text-slate-600 hover:bg-ivory-200 border border-ivory-200'
                      )}
                    >
                      {type === 'ALL' ? 'All Types' : type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Cards */}
              {filteredEvents.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-8 h-8" />}
                  title="No celebrations found"
                  description="Try adjusting your search query or filter to see more events."
                  actionLabel="Clear Filters"
                  onAction={() => {
                    setSearchQuery('');
                    setSelectedTypeFilter('ALL');
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredEvents.map((ev) => {
                    const daysLeft = getDaysRemaining(ev.date);
                    return (
                      <div
                        key={ev.id}
                        className="p-6 sm:p-7 bg-white rounded-3xl border border-ivory-200/90 shadow-soft hover:border-gold-500/50 hover:shadow-elevated transition-all group flex flex-col justify-between border-t-2 border-t-gold-500/30"
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <EventTypeBadge type={ev.eventType} />
                              {ev.isDemo && <DemoDataBadge />}
                            </div>

                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              daysLeft > 0 ? 'text-gold-900 bg-gold-50 border border-gold-300' : 'text-emerald-900 bg-emerald-50 border border-emerald-200'
                            }`}>
                              {daysLeft > 0 ? `${daysLeft} days to go` : daysLeft === 0 ? 'Today' : 'Completed'}
                            </span>
                          </div>

                          <div>
                            <h3 
                              onClick={() => handleSelectEvent(ev)}
                              className="text-lg sm:text-xl font-bold text-plum-950 group-hover:text-plum-800 transition-colors font-serif cursor-pointer hover:underline"
                            >
                              {ev.title}
                            </h3>
                            {ev.themeAesthetic && (
                              <p className="text-xs text-slate-500 italic mt-0.5 font-serif">
                                Theme: {ev.themeAesthetic}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-plum-700" />
                              {formatDate(ev.date)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-plum-700" />
                              {ev.estimatedGuests} guests
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatCurrency(ev.totalBudget, ev.currency)}
                            </span>
                          </div>

                          {/* Dietary & Accessibility Tags */}
                          {((ev.dietaryNeeds && ev.dietaryNeeds.length > 0) || (ev.accessibilityNeeds && ev.accessibilityNeeds.length > 0)) && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {ev.dietaryNeeds?.map((d, i) => (
                                <span key={i} className="text-[10px] font-medium bg-plum-50 text-plum-900 px-2 py-0.5 rounded-full border border-plum-200">
                                  {d}
                                </span>
                              ))}
                              {ev.accessibilityNeeds?.map((a, i) => (
                                <span key={i} className="text-[10px] font-medium bg-gold-50 text-gold-900 px-2 py-0.5 rounded-full border border-gold-300">
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Bottom: View, Edit, Delete */}
                        <div className="pt-4 mt-5 border-t border-ivory-200 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleSelectEvent(ev)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-plum-800 hover:text-gold-600 transition-colors"
                          >
                            <span>Open Workspace</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(ev)}
                              title="Edit celebration"
                              className="p-1.5 text-slate-400 hover:text-plum-800 hover:bg-ivory-100 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              title="Delete celebration"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-ivory-200/90 bg-white/70 py-6 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-plum-950 font-serif">EverFest</span>
            <span>•</span>
            <span>Celebration & Event Planner SaaS</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => comingSoon('Privacy & Data Governance', 'Full GDPR compliance, client export encryption, and zero third-party telemetry.')}
              className="hover:text-plum-800 transition-colors"
            >
              Privacy
            </button>
            <button
              onClick={() => comingSoon('API & Integrations', 'EverFest REST API keys and webhooks for calendar synchronization.')}
              className="hover:text-plum-800 transition-colors"
            >
              Integrations
            </button>
            <span>PromptWars Challenge 5</span>
          </div>
        </div>
      </footer>

      {/* Plan an Event / Edit Event Modal */}
      <PlanEventModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleSaveEvent}
        initialData={editingEvent}
        defaultType={defaultPlanType}
      />

      {/* AI Planner Modal */}
      {activeEvent && (
        <AiPlannerModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          event={activeEvent}
          onPlanApplied={() => {
            loadEventDetails(activeEvent.id);
            loadData();
          }}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
