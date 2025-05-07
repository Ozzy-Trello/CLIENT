import React, { useEffect, useState } from 'react';
import { Button, List, Typography } from 'antd';
import { 
  ExportOutlined, 
  EllipsisOutlined, 
  PaperClipOutlined, 
  PlusOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  FileTextOutlined,
  FileOutlined
} from '@ant-design/icons';
import { useCardAttachment } from '@/app/hooks/card_attachment';
import UploadModal from '@/app/components/modal-upload/modal-upload';
import { AttachmentType, Card } from '@/app/types/card';
import { User } from '@/app/types/user';
import { FileUpload } from '@/app/types/file-upload';

interface AttachmentsProps {
  card: Card;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
  currentUser: User | null;
}

const Attachments: React.FC<AttachmentsProps> = (props) => {
  const { card, setCard, currentUser } = props;
  const { cardAttachments, addAttachment } = useCardAttachment(card?.id);
  const [openUploadModal, setOpenUploadmodal] = useState<boolean>(false);
  
  const handleCloseModal = () => {
    setOpenUploadmodal(false);
  }

  const handleOpenModal = () => {
    setOpenUploadmodal(true);
  }

  const handleUpload = (file: File, result: FileUpload) => {
    addAttachment({
      cardId: card.id,
      attachableType: AttachmentType.File,
      attachableId: result.id,
      isCover: false
    });
  }

  // Helper function to determine if a file is an image based on file name or MIME type
  const isImageFile = (fileName: string, mimeType?: string): boolean => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (mimeType && mimeType.startsWith('image/')) {
      return true;
    }
    
    return imageExtensions.includes(extension);
  }

  // Helper function to get appropriate file icon based on file extension
  const getFileIcon = (fileName: string, mimeType?: string) => {
    if (isImageFile(fileName, mimeType)) {
      return <FileImageOutlined className="text-blue-500 text-2xl" />;
    }
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FilePdfOutlined className="text-red-500 text-2xl" />;
      case 'doc':
      case 'docx':
        return <FileWordOutlined className="text-blue-700 text-2xl" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileExcelOutlined className="text-green-600 text-2xl" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <FileZipOutlined className="text-yellow-600 text-2xl" />;
      case 'txt':
      case 'rtf':
        return <FileTextOutlined className="text-gray-600 text-2xl" />;
      default:
        return <FileOutlined className="text-gray-500 text-2xl" />;
    }
  }

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  useEffect(() => {
    if (cardAttachments) {
      const cover = cardAttachments?.find((item) => item.isCover);
      if (cover?.file?.url) {
        setCard((prev: Card | null) => prev ? {
          ...prev,
          cover: cover?.file?.url,
        } : null);
      }
    }
  }, [cardAttachments]);

  return (
    <div className="bg-white p-4 rounded-lg mt-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <PaperClipOutlined className="text-gray-500 mr-2" />
          <Typography.Title level={5} className="m-0">Attachments</Typography.Title>
        </div>
        <Button 
          type="default" 
          size="small" 
          icon={<PlusOutlined />}
          className="flex items-center"
          onClick={handleOpenModal}
        >
          Add
        </Button>
      </div>
     
      <div className="text-xs text-gray-500 font-medium uppercase mb-2">Files</div>
     
      <List
        className="space-y-3"
        dataSource={cardAttachments}
        locale={{ emptyText: "No attachments yet" }}
        renderItem={(item) => (
          <List.Item className="flex items-center p-2 hover:bg-gray-50 rounded">
            <div className="flex-shrink-0 mr-3 w-20 h-15 flex items-center justify-center">
              {isImageFile(item.file?.name || '', item.file?.mimeType) ? (
                <img 
                  src={item.file?.url} 
                  alt={item.file?.name || "attachment"} 
                  className="w-20 h-15 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-15 bg-gray-100 rounded flex items-center justify-center">
                  {getFileIcon(item.file?.name || '', item.file?.mimeType)}
                </div>
              )}
            </div>
           
            <div className="flex-grow">
              <div className="text-sm font-medium">{item.file?.name}</div>
              <div className="text-xs text-gray-500 flex items-center space-x-2">
                <span>{formatFileSize(item.file?.size)}</span>
                {item.file?.mimeType && <span>•</span>}
                <span>{item.file?.mimeType}</span>
                {item.isCover && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded">
                    Cover
                  </span>
                )}
              </div>
            </div>
           
            <div className="flex-shrink-0 flex space-x-1">
              <Button 
                icon={<ExportOutlined />} 
                size="small" 
                title="Download"
                onClick={() => window.open(item.file?.url, '_blank')}
                className="flex items-center justify-center border-0 shadow-none"
              />
              <Button 
                icon={<EllipsisOutlined />} 
                size="small" 
                title="More options"
                className="flex items-center justify-center border-0 shadow-none"
              />
            </div>
          </List.Item>
        )}
      />

      <UploadModal 
        isVisible={openUploadModal}
        onClose={handleCloseModal}
        onUploadComplete={handleUpload}
        uploadType="all"
        title="Upload attachment"
      />
    </div>
  );
};

export default Attachments;