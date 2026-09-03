import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button, Checkbox, Input, Progress, Typography, Dropdown, Menu, Tooltip, message } from "antd";
import { 
  CheckSquare, 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  User,
  ArrowUp,
  ArrowDown,
  GripVertical
} from "lucide-react";
import { 
  useCardChecklists, 
  useCreateChecklist, 
  useRenameChecklist,
  useDeleteChecklist, 
  useToggleChecklistItem, 
  useAddChecklistItem, 
  useRemoveChecklistItem, 
  useUpdateChecklistItem,
  useMoveChecklistItemBetween,
  useReorderChecklistItem
} from "@hooks/checklist";
import { ChecklistDTO, ChecklistItem } from "@myTypes/checklist";

const { Title, Text } = Typography;

// The drag context touches the DOM on mount, so it must not render on the server.
const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

interface ChecklistComponentProps {
  cardId: string;
  readOnly?: boolean;
}

export const ChecklistComponent: React.FC<ChecklistComponentProps> = ({ cardId, readOnly = false }) => {
  const [newChecklistTitle, setNewChecklistTitle] = useState<string>("");
  const [showNewChecklistInput, setShowNewChecklistInput] = useState<boolean>(false);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [showNewItemInputs, setShowNewItemInputs] = useState<Record<string, boolean>>({});
  const [editingItemInfo, setEditingItemInfo] = useState<{
    checklistId: string;
    itemIndex: number;
    text: string;
  } | null>(null);
  // Serialize add-item writes per checklist: the mutation is read-modify-write,
  // so rapid Enter presses would otherwise overwrite each other.
  const addItemQueues = useRef<Record<string, Promise<unknown>>>({});

  // Fetch checklists for this card
  const { data: checklists, isLoading } = useCardChecklists(cardId);
  
  // Mutations
  const createChecklistMutation = useCreateChecklist();
  const renameChecklistMutation = useRenameChecklist(cardId);
  const deleteChecklistMutation = useDeleteChecklist(cardId);
  const toggleItemMutation = useToggleChecklistItem(cardId);
  const addItemMutation = useAddChecklistItem(cardId);
  const removeItemMutation = useRemoveChecklistItem(cardId);
  const updateItemMutation = useUpdateChecklistItem(cardId);
  const moveItemBetweenMutation = useMoveChecklistItemBetween(cardId);
  const reorderItemMutation = useReorderChecklistItem(cardId);

  // Calculate progress for a checklist
  const calculateProgress = (checklist: ChecklistDTO) => {
    if (!checklist.data || checklist.data.length === 0) return 0;
    
    const completedItems = checklist.data.filter((item: ChecklistItem) => item.checked).length;
    return Math.round((completedItems / checklist.data.length) * 100);
  };

  // Handle creating a new checklist
  const handleCreateChecklist = () => {
    if (!newChecklistTitle.trim()) {
      message.error("Checklist title cannot be empty");
      return;
    }

    createChecklistMutation.mutate({
      card_id: cardId,
      title: newChecklistTitle,
      data: [] // Start with an empty checklist
    }, {
      onSuccess: () => {
        setNewChecklistTitle("");
        setShowNewChecklistInput(false);
        message.success("Checklist created successfully");
      },
      onError: () => {
        message.error("Failed to create checklist");
      }
    });
  };

  // Handle renaming a checklist
  const handleRenameChecklist = (checklist: ChecklistDTO, title: string) => {
    const trimmed = title.trim();

    if (!trimmed) {
      message.error("Checklist title cannot be empty");
      return;
    }

    if (trimmed === checklist.title) {
      return;
    }

    renameChecklistMutation.mutate({
      checklistId: checklist.id,
      title: trimmed
    }, {
      onError: () => {
        message.error("Failed to rename checklist");
      }
    });
  };

  // Handle deleting a checklist
  const handleDeleteChecklist = (checklistId: string) => {
    deleteChecklistMutation.mutate(checklistId, {
      onSuccess: () => {
        message.success("Checklist deleted successfully");
      },
      onError: () => {
        message.error("Failed to delete checklist");
      }
    });
  };

  // Handle toggling a checklist item
  const handleToggleItem = (checklistId: string, itemIndex: number) => {
    toggleItemMutation.mutate({ 
      checklistId, 
      itemIndex 
    }, {
      onError: () => {
        message.error("Failed to update item");
      }
    });
  };

  // Handle adding a new item to a checklist
  const handleAddItem = (checklistId: string) => {
    const newItemText = newItemTexts[checklistId] || "";
    
    if (!newItemText.trim()) {
      message.error("Item text cannot be empty");
      return;
    }

    const checklist = checklists?.find((c: ChecklistDTO) => c.id === checklistId);
    if (!checklist) return;

    // Clear the input immediately so the next item can be typed right away
    setNewItemTexts(prev => ({
      ...prev,
      [checklistId]: ""
    }));

    const previous = addItemQueues.current[checklistId] ?? Promise.resolve();
    addItemQueues.current[checklistId] = previous
      .catch(() => undefined)
      .then(() =>
        addItemMutation.mutateAsync({
          checklistId,
          title: checklist.title || "",
          newItem: {
            label: newItemText,
            checked: false
          }
        })
      )
      .catch(() => {
        setNewItemTexts(prev => ({
          ...prev,
          [checklistId]: prev[checklistId] || newItemText
        }));
        message.error("Failed to add item");
      });
  };

  // Handle removing an item from a checklist
  const handleRemoveItem = (checklistId: string, itemIndex: number) => {
    removeItemMutation.mutate({ 
      checklistId, 
      itemIndex 
    }, {
      onSuccess: () => {
        message.success("Item removed successfully");
      },
      onError: () => {
        message.error("Failed to remove item");
      }
    });
  };

  // Handle updating a checklist item
  const handleUpdateItem = (checklistId: string, itemIndex: number, updatedText: string) => {
    if (!updatedText.trim()) {
      message.error("Item text cannot be empty");
      return;
    }

    const checklist = checklists?.find((c: ChecklistDTO) => c.id === checklistId);
    if (!checklist) return;

    const currentItem = checklist.data[itemIndex];
    if (!currentItem) return;

    updateItemMutation.mutate({
      checklistId,
      itemIndex,
      updatedItem: {
        ...currentItem,
        label: updatedText
      }
    }, {
      onSuccess: () => {
        setEditingItemInfo(null);
        message.success("Item updated successfully");
      },
      onError: () => {
        message.error("Failed to update item");
      }
    });
  };

  // Handle moving an item up or down within its checklist
  const handleMoveItem = (checklistId: string, itemIndex: number, direction: -1 | 1) => {
    const checklist = checklists?.find((c: ChecklistDTO) => c.id === checklistId);
    if (!checklist?.data) return;

    const targetIndex = itemIndex + direction;
    if (targetIndex < 0 || targetIndex >= checklist.data.length) return;

    reorderItemMutation.mutate({
      checklistId,
      startIndex: itemIndex,
      endIndex: targetIndex,
    }, {
      onError: () => {
        message.error("Failed to reorder item");
      },
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (readOnly) return;
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceChecklistId = source.droppableId;
    const destinationChecklistId = destination.droppableId;
    const sourceChecklist = checklists?.find((c: ChecklistDTO) => c.id === sourceChecklistId);

    if (!sourceChecklist || !sourceChecklist.data) {
      return;
    }

    const movedItem = sourceChecklist.data[source.index];
    if (!movedItem) {
      return;
    }

    if (sourceChecklistId === destinationChecklistId) {
      reorderItemMutation.mutate(
        {
          checklistId: sourceChecklistId,
          startIndex: source.index,
          endIndex: destination.index,
        },
        {
          onError: () => {
            message.error("Failed to reorder item");
          },
        }
      );
    } else {
      moveItemBetweenMutation.mutate(
        {
          sourceChecklistId,
          destinationChecklistId,
          sourceIndex: source.index,
          destinationIndex: destination.index,
          item: movedItem,
        },
        {
          onSuccess: () => {
            message.success("Item moved successfully");
          },
          onError: () => {
            message.error("Failed to move item");
          },
        }
      );
    }
  };

  if (isLoading) {
    return <Typography.Text type="secondary">Loading checklists...</Typography.Text>;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="min-w-0 space-y-5">
        {/* Existing Checklists */}
        {checklists && checklists.map((checklist: ChecklistDTO) => (
          <div
            key={checklist.id}
            className="min-w-0 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] p-3 md:p-4"
          >
            <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
              <Title
                level={5}
                className="!m-0 min-w-0 break-words"
                editable={readOnly ? false : {
                  tooltip: "Rename checklist",
                  onChange: (value) => handleRenameChecklist(checklist, value),
                }}
              >
                {checklist.title}
              </Title>
              {!readOnly ? (
                <Dropdown
                  overlay={
                    <Menu>
                      <Menu.Item
                        key="delete"
                        icon={<Trash2 size={16} />}
                        onClick={() => handleDeleteChecklist(checklist.id)}
                      >
                        Delete
                      </Menu.Item>
                    </Menu>
                  }
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    icon={<MoreHorizontal size={16} />}
                    size="small"
                    aria-label={`More actions for ${checklist.title}`}
                    className="flex shrink-0 items-center"
                  />
                </Dropdown>
              ) : null}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <Progress 
                percent={calculateProgress(checklist)} 
                size="small" 
                status={calculateProgress(checklist) === 100 ? "success" : "active"}
                showInfo
              />
            </div>

            {/* Droppable Checklist Items */}
            <Droppable droppableId={checklist.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 mb-4 min-h-[20px] ${snapshot.isDraggingOver ? "bg-blue-50 rounded-md" : ""}`}
                >
                  {checklist.data && checklist.data.map((item: ChecklistItem, index: number) => (
                    <Draggable
                      key={`${checklist.id}-item-${index}`}
                      draggableId={`${checklist.id}-item-${index}`}
                      index={index}
                      isDragDisabled={readOnly}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group flex min-w-0 items-start rounded-md p-1 ${snapshot.isDragging ? "bg-[rgb(var(--color-surface))] shadow-lg" : ""}`}
                        >
                          {!readOnly ? (
                            <span
                              {...provided.dragHandleProps}
                              aria-label={`Drag ${item.label} to reorder`}
                              className="mr-1 mt-1 shrink-0 cursor-grab text-[rgb(var(--color-text-muted))]"
                            >
                              <GripVertical size={16} />
                            </span>
                          ) : null}
                          <Checkbox
                            checked={item.checked}
                            disabled={readOnly}
                            onChange={() => handleToggleItem(checklist.id, index)}
                            className="mt-1 shrink-0"
                          />
                          <div className="ml-2 min-w-0 flex-1">
                            {editingItemInfo && 
                             editingItemInfo.checklistId === checklist.id && 
                             editingItemInfo.itemIndex === index ? (
                              <Input 
                                value={editingItemInfo.text}
                                onChange={(e) => setEditingItemInfo({
                                  ...editingItemInfo,
                                  text: e.target.value
                                })}
                                onPressEnter={() => handleUpdateItem(
                                  checklist.id, 
                                  index, 
                                  editingItemInfo.text
                                )}
                                onBlur={() => handleUpdateItem(
                                  checklist.id, 
                                  index, 
                                  editingItemInfo.text
                                )}
                                autoFocus
                              />
                            ) : (
                              <Text
                                delete={item.checked}
                                className="break-words text-sm"
                              >
                                {item.label}
                              </Text>
                            )}
                            
                            {/* Due date and assignee info if available */}
                            {(item.dueDate || item.due_date || item.assigneeName || item.assignee_name) && (
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--color-text-muted))]">
                                {(item.dueDate || item.due_date) && (
                                  <span className="flex items-center">
                                    <Calendar size={12} className="mr-1" />
                                    {new Date(item.dueDate || item.due_date || "").toLocaleDateString()}
                                  </span>
                                )}
                                {(item.assigneeName || item.assignee_name) && (
                                  <span className="flex items-center">
                                    <User size={12} className="mr-1" />
                                    {item.assigneeName || item.assignee_name}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Item Actions */}
                          {!readOnly ? (
                            <div className="shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                              <Tooltip title="Move up">
                                <Button
                                  type="text"
                                  icon={<ArrowUp size={14} />}
                                  size="small"
                                  disabled={index === 0}
                                  aria-label={`Move ${item.label} up`}
                                  onClick={() => handleMoveItem(checklist.id, index, -1)}
                                  className="mr-1"
                                />
                              </Tooltip>
                              <Tooltip title="Move down">
                                <Button
                                  type="text"
                                  icon={<ArrowDown size={14} />}
                                  size="small"
                                  disabled={index === checklist.data.length - 1}
                                  aria-label={`Move ${item.label} down`}
                                  onClick={() => handleMoveItem(checklist.id, index, 1)}
                                  className="mr-1"
                                />
                              </Tooltip>
                              <Tooltip title="Edit">
                                <Button
                                  type="text"
                                  icon={<Edit size={14} />}
                                  size="small"
                                  onClick={() => setEditingItemInfo({
                                    checklistId: checklist.id,
                                    itemIndex: index,
                                    text: item.label
                                  })}
                                  className="mr-1"
                                />
                              </Tooltip>
                              <Tooltip title="Delete">
                                <Button
                                  type="text"
                                  icon={<Trash2 size={14} />}
                                  size="small"
                                  onClick={() => handleRemoveItem(checklist.id, index)}
                                  danger
                                />
                              </Tooltip>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Add New Item Input */}
            {!readOnly && showNewItemInputs[checklist.id] ? (
              <div className="mb-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <Input 
                  placeholder="Add an item..."
                  value={newItemTexts[checklist.id] || ""}
                  onChange={(e) => setNewItemTexts(prev => ({
                    ...prev,
                    [checklist.id]: e.target.value
                  }))}
                  onPressEnter={() => handleAddItem(checklist.id)}
                  autoFocus
                />
                <Button 
                  type="primary"
                  onClick={() => handleAddItem(checklist.id)}
                  className="sm:ml-2"
                >
                  Add
                </Button>
                <Button 
                  onClick={() => setShowNewItemInputs(prev => ({
                    ...prev,
                    [checklist.id]: false
                  }))}
                  className="sm:ml-2"
                >
                  Cancel
                </Button>
              </div>
            ) : !readOnly ? (
              <Button 
                type="text" 
                icon={<Plus size={14} />}
                onClick={() => setShowNewItemInputs(prev => ({
                  ...prev,
                  [checklist.id]: true
                }))}
                className="text-gray-500 hover:text-gray-700"
              >
                Add an item
              </Button>
            ) : null}
          </div>
        ))}

        {!checklists?.length ? (
          <Typography.Text type="secondary">No checklists yet.</Typography.Text>
        ) : null}

        {/* Add New Checklist */}
        {!readOnly && showNewChecklistInput ? (
          <div className="min-w-0 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] p-3 md:p-4">
            <div className="mb-4">
              <Input 
                placeholder="Checklist title..."
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onPressEnter={handleCreateChecklist}
                autoFocus
              />
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => setShowNewChecklistInput(false)}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button 
                type="primary"
                onClick={handleCreateChecklist}
                loading={createChecklistMutation.isPending}
              >
                Add
              </Button>
            </div>
          </div>
        ) : !readOnly ? (
          <Button 
            icon={<CheckSquare size={16} />}
            onClick={() => setShowNewChecklistInput(true)}
            className="flex items-center"
          >
            Add Checklist
          </Button>
        ) : null}
      </div>
    </DragDropContext>
  );
};

export default ChecklistComponent;
