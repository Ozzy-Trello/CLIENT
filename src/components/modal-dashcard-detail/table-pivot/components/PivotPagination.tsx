import { FC } from "react";
import { Button } from "antd";
import { Table } from "@tanstack/react-table";

type PivotPaginationProps = {
  table: Table<any>;
  onPrev: () => void;
  onNext: () => void;
};

const PivotPagination: FC<PivotPaginationProps> = ({ table, onPrev, onNext }) => {
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
      </div>
    </div>
  );
};

export default PivotPagination;

