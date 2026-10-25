import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit3,
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  PieChart as PieChartIcon,
  Tag, 
  ArrowUpRight, 
  Download,
  Sparkles,
  Info,
  FolderEdit,
  FolderMinus,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Percent
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { EventWithDetails, BudgetItem, PaymentStatus } from '../../types/index.js';
import { PaymentStatusBadge } from '../common/Badge.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { TextInput, Select, Textarea } from '../common/Input.js';
import { EmptyState } from '../common/EmptyState.js';
import { useToast } from '../common/ToastContext.js';
import { api } from '../../services/api.js';
import { formatCurrency, cn } from '../../utils/cn.js';
import { 
  calculateBudgetMetrics, 
  roundToCents, 
  normalizeBudgetCategory, 
  getCategoryDisplay, 
  STANDARD_BUDGET_CATEGORIES,
  CATEGORY_METADATA,
  BudgetItemFormSchema
} from '../../utils/budgetCalculations.js';

interface BudgetTabProps {
  event: EventWithDetails;
  onRefresh: () => void;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ event, onRefresh }) => {
  const { totalBudget, budgetItems = [], currency = 'USD' } = event;
  const { success, error } = useToast();

  // Selected category filter tab
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [categoryToManage, setCategoryToManage] = useState<string | null>(null);
  const [targetReassignCategory, setTargetReassignCategory] = useState<string>('CONTINGENCY');

  // Add / Edit Form State
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<string>('VENUE');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('UNPAID');
  const [notes, setNotes] = useState('');
  const [isEstimate, setIsEstimate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // DERIVE METRICS DIRECTLY FROM SOURCE DATA
  // Never hardcode or duplicate static totals
  // ==========================================
  const metrics = useMemo(() => {
    return calculateBudgetMetrics(totalBudget, budgetItems);
  }, [totalBudget, budgetItems]);

  // Filtered items for table
  const filteredItems = useMemo(() => {
    if (selectedFilterCategory === 'ALL') return budgetItems;
    return budgetItems.filter(
      (item) => normalizeBudgetCategory(item.category) === selectedFilterCategory
    );
  }, [budgetItems, selectedFilterCategory]);

  // Chart data from derived category breakdown (only categories with allocations)
  const chartData = useMemo(() => {
    return metrics.categoryBreakdown
      .filter((cat) => cat.estimated > 0 || cat.actual > 0)
      .map((cat) => ({
        name: cat.label,
        key: cat.category,
        value: cat.actual > 0 ? cat.actual : cat.estimated,
        color: cat.color,
      }));
  }, [metrics]);

  // Open Add Modal
  const handleOpenAddModal = (defaultCategory?: string) => {
    setItemName('');
    setItemCategory(defaultCategory ? normalizeBudgetCategory(defaultCategory) : 'VENUE');
    setEstimatedCost('');
    setActualCost('0');
    setPaymentStatus('UNPAID');
    setNotes('');
    setIsEstimate(true);
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal for a specific item
  const handleOpenEditModal = (item: BudgetItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(normalizeBudgetCategory(item.category));
    setEstimatedCost(String(item.estimatedCost));
    setActualCost(String(item.actualCost || 0));
    setPaymentStatus(item.paymentStatus);
    setNotes(item.notes || '');
    setIsEstimate(item.isEstimate !== false);
    setIsAddModalOpen(true);
  };

  // Save Add / Edit
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with Zod
    const validation = BudgetItemFormSchema.safeParse({
      name: itemName,
      category: itemCategory,
      estimatedCost,
      actualCost: actualCost || '0',
      paymentStatus,
      notes,
      isEstimate,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || 'Invalid expense inputs';
      error('Validation Error', firstIssue);
      return;
    }

    const { data } = validation;
    setIsSubmitting(true);

    try {
      if (editingItem) {
        await api.updateBudgetItem(editingItem.id, {
          name: data.name,
          category: data.category,
          estimatedCost: roundToCents(data.estimatedCost),
          actualCost: roundToCents(data.actualCost),
          paymentStatus: data.paymentStatus,
          notes: data.notes?.trim() || undefined,
          isEstimate: data.isEstimate,
        });
        success('Expense Updated', `"${data.name}" changes saved.`);
      } else {
        await api.addBudgetItem(event.id, {
          name: data.name,
          category: data.category,
          estimatedCost: roundToCents(data.estimatedCost),
          actualCost: roundToCents(data.actualCost),
          paymentStatus: data.paymentStatus,
          notes: data.notes?.trim() || undefined,
          isEstimate: data.isEstimate,
        });
        success('Expense Added', `"${data.name}" added to budget.`);
      }

      setIsAddModalOpen(false);
      setEditingItem(null);
      onRefresh();
    } catch (err: any) {
      error('Operation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: BudgetItem) => {
    if (!confirm(`Are you sure you want to remove "${item.name}" from your budget?`)) {
      return;
    }
    try {
      await api.deleteBudgetItem(item.id);
      success('Item Removed', `"${item.name}" deleted.`);
      onRefresh();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (catKey: string) => {
    const meta = getCategoryDisplay(catKey);
    const catItems = budgetItems.filter((i) => normalizeBudgetCategory(i.category) === catKey);

    if (catItems.length === 0) {
      error('Category Empty', `There are no items currently in ${meta.label}.`);
      return;
    }

    if (
      !confirm(
        `Delete all ${catItems.length} item(s) in the "${meta.label}" category? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.deleteBudgetCategory(event.id, catKey);
      success('Category Cleared', `Removed all items in ${meta.label}.`);
      setCategoryToManage(null);
      onRefresh();
    } catch (err: any) {
      error('Failed to clear category', err.message);
    }
  };

  // Reassign Category
  const handleReassignCategory = async (catKey: string, newCatKey: string) => {
    const fromMeta = getCategoryDisplay(catKey);
    const toMeta = getCategoryDisplay(newCatKey);

    try {
      const count = await api.updateBudgetCategory(event.id, catKey, newCatKey);
      success('Category Updated', `Reassigned ${count} item(s) from ${fromMeta.label} to ${toMeta.label}.`);
      setCategoryToManage(null);
      onRefresh();
    } catch (err: any) {
      error('Reassignment Failed', err.message);
    }
  };

  // Cycle payment status
  const handleTogglePaymentStatus = async (item: BudgetItem) => {
    const nextStatus: Record<PaymentStatus, PaymentStatus> = {
      UNPAID: 'DEPOSIT_PAID',
      DEPOSIT_PAID: 'PAID_IN_FULL',
      PAID_IN_FULL: 'UNPAID',
    };
    const target = nextStatus[item.paymentStatus];
    try {
      await api.updateBudgetItem(item.id, { paymentStatus: target });
      success('Status Updated', `${item.name} marked as ${target.replace(/_/g, ' ')}`);
      onRefresh();
    } catch (err: any) {
      error('Failed to update status', err.message);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Category',
      'Item Name',
      'Estimated Cost',
      'Actual Cost',
      'Payment Status',
      'Is Estimate',
      'Notes',
    ];
    const rows = budgetItems.map((item) => [
      `"${normalizeBudgetCategory(item.category)}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      item.estimatedCost,
      item.actualCost,
      item.paymentStatus,
      item.isEstimate !== false ? 'YES' : 'NO',
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.toLowerCase().replace(/\s+/g, '_')}_budget_breakdown.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success('Budget Exported', 'CSV downloaded successfully.');
  };

  // Prospective estimate calculation in modal to show warning
  const prospectiveEstimatedCost = parseFloat(estimatedCost) || 0;
  const prospectiveDiff = editingItem
    ? prospectiveEstimatedCost - editingItem.estimatedCost
    : prospectiveEstimatedCost;
  const prospectiveTotalEst = roundToCents(metrics.estimatedTotal + prospectiveDiff);
  const prospectiveWillExceed = prospectiveTotalEst > totalBudget;

  return (
    <div className="space-y-6">
      
      {/* ========================================================= */}
      {/* 1. OVER-BUDGET & ESTIMATE DISCLAIMER WARNING BANNERS     */}
      {/* ========================================================= */}
      
      {/* Warning A: Estimates Exceed Total Budget */}
      {metrics.isOverBudgetEstimated && (
        <div 
          role="alert"
          className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-soft flex items-start gap-3.5"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
              Estimated Allocations Exceed Budget Limit
            </h4>
            <p className="text-amber-800 mt-1 leading-relaxed">
              Total planned estimates of <strong className="font-mono font-semibold">{formatCurrency(metrics.estimatedTotal, currency)}</strong> exceed your celebration budget target of <strong className="font-mono font-semibold">{formatCurrency(totalBudget, currency)}</strong> by <strong className="font-mono font-bold text-amber-900">{formatCurrency(metrics.overBudgetEstimatedAmount, currency)}</strong>. Consider adjusting allocations or increasing the target budget.
            </p>
          </div>
        </div>
      )}

      {/* Warning B: Actual Disbursed Spend Overrun */}
      {metrics.isOverBudget && (
        <div 
          role="alert"
          className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200/90 shadow-soft flex items-start gap-3.5"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-rose-950 text-sm flex items-center gap-2">
              Critical Overrun: Actual Spend Exceeds Budget
            </h4>
            <p className="text-rose-800 mt-1 leading-relaxed">
              Actual disbursed expenses of <strong className="font-mono font-semibold">{formatCurrency(metrics.actualSpend, currency)}</strong> have surpassed your celebration cap by <strong className="font-mono font-bold text-rose-950">{formatCurrency(metrics.overBudgetActualAmount, currency)}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer Notice: Generated prices are estimates, not verified quotes */}
      <div className="p-3.5 rounded-2xl bg-ivory-100/80 border border-ivory-200/90 flex items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-plum-800 flex-shrink-0" />
          <span>
            <strong>Pricing Estimates Notice:</strong> Initial allocations and generated prices are preliminary planning estimates, not verified quotes. Binding prices must be confirmed directly through signed vendor contracts.
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-100/70 text-gold-900 text-[10px] font-semibold border border-gold-200/60 uppercase tracking-wider flex-shrink-0">
          <Sparkles className="w-3 h-3 text-gold-600" />
          Estimates
        </span>
      </div>

      {/* ========================================================= */}
      {/* 2. EXECUTIVE BUDGET METRICS OVERVIEW (DERIVED)            */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Total Budget */}
        <div className="p-5 bg-white rounded-2xl border border-ivory-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Planned Budget</span>
            <div className="w-7 h-7 rounded-lg bg-plum-50 border border-plum-100 flex items-center justify-center text-plum-800">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-plum-950 font-mono tracking-tight">
            {formatCurrency(totalBudget, currency)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-sans">Celebration target cap</p>
        </div>

        {/* Card 2: Estimated Total */}
        <div className={`p-5 rounded-2xl border shadow-soft transition-colors ${
          metrics.isOverBudgetEstimated 
            ? 'bg-amber-50/60 border-amber-200' 
            : 'bg-white border-ivory-200/90'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Estimated Total</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              metrics.isOverBudgetEstimated ? 'bg-amber-100 text-amber-800' : 'bg-gold-50 text-gold-700'
            }`}>
              <Tag className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-2xl font-extrabold font-mono tracking-tight ${
            metrics.isOverBudgetEstimated ? 'text-amber-800' : 'text-gold-700'
          }`}>
            {formatCurrency(metrics.estimatedTotal, currency)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-sans">
            <span>{metrics.percentCommitted}% committed</span>
            <span className="text-[10px] text-slate-400">(Estimates)</span>
          </div>
        </div>

        {/* Card 3: Actual Spend */}
        <div className="p-5 bg-white rounded-2xl border border-ivory-200/90 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Actual Spend</span>
            <div className="w-7 h-7 rounded-lg bg-ivory-200 flex items-center justify-center text-plum-800">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {formatCurrency(metrics.actualSpend, currency)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-sans">
            {metrics.percentSpent}% settled
          </p>
        </div>

        {/* Card 4: Remaining Budget */}
        <div className={`p-5 rounded-2xl border shadow-soft transition-colors ${
          metrics.isOverBudget 
            ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
            : 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {metrics.isOverBudget ? 'Budget Overrun' : 'Remaining Funds'}
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              metrics.isOverBudget ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {metrics.isOverBudget ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>
          <p className={`text-2xl font-extrabold font-mono tracking-tight ${
            metrics.isOverBudget ? 'text-rose-700' : 'text-emerald-800'
          }`}>
            {formatCurrency(metrics.remainingBudget, currency)}
          </p>
          <p className="text-[11px] text-slate-600 mt-1 font-sans">
            {metrics.isOverBudget ? 'Spend exceeds limit' : 'Available for contracts'}
          </p>
        </div>

        {/* Card 5: Budget Variance */}
        <div className={`p-5 rounded-2xl border shadow-soft transition-colors ${
          metrics.budgetVariance < 0 
            ? 'bg-amber-50/50 border-amber-200' 
            : 'bg-white border-ivory-200/90'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Budget Variance</span>
            <div className="w-7 h-7 rounded-lg bg-ivory-100 flex items-center justify-center text-slate-700">
              {metrics.budgetVariance >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-amber-700" />
              )}
            </div>
          </div>
          <p className={`text-2xl font-extrabold font-mono tracking-tight ${
            metrics.budgetVariance >= 0 ? 'text-emerald-700' : 'text-amber-800'
          }`}>
            {metrics.budgetVariance >= 0 ? '+' : ''}{formatCurrency(metrics.budgetVariance, currency)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-sans">
            {metrics.budgetVariance >= 0 ? 'Planned buffer cushion' : 'Planned deficit'}
          </p>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. CATEGORY CARDS BREAKDOWN (ALL 8 CATEGORIES)           */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-plum-800" />
            Budget Categories (8 Standard Allocations)
          </h3>
          <span className="text-xs text-slate-500">
            Click any category card to filter expenses below
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          {metrics.categoryBreakdown.map((cat) => {
            const isSelected = selectedFilterCategory === cat.category;
            return (
              <div 
                key={cat.category}
                onClick={() => setSelectedFilterCategory(isSelected ? 'ALL' : cat.category)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between ${
                  isSelected 
                    ? 'border-plum-800 bg-plum-50/40 shadow-soft ring-1 ring-plum-800' 
                    : 'bg-white border-ivory-200/90 hover:border-gold-300 hover:shadow-soft'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span 
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: cat.accentBg, color: cat.color }}
                    >
                      {cat.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {cat.count} {cat.count === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <div className="mt-1 space-y-0.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-500 text-[11px]">Est:</span>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(cat.estimated, currency)}</span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-500 text-[11px]">Paid:</span>
                      <span className="font-mono font-medium text-slate-600">{formatCurrency(cat.actual, currency)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-ivory-100 flex items-center justify-between text-[10px]">
                  <span className={`font-mono font-medium ${cat.variance >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Var: {cat.variance >= 0 ? '+' : ''}{formatCurrency(cat.variance, currency)}
                  </span>
                  
                  {cat.count > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryToManage(cat.category);
                      }}
                      className="text-slate-400 hover:text-plum-800 p-0.5 rounded hover:bg-ivory-100"
                      title="Manage category (edit or delete)"
                    >
                      <FolderEdit className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. RECHARTS ALLOCATION CHART & ITEMIZED EXPENSES TABLE   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Chart Card */}
        <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-plum-800" />
                Distribution by Category
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {chartData.length} active
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="h-52 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val), currency), 'Allocation']}
                      contentStyle={{ 
                        borderRadius: '14px', 
                        border: '1px solid #E8E1D3', 
                        backgroundColor: '#FAF7F2',
                        fontSize: '12px',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-xs text-slate-400">
                No budget allocations yet
              </div>
            )}
          </div>

          {/* Color Key */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-ivory-200 max-h-24 overflow-y-auto">
            {chartData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-medium">{item.name}:</span>
                <span className="font-mono font-semibold text-slate-800">{formatCurrency(item.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Itemized Expenses & Quotes Table Card */}
        <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft flex flex-col justify-between">
          <div>
            
            {/* Header with Category Filter Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-plum-950 font-serif">
                  Itemized Expenses & Quotes
                </h3>
                <p className="text-xs text-slate-500">
                  Track estimates, vendor payments, and category variances in real time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {budgetItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleExportCsv}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    CSV
                  </Button>
                )}
                <Button
                  variant="plum"
                  size="sm"
                  onClick={() => handleOpenAddModal(selectedFilterCategory !== 'ALL' ? selectedFilterCategory : undefined)}
                  leftIcon={<Plus className="w-3.5 h-3.5 text-gold-400" />}
                >
                  Add Expense
                </Button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 text-xs scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedFilterCategory('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedFilterCategory === 'ALL'
                    ? 'bg-plum-900 text-ivory-50'
                    : 'bg-ivory-100 text-slate-600 hover:bg-ivory-200'
                }`}
              >
                All Categories ({budgetItems.length})
              </button>

              {STANDARD_BUDGET_CATEGORIES.map((catKey) => {
                const count = budgetItems.filter((i) => normalizeBudgetCategory(i.category) === catKey).length;
                const meta = getCategoryDisplay(catKey);
                const isSelected = selectedFilterCategory === catKey;

                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedFilterCategory(catKey)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-plum-900 text-ivory-50 shadow-sm'
                        : 'bg-ivory-100 text-slate-600 hover:bg-ivory-200'
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: meta.color }} 
                    />
                    {meta.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Table or Empty State */}
            {filteredItems.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="w-7 h-7" />}
                title={selectedFilterCategory === 'ALL' ? 'No expenses registered yet' : `No expenses in ${getCategoryDisplay(selectedFilterCategory).label}`}
                description="Populate your celebration budget with estimated costs or record signed contracts."
                actionLabel={`Add Expense to ${selectedFilterCategory === 'ALL' ? 'Budget' : getCategoryDisplay(selectedFilterCategory).label}`}
                onAction={() => handleOpenAddModal(selectedFilterCategory !== 'ALL' ? selectedFilterCategory : undefined)}
                className="my-6"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-ivory-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Category & Item</th>
                      <th className="pb-3">Estimated</th>
                      <th className="pb-3">Actual Paid</th>
                      <th className="pb-3">Variance</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-100">
                    {filteredItems.map((item) => {
                      const itemCat = normalizeBudgetCategory(item.category);
                      const catMeta = getCategoryDisplay(itemCat);
                      const variance = roundToCents(item.estimatedCost - item.actualCost);
                      const isEst = item.isEstimate !== false;

                      return (
                        <tr key={item.id} className="hover:bg-ivory-50/70 transition-colors group">
                          
                          {/* Item & Category */}
                          <td className="py-3.5 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 block text-xs">
                                {item.name}
                              </span>
                              {isEst && (
                                <span 
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gold-50 text-gold-800 border border-gold-200/80"
                                  title="Estimated cost (not a verified vendor quote)"
                                >
                                  Est.
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                              <span 
                                className="font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.2 rounded"
                                style={{ backgroundColor: catMeta.accentBg, color: catMeta.color }}
                              >
                                {catMeta.label}
                              </span>
                              {item.notes && <span>• {item.notes}</span>}
                            </div>
                          </td>

                          {/* Estimated */}
                          <td className="py-3.5 font-mono text-slate-700">
                            {formatCurrency(item.estimatedCost, currency)}
                          </td>

                          {/* Actual */}
                          <td className="py-3.5 font-mono font-bold text-slate-900">
                            {formatCurrency(item.actualCost, currency)}
                          </td>

                          {/* Variance */}
                          <td className="py-3.5 font-mono">
                            <span className={variance >= 0 ? 'text-emerald-700' : 'text-amber-700 font-semibold'}>
                              {variance >= 0 ? '+' : ''}{formatCurrency(variance, currency)}
                            </span>
                          </td>

                          {/* Payment Status Toggle */}
                          <td className="py-3.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePaymentStatus(item)}
                              className="hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-full"
                              title="Click to advance status: Unpaid → Deposit Paid → Paid in Full"
                            >
                              <PaymentStatusBadge status={item.paymentStatus} />
                            </button>
                          </td>

                          {/* Actions: Edit & Delete */}
                          <td className="py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                aria-label={`Edit ${item.name}`}
                                className="p-1.5 text-slate-400 hover:text-plum-800 rounded-lg hover:bg-plum-50 transition-colors"
                                title="Edit expense"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                aria-label={`Delete ${item.name}`}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Remove expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 5. ADD / EDIT EXPENSE MODAL (WITH VALIDATION)            */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Edit Budget Expense' : 'Add Expense Allocation'}
        subtitle={
          editingItem
            ? `Modify item costs, category, or payment status for ${editingItem.name}.`
            : 'Record planned quotes, staging deposits, or vendor commitments.'
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          
          {/* Prospective Over-Budget Warning Inside Modal */}
          {prospectiveWillExceed && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Over-Budget Warning:</strong> Adding this estimated amount will bring total planned estimates to <strong className="font-mono">{formatCurrency(prospectiveTotalEst, currency)}</strong>, exceeding your celebration budget of <strong className="font-mono">{formatCurrency(totalBudget, currency)}</strong>.
              </div>
            </div>
          )}

          <TextInput
            label="Expense Item Name"
            placeholder="e.g. Reception String Quartet & Sound Engineer"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Budget Category"
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value)}
            >
              {STANDARD_BUDGET_CATEGORIES.map((catKey) => {
                const meta = getCategoryDisplay(catKey);
                return (
                  <option key={catKey} value={catKey}>
                    {meta.label}
                  </option>
                );
              })}
            </Select>

            <Select
              label="Payment Status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
            >
              <option value="UNPAID">Unpaid</option>
              <option value="DEPOSIT_PAID">Deposit Paid</option>
              <option value="PAID_IN_FULL">Paid in Full</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label={`Estimated Cost (${currency})`}
              type="number"
              step="0.01"
              min="0"
              placeholder="2500"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              required
            />

            <TextInput
              label={`Actual Paid Amount (${currency})`}
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
            />
          </div>

          {/* Label as Estimate Checkbox */}
          <div className="p-3 bg-ivory-50/80 rounded-xl border border-ivory-200/80 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="isEstimateCheckbox"
              checked={isEstimate}
              onChange={(e) => setIsEstimate(e.target.checked)}
              className="mt-0.5 rounded border-ivory-300 text-plum-900 focus:ring-gold-500 w-4 h-4"
            />
            <label htmlFor="isEstimateCheckbox" className="text-xs text-slate-700 cursor-pointer select-none">
              <strong className="block font-semibold">Label as preliminary estimate</strong>
              <span className="text-slate-500">
                Marks this item as an unverified planning estimate rather than a confirmed vendor contract.
              </span>
            </label>
          </div>

          <Textarea
            label="Notes & Contract Terms"
            placeholder="e.g. 50% deposit paid upon signing, remaining balance due 14 days prior to event."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-ivory-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="plum"
              size="sm"
              isLoading={isSubmitting}
            >
              {editingItem ? 'Save Changes' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* 6. CATEGORY MANAGEMENT MODAL (EDIT / DELETE CATEGORY)     */}
      {/* ========================================================= */}
      {categoryToManage && (
        <Modal
          isOpen={!!categoryToManage}
          onClose={() => setCategoryToManage(null)}
          title={`Manage Category: ${getCategoryDisplay(categoryToManage).label}`}
          subtitle={`Edit or batch reassign items in the ${getCategoryDisplay(categoryToManage).label} category.`}
        >
          <div className="space-y-5 text-xs">
            
            {/* Reassign Option */}
            <div className="p-4 bg-ivory-50 rounded-2xl border border-ivory-200/90 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <FolderEdit className="w-4 h-4 text-plum-800" />
                Reassign All Items to Another Category
              </h4>
              <p className="text-slate-600">
                Move all expenses currently tagged as <strong>{getCategoryDisplay(categoryToManage).label}</strong> to a different category:
              </p>
              
              <div className="flex items-center gap-3">
                <Select
                  value={targetReassignCategory}
                  onChange={(e) => setTargetReassignCategory(e.target.value)}
                  className="flex-1"
                >
                  {STANDARD_BUDGET_CATEGORIES.filter((c) => c !== categoryToManage).map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {getCategoryDisplay(catKey).label}
                    </option>
                  ))}
                </Select>

                <Button
                  type="button"
                  variant="plum"
                  size="sm"
                  onClick={() => handleReassignCategory(categoryToManage, targetReassignCategory)}
                >
                  Move Items
                </Button>
              </div>
            </div>

            {/* Clear / Delete Category Option */}
            <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/80 space-y-2">
              <h4 className="font-bold text-rose-950 flex items-center gap-2">
                <FolderMinus className="w-4 h-4 text-rose-700" />
                Delete All Items in this Category
              </h4>
              <p className="text-rose-800">
                Permanently delete all items assigned to <strong>{getCategoryDisplay(categoryToManage).label}</strong>.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteCategory(categoryToManage)}
                >
                  Delete Category Items
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-ivory-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCategoryToManage(null)}
              >
                Close
              </Button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};
