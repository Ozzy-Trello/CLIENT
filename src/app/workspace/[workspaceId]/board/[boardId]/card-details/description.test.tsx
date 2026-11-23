import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Description from "./description";
import { useCardDetails } from "@hooks/card-details";
import { uploadFile } from "@api/file";

jest.mock("@api/file", () => ({ uploadFile: jest.fn() }));

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
jest.mock("@components/rich-text-editor", () => ({ __esModule: true, default: ({ initialValue, onChange, onImageUpload }: any) => <div>
  <div>{initialValue}</div>
  <button onClick={() => { void onImageUpload(new File(["image"], "image.png", { type: "image/png" })).then((url: string) => onChange(`<p>Image</p><img src="${url}">`)).catch(() => {}); }}>Insert image</button>
</div> }));
jest.mock("@components/modal-list-card-attachment-images", () => () => null);

const useCardDetailsMock = useCardDetails as jest.Mock;
const card = { id: "card", listId: "list", description: "[has_content]" } as any;

describe("Description", () => {
  beforeEach(() => jest.clearAllMocks());
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

  it("disables save while an inserted image uploads and saves its URL", async () => {
    let finishUpload!: (value: any) => void;
    (uploadFile as jest.Mock).mockReturnValue(new Promise(resolve => { finishUpload = resolve; }));
    const updateCardAsync = jest.fn().mockResolvedValue(undefined);
    useCardDetailsMock.mockReturnValue({ card: { ...card, description: "<p>Real value</p>" }, isDescriptionLoaded: true, updateCardAsync, isUpdating: false, refetch: jest.fn() });
    render(<Description card={card} setSelectedCard={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert image" }));
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("Uploading images...");
    expect(updateCardAsync).not.toHaveBeenCalled();
    await act(async () => finishUpload({ data: { url: "https://files.test/image.png" } }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(updateCardAsync).toHaveBeenCalledWith({ description: '<p>Image</p><img src="https://files.test/image.png">' });
    expect(uploadFile).toHaveBeenCalledWith(expect.any(File), { cardId: card.id, prefix: "card-description" });
  });

  it("uploads existing embedded images before saving an edited description", async () => {
    (uploadFile as jest.Mock).mockResolvedValue({ data: { url: "https://files.test/legacy.png" } });
    const updateCardAsync = jest.fn().mockResolvedValue(undefined);
    useCardDetailsMock.mockReturnValue({ card: { ...card, description: '<p>Before</p><img src="data:image/png;base64,aGVsbG8="><p>After</p>' }, isDescriptionLoaded: true, updateCardAsync, isUpdating: false, refetch: jest.fn() });
    render(<Description card={card} setSelectedCard={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(updateCardAsync).toHaveBeenCalledWith({ description: '<p>Before</p><img src="https://files.test/legacy.png"><p>After</p>' });
  });

  it("keeps the draft open and does not update the card if an embedded image upload fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    (uploadFile as jest.Mock).mockRejectedValue(new Error("offline"));
    const updateCardAsync = jest.fn();
    useCardDetailsMock.mockReturnValue({ card: { ...card, description: '<p>Original</p><img src="data:image/png;base64,aGVsbG8=">' }, isDescriptionLoaded: true, updateCardAsync, isUpdating: false, refetch: jest.fn() });
    render(<Description card={card} setSelectedCard={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(updateCardAsync).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByText('<p>Original</p><img src="data:image/png;base64,aGVsbG8=">')).toBeTruthy();
    consoleError.mockRestore();
  });
});
