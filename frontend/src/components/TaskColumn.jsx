import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";

const COLUMN_COLORS = {
  TODO: "column-todo",
  IN_PROGRESS: "column-progress",
  IN_REVIEW: "column-review",
  DONE: "column-done"
};

export default function TaskColumn({ column, tasks, onOpen, onQuickAdd, currentUserId }) {
  const colorClass = COLUMN_COLORS[column.id] || "column-default";

  return (
    <section className={`kanban-column ${colorClass}`}>
      <div className="column-head">
        <div className="column-title-wrap">
          <span className="column-status-dot" />
          <h3 className="column-title">{column.title}</h3>
          <span className="column-count-badge">{tasks.length}</span>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-task-list ${snapshot.isDraggingOver ? "dragging-over" : ""}`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task._id}
                task={task}
                index={index}
                onOpen={onOpen}
                currentUserId={currentUserId}
              />
            ))}
            {provided.placeholder}
            {!tasks.length && !snapshot.isDraggingOver && (
              <div className="column-empty-state">
                <span>No tasks</span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </section>
  );
}
