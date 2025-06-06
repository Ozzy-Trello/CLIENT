"use client";

import React, { useState, useMemo } from "react";
import { Input, Button, Checkbox, Tooltip } from "antd";
import { Pencil } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Label } from "@myTypes/label";


const initialLabels: Label[] = [
  { id: uuidv4(), name: "Desain Fix", value: "#76C893", valueType: "color", checked: false },
  { id: uuidv4(), name: "Purchasing", value: "#F9DC5C", valueType: "color", checked: true },
  { id: uuidv4(), name: "Loading", value: "#FFA552", valueType: "color", checked: false },
  { id: uuidv4(), name: "Cutting", value: "#EF6351", valueType: "color", checked: false },
  { id: uuidv4(), name: "Numbering", value: "#B39CD0", valueType: "color", checked: false },
  { id: uuidv4(), name: "Helper Line", value: "#5390D9", valueType: "color", checked: false },
  { id: uuidv4(), name: "Ozzy", value: "#1E60D1", valueType: "color", checked: true },
];

interface LabelManagerProps {
  popoverPage: 'home' | 'form';
  setPopoverPage: (page: 'home' | 'form') => void;
  selectedLabel: Label | undefined;
  setSelectedLabel: any
}

const LabelManager: React.FC<LabelManagerProps> = (props) => {
  const { popoverPage, setPopoverPage, setSelectedLabel } = props;
  const [searchTerm, setSearchTerm] = useState("");
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [colorblindMode, setColorblindMode] = useState(false);

  const filteredLabels = useMemo(() => {
    return labels.filter(label =>
      label?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, labels]);

  const toggleCheck = (id: string) => {
    setLabels(prev =>
      prev.map(label =>
        label.id === id ? { ...label, checked: !label.checked } : label
      )
    );
  };

  const handleCreateLabel = () => {
    const newLabel: Label = {
      id: uuidv4(),
      name: `New Label ${labels.length + 1}`,
      value: "#D3D3D3",
      valueType: "color",
      checked: false,
    };
    setLabels(prev => [...prev, newLabel]);
  };

  const handleEdit = (label: Label) => {
    setSelectedLabel(label);
    setPopoverPage('form')
  };

  return (
    <div className="w-64">
      <Input
        placeholder="Search labels..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
        size="small"
      />

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredLabels.map((label) => (
          <div
            key={label.id}
            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition ${label.checked ? "bg-blue-50" : "hover:bg-gray-100"}`}
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={label.checked}
                onChange={() => label.id && toggleCheck(label.id)}
              />
              <div
                className="px-2 py-0.5 text-sm text-black rounded"
                style={{ backgroundColor: label?.value }}
              >
                {label.name}
              </div>
            </div>
            <Tooltip title="Edit label">
              <button
                onClick={() => handleEdit(label)}
                className="p-1 hover:bg-gray-200 rounded-sm"
              >
                <Pencil size={14} className="text-gray-500" />
              </button>
            </Tooltip>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button block size="small" onClick={() => setPopoverPage('form')}>
          Create a new label
        </Button>
        <Button block size="small" type="default">
          Show more labels
        </Button>
      </div>
    </div>
  );
};

export default LabelManager;
