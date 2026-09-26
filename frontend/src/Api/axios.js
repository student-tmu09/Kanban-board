import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,

});

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