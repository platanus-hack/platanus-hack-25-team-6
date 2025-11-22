import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const recordingAPI = {
  uploadRecording: async (audioBlob, userId = null) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    if (userId) {
      formData.append('user_id', userId);
    }

    const response = await api.post('/recordings/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getRecording: async (recordingId) => {
    const response = await api.get(`/recordings/${recordingId}`);
    return response.data;
  },

  listRecordings: async (userId = null, limit = 50, skip = 0) => {
    const params = { limit, skip };
    if (userId) params.user_id = userId;

    const response = await api.get('/recordings/', { params });
    return response.data;
  },

  deleteRecording: async (recordingId) => {
    const response = await api.delete(`/recordings/${recordingId}`);
    return response.data;
  },
};

export default api;
