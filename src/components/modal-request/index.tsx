import { getAllAdjustmentItems, submitRequest } from "@api/accurate";
import { getMiniWarehouseRequestProducts } from "@api/mini-warehouse";
import { searchCards } from "@api/card";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  AutoComplete,
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Avatar,
  Typography,
  Tooltip,
} from "antd";
import React, { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAccountListForModal } from "@hooks/account";
import { getCombinedOzzyProducts } from "@api/ozzy-warehouse";
import { getPOProductsByCardId } from "@api/po-product";
import { mergeRequestProducts } from "./mergeRequestProducts";
import { resolveMpiAdjustmentAccount } from "@utils/mpi-adjustment-account";
interface ModalRequestProps {
  open: boolean;
  onClose: () => void;
}

const { Option } = Select;

const MPI_KUI_ACCOUNT_MAPPINGS = [
  { accountName: "HPP Bahan HEMCA Stok", keywords: ["hemca", "hemca stok"] },
  { accountName: "HPP Bahan Reject", keywords: ["bahan reject", "reject"] },
  {
    accountName: "Beban Penyesuaian Produk",
    keywords: ["penyesuaian produk", "produk penyesuaian"],
  },
  {
    accountName: "Beban Penyesuaian Bahan",
    keywords: ["penyesuaian bahan", "bahan penyesuaian"],
  },
  {
    accountName: "Persediaan Produk Reject",
    keywords: ["produk reject", "persediaan produk"],
  },
  {
    accountName: "Beban Penyesuaian Aksesoris",
    keywords: ["penyesuaian aksesoris", "aksesoris"],
  },
  { accountName: "HPP Hang Tag", keywords: ["hangtag", "hang tag"] },
  { accountName: "HPP Kancing", keywords: ["kancing"] },
  { accountName: "HPP Label", keywords: ["label"] },
  {
    accountName: "HPP Plastik OPP",
    keywords: ["plastik opp", "opp hemca", "opp"],
  },
  { accountName: "HPP Resleting", keywords: ["resleting", "reslet"] },
  { accountName: "HPP Benang", keywords: ["benang"] },
  { accountName: "HPP Kain Keras", keywords: ["kain keras"] },
  {
    accountName: "Beban Perlengkapan",
    keywords: [
      "bagor",
      "gunting",
      "jarum",
      "kapur cutting",
      "lakban",
      "pensil glass",
      "tali rafia",
      "stiker",
      "perlengkapan produksi",
    ],
  },
];

type MpiKuiMapping = (typeof MPI_KUI_ACCOUNT_MAPPINGS)[number];

const findBestMappingByKeywords = (name: string): MpiKuiMapping | undefined => {
  const normalizedName = (name || "").toLowerCase();
  let bestMapping: MpiKuiMapping | undefined;
  let bestScore = -1;

  MPI_KUI_ACCOUNT_MAPPINGS.forEach((mapping) => {
    mapping.keywords.forEach((kw) => {
      const keyword = (kw || "").toLowerCase().trim();
      if (!keyword) return;
      if (normalizedName.includes(keyword)) {
        const score = keyword.length; // prefer the most specific/longest keyword match
        if (score > bestScore) {
          bestScore = score;
          bestMapping = mapping;
        }
      }
    });
  });

  return bestMapping;
};

