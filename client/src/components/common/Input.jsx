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
    <div className={`flex flex-col gap-1.5 w-full text-left ${className}`}>
      {label && (
        <label htmlFor={name} className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        type={type}
        name={name}
        id={name}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-950/70 border text-slate-100 placeholder:text-slate-600 transition-all duration-200 focus:outline-none
          ${error 
            ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
            : 'border-slate-800 focus:border-brand-purple/70 focus:ring-2 focus:ring-brand-purple/15 hover:border-slate-700'
          }`}
        {...props}
      />
      
      {error && (
        <span className="text-[11px] text-rose-400 font-medium mt-0.5">
          {error.message || error}
        </span>
      )}
      
      {!error && helperText && (
        <span className="text-[11px] text-slate-500 mt-0.5">
          {helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
