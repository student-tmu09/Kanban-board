import api from "./axios";

export const createTask = (boardId, data) =>
  api.post(`/boards/${boardId}/tasks`, data);

export const getBoardTasks = (boardId, params = {}) =>
  api.get(`/boards/${boardId}/tasks`, { params });

export const getTaskById = (taskId) => api.get(`/tasks/${taskId}`);
export const updateTask = (taskId, data) => api.patch(`/tasks/${taskId}`, data);
export const moveTask = (taskId, data) => api.patch(`/tasks/${taskId}/move`, data);
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);