import React from "react";

interface QRGuideOverlayProps {
  containerClassName?: string;
  imageClassName?: string;
  src?: string;
  alt?: string;
}

const QRGuideOverlay: React.FC<QRGuideOverlayProps> = ({
  containerClassName = "",
  imageClassName = "h-24 w-auto max-w-[140px] opacity-60 scale-90 object-contain",
  src = "/qr-overlay.svg",
  alt = "QR focus guide",
}) => {
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${containerClassName}`}
    >
      <img src={src} alt={alt} className={imageClassName} />
    </div>
  );
};

export default QRGuideOverlay;
