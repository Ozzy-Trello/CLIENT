import {
  getOrderShippingDetails,
  OrderShippingAddress,
  OrderShippingDetails,
  saveOrderShippingAddress,
} from "@api/order-shipping-address";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Collapse, Form, Input, Skeleton, Typography, message } from "antd";
import { MapPin } from "lucide-react";

export const OUTLET_ORDER_BOARD_ID = "577ef9e0-4466-4b4d-aeb7-c285c23c235f";

interface Props {
  boardId: string;
  cardId: string;
  canEdit: boolean;
}

const confirmationLabels = {
  pending: "Menunggu pengiriman WhatsApp",
  sending: "WhatsApp sedang dikirim",
  sent: "WhatsApp diterima Botcake",
  failed: "WhatsApp gagal dikirim",
  uncertain: "Pengiriman WhatsApp perlu diperiksa",
};

const required = [{ required: true, whitespace: true, message: "Wajib diisi." }];
const regions = [
  { name: "village", label: "Kelurahan / desa" },
  { name: "district", label: "Kecamatan" },
  { name: "city", label: "Kabupaten / kota" },
  { name: "province", label: "Provinsi" },
] as const;

function AddressFields({ boardId, cardId, canEdit }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["order-shipping-address", boardId, cardId];
  const addressQuery = useQuery({
    queryKey,
    queryFn: () => getOrderShippingDetails(boardId, cardId),
    refetchInterval: (query) => {
      const status = query.state.data?.confirmationStatus;
      return status === "pending" || status === "sending" ? 15000 : false;
    },
  });
  const [form] = Form.useForm<OrderShippingAddress>();
  const save = useMutation({
    mutationFn: (values: OrderShippingAddress) =>
      saveOrderShippingAddress(boardId, cardId, {
        ...values,
        recipientPhone: values.recipientPhone?.trim() || undefined,
      }),
    onSuccess: (address) => {
      form.setFieldsValue({ ...address, recipientPhone: address.recipientPhone ?? "" });
      queryClient.setQueryData<OrderShippingDetails>(queryKey, (current) =>
        current && { ...current, shippingAddress: address },
      );
      void queryClient.invalidateQueries({ queryKey });
      message.success("Alamat pengiriman disimpan.");
    },
    onError: () => message.error("Alamat belum tersimpan. Periksa nomor HP dan kode pos, lalu coba lagi."),
  });

  if (addressQuery.isPending) return <Skeleton active paragraph={{ rows: 3 }} title={false} />;
  if (!addressQuery.data) {
    return (
      <Alert
        type="error"
        showIcon
        message="Alamat pengiriman gagal dimuat."
        action={<Button size="small" onClick={() => void addressQuery.refetch()}>Coba lagi</Button>}
      />
    );
  }

  const { shippingAddress, confirmationStatus } = addressQuery.data;
  return (
    <>
      {confirmationStatus && (
        <Typography.Text className="mb-3 block" role="status">
          {confirmationLabels[confirmationStatus]}
        </Typography.Text>
      )}
      {canEdit && (
        <Typography.Paragraph>
          Saat kartu masuk Lunas, konfirmasi dikirim ke nomor yang terdaftar untuk kode member di field Customer.
        </Typography.Paragraph>
      )}
      {!canEdit && !shippingAddress ? (
        <Typography.Text>Alamat pengiriman belum diisi.</Typography.Text>
      ) : (
        <Form<OrderShippingAddress>
          form={form}
          layout="vertical"
          disabled={!canEdit || save.isPending}
          initialValues={shippingAddress ?? undefined}
          onFinish={(values) => save.mutate(values)}
        >
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="recipientName" label="Nama penerima" rules={required}>
              <Input maxLength={120} />
            </Form.Item>
            <Form.Item name="recipientPhone" label="No. HP penerima" extra="Isi jika berbeda dari pemesan.">
              <Input type="tel" maxLength={40} />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Alamat lengkap" rules={required}>
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {regions.map(({ name, label }) => (
              <Form.Item key={name} name={name} label={label} rules={required}>
                <Input maxLength={100} />
              </Form.Item>
            ))}
            <Form.Item
              name="postalCode"
              label="Kode pos"
              rules={[{ required: true, pattern: /^\d{5}$/, message: "Masukkan 5 digit kode pos." }]}
            >
              <Input inputMode="numeric" maxLength={5} />
            </Form.Item>
          </div>
          {canEdit && (
            <Button type="primary" htmlType="submit" loading={save.isPending}>
              Simpan alamat
            </Button>
          )}
        </Form>
      )}
    </>
  );
}

export default function OrderShippingAddressSection(props: Props) {
  return (
    <Collapse
      className="mb-4"
      items={[{
        key: "address",
        label: <span className="inline-flex items-center gap-2"><MapPin size={17} aria-hidden /> Alamat pengiriman</span>,
        children: <AddressFields {...props} />,
      }]}
    />
  );
}
