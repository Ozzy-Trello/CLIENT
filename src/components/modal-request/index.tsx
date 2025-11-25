import {
  getAllAdjustmentItems,
  getAllItemList,
  submitRequest,
} from "@api/accurate";
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
interface ModalRequestProps {
  open: boolean;
  onClose: () => void;
}

const { Option } = Select;

const ModalRequest: React.FC<ModalRequestProps> = ({ open, onClose }) => {
  const { workspaceId, boardId } = useParams();
  const [cards, setCards] = React.useState<any>([]);
  const [items, setItems] = React.useState<any>([]);
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
  const [selectedRequestBy, setSelectedRequestBy] = React.useState<string>("");

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
        queryKey: ["items"],
        queryFn: () => getAllItemList(),
        enabled: open, // Only run when modal is open
      },
      {
        queryKey: ["glaccounts", selectedItemSource],
        queryFn: () => getAllAdjustmentItems(selectedItemSource),
        enabled: open && !!selectedItemSource, // Only run when modal is open and source is selected
      },
    ],
  });

  useEffect(() => {
    if (queries[0].data?.data) setCards(queries[0].data.data);
    if (queries[1].data?.data) {
      const itemsData = queries[1].data.data;
      setItems(itemsData);
    }
    if (queries[2].data?.data) {
      setGlaccounts(queries[2].data.data);
    }
  }, [queries[0].data, queries[1].data, queries[2].data]);

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
    if (!items || !Array.isArray(items)) return [];

    // Filter items based on search value
    const filteredItems = barangSearchValue
      ? items.filter(
          (item: any) =>
            item.name.toLowerCase().includes(barangSearchValue.toLowerCase()) ||
            item.no.toLowerCase().includes(barangSearchValue.toLowerCase()) ||
            (item.source &&
              item.source
                .toLowerCase()
                .includes(barangSearchValue.toLowerCase()))
        )
      : items;

    // Map to AutoComplete options
    return filteredItems.map((item: any) => ({
      value: item.no,
      label: `${item.name} (${item.source || "Unknown"})`,
      item: item, // Store the full item object for later use
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
    if (glaccounts && glaccounts.d && selectedItemSource) {
      // Find the currently selected item from the form
      const selectedBarangValue = form.getFieldValue("barang");

      if (selectedBarangValue) {
        // Find the selected item from the items array
        const selectedItem = items.find(
          (item: any) =>
            `${item.name} (${item.source || "Unknown"})` === selectedBarangValue
        );

        if (selectedItem && selectedItem.itemCategory) {
          // Get the COGS GL account from the item's category
          const cogsGlAccountId =
            selectedItem.itemCategory.parent?.cogsGlAccountId;

          if (cogsGlAccountId) {
            // Find the matching GL account
            const matchingGlAccount = glaccounts.d.find(
              (acc: any) => acc.id === cogsGlAccountId
            );

            if (matchingGlAccount) {
              const fullLabel = `${matchingGlAccount.name} (${
                matchingGlAccount.source || "Unknown"
              })`;
              // Set the akun penyesuaian field value with proper display label
              form.setFieldsValue({
                akunPenyesuaian: fullLabel,
              });
              setIsAkunPenyesuaianDisabled(true);
            }
          } else {
            // Enhanced fallback logic for GL account selection
            const itemCategoryName =
              selectedItem.itemCategory.name?.toLowerCase();
            const itemSource = selectedItem.source;

            let suitableAccount = null;

            if (itemCategoryName) {
              // First, try to find a GL account that matches the item category
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

              // If no match found and this is a Hikmat item, try Hikmat-specific matching
              if (!suitableAccount && itemSource === "Hikmat") {
                // Define Hikmat category keywords
                const hikmatCategoryKeywords = [
                  "krah",
                  "manset",
                  "rib",
                  "bahan",
                  "kain",
                ];

                // Check if item category contains any Hikmat-specific keywords
                const matchingKeyword = hikmatCategoryKeywords.find((keyword) =>
                  itemCategoryName.includes(keyword)
                );

                if (matchingKeyword) {
                  // Try to find GL account with matching keyword
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

                // If still no match, try broader Hikmat-specific accounts
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

              // General fallback: Use the first available account from the same source
              if (!suitableAccount && itemSource) {
                suitableAccount = glaccounts.d.find(
                  (acc: any) => acc.source === itemSource
                );
              }

              // Last resort: Use the first available account
              if (!suitableAccount && glaccounts.d.length > 0) {
                suitableAccount = glaccounts.d[0];
              }

              if (suitableAccount) {
                const fullLabel = `${suitableAccount.name} (${
                  suitableAccount.source || "Unknown"
                })`;
                form.setFieldsValue({
                  akunPenyesuaian: fullLabel,
                });
                setIsAkunPenyesuaianDisabled(true);
              }
            }
          }
        }
      }
    }
  }, [glaccounts, selectedItemSource, items, form, formValues]);

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

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // Find IDs/values from labels for barang, listPO, akunPenyesuaian
      const card = listPO.find((opt: any) => opt.label === values.listPO);
      const item = barangList.find(
        (opt: any) =>
          typeof opt.label === "string" && opt.label === values.barang
      );
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

      const payload = {
        card_id: selectedCardId || (card ? card.value : values.listPO),
        request_type: values.actionType,
        requested_item_id: item ? item.value : values.barang,
        request_amount: Number(values.jumlah),
        adjustment_no: adjustment ? adjustment.value : values.akunPenyesuaian,
        description: values.description,
        item_name: item ? item.label : values.barang,
        adjustment_name: adjustment ? adjustment.label : values.akunPenyesuaian,
        satuan: selectedItemUnit || "", // Add the selected unit (satuan) to the payload
        source: selectedItemSource || "", // Add the source field to the payload
        type: item ? item.item?.itemTypeName || null : null, // Add the itemTypeName as type
        received_by: selectedUser ? selectedUser.value : "", // Use UUID for received_by
        received_by_name: selectedUser ? selectedUser.username : "", // Add received_by_name field
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
            style={{ marginBottom: 16 }}
          >
            <AutoComplete
              options={barangList}
              placeholder="Cari atau pilih Barang"
              filterOption={false} // Disable client-side filtering as we're using local search
              notFoundContent="No items found"
              onSelect={(value, option) => {
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

                  // Store available units
                  if (selectedItem) {
                    const units = [];
                    if (selectedItem.unit1Name)
                      units.push({
                        label: selectedItem.unit1Name,
                        value: selectedItem.unit1Name,
                      });
                    if (selectedItem.unit2Name)
                      units.push({
                        label: selectedItem.unit2Name,
                        value: selectedItem.unit2Name,
                      });
                    if (selectedItem.unit3Name)
                      units.push({
                        label: selectedItem.unit3Name,
                        value: selectedItem.unit3Name,
                      });
                    if (selectedItem.unit4Name)
                      units.push({
                        label: selectedItem.unit4Name,
                        value: selectedItem.unit4Name,
                      });
                    if (selectedItem.unit5Name)
                      units.push({
                        label: selectedItem.unit5Name,
                        value: selectedItem.unit5Name,
                      });

                    setAvailableUnits(units);

                    // Set default unit if available
                    if (units.length > 0) {
                      setSelectedItemUnit(units[0].value);
                    } else {
                      setSelectedItemUnit("");
                    }
                  } else {
                    setAvailableUnits([]);
                    setSelectedItemUnit("");
                  }

                  // GL account selection is now handled by the useEffect
                  // to ensure proper fallback logic for Hikmat items
                }
              }}
              onChange={(input) => {
                // Update the search value state which will trigger local filtering
                setBarangSearchValue(input);
                form.setFieldsValue({ barang: input });

                // If input is empty, reset akun penyesuaian field and units
                if (!input) {
                  setIsAkunPenyesuaianDisabled(false);
                  setSelectedItemUnit("");
                  setAvailableUnits([]);
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="jumlah"
            label="Jumlah"
            rules={[
              {
                required: true,
                pattern: /^\d+$/,
                message: "Masukkan angka yang valid",
              },
            ]}
            style={{ marginBottom: 16 }}
          >
            <div className="flex w-full">
              <AutoComplete
                options={[]}
                placeholder="Masukkan jumlah"
                style={{ width: "100%" }}
                onSelect={(value, option) => {
                  form.setFieldsValue({ jumlah: value });
                }}
                onChange={(value) => {
                  if (!/^\d*$/.test(value)) {
                    form.setFieldsValue({ jumlah: value.replace(/\D/g, "") });
                  } else {
                    form.setFieldsValue({ jumlah: value });
                  }
                }}
              />
              {availableUnits.length > 0 && (
                <Select
                  value={selectedItemUnit}
                  style={{ width: 80, marginLeft: 8 }}
                  onChange={(value) => setSelectedItemUnit(value)}
                  dropdownMatchSelectWidth={false}
                >
                  {availableUnits.map((unit) => (
                    <Option key={unit.value} value={unit.value}>
                      {unit.label}
                    </Option>
                  ))}
                </Select>
              )}
            </div>
          </Form.Item>
          <Form.Item
            name="akunPenyesuaian"
            label="Akun Penyesuaian"
            rules={[{ required: true }]}
            style={{ marginBottom: 16, gridColumn: "1 / span 2" }}
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
            style={{ marginBottom: 16, gridColumn: "1 / span 2" }}
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
            style={{ marginBottom: 16, gridColumn: "1 / span 2" }}
          >
            <Input.TextArea rows={3} placeholder="Tambahkan deskripsi..." />
          </Form.Item>
        </div>
        <Form.Item style={{ marginTop: 16 }}>
          <Button type="primary" htmlType="submit" block disabled={!formValid}>
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModalRequest;
