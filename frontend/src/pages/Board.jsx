import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DragDropContext } from "@hello-pangea/dnd";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import TaskColumn from "../components/TaskColumn";
import Avatar from "../components/Avatar";
import { socket } from "../Api/socket";
import { getBoardById } from "../Api/boardApi";
import { getBoardTasks, createTask, moveTask, updateTask, deleteTask } from "../Api/taskApi";
import { getMembers } from "../Api/memberApi";
import { createComment, getTaskComments } from "../Api/commentApi";
import { unwrap, getName, getId } from "../utils/response";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import {
  IconPlus,
  IconKanban,
  IconCalendar,
  IconUser,
  IconMessageSquare,
  IconTrash,
  IconCheck,
  IconUpload,
  IconFileText,
  IconCheckCircle,
  IconLink,
  IconClose
} from "../components/Icons";
import { compressImage } from "../utils/avatars";

const COLUMNS = [
  { id: "TODO", title: "TODO" },
  { id: "IN_PROGRESS", title: "IN PROGRESS" },
  { id: "IN_REVIEW", title: "IN REVIEW" },
  { id: "DONE", title: "DONE" }
];

const COLUMN_INDEX = {
  TODO: 0,
  IN_PROGRESS: 1,
  IN_REVIEW: 2,
  DONE: 3
};

// Returns YYYY-MM-DDTHH:mm exactly 24 hours from right now
const getMinDueDateTime = () => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

// Formats date value to local ISO string YYYY-MM-DDTHH:mm for datetime-local input
const toDateTimeLocal = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

