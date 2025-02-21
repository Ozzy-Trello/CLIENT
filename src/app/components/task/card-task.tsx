import { Task } from "@/app/dto/types";
import { DraggableProvided } from "@hello-pangea/dnd";
import { Avatar, Card, Tag, Tooltip, Typography } from "antd";

const CardTask: React.FC<{task: Task, provided: DraggableProvided, setOpen: (value: boolean) => void}> = ({task, provided, setOpen}) => {
  return (
    <Card      
      className="task-card"
      bordered={false}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        ...provided.draggableProps.style,
      }}
      cover={
        <img
          alt=""
          src={task.cover}
        />
      }
      onClick={() => {
        setOpen(true);
      }}
    >
      <div className="section section-badge fullwidth" style={{ marginBottom: "10px" }}>
        { task?.customFields?.list?.map(task => ( <Tag color="processing" style={{fontSize: "10px"}}>{task.value}</Tag>)) }
      </div>

      <div className="section section-title">
        <Typography.Title level={5} className="m-0">{task.title}</Typography.Title>
      </div>

      <div className="section section-meta fx-h-left-center" style={{ gap: "15px" }}>
        {/* watching */}
        <Tooltip title={"watching"}>
          <span className="tx-small">
            <i className="fi fi-rr-eye tx-small" key={"watching"}></i>
          </span>
        </Tooltip>

        {/* desc */}
        <Tooltip title={"description"}>
          <span className="tx-small">
            <i className="fi fi-rr-symbol" key={"description"}></i>
          </span>
        </Tooltip>

        {/* comment */}
        <Tooltip title={"comment"}>
          <span className="tx-small">
            <i
              className="fi fi-rr-comment-alt-middle"
              key={"comments"}
            ></i>{" "}
            <span>0</span>
          </span>
        </Tooltip>

        {/* attachament */}
        <Tooltip title={"attachment"}>
          <span className="tx-small">
            <i className="fi fi-rr-clip"></i> <span>0</span>
          </span>
        </Tooltip>
      </div>

      <div className="section section-detail">
        { task?.customFields?.list?.map(task => (
          <Typography.Text style={{display: 'block'}}>{task?.key} : {task?.value}</Typography.Text>
        )) }
      </div>
      
      <div className="fx-h-left-center">
        <Tooltip title={"time on board"}>
          <div className="section fx-h-left-center tx-small" style={{gap: "4px"}}>
            <i className="fi fi-rr-calendar-clock"></i>
            <span className="tx-small">{task?.dueDate}</span>
          </div>
        </Tooltip>

        <Tooltip title={"time in list"}>
          <div className="section fx-h-left-center tx-small" style={{gap: "4px"}}>
            <i className="fi fi-rs-calendar-lines"></i>
            <span className="tx-small">{task?.dueDate}</span>
          </div>
        </Tooltip>

      </div>

      <div className="section section-avatar fx-h-right-center">
        <Avatar size={"small"} src={task?.createdBy?.avatarUrl}></Avatar>
      </div>
    </Card>
  )
}

export default CardTask;