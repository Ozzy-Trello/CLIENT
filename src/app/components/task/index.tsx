import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Task } from "@/app/types";
import { Avatar, Card, Modal } from "antd";
import { SettingOutlined, EditOutlined, EllipsisOutlined } from "@ant-design/icons";
import Meta from "antd/es/card/Meta";
import CardForm from "../card-form";
import "./style.css"

interface TaskComponentProps {
  task: Task;
  index: number;
}

interface ModalCardFormProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
}

const ModalCardForm: React.FC<ModalCardFormProps> = ({ open, setOpen, loading }) => {
  return (
    <Modal
      title={null}
      loading={loading}
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      className="modal-card-form"
    >
      <CardForm />
    </Modal>
  )
}

const TaskComponent: React.FC<TaskComponentProps> = ({ task, index }) => {

  const [open, setOpen] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  
  return (
    <div>
      <Draggable draggableId={task.id} index={index}>
        {(provided) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              marginBottom: "0.5rem",
              width: "inherit" ,
              cursor: "pointer"
            }}
            cover={
              <img
                alt="example"
                src="https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png"
              />
            }
            actions={[
              <SettingOutlined key="setting" />,
              <EditOutlined key="edit" />,
              <EllipsisOutlined key="ellipsis" />,
            ]}
            onClick={() => {setOpen(true)}}
          >
            <Meta
              avatar={<Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=8" />}
              title={task.content}
              description="This is the description"
            />
          </Card>
        )}
      </Draggable>
      <ModalCardForm open={open} setOpen={setOpen} loading={loading}/>
    </div>
  );
};

export default TaskComponent;
