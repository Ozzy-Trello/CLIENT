import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Task } from "@/app/dto/types";
import "./style.css";
import CardTask from "./card-task";
import CardCounter from "./card-counter";
import ModalCardForm from "../modal-card-form";

interface TaskComponentProps {
  task: Task;
  index: number;
}

const TaskComponent: React.FC<TaskComponentProps> = ({ task, index }) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);

  return (
    <div>
      { task && task.type == "flow" && (
        <Draggable draggableId={task.id} index={index}>
          {(provided) => (
            <CardTask task={task} provided={provided} setOpen={setOpen}/>
          )}
        </Draggable>
      )}

      { task && task.type == "counter" && (
        <Draggable draggableId={task.id} index={index}>
          {(provided) => (
            <CardCounter task={task} provided={provided} setOpen={setOpen}/>
          )}
        </Draggable>
      ) }

      <ModalCardForm open={open} setOpen={setOpen} loading={loading} />
    </div>
  );
};

export default TaskComponent;
