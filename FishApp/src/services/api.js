import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set EXPO_PUBLIC_API_URL in your .env file or EAS build environment
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-fish-api.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds
});

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refresh = await AsyncStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refresh}` },
        });
        await AsyncStorage.setItem('access_token', data.access_token);
        error.config.headers.Authorization = `Bearer ${data.access_token}`;
        // Re-parse the body so the retry sends correct JSON
        if (typeof error.config.data === 'string') {
          try { error.config.data = JSON.parse(error.config.data); } catch { /* leave as-is */ }
        }
        return api.request(error.config);
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const register = (username, email, password) =>
  api.post('/api/auth/register', { username, email, password });

export const login = (email, password) =>
  api.post('/api/auth/login', { email, password });

export const getMe = () => api.get('/api/auth/me');

export const forgotPassword = (email) =>
  api.post('/api/auth/forgot-password', { email });

export const verifyOTP = (email, otp) =>
  api.post('/api/auth/verify-otp', { email, otp });

export const resetPassword = (email, otp, new_password) =>
  api.post('/api/auth/reset-password', { email, otp, new_password });

// ── Fish ────────────────────────────────────────────────────────────────────
export const predictFish = (base64Image, location = null) =>
  api.post('/api/fish/predict', { image: base64Image, location }, { timeout: 90000 });

export const listSpecies = (params = {}) =>
  api.get('/api/fish/species', { params });

export const getSpecies = (id) => api.get(`/api/fish/species/${id}`);

// ── History ─────────────────────────────────────────────────────────────────
export const getHistory = (page = 1, perPage = 20) =>
  api.get('/api/fish/history', { params: { page, per_page: perPage } });

export const deleteScan = (id) => api.delete(`/api/fish/history/${id}`);

// ── Image upload ─────────────────────────────────────────────────────────────
export const uploadImage = (base64Image) =>
  api.post('/api/fish/upload-image', { image: base64Image });

// ── Custom fish ─────────────────────────────────────────────────────────────
export const createCustomFish = (data) => api.post('/api/fish/custom', data);
export const listCustomFish = () => api.get('/api/fish/custom');
export const updateCustomFish = (id, data) => api.put(`/api/fish/custom/${id}`, data);
export const deleteCustomFish = (id) => api.delete(`/api/fish/custom/${id}`);

// ── Favourites ───────────────────────────────────────────────────────────────
export const addFavourite = (fishId) => api.post(`/api/fish/favourite/${fishId}`);
export const removeFavourite = (fishId) => api.delete(`/api/fish/favourite/${fishId}`);
export const listFavourites = () => api.get('/api/fish/favourites');
export const getFavouriteStatus = (fishId) => api.get(`/api/fish/favourite/${fishId}/status`);

// ── Contributions ────────────────────────────────────────────────────────────
export const contribute = (data) => api.post('/api/fish/contribute', data);

export default api;
