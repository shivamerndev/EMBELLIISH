import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('embellish_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  // Every endpoint answers with `{ success, message, data }`; unwrap it once here
  // so no component has to reach through `response.data.data`.
  (response) => response.data,
  (error) => {
    const payload = error.response?.data;

    if (error.response?.status === 401) {
      localStorage.removeItem('embellish_token');
      localStorage.removeItem('embellish_user');
      // Guard against a redirect loop when the failing call *is* the sign-in.
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.assign('/auth/login');
      }
    }

    return Promise.reject({
      message: payload?.message || error.message || 'Something went wrong',
      errors: payload?.errors || null,
      status: error.response?.status,
    });
  }
);

export default api;
