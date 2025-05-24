import { useState, useRef, useEffect } from 'react';
import { Modal, Button, Typography, Tooltip, Spin } from 'antd';
import { Download } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useCardDetailContext } from '@providers/card-detail-context';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  customValue?: string;
}

const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, customValue }) => {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(true);
  const [fadeIn, setFadeIn] = useState<boolean>(false);
  const { selectedCard } = useCardDetailContext();
  
  useEffect(() => {
    if (isOpen) {
      setGenerating(true);
      setValue(customValue || window.location.href);
      
      // Simulate QR code generation with a delay
      const generationTimer = setTimeout(() => {
        setGenerating(false);
      }, 1500);
      
      // Trigger fade-in animation after a brief delay
      const fadeTimer = setTimeout(() => {
        setFadeIn(true);
      }, 100);
      
      return () => {
        clearTimeout(generationTimer);
        clearTimeout(fadeTimer);
      };
    } else {
      setFadeIn(false);
    }
  }, [customValue, isOpen]);
 
  const downloadQR = () => {
    if (!qrContainerRef.current || generating) return;
   
    const svg = qrContainerRef.current.querySelector('svg');
    if (!svg) return;
   
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
   
    img.onload = () => {
      const scale = 3;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      if (ctx) {
        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the QR code
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Add padding and custom styling
        const paddedCanvas = document.createElement('canvas');
        const paddedCtx = paddedCanvas.getContext('2d');
        const padding = 50 * scale;
        
        if (paddedCtx) {
          paddedCanvas.width = canvas.width + (padding * 2);
          paddedCanvas.height = canvas.height + (padding * 2) + (80 * scale);
          
          // Background
          paddedCtx.fillStyle = 'white';
          paddedCtx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
          
          // QR code
          paddedCtx.drawImage(canvas, padding, padding);
          
          // Add card name at bottom
          if (selectedCard?.name) {
            paddedCtx.font = `bold ${16 * scale}px sans-serif`;
            paddedCtx.fillStyle = '#000000';
            paddedCtx.textAlign = 'center';
            paddedCtx.fillText(
              selectedCard.name,
              paddedCanvas.width / 2,
              canvas.height + padding + (30 * scale)
            );
          }
          
          // Export as PNG
          const pngFile = paddedCanvas.toDataURL('image/png');
          
          const downloadLink = document.createElement('a');
          downloadLink.download = `${selectedCard?.name || 'card'}-qrcode.png`;
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
      title={null}
      width={420}
      centered
      maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      footer={null}
      className="qr-modal"
      closeIcon={
        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors duration-200">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <style jsx global>{`
        .qr-fade-in {
          opacity: 0;
          transform: translateY(10px) scale(0.98);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        
        .qr-fade-in.active {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        
        .qr-container {
          transition: transform 0.3s ease;
        }
        
        .qr-container:hover {
          transform: scale(1.02);
        }
        
        .qr-appear {
          animation: qrAppear 0.5s cubic-bezier(0.26, 0.86, 0.44, 0.985) forwards;
        }
        
        @keyframes qrAppear {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .spin-appear {
          animation: spinAppear 0.3s ease forwards;
        }
        
        @keyframes spinAppear {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
      
      <div className="flex flex-col items-center py-4">
        <div className={`flex items-center justify-center gap-3 mb-6 qr-fade-in ${fadeIn ? 'active' : ''}`}>
          <Typography.Title level={4} className="m-0 text-xl font-medium">
            Scan Card QR Code
          </Typography.Title>
          
          <Tooltip title="Download QR Code">
            <Button 
              onClick={downloadQR} 
              disabled={generating}
              className={`flex items-center justify-center rounded-full p-2 ${generating ? 'opacity-50' : 'hover:bg-gray-100'}`}
              type="text"
            >
              <Download size={18} className="text-gray-700" />
            </Button>
          </Tooltip>
        </div>
        
        <div 
          ref={qrContainerRef} 
          className={`relative bg-white p-6 rounded-xl shadow-lg border border-gray-100 qr-container ${fadeIn ? 'active' : ''}`}
        >
          {generating ? (
            <div className="flex flex-col items-center justify-center spin-appear" style={{ width: 260, height: 260 }}>
              <Spin size="large" />
              <Typography.Text className="text-gray-500 mt-4">Generating QR Code...</Typography.Text>
            </div>
          ) : (
            <div className="qr-appear">
              <QRCode
                value={value}
                size={260}
                level="M"
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
          )}
        </div>
        
        <div className={`mt-5 flex flex-col items-center gap-1 qr-fade-in ${fadeIn ? 'active' : ''}`} style={{ transitionDelay: '0.2s' }}>
          {selectedCard?.name && (
            <Typography.Text className="text-lg font-medium">
              {selectedCard.name}
            </Typography.Text>
          )}
          
          <Typography.Text className="text-sm text-gray-500 max-w-full truncate px-6 text-center">
            {value.length > 50 ? value.substring(0, 47) + '...' : value}
          </Typography.Text>
        </div>
        
        <div className={`mt-6 text-xs text-gray-400 text-center qr-fade-in ${fadeIn ? 'active' : ''}`} style={{ transitionDelay: '0.4s' }}>
          Share this QR code to provide quick access to your card
        </div>
      </div>
    </Modal>
  );
};

export default QRModal;