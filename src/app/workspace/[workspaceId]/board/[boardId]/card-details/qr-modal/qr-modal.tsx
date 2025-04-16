import { useState, useRef, useEffect } from 'react';
import { Modal, Button, Space } from 'antd';
import { QrcodeOutlined, DownloadOutlined } from '@ant-design/icons';
import QRCode from 'react-qr-code';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  customValue?: string;
}

const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, customValue }) => {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<string>('');
  
  useEffect(() => {
    setValue(customValue || window.location.href);
  }, [customValue, isOpen]);
 
  const downloadQR = () => {
    if (!qrContainerRef.current) return;
   
    const svg = qrContainerRef.current.querySelector('svg');
    if (!svg) return;
   
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
   
    img.onload = () => {
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      if (ctx) {
        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the QR code
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Add padding
        const paddedCanvas = document.createElement('canvas');
        const paddedCtx = paddedCanvas.getContext('2d');
        const padding = 40 * scale;
        
        if (paddedCtx) {
          paddedCanvas.width = canvas.width + (padding * 2);
          paddedCanvas.height = canvas.height + (padding * 2);
          
          paddedCtx.fillStyle = 'white';
          paddedCtx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
          paddedCtx.drawImage(canvas, padding, padding);
          
          const pngFile = paddedCanvas.toDataURL('image/png');
          
          const downloadLink = document.createElement('a');
          downloadLink.download = 'qrcode.png';
          downloadLink.href = pngFile;
          downloadLink.click();
        }
      }
    };
   
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };
 
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Scan QR Code"
      width={400}
      centered
      maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      footer={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div 
          ref={qrContainerRef} 
          style={{ 
            background: 'white', 
            padding: 24, 
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          <QRCode
            value={value}
            size={250}
            level="M"
            fgColor="#000000"
            bgColor="#FFFFFF"
          />
        </div>
        
        <div style={{ 
          marginTop: 16, 
          fontSize: 14, 
          color: 'rgba(0, 0, 0, 0.45)', 
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {value.length > 50 ? value.substring(0, 47) + '...' : value}
        </div>

        <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={downloadQR}>
          Download QR Code
        </Button>
      </div>
    </Modal>
  );
};

export default QRModal;