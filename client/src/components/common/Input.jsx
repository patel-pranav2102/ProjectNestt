import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  type = 'text',
  placeholder = '',
  name,
  error,
  helperText,
  className = '',
  required = false,
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1 w-full text-left ${className}`}>
      {label && (
        <label htmlFor={name} className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        type={type}
        name={name}
        id={name}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-purple/20
          ${error 
            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' 
            : 'border-slate-800 focus:border-brand-purple'
          }`}
        {...props}
      />
      
      {error && (
        <span className="text-xs text-rose-500 font-medium mt-0.5">
          {error.message || error}
        </span>
      )}
      
      {!error && helperText && (
        <span className="text-xs text-slate-400 mt-0.5">
          {helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
