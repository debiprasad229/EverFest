import React from 'react';
import { cn } from '../../utils/cn.js';

interface ProgressBarProps {
  value: number; // 0 to 100
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
  colorVariant?: 'plum' | 'gold' | 'emerald' | 'amber' | 'rose' | 'auto';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className,
  barClassName,
  showLabel = false,
  colorVariant = 'plum',
}) => {
  const clamped = Math.min(Math.max(value, 0), 100);

  let fillColor = 'bg-plum-800';
  if (colorVariant === 'gold') fillColor = 'bg-gold-500';
  if (colorVariant === 'emerald') fillColor = 'bg-emerald-600';
  if (colorVariant === 'amber') fillColor = 'bg-amber-500';
  if (colorVariant === 'rose') fillColor = 'bg-rose-500';
  if (colorVariant === 'auto') {
    if (clamped >= 100) fillColor = 'bg-emerald-600';
    else if (clamped >= 75) fillColor = 'bg-plum-800';
    else if (clamped >= 40) fillColor = 'bg-gold-500';
    else fillColor = 'bg-ivory-400';
  }

  return (
    <div className={cn('w-full', className)}>
      <div 
        role="progressbar" 
        aria-valuenow={Math.round(clamped)} 
        aria-valuemin={0} 
        aria-valuemax={100}
        className="w-full bg-ivory-200 rounded-full h-2.5 overflow-hidden shadow-inner"
      >
        <div
          className={cn('h-full transition-all duration-500 rounded-full', fillColor, barClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-slate-500 mt-1 font-medium">
          <span>Progress</span>
          <span className="font-mono font-semibold text-slate-800">{Math.round(clamped)}%</span>
        </div>
      )}
    </div>
  );
};
