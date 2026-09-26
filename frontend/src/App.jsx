import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Board from "./pages/Board";
import Notifications from "./pages/Notifications";

import ProtectedRoute from "./components/protectedroute";

export default function App() {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workspace/:workspaceId" element={<Workspace />} />
        <Route path="/board/:boardId" element={<Board />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      {/* Website open karne par */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Invalid URL */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}