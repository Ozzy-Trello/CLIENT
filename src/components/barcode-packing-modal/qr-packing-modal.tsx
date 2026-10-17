import React, { useEffect, useRef, useState } from "react";
import { Alert, AutoComplete, Modal, Typography, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  cardDetails,
  getCardByShortId,
  getFinishingPackingCards,
  type FinishingPackingCard,
} from "@api/card";
import { Card } from "@myTypes/card";
import IssueBarcodePackingModal from "./issue-modal";

interface QrPackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

const JML_PESANAN_ID = "7bd961d5-019e-408f-9b40-2be7b8a0e15b";

/** Issue barcode menolak list lain, jadi dropdown pun dibatasi list ini saja. */
const PACKING_LISTS = ["Finishing Packing"];

const getJmlPesanan = (card: Card): number => {
  const field = (card.customFields || []).find(
    (item) => item.id === JML_PESANAN_ID || item.name?.trim().toLowerCase() === "jml pesanan",
  );
  // Respons short-id memipihkan custom field ke {name, value}, tanpa valueNumber.
  const raw = field?.valueNumber ?? field?.value;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : 0;
};

const QrPackingModal: React.FC<QrPackingModalProps> = ({ isOpen, onClose, boardId }) => {
  const [value, setValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCard(null);
    setValue("");
    setDebouncedSearch("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const handler = window.setTimeout(() => setDebouncedSearch(value), 300);
    return () => window.clearTimeout(handler);
  }, [value]);

  const cardsQuery = useQuery({
    queryKey: ["qr-packing-cards", debouncedSearch],
    queryFn: () =>
      getFinishingPackingCards(debouncedSearch.trim() || undefined, 30, PACKING_LISTS),
    enabled: isOpen && !card,
  });

  const options = (cardsQuery.data || []).map((item: FinishingPackingCard) => ({
    value: item.id,
    label: item.shortId ? `#${item.shortId} · ${item.name || item.id}` : item.name || item.id,
  }));

  const loadCard = async (cardId: string) => {
    setLoading(true);
    try {
      const response = await cardDetails(cardId, boardId);
      const found = response.data;
      if (!found) throw new Error("Card tidak ditemukan");
      setCard(found);
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || "Card tidak ditemukan");
    } finally {
      setLoading(false);
    }
  };

  const resolveCard = async () => {
    const scanned = value.trim();
    if (!scanned) return;

    // Hasil scan QR kartu berupa URL (.../qr/<shortId>), bukan ID mentah.
    const urlShortId = scanned.match(/\/qr\/(\d+)/i)?.[1];
    const shortId = urlShortId || (/^\d+$/.test(scanned) ? scanned : null);

    if (!shortId) {
      // Teks bebas berarti user mengetik nama PO; pakai hasil dropdown tunggal.
      const matches = cardsQuery.data || [];
      if (matches.length === 1) {
        await loadCard(matches[0].id);
      } else {
        message.error("Pilih PO dari daftar terlebih dahulu");
      }
      return;
    }

    setLoading(true);
    try {
      const response = await getCardByShortId(Number(shortId));
      const found = response.data;
      if (!found) throw new Error("Card tidak ditemukan");
      setCard(found);
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || "Card tidak ditemukan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        title="QR Packing"
        open={isOpen && !card}
        onCancel={onClose}
        onOk={resolveCard}
        okText="Lanjut"
        confirmLoading={loading}
        width={620}
      >
        <Typography.Text strong>Scan Card ID / cari PO</Typography.Text>
        <AutoComplete
          ref={inputRef}
          value={value}
          onChange={setValue}
          onSelect={loadCard}
          options={options}
          filterOption={false}
          placeholder="Scan Card ID atau ketik nama/ID card..."
          className="mt-2 w-full"
          allowClear
          notFoundContent={
            cardsQuery.isFetching
              ? "Loading..."
              : value.trim()
                ? "PO tidak ditemukan"
                : "Tidak ada card di Finishing Packing"
          }
        />
        <Alert
          className="mt-4"
          type="info"
          showIcon
          message="Hanya card di list Finishing Packing yang dapat diproses."
        />
      </Modal>

      {card && (
        <IssueBarcodePackingModal
          isOpen={isOpen}
          onClose={onClose}
          cardId={card.id}
          cardName={card.name}
          jmlPesanan={getJmlPesanan(card)}
        />
      )}
    </>
  );
};

export default QrPackingModal;
