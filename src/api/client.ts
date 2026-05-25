import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
});
