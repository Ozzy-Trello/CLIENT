import { FC } from "react";
import { Button, Select } from "antd";
import { Table } from "@tanstack/react-table";

type PivotPaginationProps = {
  table: Table<any>;
  onPrev: () => void;
  onNext: () => void;
  pageSizeChoice: "all" | "10" | "20" | "50" | "100";
  pageSizeOptions: { label: string; value: string }[];
  onPageSizeChange: (value: string) => void;
};

const PivotPagination: FC<PivotPaginationProps> = ({
  table,
  onPrev,
  onNext,
  pageSizeChoice,
  pageSizeOptions,
  onPageSizeChange,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex items-center gap-2">
        <Button disabled={!table.getCanPreviousPage()} onClick={onPrev}>
          Previous
        </Button>
        <span className="text-sm text-gray-700">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <Button disabled={!table.getCanNextPage()} onClick={onNext}>
          Next
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700">
          {table.getPrePaginationRowModel().rows.length} items
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-700">Page Size:</span>
          <Select
            size="small"
            value={pageSizeChoice}
            style={{ width: 110 }}
            options={pageSizeOptions}
            onChange={onPageSizeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default PivotPagination;
