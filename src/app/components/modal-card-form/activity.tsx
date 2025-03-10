import React, { useState } from 'react';
import { Button, Input, Avatar, Typography, Divider } from 'antd';
import { ClockCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { ActivityItem, Card, User } from '@/app/dto/types';
import RichTextEditor from '../rich-text-editor';
import useTaskService from '@/app/hooks/task';
import { generateId } from '@/app/utils/general';

interface ActivitySectionProps {
  card: Card
  activities: ActivityItem[],
  currentUser: User;
}

const ActivitySection: React.FC<ActivitySectionProps> = (props) => {
  const {activities, currentUser, card} = props;
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  const [comment, setComment] = useState("");
  const {taskService} = useTaskService();
  
  const enableEditComment = (): void => {
    setIsEditingComment(true);
  };
  
  const disableEditComment = (): void => {
    setIsEditingComment(false);
  };
  
  const handleSaveCommentClick = (): void => {
    const newComment: ActivityItem = {
      id: generateId(),
      type: "comment",
      content: comment,
      user: currentUser,
      timestamp: new Date().toISOString()
    }
    taskService.updateCardDetails(card.id, {"activity": newComment})
    disableEditComment();
  };
  
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return timestamp;
    }
  };
  
  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center">
          <ClockCircleOutlined className="text-gray-500 mr-2 text-sm" />
          <span className="text-base font-medium">Activity</span>
        </div>
        <Button 
          type="text" 
          size="small" 
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
        >
          Hide details
        </Button>
      </div>
      
      <div className="flex py-4">
        <div className="mt-1 mr-3">
          <Avatar size={32} className="bg-blue-50 text-blue-500 border border-blue-100">
            {currentUser?.fullname?.substring(0, 2)?.toUpperCase() || "AD"}
          </Avatar>
        </div>
        
        <div className="flex-grow">
          {isEditingComment ? (
            <div className="border border-gray-200 rounded-md overflow-hidden mb-3">
              <RichTextEditor
                initialValue={comment ? comment : ""}
                placeholder="Write your comment here..."
                height="120px"
                className="w-full text-sm"
                onChange={(content: string) => {
                  setComment(content);
                }}
              />
              <div className="flex justify-end p-2 bg-gray-50 border-t">
                <Button 
                  onClick={disableEditComment} 
                  size="small" 
                  className="mr-2 rounded-md text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleSaveCommentClick} 
                  size="small" 
                  className="rounded-md bg-blue-600 hover:bg-blue-700 text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <Input
              placeholder="Write a comment..."
              onClick={enableEditComment}
              className="text-sm rounded-full px-4 bg-gray-50 hover:bg-white border border-gray-200 hover:border-gray-300 transition-all"
              prefix={<MessageOutlined className="text-gray-400" />}
            />
          )}
        </div>
      </div>
      
      {activities && activities.length > 0 ? (
        <div className="space-y-4 mt-2">
          <Divider className="my-2" />
          {activities.map((item: ActivityItem, index: number) => (
            <div key={index} className="flex pt-2">
              <div className="mr-3">
                <Avatar size={28} className="bg-gray-100 text-gray-600 border border-gray-200">
                  {item.user?.fullname?.substring(0, 2)?.toUpperCase() || "AD"}
                </Avatar>
              </div>
              <div className="flex-grow">
                <div className="mb-1 flex items-baseline">
                  <span className="font-medium text-sm mr-2">{item.user.fullname || "Admin User"}</span>
                  <span className="text-gray-400 text-xs">
                    {formatTimestamp(item.timestamp || "2025-03-09T06:15:30.419Z")}
                    {item.via && <span className="ml-1 italic">via {item.via}</span>}
                  </span>
                </div>
                <div className="text-gray-700 text-xs mb-1 leading-relaxed">
                  {item.content || "Admin User created this counter card"}
                </div>
                <div>
                  <Button
                    type="link"
                    size="small"
                    className="text-xs text-gray-500 hover:text-blue-600 p-0 h-auto"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2">
          <Divider className="my-2" />
          <div className="flex pt-2">
            <div className="mr-3">
              <Avatar size={28} className="bg-gray-100 text-gray-600 border border-gray-200">
                AD
              </Avatar>
            </div>
            <div className="flex-grow">
              <div className="mb-1 flex items-baseline">
                <span className="font-medium text-sm mr-2">Admin User</span>
                <span className="text-gray-400 text-xs">
                  {formatTimestamp("2025-03-09T06:15:30.419Z")}
                </span>
              </div>
              <div className="text-gray-700 text-xs mb-1 leading-relaxed">
                Admin User created this counter card
              </div>
              <div>
                <Button
                  type="link"
                  size="small"
                  className="text-xs text-gray-500 hover:text-blue-600 p-0 h-auto"
                >
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitySection;