"use client";

import React from "react";

interface JumlahPOComponentProps {
  jumlahPO: number;
  setJumlahPO: (value: number) => void;
  labelClass: string;
  baseInputClass: string;
}

const JumlahPOComponent: React.FC<JumlahPOComponentProps> = ({
  jumlahPO,
  setJumlahPO,
  labelClass,
  baseInputClass,
}) => {
  const [localValue, setLocalValue] = React.useState(jumlahPO.toString());

  // Update local value when jumlahPO prop changes
  React.useEffect(() => {
    setLocalValue(jumlahPO.toString());
  }, [jumlahPO]);

  const handleBlur = () => {
    const numValue = Number(localValue);
    if (numValue >= 1) {
      setJumlahPO(numValue);
    } else {
      setLocalValue(jumlahPO.toString()); // Reset to current value if invalid
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  return (
    <div className="ml-8 grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
      <div>
        <label className={labelClass}>Produk</label>
        <input className={baseInputClass} readOnly />
      </div>
      <div>
        <label className={labelClass}>Jml PO</label>
        <input
          type="number"
          min="1"
          className={baseInputClass}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="1"
        />
      </div>
    </div>
  );
};

export default JumlahPOComponent;
