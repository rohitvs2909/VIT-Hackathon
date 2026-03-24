import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const AI_GENERATION_TIMEOUT = 180000;

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create multipart form-data client for file uploads
const uploadClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Image API - NEW FOR AI REDESIGN
export const imageAPI = {
  // Upload room image
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('roomImage', file);
    return uploadClient.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Generate AI room redesign
  generateDesign: (designData) =>
    apiClient.post('/images/generate', designData, { timeout: AI_GENERATION_TIMEOUT }),

  // Generate AI redesign directly from user prompt (chatbot flow)
  generateFromPrompt: (payload) =>
    apiClient.post('/generate-image', payload, { timeout: AI_GENERATION_TIMEOUT }),

  // Generate from fixed cloudinary URL via backend Hugging Face flow
  generateCloudinaryDesign: () =>
    apiClient.get('/images/generate-image', { timeout: AI_GENERATION_TIMEOUT }),

  // Regenerate with different parameters
  regenerateDesign: (imageId, designData) =>
    apiClient.post('/images/regenerate', { imageId, ...designData }, { timeout: AI_GENERATION_TIMEOUT }),

  // Get provider status
  getProviderStatus: () => apiClient.get('/images/provider-status'),

  // Serve generated images (used as img src)
  getImageUrl: (filename) => `${API_BASE}/images/uploads/${filename}`,
};

// Styles API
export const stylesAPI = {
  getAll: () => apiClient.get('/styles'),
  getById: (styleId) => apiClient.get(`/styles/${styleId}`),
};

// Furniture API
export const furnitureAPI = {
  getAll: () => apiClient.get('/furniture'),
  getByCategory: (category) => apiClient.get(`/furniture/category/${category}`),
  search: (query, filters = {}) => apiClient.get('/furniture/search', { params: { query, ...filters } }),
  getById: (id) => apiClient.get(`/furniture/${id}`),
};

// Plans API
export const plansAPI = {
  getAll: () => apiClient.get('/plans'),
  analyzeRoom: (roomData) => apiClient.post('/plans/analyze', roomData),
  generatePlan: (data) => apiClient.post('/plans/generate', data),
  customizePlan: (planId, modifications) => apiClient.put(`/plans/${planId}/customize`, modifications),
};

// Projects API
export const projectsAPI = {
  getAll: () => apiClient.get('/projects'),
  getById: (projectId) => apiClient.get(`/projects/${projectId}`),
  create: (projectData) => apiClient.post('/projects', projectData),
  update: (projectId, data) => apiClient.put(`/projects/${projectId}`, data),
  delete: (projectId) => apiClient.delete(`/projects/${projectId}`),
};

// Analysis API
export const analysisAPI = {
  getMetrics: (planId) => apiClient.get(`/analysis/metrics/${planId}`),
  calculateBudget: (budgetData) => apiClient.post('/analysis/budget', budgetData),
  getSpaceReport: (spaceData) => apiClient.post('/analysis/space-report', spaceData),
};

// Health check
export const healthCheck = () => apiClient.get('/health');

export default apiClient;

