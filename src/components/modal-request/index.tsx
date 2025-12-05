import { getAllAdjustmentItems, submitRequest } from "@api/accurate";
import { searchCards } from "@api/card";
import { useQueries } from "@tanstack/react-query";
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
} from "antd";
import React, { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAccountListForModal } from "@hooks/account";
import { getCombinedOzzyProducts } from "@api/ozzy-warehouse";
import type { OzzyProductWithSource } from "@api/ozzy-warehouse";
interface ModalRequestProps {
  open: boolean;
  onClose: () => void;
}

const { Option } = Select;

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
  const [items, setItems] = React.useState<OzzyProductWithSource[]>([]);
  const [glaccounts, setGlaccounts] = React.useState<any>([]);
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(
    null
  );
  const [isAkunPenyesuaianDisabled, setIsAkunPenyesuaianDisabled] =
    React.useState<boolean>(false);
  const [barangSearchValue, setBarangSearchValue] = React.useState<string>("");
  const [cardSearchValue, setCardSearchValue] = React.useState<string>("");
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

  useEffect(() => {
    if (cardsQuery.data?.data) {
      const datelineCards = cardsQuery.data.data.filter((card: any) => {
        const boardName = card.boardName ?? card.board_name;
        return boardName?.toLowerCase() === "dateline".toLowerCase();
      });
      setCards(datelineCards);
    }

    const productItems = productsQuery.data || [];
    setItems(productItems);

    if (glaccountQuery.data?.data) {
      setGlaccounts(glaccountQuery.data.data);
    }
  }, [cardsQuery.data, productsQuery.data, glaccountQuery.data]);

  const listPO = cards?.map((card: any) => ({
    value: card.id,
    label: card.name,
  }));

  const actionTypes = [
    { value: "NEW_ORDER", label: "New Order" },
    { value: "REJECT", label: "Reject" },
    { value: "KEKURANGAN", label: "Kekurangan" },
    { value: "KESALAHAN", label: "Kesalahan" },
  ];

  const barangList = useMemo(() => {
    if (!Array.isArray(items)) return [];

    const searchTerm = barangSearchValue.toLowerCase();
    const filteredItems = searchTerm
      ? items.filter((item) => {
          const matches = [item.name, item.sku, item.barcode, item.source].some(
            (value) => value?.toString().toLowerCase().includes(searchTerm)
          );
          return matches;
        })
      : items;

    return filteredItems.map((item) => ({
      value: item.sku || `${item.id}`,
      label: `${item.name} (${item.source || "Unknown"})`,
      item,
    }));
  }, [items, barangSearchValue]);

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

  React.useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setFormValid(true))
      .catch(() => setFormValid(false));
  }, [formValues]);

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

    if (selectedItemGlAccountId) {
      const matching = glaccounts.d.find(
        (acc: any) => Number(acc.id) === selectedItemGlAccountId
      );
      if (matching) {
        setAccountField(matching);
        return;
      }
    }

    if (selectedItemSource) {
      const selectedBarangValue = form.getFieldValue("barang");
      if (selectedBarangValue) {
        const selectedItem = items.find(
          (item: any) =>
            `${item.name} (${item.source || "Unknown"})` === selectedBarangValue
        );

        if (selectedItem && selectedItem.itemCategory) {
          const cogsGlAccountId =
            selectedItem.itemCategory.parent?.cogsGlAccountId;

          if (cogsGlAccountId) {
            const matchingGlAccount = glaccounts.d.find(
              (acc: any) => acc.id === cogsGlAccountId
            );

            if (matchingGlAccount) {
              setAccountField(matchingGlAccount);
              return;
            }
          } else {
            const itemCategoryName =
              selectedItem.itemCategory.name?.toLowerCase();
            const itemSource = selectedItem.source;

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
                  itemCategoryName.includes(keyword)
                );

                if (matchingKeyword) {
                  suitableAccount = glaccounts.d.find((acc: any) => {
                    const accountName = acc.name.toLowerCase();
                    return (
                      accountName.includes(matchingKeyword) ||
                      accountName.includes("penyesuaian " + matchingKeyword) ||
                      accountName.includes(
                        "beban penyesuaian " + matchingKeyword
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
                  (acc: any) => acc.source === itemSource
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
    }
  }, [
    glaccounts,
    selectedItemSource,
    items,
    form,
    formValues,
    selectedItemGlAccountId,
  ]);

  const filterOption = (
    inputValue: string,
    option?: { value: string; label: string | React.ReactNode }
  ) => {
    if (!option || typeof option.label !== "string") return false;
    return option.label.toLowerCase().includes(inputValue.toLowerCase());
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
    let values: any;
    try {
      values = await form.validateFields();
    } catch (validationError) {
      return;
    }

    setIsSubmittingRequest(true);
    try {
      // Find IDs/values from labels for barang, listPO, akunPenyesuaian
      const card = listPO.find((opt: any) => opt.label === values.listPO);
      const item = barangList.find(
        (opt: any) =>
          typeof opt.label === "string" && opt.label === values.barang
      );
      const selectedProduct = item?.item as OzzyProductWithSource | undefined;
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

      const adjustmentNumber =
        adjustment?.value ??
        (typeof values.akunPenyesuaian === "string"
          ? values.akunPenyesuaian.trim() || null
          : null);

      console.log("🔍 [ADJUSTMENT DEBUG] Selected adjustment:", adjustment);
      console.log(
        "🔍 [ADJUSTMENT DEBUG] All available adjustments:",
        akunPenyesuaianList
      );
      console.log(
        "🔍 [ADJUSTMENT DEBUG] Form value (akunPenyesuaian):",
        values.akunPenyesuaian
      );
      console.log("🔍 [ADJUSTMENT DEBUG] Adjustment found:", !!adjustment);

      // Debug the matching process
      if (typeof values.akunPenyesuaian === "string") {
        const formValue = values.akunPenyesuaian.replace(/\s*\([^)]*\)$/, "");
        console.log("🔍 [ADJUSTMENT DEBUG] Extracted form value:", formValue);
        console.log(
          "🔍 [ADJUSTMENT DEBUG] Available option labels:",
          akunPenyesuaianList.map((opt: any) =>
            opt.label.replace(/\s*\([^)]*\)$/, "")
          )
        );

        // Debug each option to see why matching fails
        console.log("🔍 [ADJUSTMENT DEBUG] Checking each option:");
        akunPenyesuaianList.forEach((opt: any, index: number) => {
          const optionLabel = opt.label.replace(/\s*\([^)]*\)$/, "");
          const matches = optionLabel === formValue;
          console.log(
            `  Option ${index}: "${optionLabel}" === "${formValue}" = ${matches}`
          );
        });
      }

      // Find the selected user for received_by
      const selectedUser = userOptions.find(
        (user) => user.value === values.requestBy
      );

      const requestedItemId = selectedProduct?.sku;

      const normalizeQuantityInput = (raw?: string | number | null) => {
        if (raw === undefined || raw === null) return 0;
        const str = `${raw}`.trim();
        if (!str) return 0;

        if (str.includes(",") && str.includes(".")) {
          // Treat '.' as thousands separator, ',' as decimal marker.
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
        requested_item_id: requestedItemId,
        request_amount: sanitizedAmount,
        adjustment_no: adjustmentNumber,
        description: values.description,
        item_name: selectedProduct?.name || item?.label || values.barang,
        adjustment_name: adjustment ? adjustment.label : adjustmentNumber || null,
        satuan: selectedItemUnit || "", // Add the selected unit (satuan) to the payload
        source: selectedItemSource || "", // Add the source field to the payload
        type: null,
        received_by: selectedUser ? selectedUser.value : "", // Use UUID for received_by
        received_by_name: selectedUser ? selectedUser.username : "", // Add received_by_name field
        unit_price: selectedItemUnitPrice
          ? Number(selectedItemUnitPrice)
          : undefined,
      };

      console.log("🔍 [REQUEST PAYLOAD] Type being sent:", payload.type);
      console.log("🔍 [REQUEST PAYLOAD] Full payload:", payload);
      await submitRequest(payload);
      message.success("Request submitted successfully");
      await form.resetFields();
      setSelectedCardId(null);
      onClose();
    } catch (err) {
      message.error("Failed to submit request");
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
      setBarangSearchValue("");
      setSelectedCardId(null);
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
                if (typeof option.label === "string") {
                  form.setFieldsValue({ listPO: option.label });
                  // Save the selected card ID when a card is selected from dropdown
                  setSelectedCardId(value);
                }
              }}
              onChange={(input) => {
                // Update search value for the cards query
                setCardSearchValue(input);

                const match = listPO.find(
                  (opt: any) =>
                    typeof opt.label === "string" && opt.label === input
                );
                if (!match) {
                  form.setFieldsValue({ listPO: input });
                  // Clear selected card ID if the input doesn't match any card
                  setSelectedCardId(null);
                } else {
                  // If input matches a card label, set the card ID
                  setSelectedCardId(match.value);
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
            <Select placeholder="Pilih Action">
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
            rules={[{ required: true }]}
            style={{ marginBottom: 16, gridColumn: "1 / span 2" }}
          >
            <AutoComplete
              options={barangList}
              placeholder="Cari atau pilih Barang"
              filterOption={false} // Disable client-side filtering as we're using local search
              notFoundContent="No items found"
              onSelect={(value, option) => {
                resetJumlahAndUnit();
                if (
                  typeof value === "string" &&
                  value.startsWith("__header__")
                ) {
                  form.setFieldsValue({ barang: undefined });
                  setIsAkunPenyesuaianDisabled(false);
                } else if (typeof option.label === "string") {
                  form.setFieldsValue({ barang: option.label });

                  // Find the selected item from the items array using the stored item object
                  const selectedItem = option.item;

                  // Set the selected item source to trigger GL accounts fetch
                  if (selectedItem && selectedItem.source) {
                    setSelectedItemSource(selectedItem.source);
                  }

                  // Store available units (include any unitXName fields plus unitType)
                  if (selectedItem) {
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
                        console.warn(
                          "[ModalRequest] Failed to parse unit_data",
                          err
                        );
                      }
                    }

                    const units = Array.from(unitSet).map((unit) => ({
                      label: unit,
                      value: unit,
                    }));
                    setAvailableUnits(units);
                    setSelectedItemUnit("");
                  } else {
                    setAvailableUnits([]);
                    setSelectedItemUnit("");
                  }

                    const unitPrice =
                      (selectedItem as any)?.unitPrice ??
                      (selectedItem as any)?.unit_price;
                    setSelectedItemUnitPrice(
                      unitPrice !== undefined && unitPrice !== null
                        ? String(unitPrice)
                        : ""
                    );

                  // Use COGS GL account from the selected item when provided
                  const cogsGlAccountId =
                    getCogsGlAccountIdFromItem(selectedItem);
                  setSelectedItemGlAccountId(cogsGlAccountId);

                  // GL account selection is now handled by the useEffect
                  // to ensure proper fallback logic for Hikmat items
                }
              }}
              onChange={(input) => {
                // Update the search value state which will trigger local filtering
                setBarangSearchValue(input);
                form.setFieldsValue({ barang: input });
                resetJumlahAndUnit();

                // If input is empty, reset akun penyesuaian field and units
                if (!input) {
                  setIsAkunPenyesuaianDisabled(false);
                  setSelectedItemUnit("");
                  setAvailableUnits([]);
                  setSelectedItemSource("");
                  setSelectedItemGlAccountId(null);
                  setSelectedItemUnitPrice("");
                }
              }}
            />
          </Form.Item>
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
                  value={selectedItemUnit || undefined}
                  placeholder="Unit"
                  disabled={availableUnits.length === 0}
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
          <Form.Item
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
                      typeof opt.label === "string" && opt.label === input
                  );
                  if (!match) {
                    form.setFieldsValue({ akunPenyesuaian: input });
                  }
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="requestBy"
            label="Request By"
            rules={[{ required: true, message: "Request By is required" }]}
            style={{ marginBottom: 16, gridColumn: "1 / span 3" }}
          >
            <Select
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
            <Input.TextArea rows={3} placeholder="Tambahkan deskripsi..." />
          </Form.Item>
        </div>
        <Form.Item style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            disabled={!formValid || isSubmittingRequest}
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
