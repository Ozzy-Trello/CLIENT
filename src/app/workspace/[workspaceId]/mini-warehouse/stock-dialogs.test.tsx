import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { lookupMiniWarehouseLabel } from "@api/mini-warehouse";
import { StockScanDialog } from "./stock-dialogs";

jest.mock("@api/mini-warehouse", () => ({ lookupMiniWarehouseLabel: jest.fn() }));
jest.mock("@yudiel/react-qr-scanner", () => ({ Scanner: () => null }));

it("opens the matching stock history from a barcode search", async () => {
  const code = "MW-81063F39-3C0F-4D48-AEAD-72E6CF9C9C01";
  jest.mocked(lookupMiniWarehouseLabel).mockResolvedValue({
    code, itemName: "Kain Biru", itemCode: "CCD-05", unitType: "kg",
    quantity: "1.14", availableQuantity: 8.08, balanceId: "balance-id", returnPending: false,
  });
  const onOpenStock = jest.fn();
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <StockScanDialog onOpenStock={onOpenStock} onClose={jest.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByRole("searchbox", { name: "Kode barcode" }), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Cari" }));
  expect(await screen.findByText("Kain Biru")).toBeTruthy();
  expect(screen.getByText("Qty pada label 1,14 kg")).toBeTruthy();
  expect(screen.getByText("Saldo tersedia 8,08 kg")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Lihat riwayat mutasi" }));
  expect(onOpenStock).toHaveBeenCalledWith({ id: "balance-id", itemName: "Kain Biru", unitType: "kg" });
});
