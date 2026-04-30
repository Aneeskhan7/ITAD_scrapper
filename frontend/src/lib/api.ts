import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && !refreshing) {
      original._retry = true;
      refreshing = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        useAuthStore.getState().setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        refreshing = false;
        return api(original);
      } catch {
        refreshing = false;
        useAuthStore.getState().clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);
