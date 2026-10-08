import React, { useEffect, useRef, useState } from "react";
import { Alert, Input, Modal, Typography, message } from "antd";
import type { InputRef } from "antd";
import { cardDetails, getCardByShortId } from "@api/card";
import { Card } from "@myTypes/card";
import IssueBarcodePackingModal from "./issue-modal";

interface QrPackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

const JML_PESANAN_ID = "7bd961d5-019e-408f-9b40-2be7b8a0e15b";

const getJmlPesanan = (card: Card): number => {
  const field = (card.customFields || []).find(
    (item) => item.id === JML_PESANAN_ID || item.name?.trim().toLowerCase() === "jml pesanan",
  );
  const value = Number(field?.valueNumber);
  return Number.isInteger(value) && value > 0 ? value : 0;
};

const QrPackingModal: React.FC<QrPackingModalProps> = ({ isOpen, onClose, boardId }) => {
  const [value, setValue] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCard(null);
    setValue("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const resolveCard = async () => {
    const scanned = value.trim();
    if (!scanned) return;

    setLoading(true);
    try {
      const response = /^\d+$/.test(scanned)
        ? await getCardByShortId(Number(scanned))
        : await cardDetails(scanned, boardId);
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
        <Input
          ref={inputRef}
          value={value}
          placeholder="Scan Card ID atau ketik nama/ID card..."
          onChange={(event) => setValue(event.target.value)}
          onPressEnter={resolveCard}
          className="mt-2"
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
