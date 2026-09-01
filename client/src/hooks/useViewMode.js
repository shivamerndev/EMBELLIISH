import { useState, useEffect } from 'react';

const STORAGE_KEY = 'embellish_erp_view_mode';

/**
 * Custom React hook to manage global and per-screen ERP view mode (table vs cards).
 * Defaults to 'table' view and persists user choice in localStorage.
 *
 * @param {'table' | 'cards'} [defaultMode='table']
 * @returns {[ 'table' | 'cards', (mode: 'table' | 'cards') => void ]}
 */
export function useViewMode(defaultMode = 'table') {
  const [viewMode, setViewModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'cards' || saved === 'table' ? saved : defaultMode;
    } catch {
      return defaultMode;
    }
  });

  const setViewMode = (mode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Could not save view mode preference to localStorage:', e);
    }
  };

  return [viewMode, setViewMode];
}

export default useViewMode;
