import { PropsWithChildren, ReactElement } from 'react';
import { Popover } from 'antd';

interface PopoverRuleCardFilterProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl: ReactElement;
  popoverContent?: ReactElement;
}

const PopoverRuleCardFilter: React.FC<PopoverRuleCardFilterProps> = ({
  open,
  setOpen,
  triggerEl,
  popoverContent,
}) => {
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Popover
      content={popoverContent}
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