import { FC } from "react";
import { Button, Select } from "antd";
import { Table } from "@tanstack/react-table";
import {
  PageSizeOption,
  PAGE_SIZE_SELECT_OPTIONS,
} from "../paginationConstants";

type PivotPaginationProps = {
  table: Table<any>;
  onPrev: () => void;
  onNext: () => void;
  pageSizeOption: PageSizeOption;
  onPageSizeChange: (value: PageSizeOption) => void;
};

const PivotPagination: FC<PivotPaginationProps> = ({
  table,
  onPrev,
  onNext,
  pageSizeOption,
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
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          {table.getPrePaginationRowModel().rows.length} items
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Rows per page:</span>
          <Select<PageSizeOption>
            options={PAGE_SIZE_SELECT_OPTIONS}
            value={pageSizeOption}
            onChange={onPageSizeChange}
            size="small"
            style={{ width: 120 }}
          />
        </div>
      </div>
    </div>
  );
};

export default PivotPagination;
