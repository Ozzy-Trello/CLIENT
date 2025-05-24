import React, { useState } from 'react';
import { Modal, Input, Checkbox, Button } from 'antd';
import { EditOutlined, CloseOutlined } from '@ant-design/icons';
import { Label } from '@myTypes/type';

interface LabelsSelectionProps {
  visible: boolean;
  onClose: () => void;
  onSave: (selectedLabels: Label[]) => void;
  initialSelectedLabels?: string[];
}

// Add selected property to the Label type for local state
interface LabelWithSelection extends Label {
  selected?: boolean;
}

const LabelsSelection: React.FC<LabelsSelectionProps> = ({
  visible,
  onClose,
  onSave,
  initialSelectedLabels = [],
}) => {
  // Use the extended type with the "selected" property
  const [labels, setLabels] = useState<LabelWithSelection[]>([
    { id: '1', title: 'New Desain', color: '#a5e8c6', selected: initialSelectedLabels.includes('1') },
    { id: '2', title: 'PO Masuk', color: '#a5e8c6', selected: initialSelectedLabels.includes('2') },
    { id: '3', title: 'MGW', color: '#f8e896', selected: initialSelectedLabels.includes('3') },
    { id: '4', title: 'Terkirim ke DM', color: '#fab876', selected: initialSelectedLabels.includes('4') },
    { id: '5', title: 'Revisi Desain', color: '#f87c73', selected: initialSelectedLabels.includes('5') },
    { id: '6', title: 'Sucipto', color: '#d8c6f8', selected: initialSelectedLabels.includes('6') },
    { id: '7', title: 'Follow Up', color: '#d0f0a6', selected: initialSelectedLabels.includes('7') },
    { id: '8', title: 'Ridwan', color: '#f69ac6', selected: initialSelectedLabels.includes('8') },
  ]);

  const [searchText, setSearchText] = useState('');

  const handleLabelToggle = (id: string) => {
    setLabels(
      labels.map(label =>
        label.id === id ? { ...label, selected: !label.selected } : label
      )
    );
  };

  const handleSave = () => {
    const selectedLabel = labels
      .filter(label => label.selected)
    onSave(selectedLabel);
    onClose();
  };

  // Change "name" to "title" to match your interface
  const filteredLabels = labels.filter(label =>
    label.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal
      title="Labels"
      open={visible}
      onCancel={onClose}
      closeIcon={<CloseOutlined />}
      footer={[
        <Button className='m-2' key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button className='m-2' key="save" type="primary" onClick={handleSave}>
          Save
        </Button>
      ]}
      width={440}
    >
      <div className="px-2 mb-4">
        <Input
          placeholder="Search labels..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="px-2 mb-2">
        <h3 className="text-sm font-medium text-gray-600">Labels</h3>
      </div>
      <div className="px-2 space-y-2 max-h-96 overflow-y-auto">
        {filteredLabels.map(label => (
          <div
            key={label.id}
            className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
          >
            <div className="flex items-center">
              <Checkbox
                checked={label.selected}
                onChange={() => handleLabelToggle(label.id)}
                className="mr-2"
              />
              <div
                className="text-gray-800 px-3 py-2 rounded w-64"
                style={{ backgroundColor: label.color }}
              >
                {label.title} {/* Change this to title instead of name */}
              </div>
            </div>
            <Button
              type="text"
              icon={<EditOutlined />}
              className="text-gray-500"
            />
          </div>
        ))}
      </div>
      <div className="px-2 mt-4 pt-3 border-t border-gray-200">
        <Button
          block
          onClick={() => {}}
          className="text-center"
        >
          Create a new label
        </Button>
      </div>
    </Modal>
  );
};

export default LabelsSelection;