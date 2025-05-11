import { CardRequest } from "@/app/dto/types";
import { Table } from "antd";
import { useCardDetailContext } from "@/app/provider/card-detail-context";
import { getRequestsByCardId, updateRequestReceived } from "@/app/api/accurate";

const tabNames = ["Polo", "Oblong", "Kemeja", "Jaket", "Hoodie"];

const baseInputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 text-xs py-2 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 transition placeholder-gray-400 shadow-none appearance-none";
const labelClass =
  "block text-[15px] font-medium text-gray-800 mb-1 flex items-center gap-2";
const sectionTitleClass =
  "text-[20px] font-semibold text-gray-900 mb-2 mt-8 flex items-center gap-2";

import { useQuery } from "@tanstack/react-query";
import { Button, Dropdown, Modal, Input } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { useState } from "react";

const RequestFields: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sisaBahan, setSisaBahan] = useState("");
  const [activeRequest, setActiveRequest] = useState<CardRequest | null>(null);
  const { selectedCard } = useCardDetailContext();

  const { data: requestData, refetch } = useQuery<{ data: CardRequest[] }>({
    queryKey: ["requests", selectedCard?.id],
    queryFn: async () => {
      if (!selectedCard?.id) return null;
      return getRequestsByCardId(selectedCard.id);
    },
    enabled: !!selectedCard?.id,
  });

  const columns = [
    {
      title: "Item Name",
      dataIndex: "itemName",
      key: "itemName",
    },
    {
      title: "Request Amount",
      dataIndex: "requestAmount",
      key: "requestAmount",
    },
    {
      title: "Adjustment Name",
      dataIndex: "adjustmentName",
      key: "adjustmentName",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "",
      key: "action",
      width: 50,
      align: "center" as const,
      render: (_: unknown, record: CardRequest) => {
        const handleClick = () => {
          setActiveRequest(record);
          setIsModalVisible(true);
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
                  onClick: () => console.log("Habis clicked"),
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

  const handleModalOk = async () => {
    if (activeRequest && sisaBahan) {
      try {
        await updateRequestReceived(
          activeRequest.id.toString(),
          Number(sisaBahan)
        );
        // Refetch the data
        await refetch();
        setIsModalVisible(false);
        setSisaBahan("");
        setActiveRequest(null);
      } catch (error) {
        console.error("Error updating request:", error);
      }
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setSisaBahan("");
    setActiveRequest(null);
  };

  return (
    <div className="mt-8">
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
