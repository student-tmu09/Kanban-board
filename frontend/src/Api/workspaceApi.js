import api from "./axios";

export const createWorkspace = (data) => api.post("/createworkspace", data);
export const getWorkspaces = () => api.get("/workspaces");
export const getWorkspaceById = (id) => api.get(`/workspaces/${id}`);
export const updateWorkspace = (id, data) => api.patch(`/workspaces/${id}`, data);
export const deleteWorkspace = (id) => api.delete(`/workspaces/${id}`);
export const getDashboard = (id) => api.get(`/workspaces/${id}/dashboard`);