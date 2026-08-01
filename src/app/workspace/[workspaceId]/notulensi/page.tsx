"use client";

import NotulensiFilters from "@components/notulensi/notulensi-filters";
import NotulensiList from "@components/notulensi/notulensi-list";
import { exportNotulensi } from "@api/notulensi";
import { useNotulensiList } from "@hooks/notulensi";
import { useCurrentAccount } from "@hooks/account";
import { NotulensiListFilters } from "@myTypes/notulensi";
import { Alert, Button, Typography, message } from "antd";
import { createNotulensiWorkbook } from "@utils/notulensi-workbook";
import { Download, RefreshCcw } from "lucide-react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function NotulensiPage() {
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";
  const [filters, setFilters] = useState<NotulensiListFilters>({
    scope: "assigned",
    page: 1,
    limit: 20,
  });
  const [exporting, setExporting] = useState(false);

  const { data: currentAccountData } = useCurrentAccount();
  const allowAll = currentAccountData?.data?.role?.name === "Super Admin";
  const listQuery = useNotulensiList(workspaceId, filters);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Typography.Text type="secondary" className="block uppercase tracking-wide">
            Workspace tasks and projects
          </Typography.Text>
          <Typography.Title level={2} className="!mb-1 !mt-0">
            Tasks and Projects
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="!mb-0">
            Track operational instructions, follow-up, and discussion in one place.
          </Typography.Paragraph>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<RefreshCcw size={16} />}
            onClick={() => listQuery.refetch()}
            loading={listQuery.isFetching}
          >
            Refresh
          </Button>
          <Button
            icon={<Download size={16} />}
            loading={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const response = await exportNotulensi(workspaceId, filters);
                XLSX.writeFile(
                  createNotulensiWorkbook(response.data),
                  `tasks-projects-${new Date().toISOString().slice(0, 10)}.xlsx`
                );
              } catch {
                message.error("Failed to export instructions");
              } finally {
                setExporting(false);
              }
            }}
          >
            Export XLSX
          </Button>
          <Link href={`/workspace/${workspaceId}/notulensi/new`}>
            <Button type="primary">New Task</Button>
          </Link>
        </div>
      </div>

      <NotulensiFilters value={filters} onChange={setFilters} allowAll={allowAll} />

      {listQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load instructions"
          action={<Button onClick={() => listQuery.refetch()}>Retry</Button>}
        />
      ) : null}

      <NotulensiList
          workspaceId={workspaceId}
          data={listQuery.data}
          loading={listQuery.isLoading || listQuery.isFetching && !listQuery.data}
          onPageChange={(page, pageSize) => setFilters((prev) => ({ ...prev, page, limit: pageSize }))}
      />
    </div>
  );
}
