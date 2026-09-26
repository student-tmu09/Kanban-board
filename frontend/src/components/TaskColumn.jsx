import React from "react"
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";

export default function TaskColumn({ column, tasks, onOpen }) {
  return (
    <section className="column">
      <div className="column-head">
        <h3>{column.title}</h3>
        <span>{tasks.length}</span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="task-list"
          >
            {tasks.map((task, index) => (
              <TaskCard key={task._id} task={task} index={index} onOpen={onOpen} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </section>
  );
}