import { User } from "@/app/dto/types";
import { Avatar, Tooltip } from "antd";
import { useState } from "react";

interface MembersListProps {
  members: User[],
  membersLength: number;
  membersLoopLimit: number;
}

const MembersList: React.FC<MembersListProps> = ({members, membersLength, membersLoopLimit}) => {

  const [limit, setLimit] = useState<number>(membersLoopLimit);

  const handleShowAllMembers = () => {
    setLimit(members?.length)
  }

  const handleShowFewMembers = () => {
    setLimit(2);
  }

  return (
    <div className="item-h-l" style={{gap: 3}}>
      {members?.map((member, index) => {
        if (index < limit) {
          return (
            <Tooltip title={member?.username}>
              <Avatar key={index} size="small" src={member?.avatarUrl} />
            </Tooltip>
          )
        } else {
          return null;
        }
      })}

      {membersLength > 2 && limit <= 2 && (
        <Avatar size="small" onClick={handleShowAllMembers}><span>+{members?.length - 2}</span></Avatar>
      )}

      {membersLength > 2 && limit > 2 && (
        <Avatar size="small" onClick={handleShowFewMembers}><i className="fi fi-rr-angle-small-left"></i></Avatar>
      )}
    </div>
  )
}

export default MembersList;