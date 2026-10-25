import React from 'react';
import { cn } from '../../utils/cn.js';
import { EventType, TaskPriority, TaskStatus, PaymentStatus, VendorStatus } from '../../types/index.js';
import { Sparkles } from 'lucide-react';

interface BadgeProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'plum' | 'gold' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-ivory-200/80 text-slate-800 border-ivory-300',
    plum: 'bg-plum-50 text-plum-800 border-plum-200/70',
    gold: 'bg-gold-50 text-gold-800 border-gold-300/80',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    danger: 'bg-rose-50 text-rose-800 border-rose-200/80',
    info: 'bg-sky-50 text-sky-800 border-sky-200/80',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-tight',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export const EventTypeBadge: React.FC<{ type: EventType; className?: string }> = ({ type, className }) => {
  const configs: Record<EventType, { label: string; icon: string; className: string }> = {
    WEDDING: { label: 'Wedding', icon: '💍', className: 'bg-plum-50 text-plum-900 border-plum-200' },
    BIRTHDAY: { label: 'Birthday', icon: '🎂', className: 'bg-gold-50 text-gold-900 border-gold-300' },
    ANNIVERSARY: { label: 'Anniversary', icon: '🥂', className: 'bg-ivory-200 text-plum-950 border-ivory-300' },
    COMMUNITY: { label: 'Community Fest', icon: '🎪', className: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
    OTHER: { label: 'Celebration', icon: '🎉', className: 'bg-ivory-100 text-slate-800 border-ivory-300' },
  };

  const c = configs[type] || configs.OTHER;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-soft', c.className, className)}>
      <span aria-hidden="true">{c.icon}</span>
      <span>{c.label}</span>
    </span>
  );
};

export const DemoDataBadge: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gold-100 text-gold-950 border border-gold-400 shadow-soft', className)}>
      <Sparkles className="w-3 h-3 text-gold-600 fill-gold-400" />
      <span>Demo Data</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const map: Record<TaskPriority, { variant: 'default' | 'info' | 'warning' | 'danger'; label: string }> = {
    LOW: { variant: 'default', label: 'Low' },
    MEDIUM: { variant: 'info', label: 'Medium' },
    HIGH: { variant: 'warning', label: 'High' },
    URGENT: { variant: 'danger', label: 'Urgent' },
  };
  const { variant, label } = map[priority] || map.MEDIUM;
  return <Badge variant={variant}>{label}</Badge>;
};

export const TaskStatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const map: Record<TaskStatus, { variant: 'default' | 'info' | 'success'; label: string }> = {
    TODO: { variant: 'default', label: 'To Do' },
    IN_PROGRESS: { variant: 'info', label: 'In Progress' },
    COMPLETED: { variant: 'success', label: 'Done' },
  };
  const { variant, label } = map[status] || map.TODO;
  return <Badge variant={variant}>{label}</Badge>;
};

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const map: Record<PaymentStatus, { variant: 'danger' | 'warning' | 'success'; label: string }> = {
    UNPAID: { variant: 'danger', label: 'Unpaid' },
    DEPOSIT_PAID: { variant: 'warning', label: 'Deposit Paid' },
    PAID_IN_FULL: { variant: 'success', label: 'Paid in Full' },
  };
  const { variant, label } = map[status] || map.UNPAID;
  return <Badge variant={variant}>{label}</Badge>;
};

export const VendorStatusBadge: React.FC<{ status: VendorStatus }> = ({ status }) => {
  const map: Record<VendorStatus, { variant: 'default' | 'info' | 'plum' | 'success' | 'danger'; label: string }> = {
    RESEARCHING: { variant: 'default', label: 'Researching' },
    CONTACTED: { variant: 'info', label: 'Contacted' },
    QUOTED: { variant: 'plum', label: 'Quoted' },
    BOOKED: { variant: 'success', label: 'Booked' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    DECLINED: { variant: 'danger', label: 'Declined' },
  };
  const { variant, label } = map[status] || map.RESEARCHING;
  return <Badge variant={variant}>{label}</Badge>;
};
