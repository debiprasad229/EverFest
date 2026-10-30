import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Calendar, 
  Printer, 
  LayoutDashboard, 
  Menu, 
  X, 
  ChevronRight,
  ShieldCheck,
  Share2,
  Bell
} from 'lucide-react';
import { Event } from '../../types/index.js';
import { Button } from './Button.js';
import { useToast } from './ToastContext.js';
import { cn } from '../../utils/cn.js';

interface NavbarProps {
  events: Event[];
  activeEvent: Event | null;
  onSelectEvent: (event: Event) => void;
  onOpenCreateModal: () => void;
  isPrintView: boolean;
  onTogglePrintView: () => void;
  onBackToDashboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  events,
  activeEvent,
  onSelectEvent,
  onOpenCreateModal,
  isPrintView,
  onTogglePrintView,
  onBackToDashboard,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { comingSoon } = useToast();

  // Close mobile menu on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock scroll when drawer open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-ivory-50/90 backdrop-blur-md border-b border-ivory-200/90 transition-all print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          
          {/* Brand Identity & Desktop Selector */}
          <div className="flex items-center gap-5 sm:gap-6">
            <button 
              onClick={onBackToDashboard}
              aria-label="EverFest Home Dashboard"
              className="flex items-center gap-3 group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-xl p-1"
            >
              <div className="w-10 h-10 rounded-xl bg-plum-800 border border-gold-500/30 flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-5 h-5 text-gold-400 fill-gold-400/20" />
              </div>
              <div>
                <span className="text-xl font-bold font-serif tracking-tight text-plum-950 group-hover:text-plum-800 transition-colors">
                  EverFest
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-gold-100/80 text-gold-800 border border-gold-300/80">
                  SaaS
                </span>
              </div>
            </button>

            {/* Desktop Quick Switcher (when inside an event) */}
            {activeEvent && (
              <div className="hidden lg:flex items-center gap-2 border-l border-ivory-300 pl-5">
                <Calendar className="w-4 h-4 text-plum-700" />
                <label htmlFor="desktop-event-select" className="sr-only">Choose active celebration</label>
                <select
                  id="desktop-event-select"
                  value={activeEvent.id}
                  onChange={(e) => {
                    const selected = events.find(ev => ev.id === e.target.value);
                    if (selected) onSelectEvent(selected);
                  }}
                  className="bg-ivory-100/70 border border-ivory-300/80 font-medium text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 rounded-lg py-1.5 px-2.5 cursor-pointer hover:border-ivory-400 transition-colors"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.eventType})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Desktop Action Controls */}
          <div className="hidden md:flex items-center gap-2.5">
            {activeEvent && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToDashboard}
                  leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}
                >
                  All Events
                </Button>

                {/* Auxiliary SaaS Controls with Accessible Notifications */}
                <button
                  type="button"
                  onClick={() => comingSoon('Collaborator Sharing', 'Share event blueprints and schedules with co-hosts and committee members.')}
                  title="Collaborator Sharing"
                  className="p-2 text-slate-600 hover:text-plum-800 hover:bg-ivory-200/80 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => comingSoon('Milestone Alerts', 'Automated email and SMS alerts for upcoming contract deposits and run-of-show milestones.')}
                  title="Milestone Notifications"
                  className="p-2 text-slate-600 hover:text-plum-800 hover:bg-ivory-200/80 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                  <Bell className="w-4 h-4" />
                </button>

                <Button
                  variant={isPrintView ? 'plum' : 'secondary'}
                  size="sm"
                  onClick={onTogglePrintView}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  {isPrintView ? 'Exit Print View' : 'Print Brief'}
                </Button>
              </>
            )}

            <Button
              variant="plum"
              size="sm"
              onClick={onOpenCreateModal}
              leftIcon={<Plus className="w-4 h-4 text-gold-400" />}
            >
              New Celebration
            </Button>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="plum"
              size="xs"
              onClick={onOpenCreateModal}
              leftIcon={<Plus className="w-3 h-3 text-gold-400" />}
            >
              New
            </Button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              aria-expanded={mobileMenuOpen}
              className="p-2 rounded-xl text-slate-700 hover:bg-ivory-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-plum-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <nav 
            aria-label="Mobile Navigation"
            className="relative ml-auto w-full max-w-xs bg-ivory-50 h-full shadow-elevated border-l border-ivory-300 flex flex-col justify-between p-6 z-10 overflow-y-auto"
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-ivory-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-plum-800 flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4 text-gold-400" />
                  </div>
                  <span className="font-serif font-bold text-lg text-slate-900">EverFest</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation drawer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-ivory-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onBackToDashboard();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-ivory-200 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-plum-800" />
                    <span>All Celebrations</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {activeEvent && (
                  <button
                    onClick={() => {
                      onTogglePrintView();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-ivory-200 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-plum-800" />
                      <span>{isPrintView ? 'Exit Print View' : 'Print / Export Brief'}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Celebration List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Your Celebrations ({events.length})
                </span>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {events.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => {
                        onSelectEvent(ev);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        'w-full text-left p-3 rounded-xl text-xs transition-colors border',
                        activeEvent?.id === ev.id
                          ? 'bg-plum-50 border-plum-200 font-bold text-plum-900'
                          : 'bg-white border-ivory-200 text-slate-700 hover:bg-ivory-100'
                      )}
                    >
                      <span className="block truncate">{ev.title}</span>
                      <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">
                        {ev.eventType} • {ev.date}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Action */}
            <div className="pt-4 border-t border-ivory-200 space-y-2">
              <Button
                variant="plum"
                size="md"
                className="w-full"
                onClick={() => {
                  onOpenCreateModal();
                  setMobileMenuOpen(false);
                }}
                leftIcon={<Plus className="w-4 h-4 text-gold-400" />}
              >
                New Celebration
              </Button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
};
