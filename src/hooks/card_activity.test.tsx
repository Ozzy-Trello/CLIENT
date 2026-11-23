import React from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCardActivity } from "./card_activity";
import { addCardActivity, updateCardActivityComment } from "@api/card_activity";

jest.mock("@api/card_activity", () => ({
  cardAcitivities: jest.fn().mockResolvedValue({ data: [], paginate: { totalData: 0 } }),
  addCardActivity: jest.fn(), updateCardActivityComment: jest.fn(), deleteCardActivityComment: jest.fn(),
}));

describe("comment save promises", () => {
  it.each(["create", "edit"] as const)("reports %s failures to the caller so it can retain the draft", async mode => {
    const error = new Error("offline");
    (addCardActivity as jest.Mock).mockRejectedValue(error);
    (updateCardActivityComment as jest.Mock).mockRejectedValue(error);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => useCardActivity("card"), { wrapper });
    await act(async () => {
      const save = mode === "create"
        ? result.current.addCardActivity({ comment: { text: "Draft" } })
        : result.current.updateComment("activity", "Draft");
      await expect(save).rejects.toThrow("offline");
    });
    unmount();
    client.clear();
  });
});
