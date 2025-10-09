"use client";

import {
  autoCreatePOs,
  getPOById,
  PO,
  SizeQuantity,
  updatePO,
  UpdatePORequest,
} from "@api/po";
import { getPOItemsByCardId, POItem } from "@api/po-items";
import { Card } from "@myTypes/card";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePOsForSizeAssignment } from "./hooks/usePOsForSizeAssignment";
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

/**
 * Normalize POItems API response to handle wrapped format:
 * { statusCode: 200, message: "...", data: { items: [...], total: number } }
 */
const normalizePOItemsResponse = (
  response: any
): { items: POItem[]; total: number } => {
  // If response has a 'data' property, it's the wrapped format
  if (response && typeof response === "object" && "data" in response) {
    return response.data || { items: [], total: 0 };
  }

  // If response has items property directly, use that
  if (response && response.items && Array.isArray(response.items)) {
    return response;
  }

  // Fallback to empty structure
  return { items: [], total: 0 };
};

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
  } = usePOsForSizeAssignment(card.id, isModalOpen);

  const { data: poItemsData, isLoading: isLoadingPOItems } = useQuery({
    queryKey: ["po-items", card.id],
    queryFn: async () => {
      console.log(
        "🔍 [POSizeAssignment] Fetching PO items for cardId:",
        card.id
      );
      const response = await getPOItemsByCardId(card.id);
      console.log("🔍 [POSizeAssignment] Raw POItems API Response:", response);

      // Normalize the response to handle wrapped format
      const normalizedData = normalizePOItemsResponse(response);
      console.log(
        "🔍 [POSizeAssignment] Normalized POItems data:",
        normalizedData
      );

      return normalizedData;
    },
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
      if (!posData || posData.length === 0) {
        autoCreatePOMutation.mutate(card.id);
      }
    }
  }, [
    isModalOpen,
    posData,
    isLoadingPOs,
    posError,
    card.id,
    autoCreatePOMutation,
  ]);

  // Initialize PO data when POs and PO items are loaded
  useEffect(() => {
    if (posData) {
      // Get PO IDs for processing
      const poIds = posData.map((po) => po.id);

      // Group PO items by PO ID (keeping for existing functionality)
      const itemsByPOId: { [poId: string]: POItem[] } = {};
      if (poItemsData?.items) {
        poItemsData.items.forEach((item: POItem) => {
          if (!itemsByPOId[item.poId]) {
            itemsByPOId[item.poId] = [];
          }
          itemsByPOId[item.poId].push(item);
        });
      }

      // Initialize size-based data with items
      const initialSizeData: POSizeData[] = posData.map((po: PO) => {
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
        for (const po of posData || []) {
          try {
            const poData = await getPOById(po.id);
            const poItems = poData.data?.items || [];

            const customSizes = Array.from(
              new Set(
                poItems
                  .map((item: any) => item.size?.toUpperCase())
                  .filter(
                    (size: string) =>
                      size && size !== "ITEM" && !STANDARD_SIZES.includes(size)
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
    const poData = poSizeData[poIndex];
    const totalItems = poData.items?.length || 0;

    // Validate the new value
    if (value && value > 0) {
      // No validation needed - over-assignment is allowed
    }

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
                  Total Items: {getTotalItemsCount()}
                </span>
              </div>
            </div>

            {/* Size-Based PO Assignment */}
            <div className="space-y-4">
              {/* Size-Based PO List */}
              {!posData || posData.length === 0 ? (
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

                          <span className="text-xs text-green-600">
                            Total:{" "}
                            {getTotalQuantityForSizePO(poData.sizeAssignments)}
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

                      <div className="space-y-4">
                        {/* Size Assignment */}
                        <div className="bg-white border rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-800 mb-3">
                            Size Assignment
                          </h5>

                          {/* Standard Sizes */}
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {getAllSizesForPO(poData.po.id).map((size) => {
                              const currentValue =
                                poData.sizeAssignments[size] || 0;
                              const existingItemsWithThisSize =
                                poData.items?.filter(
                                  (item) => item.size?.toUpperCase() === size
                                ).length || 0;

                              return (
                                <div
                                  key={size}
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                >
                                  <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                                    {size}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <InputNumber
                                      min={0}
                                      value={currentValue}
                                      onChange={(value) =>
                                        handleSizeQuantityChange(
                                          poIndex,
                                          size,
                                          value
                                        )
                                      }
                                      size="small"
                                      className="w-20"
                                      controls={true}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Custom Size Input */}
                          <div className="border-t pt-3">
                            <div className="flex items-center gap-2 mb-2">
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
                                onClick={() =>
                                  handleAddCustomSize(poData.po.id)
                                }
                                disabled={!newCustomSize[poData.po.id]?.trim()}
                              >
                                Add
                              </Button>
                            </div>

                            {customSizes[poData.po.id] &&
                              customSizes[poData.po.id].length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {customSizes[poData.po.id].map(
                                    (customSize) => (
                                      <Tag
                                        key={customSize}
                                        closable
                                        onClose={() =>
                                          handleRemoveCustomSize(
                                            poData.po.id,
                                            customSize
                                          )
                                        }
                                        className="text-xs"
                                      >
                                        {customSize}
                                      </Tag>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
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
