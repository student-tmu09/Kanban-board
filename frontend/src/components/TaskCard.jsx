import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import Avatar from "./Avatar";
import { getName, getId } from "../utils/response";
import { IconCalendar, IconLock, IconCheck } from "./Icons";

export default function TaskCard({ task, index, onOpen, currentUserId }) {
  const assignee = task.assigneeId;
  const assigneeId = getId(assignee);
  const isAssignee = Boolean(
    assigneeId && currentUserId && String(assigneeId) === String(currentUserId)
  );
  const assigneeName = getName(assignee);
  const avatarUrl = assignee?.avatar;

  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now();

  return (
    <Draggable
      draggableId={String(task._id)}
      index={index}
      isDragDisabled={!isAssignee}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-modern-card ${snapshot.isDragging ? "is-dragging" : ""} ${!isAssignee ? "drag-disabled" : ""}`}
          onClick={() => onOpen(task)}
          title={
            !isAssignee
              ? `Assigned to ${assigneeName || "Unassigned"} (Only assigned user can move)`
              : "Drag to move"
          }
        >
          <div className="task-card-header">
            <h4 className="task-card-title">{task.title}</h4>
            {!isAssignee && (
              <span className="task-lock-tag" title="Only assigned user can move">
                <IconLock size={12} />
              </span>
            )}
          </div>

          {task.description && (
            <p className="task-card-desc">{task.description}</p>
          )}

          {task.status === "DONE" && (task.completionProof?.note || task.completionProof?.fileUrl || task.completionProof?.linkUrl) && (
            <div className="task-card-proof-badge" title="Work completion proof submitted">
              <IconCheck size={11} />
              <span>Proof Attached</span>
            </div>
          )}

          <div className="task-card-footer">
            <div className="task-assignee-pill" title={assigneeName}>
              <Avatar
                src={avatarUrl}
                name={assigneeName}
                size="xs"
              />
              <span className="task-assignee-name">{assigneeName}</span>
            </div>

            {task.dueDate && (
              <span
                className={`task-due-chip ${isOverdue ? "is-overdue" : ""}`}
                title={`Due: ${new Date(task.dueDate).toLocaleString()}`}
              >
                <IconCalendar size={13} />
                <span>
                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {", "}
                  {new Date(task.dueDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
