import React from 'react';
import { cn } from '../../utils/cn.js';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-ivory-200 via-ivory-100 to-ivory-200 rounded-xl',
        className
      )}
    />
  );
};

export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="p-6 bg-white rounded-2xl border border-ivory-200 space-y-4 shadow-soft">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
      <div className="pt-2 flex justify-between items-center">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 p-6 space-y-4 shadow-soft">
      <div className="flex justify-between items-center pb-2 border-b border-ivory-200">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-ivory-100">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};
