import React from "react";
import ImageDynamicContrast from "@components/image-dynamic-contrast";
import logo from "@assets/images/logo-ozzy-white.png";
import Image from "next/image";

interface ProductionSectionProps {
  variant: "mobile" | "desktop";
  className?: string;
}

export default function ProductionSection({
  variant,
  className = "",
}: ProductionSectionProps) {
  const isMobile = variant === "mobile";

  return (
    <div
      className={`relative ${
        isMobile ? "h-64" : "flex-1 min-h-[500px]"
      } ${className}`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/right-pic-login.jpg')`,
        }}
      >
        <div className="absolute inset-0">
          {/* Logo positioned at top left for both mobile and desktop */}
          <div className="absolute top-6 left-6 z-10">
            <Image src={logo} width={120} alt="Ozzy Clothing logo" />
          </div>

          {/* PRODUCTION text with same responsive sizing for both variants */}
          <div className="flex flex-col-reverse h-3/4">
            <h2
              style={{ fontSize: "3rem" }}
              className="font-bold text-white text-center w-full px-4 tracking-wider"
            >
              PRODUCTION
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
