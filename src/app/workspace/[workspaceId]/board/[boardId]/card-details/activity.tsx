import React, { useEffect, useState } from 'react';
import { Button, Input, Avatar, Typography, Divider } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { generateId } from '@utils/general';
import RichTextEditor from '@components/rich-text-editor';
import { ListCollapse } from 'lucide-react';
import { useAccountList } from '@hooks/account';
import { useParams } from 'next/navigation';
import { Account } from '@dto/account';
import { Card, CardActivity } from '@myTypes/card';
import { User } from '@myTypes/user';

interface ActivitySectionProps {
  card: Card;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
  activities: CardActivity[];
  currentUser: User | null;
}

const Activity: React.FC<ActivitySectionProps> = (props) => {
  const {activities, currentUser, card, setCard} = props;
  const params = useParams();
  const workspaceId = typeof params.workspaceId === 'string' ? params.workspaceId : '';
  const boardId = typeof params.boardId === 'string' ? params.boardId : '';
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  const [comment, setComment] = useState("");
  const [firstImage, setFirstImage] = useState<string | null>(null);
  const users =  useAccountList({workspaceId, boardId});

  const enableEditComment = (): void => {
    setIsEditingComment(true);
  };
  
  const disableEditComment = (): void => {
    setIsEditingComment(false);
  };
  
  const handleSaveCommentClick = (): void => {
    if (!currentUser) return;
    
    // const newComment: CardActivity = {
    //   id: generateId(),
    //   type: "text",
    //   text: comment,
    //   // user: currentUser,
    //   // timestamp: new Date().toISOString()
    // }
    // taskService.updateCardDetails(card.id, {"activity": newComment})
    disableEditComment();
  };

  // Function to extract the first image
  const extractFirstImageFromRichText = (htmlContent: string): string | null => {
    if (!htmlContent) return null;
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      const firstImage = tempDiv.querySelector('img');
      return firstImage?.src || null;
    } catch (error) {
      console.error('Error extracting image:', error);
      return null;
    }
  };
  
  const handleContentChange = (content: string) => {
    console.log("content: %o", content);
    setComment(content);

    // Extract the first image whenever content changes
    const imageUrl = extractFirstImageFromRichText(content);

    if (imageUrl !== firstImage) {
      console.log("Found image:", imageUrl ? "Yes" : "No");
      console.log("firstImage: ", firstImage);
      setFirstImage(imageUrl);
      setCard((prev: Card | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          cover: card.cover
        };
      });
    }
  }

  function base64ToFile(base64String: string, filename: string = 'image.png'): File {
    // Extract content type and base64 data
    const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string format');
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    
    // Convert base64 to binary
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    
    for (let i = 0; i < byteCharacters.length; i += 512) {
      const slice = byteCharacters.slice(i, i + 512);
      
      const byteNumbers = new Array(slice.length);
      for (let j = 0; j < slice.length; j++) {
        byteNumbers[j] = slice.charCodeAt(j);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    const blob = new Blob(byteArrays, { type: contentType });
    return new File([blob], filename, { type: contentType });
  }
  
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

  const getUser = (senderId: string) => {
    const foundUser = users?.data?.data?.find((item: Account) => item.id == senderId);
    return foundUser;
  }

  useEffect(() => {
    console.log("users?.data: %o", users?.data);
  }, [users])
  
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <ListCollapse size={18} />
          <h1 className="text-5xl font-bold mb-0">Activity</h1>
        </div>
        <Button 
          type="text" 
          size="small" 
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
        >
          Hide details
        </Button>
      </div>
      
      <div className="flex py-2">
        <div className="mt-1 mr-3">
          <Avatar size={28} className="bg-blue-50 text-blue-500 border border-blue-100">
            {currentUser?.fullname?.substring(0, 2)?.toUpperCase() || "US"}
          </Avatar>
        </div>
        
        <div className="flex-grow">
          {isEditingComment ? (
            <div className="border border-gray-200 rounded-md overflow-hidden mb-3">
              <RichTextEditor
                initialValue={comment ? comment : ""}
                placeholder="Write your comment here..."
                className="w-full text-sm"
                onChange={handleContentChange}
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
              readOnly={true}
              className="text-sm cursor-pointer rounded-full px-4 bg-gray-50 hover:bg-white border border-gray-200 hover:border-gray-300 transition-all"
              prefix={<MessageOutlined className="text-gray-400" />}
            />
          )}
        </div>
      </div>
      
      {activities && activities.length > 0 && (
        <div className="space-y-4 mt-2">
          <Divider className="my-2" />
          {activities.map((item: CardActivity, index: number) => {
            
            const foundUser = getUser(item.senderId);

            return (
              <div key={index} className="flex pt-2">
                <div className="mr-3">
                  <Avatar size={28} className="bg-gray-100 text-gray-600 border border-gray-200">
                    {foundUser?.username?.substring(0, 2)?.toUpperCase() || "0"}
                  </Avatar>
                </div>
                <div className="flex-grow">
                  <div className="mb-1 flex items-baseline">
                    <span className="font-medium text-sm mr-2">{foundUser?.username}</span>
                    {/* <span className="text-gray-400 text-xs">
                      do {item.type} 
                      {item.via && <span className="ml-1 italic">via {item.via}</span>}
                    </span> */}
                  </div>
                  <div>
                    {/* {formatTimestamp(item.timestamp || "2025-03-09T06:15:30.419Z")} */}
                  </div>
                  <div className="text-gray-700 text-xs mb-1 leading-relaxed">
                    {/* {item.content || "Admin User created this counter card"} */}
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Activity;