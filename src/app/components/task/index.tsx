import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Task } from "@/app/types";
import { Avatar, Badge, Card, Modal, Tooltip, Typography } from "antd";
import {
  SettingOutlined,
  EditOutlined,
  EllipsisOutlined,
} from "@ant-design/icons";
import Meta from "antd/es/card/Meta";
import CardDetails from "../card-details";
import "./style.css";

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
  return (
    <Modal
      title={null}
      loading={loading}
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      className="modal-card-form"
      width={1000}
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
      <Draggable draggableId={task.id} index={index}>
        {(provided) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              cursor: "pointer",
            }}
            cover={
              <img
                alt="example"
                src="https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png"
              />
            }
            onClick={() => {
              setOpen(true);
            }}
          >
            <div
              className="item-h-l fullwidth"
              style={{ marginBottom: "10px" }}
            >
              <Badge size="small" count="badge 1" />
              <Badge size="small" count="badge 2" />
              <Badge size="small" count="badge 3" />
            </div>
            <Typography.Title level={5}>{task.content}</Typography.Title>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="item-h-l" style={{ gap: "10px" }}>
                <Tooltip title={"watching"}>
                  <i className="fi fi-rr-eye" key={"watching"}></i>
                </Tooltip>
                <Tooltip title={"description"}>
                  <i className="fi fi-rr-symbol" key={"description"}></i>
                </Tooltip>
                <Tooltip title={"description"}>
                  <span>
                    <i
                      className="fi fi-rr-comment-alt-middle"
                      key={"comments"}
                    ></i>{" "}
                    <span>0</span>
                  </span>
                </Tooltip>
                <Tooltip title={"attachment"}>
                  <span>
                    <i className="fi fi-rr-clip"></i> <span>0</span>
                  </span>
                </Tooltip>
              </div>
              <Avatar size={"small"}>A</Avatar>
            </div>
          </Card>
        )}
      </Draggable>
      <ModalCardForm open={open} setOpen={setOpen} loading={loading} />
    </div>
  );
};

export default TaskComponent;
