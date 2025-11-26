import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, Radio, message, Typography } from "antd";
import { BahanTabProps } from "./types";
import CategorySection from "./CategorySection";
import { createRequestWithPOConnection } from "@api/accurate";
import { Check, Pencil } from "lucide-react";
import { useCardAttachment } from "@hooks/card_attachment";
import { EnumAttachmentType } from "@myTypes/card";

type ZeroLoadingCandidate = {
  id: string;
  title: string;
  description?: string;
  isCurrent?: boolean;
};

const normalizeNumericInput = (value: string | undefined | null): number | null => {
  if (value === undefined || value === null) return null;
  const sanitized = value.toString().trim().replace(",", ".");
  if (sanitized === "") return null;
  const numeric = Number(sanitized);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatNumericValue = (value?: number | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "";
  }
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return "";
  }
  return normalized.toString().replace(/\.0+$/, "");
};

const BahanTabContent: React.FC<BahanTabProps> = ({
  bahanTab,
  po,
  product,
  colors,
  categories,
  isLoadingCategories = false,
  poIndex,
  productIndex,
  bahanTabIndex,
  onTerloadingChange,
  onBahanTerpakaiChange,
  onEstBahanChange,
  onCategoryValueChange,
  onOrderStatusChange,
  isCategoryLoading,
  getCategoryError,
  clearCategoryError,
}) => {
  const formatDisplayValue = (
    value?: number | null,
    fallback: string = "0"
  ): string => {
    const formatted = formatNumericValue(value);
    return formatted || fallback;
  };

  const [isSyncingRequest, setIsSyncingRequest] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTerloadingEditing, setIsTerloadingEditing] = useState(
    !product.orderCreated
  );
  const [terloadingInputValue, setTerloadingInputValue] =
    useState<string | null>(null);
  const [terpakaiInputValue, setTerpakaiInputValue] = useState<string | null>(
    null
  );

  const { cardAttachments } = useCardAttachment(po.cardId);
  const [zeroLoadingModalOpen, setZeroLoadingModalOpen] = useState(false);
  const [selectedLoadingCardId, setSelectedLoadingCardId] = useState<
    string | null
  >(null);
  const [isConfirmingZeroLoading, setIsConfirmingZeroLoading] = useState(false);

  useEffect(() => {
    setIsTerloadingEditing(!product.orderCreated);
    setShowSyncSuccess(false);
  }, [product.orderCreated]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isTerloadingEditing) {
      setTerloadingInputValue(null);
    }
  }, [bahanTab.terloading, isTerloadingEditing]);

  useEffect(() => {
    setTerpakaiInputValue(null);
  }, [bahanTab.bahanTerpakai]);

  const shouldDisableInputs = product.orderCreated;
  const shouldDisableTerloadingInput = !isTerloadingEditing || isSyncingRequest;

  const getEditableInputStyle = (disabled: boolean) => ({
    border: `1px solid rgb(${colors.border})`,
    backgroundColor: `rgb(${disabled ? colors.muted : colors.surface})`,
    color: `rgb(${disabled ? colors["text-muted"] : colors.text})`,
  });

  const scheduleSuccessStateReset = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = setTimeout(() => {
      setShowSyncSuccess(false);
    }, 2000);
  };

  const zeroLoadingCandidates = useMemo(() => {
    const entries = new Map<string, ZeroLoadingCandidate>();

    if (po.cardId) {
      entries.set(po.cardId, {
        id: po.cardId,
        title: po.name || "Card",
        description: "Current card",
        isCurrent: true,
      });
    }

    cardAttachments
      .filter(
        (attachment) =>
          attachment.attachableType === EnumAttachmentType.Card &&
          attachment.targetCard &&
          attachment.targetCard.id
      )
      .forEach((attachment) => {
        const targetCard = attachment.targetCard!;
        const descriptionParts = [
          targetCard.boardName,
          targetCard.listName,
          targetCard.shortId ? `#${targetCard.shortId}` : undefined,
        ].filter(Boolean);

        entries.set(targetCard.id, {
          id: targetCard.id,
          title: targetCard.name || `Card ${targetCard.id}`,
          description: descriptionParts.join(" / "),
          isCurrent: targetCard.id === po.cardId,
        });
      });

    return Array.from(entries.values());
  }, [cardAttachments, po.cardId, po.name]);

  useEffect(() => {
    if (zeroLoadingModalOpen && zeroLoadingCandidates.length > 0) {
      setSelectedLoadingCardId((prev) => prev || zeroLoadingCandidates[0].id);
    }
  }, [zeroLoadingCandidates, zeroLoadingModalOpen]);

  const persistTerloadingValue = (value: number) => {
    const updateResult = onTerloadingChange(
      poIndex,
      productIndex,
      bahanTabIndex,
      value
    );

    if (!product.requestId || !updateResult) {
      return;
    }

    setIsSyncingRequest(true);
    updateResult
      .then(() => {
        setShowSyncSuccess(true);
        scheduleSuccessStateReset();
        setIsTerloadingEditing(false);
        setTerloadingInputValue(null);
      })
      .catch(() => {
        // Error already handled upstream; keep editing enabled for retry
      })
      .finally(() => {
        setIsSyncingRequest(false);
      });
  };

  const handleTerloadingSave = () => {
    const normalized =
      normalizeNumericInput(terloadingInputValue) ??
      Number(bahanTab.terloading ?? 0);
    if (Number.isNaN(normalized)) {
      return;
    }
    persistTerloadingValue(normalized);
  };

  const handleTerloadingButtonClick = () => {
    if (isSyncingRequest) return;
    if (isTerloadingEditing) {
      setIsTerloadingEditing(false);
      handleTerloadingSave();
    } else {
      setTerloadingInputValue(formatNumericValue(bahanTab.terloading));
      setIsTerloadingEditing(true);
    }
  };

  const closeZeroModal = () => {
    setZeroLoadingModalOpen(false);
    setSelectedLoadingCardId(null);
  };

  // Handler for Create New Order button
  const handleCreateNewOrder = async (
    po: any,
    product: any
  ): Promise<boolean> => {
    // Only create new orders, don't toggle existing ones
    if (product.orderCreated) {
      message.info(`Order already exists for ${product.name} in ${po.name}`);
      return false;
    }

    // Creating new order for product

    // Validate required data
    if (!product.poProductId) {
      message.error("Cannot create order: Product ID not found");
      return false;
    }

    if (!po.cardId) {
      message.error("Cannot create order: Card ID not found");
      return false;
    }

    try {
      // Prepare request data
      const safeRequestAmount =
        bahanTab.terloading === 0 ? "0" : bahanTab.terloading;
      const safeRequestSent =
        bahanTab.terloading === 0 ? "0" : bahanTab.terloading;
      const sentNumber = Number(bahanTab.terloading ?? 0);
      const usedNumber = Number(bahanTab.bahanTerpakai ?? 0);
      const leftNumber = Math.max(sentNumber - usedNumber, 0);

      const requestData = {
        card_id: po.cardId,
        type: "NEW_ORDER",
        item_name: product.name,
        requested_item_id: product.id,
        request_amount: safeRequestAmount, // Use terloading amount
        request_sent: safeRequestSent, // Use terloading amount (same as request_amount)
        request_received: usedNumber,
        request_left: leftNumber,
        is_verified: true, // Default to verified
        po_product_ids: [product.poProductId],
        // Add adjustment fields from product data
        satuan: product.satuan,
        adjustment_no: product.adjustment_no,
        adjustment_name: product.adjustment_name,
      };

      // Product content

      const response = await createRequestWithPOConnection(requestData);
      const requestIdFromResponse = response?.data?.request?.id;
      const parsedRequestId =
        requestIdFromResponse !== undefined && requestIdFromResponse !== null
          ? Number(requestIdFromResponse)
          : undefined;
      const validRequestId =
        parsedRequestId !== undefined && !Number.isNaN(parsedRequestId)
          ? parsedRequestId
          : undefined;

      // Update local state to reflect the order creation
      onOrderStatusChange(poIndex, productIndex, true, validRequestId);

      message.success(
        `Order created successfully for ${product.name} in ${po.name}`
      );
      return true;
    } catch (error) {
      console.error("❌ [BahanTabContent] Failed to create order:", error);
      message.error(
        `Failed to create order for ${product.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  };

  const isOrderAlreadyCreated = !!product.orderCreated;
  const hasTerloadingValue =
    typeof bahanTab.terloading === "number" && bahanTab.terloading > 0;
  const disableLoadingButton = isOrderAlreadyCreated || isSyncingRequest;

  const handleConfirmZeroLoading = async () => {
    if (!selectedLoadingCardId) {
      return;
    }

    setIsConfirmingZeroLoading(true);
    const success = await handleCreateNewOrder(po, product);
    setIsConfirmingZeroLoading(false);

    if (success) {
      closeZeroModal();
    }
  };

  const handleLoadingClick = () => {
    if (disableLoadingButton) {
      return;
    }

    if (hasTerloadingValue) {
      void handleCreateNewOrder(po, product);
      return;
    }

    if (zeroLoadingCandidates.length === 0) {
      void handleCreateNewOrder(po, product);
      return;
    }

    setZeroLoadingModalOpen(true);
  };

  return (
    <div>
      {/* Input Fields Grid */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
        {/* Terloading (Enabled) */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label
              className="text-xs font-medium flex items-center gap-1"
              style={{
                color: `rgb(${colors["text-muted"]})`,
              }}
            >
              Terloading ({product.satuan || "unit"})
              {showSyncSuccess && (
                <Check
                  size={14}
                  className="text-emerald-500"
                  aria-label="Nilai sudah tersinkron"
                />
              )}
            </label>
            {product.orderCreated && (
              <button
                type="button"
                onClick={handleTerloadingButtonClick}
                disabled={isSyncingRequest}
                className="flex items-center justify-center w-6 h-6 rounded-full border transition-colors hover:bg-opacity-90"
                title={
                  isTerloadingEditing
                    ? "Kunci kembali nilai terloading"
                    : "Klik untuk mengedit nilai terloading"
                }
                style={{
                  borderColor: `rgb(${colors.border})`,
                  backgroundColor: `rgb(${colors.surface})`,
                  color: `rgb(${colors.text})`,
                  opacity: isSyncingRequest ? 0.6 : 1,
                }}
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
          <input
            type="number"
            value={
              isTerloadingEditing
                ? terloadingInputValue ??
                  formatNumericValue(bahanTab.terloading)
                : formatNumericValue(bahanTab.terloading)
            }
            onFocus={() => {
              if (bahanTab.terloading === 0) {
                setTerloadingInputValue("");
              }
            }}
            onBlur={() => {
              if (terloadingInputValue === "") {
                setTerloadingInputValue(null);
              }
            }}
            onChange={(e) => {
              const value = e.target.value;
              setTerloadingInputValue(value);
            }}
            disabled={shouldDisableTerloadingInput}
            className={`w-full px-3 py-2 rounded-md text-sm ${
              shouldDisableTerloadingInput
                ? "cursor-not-allowed opacity-80"
                : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
            style={getEditableInputStyle(shouldDisableTerloadingInput)}
          />
        </div>

        {/* Sisa Bahan (Calculated, Disabled) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Sisa Bahan ({product.satuan || "unit"})
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={formatDisplayValue(bahanTab.sisaBahan)}
            readOnly
          />
        </div>

        {/* Jml Produksi (Disabled, for later calculation) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Jml. Produksi (+/-)
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={bahanTab.jmlProduksi}
            readOnly
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-6">
        {/* Est Bahan (Calculated, Disabled) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Est Bahan ({product.satuan || "unit"})
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={formatDisplayValue(bahanTab.estBahan)}
            readOnly
          />
        </div>

        {/* Bahan Terpakai (Enabled) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Bahan Terpakai ({product.satuan || "unit"})
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={
              terpakaiInputValue !== null
                ? terpakaiInputValue
                : formatNumericValue(bahanTab.bahanTerpakai)
            }
            onFocus={() => {
              if (bahanTab.bahanTerpakai === 0) {
                setTerpakaiInputValue("");
              }
            }}
            onBlur={() => {
              if (terpakaiInputValue === "") {
                setTerpakaiInputValue(null);
              }
              if (
                typeof bahanTab.bahanTerpakai === "number" &&
                !Number.isNaN(bahanTab.bahanTerpakai)
              ) {
                onBahanTerpakaiChange(
                  poIndex,
                  productIndex,
                  bahanTabIndex,
                  parseFloat(bahanTab.bahanTerpakai.toFixed(2))
                );
              }
            }}
            onChange={(e) => {
              const value = e.target.value;
              setTerpakaiInputValue(value);
              const normalized = normalizeNumericInput(value);
              onBahanTerpakaiChange(
                poIndex,
                productIndex,
                bahanTabIndex,
                normalized ?? 0
              );
            }}
            disabled={shouldDisableInputs}
            className={`w-full px-3 py-2 rounded-md text-sm ${
              shouldDisableInputs
                ? "cursor-not-allowed opacity-80"
                : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
            style={getEditableInputStyle(shouldDisableInputs)}
          />
        </div>

        {/* Efisiensi (Calculated, Disabled) */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Efisiensi ({product.satuan || "unit"}) / %
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={`${formatDisplayValue(
              bahanTab.estBahan - (bahanTab.bahanTerpakai || 0)
            )} ${product.satuan || "unit"} / ${bahanTab.efisiensi.toFixed(2)}%`}
            readOnly
          />
        </div>
      </div>

      <Modal
        open={zeroLoadingModalOpen}
        title="Konfirmasi Loading"
        onCancel={closeZeroModal}
        bodyStyle={{ padding: "24px" }}
        footer={[
          <Button key="cancel" onClick={closeZeroModal}>
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={handleConfirmZeroLoading}
            disabled={!selectedLoadingCardId}
            loading={isConfirmingZeroLoading}
          >
            Yes, proceed
          </Button>,
        ]}
      >
        <Typography.Text>
          Terloading masih 0. Pilih kartu yang akan digunakan untuk proses
          loading sebelum melanjutkan.
        </Typography.Text>
        <Radio.Group
          value={selectedLoadingCardId}
          onChange={(e) => setSelectedLoadingCardId(e.target.value)}
          className="w-full"
        >
          <div className="mt-3 flex flex-col gap-3">
            {zeroLoadingCandidates.map((candidate) => (
              <Radio
                key={candidate.id}
                value={candidate.id}
                className="w-full rounded border p-3"
                style={{
                  borderColor: candidate.isCurrent
                    ? "rgb(59 130 246 / 0.4)"
                    : "rgb(209 213 219)",
                }}
              >
                <div className="flex flex-col">
                  <Typography.Text strong>{candidate.title}</Typography.Text>
                  {candidate.description && (
                    <Typography.Text type="secondary" className="text-xs">
                      {candidate.description}
                    </Typography.Text>
                  )}
                </div>
              </Radio>
            ))}
          </div>
        </Radio.Group>
      </Modal>

      {/* Category Section */}
      <CategorySection
        product={product}
        po={po}
        colors={colors}
        categories={categories || []}
        isLoadingCategories={isLoadingCategories}
        onCategoryValueChange={(
          poId,
          productId,
          categoryId,
          subcategoryId,
          value
        ) => {
          // Category value change called
          onCategoryValueChange(
            poIndex,
            productIndex,
            categoryId,
            subcategoryId,
            value
          );
        }}
        isCategoryLoading={isCategoryLoading}
        getCategoryError={getCategoryError}
        clearCategoryError={clearCategoryError}
      />

      {/* Create New Order Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleLoadingClick}
          disabled={disableLoadingButton}
          className={`px-6 py-3 text-sm font-medium border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm ${
            isOrderAlreadyCreated
              ? "bg-green-600 border-green-600 text-white cursor-not-allowed opacity-75"
              : disableLoadingButton
              ? "bg-gray-300 border-gray-300 text-gray-600 cursor-not-allowed opacity-75"
              : "bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700 focus:ring-blue-500 text-white"
          }`}
        >
          {isOrderAlreadyCreated ? "Terloading ✓" : "Loading"}
        </button>
      </div>
    </div>
  );
};

export default BahanTabContent;
