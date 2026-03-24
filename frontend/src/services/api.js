import axios from 'axios';
import { notifyAuthExpired } from './authEvents';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api'
});

// Attach token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

API.interceptors.response.use(
    (response) => {
        const payload = response.data;
        if (payload && typeof payload === 'object' && 'success' in payload) {
            response.message = payload.message;
            response.pagination = payload.pagination;
            response.meta = payload.meta;
            response.data = payload.data;
        }
        return response;
    },
    (error) => {
        if (error?.response?.status === 401 && localStorage.getItem('token')) {
            notifyAuthExpired();
        }
        return Promise.reject(error);
    }
);

export default API;
