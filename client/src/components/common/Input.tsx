import React, { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, leftIcon, rightIcon, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-800 tracking-tight">
            {label}
            {props.required && <span className="text-rose-600 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative rounded-xl">
          {leftIcon && (
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'w-full py-2 text-sm bg-white border border-ivory-300 rounded-xl transition-all duration-150',
              'placeholder:text-slate-400 text-slate-900',
              'focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500',
              leftIcon ? 'pl-9' : 'px-3.5',
              rightIcon ? 'pr-9' : 'px-3.5',
              error && 'border-rose-400 focus:ring-rose-400/20 focus:border-rose-500',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              {rightIcon}
            </span>
          )}
        </div>
        {error ? (
          <p id={errorId} className="text-xs text-rose-600 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-800 tracking-tight">
            {label}
            {props.required && <span className="text-rose-600 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3.5 py-2 text-sm bg-white border border-ivory-300 rounded-xl transition-all duration-150 resize-y min-h-[80px]',
            'placeholder:text-slate-400 text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500',
            error && 'border-rose-400 focus:ring-rose-400/20 focus:border-rose-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helperText, error, id, children, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-800 tracking-tight">
            {label}
            {props.required && <span className="text-rose-600 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm bg-white border border-ivory-300 rounded-xl transition-all duration-150',
            'text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500',
            error && 'border-rose-400 focus:ring-rose-400/20 focus:border-rose-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
