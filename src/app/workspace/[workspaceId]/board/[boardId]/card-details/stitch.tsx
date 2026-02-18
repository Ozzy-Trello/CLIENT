import { getStitchAttachments } from "@api/stitch_attachment";
import { useAccountList } from "@hooks/account";
import { useCardAttachment } from "@hooks/card_attachment";
import {
  Card,
  CardAttachment,
  EnumAttachmentType,
  EnumCardAttachmentType,
} from "@myTypes/card";
import { useQuery } from "@tanstack/react-query";
import { isImageFile } from "@utils/file";
import { Alert, Empty, Spin, Table, Typography } from "antd";
import { ColumnsType } from "antd/es/table";
import { useMemo } from "react";

interface StitchSectionProps {
  card: Card;
  workspaceId: string;
  boardId: string;
}

interface StitchRowView {
  key: string;
  fileName: string;
  stitch: number;
  amount: number;
  total: number;
  designerName: string;
}

const IMAGE_NAME_EXTENSION = /\.(jpe?g|png|gif|bmp|svg|webp)$/i;

const formatAttachmentName = (fileName: string, mimeType?: string): string => {
  if (!isImageFile(fileName, mimeType)) return fileName;
  const withoutExtension = fileName.replace(IMAGE_NAME_EXTENSION, "");
  return withoutExtension || fileName;
};

const StitchSection: React.FC<StitchSectionProps> = ({
  card,
  workspaceId,
  boardId,
}) => {
  const { data: accountListData } = useAccountList({ workspaceId, boardId });
  const { cardAttachments } = useCardAttachment(card.id, {
    initialData: card.attachments,
    fetch: true,
  });

  const {
    data: stitchData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["stitch-attachment", card.id],
    queryFn: () => getStitchAttachments(card.id),
    enabled: !!card.id,
    staleTime: 5000,
  });

  const stitchRows = stitchData?.data || [];

  const attachmentMap = useMemo(() => {
    const map = new Map<string, CardAttachment>();
    const source = (cardAttachments || card.attachments || []).filter(
      (att) =>
        att.attachableType === EnumAttachmentType.File &&
        att.type === EnumCardAttachmentType.Stitch,
    );

    source.forEach((att) => map.set(att.id, att));
    return map;
  }, [cardAttachments, card.attachments]);

  const designerMap = useMemo(() => {
    const map = new Map<string, string>();
    (accountListData?.data || []).forEach((acc: any) => {
      map.set(acc.id, acc.name || acc.username || acc.email || acc.id);
    });
    return map;
  }, [accountListData?.data]);

  const tableRows = useMemo<StitchRowView[]>(
    () =>
      stitchRows.map((row, index) => {
        const attachment = attachmentMap.get(row.attachmentId);
        const rawFileName = attachment?.file?.name || `Attachment ${index + 1}`;

        return {
          key: row.id || row.attachmentId,
          fileName: formatAttachmentName(rawFileName, attachment?.file?.mimeType),
          stitch: Number(row.stitch || 0),
          amount: Number(row.amount || 0),
          total: Number(row.stitch || 0) * Number(row.amount || 0),
          designerName: row.userId
            ? designerMap.get(row.userId) || row.userId
            : "-",
        };
      }),
    [stitchRows, attachmentMap, designerMap],
  );

  const grandTotal = useMemo(
    () => tableRows.reduce((sum, row) => sum + row.total, 0),
    [tableRows],
  );

  const columns = useMemo<ColumnsType<StitchRowView>>(
    () => [
      {
        title: "Nama File",
        dataIndex: "fileName",
        key: "fileName",
        ellipsis: true,
      },
      {
        title: "Stitch",
        dataIndex: "stitch",
        key: "stitch",
        width: 120,
      },
      {
        title: "Jml",
        dataIndex: "amount",
        key: "amount",
        width: 100,
      },
      {
        title: "Total Stitch",
        dataIndex: "total",
        key: "total",
        width: 140,
        render: (value: number) => (
          <Typography.Text strong>{value.toLocaleString("en-US")}</Typography.Text>
        ),
      },
      {
        title: "Desainer",
        dataIndex: "designerName",
        key: "designerName",
        width: 220,
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <Spin />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load stitch data"
        description={(error as any)?.message || "Please try again later"}
      />
    );
  }

  if (tableRows.length === 0) {
    return <Empty description="No stitch data yet" />;
  }

  return (
    <div className="bg-white p-4 rounded-lg mt-2">
      <Table<StitchRowView>
        rowKey="key"
        dataSource={tableRows}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
      />
      <div className="flex justify-end pt-3">
        <Typography.Text strong>
          Grand Total Stitch: {grandTotal.toLocaleString("en-US")}
        </Typography.Text>
      </div>
    </div>
  );
};

export default StitchSection;
