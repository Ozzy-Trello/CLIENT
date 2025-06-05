// src/components/dashcard/DashcardList.tsx

import React, { useState } from "react";
import { Row, Col, Button, Empty, Typography, Modal } from "antd";
import { Plus } from "lucide-react";
import Dashcard from "./dashcard";
import ModalDashcard from "./modal-dashcard";
import { DashcardConfig } from "@myTypes/dashcard";

const { Title, Text } = Typography;

interface DashcardListProps {
  title?: string;
  description?: string;
  dashcards: DashcardConfig[];
  cardCounts: Record<string, number>;
  onDashcardUpdate: (dashcard: DashcardConfig) => void;
  onDashcardCreate: (dashcard: DashcardConfig) => void;
  onDashcardDelete: (id: string) => void;
  onDashcardClick?: (id: string) => void;
}

const DashcardList: React.FC<DashcardListProps> = ({
  title = "Dashcards",
  description,
  dashcards,
  cardCounts,
  onDashcardUpdate,
  onDashcardCreate,
  onDashcardDelete,
  onDashcardClick,
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDashcard, setEditingDashcard] = useState<DashcardConfig | null>(
    null
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dashcardToDelete, setDashcardToDelete] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    const dashcard = dashcards.find((d) => d.id === id);
    if (dashcard) {
      setEditingDashcard(dashcard);
      setCreateModalOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    setDashcardToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (dashcardToDelete) {
      onDashcardDelete(dashcardToDelete);
      setDashcardToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleCreateOrUpdate = (dashcard: DashcardConfig) => {
    if (editingDashcard) {
      onDashcardUpdate(dashcard);
      setEditingDashcard(null);
    } else {
      onDashcardCreate(dashcard);
    }
    setCreateModalOpen(false);
  };

  return (
    <div className="dashcard-list-container">
      {/* Header */}
      <div className="dashcard-list-header mb-6">
        <div className="flex justify-between items-center mb-2">
          <Title level={3} className="m-0">
            {title}
          </Title>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditingDashcard(null);
              setCreateModalOpen(true);
            }}
          >
            Create Dashcard
          </Button>
        </div>
        {description && <Text type="secondary">{description}</Text>}
      </div>

      {/* Dashcard Grid */}
      {dashcards.length > 0 ? (
        <Row gutter={[16, 16]}>
          {dashcards.map((dashcard) => (
            <Col key={dashcard.id} xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
              <Dashcard
                config={dashcard}
                count={cardCounts[dashcard.id] || 0}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClick={onDashcardClick}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          description="No dashcards found"
          className="my-12"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}

      {/* Create/Edit Modal */}
      <ModalDashcard
        open={createModalOpen}
        setOpen={setCreateModalOpen}
        initialData={editingDashcard}
        onSave={handleCreateOrUpdate}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Dashcard"
        open={deleteConfirmOpen}
        onOk={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>
          Are you sure you want to delete this dashcard? This action cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
};

export default DashcardList;
