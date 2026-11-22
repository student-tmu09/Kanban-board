import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { createWorkspace, getWorkspaces, getUserDashboardSummary } from "../Api/workspaceApi";
import { unwrap } from "../utils/response";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  IconPlus,
  IconFolder,
  IconKanban,
  IconBell,
  IconCheck,
  IconSparkles,
  IconSearch,
  IconArrowRight
} from "../components/Icons";

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [summary, setSummary] = useState({
    totalWorkspaces: 0,
    totalBoards: 0,
    assignedTasks: 0,
    completedTasks: 0,
    unreadNotifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", slug: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [resWs, resSum] = await Promise.allSettled([
        getWorkspaces(),
        getUserDashboardSummary()
      ]);

      if (resWs.status === "fulfilled") {
        setWorkspaces(unwrap(resWs.value, []));
      }
      if (resSum.status === "fulfilled") {
        setSummary(unwrap(resSum.value, {}));
      }
    } catch (e) {
      setError(e.response?.data?.message || "Could not load workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto generate slug from workspace name
  const handleNameChange = (name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setForm({ name, slug });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSubmitting(true);
      setError("");
      const res = await createWorkspace(form);
      const created = unwrap(res, null);
      showToast(`Workspace "${form.name}" created!`, "success");
      setOpen(false);
      setForm({ name: "", slug: "" });
      await load();
      if (created?._id) {
        navigate(`/workspace/${created._id}`);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Workspace creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout
      title="Dashboard"
      right={
        <button
          className="btn-primary"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          <IconPlus size={16} />
          <span>New Workspace</span>
        </button>
      }
    >
      {/* Hero Welcome Banner (Clean, no duplicate button) */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-tag">
            <IconSparkles size={14} />
            <span>Project Command Center</span>
          </div>
          <h2>
            Welcome back, <span>{user?.name || "Collaborator"}</span> 👋
          </h2>
          <p>
            Track your workspaces, boards, and assigned tasks in one unified dashboard.
          </p>
        </div>
      </div>

      {error && <div className="alert-box alert-error">{error}</div>}

      {/* Meaningful Real Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-purple">
            <IconFolder size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-num">{workspaces.length}</span>
            <span className="stat-name">Active Workspaces</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-blue">
            <IconKanban size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-num">{summary.totalBoards ?? 0}</span>
            <span className="stat-name">Total Boards</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-amber">
            <IconCheck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-num">{summary.assignedTasks ?? 0}</span>
            <span className="stat-name">Tasks Assigned to You</span>
          </div>
        </div>

        <Link to="/notifications" className="stat-card" style={{ cursor: "pointer" }}>
          <div className="stat-icon-wrapper stat-emerald">
            <IconBell size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-num">{summary.unreadNotifications ?? 0}</span>
            <span className="stat-name">Unread Notifications</span>
          </div>
        </Link>
      </div>

      {/* Section Header with Search */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <h3>Your Workspaces</h3>
          <span className="section-badge">{workspaces.length}</span>
        </div>

        <div className="search-bar-wrap">
          <IconSearch size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Workspaces Grid */}
      {loading ? (
        <div className="empty-loading-card">
          <span className="spinner-circle" />
          <p>Loading your workspaces...</p>
        </div>
      ) : filteredWorkspaces.length > 0 ? (
        <div className="workspaces-grid">
          {filteredWorkspaces.map((w) => (
            <div
              className="workspace-modern-card"
              key={w._id}
              onClick={() => navigate(`/workspace/${w._id}`)}
            >
              <div className="ws-card-top">
                <div className="ws-card-badge">
                  {(w.name || "W")[0].toUpperCase()}
                </div>
                <span className="ws-role-pill">Workspace</span>
              </div>

              <div className="ws-card-body">
                <h4 className="ws-title">{w.name}</h4>
                <p className="ws-slug">/{w.slug}</p>
              </div>

              <div className="ws-card-footer">
                <span className="ws-action-text">Enter Workspace</span>
                <IconArrowRight size={16} className="ws-arrow-icon" />
              </div>
            </div>
          ))}

          {/* Add Workspace shortcut card */}
          <div
            className="workspace-create-card"
            onClick={() => {
              setError("");
              setOpen(true);
            }}
          >
            <div className="create-card-icon">
              <IconPlus size={24} />
            </div>
            <h4>Create New Workspace</h4>
            <p>Setup a new board and invite team members</p>
          </div>
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-icon-box">
            <IconFolder size={36} />
          </div>
          {search ? (
            <>
              <h4>No workspaces match "{search}"</h4>
              <p>Try clearing your search query.</p>
              <button className="btn-secondary" onClick={() => setSearch("")}>
                Clear Search
              </button>
            </>
          ) : (
            <>
              <h4>No workspaces yet</h4>
              <p>Get started by creating your first project workspace.</p>
              <button
                className="btn-primary"
                onClick={() => {
                  setError("");
                  setOpen(true);
                }}
              >
                <IconPlus size={16} />
                <span>Create Workspace</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Create Workspace Modal */}
      {open && (
        <Modal title="Create Workspace" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="modern-form">
            <div className="input-group">
              <label className="input-label">Workspace Name</label>
              <input
                type="text"
                placeholder="e.g. Product Engineering"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                autoFocus
                className="input-field"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Workspace URL Slug</label>
              <div className="slug-input-wrap">
                <span className="slug-prefix">kanban.flow/</span>
                <input
                  type="text"
                  placeholder="product-engineering"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                  className="input-field slug-field"
                />
              </div>
            </div>

            <div className="modal-actions-bar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Workspace"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
