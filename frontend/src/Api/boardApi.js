import api from "./axios";

export const createBoard = (workspaceId, data) =>
  api.post(`/workspaces/${workspaceId}/boards`, data);

export const getWorkspaceBoards = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}/boards`);

export const getBoardById = (boardId) => api.get(`/boards/${boardId}`);
export const updateBoard = (boardId, data) => api.patch(`/boards/${boardId}`, data);
export const deleteBoard = (boardId) => api.delete(`/boards/${boardId}`);