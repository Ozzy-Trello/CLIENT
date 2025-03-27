import { Button, Input, Select } from "antd";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { CustomField, Trigger } from "@/app/dto/types";
import SkeletonInput from "antd/es/skeleton/Input";
import { useState, useEffect, useRef } from "react";
import { ListSelection, SelectionRef } from "../selection";

interface TriggerProps {
  popoverPage: string;
  setPopoverPage: any;
  selectedCustomField: CustomField | undefined;
  setSelectedCustomField: any;
  // Add a reorder function prop
  // reorderCustomFields?: (customFieldId: string, newPosition: number) => void;
}

const TriggerContent: React.FC<TriggerProps> = (props) => {
  const { workspaceId } = useParams();
  const { 
    popoverPage, 
    setPopoverPage, 
    selectedCustomField, 
    setSelectedCustomField, 
  } = props;
  
  const listSelectionRef = useRef<SelectionRef>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(selectedCustomField?.trigger || null);

  const onSave = () => {
    // setSelectedCustomField((prev: CustomField) => ({
    //   ...prev,
    //   trigger: {
    //     ...prev.trigger,
    //     action: {
    //       ...prev.trigger.action,
    //       [key]: value
    //     }
    //   }
    // }));
  };

  const onChange = (key: string, value: string) => {
    // setTrigger((prev: Trigger) => ({
    //   ...prev,
    //   t
    // }));
  }

  return (
    <div className="h-fit">

      <div className="max-h-60 overflow-y-auto px-2">
        {/* Action Field */}
        <div className="mb-3 text-xs">
          <label htmlFor="trigger-action" className="block mb-1.5 font-medium text-gray-600">
            Action
          </label>
          <Select
            id="trigger-action"
            className="w-full"
            value={selectedCustomField?.trigger?.name}
            onChange={(value) => onChange("name", value)}
            options={[
              {value: "move", label: "Move"},
              {value: "copy", label: "Copy"},
            ]}
          />
        </div>

        {/* Target List Field */}
        <div className="mb-3 text-xs">
          <label htmlFor="target-list" className="block mb-1.5 font-medium text-gray-600">
            Target List
          </label>
          <ListSelection ref={listSelectionRef} />
        </div>
        
        <div className="mb-3 text-xs">
          <label htmlFor="target-list" className="block mb-1.5 font-medium text-gray-600">
            Trigger Condition
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span>$field_value</span>
            <Select
              size="small"
              options={[
                {value: "has_value", label: "Has value"},
                {value: "contains", label: "Contains"},
                {value: "equals", label: "="},
              ]}
            />
            <Input
              size="small"
              className="min-w-2"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end items-center mt-4 pt-3 border-t border-gray-100">
        <Button 
          size="small" 
        >
          Cancel
        </Button>
        <Button 
          type="primary" 
          size="small"
          onClick={onSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default TriggerContent;