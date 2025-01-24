import Image from "next/image";
import React from "react";

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Props {
  imageSrc: any;
  rgbColor: string;
  width: any;
  height: any;
  alt: string;
}

const ImageDynamicContrast: React.FC<Props> = ({
  imageSrc,
  rgbColor,
  width,
  height,
  alt
}) => {
  const rgbStringToRgb = (rgb: string): RGB => {

    console.log("rgb: %o", rgb);

    const matches = rgb.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
    if (!matches) {
      throw new Error("Invalid RGB string");
    }
    return {
      r: parseInt(matches[1], 10),
      g: parseInt(matches[2], 10),
      b: parseInt(matches[3], 10),
    };
  };

  // Calculate luminance
  const calculateLuminance = ({ r, g, b }: RGB): number => {
    const a = [r, g, b].map((v) => {
      const normalized = v / 255; // Scale to 0-1
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  // Determine if the color is bright or dark
  const isBright = (rgb: string): boolean => {
    const rgbObj = rgbStringToRgb(rgb);
    const luminance = calculateLuminance(rgbObj);
    return luminance > 0.5; // Bright if luminance is greater than 0.5
  };

  // Decide filter dynamically
  const rgbObj = rgbStringToRgb(rgbColor);
  const luminance = calculateLuminance(rgbObj);

  // Higher contrast and darker brightness for very bright colors
  const contrast = luminance > 0.8 ? 3.0 : luminance > 0.5 ? 2.0 : 1.5;
  const brightness = luminance > 0.8 ? 0.5 : luminance > 0.5 ? 0.8 : 1.2;

  const filterStyle: React.CSSProperties = {
    filter: `contrast(${contrast}) brightness(${brightness})`,
    transition: "filter 0.3s ease",
    width: width,
    height: height,
  };

  return (
    <Image
      className="brand-logo"
      src={imageSrc}
      alt={alt}
      style={filterStyle}
      width={width}
      height={height}
    />
  );
};

export default ImageDynamicContrast;
