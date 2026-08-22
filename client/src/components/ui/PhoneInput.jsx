import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import cn from '../../utils/cn';

export const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', label: 'India (+91)', digits: 10 },
  { code: '+1', country: 'US', flag: '🇺🇸', label: 'US/Canada (+1)', digits: 10 },
  { code: '+44', country: 'GB', flag: '🇬🇧', label: 'UK (+44)', digits: 10 },
  { code: '+971', country: 'AE', flag: '🇦🇪', label: 'UAE (+971)', digits: 9 },
  { code: '+65', country: 'SG', flag: '🇸🇬', label: 'Singapore (+65)', digits: 8 },
  { code: '+61', country: 'AU', flag: '🇦🇺', label: 'Australia (+61)', digits: 9 },
  { code: '+966', country: 'SA', flag: '🇸🇦', label: 'Saudi Arabia (+966)', digits: 9 },
  { code: '+974', country: 'QA', flag: '🇶🇦', label: 'Qatar (+974)', digits: 8 },
  { code: '+968', country: 'OM', flag: '🇴🇲', label: 'Oman (+968)', digits: 8 },
  { code: '+965', country: 'KW', flag: '🇰🇼', label: 'Kuwait (+965)', digits: 8 },
  { code: '+973', country: 'BH', flag: '🇧🇭', label: 'Bahrain (+973)', digits: 8 },
  { code: '+49', country: 'DE', flag: '🇩🇪', label: 'Germany (+49)', digits: 10 },
  { code: '+33', country: 'FR', flag: '🇫🇷', label: 'France (+33)', digits: 9 },
  { code: '+81', country: 'JP', flag: '🇯🇵', label: 'Japan (+81)', digits: 10 },
  { code: '+86', country: 'CN', flag: '🇨🇳', label: 'China (+86)', digits: 11 },
  { code: '+852', country: 'HK', flag: '🇭🇰', label: 'Hong Kong (+852)', digits: 8 },
  { code: '+60', country: 'MY', flag: '🇲🇾', label: 'Malaysia (+60)', digits: 9 },
  { code: '+64', country: 'NZ', flag: '🇳🇿', label: 'New Zealand (+64)', digits: 9 },
  { code: '+977', country: 'NP', flag: '🇳🇵', label: 'Nepal (+977)', digits: 10 },
  { code: '+94', country: 'LK', flag: '🇱🇰', label: 'Sri Lanka (+94)', digits: 9 },
  { code: '+880', country: 'BD', flag: '🇧🇩', label: 'Bangladesh (+880)', digits: 10 },
];

/**
 * Parse incoming phone string into countryCode and nationalNumber
 */
const parsePhoneString = (rawVal, defaultCode = '+91') => {
  const str = String(rawVal || '').trim();
  if (!str) return { countryCode: defaultCode, nationalNumber: '' };

  // Check matching country code (longest first)
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const item of sortedCodes) {
    if (str.startsWith(item.code)) {
      const rest = str.slice(item.code.length).trim();
      return { countryCode: item.code, nationalNumber: rest.replace(/\D/g, '') };
    }
  }

  // If starts with '+' but not in list
  if (str.startsWith('+')) {
    const parts = str.split(' ');
    if (parts.length > 1) {
      return { countryCode: parts[0], nationalNumber: parts.slice(1).join('').replace(/\D/g, '') };
    }
  }

  // Fallback: default code, raw string is national number
  return { countryCode: defaultCode, nationalNumber: str.replace(/\D/g, '') };
};

/**
 * Validates a phone number according to country code rules.
 */
export const validatePhoneNumber = (numberStr, countryCode = '+91', required = false) => {
  const parsed = parsePhoneString(numberStr, countryCode);
  const code = parsed.countryCode || countryCode;
  const digits = parsed.nationalNumber;

  if (!digits) {
    if (required) return { isValid: false, error: 'Phone number is required' };
    return { isValid: true, error: '' };
  }

  if (code === '+91') {
    if (digits.length !== 10) {
      return { isValid: false, error: 'Mobile number must be exactly 10 digits' };
    }
    if (!/^[6-9]/.test(digits)) {
      return { isValid: false, error: 'Mobile number must start with 6, 7, 8, or 9' };
    }
    return { isValid: true, error: '' };
  }

  const countryObj = COUNTRY_CODES.find((c) => c.code === code);
  if (countryObj?.digits && digits.length !== countryObj.digits) {
    return { isValid: false, error: `${countryObj.label} should be ${countryObj.digits} digits` };
  }

  if (digits.length < 7 || digits.length > 15) {
    return { isValid: false, error: 'Phone number must be between 7 and 15 digits' };
  }

  return { isValid: true, error: '' };
};

export const PhoneInput = ({
  value = '',
  onChange,
  name = 'phone',
  required = false,
  disabled = false,
  placeholder,
  error: externalError,
  className,
  id,
  defaultCountry = '+91',
  ...props
}) => {
  const [countryCode, setCountryCode] = useState(defaultCountry);
  const [nationalNumber, setNationalNumber] = useState('');
  const [touched, setTouched] = useState(false);

  // Sync internal state when parent value changes
  useEffect(() => {
    const parsed = parsePhoneString(value, defaultCountry);
    setCountryCode(parsed.countryCode);
    setNationalNumber(parsed.nationalNumber);
  }, [value, defaultCountry]);

  const validation = validatePhoneNumber(nationalNumber, countryCode, required);
  const displayError = externalError || (touched ? validation.error : '');

  const emitChange = (newCode, newNumber) => {
    const cleanDigits = newNumber.replace(/\D/g, '');
    const fullValue = cleanDigits ? `${newCode} ${cleanDigits}` : '';
    const check = validatePhoneNumber(cleanDigits, newCode, required);

    if (onChange) {
      onChange({
        target: {
          name,
          value: fullValue,
          countryCode: newCode,
          nationalNumber: cleanDigits,
          isValid: check.isValid,
          error: check.error,
        },
      });
    }
  };

  const handleCountryChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    setTouched(true);
    emitChange(newCode, nationalNumber);
  };

  const handleNumberChange = (e) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '');
    setNationalNumber(digitsOnly);
    setTouched(true);
    emitChange(countryCode, digitsOnly);
  };

  const handleBlur = (e) => {
    setTouched(true);
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {/* Country Code Dropdown */}
        <select
          value={countryCode}
          onChange={handleCountryChange}
          disabled={disabled}
          className={cn(
            'field-input !w-auto !py-2 !px-2 text-xs font-semibold shrink-0 cursor-pointer transition-all duration-150',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            minWidth: '105px',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            borderColor: displayError ? '#f43f5e' : 'var(--border-strong)',
          }}
          aria-label="Country Code"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} ({c.country})
            </option>
          ))}
        </select>

        {/* Number Input */}
        <div className="relative flex-1">
          <input
            type="tel"
            id={id}
            name={name}
            value={nationalNumber}
            onChange={handleNumberChange}
            onBlur={handleBlur}
            placeholder={placeholder || (countryCode === '+91' ? '9876543210' : 'Phone number')}
            disabled={disabled}
            required={required}
            className={cn(
              'field-input w-full pr-8 transition-all duration-150',
              displayError && '!border-rose-500/80 focus:!ring-rose-500/30',
              touched && !displayError && nationalNumber && '!border-emerald-500/60 focus:!ring-emerald-500/30',
              className
            )}
            {...props}
          />
          {touched && nationalNumber && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {displayError ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Inline Validation Error */}
      {displayError && (
        <p className="text-[11px] text-rose-400 mt-1 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
