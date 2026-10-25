import React from 'react';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  Clock, 
  Phone, 
  Sparkles,
  CheckCircle2,
  ListTodo,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Palette,
  Utensils,
  Accessibility,
  Info,
  CheckSquare,
  Square
} from 'lucide-react';
import { EventWithDetails } from '../../types/index.js';
import { Button } from '../common/Button.js';
import { useToast } from '../common/ToastContext.js';
import { formatCurrency, formatDate } from '../../utils/cn.js';

interface PrintExportViewProps {
  event: EventWithDetails;
  onClose: () => void;
}

export const PrintExportView: React.FC<PrintExportViewProps> = ({ event, onClose }) => {
  const { success } = useToast();
  const currency = event.currency || 'USD';

  const handlePrint = () => {
    window.print();
  };

  const handleExportBudgetCsv = () => {
    const headers = ['Category', 'Item Name', 'Estimated Cost', 'Actual Cost', 'Variance', 'Payment Status', 'Notes'];
    const rows = event.budgetItems.map(item => {
      const variance = item.estimatedCost - item.actualCost;
      return [
        `"${item.category}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        item.estimatedCost,
        item.actualCost,
        variance,
        item.paymentStatus,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `${event.title.toLowerCase().replace(/\s+/g, '_')}_budget.csv`, 'text/csv');
    success('Budget CSV Exported', 'File downloaded successfully.');
  };

  const handleExportTasksCsv = () => {
    const headers = ['Order', 'Title', 'Category', 'Priority', 'Status', 'Due Date', 'Milestone', 'Assignee', 'Description'];
    const rows = event.tasks.map((t, idx) => [
      idx + 1,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.category || ''}"`,
      t.priority,
      t.status,
      t.dueDate || '',
      t.isMilestone ? 'Yes' : 'No',
      `"${(t.assignee || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `${event.title.toLowerCase().replace(/\s+/g, '_')}_tasks.csv`, 'text/csv');
    success('Tasks CSV Exported', 'File downloaded successfully.');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Derived budget variance
  const budgetVariance = event.metrics.totalEstimatedBudget - event.metrics.totalActualCost;

  return (
    <div className="min-h-screen bg-ivory-100/80 p-4 sm:p-8 print:p-0 print:bg-white text-slate-900 print:text-black">
      
      {/* Top Floating Control Bar (hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-ivory-200/90 shadow-soft print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Planner
          </Button>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Use &quot;Save as PDF&quot; in the print dialog for a reliable PDF export.
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="xs"
            onClick={handleExportBudgetCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Budget CSV
          </Button>

          <Button
            variant="secondary"
            size="xs"
            onClick={handleExportTasksCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Tasks CSV
          </Button>

          <Button
            variant="plum"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4 text-gold-400" />}
          >
            Print Plan / Save to PDF
          </Button>
        </div>
      </div>

      {/* Printable Master Document */}
      <div 
        id="printable-event-plan"
        className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-3xl border border-ivory-200 shadow-soft print:border-none print:shadow-none print:p-0 print:max-w-full space-y-8 print:space-y-6"
      >
        
        {/* DOCUMENT HEADER & EVENT DETAILS */}
        <header className="border-b-2 border-slate-900 pb-6 print:pb-4 print-avoid-break">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-plum-900 print:text-black font-bold text-xs uppercase tracking-widest mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold-600 print:text-black fill-current" />
                <span>EverFest Master Event Brief</span>
                {event.isDemo && (
                  <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 print:border-black print:text-black print:bg-slate-100">
                    Sample Demo Data
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl print:text-2xl font-black font-serif text-slate-900 print:text-black tracking-tight">
                {event.title}
              </h1>
              {event.themeAesthetic && (
                <p className="text-sm text-slate-700 print:text-black italic mt-1 font-serif">
                  Aesthetic Theme: {event.themeAesthetic}
                </p>
              )}
            </div>

            <div className="text-right text-xs text-slate-600 print:text-black font-mono">
              <span className="block font-bold uppercase text-slate-900 print:text-black">{event.eventType}</span>
              <span className="block text-[11px] text-slate-500 print:text-black">Status: {event.status}</span>
              <span className="text-[10px] text-slate-400 print:text-black">
                Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Primary Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-200 print:border-slate-300 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-500 print:text-black font-semibold flex items-center gap-1 uppercase text-[10px]">
                <Calendar className="w-3 h-3 text-slate-400 print:hidden" />
                Date & Time
              </span>
              <span className="font-bold text-slate-900 print:text-black block">{formatDate(event.date)}</span>
              <span className="block text-slate-600 print:text-black">
                {event.startTime || '16:00'} — {event.endTime || '22:00'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 print:text-black font-semibold flex items-center gap-1 uppercase text-[10px]">
                <MapPin className="w-3 h-3 text-slate-400 print:hidden" />
                Location
              </span>
              <span className="font-bold text-slate-900 print:text-black block">{event.locationName || 'TBD'}</span>
              {event.locationAddress && (
                <span className="block text-slate-600 print:text-black text-[11px]">{event.locationAddress}</span>
              )}
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 print:text-black font-semibold flex items-center gap-1 uppercase text-[10px]">
                <Users className="w-3 h-3 text-slate-400 print:hidden" />
                Guest Count
              </span>
              <span className="font-bold text-slate-900 print:text-black block text-sm">
                {event.estimatedGuests} Guests
              </span>
              <span className="block text-slate-500 print:text-black text-[11px]">Confirmed Headcount</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 print:text-black font-semibold flex items-center gap-1 uppercase text-[10px]">
                <DollarSign className="w-3 h-3 text-slate-400 print:hidden" />
                Total Budget
              </span>
              <span className="font-bold text-slate-900 print:text-black block font-mono text-sm">
                {formatCurrency(event.totalBudget, currency)}
              </span>
              <span className="block text-slate-500 print:text-black text-[11px]">{currency} Allocated</span>
            </div>
          </div>

          {/* Secondary Details: Palette, Dietary, Accessibility, Preferences */}
          <div className="mt-4 pt-4 border-t border-slate-100 print:border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Color Palette */}
            {event.colorPalette && event.colorPalette.length > 0 && (
              <div className="bg-slate-50 print:bg-white print:border print:border-slate-200 p-2.5 rounded-xl">
                <span className="text-slate-500 print:text-black font-semibold flex items-center gap-1 uppercase text-[10px] mb-1.5">
                  <Palette className="w-3 h-3 text-slate-400 print:hidden" />
                  Color Palette & Hex Values
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {event.colorPalette.map((hex, i) => (
                    <div key={i} className="flex items-center gap-1 text-[11px] font-mono text-slate-700 print:text-black">
                      <span 
                        className="w-3.5 h-3.5 rounded border border-slate-400/80 inline-block shadow-xs" 
                        style={{ backgroundColor: hex }} 
                      />
                      <span>{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dietary Needs */}
            {event.dietaryNeeds && event.dietaryNeeds.length > 0 && (
              <div className="bg-slate-50 print:bg-white print:border print:border-slate-200 p-2.5 rounded-xl">
                <span className="text-slate-500 print:text-black font-semibold flex items-center gap-1 uppercase text-[10px] mb-1">
                  <Utensils className="w-3 h-3 text-slate-400 print:hidden" />
                  Dietary Accommodations
                </span>
                <p className="text-slate-800 print:text-black font-medium text-[11px]">
                  {event.dietaryNeeds.join(' • ')}
                </p>
              </div>
            )}

            {/* Accessibility Needs */}
            {event.accessibilityNeeds && event.accessibilityNeeds.length > 0 && (
              <div className="bg-slate-50 print:bg-white print:border print:border-slate-200 p-2.5 rounded-xl">
                <span className="text-slate-500 print:text-black font-semibold flex items-center gap-1 uppercase text-[10px] mb-1">
                  <Accessibility className="w-3 h-3 text-slate-400 print:hidden" />
                  Accessibility Requirements
                </span>
                <p className="text-slate-800 print:text-black font-medium text-[11px]">
                  {event.accessibilityNeeds.join(' • ')}
                </p>
              </div>
            )}

            {/* Special Preferences & Host Notes */}
            {(event.specialPreferences || event.notes) && (
              <div className="bg-slate-50 print:bg-white print:border print:border-slate-200 p-2.5 rounded-xl">
                <span className="text-slate-500 print:text-black font-semibold flex items-center gap-1 uppercase text-[10px] mb-1">
                  <Info className="w-3 h-3 text-slate-400 print:hidden" />
                  Special Preferences & Notes
                </span>
                <p className="text-slate-800 print:text-black text-[11px] leading-relaxed">
                  {event.specialPreferences || event.notes}
                </p>
              </div>
            )}
          </div>
        </header>

        {/* SECTION 1: MASTER DAY-OF RUN-OF-SHOW SCHEDULE */}
        <section className="print-section print-avoid-break">
          <div className="border-b-2 border-slate-800 pb-2 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 print:text-black flex items-center gap-2">
              <Clock className="w-4 h-4 text-plum-900 print:text-black" />
              <span>1. Master Day-of Run-of-Show Schedule</span>
            </h2>
            <span className="text-xs text-slate-500 print:text-black font-mono">
              {event.runOfShowItems.length} Events
            </span>
          </div>

          {event.runOfShowItems.length === 0 ? (
            <p className="text-xs text-slate-500 print:text-black italic py-2">No schedule agenda recorded.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-100 text-slate-700 print:text-black font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3 w-32">Time Window</th>
                    <th className="py-2.5 px-3">Agenda / Activity</th>
                    <th className="py-2.5 px-3 w-36">Location</th>
                    <th className="py-2.5 px-3 w-36 text-right">Lead / PIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {event.runOfShowItems.map((ros, idx) => (
                    <tr key={idx} className="print-avoid-break hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 print:text-black whitespace-nowrap align-top">
                        {ros.startTime} {ros.endTime ? `— ${ros.endTime}` : ''}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <span className="font-bold text-slate-900 print:text-black block">{ros.title}</span>
                        {ros.description && (
                          <p className="text-slate-600 print:text-black text-[11px] mt-0.5 leading-normal">
                            {ros.description}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 print:text-black align-top font-medium">
                        {ros.location || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800 print:text-black align-top font-semibold">
                        {ros.picName || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 2: CHECKLIST (TASKS & MILESTONES ROADMAP) */}
        <section className="print-section print-avoid-break">
          <div className="border-b-2 border-slate-800 pb-2 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 print:text-black flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-plum-900 print:text-black" />
              <span>2. Action Checklist &amp; Tasks Roadmap</span>
            </h2>
            <span className="text-xs text-slate-500 print:text-black font-mono">
              {event.metrics.completedTasksCount}/{event.metrics.totalTasksCount} Completed ({event.metrics.tasksProgressPercent}%)
            </span>
          </div>

          {event.tasks.length === 0 ? (
            <p className="text-xs text-slate-500 print:text-black italic py-2">No tasks recorded in checklist.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-100 text-slate-700 print:text-black font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3 w-10 text-center">Check</th>
                    <th className="py-2.5 px-3">Task Details</th>
                    <th className="py-2.5 px-3 w-28">Category</th>
                    <th className="py-2.5 px-3 w-24">Priority</th>
                    <th className="py-2.5 px-3 w-28">Due Date</th>
                    <th className="py-2.5 px-3 w-24 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {event.tasks.map((t, idx) => {
                    const isDone = t.status === 'COMPLETED';
                    return (
                      <tr key={idx} className="print-avoid-break hover:bg-slate-50/50">
                        {/* Printable Checkbox for physical clipboard */}
                        <td className="py-2 px-3 text-center align-middle">
                          {isDone ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700 print:text-black mx-auto inline" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 print:text-black mx-auto inline" />
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold ${isDone ? 'line-through text-slate-500 print:text-black' : 'text-slate-900 print:text-black'}`}>
                              {t.title}
                            </span>
                            {t.isMilestone && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 print:border-black print:text-black print:bg-slate-100">
                                Milestone
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-slate-500 print:text-black text-[11px] mt-0.5 leading-snug">
                              {t.description}
                            </p>
                          )}
                          {t.assignee && (
                            <span className="text-slate-600 print:text-black text-[10px] mt-0.5 block italic">
                              Assignee: {t.assignee}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 print:text-black align-top font-medium">
                          {t.category || 'General'}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            t.priority === 'URGENT' 
                              ? 'bg-rose-100 text-rose-800 print:text-black print:bg-slate-100'
                              : t.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-800 print:text-black print:bg-slate-100'
                              : 'bg-slate-100 text-slate-700 print:text-black'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700 print:text-black align-top">
                          {t.dueDate ? formatDate(t.dueDate) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right align-top">
                          <span className={`text-[10px] font-semibold uppercase ${
                            isDone ? 'text-emerald-700 print:text-black' : 'text-slate-600 print:text-black'
                          }`}>
                            {t.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 3: BUDGET SUMMARY & ITEMIZED LEDGER */}
        <section className="print-section print-avoid-break">
          <div className="border-b-2 border-slate-800 pb-2 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 print:text-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-plum-900 print:text-black" />
              <span>3. Budget Summary &amp; Ledger</span>
            </h2>
            <div className="text-xs font-mono text-slate-600 print:text-black">
              Allocated: {formatCurrency(event.totalBudget, currency)}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 mb-3 p-3 bg-slate-50 print:bg-white print:border print:border-slate-300 rounded-xl text-center text-xs">
            <div>
              <span className="block text-[10px] text-slate-500 print:text-black uppercase">Allocated Budget</span>
              <span className="font-bold text-slate-900 print:text-black font-mono">
                {formatCurrency(event.totalBudget, currency)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 print:text-black uppercase">Total Estimated</span>
              <span className="font-bold text-slate-900 print:text-black font-mono">
                {formatCurrency(event.metrics.totalEstimatedBudget, currency)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 print:text-black uppercase">Actual Spend</span>
              <span className="font-bold text-slate-900 print:text-black font-mono">
                {formatCurrency(event.metrics.totalActualCost, currency)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 print:text-black uppercase">Remaining Balance</span>
              <span className={`font-bold font-mono ${
                event.metrics.remainingBudget >= 0 
                  ? 'text-emerald-700 print:text-black' 
                  : 'text-rose-700 print:text-black'
              }`}>
                {formatCurrency(event.metrics.remainingBudget, currency)}
              </span>
            </div>
          </div>

          {event.budgetItems.length === 0 ? (
            <p className="text-xs text-slate-500 print:text-black italic py-2">No budget line items registered.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-100 text-slate-700 print:text-black font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 w-32">Category</th>
                    <th className="py-2.5 px-3 w-24 text-right font-mono">Estimated</th>
                    <th className="py-2.5 px-3 w-24 text-right font-mono">Actual Paid</th>
                    <th className="py-2.5 px-3 w-24 text-right font-mono">Variance</th>
                    <th className="py-2.5 px-3 w-28 text-right">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {event.budgetItems.map((b, idx) => {
                    const variance = b.estimatedCost - b.actualCost;
                    return (
                      <tr key={idx} className="print-avoid-break hover:bg-slate-50/50">
                        <td className="py-2 px-3 align-top font-semibold text-slate-900 print:text-black">
                          {b.name}
                          {b.notes && (
                            <span className="block text-[10px] font-normal text-slate-500 print:text-black mt-0.5">
                              {b.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top text-slate-600 print:text-black font-medium">
                          {b.category.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2 px-3 align-top text-right font-mono text-slate-700 print:text-black">
                          {formatCurrency(b.estimatedCost, currency)}
                        </td>
                        <td className="py-2 px-3 align-top text-right font-mono font-bold text-slate-900 print:text-black">
                          {formatCurrency(b.actualCost, currency)}
                        </td>
                        <td className="py-2 px-3 align-top text-right font-mono text-slate-700 print:text-black">
                          {formatCurrency(variance, currency)}
                        </td>
                        <td className="py-2 px-3 align-top text-right font-medium">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 print:bg-transparent text-slate-800 print:text-black font-semibold">
                            {b.paymentStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 font-bold bg-slate-50 print:bg-slate-100 text-slate-900 print:text-black">
                    <td colSpan={2} className="py-2.5 px-3 uppercase text-[10px]">
                      Ledger Totals ({event.budgetItems.length} items)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatCurrency(event.metrics.totalEstimatedBudget, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatCurrency(event.metrics.totalActualCost, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatCurrency(budgetVariance, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {event.metrics.remainingBudget >= 0 ? 'Surplus' : 'Over Budget'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 4: VENDOR DIRECTORY & CONTACTS */}
        <section className="print-section print-avoid-break">
          <div className="border-b-2 border-slate-800 pb-2 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 print:text-black flex items-center gap-2">
              <Phone className="w-4 h-4 text-plum-900 print:text-black" />
              <span>4. Vendor Directory &amp; Day-of Contacts</span>
            </h2>
            <span className="text-xs text-slate-500 print:text-black font-mono">
              {event.vendors.length} Vendors Registered
            </span>
          </div>

          {event.vendors.length === 0 ? (
            <p className="text-xs text-slate-500 print:text-black italic py-2">No vendors registered for this event.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-100 text-slate-700 print:text-black font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3 w-28">Category</th>
                    <th className="py-2.5 px-3">Company / Provider</th>
                    <th className="py-2.5 px-3 w-32">Contact Person</th>
                    <th className="py-2.5 px-3 w-32">Phone</th>
                    <th className="py-2.5 px-3 w-36">Email</th>
                    <th className="py-2.5 px-3 w-24 text-right">Contract</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {event.vendors.map((v, idx) => (
                    <tr key={idx} className="print-avoid-break hover:bg-slate-50/50">
                      <td className="py-2 px-3 align-top font-semibold text-slate-500 print:text-black">
                        {v.category.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 px-3 align-top font-bold text-slate-900 print:text-black">
                        {v.name}
                        {v.status && (
                          <span className="block text-[10px] font-normal text-slate-500 print:text-black">
                            Status: {v.status}
                          </span>
                        )}
                        {v.notes && (
                          <span className="block text-[10px] font-normal italic text-slate-500 print:text-black">
                            {v.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top text-slate-700 print:text-black">
                        {v.contactPerson || '—'}
                      </td>
                      <td className="py-2 px-3 align-top font-mono text-slate-800 print:text-black">
                        {v.phone || '—'}
                      </td>
                      <td className="py-2 px-3 align-top text-slate-800 print:text-black">
                        {v.email || '—'}
                      </td>
                      <td className="py-2 px-3 align-top text-right font-mono font-bold text-slate-900 print:text-black">
                        {v.contractAmount 
                          ? formatCurrency(v.contractAmount, currency) 
                          : v.quotedPrice 
                          ? `${formatCurrency(v.quotedPrice, currency)} (Quote)` 
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* DOCUMENT FOOTER: No internal IDs or API details */}
        <footer className="pt-6 border-t-2 border-slate-900 flex justify-between items-center text-xs text-slate-500 print:text-black font-serif print-avoid-break">
          <div>
            <span>EverFest Event Planner</span>
            <span className="mx-2">•</span>
            <span>Master Celebration Run Sheet</span>
          </div>
          <div className="text-right text-[11px] font-mono">
            <span>Confidential &amp; Proprietary</span>
          </div>
        </footer>

      </div>
    </div>
  );
};
