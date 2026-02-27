"use client";

import React, { useState } from "react";
import {
  Select,
  Checkbox,
  Button,
  Input,
  Spin,
  Empty,
  Popconfirm,
  Typography,
} from "antd";
import { Plus, Trash2 } from "lucide-react";
import { useAccessories } from "@hooks/useAccessories";
import {
  useCardAccessories,
  useCreateCardAccessory,
  useUpdateCardAccessory,
  useDeleteCardAccessory,
} from "@hooks/useCardAccessories";
import { AccessoryFieldsProps } from "./types";

const AccessoryFields: React.FC<AccessoryFieldsProps> = ({
  cardId,
  productId,
}) => {
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<
    string | undefined
  >(undefined);
  const [descriptionMap, setDescriptionMap] = useState<
    Record<string, string>
  >({});

  // Only fetch accessories for the card's product
  const { accessories, isLoading: isLoadingAccessories } = useAccessories(
    productId || undefined
  );
  const { cardAccessories, isLoading: isLoadingCardAccessories } =
    useCardAccessories(cardId);
  const { mutate: createCardAccessory, isPending: isCreating } =
    useCreateCardAccessory(cardId);
  const { mutate: updateCardAccessory } = useUpdateCardAccessory(cardId);
  const { mutate: deleteCardAccessory } = useDeleteCardAccessory(cardId);

  const assignedAccessoryIds = new Set(
    cardAccessories.map((ca) => ca.accessoryId)
  );

  const availableAccessories = accessories.filter(
    (a) => !assignedAccessoryIds.has(a.id)
  );

  const handleAdd = () => {
    if (!selectedAccessoryId) return;
    createCardAccessory(
      { accessoryId: selectedAccessoryId },
      { onSuccess: () => setSelectedAccessoryId(undefined) }
    );
  };

  const handleToggleDone = (id: string, current: boolean) => {
    updateCardAccessory({ id, data: { isDone: !current } });
  };

  const handleDescriptionBlur = (id: string) => {
    const desc = descriptionMap[id];
    if (desc !== undefined) {
      updateCardAccessory({ id, data: { description: desc } });
    }
  };

  const handleDelete = (id: string) => {
    deleteCardAccessory(id);
  };

  if (isLoadingCardAccessories) {
    return (
      <div className="flex justify-center py-4">
        <Spin size="small" />
      </div>
    );
  }

  // Calculate progress
  const totalItems = cardAccessories.length;
  const doneItems = cardAccessories.filter((ca) => ca.isDone).length;

  return (
    <div className="space-y-3">
      {/* Progress bar (only show when there are items) */}
      {totalItems > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs text-gray-500">
            {doneItems}/{totalItems}
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${totalItems > 0 ? (doneItems / totalItems) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* List of card accessories */}
      {cardAccessories.length === 0 && !productId ? (
        <div className="py-3 text-center">
          <Typography.Text type="secondary" className="text-xs">
            Pilih produk terlebih dahulu untuk menambahkan aksesoris
          </Typography.Text>
        </div>
      ) : cardAccessories.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-gray-500 text-xs">
              Belum ada aksesoris
            </span>
          }
          style={{ margin: "8px 0" }}
        />
      ) : (
        <div className="space-y-0">
          {cardAccessories.map((ca) => (
            <div
              key={ca.id}
              className="flex items-center gap-2 py-2 border-b border-gray-100 group"
            >
              {/* Checkbox */}
              <Checkbox
                checked={ca.isDone}
                onChange={() => handleToggleDone(ca.id, ca.isDone)}
              />

              {/* Name + description */}
              <div className="ml-1 flex-1 min-w-0">
                <span
                  style={{
                    textDecoration: ca.isDone ? "line-through" : "none",
                    color: ca.isDone ? "#9ca3af" : undefined,
                  }}
                  className="block text-sm break-words text-gray-900"
                >
                  {ca.accessoryName}
                </span>
                <Input.TextArea
                  size="small"
                  placeholder="Tambah deskripsi..."
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  variant="borderless"
                  value={
                    descriptionMap[ca.id] !== undefined
                      ? descriptionMap[ca.id]
                      : ca.description ?? ""
                  }
                  onChange={(e) =>
                    setDescriptionMap((prev) => ({
                      ...prev,
                      [ca.id]: e.target.value,
                    }))
                  }
                  onBlur={() => handleDescriptionBlur(ca.id)}
                  style={{
                    fontSize: 12,
                    padding: "2px 0",
                    color: "#6b7280",
                    resize: "none",
                  }}
                />
              </div>

              {/* Delete button */}
              <Popconfirm
                title="Hapus aksesoris ini?"
                onConfirm={() => handleDelete(ca.id)}
                okText="Ya"
                cancelText="Batal"
              >
                <Button
                  type="text"
                  size="small"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  icon={<Trash2 size={14} className="text-gray-400" />}
                />
              </Popconfirm>
            </div>
          ))}
        </div>
      )}

      {/* Add accessory selector — only show if product is selected */}
      {productId && (
        <div className="flex items-center gap-2 pt-1">
          <Select
            className="flex-1"
            placeholder="Pilih aksesoris..."
            value={selectedAccessoryId}
            onChange={setSelectedAccessoryId}
            loading={isLoadingAccessories}
            showSearch
            optionFilterProp="label"
            size="small"
            options={availableAccessories.map((a) => ({
              value: a.id,
              label: a.name,
            }))}
            style={{ minWidth: 0 }}
            notFoundContent={
              isLoadingAccessories ? (
                <Spin size="small" />
              ) : (
                <span className="text-xs text-gray-400">
                  Tidak ada aksesoris tersedia
                </span>
              )
            }
          />
          <Button
            type="text"
            onClick={handleAdd}
            disabled={!selectedAccessoryId}
            loading={isCreating}
            size="small"
            icon={<Plus size={14} />}
          >
            Tambah
          </Button>
        </div>
      )}
    </div>
  );
};

export default AccessoryFields;
