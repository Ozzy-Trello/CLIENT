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
          value={jumlahPO}
          onChange={(e) => setJumlahPO(Number(e.target.value) || 1)}
          placeholder="1"
        />
      </div>
    </div>
  );
};

export default JumlahPOComponent;
