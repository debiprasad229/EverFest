import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'plum' | 'gold' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'plum',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2';

    const variants = {
      plum: 'bg-plum-800 hover:bg-plum-900 text-white shadow-soft hover:shadow border border-plum-900/30',
      gold: 'bg-gold-500 hover:bg-gold-600 text-plum-950 font-semibold shadow-soft hover:shadow border border-gold-600/30',
      secondary: 'bg-ivory-100 hover:bg-ivory-200 text-slate-800 border border-ivory-300/80 shadow-soft',
      outline: 'bg-transparent border border-plum-800/30 text-plum-800 hover:bg-plum-50',
      ghost: 'bg-transparent text-slate-700 hover:bg-ivory-200/80 hover:text-slate-900',
      danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200',
    };

    const sizes = {
      xs: 'text-xs px-2.5 py-1.5 gap-1.5',
      sm: 'text-xs px-3.5 py-2 gap-2 font-semibold',
      md: 'text-sm px-4 py-2.5 gap-2 font-semibold',
      lg: 'text-base px-6 py-3 gap-2.5 font-bold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
