import { ReactElement } from 'react';
import { Popover } from 'antd';
import { AutomationRuleTrigger } from '@myTypes/type';
import PopoverRuleCardFilterContent from './content';

interface PopoverRuleCardFilterProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl: ReactElement;
  setTriggersData: React.Dispatch<React.SetStateAction<AutomationRuleTrigger[]>>;
  triggersData: AutomationRuleTrigger[];
  selectedGroupIndex: number;
  selectedIndex: number;
}

const PopoverRuleCardFilter: React.FC<PopoverRuleCardFilterProps> = ({
  open,
  setOpen,
  triggerEl,
  triggersData,
  setTriggersData,
  selectedGroupIndex,
  selectedIndex,
}) => {
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Popover
      content={
        <PopoverRuleCardFilterContent 
          triggersData={triggersData}
          setTriggersData={setTriggersData}
          selectedTriggersGroupIndex={selectedGroupIndex}
          selectedTriggerIndex={selectedIndex}
        />
      }
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottom"
    >
      {triggerEl}
    </Popover>
  );
};

export default PopoverRuleCardFilter;