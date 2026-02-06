import React, { useEffect, useMemo, useRef, useState } from "react";
import { message } from "antd";
import { BahanTabProps } from "./types";
import CategorySection from "./CategorySection";
import {
  createRequestWithPOConnection,
  getAllAdjustmentItems,
  RequestQuantity,
  updateRequest,
} from "@api/accurate";
import { useCardAttachment } from "@hooks/card_attachment";
import { EnumAttachmentType } from "@myTypes/card";
import {
  getRequestedItemIdFromProduct,
  getUnitPriceFromProduct,
  resolveProductSource,
  resolveAccurateDbId,
  resolveProductKey,
} from "./productHelpers";
import { buildRequestItemMeta } from "./requestPayload";
import { updatePOProductCategory } from "@api/po-product";
import { useParams } from "next/navigation";
import { useAccountList } from "@hooks/account";
import BahanControls from "./BahanControls";

type ZeroLoadingCandidate = {
  id: string;
  title: string;
  description?: string;
  isCurrent?: boolean;
};

const normalizeNumericInput = (
  value: string | undefined | null
): number | null => {
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
  return normalized.toFixed(2);
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const getCogsGlAccountIdFromItem = (item?: any): number | null => {
  if (!item) return null;
  const rawValue =
    item.cogs_gl_account_id ??
    item.cogsGlAccountId ??
    item.inventory_gl_account_id ??
    item.inventoryGlAccountId ??
    null;
  return toNumberOrNull(rawValue);
};

const resolveGlAccountForItem = async (item?: any) => {
  if (!item) return null;

  const itemSource = resolveProductSource(item) ?? "Hikmat";

  try {
    const glAccountsResponse = await getAllAdjustmentItems(itemSource);
    const accountList =
      glAccountsResponse?.data?.d ?? glAccountsResponse?.d ?? [];


    if (!Array.isArray(accountList) || accountList.length === 0) {
      return null;
    }

    const targetGlAccountId = getCogsGlAccountIdFromItem(item);
    if (targetGlAccountId !== null) {
      const matching = accountList.find(
        (acc: any) => Number(acc.id) === targetGlAccountId
      );
      if (matching) return matching;
    }

    const itemCategoryName = item?.itemCategory?.name
      ? item.itemCategory.name.toLowerCase()
      : "";
    const normalizedSource = itemSource ? itemSource.toLowerCase() : "";
    let suitableAccount = null;

    if (itemCategoryName) {
      suitableAccount = accountList.find((acc: any) => {
        const accountName = acc.name.toLowerCase();
        const cleanAccountName = accountName
          .replace("hpp ", "")
          .replace("beban ", "");

        const directMatch = accountName.includes(itemCategoryName);
        const reverseMatch = itemCategoryName.includes(cleanAccountName);

        return directMatch || reverseMatch;
      });

      if (!suitableAccount && normalizedSource === "hikmat") {
        const hikmatCategoryKeywords = [
          "krah",
          "manset",
          "rib",
          "bahan",
          "kain",
        ];

        const matchingKeyword = hikmatCategoryKeywords.find((keyword) =>
          itemCategoryName.includes(keyword)
        );

        if (matchingKeyword) {
          suitableAccount = accountList.find((acc: any) => {
            const accountName = acc.name.toLowerCase();
            return (
              accountName.includes(matchingKeyword) ||
              accountName.includes("penyesuaian " + matchingKeyword) ||
              accountName.includes("beban penyesuaian " + matchingKeyword)
            );
          });
        }

        if (!suitableAccount) {
          suitableAccount = accountList.find((acc: any) => {
            const accountName = acc.name.toLowerCase();
            return (
              accountName.includes("hikmat") ||
              accountName.includes("adjustment hikmat") ||
              accountName.includes("bahan hikmat")
            );
          });
        }
      }

      if (!suitableAccount && normalizedSource) {
        suitableAccount = accountList.find((acc: any) => {
          const accountSource = (acc.source || "").toLowerCase();
          return accountSource === normalizedSource;
        });
      }

      if (!suitableAccount && accountList.length > 0) {
        suitableAccount = accountList[0];
      }

      if (suitableAccount) {
        return suitableAccount;
      }
    }

    return accountList[0] ?? null;
  } catch (error) {
    console.error(
      "🔍 [BahanTabContent] Failed to resolve GL account for item:",
      error
    );
    return null;
  }
};

const BahanTabContent: React.FC<BahanTabProps> = ({
  bahanTab,
  po,
  product,
  warehouseProducts,
  colors,
  categories,
  isLoadingCategories = false,
  bahanTabIndex,
  onTerloadingChange,
  onBahanTerpakaiChange,
  onEstBahanChange,
  onCategoryValueChange,
  onOrderStatusChange,
  isCategoryLoading,
  getCategoryError,
  clearCategoryError,
  isCabangFilled = false,
  onLoadingStateChange,
  jmlCuttingValue,
}) => {
  const params = useParams();
  const workspaceId = (params as any)?.workspaceId?.toString?.() || "";
  const boardId = (params as any)?.boardId?.toString?.() || "";
  const { data: accountListData } = useAccountList({
    workspaceId,
    boardId,
  });

  const findWarehouseProduct = () => {
    if (product.warehouseProduct) return product.warehouseProduct;
    if (!warehouseProducts || warehouseProducts.length === 0) return null;

    const targetKey = resolveProductKey(product);
    const targetDbId = resolveAccurateDbId(product);

    const candidates = warehouseProducts.filter((item: any) => {
      const keyMatches = resolveProductKey(item) === targetKey;
      if (!keyMatches) return false;

      if (targetDbId) {
        const itemDbId = resolveAccurateDbId(item);
        return itemDbId ? itemDbId === targetDbId : false;
      }

      return true;
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const byName = candidates.find(
      (item: any) => item.name && product.name && item.name === product.name
    );
    return byName ?? candidates[0];
  };

  const resolvedProduct = useMemo(
    () => findWarehouseProduct() || product,
    [warehouseProducts, product]
  );

  const sentByValue = useMemo(() => {
    const raw = product.sentBy;
    if (raw === undefined || raw === null) return undefined;
    const normalized = raw.toString().trim();
    return normalized.length > 0 ? normalized : undefined;
  }, [product.sentBy]);
  const [selectedSentBy, setSelectedSentBy] = useState<string | undefined>(sentByValue);
  useEffect(() => {
    setSelectedSentBy(sentByValue);
  }, [sentByValue]);
  const requestByOptions = useMemo(() => {
    const optionsMap = new Map<string, { value: string; label: string }>();

    const accounts = accountListData?.data || [];
    accounts.forEach((user: any) => {
      const label =
        user?.username ||
        user?.name ||
        user?.email ||
        user?.phone ||
        user?.id;
      const value = user?.id || label?.toString();
      if (value) {
        optionsMap.set(value, { value, label: label?.toString() || value });
      }
    });

    if (selectedSentBy && !optionsMap.has(selectedSentBy)) {
      optionsMap.set(selectedSentBy, { value: selectedSentBy, label: selectedSentBy });
    }

    return Array.from(optionsMap.values());
  }, [accountListData?.data, selectedSentBy]);

  const getProductForRequest = () => resolvedProduct || product;
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
  const [terloadingInputValue, setTerloadingInputValue] = useState<
    string | null
  >(null);
  const [terpakaiInputValue, setTerpakaiInputValue] = useState<string | null>(
    null
  );
  const [description, setDescription] = useState<string>(
    product.description ?? ""
  );
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const { cardAttachments } = useCardAttachment(po.cardId);
  const [zeroLoadingModalOpen, setZeroLoadingModalOpen] = useState(false);
  const [selectedLoadingCardId, setSelectedLoadingCardId] = useState<
    string | null
  >(null);
  const [isConfirmingZeroLoading, setIsConfirmingZeroLoading] = useState(false);
  const productTerloading = (product as any)?.terloading;

  // Auto-calculate Est Bahan on load if missing (fallback to terloading)
  useEffect(() => {
    const currentEst = toNumberOrNull(bahanTab.estBahan);
    if (currentEst === null) {
      const fallbackEst =
        toNumberOrNull(bahanTab.terloading) ??
        toNumberOrNull(productTerloading) ??
        0;
      if (Number.isFinite(fallbackEst)) {
        onEstBahanChange(
          po.id,
          product.id,
          bahanTabIndex,
          Number(fallbackEst)
        );
      }
    }
  }, [
    bahanTab.estBahan,
    bahanTab.terloading,
    productTerloading,
    bahanTabIndex,
    onEstBahanChange,
    po.id,
    product.id,
  ]);

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

  useEffect(() => {
    setDescription(product.description ?? "");
  }, [product.description]);

  const shouldDisableInputs = Boolean(product.orderCreated);
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
    const payloadProduct = getProductForRequest();
    const updateResult = onTerloadingChange(
      po.id,
      product.id,
      bahanTabIndex,
      value,
      payloadProduct
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
      const payloadProduct = getProductForRequest();
      const itemMeta = buildRequestItemMeta(payloadProduct ?? product);
      const requestedItemId =
        itemMeta.requested_item_id ??
        getRequestedItemIdFromProduct(product);
      const unitPrice =
        itemMeta.unit_price ?? getUnitPriceFromProduct(payloadProduct);
      const resolvedGlAccount = await resolveGlAccountForItem(payloadProduct);
      const requestSource =
        itemMeta.source ??
        resolveProductSource(payloadProduct) ??
        resolveProductSource(product) ??
        "Hikmat";
      const trimmedDescription = (description ?? "").trim();

      const safeRequestAmount =
        bahanTab.terloading === 0 ? "0" : bahanTab.terloading;
      const safeRequestSent =
        bahanTab.terloading === 0 ? "0" : bahanTab.terloading;
      const sentNumber = Number(bahanTab.terloading ?? 0);
      const usedNumber = Number(bahanTab.bahanTerpakai ?? 0);
      const leftNumber = Math.max(sentNumber - usedNumber, 0);
      const estBahanNumber =
        toNumberOrNull(bahanTab.estBahan) ??
        (Number.isFinite(sentNumber) ? sentNumber : null);
      const efisiensiNumber =
        estBahanNumber !== null ? estBahanNumber - usedNumber : null;

      console.log(product, "<< product data for order creation");

      type RequestPayloadWithExtras = Parameters<typeof createRequestWithPOConnection>[0] & {
        request_received?: RequestQuantity;
        request_left?: RequestQuantity;
        source?: string;
        satuan?: string;
        adjustment_no?: string;
        adjustment_name?: string;
        unit_price?: number;
        beli?: string;
        description?: string;
        est_bahan?: number | null;
        efisiensi?: number | null;
        sent_by?: string | null;
      };

      const requestData: RequestPayloadWithExtras = {
        card_id: po.cardId,
        type: "NEW_ORDER",
        item_name: itemMeta.item_name || product.name,
        request_amount: safeRequestAmount, // Use terloading amount
        request_sent: safeRequestSent, // Use terloading amount (same as request_amount)
        requested_item_id: requestedItemId || "",
        request_received: usedNumber,
        request_left: leftNumber,
        is_verified: true, // Default to verified
        beli: "Tidak",
        po_product_ids: [product.poProductId],
        source: requestSource,
        satuan: itemMeta.satuan || payloadProduct.satuan || product.satuan,
        adjustment_no:
          resolvedGlAccount?.no || product.adjustment_no || undefined,
        adjustment_name:
          resolvedGlAccount?.name || product.adjustment_name || undefined,
        unit_price: unitPrice,
        description: trimmedDescription || undefined,
        est_bahan: estBahanNumber,
        efisiensi: efisiensiNumber,
        sent_by: selectedSentBy ?? null,
      };

      if (requestedItemId) {
        requestData.requested_item_id = requestedItemId;
      }

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
      onOrderStatusChange(po.id, product.id, true, validRequestId);

      message.success(
        `Order created successfully for ${product.name} in ${po.name}`
      );
      return true;
    } catch (error) {
      console.error("❌ [BahanTabContent] Failed to create order:", error);
      message.error(
        `Failed to create order for ${product.name}: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  };

  const isOrderAlreadyCreated = !!product.orderCreated;
  const normalizedTerloading = toNumberOrNull(bahanTab.terloading);
  const hasTerloadingValue =
    typeof normalizedTerloading === "number" &&
    normalizedTerloading > 0;
  const hasDescription =
    typeof description === "string" && description.trim().length > 0;
  const hasSender = Boolean(selectedSentBy && selectedSentBy.trim().length > 0);
  const disableLoadingButton =
    isOrderAlreadyCreated ||
    isSyncingRequest ||
    isLoadingAction ||
    !hasDescription ||
    !hasSender ||
    !isCabangFilled;

  const handleConfirmZeroLoading = async () => {
    if (!selectedLoadingCardId) {
      return;
    }

    setIsConfirmingZeroLoading(true);

    // Save description before creating order
    await persistDescription();

    const success = await handleCreateNewOrder(po, product);
    setIsConfirmingZeroLoading(false);

    if (success) {
      closeZeroModal();
    }
  };

  /**
   * Persists description to backend.
   * ONLY called when Loading button is clicked or zero loading modal is confirmed.
   * NEVER call this on blur, change, or any other automatic trigger.
   */
  const persistDescription = async () => {
    const trimmed = (description ?? "").trim();
    const work: Array<Promise<unknown>> = [];

    const targetCategoryIds: string[] =
      product.poProductCategoryIds && product.poProductCategoryIds.length > 0
        ? product.poProductCategoryIds.filter(Boolean)
        : product.poProductCategoryId
          ? [product.poProductCategoryId]
          : [];

    targetCategoryIds.forEach((catId) => {
      work.push(
        updatePOProductCategory(catId, {
          description: trimmed || null,
        })
      );
    });

    if (product.requestId) {
      work.push(
        updateRequest(String(product.requestId), {
          description: trimmed || null,
        })
      );
    }

    if (work.length === 0) return;

    setIsSavingDescription(true);
    try {
      await Promise.all(work);
    } catch (err) {
      console.error("Failed to persist description", err);
      message.error("Gagal menyimpan deskripsi");
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleLoadingClick = React.useCallback(async () => {
    setIsLoadingAction(true);
    if (disableLoadingButton) {
      if (!hasSender) {
        message.warning("Pilih 'Dikirim Oleh' sebelum loading.");
      } else if (!hasDescription) {
        message.warning("Isi deskripsi terlebih dahulu sebelum loading.");
      }
      setIsLoadingAction(false);
      return;
    }

    // Save description before creating order
    await persistDescription();

    if (hasTerloadingValue) {
      try {
        await handleCreateNewOrder(po, product);
      } finally {
        setIsLoadingAction(false);
      }
      return;
    }

    setZeroLoadingModalOpen(true);
    setIsLoadingAction(false);
  }, [
    disableLoadingButton,
    hasSender,
    hasDescription,
    hasTerloadingValue,
    handleCreateNewOrder,
    po,
    product,
    persistDescription,
  ]);

  const handleTerloadingFocus = () => {
    if (bahanTab.terloading === 0) {
      setTerloadingInputValue("");
    }
  };

  const handleTerloadingBlur = () => {
    if (terloadingInputValue === "") {
      setTerloadingInputValue(null);
    }
    if (!product.orderCreated && isTerloadingEditing) {
      handleTerloadingSave();
    }
  };

  const handleTerloadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTerloadingInputValue(e.target.value);
  };

  const handleTerpakaiFocus = () => {
    if (bahanTab.bahanTerpakai === 0 || bahanTab.bahanTerpakai === null) {
      setTerpakaiInputValue("");
    }
  };

  const handleTerpakaiBlur = () => {
    if (terpakaiInputValue === "") {
      setTerpakaiInputValue(null);
    }
    const normalized = normalizeNumericInput(terpakaiInputValue);
    const payloadProduct = getProductForRequest();
    onBahanTerpakaiChange(
      po.id,
      product.id,
      bahanTabIndex,
      normalized,
      payloadProduct,
      { commit: true }
    );
  };

  const handleTerpakaiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTerpakaiInputValue(value);
  };

  const lastLoadingStateRef = React.useRef<{
    disableLoadingButton: boolean;
    isOrderAlreadyCreated: boolean;
    isLoadingAction: boolean;
  } | null>(null);

  React.useEffect(() => {
    const nextState = {
      disableLoadingButton,
      isOrderAlreadyCreated,
      isLoadingAction: isLoadingAction || isConfirmingZeroLoading,
    };

    const last = lastLoadingStateRef.current;
    if (
      last &&
      last.disableLoadingButton === nextState.disableLoadingButton &&
      last.isOrderAlreadyCreated === nextState.isOrderAlreadyCreated &&
      last.isLoadingAction === nextState.isLoadingAction
    ) {
      return;
    }

    lastLoadingStateRef.current = nextState;

    onLoadingStateChange?.({
      poId: po.id,
      productId: product.id,
      disableLoadingButton: nextState.disableLoadingButton,
      isOrderAlreadyCreated: nextState.isOrderAlreadyCreated,
      handleLoadingClick,
      isLoadingAction: nextState.isLoadingAction,
    });
  }, [
    onLoadingStateChange,
    po.id,
    product.id,
    disableLoadingButton,
    isOrderAlreadyCreated,
    handleLoadingClick,
    isLoadingAction,
    isConfirmingZeroLoading,
  ]);

  return (
    <div>

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
            poId,
            productId,
            categoryId,
            subcategoryId,
            value
          );
        }}
        isCategoryLoading={isCategoryLoading}
        getCategoryError={getCategoryError}
        clearCategoryError={clearCategoryError}
      />
      <br />
      <hr />
      <br />
      <BahanControls
        colors={colors}
        product={product}
        bahanTab={bahanTab}
        jmlCuttingValue={jmlCuttingValue}
        showSyncSuccess={showSyncSuccess}
        isTerloadingEditing={isTerloadingEditing}
        terloadingInputValue={terloadingInputValue}
        onTerloadingFocus={handleTerloadingFocus}
        onTerloadingBlur={handleTerloadingBlur}
        onTerloadingChange={handleTerloadingChange}
        shouldDisableTerloadingInput={shouldDisableTerloadingInput}
        getEditableInputStyle={getEditableInputStyle}
        formatNumericValue={formatNumericValue}
        formatDisplayValue={formatDisplayValue}
        handleTerloadingButtonClick={handleTerloadingButtonClick}
        shouldDisableInputs={shouldDisableInputs}
        terpakaiInputValue={terpakaiInputValue}
        onTerpakaiFocus={handleTerpakaiFocus}
        onTerpakaiBlur={handleTerpakaiBlur}
        onTerpakaiChange={handleTerpakaiChange}
        selectedSentBy={selectedSentBy}
        requestByOptions={requestByOptions}
        onSentByChange={setSelectedSentBy}
        description={description}
        onDescriptionChange={setDescription}
        zeroLoadingModalOpen={zeroLoadingModalOpen}
        closeZeroModal={closeZeroModal}
        handleConfirmZeroLoading={handleConfirmZeroLoading}
        selectedLoadingCardId={selectedLoadingCardId}
        setSelectedLoadingCardId={setSelectedLoadingCardId}
        zeroLoadingCandidates={zeroLoadingCandidates}
        isConfirmingZeroLoading={isConfirmingZeroLoading}
      />


    </div>
  );
};

export default BahanTabContent;
