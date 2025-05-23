import { useState, useRef, useEffect } from 'react';
import { Button, message, Modal } from 'antd';
import { 
  UploadOutlined, 
  FileOutlined, 
  DeleteOutlined, 
  FileImageOutlined, 
  FilePdfOutlined, 
  FileZipOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { uploadFile } from '@api/file';
import { FileUpload } from '@myTypes/file-upload';
import { getFileIcon } from '@utils/file';

// file type configurations
const FILE_TYPE_CONFIGS = {
  'image': {
    accept: 'image/*',
    icon: <FileImageOutlined />,
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'images'
  },
  'document': {
    accept: '.pdf,.doc,.docx,.txt,.rtf',
    icon: <FilePdfOutlined />,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'documents'
  },
  'spreadsheet': {
    accept: '.xlsx,.xls,.csv',
    icon: <FileExcelOutlined />,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'spreadsheets'
  },
  'word': {
    accept: '.doc,.docx',
    icon: <FileWordOutlined />,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Word documents'
  },
  'text': {
    accept: '.txt,.rtf',
    icon: <FileTextOutlined />,
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'text files'
  },
  'compressed': {
    accept: '.zip,.rar,.7z',
    icon: <FileZipOutlined />,
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'compressed files'
  },
  'pdf': {
    accept: '.pdf',
    icon: <FilePdfOutlined />,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'PDF files'
  },
  'csv': {
    accept: '.csv',
    icon: <FileExcelOutlined />,
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'CSV files'
  },
  'all': {
    accept: '*',
    icon: <FileOutlined />,
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'files'
  }
};

interface UploadModalProps {
  isVisible: boolean;
  onClose: () => void;
  onUploadComplete?: (file: File, result: FileUpload) => void;
  uploadType?: keyof typeof FILE_TYPE_CONFIGS;
  title?: string;
  maxSize?: number; // Optional custom max size in bytes
  acceptableExtensions?: string; // Optional custom file extensions like ".jpg,.png,.pdf"
  multiple?: boolean; // Support for multiple file upload
}

const UploadModal: React.FC<UploadModalProps> = ({
  isVisible,
  onClose,
  onUploadComplete,
  uploadType = 'all',
  title = 'Upload File',
  maxSize,
  acceptableExtensions,
  multiple = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Use predefined config or custom settings
  const fileTypeConfig = {
    accept: acceptableExtensions || FILE_TYPE_CONFIGS[uploadType].accept,
    icon: FILE_TYPE_CONFIGS[uploadType].icon,
    maxSize: maxSize || FILE_TYPE_CONFIGS[uploadType].maxSize,
    description: FILE_TYPE_CONFIGS[uploadType].description
  };

  useEffect(() => {
    // Reset state when modal closes or upload type changes
    if (!isVisible) {
      setSelectedFiles([]);
      setPreviewUrl(null);
    }
  }, [isVisible, uploadType, acceptableExtensions]);

  useEffect(() => {
    // Create preview for first selected image file
    if (selectedFiles.length === 0) {
      setPreviewUrl(null);
      return;
    }

    const firstFile = selectedFiles[0];
    
    if (firstFile.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(firstFile);
      setPreviewUrl(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFiles]);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > fileTypeConfig.maxSize) {
      message.error(`File size exceeds ${fileTypeConfig.maxSize / 1024 / 1024}MB limit`);
      return false;
    }

    // Skip file type validation if accept is '*'
    if (fileTypeConfig.accept === '*') {
      return true;
    }

    // Check file type
    const acceptedTypes = fileTypeConfig.accept.split(',');
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type;

    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('*')) {
        // Handle MIME type wildcards like 'image/*'
        return fileType.startsWith(type.replace('*', ''));
      } else if (type.startsWith('.')) {
        // Handle extension matches like '.pdf'
        return type === fileExtension;
      } else {
        // Handle exact MIME type matches
        return type === fileType;
      }
    });

    if (!isValidType) {
      message.error(`Please upload a valid file type: ${fileTypeConfig.accept}`);
      return false;
    }

    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesArray = event.target.files ? Array.from(event.target.files) : [];
    const validFiles = filesArray.filter(validateFile);
    
    if (multiple) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    } else if (validFiles.length > 0) {
      setSelectedFiles([validFiles[0]]);
    }
    
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileDrop = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const filesArray = Array.from(files);
    const validFiles = filesArray.filter(validateFile);
    
    if (multiple) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    } else if (validFiles.length > 0) {
      setSelectedFiles([validFiles[0]]);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      message.error('Please select a file first!');
      return;
    }

    setIsUploading(true);
    
    try {
      for (const file of selectedFiles) {
        const result = await uploadFile(file);
        
        if (onUploadComplete && result?.data) {
          onUploadComplete(file, result?.data);
        }
      }
      
      message.success(`File${selectedFiles.length > 1 ? 's' : ''} uploaded successfully!`);
      setIsUploading(false);
      setSelectedFiles([]);
      onClose();
    } catch (error) {
      message.error('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    onClose();
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Drag event handlers
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

  // Get pretty file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Get accceptable file types description
  const getAcceptableTypesDescription = (): string => {
    if (fileTypeConfig.accept === '*') return 'all files';
    
    const types = fileTypeConfig.accept.split(',')
      .map(type => type.replace('.', '').toUpperCase())
      .join(', ');
      
    return types;
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={fileTypeConfig.accept}
        multiple={multiple}
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
            {selectedFiles.length > 0 ? 'Add File' : 'Select File'}
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={isUploading}
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="bg-blue-600 hover:bg-blue-700 rounded-md m-2"
          >
            Upload
          </Button>,
        ]}
      >
        <div className="mb-6 px-4">
          {selectedFiles.length > 0 ? (
            <div className="space-y-4">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleRemoveFile(index)}
                    shape="circle"
                  />
                </div>
              ))}

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
                  ? `Drop ${fileTypeConfig.description} here` 
                  : 'Click or drag file to this area to upload'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports {getAcceptableTypesDescription()} 
                {multiple ? ' (multiple files allowed)' : ''}
                <br />
                Max size: {formatFileSize(fileTypeConfig.maxSize)}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default UploadModal;