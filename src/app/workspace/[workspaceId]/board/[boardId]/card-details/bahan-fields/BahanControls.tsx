import React from "react";
import { Button, Input, Modal, Radio, Select, Typography } from "antd";
import { Check, Pencil } from "lucide-react";
import { BahanControlsProps } from "./types";

const BahanControls: React.FC<BahanControlsProps> = ({
  colors,
  product,
  bahanTab,
  showSyncSuccess,
  isTerloadingEditing,
  terloadingInputValue,
  onTerloadingFocus,
  onTerloadingBlur,
  onTerloadingChange,
  shouldDisableTerloadingInput,
  getEditableInputStyle,
  formatNumericValue,
  formatDisplayValue,
  handleTerloadingButtonClick,
  shouldDisableInputs,
  terpakaiInputValue,
  onTerpakaiFocus,
  onTerpakaiBlur,
  onTerpakaiChange,
  selectedSentBy,
  requestByOptions,
  onSentByChange,
  description,
  onDescriptionChange,
  onDescriptionBlur,
  isSavingDescription,
  zeroLoadingModalOpen,
  closeZeroModal,
  handleConfirmZeroLoading,
  selectedLoadingCardId,
  setSelectedLoadingCardId,
  zeroLoadingCandidates,
  isConfirmingZeroLoading,
}) => {
  return (
    <>
      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label
              className="text-xs font-medium flex items-center gap-1"
              style={{
                color: `rgb(${colors["text-muted"]})`,
              }}
            >
              Terloading ({product.satuan || "unit"})
              {showSyncSuccess && (
                <Check
                  size={14}
                  className="text-emerald-500"
                  aria-label="Nilai sudah tersinkron"
                />
              )}
            </label>
            {product.orderCreated && (
              <button
                type="button"
                onClick={handleTerloadingButtonClick}
                className="flex items-center justify-center w-6 h-6 rounded-full border transition-colors hover:bg-opacity-90"
                title={
                  isTerloadingEditing
                    ? "Kunci kembali nilai terloading"
                    : "Klik untuk mengedit nilai terloading"
                }
                style={{
                  borderColor: `rgb(${colors.border})`,
                  backgroundColor: `rgb(${colors.surface})`,
                  color: `rgb(${colors.text})`,
                  opacity: 1,
                }}
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
          <input
            type="number"
            value={
              isTerloadingEditing
                ? terloadingInputValue ??
                  formatNumericValue(bahanTab.terloading)
                : formatNumericValue(bahanTab.terloading)
            }
            onFocus={onTerloadingFocus}
            onBlur={onTerloadingBlur}
            onChange={onTerloadingChange}
            disabled={shouldDisableTerloadingInput}
            className={`w-full px-3 py-2 rounded-md text-sm ${
              shouldDisableTerloadingInput
                ? "cursor-not-allowed opacity-80"
                : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
            style={getEditableInputStyle(shouldDisableTerloadingInput)}
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Sisa Bahan ({product.satuan || "unit"})
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={formatDisplayValue(bahanTab.sisaBahan)}
            readOnly
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Jml. Produksi (+/-)
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={bahanTab.jmlProduksi}
            readOnly
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-6">
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Est Bahan ({product.satuan || "unit"})
          </label>
          <input
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={formatDisplayValue(bahanTab.estBahan)}
            readOnly
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Bahan Terpakai ({product.satuan || "unit"})
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={
              terpakaiInputValue !== null
                ? terpakaiInputValue
                : formatNumericValue(bahanTab.bahanTerpakai)
            }
            onFocus={onTerpakaiFocus}
            onBlur={onTerpakaiBlur}
            onChange={onTerpakaiChange}
            className={`w-full px-3 py-2 rounded-md text-sm ${
              shouldDisableInputs
                ? "cursor-not-allowed opacity-80"
                : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
            style={getEditableInputStyle(false)}
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{
              color: `rgb(${colors["text-muted"]})`,
            }}
          >
            Efisiensi ({product.satuan || "unit"})
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-md text-sm cursor-not-allowed"
            style={{
              border: `1px solid rgb(${colors.border})`,
              backgroundColor: `rgb(${colors.muted})`,
              color: `rgb(${colors["text-muted"]})`,
            }}
            value={`${formatDisplayValue(
              (bahanTab.estBahan ?? 0) - (bahanTab.bahanTerpakai || 0)
            )} ${product.satuan || "unit"}`}
            readOnly
          />
        </div>
      </div>

      <div className="flex flex-row w-full gap-2 space-2">


      <div className="mb-4 w-1/2">
        <label
          className="block text-xs font-medium mb-1"
          style={{
            color: `rgb(${colors["text-muted"]})`,
          }}
        >
          Dikirim Oleh
        </label>
        <Select
          placeholder="Pilih Pengirim"
          value={selectedSentBy}
          options={requestByOptions}
          style={{ width: "100%" }}
          optionFilterProp="label"
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? "")
              .toString()
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          onChange={(value) => onSentByChange(value ? value.toString() : undefined)}
        />
      </div>

      <div className="mb-6 w-1/2">
        <label
          className="block text-xs font-medium mb-1"
          style={{
            color: `rgb(${colors["text-muted"]})`,
          }}
        >
          Description
        </label>
        <Input
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onBlur={onDescriptionBlur}
          required
          placeholder="Tambahkan catatan untuk request"
        />
      </div>
      </div>


      <Modal
        open={zeroLoadingModalOpen}
        title="Konfirmasi Loading"
        onCancel={closeZeroModal}
        styles={{ body: { padding: "24px" } }}
        footer={[
          <Button key="cancel" onClick={closeZeroModal}>
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={handleConfirmZeroLoading}
            disabled={!selectedLoadingCardId}
            loading={isConfirmingZeroLoading}
          >
            Yes, proceed
          </Button>,
        ]}
      >
        <Typography.Text>
          Terloading masih 0. Pilih kartu yang akan digunakan untuk proses
          loading sebelum melanjutkan.
        </Typography.Text>
        <Radio.Group
          value={selectedLoadingCardId}
          onChange={(e) => setSelectedLoadingCardId(e.target.value)}
          className="w-full"
        >
          <div className="mt-3 flex flex-col gap-3">
            {zeroLoadingCandidates.map((candidate) => (
              <Radio
                key={candidate.id}
                value={candidate.id}
                className="w-full rounded border p-3"
                style={{
                  borderColor: candidate.isCurrent
                    ? "rgb(59 130 246 / 0.4)"
                    : "rgb(209 213 219)",
                }}
              >
                <div className="flex flex-col">
                  <Typography.Text strong>{candidate.title}</Typography.Text>
                  {candidate.description && (
                    <Typography.Text type="secondary" className="text-xs">
                      {candidate.description}
                    </Typography.Text>
                  )}
                </div>
              </Radio>
            ))}
          </div>
        </Radio.Group>
      </Modal>
    </>
  );
};

export default BahanControls;
