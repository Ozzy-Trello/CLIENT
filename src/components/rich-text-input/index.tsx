import React, { useState, useRef } from "react";
import { Button } from "antd";
import { Edit3 } from "lucide-react";
import RichTextEditor from "@components/rich-text-editor";
import { useParams } from "next/navigation";

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextInput: React.FC<RichTextInputProps> = ({
  value,
  onChange,
  placeholder = "Enter description...",
  className = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const boardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;

  const handleEdit = () => {
    setTempValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className={`border rounded-md overflow-hidden ${className}`}
        style={{ width: 400 }}
      >
        <RichTextEditor
          initialValue={tempValue}
          onChange={setTempValue}
          placeholder={placeholder}
          workspaceId={workspaceId}
          boardId={boardId}
          minHeight="120px"
          maxHeight="200px"
        />
        <div className="flex justify-end gap-2 p-2 bg-gray-50 border-t">
          <Button size="small" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="small" type="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 border rounded-md cursor-pointer hover:bg-gray-50 ${className}`}
      onClick={handleEdit}
      style={{ maxWidth: 300 }}
    >
      <Edit3 size={14} className="text-gray-400" />
      <span className="text-sm text-gray-600 truncate">
        {value ? (
          <div
            className="truncate"
            dangerouslySetInnerHTML={{
              __html:
                value.replace(/<[^>]*>/g, "").substring(0, 50) +
                (value.length > 50 ? "..." : ""),
            }}
          />
        ) : (
          placeholder
        )}
      </span>
    </div>
  );
};

export default RichTextInput;
