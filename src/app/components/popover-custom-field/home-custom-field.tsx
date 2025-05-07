import { Button } from "antd";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import SkeletonInput from "antd/es/skeleton/Input";
import { useState, useEffect } from "react";
import { CustomField } from "@/app/types/type";

interface HomeCustomFieldProps {
  popoverPage: string;
  setPopoverPage: any;
  selectedCustomField: CustomField | undefined;
  setSelectedCustomField: any;
  customFields: CustomField[];
  isLoading: boolean;
  // Add a reorder function prop
  // reorderCustomFields?: (customFieldId: string, newPosition: number) => void;
}

const HomeCustomField: React.FC<HomeCustomFieldProps> = (props) => {
  const { workspaceId } = useParams();
  const { 
    popoverPage, 
    setPopoverPage, 
    selectedCustomField, 
    setSelectedCustomField, 
    customFields, 
    isLoading 
  } = props;
  
  // Local state to manage the order during drag operations
  const [items, setItems] = useState<CustomField[]>([]);
  
  // Update local state when customFields changes
  useEffect(() => {
    if (customFields && customFields.length > 0) {
      setItems(customFields);
    }
  }, [customFields]);

  const handleDetails = (customField: CustomField) => {
    setSelectedCustomField(customField);
    setPopoverPage("update");
  };

  const handleDragEnd = (result: DropResult) => {
    // If dropped outside the list
    if (!result.destination) {
      return;
    }
    
    // If dropped in the same position
    if (result.destination.index === result.source.index) {
      return;
    }
    
    // Create a new array with the updated order
    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);
    
    // Update local state to show the new order immediately
    setItems(reorderedItems);
    
    // if (props.reorderCustomFields) {
    //   props.reorderCustomFields(removed.id, result.destination.index);
    // }
  };

  return (
    <div>
      <hr className="border-gray-200 my-4" />
      <div className="py-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="draggable-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="overflow-hidden"
              >
                {items.length > 0 && !isLoading ? (
                  items.map((item: CustomField, index: number) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between rounded-sm p-1 mb-2 bg-gray-100 border-b border-gray-100 hover:bg-gray-200 transition-colors ${
                            snapshot.isDragging ? 'shadow-md' : ''
                          }`}
                        >
                          <div 
                            className="flex items-center space-x-3 flex-1"
                            onClick={() => handleDetails(item)}
                          >
                            <div 
                              className="flex items-center justify-center w-6 h-6 text-gray-500 cursor-grab"
                              {...provided.dragHandleProps}
                            >
                              <GripVertical size={16}/>
                            </div>
                            <span className="text-xs font-medium text-gray-800 truncate">
                              {item.name}
                            </span>
                          </div>
                          <ChevronRight 
                            size={16} 
                            className="h-5 w-5 text-gray-400 cursor-pointer" 
                            onClick={() => handleDetails(item)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : null}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(item => (
              <SkeletonInput key={item} active />
            ))}
          </div>
        )}
        
        {!isLoading && items.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No custom fields found. Add your first one below.
          </div>
        )}
      </div>
      
      <Button
        className="w-full"
        size="small"
        icon={<Plus size={14} />}
        onClick={() => setPopoverPage("add")}
      >
        New field
      </Button>
    </div>
  );
};

export default HomeCustomField;