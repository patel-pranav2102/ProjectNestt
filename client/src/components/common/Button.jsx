import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 font-sans tracking-tight';
  
  const variants = {
    primary: 'bg-brand-purple hover:bg-violet-600 text-white shadow-md shadow-purple-500/10 focus:ring-2 focus:ring-purple-500/40',
    secondary: 'bg-slate-900/80 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 focus:ring-2 focus:ring-slate-700',
    accent: 'bg-gradient-to-r from-brand-purple to-indigo-600 hover:opacity-95 text-white shadow-md focus:ring-2 focus:ring-indigo-500/40',
    danger: 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-sm focus:ring-2 focus:ring-rose-500/40',
    outline: 'border border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-700 focus:ring-2 focus:ring-slate-700',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-900/60',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-semibold',
    md: 'px-4 py-2 text-xs font-bold',
    lg: 'px-5 py-2.5 text-sm font-bold',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-3.5 w-3.5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
