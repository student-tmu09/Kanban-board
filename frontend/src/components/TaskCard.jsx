import React from "react"
import { Draggable } from "@hello-pangea/dnd";
import { getName } from "../utils/response";

export default function TaskCard({ task, index, onOpen }) {
  return (
    <Draggable draggableId={String(task._id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card ${snapshot.isDragging ? "dragging" : ""}`}
          onClick={() => onOpen(task)}
        >
          <div className="task-title">{task.title}</div>
          {task.description && <div className="task-desc">{task.description}</div>}
          <div className="task-meta">
            <span>{getName(task.assigneeId)}</span>
            {task.dueDate && (
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}