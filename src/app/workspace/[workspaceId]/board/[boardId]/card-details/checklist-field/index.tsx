import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  Popover,
  Progress,
  Typography,
  Tag,
} from "antd";
import { CheckSquare, Trash2, Clock, User, X } from "lucide-react";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useCardChecklists, useDeleteChecklist } from "@hooks/checklist";
import { updateChecklist } from "@api/checklist";
import { ChecklistDTO, ChecklistItem } from "@myTypes/checklist";
import { useAccountList } from "@hooks/account";
import dayjs from "dayjs";
import { useParams } from "next/navigation";

const { Title } = Typography;

const ChecklistFields: React.FC = () => {
  const { selectedCard } = useCardDetailContext();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const boardId = params.boardId as string;

  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [hideCheckedItems, setHideCheckedItems] = useState<
    Record<string, boolean>
  >({});
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [userSearchText, setUserSearchText] = useState<string>("");

  // Get user list for assignment
  const { data: accountsData } = useAccountList({
    workspaceId,
    boardId,
  });

  // Filter users based on search text
  const filteredUsers =
    accountsData?.data?.filter(
      (account) =>
        account.username.toLowerCase().includes(userSearchText.toLowerCase()) ||
        account.email.toLowerCase().includes(userSearchText.toLowerCase())
    ) || [];

  // Function to determine due date color
  const getDueDateColor = (dueDate: string | undefined, isChecked: boolean) => {
    if (!dueDate || isChecked) return "";

    const today = dayjs();
    const due = dayjs(dueDate);
    const isToday = due.format("YYYY-MM-DD") === today.format("YYYY-MM-DD");

    if (due.isBefore(today, "day")) {
      return "text-red-500"; // Past due
    } else if (isToday) {
      return "text-yellow-500"; // Due today
    } else {
      return "text-green-500"; // Future due date
    }
  };

  // Fetch checklists for this card
  const {
    data: checklists = [],
    isLoading,
    refetch,
  } = useCardChecklists(selectedCard?.id || "");

  // Debug checklist data
  useEffect(() => {
    if (checklists.length > 0) {
      console.log("Checklist data:", JSON.stringify(checklists, null, 2));
    }
  }, [checklists]);

  // Mutations
  const deleteChecklistMutation = useDeleteChecklist(selectedCard?.id || "");

  // Calculate progress for a checklist
  const calculateProgress = (checklist: ChecklistDTO) => {
    if (!checklist.data || checklist.data.length === 0) return 0;

    const completedItems = checklist.data.filter((item) => item.checked).length;
    return Math.round((completedItems / checklist.data.length) * 100);
  };

  // Toggle item checked status
  const toggleItem = (checklist: ChecklistDTO, itemIndex: number) => {
    const updatedData = [...checklist.data];
    updatedData[itemIndex] = {
      ...updatedData[itemIndex],
      checked: !updatedData[itemIndex].checked,
    };

    updateChecklist(checklist.id, {
      title: checklist.title,
      data: updatedData,
    }).then(() => {
      refetch(); // Refetch after update
    });
  };

  // Add a new item to a checklist
  const addItem = (checklist: ChecklistDTO) => {
    const itemText = newItems[checklist.id] || "";
    if (!itemText.trim()) return;

    const updatedData = [
      ...checklist.data,
      { label: itemText, checked: false },
    ];

    updateChecklist(checklist.id, {
      title: checklist.title,
      data: updatedData,
    }).then(() => {
      // Clear input and refetch
      setNewItems({ ...newItems, [checklist.id]: "" });
      refetch();
    });
  };

  // Delete an item from checklist
  const deleteItem = (checklist: ChecklistDTO, itemIndex: number) => {
    const updatedData = checklist.data.filter(
      (_, index) => index !== itemIndex
    );

    updateChecklist(checklist.id, {
      title: checklist.title,
      data: updatedData,
    }).then(() => {
      refetch(); // Refetch after update
    });
  };

  // Delete checklist
  const deleteChecklist = (checklistId: string) => {
    deleteChecklistMutation.mutate(checklistId, {
      onSuccess: () => {
        refetch(); // Refetch after deletion
      },
    });
  };

  if (!selectedCard) return null;

  // Don't render if there are no checklists
  if (checklists.length === 0) return null;

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-gray-700" />
          <span className="text-[18px] font-semibold text-gray-900">
            Checklists
          </span>
        </div>
      </div>

      {/* Checklists */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-4">Loading checklists...</div>
        ) : (
          checklists.map((checklist: ChecklistDTO) => (
            <div key={checklist.id} className="bg-gray-50 rounded-lg p-4">
              {/* Checklist Header */}
              <div className="flex flex-col mb-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Title level={5} className="m-0">
                      {checklist.title}
                    </Title>
                    <div className="flex items-center ml-4">
                      <Checkbox
                        checked={hideCheckedItems[checklist.id]}
                        onChange={() =>
                          setHideCheckedItems({
                            ...hideCheckedItems,
                            [checklist.id]: !hideCheckedItems[checklist.id],
                          })
                        }
                      />
                      <span className="text-xs ml-2">Hide checked items</span>
                    </div>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<Trash2 size={14} />}
                      onClick={() => deleteChecklist(checklist.id)}
                      className="ml-2"
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    {checklist.data.filter((item) => item.checked).length}/
                    {checklist.data.length}
                  </div>
                </div>
                <Progress
                  percent={calculateProgress(checklist)}
                  size="small"
                  status={
                    calculateProgress(checklist) === 100 ? "success" : "active"
                  }
                  strokeColor="#4CAF50"
                  className="w-full mb-2"
                />
              </div>

              {/* Checklist Items */}
              <div className="mt-3">
                {checklist.data
                  .filter(
                    (item) => !hideCheckedItems[checklist.id] || !item.checked
                  )
                  .map((item: ChecklistItem, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 relative"
                      onMouseEnter={() =>
                        setHoveredItem(`${checklist.id}-${index}`)
                      }
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className="flex items-center flex-grow">
                        <Checkbox
                          checked={item.checked}
                          onChange={() => toggleItem(checklist, index)}
                        />
                        <span
                          style={{
                            textDecoration: item.checked
                              ? "line-through"
                              : "none",
                          }}
                          className={`ml-2`}
                        >
                          {item.label}
                        </span>
                      </div>

                      {/* Item metadata section (always visible) */}
                      <div className="flex items-center ml-auto gap-2">
                        {/* User assignment */}
                        {item.assigneeName ? (
                          <Popover
                            content={
                              <div className="w-64">
                                <Input
                                  placeholder="Search users"
                                  value={userSearchText}
                                  onChange={(e) =>
                                    setUserSearchText(e.target.value)
                                  }
                                  className="mb-2"
                                  allowClear
                                />
                                <div className="max-h-40 overflow-y-auto">
                                  {filteredUsers.length > 0 ? (
                                    filteredUsers.map((account) => (
                                      <div
                                        key={account.id}
                                        className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => {
                                          const updatedData = [
                                            ...checklist.data,
                                          ];
                                          const updatedItem = {
                                            ...updatedData[index],
                                            assigneeId: account.id,
                                            assigneeName: account.username,
                                          };
                                          updatedData[index] = updatedItem;
                                          updateChecklist(checklist.id, {
                                            title: checklist.title,
                                            data: updatedData,
                                          }).then(() => {
                                            setUserSearchText("");
                                            refetch();
                                          });
                                        }}
                                      >
                                        <span className="font-medium">
                                          {account.username}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-2 text-center text-gray-500">
                                      No users found
                                    </div>
                                  )}
                                </div>
                              </div>
                            }
                            title="Assign to"
                            trigger="click"
                            placement="left"
                            arrow={true}
                          >
                            <Tag
                              color="blue"
                              className="cursor-pointer m-0 relative"
                              closeIcon={
                                <X
                                  size={12}
                                  className="absolute -right-2.5 -top-1.5 bg-white rounded-full p-0.5 shadow-sm"
                                />
                              }
                              onClose={(e) => {
                                e.stopPropagation();
                                const updatedData = [...checklist.data];
                                const updatedItem = {
                                  ...updatedData[index],
                                  assigneeId: undefined,
                                  assigneeName: undefined,
                                };
                                updatedData[index] = updatedItem;
                                updateChecklist(checklist.id, {
                                  title: checklist.title,
                                  data: updatedData,
                                }).then(() => refetch());
                              }}
                            >
                              {item.assigneeName}
                            </Tag>
                          </Popover>
                        ) : (
                          hoveredItem === `${checklist.id}-${index}` && (
                            <Popover
                              content={
                                <div className="w-64">
                                  <Input
                                    placeholder="Search users"
                                    value={userSearchText}
                                    onChange={(e) =>
                                      setUserSearchText(e.target.value)
                                    }
                                    className="mb-2"
                                    allowClear
                                  />
                                  <div className="max-h-40 overflow-y-auto">
                                    {filteredUsers.length > 0 ? (
                                      filteredUsers.map((account) => (
                                        <div
                                          key={account.id}
                                          className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                                          onClick={() => {
                                            const updatedData = [
                                              ...checklist.data,
                                            ];
                                            const updatedItem = {
                                              ...updatedData[index],
                                              assigneeId: account.id,
                                              assigneeName: account.username,
                                            };
                                            updatedData[index] = updatedItem;
                                            updateChecklist(checklist.id, {
                                              title: checklist.title,
                                              data: updatedData,
                                            }).then(() => {
                                              setUserSearchText("");
                                              refetch();
                                            });
                                          }}
                                        >
                                          <span className="font-medium">
                                            {account.username}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="p-2 text-center text-gray-500">
                                        No users found
                                      </div>
                                    )}
                                  </div>
                                </div>
                              }
                              title="Assign to"
                              trigger="click"
                              placement="left"
                              arrow={true}
                            >
                              <Button
                                type="text"
                                size="small"
                                className="flex items-center justify-center p-1 h-6 w-6 min-w-6 m-0"
                                icon={<User size={14} />}
                              />
                            </Popover>
                          )
                        )}

                        {/* Due date */}
                        {item.dueDate ? (
                          <Popover
                            content={
                              <DatePicker
                                onChange={(date) => {
                                  const updatedData = [...checklist.data];
                                  updatedData[index] = {
                                    ...updatedData[index],
                                    dueDate: date
                                      ? date.toISOString()
                                      : undefined,
                                  };
                                  updateChecklist(checklist.id, {
                                    title: checklist.title,
                                    data: updatedData,
                                  }).then(() => refetch());
                                }}
                                defaultValue={dayjs(item.dueDate)}
                              />
                            }
                            title="Set due date"
                            trigger="click"
                            placement="left"
                            arrow={true}
                          >
                            <Tag
                              color={getDueDateColor(item.dueDate, item.checked)
                                .replace("text-", "")
                                .replace("-500", "")}
                              className="cursor-pointer m-0 relative"
                              closeIcon={
                                <X
                                  size={12}
                                  className="absolute -right-2.5 -top-1.5 bg-white rounded-full p-0.5 shadow-sm"
                                />
                              }
                              onClose={(e) => {
                                e.stopPropagation();
                                const updatedData = [...checklist.data];
                                const updatedItem = {
                                  ...updatedData[index],
                                  dueDate: undefined,
                                };
                                updatedData[index] = updatedItem;
                                updateChecklist(checklist.id, {
                                  title: checklist.title,
                                  data: updatedData,
                                }).then(() => refetch());
                              }}
                            >
                              {dayjs(item.dueDate).format("MMM D")}
                            </Tag>
                          </Popover>
                        ) : (
                          hoveredItem === `${checklist.id}-${index}` && (
                            <Popover
                              content={
                                <DatePicker
                                  onChange={(date) => {
                                    const updatedData = [...checklist.data];
                                    updatedData[index] = {
                                      ...updatedData[index],
                                      dueDate: date
                                        ? date.toISOString()
                                        : undefined,
                                    };
                                    updateChecklist(checklist.id, {
                                      title: checklist.title,
                                      data: updatedData,
                                    }).then(() => refetch());
                                  }}
                                />
                              }
                              title="Set due date"
                              trigger="click"
                              placement="left"
                              arrow={true}
                            >
                              <Button
                                type="text"
                                size="small"
                                className="flex items-center justify-center p-1 h-6 w-6 min-w-6 m-0"
                                icon={<Clock size={14} />}
                              />
                            </Popover>
                          )
                        )}
                      </div>

                      {/* Action buttons that appear on hover */}
                      {hoveredItem === `${checklist.id}-${index}` && (
                        <div className="flex items-center ">
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<Trash2 size={14} />}
                            onClick={() => deleteItem(checklist, index)}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                {/* Add Item Input */}
                <div className="flex items-center mt-3">
                  <Input
                    placeholder="Add an item"
                    value={newItems[checklist.id] || ""}
                    onChange={(e) =>
                      setNewItems({
                        ...newItems,
                        [checklist.id]: e.target.value,
                      })
                    }
                    onPressEnter={() => addItem(checklist)}
                    className="flex-grow"
                  />
                  <Button
                    type="primary"
                    onClick={() => addItem(checklist)}
                    className="ml-2"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChecklistFields;
