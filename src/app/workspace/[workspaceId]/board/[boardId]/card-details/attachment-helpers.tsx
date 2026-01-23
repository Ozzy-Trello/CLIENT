import {
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileZipOutlined,
} from "@ant-design/icons";
import React from "react";

export const isImageFile = (fileName: string, mimeType?: string): boolean => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (mimeType && mimeType.startsWith("image/")) {
    return true;
  }

  return imageExtensions.includes(extension);
};

export const isPDFFile = (fileName: string, mimeType?: string): boolean => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (mimeType && mimeType === "application/pdf") {
    return true;
  }

  return extension === "pdf";
};

export const getFileIcon = (fileName: string, mimeType?: string) => {
  if (isImageFile(fileName, mimeType)) {
    return <FileImageOutlined className="text-blue-500 text-2xl" />;
  }

  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return <FilePdfOutlined className="text-red-500 text-2xl" />;
    case "doc":
    case "docx":
      return <FileWordOutlined className="text-blue-700 text-2xl" />;
    case "xls":
    case "xlsx":
    case "csv":
      return <FileExcelOutlined className="text-green-600 text-2xl" />;
    case "zip":
    case "rar":
    case "7z":
      return <FileZipOutlined className="text-yellow-600 text-2xl" />;
    case "txt":
    case "rtf":
      return <FileTextOutlined className="text-gray-600 text-2xl" />;
    default:
      return <FileOutlined className="text-gray-500 text-2xl" />;
  }
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";

  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
};

export const formatFileSizeInMB = (bytes?: number): string => {
  if (!bytes) return "0.0 MB";
  const mbValue = bytes / (1024 * 1024);
  return `${mbValue.toFixed(1)} MB`;
};
