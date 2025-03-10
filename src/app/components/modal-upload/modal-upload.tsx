import { useState, useRef, useEffect } from 'react';
import { Button, message, Modal } from 'antd';
import { UploadOutlined, FileImageOutlined, DeleteOutlined } from '@ant-design/icons';

interface UploadModalProps {
  isVisible: boolean;
  onClose: () => void;
  onUploadComplete?: (imageUrl: string, filename: string) => void;
  initialImageUrl?: string;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isVisible,
  onClose,
  onUploadComplete,
  initialImageUrl
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate preview URL when a file is selected
  useEffect(() => {
    if (!selectedFile) {
      if (!initialImageUrl) {
        setPreviewUrl(null);
      }
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Free memory when this component is unmounted
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile, initialImageUrl]);

  // Check for stored image in localStorage when component mounts
  useEffect(() => {
    if (!selectedFile && !initialImageUrl) {
      const storedImage = localStorage.getItem('uploadedImage');
      const storedImageName = localStorage.getItem('uploadedImageName');
      
      if (storedImage && storedImageName) {
        setPreviewUrl(storedImage);
        
        // We don't need to create a File object from the stored image
        // since we're just showing the preview and using the stored URL
      }
    }
  }, [selectedFile, initialImageUrl]);

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  // Function to handle the upload
  const handleUpload = () => {
    if (!selectedFile) {
      message.error('Please select a file first!');
      return;
    }
    
    // Simulate upload process
    setIsUploading(true);
   
    // Simulate network delay
    setTimeout(() => {
      // Instead of using static image, use the local image URL
      if (previewUrl && onUploadComplete) {
        // Create a canvas to resize the image
        const compressImage = (file: File, maxWidth = 800, maxHeight = 600, quality = 0.7): Promise<string> => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                // Calculate new dimensions while maintaining aspect ratio
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                  height = (height * maxWidth) / width;
                  width = maxWidth;
                }
                
                if (height > maxHeight) {
                  width = (width * maxHeight) / height;
                  height = maxHeight;
                }
                
                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with reduced quality
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
          });
        };
        
        // Compress and store the image
        compressImage(selectedFile).then((compressedDataUrl) => {
          try {
            // Try to store in localStorage
            localStorage.setItem('uploadedImage', compressedDataUrl);
            localStorage.setItem('uploadedImageName', selectedFile.name);
            
            // Call the callback with the compressed URL
            onUploadComplete(compressedDataUrl, selectedFile.name);
          } catch (error) {
            console.error('Error storing image in localStorage:', error);
            // If localStorage fails, just use the compressed image without storing it
            message.warning('Image is too large to store in browser cache, it will not persist between sessions.');
            onUploadComplete(compressedDataUrl, selectedFile.name);
          }
          
          // Show success message
          message.success('Cover image updated successfully!');
          
          // Reset states
          setIsUploading(false);
          setSelectedFile(null);
          onClose();
        });
      } else {
        setIsUploading(false);
        message.error('Failed to process image');
      }
    }, 1000); // Reduced simulation time
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