export default function Board() {
  const { boardId } = useParams();
  const { showToast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [taskModal, setTaskModal] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("TODO");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [taskModalError, setTaskModalError] = useState("");

  // Completion Proof State
  const [proofModal, setProofModal] = useState({
    open: false,
    taskId: null,
    taskTitle: "",
    destStatus: "DONE",
    order: 1,
    isFromEditModal: false
  });
  const [proofForm, setProofForm] = useState({
    note: "",
    fileUrl: "",
    fileName: "",
    fileType: "",
    linkUrl: ""
  });
  const [proofError, setProofError] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const b = await getBoardById(boardId);
      const boardData = unwrap(b, null);
      setBoard(boardData);

      const t = await getBoardTasks(boardId);
      setTasks(unwrap(t, []));

      const workspaceId = getId(boardData?.workspace || boardData?.workspaceId);
      if (workspaceId) {
        const m = await getMembers(workspaceId);
        setMembers(unwrap(m, []));
      }
    } catch (e) {
      setError(e.response?.data?.message || "Board load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    socket.emit("join_board", { boardId });

    const refresh = () => load();
    const events = [
      "task_created",
      "task_moved",
      "task_updated",
      "task_deleted",
      "add_member",
      "member_role_updated"
    ];

    events.forEach((ev) => socket.on(ev, refresh));

    return () => {
      events.forEach((ev) => socket.off(ev, refresh));
    };
  }, [boardId]);

  const openTask = async (task) => {
    setSelected(task);
    setDeleteConfirm(false);
    try {
      const res = await getTaskComments(task._id);
      setComments(unwrap(res, []));
    } catch (e) {
      setComments([]);
    }
  };

  const submitTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTaskModalError("Task title is required");
      return;
    }

    try {
      setSubmittingTask(true);
      setTaskModalError("");

      const data = {
        title: form.title.trim(),
        description: form.description ? form.description.trim() : "",
        status: defaultStatus || "TODO"
      };

      if (form.assigneeId) {
        if (String(form.assigneeId) === String(currentUserId)) {
          setTaskModalError("Koi member khud ko task assign nahi kar sakta. Kripya kisi anya member ko chunein.");
          setSubmittingTask(false);
          return;
        }
        data.assigneeId = form.assigneeId;
      }
      if (form.dueDate) {
        const dueTime = new Date(form.dueDate).getTime();
        const minDueTime = Date.now() + 24 * 60 * 60 * 1000 - 60 * 1000;
        if (dueTime < minDueTime) {
          setTaskModalError("Due date kam se kam task create hone ke 24 ghante (1 din) baad ki honi chahiye");
          setSubmittingTask(false);
          return;
        }
        data.dueDate = form.dueDate;
      }

      await createTask(boardId, data);
      showToast("Task created successfully!", "success");
      setTaskModal(false);
      setForm({ title: "", description: "", assigneeId: "", dueDate: "" });
      load();
    } catch (e) {
      setTaskModalError(e.response?.data?.message || "Task creation failed");
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleQuickAdd = (statusId) => {
    setDefaultStatus(statusId || "TODO");
    setTaskModalError("");
    setError("");
    setForm({ title: "", description: "", assigneeId: "", dueDate: "" });
    setTaskModal(true);
  };

  const dragEnd = async (result) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const sourceStatus = result.source.droppableId;
    const destStatus = result.destination.droppableId;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const order = destIndex + 1;

    // If dropped in the exact same place, do nothing
    if (sourceStatus === destStatus && sourceIndex === destIndex) {
      return;
    }

    // STRICT CHECK: Only assigned user can move the task
    const targetTask = tasks.find((t) => String(t._id) === String(taskId));
    const targetAssigneeId = getId(targetTask?.assigneeId);

    if (!targetAssigneeId || String(targetAssigneeId) !== String(currentUserId)) {
      showToast("Only the assigned user can move this task!", "error");
      return;
    }

    // STRICT CHECK: Once a task moves to a forward column, it cannot move backwards to a previous column!
    if (COLUMN_INDEX[destStatus] < COLUMN_INDEX[sourceStatus]) {
      showToast("Task ko peeche wale column me move nahi kiya ja sakta (Only forward allowed)!", "error");
      return;
    }

    // PROOF REQUIREMENT: Moving to DONE from non-DONE requires proof of work
    if (destStatus === "DONE" && sourceStatus !== "DONE") {
      setProofModal({
        open: true,
        taskId,
        taskTitle: targetTask?.title || "Task",
        destStatus,
        order,
        isFromEditModal: false
      });
      setProofForm({
        note: "",
        fileUrl: "",
        fileName: "",
        fileType: "",
        linkUrl: ""
      });
      setProofError("");
      return;
    }

    // Optimistic UI update for ultra-smooth responsiveness
    setTasks((prevTasks) => {
      return prevTasks.map((t) =>
        String(t._id) === String(taskId)
          ? { ...t, status: destStatus, order }
          : t
      );
    });

    try {
      await moveTask(taskId, { status: destStatus, order });
      showToast(`Task moved to ${destStatus.replace(/_/g, " ")}`, "success", 2000);
    } catch (e) {
      setError(e.response?.data?.message || "Move failed");
      load(); // Rollback on failure
    }
  };

  const saveTask = async () => {
    if (!selected) return;

    // If status was changed, ensure user is assigned to this task
    const origTask = tasks.find((t) => String(t._id) === String(selected._id));
    const selectedAssigneeId = getId(selected.assigneeId);
    const origAssigneeId = getId(origTask?.assigneeId);

    if (
      origTask &&
      origTask.status !== selected.status &&
      (!origAssigneeId || String(origAssigneeId) !== String(currentUserId))
    ) {
      showToast("Only the assigned user can change the status of this task!", "error");
      return;
    }

    // STRICT CHECK: Backward status movement is forbidden
    if (origTask && origTask.status !== selected.status) {
      if (COLUMN_INDEX[selected.status] < COLUMN_INDEX[origTask.status]) {
        showToast("Task ko peeche wale column me move nahi kiya ja sakta (Only forward allowed)!", "error");
        return;
      }
    }

    // STRICT ASSIGNEE CHANGE PERMISSIONS:
    // 1. Only task creator can change assignee
    // 2. Can ONLY be changed when task is in TODO or IN_PROGRESS
    if (String(selectedAssigneeId || "") !== String(origAssigneeId || "")) {
      const creatorId = getId(origTask?.createrId || selected.createrId);
      if (!creatorId || String(creatorId) !== String(currentUserId)) {
        showToast("Assignee sirf task create karne wala user hi change kar sakta hai!", "error");
        return;
      }
      if (origTask && (origTask.status === "IN_REVIEW" || origTask.status === "DONE")) {
        showToast(
          `Task jab ${origTask.status.replace(/_/g, " ")} me ho tab assignee change nahi kiya ja sakta! (Sirf TODO ya IN PROGRESS me allowed hai)`,
          "error"
        );
        return;
      }
      if (selectedAssigneeId && String(selectedAssigneeId) === String(currentUserId)) {
        showToast("Koi member khud ko task assign nahi kar sakta! Kripya kisi anya member ko chunein.", "error");
        return;
      }
    }

    // STRICT CHECK: Due date must be at least 24 hours after task creation
    if (selected.dueDate) {
      const dueTime = new Date(selected.dueDate).getTime();
      const taskCreatedTime = origTask?.createdAt ? new Date(origTask.createdAt).getTime() : Date.now();
      const minDueTime = taskCreatedTime + 24 * 60 * 60 * 1000 - 60 * 1000;
      if (dueTime < minDueTime) {
        showToast("Due date task create hone ke kam se kam 24 ghante baad ki honi chahiye", "error");
        return;
      }
    }

    // PROOF REQUIREMENT: Changing status to DONE requires proof of work
    if (selected.status === "DONE" && origTask?.status !== "DONE") {
      setProofModal({
        open: true,
        taskId: selected._id,
        taskTitle: selected.title,
        destStatus: "DONE",
        order: selected.order || 1,
        isFromEditModal: true
      });
      setProofForm({
        note: "",
        fileUrl: "",
        fileName: "",
        fileType: "",
        linkUrl: ""
      });
      setProofError("");
      return;
    }

    try {
      await updateTask(selected._id, {
        title: selected.title,
        description: selected.description,
        status: selected.status,
        assigneeId: selectedAssigneeId || null,
        dueDate: selected.dueDate || null
      });
      showToast("Task updated!", "success");
      setSelected(null);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Update failed");
    }
  };

  const handleProofFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProofError("File size exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    setProofError("");
    try {
      if (file.type.startsWith("image/")) {
        const compressedDataUrl = await compressImage(file, 900, 0.8);
        setProofForm((prev) => ({
          ...prev,
          fileUrl: compressedDataUrl,
          fileName: file.name,
          fileType: file.type
        }));
      } else {
        const reader = new FileReader();
        reader.onload = (loadEv) => {
          setProofForm((prev) => ({
            ...prev,
            fileUrl: loadEv.target.result,
            fileName: file.name,
            fileType: file.type || "application/octet-stream"
          }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Proof file upload error:", err);
      setProofError("Could not process the uploaded file.");
    }
  };

  const submitProofAndComplete = async (e) => {
    e.preventDefault();
    const hasNote = Boolean(proofForm.note && proofForm.note.trim());
    const hasFile = Boolean(proofForm.fileUrl);
    const hasLink = Boolean(proofForm.linkUrl && proofForm.linkUrl.trim());

    if (!hasNote && !hasFile && !hasLink) {
      setProofError("Kripya proof ke liye summary note, screenshot/image, ya document upload karein.");
      return;
    }

    try {
      setSubmittingProof(true);
      setProofError("");

      const proofPayload = {
        note: proofForm.note ? proofForm.note.trim() : "",
        fileUrl: proofForm.fileUrl || "",
        fileName: proofForm.fileName || "",
        fileType: proofForm.fileType || "",
        linkUrl: proofForm.linkUrl ? proofForm.linkUrl.trim() : ""
      };

      if (proofModal.isFromEditModal && selected) {
        await updateTask(proofModal.taskId, {
          title: selected.title,
          description: selected.description,
          status: "DONE",
          assigneeId: getId(selected.assigneeId) || null,
          dueDate: selected.dueDate || null,
          completionProof: proofPayload
        });
        showToast("Task completed with proof submitted!", "success");
        setSelected(null);
      } else {
        await moveTask(proofModal.taskId, {
          status: "DONE",
          order: proofModal.order || 1,
          completionProof: proofPayload
        });
        showToast("Task completed with proof submitted!", "success");
      }

      setProofModal({
        open: false,
        taskId: null,
        taskTitle: "",
        destStatus: "DONE",
        order: 1,
        isFromEditModal: false
      });
      setProofForm({
        note: "",
        fileUrl: "",
        fileName: "",
        fileType: "",
        linkUrl: ""
      });
      load();
    } catch (err) {
      setProofError(err.response?.data?.message || "Failed to complete task with proof");
    } finally {
      setSubmittingProof(false);
    }
  };

  const removeTask = async () => {
    if (!selected) return;
    try {
      await deleteTask(selected._id);
      showToast("Task deleted", "info");
      setSelected(null);
      setDeleteConfirm(false);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Delete failed");
    }
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selected) return;

    try {
      await createComment(selected._id, { content: commentText.trim() });
      setCommentText("");
      const res = await getTaskComments(selected._id);
      setComments(unwrap(res, []));
      showToast("Comment posted", "success");
    } catch (e) {
      setError(e.response?.data?.message || "Comment failed");
    }
  };

  const workspaceId = getId(board?.workspace || board?.workspaceId);

  return (
    <Layout
      title={board?.name || "Kanban Board"}
      breadcrumbs={[
        { label: "Workspace", path: workspaceId ? `/workspace/${workspaceId}` : "/dashboard" },
        { label: board?.name || "Board" }
      ]}
      right={
        <button
          className="btn-primary"
          onClick={() => handleQuickAdd("TODO")}
        >
          <IconPlus size={16} />
          <span>New Task</span>
        </button>
      }
    >
      {/* Board Header Bar */}
      <div className="board-top-info">
        <div className="board-info-left">
          <div className="board-tag-chip">
            <IconKanban size={16} />
            <span>Active Sprint Board</span>
          </div>
          <span className="board-tasks-count">
            {tasks.length} total task{tasks.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="board-info-right">
          <span className="live-status-pill">
            <span className="pulse-indicator" />
            <span>WebSocket Live</span>
          </span>
        </div>
      </div>

      {error && <div className="alert-box alert-error">{error}</div>}

      {/* Drag & Drop Kanban Columns */}
      <DragDropContext onDragEnd={dragEnd}>
        <div className="kanban-board-grid">
          {COLUMNS.map((col) => {
            const columnTasks = tasks
              .filter((t) => t.status === col.id)
              .sort((a, b) => (a.order || 0) - (b.order || 0));

            return (
              <TaskColumn
                key={col.id}
                column={col}
                tasks={columnTasks}
                onOpen={openTask}
                onQuickAdd={handleQuickAdd}
                currentUserId={currentUserId}
              />
            );
          })}
        </div>
      </DragDropContext>

      {/* MODAL: CREATE TASK */}
      {taskModal && (
        <Modal
          title={`Create Task (${defaultStatus.replace(/_/g, " ")})`}
          onClose={() => {
            setTaskModal(false);
            setTaskModalError("");
          }}
        >
          <form onSubmit={submitTask} className="modern-form">
            {taskModalError && (
              <div className="alert-box alert-error" style={{ marginBottom: "14px" }}>
                {taskModalError}
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Task Title</label>
              <input
                type="text"
                placeholder="e.g. Implement user avatar selection"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
                className="input-field"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Description (Optional)</label>
              <textarea
                placeholder="Add context, acceptance criteria or links..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="input-field textarea-field"
              />
            </div>

            <div className="form-row-2">
              <div className="input-group">
                <label className="input-label">Assignee</label>
                <select
                  value={form.assigneeId}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                  className="input-field select-field"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => {
                    const u = m.userId || m.user || m;
                    const id = getId(u);
                    const isSelf = String(id) === String(currentUserId);
                    return (
                      <option key={id} value={id} disabled={isSelf}>
                        {getName(u)} {isSelf ? "(Khud ko assign nahi kar sakte)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Due Date & Time (Min 24h)</label>
                <input
                  type="datetime-local"
                  min={getMinDueDateTime()}
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="input-field"
                />
                <span className="input-help-text">Kam se kam 24 ghante baad ka date & time chunein</span>
              </div>
            </div>

            <div className="modal-actions-bar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setTaskModal(false);
                  setTaskModalError("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submittingTask}
              >
                {submittingTask ? "Creating Task..." : "Create Task"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: TASK DETAILS & COMMENTS */}
      {selected && (
        <Modal
          title="Task Details"
          onClose={() => {
            setSelected(null);
            setDeleteConfirm(false);
          }}
          maxWidth="640px"
        >
          <div className="task-detail-container">
            <div className="modern-form">
              <div className="input-group">
                <label className="input-label">Title</label>
                <input
                  type="text"
                  value={selected.title || ""}
                  onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea
                  value={selected.description || ""}
                  onChange={(e) => setSelected({ ...selected, description: e.target.value })}
                  rows={3}
                  className="input-field textarea-field"
                  placeholder="Add description..."
                />
              </div>

              <div className="form-row-3">
                <div className="input-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="input-label">Status</label>
                    {(!getId(selected.assigneeId) || String(getId(selected.assigneeId)) !== String(currentUserId)) && (
                      <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>
                        🔒 Assignee only
                      </span>
                    )}
                  </div>
                  <select
                    value={selected.status}
                    onChange={(e) => setSelected({ ...selected, status: e.target.value })}
                    className="input-field select-field"
                    disabled={!getId(selected.assigneeId) || String(getId(selected.assigneeId)) !== String(currentUserId)}
                    title={
                      !getId(selected.assigneeId) || String(getId(selected.assigneeId)) !== String(currentUserId)
                        ? "Only the assigned user can change task status"
                        : "Change status"
                    }
                  >
                    {COLUMNS.map((c) => {
                      const origTask = tasks.find((t) => String(t._id) === String(selected._id));
                      const isBackward = origTask && COLUMN_INDEX[c.id] < COLUMN_INDEX[origTask.status];
                      return (
                        <option key={c.id} value={c.id} disabled={isBackward}>
                          {c.title} {isBackward ? "🔒 (Locked - Forward only)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {(() => {
                  const origTask = tasks.find((t) => String(t._id) === String(selected._id));
                  const creatorId = getId(selected.createrId || origTask?.createrId);
                  const isCreator = Boolean(creatorId && currentUserId && String(creatorId) === String(currentUserId));
                  const isStatusEditable = selected.status === "TODO" || selected.status === "IN_PROGRESS";
                  const canChangeAssignee = isCreator && isStatusEditable;

                  return (
                    <div className="input-group">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label className="input-label">Assignee</label>
                        {!isCreator ? (
                          <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>
                            🔒 Creator only
                          </span>
                        ) : !isStatusEditable ? (
                          <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 600 }}>
                            🔒 Locked in {selected.status.replace(/_/g, " ")}
                          </span>
                        ) : null}
                      </div>
                      <select
                        value={getId(selected.assigneeId)}
                        onChange={(e) => setSelected({ ...selected, assigneeId: e.target.value })}
                        className="input-field select-field"
                        disabled={!canChangeAssignee}
                        title={
                          !isCreator
                            ? "Sirf task create karne wala user hi assignee change kar sakta hai"
                            : !isStatusEditable
                            ? `Task ${selected.status.replace(/_/g, " ")} me hone par assignee change nahi ho sakta (Sirf TODO ya IN PROGRESS me allowed hai)`
                            : "Change assignee"
                        }
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => {
                          const u = m.userId || m.user || m;
                          const id = getId(u);
                          const isSelf = String(id) === String(currentUserId);
                          return (
                            <option key={id} value={id} disabled={isSelf}>
                              {getName(u)} {isSelf ? "(Khud ko assign nahi kar sakte)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })()}

                <div className="input-group">
                  <label className="input-label">Due Date & Time (Min 24h)</label>
                  <input
                    type="datetime-local"
                    min={getMinDueDateTime()}
                    value={toDateTimeLocal(selected.dueDate)}
                    onChange={(e) => setSelected({ ...selected, dueDate: e.target.value })}
                    className="input-field"
                  />
                  <span className="input-help-text">Min 24h after creation</span>
                </div>
              </div>

              <div className="task-detail-actions">
                <button type="button" className="btn-primary" onClick={saveTask}>
                  Save Changes
                </button>

                {!deleteConfirm ? (
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <IconTrash size={15} />
                    <span>Delete Task</span>
                  </button>
                ) : (
                  <div className="delete-confirm-group">
                    <span className="confirm-text">Are you sure?</span>
                    <button
                      type="button"
                      className="btn-danger-sm"
                      onClick={removeTask}
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* COMPLETION PROOF DISPLAY SECTION */}
              {selected.completionProof &&
                (selected.completionProof.note ||
                  selected.completionProof.fileUrl ||
                  selected.completionProof.linkUrl) && (
                  <div className="task-detail-proof-box">
                    <div className="proof-box-header">
                      <div className="proof-box-badge">
                        <IconCheckCircle size={16} />
                        <span>Completion Proof Submitted</span>
                      </div>
                      {selected.completionProof.submittedAt && (
                        <span className="proof-submitted-time">
                          {new Date(selected.completionProof.submittedAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric"
                          })}{" "}
                          at{" "}
                          {new Date(selected.completionProof.submittedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      )}
                    </div>

                    {selected.completionProof.submittedBy && (
                      <div className="proof-author-line">
                        <span className="proof-author-label">Completed by:</span>
                        <span className="proof-author-name">
                          {getName(selected.completionProof.submittedBy)}
                        </span>
                      </div>
                    )}

                    {selected.completionProof.note && (
                      <div className="proof-note-text">
                        "{selected.completionProof.note}"
                      </div>
                    )}

                    {selected.completionProof.fileUrl && (
                      <div className="proof-attachment-block">
                        {selected.completionProof.fileType?.startsWith("image/") ||
                        selected.completionProof.fileUrl?.startsWith("data:image/") ||
                        /\.(png|jpe?g|webp|gif)$/i.test(selected.completionProof.fileUrl) ? (
                          <div className="proof-image-preview">
                            <img
                              src={selected.completionProof.fileUrl}
                              alt="Proof screenshot"
                              className="proof-img"
                            />
                          </div>
                        ) : (
                          <div className="proof-doc-card">
                            <IconFileText size={20} />
                            <div className="proof-doc-info">
                              <span className="proof-doc-name">
                                {selected.completionProof.fileName || "Uploaded Proof Document"}
                              </span>
                            </div>
                            <a
                              href={selected.completionProof.fileUrl}
                              download={selected.completionProof.fileName || "proof-file"}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost-sm"
                            >
                              Download File
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {selected.completionProof.linkUrl && (
                      <div className="proof-link-row">
                        <IconLink size={14} />
                        <a
                          href={selected.completionProof.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="proof-external-link"
                        >
                          {selected.completionProof.linkUrl}
                        </a>
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* COMMENTS SECTION */}
            <div className="comments-section">
              <div className="comments-header">
                <IconMessageSquare size={18} />
                <h4>Discussion & Activity</h4>
                <span className="comments-count">({comments.length})</span>
              </div>

              <div className="comments-list">
                {comments.map((c) => {
                  const author = c.authorId || c.userId;
                  const authorName = getName(author);
                  const authorAvatar = author?.avatar;

                  return (
                    <div className="comment-bubble-item" key={c._id}>
                      <Avatar
                        src={authorAvatar}
                        name={authorName}
                        size="sm"
                        className="comment-author-avatar"
                      />
                      <div className="comment-content-box">
                        <div className="comment-meta">
                          <span className="comment-author-name">{authorName}</span>
                          <span className="comment-time">
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : "Just now"}
                          </span>
                        </div>
                        <p className="comment-text">{c.content}</p>
                      </div>
                    </div>
                  );
                })}

                {!comments.length && (
                  <p className="no-comments-hint">
                    No comments yet. Start the conversation below!
                  </p>
                )}
              </div>

              <form className="comment-post-form" onSubmit={sendComment}>
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="input-field comment-input"
                />
                <button
                  type="submit"
                  className="btn-primary comment-send-btn"
                  disabled={!commentText.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: SUBMIT COMPLETION PROOF */}
      {proofModal.open && (
        <Modal
          title="Submit Completion Proof"
          onClose={() => {
            setProofModal({
              open: false,
              taskId: null,
              taskTitle: "",
              destStatus: "DONE",
              order: 1,
              isFromEditModal: false
            });
            setProofError("");
          }}
          maxWidth="560px"
        >
          <form onSubmit={submitProofAndComplete} className="modern-form">
            <div className="proof-modal-intro">
              <div className="proof-intro-icon">
                <IconCheckCircle size={24} />
              </div>
              <div className="proof-intro-text">
                <h4>Completing: "{proofModal.taskTitle}"</h4>
                <p>
                  Task ko <strong>DONE</strong> column me move karne ke liye apna work proof submit karein (Note summary, Screenshot/Image, ya Document file). Task creator ko proof ke sath Gmail notification jayega.
                </p>
              </div>
            </div>

            {proofError && (
              <div className="alert-box alert-error" style={{ marginBottom: "14px" }}>
                {proofError}
              </div>
            )}

            <div className="input-group">
              <label className="input-label">
                Work Summary / Note <span className="label-optional">(Recommended)</span>
              </label>
              <textarea
                rows={3}
                className="input-field textarea-field"
                placeholder="Aapne kya work complete kiya? (e.g. Added responsive layout, fixed edge cases...)"
                value={proofForm.note}
                onChange={(e) => setProofForm({ ...proofForm, note: e.target.value })}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                Proof Attachment (Screenshot, Image, or Document)
              </label>
              {!proofForm.fileUrl ? (
                <label className="proof-file-dropzone">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleProofFileUpload}
                    style={{ display: "none" }}
                  />
                  <div className="dropzone-content">
                    <IconUpload size={28} className="dropzone-icon" />
                    <span className="dropzone-title">Click to upload screenshot or proof file</span>
                    <span className="dropzone-sub">Supports PNG, JPG, WEBP, PDF, TXT (Max 5MB)</span>
                  </div>
                </label>
              ) : (
                <div className="proof-selected-file">
                  {proofForm.fileType?.startsWith("image/") ||
                  proofForm.fileUrl.startsWith("data:image/") ? (
                    <div className="proof-image-thumb-box">
                      <img
                        src={proofForm.fileUrl}
                        alt="Proof preview"
                        className="proof-image-thumb"
                      />
                      <div className="proof-file-meta">
                        <span className="proof-file-name">
                          {proofForm.fileName || "Screenshot"}
                        </span>
                        <span className="proof-file-tag">Image Attached</span>
                      </div>
                    </div>
                  ) : (
                    <div className="proof-file-thumb-box">
                      <IconFileText size={24} />
                      <div className="proof-file-meta">
                        <span className="proof-file-name">{proofForm.fileName}</span>
                        <span className="proof-file-tag">Document Attached</span>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-remove-proof"
                    onClick={() =>
                      setProofForm({
                        ...proofForm,
                        fileUrl: "",
                        fileName: "",
                        fileType: ""
                      })
                    }
                    title="Remove file"
                  >
                    <IconClose size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">
                Reference / PR / Figma Link <span className="label-optional">(Optional)</span>
              </label>
              <div className="input-with-icon">
                <IconLink size={16} className="input-icon-left" />
                <input
                  type="url"
                  placeholder="https://github.com/... or Figma link"
                  value={proofForm.linkUrl}
                  onChange={(e) => setProofForm({ ...proofForm, linkUrl: e.target.value })}
                  className="input-field input-field-icon"
                />
              </div>
            </div>

            <div className="modal-actions-bar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setProofModal({
                    open: false,
                    taskId: null,
                    taskTitle: "",
                    destStatus: "DONE",
                    order: 1,
                    isFromEditModal: false
                  });
                  setProofError("");
                }}
                disabled={submittingProof}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary btn-complete-task"
                disabled={submittingProof}
              >
                <IconCheck size={16} />
                <span>
                  {submittingProof ? "Completing Task..." : "Complete Task & Submit Proof"}
                </span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
