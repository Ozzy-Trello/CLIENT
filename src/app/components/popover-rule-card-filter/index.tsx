import React, { ReactNode, useEffect, useState } from "react";
import { Popover, Typography } from "antd";
import { ChevronLeft, X } from "lucide-react";
import { useParams } from "next/navigation";
import { UserSelection } from "../selection";
import PopoverRuleCardFilterContent from "./content";
import { AutomationRule } from "@/app/types/type";

interface PopoverRuleCardFilterProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl?: ReactNode;
}

const PopoverRuleCardFilter: React.FC<PopoverRuleCardFilterProps> = ({ 
  open, 
  setOpen, 
  triggerEl 
}) => {
  const { workspaceId } = useParams();
  const [selectedRule, setSelectedRule] = useState<AutomationRule>({triggerType: "", triggerItem: undefined, actions: []});
 
  return (
    <Popover
      content={<PopoverRuleCardFilterContent selectedRule={selectedRule} setSelectedRule={setSelectedRule}  />}
      title={null}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      overlayClassName="custom-field-popover"
      destroyTooltipOnHide
    >
      {triggerEl}
    </Popover>
  );
};

export default PopoverRuleCardFilter;