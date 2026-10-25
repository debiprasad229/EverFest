import React from 'react';
import { Button } from './Button.js';
import { cn } from '../../utils/cn.js';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-ivory-300 bg-white/60 flex flex-col items-center justify-center max-w-lg mx-auto',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-plum-50 border border-plum-100 flex items-center justify-center text-plum-800 mb-4 shadow-soft">
        {icon}
      </div>
      <h4 className="text-base font-bold font-serif text-slate-900 tracking-tight mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-600 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {actionLabel && onAction && (
          <Button variant="plum" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
