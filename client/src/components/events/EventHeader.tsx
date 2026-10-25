import React from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Sparkles, 
  Trash2, 
  Clock, 
  Palette, 
  Printer, 
  Copy, 
  Edit3,
  Utensils,
  Accessibility
} from 'lucide-react';
import { EventWithDetails } from '../../types/index.js';
import { EventTypeBadge, DemoDataBadge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { useToast } from '../common/ToastContext.js';
import { formatCurrency, formatDate, getDaysRemaining } from '../../utils/cn.js';

interface EventHeaderProps {
  event: EventWithDetails;
  onOpenAiPlanner: () => void;
  onOpenCreativeStudio?: () => void;
  onOpenEditModal: () => void;
  onTogglePrintView: () => void;
  onDeleteEvent: () => void;
}

export const EventHeader: React.FC<EventHeaderProps> = ({
  event,
  onOpenAiPlanner,
  onOpenCreativeStudio,
  onOpenEditModal,
  onTogglePrintView,
  onDeleteEvent,
}) => {
  const daysLeft = getDaysRemaining(event.date);
  const { success } = useToast();

  const handleCopyPalette = () => {
    if (event.colorPalette && event.colorPalette.length > 0) {
      navigator.clipboard.writeText(event.colorPalette.join(', '));
      success('Color Palette Copied', 'Hex codes copied to clipboard.');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-ivory-200/90 shadow-soft p-6 sm:p-8 mb-6 relative overflow-hidden border-t-4 border-t-gold-500">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Title and Metadata */}
        <div className="space-y-3.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <EventTypeBadge type={event.eventType} />
            
            {event.isDemo && <DemoDataBadge />}

            {/* Days Countdown Pill */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${
              daysLeft > 0 
                ? 'bg-gold-50 text-gold-900 border border-gold-300' 
                : daysLeft === 0
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-ivory-200 text-slate-700 border border-ivory-300'
            }`}>
              <Clock className="w-3.5 h-3.5 text-gold-600" />
              <span>{daysLeft > 0 ? `${daysLeft} days to go` : daysLeft === 0 ? 'Today!' : 'Celebration Completed'}</span>
            </span>

            {/* Theme Aesthetic Pill */}
            {event.themeAesthetic && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-ivory-100 text-slate-800 border border-ivory-300/80">
                <Palette className="w-3 h-3 text-plum-700" />
                <span>{event.themeAesthetic}</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-plum-950 font-serif tracking-tight">
            {event.title}
          </h1>

          {event.description && (
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              {event.description}
            </p>
          )}

          {/* Quick Info Grid */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-600 pt-1 font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-plum-700" />
              <span>{formatDate(event.date)} {event.startTime ? `@ ${event.startTime}` : ''}</span>
            </div>

            {event.locationName && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-plum-700" />
                <span>{event.locationName}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-plum-700" />
              <span>{event.estimatedGuests} expected guests</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Planned Budget:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(event.totalBudget, event.currency)}
              </span>
            </div>
          </div>

          {/* Dietary Needs & Accessibility Badges (if present) */}
          {((event.dietaryNeeds && event.dietaryNeeds.length > 0) || (event.accessibilityNeeds && event.accessibilityNeeds.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {event.dietaryNeeds && event.dietaryNeeds.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
                    <Utensils className="w-3 h-3 text-plum-700" /> Dietary:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {event.dietaryNeeds.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-plum-50 text-plum-800 border border-plum-200">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {event.accessibilityNeeds && event.accessibilityNeeds.length > 0 && (
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
                    <Accessibility className="w-3 h-3 text-gold-700" /> Accessibility:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {event.accessibilityNeeds.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gold-50 text-gold-900 border border-gold-300">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Theme Color Swatches */}
          {event.colorPalette && event.colorPalette.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Palette:</span>
              <div className="flex items-center gap-1.5">
                {event.colorPalette.map((hex, idx) => (
                  <span
                    key={idx}
                    title={hex}
                    className="w-5 h-5 rounded-full border border-black/15 shadow-sm inline-block transform hover:scale-125 transition-transform cursor-pointer"
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleCopyPalette}
                  title="Copy palette hex codes"
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-ivory-200 rounded-md transition-colors ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          <Button
            variant="plum"
            size="sm"
            onClick={onOpenAiPlanner}
            leftIcon={<Sparkles className="w-4 h-4 text-gold-400" />}
          >
            AI Plan Blueprint
          </Button>

          {onOpenCreativeStudio && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenCreativeStudio}
              leftIcon={<Palette className="w-3.5 h-3.5 text-gold-600" />}
            >
              Creative Studio
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenEditModal}
            leftIcon={<Edit3 className="w-3.5 h-3.5 text-plum-700" />}
          >
            Edit Event
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onTogglePrintView}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Sheet
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={onDeleteEvent}
            aria-label="Delete celebration"
            title="Delete this event"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </div>
  );
};
