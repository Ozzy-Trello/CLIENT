import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChecklistComponent from "./index";

const addItem = jest.fn();
const renameChecklist = jest.fn();
const reorderItem = jest.fn();

let checklists: any[] = [];

jest.mock("lucide-react", () => new Proxy({}, {
  get: () => () => null,
}));

// next/dynamic loads asynchronously; render the wrapped component inline instead.
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) =>
    children({ innerRef: jest.fn(), droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }: any) =>
    children({ innerRef: jest.fn(), draggableProps: {}, dragHandleProps: {} }, {}),
}));

jest.mock("@hooks/checklist", () => ({
  useCardChecklists: () => ({ data: checklists, isLoading: false }),
  useCreateChecklist: () => ({ mutate: jest.fn(), isPending: false }),
  useRenameChecklist: () => ({ mutate: renameChecklist }),
  useDeleteChecklist: () => ({ mutate: jest.fn() }),
  useToggleChecklistItem: () => ({ mutate: jest.fn() }),
  useAddChecklistItem: () => ({ mutateAsync: addItem }),
  useRemoveChecklistItem: () => ({ mutate: jest.fn() }),
  useUpdateChecklistItem: () => ({ mutate: jest.fn() }),
  useMoveChecklistItemBetween: () => ({ mutate: jest.fn() }),
  useReorderChecklistItem: () => ({ mutate: reorderItem }),
}));

describe("ChecklistComponent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addItem.mockResolvedValue({});
    checklists = [
      {
        id: "cl-1",
        card_id: "card-1",
        title: "Checklist",
        data: [
          { label: "first", checked: false },
          { label: "second", checked: false },
        ],
      },
    ];
  });

  const openItemInput = () => {
    fireEvent.click(screen.getByText("Add an item"));
    return screen.getByPlaceholderText("Add an item...");
  };

  it("keeps the item input open after pressing Enter", async () => {
    render(<ChecklistComponent cardId="card-1" />);

    const input = openItemInput();
    fireEvent.change(input, { target: { value: "third" } });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({ newItem: { label: "third", checked: false } })
    );

    const stillOpen = screen.getByPlaceholderText("Add an item...") as HTMLInputElement;
    expect(stillOpen.value).toBe("");
  });

  it("moves an item down and disables the edge buttons", () => {
    render(<ChecklistComponent cardId="card-1" />);

    expect(screen.getByLabelText("Drag first to reorder")).not.toBeNull();
    expect((screen.getByLabelText("Move first up") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Move second down") as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("Move first down"));

    expect(reorderItem).toHaveBeenCalledWith(
      { checklistId: "cl-1", startIndex: 0, endIndex: 1 },
      expect.anything()
    );
  });

  it("renames a checklist", () => {
    render(<ChecklistComponent cardId="card-1" />);

    fireEvent.click(screen.getByLabelText("Rename checklist"));
    const input = screen.getAllByDisplayValue("Checklist")[0];
    fireEvent.change(input, { target: { value: "Agenda" } });
    fireEvent.blur(input);

    expect(renameChecklist).toHaveBeenCalledWith(
      { checklistId: "cl-1", title: "Agenda" },
      expect.anything()
    );
  });

  it("hides mutating controls when read only", () => {
    render(<ChecklistComponent cardId="card-1" readOnly />);

    expect(screen.queryByText("Add an item")).toBeNull();
    expect(screen.queryByLabelText("Move first down")).toBeNull();
    expect(screen.queryByLabelText("Rename checklist")).toBeNull();
    expect(screen.queryByLabelText("Drag first to reorder")).toBeNull();
  });
});
