import { useState, useRef, useEffect } from 'react';
import { Button, message, Modal } from 'antd';
import { UploadOutlined, FileImageOutlined, DeleteOutlined } from '@ant-design/icons';

interface UploadModalProps {
  isVisible: boolean;
  onClose: () => void;
  onUploadComplete?: (imageUrl: string, filename: string) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isVisible,
  onClose,
  onUploadComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate preview URL when a file is selected
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Free memory when this component is unmounted
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  // Function to handle the "fake" upload
  const handleUpload = () => {
    if (!selectedFile) {
      message.error('Please select a file first!');
      return;
    }
    
    // Simulate upload process
    setIsUploading(true);
   
    // Simulate network delay
    setTimeout(() => {
      // Your static image URL
      const staticImageUrl = "https://media.canva.com/v2/mockup-template-rasterize/color0:171618/image0:s3%3A%2F%2Ftemplate.canva.com%2FEAFLsJd5odY%2F1%2F0%2F933w-xBtZhbBcHcY.png/mockuptemplateid:FAqieNuus/size:L?csig=AAAAAAAAAAAAAAAAAAAAAJAuNjMCCEDFt3m4qSA-7a1pdrjgZRgZw2Qq7DcFu0Lk&exp=1741576467&osig=AAAAAAAAAAAAAAAAAAAAACr2ZdO05eIrJRsyRZilJ3LlXPaRpNVnfcEeLojmYD2u&seoslug=black-bold-logo-text-graphic-t-shirt&signer=marketplace-rpc";
     
      // Call the callback with the URL
      if (onUploadComplete) {
        onUploadComplete(staticImageUrl, selectedFile.name);
      }
     
      // Show success message
      message.success('Cover image updated successfully!');
     
      // Reset states
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    }, 1500); // Simulate 1.5s upload time
  };

  // Function to open file picker
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Reset selected file when modal closes
  const handleCancel = () => {
    setSelectedFile(null);
    onClose();
  };

  // Handle removing the selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Upload Modal */}
      <Modal
        title="Upload Cover Image"
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
                <div>
                  <p className="font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
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
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={triggerFileInput}
            >
              <FileImageOutlined className="text-4xl text-gray-400 mb-2" />
              <p className="text-gray-600">Click or drag file to this area to upload</p>
              <p className="text-xs text-gray-500 mt-1">Support for a single image upload</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default UploadModal;