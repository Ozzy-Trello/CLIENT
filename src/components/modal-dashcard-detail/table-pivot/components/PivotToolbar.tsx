import { FC, ReactNode } from "react";
import { Button, Input, Dropdown } from "antd";
import { Download } from "lucide-react";

type PivotToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onExport: () => void;
  columnsDropdownContent?: ReactNode;
  columnsDropdownOpen?: boolean;
  onColumnsDropdownChange?: (open: boolean) => void;
};

const PivotToolbar: FC<PivotToolbarProps> = ({
  searchValue,
  onSearchChange,
  onExport,
  columnsDropdownContent,
  columnsDropdownOpen,
  onColumnsDropdownChange,
}) => {
  return (
    <div className="flex justify-end gap-3 items-center">
      <div>
        <Input
          placeholder="Search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-64"
        />
      </div>
      <div>
        <Button icon={<Download className="h-4 w-4" />} onClick={onExport} type="default">
          Export to Excel
        </Button>
      </div>
      {columnsDropdownContent && (
        <div>
          <Dropdown
            menu={{ items: [] }}
            dropdownRender={() => columnsDropdownContent}
            trigger={["click"]}
            placement="bottomRight"
            open={columnsDropdownOpen}
            onOpenChange={onColumnsDropdownChange}
          >
            <Button>Columns</Button>
          </Dropdown>
        </div>
      )}
    </div>
  );
};

export default PivotToolbar;