const findAccountByName = (accounts: any[], accountName: string) => {
  if (!Array.isArray(accounts)) return undefined;
  const normalized = accountName.toLowerCase();
  return (
    accounts.find(
      (acc: any) =>
        typeof acc.name === "string" && acc.name.toLowerCase() === normalized,
    ) ||
    accounts.find(
      (acc: any) =>
        typeof acc.name === "string" &&
        acc.name.toLowerCase().includes(normalized),
    )
  );
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

const ModalRequest: React.FC<ModalRequestProps> = ({ open, onClose }) => {
  const { workspaceId, boardId } = useParams();
  const [cards, setCards] = React.useState<any>([]);
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(
    null,
  );
  const [selectedActionType, setSelectedActionType] =
    React.useState<string>("");
  const [isAkunPenyesuaianDisabled, setIsAkunPenyesuaianDisabled] =
    React.useState<boolean>(false);
  const [cardSearchValue, setCardSearchValue] = React.useState<string>("");
  const miniProductsQuery = useQuery({
    queryKey: ["mini-warehouse-request-products"],
    queryFn: getMiniWarehouseRequestProducts,
    enabled: open,
  });
  const [selectedItemUnit, setSelectedItemUnit] = React.useState<string>("");
  const [availableUnits, setAvailableUnits] = React.useState<
    { label: string; value: string }[]
  >([]);
  const [selectedItemSource, setSelectedItemSource] =
    React.useState<string>("");
  const [selectedItemGlAccountId, setSelectedItemGlAccountId] = React.useState<
    number | null
  >(null);
  const [selectedItemUnitPrice, setSelectedItemUnitPrice] =
    React.useState<string>("");
  const [selectedRequestBy, setSelectedRequestBy] = React.useState<string>("");
  const [isSubmittingRequest, setIsSubmittingRequest] =
    React.useState<boolean>(false);

  // Fetch users for Request By dropdown
  const { data: accountListData, isLoading: accountListLoading } =
    useAccountListForModal({
      workspaceId: Array.isArray(workspaceId)
        ? (workspaceId[0] as string)
        : (workspaceId as string),
      boardId: Array.isArray(boardId)
        ? (boardId[0] as string)
        : (boardId as string),
    });

  const queries = useQueries({
    queries: [
      {
        queryKey: ["cards", cardSearchValue],
        queryFn: () => searchCards({ name: cardSearchValue }),
        enabled: open, // Only run when modal is open
      },
      {
        queryKey: ["items", "ozzy-products"],
        queryFn: () => getCombinedOzzyProducts(),
        enabled: open,
      },
      {
        queryKey: ["glaccounts", selectedItemSource],
        queryFn: () => getAllAdjustmentItems(selectedItemSource),
        enabled: open && !!selectedItemSource, // Only run when modal is open and source is selected
      },
    ],
  });

  const [cardsQuery, productsQuery, glaccountQuery] = queries;
  const glaccounts = glaccountQuery.data?.data;

  const normalizedActionType = (selectedActionType || "").toUpperCase();
  const shouldRestrictToHikmat =
    normalizedActionType !== "" && normalizedActionType !== "NEW_ORDER";

  const { data: poProductsResponse } = useQuery({
    queryKey: [
      "po-products",
      "modal-request",
      selectedCardId,
      normalizedActionType,
    ],
    queryFn: () => getPOProductsByCardId(selectedCardId as string),
    enabled: open && !!selectedCardId && shouldRestrictToHikmat,
    staleTime: 5 * 60 * 1000,
  });

  const poProductsData = poProductsResponse?.data || [];

  const allowedHikmatProductIds = React.useMemo(() => {
    if (!Array.isArray(poProductsData) || poProductsData.length === 0) {
      return new Set<string>();
    }

    return new Set<string>(
      poProductsData
        .map((product: any) => product?.hikmatProductId)
        .filter(
          (id: unknown): id is string | number =>
            id !== undefined && id !== null,
        )
        .map((id) => String(id)),
    );
  }, [poProductsData]);

  const isPOSelected = Boolean(selectedCardId);
  const ALLOWED_LISTS = [
    "PO Masuk (DM)",
    "Desain Fix (PPIC)",
    "Purchasing",
    "Loading (Gudang)",
    "Cutting",
    "Numbering (Dist. Cutting)",
    "Loading Line",
    "Sewing",
    "QC",
    "Siap DTF / Sablon",
    "Siap Bordir",
    "Bordir / DTF",
    "Finishing Bordir",
    "Finishing Packing",
    "Clearkan PO Lama",
  ].map((l) => l.toLowerCase());

  useEffect(() => {
    const normalize = (v?: string) => v?.trim().toLowerCase();

    if (cardsQuery.data?.data) {
      const filteredCards = cardsQuery.data.data.filter((card: any) => {
        const boardName = normalize(card.boardName ?? card.board_name);
        const listName = normalize(card.listName ?? card.list_name);

        return (
          boardName === "dateline" &&
          listName &&
          ALLOWED_LISTS.includes(listName)
        );
      });

      setCards(filteredCards);
    }

  }, [cardsQuery.data]);

  const formatJumlahProduksi = (rawVal: any): string => {
    if (rawVal === null || rawVal === undefined || rawVal === "") return "-";
    const numeric = Number(rawVal);
    if (Number.isFinite(numeric)) {
      return Number.isInteger(numeric) ? `${numeric}` : `${numeric}`;
    }
    return String(rawVal);
  };

  const listPO = useMemo(() => {
    return cards?.map((card: any) => {
      const cardName = card.name || "";
      const safeCardName = cardName || "Tanpa nama";
      const listName = card.listName ?? card.list_name ?? "";
      const rawVal =
        card?.jumlahProduksi ??
        card?.jumlahDikirim ??
        card?.customFields?.find?.((f: any) =>
          (f?.name || "").toString().toLowerCase().includes("jml cutting"),
        )?.valueNumber ??
        null;
      const jmlDikirimValue = formatJumlahProduksi(rawVal);
      const displayLabel = [safeCardName, listName].filter(Boolean).join(" - ");
      const searchText =
        `${safeCardName} ${listName} ${jmlDikirimValue}`.trim();
      return {
        value: card.id,
        label: (
          <Tooltip title={safeCardName}>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, color: "#000", fontSize: "12px" }}>
                {safeCardName}
              </div>
              <div style={{ fontSize: 10, color: "#8c8c8c" }}>
                {(listName || "Tanpa list") +
                  ` · Jml Produksi: ${jmlDikirimValue}`}
              </div>
            </div>
          </Tooltip>
        ),
        displayLabel,
        listName,
        searchText,
      };
    });
  }, [cards]);

  const actionTypes = [
    { value: "NEW_ORDER", label: "New Order" },
    { value: "REJECT", label: "Reject" },
    { value: "KEKURANGAN", label: "Kekurangan" },
    { value: "KESALAHAN", label: "Kesalahan" },
  ];

  const barangList = useMemo(() => {
    return mergeRequestProducts(productsQuery.data ?? [], miniProductsQuery.data ?? [])
      .filter((entry) => {
        if (entry.source === "mini_warehouse" || !shouldRestrictToHikmat) return true;

        const item = entry.product;
        if (!isPOSelected || !item.source.toLowerCase().includes("hikmat")) return false;

        return [item.accurateId, item.id, item.sku, item.barcode].some(
          (id) => id != null && allowedHikmatProductIds.has(String(id)),
        );
      })
      .map((entry) => {
        const product = entry.product;
        const sourceLabel = product.source === "Hikmat" ? "HKI" : product.source;
        const label = entry.source === "mini_warehouse"
          ? `${entry.product.itemName} · ${entry.product.itemCode} (${sourceLabel}, Mini Warehouse)`
          : `${entry.product.name} · ${entry.product.sku} (${sourceLabel})`;
        return {
          value: entry.key,
          label,
          searchText: entry.source === "accurate" ? `${label} ${entry.product.barcode ?? ""}` : label,
          entry,
        };
      });
  }, [productsQuery.data, miniProductsQuery.data, shouldRestrictToHikmat, allowedHikmatProductIds, isPOSelected]);

  // Create user options for Request By dropdown
  const userOptions = useMemo(() => {
    if (!accountListData?.data) return [];

    return accountListData.data.map((item) => ({
      value: item.id,
      label: (
        <div className="flex justify-start items-center gap-3">
          <Avatar
            size={20}
            className="bg-blue-50 text-blue-500 border border-blue-100"
          >
            {item.username?.substring(0, 2)?.toUpperCase()}
          </Avatar>
          <Typography.Text>{item.username}</Typography.Text>
        </div>
      ),
      username: item.username, // Store username for payload
    }));
  }, [accountListData]);

  const [form] = Form.useForm();
  const [formValid, setFormValid] = React.useState<boolean>(false);

  // Monitor form values to determine if the form is valid
  const formValues = Form.useWatch([], form);
  const productKey = Form.useWatch("barang", form);
  const selectedEntry = barangList.find((item) => item.value === productKey)?.entry;
  const miniProduct = selectedEntry?.source === "mini_warehouse" ? selectedEntry.product : undefined;
  const selectedAccurateProduct = selectedEntry?.source === "accurate" ? selectedEntry.product : undefined;
  const isMiniWarehouse = Boolean(miniProduct);

  React.useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setFormValid(true))
      .catch(() => setFormValid(false));
  }, [form, formValues]);

  // Set akun penyesuaian when GL accounts are loaded and we have a selected item
  React.useEffect(() => {
    if (!glaccounts?.d) return;

    const setAccountField = (account: any) => {
      const fullLabel = `${account.name} (${account.source || "Unknown"})`;
      form.setFieldsValue({
        akunPenyesuaian: fullLabel,
      });
      setIsAkunPenyesuaianDisabled(true);
    };

    const trySetAccountById = () => {
      if (!selectedItemGlAccountId) return false;
      const matching = glaccounts.d.find(
        (acc: any) => Number(acc.id) === selectedItemGlAccountId,
      );
      if (matching) {
        setAccountField(matching);
        return true;
      }
      return false;
    };

    if (selectedAccurateProduct) {
      const selectedItem = selectedAccurateProduct;
      const itemSource = selectedItem.source;
      const normalizedSource = (
        itemSource ||
        selectedItemSource ||
        ""
      ).toLowerCase();

      const isMpiSource =
        normalizedSource === "mpi" || normalizedSource.includes("mpi");
      const isKuiSource =
        normalizedSource === "kui" || normalizedSource.includes("kui");

      const mpiCategoryAccount = resolveMpiAdjustmentAccount(
        selectedItem,
        normalizedSource,
        glaccounts.d,
      );
      if (mpiCategoryAccount) {
        setAccountField(mpiCategoryAccount);
        return;
      }

      if (isMpiSource || isKuiSource) {
        const normalizedName = selectedItem.name?.toLowerCase() || "";
        const mpiMapping = findBestMappingByKeywords(normalizedName);

        if (mpiMapping) {
          const matchingAccount = findAccountByName(
            glaccounts.d,
            mpiMapping.accountName,
          );

          if (matchingAccount) {
            setAccountField(matchingAccount);
            return;
          }
        }
      }

      if (trySetAccountById()) {
        return;
      }

      if (selectedItem.itemCategory) {
        const cogsGlAccountId =
          selectedItem.itemCategory.parent?.cogsGlAccountId;

        if (cogsGlAccountId) {
          const matchingGlAccount = glaccounts.d.find(
            (acc: any) => acc.id === cogsGlAccountId,
          );

          if (matchingGlAccount) {
            setAccountField(matchingGlAccount);
            return;
          }
        } else {
          const itemCategoryName =
            selectedItem.itemCategory.name?.toLowerCase();

          let suitableAccount = null;

          if (itemCategoryName) {
            suitableAccount = glaccounts.d.find((acc: any) => {
              const accountName = acc.name.toLowerCase();
              const cleanAccountName = accountName
                .replace("hpp ", "")
                .replace("beban ", "");

              const directMatch = accountName.includes(itemCategoryName);
              const reverseMatch =
                itemCategoryName.includes(cleanAccountName);

              return directMatch || reverseMatch;
            });

            if (!suitableAccount && itemSource === "Hikmat") {
              const hikmatCategoryKeywords = [
                "krah",
                "manset",
                "rib",
                "bahan",
                "kain",
              ];

              const matchingKeyword = hikmatCategoryKeywords.find((keyword) =>
                itemCategoryName.includes(keyword),
              );

              if (matchingKeyword) {
                suitableAccount = glaccounts.d.find((acc: any) => {
                  const accountName = acc.name.toLowerCase();
                  return (
                    accountName.includes(matchingKeyword) ||
                    accountName.includes("penyesuaian " + matchingKeyword) ||
                    accountName.includes(
                      "beban penyesuaian " + matchingKeyword,
                    )
                  );
                });
              }

              if (!suitableAccount) {
                suitableAccount = glaccounts.d.find((acc: any) => {
                  const accountName = acc.name.toLowerCase();
                  return (
                    accountName.includes("hikmat") ||
                    accountName.includes("adjustment hikmat") ||
                    accountName.includes("bahan hikmat")
                  );
                });
              }
            }

            if (!suitableAccount && itemSource) {
              suitableAccount = glaccounts.d.find(
                (acc: any) => acc.source === itemSource,
              );
            }

            if (!suitableAccount && glaccounts.d.length > 0) {
              suitableAccount = glaccounts.d[0];
            }

            if (suitableAccount) {
              setAccountField(suitableAccount);
            }
          }
        }
      }
    }
  }, [
    glaccounts,
    selectedItemSource,
    selectedAccurateProduct,
    form,
    selectedItemGlAccountId,
  ]);

  const filterOption = (
    inputValue: string,
    option?: {
      value: string;
      label: string | React.ReactNode;
      searchText?: string;
      displayLabel?: string;
    },
  ) => {
    if (!option) return false;
    const searchText =
      (option as any)?.searchText ??
      (typeof option.label === "string" ? option.label : "");
    return searchText.toLowerCase().includes(inputValue.toLowerCase());
  };

  const akunPenyesuaianList = useMemo(() => {
    if (!glaccounts || !glaccounts.d) return [];

    return glaccounts.d.map((acc: any) => ({
      value: acc.no,
      label: `${acc.name} (${acc.source || "Unknown"})`,
      account: acc, // Store the full account object for later use
    }));
  }, [glaccounts]);

  const resetJumlahAndUnit = () => {
    form.setFieldsValue({ jumlah: "", unit: undefined });
    setSelectedItemUnit("");
  };

  const handleOk = async () => {
    if (isSubmittingRequest) return;
    if (!selectedCardId) {
      message.warning("Pilih PO terlebih dahulu");
      return;
    }
    let values: any;
    try {
      values = await form.validateFields();
    } catch (validationError) {
      return;
    }

    setIsSubmittingRequest(true);
    try {
      // Find IDs/values from labels for barang, listPO, akunPenyesuaian
      const card = listPO.find(
        (opt: any) =>
          opt.displayLabel === values.listPO ||
          (typeof opt.label === "string" && opt.label === values.listPO),
      );
      const entry = barangList.find((option) => option.value === values.barang)?.entry;
      if (!entry || !miniProductsQuery.data) {
        message.warning("Pilih barang dari daftar.");
        return;
      }
      const selectedProduct = entry.source === "accurate" ? entry.product : undefined;
      const stockProduct = entry.source === "mini_warehouse" ? entry.product : undefined;
      const adjustment = akunPenyesuaianList.find((opt: any) => {
        if (
          typeof opt.label === "string" &&
          typeof values.akunPenyesuaian === "string"
        ) {
          // Extract account name from form value (remove source suffix)
          const formValue = values.akunPenyesuaian.replace(/\s*\([^)]*\)$/, "");
          const optionLabel = opt.label.replace(/\s*\([^)]*\)$/, "");
          return optionLabel === formValue;
        }
        return false;
      });

      const isKUI = (selectedItemSource || "").toLowerCase() === "kui";

      const adjustmentNumber =
        adjustment?.value ??
        (typeof values.akunPenyesuaian === "string"
          ? values.akunPenyesuaian.trim() || null
          : null);

      const finalAdjustmentNo = isKUI ? "5001" : adjustmentNumber;
      const finalAdjustmentName = isKUI
        ? "HPP Benang Knitting"
        : adjustment
          ? adjustment.label
          : adjustmentNumber || null;

      // Debug the matching process
      if (typeof values.akunPenyesuaian === "string") {
        const formValue = values.akunPenyesuaian.replace(/\s*\([^)]*\)$/, "");
        akunPenyesuaianList.forEach((opt: any, index: number) => {
          const optionLabel = opt.label.replace(/\s*\([^)]*\)$/, "");
          const matches = optionLabel === formValue;
        });
      }

      // Find the selected user for received_by
      const selectedUser = userOptions.find(
        (user) => user.value === values.requestBy,
      );

      const normalizeQuantityInput = (raw?: string | number | null) => {
        if (raw === undefined || raw === null) return 0;
        const str = `${raw}`.trim();
        if (!str) return 0;

        if (str.includes(",") && str.includes(".")) {
          return Number(str.replace(/\./g, "").replace(/,/g, "."));
        }
        if (str.includes(",") && !str.includes(".")) {
          return Number(str.replace(/,/g, "."));
        }
        if (str.includes(".") && !str.includes(",")) {
          return Number(str);
        }
        return Number(str.replace(/,/g, ""));
      };

      const sanitizedAmount = normalizeQuantityInput(values.jumlah);

      const payload = {
        card_id: selectedCardId || (card ? card.value : values.listPO),
        request_type: values.actionType,
        requested_item_id: stockProduct?.itemCode ?? selectedProduct?.sku,
        request_amount: sanitizedAmount,
        adjustment_no: stockProduct ? null : finalAdjustmentNo,
        description: values.description,
        stock_source: entry.source,
        item_name: stockProduct?.itemName ?? selectedProduct?.name,
        item_type_name: stockProduct ? "Non Persediaan" : selectedProduct?.itemTypeName,
        accurate_id: stockProduct?.accurateId ?? selectedProduct?.accurateId,
        accurate_db_id: stockProduct?.accurateDbId ?? selectedProduct?.accurateDbId,
        adjustment_name: stockProduct ? null : finalAdjustmentName,
        satuan: selectedItemUnit || "", // Add the selected unit (satuan) to the payload
        source: entry.product.source, // Add the source field to the payload
        type: null,
        received_by: selectedUser ? selectedUser.value : "", // Use UUID for received_by
        received_by_name: selectedUser ? selectedUser.username : "", // Add received_by_name field
        unit_price: !stockProduct && selectedItemUnitPrice
          ? Number(selectedItemUnitPrice)
          : undefined,
      };
      await submitRequest(payload);
      message.success("Request berhasil dibuat.");
      await form.resetFields();
      setSelectedCardId(null);
      onClose();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || "Gagal membuat request.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Reset form when modal is closed
  React.useEffect(() => {
    if (!open) {
      form.resetFields();
      setFormValid(false);
      setIsAkunPenyesuaianDisabled(false);
      setSelectedItemUnit("");
      setAvailableUnits([]);
      setSelectedCardId(null);
      setSelectedActionType("");
      setSelectedItemSource("");
      setSelectedRequestBy("");
      setSelectedItemGlAccountId(null);
      setIsSubmittingRequest(false);
    }
  }, [open]);

  return (
    <Modal
      title="Request"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      footer={null}
      destroyOnHidden
      styles={{
        body: {
          padding: 24,
        },
      }}
    >
      <Form form={form} layout="vertical" onFinish={handleOk}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            padding: 8,
          }}
        >
          <Form.Item
            name="listPO"
            label="LIST PO"
            rules={[{ required: true }]}
            style={{ marginBottom: 16 }}
          >
            <AutoComplete
              options={listPO}
              placeholder="Cari atau pilih PO"
              filterOption={filterOption}
              onSelect={(value, option) => {
                const selectedOption = option as any;
                const displayLabel =
                  selectedOption?.displayLabel ??
                  (typeof selectedOption?.label === "string"
                    ? selectedOption.label
                    : "");
                if (displayLabel) {
                  form.setFieldsValue({ listPO: displayLabel });
                }
                // Save the selected card ID when a card is selected from dropdown
                setSelectedCardId(String(value));
              }}
              onChange={(input) => {
                // Update search value for the cards query
                setCardSearchValue(input);

                const match = listPO.find(
                  (opt: any) => opt.displayLabel === input,
                );
                if (!match) {
                  form.setFieldsValue({ listPO: input });
                  // Clear selected card ID if the input doesn't match any card
                  setSelectedCardId(null);
                  setSelectedActionType("");
                } else {
                  // If input matches a card label, set the card ID
                  setSelectedCardId(String(match.value));
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="actionType"
            label="Action Type"
            rules={[{ required: true }]}
            style={{ marginBottom: 16 }}
          >
            <Select
              placeholder="Pilih Action"
              disabled={!isPOSelected}
              onChange={(value) => setSelectedActionType(value || "")}
            >
              {actionTypes.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="barang"
            label="Barang"
            rules={[{ required: true, message: "Pilih barang dari daftar." }]}
            style={{ marginBottom: 16, gridColumn: "1 / span 2" }}
            extra={miniProduct && (
              `Stok Mini Warehouse tersedia: ${miniProduct.availableQuantity.toLocaleString("id-ID")} ${miniProduct.unitType || "unit"}`
            )}
          >
            <Select
              showSearch
              allowClear
              optionFilterProp="searchText"
              disabled={!isPOSelected}
              loading={miniProductsQuery.isFetching || productsQuery.isFetching}
              options={miniProductsQuery.data ? barangList : []}
              placeholder="Cari nama atau kode barang"
              notFoundContent={miniProductsQuery.isPending || productsQuery.isPending
                ? "Memuat daftar barang..."
                : "Barang tidak ditemukan."}
              onChange={(value) => {
                const entry = barangList.find((option) => option.value === value)?.entry;
                resetJumlahAndUnit();
                form.setFieldValue("akunPenyesuaian", undefined);
                setIsAkunPenyesuaianDisabled(false);
                setSelectedItemSource("");
                setSelectedItemGlAccountId(null);
                setSelectedItemUnitPrice("");
                setAvailableUnits([]);
                if (!entry) return;

                if (entry.source === "mini_warehouse") {
                  const unit = entry.product.unitType || "unit";
                  form.setFieldValue("unit", unit);
                  setAvailableUnits([{ label: unit, value: unit }]);
                  setSelectedItemUnit(unit);
                  return;
                }

                const selectedItem = entry.product;
                setSelectedItemSource(selectedItem.source);
                setSelectedItemGlAccountId(getCogsGlAccountIdFromItem(selectedItem));
                const unitPrice = selectedItem.unitPrice ?? (selectedItem as any).unit_price;
                setSelectedItemUnitPrice(unitPrice == null ? "" : String(unitPrice));
                const unitFields = [
                  "unit1Name",
                  "unit2Name",
                  "unit3Name",
                  "unit4Name",
                  "unit5Name",
                  "unitType",
                ];
                const unitSet = new Set<string>();
                unitFields.forEach((field) => {
                  const value = (selectedItem as any)[field];
                  if (value) {
                    unitSet.add(value);
                  }
                });

                const rawUnitData =
                  (selectedItem as any)?.unit_data ??
                  (selectedItem as any)?.unitData ??
                  null;
                if (rawUnitData) {
                  try {
                    const parsed =
                      typeof rawUnitData === "string"
                        ? JSON.parse(rawUnitData)
                        : rawUnitData;
                    if (Array.isArray(parsed)) {
                      parsed.forEach((unitEntry: any) => {
                        const unitName = unitEntry?.name;
                        if (unitName) {
                          unitSet.add(String(unitName));
                        }
                      });
                    }
                  } catch (err) {
                    // Ignore unit parsing errors and fall back to default unit handling
                  }
                }

                const units = Array.from(unitSet).map((unit) => ({
                  label: unit,
                  value: unit,
                }));
                setAvailableUnits(units);

                const selectedItemUnitType =
                  selectedItem.unitType !== undefined &&
                  selectedItem.unitType !== null
                    ? String(selectedItem.unitType)
                    : "";

                const preferredUnit =
                  (selectedItemUnitType &&
                    units.some(
                      (u) => String(u.value) === selectedItemUnitType,
                    ) &&
                    selectedItemUnitType) ||
                  (units.length > 0 ? String(units[0].value) : "");

                setSelectedItemUnit(preferredUnit);
                form.setFieldsValue({
                  unit: preferredUnit || undefined,
                });
              }}
            />
          </Form.Item>
          {((miniProductsQuery.isError && !miniProductsQuery.data) ||
            (productsQuery.isError && !productsQuery.data)) && (
            <div style={{ gridColumn: "1 / span 2" }}>
              <Typography.Text type="danger">
                {miniProductsQuery.isError && !miniProductsQuery.data
                  ? "Katalog Mini Warehouse belum bisa dimuat."
                  : "Daftar barang Accurate belum bisa dimuat."}
              </Typography.Text>
              <Button type="link" onClick={() => {
                if (miniProductsQuery.isError) void miniProductsQuery.refetch();
                if (productsQuery.isError) void productsQuery.refetch();
              }}>
                Coba lagi
              </Button>
            </div>
          )}
          <Form.Item
            label="Jumlah & Unit"
            style={{ marginBottom: 16, gridColumn: "1 / span 2" }}
            required
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 120px",
                gap: 12,
                width: "100%",
              }}
            >
              <Form.Item
                name="jumlah"
                noStyle
                rules={[
                  {
                    required: true,
                    pattern: /^[\d,]+$/,
                    message: "Masukkan angka yang valid",
                  },
                ]}
              >
                <AutoComplete
                  disabled={!isPOSelected}
                  options={[]}
                  placeholder="Masukkan jumlah"
                  style={{ width: "100%", minWidth: 140 }}
                  onSelect={(value, option) => {
                    form.setFieldsValue({ jumlah: value });
                  }}
                  onChange={(value) => {
                    if (!/^[\d,]*$/.test(value)) {
                      form.setFieldsValue({
                        jumlah: value.replace(/[^\d,]/g, ""),
                      });
                    } else {
                      form.setFieldsValue({ jumlah: value });
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="unit"
                noStyle
                rules={[
                  {
                    required: true,
                    message: "Pilih unit",
                  },
                ]}
              >
                <Select
                  disabled={isMiniWarehouse || !isPOSelected || availableUnits.length === 0}
                  value={selectedItemUnit || undefined}
                  placeholder="Unit"
                  onChange={(value) => setSelectedItemUnit(value)}
                  dropdownMatchSelectWidth={false}
                  allowClear={false}
                >
                  {availableUnits.map((unit) => (
                    <Option key={unit.value} value={unit.value}>
                      {unit.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          </Form.Item>
          {!isMiniWarehouse && <Form.Item
            name="akunPenyesuaian"
            label="Akun Penyesuaian"
            rules={[]}
            style={{ marginBottom: 16, gridColumn: "1 / span 3" }}
          >
            <AutoComplete
              options={akunPenyesuaianList}
              placeholder="Cari atau pilih Akun Penyesuaian"
              filterOption={filterOption}
              disabled={true}
              onSelect={(value, option) => {
                if (typeof option.label === "string") {
                  form.setFieldsValue({ akunPenyesuaian: option.label });
                }
              }}
              onChange={(input) => {
                if (!isAkunPenyesuaianDisabled) {
                  const match = akunPenyesuaianList.find(
                    (opt: any) =>
                      typeof opt.label === "string" && opt.label === input,
                  );
                  if (!match) {
                    form.setFieldsValue({ akunPenyesuaian: input });
                  }
                }
              }}
            />
          </Form.Item>}
          <Form.Item
            name="requestBy"
            label="Request By"
            rules={[{ required: true, message: "Request By is required" }]}
            style={{ marginBottom: 16, gridColumn: "1 / span 3" }}
          >
            <Select
              disabled={!isPOSelected}
              placeholder="Select a User"
              loading={accountListLoading}
              options={userOptions}
              style={{ width: "100%" }}
              showSearch
              filterOption={(input, option) =>
                (option?.username || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={(value) => {
                setSelectedRequestBy(value);
              }}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Description is required" }]}
            style={{ marginBottom: 16, gridColumn: "1 / span 3" }}
          >
            <Input.TextArea
              rows={3}
              placeholder="Tambahkan deskripsi..."
              disabled={!isPOSelected}
            />
          </Form.Item>
        </div>
        <Form.Item style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            disabled={!formValid || isSubmittingRequest || !isPOSelected || !selectedEntry || !miniProductsQuery.data}
            loading={isSubmittingRequest}
          >
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModalRequest;
