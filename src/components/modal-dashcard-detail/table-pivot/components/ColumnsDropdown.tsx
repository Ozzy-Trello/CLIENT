import dynamic from "next/dynamic";
import { Checkbox, Input } from "antd";
import { GripVertical } from "lucide-react";
import { Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { FC } from "react";

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

type ColumnsDropdownProps = {
  filteredColumns: string[];
  columnVisibility: Record<string, boolean>;
  onToggle: (columnId: string, visible: boolean) => void;
  columnSearchValue: string;
  onSearchChange: (value: string) => void;
  onDragEnd: (result: DropResult) => void;
  humanizeColumnId: (columnId: string) => string;
};

const ColumnsDropdown: FC<ColumnsDropdownProps> = ({
  filteredColumns,
  columnVisibility,
  onToggle,
  columnSearchValue,
  onSearchChange,
  onDragEnd,
  humanizeColumnId,
}) => {
  return (
    <div
      className="p-2 bg-white border border-gray-200 rounded-md shadow-lg"
      style={{ minWidth: "240px", maxHeight: "340px", overflowY: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2">
        <Input
          placeholder="Search columns..."
          value={columnSearchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          size="small"
        />
      </div>

      {filteredColumns.length > 0 ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="columns-menu">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {filteredColumns.map((columnId, index) => (
                  <Draggable key={columnId} draggableId={columnId} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-grab ${
                          snapshot.isDragging
                            ? "bg-gray-100 shadow-sm"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <GripVertical className="h-3 w-3 text-gray-400" />
                        <Checkbox
                          checked={columnVisibility[columnId] !== false}
                          onChange={(e) => {
                            e.stopPropagation();
                            onToggle(columnId, e.target.checked);
                          }}
                        />
                        <span className="whitespace-nowrap text-sm">
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
      ) : (
        <div className="p-3 text-sm text-gray-400">No columns found</div>
      )}
    </div>
  );
};

export default ColumnsDropdown;

