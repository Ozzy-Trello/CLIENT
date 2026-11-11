import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import IssueBarcodePackingModal from "./issue-modal";

jest.mock("@api/barcode-packing", () => ({
  deleteBarcodePacking: jest.fn(),
  getBarcodePacking: jest.fn().mockResolvedValue({ data: [] }),
  issueBarcodePacking: jest.fn(),
  printBarcodePacking: jest.fn(),
  updateBarcodePacking: jest.fn(),
}));

jest.mock("@api/card", () => ({ addCardLabel: jest.fn(), getCardLabels: jest.fn() }));
jest.mock("@api/label", () => ({ getAllLabels: jest.fn() }));

jest.mock("antd", () => {
  const ActualReact = jest.requireActual("react");
  const MockInputNumber = ActualReact.forwardRef((props: any, ref: any) => (
    <input
      ref={ref}
      aria-label={props["aria-label"]}
      type="number"
      value={props.value ?? ""}
      disabled={props.disabled}
      onChange={(event) => props.onChange?.(event.target.value === "" ? null : Number(event.target.value))}
      onKeyDown={props.onKeyDown}
    />
  ));
  return {
    Alert: () => null,
    Button: ({ children, onClick, disabled }: any) => <button disabled={disabled} onClick={onClick}>{children}</button>,
    InputNumber: MockInputNumber,
    Modal: ({ open, title, children, footer }: any) => open ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null,
    Popconfirm: ({ children }: any) => children,
    Table: () => null,
    message: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
  };
});

describe("IssueBarcodePackingModal pack input navigation", () => {
  it("moves focus to the next pack input when Tab is pressed", async () => {
    render(<IssueBarcodePackingModal isOpen cardId="card-1" workspaceId="workspace-1" jmlPesanan={60} onClose={jest.fn()} />);

    const packCount = await screen.findByRole("spinbutton", { name: "Jumlah pack" });
    fireEvent.change(packCount, { target: { value: "3" } });

    const firstPack = screen.getByRole("spinbutton", { name: "Jumlah PCS pack 1" });
    const secondPack = screen.getByRole("spinbutton", { name: "Jumlah PCS pack 2" });

    fireEvent.keyDown(packCount, { key: "Tab" });
    expect(document.activeElement).toBe(firstPack);
    fireEvent.keyDown(firstPack, { key: "Tab" });
    expect(document.activeElement).toBe(secondPack);
  });
});
