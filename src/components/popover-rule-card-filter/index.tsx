import { PropsWithChildren, ReactElement } from 'react';
import { Popover } from 'antd';
import { AutomationRuleTrigger } from '@myTypes/type';
import PopoverRuleCardFilterContent from './content';

interface PopoverRuleCardFilterProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl: ReactElement;
  setTriggersData: React.Dispatch<React.SetStateAction<AutomationRuleTrigger[]>>;
  triggersData: AutomationRuleTrigger[];
  selectedIndex: number;
}

const PopoverRuleCardFilter: React.FC<PopoverRuleCardFilterProps> = ({
  open,
  setOpen,
  triggerEl,
  triggersData,
  setTriggersData,
  selectedIndex
}) => {
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Popover
      content={
        <PopoverRuleCardFilterContent 
          selectedTriggersGroupIndex={selectedIndex}
          triggersData={triggersData}
          setTriggersData={setTriggersData}
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