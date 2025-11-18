import { Modal, Form, Input, Typography, Alert } from "antd";
import { Card } from "@myTypes/card";
import { useEffect } from "react";
import { useCreateSubcard } from "@hooks/subcard";

interface CreateSubcardModalProps {
  parentCard: Card | null;
  open: boolean;
  onClose: () => void;
  onCreated?: (card: Card | null) => void;
}

const CreateSubcardModal: React.FC<CreateSubcardModalProps> = ({
  parentCard,
  open,
  onClose,
  onCreated,
}) => {
  const [form] = Form.useForm<{ name: string }>();
  const { mutateAsync, isPending } = useCreateSubcard();

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async () => {
    if (!parentCard) return;
    const { name } = await form.validateFields();
    const createdCard = await mutateAsync({
      parentCard,
      name,
    });
    onCreated?.(createdCard);
    onClose();
  };

  const listName =
    parentCard?.listName || (parentCard as any)?.list_name || "Current list";
  const boardName =
    parentCard?.boardName || (parentCard as any)?.board_name || "Current board";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Create Sub Card"
      okButtonProps={{ loading: isPending, disabled: !parentCard }}
      title={`Create sub card for "${parentCard?.name || ""}"`}
      destroyOnClose
    >
      {!parentCard && (
        <Alert
          type="warning"
          message="Select a card before creating a sub card."
          showIcon
        />
      )}
      {parentCard && (
        <div className="space-y-3">
          <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item
              label="Sub card title"
              name="name"
              rules={[
                { required: true, message: "Please enter a title" },
                { min: 3, message: "Title must be at least 3 characters" },
              ]}
            >
              <Input placeholder="e.g. Prepare invoice draft" autoFocus />
            </Form.Item>
          </Form>
        </div>
      )}
    </Modal>
  );
};

export default CreateSubcardModal;
