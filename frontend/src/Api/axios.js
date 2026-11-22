import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true,
});

// Request interceptor: Attach token from localStorage if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("kanban_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      "API Error:",
      error.response?.status,
      error.response?.data
    );

    if (error.response?.status === 401) {
      console.log("Unauthorized request");
    }

    return Promise.reject(error);
  }
);

export default api;