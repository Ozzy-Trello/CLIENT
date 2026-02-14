"use client";

import {
  getPOById,
  PO,
  SizeQuantity,
  updatePO,
  UpdatePORequest,
} from "@api/po";
import { getAllSubcategories } from "@api/category";
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
  Tooltip,
} from "antd";
import { Package, Ruler } from "lucide-react";
import React, { useEffect, useState } from "react";

interface POSizeAssignmentProps {
  card: Card;
  setSelectedCard?: React.Dispatch<React.SetStateAction<Card | null>>;
}

interface SubcategoryData {
  id: string;
  name: string;
}

interface SubcategoryAssignment {
  subcategoryId: string;
  name: string;
  sizeAssignments: SizeQuantity;
  totalItems: number;
}

interface POSubcategoryData {
  po: PO;
  subcategoryAssignments: SubcategoryAssignment[];
  hasChanges: boolean;
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
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<{
    poId: string;
    subcategoryId: string;
    subcategoryName: string;
    currentSizes: SizeQuantity;
  } | null>(null);
  const [poSubcategoryData, setPOSubcategoryData] = useState<
    POSubcategoryData[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const [newCustomSize, setNewCustomSize] = useState<string>("");
  const [tempSizeAssignments, setTempSizeAssignments] = useState<SizeQuantity>(
    {}
  );
  const { canUpdateCard } = useBoardPermissionsContext();
  const queryClient = useQueryClient();

  const {
    data: posData,
    isLoading: isLoadingPOs,
    error: posError,
  } = usePOsForSizeAssignment(card.id, isModalOpen);

  // Fetch all subcategories
  const { data: subcategoriesResponse, isLoading: isLoadingSubcategories } =
    useQuery({
      queryKey: ["subcategories", card.workspaceId],
      queryFn: async () => {
        const response = await getAllSubcategories(card.workspaceId ?? "");
        return response.data || [];
      },
      enabled: isModalOpen,
    });

  useEffect(() => {
    console.log("🟡 [Manage POs] Query State:", {
      isModalOpen,
      isLoadingPOs,
      isLoadingSubcategories,
      hasData: !!posData,
      dataLength: posData?.length || 0,
      hasError: !!posError,
      errorMessage: posError?.message || posError,
      cardPoAmount: card.poAmount,
      timestamp: new Date().toISOString(),
    });
  }, [isModalOpen, isLoadingPOs, isLoadingSubcategories, posData, posError, card.poAmount]);

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
      message.success("PO updated successfully");
    },
    onError: (error) => {
      message.error("Failed to update PO");
    },
    retry: false, // Disable retries to prevent duplicate submissions
    gcTime: 0, // Don't cache mutation results
  });

  // Initialize PO subcategory data when POs and subcategories are loaded
  useEffect(() => {
    if (posData && subcategoriesResponse) {
      const subcategories = subcategoriesResponse as SubcategoryData[];

      const initialData: POSubcategoryData[] = posData.map((po: PO) => {
        // Initialize subcategory assignments for each subcategory
        const subcategoryAssignments: SubcategoryAssignment[] =
          subcategories.map((subcategory) => {
            // Check if PO has existing subcategory data
            const existingSubcategory = po.subcategories?.find(
              (s: any) => s.subcategoryId === subcategory.id
            );

            let sizeAssignments: SizeQuantity = {};
            let totalItems = 0;

            if (existingSubcategory && existingSubcategory.items) {
              // Build size assignments from existing items
              existingSubcategory.items.forEach((item: any) => {
                if (item.size && item.size !== "ITEM") {
                  const normalizedSize = item.size.toUpperCase();
                  sizeAssignments[normalizedSize] =
                    (sizeAssignments[normalizedSize] || 0) + 1;
                }
              });
              totalItems = existingSubcategory.items.length;
            }

            return {
              subcategoryId: subcategory.id,
              name: subcategory.name,
              sizeAssignments,
              totalItems,
            };
          });

        return {
          po,
          subcategoryAssignments,
          hasChanges: false,
        };
      });

      setPOSubcategoryData(initialData);
    }
  }, [posData, subcategoriesResponse]);

  const handleOpenModal = () => {
    console.log("🔵 [Manage POs] Modal opening", {
      cardId: card.id,
      cardName: card.name,
      poAmount: card.poAmount,
      canUpdate: canUpdateCard(),
      timestamp: new Date().toISOString(),
    });

    if (!canUpdateCard()) {
      message.warning("You don't have permission to update this card");
      return;
    }
    // Invalidate PO queries to ensure fresh data when modal opens
    queryClient.invalidateQueries({ queryKey: ["pos-size-assignment", card.id] });
    setIsModalOpen(true);
    console.log("🔵 [Manage POs] isModalOpen set to TRUE");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenSizeModal = (
    poId: string,
    subcategoryId: string,
    subcategoryName: string,
    currentSizes: SizeQuantity
  ) => {
    setSelectedSubcategory({
      poId,
      subcategoryId,
      subcategoryName,
      currentSizes,
    });
    setTempSizeAssignments({ ...currentSizes });
    setIsSizeModalOpen(true);

    // Load custom sizes from existing assignments
    const allSizes = Object.keys(currentSizes);
    const customSizesFound = allSizes.filter(
      (size) => !STANDARD_SIZES.includes(size)
    );
    setCustomSizes(customSizesFound);
  };

  const handleCloseSizeModal = () => {
    setIsSizeModalOpen(false);
    setSelectedSubcategory(null);
    setTempSizeAssignments({});
    setCustomSizes([]);
    setNewCustomSize("");
  };

  const handleSizeQuantityChange = (size: string, value: number | null) => {
    setTempSizeAssignments((prev) => {
      const newAssignments = { ...prev };
      if (value && value > 0) {
        newAssignments[size] = value;
      } else {
        delete newAssignments[size];
      }
      return newAssignments;
    });
  };

  const handleAddCustomSize = () => {
    const customSize = newCustomSize.trim().toUpperCase();
    if (!customSize) return;

    if (STANDARD_SIZES.includes(customSize)) {
      message.warning("This is already a standard size");
      return;
    }

    if (customSizes.includes(customSize)) {
      message.warning("This custom size already exists");
      return;
    }

    setCustomSizes((prev) => [...prev, customSize]);
    setNewCustomSize("");
  };

  const handleRemoveCustomSize = (sizeToRemove: string) => {
    setCustomSizes((prev) => prev.filter((size) => size !== sizeToRemove));

    // Also remove from temp size assignments
    setTempSizeAssignments((prev) => {
      const newAssignments = { ...prev };
      delete newAssignments[sizeToRemove];
      return newAssignments;
    });
  };

  const handleSaveSizeAssignments = () => {
    if (!selectedSubcategory) return;

    const { poId, subcategoryId, subcategoryName } = selectedSubcategory;
    const totalItems = Object.values(tempSizeAssignments).reduce(
      (sum, qty) => sum + qty,
      0
    );

    // Update the PO subcategory data
    setPOSubcategoryData((prev) => {
      const newData = [...prev];
      const poIndex = newData.findIndex((data) => data.po.id === poId);

      if (poIndex !== -1) {
        const subcategoryIndex = newData[
          poIndex
        ].subcategoryAssignments.findIndex(
          (s) => s.subcategoryId === subcategoryId
        );

        if (subcategoryIndex !== -1) {
          newData[poIndex].subcategoryAssignments[subcategoryIndex] = {
            subcategoryId,
            name: subcategoryName,
            sizeAssignments: { ...tempSizeAssignments },
            totalItems,
          };
          newData[poIndex].hasChanges = true;
        }
      }

      return newData;
    });

    message.success(`Size assignments saved for ${subcategoryName}`);
    handleCloseSizeModal();
  };

  const handleSavePO = async (poIndex: number) => {
    const poData = poSubcategoryData[poIndex];
    if (!poData.hasChanges || updatePOMutation.isPending) return;

    try {
      // Build subcategory assignments for the API
      const subcategoryAssignments = poData.subcategoryAssignments
        .filter((s) => Object.keys(s.sizeAssignments).length > 0)
        .map((s) => ({
          subcategoryId: s.subcategoryId,
          sizeAssignments: s.sizeAssignments,
        }));

      await updatePOMutation.mutateAsync({
        poId: poData.po.id,
        updateData: {
          subcategoryAssignments,
        },
      });

      // Mark as saved
      setPOSubcategoryData((prev) => {
        const newData = [...prev];
        newData[poIndex] = {
          ...newData[poIndex],
          hasChanges: false,
        };
        return newData;
      });
    } catch (error) {
      console.error("Error saving PO with subcategories:", error);
    }
  };

  const getTotalItemsForPO = (
    subcategoryAssignments: SubcategoryAssignment[]
  ) => {
    return subcategoryAssignments.reduce(
      (total, assignment) => total + assignment.totalItems,
      0
    );
  };

  const getTotalItemsCount = (): number => {
    return poSubcategoryData.reduce(
      (total, poData) =>
        total + getTotalItemsForPO(poData.subcategoryAssignments),
      0
    );
  };

  const getAllSizes = () => {
    return [...STANDARD_SIZES, ...customSizes];
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
          disabled={!canUpdateCard() || !card.poAmount || card.poAmount <= 0}
          className="rounded-md hover:bg-gray-50"
        >
          Manage POs
        </Button>
      </div>

      {/* Main PO Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Package size={20} />
            <span>Manage POs - {card.name}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        width={700}
        footer={null}
      >
        {isLoadingPOs || isLoadingSubcategories ? (
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

            {/* PO List with Subcategories */}
            <div className="space-y-4">
              {!posData || posData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No POs found for this card.
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">
                    PO Subcategory Assignment
                  </h4>
                  {poSubcategoryData.map((poData, poIndex) => (
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
                          <span className="font-medium">
                            PO {poIndex + 1}: {poData.po.poNumber}
                          </span>
                          {poData.hasChanges && (
                            <Tag color="blue" className="text-xs">
                              Modified
                            </Tag>
                          )}
                          <span className="text-xs text-green-600">
                            Total:{" "}
                            {getTotalItemsForPO(poData.subcategoryAssignments)}
                          </span>
                        </div>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => handleSavePO(poIndex)}
                          disabled={!poData.hasChanges}
                          loading={updatePOMutation.isPending}
                        >
                          Save
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-sm font-semibold text-gray-800 mb-2">
                          Subcategories
                        </h5>
                        <div className="grid grid-cols-5 gap-3">
                          {poData.subcategoryAssignments.map((assignment) => (
                            <div
                              key={assignment.subcategoryId}
                              className="flex flex-col gap-2 p-3 bg-white border rounded-lg hover:border-blue-300 transition-colors"
                            >
                              <div className="text-sm font-medium text-gray-700 text-center">
                                {assignment.name}
                              </div>
                              <Tooltip title="Assign Sizes">
                                <div className="relative">
                                  <Input
                                    value={`${assignment.totalItems} items`}
                                    disabled
                                    size="small"
                                    className="text-gray-600 text-center cursor-pointer"
                                    suffix={
                                      <Ruler
                                        size={14}
                                        className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenSizeModal(
                                            poData.po.id,
                                            assignment.subcategoryId,
                                            assignment.name,
                                            assignment.sizeAssignments
                                          );
                                        }}
                                      />
                                    }
                                    onClick={() =>
                                      handleOpenSizeModal(
                                        poData.po.id,
                                        assignment.subcategoryId,
                                        assignment.name,
                                        assignment.sizeAssignments
                                      )
                                    }
                                  />
                                </div>
                              </Tooltip>
                            </div>
                          ))}
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

      {/* Size Assignment Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Ruler size={20} />
            <span>
              Size Assignment - {selectedSubcategory?.subcategoryName}
            </span>
          </div>
        }
        open={isSizeModalOpen}
        onCancel={handleCloseSizeModal}
        width={600}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseSizeModal}>Cancel</Button>
            <Button type="primary" onClick={handleSaveSizeAssignments}>
              Save Sizes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Total Count */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <span className="text-sm font-medium">
              Total Items:{" "}
              {Object.values(tempSizeAssignments).reduce(
                (sum, qty) => sum + qty,
                0
              )}
            </span>
          </div>

          {/* Standard Sizes */}
          <div>
            <h5 className="text-sm font-semibold text-gray-800 mb-3">
              Standard Sizes
            </h5>
            <div className="grid grid-cols-3 gap-3">
              {STANDARD_SIZES.map((size) => {
                const currentValue = tempSizeAssignments[size] || 0;
                return (
                  <div
                    key={size}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm font-medium text-gray-700 min-w-[50px]">
                      {size}
                    </span>
                    <InputNumber
                      min={0}
                      value={currentValue}
                      onChange={(value) =>
                        handleSizeQuantityChange(size, value)
                      }
                      size="small"
                      className="w-20"
                      controls={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Sizes */}
          <div className="border-t pt-4">
            <h5 className="text-sm font-semibold text-gray-800 mb-3">
              Custom Sizes
            </h5>
            <div className="flex items-center gap-2 mb-3">
              <Input
                placeholder="Add custom size (e.g., 2XS, 6XL)"
                value={newCustomSize}
                onChange={(e) => setNewCustomSize(e.target.value.toUpperCase())}
                onPressEnter={handleAddCustomSize}
                size="small"
                className="flex-1"
              />
              <Button
                size="small"
                onClick={handleAddCustomSize}
                disabled={!newCustomSize.trim()}
              >
                Add
              </Button>
            </div>

            {customSizes.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  {customSizes.map((size) => {
                    const currentValue = tempSizeAssignments[size] || 0;
                    return (
                      <div
                        key={size}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded relative"
                      >
                        <span className="text-sm font-medium text-gray-700 min-w-[50px]">
                          {size}
                          <button
                            onClick={() => handleRemoveCustomSize(size)}
                            className="ml-1 text-red-500 hover:text-red-700 text-xs"
                          >
                            ×
                          </button>
                        </span>
                        <InputNumber
                          min={0}
                          value={currentValue}
                          onChange={(value) =>
                            handleSizeQuantityChange(size, value)
                          }
                          size="small"
                          className="w-20"
                          controls={true}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default POSizeAssignment;
