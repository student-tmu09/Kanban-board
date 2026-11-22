import api from "./axios";

export const addMember = (workspaceId, data) =>
  api.post(`/workspaces/${workspaceId}/members`, data);

export const getMembers = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}/members`);

export const getAvailableUsers = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}/available-users`);

export const updateMemberRole = (workspaceId, userId, data) =>
  api.patch(`/workspaces/${workspaceId}/members/${userId}`, data);

export const removeMember = (workspaceId, userId) =>
  api.delete(`/workspaces/${workspaceId}/members/${userId}`);