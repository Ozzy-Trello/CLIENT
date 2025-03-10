import { ActivityItem } from "@/app/dto/types";
import { Avatar, Typography } from "antd";

interface CardDetailsLogsProps {
  logs: ActivityItem;
}
const CardDetailsLogs: React.FC<CardDetailsLogsProps> = ({ logs }) => {
  return (
    <div className="fx-h-left-center" style={{margin: "10px 0px"}}>
      <Avatar size={"small"} src={logs.user.avatar}></Avatar>
      <div>
        <div className="fx-h-left-center">
          <Typography.Text>{logs.user.fullname}</Typography.Text>
          <Typography.Text>{logs.timestamp}</Typography.Text>
        </div>
        
        { logs.type === "comment" && (
          <Typography.Text>{logs.content}</Typography.Text>
        ) }

      </div>
    </div>
  )
}

export default CardDetailsLogs;