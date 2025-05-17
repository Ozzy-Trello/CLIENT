import { CardRequest } from "@/app/dto/types";
import { Table } from "antd";
import { useCardDetailContext } from "@/app/provider/card-detail-context";
import { getRequestsByCardId, updateRequestReceived } from "@/app/api/accurate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, Modal, Input } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { useState } from "react";

// Constants
const tabNames = ["Polo", "Oblong", "Kemeja", "Jaket", "Hoodie"];

const baseInputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 text-xs py-2 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 transition placeholder-gray-400 shadow-none appearance-none";
const labelClass =
  "block text-[15px] font-medium text-gray-800 mb-1 flex items-center gap-2";
const sectionTitleClass =
  "text-[20px] font-semibold text-gray-900 mb-2 mt-8 flex items-center gap-2";

const RequestFields: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sisaBahan, setSisaBahan] = useState("");
  const [activeRequest, setActiveRequest] = useState<CardRequest | null>(null);
  const { selectedCard } = useCardDetailContext();
  const queryClient = useQueryClient();

  // Query key for requests
  const requestsQueryKey = ["requests", selectedCard?.id];

  // Query for fetching requests
  const { data: requestData } = useQuery<{ data: CardRequest[] }>({
    queryKey: requestsQueryKey,
    queryFn: async () => {
      if (!selectedCard?.id) return null;
      return getRequestsByCardId(selectedCard.id);
    },
    enabled: !!selectedCard?.id,
  });

  // Mutation for updating request received amount
  const updateRequestMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => {
      return updateRequestReceived(id, amount);
    },
    onSuccess: () => {
      // Invalidate and refetch the requests query
      queryClient.invalidateQueries({ queryKey: requestsQueryKey });

      // Reset state if modal is open
      if (isModalVisible) {
        setIsModalVisible(false);
        setSisaBahan("");
        setActiveRequest(null);
      }
    },
    onError: (error) => {
      console.error("Error updating request:", error);
    },
  });

  const columns = [
    {
      title: "Bahan",
      dataIndex: "itemName",
      key: "itemName",
    },
    {
      title: "Diminta",
      dataIndex: "requestAmount",
      key: "requestAmount",
      render: (_: unknown, record: CardRequest) => {
        return (
          <span>
            {record.requestAmount} {record.satuan}
          </span>
        );
      },
    },
    {
      title: "Dikirim",
      dataIndex: "requestSent",
      key: "requestSent",
      render: (_: unknown, record: CardRequest) => {
        return (
          <span>
            {record.requestSent ? record.requestSent : 0} {record.satuan}
          </span>
        );
      },
    },
    {
      title: "Jenis",
      dataIndex: "adjustmentName",
      key: "adjustmentName",
    },
    {
      title: "Kembali ke Gudang",

      render: (_: unknown, record: CardRequest) => {
        return (
          <span>
            {record.requestReceived ? record.requestReceived : ""}{" "}
            {record.satuan}
          </span>
        );
      },
    },
    {
      title: "Deskripsi",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "",
      key: "action",
      width: 50,
      align: "center" as const,
      render: (_: unknown, record: CardRequest) => {
        // Handler for opening the modal
        const handleClick = () => {
          setActiveRequest(record);
          setIsModalVisible(true);
        };

        // Handler for "habis" action
        const handleHabisClick = () => {
          if (record.requestSent) {
            updateRequestMutation.mutate({
              id: record.id.toString(),
              amount: record.requestSent,
            });
          }
        };

        return (
          <Dropdown
            menu={{
              items: [
                {
                  key: "sisa",
                  label: "Sisa",
                  onClick: handleClick,
                },
                {
                  key: "habis",
                  label: "Habis",
                  onClick: handleHabisClick,
                },
              ],
            }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              className="border-none shadow-none"
            />
          </Dropdown>
        );
      },
    },
  ];

  const handleModalOk = () => {
    if (activeRequest && sisaBahan) {
      updateRequestMutation.mutate({
        id: activeRequest.id.toString(),
        amount: Number(sisaBahan),
      });
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setSisaBahan("");
    setActiveRequest(null);
  };

  if (!selectedCard?.id) return null;

  if (!requestData?.data || requestData.data.length === 0) return null;

  return (
    <div className="mt-8 w-full">
      {/* Top Row */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center text-gray-700">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 4L4 20h16L12 4z" />
          </svg>
        </span>
        <span className="text-[18px] font-semibold text-gray-900">
          Requests
        </span>
      </div>
      <div className="ml-8">
        <Table
          columns={columns}
          dataSource={requestData?.data || []}
          pagination={false}
          size="small"
        />
      </div>

      <Modal
        title="Sisa Bahan"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        styles={{
          body: {
            padding: "2rem",
          },
          footer: {
            padding: "1rem",
          },
        }}
      >
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Masukkan sisa bahan"
            value={sisaBahan}
            onChange={(e) => setSisaBahan(e.target.value)}
            type="number"
          />
          <Input
            value={
              activeRequest
                ? (
                    activeRequest.requestAmount - Number(sisaBahan || 0)
                  ).toString()
                : ""
            }
            disabled
            addonBefore="Selisih"
          />
        </div>
      </Modal>
    </div>
  );
};

export default RequestFields;
