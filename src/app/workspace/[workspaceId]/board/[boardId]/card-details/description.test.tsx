import { act, fireEvent, render, screen } from "@testing-library/react";
import Description from "./description";
import { useCardDetails } from "@hooks/card-details";

jest.mock("@hooks/card-details", () => ({
  useCardDetails: jest.fn(),
}));
jest.mock("lucide-react", () => ({ AlignLeft: () => null, Edit: () => null, Loader2: () => null }));
jest.mock("next/navigation", () => ({ useParams: () => ({ boardId: "board", workspaceId: "workspace" }) }));
jest.mock("react-redux", () => ({ useSelector: (selector: (state: any) => any) => selector({ app: { theme: { colors: {} }, isDarkMode: false } }) }));
jest.mock("@store/app_slice", () => ({
  selectTheme: () => ({ colors: { "text-muted": "0,0,0", surface: "255,255,255", border: "0,0,0", muted: "240,240,240", text: "0,0,0" } }),
  selectIsDarkMode: () => false,
}));
jest.mock("@providers/board-permissions-context", () => ({ useBoardPermissionsContext: () => ({ canUpdateCard: () => true }) }));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
jest.mock("@utils/query-invalidation", () => ({ invalidateCardContext: jest.fn() }));
jest.mock("@components/rich-text-editor", () => ({ __esModule: true, default: ({ initialValue }: { initialValue: string }) => <div>{initialValue}</div> }));
jest.mock("@components/modal-list-card-attachment-images", () => () => null);

const useCardDetailsMock = useCardDetails as jest.Mock;
const card = { id: "card", listId: "list", description: "[has_content]" } as any;

describe("Description", () => {
  it("does not expose placeholder content or allow editing until detail data loads", () => {
    useCardDetailsMock.mockReturnValue({ card, isDescriptionLoaded: false, updateCardAsync: jest.fn(), isUpdating: false, refetch: jest.fn() });
    render(<Description card={card} setSelectedCard={jest.fn()} />);
    expect(screen.queryByText("[has_content]")).toBeNull();
    expect((screen.getByRole("button", { name: "Edit" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText("Loading description")).toBeTruthy();
  });

  it("shows real detail content and saves that value", async () => {
    const updateCardAsync = jest.fn().mockResolvedValue(undefined);
    useCardDetailsMock.mockReturnValue({ card: { ...card, description: "<p>Real value</p>" }, isDescriptionLoaded: true, updateCardAsync, isUpdating: false, refetch: jest.fn() });
    render(<Description card={card} setSelectedCard={jest.fn()} />);
    expect(screen.getByText("Real value")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(updateCardAsync).toHaveBeenCalledWith({ description: "<p>Real value</p>" });
  });
});
