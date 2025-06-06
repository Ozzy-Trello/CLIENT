"use client";

import React, { useEffect, useState } from "react";
import { Input, Button, Tooltip, Form } from "antd";
import { X, ArrowLeft } from "lucide-react";
import { Label } from "@myTypes/label";

interface LabelFormProps {
  popoverPage: 'home' | 'form';
  setPopoverPage: (page: 'home' | 'form') => void;
  selectedLabel: Label | undefined;
  setSelectedLabel: any;
}

const COLORS = [
  "#B9FBC0", "#FAEDCD", "#FCD5CE", "#FEC5BB", "#E0BBE4",
  "#A3D9A5", "#FFE066", "#FDBA74", "#FF6B6B", "#B39CD0",
  "#2A9D8F", "#B08968", "#E76F51", "#E63946", "#7C83FD",
  "#AEDFF7", "#C4F1F9", "#C1E1C1", "#F9C6D3", "#D3D3D3",
  "#4DA8DA", "#6DD3CE", "#90BE6D", "#D291BC", "#6C757D",
  "#007BFF", "#3182CE", "#2F855A", "#C53030", "#2D3748",
];

const LabelForm: React.FC<LabelFormProps> = (props) => {
  const { popoverPage, setPopoverPage, setSelectedLabel, selectedLabel } = props;
  const [selectedColor, setSelectedColor] = useState<string | null>(COLORS[29]);  
  const [newLabel, setNewLabel] = useState<Label>({
    id: "",
    name: "",
    value: "",
    valueType: "",
    workspaceId: "",
  });

  const handleCreate = () => {
    
  };

  useEffect(() => {
    if (selectedLabel) {
      setNewLabel(selectedLabel);
    }
  }, [])

  return (
    <div className="w-80 bg-white p-4 rounded shadow">

      {/* Preview */}
      <div
        className="h-10 rounded mb-4 transition-all duration-200"
        style={{ backgroundColor: selectedColor ?? "#f5f5f5" }}
      />

      {/* Title */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 block mb-1">Title</label>
        <Input
          placeholder="Enter label title"
          value={newLabel === undefined ? "" : newLabel?.name}
        />
      </div>

      {/* Color Picker */}
      <div>
        <label className="text-sm text-gray-600 block mb-2">Select a color</label>
        <div className="grid grid-cols-5 gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`h-6 w-6 rounded border-2 ${
                selectedColor === color ? "border-blue-600" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>
      </div>

      {/* Remove color */}
      <div className="mt-4">
        <button
          onClick={() => setSelectedColor(null)}
          className="w-full flex items-center justify-center text-sm text-gray-700 hover:text-red-500"
        >
          <X className="mr-1" size={14} />
          Remove color
        </button>
      </div>

      {/* Create Button */}
      <div className="mt-4 border-t pt-4">
        <Button
          block
          type="primary"
          onClick={handleCreate}
        >
          Create
        </Button>
      </div>
    </div>
  );
};

export default LabelForm;
