import React, { useState } from 'react';
import { Modal, Select, Button, Input } from 'antd';


const ContentMoveCard: React.FC = () => {
  const [selectedBoard, setSelectedBoard] = useState<string>("board1");
  const [selectedList, setSelectedList] = useState<string>("list1");
  const [selectedPosition, setSelectedPosition] = useState<number>(1);

  const boardOptions = [
    { value: 'board1', label: '4.7 Request Desain | Outlet' },
  ];

  const listOptions = [
    { value: 'list1', label: 'Filter Desain Terhandle' },
  ];

  const positionOptions = [
    { value: 1, label: '1' },
  ];

  const onCopy = () => {

  }

  const onClose = () => {

  }

  const handleMove = () => {
    // onCopy(selectedBoard, selectedList, selectedPosition);
    onClose();
  };

  return (
    <div className="py-2">
      
      <div className="mb-4">
        <h3 className="text-gray-800 font-medium mb-2">Name</h3>
        <Input
          className="w-full"
          name={"name"}
        />
      </div>

      <div className="mb-4">
        <p className="text-gray-300 mb-2 text-xs">copy to..</p>
        <h3 className="text-gray-800 font-medium mb-2">Board</h3>
        <Select
          className="w-full"
          value={selectedBoard}
          onChange={setSelectedBoard}
          options={boardOptions}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-gray-800 font-medium mb-2">List</h3>
          <Select
            className="w-full"
            value={selectedList}
            onChange={setSelectedList}
            options={listOptions}
          />
        </div>
        
        <div>
          <h3 className="text-gray-800 font-medium mb-2">Position</h3>
          <Select
            className="w-full"
            value={selectedPosition}
            onChange={setSelectedPosition}
            options={positionOptions}
          />
        </div>
      </div>
      
      <Button
        type="primary"
        onClick={handleMove}
        className="bg-blue-600 hover:bg-blue-700 h-10"
      >
        Copy
      </Button>
    </div>
  );
};

export default ContentMoveCard;