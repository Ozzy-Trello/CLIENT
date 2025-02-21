import { Task } from "@/app/dto/types";
import { DraggableProvided } from "@hello-pangea/dnd";
import { Card, Typography } from "antd";

const CardCounter: React.FC<{task: Task, provided: DraggableProvided, setOpen: (value: boolean) => void}> = ({task, provided, setOpen}) => {
  return (
    <Card      
      className="counter-card"
      bordered={false}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        ...provided.draggableProps.style,
      }}
      onClick={() => {
        setOpen(true);
      }}
    >
      <Typography.Title style={{textAlign: "center"}}>{task.title}</Typography.Title>
      <Typography.Text>{task.description}</Typography.Text>
    </Card>
  )
}

export default CardCounter;