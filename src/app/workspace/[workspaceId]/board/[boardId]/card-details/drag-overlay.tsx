import React from "react";
import { Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";

interface DragOverlayProps {
  visible: boolean;
}

const DragOverlay: React.FC<DragOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-blue-500 bg-opacity-10 z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <Upload.Dragger
          className="border-dashed border-2 border-blue-500 p-8 rounded-lg"
          showUploadList={false}
          customRequest={({ onSuccess }) => {
            setTimeout(() => {
              onSuccess?.({}, new XMLHttpRequest());
            }, 0);
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: "48px", color: "#1890ff" }} />
          </p>
          <p className="ant-upload-text text-lg font-medium">
            Drop files here to upload
          </p>
          <p className="ant-upload-hint text-gray-500">
            Support for single or bulk upload
          </p>
        </Upload.Dragger>
      </div>
    </div>
  );
};

export default DragOverlay;
