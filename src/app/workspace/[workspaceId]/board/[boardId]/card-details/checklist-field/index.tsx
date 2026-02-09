import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  Popover,
  Progress,
  Typography,
  Tag,
  message,
} from "antd";
import { Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { CheckSquare, Trash2, Clock, User, X, GripVertical, Edit } from "lucide-react";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useCardChecklists, useDeleteChecklist } from "@hooks/checklist";
import { updateChecklist, moveChecklistItemBetween } from "@api/checklist";
import { ChecklistDTO, ChecklistItem } from "@myTypes/checklist";
import { useAccountList } from "@hooks/account";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

const { Title } = Typography;

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const ChecklistFields: React.FC = () => {
  const { selectedCard } = useCardDetailContext();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const boardId = params.boardId as string;

  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [hideCheckedItems, setHideCheckedItems] = useState<
    Record<string, boolean>
  >({});
  const [userSearchText, setUserSearchText] = useState<string>("");
  const [localChecklists, setLocalChecklists] = useState<ChecklistDTO[]>([]);
  const [localInitialized, setLocalInitialized] = useState(false);
  const [editingItemInfo, setEditingItemInfo] = useState<{
    checklistId: string;
    itemIndex: number;
    text: string;
  } | null>(null);

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

  useEffect(() => {
    const normalized = checklists.map((checklist) => ({
      ...checklist,
      data: Array.isArray(checklist.data)
        ? checklist.data.map((item) => ({
            ...item,
            id: item.id || uuidv4(),
          }))
        : [],
    }));
    setLocalChecklists(normalized);
    setLocalInitialized(true);
  }, [checklists]);

  const displayedChecklists = useMemo(
    () => (localInitialized ? localChecklists : checklists),
    [checklists, localChecklists, localInitialized]
  );

  // Mutations
  const deleteChecklistMutation = useDeleteChecklist(selectedCard?.id || "");

  // Calculate progress for a checklist
  const calculateProgress = (checklist: ChecklistDTO) => {
    if (!checklist.data || checklist.data.length === 0) return 0;

    const completedItems = checklist.data.filter((item) => item.checked).length;
    return Math.round((completedItems / checklist.data.length) * 100);
  };

  const reorder = <T,>(list: T[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    if (removed === undefined) return result;
    result.splice(endIndex, 0, removed);
    return result;
  };

  const persistChecklistUpdate = async (checklist: ChecklistDTO) => {
    try {
      await updateChecklist(checklist.id, {
        title: checklist.title,
        data: checklist.data,
      });
      await refetch();
    } catch (error) {
      message.error("Failed to update checklist");
      await refetch();
    }
  };

  const getVisibleChecklistItems = (checklist: ChecklistDTO) =>
    checklist.data
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(
        ({ item }) => !hideCheckedItems[checklist.id] || !item.checked
      );

  const renameChecklist = async (checklist: ChecklistDTO, nextTitle: string) => {
    const title = nextTitle.trim();
    if (!title) {
      message.error("Checklist title cannot be empty");
      return;
    }

    const updatedChecklist: ChecklistDTO = { ...checklist, title };
    setLocalChecklists((prev) =>
      prev.map((cl) => (cl.id === checklist.id ? updatedChecklist : cl))
    );

    setEditingItemInfo(null);
    await persistChecklistUpdate(updatedChecklist);
  };

  const handleUpdateItem = async (
    checklist: ChecklistDTO,
    itemIndex: number,
    updatedText: string
  ) => {
    const trimmed = updatedText.trim();
    if (!trimmed) {
      message.error("Item text cannot be empty");
      return;
    }

    const updatedData = [...checklist.data];
    if (!updatedData[itemIndex]) return;

    updatedData[itemIndex] = {
      ...updatedData[itemIndex],
      label: trimmed,
    };

    const updatedChecklist: ChecklistDTO = { ...checklist, data: updatedData };
    setLocalChecklists((prev) =>
      prev.map((cl) => (cl.id === checklist.id ? updatedChecklist : cl))
    );
    setEditingItemInfo(null);

    await persistChecklistUpdate(updatedChecklist);
  };

  // Toggle item checked status
  const toggleItem = async (checklist: ChecklistDTO, itemIndex: number) => {
    const updatedData = [...checklist.data];
    if (!updatedData[itemIndex]) return;
    updatedData[itemIndex] = {
      ...updatedData[itemIndex],
      checked: !updatedData[itemIndex].checked,
    };

    const updatedChecklist: ChecklistDTO = { ...checklist, data: updatedData };
    setLocalChecklists((prev) =>
      prev.map((cl) => (cl.id === checklist.id ? updatedChecklist : cl))
    );

    await persistChecklistUpdate(updatedChecklist);
  };

  // Add a new item to a checklist
  const addItem = async (checklist: ChecklistDTO) => {
    const itemText = newItems[checklist.id] || "";
    const trimmed = itemText.trim();
    if (!trimmed) return;

    const updatedData = [
      ...checklist.data,
      { id: uuidv4(), label: trimmed, checked: false },
    ];

    const updatedChecklist: ChecklistDTO = { ...checklist, data: updatedData };
    setLocalChecklists((prev) =>
      prev.map((cl) => (cl.id === checklist.id ? updatedChecklist : cl))
    );

    // Clear input immediately
    setNewItems((prev) => ({ ...prev, [checklist.id]: "" }));

    await persistChecklistUpdate(updatedChecklist);
  };

  // Delete an item from checklist
  const deleteItem = async (checklist: ChecklistDTO, itemIndex: number) => {
    const updatedData = checklist.data.filter(
      (_, index) => index !== itemIndex
    );

    const updatedChecklist: ChecklistDTO = { ...checklist, data: updatedData };
    setLocalChecklists((prev) =>
      prev.map((cl) => (cl.id === checklist.id ? updatedChecklist : cl))
    );

    await persistChecklistUpdate(updatedChecklist);
  };

  const assignUser = async (
    checklist: ChecklistDTO,
    itemIndex: number,
    userId: string,
    username: string
  ) => {
    const updatedData = [...checklist.data];
    if (!updatedData[itemIndex]) return;

    updatedData[itemIndex] = {
      ...updatedData[itemIndex],
      assigneeId: userId,
      assigneeName: username,
      assignee_name: username,
      assignee_id: userId,
    };

    const updatedChecklist: ChecklistDTO = { ...checklist, data: updatedData };
    setLocalChecklists((prev) =>
      prev.map((cl) => (cl.id === checklist.id ? updatedChecklist : cl))
    );
    setUserSearchText("");

    await persistChecklistUpdate(updatedChecklist);
  };

  const unassignUser = async (checklist: ChecklistDTO, itemIndex: number) => {
    const updatedData = [...checklist.data];
    if (!updatedData[itemIndex]) return;

    updatedData[itemIndex] = {
      ...updatedData[itemIndex],
      assigneeId: undefined,
      assigneeName: undefined,
      assignee_name: undefined,
      assignee_id: undefined,
      assigfnee_id: undefined,
    };

    const updatedChecklist: ChecklistDTO = { ...checklist, data: updatedData };
    setLocalChecklists((prev) =>
      prev.map((cl) => (cl.id === checklist.id ? updatedChecklist : cl))
    );

    await persistChecklistUpdate(updatedChecklist);
  };

  const setDueDate = async (
    checklist: ChecklistDTO,
    itemIndex: number,
    dateIso: string | undefined
  ) => {
    const updatedData = [...checklist.data];
    if (!updatedData[itemIndex]) return;

    updatedData[itemIndex] = {
      ...updatedData[itemIndex],
      dueDate: dateIso,
      due_date: dateIso,
    };

    const updatedChecklist: ChecklistDTO = { ...checklist, data: updatedData };
    setLocalChecklists((prev) =>
      prev.map((cl) => (cl.id === checklist.id ? updatedChecklist : cl))
    );

    await persistChecklistUpdate(updatedChecklist);
  };

  // Delete checklist
  const deleteChecklist = (checklistId: string) => {
    deleteChecklistMutation.mutate(checklistId, {
      onSuccess: () => {
        setLocalChecklists((prev) => prev.filter((cl) => cl.id !== checklistId));
        refetch(); // Refetch after deletion
      },
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, type } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    if (type === "CHECKLIST") {
      if (destination.droppableId !== source.droppableId) return;

      const reordered = reorder(displayedChecklists, source.index, destination.index).map(
        (cl, index) => ({
          ...cl,
          order_index: index,
        })
      );
      setLocalInitialized(true);
      setLocalChecklists(reordered);

      try {
        await Promise.all(
          reordered.map((checklist, index) =>
            updateChecklist(checklist.id, {
              title: checklist.title,
              data: checklist.data,
              order_index: index,
            })
          )
        );
        await refetch();
      } catch (error) {
        message.error("Failed to reorder checklists");
        await refetch();
      }
      return;
    }

    // Checklist item reorder (within the same checklist)
    if (type === "CHECKLIST_ITEM") {
      const sourceChecklistId = source.droppableId;
      const destinationChecklistId = destination.droppableId;
      const checklist = displayedChecklists.find(
        (cl) => cl.id === sourceChecklistId
      );

      if (!checklist) return;

      if (sourceChecklistId === destinationChecklistId) {
        if (hideCheckedItems[sourceChecklistId]) {
          message.info("Show checked items to reorder");
          return;
        }

        const updatedData = reorder(
          checklist.data,
          source.index,
          destination.index
        );
        const updatedChecklist: ChecklistDTO = {
          ...checklist,
          data: updatedData,
        };
        setLocalChecklists((prev) =>
          prev.map((cl) => (cl.id === sourceChecklistId ? updatedChecklist : cl))
        );

        await persistChecklistUpdate(updatedChecklist);
        return;
      }

      const destinationChecklist = displayedChecklists.find(
        (cl) => cl.id === destinationChecklistId
      );

      if (!destinationChecklist) return;

      const sourceVisibleItems = getVisibleChecklistItems(checklist);
      const movingItemEntry = sourceVisibleItems[source.index];
      if (!movingItemEntry) return;

      const destinationVisibleItems = getVisibleChecklistItems(
        destinationChecklist
      );

      const destinationIndex =
        destination.index >= destinationVisibleItems.length
          ? destinationChecklist.data.length
          : destinationVisibleItems[destination.index].originalIndex;

      const sourceIndex = movingItemEntry.originalIndex;
      const movingItem = movingItemEntry.item;

      setLocalInitialized(true);
      setLocalChecklists((prev) =>
        prev.map((cl) => {
          if (cl.id === sourceChecklistId) {
            const nextData = [...cl.data];
            nextData.splice(sourceIndex, 1);
            return { ...cl, data: nextData };
          }
          if (cl.id === destinationChecklistId) {
            const nextData = [...cl.data];
            nextData.splice(destinationIndex, 0, movingItem);
            return { ...cl, data: nextData };
          }
          return cl;
        })
      );

      try {
        await moveChecklistItemBetween({
          sourceChecklistId,
          destinationChecklistId,
          sourceIndex,
          destinationIndex,
          item: movingItem,
        });
        await refetch();
      } catch (error) {
        message.error("Failed to move checklist item");
        await refetch();
      }
    }
  };

  if (!selectedCard) return null;

  // Don't render if there are no checklists
  if (!isLoading && displayedChecklists.length === 0) return null;

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
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="CARD_CHECKLISTS" type="CHECKLIST">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-6"
                >
                  {displayedChecklists.map(
                    (checklist: ChecklistDTO, checklistIndex: number) => {
                    const isReorderDisabled = !!hideCheckedItems[checklist.id];
                    const itemsToRender = getVisibleChecklistItems(checklist);

                      const checklistDraggableId = `checklist:${checklist.id}`;

                      return (
                        <Draggable
                          key={checklistDraggableId}
                          draggableId={checklistDraggableId}
                          index={checklistIndex}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="bg-gray-50 rounded-lg p-4"
                            >
                              {/* Checklist Header */}
                              <div className="flex flex-col mb-3">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="text-gray-400 cursor-grab active:cursor-grabbing"
                                      aria-label="Drag checklist to reorder"
                                    >
                                      <GripVertical size={16} />
                                    </div>
                                    <Title
                                      level={5}
                                      className="m-0"
                                      editable={{
                                        tooltip: "Rename checklist",
                                        onChange: (val) =>
                                          renameChecklist(checklist, val),
                                      }}
                                    >
                                      {checklist.title}
                                    </Title>
                                    <div className="flex items-center ml-4">
                                      <Checkbox
                                        checked={hideCheckedItems[checklist.id]}
                                        onChange={() =>
                                          setHideCheckedItems({
                                            ...hideCheckedItems,
                                            [checklist.id]:
                                              !hideCheckedItems[checklist.id],
                                          })
                                        }
                                      />
                                      <span className="text-xs ml-2">
                                        Hide checked items
                                      </span>
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
                                    calculateProgress(checklist) === 100
                                      ? "success"
                                      : "active"
                                  }
                                  strokeColor="#4CAF50"
                                  className="w-full mb-2"
                                />
                              </div>

                              {/* Checklist Items */}
                              <Droppable
                                droppableId={checklist.id}
                                type="CHECKLIST_ITEM"
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="min-h-[40px]"
                                  >
                                {itemsToRender.map(
                                  ({ item, originalIndex }, index) => {
                                    const assigneeName =
                                      item.assigneeName ||
                                      item.assignee_name;
                                    const dueDate =
                                      item.dueDate || item.due_date;
                                    const draggableId = `${checklist.id}::${
                                      item.id || `${index}`
                                    }`;
                                    const isEditingItem =
                                      editingItemInfo?.checklistId ===
                                        checklist.id &&
                                      editingItemInfo?.itemIndex ===
                                        originalIndex;
                                    const submitEdit = () => {
                                      if (!editingItemInfo) return;
                                      const text = editingItemInfo.text;
                                      handleUpdateItem(
                                        checklist,
                                        originalIndex,
                                        text
                                      );
                                    };

                                        return (
                                          <Draggable
                                            key={draggableId}
                                            draggableId={draggableId}
                                            index={index}
                                            isDragDisabled={isReorderDisabled}
                                          >
                                            {(provided) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="flex items-center gap-2 py-2 border-b border-gray-100 group"
                                              >
                                                <div
                                                  {...provided.dragHandleProps}
                                                  className={
                                                    isReorderDisabled
                                                      ? "text-gray-300 cursor-not-allowed"
                                                      : "text-gray-400 cursor-grab active:cursor-grabbing"
                                                  }
                                                  aria-label="Drag to reorder"
                                                >
                                                  <GripVertical size={16} />
                                                </div>

                                                <Checkbox
                                                  checked={item.checked}
                                                  onChange={() =>
                                                    toggleItem(
                                                      checklist,
                                                      originalIndex
                                                    )
                                                  }
                                                />

                                              <div className="ml-2 flex-1 min-w-0 max-w-[70%]">
                                                {isEditingItem ? (
                                                  <Input
                                                    value={
                                                      editingItemInfo?.text ?? ""
                                                    }
                                                    onChange={(e) =>
                                                      setEditingItemInfo(
                                                        (prev) =>
                                                          prev
                                                            ? {
                                                                ...prev,
                                                                text: e.target.value,
                                                              }
                                                            : prev
                                                      )
                                                    }
                                                    onPressEnter={submitEdit}
                                                    onBlur={submitEdit}
                                                    autoFocus
                                                    className="w-full"
                                                  />
                                                ) : (
                                                  <span
                                                    style={{
                                                      textDecoration: item.checked
                                                        ? "line-through"
                                                        : "none",
                                                    }}
                                                    className="block break-words"
                                                  >
                                                    {item.label}
                                                  </span>
                                                )}
                                              </div>

                                                {/* Item actions (space reserved to prevent blinking) */}
                                                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                                                  {/* User assignment */}
                                                  {assigneeName ? (
                                                    <Popover
                                                      content={
                                                        <div className="w-64">
                                                          <Input
                                                            placeholder="Search users"
                                                            value={userSearchText}
                                                            onChange={(e) =>
                                                              setUserSearchText(
                                                                e.target.value
                                                              )
                                                            }
                                                            className="mb-2"
                                                            allowClear
                                                          />
                                                          <div className="max-h-40 overflow-y-auto">
                                                            {filteredUsers.length >
                                                            0 ? (
                                                              filteredUsers.map(
                                                                (account) => (
                                                                  <div
                                                                    key={account.id}
                                                                    className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() =>
                                                                      assignUser(
                                                                        checklist,
                                                                        originalIndex,
                                                                        account.id,
                                                                        account.username
                                                                      )
                                                                    }
                                                                  >
                                                                    <span className="font-medium">
                                                                      {account.username}
                                                                    </span>
                                                                  </div>
                                                                )
                                                              )
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
                                                          unassignUser(
                                                            checklist,
                                                            originalIndex
                                                          );
                                                        }}
                                                      >
                                                        {assigneeName}
                                                      </Tag>
                                                    </Popover>
                                                  ) : (
                                                    <Popover
                                                      content={
                                                        <div className="w-64">
                                                          <Input
                                                            placeholder="Search users"
                                                            value={userSearchText}
                                                            onChange={(e) =>
                                                              setUserSearchText(
                                                                e.target.value
                                                              )
                                                            }
                                                            className="mb-2"
                                                            allowClear
                                                          />
                                                          <div className="max-h-40 overflow-y-auto">
                                                            {filteredUsers.length >
                                                            0 ? (
                                                              filteredUsers.map(
                                                                (account) => (
                                                                  <div
                                                                    key={account.id}
                                                                    className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() =>
                                                                      assignUser(
                                                                        checklist,
                                                                        originalIndex,
                                                                        account.id,
                                                                        account.username
                                                                      )
                                                                    }
                                                                  >
                                                                    <span className="font-medium">
                                                                      {account.username}
                                                                    </span>
                                                                  </div>
                                                                )
                                                              )
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
                                                        className="flex items-center justify-center p-1 h-6 w-6 min-w-6 m-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
                                                        icon={<User size={14} />}
                                                      />
                                                    </Popover>
                                                  )}

                                                  <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<Edit size={14} />}
                                                    onClick={() =>
                                                      setEditingItemInfo({
                                                        checklistId: checklist.id,
                                                        itemIndex: originalIndex,
                                                        text: item.label,
                                                      })
                                                    }
                                                    className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
                                                    disabled={isEditingItem}
                                                    aria-label="Edit item label"
                                                  />

                                                  {/* Due date */}
                                                  {dueDate ? (
                                                    <Popover
                                                      content={
                                                        <DatePicker
                                                          onChange={(date) =>
                                                            setDueDate(
                                                              checklist,
                                                              originalIndex,
                                                              date
                                                                ? date.toISOString()
                                                                : undefined
                                                            )
                                                          }
                                                          defaultValue={dayjs(
                                                            dueDate
                                                          )}
                                                        />
                                                      }
                                                      title="Set due date"
                                                      trigger="click"
                                                      placement="left"
                                                      arrow={true}
                                                    >
                                                      <Tag
                                                        color={getDueDateColor(
                                                          dueDate,
                                                          item.checked
                                                        )
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
                                                          setDueDate(
                                                            checklist,
                                                            originalIndex,
                                                            undefined
                                                          );
                                                        }}
                                                      >
                                                        {dayjs(dueDate).format(
                                                          "MMM D"
                                                        )}
                                                      </Tag>
                                                    </Popover>
                                                  ) : (
                                                    <Popover
                                                      content={
                                                        <DatePicker
                                                          onChange={(date) =>
                                                            setDueDate(
                                                              checklist,
                                                              originalIndex,
                                                              date
                                                                ? date.toISOString()
                                                                : undefined
                                                            )
                                                          }
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
                                                        className="flex items-center justify-center p-1 h-6 w-6 min-w-6 m-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
                                                        icon={<Clock size={14} />}
                                                      />
                                                    </Popover>
                                                  )}

                                                  <Button
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    icon={<Trash2 size={14} />}
                                                    onClick={() =>
                                                      deleteItem(
                                                        checklist,
                                                        originalIndex
                                                      )
                                                    }
                                                    className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
                                                  />
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        );
                                      }
                                    )}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>

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
                          )}
                        </Draggable>
                      );
                    }
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
};

export default ChecklistFields;
