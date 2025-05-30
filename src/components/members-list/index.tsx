import { Avatar, Tooltip } from "antd";
import { ChevronLeft, Plus } from "lucide-react";
import { useState } from "react";
import PopoverUser from "../popover-user";
import { User } from "@myTypes/user";

interface MembersListProps {
  members: User[];
  membersLength: number;
  membersLoopLimit: number;
  openAddMember?: boolean;
  setOpenAddMember?: (open: boolean) => void;
  onUserSelectionChange?: (value: string, option?: any) => void;
}

const MembersList: React.FC<MembersListProps> = ({
  members = [], // Default to empty array
  membersLength, 
  membersLoopLimit, 
  openAddMember, 
  setOpenAddMember, 
  onUserSelectionChange
}) => {
  const [limit, setLimit] = useState<number>(membersLoopLimit);

  // Helper function to get user display name
  const getDisplayName = (member: User): string => {
    return member?.fullname || member?.name || member?.username || member?.email || 'Unknown';
  };

  // Helper function to generate initials from name
  const getInitials = (member: User): string => {
    const name = getDisplayName(member);
    
    // If it's an email, use the part before @
    if (name.includes('@')) {
      const emailName = name.split('@')[0];
      return emailName.slice(0, 2).toUpperCase();
    }
    
    // Split by spaces and take first letter of each word
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
      return nameParts[0].slice(0, 2).toUpperCase();
    } else {
      return name.slice(0, 2).toUpperCase();
    }
  };

  // Helper function to generate consistent background color based on name
  const getAvatarColor = (member: User): string => {
    const name = getDisplayName(member);
    const colors = [
      '#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac',
      '#4299e1', '#667eea', '#9f7aea', '#ed64a6', '#fc8181',
      '#f6ad55', '#68d391', '#4fd1c7', '#63b3ed', '#a78bfa'
    ];
    
    // Simple hash function to get consistent color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleShowAllMembers = () => {
    setLimit(members.length);
  };

  const handleShowFewMembers = () => {
    setLimit(membersLoopLimit);
  };

  const remainingCount = Math.max(0, membersLength - limit);
  const shouldShowExpandButton = membersLength > membersLoopLimit && limit <= membersLoopLimit;
  const shouldShowCollapseButton = membersLength > membersLoopLimit && limit > membersLoopLimit;

  return (
    <div className="flex items-center">
      {/* Members avatars with overlapping effect */}
      <div className="flex -space-x-1">
        {Array.isArray(members) && 
          members.slice(0, limit).map((member, index) => (
          <Tooltip 
            key={member.id || index} 
            title={getDisplayName(member)}
            placement="top"
          >
            <div 
              className="relative transition-transform hover:scale-110 hover:z-10 cursor-pointer"
              style={{ zIndex: members.length - index }}
            >
              {member?.avatar ? (
                <Avatar 
                  size="small" 
                  src={member.avatar}
                  className="border-2 border-white shadow-sm hover:shadow-md transition-shadow"
                />
              ) : (
                <Avatar 
                  size="small"
                  className="border-2 border-white shadow-sm hover:shadow-md transition-shadow"
                  style={{ 
                    backgroundColor: getAvatarColor(member),
                    color: 'white',
                    fontWeight: '500',
                    fontSize: '10px'
                  }}
                >
                  {getInitials(member)}
                </Avatar>
              )}
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Show more button */}
      {shouldShowExpandButton && (
        <Tooltip title={`Show ${remainingCount} more member${remainingCount > 1 ? 's' : ''}`}>
          <div className="ml-1">
            <Avatar 
              size="small" 
              onClick={handleShowAllMembers}
              className="border-2 border-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105"
              style={{ 
                backgroundColor: '#6b7280',
                color: 'white',
                fontSize: '10px',
                fontWeight: '500'
              }}
            >
              +{remainingCount}
            </Avatar>
          </div>
        </Tooltip>
      )}

      {/* Show less button */}
      {shouldShowCollapseButton && (
        <Tooltip title="Show fewer members">
          <div className="ml-1">
            <Avatar 
              size="small" 
              onClick={handleShowFewMembers} 
              className="border-2 border-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105"
              style={{ 
                backgroundColor: '#6b7280',
                color: 'white'
              }}
            >
              <ChevronLeft size={12} />
            </Avatar>
          </div>
        </Tooltip>
      )}

      {/* Add member button */}
      <Tooltip title="Add member">
        <div className="ml-2">
          {openAddMember !== undefined && setOpenAddMember !== undefined &&(
            <PopoverUser
              open={openAddMember}
              setOpen={setOpenAddMember}
              onUserSelectionChange={onUserSelectionChange}
              triggerEl={
                <Avatar 
                  size="small"
                  className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all cursor-pointer hover:scale-105"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    borderStyle: 'dashed'
                  }}
                >
                  <Plus size={12} />
                </Avatar>
              }
            />
          )}
        </div>
      </Tooltip>
    </div>
  );
};

export default MembersList;