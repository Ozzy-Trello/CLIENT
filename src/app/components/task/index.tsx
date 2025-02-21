import React, { useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Task } from "@/app/dto/types";
import { Avatar, Badge, Card, Modal, Tag, Tooltip, Typography } from "antd";
import CardDetails from "../card-details";
import "./style.css";
import { useScreenSize } from "@/app/provider/screen-size-provider";
import CardTask from "./card-task";
import CardCounter from "./card-counter";

interface TaskComponentProps {
  task: Task;
  index: number;
}

interface ModalCardFormProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
}

const ModalCardForm: React.FC<ModalCardFormProps> = ({
  open,
  setOpen,
  loading,
}) => {
  
  const {width, isMobile} =  useScreenSize();

  return (
    <Modal
      title={null}
      loading={loading}
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      className="modal-card-form"
      width={width > 768 ? "60%" : "90%"}
      style={{ top: 20 }}
    >
      <CardDetails />
    </Modal>
  );
};


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
