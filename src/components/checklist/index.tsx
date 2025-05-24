import React, { useState } from "react";
import { Button, Checkbox, Input, Progress, Typography, Dropdown, Menu, Tooltip, message } from "antd";
import { 
  CheckSquare, 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  User
} from "lucide-react";
import { 
  useCardChecklists, 
  useCreateChecklist, 
  useDeleteChecklist, 
  useToggleChecklistItem, 
  useAddChecklistItem, 
  useRemoveChecklistItem, 
  useUpdateChecklistItem 
} from "@hooks/checklist";
import { ChecklistDTO, ChecklistItem } from "@myTypes/checklist";

const { Title, Text } = Typography;

interface ChecklistComponentProps {
  cardId: string;
}

export const ChecklistComponent: React.FC<ChecklistComponentProps> = ({ cardId }) => {
  const [newChecklistTitle, setNewChecklistTitle] = useState<string>("");
  const [showNewChecklistInput, setShowNewChecklistInput] = useState<boolean>(false);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [showNewItemInputs, setShowNewItemInputs] = useState<Record<string, boolean>>({});
  const [editingItemInfo, setEditingItemInfo] = useState<{
    checklistId: string;
    itemIndex: number;
    text: string;
  } | null>(null);

  // Fetch checklists for this card
  const { data: checklists, isLoading } = useCardChecklists(cardId);
  
  // Mutations
  const createChecklistMutation = useCreateChecklist();
  const deleteChecklistMutation = useDeleteChecklist(cardId);
  const toggleItemMutation = useToggleChecklistItem(cardId);
  const addItemMutation = useAddChecklistItem(cardId);
  const removeItemMutation = useRemoveChecklistItem(cardId);
  const updateItemMutation = useUpdateChecklistItem(cardId);

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

    addItemMutation.mutate({
      checklistId,
      title: checklist.title || "",
      newItem: {
        label: newItemText,
        checked: false
      }
    }, {
      onSuccess: () => {
        // Clear the input
        setNewItemTexts(prev => ({
          ...prev,
          [checklistId]: ""
        }));
        
        // Hide the input
        setShowNewItemInputs(prev => ({
          ...prev,
          [checklistId]: false
        }));
        
        message.success("Item added successfully");
      },
      onError: () => {
        message.error("Failed to add item");
      }
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

  if (isLoading) {
    return <div className="p-4">Loading checklists...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Existing Checklists */}
      {checklists && checklists.map((checklist: ChecklistDTO) => (
        <div key={checklist.id} className="bg-white rounded-md shadow-sm p-4">
          <div className="flex justify-between items-center mb-2">
            <Title level={5} className="m-0">{checklist.title}</Title>
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
                className="flex items-center"
              />
            </Dropdown>
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

          {/* Checklist Items */}
          <div className="space-y-2 mb-4">
            {checklist.data && checklist.data.map((item: ChecklistItem, index: number) => (
              <div key={`${checklist.id}-item-${index}`} className="flex items-start group">
                <Checkbox 
                  checked={item.checked} 
                  onChange={() => handleToggleItem(checklist.id, index)}
                  className="mt-1"
                />
                <div className="flex-grow ml-2">
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
                      className="text-sm"
                    >
                      {item.label}
                    </Text>
                  )}
                  
                  {/* Due date and assignee info if available */}
                  {(item.due_date || item.assignee_name) && (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      {item.due_date && (
                        <span className="flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {new Date(item.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {item.assignee_name && (
                        <span className="flex items-center">
                          <User size={12} className="mr-1" />
                          {item.assignee_name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Item Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div>
            ))}
          </div>

          {/* Add New Item Input */}
          {showNewItemInputs[checklist.id] ? (
            <div className="flex items-center mb-2">
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
                className="ml-2"
              >
                Add
              </Button>
              <Button 
                onClick={() => setShowNewItemInputs(prev => ({
                  ...prev,
                  [checklist.id]: false
                }))}
                className="ml-2"
              >
                Cancel
              </Button>
            </div>
          ) : (
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
          )}
        </div>
      ))}

      {/* Add New Checklist */}
      {showNewChecklistInput ? (
        <div className="bg-white rounded-md shadow-sm p-4">
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
      ) : (
        <Button 
          icon={<CheckSquare size={16} />}
          onClick={() => setShowNewChecklistInput(true)}
          className="flex items-center"
        >
          Add Checklist
        </Button>
      )}
    </div>
  );
};

export default ChecklistComponent;
