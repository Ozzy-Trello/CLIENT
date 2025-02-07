import { Logs } from "@/app/types/types";
import { Avatar, Typography } from "antd";

interface CardDetailsLogsProps {
  logs: Logs;
}
const CardDetailsLogs: React.FC<CardDetailsLogsProps> = ({ logs }) => {
  return (
    <div className="fx-h-left-center" style={{margin: "10px 0px"}}>
      <Avatar size={"small"} src={logs.createdBy?.avatarUrl}></Avatar>
      <div>
        <div className="fx-h-left-center">
          <Typography.Text>{logs.createdBy?.fullname}</Typography.Text>
          <Typography.Text>{logs.createdAt}</Typography.Text>
        </div>
        
        { logs.type === "comment" && (
          <Typography.Text>{logs.content}</Typography.Text>
        ) }

      </div>
    </div>
  )
}

export default CardDetailsLogs;