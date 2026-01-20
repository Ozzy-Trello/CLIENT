import React, { useEffect, useState, useRef } from "react";
import { Button, Input, Avatar, Typography, Divider } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import { generateId } from "@utils/general";
import RichTextEditor from "@components/rich-text-editor";
import { ListCollapse } from "lucide-react";
import { useAccountList } from "@hooks/account";
import { useParams } from "next/navigation";
import { Account } from "@dto/account";
import { Card, CardActivity, EnumCardActivityType } from "@myTypes/card";
import { User } from "@myTypes/user";
import { useCardActivity } from "@hooks/card_activity";
import CardAttachmentImageListModal from "@components/modal-list-card-attachment-images";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";

interface ActivitySectionProps {
  card: Card;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
  currentUser: User | null;
}

const Activity: React.FC<ActivitySectionProps> = (props) => {
  const { currentUser, card, setCard } = props;
  const {
    cardActivities,
    filter,
    setFilter,
    hasMore,
    isLoadingMore,
    loadMore,
    addCardActivity,
    updateComment,
    isAddingActivity,
    isUpdatingComment,
    addActivityError,
    mutationState,
    resetMutation,
    isLoading,
  } = useCardActivity(card?.id);
  const params = useParams();
  const workspaceId =
    typeof params.workspaceId === "string" ? params.workspaceId : "";
  const boardId = typeof params.boardId === "string" ? params.boardId : "";
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  const [comment, setComment] = useState("");
  const [firstImage, setFirstImage] = useState<string | null>(null);
  const [openCardAttachmentListModal, setOpenCardAttachmentListModal] =
    useState<boolean>(false);
  const [selectedattachmentImageUrl, setSelectedAttachmentImageUrl] =
    useState<string>("");
  const editorRef = useRef<any>(null);
  const [pendingMention, setPendingMention] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const editEditorRef = useRef<any>(null);

  // Get board permissions
  const { canCommentOnCard } = useBoardPermissionsContext();

  const enableEditComment = (): void => {
    if (canCommentOnCard()) {
      setIsEditingComment(true);
    }
  };

  const disableEditComment = (): void => {
    setIsEditingComment(false);
  };

  const handleSaveCommentClick = (): void => {
    // Add validation
    if (!comment || comment.trim() === "") {
      return;
    }

    if (!card?.id) {
      return;
    }

    if (!currentUser?.id) {
      return;
    }

    const newComment: CardActivity = {
      id: generateId(),
      senderUserId: currentUser.id,
      cardId: card.id,
      activityType: EnumCardActivityType.Comment,
      triggeredBy: "user",
      comment: {
        text: comment,
      },
    };

    // Call the mutation
    addCardActivity(newComment);

    // Reset form after successful submission
    setComment("");
    disableEditComment();
  };

  // Function to extract the first image
  const extractFirstImageFromRichText = (
    htmlContent: string
  ): string | null => {
    if (!htmlContent) return null;

    try {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlContent;

      const firstImage = tempDiv.querySelector("img");
      return firstImage?.src || null;
    } catch (error) {
      console.error("Error extracting image:", error);
      return null;
    }
  };

  const handleContentChange = (content: string) => {
    setComment(content);

    // Extract the first image whenever content changes
    const imageUrl = extractFirstImageFromRichText(content);

    if (imageUrl !== firstImage) {
      setFirstImage(imageUrl);
      setCard((prev: Card | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          cover: card.cover,
        };
      });
    }
  };

  function base64ToFile(
    base64String: string,
    filename: string = "image.png"
  ): File {
    // Extract content type and base64 data
    const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string format");
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
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return timestamp;
    }
  };

  // Add this function to handle reply
  const handleReply = (username: string, userId?: string) => {
    setIsEditingComment(true);
    if (userId) {
      setPendingMention({ userId, username });
    }
  };

  // Effect to insert mention after editor mounts if pendingMention is set
  useEffect(() => {
    if (
      isEditingComment &&
      pendingMention &&
      editorRef.current &&
      editorRef.current.insertMention
    ) {
      setTimeout(() => {
        editorRef.current.insertMention(
          pendingMention.userId,
          pendingMention.username
        );
        editorRef.current.focus && editorRef.current.focus();
        setPendingMention(null);
      }, 0);
    }
  }, [isEditingComment, pendingMention]);

  // Function to render activity messages with clickable filenames
  const renderActivityMessage = (newValue: any) => {
    if (!newValue) return "";

    try {
      const parsedValue =
        typeof newValue === "string" ? JSON.parse(newValue) : newValue;

      if (parsedValue.message && parsedValue.filename) {
        // For attachment activities, make filename clickable only if it's an upload (has fileUrl)
        const message = parsedValue.message;
        const filename = parsedValue.filename;
        const fileUrl = parsedValue.fileUrl;

        // Only make clickable if it's an upload (fileUrl exists and is not null)
        if (fileUrl) {
          // Replace the filename in quotes with a clickable link
          const filenamePattern = new RegExp(
            `'${filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`,
            "g"
          );
          const parts = message.split(filenamePattern);

          if (parts.length > 1) {
            return (
              <span>
                {parts[0]}
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                  style={{
                    textDecoration: "underline",
                    textDecorationColor: "#2563eb",
                  }}
                >
                  {filename}
                </a>
                {parts.slice(1).join(filename)}
              </span>
            );
          }
        } else {
          // For removal activities (no fileUrl), just show the filename in quotes without link
          return parsedValue.message;
        }
      }

      // Fallback to original message
      return parsedValue.message || parsedValue.action || "";
    } catch (error) {
      // If parsing fails, return the original value
      return newValue.message || newValue.action || "";
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <ListCollapse size={18} />
          <h1 className="text-5xl font-bold mb-0">Activity</h1>
        </div>
        <div className="flex items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "comment", label: "Comments" },
            { key: "action", label: "Activity" },
          ].map((opt) => (
            <Button
              key={opt.key}
              type={filter === opt.key ? "primary" : "default"}
              size="small"
              className={`text-xs ${
                filter === opt.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600"
              }`}
              onClick={() =>
                setFilter(opt.key as "all" | "comment" | "action")
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex py-2">
        <div className="mt-1 mr-3">
          <Avatar
            size={28}
            className="bg-blue-50 text-blue-500 border border-blue-100"
          >
            {currentUser?.fullname?.substring(0, 2)?.toUpperCase() || "US"}
          </Avatar>
        </div>

        <div className="flex-grow">
          {isEditingComment ? (
            <div className="border border-gray-200 rounded-md mb-3">
              <RichTextEditor
                ref={editorRef}
                initialValue={comment ? comment : ""}
                placeholder="Write your comment here..."
                className="w-full text-sm"
                onChange={handleContentChange}
                workspaceId={workspaceId}
                boardId={boardId}
                hasCustomImageSelector={true}
                setOpenCustomImageSelector={setOpenCardAttachmentListModal}
                openCustomImagesSelector={openCardAttachmentListModal}
                selectedAttachmentImageUrl={selectedattachmentImageUrl}
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
              placeholder={canCommentOnCard() ? "Write a comment..." : "You don't have permission to comment"}
              onClick={enableEditComment}
              readOnly={true}
              disabled={!canCommentOnCard()}
              className={`text-sm rounded-full px-4 border border-gray-200 transition-all ${
                canCommentOnCard() 
                  ? "cursor-pointer bg-gray-50 hover:bg-white hover:border-gray-300" 
                  : "cursor-not-allowed bg-gray-100 opacity-60"
              }`}
              prefix={<MessageOutlined className="text-gray-400" />}
            />
          )}
        </div>
      </div>

      {cardActivities && cardActivities.length > 0 && (
        <div className="space-y-4 mt-2">
          <Divider className="my-2" />
          {cardActivities.map((item: CardActivity, index: number) => {
            return (
              <div key={index} className="flex pt-2">
                <div className="mr-3">
                  <Avatar
                    size={28}
                    className="bg-gray-100 text-gray-600 border border-gray-200"
                  >
                    {item?.senderUserUsername?.substring(0, 2)?.toUpperCase() ||
                      "-"}
                  </Avatar>
                </div>
                <div className="flex-grow">
                  <div className="flex items-baseline mb-1">
                    <span className="font-bold text-sm mr-2">
                      {item?.senderUserUsername}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(
                        item.createdAt || "2025-03-09T06:15:30.419Z"
                      )}
                    </span>
                  </div>
                  {item.action ? (
                    <div className="text-sm">
                      {renderActivityMessage(item.action?.newValue)}
                      {item?.triggeredBy != "user" && (
                        <span className="ml-1 italic text-xs text-gray-400">
                          via {item.triggeredBy}
                        </span>
                      )}
                    </div>
                  ) : editingCommentId === item.id ? (
                    <div className="space-y-2">
                      <RichTextEditor
                        ref={editEditorRef}
                        initialValue={editingContent}
                        placeholder="Edit your comment..."
                        className="w-full text-sm"
                        onChange={(val: string) => setEditingContent(val)}
                        workspaceId={workspaceId}
                        boardId={boardId}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingContent("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="primary"
                          size="small"
                          loading={isUpdatingComment}
                          onClick={() => {
                            const plain = editingContent
                              .replace(/<[^>]*>/g, "")
                              .trim();
                            if (!plain) return;
                            updateComment(item.id, editingContent);
                            setEditingCommentId(null);
                            setEditingContent("");
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none text-sm"
                      dangerouslySetInnerHTML={{
                        __html: item?.comment?.text || "",
                      }}
                    />
                  )}
                  <div>
                    <Button
                      type="link"
                      size="small"
                      className="text-xs text-gray-500 hover:text-blue-600 p-0 h-auto"
                      onClick={() =>
                        handleReply(
                          item?.senderUserUsername || "",
                          item?.senderUserId
                        )
                      }
                    >
                      Reply
                    </Button>
                    {!item.action && currentUser?.id === item?.senderUserId && (
                      <Button
                        type="link"
                        size="small"
                        className="text-xs text-gray-500 hover:text-blue-600 p-0 h-auto ml-2"
                        onClick={() => {
                          setEditingCommentId(item.id);
                          setEditingContent(item?.comment?.text || "");
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button onClick={loadMore} loading={isLoadingMore}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}

      <CardAttachmentImageListModal
        isVisible={openCardAttachmentListModal}
        selectedCard={card}
        setSelectedImageUrl={setSelectedAttachmentImageUrl}
        handleCancel={() => {
          setOpenCardAttachmentListModal(false);
        }}
      />
    </div>
  );
};

export default Activity;
