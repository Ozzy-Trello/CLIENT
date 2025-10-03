"use client";

import {
  autoCreatePOs,
  getPOById,
  getPOsByCardId,
  PO,
  SizeQuantity,
  updatePO,
  UpdatePORequest,
} from "@api/po";
import { getPOItemsByCardId, POItem } from "@api/po-items";
import { Card } from "@myTypes/card";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Divider,
  Input,
  InputNumber,
  message,
  Modal,
  Spin,
  Tag,
} from "antd";
import { Package } from "lucide-react";
import React, { useEffect, useState } from "react";

interface POSizeAssignmentProps {
  card: Card;
  setSelectedCard?: React.Dispatch<React.SetStateAction<Card | null>>;
}

interface POSizeData {
  po: PO;
  sizeAssignments: SizeQuantity;
  hasChanges: boolean;
  items?: POItem[];
}

// Standard sizes from XS to XXXXXL
const STANDARD_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "XXXXL",
  "XXXXXL",
];

const POSizeAssignment: React.FC<POSizeAssignmentProps> = ({
  card,
  setSelectedCard,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [poSizeData, setPOSizeData] = useState<POSizeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customSizes, setCustomSizes] = useState<{ [poId: string]: string[] }>(
    {}
  );
  const [newCustomSize, setNewCustomSize] = useState<{
    [poId: string]: string;
  }>({});
  const { canUpdateCard } = useBoardPermissionsContext();
  const queryClient = useQueryClient();

  const {
    data: posData,
    isLoading: isLoadingPOs,
    error: posError,
  } = useQuery({
    queryKey: ["pos", card.id],
    queryFn: () => getPOsByCardId(card.id),
    enabled: isModalOpen,
  });

  const { data: poItemsData, isLoading: isLoadingPOItems } = useQuery({
    queryKey: ["po-items", card.id],
    queryFn: () => getPOItemsByCardId(card.id),
    enabled: isModalOpen,
  });

  const updatePOMutation = useMutation({
    mutationFn: ({
      poId,
      updateData,
    }: {
      poId: string;
      updateData: UpdatePORequest;
    }) => updatePO(poId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", card.id] });
      queryClient.invalidateQueries({ queryKey: ["po-items", card.id] });
      message.success("PO updated successfully");
    },
    onError: (error) => {
      message.error("Failed to update PO");
    },
  });

  const autoCreatePOMutation = useMutation({
    mutationFn: (cardId: string) => autoCreatePOs(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", card.id] });
      queryClient.invalidateQueries({ queryKey: ["po-items", card.id] });
    },
    onError: (error) => {
      message.error("Failed to create default PO");
    },
  });

  // Backward compatibility: Create default PO if none exists
  useEffect(() => {
    if (isModalOpen && posData && !isLoadingPOs && !posError) {
      if (!posData.data || posData.data.length === 0) {
        autoCreatePOMutation.mutate(card.id);
      }
    }
  }, [isModalOpen, posData, isLoadingPOs, posError, card.id, autoCreatePOMutation]);

  // Initialize PO data when POs and PO items are loaded
  useEffect(() => {
    if (posData?.data) {
      // Get PO IDs for processing
      const poIds = posData.data.map((po) => po.id);

      // Group PO items by PO ID (keeping for existing functionality)
      const itemsByPOId: { [poId: string]: POItem[] } = {};
      if (poItemsData?.data?.items) {
        poItemsData.data.items.forEach((item: POItem) => {
          if (!itemsByPOId[item.poId]) {
            itemsByPOId[item.poId] = [];
          }
          itemsByPOId[item.poId].push(item);
        });
      }

      // Initialize size-based data with items
      const initialSizeData: POSizeData[] = posData.data.map((po: PO) => {
        const poItems = po.items || itemsByPOId[po.id] || [];

        // Validate that items have proper sizes (never "ITEM")
        const invalidItems = poItems.filter((item) => item.size === "ITEM");
        if (invalidItems.length > 0) {
          console.error(
            `❌ [ERROR] PO ${po.poNumber} has ${invalidItems.length} items with invalid generic size "ITEM". This should never happen!`
          );
          message.error(
            `PO ${po.poNumber} has invalid generic items. Please contact support to fix the database.`
          );
        }

        // Build size assignments from existing items
        const sizeAssignments: SizeQuantity = {};
        poItems.forEach((item: POItem) => {
          if (item.size && item.size !== "ITEM") {
            // Normalize size to uppercase to match STANDARD_SIZES
            const normalizedSize = item.size.toUpperCase();
            sizeAssignments[normalizedSize] =
              (sizeAssignments[normalizedSize] || 0) + 1;
          }
        });

        return {
          po,
          sizeAssignments,
          hasChanges: false,
          items: poItems,
        };
      });
      setPOSizeData(initialSizeData);

      const initialCustomSizes: { [poId: string]: string[] } = {};

      const fetchCustomSizes = async () => {
        for (const po of posData.data || []) {
          try {
            const poData = await getPOById(po.id);
            const poItems = poData.data?.items || [];

            const customSizes = Array.from(
              new Set(
                poItems
                  .map((item: any) => item.size?.toUpperCase())
                  .filter(
                    (size: string) =>
                      size &&
                      size !== "ITEM" &&
                      !STANDARD_SIZES.includes(size)
                  )
              )
            );

            initialCustomSizes[po.id] = customSizes;
          } catch (error) {
            initialCustomSizes[po.id] = [];
          }
        }

        setCustomSizes(initialCustomSizes);
      };

      fetchCustomSizes();
    }
  }, [posData, poItemsData]);

  const handleOpenModal = () => {
    if (!canUpdateCard()) {
      message.warning("You don't have permission to update this card");
      return;
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Don't clear state - let useEffect handle data loading when modal reopens
  };

  const handleSizeQuantityChange = (
    poIndex: number,
    size: string,
    value: number | null
  ) => {
    setPOSizeData((prev) => {
      const newData = [...prev];
      const currentAssignments = { ...newData[poIndex].sizeAssignments };

      if (value && value > 0) {
        currentAssignments[size] = value;
      } else {
        delete currentAssignments[size];
      }

      newData[poIndex] = {
        ...newData[poIndex],
        sizeAssignments: currentAssignments,
        hasChanges: true,
      };
      return newData;
    });
  };

  const handleAddCustomSize = (poId: string) => {
    const customSize = newCustomSize[poId]?.trim();
    if (!customSize) return;

    setCustomSizes((prev) => ({
      ...prev,
      [poId]: [...(prev[poId] || []), customSize],
    }));

    setNewCustomSize((prev) => ({
      ...prev,
      [poId]: "",
    }));
  };

  const handleRemoveCustomSize = (poId: string, sizeToRemove: string) => {
    setCustomSizes((prev) => ({
      ...prev,
      [poId]: prev[poId]?.filter((size) => size !== sizeToRemove) || [],
    }));

    // Also remove from size assignments if it exists
    const poIndex = poSizeData.findIndex((data) => data.po.id === poId);
    if (poIndex !== -1) {
      setPOSizeData((prev) => {
        const newData = [...prev];
        const currentAssignments = { ...newData[poIndex].sizeAssignments };
        delete currentAssignments[sizeToRemove];

        newData[poIndex] = {
          ...newData[poIndex],
          sizeAssignments: currentAssignments,
          hasChanges: true,
        };
        return newData;
      });
    }
  };

  const handleSaveSizePO = async (poIndex: number) => {
    const poData = poSizeData[poIndex];
    if (!poData.hasChanges) return;

    try {
      await updatePOMutation.mutateAsync({
        poId: poData.po.id,
        updateData: {
          size_assignments: poData.sizeAssignments,
        },
      });

      // Mark as saved
      setPOSizeData((prev) => {
        const newData = [...prev];
        newData[poIndex] = {
          ...newData[poIndex],
          hasChanges: false,
        };
        return newData;
      });
    } catch (error) {
      console.error("Error saving size-based PO:", error);
    }
  };



  const getTotalQuantityForSizePO = (sizeAssignments: SizeQuantity) => {
    return Object.values(sizeAssignments).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalItemsCount = (): number => {
    return poSizeData.reduce(
      (total, poData) => total + (poData.items?.length || 0),
      0
    );
  };

  const getUnassignedItemsCount = (poData: POSizeData) => {
    const totalItems = poData.items?.length || 0;
    const assignedItems = getTotalQuantityForSizePO(poData.sizeAssignments);
    return totalItems - assignedItems;
  };

  const getAllSizesForPO = (poId: string) => {
    return [...STANDARD_SIZES, ...(customSizes[poId] || [])];
  };

  return (
    <>
      <div className="space-y-2 text-xs">
        <span className="text-gray-300 font-semibold text-xs block">
          PO Details
        </span>
        <Button
          icon={<Package size={14} />}
          size="small"
          onClick={handleOpenModal}
          disabled={!canUpdateCard()}
          className="rounded-md hover:bg-gray-50"
        >
          Manage POs
        </Button>
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Package size={20} />
            <span>Manage POs - {card.name}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        width={600}
        footer={null}
      >
        {isLoadingPOs || isLoadingPOItems ? (
          <div className="text-center py-8">
            <Spin size="large" />
            <div className="mt-4 text-gray-500">Loading POs...</div>
          </div>
        ) : posError ? (
          <Alert message="Error loading POs" type="error" className="mb-4" />
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  Total POs: {posData?.data?.length || 0}
                </span>
                <span className="font-medium">
                  Total Items: {getTotalItemsCount()}
                </span>
              </div>
            </div>

            {/* Size-Based PO Assignment */}
            <div className="space-y-4">
              {/* Size-Based PO List */}
              {!posData?.data || posData.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No POs found for this card.
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">PO Size Assignment</h4>
                  {poSizeData.map((poData, poIndex) => (
                    <div
                      key={poData.po.id}
                      className={`border rounded-lg p-4 ${
                        poData.hasChanges
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">PO {poIndex + 1}</span>
                          {poData.hasChanges && (
                            <Tag color="blue" className="text-xs">
                              Modified
                            </Tag>
                          )}
                          <span className="text-xs text-gray-500">
                            Total: {poData.items?.length || 0}
                          </span>
                        </div>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => handleSaveSizePO(poIndex)}
                          disabled={!poData.hasChanges}
                          loading={updatePOMutation.isPending}
                        >
                          Save
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-6 gap-2">
                          {getAllSizesForPO(poData.po.id).map((size) => (
                            <div key={size} className="flex items-center gap-2">
                              <span className="text-sm font-medium w-8">
                                {size}:
                              </span>
                              <InputNumber
                                min={0}
                                value={poData.sizeAssignments[size] || 0}
                                onChange={(value) =>
                                  handleSizeQuantityChange(poIndex, size, value)
                                }
                                size="small"
                                className="flex-1"
                                controls={true}
                              />
                            </div>
                          ))}
                        </div>

                        <Divider className="my-2" />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Add custom size (e.g., 2XS, 6XL)"
                              value={newCustomSize[poData.po.id] || ""}
                              onChange={(e) =>
                                setNewCustomSize((prev) => ({
                                  ...prev,
                                  [poData.po.id]: e.target.value,
                                }))
                              }
                              size="small"
                              className="flex-1"
                            />
                            <Button
                              size="small"
                              onClick={() => handleAddCustomSize(poData.po.id)}
                              disabled={!newCustomSize[poData.po.id]?.trim()}
                            >
                              Add
                            </Button>
                          </div>

                          {customSizes[poData.po.id] &&
                            customSizes[poData.po.id].length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {customSizes[poData.po.id].map((customSize) => (
                                  <Tag
                                    key={customSize}
                                    closable
                                    onClose={() =>
                                      handleRemoveCustomSize(
                                        poData.po.id,
                                        customSize
                                      )
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    {customSize}
                                  </Tag>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default POSizeAssignment;
