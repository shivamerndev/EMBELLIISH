import React, { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import cn from '../../utils/cn';

/**
 * Validates an email address.
 */
export const validateEmail = (emailStr, required = false) => {
  const str = String(emailStr || '').trim();
  if (!str) {
    if (required) return { isValid: false, error: 'Email address is required' };
    return { isValid: true, error: '' };
  }

  // Standard email validation regex requiring valid format user@domain.tld
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(str)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@domain.com)' };
  }

  return { isValid: true, error: '' };
};

export const EmailInput = ({
  value = '',
  onChange,
  name = 'email',
  required = false,
  disabled = false,
  placeholder = 'e.g. client@example.com',
  error: externalError,
  className,
  id,
  ...props
}) => {
  const [touched, setTouched] = useState(false);

  const validation = validateEmail(value, required);
  const displayError = externalError || (touched ? validation.error : '');

  const handleChange = (e) => {
    const val = e.target.value;
    const check = validateEmail(val, required);
    if (onChange) {
      onChange({
        ...e,
        target: {
          ...e.target,
          name,
          value: val,
          isValid: check.isValid,
          error: check.error,
        },
      });
    }
  };

  const handleBlur = (e) => {
    setTouched(true);
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="email"
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            'field-input w-full pr-8 transition-all duration-150',
            displayError && '!border-rose-500/80 focus:!ring-rose-500/30',
            touched && !displayError && value && '!border-emerald-500/60 focus:!ring-emerald-500/30',
            className
          )}
          {...props}
        />
        {touched && value && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {displayError ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>
        )}
      </div>

      {/* Real-time Inline Validation Message */}
      {displayError && (
        <p className="text-[11px] text-rose-400 mt-1 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
};

export default EmailInput;
