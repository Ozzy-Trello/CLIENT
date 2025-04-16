import { User } from "@/app/dto/types";
import { Avatar, Tooltip } from "antd";
import { ChevronLeft, Plus } from "lucide-react";
import { useState } from "react";
import PopoverUser from "../popover-user";

interface MembersListProps {
  members: User[],
  membersLength: number;
  membersLoopLimit: number;
  openAddMember: boolean;
  setOpenAddMember: (open: boolean) => void;
}

const MembersList: React.FC<MembersListProps> = ({members, membersLength, membersLoopLimit, openAddMember, setOpenAddMember}) => {

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
              <Avatar key={index} size="small" src={member?.avatar} />
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
        <Avatar size="small" onClick={handleShowFewMembers} icon={<ChevronLeft size={16} />}></Avatar>
      )}

      <Tooltip title={"add member"}>
        
      <PopoverUser
        open={openAddMember}
        setOpen={setOpenAddMember}
        triggerEl={
          <Avatar size="small"><Plus size={14} /></Avatar>
        }
      />
      </Tooltip>
    </div>
  )
}

export default MembersList;