import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Task } from "@/app/types";

interface TaskComponentProps {
  task: Task;
  index: number;
}

const TaskComponent: React.FC<TaskComponentProps> = ({ task, index }) => {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            padding: "0.5rem",
            marginBottom: "0.5rem",
            backgroundColor: "white",
            borderRadius: "4px",
            border: "1px solid #ddd",
            cursor: "move",
          }}
        >
          {task.content}
        </div>
      )}
    </Draggable>
  );
};

export default TaskComponent;
