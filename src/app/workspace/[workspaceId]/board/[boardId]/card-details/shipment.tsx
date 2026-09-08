import { useCardShipment } from "@hooks/card_shipment";
import { CardCustomField } from "@myTypes/card";
import { CustomField, CustomOption } from "@myTypes/custom-field";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { Button, Input, Popconfirm, Select, Spin, message } from "antd";
import { useEffect, useMemo, useState } from "react";

interface ShipmentProps {
  cardId: string;
  workspaceId: string;
  cardCustomFields?: CardCustomField[];
  customFields?: CustomField[];
}

const normalizeOptions = (options: unknown): CustomOption[] => {
  let parsed = options;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((option) => ({
      value: String(option?.value ?? "").trim(),
      label: String(option?.label ?? option?.value ?? "").trim(),
    }))
    .filter((option) => option.value && option.label);
};

const Shipment: React.FC<ShipmentProps> = ({
  cardId,
  workspaceId,
  cardCustomFields,
  customFields,
}) => {
  const { canUpdateCard, canManageCardCustomFields } = useBoardPermissionsContext();
  const {
    shipment,
    isLoading,
    saveShipment,
    deleteShipment,
    isSaving,
    isDeleting,
  } = useCardShipment(cardId, workspaceId);
  const [ekspedisi, setEkspedisi] = useState("");
  const [waybill, setWaybill] = useState("");

  const { ekspedisiField, options } = useMemo(() => {
    const cardField = cardCustomFields?.find(
        (field) => field.name?.trim().toLowerCase() === "ekspedisi",
      );
    const workspaceField = customFields?.find(
        (field) => field.name?.trim().toLowerCase() === "ekspedisi",
      );
    const cardOptions = normalizeOptions(cardField?.options);

    return {
      ekspedisiField: cardField ?? workspaceField,
      options:
        cardOptions.length > 0
          ? cardOptions
          : normalizeOptions(workspaceField?.options),
    };
  }, [cardCustomFields, customFields]);
  const canEdit = canUpdateCard() && canManageCardCustomFields();
  const formDisabled = !canEdit || !ekspedisiField || options.length === 0;

  useEffect(() => {
    setEkspedisi(shipment?.ekspedisi_option_value ?? "");
    setWaybill(shipment?.waybill_id ?? "");
  }, [shipment?.id, shipment?.updated_at]);

  const handleSave = async () => {
    const trimmedWaybill = waybill.trim();
    if (!ekspedisi || !trimmedWaybill) {
      message.warning("Ekspedisi dan Nomor Resi wajib diisi");
      return;
    }

    try {
      await saveShipment({
        waybill_id: trimmedWaybill,
        ekspedisi_option_value: ekspedisi,
      });
      message.success("Pengiriman berhasil disimpan");
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || error?.message || "Gagal menyimpan pengiriman",
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteShipment();
      setEkspedisi("");
      setWaybill("");
      message.success("Pengiriman berhasil dihapus");
    } catch (error: any) {
      message.error(
        error?.response?.data?.message || error?.message || "Gagal menghapus pengiriman",
      );
    }
  };

  if (isLoading) {
    return <Spin size="small" />;
  }

  return (
    <div className="ml-0 md:ml-8 space-y-2">
      {!ekspedisiField || options.length === 0 ? (
        <div className="text-sm text-amber-600">
          Custom Field Ekspedisi belum tersedia atau belum memiliki opsi.
        </div>
      ) : null}
      <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:items-end">
        <div className="w-full md:w-56">
          <div className="mb-1 text-sm font-medium text-gray-700">Ekspedisi</div>
          <Select
            className="w-full"
            options={options}
            value={ekspedisi || undefined}
            onChange={setEkspedisi}
            placeholder="Pilih ekspedisi"
            disabled={formDisabled}
            showSearch
            optionFilterProp="label"
          />
        </div>
        <div className="w-full md:min-w-64 md:flex-1">
          <div className="mb-1 text-sm font-medium text-gray-700">Nomor Resi</div>
          <Input
            value={waybill}
            onChange={(event) => setWaybill(event.target.value)}
            placeholder="Masukkan nomor resi"
            disabled={formDisabled}
            onPressEnter={handleSave}
          />
        </div>
        <Button type="primary" onClick={handleSave} loading={isSaving} disabled={formDisabled}>
          Simpan
        </Button>
        {shipment && canEdit ? (
          <Popconfirm
            title="Hapus data pengiriman?"
            okText="Hapus"
            cancelText="Batal"
            onConfirm={handleDelete}
          >
            <Button danger loading={isDeleting}>Hapus</Button>
          </Popconfirm>
        ) : null}
      </div>
      {shipment ? (
        <div className="text-xs text-gray-500">
          {shipment.courier_code || shipment.courier_service_code
            ? [shipment.courier_code, shipment.courier_service_code]
                .filter(Boolean)
                .join(" / ")
            : "Ekspedisi belum didukung Biteship"}
        </div>
      ) : null}
    </div>
  );
};

export default Shipment;
