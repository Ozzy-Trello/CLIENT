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
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
  saveSucceeded?: boolean;
  isSuperAdmin?: boolean;
};

const PivotToolbar: FC<PivotToolbarProps> = ({
  searchValue,
  onSearchChange,
  onExport,
  columnsDropdownContent,
  columnsDropdownOpen,
  onColumnsDropdownChange,
  onSave,
  saveDisabled,
  saveLoading,
  saveSucceeded,
  isSuperAdmin = false,
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
          Export to CSV
        </Button>
      </div>
      {isSuperAdmin && columnsDropdownContent && (
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
      {isSuperAdmin && onSave && (
        <div>
          <Button
            type={saveSucceeded ? "default" : "primary"}
            size="small"
            onClick={onSave}
            disabled={saveDisabled || saveLoading}
            loading={saveLoading}
          >
            {saveSucceeded ? "Saved" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PivotToolbar;
