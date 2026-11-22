import api from "./axios";

export const registerUser = (data) => api.post("/register", data);
export const verifyOtp = (data) => api.post("/verify-otp", data);
export const resendOtp = (data) => api.post("/resend-otp", data);
export const loginUser = (data) => api.post("/login", data);
export const logoutUser = () => api.post("/logout");
export const getCurrentUser = () => api.get("/getcurrentuser");
