import { useState } from 'react';
import { Button, Input, Modal, Typography } from 'antd';
import { CheckSquare } from 'lucide-react';

interface ChecklistModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAddChecklist: (title: string) => void;
  title?: string;
}

const ChecklistModal: React.FC<ChecklistModalProps> = ({
  isVisible,
  onClose,
  onAddChecklist,
  title = 'Add checklist'
}) => {
  const [checklistTitle, setChecklistTitle] = useState<string>('');

  const handleSubmit = () => {
    if (!checklistTitle.trim()) return;
    
    onAddChecklist(checklistTitle);
    setChecklistTitle('');
    onClose();
  };

  const handleCancel = () => {
    setChecklistTitle('');
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-gray-700" />
          <Typography.Text strong>{title}</Typography.Text>
        </div>
      }
      open={isVisible}
      onCancel={handleCancel}
      footer={null}
      width={400}
      centered
    >
      <div className="py-4">
        <div className="mb-4">
          <Typography.Text strong className="block mb-2">Title</Typography.Text>
          <Input
            placeholder="Checklist"
            value={checklistTitle}
            onChange={(e) => setChecklistTitle(e.target.value)}
            onPressEnter={handleSubmit}
            autoFocus
            className="w-full"
          />
        </div>

        <div className="flex justify-end">
          <Button 
            type="primary" 
            onClick={handleSubmit}
            disabled={!checklistTitle.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ChecklistModal;
