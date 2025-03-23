import { useState, useRef, useEffect } from 'react';
import { Button, message, Modal } from 'antd';
import { 
  UploadOutlined, 
  FileOutlined, 
  DeleteOutlined, 
  FileImageOutlined, 
  FilePdfOutlined, 
  FileZipOutlined 
} from '@ant-design/icons';

// Define file type configurations
const FILE_TYPE_CONFIGS = {
  'image': {
    accept: 'image/*',
    icon: <FileImageOutlined />,
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  'document': {
    accept: '.pdf,.doc,.docx,.txt,.rtf',
    icon: <FilePdfOutlined />,
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  'compressed': {
    accept: '.zip,.rar,.7z',
    icon: <FileZipOutlined />,
    maxSize: 20 * 1024 * 1024, // 20MB
  },
  'all': {
    accept: '*',
    icon: <FileOutlined />,
    maxSize: 50 * 1024 * 1024, // 50MB
  }
};

interface UploadModalProps {
  isVisible: boolean;
  onClose: () => void;
  onUploadComplete?: (file: File) => void;
  uploadType?: keyof typeof FILE_TYPE_CONFIGS;
  title?: string;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isVisible,
  onClose,
  onUploadComplete,
  uploadType = 'all',
  title = 'Upload File'
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  const fileTypeConfig = FILE_TYPE_CONFIGS[uploadType];

  useEffect(() => {
    // Reset state when modal closes or upload type changes
    if (!isVisible) {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [isVisible, uploadType]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    // Create preview for image files
    if (selectedFile.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [selectedFile]);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > fileTypeConfig.maxSize) {
      message.error(`File size exceeds ${fileTypeConfig.maxSize / 1024 / 1024}MB limit`);
      return false;
    }

    // Check file type if not 'all'
    if (uploadType !== 'all') {
      const acceptedTypes = fileTypeConfig.accept.split(',');
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const fileType = file.type;

      const isValidType = acceptedTypes.some(type => 
        type.endsWith('*') 
          ? fileType.startsWith(type.replace('*', ''))
          : type === fileExtension
      );

      if (!isValidType) {
        message.error(`Please upload a valid file type: ${fileTypeConfig.accept}`);
        return false;
      }
    }

    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleFileDrop = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      message.error('Please select a file first!');
      return;
    }
    
    setIsUploading(true);
   
    setTimeout(() => {
      if (onUploadComplete) {
        onUploadComplete(selectedFile);
      }
     
      message.success('File uploaded successfully!');
     
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    }, 1500);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setSelectedFile(null);
    onClose();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  // Drag event handlers (same as before)
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileDrop(e.dataTransfer.files);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={fileTypeConfig.accept}
        style={{ display: 'none' }}
      />

      <Modal
        title={title}
        open={isVisible}
        onCancel={handleCancel}
        width={520}
        footer={[
          <Button key="back" onClick={handleCancel} className="rounded-md m-2">
            Cancel
          </Button>,
          <Button
            key="select"
            onClick={triggerFileInput}
            disabled={isUploading}
            icon={<UploadOutlined />}
            className="rounded-md m-2"
          >
            {selectedFile ? 'Change File' : 'Select File'}
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={isUploading}
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-blue-600 hover:bg-blue-700 rounded-md m-2"
          >
            Upload
          </Button>,
        ]}
      >
        <div className="mb-6 px-4">
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {fileTypeConfig.icon}
                  <div>
                    <p className="font-medium text-gray-800">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={handleRemoveFile}
                  shape="circle"
                />
              </div>

              {previewUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <div className="relative overflow-hidden rounded-lg border border-gray-200">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-64 object-contain bg-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div 
              ref={dropAreaRef}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-500'
              }`}
              onClick={triggerFileInput}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {fileTypeConfig.icon}
              <p className={`text-4xl mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className={`${isDragging ? 'text-blue-600' : 'text-gray-600'}`}>
                {isDragging 
                  ? `Drop ${uploadType} file here` 
                  : 'Click or drag file to this area to upload'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports {uploadType} file upload (Max: {fileTypeConfig.maxSize / 1024 / 1024}MB)
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default UploadModal;