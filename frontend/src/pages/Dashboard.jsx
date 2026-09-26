import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { createWorkspace, getWorkspaces } from "../Api/workspaceApi";
import { unwrap } from "../utils/response";

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await getWorkspaces();
      setWorkspaces(unwrap(res, []));
    } catch (e) {
      setError(e.response?.data?.message || "Could not load workspaces");
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createWorkspace(form);
      setOpen(false);
      setForm({ name: "", slug: "" });
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Workspace creation failed");
    }
  };

  return (
    <Layout title="Dashboard" right={<button className="primary small" onClick={() => setOpen(true)}>+ Workspace</button>}>
      {error && <div className="error">{error}</div>}
      <div className="stats-grid">
        <div className="stat"><b>{workspaces.length}</b><span>Workspaces</span></div>
        <div className="stat"><b>Real-time</b><span>Socket.IO</span></div>
        <div className="stat"><b>Tasks</b><span>Kanban workflow</span></div>
        <div className="stat"><b>Teams</b><span>Members & roles</span></div>
      </div>

      <div className="section-title"><h2>Your Workspaces</h2></div>
      <div className="card-grid">
        {workspaces.map(w => (
          <div className="workspace-card" key={w._id} onClick={() => navigate(`/workspace/${w._id}`)}>
            <div className="workspace-icon">{(w.name || "W")[0].toUpperCase()}</div>
            <div>
              <h3>{w.name}</h3>
              <p>{w.slug}</p>
            </div>
            <span className="arrow">→</span>
          </div>
        ))}
        {!workspaces.length && <div className="empty">No workspace yet. Create your first workspace.</div>}
      </div>

      {open && (
        <Modal title="Create Workspace" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="form">
            <label>Name<input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required /></label>
            <label>Slug<input value={form.slug} onChange={e => setForm({...form,slug:e.target.value})} required /></label>
            <button className="primary">Create Workspace</button>
          </form>
        </Modal>
      )}
    </Layout>
  );
}