import { CardActivity } from "@/app/dto/types";
import { Avatar, Typography } from "antd";

interface CardDetailsLogsProps {
  logs: CardActivity;
}
const CardDetailsLogs: React.FC<CardDetailsLogsProps> = ({ logs }) => {
  return (
    <div className="fx-h-left-center" style={{margin: "10px 0px"}}>
      <Avatar size={"small"} src={`https://ui-avatars.com/api/?name=${logs?.senderUsername}&background=random`}></Avatar>
      <div>
        <div className="fx-h-left-center">
          <Typography.Text>{logs.senderUsername}</Typography.Text>
          <Typography.Text>timestamp</Typography.Text>
        </div>
        
        { logs.type === "text" && (
          <Typography.Text>{logs.text}</Typography.Text>
        ) }

      </div>
    </div>
  )
}

export default CardDetailsLogs;