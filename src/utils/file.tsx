import {
  UploadOutlined,
  FileOutlined,
  DeleteOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileZipOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

// Helper function to get appropriate icon based on file extension
export const getFileIcon = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (!extension) return <FileOutlined />;

  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension)) {
    return <FileImageOutlined />;
  } else if (["pdf"].includes(extension)) {
    return <FilePdfOutlined />;
  } else if (["doc", "docx"].includes(extension)) {
    return <FileWordOutlined />;
  } else if (["xls", "xlsx", "csv"].includes(extension)) {
    return <FileExcelOutlined />;
  } else if (["zip", "rar", "7z"].includes(extension)) {
    return <FileZipOutlined />;
  } else if (["txt", "rtf"].includes(extension)) {
    return <FileTextOutlined />;
  }

  return <FileOutlined />;
};

export const isImageFile = (fileName: string, mimeType?: string): boolean => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (mimeType && mimeType.startsWith("image/")) {
    return true;
  }

  return imageExtensions.includes(extension);
};
