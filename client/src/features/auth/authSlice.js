import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../api';

const storedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('embellish_user')) || null;
  } catch {
    return null;
  }
};

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await authApi.login(credentials);
    return response.data;
  } catch (error) {
    return rejectWithValue(error);
  }
});

/** Re-validates the stored token on boot; a stale one signs the user out. */
export const loadProfile = createAsyncThunk('auth/loadProfile', async (_, { rejectWithValue }) => {
  try {
    const response = await authApi.profile();
    return response.data;
  } catch (error) {
    return rejectWithValue(error);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser(),
    token: localStorage.getItem('embellish_token'),
    status: 'idle',
    error: null,
    initialised: false,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('embellish_token');
      localStorage.removeItem('embellish_user');
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'idle';
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.initialised = true;
        localStorage.setItem('embellish_token', action.payload.token);
        localStorage.setItem('embellish_user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload || { message: 'Sign in failed' };
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.initialised = true;
        localStorage.setItem('embellish_user', JSON.stringify(action.payload));
      })
      .addCase(loadProfile.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.initialised = true;
        localStorage.removeItem('embellish_token');
        localStorage.removeItem('embellish_user');
      });
  },
});

export const { logout, clearError } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => Boolean(state.auth.token && state.auth.user);

/** True when the signed-in user holds every listed permission. */
export const selectCan = (...permissions) => (state) => {
  const granted = new Set(state.auth.user?.permissions || []);
  return permissions.every((permission) => granted.has(permission));
};

export default authSlice.reducer;
