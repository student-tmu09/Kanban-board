import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Avatar from "../components/Avatar";
import { socket } from "../Api/socket";
import { getWorkspaceById, getDashboard } from "../Api/workspaceApi";
import { createBoard, getWorkspaceBoards, deleteBoard } from "../Api/boardApi";
import { addMember, getMembers, removeMember, getAvailableUsers } from "../Api/memberApi";
import { unwrap, getId, getName } from "../utils/response";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import {
  IconPlus,
  IconKanban,
  IconUsers,
  IconFolder,
  IconArrowRight,
  IconTrash,
  IconShield,
  IconMail,
  IconUser,
  IconCheck
} from "../components/Icons";

export default function Workspace() {
  const { workspaceId } = useParams();
  const { showToast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [workspace, setWorkspace] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [boards, setBoards] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [tab, setTab] = useState("overview"); // "overview" | "boards" | "members"
  const [modal, setModal] = useState(null); // "board" | "member" | "deleteBoard" | "remove"
  const [selectedMember, setSelectedMember] = useState(null);
  const [boardToDelete, setBoardToDelete] = useState(null);

  const [boardForm, setBoardForm] = useState({ name: "", slug: "" });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = async () => {
    try {
      setLoading(true);
      const [w, b, m, d] = await Promise.all([
        getWorkspaceById(workspaceId),
        getWorkspaceBoards(workspaceId),
        getMembers(workspaceId),
        getDashboard(workspaceId)
      ]);

      const wData = unwrap(w, null);
      if (wData?.currentRole) {
        setUserRole(wData.currentRole);
      }
      setWorkspace(wData?.workspace || wData);
      setBoards(unwrap(b, []));
      setMembers(unwrap(m, []));
      setStats(unwrap(d, {}).stats || {});
    } catch (e) {
      setError(e.response?.data?.message || "Could not load workspace details");
    } finally {
      setLoading(false);
    }
  };

  // Check if current logged-in user is workspace OWNER
  const isCurrentUserOwner =
    userRole === "OWNER" ||
    (workspace?.owner && String(getId(workspace.owner)) === String(currentUserId)) ||
    members.some(
      (m) =>
        String(getId(m.userId || m.user || m)) === String(currentUserId) &&
        m.role === "OWNER"
    );

  useEffect(() => {
    loadAll();
    socket.emit("join-workspace", workspaceId);

    const refresh = () => loadAll();
    const events = [
      "workspace_created",
      "add_member",
      "member_role_updated",
      "member_removed",
      "board_created",
      "task_created"
    ];

    events.forEach((ev) => socket.on(ev, refresh));
    return () => {
      socket.emit("leave-workspace", workspaceId);
      events.forEach((ev) => socket.off(ev, refresh));
    };
  }, [workspaceId]);

  const handleBoardNameChange = (name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setBoardForm({ name, slug });
  };

  const createNewBoard = async (e) => {
    e.preventDefault();
    if (!boardForm.name.trim()) return;
    try {
      await createBoard(workspaceId, boardForm);
      showToast(`Board "${boardForm.name}" created!`, "success");
      setBoardForm({ name: "", slug: "" });
      setModal(null);
      loadAll();
    } catch (e) {
      setError(e.response?.data?.message || "Board creation failed");
    }
  };

  const openDeleteBoardModal = (board) => {
    setBoardToDelete(board);
    setModal("deleteBoard");
  };

  const confirmDeleteBoard = async () => {
    if (!boardToDelete) return;
    try {
      await deleteBoard(boardToDelete._id);
      showToast(`Board "${boardToDelete.name}" deleted!`, "info");
      setBoardToDelete(null);
      setModal(null);
      loadAll();
    } catch (e) {
      setError(e.response?.data?.message || "Board deletion failed");
    }
  };

  const openAddMemberModal = async () => {
    setError("");
    setInviteError("");
    setSelectedUserId("");
    setModal("member");
    try {
      setLoadingAvailableUsers(true);
      const res = await getAvailableUsers(workspaceId);
      const list = unwrap(res, []);
      setAvailableUsers(list);
      if (list.length > 0) {
        setSelectedUserId(list[0]._id);
      }
    } catch (err) {
      console.warn("Failed to fetch available users:", err.message);
      setAvailableUsers([]);
    } finally {
      setLoadingAvailableUsers(false);
    }
  };

  const addNewMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setInviteError("Kripya add karne ke liye registered user ko chunein");
      return;
    }

    try {
      setSubmittingInvite(true);
      setInviteError("");
      const chosenUser = availableUsers.find((u) => String(u._id) === String(selectedUserId));
      await addMember(workspaceId, { userId: selectedUserId, role: "MEMBER" });
      showToast(`User "${chosenUser?.name || "member"}" added to workspace!`, "success");
      setSelectedUserId("");
      setModal(null);
      loadAll();
    } catch (e) {
      const msg = e.response?.data?.message || "Member add failed";
      setInviteError(msg);
      showToast(msg, "error");
    } finally {
      setSubmittingInvite(false);
    }
  };

  const openRemoveModal = (member) => {
    setSelectedMember(member);
    setModal("remove");
  };

  const confirmRemoveMember = async () => {
    if (!selectedMember) return;
    const id = getId(selectedMember.userId || selectedMember.user || selectedMember);
    try {
      await removeMember(workspaceId, id);
      showToast("Member removed from workspace", "info");
      setModal(null);
      loadAll();
    } catch (e) {
      setError(e.response?.data?.message || "Remove failed");
    }
  };

  if (loading && !workspace) {
    return (
      <Layout title="Workspace">
        <div className="empty-loading-card">
          <span className="spinner-circle" />
          <p>Loading workspace details...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={workspace?.name || "Workspace"}
      breadcrumbs={[{ label: workspace?.name || "Workspace" }]}
      right={
        isCurrentUserOwner ? (
          <div className="topbar-actions-row">
            <button
              className="btn-primary"
              onClick={() => {
                setError("");
                setModal("board");
              }}
            >
              <IconPlus size={16} />
              <span>Create Board</span>
            </button>
          </div>
        ) : null
      }
    >
      {/* Workspace Header Hero */}
      <div className="workspace-header-hero">
        <div className="ws-hero-left">
          <div className="ws-hero-icon">
            {(workspace?.name || "W")[0].toUpperCase()}
          </div>
          <div>
            <div className="ws-hero-title-row">
              <h2>{workspace?.name}</h2>
              <span className="slug-tag">/{workspace?.slug}</span>
            </div>
            <p className="ws-hero-meta">
              <span>👥 {members.length} member{members.length === 1 ? "" : "s"}</span>
              <span className="meta-sep">•</span>
              <span>📋 {boards.length} board{boards.length === 1 ? "" : "s"}</span>
            </p>
          </div>
        </div>
      </div>

      {error && <div className="alert-box alert-error">{error}</div>}

      {/* Tabs bar */}
      <div className="modern-tabs-bar">
        <button
          className={`modern-tab-btn ${tab === "overview" ? "active" : ""}`}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={`modern-tab-btn ${tab === "boards" ? "active" : ""}`}
          onClick={() => setTab("boards")}
        >
          Boards ({boards.length})
        </button>
        <button
          className={`modern-tab-btn ${tab === "members" ? "active" : ""}`}
          onClick={() => setTab("members")}
        >
          Team Members ({members.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === "overview" && (
        <div className="tab-pane">
          <div className="stats-row">
            {[
              { label: "Boards", value: stats.totalBoards ?? boards.length, color: "blue", icon: <IconKanban size={20} /> },
              { label: "Team Members", value: stats.totalMembers ?? members.length, color: "amber", icon: <IconUsers size={20} /> },
              { label: "Total Tasks", value: stats.totalTasks ?? 0, color: "purple", icon: <IconFolder size={20} /> },
              { label: "In Progress", value: stats.inProgressTasks ?? 0, color: "amber", icon: "⏳" },
              { label: "Completed", value: stats.completedTasks ?? 0, color: "emerald", icon: "✅" }
            ].map((st) => (
              <div className="stat-card" key={st.label}>
                <div className={`stat-icon-wrapper stat-${st.color}`}>{st.icon}</div>
                <div className="stat-info">
                  <span className="stat-num">{st.value}</span>
                  <span className="stat-name">{st.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="section-title-row">
            <h3>Boards in this workspace</h3>
            {isCurrentUserOwner && (
              <button
                className="btn-text-link"
                onClick={() => {
                  setError("");
                  setModal("board");
                }}
              >
                + Add Board
              </button>
            )}
          </div>

          <div className="boards-grid">
            {boards.map((b) => (
              <Link className="board-modern-card" to={`/board/${b._id}`} key={b._id}>
                <div className="board-card-head">
                  <div className="board-card-icon">
                    <IconKanban size={18} />
                  </div>
                  <div className="board-card-head-right">
                    <span className="board-open-tag">Open Board →</span>
                    {isCurrentUserOwner && (
                      <button
                        type="button"
                        className="board-card-delete-icon"
                        title="Delete Board"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDeleteBoardModal(b);
                        }}
                      >
                        <IconTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <h4>{b.name}</h4>
                <p className="board-slug">/{b.slug}</p>
              </Link>
            ))}
            {!boards.length && (
              <div className="empty-sub-card">
                <p>No boards created yet.</p>
                {isCurrentUserOwner && (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setError("");
                      setModal("board");
                    }}
                  >
                    <IconPlus size={14} />
                    <span>Create First Board</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BOARDS */}
      {tab === "boards" && (
        <div className="tab-pane">
          <div className="section-title-row">
            <h3>All Boards</h3>
            {isCurrentUserOwner && (
              <button
                className="btn-primary"
                onClick={() => {
                  setError("");
                  setModal("board");
                }}
              >
                <IconPlus size={16} />
                <span>Create Board</span>
              </button>
            )}
          </div>

          <div className="boards-grid">
            {boards.map((b) => (
              <Link className="board-modern-card" to={`/board/${b._id}`} key={b._id}>
                <div className="board-card-head">
                  <div className="board-card-icon">
                    <IconKanban size={18} />
                  </div>
                  <div className="board-card-head-right">
                    <span className="board-open-tag">Open Board →</span>
                    {isCurrentUserOwner && (
                      <button
                        type="button"
                        className="board-card-delete-icon"
                        title="Delete Board"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDeleteBoardModal(b);
                        }}
                      >
                        <IconTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <h4>{b.name}</h4>
                <p className="board-slug">/{b.slug}</p>
              </Link>
            ))}

            {isCurrentUserOwner && (
              <div
                className="board-create-card"
                onClick={() => {
                  setError("");
                  setModal("board");
                }}
              >
                <IconPlus size={24} />
                <h4>Create New Board</h4>
                <p>Add columns and track sprint tasks</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MEMBERS */}
      {tab === "members" && (
        <div className="tab-pane">
          <div className="section-title-row">
            <h3>Workspace Members</h3>
            {isCurrentUserOwner && (
              <button
                className="btn-primary"
                onClick={openAddMemberModal}
              >
                <IconPlus size={16} />
                <span>Add Member</span>
              </button>
            )}
          </div>

          <div className="modern-table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  {isCurrentUserOwner && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m, idx) => {
                  const u = m.userId || m.user || m;
                  const isOwner = m.role === "OWNER";
                  return (
                    <tr key={m._id || idx}>
                      <td>
                        <div className="table-user-cell">
                          <Avatar
                            src={u?.avatar}
                            name={getName(u)}
                            size="sm"
                          />
                          <span className="table-user-name">{getName(u)}</span>
                        </div>
                      </td>
                      <td className="table-email">{u?.email || "-"}</td>
                      <td>
                        <span className={`role-badge role-${(m.role || "member").toLowerCase()}`}>
                          {m.role || "MEMBER"}
                        </span>
                      </td>
                      {isCurrentUserOwner && (
                        <td style={{ textAlign: "right" }}>
                          {!isOwner && (
                            <div className="table-actions">
                              <button
                                className="btn-danger-sm"
                                onClick={() => openRemoveModal(m)}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          {isOwner && <span className="owner-tag">Workspace Owner</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!members.length && (
              <div className="empty-sub-card">
                <p>No members found in this workspace.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE BOARD */}
      {modal === "board" && (
        <Modal title="Create New Board" onClose={() => setModal(null)}>
          <form onSubmit={createNewBoard} className="modern-form">
            <div className="input-group">
              <label className="input-label">Board Name</label>
              <input
                type="text"
                placeholder="e.g. Sprint 1 - Core Features"
                value={boardForm.name}
                onChange={(e) => handleBoardNameChange(e.target.value)}
                required
                autoFocus
                className="input-field"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Board Slug</label>
              <input
                type="text"
                placeholder="sprint-1-core-features"
                value={boardForm.slug}
                onChange={(e) => setBoardForm({ ...boardForm, slug: e.target.value })}
                required
                className="input-field"
              />
            </div>
            <div className="modal-actions-bar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Board
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADD REGISTERED MEMBER */}
      {modal === "member" && (
        <Modal
          title="Add Member to Workspace"
          onClose={() => {
            if (!submittingInvite) {
              setInviteError("");
              setModal(null);
            }
          }}
          maxWidth="520px"
        >
          <form onSubmit={addNewMember} className="modern-form">
            <div className="proof-modal-intro" style={{ marginBottom: "16px" }}>
              <div className="proof-intro-icon">
                <IconUsers size={22} />
              </div>
              <div className="proof-intro-text">
                <h4>Registered Users Only</h4>
                <p>
                  Aap sirf unhi users ko add kar sakte hain jo registered hain. Neeche list me se registered user ko chunein.
                </p>
              </div>
            </div>

            {inviteError && (
              <div className="alert-box alert-error" style={{ marginBottom: "14px" }}>
                {inviteError}
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Select Registered User</label>

              {loadingAvailableUsers ? (
                <div style={{ padding: "14px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  Registered users load ho rahe hain...
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="alert-box alert-info" style={{ marginTop: "4px" }}>
                  Sabhi registered users pehle se is workspace ke members hain ya koi aur registered user available nahi hai.
                </div>
              ) : (
                <>
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      if (inviteError) setInviteError("");
                    }}
                    required
                    disabled={submittingInvite}
                    className="input-field select-field"
                    autoFocus
                  >
                    <option value="" disabled>-- Registered user chunein --</option>
                    {availableUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>

                  {/* Selected user preview card */}
                  {selectedUserId && (() => {
                    const selUser = availableUsers.find((u) => String(u._id) === String(selectedUserId));
                    if (!selUser) return null;
                    return (
                      <div className="selected-user-preview-card">
                        <Avatar
                          src={selUser.avatar}
                          name={selUser.name}
                          size="md"
                        />
                        <div className="selected-user-details">
                          <span className="selected-user-name">{selUser.name}</span>
                          <span className="selected-user-email">{selUser.email}</span>
                        </div>
                        <span className="selected-user-badge">
                          <IconCheck size={12} />
                          <span>Registered</span>
                        </span>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Workspace Role</label>
              <div className="fixed-role-box">
                <span className="role-badge role-member">MEMBER</span>
                <span className="fixed-role-hint">
                  Naye user ko MEMBER role milega (tasks manage kar sakte hain, boards/members add ya delete nahi kar sakte).
                </span>
              </div>
            </div>

            <div className="modal-actions-bar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setInviteError("");
                  setModal(null);
                }}
                disabled={submittingInvite}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submittingInvite || !selectedUserId || availableUsers.length === 0}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                {submittingInvite ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Adding Member...</span>
                  </>
                ) : (
                  <>
                    <IconPlus size={16} />
                    <span>Add Member</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: DELETE BOARD (Only OWNER) */}
      {modal === "deleteBoard" && boardToDelete && (
        <Modal title="Delete Board" onClose={() => setModal(null)}>
          <div className="modern-form">
            <p>
              Kya aap sach me board <b>"{boardToDelete.name}"</b> ko delete karna chahte hain? Is board ke sabhi tasks permanently delete ho jayenge.
            </p>
            <div className="modal-actions-bar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setBoardToDelete(null);
                  setModal(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteBoard}
              >
                Delete Board
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: CONFIRM REMOVE */}
      {modal === "remove" && selectedMember && (
        <Modal title="Remove Member" onClose={() => setModal(null)}>
          <div className="modern-form">
            <p>
              Are you sure you want to remove <b>{getName(selectedMember.userId || selectedMember.user || selectedMember)}</b> from this workspace? They will lose access to boards and tasks.
            </p>
            <div className="modal-actions-bar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={confirmRemoveMember}
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
