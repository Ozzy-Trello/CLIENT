"use client";

import React, { useEffect, useState } from "react";
import { Input, Button } from "antd";
import { X } from "lucide-react";
import { CardLabel } from "@myTypes/label";
import { useParams } from "next/navigation";
import { useLabels } from "@hooks/label";
import { Card } from "@myTypes/card";

interface LabelFormProps {
  popoverPage: 'home' | 'add' | 'update';
  setPopoverPage: (page: 'home' | 'add' | 'update') => void;
  selectedLabel: CardLabel | undefined;
  setSelectedLabel: any;
  selectedCard: Card | null;
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
  const { popoverPage, setPopoverPage, setSelectedLabel, selectedLabel, selectedCard } = props;
  const [ selectedColor, setSelectedColor ] = useState<string | null>(COLORS[29]);
  const { workspaceId} = useParams();
  const { createLabel, updateLabel, deleteLabel } = useLabels(workspaceId as string, {cardId: selectedCard?.id});
  const [ newLabel, setNewLabel ] = useState<CardLabel>({
    id: "",
    name: "",
    value: "",
    valueType: "color",
    workspaceId: workspaceId as string,
  });

  const handleSave = () => {
    if (newLabel?.labelId) {
      updateLabel(newLabel.labelId, newLabel);
    } else {
      createLabel(newLabel);
    }
    setPopoverPage('home');
  };

  const handleDelete = () => {
    if (newLabel?.labelId) {
      deleteLabel(newLabel?.labelId);
    }
    setPopoverPage('home');
  }

  const onColorChange = (color: string) => {
    setSelectedColor(color);
    setNewLabel((prev) => ({
      ...prev,
      value: color,
    }))
  }

  const onLabelNameChange = (labelName: string) => {
    setNewLabel((prev) => ({
      ...prev,
      name: labelName,
    }))
  }

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
          onChange={(e) => {onLabelNameChange(e.target.value)}}
          className="rounded"
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
              onClick={() => onColorChange(color)}
            />
          ))}
        </div>
      </div>

      {/* Remove color */}
      <div className="mt-4">
        <Button
          size="small"
          onClick={() => setSelectedColor(null)}
          className="w-full flex items-center justify-center text-sm text-gray-700 hover:text-red-500"
        >
          <X className="mr-1" size={14} />
          Remove color
        </Button>
      </div>

      {/* Create Button */}
      <div className="mt-4 pt-4 flex gap-2 justify-end">
        <Button
          color="danger" 
          variant="solid"
          size="small"
          onClick={handleDelete}
        >
          Delete
        </Button>
        <Button
          type="primary"
          onClick={handleSave}
          size="small"
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default LabelForm;
