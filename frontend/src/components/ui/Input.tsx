'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-2 rounded-lg focus:outline-none transition-colors ${className}`}
        style={{
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          background: 'var(--surface-light)',
          color: 'var(--foreground)'
        }}
        {...props}
      />
      {error && <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
