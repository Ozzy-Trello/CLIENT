import {
  getAllAdjustmentItems,
  getAllItemList,
  submitRequest,
} from "@/app/api/accurate";
import { allCards } from "@/app/api/card";
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
  const queries = useQueries({
    queries: [
      {
        queryKey: ["cards"],
        queryFn: () => allCards(),
      },
      {
        queryKey: ["items"],
        queryFn: () => getAllItemList(),
      },
      {
        queryKey: ["glaccounts"],
        queryFn: () => getAllAdjustmentItems(),
      },
    ],
  });

  useEffect(() => {
    if (queries[0].data?.data) setCards(queries[0].data.data);
    if (queries[1].data?.data) setItems(queries[1].data.data);
    if (queries[2].data?.data) setGlaccounts(queries[2].data.data);
    console.log(queries[2].data, "<< ioni data");
  }, [queries[0].data, queries[1].data, queries[2].data]);

  useEffect(() => {
    if (open) {
      allCards().then((res) => setCards(res.data || []));
    }
  }, [open]);

  const listPO = cards.map((card: any) => ({
    value: card.id,
    label: card.name,
  }));

  const actionTypes = [
    { value: "REJECT", label: "REJECT" },
    { value: "OTHERS", label: "OTHERS" },
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
      console.log(values);
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
        card_id: card ? card.value : values.listPO,
        request_type: values.actionType,
        requested_item_id: item ? item.value : values.barang,
        request_amount: Number(values.jumlah),
        adjustment_no: adjustment ? adjustment.value : values.akunPenyesuaian,
        description: values.description,
        item_name: item ? item.label : values.barang,
        adjustment_name: adjustment ? adjustment.label : values.akunPenyesuaian,
      };
      await submitRequest(payload);
      message.success("Request submitted successfully");
      await form.resetFields();
      onClose();
    } catch (err) {
      message.error("Failed to submit request");
    }
  };

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
                }
              }}
              onChange={(input) => {
                const match = listPO.find(
                  (opt: any) =>
                    typeof opt.label === "string" && opt.label === input
                );
                if (!match) {
                  form.setFieldsValue({ listPO: input });
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
              filterOption={filterOption}
              onSelect={(value, option) => {
                if (
                  typeof value === "string" &&
                  value.startsWith("__header__")
                ) {
                  form.setFieldsValue({ barang: undefined });
                } else if (typeof option.label === "string") {
                  form.setFieldsValue({ barang: option.label });
                }
              }}
              onChange={(input) => {
                const match = barangList.find(
                  (opt: any) =>
                    typeof opt.label === "string" && opt.label === input
                );
                if (!match) {
                  form.setFieldsValue({ barang: input });
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
            <AutoComplete
              options={[]}
              placeholder="Masukkan jumlah"
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
              onSelect={(value, option) => {
                if (typeof option.label === "string") {
                  form.setFieldsValue({ akunPenyesuaian: option.label });
                }
              }}
              onChange={(input) => {
                const match = akunPenyesuaianList.find(
                  (opt: any) =>
                    typeof opt.label === "string" && opt.label === input
                );
                if (!match) {
                  form.setFieldsValue({ akunPenyesuaian: input });
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
          <Button type="primary" htmlType="submit" block>
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModalRequest;
