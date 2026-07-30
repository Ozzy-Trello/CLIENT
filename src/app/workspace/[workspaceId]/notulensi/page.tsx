"use client";

import NotulensiBoard from "@components/notulensi/notulensi-board";
import NotulensiFilters from "@components/notulensi/notulensi-filters";
import NotulensiList from "@components/notulensi/notulensi-list";
import { useNotulensiList } from "@hooks/notulensi";
import { useCurrentAccount } from "@hooks/account";
import { NotulensiListFilters } from "@myTypes/notulensi";
import { Alert, Button, Segmented, Typography } from "antd";
import { RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function NotulensiPage() {
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";
  const [view, setView] = useState<"list" | "board">("list");
  const [filters, setFilters] = useState<NotulensiListFilters>({
    scope: "related",
    page: 1,
    limit: 20,
  });

  const boardFilters = useMemo(
    () => ({ ...filters, page: 1, limit: 100 }),
    [filters]
  );

  const { data: currentAccountData } = useCurrentAccount();
  const allowAll = currentAccountData?.data?.role?.name === "Super Admin";
  const listQuery = useNotulensiList(workspaceId, filters, view === "list");
  const boardQuery = useNotulensiList(workspaceId, boardFilters, view === "board");

  const activeQuery = view === "list" ? listQuery : boardQuery;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Typography.Text type="secondary" className="block uppercase tracking-wide">
            Workspace instructions
          </Typography.Text>
          <Typography.Title level={2} className="!mb-1 !mt-0">
            Notulensi
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="!mb-0">
            Track operational instructions, follow-up, and discussion in one place.
          </Typography.Paragraph>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<RefreshCcw size={16} />}
            onClick={() => activeQuery.refetch()}
            loading={activeQuery.isFetching}
          >
            Refresh
          </Button>
          <Link href={`/workspace/${workspaceId}/notulensi/new`}>
            <Button type="primary">New instruction</Button>
          </Link>
        </div>
      </div>

      <NotulensiFilters value={filters} onChange={setFilters} allowAll={allowAll} />

      <div className="flex justify-start">
        <Segmented
          value={view}
          onChange={(value) => setView(value as "list" | "board")}
          options={[
            { value: "list", label: "List" },
            { value: "board", label: "Board" },
          ]}
        />
      </div>

      {activeQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load instructions"
          action={<Button onClick={() => activeQuery.refetch()}>Retry</Button>}
        />
      ) : null}

      {view === "list" ? (
        <NotulensiList
          workspaceId={workspaceId}
          data={listQuery.data}
          loading={listQuery.isLoading || listQuery.isFetching && !listQuery.data}
          onPageChange={(page, pageSize) => setFilters((prev) => ({ ...prev, page, limit: pageSize }))}
        />
      ) : (
        <NotulensiBoard
          workspaceId={workspaceId}
          data={boardQuery.data}
          loading={boardQuery.isLoading || boardQuery.isFetching && !boardQuery.data}
        />
      )}
    </div>
  );
}
