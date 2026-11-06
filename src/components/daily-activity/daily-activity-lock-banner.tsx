"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Button } from "antd";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { getDailyActivityAccessStatus } from "@api/daily-activity";

export default function DailyActivityLockBanner() {
  const pathname = usePathname();
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const status = useQuery({ queryKey: ["daily-activity-access-status"], queryFn: getDailyActivityAccessStatus, retry: false, refetchInterval: 30_000 });
  if (!status.data?.locked || pathname?.includes("/daily-activity")) return null;

  return (
    <Alert
      className="m-4"
      type="error"
      showIcon
      message={`Belum mengisi Daily Activity tanggal ${status.data.oldest_missed_date}. Silakan isi terlebih dahulu.`}
      action={<Link href={`/workspace/${workspaceId}/daily-activity`}><Button size="small" danger>Isi sekarang</Button></Link>}
    />
  );
}
