import { DragEvent, FC } from "react";
import { Table, flexRender } from "@tanstack/react-table";

type PivotTableProps = {
  table: Table<any>;
  onHeaderDragStart?: (event: DragEvent<HTMLSpanElement>, columnId: string) => void;
  onHeaderDrop?: (event: DragEvent<HTMLSpanElement>, columnId: string) => void;
};

const PivotTable: FC<PivotTableProps> = ({
  table,
  onHeaderDragStart = () => {},
  onHeaderDrop = () => {},
}) => {
  return (
    <div style={{ paddingBottom: "1rem" }} className="overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider break-words"
                  draggable={!header.isPlaceholder}
                  onDragStart={(event) =>
                    !header.isPlaceholder &&
                    onHeaderDragStart(event, header.column.id)
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) =>
                    !header.isPlaceholder &&
                    onHeaderDrop(event, header.column.id)
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={row.getIsGrouped() ? "bg-gray-50" : ""}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-6 py-4 text-sm text-gray-500 break-words"
                  style={{ maxWidth: "200px", minWidth: "150px" }}
                  {...{
                    colSpan: cell.column.getIsGrouped() ? 1 : undefined,
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PivotTable;
