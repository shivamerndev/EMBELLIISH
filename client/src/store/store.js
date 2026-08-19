import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import metaReducer from '../features/meta/metaSlice';
import themeReducer from '../features/theme/themeSlice';
import salesReducer from "../features/sales/sales.slice.js"



/**
 * Redux holds only what is genuinely global: who is signed in, and the workflow
 * vocabulary from the server. Page data is fetched per screen with `useAsync`,
 * which keeps a screen's data next to the screen that needs it.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    meta: metaReducer,
    theme: themeReducer,
    sales: salesReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

export default store;
