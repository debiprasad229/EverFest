import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button.js';
import { cn } from '../../utils/cn.js';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error while communicating with the service.',
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'p-8 rounded-2xl border border-rose-200 bg-rose-50/50 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold font-serif text-slate-900 mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-600 mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
