
import axios from 'axios';

// API base URL
const API_BASE_URL = "http://localhost:5000/api";

// MongoDB connection string (for backend implementation)
export const MONGO_URI = "mongodb://127.0.0.1:27017/outingApp";

// Create an axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

// Add a request interceptor to include auth tokens if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', error.response.data);
      
      // Handle 401 Unauthorized errors by redirecting to login
      if (error.response.status === 401) {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userDetails');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Error Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Backend auth endpoints
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (userData: any) => api.post('/auth/register', userData),
};

// Student endpoints
export const studentAPI = {
  getById: (id: string) => api.get(`/students/${id}`),
  getAll: () => api.get('/students'),
  getCount: (role: string, id: string) => api.get(`/students/count/${role}/${id}`),
};

// Outing request endpoints
export const outingAPI = {
  getByStudent: (studentId: string) => api.get(`/outings/student/${studentId}`),
  getByApprover: (role: string, approverId: string) => api.get(`/outings/${role}/${approverId}`),
  create: (outingData: any) => api.post('/outings', outingData),
  approve: (requestId: string, approverId: string, role: string) => 
    api.post(`/outings/${requestId}/approve`, { approverId, role }),
  deny: (requestId: string, approverId: string, role: string) => 
    api.post(`/outings/${requestId}/deny`, { approverId, role }),
  scan: (requestId: string, action: 'out' | 'in') => 
    api.post(`/outings/${requestId}/scan/${action}`),
};
