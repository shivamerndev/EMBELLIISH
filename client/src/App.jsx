import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './app/store';
import AppRoutes from './routes';
import { loadProfile } from './features/auth/authSlice';
import { loadMeta } from './features/meta/metaSlice';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Import themeSlice so the theme class is applied to <html>
// as early as possible (before first render), preventing FOUC.
import './features/theme/themeSlice';

/**
 * On boot: re-validate any stored token, and pull the workflow vocabulary the
 * screens label themselves with.
 */
const Bootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    if (token) {
      dispatch(loadProfile());
      dispatch(loadMeta());
    }
  }, [dispatch, token]);

  return children;
};

export const App = () => (
  <Provider store={store}>
    <BrowserRouter>
      <Bootstrap>
        <AppRoutes />
        <PWAInstallPrompt />
      </Bootstrap>
    </BrowserRouter>
  </Provider>
);

export default App;
