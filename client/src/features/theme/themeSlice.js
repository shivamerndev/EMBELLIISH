import { createSlice } from '@reduxjs/toolkit';

/**
 * Reads the saved theme from localStorage, defaulting to 'dark'
 * (preserves the existing experience for returning users).
 */
const savedTheme = localStorage.getItem('embelliish-theme') || 'dark';

/**
 * Apply the theme class to <html> immediately (before any renders).
 * Called here so the Redux slice itself syncs the DOM on import.
 */
const applyTheme = (mode) => {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('embelliish-theme', mode);
};

// Apply on module load (avoids flash of wrong theme)
applyTheme(savedTheme);

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: savedTheme, // 'dark' | 'light'
  },
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      applyTheme(state.mode);
    },
    setTheme(state, action) {
      state.mode = action.payload;
      applyTheme(state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
