import React, { useState, useEffect } from "react";
import { 
  Button, 
  Input, 
  List, 
  Typography, 
  Space,
  Upload,
  Avatar,
} from "antd";
import { 
  FileOutlined, 
  LinkOutlined
} from "@ant-design/icons";
import { FileUpload } from "@/app/types/file-upload"; // Use your existing FileUpload type
import UploadModal from "../modal-upload/modal-upload";
import { cards, searchCards } from "@/app/api/card";
import { result } from "lodash";
import Image from "next/image";
import { File } from "lucide-react";
import { Card } from "@/app/types/card";

const { Text } = Typography;

interface ContentAttachProps {
  onAttachFile: (file: File, result: FileUpload) => void;
  onAttachCard: (cardId: string) => void;
  onClose: () => void;
  card: Card | null;
  workspaceId: string;
}

const ContentAttach: React.FC<ContentAttachProps> = ({
  onAttachFile,
  onAttachCard,
  onClose,
  card,
  workspaceId
}) => {
  const [displayText, setDisplayText] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recentlyViewedCards, setRecentlyViewedCards] = useState<Card[]>([]);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);


  // Handle search functionality
  const handleSearch = async(value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 3) return;
    
    const results = await searchCards({name: value, desription: value});
      
    if (results && results.data) {
      setSearchResults(results.data);
    } else {
      setSearchResults([]);
    }
  };

  // Open the upload modal when "Choose a file" is clicked
  const handleOpenUploadModal = () => {
    setUploadModalVisible(true);
  };

  // Handle file upload completion
  const handleUploadComplete = (file: File, result: FileUpload) => {
    onAttachFile(file, result);
    setUploadModalVisible(false);
  };

  // Handle attaching a card
  const handleAttachCard = (cardId: string) => {
    onAttachCard(cardId);
    onClose();
  };

  return (
    <div className="p-2 w-sm overflow-auto">
      <div className="text-[10px] mb-2">
        <Text strong>Attach a file from your computer</Text>
        <Text type="secondary" className="block mt-1">
          You can also drag and drop files to upload them.
        </Text>
        
        <Button
          size="small"
          className="w-full mt-3"
          onClick={handleOpenUploadModal}
        >
          Choose a file
        </Button>
      </div>
      
      <div className="mb-2">
        <Text strong>Search or paste a link</Text>
        <Input 
          placeholder="Find recent links or paste a new link"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="mt-1"
          prefix={<LinkOutlined className="text-gray-400" />}
        />
      </div>
      
      <div className="mb-2">
        <Text strong>Display text (optional)</Text>
        <Input 
          placeholder="Text to display"
          value={displayText}
          onChange={(e) => setDisplayText(e.target.value)}
          className="mt-1"
        />
      </div>
      

      <div className="max-h-40 overflow-auto mb-2 p-2">
        {searchQuery ? (
          <div className="w-full">
            <Text strong>Search Results</Text>
            <List
              dataSource={searchResults}
              renderItem={(item) => (
                <List.Item 
                  key={item.id}
                  onClick={() => handleAttachCard(item.id)}
                  className="w-full cursor-pointer hover:bg-gray-50 px-2 rounded"
                >
                  <List.Item.Meta
                    avatar={
                      item.cover? 
                        <img src={item.cover} alt={item.name} className="w-20 h-auto object-cover rounded"/> :
                        <div className="flex justify-center items-center w-20 h-10 rounded bg-gray-200">
                          <Avatar shape="square" src={`https://ui-avatars.com/api/?name=${item?.name}&background=random`}></Avatar>
                        </div>
                    }
                    title={item.name}
                    description={
                      <div className="prose prose-sm max-w-none text-[10px]" dangerouslySetInnerHTML={{ __html: item.description || '' }} />
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "No results found" }}
              className="max-h-48 overflow-auto"
            />
          </div>
        ) : (
          <div className="w-full">
            <Text strong>Recently Viewed</Text>
            <List
              dataSource={recentlyViewedCards}
              renderItem={(item) => (
                <List.Item 
                  key={item.id}
                  onClick={() => handleAttachCard(item.id)}
                  className="cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                >
                  <List.Item.Meta
                    avatar={<FileOutlined className="text-blue-500" />}
                    title={item.name}
                    description={
                      <div>
                        <Text type="secondary" className="text-xs">{item.description}</Text>
                        <Text type="secondary" className="text-xs mx-1">•</Text>
                        <Text type="secondary" className="text-xs">
                          Viewed {item.createdAt}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
              className="max-h-64 overflow-auto -mx-2 px-2"
            />
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Button onClick={onClose} size="small">
          Cancel
        </Button>
        <Button
          size="small"
          type="primary" 
          onClick={() => {
            // If there's a valid link entered, attach it
            if (searchQuery && searchQuery.startsWith('http')) {
              // Here you would handle link attachment
              // For now just close the popover
              onClose();
            } else {
              // Otherwise open the file upload modal
              handleOpenUploadModal();
            }
          }}
        >
          Insert
        </Button>
      </div>

      <UploadModal
        isVisible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onUploadComplete={handleUploadComplete}
        uploadType="all"
        title="Upload File"
      />
    </div>
  );
};

export default ContentAttach;