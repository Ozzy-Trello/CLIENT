import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { getCardShipment } from "@api/card_shipment";
import { useCardShipment } from "./card_shipment";

jest.mock("@api/card_shipment", () => ({
  getCardShipment: jest.fn(),
  saveCardShipment: jest.fn(),
  deleteCardShipment: jest.fn(),
  getEkspedisiCourierMappings: jest.fn(),
}));

const mockedGetCardShipment = getCardShipment as jest.MockedFunction<
  typeof getCardShipment
>;

// Mirrors the production defaults: without an explicit opt-out these keep a
// reopened modal on whatever the previous session cached.
const makeWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 60 * 1000,
        refetchOnMount: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const shipment = (ekspedisiLabel: string) =>
  ({
    data: {
      id: "shipment-1",
      cardId: "card-1",
      waybillId: null,
      ekspedisiOptionValue: ekspedisiLabel,
      ekspedisiLabel,
      courierCode: "jne",
      courierServiceCode: "reg",
    },
  }) as any;

describe("useCardShipment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refetches on every mount so a reopened modal shows the current courier", async () => {
    mockedGetCardShipment
      .mockResolvedValueOnce(shipment("JNE - REG"))
      .mockResolvedValueOnce(shipment("JnT - Cargo"));
    const wrapper = makeWrapper();

    const first = renderHook(
      () => useCardShipment("card-1", "workspace-1", { enabled: true }),
      { wrapper },
    );
    await waitFor(() =>
      expect(first.result.current.shipment?.ekspedisiLabel).toBe("JNE - REG"),
    );
    first.unmount();

    const second = renderHook(
      () => useCardShipment("card-1", "workspace-1", { enabled: true }),
      { wrapper },
    );

    await waitFor(() =>
      expect(second.result.current.shipment?.ekspedisiLabel).toBe("JnT - Cargo"),
    );
    expect(mockedGetCardShipment).toHaveBeenCalledTimes(2);
  });

  it("stays idle while the modal is closed", () => {
    renderHook(
      () => useCardShipment("card-1", "workspace-1", { enabled: false }),
      { wrapper: makeWrapper() },
    );

    expect(mockedGetCardShipment).not.toHaveBeenCalled();
  });
});
