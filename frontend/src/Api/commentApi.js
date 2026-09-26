import api from "./axios";

export const createComment = (taskId, data) =>
  api.post(`/tasks/${taskId}/comments`, data);

export const getTaskComments = (taskId) =>
  api.get(`/tasks/${taskId}/comments`);

export const updateComment = (commentId, data) =>
  api.patch(`/comments/${commentId}`, data);

export const deleteComment = (commentId) =>
  api.delete(`/comments/${commentId}`);