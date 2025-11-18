import React, { useState, useEffect } from "react";
import { Button, Input, List, Typography, Space, Upload, Avatar } from "antd";
import { FileOutlined, LinkOutlined } from "@ant-design/icons";
import { FileUpload } from "@myTypes/file-upload"; // Use your existing FileUpload type
import UploadModal from "../modal-upload/modal-upload";
import { cards, searchCards } from "@api/card";
import { result } from "lodash";
import Image from "next/image";
import { File } from "lucide-react";
import { Card } from "@myTypes/card";

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
  workspaceId,
}) => {
  const [displayText, setDisplayText] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recentlyViewedCards, setRecentlyViewedCards] = useState<Card[]>([]);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // Helper to display a friendly board name with safe fallbacks
  const getBoardLabel = (item: Card) => {
    const boardName = (item as any).boardName ?? (item as any).board_name;
    const boardId = (item as any).boardId ?? (item as any).board_id;
    return boardName || boardId || "";
  };

  // Handle search functionality
  const handleSearch = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 3) return;

    const results = await searchCards({ name: value, desription: value });

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
            if (searchQuery && searchQuery.startsWith("http")) {
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
