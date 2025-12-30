import { FC } from "react";
import { Checkbox, Input } from "antd";
import { GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type ColumnSelectorProps = {
  columns: string[];
  columnVisibility: Record<string, boolean>;
  onToggle: (columnId: string, visible: boolean) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  humanizeColumnId: (columnId: string) => string;
  onReorder: (result: DropResult) => void;
};

const ColumnSelector: FC<ColumnSelectorProps> = ({
  columns,
  columnVisibility,
  onToggle,
  searchValue,
  onSearchChange,
  humanizeColumnId,
  onReorder,
}) => {
  return (
    <div
      className="p-2 bg-white border border-gray-200 rounded-md shadow-lg"
      style={{ minWidth: "260px", maxHeight: "360px", overflowY: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2">
        <Input
          placeholder="Search columns..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          size="small"
        />
      </div>
      <div className="flex flex-col gap-1">
        {columns.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400">No columns found</div>
        )}
        <DragDropContext onDragEnd={onReorder}>
          <Droppable droppableId="columns-selector">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-1">
                {columns.map((columnId, index) => (
                  <Draggable draggableId={columnId} index={index} key={columnId}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`flex items-center gap-2 px-3 py-2 rounded ${
                          snapshot.isDragging ? "bg-gray-100" : "hover:bg-gray-50"
                        }`}
                      >
                        <GripVertical className="h-3 w-3 text-gray-300" />
                        <Checkbox
                          checked={columnVisibility[columnId] !== false}
                          onChange={(e) => {
                            e.stopPropagation();
                            onToggle(columnId, e.target.checked);
                          }}
                        />
                        <span className="text-sm whitespace-nowrap">
                          {humanizeColumnId(columnId)}
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};

export default ColumnSelector;
