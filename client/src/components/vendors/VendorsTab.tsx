import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Phone, 
  Mail, 
  Globe, 
  User, 
  FileText,
  DollarSign,
  ExternalLink,
  Upload,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  HelpCircle,
  AlertCircle,
  Edit3,
  X,
  Coins,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { 
  EventWithDetails, 
  Vendor, 
  VendorCategory, 
  VendorStatus, 
  BudgetCategory 
} from '../../types/index.js';
import { VendorStatusBadge } from '../common/Badge.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { TextInput, Textarea, Select } from '../common/Input.js';
import { EmptyState } from '../common/EmptyState.js';
import { useToast } from '../common/ToastContext.js';
import { api } from '../../services/api.js';
import { formatCurrency, safeExternalUrl } from '../../utils/cn.js';
import { 
  CORE_VENDOR_CATEGORIES, 
  VENDOR_STATUS_OPTIONS,
  normalizeVendorCategory,
  calculateVendorMetrics,
  filterVendors,
  getVendorQuotedPrice,
  getVendorContractAmount
} from '../../utils/vendorCalculations.js';

interface VendorsTabProps {
  event: EventWithDetails;
  onRefresh: () => void;
}

export const VendorsTab: React.FC<VendorsTabProps> = ({ event, onRefresh }) => {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<VendorCategory>('VENUE');
  const [status, setStatus] = useState<VendorStatus>('RESEARCHING');
  const [contactPerson, setContactPerson] = useState('');
  const [contactDetails, setContactDetails] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [budgetCategory, setBudgetCategory] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedOrigin, setSelectedOrigin] = useState<'ALL' | 'DEMO' | 'CUSTOM'>('ALL');

  const { success, error, comingSoon } = useToast();
  const { vendors = [] } = event;

  // Metrics computation
  const metrics = useMemo(() => calculateVendorMetrics(vendors), [vendors]);

  // Filtered vendor list
  const filteredVendors = useMemo(() => {
    return filterVendors(vendors, {
      search: searchQuery,
      category: selectedCategory,
      status: selectedStatus,
      origin: selectedOrigin,
    });
  }, [vendors, searchQuery, selectedCategory, selectedStatus, selectedOrigin]);

  // Open modal for new vendor
  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setName('');
    setCategory('VENUE');
    setStatus('RESEARCHING');
    setContactPerson('');
    setContactDetails('');
    setEmail('');
    setPhone('');
    setWebsite('');
    setQuotedPrice('');
    setContractAmount('');
    setBudgetCategory('');
    setNotes('');
    setIsDemo(false);
    setIsModalOpen(true);
  };

  // Open modal to edit existing vendor
  const handleOpenEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setName(vendor.name);
    setCategory(vendor.category);
    setStatus(vendor.status);
    setContactPerson(vendor.contactPerson || '');
    setContactDetails(vendor.contactDetails || '');
    setEmail(vendor.email || '');
    setPhone(vendor.phone || '');
    setWebsite(vendor.website || '');
    const quote = getVendorQuotedPrice(vendor);
    setQuotedPrice(quote > 0 ? quote.toString() : '');
    const contract = getVendorContractAmount(vendor);
    setContractAmount(contract > 0 ? contract.toString() : '');
    setBudgetCategory(vendor.budgetCategory || '');
    setNotes(vendor.notes || '');
    setIsDemo(!!vendor.isDemo);
    setIsModalOpen(true);
  };

  // Save vendor (create or update)
  const handleSubmitVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Validation Error', 'Vendor name is required.');
      return;
    }

    const parsedQuoted = quotedPrice ? parseFloat(quotedPrice) : undefined;
    const parsedContract = contractAmount ? parseFloat(contractAmount) : undefined;

    if (parsedQuoted !== undefined && (isNaN(parsedQuoted) || parsedQuoted < 0)) {
      error('Invalid Price', 'Quoted price cannot be negative.');
      return;
    }
    if (parsedContract !== undefined && (isNaN(parsedContract) || parsedContract < 0)) {
      error('Invalid Price', 'Contract amount cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const vendorPayload = {
        name: name.trim(),
        category,
        status,
        contactPerson: contactPerson.trim() || undefined,
        contactDetails: contactDetails.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        quotedPrice: parsedQuoted,
        quotedAmount: parsedQuoted,
        contractAmount: parsedContract,
        budgetCategory: budgetCategory.trim() || undefined,
        notes: notes.trim() || undefined,
        isDemo,
      };

      if (editingVendor) {
        await api.updateVendor(editingVendor.id, vendorPayload);
        success('Vendor Profile Updated', `Changes to "${name}" have been saved.`);
      } else {
        await api.addVendor(event.id, vendorPayload);
        success('Vendor Partner Registered', `"${name}" added to vendor directory.`);
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      error('Operation Failed', err.message || 'Unable to save vendor profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick status update from card dropdown
  const handleUpdateStatus = async (vendor: Vendor, newStatus: VendorStatus) => {
    try {
      await api.updateVendor(vendor.id, { status: newStatus });
      success('Vendor Status Updated', `${vendor.name} is now marked as ${newStatus}.`);
      onRefresh();
    } catch (err: any) {
      error('Failed to update status', err.message);
    }
  };

  // Delete vendor with confirmation
  const handleDeleteVendor = async (vendor: Vendor) => {
    const isConfirmed = window.confirm(
      `Remove "${vendor.name}" from this celebration directory? This action cannot be undone.`
    );
    if (!isConfirmed) return;

    try {
      await api.deleteVendor(vendor.id);
      success('Vendor Partner Removed', `"${vendor.name}" removed from directory.`);
      onRefresh();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedOrigin('ALL');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Mandatory Simulated Demo Directory Disclaimer Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-ivory-50 to-amber-50/80 rounded-2xl border border-amber-200/90 shadow-sm flex items-start gap-3.5 text-slate-800">
        <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold text-amber-950 font-serif tracking-wide uppercase">
              Simulated Directory Notice & Disclaimers
            </h4>
            <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
              Demo Data Policy
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans">
            Vendor profiles tagged with <strong className="font-semibold text-slate-900">[Demo Data]</strong> are 
            fictional sample examples generated solely for planning and budget illustration. 
            EverFest <strong>does not represent, verify, authenticate, or guarantee</strong> the legal availability, 
            licensing, real-world existence, or rates of any listed partner without an official genuine quote. 
            Always conduct independent due diligence and execute direct contracts with authentic providers.
          </p>
        </div>
      </div>

      {/* 2. Top Summary Ribbon & Quick Action */}
      <div className="bg-white p-6 rounded-3xl border border-ivory-200/90 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gold-600" />
              <h3 className="text-base sm:text-lg font-bold text-plum-950 font-serif">
                Vendor Directory & Contract CRM
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Organize venues, caterers, photographers, florists, and entertainment with quote tracking and budget linking.
            </p>
          </div>

          <Button
            variant="plum"
            size="sm"
            onClick={handleOpenAddModal}
            leftIcon={<Plus className="w-4 h-4 text-gold-400" />}
            className="self-start sm:self-auto shadow-sm"
          >
            Add Vendor Partner
          </Button>
        </div>

        {/* Aggregate KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-ivory-100">
          <div className="bg-ivory-50/70 p-3.5 rounded-2xl border border-ivory-200/60">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Total Partners
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-serif text-plum-950">
                {metrics.totalCount}
              </span>
              <span className="text-[11px] text-slate-400 font-sans">
                ({metrics.bookedCount} booked)
              </span>
            </div>
          </div>

          <div className="bg-ivory-50/70 p-3.5 rounded-2xl border border-ivory-200/60">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
              Contracted Total
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-900">
                {formatCurrency(metrics.totalContractedValue, event.currency)}
              </span>
            </div>
          </div>

          <div className="bg-ivory-50/70 p-3.5 rounded-2xl border border-ivory-200/60">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">
              Total Quoted Value
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-amber-950">
                {formatCurrency(metrics.totalQuotedValue, event.currency)}
              </span>
            </div>
          </div>

          <div className="bg-ivory-50/70 p-3.5 rounded-2xl border border-ivory-200/60">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 block">
              Active Inquiries
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-serif text-indigo-950">
                {metrics.contactedCount + metrics.quotedCount}
              </span>
              <span className="text-[11px] text-indigo-600 font-sans">
                in pipeline
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search and Filtering Controls */}
      <div className="bg-white p-5 rounded-3xl border border-ivory-200/90 shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Keyword Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search vendors by name, contact, notes, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-ivory-50 border border-ivory-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5 bg-ivory-50 px-3 py-1.5 rounded-xl border border-ivory-200">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="filter-status" className="text-[11px] font-semibold text-slate-600">Status:</label>
              <select
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses ({vendors.length})</option>
                <option value="RESEARCHING">Researching ({metrics.researchingCount})</option>
                <option value="CONTACTED">Contacted ({metrics.contactedCount})</option>
                <option value="QUOTED">Quoted ({metrics.quotedCount})</option>
                <option value="BOOKED">Booked ({metrics.bookedCount})</option>
                <option value="DECLINED">Declined ({metrics.declinedCount})</option>
              </select>
            </div>

            {/* Origin Dropdown (Demo vs Custom) */}
            <div className="flex items-center gap-1.5 bg-ivory-50 px-3 py-1.5 rounded-xl border border-ivory-200">
              <label htmlFor="filter-origin" className="text-[11px] font-semibold text-slate-600">Origin:</label>
              <select
                id="filter-origin"
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Sources</option>
                <option value="DEMO">Demo Samples Only</option>
                <option value="CUSTOM">User Registered Only</option>
              </select>
            </div>

            {(searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedOrigin !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-plum-800 hover:text-plum-950 px-2.5 py-1"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Category Filter Pills (Venue, Catering, Photography, Decoration, Entertainment, Transport, Other) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-ivory-100">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-plum-900 text-white shadow-sm'
                : 'bg-ivory-100 text-slate-600 hover:bg-ivory-200 hover:text-slate-900'
            }`}
          >
            All Categories ({vendors.length})
          </button>
          
          {CORE_VENDOR_CATEGORIES.map((cat) => {
            const count = metrics.categoryBreakdown[cat.value] || 0;
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-plum-900 text-white shadow-sm'
                    : 'bg-ivory-100 text-slate-600 hover:bg-ivory-200 hover:text-slate-900'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-plum-800 text-gold-300' : 'bg-ivory-200 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Vendor Cards Grid */}
      {filteredVendors.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title={vendors.length === 0 ? "No vendor partners registered yet" : "No vendors match your search"}
          description={
            vendors.length === 0
              ? "Register venues, caterers, photographers, florists, and entertainment to compare quotes and track signed contracts."
              : "Try adjusting your search query, status filters, or selected category."
          }
          actionLabel={vendors.length === 0 ? "Register First Vendor" : "Clear All Filters"}
          onAction={vendors.length === 0 ? handleOpenAddModal : handleResetFilters}
          className="my-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVendors.map((vendor) => {
            const quoted = getVendorQuotedPrice(vendor);
            const contracted = getVendorContractAmount(vendor);
            const normalizedCat = normalizeVendorCategory(vendor.category);

            return (
              <div
                key={vendor.id}
                className={`p-6 bg-white rounded-3xl border shadow-soft flex flex-col justify-between transition-all group hover:shadow-elevated ${
                  vendor.isDemo 
                    ? 'border-ivory-200/90 hover:border-amber-300/80' 
                    : 'border-ivory-200/90 hover:border-plum-300'
                }`}
              >
                <div>
                  {/* Card Header & Labels */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded-md border border-gold-200/60">
                          {normalizedCat}
                        </span>

                        {vendor.isDemo ? (
                          <span 
                            title="Fictional sample vendor for illustration"
                            className="text-[9px] font-bold tracking-wide uppercase text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300/60"
                          >
                            Demo Data
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium tracking-wide uppercase text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                            Custom Partner
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 font-serif leading-snug">
                        {vendor.name}
                      </h4>
                    </div>

                    {/* Quick Status Dropdown */}
                    <div className="flex-shrink-0">
                      <label htmlFor={`status-select-${vendor.id}`} className="sr-only">Update vendor status</label>
                      <select
                        id={`status-select-${vendor.id}`}
                        value={vendor.status}
                        onChange={(e) => handleUpdateStatus(vendor, e.target.value as VendorStatus)}
                        className="text-xs font-semibold bg-ivory-100 border border-ivory-300 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 cursor-pointer shadow-2xs"
                      >
                        <option value="RESEARCHING">Researching</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="QUOTED">Quoted</option>
                        <option value="BOOKED">Booked</option>
                        <option value="DECLINED">Declined</option>
                      </select>
                    </div>
                  </div>

                  {/* Financial & Budget Association Summary */}
                  <div className="bg-ivory-50/70 p-3 rounded-2xl border border-ivory-150 my-3 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Quoted Rate</span>
                        <span className="font-mono font-semibold text-slate-800 text-sm">
                          {quoted > 0 ? formatCurrency(quoted, event.currency) : <span className="italic text-slate-400 text-xs">Unquoted</span>}
                        </span>
                      </div>

                      {contracted > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-700 block font-semibold uppercase">Contracted</span>
                          <span className="font-mono font-bold text-emerald-900 text-sm">
                            {formatCurrency(contracted, event.currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Budget Category Link Pill */}
                    {vendor.budgetCategory && (
                      <div className="pt-2 border-t border-ivory-200/80 flex items-center justify-between gap-1 text-[11px] text-slate-600">
                        <span className="flex items-center gap-1 font-medium text-plum-900">
                          <Coins className="w-3.5 h-3.5 text-gold-600" />
                          <span>Linked Budget Category:</span>
                        </span>
                        <span className="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-ivory-200 shadow-2xs">
                          {vendor.budgetCategory}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    {vendor.contactPerson && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-plum-700 flex-shrink-0" />
                        <span className="font-medium text-slate-800">{vendor.contactPerson}</span>
                      </div>
                    )}

                    {vendor.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-plum-700 flex-shrink-0" />
                        <a href={`tel:${vendor.phone}`} className="hover:text-plum-900 transition-colors">
                          {vendor.phone}
                        </a>
                      </div>
                    )}

                    {vendor.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-plum-700 flex-shrink-0" />
                        <a href={`mailto:${vendor.email}`} className="hover:text-plum-900 truncate transition-colors">
                          {vendor.email}
                        </a>
                      </div>
                    )}

                    {vendor.contactDetails && !vendor.contactPerson && !vendor.phone && !vendor.email && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="w-3.5 h-3.5 text-plum-700 flex-shrink-0" />
                        <span>{vendor.contactDetails}</span>
                      </div>
                    )}

                    {safeExternalUrl(vendor.website) && (
                      <div className="flex items-center gap-2 truncate pt-0.5">
                        <Globe className="w-3.5 h-3.5 text-plum-700 flex-shrink-0" />
                        <a 
                          href={safeExternalUrl(vendor.website)!} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:text-plum-900 truncate flex items-center gap-1 font-medium text-slate-700"
                        >
                          <span>Visit Portfolio</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Notes / Special Instructions */}
                  {vendor.notes && (
                    <p className="text-[11px] text-slate-600 bg-ivory-50 p-3 rounded-xl border border-ivory-200/80 mt-3 leading-relaxed font-sans">
                      {vendor.notes}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 mt-4 border-t border-ivory-100 flex items-center justify-between">
                  <VendorStatusBadge status={vendor.status} />

                  <div className="flex items-center gap-1">
                    {/* Edit Vendor Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(vendor)}
                      title="Edit vendor profile"
                      aria-label={`Edit ${vendor.name}`}
                      className="p-1.5 text-slate-500 hover:text-plum-950 hover:bg-ivory-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Upload Vault Preview */}
                    <button
                      type="button"
                      onClick={() => comingSoon('Contract File Vault', `Secure cloud upload for ${vendor.name}'s signed contract agreements.`)}
                      title="Upload contract file"
                      aria-label={`Upload contract file for ${vendor.name}`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-ivory-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>

                    {/* Message Thread Preview */}
                    <button
                      type="button"
                      onClick={() => comingSoon('Vendor Messaging Hub', `Direct SMS and email thread with ${vendor.contactPerson || vendor.name}.`)}
                      title="Send message to vendor"
                      aria-label={`Send message to ${vendor.name}`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-ivory-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Vendor Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteVendor(vendor)}
                      aria-label={`Delete vendor ${vendor.name}`}
                      title="Delete vendor"
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

      {/* 5. Add / Edit Vendor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? "Edit Vendor Partner" : "Add Vendor Partner"}
        subtitle={
          editingVendor 
            ? "Update quotation, contact information, and linked budget categories."
            : "Record vendor quotes, contract amounts, and key contact personnel."
        }
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitVendor} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Vendor Company Name *"
              placeholder="e.g. Bella Vista Vineyards"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Select
              label="Category *"
              value={category}
              onChange={(e) => setCategory(e.target.value as VendorCategory)}
            >
              <option value="VENUE">Venue</option>
              <option value="CATERING">Catering</option>
              <option value="PHOTOGRAPHY">Photography</option>
              <option value="DECORATION">Decoration & Florals</option>
              <option value="ENTERTAINMENT">Entertainment & Music</option>
              <option value="TRANSPORT">Transport & Shuttles</option>
              <option value="VIDEOGRAPHY">Videography</option>
              <option value="MUSIC_DJ">Music / DJ</option>
              <option value="FLORIST">Florist</option>
              <option value="DECOR_STYLING">Decor & Styling</option>
              <option value="BAKER_CAKE">Bakery / Cake</option>
              <option value="RENTALS">Rentals</option>
              <option value="PERMITS">Permits & Authorization</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Primary Contact Person"
              placeholder="e.g. Clara Hughes"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />

            <Select
              label="Pipeline Status *"
              value={status}
              onChange={(e) => setStatus(e.target.value as VendorStatus)}
            >
              <option value="RESEARCHING">Researching (Exploring)</option>
              <option value="CONTACTED">Contacted (Inquiry Sent)</option>
              <option value="QUOTED">Quoted (Estimate Received)</option>
              <option value="BOOKED">Booked (Deposit / Contract Signed)</option>
              <option value="DECLINED">Declined (Unavailable / Passed)</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Phone Number"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <TextInput
              label="Email Address"
              type="email"
              placeholder="vendor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label={`Quoted Price (${event.currency || 'USD'})`}
              type="number"
              min="0"
              step="any"
              placeholder="2500"
              value={quotedPrice}
              onChange={(e) => setQuotedPrice(e.target.value)}
            />

            <TextInput
              label={`Signed Contract Amount (${event.currency || 'USD'})`}
              type="number"
              min="0"
              step="any"
              placeholder="2400"
              value={contractAmount}
              onChange={(e) => setContractAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Optional Association with Budget Category */}
            <Select
              label="Associate Quote with Budget Category (Optional)"
              value={budgetCategory}
              onChange={(e) => setBudgetCategory(e.target.value)}
            >
              <option value="">-- No direct budget link --</option>
              <option value="VENUE">Venue</option>
              <option value="CATERING">Catering</option>
              <option value="PHOTOGRAPHY">Photography</option>
              <option value="DECORATIONS">Decorations & Florals</option>
              <option value="ENTERTAINMENT">Entertainment</option>
              <option value="INVITATIONS">Invitations</option>
              <option value="TRANSPORT">Transport</option>
              <option value="CONTINGENCY">Contingency Buffer</option>
              <option value="OTHER">Other Expenses</option>
            </Select>

            <TextInput
              label="Website or Portfolio URL"
              type="url"
              placeholder="https://..."
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <Textarea
            label="Deliverables / Terms Notes"
            placeholder="Setup schedules, certificate of insurance, payment milestones, cancellation policy..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Mark as Demo simulation checkbox */}
          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="is-demo-checkbox"
              checked={isDemo}
              onChange={(e) => setIsDemo(e.target.checked)}
              className="w-4 h-4 text-plum-900 border-ivory-300 rounded focus:ring-gold-500 cursor-pointer"
            />
            <label htmlFor="is-demo-checkbox" className="text-xs text-slate-700 cursor-pointer select-none">
              Mark as simulated sample vendor (displays demo watermark badge)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-ivory-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="plum"
              size="sm"
              isLoading={isSubmitting}
            >
              {editingVendor ? "Save Changes" : "Register Vendor"}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
