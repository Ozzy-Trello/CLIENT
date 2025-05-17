import {
  getAllAdjustmentItems,
  getAllItemList,
  submitRequest,
} from "@/app/api/accurate";
import { searchCards } from "@/app/api/card";
import { useQueries } from "@tanstack/react-query";
import {
  AutoComplete,
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
} from "antd";
import React, { useEffect, useMemo } from "react";
interface ModalRequestProps {
  open: boolean;
  onClose: () => void;
}

const { Option } = Select;

const ModalRequest: React.FC<ModalRequestProps> = ({ open, onClose }) => {
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
  const [isSearchingBarang, setIsSearchingBarang] =
    React.useState<boolean>(false);
  const [selectedItemUnit, setSelectedItemUnit] = React.useState<string>("");
  const [availableUnits, setAvailableUnits] = React.useState<
    { label: string; value: string }[]
  >([]);
  const queries = useQueries({
    queries: [
      {
        queryKey: ["cards", cardSearchValue],
        queryFn: () => searchCards({ name: cardSearchValue }),
        enabled: open, // Only run when modal is open
      },
      {
        queryKey: ["items", barangSearchValue],
        queryFn: () => getAllItemList(barangSearchValue),
        enabled: open && (barangSearchValue !== "" || barangSearchValue === ""), // Always run when modal is open
      },
      {
        queryKey: ["glaccounts"],
        queryFn: () => getAllAdjustmentItems(),
        enabled: open, // Only run when modal is open
      },
    ],
  });

  useEffect(() => {
    if (queries[0].data?.data) setCards(queries[0].data.data);
    if (queries[1].data?.data) {
      setItems(queries[1].data.data);
      setIsSearchingBarang(false);
    }
    if (queries[2].data?.data) setGlaccounts(queries[2].data.data);
  }, [queries[0].data, queries[1].data, queries[2].data]);

  // Handle barang search loading state
  useEffect(() => {
    if (queries[1].isLoading) {
      setIsSearchingBarang(true);
    }
  }, [queries[1].isLoading]);

  // This effect is no longer needed as we're using React Query with enabled: open
  // useEffect(() => {
  //   if (open) {
  //     searchCards({}).then((res) => setCards(res.data || []));
  //   }
  // }, [open]);

  const listPO = cards.map((card: any) => ({
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
    // Flatten to AntD AutoComplete grouped options
    return items.map((item: any) => ({
      value: item.no,
      label: item.name,
    }));
    // return items.flatMap((cat: any) => {
    //   const hasChildren =
    //     Array.isArray(cat.children) && cat.children.length > 0;
    //   const childrenOptions = hasChildren
    //     ? cat.children.map((child: any) => ({
    //         value: child.id,
    //         label: child.name,
    //         key: `child-${child.id}`,
    //       }))
    //     : [
    //         {
    //           value: cat.id,
    //           label: cat.name,
    //           key: `child-${cat.id}`,
    //         },
    //       ];
    //   return [
    //     // Header (not selectable)
    //     {
    //       value: `__header__${cat.id}`,
    //       label: (
    //         <div
    //           style={{ fontWeight: 600, color: "#888", pointerEvents: "none" }}
    //         >
    //           {cat.name}
    //         </div>
    //       ),
    //       disabled: true,
    //       key: `header-${cat.id}`,
    //     },
    //     ...childrenOptions,
    //   ];
    // });
  }, [items]);

  const akunPenyesuaianList = useMemo(() => {
    if (!glaccounts || !glaccounts.d) return [];
    return glaccounts.d.map((acc: any) => ({
      value: acc.no,
      label: acc.name,
    }));
  }, [glaccounts]);

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

  const filterOption = (
    inputValue: string,
    option?: { value: string; label: string | React.ReactNode }
  ) => {
    if (!option || typeof option.label !== "string") return false;
    return option.label.toLowerCase().includes(inputValue.toLowerCase());
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // Find IDs/values from labels for barang, listPO, akunPenyesuaian
      const card = listPO.find((opt: any) => opt.label === values.listPO);
      const item = barangList.find(
        (opt: any) =>
          typeof opt.label === "string" && opt.label === values.barang
      );
      const adjustment = akunPenyesuaianList.find(
        (opt: any) =>
          typeof opt.label === "string" && opt.label === values.akunPenyesuaian
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
      };

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
    }
  }, [open]);

  return (
    <Modal
      title="Request"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      footer={null}
      destroyOnClose
      bodyStyle={{ padding: 24 }}
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
              filterOption={false} // Disable client-side filtering as we're using server-side search
              notFoundContent={
                isSearchingBarang ? "Searching..." : "No items found"
              }
              onSelect={(value, option) => {
                if (
                  typeof value === "string" &&
                  value.startsWith("__header__")
                ) {
                  form.setFieldsValue({ barang: undefined });
                  setIsAkunPenyesuaianDisabled(false);
                } else if (typeof option.label === "string") {
                  form.setFieldsValue({ barang: option.label });

                  // Find the selected item from the items array
                  const selectedItem = items.find(
                    (item: any) => item.name === option.label
                  );

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

                    console.log("units", units);

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

                  if (selectedItem && selectedItem.itemCategory) {
                    // Get the inventory GL account from the item's category
                    const cogsGlAccountId =
                      selectedItem.itemCategory.parent?.cogsGlAccountId;

                    if (cogsGlAccountId && glaccounts && glaccounts.d) {
                      // Find the matching GL account
                      const matchingGlAccount = glaccounts.d.find(
                        (acc: any) => acc.id === cogsGlAccountId
                      );

                      if (matchingGlAccount) {
                        // Set the akun penyesuaian field value
                        form.setFieldsValue({
                          akunPenyesuaian: matchingGlAccount.name,
                        });
                        setIsAkunPenyesuaianDisabled(true);
                      }
                    }
                  }
                }
              }}
              onChange={(input) => {
                // Update the search value state which will trigger the query
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
