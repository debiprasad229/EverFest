import React, { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'ivory' | 'elevated' | 'gold_accent';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  interactive = false,
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-white border border-ivory-200/90 shadow-soft',
    ivory: 'bg-ivory-50/80 border border-ivory-200 shadow-soft',
    elevated: 'bg-white border border-ivory-200 shadow-elevated',
    gold_accent: 'bg-white border-t-2 border-t-gold-500 border-x border-b border-ivory-200 shadow-soft',
  };

  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-200 overflow-hidden',
        variants[variant],
        interactive && 'hover:shadow-elevated hover:border-plum-800/20 cursor-pointer active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('p-5 sm:p-6 pb-3 flex items-center justify-between gap-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => (
  <h3 className={cn('text-base sm:text-lg font-bold font-serif text-slate-900 tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<HTMLAttributes<HTMLParagraphElement>> = ({ className, children, ...props }) => (
  <p className={cn('text-xs text-slate-500 leading-relaxed mt-0.5', className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('p-5 sm:p-6 pt-0', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('p-4 sm:p-5 pt-3 border-t border-ivory-200/80 bg-ivory-50/50 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);
