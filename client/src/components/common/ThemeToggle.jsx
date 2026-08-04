import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Sun, Moon } from 'lucide-react';
import { toggleTheme } from '../../features/theme/themeSlice';
import cn from '../../utils/cn';

/**
 * SaaS-grade animated dark / light mode toggle.
 * - Pill-shaped track with a sliding indicator
 * - Sun (light) / Moon (dark) icons cross-fade on toggle
 * - Matches the brand palette and header sizing
 *
 * Usage:  <ThemeToggle />
 */
const ThemeToggle = ({ className }) => {
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.theme.mode);
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      id="theme-toggle-btn"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => dispatch(toggleTheme())}
      className={cn(
        'relative inline-flex items-center h-7 w-[52px] rounded-full border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 shrink-0',
        isDark
          ? 'bg-[#251e18] border-[#3d3026]'
          : 'bg-amber-50 border-amber-200',
        className
      )}
    >
      {/* Sliding indicator pill */}
      <span
        className={cn(
          'absolute top-0.5 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm',
          isDark
            ? 'left-0.5 bg-[#3d3026]'
            : 'left-[22px] bg-white shadow-amber-200/60'
        )}
      >
        {/* Moon icon — visible in dark mode */}
        <Moon
          className={cn(
            'absolute w-3.5 h-3.5 text-brand-300 transition-all duration-300',
            isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          )}
        />
        {/* Sun icon — visible in light mode */}
        <Sun
          className={cn(
            'absolute w-3.5 h-3.5 text-amber-500 transition-all duration-300',
            isDark ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
          )}
        />
      </span>

      {/* Background icon (opposite side) */}
      <span
        className={cn(
          'absolute transition-all duration-300',
          isDark ? 'right-1.5' : 'left-1.5'
        )}
      >
        {isDark ? (
          <Sun className="w-3 h-3 text-stone-600" />
        ) : (
          <Moon className="w-3 h-3 text-amber-300" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
